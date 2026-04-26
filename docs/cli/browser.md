---
summary: "`openclaw browser` 的 CLI 参考（生命周期、配置文件、标签页、动作、状态和调试）"
read_when:
  - 你使用 `openclaw browser`，并希望查看常见任务示例
  - 你想通过 node 主机控制运行在另一台机器上的浏览器
  - 你想通过 Chrome MCP 附加到本地已登录的 Chrome
title: "Browser"
---

# `openclaw browser`

管理 OpenClaw 的浏览器控制界面并运行浏览器动作（生命周期、配置文件、标签页、快照、截图、导航、输入、状态模拟和调试）。

相关链接：

- 浏览器工具 + API：[Browser 工具](/tools/browser)

## 常用参数

- `--url <gatewayWsUrl>`: Gateway WebSocket URL（默认取自配置）。
- `--token <token>`: Gateway 令牌（如果需要）。
- `--timeout <ms>`: 请求超时（毫秒）。
- `--expect-final`: 等待最终的 Gateway 响应。
- `--browser-profile <name>`: 选择浏览器配置文件（默认取自配置）。
- `--json`: 机器可读输出（支持的情况下）。

## 快速开始（本地）

```bash
openclaw browser profiles
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

Agents can run the same readiness check with `browser({ action: "doctor" })`.

## 快速故障排查

如果 `start` 因 `not reachable after start` 失败，请先排查 CDP 就绪性。如果 `start` 和 `tabs` 成功，但 `open` 或 `navigate` 失败，则浏览器控制平面是健康的，失败通常是导航 SSRF 策略导致的。

最小序列：

```bash
openclaw browser --browser-profile openclaw doctor
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

详细指导：[Browser troubleshooting](/tools/browser#cdp-startup-failure-vs-navigation-ssrf-block)

## 生命周期

```bash
openclaw browser status
openclaw browser doctor
openclaw browser start
openclaw browser stop
openclaw browser --browser-profile openclaw reset-profile
```

注意：

- 对于 `attachOnly` 和远程 CDP 配置文件，`openclaw browser stop` 会关闭活动控制会话并清除临时模拟覆盖，即使 OpenClaw 本身没有启动浏览器进程。
- 对于本地管理的配置文件，`openclaw browser stop` 会停止生成的浏览器进程。

## 如果命令缺失

如果 `openclaw browser` 是未知命令，请检查 `~/.openclaw/openclaw.json` 中的 `plugins.allow`。

当存在 `plugins.allow` 时，必须明确列出捆绑的浏览器插件：

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

`browser.enabled=true` 在插件允许列表排除 `browser` 时不会恢复 CLI 子命令。

相关：[Browser 工具](/tools/browser#missing-browser-command-or-tool)

## 配置文件

配置文件是有名称的浏览器路由配置。实践中：

- `openclaw`：启动或附加到由 OpenClaw 管理的专用 Chrome 实例（隔离的用户数据目录）。
- `user`：通过 Chrome DevTools MCP 控制你现有的已登录 Chrome 会话。
- 自定义 CDP 配置文件：指向本地或远程的 CDP 端点。

```bash
openclaw browser profiles
openclaw browser create-profile --name work --color "#FF5A36"
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name remote --cdp-url https://browser-host.example.com
openclaw browser delete-profile --name work
```

指定使用某个配置文件：

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

`tabs` 首先返回 `suggestedTargetId`，然后是稳定的 `tabId`，例如 `t1`，
可选标签，以及原始 `targetId`。Agents 应将 `suggestedTargetId` 传回
`focus`、`close`、快照和动作中。你可以使用 `open --label`、`tab new --label` 或 `tab label`
分配标签；标签、tab id、原始 target id，以及唯一的 target-id 前缀都可以接受。

## 快照 / 截图 / 动作

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

注意：

- `--full-page` 仅适用于页面捕获；它不能与 `--ref`
  或 `--element` 一起使用。
- `existing-session` / `user` 配置文件支持页面截图以及来自快照输出的
  `--ref` 截图，但不支持 CSS `--element` 截图。
- `--labels` 会在截图上叠加当前快照 refs。
- `snapshot --urls` 会将发现的链接目标附加到 AI 快照中，这样
  agents 就可以选择直接导航目标，而不是仅凭链接文本猜测。

导航/点击/输入（基于 ref 的 UI 自动化）：

```bash
openclaw browser navigate https://example.com
openclaw browser click <ref>
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

文件 + 对话框辅助：

```bash
openclaw browser upload /tmp/openclaw/uploads/file.pdf --ref <ref>
openclaw browser waitfordownload
openclaw browser download <ref> report.pdf
openclaw browser dialog --accept
```

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

Cookies + 存储：

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

## 通过 MCP 控制现有 Chrome

使用内置的 `user` 配置文件，或创建你自己的 `existing-session` 配置文件：

```bash
openclaw browser --browser-profile user tabs
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name brave-live --driver existing-session --user-data-dir "~/Library/Application Support/BraveSoftware/Brave-Browser"
openclaw browser --browser-profile chrome-live tabs
```

此路径只适用于主机。对于 Docker、无头服务器、Browserless 或其他远程设置，请使用 CDP 配置文件。

当前 existing-session 限制：

- 快照驱动的动作使用 refs，而不是 CSS 选择器
- `click` 仅限左键点击
- `type` 不支持 `slowly=true`
- `press` 不支持 `delayMs`
- `hover`, `scrollintoview`, `drag`, `select`, `fill`, 和 `evaluate` 拒绝每次调用的超时覆盖
- `select` 仅支持一个值
- 不支持 `wait --load networkidle`
- 文件上传需要 `--ref` / `--input-ref`，不支持 CSS `--element`，且目前一次仅支持一个文件
- 对话框钩子不支持 `--timeout`
- 截图支持页面捕获和 `--ref`，但不支持 CSS `--element`
- `responsebody`、下载拦截、PDF 导出和批量动作仍然需要管理的浏览器或原始 CDP 配置文件

## 远程浏览器控制（节点主机代理）

若 Gateway 运行在与浏览器不同的机器上，则在具备 Chrome/Brave/Edge/Chromium 的机器上运行一个**节点主机**。Gateway 会将浏览器操作代理到该节点（无需单独的浏览器控制服务器）。

使用 `gateway.nodes.browser.mode` 控制自动路由，使用 `gateway.nodes.browser.node` 固定特定节点（如果连接了多个）。

安全 + 远程设置：[Browser tool](/tools/browser), [Remote access](/gateway/remote), [Tailscale](/gateway/tailscale), [Security](/gateway/security)

## 相关

- [CLI 参考](/cli)
- [Browser](/tools/browser)
