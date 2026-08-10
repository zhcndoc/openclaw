---
summary: "代理运行时、工作区契约和会话引导"
read_when:
  - 更改代理运行时、工作区引导或会话行为
title: "代理运行时"
---

OpenClaw 提供一个**嵌入式代理运行时**：一个内置的代理循环、工具
连接以及提示组装，与将轮次委派给外部
主控进程不同。每个已配置的代理（有关运行多个代理，请参见[多代理路由](/concepts/multi-agent)）
都有自己的工作区、引导文件和会话
存储。本页介绍该运行时契约：工作区必须
包含什么、会注入哪些文件，以及会话如何基于它进行引导。

## 工作区（必需）

每个代理使用一个单独的工作区目录（`agents.defaults.workspace`，或按代理配置的
`agents.entries.*.workspace`）作为工具和上下文的**唯一**工作目录（`cwd`）。

建议：如果缺失，请使用 `openclaw setup` 创建 `~/.openclaw/openclaw.json` 并初始化工作区文件。

完整工作区布局 + 备份指南：[代理工作区](/concepts/agent-workspace)

如果启用了 `agents.defaults.sandbox`，非主会话可以通过
`agents.defaults.sandbox.workspaceRoot` 下的每会话工作区来覆盖此设置（参见
[Gateway 配置](/gateway/configuration)）。

## 引导文件（注入）

在工作区内，OpenClaw 期望存在以下可由用户编辑的文件：

| 文件           | 作用                                                 |
| -------------- | ---------------------------------------------------- |
| `AGENTS.md`    | 操作说明 + “记忆”                                    |
| `SOUL.md`      | 人设、边界、语气                                     |
| `IDENTITY.md`  | 代理名称/风格/表情符号                               |
| `USER.md`      | 用户资料 + 偏好称呼                                  |
| `BOOTSTRAP.md` | 一次性的首次运行仪式（完成后删除）                    |
| `MEMORY.md`    | 根长期记忆文件（如果存在）                            |

在新会话的第一轮中，OpenClaw 会将这些文件的内容注入到系统提示词的项目上下文中。只有当 `MEMORY.md` 存在于工作区根目录时，才会注入它。

空文件会被跳过。较大的文件会被截断并附加标记，以便提示词保持精简（完整内容请读取文件）。缺失的文件（`MEMORY.md` 除外）则会注入一行单独的“缺失文件”标记；`openclaw setup` 会为其创建一个安全的默认模板。

`BOOTSTRAP.md` 仅会为**全新的工作区**创建（即不存在其他 bootstrap 文件）。在它处于待处理状态时，OpenClaw 会将其保留在项目上下文中，并为初始仪式添加系统提示引导，而不是把它复制到用户消息中。如果你在完成仪式后删除它，那么后续重启时它不会再次被创建。

在工作区被观测之后，OpenClaw 会将其设置状态和证明信息存储到共享的 SQLite 数据库中，路径为
`~/.openclaw/state/openclaw.sqlite`。如果最近已证明过的工作区
消失或被清空，启动时将拒绝静默重新播种 `BOOTSTRAP.md`；
请恢复工作区，或使用完整的 onboard 重置，以便将工作区和其
数据库状态一并清除。

较早版本使用工作区 JSON 文件和 `.attested` 伴随文件。运行时不会读取这些文件。请运行 `openclaw doctor --fix` 来验证它们，将其状态导入 SQLite，并在导入的行得到验证后删除每个源文件。

若要完全禁用 bootstrap 文件创建（适用于预置工作区），请设置：

```json5
{ agents: { defaults: { skipBootstrap: true } } }
```

## 内置工具

核心工具（read/exec/edit/write 以及相关系统工具）始终可用，
但受工具策略约束。`apply_patch` 对 OpenAI 模型默认开启，并受
`tools.exec.applyPatch`（`enabled`、`workspaceOnly`、`allowModels`）控制。`AGENTS.md` 中的 `## Tools` 部分并不控制哪些工具存在；它只是指导你希望如何使用这些工具。

## 技能

