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

## 渠道行为

<AccordionGroup>
  <Accordion title="Discord 和 Slack">
    - 空的 `emoji` 会移除机器人在该消息上的所有反应。
    - `remove: true` 只会移除指定的表情。

  </Accordion>

  <Accordion title="Google Chat">
    - 空的 `emoji`（或 `remove: true`）会移除机器人在该消息上的自身反应；如果设置了 `emoji`，则仅针对该 `emoji` 过滤。
    - `remove: true` 只会移除指定的表情。

  </Accordion>

  <Accordion title="Nextcloud Talk">
    - 仅添加反应：`emoji` 是必需的，并且不能为空。
    - 反应移除尚未接入删除调用；`remove: true` 会返回明确的错误，而不是静默地不执行任何操作。
    - 需要在 Talk 中注册并启用了 `reaction` 功能的机器人（参见 [Nextcloud Talk channel docs](/channels/nextcloud-talk)）。

  </Accordion>

  <Accordion title="Telegram">
    - 空的 `emoji` 会移除机器人的反应。
    - `remove: true` 也会移除反应，但工具校验仍要求 `emoji` 非空。

  </Accordion>

  <Accordion title="WhatsApp">
    - 空的 `emoji` 会移除机器人反应。
    - `remove: true` 在内部会映射为空的 emoji（但在工具调用中仍然需要 `emoji`）。
    - WhatsApp 对每条消息只有一个机器人反应槽位；发送新的反应会替换它，而不是叠加多个 emoji。

  </Accordion>

  <Accordion title="Zalo Personal (zalouser)">
    - 添加和移除都要求 `emoji` 非空。
    - `remove: true` 会移除该特定 emoji 反应。

  </Accordion>

  <Accordion title="Feishu/Lark">
    - 与其他渠道一样使用相同的 `react` 操作（通过消息反应 ID 进行添加/移除/列出），而不是单独的工具。
    - 添加时要求 `emoji` 非空（映射到 Feishu 的 `emoji_type`，例如 `SMILE`、`THUMBSUP`、`HEART`）。
    - `remove: true` 要求 `emoji` 非空，并移除机器人与该 emoji 类型匹配的自身反应。
    - `clearAll: true` 配合空的 `emoji` 会移除机器人在该消息上的所有反应。

  </Accordion>

  <Accordion title="Signal">
    - 入站反应通知由 `channels.signal.reactionNotifications` 控制：`"off"` 会禁用它们，`"own"`（默认）会在用户对机器人消息作出反应时发出事件，`"all"` 会为所有反应发出事件，而 `"allowlist"` 只会为 `channels.signal.reactionAllowlist` 中的发送者发出事件。

  </Accordion>

  <Accordion title="iMessage">
    - 出站反应是 iMessage tapbacks（`love`、`like`、`dislike`、`laugh`、`emphasize` 和 `question`）；`emoji` 必须映射到这些类型之一才能添加反应。
    - 在没有可识别 tapback 类型的情况下使用 `remove: true` 会移除所有 tapback 类型；如果有可识别的类型，则只移除该一个。

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
