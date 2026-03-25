---
summary: "CLI 入门完整参考：每一步骤、参数和配置字段"
read_when:
  - 查找特定的入门步骤或参数
  - 使用非交互模式自动化入门
  - 调试入门行为
title: "入门参考"
sidebarTitle: "入门参考"
---

# 入门参考

这是 `openclaw onboard` 的完整参考。
欲了解高层次概览，请参见 [入门（CLI）](/start/wizard)。

## 流程细节（本地模式）

<Steps>
  <Step title="现有配置检测">
    - 如果存在 `~/.openclaw/openclaw.json`，请选择 **保留 / 修改 / 重置**。
    - 重新运行入门不会清除任何内容，除非您明确选择 **重置**
      （或传入 `--reset`）。
    - CLI 的 `--reset` 默认重置 `config+creds+sessions`；使用 `--reset-scope full`
      则会连工作区一起移除。
    - 如果配置无效或包含遗留键，向导将停止，并要求您先运行 `openclaw doctor` 以继续。
    - 重置操作使用 `trash`（绝不使用 `rm`）并提供范围选项：
      - 仅配置
      - 配置 + 凭据 + 会话
      - 完全重置（也移除工作区）
  </Step>
  <Step title="Model/Auth">
    - **Anthropic API key**: uses `ANTHROPIC_API_KEY` if present or prompts for a key, then saves it for daemon use.
    - **Anthropic OAuth (Claude Code CLI)**: on macOS onboarding checks Keychain item "Claude Code-credentials" (choose "Always Allow" so launchd starts don't block); on Linux/Windows it reuses `~/.claude/.credentials.json` if present.
    - **Anthropic token (paste setup-token)**: run `claude setup-token` on any machine, then paste the token (you can name it; blank = default).
    - **OpenAI Code (Codex) subscription (Codex CLI)**: if `~/.codex/auth.json` exists, onboarding can reuse it.
    - **OpenAI Code (Codex) subscription (OAuth)**: browser flow; paste the `code#state`.
      - Sets `agents.defaults.model` to `openai-codex/gpt-5.2` when model is unset or `openai/*`.
    - **OpenAI API key**: uses `OPENAI_API_KEY` if present or prompts for a key, then stores it in auth profiles.
    - **xAI (Grok) API key**: prompts for `XAI_API_KEY` and configures xAI as a model provider.
    - **OpenCode**: prompts for `OPENCODE_API_KEY` (or `OPENCODE_ZEN_API_KEY`, get it at https://opencode.ai/auth) and lets you pick the Zen or Go catalog.
    - **Ollama**: prompts for the Ollama base URL, offers **Cloud + Local** or **Local** mode, discovers available models, and auto-pulls the selected local model when needed.
    - More detail: [Ollama](/providers/ollama)
    - **API key**: stores the key for you.
    - **Vercel AI Gateway (multi-model proxy)**: prompts for `AI_GATEWAY_API_KEY`.
    - More detail: [Vercel AI Gateway](/providers/vercel-ai-gateway)
    - **Cloudflare AI Gateway**: prompts for Account ID, Gateway ID, and `CLOUDFLARE_AI_GATEWAY_API_KEY`.
    - More detail: [Cloudflare AI Gateway](/providers/cloudflare-ai-gateway)
    - **MiniMax**: config is auto-written; hosted default is `MiniMax-M2.7` and `MiniMax-M2.5` stays available.
    - More detail: [MiniMax](/providers/minimax)
    - **Synthetic (Anthropic-compatible)**: prompts for `SYNTHETIC_API_KEY`.
    - More detail: [Synthetic](/providers/synthetic)
    - **Moonshot (Kimi K2)**: config is auto-written.
    - **Kimi Coding**: config is auto-written.
    - More detail: [Moonshot AI (Kimi + Kimi Coding)](/providers/moonshot)
    - **Skip**: no auth configured yet.
    - Pick a default model from detected options (or enter provider/model manually). For best quality and lower prompt-injection risk, choose the strongest latest-generation model available in your provider stack.
    - Onboarding runs a model check and warns if the configured model is unknown or missing auth.
    - API key storage mode defaults to plaintext auth-profile values. Use `--secret-input-mode ref` to store env-backed refs instead (for example `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`).
    - OAuth credentials live in `~/.openclaw/credentials/oauth.json`; auth profiles live in `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (API keys + OAuth).
    - More detail: [/concepts/oauth](/concepts/oauth)
    <Note>
    无头/服务器提示：请在有浏览器的机器上完成 OAuth，随后将 `~/.openclaw/credentials/oauth.json`（或 `$OPENCLAW_STATE_DIR/credentials/oauth.json`）复制到网关主机。
    </Note>
  </Step>
  <Step title="工作区">
    - 默认工作区路径为 `~/.openclaw/workspace`（可配置）。
    - 预置代理引导所需的工作区文件。
    - 完整工作区结构及备份指南请参见：[代理工作区](/concepts/agent-workspace)
  </Step>
  <Step title="网关">
    - 端口、绑定地址、授权模式、tailscale 暴露。
    - 授权建议：即使是回环接口也保留 **Token**，以便本地 WS 客户端必须认证。
    - 在令牌模式下，交互设置提供：
      - **生成/存储明文令牌**（默认）
      - **使用 SecretRef**（可选）
      - 快速入门阶段会复用在 `env`、`file` 和 `exec` 提供者中现有的 `gateway.auth.token` SecretRefs，用于入门探针和仪表板引导。
      - 如果配置了 SecretRef 但无法解析，入门将提早失败并给出明确修复提示，而非在运行时静默降级授权。
    - 在密码模式下，交互设置同样支持明文或 SecretRef 存储。
    - 非交互的令牌 SecretRef 路径为：`--gateway-token-ref-env <ENV_VAR>`。
      - 需要入门环境中该环境变量非空。
      - 不能同时使用 `--gateway-token`。
    - 仅当完全信任本地所有进程时才能禁用授权。
    - 非回环绑定仍需授权。
  </Step>
  <Step title="频道">
    - [WhatsApp](/channels/whatsapp)：支持二维码登录（可选）。
    - [Telegram](/channels/telegram)：机器人令牌。
    - [Discord](/channels/discord)：机器人令牌。
    - [Google Chat](/channels/googlechat)：服务账号 JSON + webhook 受众。
    - [Mattermost](/channels/mattermost)（插件）：机器人令牌 + 基础 URL。
    - [Signal](/channels/signal)：支持安装 `signal-cli` + 账号配置（可选）。
    - [BlueBubbles](/channels/bluebubbles)：**推荐用于 iMessage**；服务器 URL + 密码 + webhook。
    - [iMessage](/channels/imessage)：遗留 `imsg` CLI 路径 + 数据库访问。
    - DM 安全性：默认采用配对机制。首次 DM 发送验证码；你可通过 `openclaw pairing approve <channel> <code>` 批准，或使用允许列表。
  </Step>
  <Step title="网页搜索">
    - 选择搜索提供商：Perplexity、Brave、Gemini、Grok 或 Kimi（也可跳过）。
    - 粘贴你的 API 密钥（快速入门会自动从环境变量或现有配置中检测密钥）。
    - 使用 `--skip-search` 跳过。
    - 以后配置：`openclaw configure --section web`。
  </Step>
  <Step title="守护进程安装">
    - macOS：LaunchAgent
      - 需要已登录用户会话；无头环境下请使用自定义 LaunchDaemon（不包含在发布中）。
    - Linux（以及通过 WSL2 的 Windows）：systemd 用户单元
      - 入门尝试通过 `loginctl enable-linger <user>` 启用 lingering，使网关在注销后仍然运行。
      - 可能会提示 sudo（写入 `/var/lib/systemd/linger`）；优先尝试无 sudo。
    - **运行时选择**：推荐 Node（WhatsApp/Telegram 需用）；不推荐 Bun。
    - 如果令牌授权需要令牌且 `gateway.auth.token` 由 SecretRef 管理，守护进程安装会验证，但不会将解析出的明文令牌写入监督服务环境元数据。
    - 如果令牌授权需要令牌且配置的令牌 SecretRef 未解析，守护进程安装将被阻止并提供解决方案。
    - 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`，且 `gateway.auth.mode` 未设置，守护进程安装将阻止，需显式设置模式。
  </Step>
  <Step title="健康检查">
    - 启动网关（如需要），然后运行 `openclaw health`。
    - 提示：`openclaw status --deep` 会在状态输出中增加网关健康探针（需能连接到网关）。
  </Step>
  <Step title="技能（推荐）">
    - 读取可用技能并检查依赖要求。
    - 让你选择 Node 包管理器：**npm / pnpm**（不推荐 bun）。
    - 安装可选依赖（部分需要 macOS Homebrew）。
  </Step>
  <Step title="完成">
    - 总结 + 后续步骤，包括 iOS/Android/macOS 应用享用的额外功能。
  </Step>
</Steps>

<Note>
如果未检测到 GUI，入门会打印用于 Control UI 的 SSH 端口转发说明，而非自动打开浏览器。
如果缺少 Control UI 资源，入门会尝试构建它们；备用命令是 `pnpm ui:build`（会自动安装 UI 依赖）。
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
`--json` 并不代表非交互模式。脚本应使用 `--non-interactive`（和 `--workspace`）。
</Note>

针对特定提供者的命令示例见 [CLI 自动化](/start/wizard-cli-automation#provider-specific-examples)。
本参考页可用于参数含义和步骤顺序。

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

网关通过 RPC 暴露入门流程接口（`wizard.start`、`wizard.next`、`wizard.cancel`、`wizard.status`）。
客户端（macOS 应用、Control UI）可渲染步骤，无需重新实现入门逻辑。

## Signal 设置（signal-cli）

入门可从 GitHub 发行版安装 `signal-cli`：

- 下载对应的发行版资产。
- 存储于 `~/.openclaw/tools/signal-cli/<version>/`。
- 将 `channels.signal.cliPath` 写入配置。

说明：

- JVM 版本需 **Java 21**。
- 若本地已有版本则使用本地构建。
- Windows 通过 WSL2；signal-cli 安装流程在 WSL 内遵循 Linux 路径。

## 向导写入内容

`~/.openclaw/openclaw.json` 中的典型字段包括：

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers`（如果选择了 Minimax）
- `tools.profile`（本地入门未设置时默认为 `"coding"`；已有值予以保留）
- `gateway.*`（模式、绑定、授权、tailscale）
- `session.dmScope`（行为细节：[CLI 设置参考](/start/wizard-cli-reference#outputs-and-internals)）
- `channels.telegram.botToken`、`channels.discord.token`、`channels.signal.*`、`channels.imessage.*`
- 在提示阶段选择的频道允许列表（Slack/Discord/Matrix/Microsoft Teams），尽可能将名称解析为 ID。
- `skills.install.nodeManager`
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 会写入 `agents.list[]` 和可选绑定。

WhatsApp 凭证存储于 `~/.openclaw/credentials/whatsapp/<accountId>/`。
会话存储于 `~/.openclaw/agents/<agentId>/sessions/`。

部分频道作为插件提供。安装时选中后，入门会提示先安装插件（通过 npm 或本地路径）才能配置。

## 相关文档

- 入门概述: [入门指南（CLI）](/start/wizard)
- macOS 应用入门: [入门](/start/onboarding)
- 配置参考: [网关配置](/gateway/configuration)
- 供应商: [WhatsApp](/channels/whatsapp), [Telegram](/channels/telegram), [Discord](/channels/discord), [Google Chat](/channels/googlechat), [Signal](/channels/signal), [BlueBubbles](/channels/bluebubbles) (iMessage), [iMessage](/channels/imessage) (旧版)
- 功能: [功能](/tools/skills), [功能配置](/tools/skills-config)
