---
summary: "跨表面的群聊行为（Discord/iMessage/Matrix/Microsoft Teams/Signal/Slack/Telegram/WhatsApp/Zalo）"
read_when:
  - 更改群聊行为或提及门控
title: "群组"
sidebarTitle: "群组"
---

OpenClaw 在各个平台上的群聊处理保持一致：Discord、iMessage、Matrix、Microsoft Teams、Signal、Slack、Telegram、WhatsApp、Zalo。

有关应提供静默上下文、除非代理显式发送可见消息的始终在线房间，请参见 [Ambient room events](/channels/ambient-room-events)。

## 初学者简介（2 分钟）

OpenClaw “运行”在你自己的消息账号上。并没有单独的 WhatsApp 机器人用户。如果 **你** 在某个群里，OpenClaw 就能看到该群并在那里回应。

默认行为：

- 群组受限（`groupPolicy: "allowlist"`）。
- 回复需要提及，除非你显式禁用提及门控。
- 群组/频道中的可见回复默认使用 `message` 工具。

翻译一下：在允许名单中的发送者可以通过提及 OpenClaw 来触发它。

<Note>
**简而言之**

- **DM 访问** 由 `*.allowFrom` 控制。
- **群组访问** 由 `*.groupPolicy` + 允许名单（`*.groups`、`*.groupAllowFrom`）控制。
- **回复触发** 由提及门控（`requireMention`、`/activation`）控制。

</Note>

快速流程（群消息会发生什么）：

```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
mention/reply/command/DM -> user request
always-on group chatter -> user request, or room event when configured
```

## 可见回复

对于正常的群组/频道请求，OpenClaw 默认将 `messages.groupChat.visibleReplies` 设为 `"automatic"`。最终的助手文本会通过旧的可见回复路径发布，除非你将该房间切换为仅使用 message 工具输出。

当共享房间应当让代理通过调用 `message(action=send)` 来决定何时发言时，请使用 `messages.groupChat.visibleReplies: "message_tool"`。这在由最新一代、工具可靠性高的模型（例如 GPT 5.5）驱动的群组房间中效果最佳。如果模型遗漏了该工具调用并返回了实质性的最终文本，OpenClaw 会将该最终文本保密，而不是发布到房间中。

如果在当前工具策略下 message 工具不可用，OpenClaw 会回退到自动可见回复，而不是静默抑制响应。
`openclaw doctor` 会提醒这种不匹配。

对于直接聊天以及任何其他来源事件，请使用 `messages.visibleReplies: "message_tool"` 以在全局范围内应用相同的仅工具可见回复行为。一些运行环境（包括 Codex）在此项未设置时，也会默认将直接/来源聊天通过 message-tool 交付。将 `messages.visibleReplies: "automatic"` 设为强制使用旧的自动最终回复路径。`messages.groupChat.visibleReplies` 仍然是针对群组/频道房间更具体的覆盖项。

这替代了旧的模式：在大多数潜伏模式轮次中强制模型回答 `NO_REPLY`。在仅工具模式下，不做任何可见输出就只是意味着不调用 message 工具。

直接群组请求仍会发送输入指示。启用后，环境式 always-on 房间事件仍保持严格安静，除非代理调用 message 工具。

Sessions 默认会抑制冗长的工具/进度摘要。使用 `/verbose on`
可在当前会话中显示这些摘要以便调试，使用
`/verbose off` 返回仅最终回复的行为。相同的 verbose 状态
适用于直接聊天、群组、频道和论坛主题。

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

默认值是 `unmentionedInbound: "user_request"`。

被提及的消息、命令、中止请求和 DM 仍保持为用户请求。

