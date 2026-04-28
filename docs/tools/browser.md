---
summary: "集成浏览器控制服务 + 操作命令"
read_when:
  - 添加代理控制的浏览器自动化
  - 调试为何 openclaw 干扰了你自己的 Chrome
  - 在 macOS 应用中实现浏览器设置和生命周期
title: "浏览器（OpenClaw 管理）"
---

OpenClaw 可以运行一个由代理控制的 **专用 Chrome/Brave/Edge/Chromium 配置文件**。
它与您的个人浏览器相互隔离，并通过 Gateway 内部一个很小的本地控制服务进行管理（仅限 loopback）。

初学者视角：

- 将其视为一个**单独的，仅供代理使用的浏览器**。
- `openclaw` 配置文件**不会影响**您的个人浏览器配置。
- 代理可以在安全的环境中**打开标签页、读取页面、点击和输入**。
- 内置的 `user` 配置文件通过 Chrome MCP 附加到您真实登录的 Chrome 会话。

## 你将获得

- 一个名为 **openclaw** 的独立浏览器配置文件（默认橙色强调色）。
- 确定性的标签页控制（列表/打开/聚焦/关闭）。
- 代理操作（点击/输入/拖拽/选择）、快照、截图、PDF。
- 一个捆绑的 `browser-automation` 技能：当浏览器插件启用时，它会教代理在快照、稳定标签页、失效引用和手动阻塞恢复之间的循环。
- 可选的多配置文件支持（`openclaw`、`work`、`remote`、...）。

此浏览器 **不是您的日常使用浏览器**，它是用于代理自动化和验证的安全隔离环境。

## 快速开始

