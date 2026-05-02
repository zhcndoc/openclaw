---
summary: "如何通过由运维管理的过滤代理路由 OpenClaw 运行时 HTTP 和 WebSocket 流量"
title: "网络代理"
read_when:
  - 你希望针对 SSRF 和 DNS rebinding 攻击实现纵深防御
  - 为 OpenClaw 运行时流量配置外部正向代理
---

# 网络代理

OpenClaw 可以将运行时 HTTP 和 WebSocket 流量通过由运维管理的正向代理进行路由。这是一种可选的纵深防御，适用于希望集中控制出站流量、增强 SSRF 防护以及提高网络可审计性的部署。

OpenClaw 不会提供、下载、启动、配置或认证任何代理。你负责运行适合你环境的代理技术，而 OpenClaw 会将正常的进程本地 HTTP 和 WebSocket 客户端通过它进行路由。

## 为什么使用代理？

代理为运维人员提供了一个统一的出站 HTTP 和 WebSocket 流量网络控制点。即使不考虑 SSRF 加固，这也很有用：

- 集中策略：维护一份出站策略，而不是依赖每个应用的 HTTP 调用点都正确处理网络规则。
- 连接时检查：在 DNS 解析之后、代理打开上游连接之前评估目标。
- DNS rebinding 防护：缩小应用层 DNS 检查与实际出站连接之间的时间窗口。
- 更广泛的 JavaScript 覆盖范围：通过同一路径路由普通的 `fetch`、`node:http`、`node:https`、WebSocket、axios、got、node-fetch 以及类似客户端。
- 可审计性：在出站边界记录允许和拒绝的目标。
- 运维控制：无需重建 OpenClaw，即可强制执行目标规则、网络分段、速率限制或出站允许列表。

代理路由是一种针对普通 HTTP 和 WebSocket 出站流量的进程级防护措施。它为运维人员提供了一条失败即关闭的路径，可将受支持的 JavaScript HTTP 客户端通过自己的过滤代理进行路由，但它不是 OS 级别的网络沙箱，也不会使 OpenClaw 对代理的目标策略进行认证。

## OpenClaw 如何路由流量

当 `proxy.enabled=true` 且已配置代理 URL 时，受保护的运行时进程（例如 `openclaw gateway run`、`openclaw node run` 和 `openclaw agent --local`）会将正常的 HTTP 和 WebSocket 出站流量通过所配置的代理进行路由：

```text
OpenClaw 进程
  fetch                  -> 运维管理的过滤代理 -> 公共互联网
  node:http and https    -> 运维管理的过滤代理 -> 公共互联网
  WebSocket clients      -> 运维管理的过滤代理 -> 公共互联网
```

对外公开的契约是路由行为，而不是用于实现它的内部 Node 钩子。OpenClaw Gateway 控制平面 WebSocket 客户端在 Gateway URL 使用 `localhost` 或字面量回环 IP（例如 `127.0.0.1` 或 `[::1]`）时，会对本地回环 Gateway RPC 流量使用一条窄范围的直连路径。即使运维代理阻止回环目标，这条控制平面路径也必须能够访问回环 Gateway。正常的运行时 HTTP 和 WebSocket 请求仍然使用已配置的代理。

内部上，OpenClaw 为此功能使用两种进程级路由钩子：

- Undici dispatcher 路由覆盖 `fetch`、基于 undici 的客户端，以及提供自身 undici dispatcher 的传输。
- `global-agent` 路由覆盖 Node 核心的 `node:http` 和 `node:https` 调用者，包括许多构建于 `http.request`、`https.request`、`http.get` 和 `https.get` 之上的库。受管代理模式会强制使用该全局代理，从而避免显式的 Node HTTP agent 误绕过运维代理。

一些插件拥有自定义传输，即使存在进程级路由，也需要显式的代理接线。例如，Telegram 的 Bot API 传输使用其自身的 HTTP/1 undici dispatcher，因此会在该插件专用的传输路径中遵循进程代理环境以及受管的 `OPENCLAW_PROXY_URL` 回退。

代理 URL 本身必须使用 `http://`。通过代理访问 HTTPS 目标时，仍然会通过 HTTP `CONNECT` 得到支持；这仅意味着 OpenClaw 期望的是一个普通的 HTTP 正向代理监听器，例如 `http://127.0.0.1:3128`。

在代理生效期间，OpenClaw 会清除 `no_proxy`、`NO_PROXY` 和 `GLOBAL_AGENT_NO_PROXY`。这些绕过列表是基于目标的，因此如果保留 `localhost` 或 `127.0.0.1`，高风险 SSRF 目标就可能绕过过滤代理。

