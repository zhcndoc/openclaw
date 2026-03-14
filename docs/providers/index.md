---
summary: "OpenClaw 支持的模型提供商（大型语言模型）"
read_when:
  - 您想选择一个模型提供商
  - 您需要快速了解支持的 LLM 后端
title: "模型提供商"
---

# 模型提供商

OpenClaw 可以使用许多大型语言模型提供商。选择一个提供商，进行身份认证，然后将默认模型设置为 `provider/model`。

寻找聊天渠道文档（WhatsApp/Telegram/Discord/Slack/Mattermost（插件）等）？请参见 [频道](/channels)。

## 快速开始

1. 与提供商进行身份认证（通常通过 `openclaw onboard`）。
2. 设置默认模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 提供商文档

- [Amazon Bedrock](/providers/bedrock)
- [Anthropic（API + Claude Code CLI）](/providers/anthropic)
- [Cloudflare AI Gateway](/providers/cloudflare-ai-gateway)
- [GLM 模型](/providers/glm)
- [Hugging Face（推理）](/providers/huggingface)
- [Kilocode](/providers/kilocode)
- [LiteLLM（统一网关）](/providers/litellm)
- [MiniMax](/providers/minimax)
- [Mistral](/providers/mistral)
- [Moonshot AI（Kimi + Kimi Coding）](/providers/moonshot)
- [NVIDIA](/providers/nvidia)
- [Ollama (cloud + local models)](/providers/ollama)
- [OpenAI (API + Codex)](/providers/openai)
- [OpenCode (Zen + Go)](/providers/opencode)
- [OpenRouter](/providers/openrouter)
- [千帆](/providers/qianfan)
- [Qwen（OAuth）](/providers/qwen)
- [Together AI](/providers/together)
- [Vercel AI Gateway](/providers/vercel-ai-gateway)
- [Venice（Venice AI，注重隐私）](/providers/venice)
- [vLLM（本地模型）](/providers/vllm)
- [小米](/providers/xiaomi)
- [Z.AI](/providers/zai)

## 转录提供商

- [Deepgram（音频转录）](/providers/deepgram)

## 社区工具

- [Claude Max API Proxy](/providers/claude-max-api-proxy) - Claude 订阅凭证的社区代理（使用前请确认 Anthropic 策略/条款）

欲了解完整的提供商目录（xAI、Groq、Mistral 等）及高级配置，
请参见 [模型提供商](/concepts/model-providers)。
