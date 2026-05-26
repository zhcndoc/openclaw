---
summary: "飞书机器人概览、功能与配置"
read_when:
  - 你想连接飞书/Lark 机器人
  - 你正在配置飞书频道
title: 飞书
---

Feishu/Lark 是一个一体化协作平台，团队可以在这里聊天、共享文档、管理日历，并一起高效完成工作。

**状态：** 已可用于生产环境，支持机器人私信 + 群聊。默认模式为 WebSocket；webhook 模式为可选。

---

## 快速开始

<Note>
需要 OpenClaw 2026.4.25 或更高版本。运行 `openclaw --version` 检查。使用 `openclaw update` 升级。
</Note>

<Steps>
  <Step title="运行频道设置向导">
  ```bash
  openclaw channels login --channel feishu
  ```
  选择手动设置以粘贴来自 Feishu Open Platform 的 App ID 和 App Secret，或者选择二维码设置来自动创建机器人。如果国内版飞书移动应用对二维码没有反应，请重新运行设置并选择手动设置。
  </Step>
  
  <Step title="设置完成后，重启网关以应用更改">
  ```bash
  openclaw gateway restart
  ```
  </Step>
</Steps>

---

## 访问控制

### 私信

配置 `dmPolicy` 来控制谁可以给机器人发私信：

- `"pairing"` - 未知用户会收到配对码；通过 CLI 批准
- `"allowlist"` - 只有 `allowFrom` 中列出的用户可以聊天（默认：仅机器人所有者）
- `"open"` - 仅当 `allowFrom` 包含 `"*"` 时允许公开私信；若条目限制较严格，则只有匹配的用户可以聊天
- `"disabled"` - 禁用所有私信

**批准配对请求：**

```bash
openclaw pairing list feishu
openclaw pairing approve feishu <CODE>
```

### 群聊

**群组策略**（`channels.feishu.groupPolicy`）：

| 值            | 行为                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------- |
| `"open"`      | 响应群组中的所有消息                                                                      |
| `"allowlist"` | 仅响应 `groupAllowFrom` 中的群组，或在 `groups.<chat_id>` 下显式配置的群组               |
| `"disabled"`  | 禁用所有群消息；显式的 `groups.<chat_id>` 条目不会覆盖此设置                             |

默认值：`allowlist`

**提及要求**（`channels.feishu.requireMention`）：

- `true` - 需要 @提及（默认）
- `false` - 无需 @提及即可响应
- 按群组覆盖：`channels.feishu.groups.<chat_id>.requireMention`
- 仅广播的 `@all` 和 `@_all` 不会被视为机器人提及。若一条消息同时提及了 `@all` 和机器人本身，仍会被视为机器人提及。

---

## 群组配置示例

