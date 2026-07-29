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

- 你在 **身份感知代理**（Pomerium、Caddy + OAuth、nginx + oauth2-proxy、Traefik + forward auth）后面运行 OpenClaw。
- 你的代理处理所有身份验证，并通过请求头传递用户身份。
- 你处于 Kubernetes 或容器环境中，代理是通往 Gateway 的唯一路径。
- 你遇到 WebSocket `1008 unauthorized` 错误，因为浏览器无法在 WS 负载中传递令牌。

## 何时不要使用

- 你的代理不对用户进行身份验证（只是一个 TLS 终止器或负载均衡器）。
- 到 Gateway 的任何路径会绕过代理（防火墙漏洞、内部网络访问）。
- 你不确定代理是否会正确移除/覆盖转发头。
- 你只需要个人单用户访问（可考虑改用 Tailscale Serve + loopback）。

## 工作原理

<Steps>
  <Step title="代理认证用户">
    你的反向代理对用户进行认证（OAuth、OIDC、SAML 等）。
  </Step>
  <Step title="代理添加身份头">
    代理添加一个包含已认证用户身份的请求头（例如 `x-forwarded-user: nick@example.com`）。
  </Step>
  <Step title="Gateway 验证可信来源">
    OpenClaw 检查请求是否来自 **受信任的代理 IP**（`gateway.trustedProxies`），并且不是 Gateway 自身的回环地址或本地接口地址。
  </Step>
  <Step title="Gateway 提取身份">
    OpenClaw 读取所需的请求头，然后从配置的头中获取用户身份。
  </Step>
  <Step title="授权">
    如果一切检查通过，并且用户通过 `allowUsers`（在设置时）的校验，请求将被授权。
  </Step>
</Steps>

## 配置

```json5
{
  gateway: {
    // Trusted-proxy auth expects the proxy's source IP to be non-loopback by default
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

        // Optional: let authenticated proxy users enroll new browser devices
        deviceAutoApprove: {
          enabled: false,
          scopes: ["operator.read", "operator.write", "operator.approvals"],
        },
      },
    },
  },
}
```

<Warning>
**运行规则，按评估顺序**

1. 请求的源 IP 必须匹配 `gateway.trustedProxies`（支持 CIDR），否则会被拒绝（`trusted_proxy_untrusted_source`）。
2. 来自 loopback 的请求（`127.0.0.1`、`::1`）会被拒绝，除非 `gateway.auth.trustedProxy.allowLoopback = true` 且 loopback 地址也在 `trustedProxies` 中（`trusted_proxy_loopback_source`）。此检查在请求头检查之前运行，因此即使同时缺少必需请求头，loopback 源也会以这种方式失败。
3. 与 Gateway 主机自身本地网络接口地址匹配的非 loopback 源会被拒绝，作为防伪装保护（`trusted_proxy_local_interface_source`）。如果接口发现本身失败，请求也会被拒绝（`trusted_proxy_local_interface_check_failed`）。
4. `requiredHeaders` 和 `userHeader` 必须存在且不能为空白。
5. 如果 `allowUsers` 非空，则必须包含提取出的用户。

**转发请求头证据会覆盖本地直连回退中的 loopback 本地性。** 如果请求到达 loopback，但携带 `Forwarded`、任意 `X-Forwarded-*` 或 `X-Real-IP` 请求头，这些证据会使其不符合本地直连密码回退和设备身份门控，即使它作为 loopback 仍然会因为 trusted-proxy 认证而失败。

只有在 Gateway 仍然通过防火墙阻止直接远程访问，并且本地代理会剥离或覆盖客户端提供的身份请求头时，才启用 `allowLoopback`，因为这会信任与反向代理同等程度的 Gateway 主机本地进程。

未经过反向代理、直接与 Gateway 通信的内部客户端应使用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，而不是 trusted-proxy 身份请求头。非 loopback 的 Control UI 部署仍然需要显式配置 `gateway.controlUi.allowedOrigins`。
</Warning>

### 配置参考

<ParamField path="gateway.trustedProxies" type="string[]" required>
  要信任的代理 IP 地址（或 CIDR）数组。来自其他 IP 的请求会被拒绝。
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
<ParamField path="gateway.auth.trustedProxy.allowLoopback" type="boolean" default="false">
  对同主机 loopback 反向代理的可选支持。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.deviceAutoApprove.enabled" type="boolean" default="false">
  Automatically approve new Control UI and WebChat device identities after trusted-proxy authentication.
