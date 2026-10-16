---
summary: "OpenClaw 何时显示输入中指示器以及如何调整它们"
read_when:
  - "更改输入中指示器行为或默认值"
title: "输入中指示器"
---

在运行处于活动状态时，会向聊天频道发送输入中指示器。使用 `agents.defaults.typingMode` 来控制**何时**开始输入，以及使用 `typingIntervalSeconds` 来控制**多久**刷新一次（保活频率，默认 6 秒）。

## <a id="defaults"></a> 默认值

当 `agents.defaults.typingMode` **未设置**时：

- **直接聊天**：一旦模型循环开始，立即开始输入。
- **带有提及的群聊**：立即开始输入。
- **没有提及的群聊**：当已接纳的运行出现对用户可见的活动时开始输入，例如 harness 执行活动或消息文本。
- **仅消息工具回复**：即使在没有提及的群聊中，也会立即开始输入，因此在没有发布自动最终回复的情况下，成员可以看到代理正在工作。这优先于上面的团体规则；显式的 `typingMode` 仍然胜过它。
- **心跳运行**：如果解析后的心跳目标是支持输入的聊天，并且输入未被禁用，则在心跳运行开始时开始输入。

## <a id="modes"></a> 模式

将 `agents.defaults.typingMode` 设置为以下之一：

- `never` - 从不显示输入指示器。
- `instant` - 在**模型循环开始时就立即**开始输入，即使后续运行最终只返回静默回复令牌。
- `thinking` - 在**第一个推理增量**时开始输入，或者在该轮次被接受后在主动 harness 执行时开始输入。
- `message` - 在**第一个用户可见的回复活动**时开始输入，例如主动 harness 执行或非静默文本增量。像 `NO_REPLY` 这样的静默回复令牌不计为文本活动。

“触发时机有多早”的顺序：`never` -> `message`/`thinking` -> `instant`。

## <a id="configuration"></a> 配置

设置代理级默认值：

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

为某个代理覆盖策略：

```json5
{
  agents: {
    entries: {
      support: {
        typingMode: "message",
      },
    },
  },
}
```

## <a id="notes"></a> 说明

- `message` 模式不会从静默回复令牌开始，但主动执行仍然可以在任何辅助文本可用之前显示输入内容。
- `thinking` 仍然对流式推理 （`reasoningLevel: "stream"`） 做出反应，并且还可以在推理增量到达之前从活动执行开始。
- Heartbeat 类型是已解析交付目标的活跃信号。它在心跳运行开始时启动，而不是遵循 `message` 或 `thinking` 流计时。设置 `typingMode: "never"` 将其禁用。
- 当检测信号目标为 `"none"`、无法解析目标、禁用检测信号的聊天传送或通道不支持输入时，HHeartbeats 不显示输入。
- `agents.defaults.typingIntervalSeconds` 控制每个代理的 **刷新节奏**，而不是开始时间。默认值：6 秒。

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="在场" href="/concepts/presence" icon="signal">
    网关如何跟踪 Control UI 设备页面和 macOS 实例选项卡的已连接客户端。
  </Card>
  <Card title="流式传输与分块" href="/concepts/streaming" icon="bars-staggered">
    出站流式传输行为、分块边界以及频道特定的交付。
  </Card>
  <Card title="心跳" href="/gateway/heartbeat" icon="heart-pulse">
    系统拥有的自动化运行定期代理轮流，以及其目标聊天的通知规则。
  </Card>
  <Card title="群组" href="/channels/groups" icon="users">
    跨支持群组的渠道的群组聊天行为和提及门控。
  </Card>
</CardGroup>
