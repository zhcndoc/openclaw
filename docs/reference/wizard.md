---
summary: "CLI 入门向导完整参考：每一步、每个标志和配置字段"
read_when:
  - 查找特定的向导步骤或标志
  - 使用非交互模式自动化入门
  - 调试向导行为
title: "入门向导参考"
sidebarTitle: "向导参考"
---

# 入门向导参考

这是 `openclaw onboard` CLI 向导的完整参考。
有关概览，请参见 [入门向导](/start/wizard)。

## 流程细节（本地模式）

<Steps>
  <Step title="已存在配置检测">
    - 如果存在 `~/.openclaw/openclaw.json`，选择 **保留 / 修改 / 重置**。
    - 重新运行向导**不会**擦除任何内容，除非你明确选择了**重置**（或传入 `--reset`）。
    - CLI `--reset` 默认重置范围是 `config+creds+sessions`；使用 `--reset-scope full` 可同时移除工作区。
    - 如果配置无效或包含遗留键，向导会停止并要求你先运行 `openclaw doctor`，然后才继续。
    - 重置使用 `trash`（从不使用 `rm`），并提供以下范围选择：
      - 仅配置
      - 配置 + 凭证 + 会话
      - 完全重置（也移除工作区）
  </Step>
  <Step title="模型/认证">
    - **Anthropic API key**：如果存在则使用 `ANTHROPIC_API_KEY`，否则提示输入并保存供守护进程使用。
    - **Anthropic OAuth (Claude Code CLI)**：macOS 上向导会检查钥匙串项目 "Claude Code-credentials"（选择“始终允许”，以免启动时被阻止）；Linux/Windows 则复用 `~/.claude/.credentials.json`（如果存在）。
    - **Anthropic token (粘贴 setup-token)**：在任意机器运行 `claude setup-token`，然后粘贴令牌（可命名；留空为默认）。
    - **OpenAI Code (Codex) 订阅 (Codex CLI)**：如果存在 `~/.codex/auth.json`，向导可复用该文件。
    - **OpenAI Code (Codex) 订阅 (OAuth)**：浏览器流程；粘贴 `code#state`。
      - 当模型未设置或为 `openai/*` 时设置 `agents.defaults.model` 为 `openai-codex/gpt-5.2`。
    - **OpenAI API key**：如果存在则使用 `OPENAI_API_KEY`，否则提示输入并存储于认证配置档中。
    - **xAI (Grok) API key**：提示输入 `XAI_API_KEY` 并配置 xAI 作为模型提供商。
    - **OpenCode**：提示输入 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`，可在 https://opencode.ai/auth 获取），并让你选择 Zen 或 Go 目录。
    - **Ollama**：提示 Ollama 基础 URL，提供 **云 + 本地** 或 **本地** 模式，发现可用模型，并根据需要自动拉取选定的本地模型。
    - 更多详情：[Ollama](/providers/ollama)
    - **API key**：为你存储密钥。
    - **Vercel AI Gateway（多模型代理）**：提示输入 `AI_GATEWAY_API_KEY`。
    - 更多详情：[Vercel AI Gateway](/providers/vercel-ai-gateway)
    - **Cloudflare AI Gateway**：提示输入账户 ID、网关 ID 及 `CLOUDFLARE_AI_GATEWAY_API_KEY`。
    - 更多详情：[Cloudflare AI Gateway](/providers/cloudflare-ai-gateway)
    - **MiniMax M2.5**：配置自动写入。
    - 更多详情：[MiniMax](/providers/minimax)
    - **Synthetic（兼容 Anthropic）**：提示输入 `SYNTHETIC_API_KEY`。
    - 更多详情：[Synthetic](/providers/synthetic)
    - **Moonshot (Kimi K2)**：配置自动写入。
    - **Kimi Coding**：配置自动写入。
    - 更多详情：[Moonshot AI (Kimi + Kimi Coding)](/providers/moonshot)
    - **跳过**：尚未配置认证。
    - 从检测到的选项中选择默认模型（或手动输入提供商/模型）。为获得最佳质量及降低提示注入风险，请选择提供商堆栈中最强的最新一代模型。
    - 向导会运行模型检查，如果配置的模型未知或缺少认证，会发出警告。
    - API 密钥存储模式默认为纯文本认证配置档值。使用 `--secret-input-mode ref` 可改为存储由环境变量支持的引用（例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`）。
    - OAuth 认证信息存于 `~/.openclaw/credentials/oauth.json`；认证配置档存于 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (包含 API 密钥 + OAuth)。
    - 更多详情：[/concepts/oauth](/concepts/oauth)
    <Note>
    无头/服务器提示：在有浏览器的机器上完成 OAuth，之后将 `~/.openclaw/credentials/oauth.json`（或 `$OPENCLAW_STATE_DIR/credentials/oauth.json`）复制到网关主机。
    </Note>
  </Step>
  <Step title="工作区">
    - 默认工作区路径为 `~/.openclaw/workspace`（可配置）。
    - 预置代理引导仪式所需的工作区文件。
    - 完整工作区布局及备份指南请参见：[代理工作区](/concepts/agent-workspace)
  </Step>
  <Step title="网关">
    - 端口、绑定地址、认证模式、tailscale 暴露。
    - 认证建议：即使是环回（loopback）也保持**令牌**模式，这样本地 WS 客户端也必须认证。
    - 令牌模式下，交互式入门提供：
      - **生成/存储明文令牌**（默认）
      - **使用 SecretRef**（需选择）
      - 快速入门时复用现有的跨 `env`、`file` 和 `exec` 提供商的 `gateway.auth.token` SecretRef 用于探针/仪表盘引导。
      - 如果该 SecretRef 配置了但无法解析，入门会早期失败并给出明确修复提示，而不是运行时静默降级认证。
    - 密码模式下，交互式入门也支持明文或 SecretRef 存储。
    - 非交互式令牌 SecretRef 路径参数：`--gateway-token-ref-env <环境变量名>`。
      - 需保证入门进程环境中该环境变量非空。
      - 不能与 `--gateway-token` 同时使用。
    - 只有在你完全信任所有本地进程时才禁用认证。
    - 非环回绑定仍需认证。
  </Step>
  <Step title="频道">
    - [WhatsApp](/channels/whatsapp)：可选二维码登录。
    - [Telegram](/channels/telegram)：机器人令牌。
    - [Discord](/channels/discord)：机器人令牌。
    - [Google Chat](/channels/googlechat)：服务账号 JSON + webhook 受众。
    - [Mattermost](/channels/mattermost)（插件）：机器人令牌 + 基础 URL。
    - [Signal](/channels/signal)：可选安装 `signal-cli` + 账号配置。
    - [BlueBubbles](/channels/bluebubbles)：**推荐用于 iMessage**；服务器 URL + 密码 + webhook。
    - [iMessage](/channels/imessage)：遗留 `imsg` CLI 路径 + 数据库访问。
    - DM 安全性：默认为配对。第一次 DM 发送验证码；可通过 `openclaw pairing approve <channel> <code>` 批准，或使用允许列表。
  </Step>
  <Step title="网页搜索">
    - 选择搜索提供商：Perplexity、Brave、Gemini、Grok 或 Kimi（或跳过）。
    - 粘贴你的 API 密钥（快速入门会自动从环境变量或现有配置中检测密钥）。
    - 使用 `--skip-search` 跳过。
    - 以后配置：`openclaw configure --section web`。
  </Step>
  <Step title="守护进程安装">
    - macOS：LaunchAgent
      - 需登录用户会话；无头环境请使用自定义 LaunchDaemon（不随发行包）。
    - Linux（Windows 通过 WSL2）：systemd 用户单元
      - 向导尝试通过 `loginctl enable-linger <user>` 使网关在注销后依然运行。
      - 可能提示 sudo（写入 `/var/lib/systemd/linger`）；会先尝试无 sudo 执行。
    - **运行时选择：**Node（推荐；WhatsApp/Telegram 必需）。不推荐使用 Bun。
    - 如果令牌认证要求令牌且 `gateway.auth.token` 由 SecretRef 管理，守护进程安装会验证，但不会将已解析的明文令牌写入监管服务环境元数据。
    - 如果令牌认证要求令牌且配置的令牌 SecretRef 无法解析，守护进程安装会阻止并给出可操作指导。
    - 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`，且 `gateway.auth.mode` 未设置，守护进程安装会阻止，直到明确设置认证模式。
  </Step>
  <Step title="健康检查">
    - 启动网关（如需），并运行 `openclaw health`。
    - 提示：`openclaw status --deep` 会向状态输出添加网关健康探针（需能连接到网关）。
  </Step>
  <Step title="技能（推荐）">
    - 读取可用技能并检查要求。
    - 让你选择 Node 包管理器：**npm / pnpm**（不推荐 bun）。
    - 安装可选依赖（部分使用 macOS Homebrew）。
  </Step>
  <Step title="完成">
    - 总结 + 下一步，包括 iOS/Android/macOS 应用享用额外功能。
  </Step>
</Steps>

<Note>
如果未检测到 GUI，向导会打印 SSH 端口转发指令以访问控制 UI，而非打开浏览器。
如果控制 UI 资产缺失，向导会尝试构建它们；备用命令为 `pnpm ui:build`（自动安装 UI 依赖）。
</Note>

## 非交互模式

使用 `--non-interactive` 来自动化或脚本化入门流程：

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

非交互模式下的网关令牌 SecretRef：

```bash
export OPENCLAW_GATEWAY_TOKEN="your-token"
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice skip \
  --gateway-auth token \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN
