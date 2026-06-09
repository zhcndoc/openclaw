---
summary: "OpenClaw 中时区的出现位置——信封、工具载荷、系统提示词"
read_when:
  - 你想快速了解时区处理的心智模型
  - 你正在决定在哪里设置或覆盖时区
title: "时区"
---

OpenClaw 将时间戳标准化，使模型看到的是一个**单一参考时间**，而不是来自不同提供方本地时钟的混合。时区会出现在三个位置，每个位置都有其各自的用途：

## 三个时区位置

| Surface           | 它显示什么                                                                                              | 默认值                                | 通过以下方式配置                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------- |
| Message envelopes | 包装传入的频道消息：`[Signal +1555 Sun 2026-01-18 00:19:42 PST] hello`                               | 主机本地时区                          | `agents.defaults.envelopeTimezone`                    |
| Tool payloads     | 频道 `readMessages` 风格的工具会返回原始提供方时间 + 归一化的 `timestampMs` / `timestampUtc`         | 始终包含 UTC 字段                     | 不可配置——保留提供方原生时间戳                       |
| System prompt     | 一个小型 `Current Date & Time` 块，仅包含**时区**（不含具体时钟值，以保持缓存稳定）                   | 若未设置 `userTimezone`，则使用主机时区 | `agents.defaults.userTimezone`                        |

系统提示词有意省略实时钟表，以便在多轮对话中保持提示词缓存稳定。当代理需要当前时间时，它会调用 `session_status`。

## 设置用户时区

```json5
{
  agents: {
    defaults: {
      userTimezone: "America/Chicago",
    },
  },
}
```

如果未设置 `userTimezone`，OpenClaw 会在运行时解析主机时区（不会写入配置）。`agents.defaults.timeFormat`（`auto` | `12` | `24`）控制信封和下游表面中的 12 小时/24 小时制渲染，而不是系统提示词部分。

## 何时覆盖

- **使用 UTC 信封**（`envelopeTimezone: "utc"`），当你希望不同地区主机上的时间戳保持稳定，或者希望与诊断输出一致的 UTC 对齐日志时。
- **使用固定的 IANA 时区**（例如 `"Europe/Vienna"`），当网关主机位于一个时区而用户位于另一个时区，并且你希望信封始终按用户所在时区显示，而不受主机迁移影响时。
- **设置 `envelopeTimestamp: "off"`**，用于低 token 的信封，当时间戳上下文对对话没有帮助时。

有关完整行为参考、按提供方的示例以及耗时格式化，请参见 [日期与时间](/date-time)。

## 相关内容

- [日期与时间](/date-time) — 完整的信封/工具/提示词行为和示例。
- [Heartbeat](/gateway/heartbeat) — 活动小时使用时区进行调度。
- [Cron Jobs](/automation/cron-jobs) — cron 表达式使用时区进行调度。
