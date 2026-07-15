---
summary: "跨界面的群聊行为（Discord/iMessage/Matrix/Microsoft Teams/QQBot/Signal/Slack/Telegram/WhatsApp/Zalo）"
read_when:
  - 更改群聊行为或提及门控时
  - 将 `mentionPatterns` 限定到特定群聊会话时
title: "群组"
sidebarTitle: "群组"
---

OpenClaw 在所有支持群聊的渠道中应用相同的群组规则，包括 Discord、iMessage、Matrix、Microsoft Teams、QQBot、Signal、Slack、Telegram、WhatsApp 和 Zalo。

有关应提供静默上下文、除非代理显式发送可见消息的始终在线房间，请参见 [Ambient room events](/channels/ambient-room-events)。

## 初学者简介（2 分钟）

OpenClaw “运行”在你自己的消息账号上。这里没有单独的 WhatsApp 机器人用户：如果**你**在某个群里，OpenClaw 就能看到那个群并在那里响应。

默认行为：

- 群组受限制（`groupPolicy: "allowlist"`）；在被加入允许名单之前，群消息发送者会被阻止。
- 回复需要提及，除非你为某个群组禁用了提及门控。
- 最终回复文本会自动发布到房间（`visibleReplies: "automatic"`）。

翻译一下：在允许名单中的发送者可以通过提及 OpenClaw 来触发它。

<Note>
**简而言之**

- **DM 访问** 由 `*.allowFrom` 控制。
- **群组访问** 由 `*.groupPolicy` + 允许名单（`*.groups`、`*.groupAllowFrom`）控制。
- **回复触发** 由提及门控（`requireMention`、`/activation`）控制。

</Note>

快速流程（群消息会发生什么）：

```text
groupPolicy? disabled -> 丢弃
groupPolicy? allowlist -> 群组允许？否 -> 丢弃
requireMention? 是 -> 是否提及？否 -> 仅存储用于上下文
mention/reply/command/DM -> 用户请求
always-on group chatter -> 用户请求，或在配置时生成房间事件
```

## 可见回复

对于普通的群组/频道请求，OpenClaw 默认使用 `messages.groupChat.visibleReplies: "automatic"`：最终的助手文本会作为可见回复发布到房间中。

当共享房间应允许代理通过调用 `message(action=send)` 来决定何时发言时，请使用 `messages.groupChat.visibleReplies: "message_tool"`。这对工具调用可靠的模型最有效（例如 GPT-5.6 Sol）。如果模型漏掉了工具并返回了实质性的最终文本，OpenClaw 会将该文本保密，而不是发布到房间中。

对于不可靠遵循仅工具交付的模型或运行时，请使用 `"automatic"`：普通文本最终结果会直接发布到房间中，而代理仍然可以调用 `message(action=send)` 发送无法随最终文本一起传递的文件、图片或其他附件。

如果在当前工具策略下消息工具不可用，OpenClaw 会回退到自动可见回复，而不是静默抑制响应。`openclaw doctor` 会对此类不匹配发出警告。

对于直接聊天以及任何其他来源事件，`messages.visibleReplies: "message_tool"` 会全局应用相同的仅工具行为；`messages.groupChat.visibleReplies` 仍然是群组/频道房间的更具体覆盖项。内部 WebChat 的直接轮次默认使用自动最终回复交付，因此 Pi 和 Codex 接收到相同的可见回复契约。

仅工具模式取代了旧的做法，即在大多数 lurk 模式轮次中强制模型回答 `NO_REPLY`。在仅工具模式下，提示词不再定义 `NO_REPLY` 契约；什么都不做、没有任何可见输出，就只是表示没有调用消息工具。

插件拥有的会话绑定是例外。一旦插件绑定了一个线程并接管了传入轮次，插件返回的回复就是可见的绑定响应；它不需要 `message(action=send)`。该回复是插件运行时输出，而不是私有的模型最终文本。

直接群组请求仍会发送输入指示。启用后，环境式始终在线房间事件仍保持严格安静，除非代理调用 message 工具。

