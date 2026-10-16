---
summary: "跨界面的群聊行为（Discord/iMessage/Matrix/Microsoft Teams/QQBot/Signal/Slack/Telegram/WhatsApp/Zalo）"
read_when:
  - "更改群聊行为或提及门控时"
  - "将提及模式范围限定为特定群组对话"
title: "群组"
sidebarTitle: "群组"
---

OpenClaw 在所有支持群聊的渠道中应用相同的群组规则，包括 Discord、iMessage、Matrix、Microsoft Teams、QQBot、Signal、Slack、Telegram、WhatsApp 和 Zalo。

有关应提供静默上下文、除非代理显式发送可见消息的始终在线房间，请参见 [Ambient room events](/channels/ambient-room-events)。

## <a id="beginner-intro-(2-minutes)"></a><a id="beginner-intro-2-minutes"></a> 初学者简介（2 分钟）

OpenClaw “运行”在你自己的消息账号上。这里没有单独的 WhatsApp 机器人用户：如果**你**在某个群里，OpenClaw 就能看到那个群并在那里响应。

默认行为：

- 群组受限制（`groupPolicy: "allowlist"`）；在被加入允许名单之前，群消息发送者会被阻止。
- 回复需要提及，除非你为某个群组禁用了提及门控。
- 最终回复文本会自动发布到房间（`visibleReplies: "automatic"`）。

翻译一下：在允许名单中的发送者可以通过提及 OpenClaw 来触发它。

<Note>
**TL;DR**

- **DM 访问** 由 `*.allowFrom` 控制。
- **群组访问** 由 `*.groupPolicy` + 允许名单（`*.groups`、`*.groupAllowFrom`）控制。
- **回复触发** 由提及门控（`requireMention`、`/activation`）控制。

</Note>

快速流程（群消息会发生什么）：

```text
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
mention/reply/command/DM -> user request
always-on group chatter -> user request, or room event when configured
```

## <a id="bot-created-threads"></a> Bot 创建的线程

使用 `requireMentionInBotThreads` 仅在接收机器人创建的线程或主题中覆盖提及门控：

- `false` 接受已确认的机器人创建的线程中未提及的后续内容。
- 即使房间通常接受所有消息，`true` 也需要在那里提及。仅仅回复、引用和过去的机器人参与并不能满足它；本机提及、配置的提及模式和授权命令保留其正常行为。
- Omit 保留频道现有的提及和隐式回复行为。

