---
summary: "OpenClaw ACP 代理文档索引，每个读者作业一页"
read_when:
  - "通过 ACP 运行编码工具"
  - "在消息渠道上设置绑定到对话的 ACP 会话"
  - "将消息渠道对话绑定到持久 ACP 会话"
  - "排查 ACP 后端、插件接线或完成投递问题"
  - "在聊天中操作 /acp 命令"
  - "您正在寻找与您的任务匹配的 ACP 代理页面"
title: "ACP 代理"
sidebarTitle: "ACP 代理"
---

[Agent 客户端协议 （ACP）](https://agentclientprotocol.com/) 会话让 OpenClaw 运行外部编码工具（Claude Code、Cursor、Copilot、Droid、OpenClaw ACP、 OpenCode、Gemini CLI 和其他支持的 acpx harness）通过 ACP 后端插件。 ACP 运行时拥有每个会话及其取消。

<Note>
**ACP 是外部harness路径，而不是默认的 Codex 路径。** 本机 Codex 应用程序服务器插件拥有 `/codex ...` 控件和用于代理轮流的默认 `openai/gpt-*` 嵌入式运行时。 ACP 拥有 `/acp ...` 控件和 `sessions_spawn({ runtime: "acp" })` 会话。

要让 Codex 或 Claude Code 作为外部 MCP 客户端直接连接到现有的 OpenClaw 渠道对话，请改用 [`openclaw mcp serve`](/cli/mcp)，而不是 ACP。
</Note>

## <a id="which-page-do-i-want%3F"></a><a id="which-page-do-i-want"></a> 我该看哪个页面？

| 你想要 to...                                                                                  | 用这个                              | 笔记                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 在当前会话中绑定或控制Codex                                               | `/codex bind`, `/codex threads`       | 启用 `codex` 插件时的本机 Codex 应用程序服务器路径：绑定聊天回复、图像转发、model/fast/permissions、停止和转向。 ACP 是一个明确的后备 |
| 运行 Claude Code、Gemini CLI、显式 Codex ACP 或其他外部harness _through_ OpenClaw | 本页                             | 聊天绑定会话、`/acp spawn`、`sessions_spawn({ runtime: "acp" })`、后台任务、运行时控件                                                                 |
| 将 OpenClaw 网关会话公开为编辑器或客户端的 ACP 服务器                   | [`openclaw acp`](/cli/acp)            | 桥接模式：IDE/client 通过 stdio/WebSocket 与 OpenClaw 进行 ACP 通话                                                                                                      |
| 使用本地AI CLI（例如Claude Code）作为代理的模型运行时                              | [CLI Backends](/gateway/cli-backends) | 不是 ACP：仅通过 MCP 桥的网关工具，没有 ACP 控件，没有harness运行时                                                                                     |

## <a id="acp-agents-documentation-pages"></a> ACP 代理文档页面

此页是一个索引。 ACP 代理记录在七页上，每个读者作业一页。打开与您的任务匹配的页面。

| 页面                                                            | 读它的时候                                                               |
| --------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [ACP 智能体快速入门](/tools/acp-agents/quickstart)           | 您正在安装 ACP 运行时插件或选择harness目标 ID。 |
| [ACP 代理操作员操作手册](/tools/acp-agents/runbook)        | 您通过聊天运行 `/acp`，并且需要流程、生命周期和路由规则。  |
| [ACP 代理绑定](/tools/acp-agents/bindings)               | 您正在绑定对话、线程或配置的 `bindings[]` 条目。  |
| [ACP 代理会话](/tools/acp-agents/sessions)               | 您需要 `sessions_spawn` 参数或 `--bind` 和 `--thread` 模式。 |
| [ACP 代理发货模型](/tools/acp-agents/delivery)         | 您正在调试完成交付、恢复或沙箱边界。    |
| [ACP代理控制](/tools/acp-agents/controls)               | 您需要 `/acp` 命令参考和运行时选项映射。          |
| [ACP代理故障排除](/tools/acp-agents/troubleshooting) | 您遇到 ACP 错误消息，需要可能的原因并进行修复。            |

## <a id="acp-versus-sub-agents"></a> ACP 与子代理

当您需要外部harness运行时时，请使用 ACP。当启用 `codex` 插件时，使用 **native Codex app-server** 进行 Codex 对话 binding/control。当您想要 OpenClaw-native 委托运行时，请使用 **sub-agents**。

| 区域          | ACP 会话                           | 子代理运行                      |
| ------------- | ------------------------------------- | ---------------------------------- |
| 运行时       | ACP 后端插件（例如 acpx） | OpenClaw 原生子代理运行时  |
| 会话 key   | `agent:<agentId>:acp:<uuid>`          | `agent:<agentId>:subagent:<uuid>`  |
| 主要命令 | `/acp ...`                            | `/subagents ...`                   |
| 生成工具    | `sessions_spawn`，使用 `runtime:"acp"` | `sessions_spawn`（默认运行时） |

另见 [子代理](/tools/subagents)。

## <a id="how-acp-runs-claude-code"></a> ACP 如何运行 Claude Code

对于 Claude Code 到 ACP，堆栈为：

1. OpenClaw ACP 会话控制平面。
2. 官方 `@openclaw/acpx` 运行时插件。
3. Claude ACP 适配器。
4. Claude-方runtime/session机械。

ACP Claude 是一个 **harness 会话**，具有 ACP 控件、会话恢复、后台任务跟踪和可选的 conversation/thread 绑定。

CLI 后端是一个单独的路径：本地 CLI 在模型运行时运行正常代理轮流，没有 ACP 控件。参见 [CLI Backends](/gateway/cli-backends)。

对于运维人员，实用规则是：

- **想要 `/acp spawn`、可绑定会话、运行时控制，或持久的 harness 工作？** 使用 ACP。
- **想要普通代理轮流通过本地CLI运行，例如Claude Code？** 使用CLI后端。

## <a id="acpx-harness%2C-plugin-setup%2C-and-permissions"></a><a id="acpx-harness-plugin-setup-and-permissions"></a> acpx 运行器、插件设置和权限

有关 acpx 运行器配置（Claude Code／Codex／Gemini CLI 别名）、 plugin-tools 和 OpenClaw-tools MCP 桥接，以及 ACP 权限模式， 请参见 [ACP agents - 设置](/tools/acp-agents-setup)。

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/tools/acp-agents#persistent-channel-bindings`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="does-this-work-out-of-the-box%3F" /><a id="does-this-work-out-of-the-box" />[这个可以开箱即用吗？](/tools/acp-agents/quickstart#does-this-work-out-of-the-box)
- <a id="first-run-gotchas" />[首次运行陷阱](/tools/acp-agents/quickstart#first-run-gotchas)
- <a id="runtime-prerequisites" />[运行时先决条件](/tools/acp-agents/quickstart#runtime-prerequisites)
- <a id="supported-harness-targets" />[支持的harness目标](/tools/acp-agents/quickstart#supported-harness-targets)
- <a id="operator-runbook" />[操作手册](/tools/acp-agents/runbook#operator-runbook)
- <a id="spawn" />[Spawn](/tools/acp-agents/runbook#spawn)
- <a id="work" />[工作](/tools/acp-agents/runbook#work)
- <a id="check-state" />[检查状态](/tools/acp-agents/runbook#check-state)
- <a id="tune" />[Tune](/tools/acp-agents/runbook#tune)
- <a id="steer" />[转向](/tools/acp-agents/runbook#steer)
- <a id="stop" />[停止](/tools/acp-agents/runbook#stop)
- <a id="lifecycle-details" />[生命周期详细信息](/tools/acp-agents/runbook#lifecycle-details)
- <a id="native-codex-routing-rules" />[原生 Codex 路由规则](/tools/acp-agents/runbook#native-codex-routing-rules)
- <a id="model-provider-runtime-selection-cheat-sheet" />[模型/提供者/运行时选择备忘单](/tools/acp-agents/runbook#model-provider-runtime-selection-cheat-sheet)
- <a id="acp-routing-natural-language-triggers" />[ACP-路由自然语言触发器](/tools/acp-agents/runbook#acp-routing-natural-language-triggers)
- <a id="bound-sessions" />[绑定会话](/tools/acp-agents/bindings#bound-sessions)
- <a id="mental-model" />[心理模型](/tools/acp-agents/bindings#mental-model)
- <a id="current-conversation-binds" />[当前会话绑定](/tools/acp-agents/bindings#current-conversation-binds)
- <a id="binding-rules-and-exclusivity" />[约束规则和排他性](/tools/acp-agents/bindings#binding-rules-and-exclusivity)
- <a id="thread-bound-sessions" />[线程绑定会话](/tools/acp-agents/bindings#thread-bound-sessions)
- <a id="thread-supporting-channels" />[螺纹支撑通道](/tools/acp-agents/bindings#thread-supporting-channels)
- <a id="persistent-channel-bindings" />[持久通道绑定](/tools/acp-agents/bindings#persistent-channel-bindings)
- <a id="binding-model" />[绑定模型](/tools/acp-agents/bindings#binding-model)
- <a id="param-bindings-type" />[`bindings[].type`](/tools/acp-agents/bindings#param-bindings-type)
- <a id="param-bindings-match" />[`bindings[].match`](/tools/acp-agents/bindings#param-bindings-match)
- <a id="param-bindings-agent-id" />[`bindings[].agentId`](/tools/acp-agents/bindings#param-bindings-agent-id)
- <a id="param-bindings-acp-mode" />[`bindings[].acp.mode`](/tools/acp-agents/bindings#param-bindings-acp-mode)
- <a id="param-bindings-acp-label" />[`bindings[].acp.label`](/tools/acp-agents/bindings#param-bindings-acp-label)
- <a id="param-bindings-acp-cwd" />[`bindings[].acp.cwd`](/tools/acp-agents/bindings#param-bindings-acp-cwd)
- <a id="param-bindings-acp-backend" />[`bindings[].acp.backend`](/tools/acp-agents/bindings#param-bindings-acp-backend)
- <a id="runtime-defaults-per-agent" />[每个代理的运行时默认值](/tools/acp-agents/bindings#runtime-defaults-per-agent)
- <a id="example" />[示例](/tools/acp-agents/bindings#example)
- <a id="behavior" />[行为](/tools/acp-agents/bindings#behavior)
- <a id="start-acp-sessions" />[开始 ACP 会话](/tools/acp-agents/sessions#start-acp-sessions)
- <a id="from-sessions_spawn" />[来自 `sessions_spawn`](/tools/acp-agents/sessions#from-sessions_spawn)
- <a id="from-%2Facp-command" />[来自`/acp`命令](/tools/acp-agents/sessions#from-%2Facp-command)
- <a id="sessions_spawn-parameters" />[`sessions_spawn`参数](/tools/acp-agents/sessions#sessions_spawn-parameters)
- <a id="param-task" />[`task`](/tools/acp-agents/sessions#param-task)
- <a id="param-runtime" />[`runtime`](/tools/acp-agents/sessions#param-runtime)
- <a id="param-agent-id" />[`agentId`](/tools/acp-agents/sessions#param-agent-id)
- <a id="param-thread" />[`thread`](/tools/acp-agents/sessions#param-thread)
- <a id="param-mode" />[`mode`](/tools/acp-agents/sessions#param-mode)
- <a id="param-cwd" />[`cwd`](/tools/acp-agents/sessions#param-cwd)
- <a id="param-label" />[`label`](/tools/acp-agents/sessions#param-label)
- <a id="param-resume-session-id" />[`resumeSessionId`](/tools/acp-agents/sessions#param-resume-session-id)
- <a id="param-stream-to" />[`streamTo`](/tools/acp-agents/sessions#param-stream-to)
- <a id="param-model" />[`model`](/tools/acp-agents/sessions#param-model)
- <a id="param-thinking" />[`thinking`](/tools/acp-agents/sessions#param-thinking)
- <a id="spawn-bind-and-thread-modes" />[Spawn 绑定和线程模式](/tools/acp-agents/sessions#spawn-bind-and-thread-modes)
- <a id="bind-here%7Coff" />[`--bind here|off`](/tools/acp-agents/sessions#bind-here%7Coff)
- <a id="thread-auto%7Chere%7Coff" />[`--thread auto|here|off`](/tools/acp-agents/sessions#thread-auto%7Chere%7Coff)
- <a id="delivery-model" />[发货模型](/tools/acp-agents/delivery#delivery-model)
- <a id="interactive-acp-sessions" />[交互式 ACP 会话](/tools/acp-agents/delivery#interactive-acp-sessions)
- <a id="parent-owned-one-shot-acp-sessions" />[家长拥有的一次性 ACP 会话](/tools/acp-agents/delivery#parent-owned-one-shot-acp-sessions)
- <a id="sessions-send-and-a2a-delivery" />[`sessions_send` 和 A2A 发货](/tools/acp-agents/delivery#sessions-send-and-a2a-delivery)
- <a id="resume-an-existing-session" />[恢复现有会话](/tools/acp-agents/delivery#resume-an-existing-session)
- <a id="post-deploy-smoke-test" />[部署后冒烟测试](/tools/acp-agents/delivery#post-deploy-smoke-test)
- <a id="sandbox-compatibility" />[沙箱兼容性](/tools/acp-agents/delivery#sandbox-compatibility)
- <a id="session-target-resolution" />[会话目标解析](/tools/acp-agents/controls#session-target-resolution)
- <a id="session-owner-and-harness" />[会话所有者和利用](/tools/acp-agents/controls#session-owner-and-harness)
- <a id="acp-controls" />[ACP 控制](/tools/acp-agents/controls#acp-controls)
- <a id="runtime-options-mapping" />[运行时选项映射](/tools/acp-agents/controls#runtime-options-mapping)
- <a id="troubleshooting" />[故障排除](/tools/acp-agents/troubleshooting#troubleshooting)

## <a id="related"></a> 相关内容

- [ACP 代理 - 设置](/tools/acp-agents-setup)
- [代理绑定](/concepts/agent-bindings)
- [Agent 发送](/tools/agent-send)
- [CLI Backends](/gateway/cli-backends)
- [Codex 运行环境](/plugins/codex-harness)
- [Codex harness运行时](/plugins/codex-harness-runtime)
- [多代理沙箱工具](/tools/multi-agent-sandbox-tools)
- [`openclaw acp` (桥接模式)](/cli/acp)
- [子代理](/tools/subagents)
- [Steer](/tools/steer) — 主动运行转向和排队 ACP 后续操作
