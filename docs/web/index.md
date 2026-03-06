---
summary: "网关网页界面：控制界面、绑定模式及安全性"
read_when:
  - 您希望通过 Tailscale 访问网关
  - 您希望使用浏览器控制界面并进行配置编辑
title: "网页"
---

# 网页（网关）

网关通过与网关 WebSocket 相同的端口提供一个小型的 **浏览器控制界面**（Vite + Lit）：

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

然后启动网关（非回环地址绑定需要令牌）：

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

- 网关默认需要认证（令牌/密码或 Tailscale 身份头）。
- 非回环绑定仍然 **必须** 使用共享令牌/密码（`gateway.auth` 或环境变量）。
- 向导默认生成一个网关令牌（即使是回环地址）。
- UI 发送 `connect.params.auth.token` 或 `connect.params.auth.password`。
- 对于非回环的控制界面部署，须显式设置 `gateway.controlUi.allowedOrigins`（完整源）。
  否则默认拒绝网关启动。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 启用基于 Host 头的来源回退模式，但这是一种危险的安全降级。
- 使用 Serve 模式时，当 `gateway.auth.allowTailscale` 为 `true` 时，
  Tailscale 身份头可满足控制界面/WebSocket 的认证（无需令牌/密码）。
  HTTP API 端点依然需要令牌/密码。
  通过设定 `gateway.auth.allowTailscale: false` 可要求显式凭证。
  详见 [Tailscale](/gateway/tailscale) 和 [安全](/gateway/security)。
  此无令牌流程假设网关主机是可信的。
- `gateway.tailscale.mode: "funnel"` 需要 `gateway.auth.mode: "password"`（共享密码）。

## 构建界面

网关从 `dist/control-ui` 提供静态文件。使用以下命令构建：

```bash
pnpm ui:build # 首次运行会自动安装 UI 依赖
```
