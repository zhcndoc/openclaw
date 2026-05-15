---
summary: "代理运行时、工作区契约和会话引导"
read_when:
  - 更改代理运行时、工作区引导或会话行为
title: "代理运行时"
---

OpenClaw 运行一个 **单一的嵌入式代理运行时**——每个 Gateway 一个代理进程，拥有自己的工作区、引导文件和会话存储。此页涵盖该运行时契约：工作区必须包含什么、会注入哪些文件，以及会话如何在其上引导。

## 工作区（必需）

OpenClaw 使用单个代理工作区目录（`agents.defaults.workspace`）作为代理工具和上下文的**唯一**工作目录（`cwd`）。

建议：如果缺失，请使用 `openclaw setup` 创建 `~/.openclaw/openclaw.json` 并初始化工作区文件。

完整工作区布局 + 备份指南：[代理工作区](/concepts/agent-workspace)

如果启用了 `agents.defaults.sandbox`，非主会话可以通过
`agents.defaults.sandbox.workspaceRoot` 下的每会话工作区来覆盖此设置（参见
[Gateway 配置](/gateway/configuration)）。

## 引导文件（注入）

在 `agents.defaults.workspace` 中，OpenClaw 期望存在以下可由用户编辑的文件：

- `AGENTS.md` - 操作说明 + “记忆”
- `SOUL.md` - 人设、边界、语气
- `TOOLS.md` - 用户维护的工具备注（例如 `imsg`、`sag`、约定）
- `BOOTSTRAP.md` - 一次性首次运行仪式（完成后删除）
- `IDENTITY.md` - 代理名称/风格/表情符号
- `USER.md` - 用户档案 + 偏好称呼

在新会话的第一轮，OpenClaw 会将这些文件的内容注入到系统提示词的 Project Context 中。

空文件会被跳过。大型文件会被裁剪并带上标记，以保持提示词精简（完整内容请读取文件）。

如果文件缺失，OpenClaw 会注入一行单独的“缺失文件”标记行（并且 `openclaw setup` 会创建一个安全的默认模板）。

`BOOTSTRAP.md` 仅会为**全新工作区**创建（不存在其他引导文件时）。在其待处理期间，OpenClaw 会将其保留在 Project Context 中，并为初始仪式添加系统提示词级别的引导说明，而不是把它复制到用户消息中。如果你在完成仪式后将其删除，那么在后续重启时它不应被重新创建。

要完全禁用引导文件创建（适用于预置工作区），请设置：

```json5
{ agents: { defaults: { skipBootstrap: true } } }
```

## 内置工具

核心工具（read/exec/edit/write 和相关系统工具）始终可用，受工具策略约束。`apply_patch` 是可选的，并受 `tools.exec.applyPatch` 控制。`TOOLS.md` **不**控制有哪些工具存在；它只是说明你希望如何使用它们。

## 技能

OpenClaw 会从以下位置加载技能（优先级从高到低）：

- 工作区：`<workspace>/skills`
- 项目代理技能：`<workspace>/.agents/skills`
- 个人代理技能：`~/.agents/skills`
- 托管/本地：`~/.openclaw/skills`
- 内置（随安装包提供）
- 额外技能目录：`skills.load.extraDirs`

技能可以通过配置/环境变量进行门控（参见 [Gateway 配置](/gateway/configuration) 中的 `skills`）。

## 运行时边界

这个内嵌代理运行时基于 Pi agent core（模型、工具和提示流水线）构建。会话管理、发现、工具绑定和通道投递是建立在该核心之上的 OpenClaw 自有层。

## 会话

会话转录以 JSONL 形式存储在：

- `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

会话 ID 是稳定的，并由 OpenClaw 选择。
其他工具的旧版会话文件夹不会被读取。

## 流式处理中进行 steering

运行中途到达的输入提示默认会被引导到当前运行中。
Steering 会在当前助手轮次完成其工具调用之后、下一次 LLM 调用之前投递，并且不再跳过当前助手消息中的剩余工具调用。

`/queue steer` 是默认的 active-run 行为。`/queue followup` 和 `/queue collect` 会让消息等待后续轮次，而不是进行 steering。
`/queue interrupt` 则会中止当前 active-run。有关队列和边界行为，请参见 [Queue](/concepts/queue)
和 [Steering queue](/concepts/queue-steering)。

Block streaming 会在完成后立即发送已完成的助手块；它默认是**关闭**的（`agents.defaults.blockStreamingDefault: "off"`）。
通过 `agents.defaults.blockStreamingBreak` 调整边界（`text_end` vs `message_end`；默认值为 text_end）。
使用 `agents.defaults.blockStreamingChunk` 控制软块分片（默认 800-1200 字符；优先段落断点，其次换行；最后是句子）。
使用 `agents.defaults.blockStreamingCoalesce` 合并流式分片，以减少单行刷屏（发送前基于空闲时间进行合并）。非 Telegram 渠道需要显式设置 `*.blockStreaming: true` 才能启用块回复。
工具的详细摘要会在工具开始时发出（无去抖）；Control UI 会在可用时通过代理事件流式输出工具结果。
更多详情：[流式传输 + 分块](/concepts/streaming)。

## 模型引用

配置中的模型引用（例如 `agents.defaults.model` 和 `agents.defaults.models`）通过按**第一个** `/` 进行拆分来解析。

- 配置模型时使用 `provider/model`。
- 如果模型 ID 本身包含 `/`（OpenRouter 风格），请包含 provider 前缀（例如 `openrouter/moonshotai/kimi-k2`）。
- 如果你省略 provider，OpenClaw 会先尝试别名，然后尝试与该精确模型 ID 匹配的唯一已配置 provider，最后才回退到已配置的默认 provider。若该 provider 不再暴露已配置的默认模型，OpenClaw 会回退到第一个已配置的 provider/model，而不是暴露一个陈旧的、已移除 provider 的默认值。

## 配置（最小）

至少设置：

- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom`（强烈推荐）

---

_下一步：[群聊](/channels/group-messages)_ 🦞

## 相关内容

- [代理工作区](/concepts/agent-workspace)
- [多代理路由](/concepts/multi-agent)
- [会话管理](/concepts/session)
