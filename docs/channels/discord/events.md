---
summary: "反应通知、存在事件和配置、配置写入、代理和 PluralKit"
read_when:
  - "在 Discord 反应或状态变化时唤醒代理"
  - "设置机器人存在、网关代理或 PluralKit 支持"
title: "Discord 事件和操作"
sidebarTitle: "事件和操作"
---

操作 Discord 表面：反应和存在唤醒、机器人存在、网关代理、配置写入和 PluralKit。

## <a id="events-and-operations"></a> 事件和操作

<AccordionGroup>
  <Accordion id="reaction-notifications" title="反应通知">
    每个 guild 的反应通知模式（`guilds.<id>.reactionNotifications`）：

    - `off`
    - `own`（默认）
    - `all`
    - `allowlist`（使用 `guilds.<id>.users`）

    反应事件会被转换为系统事件并附加到路由到的 Discord 会话中。

  </Accordion>

  <Accordion id="online-presence-events" title="在线出席活动">
    当某个人类成员从离线切换到在线时，可将某个 guild 纳入路由后的代理唤醒：

    ```json5
    {
      channels: {
        discord: {
          intents: { presence: true },
          guilds: {
            "111111111111111111": {
              presenceEvents: {
                channelId: "222222222222222222",
                users: ["333333333333333333"], // optional; further narrow channel viewers
                reconnectSuppressSeconds: 300, // optional; new-session quiet window (0 disables)
                burstLimit: 8, // optional; max events per burst window
                burstWindowSeconds: 60, // optional; sliding burst-detection window
              },
            },
          },
        },
      },
    }
    ```

    `presenceEvents` 需要为路由代理启用心跳以及 Discord 开发人员门户中应用程序的 Bot 页面上的特权 **Presence Intent**。 OpenClaw 从每个完整的 `GUILD_CREATE` 快照中播种当前在线成员，路由观察到的离线到在线转换，并将未见过的成员的稍后首次在线信号视为新可用。该成员可能在快照之后上线或加入，因此该事件不会断言确切的先前状态。只有可以查看 `channelId` 的人员才有资格：通道和公共线程需要通道或父级上的 **View Channel**，而专用线程还需要成员资格或 **Manage Threads**。 `users` 可以进一步缩小受众范围。 OpenClaw 忽略机器人和未更改的在线状态，并在网关重新启动时保持每用户八小时的冷却时间。当Discord建立新的网关会话并发送`READY`时，OpenClaw会在重建公会存在状态时抑制`reconnectSuppressSeconds`的存在衍生事件（默认300，`0`禁用），因此重新观察的成员无法一一唤醒代理。它还将每个公会成功排队的事件速率限制为每个 `burstWindowSeconds` 滑动窗口（默认 60）的 `burstLimit` 事件（默认 8），记录每个公会的压制事件一次。恢复的会话不被视为新会话。 Discord 限制75000名以上成员的公会快照；在那里，OpenClaw 需要在问候之前进行显式离线更新。系统事件携带不可变的用户、行会和频道 ID，而不嵌入可变的显示名称。智能体决定是否以及如何打招呼。

  </Accordion>

  <Accordion id="presence-configuration" title="存在配置">
    当你设置状态或活动字段，或者启用自动状态时，会应用状态更新。

    仅状态：

```json5
{
  channels: {
    discord: {
      status: "idle",
    },
  },
}
```

    活动（当设置了 `activity` 时，自定义状态是默认活动类型）：

```json5
{
  channels: {
    discord: {
      activity: "Focus time",
      activityType: 4,
    },
  },
}
```

    流媒体：

```json5
{
  channels: {
    discord: {
      activity: "Live coding",
      activityType: 1,
      activityUrl: "https://twitch.tv/openclaw",
    },
  },
}
```

    活动类型映射：

    - 0：游玩
    - 1：直播（需要 `activityUrl`；而 `activityUrl` 又要求 `activityType: 1`）
    - 2：听歌
    - 3：观看
    - 4：自定义（将活动文本作为状态值；表情可选）
    - 5：竞技

    自动状态（运行时健康信号）：

```json5
{
  channels: {
    discord: {
      autoPresence: {
        enabled: true,
        intervalMs: 30000,
        minUpdateIntervalMs: 15000,
      },
    },
  },
}
```

    自动状态会将运行时可用性映射为 Discord 状态：健康 ⇒ 在线，降级或未知 ⇒ 闲置，耗尽或不可用 ⇒ 请勿打扰。默认值：`intervalMs` 为 30000，`minUpdateIntervalMs` 为 15000（必须小于或等于 `intervalMs`）。

  </Accordion>

  <Accordion id="config-writes" title="配置写入">
    默认启用由频道发起的配置写入。这会影响 `/config set|unset` 流程（当命令功能启用时）。

    禁用：

```json5
{
  channels: {
    discord: {
      configWrites: false,
    },
  },
}
```

  </Accordion>

  <Accordion id="gateway-proxy" title="网关代理">
    通过 `channels.discord.proxy` 将 Discord 网关 WebSocket 流量和启动时 REST 查询（应用 ID + 允许列表解析）路由到 HTTP(S) 代理。 Discord 网关 WebSocket 代理是显式的；WebSocket 连接不会从 Gateway 进程继承环境中的代理变量。配置了 `channels.discord.proxy` 时，启动时 REST 查询会使用此代理。

```json5
{
  channels: {
    discord: {
      proxy: "http://proxy.example:8080",
    },
  },
}
```

    每个帐户覆盖：

```json5
{
  channels: {
    discord: {
      accounts: {
        primary: {
          proxy: "http://proxy.example:8080",
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion id="pluralkit-support" title="PluralKit 支持">
    启用 PluralKit 解析以将代理消息映射到系统成员身份：

```json5
{
  channels: {
    discord: {
      pluralkit: {
        enabled: true,
        token: "pk_live_...", // optional; needed for private systems
      },
    },
  },
}
```

    注意：

    - 允许列表可以使用 `pk:<memberId>`
    - 仅当 `channels.discord.dangerouslyAllowNameMatching: true` 时， 成员显示名称才与 name/slug 匹配
    - lookups 使用原始消息 ID 查询 PluralKit API
    - 如果查找失败，代理消息会被视为机器人消息并丢弃，除非 `allowBots` 允许其通过

  </Accordion>
</AccordionGroup>