```bash
openclaw browser --browser-profile openclaw doctor
openclaw browser --browser-profile openclaw status
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

如果提示“浏览器已禁用”，请在配置中启用（见下文），然后重启网关。

如果完全缺少 `openclaw browser`，或者代理说浏览器工具不可用，请跳转到 [缺少浏览器命令或工具](/tools/browser#missing-browser-command-or-tool)。

## 插件控制

默认的 `browser` 工具是一个捆绑插件。禁用它即可替换为另一个注册同名 `browser` 工具的插件：

```json5
{
  plugins: {
    entries: {
      browser: {
        enabled: false,
      },
    },
  },
}
```

默认设置同时需要 `plugins.entries.browser.enabled` **和** `browser.enabled=true`。仅禁用插件会将 `openclaw browser` CLI、`browser.request` 网关方法、代理工具和控制服务作为一个整体移除；您的 `browser.*` 配置会保持不变，以便替换使用。

浏览器配置更改后需要重启 Gateway，以便插件重新注册其服务。

## Agent guidance

浏览器插件提供两层代理指导：

- `browser` 工具说明包含简洁的、始终生效的契约：选择正确的配置文件，让引用保持在同一标签页上，使用 `tabId`/标签来定位标签页，并为多步工作加载浏览器技能。
- 捆绑的 `browser-automation` 技能包含更长的操作循环：先检查状态/标签页，给任务标签页加标签，操作前先快照，UI 变化后重新快照，失效引用只恢复一次，并将登录/2FA/captcha 或摄像头/麦克风阻塞作为手动操作上报，而不是猜测。

启用插件后，插件捆绑的技能会列在代理可用技能中。完整技能说明按需加载，因此日常轮次不会承担完整的 token 成本。

## 缺少浏览器命令或工具

- `browser` 工具说明包含简洁的、始终生效的契约：选择正确的配置文件，让引用保持在同一标签页上，使用 `tabId`/标签来定位标签页，并为多步工作加载浏览器技能。
- 捆绑的 `browser-automation` 技能包含更长的操作循环：先检查状态/标签页，给任务标签页加标签，操作前先快照，UI 变化后重新快照，失效引用只恢复一次，并将登录/2FA/captcha 或摄像头/麦克风阻塞作为手动操作上报，而不是猜测。

启用插件后，插件捆绑的技能会列在代理可用技能中。完整技能说明按需加载，因此日常轮次不会承担完整的 token 成本。

## Missing browser command or tool

If `openclaw browser` is unknown after an upgrade, `browser.request` is missing, or the agent reports the browser tool as unavailable, the usual cause is a `plugins.allow` list that omits `browser` and no root `browser` config block exists. Add it:

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

An explicit root `browser` block, for example `browser.enabled=true` or `browser.profiles.<name>`, activates the bundled browser plugin even under a restrictive `plugins.allow`, matching channel config behavior. `plugins.entries.browser.enabled=true` and `tools.alsoAllow: ["browser"]` do not substitute for allowlist membership by themselves. Removing `plugins.allow` entirely also restores the default.

## 配置文件：openclaw 与 user

- `openclaw`：管理的、隔离的浏览器（无需扩展）。
- `user`：内置 Chrome MCP 附加配置，用于您的**真实登录的 Chrome**会话。

对于代理浏览器工具调用：

- 默认：使用隔离的 `openclaw` 浏览器。
- 当已有登录会话且用户在电脑旁可点击/批准附加提示时，优先使用 `profile="user"`。
- 通过 `profile` 参数可显式覆盖指定浏览器模式。

如果您希望默认使用托管模式，请设置 `browser.defaultProfile: "openclaw"`。

## 配置

浏览器设置存放于 `~/.openclaw/openclaw.json`。

```json5
{
  browser: {
    enabled: true, // 默认值：true
    ssrfPolicy: {
      // dangerouslyAllowPrivateNetwork: true, // 仅针对受信任的私有网络访问启用
      // allowPrivateNetwork: true, // 遗留别名
      // hostnameAllowlist: ["*.example.com", "example.com"],
      // allowedHostnames: ["localhost"],
    },
    // cdpUrl: "http://127.0.0.1:18792", // 旧版单配置文件覆盖
    remoteCdpTimeoutMs: 1500, // 远程 CDP HTTP 超时（毫秒）
    remoteCdpHandshakeTimeoutMs: 3000, // 远程 CDP WebSocket 握手超时（毫秒）
    defaultProfile: "openclaw",
    color: "#FF4500",
    headless: false,
    noSandbox: false,
    attachOnly: false,
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: { cdpPort: 18801, color: "#0066CC", headless: true },
      user: {
        driver: "existing-session",
        attachOnly: true,
        color: "#00AA00",
      },
      brave: {
        driver: "existing-session",
        attachOnly: true,
        userDataDir: "~/Library/Application Support/BraveSoftware/Brave-Browser",
        color: "#FB542B",
      },
      remote: { cdpUrl: "http://10.0.0.42:9222", color: "#00AA00" },
    },
  },
}
```

<AccordionGroup>

<Accordion title="Ports and reachability">

- 控制服务绑定到从 `gateway.port` 派生的 loopback 端口（默认 `18791` = gateway + 2）。覆盖 `gateway.port` 或 `OPENCLAW_GATEWAY_PORT` 会以同一端口族方式改变派生端口。
- 本地 `openclaw` 配置文件会自动分配 `cdpPort`/`cdpUrl`；只有在远程 CDP 时才设置这些值。未设置时，`cdpUrl` 默认为托管的本地 CDP 端口。
- `remoteCdpTimeoutMs` 适用于远程和 `attachOnly` CDP HTTP 可达性检查以及打开标签页的 HTTP 请求；`remoteCdpHandshakeTimeoutMs` 适用于它们的 CDP WebSocket 握手。
- `localLaunchTimeoutMs` 是本地启动的受管 Chrome 进程暴露其 CDP HTTP 端点的预算。`localCdpReadyTimeoutMs` 是进程被发现后等待 CDP websocket 就绪的后续预算。在 Raspberry Pi、低端 VPS 或 Chromium 启动较慢的旧硬件上，请提高这些值。值必须是大于 0 且不超过 `120000` 毫秒的正整数；无效配置值会被拒绝。
- 受管 Chrome 的重复启动/就绪失败会按配置文件进行熔断。连续多次失败后，OpenClaw 会短暂暂停新的启动尝试，而不是在每次浏览器工具调用时都启动 Chromium。请修复启动问题、如果不需要则禁用浏览器，或在修复后重启 Gateway。
- `actionTimeoutMs` 是当调用方未传递 `timeoutMs` 时，浏览器 `act` 请求的默认预算。客户端传输会增加一个小的宽限窗口，以便长等待可以完成而不是在 HTTP 边界超时。
- `tabCleanup` 用于清理主代理浏览器会话打开的标签页，属于尽力而为。子代理、cron 和 ACP 生命周期清理在会话结束时仍会关闭其显式跟踪的标签页；主会话会让活动标签页保持可复用，然后在后台关闭空闲或多余的跟踪标签页。

</Accordion>

<Accordion title="SSRF policy">

- 浏览器导航和打开标签页会在导航前受 SSRF 保护，并在最终的 `http(s)` URL 上尽最大努力再次检查。
- 在严格 SSRF 模式下，远程 CDP 端点发现和 `/json/version` 探测（`cdpUrl`）也会被检查。
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 默认关闭；仅在明确信任对私有网络的浏览器访问时启用。
- `browser.ssrfPolicy.allowPrivateNetwork` 仍作为遗留别名受支持。

</Accordion>

<Accordion title="Profile behavior">

- `attachOnly: true` 表示绝不启动本地浏览器；仅在已有运行实例时附加。
- `headless` 可以全局设置，也可以按本地托管配置文件设置。按配置文件的值会覆盖 `browser.headless`，因此一个本地启动的配置文件可以保持无头，而另一个保持可见。
- `color`（顶层和按配置文件）会为浏览器 UI 着色，让您知道当前激活的是哪个配置文件。
- 默认配置文件是 `openclaw`（托管独立模式）。使用 `defaultProfile: "user"` 可切换为已登录的用户浏览器。
- 自动检测顺序：如果系统默认浏览器基于 Chromium，则优先使用系统默认浏览器；否则按 Chrome → Brave → Edge → Chromium → Chrome Canary 的顺序。
- `driver: "existing-session"` 使用 Chrome DevTools MCP，而不是原始 CDP。不要为该驱动设置 `cdpUrl`。
- 当某个 existing-session 配置文件应附加到非默认的 Chromium 用户配置文件（Brave、Edge 等）时，设置 `browser.profiles.<name>.userDataDir`。

</Accordion>

</AccordionGroup>

## 使用 Brave 或其他基于 Chromium 的浏览器

如果您的 **系统默认** 浏览器基于 Chromium（如 Chrome/Brave/Edge），OpenClaw 会自动使用它。  
您也可以通过设置 `browser.executablePath` 来覆盖自动检测：

```bash
openclaw config set browser.executablePath "/usr/bin/google-chrome"
```

或按平台在配置中设置：

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

## 本地与远程控制

- **本地控制（默认）：** Gateway 启动 loopback 控制服务，并可以启动本地浏览器。
- **远程控制（节点宿主）：** 在拥有浏览器的机器上运行节点宿主；Gateway 会将浏览器操作代理到该节点。
- **远程 CDP：** 将 `browser.profiles.<name>.cdpUrl`（或 `browser.cdpUrl`）设置为远程基于 Chromium 的浏览器，以便附加连接。在这种情况下，OpenClaw 不会启动本地浏览器。
- `headless` 只影响 OpenClaw 启动的本地托管配置文件。它不会重启或更改 existing-session 或远程 CDP 浏览器。

停止行为因配置文件模式而异：

- 本地托管配置文件：`openclaw browser stop` 停止 OpenClaw 启动的浏览器进程
- 仅附加和远程 CDP 配置文件：`openclaw browser stop` 关闭活动控制会话并释放 Playwright/CDP 模拟覆盖（视口、
  颜色方案、区域设置、时区、离线模式及类似状态），即使 OpenClaw 未启动浏览器进程

远程 CDP URL 可以包含认证信息：

- 查询令牌（例如 `https://provider.example?token=<token>`）
- HTTP 基本认证（例如 `https://user:pass@provider.example`）