要让群组/频道请求的可见输出必须通过 message 工具：

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "message_tool",
    },
  },
}
```

当文件保存后，Gateway 会热重载 `messages` 配置。只有在部署中禁用了文件监听或配置重载时才需要重启。

要让每个来源聊天的可见输出都必须通过 message 工具：

```json5
{
  messages: {
    visibleReplies: "message_tool",
  },
}
```

原生斜杠命令（Discord、Telegram，以及其他支持原生命令的界面）会绕过 `visibleReplies: "message_tool"`，并始终可见回复，以便频道原生命令 UI 收到它期望的响应。这只适用于已验证的原生命令轮次；手动输入的文本 `/...` 命令和普通聊天轮次仍然遵循配置的群组默认值。

## 上下文可见性和允许名单

群组安全涉及两个不同的控制项：

- **触发授权**：谁可以触发代理（`groupPolicy`、`groups`、`groupAllowFrom`、特定渠道的允许名单）。
- **上下文可见性**：哪些补充上下文会注入到模型中（回复文本、引用、线程历史、转发元数据）。

默认情况下，OpenClaw 优先保持正常聊天行为，并尽量按接收到的样子保留上下文。这意味着允许名单主要决定谁能触发动作，而不是对每一段被引用或历史片段都构成一个通用的脱敏边界。

<AccordionGroup>
  <Accordion title="当前行为是按渠道区分的">
    - 某些渠道已经在特定路径中对补充上下文应用了基于发送者的过滤（例如 Slack 线程种子、Matrix 回复/线程查找）。
    - 其他渠道仍会按接收到的样子传递引用/回复/转发上下文。

  </Accordion>
  <Accordion title="加固方向（计划中）">
    - `contextVisibility: "all"`（默认）保持当前“按接收样子”的行为。
    - `contextVisibility: "allowlist"` 会将补充上下文过滤为仅允许名单中的发送者。
    - `contextVisibility: "allowlist_quote"` 是 `allowlist` 再加一个明确的引用/回复例外。

    在这个加固模型尚未在所有渠道一致实现之前，请预期不同表面会有差异。

  </Accordion>
</AccordionGroup>

![群消息流程](/images/groups-flow.svg)

如果你想要...

| 目标                                         | 需要设置什么                                               |
| -------------------------------------------- | ---------------------------------------------------------- |
| 允许所有群组但只在 @ 提及时回复 | `groups: { "*": { requireMention: true } }`                |
| 禁用所有群组回复                    | `groupPolicy: "disabled"`                                  |
| 仅特定群组                           | `groups: { "<group-id>": { ... } }`（不使用 `"*"` 键）     |
| 只有你可以在群组中触发               | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |
| 在各渠道间复用一组受信任发送者     | `groupAllowFrom: ["accessGroup:operators"]`                |

关于可复用的发送者允许名单，请参见 [访问组](/channels/access-groups)。

## 会话键

- 群组会话使用 `agent:<agentId>:<channel>:group:<id>` 会话键（房间/频道使用 `agent:<agentId>:<channel>:channel:<id>`）。
- Telegram 论坛主题会在群组 id 后追加 `:topic:<threadId>`，因此每个主题都有自己的会话。
- 直接聊天使用主会话（或按发送者单独配置时使用按发送者会话）。
- 群组会话会跳过心跳。

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## 模式：个人 DM + 公开群组（单代理）

可以——如果你的“个人”流量是 **DM**，而“公开”流量是 **群组**，这样做非常合适。

原因：在单代理模式下，DM 通常落到 **主** 会话键（`agent:main:main`），而群组总是使用 **非主** 会话键（`agent:main:<channel>:group:<id>`）。如果你启用了 `mode: "non-main"` 的沙箱，这些群组会话会在配置好的沙箱后端中运行，而你的主 DM 会话仍留在宿主机上。如果你不指定后端，Docker 是默认后端。

这样你就得到一个代理“大脑”（共享工作区 + 记忆），但有两种执行姿态：

- **DM**：完整工具（宿主机）
- **群组**：沙箱 + 受限工具

<Note>
如果你需要真正分离的工作区/人格（“个人”和“公开”绝不能混在一起），请使用第二个代理 + 绑定。参见 [多代理路由](/concepts/multi-agent)。
</Note>

<Tabs>
  <Tab title="DM 在宿主机上，群组在沙箱中">
    ```json5
    {
      agents: {
        defaults: {
          sandbox: {
            mode: "non-main", // 群组/频道是 non-main -> 进入沙箱
            scope: "session", // 最强隔离（每个群组/频道一个容器）
            workspaceAccess: "none",
          },
        },
      },
      tools: {
        sandbox: {
          tools: {
            // 如果 allow 非空，其他一切都会被阻止（deny 仍然优先）。
            allow: ["group:messaging", "group:sessions"],
            deny: ["group:runtime", "group:fs", "group:ui", "nodes", "cron", "gateway"],
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="群组只看到一个允许名单中的文件夹">
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
                // 主机路径:容器路径:模式
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

相关内容：

- 配置键和默认值：[Gateway 配置](/gateway/config-agents#agentsdefaultssandbox)
- 调试为什么某个工具被阻止：[沙箱 vs 工具策略 vs 提权](/gateway/sandbox-vs-tool-policy-vs-elevated)
- 挂载绑定详情：[沙箱化](/gateway/sandboxing#custom-bind-mounts)

## 显示标签

- UI 标签在可用时使用 `displayName`，格式为 `<channel>:<token>`。
- `#room` 预留给房间/频道；群聊使用 `g-<slug>`（小写，空格 -> `-`，保留 `#@+._-`）。

## 群组策略

按渠道控制群组/房间消息的处理方式：

```json5
{
  channels: {
    whatsapp: {
      groupPolicy: "disabled", // "open" | "disabled" | "allowlist"
      groupAllowFrom: ["+15551234567"],
    },
    telegram: {
      groupPolicy: "disabled",
      groupAllowFrom: ["123456789"], // 数字型 Telegram 用户 id（向导可以解析 @username）
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
        GUILD_ID: { channels: { help: { allow: true } } },
      },
    },
    slack: {
      groupPolicy: "allowlist",
      channels: { "#general": { allow: true } },
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

| 策略          | 行为                                                         |
| ------------- | ------------------------------------------------------------ |
| `"open"`      | 群组绕过允许名单；但提及门控仍然生效。                       |
| `"disabled"`  | 完全阻止所有群组消息。                                       |
| `"allowlist"` | 仅允许匹配配置中允许名单的群组/房间。                        |

<AccordionGroup>
  <Accordion title="按渠道说明">
    - `groupPolicy` 与提及门控是分开的（提及门控需要 @ 提及）。
    - WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo：使用 `groupAllowFrom`（回退：显式 `allowFrom`）。
    - Signal：`groupAllowFrom` 可以匹配传入的 Signal 群组 id 或发送者电话/UUID。
    - DM 配对审批（`*-allowFrom` 存储项）仅适用于 DM 访问；群组发送者授权仍然显式依赖群组允许名单。
    - Discord：允许名单使用 `channels.discord.guilds.<id>.channels`。
    - Slack：允许名单使用 `channels.slack.channels`。
    - Matrix：允许名单使用 `channels.matrix.groups`。优先使用房间 ID 或别名；已加入房间名称查找尽力而为，未解析的名称会在运行时被忽略。使用 `channels.matrix.groupAllowFrom` 来限制发送者；也支持按房间的 `users` 允许名单。
    - 群组 DM 由单独配置控制（`channels.discord.dm.*`、`channels.slack.dm.*`）。
    - Telegram 允许名单可以匹配用户 ID（`"123456789"`、`"telegram:123456789"`、`"tg:123456789"`）或用户名（`"@alice"` 或 `"alice"`）；前缀不区分大小写。
    - 默认值是 `groupPolicy: "allowlist"`；如果你的群组允许名单为空，群组消息会被阻止。
    - 运行时安全：当某个 provider 配置块完全缺失（`channels.<provider>` 不存在）时，群组策略会回退到 fail-closed 模式（通常是 `allowlist`），而不是继承 `channels.defaults.groupPolicy`。

  </Accordion>
</AccordionGroup>

快速心智模型（群消息的评估顺序）：

<Steps>
  <Step title="groupPolicy">
    `groupPolicy`（open/disabled/allowlist）。
  </Step>
  <Step title="群组允许名单">
    群组允许名单（`*.groups`、`*.groupAllowFrom`、特定渠道允许名单）。
  </Step>
  <Step title="提及门控">
    提及门控（`requireMention`、`/activation`）。
  </Step>
</Steps>

## 提及门控（默认）

群组消息默认需要提及，除非按群组单独覆盖。默认值按子系统存放在 `*.groups."*"` 下。

当渠道支持回复元数据时，回复机器人消息会被视为隐式提及。在提供引用元数据的渠道上，引用机器人消息也可能被视为隐式提及。当前内置案例包括 Telegram、WhatsApp、Slack、Discord、Microsoft Teams 和 ZaloUser。

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
    list: [
      {
        id: "main",
        groupChat: {
          mentionPatterns: ["@openclaw", "openclaw", "\\+15555550123"],
          historyLimit: 50,
        },
      },
    ],
  },
}
```

<AccordionGroup>
  <Accordion title="提及门控说明">
    - `mentionPatterns` 是不区分大小写的安全正则表达式模式；无效模式和不安全的嵌套重复形式会被忽略。
    - 提供显式提及的界面仍然会通过；模式只是回退方案。
    - 按代理覆盖：`agents.list[].groupChat.mentionPatterns`（当多个代理共享一个群组时很有用）。
    - 只有在可进行提及检测时才会强制提及门控（原生提及或已配置 `mentionPatterns`）。
    - 将群组或发送者加入允许名单不会取消提及门控；当所有消息都应触发时，将该群组的 `requireMention` 设为 `false`。
    - 自动群聊提示上下文会在每一轮携带已解析的静默回复指令；工作区文件不应重复 `NO_REPLY` 机制。
    - 允许自动静默回复的群组会将干净的空输出或仅推理输出的模型轮次视为静默，等同于 `NO_REPLY`。直接聊天永远不会收到 `NO_REPLY` 指导，而仅工具群组回复则通过不调用 `message(action=send)` 来保持静默。
    - 环境式始终在线群聊默认使用用户请求语义。将 `messages.groupChat.unmentionedInbound` 设为 `"room_event"` 可将其改为静默上下文提交。有关设置示例，请参见 [Ambient room events](/channels/ambient-room-events)。
    - 房间事件不会被存储为伪造的用户请求，并且来自无 message-tool 房间事件的私有助手文本不会作为聊天历史重放。
    - Discord 的默认值位于 `channels.discord.guilds."*"`（可按 guild/channel 覆盖）。
    - 群组历史上下文在各渠道中均以统一方式包装。受提及门控的群组会保留待处理的跳过消息；始终在线的群组在渠道支持时也可能保留最近已处理的房间消息。全局默认值使用 `messages.groupChat.historyLimit`，覆盖项使用 `channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）。设为 `0` 可禁用。

  </Accordion>
</AccordionGroup>

## 群组/渠道工具限制（可选）

某些渠道配置支持限制在**特定群组/房间/渠道内部**可用的工具。

- `tools`: 为整个群组允许/拒绝工具。
- `toolsBySender`: 群组内按发送者覆盖。使用显式键前缀：`channel:<channelId>:<senderId>`、`id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>` 和 `"*"` 通配符。渠道 id 使用 OpenClaw 规范渠道 id；像 `teams` 这样的别名会规范化为 `msteams`。旧版未加前缀的键仍然被接受，但只会按 `id:` 匹配。

解析顺序（越具体优先级越高）：

<Steps>
  <Step title="群组 toolsBySender">
    匹配群组/渠道的 `toolsBySender`。
  </Step>
  <Step title="群组 tools">
    群组/渠道的 `tools`。
  </Step>
  <Step title="默认 toolsBySender">
    默认（`"*"`）的 `toolsBySender` 匹配。
  </Step>
  <Step title="默认 tools">
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
群组/渠道工具限制会在全局/代理工具策略之上应用（deny 仍然优先）。某些渠道对房间/渠道使用不同的嵌套方式（例如 Discord `guilds.*.channels.*`、Slack `channels.*`、Microsoft Teams `teams.*.channels.*`）。
</Note>

## 群组允许列表

当配置了 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 时，这些键会作为群组允许列表使用。使用 `"*"` 可以允许所有群组，同时仍然设置默认提及行为。

<Warning>
常见混淆：DM 配对授权不等同于群组授权。对于支持 DM 配对的渠道，配对存储仅解锁 DM。群组命令仍需要来自配置允许列表的显式群组发送者授权，例如 `groupAllowFrom`，或该渠道文档中说明的配置回退。
</Warning>

常见意图（复制/粘贴）：

<Tabs>
  <Tab title="禁用所有群组回复">
    ```json5
    {
      channels: { whatsapp: { groupPolicy: "disabled" } },
    }
    ```
  </Tab>
  <Tab title="仅允许特定群组（WhatsApp）">
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
  <Tab title="允许所有群组但要求提及">
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
  <Tab title="仅限所有者触发（WhatsApp）">
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

## 激活（仅所有者）

群组所有者可以切换每个群组的激活方式：

- `/activation mention`
- `/activation always`

所有者由 `channels.whatsapp.allowFrom`（若未设置，则由机器人自身的 E.164）决定。将命令作为独立消息发送。其他界面当前会忽略 `/activation`。

## 上下文字段

群组入站负载会设置：

- `ChatType=group`
- `GroupSubject`（如果已知）
- `GroupMembers`（如果已知）
- `WasMentioned`（提及门控结果）
- Telegram 论坛主题还会包含 `MessageThreadId` 和 `IsForum`。

代理系统提示在新群组会话的首次轮次中包含一个群组简介。它会提醒模型像人类一样回复，避免使用 Markdown 表格，尽量减少空行并遵循正常的聊天间距，以及避免输入字面上的 `\n` 序列。来自渠道的群组名称和参与者标签会被渲染为带围栏的未受信元数据，而不是内联系统指令。

## iMessage 细节

- 路由或加入允许列表时，优先使用 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群组回复始终返回到同一个 `chat_id`。

## WhatsApp 系统提示

请参阅 [WhatsApp](/channels/whatsapp#system-prompts) 获取权威的 WhatsApp 系统提示规则，包括群组和直接消息的提示解析、通配符行为以及账户覆盖语义。

## WhatsApp 细节

请参阅 [群组消息](/channels/group-messages) 了解仅适用于 WhatsApp 的行为（历史注入、提及处理细节）。

## 相关内容

- [广播群组](/channels/broadcast-groups)
- [渠道路由](/channels/channel-routing)
- [群组消息](/channels/group-messages)
- [配对](/channels/pairing)
