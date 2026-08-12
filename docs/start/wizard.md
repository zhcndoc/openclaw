---
summary: "CLI 上手引导：先验证推理，再将剩余设置交给 OpenClaw"
read_when:
  - 运行或配置 CLI 上手引导
  - 设置新机器
title: "上手引导（CLI）"
sidebarTitle: "上手引导：CLI"
---

```bash
openclaw onboard
```

CLI 上手引导是 macOS、Linux 和 Windows（原生或 WSL2）上推荐的终端设置路径。默认情况下，它会检测机器上已可用的 AI 访问，使用真实补全进行验证，然后启动 OpenClaw 来配置工作区、Gateway 和可选功能。`openclaw setup` 运行相同流程（[设置](/cli/setup) 介绍
了 `--baseline` 仅配置配置项的变体）。Windows 桌面用户也可以从 [Windows Hub](/platforms/windows) 开始。

引导式上手会先建立推理能力。它会检测可用的 AI 访问，要求进行一次真实补全，然后才启动 [OpenClaw](/cli/openclaw) 来配置 OpenClaw 的其余部分。选择 **暂时跳过** 会退出上手引导，而不会启动 OpenClaw。

经典向导仍可用于自定义提供商、远程 Gateway 设置、频道配对、守护进程控制、技能和导入。使用 `openclaw onboard --classic` 可显式运行经典向导；引导式推理选择器不会转入该向导。推理验证通过后，OpenClaw 可以使用 `open channel wizard for
<channel>`，将需要密钥的频道设置交给经过遮罩处理的终端向导。工作区技能和网页搜索也以相同的对话方式进行配置：
`configure skills` 和 `configure web search` 会在聊天中承载这些设置流程，而 `open search wizard` 会将凭据输入交给经过遮罩处理的终端向导。
对于本地 Gateway，`configure gateway` 会引导你设置端口、绑定、身份验证和 Tailscale
设置，但保存配置时不会重启；之后说 `restart gateway`，或使用 `open gateway wizard` 进行经过遮罩处理的终端凭据输入，然后运行 `openclaw gateway restart`。远程 Gateway 模式仍然是上手引导或
`openclaw configure` 中的选项，而不是由聊天向导托管。

上手引导创建默认代理工作区后，`import memory` 可以将检测到的本地记忆复制到其中。此对话式导入不会更改配置，也不会导入凭据或技能，无需重启 Gateway，并会如实报告每个来源的部分复制或失败情况。
如需更改模型提供商或其身份验证，请退出 OpenClaw 并运行
`openclaw onboard`；OpenClaw 不会打开引导式或经典的提供商流程。

<Info>
最快首次聊天：完成引导式设置，运行 `openclaw dashboard`，然后通过浏览器中的 Control UI 聊天。文档：[仪表盘](/web/dashboard)。
</Info>

## 区域设置

向导会本地化固定的入门文案。它会按顺序使用 `OPENCLAW_LOCALE`、`LC_ALL`、`LC_MESSAGES` 和 `LANG` 中第一个非空值，然后回退到英文。支持的区域设置：`en`、`zh-CN`、`zh-TW`。

```bash
OPENCLAW_LOCALE=zh-CN openclaw onboard
OPENCLAW_LOCALE=en openclaw onboard # 显式覆盖为英文
```

产品名称、命令、配置键、URL、提供商 ID、模型 ID，以及
插件/频道标签，无论区域设置如何都保持英文。

如需稍后重新配置非推理设置：

```bash
openclaw configure
openclaw agents add <name>
```

<Note>
`--json` 并不意味着非交互模式。对于脚本，请使用 `--non-interactive`（见 [CLI 自动化](/start/wizard-cli-automation)）。
</Note>

<Tip>
经典向导包含一个网页搜索步骤，你可以在其中选择提供商：Brave、
DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Ollama Web
Search、Perplexity、SearXNG 或 Tavily。其中一些需要 API 密钥；另一些
则无需密钥。可稍后使用 `openclaw configure --section web` 进行配置，或者在 OpenClaw 聊天中说
`configure web search`，以对话方式运行相同的提供商设置。
文档：[网页工具](/tools/web)。
</Tip>

## 引导式默认

普通的 `openclaw onboard` 会按以下路径执行：

