---
summary: "openclaw browser 的 CLI 参考（生命周期、配置文件、标签页、操作、状态和调试）"
read_when:
  - 你使用 `openclaw browser`，并希望查看常见任务示例
  - 你想通过 node host 远程控制运行在另一台机器上的浏览器
  - 你想通过 Chrome MCP 连接到本地已登录的 Chrome
title: "浏览器"
---

# `openclaw browser`

管理 OpenClaw 的浏览器控制面并执行浏览器操作（生命周期、配置文件、标签页、快照、截图、导航、输入、状态模拟和调试）。

相关：

- 浏览器工具 + API：[Browser tool](/tools/browser)

## 常用标志

- `--url <gatewayWsUrl>`：Gateway WebSocket URL（默认取配置）。
- `--token <token>`：Gateway 令牌（如需要）。
- `--timeout <ms>`：请求超时时间（毫秒）。
- `--expect-final`：等待最终的 Gateway 响应。
- `--browser-profile <name>`：选择浏览器配置文件（默认取配置）。
- `--json`：机器可读输出（在支持时）。

## 快速开始（本地）

```bash
openclaw browser profiles
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

代理可以使用 `browser({ action: "doctor" })` 执行相同的就绪检查。

## 快速排障

如果 `start` 失败并提示 `not reachable after start`，请先排查 CDP 就绪状态。如果 `start` 和 `tabs` 成功，但 `open` 或 `navigate` 失败，则浏览器控制平面是健康的，失败通常是导航 SSRF 策略所致。

最小执行序列：

```bash
openclaw browser --browser-profile openclaw doctor
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

