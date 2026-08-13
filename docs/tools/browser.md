---
summary: "集成的浏览器控制服务 + 动作命令"
read_when:
  - 添加由代理控制的浏览器自动化
  - 排查 openclaw 为何干扰你自己的 Chrome
  - 在 macOS 应用中实现浏览器设置 + 生命周期
title: "浏览器（OpenClaw 管理）"
---

OpenClaw 可以运行一个由代理控制的**专用 Chrome/Brave/Edge/Chromium 配置文件**。它通过 Gateway 内部的一个小型本地控制服务运行（仅限回环地址），并且与您的个人浏览器隔离。

- 可以把它看作一个**独立的、仅供代理使用的浏览器**。`openclaw` 配置文件绝不会触碰您的个人浏览器配置文件。
- 代理会在这个隔离通道中打开标签页、读取页面、点击和输入。
- 内置的`user`配置文件则通过 Chrome DevTools MCP 连接到您真实的已登录 Chrome 会话。

## 你将获得什么

- 一个名为 **openclaw** 的独立浏览器配置文件（默认橙色强调色）。
- 确定性的标签页控制（列表/打开/聚焦/关闭）。
- 代理操作（点击/输入/拖拽/选择）、快照、截图、PDF。
- 针对可读页面文本的问答，无需返回完整快照。
- 基于 Playwright 的配置文件会将直接附件导航保存在受管理的下载目录中，并在最终 URL 策略验证后返回 `{ url, suggestedFilename, path }` 元数据。
- 基于 Playwright 的代理操作在该操作立即开始一个或多个下载时，会返回一个包含相同受管理元数据的 `downloads` 数组。
- 一个捆绑的 `browser-automation` 技能，在浏览器插件启用时，教导代理使用快照、稳定标签页、失效引用和手动阻塞恢复循环。
- 可选的多配置文件支持（`openclaw`、`work`、`remote`、...）。

这个浏览器**不是**你的日常主力浏览器。它是一个安全、隔离的表面，供
代理自动化和验证使用。

