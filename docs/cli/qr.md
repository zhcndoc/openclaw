---
summary: "openclaw qr 的 CLI 参考（生成移动设备配对 QR + 设置码）"
read_when:
  - 你想快速将移动节点应用与网关配对
  - 你需要用于远程/手动共享的设置码输出
title: "QR"
---

# `openclaw qr`

从当前网关配置生成移动设备配对 QR 和设置码。

```bash
openclaw qr
openclaw qr --setup-code-only
openclaw qr --json
openclaw qr --remote
openclaw qr --limited
openclaw qr --url wss://gateway.example/ws
```

官方 OpenClaw iOS 和 Android 应用会在其设置码元数据匹配时自动连接。如果某个请求仍处于待处理状态（例如，针对非官方客户端或元数据不匹配），请进行查看并批准：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

## 选项

- `--remote`：优先使用 `gateway.remote.url`；如果该 URL 未设置，则回退到 `gateway.tailscale.mode=serve|funnel`。忽略 `device-pair` 插件的 `publicUrl`。
- `--url <url>`：覆盖 payload 中使用的网关 URL
- `--public-url <url>`：覆盖 payload 中使用的公网 URL
- `--token <token>`：覆盖引导流程进行身份验证时使用的网关令牌
- `--password <password>`：覆盖引导流程进行身份验证时使用的网关密码
- `--limited`：从移交给操作员的令牌中省略管理员 Gateway 访问权限
- `--setup-code-only`：仅打印设置代码
- `--no-ascii`：跳过 ASCII QR 渲染
- `--json`：输出 JSON（`setupCode`、`gatewayUrl`、可选的 `gatewayUrls`、`auth`、`access`、可选的 `accessDowngraded`、`urlSource`）

`--token` 和 `--password` 互斥。

## 设置代码内容

设置代码携带的是一个不透明、短期有效的 `bootstrapToken`，而不是共享的网关令牌/密码。对于 `wss://` 端点（或同主机回环），默认的引导流程会发放：

- 一个主 `node` 令牌，`scopes: []`
- 一个完整的原生移动端 `operator` 转交令牌，包含 `operator.admin`、`operator.approvals`、`operator.read`、`operator.talk.secrets` 和 `operator.write`

使用 `--limited` 可以保持相同的 node 令牌，同时在 operator 转交中省略 `operator.admin`。配对修改范围从不会通过设置代码转交。

明文 LAN `ws://` 设置仍然可用，但 OpenClaw 会自动使用
受限配置，因为网络观察者可能会捕获并抢先使用持有者
bootstrap 令牌。请配置 `wss://` 或 Tailscale Serve，然后生成一个新代码
以获得完整访问权限。

## 网关 URL 解析

对于 Tailscale/公开的 `ws://` 网关 URL，移动端配对会失败并关闭：请改用 Tailscale Serve/Funnel，或使用 `wss://` 网关 URL。私有 LAN 地址和 `.local` Bonjour 主机仍然支持通过普通 `ws://` 访问，但如上所述，仅限有限的操作员访问。

当所选 Gateway URL 来自 `gateway.bind=lan` 时，OpenClaw 还会检查持久化的 `tailscale serve status --json` 路由。任何代理当前网关回环端口的 HTTPS Serve 根路径都会作为后备方案包含进来。QR 命令只会为 `lan` 添加此后备方案；`custom` 和 `tailnet` 会保留其明确公布的路由。当前 iOS 客户端会按顺序探测已公布的路由，并保存第一个可达的路由；旧版 `url` 字段对旧客户端保持不变。

使用 `--remote` 时，必须提供 `gateway.remote.url` 或 `gateway.tailscale.mode=serve|funnel` 之一。

## 认证解析（无 `--remote`）

当未传入 CLI auth 覆盖时，本地 gateway auth SecretRefs 的解析如下：

| 条件                                                                                                                    | 解析结果                                  |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `gateway.auth.mode="token"`，或在未找到获胜密码来源时推断出的模式                                                | `gateway.auth.token`                      |
| `gateway.auth.mode="password"`，或在 auth/env 中未找到获胜 token 时推断出的模式                                         | `gateway.auth.password`                   |
| `gateway.auth.token` 和 `gateway.auth.password` 都已配置（包括 SecretRefs），且 `gateway.auth.mode` 未设置 | 失败；请显式设置 `gateway.auth.mode` |

## Auth resolution (`--remote`)

If active remote credentials are configured as SecretRefs, and `--token` or `--password` is not provided, the command will resolve them from the active gateway snapshot. If the gateway is unavailable, the command will fail fast.

<Note>
This command path requires a gateway that supports the `secrets.resolve` RPC method. Older gateways will return an unknown method error.
</Note>

## 相关

- [CLI 参考](/cli)
- [设备](/cli/devices)
- [配对](/cli/pairing)
