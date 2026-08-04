---
summary: "OpenClaw 支持的模型提供商（LLMs）"
read_when:
  - 你想选择一个模型提供商
  - 你想快速查看 LLM 认证和模型选择的设置示例
title: "模型提供商快速入门"
---

选择一个提供商，完成认证，然后将默认模型设置为 `provider/model`。

## 快速开始（两步）

1. 使用提供商进行认证（通常通过 `openclaw onboard`）。
2. 设置默认模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 支持的提供商（入门套件）

- [Alibaba Model Studio](/providers/alibaba)
- [Amazon Bedrock](/providers/bedrock)
- [Anthropic（API + Claude CLI）](/providers/anthropic)
- [Baseten（Inkling + 模型 API）](/providers/baseten)
- [BytePlus（国际版）](/concepts/model-providers#byteplus-international)
- [Chutes](/providers/chutes)
- [Cloudflare AI Gateway](/providers/cloudflare-ai-gateway)
- [Cohere](/providers/cohere)
- [ComfyUI](/providers/comfy)
- [DeepInfra](/providers/deepinfra)
- [fal](/providers/fal)
- [Fireworks](/providers/fireworks)
- [MiniMax](/providers/minimax)
- [Mistral](/providers/mistral)
- [Moonshot AI（Kimi + Kimi Coding）](/providers/moonshot)
- [NovitaAI](/providers/novita)
- [OpenAI（API + Codex）](/providers/openai)
- [OpenCode（Zen + Go）](/providers/opencode)
- [OpenRouter](/providers/openrouter)
- [Qianfan](/providers/qianfan)
- [Qwen](/providers/qwen)
- [Runway](/providers/runway)
- [StepFun](/providers/stepfun)
- [Synthetic](/providers/synthetic)
- [Venice（Venice AI）](/providers/venice)
- [Vercel AI Gateway](/providers/vercel-ai-gateway)
- [xAI](/providers/xai)
- [Z.AI（GLM）](/providers/zai)

有关完整的提供商目录和高级配置，请参阅
[提供商目录](/providers/index) 和 [模型提供商](/concepts/model-providers)。

## 其他提供商变体

- `anthropic-vertex` - 安装 `@openclaw/anthropic-vertex-provider`，以便在 Vertex 凭据可用时支持通过 Google Vertex 使用隐式 Anthropic；无需单独选择身份验证方式
- `copilot-proxy` - 本地 VS Code Copilot Proxy 桥接；使用 `openclaw onboard --auth-choice copilot-proxy`
- `google-gemini-cli` - 可选的显式运行时，用于规范的 `google/*` 模型；需要本地安装 `gemini`，以及受支持的 Google AI Studio API 密钥配置；不提供新的 Gemini CLI 或 Antigravity OAuth 设置

## 相关内容

- [提供商目录](/providers/index)
- [模型选择](/concepts/model-providers)
- [模型故障切换](/concepts/model-failover)
- [模型 CLI](/cli/models)
