---
summary: "Synology Chat webhook 设置与 OpenClaw 配置"
read_when:
  - 使用 OpenClaw 设置 Synology Chat
  - 调试 Synology Chat webhook 路由
title: "Synology Chat"
---

状态：捆绑插件，使用 Synology Chat webhooks 的直接消息通道。
该插件接收来自 Synology Chat outgoing webhooks 的传入消息，并通过 Synology Chat incoming webhook 发送回复。

## 捆绑插件

Synology Chat 已作为捆绑插件包含在当前 OpenClaw 版本中，因此普通的
打包构建不需要单独安装。

如果你使用的是较旧的构建，或者是一个不包含 Synology Chat 的自定义安装，
请手动安装：

从本地检出安装：

```bash
openclaw plugins install ./path/to/local/synology-chat-plugin
```

详情：[Plugins](/tools/plugin)

## 快速设置

1. 确认 Synology Chat 插件可用。
   - 当前打包的 OpenClaw 版本已包含它。
   - 较旧/自定义安装可以使用上面的命令，从源码检出中手动添加。
   - `openclaw onboard` 现在会像 `openclaw channels add` 一样，在同一通道设置列表中显示 Synology Chat。
   - 非交互式设置：`openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
2. 在 Synology Chat 集成中：
   - 创建一个 incoming webhook 并复制其 URL。
   - 使用你的 secret token 创建一个 outgoing webhook。
3. 将 outgoing webhook 的 URL 指向你的 OpenClaw gateway：
   - 默认是 `https://gateway-host/webhook/synology`。
   - 或者使用你自定义的 `channels.synology-chat.webhookPath`。
4. 在 OpenClaw 中完成设置。
   - 引导式：`openclaw onboard`
   - 直接：`openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
5. 重启 gateway，然后向 Synology Chat bot 发送一条 DM。

Webhook 认证详情：

- OpenClaw 先从 `body.token` 接收 outgoing webhook token，然后是
  `?token=...`，最后才是 headers。
- 可接受的 header 形式：
  - `x-synology-token`
  - `x-webhook-token`
  - `x-openclaw-token`
  - `Authorization: Bearer <token>`
- 空 token 或缺失 token 会直接失败关闭。

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

`SYNOLOGY_CHAT_INCOMING_URL` 不能从 workspace 的 `.env` 中设置；请参见 [Workspace `.env` files](/gateway/security)。

## DM 策略与访问控制

- `dmPolicy: "allowlist"` 是推荐的默认值。
- `allowedUserIds` 接受 Synology 用户 ID 列表（或逗号分隔字符串）。
- 在 `allowlist` 模式下，空的 `allowedUserIds` 列表会被视为配置错误，webhook 路由不会启动（如需放行所有用户，请使用 `dmPolicy: "open"` 并设置 `allowedUserIds: ["*"]`）。
- `dmPolicy: "open"` 仅在 `allowedUserIds` 包含 `"*"` 时允许公开 DM；若包含限制性条目，则只有匹配的用户可以聊天。
- `dmPolicy: "disabled"` 会阻止 DM。
- 默认情况下，回复收件人的绑定保持在稳定的数字 `user_id` 上。`channels.synology-chat.dangerouslyAllowNameMatching: true` 是一种破窗兼容模式，会重新启用可变用户名/昵称查找以进行回复投递。
- 配对审批支持：
  - `openclaw pairing list synology-chat`
  - `openclaw pairing approve synology-chat <CODE>`

## 发出消息投递

请使用数字型 Synology Chat user ID 作为目标。

示例：

```bash
openclaw message send --channel synology-chat --target 123456 --text "Hello from OpenClaw"
openclaw message send --channel synology-chat --target synology-chat:123456 --text "Hello again"
```

支持基于 URL 的文件投递来发送媒体。
出站文件 URL 必须使用 `http` 或 `https`，而且私有或其他被阻止的网络目标会在 OpenClaw 将 URL 转发到 NAS webhook 之前被拒绝。

## 多账户

`channels.synology-chat.accounts` 支持多个 Synology Chat 账户。
每个账户都可以覆盖 token、incoming URL、webhook path、DM 策略和限制。
直接消息会话按账户和用户隔离，因此两个不同 Synology 账户上的同一个数字 `user_id`
不会共享对话记录状态。
为每个启用的账户设置不同的 `webhookPath`。OpenClaw 现在会拒绝重复的完全相同路径，
并拒绝启动那些在多账户设置中只继承共享 webhook path 的命名账户。
如果你确实需要为命名账户使用旧版继承，可以在该账户上或在 `channels.synology-chat`
上设置 `dangerouslyAllowInheritedWebhookPath: true`，但重复的完全相同路径仍会被失败关闭地拒绝。请优先使用每个账户显式的路径。

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

- 保持 `token` 的机密性，如果泄露请轮换。
- 除非你明确信任自签名的本地 NAS 证书，否则请保持 `allowInsecureSsl: false`。
- 传入的 webhook 请求会进行 token 验证，并对每个发送者进行速率限制。
- 无效 token 检查使用常量时间的密钥比较，并以失败关闭方式处理。
- 生产环境请优先使用 `dmPolicy: "allowlist"`。
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

- [Channels Overview](/channels) — 所有受支持的通道
- [Pairing](/channels/pairing) — DM 认证与配对流程
- [Groups](/channels/groups) — 群聊行为与 mention gating
- [Channel Routing](/channels/channel-routing) — 消息会话路由
- [Security](/gateway/security) — 访问模型与加固
