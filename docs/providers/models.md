---
summary: "OpenClaw 支持的模型提供商（大型语言模型，LLMs）"
read_when:
  - 你想选择一个模型提供商
  - 你想查看 LLM 认证和模型选择的快速设置示例
title: "模型提供商快速入门"
---

# 模型提供商

OpenClaw 可以使用多种大型语言模型提供商。选择一个，完成认证，然后将默认模型设置为 `provider/model`。

## 快速开始（两步）

1. 与提供商完成认证（通常通过 `openclaw onboard`）。
2. 设置默认模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 支持的提供商（入门集）

- [Alibaba Model Studio](/providers/alibaba)
- [Amazon Bedrock](/providers/bedrock)
- [Anthropic (API + Claude CLI)](/providers/anthropic)
- [BytePlus（国际版）](/concepts/model-providers#byteplus-international)
- [Chutes](/providers/chutes)
- [ComfyUI](/providers/comfy)
- [Cloudflare AI Gateway](/providers/cloudflare-ai-gateway)
- [fal](/providers/fal)
- [Fireworks](/providers/fireworks)
- [GLM 模型](/providers/glm)
- [MiniMax](/providers/minimax)
- [Mistral](/providers/mistral)
- [Moonshot AI（Kimi + Kimi 编程）](/providers/moonshot)
- [OpenAI (API + Codex)](/providers/openai)
- [OpenCode (Zen + Go)](/providers/opencode)
- [OpenRouter](/providers/openrouter)
- [千帆](/providers/qianfan)
- [通义千问](/providers/qwen)
- [Runway](/providers/runway)
- [阶跃星辰](/providers/stepfun)
- [Synthetic](/providers/synthetic)
- [Vercel AI Gateway](/providers/vercel-ai-gateway)
- [Venice (Venice AI)](/providers/venice)
- [xAI](/providers/xai)
- [Z.AI](/providers/zai)

## 其他捆绑的提供商变体

- `anthropic-vertex` - 当 Vertex 凭据可用时，隐式支持 Google Vertex 上的 Anthropic；无需单独的认证选择
- `copilot-proxy` - 本地 VS Code Copilot Proxy 桥接；使用 `openclaw onboard --auth-choice copilot-proxy`
- `google-gemini-cli` - 非官方 Gemini CLI OAuth 流程；需要本地安装 `gemini`（`brew install gemini-cli` 或 `npm install -g @google/gemini-cli`）；默认模型 `google-gemini-cli/gemini-3-flash-preview`；使用 `openclaw onboard --auth-choice google-gemini-cli` 或 `openclaw models auth login --provider google-gemini-cli --set-default`

有关完整的提供商目录（xAI、Groq、Mistral 等）和高级配置，
请参阅 [模型提供商](/concepts/model-providers)。

## 相关内容

- [模型选择](/concepts/model-providers)
- [模型故障转移](/concepts/model-failover)
- [Models CLI](/cli/models)
