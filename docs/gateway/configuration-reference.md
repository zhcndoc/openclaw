- `plugins.entries.codex.config.codexPlugins.enabled`：为 Codex harness 启用原生 Codex plugin/app 支持。默认值：`false`。
- `plugins.entries.codex.config.codexPlugins.allow_all_plugins`：将当前已认证 Codex 账户中所有可访问的 app 暴露给每个新的原生 Codex thread。默认值：`false`。
- `plugins.entries.codex.config.codexPlugins.allow_destructive_actions`：已配置插件 app 请求的默认破坏性操作策略。使用 `true` 可在不提示的情况下接受安全的 Codex 审批 schema，使用 `false` 拒绝这些请求，使用 `"auto"` 将 Codex 所需的审批路由到 OpenClaw 插件审批，或使用 `"ask"` 在没有持久化审批的情况下，对每个插件写入／破坏性操作进行提示。`"ask"` 模式会清除受影响 app 的持久化 Codex 按工具审批覆盖值，并在 Codex thread 启动前为该 app 选择人工审批审核者。默认值：`true`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.enabled`：当全局 `codexPlugins.enabled` 同时为 `true` 时，启用已配置的插件条目。默认值：显式条目为 `true`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.marketplaceName`：稳定的 marketplace 身份。每个已解析条目都必须与 `pluginName` 一起提供该字段。支持 Codex 已发现的任何有效 marketplace，包括 `"openai-curated"`、`"openai-bundled"`、`"openai-primary-runtime"`、`"workspace-directory"` 以及仓库本地 marketplace 身份。缺少任一身份字段的条目会被忽略。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.pluginName`：稳定的 Codex 插件身份，必须与 `marketplaceName` 一起提供。对于插件标识符带有 marketplace 限定的 marketplace，请使用 Codex 报告的确切身份。`/codex plugins available` 会列出可发现的身份，所有者或 `operator.admin` 可以使用 `/codex plugins install <plugin>@<marketplace>` 安装插件。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.allow_destructive_actions`：按插件设置的破坏性操作覆盖值。省略时使用全局 `allow_destructive_actions` 值。按插件设置的值接受相同的 `true`、`false`、`"auto"` 或 `"ask"` 策略。

每个使用 `"ask"` 的已准入插件应用都会将该应用的审批请求转交给人工审核者。其他应用以及非应用 thread 的审批会继续使用其已配置的审核者，因此混合插件策略不会继承 `"ask"` 行为。

`codexPlugins.enabled` 是全局启用指令。通过迁移写入的显式插件条目会保留持久化的精选安装和修复资格。所有者或 `operator.admin` 可以使用 `/codex plugins install <plugin>@<marketplace>` 添加其他已发现的插件；Codex 仍负责上游安装和连接器身份验证。缺少确切身份、安装状态或可访问应用所有权的插件会安全失败。`plugins["*"]` 不受支持，本地 `marketplacePath` 值不会作为配置字段提供，因为它们与主机相关。有关 app-server 版本和就绪要求，请参见[原生 Codex 插件](/plugins/codex-native-plugins)。

`app/installed` 就绪检查（包含来自批量 `app/read` 的已授权元数据）会缓存一小时，并在过期时异步刷新。Codex thread 应用配置会在 Codex harness 会话建立时计算，而不是在每一轮计算；更改原生插件配置后，请使用 `/new`、`/reset` 或重启网关。

`codexPlugins.allow_all_plugins` 会将当前可访问的每个账户应用快照到每个新的原生 Codex thread 中。它不会安装插件或应用，不可访问的应用仍会被排除。账户应用使用全局的 `codexPlugins.allow_destructive_actions` 策略。当同一个应用同时通过两条路径存在时，显式插件条目优先。如果无法读取 `app/installed`，则账户范围的公开操作会安全失败。

## 桌面

主机桌面源允许控制界面桌面面板连接到 Gateway 机器。它可以连接到现有的回环 RFB 服务器，也可以在 Linux 上管理无头 TigerVNC/XFCE 桌面。这是一项 Labs 功能，默认关闭。

```json5
{
  desktop: {
    host: {
      enabled: true,
      managed: true,
      // port: 5900, // Setting a port selects attach mode instead.
      // passwordFile: "/path/to/vnc-password.txt",
    },
  },
}
```

- `desktop.host.enabled`：Gateway 重启后，将**此机器**公布为桌面源。
- `desktop.host.managed`：仅限 Linux。在首次观察时延迟启动由 Gateway 管理、仅限回环地址的 TigerVNC/XFCE 桌面，并在桌面会话的保持时间结束后停止。默认值：`false`。
- `desktop.host.port`：`127.0.0.1` 上的回环 RFB 端口（默认值：`5900`）。
- `desktop.host.passwordFile`：附加模式下可选的 UTF-8 VNC 密码文件。未提供时，控制界面会提示输入 VNC 密码，并将其保存在浏览器内存中，直到该连接结束。管理模式始终创建自己的临时密码。

OpenClaw 仅通过回环地址连接。显式设置 `port` 始终会选择附加模式，并且端口 `5900` 上现有的 RFB 监听器优先于管理模式。管理模式需要 `Xtigervnc`、`tigervncpasswd` 和 `startxfce4`；在 Debian/Ubuntu 上，请安装 `tigervnc-standalone-server tigervnc-tools xfce4-session`。Gateway 会为每个受管理会话创建新的临时 VNC 密码，从不持久化该密码，并同时管理 VNC 服务器和 XFCE 会话。

不使用管理模式时，请在第三方服务器支持的情况下将其配置为监听回环地址。在 Linux 上，使用仅限回环地址的 TigerVNC 或 `x11vnc`；不支持 GNOME Remote Desktop 的 VeNCrypt 模式。在 Windows 上，请在 VNC 服务器中启用 VNC 身份验证和回环访问。

在 macOS 上，启用**系统设置 → 通用 → 共享 → 屏幕共享**。现代屏幕共享使用 ARD 账户身份验证，因此 Gateway 会执行该握手，并向浏览器提供一个已经过身份验证的无身份验证 RFB 流。macOS 账户密码不会出现在观察结果、URL 或日志中。当屏幕共享关闭时，`openclaw doctor` 可以在获得明确确认后提供 `sudo launchctl` 修复；启用 macOS 系统服务后，根据 macOS 共享设置，该服务可能会暴露在其他网络接口上。

### 配对节点桌面

配对的 macOS、Windows 或 Linux 节点可以在同一个控制界面桌面面板中公开自己的桌面。此路径有意默认关闭，并且始终使用 `127.0.0.1` 上现有的节点本地 RFB 服务器；Gateway 从不要求节点连接到调用方选择的主机或端口。

在节点机器上，启用桌面源并配置附加模式：

```json5
{
  desktop: {
    host: {
      enabled: true,
      port: 5900,
      // passwordFile: "/path/to/vnc-password.txt",
    },
  },
}
```

更改此配置后重启节点主机。`managed: true` 是 Gateway 主机功能，不会在节点主机内部启动受管理的桌面；配对节点必须已经具有回环 RFB 服务器。

在 Gateway 上，明确启用危险命令并重启：

```json5
{
  gateway: {
    nodes: {
      commands: {
        allow: ["desktop.stream"],
        // deny: ["desktop.stream"], // deny always wins
      },
    },
  },
}
```

节点重新连接时会将 `desktop.stream` 宣布为配对界面升级。检查 `openclaw nodes pending`，然后使用 `openclaw nodes approve <requestId>` 批准新请求。节点只有在已连接且最终批准的命令仍获允许时，才会出现在桌面选择器中。

对于 VncAuth，`desktop.host.passwordFile` 会保留在节点上，并且只会发送到 Gateway 的已认证中继。没有密码文件时，控制界面会提示输入 VNC 密码。macOS ARD 凭据始终会在每次观察时提示输入。Gateway 会在向浏览器公开无身份验证 RFB 握手之前完成 ARD 或 VNC 身份验证，因此凭据不会返回到 URL、日志或 RPC 结果中。

桌面字节使用节点发起的专用二进制 WebSocket。普通节点调用仅作为可取消的生命周期句柄存在，绝不会携带帧缓冲数据。重新连接或更改节点的配对代际会关闭活动中继。要停用该功能，请从 `commands.allow` 中移除 `desktop.stream`，或将其添加到 `commands.deny`，然后重启 Gateway 并重新连接节点。

如果节点未出现在选择器中，请验证以下四个条件：节点本地桌面配置、回环 RFB 监听器、已批准的配对更新，以及 Gateway 的允许／拒绝策略。更改其中任意一项后，重启受影响的 Gateway 或节点主机，并再次检查 `openclaw nodes pending`。

---

## Gateway

