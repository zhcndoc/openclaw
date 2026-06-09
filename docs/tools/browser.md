---
summary: "集成的浏览器控制服务 + 动作命令"
read_when:
  - 添加由代理控制的浏览器自动化
  - 排查 openclaw 为何干扰你自己的 Chrome
  - 在 macOS 应用中实现浏览器设置 + 生命周期
title: "浏览器（OpenClaw 管理）"
---

OpenClaw 可以运行一个由代理控制的**专用 Chrome/Brave/Edge/Chromium 配置文件**。
它与你的个人浏览器相互隔离，并通过 Gateway 内部的一个小型本地控制服务进行管理（仅限 loopback）。

入门视角：

- 把它看作一个**独立的、仅供代理使用的浏览器**。
- `openclaw` 配置文件**不会**影响你的个人浏览器配置文件。
- 代理可以在安全通道中**打开标签页、读取页面、点击和输入**。
- 内置的 `user` 配置文件通过 Chrome MCP 附加到你真实已登录的 Chrome 会话。

## 你将获得什么

- 一个名为 **openclaw** 的独立浏览器配置文件（默认橙色强调色）。
- 确定性的标签页控制（列出/打开/聚焦/关闭）。
- 代理动作（点击/输入/拖拽/选择）、快照、截图、PDF。
- 一个随附的 `browser-automation` 技能，教导代理在启用浏览器插件时使用快照、
  稳定标签页、失效引用和手动阻塞恢复循环。
- 可选的多配置文件支持（`openclaw`、`work`、`remote`、...）。

这个浏览器**不是**你的日常主力浏览器。它是一个安全、隔离的表面，供
代理自动化和验证使用。

## 快速开始

