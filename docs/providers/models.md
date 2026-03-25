---
summary: "OpenClaw 支持的模型提供商（大型语言模型，LLMs）"
read_when:
  - 你想选择一个模型提供商
  - 你想快速了解 LLM 认证 + 模型选择的示例
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

- [OpenAI (API + Codex)](/providers/openai)
- [Anthropic (API + Claude Code CLI)](/providers/anthropic)
- [OpenRouter](/providers/openrouter)
- [Vercel AI Gateway](/providers/vercel-ai-gateway)
- [Cloudflare AI Gateway](/providers/cloudflare-ai-gateway)
- [Moonshot AI (Kimi + Kimi Coding)](/providers/moonshot)
- [Mistral](/providers/mistral)
- [Synthetic](/providers/synthetic)
- [OpenCode（Zen + Go）](/providers/opencode)
- [Z.AI](/providers/zai)
- [GLM models](/providers/glm)
- [MiniMax](/providers/minimax)
- [Venice (Venice AI)](/providers/venice)
- [Amazon Bedrock](/providers/bedrock)
- [Qianfan](/providers/qianfan)
- [xAI](/providers/xai)

若要查看完整的提供商目录（xAI、Groq、Mistral 等）及高级配置，
请参阅 [模型提供商](/concepts/model-providers)。