```json5
{
  gateway: {
    mode: "local", // 本地 | 远程
    port: 18789,
    bind: "loopback",
    publicOrigin: "https://gateway.example.com",
    auth: {
      mode: "token", // 无 | 令牌 | 密码 | 可信代理
      token: "your-token",
      // password: "your-password", // 或 OPENCLAW_GATEWAY_PASSWORD
      // trustedProxy: { userHeader: "x-forwarded-user" }, // 适用于 mode=trusted-proxy；见 /gateway/trusted-proxy-auth
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
    tailscale: {
      mode: "off", // 关闭 | 提供服务 | 漏斗
      resetOnExit: false,
    },
    controlUi: {
      enabled: true,
      basePath: "/openclaw",
      // root: "dist/control-ui",
      // toolTitles: false, // 为工具调用启用面向 AI 用途的标题（会消耗实用模型令牌）
      // embedSandbox: "scripts", // strict | scripts | trusted
      // allowExternalEmbedUrls: false, // 危险：允许绝对路径的外部 http(s) 嵌入 URL
      // allowedOrigins: ["https://control.example.com"], // 非回环 Control UI 必需
      // dangerouslyAllowHostHeaderOriginFallback: false, // 危险：Host 标头来源回退模式
    },
    cliAgents: {
      enabled: false, // 实验功能：在模型选择器中显示可创建会话的 CLI 会话目标
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
    // 可选。默认 false。
    allowRealIpFallback: false,
    nodes: {
      pairing: {
        // 静默进行同主机配对和访问权限升级。默认：启用。
        // 设置为 false 后，每台设备都必须经过明确批准。
        autoApproveLocal: true,
        // 可选。默认未设置/禁用。
        autoApproveCidrs: ["192.168.1.0/24", "fd00:1234:5678::/64"],
        // 经 SSH 验证的自动批准。默认：启用（true）。
        // 设置为 false 仅禁用 SSH 验证；不会影响上面的
        // autoApproveCidrs。若要仅手动进行节点配对，请设置为 false 并且
        // 取消设置 autoApproveCidrs。传入对象可进行调整：{ user, identity,
        // timeoutMs, cidrs }。
        sshVerify: true,
      },
      commands: {
        allow: ["canvas.navigate"],
        deny: ["system.run"],
      },
    },
    tools: {
      // 额外的 /tools/invoke HTTP 拒绝项
      deny: ["browser"],
      // 从默认 HTTP 拒绝列表中移除工具，适用于 owner/admin 调用者
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

<Accordion title="网关字段详情">

- `mode`：`local`（运行网关）或 `remote`（连接到远程网关）。除非为 `local`，否则网关不会启动
- `port`：WS 与 HTTP 共用的单个多路复用端口。优先级：`--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`
- `publicOrigin`：网关可选的外部可访问 HTTPS 源，不带路径、查询参数或凭据。在本地开发期间，仅对字面量回环主机（`localhost`、`127.0.0.1` 或 `[::1]`）接受 HTTP。按请求方划分的 MCP OAuth 要求此值，并使用 `<publicOrigin>/oauth/mcp/callback` 作为回调 URL。Slack 会话卡片操作和插件生成的查看器链接也使用此源。当 Control UI 位于反向代理路径前缀下提供服务时，请单独设置 `gateway.controlUi.basePath`
- `bind`：`auto`、`loopback`（默认）、`lan`（`0.0.0.0`）、`tailnet`（可用时使用 Tailscale IPv4，否则使用回环地址）或 `custom`（单个 IPv4 地址）。解析出的 `tailnet` 地址以及除 `127.0.0.1` 或 `0.0.0.0` 之外的任何 `custom` 地址，都要求同一端口上的 `127.0.0.1` 供同主机客户端使用；如果任一监听器无法绑定，启动将失败。非回环暴露仍限制在所选接口上
- **旧版 bind 别名**：请在 `gateway.bind` 中使用绑定模式值（`auto`、`loopback`、`lan`、`tailnet`、`custom`），不要使用主机别名（`0.0.0.0`、`127.0.0.1`、`localhost`、`::`、`::1`）
- **Docker 说明**：默认的 `loopback` 绑定会在容器内监听 `127.0.0.1`。使用 Docker 桥接网络（`-p 18789:18789`）时，流量会从 `eth0` 到达，因此网关无法访问。请使用 `--network host`，或设置 `bind: "lan"`（或设置 `bind: "custom"` 并将 `customBindHost: "0.0.0.0"`），以监听所有接口
- **认证**：默认必需。非回环绑定要求网关认证。实际上，这意味着共享令牌／密码，或使用 `gateway.auth.mode: "trusted-proxy"` 的身份感知反向代理。引导向导默认会生成令牌
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`（包括 SecretRef），请将 `gateway.auth.mode` 明确设置为 `token` 或 `password`。当二者均已配置但模式未设置时，启动以及服务安装／修复流程会失败
- `gateway.auth.mode: "none"`：显式的无认证模式。仅用于受信任的本地回环设置；引导提示会有意不提供此选项
- `gateway.auth.mode: "trusted-proxy"`：将浏览器／用户认证委托给身份感知反向代理，并信任来自 `gateway.trustedProxies` 的身份标头（参见[可信代理认证](/gateway/trusted-proxy-auth)）。此模式默认要求代理源为**非回环**；同主机回环反向代理必须显式设置 `gateway.auth.trustedProxy.allowLoopback = true`。内部同主机调用方可以使用 `gateway.auth.password` 作为本地直接回退；`gateway.auth.token` 与 trusted-proxy 模式仍然互斥
- `gateway.auth.allowTailscale`：为 `true` 时，Tailscale Serve 身份标头可以满足 Control UI／WebSocket 认证（通过 `tailscale whois` 验证）。HTTP API 端点不使用该 Tailscale 标头认证；它们仍遵循网关的常规 HTTP 认证模式。此无令牌流程假定网关主机是受信任的。当 `tailscale.mode = "serve"` 时，默认值为 `true`
- `gateway.auth.identityScopes`：将经过验证的 trusted-proxy 用户或 Tailscale WhoIs 登录映射到仅限连接的操作员权限范围。电子邮件键不区分大小写；其他身份则必须完全匹配。对于 trusted-proxy Control UI 连接，`x-openclaw-scopes` 会限制设备注册或升级请求，以及最终的设备加身份会话权限范围。授权不会创建或修改配对记录。令牌、密码和无认证连接没有经过验证的身份，因此不会获得授权
- `gateway.auth.rateLimit`：可选的失败认证限制器。按客户端 IP 和认证范围应用（共享密钥与设备令牌分别跟踪）。被阻止的尝试会返回 `429` + `Retry-After`
  - 在异步 Tailscale Serve Control UI 路径上，同一 `{scope, clientIp}` 的失败尝试会在写入失败前串行化。因此，来自同一客户端的并发错误尝试可能会在第二个请求时触发限制器，而不是两个请求都作为普通不匹配竞争通过
  - `gateway.auth.rateLimit.exemptLoopback` 默认为 `true`；当你有意希望本地主机流量也受到速率限制时设置为 `false`（适用于测试设置或严格代理部署）
