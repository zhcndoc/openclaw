---
summary: "OpenClaw 何时显示输入指示器及如何调整它们"
read_when:
  - Changing typing indicator behavior or defaults
title: "输入指示器"
---

输入指示器会在运行处于活动状态时发送到聊天频道。使用
`agents.defaults.typingMode` 来控制**何时**开始输入，并使用 `typingIntervalSeconds`
来控制其**刷新频率**。

## 默认设置

当 `agents.defaults.typingMode` **未设置** 时，OpenClaw 保持以下传统行为：

- **直接聊天**：模型循环开始后立即开始输入。
- **带提及的群聊**：立即开始输入。
- **不带提及的群聊**：仅在消息文本开始流式传输时才开始输入。
- **心跳运行**：如果解析出的心跳目标是支持输入的聊天且未禁用输入，则在心跳运行开始时开始输入。

## 模式

将 `agents.defaults.typingMode` 设置为以下之一：

- `never` — 永不显示输入指示。
- `instant` — **模型循环开始时立即** 显示输入，即使运行最终只返回静默回复令牌。
- `thinking` — 在 **首次推理增量** 时开始显示输入（运行需配置 `reasoningLevel: "stream"`）。
- `message` — 在 **首次非静默文本增量** 时开始显示输入（忽略 `NO_REPLY` 静默令牌）。

触发时序顺序：
`never` → `message` → `thinking` → `instant`

## 配置

```json5
{
  agent: {
    typingMode: "thinking",
    typingIntervalSeconds: 6,
  },
}
```

你可以为每个会话单独覆盖模式或刷新间隔：

```json5
{
  session: {
    typingMode: "message",
    typingIntervalSeconds: 4,
  },
}
```

## 说明

- `message` 模式不会为仅静默回复显示输入，当整个
  负载是完全相同的静默令牌时也是如此（例如 `NO_REPLY` / `no_reply`，
  匹配时不区分大小写）。
- `thinking` 仅在运行流式输出推理时触发（`reasoningLevel: "stream"`）。
  如果模型没有发出推理增量，输入不会开始。
- 心跳输入是已解析交付目标的存活信号。它
  在心跳运行开始时触发，而不是遵循 `message` 或 `thinking`
  的流式时序。将 `typingMode: "never"` 设为禁用它。
- 当 `target: "none"` 时、目标无法
  解析时、心跳的聊天交付被禁用时，或者该
  频道不支持输入时，心跳不会显示输入。
- `typingIntervalSeconds` 控制**刷新频率**，而不是开始时间。
  默认值为 6 秒。

## 相关内容

- [Presence](/concepts/presence)
- [Streaming and chunking](/concepts/streaming)
