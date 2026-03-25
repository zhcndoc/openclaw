---
title: "受信任代理认证"
summary: "将网关认证委托给受信任的反向代理（Pomerium、Caddy、nginx + OAuth）"
read_when:
  - 在身份感知代理后运行 OpenClaw
  - 在 OpenClaw 前配置 Pomerium、Caddy 或带 OAuth 的 nginx
  - 修复反向代理设置中 WebSocket 1008 未授权错误
  - 决定在哪里设置 HSTS 和其他 HTTP 强化头
---

# 受信任代理认证

> ⚠️ **安全敏感功能。** 此模式将认证完全委托给您的反向代理。配置错误可能导致网关暴露于未授权访问。启用前请仔细阅读本页内容。

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
    // 对于同机代理使用 loopback；远程代理请用 lan 或自定义
    bind: "loopback",

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

如果 `gateway.bind` 配置为 `loopback`，请在 `gateway.trustedProxies` 中包含相应的回环代理地址（如 `127.0.0.1`、`::1` 或等效回环 CIDR）。

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
    trustedProxies: ["127.0.0.1"], // Caddy 本机 IP
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

## 安全检查清单

启用 trusted-proxy 认证前请确认：

- [ ] **代理是唯一访问路径**：网关端口仅允许代理 IP 访问，防火墙已限制其他入口
- [ ] **trustedProxies 配置严格**：仅包含真是代理 IP ，避免整个子网
- [ ] **代理剥离请求头**：代理覆盖（非追加）客户端的 `x-forwarded-*` 头
- [ ] **TLS 终结完成**：代理负责 TLS，用户通过 HTTPS 连接
- [ ] **合理配置 allowUsers**（推荐）：限制为已知用户，避免允许所有认证用户

## 安全审计

`openclaw security audit` 会针对 trusted-proxy 认证产生 **严重** 级别警告。这是设计使然——提醒您安全责任已委托给代理配置。

审计会检查：

- 是否缺失 `trustedProxies` 配置
- 是否缺失 `userHeader` 配置
- `allowUsers` 是否为空（允许所有认证用户）

## 故障排查

### "trusted_proxy_untrusted_source"

请求非来自 `gateway.trustedProxies` 中的 IP。请检查：

- 代理 IP 配置是否正确？（Docker 容器 IP 可能变化）
- 是否存在负载均衡器在代理之前？
- 使用 `docker inspect` 或 `kubectl get pods -o wide` 检查真实 IP

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

### WebSocket 仍然失败

检查代理是否：

- 支持 WebSocket 升级请求（`Upgrade: websocket`, `Connection: upgrade`）
- 在 WebSocket 升级请求时传递身份请求头（不仅限于 HTTP 请求）
- 没有为 WebSocket 连接设定独立认证路径

## 从 Token Auth 迁移

如果从 token 认证迁移到 trusted-proxy：

1. 配置代理认证并传递身份头
2. 单独测试代理配置（使用 curl 测试请求头）
3. 更新 OpenClaw 配置为 trusted-proxy 认证
4. 重启网关
5. 测试 Control UI 的 WebSocket 连接
6. 运行 `openclaw security audit` 并检查结果

## 相关链接

- [安全](/gateway/security) — 完整安全指南
- [配置](/gateway/configuration) — 配置参考
- [远程访问](/gateway/remote) — 其他远程访问方案
- [Tailscale](/gateway/tailscale) — 仅限 tailnet 的简化方案
