---
summary: "重定向：flow 命令位于 `openclaw tasks flow` 下"
read_when:
  - 你在较旧的文档或发布说明中遇到 `openclaw flows`
  - 你想要一个快速的 TaskFlow 检查参考
title: "流程（重定向）"
---

# `openclaw tasks flow`

没有顶级的 `openclaw flows` 命令。持久化 TaskFlow 检查位于 `openclaw tasks flow` 下。

## 子命令

```bash
openclaw tasks flow list   [--json] [--status <name>]
openclaw tasks flow show   <lookup> [--json]
openclaw tasks flow cancel <lookup>
```

| 子命令 | 描述                     | 参数 / 选项                                                                          |
| ------ | ------------------------ | ------------------------------------------------------------------------------------- |
| `list`     | 列出受跟踪的 TaskFlow。    | `--json` 机器可读输出；`--status <name>` 过滤（见下方状态值）。 |
| `show`     | 显示一个 TaskFlow。         | `<lookup>` flow id 或 owner key；`--json` 机器可读输出。                    |
| `cancel`   | 取消正在运行的 TaskFlow。 | `<lookup>` flow id 或 owner key。                                                      |

`<lookup>` 可以是 flow id（由 `list` / `show` 返回）或该 flow 的 owner key（拥有该 flow 的子系统用于跟踪该 flow 的稳定标识符）。

### 状态过滤值

`--status` 在 `list` 上接受以下值之一：`queued`、`running`、`waiting`、`blocked`、`succeeded`、`failed`、`cancelled`、`lost`。

## 示例

```bash
openclaw tasks flow list
openclaw tasks flow list --status running
openclaw tasks flow list --json
openclaw tasks flow show flow_abc123
openclaw tasks flow show flow_abc123 --json
openclaw tasks flow cancel flow_abc123
```

有关 TaskFlow 概念和编写，请参见 [TaskFlow](/automation/taskflow)。有关父级 `tasks` 命令，请参见 [tasks CLI 参考](/cli/tasks)。

## 相关

- [CLI 参考](/cli)
- [自动化](/automation)
- [TaskFlow](/automation/taskflow)
