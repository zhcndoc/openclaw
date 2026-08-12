---
summary: "CLI 上手引导完整参考：每一步、标志和配置字段"
read_when:
  - 查找特定的上手引导步骤或标志
  - 使用非交互模式自动化上手引导
  - 调试上手引导行为
title: "上手引导参考"
sidebarTitle: "上手引导参考"
---

这是 `openclaw onboard` 的完整参考。
有关高级概述，请参见 [上手引导（CLI）](/start/wizard)。有关逐步
行为和输出，请参见 [CLI 设置参考](/start/wizard-cli-reference)。

## 流程详情（本地模式）

<Steps>
  <Step title="重置（可选）">
    - `--reset` 会在 setup 运行前重置状态；不使用它时，重新运行 onboarding 会保留现有配置，并将其作为默认值复用。
    - `--reset-scope` 控制 `--reset` 移除的内容：`config`（仅配置文件）、`config+creds+sessions`（默认），或 `full`（还会移除工作区）。
    - 如果配置文件无效，上手引导会停止并提示你先运行 `openclaw doctor`，然后重新运行 setup。
    - 重置会将状态移至废纸篓（不会直接删除）。

  </Step>
  <Step title="风险确认">
    - 首次运行（或在 `wizard.securityAcknowledgedAt` 设置之前的任何运行）会要求你确认你理解 agents 功能强大且拥有完整系统访问权限是有风险的。
    - `--non-interactive` 需要显式指定 `--accept-risk`；如果没有指定，上手引导会直接报错退出，而不是提示交互确认。
    - 交互式运行会显示确认提示而不是使用该标志；拒绝会取消 setup。

  </Step>
  <Step title="模型／认证">
    - **Anthropic API key**：如果存在 `ANTHROPIC_API_KEY`，则使用它；否则提示输入 key，然后将其保存供 daemon 使用。
    - **Anthropic Claude CLI**：当已有 Claude CLI 登录时，这是首选的本地路径；OpenClaw 仍支持将 Anthropic setup-token 认证作为替代方案。
    - **OpenAI Code（Codex）订阅（OAuth）**：浏览器流程；粘贴 `code#state`。
      - 在没有主模型的全新 setup 中，通过 Codex runtime 将 `agents.defaults.model` 设置为 `openai/gpt-5.6-sol`。
    - **OpenAI Code（Codex）订阅（设备配对）**：通过短期设备代码进行浏览器配对流程。
      - 在没有主模型的全新 setup 中，通过 Codex runtime 将 `agents.defaults.model` 设置为 `openai/gpt-5.6-sol`。
    - **OpenAI API key**：如果存在 `OPENAI_API_KEY`，则使用它；否则提示输入 key，然后将其存储在 auth profiles 中。
      - 在没有主模型的全新 setup 中，将 `agents.defaults.model` 设置为 `openai/gpt-5.6-sol`。不带后缀的直接 API `openai/gpt-5.6` 别名仍受支持，并解析到相同层级。
    - 添加或重新认证 OpenAI 会保留现有的显式主模型，包括 `openai/gpt-5.5`。如果账户不提供 GPT-5.6，请显式选择 `openai/gpt-5.5`；OpenClaw 不会静默降低模型版本。
    - **xAI OAuth**：使用设备代码通过浏览器登录，无需 localhost 回调，因此通过 SSH／Docker／VPS 也能运行（`--auth-choice xai-oauth`）。
    - **xAI API key**：提示输入 `XAI_API_KEY`（`--auth-choice xai-api-key`）。
    - `--auth-choice xai-device-code` 仍可作为相同 xAI OAuth 设备代码流程的仅手动兼容别名使用；新脚本请使用 `xai-oauth`。
    - **OpenCode**：提示输入 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`，可在 https://opencode.ai/auth 获取），并让你选择 Zen 或 Go catalog。
    - **Ollama**：首先提供 **Cloud + Local**、**Cloud only** 或 **Local only** 选项。`Cloud only` 会提示输入 `OLLAMA_API_KEY` 并使用 `https://ollama.com`；依赖主机的模式会提示输入 Ollama base URL（默认 `http://127.0.0.1:11434`），发现可用模型，并在需要时自动拉取选定的本地模型；`Cloud + Local` 还会检查该 Ollama 主机是否已登录云服务。
    - 更多详情：[Ollama](/providers/ollama)
    - **API key**：为你存储 key。
    - **Vercel AI Gateway（多模型代理）**：提示输入 `AI_GATEWAY_API_KEY`。
    - 更多详情：[Vercel AI Gateway](/providers/vercel-ai-gateway)
    - **Cloudflare AI Gateway**：提示输入 Account ID、Gateway ID 和 `CLOUDFLARE_AI_GATEWAY_API_KEY`。
    - 更多详情：[Cloudflare AI Gateway](/providers/cloudflare-ai-gateway)
    - **MiniMax**：自动写入配置；托管默认值为 `MiniMax-M3`。
      API-key setup 使用 `minimax/...`，OAuth setup 使用
      `minimax-portal/...`。
    - 更多详情：[MiniMax](/providers/minimax)
    - **StepFun**：会针对中国或全球 endpoint 自动写入 StepFun standard 或 Step Plan 的配置。
    - Standard 当前默认为 `step-3.5-flash`；Step Plan 还包括 `step-3.5-flash-2603`。
    - 更多详情：[StepFun](/providers/stepfun)
    - **Synthetic（兼容 Anthropic）**：提示输入 `SYNTHETIC_API_KEY`。
    - 更多详情：[Synthetic](/providers/synthetic)
    - **Moonshot（Kimi K2）**：自动写入配置。
    - **Kimi Coding**：自动写入配置。
    - 更多详情：[Moonshot AI（Kimi + Kimi Coding）](/providers/moonshot)
    - **Custom Provider**：支持 OpenAI-compatible、OpenAI Responses-compatible 或 Anthropic-compatible endpoint。非交互式标志：`--auth-choice custom-api-key`、`--custom-base-url`、`--custom-model-id`、`--custom-api-key`（可选；回退到 `CUSTOM_API_KEY`）、`--custom-provider-id`（可选；根据 base URL 自动派生）、`--custom-compatibility openai|openai-responses|anthropic`（默认 `openai`）、`--custom-image-input`／`--custom-text-input`（覆盖推断出的 vision-model 检测结果）。
    - **Skip**：尚未配置认证。
    - 从检测到的选项中选择默认模型（或手动输入 provider／model）。为了获得最佳质量并降低 prompt-injection 风险，请选择 provider stack 中可用的最新一代最强模型。
    - Onboarding 会运行模型检查，并在配置的模型未知或缺少认证时发出警告。
    - API key 存储模式默认为明文 auth-profile 值。使用 `--secret-input-mode ref` 可改为存储 env-backed refs（例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`）；引用的 env var 必须已经设置，否则 onboarding 会快速失败。
    - Auth profiles 位于 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（API keys + OAuth）。`~/.openclaw/credentials/oauth.json` 仅用于旧版导入。
    - 更多详情：[OAuth](/concepts/oauth)
    <Note>
    无头／服务器提示：在有浏览器的机器上完成 OAuth，然后将该 agent 的 `auth-profiles.json`（例如
    `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`，或匹配的
    `$OPENCLAW_STATE_DIR/...` 路径）复制到网关主机。`credentials/oauth.json`
    只是旧版导入来源。
    </Note>
  </Step>
  <Step title="工作区">
    - 默认 `~/.openclaw/workspace`（可配置）。
    - 为 agent 启动仪式所需的工作区文件播种初始化。
    - 完整工作区布局 + 备份指南：[Agent workspace](/concepts/agent-workspace)

  </Step>
  <Step title="网关">
    - 端口（默认 **18789**）、绑定、认证模式、tailscale 暴露。
    - 认证建议：即使对于 loopback 也保留 **Token**，这样本地 WS 客户端必须进行认证。
    - 在 token 模式下，交互式 setup 提供：
      - **生成／存储明文 token**（默认）
      - **使用 SecretRef**（选择启用）
      - Quickstart 会复用现有的 `gateway.auth.token` SecretRefs，支持 `env`、`file`、`exec` 和 `store` provider，用于 onboarding 探测／dashboard 引导。
      - 如果已配置该 SecretRef 但无法解析，onboarding 会提前失败并显示明确的修复消息，而不是让 runtime auth 静默降级。
    - 在 password 模式下，交互式 setup 同样支持明文或 SecretRef 存储。
    - 非交互式 token SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
      - 要求 onboarding 进程环境中存在非空 env var。
      - 不能与 `--gateway-token` 组合使用。
    - 只有在你完全信任每个本地进程时才禁用认证。
    - 非 loopback 绑定仍然需要认证。

  </Step>
  <Step title="通道">
    - [WhatsApp](/channels/whatsapp)：可选 QR 登录。
    - [Telegram](/channels/telegram)：bot token。
    - [Discord](/channels/discord)：bot token。
    - [Google Chat](/channels/googlechat)：service account JSON + webhook audience。
    - [Mattermost](/channels/mattermost)（插件）：bot token + base URL。
    - [Signal](/channels/signal)（插件）：可选 `signal-cli` 安装 + 账户配置。
    - [iMessage](/channels/imessage)：`imsg` CLI 路径 + Messages DB 访问；当 Gateway 运行在非 Mac 设备上时请使用 SSH wrapper。
    - Discord、Feishu、Microsoft Teams、QQ Bot、Slack 和其他通道都以插件形式提供，上手引导可为你安装。完整目录：[Channels](/channels)。
    - DM 安全：默认是配对。第一条 DM 会发送验证码；可通过 `openclaw pairing approve <channel> <code>` 批准，或使用允许列表。

  </Step>
  <Step title="Web 搜索">
    - 选择一个受支持的提供方，例如 Brave、Codex（Hosted Search）、DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Ollama Web Search、Parallel、Perplexity、SearXNG 或 Tavily（也可以跳过）。
    - 基于 API 的提供方可使用 env vars 或现有配置快速设置；免 key 的提供方则使用其各自的前置条件。
    - 使用 `--skip-search` 跳过。
    - 稍后配置：`openclaw configure --section web`。

  </Step>
  <Step title="Daemon 安装">
    - macOS：LaunchAgent
      - 需要已登录的用户会话；对于无头环境，请使用自定义 LaunchDaemon（未随附）。
    - Linux（以及通过 WSL2 运行的 Windows）：systemd user unit
      - Onboarding 会尝试通过 `loginctl enable-linger <user>` 启用 lingering，使 Gateway 在注销后仍保持运行。
      - 可能会提示输入 sudo（写入 `/var/lib/systemd/linger`）；会先尝试不使用 sudo。
    - 原生 Windows：首先使用 Scheduled Task；如果任务创建被拒绝，OpenClaw 会回退到每用户 Startup-folder login item，并立即启动 Gateway。
    - **Runtime 选择**：需要 Node，因为规范 runtime state store 使用 `node:sqlite`。旧版 Bun services 会在修复期间迁移到 Node。
    - 如果 token auth 需要 token，且 `gateway.auth.token` 由 SecretRef 管理，daemon install 会验证它，但不会将解析后的明文 token 值持久化到 supervisor service environment metadata 中。
    - 如果 token auth 需要 token，且配置的 token SecretRef 无法解析，daemon install 会被阻止，并提供可执行的指导。
    - 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`，且未设置 `gateway.auth.mode`，daemon install 会被阻止，直到显式设置模式。

  </Step>
  <Step title="健康检查">
    - 启动 Gateway（如需要）并运行 `openclaw health`。
    - 提示：`openclaw status --deep` 会在状态输出中增加实时网关健康探测，包括在支持时的通道探测（需要可达的 gateway）。

  </Step>
  <Step title="技能（推荐）">
    - 读取可用技能并检查其要求。
    - 让你选择一个 node 管理器：**npm / pnpm / bun**。
    - 为受信任的内置技能自动安装可选依赖（部分在 macOS 上使用 Homebrew）。
    - 跳过那些 Homebrew、uv 或 Go 安装前置条件不可用的技能，将它们分组并提供手动设置指南，并在安装前置条件后指引你运行 `openclaw doctor`。

  </Step>
  <Step title="完成">
    - 摘要 + 后续步骤，包括适用于 Terminal、Browser 或稍后进行的 **你想如何孵化你的 agent？** 提示。

  </Step>
