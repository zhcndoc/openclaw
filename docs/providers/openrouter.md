---
summary: "使用 OpenRouter 的统一 API 访问 OpenClaw 中的多个模型"
read_when:
  - 您想要一个用于多个大语言模型（LLM）的单一 API 密钥
  - 您想通过 OpenRouter 在 OpenClaw 中运行模型
title: "OpenRouter"
---

# OpenRouter

OpenRouter 提供了一个**统一的 API**，通过单一的端点和 API 密钥路由请求到多个模型。它与 OpenAI 兼容，因此大多数 OpenAI SDK 只需切换基础 URL 即可使用。

## CLI 设置

```bash
openclaw onboard --auth-choice apiKey --token-provider openrouter --token "$OPENROUTER_API_KEY"
```

## 配置片段

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      model: { primary: "openrouter/anthropic/claude-sonnet-4-6" },
    },
  },
}
```

## 注意事项

- 模型引用格式为 `openrouter/<provider>/<model>`。
- 更多模型和提供者选项，请参见 [/concepts/model-providers](/concepts/model-providers)。
- OpenRouter 底层使用带有您的 API 密钥的 Bearer 令牌。
