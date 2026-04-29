---
summary: "用于代理、信封和提示词的时区处理"
read_when:
  - 你需要了解时间戳如何被规范化以供模型使用
  - 为系统提示词配置用户时区
title: "时区"
---

OpenClaw 会标准化时间戳，使模型看到**单一参考时间**。

## 消息信封（默认使用本地时区）

传入消息会被包装在如下信封中：

```
[Provider ... 2026-01-05 16:26 PST] message text
```

信封中的时间戳默认使用**主机本地时区**，精确到分钟。

你可以通过以下方式覆盖：

```json5
{
  agents: {
    defaults: {
      envelopeTimezone: "local", // "utc" | "local" | "user" | IANA timezone
      envelopeTimestamp: "on", // "on" | "off"
      envelopeElapsed: "on", // "on" | "off"
    },
  },
}
```

- `envelopeTimezone: "utc"` 使用 UTC。
- `envelopeTimezone: "user"` 使用 `agents.defaults.userTimezone`（若未设置则回退到主机时区）。
- 使用明确的 IANA 时区（例如 `"Europe/Vienna"`）来指定固定偏移。
- `envelopeTimestamp: "off"` 会从信封头中移除绝对时间戳。
- `envelopeElapsed: "off"` 会移除经过时间后缀（如 `+2m` 这种格式）。

### 示例

**本地时区（默认）：**

```
[Signal Alice +1555 2026-01-18 00:19 PST] hello
```

**固定时区：**

```
[Signal Alice +1555 2026-01-18 06:19 GMT+1] hello
```

**经过时间：**

```
[Signal Alice +1555 +2m 2026-01-18T05:19Z] follow-up
```

## 工具负载（原始提供方数据 + 规范化字段）

工具调用（`channels.discord.readMessages`、`channels.slack.readMessages` 等）会返回**原始提供方时间戳**。
我们还会附加规范化字段以保持一致性：

- `timestampMs`（UTC 自纪元以来的毫秒数）
- `timestampUtc`（ISO 8601 UTC 字符串）

原始提供方字段会被保留。

## 系统提示词中的用户时区

设置 `agents.defaults.userTimezone` 以告诉模型用户的本地时区。如果未设置，OpenClaw 会在运行时解析**主机时区**（不会写入配置）。

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

系统提示词包含：

- `Current Date & Time` 部分，显示本地时间和时区
- `Time format: 12-hour` 或 `24-hour`

你可以使用 `agents.defaults.timeFormat`（`auto` | `12` | `24`）来控制提示词格式。

有关完整行为和示例，请参见 [Date & Time](/date-time)。

## 相关内容

- [Heartbeat](/gateway/heartbeat) — 活动时间使用时区进行调度
- [Cron Jobs](/automation/cron-jobs) — cron 表达式使用时区进行调度
- [Date & Time](/date-time) — 完整的日期/时间行为和示例