会话默认会抑制冗长的工具/进度摘要。使用 `/verbose on`（或 `/verbose full`）可以在调试时为当前会话显示这些内容，使用 `/verbose off` 则恢复为仅最终回复的行为。verbose 状态按会话保存，并在直接聊天、群组、频道和论坛主题中以相同方式工作。

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

## 上下文可见性和允许名单

群组安全涉及两个不同的控制项：

- **触发授权**：谁可以触发代理（`groupPolicy`、`groups`、`groupAllowFrom`、渠道特定允许名单）。
- **上下文可见性**：哪些补充上下文会注入到模型中（回复/引用文本、线程历史、转发元数据）。

默认情况下，OpenClaw 会按接收到的原样保留上下文：允许名单决定谁可以触发动作，而不是模型能看到哪些被引用或历史片段。若还想过滤补充上下文，请设置 `contextVisibility`：

| 模式                | 行为                                                                         |
| ------------------- | -------------------------------------------------------------------------------- |
| `"all"`（默认）      | 按接收到的原样保留补充上下文。                                           |
| `"allowlist"`       | 仅注入来自允许名单发送者的历史/线程/引用/转发上下文。     |
| `"allowlist_quote"` | `allowlist`，并保留来自任意发送者的被明确引用/回复的消息。 |

可按渠道设置（`channels.<channel>.contextVisibility`）、按账号设置（`channels.<channel>.accounts.<accountId>.contextVisibility`），或全局设置（`channels.defaults.contextVisibility`）。会获取补充上下文的渠道（Discord、Feishu、iMessage、Matrix、Microsoft Teams、Signal、Slack、Telegram、WhatsApp）在构建入站上下文时会应用该策略；未知的策略组合将以失败关闭（fail closed）方式处理，并省略该上下文。

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
- 直接聊天使用主会话（如果配置了 `session.dmScope`，则使用按发送者划分的会话）。
- 心跳运行在配置的心跳会话中（默认：agent 主会话）；群组会话不会运行自己的心跳。

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## 模式：个人 DM + 公开群组（单代理）

可以——如果你的“个人”流量是 **DM**，而“公开”流量是 **群组**，这样做很合适。

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
- `#room` 预留给房间/频道；群聊使用 `g-<slug>`（小写，空格 -> `-`，保留 `#@+._-`）。非常长的不可读 ID 会被缩短为一个稳定的 token，而不是将完整的路由 ID 泄露到 UI 中。

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
      groupAllowFrom: ["123456789"], // 数字形式的 Telegram 用户 ID（setup 会解析 @username）
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

| 策略          | 行为                                                         |
| ------------- | ------------------------------------------------------------ |
| `"open"`      | 群组绕过允许名单；但提及门控仍然生效。                       |
| `"disabled"`  | 完全阻止所有群组消息。                                       |
| `"allowlist"` | 仅允许匹配配置中允许名单的群组/房间。                        |

<AccordionGroup>
  <Accordion title="按渠道说明">
    - `groupPolicy` 与提及门控是分开的（提及门控需要 @mentions）。
    - WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo：使用 `groupAllowFrom`（回退：显式 `allowFrom`）。
    - Signal：`groupAllowFrom` 可以匹配入站 Signal 群组 id 或发送者电话/UUID。
    - DM 配对批准（`*-allowFrom` 存储条目）仅适用于 DM 访问；群组发送者授权仍然显式地依赖群组允许名单。
    - Discord：允许名单使用 `channels.discord.guilds.<id>.channels`。
    - Slack：允许名单使用 `channels.slack.channels`。
    - Matrix：允许名单使用 `channels.matrix.groups`。使用房间 ID（`!room:server`）或别名（`#alias:server`）；房间名称键仅在 `channels.matrix.dangerouslyAllowNameMatching: true` 时匹配，未解析条目在运行时会被忽略。使用 `channels.matrix.groupAllowFrom` 来限制发送者；也支持按房间的 `users` 允许名单。
    - 群组 DM 另行控制（`channels.discord.dm.*`、`channels.slack.dm.*`：`groupEnabled`、`groupChannels`）。
    - Telegram：发送者允许名单仅接受数字用户 ID（`"123456789"`；`telegram:`/`tg:` 前缀会被不区分大小写地去除）。`@username` 条目在运行时不会匹配，并会记录警告；setup 会将 `@username` 解析为 ID。负数 chat ID 应放在 `channels.telegram.groups` 下，而不是发送者允许名单。
    - 默认值为 `groupPolicy: "allowlist"`；如果你的群组允许名单为空，群组消息将被阻止。
    - 运行时安全：当某个 provider 配置块完全缺失（`channels.<provider>` 不存在）时，群组策略会安全失败为 `allowlist`，而不是继承 `channels.defaults.groupPolicy`，并且网关会针对每个账户记录一次该回退。

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

