---
summary: "让受支持的群组房间提供安静上下文，除非代理使用 message 工具发送消息"
read_when:
  - 配置始终在线的群组或频道房间
  - 你希望代理在不自动发布最终文本的情况下监听房间聊天
  - 调试无可见房间消息时的打字与 token 使用情况
title: "环境房间事件"
sidebarTitle: "环境房间事件"
---

环境房间事件让 OpenClaw 能将未被点名的群组或频道聊天作为安静上下文来处理。代理可以更新记忆和会话状态，但除非代理显式调用 `message` 工具，否则房间保持静默。

对于始终在线的群聊，这是推荐模式：将 `messages.groupChat.unmentionedInbound: "room_event"` 与 `messages.groupChat.visibleReplies: "message_tool"` 结合使用。当代理应该倾听、判断何时回复有价值，并避免旧的以回答 `NO_REPLY` 为模式的提示词时，请使用它。

目前受支持：Discord 公会频道、Slack 频道和私人频道、Slack 多人 DM，以及 Telegram 群组或超级群组。其他群组频道会保持其现有的群组行为，除非其频道页面说明它们支持环境房间事件。

## 推荐设置

设置全局群聊行为：

```json5
{
  messages: {
    groupChat: {
      unmentionedInbound: "room_event",
      visibleReplies: "message_tool",
      historyLimit: 50,
    },
  },
}
```

然后通过为该房间禁用提及门控，将房间本身配置为始终在线。该频道仍必须被其正常的 `groupPolicy`、房间允许列表和发送者允许列表允许。

保存配置后，Gateway 会热重载 `messages` 设置。只有在禁用文件监视或配置重载时才需要重启。

## 变化内容

使用 `messages.groupChat.unmentionedInbound: "room_event"` 时：

- 未被点名且被允许的群组或频道消息会变成安静的房间事件
- 被点名的消息仍然是用户请求
- 文本命令和原生命令仍然是用户请求
- 中止或停止请求仍然是用户请求
- 直接消息仍然是用户请求

房间事件使用严格的可见交付。最终助手文本是私有的。代理必须调用 `message(action=send)` 才能在房间中发帖。

## Discord 示例

```json5
{
  messages: {
    groupChat: {
      unmentionedInbound: "room_event",
      visibleReplies: "message_tool",
      historyLimit: 50,
    },
  },
  channels: {
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        "<DISCORD_SERVER_ID>": {
          requireMention: false,
          users: ["<YOUR_DISCORD_USER_ID>"],
        },
      },
    },
  },
}
```

当只有一个频道应处于环境模式时，请使用按频道的 Discord 配置：

```json5
{
  channels: {
    discord: {
      guilds: {
        "<DISCORD_SERVER_ID>": {
          channels: {
            "<DISCORD_CHANNEL_ID_OR_NAME>": {
              allow: true,
              requireMention: false,
            },
          },
        },
      },
    },
  },
}
```

## Slack 示例

Slack 频道允许列表以 ID 为先。请使用诸如 `C12345678` 之类的频道 ID，而不是 `#channel-name`。

```json5
{
  messages: {
    groupChat: {
      unmentionedInbound: "room_event",
      visibleReplies: "message_tool",
      historyLimit: 50,
    },
  },
  channels: {
    slack: {
      groupPolicy: "allowlist",
      channels: {
        "<SLACK_CHANNEL_ID>": {
          allow: true,
          requireMention: false,
        },
      },
    },
  },
}
```

## Telegram 示例

对于 Telegram 群组，机器人必须能够看到正常的群组消息。如果 `requireMention: false`，请禁用 BotFather 隐私模式，或使用其他能将完整群组流量传递给机器人的 Telegram 设置。

```json5
{
  messages: {
    groupChat: {
      unmentionedInbound: "room_event",
      visibleReplies: "message_tool",
      historyLimit: 50,
    },
  },
  channels: {
    telegram: {
      groups: {
        "<TELEGRAM_GROUP_CHAT_ID>": {
          groupPolicy: "open",
          requireMention: false,
        },
      },
    },
  },
}
```

Telegram 群组 ID 通常是负数，例如 `-1001234567890`。可通过 `openclaw logs --follow` 读取 `chat.id`，将群组消息转发给 ID 辅助机器人，或检查 Bot API 的 `getUpdates`。

## 代理特定策略

当多个代理共享同一个房间，但只有一个代理应将未点名聊天视为环境上下文时，请使用代理覆盖：

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "message_tool",
    },
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: {
          unmentionedInbound: "room_event",
          mentionPatterns: ["@openclaw", "openclaw"],
        },
      },
    ],
  },
}
```

代理特定的 `agents.list[].groupChat.unmentionedInbound` 值会覆盖该代理的 `messages.groupChat.unmentionedInbound`。

## 可见回复模式

对于正常的群组/频道用户请求，`messages.groupChat.visibleReplies` 默认是 `"automatic"`。当你希望最终助手文本无需显式调用 message 工具就能可见地发帖时，请保持该默认值。

对于环境化的始终在线房间，仍推荐使用 `messages.groupChat.visibleReplies: "message_tool"`，尤其是在最新一代、工具调用可靠的模型（如 GPT 5.5）上。它让代理通过调用 message 工具来决定何时发言。如果模型返回了最终文本但没有调用工具，OpenClaw 会将该最终文本保持私有，并记录被抑制的交付元数据。

即使其他群组请求使用自动回复，房间事件仍保持严格模式。未点名的环境房间事件仍然需要 `message(action=send)` 才能可见输出。

## 历史记录

`messages.groupChat.historyLimit` 控制全局群组历史默认值。频道可以通过 `channels.<channel>.historyLimit` 覆盖它，并且某些频道还支持按账户的历史限制。

将 `historyLimit: 0` 设为禁用群组历史上下文。

受支持的房间事件频道会将最近的环境房间消息保留为上下文。Discord 会一直保留房间事件历史，直到一次可见的 Discord 发送成功，因此在 message-tool 交付之前，安静上下文不会丢失。

## 故障排查

如果房间显示了打字或 token 使用情况，但没有可见消息：

1. 确认该房间已被频道允许列表和发送者允许列表允许。
2. 确认你期望的房间级别已设置 `requireMention: false`。
3. 检查 `messages.groupChat.unmentionedInbound` 或代理覆盖是否为 `"room_event"`。
4. 检查日志中是否有被抑制的最终有效载荷元数据或 `didSendViaMessagingTool: false`。
5. 对于正常群组请求，如果你希望最终回复自动发帖，请保持或恢复 `messages.groupChat.visibleReplies: "automatic"`。对于使用 `message_tool` 的环境房间，请使用能可靠调用工具的模型/运行时。

如果 Telegram 环境房间完全没有触发，请检查 BotFather 隐私模式并确认 Gateway 正在接收正常的群组消息。

如果 Slack 环境房间没有触发，请验证频道键是 Slack 频道 ID，并且该应用具有该房间类型所需的 `channels:history` 或 `groups:history` 范围。

## 相关内容

- [群组](/channels/groups)
- [Discord](/channels/discord)
- [Slack](/channels/slack)
- [Telegram](/channels/telegram)
- [频道故障排查](/channels/troubleshooting)
- [频道配置参考](/gateway/config-channels)
