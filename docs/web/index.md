---
summary: "网关 Web 表面：Control UI、绑定模式和安全性"
read_when:
  - "你想通过 Tailscale 访问 Gateway"
  - "您需要浏览器 Control UI 和配置编辑"
title: "网络"
---

网关从与网关 WebSocket 相同的端口为小型 **浏览器 Control UI** （Vite + Lit） 提供服务：

- 默认：`http://<host>:18789/`
- 当 `gateway.tls.enabled: true` 时：`https://<host>:18789/`
- 可选前缀：设置`gateway.controlUi.basePath` （e.g. `/openclaw`）

功能位于 [控制 UI](/web/control-ui)。本页介绍绑定模式、安全性以及其他面向 Web 的表面。

## <a id="config-(default-on)"></a><a id="config-default-on"></a> 配置（默认开启）

Control UI 是 **，当资产存在时，默认启用** （`dist/control-ui`）：

```json5
{
  gateway: {
    controlUi: { enabled: true, basePath: "/openclaw" }, // basePath optional
  },
}
```

## Webhooks

当 `hooks.enabled=true` 时，网关还会在同一 HTTP 服务器上公开 Webhook 端点。有关身份验证和有效负载，请参阅 [ 网关配置参考 ](/gateway/config-hooks#hooks) 中的 `hooks`。

## <a id="admin-http-rpc"></a> 管理 HTTP RPC

`POST /api/v1/admin/rpc` 通过 HTTP 公开选定的网关控制平面方法。默认关闭；仅当启用 `admin-http-rpc` 插件时才注册。有关身份验证模型、允许的方法以及与 WebSocket API 的比较，请参阅 [Admin HTTP RPC](/plugins/admin-http-rpc)。

## <a id="tailscale-access"></a> Tailscale 访问

<Tabs>
  <Tab id="integrated-serve-recommended" title="综合服务（推荐）">
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
  <Tab id="public-internet-funnel" title="公共互联网（漏斗）">
    ```json5
    {
      gateway: {
        bind: "loopback",
        tailscale: { mode: "funnel" },
        auth: { mode: "password" }, // or OPENCLAW_GATEWAY_PASSWORD
      },
    }
    ```

    `tailscale.mode: "funnel"` 需要 `gateway.auth.mode: "password"`；Serve 和 Funnel 都要求 `gateway.bind: "loopback"`。

  </Tab>
</Tabs>

## <a id="security-notes"></a> 安全说明

- 默认情况下需要 Gateway 认证：token、password、trusted-proxy，或在启用时使用 Tailscale Serve 身份头。
- 非 loopback 绑定仍然**需要** gateway 认证：token/password 认证，或带有 `gateway.auth.mode: "trusted-proxy"` 的感知身份反向代理。
- Local onboarding 默认情况下会在令牌模式下生成网关机密，即使在环回时也是如此，无需询问令牌与密码。保留现有密码模式； `--gateway-auth password` 或 `--gateway-password <value>` 明确选择它。漏斗仍然需要密码模式。
- UI 使用一个 **网关机密** 字段。网关接受 `connect.params.auth.token` 或 `connect.params.auth.password` 中的秘密； `gateway.auth.mode` 选择配置的值。成功的令牌模式连接后，UI 仅记住当前浏览器选项卡和网关的会话存储中的秘密。密码保留在内存中并且永远不会保留。
- 使用 `gateway.tls.enabled: true`，本地 dashboard/status 帮助程序呈现 `https://` URL 和 `wss://` WebSocket URL。
- 在带身份的模式中（Tailscale Serve、`trusted-proxy`），WebSocket 认证检查会通过请求头满足，而不是通过共享密钥。
- 对于公开的非 loopback Control UI 部署，请显式设置 `gateway.controlUi.allowedOrigins`（完整 origin）。对于 loopback、RFC1918/link-local、`.local`、`.ts.net` 和 Tailscale CGNAT 主机，允许无需设置即可进行私有同源加载。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback: true` 启用基于 Host 头的 origin 回退；这是一项危险的安全降级。
- 使用 Serve 时，当 `gateway.auth.allowTailscale: true`，Tailscale 身份头即可满足 Control UI/WebSocket 认证（不需要 token/password）。HTTP API 端点不会使用 Tailscale 身份头；它们始终遵循 gateway 的正常 HTTP 认证模式。将 `gateway.auth.allowTailscale: false` 可强制即使通过 Serve 也必须提供显式凭据。这个无 token 流程假设 gateway 主机本身是可信的。参见 [Tailscale](/gateway/tailscale) 和 [安全](/gateway/security)。

## <a id="building-the-ui"></a> 构建 UI

网关提供来自 `dist/control-ui` 的静态文件：

```bash
pnpm ui:build
```
