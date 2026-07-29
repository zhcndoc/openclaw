---
summary: "用于 `openclaw commitments` 的 CLI 参考（检查并忽略推断的后续项）"
read_when:
  - 你想检查推断的后续承诺
  - 你想忽略待处理的检查项
  - 你正在审核 heartbeat 可能交付的内容
title: "`openclaw commitments`"
---

检查并忽略已退役的推断承诺实验留下的记录。
OpenClaw 现在不再创建或交付新的承诺，但仍保留该维护
命令，以便升级时可以审核并清理现有的 SQLite 行。

在没有子命令的情况下，`openclaw commitments` 会列出待处理的承诺。

## 用法

```bash
openclaw commitments [--all] [--agent <id>] [--status <status>] [--json]
openclaw commitments list [--all] [--agent <id>] [--status <status>] [--json]
openclaw commitments dismiss <id...> [--json]
```

## 选项

- `--all`：显示所有状态，而不是仅显示待处理的承诺。
- `--agent <id>`：筛选到某个 agent id。
- `--status <status>`：按状态筛选。可选值：`pending`、`sent`、
  `dismissed`、`snoozed` 或 `expired`。未知值将以错误退出。
  `snoozed` 状态是保留状态：当前没有内置流程会将某个
  承诺置为 snoozed；snoozed 记录只会在从旧状态导入时出现。
- `--json`：输出机器可读的 JSON。

`dismiss` 将给定的承诺 id 标记为 `dismissed`。

## 示例

列出待处理的承诺：

```bash
openclaw commitments
```

列出所有已存储的承诺：

```bash
openclaw commitments --all
```

筛选到某个代理：

```bash
openclaw commitments --agent main
```

按状态筛选：

```bash
openclaw commitments --status dismissed
```

忽略一个或多个承诺：

```bash
openclaw commitments dismiss cm_abc123 cm_def456
```

导出为 JSON：

```bash
openclaw commitments --all --json
```

## 输出

文本输出会打印承诺数量、共享 SQLite 数据库路径、任何活动过滤器，
以及每条承诺对应的一行：

- 承诺 ID
- 状态
- 类型（`event_check_in`、`deadline_check`、`care_check_in` 或 `open_loop`）
- 最早截止时间
- 范围（agent/channel/target）
- 建议的签到文本

JSON 输出包括数量、活动状态和代理过滤器、
共享 SQLite 数据库路径，以及完整的存储记录。

## 相关内容

- [推断的承诺](/concepts/commitments)
- [记忆概览](/concepts/memory)
- [心跳](/gateway/heartbeat)
- [计划任务](/automation/cron-jobs)
