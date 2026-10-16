---
summary: "OpenClaw 入门选项和流程概览"
read_when:
  - "选择入门路径"
  - "设置新环境"
title: "入门概览"
sidebarTitle: "入门概览"
---

OpenClaw 支持从终端、macOS 应用程序和 Linux 桌面伴侣进行登录。每一条路径都首先建立推理。在 macOS 上，新网关会自动选择可用的 AI 访问并在配置其余设置之前验证实际完成情况。保留现有的配置模型。终端流程还提供完整的经典向导以进行详细设置。

## <a id="which-path-should-i-use%3F"></a><a id="which-path-should-i-use"></a> 我应该使用哪种路径？

|                | CLI 上手                         | macOS 应用上手                                | Linux 应用程序入门                      |
| -------------- | -------------------------------------- | --------------------------------------------------- | ----------------------------------------- |
| **平台**  | macOS、Linux、Windows（原生或 WSL2） | macOS                                               | Linux                                     |
| **界面**  | 终端或引导设置               | 自动首次运行，带引导回退            | 本机桌面设置                      |
| **网关**    | 本地或远程                        | 本地、直接远程或 SSH                        | 本地、直接远程或 SSH              |
| **最适合**   | 服务器、无头环境、完全控制        | 桌面 Mac、可视化设置                           | Linux 桌面、可视化设置               |
| **自动化** | 脚本使用 `--non-interactive`        | 自动进行全新本地安装                  | 仅手动                               |
| **开始**      | `openclaw onboard`                     | [下载 macOS 应用程序](/platforms/macos#download) | [安装Linux应用程序](/platforms/linux) |

大多数用户应该从 **CLI 入门** 开始——它几乎处处可用，并且能让你拥有最大的控制权。

## <a id="what-onboarding-configures"></a> 入门会配置什么

引导式推理阶段只建立以下内容：

1. **模型提供方和身份验证** — 已检测到的访问权限或已验证的提供方登录， API 密钥或令牌
2. **已验证推理** — 在默认代理的有效模型上完成一次真实补全

在该补全过程通过后，OpenClaw 可以配置工作区、Gateway、 Gateway 服务、频道、代理、插件以及其他可选功能。

经典 CLI 向导还可以额外配置：

1. **Channels**（可选） - 内置和捆绑的聊天频道，例如 Discord、Feishu、Google Chat、iMessage、Mattermost、 Microsoft Teams、Telegram、WhatsApp 等
2. **高级 Gateway 控制**——远程模式、网络设置和守护进程选项。

## <a id="cli-onboarding"></a> CLI 入门

在任意终端中运行：

```bash
openclaw onboard
```

在全新安装中，引导流程提供 **Quick start** 和 **Custom setup**，检测您已有的 AI 访问权限，验证您选择的连接是否真正完成，然后才配置其余的设置。两个通道、提供商选择器、**Skip for now** 和前台网关均在 [Onboarding （CLI）](/start/wizard#guided-default) 中逐步描述。

推理通过后，OpenClaw 可以将通道设置交给屏蔽终端向导。它不会打开引导或经典的提供商设置。退出 OpenClaw 并运行 `openclaw onboard` 以更改模型提供程序或其身份验证。

使用 `openclaw onboard --classic` 获取详细的 model/auth、通道、技能、远程网关或导入设置。添加`--install-daemon`也是选择经典流程，一步安装后台服务。使用 `openclaw setup` 进行对话式非推理设置和修复。 `openclaw onboard --modern` 是使用相同实时推理门的兼容性别名。

完整参考：[入门（CLI）](/start/wizard) CLI 命令文档：[`openclaw onboard`](/cli/onboard)。

## <a id="macos-app-onboarding"></a> macOS 应用入门

[下载macOS应用程序](/platforms/macos#download)，然后打开它。在没有现有连接或配置的全新安装中，进度窗口会显示应用程序准备其本地运行时、启动其自己的网关以及在仪表板中打开引导引导。 **手动设置** 改为打开本机设置。它不会自动连接到已发现的网关。现有的本地和远程设置保留其连接和本机登录行为。

仪表板显示 **在自动设置运行时连接您的 AI…**，然后显示所选提供商、模型和网关的摘要。您可以选择其他可用的提供商、使用不同的网关或查看设备权限。如果需要登录，请选择 **使用 ChatGPT** 登录，然后按照内联步骤操作。如果自动设置不可用，摘要会解释失败的尝试，并在 Mac 应用程序中提供本机 AI 设置，或在浏览器中提供 `openclaw onboard`。

自动设置会保留现有的配置模型。否则它会按以下顺序尝试可用连接：

1. 已保存 OpenClaw 身份验证配置文件。
2. Codex，在网关主机上存储了凭据。
3. A Claude CLI 登录。
4. `OPENAI_API_KEY`，然后 `ANTHROPIC_API_KEY`。
5. EOllama、LM Studio 或 llama.cpp. 中的合格加载模型

通过实时完成的第一个连接成为主要模型。如果都不起作用，OpenClaw 将安装或启用官方 Codex 插件并使用其现有登录名，或要求您使用 ChatGPT 登录。 Apple 基础模型是一个实用选项，从未被选为主要模型。

当自动设置重用 Codex 时，它会共享网关用户的 `CODEX_HOME`（或 `~/.codex`），包括登录、线程和 `config.toml`。 Codex 拥有认证和令牌刷新； OpenClaw 不会将 OAuth 令牌复制到其身份验证存储中。选择**在设置卡上使用单独的登录**，或通过**模型设置**使用ChatGPT或OpenAI API密钥登录，以使用隔离的OpenClaw代理主页，甚至重新使用本机登录后。请参阅 [Codex 登录和隔离](/start/onboarding#codex-login-and-isolation) 在这些模式之间切换。

推理工作后，OpenClaw 继续其现有的引导对话以进行可选设置，包括内存导入和通道。您可以忽略该摘要；对于该网关，它仍然被忽略。全新安装会关闭本机 Claude/Codex 对话发现。需要时请求权限，并在 **设置 → 权限** 中保持可用。

如果运行时准备、网关启动、身份验证或仪表板加载失败，本机载入将在相关步骤中打开，并显示错误。应用程序菜单还使本机入门可用于手动设置。没有自动设置的网关使用现有的本机 AI 设置流程。

设置后，Gemini CLI 仍可用作显式配置的运行时，但 Gemini CLI 和反重力不提供为检测到的推理路由。使用 Google AI Studio API-key 或 Vertex AI 进行引导设置。可选的 Gemini CLI 运行时特别需要 AI Studio API-key 配置文件。

完整参考：[入门（macOS 应用）](/start/onboarding)。

## <a id="linux-app-onboarding"></a> Linux 应用程序入门

[安装Linux桌面伴侣](/platforms/linux)，然后将其打开。欢迎屏幕允许您在 **这台计算机** 或 **另一台计算机** 上选择网关。本地安装程序会在私有托管运行时中安装任何缺少的 CLI 和 Node，然后启动 systemd 用户服务。远程设置连接到已发现的网关、手动输入的网关 URL 或通过 SSH 隧道到达的网关；支持令牌和密码身份验证。

模型设置会检查现有的提供商访问权限，并在需要时提供登录或 API-key 条目。选定的网关会在引导引导开始之前验证真实的模型响应。已配置的网关在验证后会打开普通代理 UI。 Restart/reopen 恢复使用绑定到网关、代理和身份验证的临时记录：验证已知模型而无需重复激活，而未知结果则需要显式 **验证并使用所选模型** 操作。过期、清除或不可用的浏览器存储或更改的连接所有权可能会阻止恢复。有关恢复详细信息，请参阅 [ 首次运行设置 ](/platforms/linux#first-run-setup)。

平台和远程访问详细信息：[Linux 应用程序](/platforms/linux) 和 [ 远程访问](/gateway/remote)。

## <a id="custom-or-unlisted-providers"></a> 自定义或未列出的提供商

如果您的提供商未列出，请在网关主机上的终端中运行 `openclaw onboard`，选择 **Custom Provider**（显示时位于 **More...** 下），然后输入：

- 端点兼容性：OpenAI-兼容（`/chat/completions`）、OpenAI响应兼容（`/responses`）、Anthropic-兼容（`/messages`）或未知（检查所有三个并自动检测）
- 基础 URL 和 API 密钥（如果端点不要求 API 密钥，则可选）
- 模型 ID 和可选的模型别名

多个自定义端点可以共存 - 每个端点都有自己的端点 ID。引导设置会在保存提供程序并激活其模型之前验证真实模型回复。失败或取消的检查会保留以前的配置。经典向导还保留了其自定义提供程序设置。

如果端点拒绝连接或找不到其主机名，安装程序会立即报告失败的连接，而不是通过正常的聊天重试进行等待。启动服务器或更正网关主机上的 URL 和网络设置，然后重试。普通代理会话会保留连接重试。

## <a id="related"></a> 相关内容

- [入门](/start/getting-started)
- [CLI 设置参考](/start/wizard-cli-reference)
