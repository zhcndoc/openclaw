---
summary: "飞书机器人概览、功能与配置"
read_when:
  - 你想连接飞书/Lark 机器人
  - 你正在配置飞书频道
title: 飞书
---

# 飞书 / Lark

飞书/Lark 是一个一体化协作平台，团队可以在这里聊天、共享文档、管理日历并一起完成工作。

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
  使用飞书/Lark 手机应用扫描二维码，自动创建飞书/Lark 机器人。
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

- `"pairing"` — 未知用户会收到配对码；通过 CLI 批准
- `"allowlist"` — 只有 `allowFrom` 中列出的用户可以聊天（默认：仅机器人所有者）
- `"open"` — 仅当 `allowFrom` 包含 `"*"` 时才允许公开私信；如果条目具有更严格限制，则只有匹配的用户可以聊天
- `"disabled"` — 禁用所有私信

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

- `true` — 需要 @提及（默认）
- `false` — 无需 @提及即可响应
- 单个群组覆盖：`channels.feishu.groups.<chat_id>.requireMention`
- 仅广播的 `@all` 和 `@_all` 不会被视为机器人提及。消息中如果同时提及了 `@all` 和机器人本身，仍会算作机器人提及。

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

- `textChunkLimit` — 外发文本块大小（默认：`2000` 字符）
- `mediaMaxMb` — 媒体上传/下载限制（默认：`30` MB）

### 流式输出

飞书/Lark 支持通过交互式卡片进行流式回复。启用后，机器人在生成文本时会实时更新卡片。

```json5
{
  channels: {
    feishu: {
      streaming: true, // 启用流式卡片输出（默认：true）
      blockStreaming: true, // 启用块级流式输出（默认：true）
    },
  },
}
```

将 `streaming: false` 设为在一条消息中发送完整回复。

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

飞书/Lark 支持用于私信和群组线程消息的 ACP。飞书/Lark ACP 采用文本命令驱动——没有原生斜杠命令菜单，因此请直接在对话中使用 `/acp ...` 消息。

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

## 配置参考

完整配置：[网关配置](/gateway/configuration)

| 设置                                              | 描述                                                                         | 默认值             |
| ------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------ |
| `channels.feishu.enabled`                         | 启用/禁用该频道                                                             | `true`             |
| `channels.feishu.domain`                          | API 域名（`feishu` 或 `lark`）                                              | `feishu`           |
| `channels.feishu.connectionMode`                  | 事件传输方式（`websocket` 或 `webhook`）                                     | `websocket`        |
| `channels.feishu.defaultAccount`                  | 外发路由使用的默认账户                                                       | `default`          |
| `channels.feishu.verificationToken`               | webhook 模式必需                                                           | —                  |
| `channels.feishu.encryptKey`                      | webhook 模式必需                                                           | —                  |
| `channels.feishu.webhookPath`                     | webhook 路由路径                                                            | `/feishu/events`   |
| `channels.feishu.webhookHost`                     | webhook 绑定主机                                                            | `127.0.0.1`        |
| `channels.feishu.webhookPort`                     | webhook 绑定端口                                                            | `3000`             |
| `channels.feishu.accounts.<id>.appId`             | App ID                                                                      | —                  |
| `channels.feishu.accounts.<id>.appSecret`         | App Secret                                                                  | —                  |
| `channels.feishu.accounts.<id>.domain`            | 单账户域名覆盖                                                              | `feishu`           |
| `channels.feishu.accounts.<id>.tts`               | 单账户 TTS 覆盖                                                             | `messages.tts`    |
| `channels.feishu.dmPolicy`                        | 私信策略                                                                    | `allowlist`        |
| `channels.feishu.allowFrom`                       | 私信允许列表（open_id 列表）                                                | [BotOwnerId]       |
| `channels.feishu.groupPolicy`                     | 群组策略                                                                    | `allowlist`        |
| `channels.feishu.groupAllowFrom`                  | 群组允许列表                                                                | —                  |
| `channels.feishu.requireMention`                  | 群组中是否需要 @提及                                                        | `true`             |
| `channels.feishu.groups.<chat_id>.requireMention` | 单个群组的 @提及覆盖；显式 ID 也会在 allowlist 模式下允许该群组            | inherited          |
| `channels.feishu.groups.<chat_id>.enabled`        | 启用/禁用特定群组                                                            | `true`             |
| `channels.feishu.textChunkLimit`                  | 消息块大小                                                                  | `2000`             |
| `channels.feishu.mediaMaxMb`                      | 媒体大小限制                                                                | `30`               |
| `channels.feishu.streaming`                       | 流式卡片输出                                                                | `true`             |
| `channels.feishu.blockStreaming`                  | 块级流式输出                                                                | `true`             |
| `channels.feishu.typingIndicator`                 | 发送输入中反应                                                              | `true`             |
| `channels.feishu.resolveSenderNames`              | 解析发送者显示名称                                                          | `true`             |

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

对于 `groupSessionScope: "group_topic"` 和 `"group_topic_sender"`，原生飞书/Lark 话题群会使用事件 `thread_id`（`omt_*`）作为规范的话题会话键。OpenClaw 将普通群聊回复转为线程时，会继续使用回复根消息 ID（`om_*`），因此首轮和后续轮次会保留在同一个会话中。

---

## 相关内容

- [频道概览](/channels) — 所有支持的频道
- [配对](/channels/pairing) — 私信认证和配对流程
- [群组](/channels/groups) — 群聊行为和提及门控
- [频道路由](/channels/channel-routing) — 消息的会话路由
- [安全性](/gateway/security) — 访问模型和加固
