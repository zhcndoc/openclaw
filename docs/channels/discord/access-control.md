---
summary: "DM 策略、行会允许列表、提及门控、角色路由、命令身份验证和操作门控"
read_when:
  - "决定谁可以与 Discord 机器人对话以及在哪里对话"
  - "将公会频道或角色路由到特定代理"
  - "门控 Discord 消息操作和本机命令"
title: "Discord门禁"
sidebarTitle: "访问控制"
---

谁可以联系机器人，它在哪个公会渠道中进行应答，以及允许它执行哪些 Discord 操作。

## <a id="access-control-and-routing"></a> 访问控制与路由

<Tabs>
  <Tab id="dm-policy" title="DM 政策">
    `channels.discord.dmPolicy` 控制 DM 访问。 `channels.discord.allowFrom` 是 DM 许可名单。

    - `pairing`（默认）
    - `allowlist`（需要至少一个 `allowFrom` 发送者）
    - `open`（需要 `channels.discord.allowFrom` 包含 `"*"`）
    - `disabled`

    如果 DM 策略不是 open，则未知用户会被阻止（或在 `pairing` 模式下被提示配对）。

    多账号优先级：

    - Omited 账户 `dmPolicy` 和 `groupPolicy` 继承通道根。明确的账户政策获胜；如果未设置任何范围，则默认值分别保留为 `pairing` 和 `allowlist`。
    - `channels.discord.accounts.default.allowFrom` 只适用于 `default` 账号。
    - 对于单个账号，`allowFrom` 的优先级高于旧的 `dm.allowFrom`。
    - 命名帐户在其自己的 `allowFrom` 和旧 `dm.allowFrom` 未设置时继承 `channels.discord.allowFrom`。
    - 命名账号不会继承 `channels.discord.accounts.default.allowFrom`。

    为兼容性起见，旧版 `channels.discord.dm.policy` 和 `channels.discord.dm.allowFrom` 仍会被读取。`openclaw doctor --fix` 会在不改变访问权限的前提下尽可能将它们迁移到 `dmPolicy` 和 `allowFrom`。

    交付时的 DM 目标格式：

    - `user:<id>`
    - `<@id>` 提及

    当通道默认值处于活动状态时，裸数字 ID 通常会解析为通道 ID，但为了兼容性，帐户的有效 DM `allowFrom` 中列出的 ID 会被视为用户 DM 目标。

  </Tab>

  <Tab id="access-groups" title="访问组">
    Discord DM 和文本命令授权可以使用 `channels.discord.allowFrom` 中的动态 `accessGroup:<name>` 条目。

    访问组名称在消息通道之间共享。对于静态组，请使用 `type: "message.senders"`，其成员以每个频道的正常 `allowFrom` 语法表示；或者，当 Discord 频道的当前 `ViewChannel` 受众应动态定义成员资格时，请使用 `type: "discord.channelAudience"`。共享访问组行为：[访问组](/channels/access-groups)。

```json5
{
  accessGroups: {
    operators: {
      type: "message.senders",
      members: {
        "*": ["global-owner-id"],
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
  },
}
```

    Discord 文本频道没有单独的成员列表。`type: "discord.channelAudience"` 将成员资格建模为：DM 发送者属于已配置的 guild，并且在应用角色和频道覆盖后，当前对已配置频道拥有有效的 `ViewChannel` 权限。

    示例：允许任何可以看到 `#maintainers` 到 DM 机器人的人，同时保持 DM 对其他人关闭。

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

    你可以混合动态和静态条目：

