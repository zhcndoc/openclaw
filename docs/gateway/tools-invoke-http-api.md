---
summary: "通过 Gateway HTTP 端点直接调用单个工具"
read_when:
  - 在不运行完整 agent 回合的情况下调用工具
  - 在构建需要工具策略强制执行的自动化时
title: "工具调用 API"
---

OpenClaw 的 Gateway 提供了一个 HTTP 端点，用于直接调用单个工具。该功能始终启用，并使用 Gateway 身份验证以及工具策略。与 OpenAI 兼容的 `/v1/*` 接口一样，共享密钥 bearer 认证会被视为整个 gateway 的可信操作员访问。

- `POST /tools/invoke`
- 与 Gateway 相同的端口（WS + HTTP 多路复用）：`http://<gateway-host>:<port>/tools/invoke`
- 默认最大请求体大小：2 MB

## 身份验证

使用网关身份验证配置。

常见的 HTTP 身份验证模式：

- 共享密钥认证（`gateway.auth.mode="token"` 或 `"password"`）：`Authorization: Bearer <token-or-password>`
- 受信任的、携带身份的 HTTP 认证（`gateway.auth.mode="trusted-proxy"`）：通过已配置的身份感知代理路由，并让它注入所需的身份头
- 私有入口开放认证（`gateway.auth.mode="none"`）：无需认证头

注意：

