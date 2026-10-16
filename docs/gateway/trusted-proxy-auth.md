---
summary: "将网关认证委托给受信任的反向代理（Pomerium、Caddy、nginx + OAuth）"
title: "受信任代理认证"
sidebarTitle: "受信任代理认证"
read_when:
  - "在身份感知代理后运行 OpenClaw"
  - "设置 Pomerium、Caddy 或 nginx，OAuth 放在 OpenClaw 前面"
  - "通过反向代理配置修复 WebSocket 1008 未授权错误"
  - "决定在哪里设置 HSTS 和其他 HTTP 加固头"
---

<Warning>
**安全敏感功能。** 此模式将认证完全委托给你的反向代理。配置错误可能会使你的 Gateway 暴露给未授权访问。启用前请仔细阅读本页。
</Warning>

## <a id="when-to-use"></a> 何时使用

- 您在 **身份感知代理**（Pomerium、Caddy + OAuth、nginx + oauth2-proxy、Traefik + 转发身份验证）后面运行 OpenClaw。
- 你的代理处理所有身份验证，并通过请求头传递用户身份。
- 你处于 Kubernetes 或容器环境中，代理是通往 Gateway 的唯一路径。
- 你遇到 WebSocket `1008 unauthorized` 错误，因为浏览器无法在 WS 负载中传递令牌。

## <a id="when-not-to-use"></a> 当NOT使用时

- 你的代理不对用户进行身份验证（只是一个 TLS 终止器或负载均衡器）。
- 到 Gateway 的任何路径会绕过代理（防火墙漏洞、内部网络访问）。
- 您不确定您的代理是否正确 strips/overwrites 转发标头。
- 你只需要个人单用户访问（可考虑改用 Tailscale Serve + loopback）。

## <a id="how-it-works"></a> 工作原理

<Steps>
  <Step id="proxy-authenticates-the-user" title="代理验证用户身份">
    你的反向代理对用户进行认证（OAuth、OIDC、SAML 等）。
  </Step>
  <Step id="proxy-adds-an-identity-header" title="代理添加身份标头">
    代理添加带有经过身份验证的用户身份的标头（e.g.、`x-forwarded-user: nick@example.com`）。
  </Step>
  <Step id="gateway-verifies-trusted-source" title="网关验证可信来源">
    OpenClaw 检查请求是否来自 **可信代理 IP** （`gateway.trustedProxies`）。环回源需要明确的 `allowLoopback` 同意；其他网关本地接口地址将被拒绝。
  </Step>
  <Step id="gateway-extracts-identity" title="网关提取身份">
    OpenClaw 读取所需的请求头，然后从配置的头中获取用户身份。
  </Step>
  <Step id="authorize" title="授权">
    如果一切检查通过，并且用户通过 `allowUsers`（在设置时）的校验，请求将被授权。
  </Step>
</Steps>

## <a id="configuration"></a> 配置

```json5
{
  gateway: {
    // Trusted-proxy auth expects the proxy's source IP to be non-loopback by default
    bind: "lan",

    // CRITICAL: Only add your proxy's IP(s) here
    trustedProxies: ["10.0.0.1", "172.17.0.1"],

    auth: {
      mode: "trusted-proxy",
      identityScopes: {
        "admin@company.org": ["operator.admin"],
      },
      trustedProxy: {
        // Header containing authenticated user identity (required)
        userHeader: "x-forwarded-user",

        // Optional: headers that MUST be present (proxy verification)
        requiredHeaders: ["x-forwarded-proto", "x-forwarded-host"],

        // Optional: restrict to specific users (empty = allow all)
        allowUsers: ["nick@example.com", "admin@company.org"],

        // Optional: allow a same-host loopback proxy after explicit opt-in
        allowLoopback: false,

        // Optional: let authenticated proxy users enroll UI devices and upgrade scopes
        deviceAutoApprove: {
          enabled: false,
          scopes: ["operator.read", "operator.write", "operator.approvals", "operator.questions"],
        },
      },
    },
  },
}
```

<Warning>
**运行规则，按评估顺序**

