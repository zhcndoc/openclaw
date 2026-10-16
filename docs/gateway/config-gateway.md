---
summary: "网关配置：绑定、身份验证、角色、Control UI、终端、远程、节点、TLS 和重新加载"
read_when:
  - "绑定或验证网关"
  - "分配网关角色或节点配对"
  - "配置网关 TLS 或重新加载行为"
title: "配置——网关"
---

`gateway.*` 下的网关运行时密钥。

完整密钥索引和其他顶级配置域，请参见[配置参考](/gateway/configuration-reference)。

## <a id="gateway"></a> 网关

```json5
{
  gateway: {
    mode: "local", // local | remote
    port: 18789,
    bind: "loopback",
    publicOrigin: "https://gateway.example.com",
    auth: {
      mode: "token", // none | token | password | trusted-proxy
      token: "your-token",
      // password: "your-password", // or OPENCLAW_GATEWAY_PASSWORD
      // trustedProxy: { userHeader: "x-forwarded-user" }, // for mode=trusted-proxy; see /gateway/trusted-proxy-auth
      allowTailscale: true,
      identityScopes: {
        "admin@example.com": ["operator.admin"],
      },
      rateLimit: {
        maxAttempts: 10,
        windowMs: 60000,
        lockoutMs: 300000,
        exemptLoopback: true,
      },
    },
    // Optional person-level access policy for team Gateway deployments.
    roles: {
      default: "guest",
      assignments: {
        byGithubLogin: { octocat: "maintainer" },
      },
      definitions: {
        maintainer: {
          sessions: { others: "write" }, // none | view | suggest | write
          agents: ["roboclaw"],
          scopes: ["operator.read", "operator.write", "operator.approvals"],
        },
        guest: {
          sessions: { others: "view" },
          agents: ["roboclaw"],
          scopes: ["operator.read", "operator.write"],
          sandbox: "required", // inherit (default) | required
        },
      },
    },
    tailscale: {
      mode: "off", // off | serve | funnel
    },
    controlUi: {
      enabled: true,
      basePath: "/openclaw",
      // experimental: { customPlugins: false }, // Labs: native UI from user-installed plugins
      // environment: { label: "edge", color: "amber" },
      // communityInvite: true, // show the compact sidebar Community entry
      // root: "dist/control-ui",
      // github: { token: { source: "store", provider: "default", id: "CONTROL_UI_GITHUB" } },
      // embedSandbox: "scripts", // strict | scripts | trusted
      // allowExternalEmbedUrls: false, // dangerous: allow absolute external http(s) embed URLs
      // automaticallyFetchFavicons: true, // SSRF-guarded link favicon fetches
      // allowedOrigins: ["https://control.example.com"], // optional override of publicOrigin
      // dangerouslyAllowHostHeaderOriginFallback: false, // dangerous Host-header origin fallback mode
    },
    uploads: {
      enabled: true, // set false to reject client file/image uploads
    },
    cliAgents: {
      enabled: true, // show create-capable CLI session targets in the model picker
    },
    terminal: {
      enabled: false,
      // shell: "/bin/zsh",
    },
    remote: {
      url: "ws://127.0.0.1:18789",
      transport: "ssh", // ssh | direct
      token: "your-token",
      // password: "your-password",
    },
    trustedProxies: ["10.0.0.1"],
    // Optional. Default false.
    allowRealIpFallback: false,
    nodes: {
      pairing: {
        // Silent same-host pairing and access upgrades. Default: enabled.
        // Set false to require explicit approval for every device.
        autoApproveLocal: true,
        // Optional. Default unset/disabled.
        autoApproveCidrs: ["192.168.1.0/24", "fd00:1234:5678::/64"],
        // SSH-verified auto-approval. Default: enabled (true).
        // Set false to disable SSH verification only; this does not affect
        // autoApproveCidrs above. For manual-only node pairing, set false AND
        // unset autoApproveCidrs. Pass an object to tune: { user, identity,
        // timeoutMs, cidrs }.
        sshVerify: true,
      },
      commands: {
        allow: ["canvas.navigate"],
        deny: ["system.run"],
      },
    },
    tools: {
      // Additional /tools/invoke HTTP denies
      deny: ["browser"],
      // Remove tools from the default HTTP deny list for owner/admin callers
      allow: ["gateway"],
    },
    push: {
      apns: {
        relay: {
          baseUrl: "https://relay.example.com",
          timeoutMs: 10000,
        },
      },
    },
  },
}
```

<Accordion id="gateway-field-details" title="网关字段详细信息">