在 macOS 上，你可以显式地将来自 Chrome 系统配置文件的 cookie 复制到一个单独的托管配置文件中。托管浏览器仍然使用自己的用户数据目录；只有所选的 cookie 会被复制，而本地存储和 IndexedDB 会保留在原处。有关导入命令和限制，请参阅 [Profiles](#profiles-multi-browser) 或 [`openclaw browser` CLI 参考](/cli/browser)。

## 快速开始

```bash
openclaw browser --browser-profile openclaw doctor
openclaw browser --browser-profile openclaw doctor --deep
openclaw browser --browser-profile openclaw status
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

“浏览器已禁用” 表示插件或 `browser.enabled` 已关闭；请参见
[配置](#configuration) 和 [插件控制](#plugin-control)。

如果 `openclaw browser` 完全缺失，或者代理提示浏览器工具不可用，请跳到 [缺少 browser 命令或工具](#missing-browser-command-or-tool)。

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

工具配置说明：`tools.profile: "coding"` 包括 `web_search` 和
`web_fetch`，但不包括完整的 `browser` 工具。要让代理或
派生的子代理使用浏览器自动化，请在配置文件
阶段添加 browser：

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

对于单个代理，请使用 `agents.entries.*.tools.alsoAllow: ["browser"]`。
仅有 `tools.subagents.tools.allow: ["browser"]` 还不够，因为子代理
策略是在配置文件过滤之后应用的。

浏览器插件提供两级代理指导：

- `browser` 工具描述包含简洁的常驻契约：选择正确的配置文件、让引用保持在同一标签页中、使用 `tabId`/标签进行标签页定位，并为多步骤工作加载浏览器技能。
- 随附的 `browser-automation` 技能包含更长的操作循环：
  先检查状态/标签页、为任务标签页加标签、操作前先快照、UI 更改后重新快照、失效引用仅恢复一次，并将登录/2FA/captcha 或摄像头/麦克风阻塞报告为手动操作，而不是猜测。

当插件启用时，插件捆绑的技能会列在代理可用的技能中。完整的技能说明按需加载，因此常规轮次不会消耗全部 token 成本。

对于页面文本，请使用限定于选择器范围的快照，或使用仅返回相关文本或结构化数据的 `act:evaluate`，然后让当前代理模型基于这一受限结果进行推理。请使用高效的快照来发现控件和操作；它们会有意省略大部分不可交互的正文内容。

## 缺少浏览器命令或工具

如果升级后 `openclaw browser` 变成未知命令、`browser.request` 缺失，或者代理报告浏览器工具不可用，通常原因是 `plugins.allow` 列表中未包含 `browser`，且不存在根级 `browser` 配置块。请添加它：

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

显式的根级 `browser` 块（`browser` 下的任意键，例如
`browser.enabled=true` 或 `browser.profiles.<name>`）会在即使 `plugins.allow` 限制较严格的情况下也激活内置
browser 插件，这与内置
channel 配置行为一致。`plugins.entries.browser.enabled=true` 和
`tools.alsoAllow: ["browser"]` 本身不能替代 allowlist 成员资格。直接移除 `plugins.allow` 也会恢复默认设置。

## 配置文件：`openclaw`、`user`、`chrome`

- `openclaw`：受管理、隔离的浏览器（无需扩展）。
- `user`：内置的 Chrome DevTools MCP 附加配置文件，用于你的 **真实已登录 Chrome** 会话。Chrome 在 OpenClaw 首次附加时会显示一个阻塞性的“允许远程调试？”提示，因此此时必须有人在电脑前。
- `chrome`：内置的 [Chrome 扩展](/tools/chrome-extension) 配置文件，用于你的 **真实已登录 Chrome** 会话。即使电脑前无人，只要通过手机也能使用，因为它是通过 OpenClaw 浏览器扩展而不是远程调试端口来驱动标签页，因此不会出现“允许远程调试？”提示。

对于代理浏览器工具调用：

- 默认：使用隔离的 `openclaw` 浏览器。
- 当现有登录会话很重要且用户 **不在电脑前**（Telegram、WhatsApp 等）时，优先使用 `profile="chrome"`（扩展）。
- 当现有登录会话很重要且用户 **在电脑前** 以批准附加提示时，优先使用 `profile="user"`（Chrome MCP）。
- `profile` 是你想要特定浏览器模式时的显式覆盖选项。

如果你希望默认使用受管理模式，请设置 `browser.defaultProfile: "openclaw"`。

## 配置

浏览器设置位于 `~/.openclaw/openclaw.json`。

```json5
{
  browser: {
    enabled: true, // 默认：true
    evaluateEnabled: true, // 默认：true；false 会禁用 act:evaluate（任意 JS）
    ssrfPolicy: {
      // dangerouslyAllowPrivateNetwork: true, // 仅针对受信任的私有网络访问选择启用
      // allowedHostnames: ["localhost"],
      // allowRfc2544BenchmarkRange: true, // 受信任的伪 IP 代理范围
      // allowIpv6UniqueLocalRange: true, // 受信任的伪 IP 代理 IPv6 范围
    },
    // cdpUrl: "http://127.0.0.1:18792", // 旧版单配置文件覆盖
    tabCleanup: {
      enabled: true, // 默认：true
    },
    // snapshotDefaults: { mode: "efficient" }, // 当调用方未指定时的默认 snapshot 模式
    defaultProfile: "openclaw",
    headless: false,
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

`browser.snapshotDefaults.mode: "efficient"` 会在调用方未传入显式 `snapshotFormat` 或 `mode` 时，改变默认的 `snapshot`
提取模式；有关每次调用的 snapshot 选项，请参见 [Browser control API](/tools/browser-control)。

在具有稳定文档标识的驱动上，对同一标签页、文档和选项族重复进行 AI 或角色 snapshot 时，会将新出现的、带 ref 的元素标记为 `[new]`。第一次 snapshot——以及导航后的第一次 snapshot——会建立一个无标记基线。现有会话 snapshot 会省略差异。

### 标签页清理所有权

会话标签页清理仅适用于由 OpenClaw 浏览器工具通过 `action: "open"` 创建的标签页。OpenClaw 不会接管已经打开的标签页、由用户打开的标签页，或所有权未知的其他标签页。`browser.tabCleanup` 区块控制主会话的周期性空闲和上限清理；禁用它并不会禁用显式的会话生命周期清理。

对于本地打开的主机，具有稳定原生 CDP target 和浏览器身份的所有权会保存在共享的 SQLite 状态中。这些记录在 Gateway 重启后仍然保留，并且仍然可以参与 `/new` 和其他会话生命周期清理；会话生命周期清理包括 subagent、cron 和 ACP 会话结束。其工具可见 target 也是原生 CDP target 的记录，在重启后仍然可以参与空闲和每会话上限清理。Chrome MCP target 句柄是进程本地的，因此冷的现有会话记录会等待生命周期清理，而不是冒险对重启后无法安全归因的活动执行空闲清理。这个持久路径可以覆盖 OpenClaw 管理的配置文件、常规远程 CDP 配置文件，以及带有显式 `cdpUrl` 的现有会话配置文件，只要 OpenClaw 能解析原生 target 和稳定的浏览器身份即可。在关闭持久记录之前，OpenClaw 会验证配置的配置文件和浏览器实例仍然匹配。

Chrome MCP `--autoConnect`、其 `/json/version` 响应缺少稳定浏览器身份的 CDP 端点，以及其原生 target 无法解析的打开项，仍然属于进程本地的尽力追踪。它们可以在该 Gateway 进程运行时被清理，但不会在 Gateway 重启后自动关闭。对于在持久追踪可用之前就已打开的标签页，不会事后接管；请手动关闭这些标签页。

清理是尽力而为的，并不保证每个符合条件的标签页都会立即关闭。一次短暂的所有权检查或关闭失败会使持久清理保持待处理状态，等待稍后重试。重试不是无限的：当浏览器一直不可达且标签页已闲置超过一天时，跟踪行会被退役，这样持久存储就不会被那些再也无法验证的标签页占满。

### 截图视觉能力（仅文本模型支持）

当主模型是纯文本模型（不具备视觉／多模态支持）时，浏览器
截图会返回模型无法读取的图像块。浏览器截图会复用现有的图像理解配置，
因此为媒体理解配置的图像模型可以将截图描述为文本，而无需任何
浏览器专用模型设置。

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
      // 现有的图像模型默认值也会被接受。
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

截图图像块是私有工具结果：agent 可以检查它们，
但 OpenClaw 不会自动将它们附加到频道回复中。要共享一张
截图，请让 agent 使用 message 工具显式发送它。

使用 `tools.media.models` 配置模型回退、超时、字节限制、配置文件
和提供方请求设置。为支持截图的条目标记 `image` 能力。

如果当前主模型已经支持视觉，并且没有显式配置图像理解模型，OpenClaw 会保留正常的图像结果，以便主模型可以直接读取截图。

<AccordionGroup>

<Accordion title="端口与可达性">

- 控制服务绑定到回环地址上的一个端口，该端口由 `gateway.port` 派生而来（默认 `18791` ＝ gateway + 2）。`OPENCLAW_GATEWAY_PORT` 的优先级高于 `gateway.port`；任一项都会在同一端口族中平移派生端口。
- 本地 `openclaw` 配置文件会从控制端口上方 9 个端口开始的范围内自动分配 `cdpPort`／`cdpUrl`（默认 `18800`－`18899`）；仅对远程 CDP 配置文件或现有会话端点附加设置这些值。`cdpUrl` 在未设置时默认指向受管本地 CDP 端口。
- 远程和 `attachOnly` 的 CDP 可达性、WebSocket 握手以及本地受管 Chrome 启动都使用内置截止时间。
- 对受管 Chrome 的反复启动／就绪失败会按配置文件触发断路器。连续失败若干次后，OpenClaw 会短暂暂停新的启动尝试，而不是在每次浏览器工具调用时都生成 Chromium。请修复启动问题、在不需要时禁用浏览器，或者在修复后重启 Gateway。

</Accordion>

<Accordion title="SSRF 策略">

- 浏览器导航和打开标签页请求会进行预检。在操作期间以及有界的操作后宽限期内，受保护的 Playwright 交互（点击、坐标点击、悬停、拖拽、滚动、选择、按键、输入、表单填充和 evaluate）会在 HTTP 请求字节发出前拦截策略拒绝的顶层和子框架文档加载，然后尽力重新检查最终的 `http(s)` URL。
- 在每次新的 OpenClaw 管理的 Chrome 启动之前，OpenClaw 会尽力禁用网络预测，抑制 Chromium 针对这些被拒绝加载所观察到的推测性预连接。这是纵深防御，而不是策略边界：跨控制服务重启复用的浏览器和其他浏览器后端可能不会共享这些强化措施。Playwright 路由仍然不是网络防火墙，也不会拦截重定向跳转、弹出窗口的首次请求、Service Worker 流量、有界保护窗口之后运行的页面代码，或每一条后台／子资源路径。完整的出口隔离需要所有者一侧的隔离措施或强制执行策略的代理。
- 在严格 SSRF 模式下，远程 CDP 端点发现和 `/json/version` 探测（`cdpUrl`）也会进行检查。
- 当所选驱动程序无法让批准的端点绑定到实际套接字时，受保护的远程 CDP 连接现在会默认拒绝。对于 Browserless、Browserbase、Notte 或其他受保护的远程 CDP 提供商，请使用常规的 `openclaw` 驱动程序。带有显式 `cdpUrl` 或 `--browserUrl`／`--wsEndpoint` MCP 参数的 `existing-session`／Chrome MCP 配置文件，会在默认严格 Browser 策略下被拒绝，因为 Chrome MCP 无法跨越其子进程边界传递 OpenClaw 固定的 DNS 查询或受保护的发现结果。只有在明确信任私有网络 Browser 访问时，它们才会继续受支持。否则，请省略显式端点，并将 Chrome MCP 附加到主机本地的 Chrome 配置文件，或者将配置文件切换为用于受保护 CDP 的常规驱动程序。
- 除非当前策略明确允许更改授权机构，否则不支持将 CDP 发现重定向到不同的授权机构。重新验证返回的主机名还不够；WebSocket 传输必须使用通过策略验证的端点。
- Gateway／提供方的 `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY` 和 `NO_PROXY` 环境变量不会自动代理 OpenClaw 管理的浏览器。受管 Chrome 默认直接连接，因此提供方代理设置不会削弱浏览器 SSRF 检查。
- OpenClaw 管理的本地 CDP 就绪探测和 DevTools WebSocket 连接，会绕过管理的网络代理，直接访问确切启动的回环端点，因此即使操作员代理阻止回环出口，`openclaw browser start` 仍然可以工作。
- 要代理受管浏览器本身，请通过 `browser.extraArgs` 传递显式 Chrome 代理标志，例如 `--proxy-server=...` 或 `--proxy-pac-url=...`。严格 SSRF 模式会阻止显式的浏览器代理路由，除非有意启用私有网络浏览器访问。
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 默认关闭；只有在有意信任私有网络浏览器访问时才启用。
- `browser.ssrfPolicy.allowedHostnames` 允许精确主机，同时仍阻止私有网络的其他部分。
- `browser.ssrfPolicy.allowRfc2544BenchmarkRange` 和 `browser.ssrfPolicy.allowIpv6UniqueLocalRange` 会有限度地允许受信任的伪 IP 代理范围。
- `browser.ssrfPolicy.allowPrivateNetwork` 仍作为旧版别名受支持。

</Accordion>

<Accordion title="配置文件行为">

- `attachOnly: true` 表示从不启动本地浏览器；仅在已有浏览器运行时进行连接。
- `headless` 可以全局设置，也可以按本地受管配置文件设置。按配置文件设置的值会覆盖 `browser.headless`，因此一个本地启动的配置文件可以保持无头模式，而另一个保持可见。
- `POST /start?headless=true` 和 `openclaw browser start --headless` 会为本地受管配置文件请求一次性的无头启动，而不会重写 `browser.headless` 或配置文件配置。Existing-session、仅连接和远程 CDP 配置文件会拒绝此覆盖，因为 OpenClaw 不会启动这些浏览器进程。
- 在没有 `DISPLAY` 或 `WAYLAND_DISPLAY` 的 Linux 主机上，当环境和配置文件／全局配置都没有显式选择有头模式时，本地受管配置文件会自动默认为无头模式。请使用明确无歧义的浏览器级形式 `openclaw browser --json status`；末尾带有 `openclaw browser status --json` 也可以，因为 `status` 没有定义自己的 `--json`。该命令会将 `headlessSource` 报告为 `env`、`profile`、`config`、`request`、`linux-display-fallback` 或 `default`。
- `OPENCLAW_BROWSER_HEADLESS=1` 会强制当前进程的本地受管启动采用无头模式。`OPENCLAW_BROWSER_HEADLESS=0` 会强制普通启动采用有头模式，并在没有显示服务器的 Linux 主机上返回可操作的错误；显式的 `start --headless` 请求在该次启动中仍然优先。
- 浏览器控制路由和程序化客户端会保留无显示器错误中人类可读的 `error`，并公开稳定原因 `no_display_for_headed_profile`。其 `details` 仅包含 `profile`、`requestedHeadless`、`headlessSource` 和 `displayPresent`，因此 API 客户端可以选择正确的修复方式，而无需匹配消息文本。
- 对于正在运行的本地受管配置文件，status 和 doctor 会查询 Chrome 的浏览器级 CDP 端点，以获取渲染器、后端、设备／驱动程序、功能状态、驱动程序变通方案和加速视频能力。结果会针对该浏览器进程进行缓存，并由 `openclaw browser --json status` 完整公开。被动的 status 调用不会启动 Chrome。Existing-session、扩展、远程 CDP 和沙盒浏览器仍然独立存在，不会通过此受管主机路径进行检查。
- 无头受管 Chrome 仍使用保守的 `--disable-gpu` 默认设置。诊断不会启用加速、添加全局加速设置，也不会授予沙盒浏览器设备访问权限。
- `executablePath` 可以全局设置，也可以按本地受管配置文件设置。按配置文件设置的值会覆盖 `browser.executablePath`，因此不同的受管配置文件可以启动不同的基于 Chromium 的浏览器。两种形式都接受 `~` 作为操作系统主目录。
- 默认配置文件是 `openclaw`（受管独立浏览器）。使用 `defaultProfile: "user"` 可选择使用已登录的用户浏览器。
- 自动检测顺序：如果系统默认浏览器基于 Chromium，则使用系统默认浏览器；否则依次使用 Chrome、Brave、Edge、Chromium、Chrome Canary。
- `driver: "existing-session"` 使用 Chrome DevTools MCP，而不是原始 CDP。它可以通过 Chrome MCP 自动连接，或者在运行中的浏览器已有 DevTools 端点时通过 `cdpUrl` 连接。
- `driver: "extension"` 通过 [OpenClaw Chrome extension](/tools/chrome-extension) 驱动已登录的 Chrome。中继程序拥有其回环端点，因此这些配置文件不接受 `cdpUrl`。这是唯一一种在电脑前无人操作时也能工作的已登录浏览器模式。
- 当现有会话配置文件应连接到非默认的 Chromium 用户配置文件（Brave、Edge 等）时，设置 `browser.profiles.<name>.userDataDir`。此路径也接受 `~` 作为操作系统主目录。

</Accordion>

</AccordionGroup>

## 使用 Brave 或其他基于 Chromium 的浏览器

如果你的 **系统默认** 浏览器是基于 Chromium 的（Chrome、Brave、Edge 等），
OpenClaw 会自动使用它。设置 `browser.executablePath` 可覆盖自动检测。
顶层和按配置文件的 `executablePath` 都支持 `~`
来表示你的操作系统主目录：

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

按配置文件的 `executablePath` 只会影响由 OpenClaw 启动的本地管理配置文件。
`existing-session` 配置文件则会附加到已经运行的浏览器，
而远程 CDP 配置文件使用的是 `cdpUrl` 后面的浏览器。

## 本地控制与远程控制

- **本地控制（默认）：** Gateway 启动回环控制服务，并且可以启动本地浏览器。
- **远程控制（节点主机）：** 在拥有浏览器的机器上运行节点主机；Gateway 将浏览器操作代理到它。
- **远程 CDP：** 设置 `browser.profiles.<name>.cdpUrl`（或 `browser.cdpUrl`）以
  附加到远程基于 Chromium 的浏览器。在这种情况下，OpenClaw 不会启动本地浏览器。
- 对于在回环上外部托管的 CDP 服务（例如在 Docker 中发布到 `127.0.0.1` 的 Browserless），也要设置 `attachOnly: true`。没有 `attachOnly` 的回环 CDP 会被视为本地的、由 OpenClaw 管理的浏览器配置文件。
- `headless` 只影响 OpenClaw 启动的本地托管配置文件。它不会重启或更改现有会话或远程 CDP 浏览器。
- `executablePath` 遵循相同的本地托管配置文件规则。对正在运行的本地托管配置文件更改它，会将该配置文件标记为需要重启／协调，以便
  下一次启动使用新的二进制文件。

停止行为会因配置文件模式而不同：

- 本地托管配置文件：`openclaw browser stop` 会停止 OpenClaw 启动的浏览器进程
- 仅附加和远程 CDP 配置文件：`openclaw browser stop` 会关闭当前
  控制会话，并释放 Playwright／CDP 模拟覆盖（视口、
  颜色方案、语言区域、时区、离线模式及类似状态），即使该浏览器进程并不是由 OpenClaw 启动的

远程 CDP URL 可以包含认证信息：

- 查询令牌（例如 `https://provider.example?token=<token>`）
- HTTP Basic 认证（例如 `https://user:pass@provider.example`）

OpenClaw 在调用 `/json/*` 端点以及连接
CDP WebSocket 时都会保留认证信息。请优先使用环境变量或机密管理器
来管理令牌，而不是将其提交到配置文件中。

## Node 浏览器代理（零配置默认）

如果你在拥有浏览器的机器上运行 **node host**，OpenClaw 可以
自动将浏览器工具调用路由到该节点，而无需任何额外的浏览器配置。
这是远程 Gateway 的默认路径。

说明：

- 节点主机通过一个 **代理命令** 暴露其本地浏览器控制服务器。
- 配置文件来自节点自身的 `browser.profiles` 配置（与本地相同）。
- 无论 `allowProfiles` 如何，代理命令都不会允许持久化配置文件修改（`create-profile`、`delete-profile`、`reset-profile`）；请直接在节点上进行这些更改。
- `nodeHost.browserProxy.allowProfiles` 是可选的。对于旧版／默认行为，请留空：所有已配置的配置文件都会保持可通过代理访问。
- 如果你设置了 `nodeHost.browserProxy.allowProfiles`，OpenClaw 会将其视为最小权限边界，仅限制代理可目标指向的配置文件名称。
- 如果你不想启用它，可以禁用：
  - 在节点上：`nodeHost.browserProxy.enabled=false`
  - 在网关上：`gateway.nodes.browser.mode="off"`（也接受 `"auto"`，用于选择单个已连接的浏览器节点，或 `"manual"`，用于要求显式的节点参数）。

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
    profiles: {
      browserless: {
        cdpUrl: "wss://production-sfo.browserless.io?token=<BROWSERLESS_API_KEY>",
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
  `/json/version` 发现（将 scheme 规范化为 `http`／`https`）；
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
    profiles: {
      browserbase: {
        cdpUrl: "wss://connect.browserbase.com?apiKey=<BROWSERBASE_API_KEY>",
      },
    },
  },
}
```

说明：

- [注册](https://www.browserbase.com/sign-up)并从
  [概览面板](https://www.browserbase.com/overview)复制你的 **API 密钥**。
- 将 `<BROWSERBASE_API_KEY>` 替换为你真实的 Browserbase API 密钥。
- Browserbase 会在 WebSocket 连接时自动创建浏览器会话，因此无需手动创建会话步骤。
- 查看 [定价](https://www.browserbase.com/pricing) 以了解当前免费套餐限制和付费方案。
- 查看 [Browserbase 文档](https://docs.browserbase.com) 获取完整的 API
  参考、SDK 指南和集成示例。

### Notte

[Notte](https://www.notte.cc) 是一个用于运行无头浏览器的云平台，
内置隐身、住宅代理和一个原生 CDP 的 WebSocket 网关。

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "notte",
    profiles: {
      notte: {
        cdpUrl: "wss://us-prod.notte.cc/sessions/connect?token=<NOTTE_API_KEY>",
      },
    },
  },
}
```

说明：

- [注册](https://console.notte.cc)并从
  控制台设置页面复制你的 **API 密钥**。
- 将 `<NOTTE_API_KEY>` 替换为你真实的 Notte API 密钥。
- Notte 会在 WebSocket 连接时自动创建浏览器会话，因此无需手动
  创建会话步骤。会话会在
  WebSocket 断开时销毁。
- 查看 [定价](https://www.notte.cc/#pricing) 以了解当前免费套餐限制和付费方案。
- 查看 [Notte 文档](https://docs.notte.cc) 获取完整的 API 参考、SDK
  指南和集成示例。

## 安全

核心要点：

- 浏览器控制仅限本地回环访问；访问通过 Gateway 的认证或节点配对来完成。
- 独立的回环浏览器 HTTP API 仅使用 **共享密钥认证**：
  Gateway token bearer auth、`x-openclaw-password`，或使用已配置的 Gateway 密码进行 HTTP Basic auth。
- Tailscale Serve 身份头和 `gateway.auth.mode: "trusted-proxy"` **不会**对这个独立的回环浏览器 API 进行认证。
- 如果启用了浏览器控制且未配置共享密钥认证，OpenClaw 会在启动时自动生成并持久化一个浏览器控制凭据：
  当 `gateway.auth.mode` 为 `none` 时生成 token；当其为 `trusted-proxy` 时生成密码（通过 `gateway.auth.password` 持久化，因此进程外的回环客户端可以解析到它）。如果该模式下已经显式配置了字符串凭据，或者 `gateway.auth.mode` 为 `password`，则会跳过自动生成。
- 如果你想使用自己控制的稳定密钥，而不是自动生成的密钥，请显式配置 `gateway.auth.token`、`gateway.auth.password`、`OPENCLAW_GATEWAY_TOKEN` 或 `OPENCLAW_GATEWAY_PASSWORD`。

远程 CDP 提示：

- 尽量优先使用加密端点（HTTPS 或 WSS）和短期令牌。
- 避免在配置文件中直接嵌入长期有效的令牌。
- 将 Gateway 和任何节点主机放在私有网络（Tailscale）中；避免公开暴露。
- 将远程 CDP URL／令牌视为机密；优先使用环境变量或密钥管理器。

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

内置配置文件：`user`。如果你希望使用不同的名称或浏览器数据目录，请创建自定义的现有会话配置文件。

默认情况下，内置的 `user` 配置文件使用 Chrome MCP 自动连接，目标是默认的本地 Google Chrome 配置文件。对于 Brave、Edge、Chromium，或非默认的 Chrome 配置文件，请使用 `userDataDir`。`~` 会展开为你的操作系统主目录：

```json5
{
  browser: {
    profiles: {
      brave: {
        driver: "existing-session",
        attachOnly: true,
        userDataDir: "~/Library/Application Support/BraveSoftware/Brave-Browser",
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

- Chrome：`chrome://inspect/#remote-debugging`
- Brave：`brave://inspect/#remote-debugging`
- Edge：`edge://inspect/#remote-debugging`

实时连接冒烟测试：

```bash
openclaw browser --browser-profile user start
openclaw browser --browser-profile user status
openclaw browser --browser-profile user tabs
openclaw browser --browser-profile user snapshot --format ai
```

成功时的表现：

- `status` 显示：`driver: existing-session`
- `status` 显示：`transport: chrome-mcp`
- `status` 显示：`running: true`
- `tabs` 列出你已经打开的浏览器标签页
- `snapshot` 返回所选实时标签页中的 refs

如果连接无法工作，需要检查什么：

- 目标基于 Chromium 的浏览器版本是否为 `144+`
- 该浏览器的 inspect 页面中是否已启用远程调试
- 浏览器是否已显示并且你是否接受了附加连接提示
- 如果 Chrome 是通过显式的 `--remote-debugging-port` 启动的，请将
  `browser.profiles.<name>.cdpUrl` 设置为该 DevTools 端点，而不要依赖
  Chrome MCP 自动连接
- `openclaw doctor` 会迁移旧的基于扩展的浏览器配置，并检查默认自动连接配置文件所需的 Chrome 是否已在本地安装，但它无法替你在浏览器侧启用远程调试

代理使用方式：

- 当你需要用户已登录的浏览器状态时，使用 `profile="user"`。
- 如果你使用自定义的现有会话配置文件，请传入那个明确的配置文件名称。
- 只有在用户就在电脑前并且可以批准附加提示时，才选择这种模式。
- Gateway 或 node 主机可以启动 `npx chrome-devtools-mcp@latest --autoConnect`。

注意：

- 这条路径比隔离的 `openclaw` 配置文件风险更高，因为它可以
  在你已登录的浏览器会话内执行操作。
- OpenClaw 不会为这个驱动启动浏览器；它只会进行附加。
- OpenClaw 在这里使用官方的 Chrome DevTools MCP `--autoConnect` 流程。如果
  设置了 `userDataDir`，它会被传递过去，用于定位该用户数据目录。
- existing-session 可以在所选主机上附加，也可以通过已连接的
  browser node 附加。如果 Chrome 在别处运行且没有连接 browser node，
  请改用 remote CDP 或 node 主机。
- Chrome MCP 的目标和 snapshot refs 仅作用于一个 MCP 子进程。该进程
  重启后，请再次运行 `browser tabs`，在进行特定目标工作前显式选择新的目标，
  并在使用 refs 前获取新的 snapshot。每个 ref 只对其对应的目标和最新快照有效。
  即使 URL 相同，旧别名也不会转移到替换后的标签页。
- Chrome DevTools MCP 目前通过进程本地的数字页面 ID 路由页面工具。
  进程作用域的句柄可防止跨子进程替换复用，但在相邻工具调用之间，
  进程内的 browser-context 替换仍可能重新定向某个动作。要实现完全原子化的路由，
  需要上游页面工具支持稳定的目标 ID。

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

- **截图**——页面捕获和 `--ref` 元素捕获可用；CSS `--element` 选择器不可用。页面或基于 ref 的元素截图不需要 Playwright。（任何配置文件上，`--full-page` 都不能与 `--ref` 或 `--element` 结合使用，不仅限于 existing-session。）
- **操作**——`click`、`type`、`hover`、`scrollIntoView`、`drag` 和 `select` 需要 snapshot refs（不能使用 CSS 选择器）。`click-coords` 会点击可见视口坐标，不需要 snapshot ref。`click` 仅支持左键（不支持按钮覆盖或修饰键）。`type` 不支持 `slowly=true`；请使用 `fill` 或 `press`。`press` 不支持 `delayMs`。`type`、`hover`、`scrollIntoView`、`drag`、`select` 和 `fill` 不支持逐次调用的 `timeoutMs` 覆盖；`evaluate` 支持。`select` 只接受单个值。`batch` 不受支持；请逐个发送操作。
- **等待／上传／对话框**——`wait --url` 支持精确、子字符串和 glob 模式（与 managed 相同）；`wait --load networkidle` 不支持 existing-session 配置文件（它适用于 managed 和 raw/remote CDP 配置文件）。上传钩子需要 `ref` 或 `inputRef`，一次只能上传一个文件，不能使用 CSS `element`。对话框钩子不支持超时覆盖或 `dialogId`。
- **对话框可见性**——当操作打开模态对话框时，受管理浏览器的操作响应会包含 `blockedByDialog` 和 `browserState.dialogs.pending`；快照也会包含待处理对话框状态。在对话框待处理时，请响应 `browser dialog --accept --dismiss --dialog-id <id>`。在 OpenClaw 外部处理的对话框会显示在 `browserState.dialogs.recent` 中。
- **仅受管理浏览器支持的功能**——PDF 导出、下载拦截和 `responsebody` 仍然需要受管理的浏览器路径。

</Accordion>

## 隔离保证

- **专用用户数据目录**：绝不会触碰你的个人浏览器配置文件。
- **专用端口**：避免使用 `9222`，以防与开发工作流发生冲突。
- **确定性的标签页控制**：`tabs` 首先返回 `suggestedTargetId`，然后返回一个稳定的 `tabId` 句柄，例如 `t1`、可选标签，以及原始的 `targetId`。Agent 应该重用 `suggestedTargetId`；原始 ID 仍可用于调试和兼容性。

## 浏览器选择

在本地启动时，OpenClaw 会按以下顺序选择第一个可用的浏览器：

1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

你可以通过 `browser.executablePath` 覆盖这一行为。

平台：

- macOS：检查 `/Applications` 和 `~/Applications`。
- Linux：检查 `/usr/bin`、`/snap/bin`、`/opt/google`、`/opt/brave.com`、`/usr/lib/chromium` 和 `/usr/lib/chromium-browser` 下常见的 Chrome/Brave/Edge/Chromium 位置，以及 `PLAYWRIGHT_BROWSERS_PATH` 或 `~/.cache/ms-playwright` 下由 Playwright 管理的 Chromium。
- Windows：检查常见安装位置。

## 控制 API（可选）

用于脚本编写和调试时，Gateway 提供了一个小型的**仅回环可访问的 HTTP 控制 API**，以及对应的 `openclaw browser` CLI（快照、引用、等待增强、JSON 输出、调试工作流）。完整参考请见
[浏览器控制 API](/tools/browser-control)。

## 故障排查

关于 Linux 特有问题，尤其是 snap Chromium，请参见
[浏览器故障排查](/tools/browser-linux-troubleshooting)。

关于 WSL2 Gateway + Windows Chrome 分离主机部署，请参见
[WSL2 + Windows + 远程 Chrome CDP 故障排查](/tools/browser-wsl2-windows-remote-cdp-troubleshooting)。

### CDP 启动失败 vs 导航 SSRF 阻止

这两类失败不同，它们遵循不同的代码路径。

- **CDP 启动或就绪失败** 表示 OpenClaw 无法确认浏览器控制平面是否健康。
- **导航 SSRF 阻止** 表示浏览器控制平面是健康的，但某个页面导航目标因策略被拒绝。

常见示例：

- CDP 启动或就绪失败：
  - `Chrome CDP websocket for profile "openclaw" is not reachable after start`
  - `Remote CDP for profile "<name>" is not reachable at <cdpUrl>`
  - 当未配置 `attachOnly: true` 时，如果配置了外部回环 CDP 服务，将会出现 `Port <port> is in use for profile "<name>" but not by openclaw`
- 导航 SSRF 阻止：
  - `open`、`navigate`、快照或打开标签页等流程因浏览器／网络策略错误而失败，但 `start` 和 `tabs` 仍然可用

使用以下最小流程来区分它们：

```bash
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

如何解释结果：

- 如果 `start` 因 `not reachable after start` 失败，先排查 CDP 就绪状态。
- 如果 `start` 成功但 `tabs` 失败，控制平面仍然不健康。应将其视为 CDP 可达性问题，而不是页面导航问题。
- 如果 `start` 和 `tabs` 成功，但 `open` 或 `navigate` 失败，则浏览器控制平面是健康的，失败发生在导航策略或目标页面上。
- 如果 `start`、`tabs` 和 `open` 都成功，则基础的托管浏览器控制路径是健康的。

重要行为细节：

- 即使你没有配置 `browser.ssrfPolicy`，浏览器配置默认也会使用一个 fail-closed 的 SSRF 策略对象。
- 对于本地回环 `openclaw` 托管配置文件，CDP 健康检查会有意跳过对 OpenClaw 自身本地控制平面的 browser-SSRF 可达性强制检查。
- 导航保护是独立的。`start` 或 `tabs` 成功并不意味着后续的 `open` 或 `navigate` 目标一定被允许。

安全建议：

- 默认不要放宽浏览器 SSRF 策略。
- 优先使用范围狭窄且支持通配符的 `allowedHostnames` 例外，而不是广泛的私有网络访问。
- 仅在确实需要私有网络浏览器访问且经过审查的、明确受信任的环境中，使用 `dangerouslyAllowPrivateNetwork: true`。

## Agent 工具 + 控制模式

Agent 只有 **一个工具** 用于浏览器自动化：

- `browser` - doctor/status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

映射关系：

- `browser snapshot` 返回一个稳定的 UI 树（AI 或 ARIA）。
- `browser navigate` 也会返回已加载页面的内联快照（高效
  交互层，因此有效载荷保持紧凑且有界），所以 agent
  不需要后续再调用 snapshot。批量 `act` 结果中，如果报告了
  跨文档导航，也会包含同样的新鲜页面状态。解析为下载的导航则会跳过它。
- `browser act` 使用快照的 `ref` ID 来点击／输入／拖拽／选择。
- `browser screenshot` 捕获像素（整页、元素或带标签的 refs）。
- `browser doctor` 检查 Gateway、插件、配置文件、浏览器和标签页是否就绪。
- `browser` 接受：
  - `profile` 用于选择一个命名的浏览器配置文件（openclaw、chrome 或 remote CDP）。
  - `target`（`sandbox` | `host` | `node`）用于选择浏览器所在位置。
  - 在沙箱会话中，`target: "host"` 需要 `agents.defaults.sandbox.browser.allowHostControl=true`。
  - 如果省略 `target`：沙箱会话默认使用 `sandbox`，非沙箱会话默认使用 `host`。
  - 如果已连接一个支持浏览器的节点，除非你将 `target="host"` 或 `target="node"` 固定指定，否则该工具可能会自动路由到它。

这使得 agent 更具确定性，并避免脆弱的选择器。

## 相关内容

- [工具概览](/tools) - 所有可用的 agent 工具
- [沙箱环境](/gateway/sandboxing) - 沙箱环境中的浏览器控制
- [安全性](/gateway/security) - 浏览器控制风险与加固。
