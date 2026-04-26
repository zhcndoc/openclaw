---
summary: "openclaw qr 的 CLI 参考（生成移动配对二维码 + 设置代码）"
read_when:
  - 你想快速将移动节点应用与网关配对
  - 你需要用于远程/手动共享的设置代码输出
title: "QR"
---

# `openclaw qr`

根据当前的网关配置生成移动配对二维码和设置代码。

## 用法

```bash
openclaw qr
openclaw qr --setup-code-only
openclaw qr --json
openclaw qr --remote
openclaw qr --url wss://gateway.example/ws
```

## 选项

- `--remote`: 优先使用 `gateway.remote.url`；如果未设置，`gateway.tailscale.mode=serve|funnel` 仍可提供远程公共 URL
- `--url <url>`: 覆盖 payload 中使用的网关 URL
- `--public-url <url>`: 覆盖 payload 中使用的公共 URL
- `--token <token>`: 覆盖引导流程进行身份验证所使用的网关令牌
- `--password <password>`: 覆盖引导流程进行身份验证所使用的网关密码
- `--setup-code-only`: 仅打印设置代码
- `--no-ascii`: 跳过 ASCII 二维码渲染
- `--json`: 输出 JSON (`setupCode`, `gatewayUrl`, `auth`, `urlSource`)

## 备注

- `--token` 和 `--password` 互斥。
- 设置代码本身现在携带一个不透明的短期 `bootstrapToken`，而不是共享的网关令牌/密码。
- 在内置的节点/操作员引导流程中，主节点令牌仍然具有 `scopes: []`。
- 如果引导移交也颁发了操作员令牌，它仍受限于引导允许列表：`operator.approvals`, `operator.read`, `operator.talk.secrets`, `operator.write`。
- 引导范围检查带有角色前缀。该操作员允许列表仅满足操作员请求；非操作员角色仍需要其自身角色前缀下的范围。
- 对于 Tailscale/公共 `ws://` 网关 URL，移动配对会失败关闭。私人局域网 `ws://` 仍受支持，但 Tailscale/公共移动路由应使用 Tailscale Serve/Funnel 或 `wss://` 网关 URL。
- 使用 `--remote` 时，OpenClaw 需要 `gateway.remote.url` 或 `gateway.tailscale.mode=serve|funnel`。
- 使用 `--remote` 时，如果有效激活的远程凭证配置为 SecretRefs 且您未传递 `--token` 或 `--password`，命令将从活动网关快照中解析它们。如果网关不可用，命令将快速失败。
- 不使用 `--remote` 时，当未传递 CLI 身份验证覆盖时，本地网关身份验证 SecretRefs 会被解析：
  - `gateway.auth.token` 在令牌身份验证可以胜出时解析（显式 `gateway.auth.mode="token"` 或推断模式下没有密码源胜出）。
  - `gateway.auth.password` 在密码身份验证可以胜出时解析（显式 `gateway.auth.mode="password"` 或推断模式下没有来自身份验证/环境的胜出令牌）。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`（包括 SecretRefs）且 `gateway.auth.mode` 未设置，则设置代码解析将失败，直到显式设置模式。
- 网关版本差异说明：此命令路径需要支持 `secrets.resolve` 的网关；旧版网关将返回未知方法错误。
- 扫描后，使用以下命令批准设备配对：
  - `openclaw devices list`
  - `openclaw devices approve <requestId>`

## Related

- [CLI reference](/cli)
- [Pairing](/cli/pairing)
