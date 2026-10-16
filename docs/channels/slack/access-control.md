---
summary: "DM 政策、渠道许可名单、提及门控和操作门控"
read_when:
  - "决定谁可以 DM 机器人或在频道中与其交谈"
  - "调试机器人保持沉默的通道"
  - "将应用程序放入组中 DM"
title: "Slack门禁"
sidebarTitle: "访问控制"
---

谁可以通过Slack到达OpenClaw，以及它可以采取哪些Slack操作。

## <a id="linked-requester-identity"></a> 关联请求者身份

通过 Slack 签名秘密验证的直接套接字模式事件和 HTTP 请求 URL 携带经过验证的本机 Slack 用户 ID，包括 `team:<team-id>:user:<user-id>` 表单。中继事件保持断言状态，因为网关对中继对等方而不是 Slack 发送方进行身份验证。显示名称永远不会建立身份，并且从应用程序控制的消息元数据派生的发件人 ID 仍然有效。

对于来自链接到活动用户配置文件的经过验证的 Slack 发件人的普通消息和应用程序提及，OpenClaw 在主机生成的每轮对话信息中包含该配置文件的主要 ID 和当前显示名称。具有 `operator.admin` 权限的链接配置文件可以请求“将此会话分配给我”；代理将该配置文件 ID 与 `sessions` 工具的 `assign_owner` 操作一起用于该管理员可见的会话，包括代理生成的会话。该回合携带链接管理员现有的操作员权限，并在每次特权操作之前检查原始链接、角色和通道生命周期。取消链接、删除管理员访问权限或重新启动频道将使该轮次失效；访问恢复后发送新请求。