1. 接受安全通知。
2. 检测已配置的模型、API 密钥环境变量、受支持的本地 AI CLI，以及网关主机上可访问的 Ollama 或 LM Studio 服务器中已安装的具备工具调用能力的模型。此只读过程不会下载模型。当 Pi 和 OpenCode 无法作为可复用的推理路径时，也可能会将其安装情况作为参考信息报告。Gemini CLI 和 Antigravity 不会作为检测到的设置路径提供。
3. 使用实际补全测试第一个检测到的候选项。失败时显示原因，并继续测试下一个可用候选项。
4. 如果检测完所有候选项仍无结果，则选择 OpenAI、Anthropic、xAI（Grok）、Google 或 OpenRouter，或选择 **更多…** 查看其余提供商。每个提供商的区域、套餐，以及受支持的浏览器、设备、API 密钥或令牌方式会显示在第二个菜单中，并通过同样的实际补全进行测试。选择 **暂时跳过** 可退出，而不启动 OpenClaw。
5. 仅保存经过验证的模型路径及其所需的凭据/插件状态。工作区和网关设置保持不变。
6. 使用经过验证的模型启动 OpenClaw，以便它配置工作区、网关、频道、智能体、插件及其余可选设置。

在已配置的安装上重新运行该命令时，会先测试当前默认模型，使引导式流程成为一次验证和修复过程。失败的检查绝不会自动替换已配置的模型；入门流程会停止并询问如何继续。后续非推理类添加请运行 `openclaw channels add` 或 `openclaw configure`；如需更改提供商或认证路径，请使用 `openclaw onboard`。

## 经典向导：快速开始 vs 高级

运行 `openclaw onboard --classic` 以打开完整向导。它首先会让你在 **快速开始**（默认值）和 **高级**（完全控制）之间进行选择。传入 `--flow quickstart` 或 `--flow advanced`（别名 `manual`）即可选择经典流程并跳过该提示。

