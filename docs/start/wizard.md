---
summary: "CLI 入门：为网关、工作区、频道和技能的引导设置"
read_when:
  - 运行或配置 CLI 入门
  - 设置新机器时
title: "入门（CLI）"
sidebarTitle: "入门：CLI"
---

# 入门（CLI）

CLI 入门是**推荐**的方式，用于在 macOS、Linux 或 Windows（通过 WSL2；强烈推荐）上设置 OpenClaw。  
它在一个引导流程中配置本地网关或远程网关连接，以及频道、技能和工作区默认设置。

```bash
openclaw onboard
```

<Info>
最快的首次聊天：打开控制界面（无需频道设置）。运行 `openclaw dashboard` ，在浏览器中聊天。文档：[Dashboard](/web/dashboard)。
</Info>

稍后重新配置：

```bash
openclaw configure
openclaw agents add <name>
```

<Note>
`--json` 并不意味着非交互模式。对于脚本，请使用 `--non-interactive`。
</Note>

<Tip>
CLI 入门包括一个网络搜索步骤，您可以选择提供商（Perplexity、Brave、Gemini、Grok 或 Kimi），并粘贴您的 API 密钥，使代理能够使用 `web_search`。您也可以稍后使用 `openclaw configure --section web` 进行配置。文档：[Web tools](/tools/web)。
</Tip>

## 快速开始与高级

入门从 **快速开始**（默认）与 **高级**（完全控制）开始。

<Tabs>
  <Tab title="快速开始（默认）">
    - 本地网关（回环）
    - 工作区默认（或现有工作区）
    - 网关端口 **18789**
    - 网关认证 **令牌**（自动生成，即使是回环）
    - 新本地设置工具策略默认：`tools.profile: "coding"`（保留已有显式配置）
    - DM 隔离默认：本地入门在未设置时写入 `session.dmScope: "per-channel-peer"`。详情见：[CLI 设置参考](/start/wizard-cli-reference#outputs-and-internals)
    - Tailscale 暴露 **关闭**
    - Telegram 和 WhatsApp 私信默认启用 **白名单**（将提示输入手机号）
  </Tab>
  <Tab title="高级（完全控制）">
    - 显示每一步配置（模式、工作区、网关、频道、守护进程、技能）。
  </Tab>
</Tabs>

## 入门配置内容

**本地模式（默认）** 将引导完成以下步骤：

1. **模型/认证** — 选择任何支持的提供商/认证流程（API 密钥、OAuth 或 setup-token），包括自定义提供商  
   （兼容 OpenAI，兼容 Anthropic，或自动检测的未知提供商）。选择默认模型。  
   安全提示：如果此代理将运行工具或处理 webhook/钩子内容，建议使用最强最新一代模型，并保持工具策略严格。较弱/较旧的模型更易被提示注入。  
   对于非交互运行，`--secret-input-mode ref` 会在认证配置中存储基于环境变量的引用，而非明文 API 密钥。  
   在非交互 `ref` 模式下，必须设置提供商环境变量；若无该环境变量且传入内联密钥标志，则会快速失败。  
   在交互运行中，选择秘密引用模式可指向环境变量或配置的提供商引用（`file` 或 `exec`），保存前会快速预验证。  
2. **工作区** — 代理文件存放位置（默认 `~/.openclaw/workspace`）。初始化引导文件。  
3. **网关** — 端口、绑定地址、认证模式、Tailscale 暴露设置。  
   在交互式令牌模式中，选择默认明文令牌存储或启用 SecretRef。  
   非交互令牌 SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。  
4. **频道** — WhatsApp、Telegram、Discord、Google Chat、Mattermost、Signal、BlueBubbles 或 iMessage。  
5. **守护进程** — 安装 LaunchAgent（macOS）或 systemd 用户单元（Linux/WSL2）。  
   如果令牌认证需要令牌且 `gateway.auth.token` 由 SecretRef 管理，守护进程安装会验证该令牌但不会将解析后的令牌持久化到守护进程服务环境元数据中。  
   如果令牌认证需要令牌且配置的令牌 SecretRef 未解析，阻止守护进程安装并提供可操作指导。  
   如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`，且未设置 `gateway.auth.mode`，则阻止守护进程安装，直到显式设置认证模式。  
6. **健康检查** — 启动网关并确认其运行状态。  
7. **技能** — 安装推荐技能及可选依赖。  

<Note>
重新运行入门不会擦除任何内容，除非您显式选择 **重置**（或传入 `--reset`）。  
CLI 的 `--reset` 默认重置配置、凭证和会话；使用 `--reset-scope full` 包含工作区。  
如果配置无效或包含遗留键，入门会提示先运行 `openclaw doctor`。
</Note>

**远程模式** 仅配置本地客户端连接远程网关。  
它**不会**在远程主机上安装或更改任何内容。

## 添加其他代理

使用 `openclaw agents add <name>` 创建一个带有独立工作区、会话和认证配置的单独代理。  
不带 `--workspace` 运行时启动入门。

它设置：

- `agents.list[].name`  
- `agents.list[].workspace`  
- `agents.list[].agentDir`  

注意：

- 默认工作区路径为 `~/.openclaw/workspace-<agentId>`。
- 添加 `bindings` 来路由入站消息（入门可以完成此操作）。
- 非交互标志有：`--model`、`--agent-dir`、`--bind`、`--non-interactive`。

## 完整参考

详细的逐步拆解及配置输出，请参见  
[CLI 设置参考](/start/wizard-cli-reference)。  
非交互示例，请参见 [CLI 自动化](/start/wizard-cli-automation)。  
更深入的技术参考及 RPC 详情，请参见  
[入门参考](/reference/wizard)。

## 相关文档

- CLI 命令参考: [`openclaw onboard`](/cli/onboard)  
- 入门概览: [入门概览](/start/onboarding-overview)  
- macOS 应用入门: [入门](/start/onboarding)  
- 代理首次运行流程: [代理引导](/start/bootstrapping)
