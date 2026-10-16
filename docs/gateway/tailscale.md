---
summary: "为 Gateway 仪表盘集成 Tailscale Serve/Funnel"
read_when:
  - "在本地主机外部公开网关 Control UI"
  - "自动化 tailnet 或公共仪表盘访问"
title: "Tailscale"
---

OpenClaw 可以为网关仪表板和 WebSocket 端口自动配置 Tailscale **Serve**（尾网）或 **Funnel**（公共）。这使网关绑定到环回，同时 Tailscale 提供 HTTPS、路由和（用于服务）身份标头。

<Note>
需要分步设置指南？请参阅[为 Gateway 提供稳定的 HTTPS URL](/gateway/stable-https-url)。
</Note>

## <a id="modes"></a> 模式

`gateway.tailscale.mode`:

| 模式            | 行为                                                                    |
| --------------- | --------------------------------------------------------------------------- |
| `serve`         | 仅限尾网的 Serve，通过 `tailscale serve` 提供。网关保持在 `127.0.0.1`。 |
| `funnel`        | 通过 `tailscale funnel` 提供公共 HTTPS。需要共享密码。            |
| `off`（默认） | 不进行 Tailscale 自动化。                                                    |

对于此 OpenClaw Serve/Funnel 模式，状态和审核输出使用 **Tailscale 暴露**。 `off` 表示 OpenClaw 不管理服务或漏斗。这并不意味着本地 Tailscale 守护程序已停止或注销。

## <a id="config-examples"></a> 配置示例

### <a id="tailnet-only-(serve)"></a><a id="tailnet-only-serve"></a> 仅限 Tailnet（Serve）

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" },
  },
}
```

打开：`https://<magicdns>/`（或你配置的 `gateway.controlUi.basePath`）

### <a id="tailnet-only-(bind-to-tailnet-ip)"></a><a id="tailnet-only-bind-to-tailnet-ip"></a> 仅限 Tailnet（绑定到 Tailnet IP）

使用此方式可让 gateway 直接监听 Tailnet IP，不使用 Serve/Funnel：

```json5
{
  gateway: {
    bind: "tailnet",
    auth: { mode: "token", token: "your-token" },
  },
}
```

从另一台 Tailnet 设备连接原生客户端或 CLI 客户端：

- WebSocket: `ws://<tailscale-ip>:18789`

浏览器 Control UI 可以使用纯 JavaScript Ed25519 通过直接纯 HTTP 地址创建和签署设备身份。使用 token/password 身份验证，共享密钥仍然不会取代浏览器设备身份。

