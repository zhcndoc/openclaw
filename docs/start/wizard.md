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

经典向导仍可用于自定义提供方、远程 Gateway 设置、通道配对、守护进程控制、skills 和导入。通过 `openclaw onboard --classic` 显式运行它；引导式推理选择器不会委派到它。推理通过后，OpenClaw 可以使用 `open channel wizard for
<channel>` 将需要密钥的通道设置交给带遮罩的终端向导。要更改模型提供方或其身份验证，请退出 OpenClaw 并运行
`openclaw onboard`; OpenClaw 不会打开引导式或经典的提供方流程。

<Info>
最快首次聊天：完成引导式设置，运行 `openclaw dashboard`，然后通过浏览器中的 Control UI 聊天。文档：[仪表盘](/web/dashboard)。
</Info>

## 区域设置

向导会本地化固定的引导文案。解析顺序：`OPENCLAW_LOCALE`、
`LC_ALL`、`LC_MESSAGES`、`LANG`，然后是英语。支持的区域设置有：`en`、
`zh-CN`、`zh-TW`。

```bash
OPENCLAW_LOCALE=zh-CN openclaw onboard
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
Search、Perplexity、SearXNG 或 Tavily。其中一些需要 API 密钥；另一些则
无需密钥。可稍后使用 `openclaw configure --section web` 进行配置。文档：
[网页工具](/tools/web)。
</Tip>

## 引导式默认

普通的 `openclaw onboard` 会按以下路径执行：

1. 接受安全提示。
2. 检测已配置的模型、API 密钥环境变量，以及受支持的本地
   AI CLI。
3. 使用一次真实补全测试第一个检测到的候选项。若失败，显示
   原因并继续尝试下一个可用候选项。
4. 如果检测已用尽，则选择 OpenAI、Anthropic、xAI（Grok）、Google 或
   OpenRouter，或为其余提供商选择 **更多…**。每个提供商的
   区域、套餐，以及受支持的浏览器、设备、API 密钥或 token 方法
   都会出现在第二个菜单中，并使用相同的真实补全进行测试。
   选择 **暂时跳过** 可在不启动 OpenClaw 的情况下退出。
5. 仅持久化已验证的模型路由及其所需的任何凭据/插件状态。
   Workspace 和 Gateway 设置保持不变。
6. 使用已验证的模型启动 OpenClaw，以便它可以配置 workspace、
   Gateway、channels、agents、plugins，以及其余可选设置。

在已配置的安装上重新运行该命令时，会先测试当前默认
模型，使引导式流程成为一次验证和修复过程。失败的
检查绝不会自动替换已配置的模型；入门流程会停止并
询问如何继续。后续非推理类添加请运行 `openclaw channels add` 或 `openclaw configure`；如需更改提供商或认证路径，请使用 `openclaw onboard`。

## 经典向导：QuickStart vs Advanced

运行 `openclaw onboard --classic` 以打开完整向导。它首先会让你在 **QuickStart**（默认值）和 **Advanced**（完全控制）之间进行选择。传入 `--flow quickstart` 或 `--flow advanced`（别名 `manual`）即可选择经典流程并跳过该提示。

<Tabs>
  <Tab title="QuickStart (defaults)">
    - 本地网关，回环绑定
    - 工作区默认值（或现有工作区）
    - 网关端口 **18789**
    - 网关认证 **Token**（自动生成，即使在回环模式下也是如此）
    - 工具策略：新配置使用 `tools.profile: "coding"`（现有的显式配置文件将被保留）
    - DM 隔离：新配置使用 `session.dmScope: "per-channel-peer"`。详情：[CLI 设置参考](/start/wizard-cli-reference#outputs-and-internals)
    - Tailscale 暴露 **关闭**
    - Telegram 和 WhatsApp 私信默认使用 **allowlist**：Telegram 会要求输入数字形式的 Telegram 用户 ID，WhatsApp 会要求输入电话号码

  </Tab>
  <Tab title="Advanced (full control)">
    - 暴露每一步：模式、工作区、网关、频道、守护进程、技能

  </Tab>
</Tabs>

远程模式（`--mode remote`）始终使用高级流程；它只会配置这台机器去连接其他地方的网关，且绝不会在远程主机上安装或更改任何内容。

## 经典入门流程会配置什么

本地模式（默认）会按以下步骤进行：

1. **Model/Auth** - 选择一个提供商认证流程（API key、OAuth，或
   提供商特定的手动认证），包括 Custom Provider
   （OpenAI-compatible、OpenAI Responses-compatible、Anthropic-compatible，或
   Unknown auto-detect）。选择默认模型。
   新的 OpenAI API key 配置默认使用 `openai/gpt-5.6`（直接 API
   id 的裸值会解析为 Sol）；新的 ChatGPT/Codex 配置默认使用
   `openai/gpt-5.6-sol`。重新运行设置会保留现有的显式模型，
   包括 `openai/gpt-5.5`。如果账号没有暴露 GPT-5.6，请显式选择
   `openai/gpt-5.5`。
   安全提示：如果此代理将运行工具或处理 webhook/hook
   内容，请优先选择可用的最强最新一代模型，并保持工具策略严格——较弱或较旧的档位更容易受到提示注入。
   对于非交互式运行，`--secret-input-mode ref` 会存储基于环境变量的引用，
   而不是明文 API key 值；被引用的环境变量必须已设置，否则入门会立即失败。
   交互式 secret reference 模式可以指向环境变量或已配置的提供商引用（`file` 或
   `exec`），并在保存前进行快速预检。完成 Model/Auth 设置后，向导会提供一个可选的实时补全测试；失败后可以返回到
   Model/Auth 设置一次，或者忽略它而不阻塞经典向导的其余部分。
   忽略它不会解锁 OpenClaw；对话式设置仍然需要通过推理检查。
2. **Workspace** - 代理文件所在目录（默认 `~/.openclaw/workspace`）。会种植引导文件。
3. **Gateway** - 端口、绑定地址、认证模式、Tailscale 暴露方式。在
   交互式 token 模式下，可选择明文 token 存储（默认）或改用 SecretRef。
   非交互式 SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
4. **Channels** - 内置和官方插件聊天频道，包括
   Discord、飞书、Google Chat、iMessage、Mattermost、Microsoft Teams、
   QQ Bot、Signal、Slack、Telegram、WhatsApp 等。
5. **Daemon** - 安装 LaunchAgent（macOS）、systemd 用户单元
   （Linux/WSL2），或原生 Windows 计划任务，并提供按用户
   Startup 文件夹作为回退方案。
   如果需要 token 认证，且 `gateway.auth.token` 由 SecretRef 管理，
   daemon 安装会验证它，但不会将解析后的 token 持久化到
   supervisor 服务环境元数据中；未解析的 SecretRef 会阻止
   安装并给出指导。如果 `gateway.auth.token` 和
   `gateway.auth.password` 都已设置，而 `gateway.auth.mode` 未设置，则安装会被
   阻止，直到你显式设置模式。
6. **Health check** - 启动 Gateway 并验证其可访问。
7. **Skills** - 安装推荐技能及其可选依赖项。

<Note>
重新运行入门流程不会清除任何内容，除非你明确选择**重置**（或传入 `--reset`）。CLI 的 `--reset` 默认作用于配置、凭据和会话；使用 `--reset-scope full` 还会移除工作区。如果配置无效或包含旧版键，入门流程会要求你先运行 `openclaw doctor`。
</Note>

`--flow import` 会在经典向导中运行一个检测到的迁移流程（例如 Hermes），而不是进行全新设置；请参见 [Migrate](/cli/migrate) 以及 [Install](/install/migrating-hermes) 下的迁移指南。`openclaw onboard --modern` 是 [OpenClaw](/cli/openclaw) 的一个兼容别名。它使用与 `openclaw setup` 相同的推理门禁：经过验证的推理会启动助手，而交互式失败会返回到引导式推理设置。

## 添加另一个 agent

使用 `openclaw agents add <name>` 创建一个独立的 agent，它拥有自己的
工作区、会话和认证配置文件。不带 `--workspace` 运行时，会启动一个交互式流程，用于设置名称、工作区、认证、频道和绑定——这
不是完整的 `openclaw onboard` 向导。

它会设置：

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

说明：

- 默认工作区：`~/.openclaw/workspace-<agentId>`（如果设置了
  `agents.defaults.workspace`，则位于该路径下）。
- 添加 `bindings` 以将传入消息路由到此 agent（onboarding 可以为你完成这项工作）。
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
