---
summary: "openclaw qr 的 CLI 参考（生成移动设备配对 QR + 设置码）"
read_when:
  - 你想快速将移动节点应用与网关配对
  - 你需要用于远程/手动共享的设置码输出
title: "QR"
---

# `openclaw qr`

从当前网关配置生成移动设备配对 QR 和设置码。

## 用法

```bash
openclaw qr
openclaw qr --setup-code-only
openclaw qr --json
openclaw qr --remote
openclaw qr --url wss://gateway.example/ws
```

## 选项

- `--remote`: 优先使用 `gateway.remote.url`；如果未设置，`gateway.tailscale.mode=serve|funnel` 仍可提供远程公网 URL
- `--url <url>`: 覆盖 payload 中使用的网关 URL
- `--public-url <url>`: 覆盖 payload 中使用的公网 URL
- `--token <token>`: 覆盖引导流程用于认证的网关 token
- `--password <password>`: 覆盖引导流程用于认证的网关密码
- `--setup-code-only`: 仅输出设置码
- `--no-ascii`: 跳过 ASCII QR 渲染
- `--json`: 输出 JSON（`setupCode`、`gatewayUrl`、`auth`、`urlSource`）

## 注意事项

- `--token` 和 `--password` 互斥。
- 设置码本身现在携带的是一个短期有效、不可读的 `bootstrapToken`，而不是共享的网关 token/password。
- 在内置的节点/操作员引导流程中，主节点 token 仍然会以 `scopes: []` 进入。
- 如果引导交接还会颁发一个操作员 token，则它仍然受限于引导允许列表：`operator.approvals`、`operator.read`、`operator.talk.secrets`、`operator.write`。
- 引导作用域检查按角色前缀进行。该操作员允许列表只能满足操作员请求；非操作员角色仍然需要其各自角色前缀下的 scopes。
- 对于 Tailscale/公网 `ws://` 网关 URL，移动配对会直接失败。私有 LAN 地址和 `.local` Bonjour 主机仍可通过 `ws://` 使用，但 Tailscale/公网移动路由应使用 Tailscale Serve/Funnel 或 `wss://` 网关 URL。
- 使用 `--remote` 时，OpenClaw 需要 `gateway.remote.url` 或
  `gateway.tailscale.mode=serve|funnel`。
- 使用 `--remote` 时，如果已配置为 SecretRefs 的有效远程凭据，且你未传入 `--token` 或 `--password`，该命令会从当前网关快照中解析它们。如果网关不可用，命令会快速失败。
- 不使用 `--remote` 时，如果没有传入 CLI 认证覆盖项，会解析本地网关 auth SecretRefs：
  - 当 token 认证可生效时（显式 `gateway.auth.mode="token"`，或推断模式下没有 password 来源胜出），`gateway.auth.token` 会被解析。
  - 当 password 认证可生效时（显式 `gateway.auth.mode="password"`，或推断模式下没有来自 auth/env 的获胜 token），`gateway.auth.password` 会被解析。
- 如果 `gateway.auth.token` 和 `gateway.auth.password` 都已配置（包括 SecretRefs），且 `gateway.auth.mode` 未设置，则在显式设置 mode 之前，设置码解析会失败。
- 网关版本不兼容提示：该命令路径需要支持 `secrets.resolve` 的网关；较旧的网关会返回 unknown-method 错误。
- 扫描后，请使用以下命令批准设备配对：
  - `openclaw devices list`
  - `openclaw devices approve <requestId>`

## 相关

- [CLI reference](/cli)
- [Pairing](/cli/pairing)
