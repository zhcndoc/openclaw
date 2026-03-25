---
summary: "通过 Gateway HTTP 端点直接调用单个工具"
read_when:
  - 调用工具而不运行完整的代理回合时
  - 构建需要工具策略执行的自动化时
title: "工具调用 API"
---

# 工具调用（HTTP）

OpenClaw 的 Gateway 暴露了一个简单的 HTTP 端点，用于直接调用单个工具。它始终处于启用状态，并使用 Gateway 认证和工具策略，但通过 Gateway bearer 认证的调用者将被视为该网关的受信任操作员。

- `POST /tools/invoke`
- 与 Gateway 端口相同（WS + HTTP 复用）：`http://<gateway-host>:<port>/tools/invoke`

默认最大负载大小为 2 MB。

## 认证

使用 Gateway 认证配置。发送 bearer token：

- `Authorization: Bearer <token>`

说明：

- 当 `gateway.auth.mode="token"` 时，使用 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- 当 `gateway.auth.mode="password"` 时，使用 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
- 如果配置了 `gateway.auth.rateLimit` 且发生过多认证失败，端点将返回 `429` 并附带 `Retry-After`。
- 将此凭证视为该网关的全访问操作员密钥。它不是用于更窄的 `/tools/invoke` 角色的限定范围 API token。

## 请求体

```json
{
  "tool": "sessions_list",
  "action": "json",
  "args": {},
  "sessionKey": "main",
  "dryRun": false
}
```

字段说明：

- `tool`（字符串，必填）：要调用的工具名称。
- `action`（字符串，可选）：如果工具 schema 支持 `action` 并且 args 负载中未包含该字段，则映射到 args 中。
- `args`（对象，可选）：工具特定参数。
- `sessionKey`（字符串，可选）：目标会话键。如果省略或为 `"main"`，Gateway 使用配置的主会话键（遵循 `session.mainKey` 和默认代理，或全局作用域下的 `global`）。
- `dryRun`（布尔，可选）：保留字段，当前忽略。

## 策略与路由行为

工具可用性通过 Gateway 代理使用的相同策略链过滤：

- `tools.profile` / `tools.byProvider.profile`
- `tools.allow` / `tools.byProvider.allow`
- `agents.<id>.tools.allow` / `agents.<id>.tools.byProvider.allow`
- 组策略（如果会话键映射到某个组或频道）
- 子代理策略（调用带有子代理会话键时）

如果工具被策略禁止，端点返回 **404**。

重要的边界说明：

- `POST /tools/invoke` 与其他 Gateway HTTP API（如 `/v1/chat/completions`、`/v1/responses` 和 `/api/channels/*`）处于相同的受信任操作员类别中。
- 执行审批是操作员防护措施，而不是此 HTTP 端点的单独授权边界。如果某个工具可通过 Gateway 认证 + 工具策略在此处访问，`/tools/invoke` 不会添加额外的每次调用审批提示。
- 请勿与不受信任的调用者共享 Gateway bearer 凭证。如果您需要在信任边界之间进行隔离，请运行单独的网关（最好是单独的操作系统用户/主机）。

Gateway HTTP 还默认应用硬性拒绝列表（即使会话策略允许该工具）：

- `cron`
- `sessions_spawn`
- `sessions_send`
- `gateway`
- `whatsapp_login`

你可以通过 `gateway.tools` 自定义此拒绝列表：

```json5
{
  gateway: {
    tools: {
      // 通过 HTTP /tools/invoke 额外阻止的工具
      deny: ["browser"],
      // 从默认拒绝列表中移除工具
      allow: ["gateway"],
    },
  },
}
```

为了帮助组策略解析上下文，你可以选择设置：

- `x-openclaw-message-channel: <channel>`（示例：`slack`，`telegram`）
- `x-openclaw-account-id: <accountId>`（当存在多个账户时）

## 响应

- `200` → `{ ok: true, result }`
- `400` → `{ ok: false, error: { type, message } }`（请求无效或工具输入错误）
- `401` → 未授权
- `429` → 认证速率限制（包含 `Retry-After`）
- `404` → 工具不可用（未找到或未列入白名单）
- `405` → 方法不被允许
- `500` → `{ ok: false, error: { type, message } }`（意外的工具执行错误；消息已消毒）

## 示例

```bash
curl -sS http://127.0.0.1:18789/tools/invoke \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "tool": "sessions_list",
    "action": "json",
    "args": {}
  }'
```
