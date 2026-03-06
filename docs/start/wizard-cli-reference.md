---
summary: "CLI 上线流程、认证/模型设置、输出及内部机制的完整参考"
read_when:
  - 你需要了解 openclaw 上线的详细行为
  - 你正在调试上线结果或集成上线客户端
title: "CLI 上线参考"
sidebarTitle: "CLI 参考"
---

# CLI 上线参考

本页为 `openclaw onboard` 的完整参考。
简短指南请参见 [上线向导（CLI）](/start/wizard)。

## 向导功能说明

本地模式（默认）引导你完成：

- 模型和认证设置（OpenAI Code 订阅 OAuth，Anthropic API key 或 setup token，以及 MiniMax、GLM、Moonshot 和 AI Gateway 选项）
- 工作空间位置和启动文件
- 网关设置（端口、绑定地址、认证、tailscale）
- 通道和提供商（Telegram、WhatsApp、Discord、Google Chat、Mattermost 插件、Signal）
- 守护进程安装（LaunchAgent 或 systemd 用户单元）
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
    - 完整选项矩阵见[认证和模型选项](#auth-and-model-options)。
  </Step>
  <Step title="工作空间">
    - 默认位于 `~/.openclaw/workspace`（可配置）。
    - 初始化所需的首次启动工作空间文件。
    - 工作空间布局见：[代理工作空间](/concepts/agent-workspace)。
  </Step>
  <Step title="网关">
    - 询问端口、绑定地址、认证模式和 tailscale 访问设置。
    - 建议：即使用于回环，也启用令牌认证，以保证本地 WS 客户端必须认证。
    - 令牌模式下，交互式上线提供：
      - **生成/存储明文令牌**（默认）
      - **使用 SecretRef**（可选接入）
    - 密码模式下，交互式上线同样支持明文或 SecretRef 存储。
    - 非交互式令牌 SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
      - 需要上线流程环境中该环境变量非空。
      - 不能与 `--gateway-token` 同时使用。
    - 仅当你完全信任每个本地进程时，才可禁用认证。
    - 非回环绑定地址仍需认证。
  </Step>
  <Step title="通道">
    - [WhatsApp](/channels/whatsapp)：可选二维码登录
    - [Telegram](/channels/telegram)：机器人令牌
    - [Discord](/channels/discord)：机器人令牌
    - [Google Chat](/channels/googlechat)：服务账号 JSON + webhook 目标
    - [Mattermost](/channels/mattermost) 插件：机器人令牌 + 基础 URL
    - [Signal](/channels/signal)：可选 `signal-cli` 安装 + 账号配置
    - [BlueBubbles](/channels/bluebubbles)：推荐用于 iMessage；服务器 URL + 密码 + webhook
    - [iMessage](/channels/imessage)：遗留的 `imsg` CLI 路径 + 数据库访问
    - 私信安全性：默认使用配对。首次私信发送代码；通过执行
      `openclaw pairing approve <channel> <code>` 或使用白名单批准。
  </Step>
  <Step title="守护进程安装">
    - macOS：LaunchAgent
      - 需用户登录会话；无头环境需自定义 LaunchDaemon（未包含于发行版）。
    - Linux 和通过 WSL2 的 Windows：systemd 用户单元
      - 向导会尝试执行 `loginctl enable-linger <user>`，保证登出后网关仍然运行。
      - 可能提示 sudo（涉及写入 `/var/lib/systemd/linger`）；会先尝试无 sudo。
    - 运行时选择：Node（推荐；WhatsApp 和 Telegram 必需）。Bun 不推荐。
  </Step>
  <Step title="健康检查">
    - 启动网关（如有必要）并执行 `openclaw health`。
    - `openclaw status --deep` 会将网关健康探针结果加入状态输出。
  </Step>
  <Step title="技能">
    - 读取可用技能并检查需求。
    - 让你选择节点管理器：npm 或 pnpm（不推荐 bun）。
    - 安装可选依赖（部分在 macOS 使用 Homebrew）。
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
  <Accordion title="Anthropic API key">
    如果存在 `ANTHROPIC_API_KEY`，则使用；否则提示输入密钥，再保存供守护进程使用。
  </Accordion>
  <Accordion title="Anthropic OAuth（Claude Code CLI）">
    - macOS：检查钥匙串中“Claude Code-credentials”条目
    - Linux 和 Windows：若存在，复用 `~/.claude/.credentials.json`

    macOS 上选择“始终允许”，避免 launchd 启动阻塞。
  </Accordion>
  <Accordion title="Anthropic token（setup-token 粘贴）">
    在任意机器运行 `claude setup-token`，然后粘贴此 token。
    可自定义名称；留空使用默认。
  </Accordion>
  <Accordion title="OpenAI Code 订阅（Codex CLI 复用）">
    若存在 `~/.codex/auth.json`，向导可以复用。
  </Accordion>
  <Accordion title="OpenAI Code 订阅（OAuth）">
    浏览器流程；粘贴 `code#state`。

    当模型未设置或为 `openai/*` 时，设置 `agents.defaults.model` 为 `openai-codex/gpt-5.4`。
  </Accordion>
  <Accordion title="OpenAI API key">
    若存在 `OPENAI_API_KEY` 则使用，否则提示输入密钥，随后存储于认证配置文件。

    当模型未设置、为 `openai/*` 或 `openai-codex/*` 时，设置 `agents.defaults.model` 为 `openai/gpt-5.1-codex`。
  </Accordion>
  <Accordion title="xAI (Grok) API key">
    提示输入 `XAI_API_KEY` 并配置 xAI 为模型提供商。
  </Accordion>
  <Accordion title="OpenCode Zen">
    提示输入 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）。
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
  <Accordion title="MiniMax M2.5">
    配置自动写入。
    详情见：[MiniMax](/providers/minimax)。
  </Accordion>
  <Accordion title="Synthetic（兼容 Anthropic）">
    提示输入 `SYNTHETIC_API_KEY`。
    详情见：[Synthetic](/providers/synthetic)。
  </Accordion>
  <Accordion title="Moonshot 和 Kimi Coding">
    Moonshot（Kimi K2）和 Kimi Coding 配置自动写入。
    详情见：[Moonshot AI（Kimi 与 Kimi Coding）](/providers/moonshot)。
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

- 从检测到的选项中选取默认模型，或手动输入提供商和模型。
- 向导会执行模型检查，若配置模型未知或缺少认证则警告。

凭据和配置路径：

- OAuth 凭据：`~/.openclaw/credentials/oauth.json`
- 认证配置（API keys + OAuth）：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`

凭据存储模式：

- 默认上线行为将 API key 以明文存储于认证配置文件中。
- 传入 `--secret-input-mode ref` 可启用引用模式，代替明文存储。
  在交互式上线中，你可选择：
  - 环境变量引用（例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`）
  - 已配置的提供商引用（`file` 或 `exec`），带提供商别名和 id
- 交互式引用模式会先快速运行预验证后才保存。
  - 环境变量引用：验证名称有效且上线流程环境该变量非空。
  - 提供商引用：验证提供商配置并解析请求的 id。
  - 若预验证失败，向导显示错误并允许重试。
- 非交互式模式下，`--secret-input-mode ref` 仅支持环境变量引用。
  - 需在上线流程环境设置对应环境变量。
  - 内联键参数（如 `--openai-api-key`）要求该环境变量必须设置，否则快速失败。
  - 自定义提供商的非交互式引用模式将 `models.providers.<id>.apiKey` 设为 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`。
  - 在自定义提供商场景中，`--custom-api-key` 需要设置 `CUSTOM_API_KEY`，否则快速失败。
- 网关认证支持交互式中明文和 SecretRef 两种选择：
  - 令牌模式：**生成/存储明文令牌**（默认）或 **使用 SecretRef**。
  - 密码模式：明文或 SecretRef。
- 非交互式令牌 SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
- 现有明文设置继续兼容使用。

<Note>
无头及服务器提示：请在具备浏览器的机器上完成 OAuth，然后复制
`~/.openclaw/credentials/oauth.json`（或 `$OPENCLAW_STATE_DIR/credentials/oauth.json`）
到网关主机。
</Note>

## 输出和内部机制

`~/.openclaw/openclaw.json` 中常见字段：

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers`（若选择 MiniMax）
- `tools.profile`（本地上线未设置时默认为 `"messaging"`；保留已有明确值）
- `gateway.*`（模式、绑定、认证、tailscale）
- `session.dmScope`（本地上线未设置时默认为 `per-channel-peer`；保留已有明确值）
- `channels.telegram.botToken`、`channels.discord.token`、`channels.signal.*`、`channels.imessage.*`
- 当选择时，包含通道白名单（Slack、Discord、Matrix、Microsoft Teams）（尽可能将名称解析为 ID）
- `skills.install.nodeManager`
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 会写入 `agents.list[]` 和可选的 `bindings`。

WhatsApp 凭据存储于 `~/.openclaw/credentials/whatsapp/<accountId>/`。
会话存储于 `~/.openclaw/agents/<agentId>/sessions/`。

<Note>
部分通道以插件形式交付。上线时选中，向导会提示先安装插件（npm 或本地路径）再配置通道。
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

- 上线中心：[上线向导（CLI）](/start/wizard)
- 自动化和脚本：[CLI 自动化](/start/wizard-cli-automation)
- 命令参考：[`openclaw onboard`](/cli/onboard)
