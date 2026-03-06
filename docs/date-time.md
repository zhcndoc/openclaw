---
summary: "在信封、提示、工具和连接器中处理日期和时间"
read_when:
  - 当您更改向模型或用户显示时间戳的方式时
  - 当您调试消息或系统提示输出中的时间格式时
title: "日期和时间"
---

# 日期和时间

OpenClaw 默认使用 **主机本地时间作为传输时间戳**，并且 **仅在系统提示中使用用户时区**。  
保留提供者时间戳，以便工具保持其本地语义（当前时间通过 `session_status` 可用）。

## 消息信封（默认本地时间）

接收的消息会附加一个时间戳（分钟精度）：

```
[Provider ... 2026-01-05 16:26 PST] message text
```

此信封时间戳 **默认使用主机本地时间**，不受提供者时区影响。

您可以覆写此行为：

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
- `envelopeTimezone: "local"` 使用主机时区。
- `envelopeTimezone: "user"` 使用 `agents.defaults.userTimezone`（若无则回退到主机时区）。
- 使用明确的 IANA 时区（如 `"America/Chicago"`）以固定时区。
- `envelopeTimestamp: "off"` 移除信封头部的绝对时间戳。
- `envelopeElapsed: "off"` 移除经过时间后缀（`+2m` 样式）。

### 示例

**本地（默认）：**

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

## 系统提示：当前日期和时间

如果已知用户时区，系统提示会包含专门的  
**当前日期和时间** 部分，仅显示 **时区**（不包含具体时间/钟表格式），  
以保持提示缓存的稳定性：

```
Time zone: America/Chicago
```

当代理需要当前时间时，使用 `session_status` 工具；其状态卡包含时间戳行。

## 系统事件行（默认本地时间）

排队的系统事件插入到代理上下文中，前缀带时间戳，使用与消息信封相同的时区选择（默认：主机本地时间）。

```
System: [2026-01-12 12:19:17 PST] Model switched.
```

### 配置用户时区和时间格式

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

- `userTimezone` 设定 **提示上下文的用户本地时区**。
- `timeFormat` 控制提示中的 **12小时/24小时显示**。`auto` 依据操作系统偏好。

## 时间格式检测（自动）

当 `timeFormat: "auto"` 时，OpenClaw 会检测操作系统偏好（macOS/Windows），  
若无则回退至语言环境格式。检测结果 **会在进程中缓存**，避免重复系统调用。

## 工具负载和连接器（原始提供者时间 + 归一化字段）

渠道工具返回 **提供者原生的时间戳**，并新增归一化字段以保证一致性：

- `timestampMs`：纪元毫秒数（UTC）
- `timestampUtc`：ISO 8601 格式的 UTC 字符串

原始提供者字段得以保留，数据不丢失。

- Slack: API 返回类纪元的字符串
- Discord: UTC ISO 时间戳
- Telegram/WhatsApp: 提供者特定的数字或 ISO 时间戳

若需要本地时间，请在下游根据已知时区转换。

## 相关文档

- [系统提示](/concepts/system-prompt)
- [时区](/concepts/timezone)
- [消息](/concepts/messages)