- 浏览器源 WS 认证尝试始终会受到限制，并禁用回环豁免（纵深防御浏览器发起的本地主机暴力破解）
- 在回环地址上，这些浏览器源锁定会按规范化的 `Origin` 值隔离，因此一个本地主机源的重复失败不会自动锁定另一个源
- `tailscale.mode`：`serve`（仅 tailnet，回环绑定）或 `funnel`（公开访问，要求认证）
- `tailscale.serviceName`：Serve 模式下可选的 Tailscale Service 名称，例如 `svc:openclaw`。设置后，OpenClaw 会将其传递给 `tailscale serve --service`，这样 Control UI 可以通过命名 Service 暴露，而不是通过设备主机名暴露。该值必须使用 Tailscale 的 `svc:<dns-label>` Service 名称格式；启动时会报告派生出的 Service URL
- `tailscale.preserveFunnel`：当其为 `true` 且 `tailscale.mode = "serve"` 时，OpenClaw 会在启动时重新应用 Serve 前检查 `tailscale funnel status`；如果已经配置的外部 Funnel 路由覆盖了网关端口，则跳过该操作。默认值为 `false`
- `controlUi.allowedOrigins`：网关 WebSocket 连接的显式浏览器源允许列表。公开的非回环浏览器源必须设置此项。来自回环地址、RFC1918／链路本地地址、`.local`、`.ts.net` 或 Tailscale CGNAT 主机的私有同源 LAN／Tailnet UI 加载无需启用 Host 标头回退即可接受
- `controlUi.toolTitles`：选择启用 Control UI 聊天中工具调用的 AI 生成用途标题。默认值：`false`（工具渲染保持完全确定性，不进行后台模型调用）。启用后，`chat.toolTitles` 方法会通过标准实用模型路由为复杂调用添加标签——使用代理的 `utilityModel`（操作员决策，可能会像每个实用任务一样，将有界工具参数发送给所选提供商），或使用会话提供商声明的小模型默认值（OpenAI → `gpt-5.6-luna`，Anthropic → `claude-haiku-4-5`）——并将结果缓存到每个代理的状态数据库中，因此重复查看不会再次计费。`utilityModel: \"\"` 会像其他实用任务一样禁用标题；标题绝不会回退到主模型
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`：危险模式，为有意依赖 Host 标头源策略的部署启用 Host 标头源回退
- `cliAgents.enabled`：选择启用 Control UI 新会话模型选择器中的实验性 **CLI agents** 分组。默认值：`false`。只有当网关公布 `sessions.catalog.list` 时，该分组才会显示，并且只包含支持创建会话的目录提供商。选择某个项目会打开与侧边栏目录操作使用的相同目录目标新会话流程

  目录提供商也可以声明基于终端的会话创建能力。只有在 Labs `cliAgents.enabled` 已启用、网关终端可用且所选提供商公开了该能力时，该方法才可用。调用方需要提供 `cwd`；如有需要，请先使用 `worktrees.create` 创建新的 worktree，因为终端启动不会提供 worktree。

- `terminal.enabled`：管理员范围的操作员终端。默认值：`true`；设置为 `false` 可选择退出。终端会在所选代理工作区中启动主机 PTY，继承网关进程环境；对于 `sandbox.mode: "all"` 的代理会被拒绝。对于不应向管理员操作员提供主机 shell 的部署，请禁用此项；更改后网关会重启，并更新 Control UI 内容安全策略
- `terminal.shell`：可选的 shell 可执行文件。未设置时，OpenClaw 在 Unix 上使用 `$SHELL`，在 Windows 上使用 `%ComSpec%`
- `terminal.detachedSessionTimeoutSeconds`：终端连接断开（页面重新加载、笔记本电脑休眠）后终端会话继续存在的时长；在此期间仍可通过 `terminal.attach` 重新连接，并重放最近的输出。默认值：`300`。设置为 `0` 可在连接断开时立即终止会话。分离的会话会继续运行其命令，因此在共享或暴露的主机上应缩短此值
- `remote.transport`：`ssh`（默认）或 `direct`（ws/wss）。对于 `direct`，公共主机必须使用 `wss://`；明文 `ws://` 仅对回环、LAN、链路本地、`.local`、`.ts.net` 和 Tailscale CGNAT 主机接受
- `remote.remotePort`：远程 SSH 主机上的网关端口。默认为 `18789`；当本地隧道端口与远程网关端口不同时使用此项
- `remote.tlsFingerprint`：远程 `wss://` 网关的预期 SHA-256 证书指纹。macOS 应用会将其应用于操作员／控制连接和伴随节点连接。没有显式值时，macOS 仅在正常系统信任验证成功后记录首次使用的固定指纹
- `remote.sshHostKeyPolicy`：macOS SSH 隧道主机密钥策略。默认值 `strict` 要求密钥已受信任。`openssh` 是对受管别名使用有效 OpenSSH 配置的显式选择；使用前请检查匹配的用户级和系统级 SSH 设置。macOS 应用和 `configure-remote` 在更改目标时会将此策略重置为 `strict`，除非再次显式选择加入
- `gateway.remote.token`／`.password` 是远程客户端凭据字段。它们不会单独配置网关认证
- `gateway.push.apns.relay.baseUrl`：外部 APNs 中继的基础 HTTPS URL，用于中继支持的 iOS 构建发布注册信息到网关之后。公共 App Store 构建使用托管的 OpenClaw 中继。自定义中继 URL 必须匹配一条有意分离的 iOS 构建／部署路径，并且该路径的中继 URL 指向该中继
- `gateway.push.apns.relay.timeoutMs`：网关向中继发送请求的超时时间，单位为毫秒。默认为 `10000`
- 中继支持的注册信息会委托给特定的网关身份。配对的 iOS 应用会获取 `gateway.identity.get`，在中继注册中包含该身份，并将注册范围的发送授权转发给网关。其他网关无法复用该存储的注册信息
- `OPENCLAW_APNS_RELAY_BASE_URL`／`OPENCLAW_APNS_RELAY_TIMEOUT_MS`：上述中继配置的临时环境变量覆盖项
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`：仅供开发使用的例外选项，用于回环 HTTP 中继 URL。生产中继 URL 应继续使用 HTTPS
- `OPENCLAW_HANDSHAKE_TIMEOUT_MS`：内置预认证网关 WebSocket 握手超时的可选环境变量覆盖项
- `channels.<provider>.healthMonitor.enabled`：按频道选择退出健康监视器重启，同时保持全局监视器启用
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多账户频道的按账户覆盖项。设置后，其优先级高于频道级覆盖项
- 仅当 `gateway.auth.*` 未设置时，本地网关调用路径才可以使用 `gateway.remote.*` 作为回退
- 如果通过 SecretRef 显式配置了 `gateway.auth.token`／`gateway.auth.password` 且无法解析，解析会采取故障关闭策略（不会通过远程回退进行掩盖）
- `trustedProxies`：终止 TLS 或注入转发客户端标头的反向代理 IP。仅列出由你控制的代理。同主机代理／本地检测设置仍可使用回环条目（例如 Tailscale Serve 或本地反向代理），但这些条目**不会**使回环请求符合 `gateway.auth.mode: "trusted-proxy"` 的条件
- `allowRealIpFallback`：为 `true` 时，如果缺少 `X-Forwarded-For`，网关会接受 `X-Real-IP`。为采取故障关闭行为，默认值为 `false`
- `gateway.nodes.pairing.autoApproveLocal`：静默批准来自受信任本地连接的配对、角色升级和权限范围升级（默认值：`true`）。设置为 `false` 可要求每台设备都经过明确批准；仅元数据的重新连接刷新仍会自动进行
- `gateway.nodes.pairing.autoApproveCidrs`：可选的 CIDR／IP 允许列表，用于在首次节点设备配对且未请求权限范围时自动批准。未设置时禁用。此项不会自动批准操作员／浏览器／Control UI／WebChat 配对，也不会自动批准角色、权限范围、元数据或公钥升级
- `gateway.nodes.pairing.sshVerify`：首次节点设备配对时基于 SSH 验证的自动批准（默认：启用）。网关会通过 SSH 返回配对主机（BatchMode、严格主机密钥），并仅在 `openclaw node identity` 设备密钥完全匹配时批准。资格条件与 `autoApproveCidrs` 相同；除非通过 `cidrs` 覆盖，否则探测仅限于私有／CGNAT 源地址。设置为 `false` 可禁用，或使用 `{ user, identity, timeoutMs, cidrs }` 进行调整。参见[节点配对](/gateway/pairing#ssh-verified-device-auto-approval-default)
- `gateway.nodes.commands.allow`／`gateway.nodes.commands.deny`：在配对和平台允许列表评估之后，对已声明节点命令进行全局允许／拒绝控制。`commands.allow` 是对 `camera.snap`、`camera.clip`、`desktop.stream`、`screen.record`、`health.summary`、`sms.search` 和 `sms.send` 等分类命令的一次性持久启用；即使平台默认设置或显式允许列表原本会包含某个命令，`commands.deny` 也会将其移除。计算机和移动端 UI 控制则依赖默认关闭的节点本地启用以及配对。iOS Health 权限、Android SMS 权限和网关命令授权彼此独立。节点更改其已声明命令列表后，请拒绝并重新批准该设备配对，以便网关存储更新后的命令快照
- `gateway.tools.deny`：对 HTTP `POST /tools/invoke` 禁止的额外工具名称（扩展默认拒绝列表）
- `gateway.tools.allow`：从默认 HTTP 拒绝列表中移除工具名称，适用于 owner/admin 调用者。此项不会将带有身份的 `operator.write` 调用者升级为 owner/admin 权限；即使列入允许列表，`cron`、`gateway` 和 `nodes` 对非 owner 调用者仍不可用

</Accordion>

### OpenAI 兼容端点

- 管理员 HTTP RPC：默认作为 `admin-http-rpc` 插件关闭。启用该插件以注册 `POST /api/v1/admin/rpc`。参见 [管理员 HTTP RPC](/plugins/admin-http-rpc)。
- Chat Completions：默认禁用。使用 `gateway.http.endpoints.chatCompletions.enabled: true` 启用。
- Responses API：`gateway.http.endpoints.responses.enabled`。
- Responses URL 输入加固：
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
    空允许列表会被视为未设置；使用 `gateway.http.endpoints.responses.files.allowUrl=false`
    和/或 `gateway.http.endpoints.responses.images.allowUrl=false` 来禁用 URL 抓取。
- 可选的响应加固头：
  - `gateway.http.securityHeaders.strictTransportSecurity`（仅对你控制的 HTTPS origin 设置；见 [可信代理认证](/gateway/trusted-proxy-auth#tls-termination-and-hsts)）。

### 多实例隔离

在一台主机上使用唯一端口和状态目录运行多个网关：

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json \
OPENCLAW_STATE_DIR=~/.openclaw-a \
openclaw gateway --port 19001
```

便捷标志：`--dev`（使用 `~/.openclaw-dev` + 端口 `19001`）、`--profile <name>`（使用 `~/.openclaw-<name>`）。

参见 [多个网关](/gateway/multiple-gateways)。

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
- `autoGenerate`：未配置显式文件时，自动生成本地自签名证书/密钥对；仅供本地/开发环境使用。生成的文件会在不覆盖现有路径的情况下发布，并且在文件系统支持时同步其父目录；不支持目录刷新时会发出结构化的持久性降级警告。
- `certPath`：TLS 证书文件的文件系统路径。
- `keyPath`：TLS 私钥文件的文件系统路径；请限制其访问权限。
- `caPath`：可选的 CA 证书包路径，用于客户端验证或自定义信任链。

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

## 云工作器环境

云工作器需选择启用。如果缺少 `cloudWorkers`，或 `profiles` 为空，OpenClaw 将不接受新的工作器创建，也不会公布 `sessions.dispatch` 或 Cloud 目标。配置架构以及只读的 `environments.list` 和 `environments.status` 方法仍然可用。此前创建的持久化记录仍会进行协调并保持可见；现有的网关／节点投影保持不变。

