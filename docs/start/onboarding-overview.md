---
summary: "OpenClaw 入门选项和流程概览"
read_when:
  - 选择入门路径
  - 设置新环境
title: "入门概览"
sidebarTitle: "入门概览"
---

OpenClaw 提供终端和 macOS 应用的入门流程。两者都以推理优先：它们会检测现有的 AI 访问权限，要求完成一次实时补全，然后才启动 OpenClaw 来配置其余设置。可访问且已配置的 Gateway，若其默认代理已经配置了模型，则会跳过入门流程并打开正常的代理 UI。终端流程还提供完整的经典向导，用于详细设置。

## 我应该使用哪种路径？

|                | CLI 上手                     | macOS 应用上手                                           |
| -------------- | ---------------------------- | -------------------------------------------------------- |
| **平台**       | macOS、Linux、Windows（原生或 WSL2） | 仅 macOS                                                  |
| **界面**       | 推理设置，然后 OpenClaw      | 推理设置，然后 OpenClaw                                  |
| **最适合**     | 服务器、无头环境、完全控制   | 桌面 Mac、可视化设置                                       |
| **自动化**     | 脚本使用 `--non-interactive` | 仅手动                                                   |
| **命令**       | `openclaw onboard`           | [下载应用程序](/platforms/macos#download)，然后启动它    |

大多数用户应该从 **CLI 入门** 开始——它几乎处处可用，并且能让你拥有
最大的控制权。

## 入门会配置什么

引导式推理阶段只建立以下内容：

1. **模型提供方和身份验证** — 已检测到的访问权限或已验证的提供方登录，
   API 密钥或令牌
2. **已验证推理** — 在默认代理的有效
   模型上完成一次真实补全

在该补全过程通过后，OpenClaw 可以配置工作区、Gateway、
Gateway 服务、频道、代理、插件以及其他可选功能。

经典 CLI 向导还可以额外配置：

1. **频道**（可选）——内置和捆绑的聊天频道，例如
   Discord、飞书、Google Chat、iMessage、Mattermost、Microsoft Teams、
   Telegram、WhatsApp 等
2. **高级 Gateway 控制**——远程模式、网络设置和守护进程选项。

## CLI 入门

在任意终端中运行：

```bash
openclaw onboard
```

引导式流程会检测现有的 AI 访问方式，按顺序对候选项进行实时测试，并在失败时继续下一个。如果检测耗尽，它会优先显示 OpenAI、Anthropic、xAI（Grok）、Google 和 OpenRouter。**更多…** 会在第二个菜单中显示其余提供商，按提供商分组，并包含地区、套餐以及受支持的浏览器、设备、API 密钥或令牌方式。它会在完成通过后才保存模型和凭据，然后启动 OpenClaw 来配置工作区、Gateway、通道、代理、插件以及其他可选功能。**暂时跳过** 会退出且不启动 OpenClaw。流程中没有传统的交接方式；当你想使用传统向导时，请退出并运行 `openclaw onboard --classic`。

在推理通过后，OpenClaw 可以将通道设置交给一个掩码终端向导。它不会打开引导式或传统的提供商设置；请退出 OpenClaw 并运行 `openclaw onboard` 来更改模型提供商或其身份验证方式。

使用 `openclaw onboard --classic` 进行详细的模型/认证、通道、技能、远程 Gateway 或导入设置。添加 `--install-daemon` 还会同时选择传统流程并一步安装后台服务。使用 `openclaw openclaw` 进行对话式的非推理设置和修复。`openclaw onboard --modern` 是一个兼容性别名，使用相同的实时推理门控。

完整参考：[入门（CLI）](/start/wizard)
CLI 命令文档：[`openclaw onboard`](/cli/onboard)。

## macOS 应用入门

[下载 macOS 应用](/platforms/macos#download)，然后打开它。如果其
配置的本地或远程 Gateway 可访问，
并且默认代理已经配置了模型，应用将跳过引导
和 OpenClaw，并立即打开正常的代理 UI。

对于一个全新的或配置不完整的 Gateway，首次运行流程会检测现有的 AI 访问方式（Claude Code、Codex 或 API 密钥），实时测试最佳选项，并且只在收到真实回复后才保存——在未找到任何内容时会自动回退，并提供经过验证的手动 API 密钥步骤。敏感凭据使用遮罩输入。一旦推理通过，OpenClaw 就会启动并帮助配置其余部分。

设置完成后，Gemini CLI 仍可作为显式配置的运行时使用，
但 Gemini CLI 和 Antigravity 不会作为检测到的推理路径提供。
请使用 Google AI Studio API 密钥或 Vertex AI 进行引导式设置。可选的 Gemini
CLI 运行时明确要求使用 AI Studio API 密钥配置文件。

完整参考：[入门（macOS 应用）](/start/onboarding)。

## 自定义或未列出的提供商

如果您的提供商未列出，请运行 `openclaw onboard --classic`，选择
**自定义提供商**，然后输入：

- 端点兼容性：兼容 OpenAI（`/chat/completions`）、兼容 OpenAI Responses（`/responses`）、兼容 Anthropic（`/messages`），或未知（将探测这三种类型并自动检测）
- 基础 URL 和 API 密钥（如果端点不要求 API 密钥，则可选）
- 模型 ID 和可选的模型别名

可以共存多个自定义端点——每个端点都会获得自己的端点 ID。

## 相关内容

- [入门](/start/getting-started)
- [CLI 设置参考](/start/wizard-cli-reference)
