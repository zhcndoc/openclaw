---
summary: "Yuanbao 机器人概览、功能与配置"
read_when:
  - "你想连接一个 Yuanbao 机器人"
  - "你正在配置 Yuanbao 渠道"
title: "元宝"
---

腾讯元宝是腾讯的AI助手平台。社区维护的 `openclaw-plugin-yuanbao` 插件通过 WebSocket 将元宝机器人连接到 OpenClaw，以进行直接消息和群聊。

**状态：** 已准备好用于机器人 DM 和群聊。 WebSocket 是唯一支持的连接模式。该插件由腾讯元宝团队作为外部目录条目维护，而不是由核心OpenClaw维护；下面的 config/behavior 详细信息（超出安装和通用 CLI 表面）来自插件自己的文档，未针对 OpenClaw 核心源进行验证。

## <a id="quick-start"></a> 快速开始

需要 OpenClaw 2026.4.10 或更高版本。使用 `openclaw --version` 检查；使用 `openclaw update` 升级。

<Steps>
  <Step id="add-the-yuanbao-channel-with-your-credentials" title="使用您的凭据添加元宝频道">
  ```bash
  openclaw channels add --channel yuanbao --token "appKey:appSecret"
  ```
  `--token` 使用以冒号分隔的 `appKey:appSecret`。通过在应用设置中创建机器人，从 Yuanbao 应用获取这些信息。
  </Step>

  <Step id="verify-the-channel" title="验证通道">
  <a id="restart-the-gateway-to-apply-the-change" />
  配置更改遵循 [hot reload](/gateway/configuration/hot-reload)。检查通道是否准备就绪：
  ```bash
  openclaw channels status --probe
  ```
  如果网关离线，请启动网关。
  </Step>
</Steps>

### <a id="interactive-setup-(alternative)"></a><a id="interactive-setup-alternative"></a> 交互式设置（可选）

```bash
openclaw channels login --channel yuanbao
```

按照提示输入您的应用程序密钥 （`appKey`） 和应用程序密钥 （`appSecret`）。

## <a id="access-control"></a> 访问控制

### <a id="direct-messages"></a> 私信

`channels.yuanbao.dm.policy`:

| 值            | 行为                                          |
| ---------------- | ------------------------------------------------- |
| `open`（默认） | 允许所有用户                                   |
| `pairing`        | 未知用户会获得一个配对码；通过 CLI 审批 |
| `allowlist`      | 只有 `allowFrom` 中的用户可以聊天                |
| `disabled`       | 禁用所有私信                                   |

批准配对请求：

```bash
openclaw pairing list yuanbao
openclaw pairing approve yuanbao <CODE>
```

### <a id="group-chats"></a> 群聊

`channels.yuanbao.requireMention`（默认 `true`）：在机器人在群组中响应之前需要 @mention。回复机器人自己的消息被视为隐式提及。

## <a id="configuration-examples"></a> 配置示例

基础设置，开放 DM 策略：

```json5
{
  channels: {
    yuanbao: {
      appKey: "your_app_key",
      appSecret: "your_app_secret",
      dm: {
        policy: "open",
      },
    },
  },
}
```

将私信限制为特定用户：

```json5
{
  channels: {
    yuanbao: {
      appKey: "your_app_key",
      appSecret: "your_app_secret",
      dm: {
        policy: "allowlist",
        allowFrom: ["user_id_1", "user_id_2"],
      },
    },
  },
}
```

成组禁用 @mention 要求：

```json5
{
  channels: {
    yuanbao: {
      requireMention: false,
    },
  },
}
```

出站投递调优：

```json5
{
  channels: {
    yuanbao: {
      outboundQueueStrategy: "merge-text",
      minChars: 2800, // buffer until this many chars
      maxChars: 3000, // force split above this limit
      idleMs: 5000, // auto-flush after idle timeout (ms)
    },
  },
}
```

将 `outboundQueueStrategy: "immediate"` 设置为不缓冲、直接发送每个分块。

## <a id="common-commands"></a> 常用命令

| 命令    | 描述                 |
| ---------- | --------------------------- |
| `/help`    | 显示可用命令     |
| `/status`  | 显示机器人状态             |
| `/new`     | 开始新会话         |
| `/stop`    | 停止当前运行        |
| `/restart` | 重启 OpenClaw            |
| `/compact` | 压缩会话上下文 |

