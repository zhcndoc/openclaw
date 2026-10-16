---
summary: "如何通过由运维管理的过滤代理路由 OpenClaw 运行时 HTTP 和 WebSocket 流量"
title: "网络代理"
read_when:
  - "你希望针对 SSRF 和 DNS rebinding 攻击实现纵深防御"
  - "为 OpenClaw 运行时流量配置外部正向代理"
---

OpenClaw 可以通过运营商管理的转发代理路由运行时 HTTP 和 WebSocket 流量。这是可选的深度防御：中央出口控制、更强的 SSRF 保护以及网络边界的目标可审核性。由于代理在连接时评估目标，在 DNS 解析之后和打开上游连接之前，它还缩小了 DNS- 重新绑定攻击所依赖的早期应用程序级 DNS 检查与实际出站连接之间的差距。单一代理策略还为运营商提供了一个实施目标规则、网络分段、速率限制或出站允许列表的地方，而无需重建 OpenClaw。

OpenClaw 不会提供、下载、启动、配置或认证代理。你运行适合你环境的代理技术；OpenClaw 会将其自身的 HTTP 和 WebSocket 客户端通过该代理进行路由。

## <a id="configuration"></a> 配置

```yaml
proxy:
  proxyUrl: http://127.0.0.1:3128
```

您也可以通过环境变量设置该 URL：

```bash
OPENCLAW_PROXY_URL=http://127.0.0.1:3128 openclaw gateway run
```

`proxy.proxyUrl` 优先于 `OPENCLAW_PROXY_URL`。配置的 URL 激活托管代理路由；删除这两个 URL 将禁用它。

| 键                  | 类型                                 | 默认值        | 笔记                                                                                                                                 |
| -------------------- | ------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `proxy.proxyUrl`     | 字符串                               | 未设置          | `http://` 或 `https://` 转发代理 URL。 URL 中嵌入的凭证被视为敏感凭证，并从 snapshots/logs. 中进行编辑 |
| `proxy.tls.caFile`   | 字符串                               | 未设置          | 用于验证由私有 CA 签名的 `https://` 代理端点的 CA 证书包。                                                          |
| `proxy.loopbackMode` | `gateway-only` \| `proxy` \| `block` | `gateway-only` | 控制环回绕过行为；见下文。                                                                                         |

对于托管网关服务，请将 URL 存储在配置中，这样即使重新安装也能保留，而不是依赖前台环境变量：

```bash
openclaw config set proxy.proxyUrl http://127.0.0.1:3128
openclaw gateway install --force
openclaw gateway start
```

`OPENCLAW_PROXY_URL` env 后备最适合前台运行。要将其与已安装的服务一起使用，请将其放入该服务的持久环境（`$OPENCLAW_STATE_DIR/.env`，默认 `~/.openclaw/.env`），然后重新安装，以便 launchd/systemd/Scheduled 任务拾取它。该变量被复制到生成的服务环境中，而不是作为托管 dotenv 密钥进行跟踪，因此 systemd 的仅重新启动托管 dotenv 刷新不适用。

### <a id="https-proxy-endpoint-with-a-private-ca"></a> 使用私有 CA 的 HTTPS 代理端点

```yaml
proxy:
  proxyUrl: https://proxy.corp.example:8443
  tls:
    caFile: /etc/openclaw/proxy-ca.pem
```

`proxy.tls.caFile`验证代理端点自己的TLS证书。这不是目标MITM信任设置、客户端证书或代理目标策略的替代项。使用`NODE_EXTRA_CA_CERTS`相反，只有当整个Node进程必须信任一个额外的CA从启动（例如，企业TLS-检查系统重新签名每个HTTPS目标证书）——该变量是进程全局的，必须在之前设置Node开始，所以OpenClaw无法按照其应用方式在运行中应用它`proxy.tls.caFile`。更喜欢`proxy.tls.caFile`为了HTTPS代理端点信任：它的范围仅限于托管代理路由而不是整个过程。

```bash
openclaw config set proxy.proxyUrl https://proxy.corp.example:8443
openclaw config set proxy.tls.caFile /etc/openclaw/proxy-ca.pem
openclaw gateway run
```

