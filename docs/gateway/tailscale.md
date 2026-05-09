---
summary: "为 Gateway 仪表盘集成 Tailscale Serve/Funnel"
read_when:
  - 将 Gateway 控制 UI 暴露到 localhost 之外
  - 自动化 tailnet 或公共仪表盘访问
title: "Tailscale"
---

OpenClaw 可以为 Gateway 仪表盘和 WebSocket 端口自动配置 Tailscale **Serve**（tailnet）或 **Funnel**（public）。这样可以让 Gateway 继续绑定到回环地址，同时由 Tailscale 提供 HTTPS、路由，以及（对于 Serve）身份标头。

## 模式

- `serve`：通过 `tailscale serve` 提供仅限 Tailnet 的 Serve。Gateway 保持在 `127.0.0.1`。
- `funnel`：通过 `tailscale funnel` 提供公共 HTTPS。OpenClaw 需要共享密码。
- `off`：默认值（不进行 Tailscale 自动化）。

状态和审计输出会对这个 OpenClaw Serve/Funnel 模式使用 **Tailscale 暴露**。`off` 表示 OpenClaw 不管理 Serve 或 Funnel；这并不表示本地 Tailscale 守护进程已停止或注销。

## 认证

设置 `gateway.auth.mode` 来控制握手：

- `none`（仅限私有入口）
- `token`（当设置了 `OPENCLAW_GATEWAY_TOKEN` 时的默认值）
- `password`（通过 `OPENCLAW_GATEWAY_PASSWORD` 或配置提供共享密钥）
- `trusted-proxy`（支持身份感知的反向代理；见 [Trusted Proxy Auth](/gateway/trusted-proxy-auth)）

当 `tailscale.mode = "serve"` 且 `gateway.auth.allowTailscale` 为 `true` 时，
Control UI/WebSocket 认证可以使用 Tailscale 身份标头
（`tailscale-user-login`），而无需提供 token/password。OpenClaw 会通过本地 Tailscale
守护进程（`tailscale whois`）解析 `x-forwarded-for` 地址并将其与标头匹配后才接受该身份。
OpenClaw 仅在请求从回环地址发出且携带 Tailscale 的 `x-forwarded-for`、
`x-forwarded-proto` 和 `x-forwarded-host`
标头时，才会将其视为 Serve。
对于包含浏览器设备身份的 Control UI 操作员会话，此经过验证的 Serve 路径
也会跳过设备配对往返流程。它不会绕过浏览器设备身份：没有设备的客户端仍会被拒绝，
而节点角色或非 Control UI WebSocket 连接仍会遵循正常的配对和
认证检查。
HTTP API 端点（例如 `/v1/*`、`/tools/invoke` 和 `/api/channels/*`）
**不**使用 Tailscale 身份标头认证。它们仍遵循 gateway 的
常规 HTTP 认证模式：默认使用共享密钥认证，或者显式配置的
trusted-proxy / private-ingress `none` 方案。
这种无需 token 的流程假定 gateway 主机是可信的。如果不可信的本地代码
可能在同一主机上运行，请禁用 `gateway.auth.allowTailscale` 并改为
要求 token/password 认证。
若要强制使用显式共享密钥凭据，请设置 `gateway.auth.allowTailscale: false`
并使用 `gateway.auth.mode: "token"` 或 `"password"`。

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

### 仅限 Tailnet（绑定到 Tailnet IP）

当你希望 Gateway 直接监听 Tailnet IP（不使用 Serve/Funnel）时，请使用此配置。

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

## 注意事项

- Tailscale Serve/Funnel 需要安装并登录 `tailscale` CLI。
- `tailscale.mode: "funnel"` 只有在认证模式为 `password` 时才会启动，否则会拒绝启动，以避免公开暴露。
- 如果你希望 OpenClaw 在关闭时撤销 `tailscale serve`
  或 `tailscale funnel` 配置，请设置 `gateway.tailscale.resetOnExit`。
- 设置 `gateway.tailscale.preserveFunnel: true`，以便在 gateway 重启期间保持外部配置的
  `tailscale funnel` 路由持续可用。启用后，当
  gateway 运行在 `mode: "serve"` 时，OpenClaw 会在重新应用 Serve 之前检查
  `tailscale funnel status`，并在 Funnel 路由已经覆盖 gateway 端口时跳过它。
  OpenClaw 管理的仅密码 Funnel 策略保持不变。
- `gateway.bind: "tailnet"` 是直接绑定到 Tailnet（不提供 HTTPS，也不使用 Serve/Funnel）。
- `gateway.bind: "auto"` 优先使用回环地址；如果你希望仅使用 Tailnet，请改用 `tailnet`。
- Serve/Funnel 只暴露 **Gateway 控制 UI + WS**。节点通过
  相同的 Gateway WS 端点连接，因此 Serve 可用于节点访问。

## 浏览器控制（远程 Gateway + 本地浏览器）

如果你在一台机器上运行 Gateway，但希望在另一台机器上驱动浏览器，
请在浏览器所在机器上运行一个 **node host**，并让两者保持在同一个 tailnet 中。
Gateway 将把浏览器操作代理到该节点；不需要单独的控制服务器或 Serve URL。

请避免将 Funnel 用于浏览器控制；将节点配对视为操作员访问。

## Tailscale 前置条件 + 限制

- Serve 需要为你的 tailnet 启用 HTTPS；如果缺少该项，CLI 会提示。
- Serve 会注入 Tailscale 身份标头；Funnel 不会。
- Funnel 需要 Tailscale v1.38.3+、MagicDNS、已启用 HTTPS，以及 funnel 节点属性。
- Funnel 仅支持通过 TLS 的端口 `443`、`8443` 和 `10000`。
- macOS 上的 Funnel 需要开源版 Tailscale 应用变体。

## 了解更多

- Tailscale Serve 概览：[https://tailscale.com/kb/1312/serve](https://tailscale.com/kb/1312/serve)
- `tailscale serve` 命令：[https://tailscale.com/kb/1242/tailscale-serve](https://tailscale.com/kb/1242/tailscale-serve)
- Tailscale Funnel 概览：[https://tailscale.com/kb/1223/tailscale-funnel](https://tailscale.com/kb/1223/tailscale-funnel)
- `tailscale funnel` 命令：[https://tailscale.com/kb/1311/tailscale-funnel](https://tailscale.com/kb/1311/tailscale-funnel)

## 相关内容

- [远程访问](/gateway/remote)
- [发现](/gateway/discovery)
- [认证](/gateway/authentication)