</Steps>

<Note>
如果未检测到 GUI，上手引导会打印用于 Control UI 的 SSH 端口转发说明，而不是打开浏览器。
如果 Control UI 资源缺失，上手引导会尝试构建它们；回退方案是 `pnpm ui:build`（会自动安装 UI 依赖）。
</Note>

## 非交互模式

使用 `--non-interactive --accept-risk` 来自动化或脚本化 onboarding（该
标志是必需的风险确认；如果没有它，onboarding 会以错误退出）：

```bash
openclaw onboard --non-interactive --accept-risk \
  --mode local \
  --auth-choice apiKey \
  --anthropic-api-key "$ANTHROPIC_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback \
  --install-daemon \
  --daemon-runtime node \
  --skip-skills
```

添加 `--json` 可输出机器可读摘要。

非交互模式下的 Gateway token SecretRef：

```bash
export OPENCLAW_GATEWAY_TOKEN="your-token"
openclaw onboard --non-interactive --accept-risk --skip-health \
  --mode local \
  --auth-choice skip \
  --gateway-auth token \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN
```

`--gateway-token` 和 `--gateway-token-ref-env` 互斥。

<Note>
`--json` **不会** 自动表示非交互模式。用于脚本时请使用 `--non-interactive --accept-risk`（以及 `--workspace`）。
</Note>

