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
- 设置码本身现在携带的是一个不透明的短期 `bootstrapToken`，而不是共享的网关 token/password。
- 内置的设置码引导仅支持节点。审批后，主节点 token 的 `scopes` 为 `[]`。
- 内置的设置码流程不会返回已移交的操作员 token；操作员访问需要单独批准的操作员配对或 token 流程。
- 对于 Tailscale/公网 `ws://` 网关 URL，移动设备配对会失败并关闭。私有 LAN 地址和 `.local` Bonjour 主机仍可通过 `ws://` 使用，但 Tailscale/公网移动路由应使用 Tailscale Serve/Funnel 或 `wss://` 网关 URL。
- 使用 `--remote` 时，OpenClaw 需要 `gateway.remote.url` 或
  `gateway.tailscale.mode=serve|funnel`。
- 使用 `--remote` 时，如果实际上已配置为 SecretRefs 的远程凭据处于激活状态，并且你没有传入 `--token` 或 `--password`，命令会从当前网关快照中解析它们。如果网关不可用，命令会快速失败。
- 不使用 `--remote` 时，当未传入 CLI 认证覆盖参数时，会解析本地网关 auth SecretRefs：
  - 当 token 认证可以胜出时，会解析 `gateway.auth.token`（显式 `gateway.auth.mode="token"`，或在没有密码来源胜出的推断模式下）。
  - 当 password 认证可以胜出时，会解析 `gateway.auth.password`（显式 `gateway.auth.mode="password"`，或在没有来自 auth/env 的有效 token 的推断模式下）。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`（包括 SecretRefs），且 `gateway.auth.mode` 未设置，则在显式设置 mode 之前，设置码解析会失败。
- 网关版本差异说明：此命令路径需要支持 `secrets.resolve` 的网关；较旧的网关会返回 unknown-method 错误。
- 扫描后，使用以下命令批准设备配对：
  - `openclaw devices list`
  - `openclaw devices approve <requestId>`

## 相关

- [CLI reference](/cli)
- [Pairing](/cli/pairing)