<Tabs>
  <Tab title="快速开始（默认值）">
    - 本地网关，回环绑定
    - 工作区默认值（或现有工作区）
    - 网关端口 **18789**
    - 网关认证 **令牌**（自动生成，即使在回环上也是如此）
    - 工具策略：新设置使用 `tools.profile: "coding"`（若已有明确配置文件则保留不变）
    - DM 会话：引导会保留显式的 `session.dmScope`，否则保持未设置，因此 `"main"` 默认值会让所有跨频道的直接消息都进入代理的滚动主会话——这是个人代理的默认行为。对于共享或多用户收件箱，请使用 `"per-channel-peer"`；`openclaw security audit` 在检测到多用户 DM 流量时会建议隔离。详情： [CLI 设置参考](/start/wizard-cli-reference#outputs-and-internals)
    - Tailscale 暴露 **关闭**
    - Telegram 和 WhatsApp 的 DM 默认使用 **允许列表**：Telegram 会要求输入数字形式的 Telegram 用户 ID，WhatsApp 会要求输入电话号码

  </Tab>
  <Tab title="高级（完全控制）">
    - 暴露每一步：模式、工作区、网关、频道、守护进程、技能

  </Tab>
</Tabs>

远程模式（`--mode remote`）始终使用高级流程；它只会配置这台机器去连接其他地方的网关，且绝不会在远程主机上安装或更改任何内容。

## 经典入门流程会配置什么

本地模式（默认）会按以下步骤进行：

1. **Model/Auth** - 选择一种 provider 身份验证流程（API key、OAuth 或 provider-specific manual auth），包括 Custom Provider
   （OpenAI-compatible、OpenAI Responses-compatible、Anthropic-compatible 或
   Unknown 自动检测）。选择一个默认模型。
   全新的 OpenAI API-key 和 ChatGPT/Codex 设置默认使用
   `openai/gpt-5.6-sol`。裸的直接 API `openai/gpt-5.6` 别名仍受支持，并解析为 Sol。重新运行设置会保留现有的显式模型，包括
   `openai/gpt-5.5`。如果账户不提供 GPT-5.6，请显式选择
   `openai/gpt-5.5`。
   安全提示：如果此 agent 将运行工具或处理 webhook/hook
   内容，请优先选择可用的最新一代最强模型，并保持工具策略严格——较弱或较旧的层级更容易受到提示注入。
   对于非交互式运行，`--secret-input-mode ref` 会将新凭据存储为由环境变量支持的引用；添加凭据时设置 provider 环境变量。
   现有可解析的命名配置文件及其 `env`、`file`、`exec` 或 `store` 引用会原样复用，不会写入新凭据，也不会额外设置 provider
   环境变量。之前存储的明文不会迁移；请参见
   [Secrets management](/gateway/secrets)。交互式 Secret 引用模式可以指向环境变量或已配置的 provider 引用（`file` 或
   `exec`），保存前会进行快速预检。完成模型／身份验证设置后，向导会提供可选的实时补全测试；失败后可以返回模型／身份验证设置一次，也可以忽略失败而不阻塞经典向导的其余部分。忽略该测试不会解锁 OpenClaw；对话式设置仍需要通过推理检查。
2. **Workspace** - agent 文件的目录（默认 `~/.openclaw/workspace`）。会生成引导文件。
3. **Gateway** - 端口、绑定地址、身份验证模式、Tailscale 暴露方式。在
   交互式令牌模式下，可以选择明文令牌存储（默认），或选择使用 SecretRef。非交互式 SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
4. **Channels** - 内置和官方插件聊天频道，包括
   Discord、Feishu、Google Chat、iMessage、Mattermost、Microsoft Teams、
   QQ Bot、Signal、Slack、Telegram、WhatsApp 等。
5. **Daemon** - 安装 LaunchAgent（macOS）、systemd 用户单元
   （Linux/WSL2），或原生 Windows 计划任务，并为每个用户提供 Startup 文件夹回退方案。
   如果需要令牌身份验证，且 `gateway.auth.token` 由 SecretRef 管理，守护进程安装会验证它，但不会将解析后的令牌持久化到 supervisor 服务环境元数据中；未解析的 SecretRef 会阻止安装，并提供相关指导。如果同时设置了 `gateway.auth.token` 和
   `gateway.auth.password`，但未设置 `gateway.auth.mode`，则必须显式设置该模式后才能继续安装。
6. **Health check** - 启动 Gateway 并验证其可访问性。
7. **Skills** - 安装推荐的 skills 及其可选依赖项。

<Note>
重新运行入门流程不会清除任何内容，除非你明确选择**重置**（或传入 `--reset`）。CLI 的 `--reset` 默认作用于配置、凭据和会话；使用 `--reset-scope full` 还会移除工作区。如果配置无效或包含旧版键，入门流程会要求你先运行 `openclaw doctor`。
</Note>

`--flow import` 会在经典向导中运行一个检测到的迁移流程（例如 Hermes），而不是进行全新设置；请参见 [迁移](/cli/migrate) 以及 [安装](/install/migrating-hermes) 下的迁移指南。`openclaw onboard --modern` 是 [OpenClaw](/cli/openclaw) 的一个兼容别名。它使用与 `openclaw setup` 相同的推理门禁：经过验证的推理会启动助手，而交互式失败会返回到引导式推理设置。

## 添加另一个代理

使用 `openclaw agents add <name>` 创建一个拥有独立工作区、会话和身份验证配置的独立代理。不带 `--workspace` 运行时，将启动交互式流程来设置名称、工作区、身份验证、频道和绑定——这不是完整的 `openclaw onboard` 向导。

它会设置：

- `agents.entries.*.name`
- `agents.entries.*.workspace`
- `agents.entries.*.agentDir`

注意：

- 默认工作区：`~/.openclaw/workspace-<agentId>`（如果设置了
  `agents.defaults.workspace`，则会位于该路径下）。
- 添加 `bindings`，将传入消息路由到此代理（引导流程可以代你完成此操作）。
- 非交互式标志：`--model`、`--agent-dir`、`--bind`、`--non-interactive`。

## 完整参考

有关详细的逐步行为和配置输出，请参见
[CLI 设置参考](/start/wizard-cli-reference)。
有关非交互式示例，请参见 [CLI 自动化](/start/wizard-cli-automation)。
有关完整的标志参考，请参见 [`openclaw onboard`](/cli/onboard)。

## 相关文档

- CLI 命令参考：[`openclaw onboard`](/cli/onboard)
- 入门概览：[入门概览](/start/onboarding-overview)
- macOS 应用入门：[入门](/start/onboarding)
- Agent 首次运行仪式：[Agent 启动引导](/start/bootstrapping)
