---
summary: "飞书机器人概览、功能与配置"
read_when:
  - 你想连接飞书/Lark 机器人
  - 你正在配置飞书频道
title: 飞书
---

OpenClaw 通过官方 `@openclaw/feishu` 插件连接飞书/Lark（一个一体化协作平台）：机器人私信、群聊、流式卡片回复，以及飞书文档/知识库/云盘/Bitable 工具。

**状态：** 已可用于生产环境，支持机器人私信和群聊。WebSocket 是默认事件传输方式（无需公网 URL）；webhook 模式为可选。

## 快速开始

<Note>
需要 OpenClaw 2026.5.29 或更高版本。运行 `openclaw --version` 检查。使用 `openclaw update` 升级。
</Note>

<Steps>
  <Step title="运行频道设置向导">
  ```bash
  openclaw channels login --channel feishu
  ```
  如果缺少 `@openclaw/feishu` 插件，则会安装它，然后进入设置流程：

- **手动设置**：从飞书开放平台（`https://open.feishu.cn`）或 Lark Developer（`https://open.larksuite.com`）粘贴 App ID 和 App Secret。
- **二维码设置**：在飞书应用中扫描二维码以自动创建机器人。此流程会将私聊锁定为你自己的账号（`dmPolicy: "allowlist"`，使用你的 `open_id`）。

向导还会询问 API 域名（飞书 vs Lark）和群组策略。如果国内飞书移动端对二维码没有反应，请重新运行设置并选择手动设置。
</Step>

  <Step title="设置完成后，重启网关以应用更改">
  ```bash
  openclaw gateway restart
  ```
  </Step>
</Steps>

## 入站持久性

OpenClaw 会在代理分发之前，将已认证的 `im.message.receive_v1` 和 `drive.notice.comment_add_v1` 信封持久化排队。待处理或可重试的事件在 Gateway 重启后仍会保留，按每个聊天或文档分别串行化，并使用飞书的事件 ID 来抑制重复的队列条目，前提是活动或保留的完成记录仍然存在。

如果某个 WebSocket 事件在有限次数的重试后仍无法持久化，OpenClaw 会关闭该 socket，并强制建立新的已认证连接，而不是在未提交的轮次之后继续处理。其他飞书事件类型，包括 reaction 和 VC 会议邀请，会使用其正常的事件路径，不会获得这种持久队列保证。

## 访问控制

### 私信

配置 `channels.feishu.dmPolicy`（默认：`pairing`）以控制谁可以给机器人发送私信：

| 值            | 行为                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| `"pairing"`   | 未知用户会收到配对码；通过 CLI 批准                                                                      |
| `"allowlist"` | 只有 `allowFrom` 中列出的用户才能聊天                                                                    |
| `"open"`      | 公开私信；配置校验要求 `allowFrom` 包含 `"*"`。非通配符条目仍会缩小可访问范围                             |

**批准配对请求：**

```bash
openclaw pairing list feishu
openclaw pairing approve feishu <CODE>
```

### 群聊

**群组策略** (`channels.feishu.groupPolicy`，默认：`allowlist`)：

| 值            | 行为                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------- |
| `"open"`      | 响应群组中的所有消息                                                                      |
| `"allowlist"` | 仅响应 `groupAllowFrom` 中的群组，或在 `groups.<chat_id>` 下显式配置的群组               |
| `"disabled"`  | 禁用所有群消息；显式的 `groups.<chat_id>` 条目不会覆盖此设置                             |

**提及要求** (`channels.feishu.requireMention`)：

- 默认情况下需要 @ 提及，除非有效的群组策略为 `"open"`；在这种情况下默认值为 `false`，因此无法携带提及的消息（例如图片）仍然可以到达代理。
- 显式设置为 `true` 或 `false` 以覆盖默认值；按群组覆盖：`channels.feishu.groups.<chat_id>.requireMention`。
- 仅广播的 `@all` 和 `@_all` 不被视为机器人提及。消息中同时包含 `@all` 和直接提及机器人时，仍然算作机器人提及。

