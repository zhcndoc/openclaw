---
summary: "openclaw onboard 的逐步行为：每一步做什么、写入哪些配置以及内部实现"
read_when:
  - 你需要了解某个特定 openclaw onboard 步骤的详细行为
  - 你正在调试 onboarding 结果或集成 onboarding 客户端
title: "CLI 设置参考"
sidebarTitle: "CLI 参考"
---

本页介绍逐步 onboarding 行为、输出和内部实现。
有关操作流程，请参阅 [Onboarding (CLI)](/start/wizard)。关于完整的 CLI 标志
参考（每个 `--flag`、非交互式示例、特定提供商的
命令），请参阅 [`openclaw onboard`](/cli/onboard)。

## 向导会做什么

本地模式（默认）会引导你完成：

- 模型和身份验证设置（Anthropic、OpenAI Code 订阅 OAuth、xAI、OpenCode、自定义端点，以及更多由提供商托管的认证流程）
- 工作区位置和引导文件
- 网关设置（端口、绑定、认证、Tailscale）
- 频道和提供商（Discord、飞书、Google Chat、iMessage、Mattermost、Microsoft Teams、QQ Bot、Signal、Slack、Telegram、WhatsApp，以及其他内置或插件频道）
- 网络搜索提供商（可选）
- 守护进程安装（LaunchAgent、systemd 用户单元，或原生 Windows 计划任务，带启动文件夹回退）
- 健康检查
- 技能设置

远程模式会配置这台机器连接到其他位置的网关。它不会在远程主机上安装或修改任何内容。

## 本地流程详情