每个工作器提供商都必须从受信任的配置输出中返回 SSH `hostKey`，其格式必须严格为 `algorithm base64`，不得包含主机名或注释。引导程序会将该密钥写入隔离的 `known_hosts` 文件，使用 `StrictHostKeyChecking=yes`，并在提供商未提供该密钥时于建立连接前失败。不提供首次使用时信任（trust-on-first-use）回退机制。

隧道设置按需进行，而不是配置过程的一部分。启动后，gateway 会将工作器本地的 Unix 套接字反向转发到其回环 WebSocket 端点。该套接字位于随机分配且仅所有者可访问的远程目录中；与回环 TCP 端口不同，它无法被多用户工作器上的其他账户访问，也不会与其他环境的端口发生冲突。SSH keepalive 和受上限限制的重连退避仅在隧道所有者仍为当前所有者时运行。停止隧道会先阻止重连，再关闭 SSH 进程。

控制流量和工作区传输使用独立的 SSH 连接。两者会复用同一解析后的身份和隔离的固定 `known_hosts` 文件，但工作区传输不会与长时间运行的隧道共享 SSH 连接多路复用，因此 rsync 不会阻塞控制流量。

### Crabbox 配置

内置的 `crabbox` 提供商通过本地 Crabbox CLI 配置一个支持 SSH 的租约。内部的 `settings.provider` 用于选择 Crabbox 后端；它与外层的 OpenClaw 提供商 id 相互独立。

```json5
{
  cloudWorkers: {
    profiles: {
      production: {
        provider: "crabbox",
        install: "bundle", // 默认值；仅对已发布的 gateway 版本使用 "npm"。
        settings: {
          provider: "aws",
          class: "standard",
          ttl: "24h",
          idleTimeout: "60m",
          // 可选的绝对路径。默认为同级 ../crabbox/bin/crabbox，然后查找 PATH。
          binary: "/usr/local/bin/crabbox",
        },
      },
    },
  },
}
```

- `settings.provider`（必需）：通过 `--provider` 传入的 Crabbox 后端。请使用其 inspect 输出包含 SSH 端点的后端；`aws` 会选择直接 AWS 后端。
- `settings.class`（必需）：通过 `--class` 传入的 Crabbox 机器类别。
- `settings.ttl` 和 `settings.idleTimeout`（必需）：作为提供商侧故障保护措施，通过 `--ttl` 和 `--idle-timeout` 传入的正数 Go duration 字符串。
- `settings.binary`：可选的 Crabbox 可执行文件绝对路径。如果未设置，OpenClaw 会依次检查同级的 Crabbox checkout、`PATH` 中的可执行文件，最后调用 `crabbox`，因此缺少 CLI 时仍会显示为可见的提供商错误。

不允许使用未知设置。Crabbox 凭据和特定后端的账户配置仍由 Crabbox 管理；不要将它们放入 `settings`。OpenClaw 仅调用本地 CLI，此插件不会发起任何提供商网络请求。置备时通过 `--lease-id` 传入一个确定性的规范租约 ID，仅将 `--slug` 保留为显示元数据，并始终传入 `--keep=true`；外部生命周期由 OpenClaw 管理，并通过 `crabbox stop --id <canonical-id>` 销毁租约。在结果不明确后，Gateway reconciliation 会使用同一个固定 ID 重复执行操作。Crabbox 必须返回经过准确认证的租约，否则将安全失败；OpenClaw 绝不会回退到按 slug 采用租约或分配替代租约。