## 群组配置示例

### 允许所有群组，不需要 @ 提及

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open", // 在 "open" 下，requireMention 默认值为 false
    },
  },
}
```

### 允许所有群组，但仍需要 @ 提及

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
      requireMention: true,
    },
  },
}
```

### 仅允许特定群组

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      // 群组 ID 类似：oc_xxx
      groupAllowFrom: ["oc_xxx", "oc_yyy"],
    },
  },
}
```

在 `allowlist` 模式下，你也可以通过添加显式的 `groups.<chat_id>` 条目来允许某个群组。显式条目不会覆盖 `groupPolicy: "disabled"`。`groups.*` 下的通配符默认配置会应用于匹配的群组，但它们本身不会允许群组加入。

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      groups: {
        oc_xxx: {
          requireMention: false,
        },
      },
    },
  },
}
```

### 限制群组内的发送者

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["oc_xxx"],
      groups: {
        oc_xxx: {
          // 用户 open_id 类似：ou_xxx
          allowFrom: ["ou_user1", "ou_user2"],
        },
      },
    },
  },
}
```

`channels.feishu.groupSenderAllowFrom` 为所有群组设置相同的发送者允许列表；按群组设置的 `allowFrom` 具有更高优先级。

### 机器人发送的消息

飞书默认会忽略由其他机器人发送的消息。若要允许机器人之间的群聊，请为应用授予 `im:message.group_at_msg.include_bot:readonly` 和 `im:message:readonly` 作用域，然后设置 `allowBots`：

```json5
{
  channels: {
    feishu: {
      allowBots: true,
    },
  },
}
```

飞书仅在其他机器人 @ 该机器人时，才会投递由机器人发送的群组事件。现有的群组策略、发送者允许列表以及 @ 提及要求仍然生效。OpenClaw 会丢弃自己发送的消息，在每次文本或卡片回复中 @ 对方机器人，并应用共享的 [`channels.defaults.botLoopProtection`](/channels/bot-loop-protection) 保护。  

<a id="get-groupuser-ids"></a>

## Get Group/User ID

### Group ID (`chat_id`, format: `oc_xxx`)

Open the group in Feishu/Lark, click the menu icon in the upper right corner, then go to **Settings**. The group ID (`chat_id`) is listed on the settings page.

![Get Group ID](/images/feishu-get-group-id.png)

### User ID (`open_id`, format: `ou_xxx`)

Start the gateway, send a direct message to the bot, then check the logs:

```bash
openclaw logs --follow
```

Look for `open_id` in the log output. You can also view pending pairing requests:

```bash
openclaw pairing list feishu
```

## 常用命令

| 命令      | 描述                 |
| --------- | -------------------- |
| `/status` | 显示机器人状态       |
| `/reset`  | 重置当前会话         |
| `/model`  | 显示或切换 AI 模型   |

<Note>
飞书/Lark 不支持原生斜杠命令菜单，因此请将这些内容作为纯文本消息发送。
</Note>

## 故障排查

### 机器人在群聊中没有响应

1. 确保机器人已加入群组
2. 确保你 @提及了机器人（默认要求）
3. 验证 `groupPolicy` 不是 `"disabled"`
4. 检查日志：`openclaw logs --follow`

### 机器人收不到消息

1. 确保机器人已在飞书开放平台 / Lark 开发者平台发布并通过审核
2. 确保事件订阅包含 `im.message.receive_v1`
3. 对于会议邀请自动加入，也要订阅 `vc.bot.meeting_invited_v1`
4. 确保选择的是**持久连接**（WebSocket）
5. 确保已授予所有必需的权限范围
6. 确保网关正在运行：`openclaw gateway status`
7. 检查日志：`openclaw logs --follow`

订阅 `vc.bot.meeting_invited_v1` 只会投递该事件。自动加入默认是关闭的。
如需全局启用：

```json5
{
  channels: {
    feishu: {
      vcAutoJoin: true,
    },
  },
}
```

如需仅为一个账号启用，省略顶层开关，并设置账号覆盖：

```json5
{
  channels: {
    feishu: {
      accounts: {
        meetings: { vcAutoJoin: true },
      },
    },
  },
}
```

在代理收到加入轮次之前，邀请者仍会经过正常的飞书私信策略、白名单/配对、会话和回复路由。
加入还需要为应用身份配置一个可用的飞书 VC 加入工具，并带有
`vc:meeting.bot.join:write` 权限范围。例如，官方
[`lark-cli` VC agent skill](https://github.com/larksuite/cli/tree/main/skills/lark-vc-agent)
提供了 `vc +meeting-join`。

<Warning>
官方 `lark-cli` VC agent skill 当前将会议机器人操作标记为受限 beta 版。如果工具返回 `ErrNotInGray` 或错误码 `20017`，说明该应用或租户尚未启用该 beta；在排查普通权限授予之前，请先使用链接技能中的早期访问指南。
</Warning>

### 二维码设置在飞书移动应用中没有反应

1. 重新运行设置：`openclaw channels login --channel feishu`
2. 选择手动设置
3. 在飞书开放平台中创建自建应用并复制其 App ID 和 App Secret
4. 将这些凭据粘贴到设置向导中

### App Secret 泄露

1. 在飞书开放平台 / Lark 开发者平台重置 App Secret
2. 更新配置中的值
3. 重启网关：`openclaw gateway restart`

## 高级配置

### 多账户

```json5
{
  channels: {
    feishu: {
      defaultAccount: "main",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          name: "主机器人",
          tts: {
            providers: {
              openai: { voice: "shimmer" },
            },
          },
        },
        backup: {
          appId: "cli_yyy",
          appSecret: "yyy",
          name: "备用机器人",
          enabled: false,
        },
      },
    },
  },
}
```

`defaultAccount` 控制在出站 API 未指定 `accountId` 时使用哪个账户。账户条目会继承顶层设置；大多数顶层键都可以按账户覆盖。
`accounts.<id>.tts` 使用与 `tts` 相同的结构，并在全局 TTS 配置之上进行深度合并，因此多机器人飞书配置可以全局共享提供方凭据，同时只按账户覆盖 voice、model、persona 或 auto 模式。

### 消息限制

- `textChunkLimit` - 出站文本分块大小（默认：`4000` 字符）
- `streaming.chunkMode` - `"length"`（默认）在限制处拆分；`"newline"` 优先按换行边界拆分
- `mediaMaxMb` - 媒体上传/下载限制（默认：`30` MB）

### 流式输出

Feishu/Lark 支持通过交互式卡片进行流式回复（Card Kit streaming API）。启用后，机器人在生成文本时会实时更新卡片。

```json5
{
  channels: {
    feishu: {
      streaming: {
        mode: "partial", // 流式卡片输出（默认："partial"）
        block: { enabled: true }, // 启用完成块流式输出
      },
    },
  },
}
```

将 `streaming.mode: "off"` 设为在一条消息中发送完整回复；`renderMode: "raw"`（纯文本而非卡片）也会禁用流式卡片。`streaming.block.enabled` 默认关闭；仅在需要将已完成的 assistant 块在最终回复前刷新时启用它。旧的布尔值 `streaming` 以及扁平的 `blockStreaming` / `blockStreamingCoalesce` / `chunkMode` 键会通过 `openclaw doctor --fix` 迁移为这种嵌套结构。

### 配额优化

通过两个可选标志减少飞书/Lark API 调用次数：

- `typingIndicator`（默认 `true`）：设为 `false` 可跳过输入中反应调用
- `resolveSenderNames`（默认 `true`）：设为 `false` 可跳过发送者资料查询

```json5
{
  channels: {
    feishu: {
      typingIndicator: false,
      resolveSenderNames: false,
    },
  },
}
```

### 群组会话范围和话题线程

`channels.feishu.groupSessionScope`（顶层、按账户或按群组）控制群消息如何映射到代理会话：

| 值                   | 会话                                                             |
| -------------------- | ---------------------------------------------------------------- |
| `"group"`（默认）    | 每个群聊一个会话                                                |
| `"group_sender"`     | 每个（群组 + 发送者）一个会话                                   |
| `"group_topic"`      | 每个话题线程一个会话；回退到群组会话                             |
| `"group_topic_sender"` | 每个（话题 + 发送者）一个会话；回退到（群组 + 发送者）会话 |

对于话题范围，原生飞书/Lark 话题群会使用事件 `thread_id`（`omt_*`）作为规范的话题会话键。如果原生话题起始事件省略了 `thread_id`，OpenClaw 会在路由轮次之前从飞书补全它。OpenClaw 将普通群回复转换为线程时，会继续使用回复根消息 ID（`om_*`），因此首次轮次和后续轮次会保留在同一个会话中。

将 `replyInThread: "enabled"`（顶层或按群组）设为启用，可让机器人回复创建或继续一个飞书话题线程，而不是在原处回复。`topicSessionMode` 是 `groupSessionScope` 的已弃用前身；请优先使用 `groupSessionScope`。

### 飞书工作区工具

该插件为飞书文档、聊天、知识库、云存储、权限和 Bitable 提供智能体工具，并附带对应技能（`feishu-doc`、`feishu-drive`、`feishu-perm`、`feishu-wiki`）。工具家族由 `channels.feishu.tools` 控制：

| 键              | 工具                                          | 默认值              |
| --------------- | --------------------------------------------- | ------------------- |
| `tools.doc`     | `feishu_doc` 文档操作                         | `true`              |
| `tools.chat`    | `feishu_chat` 聊天信息 + 成员查询             | `true`              |
| `tools.wiki`    | `feishu_wiki` 知识库（需要 `doc`）            | `true`              |
| `tools.drive`   | `feishu_drive` 云存储                         | `true`              |
| `tools.perm`    | `feishu_perm` 权限管理                        | `false`（敏感）      |
| `tools.scopes`  | `feishu_app_scopes` 应用权限范围诊断          | `true`              |
| `tools.bitable` | `feishu_bitable_*` Bitable/Base 操作          | `true`              |

Per-account gates live under `accounts.<id>.tools`.

若要在根目录之外直接通过 `feishu_drive info` 查询，请授予 `drive:drive.metadata:readonly`，除非应用已经拥有完整的 `drive:drive` 范围。若没有这两个范围中的任意一个，`info` 仍可通过 `drive:drive:readonly` 使用旧版根目录查询。

### ACP 会话

Feishu/Lark 支持用于私信和群组线程消息的 ACP。Feishu/Lark ACP 采用文本命令驱动——没有原生斜杠菜单，因此请直接在对话中使用 `/acp ...` 消息。

#### 持久化 ACP 绑定

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "feishu",
        accountId: "default",
        peer: { kind: "direct", id: "ou_1234567890" },
      },
    },
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "feishu",
        accountId: "default",
        peer: { kind: "group", id: "oc_group_chat:topic:om_topic_root" },
      },
      acp: { label: "codex-feishu-topic" },
    },
  ],
}
```