例如，在打开机器人自己的线程时保持 Discord 父通道提及门控，并对 Slack 应用相同的策略。将这些字段合并到您现有的通道配置中，保留其凭据和白名单：

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
    slack: {
      requireMention: true,
      requireMentionInBotThreads: false,
    },
  },
}
```

该设置使用每个通道的现有配置范围；帐户范围的配置在受支持的情况下使用 `accounts.<id>` 下的相应路径。对于较小的更改，请在现有允许的通道条目上设置该选项。请参阅 [Discord 示例 ](/channels/discord/access-control#bot-created-threads) 和 [Slack 示例 ](/channels/slack/access-control#bot-created-threads)。

| 渠道         | 配置范围                | 线程所有权证据                                                           |
| --------------- | ----------------------------------- | ----------------------------------------------------------------------------------- |
| 嗡嗡声            | 团体                               | 已验证根事件作者和房间                                                 |
| ClickClack      | 账户、群组                      | 经过身份验证的根消息作者、工作区和频道                           |
| Discord         | 公会、频道                      | Discord 线程所有者 ID                                                             |
| Feishu          | 账户、群组                      | 本机主题根和当前应用程序身份                                          |
| iMessage        | 团体                               | account/conversation-scoped 发送消息缓存中的本机线程根 GUID       |
| Matrix          | 帐号、房间                       | 本机 `m.thread` 根发送者                                                       |
| Mattermost      | 账户、群组                      | 原生根帖子作者和频道                                                 |
| Microsoft Teams | 全球、团队、渠道               | 当前app/conversation的发送消息缓存中的通道根                   |
| Slack           | 账号、渠道                    | 本机根作者或经过身份验证的线程启动器查找                           |
| Telegram        | 小组、主题                        | 通过本机创建事件或成功的机器人主题创建记录主题创建者 |
| 特隆            | 账号、渠道授权规则 | 经过身份验证的根帖子作者                                                      |

未知或不可用的所有权保留普通提及规则。现有的有界缓存可能会丢失旧的所有权证据；请参阅通道文档了解其限制。在其他人的线程中回复的机器人并不意味着它是创建者。发件人、渠道和机器人访问限制仍然适用。显式会话绑定保留自己的路由激活规则。

这些规则管理新消息的准入。已经承认的转弯保留其捕获的策略；更改提及规则或发件人白名单不会抑制其回复。

在 OpenClaw 可以应用策略之前，传输必须传送未提及的消息：

- Discord 需要在开发者门户和 OpenClaw 帐户配置中启用 [Message 内容 Intent](/channels/discord/setup#quick-setup)。
- Microsoft Teams 需要 [`ChannelMessage.Read.Group` RSC 权限 ](/channels/msteams/access-control#mentions-in-bot-created-threads)。
- Slack 需要频道会员资格以及匹配的 [`message.channels` 或 `message.groups` 事件订阅](/channels/slack/manifest-and-scopes#manifest-and-scope-checklist)。
- Telegram 需要禁用 [ 隐私模式或组管理状态 ](/channels/telegram/setup#privacy-mode-and-group-visibility)。

当前的 Google Chat 交互 webhook 不提供普通的未提及的空间消息或线程所有者元数据，因此它不公开此选项。仅提供引用、直接对话或不提供本机线程的频道也会保留其现有的提及行为。外部插件需要实现共享[线程提及策略](/plugins/sdk-channel-plugins/mention-policy)。

## <a id="visible-replies"></a> 可见回复

对于正常的 group/channel 请求，OpenClaw 默认为 `messages.groupChat.visibleReplies: "automatic"`：最终的助理文本作为可见回复发布到房间。

当可见答案必须通过 `message(action=send)` 时，请使用 `messages.groupChat.visibleReplies: "message_tool"`。这选择传送方式，而不是是否需要回复。它最适合可靠地遵循仅工具交付的模型。如果模型错过该工具并返回实质性的最终文本，OpenClaw 会将该文本保持私有并尝试有界传递恢复，而不是直接发布它。 Claude CLI运行调用注册工具为`mcp__openclaw__message`；后端解释了这种映射以及如何在系统提示符中发现延迟工具。

对于不可靠遵循仅工具交付的模型或运行时，请使用 `"automatic"`：普通文本最终结果会直接发布到房间中，而代理仍然可以调用 `message(action=send)` 发送无法随最终文本一起传递的文件、图片或其他附件。

如果消息工具在活动工具策略下不可用，OpenClaw 会回退到自动可见回复，而不是默默地抑制响应。 `openclaw doctor` 警告这种不匹配。

对于直接聊天和任何其他源事件，`messages.visibleReplies: "message_tool"` 在全球范围内应用相同的仅工具行为； `messages.groupChat.visibleReplies` 仍然是 group/channel 房间的更具体覆盖。内部 WebChat 直接默认为自动最终回复交付，因此 Pi 和 Codex 收到相同的可见回复合同。

接受的 group/channel 请求通常会收到答案，但显式的仅令牌 `NO_REPLY` 可以在任一传递模式下以静默方式结束它们。 `NO_REPLY` 会丢弃本回合写入的所有未发送的内容，因此请在静默结束之前发送确认。 `agents.defaults.silentReply.group: "allow"` 或 `surfaces.<id>.silentReply.group` 覆盖允许对未寻址请求进行可选处理；不需要尊重明确的沉默。空输出仍然需要恢复。参见[无声回复](/concepts/messages#silent-replies)。

插件拥有的会话绑定是例外。一旦插件绑定了一个线程并接管了传入轮次，插件返回的回复就是可见的绑定响应；它不需要 `message(action=send)`。该回复是插件运行时输出，而不是私有的模型最终文本。

直接群组请求仍会发送输入指示。启用后，环境式始终在线房间事件仍保持严格安静，除非代理调用 message 工具。

默认情况下，会话会抑制详细的 tool/progress 摘要。使用 `/verbose on`（或 `/verbose full`）在调试时显示当前会话，并使用 `/verbose off` 返回仅最终回复行为。详细状态针对每个会话，并且在直接聊天、群组、频道和论坛主题中的工作方式相同。

要将未提及的始终在线群聊作为静默房间上下文而不是用户请求提交，请使用 [Ambient room events](/channels/ambient-room-events)：

```json5
{
  messages: {
    groupChat: {
      unmentionedInbound: "room_event",
    },
  },
}
```

默认值是 `unmentionedInbound: "user_request"`。被提及的消息、命令、中止请求和私信仍然属于用户请求。

要要求可见输出通过 group/channel 请求的消息工具：

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "message_tool",
    },
  },
}
```

