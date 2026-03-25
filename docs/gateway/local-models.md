---
summary: "在本地 LLM（LM Studio、vLLM、LiteLLM、自定义 OpenAI 端点）上运行 OpenClaw"
read_when:
  - 你想从自己的 GPU 服务器服务模型
  - 你正在接入 LM Studio 或兼容 OpenAI 的代理
  - 你需要最安全的本地模型指导
title: "本地模型"
---

# 本地模型

本地运行是可行的，但 OpenClaw 期望有大上下文和强防御以抵抗提示注入。小显卡会截断上下文并泄露安全性。目标要高：**≥2 台满负荷的 Mac Studio 或等效 GPU 设备（约 3 万美元以上）**。单个 **24 GB** GPU 仅适用于更轻量的提示，且延迟较高。请使用你能运行的 **最大 / 全尺寸模型变体**；激进量化或"小"检查点会提高提示注入风险（参见 [安全](/gateway/security)）。

## 推荐方案：LM Studio + MiniMax M2.5（Responses API，完整版）  
如果您想要最简便的本地设置，可以从 [Ollama](/providers/ollama) 和 `openclaw onboard` 开始。本页是针对更高端本地环境和自定义 OpenAI 兼容本地服务器的专业指南。

## 推荐方案：LM Studio + MiniMax M2.5（Responses API，完整版）  

目前最佳本地方案。在 LM Studio 中加载 MiniMax M2.5，启用本地服务器（默认 `http://127.0.0.1:1234`），并使用 Responses API 保持推理与最终文本分离。

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/minimax-m2.5-gs32" },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "lmstudio/minimax-m2.5-gs32": { alias: "Minimax" },
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
            id: "minimax-m2.5-gs32",
            name: "MiniMax M2.5 GS32",
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
- 在 LM Studio 中，下载 **可用的最大 MiniMax M2.5 版本**（避免"小型"/高度量化的变体），启动服务器，确认 `http://127.0.0.1:1234/v1/models` 能列出它。
- 保持模型加载状态；冷启动会增加启动延迟。
- 如果你的 LM Studio 版本不同，请调整 `contextWindow` 和 `maxTokens`。
- WhatsApp 使用时，保持使用 Responses API，保证只发送最终文本。

即使运行本地模型，也要保留托管模型配置；使用 `models.mode: "merge"` 以便故障时仍可回退。

### 混合配置：托管主模型，本地备选

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-sonnet-4-6",
        fallbacks: ["lmstudio/minimax-m2.5-gs32", "anthropic/claude-opus-4-6"],
      },
      models: {
        "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
        "lmstudio/minimax-m2.5-gs32": { alias: "MiniMax Local" },
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
            id: "minimax-m2.5-gs32",
            name: "MiniMax M2.5 GS32",
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

- 托管的 MiniMax/Kimi/GLM 变体也可通过 OpenRouter 使用区域绑定端点（如美国托管）。在这选择所需区域版本，以保持流量在你的选定司法区，同时仍可通过 `models.mode: "merge"` 使用 Anthropic/OpenAI 作为备选。
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

## 故障排查

- Gateway 能否访问代理？使用命令 `curl http://127.0.0.1:1234/v1/models` 测试。
- LM Studio 模型是否卸载了？重新加载；冷启动常导致"卡住"。
- 上下文错误？降低 `contextWindow` 或提高服务器限制。
- 安全性：本地模型跳过服务端过滤；保持代理权限窄且启用压缩，限制提示注入影响范围。
