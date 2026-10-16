---
summary: "Bot 到 bot 循环保护默认值和通道覆盖"
read_when:
  - "配置由机器人撰写的频道消息"
  - "调整机器人到机器人循环保护"
title: "Bot 循环保护"
sidebarTitle: "Bot 循环保护"
---

OpenClaw 可以接受其他机器人在支持 `allowBots` 的通道上编写的消息。 Discord和Slack在正常提及和访问规则下默认接受它们；显式的 `allowBots: false` 仍然会禁用机器人触发的回合。机器人消息可以作为对话上下文保持可见，而与轮次许可无关。

配对循环保护限制了两个机器人身份之间的快速交换。这是一个滑动窗口速率保护，因此低于预算的较慢交换可以继续。

该保护由核心入站回复运行器强制执行。每个受支持的频道都会将其入站事件映射为通用事实：账户或作用域、会话 id、发送方机器人 id 和接收方机器人 id。核心会以两个方向跟踪参与者配对（A 到 B 和 B 到 A 计为同一配对），应用滑动窗口预算，并在超出预算后于冷却期内抑制该配对。

## <a id="defaults"></a> 默认值

当某个频道允许机器人发送的消息进入调度时，配对循环保护就会生效。内置默认值：

| 键                  | 默认值 | 含义                                             |
| -------------------- | ------- | --------------------------------------------------- |
| `enabled`            | `true`  | 对支持它的频道启用保护。          |
| `maxEventsPerWindow` | `20`    | 一个机器人配对在时间窗口内可交换的事件数。   |
| `windowSeconds`      | `60`    | 滑动窗口长度。                              |
| `cooldownSeconds`    | `60`    | 配对超过额度后的抑制时间。 |

该保护不会影响人类发送的消息、单机器人部署、自发消息过滤，或仍在额度内的机器人回复。

## <a id="configure-shared-defaults"></a> 配置共享默认值

设置 `channels.defaults.botLoopProtection` 一次即可为每个支持通道提供相同的基线。通道也可能会暴露更窄的覆盖范围； Feishu 有意仅使用此共享基线。

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

## <a id="override-per-channel%2C-account%2C-or-room"></a><a id="override-per-channel-account-or-room"></a> 按频道、账号或房间覆盖

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
          allowBots: true,
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

## <a id="channel-support"></a> 频道支持

- Discord：原生 `author.bot` 事实，按 Discord 账号、频道和 bot 对进行键控。
- Feishu：已承认的机器人编写的群组消息的本机 `sender_type=bot` 事实，由 Feishu 帐户、聊天和机器人对键入。 Feishu 仅使用 `channels.defaults.botLoopProtection`。
- Google Chat：对被接纳的 bot 发送的消息使用原生 `sender.type=BOT` 事实，按账号、空间和 bot 对进行键控。
- Matrix：已配置的 Matrix bot 账号，按 Matrix 账号、房间和已配置的 bot 对进行键控。
- Slack：对被接纳的 bot 发送的消息使用原生 `bot_id` 事实，按 Slack 账号、频道和 bot 对进行键控。

无法暴露可靠入站 bot 身份的频道将继续使用其正常的自消息和访问策略过滤器。在能够识别 bot 对中的两个参与者之前，它们不应启用此保护。

有关插件实现细节，请参见 [SDK 运行时](/plugins/sdk-runtime#reusable-runtime-utilities)。

## <a id="internal-agent-group-rounds"></a> 内部代理团查房

[代理组线程](/channels/broadcast-groups)为共享一条入站消息的参与者使用单独的协调器预算。合格的 `broadcast` 参赛作品最多允许 4 轮和 32 名参赛者轮流。 `maxRounds` 包含首轮； `maxTurns` 对已启动的代理运行进行计数，并在并行启动之前保留插槽。每个通过的参与者，无论是限制还是取消都会停止进一步的转弯。

参与者轮流可以通过分块、预览或消息工具发送来产生多个物理消息。协调器不计算这些消息。其内存预算仅限于通道、帐户、对话、线程和根消息，并且在网关重新启动后无法恢复。

内部延续具有不同的标识，因此普通的入站重复数据删除不会抑制它们。它们不会改变传输对防护的阈值或取代通道机器人准入和自我消息策略。对来自平台的机器人编写的消息启用这些保护。
