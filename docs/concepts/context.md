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

- `/status` → 快速查看“我的窗口有多满？” + 会话设置。
- `/context list` → 注入了什么 + 大致大小（按文件 + 总计）。
- `/context detail` → 更深入的拆分：按文件、按工具 schema 大小、按技能条目大小、系统提示词大小，以及可压缩的转录消息数量。
- `/context map` → 当前会话已跟踪的上下文贡献项的 WinDirStat 风格树图像。
- `/usage tokens` → 在正常回复后附加每次回复的用量页脚。
- `/compact` → 将较旧的历史摘要为一个压缩条目，以释放窗口空间。

另见：[斜杠命令](/tools/slash-commands)、[Token 使用与成本](/reference/token-use)、[压缩](/concepts/compaction)。

## 示例输出

数值会因模型、提供方、工具策略以及你的工作区内容而异。

### `/context list`

```text
🧠 上下文分解
工作区：<workspaceDir>
Bootstrap 最大/文件：12,000 字符
Sandbox：模式=non-main sandboxed=false
系统提示词（运行时）：38,412 字符（约 9,603 token）（项目上下文 23,901 字符（约 5,976 token））

注入的工作区文件：
- AGENTS.md：OK | 原始 1,742 字符（约 436 token）| 注入 1,742 字符（约 436 token）
- SOUL.md：OK | 原始 912 字符（约 228 token）| 注入 912 字符（约 228 token）
- TOOLS.md：截断 | 原始 54,210 字符（约 13,553 token）| 注入 20,962 字符（约 5,241 token）
- IDENTITY.md：OK | 原始 211 字符（约 53 token）| 注入 211 字符（约 53 token）
- USER.md：OK | 原始 388 字符（约 97 token）| 注入 388 字符（约 97 token）
- HEARTBEAT.md：缺失 | 原始 0 | 注入 0
- BOOTSTRAP.md：OK | 原始 0 字符（约 0 token）| 注入 0 字符（约 0 token）

技能列表（系统提示词文本）：2,184 字符（约 546 token）（12 项技能）
工具：read、edit、write、exec、process、browser、message、sessions_send、…
工具列表（系统提示词文本）：1,032 字符（约 258 token）
工具 schema（JSON）：31,988 字符（约 7,997 token）（计入上下文；未以文本形式展示）
工具：（同上）

会话 token（缓存）：14,250 总计 / ctx=32,000
```

### `/context detail`

```text
🧠 上下文分解（详细）
…
顶级技能（提示词条目大小）：
- frontend-design：412 字符（约 103 token）
- oracle：401 字符（约 101 token）
…（另外还有 10 项技能）

顶级工具（schema 大小）：
- browser：9,812 字符（约 2,453 token）
- exec：6,240 字符（约 1,560 token）
…（另外还有 N 个工具）
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

## Injected Workspace Files (Project Context)

By default, OpenClaw injects a fixed set of workspace files (if they exist):

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (first run only)

Large files are truncated on a per-file basis using `agents.defaults.bootstrapMaxChars` (default `20000` characters). OpenClaw also applies an upper limit to the total bootstrap injection volume for all files using `agents.defaults.bootstrapTotalMaxChars` (default `60000` characters). `/context` will show the **raw vs injected** size and whether truncation occurred.

When truncation occurs, the runtime can inject an in-context warning block below the project context. This can be configured via `agents.defaults.bootstrapPromptTruncationWarning` (`off`, `once`, `always`; default `always`).

## 技能：按需注入 vs 按需加载

系统提示词包含一个精简的 **技能列表**（名称 + 描述 + 位置）。这个列表有真实的开销。

技能说明默认不会包含在内。模型应当仅在需要时 `read` 该技能的 `SKILL.md`。

## 工具：有两种成本

工具会通过两种方式影响上下文：

1. 系统提示词中的 **工具列表文本**（你看到的“工具信息”）。
2. **工具 schema**（JSON）。这些会发送给模型，以便它可以调用工具。即使你看不到它们的纯文本形式，它们也会计入上下文。

`/context detail` 会拆分出最大的工具 schema，以便你看到哪些占用最多。

## 命令、指令和“内联快捷方式”

斜杠命令由 Gateway 处理。有几种不同的行为：

- **独立命令**：仅为 `/...` 的消息会作为命令运行。
- **指令**：`/think`、`/fast`、`/verbose`、`/trace`、`/reasoning`、`/elevated`、`/exec`、`/model`、`/queue` 会在模型看到消息之前被移除。
  - 仅包含指令的消息会持久化会话设置。
  - 普通消息中的内联指令会作为按消息生效的提示。
- **内联快捷方式**（仅允许名单中的发送者）：普通消息中的某些 `/...` 标记可以立即运行（例如：“hey /status”），并会在模型看到剩余文本之前被移除。

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

无论哪种方式，它都会报告大小和主要贡献项；它不会转储完整的系统提示词或工具 schemas。在详细模式下，它还会使用与压缩相同的真实对话消息谓词对会话转录进行比较，因此更容易区分高提示词/缓存使用率与可压缩的对话历史。

## 相关内容

<CardGroup cols={2}>
  <Card title="上下文引擎" href="/concepts/context-engine" icon="puzzle-piece">
    通过插件进行自定义上下文注入。
  </Card>
  <Card title="压缩" href="/concepts/compaction" icon="compress">
    对长对话进行摘要，以使其保持在模型窗口内。
  </Card>
  <Card title="系统提示词" href="/concepts/system-prompt" icon="message-lines">
    系统提示词如何构建，以及它在每轮中注入什么。
  </Card>
  <Card title="代理循环" href="/concepts/agent-loop" icon="arrows-rotate">
    从传入消息到最终回复的完整代理执行周期。
  </Card>
</CardGroup>
