---
summary: "Bot-to-bot 循环保护默认值和通道覆盖"
read_when:
  - 配置由机器人撰写的频道消息
  - 调整机器人到机器人循环保护
title: "Bot 循环保护"
sidebarTitle: "Bot 循环保护"
---

# Bot 循环保护

OpenClaw 可以接受在支持 `allowBots` 的频道中由其他机器人编写的消息。
当启用该路径时，成对循环保护会防止两个机器人身份
无限期地互相回复。

核心入站回复运行器会强制执行该保护。每个受支持的频道都会将自己的入站事件
映射为通用事实：账户或作用域、会话 id、发送方机器人 id 和接收方机器人 id。
随后，核心会在两个方向上跟踪参与者对，应用滑动窗口预算，
并在超出预算后在冷却期内抑制该参与者对。

## 默认值

当某个频道允许机器人撰写的消息进入调度时，成对循环保护会生效。内置默认值为：

- `maxEventsPerWindow: 20` - 一个机器人对在窗口内最多可以交换 20 个事件
- `windowSeconds: 60` - 滑动窗口长度
- `cooldownSeconds: 60` - 参与者对超出预算后的抑制时间

该保护不会影响正常的人工撰写消息、单机器人部署、
自消息过滤，或保持在预算内的一次性机器人回复。

## 配置共享默认值

设置一次 `channels.defaults.botLoopProtection`，即可为每个支持的频道提供
相同的基线。频道和账户覆盖仍然可以调整各自的
表面。

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

仅当你的频道策略有意允许
机器人到机器人对话而不进行自动抑制时，才设置 `enabled: false`。

## 按频道或账户覆盖

支持的频道会在共享默认值之上叠加各自的配置。优先级顺序为：

- `channels.<channel>.<room-or-space>.botLoopProtection`，当频道支持按会话覆盖时
- `channels.<channel>.accounts.<account>.botLoopProtection`，当频道支持账户时
- `channels.<channel>.botLoopProtection`，当频道支持顶层默认值时
- `channels.defaults.botLoopProtection`
- 内置默认值

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
        molty: {
          allowBots: "mentions",
          botLoopProtection: {
            maxEventsPerWindow: 5,
            cooldownSeconds: 90,
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
  },
}
```

## 频道支持

- Discord：原生 `author.bot` 事实，按 Discord 账户、频道和机器人对进行键控。
- Slack：用于被接受的机器人撰写消息的原生 `bot_id` 事实，按 Slack 账户、频道和机器人对进行键控。
- Matrix：已配置的 Matrix 机器人账户，按 Matrix 账户、房间和已配置的机器人对进行键控。
- Google Chat：用于被接受的机器人撰写消息的原生 `sender.type=BOT` 事实，按账户、空间和机器人对进行键控。

无法暴露可靠入站机器人身份的频道将继续使用其
常规的自消息和访问策略过滤。它们不应启用此
保护，直到它们能够识别机器人对中的两个参与者为止。

有关插件实现详情，请参见 [SDK runtime](/plugins/sdk-runtime#reusable-runtime-utilities)。
