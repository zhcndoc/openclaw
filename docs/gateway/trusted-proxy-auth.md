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
      identityScopes: {
        "admin@company.org": ["operator.admin"],
      },
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
<ParamField path="gateway.auth.identityScopes" type="record<string, string[]>">
  授予已验证的 trusted-proxy 或 Tailscale 身份、仅限连接使用的 operator 权限范围。电子邮件键不区分大小写；未知的权限范围名称会导致配置验证失败。
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
  在 trusted-proxy 认证后，自动批准新的 Control UI 和 WebChat 设备身份。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.deviceAutoApprove.scopes" type="string[]" default='["operator.read", "operator.write", "operator.approvals"]'>
  授予自动批准的浏览器设备的最大权限范围。显式列出 `operator.admin` 会让每个通过代理认证的用户都能请求自动的完全管理员设备授权，使不带权限范围的请求自动获得完整管理员权限，并触发严重级别为 CRITICAL 的 `gateway.trusted_proxy_device_auto_approve_admin` 安全审计发现以及 Gateway 启动警告。
</ParamField>

<Warning>
只有在本地反向代理就是预期信任边界时才启用 `allowLoopback`。任何能够连接到 Gateway 的本地进程都可能尝试发送代理身份请求头，因此请将对 Gateway 的直接访问限制为仅本机，并要求使用代理拥有的请求头，例如 `x-forwarded-proto`，或者在你的代理支持时使用签名断言请求头。
</Warning>

## 按身份授予作用域

使用 `gateway.auth.identityScopes` 向选定的已验证用户授予额外的
operator 作用域，而无需扩大其持久设备授权：

```json5
{
  gateway: {
    auth: {
      mode: "trusted-proxy",
      identityScopes: {
        "admin@example.com": ["operator.admin"],
        "operator@example.com": ["operator.read", "operator.write"],
      },
      trustedProxy: {
        userHeader: "x-forwarded-user",
      },
    },
  },
}
```

映射键是经过验证的 trusted-proxy 身份或 Tailscale WhoIs 登录身份。
电子邮件匹配不区分大小写；非电子邮件身份则必须完全匹配。在每次连接时，OpenClaw 会将匹配身份的作用域添加到设备授权的
作用域中，然后应用显式的 `x-openclaw-scopes` 连接上限。

这些授权仅在会话期间有效。它们不会创建或更新设备配对记录，也不会触发设备作用域升级请求。Token、密码和
无身份验证连接不携带已验证身份，因此永远不会获得授权。

## 自动设备批准

Trusted-proxy 身份验证可以选择使用代理身份作为新浏览器设备的批准边界：

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

默认值为 `enabled: false`。启用后，所有以下规则均适用：

