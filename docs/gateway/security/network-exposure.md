---
summary: "绑定、防火墙、发现、网关身份验证、Tailscale、反向代理和 Control UI 暴露设置"
read_when:
  - "绑定网关超越环回"
  - "将网关置于反向代理或 Tailscale 服务后面"
  - "审核启用了哪些危险标志"
title: "网络曝光"
---

## <a id="network-exposure"></a> 网络暴露

### <a id="bind%2C-port%2C-firewall"></a><a id="bind-port-firewall"></a> 绑定、端口、防火墙

网关在一个端口上复用 WebSocket + HTTP（默认 `18789`；config/flags/env：`gateway.port`、`--port`、`OPENCLAW_GATEWAY_PORT`）。该 HTTP 表面包括 Control UI（SPA 资源、默认基本路径 `/`）、托管小部件文档 （`/__openclaw__/canvas`） 和 A2UI 渲染器资源 （`/__openclaw__/a2ui`）。 Widget 文档包含代理编写的 HTML/JS；在普通浏览器中加载时将它们视为不受信任的内容，不要将它们暴露给不受信任的网络或用户，并且不要与特权网络表面共享其来源。

`gateway.bind` 控制 Gateway 监听的位置：

- `"loopback"`（默认）：只有本地客户端可以连接。
- `"lan"`、`"tailnet"`、`"custom"`：使更多客户端可以访问网关。仅与网关身份验证（共享 token/password 或正确配置的受信任代理）和真正的防火墙一起使用。

经验法则：优先使用 Tailscale Serve，而不是 LAN 绑定（Serve 会让 Gateway 保持在 loopback 上，由 Tailscale 处理访问）；如果必须绑定到 LAN，请将端口通过防火墙严格限制到源 IP 白名单，而不是广泛地做端口转发；绝不要在 `0.0.0.0` 上以未认证方式暴露 Gateway。

### <a id="docker-port-publishing-with-ufw"></a> 使用 UFW 进行 Docker 端口发布

已发布的容器端口（`-p HOST:CONTAINER` 或 Compose `ports:`）会通过 Docker 的转发链路路由，而不仅仅是主机的 `INPUT` 规则。应在 `DOCKER-USER` 中强制执行规则（该链在 Docker 自身的 accept 规则之前被评估）；大多数现代发行版使用 `iptables-nft` 前端，它仍会将这些规则应用到 nftables 后端。

```bash
# /etc/ufw/after.rules (append as its own *filter section)
*filter
:DOCKER-USER - [0:0]
-A DOCKER-USER -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
-A DOCKER-USER -s 127.0.0.0/8 -j RETURN
-A DOCKER-USER -s 10.0.0.0/8 -j RETURN
-A DOCKER-USER -s 172.16.0.0/12 -j RETURN
-A DOCKER-USER -s 192.168.0.0/16 -j RETURN
-A DOCKER-USER -s 100.64.0.0/10 -j RETURN
-A DOCKER-USER -p tcp --dport 80 -j RETURN
-A DOCKER-USER -p tcp --dport 443 -j RETURN
-A DOCKER-USER -m conntrack --ctstate NEW -j DROP
-A DOCKER-USER -j RETURN
COMMIT
```

IPv6 使用单独的表——如果启用了 Docker IPv6，请在 `/etc/ufw/after6.rules` 中添加相应策略。避免硬编码接口名称（`eth0`），因为它们会在不同的 VPS 镜像中变化（`ens3`、`enp*` 等），而且名称不匹配可能会悄无声息地跳过你的拒绝规则。

```bash
ufw reload
iptables -S DOCKER-USER
ip6tables -S DOCKER-USER
nmap -sT -p 1-65535 <public-ip> --open
```

期望的外部端口应该只包括你有意暴露的端口（对于大多数配置：SSH + 反向代理端口）。

### <a id="mdns%2Fbonjour-discovery"></a><a id="mdns/bonjour-discovery"></a> mDNS/Bonjour 发现

当启用捆绑的 `bonjour` 插件时，网关通过 mDNS（`_openclaw-gw._tcp`，端口 5353）广播存在状态以进行本地设备发现。完整模式包括公开操作详细信息的 TXT 记录：`cliPath`（显示用户名和安装位置的文件系统路径）、`sshPort`（公布 SSH 可用性）、`displayName`/`lanHost`（主机名信息）。广播基础设施详细信息使 LAN 侦察变得更加容易。

