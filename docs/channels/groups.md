---
summary: "跨平台的群聊行为（WhatsApp/Telegram/Discord/Slack/Signal/iMessage/Microsoft Teams/Zalo）"
read_when:
  - 变更群聊行为或提及门控时
title: "群组"
---

# 群组

OpenClaw “运行” 在你自己的消息账户上。没有独立的 WhatsApp 机器人用户。  
如果**你**在某个群组里，OpenClaw 就能看到该群组并在那里回复。

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

![群消息流程](/images/groups-flow.svg)

如果你想要……

| 目标                                         | 设置内容                                                  |
| -------------------------------------------- | ---------------------------------------------------------- |
| 允许所有群组但只在被@时回复                   | `groups: { "*": { requireMention: true } }`                |
| 禁用所有群组回复                              | `groupPolicy: "disabled"`                                  |
| 只允许特定群组                              | `groups: { "<group-id>": { ... } }`（不含 `"*"` 键）       |
| 只有你能在群组中触发                         | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |

## 会话密钥

- 群组会话使用 `agent:<agentId>:<channel>:group:<id>` 形式的会话密钥（房间/频道使用 `agent:<agentId>:<channel>:channel:<id>`）。  
- Telegram 论坛话题在群ID后添加 `:topic:<threadId>`，使每个话题都有独立会话。  
- 直接聊天使用主会话（或配置时每发送者独立）。  
- 群组会话跳过心跳检测。

## 模式示例：个人私聊 + 公开群组（单一代理）

是的 —— 如果你的“个人”通信是**私聊**，你的“公开”通信是**群组**，这非常有效。

原因：在单代理模式下，私聊通常落在**主**会话密钥（`agent:main:main`），而群组总是使用**非主**会话密钥（`agent:main:<channel>:group:<id>`）。如果开启 `mode: "non-main"` 的沙箱模式，这些群组会话在 Docker 中运行，而你主私聊会话保持本地运行。

这给你一个代理“脑子”（共享工作区 + 记忆），但提供两种运行环境：

- **私聊**：完整工具（本地）  
- **群组**：沙箱 + 受限工具（Docker）

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

想让“群组只能访问文件夹X”，而不是“无主机访问”？保持 `workspaceAccess: "none"`，仅将白名单路径挂载进沙箱：

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

相关资源：

- 配置键与默认值：[网关配置](/gateway/configuration-reference#agentsdefaultssandbox)
- 调试工具被阻止的原因：[沙箱 vs 工具策略 vs 提升权限](/gateway/sandbox-vs-tool-policy-vs-elevated)
- 绑定挂载详情：[沙箱](/gateway/sandboxing#custom-bind-mounts)

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
      groupAllowFrom: ["123456789"], // 数字 Telegram 用户ID（向导可以解析 @用户名）
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
        "!roomId:example.org": { allow: true },
        "#alias:example.org": { allow: true },
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

- `groupPolicy` 与提及门控（需@）是分开的。  
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo 使用 `groupAllowFrom`（回退为显式的 `allowFrom`）。  
- 私聊的配对批准（`*-allowFrom` 存储）仅适用于私聊访问；群发送者授权独立为群组白名单。  
- Discord 白名单使用 `channels.discord.guilds.<id>.channels`。  
- Slack 白名单使用 `channels.slack.channels`。  
- Matrix 白名单使用 `channels.matrix.groups`（房间ID、别名或名称）。可通过 `channels.matrix.groupAllowFrom` 限制发件人；同样支持每个房间的 `users` 白名单。  
- 群组私聊分开控制（`channels.discord.dm.*`，`channels.slack.dm.*`）。  
- Telegram 白名单可匹配用户ID（`"123456789"`, `"telegram:123456789"`, `"tg:123456789"`）或用户名（`"@alice"` 或 `"alice"`）；前缀大小写不敏感。  
- 默认策略是 `groupPolicy: "allowlist"`；如果群组白名单为空，则阻止群消息。  
- 运行时安全：当提供者模块缺失（无对应 `channels.<provider>`）时，群组策略退回到安全的关闭模式（通常是 `allowlist`），而不继承 `channels.defaults.groupPolicy`。

快速思路（群消息评估顺序）：

1. `groupPolicy`（开放/禁用/白名单）  
2. 群组白名单（`*.groups`，`*.groupAllowFrom`，频道特定白名单）  
3. 提及门控（`requireMention`，`/activation`）

## 提及门控（默认）

除非针对每个群组单独配置，否则群消息需要提及。默认配置存放于子系统下的 `*.groups."*"`。

回复机器人消息算作隐式提及（如果频道支持回复元数据）。适用于 Telegram、WhatsApp、Slack、Discord 和 Microsoft Teams。

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

- Group/channel tool restrictions are applied in addition to global/agent tool policy (deny still wins).
- Some channels use different nesting for rooms/channels (e.g., Discord `guilds.*.channels.*`, Slack `channels.*`, Microsoft Teams `teams.*.channels.*`).

## 群组白名单

当配置 `channels.whatsapp.groups`、`channels.telegram.groups` 或 `channels.imessage.groups` 时，键名即为群组白名单。使用 `"*"` 表示允许所有群组，同时设定默认提及行为。

常见目的（复制粘贴）：

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

代理系统提示在新群组会话的首轮包含群组介绍，提醒模型像人类一样回复，避免使用 Markdown 表格，避免直接输入 `\n` 字符。

## iMessage 特殊事项

- 路由或白名单优先使用 `chat_id:<id>`。  
- 查看聊天列表：`imsg chats --limit 20`。  
- 群组回复总是回到相同的 `chat_id`。

## WhatsApp 特殊事项

详见[群聊消息](/channels/group-messages)说明 WhatsApp 特有的行为（历史注入，提及处理细节）。