### 允许所有群组，不需要 @提及

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
    },
  },
}
```

### 允许所有群组，但仍需要 @提及

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

---

<a id="get-groupuser-ids"></a>

## 获取群组/用户 ID

### 群组 ID（`chat_id`，格式：`oc_xxx`）

在飞书/Lark 中打开群组，点击右上角的菜单图标，然后进入 **设置**。群组 ID（`chat_id`）列在设置页面上。

![获取群组 ID](/images/feishu-get-group-id.png)

### 用户 ID（`open_id`，格式：`ou_xxx`）

启动网关，向机器人发送一条私信，然后检查日志：

```bash
openclaw logs --follow
```

在日志输出中查找 `open_id`。你也可以查看待处理的配对请求：

```bash
openclaw pairing list feishu
```

---

## 常用命令

| 命令      | 描述                 |
| --------- | -------------------- |
| `/status` | 显示机器人状态       |
| `/reset`  | 重置当前会话         |
| `/model`  | 显示或切换 AI 模型   |

<Note>
飞书/Lark 不支持原生斜杠命令菜单，因此请将这些内容作为纯文本消息发送。
</Note>

---

## 故障排查

### 机器人在群聊中没有响应

1. 确保机器人已加入群组
2. 确保你 @提及了机器人（默认要求）
3. 验证 `groupPolicy` 不是 `"disabled"`
4. 检查日志：`openclaw logs --follow`

### 机器人收不到消息

1. 确保机器人已在飞书开放平台 / Lark 开发者平台发布并通过审批
2. 确保事件订阅包含 `im.message.receive_v1`
3. 确保选择了**长连接**（WebSocket）
4. 确保已授予所有必需的权限范围
5. 确保网关正在运行：`openclaw gateway status`
6. 检查日志：`openclaw logs --follow`

### 二维码设置在飞书移动应用中没有反应

1. 重新运行设置：`openclaw channels login --channel feishu`
2. 选择手动设置
3. 在 Feishu Open Platform 中创建自建应用并复制其 App ID 和 App Secret
4. 将这些凭据粘贴到设置向导中

### App Secret 泄露

1. 在飞书开放平台 / Lark 开发者平台重置 App Secret
2. 更新配置中的值
3. 重启网关：`openclaw gateway restart`

---

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

`defaultAccount` 控制当外发 API 未指定 `accountId` 时使用哪个账户。
`accounts.<id>.tts` 的结构与 `messages.tts` 相同，并会在全局 TTS 配置之上进行深度合并，因此多机器人飞书部署可以在全局共享供应商凭据，同时仅按账户覆盖语音、模型、角色设定或自动模式。

### 消息限制

- `textChunkLimit` - 外发文本分块大小（默认：`2000` 字符）
- `mediaMaxMb` - 媒体上传/下载限制（默认：`30` MB）

### 流式输出

飞书/Lark 支持通过交互式卡片进行流式回复。启用后，机器人在生成文本时会实时更新卡片。

```json5
{
  channels: {
    feishu: {
      streaming: true, // 启用流式卡片输出（默认：true）
      blockStreaming: true, // 启用完整块流式输出
    },
  },
}
```

将 `streaming: false` 设为关闭，以单条消息发送完整回复。`blockStreaming` 默认关闭；仅在你希望在最终回复之前先刷新已完成的助手块时启用。

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

---

## 按用户隔离的智能体（动态智能体创建）

启用 `dynamicAgentCreation` 可为每个私信用户自动创建**隔离的智能体实例**。每个用户都会拥有自己的：

- 独立工作区目录
- 单独的 `USER.md` / `SOUL.md` / `MEMORY.md`
- 私有对话历史
- 隔离的技能和状态

对于希望每个用户都拥有自己私有 AI 助手体验的公共机器人来说，这一点至关重要。

<Note>
**账户限制**：`dynamicAgentCreation` 目前仅适用于**默认飞书账户**。尚不完全支持命名/多账户配置——动态绑定创建时不带 `accountId`，因此发往命名账户的消息仍可能路由到 `agent:main`。进展请见 [Issue #42837](https://github.com/openclaw/openclaw/issues/42837)。
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

1. 频道生成一个唯一的 `agentId` = `feishu-{user_open_id}`
2. 在 `workspaceTemplate` 路径下创建新的工作区
3. 注册该智能体并为该用户创建绑定
4. 工作区辅助程序在首次访问时确保引导文件（`AGENTS.md`、`SOUL.md`、`USER.md` 等）存在
5. 将该用户未来的所有消息路由到其专属智能体

### 配置选项

| 设置                                                     | 描述                                 | 默认值                               |
| -------------------------------------------------------- | ------------------------------------ | ------------------------------------ |
| `channels.feishu.dynamicAgentCreation.enabled`           | 启用自动按用户创建智能体             | `false`                              |
| `channels.feishu.dynamicAgentCreation.workspaceTemplate` | 动态智能体工作区的路径模板           | `~/.openclaw/workspace-{agentId}`    |
| `channels.feishu.dynamicAgentCreation.agentDirTemplate`  | 智能体目录名称模板                   | `~/.openclaw/agents/{agentId}/agent` |
| `channels.feishu.dynamicAgentCreation.maxAgents`         | 可创建的动态智能体最大数量           | 不限                                 |

模板变量：

- `{agentId}` - 生成的智能体 ID（例如 `feishu-ou_xxxxxx`）
- `{userId}` - 发送者的飞书 open_id（例如 `ou_xxxxxx`）

### 会话范围

`session.dmScope` 控制私信如何映射到智能体会话。这是一个**全局设置**，会影响所有频道。

| 值                   | 行为                                              | 适用场景                                                         |
| -------------------- | ------------------------------------------------- | ---------------------------------------------------------------- |
| `"main"`             | 每个用户的私信映射到其智能体的主会话             | 单用户机器人，希望自动加载 `USER.md` / `SOUL.md`                |
| `"per-channel-peer"` | 每个（频道 + 用户）组合使用单独会话              | 需要更强隔离的公共多用户机器人                                   |

**权衡**：使用 `"main"` 可以启用引导文件的自动加载（`USER.md`、`SOUL.md`、`MEMORY.md`），但这意味着所有频道的所有私信都会共享相同的会话键模式。对于更看重隔离而不是引导自动加载的公共多用户机器人，建议使用 `"per-channel-peer"` 并手动管理引导文件。

<Note>
不建议在 `dynamicAgentCreation` 中使用 `"per-account-channel-peer"`，因为动态绑定创建时不带 `accountId`。仅在手动绑定时使用它。
</Note>

```json5
{
  session: {
    // 适用于单用户个人机器人：启用引导文件自动加载
    dmScope: "main",

    // 适用于公共多用户机器人：更强的隔离
    // dmScope: "per-channel-peer",
  },
}
```

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

```
feishu: creating dynamic agent "feishu-ou_xxxxxx" for user ou_xxxxxx
workspace: /Users/you/.openclaw/workspace-feishu-ou_xxxxxx
feishu: dynamic agent created, new route: agent:feishu-ou_xxxxxx:main
```

列出所有已创建的工作区：

```bash
ls -la ~/.openclaw/workspace-*
```

### 说明

- **工作区隔离**：每个用户都会获得自己的工作区目录和智能体实例。用户无法在正常消息交互流程中看到彼此的对话历史或文件。
- **安全边界**：这是一种消息上下文隔离机制，而不是恶意共租户安全边界。智能体进程和宿主环境是共享的。
- **`bindings` 应为空**：动态智能体会自动注册自己的绑定
- **升级路径**：现有的手动绑定可继续与动态智能体并行工作
- **`session.dmScope` 是全局的**：这会影响所有频道，而不仅仅是飞书

---

## 配置参考

完整配置：[网关配置](/gateway/configuration)

| Setting                                                  | Description                                                                      | Default                              |
| -------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------ |
| `channels.feishu.enabled`                                | 启用/禁用该通道                                                                  | `true`                               |
| `channels.feishu.domain`                                 | API 域名（`feishu` 或 `lark`）                                                   | `feishu`                             |
| `channels.feishu.connectionMode`                         | 事件传输方式（`websocket` 或 `webhook`）                                         | `websocket`                          |
| `channels.feishu.defaultAccount`                         | 出站路由的默认账号                                                              | `default`                            |
| `channels.feishu.verificationToken`                      | webhook 模式必需                                                                | -                                    |
| `channels.feishu.encryptKey`                             | webhook 模式必需                                                                | -                                    |
| `channels.feishu.webhookPath`                            | Webhook 路由路径                                                                | `/feishu/events`                     |
| `channels.feishu.webhookHost`                            | Webhook 绑定主机                                                                | `127.0.0.1`                          |
| `channels.feishu.webhookPort`                            | Webhook 绑定端口                                                                | `3000`                               |
| `channels.feishu.accounts.<id>.appId`                    | App ID                                                                           | -                                    |
| `channels.feishu.accounts.<id>.appSecret`                | App Secret                                                                       | -                                    |
| `channels.feishu.accounts.<id>.domain`                   | 单个账号的域名覆盖                                                              | `feishu`                             |
| `channels.feishu.accounts.<id>.tts`                      | 单个账号的 TTS 覆盖                                                             | `messages.tts`                       |
| `channels.feishu.dmPolicy`                               | 私信策略                                                                         | `allowlist`                          |
| `channels.feishu.allowFrom`                              | 私信允许名单（open_id 列表）                                                     | [BotOwnerId]                         |
| `channels.feishu.groupPolicy`                            | 群组策略                                                                         | `allowlist`                          |
| `channels.feishu.groupAllowFrom`                         | 群组允许名单                                                                    | -                                    |
| `channels.feishu.requireMention`                         | 群组中是否需要 @ 提及                                                           | `true`                               |
| `channels.feishu.groups.<chat_id>.requireMention`        | 单个群组的 @ 提及覆盖；显式 ID 在 allowlist 模式下也会将该群组纳入允许范围       | inherited                            |
| `channels.feishu.groups.<chat_id>.enabled`               | 启用/禁用特定群组                                                                | `true`                               |
| `channels.feishu.dynamicAgentCreation.enabled`           | 启用按用户自动创建代理                                                          | `false`                              |
| `channels.feishu.dynamicAgentCreation.workspaceTemplate` | 动态代理工作区的路径模板                                                        | `~/.openclaw/workspace-{agentId}`    |
| `channels.feishu.dynamicAgentCreation.agentDirTemplate`  | 代理目录名称模板                                                                | `~/.openclaw/agents/{agentId}/agent` |
| `channels.feishu.dynamicAgentCreation.maxAgents`         | 可创建的动态代理最大数量                                                        | unlimited                            |
| `channels.feishu.textChunkLimit`                         | 消息分片大小                                                                     | `2000`                               |
| `channels.feishu.mediaMaxMb`                             | 媒体大小限制                                                                     | `30`                                 |
| `channels.feishu.streaming`                              | 流式卡片输出                                                                     | `true`                               |
| `channels.feishu.blockStreaming`                         | 完成块回复流式输出                                                               | `false`                              |
| `channels.feishu.typingIndicator`                        | 发送输入中反应                                                                   | `true`                               |
| `channels.feishu.resolveSenderNames`                     | 解析发送者显示名称                                                               | `true`                               |

---

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

对于 `groupSessionScope: "group_topic"` 和 `"group_topic_sender"`，原生飞书/Lark 主题群使用事件 `thread_id`（`omt_*`）作为规范的主题会话键。如果原生主题发起事件省略了 `thread_id`，OpenClaw 会在路由该轮之前从飞书补全它。OpenClaw 将普通群组回复转换为线程时，仍然使用回复根消息 ID（`om_*`），因此首轮和后续轮会保留在同一会话中。

---

## 相关内容

- [Channels Overview](/channels) - 所有支持的渠道
- [Pairing](/channels/pairing) - 私信认证和配对流程
- [Groups](/channels/groups) - 群聊行为和提及门控
- [Channel Routing](/channels/channel-routing) - 消息的会话路由
- [Security](/gateway/security) - 访问模型和加固
