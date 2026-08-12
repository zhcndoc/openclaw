---
summary: "Yuanbao 机器人概览、功能与配置"
read_when:
  - 你想连接一个 Yuanbao 机器人
  - 你正在配置 Yuanbao 渠道
title: Yuanbao
---

Tencent Yuanbao 是腾讯的 AI 助手平台。社区维护的 `openclaw-plugin-yuanbao` 插件通过 WebSocket 将 Yuanbao 机器人连接到 OpenClaw，以支持私聊和群聊。

**状态：** 已可用于机器人私聊和群聊的生产环境。WebSocket 是唯一受支持的连接模式。此插件由腾讯 Yuanbao 团队作为外部目录条目维护，而非由 OpenClaw 核心维护；下面的配置/行为细节（除安装和通用 CLI 接口外）来自插件自身文档，未经过 OpenClaw 核心源码验证。

## 快速开始

需要 OpenClaw 2026.4.10 或更高版本。使用 `openclaw --version` 检查；使用 `openclaw update` 升级。

<Steps>
  <Step title="使用你的凭据添加 Yuanbao 渠道">
  ```bash
  openclaw channels add --channel yuanbao --token "appKey:appSecret"
  ```
  `--token` 使用以冒号分隔的 `appKey:appSecret`。通过在应用设置中创建机器人，从 Yuanbao 应用获取这些信息。
  </Step>

  <Step title="重启网关以应用更改">
  ```bash
  openclaw gateway restart
  ```
  </Step>
</Steps>

### 交互式设置（可选）

```bash
openclaw channels login --channel yuanbao
```

按照提示输入你的 App ID 和 App Secret。

## 访问控制

### 私信

`channels.yuanbao.dm.policy`：

| Value            | 行为                                              |
| ---------------- | ------------------------------------------------- |
| `open` (default) | 允许所有用户                                      |
| `pairing`        | 未知用户会获得一个配对码；通过 CLI 审批           |
| `allowlist`      | 只有 `allowFrom` 中的用户可以聊天                 |
| `disabled`       | 禁用所有私信                                      |

批准配对请求：

```bash
openclaw pairing list yuanbao
openclaw pairing approve yuanbao <CODE>
```

### 群聊

`channels.yuanbao.requireMention`（默认 `true`）：在群聊中，机器人响应前需要先 @提及。回复机器人自己的消息会被视为隐式提及。

## 配置示例

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

在群组中禁用 @提及 要求：

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
      minChars: 2800, // 缓冲直到达到这么多字符
      maxChars: 3000, // 超过此限制时强制拆分
      idleMs: 5000, // 空闲超时后自动刷新（毫秒）
    },
  },
}
```

将 `outboundQueueStrategy: "immediate"` 设置为不缓冲、直接发送每个分块。

## 常用命令

| 命令       | 描述                     |
| ---------- | ------------------------ |
| `/help`    | 显示可用命令             |
| `/status`  | 显示机器人状态           |
| `/new`     | 开始新会话               |
| `/stop`    | 停止当前运行             |
| `/restart` | 重启 OpenClaw            |
| `/compact` | 压缩会话上下文           |

Yuanbao 支持原生斜杠菜单；当网关启动时，命令会自动同步到平台。

## 故障排查

**机器人在群聊中没有响应：**

1. 确认机器人已被添加到群组
2. 确认你已 @ 提及机器人（默认需要）
3. 检查日志：`openclaw logs --follow`

**机器人没有收到消息：**

1. 确认机器人已在 Yuanbao 应用中创建并通过审核
2. 确认 `appKey` 和 `appSecret` 已正确配置
3. 确认网关正在运行：`openclaw gateway status`
4. 检查日志：`openclaw logs --follow`

**机器人发送空回复或回退回复：**

1. 检查 AI 模型是否返回了有效内容
2. 默认回退回复：“暂时无法解答，你可以换个问题问问我哦”
3. 通过 `channels.yuanbao.fallbackReply` 自定义

**App Secret 泄露：**

1. 在 Yuanbao 应用中重置 App Secret
2. 更新配置中的值
3. 重启网关：`openclaw gateway restart`

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
          name: "主机器人",
        },
        backup: {
          appKey: "key_yyy",
          appSecret: "secret_yyy",
          name: "备用机器人",
          enabled: false,
        },
      },
    },
  },
}
```

`defaultAccount` 控制当出站 API 未指定 `accountId` 时使用哪个账号。

### 消息限制

- `maxChars`：单条消息最大字符数（默认 `3000`）
- `mediaMaxMb`：媒体上传／下载限制（默认 `20` MB）
- `overflowPolicy`：当消息超过限制时的处理方式，`"split"`（默认）或 `"stop"`

### 流式输出

元宝支持块级流式输出；机器人在生成文本时会分块发送。

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

