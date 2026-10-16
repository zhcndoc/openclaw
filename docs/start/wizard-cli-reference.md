---
summary: "openclaw onboard 的逐步行为：每一步做什么、写入哪些配置以及内部实现"
doc-schema-version: 1
read_when:
  - "你需要了解某个特定 openclaw onboard 步骤的详细行为"
  - "你正在调试 onboarding 结果或集成 onboarding 客户端"
title: "CLI 设置参考"
sidebarTitle: "CLI 参考"
---

本页介绍逐步 onboarding 行为、输出和内部实现。 有关操作流程，请参阅 [Onboarding (CLI)](/start/wizard)。关于完整的 CLI 标志参考（每个 `--flag`、非交互式示例、特定提供商的命令），请参阅 [`openclaw onboard`](/cli/onboard)。

## <a id="what-the-wizard-does"></a> 向导会做什么

新的本地引导登录显示指向 [ 安全指南 ](/gateway/security) 的一行指针和一个选项：**Quick start** 或 **Custom setup**。 Quick start记录安全确认； Custom setup 显示完整的安全说明并要求确认。 Quick start 重用检测到的 AI 访问，验证它，保存配置，并使用前台网关打开 Web 仪表板。它使用代理名称 `main` 和完全访问权限，未设置遥测同意，并跳过路线确认、内存导入和应用程序推荐。 **Ctrl+C** 停止网关而不删除配置； `openclaw gateway install` 稍后启用后台操作。

