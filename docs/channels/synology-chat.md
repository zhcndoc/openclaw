---
summary: "Synology Chat webhook 设置与 OpenClaw 配置"
read_when:
  - 使用 OpenClaw 设置 Synology Chat
  - 调试 Synology Chat webhook 路由
title: "Synology Chat"
---

Synology Chat 通过一对 webhook 与 OpenClaw 连接：Synology Chat 的 outgoing webhook 将传入的直接消息发送到 Gateway，而回复则通过 Synology Chat 的 incoming webhook 返回。

状态：官方插件，需单独安装。仅支持直接消息；支持文本和基于 URL 的文件发送。

## 安装

```bash
openclaw plugins install @openclaw/synology-chat
```

本地检出（当从 git 仓库运行时）：

```bash
openclaw plugins install ./path/to/local/synology-chat-plugin
```

详情：[插件](/tools/plugin)。

## 快速设置

1. 安装插件（上方）。
2. 在 Synology Chat 集成中：
   - 创建一个入站 webhook 并复制其 URL。
   - 使用你的密钥令牌创建一个出站 webhook。
3. 将出站 webhook URL 指向你的 OpenClaw Gateway：
   - 默认是 `https://gateway-host/webhook/synology`。
   - 或者使用你自定义的 `channels.synology-chat.webhookPath`。
