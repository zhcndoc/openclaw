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
有关高层概览，请参见 [上手引导（CLI）](/start/wizard)。

## 流程详情（本地模式）

<Steps>
  <Step title="检测现有配置">
    - 如果 `~/.openclaw/openclaw.json` 存在，选择 **保留 / 修改 / 重置**。
    - 重新运行上手引导**不会**清除任何内容，除非你明确选择 **重置**
      （或传入 `--reset`）。
    - CLI `--reset` 默认为 `config+creds+sessions`；使用 `--reset-scope full`
      还会移除工作区。
    - 如果配置无效或包含旧版键，向导会停止，并要求
      你先运行 `openclaw doctor` 再继续。
    - 重置使用 `trash`（绝不使用 `rm`），并提供以下范围：
      - 仅配置
      - 配置 + 凭据 + 会话
      - 完全重置（也会移除工作区）

  </Step>
  <Step title="模型/认证">
    - **Anthropic API key**：如果存在则使用 `ANTHROPIC_API_KEY`，否则提示输入密钥，然后保存以供守护进程使用。
    - **Anthropic API key**：在上手引导/配置中优先作为 Anthropic 助手选择。
    - **Anthropic setup-token**：在上手引导/配置中仍可使用，不过如果可用，OpenClaw 现在优先复用 Claude CLI。
    - **OpenAI Code（Codex）订阅（OAuth）**：浏览器流程；粘贴 `code#state`。
      - 当模型未设置或已属于 OpenAI 系列时，将 `agents.defaults.model` 设为 `openai-codex/gpt-5.5`。
    - **OpenAI Code（Codex）订阅（设备配对）**：浏览器配对流程，使用短时设备代码。
      - 当模型未设置或已属于 OpenAI 系列时，将 `agents.defaults.model` 设为 `openai-codex/gpt-5.5`。
    - **OpenAI API key**：如果存在则使用 `OPENAI_API_KEY`，否则提示输入密钥，然后将其存储在认证配置文件中。
      - 当模型未设置、为 `openai/*`，或为 `openai-codex/*` 时，将 `agents.defaults.model` 设为 `openai/gpt-5.5`。
    - **xAI（Grok）API key**：提示输入 `XAI_API_KEY`，并将 xAI 配置为模型提供方。
    - **OpenCode**：提示输入 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`，可在 https://opencode.ai/auth 获取），并允许你选择 Zen 或 Go 目录。
    - **Ollama**：首先提供 **Cloud + Local**、**仅 Cloud** 或 **仅 Local**。`仅 Cloud` 会提示输入 `OLLAMA_API_KEY` 并使用 `https://ollama.com`；基于主机的模式会提示输入 Ollama 基础 URL，发现可用模型，并在需要时自动拉取所选本地模型；`Cloud + Local` 还会检查该 Ollama 主机是否已登录以获得云访问。
    - 更多详情：[Ollama](/providers/ollama)
    - **API key**：为你存储密钥。
    - **Vercel AI Gateway（多模型代理）**：提示输入 `AI_GATEWAY_API_KEY`。
    - 更多详情：[Vercel AI Gateway](/providers/vercel-ai-gateway)
    - **Cloudflare AI Gateway**：提示输入 Account ID、Gateway ID 和 `CLOUDFLARE_AI_GATEWAY_API_KEY`。
    - 更多详情：[Cloudflare AI Gateway](/providers/cloudflare-ai-gateway)
    - **MiniMax**：配置会自动写入；托管默认值为 `MiniMax-M2.7`。
      API key 设置使用 `minimax/...`，OAuth 设置使用
      `minimax-portal/...`。
    - 更多详情：[MiniMax](/providers/minimax)
    - **StepFun**：会为 StepFun 标准版或 Step Plan 在中国或全球端点自动写入配置。
    - Standard 当前包含 `step-3.5-flash`，Step Plan 还包含 `step-3.5-flash-2603`。
    - 更多详情：[StepFun](/providers/stepfun)
    - **Synthetic（兼容 Anthropic）**：提示输入 `SYNTHETIC_API_KEY`。
    - 更多详情：[Synthetic](/providers/synthetic)
    - **Moonshot（Kimi K2）**：配置会自动写入。
    - **Kimi Coding**：配置会自动写入。
    - 更多详情：[Moonshot AI（Kimi + Kimi Coding）](/providers/moonshot)
    - **跳过**：尚未配置认证。
    - 从检测到的选项中选择一个默认模型（或手动输入提供方/模型）。为获得最佳质量并降低提示注入风险，请选择你的提供方栈中可用的最新一代最强模型。
    - 上手引导会运行模型检查，并在配置的模型未知或缺少认证时发出警告。
    - API key 存储模式默认使用明文认证配置文件值。使用 `--secret-input-mode ref` 可改为存储基于环境变量的引用（例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`）。
    - 认证配置文件位于 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（API keys + OAuth）。`~/.openclaw/credentials/oauth.json` 仅用于旧版导入。
    - 更多详情：[/concepts/oauth](/concepts/oauth)
    <Note>
    无头/服务器提示：在有浏览器的机器上完成 OAuth，然后将该 agent 的 `auth-profiles.json`（例如
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
  <Step title="Gateway">
    - 端口、绑定、认证模式、tailscale 暴露。
    - 认证建议：即使是 loopback 也保留 **Token**，这样本地 WS 客户端必须进行认证。
    - 在 token 模式下，交互式设置提供：
      - **生成/存储明文 token**（默认）
      - **使用 SecretRef**（可选）
      - 快速开始会在 `env`、`file` 和 `exec` 提供方之间复用现有的 `gateway.auth.token` SecretRef，用于上手引导探测/仪表盘启动。
      - 如果该 SecretRef 已配置但无法解析，上手引导会提前失败，并给出明确的修复信息，而不会悄悄降级运行时认证。
    - 在密码模式下，交互式设置也支持明文或 SecretRef 存储。
    - 非交互式 token SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
      - 要求在上手引导进程环境中该环境变量非空。
      - 不能与 `--gateway-token` 组合使用。
    - 仅在你完全信任每个本地进程时才禁用认证。
    - 非 loopback 绑定仍然需要认证。

  </Step>
  <Step title="Channels">
    - [WhatsApp](/channels/whatsapp)：可选 QR 登录。
    - [Telegram](/channels/telegram)：机器人 token。
    - [Discord](/channels/discord)：机器人 token。
    - [Google Chat](/channels/googlechat)：服务账户 JSON + webhook 受众。
    - [Mattermost](/channels/mattermost)（插件）：机器人 token + 基础 URL。
    - [Signal](/channels/signal)：可选安装 `signal-cli` + 账户配置。
    - [iMessage](/channels/imessage)：`imsg` CLI 路径 + Messages 数据库访问；当 Gateway 运行在 Mac 之外时请使用 SSH 包装器。
    - DM 安全：默认是配对。第一条 DM 会发送一个代码；通过 `openclaw pairing approve <channel> <code>` 进行批准，或使用允许名单。

  </Step>
  <Step title="网页搜索">
    - 选择受支持的提供方，例如 Brave、DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Ollama Web Search、Perplexity、SearXNG 或 Tavily（也可以跳过）。
    - 基于 API 的提供方可以使用环境变量或现有配置快速设置；无密钥提供方则使用其各自的前置条件。
    - 使用 `--skip-search` 跳过。
    - 稍后配置：`openclaw configure --section web`。

  </Step>
  <Step title="守护进程安装">
    - macOS：LaunchAgent
      - 需要登录用户会话；对于无头环境，请使用自定义 LaunchDaemon（未随附）。
    - Linux（以及通过 WSL2 的 Windows）：systemd 用户单元
      - 上手引导会尝试通过 `loginctl enable-linger <user>` 启用 lingering，以便 Gateway 在注销后继续运行。
      - 可能会提示使用 sudo（写入 `/var/lib/systemd/linger`）；它会先尝试不使用 sudo。
    - **运行时选择：** Node（推荐；WhatsApp/Telegram 必需）。Bun **不推荐**。
    - 如果 token 认证需要 token 且 `gateway.auth.token` 由 SecretRef 管理，守护进程安装会验证它，但不会将解析出的明文 token 值持久化到 supervisor 服务环境元数据中。
    - 如果 token 认证需要 token 且配置的 token SecretRef 未解析，守护进程安装会被阻止，并给出可执行的指导。
    - 如果 `gateway.auth.token` 和 `gateway.auth.password` 都已配置且 `gateway.auth.mode` 未设置，守护进程安装会被阻止，直到显式设置模式为止。

  </Step>
  <Step title="健康检查">
    - 启动 Gateway（如需要）并运行 `openclaw health`。
    - 提示：`openclaw status --deep` 会在状态输出中增加实时网关健康探测，包括在支持时的通道探测（需要可达的 gateway）。

  </Step>
  <Step title="技能（推荐）">
    - 读取可用技能并检查需求。
    - 允许你选择节点管理器：**npm / pnpm**（不推荐 bun）。
    - 安装可选依赖项（部分在 macOS 上使用 Homebrew）。

  </Step>
  <Step title="完成">
    - 摘要 + 下一步，包括用于额外功能的 iOS/Android/macOS 应用。

  </Step>
</Steps>

<Note>
如果未检测到 GUI，上手引导会打印用于 Control UI 的 SSH 端口转发说明，而不是打开浏览器。
如果 Control UI 资源缺失，上手引导会尝试构建它们；回退方案是 `pnpm ui:build`（会自动安装 UI 依赖）。
</Note>

## 非交互模式

使用 `--non-interactive` 可自动化或脚本化上手引导：

```bash
openclaw onboard --non-interactive \
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
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice skip \
  --gateway-auth token \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN
