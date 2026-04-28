---
summary: "将网关认证委托给受信任的反向代理（Pomerium、Caddy、nginx + OAuth）"
title: "受信任代理认证"
read_when:
  - 在身份感知代理后运行 OpenClaw
  - 在 OpenClaw 前配置 Pomerium、Caddy 或带 OAuth 的 nginx
  - 修复反向代理设置中 WebSocket 1008 未授权错误
  - 决定在哪里设置 HSTS 和其他 HTTP 强化头
---

> ⚠️ **安全敏感功能。** 此模式会将认证完全委托给您的反向代理。配置错误可能会使您的网关暴露给未授权访问。启用前请仔细阅读此页。

## 何时使用

当满足以下条件时使用 `trusted-proxy` 认证模式：

- 您在**身份感知代理**（如 Pomerium、Caddy + OAuth、nginx + oauth2-proxy、Traefik + forward auth）后面运行 OpenClaw
- 您的代理处理所有认证，并通过请求头传递用户身份信息
- 您处于 Kubernetes 或容器环境中，且代理是访问网关的唯一路径
- 遇到 WebSocket `1008 unauthorized` 错误，因为浏览器无法在 WS 负载中传递令牌

## 何时不使用

- 您的代理不进行用户认证（仅作为 TLS 终结器或负载均衡器）
- 存在绕过代理访问网关的路径（防火墙漏洞、内部网络访问等）
- 不确定代理是否正确剥离或覆盖转发的请求头
- 只需要个人单用户访问（建议用 Tailscale Serve + 回环接口进行更简单的设置）

## 工作原理

1. 反向代理对用户进行认证（OAuth、OIDC、SAML 等）
2. 代理通过请求头添加认证后的用户身份（例如 `x-forwarded-user: nick@example.com`）
3. OpenClaw 检查请求来自被信任的代理 IP（通过 `gateway.trustedProxies` 配置）
4. OpenClaw 从配置的请求头中提取用户身份
5. 如果验证通过，请求被授权

## 控制 UI 配对行为

当 `gateway.auth.mode = "trusted-proxy"` 激活且请求通过受信任代理检查时，Control UI 的 WebSocket 会话可以在无设备配对身份的情况下连接。

含义：

- 配对不再是此模式下 Control UI 访问的主要门槛
- 反向代理认证策略和 `allowUsers` 变为有效的访问控制
- 请确保网关入口仅限受信任代理 IP 访问（通过 `gateway.trustedProxies` 和防火墙限制）

## 配置示例

```json5
{
  gateway: {
    // trusted-proxy 认证期望请求来自非回环的受信任代理源
    bind: "lan",

    // 关键：只添加您代理的 IP 地址
    trustedProxies: ["10.0.0.1", "172.17.0.1"],

    auth: {
      mode: "trusted-proxy",
      trustedProxy: {
        // 包含认证用户身份的请求头（必填）
        userHeader: "x-forwarded-user",

        // 可选：必须存在的请求头（用于代理验证）
        requiredHeaders: ["x-forwarded-proto", "x-forwarded-host"],

        // 可选：限制特定用户（空数组表示允许所有）
        allowUsers: ["nick@example.com", "admin@company.org"],
      },
    },
  },
}
```

重要运行规则：

- trusted-proxy 认证会拒绝来自回环源的请求（`127.0.0.1`、`::1`、回环 CIDR）。
- 同主机回环反向代理**不**满足 trusted-proxy 认证要求。
- 对于同主机回环代理设置，请改用 token/password 认证，或通过 OpenClaw 可验证的非回环受信任代理地址进行路由。
- 非回环的 Control UI 部署仍需要显式配置 `gateway.controlUi.allowedOrigins`。
- **转发头证据会覆盖回环本地性。** 如果请求经由回环到达，但携带的 `X-Forwarded-For` / `X-Forwarded-Host` / `X-Forwarded-Proto` 头指向非本地来源，则该证据会使回环本地性声明失效。该请求会在配对、trusted-proxy 认证以及 Control UI 设备身份 gating 中被视为远程请求。这可防止同主机回环代理将转发头身份“洗白”并用于 trusted-proxy 认证。

### 配置字段说明