1. 代理型流量在网关身份验证之前归属。请求的源 IP 必须匹配 `gateway.trustedProxies` （CIDR-aware），并且其客户端地址标头必须解析为非环回客户端。否则，在接受身份标头之前，网关验证的路由会使用 `proxy_attribution_required` 拒绝它。经过插件验证的 Webhook 路由仍可以处理请求，但它们会忽略不受信任的转发地址并使用套接字源作为其自身的限制。
2. 代理必须用安全链覆盖`X-Forwarded-For`。如果是 `gateway.allowRealIpFallback = true`，则当 `X-Forwarded-For` 不存在时，也接受覆盖的 `X-Real-IP`。除非代理删除客户端提供的 `X-Real-IP`，否则不要启用该回退。
3. 环回源请求（`127.0.0.1`、`::1`）将被拒绝，除非 `gateway.auth.trustedProxy.allowLoopback = true` 并且环回地址也在 `trustedProxies` （`trusted_proxy_loopback_source`） 中。此检查在标头检查之前运行，因此即使所需的标头也丢失，环回源也会以这种方式失败。
4. 与网关主机自己的本地网络接口地址之一匹配的非环回源将被作为欺骗防护 （`trusted_proxy_local_interface_source`） 拒绝。如果接口发现本身失败，请求也会被拒绝 （`trusted_proxy_local_interface_check_failed`）。
5. `requiredHeaders` 和 `userHeader` 必须存在且非空白。
6. `allowUsers`，如果非空，则必须包含提取的用户。

**转发请求头证据会覆盖本地直连回退中的 loopback 本地性。** 如果请求到达 loopback，但携带 `Forwarded`、任意 `X-Forwarded-*` 或 `X-Real-IP` 请求头，这些证据会使其不符合本地直连密码回退和设备身份门控，即使它作为 loopback 仍然会因为 trusted-proxy 认证而失败。

只有在 Gateway 仍然通过防火墙阻止直接远程访问，并且本地代理会剥离或覆盖客户端提供的身份请求头时，才启用 `allowLoopback`，因为这会信任与反向代理同等程度的 Gateway 主机本地进程。

不通过反向代理传输的内部网关客户端应使用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，而不是受信任代理身份标头。当未提供 `--url` 覆盖（包括 `--json`）时，`openclaw gateway status` 会自动选择此本地密码。对于浏览器访问，请省略 `gateway.controlUi.allowedOrigins` 以使用 `gateway.publicOrigin` 作为默认值，或配置覆盖它的显式列表。

当未配置共享凭证时，更新并重新启动运行状况检查还可以重用本地 CLI 的现有配对设备凭证。这些检查读取现有身份和令牌状态，而不创建身份或保存替换凭据。
</Warning>

### <a id="configuration-reference"></a> 配置参考

<ParamField path="gateway.trustedProxies" type="string[]" required>
  要信任的代理 IP 地址（或 CIDR）数组。来自其他IP的请求被拒绝。 IPv4范围可以简单地书写（`10.0.0.0/8`）或以IPv4-映射的IPv6形式（`::ffff:10.0.0.0/104`）；两者是等效的，并且都与作为 `10.1.2.3` 或 `::ffff:10.1.2.3` 连接的对等点匹配。映射前缀计算 96 个前导映射位，因此 `::ffff:0:0/96` 表示所有 IPv4 — 包括环回，这仍然需要 `gateway.auth.trustedProxy.allowLoopback`。本机 IPv6 对等点永远不会匹配映射范围。
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
  在可信代理身份验证后自动批准新浏览器和本机 UI 操作员设备以及相同密钥范围升级。
</ParamField>
<ParamField path="gateway.auth.trustedProxy.deviceAutoApprove.scopes" type="string[]" default='["operator.read", "operator.write", "operator.approvals", "operator.questions"]'>
  授予自动批准的操作员设备的最大范围。显式列出 `operator.admin` 可以让每个经过代理身份验证的用户请求自动完全管理设备授予，使无范围请求自动接收完全管理，并触发 CRITICAL `gateway.trusted_proxy_device_auto_approve_admin` 安全审核结果以及网关启动警告。
</ParamField>

