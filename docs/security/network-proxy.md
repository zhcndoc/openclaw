---
summary: "如何通过由运维管理的过滤代理路由 OpenClaw 运行时 HTTP 和 WebSocket 流量"
title: "网络代理"
read_when:
  - 你希望针对 SSRF 和 DNS rebinding 攻击实现纵深防御
  - 为 OpenClaw 运行时流量配置外部正向代理
---

OpenClaw 可以通过由运维人员管理的正向代理来路由运行时 HTTP 和 WebSocket 流量。这是一种可选的纵深防御：集中出口控制、更强的 SSRF 防护，以及在网络边界上的目标可审计性。由于代理会在连接时评估目标，即在 DNS 解析之后、并且在打开上游连接之前，它也缩小了 DNS rebinding 攻击所依赖的时间窗口——也就是早先应用层 DNS 检查与实际出站连接之间的间隙。单一代理策略还为运维人员提供了一个统一位置来强制执行目标规则、网络分段、速率限制或出站允许列表，而无需重建 OpenClaw。

OpenClaw 不会提供、下载、启动、配置或认证代理。你运行适合你环境的代理技术；OpenClaw 会将其自身的 HTTP 和 WebSocket 客户端通过该代理进行路由。

## 配置

```yaml
proxy:
  enabled: true
  proxyUrl: http://127.0.0.1:3128
```

你也可以在环境中设置 URL，同时保持 `proxy.enabled: true` 在配置中：

```bash
OPENCLAW_PROXY_URL=http://127.0.0.1:3128 openclaw gateway run
```

`proxy.proxyUrl` 的优先级高于 `OPENCLAW_PROXY_URL`。如果 `proxy.enabled` 为 `true` 但没有解析出有效的 URL，受保护的命令会在启动时失败，而不是回退到直接网络访问。

| Key                  | Type                                 | Default        | Notes                                                                                                                                 |
| -------------------- | ------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `proxy.enabled`      | boolean                              | unset          | 必须为 `true` 才能激活路由。                                                                                                           |
| `proxy.proxyUrl`     | string                               | unset          | `http://` 或 `https://` 的正向代理 URL。URL 中嵌入的凭据会被视为敏感信息，并在快照/日志中被脱敏。                                      |
| `proxy.tls.caFile`   | string                               | unset          | 用于验证由私有 CA 签名的 `https://` 代理端点的 CA 证书包。                                                                             |
| `proxy.loopbackMode` | `gateway-only` \| `proxy` \| `block` | `gateway-only` | 控制回环绕过行为；见下文。                                                                                                             |

对于托管网关服务，请将 URL 存储在配置中，这样即使重新安装也能保留，而不是依赖前台环境变量：

```bash
openclaw config set proxy.enabled true
openclaw config set proxy.proxyUrl http://127.0.0.1:3128
openclaw gateway install --force
openclaw gateway start
```

`OPENCLAW_PROXY_URL` 环境变量回退最适合前台运行。若要在已安装的服务中使用它，请将其放入服务的持久环境中（`$OPENCLAW_STATE_DIR/.env`，默认 `~/.openclaw/.env`），然后重新安装，以便 launchd/systemd/计划任务能够读取它。

### 使用私有 CA 的 HTTPS 代理端点

```yaml
proxy:
  enabled: true
  proxyUrl: https://proxy.corp.example:8443
  tls:
    caFile: /etc/openclaw/proxy-ca.pem
```

`proxy.tls.caFile` 用于验证代理端点自身的 TLS 证书。它不是目标 MITM 信任设置，不是客户端证书，也不能替代代理的目标策略。只有在整个 Node 进程必须从启动时起信任额外 CA 时，才改用 `NODE_EXTRA_CA_CERTS`（例如企业 TLS 检查系统为每个 HTTPS 目标证书重新签名）——该变量是进程全局的，必须在 Node 启动前设置，因此 OpenClaw 无法像应用 `proxy.tls.caFile` 那样在运行中间应用它。对于 HTTPS 代理端点信任，优先使用 `proxy.tls.caFile`：它的作用范围仅限于受管理的代理路由，而不是整个进程。

```bash
openclaw config set proxy.enabled true
openclaw config set proxy.proxyUrl https://proxy.corp.example:8443
openclaw config set proxy.tls.caFile /etc/openclaw/proxy-ca.pem
openclaw gateway run
```

## 路由工作原理