- `mode="token"` 使用 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- `mode="password"` 使用 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
- `mode="trusted-proxy"` 要求 HTTP 请求来自已配置的受信任代理来源；同主机回环代理需要显式设置 `gateway.auth.trustedProxy.allowLoopback = true`。
- 内部同主机调用者如果绕过代理，可以使用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD` 作为本地直接回退方案。任何 `Forwarded`、`X-Forwarded-*` 或 `X-Real-IP` 头部证据都会让请求继续走 trusted-proxy 路径。
- 如果配置了 `gateway.auth.rateLimit` 且发生了过多认证失败，端点将返回带有 `Retry-After` 的 `429`。

## 安全边界（重要）

将此端点视为对网关实例的**完整操作员访问权限**。

- 此处的 HTTP bearer 认证不是一种细粒度的按用户范围模型。
- 此端点的有效 Gateway token/password 应被视为所有者/操作员凭证。
- 对于共享密钥认证模式（`token` 和 `password`），即使调用方发送了更窄的 `x-openclaw-scopes` 标头，端点也会恢复为正常的完整操作员默认值。
- 共享密钥认证还会将此端点上的直接工具调用视为所有者发送方轮次。
- 受信任的、带身份信息的 HTTP 模式（受信任代理认证，或在私有入口上的 `gateway.auth.mode="none"`）在存在 `x-openclaw-scopes` 时会遵守该设置，否则回退到正常的操作员默认作用域集合。
- 请仅将此端点保留在 loopback/tailnet/private ingress 上；不要将其直接暴露到公共互联网。

认证矩阵：

| 认证模式                                                                               | 行为                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `token` 或 `password` + `Authorization: Bearer ...`                                     | 证明持有共享的网关操作员密钥。忽略更窄的 `x-openclaw-scopes`。恢复完整的默认操作员作用域集合：`operator.admin`、`operator.approvals`、`operator.pairing`、`operator.read`、`operator.talk.secrets`、`operator.write`。将直接工具调用视为所有者发送方轮次。 |
| 受信任的、带身份信息的 HTTP（受信任代理认证，或私有入口上的 `mode="none"`） | 认证外部受信任身份或部署边界。在存在 `x-openclaw-scopes` 时会遵守该设置。若缺少该标头，则回退到正常的操作员默认作用域集合。仅当调用方明确缩小作用域并省略 `operator.admin` 时，才会失去所有者语义。                               |

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

- `tool` / `name`（字符串，必填）：要调用的工具名称。如果两者都提供，则以 `name` 为准。
- `action`（字符串，可选）：如果工具 schema 支持 `action` 属性，并且 `args` 中尚未设置该属性，则合并到 `args.action` 中。
- `args`（对象，可选）：工具特定参数。
- `sessionKey`（字符串，可选）：目标会话键。如果省略或为 `"main"`，Gateway 将使用已配置的主会话键（遵循 `session.mainKey` 和默认 agent，或在全局会话作用域中使用 `global`）。
- `agentId`（字符串，可选）：为该 agent 解析会话键。如果它与一个已显式指定、且已映射到不同 agent 的 `sessionKey` 冲突，则返回 `400` 错误。
- `idempotencyKey`（字符串，可选）：用于为此次调用派生稳定的工具调用 ID。
- `dryRun`（布尔值，可选）：保留供将来使用；当前会被忽略。

## 策略 + 路由行为

工具可用性通过与 Gateway agents 使用的相同策略链进行过滤：

- `tools.profile` / `tools.byProvider.profile`
- `tools.allow` / `tools.byProvider.allow`
- `agents.<id>.tools.allow` / `agents.<id>.tools.byProvider.allow`
- 组策略（如果会话密钥映射到某个组或频道）
- 子代理策略（使用子代理会话密钥调用时）

如果某个工具未被策略允许，该端点会返回 **404**。

重要边界说明：

- Exec 审批是运维者的保护措施，不是该 HTTP 端点的单独授权边界。如果某个工具通过 Gateway 认证 + 工具策略在这里可访问，`/tools/invoke` 不会额外增加逐次调用的审批提示。
- 如果 `exec` 在这里可访问，请将其视为可变更的 shell 表面。即使拒绝了 `write`、`edit`、`apply_patch` 或 HTTP 文件系统写入工具，也不能使 shell 执行变成只读。
- 不要将 Gateway bearer 凭据分享给不受信任的调用方。如果你需要在不同信任边界之间隔离，请运行独立的 gateways（最好使用不同的 OS 用户/主机）。

即使会话策略允许该工具，Gateway HTTP 也会默认应用硬性拒绝列表：

| 工具             | 原因                                                     |
| ---------------- | -------------------------------------------------------- |
| `exec`           | 直接命令执行（RCE 攻击面）                               |
| `spawn`          | 任意子进程创建（RCE 攻击面）                             |
| `shell`          | Shell 命令执行（RCE 攻击面）                             |
| `fs_write`       | 主机上的任意文件修改                                     |
| `fs_delete`      | 主机上的任意文件删除                                     |
| `fs_move`        | 主机上的任意文件移动/重命名                              |
| `apply_patch`    | 补丁应用可重写任意文件                                    |
| `sessions_spawn` | 会话编排；远程启动代理是 RCE                              |
| `sessions_send`  | 跨会话消息注入                                           |
| `cron`           | 持久化自动化控制平面                                      |
| `gateway`        | Gateway 控制平面；防止通过 HTTP 重新配置                 |
| `nodes`          | 节点命令转发可能到达配对主机上的 `system.run`            |

`cron`、`gateway` 和 `nodes` 也仅限所有者：即使不在该默认拒绝列表中，非所有者调用方也无法在此表面调用它们。

可通过 `gateway.tools` 自定义通用拒绝列表：

```json5
{
  gateway: {
    tools: {
      // 通过 HTTP /tools/invoke 额外阻止的工具
      deny: ["browser"],
      // 从默认拒绝列表中移除工具，供 owner/admin 调用
      allow: ["gateway"],
    },
  },
}
```

`gateway.tools.allow` 是一个暴露覆盖，而不是权限升级。在带身份的 HTTP 模式中，即使列在 `gateway.tools.allow` 中，`cron`、`gateway` 和 `nodes` 对没有 owner/admin 身份（`operator.admin`）的调用方仍然不可用。共享密钥 bearer 认证仍遵循上面的完整受信任运维者规则。

为了帮助组策略解析上下文，你可以选择设置：

- `x-openclaw-message-channel: <channel>`（例如：`slack`、`telegram`）
- `x-openclaw-account-id: <accountId>`（当存在多个账户时）
- `x-openclaw-message-to: <target>`（消息工具策略的投递目标）
- `x-openclaw-thread-id: <threadId>`（消息工具策略的线程上下文）

## 响应

| 状态 | 含义                                                                                         |
| ------ | ---------------------------------------------------------------------------------------------- |
| `200`  | `{ ok: true, result }`                                                                         |
| `400`  | `{ ok: false, error: { type, message } }`（无效请求或工具输入错误）                           |
| `401`  | 未授权                                                                                       |
| `403`  | `{ ok: false, error: { type, message, requiresApproval? } }`（工具调用被策略阻止）           |
| `404`  | 工具不可用（未找到或未列入允许列表）                                                          |
| `405`  | 方法不允许                                                                                   |
| `408`  | 读取请求体超时                                                                             |
| `413`  | 请求体超过最大负载大小                                                                     |
| `429`  | 认证速率受限（已设置 `Retry-After`）                                                         |
| `500`  | `{ ok: false, error: { type, message } }`（意外的工具执行错误；已清理的消息）                 |

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

## 相关内容

- [网关协议](/gateway/protocol)
- [工具和插件](/tools)
