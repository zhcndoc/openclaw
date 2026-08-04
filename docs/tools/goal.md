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

目标是会话状态：它会随会话键移动，跨进程重启保留，
并会出现在 `/goal`、面向模型的目标工具以及 TUI
页脚中。

分离的命令完成后会返回到其源用户可见线程，因此
即使命令执行使用了单独的沙盒策略会话，下一轮仍会继续看到
相同的目标。

## 快速开始

```text
/goal start get CI green for PR 87469 and push the fix
/goal
/goal edit get CI green for PR 87469, push the fix, and update docs
/goal pause waiting for CI
/goal resume
/goal complete pushed and verified
/goal clear
```

`start` 是可选的：`/goal get CI green for PR 87469` 也会创建一个目标，
因为任何位于 `/goal` 之后且不是已知动作词的文本都会被视为一个
新目标。

## 目标的用途

当一次会话有一个具体的结果，并且需要在多个回合中保持可见时，请使用目标：

- 一个 PR 收尾：修复、验证、自动审查、推送，并打开或更新 PR。
- 一次调试运行：复现 bug，确定所属的范围，打补丁，并证明修复有效。
- 一次文档处理：阅读相关文档，编写新页面，建立交叉链接，并验证文档构建。
- 一项维护任务：检查当前状态，进行有界更改，运行正确的检查，并报告发生了什么变化。

目标不是任务队列。当工作需要脱离主会话运行、
按计划重复、拆分成受管子工作，或者作为策略持续存在时，请使用 [Task Flow](/automation/taskflow)、
[tasks](/automation/tasks)、[cron jobs](/automation/cron-jobs) 或
[standing orders](/automation/standing-orders)。

## 命令参考

`/goal` 不带参数时会打印当前目标摘要：

```text
目标
状态：active
目标：让 PR 87469 的 CI 变绿并推送修复
已用 token：12k
token 预算：12k/50k

Commands: /goal edit <objective>, /goal pause, /goal complete, /goal clear
```

| 命令                                                | 作用                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------ |
| `/goal` or `/goal status`                           | 显示当前目标。                                                           |
| `/goal start <objective>`                           | 为当前会话创建一个新目标。                                               |
| `/goal set <objective>`, `/goal create <objective>` | `start` 的别名。                                                         |
| `/goal <objective>`                                 | 也会创建一个新目标（任何未被识别为动作词的文本）。                         |
| `/goal edit <objective>`                            | 重新表述当前目标；状态和 token 统计保持不变。                              |
| `/goal pause [note]`                                | 暂停一个活跃目标。                                                        |
| `/goal resume [note]`                               | 恢复一个已暂停、被阻塞、受使用量限制或受预算限制的目标。                   |
| `/goal complete [note]`                             | 标记目标已完成。                                                          |
| `/goal done [note]`                                 | `complete` 的别名。                                                      |
| `/goal block [note]`                                | 标记目标被阻塞。                                                          |
| `/goal blocked [note]`                              | `block` 的别名。                                                         |
| `/goal clear`                                       | 从会话中移除该目标。                                                      |

在一个会话中同一时间只能存在一个目标。创建第二个目标会失败，
并显示 `Goal error: goal already exists`，直到当前目标被清除为止。

`/goal start` 不接受 token 预算标志；预算只能通过面向模型的 `create_goal` 工具设置。

## 状态

- `active`：会话正在追求目标。
- `paused`：操作员已暂停目标；`/goal resume` 会使其再次激活
  。
- `blocked`：代理或操作员报告了一个真实的阻塞；当有新的信息或状态可用时，`/goal resume`
  会使其再次激活。
- `budget_limited`：已达到配置的 token 预算；`/goal resume` 会使用新的预算窗口，从同一目标重新开始追求。
- `usage_limited`：保留用于未来的使用限制停止状态；`/goal resume` 会以相同方式重新开始追求。
- `complete`：目标已达成。已完成的目标是终态；在开始另一个目标之前，请使用 `/goal
  clear`。

`/new` 和 `/reset` 会清除当前会话目标，因为它们会刻意
启动全新的会话上下文。

## Token 预算

目标可以设置一个可选的正向 token 预算，通过 `create_goal` 工具的 `token_budget` 参数进行设置。该预算从目标创建时会话的最新 token 计数开始计算。如果目标开始时，会话只有过时或未知的 token 快照，OpenClaw 会等待下一次最新快照，并将其作为基线，因此在目标创建之前花费的 token 不会计入该目标。

当用量达到预算时，目标会进入 `budget_limited` 状态。这不会删除目标或抹除其目标；它只是告诉操作者和代理，该目标在恢复或清除之前不再被积极推进。恢复后，会在当前最新 token 计数处开始一个新的预算窗口。

