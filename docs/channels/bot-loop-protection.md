---
summary: "Bot-to-bot 循环保护默认值和通道覆盖"
read_when:
  - 配置由机器人撰写的频道消息
  - 调整机器人到机器人循环保护
title: "Bot 循环保护"
sidebarTitle: "Bot 循环保护"
---

OpenClaw 可以接受其他机器人在支持 `allowBots` 的频道上编写的消息。当该路径启用时，成对循环保护会防止两个机器人身份无限期地互相回复。

该保护由核心入站回复运行器强制执行。每个受支持的频道都会将其入站事件映射为通用事实：账户或作用域、会话 id、发送方机器人 id 和接收方机器人 id。核心会以两个方向跟踪参与者配对（A 到 B 和 B 到 A 计为同一配对），应用滑动窗口预算，并在超出预算后于冷却期内抑制该配对。

## 默认值

当某个频道允许机器人发送的消息进入调度时，配对循环保护就会生效。内置默认值：

| 键                   | 默认值  | 含义                                                |
| -------------------- | ------- | --------------------------------------------------- |
| `enabled`            | `true`  | 对支持它的频道启用保护。                             |
| `maxEventsPerWindow` | `20`    | 一个机器人配对在时间窗口内可交换的事件数。          |
| `windowSeconds`      | `60`    | 滑动窗口长度。                                       |
| `cooldownSeconds`    | `60`    | 配对超过额度后的抑制时间。                           |

该保护不会影响人类发送的消息、单机器人部署、自发消息过滤，或仍在额度内的机器人回复。

## 配置共享默认值

将 `channels.defaults.botLoopProtection` 只设置一次，即可为每个受支持的频道提供相同的基础配置。频道、账户和房间级别的覆盖仍然可以对各自的界面进行微调。

```json5
{
  channels: {
    defaults: {
      botLoopProtection: {
        maxEventsPerWindow: 20,
        windowSeconds: 60,
        cooldownSeconds: 60,
      },
    },
  },
}
```

仅当你的频道策略有意允许机器人之间的对话，而不进行自动抑制时，才将 `enabled: false`。

## 按频道、账号或房间覆盖

支持的频道会将各自的配置按键逐项叠加到共享默认值之上。优先级如下，越具体的越优先：

1. `channels.<channel>.<room-or-space>.botLoopProtection`，当该频道支持按会话覆盖时
2. `channels.<channel>.accounts.<account>.botLoopProtection`，当该频道支持账号时
3. `channels.<channel>.botLoopProtection`，当该频道支持顶层默认值时
4. `channels.defaults.botLoopProtection`
5. 内置默认值

```json5
{
  channels: {
    defaults: {
      botLoopProtection: {
        maxEventsPerWindow: 20,
      },
    },
    discord: {
      botLoopProtection: {
        maxEventsPerWindow: 8,
      },
      accounts: {
        secondary: {
          allowBots: "mentions",
          botLoopProtection: {
            maxEventsPerWindow: 5,
            cooldownSeconds: 90,
          },
        },
      },
    },
    googlechat: {
      allowBots: true,
      groups: {
        "spaces/AAAA": {
          botLoopProtection: {
            maxEventsPerWindow: 5,
          },
        },
      },
    },
    matrix: {
      allowBots: "mentions",
      groups: {
        "!roomid:example.org": {
          botLoopProtection: {
            maxEventsPerWindow: 5,
          },
        },
      },
    },
    slack: {
      allowBots: "mentions",
      botLoopProtection: {
        maxEventsPerWindow: 8,
      },
    },
  },
}
```

## 频道支持

- Discord：原生 `author.bot` 事实，按 Discord 账户、频道和 bot 对进行键控。
- Google Chat：对于已接受的 bot-authored 消息，原生 `sender.type=BOT` 事实，按账户、空间和 bot 对进行键控。
- Matrix：已配置的 Matrix bot 账户，按 Matrix 账户、房间和已配置的 bot 对进行键控。
- Slack：对于已接受的 bot-authored 消息，原生 `bot_id` 事实，按 Slack 账户、频道和 bot 对进行键控。

无法暴露可靠入站 bot 身份的频道将继续使用其正常的自消息和访问策略过滤器。在能够识别 bot 对中的两个参与者之前，它们不应启用此保护。

有关插件实现细节，请参见 [SDK 运行时](/plugins/sdk-runtime#reusable-runtime-utilities)。
