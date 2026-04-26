---
summary: "`openclaw system` 的命令行参考（系统事件、心跳、存在状态）"
read_when:
  - 你想在不创建 cron 作业的情况下入列一个系统事件
  - 你需要启用或禁用心跳
  - 你想检查系统存在条目
title: "System"
---

# `openclaw system`

网关的系统级辅助命令：入列系统事件，控制心跳，并查看存在状态。

所有 `system` 子命令均使用 Gateway RPC 并接受共享客户端标志：

- `--url <url>`
- `--token <token>`
- `--timeout <ms>`
- `--expect-final`

## 常用命令

```bash
openclaw system event --text "检查紧急跟进事项" --mode now
openclaw system event --text "检查紧急跟进事项" --url ws://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
openclaw system heartbeat enable
openclaw system heartbeat last
openclaw system presence
```

## `system event`

在 **main** 会话中入列一个系统事件。下一次心跳时，该事件将作为提示行中的 `System:` 行注入。使用 `--mode now` 立即触发心跳；使用 `next-heartbeat` 则等待下一次预定的心跳。

参数：

- `--text <text>`：必需的系统事件文本。
- `--mode <mode>`：`now` 或 `next-heartbeat`（默认）。
- `--json`：机器可读的输出。
- `--url`, `--token`, `--timeout`, `--expect-final`：共享 Gateway RPC 标志。

## `system heartbeat last|enable|disable`

心跳控制：

- `last`：显示上一个心跳事件。
- `enable`：重新启用心跳（如果之前被禁用）。
- `disable`：暂停心跳。

参数：

- `--json`：机器可读的输出。
- `--url`, `--token`, `--timeout`, `--expect-final`：共享 Gateway RPC 标志。

## `system presence`

列出网关当前已知的系统存在条目（节点、实例及类似状态行）。

参数：

- `--json`：机器可读的输出。
- `--url`, `--token`, `--timeout`, `--expect-final`：共享 Gateway RPC 标志。

## 备注

- 需要一个当前配置可访问的正在运行的 Gateway（本地或远程）。
- 系统事件是临时性的，不会在重启后保留。

## 相关内容

- [CLI reference](/cli)