当 `proxy.enabled: true` 且 URL 有效时，受保护的运行时进程（`openclaw gateway run`、`openclaw node run`、`openclaw agent --local`）会通过代理路由普通的 HTTP 和 WebSocket 出站流量：

```text
OpenClaw process
  fetch, node:http, node:https, WebSocket clients  -> operator proxy -> destination
```

在内部，OpenClaw 将 [Proxyline](https://github.com/openclaw/proxyline) 作为进程级路由运行时。它覆盖 `fetch`、基于 undici 的客户端、`node:http`/`node:https`、常见的 WebSocket 客户端以及由辅助函数创建的 `CONNECT` 隧道，并且会替换调用方提供的 Node HTTP agents，因此显式指定的 agents（包括 `axios`、`got`、`node-fetch` 以及类似的基于 Node-agent 的客户端）不能悄悄绕过代理。

代理 URL 的 scheme 描述的是从 OpenClaw 到代理的跳转，而不是到最终目标的跳转：

- `http://proxy.example:3128` — 到代理的纯 TCP；OpenClaw 发送 HTTP 代理请求，包括面向 HTTPS 目标的 `CONNECT`。
- `https://proxy.example:8443` — OpenClaw 先与代理本身建立 TLS（验证代理的证书），然后在该会话中发送 HTTP 代理请求。

目标 TLS 与代理端点 TLS 相互独立：对于 HTTPS 目标，OpenClaw 总是向代理请求 `CONNECT` 隧道，并通过该隧道启动目标 TLS。

当代理处于活动状态时，OpenClaw 会清除 `no_proxy`/`NO_PROXY`。这些绕过列表是基于目标地址的；如果把 `localhost` 或 `127.0.0.1` 留在里面，就会让 SSRF 目标完全跳过代理。关闭时，OpenClaw 会恢复之前的代理环境并重置缓存的路由状态。

某些插件拥有自定义传输，即使进程级路由已启用，也需要它们自己的代理配置。Telegram 的 Bot API 客户端使用其自己的 HTTP/1 undici dispatcher，并且还会单独遵循进程代理环境变量以及 `OPENCLAW_PROXY_URL` 回退。

### Gateway 回环模式

本地 Gateway 控制平面客户端通常连接到一个回环 WebSocket，例如 `ws://127.0.0.1:18789`。`proxy.loopbackMode` 控制这类流量是否绕过受管代理：

```yaml
proxy:
  enabled: true
  proxyUrl: http://127.0.0.1:3128
  loopbackMode: gateway-only # gateway-only, proxy, or block
```

| 模式                     | 行为                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gateway-only`（默认）   | OpenClaw 会将当前活动的 Gateway 回环 authority 注册为直连例外，因此本地 Gateway WebSocket 流量无需经过代理即可连接。自定义回环端口也可工作，因为该例外会精确指向已配置的 host/port。内置浏览器插件会为 OpenClaw 启动的受管浏览器的精确本地 CDP 就绪和 DevTools WebSocket URL 注册同类例外；内置 Ollama memory embedding provider 则为其精确配置的、主机本地回环 embedding origin 提供更窄的受保护直连路径。 |
| `proxy`                  | 不注册任何回环例外；Gateway 和 Ollama 的回环流量会通过代理。远程代理必须能够将流量路由回 OpenClaw 主机的回环服务（例如通过可达的 hostname、IP 或隧道）——标准的远程代理会把 `127.0.0.1`/`localhost` 解析到它自己，而不是 OpenClaw 主机。                                                                                                                                                                                                                                                                                                                                                |
| `block`                  | OpenClaw 会在打开 socket 之前，拒绝 Gateway 回环控制平面连接以及受保护的 Ollama 回环 embedding 连接。                                                                                                                                                                                                                                                                                                                                                                                                                               |

Gateway 控制平面绕过仅限于 `localhost` 和字面量回环 IP URL——请使用 `ws://127.0.0.1:18789`、`ws://[::1]:18789` 或 `ws://localhost:18789`。其他主机名会像普通流量一样路由。

### 容器

对于 `openclaw --container ...` 命令，当设置了 `OPENCLAW_PROXY_URL` 时，OpenClaw 会将其转发到面向容器的子 CLI。该 URL 必须能从容器内部访问——容器中的 `127.0.0.1` 指的是容器自身，而不是宿主机。对于面向容器的命令，OpenClaw 会拒绝回环代理 URL，除非你设置 `OPENCLAW_CONTAINER_ALLOW_LOOPBACK_PROXY_URL=1` 来显式覆盖该检查。

## 相关代理术语

- `proxy.enabled` / `proxy.proxyUrl` — 运行时出口流量的出站正向代理路由。本页。
- `gateway.auth.mode: "trusted-proxy"` — 用于 Gateway 访问的入站、具备身份感知的反向代理认证。参见 [受信任代理认证](/gateway/trusted-proxy-auth)。
- `openclaw proxy` — 用于开发和支持的本地调试代理与抓包检查器。参见 [openclaw proxy](/cli/proxy)。
- `tools.web.fetch.useTrustedEnvProxy` — 为 `web_fetch` 提供可选支持，使由操作员控制的 HTTP(S) 环境代理在默认保持严格 DNS 绑定和主机名策略的同时解析 DNS。参见 [Web fetch](/tools/web-fetch#trusted-env-proxy)。
- 基于 Channel 或 provider 的代理设置 — 针对单个传输的所有者级覆盖。建议优先使用受管理的网络代理，以便在整个运行时中集中控制出口流量。

## 验证代理

代理的目标策略才是真正的安全边界；OpenClaw 无法验证你的代理是否阻止了正确的目标。请将其配置为：

- 仅绑定到回环接口或私有可信接口，并且只能由 OpenClaw 进程/主机/容器/服务账户访问。
- 自行解析目标，并在连接时于 DNS 解析之后按 IP 进行阻止，同时适用于普通 HTTP 和 HTTPS `CONNECT` 隧道。
- 拒绝基于目标的绕过，包括回环、私有、链路本地、元数据、多播、保留和文档地址段。
- 除非你完全信任 DNS 解析路径，否则不要使用主机名白名单。
- 记录目标、决策、状态和原因——绝不要记录请求体、授权头、Cookie 或其他机密信息。
- 将该策略纳入版本控制，并将变更视为安全敏感操作进行审查。

请在运行 OpenClaw 的同一主机/容器/服务账户下进行验证：

```bash
openclaw proxy validate --proxy-url http://127.0.0.1:3128
```

使用私有 CA 的 HTTPS 代理端点：

```bash
openclaw proxy validate --proxy-url https://proxy.corp.example:8443 --proxy-ca-file /etc/openclaw/proxy-ca.pem
```

| 标志                     | 作用                                                              |
| ------------------------ | -------------------------------------------------------------------- |
| `--proxy-url <url>`      | 验证此 URL，而不是解析配置/环境。                   |
| `--proxy-ca-file <path>` | HTTPS 代理端点的 CA 证书包。                               |
| `--allowed-url <url>`    | 预期应成功的目标（可重复）。                        |
| `--denied-url <url>`     | 预期应被阻止的目标（可重复）。                     |
| `--apns-reachable`       | 另外验证代理是否可以隧穿一个直接的沙箱 APNs HTTP/2 探测。 |
| `--apns-authority <url>` | 覆盖 `--apns-reachable` 探测所使用的 APNs authority。          |
| `--timeout-ms <ms>`      | 每个请求的超时时间。                                                 |
| `--json`                 | 机器可读输出。                                             |

如果 `proxy.enabled` 不是 `true` 且未提供 `--proxy-url`，该命令会报告配置问题而不是执行验证；在修改配置之前，先传入 `--proxy-url` 进行一次性预检。

如果没有提供 `--allowed-url`/`--denied-url`，默认检查为：`https://example.com/` 必须成功，并且代理绝不能访问到一个临时的回环探针服务器，且必须将其阻止。回环检查在传输失败时通过，或者在返回一个不包含该探针每次运行唯一 token 的非 2xx 响应时通过；如果返回 2xx 响应但缺少 token（即来自非探针的意外成功），则失败；尤其是在任何带有匹配 token 的响应上也会失败，因为这证明代理实际上转发了它本应拒绝的回环目标。自定义的 `--denied-url` 目标没有这样的探针 token，因此它们采用“失败即关闭”的策略：任何 HTTP 响应都视为可达（失败），而传输错误则被报告为不确定，而不是证明已阻止，因为 OpenClaw 无法确认是你的代理拒绝了一个可达的源，还是其他地方出了问题。`--apns-reachable` 会发送一个故意无效的提供者 token，因此返回 `403 InvalidProviderToken` 响应就可证明隧道已到达 Apple。命令在任何验证失败时以 `1` 退出；代理 URL 凭据会在文本和 JSON 输出中被脱敏。

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

## 推荐阻止的目标

任何正向代理、防火墙或出站策略的起始拒绝列表。OpenClaw 自身的 SSRF 分类器位于 `src/infra/net/ssrf.ts` 和 `packages/net-policy/src/ip.ts`（`BLOCKED_HOSTNAMES`、`BLOCKED_IPV4_SPECIAL_USE_RANGES`、`BLOCKED_IPV6_SPECIAL_USE_RANGES`、RFC 2544 基准前缀，以及针对 NAT64/6to4/Teredo/ISATAP/IPv4-mapped 形式的嵌入式 IPv4 处理）——这些是有用的参考，但 OpenClaw 不会在你的外部代理中导出或强制执行这些规则。

| 范围或主机                                                                       | 阻止原因                                           |
| ------------------------------------------------------------------------------------ | ------------------------------------------------- |
| `127.0.0.0/8`, `localhost`, `localhost.localdomain`                                  | IPv4 回环                                        |
| `::1/128`                                                                            | IPv6 回环                                        |
| `0.0.0.0/8`, `::/128`                                                                | 未指定 / 本网络地址                                |
| `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`                                      | RFC 1918 私有网络                                  |
| `169.254.0.0/16`, `fe80::/10`                                                        | 链路本地，包括常见的云元数据路径                    |
| `169.254.169.254`, `metadata.google.internal`                                        | 云元数据服务                                       |
| `100.64.0.0/10`                                                                      | 运营商级 NAT 共享地址空间                          |
| `198.18.0.0/15`, `2001:2::/48`                                                       | 基准测试范围                                        |
| `192.0.0.0/24`, `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`, `2001:db8::/32` | 特殊用途和文档范围                                  |
| `224.0.0.0/4`, `ff00::/8`                                                            | 组播                                               |
| `240.0.0.0/4`                                                                        | 预留 IPv4                                          |
| `fc00::/7`, `fec0::/10`                                                              | IPv6 本地/私有范围                                  |
| `100::/64`, `2001:20::/28`                                                           | IPv6 丢弃和 ORCHIDv2 范围                          |
| `64:ff9b::/96`, `64:ff9b:1::/48`                                                     | 带嵌入式 IPv4 的 NAT64 前缀                         |
| `2002::/16`, `2001::/32`                                                             | 带嵌入式 IPv4 的 6to4 和 Teredo                    |
| `::/96`, `::ffff:0:0/96`                                                             | IPv4 兼容和 IPv4 映射的 IPv6                        |

添加任何你的云提供商或网络平台文档中提到的其他元数据主机或保留范围。

## 限制

| 表面                                                      | 托管代理状态                                                                                                                                     |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fetch`, `node:http`, `node:https`, 常见 WebSocket 客户端 | 配置后会通过托管代理钩子路由。                                                                                                      |
| APNs 直接 HTTP/2                                           | 通过 APNs 托管的 `CONNECT` 助手路由。                                                                                                        |
| 网关控制平面回环                               | 仅对精确配置的本地回环 Gateway URL 直接连接。                                                                                         |
| 调试代理上游转发                              | 在托管代理模式处于活动状态时禁用，除非为本地诊断显式启用。                                                             |
| IRC                                                          | 原始 TCP/TLS；不通过托管 HTTP 代理模式代理。如果你的部署要求所有出站流量都通过转发代理，请设置 `channels.irc.enabled: false`。 |
| 其他原始 `net`、`tls` 或 `http2` 客户端调用              | 在落地前必须由原始套接字守卫进行分类。                                                                                               |

- 这是针对 JavaScript HTTP/WebSocket 客户端的进程级覆盖，不是操作系统级网络沙箱。
- 原始 `net`、`tls`、`http2` 套接字、原生插件以及非 OpenClaw 子进程可能会绕过 Node 级路由，除非它们继承并遵守代理环境变量。Fork 出的 OpenClaw 子 CLI 会继承托管代理 URL 和 `proxy.loopbackMode` 状态。
- 用户本地 WebUI 和本地模型服务器不受通用本地网络绕过的覆盖——如有需要，请在运维代理策略中将它们加入允许列表。例外是捆绑的 Ollama 内存嵌入提供程序受保护的直接路径，其作用域限定为其配置的 `baseUrl` 中精确的主机本地域回环源；LAN、tailnet、私有网络和公共 Ollama 主机仍使用托管代理。
- 在托管代理模式处于活动状态时，本地调试代理的直接上游转发（用于代理请求和 `CONNECT` 隧道）默认禁用；仅在获批的本地诊断中启用。
- OpenClaw 不会检查、测试或认证你的代理策略。请将代理策略更改视为安全敏感的运维变更。
