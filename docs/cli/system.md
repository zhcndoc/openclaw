---
summary: "`openclaw system` 的 CLI 参考（系统事件、心跳、存在状态）"
read_when:
  - "你想在不创建 cron 作业的情况下排队一个系统事件"
  - "你需要启用或禁用心跳"
  - "你想检查系统存在状态条目"
title: "系统"
---

# `openclaw system`

适用于 Gateway 的系统级辅助工具：排队系统事件、控制心跳，并查看存在状态。

所有 `system` 子命令都使用 Gateway RPC，并接受共享的客户端标志：

| 标志                    | 默认值                              | 描述                                                                                                                                                                                            |
| ----------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--url <url>`           | 配置时为 `gateway.remote.url` | 网关 WebSocket URL。                                                                                                                                                                                 |
| `--port <port>`         | 无                                 | 本地网关端口。                                                                                                                                                                                    |
| `--token <token>`       | 无                                 | 网关令牌（如果需要）。                                                                                                                                                                           |
| `--password <password>` | 无                                 | 网关密码（如果需要）。                                                                                                                                                                        |
| `--timeout <ms>`        | `30000`                              | RPC 超时（以毫秒为单位）。                                                                                                                                                                           |
| `--expect-final`        | 关闭                                  | 等待最终响应（agent）。                                                                                                                                                                       |
| `--json`                | 关闭                                  | 输出 JSON。`heartbeat last/enable/disable` 和 `system presence` 无论此标志如何都会始终打印原始 RPC JSON 载荷；`system event` 会使用它在 JSON 和纯 `ok` 行之间切换。 |

## <a id="common-commands"></a> 常用命令

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
openclaw system event --text "Check for urgent follow-ups" --url ws://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
openclaw system heartbeat enable
openclaw system heartbeat last
openclaw system presence
```

## `system event`

默认情况下，将系统事件入队到 **main** 会话。下一个心跳会将其作为 `System:` 行注入到提示中。使用 `--mode now` 可立即触发心跳；`next-heartbeat`（默认）则等待下一次计划中的节拍。

传入 `--session-key` 可针对特定会话，例如将异步任务完成结果回传给发起它的频道。

<Note>
**Timing 异常与 `--session-key`：** 提供 `--session-key` 时，`--mode next-heartbeat` 崩溃为立即目标唤醒，而不是等待下一个计划的时钟周期。目标唤醒使用心跳意图 `immediate`，因此它们绕过运行者的未到期门，否则该门将推迟（并有效地丢弃）`event`-intent 唤醒。如果您希望延迟交付，请省略 `--session-key`，以便事件落在主要会话上并在下一个常规心跳中进行。
</Note>

标志：

- `--text <text>`：必填的系统事件文本。
- `--mode <mode>`：`now` 或 `next-heartbeat`（默认）。
- `--session-key <sessionKey>`：可选；针对特定代理会话，而不是该代理的 main 会话。属于已解析代理之外的键会回退到该代理的 main 会话。

## `system heartbeat last|enable|disable`

- `last`: 显示最后一次心跳事件。
- `enable`: 重新开启心跳（如果之前已被禁用，请使用此项）。
- `disable`: 暂停心跳。

## `system presence`

列出网关知道的当前系统存在条目（节点、实例和类似的状态行）。

## <a id="notes"></a> 说明

- 需要一个正在运行且可通过当前配置访问的 Gateway（本地或远程）。
- 系统事件是临时的，不会在重启后持久保存。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