Custom setup 保留完整的引导提示。如果 Quick start 找不到可用的路由，它将继续手动提供程序设置和其余指导步骤，包括网关服务安装。 Quick start 默认为代理名称 （`main`）、访问模式（完全访问）和遥测（同意未设置）停留。请参阅 [ 引导默认值 ](/start/wizard#guided-default)。

本地模式下的经典向导 （`openclaw onboard --classic`） 将引导您完成：

- 工作区位置和引导文件
- 模型和身份验证设置（Anthropic、OpenAI Code 订阅 OAuth、xAI、OpenCode、自定义端点，以及更多由提供商托管的认证流程）
- 网关设置（端口、绑定、认证、Tailscale）
- 频道和提供商（Discord、Feishu、Google Chat、iMessage、Mattermost、Microsoft Teams、QQ Bot、Signal、 Slack、Telegram、WhatsApp 以及其他捆绑或插件通道）
- 网络搜索提供商（可选）
- 技能设置
- 守护进程安装（LaunchAgent、systemd 用户单元，或原生 Windows 计划任务，带启动文件夹回退）
- 健康检查

远程模式将此计算机配置为连接到其他地方的网关。它不会在远程主机上安装或修改任何内容。

## <a id="local-flow-details"></a> 本地流程详情

这些步骤描述了经典向导。引导的 Quick start 通道描述为 [above](/start/wizard-cli-reference#what-the-wizard-does)。

<Steps>
  <Step id="setup-mode" title="设置模式">
    - 如果没有配置默认模型，则菜单包含 **QuickStart（推荐）**（默认），然后是 **手动设置**。
    - 配置了默认模型，**保留现有模型配置**首先出现并成为默认，其次是**QuickStart（推荐）**和**手动设置**。显式非 `skip` `--auth-choice` 或单个提供程序凭据标志仍会配置该提供程序，而不更改现有的默认模型，除非提供程序要求您选择模型。多个提供者标志需要显式的 `--auth-choice`。
    - 当迁移提供程序可用时，**从另一个代理导入**将出现在这些设置选项之后。选择它会打开一个提供商列表，其中包含 **Import from Claude**、**Import from Codex** 和 **Import from Hermes** 等条目。检测到的源首先出现及其路径；其他可用的提供程序要求提供源路径。显式导入标志直接调度导入并跳过此菜单。在导入开始之前，使用提供程序列表中的返回可返回到 **设置模式**。
    - 重新运行向导不会擦除任何内容，除非您传递 `--reset`。重置是一个命令标志，而不是设置模式选择。
    - `--reset-scope` 接受 `config`（仅配置）、`config+creds+sessions`（默认）或 `full`（也删除工作区）。在将状态移至垃圾箱之前，该命令会验证 TTY 可用性和可拒绝的 CLI 选项。非交互式设置在复位前还需要 `--accept-risk`。交互式经典设置在显示其风险确认之前执行重置；拒绝该提示不会撤消重置。
    - 迁移导入选项（`--flow import`、`--import-from`、`--import-source` 和 `--import-secrets`）不能与 `--reset` 组合使用；在没有 `--reset` 的情况下运行导入。
    - 如果没有 `--reset`，无效的配置或旧密钥会停止向导并要求您运行 `openclaw doctor`，然后再继续。

  </Step>
  <Step id="risk-acknowledgment" title="风险确认">
    - 第一次运行要求您承认代理很强大，并且完整的系统访问是有风险的。向导将确认存储在 `wizard.securityAcknowledgedAt` 中，因此重新运行时不会再次询问。
    - 交互式运行显示确认提示；拒绝取消设置。
    - `--non-interactive` 需要 `--accept-risk`，并在缺少标志时退出并出现错误。
    - 交互式经典安装程序在此提示之前执行 `--reset`。重置后拒绝不会恢复已移至垃圾箱的状态。

  </Step>
  <Step id="workspace" title="工作空间">
    - 默认 `~/.openclaw/workspace`（可配置）。
    - 提示和 `--workspace` 拒绝文件、非目录祖先、悬空符号链接以及工作空间路径或任何祖先处的符号链接循环，识别失败路径。报告其他检查失败（例如权限错误），而不将其视为丢失目录。允许缺少目录和指向现有目录的符号链接。
    - 为首次启动引导填充所需的 workspace 文件。
    - 重新运行时，现有 agent roster 会保留其整个 fleet 的 workspace，除非你明确确认移动。非交互式重运行会发出警告并保留当前值。
    - Workspace 布局：[Agent workspace](/concepts/agent-workspace)。

  </Step>
  <Step id="model-and-auth" title="模型及授权">
    - 完整选项矩阵见 [认证和模型选项](#auth-and-model-options)。

  </Step>
  <Step id="gateway" title="网关">
    - 提示端口、绑定、秘密存储和 Tailscale 暴露。
    - 在令牌模式下默认生成网关密钥，不要求您选择令牌或密码。现有的密码模式配置将被保留。使用 `--gateway-auth password` 或 `--gateway-password <value>` 明确选择密码。 Tailscale 漏斗仍然需要密码模式。
    - 即使对于环回也保持启用共享秘密身份验证，因此本地 WS 客户端必须进行身份验证。
    - 对于生成的秘密，交互式设置提供：
      - **Generate/store 明文秘密**（默认）
      - **使用 SecretRef**（可选）
      - Classic QuickStart 重用来自 `env`、`file`、`exec` 或 `store` 提供商的现有 `gateway.auth.token` SecretRef 进行检查和仪表板切换。未解决的配置参考会停止加入并提供补救指导，而不是默默地削弱网关身份验证。
    - 显式或现有密码模式也支持明文或SecretRef存储。
    - 非交互式 token SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
      - 要求在 onboarding 进程环境中存在一个非空 env var。
      - 不能与 `--gateway-token` 结合使用。
    - 只有在你完全信任每个本地进程时，才应禁用认证。
    - 非 loopback 绑定仍然需要认证。

  </Step>
  <Step id="channels" title="渠道">
    - [WhatsApp](/channels/whatsapp)：可选 QR 登录
    - [Telegram](/channels/telegram)：机器人令牌
    - [Discord](/channels/discord)：机器人令牌
    - [Google Chat](/channels/googlechat)：服务帐户 JSON + webhook 受众
    - [Mattermost](/channels/mattermost)：机器人代币+基础URL
    - [Signal](/channels/signal)：可选安装 `signal-cli` + 账户配置
    - [iMessage](/channels/imessage)：`imsg` CLI路径+消息DB访问；当网关在 Mac 之外运行时使用 SSH 包装器
    - 其他捆绑或单独安装的频道插件可以添加自己的入门步骤。请参阅完整的 [ 通道目录](/channels)。
    - DM 安全性：默认为配对。首先DM发送一个代码；通过 `openclaw pairing approve <channel> <code>` 批准或使用白名单。
  </Step>
  <Step id="web-search" title="网页搜索">
    - 选择提供商（Brave、Codex 托管搜索、DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、 MiniMax 搜索、Ollama Web 搜索、并行、Perplexity、SearXNG 或 Tavily）或跳过。
    - 使用 `--skip-search` 跳过此步骤；之后可通过 `openclaw configure --section web` 重新配置。

  </Step>
  <Step id="skills" title="技能">
    - 读取可用 skills 并检查要求。
    - 允许你选择 node manager：npm、pnpm 或 bun。
    - 当所需安装器可用时，为受信任的 bundled skills 安装可选依赖。
    - 跳过不可用的 Homebrew、uv 和 Go 安装器，然后将受影响的 skills 分组并附上手动设置指导。安装缺失的前置条件后运行 `openclaw doctor`。

  </Step>
  <Step id="daemon-install" title="守护进程安装">
    - macOS: LaunchAgent
      - 需要已登录的用户会话；对于无头环境，请使用自定义 LaunchDaemon（未随附）。
    - Linux 和 Windows 通过 WSL2：systemd 用户单元
      - 向导会尝试执行 `loginctl enable-linger <user>`，以便网关在注销后继续运行。
      - 可能会提示输入 sudo（会写入 `/var/lib/systemd/linger`）；它会先尝试不使用 sudo。
    - 原生 Windows：首先使用计划任务
      - 如果创建任务被拒绝，OpenClaw 会回退到按用户划分的 Startup 文件夹登录项，并立即启动网关。
      - 仍然优先使用计划任务，因为它们能提供更好的监督状态。
    - 运行时选择：Node是主要的、默认的和推荐的运行时。 Bun 1.4.3+ 和 WAL- 复位安全 `node:sqlite` 可作为显式选择加入。 QuickStart 报告安装计划选择的运行时，包括 Bun（当 Bun-only 首次安装时没有受支持的 Node 可用时）。
    - A SecretRef 管理的 `gateway.auth.token` 已验证，无需将其解析的明文值复制到主管服务元数据中。未解析的令牌引用会阻止守护程序安装并提供修复指导。
    - 如果 `gateway.auth.token` 和 `gateway.auth.password` 都存在，而 `gateway.auth.mode` 未设置，则守护程序安装会阻止，直到您明确选择模式。

  </Step>
  <Step id="health-check" title="健康检查">
    - 启动网关（如需要）并运行 `openclaw health`。
    - `openclaw status --deep` 将实时网关运行状况检查添加到状态输出，包括支持的通道检查。

  </Step>
  <Step id="finish" title="结束">
    - 总结和后续步骤，包括 iOS、Android 和 macOS 应用选项。

  </Step>
</Steps>

<Note>
如果未检测到 GUI，向导将打印 Control UI 的 SSH 端口转发指令，而不是打开浏览器。如果 Control UI 资产丢失，向导会尝试构建它们；后备是 `pnpm ui:build` （自动安装 UI 依赖项）。
</Note>

## <a id="remote-mode-details"></a> 远程模式详情

远程模式将此计算机配置为连接到其他地方的网关。它不会在远程主机上安装或修改任何内容。

你需要设置的内容：

- 远程网关 URL (`ws://...` 或 `wss://...`)
- One 网关机密（令牌或密码），或显式确认在没有共享机密的情况下进行连接

<Steps>
  <Step id="discovery-optional" title="发现（可选）">
    如果可用 `dns-sd`（macOS）或 `avahi-browse`（Linux），引导流程会先尝试搜索 Bonjour/mDNS 网关信标，然后再回退到手动输入 URL。若已配置，也会尝试广域 DNS-SD 发现。文档：[网关发现](/gateway/discovery), [Bonjour](/gateway/bonjour).
  </Step>
  <Step id="connection-method" title="连接方式">
    选中某个信标后，选择直接 WebSocket 或 SSH 隧道：
    - **直接连接**：通过 `wss://` 连接，并提示你信任发现到的 TLS 指纹（首次使用信任固定；只有在你接受时才会固定）。
    - **SSHtunnel**：使用解析的网关服务端口打印 `ssh -N -L 18789:127.0.0.1:<gateway-port> <user>@<host>` 命令，通告时带有 `-p <ssh-port>`。首先运行它，然后连接到位于 `ws://127.0.0.1:18789` 的本地隧道端点。
  </Step>
  <Step id="auth" title="认证">
    在 **Gateway Secret** 中输入配置的令牌或密码。网关接受任一有线字段；交互式设置将秘密存储为 `gateway.remote.token`，也可以选择将其存储为 SecretRef，而不是明文。要在没有共享密钥的情况下进行连接，请将其留空，拒绝保留现有凭据（如果提供），并确认 **在没有网关密钥的情况下继续吗？**。参考存储在请求参考之前提供确认。
  </Step>
</Steps>

<Note>
如果网关仅环回且不可发现，请手动使用 SSH 隧道或尾网。环回、私有 IP 文字、`.local` 和 Tailnet `*.ts.net` URL 接受明文 `ws://`；其他私有 DNS 名称需要 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`。
</Note>

## <a id="auth-and-model-options"></a> 认证和模型选项

如果交互式 onboarding 中的某个提供方设置步骤失败（例如没有本地登录时使用 CLI 复用选项），向导会显示错误并返回提供方选择器，而不是退出。显式的 `--auth-choice` 运行仍会为自动化场景快速失败。

下面的模型默认值和提供程序支持声明描述了 v2026.9.3. 模型默认值随产品基线而变化，因此如果您使用的是不同版本，请检查 [Models](/concepts/models)。

<AccordionGroup>
  <Accordion id="anthropic-api-key" title="Anthropic API 钥匙">
    如果存在则使用 `ANTHROPIC_API_KEY`，否则提示输入 key，然后保存以供守护进程使用。
  </Accordion>
  <Accordion title="Anthropic Claude CLI">
    交互中首选本地路径 onboarding/configure；重用现有的 Claude CLI 登录（如果可用）。
  </Accordion>
  <Accordion id="anthropic-setup-token" title="Anthropic 设置令牌">
    支持`claude setup-token`创建的长期令牌。在入门引导期间选择 **Anthropic setup-token**，或稍后使用 [`openclaw models auth`](/cli/models#auth-profiles) 进行管理。
  </Accordion>
  <Accordion id="openai-code-subscription-oauth" title="OpenAI 代码订阅（OAuth）">
    浏览器流程；粘贴 `code#state`。

    在没有主模型的全新设置中，通过 Codex 运行时将 `agents.defaults.model` 设置为 `openai/gpt-6-astra`。

  </Accordion>
  <Accordion id="openai-code-subscription-device-pairing" title="OpenAI 代码订阅（设备配对）">
    带短期设备码的浏览器配对流程。

    在没有主模型的全新设置中，通过 Codex 运行时将 `agents.defaults.model` 设置为 `openai/gpt-6-astra`。

  </Accordion>
  <Accordion id="openai-api-key" title="OpenAI API 密钥">
    如果存在则使用 `OPENAI_API_KEY`，否则提示输入 key，然后将凭证存储在 auth profiles 中。

    在没有主要模型的全新设置中，将 `agents.defaults.model` 设置为 `openai/gpt-6-astra`。裸直接 API `openai/gpt-5.6` 别名仍然受支持并解析为同一层。

    添加或重新认证 OpenAI 时，会保留现有的显式主模型，包括 `openai/gpt-5.5`。如果该账户不提供 GPT-5.6，请显式选择 `openai/gpt-5.5`；OpenClaw 不会静默降级它。

  </Accordion>
  <Accordion title="xAI (Grok) OAuth">
    适用于符合条件的 SuperGrok 或 X Premium 账户的浏览器登录。 这是大多数用户推荐的 xAI 路径。OpenClaw 会将生成的认证 profile 存储起来，用于 Grok 模型、Grok `web_search`、`x_search` 和 `code_execution`。
  </Accordion>
  <Accordion id="xai-grok-device-code" title="xAI （Grok） 设备代码">
    面向远程场景的浏览器登录，使用短码而不是 localhost 回调。适用于 SSH、Docker 或 VPS 主机。
  </Accordion>
  <Accordion id="xai-grok-api-key" title="xAI （Grok） API 钥匙">
    提示输入 `XAI_API_KEY` 并将 xAI 配置为模型提供方。适用于你想使用 xAI Console API key 而不是订阅 OAuth 的情况。
  </Accordion>
  <Accordion title="OpenCode">
    提示输入 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`），并让您选择 Zen 或 Go 目录（一个 API 密钥可涵盖这两个目录）。设置URL：[opencode.ai/auth](https://opencode.ai/auth).
  </Accordion>
  <Accordion id="api-key-generic" title="API 密钥（通用）">
    为你保存该 key。
  </Accordion>
  <Accordion id="vercel-ai-gateway" title="Vercel AI 网关">
    提示输入 `AI_GATEWAY_API_KEY`。 更多详情：[Vercel AI Gateway](/providers/vercel-ai-gateway).
  </Accordion>
  <Accordion id="cloudflare-ai-gateway" title="Cloudflare AI 网关">
    提示输入 account ID、gateway ID 和 `CLOUDFLARE_AI_GATEWAY_API_KEY`。 更多详情：[Cloudflare AI Gateway](/providers/cloudflare-ai-gateway).
  </Accordion>
  <Accordion title="MiniMax">
    配置是自动写入的。托管默认为`MiniMax-M3`； API-key设置使用`minimax/...`，OAuth设置使用`minimax-portal/...`。更多详细信息：[MiniMax](/providers/minimax)。
  </Accordion>
  <Accordion title="StepFun">
    会为中国或全球端点上的 StepFun standard 或 Step Plan 自动写入配置。 Standard 当前包含 `step-3.5-flash`，Step Plan 还包含 `step-3.5-flash-2603`。 更多详情：[StepFun](/providers/stepfun).
  </Accordion>
  <Accordion id="synthetic-anthropic-compatible" title="Synthetic （Anthropic-兼容的）">
    提示输入 `SYNTHETIC_API_KEY`。 更多详情：[Synthetic](/providers/synthetic).
  </Accordion>
  <Accordion id="ollama-cloud-and-local-open-models" title="Ollama（云和本地开放模型）">
    首先提示 `Cloud + Local` 或 `Local only`。对于没有本地 Ollama 主机的托管模型，请选择 `Ollama Cloud` （`--auth-choice ollama-cloud`）。主机支持的模式提示基本 URL（默认 `http://127.0.0.1:11434`）、发现可用模型并建议默认值。 `Cloud + Local` 还会检查该 Ollama 主机是否已登录以进行云访问。更多详细信息：[Ollama](/providers/ollama)。
  </Accordion>
  <Accordion id="moonshot-and-kimi-coding" title="Moonshot 和 Kimi 编码">
    Moonshot（Kimi K2）和 Kimi Coding 配置会自动写入。 更多详情：[Moonshot AI (Kimi + Kimi Coding)](/providers/moonshot).
  </Accordion>
  <Accordion id="custom-provider" title="定制提供商">
    可与 OpenAI- 兼容、OpenAI 响应兼容和 Anthropic- 兼容端点配合使用。 API底座URL必须使用`http://`或`https://`；其他URL方案在验证前被拒绝。

    交互式加入支持与其他提供商 API 密钥流程相同的 API 密钥存储选择：
    - **现在粘贴 API key**（明文）
    - **使用 secret reference**（环境变量引用或已配置的 provider 引用，带预检验证）

    载入推断对常见视觉模型 ID（GPT-4o/4.1/5.x、Claude 3/4、Gemini、Qwen-VL、LLaVA、Pixtral 等）的图像支持，并且仅在模型名称未知时询问。

    非交互式标志：
    - `--auth-choice custom-api-key`
    - `--custom-base-url`
    - `--custom-model-id`
    - `--custom-api-key`（可选；回退到 `CUSTOM_API_KEY`）
    - `--custom-provider-id`（可选）
    - `--custom-compatibility <openai|openai-responses|anthropic>`（可选；默认 `openai`）
    - `--custom-image-input` / `--custom-text-input`（可选；覆盖推断出的模型输入能力）

  </Accordion>
  <Accordion id="skip" title="跳过">
    不配置认证。
  </Accordion>
</AccordionGroup>

模型行为：

- 从检测到的选项中选择默认模型，或手动输入提供方和模型。
- 当 onboarding 从某个提供方认证选项开始时，模型选择器会自动优先使用该提供方。对于 Volcengine 和 BytePlus，同样的优先级也适用于它们的 coding-plan 变体（`volcengine-plan/*`、 `byteplus-plan/*`）。
- 如果该“首选提供方”筛选结果为空，选择器会回退到完整目录，而不是不显示任何模型。
- 向导会运行模型检查，并在配置的模型未知或缺少认证时发出警告。

凭证和 profile 路径：

- Agent-本地身份验证配置文件（API 密钥、令牌和 OAuth）：`~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite` （`auth_profile_store`）。
- 共享身份验证配置文件：`~/.openclaw/state/openclaw.sqlite`；代理本地配置文件会覆盖此通读基础。较旧的安装将共享存储保留在主代理的数据库中，直到 `openclaw doctor --fix` 重新定位它。
- 仅旧版导入：`auth-profiles.json`、每个代理 `auth.json` 和 `~/.openclaw/credentials/oauth.json`。运行`openclaw doctor --fix`将其导入到SQLite中；新登录不会写入这些文件。

路径遵循 `$OPENCLAW_STATE_DIR`。有关共享存储和代理本地行为，请参阅 [Auth 凭证语义](/auth-credential-semantics#agent-copy-portability)。

凭证存储模式：

- 默认的 onboarding 行为会将 API keys 作为明文值持久化到 auth profiles 中。
- `--secret-input-mode ref` 会启用引用模式，而不是以明文形式存储 key。 在交互式设置中，你可以选择：
  - 环境变量引用（例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`）
  - 已配置的 provider 引用（`file` 或 `exec`），带有 provider 别名和 id
- 交互式引用模式会在保存前运行快速预检验证。
  - Env refs：验证变量名称，以及当前 onboarding 环境中的值是否非空。
  - Provider refs：验证 provider 配置并解析请求的 id。
  - 如果预检失败，onboarding 会显示错误并允许你重试。
- 在非交互式模式下，`--secret-input-mode ref` 只会为新凭证创建基于环境变量的引用。
  - 添加新凭证时，在 onboarding 进程环境中设置 provider 环境变量。
  - 内联 key 标志（例如 `--openai-api-key`）要求设置相应的环境变量；否则 onboarding 会快速失败。
  - 现有的、可解析的命名 auth profiles 会保持不变地复用，包括现有的 `env`、`file`、`exec` 和 `store` 引用；不会写入新的 `apiKey` 或 `keyRef`，也不需要额外的 provider 环境变量。
  - 对于新的 custom-provider 凭证，非交互式 `ref` 模式会将 `models.providers.<id>.apiKey` 存储为 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`。
  - 在该定制提供商情况下，`--custom-api-key` 需要设置 `CUSTOM_API_KEY`；否则入门引导很快就会失败。
  - 现有的明文 profile 凭证保持不变；引用模式不会迁移这些凭证。运行 `openclaw secrets configure --apply`，然后运行 `openclaw secrets audit --check`。请参阅 [Secrets management](/gateway/secrets)。
- Gateway 设置默认以令牌模式生成密钥。交互式存储选择为 **Generate/store 明文机密**（默认）或 **使用 SecretRef**。现有密码模式`--gateway-auth password`或`--gateway-password <value>`使用密码存储，支持明文或SecretRef。
- 非交互式 token SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
- 登录过程中指定的环境变量必须非空。 `--gateway-token` 和 `--gateway-token-ref-env` 是互斥的。
- 现有的明文设置继续正常工作，不会发生变化。

## <a id="headless-and-server-setup"></a> Headless 和服务器设置

使用与网关相同的 OS 用户和状态目录，在网关主机 **上运行 auth setup**。在SSH上，使用交互式终端：

```bash
openclaw configure --section model
```

选择您的提供商支持的身份验证方法。对于浏览器 OAuth 流，请在本地浏览器中打开显示的 URL，并在出现提示时将重定向 URL 或授权代码粘贴回网关主机上的终端中。如果提供商提供设备代码登录，请在网关主机的登录过程等待期间，在本地浏览器中完成显示的 URL/code。完成的登录将凭证保留在该主机上的 SQLite 中；不需要凭证文件移交。

对于特定代理，请在网关主机上运行 `openclaw models auth login --provider <id> --agent <agentId>`。请参阅 [ 模型 CLI](/cli/models#auth-profiles) 和 [OAuth](/concepts/oauth)。

对于无人值守设置，请将提供商 API 密钥与 [ 非交互式入门引导 ](/cli/onboard#non-interactive-setup) 结合使用。如果您使用 `--secret-input-mode ref`，请使引用的环境变量可用于网关服务以及加入过程。请参阅 [Authentication](/gateway/authentication)。

使用 `openclaw models status` 验证网关主机上的结果（为特定代理添加 `--agent <agentId>`）。远程客户端登录仅配置本地客户端连接；它不会在服务器上设置提供者凭据。请勿复制 `auth-profiles.json` 或替换 SQLite 数据库来转移登录名。

## <a id="outputs-and-internals"></a> 输出与内部机制

`~/.openclaw/openclaw.json` 中的典型字段：

- `agents.defaults.workspace`
- `agents.defaults.skipBootstrap` 当传入 `--skip-bootstrap` 时
- `agents.defaults.model` 和所选提供商需要时的提供商配置
- `tools.profile`（本地载入在未设置时选择 `"full"`，包括重新运行时；保留显式配置文件和其他工具策略）。完全工具选择不是完全访问执行权限。参见 [ 工具配置文件 ](/gateway/config-tools/tool-policy#tool-profiles)。
- `gateway.*`（模式、绑定、认证、tailscale）
- `session.dmScope`（引导会保留显式值，否则保持未设置，因此 `main` 默认会在代理的滚动主会话中保留跨渠道的所有直接消息——这是个人代理的默认行为。对于共享或多用户收件箱，请使用 `per-channel-peer`；`openclaw security audit` 在检测到多用户 DM 流量时会建议隔离）
- `channels.telegram.botToken`, `channels.discord.token`, `channels.matrix.*`, `channels.signal.*`, `channels.imessage.*`
- 当您在提示期间选择加入时，Channel 会列入白名单。 Discord、Matrix、Microsoft Teams 和 Slack 尽可能将名称解析为 ID；其他通道直接接受其本机 ID。
- `skills.install.nodeManager`
  - `setup --node-manager` 标志接受 `npm`、`pnpm` 或 `bun`。
  - 以后手动配置仍然可以设置`skills.install.nodeManager: "yarn"`。
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`
- `wizard.securityAcknowledgedAt`

`openclaw agents add` 会写入 `agents.entries.*` 和可选的 `bindings`。

WhatsApp 凭证位于 `~/.openclaw/credentials/whatsapp/<accountId>/` 下。活动会话和记录存储在 `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite` 中。 `~/.openclaw/agents/<agentId>/sessions/` 目录用于旧迁移输入和 archive/support 工件。

<Note>
某些渠道作为插件提供。选择后，在渠道配置之前，引导程序会提示安装插件（npm 或本地路径）。
</Note>

### <a id="installed-app-recommendations"></a> 已安装应用推荐

模型访问检查成功后，macOS 上的经典交互式载入将扫描应用程序名称和捆绑包 ID，而无需请求 macOS 隐私权限。它搜索官方插件目录和ClawHub，然后要求配置的模型拒绝虚假名称匹配并推荐相关插件或技能。默认情况下仅选择官方插件目录中推荐的匹配项；可选匹配和所有 ClawHub 技能都需要明确选择。

结果屏幕列出了检测到的应用程序并显示：“使用您配置的模型和 ClawHub 搜索来匹配应用程序名称。”将 `wizard.appRecommendations` 设置为 `false` 以禁用此加入步骤和对节点应用程序清单的网关访问。在 Quick start、经典 QuickStart 或非 macOS 载入中不使用扫描。

## <a id="non-interactive-setup"></a> 非交互式设置

`--non-interactive` 需要 `--accept-risk`（表示已知代理功能强大且拥有完整系统访问权限存在风险）：

```bash
openclaw onboard --non-interactive --accept-risk --skip-health \
  --auth-choice apiKey \
  --anthropic-api-key "$ANTHROPIC_API_KEY"
```

`--mode` 默认为 `local`。 `--json` 更改输出格式，但并不意味着非交互模式。有关完整的标志语义和网关 SecretRef 示例，请参阅 [`openclaw onboard`](/cli/onboard)。特定于提供商的脚本位于 [CLI 自动化 ](/start/wizard-cli-automation) 中。

## <a id="gateway-wizard-rpc"></a> 网关向导 RPC

- `wizard.start`
- `wizard.next`
- `wizard.cancel`
- `wizard.status`

客户端（macOS 应用和 Control UI）可以直接渲染步骤，而无需重新实现引导逻辑。

当设置准入繁忙时，`wizard.start` 和模型设置 start/activation 方法返回 `UNAVAILABLE` 和 `details.code: "SETUP_ADMISSION_BUSY"`。这意味着请求的操作尚未开始：客户端可以放弃该尝试并允许在竞争设置完成后显式重试。终端向导 `error` 也会结束该操作，但并不意味着先前的写入已回滚。一般请求失败、超时、断开连接和缺少向导无法确定安装程序是否运行；客户端必须保留这种不确定性，而不是自动重试或声称成功激活。

如果网关重新启动丢失了内存中模型设置向导，Control UI 将刷新已保存的模型和提供程序状态。提供配置模型以进行显式验证和延续；如果未配置任何内容，则提供商选择将再次可用，而无需等待旧向导的截止时间。失败的刷新会保留恢复防护，并且可以使用 **重试，再次检查**。恢复永远不会重播之前的登录或应答，将保存的模型视为成功的验证，或者需要删除设置状态。支持配置热重载的模型设置无需重新启动网关即可应用。

## <a id="signal-setup-behavior"></a> Signal 设置行为

- 从官方 `signal-cli` GitHub releases 下载合适的 release 资源包（原生构建，仅限 Linux x86-64）
- 在其他平台（macOS、非 x64 Linux）上，改为通过 Homebrew 安装
- 将 release 资源包安装到 `~/.openclaw/tools/signal-cli/<version>/`
- 在配置中写入 `channels.signal.transport.cliPath`，并设置 `kind: "managed-native"`
- 暂不支持原生 Windows；请在 WSL2 中运行 onboarding 以获取 Linux 安装路径

## <a id="related-docs"></a> 相关文档

- Onboarding 中心：[Onboarding （CLI）](/start/wizard)
- 自动化和脚本：[CLI Automation](/start/wizard-cli-automation)
- 命令参考：[`openclaw onboard`](/cli/onboard)
