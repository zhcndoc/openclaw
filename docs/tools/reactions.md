---
summary: "跨所有受支持渠道的表情反应工具语义"
read_when:
  - 在任何渠道上处理反应时
  - 了解表情反应在不同平台上的差异时
title: "反应"
---

代理使用 `message` 工具的 `react`
动作来添加和移除表情反应。行为会因渠道而异。

## 工作原理

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
- 在具有状态反应的频道中，反应上的 `trackToolCalls: true` 允许运行时重用该已反应消息，用于同一轮中的后续工具进度反应。

## Channel Behavior

<AccordionGroup>
  <Accordion title="Discord and Slack">
    - An empty `emoji` will remove all of the bot’s reactions on that message.
    - `remove: true` will only remove the specified emoji.

  </Accordion>

  <Accordion title="Nextcloud Talk">
    - Add-only reactions: `emoji` is required and cannot be empty.
    - Reaction removal is not yet wired to a delete call; `remove: true` returns a clear error rather than silently doing nothing.
    - Requires a bot registered in Talk with the `reaction` feature enabled (see [Nextcloud Talk channel docs](/channels/nextcloud-talk)).

  </Accordion>

  <Accordion title="Telegram">
    - An empty `emoji` will remove the bot’s reaction.
    - `remove: true` also removes reactions, but tool validation still requires a non-empty `emoji`.

  </Accordion>

  <Accordion title="WhatsApp">
    - An empty `emoji` will remove the bot reaction.
    - `remove: true` is internally mapped to an empty emoji (but `emoji` is still required in the tool call).
    - WhatsApp has a single bot-reaction slot per message; sending a new reaction replaces it instead of stacking multiple emoji.

  </Accordion>

  <Accordion title="Zalo Personal (zalouser)">
    - Both adding and removing require a non-empty `emoji`.
    - `remove: true` will remove that specific emoji reaction.

  </Accordion>

  <Accordion title="Feishu/Lark">
    - Uses the same `react` operation as other channels (add/remove/list via reaction ID) rather than a separate tool.
    - Adding requires a non-empty `emoji` (mapped to Feishu’s `emoji_type`, e.g. `SMILE`, `THUMBSUP`, `HEART`).
    - `remove: true` requires a non-empty `emoji` and removes the bot’s own reaction matching that emoji type.
    - `clearAll: true` with an empty `emoji` will remove all of the bot’s reactions on that message.

  </Accordion>

  <Accordion title="Signal">
    - Incoming reaction notifications are controlled by `channels.signal.reactionNotifications`: `"off"` disables them, `"own"` (default) emits events when users react to bot messages, `"all"` emits events for all reactions, and `"allowlist"` emits only for senders in `channels.signal.reactionAllowlist`.

  </Accordion>

  <Accordion title="iMessage">
    - Outgoing reactions are iMessage tapbacks (`love`, `like`, `dislike`, `laugh`, `emphasize`, and `question`); `emoji` must map to one of these types in order to add a reaction.
    - Using `remove: true` without a recognizable tapback type removes all tapback types; if a recognizable type exists, only that one is removed.

  </Accordion>
</AccordionGroup>

## 反应级别

按频道设置的 `reactionLevel` 会限制代理发送自身反应的频率。可选值：`off`、`ack`、`minimal` 或 `extensive`。

- [Telegram 反应通知](/channels/telegram#feature-reference) - `channels.telegram.reactionLevel`（默认 `minimal`）
- [WhatsApp 反应级别](/channels/whatsapp#reaction-level) - `channels.whatsapp.reactionLevel`（默认 `minimal`）
- [Signal 反应](/channels/signal#reactions-message-tool) - `channels.signal.reactionLevel`（默认 `minimal`）

## 相关内容

- [Agent Send](/tools/agent-send) - 包含 `react` 的 `message` 工具
- [Channels](/channels) - 特定于频道的配置
