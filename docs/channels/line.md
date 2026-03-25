---
summary: "LINE Messaging API 插件设置、配置与使用"
read_when:
  - 您想将 OpenClaw 连接到 LINE
  - 您需要设置 LINE webhook 和凭证
  - 您想了解 LINE 特定的消息选项
title: LINE
---

# LINE（插件）

LINE 通过 LINE Messaging API 连接到 OpenClaw。该插件作为网关上的 webhook 接收器运行，并使用您的渠道访问令牌和渠道密钥进行身份验证。

状态：通过插件支持。支持私聊、群聊、多媒体、位置、Flex 消息、模板消息和快速回复。不支持反应和线程。

## 插件需求

安装 LINE 插件：

```bash
openclaw plugins install @openclaw/line
```

本地检出（从 git 仓库运行时）：

```bash
openclaw plugins install ./extensions/line
```

## 设置

1. 创建一个 LINE 开发者账户并打开控制台：
   [https://developers.line.biz/console/](https://developers.line.biz/console/)
2. 创建（或选择）一个提供者并添加 **Messaging API** 频道。
3. 从频道设置中复制 **渠道访问令牌** 和 **渠道密钥**。
4. 在 Messaging API 设置中启用 **使用 webhook**。
5. 将 webhook URL 设置为您的网关端点（必须是 HTTPS）：

```
https://gateway-host/line/webhook
```

网关响应 LINE 的 webhook 验证（GET）和入站事件（POST）。
如果需要自定义路径，请设置 `channels.line.webhookPath` 或
`channels.line.accounts.<id>.webhookPath` 并相应更新 URL。

安全提示：

- LINE signature verification is body-dependent (HMAC over the raw body), so OpenClaw applies strict pre-auth body limits and timeout before verification.
- OpenClaw processes webhook events from the verified raw request bytes. Upstream middleware-transformed `req.body` values are ignored for signature-integrity safety.

## 配置

最小配置示例：

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

环境变量（仅适用于默认账户）：

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

多账户配置：

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

私聊默认使用配对模式。未知发送者会收到配对码，消息会被忽略，直到获得批准。

```bash
openclaw pairing list line
openclaw pairing approve line <CODE>
```

允许列表和策略：

- `channels.line.dmPolicy`：`pairing | allowlist | open | disabled`
- `channels.line.allowFrom`：允许发送私聊消息的 LINE 用户 ID 列表
- `channels.line.groupPolicy`：`allowlist | open | disabled`
- `channels.line.groupAllowFrom`：允许群组成员的 LINE 用户 ID 列表
- 单群组覆盖：`channels.line.groups.<groupId>.allowFrom`
- 运行时提示：如果完全缺少 `channels.line` 配置，运行时会将群组策略默认为 `groupPolicy="allowlist"`（即使设置了 `channels.defaults.groupPolicy`）。

LINE ID 区分大小写。有效 ID 形式为：

- 用户：`U` + 32 个十六进制字符
- 群组：`C` + 32 个十六进制字符
- 聊天室：`R` + 32 个十六进制字符

## 消息行为

- 文本超出 5000 字符会拆分成多个块。
- Markdown 格式会被移除；代码块和表格会尽可能转换为 Flex 卡片。
- 流式响应会被缓冲；LINE 会接收完整块并显示加载动画，直至代理处理完成。
- 多媒体下载受 `channels.line.mediaMaxMb` 限制（默认 10MB）。

## 渠道数据（富消息）

使用 `channelData.line` 发送快速回复、位置、Flex 卡片或模板消息。

```json5
{
  text: "请查收",
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
          /* Flex 消息内容 */
        },
      },
      templateMessage: {
        type: "confirm",
        text: "是否继续？",
        confirmLabel: "是",
        confirmData: "yes",
        cancelLabel: "否",
        cancelData: "no",
      },
    },
  },
}
```

LINE 插件还附带 `/card` 命令，用于 Flex 消息预设：

```
/card info "欢迎" "感谢加入！"
```

## 故障排查

- **Webhook 验证失败：** 确保 webhook URL 是 HTTPS，并且 `channelSecret` 与 LINE 控制台匹配。
- **无入站事件：** 确认 webhook 路径与 `channels.line.webhookPath` 一致，且网关可从 LINE 访问。
- **多媒体下载错误：** 若多媒体超出默认限制，请提高 `channels.line.mediaMaxMb`。
