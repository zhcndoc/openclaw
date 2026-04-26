---
summary: "CLI 设置流程、认证/模型设置、输出和内部机制的完整参考"
read_when:
  - 你需要了解 openclaw onboard 的详细行为
  - 你正在调试上线结果或集成上线客户端
title: "CLI setup reference"
sidebarTitle: "CLI reference"
---

本页是 `openclaw onboard` 的完整参考。
如需简明指南，请参见 [Onboarding (CLI)](/start/wizard)。

## 向导功能说明

本地模式（默认）引导你完成：

- 模型和认证设置（OpenAI Code 订阅 OAuth、Anthropic Claude CLI 或 API key，以及 MiniMax、GLM、Ollama、Moonshot、StepFun 和 AI Gateway 选项）
- 工作空间位置和引导文件
- 网关设置（端口、绑定、认证、tailscale）
- 通道和提供商（Telegram、WhatsApp、Discord、Google Chat、Mattermost、Signal、BlueBubbles，以及其他内置通道插件）
- 守护进程安装（LaunchAgent、systemd 用户单元，或原生 Windows 计划任务，并带有 Startup 文件夹回退）
- 健康检查
- 技能设置

远程模式配置本机以连接至其他位置的网关。  
它不会在远程主机上安装或修改任何内容。

## 本地流程详情

