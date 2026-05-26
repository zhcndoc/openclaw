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
- 设置码本身现在携带一个不透明的短期 `bootstrapToken`，而不是共享的网关 token/password。
- 内置的设置码引导会返回一个主 `node` token，`scopes: []`，以及一个受限的 `operator` 交接 token，用于受信任的移动端接入。
- 交接的 operator token 仅限于 `operator.approvals`、`operator.read`、`operator.talk.secrets` 和 `operator.write`；`operator.admin` 和 `operator.pairing` 需要单独批准的 operator 配对或 token 流程。
- 对于 Tailscale/公共 `ws://` 网关 URL，移动配对会直接失败。私有局域网地址和 `.local` Bonjour 主机仍可通过 `ws://` 使用，但 Tailscale/公共移动路由应使用 Tailscale Serve/Funnel 或 `wss://` 网关 URL。
- 使用 `--remote` 时，OpenClaw 需要 `gateway.remote.url` 或
  `gateway.tailscale.mode=serve|funnel`。
- 使用 `--remote` 时，如果有效启用的远程凭据配置为 SecretRefs，并且你没有传入 `--token` 或 `--password`，命令会从当前网关快照中解析它们。若网关不可用，命令会快速失败。
- 不使用 `--remote` 时，在未传入 CLI 认证覆盖参数的情况下，会解析本地网关 auth SecretRefs：
  - 当 token 认证可胜出时，`gateway.auth.token` 会被解析（显式 `gateway.auth.mode="token"`，或在无密码来源胜出的推断模式下）。
  - 当 password 认证可胜出时，`gateway.auth.password` 会被解析（显式 `gateway.auth.mode="password"`，或在无从 auth/env 胜出的 token 的推断模式下）。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`（包括 SecretRefs），且未设置 `gateway.auth.mode`，则设置码解析会失败，直到显式设置 mode。
- 网关版本差异提示：此命令路径要求网关支持 `secrets.resolve`；较旧的网关会返回 unknown-method 错误。
- 扫码后，请通过以下命令批准设备配对：
  - `openclaw devices list`
  - `openclaw devices approve <requestId>`

## 相关

- [CLI reference](/cli)
- [Pairing](/cli/pairing)
