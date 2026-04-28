---
summary: "在本地 LLM（LM Studio、vLLM、LiteLLM、自定义 OpenAI 端点）上运行 OpenClaw"
read_when:
  - 你想从自己的 GPU 主机提供模型服务
  - 你正在对接 LM Studio 或 OpenAI 兼容代理
  - 你需要最稳妥的本地模型指导
title: "本地模型"
---

本地方案是可行的，但 OpenClaw 需要大上下文窗口以及对提示注入的强防护。小显卡会截断上下文并削弱安全性。目标要高：**至少 2 台满配 Mac Studio 或同等 GPU 设备（约 3 万美元以上）**。单块 **24 GB** GPU 只能用于更轻量的提示词，而且延迟更高。请使用你能运行的**最大 / 全尺寸模型变体**；过度量化或“small”检查点会提高提示注入风险（参见 [安全性](/gateway/security)）。

如果你希望最省摩擦的本地设置，请从 [LM Studio](/providers/lmstudio) 或 [Ollama](/providers/ollama) 开始，并使用 `openclaw onboard`。本页面是针对更高端本地架构和自定义 OpenAI 兼容本地服务器的指导。

<Warning>
**WSL2 + Ollama + NVIDIA/CUDA 用户：** 官方的 Ollama Linux 安装程序会启用一个带有 `Restart=always` 的 systemd 服务。在 WSL2 GPU 环境中，自动启动可能会在启动时重新加载上一个模型并占用主机内存。如果在启用 Ollama 后你的 WSL2 虚拟机反复重启，请参见 [WSL2 崩溃循环](/providers/ollama#wsl2-crash-loop-repeated-reboots)。
</Warning>

## 推荐：LM Studio + 大型本地模型（Responses API）

当前最佳的本地技术栈。在 LM Studio 中加载大型模型（例如，全尺寸版的 Qwen、DeepSeek 或 Llama 构建），启用本地服务器（默认 `http://127.0.0.1:1234`），并使用 Responses API 将推理与最终文本分开。

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/my-local-model" },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "lmstudio/my-local-model": { alias: "Local" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "my-local-model",
            name: "本地模型",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

**设置清单**

- 安装 LM Studio: [https://lmstudio.ai](https://lmstudio.ai)
- 在 LM Studio 中，下载**可用的最大模型构建版本**（避免“小”/重度量化变体），启动服务器，确认 `http://127.0.0.1:1234/v1/models` 列出了它。
- 将 `my-local-model` 替换为 LM Studio 中显示的实际模型 ID。
- 保持模型加载状态；冷加载会增加启动延迟。
- 如果您的 LM Studio 构建版本不同，请调整 `contextWindow`/`maxTokens`。
- 对于 WhatsApp，坚持使用 Responses API，以便仅发送最终文本。

即使运行本地模型，也要保留托管模型配置；使用 `models.mode: "merge"` 以便故障时仍可回退。

### 混合配置：托管主模型，本地备选

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-sonnet-4-6",
        fallbacks: ["lmstudio/my-local-model", "anthropic/claude-opus-4-6"],
      },
      models: {
        "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
        "lmstudio/my-local-model": { alias: "本地" },
        "anthropic/claude-opus-4-6": { alias: "Opus" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "my-local-model",
            name: "本地模型",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

### 本地优先，托管安全网

将主模型和备选顺序调换；保持相同的 providers 块和 `models.mode: "merge"`，这样本地机器出现故障时，可回退到 Sonnet 或 Opus。

### 区域托管／数据路由

- 托管的 MiniMax/Kimi/GLM 变体也可通过 OpenRouter 使用区域绑定端点（如美国托管）。选择所需区域版本，以保持流量在你的选定司法区，同时仍可通过 `models.mode: "merge"` 使用 Anthropic/OpenAI 作为备选。
- 仅本地方案依旧是最强的隐私路径；区域托管路由在你需要服务商功能但又想控制数据流时，是中间方案。

## 其他兼容 OpenAI 的本地代理

MLX (`mlx_lm.server`), vLLM, SGLang, LiteLLM, OAI-proxy, 或自定义
网关都可以，只要它们暴露 OpenAI 风格的 `/v1/chat/completions`
端点即可。除非后端明确
文档说明支持 `/v1/responses`，否则请使用 Chat Completions 适配器。将上面的 provider 块替换为你的
端点和模型 ID：

```json5
{
  agents: {
    defaults: {
      model: { primary: "local/my-local-model" },
    },
  },
  models: {
    mode: "merge",
    providers: {
      local: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "sk-local",
        api: "openai-completions",
        timeoutSeconds: 300,
        models: [
          {
            id: "my-local-model",
            name: "本地模型",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 120000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

如果自定义 provider 在有 `baseUrl` 的情况下省略了 `api`，OpenClaw 默认使用
`openai-completions`。像 `127.0.0.1` 这样的回环地址会被自动信任；LAN、tailnet 和私有 DNS 端点仍然需要
`request.allowPrivateNetwork: true`。

`models.providers.<id>.models[].id` 的值是 provider 本地的。不要
在其中包含 provider 前缀。例如，使用
`mlx_lm.server --model mlx-community/Qwen3-30B-A3B-6bit` 启动的 MLX 服务器应使用以下
catalog id 和 model ref：

- `models.providers.mlx.models[].id: "mlx-community/Qwen3-30B-A3B-6bit"`
- `agents.defaults.model.primary: "mlx/mlx-community/Qwen3-30B-A3B-6bit"`

保持 `models.mode: "merge"`，这样托管模型仍可作为备选。
对于较慢的本地或远程模型
服务器，请先使用 `models.providers.<id>.timeoutSeconds`，再提升 `agents.defaults.timeoutSeconds`。provider 超时
仅适用于模型 HTTP 请求，包括连接、响应头、正文流式传输，
以及总的受控获取中止。

<Note>
对于自定义 OpenAI 兼容 provider，当 `baseUrl` 解析到回环地址、私有 LAN、`.local` 或裸主机名时，可以保留一个非密钥的本地标记，例如 `apiKey: "ollama-local"`。OpenClaw 会将其视为有效的本地凭证，而不是报告缺少密钥。对于任何接受公共主机名的 provider，请使用真实值。
</Note>

本地/代理 `/v1` 后端的行为说明：

- OpenClaw 将这些视为代理风格的 OpenAI 兼容路由，而非原生
  OpenAI 端点
- 原生 OpenAI 专用的请求塑形在此不适用：无 service_tier，无 Responses store，无 OpenAI reasoning-compat payload 塑形，也无 prompt-cache 提示
- 隐藏的 OpenClaw 归属头（originator, version, User-Agent）不会注入到这些自定义代理 URL 中

更严格 OpenAI 兼容后端的兼容性说明：

- 某些服务器在 Chat Completions 上只接受字符串类型的 `messages[].content`，而不接受
  结构化 content-part 数组。对这些端点请设置
  `models.providers.<provider>.models[].compat.requiresStringContent: true`。
- 某些本地模型会以文本形式发出独立的方括号工具请求，例如
  `[tool_name]` 后接 JSON 和 `[END_TOOL_REQUEST]`。OpenClaw 只有在名称与当前回合已注册的
  工具完全匹配时，才会将其提升为真实的工具调用；否则该块会被视为不支持的文本，并且会从用户可见回复中隐藏。
- 如果模型输出看起来像工具调用的 JSON、XML 或 ReAct 风格文本，但 provider 并未发出结构化调用，OpenClaw 会保留为
  文本并记录警告，包含运行 id、provider/model、检测到的模式，以及可用时的
  工具名称。请将其视为 provider/model 工具调用
  不兼容，而不是一次已完成的工具运行。
- 如果工具调用作为 assistant 文本出现而不是实际执行，例如原始 JSON、
  XML、ReAct 语法，或 provider 响应中的空 `tool_calls` 数组，首先验证服务器是否使用了支持工具调用的 chat 模板/parser。对于
  仅在强制使用工具时才工作的 OpenAI 兼容 Chat Completions 后端，请设置按模型的请求覆盖，而不要依赖文本
  解析：

  ```json5
  {
    agents: {
      defaults: {
        models: {
          "local/my-local-model": {
            params: {
              extra_body: {
                tool_choice: "required",
              },
            },
          },
        },
      },
    },
  }
  ```

  仅当每个正常回合都应调用工具时才使用此设置。
  它会覆盖 OpenClaw 默认代理值 `tool_choice: "auto"`。
  将 `local/my-local-model` 替换为
  `openclaw models list` 显示的精确 provider/model ref。

  ```bash
  openclaw config set agents.defaults.models '{"local/my-local-model":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
  ```

- 某些更小或更严格的本地后端与 OpenClaw 的完整
  agent-runtime 提示形状不稳定，尤其是在包含工具 schema 时。首先使用精简的本地探针验证 provider 路径：

  ```bash
  openclaw infer model run --local --model <provider/model> --prompt "Reply with exactly: pong" --json
  ```

  如果这一步成功，但正常的 OpenClaw agent 回合失败，先尝试
  `agents.defaults.experimental.localModelLean: true`，以移除诸如 `browser`、`cron` 和 `message` 这类较重的默认工具；这是一个实验性
  标志，不是稳定的默认模式设置。参见
  [实验性功能](/concepts/experimental-features)。如果仍然失败，尝试
  `models.providers.<provider>.models[].compat.supportsTools: false`。

- 如果后端仍然只在较大的 OpenClaw 运行中失败，剩下的问题通常是上游模型/服务器容量不足或后端 bug，而不是 OpenClaw 的
  传输层。

## 故障排除

- Gateway 能访问代理吗？`curl http://127.0.0.1:1234/v1/models`。
- LM Studio 模型未加载？重新加载；冷启动是常见的“卡住”原因。
- 本地服务器显示 `terminated`、`ECONNRESET`，或在回合中途关闭流？
  OpenClaw 会在诊断中记录低基数的 `model.call.error.failureKind`，以及
  OpenClaw 进程的 RSS/heap 快照。对于 LM Studio/Ollama 的
  内存压力，将该时间戳与服务器日志或 macOS crash /
  jetsam 日志对照，以确认模型服务器是否被杀死。
- 当检测到的上下文窗口低于 **32k** 时，OpenClaw 会发出警告；低于 **16k** 时会阻止运行。如果触发了该预检，请提高服务器/模型上下文限制，或选择更大的模型。
- 上下文错误？降低 `contextWindow` 或提高你的服务器限制。
- OpenAI 兼容服务器返回 `messages[].content ... expected a string`？
  在该模型条目上添加 `compat.requiresStringContent: true`。
- 直接的 `/v1/chat/completions` 小调用可以工作，但 `openclaw infer model run --local`
  在 Gemma 或其他本地模型上失败？先检查 provider URL、模型 ref、认证
  标记和服务器日志；本地 `model run` 不包含 agent 工具。
  如果本地 `model run` 成功但更大的 agent 回合失败，请通过 `localModelLean` 或 `compat.supportsTools: false` 降低 agent
  工具面。
- 工具调用以原始 JSON/XML/ReAct 文本形式出现，或者 provider 返回
  空的 `tool_calls` 数组？不要添加一个把 assistant
  文本盲目转换为工具执行的代理。先修复服务器的 chat template/parser。若
  模型只有在强制工具使用时才有效，请添加上面的按模型
  `params.extra_body.tool_choice: "required"` 覆盖，并且仅在预期每一轮都需要工具调用的会话中使用该模型
  条目。
- 安全性：本地模型会跳过 provider 侧过滤；请保持 agent 范围尽量窄，并开启 compaction 以限制提示注入的影响范围。

## 相关内容

- [配置参考](/gateway/configuration-reference)
- [模型故障转移](/concepts/model-failover)
