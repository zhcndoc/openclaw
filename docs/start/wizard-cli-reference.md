---
summary: "CLI 设置流程、认证/模型设置、输出和内部机制的完整参考"
read_when:
  - 你需要了解 openclaw onboard 的详细行为
  - 你在调试 onboarding 结果或集成 onboarding 客户端
title: "CLI 设置参考"
sidebarTitle: "CLI 参考"
---

本页是 `openclaw onboard` 的完整参考文档。
如需简要指南，请参见 [Onboarding (CLI)](/start/wizard)。

## 向导会做什么

本地模式（默认）会引导你完成：

- 模型和认证设置（OpenAI Code 订阅 OAuth、Anthropic Claude CLI 或 API key，以及 MiniMax、GLM、Ollama、Moonshot、StepFun 和 AI Gateway 选项）
- 工作区位置和引导文件
- 网关设置（端口、绑定、认证、tailscale）
- 频道和提供方（Telegram、WhatsApp、Discord、Google Chat、Mattermost、Signal、BlueBubbles，以及其他捆绑的频道插件）
- 守护进程安装（LaunchAgent、systemd 用户单元，或原生 Windows 计划任务，并带有 Startup 文件夹回退方案）
- 健康检查
- 技能设置

远程模式会配置这台机器去连接其他地方的网关。
它不会在远程主机上安装或修改任何内容。

## 本地流程详情

