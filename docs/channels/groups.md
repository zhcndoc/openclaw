---
summary: "跨平台群组聊天行为（Discord/iMessage/Matrix/Microsoft Teams/Signal/Slack/Telegram/WhatsApp/Zalo）"
read_when:
  - 变更群聊行为或提及门控时
title: "群组"
---

OpenClaw 在各个平台上以一致的方式处理群组聊天：Discord、iMessage、Matrix、Microsoft Teams、Signal、Slack、Telegram、WhatsApp、Zalo。

默认行为：

- 群组受到限制（`groupPolicy: "allowlist"`）。  
- 回复需要提及，除非你显式关闭提及门控。

翻译：只有被白名单允许的发送者通过提及才能触发 OpenClaw。

> 简单总结
>
> - **私聊访问**由 `*.allowFrom` 控制。  
> - **群聊访问**由 `groupPolicy` + 白名单 (`*.groups`, `*.groupAllowFrom`) 控制。  
> - **回复触发**由提及门控控制（`requireMention`，`/activation`）。

快速流程（群消息的处理流程）：

```
groupPolicy? disabled -> 丢弃
groupPolicy? allowlist -> 群组允许？否 -> 丢弃
requireMention? 是 -> 是否被提及？否 -> 仅存为上下文
否则 -> 回复
```

## 上下文可见性与白名单

群组安全涉及两种不同的控制：

- **触发授权**：谁可以触发代理（`groupPolicy`、`groups`、`groupAllowFrom`、渠道特定的白名单）。
- **上下文可见性**：哪些补充上下文被注入到模型中（回复文本、引用、线程历史、转发元数据）。

默认情况下，OpenClaw 优先考虑正常聊天行为，并保持上下文大部分原样接收。这意味着白名单主要决定谁可以触发操作，而不是对每个引用或历史片段进行通用的编辑边界。

当前行为是渠道特定的：

- 某些渠道已经在特定路径中对补充上下文应用了基于发送者的过滤（例如 Slack 线程种子、Matrix 回复/线程查找）。
- 其他渠道仍然按原样传递引用/回复/转发上下文。

强化方向（计划中）：

- `contextVisibility: "all"`（默认）保持当前原样接收的行为。
- `contextVisibility: "allowlist"` 将补充上下文过滤为白名单发送者。
- `contextVisibility: "allowlist_quote"` 是 `allowlist` 加上一个明确的引用/回复例外。

在此强化模型在所有渠道中一致实现之前，预计不同端会有差异。

![群组消息流程](/images/groups-flow.svg)

如果你想要……

| 目标                                         | 设置内容                                                  |
| -------------------------------------------- | ---------------------------------------------------------- |
| 允许所有群组但只在被@时回复                   | `groups: { "*": { requireMention: true } }`                |
| 禁用所有群组回复                              | `groupPolicy: "disabled"`                                  |
| 只允许特定群组                              | `groups: { "<group-id>": { ... } }`（不含 `"*"` 键）       |
| 只有你能在群组中触发                         | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |

## 会话密钥

- 群组会话使用 `agent:<agentId>:<channel>:group:<id>` 形式的会话密钥（房间/频道使用 `agent:<agentId>:<channel>:channel:<id>`）。  
- Telegram 论坛话题在群 ID 后添加 `:topic:<threadId>`，使每个话题都有独立会话。  
- 直接聊天使用主会话（或配置时每发送者独立）。  
- 群组会话跳过心跳检测。

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## 模式：个人私聊 + 公开群组（单代理）

是的 —— 如果你的“个人”通信是**私聊**，你的“公开”通信是**群组**，这非常有效。

为什么：在单代理模式下，私聊通常落入**主**会话密钥（`agent:main:main`），而群组始终使用**非主**会话密钥（`agent:main:<channel>:group:<id>`）。如果你启用 `mode: "non-main"` 的沙箱，这些群组会话会在配置的沙箱后端中运行，而你的主私聊会话仍然运行在主机上。如果你不选择其他后端，Docker 是默认后端。

这给你一个代理“脑子”（共享工作区 + 记忆），但提供两种运行环境：

- **私聊**：完整工具（主机）
- **群组**：沙箱 + 受限工具

> 如果你需要真正分开的工作区/身份（“个人”和“公开”绝不混合），使用第二代理 + 绑定。详见[多代理路由](/concepts/multi-agent)。

