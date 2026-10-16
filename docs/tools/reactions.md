---
summary: "跨所有受支持渠道的表情反应工具语义"
read_when:
  - "在任何渠道上处理反应时"
  - "了解表情反应在不同平台上的差异时"
title: "反应"
---

代理使用 `message` 工具的 `react` 动作来添加和移除表情反应。行为会因渠道而异。

[控制 UI 反应 ](/concepts/multi-user#reactions) 通道源提示通过相同的 `react` 操作反映机器人的反应。

## <a id="how-it-works"></a> 工作原理

```json
{
  "action": "react",
  "messageId": "msg-123",
  "emoji": "thumbsup"
}
```

- 在添加反应时，`emoji` 是必需的。
- 将 `emoji` 设置为空字符串（`""`），可移除机器人在支持该功能的频道中的反应。
- 将 `remove: true` 设置为移除一个特定表情符号（要求 `emoji` 非空）。
- `clearAll: true` 是一个 Feishu/Lark-only 标志，可删除机器人对消息做出的所有反应。它与空的 `emoji` 配对。
- `emoji-list` 是单独的 `message` 工具操作，而不是 `react` 参数。它报告频道将接受的表情符号。它返回的内容以及启用它的每个通道操作切换都因通道而异。请参阅 [Channels](/channels) 下的频道页面。
- 在具有状态反应的通道上，反应上的 `trackToolCalls: true` 允许运行时在同一回合的状态生命周期中重用该反应消息。 Discord 在工作期间保持所选反应稳定并发出实际故障信号，而不是循环使用特定于工具的表情符号。

## <a id="channel-behavior"></a> 频道行为

<AccordionGroup>
  <Accordion id="discord-and-slack" title="Discord 和 Slack">
    - Empty `emoji` 删除机器人对消息的所有反应。
    - `remove: true` 仅删除指定的表情符号。

  </Accordion>

  <Accordion id="nextcloud-talk" title="Nextcloud 谈话">
    - 仅添加反应：`emoji` 是必需的且必须为非空。
    - Reaction 删除尚未连接到删除调用。 `remove: true` 被拒绝并显示显式错误，而不是静默无操作。
    - 需要使用 `reaction` 功能注册 Talk 机器人（请参阅 [Nextcloud Talk 通道文档](/channels/nextcloud-talk)）。

  </Accordion>

  <Accordion title="Telegram">
    - 使用`emoji-list`查找允许的标准反应和数字自定义表情符号标识符。在Telegram， `channels.telegram.actions.reactions`门都`react`和`emoji-list`， 和`emoji-list`返回当前聊天中允许的反应。
    - Empty `emoji` 删除机器人的反应。
    - `remove: true` 也删除了反应，但仍需要非空 `emoji` 进行工具验证。

  </Accordion>

  <Accordion title="WhatsApp">
    - Empty `emoji` 删除机器人反应。
    - `remove: true` 在内部映射到空表情符号（工具调用中仍需要 `emoji`）。
    - WhatsApp 每条消息有一个机器人反应槽。发送新的反应会取代它，而不是堆叠多个表情符号。

  </Accordion>

  <Accordion id="zalo-personal-zalouser" title="Zalo 个人 （zalouser）">
    - 添加和删除都需要非空 `emoji`。
    - `remove: true` 删除了特定的表情符号反应。

  </Accordion>

  <Accordion title="Feishu/Lark">
    - 使用与其他通道相同的 `react` 操作（add/remove/list 通过消息反应 ID），而不是单独的工具。
    - 添加需要非空`emoji`（映射到Feishu `emoji_type`、e.g. `SMILE`、`THUMBSUP`、`HEART`）。
    - `remove: true` 需要非空 `emoji` 并删除机器人自身与该表情符号类型匹配的反应。
    - Empty `emoji` 和 `clearAll: true` 会删除机器人对消息的所有反应。

  </Accordion>

  <Accordion title="Signal">
    - `channels.signal.reactionNotifications` 控制入站反应通知。 `"off"` 禁用它们。当用户对机器人消息作出反应时，`"own"`（默认）发出事件。 `"all"` 发出所有反应的事件。 `"allowlist"` 仅针对 `channels.signal.reactionAllowlist` 中的发件人发出事件。

  </Accordion>

  <Accordion title="iMessage">
    - 出站反应是 iMessage 回送（`love`、`like`、`dislike`、`laugh`、`emphasize` 和 `question`）。 `emoji` 必须映射到其中一种才能添加反应。
    - 没有公认的回弹类型的 `remove: true` 会删除所有回弹类型。对于一种公认的类型，它只会删除该类型。

  </Accordion>
</AccordionGroup>

## <a id="reaction-level"></a> 反应级别

按频道设置的 `reactionLevel` 会限制代理发送自身反应的频率。可选值：`off`、`ack`、`minimal` 或 `extensive`。

- [电报反应级别](/channels/telegram#feature-reference) - `channels.telegram.reactionLevel`（默认`minimal`）
- [WhatsApp 反应级别](/channels/whatsapp#reaction-level) - `channels.whatsapp.reactionLevel`（默认 `minimal`）
- [Signal 反应](/channels/signal#reactions-message-tool) - `channels.signal.reactionLevel`（默认 `minimal`）

## <a id="related"></a> 相关内容

- [Agent Send](/tools/agent-send) - 包括 `react` 的 `message` 工具
- [Channels](/channels) - 特定于频道的配置