要对所有来源聊天都强制如此：

```json5
{
  messages: {
    visibleReplies: "message_tool",
  },
}
```

网关在文件保存后会自动获取 `messages` 配置更改，无需重启。只有在禁用了配置重载时才需要重启（`gateway.reload.mode: "off"`）。

命令轮次会绕过 `visibleReplies: "message_tool"` 并始终可见回复：原生斜杠命令（Discord、Telegram 以及其他支持原生命令的界面）和已授权的文本 `/...` 命令都会将其响应发布到源聊天中。群组中的未授权文本 `/...` 轮次仍然仅限消息工具；普通聊天轮次则遵循已配置的默认值。

## <a id="context-visibility-and-allowlists"></a> 上下文可见性和允许名单

群组安全涉及两个不同的控制项：

- **触发授权**：谁可以触发代理（`groupPolicy`、`groups`、`groupAllowFrom`、渠道特定允许名单）。
- **上下文可见性**：将哪些补充上下文注入到模型中（reply/quote文本、线程历史记录、转发的元数据）。

默认情况下，OpenClaw 会按接收到的原样保留上下文：允许名单决定谁可以触发动作，而不是模型能看到哪些被引用或历史片段。若还想过滤补充上下文，请设置 `contextVisibility`：

| 模式                | 行为                                                                         |
| ------------------- | -------------------------------------------------------------------------------- |
| `"all"`（默认）   | 按接收到的原样保留补充上下文。                                           |
| `"allowlist"`       | 仅注入来自白名单发件人的 history/thread/quote/forwarded 上下文。     |
| `"allowlist_quote"` | `allowlist`，并保留来自任何发送者的明确 quoted/replied-to 消息。 |

按通道 （`channels.<channel>.contextVisibility`）、按帐户 （`channels.<channel>.accounts.<accountId>.contextVisibility`） 或全局 （`channels.defaults.contextVisibility`） 设置。获取补充上下文的通道（Discord、Feishu、iMessage、Matrix、Mattermost、Microsoft Teams、QQBot、Signal、Slack、 Telegram、WhatsApp）在构建入站上下文时应用该策略；未知的策略组合忽略了上下文。

