---
summary: "每个网关速率限制的参考：预身份验证套接字预算和锁定、浏览器和 Webhook 限制、控制平面写入逆止、ACP 会话上限以及重新启动冷却"
read_when:
  - "客户端看到 `rate limit exceeded for <method>`、`AUTH_RATE_LIMITED` 或锁定错误"
  - "您想要调`gateway.auth.rateLimit`"
  - "您正在考虑对暴露的网关进行暴力保护"
  - "您需要知道哪些网关表面受到限制，限制有哪些"
title: "速率限制"
---

网关强制执行多个独立的速率限制。它们保护不同的边界，锁定不同的身份，并因不同的错误形状而失败。此页面是所有这些内容的参考。

一目了然：

| 表面                              | 限制（默认）                  | 键入者                         | 可配置                              |
| ------------------------------------ | -------------------------------- | -------------------------------- | ----------------------------------------- |
| 未经身份验证的 WebSocket 握手 | 128 个未完成的套接字          | 已解决的客户端 IP               | `OPENCLAW_MAX_PREAUTH_CONNECTIONS_PER_IP` |
| 身份验证失败 （token/password/device）  | 10 次故障/60 秒，5 分钟锁定 | IP + 凭证范围            | `gateway.auth.rateLimit`                  |
| 浏览器源 WS 身份验证失败      | 相同，环回**not**豁免    | IP，或环回的页面来源 | `gateway.auth.rateLimit`                  |
| Webhook （`/hooks`） 身份验证失败     | 20 次故障/60 秒，60 秒锁定   | IP                               | no                                        |
| Control-plane 写入 RPC             | 每个方法 30 个请求/60 秒     | 方法+设备+IP（见下文） | no                                        |
| ACP 会话创建                 | 120 次/10 秒               | 翻译实例              | 内部的                                  |
| 网关重启周期               | 重启之间有 30 秒的冷却时间    | 过程                          | no                                        |

## <a id="unauthenticated-websocket-connections"></a> 未经身份验证的 WebSocket 连接

网关允许每个客户端 **128 个未验证的 WebSocket 连接 IP**。这是并发握手预算，而不是每分钟请求数限制或经过身份验证的客户端的上限。当认证成功或连接关闭时释放一个槽；失败的升级也会释放它们的插槽。环回连接也不例外。

超出预算的升级会收到 HTTP `503 Service Unavailable`，其主体为 `Too many unauthenticated sockets`，但没有 `Retry-After` 接头。错开连接或重新连接突发，以便现有的握手可以完成。

预算使用升级前解析的客户端IP：

- **直接连接：**规范化套接字对等体IP。同一 NAT 背后的客户共享公共源 IP，因此预算相同。
- **可信反向代理：**，当套接字对等体匹配`gateway.trustedProxies`时，OpenClaw从右到左遍历`X-Forwarded-For`，跳过环回和可信代理跃点，并使用第一个剩余的IP。仅当 `gateway.allowRealIpFallback: true` 并且该步行未找到客户端 IP 时，`X-Real-IP` 才是后备。代理必须覆盖或安全地重建这些标头。没有有效属性的代理型请求在获取槽位之前会被拒绝；他们不会退回到共享代理 IP 预算。
- **Cloudflare 隧道：** 相同的可信代理规则适用。严格信任直接的 `cloudflared` 套接字源，并检查安全的 `X-Forwarded-For` 链是否到达网关。 `CF-Connecting-IP` 不用于选择此预算。请参阅 [Cloudflare 隧道和 Access](/gateway/cloudflare-access)。
- **OpenClaw-托管 Tailscale 服务：** 专用私有侦听器使用来自 Tailscale 重写的 `X-Forwarded-For` 的客户端 IP，而不是环回套接字地址或Tailscale用户登录。针对普通侦听器的外部管理服务遵循上述可信代理规则。

默认情况下可容纳一个场地 NAT 后面的 100 人连接突发。要使用不同的预算，请在网关进程上设置环境覆盖并重新启动它。例如，要将重叠握手的限制降低到 32 次：

```bash
OPENCLAW_MAX_PREAUTH_CONNECTIONS_PER_IP=32 openclaw gateway run
```

使用正整数；无效值回落到 128。较高的预算允许更多未经身份验证的套接字同时保持打开状态，用更大的每 IP 资源限额换取更少的拒绝共享 NAT 突发。下面的握手超时、预身份验证帧大小和队列限制、源检查以及失败身份验证限制仍然有效。