4. 在 OpenClaw 中完成设置。Synology Chat 在两种流程中都会出现在相同的频道设置列表里：
   - 引导式：`openclaw onboard` 或 `openclaw channels add`
   - 直接：`openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
5. 重启 Gateway，然后向 Synology Chat 机器人发送一条私信。

Webhook 认证详情：

- OpenClaw 先从 `body.token` 接收 outgoing webhook token，然后是
  `?token=...`，最后才是 headers。
- 可接受的 header 形式：
  - `x-synology-token`
  - `x-webhook-token`
  - `x-openclaw-token`
  - `Authorization: Bearer <token>`
- 空 token 或缺失 token 会直接拒绝。
- Payload 可以是 `application/x-www-form-urlencoded` 或 `application/json`；`token`、`user_id` 和 `text` 是必需的。

## 入站持久性

在令牌、发送者策略和速率限制检查通过后，OpenClaw 会从存储的信封中移除 webhook 令牌，并在确认接收之前持久化地将事件加入队列。只有在追加操作成功后，该路由才会返回 `204`；持久化失败时返回 `503`，以便 Synology Chat 可以重试，而不是静默丢失消息。持久化的 `204` 响应会携带 `x-openclaw-delivery-accepted: durable`；身份验证、验证和存储错误响应会省略该标记，因此反向代理可以要求此标记，以区分持久化接受和一般响应。

待处理或可重试的事件在 Gateway 重启后仍会保留。Synology 稳定的 `post_id` 会在对应的活动或保留完成记录存在时，抑制重复的队列条目。跨越队列到 agent 交接的投递仍然是至少一次，因此该边界处的崩溃仍可能重放一次 turn。

最小配置：

```json5
{
  channels: {
    "synology-chat": {
      enabled: true,
      token: "synology-outgoing-token",
      incomingUrl: "https://nas.example.com/webapi/entry.cgi?api=SYNO.Chat.External&method=incoming&version=2&token=...",
      webhookPath: "/webhook/synology",
      dmPolicy: "allowlist",
      allowedUserIds: ["123456"],
      rateLimitPerMinute: 30,
      allowInsecureSsl: false,
    },
  },
}
```

## 环境变量

对于默认账户，你可以使用环境变量：

- `SYNOLOGY_CHAT_TOKEN`
- `SYNOLOGY_CHAT_INCOMING_URL`
- `SYNOLOGY_NAS_HOST`
- `SYNOLOGY_ALLOWED_USER_IDS`（逗号分隔）
- `SYNOLOGY_RATE_LIMIT`
- `OPENCLAW_BOT_NAME`

配置值会覆盖环境变量。

`SYNOLOGY_CHAT_INCOMING_URL` 和 `SYNOLOGY_NAS_HOST` 不能从工作区的 `.env` 中设置；请参见 [工作区 `.env` 文件](/gateway/security#workspace-env-files)。

## DM 策略与访问控制

- 支持的 `dmPolicy` 值：`allowlist`（默认）、`open` 和 `disabled`。Synology Chat 没有配对流程；通过将其数字化的 Synology 用户 ID 添加到 `allowedUserIds` 来批准发送者。
- `allowedUserIds` 接受一个 Synology 用户 ID 的列表（或以逗号分隔的字符串）。
- 在 `allowlist` 模式下，空的 `allowedUserIds` 列表会被视为配置错误，webhook 路由不会启动。
- `dmPolicy: "open"` 仅在 `allowedUserIds` 包含 `"*"` 时允许公共 DM；如果包含限制性条目，则只有匹配的用户可以聊天。`allowedUserIds` 为空时，`open` 也会拒绝启动该路由。
- `dmPolicy: "disabled"` 会阻止 DM。
- 默认情况下，回复收件人绑定保持在稳定的数字 `user_id` 上。`channels.synology-chat.dangerouslyAllowNameMatching: true` 是一种紧急兼容模式，会重新启用可变的用户名/昵称查找以用于回复投递。

## 发出消息投递

使用数字 Synology Chat 用户 ID 作为目标。接受 `synology-chat:`、`synology_chat:` 和 `synology:` 前缀。

示例：

```bash
openclaw message send --channel synology-chat --target 123456 --message "Hello from OpenClaw"
openclaw message send --channel synology-chat --target synology-chat:123456 --message "Hello again"
openclaw message send --channel synology-chat --target synology:123456 --message "Short prefix"
```

外发文本会按 2000 个字符分块。媒体发送支持基于 URL 的文件投递：NAS 会下载并附加该文件（最大 32 MB）。外发文件 URL 必须使用 `http` 或 `https`，而且在 OpenClaw 将 URL 转发到 NAS webhook 之前，会先拒绝私有或其他被阻止的网络目标。

## 多账户

在 `channels.synology-chat.accounts` 下支持多个 Synology Chat 账户。  
每个账户都可以覆盖 token、incoming URL、webhook path、DM 策略和限制。  
直接消息会话在每个账户和用户之间相互隔离，因此两个不同 Synology 账户上的相同数字 `user_id`  
不会共享对话状态。  
请为每个启用的账户指定不同的 `webhookPath`。OpenClaw 会拒绝重复的完全相同路径，  
并且会拒绝启动那些在多账户配置中仅继承共享 webhook path 的命名账户。  
如果你确实需要为某个命名账户使用旧式继承，请在该账户或 `channels.synology-chat` 上设置  
`dangerouslyAllowInheritedWebhookPath: true`，但重复的完全相同路径仍会被 fail-closed 拒绝。建议为每个账户显式配置路径。

```json5
{
  channels: {
    "synology-chat": {
      enabled: true,
      accounts: {
        default: {
          token: "token-a",
          incomingUrl: "https://nas-a.example.com/...token=...",
        },
        alerts: {
          token: "token-b",
          incomingUrl: "https://nas-b.example.com/...token=...",
          webhookPath: "/webhook/synology-alerts",
          dmPolicy: "allowlist",
          allowedUserIds: ["987654"],
        },
      },
    },
  },
}
```

## 安全说明

- 保持 `token` 机密，如果泄露则立即轮换。
- 除非你明确信任自签名的本地 NAS 证书，否则请保持 `allowInsecureSsl: false`。
- 入站 webhook 请求会进行 token 验证，并按发送方进行限流（`rateLimitPerMinute`，默认 30）。
- 无效 token 检查使用恒定时间的密钥比较并在失败时关闭；重复的无效 token 尝试会暂时锁定源 IP。
- 入站消息文本会针对已知的提示注入模式进行清理，并在 4000 个字符处截断。
- 生产环境优先使用 `dmPolicy: "allowlist"`。
- 除非你明确需要基于旧版用户名的回复投递，否则请关闭 `dangerouslyAllowNameMatching`。
- 除非你明确接受多账户设置中的共享路径路由风险，否则请关闭 `dangerouslyAllowInheritedWebhookPath`。

## 故障排查

- `Missing required fields (token, user_id, text)`：
  - outgoing webhook 载荷缺少所需字段之一
  - 如果 Synology 将 token 放在 headers 中，请确保 gateway/proxy 会保留这些 headers
- `Invalid token`：
  - outgoing webhook secret 与 `channels.synology-chat.token` 不匹配
  - 请求命中了错误的账户/webhook path
  - 反向代理在请求到达 OpenClaw 之前剥离了 token header
- `Rate limit exceeded`：
  - 来自同一来源的无效 token 尝试过多，可能会暂时将该来源锁定
  - 已认证发送者也有单独的按用户消息速率限制
- `Allowlist is empty. Configure allowedUserIds or use dmPolicy=open with allowedUserIds=["*"].`：
  - 已启用 `dmPolicy="allowlist"`，但未配置任何用户
- `User not authorized`：
  - 发送者的数字 `user_id` 不在 `allowedUserIds` 中

## 相关内容

- [频道概览](/channels) — 所有支持的频道
- [群组](/channels/groups) — 群聊行为和提及门控
- [频道路由](/channels/channel-routing) — 消息的会话路由
- [安全性](/gateway/security) — 访问模型和加固