<Warning>
任何可以连接到网关的本地进程都可以通过发送身份标头来模拟环回反向代理。仅当反向代理是传入用户流量的唯一本地侦听器、直接网关访问被锁定并且您信任本地进程时，才启用 `allowLoopback`。代理必须对用户进行身份验证，并剥离或覆盖客户端提供的身份标头；仅需要的标头无法将代理与另一个本地进程区分开来。
</Warning>

### <a id="configure-with-the-wizard"></a> 使用向导进行配置

运行 `openclaw configure --section gateway` 并选择 **Trusted Proxy**。在网关的运行时规则下输入与环回源匹配的地址或 CIDR 会显示上述安全警告，并询问是否允许环回身份验证。这包括包含环回的范围，即使它们的基地址不是环回。新配置的默认值为 **No**。 **是**保存`gateway.auth.trustedProxy.allowLoopback: true`； **No** 将其保留为未设置，并警告环回代理请求将因 `trusted_proxy_loopback_source` 而失败，并带有返回此页面的链接。

重新配置现有可信代理设置时，提示默认为现有 `allowLoopback` 选择加入。选择 **No** 将撤销它。如果没有输入的地址或范围与环回源匹配，向导将保持现有值不变。相同模式重新配置还逐字保留 `deviceAutoApprove`；此提示不会更改设备注册策略。从另一种身份验证模式切换不会恢复休眠的可信代理选择加入。

启用实时配置重新加载后，无需重新启动网关即可应用对 `gateway.trustedProxies`、`gateway.allowRealIpFallback`、`gateway.auth.allowTailscale`、`gateway.auth.identityScopes` 和 `gateway.auth.trustedProxy` 的更改。传输策略更改要求客户端重新连接，同时保留访问授权未更改的已接受运行和排队输入。这包括代理标头、OIDC 映射、设备自动批准和可信代理地址。从 `allowUsers` 中删除连接的身份、禁用其身份验证方法或更改其自己的身份范围授权仍然会撤销已接受的工作。恢复拨款不会恢复已撤销的工作。对其他身份的身份范围编辑使现有连接和工作保持不变；没有经过验证的操作员身份的客户端也会忽略这些编辑。 HTTP 请求和插件身份验证 cookie 不使用身份范围授权，并且不受这些范围编辑的影响。配置编写器在连接关闭之前收到其接受的结果。待处理的握手和 HTTP 请求在异步等待后重新检查适用于其权限的策略。

## <a id="per-identity-scope-grants"></a> 按身份授予作用域

使用 `gateway.auth.identityScopes` 向选定的已验证用户授予额外的 operator 作用域，而无需扩大其持久设备授权：

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

映射键是经过验证的 trusted-proxy 身份或 Tailscale WhoIs 登录身份。 电子邮件匹配不区分大小写；非电子邮件身份则必须完全匹配。在每次连接时，OpenClaw 会将匹配身份的作用域添加到设备授权的作用域中，然后应用显式的 `x-openclaw-scopes` 连接上限。

这些授权仅在会话期间有效。它们不会创建或更新设备配对记录，也不会触发设备作用域升级请求。Token、密码和无身份验证连接不携带已验证身份，因此永远不会获得授权。

每个接收附加身份范围的连接都会发出 `info` 安全审核记录，其中包含已验证的身份、添加的范围、身份验证方法和连接 ID。重新连接保留自己的记录，以便日志可以记录每一次拨款申请。将 `logging.level` 保留为 `info` 或更详细以保留这些记录；应用配置的会话授权不是警告。此连接日志与 [ 活动审核分类账](/gateway/audit) 分开。

## <a id="automatic-device-approval"></a> 自动设备批准