OpenClaw 会在调用 `/json/*` 端点及连接 CDP WebSocket 时保留认证信息。建议使用环境变量或密钥管理服务存储令牌，避免写入配置文件。

## 节点浏览器代理（零配置默认）

如果您在有浏览器的机器上运行 **节点宿主**，OpenClaw 可以自动将浏览器工具调用路由至该节点，无需额外浏览器配置。  
这是远程网关的默认方案。

说明：

- 节点宿主通过 **代理命令** 暴露其本地浏览器控制服务。
- 配置文件来自节点自身的 `browser.profiles` 配置（与本地相同）。
- `nodeHost.browserProxy.allowProfiles` 是可选的。留空以保留旧版/默认行为：所有配置的配置文件都可通过代理访问，包括配置文件创建/删除路由。
- 如果设置了 `nodeHost.browserProxy.allowProfiles`，OpenClaw 将其视为最小权限边界：仅允许白名单中的配置文件，并且代理表面上会阻止持久的配置文件创建/删除路由。
- 如果不需要可禁用：
  - 在节点上：`nodeHost.browserProxy.enabled=false`
  - 在网关上：`gateway.nodes.browser.mode="off"`

## Browserless（托管远程 CDP）

[Browserless](https://browserless.io) 是一项托管 Chromium 服务，通过 HTTPS 和 WebSocket 暴露 CDP 连接 URL。OpenClaw 可以使用这两种形式，但对于远程浏览器配置文件，最简单的选项是来自 Browserless 连接文档的直接 WebSocket URL。

示例：

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "browserless",
    remoteCdpTimeoutMs: 2000,
    remoteCdpHandshakeTimeoutMs: 4000,
    profiles: {
      browserless: {
        cdpUrl: "wss://production-sfo.browserless.io?token=<BROWSERLESS_API_KEY>",
        color: "#00AA00",
      },
    },
  },
}
```

备注：

- 将 `<BROWSERLESS_API_KEY>` 替换为您真实的 Browserless 令牌。
- 选择与您的 Browserless 账户匹配的区域端点（请参阅他们的文档）。
- 如果 Browserless 给您的是 HTTPS 基础 URL，您可以将其转换为 `wss://` 以进行直接 CDP 连接，或者保留 HTTPS URL 并让 OpenClaw 发现 `/json/version`。

