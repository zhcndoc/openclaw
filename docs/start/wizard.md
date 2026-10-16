---
summary: "CLI 加入：通过检测到的 AI 访问快速启动或选择自定义设置"
read_when:
  - "运行或配置 CLI 上手引导"
  - "设置新机器"
title: "上手引导（CLI）"
sidebarTitle: "上手引导：CLI"
---

```bash
openclaw onboard
```

CLI 载入是 macOS、Linux 和 Windows（本机或 WSL2）上建议的终端设置路径。在全新安装中，**Quick start** 检测可用的 AI 访问，等待您选择连接，通过真正的完成验证您的选择，并使用前台网关打开 Web 仪表板。 **Custom setup** 保留完整的引导流。 `openclaw setup` 运行相同的流程（[Setup](/cli/setup) 涵盖 `--baseline` 仅配置变体）。 Windows 桌面用户还可以从 [Windows Hub](/platforms/windows) 启动。

引导式加入会在开始网关和 AI 聊天之前验证您选择的连接。检测到的连接和支持的提供商共享相同的选择器；失败或取消永远不会自动选择另一个提供商。在本地加入中，**暂时跳过** 准备指定代理的工作区和本地网关配置，然后退出而不启动。中断的基线设置将在下次运行时恢复。 **本地设置**摘要确认工作区和网关配置，而不是工作的AI连接； **Inference ready** 仅在所选连接通过验证后出现。

经典向导仍然可用于远程网关设置、通道配对、守护程序控制、技能和导入。使用 `openclaw onboard --classic` 显式运行它；引导推理选择器不会委托给它。推理通过后，OpenClaw 可以使用 `open channel wizard for <channel>` 将需要机密的通道设置交给屏蔽终端向导。工作区技能和 Web 搜索以相同的对话方式进行配置：`configure skills` 和 `configure web search` 在聊天中托管这些设置流程，而 `open search wizard` 将凭证条目交给屏蔽终端向导。对于本地网关，`configure gateway` 引导端口、绑定、身份验证和 Tailscale 设置，但保存配置而不重新启动；之后输入 `restart gateway`，或者使用 `open gateway wizard` 进行屏蔽终端凭证输入，然后运行 ​​`openclaw gateway restart`。远程网关模式仍然是登录或 `openclaw configure` 选择，而不是托管聊天向导。

上手引导创建默认代理工作区后，`import memory` 可以将检测到的本地记忆复制到其中。此对话式导入不会更改配置，也不会导入凭据或技能，无需重启 Gateway，并会如实报告每个来源的部分复制或失败情况。 如需更改模型提供商或其身份验证，请退出 OpenClaw 并运行 `openclaw onboard`；OpenClaw 不会打开引导式或经典的提供商流程。

<Info>
在全新安装中，运行 `npx openclaw@latest` 并为浏览器仪表板选择 **Quick start**。稍后使用 `openclaw dashboard` 重新打开它。文档：[仪表板](/web/dashboard)。
</Info>

## <a id="memory-embeddings"></a> 内存嵌入

验证本地 AI 连接后，引导引导会提供可跳过的内存嵌入步骤。经典向导提供了相同的步骤。选择云提供商或本地 Ollama/LM Studio 服务器并在保存之前验证合成嵌入；此检查不会发送任何内存文件。现有的 OAuth 访问是经过测试的，而不是假设的。跳过不会禁用内存或更改现有选择。您可以稍后返回 `openclaw configure --section memory`。有关仅关键字选项和本地选项，请参阅 [ 内存配置](/reference/memory-config)。

## <a id="locale"></a> 区域设置

向导会本地化固定的入门文案。它会按顺序使用 `OPENCLAW_LOCALE`、`LC_ALL`、`LC_MESSAGES` 和 `LANG` 中第一个非空值，然后回退到英文。支持的区域设置：`en`、`zh-CN`、`zh-TW`。