对于由协调器支持的 AWS，Crabbox 自身的 `aws.sshCIDRs` 应包含 Gateway 主机的出站 IPv4，并指定为 `/32`。在置备前，使用 `crabbox config show --json` 和 `crabbox doctor --provider aws --json` 进行验证；不要将此提供商入口设置放入 OpenClaw 的 `settings` 中。参见[由协调器支持的 Crabbox](/gateway/cloud-workers#coordinator-backed-crabbox)。

Crabbox inspect 除主要的 `sshPort` 外，还可能公开按顺序排列的 `sshFallbackPorts`。OpenClaw 会在 Gateway 重启期间持久化所公布的顺序。共享的固定 SSH 传输仅会针对可安全重放的操作轮换候选端口：幂等探测、内容寻址传输、受回执／锁保护的工件安装、收敛式托管工作树镜像以及隧道重连。存在歧义且未受保护的有状态命令会在当前候选端口上安全失败，不会在其他端口上重放。网络策略必须至少允许一个公布的候选端口。

<Note>
  OpenClaw 通过提供商拥有的机密解析器解析 Crabbox 租约本地的 `sshKey` 路径，并固定由 `crabbox inspect --json` 返回的权威 `sshHostKey`。AWS 准入还要求 `providerMetadata.instanceProfileAttached`。请安装 Crabbox 0.41.1 或更高版本，以获得固定 ID 重放和封闭式 inspect 契约。
</Note>

### 静态 SSH 开发配置

```json5
{
  cloudWorkers: {
    profiles: {
      development: {
        provider: "static-ssh",
        settings: {
          host: "worker.example.test",
          port: 22,
          user: "openclaw",
          hostKey: "ssh-ed25519 <base64-public-host-key>",
          keyRef: {
            source: "env",
            provider: "default",
            id: "OPENCLAW_WORKER_SSH_KEY",
          },
        },
      },
    },
  },
}
```

- `profiles`：具有非空、去除首尾空白的 id 的命名工作器配置。每个配置选择一个由插件注册的提供商。
- `provider`：非空的工作器提供商 id。示例使用内置的 `crabbox` 提供商和 QA Lab 的 `static-ssh` 提供商。
- `install`：工作器安装方式。`"bundle"`（默认）会传输包含 Gateway 已安装构建版本的内容哈希 bundle，并支持已发布、开发中及未发布的版本。`"npm"` 是针对未修改的打包发行版的可选优化；它会从公共 npm registry 安装 `openclaw@<exact gateway version>`，绝不会安装 `latest`。
- 配置时会自动选择捆绑的提供商插件，但显式禁用和 `plugins.allow` 仍然适用。配置允许列表时，请包含提供商 id（例如 `crabbox`）。外部提供商插件还必须安装并显式启用。
- `settings`：由提供商管理的有界 JSON。所选插件定义并验证其中的键；对于包含机密的值，请使用 [SecretRef 对象](/gateway/secrets)。静态 SSH 提供商要求 `host`、`user`、`hostKey` 和 `keyRef`；`port` 默认为 `22`。`hostKey` 必须是从已知主机或其他受信任渠道获取的一行 OpenSSH 公共主机密钥（`algorithm base64`），且不得带有选项前缀。

工作器上必须已经安装受支持的 Node 运行时（22.22.3+、24.15+ 或 25.9+）以及支持 WAL 重置安全的 SQLite。选择启用的 `"npm"` 方法还要求安装 `npm`，并能通过出站 HTTPS 访问公共 npm registry。联网工具链的设置由提供商策略决定；引导程序会报告可执行的错误，而不会自行安装工具链。

Gateway 会安装并验证所选的 OpenClaw 构建版本，启动自包含的工作器循环，通过 Gateway 代理模型推理，并通过持久化的放置生命周期协调会话工作区和会话记录。

每条持久化环境记录都会在创建时的配置快照中保留经过验证的提供商设置和解析后的安装方式。更改或移除命名配置会影响新的创建操作；只要所属插件仍然可用，现有记录会继续使用该快照进行生命周期协调。

配置文件更改需要重启 Gateway。使用默认的 `gateway.reload.mode: "hybrid"` 时，配置监视器会自动执行重启；`"off"` 模式则需要手动重启。

<Warning>
  `static-ssh` 提供商是源代码树中的 QA Lab 开发工具，不包含在打包发行版中。运行在其共享主机上的工作器可以读取主机上的无关数据，因此不要将此提供商用作生产环境隔离边界。
  其操作员必须提供预期的 `hostKey`；OpenClaw 不会从首次连接中学习或接受密钥。
  销毁其租约只会释放 OpenClaw 的逻辑记录；不会停止或清理主机。
</Warning>

---

## 钩子

```json5
{
  hooks: {
    enabled: true,
    token: "shared-secret",
    path: "/hooks",
    defaultSessionKey: "hook:ingress",
    allowRequestSessionKey: true,
    allowedSessionKeyPrefixes: ["hook:", "hook:gmail:"],
    allowedAgentIds: ["hooks", "main"],
    presets: ["gmail"],
    transformsDir: "~/.openclaw/hooks/transforms",
    mappings: [
      {
        match: { path: "gmail" },
        action: "agent",
        // 在 agents.entries 下为此代理配置受限的工具
        // 配置文件和沙箱，然后再将不受信任的内容路由给它。
        agentId: "hooks",
        wakeMode: "now",
        name: "Gmail",
        sessionKey: "hook:gmail:{{messages[0].id}}",
        sessionMode: "persistent",
        messageTemplate: "From: {{messages[0].from}}\nSubject: {{messages[0].subject}}\n{{messages[0].snippet}}",
        deliver: true,
        channel: "last",
        model: "openai/gpt-5.6-sol",
      },
    ],
  },
}
```

认证：`Authorization: Bearer <token>` 或 `x-openclaw-token: <token>`。  
不接受查询字符串中的 hook token。

验证和安全说明：

- `hooks.enabled=true` 需要一个非空的 `hooks.token`。
- `hooks.token` 应与活动的 Gateway 共享密钥认证（`gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`）不同；当检测到复用时，启动日志会输出非致命的安全警告。
- `openclaw security audit` 会将 hook/Gateway 认证复用标记为严重问题，包括仅在审计时提供的 Gateway 密码认证（`--auth password --password <password>`）。运行 `openclaw doctor --fix` 可轮换持久化的复用 `hooks.token`，然后更新外部 hook 发送方以使用新的 hook token。
- `hooks.path` 不能是 `/`；请使用专用子路径，例如 `/hooks`。
- 如果 `hooks.allowRequestSessionKey=true`，请限制 `hooks.allowedSessionKeyPrefixes`（例如 `["hook:"]`）。
- 如果某个 mapping 或 preset 使用了模板化的 `sessionKey`，请设置 `hooks.allowedSessionKeyPrefixes` 和 `hooks.allowRequestSessionKey=true`。静态 mapping key 不需要该显式开启。

**端点：**

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, agentId?, sessionKey?, sessionMode?, wakeMode?, deliver?, channel?, to?, accountId?, model?, thinking?, timeoutSeconds? }`
  - 请求负载中的 `sessionKey` 仅在 `hooks.allowRequestSessionKey=true` 时接受（默认值：`false`）。
  - `sessionMode` 默认为 `"isolated"`。`"persistent"` 会复用已解析的会话，并要求请求中显式提供 `sessionKey`、`hooks.allowRequestSessionKey=true`，以及非空的 `hooks.allowedSessionKeyPrefixes`。
  - 直接公告投递同时要求提供具体的 `channel` 和 `to`；只提供其中一个会在运行调度前失败。
  - `accountId` 会选择一个已配置且启用的账户进行直接公告投递，并要求同时提供 `channel` 和 `to`；无效选择会在运行开始前返回 `400`。
  - 对于仅完成通知的 hook，可省略两个投递字段；也可以设置 `deliver: false` 以忽略提供的目标数据。
  - 请求最多等待 15 秒以进入运行器，而不会等待运行完成。`200` 表示代理运行器已进入。
  - 运行前失败会返回 `{ ok: false, error, runId }`：无效的投递坐标或账户选择返回 `400`，会话接入冲突返回 `409`，其他准备失败返回 `502`，15 秒接入期限到期返回 `503`。超时的排队任务会被取消，之后不会启动。
- `POST /hooks/<name>` → 通过 `hooks.mappings` 解析
  - 模板渲染的 mapping `sessionKey` 值会被视为外部提供的值，同样要求 `hooks.allowRequestSessionKey=true`。
  - 映射的 `agent` 操作使用相同的接入等待机制，并返回 `200`／`400`／`409`／`502`／`503` 结果。

<Accordion title="Mapping 详情">

- `match.path` 匹配 `/hooks` 之后的子路径（例如 `/hooks/gmail` → `gmail`）。
- `match.source` 匹配通用路径的负载字段。
- `{{messages[0].subject}}` 这样的模板会从负载中读取数据。
- `transform` 可以指向一个返回 hook 操作的 JS/TS 模块。
  - `transform.module` 必须是相对路径，并且必须位于 `hooks.transformsDir` 内（绝对路径和路径遍历都会被拒绝）。
  - 将 `hooks.transformsDir` 保持在 `~/.openclaw/hooks/transforms` 下；工作区技能目录会被拒绝。如果 `openclaw doctor` 报告此路径无效，请将转换模块移入 hook 转换目录，或移除 `hooks.transformsDir`。
- `agentId` 将请求路由到指定代理；未知 ID 会回退到默认代理。
- `allowedAgentIds`：限制实际的代理路由，包括省略 `agentId` 时的默认代理路径（`*` 或省略 = 允许全部，`[]` = 全部拒绝）。
- `defaultSessionKey`：可选的固定会话密钥，用于未显式指定 `sessionKey` 的 hook 代理运行。
- `allowRequestSessionKey`：允许 `/hooks/agent` 调用方和模板驱动的 mapping 会话密钥设置 `sessionKey`（默认值：`false`）。
- `allowedSessionKeyPrefixes`：可选的显式 `sessionKey` 值前缀允许列表（请求 + mapping），例如 `["hook:"]`。当任何 mapping 或 preset 使用模板化的 `sessionKey` 时，此项变为必需。
- `sessionMode`：mapping 的会话行为（默认为 `"isolated"` 或 `"persistent"`）。持久化 mapping 必须通过 `sessionKey` 或 `hooks.defaultSessionKey` 解析出稳定的密钥；模板派生的密钥仍需进行请求密钥和前缀检查。
- `deliver: true` 会将最终回复发送到某个频道；映射的 hook 可以使用 `channel: "last"`。
- `deliver: false` 会使映射的运行仅报告完成状态。
- `model` 会覆盖此次 hook 运行所使用的 LLM（如果设置了模型目录，则该模型必须在允许范围内）。

</Accordion>

### Gmail 集成

- 内置 Gmail preset 使用 `sessionKey: "hook:gmail:{{messages[0].id}}"`。
- 此按消息分配的密钥会隔离会话上下文，但不会隔离工具或工作区访问权限。没有设置 `agentId` 的自定义 mapping 时，preset 会使用默认代理。
- 对于不受信任的收件箱，请将 Gmail 路由到专用的读取代理，并根据[每个代理的沙箱和工具策略](/tools/multi-agent-sandbox-tools)限制该代理。如果读取代理必须通知主代理，请使用 [`tools.agentToAgent`](/gateway/config-tools#toolsagenttoagent)限制交接。有关推荐的威胁模型和模型层级，请参阅[提示注入](/gateway/security#prompt-injection)。
- 设置向导会配置 Gmail 传输，但不会创建读取代理或所需的会话密钥策略。对于不受信任的邮件，请在运行设置前应用完整的[受限 Gmail 读取代理配置](/automation/cron-jobs#configure-a-restricted-gmail-reader-recommended)。
- 如果保留按消息路由，请设置 `hooks.allowRequestSessionKey: true`，并将 `hooks.allowedSessionKeyPrefixes` 限制为匹配 Gmail 命名空间的前缀，例如 `["hook:", "hook:gmail:"]`。
- 如果需要 `hooks.allowRequestSessionKey: false`，请使用静态 `sessionKey` 覆盖 preset，而不是使用模板化的默认值。

```json5
{
  hooks: {
    gmail: {
      account: "openclaw@gmail.com",
      topic: "projects/<project-id>/topics/gog-gmail-watch",
      subscription: "gog-gmail-watch-push",
      pushToken: "shared-push-token",
      hookUrl: "http://127.0.0.1:18789/hooks/gmail",
      includeBody: true,
      maxBytes: 20000,
      renewEveryMinutes: 720,
      serve: { bind: "127.0.0.1", port: 8788, path: "/" },
      tailscale: { mode: "funnel", path: "/gmail-pubsub" },
      model: "openai/gpt-5.6-sol",
      thinking: "high",
    },
  },
}
```

- 配置完成后，Gateway 会在启动时自动启动 `gog gmail watch serve`。设置 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 可禁用。
- 不要在 Gateway 旁边再单独运行一个 `gog gmail watch serve`。

---

## Canvas 插件宿主

```json5
{
  plugins: {
    entries: {
      canvas: {
        config: {
          host: {
            root: "~/.openclaw/workspace/canvas",
            liveReload: true,
            // enabled: false, // 或 OPENCLAW_SKIP_CANVAS_HOST=1
          },
        },
      },
    },
  },
}
```

- 通过网关端口经 HTTP 提供智能体可编辑的 HTML/CSS/JS 和 A2UI：
  - `http://<gateway-host>:<gateway.port>/__openclaw__/canvas/`
  - `http://<gateway-host>:<gateway.port>/__openclaw__/a2ui/`
- 仅本地可访问：保持 `gateway.bind: "loopback"`（默认）。
- 非 loopback 绑定：canvas 路由需要网关认证（token/password/trusted-proxy），与其他网关 HTTP 接口相同。
- Node WebView 通常不会发送认证头；当节点完成配对并连接后，网关会为 canvas/A2UI 访问公开按节点范围限定的能力 URL。
- 能力 URL 绑定到当前激活的节点 WS 会话，并会快速过期。不使用基于 IP 的回退。
- 在提供的 HTML 中注入实时重载客户端。
- 在目录为空时自动创建入门版 `index.html`。
- 也会在 `/__openclaw__/a2ui/` 提供 A2UI。
- 更改需要重启网关。
- 对于大型目录或 `EMFILE` 错误，请禁用实时重载。

## 发现

### mDNS（Bonjour）

```json5
{
  discovery: {
    mdns: {
      mode: "minimal", // 最小 | 完整 | 关闭
    },
  },
}
```

