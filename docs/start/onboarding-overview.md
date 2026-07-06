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

|                | CLI onboarding                         | macOS app onboarding        |
| -------------- | -------------------------------------- | --------------------------- |
| **平台**       | macOS、Linux、Windows（原生或 WSL2）     | 仅 macOS                    |
| **界面**       | 终端向导                               | 引导式 UI + Crestodian 聊天 |
| **最适合**     | 服务器、无头环境、完全控制             | 桌面 Mac、可视化设置       |
| **自动化**     | `--non-interactive` 用于脚本            | 仅手动                   |
| **命令**       | `openclaw onboard`                     | 启动应用                   |

大多数用户应该从 **CLI 入门** 开始——它几乎处处可用，并且能让你拥有
最大的控制权。

## 入门会配置什么

无论你选择哪种路径，入门都会设置：

1. **模型提供商和认证** — 你所选提供商的 API 密钥、OAuth 或设置令牌
2. **工作区** — 用于 agent 文件、引导模板和记忆的目录
3. **网关** — 端口、绑定地址、认证模式
4. **通道**（可选）— 内置和捆绑的聊天通道，例如
   Discord、飞书、Google Chat、iMessage、Mattermost、Microsoft Teams、
   Telegram、WhatsApp 等
5. **守护进程**（可选）— 后台服务，以便网关自动启动

## CLI 入门

在任意终端中运行：

```bash
openclaw onboard
```

添加 `--install-daemon` 还可以一步安装后台服务。

完整参考：[入门（CLI）](/start/wizard)
CLI 命令文档：[`openclaw onboard`](/cli/onboard)

## macOS 应用入门

打开 OpenClaw 应用。对于本地设置，首次运行流程会启动 Gateway，
检测现有的 AI 访问方式（Claude Code、Codex、Gemini CLI 或 API 密钥），
实时测试最佳选项，并且仅在收到真实回复后保存——
若未找到可用项，会自动回退，并提供经过验证的手动 API 密钥步骤。
敏感凭据使用隐藏输入。远程设置则改为连接到一个已配置好的 Gateway，
并针对该 Gateway 运行相同的 AI 检查。

完整参考：[入门（macOS 应用）](/start/onboarding)

## 自定义或未列出的提供商

如果你的提供商未在入门中列出，请选择 **Custom Provider**，然后输入：

- 端点兼容性：OpenAI 兼容（`/chat/completions`）、OpenAI Responses 兼容（`/responses`）、Anthropic 兼容（`/messages`），或者未知（会探测这三者并自动检测）
- Base URL 和 API key（如果该端点不需要 API key，则为可选）
- 模型 ID 和可选的模型别名

多个自定义端点可以共存——每个都会获得自己的端点 ID。

## 相关内容

- [入门](/start/getting-started)
- [CLI 设置参考](/start/wizard-cli-reference)