Yuanbao 支持原生斜杠菜单；当网关启动时，命令会自动同步到平台。

## <a id="troubleshooting"></a> 故障排查

**机器人在群聊中没有响应：**

1. 确认机器人已被添加到群组
2. 确认您是@mention机器人（默认需要）
3. 检查日志：`openclaw logs --follow`

**机器人没有收到消息：**

1. 确认机器人已在 Yuanbao 应用中创建并通过审核
2. 确认 `appKey` 和 `appSecret` 已正确配置
3. 确认网关正在运行：`openclaw gateway status`
4. 检查日志：`openclaw logs --follow`

**机器人发送空回复或回退回复：**

1. 检查 AI 模型是否返回了有效内容
2. Default fallback reply: "暂时无法解答，你可以换个问题问问我哦"
3. 通过 `channels.yuanbao.fallbackReply` 自定义

**App Secret 泄露：**

1. 在 Yuanbao 应用中重置 App Secret
2. 更新配置中的值
3. 验证 [hot reload](/gateway/configuration/hot-reload) 是否应用了 `openclaw channels status --probe` 的新凭证。

## <a id="advanced-configuration"></a> 高级配置

### <a id="multiple-accounts"></a> 多个账户

```json5
{
  channels: {
    yuanbao: {
      defaultAccount: "main",
      accounts: {
        main: {
          appKey: "key_xxx",
          appSecret: "secret_xxx",
          name: "Primary bot",
        },
        backup: {
          appKey: "key_yyy",
          appSecret: "secret_yyy",
          name: "Backup bot",
          enabled: false,
        },
      },
    },
  },
}
```

`defaultAccount` 控制出站 API 未指定 `accountId` 时使用哪个帐户。

### <a id="message-limits"></a> 消息限制

- `maxChars`：单条消息最大字符数（默认 `3000`）
- `mediaMaxMb`：媒体upload/download限制（默认`20` MB）
- `overflowPolicy`：当消息超过限制时的处理方式，`"split"`（默认）或 `"stop"`

### <a id="streaming"></a> 流式输出

元宝支持块级流式输出；机器人在生成文本时会分块发送。

```json5
{
  channels: {
    yuanbao: {
      disableBlockStreaming: false, // block streaming enabled (default)
    },
  },
}
```

将 `disableBlockStreaming: true` 设为在一条消息中发送完整回复。

### <a id="group-chat-history-context"></a> 群聊历史上下文

```json5
{
  channels: {
    yuanbao: {
      historyLimit: 100, // default: 100, set 0 to disable
    },
  },
}
```

控制在群聊中包含到 AI 上下文里的历史消息数量。

### <a id="reply-to-mode"></a> 回复模式

```json5
{
  channels: {
    yuanbao: {
      replyToMode: "first", // "off" | "first" | "all" (default: "first")
    },
  },
}
```

| 值   | 行为                                                 |
| ------- | -------------------------------------------------------- |
| `off`   | 不进行引用回复                                           |
| `first` | 每条传入消息仅引用第一条回复（默认） |
| `all`   | 引用每一条回复                                        |

### <a id="markdown-hint-injection"></a> Markdown 提示注入

默认情况下，机器人会注入系统提示指令，以防止模型将整个回复包装在 markdown 代码块中。

```json5
{
  channels: {
    yuanbao: {
      markdownHintEnabled: true, // default: true
    },
  },
}
```

### <a id="debug-mode"></a> 调试模式

```json5
{
  channels: {
    yuanbao: {
      debugBotIds: ["bot_user_id_1", "bot_user_id_2"],
    },
  },
}
```

为列出的机器人 ID 启用未经清理的日志输出。

### <a id="multi-agent-routing"></a> 多智能体路由

使用 `bindings` 将元宝私信或群聊路由到不同的智能体：