关闭时，OpenClaw 会恢复之前的代理环境，并重置缓存的进程路由状态。

## 相关代理术语

- `proxy.enabled` / `proxy.proxyUrl`：OpenClaw 运行时出站流量的正向代理路由。本页文档说明了这一功能。
- `gateway.auth.mode: "trusted-proxy"`：用于 Gateway 访问的入站、身份感知的反向代理认证。参见 [受信任代理认证](/gateway/trusted-proxy-auth)。
- `openclaw proxy`：用于开发和支持的本地调试代理与捕获检查器。参见 [openclaw proxy](/cli/proxy)。
- 通道或提供商特定的代理设置：针对特定传输的插件专用覆盖。当目标是在整个运行时实现集中式出站控制时，优先使用受管网络代理。

## 配置

```yaml
proxy:
  enabled: true
  proxyUrl: http://127.0.0.1:3128
```

你也可以通过环境变量提供 URL，同时在配置中保留 `proxy.enabled=true`：

```bash
OPENCLAW_PROXY_URL=http://127.0.0.1:3128 openclaw gateway run
```

`proxy.proxyUrl` 的优先级高于 `OPENCLAW_PROXY_URL`。

如果 `enabled=true` 但未配置有效的代理 URL，受保护命令会在启动时失败，而不会回退到直接网络访问。

对于使用 `openclaw gateway start` 启动的托管 Gateway 服务，建议将 URL 存储在配置中：

```bash
openclaw config set proxy.enabled true
openclaw config set proxy.proxyUrl http://127.0.0.1:3128
openclaw gateway install --force
openclaw gateway start
```

环境变量回退更适合前台运行。如果你将它与已安装的服务一起使用，请把 `OPENCLAW_PROXY_URL` 放入服务的持久环境中，例如 `$OPENCLAW_STATE_DIR/.env` 或 `~/.openclaw/.env`，然后重新安装服务，以便 launchd、systemd 或计划任务使用该值启动 Gateway。

对于 `openclaw --container ...` 命令，OpenClaw 会在设置了 `OPENCLAW_PROXY_URL` 时，将其转发到以容器为目标的子 CLI。该 URL 必须能从容器内部访问；`127.0.0.1` 指向的是容器自身，而不是宿主机。除非你显式覆盖该安全检查，否则 OpenClaw 会拒绝容器目标命令使用回环代理 URL。

## 代理要求

代理策略就是安全边界。OpenClaw 无法验证代理是否阻止了正确的目标。

请将代理配置为：

- 仅绑定到回环或受信任的私有接口。
- 限制访问，仅允许 OpenClaw 进程、主机、容器或服务账号使用。
- 由代理自身解析目标，并在 DNS 解析后阻止目标 IP。
- 对普通 HTTP 请求和 HTTPS `CONNECT` 隧道在连接时应用策略。
- 拒绝基于目标的回环、私有、链路本地、元数据、多播、保留或文档地址段绕过。
- 除非你完全信任 DNS 解析路径，否则不要使用基于主机名的允许列表。
- 记录目标、决策、状态和原因，但不要记录请求体、授权头、cookie 或其他机密信息。
- 将代理策略纳入版本控制，并像对待安全敏感配置一样审查变更。

## 推荐阻止的目标

将此拒绝列表作为任何正向代理、防火墙或出站策略的起点。

OpenClaw 应用层分类器逻辑位于 `src/infra/net/ssrf.ts` 和 `src/shared/net/ip.ts`。相关的对等钩子包括 `BLOCKED_HOSTNAMES`、`BLOCKED_IPV4_SPECIAL_USE_RANGES`、`BLOCKED_IPV6_SPECIAL_USE_RANGES`、`RFC2544_BENCHMARK_PREFIX`，以及对 NAT64、6to4、Teredo、ISATAP 和 IPv4 映射形式的嵌入式 IPv4 哨兵处理。在维护外部代理策略时，这些文件是有用的参考，但 OpenClaw 不会自动将这些规则导出到你的代理中，也不会在你的代理里强制执行它们。

