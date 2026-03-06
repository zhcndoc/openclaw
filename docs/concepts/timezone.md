---
summary: "代理、信封和提示的时区处理"
read_when:
  - 你需要了解模型时间戳的标准化方式
  - 配置系统提示的用户时区
title: "时区"
---

# 时区

OpenClaw 标准化时间戳，使模型看到一个 **统一的参考时间**。

## 消息信封（默认本地时间）

入站消息被包装在如下信封中：

```
[Provider ... 2026-01-05 16:26 PST] message text
```

信封中的时间戳默认为**主机本地时间**，精确到分钟。

你可以通过以下配置覆盖默认设置：

```json5
{
  agents: {
    defaults: {
      envelopeTimezone: "local", // "utc" | "local" | "user" | IANA 时区
      envelopeTimestamp: "on", // "on" | "off"
      envelopeElapsed: "on", // "on" | "off"
    },
  },
}
```

- `envelopeTimezone: "utc"` 使用 UTC 时间。
- `envelopeTimezone: "user"` 使用 `agents.defaults.userTimezone`（如果未设置则回退到主机时区）。
- 使用明确的 IANA 时区（例如 `"Europe/Vienna"`）表示固定时区偏移。
- `envelopeTimestamp: "off"` 移除信封头的绝对时间戳。
- `envelopeElapsed: "off"` 移除经过时间后缀（例如 `+2m` 样式）。

### 示例

**本地（默认）：**

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

## 工具负载（原始提供者数据 + 规范化字段）

工具调用（`channels.discord.readMessages`、`channels.slack.readMessages` 等）返回**原始提供者时间戳**。
我们还附加了规范化字段以保持一致性：

- `timestampMs`（UTC 纪元毫秒数）
- `timestampUtc`（ISO 8601 UTC 字符串）

原始提供者字段得到保留。

## 系统提示的用户时区

设置 `agents.defaults.userTimezone` 告诉模型用户的本地时区。如果未设置，OpenClaw 会在运行时解析**主机时区**（无需写配置）。

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

系统提示包含：

- 带有本地时间和时区的 `当前日期和时间` 部分
- `时间格式：12小时制` 或 `24小时制`

你可以通过 `agents.defaults.timeFormat` (`auto` | `12` | `24`) 控制提示格式。

完整行为和示例请参阅 [日期和时间](/date-time)。