```bash
OPENCLAW_LOCALE=zh-CN openclaw onboard
OPENCLAW_LOCALE=en openclaw onboard # Explicit English override
```

无论区域设置如何，产品名称、命令、配置密钥、URL、提供商 ID、模型 ID 和 plugin/channel 标签都保持英语。

如需稍后重新配置非推理设置：

```bash
openclaw configure
openclaw agents add <name>
```

<Note>
`--json` 并不意味着非交互模式。对于脚本，请使用 `--non-interactive`（见 [CLI 自动化](/start/wizard-cli-automation)）。
</Note>

<Tip>
经典向导包含一个网页搜索步骤，你可以在其中选择提供商：Brave、 DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Ollama Web Search、Perplexity、SearXNG 或 Tavily。其中一些需要 API 密钥；另一些则无需密钥。可稍后使用 `openclaw configure --section web` 进行配置，或者在 OpenClaw 聊天中说 `configure web search`，以对话方式运行相同的提供商设置。 文档：[网页工具](/tools/web)。
</Tip>

## <a id="guided-default"></a> 引导式默认

在指向 [ 安全指南 ](/gateway/security) 的单行指针之后，新的本地交互式入门提供 **Quick start** 和 **Custom setup**。 Quick start记录安全确认； Custom setup 显示完整的安全说明并要求确认。默认情况下，Quick start 使用代理名称 `main` 和完全访问权限，未设置遥测同意，并跳过内存导入和应用程序建议。 Custom setup 保留遥测选择、代理名称、访问模式和可选设置提示。在实时完成或任何提供程序安装、模型选择或凭证写入之前，这两个通道都需要明确的提供程序选择。

Quick start 遵循以下路径：

1. 在单行安全指针后选择 **Quick start**。
2. Detect 配置的模型、API-key 环境变量、支持的本地 AI CLI，以及已从网关主机上可访问的 Ollama 或 LM Studio 服务器安装的支持工具的模型。此只读通道永远不会下载模型。当 Pi 和 OpenCode 安装无法用作可重用推理路由时，也可能会报告上下文。 Gemini CLI 和反重力不作为检测到的设置路线提供。
3. 选择检测到的您想要的连接，或选择支持的提供商。只有该连接才能真正完成测试。如果失败，请查看错误并选择是否重试、选择其他提供商或跳过。
4. 选择 **更多…** 用于其他提供程序组，包括可安装的官方插件。每个提供商的区域、计划和支持的浏览器、设备、API-key 或令牌方法显示在第二个菜单中。插件安装需要在所选提供商的安装继续之前进行功能审查。对于未列出的端点，选择 **Custom Provider**（显示时位于 **More…** 下）并输入其基本 URL、可选 API 密钥、兼容性和模型 ID。 Custom setup 在网关主机上的本地 CLI 中运行，并在保存提供程序或替换活动模型之前验证真实回复。选择 **立即跳过** 以准备本地基线并退出，而不启动网关或 AI 聊天。通过手动设置选择提供商会保留 Quick start 默认值：代理名称 `main`、完全访问权限、未设置遥测同意以及验证后的前台网关。
5. 保存验证的路由、准备代理工作区并保留网关设置。
6. 在前台启动网关并打开浏览器仪表板。按 **Ctrl+C** 停止；配置仍然存在。稍后使用 `openclaw gateway install` 进行后台操作，使用 `openclaw` 进行 TUI 或 `openclaw dashboard` 重新打开网页 UI。

对于配置安装、远程网关聊天设置、非交互式运行或与 `--skip-ui` 或 `--tui` 一起运行，不提供 Quick start 选择。

在已配置的安装上重新运行该命令首先会提供当前的默认模型。选择它作为验证和修复通行证。失败的检查永远不会自动替换配置的模型；入门引导等待您的下一个选择。运行 `openclaw channels add` 或 `openclaw configure` 进行后续非推理添加；使用 `openclaw onboard` 进行提供商或身份验证路由更改。