| Range or host                                                                        | 为什么阻止                                      |
| ------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `127.0.0.0/8`, `localhost`, `localhost.localdomain`                                  | IPv4 回环                                       |
| `::1/128`                                                                            | IPv6 回环                                       |
| `0.0.0.0/8`, `::/128`                                                                | 未指定地址和本网络地址                           |
| `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`                                      | RFC1918 私有网络                                |
| `169.254.0.0/16`, `fe80::/10`                                                        | 链路本地地址和常见云元数据路径                   |
| `169.254.169.254`, `metadata.google.internal`                                        | 云元数据服务                                    |
| `100.64.0.0/10`                                                                      | 运营商级 NAT 共享地址空间                       |
| `198.18.0.0/15`, `2001:2::/48`                                                       | 基准测试地址段                                  |
| `192.0.0.0/24`, `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`, `2001:db8::/32` | 特殊用途和文档地址段                             |
| `224.0.0.0/4`, `ff00::/8`                                                            | 多播                                            |
| `240.0.0.0/4`                                                                        | 保留的 IPv4                                     |
| `fc00::/7`, `fec0::/10`                                                              | IPv6 本地/私有地址段                            |
| `100::/64`, `2001:20::/28`                                                           | IPv6 丢弃和 ORCHIDv2 地址段                     |
| `64:ff9b::/96`, `64:ff9b:1::/48`                                                     | 带嵌入 IPv4 的 NAT64 前缀                       |
| `2002::/16`, `2001::/32`                                                             | 带嵌入 IPv4 的 6to4 和 Teredo                   |
| `::/96`, `::ffff:0:0/96`                                                             | IPv4 兼容和 IPv4 映射的 IPv6                    |

如果你的云提供商或网络平台记录了额外的元数据主机或保留地址段，也请一并添加。

## 验证

请从运行 OpenClaw 的同一台主机、容器或服务账号来验证代理：

```bash
openclaw proxy validate --proxy-url http://127.0.0.1:3128
```

默认情况下，当未提供自定义目标时，该命令会检查 `https://example.com/` 是否成功，并启动一个临时的回环 canary，代理不应访问它。默认的拒绝检查在代理返回非 2xx 的拒绝响应，或以传输失败的方式阻止 canary 时通过；如果成功响应到达 canary，则失败。如果未启用并配置代理，验证会报告配置问题；在修改配置之前，可使用 `--proxy-url` 做一次性预检。使用 `--allowed-url` 和 `--denied-url` 测试部署特定的预期行为。自定义拒绝目标采用失败即关闭策略：任何 HTTP 响应都意味着该目标可通过代理到达，而任何传输错误都会被报告为不确定，因为 OpenClaw 无法证明代理阻止了一个可达的源。验证失败时，命令以代码 1 退出。

自动化场景可使用 `--json`。JSON 输出包含总体结果、有效代理配置来源、任何配置错误以及每个目标检查项。代理 URL 凭据会在文本和 JSON 输出中被脱敏：

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
    {
      "kind": "allowed",
      "url": "https://example.com/",
      "ok": true,
      "status": 200
    }
  ]
}
```

你也可以使用 `curl` 手动验证：

```bash
curl -x http://127.0.0.1:3128 https://example.com/
curl -x http://127.0.0.1:3128 http://127.0.0.1/
curl -x http://127.0.0.1:3128 http://169.254.169.254/
```

公共请求应当成功。回环和元数据请求应当被代理阻止。对于 `openclaw proxy validate`，内置的回环 canary 可以区分代理拒绝和可达源。自定义 `--denied-url` 检查没有这个 canary，因此除非你的代理暴露了可单独验证的部署特定拒绝信号，否则应将 HTTP 响应和含糊的传输失败都视为验证失败。

然后启用 OpenClaw 代理路由：

```bash
openclaw config set proxy.enabled true
openclaw config set proxy.proxyUrl http://127.0.0.1:3128
openclaw gateway run
```

或者设置：

```yaml
proxy:
  enabled: true
  proxyUrl: http://127.0.0.1:3128
```

## 限制

- 该代理提高了进程本地 JavaScript HTTP 和 WebSocket 客户端的覆盖范围，但它并不是 OS 级别的网络沙箱。
- 原始的 `net`、`tls` 和 `http2` 套接字、原生插件以及子进程可能会绕过 Node 级代理路由，除非它们继承并遵守代理环境变量。
- 当需要时，用户本地 Web UI 和本地模型服务器应在运维代理策略中加入允许列表；OpenClaw 不会为它们暴露通用的本地网络绕过机制。
- Gateway 控制平面的代理绕过刻意仅限于 `localhost` 和字面量回环 IP URL。对于本地直连的 Gateway 控制平面连接，请使用 `ws://127.0.0.1:18789`、`ws://[::1]:18789` 或 `ws://localhost:18789`；其他主机名会像普通基于主机名的流量一样路由。
- OpenClaw 不会检查、测试或认证你的代理策略。
- 请将代理策略变更视为安全敏感的运维变更。