## 直接 WebSocket CDP 提供商

一些托管浏览器服务提供 **直接 WebSocket** 端点，而不是标准的基于 HTTP 的 CDP 发现（`/json/version`）。OpenClaw 接受三种 CDP URL 形式，并会自动选择正确的连接策略：

- **HTTP(S) 发现** — `http://host[:port]` 或 `https://host[:port]`。
  OpenClaw 会调用 `/json/version` 发现 WebSocket 调试器 URL，然后再连接。没有 WebSocket 回退。
- **直接 WebSocket 端点** — `ws://host[:port]/devtools/<kind>/<id>` 或
  `wss://...`，并带有 `/devtools/browser|page|worker|shared_worker|service_worker/<id>`
  路径。OpenClaw 会通过 WebSocket 握手直接连接，并完全跳过
  `/json/version`。
- **裸 WebSocket 根路径** — `ws://host[:port]` 或 `wss://host[:port]`，且没有
  `/devtools/...` 路径（例如 [Browserless](https://browserless.io)、
  [Browserbase](https://www.browserbase.com)）。OpenClaw 会先尝试 HTTP
  `/json/version` 发现（将 scheme 规范化为 `http`/`https`）；
  如果发现返回 `webSocketDebuggerUrl`，则使用它；否则 OpenClaw 会回退到在裸根路径上直接进行 WebSocket 握手。这使得指向本地 Chrome 的裸 `ws://` 仍然可以连接，因为 Chrome 只接受来自
  `/json/version` 中针对特定目标路径的 WebSocket 升级。

### Browserbase

[Browserbase](https://www.browserbase.com) 是一个云平台，提供无头浏览器运行，内置验证码解决、隐身模式和住宅代理。

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "browserbase",
    remoteCdpTimeoutMs: 3000,
    remoteCdpHandshakeTimeoutMs: 5000,
    profiles: {
      browserbase: {
        cdpUrl: "wss://connect.browserbase.com?apiKey=<BROWSERBASE_API_KEY>",
        color: "#F97316",
      },
    },
  },
}
```

说明：

- [注册账户](https://www.browserbase.com/sign-up) 并从 [概览面板](https://www.browserbase.com/overview) 复制您的 **API Key**。
- 将 `<BROWSERBASE_API_KEY>` 替换为真实的 Browserbase API 密钥。
- Browserbase 在 WebSocket 连接时自动创建浏览器会话，无需手动管理会话步骤。
- 免费套餐允许一个并发会话和每月一小时浏览器使用时间。付费计划详情见 [价格说明](https://www.browserbase.com/pricing)。
- 详见 [Browserbase 文档](https://docs.browserbase.com) 获取完整 API 参考、SDK 指南和集成示例。

## 安全性

关键点：

- 浏览器控制仅限环回接口；访问流经过网关的认证或节点配对。
- 独立的环回浏览器 HTTP API 仅使用**共享密钥认证**：
  网关令牌持有者认证、`x-openclaw-password`，或使用配置的网关密码进行 HTTP 基本认证。
- Tailscale Serve 身份标头和 `gateway.auth.mode: "trusted-proxy"` **不会**认证此独立的环回浏览器 API。
- 如果启用了浏览器控制且未配置共享密钥认证，OpenClaw 会在启动时自动生成 `gateway.auth.token` 并将其持久化到配置中。
- 当 `gateway.auth.mode` 已经是 `password`、`none` 或 `trusted-proxy` 时，OpenClaw **不会**自动生成该令牌。
- 将网关和任何节点宿主保持在私有网络（Tailscale）上；避免公开暴露。
- 将远程 CDP URL/令牌视为秘密；优先使用环境变量或密钥管理器。

远程 CDP 建议：

- 优先使用加密协议（HTTPS 或 WSS）以及短期令牌。
- 避免在配置文件中硬编码长期有效令牌。

## 配置文件（多浏览器）

OpenClaw 支持多个命名配置文件（路由配置文件）。配置文件类型包括：

- **openclaw-managed**：一个独立的 Chromium 浏览器实例，拥有自己的用户数据目录和 CDP 端口
- **remote**：一个显式的 CDP URL（远程运行的 Chromium 浏览器）
- **Existing session**：通过 Chrome DevTools MCP 自动连接到你现有的 Chrome 配置文件

默认值：

- 如果缺失，`openclaw` 配置文件会自动创建。
- 内置的 `user` 配置文件用于附加到现有的 Chrome MCP 会话。
- 除了 `user` 之外的 existing-session 配置文件必须使用 `--driver existing-session` 显式创建。
- 本地 CDP 端口从默认范围 **18800–18899** 中分配。
- 删除配置文件会将对应的本地数据目录移动到废纸篓。

所有控制端点都支持 `?profile=<name>`，CLI 使用 `--browser-profile`。

## 通过 Chrome DevTools MCP 使用现有会话

OpenClaw 也可以通过官方 Chrome DevTools MCP 服务器附加到正在运行的 Chromium 浏览器配置文件。  
这会复用该浏览器配置文件中已经打开的标签页和登录状态。

官方背景和设置参考：

- [Chrome for Developers: Debug your browser session with Chrome DevTools MCP](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [Chrome DevTools MCP README](https://github.com/ChromeDevTools/chrome-devtools-mcp)

内置配置：

- `user`

可选：如果你想要不同的名称、颜色或浏览器数据目录，可以创建你自己的自定义 existing-session 配置文件。

默认行为：

- 内置的 `user` 配置使用 Chrome MCP 自动连接到默认的本地 Google Chrome 配置文件。

对于 Brave、Edge、Chromium 或非默认的 Chrome 配置文件，请设置 `userDataDir`：

```json5
{
  browser: {
    profiles: {
      brave: {
        driver: "existing-session",
        attachOnly: true,
        userDataDir: "~/Library/Application Support/BraveSoftware/Brave-Browser",
        color: "#FB542B",
      },
    },
  },
}
```

然后在相应的浏览器中：

1. 打开该浏览器的远程调试检查页面。
2. 启用远程调试。
3. 保持浏览器运行，并在 OpenClaw 附加时接受连接提示。

常见检查页面：

- Chrome：`chrome://inspect/#remote-debugging`
- Brave：`brave://inspect/#remote-debugging`
- Edge：`edge://inspect/#remote-debugging`

实时附加测试：

```bash
openclaw browser --browser-profile user start
openclaw browser --browser-profile user status
openclaw browser --browser-profile user tabs
openclaw browser --browser-profile user snapshot --format ai
```

成功行为：

- `status` 显示 `driver: existing-session`
- `status` 显示 `transport: chrome-mcp`
- `status` 显示 `running: true`
- `tabs` 列出你已经打开的浏览器标签页
- `snapshot` 返回对所选活动标签页的引用

附加失败的故障排查：

- 目标 Chromium 浏览器版本为 `144+`
- 该浏览器的检查页面已启用远程调试
- 浏览器提示已出现，并且已接受附加确认
- `openclaw doctor` 会迁移旧版扩展浏览器配置，并检查默认自动连接配置是否已在本地安装 Chrome，但它无法替你在浏览器侧启用远程调试

代理使用：

- 当你需要用户已登录的浏览器状态时，使用 `profile="user"`。
- 如果你使用自定义的 existing-session 配置，请传递该特定配置名称。
- 仅在用户在场并批准提示时选择此模式。
- 网关或节点宿主可以运行 `npx chrome-devtools-mcp@latest --autoConnect`。

注意：

- 与受管的 `openclaw` 配置文件相比，此路径风险更高，因为它可以
  在你已登录的浏览器会话中执行操作。
- OpenClaw 在此驱动中不会启动浏览器；它只会附加连接。
- OpenClaw 在这里使用官方 Chrome DevTools MCP 的 `--autoConnect` 流程。如果
  设置了 `userDataDir`，它会透传以定位到该用户数据目录。
- existing-session 可以在选定主机上附加，也可以通过已连接的
  浏览器节点附加。如果 Chrome 位于其他地方且没有连接浏览器节点，请改用
  远程 CDP 或节点宿主。

<Accordion title="Existing-session 功能限制">

与受管的 `openclaw` 配置文件相比，existing-session 驱动的约束更多：

- **截图** — 页面捕获和 `--ref` 元素捕获可用；CSS `--element` 选择器不可用。`--full-page` 不能与 `--ref` 或 `--element` 组合。页面或基于 ref 的元素截图不需要 Playwright。
- **操作** — `click`、`type`、`hover`、`scrollIntoView`、`drag` 和 `select` 需要 snapshot refs（不能使用 CSS 选择器）。`click` 仅支持鼠标左键。`type` 不支持 `slowly=true`；请使用 `fill` 或 `press`。`press` 不支持 `delayMs`。`type`、`hover`、`scrollIntoView`、`drag`、`select`、`fill` 和 `evaluate` 不支持单次调用超时。`select` 接受单个值。
- **等待 / 上传 / 对话框** — `wait --url` 支持精确、子字符串和 glob 模式；不支持 `wait --load networkidle`。上传钩子需要 `ref` 或 `inputRef`，一次一个文件，不支持 CSS `element`。对话框钩子不支持超时覆盖。
- **仅受管功能** — 批量操作、PDF 导出、下载拦截和 `responsebody` 仍然需要受管浏览器路径。

</Accordion>

## 隔离保证

- **专用用户数据目录**：绝不会触碰你的个人浏览器配置文件。
- **专用端口**：避免使用 `9222`，以防与开发工作流冲突。
- **确定性的标签页控制**：`tabs` 先返回 `suggestedTargetId`，然后
  返回稳定的 `tabId` 句柄，如 `t1`、可选标签，以及原始 `targetId`。
  代理应复用 `suggestedTargetId`；原始 id 仍可用于
  调试和兼容性。

## 浏览器选择

在本地启动时，OpenClaw 会按顺序尝试第一个可用的浏览器：

1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

你可以通过 `browser.executablePath` 手动覆盖。

平台支持：

- macOS：检查 `/Applications` 和 `~/Applications`。
- Linux：查找 `google-chrome`、`brave`、`microsoft-edge`、`chromium` 等可执行文件。
- Windows：检查常见安装路径。

## 控制 API（可选）

为了脚本编写和调试，网关提供一个小型的**仅限环回** HTTP
控制 API，以及一个匹配的 `openclaw browser` CLI（截图、refs、等待
增强、JSON 输出、调试工作流）。完整参考请见
[浏览器控制 API](/tools/browser-control)。

## 故障排查

针对 Linux 特有问题（尤其 snap 安装的 Chromium），请参见  
[浏览器故障排查](/tools/browser-linux-troubleshooting)。

针对 WSL2 网关 + Windows Chrome 跨主机部署问题，请参见  
[WSL2 + Windows + 远程 Chrome CDP 故障排查](/tools/browser-wsl2-windows-remote-cdp-troubleshooting)。

### CDP 启动失败 vs 导航 SSRF 阻断

这两者属于不同的故障类型，并对应不同的代码路径。

- **CDP 启动或就绪失败**：表示 OpenClaw 无法确认浏览器控制平面是健康的。
- **导航 SSRF 阻断**：表示浏览器控制平面是健康的，但页面导航目标因策略被拒绝。

常见示例：

- CDP 启动或就绪失败：
  - `Chrome CDP websocket for profile "openclaw" is not reachable after start`
  - `Remote CDP for profile "<name>" is not reachable at <cdpUrl>`
- 导航 SSRF 阻断：
  - `open`、`navigate`、snapshot 或打开标签页流程会因浏览器/网络策略错误而失败，但 `start` 和 `tabs` 仍可正常工作

使用下面这个最小序列来区分两者：

```bash
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

如何解读结果：

- 如果 `start` 失败并提示 `not reachable after start`，请先排查 CDP 就绪问题。
- 如果 `start` 成功但 `tabs` 失败，说明控制平面仍不健康。应将其视为 CDP 可达性问题，而不是页面导航问题。
- 如果 `start` 和 `tabs` 都成功但 `open` 或 `navigate` 失败，说明浏览器控制平面已启动，失败出在导航策略或目标页面。
- 如果 `start`、`tabs` 和 `open` 全部成功，则基础的受管浏览器控制路径是健康的。

重要行为细节：

- 即使您未配置 `browser.ssrfPolicy`，浏览器配置默认也会是一个“失败即关闭（fail-closed）”的 SSRF 策略对象。
- 对于本地回环 `openclaw` 受管配置文件，CDP 健康检查会有意跳过对 OpenClaw 自身本地控制平面的浏览器 SSRF 可达性强制。
- 导航保护是独立的。成功的 `start` 或 `tabs` 并不意味着后续 `open` 或 `navigate` 目标会被允许。

安全建议：

- **不要**默认放宽浏览器 SSRF 策略。
- 相比于广泛的私有网络访问，优先使用更窄的主机例外，例如 `hostnameAllowlist` 或 `allowedHostnames`。
- 仅在经过有意信任的环境中（并且私有网络浏览器访问是必须且已评审的情况下）才使用 `dangerouslyAllowPrivateNetwork: true`。

## 代理工具 + 控制工作方式

代理会获得 **一个工具** 用于浏览器自动化：

- `browser` — doctor/status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

映射说明：

- `browser snapshot` 返回一个稳定的 UI 树（AI 或 ARIA）。
- `browser act` 使用 snapshot 的 `ref` ID 来 click/type/drag/select。
- `browser screenshot` 捕获像素（整页、元素或带标签的 refs）。
- `browser doctor` 检查网关、插件、配置文件、浏览器和标签页的就绪状态。
- `browser` 接受：
  - `profile` 用于选择命名浏览器配置文件（openclaw、chrome 或远程 CDP）。
  - `target`（`sandbox` | `host` | `node`）用于选择浏览器所在位置。
  - 在沙盒会话中，`target: "host"` 需要 `agents.defaults.sandbox.browser.allowHostControl=true`。
  - 如果省略 `target`：沙盒会话默认使用 `sandbox`，非沙盒会话默认使用 `host`。
  - 如果已连接支持浏览器的节点，除非你固定 `target="host"` 或 `target="node"`，否则该工具可能会自动路由到该节点。

这使代理保持确定性，并避免脆弱的选择器。

## 相关

- [工具概览](/tools) — 所有可用的代理工具
- [沙盒化](/gateway/sandboxing) — 沙盒环境中的浏览器控制
- [安全性](/gateway/security) — 浏览器控制风险与加固
