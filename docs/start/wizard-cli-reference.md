---
summary: "CLI 设置流程、认证/模型设置、输出和内部机制的完整参考"
read_when:
  - 你需要了解 openclaw 上线的详细行为
  - 你正在调试上线结果或集成上线客户端
title: "CLI 设置参考"
sidebarTitle: "CLI 参考"
---

# CLI 设置参考

本页是 `openclaw onboard` 的完整参考。  
简易指南请参见 [上线 (CLI)](/start/wizard)。

## 向导功能说明

本地模式（默认）引导你完成：

- 模型和认证设置（OpenAI Code 订阅 OAuth，Anthropic API key 或 setup token，以及 MiniMax、GLM、Ollama、Moonshot 和 AI Gateway 选项）
- 工作空间位置及初始化文件
- 网关设置（端口、绑定、认证、tailscale）
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
    Uses `OPENAI_API_KEY` if present or prompts for a key, then stores the credential in auth profiles.

    Sets `agents.defaults.model` to `openai/gpt-5.4` when model is unset, `openai/*`, or `openai-codex/*`.

    当模型未设置、为 `openai/*` 或 `openai-codex/*` 时，设置 `agents.defaults.model` 为 `openai/gpt-5.1-codex`。  
  </Accordion>
  <Accordion title="xAI (Grok) API key">
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
    Config is auto-written. Hosted default is `MiniMax-M2.7`; `MiniMax-M2.5` stays available.
    More detail: [MiniMax](/providers/minimax).
  </Accordion>
  <Accordion title="Synthetic（兼容 Anthropic）">
    提示输入 `SYNTHETIC_API_KEY`。  
    详情见：[Synthetic](/providers/synthetic)。  
  </Accordion>
  <Accordion title="Ollama (Cloud and local open models)">
    提示输入基础 URL（默认 `http://127.0.0.1:11434`），然后提供云 + 本地或本地模式选择。  
    自动发现可用模型并推荐默认。  
    详情见：[Ollama](/providers/ollama)。  
  </Accordion>
  <Accordion title="Moonshot and Kimi Coding">
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

- 从检测到的选项中选取默认模型，或手动输入提供商和模型。  
- 向导会执行模型检查，若配置模型未知或缺少认证则警告。  

凭据和配置路径：

- OAuth 凭据：`~/.openclaw/credentials/oauth.json`  
- 认证配置（API keys + OAuth）：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`  

凭据存储模式：

- 默认上线行为将 API keys 以明文值存储在认证配置档中。  
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
无头及服务器提示：请在具备浏览器的机器上完成 OAuth，然后复制  
`~/.openclaw/credentials/oauth.json`（或 `$OPENCLAW_STATE_DIR/credentials/oauth.json`）  
到网关主机。  
</Note>

## 输出和内部机制

`~/.openclaw/openclaw.json` 中常见字段：

- `agents.defaults.workspace`  
- `agents.defaults.model` / `models.providers`（若选择 MiniMax）  
- `tools.profile`（本地上线未设置时默认为 `"coding"`；保留已有明确值）  
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
