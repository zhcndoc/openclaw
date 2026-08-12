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

使用 **Quick Chat**，即可在不打开完整窗口的情况下，使用 Spotlight 风格的主会话输入框。默认按下 Option-Space（⌥Space），从菜单栏菜单中选择，或在 **设置 → 通用** 中录制其他快捷键。

完整的原生聊天支持通过选择器、粘贴以及拖放来添加图片附件。助手生成的图片会通过短期有效的
Gateway artifact URL 内联显示，并可在更大的预览中打开；iOS 和 macOS 共享同一套有界图片模型和渲染器。

只需要 CLI 和 Gateway？请从[开始使用](/start/getting-started)开始。

## 下载

从 [OpenClaw GitHub 发布页](https://github.com/openclaw/openclaw/releases) 获取 macOS 应用构建版本。
当某个发布包含 macOS 应用资源时，请查找：

- `OpenClaw-<version>.dmg`（首选）
- `OpenClaw-<version>.zip`

有些发布只包含 CLI、证据或 Windows 资源。如果最新发布
没有 macOS 应用资源，请使用最新的包含该资源的版本，或者通过
[macOS 开发环境设置](/platforms/mac/dev-setup) 从源代码构建。

## 首次运行

1. 安装并启动 **OpenClaw.app**。
2. 对于本地 Gateway，选择 **此 Mac**；或者连接到远程 Gateway。
3. 等待应用安装匹配的 CLI 运行时。在本地模式下，它还会
   安装并启动 Gateway。
4. 通过实时模型检查建立推理连接。如果应用复用了你不想使用的登录信息，请在成功横幅上选择
   **选择其他 AI**，以重新打开选择器，其中包括 API 密钥选项。
5. 完成。应用会打开仪表板，OpenClaw 将在一次对话中引导完成其余设置
   （导入记忆、频道、权限）。你可以随时从 **设置 → 权限** 授予 macOS 权限。

如果应用连接到一个现有 Gateway，且其默认 agent 已配置
模型，则会将该 Gateway 视为已完成设置，跳过 provider onboarding 和
OpenClaw，并打开仪表板。如果 Gateway 无法连接，或者其
默认 agent 没有模型，则仍可进行推理入门以便恢复。

对于 CLI/Gateway 设置路径，请使用 [入门指南](/start/getting-started)。
如需恢复权限，请使用 [macOS 权限](/platforms/mac/permissions)。

## 更新

仪表盘更新卡片会说明应用将更新的内容：

- **更新 Mac 应用 + Gateway** 表示已签名的应用拥有本地的 launchd
  Gateway。Sparkle 会先更新应用；重新启动后，应用会自动将其 Gateway 更新并重启到匹配的版本，然后验证连接。
- **更新 Gateway** 表示应用连接的是远程 Gateway、手动管理的本地 Gateway，或应用不拥有的其他安装实例。此按钮会运行该 Gateway 的常规更新流程，而不是更改 Mac 应用。

任一按钮都会先请求确认。只有在你选择**更新 Mac 应用并重新启动**后，卡片才会将更新交给应用处理，因此误点击不会启动
Sparkle。

协调更新失败后，应用会停留在设置样式的窗口中，并提供重试、[更新指南](/install/updating)和 Discord 操作。自动修复绝不会将较新的 Gateway
降级，也不会覆盖 `extended-stable` 通道固定设置。

成功更新后，应用会找到最近一次由人使用的、顶层的直接会话，并向该代理发送一次性的更新事件。心跳和 cron
活动不会影响这一选择。然后，代理可以从你最可能正在使用的对话中欢迎你回来。在远程模式下，应用只会更新本地 Mac 节点运行时，并且当远程 Gateway 版本比应用更旧时会跳过通知。

Sparkle 遵循 Gateway 的 `update.channel` 设置。`beta` 和 `dev` 会选择加入
beta 应用构建版本；`extended-stable` 只接受 extended-stable 应用版本，因此在没有匹配的应用版本时会保持静默。`stable`、缺失值和
未知值会继续使用 stable 应用构建版本。

## 打开仪表盘链接

在 macOS 应用内嵌的仪表盘中，点击外部网页链接会在可调整大小的浏览器侧边栏中打开页面，宽度为窗口的一半，同时保留仪表盘导航可见。拖动分隔线即可选择其他宽度；应用会记住该设置。每个链接都会在自己的标签页中打开；当打开多个页面时，标签栏会显示出来；再次点击同一链接时，会复用其现有标签页。拖动标签页即可重新排序；使用标签页关闭按钮或鼠标中键点击即可关闭标签页；右键单击标签页可选择 **在默认浏览器中打开**、**复制链接**、**重新加载**、**关闭标签页** 和 **关闭其他标签页**。窗口标题栏中的后退/前进控件以及触控板滑动手势可浏览仪表盘历史记录；侧边栏自身的后退/前进控件则用于浏览当前标签页的历史记录。侧边栏还提供重新加载、在默认浏览器中打开和关闭控件。

标题栏控件会随应用侧边栏变化：当侧边栏展开时，后退/前进按钮位于其右侧边缘，紧挨着侧边栏切换按钮；当侧边栏折叠时，它们则为搜索按钮（打开命令面板）和新会话按钮让出位置。

右键单击外部链接可选择 **在侧边栏中打开**、**在默认浏览器中打开** 或 **复制链接**。从仪表盘中进行的带修饰键点击，以及用户主动触发的新窗口链接，仍会在默认浏览器中打开；侧边栏内的新窗口链接会作为新的侧边栏标签页打开。普通浏览器承载的 Control UI 页面会保持浏览器默认的链接和上下文菜单行为。

## 导入浏览器登录信息

当应用在本地 Gateway 上运行时，浏览器侧边栏首次打开，如果 Mac 上存在带有 cookie 的 Chrome 系列配置文件，仪表板会显示一个可关闭的横幅。该横幅提供将这些 cookie 复制到一个隔离的受管配置文件中的选项，代理会使用该配置文件进行浏览。通过其 **导入** 控件选择一个配置文件（可能需要 Touch ID）；进度和已导入的 cookie 数量会以内联方式显示，并且只会复制 cookie——密码绝不会离开源浏览器。关闭该横幅会记录该选择；随时可通过 **设置 → 常规 → 浏览器登录 → 导入…** 重新显示。有关底层导入流程和 `browser.allowSystemProfileImport` 开关，请参阅 [Browser](/cli/browser)。

## 选择 Gateway 模式

| 模式   | 适用场景                                                                       | 详情页面                                           |
| ------ | ------------------------------------------------------------------------------ | -------------------------------------------------- |
| 本地   | 这台 Mac 应运行 Gateway，并由 launchd 保持其持续运行。                         | [macOS 上的 Gateway](/platforms/mac/bundled-gateway) |
| 远程   | 另一台主机运行 Gateway；这台 Mac 通过 SSH、LAN 或 Tailnet 对其进行控制。      | [远程控制](/platforms/mac/remote)                  |

两种模式都需要已安装 `openclaw` CLI，因为应用会复用其 node-host
运行时。在全新的 Mac 上，应用会自动安装匹配的 CLI；本地
模式随后会启动 Gateway 向导，而远程模式会连接到所选的
Gateway，而不会再启动第二个本地 Gateway。
有关手动恢复，请参见 [macOS 上的 Gateway](/platforms/mac/bundled-gateway)。

## 应用程序拥有的内容

- 菜单栏状态、通知、健康状态、WebChat 以及浮动的 Quick Chat 栏。
- macOS 针对屏幕、麦克风、语音、自动化和辅助功能的权限提示。
- 一个 Mac 节点，将原生 Canvas、摄像头/屏幕捕获、通知、位置和电脑控制，与 CLI 节点主机的系统、浏览器、插件、技能和 MCP 命令相结合。
- Mac 主机命令的执行批准提示。
- 经批准的 Shell 命令的应用上下文执行，同时保留应用的 macOS 权限归属，并由 CLI 运行时负责共享节点策略。
- 远程模式下的 SSH 隧道或直接 Gateway 连接。

在嵌入式控制界面中，**设置 → 通知**显示的是应用的原生通知权限，而不是浏览器推送权限，因为应用会以原生方式发送通知。

应用**不会**取代 Gateway 或通用 CLI 文档。Gateway 配置、提供商、插件、频道、工具和安全性都有各自的文档。

## macOS 详细页面

| 任务                                     | 阅读                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| 安装或调试 CLI／Gateway 服务             | [Gateway on macOS](/platforms/mac/bundled-gateway)                                          |
| 避免将状态存储在云同步文件夹中           | [Gateway on macOS](/platforms/mac/bundled-gateway#state-directory-on-macos)                 |
| 调试应用发现和连接                       | [Gateway on macOS](/platforms/mac/bundled-gateway#debug-app-connectivity)                   |
| 了解 launchd 行为                        | [Gateway on macOS](/platforms/mac/bundled-gateway)                                          |
| 修复权限或签名／TCC 问题                 | [macOS permissions](/platforms/mac/permissions)                                             |
| 检测你最近使用的 Mac                     | [Active computer presence](/nodes/presence)                                                 |
| 连接到远程 Gateway                       | [Remote control](/platforms/mac/remote)                                                     |
| 读取菜单栏状态和健康检查                 | [Menu bar](/platforms/mac/menu-bar)、[Health checks](/platforms/mac/health)                 |
| 使用内嵌聊天 UI                          | [WebChat](/platforms/mac/webchat)                                                           |
| 使用语音唤醒或按键通话                   | [Voice wake](/platforms/mac/voicewake)                                                      |
| 使用 Canvas 和 Canvas 深层链接            | [Canvas](/platforms/mac/canvas)                                                             |
| 为 UI 自动化托管 PeekabooBridge           | [Peekaboo bridge](/platforms/mac/peekaboo)                                                  |
| 配置命令审批                             | [Exec approvals](/tools/exec-approvals)、[advanced details](/tools/exec-approvals-advanced) |
| 检查 Mac 节点命令和应用 IPC              | [macOS IPC](/platforms/mac/xpc)                                                             |
| 捕获日志                                 | [macOS logging](/platforms/mac/logging)                                                     |
| 从源代码构建                             | [macOS dev setup](/platforms/mac/dev-setup)                                                 |

## 相关内容

- [平台](/platforms)
- [入门指南](/start/getting-started)
- [网关](/gateway)
- [执行审批](/tools/exec-approvals)