## <a id="authentication-attempts-(pre-auth)"></a><a id="authentication-attempts-pre-auth"></a> 身份验证尝试（预身份验证）

在处理任何请求之前，每个客户端 IP 都会限制失败的身份验证尝试。这是暴露网关的强力防护。

- 仅_错误_凭据计数。缺少凭据（从未发送令牌的客户端）和成功的身份验证不会消耗预算。成功的身份验证通常会重置该客户端的匹配凭证类别计数器 IP；设备令牌的成功并不会消除共享秘密的失败，反之亦然。
- 默认值：每 60 秒 10 次故障，然后该 IP 锁定 5 分钟。
- 默认情况下，Loopback （`127.0.0.1` / `::1`） 不受限制，因此无法锁定本地 CLI 会话。
- 计数器按凭证类别划分范围，因此一个表面上的洪水不会取代另一个表面。范围包括共享网关 token/password、设备令牌、节点配对、配对节点重新批准、设备引导令牌和 watchOS 质询发布。

锁定时，连接尝试失败并显示：

```json
{
  "code": "INVALID_REQUEST",
  "message": "unauthorized: too many failed authentication attempts (retry later)",
  "retryable": true,
  "retryAfterMs": 297000,
  "details": {
    "code": "AUTH_RATE_LIMITED",
    "authReason": "rate_limited",
    "recommendedNextStep": "wait_then_retry"
  }
}
```

锁定期间，来自其他已解析 IP 的尝试（包括直接环回）不受影响。

在`openclaw.json`中的`gateway.auth.rateLimit`下调一下：

```json
{
  "gateway": {
    "auth": {
      "rateLimit": {
        "maxAttempts": 10,
        "windowMs": 60000,
        "lockoutMs": 300000,
        "exemptLoopback": true
      }
    }
  }
}
```

网关日志中重复的 `AUTH_RATE_LIMITED` 条目意味着有人在猜测凭据；请参阅 [ 曝光操作手册 ](/gateway/security/exposure-runbook)。

### <a id="browser-origin-connections"></a> 浏览器源连接

携带浏览器 `Origin` 标头的 WebSocket 连接使用相同的限制，但具有环回豁免 **始终关闭** — 本地浏览器中的恶意页面仍然是不受信任的客户端，因此本地主机无法在该路径上获得免费通行证。当这样的连接从环回地址到达时，​​其失败由规范化页面源（例如 `browser-origin:https://evil.example`）而不是共享环回 IP 决定，因此每个源都有自己的存储桶；对于非环回地址，密钥保留在客户端 IP 上。这是不可配置的。

### <a id="unconfigured-same-host-reverse-proxies"></a> 未配置的同主机反向代理

当请求从具有转发标头的环回套接字到达但 `gateway.trustedProxies` 中未配置代理时，OpenClaw 无法安全地将请求归因于声明的转发 IP。在检查凭据或回退身份验证之前，经过网关身份验证的路由会拒绝请求。 HTTP 请求接收 `403`，错误类型为 `proxy_attribution_required`； WebSocket auth 返回与配置指导相同的原因。注册的插件验证的 Webhook 路由可以通过自己的签名或凭证策略处理请求，但它们会忽略转发的客户端声明并使用非豁免套接字源进行预身份验证限制。

