---
summary: "浏览器配置块、选项卡清理、屏幕截图视觉、端口、SSRF 策略以及选择 Chromium 二进制文件"
title: "浏览器配置"
read_when:
  - "您正在 openclaw.json 中编写浏览器块"
  - "您需要 CDP 端口范围或 SSRF 策略选项"
  - "您需要纯文本模型来读取浏览器屏幕截图"
  - "您希望 OpenClaw 启动 Brave、Edge 或其他 Chromium 浏览器"
---

## <a id="configuration"></a> 配置

浏览器设置位于 `~/.openclaw/openclaw.json`。

启用网关热重载后，更改 `browser.enabled`、`browser.evaluateEnabled` 或 `browser.ssrfPolicy` 仅替换浏览器控制服务。在新策略应用之前，待处理的浏览器操作将被取消，并且 OpenClaw- 拥有的 Chrome 进程将关闭。网关和其他插件继续运行。连接的远程浏览器进程保持打开状态，但 OpenClaw 断开其控制会话。启用后，浏览器控制会在下一个请求时再次启动；不再保留已退役进程中的托管选项卡。分机中继配置仍需要重新启动网关。

```json5
{
  browser: {
    enabled: true, // default: true
    evaluateEnabled: true, // default: true; false disables act:evaluate (arbitrary JS)
    ssrfPolicy: {
      // dangerouslyAllowPrivateNetwork: true, // opt in only for trusted private-network access
      // allowedHostnames: ["localhost"],
      // allowRfc2544BenchmarkRange: true, // trusted fake-IP proxy range
      // allowIpv6UniqueLocalRange: true, // trusted fake-IP proxy IPv6 range
    },
    // cdpUrl: "http://127.0.0.1:18792", // legacy single-profile override
    tabCleanup: {
      enabled: true, // default: true
    },
    // snapshotDefaults: { mode: "efficient" }, // default snapshot mode when the caller omits one
    defaultProfile: "openclaw",
    headless: true, // default for local managed profiles
    noSandbox: false,
    attachOnly: false,
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    profiles: {
      openclaw: { cdpPort: 18800 },
      work: {
        cdpPort: 18801,
        headless: true,
        executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      },
      user: {
        driver: "existing-session",
        attachOnly: true,
      },
      brave: {
        driver: "existing-session",
        attachOnly: true,
        userDataDir: "~/Library/Application Support/BraveSoftware/Brave-Browser",
      },
      remote: { cdpUrl: "http://10.0.0.42:9222" },
    },
  },
}
```

当调用者未传递显式 `snapshotFormat` 或 `mode` 时，`browser.snapshotDefaults.mode: "efficient"` 会更改默认的 `snapshot` 提取模式。更改适用于下一个快照；有关每次调用快照选项，请参阅 [ 浏览器控件 API](/tools/browser-control)。

在具有稳定文档标识的驱动上，对同一标签页、文档和选项族重复进行 AI 或角色 snapshot 时，会将新出现的、带 ref 的元素标记为 `[new]`。第一次 snapshot——以及导航后的第一次 snapshot——会建立一个无标记基线。现有会话 snapshot 会省略差异。

### <a id="tab-cleanup-ownership"></a> 标签页清理所有权

会话选项卡清理仅适用于会话拥有的选项卡：由 OpenClaw 浏览器工具使用 `action: "open"` 创建的选项卡以及从 Control UI 中该会话的浏览器面板打开的选项卡。 OpenClaw 不采用已打开、在 OpenClaw 外部打开或以其他方式具有未知所有权的选项卡。 `browser.tabCleanup` 块控制主会话的定期空闲和上限扫描。更改将在下一次扫描时应用，无需重新启动浏览器；禁用它不会禁用显式会话生命周期清理。

所有权包括代理身份：使用相同会话密钥（例如 `global`）的两个代理具有单独的选项卡成员身份和清理功能。当清理读取选项卡存储时，没有代理资格身份的旧持久记录将作为无效簿记被丢弃。他们的选项卡保持打开状态：OpenClaw 不会猜测所有者或将其引入另一个会话。如果需要，请手动关闭这些选项卡。

