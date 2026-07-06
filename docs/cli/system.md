---
summary: "`openclaw system` 的 CLI 参考（系统事件、心跳、存在状态）"
read_when:
  - 你想在不创建 cron 作业的情况下排队一个系统事件
  - 你需要启用或禁用心跳
  - 你想检查系统存在状态条目
title: "系统"
---

# `openclaw system`

适用于 Gateway 的系统级辅助工具：排队系统事件、控制心跳，并查看存在状态。

所有 `system` 子命令都使用 Gateway RPC，并接受共享的客户端标志：

| Flag              | Default                              | Description                                                                                                                                                                                            |
| ----------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--url <url>`     | `gateway.remote.url` when configured | Gateway WebSocket URL.                                                                                                                                                                                 |
| `--token <token>` | none                                 | Gateway token (if required).                                                                                                                                                                           |
| `--timeout <ms>`  | `30000`                              | RPC timeout in milliseconds.                                                                                                                                                                           |
| `--expect-final`  | off                                  | 等待最终响应（agent）。                                                                                                                                                                                 |
| `--json`          | off                                  | 输出 JSON。`heartbeat last/enable/disable` 和 `system presence` 无论此标志如何都会始终打印原始 RPC JSON 载荷；`system event` 会使用它在 JSON 和纯 `ok` 行之间切换。 |

## 常用命令

```bash
openclaw system event --text "检查紧急跟进事项" --mode now
openclaw system event --text "检查紧急跟进事项" --url ws://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
openclaw system heartbeat enable
openclaw system heartbeat last
openclaw system presence
```

## `system event`

默认情况下，将系统事件入队到 **main** 会话。下一个心跳会将其作为 `System:` 行注入到提示中。使用 `--mode now` 可立即触发心跳；`next-heartbeat`（默认）则等待下一次计划中的节拍。

传入 `--session-key` 可针对特定会话，例如将异步任务完成结果回传给发起它的频道。

<Note>
**`--session-key` 的时序例外：** 当提供了 `--session-key` 时，`--mode next-heartbeat` 会退化为立即定向唤醒，而不是等待下一次计划中的节拍。定向唤醒使用心跳意图 `immediate`，因此会绕过运行器的未到期门禁；否则该门禁会延迟（并实际上丢弃）一个 `event` 意图的唤醒。若你希望延迟投递，请省略 `--session-key`，这样事件会落到 main 会话上，并随下一次常规心跳送达。
</Note>

标志：

- `--text <text>`：必填的系统事件文本。
- `--mode <mode>`：`now` 或 `next-heartbeat`（默认）。
- `--session-key <sessionKey>`：可选；针对特定代理会话，而不是该代理的 main 会话。属于已解析代理之外的键会回退到该代理的 main 会话。

## `系统心跳 last|enable|disable`

- `last`: 显示最后一次心跳事件。
- `enable`: 重新开启心跳（如果之前已被禁用，请使用此项）。
- `disable`: 暂停心跳。

## `system presence`

List the system presence state entries currently known to the Gateway (nodes, instances, and similar state rows).

## 说明

- 需要一个正在运行且可通过当前配置访问的 Gateway（本地或
  远程）。
- 系统事件是临时的，不会在重启后持久保存。

## 相关

- [CLI 参考](/cli)