<Steps>
  <Step title="Existing config detection">
    - 如果 `~/.openclaw/openclaw.json` 已存在，可选择 **保留当前值**、**审查并更新** 或 **重置后再设置**。
    - 重新运行向导不会清除任何内容，除非你明确选择 Reset（或传入 `--reset`）。
    - CLI `--reset` 默认作用范围为 `config+creds+sessions`；使用 `--reset-scope full` 还会移除 workspace。
    - 如果配置无效或包含旧版键，向导会停止，并要求你先运行 `openclaw doctor` 再继续。
    - Reset 会将状态移动到 Trash（绝不直接删除），并提供以下范围：
      - 仅配置
      - 配置 + 凭据 + 会话
      - 完整重置（同时移除 workspace）

  </Step>
  <Step title="模型和认证">
    - 完整选项矩阵见 [认证和模型选项](#auth-and-model-options)。

  </Step>
  <Step title="Workspace">
    - 默认 `~/.openclaw/workspace`（可配置）。
    - 为首次启动引导所需的 workspace 文件播种。
    - Workspace 布局：[Agent workspace](/concepts/agent-workspace)。

  </Step>
  <Step title="Gateway">
    - 提示输入端口、绑定地址、认证模式以及 Tailscale 暴露方式。
    - 推荐：即使是 loopback，也保持启用 token 认证，这样本地 WS 客户端也必须进行认证。
    - 在 token 模式下，交互式设置提供：
      - **生成/保存明文 token**（默认）
      - **使用 SecretRef**（可选）
    - 在 password 模式下，交互式设置也支持明文或 SecretRef 存储。
    - 非交互式 token SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
      - 要求在 onboarding 进程环境中存在一个非空 env var。
      - 不能与 `--gateway-token` 结合使用。
    - 只有在你完全信任每个本地进程时，才应禁用认证。
    - 非 loopback 绑定仍然需要认证。

  </Step>
  <Step title="渠道">
    - [WhatsApp](/channels/whatsapp): 可选 QR 登录
    - [Telegram](/channels/telegram): bot token
    - [Discord](/channels/discord): bot token
    - [Google Chat](/channels/googlechat): service account JSON + webhook audience
    - [Mattermost](/channels/mattermost): bot token + base URL
    - [Signal](/channels/signal): 可选安装 `signal-cli` + 账户配置
    - [iMessage](/channels/imessage): `imsg` CLI 路径 + Messages 数据库访问；当网关运行在非 Mac 机器上时请使用 SSH 包装器
    - DM 安全：默认是配对。第一条私信会发送验证码；通过
      `openclaw pairing approve <channel> <code>` 批准，或使用允许列表。
  </Step>
  <Step title="Web search">
    - 选择一个提供商（Brave、DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Ollama Web Search、Perplexity、SearXNG、Tavily）或跳过。
    - 使用 `--skip-search` 跳过此步骤；之后可通过 `openclaw configure --section web` 重新配置。

  </Step>
  <Step title="Daemon install">
    - macOS: LaunchAgent
      - 需要已登录的用户会话；对于无头环境，请使用自定义 LaunchDaemon（未随附）。
    - Linux 和通过 WSL2 的 Windows：systemd 用户单元
      - 向导会尝试 `loginctl enable-linger <user>`，以便注销后网关仍保持运行。
      - 可能会提示输入 sudo（写入 `/var/lib/systemd/linger`）；它会先尝试不使用 sudo。
    - 原生 Windows：优先使用 Scheduled Task
      - 如果拒绝创建任务，OpenClaw 会回退到按用户的 Startup-folder 登录项，并立即启动网关。
      - 仍然首选 Scheduled Tasks，因为它们提供更好的 supervisor 状态。
    - 运行时选择：交互式仅提供 Node。Bun 可能在 WhatsApp/Telegram 重连时导致内存损坏，因此这些渠道不支持将 Bun 用作 daemon 运行时；只有在不涉及该组合时才传入 `--daemon-runtime bun`。

  </Step>
  <Step title="健康检查">
    - 启动网关（如需要）并运行 `openclaw health`。
    - `openclaw status --deep` 会在状态输出中添加实时网关健康探测，包括在支持时的渠道探测。

  </Step>
  <Step title="Skills">
    - 读取可用 skills 并检查要求。
    - 允许你选择 node manager：npm、pnpm 或 bun。
    - 当所需安装器可用时，为受信任的 bundled skills 安装可选依赖。
    - 跳过不可用的 Homebrew、uv 和 Go 安装器，然后将受影响的 skills 分组并附上手动设置指导。安装缺失的前置条件后运行 `openclaw doctor`。

  </Step>
  <Step title="完成">
    - 总结和后续步骤，包括 iOS、Android 和 macOS 应用选项。

  </Step>
</Steps>

<Note>
如果未检测到 GUI，向导会打印 Control UI 的 SSH 端口转发说明，而不是打开浏览器。
如果 Control UI 资源缺失，向导会尝试构建它们；回退命令是 `pnpm ui:build`（会自动安装 UI 依赖）。
</Note>

## 远程模式详情

远程模式会将此机器配置为连接到其他位置的 Gateway。它不会在远程主机上安装或修改任何内容。

你需要设置的内容：

- 远程网关 URL (`ws://...` 或 `wss://...`)
- Token、密码，或无需认证，需与远程 Gateway 的配置匹配

<Steps>
  <Step title="发现（可选）">
    如果可用 `dns-sd`（macOS）或 `avahi-browse`（Linux），引导流程会先尝试搜索 Bonjour/mDNS 网关信标，然后再回退到手动输入 URL。若已配置，也会尝试广域 DNS-SD 发现。文档：[Gateway discovery](/gateway/discovery), [Bonjour](/gateway/bonjour).
  </Step>
  <Step title="连接方式">
    选中某个信标后，选择直接 WebSocket 或 SSH 隧道：
    - **Direct**：通过 `wss://` 连接，并提示你信任发现到的 TLS 指纹（首次使用信任固定；只有在你接受时才会固定）。
    - **SSH tunnel**：先打印一条需要运行的 `ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`
      命令，然后连接到本地隧道端点。
  </Step>
  <Step title="认证">
    选择 token（推荐）、密码或无需认证，然后可选择将其存储为 SecretRef 而不是明文。
  </Step>
</Steps>

<Note>
如果 gateway 仅限回环且不可发现，请手动使用 SSH 隧道或 tailnet。
明文 `ws://` 仅接受回环、本地私有 IP 字面量、`.local` 和 Tailnet `*.ts.net` URL；其他私有 DNS 名称需要 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`。
</Note>

## 认证和模型选项

<AccordionGroup>
  <Accordion title="Anthropic API key">
    如果存在则使用 `ANTHROPIC_API_KEY`，否则提示输入 key，然后保存以供守护进程使用。
  </Accordion>
  <Accordion title="Anthropic Claude CLI">
    在交互式 onboarding/配置中优先使用本地路径；如有可用的现有 Claude CLI 登录，则会复用。
  </Accordion>
  <Accordion title="OpenAI Code subscription (OAuth)">
    浏览器流程；粘贴 `code#state`。

    当模型未设置或已属于 OpenAI 系列时，通过 Codex 运行时将 `agents.defaults.model` 设置为 `openai/gpt-5.5`。

  </Accordion>
  <Accordion title="OpenAI Code 订阅（设备配对）">
    带短期设备码的浏览器配对流程。

    当模型未设置或已属于 OpenAI 系列时，通过 Codex 运行时将 `agents.defaults.model` 设置为 `openai/gpt-5.5`。

  </Accordion>
  <Accordion title="OpenAI API key">
    如果存在则使用 `OPENAI_API_KEY`，否则提示输入 key，然后将凭证存储在 auth profiles 中。

    当模型未设置、为 `openai/*`，或为旧版 Codex 模型引用时，将 `agents.defaults.model` 设置为 `openai/gpt-5.5`。

  </Accordion>
  <Accordion title="xAI（Grok）OAuth">
    适用于符合条件的 SuperGrok 或 X Premium 账户的浏览器登录。
    这是大多数用户推荐的 xAI 路径。OpenClaw 会将生成的认证
    profile 存储起来，用于 Grok 模型、Grok `web_search`、`x_search` 和 `code_execution`。
  </Accordion>
  <Accordion title="xAI（Grok）设备码">
    面向远程场景的浏览器登录，使用短码而不是 localhost
    回调。适用于 SSH、Docker 或 VPS 主机。
  </Accordion>
  <Accordion title="xAI（Grok）API key">
    提示输入 `XAI_API_KEY` 并将 xAI 配置为模型提供方。适用于
    你想使用 xAI Console API key 而不是订阅 OAuth 的情况。
  </Accordion>
  <Accordion title="OpenCode">
    提示输入 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`），并让你选择 Zen 或 Go 目录（一个 API key 可同时覆盖两者）。
    设置网址：[opencode.ai/auth](https://opencode.ai/auth)。
  </Accordion>
  <Accordion title="API key（通用）">
    为你保存该 key。
  </Accordion>
  <Accordion title="Vercel AI Gateway">
    提示输入 `AI_GATEWAY_API_KEY`。
    更多详情：[Vercel AI Gateway](/providers/vercel-ai-gateway).
  </Accordion>
  <Accordion title="Cloudflare AI Gateway">
    提示输入 account ID、gateway ID 和 `CLOUDFLARE_AI_GATEWAY_API_KEY`。
    更多详情：[Cloudflare AI Gateway](/providers/cloudflare-ai-gateway).
  </Accordion>
  <Accordion title="MiniMax">
    配置会自动写入。托管默认值为 `MiniMax-M3`；API key 设置使用
    `minimax/...`，OAuth 设置使用 `minimax-portal/...`。
    更多详情：[MiniMax](/providers/minimax).
  </Accordion>
  <Accordion title="StepFun">
    会为中国或全球端点上的 StepFun standard 或 Step Plan 自动写入配置。
    Standard 当前包含 `step-3.5-flash`，Step Plan 还包含 `step-3.5-flash-2603`。
    更多详情：[StepFun](/providers/stepfun).
  </Accordion>
  <Accordion title="Synthetic（Anthropic 兼容）">
    提示输入 `SYNTHETIC_API_KEY`。
    更多详情：[Synthetic](/providers/synthetic).
  </Accordion>
  <Accordion title="Ollama（云端和本地开源模型）">
    首先提示选择 `Cloud + Local`、`Cloud only` 或 `Local only`。
    `Cloud only` 使用 `OLLAMA_API_KEY` 和 `https://ollama.com`。
    基于主机的模式会提示输入基础 URL（默认 `http://127.0.0.1:11434`），发现可用模型，并建议默认值。
    `Cloud + Local` 还会检查该 Ollama 主机是否已登录以启用云访问。
    更多详情：[Ollama](/providers/ollama).
  </Accordion>
  <Accordion title="Moonshot 和 Kimi Coding">
    Moonshot（Kimi K2）和 Kimi Coding 配置会自动写入。
    更多详情：[Moonshot AI (Kimi + Kimi Coding)](/providers/moonshot).
  </Accordion>
  <Accordion title="Custom provider">
    适用于 OpenAI-compatible、OpenAI Responses-compatible 和 Anthropic-compatible 端点。

    交互式 onboarding 支持与其他提供方 API key 流程相同的存储选项：
    - **现在粘贴 API key**（明文）
    - **使用 secret reference**（环境变量引用或已配置的 provider 引用，带预检验证）

    Onboarding 会根据常见视觉模型 ID（GPT-4o/4.1/5.x、Claude 3/4、Gemini、Qwen-VL、LLaVA、Pixtral 等）推断图像支持，并且仅在模型名称未知时才会询问。

    非交互式标志：
    - `--auth-choice custom-api-key`
    - `--custom-base-url`
    - `--custom-model-id`
    - `--custom-api-key`（可选；回退到 `CUSTOM_API_KEY`）
    - `--custom-provider-id`（可选）
    - `--custom-compatibility <openai|openai-responses|anthropic>`（可选；默认 `openai`）
    - `--custom-image-input` / `--custom-text-input`（可选；覆盖推断出的模型输入能力）

  </Accordion>
  <Accordion title="跳过">
    不配置认证。
  </Accordion>
</AccordionGroup>

模型行为：

- 从检测到的选项中选择默认模型，或手动输入提供方和模型。
- 当 onboarding 从某个提供方认证选项开始时，模型选择器会自动优先使用
  该提供方。对于 Volcengine 和 BytePlus，同样的优先级
  也适用于它们的 coding-plan 变体（`volcengine-plan/*`、
  `byteplus-plan/*`）。
- 如果该“首选提供方”筛选结果为空，选择器会回退到
  完整目录，而不是不显示任何模型。
- 向导会运行模型检查，并在配置的模型未知或缺少认证时发出警告。

凭证和 profile 路径：

- Auth profiles（API keys + OAuth）：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- 旧版 OAuth 导入：`~/.openclaw/credentials/oauth.json`

凭证存储模式：

- 默认 onboarding 行为会将 API key 作为明文值持久化到 auth profiles 中。
- `--secret-input-mode ref` 会启用引用模式，而不是明文 key 存储。
  在交互式设置中，你可以选择：
  - 环境变量引用（例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`）
  - 已配置 provider 引用（`file` 或 `exec`），带 provider 别名 + id
- 交互式引用模式会在保存前运行快速预检验证。
  - Env refs：验证当前 onboarding 环境中的变量名 + 非空值。
  - Provider refs：验证 provider 配置并解析请求的 id。
  - 如果预检失败，onboarding 会显示错误并允许你重试。
- 在非交互模式下，`--secret-input-mode ref` 仅支持 env-backed。
  - 在 onboarding 进程环境中设置 provider 环境变量。
  - 内联 key 标志（例如 `--openai-api-key`）要求该环境变量已设置；否则 onboarding 会快速失败。
  - 对于自定义提供方，非交互式 `ref` 模式会将 `models.providers.<id>.apiKey` 存储为 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`。
  - 在该自定义提供方场景中，`--custom-api-key` 要求已设置 `CUSTOM_API_KEY`；否则 onboarding 会快速失败。
- 网关认证凭证在交互式设置中支持明文和 SecretRef 两种选择：
  - 令牌模式：**生成/保存明文令牌**（默认）或 **使用 SecretRef**。
  - 密码模式：明文或 SecretRef。
- 非交互式令牌 SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
- 现有的明文设置会保持不变并继续工作。

<Note>
无头和服务器提示：先在一台带浏览器的机器上完成 OAuth，然后将该 agent 的 `auth-profiles.json`（例如
`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`，或对应的
`$OPENCLAW_STATE_DIR/...` 路径）复制到网关主机。`credentials/oauth.json`
只是一个旧版导入来源。
</Note>

## 输出与内部机制

`~/.openclaw/openclaw.json` 中的典型字段：

- `agents.defaults.workspace`
- `agents.defaults.skipBootstrap` 当传入 `--skip-bootstrap` 时
- `agents.defaults.model` / `models.providers`（如果选择了 Minimax）
- `tools.profile`（本地引导在未设置时默认使用 `"coding"`；现有显式值会被保留）
- `gateway.*`（模式、绑定、认证、tailscale）
- `session.dmScope`（本地引导在未设置时默认设为 `per-channel-peer`；现有显式值会被保留）
- `channels.telegram.botToken`、`channels.discord.token`、`channels.matrix.*`、`channels.signal.*`、`channels.imessage.*`
- 渠道允许列表（Discord、iMessage、Signal、Slack、Telegram、WhatsApp）会在你于提示过程中选择启用时写入；Discord 和 Slack 还会将输入的名称解析为 ID
- `skills.install.nodeManager`
  - `setup --node-manager` 标志接受 `npm`、`pnpm` 或 `bun`。
  - 手动配置之后仍然可以将 `skills.install.nodeManager` 设为 `"yarn"`。
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`
- `wizard.securityAcknowledgedAt`

`openclaw agents add` 会写入 `agents.list[]` 和可选的 `bindings`。

WhatsApp 凭据存放在 `~/.openclaw/credentials/whatsapp/<accountId>/`。
会话存放在 `~/.openclaw/agents/<agentId>/sessions/`。

<Note>
某些渠道作为插件提供。选择后，在渠道配置之前，引导程序会提示安装插件（npm 或本地路径）。
</Note>

## 非交互式设置

`--non-interactive` 需要 `--accept-risk`（表示已知代理功能强大且拥有完整系统访问权限存在风险）：

```bash
openclaw onboard --non-interactive --accept-risk \
  --auth-choice apiKey \
  --anthropic-api-key "$ANTHROPIC_API_KEY"
```

完整的标志参考和特定提供商示例：[`openclaw onboard`](/cli/onboard)、[CLI 自动化](/start/wizard-cli-automation)。

## 网关向导 RPC

- `wizard.start`
- `wizard.next`
- `wizard.cancel`
- `wizard.status`

客户端（macOS 应用和 Control UI）可以直接渲染步骤，而无需重新实现引导逻辑。

## Signal 设置行为

- 从官方 `signal-cli` GitHub releases 下载合适的发布资源（原生构建，仅限 Linux x86-64）
- 在其他平台（macOS、非 x64 Linux）上，则改为通过 Homebrew 安装
- 将发布资源安装内容存储在 `~/.openclaw/tools/signal-cli/<version>/`
- 在配置中写入 `channels.signal.cliPath`
- 目前尚不支持原生 Windows；请在 WSL2 中运行引导流程以获取 Linux 安装路径

## 相关文档

- 引导中心：[CLI 入门](/start/wizard)
- 自动化与脚本：[CLI 自动化](/start/wizard-cli-automation)
- 命令参考：[`openclaw onboard`](/cli/onboard)