定期清理属于浏览器插件服务，并在首次启动浏览器控件的请求结束后继续进行。停止或重新加载该服务会取消未来的扫描并等待主动清理完成。

OpenClaw-托管 Chrome 在打开选项卡时还应用单独的、尽力而为的八个页面选项卡上限。该上限独立于`browser.tabCleanup`；远程和仅附加配置文件不使用它。

对于主机本地打开，稳定的本机 CDP 目标和浏览器身份的所有权存储在共享 SQLite 状态中。这些记录在网关重新启动后仍然存在，并且仍然符合 `/new` 和其他会话生命周期清理的条件；会话生命周期清理包括子代理、cron 和 ACP 会话结束。面向工具的目标是本机 CDP 目标的记录在重新启动后也仍然有资格进行空闲和每会话上限扫描。 Chrome MCP 目标句柄是进程本地的，因此冷的现有会话记录会等待生命周期清理，而不是冒着对重新启动后无法安全归因的活动进行空闲扫描的风险。此持久路径可以覆盖 OpenClaw- 托管配置文件、常规远程 CDP 配置文件以及具有显式 `cdpUrl` 的现有会话配置文件，前提是 OpenClaw 可以解析本机目标和稳定的浏览器身份。在关闭持久记录之前，OpenClaw 会验证配置的配置文件和浏览器实例是否仍然匹配。

Chrome MCP `--autoConnect`、其 `/json/version` 响应缺少稳定浏览器身份的 CDP 端点，以及其原生 target 无法解析的打开项，仍然属于进程本地的尽力追踪。它们可以在该 Gateway 进程运行时被清理，但不会在 Gateway 重启后自动关闭。对于在持久追踪可用之前就已打开的标签页，不会事后接管；请手动关闭这些标签页。

清理是尽力而为的，并不保证每个符合条件的标签页都会立即关闭。一次短暂的所有权检查或关闭失败会使持久清理保持待处理状态，等待稍后重试。重试不是无限的：当浏览器一直不可达且标签页已闲置超过一天时，跟踪行会被退役，这样持久存储就不会被那些再也无法验证的标签页占满。

### <a id="screenshot-vision-(text-only-model-support)"></a><a id="screenshot-vision-text-only-model-support"></a> 截图视觉能力（仅文本模型支持）

当主模型为纯文本时（不支持 vision/multimodal），浏览器屏幕截图会返回模型无法读取的图像块。浏览器屏幕截图重用现有的图像理解配置，因此为媒体理解配置的图像模型可以将屏幕截图描述为文本，而无需任何特定于浏览器的模型设置。

```json5
{
  tools: {
    media: {
      models: [
        { provider: "bytedance", model: "doubao-seed-2.0-pro", capabilities: ["image"] },
        // Add fallback candidates; first success wins
        { provider: "openai", model: "gpt-4o", capabilities: ["image"] },
      ],
    },
  },
  agents: {
    defaults: {
      // Existing image-model defaults are also honored.
      // imageModel: { primary: "openai/gpt-4o" },
    },
  },
}
```

**工作方式：**

1. Agent 调用 `browser screenshot`，并像往常一样将图像捕获到磁盘。
2. 浏览器工具会询问现有的图像理解运行时：它是否可以使用已配置的媒体图像模型、共享媒体模型、图像模型默认值或带认证的图像提供方来描述该截图。
3. 视觉模型返回文本描述，该描述会被 `wrapExternalContent`（提示注入防护）包装后，作为文本块返回给 agent，而不是图像块。
4. 如果图像理解不可用、被跳过或失败，浏览器会回退为返回原始图像块。

截图图像块是私有工具结果：agent 可以检查它们， 但 OpenClaw 不会自动将它们附加到频道回复中。要共享一张截图，请让 agent 使用 message 工具显式发送它。

使用 `tools.media.models` 配置模型回退、超时、字节限制、配置文件和提供方请求设置。为支持截图的条目标记 `image` 能力。

如果当前主模型已经支持视觉，并且没有显式配置图像理解模型，OpenClaw 会保留正常的图像结果，以便主模型可以直接读取截图。

