---
summary: "Yuanbao 机器人概览、功能与配置"
read_when:
  - 你想连接一个 Yuanbao 机器人
  - 你正在配置 Yuanbao 渠道
title: Yuanbao
---

Tencent Yuanbao 是腾讯的 AI 助手平台。OpenClaw 渠道插件通过 WebSocket 将 Yuanbao 机器人连接到 OpenClaw，使其能够通过私信和群聊与用户交互。

**状态：** 已可用于生产环境，支持机器人私信 + 群聊。WebSocket 是唯一受支持的连接模式。

---

## 快速开始

> **需要 OpenClaw 2026.4.10 或以上版本。** 运行 `openclaw --version` 检查版本。使用 `openclaw update` 升级。

<Steps>
  <Step title="使用你的凭据添加 Yuanbao 渠道">
  ```bash
  openclaw channels add --channel yuanbao --token "appKey:appSecret"
  ```
  `--token` 的值使用冒号分隔的 `appKey:appSecret` 格式。你可以在 Yuanbao 应用中，通过在应用设置里创建机器人获取这些信息。
  </Step>

  <Step title="设置完成后，重启网关以应用更改">
  ```bash
  openclaw gateway restart
  ```
  </Step>
</Steps>

### 交互式设置（可选）

你也可以使用交互式向导：

```bash
openclaw channels login --channel yuanbao
```

按照提示输入你的 App ID 和 App Secret。

---

## 访问控制

### 私信

配置 `dmPolicy` 以控制谁可以私信机器人：

- `"pairing"` - 未知用户会收到配对码；通过 CLI 审批
- `"allowlist"` - 只有 `allowFrom` 中列出的用户可以聊天
- `"open"` - 允许所有用户（默认）
- `"disabled"` - 禁用所有私信

**审批配对请求：**

```bash
openclaw pairing list yuanbao
openclaw pairing approve yuanbao <CODE>
```

### 群聊

**提及要求**（`channels.yuanbao.requireMention`）：

- `true` - 需要 @ 提及（默认）
- `false` - 无需 @ 提及即可响应

在群聊中回复机器人的消息会被视为隐式提及。

---

## 配置示例

### 使用开放私信策略的基础设置

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

### 将私信限制为特定用户

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

### 在群聊中禁用 @ 提及要求

```json5
{
  channels: {
    yuanbao: {
      requireMention: false,
    },
  },
}
```

### 优化出站消息投递

```json5
{
  channels: {
    yuanbao: {
      // 立即发送每个分块，不进行缓冲
      outboundQueueStrategy: "immediate",
    },
  },
}
```

### 调整 merge-text 策略

```json5
{
  channels: {
    yuanbao: {
      outboundQueueStrategy: "merge-text",
      minChars: 2800, // 缓冲直到达到这么多字符
      maxChars: 3000, // 超过此限制时强制拆分
      idleMs: 5000, // 空闲超时后自动刷新（毫秒）
    },
  },
}
```

---

## 常用命令

| 命令       | 描述                     |
| ---------- | ------------------------ |
| `/help`    | 显示可用命令             |
| `/status`  | 显示机器人状态           |
| `/new`     | 开始新会话               |
| `/stop`    | 停止当前运行             |
| `/restart` | 重启 OpenClaw            |
| `/compact` | 压缩会话上下文           |

> Yuanbao 支持原生斜杠菜单命令。网关启动时，命令会自动同步到平台。

---

## 故障排查

### 机器人在群聊中没有响应

1. 确保机器人已被添加到群组中
2. 确保你 @ 提及了机器人（默认需要）
3. 检查日志：`openclaw logs --follow`

### 机器人没有收到消息

1. 确保机器人已在 Yuanbao 应用中创建并获批
2. 确保 `appKey` 和 `appSecret` 已正确配置
3. 确保网关正在运行：`openclaw gateway status`
4. 检查日志：`openclaw logs --follow`

### 机器人发送空回复或回退回复

1. 检查 AI 模型是否返回了有效内容
2. 默认回退回复为："暂时无法解答，你可以换个问题问问我哦"
3. 通过 `channels.yuanbao.fallbackReply` 自定义它

### App Secret 泄露

1. 在 YuanBao APP 中重置 App Secret
2. 更新配置中的值
3. 重启网关：`openclaw gateway restart`

---

## 高级配置

### 多账号

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

`defaultAccount` 控制当出站 API 未指定 `accountId` 时使用哪个账号。

### 消息限制

- `maxChars` - 单条消息最大字符数（默认：`3000` 个字符）
- `mediaMaxMb` - 媒体上传/下载限制（默认：`20` MB）
- `overflowPolicy` - 消息超出限制时的行为：`"split"`（默认）或 `"stop"`

### 流式输出

Yuanbao 支持块级流式输出。启用后，机器人会在生成文本时按分块发送。

```json5
{
  channels: {
    yuanbao: {
      disableBlockStreaming: false, // 已启用块级流式输出（默认）
    },
  },
}
```

将 `disableBlockStreaming: true` 设为在一条消息中发送完整回复。

### 群聊历史上下文

控制群聊中有多少历史消息会被包含在 AI 上下文中：

