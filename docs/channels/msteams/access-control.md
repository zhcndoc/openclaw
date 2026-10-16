---
summary: "Microsoft Teams DM 和组策略、团队和频道允许列表以及对话 ID"
read_when:
  - "决定谁可以 DM 或提及 Teams 机器人"
  - "将回复范围界定为特定团队和渠道"
  - "查找 Teams 团队或频道 ID"
title: "Microsoft Teams门禁"
sidebarTitle: "访问控制"
---

谁可以与 Teams 机器人交谈，它在哪些团队和渠道中进行应答，以及这些规则使用的 ID 来自何处。

## <a id="config-writes"></a> 配置写入

默认情况下，Microsoft Teams 可以写入由 `/config set|unset` 触发的配置更新（需要 `commands.config: true`）。

禁用：

```json5
{
  channels: { msteams: { configWrites: false } },
}
```

## <a id="access-control-(dms-%2B-groups)"></a><a id="access-control-dms-+-groups"></a> 访问控制（DM + 群组）

在 `channels.msteams` 下设置共享策略，或为 `channels.msteams.accounts.<id>` 下的一个机器人覆盖这些策略。通过所选账户进行的政策更改将仅限于该账户；从一个帐户撤销发件人不会更改同级帐户。

**DM 访问**

- 默认：`channels.msteams.dmPolicy = "pairing"`。未知发件人将被忽略，直至获得批准。将其设置在根目录以应用于所有帐户，或在 `channels.msteams.accounts.<id>.dmPolicy` 覆盖它。
- `channels.msteams.allowFrom` 应使用稳定的 AAD 对象 ID 或静态发送方访问组，例如 `accessGroup:core-team`。将其设置在根目录以共享允许列表，或在 `channels.msteams.accounts.<id>.allowFrom` 覆盖它。
- `dmPolicy: "open"` 要求有效账户白名单中包含 `"*"`；安装程序在添加或删除特定于帐户的条目时保留该通配符。
- 不依赖 UPN/display-name 匹配白名单；他们可以改变。 OpenClaw 默认禁用直接名称匹配；选择使用 `channels.msteams.dangerouslyAllowNameMatching: true`。
- 当凭据允许时，向导可以通过 Microsoft 图形将名称解析为 ID。

**群组访问**

- 默认：`channels.msteams.groupPolicy = "allowlist"`（除非添加 `groupAllowFrom`，否则将被阻止）。将其设置在根目录以应用于所有帐户，或在 `channels.msteams.accounts.<id>.groupPolicy` 覆盖它；根模式默认优先于 `channels.defaults.groupPolicy`。
- `channels.msteams.groupAllowFrom` 控制哪些发件人、静态发件人访问组或 group/channel 会话 ID 可以在组 chats/channels 中触发（回退到 `channels.msteams.allowFrom`）。将其设置在根目录中以共享它，或者在 `channels.msteams.accounts.<id>.groupAllowFrom` 处覆盖它。会话ID可以使用`19:...@thread.tacv2`、`19:...@thread.v2`或`19:...@thread.skype`；保留准确的 ID 外壳。 OpenClaw 忽略 `;messageid=...` 后缀。对话 ID 绝不会授予个人 DM 访问权限。
- 设置 `groupPolicy: "open"` 以允许任何成员（默认仍需通过提及触发）。
- 若要阻止**所有**频道，请设置 `channels.msteams.groupPolicy: "disabled"`。

示例：

```json5
{
  channels: {
    msteams: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["00000000-0000-0000-0000-000000000000", "accessGroup:core-team"],
    },
  },
}
```

**团队 + 频道允许列表**

