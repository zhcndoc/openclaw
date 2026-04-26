---
summary: "OpenClaw 入职选项和流程概述"
read_when:
  - 选择入职路径
  - 设置新环境
title: "入职概览"
sidebarTitle: "入职概览"
---

OpenClaw 有两种入职路径。两者都会配置 auth、Gateway，以及
可选的聊天渠道——区别只在于你与设置交互的方式不同。

## 我应该使用哪条路径？

|                | CLI 入职                                | macOS 应用入职             |
| -------------- | -------------------------------------- | ------------------------- |
| **Platforms**  | macOS、Linux、Windows（原生或 WSL2）     | 仅 macOS                   |
| **Interface**  | 终端向导                                 | 应用中的引导式界面          |
| **Best for**   | 服务器、无头环境、完全控制               | 桌面 Mac、可视化设置        |
| **Automation** | `--non-interactive` 用于脚本             | 仅手动                    |
| **Command**    | `openclaw onboard`                      | 启动应用                   |

大多数用户应从 **CLI 入职** 开始——它适用于所有环境，并且给你
最大的控制权。

## 入职会配置什么

无论你选择哪种路径，入职都会设置：

1. **模型提供商和 auth** — 为你选择的提供商配置 API key、OAuth 或 setup token
2. **Workspace** — 用于 agent 文件、bootstrap 模板和记忆的目录
3. **Gateway** — 端口、绑定地址、auth 模式
4. **Channels**（可选）— 内置和捆绑的聊天渠道，例如
   BlueBubbles、Discord、Feishu、Google Chat、Mattermost、Microsoft Teams、
   Telegram、WhatsApp 等
5. **Daemon**（可选）— 后台服务，使 Gateway 自动启动

## CLI 入职

在任意终端中运行：

```bash
openclaw onboard
```

添加 `--install-daemon` 还可以一步安装后台服务。

完整参考：[入职（CLI）](/start/wizard)
CLI 命令文档：[`openclaw onboard`](/cli/onboard)

## macOS 应用入职

打开 OpenClaw 应用。首次运行向导会通过图形界面带你完成相同步骤。

完整参考：[入职（macOS 应用）](/start/onboarding)

## 自定义或未列出的提供商

如果你的提供商未在入职中列出，请选择 **Custom Provider** 并输入：

- API 兼容模式（OpenAI 兼容、Anthropic 兼容，或自动检测）
- Base URL 和 API key
- Model ID 和可选别名

多个自定义端点可以共存——每个端点都有自己的 endpoint ID。

## 相关内容

- [快速开始](/start/getting-started)
- [CLI 设置参考](/start/wizard-cli-reference)
