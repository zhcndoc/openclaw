---
summary: "跨信封、提示词、工具和连接器的日期和时间处理"
read_when:
  - 你正在更改时间戳向模型或用户显示的方式
  - 你正在调试消息或系统提示输出中的时间格式
title: "日期和时间"
---

OpenClaw 对消息信封、系统事件和系统提示使用配置的**用户时区**。当未设置 `agents.defaults.userTimezone` 时，这些界面使用主机时区。提供商时间戳会被保留，以便工具继续使用其原生语义。
当代理需要确切的当前时间且 `session_status` 可用时，它会运行该工具。

## 消息信封（默认使用本地时间）

传入消息会被封装上星期几和精确到秒的时间戳：

```
[WhatsApp +1555 Mon 2026-01-05 16:26:34 PST] message text
```

信封时间戳在配置了 `agents.defaults.userTimezone` 时使用该时区，否则使用主机时区。绝对时间戳和经过时间后缀会自动生成。

### 示例

**本地时间（默认）：**

```
[WhatsApp +1555 Sun 2026-01-18 00:19:42 PST] hello
```

**用户时区：**

```
[WhatsApp +1555 Sun 2026-01-18 00:19:42 CST] hello
```

**经过时间：**

```
[WhatsApp +1555 +30s Sun 2026-01-18 00:20:12 CST] follow-up
```

## 系统提示：时间上下文

系统提示包含一个易变的**时间上下文**部分，其中包含本地日历日期和
时区，但不包含实时钟表：

```
Current date: 2026-01-05
Time zone: America/Chicago
```

在配置了 `agents.defaults.userTimezone` 时，时区为该值，否则使用主机时区。
该部分位于提示缓存边界之下，因此日期变更和时区变化不会使稳定前缀失效。
在可用时，`session_status` 仍是获取精确当前时间的来源。

## 系统事件行（默认使用本地时间）

在代理上下文中插入的排队系统事件会使用配置的 `agents.defaults.userTimezone`，否则使用主机时区。

```
System: [2026-01-12 12:19:17 PST] Model switched.
```

### 配置用户时区

```json5
{
  agents: {
    defaults: {
      userTimezone: "America/Chicago",
    },
  },
}
```

- `userTimezone` 为消息信封、系统事件和提示上下文设置用户本地时区。
- 使用 IANA 时区，例如 `America/Chicago`、`Europe/Vienna` 或 `Asia/Tokyo`。

## 时间格式检测

显示的时钟值遵循操作系统和区域设置偏好。OpenClaw
会在 macOS 和 Windows 上检测 12 小时制或 24 小时制显示，然后回退到区域
格式。检测到的值会按进程缓存。

## 工具载荷 + 连接器（原始提供方时间 + 规范化字段）

通道工具返回**提供方原生时间戳**，并添加规范化字段以保持一致性：

- `timestampMs`：UTC 的纪元毫秒
- `timestampUtc`：ISO 8601 UTC 字符串

原始提供方字段会被保留，因此不会丢失任何信息。

- Discord：UTC ISO 时间戳
- Slack：来自 API 的类纪元字符串
- Telegram/WhatsApp：提供方特定的数值/ISO 时间戳

如果你需要本地时间，请在下游使用已知时区进行转换。

## 相关文档

- [系统提示词](/concepts/system-prompt)
- [时区](/concepts/timezone)
- [消息](/concepts/messages)
