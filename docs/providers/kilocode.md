---
summary: "使用 Kilo Gateway 的统一 API 访问 OpenClaw 中的多种模型"
read_when:
  - 你想用一个 API 密钥访问多个大型语言模型（LLM）
  - 你想通过 OpenClaw 中的 Kilo Gateway 运行模型
---

# Kilo Gateway

Kilo Gateway 提供了一个**统一的 API**，通过单一端点和 API 密钥将请求路由到多个模型。它兼容 OpenAI，大多数 OpenAI SDK 只需切换基础 URL 即可使用。

## 获取 API 密钥

1. 访问 [app.kilo.ai](https://app.kilo.ai)
2. 登录或创建账号
3. 进入 API 密钥页面生成新密钥

## CLI 设置

```bash
openclaw onboard --kilocode-api-key <key>
```

或者设置环境变量：

```bash
export KILOCODE_API_KEY="your-api-key"
```

## 配置片段

```json5
{
  env: { KILOCODE_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "kilocode/anthropic/claude-opus-4.6" },
    },
  },
}
```

## 已展示的模型引用

内置的 Kilo Gateway 目录当前提供以下模型引用：

- `kilocode/anthropic/claude-opus-4.6`（默认）
- `kilocode/z-ai/glm-5:free`
- `kilocode/minimax/minimax-m2.5:free`
- `kilocode/anthropic/claude-sonnet-4.5`
- `kilocode/openai/gpt-5.2`
- `kilocode/google/gemini-3-pro-preview`
- `kilocode/google/gemini-3-flash-preview`
- `kilocode/x-ai/grok-code-fast-1`
- `kilocode/moonshotai/kimi-k2.5`

## 备注

- 模型引用格式为 `kilocode/<提供商>/<模型>`（例如 `kilocode/anthropic/claude-opus-4.6`）。
- 默认模型：`kilocode/anthropic/claude-opus-4.6`
- 基础 URL：`https://api.kilo.ai/api/gateway/`
- 更多模型和提供商选项，请参见 [/concepts/model-providers](/concepts/model-providers)。
- Kilo Gateway 底层使用包含你的 API 密钥的 Bearer 令牌认证。
