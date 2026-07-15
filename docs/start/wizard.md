---
summary: "CLI 上手引导：先验证推理，然后将剩余设置交给 Crestodian"
read_when:
  - 运行或配置 CLI 上手引导
  - 设置新机器
title: "上手引导（CLI）"
sidebarTitle: "上手引导：CLI"
---

```bash
openclaw onboard
```

CLI 上手引导是 macOS、Linux 和 Windows（原生或 WSL2）上推荐的终端设置路径。默认情况下，它会检测机器上已可用的 AI 访问，使用一次真实补全进行验证，然后启动 Crestodian 来配置工作区、Gateway 和可选功能。`openclaw setup` 运行相同流程（[设置](/cli/setup)涵盖了
`--baseline` 仅配置变体）。Windows 桌面用户也可以从 [Windows Hub](/platforms/windows) 开始。

引导式上手首先建立推理。它会检测可用的 AI 访问，要求进行一次真实补全，然后才启动 [Crestodian](/cli/crestodian) 来配置 OpenClaw 的其余部分。在引导流程中，不存在预推理的 Crestodian，也没有跳过 AI 的路径。

经典向导仍可用于提供商登录、远程 Gateway 设置、通道配对、守护进程控制、技能和导入。使用 `openclaw onboard --classic` 显式运行它；引导式推理候选界面不会切换到它。推理通过后，Crestodian 可以使用 `open channel
wizard for <channel>` 将需要密钥的通道设置交给一个带遮蔽输入的终端向导。要更改模型提供商或其身份验证，请退出 Crestodian 并运行 `openclaw onboard`；Crestodian 不会打开引导式或经典提供商流程。

<Info>
最快首次聊天：完成引导式设置，运行 `openclaw dashboard`，然后通过 Control UI 在浏览器中聊天。文档：[仪表盘](/web/dashboard)。
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
3. 使用一次真实补全测试检测到的第一个候选项。若失败，显示
   原因并继续下一个可用候选项。
4. 如果检测已耗尽，则重试一个已检测到的候选项，或在带掩码的提示中输入提供商
   API 密钥。在推理可用之前，引导式入门
   不提供 Crestodian，也不提供跳过 AI 的退出方式。
5. 仅持久化已验证的模型路由以及它所需的任何凭据/插件状态。
   Workspace 和 Gateway 设置保持不变。
6. 使用已验证的模型启动 Crestodian，以便它可以配置 workspace、
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

1. **模型/认证** - 选择一种提供商认证流程（API 密钥、OAuth，或
   提供商特定的手动认证），包括自定义提供商
   （兼容 OpenAI、兼容 OpenAI Responses、兼容 Anthropic，或
   未知自动检测）。选择一个默认模型。
   全新的 OpenAI API 密钥设置默认使用 `openai/gpt-5.6`（裸的直接 API
   ID 会解析为 Sol）；全新的 ChatGPT/Codex 设置默认使用
   `openai/gpt-5.6-sol`。重新运行设置会保留现有的显式模型，
   包括 `openai/gpt-5.5`。如果账户未开放 GPT-5.6，请明确选择
   `openai/gpt-5.5`。
   安全提示：如果此代理会运行工具或处理 webhook/hook
   内容，请优先选择可用的最强最新一代模型，并保持工具策略严格——
   较弱或较旧的模型更容易受到提示注入攻击。
   对于非交互式运行，`--secret-input-mode ref` 会存储基于环境变量的引用，
   而不是明文 API 密钥值；被引用的环境变量必须已设置，
   否则入门流程会快速失败。交互式密钥引用模式可以指向环境变量或已配置的提供商引用（`file` 或 `exec`），
   并在保存前进行快速预检。完成模型/认证设置后，向导会提供一个可选的实时补全测试；失败后可以返回到
   模型/认证设置一次，也可以忽略而不阻塞经典向导的其余部分。忽略它不会解锁 Crestodian；
   对话式设置仍然需要通过推理检查。
2. **工作区** - 代理文件目录（默认 `~/.openclaw/workspace`）。会种子化引导文件。
3. **网关** - 端口、绑定地址、认证模式、Tailscale 暴露方式。在
   交互式令牌模式下，可选择明文令牌存储（默认）或
   选择 SecretRef。非交互式 SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
4. **通道** - 内置和官方插件聊天通道，包括
   Discord、飞书、Google Chat、iMessage、Mattermost、Microsoft Teams、
   QQ Bot、Signal、Slack、Telegram、WhatsApp 等。
5. **守护进程** - 安装 LaunchAgent（macOS）、systemd 用户单元
   （Linux/WSL2），或原生 Windows 计划任务，并提供按用户的
   启动文件夹回退方案。
   如果需要令牌认证且 `gateway.auth.token` 由 SecretRef 管理，
   守护进程安装会验证它，但不会把已解析的令牌持久化到
   supervisor 服务环境元数据中；未解析的 SecretRef 会阻止
   安装并给出指引。如果同时设置了 `gateway.auth.token` 和
   `gateway.auth.password`，而 `gateway.auth.mode` 未设置，则安装
   会被阻止，直到你显式设置模式。
6. **健康检查** - 启动 Gateway 并验证其可达性。
7. **技能** - 安装推荐技能及其可选依赖。

<Note>
重新运行入门流程不会清除任何内容，除非你明确选择**重置**（或传入 `--reset`）。CLI 的 `--reset` 默认作用于配置、凭据和会话；使用 `--reset-scope full` 还会移除工作区。如果配置无效或包含旧版键，入门流程会要求你先运行 `openclaw doctor`。
</Note>

`--flow import` 会在经典向导中运行一个检测到的迁移流程（例如 Hermes），
而不是全新设置；请参见 [迁移](/cli/migrate) 以及
[安装](/install/migrating-hermes) 下的迁移指南。`openclaw onboard --modern` 是
[Crestodian](/cli/crestodian) 的兼容别名。它使用与 `openclaw crestodian` 相同的推理门控：
已验证的推理会启动助手，而交互式失败会返回到引导式推理设置。

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