```json5
{
  channels: {
    yuanbao: {
      historyLimit: 100, // 默认：100，设为 0 可禁用
    },
  },
}
```

### 回复引用模式

控制机器人在群聊中回复时如何引用消息：

```json5
{
  channels: {
    yuanbao: {
      replyToMode: "first", // "off" | "first" | "all"（默认："first"）
    },
  },
}
```

| 值        | 行为                                                     |
| --------- | -------------------------------------------------------- |
| `"off"`   | 不引用回复                                               |
| `"first"` | 每条传入消息仅引用第一次回复（默认）                       |
| `"all"`   | 每次回复都引用                                           |

### Markdown 提示注入

默认情况下，机器人会在系统提示中注入指令，以防止 AI 模型将整个回复包裹在 markdown 代码块中。

```json5
{
  channels: {
    yuanbao: {
      markdownHintEnabled: true, // 默认：true
    },
  },
}
```

### 调试模式

为特定机器人 ID 启用未清洗的日志输出：

```json5
{
  channels: {
    yuanbao: {
      debugBotIds: ["bot_user_id_1", "bot_user_id_2"],
    },
  },
}
```

### 多智能体路由

使用 `bindings` 将 Yuanbao 私信或群聊路由到不同的智能体。

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
  ],
}
```

路由字段：

- `match.channel`: `"yuanbao"`
- `match.peer.kind`: `"direct"`（私信）或 `"group"`（群聊）
- `match.peer.id`: 用户 ID 或群号

---

## 配置参考

完整配置：[网关配置](/gateway/configuration)

| Setting                                    | Description                                       | Default                                |
| ------------------------------------------ | ------------------------------------------------- | -------------------------------------- |
| `channels.yuanbao.enabled`                 | 启用/禁用该渠道                                   | `true`                                 |
| `channels.yuanbao.defaultAccount`          | 出站路由使用的默认账号                             | `default`                              |
| `channels.yuanbao.accounts.<id>.appKey`    | App Key（用于签名和票据生成）                      | -                                      |
| `channels.yuanbao.accounts.<id>.appSecret` | App Secret（用于签名）                            | -                                      |
| `channels.yuanbao.accounts.<id>.token`     | 预签名 token（跳过自动票据签名）                   | -                                      |
| `channels.yuanbao.accounts.<id>.name`      | 账号显示名称                                       | -                                      |
| `channels.yuanbao.accounts.<id>.enabled`   | 启用/禁用特定账号                                 | `true`                                 |
| `channels.yuanbao.dm.policy`               | 私信策略                                         | `open`                                 |
| `channels.yuanbao.dm.allowFrom`            | 私信允许名单（用户 ID 列表）                      | -                                      |
| `channels.yuanbao.requireMention`          | 群聊中是否需要 @ 提及                              | `true`                                 |
| `channels.yuanbao.overflowPolicy`          | 长消息处理（`split` 或 `stop`）                   | `split`                                |
| `channels.yuanbao.replyToMode`             | 群聊回复策略（`off`、`first`、`all`）             | `first`                                |
| `channels.yuanbao.outboundQueueStrategy`   | 出站策略（`merge-text` 或 `immediate`）           | `merge-text`                           |
| `channels.yuanbao.minChars`                | merge-text：触发发送的最小字符数                  | `2800`                                 |
| `channels.yuanbao.maxChars`                | merge-text：每条消息最大字符数                    | `3000`                                 |
| `channels.yuanbao.idleMs`                  | merge-text：自动刷新前的空闲超时（毫秒）          | `5000`                                 |
| `channels.yuanbao.mediaMaxMb`              | 媒体大小限制（MB）                                | `20`                                   |
| `channels.yuanbao.historyLimit`            | 群聊历史上下文条目数                              | `100`                                  |
| `channels.yuanbao.disableBlockStreaming`   | 禁用块级流式输出                                  | `false`                                |
| `channels.yuanbao.fallbackReply`           | AI 无内容返回时的回退回复                         | `暂时无法解答，你可以换个问题问问我哦` |
| `channels.yuanbao.markdownHintEnabled`     | 注入 markdown 防包裹指令                          | `true`                                 |
| `channels.yuanbao.debugBotIds`             | 调试白名单机器人 ID（未清洗日志）                 | `[]`                                   |

---

## 支持的消息类型

### 接收

- ✅ 文本
- ✅ 图片
- ✅ 文件
- ✅ 音频 / 语音
- ✅ 视频
- ✅ 表情包 / 自定义 emoji
- ✅ 自定义元素（链接卡片等）

### 发送

- ✅ 文本（支持 markdown）
- ✅ 图片
- ✅ 文件
- ✅ 音频
- ✅ 视频
- ✅ 表情包

### 线程和回复

- ✅ 引用回复（可通过 `replyToMode` 配置）
- ❌ 线程回复（平台不支持）

---

## 相关内容

- [Channels Overview](/channels) - 所有受支持的渠道
- [Pairing](/channels/pairing) - 私信认证和配对流程
- [Groups](/channels/groups) - 群聊行为和提及门控
- [Channel Routing](/channels/channel-routing) - 消息会话路由
- [Security](/gateway/security) - 访问模型和加固
