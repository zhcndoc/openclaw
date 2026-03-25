---
title: "Kilo Gateway"
summary: "Use Kilo Gateway's unified API to access many models in OpenClaw"
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
export KILOCODE_API_KEY="<your-kilocode-api-key>" # pragma: allowlist secret
```

## 配置片段

```json5
{
  env: { KILOCODE_API_KEY: "<your-kilocode-api-key>" }, // pragma: allowlist secret
  agents: {
    defaults: {
      model: { primary: "kilocode/kilo/auto" },
    },
  },
}
```

## 默认模型

默认模型是 `kilocode/kilo/auto`，这是一个智能路由模型，会根据任务自动选择最佳的底层模型：

- 规划、调试及编排任务路由至 Claude Opus
- 代码编写与探索任务路由至 Claude Sonnet

## 可用模型

OpenClaw 会在启动时动态发现 Kilo Gateway 上可用的模型。使用 `/models kilocode` 命令可以查看你账户可用的完整模型列表。

网关上的任何模型都可以通过 `kilocode/` 前缀来使用：

```
kilocode/kilo/auto              （默认 - 智能路由）
kilocode/anthropic/claude-sonnet-4
kilocode/openai/gpt-5.2
kilocode/google/gemini-3-pro-preview
...及更多
```

## 备注

- 模型引用格式为 `kilocode/<模型 ID>`（例如 `kilocode/anthropic/claude-sonnet-4`）。
- 默认模型：`kilocode/kilo/auto`
- 基础 URL：`https://api.kilo.ai/api/gateway/`
- 更多模型和提供商选项，请参见 [/concepts/model-providers](/concepts/model-providers)。
- Kilo Gateway 底层使用包含你的 API 密钥的 Bearer 令牌认证。