<Steps>
  <Step title="检测现有配置">
    - 如果 `~/.openclaw/openclaw.json` 存在，可选择 保留、修改 或 重置。
    - 重新运行向导不会清除任何内容，除非你明确选择 重置（或传入 `--reset`）。
    - CLI `--reset` 默认范围为 `config+creds+sessions`；使用 `--reset-scope full` 还会移除工作区。
    - 如果配置无效或包含旧版键，向导会停止并要求你先运行 `openclaw doctor` 再继续。
    - 重置使用 `trash`，并提供这些范围：
      - 仅配置
      - 配置 + 凭证 + 会话
      - 完整重置（也会移除工作区）

  </Step>
  <Step title="模型和认证">
    - 完整选项矩阵见 [认证和模型选项](#auth-and-model-options)。

  </Step>
  <Step title="工作区">
    - 默认 `~/.openclaw/workspace`（可配置）。
    - 会填充首次启动引导仪式所需的工作区文件。
    - 工作区布局：[Agent workspace](/concepts/agent-workspace)。

  </Step>
  <Step title="网关">
    - 会提示设置端口、绑定、认证模式和 tailscale 暴露。
    - 推荐：即使在 loopback 上也保持令牌认证开启，这样本地 WS 客户端必须进行认证。
    - 在令牌模式下，交互式设置提供：
      - **生成/保存明文令牌**（默认）
      - **使用 SecretRef**（可选）
    - 在密码模式下，交互式设置同样支持明文或 SecretRef 存储。
    - 非交互式令牌 SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
      - 要求在 onboarding 进程环境中该环境变量非空。
      - 不能与 `--gateway-token` 同时使用。
    - 只有在你完全信任每个本地进程时才应禁用认证。
    - 非 loopback 绑定仍然需要认证。

  </Step>
  <Step title="频道">
    - [WhatsApp](/channels/whatsapp)：可选的 QR 登录
    - [Telegram](/channels/telegram)：机器人令牌
    - [Discord](/channels/discord)：机器人令牌
    - [Google Chat](/channels/googlechat)：服务账号 JSON + webhook audience
    - [Mattermost](/channels/mattermost)：机器人令牌 + 基础 URL
    - [Signal](/channels/signal)：可选安装 `signal-cli` + 账号配置
    - [BlueBubbles](/channels/bluebubbles)：推荐用于 iMessage；服务器 URL + 密码 + webhook
    - [iMessage](/channels/imessage)：旧版 `imsg` CLI 路径 + DB 访问
    - DM 安全：默认是配对。首次 DM 会发送一个代码；通过
      `openclaw pairing approve <channel> <code>` 批准，或使用允许名单。
  </Step>
  <Step title="守护进程安装">
    - macOS：LaunchAgent
      - 需要已登录用户会话；无头环境请使用自定义 LaunchDaemon（未随附）。
    - Linux 和通过 WSL2 的 Windows：systemd 用户单元
      - 向导会尝试 `loginctl enable-linger <user>`，以便网关在注销后仍保持运行。
      - 可能会提示使用 sudo（会写入 `/var/lib/systemd/linger`）；它会先尝试不使用 sudo。
    - 原生 Windows：优先使用计划任务
      - 如果创建任务被拒绝，OpenClaw 会回退为按用户的 Startup 文件夹登录项，并立即启动网关。
      - 仍然优先使用计划任务，因为它们提供更好的监督状态。
    - 运行时选择：Node（推荐；WhatsApp 和 Telegram 必需）。不推荐 Bun。

  </Step>
  <Step title="健康检查">
    - 启动网关（如需要）并运行 `openclaw health`。
    - `openclaw status --deep` 会在状态输出中添加实时网关健康探测，包括在支持时的频道探测。

  </Step>
  <Step title="技能">
    - 读取可用技能并检查需求。
    - 允许你选择 node 管理器：npm、pnpm 或 bun。
    - 安装可选依赖项（其中一些在 macOS 上使用 Homebrew）。

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

远程模式会配置这台机器去连接其他地方的网关。

<Info>
远程模式不会在远程主机上安装或修改任何内容。
</Info>

你需要设置的内容：

- 远程网关 URL (`ws://...`)
- 如果远程网关需要认证，则提供令牌（推荐）

<Note>
- 如果网关仅限 loopback，请使用 SSH 隧道或 tailnet。
- 发现提示：
  - macOS：Bonjour (`dns-sd`)
  - Linux：Avahi (`avahi-browse`)

</Note>

## 认证和模型选项

<AccordionGroup>
  <Accordion title="Anthropic API key">
    如果存在则使用 `ANTHROPIC_API_KEY`，否则提示输入 key，然后保存以供守护进程使用。
  </Accordion>
  <Accordion title="OpenAI Code 订阅（OAuth）">
    浏览器流程；粘贴 `code#state`。

    当模型未设置或已是 OpenAI 系列时，会将 `agents.defaults.model` 设置为 `openai-codex/gpt-5.5`。

  </Accordion>
  <Accordion title="OpenAI Code 订阅（设备配对）">
    带短期设备码的浏览器配对流程。

    当模型未设置或已是 OpenAI 系列时，会将 `agents.defaults.model` 设置为 `openai-codex/gpt-5.5`。

  </Accordion>
  <Accordion title="OpenAI API key">
    如果存在则使用 `OPENAI_API_KEY`，否则提示输入 key，然后将凭证存储在 auth profiles 中。

    当模型未设置、为 `openai/*` 或为 `openai-codex/*` 时，会将 `agents.defaults.model` 设置为 `openai/gpt-5.5`。

  </Accordion>
  <Accordion title="xAI (Grok) API key">
    提示输入 `XAI_API_KEY`，并将 xAI 配置为模型提供方。
  </Accordion>
  <Accordion title="OpenCode">
    提示输入 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`），并允许你选择 Zen 或 Go 目录。
    设置 URL： [opencode.ai/auth](https://opencode.ai/auth)。
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
    配置会自动写入。托管默认值为 `MiniMax-M2.7`；API key 设置使用
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
  <Accordion title="自定义提供方">
    适用于 OpenAI 兼容和 Anthropic 兼容端点。

    交互式 onboarding 支持与其他提供方 API key 流程相同的存储选项：
    - **现在粘贴 API key**（明文）
    - **使用 secret reference**（环境变量引用或已配置的 provider 引用，带预检验证）

    非交互式标志：
    - `--auth-choice custom-api-key`
    - `--custom-base-url`
    - `--custom-model-id`
    - `--custom-api-key`（可选；回退到 `CUSTOM_API_KEY`）
    - `--custom-provider-id`（可选）
    - `--custom-compatibility <openai|anthropic>`（可选；默认 `openai`）
    - `--custom-image-input` / `--custom-text-input`（可选；覆盖推断出的模型输入能力）

  </Accordion>
  <Accordion title="跳过">
    不配置认证。
  </Accordion>
</AccordionGroup>

模型行为：

- 从检测到的选项中选择默认模型，或手动输入提供方和模型。
- 自定义提供方 onboarding 会为常见模型 ID 推断图像支持，只在模型名称未知时才会询问。
- 当 onboarding 从某个提供方认证选项开始时，模型选择器会自动优先显示
  该提供方。对于 Volcengine 和 BytePlus，这一偏好也会匹配它们的编程计划变体（`volcengine-plan/*`、
  `byteplus-plan/*`）。
- 如果该首选提供方过滤结果为空，选择器会回退到
  完整目录，而不是显示没有模型。
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
- `agents.defaults.skipBootstrap`，当传入 `--skip-bootstrap` 时
- `agents.defaults.model` / `models.providers`（如果选择了 Minimax）
- `tools.profile`（本地引导在未设置时默认为 `"coding"`；现有显式值会被保留）
- `gateway.*`（模式、绑定、认证、tailscale）
- `session.dmScope`（本地引导在未设置时默认为 `per-channel-peer`；现有显式值会被保留）
- `channels.telegram.botToken`、`channels.discord.token`、`channels.matrix.*`、`channels.signal.*`、`channels.imessage.*`
- 在提示过程中选择加入时的渠道允许列表（Slack、Discord、Matrix、Microsoft Teams）（在可能时，名称会解析为 ID）
- `skills.install.nodeManager`
  - `setup --node-manager` 标志接受 `npm`、`pnpm` 或 `bun`。
  - 手动配置之后仍然可以将 `skills.install.nodeManager` 设为 `"yarn"`。
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 会写入 `agents.list[]` 和可选的 `bindings`。

WhatsApp 凭据存放在 `~/.openclaw/credentials/whatsapp/<accountId>/`。
会话存放在 `~/.openclaw/agents/<agentId>/sessions/`。

<Note>
某些渠道作为插件提供。选择后，在渠道配置之前，引导程序会提示安装插件（npm 或本地路径）。
</Note>

Gateway 向导 RPC：

- `wizard.start`
- `wizard.next`
- `wizard.cancel`
- `wizard.status`

客户端（macOS 应用和 Control UI）可以直接渲染步骤，而无需重新实现引导逻辑。

Signal 设置行为：

- 下载相应的发布资产
- 将其存储在 `~/.openclaw/tools/signal-cli/<version>/`
- 在配置中写入 `channels.signal.cliPath`
- JVM 构建需要 Java 21
- 在可用时使用原生构建
- Windows 使用 WSL2，并在 WSL 内遵循 Linux signal-cli 流程

## 相关文档

- 引导中心：[Onboarding (CLI)](/start/wizard)
- 自动化与脚本：[CLI Automation](/start/wizard-cli-automation)
- 命令参考：[`openclaw onboard`](/cli/onboard)