#### 从聊天中启动 ACP

在飞书/Lark 私信或线程中：

```text
/acp spawn codex --thread here
```

`--thread here` 适用于私信和飞书/Lark 线程消息。绑定会话中的后续消息会直接路由到该 ACP 会话。

### 多智能体路由

使用 `bindings` 将飞书/Lark 私信或群组路由到不同的智能体。

```json5
{
  agents: {
    list: [
      { id: "main" },
      { id: "agent-a", workspace: "/home/user/agent-a" },
      { id: "agent-b", workspace: "/home/user/agent-b" },
    ],
  },
  bindings: [
    {
      agentId: "agent-a",
      match: {
        channel: "feishu",
        peer: { kind: "direct", id: "ou_xxx" },
      },
    },
    {
      agentId: "agent-b",
      match: {
        channel: "feishu",
        peer: { kind: "group", id: "oc_zzz" },
      },
    },
  ],
}
```

路由字段：

- `match.channel`: `"feishu"`
- `match.peer.kind`: `"direct"`（私信）或 `"group"`（群聊）
- `match.peer.id`: 用户 Open ID（`ou_xxx`）或群组 ID（`oc_xxx`）

查找提示请参见 [获取群组/用户 ID](#get-groupuser-ids)。

## 按用户隔离智能体（动态智能体创建）

启用 `dynamicAgentCreation` 可为每个私信用户自动创建**隔离的智能体实例**。每个用户都会拥有自己的：

- 独立工作区目录
- 单独的 `USER.md` / `SOUL.md` / `MEMORY.md`
- 私有对话历史
- 隔离的技能和状态

对于希望每个用户都拥有自己私有 AI 助手体验的公共机器人来说，这一点至关重要。

<Note>
动态绑定包含规范化后的飞书 `accountId`，因此默认账户和命名账户会将每个发送者路由到正确的动态智能体。

如果某个命名账户在旧版本中创建了一个未限定范围的动态智能体，该旧智能体仍会计入 `maxAgents`。在删除它之前，请确认默认账户不会使用它，或者临时提高 `maxAgents`；OpenClaw 无法安全地推断哪个账户拥有这种歧义的旧状态。
</Note>

### 快速设置

```json5
{
  channels: {
    feishu: {
      dmPolicy: "open",
      allowFrom: ["*"],
      dynamicAgentCreation: {
        enabled: true,
        workspaceTemplate: "~/.openclaw/workspace-{agentId}",
        agentDirTemplate: "~/.openclaw/agents/{agentId}/agent",
      },
    },
  },
  session: {
    // 关键：将每个用户的私信设为其“主会话”
    // 自动加载 USER.md / SOUL.md / MEMORY.md
    // 如需更强隔离，请改用 "per-channel-peer"
    dmScope: "main",
  },
}
```

### 工作原理

当新用户发送第一条私信时：

1. 该频道会生成一个唯一的 `agentId`：默认账户为 `feishu-{user_open_id}`，命名账户则为带有账户前缀的受限身份摘要
2. 在 `workspaceTemplate` 路径下创建新的工作区
3. 注册该智能体并为此用户创建绑定
4. 工作区辅助程序会在首次访问时确保引导文件（`AGENTS.md`、`SOUL.md`、`USER.md` 等）存在
5. 将该用户未来的所有消息路由到其专属智能体

### 配置选项

| 设置                                                     | 描述                                 | 默认值                               |
| -------------------------------------------------------- | ------------------------------------ | ------------------------------------ |
| `channels.feishu.dynamicAgentCreation.enabled`           | 启用自动按用户创建智能体             | `false`                              |
| `channels.feishu.dynamicAgentCreation.workspaceTemplate` | 动态智能体工作区的路径模板           | `~/.openclaw/workspace-{agentId}`    |
| `channels.feishu.dynamicAgentCreation.agentDirTemplate`  | 智能体目录名称模板                   | `~/.openclaw/agents/{agentId}/agent` |
| `channels.feishu.dynamicAgentCreation.maxAgents`         | 可创建的动态智能体最大数量           | 不限                                 |

模板变量：

- `{agentId}` - 生成的智能体 ID（例如：`feishu-ou_xxxxxx` 或 `feishu-support-<identity_digest>`）
- `{userId}` - 发送者的飞书 open_id（例如：`ou_xxxxxx`）

### 会话范围

`session.dmScope` 控制私信如何映射到智能体会话。这是一个**全局设置**，会影响所有频道。

| Value                        | Behavior                                                            | Best for                                                           |
| ---------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `"main"`                     | 每个用户的私信映射到其智能体的主会话                              | 适合单用户机器人，并希望自动加载 `USER.md` / `SOUL.md` / `MEMORY.md` |
| `"per-peer"`                 | 每个对端获得一个独立会话（与频道无关）                            | 仅按发送者身份进行隔离                                             |
| `"per-channel-peer"`         | 每个（频道 + 用户）组合获得一个独立会话                          | 需要更强隔离的公共多用户机器人                                     |
| `"per-account-channel-peer"` | 每个（账户 + 频道 + 用户）组合获得一个独立会话                   | 需要账户级会话隔离的多账户机器人                                   |

**权衡**：使用 `"main"` 可以启用引导文件的自动加载（`USER.md`、`SOUL.md`、`MEMORY.md`），但这意味着所有频道的所有私信都会共享相同的会话键模式。对于更看重隔离而不是引导自动加载的公共多用户机器人，建议使用 `"per-channel-peer"` 并手动管理引导文件。

<Note>
当命名的飞书账户需要为同一发送者保持独立会话时，请使用 `"per-account-channel-peer"`。动态绑定会保留账户范围。
</Note>

### 典型多用户部署

```json5
{
  channels: {
    feishu: {
      appId: "cli_xxx",
      appSecret: "xxx",
      dmPolicy: "open",
      allowFrom: ["*"],
      groupPolicy: "open",
      requireMention: true,
      dynamicAgentCreation: {
        enabled: true,
        workspaceTemplate: "~/.openclaw/workspace-{agentId}",
        agentDirTemplate: "~/.openclaw/agents/{agentId}/agent",
      },
    },
  },
  session: {
    // 根据你的隔离需求选择 dmScope：
    // "main" 用于引导自动加载，"per-channel-peer" 用于更强隔离
    dmScope: "main",
  },
  bindings: [], // 为空 - 动态智能体会自动绑定
}
```

### 验证

检查网关日志，确认动态创建是否正常工作：

```text
feishu: 正在为用户 ou_xxxxxx 创建动态智能体 "feishu-ou_xxxxxx"
  workspace: /home/user/.openclaw/workspace-feishu-ou_xxxxxx
  agentDir: /home/user/.openclaw/agents/feishu-ou_xxxxxx/agent
```

列出所有已创建的工作区：

```bash
ls -la ~/.openclaw/workspace-*
```

### 说明

- **工作区隔离**：每个用户都会获得自己的工作区目录和智能体实例。在正常消息交互流程中，用户无法看到彼此的对话历史或文件。
- **安全边界**：这是一种消息上下文隔离机制，不是恶意共租户的安全边界。智能体进程和宿主环境是共享的。
- **必须保持配置写入开启**：动态智能体创建会将智能体和绑定写入配置；当 `channels.feishu.configWrites` 为 `false` 时会跳过（默认：开启）。
- **`bindings` 应为空**：动态智能体会自动注册自己的绑定
- **升级路径**：现有的手动绑定可以与动态智能体并存
- **`session.dmScope` 是全局的**：这会影响所有频道，而不仅仅是飞书

## 配置参考

完整配置：[网关配置](/gateway/configuration)

| 设置                                                     | 描述                                                                                 | 默认值                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------ |
| `channels.feishu.enabled`                                | 启用/禁用该通道                                                                      | `true`                               |
| `channels.feishu.domain`                                 | API 域名（`feishu`、`lark` 或 `https://` 基础 URL）                                   | `feishu`                             |
| `channels.feishu.connectionMode`                         | 事件传输方式（`websocket` 或 `webhook`）                                              | `websocket`                           |
| `channels.feishu.defaultAccount`                         | 出站路由使用的默认账号                                                              | `default`                            |
| `channels.feishu.verificationToken`                      | webhook 模式必填                                                                     | -                                    |
| `channels.feishu.encryptKey`                             | webhook 模式必填                                                                     | -                                    |
| `channels.feishu.webhookPath`                            | webhook 路由路径                                                                     | `/feishu/events`                     |
| `channels.feishu.webhookHost`                            | webhook 绑定主机                                                                     | `127.0.0.1`                          |
| `channels.feishu.webhookPort`                            | webhook 绑定端口                                                                     | `3000`                               |
| `channels.feishu.accounts.<id>.appId`                    | App ID                                                                               | -                                    |
| `channels.feishu.accounts.<id>.appSecret`                | App Secret                                                                           | -                                    |
| `channels.feishu.accounts.<id>.domain`                   | 每个账号的域名覆盖                                                                  | `feishu`                             |
| `channels.feishu.accounts.<id>.tts`                      | 每个账号的 TTS 覆盖                                                                 | `tts`                                |
| `channels.feishu.dmPolicy`                               | 私聊策略（`pairing`、`allowlist`、`open`）                                           | `pairing`                            |
| `channels.feishu.allowFrom`                              | 私聊允许列表（open_id 列表）                                                          | -                                    |
| `channels.feishu.groupPolicy`                            | 群组策略（`open`、`allowlist`、`disabled`）                                       | `allowlist`                          |
| `channels.feishu.groupAllowFrom`                         | 群组允许列表                                                                      | -                                    |
| `channels.feishu.groupSenderAllowFrom`                   | 应用于所有群组的发送者允许列表                                               | -                                    |
| `channels.feishu.requireMention`                         | 群组中需要 @ 提及                                                           | `true` (`false` when policy `open`)  |
| `channels.feishu.allowBots`                              | 接受其他提及此机器人的机器人，并提供机器人循环保护                    | `false`                              |
| `channels.feishu.groups.<chat_id>.requireMention`        | 单个群组的 @ 提及覆盖；显式 ID 也会在允许列表模式下将该群组纳入允许范围     | inherited                            |
| `channels.feishu.groups.<chat_id>.enabled`               | 启用/禁用特定群组                                                      | `true`                               |
| `channels.feishu.groups.<chat_id>.allowFrom`             | 每个群组的发送者允许列表（覆盖 `groupSenderAllowFrom`）                        | -                                    |
| `channels.feishu.groupSessionScope`                      | 群组会话映射（`group`、`group_sender`、`group_topic`、`group_topic_sender`） | `group`                              |
| `channels.feishu.replyInThread`                          | 机器人回复会创建/继续话题线程（`disabled`、`enabled`）                    | `disabled`                           |
| `channels.feishu.reactionNotifications`                  | 入站反应事件（`off`、`own`、`all`）                                        | `own`                                |
| `channels.feishu.vcAutoJoin`                             | 在正常私聊授权后加入被邀请的 VC 会议                               | `false`                              |
| `channels.feishu.dynamicAgentCreation.enabled`           | 启用按用户自动创建代理                                             | `false`                              |
| `channels.feishu.dynamicAgentCreation.workspaceTemplate` | 动态代理工作空间的路径模板                                           | `~/.openclaw/workspace-{agentId}`    |
| `channels.feishu.dynamicAgentCreation.agentDirTemplate`  | 代理目录名模板                                                        | `~/.openclaw/agents/{agentId}/agent` |
| `channels.feishu.dynamicAgentCreation.maxAgents`         | 可创建的动态代理最大数量                                           | unlimited                            |
| `channels.feishu.textChunkLimit`                         | 消息分块大小                                                                   | `4000`                               |
| `channels.feishu.streaming.chunkMode`                    | 分块拆分方式（`length` 或 `newline`）                                              | `length`                             |
| `channels.feishu.mediaMaxMb`                             | 媒体大小限制                                                                     | `30`                                 |
| `channels.feishu.renderMode`                             | 回复渲染方式（`auto`、`raw`、`card`）                                              | `auto`                               |
| `channels.feishu.streaming.mode`                         | 流式卡片输出（`partial` 或 `off`）                                           | `partial`                            |
| `channels.feishu.streaming.block.enabled`                | 完整块回复流式输出                                                      | `false`                              |
| `channels.feishu.typingIndicator`                        | 发送正在输入反应                                                                | `true`                               |
| `channels.feishu.resolveSenderNames`                     | 解析发送者显示名称                                                         | `true`                               |
| `channels.feishu.configWrites`                           | 允许由通道发起的配置写入（动态代理需要）                     | `true`                               |
| `channels.feishu.tools.doc`                              | 启用文档工具                                                                | `true`                               |
| `channels.feishu.tools.chat`                             | 启用聊天信息工具                                                               | `true`                               |
| `channels.feishu.tools.wiki`                             | 启用知识库工具（需要 `doc`）                                         | `true`                               |
| `channels.feishu.tools.drive`                            | 启用云存储工具                                                           | `true`                               |
| `channels.feishu.tools.perm`                             | 启用权限管理工具                                                   | `false`                              |
| `channels.feishu.tools.scopes`                           | 启用应用作用域诊断工具                                                    | `true`                               |
| `channels.feishu.tools.bitable`                          | 启用 Bitable/Base 工具                                                            | `true`                               |
| `channels.feishu.accounts.<id>.tools.bitable`            | 每个账号的 Bitable/Base 工具开关                                                   | inherited                            |

## 支持的消息类型

### 接收

- ✅ 文本
- ✅ 富文本（帖子）
- ✅ 图片
- ✅ 文件
- ✅ 音频
- ✅ 视频/媒体
- ✅ 表情贴纸

进入的飞书/Lark 音频消息会被规范化为媒体占位符，而不是原始 `file_key` JSON。当配置了 `tools.media.audio` 时，OpenClaw 会下载语音笔记资源，并在代理轮次之前运行共享的音频转写，因此代理会收到口语转录文本。如果飞书在音频载荷中直接包含了转录文本，则会直接使用该文本，而不会再进行一次 ASR 调用。若没有音频转写提供方，代理仍会收到一个 `<media:audio>` 占位符以及已保存的附件，而不是原始的飞书资源载荷。

### 发送

- ✅ 文本
- ✅ 图片
- ✅ 文件
- ✅ 音频
- ✅ 视频/媒体
- ✅ 交互式卡片（包括流式更新）
- ⚠️ 富文本（帖子样式格式；不支持完整的飞书/Lark 创作能力）

原生飞书/Lark 音频气泡使用飞书 `audio` 消息类型，并且需要 Ogg/Opus 上传媒体（`file_type: "opus"`）。现有的 `.opus` 和 `.ogg` 媒体会直接作为原生音频发送。MP3/WAV/M4A 以及其他可能的音频格式只有在回复请求语音投递（`audioAsVoice` / 消息工具 `asVoice`，包括 TTS 语音笔记回复）时，才会借助 `ffmpeg` 转码为 48kHz Ogg/Opus。普通的 MP3 附件会保持为常规文件。如果缺少 `ffmpeg` 或转换失败，OpenClaw 会回退为文件附件，并记录原因。

### 线程和回复

- ✅ 行内回复
- ✅ 线程回复
- ✅ 回复媒体在回复线程消息时仍保持线程感知

Topic-group 会话路由在
[组会话范围和主题线程](#group-session-scope-and-topic-threads) 中有所说明。

## 相关内容

- [渠道概览](/channels) - 所有支持的渠道
- [配对](/channels/pairing) - 私信认证和配对流程
- [群组](/channels/groups) - 群聊行为和提及门控
- [渠道路由](/channels/channel-routing) - 消息的会话路由
- [安全](/gateway/security) - 访问模型和加固