## <a id="choose-one-agent-or-a-team"></a> 选择一名智能体或一个团队

当引导式入门引导创建第一个座席时，选择 **一个座席**（默认）或 **A 小团队：参谋长加专家**。团队选择使用与 `openclaw agents team create` 相同的预设：参谋长 （`coordinator`）、研究员、作家和审稿人，具有独立的工作空间、完整的身份和书面的角色合同。参谋长在向您汇报之前会委派适当的任务并验证专家的结果。

在选定的提供商通过其连接检查后，引导式设置会创建团队。失败的检查将返回到提供商选择，而不创建团队成员。选择 **Skip** 会创建供以后使用的工作区，并报告 AI 访问仍需要配置。引导式设置会在重新启动时记住所选的协调器，包括提供程序激活之后但成员创建之前的中断。

对于团队来说，`--workspace`是父目录；每个成员都使用`<workspace>/<agent-id>`。创建所有成员后，中断的安装会将该父级保留为其恢复工作区。在没有 `--team` 的情况下重试 `openclaw onboard --workspace <workspace>` 以完成设置。在关闭设置收据之前，完成检查完整的团队名册和每个成员的工作空间；不完整或已更改的团队因错误而处于待处理状态。

如果成员创建本身失败，则已创建的成员将被保留，并且不会自动重新创建。检查 `openclaw agents list` 并修复不完整的名册，然后重试设置。

使用 `--team` 直接在交互式或非交互式运行中选择团队：

```bash
openclaw onboard --team
openclaw onboard --non-interactive --team --accept-risk
```

通常的非交互式提供商和网关选项仍然适用。入门引导明确针对协调员进行聊天。仅当没有配置环境所有者时，才将 `agents.defaults.systemAgent.agentId` 设置为协调器；现有所有者被保留并报告。团队不会引入通用默认代理或更改全局委派或工具策略。要稍后解决这个问题，请使用显式目标：

```bash
openclaw agent --agent coordinator --message "Research a topic and prepare a draft."
```

`--team` 用于本地第一代理设置。它不能与远程、经典或导入入门引导结合使用。如果代理名册已存在，请改用 `openclaw agents team create`。