- `minimal`（默认）：从 TXT 记录中省略 `cliPath` + `sshPort`。
- `full`：包含 `cliPath` + `sshPort`；局域网组播广播仍需要启用捆绑的 `bonjour` 插件。
- `off`：禁止局域网组播广播，但不改变插件启用状态。
- 捆绑的 `bonjour` 插件会在 macOS 主机上自动启动，在 Linux、Windows 和容器化 Gateway 部署中则需要选择启用。
- 当系统主机名是有效的 DNS 标签时，默认使用该主机名，否则回退为 `openclaw`。可通过 `OPENCLAW_MDNS_HOSTNAME` 覆盖。
- `OPENCLAW_DISABLE_BONJOUR=1` 将直接禁用 mDNS 广播，并覆盖 `discovery.mdns.mode`。

### 广域（DNS-SD）

```json5
{
  discovery: {
    wideArea: { domain: "openclaw.internal" },
  },
}
```

设置 `discovery.wideArea.domain` 可启用广域发现，并在 `~/.openclaw/dns/` 下写入单播 DNS-SD 区域。要进行跨网络发现，请搭配 DNS 服务器（推荐使用 CoreDNS）和 Tailscale split DNS。

设置：`openclaw dns setup --apply`。

---

## 环境

### `env`（内联环境变量）

```json5
{
  env: {
    vars: {
      OPENROUTER_API_KEY: "sk-or-...",
      GROQ_API_KEY: "gsk-...",
    },
    shellEnv: {
      enabled: true,
      timeoutMs: 15000,
    },
  },
}
```

- 只有当进程环境中缺少该键时，才会应用内联环境变量。
- `.env` 文件：CWD `.env` + `~/.openclaw/.env`（都不会覆盖已有变量）。
- `shellEnv`：从你的登录 shell 配置文件中导入缺失的预期键。
- 完整优先级请参见 [环境](/help/environment)。

### 环境变量替换

使用 `${VAR_NAME}` 在任意配置字符串中引用环境变量：

```json5
{
  gateway: {
    auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" },
  },
}
```

- 仅匹配大写名称：`[A-Z_][A-Z0-9_]*`。
- 缺失/空值变量会在配置加载时抛出错误。
- 使用 `$${VAR}` 转义为字面量 `${VAR}`。
- 可与 `$include` 一起使用。

---

## 密钥

密钥引用是增量式的：明文值仍然可用。

### `SecretRef`

使用一种对象形状：

```json5
{ source: "env" | "file" | "exec" | "store", provider: "default", id: "..." }
```

验证：

- `provider` 模式：`^[a-z][a-z0-9_-]{0,63}$`
- `source: "env"` id 模式：`^[A-Z][A-Z0-9_]{0,127}$`
- `source: "file"` id：绝对 JSON Pointer（例如 `"/providers/openai/apiKey"`）
- `source: "exec"` id 模式：`^[A-Za-z0-9][A-Za-z0-9._:/#-]{0,255}$`（支持 AWS 风格的 `secret#json_key` 选择器）
- `source: "exec"` 的 id 不能包含 `.` 或 `..` 这样的斜杠分隔路径段（例如 `a/../b` 会被拒绝）

### 支持的凭据范围

- 规范矩阵：[SecretRef 凭据范围](/reference/secretref-credential-surface)
- `secrets apply` 目标是受支持的 `openclaw.json` 凭据路径。
- `auth-profiles.json` 引用会包含在运行时解析和审计覆盖范围内。

### 密钥提供方配置

```json5
{
  secrets: {
    providers: {
      default: { source: "env" }, // 可选的显式 env 提供方
      filemain: {
        source: "file",
        path: "~/.openclaw/secrets.json",
        mode: "json",
        timeoutMs: 5000,
      },
      vault: {
        source: "exec",
        command: "/usr/local/bin/openclaw-vault-resolver",
        passEnv: ["PATH", "VAULT_ADDR"],
      },
    },
    defaults: {
      env: "default",
      file: "filemain",
      exec: "vault",
    },
  },
}
```

说明：

- `file` 提供方支持 `mode: "json"` 和 `mode: "singleValue"`（在 singleValue 模式下，`id` 必须为 `"value"`）。
- Windows ACL 验证不可用时，文件和 exec 提供方路径会默认拒绝。请使用 OpenClaw 可以验证其 ACL 的路径；提供方级别不支持绕过此限制。
- `exec` 提供方要求使用绝对 `command` 路径，并通过标准输入/标准输出使用协议载荷。
- 符号链接命令路径会被拒绝。请改为配置解析后的绝对二进制文件路径。
- 如果配置了 `trustedDirs`，命令路径必须位于已批准的目录内。
- `exec` 子进程环境默认最小化；请使用 `passEnv` 显式传递所需变量。
- 密钥引用会在激活时解析为内存中的快照，之后请求路径仅读取该快照。
- 激活期间会应用活动范围过滤：启用范围内无法解析的引用会导致启动/重新加载失败，而非活动范围会跳过并记录诊断信息。

---

## 认证存储

```json5
{
  auth: {
    profiles: {
      "anthropic:default": { provider: "anthropic", mode: "api_key" },
      "anthropic:work": { provider: "anthropic", mode: "api_key" },
      "openai:personal": { provider: "openai", mode: "oauth" },
    },
    order: {
      anthropic: ["anthropic:default", "anthropic:work"],
      openai: ["openai:personal"],
    },
  },
}
```

- 每个 agent 的配置文件存储在 `<agentDir>/auth-profiles.json`。
- `auth-profiles.json` 支持值级引用（`api_key` 使用 `keyRef`，`token` 使用 `tokenRef`），适用于静态凭据模式。
- 旧式扁平 `auth-profiles.json` 映射，例如 `{ "provider": { "apiKey": "..." } }`，不是运行时格式；`openclaw doctor --fix` 会将其重写为规范的 `provider:default` API-key 配置文件，并创建 `.legacy-flat.*.bak` 备份。
- OAuth 模式配置文件（`auth.profiles.<id>.mode = "oauth"`）不支持基于 SecretRef 的 auth-profile 凭据。
- 静态运行时凭据来自内存中解析后的快照；发现旧式静态 `auth.json` 条目时会被清理。
- 旧式 OAuth 导入来自 `~/.openclaw/credentials/oauth.json`。
- 参见 [OAuth](/concepts/oauth)。
- 密钥运行时行为以及 `audit/configure/apply` 工具： [密钥管理](/gateway/secrets)。

---

## 审计

```json5
{
  logging: {
    audit: {
      enabled: true,
      executionIdentity: false,
      messages: "off", // 关闭 | 直接 | 全部
    },
  },
}
```