- 保持 Bonjour 禁用，除非需要 LAN 发现 - 它在 macOS 主机上自动启动，并在其他地方选择加入；直接网关 URL、Tailnet、SSH 或广域 DNS-SD 避免本地多播。
- **最小模式**（启用 Bonjour 时的默认模式，建议用于暴露在外的 gateway）会省略敏感字段：

  ```json5
  { discovery: { mdns: { mode: "minimal" } } }
  ```

- **关闭** 会在保留插件启用的同时抑制本地发现：

  ```json5
  { discovery: { mdns: { mode: "off" } } }
  ```

- **完整模式**（显式启用）会包含 `cliPath` + `sshPort`：

  ```json5
  { discovery: { mdns: { mode: "full" } } }
  ```

- 或设置 `OPENCLAW_DISABLE_BONJOUR=1`，无需修改配置即可禁用 mDNS。

在最小模式下，Gateway 会广播 `role`、`gatewayPort`、`transport`，但不包含 `cliPath`/`sshPort`；需要 CLI 路径的应用可以改为通过已认证的 WebSocket 连接获取。

### <a id="gateway-websocket-auth"></a> Gateway WebSocket 认证

默认情况下需要网关身份验证 - 如果未配置有效的身份验证路径，网关将拒绝 WebSocket 连接。默认情况下，载入会生成一个令牌（即使是环回），因此本地客户端必须进行身份验证。

```json5
{ gateway: { auth: { mode: "token", token: "your-token" } } }
```

`openclaw doctor --generate-gateway-token` 可以为你生成一个。

<Note>
`gateway.remote.token` 和 `gateway.remote.password` 是客户端凭证源 - 它们本身不保护本地 WS 访问。仅当 `gateway.auth.*` 未设置时，本地调用路径才使用 `gateway.remote.*` 作为后备。如果通过 SecretRef 显式配置 `gateway.auth.token` 或 `gateway.auth.password` 并且未解析，则解析会因错误而停止，而不是回退到远程凭据。
</Note>

使用 `wss://` 时，将远程 TLS 与 `gateway.remote.tlsFingerprint` 固定。环回、私有 IP 文字、`.local` 和 Tailnet `*.ts.net` 网关 URL 接受明文 `ws://`；对于其他受信任的私有 DNS 名称，请将客户端进程上的 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 设置为 Break-glass（仅限进程环境，而不是 `openclaw.json` 密钥）。移动配对和 Android manual/scanned 网关路由更加严格：仅用于环回的明文，而 private-LAN、链路本地、`.local` 和无点主机名必须使用 TLS，除非您明确选择进入受信任的专用网络明文路径。

自动批准设备配对以进行直接本地环回连接（加上用于可信共享秘密帮助程序流的狭窄 backend/container-local 自连接路径）； Tailnet 和 LAN 连接（包括与 tailnet 地址的同一主机连接）被视为远程连接，仍然需要批准。除 `127.0.0.1` 或 `0.0.0.0` 之外的已解析 `tailnet` 地址或 `custom` 地址会添加单独的 `127.0.0.1` 侦听器；只有到该本地侦听器的连接才会收到环回语义。环回请求上的转发标头证据取消了环回局部性的资格；元数据升级自动批准的范围很窄。请参阅 [ 网关配对 ](/gateway/pairing)。

认证模式：

- `"token"`：共享持有者令牌（推荐用于大多数配置）。
- `"password"`：建议通过 `OPENCLAW_GATEWAY_PASSWORD` 设置。
- `"trusted-proxy"`：信任身份感知反向代理来验证用户身份并通过标头传递身份。请参阅 [ 受信任代理 Auth](/gateway/trusted-proxy-auth)。

网关启动拒绝空白令牌和密码、文字字符串 `undefined` 和 `null` 以及已发布的示例占位符。生成真实密钥（例如，`openssl rand -hex 32`）并更新所选凭证或其外部源。 `openclaw security audit` 将 blank/nullish 值标记为关键值，并在所选令牌或密码少于 24 个字符时发出警告。

