---
summary: "在本地 LLM 上运行 OpenClaw（LM Studio、vLLM、LiteLLM、自定义 OpenAI 端点）"
read_when:
  - 你想从自己的 GPU 机器提供模型服务
  - 你正在对接 LM Studio 或 OpenAI 兼容代理
  - 你需要最安全的本地模型指南
title: "本地模型"
---

本地方案是可行的，但 OpenClaw 期望有很大的上下文窗口，以及对提示注入的强防御。小显卡会截断上下文并削弱安全性。目标要高：**至少 2 台满配 Mac Studio 或等效的 GPU 机器（约 3 万美元以上）**。单块 **24 GB** GPU 只适合更轻量的提示，并伴随更高延迟。请尽量使用你能运行的**最大 / 全尺寸模型变体**；过度量化或“small”检查点会提高提示注入风险（见 [安全性](/gateway/security)）。

如果你想要最省心的本地配置，先从 [LM Studio](/providers/lmstudio) 或 [Ollama](/providers/ollama) 开始，然后运行 `openclaw onboard`。本页是面向更高端本地栈和自定义 OpenAI 兼容本地服务器的带有明确建议的指南。

<Warning>
**WSL2 + Ollama + NVIDIA/CUDA 用户：** 官方 Ollama Linux 安装程序会启用一个 `Restart=always` 的 systemd 服务。在 WSL2 GPU 环境中，自动启动可能会在启动时重新加载上一个模型并占用主机内存。如果你在启用 Ollama 后 WSL2 虚拟机反复重启，请参见 [WSL2 崩溃循环](/providers/ollama#wsl2-crash-loop-repeated-reboots)。
</Warning>

## 推荐：LM Studio + 大型本地模型（Responses API）

当前最佳本地栈。在 LM Studio 中加载一个大模型（例如完整尺寸的 Qwen、DeepSeek 或 Llama 构建），启用本地服务器（默认 `http://127.0.0.1:1234`），并使用 Responses API 将推理与最终文本分离。

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/my-local-model" },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "lmstudio/my-local-model": { alias: "本地" },
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

- 安装 LM Studio：[https://lmstudio.ai](https://lmstudio.ai)
- 在 LM Studio 中下载**可用的最大模型构建版本**（避免“small”/高度量化的变体），启动服务器，并确认 `http://127.0.0.1:1234/v1/models` 能列出它。
- 将 `my-local-model` 替换为 LM Studio 中显示的实际模型 ID。
- 保持模型已加载；冷启动加载会增加启动延迟。
- 如果你的 LM Studio 构建不同，请调整 `contextWindow`/`maxTokens`。
- 对于 WhatsApp，请坚持使用 Responses API，这样只会发送最终文本。

即使在本地运行时，也要保留已配置的托管模型；使用 `models.mode: "merge"`，这样后备方案始终可用。

### 混合配置：托管主模型，本地回退

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

### 以本地优先，带托管安全网

交换主模型和回退顺序；保持相同的 providers 区块和 `models.mode: "merge"`，这样当本地机器宕机时，你仍可回退到 Sonnet 或 Opus。

### 区域托管 / 数据路由

- OpenRouter 上也提供托管的 MiniMax/Kimi/GLM 变体，并带有区域固定端点（例如美区托管）。在那里选择区域变体，以便在继续使用 Anthropic/OpenAI 回退时，将流量保留在你选择的司法辖区内，同时仍使用 `models.mode: "merge"`。
- 当你需要提供方特性但又希望控制数据流时，仅本地仍然是最强的隐私路径；区域化托管路由则是折中方案。

## 其他 OpenAI 兼容的本地代理

MLX（`mlx_lm.server`）、vLLM、SGLang、LiteLLM、OAI-proxy 或自定义网关都可以，只要它们暴露 OpenAI 风格的 `/v1/chat/completions` 端点。除非后端明确文档说明支持 `/v1/responses`，否则请使用 Chat Completions 适配器。将上面的 provider 区块替换为你的端点和模型 ID：

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

如果自定义 provider 在包含 `baseUrl` 时省略了 `api`，OpenClaw 默认使用 `openai-completions`。像 `127.0.0.1` 这样的回环端点会自动被视为受信任；局域网、tailnet 和私有 DNS 端点仍需要 `request.allowPrivateNetwork: true`。

`models.providers.<id>.models[].id` 的值是 provider 本地的。不要在这里包含 provider 前缀。例如，用 `mlx_lm.server --model mlx-community/Qwen3-30B-A3B-6bit` 启动的 MLX 服务器应使用如下目录 ID 和模型引用：

- `models.providers.mlx.models[].id: "mlx-community/Qwen3-30B-A3B-6bit"`
- `agents.defaults.model.primary: "mlx/mlx-community/Qwen3-30B-A3B-6bit"`

在本地或代理视觉模型上设置 `input: ["text", "image"]`，这样图像附件会被注入到 agent 回合中。交互式自定义 provider onboarding 会推断常见视觉模型 ID，并且只会询问未知名称。非交互式 onboarding 使用相同的推断；对于未知视觉 ID，请使用 `--custom-image-input`，或者当已知看起来像模型的名称在你的端点后面其实只是文本模型时，使用 `--custom-text-input`。

保持 `models.mode: "merge"`，这样托管模型仍可作为回退方案。对于较慢的本地或远程模型服务器，请使用 `models.providers.<id>.timeoutSeconds`，再决定是否提高 `agents.defaults.timeoutSeconds`。provider 超时仅应用于模型 HTTP 请求，包括连接、响应头、流式响应体以及受保护的总抓取中止。

<Note>
对于自定义 OpenAI 兼容 provider，当 `baseUrl` 解析到回环地址、私有局域网、`.local` 或裸主机名时，保留一个非敏感的本地标记，例如 `apiKey: "ollama-local"`，是被接受的。OpenClaw 会将其视为有效的本地凭据，而不会报告缺失密钥。对于任何接受公共主机名的 provider，请使用真实值。
</Note>

本地/代理 `/v1` 后端的行为说明：

- OpenClaw 将这些视为代理式 OpenAI 兼容路由，而不是原生 OpenAI 端点
- 原生 OpenAI 专用的请求整形不适用于这里：没有 `service_tier`、没有 Responses 的 `store`、没有 OpenAI reasoning-compat 载荷整形，也没有提示缓存提示
- 这些自定义代理 URL 上不会注入 OpenClaw 的隐藏归属头（`originator`、`version`、`User-Agent`）

更严格的 OpenAI 兼容后端的兼容性说明：

- 某些服务器在 Chat Completions 中只接受字符串形式的 `messages[].content`，而不是结构化的内容片段数组。对于这些端点，请将 `models.providers.<provider>.models[].compat.requiresStringContent: true`。
- 某些本地模型会将独立的方括号工具请求作为文本输出，例如 `[tool_name]` 后接 JSON 和 `[END_TOOL_REQUEST]`。只有当名称与该轮已注册工具完全匹配时，OpenClaw 才会把它们提升为真实的工具调用；否则该块会被视为不支持的文本，并会从用户可见回复中隐藏。
- 如果模型输出看起来像工具调用的 JSON、XML 或 ReAct 风格文本，但 provider 并未发出结构化调用，OpenClaw 会保留为文本，并记录一条警告，内容包括运行 ID、provider/model、检测到的模式以及可用时的工具名。请将其视为 provider/model 的工具调用不兼容，而不是一次完成的工具运行。
- 如果工具作为 assistant 文本而不是实际执行出现，例如原始 JSON、XML、ReAct 语法，或者 provider 响应中的 `tool_calls` 数组为空，首先验证服务器是否使用支持工具调用的 chat 模板/解析器。对于其解析器只有在强制使用工具时才工作的 OpenAI 兼容 Chat Completions 后端，请设置按模型的请求覆盖，而不要依赖文本解析：

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

  仅在那些每个正常回合都应调用工具的模型/会话中使用此设置。它会覆盖 OpenClaw 默认的代理值 `tool_choice: "auto"`。
  将 `local/my-local-model` 替换为 `openclaw models list` 显示的精确 provider/model 引用。

  ```bash
  openclaw config set agents.defaults.models '{"local/my-local-model":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
  ```

- 如果自定义 OpenAI 兼容模型支持超出内置配置文件的 OpenAI reasoning efforts，请在模型 compat 区块中声明它们。在这里添加 `"xhigh"` 会让 `/think xhigh`、会话选择器、Gateway 验证以及 `llm-task` 验证在该已配置的 provider/model 引用上暴露该级别：

  ```json5
  {
    models: {
      providers: {
        local: {
          baseUrl: "http://127.0.0.1:8000/v1",
          apiKey: "sk-local",
          api: "openai-responses",
          models: [
            {
              id: "gpt-5.4",
              name: "通过本地代理的 GPT 5.4",
              reasoning: true,
              input: ["text"],
              cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
              contextWindow: 196608,
              maxTokens: 8192,
              compat: {
                supportedReasoningEfforts: ["low", "medium", "high", "xhigh"],
                reasoningEffortMap: { xhigh: "xhigh" },
              },
            },
          ],
        },
      },
    },
  }
  ```

- 某些更小或更严格的本地后端在使用 OpenClaw 的完整 agent 运行时提示形状时会不稳定，尤其是在包含工具 schema 时。请先用精简的本地探针验证 provider 路径：

  ```bash
  openclaw infer model run --local --model <provider/model> --prompt "请精确回复：pong" --json
  ```

  要在不使用完整 agent 提示形状的情况下验证 Gateway 路由，请改用 Gateway 模型探针：

  ```bash
  openclaw infer model run --gateway --model <provider/model> --prompt "请精确回复：pong" --json
  ```

  本地和 Gateway 模型探针都只发送所提供的提示词。Gateway 探针仍会验证 Gateway 路由、认证和 provider 选择，但它会刻意跳过先前会话转录、AGENTS/bootstrap 上下文、context-engine 组装、工具以及捆绑的 MCP 服务器。

  如果这样成功，但正常的 OpenClaw agent 回合失败，首先尝试 `agents.defaults.experimental.localModelLean: true`，以去掉 `browser`、`cron` 和 `message` 等重量级默认工具；这是一个实验性标志，而不是稳定的默认模式设置。见 [实验性功能](/concepts/experimental-features)。如果仍然失败，再尝试 `models.providers.<provider>.models[].compat.supportsTools: false`。

- 如果后端只是在较大的 OpenClaw 运行中仍然失败，那么剩余问题通常是上游模型/服务器容量不足或后端 bug，而不是 OpenClaw 的传输层。

## 故障排查

- Gateway 能连到代理吗？`curl http://127.0.0.1:1234/v1/models`。
- LM Studio 模型未加载？重新加载；冷启动是常见的“卡住”原因。
- 本地服务器显示 `terminated`、`ECONNRESET`，或在回合中途关闭流？
  OpenClaw 会在诊断中记录一个低基数的 `model.call.error.failureKind`，以及
  OpenClaw 进程的 RSS/heap 快照。对于 LM Studio/Ollama
  内存压力，请用该时间戳对照服务器日志或 macOS 崩溃 /
  jetsam 日志，以确认模型服务器是否被终止。
- OpenClaw 会根据检测到的模型窗口，或在 `agents.defaults.contextTokens` 降低有效窗口时根据未封顶的模型窗口推导上下文窗口预检阈值。它在低于 20% 时给出警告，并设置 **8k** 下限。硬性阻断使用 10% 阈值，并设置 **4k** 下限，同时将其封顶到有效上下文窗口，以便过大的模型元数据不会拒绝原本有效的用户上限。如果触发了该预检，请提高服务器/模型上下文限制或选择更大的模型。
- 上下文错误？降低 `contextWindow` 或提高你的服务器限制。
- OpenAI 兼容服务器返回 `messages[].content ... expected a string`？
  在该模型条目上添加 `compat.requiresStringContent: true`。
- 直接调用小型 `/v1/chat/completions` 可以工作，但 `openclaw infer model run --local`
  在 Gemma 或其他本地模型上失败？先检查 provider URL、模型引用、认证
  标记和服务器日志；本地 `model run` 不包含 agent 工具。
  如果本地 `model run` 成功但更大的 agent 回合失败，请通过 `localModelLean` 或 `compat.supportsTools: false` 减少 agent 工具面。
- 工具调用以原始 JSON/XML/ReAct 文本形式出现，或者 provider 返回了
  空的 `tool_calls` 数组？不要添加一个会盲目把 assistant
  文本转换为工具执行的代理。先修复服务器的 chat 模板/解析器。如果
  模型只有在强制使用工具时才可用，请添加上面的按模型
  `params.extra_body.tool_choice: "required"` 覆盖，并且只在每一轮都预期有工具调用的会话中使用该模型
  条目。
- 安全性：本地模型会跳过提供方侧过滤；请保持 agent 范围尽量窄，并开启 compaction 以限制提示注入的爆炸半径。

## 相关

- [配置参考](/gateway/configuration-reference)
- [模型故障转移](/concepts/model-failover)
