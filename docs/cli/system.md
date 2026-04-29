---
summary: "`openclaw system` 的 CLI 参考（系统事件、心跳、存在状态）"
read_when:
  - 你想在不创建 cron 作业的情况下排队一个系统事件
  - 你需要启用或禁用心跳
  - 你想检查系统存在状态条目
title: "系统"
---

# `openclaw system`

用于 Gateway 的系统级辅助工具：排队系统事件、控制心跳，
以及查看存在状态。

所有 `system` 子命令都使用 Gateway RPC，并接受共享的客户端标志：

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

在 **main** 会话上排队一个系统事件。下一次心跳会将其作为
一行 `System:` 注入到提示中。使用 `--mode now` 可立即触发心跳；
`next-heartbeat` 会等待下一次计划中的触发。

标志：

- `--text <text>`：必需的系统事件文本。
- `--mode <mode>`：`now` 或 `next-heartbeat`（默认）。
- `--json`：机器可读输出。
- `--url`、`--token`、`--timeout`、`--expect-final`：共享的 Gateway RPC 标志。

## `system heartbeat last|enable|disable`

心跳控制：

- `last`：显示上一次心跳事件。
- `enable`：重新开启心跳（如果之前已禁用，请使用此项）。
- `disable`：暂停心跳。

标志：

- `--json`：机器可读输出。
- `--url`、`--token`、`--timeout`、`--expect-final`：共享的 Gateway RPC 标志。

## `system presence`

列出 Gateway 当前已知的系统存在状态条目（节点、
实例以及类似的状态行）。

标志：

- `--json`：机器可读输出。
- `--url`、`--token`、`--timeout`、`--expect-final`：共享的 Gateway RPC 标志。

## 注意

- 需要一个正在运行且当前配置可访问的 Gateway（本地或远程）。
- 系统事件是临时性的，不会在重启后持久保存。

## 相关

- [CLI reference](/cli)
