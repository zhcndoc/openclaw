---
summary: "跨信封、提示词、工具和连接器的日期和时间处理"
read_when:
  - 你正在更改时间戳向模型或用户显示的方式
  - 你正在调试消息或系统提示输出中的时间格式
title: "日期和时间"
---

# 日期与时间

OpenClaw 默认对**传输时间戳使用主机本地时间**，并且**仅在系统提示词中使用用户时区**。
会保留提供方时间戳，因此工具可以保持其原生语义（当前时间可通过 `session_status` 获取）。

## 消息信封（默认使用本地时间）

传入消息会被包装上时间戳（精确到分钟）：

```
[Provider ... 2026-01-05 16:26 PST] message text
```

无论提供方时区如何，这个信封时间戳默认都是**主机本地时间**。

你可以覆盖此行为：

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

- `envelopeTimezone: "utc"` 使用 UTC。
- `envelopeTimezone: "local"` 使用主机时区。
- `envelopeTimezone: "user"` 使用 `agents.defaults.userTimezone`（回退到主机时区）。
- 使用明确的 IANA 时区（例如 `"America/Chicago"`）可固定时区。
- `envelopeTimestamp: "off"` 会从信封标题中移除绝对时间戳。
- `envelopeElapsed: "off"` 会移除经过时间后缀（`+2m` 这种格式）。

### 示例

**本地时间（默认）：**

```
[WhatsApp +1555 2026-01-18 00:19 PST] hello
```

**用户时区：**

```
[WhatsApp +1555 2026-01-18 00:19 CST] hello
```

**启用经过时间：**

```
[WhatsApp +1555 +30s 2026-01-18T05:19Z] follow-up
```

## 系统提示词：当前日期和时间

如果已知用户时区，系统提示词会包含一个专门的
**当前日期和时间** 部分，只显示**时区**（不包含时钟/时间格式），
以保持提示词缓存稳定：

```
Time zone: America/Chicago
```

当代理需要当前时间时，请使用 `session_status` 工具；状态卡中包含一个时间戳行。

## 系统事件行（默认使用本地时间）

插入到代理上下文中的排队系统事件，会以前缀时间戳的形式显示，使用与消息信封相同的时区选择（默认：主机本地时间）：

```
System: [2026-01-12 12:19:17 PST] Model switched.
```

### 配置用户时区 + 格式

```json5
{
  agents: {
    defaults: {
      userTimezone: "America/Chicago",
      timeFormat: "auto", // auto | 12 | 24
    },
  },
}
```

- `userTimezone` 为提示词上下文设置**用户本地时区**。
- `timeFormat` 控制提示词中的**12 小时/24 小时显示**。`auto` 遵循操作系统偏好。

## 时间格式检测（auto）

当 `timeFormat: "auto"` 时，OpenClaw 会检查操作系统偏好（macOS/Windows）
并回退到本地化格式。检测到的值会按进程**缓存**
，以避免重复的系统调用。

## 工具载荷 + 连接器（原始提供方时间 + 规范化字段）

通道工具返回**提供方原生时间戳**，并添加规范化字段以保持一致性：

- `timestampMs`：UTC 的纪元毫秒
- `timestampUtc`：ISO 8601 UTC 字符串

原始提供方字段会被保留，因此不会丢失任何信息。

- Slack：来自 API 的类纪元字符串
- Discord：UTC ISO 时间戳
- Telegram/WhatsApp：提供方特定的数字/ISO 时间戳

如果你需要本地时间，请在下游使用已知时区进行转换。

## 相关文档

- [System Prompt](/concepts/system-prompt)
- [Timezones](/concepts/timezone)
- [Messages](/concepts/messages)