Gateway 会将代理运行和工具操作的**仅元数据**审计事件记录到共享状态数据库中。消息生命周期元数据是单独的可选功能。该账本存储身份、时间信息、工具名称和规范化结果，但绝不会存储提示词、消息正文、工具参数、结果或原始错误文本。消息行不会存储原始平台账户、会话、消息和目标 ID。运行/工具会话密钥仍可用于关联，并且其本身可能包含平台账户或对端 ID。记录会在 30 天后过期，账本最多保存 100,000 行。使用 [`openclaw audit`](/cli/audit) 或 [`audit.activity.list`](/gateway/protocol#audit-ledger-rpc) Gateway RPC 查询这些记录。有关完整的数据模型、隐私语义和覆盖范围限制，请参阅[审计历史](/gateway/audit)。

- `enabled`：记录新的审计事件（默认值：`true`）。账本默认启用，因为只有在事件发生后才启用的审计跟踪无法解释该事件。设置为 `false` 后，Gateway 重启时将停止插入新事件；现有记录会继续可读，直到过期。重新启用后会从该时间点恢复记录——空缺部分不会补录。
- `executionIdentity`：保留受限的归因上下文，以便进行精确的执行检查（默认值：`false`）。此隐私敏感元数据在全新安装和升级时均处于禁用状态。收集该元数据需要 `enabled: true`；使用 `openclaw config set logging.audit.executionIdentity true`，然后重启 Gateway。没有对应的环境变量别名。
- `messages`：消息元数据范围（默认值：`"off"`）。`"direct"` 仅记录已知的直接对话。`"all"` 还会记录群组、频道和未知的对话类型。两种模式都不会包含内容，并会在可以进行关联的情况下使用安装本地的密钥伪名替换原始标识符。这些是关联辅助信息，而非匿名化措施；状态数据库会存储派生密钥，但 RPC 和 CLI 导出不会包含该密钥。

根级别的 `audit` 块已弃用；规范路径是 `logging.audit`。根配置对象是严格的，因此旧的顶级 `audit` 块会被拒绝。运行 [`openclaw doctor --fix`](/cli/doctor) 将其移动到 `logging.audit`。

运行中的 Gateway 会在启动时读取 `logging.audit.enabled`、`logging.audit.executionIdentity` 和 `logging.audit.messages`；更改其中任何设置后都需要重启 Gateway。当前的消息覆盖范围包括到达核心分发的已接受入站消息，以及到达共享持久化传递层的每个原始逻辑出站回复负载对应的一条终端记录。绕过这些共享边界的插件本地路径和直接发送路径目前尚未覆盖。受限的后台写入器采用尽力而为策略，并非无损的合规归档。

---

## 日志记录

```json5
{
  logging: {
    level: "info",
    file: "/tmp/openclaw/openclaw.log",
    consoleLevel: "info",
    consoleStyle: "pretty", // 美化 | json
    redactPatterns: ["\\bTOKEN\\b\\s*[=:]\\s*([\"']?)([^\\s\"']+)\\1"],
  },
}
```

- 默认日志文件：`/tmp/openclaw/openclaw-YYYY-MM-DD.log`；命名配置文件使用 `/tmp/openclaw/openclaw-<profile>-YYYY-MM-DD.log`。
- 设置 `logging.file` 以使用稳定路径。
- 使用 `--verbose` 时，`consoleLevel` 会提升为 `debug`。
- `consoleStyle`：`"pretty"` 或 `"json"`。之前的 `"compact"` 值已弃用；[`openclaw doctor --fix`](/cli/doctor) 会将其映射为 `"pretty"`。
- `maxFileBytes`：轮换前活动日志文件的最大字节数（正整数；默认值：`104857600` = 100 MB）。OpenClaw 会在活动文件旁最多保留五个带编号的归档文件。
- `redactPatterns`：用于尽力遮盖控制台输出、文件日志、OTLP 日志记录以及持久化会话记录文本的正则表达式。设置此项会**替换**日志和会话记录输出的内置默认模式，因此请包含你仍希望使用的默认模式；省略它们还会关闭表单正文和结构化身份验证标头的遮盖。工具负载遮盖是独立的，并且始终会将你的模式与默认模式合并。
- 遮盖始终启用，且不再可配置。[`openclaw doctor --fix`](/cli/doctor) 会从旧版配置文件中移除已弃用的开关；运行时始终对日志和会话记录应用 `tools` 模式的遮盖。UI、工具和诊断安全界面会独立于此策略遮盖机密信息。

---

## 诊断

```json5
{
  diagnostics: {
    enabled: true,
    flags: ["telegram.*"],

    otel: {
      enabled: false,
      endpoint: "https://otel-collector.example.com:4318",
      tracesEndpoint: "https://traces.example.com/v1/traces",
      metricsEndpoint: "https://metrics.example.com/v1/metrics",
      logsEndpoint: "https://logs.example.com/v1/logs",
      protocol: "http/protobuf",
      headers: { "x-tenant-id": "my-org" },
      serviceName: "openclaw-gateway",
      traces: true,
      metrics: true,
      logs: false,
      logsExporter: "otlp",
      sampleRate: 1.0,
      flushIntervalMs: 5000,
      captureContent: false,
    },

    cacheTrace: {
      enabled: false,
    },
  },
}
```

- `enabled`：检测输出的主开关（默认值：`true`）。
- `flags`：启用定向日志输出的标志字符串数组（支持 `"telegram.*"` 或 `"*"` 等通配符）。
- `otel.enabled`：启用 OpenTelemetry 导出管道（默认值：`false`）。完整配置、信号目录和隐私模型请参阅 [OpenTelemetry 导出](/gateway/opentelemetry)。
- `otel.endpoint`：OTel 导出的收集器 URL。
- `otel.tracesEndpoint` / `otel.metricsEndpoint` / `otel.logsEndpoint`：可选的按信号区分的 OTLP 端点。设置后，仅对相应信号覆盖 `otel.endpoint`。
- `otel.protocol`：`"http/protobuf"`（默认值）。gRPC 导出已停用；运行 [`openclaw doctor --fix`](/cli/doctor) 可修复已持久化的旧值，或获取特定来源的手动编辑指导。
- `otel.headers`：随 OTel 导出请求发送的额外 HTTP 请求标头。
- `otel.serviceName`：资源属性中的服务名称。
- `otel.traces` / `otel.metrics` / `otel.logs`：启用追踪、指标或日志导出。
- `otel.logsExporter`：日志导出目标：`"otlp"`（默认值）、`"stdout"`（每行标准输出一个 JSON 对象）或 `"both"`。
- `otel.sampleRate`：`0`-`1` 之间的追踪采样率。
- `otel.flushIntervalMs`：遥测数据定期刷新的间隔（单位：毫秒）。
- `otel.captureContent`：选择性启用 OTEL span 属性中的内容捕获。默认关闭。`true` 会捕获非系统可见的消息、工具和工具定义内容，以及 OTLP 日志正文；供应商内部的思考负载仍会被排除。
- `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`：启用最新实验性 GenAI 推理 span 形态的环境开关，包括使用 `{gen_ai.operation.name} {gen_ai.request.model}` 作为 span 名称、使用 `CLIENT` span 类型，以及使用 `gen_ai.provider.name` 替代旧版 `gen_ai.system`。默认情况下，为保持兼容性，span 仍使用 `openclaw.model.call` 和 `gen_ai.system`；GenAI 指标使用有界语义属性。
- `OPENCLAW_OTEL_PRELOADED=1`：适用于已注册全局 OpenTelemetry SDK 的主机的环境开关。启用后，OpenClaw 会跳过由插件负责的 SDK 启动和关闭，同时保持诊断监听器处于活动状态。
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`、`OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` 和 `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`：当对应配置项未设置时使用的按信号区分的端点环境变量。
- `OTEL_EXPORTER_OTLP_TRACES_PROTOCOL`、`OTEL_EXPORTER_OTLP_METRICS_PROTOCOL` 和 `OTEL_EXPORTER_OTLP_LOGS_PROTOCOL`：当 `otel.protocol` 未设置时使用的按信号区分的协议回退值。每个变量都会针对相应信号覆盖 `OTEL_EXPORTER_OTLP_PROTOCOL`。
- `OTEL_EXPORTER_OTLP_PROTOCOL`：当 `otel.protocol` 和对应的按信号区分的变量均未设置时使用的共享协议回退值。仅支持 `http/protobuf`。协议验证按信号隔离，因此不受支持的解析值会禁用相应信号的 OTLP 导出器，而不会阻止其他受支持的同级信号。Doctor 不会重写环境变量。
- `cacheTrace.enabled`：记录嵌入式运行的缓存追踪快照（默认值：`false`）。

---

## 更新

```json5
{
  update: {
    channel: "stable", // 稳定版 | 扩展稳定版 | 测试版 | 开发版
    checkOnStart: true,

    auto: {
      enabled: false,
    },
  },
}
```

- `channel`：发布渠道——`"stable"`、`"extended-stable"`、`"beta"` 或 `"dev"`。扩展稳定版仅适用于软件包：前台命令负责安装，而网关可以发出只读更新提示。
- `checkOnStart`：网关启动时检查 npm 更新（默认值：`true`）。选择扩展稳定版时，同样使用只读提示和 24 小时提示计划。
- `auto.enabled`：为稳定版和测试版软件包安装，以及开发版 Git 安装启用后台自动更新任务（默认值：`false`）。扩展稳定版永远不会自动应用更新。

---

## ACP

```json5
{
  acp: {
    enabled: true,
    dispatch: { enabled: true },
    backend: "acpx",
    fallbacks: ["acpx-secondary"],
    defaultAgent: "main",
    allowedAgents: ["main", "ops"],
    stream: {
      repeatSuppression: true,
      deliveryMode: "live", // 实时 | 仅最终结果
    },
  },
}
```

- `enabled`：全局 ACP 功能开关（默认值：`true`；设置为 `false` 可隐藏 ACP 调度和生成入口）。
- `dispatch.enabled`：ACP 会话轮次调度的独立开关（默认值：`true`）。设置为 `false` 可保留 ACP 命令，同时阻止执行。
- `backend`：默认 ACP 运行时后端 ID（必须与已注册的 ACP 运行时插件匹配）。
  请先安装后端插件；如果设置了 `plugins.allow`，请将后端插件 ID（例如 `acpx`）加入其中，否则 ACP 后端将不会加载。
- `fallbacks`：备用 ACP 后端 ID 的有序列表。当主后端在产生任何输出之前因看似暂时性的错误（不可用、受到速率限制、配额耗尽或过载）而过早失败时，将按顺序尝试这些后端。每个条目都必须与已注册的 ACP 运行时插件后端匹配。
- `defaultAgent`：生成操作未指定明确目标时使用的备用 ACP 目标代理 ID。
- `allowedAgents`：允许用于 ACP 运行时会话的代理 ID 白名单；为空表示不施加额外限制。
- `stream.repeatSuppression`：抑制每个轮次中重复的状态/工具行（默认值：`true`）。
- `stream.deliveryMode`：`"live"` 逐步流式传输；`"final_only"` 缓冲内容，直到轮次终止事件发生。
- `stream.tagVisibility`：流式事件中各标签名称对应布尔可见性覆盖设置的记录。
- `runtime.installCommand`：可选的安装命令，用于在引导 ACP 运行时环境时执行。

---

## 向导

CLI 引导式设置流程（`onboard`、`configure`、`doctor`）的行为和元数据：

```json5
{
  wizard: {
    accessMode: "full",
    appRecommendations: true,
    lastRunAt: "2026-01-01T00:00:00.000Z",
    lastRunVersion: "2026.1.4",
    lastRunCommit: "abc1234",
    lastRunCommand: "configure",
    lastRunMode: "local",
    securityAcknowledgedAt: "2026-01-01T00:00:00.000Z",
  },
}
```

- `wizard.accessMode`：在引导式入门开始时选择的发现授权。`"full"`（推荐）允许设置流程自动查找 AI 应用、密钥和本地运行时；`"guarded"` 会让设置流程在查找周边信息前先询问一次，并提供手动配置选项。

- `wizard.appRecommendations` 默认为 `true`。将其设置为 `false`，可在引导式或经典入门过程中禁用已安装应用推荐，并阻止 Gateway 访问 `device.apps`。Node 主机仍需启用单独的、默认关闭的已安装应用共享标志，之后才会发布该命令。

## 身份

请参阅[智能体默认设置](/gateway/config-agents#agent-defaults)下 `agents.entries` 的身份字段。

---

## 桥接（旧版，已移除）

当前版本不再包含 TCP 桥接。节点现在通过网关 WebSocket 连接。`bridge.*` 键不再属于配置模式（在移除之前校验会失败；`openclaw doctor --fix` 可清除未知键）。

<Accordion title="旧版桥接配置（历史参考）">

```json
{
  "bridge": {
    "enabled": true,
    "port": 18790,
    "bind": "tailnet",
    "tls": {
      "enabled": true,
      "autoGenerate": true
    }
  }
}
```

</Accordion>

---

## 自动化（`cron`）

```json5
{
  cron: {
    enabled: true,
    triggers: {
      enabled: true,
    },
    webhookToken: "replace-with-dedicated-token", // 可选，用于出站 webhook 身份验证的 bearer 令牌
    webhookSsrfPolicy: {
      allowedHostnames: ["127.0.0.1"], // 可选，用于受信任接收方的精确例外
    },
    sessionRetention: "24h", // 时长字符串（“0h”表示禁用）或 false
  },
}
```

- `enabled`：执行已存储的自动化任务（默认：`true`）。设置为 `false` 可暂停所有自动化执行，而不会删除任务。
- `triggers.enabled`：同时运行事件驱动的自动化触发器（默认：`false`）。
- `sessionRetention`：在清理 SQLite 会话行之前，保留已完成的隔离自动化运行会话的时长。也控制已归档的已删除自动化记录的清理。默认值：`24h`；设置为 `false` 或 `"0h"` 等零时长可禁用（负时长无效）。
- 运行历史记录会自动为每个任务保留最新的 2000 条终止状态记录。丢失的记录仍会保留其 24 小时的清理窗口。
- `webhookToken`：用于自动化 webhook POST 投递（`delivery.mode = "webhook"`）的 bearer 令牌；如果省略，则不会发送身份验证标头。
- `webhookSsrfPolicy`：适用于主要 webhook、完成 webhook、失败目标 webhook 和失败告警 webhook 的共享出站 SSRF 策略。省略时会阻止私有／内部目标。优先使用精确的 `allowedHostnames`；仅对受信任的私有网络接收方使用 `dangerouslyAllowPrivateNetwork: true`。针对特定虚假 IP 范围的代理标志为 `allowRfc2544BenchmarkRange` 和 `allowIpv6UniqueLocalRange`。

`cron` 块是严格的；`cron.enabled`、`cron.triggers`、`cron.webhookToken`、
`cron.webhookSsrfPolicy`、`cron.sessionRetention` 和 `cron.failureAlert` 是唯一接受的键。已弃用的
`cron.webhook` 回退 URL 已移除：运行时投递使用每个任务的
`delivery.mode = "webhook"` 加 `delivery.to`，或者在保留播报投递时使用
`delivery.completionDestination`。`openclaw doctor --fix` 会从现有配置文件中移除遗留的
`cron.webhook`。

### `cron.failureAlert`

```json5
{
  cron: {
    failureAlert: {
      enabled: false,
      after: 2,
      cooldownMs: 3600000,
      includeSkipped: false,
      mode: "announce",
      channel: "last",
      to: "channel:C1234567890",
      accountId: "main",
    },
  },
}
```

`cron.failureAlert` 同时负责每个任务的告警阈值和默认失败
目标。已弃用的 `cron.failureDestination` 块会由
[`openclaw doctor --fix`](/cli/doctor) 合并到其中。

- `enabled`：为自动化任务启用失败告警（默认：`false`）。
- `after`：触发告警前所需的连续失败次数（正整数，最小值：`1`；默认值：`2`）。
- `cooldownMs`：同一任务重复告警之间的最小毫秒数（非负整数；默认值：`3600000`）。
- `includeSkipped`：将连续跳过的运行计入告警阈值（默认：`false`）。跳过的运行会单独跟踪，不会影响执行错误退避。
- `mode`：投递模式——`"announce"` 通过频道消息发送；`"webhook"` 将请求发送到 `to` 中的目标。目标数据足够时，默认为 `"announce"`。
- `channel`：播报投递的频道覆盖值。`"last"` 会复用最后一个已知的投递频道。
- `to`：显式的播报目标或 webhook URL。使用 webhook 模式时必需。
- `accountId`：可选的账户或频道 ID，用于限定告警投递范围。
- 每个任务的 `delivery.failureDestination` 会覆盖这些全局目标字段。
- 当全局和任务级失败目标均未设置时，已经通过 `announce` 投递的任务会在失败时回退到其主要播报目标。
- `delivery.failureDestination` 仅支持 `sessionTarget="isolated"` 的任务，除非该任务的主要 `delivery.mode` 为 `"webhook"`。

参见[自动化](/automation/cron-jobs)。隔离的自动化运行会作为[后台任务](/automation/tasks)进行跟踪。

## 媒体模型模板变量

在 `tools.media.models[].args` 中展开的模板占位符：

| 变量                        | 描述                                             |
| --------------------------- | ------------------------------------------------ |
| `{{Body}}`                  | 完整的入站消息正文                               |
| `{{RawBody}}`               | 原始正文（不包含历史记录/发送者包装器）          |
| `{{BodyStripped}}`          | 去除群组提及后的正文                             |
| `{{From}}`                  | 发送者标识符                                     |
| `{{To}}`                    | 目标标识符                                       |
| `{{MessageSid}}`            | 渠道消息 ID                                      |
| `{{SessionId}}`             | 当前会话 UUID                                    |
| `{{IsNewSession}}`          | 创建新会话时为 `"true"`                          |
| `{{AttachmentUrl}}`         | 当前附件 URL 或提供商引用                        |
| `{{AttachmentPath}}`        | 当前附件的本地路径                               |
| `{{AttachmentContentType}}` | 当前附件的 MIME 内容类型                         |
| `{{AttachmentDir}}`         | 包含 `AttachmentPath` 的目录                     |
| `{{AttachmentIndex}}`       | 从零开始的源事实索引                             |
| `{{Transcript}}`            | 音频转录文本                                     |
| `{{Prompt}}`                | CLI 条目的已解析媒体提示词                      |
| `{{MaxChars}}`              | CLI 条目的已解析最大输出字符数                  |
| `{{ChatType}}`              | `"direct"` 或 `"group"`                          |
| `{{GroupSubject}}`           | 群组主题（尽力获取）                             |
| `{{GroupMembers}}`           | 群组成员预览（尽力获取）                         |
| `{{SenderName}}`             | 发送者显示名称（尽力获取）                       |
| `{{SenderE164}}`             | 发送者电话号码（尽力获取）                       |
| `{{Provider}}`              | 提供商提示（whatsapp、telegram、discord 等）     |

旧版的 `{{MediaPath}}`、`{{MediaUrl}}`、`{{MediaType}}` 和 `{{MediaDir}}`
名称在插件 SDK 兼容期内仍然可用，但已弃用。新配置应使用
`Attachment*` 变量。

## 配置包含（`$include`）

将配置拆分到多个文件中：

```json5
// ~/.openclaw/openclaw.json
{
  gateway: { port: 18789 },
  agents: { $include: "./agents.json5" },
  broadcast: {
    $include: ["./clients/mueller.json5", "./clients/schmidt.json5"],
  },
}
```

**合并行为：**

- 单个文件：替换包含它的对象。
- 文件数组：按顺序进行深度合并（后者覆盖前者）。
- 同级键：在包含内容之后进行合并（覆盖包含的值）。
- 嵌套包含：最多 10 层。
- 路径：相对于包含文件解析，但必须位于顶层配置目录（`openclaw.json` 的 `dirname`）内。只有在解析后仍位于该边界内时，才允许使用绝对路径或 `../` 形式。设置 `OPENCLAW_INCLUDE_ROOTS`（绝对路径）可允许使用配置目录之外的其他根目录。
- 限制：路径在解析前后都不得包含空字节，且长度必须严格小于 4096 个字符；每个被包含的文件上限为 2 MB。
- 仅更改单个顶层部分且该部分由单个文件包含提供支持的 OpenClaw 写入操作，会直接写入该被包含的文件。例如，`plugins install` 会更新 `plugins: { $include: "./plugins.json5" }` 对应的 `plugins.json5`，并保持 `openclaw.json` 不变。
- 根包含、包含数组以及带有同级覆盖项的包含，对于 OpenClaw 写入操作均为只读；这些写入操作会安全失败，而不会将配置扁平化。
- 错误：对于文件缺失、解析错误、循环包含、路径格式无效和长度超限，会提供明确的错误消息。

---

## 相关

- [配置](/gateway/configuration)
- [配置示例](/gateway/configuration-examples)
- [诊断工具](/gateway/doctor)
