---
summary: "通过 Gateway HTTP 端点直接调用单个工具"
read_when:
  - 不运行完整的 agent turn 而调用工具
  - 构建需要执行工具策略强制的自动化
title: "Tools invoke API"
---

# 工具调用（HTTP）

OpenClaw 的 Gateway 提供了一个简单的 HTTP 端点，用于直接调用单个工具。它始终启用，并使用 Gateway 认证以及工具策略。与 OpenAI 兼容的 `/v1/*` 接口一样，共享密钥 bearer 认证会被视为整个 gateway 的可信操作员访问。

- `POST /tools/invoke`
- 与 Gateway 相同的端口（WS + HTTP 复用）：`http://<gateway-host>:<port>/tools/invoke`

默认最大有效负载大小为 2 MB。

## 身份验证

使用 Gateway 的认证配置。

常见的 HTTP 认证方式：

- 共享密钥认证（`gateway.auth.mode="token"` 或 `"password"`）：
  `Authorization: Bearer <token-or-password>`
- 可信的、携带身份的 HTTP 认证（`gateway.auth.mode="trusted-proxy"`）：
  通过已配置的、感知身份的代理路由请求，并让它注入所需的身份头
- 私有入口开放认证（`gateway.auth.mode="none"`）：
  无需认证头

注意：

- 当 `gateway.auth.mode="token"` 时，使用 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- 当 `gateway.auth.mode="password"` 时，使用 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
- 当 `gateway.auth.mode="trusted-proxy"` 时，HTTP 请求必须来自已配置的受信任代理源；同主机回环代理需要显式设置 `gateway.auth.trustedProxy.allowLoopback = true`。
- 如果配置了 `gateway.auth.rateLimit` 且认证失败次数过多，端点会返回 `429` 并带有 `Retry-After`。

## 安全边界（重要）

将此端点视为 gateway 实例的**完整操作员访问**接口。

- 此处的 HTTP bearer 认证不是狭义的按用户范围模型。
- 此端点有效的 Gateway token/password 应被视为 owner/operator 凭据。
- 对于共享密钥认证模式（`token` 和 `password`），即使调用方发送了更窄的 `x-openclaw-scopes` 头，端点也会恢复为正常的完整操作员默认值。
- 共享密钥认证也会将此端点上的直接工具调用视为 owner-sender turn。
- 可信的、携带身份的 HTTP 模式（例如可信代理认证，或在私有入口上使用 `gateway.auth.mode="none"`）在存在 `x-openclaw-scopes` 时会予以遵守，否则回退到正常的操作员默认 scope 集。
- 仅应将此端点放在 loopback/tailnet/私有入口上；不要直接暴露到公共互联网。

认证矩阵：

- `gateway.auth.mode="token"` 或 `"password"` + `Authorization: Bearer ...`
  - 证明持有共享的 gateway 操作员密钥
  - 忽略更窄的 `x-openclaw-scopes`
  - 恢复完整的默认操作员 scope 集：
    `operator.admin`, `operator.approvals`, `operator.pairing`,
    `operator.read`, `operator.talk.secrets`, `operator.write`
  - 将此端点上的直接工具调用视为 owner-sender turn
- 可信的、携带身份的 HTTP 模式（例如可信代理认证，或在私有入口上使用 `gateway.auth.mode="none"`）
  - 认证某个外部受信任身份或部署边界
  - 在请求头存在时遵守 `x-openclaw-scopes`
  - 当请求头缺失时回退到正常的操作员默认 scope 集
  - 只有当调用方明确缩小 scopes 并省略 `operator.admin` 时，才会失去 owner 语义

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

字段：

- `tool`（字符串，必需）：要调用的工具名称。
- `action`（字符串，可选）：如果工具 schema 支持 `action` 且 args 负载中省略了它，则会映射到 args 中。
- `args`（对象，可选）：工具特定参数。
- `sessionKey`（字符串，可选）：目标 session key。若省略或为 `"main"`，Gateway 将使用已配置的主 session key（遵守 `session.mainKey` 和默认 agent，或在全局作用域中使用 `global`）。
- `dryRun`（布尔值，可选）：为未来用途保留；当前会被忽略。

## 策略 + 路由行为

工具可用性通过 Gateway agents 使用的同一策略链进行过滤：

- `tools.profile` / `tools.byProvider.profile`
- `tools.allow` / `tools.byProvider.allow`
- `agents.<id>.tools.allow` / `agents.<id>.tools.byProvider.allow`
- 组策略（如果 session key 映射到 group 或 channel）
- 子 agent 策略（当使用子 agent session key 调用时）

如果某个工具不被策略允许，端点会返回 **404**。

重要边界说明：

- exec 审批是操作员护栏，而不是这个 HTTP 端点的独立授权边界。若某个工具通过 Gateway 认证 + 工具策略可在此处访问，`/tools/invoke` 不会额外增加每次调用的审批提示。
- 不要将 Gateway bearer 凭据分享给不受信任的调用方。如果你需要跨信任边界进行隔离，请运行独立的 gateways（理想情况下还要使用不同的 OS 用户/主机）。

Gateway HTTP 还会默认应用一个硬性拒绝列表（即使 session 策略允许该工具）：

- `exec` — 直接命令执行（RCE 表面）
- `spawn` — 任意子进程创建（RCE 表面）
- `shell` — shell 命令执行（RCE 表面）
- `fs_write` — 对主机上的任意文件进行修改
- `fs_delete` — 删除主机上的任意文件
- `fs_move` — 在主机上任意移动/重命名文件
- `apply_patch` — 补丁应用可能重写任意文件
- `sessions_spawn` — session 编排；远程启动 agents 属于 RCE
- `sessions_send` — 跨 session 消息注入
- `cron` — 持久化自动化控制平面
- `gateway` — gateway 控制平面；防止通过 HTTP 重新配置
- `nodes` — 节点命令转发可以到达配对主机上的 system.run
- `whatsapp_login` — 需要终端二维码扫描的交互式设置；在 HTTP 上会挂起

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

为帮助组策略解析上下文，你可以选择性设置：

- `x-openclaw-message-channel: <channel>`（示例：`slack`、`telegram`）
- `x-openclaw-account-id: <accountId>`（当存在多个账户时）

## 响应

- `200` → `{ ok: true, result }`
- `400` → `{ ok: false, error: { type, message } }`（无效请求或工具输入错误）
- `401` → 未授权
- `429` → 认证速率受限（已设置 `Retry-After`）
- `404` → 工具不可用（未找到或未列入允许列表）
- `405` → 方法不允许
- `500` → `{ ok: false, error: { type, message } }`（意外的工具执行错误；已清理的消息）

## 示例

```bash
curl -sS http://127.0.0.1:18789/tools/invoke \
  -H 'Authorization: Bearer secret' \
  -H 'Content-Type: application/json' \
  -d '{
    "tool": "sessions_list",
    "action": "json",
    "args": {}
  }'
```

## 相关

- [Gateway protocol](/gateway/protocol)
- [Tools and plugins](/tools)