Token 预算是会话-目标级别的保护栏，而不是计费上限。提供方配额、成本报告以及上下文窗口行为仍然使用标准的 OpenClaw 用量和模型控制。

## 模型工具

OpenClaw 向代理运行环境暴露了三个目标工具：

| 工具          | 目的                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `get_goal`    | 读取当前会话目标：状态、目标、token 使用量以及 token 预算。                                         |
| `create_goal` | 仅当用户或系统指令明确要求时才创建目标。如果会话中已存在目标，则失败。 |
| `update_goal` | 将目标标记为 `complete` 或 `blocked`。                                                                                   |

模型不能静默暂停、恢复、清除或替换目标。这些仍然是通过 `/goal` 和重置命令进行的操作员/会话控制，因此代理
可以报告已完成或真正的阻塞，而不会悄悄改变
目标。

`update_goal` 只有在目标确实达成时才应将目标标记为 `complete`。只有在相同的阻塞条件连续至少三个目标轮次中反复出现后，才应将目标标记为 `blocked`，而不是因为普通的困难或缺少润色就进行标记。更新目标状态不会发送聊天回复；代理仍必须提供用户所请求的最终回复。

## 每次回合的目标上下文

每个具有激活目标的用户/聊天回合都包含这一用户角色上下文行：

```text
活跃目标：<目标> — 推进目标；保持激活状态，直到目标完全实现；只有在连续 3 个回合遇到同一阻碍后才暂停；执行 update_goal 后，提供所请求的可见最终结果。
```

OpenClaw 通过截断较长的目标来保持这一行的简洁。已暂停、已阻塞、受预算限制、受用量限制以及已完成的目标不会被注入，因此，操作员的停止指令会一直生效，直到该目标恢复为止。

## 控制 UI

Web 控制 UI 会在聊天输入框上方以紧凑的胶囊形式显示目标：
一个状态图标、状态标签（例如 `Pursuing goal`）、截断后的
目标，以及实时经过的计时器。

该胶囊带有内联控制：

- **铅笔** 会预填充输入框为 `/goal edit <objective>`，以便
  可以改写目标并提交。
- **暂停 / 恢复** 会根据当前状态在 `/goal pause` 和 `/goal resume` 之间切换。
- **垃圾桶** 会发送 `/goal clear`。
- **下拉箭头** 会展开胶囊，显示完整目标、最新状态
  注释、token 使用量和经过时间。

当输入框无法发送时（例如
网关连接断开），这些操作按钮会隐藏；展开箭头仍然可用。

## TUI

TUI 页脚会在 token/模式指示器之前，将当前会话的目标显示在 agent、session 和 model 字段旁边。

页脚示例：

- `Pursuing goal (12k/50k)` 表示带有 token 预算的活动目标。
- `Goal paused (/goal resume)` 表示已暂停的目标。
- `Goal blocked (/goal resume)` 表示已阻塞的目标。
- `Goal hit usage limits (/goal resume)` 表示受使用量限制的目标。
- `Goal unmet (50k/50k)` 表示受预算限制的目标。
- `Goal achieved (42k)` 表示已完成的目标。

页脚刻意保持紧凑。请使用 `/goal` 查看完整目标、
说明、token 预算以及可用命令。

## 通道行为

`/goal` 可在支持命令的 OpenClaw 会话中使用，包括允许文本命令的 TUI 和聊天界面。目标状态附加在会话密钥上，而不是传输通道上，因此共享同一会话密钥的两个界面会看到相同的目标。

目标状态不是投递指令：它不会强制通过某个通道回复，不会改变队列行为，不会批准工具，也不会安排工作。

## 故障排查

| 消息                                   | 含义                                                                                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `Goal error: goal already exists`      | 会话中已经存在一个目标。使用 `/goal` 查看它，如果已完成则使用 `/goal complete`，或者在开始不同目标之前使用 `/goal clear`。 |
| `Goal error: goal not found`           | 会话中还没有目标。使用 `/goal start <objective>` 开始一个目标。                                                                       |
| `Goal error: goal is already complete` | 该目标已终止。在开始或恢复另一个目标之前，请先清除它。                                                                |

如果令牌用量显示为 `0` 或看起来是旧的，则当前活动会话可能还没有
新的令牌快照。随着 OpenClaw 记录会话使用情况和基于转录的总计，使用量会刷新。

## 相关内容

- [斜杠命令](/tools/slash-commands)
- [TUI](/web/tui)
- [会话工具](/concepts/session-tool)
- [压缩](/concepts/compaction)
- [任务流](/automation/taskflow)
- [常设命令](/automation/standing-orders)。
