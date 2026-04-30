---
summary: "用于 `openclaw commitments` 的 CLI 参考（检查并忽略推断的后续项）"
read_when:
  - 你想检查推断的后续承诺
  - 你想忽略待处理的检查项
  - 你正在审核 heartbeat 可能交付的内容
title: "`openclaw commitments`"
---

列出并管理推断的后续承诺。

承诺是可选启用、短暂存在的后续记忆，由对话上下文创建。有关概念性指南，请参见 [推断的承诺](/concepts/commitments)。

在没有子命令的情况下，`openclaw commitments` 会列出待处理的承诺。

## 用法

```bash
openclaw commitments [--all] [--agent <id>] [--status <status>] [--json]
openclaw commitments list [--all] [--agent <id>] [--status <status>] [--json]
openclaw commitments dismiss <id...> [--json]
```

## 选项

- `--all`：显示所有状态，而不仅仅是待处理的承诺。
- `--agent <id>`：筛选到某个代理 id。
- `--status <status>`：按状态筛选。取值：`pending`、`sent`、
  `dismissed`、`snoozed` 或 `expired`。
- `--json`：输出机器可读的 JSON。

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

文本输出包括：

- 承诺 id
- 状态
- 类型
- 最早到期时间
- 作用域
- 建议的检查文本

JSON 输出还包括承诺存储路径和完整的已存储记录。

## 相关内容

- [推断的承诺](/concepts/commitments)
- [记忆概览](/concepts/memory)
- [Heartbeat](/gateway/heartbeat)
- [计划任务](/automation/cron-jobs)
