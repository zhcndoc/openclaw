---
summary: "代理运行时、工作区契约和会话引导"
read_when:
  - "更改代理运行时、工作区引导或会话行为"
title: "代理运行时"
---

OpenClaw 提供一个**嵌入式代理运行时**：一个内置的代理循环、工具连接以及提示组装，与将轮次委派给外部主控进程不同。每个已配置的代理（有关运行多个代理，请参见[多代理路由](/concepts/multi-agent)） 都有自己的工作区、引导文件和会话存储。本页介绍该运行时契约：工作区必须包含什么、会注入哪些文件，以及会话如何基于它进行引导。

## <a id="workspace-(required)"></a><a id="workspace-required"></a> 工作区（必需）

每个代理使用一个单独的工作区目录（`agents.defaults.workspace`，或按代理配置的 `agents.entries.*.workspace`）作为工具和上下文的**唯一**工作目录（`cwd`）。

建议：如果缺失，请使用 `openclaw setup` 创建 `~/.openclaw/openclaw.json` 并初始化工作区文件。

完整工作区布局 + 备份指南：[代理工作区](/concepts/agent-workspace)

如果启用了 `agents.defaults.sandbox`，非主会话可以通过 `agents.defaults.sandbox.workspaceRoot` 下的每会话工作区来覆盖此设置（参见 [Gateway 配置](/gateway/configuration)）。

## <a id="bootstrap-files-(injected)"></a><a id="bootstrap-files-injected"></a> 引导文件（注入）

在工作区内，OpenClaw 期望存在以下可由用户编辑的文件：

| 文件           | 用途                                              |
| -------------- | ---------------------------------------------------- |
| `AGENTS.md`    | 操作说明 + “记忆”                    |
| `SOUL.md`      | 人设、边界、语气                            |
| `IDENTITY.md`  | 智能体 name/vibe/emoji                                |
| `USER.md`      | 用户资料 + 偏好称呼                     |
| `BOOTSTRAP.md` | 一次性的首次运行仪式（完成后删除） |
| `MEMORY.md`    | 根长期记忆文件（如果存在）               |

在新会话的第一轮中，OpenClaw 会将这些文件的内容注入到系统提示词的项目上下文中。只有当 `MEMORY.md` 存在于工作区根目录时，才会注入它。

空白文件将被跳过。大文件会用标记进行修剪和截断，以便提示保持精简（阅读文件以获取完整内容）。丢失的文件（`MEMORY.md` 除外）会注入单个“丢失文件”标记行。 `openclaw setup` 为其创建一个安全的默认模板。

`BOOTSTRAP.md` 仅为 **全新工作区** 创建（不存在其他引导文件）。在待处理期间，OpenClaw 将其保留在项目上下文中。 OpenClaw 为初始仪式添加了系统提示引导指南，而不是将文件复制到用户消息中。如果您在完成仪式后将其删除，则以后重新启动时不会重新创建它。

观察到工作区后，OpenClaw 将其设置状态和证明存储在位于 `~/.openclaw/state/openclaw.sqlite` 的共享 SQLite 数据库中。如果最近验证的工作区消失或被擦除，启动将拒绝默默地重新播种 `BOOTSTRAP.md`。恢复工作区，或使用完全板载重置，以便工作区及其数据库状态一起被清除。

较早版本使用工作区 JSON 文件和 `.attested` 伴随文件。运行时不会读取这些文件。请运行 `openclaw doctor --fix` 来验证它们，将其状态导入 SQLite，并在导入的行得到验证后删除每个源文件。

若要完全禁用 bootstrap 文件创建（适用于预置工作区），请设置：

```json5
{ agents: { defaults: { skipBootstrap: true } } }
```

## <a id="built-in-tools"></a> 内置工具

核心工具（read/exec/edit/write 和相关系统工具）始终可用，但须遵守工具政策。 `apply_patch` 对于 OpenAI 模型默认开启，并由 `tools.exec.applyPatch`（`enabled`、`workspaceOnly`、`allowModels`）进行门控。 `AGENTS.md` 的 `## Tools` 部分确实 **not** 控制哪些工具存在。它是您希望如何使用它们的指南。

## <a id="skills"></a> 技能

OpenClaw 会从以下位置加载技能（优先级从高到低）：