## Mention 门控（默认）

群组消息默认需要提及，除非按群组单独覆盖。默认值按子系统存放在 `*.groups."*"` 下。

回复机器人消息在频道暴露回复元数据时会被视为隐式提及；在频道暴露引用元数据时，引用机器人消息也可能被视为提及。目前内置的情况包括：Discord、Microsoft Teams、QQBot、Slack、Telegram、WhatsApp 和 Zalo personal。

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

## 已配置的提及模式范围

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

| 字段              | 作用                                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| `mode: "allow"`  | 除非会话 ID 在 `denyIn` 中，否则启用正则提及模式。这是默认值。                                                     |
| `mode: "deny"`   | 除非会话 ID 在 `allowIn` 中，否则禁用正则提及模式。                                                              |
| `allowIn`        | 在拒绝模式下启用正则提及模式的会话 ID。                                                                           |
| `denyIn`         | 禁用正则提及模式的会话 ID。如果两者包含同一个 ID，`denyIn` 优先于 `allowIn`。                                     |

当前支持的作用域正则策略：

| 渠道     | `allowIn` / `denyIn` 使用的 ID                                     |
| -------- | ------------------------------------------------------------------ |
| Discord  | Discord 渠道 ID。                                                   |
| Matrix   | Matrix 房间 ID。                                                     |
| Slack    | Slack 渠道 ID。                                                     |
| Telegram | 群聊 ID，或论坛主题使用 `chatId:topic:threadId`。                   |
| WhatsApp | 例如 `123@g.us` 这样的 WhatsApp 会话 ID。                           |

当该渠道支持多个账号时，账号级渠道配置可以在 `channels.<channel>.accounts.<accountId>.mentionPatterns` 下设置相同策略。账号策略优先于该账号对应的顶层渠道策略。

<AccordionGroup>
  <Accordion title="提及门控说明">
    - `mentionPatterns` 是大小写不敏感的安全正则模式；无效模式和不安全的嵌套重复形式会被忽略（并给出警告）。
    - 模式优先级：`agents.list[].groupChat.mentionPatterns`（当多个代理共享同一群组时很有用）会覆盖 `messages.groupChat.mentionPatterns`；当两者都未设置时，模式会根据代理身份名称/表情符号派生。
    - 只有在能够进行提及检测时才会强制执行提及门控（原生提及或已配置 `mentionPatterns`）。
    - 将某个群组或发送者加入允许名单，并不会禁用提及门控；如果希望所有消息都能触发，请将该群组的 `requireMention` 设为 `false`。
    - 自动群聊提示上下文会在每一轮携带已解析的静默回复指令；工作区文件不应重复 `NO_REPLY` 机制。
    - 允许自动静默回复的群组会将干净的空输出或仅推理输出的模型轮次视为静默，等同于 `NO_REPLY`。直接聊天永远不会收到 `NO_REPLY` 指引，而仅使用消息工具的群组回复则通过不调用 `message(action=send)` 来保持安静。
    - 常驻开启的群聊默认使用用户请求语义。将 `messages.groupChat.unmentionedInbound: "room_event"` 设为将其作为安静上下文提交。有关设置示例请参见 [环境房间事件](/channels/ambient-room-events)。
    - 房间事件不会被存储为伪造的用户请求，而没有消息工具的房间事件中的私有助手文本也不会作为聊天历史回放。
    - Discord 的默认值位于 `channels.discord.guilds."*"`（可按 guild/channel 覆盖）。
    - 群组历史上下文在各渠道间采用统一包装。受提及门控的群组会保留待处理的跳过消息；常驻开启的群组在渠道支持时也可能保留最近已处理的房间消息。全局默认使用 `messages.groupChat.historyLimit`，覆盖项使用 `channels.<channel>.historyLimit`（或 `channels.<channel>.accounts.*.historyLimit`）。设为 `0` 可禁用。

  </Accordion>