请参阅 [Team 预设 ](/concepts/multi-agent#team-preset) 了解委派配置，并参阅 [`agents team create`](/cli/agents#agents-team-create) 将命名空间团队添加到现有安装。

## <a id="classic-wizard-setup-modes"></a> 经典向导设置模式

运行 `openclaw onboard --classic` 打开完整向导。其 **设置模式** 菜单是根据当前安装构建的：

- 未配置默认模型时，默认选择**QuickStart（推荐）**，其次是**手动设置**。
- 使用配置的默认模型，**保留现有模型配置**首先出现并默认选择，其次是**QuickStart（推荐）**和**手动设置**。
- 当迁移提供商可用时，**从另一个代理导入**将出现在设置选项之后。选择它会打开特定于提供商的条目，例如来自 Claude**的**Import、来自 Codex**的**Import 和来自 Hermes**的**Import。检测到的源首先出现及其路径；其他可用的提供程序要求提供源路径。在导入开始之前，使用提供程序列表中的返回可返回到 **设置模式**。

通过 `--flow quickstart` 或 `--flow manual`（别名 `advanced`）选择经典设置流程并跳过该提示。导入标志直接选择导入流程，而不是显示可能放弃所请求导入的菜单。

<Tabs>
  <Tab id="quickstart-defaults" title="QuickStart（默认）">
    - 本地网关，回环绑定
    - 工作区默认值（或现有工作区）
    - 网关端口 **18789**
    - 网关认证 **令牌**（自动生成，即使在回环上也是如此）
    - 工具策略：未配置profile时为`tools.profile: "full"`；保留明确的配置文件和其他策略。执行权限保持独立。参见 [ 工具配置文件 ](/gateway/config-tools/tool-policy#tool-profiles)。
    - DM 会话：引导会保留显式的 `session.dmScope`，否则保持未设置，因此 `"main"` 默认值会让所有跨频道的直接消息都进入代理的滚动主会话——这是个人代理的默认行为。对于共享或多用户收件箱，请使用 `"per-channel-peer"`；`openclaw security audit` 在检测到多用户 DM 流量时会建议隔离。详情： [CLI 设置参考](/start/wizard-cli-reference#outputs-and-internals)
    - Tailscale 暴露 **关闭**
    - Telegram 和 WhatsApp DM 默认为 **allowlist**：Telegram 要求输入数字 Telegram 用户 ID、WhatsApp 要求电话号码

  </Tab>
  <Tab id="manual-setup-full-control" title="手动设置（完全控制）">
    - 暴露每一步：模式、工作区、网关、频道、守护进程、技能

  </Tab>
</Tabs>

远程模式（`--mode remote`）始终使用手动流程；它仅将此计算机配置为连接到其他地方的网关，而不会在远程主机上安装或更改任何内容。

## <a id="what-classic-onboarding-configures"></a> 经典入门流程会配置什么

本地模式（默认）会按以下步骤进行：

1. **Workspace** - 代理文件的目录（默认 `~/.openclaw/workspace`）。种子引导文件。
2. **Model/Auth** - 选择提供商身份验证流程（API 密钥、OAuth 或提供商特定的手动身份验证），包括自定义提供商（OpenAI- 兼容、OpenAI）响应兼容、Anthropic- 兼容或未知自动检测）。选择默认模型。新的 OpenAI API-key 和 ChatGPT/Codex 设置默认为 `openai/gpt-6-astra`。裸直接 API `openai/gpt-5.6` 别名仍然受支持并解析为 Sol。重新运行安装程序会保留现有的显式模型，包括 `openai/gpt-5.5`。如果帐户不公开 GPT-5.6.，请显式选择 `openai/gpt-5.5` 安全注意事项：如果此代理将运行工具或处理 webhook/hook 内容，请首选可用的最强的最新一代模型并严格保持工具策略 - 较弱或较旧的层更容易提示注入。对于非交互式运行，`--secret-input-mode ref` 将新凭据存储为环境支持的引用；添加凭据时设置提供程序环境变量。现有的可解析命名配置文件及其 `env`、`file`、`exec` 或 `store` 引用将按原样重用，无需新的凭证写入或其他提供程序环境变量。之前存储的明文不会迁移；参见[秘密管理](/gateway/secrets)。交互式秘密引用模式可以指向环境变量或配置的提供程序引用（`file` 或 `exec`），并在保存之前进行快速预检检查。 model/auth 设置后，向导提供可选的实时完成测试；失败可以返回 model/auth 设置一次或被忽略，而不会阻止经典向导的其余部分。忽略它不会解锁 OpenClaw；对话设置仍然需要通过推理检查。
3. **Gateway** - 端口、绑定地址、秘密存储和 Tailscale 暴露。默认情况下以令牌模式生成网关密钥，不要求您选择令牌或密码。保留现有的密码模式配置； `--gateway-auth password` 或 `--gateway-password <value>` 明确选择密码模式。 Tailscale 漏斗仍然需要密码模式。选择明文秘密存储（默认）或选择 SecretRef。非交互式令牌 SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
4. **Channels** - 内置和官方插件聊天频道，包括 Discord、Feishu、Google Chat、iMessage、Mattermost、 Microsoft Teams、QQ 机器人、Signal、Slack、Telegram、WhatsApp 等。当不存在命令所有者时，完成的通道设置为 `/update` 和其他管理提供单独的操作员帐户步骤。输入您自己的用户 ID 并确认，或跳过。这适用于没有 DM 配对的服务器和组，并且不会提升聊天允许列表。请参阅 [ 命令所有者设置 ](/channels/pairing#set-up-an-owner-without-dm-pairing)。
5. **Web 搜索** - 配置可选搜索提供程序。
6. **Skills** - 安装推荐的技能及其可选依赖项。
7. **Daemon** - 安装 LaunchAgent （macOS）、systemd 用户单元 （Linux/WSL2） 或每个用户的本机 Windows 计划任务启动文件夹后备。如果需要令牌身份验证并且 `gateway.auth.token` 是 SecretRef 管理的，则守护进程安装会验证它，但不会将已解析的令牌保留到主管服务环境元数据中；未解决的 SecretRef 会阻止在指导下进行安装。如果 `gateway.auth.token` 和 `gateway.auth.password` 均已设置，而 `gateway.auth.mode` 未设置，则安装将被阻止，直到您明确设置模式。
8. **运行状况检查** - 等待托管或临时会话网关启动并验证其是否可访问。如果 onboarding 未启动网关，它会检查当前的可达性并解释如何启动网关，而无需等待 onboarding 未启动的服务。

<Note>
重新运行入门引导不会 **not** 擦除任何内容，除非您通过 `--reset`。 Reset 是一个命令标志，而不是 **设置模式** 菜单选择。默认为配置、凭据和会话；使用 `--reset-scope full` 也可以删除工作区。该命令在将状态移至垃圾箱之前验证 TTY 可用性和可拒绝的 CLI 选项；非交互式设置还首先需要 `--accept-risk`。交互式经典设置在显示风险确认之前执行重置，并且拒绝该提示不会撤消重置。迁移导入选项（`--flow import`、`--import-from`、`--import-source` 和 `--import-secrets`）不能与 `--reset` 组合使用；在没有 `--reset` 的情况下运行导入。如果没有 `--reset`，无效的配置或旧密钥会使入门要求您首先运行 `openclaw doctor`。
</Note>

`--flow import` 会在经典向导中运行一个检测到的迁移流程（例如 Hermes），而不是进行全新设置；请参见 [迁移](/cli/migrate) 以及 [安装](/install/migrating-hermes) 下的迁移指南。`openclaw onboard --modern` 是 [OpenClaw](/cli/openclaw) 的一个兼容别名。它使用与 `openclaw setup` 相同的推理门禁：经过验证的推理会启动助手，而交互式失败会返回到引导式推理设置。

## <a id="add-another-agent"></a> 添加另一个代理

使用 `openclaw agents add <name>` 创建一个拥有独立工作区、会话和身份验证配置的独立代理。不带 `--workspace` 运行时，将启动交互式流程来设置名称、工作区、身份验证、频道和绑定——这不是完整的 `openclaw onboard` 向导。

它会设置：

- `agents.entries.*.name`
- `agents.entries.*.workspace`
- `agents.entries.*.agentDir`

注意：

- 默认工作区：`~/.openclaw/workspace-<agentId>`（如果设置了 `agents.defaults.workspace`，则会位于该路径下）。
- 添加 `bindings`，将传入消息路由到此代理（引导流程可以代你完成此操作）。
- 非交互式标志：`--role`、`--model`、`--agent-dir`、`--bind`、`--non-interactive`。对于 `--role`，`--workspace` 可以省略。请参阅 [ 角色模板](/cli/agents#role-templates)。

## <a id="full-reference"></a> 完整参考

有关详细的逐步行为和配置输出，请参见 [CLI 设置参考](/start/wizard-cli-reference)。 有关非交互式示例，请参见 [CLI 自动化](/start/wizard-cli-automation)。 有关完整的标志参考，请参见 [`openclaw onboard`](/cli/onboard)。

## <a id="related-docs"></a> 相关文档

- CLI 命令参考：[`openclaw onboard`](/cli/onboard)
- 入门概览：[入门概览](/start/onboarding-overview)
- macOS 应用程序入门：[Onboarding](/start/onboarding)
- 代理首轮仪式：[代理Bootstrapping](/start/bootstrapping)
