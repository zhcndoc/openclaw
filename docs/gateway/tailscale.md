---
summary: "为 Gateway 仪表盘集成 Tailscale Serve/Funnel"
read_when:
  - 将 Gateway 控制界面暴露到本地主机之外
  - 自动化 tailnet 或公共仪表盘访问
title: "Tailscale"
---

# Tailscale（Gateway 仪表盘）

OpenClaw 可以自动配置 Tailscale **Serve**（tailnet）或 **Funnel**（公共）来访问 Gateway 仪表盘和 WebSocket 端口。这使 Gateway 保持绑定在环回地址，同时由 Tailscale 提供 HTTPS、路由和（对于 Serve）身份标头。

## 模式

- `serve`：仅通过 `tailscale serve` 提供 tailnet 服务。Gateway 保持在 `127.0.0.1` 上。
- `funnel`：通过 `tailscale funnel` 提供公共 HTTPS。OpenClaw 需要共享密码。
- `off`：默认（不自动化 Tailscale）。

## 认证

设置 `gateway.auth.mode` 来控制握手方式：

- `token`（当设置 `OPENCLAW_GATEWAY_TOKEN` 时为默认）
- `password`（通过 `OPENCLAW_GATEWAY_PASSWORD` 或配置文件共享的密钥）

当 `tailscale.mode = "serve"` 且 `gateway.auth.allowTailscale` 为 `true` 时，
控制界面/WebSocket 认证可以使用 Tailscale 身份标头（`tailscale-user-login`）而无需提供 token/密码。
OpenClaw 通过调用本地 Tailscale 守护进程（`tailscale whois`）解析 `x-forwarded-for` 地址，并将结果与标头匹配来验证身份后才接受请求。
OpenClaw 仅当请求来自环回地址并带有 Tailscale 的 `x-forwarded-for`、`x-forwarded-proto` 和 `x-forwarded-host` 标头时，才视为 Serve 请求。
HTTP API 端点（例如 `/v1/*`、`/tools/invoke` 和 `/api/channels/*`）仍需要 token/密码认证。
此无 token 流程假设网关主机是可信的。如果本地主机可能运行不受信任的代码，请禁用 `gateway.auth.allowTailscale` 并改为要求 token/密码认证。
若要强制使用明确凭据，请设置 `gateway.auth.allowTailscale: false` 或强制 `gateway.auth.mode: "password"`。

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

当你希望 Gateway 直接监听 Tailnet IP（无 Serve/Funnel）时使用：

```json5
{
  gateway: {
    bind: "tailnet",
    auth: { mode: "token", token: "your-token" },
  },
}
```

从另一个 Tailnet 设备连接：

- 控制界面：`http://<tailscale-ip>:18789/`
- WebSocket：`ws://<tailscale-ip>:18789`

注意：此模式下环回地址（`http://127.0.0.1:18789`）**不**可用。

### 公网访问（Funnel + 共享密码）

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "funnel" },
    auth: { mode: "password", password: "replace-me" },
  },
}
```

优先使用 `OPENCLAW_GATEWAY_PASSWORD`，避免将密码写入磁盘。

## 命令行示例

```bash
openclaw gateway --tailscale serve
openclaw gateway --tailscale funnel --auth password
```

## 备注

- Tailscale Serve/Funnel 需要已安装并登录的 `tailscale` CLI。
- `tailscale.mode: "funnel"` 除非认证模式为 `password`，否则拒绝启动以避免公网暴露。
- 若希望 OpenClaw 在关闭时撤销 `tailscale serve` 或 `tailscale funnel` 配置，请设置 `gateway.tailscale.resetOnExit`。
- `gateway.bind: "tailnet"` 是直接绑定 Tailnet（无 HTTPS，无 Serve/Funnel）。
- `gateway.bind: "auto"` 优先使用环回地址；如果只需 Tailnet，请使用 `tailnet`。
- Serve/Funnel 仅暴露 **Gateway 控制界面 + WS**，节点通过相同 Gateway WS 端点连接，所以 Serve 也可用于节点访问。

## 浏览器控制（远程 Gateway + 本地浏览器）

如果 Gateway 运行在一台机器上，但想操作另一台机器上的浏览器，需在浏览器机器上运行一个 **节点主机**，并保持双方在同一个 tailnet。
Gateway 会代理浏览器操作到节点，无需单独的控制服务器或 Serve URL。

浏览器控制时避免使用 Funnel，将节点配对视为操作者访问。

## Tailscale 前提与限制

- Serve 需要为你的 tailnet 启用 HTTPS；CLI 会在缺失时提示。
- Serve 会注入 Tailscale 身份标头；Funnel 不会。
- Funnel 需要 Tailscale v1.38.3+、MagicDNS、启用 HTTPS 和 funnel 节点属性。
- Funnel 仅支持端口 `443`、`8443` 和 `10000` 的 TLS 配置。
- macOS 上的 Funnel 需要开源版本的 Tailscale 应用。

## 了解更多

- Tailscale Serve 概览：[https://tailscale.com/kb/1312/serve](https://tailscale.com/kb/1312/serve)
- `tailscale serve` 命令说明：[https://tailscale.com/kb/1242/tailscale-serve](https://tailscale.com/kb/1242/tailscale-serve)
- Tailscale Funnel 概览：[https://tailscale.com/kb/1223/tailscale-funnel](https://tailscale.com/kb/1223/tailscale-funnel)
- `tailscale funnel` 命令说明：[https://tailscale.com/kb/1311/tailscale-funnel](https://tailscale.com/kb/1311/tailscale-funnel)