这些模式仅过滤通道提供的补充上下文。工具策略和仅限所有者的工具库存仍然是从当前回合的原始请求者中选择的，而不是提示中代表的每个发送者。请参阅 [ 请求者范围的控件和提示上下文](/gateway/security/hardened-baseline#requester-scoped-controls-and-prompt-context)。

![群消息流程](/images/groups-flow.svg)

如果你want...

| 目标                                         | 需要设置什么                                                |
| -------------------------------------------- | ---------------------------------------------------------- |
| 允许所有群组但仅回复 @mentions | `groups: { "*": { requireMention: true } }`                |
| 禁用所有群组回复                    | `groupPolicy: "disabled"`                                  |
| 仅特定群组                         | `groups: { "<group-id>": { ... } }`（不使用 `"*"` 键）         |
| 只有你可以在群组中触发               | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |
| 在各渠道间复用一组受信任发送者 | `groupAllowFrom: ["accessGroup:operators"]`                |

关于可复用的发送者允许名单，请参见 [访问组](/channels/access-groups)。

## <a id="session-keys"></a> 会话键

- 默认情况下，组会话使用 `agent:<agentId>:<channel>:group:<id>` 会话密钥（rooms/channels 使用 `agent:<agentId>:<channel>:channel:<id>`）。
- Telegram 论坛主题会在群组 id 后追加 `:topic:<threadId>`，因此每个主题都有自己的会话。
- 直接聊天使用主会话（如果配置了 `session.dmScope`，则使用按发送者划分的会话）。
- 心跳运行在配置的心跳会话中（默认：agent 主会话）；群组会话不会运行自己的心跳。

当受信任的房间应共享代理的主要对话时，将绑定的 `session.groupScope` 设置为 `"main"`：

```json5
{
  bindings: [
    {
      agentId: "main",
      match: { channel: "slack", peer: { kind: "channel", id: "C0123TEAM" } },
      session: { groupScope: "main" },
    },
  ],
}
```

全局`session.groupScope`支持`"per-group"`（默认）或`"main"`。这不会更改组准入、提及门控或回复路由。

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## <a id="pattern%3A-personal-dms-%2B-public-groups-(single-agent)"></a><a id="pattern-personal-dms-+-public-groups-single-agent"></a> 模式：个人DM+公共群组（单一代理）

是的 - 如果您的“个人”流量是 **DMs** 并且您的“公共”流量是 **groups**，则此方法效果很好。

原因：在单代理模式下，DM 通常使用 **main** 会话密钥 （`agent:main:main`），而群组则使用默认 `groupScope: "per-group"` 下的 **non-main** 会话密钥 （`agent:main:<channel>:group:<id>`）。如果您使用 `mode: "non-main"` 启用沙箱，这些组会话将在配置的沙箱后端中运行，而您的主 DM 会话则保留在主机上。如果您不选择，则 Docker 是默认后端。

<Warning>
配置了 `groupScope: "main"` 的房间是主会话，不受沙箱 `mode: "non-main"` 覆盖。当您依赖该沙箱边界时，请勿将不受信任的或公共的房间合并到主房间中。
</Warning>

这为您提供了一个代理“大脑”（共享工作区+内存），但有两种执行姿势：

- **DMs**：完整工具（主机）
- **群组**：沙箱 + 受限工具

<Note>
如果您需要真正独立的 workspaces/personas（“个人”和“公共”绝不能混合），请使用第二个代理 + 绑定。请参阅 [ 多代理 Routing](/concepts/multi-agent)。
</Note>

<Tabs>
  <Tab id="dms-on-host%2C-groups-sandboxed" title="主机上的 DM、沙盒组">
    ```json5
    {
      agents: {
        defaults: {
          sandbox: {
            mode: "non-main", // groups/channels are non-main -> sandboxed
            scope: "session", // strongest isolation (one container per group/channel)
            workspaceAccess: "none",
          },
        },
      },
      tools: {
        sandbox: {
          tools: {
            // If allow is non-empty, everything else is blocked (deny still wins).
            allow: ["group:messaging", "group:sessions"],
            deny: ["group:runtime", "group:fs", "group:ui", "nodes", "cron", "gateway"],
          },
        },
      },
    }
    ```
  </Tab>
  <Tab id="groups-see-only-an-allowlisted-folder" title="群组只能看到列入许可名单的文件夹">
    想要的是“群组只能看到文件夹 X”，而不是“没有宿主机访问”？保留 `workspaceAccess: "none"`，然后只把允许名单中的路径挂载到沙箱里：

    ```json5
    {
      agents: {
        defaults: {
          sandbox: {
            mode: "non-main",
            scope: "session",
            workspaceAccess: "none",
            docker: {
              binds: [
                // hostPath:containerPath:mode
                "/home/user/FriendsShared:/data:ro",
              ],
            },
          },
        },
      },
    }
    ```

  </Tab>
</Tabs>

相关：

- 配置键和默认值：[网关配置](/gateway/config-agents/sandbox#agentsdefaultssandbox)
- 调试工具被阻止的原因：[Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated)
- 绑定安装详细信息：[Sandboxing](/gateway/sandboxing#multiple-folders-for-one-agent)

## <a id="display-labels"></a> 显示标签

- UI 标签在可用时使用 `displayName`，格式为 `<channel>:<token>`。
- `#room` 为rooms/channels 保留；群聊使用 `g-<slug>`（小写，空格 -> `-`，保留 `#@+._-`）。非常长的不透明 ID 被缩短为稳定的令牌，而不是将完整的路由 ID 泄漏到 UI 中。

## <a id="group-policy"></a> 群组策略

Control 每个通道如何处理 group/room 消息：

```json5
{
  channels: {
    whatsapp: {
      groupPolicy: "disabled", // "open" | "disabled" | "allowlist"
      groupAllowFrom: ["+15551234567"],
    },
    telegram: {
      groupPolicy: "disabled",
      groupAllowFrom: ["123456789"], // numeric Telegram user id (setup resolves @username)
    },
    signal: {
      groupPolicy: "disabled",
      groupAllowFrom: ["+15551234567"],
    },
    imessage: {
      groupPolicy: "disabled",
      groupAllowFrom: ["chat_id:123"],
    },
    msteams: {
      groupPolicy: "disabled",
      groupAllowFrom: ["user@org.com"],
    },
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        GUILD_ID: { channels: { help: { enabled: true } } },
      },
    },
    slack: {
      groupPolicy: "allowlist",
      channels: { "#general": { enabled: true } },
    },
    matrix: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["@owner:example.org"],
      groups: {
        "!roomId:example.org": { enabled: true },
        "#alias:example.org": { enabled: true },
      },
    },
  },
}
```

| 策略        | 行为                                                     |
| ------------- | ------------------------------------------------------------ |
| `"open"`      | 群组绕过允许名单；但提及门控仍然生效。      |
| `"disabled"`  | 完全阻止所有群组消息。                           |
| `"allowlist"` | 仅允许与配置的白名单匹配的 groups/rooms。 |

<AccordionGroup>
  <Accordion id="per-channel-notes" title="每个通道的注释">
    - `groupPolicy` 与提及门控是分开的（提及门控需要 @mentions）。
    - WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo：使用 `groupAllowFrom`（回退：显式 `allowFrom`）。
    - Signal：`groupAllowFrom` 可以匹配入站 Signal 组 ID 或发件人 phone/UUID.
    - DM 配对批准（`*-allowFrom` 存储条目）仅适用于 DM 访问；群组发送者授权仍然显式地依赖群组允许名单。
    - Discord：允许名单使用 `channels.discord.guilds.<id>.channels`。
    - Slack：允许名单使用 `channels.slack.channels`。
    - Matrix：白名单使用 `channels.matrix.groups`。使用房间 ID（`!room:server`，或房间版本 12+ 上的无后缀 `!room` 形式）或别名（`#alias:server`）； room-name 键仅与 `channels.matrix.dangerouslyAllowNameMatching: true` 匹配，并且未解析的条目在运行时将被忽略。 Use `channels.matrix.groupAllowFrom` to restrict senders；还支持每个房间的 `users` 允许列表。
    - Group DM 单独控制（`channels.discord.dm.*`、`channels.slack.dm.*`：`groupEnabled`、`groupChannels`）。
    - Telegram：发件人白名单仅接受数字用户 ID（`"123456789"`；`telegram:`/`tg:` 前缀将被删除，不区分大小写）。 `@username` 条目在运行时不匹配并记录警告； setup resolves `@username` to IDs.否定聊天 ID 属于 `channels.telegram.groups`，而不属于发件人白名单。
    - 默认值为 `groupPolicy: "allowlist"`；如果你的群组允许名单为空，群组消息将被阻止。
    - 运行时安全：当提供程序块完全丢失（`channels.<provider>`不存在）时，组策略默认为`allowlist`而不是继承`channels.defaults.groupPolicy`，并且网关为每个帐户记录一次回退。

  </Accordion>
</AccordionGroup>

快速心智模型（群消息的评估顺序）：

<Steps>
  <Step id="grouppolicy" title="组策略">
    `groupPolicy` (open/disabled/allowlist).
  </Step>
  <Step id="group-allowlists-1" title="群组许可名单">
    群组允许名单（`*.groups`、`*.groupAllowFrom`、特定渠道允许名单）。
  </Step>
  <Step id="mention-gating" title="提及门控">
    提及门控（`requireMention`、`/activation`）。
  </Step>
</Steps>

## <a id="mention-gating-(default)"></a><a id="mention-gating-default"></a> Mention 门控（默认）

群组消息默认需要提及，除非按群组单独覆盖。默认值按子系统存放在 `*.groups."*"` 下。

支持的隐式提及事实因渠道而异：

| 事实                  | 当前内置生成者                       |
| --------------------- | ------------------------------------------------ |
| 回复机器人      | Discord、Microsoft Teams、QQBot、Slack、Telegram |
| 引用机器人      | LINE、WhatsApp、Zalo 个人                    |
| 机器人加入线程 | Mattermost， Slack， 特龙                          |

每个事实在通道生成时默认启用。捆绑通道中，LINE、Mattermost、Slack、Tlon读取对应的`implicitMentions`标志；将其设置为 `false` 以阻止该事实绕过提及门控。 LINE 仅从共享 `channels.defaults.implicitMentions` 块中读取；它不接受自己的通道或帐户范围的 `implicitMentions` 块。 Native explicit mentions remain unaffected.上面列出的其他捆绑生产商当前不读取 `implicitMentions`，因此他们的事实始终算作提及，并且该标志无法将其关闭。标志对于不产生该事实的通道也没有影响。

```json5
{
  channels: {
    whatsapp: {
      groups: {
        "*": { requireMention: true },
        "123@g.us": { requireMention: false },
      },
    },
    telegram: {
      groups: {
        "*": { requireMention: true },
        "123456789": { requireMention: false },
      },
    },
    imessage: {
      groups: {
        "*": { requireMention: true },
        "123": { requireMention: false },
      },
    },
  },
  agents: {
    entries: {
      main: {
        groupChat: {
          mentionPatterns: ["@openclaw", "openclaw", "\\+15555550123"],
          historyLimit: 50,
        },
      },
    },
  },
}
```

## <a id="scope-configured-mention-patterns"></a> 已配置的提及模式范围

已配置的 `mentionPatterns` 是正则回退触发器。当平台不提供原生机器人提及，或者你希望像 `openclaw:` 这样的纯文本也计为提及时，请使用它们。原生平台提及是独立的：当 Discord、Slack、Telegram、Matrix、Signal 或其他渠道能够证明消息明确提到了机器人时，即使已配置的正则模式被拒绝，该原生提及仍会触发。

默认情况下，只要该渠道在提及检测中能将提供方和会话事实传入，已配置的提及模式就会在所有地方生效。为了避免宽泛模式在每个群组中都唤醒代理，请使用 `channels.<channel>.mentionPatterns` 按渠道进行作用域限定。

当某个渠道的正则提及模式默认应关闭时，请使用 `mode: "deny"`，然后通过 `allowIn` 为特定房间启用：

```json5
{
  messages: {
    groupChat: {
      mentionPatterns: ["\\bopenclaw\\b", "\\bops bot\\b"],
    },
  },
  channels: {
    slack: {
      mentionPatterns: {
        mode: "deny",
        allowIn: ["C0123OPS"],
      },
    },
  },
}
```

当正则提及模式应广泛适用时，请使用默认的 `mode: "allow"`（或省略 `mode`），然后通过 `denyIn` 在噪声较大的房间中将其关闭：

```json5
{
  messages: {
    groupChat: {
      mentionPatterns: ["\\bopenclaw\\b"],
    },
  },
  channels: {
    telegram: {
      mentionPatterns: {
        denyIn: ["-1001234567890", "-1001234567890:topic:42"],
      },
    },
  },
}
```

策略解析：

| 字段           | 作用                                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------------------- |
| `mode: "allow"` | 除非会话 ID 在 `denyIn` 中，否则启用正则提及模式。这是默认值。                    |
| `mode: "deny"`  | 除非会话 ID 在 `allowIn` 中，否则禁用正则提及模式。                                       |
| `allowIn`       | 在拒绝模式下启用正则表达式提及模式的对话 ID。                                               |
| `denyIn`        | 禁用正则表达式提及模式的对话 ID。`denyIn`战胜`allowIn`如果两者都包含相同的ID。 |

当前支持的作用域正则策略：

| 渠道  | `allowIn` / `denyIn` 中使用的 ID                             |
| -------- | ------------------------------------------------------------ |
| Discord  | Discord 通道 ID。                                         |
| Matrix   | Matrix 房间 ID。                                             |
| Slack    | Slack 通道 ID。                                           |
| Telegram | 群聊 ID，或论坛主题的 `chatId:topic:threadId`。 |
| WhatsApp | WhatsApp 会话 ID，例如 `123@g.us`。                |

当该渠道支持多个账号时，账号级渠道配置可以在 `channels.<channel>.accounts.<accountId>.mentionPatterns` 下设置相同策略。账号策略优先于该账号对应的顶层渠道策略。

<AccordionGroup>
  <Accordion id="mention-gating-notes" title="提及门控注释">
    - `mentionPatterns` 是大小写不敏感且安全的正则模式；无效模式和不安全的嵌套重复形式会被忽略（并给出警告）。
    - 模式优先级：`agents.entries.*.groupChat.mentionPatterns`（当多个代理共享一个组时有用）覆盖`messages.groupChat.mentionPatterns`；如果两者均未设置，则模式将从路由代理的 `identity.name` 和 `identity.emoji` 派生。选定级别的显式 `mentionPatterns: []` 会抑制这种推导； native mentions remain separate。
    - 提及门控可以在没有显式配置模式的情况下应用：身份派生模式也可以启用检测。在门控之前需要可检测提及的通道上，只有缺乏可用模式和本机提及支持才能阻止执行。
    - 将群组或发送者加入白名单不会关闭提及门控；如果所有消息都应触发，请将该群组的 `requireMention` 设为 `false`。
    - 外部群组提示上下文包括`NO_REPLY`指导； direct-message prompts omit it.工作区文件不应重复这些机制。
    - A 仅代币 `NO_REPLY` 记录故意沉默。空或仅推理模型输出不等于 `NO_REPLY` 并保留恢复。在仅消息工具模式下，可见回复使用 `message(action=send)`。
    - Always-on 群组消息使用用户请求语义并默认要求回复。设置 `messages.groupChat.unmentionedInbound: "room_event"` 将它们作为安静上下文提交。请参阅 [ 环境房间事件 ](/channels/ambient-room-events) 了解支持的通道和设置示例。
    - 房间事件不会作为伪造的用户请求存储，且来自无消息工具房间事件的私有助手文本不会作为聊天历史重放。
    - Discord 的默认值位于 `channels.discord.guilds."*"` 中（可按 guild/channel 覆盖）。
    - 群历史上下文在各渠道中均以统一方式包装。受提及门控的群组会保留待处理的跳过消息；常开群组在渠道支持时，也可能保留最近已处理的房间消息。全局默认值使用 `messages.groupChat.historyLimit`，覆盖项使用 `channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）。设为 `0` 可禁用。

  </Accordion>
</AccordionGroup>

## <a id="group%2Fchannel-tool-restrictions-(optional)"></a><a id="group/channel-tool-restrictions-optional"></a> Group/channel 刀具限制（可选）

某些通道配置支持限制特定 group/room/channel**内哪些工具可用**。

- `tools`：allow/deny 整个组的工具（`allow`、`alsoAllow`、`deny`；否认获胜）。
- `toolsBySender`：组内每个发送者覆盖。使用显式键前缀：`channel:<channelId>:<senderId>`、`id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>` 和 `"*"` 通配符。使用主 OpenClaw 通道 id；诸如 `teams` 之类的别名标准化为 `msteams`。在启动网关之前，运行 `openclaw doctor --fix` 将已停用的无前缀密钥迁移到 `id:` 条目。由于 `username:` 和 `name:` 与可变发件人属性（成员可以更改的句柄和显示名称）匹配，因此优先选择 `id:` 键作为授予额外工具或覆盖组 `deny` 规则的条目。

当发送者或组策略限制回合的工具时，请求者只能创建同一代理的隐藏助手。可见和跨代理会话被拒绝，包括通过 ACP 或 `sessions_send` 自动创建会话。帮助程序保留受限工具以及请求者的工作空间和会话根目录。该限制遵循委派和排队轮流；不受限制的发件人的后续轮次不会替换它。所有者授权的自动化保留其单独的调度策略和工作区。

解析顺序（越具体优先级越高）：

<Steps>
  <Step id="group-toolsbysender" title="按发件人分组工具">
    Group/channel `toolsBySender` 匹配。
  </Step>
  <Step id="group-tools" title="群组工具">
    Group/channel `tools`.
  </Step>
  <Step id="default-toolsbysender" title="默认工具按发件人">
    默认（`"*"`）的 `toolsBySender` 匹配。
  </Step>
  <Step id="default-tools" title="默认工具">
    默认（`"*"`）的 `tools`。
  </Step>
</Steps>

示例（Telegram）：

```json5
{
  channels: {
    telegram: {
      groups: {
        "*": { tools: { deny: ["exec"] } },
        "-1001234567890": {
          tools: { deny: ["exec", "read", "write"] },
          toolsBySender: {
            "id:123456789": { alsoAllow: ["exec"] },
          },
        },
      },
    },
  },
}
```

<Note>
除了 global/agent 工具策略之外，还应用 Group/channel 工具限制（拒绝仍然获胜）。某些通道对 rooms/channels 使用不同的嵌套（e.g.、Discord `guilds.*.channels.*`、Slack `channels.*`、Microsoft Teams `teams.*.channels.*`）。
</Note>

## <a id="group-allowlists"></a> 群组允许列表

当配置了 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 时，这些键会被用作群组允许列表。使用 `"*"` 可以允许所有群组，同时仍然设置默认的 @ 提及行为。

<Note>
常见误解：DM 配对授权与群组授权并不相同。对于支持 DM 配对的通道，配对存储只会解锁私聊。群组命令仍然需要来自已配置允许列表的显式群组发送者授权，例如 `groupAllowFrom`，或者该通道文档中描述的配置回退。
</Note>

共同意图（copy/paste）：

<Tabs>
  <Tab id="disable-all-group-replies" title="禁用所有群组回复">
    ```json5
    {
      channels: { whatsapp: { groupPolicy: "disabled" } },
    }
    ```
  </Tab>
  <Tab id="allow-only-specific-groups-whatsapp" title="仅允许特定组 （WhatsApp）">
    ```json5
    {
      channels: {
        whatsapp: {
          groups: {
            "123@g.us": { requireMention: true },
            "456@g.us": { requireMention: false },
          },
        },
      },
    }
    ```
  </Tab>
  <Tab id="allow-all-groups-but-require-mention" title="允许所有群组但需要提及">
    ```json5
    {
      channels: {
        whatsapp: {
          groups: { "*": { requireMention: true } },
        },
      },
    }
    ```
  </Tab>
  <Tab id="owner-only-triggers-whatsapp" title="仅限所有者触发器 （WhatsApp）">
    ```json5
    {
      channels: {
        whatsapp: {
          groupPolicy: "allowlist",
          groupAllowFrom: ["+15551234567"],
          groups: { "*": { requireMention: true } },
        },
      },
    }
    ```
  </Tab>
</Tabs>

## <a id="activation-(owner-only)"></a><a id="activation-owner-only"></a> 激活（仅所有者）

群组所有者可以通过一条独立消息切换每个群组的激活方式：

- `/activation mention`
- `/activation always`

`/activation` 是一个核心的仅所有者可用命令，且仅适用于群聊。所有者指的是发送者与 `commands.ownerAllowFrom` 匹配；频道 `allowFrom` 列表只用于控制普通频道和命令访问。存储的模式会覆盖该群组在会参考它的频道（Google Chat、QQBot、Telegram、WhatsApp）上的 `requireMention`，并且群组系统提示的介绍会在所有地方反映当前启用的模式。

## <a id="context-fields"></a> 上下文字段

群组入站负载会设置：

- `ChatType=group`
- `GroupSubject`（如果已知）
- `GroupMembers`（如果已知）
- `WasMentioned`（提及门控结果）
- Telegram 论坛主题还会包含 `MessageThreadId` 和 `IsForum`。

代理系统提示词会在新的群组会话的第一轮（以及在 `/activation` 变更之后）包含一段群组介绍。它会提醒模型像人类一样回应，尽量减少空行并遵循正常的聊天间距，同时避免输入字面上的 `\n` 序列。其声明的表格模式不会保留原生或原始表格的频道，也会不鼓励使用 Markdown 表格。来自频道的群组名称和参与者标签会以带围栏的未受信元数据形式呈现，而不是作为行内系统指令。

## <a id="imessage-specifics"></a> iMessage 细节

- 路由或加入允许列表时，优先使用 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群组回复始终返回到同一个 `chat_id`。

## <a id="related"></a> 相关内容

<a id="whatsapp-system-prompts" />
<a id="whatsapp-specifics" />

- [广播组](/channels/broadcast-groups)
- [频道路由](/channels/channel-routing)
- [群组消息](/channels/group-messages) — WhatsApp-only 行为（历史记录注入，提及处理细节）
- [配对](/channels/pairing)
- [WhatsApp](/channels/whatsapp#system-prompts) — WhatsApp 系统提示规则，包括组和直接提示解析、通配符行为和帐户覆盖语义
