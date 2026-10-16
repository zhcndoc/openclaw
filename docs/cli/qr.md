---
summary: "CLI `openclaw qr` 参考（生成移动配对 QR + 设置代码）"
read_when:
  - "你想快速将移动节点应用与网关配对"
  - "您需要设置代码输出才能进行 remote/manual 共享"
title: "QR"
---

# `openclaw qr`

从当前网关配置生成移动设备配对 QR 和设置码。

旧版 [`openclaw clawbot qr`](/cli/clawbot) 别名接受以下每个标志。

```bash
openclaw qr
openclaw qr --setup-code-only
openclaw qr --json
openclaw qr --remote
openclaw qr --limited
openclaw qr --voice-node
openclaw qr --url wss://gateway.example/ws
```

官方 OpenClaw iOS 和 Android 应用会在其设置码元数据匹配时自动连接。如果某个请求仍处于待处理状态（例如，针对非官方客户端或元数据不匹配），请进行查看并批准：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

## <a id="options"></a> 选项

- `--remote`：更喜欢 `gateway.remote.url` 和远程凭证；当远程 URL 未设置时，回退到 Tailscale Serve/Funnel。忽略 `device-pair` 插件 `publicUrl`；显式 `--url` 或 `--public-url` 仍然优先。
- `--url <url>`：覆盖负载中使用的网关 URL
- `--public-url <url>`：覆盖负载中使用的公共 URL
- `--token <token>`：覆盖引导流程进行身份验证时使用的网关令牌
- `--password <password>`：覆盖引导流程进行身份验证时使用的网关密码
- `--limited`：从交接给操作员的令牌中省略网关管理访问权限
- `--voice-node`：签发节点凭据，以及仅包含 `operator.read` 和 `operator.talk` 的权限
- `--setup-code-only`：仅打印设置代码； `--json` 优先并发出 JSON 文档
- `--no-ascii`：跳过ASCII QR渲染
- `--json`：输出 JSON（`setupCode`、`gatewayUrl`、可选的 `gatewayUrls`、`auth`、`access`、可选的 `accessDowngraded`、`urlSource`）

`--token` 和 `--password` 不能同时使用。`--limited` 和 `--voice-node` 不能同时使用。

## <a id="setup-code-contents"></a> 设置代码内容

设置代码携带不透明、短暂的 `bootstrapToken`，而不是共享网关 token/password. 对于 `wss://` 端点（或同一主机环回），默认引导流程问题：

- 一个主 `node` 令牌，`scopes: []`
- 一个完整的原生移动端 `operator` 转交令牌，包含 `operator.admin`、`operator.approvals`、`operator.read`、`operator.talk.secrets` 和 `operator.write`

使用 `--limited` 可以保持相同的 node 令牌，同时在 operator 转交中省略 `operator.admin`。配对修改范围从不会通过设置代码转交。

对于嵌入式或房间语音客户端，请使用 `--voice-node`。它会保留 node 令牌，并转交一个仅限于 `operator.read` 和 `operator.talk` 的独立 operator 令牌；该令牌无法发送消息、修改配置或调用具有通用写入权限范围的 Gateway 方法。

明文 LAN `ws://` 设置仍然可用，但 OpenClaw 自动使用有限配置文件，因为网络观察者可以捕获并竞争承载引导令牌。配置 `wss://` 或 Tailscale 服务，然后生成新代码以获得完全访问权限。

## <a id="gateway-url-resolution"></a> 网关 URL 解析

移动配对拒绝 Tailscale/public `ws://` 网关 URL：使用 Tailscale Serve/Funnel 或 `wss://` 网关 URL。私有 LAN 地址和 `.local` Bonjour 主机仍然通过普通 `ws://` 受到支持，操作员访问受到如上所述的限制。

仅当 OpenClaw 拥有经过 `gateway.tailscale.mode=serve|funnel` 的路由时，QR 命令才会发布 Tailscale URL。不会通告以普通网关侦听器为目标的旧版外部服务路由，因为该侦听器拒绝 Tailscale- 形代理入口。

如果较旧的设置使用 `gateway.bind=lan` 和持久默认 HTTPS 服务路由，请运行 `openclaw doctor` 来检查它。 Doctor不迁移或清理路由，因为它的状态无法证明谁拥有它，即使有`--fix`；如果您确认它已过时，请仅清除其根处理程序，手动配置 `gateway.bind=loopback` 和 `gateway.tailscale.mode=serve`，然后重新启动网关。自定义服务端口和退役的命名服务路由需要相同的手动清理；医生打印相关指导意见。

除非提供 `--url` 或 `--public-url`，否则在 URL 分辨率运行之前，`--remote` 需要 `gateway.remote.url` 或 `gateway.tailscale.mode=serve|funnel`。仅 `gateway.publicOrigin` 并不能满足该先决条件。

URL 选择保留现有路由：显式配对覆盖、首选远程 URL、Tailscale Serve/Funnel、非首选远程 URL，然后绑定派生地址。对于本地 QR 设置，`gateway.publicOrigin` 是仅环回错误之前的最终回退。如果没有 `--remote`，则配置的 `plugins.entries.device-pair.config.publicUrl` 提供覆盖。与 QR 设置不同，[ 云注册](/gateway/cloud-workers) 明确要求同一解析器对新云工作人员更喜欢公共入口而不是发现。

QR 设置、加入代码和云注册将上下文路径保留在完全限定的 URL 中。设备对插件的 `/pair` 命令保留其历史纯源 URL，包括配置的 `publicUrl` 包含路径时。

## <a id="auth-resolution-(no---remote)"></a><a id="auth-resolution-no-remote"></a> 认证解析（无 `--remote`）

具有 `gateway.auth.mode="trusted-proxy"` 的网关可以生成设置代码，而无需共享令牌或密码。代理仍会在移动连接到达网关之前对其进行身份验证。设置代码不会绕过 Cloudflare Access 或其他代理登录。引导程序到期、设备绑定和访问配置文件保持不变。

当未传入 CLI auth 覆盖时，本地 gateway auth SecretRefs 的解析如下：

| 条件                                                                                                                    | 解析结果                                  |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `gateway.auth.mode="token"`，或在未找到获胜密码来源时推断出的模式                                                | `gateway.auth.token`                      |
| `gateway.auth.mode="password"`，或在 auth/env 中未找到获胜 token 时推断出的模式                                         | `gateway.auth.password`                   |
| `gateway.auth.token` 和 `gateway.auth.password` 都已配置（包括 SecretRefs），且 `gateway.auth.mode` 未设置 | 失败；请显式设置 `gateway.auth.mode` |

## <a id="auth-resolution-(--remote)"></a><a id="auth-resolution-remote"></a> 身份验证解析（`--remote`）

如果有效的活动远程凭据配置为 SecretRefs，并且 `--token` 和 `--password` 均未传递，则该命令将从活动网关快照中解析它们。如果网关不可用，该命令很快就会失败。

<Note>
此命令路径要求网关支持 `secrets.resolve` RPC 方法。较旧的网关将返回未知方法错误。
</Note>

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [设备](/cli/devices)
- [配对](/cli/pairing)
