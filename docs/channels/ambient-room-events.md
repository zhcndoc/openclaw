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

对于始终在线的群组聊天，请将 `messages.groupChat.unmentionedInbound: "room_event"` 与 `messages.groupChat.visibleReplies: "message_tool"` 结合使用。代理会监听，判断何时回复有用，并且不再需要旧的提示模式 `NO_REPLY`。

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

然后通过为该房间禁用提及门控，使该房间始终保持开启状态。该房间仍必须通过其正常的 `groupPolicy`、房间允许名单和发送者允许名单。

## 先决条件

即使设置了 `unmentionedInbound: "room_event"`，两个设置也会静默禁用 ambient room events。

**房间的提及门控必须关闭。** `requireMention: true` 会在路由之前丢弃未被提及的消息，因此它们永远不会成为 room events。这样一来，agent 完全没有 room backlog——它只能看到提及了它的消息。如果 agent 报告它看不到最近的房间历史，先检查提及门控，而不是别的。

**agent 需要 `message` 工具。** Room events 使用严格的可见投递，因此发送需要 `message(action=send)`。`message` 工具随 `messaging` 工具配置文件一起提供；`minimal` 和 `coding` 配置文件不包含它。配置文件为 `tools.profile: "coding"` 的 agent 会监听 room events，但永远不能发言。如果配置文件省略了它，就显式授予：

```json5
{
  agents: {
    entries: {
      "<agent-id>": {
        tools: { alsoAllow: ["message"] },
      },
    },
  },
}
```

使用 `openclaw agents list` 和一次 probe turn 检查实际生效的 surface，不要假定配置文件一定包含它。

保存配置后，Gateway 会热加载 `messages` 设置。只有在文件监听或配置重载被禁用时（`gateway.reload.mode: "off"`）才需要重启。

## 变化内容

使用 `messages.groupChat.unmentionedInbound: "room_event"` 时：

- 未提及的允许群组或频道消息会变成静默的房间事件
- 被提及的消息仍然是用户请求
- 文本控制命令和原生命令仍然是用户请求
- 中止或停止请求仍然是用户请求
- 直接消息仍然是用户请求

房间事件使用严格的可见交付。最终助手文本是私有的。代理必须调用 `message(action=send)` 才能在房间中发帖。

对于房间事件，输入状态和生命周期状态反应仍然会被抑制。唯一明确的回执例外是 `messages.ackReactionScope: "all"`，它会发送配置的确认反应；当房间必须保持完全静默时，请使用任何更窄的范围或 `"off"`。

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

当只有一个频道应为 ambient 时，使用按频道的 Discord 配置。在 `groupPolicy: "allowlist"` 下，列出该频道即表示允许它（`enabled: false` 会禁用一个条目）：

```json5
{
  channels: {
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        "<DISCORD_SERVER_ID>": {
          channels: {
            "<DISCORD_CHANNEL_ID_OR_NAME>": {
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

Slack 频道允许名单以 ID 为先。请使用频道 ID，例如 `C12345678`，而不是 `#channel-name`。在 `channels.slack.channels` 下列出频道才会允许它（`enabled: false` 会禁用某个条目）：

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
    entries: {
      main: {
        default: true,
        groupChat: {
          unmentionedInbound: "room_event",
          mentionPatterns: ["@openclaw", "openclaw"],
        },
      },
    },
  },
}
```

代理特定的 `agents.entries.*.groupChat.unmentionedInbound` 值会覆盖该代理的 `messages.groupChat.unmentionedInbound`。

## 可见回复模式

对于普通群组/频道用户请求，`messages.groupChat.visibleReplies` 默认值为 `"automatic"`。当最终助手文本应当以可见方式发布且没有显式的 message-tool 调用时，请保持该默认值。

对于 ambient 始终在线房间，仍然建议使用 `messages.groupChat.visibleReplies: "message_tool"`，尤其是在最新一代、工具调用可靠的模型（如 GPT-5.6 Sol）上。它允许代理通过调用 message 工具来决定何时发言。如果模型在没有调用该工具的情况下返回最终文本，OpenClaw 会将该最终文本保留为私有，并记录被抑制投递的元数据。

即使其他群组请求使用 automatic 回复，房间事件仍然保持严格模式。未被提及的 ambient 房间事件始终需要使用 `message(action=send)` 才能可见输出。

## 历史记录

`messages.groupChat.historyLimit` 设置全局群组历史记录默认值（未设置时为 50；必须是正整数）。各频道可以通过 `channels.<channel>.historyLimit` 覆盖它，且某些频道还支持按账户设置历史记录限制。将频道级 `historyLimit: 0` 设为 0，可禁用该频道的群组历史上下文。

受支持的房间事件频道会将最近的环境房间消息保留为上下文。Telegram 会为每个群组维持一个始终开启的滚动窗口，并受 `historyLimit` 限制；用户请求轮次会在机器人上一次记录的回复之后选择条目，而房间事件轮次会接收完整的最近窗口，这样模型就能看到自己最近的发言。已弃用的 Telegram `includeGroupHistoryContext` 模式键会被 `openclaw doctor --fix` 移除。

## 故障排查

如果房间显示了打字或 token 使用情况，但没有可见消息：

1. 确认该房间已被频道允许列表和发送者允许列表允许。
2. 确认你期望的房间级别已设置 `requireMention: false`。
3. 检查 `messages.groupChat.unmentionedInbound` 或代理覆盖是否为 `"room_event"`。
4. 检查日志中是否有被抑制的最终有效载荷元数据或 `didSendViaMessagingTool: false`。
5. 对于正常群组请求，如果你希望最终回复自动发帖，请保持或恢复 `messages.groupChat.visibleReplies: "automatic"`。对于使用 `message_tool` 的环境房间，请使用能可靠调用工具的模型/运行时。

如果 Telegram 环境房间完全没有触发，请检查 BotFather 隐私模式并确认 Gateway 正在接收正常的群组消息。

如果 Slack 环境房间没有触发，请验证频道键是否为 Slack 频道 ID，并且应用程序已拥有该房间类型的历史范围：`channels:history`（公开）、`groups:history`（私密）或 `mpim:history`（多人私信）。

## 相关内容

- [群组](/channels/groups)
- [Discord](/channels/discord)
- [Slack](/channels/slack)
- [Telegram](/channels/telegram)
- [频道故障排查](/channels/troubleshooting)
- [频道配置参考](/gateway/config-channels)
