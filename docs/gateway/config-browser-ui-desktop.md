---
summary: "浏览器自动化、Control UI 演示以及桌面或配对节点配置"
read_when:
  - "配置浏览器自动化或配置文件"
  - "调整 Control UI 演示"
  - "设置桌面或配对节点桌面"
title: "配置 — 浏览器、UI 和桌面"
---

面向客户的表面：`browser.*`、`ui.*` 和 `desktop.*`。

完整密钥索引和其他顶级配置域，请参见[配置参考](/gateway/configuration-reference)。

## <a id="browser"></a> 桌面

```json5
{
  browser: {
    enabled: true,
    evaluateEnabled: true,
    defaultProfile: "user",
    ssrfPolicy: {
      // dangerouslyAllowPrivateNetwork: true, // opt in only for trusted private-network access
      // allowPrivateNetwork: true, // legacy alias
      // allowedHostnames: ["*.example.com", "example.com", "localhost"],
      // blockedHostnames: ["tracker.example.com", "*.ads.example.com"],
    },
    tabCleanup: {
      enabled: true,
    },
    extensionRelay: {
      allowLegacyAuth: true,
    },
    profiles: {
      openclaw: { cdpPort: 18800 },
      work: {
        cdpPort: 18801,
        executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      },
      chrome: { driver: "extension" },
      user: { driver: "existing-session", attachOnly: true },
      brave: {
        driver: "existing-session",
        attachOnly: true,
        userDataDir: "~/Library/Application Support/BraveSoftware/Brave-Browser",
      },
      remote: { cdpUrl: "http://10.0.0.42:9222" },
    },
    // headless: true, // default; set false for a visible managed browser
    // noSandbox: false,
    // extraArgs: [],
    // executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    // attachOnly: false,
  },
}
```

