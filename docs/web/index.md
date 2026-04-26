---
summary: "网关网页界面：控制界面、绑定模式及安全性"
read_when:
  - 您希望通过 Tailscale 访问网关
  - 您希望使用浏览器控制界面并进行配置编辑
title: "网页"
---

Gateway 会从与 Gateway WebSocket 相同的端口提供一个小型 **浏览器控制界面**（Vite + Lit）：

- 默认地址：`http://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath`（例如 `/openclaw`）

功能位于 [控制界面](/web/control-ui)。
本页侧重于绑定模式、安全性及面向网页的接口。

## Webhooks（网络钩子）

当设置 `hooks.enabled=true` 时，网关在同一 HTTP 服务器上还会暴露一个小型 webhook 端点。
详见 [网关配置](/gateway/configuration) → `hooks` 中的认证及有效载荷说明。

## 配置（默认开启）

当存在资源文件（`dist/control-ui`）时，控制界面默认 **已启用**。
您可以通过配置控制它：

```json5
{
  gateway: {
    controlUi: { enabled: true, basePath: "/openclaw" }, // basePath 可选
  },
}
```

## Tailscale 访问

### 集成 Serve（推荐）

保持网关绑定在本机回环地址，并由 Tailscale Serve 代理：

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" },
  },
}
```

然后启动网关：

```bash
openclaw gateway
```

打开：

- `https://<magicdns>/`（或您配置的 `gateway.controlUi.basePath`）

### Tailnet 绑定 + 令牌

```json5
{
  gateway: {
    bind: "tailnet",
    controlUi: { enabled: true },
    auth: { mode: "token", token: "your-token" },
  },
}
```

然后启动网关（此非回环示例使用共享密钥 token 认证）：

```bash
openclaw gateway
```

打开：

- `http://<tailscale-ip>:18789/`（或您配置的 `gateway.controlUi.basePath`）

### 公网访问（Funnel）

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "funnel" },
    auth: { mode: "password" }, // 或使用环境变量 OPENCLAW_GATEWAY_PASSWORD
  },
}
```

## 安全注意事项

- 默认需要 Gateway 认证（token、password、trusted-proxy，或启用时的 Tailscale Serve 身份标头）。
- 非回环绑定仍然 **需要** 网关认证。实际含义是 token/password 认证，或带有身份感知的反向代理并将 `gateway.auth.mode: "trusted-proxy"` 配置起来。
- 向导默认创建共享密钥认证，并通常会生成一个
  网关令牌（即使在回环情况下也是如此）。
- 在共享密钥模式中，UI 会发送 `connect.params.auth.token` 或
  `connect.params.auth.password`。
- 在包含身份的模式（如 Tailscale Serve 或 `trusted-proxy`）中，WebSocket 认证校验会从请求标头中完成。
- 对于非回环 Control UI 部署，请显式设置 `gateway.controlUi.allowedOrigins`（完整 origins）。
  如果未设置，网关启动将默认被拒绝。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 启用 Host-header origin 回退模式，但这是一个危险的安全降级。
- 使用 Serve 时，当 `gateway.auth.allowTailscale` 为 `true` 时，Tailscale 身份标头可满足 Control UI/WebSocket 认证（无需 token/password）。
  HTTP API 端点不会使用这些 Tailscale 身份标头；它们会遵循网关的正常 HTTP 认证模式。
  将 `gateway.auth.allowTailscale: false` 以要求显式凭据。
  参见 [Tailscale](/gateway/tailscale) 与 [Security](/gateway/security)。
  此无令牌流程假设网关主机是可信的。
- `gateway.tailscale.mode: "funnel"` 需要 `gateway.auth.mode: "password"`（共享密码）。

## 构建界面

网关从 `dist/control-ui` 提供静态文件。使用以下命令构建：

```bash
pnpm ui:build
```
