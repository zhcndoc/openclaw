---
summary: "上下文：模型看到什么、它如何构建，以及如何检查它"
read_when:
  - 你想了解在 OpenClaw 中 “context” 的含义
  - 你在调试模型为什么“知道”某件事（或者为什么忘了它）
  - 你想减少上下文开销（/context、/status、/compact）
title: "上下文"
---

"Context" 是 **OpenClaw 在一次运行中发送给模型的所有内容**。它受模型的 **上下文窗口**（token 限制）约束。

初学者心智模型：

- **系统提示词**（由 OpenClaw 构建）：规则、工具、技能列表、时间/运行时，以及注入的工作区文件。
- **对话历史**：你在本次会话中的消息 + 助手的消息。
- **工具调用/结果 + 附件**：命令输出、文件读取、图像/音频等。

Context 并不等同于“记忆”：记忆可以存储在磁盘上并在之后重新加载；context 是当前模型窗口中的内容。

## 快速开始（检查上下文）

- `/status` → 快速查看“我的窗口有多满？”以及会话设置。
- `/context list` → 注入了什么 + 大致大小（按文件 + 总计）。
- `/context detail` → 更深入的拆分：按文件、按工具 schema 大小、按技能条目大小，以及系统提示词大小。
- `/context map` → 以 WinDirStat 风格的矩形树图像显示当前会话中被追踪的上下文贡献项。
- `/usage tokens` → 在正常回复后附加每次回复的 token 使用页脚。
- `/compact` → 将较早的历史总结为一个紧凑条目，以释放窗口空间。

另见：[斜杠命令](/tools/slash-commands)、[Token 使用与成本](/reference/token-use)、[压缩](/concepts/compaction)。

## 示例输出

数值会因模型、提供方、工具策略以及你的工作区内容而异。

### `/context list`

```
🧠 上下文拆分
Workspace: <workspaceDir>
Bootstrap max/file: 12,000 chars
Sandbox: mode=non-main sandboxed=false
System prompt (run): 38,412 chars (~9,603 tok) (Project Context 23,901 chars (~5,976 tok))

Injected workspace files:
- AGENTS.md: OK | raw 1,742 chars (~436 tok) | injected 1,742 chars (~436 tok)
- SOUL.md: OK | raw 912 chars (~228 tok) | injected 912 chars (~228 tok)
- TOOLS.md: TRUNCATED | raw 54,210 chars (~13,553 tok) | injected 20,962 chars (~5,241 tok)
- IDENTITY.md: OK | raw 211 chars (~53 tok) | injected 211 chars (~53 tok)
- USER.md: OK | raw 388 chars (~97 tok) | injected 388 chars (~97 tok)
- HEARTBEAT.md: MISSING | raw 0 | injected 0
- BOOTSTRAP.md: OK | raw 0 chars (~0 tok) | injected 0 chars (~0 tok)

Skills list (system prompt text): 2,184 chars (~546 tok) (12 skills)
Tools: read, edit, write, exec, process, browser, message, sessions_send, …
Tool list (system prompt text): 1,032 chars (~258 tok)
Tool schemas (JSON): 31,988 chars (~7,997 tok) (counts toward context; not shown as text)
Tools: (same as above)

Session tokens (cached): 14,250 total / ctx=32,000
```

### `/context detail`

```
🧠 上下文拆分（详细）
…
Top skills (prompt entry size):
- frontend-design: 412 chars (~103 tok)
- oracle: 401 chars (~101 tok)
… (+10 more skills)

Top tools (schema size):
- browser: 9,812 chars (~2,453 tok)
- exec: 6,240 chars (~1,560 tok)
… (+N more tools)
```

### `/context map`

发送一个由最近一次缓存运行报告生成的图像。在本次会话中，如果正常消息尚未生成运行报告，`/context map` 会返回不可用消息，而不是渲染估算结果。矩形面积与已追踪的提示词字符数成正比：

- 注入的工作区文件
- 基础系统提示词文本
- 技能提示词条目
- 工具 JSON schemas

当没有缓存运行报告时，`/context list`、`/context detail` 和 `/context json` 仍然可以检查按需估算结果。

## 什么计入上下文窗口

模型接收到的所有内容都计入，包括：

- 系统提示词（所有部分）。
- 对话历史。
- 工具调用 + 工具结果。
- 附件/转录内容（图像/音频/文件）。
- 压缩摘要和裁剪产物。
- 提供方的“包装层”或隐藏头部（不可见，但仍会计入）。

## OpenClaw 如何构建系统提示词

系统提示词由 **OpenClaw 拥有**，并在每次运行时重建。它包括：