提供方特定的命令示例位于 [CLI 自动化](/start/wizard-cli-automation#provider-specific-examples)。
请使用此参考页面了解标志语义和步骤顺序。

### 添加 agent（非交互）

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.6-sol \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

`main` 是保留的 agent id，不能用于 `openclaw agents add`。

## 网关向导 RPC

Gateway 通过 RPC 暴露上手引导流程（`wizard.start`、`wizard.next`、`wizard.cancel`、`wizard.status`）。
客户端（macOS 应用、Control UI）可以无需重新实现上手引导逻辑而渲染步骤。

## Signal 设置（signal-cli）

Onboarding 会检测 `signal-cli` 是否在 `PATH` 中，如果缺失，会提示安装：

- Linux x86-64：从 `signal-cli` GitHub releases 下载官方原生 GraalVM 构建，并将其存储在 `~/.openclaw/tools/signal-cli/<version>/` 下。
- macOS 和其他架构：改为通过 Homebrew 安装。
- 原生 Windows：暂不支持；请在 WSL2 中运行 onboarding 以获取 Linux 安装路径。
- 无论哪种方式，都会将 `channels.signal.transport.cliPath` 写入为 `kind: "managed-native"`。

## 向导写入的内容

`~/.openclaw/openclaw.json` 中的典型字段：

- `agents.defaults.workspace`
- `agents.defaults.skipBootstrap` 当传入 `--skip-bootstrap` 时
- `agents.defaults.model` / `models.providers`（如果选择了 Minimax）
- `tools.profile`（本地引导在未设置时默认为 `"coding"`；现有显式值会被保留）
- `gateway.*`（模式、绑定、认证、tailscale）
- `session.dmScope`（引导会保留显式值，否则保持未设置，因此 `"main"` 默认会将所有跨频道的直接消息保留在代理的滚动主会话中——个人代理默认值。对于共享或多用户收件箱，请使用 `"per-channel-peer"`；当 `openclaw security audit` 检测到多用户 DM 流量时，会建议隔离。详情：[CLI 设置参考](/start/wizard-cli-reference#outputs-and-internals)）
- `channels.telegram.botToken`、`channels.discord.token`、`channels.matrix.*`、`channels.signal.*`、`channels.imessage.*`
- 在频道提示过程中选择启用时的频道 DM 白名单。Discord、Matrix、Microsoft Teams 和 Slack 会在可能时将名称解析为 ID；其他频道直接接受 ID（例如数字形式的 Telegram 发送者 ID 或 WhatsApp 电话号码）。
- `skills.install.nodeManager`
  - `setup --node-manager` 接受 `npm`、`pnpm` 或 `bun`。
  - 通过直接设置 `skills.install.nodeManager`，手动配置仍然可以使用 `yarn`。
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`
- `wizard.securityAcknowledgedAt`

`openclaw agents add` 会写入 `agents.entries.*` 和可选的 `bindings`。

WhatsApp 凭据保存在 `~/.openclaw/credentials/whatsapp/<accountId>/` 下。
活动会话和转录内容存储在
`~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite` 中。
`~/.openclaw/agents/<agentId>/sessions/` 目录用于旧版迁移输入
以及归档/支持工件。

某些频道以插件形式提供。你在设置过程中选择它们时，引导流程
会在它们可配置之前提示安装它（npm 或本地路径）。

## 相关文档

- 入门概览：[入门（CLI）](/start/wizard)
- CLI 设置参考：[CLI 设置参考](/start/wizard-cli-reference)
- macOS 应用入门：[入门](/start/onboarding)
- 配置参考：[网关配置](/gateway/configuration)
- 提供商：[WhatsApp](/channels/whatsapp)、[Telegram](/channels/telegram)、[Discord](/channels/discord)、[Google Chat](/channels/googlechat)、[Signal](/channels/signal)、[iMessage](/channels/imessage)
- 技能：[技能](/tools/skills)、[技能配置](/tools/skills-config)
