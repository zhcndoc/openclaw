---
doc-schema-version: 1
summary: "会话目标：持久的每会话目标、/goal 控制、模型目标工具、token 预算和 TUI 状态"
read_when:
  - 你希望 OpenClaw 在长会话中始终显示一个目标
  - 你需要暂停、恢复、阻塞、完成或清除会话目标
  - 你想了解 get_goal、create_goal 和 update_goal 工具
  - 你想查看目标在 TUI 中的显示方式
title: "目标"
---

# 目标

**目标** 是附加到当前 OpenClaw 会话上的一个持久目标。
它为代理和操作者提供一个共享的长期工作目标，
而不会把该目标变成后台任务、提醒、cron 作业或
固定指令。

目标属于会话状态。它会随会话键移动，跨进程
重启保持存在，会显示在 `/goal` 中，可通过目标工具供模型使用，并在活动会话存在目标时显示在 TUI 页脚中。

## 快速开始

设置目标：

```text
/goal start 让 PR 87469 的 CI 变绿并推送修复
```

检查它：

```text
/goal
```

在工作有意等待时暂停它：

```text
/goal pause 等待 CI
```

恢复它：

```text
/goal resume
```

将其标记为已完成：

```text
/goal complete 已推送并验证
```

清除它：

```text
/goal clear
```

## 目标的用途

当某个会话有一个应在多轮对话中持续可见的具体结果时，使用目标：

- PR 收尾：修复、验证、自动审查、推送，以及打开或更新 PR。
- 调试流程：复现 bug、确定所属范围、修补，并证明修复有效。
- 文档流程：阅读相关文档、编写新页面、建立交叉链接，并
  验证文档构建。
- 维护任务：检查当前状态、做受限修改、运行正确的
  检查，并报告变更内容。

目标不是任务队列。当工作需要脱离主会话运行、
按计划重复、拆分成受管子工作，或者作为策略持续存在时，请使用 [Task Flow](/automation/taskflow)、
[tasks](/automation/tasks)、[cron jobs](/automation/cron-jobs) 或
[standing orders](/automation/standing-orders)。

## 命令参考

不带参数的 `/goal` 会打印当前目标摘要：

```text
目标
状态：active
目标：让 PR 87469 的 CI 变绿并推送修复
已用 token：12k
token 预算：12k/50k

命令：/goal pause, /goal complete, /goal clear
```

命令：

- `/goal` 或 `/goal status` 显示当前目标。
- `/goal start <objective>` 为当前会话创建一个新目标。
- `/goal set <objective>` 和 `/goal create <objective>` 是 `start` 的别名。
- `/goal pause [note]` 暂停一个活动目标。
- `/goal resume [note]` 恢复一个已暂停、已阻塞、已受使用量限制或
  已受预算限制的目标。
- `/goal complete [note]` 将目标标记为已实现。
- `/goal done [note]` 是 `complete` 的别名。
- `/goal block [note]` 将目标标记为已阻塞。
- `/goal blocked [note]` 是 `block` 的别名。
- `/goal clear` 将目标从会话中移除。

每个会话一次只能存在一个目标。启动第二个目标会失败，
直到当前目标被清除为止。

## 状态

目标使用一组较小的状态集：

- `active`：会话正在推进该目标。
- `paused`：操作者暂停了目标；`/goal resume` 会让它再次变为活动状态。
- `blocked`：代理或操作者报告了真实阻塞；当有新信息或状态可用时，`/goal resume`
  会让它再次变为活动状态。
- `budget_limited`：已达到配置的 token 预算；`/goal resume`
  会从同一目标重新开始推进。
- `usage_limited`：保留用于使用量限制停止状态；在允许时，`/goal resume`
  会重新开始推进。
- `complete`：目标已经达成。已完成的目标是终态；开始另一个目标前请先使用
  `/goal clear`。

`/new` 和 `/reset` 会清除当前会话目标，因为它们会有意
从新的会话上下文开始。

## Token 预算

目标可以带一个可选的正整数 token 预算。该预算与目标一起存储，并从
创建时会话的全新 token 计数开始计算。如果在目标开始时当前会话只有过期或未知的 token
使用量，OpenClaw 会等待下一次新的会话 token 快照，并以此作为
基线，因此在目标存在之前花费的 token 不会计入该目标。

当 token 使用量达到预算时，目标会变为 `budget_limited`。这
不会删除目标或抹去目标内容。它会告诉操作者和
代理，该目标在恢复或清除之前不再被主动推进。

Token 预算是会话目标的保护线，不是计费上限。提供方配额、
成本报告和上下文窗口行为仍然使用正常的 OpenClaw
使用量和模型控制。

## 模型工具

OpenClaw 向代理宿主暴露三个核心目标工具：

- `get_goal`：读取当前会话目标，包括状态、目标内容、token
  使用量和 token 预算。
- `create_goal`：仅当用户、系统或开发者指令明确请求时才创建目标。
  如果会话已经有目标，则会失败。
- `update_goal`：将目标标记为 `complete` 或 `blocked`。

模型不能静默暂停、恢复、清除或替换目标。这些是通过 `/goal` 和重置命令进行的操作者/会话控制。这样既能防止代理悄悄移动目标，又保留了清晰路径供代理报告已达成结果或真实阻塞。

`update_goal` 工具只有在目标确实已经达成时，才应将目标标记为 `complete`。
只有当同样的阻塞条件已经重复出现，并且在没有新的用户输入或外部状态变化时代理无法取得有意义进展时，它才应将目标标记为 `blocked`。

## TUI

TUI 会在页脚中将活动会话的目标显示在代理、会话、模型、运行控制和 token 计数旁边。

页脚示例：

- `Pursuing goal (12k/50k)` 表示带有 token 预算的活动目标。
- `Goal paused (/goal resume)` 表示已暂停的目标。
- `Goal blocked (/goal resume)` 表示已阻塞的目标。
- `Goal hit usage limits (/goal resume)` 表示受使用量限制的目标。
- `Goal unmet (50k/50k)` 表示受预算限制的目标。
- `Goal achieved (42k)` 表示已完成的目标。

页脚刻意保持简洁。使用 `/goal` 查看完整的目标、备注、
token 预算和可用命令。

## 通道行为

`/goal` 命令适用于支持命令的 OpenClaw 会话，包括
TUI 和允许文本命令的聊天界面。目标状态附加到
会话键，而不是传输方式。如果两个界面使用同一个会话，它们会看到
同一个目标。

目标状态不是传递指令。它不会强制回复通过某个通道、
改变队列行为、批准工具或调度工作。

## 故障排查

`Goal error: goal already exists` 表示该会话已经有一个目标。使用
`/goal` 查看它，如果已经完成则使用 `/goal complete`，或者在
开始不同目标前使用 `/goal clear`。

`Goal error: goal not found` 表示该会话还没有目标。使用
`/goal start <objective>` 创建一个。

`Goal error: goal is already complete` 表示该目标已进入终态。在开始或恢复另一个目标前先清除它。

如果 token 使用量看起来像 `0` 或已过期，活动会话可能还没有新的
token 快照。随着 OpenClaw 记录会话使用量和基于对话内容的总计，使用量会刷新。

## 相关内容

- [Slash commands](/tools/slash-commands)
- [TUI](/web/tui)
- [Session tool](/concepts/session-tool)
- [Compaction](/concepts/compaction)
- [Task Flow](/automation/taskflow)
- [Standing orders](/automation/standing-orders)
