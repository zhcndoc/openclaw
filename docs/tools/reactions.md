---
summary: "跨所有受支持渠道的表情反应工具语义"
read_when:
  - 在任何渠道上处理反应时
  - 了解表情反应在不同平台上的差异时
title: "反应"
---

代理可以使用带有 `react` 操作的 `message`
工具，在消息上添加和移除表情反应。反应行为因渠道和传输方式而异。

## 工作原理

```json
{
  "action": "react",
  "messageId": "msg-123",
  "emoji": "thumbsup"
}
```

- 在添加反应时，`emoji` 为必需项。
- 将 `emoji` 设为空字符串（`""`）可移除机器人的反应。
- 设置 `remove: true` 可移除指定的表情（需要非空的 `emoji`）。
- 在支持状态反应的渠道上，对反应设置 `trackToolCalls: true`，可让运行时使用该已反应的消息，在同一轮中为后续工具进度反应提供依据。

## 渠道行为

<AccordionGroup>
  <Accordion title="Discord 和 Slack">
    - 空的 `emoji` 会移除机器人在该消息上的所有反应。
    - `remove: true` 只会移除指定的表情。

  </Accordion>

  <Accordion title="Google Chat">
    - 空的 `emoji` 会移除应用在该消息上的反应。
    - `remove: true` 只会移除指定的表情。

  </Accordion>

  <Accordion title="Telegram">
    - 空的 `emoji` 会移除机器人的反应。
    - `remove: true` 也会移除反应，但工具校验仍要求 `emoji` 非空。

  </Accordion>

  <Accordion title="WhatsApp">
    - 空的 `emoji` 会移除机器人的反应。
    - `remove: true` 在内部会映射为空的 emoji（工具调用中仍需要提供 `emoji`）。

  </Accordion>

  <Accordion title="Zalo Personal (zalouser)">
    - 需要非空的 `emoji`。
    - `remove: true` 会移除该特定表情反应。

  </Accordion>

  <Accordion title="Feishu/Lark">
    - 使用 `feishu_reaction` 工具，动作包括 `add`、`remove` 和 `list`。
    - 添加/移除需要 `emoji_type`；移除还需要 `reaction_id`。

  </Accordion>

  <Accordion title="Signal">
    - 入站反应通知由 `channels.signal.reactionNotifications` 控制：`"off"` 会禁用它们，`"own"`（默认）会在用户对机器人的消息做出反应时发出事件，而 `"all"` 会为所有反应发出事件。

  </Accordion>
</AccordionGroup>

## 反应级别

按渠道的 `reactionLevel` 配置控制代理使用反应的范围。其值通常为 `off`、`ack`、`minimal` 或 `extensive`。

- [Telegram reactionLevel](/channels/telegram#reaction-notifications) — `channels.telegram.reactionLevel`
- [WhatsApp reactionLevel](/channels/whatsapp#reaction-level) — `channels.whatsapp.reactionLevel`

在各个渠道上为单独的 `reactionLevel` 进行设置，以调整代理在每个平台上对消息做出反应的积极程度。

## 相关内容

- [Agent Send](/tools/agent-send) — 包含 `react` 的 `message` 工具
- [Channels](/channels) — 按渠道划分的配置