- `mode`：`local`（运行网关）或 `remote`（连接到远程网关）。除非为 `local`，否则网关不会启动
- `port`：本地网关绑定端口，复用WS + HTTP。它不选择 macOS SSH 隧道端口。优先级：`--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`。
- `publicOrigin`：网关的可选外部可访问 HTTPS 源，没有路径、查询或凭据。在本地开发期间，HTTP 仅适用于文字环回主机（`localhost`、`127.0.0.1` 或 `[::1]`）。每个请求者 MCP OAuth 需要此值并使用 `<publicOrigin>/oauth/mcp/callback` 作为其回调 URL。 Slack 会话卡操作、插件生成的查看器链接以及到 Control UI 的聊天深层链接也使用此来源。当 `gateway.controlUi.allowedOrigins` 被省略时，它提供浏览器源允许列表。当 Control UI 在反向代理路径前缀下提供服务时，单独设置 `gateway.controlUi.basePath`。
- `bind`：`auto`、`loopback`（默认）、`lan`（`0.0.0.0`）、`tailnet`（Tailscale IPv4（如果可用），否则环回），或 `custom`（一个 IPv4 地址）。对于同一主机客户端，已解析的 `tailnet` 地址和除 `127.0.0.1` 或 `0.0.0.0` 之外的任何 `custom` 地址需要在同一端口上使用 `127.0.0.1`；如果任一侦听器无法绑定，则启动失败。非环回暴露仍然仅限于所选接口。
- **旧版 bind 别名**：请在 `gateway.bind` 中使用绑定模式值（`auto`、`loopback`、`lan`、`tailnet`、`custom`），不要使用主机别名（`0.0.0.0`、`127.0.0.1`、`localhost`、`::`、`::1`）
- **Docker 说明**：默认的 `loopback` 绑定会在容器内监听 `127.0.0.1`。使用 Docker 桥接网络（`-p 18789:18789`）时，流量会从 `eth0` 到达，因此网关无法访问。请使用 `--network host`，或设置 `bind: "lan"`（或设置 `bind: "custom"` 并将 `customBindHost: "0.0.0.0"`），以监听所有接口
- **Auth**：默认必填。非环回绑定需要网关身份验证。实际上，这意味着共享 token/password 或具有 `gateway.auth.mode: "trusted-proxy"` 的身份感知反向代理。默认情况下，设置向导会生成一个令牌。
- 如果两者都`gateway.auth.token`和`gateway.auth.password`已配置（包括SecretRefs）， 放`gateway.auth.mode`明确地`token` or `password`。启动和服务install/repair当两者均已配置且模式未设置时，流会失败。
- `gateway.auth.mode: "none"`：显式的无认证模式。仅用于受信任的本地回环设置；引导提示会有意不提供此选项
- `gateway.auth.mode: "trusted-proxy"`：将 browser/user 身份验证委托给身份感知反向代理并信任来自 `gateway.trustedProxies` 的身份标头（请参阅 [ 受信任代理 Auth](/gateway/trusted-proxy-auth)）。该模式默认需要 **non-loopback** 代理源；同主机环回反向代理需要显式 `gateway.auth.trustedProxy.allowLoopback = true`。内部同主机调用者可以使用 `gateway.auth.password` 作为本地直接后备； `gateway.auth.token` 与可信代理模式保持互斥。
- `gateway.auth.allowTailscale`：当`true`、Tailscale服务身份标头可以满足Control UI/WebSocket身份验证时（通过`tailscale whois`验证）。 HTTP API 端点执行 **not** 使用 Tailscale 标头身份验证；它们遵循网关的正常 HTTP 身份验证模式。此无令牌流假设网关主机是可信的。当 `tailscale.mode = "serve"` 时默认为 `true`。
- `gateway.auth.identityScopes`：将经过验证的 trusted-proxy 用户或 Tailscale WhoIs 登录映射到仅限连接的操作员权限范围。电子邮件键不区分大小写；其他身份则必须完全匹配。对于 trusted-proxy Control UI 连接，`x-openclaw-scopes` 会限制设备注册或升级请求，以及最终的设备加身份会话权限范围。授权不会创建或修改配对记录。令牌、密码和无认证连接没有经过验证的身份，因此不会获得授权
- `gateway.roles`：团队网关上经过身份验证的用户配置文件的可选命名操作员角色。每个定义指定 `sessions.others`（`none`、`view`、`suggest` 或 `write`）、允许的会话创建和代理运行 `agents`（`"*"` 或代理 ID 数组）以及封闭的`scopes` 上限也适用于身份验证的 HTTP 请求和签名的 Control UI 插件授权。可选的 `sandbox` 默认情况下是 `"inherit"`，或者是在该角色下创建的沙箱会话的 `"required"`，即使代理的沙箱模式是 `"off"` 也是如此。此要求由经过身份验证的创建者记录一次，不能通过角色更新或会话突变进行更改，并且不会影响现有会话。需要沙箱的人无法启动主机执行会话，包括通过邀请启动；不可用的沙箱后端会阻止会话执行，并且提升的或主机目标覆盖无法逃脱。管理员范围的 `users.setRole` 网关方法分配或清除配置文件的角色，并立即断开其活动客户端的连接，以便它们使用当前权限重新连接。在配置角色时，经过身份验证的操作员会话不会接收可重用、非人员绑定的 device/bootstrap 令牌，并且拒绝无身份设备令牌或引导令牌操作员身份验证；通过可信代理或其他支持的经过验证的身份重新连接。 `assignments.byGithubLogin` 在人员首次登录之前将不区分大小写的 GitHub 登录映射到定义的角色；有效的显式配置文件分配获胜，然后是匹配的缓存 GitHub 身份，然后是 `default`。无效或重复的规范化登录以及未知的角色名称将被拒绝；没有缓存的 GitHub 身份的配置文件不匹配。 `default` 是必需的，并且必须命名已配置的定义。 `users.list` 保留显式 `role` 并添加 `effectiveRole` 和 `roleSource`（`assigned`、`githubLogin` 或 `default`）。 `sessions.others: "none"` 还否认网关范围内的 `usage.cost`；审计诊断和其他 `operator.write` 控制平面功能仍然是共享域表面，而不是敌对租户隔离。省略 `roles` 会使现有的单独部署和共享秘密部署保持不变。请参见 [ 操作员范围](/gateway/operator-scopes#named-operator-roles)。
- `gateway.roles.definitions.<role>.accessPolicyPlugin`：可选的精确插件 ID，其注册的网关访问策略必须授权受此角色管理的人员。例如，默认访客角色可能需要 `"visitor-access"`，而独立分配的员工角色则省略该字段。当插件丢失或禁用、其清单丢失或格式错误、加载失败或策略不提供当前权限时，网关会拒绝此角色的访问。当插件不可用时，参考仍然有效配置，因此独立工作人员和网关所有者可以修复它。省略该字段不会添加任何插件依赖项。
- `gateway.roles.definitions.<name>.modelPolicy`：角色请求、排队工作和子级的可选模型上限。对于 `{}`，允许的模型遵循指定源代理的主要和备用模型。 `sourceAgent`选择该智能体； `allow` 替换成员身份，`deny` 排除已解析的模型引用、别名或尾随族模式，例如 `provider/restricted-*`。空的 `allow` 会拒绝所有模型。启用配置重新加载后，在提交时将应用仅限于现有角色模型策略的编辑，而无需重新启动网关：使用已删除模型的请求将被取消，而允许的模型和不相关的工作将继续。其他角色更改会热应用并重新连接具有当前权限的客户端，包括与模型策略编辑结合使用时。现有的手动模型规则仍然适用；省略的角色模型策略和系统访问权限不变。请参见 [ 命名操作员角色](/gateway/operator-scopes#named-operator-roles)。
- 角色定义、代理信任、身份范围、Tailscale 身份验证和受信任代理策略热应用。模型策略之外的更改会使用当前权限重新连接现有客户端，但经过验证的 WebSocket 登录名会保留其连接并在仅另一个登录名的身份授予更改或仅重新排序其自己的范围集时接受运行。对自己已解决的拨款的更改将撤销保留和委派的工作；恢复拨款并不会恢复该权力。挂起的握手和写入不能保留已撤销的访问权限。身份验证模式更改仍然需要重新启动网关。
- `gateway.auth.rateLimit`：可选的失败验证限制器。适用于每个客户端 IP 和每个身份验证范围（共享密钥和设备令牌是独立跟踪的）。被阻止的尝试返回 `429` + `Retry-After`。更改热应用到现有的限制器：记录的故障、赢得的锁定期限和未决的环回延迟仍然存在。新的限制和豁免适用于后续尝试；删除该部分将恢复默认值。
  - 在异步 Tailscale Serve Control UI 路径上，同一 `{scope, clientIp}` 的失败尝试会在写入失败前串行化。因此，来自同一客户端的并发错误尝试可能会在第二个请求时触发限制器，而不是两个请求都作为普通不匹配竞争通过
  - `gateway.auth.rateLimit.exemptLoopback` 默认为 `true`；当你有意希望本地主机流量也受到速率限制时设置为 `false`（适用于测试设置或严格代理部署）
- 浏览器源 WS 认证尝试始终会受到限制，并禁用回环豁免（纵深防御浏览器发起的本地主机暴力破解）
- 在回环地址上，这些浏览器源锁定会按规范化的 `Origin` 值隔离，因此一个本地主机源的重复失败不会自动锁定另一个源
- `tailscale.mode`：`serve`（仅限尾网，环回绑定）或`funnel`（公共，需要身份验证）。 OpenClaw 将路由保留为前台声明，因此除非该路由处于活动状态并且在网关停止时释放该路由，否则启动会失败。不支持名为 Tailscale 的服务，因为 Tailscale CLI 只允许它们作为持久后台路由。
- `tailscale.preserveFunnel`：已弃用的迁移防护。当`true`和`tailscale.mode = "serve"`时，OpenClaw在启动时重新应用Serve之前检查`tailscale funnel status`。如果无法检查该状态，则在普通网关侦听器打开之前启动会失败。仍然以普通网关端口为目标的外部漏斗不会接收受管理入口来源。 OpenClaw 保持外部路由不变并发出警告。该路由只能通过具有有效转发客户端地址的显式配置 `gateway.trustedProxies` 源来使用通用代理归因；受网关保护的路由需要配置身份验证，而聚合检查和插件身份验证的 Webhook 则保留其自己的响应和身份验证策略。首先配置`gateway.auth.password`（最好是SecretRef）或`OPENCLAW_GATEWAY_PASSWORD`，并将`gateway.auth.mode`设置为`password`。然后运行 ​​`openclaw config set gateway.tailscale.mode funnel`，然后运行 ​​`openclaw config unset gateway.tailscale.preserveFunnel`。默认`false`。
- `controlUi.experimental.customPlugins`：允许本机浏览器 UI 来自用户安装的插件，包括本地开发插件。默认值：`false`。通过 **设置 → 实验室 → 自定义插件 UI** 启用或将此布尔值设置为 `true`。本机 UI 使用登录运营商的网关权限运行，因此仅针对受信任的插件启用它。已启用捆绑插件中的本机 UI 在设置关闭时仍然可用；后端插件 API、普通插件加载、沙盒仪表板小部件和 MCP 应用程序不受影响。更改连接的浏览器选项卡中的热应用和刷新插件视图。禁用后，重新加载选项卡以清除已运行的插件 JavaScript。请参阅 [ 功能插件](/plugins/feature-plugins#enable-custom-plugin-ui)。
- `controlUi.experimental.claws`：启用官方 ClawHub 启动器发现和添加代理、网关 catalog/Add 方法和本地 CLI 添加。默认值：`false`。通过 **Settings → Labs → Claws** 启用或将此布尔值设置为 `true`。 Add 创建一个普通代理并安装其需求；重复添加会创建另一个代理。关闭开关会阻止新的添加操作，而现有代理将继续运行。在交换机更改之前已接受的添加可以安全完成。参见 [Claws](/cli/claws)。
- `controlUi.allowedOrigins`：网关浏览器连接的显式浏览器来源允许列表。省略时，如果已配置，则默认为 `gateway.publicOrigin`。包括 `[]` 在内的显式列表将取代此默认值。私有同源 LAN/Tailnet UI 从环回、RFC1918/link-local、`.local`、`.ts.net` 或 Tailscale CGNAT 主机加载，无需启用主机标头回退即可接受。
- `controlUi.environment`：用​​于区分网关环境的可选视觉标识。设置 `{ label: "edge", color: "amber" }` 以显示匹配的顶部条纹、特工头像环、环境药丸、浏览器标题后缀和有色图标。 `label` 已被修剪，并且必须包含 1–24 个字符。 `color` 必须是 `teal`、`amber`、`purple`、`coral`、`pink`、`blue`、`green`、`red` 或`gray`。登录前标签和颜色可见；省略该设置以保持默认外观不变。
- `controlUi.newSessionModelDefaults`：`"last-used"`（默认）恢复记住的新会话模型、运行时和推理选择。设置 `"configured"` 以使用所选代理的配置默认值启动新草稿。在浏览器刷新或重新连接后，适用于 `/new` 以及由该网关提供服务的 UI 中的命令选项板。显式选择仍然可编辑，并且可以在当前未发送的草稿中重新加载；提交该草稿会取消其选择，因此下一个新草稿将使用配置的默认值。现有对话未受影响。保留工作空间、放置和快速模式首选项；存储的首选项不会被删除。在代理（或`agents.defaults`）上配置所需的模型和`thinkingDefault`；此设置不强制特定的模型或推理级别。
- `controlUi.communityInvite`：显示紧凑的 **Community** 侧边栏条目。选择它会在手机底部工作表中打开 Discord、Reddit 和 X 链接，或在较大屏幕上打开对话框。默认值：`true`。在为 UI 提供服务的网关上设置 `false`，以隐藏使用该部署的每个浏览器的条目，包括连接到不同远程网关的浏览器。设置热重载；现有页面会在浏览器刷新或重新连接后拾取它。早期的促销卡取消并不会隐藏此条目。
- `controlUi.github.token`：可选的 SecretRef 支持的服务凭证，用于 GitHub- 支持的配置文件验证、Control UI 项目发现和 GitHub 悬停预览，无需托管代理身份。将 `controlUi.github.host` 设置为选定的 `gateway.github.host` 以进行企业存储库服务访问。省略的凭证主机表示 `github.com`；不匹配的主机在请求之前被拒绝。公共档案元数据验证保留在公共发行者身上，并且仅使用符合条件的公共凭证；登录提供商拥有该人的身份。元数据缓存和配额冷却是自动的；请参阅 [Gateway 配置文件和 GitHub 信用值 ](/concepts/user-model#gateway-profile-and-github-credit)。悬停预览更喜欢所选代理的有效 `tools.github` 身份（包括继承的系统身份），并且仍然仅限于公共存储库。当网关应拥有独立于其共享进程环境的服务访问权限时，首选此显式设置。省略时，共享 `GH_TOKEN` 和 `GITHUB_TOKEN` 回退仅适用于 `github.com`，因此企业服务访问需要显式主机绑定凭据。显式配置但不可用的凭据会阻止请求，而不是允许不相关的凭据。其确切的环境或商店名称被排除在代理执行之外；自定义名称不会清除不相关的本机 `GH_TOKEN` 或 `GITHUB_TOKEN` 值。此凭证与 `tools.github` 代理身份分开，并且不会创建 OS-user 安全边界。会话 PR 摘要和 CI 详细信息使用存储库或签出记录的主机。公共 GitHub 会话保留在公共 API 上，并在选择企业主机时使用匿名访问；企业凭据和缓存的私人结果永远不会交叉到这些会话中。

- Tool活动描述由代理代理提供时自动出现；查看工具调用不请求实用模型完成。以前的 `controlUi.toolTitles` 设置已停用。运行 `openclaw doctor --fix` 将其从现有配置中删除。
- `controlUi.automaticallyFetchFavicons`：Control UI 聊天中的链接图标和浏览器选项卡社交预览。默认值：`true`。经过身份验证的浏览器向其同源网关询问每个主机名。对于内联链接图标，网关请求 `https://<hostname>/favicon.ico`，拒绝 IP 文字和 private/internal 目标，固定公共 DNS 结果，在相同严格的 SSRF 策略下重新验证每个重定向，限制 redirects/time/bytes/concurrency，验证图像，并返回私有可缓存图像斑点。 OpenClaw 在此流程中不使用 Google 或其他网站图标服务。这会公开链接到这些目标站点的主机名和网关的网络地址。浏览器选项卡还通过网关请求公共页面标题、声明的网站图标和 Open Graph 或 Twitter 图像，具有相同的公共网络限制和有限的 HTML/image 处理。不会转发任何浏览器 cookie 或站点凭据。这些预览公开了页面 URL 以及目标及其声明的图像主机的网关网络地址。设置 `false` 以禁用自动图标和页面预览获取；现有的实时浏览器屏幕截图预览不受影响。
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`：危险模式，为有意依赖 Host 标头源策略的部署启用 Host 标头源回退
- `cliAgents.enabled`：在 Control UI 新会话模型选取器中显示 **CLI 代理** 组。默认：`true`；设置 `false` 以禁用 CLI 代理和本机 CLI 会话创建。该组仅在网关通告 `sessions.catalog.list` 时出现，并且仅包含支持创建会话的目录提供程序。选择其中一个将打开侧边栏目录操作所使用的相同目录目标新会话流程。

  在 **设置 → 基础设施 → 网关** 中配置 CLI 代理。

  目录提供商还可以宣传基于终端的会话创建。仅当 `cliAgents.enabled` 打开、网关终端可用且所选提供商公开该功能时，该方法才可用。来电供应`cwd`；需要时，首先使用 `worktrees.create` 创建一个新的工作树，因为终端启动不提供工作树。

- `terminal.enabled`：管理范围的操作员终端。默认：`true`；设置 `false` 选择退出。终端在选定的代理工作区中启动主机PTY，继承网关进程环境，并且对于具有`sandbox.mode: "all"`的代理被拒绝。更改热应用：禁用关闭附加、分离和会话拥有的会话并取消挂起的打开；重新启用允许新的会话。重新加载打开的 Control UI 页面以获取更新的内容安全策略。
- `terminal.shell`：可选的 shell 可执行文件。未设置时，OpenClaw 在 Unix 上使用 `$SHELL`，在 Windows 上使用 `%ComSpec%`。更改热应用到新开通的终端；现有终端继续运行其原始外壳。
- `terminal.detachedSessionTimeoutSeconds`：终端会话在连接断开（页面重新加载、笔记本电脑睡眠）后存活的时间，通过 `terminal.attach` 保持可重新连接并重播最近的输出。默认值：`300`。设置 `0` 以在连接断开时终止会话。使用原始断开连接时间将更改热应用到现有的分离会话；过期的会话立即关闭，而连接的终端继续运行。分离的会话继续运行其命令，因此在共享或公开的主机上缩短此时间。
- `remote.transport`：`ssh`（默认）或 `direct` （ws/wss）。对于`direct`，`remote.url`对于公共主机必须是`wss://`；仅环回、LAN、链路本地、`.local`、`.ts.net` 和 Tailscale CGNAT 主机接受明文 `ws://`。
- `remote.url`：远程客户端端点。在macOS SSH模式下，其环回端口独立于`gateway.port`选择本地隧道端口。
- `remote.remotePort`：远程 SSH 主机上的网关端口。 macOS隧道回落到`remote.url`中的端口，然后回落到`18789`；当隧道和目标端口不同时，请明确设置此项。
- `remote.tlsFingerprint`：远程 `wss://` 网关的预期 SHA-256 证书指纹。 macOS 应用程序将其应用于 operator/control 和同伴节点连接。如果没有明确的值，macOS 仅在正常系统信任成功后才记录首次使用的 PIN。
- `remote.sshHostKeyPolicy`：macOS SSH 隧道主机密钥策略。默认值 `strict` 要求密钥已受信任。`openssh` 是对受管别名使用有效 OpenSSH 配置的显式选择；使用前请检查匹配的用户级和系统级 SSH 设置。macOS 应用和 `configure-remote` 在更改目标时会将此策略重置为 `strict`，除非再次显式选择加入
- `gateway.remote.token`／`.password` 是远程客户端凭据字段。它们不会单独配置网关认证
- `gateway.push.apns.relay.baseUrl`：基本 HTTPS URL 用于中继支持的 iOS 构建到网关的发布注册后使用的外部 APNs 中继。公共应用商店构建使用托管的 OpenClaw 中继。自定义中继 URL 必须与故意单独的 iOS build/deployment 路径匹配，该路径的中继 URL 指向该中继。
- `gateway.push.apns.relay.timeoutMs`：网关向中继发送请求的超时时间，单位为毫秒。默认为 `10000`
- 中继支持的注册信息会委托给特定的网关身份。配对的 iOS 应用会获取 `gateway.identity.get`，在中继注册中包含该身份，并将注册范围的发送授权转发给网关。其他网关无法复用该存储的注册信息
- `OPENCLAW_APNS_RELAY_BASE_URL`／`OPENCLAW_APNS_RELAY_TIMEOUT_MS`：上述中继配置的临时环境变量覆盖项
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`：仅用于环回 HTTP 中继 URL 的开发逃生口。生产中继 URL 应保留在 HTTPS 上。
- `OPENCLAW_HANDSHAKE_TIMEOUT_MS`：内置预认证网关 WebSocket 握手超时的可选环境变量覆盖项
- `channels.<provider>.healthMonitor.enabled`：按频道选择退出健康监视器重启，同时保持全局监视器启用
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多账户频道的按账户覆盖项。设置后，其优先级高于频道级覆盖项
- 仅当 `gateway.auth.*` 未设置时，本地网关调用路径才能使用 `gateway.remote.*` 作为后备。
- 如果通过 SecretRef 显式配置 `gateway.auth.token` / `gateway.auth.password` 并且未解析，则解析会因错误而停止，而不是回退到远程凭据。
- `trustedProxies`：终止 TLS 或注入转发客户端标头的反向代理 IP。仅列出您控制的代理。环回条目对于同一主机 proxy/local-detection 设置（例如 Tailscale Serve 或本地反向代理）仍然有效，但它们会使 **not** 使环回请求符合 `gateway.auth.mode: "trusted-proxy"` 的条件。
- `allowRealIpFallback`：当 `true` 时，如果 `X-Forwarded-For` 缺失，网关接受 `X-Real-IP`。默认`false`：忽略`X-Real-IP`。
- `gateway.nodes.pairing.autoApproveLocal`：静默批准来自受信任本地连接的配对、角色升级和范围升级（默认值：`true`）。范围升级还需要连接本身证明本地级凭据（身份验证模式 `none` 或共享 token/password）； Tailscale、可信代理和设备令牌连接将其配对范围保持为耐用的盖子。设置 `false` 以要求每个设备均获得明确批准；仅元数据重新连接刷新保持自动。
- `gateway.nodes.pairing.autoApproveCidrs`：可选的 CIDR/IP 白名单，用于自动批准没有请求范围的首次节点设备配对。未设置时将被禁用。这不会自动批准 operator/browser/Control UI/WebChat 配对，也不会自动批准角色、范围、元数据或公钥升级。
- `gateway.nodes.pairing.sshVerify`：SSH- 已验证首次节点设备配对的自动批准（默认：启用）。网关通过 SSH 返回到配对主机（BatchMode，严格主机密钥），并且仅在 `openclaw node identity` 设备密钥完全匹配时才批准。资格下限与`autoApproveCidrs`相同；检查仅限于 private/CGNAT 源地址，除非 `cidrs` 覆盖它们。将 `false` 设置为禁用，或将 `{ user, identity, timeoutMs, cidrs }` 设置为调谐。请参阅 [ 节点配对 ](/gateway/pairing#ssh-verified-device-auto-approval-default)。
- `gateway.nodes.commands.allow` / `gateway.nodes.commands.deny`：配对和平台白名单评估后声明的节点命令的全局 allow/deny 整形。 `commands.allow`为`camera.snap`、`camera.clip`、`codex.exec-server.stdio.v1`、`screen.record`、`health.summary`、`sms.search`、`sms.send`等分类命令的持久使能； `commands.deny` 会删除命令，即使平台默认或显式允许会包含该命令。 Codex 在配对设备或注册的云节点上远程执行还需要对每次执行服务器尝试进行单独的关键允许一次批准；持久的许可名单永远不会授予该批准。桌面共享 （`desktop.stream`）、计算机 Control 和移动 UI 控制改为依赖节点本地启用和配对。桌面共享开始在桌面节点上启用，并且仍然受到显式拒绝条目的影响。 iOS健康权限、Android SMS权限、网关命令授权是独立的。网关命令策略更改在默认重新加载模式下热应用到连接的节点，而无需授予额外的配对批准。当节点更改其声明的命令列表时，重新连接它并批准新的命令请求，以便网关存储加宽的表面。
- `gateway.tools.deny`：对 HTTP `POST /tools/invoke` 禁止的额外工具名称（扩展默认拒绝列表）
- `gateway.tools.allow`：从默认 HTTP 拒绝列表中移除工具名称，适用于 owner/admin 调用者。此项不会将带有身份的 `operator.write` 调用者升级为 owner/admin 权限；即使列入允许列表，`cron`、`gateway` 和 `nodes` 对非 owner 调用者仍不可用

</Accordion>

### <a id="disable-file-and-image-uploads"></a> 禁用文件和图像上传

将 `gateway.uploads.enabled` 设置为 `false` 以禁用客户端文件和图片上传：

```json5
{
  gateway: {
    uploads: { enabled: false },
  },
}
```

默认值为 `true`。更改热应用，无需重新启动网关。即使来自过时的浏览器或直接的 API 客户端，网关也会拒绝上传；隐藏 Control UI 控件不是强制边界。拒绝返回 `FORBIDDEN` 以及详细代码 `UPLOADS_DISABLED`（OpenAI- 兼容 HTTP API 返回状态 `403` 和错误代码 `UPLOADS_DISABLED`）。工具调用端点保留其现有的阻止工具信封以及相同的禁用上传消息。

该开关涵盖聊天和新会话附件、同伴附件、终端上传、内联 user/agent 头像、技能存档和文件夹上传以及工作板附件。携带新上传字节的直接节点和工具调用也会被拒绝；现有媒体传输仍然可用。在获取或解码之前，包含图像或文件内容部分（包括 URL- 支持的部分）的 OpenAI- 兼容请求将被拒绝。纯文本请求仍然有效。禁用的上传会被整体拒绝；它的附件不会被悄悄删除。已接受的写入完成稳定：例如，在交换机更改之前持续存在的化身仍会获得其匹配的代理配置更新。禁用上传不会撤消现有字节或将已完成的上传转变为拒绝。已接受的聊天、会话创建和出站消息请求的授权重试会重播其现有收据，而无需再次上传；新的幂等性密钥仍然需要启用上传。

下载、现有媒体、代理生成的 images/files、普通文本编辑、服务器本地内存迁移、通道入站媒体和内部工作人员文件传输仍然可用。此开关不是沙箱或数据丢失防护策略：它不会删除授权的 shell 访问、代理文件系统工具、配置管理或任意第三方插件功能。使用相应的工具、终端、渠道和插件策略。

### <a id="openai-compatible-endpoints"></a> OpenAI- 兼容端点

- 管理员 HTTP RPC：默认作为 `admin-http-rpc` 插件关闭。启用该插件以注册 `POST /api/v1/admin/rpc`。参见 [管理员 HTTP RPC](/plugins/admin-http-rpc)。
- Chat Completions：默认禁用。使用 `gateway.http.endpoints.chatCompletions.enabled: true` 启用。
- 响应API：`gateway.http.endpoints.responses.enabled`。
- 响应URL-输入强化：
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist` 空允许列表被视为未设置；使用 `gateway.http.endpoints.responses.files.allowUrl=false` and/or `gateway.http.endpoints.responses.images.allowUrl=false` 禁用 URL 获取。
- 可选的响应加固头：
  - `gateway.http.securityHeaders.strictTransportSecurity` 热适用于后续响应，包括健康检查。仅针对您控制的HTTPS 始发地设置；使用 `false` 或删除该值以停止发送标头。请参阅 [ 受信任代理 Auth](/gateway/trusted-proxy-auth#tls-termination-and-hsts)。

### <a id="multi-instance-isolation"></a> 多实例隔离

在一台主机上使用唯一端口和状态目录运行多个网关：

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json \
OPENCLAW_STATE_DIR=~/.openclaw-a \
openclaw gateway --port 19001
```

便捷标志：`--dev`（使用 `~/.openclaw-dev` + 端口 `19001`）、`--profile <name>`（使用 `~/.openclaw-<name>`）。

请参阅 [ 多个 Gateways](/gateway/multiple-gateways)。

### `gateway.tls`

```json5
{
  gateway: {
    tls: {
      enabled: false,
      autoGenerate: false,
      certPath: "/etc/openclaw/tls/server.crt",
      keyPath: "/etc/openclaw/tls/server.key",
      caPath: "/etc/openclaw/tls/ca-bundle.crt",
    },
  },
}
```

- `enabled`：在网关监听器上启用 TLS 终止（HTTPS/WSS）（默认：`false`）。
- `autoGenerate`：默认为 `true`。仅当两个文件都丢失时（包括配置的路径），网关启动才会生成本地自签名 cert/key 对；仅供 local/dev 使用。现有的部分对保持不变，启动失败。生成的文件在不覆盖现有路径的情况下发布，并且当文件系统支持时同步其父目录；不支持的目录刷新会发出结构化的持久性降级警告。
- `certPath`：TLS 证书文件的文件系统路径。
- `keyPath`：TLS 私钥文件的文件系统路径；请限制其访问权限。
- `caPath`：可选的 CA 证书包路径，用于客户端验证或自定义信任链。

启用自动重新加载后，网关会在其接受的路径上监视证书、密钥和 CA 文件。替换其内容会更新所有网关 HTTPS 侦听器，而无需断开现有连接。首先验证完整的材料；丢失、不可读或不匹配的对会保留先前的证书服务并记录失败。续订永远不会生成丢失的文件。背景观察也遵循原子符号链接和投影目录替换。更改 TLS 配置或文件路径仍需要重新启动网关。

`gateway.reload.mode: "off"` 也暂停证书更新。重新启用重新加载会检查当前文件，包括暂停时进行的续订。发现和新的配对有效负载使用所提供的指纹。保存的远程证书引脚仍由操作员控制：在使用更新的证书重新连接之前更新它们。

`triage`、`gateway status` 和 `gateway probe` 等客户端命令仅读取公共证书以确定本地 TLS 引脚。他们从不生成或修复 TLS 文件，也不需要服务器私钥或 CA 捆绑包。如果没有 `certPath`，他们会检查 state 目录下的 `gateway/tls/gateway-cert.pem`。丢失或无法读取的证书不提供隐式密码；正常的连接信任检查仍然适用。启动网关生成缺失的对，或在连接之前提供配置的证书文件。

长期本地运行状况检查会记住其端点的上次验证证书，从而在替换文件不完整或重新加载暂停时保留运行状况检查。他们仅在验证连接后才采用替代品。新的检查或错过中间续订的检查无法信任不再位于配置文件中并且从未经过验证的服务证书。完成或重新启用续订，以便侦听器和配置的证书一致。

### `gateway.reload`

```json5
{
  gateway: {
    reload: {
      mode: "hybrid", // off | hybrid
    },
  },
}
```

- `mode`：控制配置编辑在运行时的应用方式。
  - `"off"`：忽略实时编辑；更改需要显式重启。
  - `"hybrid"`（默认）：在进程内应用可热更新的更改，然后在更改需要重启时执行重启。

此前的 `"restart"` 和 `"hot"` 值已弃用；[`openclaw doctor --fix`](/cli/doctor) 会将二者都映射为 `"hybrid"`。

重新加载防抖和运行中操作的延后处理不再可配置，并使用内置默认值运行。[`openclaw doctor --fix`](/cli/doctor) 会从旧配置文件中移除已弃用的 `debounceMs` 和 `deferralTimeoutMs` 键。

---
