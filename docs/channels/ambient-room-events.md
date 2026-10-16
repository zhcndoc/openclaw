---
summary: "让受支持的群组房间提供安静上下文，除非代理使用 message 工具发送消息"
read_when:
  - "配置始终在线的群组或频道房间"
  - "你希望代理在不自动发布最终文本的情况下监听房间聊天"
  - "调试无可见房间消息时的打字与 token 使用情况"
title: "环境房间事件"
sidebarTitle: "环境房间事件"
---

环境房间事件让 OpenClaw 能将未被点名的群组或频道聊天作为安静上下文来处理。代理可以更新记忆和会话状态，但除非代理显式调用 `message` 工具，否则房间保持静默。

对于始终在线的群组聊天，请将 `messages.groupChat.unmentionedInbound: "room_event"` 与 `messages.groupChat.visibleReplies: "message_tool"` 结合使用。代理会监听，判断何时回复有用，并且不再需要旧的提示模式 `NO_REPLY`。

目前支持：Discord 公会频道、Slack 频道和私人频道、Slack 多人 DM 以及 Telegram 群组或超级群组。其他群组频道会保留其现有的群组行为，除非其频道页面表示支持环境房间活动。

## <a id="recommended-setup"></a> 推荐设置

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

## <a id="prerequisites"></a> 先决条件

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

使用 `openclaw agents list` 和测试对话检查有效表面，而不是假设轮廓包含它。

保存配置后，网关热应用 `messages` 设置。使用 `gateway.reload.mode: "off"`，手动重新启动以应用更改。

## <a id="what-changes"></a> 变化内容

使用 `messages.groupChat.unmentionedInbound: "room_event"` 时：

- 未提及的允许群组或频道消息会变成静默的房间事件
- 被提及的消息仍然是用户请求
- 文本控制命令和原生命令仍然是用户请求
- 中止或停止请求仍然是用户请求
- 直接消息仍然是用户请求

房间事件使用严格的可见交付。最终助手文本是私有的。代理必须调用 `message(action=send)` 才能在房间中发帖。

对于房间事件，输入状态和生命周期状态反应仍然会被抑制。唯一明确的回执例外是 `messages.ackReactionScope: "all"`，它会发送配置的确认反应；当房间必须保持完全静默时，请使用任何更窄的范围或 `"off"`。

## <a id="discord-example"></a> Discord 示例

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

## <a id="slack-example"></a> Slack 示例

Slack 频道许可列表为 ID-first。使用 `C12345678` 等通道 ID，而不是 `#channel-name`。在 `channels.slack.channels` 下列出通道是允许的（`enabled: false` 禁用条目）：

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

## <a id="telegram-example"></a> Telegram 示例

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

Telegram 组 ID 通常为负数，例如 `-1001234567890`。从 `openclaw logs --follow` 读取 `chat.id`，将群组消息转发到 ID 帮助机器人，或检查机器人 API `getUpdates`。

## <a id="agent-specific-policy"></a> 代理特定策略

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

## <a id="visible-reply-modes"></a> 可见回复模式

对于普通 group/channel 用户请求，`messages.groupChat.visibleReplies` 默认为 `"automatic"`。当最终的助理文本应该在没有显式消息工具调用的情况下可见地发布时，请保留该默认设置。

对于环境始终在线的房间，仍然建议使用 `messages.groupChat.visibleReplies: "message_tool"` 以及可靠使用工具的模型。它让座席通过调用消息工具来决定何时发言。如果模型返回最终文本而不调用该工具，OpenClaw 会将该最终文本保持私有并记录抑制传递元数据。

即使其他群组请求使用 automatic 回复，房间事件仍然保持严格模式。未被提及的 ambient 房间事件始终需要使用 `message(action=send)` 才能可见输出。

## <a id="history"></a> 历史记录

`messages.groupChat.historyLimit` 设置全局组历史默认值（未设置时为 50；必须是正整数）。通道可以使用 `channels.<channel>.historyLimit` 覆盖它，并且某些通道还支持每个帐户的历史记录限制。设置通道级别 `historyLimit: 0` 以禁用该通道的组历史上下文。

受支持的房间事件频道会将最近的环境房间消息保留为上下文。Telegram 会为每个群组维持一个始终开启的滚动窗口，并受 `historyLimit` 限制；用户请求轮次会在机器人上一次记录的回复之后选择条目，而房间事件轮次会接收完整的最近窗口，这样模型就能看到自己最近的发言。已弃用的 Telegram `includeGroupHistoryContext` 模式键会被 `openclaw doctor --fix` 移除。

## <a id="troubleshooting"></a> 故障排查

如果房间显示了打字或 token 使用情况，但没有可见消息：

1. 确认该房间已被频道允许列表和发送者允许列表允许。
2. 确认你期望的房间级别已设置 `requireMention: false`。
3. 检查 `messages.groupChat.unmentionedInbound` 或代理覆盖是否为 `"room_event"`。
4. 检查日志中是否有被抑制的最终有效载荷元数据或 `didSendViaMessagingTool: false`。
5. 对于普通群组请求，如果您希望自动发布最终回复，请保留或恢复 `messages.groupChat.visibleReplies: "automatic"`。对于使用 `message_tool` 的环境房间，请使用可靠调用工具的 model/runtime。

如果 Telegram 环境房间完全没有触发，请检查 BotFather 隐私模式并确认 Gateway 正在接收正常的群组消息。

如果 Slack 环境房间没有触发，请验证频道键是否为 Slack 频道 ID，并且应用程序已拥有该房间类型的历史范围：`channels:history`（公开）、`groups:history`（私密）或 `mpim:history`（多人私信）。

## <a id="related"></a> 相关内容

- [群组](/channels/groups)
- [Discord](/channels/discord)
- [Slack](/channels/slack)
- [电报](/channels/telegram)
- [通道故障排除](/channels/troubleshooting)
- [频道配置参考](/gateway/config-channels)
