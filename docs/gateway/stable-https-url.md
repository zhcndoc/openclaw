---
summary: "使用 Tailscale Serve 为仅限回环地址的网关提供稳定的、仅限 tailnet 访问的 HTTPS URL"
read_when:
  - 用一个私有网关 URL 替代每个客户端的 SSH 隧道
  - 将 macOS、iOS 或 Android 客户端连接到远程网关
  - 诊断可在本地正常工作但远程访问超时的 Tailscale Serve URL
title: "为你的网关提供稳定的 HTTPS URL"
---

Tailscale Serve 为你的网关提供一个 HTTPS URL，且不会将网关端口暴露在局域网或公共互联网上。网关继续监听回环地址，而 Tailscale 使用有效证书终止 HTTPS，并将请求代理到网关。

最终结果是 `https://<host>.<tailnet>.ts.net`，可由 tailnet 上获准的设备访问，但无法从公共互联网访问。对应的 WebSocket URL 是 `wss://<host>.<tailnet>.ts.net`。

如果你需要公共 URL，请改用 [Tailscale Funnel](/gateway/tailscale#public-internet-funnel-shared-password)。Funnel 是公开的，OpenClaw 要求为其启用密码身份验证。

## 开始之前

你需要：

- 为你的 tailnet 启用 [MagicDNS](https://tailscale.com/docs/features/magicdns)。
- 在 Tailscale 管理控制台的 **DNS > HTTPS Certificates** 下启用 [HTTPS 证书](https://tailscale.com/docs/how-to/set-up-https-certificates)。
- 在 Gateway 主机上安装并登录 Tailscale。
- Gateway 已配置令牌、密码或 trusted-proxy 身份验证。Serve 不能与 `gateway.auth.mode: "none"` 结合使用。

OpenClaw 会自动定位 Tailscale CLI。它会检查 `PATH` 中的 `tailscale`、位于 `/Applications/Tailscale.app/Contents/MacOS/Tailscale` 的 macOS 应用程序包、`/Applications` 下其他匹配的应用程序安装位置，以及系统 locate 数据库。你无需将 macOS 应用程序包中的二进制文件添加到 `PATH`。

## 1. 在保持回环绑定的同时启用 Serve

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

OpenClaw 配置 Tailscale 在端口 `443` 上提供 HTTPS，并代理到 Gateway 端口，默认为 `18789`。Gateway 本身仍运行在 `127.0.0.1:<port>` 上。

### 可选的身份标头身份验证

要明确允许 Tailscale 身份标头用于 Control UI WebSocket 身份验证：

```bash
openclaw config set gateway.auth.allowTailscale true
```

对于使用令牌身份验证的 Serve，除非将其设置为 `false`，否则 OpenClaw 默认启用此行为。密码和受信任代理模式会保留其明确的身份验证边界，除非选择启用此功能。

此设置允许经过验证的 Tailscale 身份满足 Control UI WebSocket 共享密钥检查。OpenClaw 使用 `tailscale whois` 验证转发的客户端地址，并将其与 `tailscale-user-login` 标头进行匹配。此设置仅在请求通过 Serve 从回环地址到达，并且包含预期的转发标头时生效。

它不会对 HTTP API 端点进行身份验证，不会移除浏览器设备身份要求，不会对节点角色连接进行身份验证，也不会绕过节点配对。完整契约请参阅 [Tailscale 身份标头](/gateway/tailscale#tailscale-identity-headers-serve-only)。

## 2. 在 tailnet 策略中允许 HTTPS

Tailscale 访问控制适用于 Serve。如果您的 tailnet 使用了限制性策略，请允许客户端设备通过 TCP 端口 `443` 访问 Gateway 主机。

如果没有此授权，Serve URL 可能在 Gateway 主机上正常工作，但从其他任何设备访问时都会静默超时。这种现象看起来像是 Gateway 损坏，实际上是 tailnet 策略阻止了连接。

请使用与您的 tailnet 策略文件相匹配的格式。

### 现代 grants 策略

将此对象添加到现有的 `grants` 数组中：

```json
{
  "src": ["autogroup:member"],
  "dst": ["<gateway-host-or-ip>"],
  "ip": ["tcp:443"]
}
```

例如，将 `<gateway-host-or-ip>` 替换为策略中定义的主机别名，例如 `gateway-host`，或者替换为类似 `100.x.y.z` 的地址。

### 较旧的 ACL 策略

将此对象添加到现有的 `acls` 数组中：

```json
{
  "action": "accept",
  "src": ["autogroup:member"],
  "dst": ["<gateway-host-or-ip>:443"]
}
```

`autogroup:member` 允许每个经过身份验证的 tailnet 成员访问。若需要更严格的策略，请将其替换为更具体的用户、组、标签或设备选择器，仅涵盖需要访问 Gateway 的客户端。请参阅 Tailscale 关于 [grants](https://tailscale.com/docs/features/access-control/grants) 和 [ACL](https://tailscale.com/docs/features/access-control/acls) 的文档。

## 3. 验证路由和回环边界

在 Gateway 主机上，确认 Serve 处于活动状态：

```bash
tailscale serve status
```

输出应显示一个针对 `https://<host>.<tailnet>.ts.net` 的 HTTPS 路由，并将其代理到 Gateway 端口。

从同一 tailnet 上的另一台设备检查 HTTPS 响应：

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://<host>.<tailnet>.ts.net/
```

Control UI 根路径应返回 `200`。如果此请求超时，但在 Gateway 主机上执行相同命令返回 `200`，请先检查上一步中的 TCP `443` 授权。

最后，确认 Gateway 进程没有自行将端口开放到网络：

```bash
lsof -nP -iTCP:<port> -sTCP:LISTEN
```

对于默认端口，将 `<port>` 替换为 `18789`。Gateway 监听器应位于 `127.0.0.1:<port>`，而不是 `0.0.0.0:<port>` 或局域网、tailnet 地址。HTTPS 监听器和代理路径由 Tailscale 管理。

## 4. 使用来自客户端的 URL

### macOS 应用

在 OpenClaw macOS 应用中：

1. 打开 **设置 > 连接**。
2. 将 **OpenClaw 运行方式**设置为**远程（另一台主机）**。
3. 将 **传输方式**设置为**直连（ws/wss）**。
4. 在 **网关 URL** 中输入 `wss://<host>.<tailnet>.ts.net`。
5. 选择 **测试远程连接**。

现在，应用会通过 Tailscale Serve 直接连接，因此不再需要为每个客户端建立 SSH 隧道。

### iOS 和 Android 配套应用

iOS 和 Android 应用会直接连接到网关 WebSocket，不会管理 SSH 隧道传输。在配对或生成设置代码时，使用相同的 `wss://<host>.<tailnet>.ts.net` 端点。这为移动客户端提供了一条安全路径，使其可以从 tailnet 上的任何位置使用。

有关配对步骤，请参阅 [iOS 应用设置](/platforms/ios) 和 [Android 连接设置](/platforms/android#connection-runbook)。

## 可选的稳定自定义名称

要使用 Tailscale Service 名称，而不是 Gateway 设备主机名：

```bash
openclaw config set gateway.tailscale.serviceName svc:openclaw
openclaw gateway restart
```

这会发布 `https://openclaw.<tailnet>.ts.net`。Gateway 主机必须是已批准的带标签节点，并且 Service 可能需要在管理控制台中获得批准后，Serve 才能发布它。有关完整的设置限制，请参阅 [Tailscale Services](/gateway/tailscale#tailnet-only-serve)。

## 故障排除

### 从其他设备访问时 URL 超时

在 Gateway 主机上运行相同的 `curl` 命令。如果主机返回 `200`，而其他 tailnet 设备超时，请添加或收紧针对 TCP `443` 的 tailnet policy grant。

### 未颁发证书或首次请求速度较慢

确认已在 Tailscale 管理控制台中启用 MagicDNS 和 HTTPS 证书。首次颁发证书可能会导致第一次 HTTPS 请求耗时更长；等待其完成后重试。

### `serve` 命令不可用

更新 Tailscale，并确认已安装的客户端版本提供当前的 `tailscale serve` 命令。Serve CLI 在 Tailscale 1.52 中发生了变化。请参阅 [Tailscale Serve 命令参考](https://tailscale.com/docs/reference/tailscale-cli/serve)。

### 不接受 Tailscale 身份标头

确认 `gateway.auth.allowTailscale` 为 `true`，并且请求是通过 Serve URL 到达的。直接通过回环地址、局域网、原始 tailnet IP 以及自定义反向代理发出的请求，不符合 Tailscale 身份标头身份验证的条件。

## 相关

- [Tailscale 参考](/gateway/tailscale)
- [远程访问](/gateway/remote)
- [网关身份验证](/gateway/authentication)