```

`--gateway-token` 和 `--gateway-token-ref-env` 互斥。

<Note>
`--json` **并不**意味着非交互模式。脚本请使用 `--non-interactive`（以及 `--workspace`）。
</Note>

提供方特定的命令示例位于 [CLI Automation](/start/wizard-cli-automation#provider-specific-examples)。
请使用此参考页面了解标志语义和步骤顺序。

### 添加 agent（非交互）

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.5 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

## Gateway 向导 RPC

Gateway 通过 RPC 暴露上手引导流程（`wizard.start`、`wizard.next`、`wizard.cancel`、`wizard.status`）。
客户端（macOS 应用、Control UI）可以无需重新实现上手引导逻辑而渲染步骤。

## Signal 设置（signal-cli）

引导过程中可以从 GitHub releases 安装 `signal-cli`：

- 下载对应的发布资源。
- 将其存储在 `~/.openclaw/tools/signal-cli/<version>/` 下。
- 将 `channels.signal.cliPath` 写入你的配置。

注意：

- JVM 构建需要 **Java 21**。
- 在可用时会使用原生构建。
- Windows 使用 WSL2；signal-cli 的安装会在 WSL 内遵循 Linux 流程。

## 向导写入的内容

`~/.openclaw/openclaw.json` 中的典型字段：

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers`（如果选择了 Minimax）
- `tools.profile`（本地引导在未设置时默认为 `"coding"`；会保留已有的显式值）
- `gateway.*`（模式、绑定、认证、tailscale）
- `session.dmScope`（行为细节：[CLI Setup Reference](/start/wizard-cli-reference#outputs-and-internals)）
- `channels.telegram.botToken`、`channels.discord.token`、`channels.matrix.*`、`channels.signal.*`、`channels.imessage.*`
- 在提示过程中如果你选择启用，频道白名单（Slack/Discord/Matrix/Microsoft Teams）（在可能时名称会解析为 ID）。
- `skills.install.nodeManager`
  - `setup --node-manager` 接受 `npm`、`pnpm` 或 `bun`。
  - 通过直接设置 `skills.install.nodeManager`，手动配置仍然可以使用 `yarn`。
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 会写入 `agents.list[]` 和可选的 `bindings`。

WhatsApp 凭据存放在 `~/.openclaw/credentials/whatsapp/<accountId>/` 下。
会话存储在 `~/.openclaw/agents/<agentId>/sessions/` 下。

某些频道以插件形式提供。你在设置过程中选择它们时，引导流程
会在其可配置之前提示安装它（npm 或本地路径）。 

## 相关文档

- Onboarding overview: [Onboarding (CLI)](/start/wizard)
- macOS app onboarding: [Onboarding](/start/onboarding)
- Config reference: [Gateway configuration](/gateway/configuration)
- Providers: [WhatsApp](/channels/whatsapp), [Telegram](/channels/telegram), [Discord](/channels/discord), [Google Chat](/channels/googlechat), [Signal](/channels/signal), [iMessage](/channels/imessage)
- Skills: [Skills](/tools/skills), [Skills config](/tools/skills-config)