</ParamField>
<ParamField path="gateway.auth.trustedProxy.deviceAutoApprove.scopes" type="string[]" default='["operator.read", "operator.write", "operator.approvals"]'>
  Maximum scopes granted to an auto-approved browser device. Explicitly listing `operator.admin` lets every proxy-authenticated user request an automatic full-admin device grant, makes scope-less requests receive full admin automatically, and triggers the CRITICAL `gateway.trusted_proxy_device_auto_approve_admin` security audit finding plus a Gateway startup warning.
</ParamField>

<Warning>
只有在本地反向代理就是预期信任边界时才启用 `allowLoopback`。任何能够连接到 Gateway 的本地进程都可能尝试发送代理身份请求头，因此请将对 Gateway 的直接访问限制为仅本机，并要求使用代理拥有的请求头，例如 `x-forwarded-proto`，或者在你的代理支持时使用签名断言请求头。
</Warning>

## Automatic device approval

Trusted-proxy auth can optionally use the proxy identity as the approval boundary for new browser devices:

```json5
{
  gateway: {
    auth: {
      mode: "trusted-proxy",
      trustedProxy: {
        userHeader: "x-forwarded-user",
        allowUsers: ["operator@example.com"],
        deviceAutoApprove: {
          enabled: true,
          scopes: ["operator.read", "operator.write", "operator.approvals"],
        },
      },
    },
  },
}
```

The default is `enabled: false`. When enabled, all of these rules apply:

1. The WebSocket must have authenticated through the `trusted-proxy` method with a non-empty user identity that passed `allowUsers` when an allowlist is configured. Token, password, Tailscale, and unauthenticated connections never use this policy.
2. Only a new Control UI or WebChat browser device can be approved automatically. Any request for an existing device, including a scope upgrade, remains pending for manual approval with `openclaw devices approve <requestId>`.
3. The device is approved with role `operator`. If the connect request includes scopes, the grant is the exact intersection of the requested scopes and `deviceAutoApprove.scopes`. If the request omits scopes, the configured list is granted; when that list is omitted, it defaults to `operator.read`, `operator.write`, and `operator.approvals`. The resulting grant is then additionally capped by the connection's [`x-openclaw-scopes`](#control-ui-pairing-behavior) proxy header when present, so a proxy that narrows a user's scopes also limits the **persistent** device grant, not just the session — a present-but-empty header yields no scopes. This cap applies even when the client omits its own scope list.
4. `operator.admin` is allowed only through explicit listing in `deviceAutoApprove.scopes`. When listed, every proxy-authenticated user can request and automatically receive full admin on a new browser device; requests without scopes receive full admin automatically. `openclaw security audit` reports the CRITICAL `gateway.trusted_proxy_device_auto_approve_admin` finding, and the Gateway logs a warning once at startup. Prefer manual admin approval with `openclaw devices approve` or `openclaw devices rotate` until per-identity roles are available.

<Warning>
Enabling this option delegates new browser device enrollment entirely to the reverse-proxy identity. A compromised proxy account can enroll a persistent device with every configured scope. Listing `operator.admin` makes that device a full administrator without manual approval. Keep the Gateway reachable only through the proxy, require strong proxy authentication, overwrite identity headers, and use a narrow `allowUsers` list.
</Warning>

## Control UI pairing behavior

当 `gateway.auth.mode = "trusted-proxy"` 处于启用状态且请求通过 trusted-proxy 检查时，Control UI WebSocket 会话可以在没有设备配对身份的情况下连接。

范围影响：

