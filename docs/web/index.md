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

## 配置（默认开启）

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

- 默认需要 Gateway 认证（token、password、trusted-proxy，或在启用时使用 Tailscale Serve 身份头）。
- 非 loopback 绑定仍然**需要** Gateway 认证。实际上，这意味着 token/password 认证，或使用带有 `gateway.auth.mode: "trusted-proxy"` 的、感知身份的反向代理。
- 向导默认会创建共享密钥认证，并且通常会生成一个 gateway token（即使在 loopback 上也是如此）。
- 在共享密钥模式下，UI 会发送 `connect.params.auth.token` 或 `connect.params.auth.password`。
- 当 `gateway.tls.enabled: true` 时，本地仪表盘和状态辅助功能会渲染
  `https://` 仪表盘 URL 和 `wss://` WebSocket URL。
- 在如 Tailscale Serve 或 `trusted-proxy` 这类带身份信息的模式中，
  WebSocket 认证检查会改为从请求头中满足。
- 对于非 loopback 的 Control UI 部署，请显式设置 `gateway.controlUi.allowedOrigins`
  （完整来源）。如果不设置，默认会拒绝启动 gateway。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 会启用
  Host-header origin 回退模式，但这是一个危险的安全降级。
- 使用 Serve 时，当 `gateway.auth.allowTailscale` 为 `true` 时，Tailscale 身份头可以满足 Control UI/WebSocket 认证
  （无需 token/password）。
  HTTP API 端点不会使用这些 Tailscale 身份头；它们会遵循
  gateway 的常规 HTTP 认证模式。将
  `gateway.auth.allowTailscale: false` 设为需要显式凭据。参见
  [Tailscale](/gateway/tailscale) 和 [Security](/gateway/security)。这种
  无 token 流程假设 gateway 主机是可信的。
- `gateway.tailscale.mode: "funnel"` 需要 `gateway.auth.mode: "password"`（共享密码）。

## 构建 UI

Gateway 会从 `dist/control-ui` 提供静态文件。使用以下命令构建它们：

```bash
pnpm ui:build
```
