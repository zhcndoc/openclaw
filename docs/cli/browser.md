---
summary: "openclaw browser 浏览器的 CLI 参考（生命周期、配置文件、标签页、操作、状态和调试）"
read_when:
  - 你使用 `openclaw browser`，并希望查看常见任务示例
  - 你想通过 node host 远程控制运行在另一台机器上的浏览器
  - 你想通过 Chrome MCP 连接到本地已登录的 Chrome
title: "浏览器"
---

# `openclaw browser`

管理 OpenClaw 的浏览器控制面并运行浏览器操作：生命周期、配置文件、标签页、快照、截图、导航、输入、状态模拟和调试。

相关：[浏览器工具](/tools/browser)

## 常用标志

- `--url <gatewayWsUrl>`: Gateway WebSocket URL（默认使用配置）。
- `--token <token>`: Gateway 令牌（如需要）。
- `--timeout <ms>`: 请求超时时间，单位为 ms（默认：`30000`）。
- `--expect-final`: 等待最终的 Gateway 响应。
- `--browser-profile <name>`: 选择浏览器配置文件（默认：`openclaw`，或 `browser.defaultProfile`）。
- `--json`: 机器可读输出（在支持的情况下）。这是一个浏览器级别的选项，因此
  请将其放在子命令之前，以获得明确无歧义的形式，例如
  `openclaw browser --json status`。尾随位置例如
  `openclaw browser status --json` 也可行，前提是所选子命令没有
  定义自己的 `--json`。

## 快速开始（本地）

```bash
openclaw browser profiles
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

代理可以使用 `browser({ action: "doctor" })` 执行相同的就绪检查。

## 快速排障

如果 `start` 返回 `not reachable after start`，请先排查 CDP 就绪状态。如果 `start` 和 `tabs` 成功，但 `open` 或 `navigate` 失败，则说明浏览器控制平面是健康的，失败通常是导航 SSRF 策略阻止所致。

最小执行序列：

```bash
openclaw browser --browser-profile openclaw doctor
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

