---
summary: "OpenClaw 中显示时区的位置 — 信封、工具负载、运行时上下文"
read_when:
  - "你想快速了解时区处理的心智模型"
  - "你正在决定在哪里设置或覆盖时区"
title: "时区"
---

OpenClaw 将时间戳标准化，使模型看到的是一个 **单一参考时间**，而不是混杂的提供方本地时钟。时区会出现在三个位置上，各自有不同的用途：

## <a id="three-timezone-surfaces"></a> 三个时区位置

| 表面           | 显示内容                                                                                              | 默认值                               | 配置方式                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------ |
| 留言信封 | 包装入站通道消息：`[Signal +1555 Sun 2026-01-18 00:19:42 PST] hello`                         | 主机时区（如果 `userTimezone` 未设置） | `agents.defaults.userTimezone`                         |
| 工具有效载荷     | 通道 `readMessages`-style 工具返回原始提供商时间加上标准化 `timestampMs` / `timestampUtc` | UTC 字段始终存在             | 不可配置；保留提供者本机时间戳 |
| 运行时上下文   | 每回合 `Temporal Context` 块，包含本地日期和时区；准确的时间仍然有工具支持      | 主机时区（如果 `userTimezone` 未设置） | `agents.defaults.userTimezone`                         |

日期和区域在系统提示之外的当前回合运行时上下文中行进。日翻转更新该上下文，同时保留完整的系统提示和早期对话字节以供前缀缓存重用。上下文故意省略了实时时钟；当代理需要准确的当前时间并且 `session_status` 可用时，它会调用该工具。

## <a id="setting-the-user-timezone"></a> 设置用户时区

```json5
{
  agents: {
    defaults: {
      userTimezone: "America/Chicago",
    },
  },
}
```

如果未设置 `userTimezone`，OpenClaw 会在运行时通过 `Intl.DateTimeFormat().resolvedOptions().timeZone` 解析主机时区，而不会写入配置。相同的解析时区也会用于消息信封、排队的系统事件、提示词中的本地日期以及心跳活动时段。

时钟显示遵循主机操作系统和区域设置的偏好。没有单独的 12 小时制或 24 小时制配置项。

有关提供程序示例和经过时间格式，请参阅 [Date 和 Time](/date-time)。

## <a id="related"></a> 相关内容

- [Date & Time](/date-time) - 完整的 envelope/tool/prompt 行为和示例。
- [心跳](/gateway/heartbeat) - 活跃时段使用时区进行调度。
- [Cron Jobs](/automation/cron-jobs) - cron 表达式使用时区进行调度。
- [系统提示](/concepts/system-prompt) - 将用户本地日期和时区携带到提示中的临时上下文部分。