该工具仍然仅限所有者：链接普通成员可以识别请求者，而不授予分配访问权限。未链接或断言的发件人不会收到请求者配置文件或操作员权限。没有链接的管理员配置文件的已配置命令所有者将保留其现有的命令访问权限。参见[频道标识链接](/concepts/user-model#channel-identity-links)。

## <a id="actions-and-gates"></a> 操作与门控

Slack 操作由 `channels.slack.actions.*` 控制。

当前 Slack 工具中可用的操作组如下：

| 团体      | 默认值 |
| ---------- | ------- |
| 消息   | 已启用 |
| 反应  | 已启用 |
| 针脚       | 已启用 |
| 会员信息 | 已启用 |
| 表情符号列表  | 已启用 |

当前 Slack 消息操作包括 `send`、`conversation-open`、`upload-file`、`download-file`、`read`、`edit`、`delete`、`pin`、 `unpin`、`list-pins`、`member-info` 和 `emoji-list`。 `download-file` 接受入站文件占位符中显示的 Slack 文件 ID，并返回图像的图像预览或其他文件类型的本地文件元数据。

交互式消息操作通过目标和权限查找保留其调用者权限，并在每个 Slack 请求之前重新检查。如果该机构关闭，剩余的请求将停止，而已接受的突变将保留其结果。

在 Slack 会话中，委托 `member-info` 仅读取同一帐户上的当前请求者；省略 `userId` 将选择该请求者。 `emoji-list` 使用受信任的当前工作空间。这两个元数据操作都可以在没有频道目标的情况下使用捆绑插件和经过验证的官方 npm 或 ClawHub 安装。现有的操作门和企业工作区要求仍然适用。

使用 `emoji-list` 发现工作区自定义表情符号和别名：

```json
{ "action": "emoji-list", "channel": "slack", "limit": 25 }
```

结果按短代码名称排序。 `limit` 默认为且不能超过 100：

```json
{
  "ok": true,
  "emojis": [
    { "name": "celebrate", "identifier": "celebrate", "aliasOf": "party" },
    { "name": "party", "identifier": "party" }
  ]
}
```

直接使用条目的`identifier`作为`react`表情符号；周围的冒号是可选的。 `channels.slack.actions.emojiList` 与 `reactions` 门分开控制发现，并且应用程序需要 `emoji:read` 范围。

## <a id="live-policy-changes"></a> Live 政策变更

DM 访问、白名单、组策略、提及规则和现有通道策略字段适用于新消息、命令和系统事件，而无需重新连接 Slack。根设置和帐户覆盖保持其正常优先级。每个被承认的回合都会保留一个已解决的策略快照；更改不会重写已经正在进行的回复。工作区名称解析针对每个新快照运行一次，并且从不附加旧策略中的身份。在另一次后台唤醒之前，在较旧的配置快照下学习到的存在目标将退出；新的承认的活动创造了新的目标。

传输凭据、帐户启用、添加或删除帐户或通道条目、名称匹配模式、状态设置和本机 command/approval 注册仍会重新启动 Slack 监视器。网关仍在运行。

## <a id="access-control-and-routing"></a> 访问控制与路由

<Tabs>
  <Tab id="dm-policy" title="DM 政策">
    `channels.slack.dmPolicy` 控制 DM 访问。 `channels.slack.allowFrom` 是 DM 许可名单。

    - `pairing`（默认）
    - `allowlist`
    - `open`（需要 `channels.slack.allowFrom` 包含 `"*"`）
    - `disabled`

    DM 标志：

    - `dm.enabled`（默认 true）
    - `channels.slack.allowFrom`
    - `dm.allowFrom`（旧版）
    - `dm.groupEnabled`（群组 DM 默认 false）
    - `dm.groupChannels`（可选的 MPIM 允许列表）

    <Note>
    `dm.groupEnabled` 和 `dm.groupChannels` 仅过滤组 DM Slack 已传送到应用程序。他们无法使应用程序看到它从未加入的组 DM。将群组 DM 转换为私人频道并邀请应用程序，或者让应用程序使用 `conversations.open` 打开新的 MPDM。请参阅 [Group DM （MPDM） 和机器人 ](/channels/slack/access-control#group-dms-mpdms-and-bots)。
    </Note>

    多账号优先级：

    - Omited 账户 `dmPolicy` 和 `groupPolicy` 继承通道根。明确的账户政策获胜；如果未设置任何范围，则默认值分别保留为 `pairing` 和 `allowlist`。
    - `userTokenReadOnly` 省略时也继承通道设置；其默认值仍为 `true`。
    - `channels.slack.accounts.default.allowFrom` 仅适用于 `default` 账号。
    - 命名帐户在其自己的 `allowFrom` 未设置时继承 `channels.slack.allowFrom`。
    - 命名账号不会继承 `channels.slack.accounts.default.allowFrom`。

    旧版 `channels.slack.dm.policy` 和 `channels.slack.dm.allowFrom` 仍会为兼容性读取。`openclaw doctor --fix` 会在不改变访问权限的前提下，将它们迁移到 `dmPolicy` 和 `allowFrom`。

    DMs 中的配对使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab id="channel-policy" title="渠道政策">
    `channels.slack.groupPolicy` 控制频道处理方式：

    - `open`
    - `allowlist`
    - `disabled`

    通道白名单位于 `channels.slack.channels` 和 **下，必须使用稳定的 Slack 通道 ID**（例如 `C12345678`）作为配置键。 Enterprise Grid 组织安装需要 `team:<team-id>:channel:<channel-id>`，因此策略无法跨越工作区边界。

    当受邀进入允许的频道时，OpenClaw 会发布基于频道名称、目的或主题以及可用的最新消息的简短介绍。设置`channels.slack.joinIntro: false`禁用这些介绍； `channels.slack.accounts.<accountId>.joinIntro` 覆盖通道范围设置。默认情况下启用介绍并且不需要提及，但它们绝不会绕过频道访问策略或在直接消息中运行。

    如果没有 `channels.slack` 块，网关不会从 `SLACK_*` 环境变量自动启动 Slack。一旦该块存在，这些变量仍然是默认帐户凭证的后备。传递 `--ambient-channels` 选择进入仅限 env 的自动配置；该路径使用 `groupPolicy="allowlist"` 并记录警告，即使设置了 `channels.defaults.groupPolicy` 也是如此。

    Name/ID 分辨率：

    - channel 白名单条目和 DM 白名单条目在启动时以及首次使用新策略快照时、令牌访问允许时解析
    - 无法解析的频道名称项会保留为已配置状态，但默认会在路由中忽略
    - 入站授权和通道路由默认为ID-first；直接username/slug匹配需要`channels.slack.dangerouslyAllowNameMatching: true`

    每个通道 `tools`/`toolsBySender`/`requireMention` 遵循相同的规则：解析的名称绑定到通道 ID，因此重命名的通道永远不会继承另一个通道的名称条目，除非显式启用直接名称匹配。

    <Warning>
    基于名称的密钥（`#channel-name` 或 `channel-name`）依赖于成功的 Slack 查找来解析稳定的通道 ID。在 `groupPolicy: "allowlist"` 下，除非 `dangerouslyAllowNameMatching` 明确启用直接名称匹配，否则未解析的名称将被拒绝。

    优先选择 Slack 通道 ID 作为避免查找依赖性的关键。要找到它：右键单击 Slack → **复制链接** — ID （`C...`） 出现在 URL 的末尾。

    推荐稳定的ID：

    ```json5
    {
      channels: {
        slack: {
          groupPolicy: "allowlist",
          channels: {
            C12345678: { enabled: true, requireMention: true },
          },
        },
      },
    }
    ```

    基于名称的输入（需要使用默认匹配策略成功查找）：

    ```json5
    {
      channels: {
        slack: {
          groupPolicy: "allowlist",
          channels: {
            "#eng-my-channel": { enabled: true, requireMention: true },
          },
        },
      },
    }
    ```
    </Warning>

  </Tab>

  <Tab id="mentions-and-channel-users" title="提及和频道用户">
    频道消息默认受提及门控限制。

    提及来源：

    - 显式应用提及（`<@botId>`）
    - Slack 用户组提及（`<!subteam^S...>`），当 bot 用户是该用户组成员时；需要 `usergroups:read`
    - 提及正则模式（`agents.entries.*.groupChat.mentionPatterns`，回退到 `messages.groupChat.mentionPatterns`）
    - 回复 bot 自己的 Slack 消息（`implicitMentions.replyToBot`）
    - bot 参与过的线程中的后续消息（`implicitMentions.threadParticipation`）

    每个频道的控制项（`channels.slack.channels.<id>`；名称仅可通过启动时解析或 `dangerouslyAllowNameMatching` 使用）：

    - `requireMention`
    - `requireMentionInBotThreads`
    - `ignoreOtherMentions`
    - `replyToMode`（`off|first|all|batched`；覆盖此通道的 account/chat-type 回复模式）
    - `users`（允许列表）
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - `toolsBySender` 密钥格式：`id:`、`e164:`、`username:`、`name:` 或 `"*"` 通配符（运行 `openclaw doctor --fix` 将已停用的无前缀密钥迁移到`id:` 条目；在授予额外工具时更喜欢 `id:` 密钥，因为 `username:` 和 `name:` 匹配可变的发送者属性）

    <a id="bot-created-threads" />
    `requireMentionInBotThreads` 仅在该机器人发送根消息的线程中覆盖提及门控。将其设置为 `false` 以允许未提及的回复，同时为频道的其余部分保留 `requireMention: true`。将其设置为 `true` 以要求在这些线程中提及，即使启用了隐式回复或线程参与提及也是如此。授权文本命令保留其现有的旁路。

    将设置添加到现有允许的通道条目：

    ```json5
    {
      channels: {
        slack: {
          channels: {
            C12345678: {
              enabled: true,
              requireMention: true,
              requireMentionInBotThreads: false,
            },
          },
        },
      },
    }
    ```

    该设置从通道条目解析，然后是 `"*"` 条目，然后是帐户，然后是 `channels.slack.requireMentionInBotThreads`。省略它以保留现有行为，包括 `implicitMentions.replyToBot` 和 `implicitMentions.threadParticipation`。 Slack的原生父作者标识根；当该字段不存在时，OpenClaw 使用可访问的线程历史记录。未知所有权保留正常提及政策。通道和发件人访问、机器人消息限制和 `ignoreOtherMentions` 仍然适用。

    邀请应用程序加入频道并订阅 `message.channels`（公共频道）或 `message.groups`（私人频道），并具有匹配的历史范围。仅订阅 `app_mention` 无法提供未提及的后续内容。两个设置清单都包含这些订阅；请参阅 [ 清单和范围清单 ](/channels/slack/manifest-and-scopes#manifest-and-scope-checklist)。要进行验证，请让机器人发布一条新的顶级消息，然后在该消息的线程中回复而不提及它。即使机器人稍后参与，对人类创建的根的回复也会保留其现有的隐式提及策略。

    `ignoreOtherMentions`（默认 `false`）会删除提及其他用户或用户组但不提及此机器人的频道消息。 DM 和群组 DM （MPIM） 不受影响。该过滤器需要来自 `auth.test` 的已解析机器人用户 ID；如果该身份不可用（例如仅用户令牌的身份），则门将无法打开，并且消息将不受影响地通过。

    `allowBots` 默认为 `true`。机器人创作的消息遵循与其他消息相同的通道访问和提及规则；来自该机器人的消息始终被忽略。设置 `allowBots: false` 以防止其他机器人触发回合，或设置 `allowBots: "mentions"` 以要求提及，即使在有 `requireMention: false` 的房间中也是如此。房间设置覆盖帐户设置，帐户设置覆盖 `channels.slack.allowBots`。更新后，现有显式 `false` 值仍保持禁用状态。

    机器人编写的房间消息还要求发送机器人明确列在该房间的 `users` 白名单中，或者 `channels.slack.allowFrom` 中的至少一个明确的 Slack 所有者 ID 成为当前房间成员。通配符和显示名称所有者条目不满足所有者的存在。业主在场使用Slack `conversations.members`；确保应用程序具有与房间类型匹配的读取范围（公共频道为 `channels:read`，私人频道为 `groups:read`）。如果成员查找失败，OpenClaw 会丢弃机器人编写的房间消息。

    `allowBots` 控制传入转弯，而不是上下文可见性。当 `allowBots: false` 时，人工请求仍然可以包括可访问的机器人编写的房间历史记录和线程上下文；配置的 `contextVisibility` 和发件人白名单规则仍然适用。

    已接受的 bot 作者 Slack 消息使用共享的 [bot 循环保护](/channels/bot-loop-protection)。为默认预算配置 `channels.defaults.botLoopProtection`，然后在工作区或频道需要不同限制时，使用 `channels.slack.botLoopProtection` 或 `channels.slack.channels.<id>.botLoopProtection` 进行覆盖。

  </Tab>
</Tabs>

### <a id="group-dms-(mpdms)-and-bots"></a><a id="group-dms-mpdms-and-bots"></a> Group DM （MPDM） 和机器人

Slack 群组 DM（也称为多人直接消息或 MPDM）不是应用程序可以通过提及而加入的渠道。在现有组 DM 中键入 `@YourBot` 不会添加应用程序或使其可见对话。

- 如果在创建群组 DM 时就包含了该应用，Slack 会投递 `message.mpim` 事件，并且当 DM 策略允许时，OpenClaw 可以响应。
- 如果在一个现有群组 DM 中提及了该应用，但它并不是成员，那么 bot token 将完全无法看到该对话。Slack Web API 调用（如 `conversations.info`、`conversations.members` 和 `conversations.history`）会因方法和上下文不同而失败，报访问或未找到错误，该 MPDM 不会出现在 `conversations.list?types=mpim` 中，且不会有任何事件投递给 OpenClaw。
- OpenClaw 通过已投递的 `message.mpim` 事件唤醒。`app_mention` 事件不会把应用加入 DM 或 MPDM 上下文。
- `dm.groupEnabled` 和 `dm.groupChannels` 仅过滤已交付给应用程序的 MPDM Slack。他们无法授予应用程序从未属于的组 DM 的成员资格或可见性。没有 OpenClaw 配置设置可以使应用程序看到它从未加入的组 DM。

要将应用程序放入组 DM，请使用以下 Slack- 支持的路径之一：

1. 将群组 DM 转换为私人频道，然后要求当前成员使用 `/invite @YourBot` 邀请应用程序。基于 API- 的邀请必须使用其参与者已是成员并允许邀请应用程序的令牌调用 `conversations.invite`。
2. 要求应用对 `userIds` 中的人类收件人使用消息工具的 `conversation-open` 操作。它使用配置的写身份调用`conversations.open`；机器人帐户需要 `mpim:write`。 Slack 自动包含呼叫帐户。

```json
{
  "action": "conversation-open",
  "channel": "slack",
  "userIds": ["U12345678", "U23456789"]
}
```

提供 1-8 个不同的会员 ID，不包括呼叫帐户。一名收件人开立一张1：1的DM（需要`im:write`）；多个收件人打开或重复使用具有该确切受众的组 DM。结果包含 `channelId` 和可路由的 `target`。使用 `action: "send"` 和 `target` 发送消息。

使用 `accountId` 为显式工作区选择已配置的 Slack 帐户和 `teamId`。仅同一原始帐户继承当前工作空间；独立企业运营需要 `teamId`。开启由 `messages` 动作门控制。它不会更改 DM/read 策略、授予历史访问权限或自行发送消息。