- `evaluateEnabled: false` 禁用 `act:evaluate` 和 `wait --fn`。
- 对于一个浏览器中继身份验证迁移窗口，`extensionRelay.allowLegacyAuth` 默认为 `true`。它允许旧扩展和外部 CDP 承载、基本和令牌子协议客户端。所有中继客户端使用auth v2后设置为`false`； v2 客户端永远不会降级。
- `tabCleanup` 在空闲时间或会话超出其上限时控制对跟踪的主要代理选项卡的尽力定期清理。跟踪仅适用于浏览器工具`action: "open"`创建的选项卡；由用户打开或所有权未知的选项卡永远不会被采用。禁用 `tabCleanup` 不会禁用显式会话生命周期清理。
- Host-local 以稳定的本机 CDP 目标打开，浏览器身份存储在共享 SQLite 状态中，并在网关重新启动后保持符合 `/new` 和会话生命周期清理的资格。面向本机工具的 CDP 目标在重新启动后也仍然有资格进行空闲和上限清理。 Chrome MCP 使用进程本地目标句柄，因此冷的现有会话记录等待生命周期清理，而不是冒着对不可归因的重启后活动进行空闲扫描的风险。 OpenClaw 在关闭之前验证配置文件和浏览器实例。 Chrome MCP 自动连接、缺少 `/json/version` 浏览器身份以及未解析的本机目标仍完全是进程本地的，因此它们在重新启动后不会自动关闭。较旧的未跟踪选项卡需要手动关闭。暂时性失败将等待稍后重试。请参阅 [ 选项卡清理所有权 ](/tools/browser/configuration#tab-cleanup-ownership)。
- `ssrfPolicy.dangerouslyAllowPrivateNetwork` 取消设置后将被禁用，因此默认情况下浏览器导航保持严格。
- 仅当您有意信任专用网络浏览器导航时才设置 `ssrfPolicy.dangerouslyAllowPrivateNetwork: true`。
- 在严格模式下，远程 CDP 配置文件端点 （`profiles.*.cdpUrl`） 在 reachability/discovery 检查期间受到相同的专用网络阻止。
- `ssrfPolicy.allowPrivateNetwork` 仍然支持作为旧别名。
- 在严格模式下，使用通配符感知 `ssrfPolicy.allowedHostnames` 来实现精确主机和模式异常。
- `ssrfPolicy.blockedHostnames` 拒绝 DNS 之前的确切主机和 `*.example.com` 子域并允许规则，包括专用网络例外。通配符排除顶点；单独添加`example.com`来阻止它。为空或未设置不会增加任何拒绝。
- 远程配置文件仅用于连接（start/stop/reset 已禁用）。
- `profiles.*.cdpUrl` 接受 `http://`、`https://`、`ws://` 和 `wss://`。当您希望OpenClaw发现`/json/version`时，请使用HTTP（S）；当您的提供商为您提供直接的 DevTools WebSocket URL 时，请使用 WS（S）。
- 如果外部管理的 CDP 服务可通过环回访问，则设置该配置文件的 `attachOnly: true`；否则，OpenClaw 会将环回端口视为本地托管浏览器配置文件，并可能报告本地端口所有权错误。
- `existing-session` 配置文件使用 Chrome MCP 而不是 CDP，并且可以连接到选定的主机或通过连接的浏览器节点。
- `extension` 配置文件使用经过验证的 OpenClaw Chrome 扩展中继。中继拥有其环回端点，因此这些配置文件不接受 `cdpUrl`。请参阅 [Chrome 扩展 ](/tools/chrome-extension)。
- `existing-session` 配置文件可以将 `userDataDir` 设置为针对基于 Chromium- 的特定浏览器配置文件，例如 Brave 或 Edge。
- 当 Chrome 已在 DevTools HTTP（S） 发现端点或直接 WS（S） 端点后面运行时，`existing-session` 配置文件可以设置 `cdpUrl`。在该模式下，OpenClaw 将端点传递给 Chrome MCP，而不是使用自动连接；对于 Chrome MCP 启动参数，`userDataDir` 被忽略。 `mcpArgs` 中的有效端点参数优先于 `cdpUrl`；请参阅 [ 定制 Chrome MCP 推出 ](/tools/browser/existing-session#custom-chrome-mcp-launch)。
- `existing-session` 配置文件保留当前 Chrome MCP 路由限制：snapshot/ref-driven 操作而不是 CSS- 选择器定位、单文件上传挂钩、无对话框超时覆盖、无 `wait --load networkidle` 和无`responsebody`、PDF 导出、下载拦截或批处理操作。
- 当 OpenClaw 创建配置文件时， 本地托管的 `openclaw` 配置文件会获取从托管范围分配的 `cdpPort`。您手动声明的配置文件必须设置 `cdpPort` 本身，或为远程 CDP 端点设置 `cdpUrl`；该架构拒绝既不设置也不设置的 `openclaw`（或旧版 `clawd`）驱动程序配置文件。
- 本地托管配置文件可以设置 `executablePath` 以覆盖该配置文件的全局 `browser.executablePath`。使用它可以在 Chrome 中运行一个配置文件，在 Brave 中运行另一个配置文件。
- 托管浏览器默认情况下是无头的。显式全局或每个配置文件 `headless: false` 保持领先模式；外部拥有的浏览器没有变化。
- 自动检测顺序：默认浏览器如果Chromium-基于→Chrome → Brave→ 边缘 →Chromium → Chrome金丝雀 → 已安装Playwright浏览器缓存。缓存发现选择fullChromium仅有的。在Linux和macOS，使用显式的每个配置文件`executablePath`对于无头 shell 并将其保存在单独的配置文件中；切换现有的全Chromiumprofile 到 shell 可以丢弃 localStorage。不支持托管 shell 启动Windows。
- 在 Chromium 启动之前，`browser.executablePath` 和 `browser.profiles.<name>.executablePath` 都接受 `~` 和 `~/...` 作为您的 OS 主目录。 `existing-session` 配置文件上的每个配置文件 `userDataDir` 也采用波形符展开。
- Control 服务：仅环回（端口源自 `gateway.port`，默认为 `18791`）。
- `extraArgs` 将额外的启动标志附加到本地 Chromium 启动（例如 `--disable-gpu`、窗口大小调整或调试标志）。
- 浏览器配置文件、默认配置文件、全局启动设置、`snapshotDefaults` 和 `tabCleanup` 热重载。更改后的启动设置将在下次使用时替换受影响的托管浏览器；外部连接的浏览器保持运行。启用、评估、SSRF 策略和扩展中继身份验证更改将替换浏览器控制服务及其拥有的中继连接，而无需重新启动网关。独立运行的中继守护进程保留自己的生命周期和策略。

---

## UI

```json5
{
  ui: {
    seamColor: "#FF4500",
    prefs: {
      theme: "claw", // claw | knot | dash | absolutely | tide | beacon | phosphor | crt | manuscript | rose | miami | custom
      themeMode: "system", // light | dark | system
      locale: "en",
      chatShowThinking: true,
      chatShowToolCalls: true,
      chatPersistCommentary: true, // Keep commentary after runs in Control UI; does not deliver it to channels
      chatSendShortcut: "enter", // enter | modifier-enter
      chatFollowUpMode: "steer", // steer | queue; omit to use the server queue mode
    },
  },
}
```

代理显示名称、表情符号和头像属于 `agents.entries` 下每个代理的 `identity` 块；参见[代理配置](/gateway/config-agents/entries-and-multi-agent#agentsentries-per-agent-overrides)。

- `seamColor`：本机应用程序 UI chrome 的操作员强调色（通话模式气泡色调等）。 Control UI 用户口音 （`ui.prefs.accent`） 在 `talk.config` 负载和 macOS 应用程序的配置快照中优先。如果两者均未设置，则应用默认主题。 `prefs.accent` 还接受 `"theme"` 显式选择 Control UI 主题调色板，而不继承 `seamColor`；在这种情况下，`talk.config` 会省略其仅十六进制的重音符号。
- `prefs`：跨设备运营商偏好。这是共享主页，因此代理可以通过批准门更改它们，并且每个 Control UI 客户端都保持同步；浏览器将这些值镜像到本地存储中以便即时启动。显式只读连接会在该浏览器中保留编辑，而无需尝试配置写入。脱机编辑仍排队等待稍后的可写连接，并在重新连接时以只读方式继续作为浏览器本地首选项。 `chatPersistCommentary` 默认为 `true`。将其设置为 `false` 可以使实时评论在运行期间可见，但在完成时将其删除，并防止新的 Codex 评论进入持久的转录镜像。消息传递渠道传递保持独立且不变。仅限演示的首选项（例如高级可见性、文本比例、聊天宽度和实时侧边栏活动）保留在浏览器本地，并在“设置”中进行配置。连接的客户端实时应用服务器端更改：每次持久配置写入和客户端刷新其快照后，网关都会广播仅散列的 `config.changed` 事件（当本地设置草稿具有未保存的编辑时会跳过）。重新连接客户端在连接时进行协调。

---

## <a id="desktop"></a> 台式机

主机桌面源允许 Control UI 桌面面板连接到网关计算机。它可以连接到现有的环回 RFB 服务器，或监控 Linux 上的无头 TigerVNC/XFCE 桌面。这是一项实验室功能，默认情况下处于关闭状态。

在 **Systems** 中，选择 **Gateway 主机** 以检查现有屏幕共享服务器。当其中一个可用时，**Enable OpenClaw** 中的桌面访问会打开主机桌面，而无需重新启动网关；桌面在同一连接上变得可用。需要网关管理员访问权限。检测不会暴露桌面或更改系统权限。可以从同一视图启用现有的托管 Linux 桌面。 **设置→实验室→主机桌面**仍然可用于关闭访问或单独管理它。

单独启用 macOS 屏幕共享、配对节点的桌面共享或屏幕截图不会启用网关的桌面。在macOS上，远程管理还提供屏幕共享，但帐户必须具有**Observe**和**Control**权限，在**系统设置→常规→共享→远程管理**。当缺少这些权限时，正确的密码仍然可能被拒绝。 OpenClaw 不会自动更改这些系统权限。

观察者令牌和观察者连接绑定到请求它们的网关连接。结束或撤销该连接会拒绝未使用的令牌，并用 `4006 authority_revoked` 关闭其观察者。没有网关连接的内部调用者仅保留 TTL- 令牌。

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

- `desktop.host.enabled`： 打广告**本机**作为桌面源。无需重新启动网关即可应用更改并更新连接的桌面选择器。在实验室写入中关闭主机桌面`enabled: false`，关闭主机桌面观察，并保留其托管模式、端口和密码文件设置。现有系统VNC或屏幕共享服务保持运行。
- `desktop.host.managed`：仅限 Linux。在第一次观察或计算机发现时延迟启动网关监督的仅环回 TigerVNC/XFCE 桌面。当没有观察者或活动计算机执行持有桌面会话的逗留期后，将其停止。默认值：`false`。
- `desktop.host.port`：`127.0.0.1` 上的回环 RFB 端口（默认值：`5900`）。
- `desktop.host.passwordFile`：附加模式的可选 UTF-8 VNC 密码文件。如果没有它，Control UI 会提示输入 VNC 密码，并将其保存在该连接的浏览器内存中。托管模式始终创建自己的临时密码。

对 `managed`、`port` 或 `passwordFile` 的更改会退出当前主机源，关闭其观察者，并释放其计算机执行保留。替换按需开始，无需重新启动网关。外部 VNC 服务器保持运行。

OpenClaw 仅通过环回连接。显式 `port` 始终选择连接模式，并且端口 `5900` 上的现有 RFB 侦听器优先于托管模式。托管模式需要 `Xtigervnc`、`tigervncpasswd`、`startxfce4` 和 `dbus-daemon`；在 Debian/Ubuntu 上安装 `tigervnc-standalone-server tigervnc-tools xfce4-session dbus-daemon`。网关为每个托管会话创建一个新的临时 VNC 密码，从不保留该密码，并监督 VNC 服务器、XFCE 会话和私有 D-Bus 会话。

要让代理控制此桌面，请在网关主机上显式启用 `cua-computer` 并在其工具策略中公开 `computer` 工具。网关和配对节点重复使用相同的计算机提供商；网关不需要为其自己的桌面配对节点。其帮助程序接收托管桌面的 X11 显示和专用 D-Bus 地址。关闭桌面面板可以使活动的计算机执行保持活动状态；停止或重新启动桌面会在更换显示器之前关闭该执行。参见[计算机使用](/nodes/computer-use#gateway-desktop)。

外部 VNC 流本身无法识别 CUA 可以控制的本机显示器。如果外部侦听器优先于托管模式，则托管计算机路由会报告不匹配情况。在托管模式之外，网关计算机使用其进程的本机桌面环境和提供商的可用性检查。现有配置和节点配对在更新时保持不变；启用桌面面板不会自动启用 CUA。

如果桌面拆卸失败，网关将保留会话的清理所有者并在其日志中报告失败情况。新的观察结果会返回该故障，而无需重试清理或累积替换所有者。生命周期清理，例如在实验室中关闭主机桌面，重试保留的所有者；只有清理成功后才能开始替换。对于 SSH- 支持的工作桌面，临时连接文件会保留到传输关闭为止；进程延迟退出会触发另一次清理尝试。在重试清理之前检查报告的进程或文件系统错误。

不使用管理模式时，请在第三方服务器支持的情况下将其配置为监听回环地址。在 Linux 上，使用仅限回环地址的 TigerVNC 或 `x11vnc`；不支持 GNOME Remote Desktop 的 VeNCrypt 模式。在 Windows 上，请在 VNC 服务器中启用 VNC 身份验证和回环访问。

在 macOS 上，启用**系统设置 → 通用 → 共享 → 屏幕共享**。现代屏幕共享使用 ARD 账户身份验证，因此 Gateway 会执行该握手，并向浏览器提供一个已经过身份验证的无身份验证 RFB 流。macOS 账户密码不会出现在观察结果、URL 或日志中。当屏幕共享关闭时，`openclaw doctor` 可以在获得明确确认后提供 `sudo launchctl` 修复；启用 macOS 系统服务后，根据 macOS 共享设置，该服务可能会暴露在其他网络接口上。

### <a id="desktop-audio"></a> 桌面音频

托管 Linux 网关桌面可以将其应用程序音频发送到浏览器。安装 `pulseaudio` 和 `pulseaudio-utils` 以及托管桌面依赖项，然后重新启动托管桌面并重新连接。每个托管桌面拥有一个私有PulseAudio服务器和虚拟输出设备；它不会捕获主机麦克风或其他桌面的输出。缺少音频依赖性会使屏幕可用但音频不可用。将鼠标悬停、聚焦或点击 **Audio unavailable** 可查看设置指南，要求操作员检查这些包并重新启动托管桌面；本机错误详细信息和主机路径不会发送到查看器。如果私人音频无法启动，桌面应用程序将保留其之前的音频路由；观看者永远不会捕捉到该后备路线。

如果专用音频服务器退出，网关会在五分钟内重试其专用路由最多 3 次，与桌面进程恢复无关。现有河流停止；重新连接并取消静音以再次收听，并在需要时重播应用程序音频。如果该路由无法恢复或其重试预算已耗尽，则在不关闭正常桌面应用程序或计算机会话的情况下，音频仍然不可用。检查音频依赖性，仅在需要音频时重新启动托管桌面；操作员请求的重新启动可以关闭应用程序。实际的 VNC、D-Bus 或桌面会话故障仍使用单独的桌面重新启动预算。

音频开始静音。在桌面工具栏中选择“**取消音频静音”**进行收听，选择“**静音音频**”停止采集和播放。您的浏览器必须允许单击后出现音频。隐藏、断开连接或替换桌面会停止播放；新连接开始静音。音频授权与经过身份验证的屏幕连接相关联，并随之撤销。

独立桌面视图还在其触摸工具栏中显示 Unmute/Mute，具有与嵌入式面板相同的播放生命周期和静音启动规则。

第一条路径在单独的经过验证的 WebSocket 上使用未压缩的 48 kHz 立体声 PCM（收听时约为 1.5 Mbit/s）。缓冲是有限的；无法跟上的连接会停止而不是累积延迟的声音。它旨在用于第一个桌面音频实现，而不是同步视频播放或低带宽流。

外部 VNC 服务器、配对节点桌面、云工作线程桌面、macOS 和 Windows 尚不播发音频。他们的工具栏报告音频不可用。不支持麦克风转发。

### <a id="paired-node-desktops"></a> 配对节点桌面

升级保留通过从网关允许列表中删除 `desktop.stream` 禁用的桌面访问。当节点重新连接时，这些现有的桌面批准需要再次批准。其他节点功能和设备令牌保持不变，新节点使用启用的默认值。现有的显式允许和拒绝条目仍然受到尊重。一次性迁移记录在现有共享SQLite迁移账本中；它不会重写您的配置。 Doctor 在导入较旧的配对文件时应用相同的保留。

配对的 macOS、Windows 或 Linux 节点可以在同一 Control UI 桌面面板和 **Systems** 中公开其自己的桌面。默认启用桌面共享，并且始终使用 `127.0.0.1` 上现有的节点本地 RFB 服务器；网关从不要求节点连接到调用者选择的主机或端口。

在 macOS 应用程序中，使用 **设置 → 本机 → 功能 → 桌面共享**。这可以控制运行应用程序的 Mac，即使其仪表板连接到远程网关也是如此。更改它会自动重新连接节点。 **电脑Control**分别控制坐席截图和输入； **保持计算机唤醒**控制空闲睡眠。桌面共享未启用 macOS 屏幕共享：首先在 **系统设置→常规→共享** 下将其打开。

[Tauri 伴侣 ](/platforms/linux#desktop-sharing) 在 **设置→此计算机→功能**（**macOS 上的此 Mac**）下具有相同的共享开关。它使用本地 CLI 将仅限桌面的节点连接到其主网关。

CLI 节点在其本地配置中使用 `desktop.host.enabled`。缺少的设置默认为启用；显式 `false` 禁用共享。更新后，现有的显式禁用设置仍保持禁用状态。桌面应用程序中的显式选择优先于该计算机的本地配置。

要使用非默认端口或密码文件，请在节点上配置附加模式：

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

更改配置后重新启动 CLI 节点主机。 `managed: true` 是网关主机功能，不会在节点主机内启动托管桌面；配对节点必须已有环回 RFB 服务器。

网关允许 `desktop.stream` 用于经批准的桌面节点，无需额外的 `gateway.nodes.commands.allow` 条目。显式 `gateway.nodes.commands.deny` 条目仍然优先。更新现有节点后，其重新连接可以将 `desktop.stream` 通告为配对表面升级。检查 `openclaw nodes pending`，然后使用 `openclaw nodes approve <requestId>` 批准新请求。仅当节点处于连接状态并且仍然允许有效批准的命令时，该节点才会出现在桌面选择器中。

当节点连接或断开连接时，可见选择器会更新。当分配的节点可用时，为会话或特定源打开的桌面将连接；自己打开选择器可以保持源选择手动。

对于 VncAuth，`desktop.host.passwordFile` 保留在节点上，仅传送到网关的经过身份验证的中继。如果没有密码文件，Control UI 会提示输入 VNC 密码。 macOS 当您首次连接到桌面面板中的节点时，ARD 会要求提供帐户凭据。面板将它们保存在内存中以便重新连接到同一节点。关闭面板、选择另一个桌面或丢失网关连接都会清除它们；身份验证拒绝再次要求输入密码。网关在向浏览器公开无身份验证 RFB 握手之前完成 ARD 或 VNC 身份验证，因此 URL、日志或 RPC 结果中不会返回凭据。

桌面字节使用专用的出站二进制文件WebSocket从节点。普通节点调用仅保留为可取消的生命周期句柄，并且从不携带帧缓冲区数据。重新连接或更改节点的配对生成会关闭活动继电器。要解除该功能，请关闭**桌面共享**在 Mac 应用程序中，设置`desktop.host.enabled: false` on a CLI节点，或添加`desktop.stream`到网关的`commands.deny`。使用默认的混合重新加载模式，网关命令策略更改将应用​​于连接的节点，而无需重新启动网关或重新连接节点。

如果选择器中缺少该节点，请检查桌面共享是否已启用、配对更新是否已批准以及网关策略是否未拒绝该命令。如果查看器无法连接，请验证节点的环回 RFB 侦听器。更改桌面配置后重新启动 CLI 节点主机，然后检查 `openclaw nodes pending` 的扩展声明。网关策略更改适用于现有配对批准。

---