<Steps>
  <Step title="检测现有配置">
    - 若存在 `~/.openclaw/openclaw.json`，可选择保留、修改或重置。  
    - 再次运行向导不会清除任何内容，除非你明确选择重置（或传入 `--reset`）。  
    - CLI `--reset` 默认重置范围为 `config+creds+sessions`；使用 `--reset-scope full` 可同时清除工作空间。  
    - 如果配置无效或包含遗留键，向导会停止并提示先执行 `openclaw doctor` 后再继续。  
    - 重置使用 `trash`，并提供以下范围选择：  
      - 仅配置  
      - 配置 + 凭据 + 会话  
      - 完全重置（同时删除工作空间）  
  </Step>
  <Step title="模型和认证">
    - 完整选项矩阵见 [认证和模型选项](#auth-and-model-options)。  
  </Step>
  <Step title="工作空间">
    - 默认位于 `~/.openclaw/workspace`（可配置）。  
    - 初始化所需的首次启动工作空间文件。  
    - 工作空间布局见：[代理工作空间](/concepts/agent-workspace)。  
  </Step>
  <Step title="Gateway">
    - 提示端口、绑定、认证模式及 tailscale 暴露设置。  
    - 推荐：即使是回环也开启令牌认证，确保本地 WS 客户端需认证。  
    - 令牌模式下，交互式设置提供：  
      - **生成/存储明文令牌**（默认）  
      - **使用 SecretRef**（可选）  
    - 密码模式下，交互式设置也支持明文或 SecretRef 存储。  
    - 非交互式令牌 SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。  
      - 需在上线流程环境中存在非空环境变量。  
      - 不能与 `--gateway-token` 一起使用。  
    - 仅在完全信任所有本地进程时才禁用认证。  
    - 非回环绑定仍然需要认证。  
  </Step>
  <Step title="Channels">
    - [WhatsApp](/channels/whatsapp)：可选 QR 登录
    - [Telegram](/channels/telegram)：bot token
    - [Discord](/channels/discord)：bot token
    - [Google Chat](/channels/googlechat)：service account JSON + webhook audience
    - [Mattermost](/channels/mattermost)：bot token + base URL
    - [Signal](/channels/signal)：可选安装 `signal-cli` + 账户配置
    - [BlueBubbles](/channels/bluebubbles)：建议用于 iMessage；服务器 URL + 密码 + webhook
    - [iMessage](/channels/imessage)：旧版 `imsg` CLI 路径 + DB 访问
    - DM 安全：默认是配对。首次 DM 会发送验证码；可通过
      `openclaw pairing approve <channel> <code>` 批准，或使用允许列表。
  </Step>
  <Step title="Daemon install">
    - macOS：LaunchAgent
      - 需要已登录的用户会话；对于无头环境，请使用自定义 LaunchDaemon（未随附）。
    - Linux 和通过 WSL2 的 Windows：systemd 用户单元
      - 向导会尝试 `loginctl enable-linger <user>`，以便网关在注销后继续运行。
      - 可能会提示输入 sudo（会写入 `/var/lib/systemd/linger`）；它会先尝试不使用 sudo。
    - 原生 Windows：优先使用计划任务
      - 如果创建任务被拒绝，OpenClaw 会回退到按用户的 Startup 文件夹登录项，并立即启动网关。
      - 仍然优先使用计划任务，因为它们提供更好的监督状态。
    - 运行时选择：Node（推荐；WhatsApp 和 Telegram 必需）。不推荐 Bun。
  </Step>
  <Step title="Health check">
    - 启动网关（如需要）并运行 `openclaw health`。
    - `openclaw status --deep` 会在状态输出中增加实时网关健康探测，包括在支持时的通道探测。
  </Step>
  <Step title="Skills">
    - 读取可用技能并检查依赖项。
    - 允许你选择 node 管理器：npm、pnpm 或 bun。
    - 安装可选依赖（部分在 macOS 上使用 Homebrew）。
  </Step>
  <Step title="完成">
    - 总结及后续步骤提示，包括 iOS、Android 及 macOS 应用的选项。  
  </Step>
</Steps>

<Note>
若检测不到 GUI，向导会输出用于 Control UI 的 SSH 端口转发指令，而非自动打开浏览器。  
若 Control UI 资源缺失，则尝试构建，备用命令为 `pnpm ui:build`（自动安装 UI 依赖）。  
</Note>

## 远程模式详情

远程模式配置本机以连接到其他位置的网关。

<Info>
远程模式不会在远程主机上安装或修改任何内容。  
</Info>

你需要设置：

- 远程网关 URL（`ws://...`）  
- 如果远程网关需要认证（推荐），则设置令牌  

<Note>
- 若网关仅限回环，可使用 SSH 隧道或 tailnet。  
- 发现提示：  
  - macOS：Bonjour（`dns-sd`）  
  - Linux：Avahi（`avahi-browse`）  
</Note>

## 认证和模型选项

<AccordionGroup>
  <Accordion title="Anthropic API 密钥">
    如果存在 `ANTHROPIC_API_KEY`，则使用；否则提示输入密钥，再保存供守护进程使用。  
  </Accordion>
  <Accordion title="OpenAI Code subscription (OAuth)">
    浏览器流程；粘贴 `code#state`。

    当模型未设置或已属于 OpenAI 家族时，将 `agents.defaults.model` 设置为 `openai-codex/gpt-5.5`。

  </Accordion>
  <Accordion title="OpenAI Code subscription (device pairing)">
    使用短时有效的设备代码进行浏览器配对流程。

    当模型未设置或已属于 OpenAI 家族时，将 `agents.defaults.model` 设置为 `openai-codex/gpt-5.5`。

    当模型未设置或为 `openai/*` 时，设置 `agents.defaults.model` 为 `openai-codex/gpt-5.4`。  
  </Accordion>
  <Accordion title="OpenAI API 密钥">
    如果存在 `OPENAI_API_KEY` 则使用，否则提示输入密钥，然后将凭据存储在认证配置档中。

    当模型未设置、为 `openai/*` 或 `openai-codex/*` 时，将 `agents.defaults.model` 设置为 `openai/gpt-5.4`。

    当模型未设置、为 `openai/*` 或 `openai-codex/*` 时，设置 `agents.defaults.model` 为 `openai/gpt-5.1-codex`。  
  </Accordion>
  <Accordion title="xAI (Grok) API 密钥">
    提示输入 `XAI_API_KEY` 并配置 xAI 为模型提供商。  
  </Accordion>
  <Accordion title="OpenCode">
    提示输入 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`），并允许您选择 Zen 或 Go 目录。  
    设置网址：[opencode.ai/auth](https://opencode.ai/auth)。  
  </Accordion>
  <Accordion title="API key（通用）">
    为你保存密钥。  
  </Accordion>
  <Accordion title="Vercel AI Gateway">
    提示输入 `AI_GATEWAY_API_KEY`。  
    详情见：[Vercel AI Gateway](/providers/vercel-ai-gateway)。  
  </Accordion>
  <Accordion title="Cloudflare AI Gateway">
    提示输入账户 ID、网关 ID 和 `CLOUDFLARE_AI_GATEWAY_API_KEY`。  
    详情见：[Cloudflare AI Gateway](/providers/cloudflare-ai-gateway)。  
  </Accordion>
  <Accordion title="MiniMax">
    配置会自动写入。托管默认值为 `MiniMax-M2.7`；API key 设置使用
    `minimax/...`，OAuth 设置使用 `minimax-portal/...`。
    更多详情：[MiniMax](/providers/minimax)。
  </Accordion>
  <Accordion title="StepFun">
    针对 StepFun 标准版或中国/全球端点的 Step Plan，会自动写入配置。
    Standard 当前包含 `step-3.5-flash`，Step Plan 还包含 `step-3.5-flash-2603`。
    更多详情：[StepFun](/providers/stepfun)。
  </Accordion>
  <Accordion title="Synthetic (Anthropic-compatible)">
    提示输入 `SYNTHETIC_API_KEY`。
    更多详情：[Synthetic](/providers/synthetic)。
  </Accordion>
  <Accordion title="Ollama（云端与本地开放模型）">
    会先提示你选择 `Cloud + Local`、`Cloud only` 或 `Local only`。
    `Cloud only` 使用 `OLLAMA_API_KEY` 并连接 `https://ollama.com`。
    基于宿主机的模式会提示输入 base URL（默认 `http://127.0.0.1:11434`），自动发现可用模型并推荐默认值。
    `Cloud + Local` 还会检查该 Ollama 主机是否已经登录云端访问。
    更多细节见：[Ollama](/providers/ollama)。
  </Accordion>
  <Accordion title="Moonshot 和 Kimi Coding">
    Moonshot (Kimi K2) 和 Kimi Coding 配置自动写入。  
    详情见：[Moonshot AI (Kimi + Kimi Coding)](/providers/moonshot)。  
  </Accordion>
  <Accordion title="自定义提供商">
    兼容 OpenAI 和 Anthropic 端点。  

    交互式上线支持与其它提供商 API key 流程相同的存储选项：  
    - **现在粘贴 API key**（明文）  
    - **使用 secret reference**（环境变量引用或已配置的提供商引用，带预验证）  

    非交互式标志：  
    - `--auth-choice custom-api-key`  
    - `--custom-base-url`  
    - `--custom-model-id`  
    - `--custom-api-key` （可选；回退使用 `CUSTOM_API_KEY`）  
    - `--custom-provider-id` （可选）  
    - `--custom-compatibility <openai|anthropic>` （可选；默认 `openai`）  
  </Accordion>
  <Accordion title="跳过">
    不配置认证。  
  </Accordion>
</AccordionGroup>

模型行为：

- 从检测到的候选项中选择默认模型，或手动输入 provider 和 model。
- 当 onboarding 从某个 provider 的认证选择开始时，模型选择器会自动优先该 provider。对于 Volcengine 和 BytePlus，这一偏好也会匹配它们对应的 coding-plan 变体（`volcengine-plan/*`、`byteplus-plan/*`）。
- 如果该首选提供商筛选结果为空，则选择器会回退到完整目录，而不是不显示任何模型。
- 向导会运行模型检查，并在配置的模型未知或缺少认证时发出警告。

凭据和配置路径：

- Auth profiles (API keys + OAuth): `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- Legacy OAuth import: `~/.openclaw/credentials/oauth.json`

凭据存储模式：

- 默认上线行为将 API key 以明文值存储在认证配置档中。  
- `--secret-input-mode ref` 启用引用模式替代明文密钥存储。  
  交互式设置中，你可以选择：  
  - 环境变量引用（例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`）  
  - 已配置提供商引用（`file` 或 `exec`），带提供商别名及 id  
- 交互式引用模式在保存前会进行快速预检：  
  - 环境变量引用：验证变量名称和当前上线环境中非空值。  
  - 提供商引用：校验提供商配置并解析请求的 id。  
  - 若预检失败，上线会显示错误并允许重试。  
- 非交互式模式中，`--secret-input-mode ref` 仅支持环境变量：  
  - 在上线流程环境中设置相应的提供商环境变量。  
  - 命令内联密钥标志（如 `--openai-api-key`）需该环境变量已设定，否则上线快速失败。  
  - 对自定义提供商，非交互式 `ref` 模式将 `models.providers.<id>.apiKey` 存储为 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`。  
  - 该自定义提供商情况下，`--custom-api-key` 需 `CUSTOM_API_KEY` 已设，否则上线快速失败。  
- 网关认证凭据在交互式设置中支持明文和 SecretRef 两种选择：  
  - 令牌模式：**生成/存储明文令牌**（默认）或 **使用 SecretRef**。  
  - 密码模式：明文或 SecretRef。  
- 非交互式令牌 SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。  
- 现有的明文设置继续正常工作。  

<Note>
无头和服务器提示：在有浏览器的机器上完成 OAuth，然后将该 agent 的 `auth-profiles.json`（例如
`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`，或匹配的
`$OPENCLAW_STATE_DIR/...` 路径）复制到网关主机。`credentials/oauth.json`
仅是一个旧版导入来源。
</Note>

## 输出和内部机制

`~/.openclaw/openclaw.json` 中常见字段：

- `agents.defaults.workspace`
- `agents.defaults.skipBootstrap` 当传入 `--skip-bootstrap` 时
- `agents.defaults.model` / `models.providers`（如果选择了 Minimax）
- `tools.profile`（本地上线在未设置时默认使用 `"coding"`；现有显式值会被保留）
- `gateway.*`（模式、绑定、认证、tailscale）
- `session.dmScope`（本地上线在未设置时默认设为 `per-channel-peer`；现有显式值会被保留）
- `channels.telegram.botToken`, `channels.discord.token`, `channels.matrix.*`, `channels.signal.*`, `channels.imessage.*`
- 通道白名单（Slack、Discord、Matrix、Microsoft Teams），当你在提示期间选择加入时（名称会在可能时解析为 ID）
- `skills.install.nodeManager`
  - `setup --node-manager` 标志接受 `npm`、`pnpm` 或 `bun`。
  - 后续手动配置仍可将 `skills.install.nodeManager` 设为 `"yarn"`。
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 会写入 `agents.list[]` 和可选的 `bindings`。  

WhatsApp 凭据存储于 `~/.openclaw/credentials/whatsapp/<accountId>/`。  
会话存储于 `~/.openclaw/agents/<agentId>/sessions/`。  

<Note>
部分通道以插件形式提供。设置时选择该通道，向导会提示先安装插件（npm 或本地路径），然后再配置通道。  
</Note>

网关向导 RPC：

- `wizard.start`  
- `wizard.next`  
- `wizard.cancel`  
- `wizard.status`  

客户端（macOS 应用和 Control UI）可呈现步骤，无需重新实现上线逻辑。  

Signal 设置行为：

- 下载对应版本的发布资产  
- 存储于 `~/.openclaw/tools/signal-cli/<version>/`  
- 在配置中写入 `channels.signal.cliPath`  
- JVM 构建需 Java 21  
- 优先使用原生构建  
- Windows 通过 WSL2，遵循 Linux signal-cli 流程在 WSL 中运行

## 相关文档

- 上线中心：[上线 (CLI)](/start/wizard)  
- 自动化与脚本：[CLI 自动化](/start/wizard-cli-automation)  
- 命令参考：[`openclaw onboard`](/cli/onboard)