详细说明：[Browser troubleshooting](/tools/browser#cdp-startup-failure-vs-navigation-ssrf-block)

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

说明：

- `doctor --deep` 会增加一次实时快照探测。当基础 CDP 就绪状态正常，但你想确认当前标签页是否可被检查时，它很有用。
- 对于 `attachOnly` 和远程 CDP 配置文件，`openclaw browser stop` 会关闭当前控制会话并清除临时模拟覆盖，即使 OpenClaw 并未亲自启动浏览器进程也是如此。
- 对于本地托管配置文件，`openclaw browser stop` 会停止启动的浏览器进程。
- `openclaw browser start --headless` 仅对该次启动请求生效，并且只在 OpenClaw 启动本地托管浏览器时生效。它不会重写 `browser.headless` 或配置文件配置，并且对于已在运行的浏览器没有效果。
- 在没有 `DISPLAY` 或 `WAYLAND_DISPLAY` 的 Linux 主机上，本地托管配置文件会自动以无头模式运行，除非 `OPENCLAW_BROWSER_HEADLESS=0`、`browser.headless=false` 或 `browser.profiles.<name>.headless=false` 明确要求可见浏览器。

## 如果命令缺失

如果 `openclaw browser` 是未知命令，请检查 `~/.openclaw/openclaw.json` 中的 `plugins.allow`。

当存在 `plugins.allow` 时，除非配置中已经有根级 `browser` 块，否则需要显式列出内置的 browser 插件：

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

显式的根级 `browser` 块，例如 `browser.enabled=true` 或 `browser.profiles.<name>`，也会在受限的插件允许列表下激活内置 browser 插件。

相关：[Browser tool](/tools/browser#missing-browser-command-or-tool)

## 配置文件

配置文件是命名的浏览器路由配置。实际使用中：

- `openclaw`：启动或连接到由 OpenClaw 专用管理的 Chrome 实例（隔离的用户数据目录）。
- `user`：通过 Chrome DevTools MCP 控制你现有的已登录 Chrome 会话。
- 自定义 CDP 配置文件：指向本地或远程 CDP 端点。

```bash
openclaw browser profiles
openclaw browser create-profile --name work --color "#FF5A36"
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name remote --cdp-url https://browser-host.example.com
openclaw browser delete-profile --name work
```

使用特定配置文件：

```bash
openclaw browser --browser-profile work tabs
```

## 标签页

```bash
openclaw browser tabs
openclaw browser tab new --label docs
openclaw browser tab label t1 docs
openclaw browser tab select 2
openclaw browser tab close 2
openclaw browser open https://docs.openclaw.ai --label docs
openclaw browser focus docs
openclaw browser close t1
```

`tabs` 会先返回 `suggestedTargetId`，然后是稳定的 `tabId`（例如 `t1`），接着是可选的标签和原始 `targetId`。代理应将 `suggestedTargetId` 传回 `focus`、`close`、快照和操作中。你可以通过 `open --label`、`tab new --label` 或 `tab label` 分配标签；标签、tab id、原始 target id 和唯一的 target-id 前缀都可以接受。当 Chromium 在导航或表单提交期间替换底层原始 target 时，只要 OpenClaw 能证明匹配关系，它就会将稳定的 `tabId`/标签附加到替换后的标签页上。原始 target id 仍然是易变的；优先使用 `suggestedTargetId`。

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

说明：

- `--full-page` 仅用于整页捕获；它不能与 `--ref` 或 `--element` 组合使用。
- `existing-session` / `user` 配置文件支持整页截图和来自快照输出的 `--ref` 截图，但不支持 CSS `--element` 截图。
- `--labels` 会在截图上叠加当前快照 ref。
- `snapshot --urls` 会将发现的链接目标附加到 AI 快照中，以便代理可以直接选择导航目标，而不是仅凭链接文本猜测。

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
```

操作响应会在由操作触发页面替换后返回当前原始 `targetId`，前提是 OpenClaw 能证明替换后的标签页。脚本仍应为长期工作流存储并传递 `suggestedTargetId`/标签。

文件 + 对话框辅助：

```bash
openclaw browser upload /tmp/openclaw/uploads/file.pdf --ref <ref>
openclaw browser waitfordownload
openclaw browser download <ref> report.pdf
openclaw browser dialog --accept
```

托管 Chrome 配置文件会将普通点击触发的下载保存到 OpenClaw 下载目录（默认 `/tmp/openclaw/downloads`，或已配置的临时根目录）。当代理需要等待特定文件并返回其路径时，请使用 `waitfordownload` 或 `download`；这些显式等待器拥有下一次下载。

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
openclaw browser --browser-profile chrome-live tabs
```

此路径仅适用于主机本地。对于 Docker、无头服务器、Browserless 或其他远程部署，请改用 CDP 配置文件。

当前 existing-session 限制：

- 基于快照的操作使用 ref，而不是 CSS 选择器
- 当调用方省略 `timeoutMs` 时，`browser.actionTimeoutMs` 会将受支持的 `act` 请求的默认超时时间设为 60000 ms；单次调用的 `timeoutMs` 仍然优先。
- `click` 仅支持左键点击
- `type` 不支持 `slowly=true`
- `press` 不支持 `delayMs`
- `hover`、`scrollintoview`、`drag`、`select`、`fill` 和 `evaluate` 不接受单次调用的超时覆盖
- `select` 仅支持一个值
- `wait --load networkidle` 不受支持
- 文件上传需要 `--ref` / `--input-ref`，不支持 CSS `--element`，且当前一次只支持一个文件
- 对话框钩子不支持 `--timeout`
- 截图支持整页捕获和 `--ref`，但不支持 CSS `--element`
- `responsebody`、下载拦截、PDF 导出和批量操作仍需要托管浏览器或原始 CDP 配置文件

## 远程浏览器控制（node host 代理）

如果 Gateway 运行在与浏览器不同的机器上，请在安装了 Chrome/Brave/Edge/Chromium 的机器上运行 **node host**。Gateway 会将浏览器操作代理到该 node（不需要单独的浏览器控制服务器）。

使用 `gateway.nodes.browser.mode` 控制自动路由，若连接了多个 node，则使用 `gateway.nodes.browser.node` 固定到特定 node。

安全与远程设置：[Browser tool](/tools/browser)、[Remote access](/gateway/remote)、[Tailscale](/gateway/tailscale)、[Security](/gateway/security)

## 相关

- [CLI 参考](/cli)
- [浏览器](/tools/browser)
