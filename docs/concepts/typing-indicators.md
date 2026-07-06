---
summary: "OpenClaw 何时显示输入中指示器以及如何调整它们"
read_when:
  - 更改输入中指示器行为或默认值
title: "输入中指示器"
---

在运行处于活动状态时，会向聊天频道发送输入中指示器。使用 `agents.defaults.typingMode` 来控制**何时**开始输入，以及使用 `typingIntervalSeconds` 来控制**多久**刷新一次（保活频率，默认 6 秒）。

## 默认值

当 `agents.defaults.typingMode` **未设置**时：

- **直接聊天**：一旦模型循环开始，立即开始输入。
- **带有提及的群聊**：立即开始输入。
- **没有提及的群聊**：当已接纳的运行出现对用户可见的活动时开始输入，例如 harness 执行活动或消息文本。
- **心跳运行**：如果解析后的心跳目标是支持输入的聊天，并且输入未被禁用，则在心跳运行开始时开始输入。

## 模式

将 `agents.defaults.typingMode` 设置为以下之一：

- `never` - 从不显示输入指示器。
- `instant` - 在**模型循环开始时就立即**开始输入，即使后续运行最终只返回静默回复令牌。
- `thinking` - 在**第一个推理增量**时开始输入，或者在该轮次被接受后在主动 harness 执行时开始输入。
- `message` - 在**第一个用户可见的回复活动**时开始输入，例如主动 harness 执行或非静默文本增量。像 `NO_REPLY` 这样的静默回复令牌不计为文本活动。

“触发时机有多早”的顺序：`never` -> `message`/`thinking` -> `instant`。

## Configuration

Set proxy-level defaults:

```json5
{
  agents: {
    defaults: {
      typingMode: "thinking",
      typingIntervalSeconds: 6,
    },
  },
}
```

Override the mode or frequency per session:

```json5
{
  session: {
    typingMode: "message",
    typingIntervalSeconds: 4,
  },
}
```

## 注意

- `message` 模式不会从静默回复 token 开始，但主动执行在任何助手文本可用之前仍然可能显示正在输入。
- `thinking` 仍然会响应流式推理（`reasoningLevel: "stream"`），并且也可以在推理增量到达之前从主动执行开始。
- 心跳输入状态是已解析投递目标的存活信号。它从心跳运行开始时启动，而不是跟随 `message` 或 `thinking` 的流式时序。将 `typingMode: "never"` 设置为可禁用它。
- 当心跳目标为 `"none"`、目标无法解析、心跳的聊天投递被禁用，或者该频道不支持输入状态时，心跳不会显示输入状态。
- `typingIntervalSeconds` 控制的是**刷新频率**，而不是开始时间。默认值：6 秒。

## 相关

<CardGroup cols={2}>
  <Card title="Presence" href="/concepts/presence" icon="signal">
    Gateway 如何跟踪已连接的客户端，并在 macOS Instances 选项卡中显示它们。
  </Card>
  <Card title="Streaming and chunking" href="/concepts/streaming" icon="bars-staggered">
    出站流式行为、分块边界以及按频道的投递。
  </Card>
</CardGroup>