```json5
{
  accessGroups: {
    maintainers: {
      type: "discord.channelAudience",
      guildId: "1456350064065904867",
      channelId: "1456744319972282449",
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:maintainers", "discord:123456789012345678"],
    },
  },
}
```

    失败的查找不会授予访问权限。如果Discord返回`Missing Access`，成员查找失败，或者频道属于不同的行会，则DM发送者被视为未经授权。

    使用频道受众访问组时，启用 Discord 开发人员门户 **Server Members Intent**。 DM 不包含行会成员状态，因此 OpenClaw 在授权时通过 Discord REST 解析成员。

  </Tab>

  <Tab id="guild-policy" title="行会政策">
    guild 处理由 `channels.discord.groupPolicy` 控制：

    - `open`
    - `allowlist`
    - `disabled`

    当 `channels.discord` 存在时，安全基线是 `allowlist`。

    `allowlist` 行为：

    - guild 必须匹配 `channels.discord.guilds`（优先使用 `id`，也接受 slug）
    - 可选发件人白名单：`users`（推荐稳定 ID）和 `roles`（仅限角色 ID）；如果配置了其中之一，则当发件人与 `users` OR `roles` 匹配时允许发件人
    - direct name/tag 匹配默认关闭；仅启用 `channels.discord.dangerouslyAllowNameMatching: true` 作为碎玻璃兼容模式
    - `users`支持names/tags，但ID更安全；使用 name/tag 条目时 `openclaw security audit` 发出警告
    - 如果某个 guild 配置了 `channels`，未列出的频道会被拒绝
    - 如果某个 guild 没有 `channels` 块，则该 allowlist guild 中的所有频道都被允许

    示例：