OpenClaw 会从以下位置加载技能（优先级从高到低）：

- 工作区：`<workspace>/skills`
- 项目代理技能：`<workspace>/.agents/skills`
- 个人代理技能：`~/.agents/skills`
- 托管/本地：`~/.openclaw/skills`
- 内置（随安装包提供）
- 额外技能目录：`skills.load.extraDirs`

技能根目录可以包含分组文件夹，例如
`<workspace>/skills/personal/foo/SKILL.md`；该技能仍会通过其
扁平化 frontmatter 名称对外暴露，例如 `foo`。

技能可通过配置/环境变量进行限制（参见 [网关配置](/gateway/configuration) 中的 `skills`）。

## 运行时边界

嵌入式代理运行时归 OpenClaw 所有：模型发现、工具连接、
提示组装、会话管理以及通道传递共享一个统一的
运行时表面。

## 会话

会话行存储在按代理划分的 SQLite 数据库中：

- `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`

Transcript JSONL 文件仍可位于
`~/.openclaw/agents/<agentId>/sessions/`，作为旧版迁移输入、已删除或
重置的存档、导入、导出以及支持工件。活动代理历史与会话行一起
存储在 SQLite 中。会话 ID 是稳定的，由 OpenClaw 选定。OpenClaw 不会读取其他工具的会话文件夹。

## 流式处理中进行 steering

默认情况下，在运行中途到达的入站提示会被 steering 到当前运行中。
OpenClaw 运行时会在尚未启动的工具调用之前以及下一次模型调用之前检查
steering。正在运行的工具会继续执行；尚未启动的顺序调用会被跳过，
而并行调用会在其批次越过启动检查点后继续执行。
在模型看到 steering 之前，被跳过的调用会收到成对的模拟结果。

`/queue steer` 是默认的 active-run 行为。`/queue followup` 和 `/queue collect` 会让消息等待后续轮次，而不是进行 steering。
`/queue interrupt` 则会中止当前 active-run。有关队列和边界行为，请参见 [Queue](/concepts/queue)
和 [Steering queue](/concepts/queue-steering)。

块流式传输会在完成时立即发送已完成的助手块；默认是
**关闭**的（`agents.defaults.blockStreamingDefault: "off"`）。
通过 `agents.defaults.blockStreamingBreak` 调整边界（`text_end` 与 `message_end`；默认值为 `text_end`）。
使用 `agents.defaults.blockStreamingChunk` 控制软块分片（默认
800-1200 个字符；优先按段落换行，其次按换行；最后按句子）。
使用 `agents.defaults.blockStreamingCoalesce` 合并流式分片，以减少
单行刷屏（发送前基于空闲时间进行合并）。非 Telegram 渠道需要
显式设置 `*.streaming.block.enabled: true` 才能启用块回复（QQ Bot
会默认流式发送块回复，除非 `channels.qqbot.streaming.mode` 为 `"off"`）。
详细工具摘要会在工具开始时发出（无防抖）；Control UI
在可用时通过 agent 事件流式输出工具结果。
更多详情：[Streaming + chunking](/concepts/streaming)。

## 模型引用

配置中的模型引用（例如 `agents.defaults.model` 和 `agents.defaults.models`）通过按**第一个** `/` 进行拆分来解析。

- 配置模型时使用 `provider/model`。
- 如果模型 ID 本身包含 `/`（OpenRouter 风格），请包含 provider 前缀（例如 `openrouter/moonshotai/kimi-k2`）。
- 如果你省略 provider，OpenClaw 会先尝试别名，然后尝试与该精确模型 ID 匹配的唯一已配置 provider，最后才回退到已配置的默认 provider。若该 provider 不再暴露已配置的默认模型，OpenClaw 会回退到第一个已配置的 provider/model，而不是暴露一个陈旧的、已移除 provider 的默认值。

## 配置（最小）

至少设置：

- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom`（强烈推荐）。

## 相关内容

- [Agent 工作区](/concepts/agent-workspace)
- [多代理路由](/concepts/multi-agent)
- [会话管理](/concepts/session)
- [群聊](/channels/group-messages)
