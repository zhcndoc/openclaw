---
title: "Vercel AI Gateway"
summary: "Vercel AI Gateway 设置（身份验证 + 模型选择）"
read_when:
  - 您想将 Vercel AI Gateway 与 OpenClaw 一起使用
  - 您需要 API 密钥环境变量或 CLI 身份验证选项
---

# Vercel AI Gateway

[Vercel AI Gateway](https://vercel.com/ai-gateway) 提供了一个统一的 API，通过一个端点即可访问数百个模型。

- 提供者: `vercel-ai-gateway`
- 认证: `AI_GATEWAY_API_KEY`
- API: 兼容 Anthropic 消息格式

## 快速开始

1. 设置 API 密钥（推荐：将其存储在 Gateway 中）：

```bash
openclaw onboard --auth-choice ai-gateway-api-key
```

2. 设置默认模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "vercel-ai-gateway/anthropic/claude-opus-4.6" },
    },
  },
}
```

## 非交互示例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice ai-gateway-api-key \
  --ai-gateway-api-key "$AI_GATEWAY_API_KEY"
```

## 环境说明

如果 Gateway 作为守护进程运行（launchd/systemd），请确保 `AI_GATEWAY_API_KEY` 对该进程可用（例如，在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。

## 模型 ID 简写

OpenClaw 接受 Vercel Claude 简写模型引用，并在运行时对其进行规范化：

- `vercel-ai-gateway/claude-opus-4.6` -> `vercel-ai-gateway/anthropic/claude-opus-4.6`
- `vercel-ai-gateway/opus-4.6` -> `vercel-ai-gateway/anthropic/claude-opus-4-6`
