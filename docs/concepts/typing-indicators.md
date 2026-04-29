---
summary: "OpenClaw 何时显示输入中指示器以及如何调整它们"
read_when:
  - 更改输入中指示器行为或默认值
title: "输入中指示器"
---

在运行处于活动状态时，会向聊天频道发送输入中指示器。使用
`agents.defaults.typingMode` 来控制**何时**开始输入，并使用 `typingIntervalSeconds`
来控制**多久**刷新一次。

## 默认值

当 `agents.defaults.typingMode` **未设置**时，OpenClaw 会保留旧版行为：

- **直接聊天**：模型循环一开始就立即开始输入中。
- **带提及的群聊**：立即开始输入中。
- **不带提及的群聊**：只有当消息文本开始流式输出时才开始输入中。
- **心跳运行**：当心跳运行开始时，如果解析出的心跳目标是支持输入中的聊天且未禁用输入中，则开始输入中。

## 模式

将 `agents.defaults.typingMode` 设置为以下之一：

- `never` — 永不显示输入中指示器。
- `instant` — **只要模型循环开始就**开始输入中，即使该运行
  最终只返回静默回复标记。
- `thinking` — 在**第一个推理增量**时开始输入中（该运行需要
  `reasoningLevel: "stream"`）。
- `message` — 在**第一个非静默文本增量**时开始输入中（忽略
  `NO_REPLY` 静默标记）。

“触发得有多早”的顺序：
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

你可以按会话覆盖模式或节奏：

```json5
{
  session: {
    typingMode: "message",
    typingIntervalSeconds: 4,
  },
}
```

## 注意

- `message` 模式不会为仅静默回复显示输入中状态，如果整个
  载荷正好是静默标记（例如 `NO_REPLY` / `no_reply`，不区分大小写匹配）。
- `thinking` 只会在运行流式输出推理时触发（`reasoningLevel: "stream"`）。
  如果模型没有发出推理增量，则不会开始输入中。
- 心跳输入中是解析后的传递目标的存活信号。它
  在心跳运行开始时启动，而不是遵循 `message` 或 `thinking`
  的流式时序。设置 `typingMode: "never"` 可将其禁用。
- 当 `target: "none"`、目标无法
 解析、心跳的聊天传递被禁用，或者频道不支持输入中时，心跳不会显示输入中。
- `typingIntervalSeconds` 控制**刷新频率**，而不是开始时间。
  默认值为 6 秒。

## 相关

- [Presence](/concepts/presence)
- [Streaming and chunking](/concepts/streaming)
