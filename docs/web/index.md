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

功能位于 [控制 UI](/web/control-ui)。本页介绍绑定模式、安全性以及其他面向 Web 的表面。

## 配置（默认开启）

当存在资源文件（`dist/control-ui`）时，控制 UI **默认启用**：

```json5
{
  gateway: {
    controlUi: { enabled: true, basePath: "/openclaw" }, // basePath 可选
  },
}
```

## Webhook

当 `hooks.enabled=true` 时，Gateway 还会在同一个 HTTP 服务器上暴露一个 webhook 端点。有关认证和负载，请参见 [Gateway 配置参考](/gateway/configuration-reference#hooks) 中的 `hooks`。

## 管理 HTTP RPC

`POST /api/v1/admin/rpc` 通过 HTTP 暴露选定的 Gateway 控制平面方法。默认情况下关闭；仅在启用 `admin-http-rpc` 插件时才会注册。有关认证模型、允许的方法以及与 WebSocket API 的比较，请参阅 [管理 HTTP RPC](/plugins/admin-http-rpc)。

## Tailscale 访问

<Tabs>
  <Tab title="集成式 Serve（推荐）">
    保持 Gateway 监听在 loopback 上，并让 Tailscale Serve 代理它：

    ```json5
    {
      gateway: {
        bind: "loopback",
        tailscale: { mode: "serve" },
      },
    }
    ```

    启动 gateway：

    ```bash
    openclaw gateway
    ```

    打开 `https://<magicdns>/`（或你配置的 `gateway.controlUi.basePath`）。

  </Tab>
  <Tab title="公共互联网（Funnel）">
    ```json5
    {
      gateway: {
        bind: "loopback",
        tailscale: { mode: "funnel" },
        auth: { mode: "password" }, // 或 OPENCLAW_GATEWAY_PASSWORD
      },
    }
    ```

    `tailscale.mode: "funnel"` 需要 `gateway.auth.mode: "password"`；Serve 和 Funnel 都要求 `gateway.bind: "loopback"`。

  </Tab>
</Tabs>

## 安全说明

- 默认情况下需要 Gateway 认证：token、password、trusted-proxy，或在启用时使用 Tailscale Serve 身份头。
- 非 loopback 绑定仍然**需要** gateway 认证：token/password 认证，或带有 `gateway.auth.mode: "trusted-proxy"` 的感知身份反向代理。
- 引导向导默认会创建共享密钥认证，通常也会生成一个 gateway token，即使在 loopback 上也是如此。
- 在共享密钥模式下，UI 会在 WebSocket 握手期间发送 `connect.params.auth.token` 或 `connect.params.auth.password`。
- 当 `gateway.tls.enabled: true` 时，本地 dashboard/status 辅助页面会渲染 `https://` URL 和 `wss://` WebSocket URL。
- 在带身份的模式中（Tailscale Serve、`trusted-proxy`），WebSocket 认证检查会通过请求头满足，而不是通过共享密钥。
- 对于公开的非 loopback Control UI 部署，请显式设置 `gateway.controlUi.allowedOrigins`（完整 origin）。对于 loopback、RFC1918/link-local、`.local`、`.ts.net` 和 Tailscale CGNAT 主机，允许无需设置即可进行私有同源加载。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback: true` 启用基于 Host 头的 origin 回退；这是一项危险的安全降级。
- 使用 Serve 时，当 `gateway.auth.allowTailscale: true`，Tailscale 身份头即可满足 Control UI/WebSocket 认证（不需要 token/password）。HTTP API 端点不会使用 Tailscale 身份头；它们始终遵循 gateway 的正常 HTTP 认证模式。将 `gateway.auth.allowTailscale: false` 可强制即使通过 Serve 也必须提供显式凭据。这个无 token 流程假设 gateway 主机本身是可信的。参见 [Tailscale](/gateway/tailscale) 和 [安全](/gateway/security)。

## 构建 UI

Gateway 从 `dist/control-ui` 提供静态文件：

```bash
pnpm ui:build
```
