---
summary: "反应通知、Telegram 事件的配置写入以及错误回复策略"
read_when:
  - "通过 Telegram 反应唤醒代理"
  - "允许或阻止来自 Telegram 的配置写入"
  - "阻止错误消息到达聊天室"
title: "Telegram 事件和操作"
sidebarTitle: "事件和操作"
---

操作 Telegram 表面：反应唤醒、配置写入以及机器人在出现故障时所说的内容。

## <a id="events-and-operations"></a> 事件和操作

<AccordionGroup>
  <Accordion id="reaction-notifications" title="反应通知">
    Telegram 的反应会作为 `message_reaction` 更新到达，独立于消息载荷。当启用时，OpenClaw 会将其排入系统事件，例如 `Telegram reaction added: 👍 by Alice (@alice) on msg 42`。

    - `channels.telegram.reactionNotifications`：`off | own | all`（默认：`own`）
    - `channels.telegram.reactionLevel`：`off | ack | minimal | extensive`（默认：`minimal`）

    `own` 表示仅用户对 bot 发送消息的反应（通过已发送消息缓存尽力实现）。反应事件仍会遵守 Telegram 访问控制（`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`）；未授权发送者会被丢弃。

    Telegram 不提供反应更新中的主题元数据。普通的非论坛群组仍处于聊天范围内。论坛和频道私信反应从 OpenClaw 的有界消息缓存（由帐户、聊天和消息 ID 键入）中恢复原始主题，因此主题配置、主题代理和对话绑定仍然适用。如果缓存的主题丢失或属于错误的范围，OpenClaw 会跳过反应通知并记录警告，而不是退回到常规或基本聊天。

    `allowed_updates` 对于 polling/webhook 自动包含 `message_reaction`。

  </Accordion>

  <Accordion id="config-writes-from-telegram-events-and-commands" title="来自 Telegram 事件和命令的配置写入">
    默认情况下启用通道配置写入 （`configWrites !== false`）。 Telegram-触发的写入包括组迁移事件（`migrate_to_chat_id`，更新`channels.telegram.groups`）和`/config set` / `/config unset`（需要命令启用）。

    禁用：

```json5
{
  channels: {
    telegram: {
      configWrites: false,
    },
  },
}
```

  </Accordion>
</AccordionGroup>

## <a id="error-reply-controls"></a> 错误回复控制

当代理遇到投递或提供方错误时，错误策略会控制错误消息是否会发送到 Telegram 聊天中：

| 键                             | 值                     | 默认值  | 描述                                                                                                                                                                |
| ------------------------------- | -------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `channels.telegram.errorPolicy` | `always`, `once`, `silent` | `always` | `always` 会将每条错误消息都发送到聊天中。`once` 会在内置冷却窗口内，每个唯一的错误消息只发送一次。`silent` 则永远不会将错误消息发送到聊天中。 |

支持按账号、按群组和按主题覆盖配置（继承规则与其他 Telegram 配置键相同）。

```json5
{
  channels: {
    telegram: {
      errorPolicy: "always",
      groups: {
        "-1001234567890": {
          errorPolicy: "silent", // suppress errors in this group
        },
      },
    },
  },
}
```
