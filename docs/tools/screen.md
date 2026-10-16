---
summary: "让代理安排已连接的 Control UI"
title: "屏幕"
sidebarTitle: "屏幕"
read_when:
  - "你希望代理拆分、聚焦、关闭或导航 Control UI 面板"
  - "你希望代理显示或隐藏侧边栏、终端或浏览器面板"
  - "您需要 ui.command 功能和请求者路由合同"
---

`screen` 工具允许代理安排基于浏览器的 Control UI。它是一个带类型的布局和导航界面，而不是截图捕获或浏览器自动化。

仅当原始客户端通告 `ui-commands` 功能时，该工具才会公开。当工具运行时，所选人员的请求Control UI必须仍然处于连接状态；否则网关返回 `UNAVAILABLE`。

客户端在网关连接握手期间发送的 `caps` 数组中通告 `ui-commands`（请参阅 [ 网关协议 ](/gateway/protocol/rpc-methods#rpc-method-families)）。捆绑的 Control UI 已经对其进行了广告，因此无需打开任何内容。不做广告的客户端永远不会获得 `screen`，因此该工具不存在，而不是在调用时失败。

## <a id="actions"></a> 操作

| 操作                            | 作用                                     | 可选输入                                         |
| --------------------------------- | ------------------------------------------ | ------------------------------------------------------- |
| `split_right`                     | 将目标会话面板向右拆分 | `sessionKey`（默认当前会话）          |
| `split_down`                      | 将目标会话面板向下拆分     | `sessionKey`（默认当前会话）          |
| `close_pane`                      | 关闭目标会话面板              | `sessionKey`（默认当前会话）          |
| `focus`                           | 聚焦目标会话面板              | `sessionKey`（默认当前会话）          |
| `navigate`                        | 打开目标会话                    | `sessionKey`（默认当前会话）          |
| `sidebar_show` / `sidebar_hide`   | 显示或隐藏主侧边栏              | -                                                       |
| `terminal_show` / `terminal_hide` | 显示或隐藏操作员终端面板   | 显示时使用 `dock`（`bottom` 或 `right`）               |
| `browser_show` / `browser_hide`   | 显示或隐藏浏览器面板             | 显示时使用 `dock`（`bottom` 或 `right`）               |
| `desktop_show` / `desktop_hide`   | 显示或隐藏远程桌面              | `environmentId`、`sessionKey`、`dock`（默认`right`） |
| `portal_show` / `portal_hide`     | 显示或隐藏 Web 应用程序门户      | `portalId`、`sessionKey`、`dock`（默认`right`）      |

每个操作都接受可选的 `user`，即来自 Control UI 消息对话上下文的人员验证的 `requester_profile.id`。当多人转向时，需要`user`；智能体选择询问的人或不清楚的情况询问他们。

对于在附加环境上运行的本机应用程序，请将 `desktop_show` 与其 `environmentId` 一起使用。对于 Web 应用程序，打开服务器端口的门户，然后将 `portal_show` 与返回的 `portalId` 一起使用。所选视图将在该对话的侧面板中打开。隐藏视图不会停止其应用程序、关闭门户或释放环境。

桌面面板和计算机工具适用于相同的环境。 `screen`仅呈现；计算机工具执行点击、打字和屏幕截图。

环境可能会在配置完成之前出现。桌面会显示启动进度，并在该机器可用时进行连接。 `portal_show`在应用程序启动时可以使用`environmentId`；准备好后将其替换为应用程序的 `portalId`。待处理的门户永远不会从门户列表中打开另一个应用程序。

在网关将键入的 `ui.command` 事件发送到请求浏览器后，成功的命令将返回 `{ "ok": true }`。

## <a id="routing-and-security"></a> 路由与安全

命令仅更改所选人员的请求 Control UI 连接。其他人的仪表板和您的其他选项卡保留其当前视图。 `sessionKey`选择打开哪个会话；它不选择收件人。

网关在接受消息时捕获浏览器目标，并将其保留在排队轮次和工作线程执行中。如果该浏览器断开连接或轮次没有 Control UI 目标，则该命令将失败并显示 `UNAVAILABLE`。再从打开的Control UI处询问；该命令永远不会退回到广播。

具有匹配权限的人可以驾驶同一个转弯。每个参与者都保留自己捕获的浏览器目标； `user` 只能选择回合的所有者或接受的参与者。排队或拒绝的引导不会添加参与者。如果所选人员的访问权限已更改，他们必须再次询问。

以前使用 `ui.command` 进行广播的独立 RPC 和 MCP 调用者必须从请求的 Control UI 连接或在那里启动的代理轮流调用它。如果没有该浏览器目标，即使连接了其他仪表板，他们现在也会收到 `UNAVAILABLE`。这有意取代了传统的广播合同。

Gateway RPC 需要 `operator.write`。该工具只能更改展示状态：它不能读取像素、截取屏幕、点击任意页面内容，也不能绕过所选会话和操作员面板的权限。

## <a id="related"></a> 相关内容

- [控制 UI](/web/control-ui)
- [网关协议](/gateway/protocol/rpc-methods#rpc-method-families)
- [浏览器工具](/tools/browser)
