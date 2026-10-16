---
summary: "跨信封、提示词、工具和连接器的日期和时间处理"
read_when:
  - "你正在更改时间戳向模型或用户显示的方式"
  - "你正在调试消息或系统提示输出中的时间格式"
title: "日期和时间"
---

OpenClaw 将配置的 **user timezone** 用于消息信封、系统事件和每轮运行时上下文。当 `agents.defaults.userTimezone` 未设置时，这些表面使用主机时区。提供者时间戳被保留，因此工具保留其本机语义。当代理需要准确的当前时间并且 `session_status` 可用时，它会运行该工具。

## <a id="message-envelopes-(local-by-default)"></a><a id="message-envelopes-local-by-default"></a> 消息信封（默认使用本地时间）

传入消息会被封装上星期几和精确到秒的时间戳：

```
[WhatsApp +1555 Mon 2026-01-05 16:26:34 PST] message text
```

信封时间戳在配置了 `agents.defaults.userTimezone` 时使用该时区，否则使用主机时区。绝对时间戳和经过时间后缀会自动生成。

### <a id="examples"></a> 示例

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

<a id="system-prompt-temporal-context" />

## <a id="runtime-context%3A-date-and-time-zone"></a><a id="runtime-context-date-and-time-zone"></a> 运行时上下文：日期和时区

每回合都会收到一个 **Temporal Context** 部分，其中包含本地日历日期和时区，在系统提示之外并且没有实时时钟：

```
Current date: 2026-01-05
Time zone: America/Chicago
```

配置时区为 `agents.defaults.userTimezone`，否则为主机时区。该部分在当前轮次运行时上下文中移动，而不会重写早期消息，因此日期翻转保留了完整的系统提示和对话历史记录前缀以进行缓存。聊天完成和原生 Ollama 默认保留历史记录中隐藏的回合上下文；显式提供程序重播策略可以覆盖该行为。正常的压缩预算仍然适用。原始模型探针忽略 OpenClaw 运行时上下文。如果可用，`session_status` 仍然是准确当前时间的源。

## <a id="system-event-lines-(local-by-default)"></a><a id="system-event-lines-local-by-default"></a> 系统事件行（默认使用本地时间）

在代理上下文中插入的排队系统事件会使用配置的 `agents.defaults.userTimezone`，否则使用主机时区。

```
System: [2026-01-12 12:19:17 PST] Model switched.
```

### <a id="configure-user-timezone"></a> 配置用户时区

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

## <a id="time-format-detection"></a> 时间格式检测

显示的时钟值遵循操作系统和区域设置偏好。OpenClaw 会在 macOS 和 Windows 上检测 12 小时制或 24 小时制显示，然后回退到区域格式。检测到的值会按进程缓存。

## <a id="tool-payloads-%2B-connectors-(raw-provider-time-%2B-normalized-fields)"></a><a id="tool-payloads-+-connectors-raw-provider-time-+-normalized-fields"></a> 工具载荷 + 连接器（原始提供方时间 + 规范化字段）

通道工具返回**提供方原生时间戳**，并添加规范化字段以保持一致性：

- `timestampMs`：UTC 的纪元毫秒
- `timestampUtc`：ISO 8601 UTC 字符串

原始提供方字段会被保留，因此不会丢失任何信息。

- Discord：UTC ISO 时间戳
- Slack：来自 API 的类纪元字符串
- Telegram/WhatsApp：特定于提供商的 numeric/ISO 时间戳

如果你需要本地时间，请在下游使用已知时区进行转换。

## <a id="related-docs"></a> 相关文档

- [系统 Prompt](/concepts/system-prompt)
- [时区](/concepts/timezone)
- [消息](/concepts/messages)