- 范围 group/channel 回复 `channels.msteams.teams` 下的每个帐户，或回复 `channels.msteams.accounts.<id>.teams` 下的一个机器人。
- 使用来自 Teams 链接的稳定 Teams 对话 ID 作为键，而不是可变的显示名称（请参阅 [ 团队和通道 ID](#team-and-channel-ids-common-gotcha)）。
- 当存在 `groupPolicy="allowlist"` 和团队许可名单时，仅接受列出的 teams/channels（提及门控）。
- `groupAllowFrom` 授权群组发送者，而不是授权通过委托 Graph 读取其他频道。如果现有配置仅设置了 `groupAllowFrom`，请保留默认的 `groupPolicy: "allowlist"`，并在 `channels.msteams.teams.<team>.channels` 下配置目标。
- 或者，故意设置 `groupPolicy: "open"` 以实现更广泛的委托读取。这也允许 **any 组发送者** （默认情况下仍然提及门控），因此它比作用域 team/channel 路由的限制更少。
- Direct-operator读取和当前会话中的读取不需要额外的team/channel路由。
- 配置向导接受 `Team/Channel` 条目，并会为你保存这些条目。
- 启动时，OpenClaw 将 team/channel 和用户白名单名称解析为 ID（当图形权限允许时）并记录映射。未解析的名称将保留为键入的名称，但在路由时会被忽略，除非设置了 `channels.msteams.dangerouslyAllowNameMatching: true`。

具有兼容的核心和Teams版本，经过验证的官方npm和ClawHub安装可以使用现有的`read`，`search`，`reactions`，`list-pins`，`member-info`，这些访问规则下的 `channel-info` 和 `channel-list` 操作。代理从已安装的插件中​​读取需要可信的当前 Teams 对话和帐户上下文。列出团队的频道需要访问整个团队；访问一个频道并不授予该权限。 [成员查找](/channels/msteams/cards-and-actions#member-info-action)保留其标准通道和当前请求者限制。当原始调用或插件失去权限时，后续的图形请求和结果将被拒绝。

示例：

```json5
{
  channels: {
    msteams: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["00000000-0000-0000-0000-000000000000"],
      teams: {
        "19:team-id@thread.tacv2": {
          channels: {
            "19:channel-id@thread.tacv2": { requireMention: true },
          },
        },
      },
    },
  },
}
```

### <a id="mentions-in-bot-created-threads"></a> 在机器人创建的线程中提及

将 `requireMentionInBotThreads: false` 设置为在该机器人发送根消息的通道线程中不使用 @mention 进行应答。将其设置为 `true` 以要求在这些线程中提及，包括否则将被视为隐式提及的回复。省略它以保留现有的提及行为。

该设置从通道到团队解析为 `channels.msteams`，独立于 `requireMention`。家长频道帖子和其他人的帖子保留了通常的提及规则。群聊报价不是频道线程，发件人和 team/channel 许可名单仍然适用。

```json5
{
  channels: {
    msteams: {
      requireMention: true,
      requireMentionInBotThreads: false,
    },
  },
}
```

所有权使用当前机器人记录的已接受的顶级频道帖子，包括主动消息。现有线程内的回复不会建立所有权。追踪持续长达 24 小时且有界；最新的 1,000 个发送标记在重新启动后仍然有效。较旧的或未跟踪的根保留普通的提及规则。 Teams 必须在应用清单中授予 `ChannelMessage.Read.Group` 才能传送没有 @mention 的消息；请参阅 [RSC 权限](/channels/msteams/manifest-and-permissions#current-teams-rsc-permissions-manifest)。

## <a id="team-and-channel-ids-(common-gotcha)"></a><a id="team-and-channel-ids-common-gotcha"></a> 团队和频道 ID（常见问题）

Teams URL 中的 `groupId` 查询参数是 **NOT** 团队 ID 用于配置。从 URL 路径中提取 ID：

**团队 URL：**

```text
https://teams.microsoft.com/l/team/19%3ABk4j...%40thread.tacv2/conversations?groupId=...
                                    └────────────────────────────┘
                                    Team conversation ID (URL-decode this)
```

**频道 URL：**

```text
https://teams.microsoft.com/l/channel/19%3A15bc...%40thread.tacv2/ChannelName?groupId=...
                                      └─────────────────────────┘
                                      Channel ID (URL-decode this)
```

**用于配置：**

- Team key = `/team/` 之后的路径段（URL-decoded、e.g.、`19:Bk4j...@thread.tacv2`；较旧的租户可能会显示 `@thread.skype`，这也是有效的）。
- Channel key = `/channel/`（URL-解码）之后的路径段。
- 在 OpenClaw 路由中请**忽略** `groupId` 查询参数。它是 Microsoft Entra 组 ID，而不是传入 Teams 活动中使用的 Bot Framework 会话 ID。

## <a id="private-channels"></a> 私有频道

机器人在私有频道中的支持有限：

| 功能                      | 标准频道 | 私有频道       |
| ---------------------------- | ----------------- | ---------------------- |
| 机器人安装             | 是               | 有限                |
| 实时消息（webhook） | 是               | 可能无法工作           |
| RSC 权限              | 是               | 可能表现不同 |
| @mentions                    | 是               | 如果机器人可以访问   |
| Graph API 历史记录            | 是               | 是（需具备权限） |

**如果私有频道无法正常工作，可采用以下替代方案：**

1. 使用标准频道进行机器人交互。
2. 使用私信；用户始终可以直接向机器人发送消息。
3. 使用 Graph API 访问历史记录（需要 `ChannelMessage.Read.All`）。