```

`--gateway-token` 与 `--gateway-token-ref-env` 不能同时使用。

<Note>
`--json` 不意味着非交互模式。脚本应使用 `--non-interactive`（和 `--workspace`）。
</Note>

Provider-specific command examples live in [CLI Automation](/start/wizard-cli-automation#provider-specific-examples).
Use this reference page for flag semantics and step ordering.

### 添加代理（非交互）

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.2 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

## 网关向导 RPC

网关通过 RPC (`wizard.start`，`wizard.next`，`wizard.cancel`，`wizard.status`) 暴露向导流程。
客户端（macOS 应用、控制 UI）可以呈现步骤，无需重新实现入门逻辑。

## Signal 设置（signal-cli）

向导可以从 GitHub 发行版安装 `signal-cli`：

- 下载对应的发行版资产。
- 存储于 `~/.openclaw/tools/signal-cli/<version>/`。
- 将 `channels.signal.cliPath` 写入你的配置。

说明：

- JVM 版本需要 **Java 21**。
- 如果有本地版本则使用本地构建的。
- Windows 使用 WSL2；signal-cli 安装流程在 WSL 内遵循 Linux 路径。

## 向导写入内容

`~/.openclaw/openclaw.json` 中的典型字段：

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers`（如果选择 Minimax）
- `tools.profile`（本地入门默认是 `"coding"`，已有显式值保留）
- `gateway.*`（模式、绑定、认证、tailscale）
- `session.dmScope`（行为细节见：[CLI 入门参考](/start/wizard-cli-reference#outputs-and-internals)）
- `channels.telegram.botToken`，`channels.discord.token`，`channels.signal.*`，`channels.imessage.*`
- 频道允许列表（Slack/Discord/Matrix/Microsoft Teams），在选择时启用（名称会尽可能解析为 ID）。
- `skills.install.nodeManager`
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 会写入 `agents.list[]` 和可选绑定。

WhatsApp 凭证存储于 `~/.openclaw/credentials/whatsapp/<accountId>/`。
会话存储于 `~/.openclaw/agents/<agentId>/sessions/`。

部分频道以插件形式提供。入门时选定后，向导会提示安装该插件（npm 或本地路径），然后才能配置。

## 相关文档

- 向导概览：[入门向导](/start/wizard)
- macOS 应用入门：[入门](/start/onboarding)
- 配置参考：[网关配置](/gateway/configuration)
- 提供商：[WhatsApp](/channels/whatsapp), [Telegram](/channels/telegram), [Discord](/channels/discord), [Google Chat](/channels/googlechat), [Signal](/channels/signal), [BlueBubbles](/channels/bluebubbles)（iMessage）, [iMessage](/channels/imessage)（遗留）
- 技能：[技能](/tools/skills), [技能配置](/tools/skills-config)
