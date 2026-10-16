---
summary: "为仅环回网关提供稳定的仅尾网 HTTPS URL 和 Tailscale 服务"
read_when:
  - "用一个私有网关 URL 替代每个客户端的 SSH 隧道"
  - "将 macOS、iOS 或 Android 客户端连接到远程网关"
  - "诊断可在本地正常工作但远程访问超时的 Tailscale Serve URL"
title: "为你的网关提供稳定的 HTTPS URL"
---

Tailscale Serve 为您的网关提供一个 HTTPS URL，而不会暴露 LAN 或公共互联网上的网关端口。网关持续侦听环回，而 Tailscale 使用有效证书终止 HTTPS 并代理对其的请求。

最终结果是 `https://<host>.<tailnet>.ts.net`，可由 tailnet 上获准的设备访问，但无法从公共互联网访问。对应的 WebSocket URL 是 `wss://<host>.<tailnet>.ts.net`。

如果您需要公共 URL，请改用 [Tailscale Funnel](/gateway/tailscale#public-internet-funnel-%2B-shared-password)。漏斗是公开的，OpenClaw 需要密码验证。

## <a id="before-you-begin"></a> 开始之前

你需要：

- 为你的 tailnet 启用 [MagicDNS](https://tailscale.com/docs/features/magicdns)。
- 在 Tailscale 管理控制台的 **DNS > HTTPS Certificates** 下启用 [HTTPS 证书](https://tailscale.com/docs/how-to/set-up-https-certificates)。
- 在 Gateway 主机上安装并登录 Tailscale。
- Gateway 已配置令牌、密码或 trusted-proxy 身份验证。Serve 不能与 `gateway.auth.mode: "none"` 结合使用。

OpenClaw 自动定位Tailscale CLI。它检查 `PATH` 上的 `tailscale`、`/Applications/Tailscale.app/Contents/MacOS/Tailscale` 上的 macOS 应用程序包、`/Applications` 下的其他匹配应用程序安装以及系统定位数据库。您不需要将 macOS 应用程序包二进制文件添加到 `PATH`。

## <a id="1.-enable-serve-while-keeping-loopback-bind"></a><a id="1-enable-serve-while-keeping-loopback-bind"></a> 1. 在保持回环绑定的同时启用 Serve

在 Gateway 主机上运行以下命令：

```bash
openclaw config set gateway.bind loopback
openclaw config set gateway.tailscale.mode serve
openclaw gateway restart
```

等效配置如下：

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: {
      mode: "serve",
    },
  },
}
```

OpenClaw 将 Tailscale 配置为在端口 `443` 上为 HTTPS 提供服务，并代理到网关拥有的私有临时环回侦听器。对于直接本地客户端，普通网关侦听器默认保留在 `127.0.0.1:18789` 上。

### <a id="optional-identity-header-auth"></a> 可选的身份标头身份验证

要明确允许 Tailscale 身份标头用于 Control UI WebSocket 身份验证：

```bash
openclaw config set gateway.auth.allowTailscale true
```

对于使用令牌身份验证的 Serve，除非将其设置为 `false`，否则 OpenClaw 默认启用此行为。密码和受信任代理模式会保留其明确的身份验证边界，除非选择启用此功能。

此设置使经过验证的 Tailscale 身份满足 Control UI WebSocket 共享秘密检查。 OpenClaw 使用 `tailscale whois` 验证转发的客户端地址，并将其与 `tailscale-user-login` 标头进行匹配。仅当请求通过 OpenClaw 的专用托管 Tailscale 侦听器上的 Serve 到达且具有预期的转发标头时，它才适用。

它不会对 HTTP API 端点进行身份验证，不会移除浏览器设备身份要求，不会对节点角色连接进行身份验证，也不会绕过节点配对。完整契约请参阅 [Tailscale 身份标头](/gateway/tailscale#tailscale-identity-headers-serve-only)。

## <a id="2.-allow-https-in-your-tailnet-policy"></a><a id="2-allow-https-in-your-tailnet-policy"></a> 2. 在 tailnet 策略中允许 HTTPS

Tailscale 访问控制适用于 Serve。如果您的 tailnet 使用了限制性策略，请允许客户端设备通过 TCP 端口 `443` 访问 Gateway 主机。

如果没有此授权，Serve URL 可能在 Gateway 主机上正常工作，但从其他任何设备访问时都会静默超时。这种现象看起来像是 Gateway 损坏，实际上是 tailnet 策略阻止了连接。

请使用与您的 tailnet 策略文件相匹配的格式。

### <a id="modern-grants-policy"></a> 现代 grants 策略

将此对象添加到现有的 `grants` 数组中：

```json
{
  "src": ["autogroup:member"],
  "dst": ["<gateway-host-or-ip>"],
  "ip": ["tcp:443"]
}
```

例如，将 `<gateway-host-or-ip>` 替换为策略中定义的主机别名，例如 `gateway-host`，或者替换为类似 `100.x.y.z` 的地址。

### <a id="older-acl-policy"></a> 较旧的 ACL 策略

将此对象添加到现有的 `acls` 数组中：

```json
{
  "action": "accept",
  "src": ["autogroup:member"],
  "dst": ["<gateway-host-or-ip>:443"]
}
```

`autogroup:member` 允许每个经过身份验证的尾网成员。对于更严格的策略，请将其替换为更窄的用户、组、标签或设备选择器，仅涵盖需要网关访问的客户端。请参阅 [grants](https://tailscale.com/docs/features/access-control/grants) 和 [ACLs](https://tailscale.com/docs/features/access-control/acls) 的 Tailscale 文档。

## <a id="3.-verify-the-route-and-loopback-boundary"></a><a id="3-verify-the-route-and-loopback-boundary"></a> 3. 验证路由和回环边界

在 Gateway 主机上，确认 Serve 处于活动状态：

```bash
tailscale serve status
```

输出应显示 `https://<host>.<tailnet>.ts.net` 代理到网关拥有的私有临时环回端口的 HTTPS 路由。

从同一 tailnet 上的另一台设备检查 HTTPS 响应：

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://<host>.<tailnet>.ts.net/
```

Control UI 根路径应返回 `200`。如果此请求超时，但在 Gateway 主机上执行相同命令返回 `200`，请先检查上一步中的 TCP `443` 授权。

最后，确认 Gateway 进程没有自行将端口开放到网络：

```bash
lsof -nP -iTCP:<port> -sTCP:LISTEN
```

对于默认端口，将 `<port>` 替换为 `18789`。网关侦听器应位于 `127.0.0.1:<port>`，而不是 `0.0.0.0:<port>` 或 LAN 或 tailnet 地址。 Tailscale 拥有 HTTPS 侦听器和代理路径。

## <a id="4.-use-the-url-from-clients"></a><a id="4-use-the-url-from-clients"></a> 4. 使用来自客户端的 URL

### <a id="macos-app"></a> macOS 应用

在 OpenClaw macOS 应用中：

1. 打开 **设置 > 连接**。
2. 将 **OpenClaw 运行方式**设置为**远程（另一台主机）**。
3. 将 **传输方式**设置为**直连（ws/wss）**。
4. 在 **网关 URL** 中输入 `wss://<host>.<tailnet>.ts.net`。
5. 选择 **测试远程连接**。

现在，应用会通过 Tailscale Serve 直接连接，因此不再需要为每个客户端建立 SSH 隧道。

### <a id="ios-and-android-companion-apps"></a> iOS 和 Android 配套应用

iOS 和 Android 应用程序直接连接到网关 WebSocket，并且不管理 SSH-tunnel 传输。配对或生成设置代码时使用相同的 `wss://<host>.<tailnet>.ts.net` 端点。这为移动客户端提供了一条可以从尾网上任何地方使用的安全路由。

有关配对步骤，请参阅 [iOS 应用设置](/platforms/ios) 和 [Android 连接设置](/platforms/android#connection-runbook)。

## <a id="troubleshooting"></a> 故障排查

### <a id="the-url-times-out-from-other-devices"></a> 从其他设备访问时 URL 超时

在 Gateway 主机上运行相同的 `curl` 命令。如果主机返回 `200`，而其他 tailnet 设备超时，请添加或收紧针对 TCP `443` 的 tailnet policy grant。

### <a id="the-certificate-is-not-issued-or-the-first-request-is-slow"></a> 未颁发证书或首次请求速度较慢

确认 MagicDNS 和 HTTPS 证书已在 Tailscale 管理控制台中启用。初始证书颁发可能会使第一个 HTTPS 请求花费更长的时间；让它完成，然后重试。

### <a id="the-serve-command-is-unavailable"></a> 服务命令不可用

更新 Tailscale 并确认您安装的客户端版本公开了当前的 `tailscale serve` 命令。服务 CLI 更改为 Tailscale 1.52. 请参阅 [Tailscale 服务命令参考 ](https://tailscale.com/docs/reference/tailscale-cli/serve)。

### <a id="tailscale-identity-headers-are-not-accepted"></a> 不接受 Tailscale 身份标头

确认 `gateway.auth.allowTailscale` 是 `true` 并且请求通过服务 URL 到达。直接环回、LAN、原始 tailnet-IP 和自定义反向代理请求不符合 Tailscale 身份标头身份验证。

## <a id="related"></a> 相关内容

- [Tailscale 参考](/gateway/tailscale)
- [远程访问](/gateway/remote)
- [网关身份验证](/gateway/authentication)
