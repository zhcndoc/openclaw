---
summary: "OpenClaw 入门选项和流程概览"
read_when:
  - 选择入门路径
  - 设置新环境
title: "入门概览"
sidebarTitle: "入门概览"
---

OpenClaw 有两种入门路径。两者都会配置认证、Gateway，以及
可选的聊天频道——只是你与设置交互的方式不同。

## 我应该使用哪种路径？

|                | CLI 入门                          | macOS 应用入门           |
| -------------- | ---------------------------------- | ------------------------ |
| **平台**       | macOS、Linux、Windows（原生或 WSL2） | 仅 macOS                 |
| **界面**       | 终端向导                          | 应用内引导式 UI          |
| **适合**       | 服务器、无头环境、完全控制        | 桌面版 Mac、可视化设置   |
| **自动化**     | `--non-interactive` 用于脚本       | 仅手动                 |
| **命令**       | `openclaw onboard`                 | 启动应用                |

大多数用户应该从 **CLI 入门** 开始——它几乎处处可用，并且能让你拥有
最大的控制权。

## 入门会配置什么

无论你选择哪种路径，入门都会设置：

1. **模型提供商和认证** — 你所选提供商的 API 密钥、OAuth 或设置令牌
2. **工作区** — 用于代理文件、启动模板和记忆的目录
3. **Gateway** — 端口、绑定地址、认证模式
4. **频道**（可选）— 内置和捆绑的聊天频道，例如
   BlueBubbles、Discord、飞书、Google Chat、Mattermost、Microsoft Teams、
   Telegram、WhatsApp 等
5. **守护进程**（可选）— 后台服务，使 Gateway 自动启动

## CLI 入门

在任意终端中运行：

```bash
openclaw onboard
```

添加 `--install-daemon` 还可以一步安装后台服务。

完整参考：[入门（CLI）](/start/wizard)
CLI 命令文档：[`openclaw onboard`](/cli/onboard)

## macOS 应用入门

打开 OpenClaw 应用。首次运行向导会通过可视化界面引导你完成相同的步骤。

完整参考：[入门（macOS 应用）](/start/onboarding)

## 自定义或未列出的提供商

如果你的提供商未在入门中列出，请选择 **Custom Provider**，然后输入：

- API 兼容模式（OpenAI 兼容、Anthropic 兼容，或自动检测）
- Base URL 和 API key
- Model ID 和可选别名

多个自定义端点可以共存——每个都会获得自己的端点 ID。

## 相关内容

- [Getting started](/start/getting-started)
- [CLI setup reference](/start/wizard-cli-reference)