轮换清单（token/password）：generate/set 一个新秘密（`gateway.auth.token` 或 `gateway.auth.password`）；更新远程客户端（`gateway.remote.token`/`.password`）；验证旧凭据不再有效。配置的token/password轮换热应用仅在有效认证模式保持不变时才适用；为 SecretRef 凭证显式设置 `gateway.auth.mode`。身份验证模式更改需要重新启动网关。对流程环境凭证（例如 `OPENCLAW_GATEWAY_PASSWORD`）的更改还需要使用更新的环境重新启动网关（或其监督 macOS 应用程序）。参见[配置热重载](/gateway/configuration#config-hot-reload)。

### <a id="tailscale-serve-identity-headers"></a> Tailscale Serve 身份头

什么时候`gateway.auth.allowTailscale` is `true`（默认为服务），OpenClaw接受Tailscale提供身份标头`tailscale-user-login`为了Control UI/WebSocket验证。它通过解析来验证身份`x-forwarded-for`通过本地地址Tailscale守护进程（`tailscale whois`）并将其与标题相匹配。这只会触发OpenClaw的专门管理-Tailscale听众并要求`x-forwarded-for`， `x-forwarded-proto`， 和`x-forwarded-host`；普通网关侦听器上的标头不会建立服务来源或无令牌身份验证。对于此异步检查，相同的尝试失败`{scope, ip}`在限制器记录失败之前序列化，因此来自一个服务客户端的并发错误重试可以立即锁定第二次尝试。

HTTP API 端点（`/v1/*`、`/tools/invoke`、`/api/channels/*`）不使用 Tailscale 身份头认证——它们遵循网关配置的 HTTP 认证模式。

网关的 HTTP bearer 认证本质上是“要么全开，要么全关”的运维访问。能够调用 `/v1/chat/completions`、`/v1/responses`、诸如 `/api/v1/admin/rpc` 之类的插件路由，或 `/api/channels/*` 的凭据，都是该网关的完全访问运维密钥：共享密钥 bearer 认证会恢复默认的全部运维作用域（`operator.admin`、`operator.approvals`、`operator.pairing`、`operator.read`、`operator.talk.secrets`、`operator.write`）以及用于 agent 回合的 owner 语义，而更窄的 `x-openclaw-scopes` 值不会缩小该共享密钥路径的权限。按请求的作用域语义仅在请求来自具有身份的模式（可信代理认证）或显式无认证的私有入口时适用；在这些模式下，如果省略 `x-openclaw-scopes`，则回退到正常的运维默认作用域集，而像 `x-openclaw-model` 这样的 owner 级头部在作用域被缩窄时需要 `operator.admin`。`/tools/invoke` 和 HTTP 会话历史端点遵循相同的共享密钥规则。不要将这些凭据与不受信任的调用方共享；最好针对不同的信任边界使用不同的网关。

无令牌的 Serve 认证默认信任网关主机本身——它不能防御同主机上的恶意进程。如果不受信任的本地代码可能在网关主机上运行，请禁用 `allowTailscale` 并要求显式共享密钥认证（`token` 或 `password`）。

外部管理的 Tailscale Serve 或 Funnel 路由只能通过具有有效非环回转发客户端地址的显式配置的 `gateway.trustedProxies` 源将这些标头转发到普通侦听器。 OpenClaw 将该请求视为通用代理入口：配置的网关身份验证适用，`allowTailscale` 不授予任何内容，并且不运行 WhoIs 查找。当身份验证模式为 `none` 时，网关保护的路由拒绝外部漏斗入口；聚合运行状况、准备情况和启动检查保留其有限的未经身份验证的响应。请参阅 [Tailscale](/gateway/tailscale#externally-managed-serve-and-funnel)、[健康状况和准备情况](/gateway/health) 和 [ 受信任代理 Auth](/gateway/trusted-proxy-auth)。

参见 [Tailscale](/gateway/tailscale) 和[Web 概览](/web)。

### <a id="reverse-proxy-configuration"></a> 反向代理配置

放`gateway.trustedProxies`对于正确的转发客户端IP处理落后nginx/Caddy/Traefik/etc.当网关检测到来自某个地址的代理标头时**不是** in `trustedProxies`，它不会将连接视为本地连接；如果禁用网关身份验证，则该连接将被拒绝。这可以防止代理连接看起来来自本地主机并接收自动信任。

使用令牌或密码身份验证时，未配置的同主机环回代理会在网关身份验证的路由上被拒绝，因为 OpenClaw 无法归因其转发的客户端标头。 HTTP 请求接收 `403` 和 `proxy_attribution_required`； WebSocket 身份验证失败，并提供配置 `gateway.trustedProxies` 的指导。经过插件验证的 Webhook 路由保留自己的签名或凭据检查，并忽略不受信任的转发声明。狭窄地配置 `trustedProxies` 并使代理覆盖或安全地重建转发的标头；参见[速率限制](/gateway/security/rate-limiting#unconfigured-same-host-reverse-proxies)。

`trustedProxies` 还提供更严格的 `gateway.auth.mode: "trusted-proxy"`：它默认拒绝环回源代理。同主机环回反向代理可以使用 `trustedProxies` 进行本地客户端检测和转发 IP 处理，但只能在 `gateway.auth.trustedProxy.allowLoopback = true` 时满足 `trusted-proxy` 身份验证模式；否则使用 token/password 身份验证。

```yaml
gateway:
  trustedProxies:
    - "10.0.0.1" # reverse proxy IP
  allowRealIpFallback: false # default false; only enable if your proxy cannot provide X-Forwarded-For
  auth:
    mode: password
    password: ${OPENCLAW_GATEWAY_PASSWORD}
```

当设置`trustedProxies`时，网关使用`X-Forwarded-For`来确定客户端IP；除非显式设置 `gateway.allowRealIpFallback: true`，否则 `X-Real-IP` 将被忽略。检查您的代理 **是否覆盖了** `X-Forwarded-For`/`X-Real-IP` 而不是附加到它们：

```nginx
# good
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Real-IP $remote_addr;

# bad: preserves/appends untrusted client-supplied values
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

受信任的代理头不会自动使节点设备配对变为受信任 - `gateway.nodes.pairing.autoApproveCidrs` 是一个单独的、默认禁用的运维策略，而且即使启用了 loopback 来源的 trusted-proxy 认证，来自 loopback-source 的 trusted-proxy 头路径仍会被排除在节点自动批准之外（因为本地调用方可以伪造这些头）。

### <a id="plugin-remote-control-ui-ingress"></a> 插件远程Control UI入口

诸如 [MCP Relay](/plugins/mcp-relay) 之类的可信插件可以公开 [remote Control UI ingress](/plugins/sdk-gateway-ingress)。每个授权都绑定到没有 `gateway.roles` 的令牌或密码网关上的共享所有者，或者绑定到具有角色的 Cloudflare 访问可信代理网关上的经过验证的人员。在转发任何请求或套接字之前，插件必须将浏览器验证为其本地批准的授权持有者。 Core 将实时句柄视为受信任的代理：具有签名设备身份的浏览器作为操作员进行连接，其范围仅限于与主体当前权限相交的授权上限。不颁发可重复使用的设备令牌。共享网关机密、引导凭据、无设备连接、非操作员角色以及上限以上的范围都会被拒绝。

浏览器显示在 **Devices** 和 `openclaw devices list` 中，作为保留用于可见性和密钥检查的配对设备行。它不持有适用于网关直接侦听器的承载凭证；每次重新连接都由现场补助金承认。撤销插件授权以结束委托访问。撤销会关闭入口路径及其保留的工作，而不删除配对设备行。

### <a id="hsts-and-origin-notes"></a> HSTS 和 origin 注意事项

- OpenClaw 的网关首先是 local/loopback。如果您在反向代理处终止 TLS，请在那里设置 HSTS。
- 如果网关本身终止 HTTPS，`gateway.http.securityHeaders.strictTransportSecurity` 会让 OpenClaw 响应携带 HSTS 标头。
- 非环回 Control UI 部署需要配置浏览器源：省略 `gateway.controlUi.allowedOrigins` 以使用 `gateway.publicOrigin`，或设置显式列表。显式列表取代默认列表； `allowedOrigins: ["*"]` 允许每个浏览器来源，并且应该避免在严格控制的本地测试之外。
- 环回失败的身份验证永远不会被锁定，因此在检查本地 CLI 的凭据之前，无法拒绝其凭据。错误的凭证仍然会被跟踪并逐渐延迟（有界延迟，每个密钥一个共享计时器）；成功的身份验证仅重置匹配的凭证类别历史记录。这增加了从一个环回源重复猜测的成本；它不能防御已经可以打开许多并行环回连接的攻击者，因为在延迟故障响应之前会比较凭据。环回可达性本身就是一个信任边界 - 请参阅 [ 节点配对 ](/gateway/pairing#silent-local-pairing)。
- 即使启用了常规回环豁免，浏览器来源的回环身份验证失败仍会受到速率限制，但锁定密钥的作用域是规范化后的 `Origin` 值，而不是共用的 localhost 令牌桶。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 会启用 Host 标头来源回退模式；应将其视为由操作员明确选择的危险策略。
- 应将 DNS 重绑定和代理 Host 标头行为视为部署强化问题；请严格限制 `trustedProxies`，并避免将网关直接暴露到公共互联网。
- 详细部署指南：[可信代理Auth](/gateway/trusted-proxy-auth#tls-termination-and-hsts)。

### <a id="control-ui-over-http"></a> Control UI 超过 HTTP

Control UI 使用纯 JS Ed25519 生成设备标识，因此配对适用于任何来源，包括普通 HTTP。

- Token/password 身份验证不会取代浏览器设备身份：HTTP 浏览器仍然与签名的设备密钥配对，该设备密钥永远不会跨越线路。首选 HTTPS（例如，Tailscale Serve）——明文传输仍然会将页面和共享秘密暴露给路径攻击者。
- `gateway.controlUi.dangerouslyDisableDeviceAuth`：已退役的碎玻璃输入，现在完全惰性。 Control UI 浏览器通过正常的设备流程进行配对； `openclaw doctor --fix` 删除旧密钥。
- 另外，当浏览器无法提供设备身份时，成功的 `gateway.auth.mode: "trusted-proxy"` 身份验证可以接纳没有设备身份的 **operator** Control UI 会话。可以创建身份的浏览器（任何来源，包括普通的 HTTP）都遵循正常的配对流程 - 自动使用 `deviceAutoApprove`，否则一次性批准。这不会扩展到节点角色 Control UI 会话。

### <a id="insecure%2Fdangerous-flags"></a><a id="insecure/dangerous-flags"></a> Insecure/dangerous 标志

对于每个启用的已知 insecure/dangerous 调试开关，`openclaw security audit` 都会引发 `config.insecure_or_dangerous_flags`（每个标志一个发现）。在生产中保持这些未设置。如果配置了审计抑制，即使匹配结果移至 `suppressedFindings`，`security.audit.suppressions.active` 仍会保持在活动输出中。

<AccordionGroup>
  <Accordion id="flags-tracked-by-the-audit-today" title="今天审计跟踪的标志">
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true`
    - `security.audit.suppressions configured (<count>)`
    - `hooks.gmail.allowUnsafeExternalContent=true`
    - `hooks.mappings[<index>].allowUnsafeExternalContent=true`
    - `tools.exec.applyPatch.workspaceOnly=false`
    - `plugins.entries.acpx.config.permissionMode=approve-all`

  </Accordion>

  <Accordion id="all-dangerous-dangerously-keys-in-the-config-schema" title="配置模式中的所有危险*/dangerously*键">
    Control UI 和浏览器：
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback`
    - `gateway.controlUi.dangerouslyDisableDeviceAuth`（已退役，惰性）
    - `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`

    通道名称匹配（捆绑和插件通道；如适用，也包括每个 `accounts.<accountId>`）：
    - `channels.discord.dangerouslyAllowNameMatching`
    - `channels.googlechat.dangerouslyAllowNameMatching`
    - `channels.msteams.dangerouslyAllowNameMatching`
    - `channels.slack.dangerouslyAllowNameMatching`
    - `channels.irc.dangerouslyAllowNameMatching`（插件通道）
    - `channels.mattermost.dangerouslyAllowNameMatching`（插件通道）
    - `channels.synology-chat.dangerouslyAllowNameMatching`（插件通道）
    - `channels.synology-chat.dangerouslyAllowInheritedWebhookPath`（插件通道）
    - `channels.zalouser.dangerouslyAllowNameMatching`（插件通道）

    网络暴露：
    - `channels.telegram.network.dangerouslyAllowPrivateNetwork`（也适用于每个账户）

    Docker 沙箱（默认值＋每个代理）：
    - `agents.defaults.sandbox.docker.dangerouslyAllowReservedContainerTargets`
    - `agents.defaults.sandbox.docker.dangerouslyAllowExternalBindSources`
    - `agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin`

  </Accordion>
</AccordionGroup>
