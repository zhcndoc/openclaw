---
summary: "为 Gateway 仪表盘集成 Tailscale Serve/Funnel"
read_when:
  - 将 Gateway 控制 UI 暴露到 localhost 之外
  - 自动化 tailnet 或公共仪表盘访问
title: "Tailscale"
---

OpenClaw 可以为 Gateway 仪表盘和 WebSocket 端口自动配置 Tailscale **Serve**（tailnet）或 **Funnel**（public）。这样可以让 gateway 绑定到回环地址，同时由 Tailscale 提供 HTTPS、路由，以及（对于 Serve）身份标头。

## 模式

`gateway.tailscale.mode`:

| 模式            | 行为                                                                      |
| --------------- | ------------------------------------------------------------------------- |
| `serve`         | 仅限 tailnet 的 Serve，通过 `tailscale serve` 提供。网关保持在 `127.0.0.1`。 |
| `funnel`        | 通过 `tailscale funnel` 提供公共 HTTPS。需要共享密码。                    |
| `off` (默认)    | 不进行 Tailscale 自动化。                                                 |

状态和审计输出会针对这种 OpenClaw Serve/Funnel 模式使用 **Tailscale exposure**。`off` 表示 OpenClaw 不管理 Serve 或 Funnel；这并不意味着本地 Tailscale 守护进程已停止或已登出。

## 配置示例

### 仅限 Tailnet（Serve）

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" },
  },
}
```

打开：`https://<magicdns>/`（或你配置的 `gateway.controlUi.basePath`）

要通过命名的 Tailscale Service 而不是设备主机名来暴露 Control UI，请将 `gateway.tailscale.serviceName` 设置为 Service 名称：

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve", serviceName: "svc:openclaw" },
  },
}
```

启动后会报告该 Service URL 为 `https://openclaw.<tailnet-name>.ts.net/`，而不是设备主机名。Tailscale Services 要求主机必须是你 tailnet 中已批准的带标签节点——在启用此功能之前，请先配置标签并在 Tailscale 中批准该 Service，否则 `tailscale serve --service=...` 会在 gateway 启动期间失败。

### 仅限 Tailnet（绑定到 Tailnet IP）

使用此方式可让 gateway 直接监听 Tailnet IP，不使用 Serve/Funnel：

```json5
{
  gateway: {
    bind: "tailnet",
    auth: { mode: "token", token: "your-token" },
  },
}
```

从另一台 Tailnet 设备连接：

- 控制 UI：`http://<tailscale-ip>:18789/`
- WebSocket：`ws://<tailscale-ip>:18789`

<Note>
回环地址（`http://127.0.0.1:18789`）在此模式下将**无法**工作。
</Note>

### 公共互联网（Funnel + 共享密码）

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

## CLI 示例

```bash
openclaw gateway --tailscale serve
openclaw gateway --tailscale funnel --auth password
```

## 身份验证

`gateway.auth.mode` 控制握手方式：

| 模式                                                   | 使用场景                                                                            |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `none`                                                 | 仅限私有入口                                                                |
| `token`（在设置 `OPENCLAW_GATEWAY_TOKEN` 时的默认值） | 共享令牌                                                                        |
| `password`                                             | 通过 `OPENCLAW_GATEWAY_PASSWORD` 或配置使用共享密钥                             |
| `trusted-proxy`                                        | 具备身份感知的反向代理；参见 [受信任代理身份验证](/gateway/trusted-proxy-auth) |

### Tailscale 身份头（仅适用于 Serve）

当 `tailscale.mode: "serve"` 且 `gateway.auth.allowTailscale` 为 `true` 时，Control UI/WebSocket 身份验证可以使用 Tailscale 身份头（`tailscale-user-login`）而不是令牌/密码。OpenClaw 会通过本地 Tailscale 守护进程（`tailscale whois`）解析请求的 `x-forwarded-for` 地址，并在接受请求之前将其与该头中的登录名进行匹配，从而验证该头。只有当请求来自回环地址，并携带 Tailscale 的 `x-forwarded-for`、`x-forwarded-proto` 和 `x-forwarded-host` 头时，才符合此路径的条件。