```json5
{
  channels: {
    yuanbao: {
      historyLimit: 100, // 默认：100，设为 0 可禁用
    },
  },
}
```

控制在群聊中包含到 AI 上下文里的历史消息数量。

### 回复模式

```json5
{
  channels: {
    yuanbao: {
      replyToMode: "first", // "off" | "first" | "all"（默认："first"）
    },
  },
}
```

| 值      | 行为                                                     |
| ------- | -------------------------------------------------------- |
| `off`   | 不进行引用回复                                           |
| `first` | 每条传入消息仅引用第一条回复（默认）                     |
| `all`   | 引用每一条回复                                           |

### Markdown 提示注入

默认情况下，机器人会注入一条系统提示指令，以防止模型将整段回复包裹在 Markdown 代码块中。

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

```json5
{
  channels: {
    yuanbao: {
      debugBotIds: ["bot_user_id_1", "bot_user_id_2"],
    },
  },
}
```

为列表中的 bot ID 启用未净化的日志输出。

### 多智能体路由

使用 `bindings` 将元宝私信或群聊路由到不同的智能体：

```json5
{
  agents: {
    entries: {
      main: { default: true },
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
  ],
}
```

- `match.channel`：`"yuanbao"`
- `match.peer.kind`：`"direct"`（私信）或 `"group"`（群聊）
- `match.peer.id`：用户 ID 或群号。

## 配置参考

完整配置：[网关配置](/gateway/configuration)

| 设置                                       | 描述                                             | 默认值                                 |
| ------------------------------------------ | ------------------------------------------------ | -------------------------------------- |
| `channels.yuanbao.enabled`                 | 启用/禁用该频道                                  | `true`                                 |
| `channels.yuanbao.defaultAccount`          | 出站路由的默认账号                               | `default`                              |
| `channels.yuanbao.accounts.<id>.appKey`    | App Key（签名 + ticket 生成）                   | -                                      |
| `channels.yuanbao.accounts.<id>.appSecret` | App Secret（签名）                              | -                                      |
| `channels.yuanbao.accounts.<id>.token`     | 预签名 token（跳过自动 ticket 签名）             | -                                      |
| `channels.yuanbao.accounts.<id>.name`      | 账号显示名称                                     | -                                      |
| `channels.yuanbao.accounts.<id>.enabled`   | 启用/禁用特定账号                                | `true`                                 |
| `channels.yuanbao.dm.policy`               | 私聊策略                                         | `open`                                 |
| `channels.yuanbao.dm.allowFrom`            | 私聊白名单（用户 ID 列表）                       | -                                      |
| `channels.yuanbao.requireMention`          | 群组中是否需要 @ 提及                            | `true`                                 |
| `channels.yuanbao.overflowPolicy`          | 长消息处理（`split` 或 `stop`）                  | `split`                                |
| `channels.yuanbao.replyToMode`             | 群聊 reply-to 策略（`off`、`first`、`all`）      | `first`                                |
| `channels.yuanbao.outboundQueueStrategy`   | 出站策略（`merge-text` 或 `immediate`）          | `merge-text`                           |
| `channels.yuanbao.minChars`                | merge-text：触发发送的最少字符数                | `2800`                                 |
| `channels.yuanbao.maxChars`                | merge-text：每条消息的最大字符数                | `3000`                                 |
| `channels.yuanbao.idleMs`                  | merge-text：自动刷新前的空闲超时时间（毫秒）    | `5000`                                 |
| `channels.yuanbao.mediaMaxMb`              | 媒体大小限制（MB）                               | `20`                                   |
| `channels.yuanbao.historyLimit`            | 群聊历史上下文条目数                             | `100`                                  |
| `channels.yuanbao.disableBlockStreaming`   | 禁用块级流式输出                                 | `false`                                |
| `channels.yuanbao.fallbackReply`           | 模型未返回内容时的兜底回复                       | `暂时无法解答，你可以换个问题问问我哦` |
| `channels.yuanbao.markdownHintEnabled`     | 注入 markdown 防换行折叠指令                     | `true`                                 |
| `channels.yuanbao.debugBotIds`             | 调试白名单 bot IDs（未净化日志）                 | `[]`                                   |

## 支持的消息类型

**接收：**文本、图片、文件、音频／语音、视频、贴纸／自定义表情、自定义元素（链接卡片）。

**发送：**文本（markdown）、图片、文件、音频、视频、贴纸。

**线程和回复：**引用回复（可通过 `replyToMode` 配置）；平台不支持线程回复。

## 相关内容

- [渠道概览](/channels) - 所有受支持的渠道
- [配对](/channels/pairing) - 私信认证和配对流程
- [群组](/channels/groups) - 群聊行为和提及门控
- [渠道路由](/channels/channel-routing) - 消息会话路由
- [安全](/gateway/security) - 访问模型和加固。
