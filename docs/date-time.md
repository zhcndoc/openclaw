---
summary: "跨信封、提示词、工具和连接器的日期和时间处理"
read_when:
  - 你正在更改时间戳向模型或用户显示的方式
  - 你正在调试消息或系统提示输出中的时间格式
title: "日期和时间"
---

OpenClaw 对传输时间戳使用**主机本地时间**，并且在系统提示中只放入**时区**。
保留提供方时间戳，因此工具会保持其原生语义。当代理需要当前时间时，它会运行 `session_status` 工具。

## 消息信封（默认使用本地时间）

传入消息会被封装上星期几和精确到秒的时间戳：

```
[WhatsApp +1555 Mon 2026-01-05 16:26:34 PST] message text
```

信封时间戳默认使用**主机本地时间**，不受提供方时区影响。
在 `agents.defaults` 下覆盖：

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

| Key                 | Values                                               | Behavior                                                                                                                                                                        |
| ------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `envelopeTimezone`  | `local`（默认）、`utc`、`user`、显式 IANA 名称       | `user` 使用 `agents.defaults.userTimezone`（未设置时为主机时区）。显式 IANA 名称（例如 `"America/Chicago"`）会固定到一个时区；无法识别的名称会回退到 UTC。 |
| `envelopeTimestamp` | `on`（默认）、`off`                                 | `off` 会从信封头、直接的 agent 提示前缀，以及嵌入的模型输入前缀中移除绝对时间戳。                                                       |
| `envelopeElapsed`   | `on`（默认）、`off`                                 | `off` 会移除自会话上一条消息以来显示的经过时间后缀（`+30s` / `+2m` 这类）。                                                               |

### 示例

**本地时间（默认）：**

```
[WhatsApp +1555 Sun 2026-01-18 00:19:42 PST] hello
```

**用户时区：**

```
[WhatsApp +1555 Sun 2026-01-18 00:19:42 CST] hello
```

**使用 `envelopeTimezone: "utc"` 的经过时间：**

```
[WhatsApp +1555 +30s Sun 2026-01-18T05:19:00Z] follow-up
```

## 系统提示词：当前日期和时间

系统提示词包含一个 **当前日期和时间** 部分，其中只包含 **时区**
（不包含时钟或时间格式），以便提示缓存保持稳定：

```
Time zone: America/Chicago
```

该时区在配置时为 `agents.defaults.userTimezone`，否则为主机时区。
提示词还指示代理在需要当前日期、时间或星期几时运行 `session_status` 工具。

## 系统事件行（默认使用本地时间）

插入到代理上下文中的排队系统事件会在时间戳前加上前缀，并使用与消息信封相同的 `envelopeTimezone` 选择（默认：主机本地）。

```
System: [2026-01-12 12:19:17 PST] Model switched.
```

### 配置用户时区 + 格式

```json5
{
  agents: {
    defaults: {
      userTimezone: "America/Chicago",
      timeFormat: "auto", // 自动 | 12 | 24
    },
  },
}
```

- `userTimezone` 为提示上下文设置 **用户本地时区**（以及 `envelopeTimezone: "user"`）。
- `timeFormat` 控制提示中显示时间的 **12 小时制/24 小时制**。`auto` 遵循操作系统偏好。

## 时间格式检测（auto）

当 `timeFormat: "auto"` 时，OpenClaw 会检查操作系统偏好设置（macOS 和 Windows），
并回退到区域设置格式。检测到的值会**按进程缓存**，
以避免重复的系统调用。

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