在 `gateway.trustedProxies` 中配置狭窄的代理地址，并让代理覆盖或安全地重建转发标头。然后，OpenClaw 恢复经过验证的每个客户端归因和速率限制存储桶。请参阅 [ 受信任代理 Auth](/gateway/trusted-proxy-auth) 和 [ 网关安全指南 ](/gateway/security/network-exposure#reverse-proxy-configuration)。

无标头 TCP 转发器不提供请求级来源，并且与直接通过环回连接的进程没有区别。此强化不会将该传输分类为代理。请勿使用同主机 TCP 转发器作为远程访问安全边界；使用如上所述配置的托管 Tailscale、SSH 或 HTTP 反向代理。

OpenClaw-driven Tailscale Serve 和 Funnel 使用单独的私有环回侦听器。到达该侦听器会建立托管入口路径，并且 Tailscale 重写的源地址会选择正常的非豁免、可重置的每个客户端存储桶。提供无令牌身份验证还需要匹配的 WhoIs 结果；漏斗需要其标记和密码身份验证。

仅当在 `gateway.trustedProxies` 中显式配置其直接源并且提供有效的非环回转发客户端地址时，针对普通网关侦听器的外部管理的服务或漏斗路由才能建立通用代理属性。 OpenClaw 然后使用该客户端地址进行速率限制并应用正常的网关身份验证； Tailscale 标头不授予托管入口或无令牌身份验证语义。如果没有该信任配置，网关身份验证的路由将拒绝无法归因的入口。当 OpenClaw 应该拥有路由及其专用侦听器时，首选 `gateway.tailscale.mode: "serve"` 或 `"funnel"`。

### Webhooks

HTTP `/hooks` 入口有其自己的失败限制器：每个客户端 IP 每 60 秒 20 次失败的身份验证，然后锁定 60 秒。环回也不例外。成功的挂钩身份验证将重置计数器。受限制的请求接收带有 `Retry-After` 标头（秒）的普通 HTTP `429 Too Many Requests`。限制是固定的；如果合法的集成失败了，请修复其凭据而不是更加努力地重试。

## <a id="control-plane-writes-(post-auth-backstop)"></a><a id="control-plane-writes-post-auth-backstop"></a> Control-plane 写入（授权后逆止器）

写入端管理 RPC（`config.apply`、`config.patch`、`plugins.install`、`plugins.setEnabled`、`plugins.uninstall`、`update.run`、`worktrees.*`、`gateway.restart.request`，...）还受到速率限制**** 授权后：每 60 秒、每个方法、每个 `deviceId+clientIp` 30 个请求。

WebSocket 客户端提供该密钥的两个部分。管理 HTTP 控制器不携带设备 ID，因此它们的存储桶仅是已解析的客户端 IP，并且一个代理后面的控制器共享预算。有关控制器端视图，请参阅 [ 外部应用程序](/gateway/external-apps)。

这不是一个安全边界——调用者已经持有 `operator.admin`——它是一个后盾，可以限制失控的客户端或代理循环，从而打击昂贵的操作。交互式使用永远不会成功；每个方法都有自己的存储桶，因此切换插件不会消耗配置写入的预算。

超出时，请求将失败并出现可重试错误：

```json
{
  "code": "UNAVAILABLE",
  "message": "rate limit exceeded for config.patch; retry after 35s",
  "retryable": true,
  "retryAfterMs": 34539,
  "details": { "method": "config.patch", "limit": "30 per 60s" }
}
```

客户应遵守`retryAfterMs`。限制是固定的（不可配置）；存储桶会自行过期并由网关维护进行修剪。

## <a id="acp-session-creation"></a> ACP 会话创建

ACP 转换器将会话创建上限限制为每个转换器实例每 10 秒窗口创建 120 个新会话。超过该值会使请求失败并出现错误，其消息中包含等待时间（此路径上没有结构化的 `retryAfterMs` 字段）：

```
ACP session creation rate limit exceeded for <method>; retry after <n>s.
```

这限制了在循环中创建会话的失控客户端；正常 IDE 和代理使用远远低于它。

## <a id="restart-cooldown"></a> 重启冷却时间

网关重新启动请求合并，然后在重新启动周期之间强制执行 30 秒的冷却时间。冷却期间请求的重新启动将在其过期后安排，而不是被拒绝。这与上面的控制平面限制器是分开的：`gateway.restart.request` 消耗控制平面预算槽并导致重新启动遵循冷却时间。

## <a id="operational-notes"></a> 操作说明

- 所有限制器都位于内存中且针对每个进程，并且多个网关不共享状态。替换网关进程会清除网关拥有的计数器（身份验证锁定、Webhook 节流、控制平面存储桶）。重启冷却故意在进程内重启周期中保留下来——这就是它所限制的——并且仅随着进程而重置。 ACP 会话上限属于其转换器实例，并在重新创建该实例时重置，而不是在网关重新启动时重置。
- Bucket 映射是有界的（硬条目上限加上定期修剪），因此唯一键泛洪无法无界地增加内存。
- 当客户端位于反向代理后面时，有效的 IP 是已解析的客户端 IP。未配置的环回代理将被拒绝，直到其地址和标头重建行为被明确信任为止。请参阅 [trusted proxy auth](/gateway/trusted-proxy-auth) 了解如何在代理标头影响归因之前对其进行验证。
- Retry 信号因表面而异：网关 RPC 限制器返回 `retryable: true` 加上 `retryAfterMs`，webhook 入口使用带有 `Retry-After` 标头的 HTTP 429，并且 ACP 将等待嵌入错误消息中。在任何情况下，请在指定的时间内后退，而不是立即重试。
