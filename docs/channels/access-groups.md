---
summary: "消息渠道的可复用发送者允许列表"
read_when:
  - "为多个消息渠道配置相同的允许列表时"
  - "共享 DM 和群组发送者访问规则时"
  - "审查消息渠道访问控制时"
title: "访问组"
---

访问组是你在 `accessGroups` 下定义一次，并通过通道允许列表中的 `accessGroup:<name>` 引用的命名发送者列表。

当应允许同一个人跨多个消息通道时，或者当一组可信集应适用于 DM 和群组发件人授权时，请使用它们。

组本身不会授予任何权限。只有在允许列表字段引用它时，它才会产生作用。

## <a id="static-message-sender-groups"></a> 静态消息发送者组

静态发件人组使用 `type: "message.senders"`。 `members` 由消息通道 id 加上 `"*"` 来作为每个通道共享的条目的键控：

```json5
{
  accessGroups: {
    operators: {
      type: "message.senders",
      members: {
        "*": ["global-owner-id"],
        discord: ["discord:123456789012345678"],
        telegram: ["987654321"],
        whatsapp: ["+15551234567"],
      },
    },
  },
}
```

| 键                        | 含义                                                                     |
| -------------------------- | --------------------------------------------------------------------------- |
| `"*"`                      | 对引用该组的每个消息频道都会检查的共享条目。 |
| `discord`, `telegram`, ... | 仅针对该频道的允许列表匹配进行检查的条目。                 |

条目与目标通道的正常 `allowFrom` 规则相匹配。 OpenClaw 不会在通道之间转换发件人 ID：如果 Alice 有 Telegram id 和 Discord id，则在匹配的通道密钥下列出这两个 id。

## <a id="reference-groups-from-allowlists"></a> 在允许列表中引用组

在消息渠道路径支持发送者允许列表的任何位置，都可以使用 `accessGroup:<name>` 引用组。

DM 允许列表示例：

```json5
{
  accessGroups: {
    operators: {
      type: "message.senders",
      members: {
        discord: ["discord:123456789012345678"],
        telegram: ["987654321"],
      },
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:operators"],
    },
    telegram: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:operators"],
    },
  },
}
```

群组发送者允许列表示例：

```json5
{
  accessGroups: {
    oncall: {
      type: "message.senders",
      members: {
        whatsapp: ["+15551234567"],
        googlechat: ["users/1234567890"],
      },
    },
  },
  channels: {
    whatsapp: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["accessGroup:oncall"],
    },
    googlechat: {
      groups: {
        "spaces/AAA": {
          users: ["accessGroup:oncall"],
        },
      },
    },
  },
}
```

你可以混合使用组和直接条目：

```json5
{
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:operators", "discord:123456789012345678"],
    },
  },
}
```

## <a id="supported-message-channel-paths"></a> 支持的消息渠道路径

访问组可用于共享的消息渠道授权路径中：

- DM 发送者允许列表，例如 `channels.<channel>.allowFrom`
- 群组发送者允许列表，例如 `channels.<channel>.groupAllowFrom`
- 使用相同发送者匹配规则的、按房间划分的频道特定发送者允许列表（例如 Google Chat `groups.<space>.users`）
- 复用消息渠道发送者允许列表的命令授权路径

消息渠道是否受支持取决于该渠道是否通过共享的 OpenClaw 发送者授权辅助工具接入。目前受支持的渠道集成包括 ClickClack、Discord、Feishu、Google Chat、iMessage、IRC、LINE、Mattermost、Microsoft Teams、Nextcloud Talk、Nostr、QQ Bot、Signal、Slack、SMS、Telegram、WhatsApp、Zalo 和 Zalo Personal。静态的 `message.senders` 组与具体渠道无关，因此新消息渠道只需使用共享插件 SDK 的入口辅助工具，而无需自定义允许列表扩展，即可获得这些支持。

## <a id="discord-channel-audiences"></a> Discord 渠道受众

Discord 还支持一种动态访问组类型：

```json5
{
  accessGroups: {
    maintainers: {
      type: "discord.channelAudience",
      guildId: "1456350064065904867",
      channelId: "1456744319972282449",
      membership: "canViewChannel",
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:maintainers"],
    },
  },
}
```

`discord.channelAudience`的意思是“允许Discord DM当前可以查看该公会频道的发件人”。 OpenClaw 在授权时通过 Discord 解析发件人，并应用 Discord `ViewChannel` 权限规则。 `membership` 可选，默认为 `canViewChannel`。

当某个 Discord 频道已经是团队的事实来源时使用它，例如 `#maintainers` 或 `#on-call`。

要求与失败行为：

- 机器人需要能够访问该服务器和频道。
- 机器人需要启用 Discord Developer Portal 的 **Server Members Intent**。
- 当 Discord 返回 `Missing Access` 时，访问组不授予访问权限，发送者无法解析为行会成员，或者频道属于另一个行会。

更多Discord-具体示例：[Discord访问控制](/channels/discord/access-control#access-control-and-routing)

## <a id="plugin-diagnostics"></a> 插件诊断

插件作者可以在不将其展开回扁平 allowlist 的情况下检查结构化的 access-group 状态：

```typescript
import { resolveAccessGroupAllowFromState } from "openclaw/plugin-sdk/access-groups";

const state = await resolveAccessGroupAllowFromState({
  accessGroups: cfg.accessGroups,
  allowFrom: channelConfig.allowFrom,
  channel: "my-channel",
  accountId: "default",
  senderId,
  isSenderAllowed,
});
```

结果报告引用、匹配、缺失、不支持和失败的组。将其用于诊断或一致性测试。仅将 `expandAllowFromWithAccessGroups(...)` 用于仍需要平面 `allowFrom` 阵列的兼容性路径。

## <a id="security-notes"></a> 安全说明

- 访问组是允许列表别名，不是角色。它们不会创建所有者、批准配对请求，也不会单独授予工具权限。
- `dmPolicy: "open"` 仍然需要在生效的 DM 允许列表中包含 `"*"`. 引用访问组并不等同于公开访问。
- 缺少组名称则不允许访问。如果 `allowFrom` 包含 `accessGroup:operators` 并且 `accessGroups.operators` 不存在，则该条目未授权任何人。
- 保持频道 ID 稳定。更喜欢numeric/user当频道同时支持 ids 和显示名称时。

## <a id="troubleshooting"></a> 故障排查

如果某个发送者本应匹配却被阻止：

1. 确认允许列表字段包含精确的 `accessGroup:<name>` 引用。
2. 确认 `accessGroups.<name>.type` 正确。
3. 确认发送者 id 列在匹配的渠道键下，或者列在 `"*"` 下。
4. 确认该条目使用的是该渠道的常规允许列表语法。
5. 对于 Discord 渠道受众，请确认机器人能够看到该服务器频道，并且已启用 Server Members Intent。

编辑访问控制配置后运行 `openclaw doctor`。它会在运行前捕获许多无效的允许列表和策略组合。

## <a id="related"></a> 相关内容

- [Groups](/channels/groups) — 群聊行为和提及门控
- [Pairing](/channels/pairing) — 通道发送方的单独 DM 配对流程
- [频道概述](/channels) — 这些组适用的频道
