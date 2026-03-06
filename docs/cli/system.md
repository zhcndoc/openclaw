---
summary: "`openclaw system` 的命令行参考（系统事件、心跳、存在状态）"
read_when:
  - 你想要在不创建定时任务的情况下入列系统事件
  - 你需要启用或禁用心跳
  - 你想检查系统存在条目
title: "system"
---

# `openclaw system`

网关的系统级辅助命令：入列系统事件，控制心跳，并查看存在状态。

## 常用命令

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
openclaw system heartbeat enable
openclaw system heartbeat last
openclaw system presence
```

## `system event`

在 **main** 会话中入列一个系统事件。下一次心跳时，该事件将作为提示行中的 `System:` 行注入。使用 `--mode now` 立即触发心跳；使用 `next-heartbeat` 则等待下一次预定的心跳。

参数：

- `--text <text>`：必需，系统事件文本。
- `--mode <mode>`：`now` 或 `next-heartbeat`（默认）。
- `--json`：机器可读的输出格式。

## `system heartbeat last|enable|disable`

心跳控制：

- `last`：显示上一个心跳事件。
- `enable`：重新启用心跳（如果之前被禁用）。
- `disable`：暂停心跳。

参数：

- `--json`：机器可读的输出格式。

## `system presence`

列出网关当前已知的系统存在条目（节点、实例及类似状态行）。

参数：

- `--json`：机器可读的输出格式。

## 备注

- 需要有一个可通过当前配置（本地或远程）访问的运行中的网关。
- 系统事件是短暂的，重启后不会保存。
