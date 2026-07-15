---
summary: "OpenClaw 入门选项和流程概览"
read_when:
  - 选择入门路径
  - 设置新环境
title: "入门概览"
sidebarTitle: "入门概览"
---

OpenClaw 提供终端和 macOS 应用两种入门方式。两者都会先建立推理能力：它们会检测现有的 AI 访问权限，要求完成一次实时补全，然后才会启动 Crestodian 来配置剩余设置。若 Gateway 可访问且已配置，且其默认代理已经配置了模型，则会跳过入门流程并打开普通的代理 UI。终端流程还提供完整的经典向导，用于详细设置。

## 我应该使用哪种路径？

|                | CLI onboarding                         | macOS app onboarding             |
| -------------- | -------------------------------------- | -------------------------------- |
| **Platforms**  | macOS、Linux、Windows（原生或 WSL2）    | 仅 macOS                         |
| **Interface**  | 推理设置，然后是 Crestodian           | 推理设置，然后是 Crestodian     |
| **Best for**   | 服务器、无头环境、完全控制              | 桌面版 Mac、可视化设置            |
| **Automation** | `--non-interactive` 用于脚本            | 仅手动                         |
| **Command**    | `openclaw onboard`                     | 启动应用                        |

大多数用户应该从 **CLI 入门** 开始——它几乎处处可用，并且能让你拥有
最大的控制权。

## 入门会配置什么

引导式推理阶段只建立以下内容：

1. **模型提供商和认证**——已检测到的访问权限或已验证的 API 密钥
2. **已验证的推理**——在默认代理的有效模型上进行的一次真实补全

在该补全通过后，Crestodian 可以配置工作区、Gateway、Gateway 服务、频道、代理、插件以及其他可选功能。

经典 CLI 向导还可以额外配置：

1. **频道**（可选）——内置和捆绑的聊天频道，例如
   Discord、飞书、Google Chat、iMessage、Mattermost、Microsoft Teams、
   Telegram、WhatsApp 等
2. **高级 Gateway 控制**——远程模式、网络设置和守护进程选项

## CLI 入门

在任意终端中运行：

```bash
openclaw onboard
```

引导式流程会检测现有的 AI 访问权限，按顺序对候选项进行实时测试，
在失败时依次回退，并提供带掩码的手动密钥输入。它只会在某个测试完成并通过后，
才保存模型和凭据，然后启动 Crestodian
来配置工作区、Gateway、channels、agents、plugins 以及其他
可选功能。这里没有前置推理的 Crestodian、跳过 AI 的路径，也没有
流程内的经典交接。若想改用经典向导，请退出并运行
`openclaw onboard --classic`。

在推理通过后，Crestodian 可以将通道设置交给带掩码的终端
向导。它不会打开引导式或经典的提供方设置；请退出 Crestodian 并
运行 `openclaw onboard` 来更改模型提供方或其认证方式。

使用 `openclaw onboard --classic` 可进行详细的模型/认证、通道、技能、
远程 Gateway 或导入设置。添加 `--install-daemon` 也会选择
经典流程，并在一步中安装后台服务。使用 `openclaw
crestodian` 进行无需推理的对话式设置和修复。`openclaw
onboard --modern` 是一个兼容别名，使用相同的实时推理
门禁。

完整参考：[入门（CLI）](/start/wizard)
CLI 命令文档：[`openclaw onboard`](/cli/onboard)

## macOS 应用入门

打开 OpenClaw 应用。如果其已配置的本地或远程 Gateway 可访问，
并且默认代理已经配置了模型，应用会跳过 onboarding
和 Crestodian，立即打开正常的代理 UI。

对于全新或不完整的 Gateway，首次运行流程会检测现有的 AI
访问方式（Claude Code、Codex 或 API 密钥），实时测试最佳
选项，并且只有在收到真实回复后才保存——同时会自动回退，并在
未找到任何内容时提供经过验证的手动 API 密钥步骤。敏感
凭据使用掩码输入。推理通过后，Crestodian 会启动并
帮助配置其余部分。

Gemini CLI 在设置完成后仍可供普通代理使用，但由于它无法强制执行无工具探测，
因此不会在此推理门禁中提供。

完整参考：[入门（macOS 应用）](/start/onboarding)

## 自定义或未列出的提供商

如果你的提供商未列出，请运行 `openclaw onboard --classic`，选择
**自定义提供商**，并输入：

- 端点兼容性：OpenAI 兼容（`/chat/completions`）、OpenAI Responses 兼容（`/responses`）、Anthropic 兼容（`/messages`），或者未知（会探测这三者并自动检测）
- Base URL 和 API key（如果该端点不需要 API key，则为可选）
- 模型 ID 和可选的模型别名

多个自定义端点可以共存——每个都会获得自己的端点 ID。

## 相关内容

- [入门](/start/getting-started)
- [CLI 设置参考](/start/wizard-cli-reference)
