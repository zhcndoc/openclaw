---
summary: "通过 Gateway HTTP 端点直接调用单个工具"
read_when:
  - 不运行完整的 agent 回合即可调用工具
  - 构建需要工具策略强制执行的自动化
title: "Tools invoke API"
---

# 工具调用（HTTP）

OpenClaw 的 Gateway 暴露了一个简单的 HTTP 端点，用于直接调用单个工具。它始终启用，并使用 Gateway 认证加上工具策略。像 OpenAI 兼容的 `/v1/*` 表面一样，共享密钥 bearer 认证被视为整个网关的可信操作员访问。

- `POST /tools/invoke`
- 与 Gateway 端口相同（WS + HTTP 复用）：`http://<gateway-host>:<port>/tools/invoke`

默认最大负载大小为 2 MB。

## 认证

使用 Gateway 的认证配置。

常见 HTTP 认证路径：

- shared-secret auth (`gateway.auth.mode="token"` 或 `"password"`):
  `Authorization: Bearer <token-or-password>`
- trusted identity-bearing HTTP auth (`gateway.auth.mode="trusted-proxy"`):
  通过已配置的、具备身份感知能力的代理路由，并让其注入所需的身份头
- private-ingress open auth (`gateway.auth.mode="none"`):
  不需要认证头

说明：

- When `gateway.auth.mode="token"`, use `gateway.auth.token` (or `OPENCLAW_GATEWAY_TOKEN`).
- When `gateway.auth.mode="password"`, use `gateway.auth.password` (or `OPENCLAW_GATEWAY_PASSWORD`).
- When `gateway.auth.mode="trusted-proxy"`, the HTTP request must come from a
  configured non-loopback trusted proxy source; same-host loopback proxies do
  not satisfy this mode.
- If `gateway.auth.rateLimit` is configured and too many auth failures occur, the endpoint returns `429` with `Retry-After`.

## 安全边界（重要）

将此端点视为网关实例的**完全操作员访问**表面。

- 此处的 HTTP bearer 认证不是一个狭窄的按用户范围模型。
- 此端点的有效 Gateway token/password 应被视为所有者/操作员凭证。
- 对于 shared-secret auth 模式（`token` 和 `password`），即使调用方发送了更窄的 `x-openclaw-scopes` 头，此端点也会恢复为正常的完整操作员默认值。
- Shared-secret auth 还会将此端点上的直接工具调用视为所有者发送回合。
- Trusted identity-bearing HTTP modes（例如 trusted proxy auth，或私有入口上的 `gateway.auth.mode="none"`）在存在 `x-openclaw-scopes` 时会遵循该头，否则回退到正常的操作员默认范围集合。
- 仅将此端点保留在 loopback/tailnet/private ingress 上；不要直接暴露到公共互联网。

认证矩阵：

- `gateway.auth.mode="token"` 或 `"password"` + `Authorization: Bearer ...`
  - 证明持有共享的网关操作员密钥
  - 忽略更窄的 `x-openclaw-scopes`
  - 恢复完整的默认操作员范围集合：
    `operator.admin`, `operator.approvals`, `operator.pairing`,
    `operator.read`, `operator.talk.secrets`, `operator.write`
  - 将此端点上的直接工具调用视为所有者发送回合
- trusted identity-bearing HTTP modes（例如 trusted proxy auth，或私有入口上的 `gateway.auth.mode="none"`）
  - 认证某个外部受信任身份或部署边界
  - 在存在该头时遵循 `x-openclaw-scopes`
  - 在头缺失时回退到正常的操作员默认范围集合
  - 仅当调用方明确收窄范围并省略 `operator.admin` 时，才会失去所有者语义

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

- 执行批准是操作员护栏，不是此 HTTP 端点的单独授权边界。如果工具可以通过网关认证 + 工具策略在此处访问，`/tools/invoke` 不会添加额外的每次调用批准提示。
- 不要与不可信的调用者共享网关 bearer 凭证。如果您需要在信任边界之间分离，请运行单独的网关（理想情况下是单独的操作系统用户/主机）。

Gateway HTTP 还默认应用硬性拒绝列表（即使会话策略允许该工具）：

- `exec` — 直接命令执行（RCE 表面）
- `spawn` — 任意子进程创建（RCE 表面）
- `shell` — shell 命令执行（RCE 表面）
- `fs_write` — 主机上的任意文件修改
- `fs_delete` — 主机上的任意文件删除
- `fs_move` — 主机上的任意文件移动/重命名
- `apply_patch` — 补丁应用可以重写任意文件
- `sessions_spawn` — 会话编排；远程生成代理是 RCE
- `sessions_send` — 跨会话消息注入
- `cron` — 持久自动化控制平面
- `gateway` — 网关控制平面；防止通过 HTTP 重新配置
- `nodes` — 节点命令中继可以到达配对主机上的 system.run
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
  -H 'Authorization: Bearer secret' \
  -H 'Content-Type: application/json' \
  -d '{
    "tool": "sessions_list",
    "action": "json",
    "args": {}
  }'
```

## 相关链接

- [Gateway protocol](/gateway/protocol)
- [Tools and plugins](/tools)