- 工作区：`<workspace>/skills`
- 项目代理技能：`<workspace>/.agents/skills`
- 个人代理技能：`~/.agents/skills`
- Managed/local: `~/.openclaw/skills`
- 内置（随安装包提供）
- 额外技能目录：`skills.load.extraDirs`

技能根目录可以包含分组文件夹，例如 `<workspace>/skills/personal/foo/SKILL.md`。该技能仍然通过其扁平的标题名称来暴露，例如 `foo`。

技能可以通过config/env进行门控（参见[网关配置](/gateway/configuration)中的`skills`）。

## <a id="runtime-boundaries"></a> 运行时边界

嵌入式代理运行时由 OpenClaw- 拥有：模型发现、工具连接、提示组装、会话管理和通道交付共享一个集成运行时表面。

## <a id="sessions"></a> 会话

会话行存储在按代理划分的 SQLite 数据库中：

- `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`

Transcript JSONL 文件仍可位于 `~/.openclaw/agents/<agentId>/sessions/`，作为旧版迁移输入、已删除或重置的存档、导入、导出以及支持工件。活动代理历史与会话行一起存储在 SQLite 中。会话 ID 是稳定的，由 OpenClaw 选定。OpenClaw 不会读取其他工具的会话文件夹。

## <a id="steering-while-streaming"></a> 流式处理中进行 steering

默认情况下，运行中到达的入站提示将引导至当前运行。 OpenClaw 运行时启动辅助消息的第一个可执行工具调用，然后转向可以跳过其未启动的顺序尾部。流式批处理共享该消息的开始状态。并行批次始终运行，不会出现转向跳过，并且运行工具会继续。每个批次稳定后，在停止挂钩和下一个模型调用之前检查转向。跳过的呼叫会收到合成的配对结果，并且耗尽的转向消息会跟随工具结果。

`/queue steer` 是默认的 active-run 行为。`/queue followup` 和 `/queue collect` 会让消息等待后续轮次，而不是进行 steering。 `/queue interrupt` 则会中止当前 active-run。有关队列和边界行为，请参见 [Queue](/concepts/queue) 和 [Steering queue](/concepts/queue-steering)。

块流式传输完成后立即发送已完成的辅助块。默认为**off**（`agents.defaults.blockStreamingDefault: "off"`）。通过`agents.defaults.blockStreamingBreak`（`text_end`或`message_end`，默认`text_end`）调整边界。 Control 与 `agents.defaults.blockStreamingChunk` 软块分块（默认为 800-1200 个字符，并且更喜欢分段符，然后是换行符，然后是句子）。使用 `agents.defaults.blockStreamingCoalesce` 合并流式块以减少单行垃圾邮件（发送前基于空闲的合并）。非 Telegram 通道需要显式 `*.streaming.block.enabled: true` 才能启用块回复（除非 `channels.qqbot.streaming.mode` 是 `"off"`，否则 QQ Bot 会流式传输块回复）。详细的工具摘要在工具启动时发出，没有反跳。 Control UI 通过代理事件（如果可用）流式传输工具输出。更多详细信息：[流+分块](/concepts/streaming)。

## <a id="model-refs"></a> 模型引用

配置中的模型引用（例如 `agents.defaults.model` 和 `agents.defaults.models`）通过按**第一个** `/` 进行拆分来解析。

- 配置模型时使用 `provider/model`。
- 如果模型 ID 本身包含 `/` （OpenRouter-style），请包含提供程序前缀（例如：`openrouter/moonshotai/kimi-k2`）。
- 如果省略提供程序，OpenClaw 首先尝试别名，然后尝试与该确切模型 ID 匹配的唯一配置提供程序，然后才回退到配置的默认提供程序。如果该提供程序不再公开配置的默认模型，则 OpenClaw 将回退到第一个配置的 provider/model，而不是显示陈旧的已删除提供程序默认值。

## <a id="configuration-(minimal)"></a><a id="configuration-minimal"></a> 配置（最小）

至少设置：

- `agents.defaults.workspace`
- 您启用的每个通道的发件人白名单（强烈推荐） — 请参阅 [ 访问组](/channels/access-groups)

## <a id="related"></a> 相关内容

- [Agent 工作区](/concepts/agent-workspace)
- [多代理路由](/concepts/multi-agent)
- [会话管理](/concepts/session)
- [群聊](/channels/group-messages)
- [系统提示](/concepts/system-prompt)
