---
summary: "FAQ：提供商身份验证和限制、模型选择、硬件以及在何处运行网关"
read_when:
  - "选择认证和提供商订阅"
  - "达到提供商速率限制或 OAuth 问题"
  - "决定网关的硬件、VM 或 VPS"
title: "FAQ：提供商、硬件和托管"
sidebarTitle: "提供商和托管"
---

提供商身份验证、模型、硬件和托管问答。有关安装、载入和首次运行失败的信息，请参阅 [FAQ：快速启动和首次运行设置](/help/faq-first-run/quick-start)。

<a id="why-am-i-seeing-http-429-ratelimiterror-from-anthropic"></a>

<AccordionGroup>
  <Accordion id="why-am-i-seeing-http-429-rate-limit-error-from-anthropic" title="为什么我从 Anthropic 看到 HTTP 429 rate_limit_error？">
    您的 **Anthropic quota/rate 限制** 在当前窗口中已用完。在 **Claude CLI** 上，等待窗口重置或升级您的计划。在 **Anthropic API key** 上，检查 Anthropic 控制台中的 usage/billing 并根据需要提高限制。

    如果消息具体为 `Extra usage is required for long context requests`，则请求正在尝试使用 Anthropic 的 1M 上下文窗口（GA- 功能的 1M Claude 4.x 模型或旧版 `params.context1m: true` 配置），并且您当前的凭据不符合长上下文计费条件。

    设置 **后备模型** ，以便 OpenClaw 在提供程序受到速率限制时保持回复。请参阅 [Models](/cli/models)、[OAuth](/concepts/oauth) 和 [ 长上下文所需的 Anthropic 429 额外使用 ](/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

  </Accordion>

  <Accordion id="is-aws-bedrock-supported" title="是否支持 AWS 基岩版？">
    是的。 OpenClaw 具有捆绑的 **Amazon Bedrock （Converse）** 提供商。存在 AWS env 标记（`AWS_ACCESS_KEY_ID`、`AWS_PROFILE`、`AWS_BEARER_TOKEN_BEDROCK`）时，OpenClaw 自动启用隐式 Bedrock 提供程序以进行模型发现；否则设置 `plugins.entries.amazon-bedrock.config.discovery.enabled: true` 或添加手动提供程序条目。请参阅 [Amazon Bedrock](/providers/bedrock) 和 [ 模型提供商](/providers/models)。如果您更喜欢托管密钥流，则 Bedrock 前面的 OpenAI- 兼容代理仍然是一个有效的选择。
  </Accordion>

  <Accordion id="how-does-codex-auth-work" title="Codex 身份验证如何工作？">
    OpenClaw 通过 OAuth 支持 **OpenAI Codex**（ChatGPT 登录）。没有主要模型的全新设置使用精确的 `openai/gpt-6-astra` 进行 ChatGPT/Codex 订阅身份验证以及本机 Codex 应用程序服务器执行。重新验证会保留现有的显式模型，包括 `openai/gpt-5.5`。如果 Codex 工作区未公开 GPT-5.6，则显式选择 `openai/gpt-5.5`； OpenClaw不会默默降级。旧版 Codex- 前缀模型参考是由 `openclaw doctor --fix` 修复的旧版配置。直接 OpenAI API-key 访问仍然可用于非代理 OpenAI API 表面，并且通过订购的 `openai` API-key 配置文件也可用于代理模型。请参阅 [ 模型提供商](/concepts/model-providers) 和 [Onboarding （CLI）](/start/wizard)。
  </Accordion>

  <Accordion id="why-does-openclaw-still-mention-legacy-openai-codex-prefix" title="为什么 OpenClaw 仍然提到旧版 OpenAI Codex 前缀？">
    `openai` 是 OpenAI API 密钥和 ChatGPT/Codex OAuth 的当前提供商和身份验证配置文件 ID - OpenAI Codex 已折叠到其中。您可能仍会在旧配置和迁移警告中看到旧版 `openai-codex` 前缀：

    - `openai/gpt-6-astra` = 全新的 ChatGPT/Codex 订阅设置，具有用于代理轮流的本机 Codex 运行时。
    - `openai/gpt-5.5` = 明确支持对没有 GPT-5.6 访问权限的现有配置或帐户的选择。
    - Legacy `openai-codex/*` 模型参考 = 由 `openclaw doctor --fix` 修复的旧路线。
    - `openai/gpt-5.5` 加上有序的 `openai` API-key 配置文件 = 用于 OpenAI 代理模型的 API-key 身份验证。
    - Legacy `openai-codex` 身份验证配置文件 ID = 由 `openclaw doctor --fix` 迁移的旧 ID。

    想要直接OpenAI平台计费吗？设置 `OPENAI_API_KEY`。想要ChatGPT/Codex订阅授权吗？运行 `openclaw models auth login --provider openai`。将模型参考保留在标准 `openai/*` 提供程序下。新的订阅设置使用精确的 `openai/gpt-6-astra`； doctor 修复了遗留的 Codex- 前缀引用，而不升级显式的 `openai/gpt-5.5` 选择。

  </Accordion>

  <Accordion id="why-can-codex-oauth-limits-differ-from-chatgpt-web" title="为什么 Codex OAuth 限制与 ChatGPT Web 不同？">
    Codex OAuth 使用 OpenAI- 管理的、与计划相关的配额窗口，该窗口可能与 ChatGPT website/app 体验不同，即使在同一账户上也是如此。

    `openclaw models status` 显示当前可见的提供者 usage/quota 窗口，但不会将 ChatGPT-web 权利发明或标准化为直接 API 访问。对于直接 OpenAI 平台 billing/limit 路径，请使用带有 API 密钥的 `openai/*`。

  </Accordion>

  <Accordion id="do-you-support-openai-subscription-auth-codex-oauth" title="是否支持OpenAI订阅认证（Codex OAuth）？">
    是的，完全。 OpenAI 明确允许订阅 OAuth 在外部 tools/workflows 中使用，就像 OpenClaw 一样。 Onboarding 可以为您运行 OAuth 流程。

    参见 [OAuth](/concepts/oauth)、[模型提供商](/concepts/model-providers) 和 [引导（CLI）](/start/wizard)。

  </Accordion>

  <Accordion id="can-i-use-gemini-cli-or-antigravity-oauth" title="我可以使用 Gemini CLI 或反重力 OAuth 吗？">
    OpenClaw 不提供新的 Gemini CLI OAuth 或反重力 OAuth 设置。将 Google 与 AI Studio API 密钥或 Vertex AI 连接。

    可选的 `google-gemini-cli` 运行时仍然可用于使用受支持的 Google API-key 配置文件进行高级设置。现有的有效旧版 Gemini CLI OAuth 配置文件仍然可执行以实现兼容性，但 OpenClaw 无法创建或修复它们。

    详细信息：[Google](/providers/google)、[模型提供商](/concepts/model-providers)。

  </Accordion>

  <Accordion id="is-a-local-model-ok-for-casual-chats" title="本地模型OK适合休闲聊天吗？">
    通常不会。 OpenClaw需要大上下文+强安全性；小卡会截断上下文并跳过提供商端安全过滤器。如果必须，请在本地运行 **largest** 模型构建 （LM Studio） - 请参阅 [ 本地模型](/gateway/local-models)。 Smaller/quantized 模型会增加即时注入风险 - 请参阅 [Security](/gateway/security)。
  </Accordion>

  <Accordion id="how-do-i-keep-hosted-model-traffic-in-a-specific-region" title="如何将托管模型流量保留在特定区域？">
    选择区域固定的端点。 OpenRouter 公开了 MiniMax、Kimi 和 GLM 的 US- 托管选项；选择 US-hosted 变体将数据保留在区域内。您仍然可以将 Anthropic/OpenAI 与 `models.mode: "merge"` 一起列出，以便在尊重您选择的区域提供商的同时保留可用的备用方案。
  </Accordion>

  <Accordion id="do-i-have-to-buy-a-mac-mini-to-install-this" title="我必须购买 Mac Mini 才能安装此软件吗？">
    否。OpenClaw 在 macOS 或 Linux 上运行（Windows 通过 WSL2）。 Mac mini 是一种流行的始终在线主机选择，但小型 VPS、家庭服务器或 Raspberry Pi-class 盒子也可以使用。

    您只需要一台 Mac **用于 macOS- 的工具**。对于 iMessage，请在登录消息的任何 Mac 上使用 [iMessage](/channels/imessage) 和 `imsg` - 如果网关在 Linux 或其他地方运行，请将 `channels.imessage.cliPath` 设置为运行 `imsg` 的 SSH 包装器在那台Mac上。对于其他 macOS-only 工具，请在 Mac 上运行网关或配对 macOS 节点。

    文档：[iMessage](/channels/imessage)、[Nodes](/nodes)、[Mac 远程模式](/platforms/mac/remote)。

  </Accordion>

  <Accordion id="do-i-need-a-mac-mini-for-imessage-support" title="我需要 Mac mini 才能支持 iMessage 吗？">
    您需要 **某些 macOS 设备** 登录到消息 - 不一定是 Mac mini，任何 Mac 都可以。将 [iMessage](/channels/imessage) 与 `imsg` 配合使用；网关可以在该 Mac 上运行，也可以在带有 SSH 包装器 `cliPath` 的其他地方运行。

    常见方案：

    - Linux/VPS、`channels.imessage.cliPath` 上的 Gateway 设置为 SSH 包装器，该包装器在登录消息的 Mac 上运行 `imsg`。
    - 一台 Mac 上的一切，实现最简单的单机设置。

    文档：[iMessage](/channels/imessage)、[Nodes](/nodes)、[Mac 远程模式](/platforms/mac/remote)。

  </Accordion>

  <Accordion id="if-i-buy-a-mac-mini-to-run-openclaw-can-i-connect-it-to-my-macbook-pro" title="如果我购买 Mac mini 来运行 OpenClaw，我可以将其连接到我的 MacBook Pro 吗？">
    是的。 **Mac mini 可以运行 Gateway**，而您的 MacBook Pro 作为 **node**（配套设备）进行连接。节点不运行网关 - 它们在该设备上添加 screen/camera 和 `system.run` 等功能。 Mac 节点还可以在其本机面板中显示托管小部件。

    常见模式：始终在线的 Mac mini 上的网关； MacBook Pro 运行 macOS 应用程序或节点主机并与网关配对。检查 `openclaw nodes status` / `openclaw nodes list`。

    文档：[Nodes](/nodes)、[Nodes CLI](/cli/nodes)。

  </Accordion>

  <Accordion id="can-i-use-bun" title="我可以使用Bun吗？">
    是的。 Node 仍然是主要、默认和推荐的运行时，但 Bun 1.4.3+ 和 WAL- 重置安全 `node:sqlite` 可以作为显式选择运行 CLI、网关和受管节点主机。 Bun 还可以运行包脚本；使用 `pnpm install` 进行依赖安装。
  </Accordion>

  <Accordion id="telegram-what-goes-in-allowfrom" title="Telegram：allowFrom 里面有什么？">
    `channels.telegram.allowFrom` 是 **human 发送者的 Telegram 用户 ID**（数字），而不是机器人用户名。安装程序仅要求提供数字用户 ID； `openclaw doctor --fix` 可以尝试解析旧版 `@username` 条目。

    更安全（无需第三方机器人）：给你的机器人发 DM，运行 `openclaw logs --follow`，读取 `from.id`。

    官方机器人 API：DM 您的机器人，调用 `https://api.telegram.org/bot<bot_token>/getUpdates`，读取 `message.from.id`。

    第三方（不太私密）：DM `@userinfobot` 或 `@getidsbot`。

    参见[电报访问控制](/channels/telegram#access-control-and-activation)。

  </Accordion>

  <Accordion id="can-multiple-people-use-one-whatsapp-number-with-different-openclaw-instances" title="多个人可以将一个 WhatsApp 号码用于不同的 OpenClaw 实例吗？">
    是，通过 **多代理路由**。将每个发送者的 WhatsApp DM （`peer: { kind: "direct", id: "+15551234567" }`） 绑定到不同的 `agentId`，为每个人提供自己的工作区和会话存储。回复仍然来自**同一个WhatsApp账户**； DM 访问控制 （`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`） 对于每个帐户都是全局的。请参阅 [ 多代理 Routing](/concepts/multi-agent) 和 [WhatsApp](/channels/whatsapp)。
  </Accordion>

  <Accordion id="can-i-run-a-fast-chat-agent-and-an-opus-for-coding-agent" title='我可以运行“快速聊天”代理和“Opus 用于编码”代理吗？'>
    是的。使用多代理路由：为每个代理提供自己的默认模型，然后将入站路由（提供者帐户或特定对等点）绑定到每个代理。配置示例：[ 多代理 Routing](/concepts/multi-agent)。另请参见 [Models](/concepts/models) 和 [Configuration](/gateway/configuration)。
  </Accordion>

  <Accordion id="does-homebrew-work-on-linux" title="Homebrew 是否适用于 Linux？">
    是的，通过 Linuxbrew：

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    通过 systemd 运行 OpenClaw：确保服务 PATH 包含 `/home/linuxbrew/.linuxbrew/bin` （或您的 brew 前缀），以便 `brew`- 安装的工具在非登录 shell 中解析。最近的版本还在 Linux systemd 服务上预置常见用户 bin 目录（例如 `~/.local/bin`、`~/.npm-global/bin`、`~/.local/share/pnpm`、`~/.bun/bin`）并尊重 `PNPM_HOME`、`NPM_CONFIG_PREFIX`、设置时为 `BUN_INSTALL`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`NVM_DIR` 和 `FNM_DIR`。

  </Accordion>

  <Accordion id="difference-between-the-hackable-git-install-and-npm-install" title="可破解的 git 安装和 npm 安装之间的区别">
    - **Hackable （git） 安装：** 完整源代码签出，可编辑，最适合贡献者。您在本地构建并可以修补 code/docs.
    - **npm 安装：** 全局 CLI 安装，无存储库，最适合“只需运行它”。更新来自 npm dist-tags。

    文档：[开始使用](/start/getting-started)、[更新](/install/updating)。

  </Accordion>

  <Accordion id="can-i-switch-between-npm-and-git-installs-later" title="我可以稍后在 npm 和 git 安装之间切换吗？">
    是的，与`openclaw update --channel ...`在现有安装上。这确实**不删除您的数据**- 只有OpenClaw代码安装更改。状态 （`~/.openclaw`）和工作区（`~/.openclaw/workspace`）保持原样。

    npm 到 git：

    ```bash
    openclaw update --channel dev
    ```

    git 到 npm：

    ```bash
    openclaw update --channel stable
    ```

    添加`--dry-run`，先预览规划的模式切换。更新程序运行 Doctor 后续操作，刷新目标通道的插件源，并重新启动网关，除非您通过 `--no-restart`。

    安装器也可以强制任一模式：

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method npm
    ```

    备份提示：[ 磁盘上的内容](/help/faq#where-things-live-on-disk)。

  </Accordion>

  <Accordion id="should-i-run-the-gateway-on-my-laptop-or-a-vps" title="我应该在笔记本电脑还是 VPS 上运行网关？">
    想要 24/7 的可靠性吗？使用 **VPS**。想要最低的摩擦力，而您是 OK 和 sleep/restarts 吗？在本地运行它。

    **笔记本（本地 Gateway）**

    - **优点：**无服务器成本，直接访问本地文件，实时浏览器窗口。
    - **缺点：** sleep/network 断开它，​​OS updates/reboots 中断它，必须保持清醒。

    **VPS / 云**

    - **优点：**始终在线，网络稳定，没有笔记本电脑睡眠问题，更容易保持运行。
    - **缺点：**经常无头（使用屏幕截图），仅远程文件访问，SSH需要更新。

    WhatsApp/Telegram/Slack/Mattermost/Discord 在 VPS 上都可以正常工作 - 真正的权衡是无头浏览器与可见窗口。请参阅 [Browser](/tools/browser)。

    如果之前有过网关断开的情况，默认推荐：VPS；当您经常使用 Mac 并希望本地文件访问或可见浏览器 UI 自动化时，local 非常有用。

  </Accordion>

  <Accordion id="how-important-is-it-to-run-openclaw-on-a-dedicated-machine" title="在专用机器上运行OpenClaw有多重要？">
    不是必需的，但为了可靠性和隔离而推荐。

    - **专用主机（VPS/Mac mini/Raspberry Pi）：**始终在线，sleep/reboot中断更少，权限更干净，更容易保持运行。
    - **Shared laptop/desktop：** 适合测试和主动使用，但预计在机器睡眠或更新时会暂停。

    两全其美：将网关保留在专用主机上，并将您的笔记本电脑配对为本地 screen/camera/exec 工具的 **node**。请参阅 [Nodes](/nodes) 和 [Security](/gateway/security)。

  </Accordion>

  <Accordion id="what-are-the-minimum-vps-requirements-and-recommended-os" title="VPS 的最低要求和推荐的 OS 要求是什么？">
    - **绝对最小值：** 1 个 vCPU、1 个 GB RAM、~500 个 MB 磁盘。
    - **推荐：** 1-2 个 vCPU、2 个 GB+ RAM 用于预留空间（日志、媒体、多个通道）。 Node 工具和浏览器自动化可能会占用资源。

    OS：**Ubuntu LTS**（或任何现代Debian/Ubuntu） - 经过最佳测试的Linux安装路径。

    文档：[Linux](/platforms/linux)、[VPS 托管](/vps)。

  </Accordion>

  <Accordion id="can-i-run-openclaw-in-a-vm-and-what-are-the-requirements" title="我可以在 VM 中运行 OpenClaw 吗？有什么要求？">
    是的。将 VM 视为 VPS：它需要始终开启、可访问，并且有足够的 RAM 用于网关和您启用的任何通道。

    - **绝对最小值：** 1 个 vCPU、1 个 GB RAM。
    - **推荐：** 2 GB+ RAM 用于多通道、浏览器自动化或媒体工具。
    - **OS：** Ubuntu LTS 或其他现代 Debian/Ubuntu.

    在 Windows 上，使用 **Windows Hub** 进行桌面设置，或使用 WSL2 进行 Linux-style 网关 VM 具有广泛的工具兼容性。请参阅 [Windows](/platforms/windows)、[VPS 托管](/vps)。在 VM 中运行 macOS：请参阅 [macOS VM](/install/macos-vm)。

  </Accordion>
</AccordionGroup>
