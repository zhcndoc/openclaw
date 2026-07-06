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
openclaw qr --url wss://gateway.example/ws
```

官方 OpenClaw iOS 和 Android 应用会在其设置码元数据匹配时自动连接。如果某个请求仍处于待处理状态（例如，针对非官方客户端或元数据不匹配），请进行查看并批准：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

## 选项

- `--remote`：优先使用 `gateway.remote.url`；如果该 URL 未设置，则回退到 `gateway.tailscale.mode=serve|funnel`。忽略 `device-pair` 插件的 `publicUrl`。
- `--url <url>`：覆盖负载中使用的网关 URL
- `--public-url <url>`：覆盖负载中使用的公共 URL
- `--token <token>`：覆盖启动流程进行身份验证时使用的网关令牌
- `--password <password>`：覆盖启动流程进行身份验证时使用的网关密码
- `--setup-code-only`：仅打印设置代码
- `--no-ascii`：跳过 ASCII 二维码渲染
- `--json`：输出 JSON（`setupCode`、`gatewayUrl`、可选的 `gatewayUrls`、`auth`、`urlSource`）

`--token` 和 `--password` 互斥。

## 设置代码内容

设置代码携带的是一个不透明、短时有效的 `bootstrapToken`，而不是共享的网关令牌/密码。内置的引导流程会签发：

- 一个主要的 `node` 令牌，`scopes: []`
- 一个有边界的 `operator` 交接令牌，权限仅限于 `operator.approvals`、`operator.read`、`operator.talk.secrets` 和 `operator.write`

配对变更作用域和 `operator.admin` 仍然需要单独经批准的 operator 配对或令牌流程。

## 网关 URL 解析

对于 Tailscale/公网 `ws://` 网关 URL，移动端配对会在安全关闭模式下失败：请为这些情况使用 Tailscale Serve/Funnel 或 `wss://` 网关 URL。私有 LAN 地址和 `.local` Bonjour 主机仍然支持通过普通 `ws://` 访问。

当所选网关 URL 来自 `gateway.bind=lan` 时，OpenClaw 还会检查持久化的 `tailscale serve status --json` 路由。任何代理活动网关回环端口的 HTTPS Serve 根地址都会作为备用方案包含在内。特定接口的 `custom` 和 `tailnet` 绑定不会获得此备用方案，因为回环 Serve 代理无法访问这些监听器。当前的 iOS 客户端会按顺序探测公布的路由，并保存第一个可达的路由；旧版客户端的 `url` 字段保持不变。

使用 `--remote` 时，必须提供 `gateway.remote.url` 或 `gateway.tailscale.mode=serve|funnel` 之一。

## 认证解析（无 `--remote`）

当未传入 CLI auth 覆盖时，本地 gateway auth SecretRefs 的解析如下：

| 条件                                                                                                                    | 解析结果                                  |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `gateway.auth.mode="token"`，或在未找到获胜密码来源时推断出的模式                                                | `gateway.auth.token`                      |
| `gateway.auth.mode="password"`，或在 auth/env 中未找到获胜 token 时推断出的模式                                         | `gateway.auth.password`                   |
| `gateway.auth.token` 和 `gateway.auth.password` 都已配置（包括 SecretRefs），且 `gateway.auth.mode` 未设置 | 失败；请显式设置 `gateway.auth.mode` |

## Auth resolution (`--remote`)

如果有效的活动远程凭据配置为 SecretRefs，且未传递 `--token` 或 `--password`，命令会从活动网关快照中解析它们。如果网关不可用，命令会快速失败。

<Note>
此命令路径需要支持 `secrets.resolve` RPC 方法的网关。较旧的网关会返回未知方法错误。
</Note>

## 相关

- [CLI 参考](/cli)
- [设备](/cli/devices)
- [配对](/cli/pairing)