- Device-less Control UI WebSocket sessions connect but receive no operator scopes by default. OpenClaw clears the requested scope list to `[]` so a session not bound to an approved paired device/token cannot self-declare permissions.
- If methods fail with `missing scope` after a successful WebSocket connect, use HTTPS so the browser can generate device identity and complete pairing. See [Control UI insecure HTTP](/web/control-ui#insecure-http).
- Older configs that still contain the retired
  `gateway.controlUi.dangerouslyDisableDeviceAuth=true` key use the bounded
  [Control UI upgrade migration](/web/control-ui#device-pairing-first-connection).

Reverse-proxy scope capping: if your proxy sends `x-openclaw-scopes` on the Control UI WebSocket upgrade request, OpenClaw caps the session scopes to the intersection of the requested scopes and the declared scopes. This header does not grant scopes; it only narrows what the session can hold. When `deviceAutoApprove.enabled` is true, the same cap also applies to the persistent device grant written by [automatic device approval](#automatic-device-approval), so an auto-approved device never holds more than the proxy declared.

影响：

- Pairing is no longer the primary gate for device-less Control UI access. When `deviceAutoApprove.enabled` is true, the proxy identity also becomes the approval gate for new browser device enrollment.
- Your reverse proxy auth policy and `allowUsers` become the effective access control.
- Keep gateway ingress locked to trusted proxy IPs only (`gateway.trustedProxies` + firewall).

Custom WebSocket clients are not Control UI sessions. The retired Control UI
upgrade input does not grant temporary access to arbitrary
`client.mode: "backend"` or CLI-shaped clients. Custom automation should use
device identity/pairing, the reserved direct-local `client.id: "gateway-client"`
backend helper path, or the [admin HTTP RPC plugin](/plugins/admin-http-rpc)
when an HTTP request/response surface is a better fit.

## 操作员作用域头

Trusted-proxy 认证是一种**携带身份**的 HTTP 模式，因此调用方可以在 HTTP API 请求中通过 `x-openclaw-scopes` 选择性地声明操作员作用域。

注意：WebSocket 作用域由 Gateway 协议握手和设备身份绑定共同决定。在 Control UI 的 WebSocket 升级请求中，`x-openclaw-scopes` 只会作为协商得到的会话作用域的上限，而不是授予权限。参见 [Control UI 配对行为](#control-ui-pairing-behavior)。

示例：

- `x-openclaw-scopes: operator.read`
- `x-openclaw-scopes: operator.read,operator.write`
- `x-openclaw-scopes: operator.admin,operator.write`

行为：

- 当该头存在时，OpenClaw 会遵循所声明的作用域集合。
- 当该头存在但为空时，请求声明**没有**任何操作员作用域。
- 当该头缺失时，普通携带身份的 HTTP API 会回退到标准的操作员默认作用域集合（`operator.admin`、`operator.read`、`operator.write`、`operator.approvals`、`operator.pairing`、`operator.talk.secrets`）。
- Gateway-auth **插件 HTTP 路由**的默认范围更窄：当 `x-openclaw-scopes` 缺失时，它们的运行时作用域会回退为仅 `operator.write`。
- 即使 trusted-proxy 认证成功，浏览器来源的 HTTP 请求仍然必须通过 `gateway.controlUi.allowedOrigins`（或有意启用的 Host 头回退模式）。

实用规则：当你希望 trusted-proxy 请求比默认值更窄，或者当某个 gateway-auth 插件路由需要比 write 作用域更强的权限时，请显式发送 `x-openclaw-scopes`。

## TLS 终止与 HSTS

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

    ```caddy
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

如果同时还配置了共享令牌（`gateway.auth.token` 或 `OPENCLAW_GATEWAY_TOKEN`），Gateway 启动会拒绝 trusted-proxy 认证。这两者是互斥的，因为共享令牌会让同主机调用者通过与此模式要强制实施的代理验证身份完全不同的路径进行认证。

如果启动失败并出现类似 `gateway auth mode is trusted-proxy, but a shared token is also configured` 的错误：

- 在使用 trusted-proxy 模式时移除共享令牌，或
- 如果你打算使用基于令牌的认证，请将 `gateway.auth.mode` 切换为 `"token"`。

loopback 的 trusted-proxy 身份头仍然会安全失败：同主机调用者不会被静默认证为代理用户。不经过代理的内部 OpenClaw 调用者可以改为使用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD` 进行认证。在 trusted-proxy 模式下，令牌回退仍然被有意不支持。

## 安全检查清单

在启用受信任代理认证之前，请确认：

- [ ] **Proxy is the only path**: The Gateway port is firewalled from everything except your proxy.
- [ ] **trustedProxies is minimal**: Only your actual proxy IPs, not entire subnets.
- [ ] **Loopback proxy source is deliberate**: trusted-proxy auth fails closed for loopback-source requests unless `gateway.auth.trustedProxy.allowLoopback` is explicitly enabled for a same-host proxy.
- [ ] **Proxy strips headers**: Your proxy overwrites (not appends) `x-forwarded-*` headers from clients.
- [ ] **TLS termination**: Your proxy handles TLS; users connect via HTTPS.
- [ ] **allowedOrigins is explicit**: Non-loopback Control UI uses explicit `gateway.controlUi.allowedOrigins`.
- [ ] **allowUsers is set** (recommended): Restrict to known users rather than allowing anyone authenticated.
- [ ] **No mixed token config**: Do not set both `gateway.auth.token` and `gateway.auth.mode: "trusted-proxy"`.
- [ ] **Local password fallback is private**: If you configure `gateway.auth.password` for internal direct callers, keep the Gateway port firewalled so non-proxy remote clients cannot reach it directly.
- [ ] **Device auto-approval is deliberate**: If `deviceAutoApprove.enabled` is true, treat reverse-proxy account security as the device-enrollment boundary and keep the granted scope list non-admin and minimal.

## 安全审计

`openclaw security audit` 会将受信任代理认证标记为 **严重** 级别的发现。这是有意为之；它是在提醒你，安全性被委托给了你的代理配置。

审计会检查：

- Base `gateway.trusted_proxy_auth` warning/critical reminder.
- Missing `trustedProxies` configuration.
- Missing `userHeader` configuration.
- Empty `allowUsers` (allows any authenticated user).
- Enabled `allowLoopback` for same-host proxy sources.
- Enabled browser device auto-approval (delegates new device pairing to the proxy identity).

当 Control UI 暴露时，还会应用一些独立的、非受信任代理特定的发现：`gateway.controlUi.allowedOrigins` 的通配符或缺失，以及 Host-header origin 回退。

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
  <Accordion title="trusted_proxy_local_interface_source / trusted_proxy_local_interface_check_failed">
    请求的源 IP 与 Gateway 主机自身某个非 loopback 网络接口地址匹配（而不是代理），这是对 tailnet 或 Docker bridge 网络上伪造同主机流量的防护。`..._check_failed` 表示接口发现过程本身出错，因此 OpenClaw 采取拒绝策略。

    请检查：

    - 是否有 Gateway 主机本机上的进程直接发送身份头，绕过了代理？
    - 代理是否与 Gateway 运行在同一个网络命名空间中，并且其 IP 也显示为本地接口？

    解决方法：将代理流量路由到一个不会被 Gateway 主机本地绑定的地址，或者仅在真正的同主机代理部署中使用 `allowLoopback`。

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
  <Accordion title="trusted_proxy_no_proxies_configured / trusted_proxy_config_missing">
    `gateway.auth.mode` 是 `"trusted-proxy"`，但 `gateway.trustedProxies` 为空，或者 `gateway.auth.trustedProxy` 本身缺失。在两者都设置之前，所有请求都会被拒绝。
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

    - Device-less Control UI session: trusted-proxy auth can admit the WebSocket connection without device identity, but OpenClaw clears scopes on device-less sessions by design.
    - Custom backend client: the retired Control UI upgrade input never grants access to arbitrary backend or CLI-shaped WebSocket clients.
    - Overly narrow `x-openclaw-scopes`: if your proxy injects this header on the Control UI WebSocket upgrade request, the session scopes are capped to that set. An empty header value yields no scopes.

    解决方法：

    - For Control UI, use HTTPS so the browser can generate device identity and complete pairing.
    - For custom automation, use device identity/pairing, the reserved direct-local `gateway-client` backend helper path, or [admin HTTP RPC](/plugins/admin-http-rpc).
    - Do not add the retired `gateway.controlUi.dangerouslyDisableDeviceAuth` key to current config. Older installs use the one-time self-pairing migration automatically.

  </Accordion>
  <Accordion title="WebSocket still failing">
    请确保你的代理：

    - 支持 WebSocket 升级（`Upgrade: websocket`, `Connection: upgrade`）。
    - 在 WebSocket 升级请求中传递身份头（不仅仅是 HTTP 请求）。
    - 没有为 WebSocket 连接设置单独的认证路径。

  </Accordion>
</AccordionGroup>

## 从 token 认证迁移

<Steps>
  <Step title="配置代理">
    配置你的代理以认证用户并传递请求头。
  </Step>
  <Step title="独立测试代理">
    独立测试代理配置（使用带请求头的 curl）。
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

- [配置](/gateway/configuration) — 配置参考
- [Operator 作用域](/gateway/operator-scopes) — 角色、作用域和审批检查
- [远程访问](/gateway/remote) — 其他远程访问模式
- [安全性](/gateway/security) — 完整安全指南
- [Tailscale](/gateway/tailscale) — 仅限 tailnet 访问的更简单替代方案