## <a id="how-routing-works"></a> 路由工作原理

使用有效的代理 URL 时，受保护的运行时进程（`openclaw gateway run`、`openclaw node run`、`openclaw agent --local`）会将普通的 HTTP 和 WebSocket 出站流量通过代理路由：

```text
OpenClaw process
  fetch, node:http, node:https, WebSocket clients  -> operator proxy -> destination
```

在内部，OpenClaw 将 [Proxyline](https://github.com/openclaw/proxyline) 作为进程级路由运行时。它覆盖 `fetch`、基于 undici 的客户端、`node:http`/`node:https`、常见的 WebSocket 客户端以及由辅助函数创建的 `CONNECT` 隧道，并且会替换调用方提供的 Node HTTP agents，因此显式指定的 agents（包括 `axios`、`got`、`node-fetch` 以及类似的基于 Node-agent 的客户端）不能悄悄绕过代理。

代理 URL 的 scheme 描述的是从 OpenClaw 到代理的跳转，而不是到最终目标的跳转：

- `http://proxy.example:3128` — 到代理的纯 TCP；OpenClaw 发送 HTTP 代理请求，包括面向 HTTPS 目标的 `CONNECT`。
- `https://proxy.example:8443` — OpenClaw 先与代理本身建立 TLS（验证代理的证书），然后在该会话中发送 HTTP 代理请求。

目标 TLS 与代理端点 TLS 相互独立：对于 HTTPS 目标，OpenClaw 总是向代理请求 `CONNECT` 隧道，并通过该隧道启动目标 TLS。

默认`gateway-only`模式下，环回HTTP和WebSocket请求直接连接。这包括 `localhost`、文字 IPv4/IPv6 环回地址以及本机 Codex 推理中继使用的临时侦听器。 OpenClaw 将此规则安装在共享路由所有者中，并用本机子进程的仅环回条目替换 `no_proxy`/`NO_PROXY`。外部目标仍然使用代理；其他目标的继承旁路不适用。关闭时，OpenClaw 恢复之前的代理环境并重置缓存的路由状态。显式 `proxy` 和 `block` 模式继续清除 `no_proxy`/`NO_PROXY`.

某些插件拥有自定义传输，即使进程级路由已启用，也需要它们自己的代理配置。Telegram 的 Bot API 客户端使用其自己的 HTTP/1 undici dispatcher，并且还会单独遵循进程代理环境变量以及 `OPENCLAW_PROXY_URL` 回退。

### <a id="gateway-loopback-mode"></a> Gateway 回环模式

本地 Gateway 控制平面客户端通常连接到一个回环 WebSocket，例如 `ws://127.0.0.1:18789`。`proxy.loopbackMode` 控制这类流量是否绕过受管代理：

```yaml
proxy:
  proxyUrl: http://127.0.0.1:3128
  loopbackMode: gateway-only # gateway-only, proxy, or block
```

已配置的 `proxyUrl` 或 `OPENCLAW_PROXY_URL` 会启用受管路由。将 `proxy.enabled: false` 仅作为一种高级退出选项，它会保留已存储的 URL，但不会激活它。

| 模式                     | 行为                                                                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `gateway-only`（默认） | 环回 HTTP 和 WebSocket 流量直接连接，包括网关、浏览器 CDP、更新准备情况和本机 Codex 推理中继侦听器。不需要端点注册。 |
| `proxy`                  | 环回流量通过代理。远程代理会针对自身解析 `127.0.0.1`/`localhost`，因此此模式可能会破坏本地运行时侦听器。                                   |
| `block`                  | OpenClaw 在打开套接字之前拒绝网关控制平面、浏览器 CDP 和受保护的本地提供商环回连接。其他请求使用代理。                                 |

隐式绕过涵盖 `localhost` 和文字环回 IP URL。 LAN、tailnet、专用网络和公共主机继续通过托管代理。应用程序级 SSRF 检查仍然适用于不受信任的目标。

本地网关HTTP健康检查也遵循此策略，包括Doctor使用的HTTPS检查和重启检查。 HTTPS 检查验证每个连接上配置的网关证书指纹；启用代理不会禁用该验证。

更新金丝雀 `/startupz` 和 `/readyz` 检查使用相同的环回路由策略。如果正在运行的金丝雀从未在验证预算内做出答复，则更新会将观察到的失败记录为警告，包括下一个故障排除步骤，并继续尽力而为。

仅环境 HTTP 代理路由遵循 `no_proxy`/`NO_PROXY`（小写字母优先）。这些环境绕过列表不会覆盖托管代理策略。

### <a id="webchat-or-codex-fails-after-upgrading"></a> WebChat 或 Codex 升级后失败

2026.9.4 中添加的本机 Codex 推理中继使用临时本地侦听器。较旧的托管代理路由可以将该跃点转发到外部代理，从而为 `127.0.0.1` 响应 URL 生成 `502 Bad Gateway`、`Handshake not finished` 或 `stream disconnected before completion`。

当前的默认路由保持这些跃点直接，无需更改配置。运行 `openclaw doctor` 以测试主动代理下的环回连接。如果诊断失败，请检查 `openclaw config get proxy`。对于显式限制性环回模式，请使用以下命令恢复默认值：

```bash
openclaw config set proxy.loopbackMode gateway-only
openclaw gateway restart
```

对于较旧的安装，临时解决方法是将 `proxy.enabled` 设置为 `false`，保持 `HTTP_PROXY`/`HTTPS_PROXY` 指向操作员代理，设置 `NO_PROXY=127.0.0.1,localhost,::1`，然后重新启动网关。如果需要，请将这些环境变量保留在网关服务环境中。

### <a id="containers"></a> 容器

对于 `openclaw --container ...` 命令，OpenClaw 在设置时将 `OPENCLAW_PROXY_URL` 转发到容器目标子 CLI 中。 URL 必须可从容器内部访问 - `127.0.0.1` 指的是容器本身，而不是主机。 OpenClaw 拒绝针对容器的命令的环回代理 URL，除非您设置 `OPENCLAW_CONTAINER_ALLOW_LOOPBACK_PROXY_URL=1` 显式覆盖该检查。

## <a id="related-proxy-terms"></a> 相关代理术语

- `proxy.enabled` / `proxy.proxyUrl` — 运行时出口流量的出站正向代理路由。本页。
- `gateway.auth.mode: "trusted-proxy"` — 用于 Gateway 访问的入站、具备身份感知的反向代理认证。参见 [受信任代理认证](/gateway/trusted-proxy-auth)。
- `openclaw proxy` — 用于开发和支持的本地调试代理与抓包检查器。参见 [openclaw proxy](/cli/proxy)。
- `tools.web.fetch.useTrustedEnvProxy` — 为 `web_fetch` 提供可选支持，使由操作员控制的 HTTP(S) 环境代理在默认保持严格 DNS 绑定和主机名策略的同时解析 DNS。参见 [Web fetch](/tools/web-fetch#trusted-env-proxy)。
- 基于 Channel 或 provider 的代理设置 — 针对单个传输的所有者级覆盖。建议优先使用受管理的网络代理，以便在整个运行时中集中控制出口流量。

## <a id="validating-the-proxy"></a> 验证代理

代理的目标策略才是真正的安全边界；OpenClaw 无法验证你的代理是否阻止了正确的目标。请将其配置为：

- 仅绑定到环回或私有可信接口，只能通过 OpenClaw process/host/container/service 帐户访问。
- 自行解析目标，并在连接时于 DNS 解析之后按 IP 进行阻止，同时适用于普通 HTTP 和 HTTPS `CONNECT` 隧道。
- 拒绝基于目标的绕过，包括回环、私有、链路本地、元数据、多播、保留和文档地址段。
- 除非你完全信任 DNS 解析路径，否则不要使用主机名白名单。
- 记录目标、决策、状态和原因——绝不要记录请求体、授权头、Cookie 或其他机密信息。
- 将该策略纳入版本控制，并将变更视为安全敏感操作进行审查。

从运行 OpenClaw 的同一 host/container/service 帐户进行验证：

```bash
openclaw proxy validate --proxy-url http://127.0.0.1:3128
```

使用私有 CA 的 HTTPS 代理端点：

```bash
openclaw proxy validate --proxy-url https://proxy.corp.example:8443 --proxy-ca-file /etc/openclaw/proxy-ca.pem
```

| 标志                     | 用途                                                              |
| ------------------------ | -------------------------------------------------------------------- |
| `--proxy-url <url>`      | 验证此 URL 而不是解析 config/env.                   |
| `--proxy-ca-file <path>` | HTTPS 代理端点的 CA 证书包。                               |
| `--allowed-url <url>`    | 预期应成功的目标（可重复）。                        |
| `--denied-url <url>`     | 预期应被阻止的目标（可重复）。                     |
| `--apns-reachable`       | 还要验证代理是否可以通过隧道直接沙箱 APNs HTTP/2 检查。 |
| `--apns-authority <url>` | 覆盖使用 `--apns-reachable` 检查的 APNs 权限。         |
| `--timeout-ms <ms>`      | 每个请求的超时时间。                                                 |
| `--json`                 | 机器可读输出。                                             |

如果没有可用的配置、环境变量或 `--proxy-url` 值，命令会报告配置问题；在更改配置之前，可传入 `--proxy-url` 进行一次性预检。

如果没有 `--allowed-url`/`--denied-url`，则默认检查为：`https://example.com/` 必须成功，并且必须阻止代理无法到达的临时环回金丝雀服务器。环回检查在传输失败或缺少金丝雀每次运行令牌的非 2xx 响应时通过；它在缺少令牌的 2xx 响应上失败（来自金丝雀以外的其他东西的意外成功），特别是在任何携带匹配令牌的响应上，因为这证明代理实际上转发了它应该拒绝的环回目标。自定义 `--denied-url` 目标没有这样的金丝雀令牌，因此验证会拒绝不确定的结果：任何 HTTP 响应都被视为可到达，并且传输错误也无法通过检查，因为 OpenClaw 无法确认您的代理拒绝了可到达的源与其他问题。只有内置的环回金丝雀将传输错误视为阻塞的证据。相同规则的CLI-side声明参见[`openclaw proxy`](/cli/proxy)。 `--apns-reachable` 故意发送无效的提供商令牌，因此 `403 InvalidProviderToken` 响应可作为隧道到达 Apple 的证据。如果验证失败，该命令将退出 `1`；代理 URL 凭证是从文本和 JSON 输出中编辑的。

```json
{
  "ok": true,
  "config": {
    "enabled": true,
    "proxyUrl": "http://127.0.0.1:3128/",
    "source": "override",
    "errors": []
  },
  "checks": [
    { "kind": "allowed", "url": "https://example.com/", "ok": true, "status": 200 },
    { "kind": "apns", "url": "https://api.sandbox.push.apple.com", "ok": true, "status": 403 }
  ]
}
```

手动 `curl` 检查（公共请求应成功；回环和元数据请求应被代理本身阻止——单独使用 `curl` 无法像 `openclaw proxy validate` 的内置探针那样区分代理拒绝与目标不可达）：

```bash
curl -x http://127.0.0.1:3128 https://example.com/
curl -x http://127.0.0.1:3128 http://127.0.0.1/
curl -x http://127.0.0.1:3128 http://169.254.169.254/
```

## <a id="recommended-blocked-destinations"></a> 推荐阻止的目标

启动任何转发代理、防火墙或出口策略的拒绝列表。 OpenClaw 自己的 SSRF 分类器位于 `src/infra/net/ssrf.ts` 和 `packages/net-policy/src/ip.ts`（`BLOCKED_HOSTNAMES`、`BLOCKED_IPV4_SPECIAL_USE_RANGES`、`BLOCKED_IPV6_SPECIAL_USE_RANGES`、RFC 2544 基准前缀，以及用于 NAT64/6to4/Teredo/ISATAP/IPv4-mapped 表单的嵌入式 IPv4 处理） — 有用的参考，但 OpenClaw 不会在外部代理中导出或强制执行这些规则。

| 范围或主机                                                                        | 阻止原因                                      |
| ------------------------------------------------------------------------------------ | ------------------------------------------------- |
| `127.0.0.0/8`, `localhost`, `localhost.localdomain`                                  | IPv4 回环                                     |
| `::1/128`                                                                            | IPv6 回环                                     |
| `0.0.0.0/8`, `::/128`                                                                | 未指定 / 本网络地址              |
| `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`                                      | RFC 1918 私有网络                         |
| `169.254.0.0/16`, `fe80::/10`                                                        | 链路本地，包括常见的云元数据路径 |
| `169.254.169.254`, `metadata.google.internal`                                        | 云元数据服务                           |
| `100.64.0.0/10`                                                                      | 运营商级 NAT 共享地址空间            |
| `198.18.0.0/15`, `2001:2::/48`                                                       | 基准测试范围                               |
| `192.0.0.0/24`, `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`, `2001:db8::/32` | 特殊用途和文档范围              |
| `224.0.0.0/4`, `ff00::/8`                                                            | 组播                                         |
| `240.0.0.0/4`                                                                        | 预留 IPv4                                     |
| `fc00::/7`, `fec0::/10`                                                              | IPv6 local/private 系列                         |
| `100::/64`, `2001:20::/28`                                                           | IPv6 丢弃和 ORCHIDv2 范围                  |
| `64:ff9b::/96`, `64:ff9b:1::/48`                                                     | 带嵌入式 IPv4 的 NAT64 前缀                 |
| `2002::/16`, `2001::/32`                                                             | 带嵌入式 IPv4 的 6to4 和 Teredo                |
| `::/96`, `::ffff:0:0/96`                                                             | IPv4- 兼容和 IPv4- 映射 IPv6              |

添加任何你的云提供商或网络平台文档中提到的其他元数据主机或保留范围。

## <a id="limits"></a> 限制

| 表面                                                      | 托管代理状态                                                                                                                                     |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fetch`, `node:http`, `node:https`, 常见 WebSocket 客户端 | 配置后会通过托管代理钩子路由。                                                                                                      |
| APNs 直接 HTTP/2                                           | 通过 APNs 托管的 `CONNECT` 助手路由。                                                                                                        |
| 网关控制平面回环                               | 默认模式下直接用于环回 HTTP/WebSocket 目标。                                                                                     |
| 调试代理上游转发                              | 在托管代理模式处于活动状态时禁用，除非为本地诊断显式启用。                                                             |
| IRC                                                          | 原始 TCP/TLS；不通过托管 HTTP 代理模式代理。如果你的部署要求所有出站流量都通过转发代理，请设置 `channels.irc.enabled: false`。 |
| 其他原始 `net`、`tls` 或 `http2` 客户端调用              | 在落地前必须由原始套接字守卫进行分类。                                                                                               |

- 这是 JavaScript HTTP/WebSocket 客户端的进程级覆盖，而不是 OS- 级网络沙箱。
- Raw `net`、`tls`、`http2` 套接字、本机插件和非 OpenClaw 子进程可能会绕过 Node- 级路由，除非它们继承并尊重代理环境变量。分叉的 OpenClaw 子 CLI 继承托管代理 URL 和 `proxy.loopbackMode` 状态。
- Loopback路由默认模式下是直接的；这不是一般的本地网络旁路。 LAN、尾网、专用网络和公共模型主机仍然使用托管代理。受保护的本地提供商保留其配置来源和 DNS 检查。
- 在托管代理模式处于活动状态时，本地调试代理的直接上游转发（用于代理请求和 `CONNECT` 隧道）默认禁用；仅在获批的本地诊断中启用。
- OpenClaw 不会检查、测试或认证你的代理策略。请将代理策略更改视为安全敏感的运维变更。

## <a id="related"></a> 相关内容

- [威胁模型](/security/THREAT-MODEL-ATLAS) — 针对 OpenClaw 平台和 ClawHub 的对抗性威胁，映射到 MITRE ATLAS
- [Security](/gateway/security) — 运行 OpenClaw 的信任模型、安全默认值和强化指南
- [Proxy](/cli/proxy) — `openclaw proxy`，验证操作员管理的代理路由并运行本地调试捕获代理
