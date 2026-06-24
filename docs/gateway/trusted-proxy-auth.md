---
summary: "将网关认证委托给受信任的反向代理（Pomerium、Caddy、nginx + OAuth）"
title: "受信任代理认证"
sidebarTitle: "受信任代理认证"
read_when:
  - 在身份感知代理后运行 OpenClaw
  - 在 OpenClaw 前面使用 OAuth 配置 Pomerium、Caddy 或 nginx
  - 通过反向代理配置修复 WebSocket 1008 未授权错误
  - 决定在哪里设置 HSTS 和其他 HTTP 加固头
---

<Warning>
**安全敏感功能。** 此模式将认证完全委托给你的反向代理。配置错误可能会使你的 Gateway 暴露给未授权访问。启用前请仔细阅读本页。
</Warning>

## 何时使用

在以下情况下使用 `trusted-proxy` 认证模式：

- 你在 **身份感知代理**（Pomerium、Caddy + OAuth、nginx + oauth2-proxy、Traefik + forward auth）后运行 OpenClaw。
- 你的代理处理所有认证，并通过请求头传递用户身份。
- 你处于 Kubernetes 或容器环境中，代理是到 Gateway 的唯一路径。
- 由于浏览器无法在 WS 负载中传递令牌，你遇到了 WebSocket `1008 unauthorized` 错误。

## 何时不要使用

- 如果你的代理不负责用户认证（只是 TLS 终止器或负载均衡器）。
- 如果有任何绕过代理到达 Gateway 的路径（防火墙漏洞、内部网络访问）。
- 如果你不确定代理是否正确剥离/覆盖了转发头。
- 如果你只需要个人单用户访问（可考虑使用 Tailscale Serve + loopback 以获得更简单的配置）。

## 工作原理

<Steps>
  <Step title="代理认证用户">
    你的反向代理对用户进行认证（OAuth、OIDC、SAML 等）。
  </Step>
  <Step title="代理添加身份头">
    代理添加一个包含已认证用户身份的请求头（例如 `x-forwarded-user: nick@example.com`）。
  </Step>
  <Step title="Gateway 验证受信任来源">
    OpenClaw 会检查请求是否来自 **受信任的代理 IP**（在 `gateway.trustedProxies` 中配置）。
  </Step>
  <Step title="Gateway 提取身份">
    OpenClaw 从配置的请求头中提取用户身份。
  </Step>
  <Step title="授权">
    如果所有检查都通过，请求就会被授权。
  </Step>
</Steps>

## Control UI 配对行为

当 `gateway.auth.mode = "trusted-proxy"` 处于活动状态且请求通过 trusted-proxy 检查时，Control UI 的 WebSocket 会话可以在没有设备配对身份的情况下连接。

范围影响：