</AccordionGroup>

## 群组/渠道工具限制（可选）

某些渠道配置支持限制在**特定群组/房间/渠道内部**可用的工具。

- `tools`: 为整个群组允许/拒绝工具（`allow`、`alsoAllow`、`deny`；`deny` 优先）。
- `toolsBySender`: 群组内按发送者覆盖。使用显式键前缀：`channel:<channelId>:<senderId>`、`id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>`，以及 `"*"` 通配符。Channel id 使用 OpenClaw 规范 channel id；`teams` 等别名会规范化为 `msteams`。旧的未加前缀键仍然接受，但只按 `id:` 匹配，并会记录弃用警告。

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

## Group allowlist

When `channels.whatsapp.groups`, `channels.telegram.groups`, or `channels.imessage.groups` is configured, these keys are used as a group allowlist. Use `"*"` to allow all groups while still setting the default mention behavior.

<Warning>
Common confusion: DM pairing authorization is not the same as group authorization. For channels that support DM pairing, pairing storage only unlocks DMs. Group commands still require explicit group sender authorization from the configured allowlist, such as `groupAllowFrom`, or the configuration fallback described in that channel's documentation.
</Warning>

Common intents (copy/paste):

<Tabs>
  <Tab title="Disable all group replies">
    ```json5
    {
      channels: { whatsapp: { groupPolicy: "disabled" } },
    }
    ```
  </Tab>
  <Tab title="Only allow specific groups (WhatsApp)">
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
  <Tab title="Allow all groups but require mention">
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
  <Tab title="Owner-only trigger (WhatsApp)">
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

群组所有者可以通过一条独立消息切换每个群组的激活方式：

- `/activation mention`
- `/activation always`

`/activation` 是一个核心的仅所有者可用命令，且仅适用于群聊。所有者指的是发送者与 `commands.ownerAllowFrom` 匹配；频道 `allowFrom` 列表只用于控制普通频道和命令访问。存储的模式会覆盖该群组在会参考它的频道（Google Chat、QQBot、Telegram、WhatsApp）上的 `requireMention`，并且群组系统提示的介绍会在所有地方反映当前启用的模式。

## 上下文字段

群组入站负载会设置：

- `ChatType=group`
- `GroupSubject`（如果已知）
- `GroupMembers`（如果已知）
- `WasMentioned`（提及门控结果）
- Telegram 论坛主题还会包含 `MessageThreadId` 和 `IsForum`。

代理系统提示会在新群组会话的第一轮（以及 `/activation` 变更之后）包含一个群组简介。它会提醒模型像人类一样回复，尽量减少空行并遵循正常的聊天间距，同时避免输入字面形式的 `\n` 序列。非 Telegram 群组也会避免使用 Markdown 表格；Telegram 的富文本指导来自 Telegram 频道提示。来自频道的群组名称和参与者标签会以带围栏的不可信元数据形式呈现，而不是以内联系统指令的形式呈现。

## iMessage 细节

- 路由或加入允许列表时，优先使用 `chat_id:<id>`。
- 列出聊天：`imsg chats --limit 20`。
- 群组回复始终返回到同一个 `chat_id`。

## WhatsApp 系统提示词

请参阅 [WhatsApp](/channels/whatsapp#system-prompts) 以了解权威的 WhatsApp 系统提示词规则，包括群组和直接消息的提示词解析、通配符行为以及账户覆盖语义。

## WhatsApp 细节

请参阅 [群组消息](/channels/group-messages) 了解仅适用于 WhatsApp 的行为（历史注入、提及处理细节）。

## 相关内容

- [广播群组](/channels/broadcast-groups)
- [渠道路由](/channels/channel-routing)
- [群组消息](/channels/group-messages)
- [配对](/channels/pairing)
