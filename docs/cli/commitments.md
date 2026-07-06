---
summary: "用于 `openclaw commitments` 的 CLI 参考（检查并忽略推断的后续项）"
read_when:
  - 你想检查推断的后续承诺
  - 你想忽略待处理的检查项
  - 你正在审核 heartbeat 可能交付的内容
title: "`openclaw commitments`"
---

列出并管理推断的后续承诺。

承诺是可选启用的（`commitments.enabled`），是由对话上下文创建并由 heartbeat 交付的短期后续记忆。
参见
[推断的承诺](/concepts/commitments) 了解概念指南和配置。

在没有子命令的情况下，`openclaw commitments` 会列出待处理的承诺。

## 用法

```bash
openclaw commitments [--all] [--agent <id>] [--status <status>] [--json]
openclaw commitments list [--all] [--agent <id>] [--status <status>] [--json]
openclaw commitments dismiss <id...> [--json]
```

## 选项

- `--all`: 显示所有状态，而不是仅显示待处理的承诺。
- `--agent <id>`: 过滤到某个 agent id。
- `--status <status>`: 按状态过滤。可选值：`pending`、`sent`、
  `dismissed`、`snoozed` 或 `expired`。未知值将以错误退出。
- `--json`: 输出机器可读的 JSON。

`dismiss` 会将给定的承诺 id 标记为 `dismissed`，因此 heartbeat 不会
投递它们。

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

查找已延后处理的承诺：

```bash
openclaw commitments --status snoozed
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

文本输出会打印承诺数量、存储路径、任何活动过滤器，
以及每条承诺一行：

- 承诺 ID
- 状态
- 类型（`event_check_in`、`deadline_check`、`care_check_in` 或 `open_loop`）
- 最早截止时间
- 范围（agent/channel/target）
- 建议的签到文本

JSON 输出包含数量、活动状态和 agent 过滤器、
承诺存储路径，以及完整的存储记录。

## 相关内容

- [推断的承诺](/concepts/commitments)
- [记忆概览](/concepts/memory)
- [Heartbeat](/gateway/heartbeat)
- [计划任务](/automation/cron-jobs)