- 无设备的 Control UI WebSocket 会话可以连接，但默认不会获得任何操作员范围。OpenClaw 会将请求的范围列表清空为 `[]`，因此未绑定到已批准配对设备/令牌的会话无法自行声明权限。
- 如果在成功建立 WebSocket 连接后方法仍因 `missing scope` 失败，请使用 HTTPS，以便浏览器可以生成设备身份并完成配对。参见 [Control UI 不安全 HTTP](/web/control-ui#insecure-http)。
- 仅限紧急解锁：`gateway.controlUi.dangerouslyDisableDeviceAuth=true` 会在没有设备身份的情况下保留请求的范围。这会严重降低安全性；请尽快恢复。参见 [Control UI 不安全 HTTP](/web/control-ui#insecure-http)。

反向代理范围上限控制：

- 如果你的代理在 Control UI WebSocket 升级请求上发送 `x-openclaw-scopes`，OpenClaw 会将会话范围限制为请求范围与声明范围的交集。此请求头不会授予范围；它只会缩小会话可持有的范围。

影响：

- 在此模式下，配对不再是 Control UI 访问的主要门禁。
- 你的反向代理认证策略和 `allowUsers` 将成为实际的访问控制。
- 将 gateway ingress 仅锁定为受信任代理 IP（`gateway.trustedProxies` + 防火墙）。

自定义 WebSocket 客户端不是 Control UI 会话。`gateway.controlUi.dangerouslyDisableDeviceAuth` 不会为任意 `client.mode: "backend"` 或类似 CLI 的客户端授予范围。自定义自动化应使用设备身份/配对、保留的直连本地 `client.id: "gateway-client"` 后端辅助路径，或在 HTTP 请求/响应更适合时使用 [admin HTTP RPC 插件](/plugins/admin-http-rpc)。

## 配置

```json5
{
  gateway: {
    // 默认情况下，trusted-proxy 认证期望请求来自非 loopback 的受信任代理源
    bind: "lan",

    // 关键：这里只添加你的代理 IP
    trustedProxies: ["10.0.0.1", "172.17.0.1"],

    auth: {
      mode: "trusted-proxy",
      trustedProxy: {
        // 包含已认证用户身份的请求头（必需）
        userHeader: "x-forwarded-user",

        // 可选：必须存在的请求头（代理验证）
        requiredHeaders: ["x-forwarded-proto", "x-forwarded-host"],

        // 可选：限制为特定用户（空值 = 允许所有）
        allowUsers: ["nick@example.com", "admin@company.org"],

        // 可选：在明确启用后允许同主机 loopback 代理
        allowLoopback: false,
      },
    },
  },
}
```

<Warning>
**重要运行规则**

- Trusted-proxy auth 默认会拒绝来自 loopback 源的请求（`127.0.0.1`、`::1`、loopback CIDRs）。
- 同主机 loopback 反向代理不会满足 trusted-proxy auth，除非你明确设置 `gateway.auth.trustedProxy.allowLoopback = true`，并将 loopback 地址包含在 `gateway.trustedProxies` 中。
- `allowLoopback` 会将 Gateway 主机上的本地进程视为与反向代理同等可信。只有在 Gateway 仍然通过防火墙禁止直接远程访问，并且本地代理会剥离或覆盖客户端提供的身份头时才启用它。
- 不经过反向代理的 Gateway 内部客户端应使用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，而不是 trusted-proxy 身份头。
- 非 loopback 的 Control UI 部署仍然需要显式配置 `gateway.controlUi.allowedOrigins`。
- **对于本地直接回退，转发头证据会覆盖 loopback 本地性。** 如果请求到达 loopback，但携带了 `Forwarded`、任何 `X-Forwarded-*` 或 `X-Real-IP` 头证据，这些证据会使本地直接密码回退和设备身份门控失效。启用 `allowLoopback: true` 后，trusted-proxy auth 仍然可以将该请求作为同主机代理请求接受，而 `requiredHeaders` 和 `allowUsers` 仍继续生效。

</Warning>

### 配置参考

<ParamField path="gateway.trustedProxies" type="string[]" required>
  要信任的代理 IP 地址数组。来自其他 IP 的请求将被拒绝。
</ParamField>
<ParamField path="gateway.auth.mode" type="string" required>
  必须是 `"trusted-proxy"`。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.userHeader" type="string" required>
  包含已认证用户身份的请求头名称。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.requiredHeaders" type="string[]">
  请求被信任时必须存在的额外请求头。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.allowUsers" type="string[]">
  用户身份的允许列表。为空表示允许所有已认证用户。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.allowLoopback" type="boolean">
  为同主机 loopback 反向代理提供的可选支持。默认值为 `false`。
</ParamField>

<Warning>
仅当本地反向代理是预期的信任边界时才启用 `allowLoopback`。任何能够连接到 Gateway 的本地进程都可以尝试发送代理身份头，因此应将对 Gateway 的直接访问限制为仅本机，并要求使用代理拥有的请求头，例如 `x-forwarded-proto`，或者在代理支持的情况下使用签名断言头。
</Warning>

## TLS 终止和 HSTS

使用一个 TLS 终止点，并在那里应用 HSTS。

<Tabs>
  <Tab title="代理 TLS 终止（推荐）">
    当你的反向代理为 `https://control.example.com` 处理 HTTPS 时，请在该域名的代理上设置 `Strict-Transport-Security`。

    - 适用于面向互联网的部署。
    - 将证书 + HTTP 加固策略集中在一处管理。
    - OpenClaw 可以在代理后方保持为 loopback HTTP。

    示例请求头值：

    ```text
    Strict-Transport-Security: max-age=31536000; includeSubDomains
    ```

  </Tab>
  <Tab title="Gateway TLS 终止">
    如果 OpenClaw 自身直接提供 HTTPS（没有 TLS 终止代理），请设置：

    ```json5
    {
      gateway: {
        tls: { enabled: true },
        http: {
          securityHeaders: {
            strictTransportSecurity: "max-age=31536000; includeSubDomains",
          },
        },
      },
    }
    ```

    `strictTransportSecurity` 接受字符串形式的请求头值，或接受 `false` 来显式禁用。

  </Tab>
</Tabs>

### 部署建议

- 先从较短的 max age 开始，例如 `max-age=300`，以便在验证流量时使用。
- 只有在确认充分后，才增加到较长的值，例如 `max-age=31536000`。
- 只有当所有子域名都已准备好使用 HTTPS 时，才添加 `includeSubDomains`。
- 只有当你确实为整个域名集合满足 preload 要求时，才使用 preload。
- 仅用于本地 loopback 的开发不会从 HSTS 中获益。

## 代理设置示例

<AccordionGroup>
  <Accordion title="Pomerium">
    Pomerium 通过 `x-pomerium-claim-email`（或其他 claim 请求头）传递身份，并在 `x-pomerium-jwt-assertion` 中传递 JWT。

    ```json5
    {
      gateway: {
        bind: "lan",
        trustedProxies: ["10.0.0.1"], // Pomerium 的 IP
        auth: {
          mode: "trusted-proxy",
          trustedProxy: {
            userHeader: "x-pomerium-claim-email",
            requiredHeaders: ["x-pomerium-jwt-assertion"],
          },
        },
      },
    }
    ```

    Pomerium 配置片段：

    ```yaml
    routes:
      - from: https://openclaw.example.com
        to: http://openclaw-gateway:18789
        policy:
          - allow:
              or:
                - email:
                    is: nick@example.com
        pass_identity_headers: true
    ```

  </Accordion>
  <Accordion title="Caddy with OAuth">
    带 `caddy-security` 插件的 Caddy 可以对用户进行认证并传递身份请求头。

    ```json5
    {
      gateway: {
        bind: "lan",
        trustedProxies: ["10.0.0.1"], // Caddy/sidecar 代理 IP
        auth: {
          mode: "trusted-proxy",
          trustedProxy: {
            userHeader: "x-forwarded-user",
          },
        },
      },
    }
    ```

    Caddyfile 片段：

    ```
    openclaw.example.com {
        authenticate with oauth2_provider
        authorize with policy1

        reverse_proxy openclaw:18789 {
            header_up X-Forwarded-User {http.auth.user.email}
        }
    }
    ```

  </Accordion>
  <Accordion title="nginx + oauth2-proxy">
    oauth2-proxy 对用户进行认证，并在 `x-auth-request-email` 中传递身份。

    ```json5
    {
      gateway: {
        bind: "lan",
        trustedProxies: ["10.0.0.1"], // nginx/oauth2-proxy 的 IP
        auth: {
          mode: "trusted-proxy",
          trustedProxy: {
            userHeader: "x-auth-request-email",
          },
        },
      },
    }
    ```

    nginx 配置片段：

    ```nginx
    location / {
        auth_request /oauth2/auth;
        auth_request_set $user $upstream_http_x_auth_request_email;

        proxy_pass http://openclaw:18789;
        proxy_set_header X-Auth-Request-Email $user;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    ```

  </Accordion>
  <Accordion title="Traefik with forward auth">
    ```json5
    {
      gateway: {
        bind: "lan",
        trustedProxies: ["172.17.0.1"], // Traefik 容器 IP
        auth: {
          mode: "trusted-proxy",
          trustedProxy: {
            userHeader: "x-forwarded-user",
          },
        },
      },
    }
    ```
  </Accordion>
</AccordionGroup>

## 混合令牌配置

当 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）与 `trusted-proxy` 模式同时启用时，OpenClaw 会拒绝模糊不清的配置。混合令牌配置可能导致 loopback 请求在错误的认证路径上静默通过认证。

如果启动时看到 `mixed_trusted_proxy_token` 错误：

- 在使用 trusted-proxy 模式时移除共享令牌，或
- 如果你打算使用基于令牌的认证，请将 `gateway.auth.mode` 切换为 `"token"`。

loopback 的 trusted-proxy 身份头仍然会安全失败：同主机调用者不会被静默认证为代理用户。不经过代理的内部 OpenClaw 调用者可以改为使用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD` 进行认证。在 trusted-proxy 模式下，令牌回退仍然被有意不支持。

## 操作员范围请求头

Trusted-proxy auth 是一种**带身份**的 HTTP 模式，因此调用者可以在 HTTP API 请求中选择性地通过 `x-openclaw-scopes` 声明操作员范围。

注意：WebSocket 范围由 Gateway 协议握手和设备身份绑定决定。在 Control UI WebSocket 升级请求上，`x-openclaw-scopes` 只是对协商后会话范围的上限限制，而不是授权。有关 trusted-proxy 下的 WebSocket 范围行为，请参见 [Control UI 配对行为](#control-ui-配对行为)。

示例：

- `x-openclaw-scopes: operator.read`
- `x-openclaw-scopes: operator.read,operator.write`
- `x-openclaw-scopes: operator.admin,operator.write`

行为：

- 当该请求头存在时，OpenClaw 会遵循声明的范围集合。
- 当该请求头存在但为空时，请求声明**没有**操作员范围。
- 当该请求头缺失时，正常的带身份 HTTP API 会回退到标准的操作员默认范围集合。
- Gateway-auth **插件 HTTP 路由**默认更窄：当 `x-openclaw-scopes` 缺失时，它们的运行时范围会回退到 `operator.write`。
- 即使 trusted-proxy auth 成功，来自浏览器源的 HTTP 请求仍然必须通过 `gateway.controlUi.allowedOrigins`（或有意启用的 Host 头回退模式）。
- 对于 Control UI WebSocket 会话，`x-openclaw-scopes` 在升级请求中存在时就是范围上限。空值则不会授予任何范围。

实用规则：当你希望受信任代理请求比默认值更窄，或者当某个 gateway-auth 插件路由需要比 write scope 更强的权限时，请显式发送 `x-openclaw-scopes`。

## 安全检查清单

在启用受信任代理认证之前，请确认：

- [ ] **代理是唯一入口**：Gateway 端口已通过防火墙限制，除你的代理外其他来源均无法访问。
- [ ] **trustedProxies 尽量最小化**：只填写实际代理的 IP，不要包含整个子网。
- [ ] **回环代理来源是有意为之**：对于来自 loopback 源的请求，受信任代理认证默认会失败关闭，除非为同主机代理显式启用 `gateway.auth.trustedProxy.allowLoopback`。
- [ ] **代理会剥离头部**：你的代理会覆盖（不是追加）来自客户端的 `x-forwarded-*` 头。
- [ ] **TLS 终止**：你的代理负责处理 TLS；用户通过 HTTPS 连接。
- [ ] **allowedOrigins 是显式配置的**：非 loopback 的 Control UI 使用显式的 `gateway.controlUi.allowedOrigins`。
- [ ] **已设置 allowUsers**（推荐）：限制为已知用户，而不是允许任何已认证用户。
- [ ] **没有混用 token 配置**：不要同时设置 `gateway.auth.token` 和 `gateway.auth.mode: "trusted-proxy"`。
- [ ] **本地密码回退是私有的**：如果你为内部直接调用者配置了 `gateway.auth.password`，请保持 Gateway 端口受防火墙保护，以免非代理远程客户端直接访问。

## 安全审计

`openclaw security audit` 会将受信任代理认证标记为 **critical** 级别发现。这是有意为之——它是在提醒你，安全性已经委托给你的代理配置。

审计会检查：

- 基础的 `gateway.trusted_proxy_auth` 警告/critical 提示
- 缺少 `trustedProxies` 配置
- 缺少 `userHeader` 配置
- `allowUsers` 为空（允许任何已认证用户）
- 为同主机代理来源启用了 `allowLoopback`
- 暴露的 Control UI 表面存在通配或缺失的浏览器来源策略

## 故障排查

<AccordionGroup>
  <Accordion title="trusted_proxy_untrusted_source">
    请求并非来自 `gateway.trustedProxies` 中的 IP。请检查：

    - 代理 IP 是否正确？（Docker 容器 IP 可能会变化。）
    - 你的代理前面是否还有负载均衡器？
    - 使用 `docker inspect` 或 `kubectl get pods -o wide` 查找实际 IP。

  </Accordion>
  <Accordion title="trusted_proxy_loopback_source">
    OpenClaw 拒绝了来自 loopback 源的受信任代理请求。

    请检查：

    - 代理是否正从 `127.0.0.1` / `::1` 连接？
    - 你是否在尝试对同主机 loopback 反向代理使用受信任代理认证？

    解决方法：

    - 对于不经过代理的内部同主机客户端，优先使用 token/password 认证，或者
    - 通过非 loopback 的受信任代理地址进行路由，并将该 IP 保留在 `gateway.trustedProxies` 中，或者
    - 对于有意使用的同主机反向代理，将 `gateway.auth.trustedProxy.allowLoopback = true`，把 loopback 地址保留在 `gateway.trustedProxies` 中，并确保代理会剥离或覆盖身份头。

  </Accordion>
  <Accordion title="trusted_proxy_user_missing">
    用户头为空或缺失。请检查：

    - 你的代理是否配置为传递身份头？
    - 头名称是否正确？（大小写不敏感，但拼写必须正确）
    - 用户是否真的已在代理端完成认证？

  </Accordion>
  <Accordion title="trusted_proxy_missing_header_*">
    某个必需的头不存在。请检查：

    - 你的代理对这些特定头的配置。
    - 是否在链路中的某处被剥离了头部。

  </Accordion>
  <Accordion title="trusted_proxy_user_not_allowed">
    用户已通过认证，但不在 `allowUsers` 中。请将其加入，或者移除允许列表。
  </Accordion>
  <Accordion title="trusted_proxy_origin_not_allowed">
    受信任代理认证已成功，但浏览器的 `Origin` 头未通过 Control UI 的来源检查。

    请检查：

    - `gateway.controlUi.allowedOrigins` 是否包含精确的浏览器 origin。
    - 除非你有意启用全放行行为，否则不要依赖通配来源。
    - 如果你确实在使用 Host-header 回退模式，请明确设置 `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true`。

  </Accordion>
  <Accordion title="Connection succeeds but methods report missing scope">
    WebSocket 已连接，但 `chat.history`、`sessions.list` 或
    `models.list` 因 `missing scope: operator.read` 而失败。

    常见原因：

    - 无设备的 Control UI 会话：受信任代理认证可以在没有设备身份的情况下允许 WebSocket 连接，但 OpenClaw 出于设计会清除无设备会话的作用域。
    - 自定义后端客户端：`gateway.controlUi.dangerouslyDisableDeviceAuth` 仅作用于 Control UI，不会向任意后端或 CLI 风格的 WebSocket 客户端授予作用域。
    - `x-openclaw-scopes` 过于狭窄：如果你的代理在 Control UI 的 WebSocket 升级请求中注入了该头，会上限为该集合的作用域。空头值会导致没有作用域。

    解决方法：

    - 对于 Control UI，请使用 HTTPS，以便浏览器可以生成设备身份并完成配对。
    - 对于自定义自动化，请使用设备身份/配对、保留的本地直接 `gateway-client` 后端辅助路径，或 [admin HTTP RPC](/plugins/admin-http-rpc)。
    - 仅在临时为 Control UI 开启应急通道时使用 `gateway.controlUi.dangerouslyDisableDeviceAuth: true`。

  </Accordion>
  <Accordion title="WebSocket still failing">
    请确保你的代理：

    - 支持 WebSocket 升级（`Upgrade: websocket`, `Connection: upgrade`）。
    - 在 WebSocket 升级请求中传递身份头（不仅仅是 HTTP 请求）。
    - 没有为 WebSocket 连接设置单独的认证路径。

  </Accordion>
</AccordionGroup>

## 从 token auth 迁移

如果你要从 token auth 迁移到受信任代理：

<Steps>
  <Step title="配置代理">
    配置你的代理以认证用户并传递头部。
  </Step>
  <Step title="独立测试代理">
    独立测试代理配置（使用带头部的 curl）。
  </Step>
  <Step title="更新 OpenClaw 配置">
    使用受信任代理认证更新 OpenClaw 配置。
  </Step>
  <Step title="重启 Gateway">
    重启 Gateway。
  </Step>
  <Step title="测试 WebSocket">
    从 Control UI 测试 WebSocket 连接。
  </Step>
  <Step title="审计">
    运行 `openclaw security audit` 并检查发现。
  </Step>
</Steps>

## 相关

- [Configuration](/gateway/configuration) — 配置参考
- [Remote access](/gateway/remote) — 其他远程访问模式
- [Security](/gateway/security) — 完整安全指南
- [Tailscale](/gateway/tailscale) — 仅限 tailnet 访问的更简单替代方案