| 字段                                      | 必填 | 说明                                                     |
| ----------------------------------------- | ---- | -------------------------------------------------------- |
| `gateway.trustedProxies`                   | 是   | 数组，包含受信任代理的 IP 地址，来自其他 IP 的请求将被拒绝 |
| `gateway.auth.mode`                        | 是   | 必须设置为 `"trusted-proxy"`                             |
| `gateway.auth.trustedProxy.userHeader`    | 是   | 包含认证用户身份的请求头名称                              |
| `gateway.auth.trustedProxy.requiredHeaders`| 否   | 额外必须存在的请求头                                       |
| `gateway.auth.trustedProxy.allowUsers`    | 否   | 允许的用户身份白名单。为空表示允许所有认证用户             |

## TLS 终结和 HSTS

请使用单一 TLS 终结点，并在那里应用 HSTS。

### 推荐方式：代理 TLS 终结

当您的反向代理负责 `https://control.example.com` 的 HTTPS 时，在该代理配置 `Strict-Transport-Security` 头。

- 适合面向互联网部署
- 证书管理和 HTTP 强化策略集中
- OpenClaw 仍可通过代理后面的回环 HTTP 运行

示例头部值：

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### 网关 TLS 终结

若 OpenClaw 本身直接提供 HTTPS 服务（无 TLS 终结代理），请设置：

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

`strictTransportSecurity` 可接受字符串头部值，或显式设为 `false` 禁用。

### 部署建议

- 起初设置较短的 max-age（例如 `max-age=300`）以验证流量
- 确认无误后再增加到长期值（例如 `max-age=31536000`）
- 只有所有子域均支持 HTTPS 时才添加 `includeSubDomains`
- 仅在明确满足预加载要求时启用 preload
- 本地仅回环开发无需 HSTS

## 代理设置示例

### Pomerium

Pomerium 通过 `x-pomerium-claim-email`（或其他声明头）传递身份，以及在 `x-pomerium-jwt-assertion` 中传递 JWT。

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

Pomerium 配置示例：

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

### Caddy + OAuth

使用 `caddy-security` 插件的 Caddy 可以认证用户并传递身份头。

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

Caddyfile 示例：

```
openclaw.example.com {
    authenticate with oauth2_provider
    authorize with policy1

    reverse_proxy openclaw:18789 {
        header_up X-Forwarded-User {http.auth.user.email}
    }
}
```

### nginx + oauth2-proxy

oauth2-proxy 认证用户并在 `x-auth-request-email` 中传递身份。

```json5
{
  gateway: {
    bind: "lan",
    trustedProxies: ["10.0.0.1"], // nginx/oauth2-proxy IP
    auth: {
      mode: "trusted-proxy",
      trustedProxy: {
        userHeader: "x-auth-request-email",
      },
    },
  },
}
```

nginx 配置示例：

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

### Traefik + Forward Auth

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

## 混合 Token 配置

OpenClaw 拒绝模糊的配置，即 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）和 `trusted-proxy` 模式同时激活。混合 Token 配置可能导致回环请求在错误的认证路径上静默认证。

如果在启动时看到 `mixed_trusted_proxy_token` 错误：

- 在使用 trusted-proxy 模式时移除共享 token，或者
- 如果打算使用基于 token 的认证，将 `gateway.auth.mode` 切换为 `"token"`。

