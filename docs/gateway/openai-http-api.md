---
summary: "从 Gateway 暴露一个兼容 OpenAI 的 /v1/chat/completions HTTP 端点"
read_when:
  - 集成期待 OpenAI 聊天补全的工具时
title: "OpenAI 聊天补全"
---

# OpenAI 聊天补全（HTTP）

OpenClaw 的 Gateway 可以提供一个小型的兼容 OpenAI 的聊天补全端点。

该端点**默认是禁用的**，请先在配置中启用。

- `POST /v1/chat/completions`
- 与 Gateway 使用相同端口（WS + HTTP 复用）：`http://<gateway-host>:<port>/v1/chat/completions`

底层请求作为常规 Gateway 代理运行（与 `openclaw agent` 代码路径相同），因此路由、权限和配置与您的 Gateway 保持一致。

## 身份验证

使用 Gateway 的认证配置。发送 Bearer 令牌：

- `Authorization: Bearer <token>`

注意事项：

- 当 `gateway.auth.mode="token"` 时，使用 `gateway.auth.token`（或环境变量 `OPENCLAW_GATEWAY_TOKEN`）。
- 当 `gateway.auth.mode="password"` 时，使用 `gateway.auth.password`（或环境变量 `OPENCLAW_GATEWAY_PASSWORD`）。
- 如果配置了 `gateway.auth.rateLimit` 且发生过多认证失败，端点将返回 `429` 状态码并带有 `Retry-After`。

## 安全边界（重要）

请将此端点视为 Gateway 实例的**完全操作员访问**接口。

- 这里的 HTTP Bearer 认证不是狭义的按用户范围模型。
- 有效的 Gateway 令牌/密码应视为拥有者/操作员凭据。
- 请求通过与受信任操作员操作相同的控制平面代理路径运行。
- 如果目标代理策略允许敏感工具，端点也可使用这些工具。
- 仅在回环地址、Tailnet 或私有入口部署，不要直接暴露到公网。

详见[安全](/gateway/security)和[远程访问](/gateway/remote)。

## 选择代理

无需自定义头：在 OpenAI 的 `model` 字段中编码代理 ID：

- `model: "openclaw:<agentId>"`（示例：`"openclaw:main"`、`"openclaw:beta"`）
- `model: "agent:<agentId>"`（别名）

或者通过头指定具体 OpenClaw 代理：

- `x-openclaw-agent-id: <agentId>`（默认为 `main`）

高级用法：

- `x-openclaw-session-key: <sessionKey>` 用于完全控制会话路由。

## 启用端点

设置 `gateway.http.endpoints.chatCompletions.enabled` 为 `true`：

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: true },
      },
    },
  },
}
```

## 禁用端点

设置 `gateway.http.endpoints.chatCompletions.enabled` 为 `false`：

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: false },
      },
    },
  },
}
```

## 会话行为

默认情况下，该端点**每次请求无状态**（每次调用生成新的会话密钥）。

如果请求中包含 OpenAI 的 `user` 字符串，Gateway 会派生一个稳定的会话密钥，从而使重复调用可以共享代理会话。

## 流式（SSE）

设置 `stream: true` 以接收服务器发送事件（SSE）：

- `Content-Type: text/event-stream`
- 每条事件行格式为 `data: <json>`
- 流结束时发送 `data: [DONE]`

## 示例

非流式：

```bash
curl -sS http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-agent-id: main' \
  -d '{
    "model": "openclaw",
    "messages": [{"role":"user","content":"hi"}]
  }'
```

流式：

```bash
curl -N http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-agent-id: main' \
  -d '{
    "model": "openclaw",
    "stream": true,
    "messages": [{"role":"user","content":"hi"}]
  }'
```
