---
summary: "CLI 上手引导：为网关、工作区、通道和技能提供引导式设置"
read_when:
  - 运行或配置 CLI 上手引导
  - 设置新机器
title: "上手引导（CLI）"
sidebarTitle: "上手引导：CLI"
---

CLI 上手引导是在 macOS、
Linux 或 Windows（通过 WSL2；强烈推荐）上设置 OpenClaw 的**推荐**方式。
它会在一个引导式流程中同时配置本地 Gateway 或远程 Gateway 连接，以及通道、技能
和工作区默认值。

```bash
openclaw onboard
```

<Info>
最快首次聊天：打开 Control UI（无需设置通道）。运行
`openclaw dashboard`，然后在浏览器中聊天。文档：[Dashboard](/web/dashboard)。
</Info>

如需稍后重新配置：

```bash
openclaw configure
openclaw agents add <name>
```

<Note>
`--json` 并不意味着非交互模式。对于脚本，请使用 `--non-interactive`。
</Note>

<Tip>
CLI 上手引导包含一个网页搜索步骤，你可以在其中选择提供方，
例如 Brave、DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、
Ollama Web Search、Perplexity、SearXNG 或 Tavily。某些提供方需要
API key，而另一些则无需 key。你也可以稍后使用
`openclaw configure --section web` 进行配置。文档：[Web tools](/tools/web)。
</Tip>

## QuickStart 与 Advanced

上手引导从 **QuickStart**（默认值）与 **Advanced**（完全控制）开始。

<Tabs>
  <Tab title="QuickStart (defaults)">
    - 本地 Gateway（回环地址）
    - 工作区默认值（或现有工作区）
    - Gateway 端口 **18789**
    - Gateway 认证 **Token**（自动生成，即使在回环地址上也是如此）
    - 新本地设置的工具策略默认值：`tools.profile: "coding"`（会保留已有明确配置的 profile）
    - DM 隔离默认值：本地上手引导在未设置时会写入 `session.dmScope: "per-channel-peer"`。详情：[CLI Setup Reference](/start/wizard-cli-reference#outputs-and-internals)
    - Tailscale 暴露 **关闭**
    - Telegram + WhatsApp 私信默认设为 **allowlist**（会提示你输入电话号码）

  </Tab>
  <Tab title="Advanced（完全控制）">
    - 暴露每个步骤（模式、工作区、gateway、通道、守护进程、技能）。

  </Tab>
</Tabs>

## 上手引导会配置什么

**本地模式（默认）** 会引导你完成以下步骤：

1. **Model/Auth** — 选择任何受支持的提供方/认证流程（API key、OAuth，或提供方特定的手动认证），包括 Custom Provider
   （OpenAI-compatible、Anthropic-compatible 或 Unknown auto-detect）。选择一个默认模型。
   安全提示：如果该 agent 将运行工具或处理 webhook/hooks 内容，请优先选择可用的最强最新一代模型，并保持严格的工具策略。较弱/较旧的模型层级更容易受到 prompt-inject 攻击。
   对于非交互式运行，`--secret-input-mode ref` 会将基于环境变量的引用存储在认证 profile 中，而不是明文 API key 值。
   在非交互式 `ref` 模式下，必须设置提供方环境变量；如果传入内联 key 标志但未设置该环境变量，会立即失败。
   在交互式运行中，选择 secret reference 模式后，你可以指向环境变量或已配置的提供方引用（`file` 或 `exec`），并在保存前进行快速预检验证。
   对于 Anthropic，交互式上手引导/配置会提供 **Anthropic Claude CLI** 作为首选本地路径，以及 **Anthropic API key** 作为推荐的生产环境路径。Anthropic setup-token 仍然可用，作为受支持的 token-auth 路径。
2. **Workspace** — agent 文件的位置（默认 `~/.openclaw/workspace`）。会生成引导文件。
3. **Gateway** — 端口、绑定地址、认证模式、Tailscale 暴露。
   在交互式 token 模式下，可选择默认明文 token 存储，或改用 SecretRef。
   非交互式 token SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
4. **Channels** — 内置和捆绑的聊天通道，例如 iMessage、Discord、Feishu、Google Chat、Mattermost、Microsoft Teams、QQ Bot、Signal、Slack、Telegram、WhatsApp 等。
5. **Daemon** — 安装 LaunchAgent（macOS）、systemd user unit（Linux/WSL2），或原生 Windows Scheduled Task，并提供按用户 Startup-folder 作为后备方案。
   如果 token 认证需要 token，且 `gateway.auth.token` 由 SecretRef 管理，守护进程安装会验证它，但不会将解析后的 token 持久化到 supervisor 服务环境元数据中。
   如果 token 认证需要 token，且已配置的 token SecretRef 未解析，守护进程安装会被阻止，并给出可操作的指导。
   如果 `gateway.auth.token` 和 `gateway.auth.password` 都已配置，且 `gateway.auth.mode` 未设置，则守护进程安装会被阻止，直到显式设置模式为止。
6. **Health check** — 启动 Gateway 并验证其是否运行正常。
7. **Skills** — 安装推荐技能和可选依赖。

<Note>
重新运行上手引导不会**清除**任何内容，除非你明确选择 **Reset**（或传入 `--reset`）。
CLI `--reset` 默认作用于配置、凭据和会话；使用 `--reset-scope full` 可包含工作区。
如果配置无效或包含旧版键值，上手引导会要求你先运行 `openclaw doctor`。
</Note>

**远程模式** 只会配置本地客户端以连接到其他位置的 Gateway。
它不会在远程主机上安装或更改任何内容。

## 添加另一个 agent

使用 `openclaw agents add <name>` 创建一个独立的 agent，它拥有自己的工作区、
会话和认证 profile。不带 `--workspace` 运行会启动上手引导。

它会设置：

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

说明：

- 默认工作区遵循 `~/.openclaw/workspace-<agentId>`。
- 添加 `bindings` 以路由传入消息（上手引导可以执行此操作）。
- 非交互式标志：`--model`、`--agent-dir`、`--bind`、`--non-interactive`。

## 完整参考

有关逐步详细说明和配置输出，请参阅
[CLI Setup Reference](/start/wizard-cli-reference)。
有关非交互示例，请参阅 [CLI Automation](/start/wizard-cli-automation)。
有关更深入的技术参考，包括 RPC 细节，请参阅
[Onboarding Reference](/reference/wizard)。

## 相关文档

- CLI 命令参考：[`openclaw onboard`](/cli/onboard)
- 上手引导概览：[Onboarding Overview](/start/onboarding-overview)
- macOS 应用上手引导：[Onboarding](/start/onboarding)
- Agent 首次运行仪式：[Agent Bootstrapping](/start/bootstrapping)
