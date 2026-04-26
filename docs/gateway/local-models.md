---
summary: "在本地 LLM（LM Studio、vLLM、LiteLLM、自定义 OpenAI 端点）上运行 OpenClaw"
read_when:
  - 你想从自己的 GPU 主机提供模型服务
  - 你正在对接 LM Studio 或 OpenAI 兼容代理
  - 你需要最稳妥的本地模型指导
title: "本地模型"
---

本地方案是可行的，但 OpenClaw 需要大上下文窗口以及对提示注入的强防护。小显卡会截断上下文并削弱安全性。目标要高：**至少 2 台满配 Mac Studio 或同等 GPU 设备（约 3 万美元以上）**。单块 **24 GB** GPU 只能用于更轻量的提示词，而且延迟更高。请使用你能运行的**最大 / 全尺寸模型变体**；过度量化或“small”检查点会提高提示注入风险（参见 [Security](/gateway/security)）。

如果你希望最省摩擦的本地设置，请从 [LM Studio](/providers/lmstudio) 或 [Ollama](/providers/ollama) 开始，并使用 `openclaw onboard`。本页面是针对更高端本地架构和自定义 OpenAI 兼容本地服务器的指导。

## 推荐方案：LM Studio + 大型本地模型（Responses API）

当前最佳的本地技术栈。在 LM Studio 中加载大型模型（例如，全尺寸版的 Qwen、DeepSeek 或 Llama 构建），启用本地服务器（默认 `http://127.0.0.1:1234`），并使用 Responses API 将推理与最终文本分开。

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

vLLM、LiteLLM、OAI-proxy 或自定义网关，只要它们暴露 OpenAI 风格的 `/v1` 端点均可使用。将上面的 provider 块替换为你的端点和模型 ID：

```json5
{
  models: {
    mode: "merge",
    providers: {
      local: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "sk-local",
        api: "openai-responses",
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

保持 `models.mode: "merge"`，确保托管模型依然可用于回退。

本地/代理 `/v1` 后端的行为说明：

- OpenClaw 将这些视为代理风格的 OpenAI 兼容路由，而非原生
  OpenAI 端点
- 原生 OpenAI 专用的请求塑造在此不适用：无 service_tier，无 Responses store，无 OpenAI reasoning-compat payload 塑造，也无 prompt-cache 提示
- 隐藏的 OpenClaw 归属头（originator, version, User-Agent）不会注入到这些自定义代理 URL 中

更严格 OpenAI 兼容后端的兼容性说明：

- 某些服务器在 Chat Completions 中只接受字符串类型的 `messages[].content`，不接受
  结构化的内容块数组。对于这些端点，请将
  `models.providers.<provider>.models[].compat.requiresStringContent: true` 设为
  true。
- 某些较小或更严格的本地后端在 OpenClaw 完整的
  agent-runtime 提示词结构下不稳定，尤其是在包含工具 schema 时。如果后端在
  直接的小型 `/v1/chat/completions` 调用中可以工作，但在正常的 OpenClaw
  agent 轮次中失败，首先尝试
  `agents.defaults.experimental.localModelLean: true`，以移除诸如 `browser`、`cron`
  和 `message` 之类重量级默认工具；这是一个实验性
  标志，不是稳定的默认模式设置。参见
  [Experimental Features](/concepts/experimental-features)。如果仍然失败，再尝试
  `models.providers.<provider>.models[].compat.supportsTools: false`。
- 如果后端只在更大的 OpenClaw 运行中仍然失败，剩余问题
  通常是上游模型/服务器容量不足或后端 bug，而不是 OpenClaw 的
  传输层。

## 故障排除

- Gateway 能连到代理吗？`curl http://127.0.0.1:1234/v1/models`。
- LM Studio 模型未加载？重新加载；冷启动是常见的“卡住”原因。
- OpenClaw 在检测到上下文窗口低于 **32k** 时会发出警告，并在低于 **16k** 时阻止运行。如果你遇到该预检限制，请提高服务器/模型上下文上限，或选择更大的模型。
- 上下文错误？降低 `contextWindow` 或提高你的服务器限制。
- OpenAI 兼容服务器返回 `messages[].content ... expected a string`？
  在该模型条目上添加 `compat.requiresStringContent: true`。
- 直接的小型 `/v1/chat/completions` 调用可以工作，但 `openclaw infer model run`
  在 Gemma 或其他本地模型上失败？先使用
  `compat.supportsTools: false` 禁用工具 schema，然后重试。如果服务器仍然只在
  更大的 OpenClaw 提示词下崩溃，请将其视为上游服务器/模型限制。
- 安全性：本地模型会跳过提供方侧过滤；请保持 agent 范围尽量狭窄，并开启 compaction，以限制提示注入的影响范围。

## 相关内容

- [配置参考](/gateway/configuration-reference)
- [模型故障转移](/concepts/model-failover)
