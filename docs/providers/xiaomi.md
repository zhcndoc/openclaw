---
summary: "在 OpenClaw 中使用 Xiaomi MiMo（mimo-v2-flash）"
read_when:
  - 你想在 OpenClaw 中使用 Xiaomi MiMo 模型
  - 你需要设置 XIAOMI_API_KEY
title: "Xiaomi MiMo"
---

# Xiaomi MiMo

Xiaomi MiMo 是 **MiMo** 模型的 API 平台。它提供兼容 OpenAI 和 Anthropic 格式的 REST API，并使用 API Key 进行身份验证。在 [Xiaomi MiMo 控制台](https://platform.xiaomimimo.com/#/console/api-keys) 创建你的 API Key。OpenClaw 使用带有 Xiaomi MiMo API Key 的 `xiaomi` 提供者。

## 模型概览

- **mimo-v2-flash**：262144 令牌上下文窗口，兼容 Anthropic Messages API。
- 基础 URL：`https://api.xiaomimimo.com/anthropic`
- 授权方式：`Bearer $XIAOMI_API_KEY`

## CLI 设置

```bash
openclaw onboard --auth-choice xiaomi-api-key
# 或者非交互式
openclaw onboard --auth-choice xiaomi-api-key --xiaomi-api-key "$XIAOMI_API_KEY"
```

## 配置片段

```json5
{
  env: { XIAOMI_API_KEY: "your-key" },
  agents: { defaults: { model: { primary: "xiaomi/mimo-v2-flash" } } },
  models: {
    mode: "merge",
    providers: {
      xiaomi: {
        baseUrl: "https://api.xiaomimimo.com/anthropic",
        api: "anthropic-messages",
        apiKey: "XIAOMI_API_KEY",
        models: [
          {
            id: "mimo-v2-flash",
            name: "Xiaomi MiMo V2 Flash",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## 备注

- 模型引用：`xiaomi/mimo-v2-flash`。
- 当设置了 `XIAOMI_API_KEY`（或存在身份验证配置文件）时，会自动注入该提供者。
- 详情请参见 [/concepts/model-providers](/concepts/model-providers) 了解提供者规则。
