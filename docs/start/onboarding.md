---
summary: "OpenClaw 的首次运行设置流程（macOS 应用）"
read_when:
  - "首次设置 macOS 应用程序"
  - "在 macOS 设置期间在本地网关和远程网关之间进行选择"
  - "从 macOS 应用程序连接 AI 提供商"
title: "上手引导（macOS 应用）"
sidebarTitle: "上手引导：macOS 应用"
---

macOS 应用程序的首次运行流程：选择网关的运行位置，安装任何缺少的本地运行时，并自动连接经过验证的 AI 后端。然后，该应用程序在仪表板中打开引导引导，以进行可选设置并移交给您的代理。有关 CLI 入门以及两条路径的比较，请参阅 [Onboarding Overview](/start/onboarding-overview)。

<Tip>
首先需要该应用程序吗？ [下载适用于 macOS 的 OpenClaw](/platforms/macos#download)，然后返回此处进行首次运行设置。
</Tip>

<Steps>
<Step id="approve-macos-warning" title="批准 macOS 警告">
首次打开 OpenClaw.app 时，macOS 会要求您批准下载的应用程序。单击 **Open** 继续。

<Frame>
<img src="/assets/macos-onboarding/01-macos-warning.jpeg" alt="macOS 询问是否打开下载的 OpenClaw 应用程序的对话框" />
</Frame>
</Step>
<Step id="approve-find-local-networks" title="批准查找本地网络">
macOS 然后询问 OpenClaw 是否可以在您的本地网络上找到设备。单击 **允许**。该应用程序使用它来访问另一台计算机上的网关。

<Frame>
<img src="/assets/macos-onboarding/02-local-networks.jpeg" alt="macOS 对话框，询问 OpenClaw 是否可以找到本地网络上的设备" />
</Frame>
</Step>
<Step id="welcome-and-security-notice" title="欢迎和安全须知">
该应用程序将在欢迎屏幕上打开，并显示安全通知。阅读通知，然后在接受下面的信任模型后继续。

<Frame caption="阅读显示的安全通知并做出相应决定">
<img src="/assets/macos-onboarding/03-security-notice.png" alt="OpenClaw 带安全通知的欢迎屏幕" />
</Frame>

安全信任模型：

- 默认情况下，OpenClaw 是一个个人代理：一个受信任的操作者边界。
- Shared/multi-user 设置需要锁定：分割信任边界，保持工具访问最小化，并遵循 [Security](/gateway/security)。
- 当未配置配置文件时，本地加入会选择 `tools.profile: "full"`，并保留显式配置文件和其他工具策略。完整的工具选择不授予执行权限。参见 [ 工具配置文件 ](/gateway/config-tools/tool-policy#tool-profiles)。
- 如果启用了 hooks/webhooks 或其他不受信任的内容源，请使用强大的现代模型层并保留严格的工具 policy/sandboxing.

</Step>
<Step id="local-vs-remote" title="本地与远程">
<Frame>
<img src="/assets/macos-onboarding/04-choose-gateway.png" alt="" />
</Frame>

**Gateway** 运行在哪里？

- **这台 Mac（仅本地）**：上手流程会配置身份验证并将凭据写入本地。
- **远程（通过 SSH/Tailnet）**：上手流程**不会**配置本地身份验证； 凭据必须已经存在于 gateway 主机上。远程 gateway token 字段会存储 macOS 应用用于连接该 Gateway 的 token； 现有的 `gateway.remote.token` SecretRef 值会被保留，直到你替换它们。
- **稍后配置**：跳过设置并保持应用未配置。

<Tip>
**Gateway 身份验证提示：**

- Gateway auth 模式默认是 `token`，即使是 loopback 绑定也是如此，因此本地 WS 客户端必须进行身份验证。
- 设置 `gateway.auth.mode: "none"` 会让任何本地进程都能连接；仅应在完全受信任的机器上使用。
- 对于多机器访问或非 loopback 绑定，请使用 token。

</Tip>
</Step>
<Step title="CLI">
  本地安装重复使用兼容的 CLI 安装或使用捆绑的安装程序在私有托管运行时中安装 `openclaw` 和 Node。它不需要全局 npm、pnpm 或 Bun 安装。

连接到独立管理的本地网关会跳过 CLI 安装并继续进行 AI 检查，而不接管其 CLI 或服务安装。请参阅 macOS](/platforms/mac/bundled-gateway#automatic-setup) 上的 [Gateway。
</Step>
<Step id="connect-your-ai" title="连接您的 AI">
如果连接的网关已经配置了代理模型，自动设置会保留它而无需写入新设置。否则，网关会按照以下确定顺序自动尝试可用的 AI 访问：

1. 已保存 OpenClaw 身份验证配置文件。
2. 来自网关主机上的 `~/.codex` 或 `CODEX_HOME` 的 Codex 凭据。
3. A Claude CLI 登录。
4. `OPENAI_API_KEY`，然后 `ANTHROPIC_API_KEY`。
5. EOllama、LM Studio 或 llama.cpp. 中的合格加载模型

安装程序在网关主机上运行，​​包括当 Mac 连接到 Linux 网关时。它最多尝试四个检测到的连接，通过现有激活流程验证每个连接，并在保存主模型之前在第一次成功完成时停止。 Apple 基础模型仍然是一个实用选项，并且从未被选为主要模型。

如果未检测到连接有效，OpenClaw 会自动安装或启用官方 Codex 插件。然后，它使用现有的 Codex 登录或提供 ChatGPT 登录。此第一方 Codex 安装是自动安装授予的唯一插件功能批准。如果安装或激活失败，仪表板会显示原因并让您选择其他连接。

<a id="codex-login-and-isolation" />

当自动设置选择现有的 Codex ChatGPT 或 API- 密钥登录时，它会设置 `plugins.entries.codex.config.appServer.homeScope: "user"`。然后，Codex 的应用程序服务器在网关主机上使用 `CODEX_HOME` 或 `~/.codex`（未设置时）。这共享您的本机 Codex 登录名、线程和 `config.toml`。 Codex 拥有认证和令牌刷新； OpenClaw 不会在其身份验证存储中复制或注册 OAuth 令牌。

如果没有 Codex 登录，则提供的 ChatGPT 登录将在 OpenClaw- 拥有的代理主页中保持隔离。这是两种 Codex 模式： **Reuse** 共享您现有的登录和会话； **Separate** 使用 OpenClaw 登录和代理主目录。要从重复使用切换为单独，请在设置卡上选择 **使用单独登录** 并按照内联 ChatGPT 登录。您还可以打开 **Model Setup** 并使用 ChatGPT 登录或输入 OpenAI API 密钥。完成登录后，系统会自动选择隔离的家庭。有关家庭范围设置，请参阅 [Native Codex state](/plugins/codex-harness/native-features#share-threads-with-codex-desktop-and-cli)。手动设置保留其现有的 API-key 导入行为。

仪表板解释了 OpenClaw 选择的内容并列出了替代方案。使用其提供商和模型设置进行切换，或 **Connection… → Gateways** 连接到另一个网关。手动选择器仍然只检测并呈现选择；它会在测试、安装或保存连接之前等待您的选择。本地发现永远不会拉取或下载模型。 Ollama 检查 `/api/ps` 是否加载模型；仅安装在磁盘上的合格模型需要通过 **进行显式设置选择连接** → **仅本地**。参见 [Ollama](/providers/ollama)。

手动提供程序选择器是根据已安装的清单和 OpenClaw 的官方提供程序插件目录构建的，因此可安装的提供程序（例如 Meta）会在其插件出现之前出现。当连接需要运行时插件时，应用程序和仪表板会显示暂存包的来源和功能，并在安装或启用之前提供完整性（包括经过验证的第一方包）。查看详细信息，然后明确确认接受以继续。拒绝或确认取消会停止该尝试，而不选择其他推理路线。如果确认失败，应用程序会显示失败并保留保存的凭据。选择 **Model Setup** 中保存的登录来重试，无需再次登录。保留为该尝试安装的运行时插件。

自动设置会关闭本机 Claude/Codex 对话发现。您可以单独启用它以在侧边栏中显示现有的本机对话。这可以在不复制文字记录的情况下发现适当的对话；选择 Codex 或 Claude 推理路由不会启用它。

对于本地网关上的自定义 OpenAI 或 Anthropic- 兼容端点，请选择 **自定义 OpenAI/Anthropic-compatible 端点** 并完成网关拥有的向导。当网关位于远程时，Mac 不会收集该主机的机密；在网关主机上运行`openclaw onboard --auth-choice custom-api-key`，然后返回应用程序并刷新检测。

如果结果不确定或设置可能已保存，则应用程序在检查网关时会阻止替换设置。 **再次检查** 重复该检查而不开始另一次激活；它不会放弃挂起的尝试或缩短其等待时间。如果等待后协调仍然无法确认完成，应用程序将返回到连接选择并显示错误，而不是自动重试检测到的凭据。重试该连接或选择另一个连接以开始新的激活。

macOS 设置表在网关工作时通过微调器显示所选提供商和当前活动。插件安装不会估计完成百分比。当需要答案时，会出现审阅提示和输入控件；安装和最终现场 AI 测试保持相同的流程。

选择**取消**后，等待确认。网关可能需要完成已达到其提交点的操作。如果无法确认取消，该表会显示安装程序可能仍在运行，并让您重试 **Cancel**。

要在网关主机没有 Claude CLI 登录名时使用 Claude 订阅，请在安装了 Claude Code 的任何计算机上运行 `claude setup-token`，然后将打印的令牌粘贴为 **Anthropic setup-token**在 **下使用 API 密钥或令牌** 连接。

当 Pi 和 OpenCode 安装无法作为可复用的引导式设置推理路径进行选择时，可能会显示它们以供参考。它们是完整的代理工具链，而不是设置推理路径；其会话集成需要单独的运行时和插件设置。 Gemini CLI 和 Antigravity 不会作为检测到的设置路径提供。

您还可以通过提供商自己的 OAuth 或设备配对流程登录。内置选项包括 OpenAI/ChatGPT、OpenRouter、GitHub Copilot、xAI、MiniMax Global 和 CN 以及 Chutes。 Google 可通过支持的 AI Studio API-key 途径获得。该列表来自网关的活动文本推理提供商插件，而不是固定的应用程序列表，因此其他提供商可以选择加入，而无需添加特定于提供商的 macOS 代码。

手动 key/token 选择器使用相同的提供程序注册表。在每条路线中，提供商都会提供其起始模型和配置。如果启动器是别名，OpenClaw 会测试并保存提供程序的完整模型名称，同时保留启动器不会替换的现有模型设置。在您接受 **验证后激活此保存的登录？** 之前，替换凭据将保持非活动状态。拒绝保留您当前的连接和保存的替代连接。安装程序会保留验证期间所做的不相关配置编辑。如果相同的连接设置发生更改，请查看它们并重试保存的登录，而不是覆盖较新的设置。在一个后端通过之前，继续保持锁定状态，因此如果没有工作推理，第一个代理聊天就无法开始。
</Step>
<Step id="continue-in-the-dashboard" title="在仪表板中继续">
新模型通过实时检查后，本机设置将关闭并在仪表板中打开引导引导。 OpenClaw 帮助配置剩余的工作区、网关、通道和其他可选功能，然后将您转交给正常的座席聊天。已配置的模型会打开普通仪表板。

内存导入是引导设置的一部分，而不是单独的本机入门页面。对于本地网关，支持的源包括 Claude Code 自动内存、Codex 合并内存和 Hermes 内存文件。选定的记忆被复制到 `memory/imports/` 下的代理工作区中，以进行索引调用；已导入的文件将被跳过。导入是可选的，并且稍后在 **设置 → 导入内存** 下仍然可用，并具有每个文件的控制。

在此交接之前没有单独的本机权限演练。从 **设置 → 权限** 授予 macOS 对您想要使用的功能的访问权限。可用权限包括自动化 （AppleScript）、通知、辅助功能、屏幕录制、麦克风、语音识别、相机和位置。请参阅 [macOS 权限](/platforms/mac/permissions) 以获取授予和恢复指南。

请参阅 [Bootstrapping](/start/bootstrapping)，了解代理第一次真正轮到时网关主机上发生的情况。 OpenClaw 稍后仍可在 **设置 → OpenClaw** 下使用。
</Step>
</Steps>

## <a id="related"></a> 相关内容

- [上手引导概述](/start/onboarding-overview)
- [入门](/start/getting-started)