<AccordionGroup>

<Accordion id="ports-and-reachability" title="端口和可达性">

- Control 服务绑定到源自 `gateway.port` 的端口上的环回（默认 `18791` = 网关 + 2）。 `OPENCLAW_GATEWAY_PORT` 优先于 `gateway.port`；要么移动同一系列中的派生端口。
- 本地 `openclaw` 配置文件使用 CDP 端口范围，从控制端口上方的 9 个端口开始（默认 `18800`-`18899`）。 OpenClaw 从该范围为隐式默认配置文件和使用 `openclaw browser create-profile` 创建的配置文件进行分配，将所选的 `cdpPort` 写入配置中。您手动声明的配置文件必须设置 `cdpPort` 本身，或为远程端点设置 `cdpUrl`：架构拒绝使用 `Profile must set cdpPort or cdpUrl` 两者都未设置的 `openclaw` 或 `clawd` 配置文件。 `existing-session` 配置文件使用 `cdpUrl`，除非 `mcpArgs` 中的有效端点参数覆盖它；请参阅 [ 定制 Chrome MCP 推出 ](/tools/browser/existing-session#custom-chrome-mcp-launch)。他们忽略`cdpPort`； `extension` 配置文件拥有其中继端口并拒绝 `cdpUrl`。
- 远程和 `attachOnly` 的 CDP 可达性、WebSocket 握手以及本地受管 Chrome 启动都使用内置截止时间。
- 重复管理的 Chrome launch/readiness 故障按配置文件断路。在连续几次失败后，OpenClaw 会短暂暂停新的启动尝试，而不是在每次浏览器工具调用时生成 Chromium。修复启动问题，不需要时禁用浏览器，或修复后重新启动网关。

</Accordion>

<Accordion id="ssrf-policy" title="SSRF 政策">

- 浏览器导航和打开标签页请求会进行预检。在操作期间以及有界的操作后宽限期内，受保护的 Playwright 交互（点击、坐标点击、悬停、拖拽、滚动、选择、按键、输入、表单填充和 evaluate）会在 HTTP 请求字节发出前拦截策略拒绝的顶层和子框架文档加载，然后尽力重新检查最终的 `http(s)` URL。
- 在每次新的 OpenClaw- 管理的 Chrome 启动之前，OpenClaw 会尽力禁用网络预测，从而抑制 Chromium 针对那些被拒绝的负载观察到的推测性预连接。这是深度防御，而不是策略边界：在控制服务重新启动期间重用的浏览器和其他浏览器后端可能不会共享强化。 Playwright 路由仍然不是网络防火墙，并且不会拦截重定向跃点、弹出窗口的第一个请求、Service Worker 流量、在有界保护窗口之后运行的页面代码或每个 background/subresource 路径。完全的出口隔离需要所有者端隔离或策略执行代理。
- 在严格的 SSRF 模式下，还会检查远程 CDP 端点发现和 `/json/version` 检查 （`cdpUrl`）。
- 当所选驱动程序无法将批准的端点绑定到实际套接字时，Guarded 远程 CDP 连接将被拒绝。使用适用于 Browserless、Browserbase、Notte 或其他受保护的远程 CDP 提供程序的常规 `openclaw` 驱动程序。具有显式 `cdpUrl` 或 `--browserUrl`/`--wsEndpoint` MCP 参数的 `existing-session`/Chrome MCP 配置文件在默认严格浏览器策略下会被拒绝，因为 Chrome MCP 无法携带 OpenClaw 的固定DNS 跨其子流程边界的查找或受保护的发现结果。仅当专用网络浏览器访问受到明确信任时，它们才会受到支持。否则，省略显式端点并将 Chrome MCP 连接到主机本地 Chrome 配置文件，或将该配置文件切换到受保护的 CDP 的常规驱动程序。
- 除非当前策略明确允许更改授权机构，否则不支持将 CDP 发现重定向到不同的授权机构。重新验证返回的主机名还不够；WebSocket 传输必须使用通过策略验证的端点。
- Gateway/provider `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY` 和 `NO_PROXY` 环境变量不会自动代理 OpenClaw- 托管浏览器。托管 Chrome 默认情况下直接启动，因此提供商代理设置不会削弱浏览器 SSRF 检查。
- OpenClaw- 托管本地 CDP 就绪检查和 DevTools WebSocket 连接绕过托管网络代理，以实现确切启动的环回端点，因此当操作员代理阻止环回出口时，`openclaw browser start` 仍然可以工作。
- 要代理受管浏览器本身，请通过 `browser.extraArgs` 传递显式 Chrome 代理标志，例如 `--proxy-server=...` 或 `--proxy-pac-url=...`。严格 SSRF 模式会阻止显式的浏览器代理路由，除非有意启用私有网络浏览器访问。
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 默认关闭；只有在有意信任私有网络浏览器访问时才启用。
- `browser.ssrfPolicy.allowedHostnames` 允许精确主机，同时仍阻止私有网络的其他部分。
- `browser.ssrfPolicy.allowRfc2544BenchmarkRange` 和 `browser.ssrfPolicy.allowIpv6UniqueLocalRange` 会有限度地允许受信任的伪 IP 代理范围。

</Accordion>

<Accordion id="profile-behavior" title="个人资料行为">

- `attachOnly: true` 表示从不启动本地浏览器；仅在已有浏览器运行时进行连接。
- 本地托管配置文件默认情况下是无头的。设置`headless: false`为可见窗口；现有的显式标题设置将被保留。 `headless` 可以全局设置或每个本地托管配置文件设置。每个配置文件的值会覆盖 `browser.headless`，因此一个本地启动的配置文件可以保持无头状态，而另一个则保持可见。
- `POST /start?headless=true` 和 `openclaw browser start --headless` 会为本地受管配置文件请求一次性的无头启动，而不会重写 `browser.headless` 或配置文件配置。Existing-session、仅连接和远程 CDP 配置文件会拒绝此覆盖，因为 OpenClaw 不会启动这些浏览器进程。
- 本地托管配置文件在每个平台上默认为无头，包括具有桌面会话的主机。现有会话、扩展、远程和仅附加浏览器进程保持其外部选择的模式。使用明确的浏览器级形式 `openclaw browser --json status`；尾随 `openclaw browser status --json` 也有效，因为 `status` 没有定义自己的 `--json`。该命令将 `headlessSource` 报告为 `env`、`profile`、`config`、`request` 或 `default`。
- 新鲜的无头配置文件在浏览器启动之前播种；他们运行临时浏览器不仅仅是为了创建首选项文件。现有的配置文件首选项和 cookie 加密设置将被保留。
- 当未找到已安装的 Chromium- 系列浏览器时，OpenClaw 会在 Playwright 缓存中搜索完整的 Chromium。即使完整的浏览器被删除，自动发现也永远不会切换到无头外壳。 Discovery 不加载 Playwright 或下载浏览器。在 Linux 和 macOS 上，通过将单独的托管配置文件的 `executablePath` 设置为 shell 二进制文件并保持该配置文件为无头，选择使用无头 shell。不要重复使用完整的 Chromium 配置文件：切换发行版可能会丢弃其 localStorage。 Windows 托管配置文件需要完整的 Chromium。 shell 是一个 Chromium 引擎，具有自己的第三方许可义务，而不是 MIT-only 二进制文件。
- Headless shell 不会创建 Chromium 的配置文件锁。在Linux和macOS上，跨运行时停止和重置验证实时进程、CDP侦听器和确切的配置文件目录；如果 shell 仍在另一个端口上使用数据或无法证明所有权，则重置会保留数据。启动和重置共享跨运行时配置文件锁。 Windows 上不支持托管 shell 启动和跨运行时清理，并且无法关闭；使用完整的 Chromium 或附加到外部管理的浏览器。
- `OPENCLAW_BROWSER_HEADLESS=1` 会强制当前进程的本地受管启动采用无头模式。`OPENCLAW_BROWSER_HEADLESS=0` 会强制普通启动采用有头模式，并在没有显示服务器的 Linux 主机上返回可操作的错误；显式的 `start --headless` 请求在该次启动中仍然优先。
- 浏览器控制路由和程序化客户端会保留无显示器错误中人类可读的 `error`，并公开稳定原因 `no_display_for_headed_profile`。其 `details` 仅包含 `profile`、`requestedHeadless`、`headlessSource` 和 `displayPresent`，因此 API 客户端可以选择正确的修复方式，而无需匹配消息文本。
- 用于运行本地托管配置文件、状态和医生查询 Chrome 的浏览器级 CDP 端点，用于渲染器、后端、device/driver、功能状态、驱动程序解决方法和加速视频功能。结果被该浏览器进程缓存并由 `openclaw browser --json status` 完整公开。被动状态调用不会启动 Chrome。现有会话、扩展、远程 CDP 和沙箱浏览器保持独立，不会通过此托管主机路径进行检查。
- 无头受管 Chrome 仍使用保守的 `--disable-gpu` 默认设置。诊断不会启用加速、添加全局加速设置，也不会授予沙盒浏览器设备访问权限。
- Headless Chromium 无法显示 Chrome 的密钥对话框，因此 OpenClaw 在无头浏览器中回答密钥请求，并将其忽略，并且页面保持可用。请参阅无头浏览器中的 [ 密钥 ](/tools/browser-login#passkeys-in-headless-browsers)。
- `executablePath` 可以全局设置或每个本地托管配置文件设置。每个配置文件的值会覆盖 `browser.executablePath`，因此不同的托管配置文件可以启动不同的基于 Chromium- 的浏览器。两种形式都接受 `~` 作为您的 OS 主目录。
- 默认配置文件是 `openclaw`（受管独立浏览器）。使用 `defaultProfile: "user"` 可选择使用已登录的用户浏览器。
- 自动检测顺序：系统默认浏览器是否基于Chromium-；否则为 Chrome、Brave、Edge、Chromium、Chrome 金丝雀。
- `driver: "existing-session"` 使用 Chrome DevTools MCP，而不是原始 CDP。它可以通过 Chrome MCP 自动连接，或者在运行中的浏览器已有 DevTools 端点时通过 `cdpUrl` 连接。
- `driver: "extension"` 通过 [OpenClaw Chrome extension](/tools/chrome-extension) 驱动已登录的 Chrome。中继程序拥有其回环端点，因此这些配置文件不接受 `cdpUrl`。这是唯一一种在电脑前无人操作时也能工作的已登录浏览器模式。
- 当现有会话配置文件应附加到非默认 Chromium 用户配置文件（Brave、Edge 等）时设置 `browser.profiles.<name>.userDataDir`。此路径还接受 `~` 作为您的 OS 主目录。

</Accordion>

</AccordionGroup>

## <a id="use-brave-or-another-chromium-based-browser"></a> 使用 Brave 或其他基于 Chromium- 的浏览器

如果您的**系统默认**浏览器是基于Chromium-（Chrome/Brave/Edge/etc），则OpenClaw会自动使用它。设置 `browser.executablePath` 以覆盖自动检测。顶级和每个配置文件的 `executablePath` 值接受 `~` 作为您的 OS 主目录：

```bash
openclaw config set browser.executablePath "/usr/bin/google-chrome"
openclaw config set browser.profiles.work '{"cdpPort":18801,"executablePath":"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}' --strict-json --merge
```

或者按平台在配置中设置：

<Tabs>
  <Tab title="macOS">
```json5
{
  browser: {
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  },
}
```
  </Tab>
  <Tab title="Windows">
```json5
{
  browser: {
    executablePath: "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  },
}
```
  </Tab>
  <Tab title="Linux">
```json5
{
  browser: {
    executablePath: "/usr/bin/brave-browser",
  },
}
```
  </Tab>
</Tabs>

按配置文件的 `executablePath` 只会影响由 OpenClaw 启动的本地管理配置文件。 `existing-session` 配置文件则会附加到已经运行的浏览器， 而远程 CDP 配置文件使用的是 `cdpUrl` 后面的浏览器。
