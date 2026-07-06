---
summary: "LINE Messaging API 插件的设置、配置和使用"
read_when:
  - 你想将 OpenClaw 连接到 LINE
  - 你需要 LINE webhook + 凭证设置
  - 你想使用 LINE 特定的消息选项
title: LINE
---

LINE 通过 LINE Messaging API 连接到 OpenClaw。该插件作为 webhook
接收器运行在 Gateway 上，并使用你的 channel access token + channel secret 进行
身份验证。

状态：官方插件，需单独安装。支持直接消息、群聊、媒体、
位置、Flex 消息、模板消息和快速回复。不支持反应和线程。

## 安装

安装 LINE 之前：

```bash
openclaw plugins install @openclaw/line
```

本地检出（当从 git 仓库运行时）：

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

```text
https://gateway-host/line/webhook
```

网关会立即响应 LINE 的 webhook 验证（GET）并确认已签名的入站事件（POST），前提是签名和负载验证通过；agent 处理会异步继续进行。
如果你需要自定义路径，请设置 `channels.line.webhookPath` 或
`channels.line.accounts.<id>.webhookPath`，并相应更新 URL。

安全说明：

- LINE 的签名验证依赖于请求体（对原始 body 进行 HMAC），因此 OpenClaw 在验证前会施加严格的预认证 body 限制（64 KB）和读取超时。
- OpenClaw 从已验证的原始请求字节中处理 webhook 事件。为确保签名完整性，上游中间件转换后的 `req.body` 值将被忽略。

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

公共 DM 配置：

```json5
{
  channels: {
    line: {
      enabled: true,
      channelAccessToken: "LINE_CHANNEL_ACCESS_TOKEN",
      channelSecret: "LINE_CHANNEL_SECRET",
      dmPolicy: "open",
      allowFrom: ["*"],
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

`tokenFile` 和 `secretFile` 必须指向普通文件。符号链接会被拒绝。
内联配置值优先于文件；环境变量是默认账户的最后回退选项。

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

直接消息默认采用配对模式。未知发送者会获得配对码，并且其
消息会被忽略，直到获得批准：

```bash
openclaw pairing list line
openclaw pairing approve line <CODE>
```

允许列表和策略：

- `channels.line.dmPolicy`: `pairing | allowlist | open | disabled`（默认 `pairing`）
- `channels.line.allowFrom`: 用于直接消息的已加入允许列表的 LINE 用户 ID；`dmPolicy: "open"` 需要 `["*"]`
- `channels.line.groupPolicy`: `allowlist | open | disabled`（默认 `allowlist`）
- `channels.line.groupAllowFrom`: 用于群组的已加入允许列表的 LINE 用户 ID
- 每个群组的覆盖配置：`channels.line.groups.<groupId>.allowFrom`（以及 `enabled`、`requireMention`、`systemPrompt`、`skills`）
- 静态发送者访问组可以通过 `allowFrom`、`groupAllowFrom` 以及每个群组的 `allowFrom` 中的 `accessGroup:<name>` 引用；参见 [访问组](/channels/access-groups)。
- 运行时说明：如果 `channels.line` 完全缺失，运行时会在群组检查中回退到 `groupPolicy="allowlist"`（即使设置了 `channels.defaults.groupPolicy`）。

LINE ID 区分大小写。有效 ID 形式如下：

- 用户：`U` + 32 个十六进制字符
- 群组：`C` + 32 个十六进制字符
- 房间：`R` + 32 个十六进制字符

## 消息行为

- 文本按 5000 个字符分块。
- Markdown 格式会被去除；代码块和表格会在可能时转换为 Flex
  卡片。
- 流式响应会被缓冲；LINE 会在代理工作时接收完整分块并显示加载
  动画。
- 媒体下载受 `channels.line.mediaMaxMb` 限制（默认 10）。
- 入站媒体在传递给代理之前会先保存到 `~/.openclaw/media/inbound/`，
  与其他渠道插件使用的共享媒体存储保持一致。

## Channel data（富媒体消息）

使用 `channelData.line` 发送快速回复、位置、Flex 卡片或模板消息。

```json5
{
  text: "这里给你",
  channelData: {
    line: {
      quickReplies: ["状态", "帮助"],
      location: {
        title: "办公室",
        address: "123 Main St",
        latitude: 35.681236,
        longitude: 139.767125,
      },
      flexMessage: {
        altText: "状态卡片",
        contents: {
          /* Flex 载荷 */
        },
      },
      templateMessage: {
        type: "confirm",
        text: "继续？",
        confirmLabel: "是",
        confirmData: "yes",
        cancelLabel: "否",
        cancelData: "no",
      },
    },
  },
}
```

LINE 插件还提供了一个用于 Flex 消息预设的 `/card` 命令：

```text
/card info "欢迎" "感谢你的加入！"
```

## ACP 支持

LINE 支持 ACP（Agent Communication Protocol）会话绑定：

- `/acp spawn <agent> --bind here` 会将当前 LINE 聊天绑定到一个 ACP 会话，而不会创建子线程。
- 已配置的 ACP 绑定和活动的会话绑定 ACP 会话在 LINE 上的工作方式与其他会话频道相同。

详情请参见 [ACP 代理](/tools/acp-agents)。

## 出站媒体

LINE 插件通过代理消息工具发送图片、视频和音频：

- **图片**：作为 LINE 图片消息发送；预览图片默认使用媒体 URL。
- **视频**：需要预览图片；将 `channelData.line.previewImageUrl` 设置为图片 URL。
- **音频**：作为 LINE 音频消息发送；时长默认是 60 秒，除非设置了 `channelData.line.durationMs`。

媒体类型在设置了 `channelData.line.mediaKind` 时取该值，否则会从其他 LINE 选项或 URL 文件后缀推断，
并以图片作为兜底。

出站媒体 URL 必须是公开的 HTTPS URL，且长度最多 2000 个字符。OpenClaw
在将 URL 交给 LINE 之前会验证目标主机名，并拒绝回环、链路本地和私有网络目标。

不包含 LINE 特定选项的通用媒体发送会使用图片路径。

## 故障排查

- **Webhook 验证失败：** 确保 webhook URL 使用 HTTPS，并且
  `channelSecret` 与 LINE 控制台一致。
- **没有入站事件：** 确认 webhook 路径与 `channels.line.webhookPath`
  匹配，并且网关可从 LINE 访问。
- **媒体下载错误：** 如果媒体超过默认限制，请提高 `channels.line.mediaMaxMb`。

## 相关内容

- [频道概览](/channels) — 所有受支持的频道
- [配对](/channels/pairing) — 私信认证与配对流程
- [群组](/channels/groups) — 群聊行为与提及门控
- [频道路由](/channels/channel-routing) — 消息会话路由
- [安全](/gateway/security) — 访问模型与加固