```json5
{
  agents: {
    ownership: "explicit",
    defaults: {
      heartbeat: { agentId: "main" },
      systemAgent: { agentId: "main" },
    },
    entries: {
      main: { workspace: "~/.openclaw/workspace" },
      "agent-a": { workspace: "/home/user/agent-a" },
      "agent-b": { workspace: "/home/user/agent-b" },
    },
  },
  bindings: [
    {
      agentId: "agent-a",
      match: {
        channel: "yuanbao",
        peer: { kind: "direct", id: "user_xxx" },
      },
    },
    {
      agentId: "agent-b",
      match: {
        channel: "yuanbao",
        peer: { kind: "group", id: "group_zzz" },
      },
    },
    { agentId: "main", match: { channel: "yuanbao", accountId: "*" } },
  ],
  talk: { agentId: "main" },
}
```

- `match.channel`: `"yuanbao"`
- `match.peer.kind`：`"direct"`（DM）或`"group"`（群聊）
- `match.peer.id`：用户 ID 或群号。

## <a id="configuration-reference"></a> 配置参考

完整配置：[网关配置](/gateway/configuration)

| 设置                                    | 描述                                       | 默认值                                |
| ------------------------------------------ | ------------------------------------------------- | -------------------------------------- |
| `channels.yuanbao.enabled`                 | Enable/disable 频道                        | `true`                                 |
| `channels.yuanbao.defaultAccount`          | 出站路由的默认账号              | `default`                              |
| `channels.yuanbao.accounts.<id>.appKey`    | App Key（签名 + ticket 生成）             | -                                      |
| `channels.yuanbao.accounts.<id>.appSecret` | App Secret（签名）                              | -                                      |
| `channels.yuanbao.accounts.<id>.token`     | 预签名 token（跳过自动 ticket 签名） | -                                      |
| `channels.yuanbao.accounts.<id>.name`      | 账号显示名称                              | -                                      |
| `channels.yuanbao.accounts.<id>.enabled`   | Enable/disable 特定账户                 | `true`                                 |
| `channels.yuanbao.dm.policy`               | DM 政策                                         | `open`                                 |
| `channels.yuanbao.dm.allowFrom`            | DM 允许列表（用户 ID 列表）                       | -                                      |
| `channels.yuanbao.requireMention`          | 分组需要@mention                        | `true`                                 |
| `channels.yuanbao.overflowPolicy`          | 长消息处理（`split` 或 `stop`）         | `split`                                |
| `channels.yuanbao.replyToMode`             | 群聊 reply-to 策略（`off`、`first`、`all`）   | `first`                                |
| `channels.yuanbao.outboundQueueStrategy`   | 出站策略（`merge-text` 或 `immediate`）   | `merge-text`                           |
| `channels.yuanbao.minChars`                | merge-text：触发发送的最少字符数             | `2800`                                 |
| `channels.yuanbao.maxChars`                | merge-text：每条消息的最大字符数                 | `3000`                                 |
| `channels.yuanbao.idleMs`                  | merge-text：自动刷新前的空闲超时时间（毫秒）   | `5000`                                 |
| `channels.yuanbao.mediaMaxMb`              | 媒体大小限制（MB）                             | `20`                                   |
| `channels.yuanbao.historyLimit`            | 群聊历史上下文条目数                | `100`                                  |
| `channels.yuanbao.disableBlockStreaming`   | 禁用块级流式输出              | `false`                                |
| `channels.yuanbao.fallbackReply`           | 当模型没有返回内容时的回退回复  | `暂时无法解答，你可以换个问题问问我哦` |
| `channels.yuanbao.markdownHintEnabled`     | 注入 markdown 防换行折叠指令        | `true`                                 |
| `channels.yuanbao.debugBotIds`             | 调试白名单 bot IDs（未净化日志）        | `[]`                                   |

## <a id="supported-message-types"></a> 支持的消息类型

**接收：**文本、图像、文件、audio/voice、视频、stickers/custom表情符号、自定义元素（链接卡）。

**发送：**文本（markdown）、图片、文件、音频、视频、贴纸。

**线程和回复：**引用回复（可通过 `replyToMode` 配置）；平台不支持线程回复。

## <a id="related"></a> 相关内容

- [Channels Overview](/channels) - 所有支持的渠道
- [Pairing](/channels/pairing) - DM 身份验证和配对流程
- [群组](/channels/groups) - 群聊行为和提及门控
- [通道路由](/channels/channel-routing) - 消息的会话路由
- [Security](/gateway/security) - 访问模型和强化
