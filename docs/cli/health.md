---
summary: "openclaw health 的 CLI 参考（通过 RPC 获取网关健康快照）"
read_when:
  - 你想快速检查正在运行的 Gateway 的健康状态
title: "健康"
---

# `openclaw health`

通过 WebSocket RPC 从正在运行的 Gateway 获取健康快照（CLI 不直接使用通道套接字）。

## 选项

| Flag             | Default | Description                                                                       |
| ---------------- | ------- | --------------------------------------------------------------------------------- |
| `--json`         | `false` | 打印机器可读的 JSON，而不是文本。                                      |
| `--timeout <ms>` | `10000` | 以毫秒为单位的连接超时时间。                                               |
| `--verbose`      | `false` | 强制进行实时探测，并在所有已配置的账户和代理上展开输出。 |
| `--debug`        | `false` | `--verbose` 的别名。                                                            |

示例：

```bash
openclaw health
openclaw health --json
openclaw health --timeout 2500
openclaw health --verbose
openclaw health --debug
```

## 行为

- 不使用 `--verbose` 时，Gateway 可以返回一个缓存快照（在最多 60 秒内保持新鲜，且与实时通道运行时状态一致），并在后台刷新，以便下一个调用者使用。
- `--verbose` 会强制进行实时探测（按通道账户探测），打印 Gateway 连接详细信息，并将可读输出扩展到所有已配置的账户和代理，而不仅仅是默认代理。
- `--json` 始终返回完整快照：通道、按账户探测、插件加载状态、上下文引擎隔离状态、模型定价缓存状态、事件循环健康状态、投递队列死信，以及每个代理的会话存储。
- 当出站投递或入站通道事件进入死信时，文本输出会报告它们的数量和最早失败时长。入站数量按通道账户分组；可使用 [`openclaw channels dead-letters`](/cli/channels#inbound-dead-letters) 检查或恢复单个事件。

## 相关

- [CLI 参考](/cli)
- [`openclaw status`](/cli/status) — 无需完整健康快照的本地诊断和通道探测
- [网关健康状态](/gateway/health)
