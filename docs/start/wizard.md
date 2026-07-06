---
summary: "CLI 上手引导：为网关、工作区、通道和技能提供引导式设置"
read_when:
  - 运行或配置 CLI 上手引导
  - 设置新机器
title: "上手引导（CLI）"
sidebarTitle: "上手引导：CLI"
---

```bash
openclaw onboard
```

CLI 上手引导是 macOS、Linux 和 Windows（原生或 WSL2）上的推荐终端设置路径。它会在一个引导式流程中配置本地 Gateway（或连接到远程 Gateway），以及通道、技能和工作区默认值。`openclaw setup` 会运行相同的流程（[Setup](/cli/setup) 介绍了仅配置 `--baseline` 的变体）。Windows 桌面用户也可以从 [Windows Hub](/platforms/windows) 开始。

提供商登录、通道配对、守护进程安装和技能下载可能会延长快速设置时间；可选步骤可以跳过，并稍后通过 `openclaw configure` 重新进行。

<Info>
最快开始首次聊天：完全跳过通道设置。运行 `openclaw dashboard`，然后通过 Control UI 在浏览器中聊天。文档：[Dashboard](/web/dashboard)。
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

如需稍后重新配置：

```bash
openclaw configure
openclaw agents add <name>
```

<Note>
`--json` 并不意味着非交互模式。对于脚本，请使用 `--non-interactive`（见 [CLI 自动化](/start/wizard-cli-automation)）。
</Note>

<Tip>
引导流程包含一个网页搜索步骤，你可以在其中选择提供商：Brave、
DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Ollama Web
Search、Perplexity、SearXNG 或 Tavily。有些需要 API 密钥；其他则无需密钥。稍后可使用 `openclaw configure --section web` 进行配置。文档：
[网页工具](/tools/web)。
</Tip>

## 快速开始与高级

引导流程首先提供 **QuickStart**（默认）和 **Advanced**（完全控制）之间的选择。传入 `--flow quickstart` 或 `--flow advanced`
（别名 `manual`）即可跳过提示。

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

## 入门配置的内容

本地模式（默认）会按以下步骤进行：

1. **模型/认证** - 选择提供方认证流程（API 密钥、OAuth，或提供方特定的手动认证），包括自定义提供方（OpenAI 兼容、OpenAI Responses 兼容、Anthropic 兼容，或未知自动检测）。选择一个默认模型。  
   安全提示：如果此代理将运行工具或处理 webhook/hook 内容，请优先选择可用的最强最新一代模型，并保持工具策略严格——较弱或较旧的层级更容易受到提示注入攻击。  
   对于非交互式运行，`--secret-input-mode ref` 会存储由环境变量支持的引用，而不是明文 API 密钥值；被引用的环境变量必须已预先设置，否则入门流程会快速失败。交互式密钥引用模式可以指向环境变量或已配置的提供方引用（`file` 或 `exec`），并在保存前进行快速预检。
2. **工作区** - 代理文件的目录（默认 `~/.openclaw/workspace`）。种子文件会引导初始化。
3. **网关** - 端口、绑定地址、认证模式、Tailscale 暴露方式。在交互式令牌模式下，选择明文令牌存储（默认）或启用 SecretRef。非交互式 SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
4. **通道** - 内置和官方插件聊天通道，包括 Discord、飞书、Google Chat、iMessage、Mattermost、Microsoft Teams、QQ Bot、Signal、Slack、Telegram、WhatsApp 等。
5. **守护进程** - 安装 LaunchAgent（macOS）、systemd 用户单元（Linux/WSL2），或原生 Windows 计划任务，并提供按用户划分的 Startup 文件夹回退方案。  
   如果需要令牌认证，且 `gateway.auth.token` 由 SecretRef 管理，守护进程安装会验证它，但不会将解析后的令牌持久化到监督程序服务环境元数据中；未解析的 SecretRef 会阻止安装，并给出指导。如果同时设置了 `gateway.auth.token` 和 `gateway.auth.password`，但未设置 `gateway.auth.mode`，则会阻止安装，直到你显式设置该模式。
6. **健康检查** - 启动 Gateway 并验证其可达。
7. **技能** - 安装推荐技能及其可选依赖。

<Note>
重新运行入门流程不会清除任何内容，除非你明确选择**重置**（或传入 `--reset`）。CLI 的 `--reset` 默认作用于配置、凭据和会话；使用 `--reset-scope full` 还会移除工作区。如果配置无效或包含旧版键，入门流程会要求你先运行 `openclaw doctor`。
</Note>

`--flow import` 会运行检测到的迁移流程（例如 Hermes），而不是进行全新设置；请参阅 [迁移](/cli/migrate) 以及 [安装](/install/migrating-hermes) 下的迁移指南。`openclaw onboard --modern` 会启动 [Crestodian](/cli/crestodian)，一个对话式设置/修复助手，来替代传统向导。

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
- 入门概览：[Onboarding overview](/start/onboarding-overview)
- macOS 应用入门：[Onboarding](/start/onboarding)
- Agent 首次运行仪式：[Agent Bootstrapping](/start/bootstrapping)