普通 HTTP 仍然是降级传输：身份签名不会加密页面、共享密钥或网关流量。优先选择 Tailscale 为 HTTPS 服务。请参阅 [ 不安全 HTTP](/web/control-ui#insecure-http)。

从Tailnet地址加载Control UI本身就是一个私有同源请求，不需要`gateway.controlUi.allowedOrigins`条目。公共或跨源浏览器部署需要允许的源。

<Note>
当存在可绑定 Tailnet IPv4 时，网关还需要 `http://127.0.0.1:18789` 用于经过身份验证的同一主机客户端。如果启动时没有可用的 Tailnet 地址，则仅回退到环回。 Tailscale 可用后重新启动以添加直接 Tailnet 访问。这两条路径都不会增加 LAN 或公开曝光。
</Note>

### <a id="public-internet-(funnel-%2B-shared-password)"></a><a id="public-internet-funnel-+-shared-password"></a> 公共互联网（Funnel + 共享密码）

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "funnel" },
    auth: { mode: "password", password: "replace-me" },
  },
}
```

建议使用 `OPENCLAW_GATEWAY_PASSWORD`，不要将密码提交到磁盘。

Funnel URL 也仍然可以在尾网内的设备上使用。 Tailscale 将公共请求标记为漏斗流量，但改为通过其服务身份路径发送尾网对等点。 OpenClaw 识别其专用侦听器上的两条路径，但仍然需要配置的漏斗密码。

## <a id="cli-examples"></a> CLI 示例

```bash
openclaw gateway --tailscale serve
openclaw gateway --tailscale funnel --auth password
```

## <a id="auth"></a> 身份验证

`gateway.auth.mode` 控制握手方式：

| 模式              | 使用场景                                                                            |
| ----------------- | ----------------------------------------------------------------------------------- |
| `none`            | 仅限私有入口                                                                |
| `token`（默认） | 通过 `OPENCLAW_GATEWAY_TOKEN` 或配置共享令牌                                 |
| `password`        | 通过 `OPENCLAW_GATEWAY_PASSWORD` 或配置使用共享密钥                             |
| `trusted-proxy`   | 身份识别反向代理；请参阅 [ 受信任代理 Auth](/gateway/trusted-proxy-auth) |

当 `gateway.auth.mode` 未设置时，已解析的密码会选择密码模式。如果没有，则令牌是默认值。如果`gateway.auth.token`和`gateway.auth.password`都配置了，则显式设置模式。

当令牌模式没有凭据时，环回启动会生成仅运行时令牌，而不将其写入配置。单独的 `openclaw qr` 命令仍然需要可用的配置或提供的 token/password 身份验证。该仅启动令牌不配置配对。请参阅 [QR 身份验证解析 ](/cli/qr)。

### <a id="tailscale-identity-headers-(serve-only)"></a><a id="tailscale-identity-headers-serve-only"></a> Tailscale 身份头（仅适用于 Serve）

当 `tailscale.mode: "serve"` 和 `gateway.auth.allowTailscale` 为 `true` 时，Control UI/WebSocket 身份验证可以使用 Tailscale 身份标头 （`tailscale-user-login`） 而不是 token/password. OpenClaw 通过解析请求的通过本地 `x-forwarded-for` 地址通过本地 Tailscale 守护进程 （`tailscale whois`） 并将其与标头登录进行匹配，然后再接受它。仅当请求到达 OpenClaw 的专用托管 Tailscale 侦听器（具有 Tailscale 的 `x-forwarded-for`、`x-forwarded-proto` 和 `x-forwarded-host` 标头）时，该请求才符合资格。这些标头永远不会在普通网关侦听器上建立托管服务来源或无令牌身份验证。

此无令牌流假设网关主机是可信的。如果不受信任的本地代码可能在同一主机上运行，​​请设置 `gateway.auth.allowTailscale: false` 并要求 token/password 身份验证。

绕过的适用范围：

- 适用于 Control UI WebSocket 身份验证表面和对 Control UI 个人资料头像的只读 `GET`/`HEAD` 请求。其他 HTTP API 端点（`/v1/*`、`/tools/invoke`、`/api/channels/*` 等）从不使用 Tailscale 身份标头身份验证。它们始终遵循网关的正常 HTTP 身份验证模式。
- 对于已携带浏览器设备身份的 Control UI 操作员会话，经过验证的 Tailscale 身份会跳过 bootstrap-token/QR 配对往返。
- 它不会绕过设备身份验证本身：没有设备身份的客户端仍会被拒绝，节点角色连接仍会经过正常的配对和身份验证检查。

### <a id="externally-managed-serve-and-funnel"></a> 外部管理的服务和漏斗

当另一个服务拥有该路由时，您可以将本机 Tailscale Serve 或 Funnel 路由指向普通网关侦听器。在 `gateway.trustedProxies` 中配置路由的直接源，并检查其是否覆盖或安全重建 `X-Forwarded-For`。然后，OpenClaw 将该请求视为通用 `trusted-proxy` 入口，使用转发的客户端地址进行速率限制，并正常应用配置的网关身份验证模式。由于漏斗是公共的，因此当 `gateway.auth.mode` 为 `none` 时，网关保护的路由会拒绝外部管理的漏斗入口。配置令牌、密码或可信代理身份验证。聚合运行状况、准备情况和启动检查保留其现有的未经身份验证的响应，而不会暴露详细的准备情况或启动数据。请参阅 [ 健康状况和准备情况 ](/gateway/health)。

此兼容性路径不授予托管 Tailscale 语义。 `gateway.auth.allowTailscale` 无法提供无令牌身份验证。 OpenClaw 不调用 `tailscale whois`。它不拥有或清理外部路由。如果没有显式可信源和有效的非环回转发客户端地址，网关身份验证的路由将失败并显示 `proxy_attribution_required`。如果代理通过环回连接，则将 `127.0.0.1` 添加到 `trustedProxies` 会显式信任同一主机进程来提供代理归属。保持启用令牌或密码身份验证，除非主机上的每个进程都属于同一信任边界。

## <a id="notes"></a> 说明

- Tailscale Serve/Funnel 需要已安装并登录的 `tailscale` CLI。
- 普通`openclaw doctor`在维护和修复提示之前检查配置的本地Serve/Funnel后端。它命名已停止、已注销、待批准、正在启动或不可用的后端，并打印下一个操作。此先决条件检查不会启用 Tailscale、更改路由或修改 exposure/authentication 设置。更新驱动的 Doctor 会推迟此建议，直到更新后运行普通 Doctor，因为附带的更新程序会限制候选配置读取；仍尽最大努力进行维修。单独运行的后端并不能证明 Serve/Funnel 路由或网关已准备就绪。
- `tailscale.mode: "funnel"` 会拒绝启动，除非认证模式是 `password`，以避免公开暴露。
- OpenClaw 持有 Serve/Funnel 作为前台 Tailscale 声明。通常，只有在声明处于活动状态后，网关启动才会成功，并且停止或丢失网关会自动释放它。如果 Serve 明确报告其未在 tailnet 上启用，包括在启动截止日期之前等待启用时，OpenClaw 会确认声明清理、发出警告并保持经过身份验证的环回网关可用。远程服务访问仍然不可用；配置和尾网策略不变。恢复预期的服务策略并重新启动网关以重试。漏斗否认、未知故障、取消和未经确认的清理仍然会停止启动。
- 启动期间停止也会在准备就绪之前释放声明。如果 Tailscale 需要 `sudo -n`，则清理使用 `sudo -n /bin/kill` 来启动进程组 OpenClaw。为网关用户 Tailscale 提供 `sudo tailscale set --operator=$USER` 操作员访问权限，以避免需要特权启动和清理。
- 启用受管入口后，启动时可以在其受管端口上采用前身后台 HTTPS 根路由。当目标恰好是 `http://127.0.0.1:<configured-gateway-port>` 或带有可选尾部斜杠的等效 `localhost` URL 时，它会采用该路线。然后，启动将路由替换为专用的托管侦听器并记录采用情况。到其他目标的路由，或与其他处理程序或主机名共享其端口的根，保持不变。启动报告冲突的 HTTPS 端口和恢复指南。 Doctor 保持外部管理的配置不变。
- Named Tailscale 受管理入口不支持服务，因为 Tailscale 要求它们作为持久后台路由运行。现有的 `gateway.tailscale.serviceName` 安装必须运行 `openclaw doctor --fix`。医生禁用受控入口并移除密钥。检查保留的服务路由，使用 `tailscale serve clear <service-name>` 清除它，然后根据需要使用 `gateway.tailscale.mode: "serve"` 启用设备服务。
- 旧版本可以通告针对 `gateway.bind: "lan"` 侦听器的外部配置的默认 HTTPS 服务路由。该路由不会自动获得可信的入口来源。运行`openclaw doctor`进行检查。 Doctor 保持配置不变，因为它无法证明谁拥有该路由。该路由可能属于当前的 Tailscale 主机名，并且在较旧的 OpenClaw 版本中已过时。如果确认这一点，请仅删除其带有 `tailscale serve --yes --https=443 --set-path=/ off` 或 `tailscale funnel --yes --https=443 --set-path=/ off` 的根处理程序。然后手动配置 `gateway.bind: "loopback"` 加 `gateway.tailscale.mode: "serve"`，并重新启动网关。如果另一个服务必须保留所有权，请关闭托管 Tailscale 入口并使用上面的显式 `trustedProxies` 兼容性路径。
- `gateway.tailscale.preserveFunnel: true` 是已弃用的迁移防护。它在重新应用服务之前检测外部配置的 `tailscale funnel` 路由。如果该路由仍然以普通网关侦听器为目标，OpenClaw 会保持其不变并发出警告，因为该路由不受管理入口。网关身份验证的路由仅通过上面的显式 `trustedProxies` 兼容性路径工作，并继续需要配置的身份验证。经过插件验证的 Webhook 路由（例如 Google Chat 和 SMS）继续使用自己的签名和身份验证检查。要迁移，首先配置耐用的 `gateway.auth.password`（首选 SecretRef）或 `OPENCLAW_GATEWAY_PASSWORD`。将 `gateway.auth.mode` 设置为 `password`。运行 `openclaw config set gateway.tailscale.mode funnel`。然后运行`openclaw config unset gateway.tailscale.preserveFunnel`。
- 当 Tailnet IPv4 可用时，`gateway.bind: "tailnet"` 使用直接 Tailnet 绑定（无 HTTPS、无 Serve/Funnel）以及所需的本地 `127.0.0.1`。否则它会退回到仅环回。
- `gateway.bind: "auto"` 在检测到的容器中使用 `0.0.0.0`，否则更喜欢环回。使用 `tailnet` 限制对 Tailnet 的直接网络暴露，同时保留同一主机环回访问。
- 主要的Serve/Funnel路由暴露了**网关Control UI + WS**。节点通过同一 WS 端点进行连接。 [Portals](/gateway/portals#managed-private-tailscale-serve) 分配单独的专用服务 HTTPS 端口；他们永远不会继承漏斗暴露。 Tailnet 授权或 ACL 必须允许门户端口以及网关端口。外部管理的路由不会自动分配门户入口。

### <a id="tailscale-prerequisites-and-limits"></a> Tailscale 前置条件和限制

- Serve 需要为您的尾网启用 HTTPS。如果缺少CLI，则会提示。
- Tailnet 服务流量注入 Tailscale 身份标头。公共漏斗流量使用漏斗标记，而对同一漏斗 URL 的尾网访问则遵循服务身份路径。
- OpenClaw-管理的Serve/Funnel代理到专用`127.0.0.1:<ephemeral-port>`侦听器，而普通本地客户端保留配置的网关端口。启动停止而不是共享侦听器出处，并且当其网关所有者消失时，前台声明会释放该路由。
- 当网关在本地 Tailscale 守护程序连接之前启动时（`tailscale status` 报告 `NoState` 或 `Starting`，或者守护程序尚未接受连接），托管声明将等待最多 90 秒，并记录进度。任何其他守护程序状态都会立即停止启动。
- A 守护程序报告 `Stopped` 仍会阻止网关启动。在 Tailscale 连接恢复后，具有该显式状态的已完成故障不会触发通道崩溃环路抑制。 OpenClaw 永远不会启动故意停止的 Tailscale 守护进程。未知的启动故障和不干净的退出保留正常的断路器保护。
- 主机名发现接受最多 16 个 MiB 的状态输出，包括大型尾网上的对等列表。如果发现失败，网关会记录一条警告并保留其活动的 Serve/Funnel 声明，但托管门户仍然不可用。检查网关主机上的 `tailscale status --json`，解决报告的错误，然后重新启动网关以发布其主机名。
- Funnel 需要 Tailscale v1.38.3+、MagicDNS、已启用 HTTPS，以及 funnel 节点属性。
- Funnel 仅支持通过 TLS 的端口 `443`、`8443` 和 `10000`。
- macOS 上的 Funnel 需要开源版 Tailscale 应用变体。

## <a id="recover-an-orphaned-foreground-claim"></a> 恢复孤立的前台声明

较旧的网关可能会在强制关闭或 sudo 支持的启动中断后让前台 Tailscale 声明继续运行。更新修复了新声明的清理问题，但不会自动删除所有权未经证实的现有声明。

如果启动报告HTTPS端口被占用，则运行`tailscale serve status --json`。检查 `Foreground` 中报告的会话、主机名、路径和代理目标。在 macOS 或 Linux 上，使用 `ps -axo pid,ppid,args | grep '[t]ailscale'` 检查候选 CLI 进程。在使用 `kill -TERM <confirmed-pid>`（对于根进程则为 `sudo kill -TERM <confirmed-pid>`）停止该路由之前，请确认哪个进程创建了该路由。 Tailscale 状态未报告索赔人 PID。后端侦听器 PID 或孤儿父母本身并不能证明所有权。如果另一个应用程序拥有该声明，请不要理会它，并保持 OpenClaw 托管入口关闭，直到解决冲突。

验证前台会话是否从 `tailscale serve status --json` 消失，然后重新启动网关。 `tailscale serve --https=443 --set-path=/ off` 删除后台 Web 处理程序。它不会释放前台声明。

## <a id="browser-control-(remote-gateway-%2B-local-browser)"></a><a id="browser-control-remote-gateway-+-local-browser"></a> 浏览器控制（远程 Gateway + 本地浏览器）

要在一台计算机上运行网关但在另一台计算机上驱动浏览器，请在浏览器计算机上运行 **node 主机**。将两台机器保持在同一个尾网上。网关将浏览器操作代理到节点。不需要单独的控制服务器或服务 URL。

避免浏览器控制的漏斗。将节点配对视为操作员访问。

## <a id="learn-more"></a> 了解更多

- Tailscale Serve 概览：[https://tailscale.com/kb/1312/serve](https://tailscale.com/kb/1312/serve)
- `tailscale serve` 命令：[https://tailscale.com/kb/1242/tailscale-serve](https://tailscale.com/kb/1242/tailscale-serve)
- Tailscale Funnel 概览：[https://tailscale.com/kb/1223/tailscale-funnel](https://tailscale.com/kb/1223/tailscale-funnel)
- `tailscale funnel` 命令：[https://tailscale.com/kb/1311/tailscale-funnel](https://tailscale.com/kb/1311/tailscale-funnel)

## <a id="related"></a> 相关内容

- [远程访问](/gateway/remote)
- [发现](/gateway/discovery)
- [认证](/gateway/authentication)