示例（主机运行私聊，群组沙箱且仅限消息相关工具）:

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // 群组/频道被视为非主会话 -> 沙箱运行
        scope: "session", // 最强隔离（每个群组/频道一个容器）
        workspaceAccess: "none",
      },
    },
  },
  tools: {
    sandbox: {
      tools: {
        // 当 allow 非空时，其他工具全部阻止（deny 仍优先）。
        allow: ["group:messaging", "group:sessions"],
        deny: ["group:runtime", "group:fs", "group:ui", "nodes", "cron", "gateway"],
      },
    },
  },
}
```

想让“群组只能访问文件夹 X"，而不是“无主机访问”？保持 `workspaceAccess: "none"`，仅将白名单路径挂载进沙箱：

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
            // 主机路径：容器路径：模式
            "/home/user/FriendsShared:/data:ro",
          ],
        },
      },
    },
  },
}
```

相关资源：

- 配置键和默认值：[Gateway configuration](/gateway/config-agents#agentsdefaultssandbox)
- 调试工具为何被阻止：[Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated)
- 挂载绑定详情：[Sandboxing](/gateway/sandboxing#custom-bind-mounts)

## 显示标签

- UI 标签优先使用 `displayName`，格式为 `<channel>:<token>`。  
- `#room` 保留用于房间/频道；群聊使用 `g-<slug>` 格式（小写，空格转 `-`，保留 `#@+._-` 字符）。

## 群组策略

控制每个渠道群组/房间消息的处理：

```json5
{
  channels: {
    whatsapp: {
      groupPolicy: "disabled", // "open" | "disabled" | "allowlist"
      groupAllowFrom: ["+15551234567"],
    },
    telegram: {
      groupPolicy: "disabled",
      groupAllowFrom: ["123456789"], // 数字 Telegram 用户 ID（向导可以解析 @用户名）
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

| 策略          | 行为说明                                                     |
| ------------- | ------------------------------------------------------------ |
| `"open"`      | 群组无视白名单；仍执行提及门控。                             |
| `"disabled"`  | 完全阻止所有群消息。                                         |
| `"allowlist"` | 仅允许配置的白名单群组/房间。                               |

备注：

- `groupPolicy` 与提及门控（需要 @提及）是分开的。
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo：使用 `groupAllowFrom`（回退：显式 `allowFrom`）。
- DM 配对批准（`*-allowFrom` 存储条目）仅适用于 DM 访问；群组发送者授权仍明确属于群组白名单。
- Discord：白名单使用 `channels.discord.guilds.<id>.channels`。
- Slack：白名单使用 `channels.slack.channels`。
- Matrix：白名单使用 `channels.matrix.groups`。优先使用房间 ID 或别名；已加入房间的名称查找是尽力而为的，未解析的名称在运行时会被忽略。使用 `channels.matrix.groupAllowFrom` 限制发送者；也支持每房间 `users` 白名单。
- 群组私聊单独控制（`channels.discord.dm.*`、`channels.slack.dm.*`）。
- Telegram 白名单可以匹配用户 ID（`"123456789"`、`"telegram:123456789"`、`"tg:123456789"`）或用户名（`"@alice"` 或 `"alice"`）；前缀不区分大小写。
- 默认是 `groupPolicy: "allowlist"`；如果你的群组白名单为空，群组消息将被阻止。
- 运行时安全：当提供者块完全缺失（`channels.<provider>` 缺失）时，群组策略回退到故障关闭模式（通常是 `allowlist`），而不是继承 `channels.defaults.groupPolicy`。

快速思路（群消息评估顺序）：

1. `groupPolicy`（开放/禁用/白名单）  
2. 群组白名单（`*.groups`，`*.groupAllowFrom`，频道特定白名单）  
3. 提及门控（`requireMention`，`/activation`）

## 提及门控（默认）

除非针对每个群组单独配置，否则群消息需要提及。默认配置存放于子系统下的 `*.groups."*"`。

回复机器人消息在频道支持回复元数据时会被视为隐式提及。引用机器人消息在暴露引用元数据的频道中也可能被视为隐式提及。当前内置案例包括 Telegram、WhatsApp、Slack、Discord、Microsoft Teams 和 ZaloUser。

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

备注：

- `mentionPatterns` 是不区分大小写的安全正则模式；无效模式和不安全的嵌套重复形式会被忽略。  
- 提供明确提及的通道直接通过；模式仅做回退。  
- 每代理覆写：`agents.list[].groupChat.mentionPatterns`（适用于多个代理共享群聊场景）。  
- 只能在支持提及检测时启用提及门控（原生提及或配置了 `mentionPatterns`）。  
- Discord 默认配置存放在 `channels.discord.guilds."*"`（可针对每个公会/频道覆盖）。  
- 群聊上下文历史跨频道统一处理且仅包含待处理消息（被提及门控过滤掉的消息）；全局默认可由 `messages.groupChat.historyLimit` 设置，单频道可由 `channels.<channel>.historyLimit`（或账户层级 `channels.<channel>.accounts.*.historyLimit`）覆盖。设为 `0` 则关闭。

## 群组/频道工具限制（可选）

部分渠道配置支持限制在**特定群组/房间/频道内**可用的工具。

- `tools`：整个群组允许/禁止的工具。  
- `toolsBySender`：群组内部按发送者的覆盖设置。  
  使用明确的键前缀：  
  `id:<senderId>`、`e164:<电话>`、`username:<账号>`、`name:<显示名>` 和 `"*"`通配符。  
  兼容旧版无前缀的键，按 `id:` 匹配。

解析顺序（越具体优先）：

1. 群组/频道内 `toolsBySender` 匹配  
2. 群组/频道 `tools`  
3. 默认（`"*"`）的 `toolsBySender` 匹配  
4. 默认（`"*"`）的 `tools`

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

备注：

- 群组/频道工具限制应用于全局/代理工具策略之外（deny 仍然优先）。
- 某些频道对房间/频道使用不同的嵌套（例如 Discord `guilds.*.channels.*`、Slack `channels.*`、Microsoft Teams `teams.*.channels.*`）。

## 群组白名单

当配置 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 时，键名即为群组白名单。使用 `"*"` 表示允许所有群组，同时设定默认提及行为。

常见混淆：DM 配对批准与群组授权不同。
对于支持 DM 配对的渠道，配对存储仅解锁私聊。群组命令仍然需要来自配置白名单（如 `groupAllowFrom` 或该渠道文档化的配置回退）的明确群组发送者授权。

常见意图（复制/粘贴）：

1. 禁止所有群回复

```json5
{
  channels: { whatsapp: { groupPolicy: "disabled" } },
}
```

2. 只允许特定群组（WhatsApp）

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

3. 允许所有群组，但强制提及（显式）

```json5
{
  channels: {
    whatsapp: {
      groups: { "*": { requireMention: true } },
    },
  },
}
```

4. 只有所有者能在群组触发（WhatsApp）

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

## 激活指令（只限所有者）

群聊所有者可切换单个群的激活状态：

- `/activation mention`  
- `/activation always`

所有者由 `channels.whatsapp.allowFrom` 确定（或未设置时为机器人自身的 E.164 号码）。命令需单独作为消息发送。其他平台当前忽略 `/activation`。

## 上下文字段

群聊入站消息携带：

- `ChatType=group`  
- `GroupSubject`（若已知）  
- `GroupMembers`（若已知）  
- `WasMentioned`（提及门控结果）  
- Telegram 论坛话题额外包含 `MessageThreadId` 和 `IsForum`。

特定频道备注：

- BlueBubbles 可以选择在填充 `GroupMembers` 之前从本地联系人数据库丰富未命名的 macOS 群组参与者。默认情况下这是关闭的，并且仅在正常群组门控通过后运行。

代理系统提示在新群组会话的第一轮会包含一个群组简介。它会提醒模型像人类一样回复，避免使用 Markdown 表格，尽量减少空行并遵循正常聊天间距，避免输入字面量的 `\n` 序列。来自频道的群组名称和参与者标签会以带边框的不受信任元数据形式呈现，而不是内联系统指令。

## iMessage 特殊事项

- 路由或白名单优先使用 `chat_id:<id>`。  
- 查看聊天列表：`imsg chats --limit 20`。  
- 群组回复总是回到相同的 `chat_id`。

## WhatsApp 系统提示词

请参见 [WhatsApp](/channels/whatsapp#system-prompts)，了解 WhatsApp 系统提示词规则的权威说明，包括群组和直接提示词解析、通配符行为以及账号覆盖语义。

## WhatsApp 细节

请参见 [群组消息](/channels/group-messages)，了解仅适用于 WhatsApp 的行为（历史注入、提及处理细节）。

## 相关内容

- [群组消息](/channels/group-messages)
- [广播群组](/channels/broadcast-groups)
- [频道路由](/channels/channel-routing)
- [配对](/channels/pairing)
