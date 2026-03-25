---
title: "Cloudflare AI 网关"
summary: "Cloudflare AI 网关设置（认证 + 模型选择）"
read_when:
  - 你想将 Cloudflare AI 网关与 OpenClaw 一起使用
  - 你需要账号 ID、网关 ID 或 API 密钥环境变量
---

# Cloudflare AI 网关

Cloudflare AI 网关位于提供商 API 之前，让你可以添加分析、缓存和控制。对于 Anthropic，OpenClaw 通过你的网关端点使用 Anthropic 消息 API。

- Provider: `cloudflare-ai-gateway`
- Base URL: `https://gateway.ai.cloudflare.com/v1/<account_id>/<gateway_id>/anthropic`
- Default model: `cloudflare-ai-gateway/claude-sonnet-4-6`
- API key: `CLOUDFLARE_AI_GATEWAY_API_KEY` (your provider API key for requests through the Gateway)

对于 Anthropic 模型，请使用你的 Anthropic API 密钥。

## 快速开始

1. 设置提供商 API 密钥和网关详情：

```bash
openclaw onboard --auth-choice cloudflare-ai-gateway-api-key
```

2. 设定默认模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "cloudflare-ai-gateway/claude-sonnet-4-6" },
    },
  },
}
```

## 非交互式示例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice cloudflare-ai-gateway-api-key \
  --cloudflare-ai-gateway-account-id "your-account-id" \
  --cloudflare-ai-gateway-gateway-id "your-gateway-id" \
  --cloudflare-ai-gateway-api-key "$CLOUDFLARE_AI_GATEWAY_API_KEY"
```

## 认证网关

如果你在 Cloudflare 里启用了网关认证，需额外添加 `cf-aig-authorization` 头（这是除了你的提供商 API 密钥之外的认证）。

```json5
{
  models: {
    providers: {
      "cloudflare-ai-gateway": {
        headers: {
          "cf-aig-authorization": "Bearer <cloudflare-ai-gateway-token>",
        },
      },
    },
  },
}
```

## 环境注意事项

如果网关作为后台进程运行（launchd/systemd），请确保 `CLOUDFLARE_AI_GATEWAY_API_KEY` 能被该进程访问（例如存放在 `~/.openclaw/.env` 或通过 `env.shellEnv` 提供）。
