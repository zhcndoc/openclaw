---
summary: "openclaw tasks 的 CLI 参考（后台任务账本和 Task Flow 状态）"
read_when:
  - 你想检查、审核或取消后台任务记录
  - 你正在编写 `openclaw tasks flow` 下的 Task Flow 命令文档
title: "`openclaw tasks`"
---

检查持久化后台任务和 Task Flow 状态。若不指定子命令，
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

取消一个正在运行的后台任务。

### `audit`

```bash
openclaw tasks audit [--severity <warn|error>] [--code <name>] [--limit <n>] [--json]
```

显示过期、丢失、交付失败或其他不一致的任务和 Task Flow 记录。

### `maintenance`

```bash
openclaw tasks maintenance [--apply] [--json]
```

预览或应用任务和 Task Flow 的协调修复、清理标记和修剪。

### `flow`

```bash
openclaw tasks flow list [--status <name>] [--json]
openclaw tasks flow show <lookup> [--json]
openclaw tasks flow cancel <lookup>
```

检查或取消任务账本下的持久化 Task Flow 状态。

## 相关内容

- [CLI 参考](/cli)
- [后台任务](/automation/tasks)
