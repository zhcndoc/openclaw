---
summary: "LINE Messaging API 插件的设置、配置和使用"
read_when:
  - 你想将 OpenClaw 连接到 LINE
  - 你需要 LINE webhook + 凭证设置
  - 你想使用 LINE 特定的消息选项
title: LINE
---

LINE 通过 LINE Messaging API 连接到 OpenClaw。该插件在网关上作为 webhook
接收器运行，并使用你的 channel access token + channel secret 进行
身份验证。

状态：内置插件。支持私信、群聊、媒体、位置、Flex 消息、模板消息和快速回复。不支持
反应和线程。

## 内置插件

LINE 在当前 OpenClaw 版本中作为内置插件提供，因此常规
打包构建无需单独安装。

如果你使用的是较旧的构建版本，或者自定义安装中排除了 LINE，请在
发布了当前 npm 包后进行安装：

```bash
openclaw plugins install @openclaw/line
```

如果 npm 报告 OpenClaw 维护的包已弃用或缺失，请使用当前
打包版 OpenClaw 构建，或者先使用本地检出版本，直到 npm 包发布节奏
跟上为止。

本地检出（从 git 仓库运行时）：

```bash
openclaw plugins install ./path/to/local/line-plugin
```

## 设置

1. 创建一个 LINE Developers 账户并打开控制台：
   [https://developers.line.biz/console/](https://developers.line.biz/console/)
2. 创建（或选择）一个 Provider，并添加一个 **Messaging API** channel。
3. 从 channel 设置中复制 **Channel access token** 和 **Channel secret**。
4. 在 Messaging API 设置中启用 **Use webhook**。
5. 将 webhook URL 设置为你的网关端点（需要 HTTPS）：

```
https://gateway-host/line/webhook
```

网关会响应 LINE 的 webhook 验证（GET）和入站事件（POST）。
如果你需要自定义路径，请设置 `channels.line.webhookPath` 或
`channels.line.accounts.<id>.webhookPath`，并相应更新 URL。

安全提示：

- LINE 的签名验证依赖请求体（对原始 body 做 HMAC），因此 OpenClaw 在验证前会强制执行严格的预认证 body 限制和超时。
- OpenClaw 处理来自已验证原始请求字节的 webhook 事件。为保证签名完整性，来自上游中间件转换后的 `req.body` 值会被忽略。

## 配置

最小配置：

```json5
{
  channels: {
    line: {
      enabled: true,
      channelAccessToken: "LINE_CHANNEL_ACCESS_TOKEN",
      channelSecret: "LINE_CHANNEL_SECRET",
      dmPolicy: "pairing",
    },
  },
}
```

环境变量（仅默认账户）：

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`

令牌/密钥文件：

```json5
{
  channels: {
    line: {
      tokenFile: "/path/to/line-token.txt",
      secretFile: "/path/to/line-secret.txt",
    },
  },
}
```

`tokenFile` 和 `secretFile` 必须指向普通文件。不接受符号链接。

多个账户：

```json5
{
  channels: {
    line: {
      accounts: {
        marketing: {
          channelAccessToken: "...",
          channelSecret: "...",
          webhookPath: "/line/marketing",
        },
      },
    },
  },
}
```

## 访问控制

私信默认使用配对。未知发送者会获得一个配对码，并且其
消息会在批准前被忽略。

```bash
openclaw pairing list line
openclaw pairing approve line <CODE>
```

允许列表和策略：

- `channels.line.dmPolicy`: `pairing | allowlist | open | disabled`
- `channels.line.allowFrom`: 用于私信的 LINE 用户 ID 允许列表
- `channels.line.groupPolicy`: `allowlist | open | disabled`
- `channels.line.groupAllowFrom`: 用于群组的 LINE 用户 ID 允许列表
- 按群组覆盖：`channels.line.groups.<groupId>.allowFrom`
- 运行时说明：如果 `channels.line` 完全缺失，运行时会在群组检查中回退到 `groupPolicy="allowlist"`（即使设置了 `channels.defaults.groupPolicy` 也是如此）。

LINE ID 区分大小写。有效 ID 形式如下：

- 用户：`U` + 32 个十六进制字符
- 群组：`C` + 32 个十六进制字符
- 房间：`R` + 32 个十六进制字符

## 消息行为

- 文本会按每 5000 个字符分块。
- Markdown 格式会被移除；代码块和表格会在可能时转换为 Flex
  卡片。
- 流式响应会被缓冲；LINE 会在 agent 工作时接收带加载
  动画的完整分块。
- 媒体下载上限由 `channels.line.mediaMaxMb` 控制（默认 10）。
- 入站媒体会在传递给 agent 之前保存到 `~/.openclaw/media/inbound/`，
  与其他内置频道插件使用的共享媒体存储保持一致。

## Channel data（富媒体消息）

使用 `channelData.line` 发送快速回复、位置、Flex 卡片或模板
消息。

```json5
{
  text: "Here you go",
  channelData: {
    line: {
      quickReplies: ["Status", "Help"],
      location: {
        title: "Office",
        address: "123 Main St",
        latitude: 35.681236,
        longitude: 139.767125,
      },
      flexMessage: {
        altText: "Status card",
        contents: {
          /* Flex payload */
        },
      },
      templateMessage: {
        type: "confirm",
        text: "Proceed?",
        confirmLabel: "Yes",
        confirmData: "yes",
        cancelLabel: "No",
        cancelData: "no",
      },
    },
  },
}
```

LINE 插件还提供了一个用于 Flex 消息预设的 `/card` 命令：

```
/card info "Welcome" "Thanks for joining!"
```

## ACP 支持

LINE 支持 ACP（Agent Communication Protocol）会话绑定：

- `/acp spawn <agent> --bind here` 会将当前 LINE 聊天绑定到一个 ACP 会话，而不会创建子线程。
- 已配置的 ACP 绑定和活动的会话绑定 ACP 会话在 LINE 上的工作方式与其他会话频道相同。

详情请参见 [ACP agents](/tools/acp-agents)。

## 出站媒体

LINE 插件支持通过 agent 消息工具发送图片、视频和音频文件。媒体会通过 LINE 特定的传递路径发送，并带有相应的预览和跟踪处理：

- **图片**：作为 LINE 图片消息发送，并自动生成预览。
- **视频**：带有显式预览和内容类型处理。
- **音频**：作为 LINE 音频消息发送。

出站媒体 URL 必须是可公开访问的 HTTPS URL。OpenClaw 会在将 URL 交给 LINE 之前验证目标主机名，并拒绝回环、链路本地和私有网络目标。

当不存在 LINE 特定路径时，通用媒体发送会回退到现有的仅图片路由。

## 故障排查

- **Webhook 验证失败：** 确保 webhook URL 使用 HTTPS，并且
  `channelSecret` 与 LINE 控制台一致。
- **没有入站事件：** 确认 webhook 路径与 `channels.line.webhookPath`
  匹配，并且网关可从 LINE 访问。
- **媒体下载错误：** 如果媒体超过默认限制，请提高 `channels.line.mediaMaxMb`。

## 相关内容

- [Channels Overview](/channels) — 所有受支持的频道
- [Pairing](/channels/pairing) — 私信认证与配对流程
- [Groups](/channels/groups) — 群聊行为与提及门控
- [Channel Routing](/channels/channel-routing) — 消息会话路由
- [Security](/gateway/security) — 访问模型与加固
