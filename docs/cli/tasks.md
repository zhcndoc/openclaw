---
summary: "CLI 参考：`openclaw tasks`（后台任务账本和 Task Flow 状态）"
read_when:
  - 你想检查、审计或取消后台任务记录
  - 你正在编写 `openclaw tasks flow` 下的 Task Flow 命令文档
title: "`openclaw tasks`"
---

检查持久化的后台任务和 Task Flow 状态。若不指定子命令，
`openclaw tasks` 等同于 `openclaw tasks list`。

有关生命周期和交付模型，请参见 [后台任务](/automation/tasks)。

## 用法

```bash
openclaw tasks
openclaw tasks list
openclaw tasks list --runtime acp
openclaw tasks list --status running
openclaw tasks show <lookup>
openclaw tasks notify <lookup> state_changes
openclaw tasks cancel <lookup>
openclaw tasks audit
openclaw tasks maintenance
openclaw tasks maintenance --apply
openclaw tasks flow list
openclaw tasks flow show <lookup>
openclaw tasks flow cancel <lookup>
```

## 根选项

- `--json`：输出 JSON。
- `--runtime <name>`：按类型筛选：`subagent`、`acp`、`cron` 或 `cli`。
- `--status <name>`：按状态筛选：`queued`、`running`、`succeeded`、`failed`、`timed_out`、`cancelled` 或 `lost`。

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

### `audit`

```bash
openclaw tasks audit [--severity <warn|error>] [--code <name>] [--limit <n>] [--json]
```

显示过期、丢失、传递失败或其他不一致的任务和 Task Flow 记录。保留到 `cleanupAfter` 的丢失任务会作为警告；已过期或未加时间戳的丢失任务会作为错误。

### `maintenance`

```bash
openclaw tasks maintenance [--apply] [--json]
```

预览或应用任务和 Task Flow 的协调修复、清理标记、修剪，
以及过期 cron 运行会话注册表清理。
对于 cron 任务，协调会在将
旧的活动任务标记为 `lost` 之前使用持久化运行日志/作业状态，因此已完成的 cron 运行不会仅仅因为内存中的 Gateway 运行时状态消失就变成错误的审计错误。离线 CLI 审计对 Gateway 进程本地的 cron 活动作业集合不具权威性。带有运行 ID/源 ID 的 CLI 任务在其实时 Gateway 运行上下文消失时会被标记为 `lost`，即使旧的子会话行仍然存在。
在应用时，维护还会修剪 7 天以上的 `cron:<jobId>:run:<uuid>` 会话注册表
行，同时保留当前正在运行的 cron 作业，并保持非 cron 会话行不变。

### `flow`

```bash
openclaw tasks flow list [--status <name>] [--json]
openclaw tasks flow show <lookup> [--json]
openclaw tasks flow cancel <lookup>
```

检查或取消任务账本下持久化的 Task Flow 状态。

## 相关内容

- [CLI 参考](/cli)
- [后台任务](/automation/tasks)