可信代理身份验证可以选择使用代理身份作为新浏览器和本机 UI 操作员设备以及相同密钥范围升级的批准边界：

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
          scopes: ["operator.read", "operator.write", "operator.approvals", "operator.questions"],
        },
      },
    },
  },
}
```

默认值为 `enabled: false`。启用后，所有以下规则均适用：

1. WebSocket 必须通过 `trusted-proxy` 方法完成身份验证，并且具有非空的用户身份；当配置了允许列表时，该身份还必须通过 `allowUsers`。Token、密码、Tailscale 以及未经身份验证的连接永远不会使用此策略。
2. 新的浏览器操作员设备（包括 Control UI 和 WebChat）、UI 模式下的本机 macOS、Linux、iOS 和 Android 客户端，以及从具有相同功能的现有设备进行的示波器升级配对的公钥自动解析。本机客户端必须提供签名的设备身份，并在每个连接上通过代理进行身份验证。 Node- 角色连接、角色升级以及对固定平台或设备系列元数据的更改不符合此自动批准策略。如果现有拨款已经涵盖了自动批准的范围，则会话范围将缩小到该拨款，而无需配对请求或审核条目；否则，`deviceAutoApprove.scopes` 可以自动批准加宽的路口。在创建配对请求之前，使用不同公钥声明现有设备 ID 的连接将被拒绝。
3. 该设备已获得角色 `operator` 的批准。使用显式 `deviceAutoApprove.scopes` 列表，请求的范围与该列表相交；省略范围的请求接收列表。未设置列表时，默认为 `operator.read`、`operator.write`、`operator.approvals` 和 `operator.questions`。在使用此默认列表进行自动批准期间，OpenClaw 也会添加 `operator.questions`，即使较旧的 UI 客户端不请求它也是如此。明确的范围列表永远不会扩大。然后，生成的授权还受到连接的 [`x-openclaw-scopes`](#control-ui-pairing-behavior) 代理标头（如果存在）的限制，因此缩小用户范围的代理也会限制 **persistent** 设备授权，而不仅仅是会话 - 存在但为空的标头不会产生任何范围。即使客户端省略了自己的范围列表，此上限也适用。
4. `operator.admin` 只能通过在 `deviceAutoApprove.scopes` 中显式列出来允许。列出后，每个经过代理身份验证的用户都可以请求并自动接收新操作员设备上的完整管理权限；没有范围的请求会自动接收完整的管理。 `openclaw security audit` 报告 CRITICAL `gateway.trusted_proxy_device_auto_approve_admin` 发现结果，网关在启动时记录一次警告。当选定的已验证用户需要会话管理而不需要持久管理设备授予时，首选有针对性的 [`identityScopes`](#per-identity-scope-grants) 管理授予。

<Warning>
启用此选项会将新浏览器和本机 UI 操作员设备注册完全委托给反向代理身份。受损的代理帐户可以在每个配置的范围内注册持久设备。列出 `operator.admin` 使该设备成为完全管理员，无需手动批准。保持网关只能通过代理访问，需要强大的代理身份验证，覆盖身份标头，并使用狭窄的 `allowUsers` 列表。
</Warning>

## <a id="control-ui-pairing-behavior"></a> Control UI 配对行为

浏览器在每个源上附加一个设备标识，包括普通的 HTTP，因此第一次连接遵循标准配对流程：启用 [`deviceAutoApprove`](#automatic-device-approval) 时自动批准，否则在网关主机上进行一次性批准。当 `gateway.auth.mode = "trusted-proxy"` 处于活动状态并且请求通过可信代理检查时，只有来自根本无法提供设备身份的浏览器的 Control UI 会话才会被允许无设备。

范围影响：

- 无设备的 Control UI WebSocket 会话无法自行声明权限。OpenClaw 会将其请求的 scope 列表清除为 `[]`，然后在代理身份验证通过后应用任何匹配的服务端 `identityScopes` 授权。
- 如果在 WebSocket 连接成功后方法失败并显示 `missing scope`，请重新加载，以便浏览器配对其设备标识，或批准待处理的设备请求。请参阅 [Control UI 不安全 HTTP](/web/control-ui/connect-and-pair#insecure-http)。

反向代理 scope 限制：如果你的代理在 Control UI WebSocket 升级请求中发送 `x-openclaw-scopes`，OpenClaw 会限制设备注册或升级请求，以及设备授权和身份授权会话 scope 的最终并集。此标头不会授予 scope；它只会缩小权限范围。当 `deviceAutoApprove.enabled` 为 true 时，该限制也会限制由[自动设备批准](#automatic-device-approval)写入的持久设备授权。

影响：

- 配对不再是无设备 Control UI 访问的主要网关。匹配的 `identityScopes` 条目可以授权该会话，而无需创建配对记录。当 `deviceAutoApprove.enabled` 为 true 时，代理身份也成为新浏览器和本机 UI 操作员设备注册的批准门。
- 你的反向代理身份验证策略和 `allowUsers` 将成为实际的访问控制。
- 仅将网关入口锁定到受信任的代理 IP（`gateway.trustedProxies` + 防火墙）。

自定义 WebSocket 客户端不是 Control UI 会话。已停用的 Control UI 升级输入不会向任意 `client.mode: "backend"` 或 CLI- 型客户端授予临时访问权限。当 HTTP request/response 表面更适合时，自定义自动化应使用设备 identity/pairing、保留的直接本地 `client.id: "gateway-client"` 后端帮助程序路径或 [admin HTTP RPC 插件 ](/plugins/admin-http-rpc)。

## <a id="operator-scopes-header"></a> 操作员作用域头

Trusted-proxy 认证是一种**携带身份**的 HTTP 模式，因此调用方可以在 HTTP API 请求中通过 `x-openclaw-scopes` 选择性地声明操作员作用域。

注意：WebSocket 作用域由 Gateway 协议握手和设备身份绑定共同决定。在 Control UI 的 WebSocket 升级请求中，`x-openclaw-scopes` 只会作为协商得到的会话作用域的上限，而不是授予权限。参见 [Control UI 配对行为](#control-ui-pairing-behavior)。

示例：

- `x-openclaw-scopes: operator.read`
- `x-openclaw-scopes: operator.read,operator.write`
- `x-openclaw-scopes: operator.admin,operator.write`

行为：

- 当该头存在时，OpenClaw 会遵循所声明的作用域集合。
- 当该头存在但为空时，请求声明**没有**任何操作员作用域。
- 当标头不存在时，正常的身份承载 HTTP API 将回退到标准操作员默认范围集（`operator.admin`、`operator.read`、`operator.write`、`operator.approvals`、`operator.pairing`、`operator.talk.secrets`）。
- Gateway-auth **插件 HTTP 路由**的默认范围更窄：当 `x-openclaw-scopes` 缺失时，它们的运行时作用域会回退为仅 `operator.write`。
- 即使 trusted-proxy 认证成功，浏览器来源的 HTTP 请求仍然必须通过 `gateway.controlUi.allowedOrigins`（或有意启用的 Host 头回退模式）。

实用规则：当你希望 trusted-proxy 请求比默认值更窄，或者当某个 gateway-auth 插件路由需要比 write 作用域更强的权限时，请显式发送 `x-openclaw-scopes`。

## <a id="tls-termination-and-hsts"></a> TLS 终止与 HSTS

使用一个 TLS 终止点，并在那里应用 HSTS。

<Tabs>
  <Tab id="proxy-tls-termination-recommended" title="代理 TLS 终止（推荐）">
    当你的反向代理为 `https://control.example.com` 处理 HTTPS 时，请在该域名的代理上设置 `Strict-Transport-Security`。

    - 适用于面向互联网的部署。
    - 将证书 + HTTP 加固策略集中在一处管理。
    - OpenClaw 可以在代理后方保持为 loopback HTTP。

    示例请求头值：

    ```text
    Strict-Transport-Security: max-age=31536000; includeSubDomains
    ```

  </Tab>
  <Tab id="gateway-tls-termination" title="网关 TLS 终端">
    如果OpenClaw本身直接服务HTTPS（无TLS-终止代理），则设置：

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