这种无令牌流程默认主机是受信任的。如果同一主机上可能运行不受信任的本地代码，请改为设置 `gateway.auth.allowTailscale: false`，并要求使用令牌/密码认证。

绕过的适用范围：

- 仅适用于 Control UI 的 WebSocket 身份验证面。HTTP API 端点（`/v1/*`、`/tools/invoke`、`/api/channels/*` 等）从不使用 Tailscale 身份头认证；它们始终遵循网关正常的 HTTP 认证模式。
- 对于已经携带浏览器设备身份的 Control UI 操作员会话，已验证的 Tailscale 身份会跳过 bootstrap-token/QR 配对往返流程。
- 它不会绕过设备身份本身：没有设备的客户端仍会被拒绝，而节点角色连接仍会经过正常的配对和认证检查。

## Notes

- Tailscale Serve/Funnel 需要已安装并登录 `tailscale` CLI。
- `tailscale.mode: "funnel"` 只有在认证模式为 `password` 时才允许启动，以避免公开暴露。
- `gateway.tailscale.serviceName` 仅适用于 Serve 模式，并会传递给 `tailscale serve --service=<name>`。该值必须使用 Tailscale 的 `svc:<dns-label>` 格式，例如 `svc:openclaw`。Tailscale 要求 Service 主机必须是带标签的节点，而且该 Service 可能需要在管理控制台审批后，Serve 才能发布它。
- `gateway.tailscale.resetOnExit` 会在关闭时撤销 `tailscale serve`/`tailscale funnel` 配置。
- `gateway.tailscale.preserveFunnel: true` 会在网关重启期间保持外部配置的 `tailscale funnel` 路由持续生效。使用 `mode: "serve"` 时，OpenClaw 会在重新应用 Serve 之前检查 `tailscale funnel status`，如果已有 Funnel 路由覆盖了网关端口，则会跳过。OpenClaw 管理的仅密码策略的 Funnel 保持不变。
- `gateway.bind: "tailnet"` 是直接绑定到 Tailnet（无 HTTPS、无 Serve/Funnel）。
- `gateway.bind: "auto"` 优先使用回环；仅限 Tailnet 绑定时使用 `tailnet`。
- Serve/Funnel 只暴露 **Gateway 控制 UI + WS**。节点通过同一个 Gateway WS 端点连接，因此 Serve 也适用于节点访问。

### Tailscale prerequisites and limits

- Serve 需要为你的 tailnet 启用 HTTPS；如果缺少该项，CLI 会提示。
- Serve 会注入 Tailscale 身份标头；Funnel 不会。
- Funnel 需要 Tailscale v1.38.3+、MagicDNS、已启用 HTTPS，以及 funnel 节点属性。
- Funnel 仅支持通过 TLS 的端口 `443`、`8443` 和 `10000`。
- macOS 上的 Funnel 需要开源版 Tailscale 应用变体。

## 浏览器控制（远程 Gateway + 本地浏览器）

要在一台机器上运行 Gateway，但在另一台机器上控制浏览器，请在浏览器所在机器上运行一个 **node host**，并确保两者位于同一个 tailnet 中。Gateway 会将浏览器操作代理到该节点；不需要单独的控制服务器或 Serve URL。

请避免将 Funnel 用于浏览器控制；将 node 配对视为操作员访问。

## 了解更多

- Tailscale Serve 概览：[https://tailscale.com/kb/1312/serve](https://tailscale.com/kb/1312/serve)
- `tailscale serve` 命令：[https://tailscale.com/kb/1242/tailscale-serve](https://tailscale.com/kb/1242/tailscale-serve)
- Tailscale Funnel 概览：[https://tailscale.com/kb/1223/tailscale-funnel](https://tailscale.com/kb/1223/tailscale-funnel)
- `tailscale funnel` 命令：[https://tailscale.com/kb/1311/tailscale-funnel](https://tailscale.com/kb/1311/tailscale-funnel)

## 相关内容

- [远程访问](/gateway/remote)
- [发现](/gateway/discovery)
- [认证](/gateway/authentication)
