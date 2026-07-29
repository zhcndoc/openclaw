---
summary: "安装并使用 OpenClaw macOS 菜单栏应用"
read_when:
  - 安装 macOS 应用
  - 在 macOS 上决定使用本地还是远程 Gateway 模式
  - 查找 macOS 应用发布下载
title: "macOS 应用"
---

macOS 应用是 OpenClaw 的 **菜单栏伴侣**：原生托盘界面、macOS
权限提示、通知、WebChat、语音输入、Canvas，以及
由 Mac 托管的节点工具，例如 `system.run`。

Use **Quick Chat** for a Spotlight-style main-session composer without opening a full window. Press Option-Space (⌥Space) by default, choose it from the menu bar menu, or record another shortcut in **Settings → General**.

The full native chat accepts image attachments through its picker, paste, and
drag and drop. Assistant-generated images render inline through short-lived
Gateway artifact URLs and open in a larger preview; iOS and macOS share the same
bounded image model and renderer.

Only need the CLI and Gateway? Start with [Getting started](/start/getting-started).

## 下载

从 [OpenClaw GitHub releases](https://github.com/openclaw/openclaw/releases) 获取 macOS 应用构建版本。
当某个发布包含 macOS 应用资源时，请查找：

- `OpenClaw-<version>.dmg`（首选）
- `OpenClaw-<version>.zip`

有些发布只包含 CLI、证据或 Windows 资源。如果最新发布
没有 macOS 应用资源，请使用最新的包含该资源的版本，或者通过
[macOS 开发环境设置](/platforms/mac/dev-setup) 从源代码构建。

## 首次运行

1. 安装并启动 **OpenClaw.app**。
2. 选择 **This Mac** 作为本地 Gateway，或连接到远程 Gateway。
3. 等待应用安装匹配的 CLI 运行时。在本地模式下，它还会
   安装并启动 Gateway。
4. 通过实时模型检查建立推理。通过后，OpenClaw 会处理剩余的设置。
5. 完成 macOS 权限清单，并发送入门测试消息。

如果应用连接到一个现有 Gateway，且其默认 agent 已配置
模型，则会将该 Gateway 视为已完成设置，跳过 provider onboarding 和
OpenClaw，并打开仪表板。如果 Gateway 无法连接，或者其
默认 agent 没有模型，则仍可进行推理入门以便恢复。

对于 CLI/Gateway 设置路径，请使用 [入门指南](/start/getting-started)。
如需恢复权限，请使用 [macOS 权限](/platforms/mac/permissions)。

## 更新

The dashboard update card names what the app will update:

- **Update Mac app + Gateway** means the signed app owns the local launchd
  Gateway. Sparkle updates the app first; after relaunch, the app automatically
  updates and restarts its Gateway at the matching version, then verifies the
  connection.
- **Update Gateway** means the app is connected to a remote Gateway, a manually
  managed local Gateway, or another install the app does not own. The button
  runs that Gateway's normal update flow instead of changing the Mac app.

A failed coordinated update stays in its setup-style window with retry,
[update guide](/install/updating), and Discord actions. Automatic repair never
downgrades a newer Gateway or overrides an `extended-stable` channel pin.

成功更新后，应用会找到最近一次由人使用的、顶层的直接会话，并向该代理发送一次性的更新事件。心跳和 cron
活动不会影响这一选择。然后，代理可以从你最可能正在使用的对话中欢迎你回来。在远程模式下，应用只会更新本地 Mac 节点运行时，并且当远程 Gateway 版本比应用更旧时会跳过通知。

Sparkle 遵循 Gateway 的 `update.channel` 设置。`beta` 和 `dev` 会启用 beta 应用构建；`stable`、`extended-stable`，以及缺失或未知的值都会保持在 stable 应用构建上。

## 打开仪表盘链接

In the macOS app's embedded dashboard, clicking an external web link opens it in a resizable browser sidebar at half the window width while keeping the dashboard navigation visible. Drag the divider to choose another width; the app remembers it. Each link opens in its own tab, the tab strip appears when multiple pages are open, and clicking the same link again reuses its existing tab. Drag tabs to reorder them, close them with the tab close button or a middle-click, and right-click a tab for **Open in Default Browser**, **Copy Link**, **Reload**, **Close Tab**, and **Close Other Tabs**. The window's titlebar back/forward controls and trackpad swipes navigate dashboard history; the sidebar's own back/forward controls navigate the active tab's history. The sidebar also has reload, open-in-default-browser, and close controls.

标题栏控件会随应用侧边栏变化：当侧边栏展开时，后退/前进按钮位于其右侧边缘，紧挨着侧边栏切换按钮；当侧边栏折叠时，它们则为搜索按钮（打开命令面板）和新会话按钮让出位置。

右键单击外部链接可选择 **在侧边栏中打开**、**在默认浏览器中打开** 或 **复制链接**。从仪表盘中进行的带修饰键点击，以及用户主动触发的新窗口链接，仍会在默认浏览器中打开；侧边栏内的新窗口链接会作为新的侧边栏标签页打开。普通浏览器承载的 Control UI 页面会保持浏览器默认的链接和上下文菜单行为。

## 导入浏览器登录信息

当应用在本地 Gateway 上运行时，浏览器侧边栏首次打开，如果 Mac 上存在带有 cookie 的 Chrome 系列配置文件，仪表板会显示一个可关闭的横幅。该横幅提供将这些 cookie 复制到一个隔离的受管配置文件中的选项，代理会使用该配置文件进行浏览。通过其 **导入** 控件选择一个配置文件（可能需要 Touch ID）；进度和已导入的 cookie 数量会以内联方式显示，并且只会复制 cookie——密码绝不会离开源浏览器。关闭该横幅会记录该选择；随时可通过 **设置 → 常规 → 浏览器登录 → 导入…** 重新显示。有关底层导入流程和 `browser.allowSystemProfileImport` 开关，请参阅 [Browser](/cli/browser)。

## 选择 Gateway 模式

| 模式   | 适用场景                                                                       | 详情页面                                           |
| ------ | ------------------------------------------------------------------------------ | -------------------------------------------------- |
| 本地   | 这台 Mac 应运行 Gateway，并由 launchd 保持其持续运行。                         | [macOS 上的 Gateway](/platforms/mac/bundled-gateway) |
| 远程   | 另一台主机运行 Gateway；这台 Mac 通过 SSH、LAN 或 Tailnet 对其进行控制。      | [远程控制](/platforms/mac/remote)                  |

两种模式都需要已安装的 `openclaw` CLI，因为应用会复用其 node-host
运行时。在全新的 Mac 上，应用会自动安装匹配的 CLI；本地
模式随后会启动 Gateway 向导，而远程模式会连接到所选的
Gateway，而不会再启动第二个本地 Gateway。
有关手动恢复，请参见 [macOS 上的 Gateway](/platforms/mac/bundled-gateway)。

## 应用程序拥有的内容

- Menu bar status, notifications, health, WebChat, and the floating Quick Chat bar.
- macOS permission prompts for screen, microphone, speech, automation, and accessibility.
- One Mac node that combines native Canvas, camera/screen capture, notifications,
  location, and computer control with the CLI node host's system, browser,
  plugin, skill, and MCP commands.
- Exec approval prompts for Mac-hosted commands.
- App-context execution for approved shell commands, preserving the app's macOS
  permission attribution while the CLI runtime owns shared node policy.
- Remote-mode SSH tunnels or direct Gateway connections.

In the embedded Control UI, **Settings → Notifications** shows the app's native
notification permission instead of browser push because the app delivers notifications natively.

The app does **not** replace the Gateway or general CLI docs. Gateway
configuration, providers, plugins, channels, tools, and security live in their
own docs.

## macOS 详细页面

| 任务                                     | 阅读                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| 安装或调试 CLI/Gateway 服务 | [macOS 上的 Gateway](/platforms/mac/bundled-gateway)                                          |
| 将状态保留在非云同步文件夹中   | [macOS 上的 Gateway](/platforms/mac/bundled-gateway#state-directory-on-macos)                 |
| 调试应用发现和连接性     | [macOS 上的 Gateway](/platforms/mac/bundled-gateway#debug-app-connectivity)                   |
| 了解 launchd 行为              | [Gateway 生命周期](/platforms/mac/child-process)                                           |
| 修复权限或签名/TCC 问题    | [macOS 权限](/platforms/mac/permissions)                                             |
| 检测你最近使用的 Mac    | [活跃计算机存在](/nodes/presence)                                                 |
| 连接到远程 Gateway              | [远程控制](/platforms/mac/remote)                                                     |
| 读取菜单栏状态和健康检查   | [菜单栏](/platforms/mac/menu-bar), [健康检查](/platforms/mac/health)                 |
| 使用内置聊天 UI                 | [WebChat](/platforms/mac/webchat)                                                           |
| 使用语音唤醒或按键说话           | [语音唤醒](/platforms/mac/voicewake)                                                      |
| 使用 Canvas 和 Canvas 深度链接         | [Canvas](/platforms/mac/canvas)                                                             |
| 托管用于 UI 自动化的 PeekabooBridge    | [Peekaboo 桥接](/platforms/mac/peekaboo)                                                  |
| 配置命令审批              | [执行审批](/tools/exec-approvals), [高级详情](/tools/exec-approvals-advanced) |
| 检查 Mac 节点命令和应用 IPC    | [macOS IPC](/platforms/mac/xpc)                                                             |
| 捕获日志                             | [macOS 日志记录](/platforms/mac/logging)                                                     |
| 从源码构建                        | [macOS 开发设置](/platforms/mac/dev-setup)                                                 |

## 相关内容

- [平台](/platforms)
- [入门指南](/start/getting-started)
- [网关](/gateway)
- [执行审批](/tools/exec-approvals)