### <a id="rollout-guidance"></a> 部署建议

- 先从较短的 max age 开始，例如 `max-age=300`，以便在验证流量时使用。
- 只有在确认充分后，才增加到较长的值，例如 `max-age=31536000`。
- 仅当每个子域均已 HTTPS- 就绪时才添加 `includeSubDomains`。
- 只有当你确实为整个域名集合满足 preload 要求时，才使用 preload。
- 仅用于本地 loopback 的开发不会从 HSTS 中获益。

## <a id="proxy-setup-examples"></a> 代理设置示例

Cloudflare 接入在[Cloudflare Tunnel和Access](/gateway/cloudflare-access)中进行端到端覆盖，包括隧道和节点路由。

<AccordionGroup>
  <Accordion id="pomerium" title="波梅里姆">
    Pomerium 通过 `x-pomerium-claim-email`（或其他 claim 请求头）传递身份，并在 `x-pomerium-jwt-assertion` 中传递 JWT。

    ```json5
    {
      gateway: {
        bind: "lan",
        trustedProxies: ["10.0.0.1"], // Pomerium's IP
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
  <Accordion id="caddy-with-oauth" title="球童与 OAuth">
    带 `caddy-security` 插件的 Caddy 可以对用户进行认证并传递身份请求头。

    ```json5
    {
      gateway: {
        bind: "lan",
        trustedProxies: ["10.0.0.1"], // Caddy/sidecar proxy IP
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
  <Accordion id="nginx-oauth2-proxy" title="nginx + oauth2-代理">
    oauth2-proxy 对用户进行认证，并在 `x-auth-request-email` 中传递身份。

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
  <Accordion id="traefik-with-forward-auth" title="具有前向身份验证的 Traefik">
    ```json5
    {
      gateway: {
        bind: "lan",
        trustedProxies: ["172.17.0.1"], // Traefik container IP
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

## <a id="mixed-token-configuration"></a> 混合令牌配置

如果同时还配置了共享令牌（`gateway.auth.token` 或 `OPENCLAW_GATEWAY_TOKEN`），Gateway 启动会拒绝 trusted-proxy 认证。这两者是互斥的，因为共享令牌会让同主机调用者通过与此模式要强制实施的代理验证身份完全不同的路径进行认证。

如果启动失败并出现类似 `gateway auth mode is trusted-proxy, but a shared token is also configured` 的错误：

- 在使用 trusted-proxy 模式时移除共享令牌，或
- 如果你打算使用基于令牌的认证，请将 `gateway.auth.mode` 切换为 `"token"`。

默认情况下，环回可信代理身份标头仍会被拒绝：同一主机调用者不会以代理用户身份进行静默身份验证。绕过代理的内部 OpenClaw 调用者可以改为使用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD` 进行身份验证。在受信任代理模式下，令牌回退仍然有意不受支持。

## <a id="restrict-a-separate-gateway-to-one-owner"></a> 将单独的网关限制为一个所有者

当一个所有者需要不同的信任边界时，请使用 [ 单独的 Gateway](/gateway/security/trust-model)。同一 OS 用户下的单独工作区、模型选择器筛选器或网关进程不会将其凭据和状态与作为该用户运行的其他代理隔离。

身份感知代理必须在转发任何 HTTP 请求或 WebSocket 升级 **之前拒绝所有其他用户**。将该策略绑定到经过验证的不可变身份，例如发行人限定的 OIDC 主题，并使用该身份覆盖 `userHeader`。将 `allowUsers` 设置为与第二次检查相同的单个值。网关`allowUsers`准确比较修剪后的标头值；它不会验证 JWT、解析帐户 ID 或使电子邮件地址不可变。 `requiredHeaders` 仅检查标头是否存在且非空白。

保持网关只能从该代理访问。不要单独依赖 `allowUsers` 来撤销访问：有效的配对设备或引导凭据有自己的 WebSocket 身份验证路径。现有连接还需要显式撤销或断开连接。在代理上对所有路由（包括插件路由）强制执行所有者限制，并且不要创建不受保护的节点路由。

对于仅代理网关，请忽略网关令牌和密码配置及其环境变量。当代理具有单独的网络身份时，保留 `allowLoopback: false`。网关内的提供者凭证向其提供者验证工作负载；它不会使用网关对人类进行身份验证。主机管理员仍然受到信任。

## <a id="security-checklist"></a> 安全检查清单

在启用受信任代理认证之前，请确认：

- [ ] **Proxy 是唯一通路**：Gateway 端口已设置防火墙，仅允许您的代理访问。
- [ ] **trustedProxies 是最小的**：只有您的实际代理 IP，而不是整个子网。
- [ ] **环回代理源是故意的**：可信代理身份验证拒绝环回源请求，除非为同一主机代理显式启用 `gateway.auth.trustedProxy.allowLoopback`。
- [ ] **代理会移除标头**：您的代理会覆盖（而不是追加）客户端传入的 `x-forwarded-*` 标头。
- [ ] **Client IP 可归因于**：代理始终使用原始非环回客户端地址重建 `X-Forwarded-For`。
- [ ] **TLS 终止**：您的代理处理 TLS；用户通过 HTTPS 连接。
- [ ] **浏览器源已配置**：非环回Control UI使用`gateway.publicOrigin`，省略`gateway.controlUi.allowedOrigins`，或显式白名单。
- [ ] **allowUsers 设置为**（推荐）：限制为已知用户，而不是允许任何经过身份验证的用户。
- [ ] **不存在混合令牌配置**：不要同时设置 `gateway.auth.token` 和 `gateway.auth.mode: "trusted-proxy"`。
- [ ] **本地密码回退保持私有**：如果为内部直接调用方配置了 `gateway.auth.password`，请保持 Gateway 端口受防火墙保护，以便非代理远程客户端无法直接访问。
- [ ] **设备自动批准是有意设置的**：如果 `deviceAutoApprove.enabled` 为 true，请将反向代理账户安全视为设备注册边界，并确保授予的作用域列表不包含管理员权限且保持最小范围。

## <a id="security-audit"></a> 安全审计

`openclaw security audit` 会将受信任代理认证标记为 **严重** 级别的发现。这是有意为之；它是在提醒你，安全性被委托给了你的代理配置。

审计会检查：

- Base `gateway.trusted_proxy_auth` warning/critical 提醒。
- 缺少 `trustedProxies` 配置。
- 缺少 `userHeader` 配置。
- `allowUsers` 为空（允许任何已认证的用户）。
- 为同主机代理来源启用了 `allowLoopback`。
- 启用操作员设备自动批准（将新浏览器和本机 UI 设备配对委托给代理身份）。

当 Control UI 暴露时，还会应用一些独立的、非受信任代理特定的发现：`gateway.controlUi.allowedOrigins` 的通配符或缺失，以及 Host 标头来源回退。

## <a id="troubleshooting"></a> 故障排查

### <a id="control-ui-says-proxy-authentication-required"></a> Control UI 表示需要代理身份验证

网关可访问，但拒绝代理身份验证或转发身份。对于 `AUTH_IDENTITY_HEADER_REQUIRED`，所需的代理标头丢失或为空；这不是网络中断。

打开配置的经过身份验证的代理或 SSO 仪表板 URL 并在那里登录，而不是直接访问网关的环回 URL。如果错误仍然存​​在，请要求网关管理员验证 **WebSocket 升级请求** 的身份和必需标头转发，并确认已允许登录帐户。

网关令牌不能替代代理身份验证。不要从浏览器发送身份标头、扩大 `trustedProxies` 或删除 `allowUsers` 来解决拒绝问题。

<AccordionGroup>
  <Accordion title="trusted_proxy_untrusted_source">
    请求并非来自 `gateway.trustedProxies` 中的 IP。请检查：

    - 代理IP是否正确？ （Docker 容器 IP 可以更改。）
    - 你的代理前面是否还有负载均衡器？
    - 使用 `docker inspect` 或 `kubectl get pods -o wide` 查找实际 IP。

  </Accordion>
  <Accordion title="trusted_proxy_loopback_source">
    OpenClaw 拒绝了来自 loopback 源的受信任代理请求。

    检查：

    - 代理是否正从 `127.0.0.1` / `::1` 连接？
    - 你是否在尝试对同主机 loopback 反向代理使用受信任代理认证？

    使固定：

    - 对不通过代理的内部同主机客户端使用显式配置的本地密码；受信任代理模式不支持令牌回退，或者
    - 通过非 loopback 的受信任代理地址进行路由，并将该 IP 保留在 `gateway.trustedProxies` 中，或者
    - 对于有意使用的同主机反向代理，将 `gateway.auth.trustedProxy.allowLoopback = true`，把 loopback 地址保留在 `gateway.trustedProxies` 中，并确保代理会剥离或覆盖身份头。

  </Accordion>
  <Accordion title="trusted_proxy_local_interface_source / trusted_proxy_local_interface_check_failed">
    请求的源 IP 与网关主机自己的非环回网络接口地址（不是代理）之一相匹配，以防止尾网或 Docker 桥接网络上的欺骗性同一主机流量。 `..._check_failed` 表示接口发现本身出错，因此 OpenClaw 拒绝该请求。

    检查：

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
    用户已通过身份验证，但不在 `allowUsers` 中。使用允许的帐户登录或要求网关管理员查看预期的访问策略。不要删除白名单作为连接解决方​​法。
  </Accordion>
  <Accordion title="trusted_proxy_no_proxies_configured / trusted_proxy_config_missing">
    `gateway.auth.mode` 是 `"trusted-proxy"`，但 `gateway.trustedProxies` 为空，或者 `gateway.auth.trustedProxy` 本身缺失。在两者都设置之前，所有请求都会被拒绝。
  </Accordion>
  <Accordion title="trusted_proxy_origin_not_allowed">
    受信任代理认证已成功，但浏览器的 `Origin` 头未通过 Control UI 的来源检查。

    检查：

    - `gateway.controlUi.allowedOrigins` 是否包含精确的浏览器 origin。
    - 除非你有意启用全放行行为，否则不要依赖通配来源。
    - 如果你确实在使用 Host-header 回退模式，请明确设置 `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true`。

  </Accordion>
  <Accordion id="connection-succeeds-but-methods-report-missing-scope" title="连接成功，但方法报告缺少范围">
    WebSocket 已连接，但 `chat.history`、`sessions.list` 或 `models.list` 因 `missing scope: operator.read` 而失败。

    常见原因：

    - 无设备的 Control UI 会话：OpenClaw 会按设计清除自行声明的 scope，并且未配置匹配的 `gateway.auth.identityScopes` 授权。
    - 自定义后端客户端：已停用的 Control UI 升级输入永远不会授予对任意后端或 CLI- 形状的 WebSocket 客户端的访问权限。
    - `x-openclaw-scopes` 过于狭窄：如果你的代理在 Control UI WebSocket 升级请求中注入了此头，则会话 scope 会被限制为该集合。空的头值会产生无 scope 的会话。

    使固定：

    - 对于 Control UI，重新加载仪表板，以便浏览器生成设备标识并完成配对（也适用于 HTTP）。
    - 对于自定义自动化，请使用设备 identity/pairing、保留的直接本地 `gateway-client` 后端帮助程序路径或 [admin HTTP RPC](/plugins/admin-http-rpc)。
    - 不要将已退役的`gateway.controlUi.dangerouslyDisableDeviceAuth`密钥添加到当前配置中；它被忽略并 `openclaw doctor --fix` 将其删除。

  </Accordion>
  <Accordion id="websocket-still-failing" title="WebSocket 仍然失败">
    请确保你的代理：

    - 支持 WebSocket 升级（`Upgrade: websocket`、`Connection: upgrade`）。
    - 在 WebSocket 升级请求中传递身份头（不仅仅是 HTTP 请求）。
    - 没有为 WebSocket 连接设置单独的认证路径。

  </Accordion>
</AccordionGroup>

## <a id="migration-from-token-auth"></a> 从 token 认证迁移

<Steps>
  <Step id="configure-the-proxy" title="配置代理">
    配置你的代理以认证用户并传递请求头。
  </Step>
  <Step id="test-the-proxy-independently" title="独立测试代理">
    独立测试代理配置（使用带请求头的 curl）。
  </Step>
  <Step id="update-openclaw-config" title="更新 OpenClaw 配置">
    使用受信任代理认证更新 OpenClaw 配置。
  </Step>
  <Step id="restart-the-gateway" title="重新启动网关">
    重启 Gateway。
  </Step>
  <Step id="test-websocket" title="测试WebSocket">
    测试来自 Control UI 的 WebSocket 连接。
  </Step>
  <Step id="audit" title="审计">
    运行 `openclaw security audit` 并检查发现。
  </Step>
</Steps>

## <a id="related"></a> 相关内容

- [配置](/gateway/configuration) — 配置参考
- [Operator 作用域](/gateway/operator-scopes) — 角色、作用域和审批检查
- [远程访问](/gateway/remote) — 其他远程访问模式
- [安全性](/gateway/security) — 完整安全指南
- [Tailscale](/gateway/tailscale) — 仅限 tailnet 访问的更简单替代方案。
- [安全审核检查](/gateway/security/audit-checks) — 可信代理结果的目录条目
