---
summary: "`openclaw browser` 的命令行参考（配置文件、标签页、操作、Chrome MCP 和 CDP）"
read_when:
  - 你使用 `openclaw browser` 并想查看常见任务示例
  - 你想通过节点主机控制运行在另一台机器上的浏览器
  - 你想通过 Chrome MCP 附加到本地已登录的 Chrome
title: "browser"
---

# `openclaw browser`

管理 OpenClaw 的浏览器控制服务器并执行浏览器操作（标签页、快照、截图、导航、点击、输入）。

相关链接：

- 浏览器工具 + API：[Browser tool](/tools/browser)

## 常用参数

- `--url <gatewayWsUrl>`：Gateway WebSocket URL（默认为配置中设置）。
- `--token <token>`：Gateway 令牌（如果需要）。
- `--timeout <ms>`：请求超时（毫秒）。
- `--browser-profile <name>`：选择浏览器配置文件（默认来自配置）。
- `--json`：机器可读的输出（支持时）。

## 快速开始（本地）

```bash
openclaw browser profiles
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

## 配置文件

配置文件是有名称的浏览器路由配置。实践中：

- `openclaw`：启动或附加到由 OpenClaw 管理的专用 Chrome 实例（隔离的用户数据目录）。
- `user`：通过 Chrome DevTools MCP 控制你现有的已登录 Chrome 会话。
- 自定义 CDP 配置文件：指向本地或远程的 CDP 端点。

```bash
openclaw browser profiles
openclaw browser create-profile --name work --color "#FF5A36"
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser delete-profile --name work
```

指定使用某个配置文件：

```bash
openclaw browser --browser-profile work tabs
```

## 标签页

```bash
openclaw browser tabs
openclaw browser open https://docs.openclaw.ai
openclaw browser focus <targetId>
openclaw browser close <targetId>
```

## 快照 / 截图 / 动作

快照：

```bash
openclaw browser snapshot
```

截图：

```bash
openclaw browser screenshot
```

导航/点击/输入（基于引用的 UI 自动化）：

```bash
openclaw browser navigate https://example.com
openclaw browser click <ref>
openclaw browser type <ref> "hello"
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

## 远程浏览器控制（节点主机代理）

若 Gateway 运行在与浏览器不同的机器上，则在具备 Chrome/Brave/Edge/Chromium 的机器上运行一个**节点主机**。Gateway 会将浏览器操作代理到该节点（无需单独的浏览器控制服务器）。

使用 `gateway.nodes.browser.mode` 控制自动路由，使用 `gateway.nodes.browser.node` 固定特定节点（如果连接了多个）。

安全性 + 远程设置：[Browser tool](/tools/browser), [Remote access](/gateway/remote), [Tailscale](/gateway/tailscale), [Security](/gateway/security)