1. WebSocket 必须通过 `trusted-proxy` 方法完成身份验证，并且具有非空的用户身份；当配置了允许列表时，该身份还必须通过 `allowUsers`。Token、密码、Tailscale 以及未经身份验证的连接永远不会使用此策略。
2. 只有新的 Control UI 或 WebChat 浏览器设备可以自动批准。任何针对现有设备的请求，包括权限范围升级，仍会保持待处理状态，需要通过 `openclaw devices approve <requestId>` 手动批准。
3. 设备将以 `operator` 角色获得批准。如果连接请求包含权限范围，则授予的权限范围是请求权限范围与 `deviceAutoApprove.scopes` 的精确交集。如果请求未包含权限范围，则授予配置的列表；当该列表被省略时，默认授予 `operator.read`、`operator.write` 和 `operator.approvals`。当存在连接的 [`x-openclaw-scopes`](#control-ui-pairing-behavior) 代理标头时，最终授予的权限范围还会受到该标头的进一步限制，因此，缩小用户权限范围的代理也会限制**持久化**设备授予的权限，而不仅仅是会话权限——存在但为空的标头将不会授予任何权限范围。即使客户端省略自身的权限范围列表，此限制仍然适用。
4. 只有通过在 `deviceAutoApprove.scopes` 中明确列出，才允许使用 `operator.admin`。列出后，每个通过代理身份验证的用户都可以请求并在新的浏览器设备上自动获得完整的管理员权限；未包含权限范围的请求也会自动获得完整管理员权限。`openclaw security audit` 会报告 CRITICAL `gateway.trusted_proxy_device_auto_approve_admin` 问题，并且 Gateway 会在启动时记录一次警告。如果选定的已验证用户需要会话管理员权限，而不需要持久化的管理员设备授予，请优先使用针对性的 [`identityScopes`](#per-identity-scope-grants) 管理员授予。

<Warning>
启用此选项后，新浏览器设备的注册将完全委托给反向代理身份。遭到入侵的代理账户可以使用所有已配置的权限范围注册一个持久化设备。列出 `operator.admin` 会使该设备在无需手动批准的情况下成为完整管理员。请确保 Gateway 只能通过代理访问，要求使用强代理身份验证，覆盖身份标头，并使用范围狭窄的 `allowUsers` 列表。
</Warning>

## Control UI 配对行为

当 `gateway.auth.mode = "trusted-proxy"` 处于启用状态且请求通过 trusted-proxy 检查时，Control UI WebSocket 会话可以在没有设备配对身份的情况下连接。

范围影响：

- 无设备的 Control UI WebSocket 会话无法自行声明权限。OpenClaw 会将其请求的 scope 列表清除为 `[]`，然后在代理身份验证通过后应用任何匹配的服务端 `identityScopes` 授权。
- 如果 WebSocket 成功连接后方法因 `missing scope` 失败，请使用 HTTPS，以便浏览器生成设备身份并完成配对。请参阅 [Control UI 不安全 HTTP](/web/control-ui#insecure-http)。
- 仍包含已弃用的
  `gateway.controlUi.dangerouslyDisableDeviceAuth=true` 密钥的旧配置，请使用有边界的
  [Control UI 升级迁移](/web/control-ui#device-pairing-first-connection)。

反向代理 scope 限制：如果你的代理在 Control UI WebSocket 升级请求中发送 `x-openclaw-scopes`，OpenClaw 会限制设备注册或升级请求，以及设备授权和身份授权会话 scope 的最终并集。此标头不会授予 scope；它只会缩小权限范围。当 `deviceAutoApprove.enabled` 为 true 时，该限制也会限制由[自动设备批准](#automatic-device-approval)写入的持久设备授权。

影响：

- 配对不再是无设备 Control UI 访问的主要门槛。匹配的 `identityScopes` 条目可以在不创建配对记录的情况下授权该会话。当 `deviceAutoApprove.enabled` 为 true 时，代理身份也会成为新浏览器设备注册的批准门槛。
- 你的反向代理身份验证策略和 `allowUsers` 将成为实际的访问控制。
- 仅允许受信任的代理 IP 访问网关入口（`gateway.trustedProxies` + 防火墙）。

自定义 WebSocket 客户端不是 Control UI 会话。已弃用的 Control UI
升级输入不会向任意的
`client.mode: "backend"` 或 CLI 形态的客户端授予临时访问权限。自定义自动化应使用设备身份／配对、保留的直接本地 `client.id: "gateway-client"`
后端辅助路径，或在 HTTP 请求／响应界面更合适时使用
[admin HTTP RPC 插件](/plugins/admin-http-rpc)。

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
  <Accordion title="Caddy 与 OAuth">
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
  <Accordion title="Traefik 与 forward auth">
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

- [ ] **Proxy 是唯一通路**：Gateway 端口已设置防火墙，仅允许您的代理访问。
- [ ] **trustedProxies 保持最小范围**：仅配置实际的代理 IP，而不是整个子网。
- [ ] **环回代理来源是有意设置的**：对于环回来源的请求，受信任代理认证默认会失败并关闭，除非针对同主机代理明确启用 `gateway.auth.trustedProxy.allowLoopback`。
- [ ] **代理会移除标头**：您的代理会覆盖（而不是追加）客户端传入的 `x-forwarded-*` 标头。
- [ ] **TLS 终止**：您的代理处理 TLS；用户通过 HTTPS 连接。
- [ ] **allowedOrigins 已明确设置**：非环回 Control UI 使用明确的 `gateway.controlUi.allowedOrigins`。
- [ ] **已设置 `allowUsers`**（推荐）：将访问限制为已知用户，而不是允许任何已通过认证的用户。
- [ ] **不存在混合令牌配置**：不要同时设置 `gateway.auth.token` 和 `gateway.auth.mode: "trusted-proxy"`。
- [ ] **本地密码回退保持私有**：如果为内部直接调用方配置了 `gateway.auth.password`，请保持 Gateway 端口受防火墙保护，以便非代理远程客户端无法直接访问。
- [ ] **设备自动批准是有意设置的**：如果 `deviceAutoApprove.enabled` 为 true，请将反向代理账户安全视为设备注册边界，并确保授予的作用域列表不包含管理员权限且保持最小范围。

## 安全审计

`openclaw security audit` 会将受信任代理认证标记为 **严重** 级别的发现。这是有意为之；它是在提醒你，安全性被委托给了你的代理配置。

审计会检查：

- 基础 `gateway.trusted_proxy_auth` 警告／严重提醒。
- 缺少 `trustedProxies` 配置。
- 缺少 `userHeader` 配置。
- `allowUsers` 为空（允许任何已认证的用户）。
- 为同主机代理来源启用了 `allowLoopback`。
- 启用了浏览器设备自动批准（将新设备配对委托给代理身份）。

当 Control UI 暴露时，还会应用一些独立的、非受信任代理特定的发现：`gateway.controlUi.allowedOrigins` 的通配符或缺失，以及 Host 标头来源回退。

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

    - 无设备的 Control UI 会话：OpenClaw 会按设计清除自行声明的 scope，并且未配置匹配的 `gateway.auth.identityScopes` 授权。
    - 自定义后端客户端：已弃用的 Control UI 升级输入不会向任意后端或 CLI 形式的 WebSocket 客户端授予访问权限。
    - `x-openclaw-scopes` 过于狭窄：如果你的代理在 Control UI WebSocket 升级请求中注入了此头，则会话 scope 会被限制为该集合。空的头值会产生无 scope 的会话。

    解决方法：

    - 对于 Control UI，请使用 HTTPS，以便浏览器生成设备身份并完成配对。
    - 对于自定义自动化，请使用设备身份／配对、保留的 direct-local `gateway-client` 后端辅助路径，或 [admin HTTP RPC](/plugins/admin-http-rpc)。
    - 不要将已弃用的 `gateway.controlUi.dangerouslyDisableDeviceAuth` key 添加到当前配置中。旧版安装会自动使用一次性自配对迁移。

  </Accordion>
  <Accordion title="WebSocket still failing">
    请确保你的代理：

    - 支持 WebSocket 升级（`Upgrade: websocket`、`Connection: upgrade`）。
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
- [Tailscale](/gateway/tailscale) — 仅限 tailnet 访问的更简单替代方案。
