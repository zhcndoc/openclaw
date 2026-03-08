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
    - **Anthropic API 密钥**：如果存在环境变量 `ANTHROPIC_API_KEY` 则使用，否则提示输入密钥，随后保存供守护进程使用。
    - **Anthropic OAuth（Claude Code CLI）**：在 macOS 上，向导检查钥匙串中名为 "Claude Code-credentials" 的条目（请选择“始终允许”，以免 launchd 启动阻塞）；在 Linux/Windows 上如果存在 `~/.claude/.credentials.json` 会复用它。
    - **Anthropic 令牌（粘贴 setup-token）**：在任意主机运行 `claude setup-token`，然后粘贴令牌（可自定义名称，留空为默认）。
    - **OpenAI Code（Codex）订阅（Codex CLI）**：如果存在 `~/.codex/auth.json`，向导可以重复使用它。
    - **OpenAI Code（Codex）订阅（OAuth）**：浏览器流程；粘贴 `code#state`。
      - 当模型未设置或为 `openai/*` 时，将设置 `agents.defaults.model` 为 `openai-codex/gpt-5.2`。
    - **OpenAI API 密钥**：如果存在环境变量 `OPENAI_API_KEY` 则使用，否则提示输入密钥，随后存储至身份验证配置文件。
    - **xAI (Grok) API 密钥**：提示输入 `XAI_API_KEY` 并配置 xAI 为模型提供者。
    - **OpenCode Zen（多模型代理）**：提示输入 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`，可在 https://opencode.ai/auth 获取）。
    - **API 密钥**：为你存储密钥。
    - **Vercel AI Gateway（多模型代理）**：提示输入 `AI_GATEWAY_API_KEY`。
    - 更多详情见：[Vercel AI Gateway](/providers/vercel-ai-gateway)
    - **Cloudflare AI Gateway**：提示输入账号 ID、网关 ID 及 `CLOUDFLARE_AI_GATEWAY_API_KEY`。
    - 更多详情见：[Cloudflare AI Gateway](/providers/cloudflare-ai-gateway)
    - **MiniMax M2.5**：配置自动写入。
    - 更多详情见：[MiniMax](/providers/minimax)
    - **Synthetic（Anthropic 兼容）**：提示输入 `SYNTHETIC_API_KEY`。
    - 更多详情见：[Synthetic](/providers/synthetic)
    - **Moonshot（Kimi K2）**：配置自动写入。
    - **Kimi Coding**：配置自动写入。
    - 更多详情见：[Moonshot AI（Kimi + Kimi Coding）](/providers/moonshot)
    - **跳过**：尚未配置认证。
    - 从检测到的选项中选择默认模型（或手动输入提供商/模型）。为了最佳质量与更低的提示注入风险，请选择你提供商堆栈中最强大最新一代的模型。
    - 向导运行模型检查，如果配置的模型未知或缺少认证则发出警告。
    - API 密钥存储模式默认使用明文的身份认证配置文件值。使用 `--secret-input-mode ref` 可改为存储基于环境的引用（例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`）。
    - OAuth 凭据存储于 `~/.openclaw/credentials/oauth.json`；身份认证配置文件存储于 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（包含 API 密钥 + OAuth）。
    - 更多详情见：[/concepts/oauth](/concepts/oauth)
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
    - 认证建议：即使是环回（loopback）也保持**Token**模式，这样本地 WS 客户端也必须认证。
    - 在令牌模式下，交互式入门提供：
      - **生成/存储明文令牌**（默认）
      - **使用 SecretRef**（需选择）
      - 快速入门复用现有的跨 `env`、`file` 和 `exec` 提供商的 `gateway.auth.token` SecretRef 以进行探针/仪表盘引导。
      - 如果该 SecretRef 配置了但无法解析，入门会及早失败并给出明确的修复提示，而不是运行时静默降级认证。
    - 在密码模式下，交互式入门也支持明文或 SecretRef 存储。
    - 非交互式令牌 SecretRef 路径参数：`--gateway-token-ref-env <环境变量名>`。
      - 需确保入门进程环境中该环境变量非空。
      - 不能与 `--gateway-token` 一起使用。
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
  <Step title="Web search">
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

<AccordionGroup>
  <Accordion title="Gemini 示例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice gemini-api-key \
      --gemini-api-key "$GEMINI_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Z.AI 示例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice zai-api-key \
      --zai-api-key "$ZAI_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Vercel AI Gateway 示例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice ai-gateway-api-key \
      --ai-gateway-api-key "$AI_GATEWAY_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Cloudflare AI Gateway 示例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice cloudflare-ai-gateway-api-key \
      --cloudflare-ai-gateway-account-id "your-account-id" \
      --cloudflare-ai-gateway-gateway-id "your-gateway-id" \
      --cloudflare-ai-gateway-api-key "$CLOUDFLARE_AI_GATEWAY_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Moonshot 示例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice moonshot-api-key \
      --moonshot-api-key "$MOONSHOT_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Synthetic 示例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice synthetic-api-key \
      --synthetic-api-key "$SYNTHETIC_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="OpenCode Zen 示例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice opencode-zen \
      --opencode-zen-api-key "$OPENCODE_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
</AccordionGroup>

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