- 工具列表 + 简短说明。
- 技能列表（仅元数据；见下文）。
- 工作区位置。
- 时间（UTC + 如已配置则转换后的用户时间）。
- 运行时元数据（主机/OS/模型/思考）。
- 在 **项目上下文** 下注入的工作区启动文件。

完整拆分：[系统提示词](/concepts/system-prompt)。

## 注入的工作区文件（项目上下文）

默认情况下，OpenClaw 会注入一组固定的工作区文件（如果存在）：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`（仅首次运行）

大文件会按文件使用 `agents.defaults.bootstrapMaxChars`（默认 `12000` 字符）进行截断。OpenClaw 还会在所有文件上强制执行一个总的启动注入上限 `agents.defaults.bootstrapTotalMaxChars`（默认 `60000` 字符）。`/context` 会显示 **原始 vs 注入后** 的大小，以及是否发生了截断。

当发生截断时，运行时可以在项目上下文下注入一个提示块警告。通过 `agents.defaults.bootstrapPromptTruncationWarning`（`off`、`once`、`always`；默认 `once`）进行配置。

## 技能：按需注入 vs 按需加载

系统提示词包含一个精简的 **技能列表**（名称 + 描述 + 位置）。这个列表有真实的开销。

技能说明默认不会包含在内。模型应当仅在需要时 `read` 该技能的 `SKILL.md`。

## 工具：有两种成本

工具会通过两种方式影响上下文：

1. 系统提示词中的 **工具列表文本**（你看到的“工具信息”）。
2. **工具 schemas**（JSON）。这些会发送给模型，以便它可以调用工具。即使你看不到它们的纯文本形式，它们也会计入上下文。

`/context detail` 会拆分出最大的工具 schema，以便你看到哪些占用最多。

## 命令、指令和“内联快捷方式”

斜杠命令由 Gateway 处理。有几种不同的行为：

- **独立命令**：仅为 `/...` 的消息会作为命令执行。
- **指令**：`/think`、`/verbose`、`/trace`、`/reasoning`、`/elevated`、`/model`、`/queue` 会在模型看到消息之前被移除。
  - 仅指令消息会保留会话设置。
  - 普通消息中的内联指令会作为每条消息的提示。
- **内联快捷方式**（仅允许名单中的发送者）：普通消息中的某些 `/...` 标记可以立即执行（例如：“hey /status”），并且会在模型看到剩余文本之前被移除。

详情：[斜杠命令](/tools/slash-commands)。

## 会话、压缩和裁剪（哪些会持久化）

哪些内容会跨消息保留取决于具体机制：

- **普通历史** 会保留在会话转录中，直到按策略被压缩/裁剪。
- **压缩** 会将摘要持久化到转录中，并保留最近的消息不变。
- **裁剪** 会从 _内存中的_ 提示词里移除旧的工具结果，以释放上下文窗口空间，但不会重写会话转录——完整历史仍可在磁盘上检查。

文档：[会话](/concepts/session)、[压缩](/concepts/compaction)、[会话裁剪](/concepts/session-pruning)。

默认情况下，OpenClaw 使用内置的 `legacy` 上下文引擎进行组装和
压缩。如果你安装了一个提供 `kind: "context-engine"` 且
通过 `plugins.slots.contextEngine` 选择它的插件，OpenClaw 会将上下文
组装、`/compact` 以及相关子代理上下文生命周期钩子委托给该
引擎。`ownsCompaction: false` 不会自动回退到 legacy
引擎；当前引擎仍必须正确实现 `compact()`。请参见
[上下文引擎](/concepts/context-engine) 获取完整的
可插拔接口、生命周期钩子和配置。

## `/context` 实际报告什么

`/context` 在可用时会优先使用最新的 **运行构建** 系统提示词报告：

- `System prompt (run)` = 从最后一次嵌入式（可使用工具的）运行中捕获，并持久化到会话存储中。
- `System prompt (estimate)` = 当不存在运行报告时（或通过不会生成报告的 CLI 后端运行时）即时计算得到。

无论哪种方式，它都会报告大小和主要贡献者；它**不会**输出完整的系统提示词或工具 schemas。

## 相关内容

<CardGroup cols={2}>
  <Card title="Context engine" href="/concepts/context-engine" icon="puzzle-piece">
    通过插件进行自定义上下文注入。
  </Card>
  <Card title="Compaction" href="/concepts/compaction" icon="compress">
    对长对话进行摘要，以使其保持在模型窗口内。
  </Card>
  <Card title="System prompt" href="/concepts/system-prompt" icon="message-lines">
    系统提示词如何构建，以及它在每轮中注入什么。
  </Card>
  <Card title="Agent loop" href="/concepts/agent-loop" icon="arrows-rotate">
    从传入消息到最终回复的完整代理执行周期。
  </Card>
</CardGroup>