```bash
openclaw browser --browser-profile openclaw doctor
openclaw browser --browser-profile openclaw doctor --deep
openclaw browser --browser-profile openclaw status
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

如果你看到 "Browser disabled"，请在配置中启用它（见下文）并重启
Gateway。

如果 `openclaw browser` 完全缺失，或者代理提示浏览器工具不可用，请跳到 [缺少 browser 命令或工具](/tools/browser#missing-browser-command-or-tool)。

## 插件控制

默认的 `browser` 工具是一个内置插件。可将其禁用，以替换为另一个注册相同 `browser` 工具名称的插件：

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

默认配置需要同时设置 `plugins.entries.browser.enabled` **以及** `browser.enabled=true`。仅禁用插件会将 `openclaw browser` CLI、`browser.request` 网关方法、代理工具和控制服务作为一个整体移除；你的 `browser.*` 配置会保持不变，以便替换使用。

浏览器配置更改需要重启 Gateway，以便插件重新注册其服务。

## 代理指南

工具配置文件说明：`tools.profile: "coding"` 包含 `web_search` 和
`web_fetch`，但不包含完整的 `browser` 工具。如果代理或
派生的子代理应使用浏览器自动化，请在配置文件阶段添加 browser：

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

对于单个代理，请使用 `agents.list[].tools.alsoAllow: ["browser"]`。
仅有 `tools.subagents.tools.allow: ["browser"]` 不够，因为子代理
策略是在配置文件过滤之后应用的。

浏览器插件提供两级代理指导：

- `browser` 工具描述包含简洁的常驻契约：选择正确的配置文件、让引用保持在同一标签页中、使用 `tabId`/标签进行标签页定位，并为多步骤工作加载浏览器技能。
- 随附的 `browser-automation` 技能包含更长的操作循环：
  先检查状态/标签页、为任务标签页加标签、操作前先快照、UI 更改后重新快照、失效引用仅恢复一次，并将登录/2FA/captcha 或摄像头/麦克风阻塞报告为手动操作，而不是猜测。

插件附带的技能会在插件启用时列在代理可用技能中。完整技能说明按需加载，因此常规轮次不会承担完整的 token 成本。

## 缺少 browser 命令或工具

如果升级后 `openclaw browser` 变成未知命令、`browser.request` 缺失，或者代理报告浏览器工具不可用，通常原因是 `plugins.allow` 列表中未包含 `browser`，且不存在根级 `browser` 配置块。请添加它：

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

显式的根级 `browser` 块，例如 `browser.enabled=true` 或 `browser.profiles.<name>`，会在受限的 `plugins.allow` 下也激活内置浏览器插件，这与通道配置行为一致。`plugins.entries.browser.enabled=true` 和 `tools.alsoAllow: ["browser"]` 本身不能替代 allowlist 成员资格。完全移除 `plugins.allow` 也会恢复默认行为。

## 配置文件：`openclaw` vs `user`

- `openclaw`：受管理、隔离的浏览器（无需扩展）。
- `user`：内置的 Chrome MCP 附加配置文件，用于你的**真实已登录 Chrome**
  会话。

对于代理浏览器工具调用：

- 默认：使用隔离的 `openclaw` 浏览器。
- 当现有登录会话很重要，且用户在电脑前可以点击/批准任何附加提示时，优先使用 `profile="user"`。
- `profile` 是你想要特定浏览器模式时的显式覆盖项。

如果你希望默认使用受管理模式，请设置 `browser.defaultProfile: "openclaw"`。

## 配置

浏览器设置位于 `~/.openclaw/openclaw.json`。

```json5
{
  browser: {
    enabled: true, // 默认：true
    ssrfPolicy: {
      // dangerouslyAllowPrivateNetwork: true, // 仅在受信任的私有网络访问场景中启用
      // allowPrivateNetwork: true, // 旧别名
      // hostnameAllowlist: ["*.example.com", "example.com"],
      // allowedHostnames: ["localhost"],
    },
    // cdpUrl: "http://127.0.0.1:18792", // 旧的单配置文件覆盖项
    remoteCdpTimeoutMs: 1500, // 远程 CDP HTTP 超时（ms）
    remoteCdpHandshakeTimeoutMs: 3000, // 远程 CDP WebSocket 握手超时（ms）
    localLaunchTimeoutMs: 15000, // 本地受管理 Chrome 发现超时（ms）
    localCdpReadyTimeoutMs: 8000, // 本地受管理启动后 CDP 就绪超时（ms）
    actionTimeoutMs: 60000, // 默认浏览器 act 超时（ms）
    tabCleanup: {
      enabled: true, // 默认：true
      idleMinutes: 120, // 设为 0 可禁用空闲清理
      maxTabsPerSession: 8, // 设为 0 可禁用每会话上限
      sweepMinutes: 5,
    },
    defaultProfile: "openclaw",
    color: "#FF4500",
    headless: false,
    noSandbox: false,
    attachOnly: false,
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: {
        cdpPort: 18801,
        color: "#0066CC",
        headless: true,
        executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      },
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

### 截图视觉能力（仅文本模型支持）

当主模型是纯文本模型（不具备视觉/多模态支持）时，浏览器
截图会返回模型无法读取的图像块。浏览器截图会复用现有的图像理解配置，
因此为媒体理解配置的图像模型可以将截图描述为文本，而无需任何
浏览器专用模型设置。

```json5
{
  tools: {
    media: {
      image: {
        models: [
          { provider: "bytedance", model: "doubao-seed-2.0-pro" },
          // 添加回退候选；首个成功者生效
          { provider: "openai", model: "gpt-4o" },
        ],
      },
      // 当共享媒体模型带有图像支持标记时也可使用。
      // models: [{ provider: "openai", model: "gpt-4o", capabilities: ["image"] }],
    },
  },
  agents: {
    defaults: {
      // 现有的图像模型默认值也会被接受。
      // imageModel: { primary: "openai/gpt-4o" },
    },
  },
}
```

**工作方式：**

1. 代理调用 `browser screenshot` → 像往常一样将图像捕获到磁盘。
2. 浏览器工具询问现有的图像理解运行时，它是否可以使用已配置的媒体图像模型、共享媒体模型、图像模型默认值或带认证的图像提供方来描述该截图。
3. 视觉模型返回文本描述，该描述会被 `wrapExternalContent`（提示注入防护）包装后，以文本块而非图像块的形式返回给代理。
4. 如果图像理解不可用、被跳过或失败，浏览器会回退为返回原始图像块。

请使用现有的 `tools.media.image` / `tools.media.models` 字段来配置模型
回退、超时、字节限制、配置文件和提供方请求设置。

如果当前主模型已经支持视觉，并且没有显式配置图像理解模型，OpenClaw 会保留正常的图像结果，以便主模型可以直接读取截图。

<AccordionGroup>

<Accordion title="端口与可达性">

- 控制服务绑定到 loopback 上一个由 `gateway.port` 派生的端口（默认 `18791` = gateway + 2）。覆盖 `gateway.port` 或 `OPENCLAW_GATEWAY_PORT` 会在同一族中改变派生端口。
- 本地 `openclaw` 配置文件会自动分配 `cdpPort`/`cdpUrl`；只有在远程 CDP 时才设置这些值。未设置时，`cdpUrl` 默认为受管理的本地 CDP 端口。
- `remoteCdpTimeoutMs` 适用于远程和 `attachOnly` CDP HTTP 可达性
  检查以及打开标签页的 HTTP 请求；`remoteCdpHandshakeTimeoutMs` 适用于
  它们的 CDP WebSocket 握手。
- `localLaunchTimeoutMs` 是本地启动的受管理 Chrome 进程暴露其 CDP HTTP 端点的预算时间。`localCdpReadyTimeoutMs` 是在进程被发现后，
  CDP websocket 就绪的后续预算时间。
  在 Raspberry Pi、低端 VPS 或 Chromium 启动较慢的旧硬件上，请提高这些值。数值必须是正整数，最大为 `120000` ms；无效
  的配置值会被拒绝。
- 受管理 Chrome 的重复启动/就绪失败会按
  配置文件触发熔断。连续多次失败后，OpenClaw 会短暂暂停新的启动
  尝试，而不是在每次浏览器工具调用时都生成 Chromium。请修复
  启动问题、如果不需要则禁用浏览器，或在修复后重启
  Gateway。
- 当调用方未传入 `timeoutMs` 时，`actionTimeoutMs` 是浏览器 `act` 请求的默认预算。客户端传输会增加一个小的缓冲窗口，以便长时间等待可以完成，而不会在 HTTP 边界超时。
- `tabCleanup` 是针对由主代理浏览器会话打开的标签页的尽力清理。子代理、cron 和 ACP 生命周期清理仍会在会话结束时关闭它们显式跟踪的标签页；主会话会保留活动标签页以便复用，然后在后台关闭空闲或超出数量的跟踪标签页。

</Accordion>

<Accordion title="SSRF 策略">

- 浏览器导航和打开标签页会在导航前进行 SSRF 保护，并在最终 `http(s)` URL 上尽力重新检查。
- 在严格 SSRF 模式下，远程 CDP 端点发现和 `/json/version` 探测（`cdpUrl`）也会被检查。
- Gateway/provider 的 `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY` 和 `NO_PROXY` 环境变量不会自动代理 OpenClaw 管理的浏览器。受管理的 Chrome 默认直接启动，因此提供方代理设置不会削弱浏览器的 SSRF 检查。
- OpenClaw 管理的本地 CDP 就绪探测和 DevTools WebSocket 连接会绕过受管理网络代理，直接针对已启动的 loopback 端点，因此当运维代理阻止 loopback 出站时，`openclaw browser start` 仍可工作。
- 若要代理受管理浏览器本身，请通过 `browser.extraArgs` 传入显式的 Chrome 代理标志，例如 `--proxy-server=...` 或 `--proxy-pac-url=...`。严格 SSRF 模式会阻止显式浏览器代理路由，除非已有意启用私有网络浏览器访问。
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 默认关闭；仅在明确信任私有网络浏览器访问时启用。
- `browser.ssrfPolicy.allowPrivateNetwork` 仍作为旧别名受支持。

</Accordion>

<Accordion title="配置文件行为">

- `attachOnly: true` 表示永不启动本地浏览器；仅在已有浏览器正在运行时附加。
- `headless` 可以在全局或每个本地受管理配置文件上设置。每个配置文件的值会覆盖 `browser.headless`，因此一个本地启动的配置文件可以保持无头，而另一个保持可见。
- `POST /start?headless=true` 和 `openclaw browser start --headless` 会为本地受管理配置文件请求一次性的无头启动，而不会重写 `browser.headless` 或配置文件配置。现有会话、仅附加以及远程 CDP 配置文件会拒绝该覆盖，因为 OpenClaw 不会启动这些浏览器进程。
- 在没有 `DISPLAY` 或 `WAYLAND_DISPLAY` 的 Linux 主机上，当环境或全局/配置文件配置都未显式选择有头模式时，本地受管理配置文件会自动默认无头。`openclaw browser status --json`
  会将 `headlessSource` 报告为 `env`、`profile`、`config`、
  `request`、`linux-display-fallback` 或 `default`。
- `OPENCLAW_BROWSER_HEADLESS=1` 会强制当前进程的本地受管理启动为无头模式。`OPENCLAW_BROWSER_HEADLESS=0` 会强制普通启动为有头模式，并在没有显示服务器的 Linux 主机上返回可操作的错误；显式的 `start --headless` 请求仍会在该次启动中优先生效。
- `executablePath` 可以在全局或每个本地受管理配置文件上设置。每个配置文件的值会覆盖 `browser.executablePath`，因此不同的受管理配置文件可以启动不同的基于 Chromium 的浏览器。两种形式都接受 `~` 作为你的操作系统主目录。
- `color`（顶层和每个配置文件）会给浏览器 UI 着色，以便你看出当前活动的是哪个配置文件。
- 默认配置文件是 `openclaw`（受管理的独立模式）。使用 `defaultProfile: "user"` 可切换到已登录的用户浏览器。
- 自动检测顺序：如果系统默认浏览器基于 Chromium，则优先使用；否则依次为 Chrome → Brave → Edge → Chromium → Chrome Canary。
- `driver: "existing-session"` 使用 Chrome DevTools MCP，而不是原始 CDP。不要为该驱动设置 `cdpUrl`。
- 当现有会话配置文件需要附加到非默认的 Chromium 用户配置文件（Brave、Edge 等）时，请设置 `browser.profiles.<name>.userDataDir`。此路径同样接受 `~` 作为你的操作系统主目录。

</Accordion>

</AccordionGroup>

## 使用 Brave 或其他基于 Chromium 的浏览器

如果你的 **系统默认** 浏览器是基于 Chromium 的（Chrome/Brave/Edge 等），
OpenClaw 会自动使用它。设置 `browser.executablePath` 可覆盖自动检测。
顶层和按配置文件的 `executablePath` 值都支持使用 `~`
表示你的操作系统主目录：

```bash
openclaw config set browser.executablePath "/usr/bin/google-chrome"
openclaw config set browser.profiles.work.executablePath "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
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

按配置文件的 `executablePath` 只会影响 OpenClaw
启动的本地托管配置文件。`existing-session` 配置文件会改为附加到
已经运行的浏览器，而远程 CDP 配置文件则使用 `cdpUrl` 后面的浏览器。

## 本地控制 vs 远程控制

- **本地控制（默认）：** Gateway 启动回环控制服务，并且可以启动本地浏览器。
- **远程控制（node host）：** 在拥有浏览器的机器上运行 node host；Gateway 将浏览器操作代理到它。
- **远程 CDP：** 设置 `browser.profiles.<name>.cdpUrl`（或 `browser.cdpUrl`）以
  附加到远程基于 Chromium 的浏览器。在这种情况下，OpenClaw 不会启动本地浏览器。
- 对于在回环上外部托管的 CDP 服务（例如在 Docker 中发布到 `127.0.0.1` 的 Browserless），也要设置 `attachOnly: true`。没有 `attachOnly` 的回环 CDP 会被视为本地的、由 OpenClaw 管理的浏览器配置文件。
- `headless` 只影响 OpenClaw 启动的本地托管配置文件。它不会重启或更改 existing-session 或远程 CDP 浏览器。
- `executablePath` 遵循相同的本地托管配置文件规则。对正在运行的本地托管配置文件更改它，会将该配置文件标记为需要重启/协调，以便
  下一次启动使用新的二进制文件。

停止行为会因配置文件模式而不同：

- 本地托管配置文件：`openclaw browser stop` 会停止 OpenClaw 启动的浏览器进程
- 仅附加和远程 CDP 配置文件：`openclaw browser stop` 会关闭当前
  控制会话，并释放 Playwright/CDP 模拟覆盖（视口、
  颜色方案、语言区域、时区、离线模式及类似状态），即使该浏览器进程并不是由 OpenClaw 启动的

远程 CDP URL 可以包含认证信息：

- 查询令牌（例如 `https://provider.example?token=<token>`）
- HTTP Basic 认证（例如 `https://user:pass@provider.example`）

OpenClaw 在调用 `/json/*` 端点以及连接
CDP WebSocket 时都会保留认证信息。请优先使用环境变量或 secrets manager
来管理令牌，而不是将其提交到配置文件中。

## Node 浏览器代理（零配置默认）

如果你在拥有浏览器的机器上运行 **node host**，OpenClaw 可以
自动将浏览器工具调用路由到该节点，而无需任何额外的浏览器配置。
这是远程 Gateway 的默认路径。

说明：

- node host 通过一个 **代理命令** 暴露其本地浏览器控制服务。
- 配置文件来自 node 自身的 `browser.profiles` 配置（与本地相同）。
- `nodeHost.browserProxy.allowProfiles` 是可选项。留空以保持旧版/默认行为：所有已配置的配置文件都可通过代理访问，包括配置文件创建/删除路由。
- 如果你设置了 `nodeHost.browserProxy.allowProfiles`，OpenClaw 会将其视为最小权限边界：只有白名单中的配置文件可被目标化，且持久化的配置文件创建/删除路由会在代理表面被阻止。
- 如果你不想要它，请禁用：
  - 在 node 上：`nodeHost.browserProxy.enabled=false`
  - 在 gateway 上：`gateway.nodes.browser.mode="off"`

## Browserless（托管远程 CDP）

[Browserless](https://browserless.io) 是一个托管的 Chromium 服务，通过 HTTPS 和 WebSocket 暴露
CDP 连接 URL。OpenClaw 可以使用任一种形式，但
对于远程浏览器配置文件，最简单的选项是直接使用 Browserless 连接文档中的
WebSocket URL。

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

说明：

- 将 `<BROWSERLESS_API_KEY>` 替换为你真实的 Browserless 令牌。
- 选择与你的 Browserless 账户匹配的区域端点（参见其文档）。
- 如果 Browserless 提供的是 HTTPS 基础 URL，你可以将其转换为
  `wss://` 以进行直接 CDP 连接，或者保留 HTTPS URL 并让 OpenClaw
  发现 `/json/version`。

### 同一主机上的 Browserless Docker

当 Browserless 由 Docker 自托管且 OpenClaw 运行在主机上时，将
Browserless 视为外部托管的 CDP 服务：

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "browserless",
    profiles: {
      browserless: {
        cdpUrl: "ws://127.0.0.1:3000",
        attachOnly: true,
        color: "#00AA00",
      },
    },
  },
}
```

`browser.profiles.browserless.cdpUrl` 中的地址必须能够从
OpenClaw 进程访问。Browserless 也必须声明一个可访问的匹配端点；
将 Browserless 的 `EXTERNAL` 设置为与 OpenClaw 可访问的相同 WebSocket 基础地址，例如
`ws://127.0.0.1:3000`、`ws://browserless:3000`，或稳定的私有 Docker
网络地址。如果 `/json/version` 返回的 `webSocketDebuggerUrl` 指向一个
OpenClaw 无法访问的地址，那么 CDP 的 HTTP 部分看起来可能正常，而 WebSocket
附加仍然会失败。

对于回环上的 Browserless 配置文件，不要让 `attachOnly` 处于未设置状态。没有
`attachOnly` 时，OpenClaw 会将回环端口视为本地托管浏览器
配置文件，并可能报告该端口正在使用但并非由 OpenClaw 拥有。

## 直接 WebSocket CDP 提供商

某些托管浏览器服务暴露的是 **直接 WebSocket** 端点，而不是
标准的基于 HTTP 的 CDP 发现方式（`/json/version`）。OpenClaw 接受三种
CDP URL 形式，并会自动选择正确的连接策略：

- **HTTP(S) 发现** - `http://host[:port]` 或 `https://host[:port]`。
  OpenClaw 调用 `/json/version` 以发现 WebSocket 调试器 URL，然后
  连接。无 WebSocket 回退。
- **直接 WebSocket 端点** - `ws://host[:port]/devtools/<kind>/<id>` 或
  `wss://...`，路径为 `/devtools/browser|page|worker|shared_worker|service_worker/<id>`。
  OpenClaw 通过 WebSocket 握手直接连接，并完全跳过
  `/json/version`。
- **裸 WebSocket 根路径** - `ws://host[:port]` 或 `wss://host[:port]`，没有
  `/devtools/...` 路径（例如 [Browserless](https://browserless.io)，
  [Browserbase](https://www.browserbase.com)）。OpenClaw 会先尝试 HTTP
  `/json/version` 发现（将 scheme 规范化为 `http`/`https`）；
  如果发现返回了 `webSocketDebuggerUrl`，则使用它，否则 OpenClaw
  会回退到在裸根路径上的直接 WebSocket 握手。如果广告的
  WebSocket 端点拒绝了 CDP 握手，但配置的裸根路径
  接受了它，OpenClaw 也会回退到该根路径。这使得指向本地 Chrome 的裸 `ws://`
  仍然可以连接，因为 Chrome 只接受来自 `/json/version` 的特定目标路径上的 WebSocket
  升级，而托管提供商仍然可以在其发现端点广告一个不适合 Playwright CDP 的短期 URL 时，
  使用其根 WebSocket 端点。

`openclaw browser doctor` 使用与运行时附加相同的先发现、后 WebSocket 回退
逻辑，因此能够成功连接的裸根 URL 不会在诊断中被报告为不可达。

### Browserbase

[Browserbase](https://www.browserbase.com) 是一个用于运行
无头浏览器的云平台，内置 CAPTCHA 解决、隐身模式和住宅代理。

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

- [注册](https://www.browserbase.com/sign-up)并从 [概览仪表板](https://www.browserbase.com/overview) 中复制你的 **API Key**。
- 将 `<BROWSERBASE_API_KEY>` 替换为你真实的 Browserbase API key。
- Browserbase 会在 WebSocket 连接时自动创建浏览器会话，因此无需
  手动创建会话步骤。
- 免费层允许一个并发会话和每月一个浏览器小时。
  付费计划限制请参见 [定价](https://www.browserbase.com/pricing)。
- 请参阅 [Browserbase 文档](https://docs.browserbase.com) 获取完整的 API
  参考、SDK 指南和集成示例。

### Notte

[Notte](https://www.notte.cc) 是一个用于运行无头浏览器的云平台，
内置隐身、住宅代理和一个原生 CDP 的 WebSocket 网关。

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "notte",
    remoteCdpTimeoutMs: 3000,
    remoteCdpHandshakeTimeoutMs: 5000,
    profiles: {
      notte: {
        cdpUrl: "wss://us-prod.notte.cc/sessions/connect?token=<NOTTE_API_KEY>",
        color: "#7C3AED",
      },
    },
  },
}
```

说明：

- [注册](https://console.notte.cc)并从控制台设置页面复制你的 **API Key**。
- 将 `<NOTTE_API_KEY>` 替换为你真实的 Notte API key。
- Notte 会在 WebSocket 连接时自动创建浏览器会话，因此不需要手动创建会话步骤。WebSocket 断开连接时，会话会被销毁。
- 免费层允许五个并发会话和 100 个浏览器小时。付费计划限制请参见 [定价](https://www.notte.cc/#pricing)。
- 请参阅 [Notte 文档](https://docs.notte.cc) 获取完整的 API 参考、SDK 指南和集成示例。

## Security

核心要点：

- 浏览器控制仅限回环；访问通过 Gateway 的认证或节点配对进行。
- 独立的回环浏览器 HTTP API 仅使用 **共享密钥认证**：
  gateway token bearer auth、`x-openclaw-password`，或使用
  配置的 gateway 密码进行 HTTP Basic auth。
- Tailscale Serve 身份头和 `gateway.auth.mode: "trusted-proxy"` 不会对
  这个独立的回环浏览器 API 进行认证。
- 如果已启用浏览器控制但未配置共享密钥认证，OpenClaw
  会为该次启动生成一个仅运行时可用的 gateway token。如果客户端需要在
  重启之间保持稳定的密钥，请显式配置
  `gateway.auth.token`、`gateway.auth.password`、`OPENCLAW_GATEWAY_TOKEN` 或
  `OPENCLAW_GATEWAY_PASSWORD`。
- 当 `gateway.auth.mode` 已经是 `password`、`none` 或 `trusted-proxy` 时，
  OpenClaw 不会自动生成该 token。
- 将 Gateway 和任何节点主机放在私有网络（Tailscale）上；避免公开暴露。
- 将远程 CDP URL/令牌视为密钥；优先使用环境变量或密钥管理器。

远程 CDP 提示：

- 尽可能优先使用加密端点（HTTPS 或 WSS）和短期令牌。
- 避免将长期有效的令牌直接嵌入配置文件。

## 配置文件（多浏览器）

OpenClaw 支持多个命名配置文件（路由配置）。配置文件可以是：

- **openclaw-managed**：一个专用的基于 Chromium 的浏览器实例，拥有自己的用户数据目录 + CDP 端口
- **remote**：一个显式的 CDP URL（在其他地方运行的基于 Chromium 的浏览器）
- **existing session**：通过 Chrome DevTools MCP 自动连接使用你现有的 Chrome 配置文件

默认值：

- 如果缺失，会自动创建 `openclaw` 配置文件。
- `user` 配置文件是内置的，用于 Chrome MCP 现有会话附加。
- 除了 `user` 外，现有会话配置文件均为可选；使用 `--driver existing-session` 创建它们。
- 本地 CDP 端口默认从 **18800-18899** 分配。
- 删除配置文件会将其本地数据目录移动到废纸篓。

所有控制端点都接受 `?profile=<name>`；CLI 使用 `--browser-profile`。

## 通过 Chrome DevTools MCP 使用现有会话

OpenClaw 也可以通过官方的 Chrome DevTools MCP 服务器连接到正在运行的基于 Chromium 的浏览器配置文件。这样会复用该浏览器配置文件中已经打开的标签页和登录状态。

官方背景和设置参考：

- [Chrome for Developers：在浏览器会话中使用 Chrome DevTools MCP](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [Chrome DevTools MCP README](https://github.com/ChromeDevTools/chrome-devtools-mcp)

内置配置文件：

- `user`

可选：如果你希望使用不同的名称、颜色或浏览器数据目录，也可以创建自己的自定义现有会话配置文件。

默认行为：

- 内置的 `user` 配置文件使用 Chrome MCP 自动连接，它会目标指向默认的本地 Google Chrome 配置文件。

对 Brave、Edge、Chromium，或非默认的 Chrome 配置文件，请使用 `userDataDir`。
`~` 会展开为你的操作系统主目录：

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

然后在对应的浏览器中：

1. 打开该浏览器用于远程调试的 inspect 页面。
2. 启用远程调试。
3. 保持浏览器运行，并在 OpenClaw 连接时批准连接提示。

常见的 inspect 页面：

- Chrome: `chrome://inspect/#remote-debugging`
- Brave: `brave://inspect/#remote-debugging`
- Edge: `edge://inspect/#remote-debugging`

实时连接冒烟测试：

```bash
openclaw browser --browser-profile user start
openclaw browser --browser-profile user status
openclaw browser --browser-profile user tabs
openclaw browser --browser-profile user snapshot --format ai
```

成功时的表现：

- `status` 显示 `driver: existing-session`
- `status` 显示 `transport: chrome-mcp`
- `status` 显示 `running: true`
- `tabs` 列出你已经打开的浏览器标签页
- `snapshot` 返回所选实时标签页中的 refs

如果连接无法工作，需要检查什么：

- 目标基于 Chromium 的浏览器版本是 `144+`
- 该浏览器的 inspect 页面中已启用远程调试
- 浏览器已显示连接同意提示，并且你已接受
- `openclaw doctor` 会迁移旧的基于扩展的浏览器配置，并检查默认自动连接配置文件的本地 Chrome 是否已安装，但它无法替你启用浏览器端的远程调试

Agent 使用方式：

- 当你需要用户已登录的浏览器状态时，请使用 `profile="user"`。
- 如果你使用自定义的现有会话配置文件，请传入那个明确的配置文件名称。
- 只有在用户在电脑前并可批准附加提示时，才选择此模式。
- Gateway 或节点主机可以启动 `npx chrome-devtools-mcp@latest --autoConnect`

注意：

- 这条路径比隔离的 `openclaw` 配置文件风险更高，因为它可以在你已登录的浏览器会话内执行操作。
- OpenClaw 不会为此驱动启动浏览器；它只会附加连接。
- OpenClaw 在这里使用官方 Chrome DevTools MCP 的 `--autoConnect` 流程。如果设置了 `userDataDir`，则会原样传递，以指向该用户数据目录。
- existing-session 可以在所选主机上连接，也可以通过已连接的浏览器节点连接。如果 Chrome 位于其他地方且没有连接浏览器节点，请改用远程 CDP 或节点主机。

### 自定义 Chrome MCP 启动

当默认的 `npx chrome-devtools-mcp@latest` 流程不符合你的需求时，可以按配置文件覆盖启动的 Chrome DevTools MCP 服务器（离线主机、固定版本、捆绑二进制等）：

| 字段         | 作用                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `mcpCommand` | 要启动的可执行文件，用它替代 `npx`。按原样解析；会尊重绝对路径。                                                         |
| `mcpArgs`    | 逐字传递给 `mcpCommand` 的参数数组。替换默认的 `chrome-devtools-mcp@latest --autoConnect` 参数。 |

当在 existing-session 配置文件上设置了 `cdpUrl` 时，OpenClaw 会跳过 `--autoConnect` 并自动将端点转发给 Chrome MCP：

- `http(s)://...` → `--browserUrl <url>`（DevTools HTTP 发现端点）。
- `ws(s)://...` → `--wsEndpoint <url>`（直接 CDP WebSocket）。

端点标志和 `userDataDir` 不能同时使用：当设置了 `cdpUrl` 时，`userDataDir` 会在 Chrome MCP 启动时被忽略，因为 Chrome MCP 是附加到端点后面的正在运行浏览器，而不是打开一个配置文件目录。

<Accordion title="现有会话功能限制">

与受管理的 `openclaw` 配置文件相比，existing-session 驱动的限制更多：

- **截图** - 页面捕获和 `--ref` 元素捕获可用；CSS `--element` 选择器不可用。`--full-page` 不能与 `--ref` 或 `--element` 组合。页面或基于 ref 的元素截图不需要 Playwright。
- **操作** - `click`、`type`、`hover`、`scrollIntoView`、`drag` 和 `select` 需要 snapshot refs（不支持 CSS 选择器）。`click-coords` 会点击可见视口坐标，不需要 snapshot ref。`click` 仅支持左键。`type` 不支持 `slowly=true`；请使用 `fill` 或 `press`。`press` 不支持 `delayMs`。`type`、`hover`、`scrollIntoView`、`drag`、`select`、`fill` 和 `evaluate` 不支持每次调用的超时。`select` 接受单个值。
- **等待 / 上传 / 对话框** - `wait --url` 支持精确、子串和 glob 模式；不支持 `wait --load networkidle`。上传钩子需要 `ref` 或 `inputRef`，一次一个文件，不支持 CSS `element`。对话框钩子不支持超时覆盖或 `dialogId`。
- **对话框可见性** - 当某个操作打开模态对话框时，受管理浏览器的操作响应会包含 `blockedByDialog` 和 `browserState.dialogs.pending`；快照也会包含待处理的对话框状态。在对话框待处理时，请使用 `browser dialog --accept/--dismiss --dialog-id <id>` 进行响应。OpenClaw 之外处理的对话框会显示在 `browserState.dialogs.recent` 下。
- **仅受管理浏览器可用的功能** - 批量操作、PDF 导出、下载拦截和 `responsebody` 仍然需要受管理浏览器路径。

</Accordion>

## Isolation Guarantees

- **Dedicated user data directory**: Never touches your personal browser profile.
- **Dedicated port**: Avoids using `9222` to prevent conflicts with development workflows.
- **Deterministic tab control**: `tabs` first returns `suggestedTargetId`, then a stable `tabId` handle such as `t1`, optional tags, and the original `targetId`. The Agent should reuse `suggestedTargetId`; the original ID remains available for debugging and compatibility.

## Browser Selection

When starting locally, OpenClaw selects the first available browser in this order:

1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

You can override this with `browser.executablePath`.

Platforms:

- macOS: checks `/Applications` and `~/Applications`.
- Linux: checks common Chrome/Brave/Edge/Chromium locations under `/usr/bin`, `/snap/bin`, `/opt/google`, `/opt/brave.com`, `/usr/lib/chromium`, and `/usr/lib/chromium-browser`, as well as Playwright-managed Chromium under `PLAYWRIGHT_BROWSERS_PATH` or `~/.cache/ms-playwright`.
- Windows: checks common installation locations.

## Control API (Optional)

For scripting and debugging, Gateway provides a small **loopback-only HTTP control API** and the corresponding `openclaw browser` CLI (snapshots, refs, wait enhancements, JSON output, debugging workflows). See the full reference at
[Browser Control API](/tools/browser-control).

## Troubleshooting

For Linux-specific issues, especially snap Chromium, see
[Browser Troubleshooting](/tools/browser-linux-troubleshooting).

For WSL2 Gateway + Windows Chrome separated-host deployments, see
[WSL2 + Windows + Remote Chrome CDP Troubleshooting](/tools/browser-wsl2-windows-remote-cdp-troubleshooting).

### CDP Startup Failure vs Navigation SSRF Blocking

These two classes of failures are different, and they follow different code paths.

- **CDP startup or readiness failure** means OpenClaw cannot confirm whether the browser control plane is healthy.
- **Navigation SSRF blocking** means the browser control plane is healthy, but a page navigation target was denied by policy.

Common examples:

- CDP startup or readiness failure:
  - `Chrome CDP websocket for profile "openclaw" is not reachable after start`
  - `Remote CDP for profile "<name>" is not reachable at <cdpUrl>`
  - When `attachOnly: true` is not configured, if an external loopback CDP service is configured, `Port <port> is in use for profile "<name>" but not by openclaw` will appear
- Navigation SSRF blocking:
  - Flows such as `open`, `navigate`, snapshot, or opening tabs fail due to browser/network policy errors, but `start` and `tabs` still work

Use the following minimal flow to distinguish between them:

```bash
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

How to interpret the results:

- If `start` fails with `not reachable after start`, investigate CDP readiness first.
- If `start` succeeds but `tabs` fails, the control plane is still unhealthy. Treat it as a CDP reachability issue, not a page navigation issue.
- If `start` and `tabs` succeed, but `open` or `navigate` fails, the browser control plane is healthy and the failure happened in navigation policy or the target page.
- If `start`, `tabs`, and `open` all succeed, the basic managed browser control path is healthy.

Important behavioral details:

- Even if you do not configure `browser.ssrfPolicy`, the browser configuration uses a fail-closed SSRF policy object by default.
- For the local loopback `openclaw` managed profile, CDP health checks intentionally skip browser-SSRF reachability enforcement for OpenClaw’s own local control plane.
- Navigation protection is separate. A successful `start` or `tabs` does not mean later `open` or `navigate` targets are necessarily allowed.

Security recommendations:

- Do not relax browser SSRF policy by default.
- Prefer narrower host exceptions such as `hostnameAllowlist` or `allowedHostnames` over broader private-network access.
- Use `dangerouslyAllowPrivateNetwork: true` only in environments that are explicitly trusted, genuinely require it, and have had private-network browser access reviewed.

## Agent Tools + Control Modes

The Agent has only **one tool** for browser automation:

- `browser` - doctor/status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

Mappings:

- `browser snapshot` returns a stable UI tree (AI or ARIA).
- `browser act` uses snapshot `ref` IDs to click/type/drag/select.
- `browser screenshot` captures pixels (full page, elements, or tagged refs).
- `browser doctor` checks Gateway, plugins, profiles, browser, and tab readiness.
- `browser` accepts:
  - `profile` to select a named browser profile (`openclaw`, `chrome`, or remote CDP).
  - `target` (`sandbox` | `host` | `node`) to select where the browser runs.
  - In sandbox sessions, `target: "host"` requires `agents.defaults.sandbox.browser.allowHostControl=true`.
  - If `target` is omitted: sandbox sessions default to `sandbox`, and non-sandbox sessions default to `host`.
  - If a browser-capable node is connected, the tool may automatically route to that node unless you pin `target="host"` or `target="node"`.

This makes the agent more deterministic and avoids brittle selectors.

## Related

- [Tools Overview](/tools) - All available agent tools
- [Sandboxing](/gateway/sandboxing) - Browser control in sandboxed environments
- [Security](/gateway/security) - Browser control risks and hardening