详细说明：[浏览器排障](/tools/browser#cdp-startup-failure-vs-navigation-ssrf-block)

## 生命周期

```bash
openclaw browser status
openclaw browser doctor
openclaw browser doctor --deep
openclaw browser start
openclaw browser start --headless
openclaw browser stop
openclaw browser --browser-profile openclaw reset-profile
```

- `doctor --deep` 会添加一个实时快照探测：当基础 CDP 就绪状态已为绿色，但你还想确认当前标签页可以被检查时，这很有用。
- 对于正在运行的本地托管配置文件，`status` 和 `doctor` 会从 Chrome 报告缓存的图形诊断信息：硬件/软件分类、渲染器、后端、设备/驱动、功能与禁用状态详情，以及加速视频能力。`openclaw browser --json status` 会返回完整的结构化负载。
  被动状态检查绝不会为了收集这些信息而专门启动 Chrome。
- `stop` 会关闭活动控制会话，并清除临时的仿真覆盖，即使对于 `attachOnly` 和远程 CDP 配置文件也是如此，因为在这些情况下 OpenClaw 并未自行启动浏览器进程。对于本地托管配置文件，`stop` 还会停止所启动的浏览器进程。
- `start --headless` 仅对该次启动请求生效，并且只在 OpenClaw 启动本地托管浏览器时适用。它不会改写 `browser.headless` 或配置文件配置，并且对于已经在运行的浏览器不会产生任何作用。
- 在没有 `DISPLAY` 或 `WAYLAND_DISPLAY` 的 Linux 主机上，本地托管配置文件会自动以无头模式运行，除非 `OPENCLAW_BROWSER_HEADLESS=0`、`browser.headless=false` 或 `browser.profiles.<name>.headless=false` 明确请求一个可见浏览器。

## If the command is missing

If `openclaw browser` is an unknown command, please check `plugins.allow` in `~/.openclaw/openclaw.json`. When `plugins.allow` exists, unless the configuration already has a root-level `browser` block, explicitly list the built-in browser plugin:

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

A root-level explicit `browser` block (for example, `browser.enabled=true` or `browser.profiles.<name>`) will also activate the built-in browser plugin under a restrictive plugin allowlist.

Related: [Browser tool](/tools/browser#missing-browser-command-or-tool)

## 配置文件

Profiles 是命名的浏览器路由配置：

- `openclaw`（默认）：启动或连接到一个由 OpenClaw 管理的专用 Chrome 实例（隔离的用户数据目录）。
- `user`：通过 Chrome DevTools MCP 控制你现有的已登录 Chrome 会话。
- 自定义 CDP profiles：指向本地或远程的 CDP 端点。

```bash
openclaw browser profiles
openclaw browser system-profiles
openclaw browser system-profiles --browser brave
openclaw browser import-profile --browser chrome --system Default --into imported
openclaw browser import-profile --system "Profile 1" --into work --domains google.com,youtube.com
openclaw browser create-profile --name work --color "#FF5A36"
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name remote --cdp-url https://browser-host.example.com
openclaw browser delete-profile --name work
```

可在任意子命令中使用 `--browser-profile <name>` 指定特定 profile，例如 `openclaw browser --browser-profile work tabs`。

在 macOS 上，`system-profiles` 会列出主机上可用的真实 Chrome、Brave、Edge 或 Chromium profiles。`import-profile` 会在一次 macOS 钥匙串/Touch ID 许可提示后解密它们的 cookies，并将其注入到一个全新的、由 OpenClaw 管理的 profile 中。它只会导入 cookies；本地存储和 IndexedDB 不会改变。某些 Google 会话使用设备绑定会话凭据（DBSC），因此在导入后仍可能需要重新认证。

当 macOS 应用使用本地 Gateway 时，它可以提供一次这种导入，并将隔离后的已导入 profile 设为代理浏览的默认配置。导入始终需要明确点击；成功导入或取消都会抑制后续的自动提示，且 **Settings → General → Browser login** 仍可用于重新导入。

系统 profile 导入默认已启用。将 `browser.allowSystemProfileImport=false` 可同时禁用 CLI 和 agent 触发的导入。导入仅在主机本地执行，无法通过 browser node proxy 运行。

## 选项卡

```bash
openclaw browser tabs
openclaw browser tab new --label 文档
openclaw browser tab label t1 文档
openclaw browser tab select 2
openclaw browser tab close 2
openclaw browser open https://docs.openclaw.ai --label 文档
openclaw browser focus 文档
openclaw browser close t1
```

`tabs` 会首先返回 `suggestedTargetId`，然后是稳定的 `tabId`（例如 `t1`）、可选标签以及原始 `targetId`。将 `suggestedTargetId` 传回给 `focus`、`close`、快照和各种操作。可以使用 `open --label`、`tab new --label` 或 `tab label` 来分配标签；标签、tab id、原始 target id 以及唯一的 target-id 前缀都可以接受。请求字段仍然命名为 `targetId` 以保持兼容性，但它接受这些标签页引用中的任意一种。

原始 target id 是易变的诊断句柄，不是持久的代理记忆：当 Chromium 在导航或表单提交期间替换底层原始 target 时，如果 OpenClaw 能够证明匹配关系，它会将稳定的 `tabId`/标签保留并附加到替换后的标签页上。优先使用 `suggestedTargetId`。

## 快照 / 截图 / 操作

快照：

```bash
openclaw browser snapshot
openclaw browser snapshot --urls
```

截图：

```bash
openclaw browser screenshot
openclaw browser screenshot --full-page
openclaw browser screenshot --ref e12
openclaw browser screenshot --labels
```

- `--full-page` 仅用于整页截图；它不能与 `--ref` 或 `--element` 组合使用。
- `existing-session` / `user` 配置文件支持整页截图，以及来自快照输出的 `--ref` 截图，但不支持 CSS `--element` 截图。
- `--labels` 会在截图上叠加当前快照中的 ref。对于基于 Playwright 的配置文件，它可与 `--full-page`（整页叠加）、`--ref`（按 ARIA ref 的元素裁剪叠加）以及 `--element`（按 CSS 选择器的元素裁剪叠加）一起使用；在元素裁剪模式下，标签会相对于元素进行投影。响应中还会包含一个 `annotations` 数组（为空时省略），其中包含每个 ref 的边界框：`ref`、`number`、`role`、可选的 `name`，以及 `box: {x, y, width, height}`，坐标空间为所截取图像的坐标系（视口 / 整页 / 元素相对）。  
  `existing-session` 配置文件会在整页截图上渲染 chrome-mcp 覆盖层，但不会使用 Playwright 投影辅助，也不包含 `annotations`；那里不支持 CSS `--element` 截图。若没有 Playwright 或 chrome-mcp，则无法生成带标签的截图。
- `snapshot --urls` 会把发现的链接目标附加到 AI 快照中，这样代理就可以直接选择导航目标，而不必仅凭链接文本猜测。

导航/点击/输入（基于 ref 的 UI 自动化）：

```bash
openclaw browser navigate https://example.com
openclaw browser click <ref>
openclaw browser click-coords 120 340
openclaw browser type <ref> "hello"
openclaw browser press Enter
openclaw browser hover <ref>
openclaw browser scrollintoview <ref>
openclaw browser drag <startRef> <endRef>
openclaw browser select <ref> OptionA OptionB
openclaw browser fill --fields '[{"ref":"1","value":"Ada"}]'
openclaw browser wait --text "Done"
openclaw browser evaluate --fn '(el) => el.textContent' --ref <ref>
openclaw browser evaluate --fn 'const title = document.title; return title;'
openclaw browser evaluate --timeout-ms 30000 --fn 'async () => { await window.ready; return true; }'
```

`evaluate --fn` 接受函数源代码、表达式或语句体。语句体会被包装为 async 函数，因此如果要返回值，请使用 `return`。当页面端函数可能需要比默认 evaluate 超时时间更长时，请使用 `--timeout-ms`。`browser.evaluateEnabled=false`（默认：`true`）会同时禁用 `evaluate` 和 `wait --fn`。

当 OpenClaw 能够证明发生了替换标签页时，动作响应会在动作触发页面替换后返回当前原始 `targetId`。脚本仍应在长生命周期工作流中存储并传递 `suggestedTargetId`/标签。

文件 + 对话框辅助：

```bash
openclaw browser upload /tmp/openclaw/uploads/file.pdf --ref <ref>
openclaw browser upload media://inbound/file.pdf --ref <ref>
openclaw browser waitfordownload
openclaw browser download <ref> report.pdf
openclaw browser dialog --accept
openclaw browser dialog --dismiss --dialog-id d1
```

托管的 Chrome 配置文件会将普通点击触发的下载保存到 OpenClaw 下载目录（默认是 `/tmp/openclaw/downloads`，或已配置的临时根目录）。当代理需要等待特定文件并返回其路径时，请使用 `waitfordownload` 或 `download`；这些显式等待器会拥有下一次下载。上传接受来自 OpenClaw 临时上传根目录以及 OpenClaw 托管的入站媒体中的文件，包括 `media://inbound/<id>` 和沙箱相对的 `media/inbound/<id>` 引用。不允许嵌套媒体引用、路径遍历和任意本地路径。

当某个动作打开模态对话框时，动作响应会返回 `blockedByDialog`，并带有 `browserState.dialogs.pending`；请传入 `--dialog-id` 直接应答。由 OpenClaw 之外处理的对话框会出现在 `browserState.dialogs.recent` 下。

## 状态和存储

视口 + 模拟：

```bash
openclaw browser resize 1280 720
openclaw browser set viewport 1280 720
openclaw browser set offline on
openclaw browser set media dark
openclaw browser set timezone Europe/London
openclaw browser set locale en-GB
openclaw browser set geo 51.5074 -0.1278 --accuracy 25
openclaw browser set device "iPhone 14"
openclaw browser set headers '{"x-test":"1"}'
openclaw browser set credentials myuser mypass
```

Cookie + 存储：

```bash
openclaw browser cookies
openclaw browser cookies set session abc123 --url https://example.com
openclaw browser cookies clear
openclaw browser storage local get
openclaw browser storage local set token abc123
openclaw browser storage session clear
```

## 调试

```bash
openclaw browser console --level error
openclaw browser pdf
openclaw browser responsebody "**/api"
openclaw browser highlight <ref>
openclaw browser errors --clear
openclaw browser requests --filter api
openclaw browser trace start
openclaw browser trace stop --out trace.zip
```

## 通过 MCP 使用现有 Chrome

使用内置的 `user` 配置文件，或创建你自己的 `existing-session` 配置文件：

```bash
openclaw browser --browser-profile user tabs
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name brave-live --driver existing-session --user-data-dir "~/Library/Application Support/BraveSoftware/Brave-Browser"
openclaw browser create-profile --name chrome-port --driver existing-session --cdp-url http://127.0.0.1:9222
openclaw browser --browser-profile chrome-live tabs
```

默认的 existing-session 路径是仅限主机的 Chrome MCP 自动连接。如果浏览器已经以 DevTools 端点运行，请改为传入 `--cdp-url`，这样 Chrome MCP 会连接到该端点。对于 Docker、Browserless 或其他不需要 Chrome MCP 语义的远程环境，请改用 CDP 配置文件。

当前 existing-session 限制：

- 快照驱动的操作使用 ref，而不是 CSS 选择器。
- 当调用方省略 `timeoutMs` 时，`browser.actionTimeoutMs` 会将受支持的 `act` 请求默认设为 60000 ms；单次调用的 `timeoutMs` 仍然优先生效。
- `click` 仅支持左键点击。
- `type` 不支持 `slowly=true`。
- `press` 不支持 `delayMs`。
- `hover`、`scrollintoview`、`drag`、`select` 和 `fill` 会拒绝单次调用的超时覆盖；`evaluate` 接受 `--timeout-ms`。
- `select` 仅支持一个值。
- `wait --load networkidle` 不受支持（在受管理和原始/远程 CDP 配置文件中可用）。
- 文件上传需要 `--ref` / `--input-ref`，不支持 CSS `--element`，并且一次仅支持一个文件。
- 对话框钩子不支持 `--timeout`。
- 截图支持页面捕获和 `--ref`，但不支持 CSS `--element`。
- `responsebody`、下载拦截、PDF 导出和批量操作仍然需要受管理的浏览器或原始 CDP 配置文件。

## 远程浏览器控制（node host 代理）

如果 Gateway 运行在与浏览器不同的机器上，请在安装了 Chrome/Brave/Edge/Chromium 的那台机器上运行一个 **node host**。Gateway 会将浏览器操作代理到该 node；无需单独的浏览器控制服务器。

使用 `gateway.nodes.browser.mode` 控制自动路由；如果连接了多个 node，则使用 `gateway.nodes.browser.node` 固定到特定 node。

安全与远程设置：[Browser tool](/tools/browser)、[Remote access](/gateway/remote)、[Tailscale](/gateway/tailscale)、[Security](/gateway/security)

## 相关

- [CLI 参考](/cli)
- [浏览器](/tools/browser)