Loopback trusted-proxy 身份头仍然会失败关闭：同主机调用方不会被静默认证为代理用户。绕过代理的内部 OpenClaw 调用方可以改为使用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD` 进行认证。trusted-proxy 模式下仍有意不支持 token 回退。

## 操作员作用域请求头

trusted-proxy 认证是一种**携带身份**的 HTTP 模式，因此调用方可以
选择性地使用 `x-openclaw-scopes` 声明操作员作用域。

示例：

- `x-openclaw-scopes: operator.read`
- `x-openclaw-scopes: operator.read,operator.write`
- `x-openclaw-scopes: operator.admin,operator.write`

行为：

- 当请求头存在时，OpenClaw 会遵循所声明的作用域集合。
- 当请求头存在但为空时，请求声明**不包含**任何操作员作用域。
- 当请求头不存在时，普通的携带身份 HTTP API 会回退到标准的操作员默认作用域集合。
- Gateway-auth **插件 HTTP 路由**默认更窄：当 `x-openclaw-scopes` 不存在时，其运行时作用域会回退到 `operator.write`。
- 即使 trusted-proxy 认证成功，浏览器来源的 HTTP 请求仍必须通过 `gateway.controlUi.allowedOrigins`（或有意使用 Host 头回退模式）。

实用规则：

- 当您希望 trusted-proxy 请求比默认值更窄，或者当某个 gateway-auth 插件路由需要比写入作用域更强的权限时，请显式发送 `x-openclaw-scopes`。

## 安全检查清单

- [ ] **代理是唯一路径**：网关端口已通过防火墙限制，除您的代理外没有其他访问路径
- [ ] **trustedProxies is minimal**：仅包含实际代理 IP，不包含整个子网
- [ ] **No loopback proxy source**：trusted-proxy 认证会对来自回环源的请求失败关闭
- [ ] **Proxy strips headers**：您的代理会覆盖（而不是追加）来自客户端的 `x-forwarded-*` 请求头
- [ ] **TLS termination**：您的代理处理 TLS；用户通过 HTTPS 连接
- [ ] **allowedOrigins is explicit**：非回环 Control UI 使用显式的 `gateway.controlUi.allowedOrigins`
- [ ] **allowUsers is set**（recommended）：限制为已知用户，而不是允许任何已认证用户
- [ ] **No mixed token config**：不要同时设置 `gateway.auth.token` 和 `gateway.auth.mode: "trusted-proxy"`
- [ ] **本地密码回退是私有的**：如果您为内部直接调用方配置了 `gateway.auth.password`，请保持网关端口受防火墙限制，以免非代理远程客户端可直接访问。

## 安全审计

`openclaw security audit` 会针对 trusted-proxy 认证产生 **严重** 级别警告。这是设计使然——提醒您安全责任已委托给代理配置。

审计会检查：

- Base `gateway.trusted_proxy_auth` 警告/严重提醒
- 缺少 `trustedProxies` 配置
- 缺少 `userHeader` 配置
- `allowUsers` 为空（允许任何已认证用户）
- 暴露的 Control UI 界面存在通配符或缺失的浏览器来源策略

## 故障排查

### "trusted_proxy_untrusted_source"

请求非来自 `gateway.trustedProxies` 中的 IP。请检查：

- 代理 IP 配置是否正确？（Docker 容器 IP 可能变化）
- 是否存在负载均衡器在代理之前？
- 使用 `docker inspect` 或 `kubectl get pods -o wide` 检查真实 IP

### "trusted_proxy_loopback_source"

OpenClaw 拒绝了来自回环源的 trusted-proxy 请求。

检查：

- 代理是否从 `127.0.0.1` / `::1` 连接？
- 是否尝试在同主机回环反向代理中使用 trusted-proxy 认证？

修复：

- 对于同主机回环代理设置，请使用 token/password 认证，或
- 通过非回环受信任代理地址进行路由，并将该 IP 保留在 `gateway.trustedProxies` 中。

### "trusted_proxy_user_missing"

用户身份请求头为空或缺失。请检查：

- 代理是否配置传递身份请求头？
- 请求头名称拼写是否正确？（大小写不敏感，但拼写必须准确）
- 用户是否确实已在代理完成认证？

### "trusted*proxy_missing_header*"

必需请求头缺失。检查：

- 代理配置中相关请求头是否存在
- 请求链上是否有组件剥离了这些头部

### "trusted_proxy_user_not_allowed"

用户已认证但不在 `allowUsers` 中。请添加用户或清空白名单。

### "trusted_proxy_origin_not_allowed"

trusted-proxy 认证已成功，但浏览器的 `Origin` 请求头未通过 Control UI 来源检查。

检查：

- `gateway.controlUi.allowedOrigins` 是否包含精确的浏览器来源
- 除非您明确希望允许所有，否则不要依赖通配符来源
- 如果您有意使用 Host 头回退模式，请明确设置 `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true`

### WebSocket 仍然失败

检查代理是否：

- 支持 WebSocket 升级请求（`Upgrade: websocket`, `Connection: upgrade`）
- 在 WebSocket 升级请求时传递身份请求头（不仅限于 HTTP 请求）
- 没有为 WebSocket 连接设定独立认证路径

## Migrating from Token Authentication

If migrating from token authentication to trusted-proxy:

1. Configure proxy authentication and pass identity headers
2. Test the proxy configuration separately (use curl to test headers)
3. Update the OpenClaw configuration to trusted-proxy authentication
4. Restart the gateway
5. Test the Control UI WebSocket connection
6. Run `openclaw security audit` and check the results

## Related Links

- [Security](/gateway/security) — Complete security guide
- [Configuration](/gateway/configuration) — Configuration reference
- [Remote Access](/gateway/remote) — Other remote access options
- [Tailscale](/gateway/tailscale) — Simplified solution for tailnet only