```json5
{
  channels: {
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        "123456789012345678": {
          requireMention: true,
          ignoreOtherMentions: true,
          users: ["987654321098765432"],
          roles: ["123456789012345678"],
          channels: {
            general: { enabled: true },
            help: { enabled: true, requireMention: true },
          },
        },
      },
    },
  },
}
```

    旧版每通道 `allow` 密钥由 `openclaw doctor --fix` 迁移到 `enabled`。

    如果没有 `channels.discord` 块，网关不会从 `DISCORD_BOT_TOKEN` 自动启动 Discord。一旦区块存在，`DISCORD_BOT_TOKEN` 仍然是默认账户代币后备。传递 `--ambient-channels` 选择进入仅限 env 的自动配置；该路径使用 `groupPolicy="allowlist"` 并记录警告，即使 `channels.defaults.groupPolicy` 是 `open`。

  </Tab>

  <Tab id="mentions-and-group-dms" title="提及和群组私信">
    guild 消息默认按提及进行门控。

    提及检测包括：

    - 显式 bot 提及
    - 已配置的提及模式（`agents.entries.*.groupChat.mentionPatterns`，回退为 `messages.groupChat.mentionPatterns`）
    - 支持场景下对 bot 的隐式回复行为

    编写出站 Discord 消息时，请使用支持的提及语法：用户为 `<@USER_ID>`、通道为 `<#CHANNEL_ID>`、角色为 `<@&ROLE_ID>`。请勿使用旧版 `<@!USER_ID>` 昵称提及表单。

    `requireMention` 根据 guild/channel （`channels.discord.guilds...`） 进行配置。

    <a id="bot-created-threads" />
    在公会或频道上设置 `requireMentionInBotThreads: false` 以接受此机器人创建的线程中未提及的后续内容，包括通过消息工具创建的线程。频道值会覆盖公会设置。将其设置为 `true` 以要求在这些线程中提及，包括启用 `autoThread` 时；仅对话式回复机器人信号并不能绕过该要求。忽略保留现有行为：机器人拥有的线程仅在启用 `autoThread` 时绕过提及。线程绑定会话保留自己的路由激活规则。

    将其合并到现有的公会条目中，保留其频道和发件人白名单：

    ```json5
    {
      channels: {
        discord: {
          intents: { messageContent: true },
          guilds: {
            "123456789012345678": {
              requireMention: true,
              requireMentionInBotThreads: false,
            },
          },
        },
      },
    }
    ```

    对于指定帐户，请使用 `channels.discord.accounts.<accountId>.intents` 和 `.guilds`。要限制对一个父频道的覆盖，请将 `requireMentionInBotThreads: false` 添加到其现有行会 `channels.<channelId>` 条目。添加新频道映射还会更改 [guild 允许列表 ](/channels/discord/access-control#guild-channel-maps-are-allowlists)。

    Guild/channel并且发件人白名单仍然适用。其他用户创建的父频道和线程保留其配置的提及要求；未知的线程所有权不会启用覆盖。使能够**消息内容意图**在[不和谐开发者Portal](/channels/discord/setup#quick-setup)也`intents.messageContent` in OpenClaw。没有它，Discord省略普通未提及的公会消息内容。通过让机器人创建一个线程并从允许的帐户发送未提及的后续内容来进行验证。看[机器人创建的线程策略](/channels/groups#bot-created-threads)对于其他渠道。

    `ignoreOtherMentions` 有选择地删除发送给另一个身份但不发送给机器人的消息。这涵盖了明确的 user/role 提及（不包括 @everyone/@here）以及对另一个非 webhook 机器人的回复。明确提及当前机器人仍然有效。

    群组 DM：

    - 默认：忽略（`dm.groupEnabled=false`）
    - 通过 `dm.groupChannels` 的可选允许列表（通道 ID 或 slugs）

  </Tab>
</Tabs>

### <a id="guild-channel-maps-are-allowlists"></a> Guild 频道映射是允许名单

如果某个 guild 条目没有 `channels` 映射，bot 就可以在它能看到的每个频道中工作，但仍受该 guild 的 `requireMention` 和 `users` 规则约束。**即使只添加一个频道条目，也会把该映射变成 allowlist**：任何未被条目匹配的频道都会被拒绝，而不只是保持 guild 默认值。

这常让人感到意外：他们只添加了一个频道想给它单独设置，结果发现 bot 在其他地方都不再响应了。请使用 `"*"` 通配符键来保持 guild 其余部分仍可访问：

```json5
{
  channels: {
    discord: {
      guilds: {
        YOUR_SERVER_ID: {
          requireMention: true,
          users: ["YOUR_USER_ID"],
          channels: {
            // always-on room: everyone in it can talk to the bot, no mention needed
            YOUR_CHANNEL_ID: { enabled: true, requireMention: false, users: ["*"] },
            // every other channel keeps the guild defaults
            "*": { enabled: true, requireMention: true },
          },
        },
      },
    },
  },
}
```

频道条目会覆盖 guild 级别的值，因此带有 `users: ["*"]` 的频道条目会向任何发送者开放该房间，即使 guild 的 `users` 列表很窄也是如此。条目可按频道 ID、名称或 slug 匹配，线程会回退到其父频道的条目。

频道ID参赛作品获奖； name 或 slug 键在启动时或在策略重新加载绑定工具时解析，并向该通道 ID 提及策略，因此具有相同名称的线程或重命名通道不会继承它们。未解析的名称键仍按名称匹配，因此请对授予额外工具的条目使用通道 ID。

当主题或论坛帖子与父频道条目匹配时，该条目的已配置工具策略（包括发件人覆盖）将传送到代理中。显式线程 ID 条目优先于父线程。

解析的行会名称条目还将其工具策略绑定到行会 ID。显式行会 ID 条目优先于已解析的名称，并且每个帐户都会在策略重新加载时替换其绑定。

### <a id="applying-access-policy-changes"></a> 应用访问策略更改

对于正在运行的 Discord 帐户，Control UI 中保存的仅策略更改通过网关经过验证的运行时配置发布来应用，无需重新启动 Discord 连接或等待活动 Control UI 完成。这包括 `groupPolicy`、`dmPolicy`、`allowFrom`、`dm`、`guilds`、`allowBots` 和 `dangerouslyAllowNameMatching`，均位于 `channels.discord` 和 `channels.discord.accounts.<accountId>` 下。

新消息和交互使用已发布的策略，包括 guild/channel 成员资格、用户和角色允许列表以及提及要求。基于名称的条目在准入之前会被解析并缓存以供策略修订使用；已经承认的作品保留其现有背景。如果名称策略查找无法在交互的响应预算内完成，组件将显示一条临时策略更新消息，并且自动完成功能不会返回任何选择。稍后的交互将使用已解决的策略；过期的交互永远不会恢复。

令牌、应用程序 ID、代理、意图、命令注册、语音配置和帐户启用仍然使用通道的重启路径和耗尽延迟。混合策略和需要重新启动的设置的写入将保留一个延迟事务。手动通道stop/start读取提交的配置；它不会从磁盘发布待处理的传输更改。

### <a id="role-based-agent-routing"></a> 基于角色的 agent 路由

使用 `bindings[].match.roles` 将 Discord 行会成员按角色 ID 路由到不同的代理。基于角色的绑定仅接受角色 ID，并在对等或父对等绑定之后、仅公会绑定之前进行评估。如果绑定还设置了其他匹配字段（例如 `peer` + `guildId` + `roles`），则所有配置的字段都必须匹配。

```json5
{
  bindings: [
    {
      agentId: "opus",
      match: {
        channel: "discord",
        guildId: "123456789012345678",
        roles: ["111111111111111111"],
      },
    },
    {
      agentId: "sonnet",
      match: {
        channel: "discord",
        guildId: "123456789012345678",
      },
    },
  ],
}
```

## <a id="native-commands-and-command-auth"></a> 原生命令和命令授权

- `commands.native` 默认为 `"auto"`，并且对 Discord 已启用。
- 按频道覆盖：`channels.discord.commands.native`。
- `commands.native=false` 会在启动期间跳过 Discord slash 命令注册和清理。之前注册的命令可能仍会在 Discord 中可见，直到你将它们从 Discord 应用中移除。
- Native 命令身份验证使用与正常消息处理相同的 Discord allowlists/policies。
- 对于未授权用户，命令在 Discord UI 中仍可能可见；执行时会强制进行 OpenClaw 授权并回复“未授权”。
- 默认 slash 命令设置：`ephemeral: true`（`channels.discord.slashCommand.ephemeral`）。

有关命令目录和行为，请参见 [斜杠命令](/tools/slash-commands)。

## <a id="tools-and-action-gates"></a> 工具与操作门控

Discord 消息动作涵盖消息、频道管理、审核、状态和元数据。

核心示例：

- 消息：`sendMessage`、`readMessages`、`editMessage`、`deleteMessage`、`threadReply`
- 反应：`react`、`reactions`、`emoji-list`
- 审核：`timeout`、`kick`、`ban`
- 状态：`setPresence`

使用 `emoji-list` 发现当前服务器的自定义表情符号：

```json
{ "action": "emoji-list", "channel": "discord", "limit": 25 }
```

`guildId` 默认为当前会话的服务器；显式提供它来查询另一台服务器。结果按名称排序，`limit` 默认为且不能超过 100：

```json
{
  "ok": true,
  "emojis": [
    { "name": "dance", "identifier": "dance:456", "animated": true },
    { "name": "party", "identifier": "party:123" }
  ]
}
```

将 `identifier` 直接传递给 `react`。 Discord 接受 Unicode 表情符号、自定义 `name:id` 标识符以及 `<:name:id>` 或 `<a:name:id>` 形式。 `emoji-list`、`react` 和 `reactions` 均由 `channels.discord.actions.reactions` 控制。

`event-create` 动作接受一个可选的 `image` 参数（URL 或本地文件路径）来设置计划事件封面图。

操作门控位于 `channels.discord.actions.*` 下。

默认门控行为：

| 行动组                                                                                                                                                             | 默认值  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| 反应、消息、话题、图钉、民意调查、搜索、memberInfo、roleInfo、channelInfo、频道、voiceStatus、事件、贴纸、emojiUploads、stickerUploads、权限 | 已启用  |
| 角色                                                                                                                                                                    | 已禁用 |
| 适度                                                                                                                                                               | 已禁用 |
| 在场                                                                                                                                                                 | 已禁用 |
