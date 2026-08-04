---
summary: "CLI 参考：`openclaw tasks`（后台任务账本和 Task Flow 状态）"
read_when:
  - 你想检查、审计或取消后台任务记录
  - 你正在编写 `openclaw tasks flow` 下的 Task Flow 命令文档
title: "`openclaw tasks`"
---

检查持久化的后台任务和 Task Flow 状态。若不指定子命令，
`openclaw tasks` 等同于 `openclaw tasks list`。

参见 [后台任务](/automation/tasks) 了解生命周期和投递
模型，以及其 `tasks audit` 章节以获取完整的问题描述。

## 用法

```bash
openclaw tasks
openclaw tasks list
openclaw tasks list --runtime acp
openclaw tasks list --status running
openclaw tasks show <lookup>
openclaw tasks notify <lookup> state_changes
openclaw tasks cancel <lookup>
openclaw tasks retry <lookup> [lookup...]
openclaw tasks dismiss <lookup> [lookup...]
openclaw tasks audit
openclaw tasks maintenance
openclaw tasks maintenance --apply
openclaw tasks flow list
openclaw tasks flow show <lookup>
openclaw tasks flow cancel <lookup>
```

## 根选项

| 标志               | 描述                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| `--json`           | 输出 JSON。                                                                                       |
| `--runtime <name>` | 按类型筛选：`subagent`、`acp`、`cron` 或 `cli`。                                               |
| `--status <name>`  | 按状态筛选：`queued`、`running`、`succeeded`、`failed`、`timed_out`、`cancelled` 或 `lost`。 |

## 子命令

### `list`

```bash
openclaw tasks list [--runtime <name>] [--status <name>] [--json]
```

按最新优先列出已跟踪的后台任务。

### `show`

```bash
openclaw tasks show <lookup> [--json]
```

通过任务 ID、运行 ID 或会话键显示一个任务。

### `notify`

```bash
openclaw tasks notify <lookup> <done_only|state_changes|silent>
```

更改正在运行任务的通知策略。

### `cancel`

```bash
openclaw tasks cancel <lookup>
```

取消正在运行的后台任务。

### `retry`

```bash
openclaw tasks retry <lookup> [lookup...]
```

重试 1-10 个被阻塞的子代理完成结果投递。子任务执行仍保持成功状态；重试会基于保留的规范结果创建一个隔离的投递代次。较早且存在歧义的确认仍可能导致可见结果重复。

### `dismiss`

```bash
openclaw tasks dismiss <lookup> [lookup...]
```

记录 1-10 个被阻塞的子代理完成结果的有意不投递。任务会继续显示被阻塞的终止结果，并保留其结果，直到 7 天的完成结果保留期限结束。

### `audit`

```bash
openclaw tasks audit [--severity <warn|error>] [--code <name>] [--limit <n>] [--json]
```

显示过期、丢失、投递失败或其他不一致的任务和
Task Flow 记录。保留到 `cleanupAfter` 的丢失任务属于警告；
已过期或未打时间戳的丢失任务属于错误。

`--code` 接受任务代码（`stale_queued`、`stale_running`、`lost`、
`delivery_failed`、`missing_cleanup`、`inconsistent_timestamps`）和 Task
Flow 代码（`restore_failed`、`stale_waiting`、`stale_blocked`、
`cancel_stuck`、`missing_linked_tasks`、`blocked_task_missing`）。参见
[后台任务](/automation/tasks) 了解每个代码的严重级别和触发详情。

### `maintenance`

```bash
openclaw tasks maintenance [--apply] [--json]
```

预览或应用任务与 Task Flow 的协调修复、清理标记、
修剪，以及过期 cron 运行会话注册表的清理。

对于 cron 任务，在将旧的活跃任务标记为 `lost` 之前，
协调会先使用持久化的运行日志/作业状态，因此已完成的 cron 运行不会
仅仅因为内存中的 Gateway 运行时状态消失而成为错误的审计项。
离线 CLI 审计并不是 Gateway 进程内 cron 活跃作业集合的权威来源。
对于带有运行 ID/源 ID 的 CLI 任务，当其活动 Gateway 运行上下文消失时，
即使旧的子会话行仍然存在，也会被标记为 `lost`。

应用后，maintenance 还会修剪 7 天前的 `cron:<jobId>:run:<uuid>` 会话注册表行，
同时保留当前正在运行的 cron 作业，并且不影响非 cron 会话行。

### `flow`

```bash
openclaw tasks flow list [--status <name>] [--json]
openclaw tasks flow show <lookup> [--json]
openclaw tasks flow cancel <lookup>
```

检查或取消任务账本下持久化的 Task Flow 状态。
`flow list --status` 接受 `queued`、`running`、`waiting`、`blocked`、
`succeeded`、`failed`、`cancelled` 或 `lost`。

## 相关内容

- [CLI 参考](/cli)
- [后台任务](/automation/tasks)
