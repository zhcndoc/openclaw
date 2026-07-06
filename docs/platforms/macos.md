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

只需要 CLI 和 Gateway？从 [Getting started](/start/getting-started) 开始。

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
3. 本地模式：等待应用安装其用户空间运行时和 Gateway。
4. 完成提供商设置和 macOS 权限检查清单。
5. 发送入门测试消息。

对于 CLI/Gateway 设置路径，请使用 [入门指南](/start/getting-started)。
如需恢复权限，请使用 [macOS 权限](/platforms/mac/permissions)。

## 选择网关模式

| 模式   | 适用场景                                                                       | 详情页面                                           |
| ------ | ------------------------------------------------------------------------------ | -------------------------------------------------- |
| 本地   | 这台 Mac 应运行 Gateway，并由 launchd 保持其持续运行。                         | [macOS 上的 Gateway](/platforms/mac/bundled-gateway) |
| 远程   | 另一台主机运行 Gateway；这台 Mac 通过 SSH、LAN 或 Tailnet 对其进行控制。      | [远程控制](/platforms/mac/remote)                  |

本地模式需要已安装的 `openclaw` CLI。在一台全新的 Mac 上，应用会在启动 Gateway 向导之前自动安装匹配的 CLI 和运行时。有关手动恢复，请参见 [macOS 上的 Gateway](/platforms/mac/bundled-gateway)。

## 应用程序拥有的内容

- 菜单栏状态、通知、健康状态和 WebChat。
- macOS 对屏幕、麦克风、语音、自动化和辅助功能的权限提示。
- 本地节点工具：Canvas、摄像头/屏幕捕获、通知，以及 `system.run`。
- Mac 托管命令的执行批准提示。
- 远程模式下的 SSH 隧道或直接 Gateway 连接。

该应用程序**不**替代 Gateway 或通用 CLI 文档。Gateway 配置、提供程序、插件、通道、工具和安全性都记录在它们各自的文档中。

## macOS 详细页面

| 任务                                     | 阅读                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| 安装或调试 CLI/Gateway 服务             | [macOS 上的 Gateway](/platforms/mac/bundled-gateway)                                          |
| 将状态保留在不受云同步的文件夹中         | [macOS 上的 Gateway](/platforms/mac/bundled-gateway#state-directory-on-macos)                 |
| 调试应用发现和连接                     | [macOS 上的 Gateway](/platforms/mac/bundled-gateway#debug-app-connectivity)                   |
| 了解 launchd 行为                      | [Gateway 生命周期](/platforms/mac/child-process)                                           |
| 修复权限或签名/TCC 问题                  | [macOS 权限](/platforms/mac/permissions)                                             |
| 连接到远程 Gateway                    | [远程控制](/platforms/mac/remote)                                                     |
| 读取菜单栏状态和健康检查               | [菜单栏](/platforms/mac/menu-bar), [健康检查](/platforms/mac/health)                 |
| 使用内嵌聊天 UI                       | [WebChat](/platforms/mac/webchat)                                                           |
| 使用语音唤醒或按键说话                  | [语音唤醒](/platforms/mac/voicewake)                                                      |
| 使用 Canvas 和 Canvas 深层链接         | [Canvas](/platforms/mac/canvas)                                                             |
| 托管用于 UI 自动化的 PeekabooBridge     | [Peekaboo 桥接](/platforms/mac/peekaboo)                                                  |
| 配置命令审批                          | [执行审批](/tools/exec-approvals), [高级详情](/tools/exec-approvals-advanced) |
| 检查 Mac 节点命令和应用 IPC           | [macOS IPC](/platforms/mac/xpc)                                                             |
| 捕获日志                               | [macOS 日志记录](/platforms/mac/logging)                                                     |
| 从源代码构建                           | [macOS 开发设置](/platforms/mac/dev-setup)                                                 |

## 相关内容

- [平台](/platforms)
- [入门指南](/start/getting-started)
- [网关](/gateway)
- [执行审批](/tools/exec-approvals)
