---
summary: "Omarchy 上的 OpenClaw：酒吧插件、桌面应用程序切换和支持"
read_when:
  - "在 Omarchy 上安装 OpenClaw bar 插件"
  - "使用 Omarchy 栏中的代理、会话和快速提示"
  - "对重复的 OpenClaw 图标或桌面连接切换进行故障排除"
title: "奥马奇"
---

# <a id="openclaw-on-omarchy"></a> Omarchy 上的 OpenClaw

OpenClaw Omarchy 插件将代理、最近的会话和快速提示放在桌面栏中。它的单色吉祥物遵循 shell 主题，闪烁并根据报告的代理活动进行动画处理。当 Linux 桌面应用程序运行时，该插件将成为单个栏条目并使用该应用程序的主网关。

本页介绍了 OpenClaw 源代码树中的插件。单独安装；不要假设较旧的桌面版本包含匹配的集成。有关网关安装和桌面应用程序本身，请参阅 [Linux](/platforms/linux)。

## <a id="requirements"></a> 要求

- Omarchy 4 及其 Quickshell 栏和插件支持。早期基于 Waybar 的 Omarchy 版本不提供此插件主机。
- Python 3 和 PyGObject 用于桌面会话的 D-Bus 连接。
- E可以是具有 Omarchy 集成的连接 OpenClaw Linux 桌面应用程序，也可以是具有已配置、可访问的网关并支持 `openclaw gateway call --expect-url` 的 `openclaw` CLI。使用包含此集成的 CLI 版本；较旧的版本可能不支持该选项。

桌面应用程序是可选的。该插件从 `OPENCLAW_DESKTOP_CLI` 解析 CLI，然后解析 `~/.openclaw/bin/openclaw`，然后解析图形会话的 `PATH`。它不会在后台安装或启动网关。使用现有的 OpenClaw 安装和身份验证。在独立模式下，插件通过 `openclaw status --json` 识别选定的网关，并在每次请求之前检查该目标。如果状态编辑端点 URL，则独立模式无法建立目标并禁用请求。使用桌面应用程序进行该连接。

## <a id="install-the-bar-plugin"></a> 安装bar插件

从包含 `apps/linux/omarchy` 的 OpenClaw 源签出中，运行：

```bash
bash apps/linux/omarchy/install.sh
```

安装程序将插件放置在您的用户配置中。检查一下：

```bash
omarchy plugin validate ~/.config/omarchy/plugins/openclaw.desktop
omarchy plugin enable openclaw.desktop
```

单击 OpenClaw 吉祥物。在发送提示之前，请确认面板显示预期的代理和会话。使用桌面应用程序时，首先将您想要的网关设置为主要网关。

## <a id="use-agents%2C-sessions%2C-and-quick-prompts"></a><a id="use-agents-sessions-and-quick-prompts"></a> 使用代理、会话和快速提示

选择代理、搜索会话，或使用 **All**、**Active** 和 **Attention** 过滤器。会话卡显示最近的消息或活动、状态以及可用模型和令牌详细信息。搜索和计数涵盖加载的会话；打开仪表板以获取完整历史记录。

单击一个会话以将其定位，然后使用 **Open session** 在桌面应用程序中继续。如果没有该应用程序，该插件将在 TUI 中打开会话。选择 **New session** 以启动与所选座席的单独对话。

- **Ctrl+L** 聚焦**快速提示**。
- **Ctrl+Enter** 发送。 **Enter** 插入换行符。
- **Esc** 关闭面板。
- 中键单击吉祥物进行刷新。

提示限制为 8,000 个字符。接受发送意味着网关接受了该工作；观看会话以了解结果。如果发送结果未知，请在再次发送之前检查会话。该插件不会自动重试不确定的发送。草稿存在于内存中，并且不会在 shell 重新启动后继续存在。

**H隐藏预览** 隐藏会话标题、活动和消息预览。代理名称、模型和渠道仍然可见。注意徽章总结了报告的会话活动；它不是批准收件箱。打开仪表板以查看批准情况。

## <a id="one-icon-with-the-desktop-app"></a> 带有桌面应用程序的一个图标

| 跑步                         | 酒吧行为                                                             |
| ------------------------------- | ------------------------------------------------------------------------ |
| 仅插件                     | 该插件通过配置的 CLI 显示会话。                    |
| 仅桌面应用程序                | 桌面应用程序显示其正常的托盘图标。                              |
| 两者都具有匹配的集成 | 该插件保持可见，并且应用程序隐藏其重复的托盘图标。      |
| 没有集成的旧应用程序   | 当插件识别出应用程序的会话总线注册时，它就会产生。 |

当两者都连接时，会话操作和快速提示使用桌面应用程序的主网关，包括远程连接。打开会话会聚焦或打开其主仪表板窗口。将仪表板切换到另一个已保存的网关会保持此连接不变。如果应用程序断开连接，插件会显示连接问题并禁用发送，而不是切换到其他 CLI 网关。

如果网关发生变化，插件会清除之前的会话选择并保留您的草稿。选择**使用此网关** 在发送前确认新目标。已提交的提示仍与其原始路线绑定。

禁用插件以恢复应用程序的托盘图标：

```bash
omarchy plugin disable openclaw.desktop
```

插件停止响应后，应用程序还会恢复其图标。当检测到插件消失时，这可能需要很短的时间间隔。

## <a id="updates"></a> 更新

通过拥有它的安装来更新每个组件：shell 的 Omarchy 更新程序、桌面应用程序支持的应用程序更新流程以及 CLI 和网关的现有 OpenClaw 更新程序。更新源签出后，重新运行插件安装程序以更新其已安装的副本。有关网关更新指南，请参阅 [Updating](/install/updating)。

## <a id="troubleshooting-and-support"></a> 故障排除和支持

| 症状                                    | 检查                                                                                                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 没有插件图标                             | 使用上面的命令验证并启用插件。较旧的正在运行的桌面应用程序可能拥有可见的图标。                                      |
| 两个 OpenClaw 图标                         | 将插件和桌面应用程序更新到具有集成的版本。它们必须在同一桌面用户会话中运行。                             |
| 找不到 CLI                              | 检查 `OPENCLAW_DESKTOP_CLI`、`~/.openclaw/bin/openclaw` 或图形会话的 `PATH`。通过正常的 OpenClaw 安装路径进行安装。 |
| 桌面连接不可用             | 打开桌面应用程序并重新连接到其主网关。在那里解决身份验证或配对问题。                                                  |
| 会话看起来陈旧或发送已禁用 | 刷新面板，检查连接错误。该插件在刷新失败后保留缓存的结果。                                          |
| 可能已发送提示                | 打开目标会话并在重新提交之前检查其最新消息。                                                                         |

该集成针对 Omarchy 4 的 Quickshell 环境。其他酒吧、较旧的 Omarchy 版本和其他桌面会话需要自己的集成；通过的模拟网关测试不会与这些主机建立兼容性。该插件对网关活动进行采样，而不是流式传输每个事件。桌面应用程序限制（包括 Wayland 全局快捷方式）记录在 [Linux 指南](/platforms/linux#quick-chat) 中。

如需设置帮助，请使用 [OpenClaw support](/help)。对于可重现的插件或切换缺陷，请使用 Omarchy、plugin/source、桌面应用程序和网关版本提交 [OpenClaw 错误报告](https://github.com/openclaw/openclaw/issues/new?template=bug_report.yml)；网关是本地还是远程；以及重现的步骤。在共享之前，从日志或屏幕截图中删除凭据和私人会话内容。
