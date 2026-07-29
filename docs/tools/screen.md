---
summary: "让代理安排已连接的 Control UI"
title: "屏幕"
sidebarTitle: "屏幕"
read_when:
  - 你希望代理拆分、聚焦、关闭或导航 Control UI 面板
  - 你希望代理显示或隐藏侧边栏、终端或浏览器面板
  - 你需要 ui.command 能力和 fan-out 协议
---

`screen` 工具允许代理安排基于浏览器的 Control UI。它是一个
带类型的布局和导航界面，而不是截图捕获或浏览器
自动化。

该工具仅在发起客户端声明了
`ui-commands` 能力时才会暴露。运行该工具时，至少仍需连接一个具备该能力的 Control UI；否则 Gateway 将返回 `UNAVAILABLE`。

## 操作

| 操作                              | 效果                                       | 可选输入                                        |
| --------------------------------- | ------------------------------------------ | ---------------------------------------------- |
| `split_right`                     | 将目标会话面板向右拆分                       | `sessionKey`（默认当前会话）                  |
| `split_down`                      | 将目标会话面板向下拆分                       | `sessionKey`（默认当前会话）                  |
| `close_pane`                      | 关闭目标会话面板                             | `sessionKey`（默认当前会话）                  |
| `focus`                           | 聚焦目标会话面板                             | `sessionKey`（默认当前会话）                  |
| `navigate`                        | 打开目标会话                                 | `sessionKey`（默认当前会话）                  |
| `sidebar_show` / `sidebar_hide`   | 显示或隐藏主侧边栏                           | -                                              |
| `terminal_show` / `terminal_hide` | 显示或隐藏操作员终端面板                     | 显示时使用 `dock`（`bottom` 或 `right`）       |
| `browser_show` / `browser_hide`   | 显示或隐藏浏览器面板                         | 显示时使用 `dock`（`bottom` 或 `right`）       |

当 Gateway 广播所输入的 `ui.command` 事件后，成功的命令会返回 `{ "ok": true }`。

## 路由与安全

Protocol v1 会有意将命令发送给每个已连接且声明了 `ui-commands` 的 Control UI；它不会只针对某一个浏览器标签页。这一点在同一操作员打开了多个仪表板时尤为重要。

Gateway RPC 需要 `operator.write`。该工具只能更改展示状态：它不能读取像素、截取屏幕、点击任意页面内容，也不能绕过所选会话和操作员面板的权限。

## 相关

- [控制 UI](/web/control-ui)
- [网关协议](/gateway/protocol#method-families)
- [浏览器工具](/tools/browser)
