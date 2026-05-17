---
summary: "网关 Web 界面：控制 UI、绑定模式和安全性"
read_when:
  - 你想通过 Tailscale 访问 Gateway
  - 你想使用浏览器控制 UI 和配置编辑
title: "Web"
---

Gateway 会从与 Gateway WebSocket 相同的端口提供一个小型 **浏览器控制 UI**（Vite + Lit）：

- 默认：`http://<host>:18789/`
- 当 `gateway.tls.enabled: true` 时：`https://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath`（例如 `/openclaw`）

功能详情见 [Control UI](/web/control-ui)。本页其余部分重点介绍绑定模式、安全性和面向 Web 的界面。

## Webhooks

当 `hooks.enabled=true` 时，Gateway 还会在同一个 HTTP 服务器上暴露一个小型 webhook 端点。
有关认证和载荷，请参见 [Gateway 配置](/gateway/configuration) → `hooks`。

## Admin HTTP RPC

Admin HTTP RPC 会在 `POST /api/v1/admin/rpc` 上公开部分 Gateway 控制平面方法。
它默认关闭，并且仅在启用 `admin-http-rpc` 插件时注册。
有关认证模型、允许的方法以及与 WebSocket 的对比，请参见 [Admin HTTP RPC](/plugins/admin-http-rpc)。

## Config (default-on)

当资源文件存在时（`dist/control-ui`），Control UI 会**默认启用**。
你可以通过配置进行控制：

```json5
{
  gateway: {
    controlUi: { enabled: true, basePath: "/openclaw" }, // basePath 可选
  },
}
```

## Tailscale 访问

### 集成 Serve（推荐）

让 Gateway 仅绑定在 loopback 上，并由 Tailscale Serve 代理它：

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" },
  },
}
```

然后启动 gateway：

```bash
openclaw gateway
```

打开：

- `https://<magicdns>/`（或你配置的 `gateway.controlUi.basePath`）

### Tailnet 绑定 + token

```json5
{
  gateway: {
    bind: "tailnet",
    controlUi: { enabled: true },
    auth: { mode: "token", token: "your-token" },
  },
}
```

然后启动 gateway（这个非 loopback 示例使用共享密钥 token
认证）：

```bash
openclaw gateway
```

打开：

- `http://<tailscale-ip>:18789/`（或你配置的 `gateway.controlUi.basePath`）

### 公网（Funnel）

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "funnel" },
    auth: { mode: "password" }, // 或 OPENCLAW_GATEWAY_PASSWORD
  },
}
```

## 安全说明

- 默认情况下需要 Gateway 认证（启用时可使用 token、password、trusted-proxy，或 Tailscale Serve 身份标头）。
- 非 loopback 绑定仍然**需要** gateway 认证。实际上，这意味着需要 token/password 认证，或使用支持身份感知的反向代理并将 `gateway.auth.mode` 设为 `"trusted-proxy"`。
- 向导默认会创建共享密钥认证，并且通常会生成一个 gateway token（即使在 loopback 上也是如此）。
- 在共享密钥模式下，UI 会发送 `connect.params.auth.token` 或 `connect.params.auth.password`。
- 当 `gateway.tls.enabled: true` 时，本地仪表盘和状态辅助工具会渲染
  `https://` 仪表盘 URL 和 `wss://` WebSocket URL。
- 在 Tailscale Serve 或 `trusted-proxy` 等带身份的模式中，WebSocket 认证检查会改为通过请求标头满足。
- 对于面向公网的非 loopback Control UI 部署，请显式设置 `gateway.controlUi.allowedOrigins`
  （完整 origin）。对于 loopback、RFC1918/link-local、`.local`、`.ts.net` 和 Tailscale CGNAT 主机，允许私有同源 LAN/Tailnet 加载。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 会启用
  Host 标头 origin 回退模式，但这是一个危险的安全降级。
- 使用 Serve 时，当 `gateway.auth.allowTailscale` 为 `true`，Tailscale 身份标头可满足 Control UI/WebSocket 认证
  （无需 token/password）。
  HTTP API 端点不会使用这些 Tailscale 身份标头；它们会遵循
  gateway 的正常 HTTP 认证模式。设置
  `gateway.auth.allowTailscale: false` 以要求显式凭据。请参见
  [Tailscale](/gateway/tailscale) 和 [Security](/gateway/security)。此
  无 token 流程假定 gateway 主机是可信的。
- `gateway.tailscale.mode: "funnel"` 需要 `gateway.auth.mode: "password"`（共享密码）。

## 构建 UI

Gateway 会从 `dist/control-ui` 提供静态文件。使用以下命令构建它们：

```bash
pnpm ui:build
```
