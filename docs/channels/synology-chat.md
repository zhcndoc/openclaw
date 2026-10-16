---
summary: "Synology Chat webhook 设置与 OpenClaw 配置"
read_when:
  - "设置 Synology 与 OpenClaw 聊天"
  - "调试 Synology Chat webhook 路由"
title: "Synology 聊天"
---

Synology Chat 通过一对 webhook 与 OpenClaw 连接：Synology Chat 的 outgoing webhook 将传入的直接消息发送到 Gateway，而回复则通过 Synology Chat 的 incoming webhook 返回。

状态：官方插件，单独安装。仅限直接消息；支持文本和托管文件发送。

## <a id="install"></a> 安装

```bash
openclaw plugins install @openclaw/synology-chat
```

本地检出（当从 git 仓库运行时）：

```bash
openclaw plugins install ./path/to/local/synology-chat-plugin
```

详细信息：[插件](/tools/plugin)

## <a id="quick-setup"></a> 快速设置

1. 安装插件（见上文）。
2. 在 Synology Chat 集成中：
   - 创建一个入站 webhook 并复制其 URL。
   - 使用你的密钥令牌创建一个出站 webhook。
3. 将出站 webhook URL 指向你的 OpenClaw Gateway：
   - 默认是 `https://gateway-host/webhook/synology`。
   - 或者使用你自定义的 `channels.synology-chat.webhookPath`。
   - 将确切的外部可访问 HTTPS URL 记录为 `channels.synology-chat.webhookUrl`，以便 NAS 可以检索托管附件。
4. 在 OpenClaw 中完成设置。Synology Chat 在两种流程中都会出现在相同的频道设置列表里：
   - 引导式：`openclaw onboard` 或 `openclaw channels add`
   - 直接：`openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url> --webhook-url <public-outgoing-webhook-url>`
5. 检查`openclaw channels status --probe`，然后将DM发送到Synology聊天机器人。如果网关离线，则启动网关；配置更改遵循 [hot reload](/gateway/configuration/hot-reload)。

Webhook 认证详情：

- OpenClaw 先从 `body.token` 接收 outgoing webhook token，然后是 `?token=...`，最后才是 headers。
- 可接受的 header 形式：
  - `x-synology-token`
  - `x-webhook-token`
  - `x-openclaw-token`
  - `Authorization: Bearer <token>`
- E 空的或丢失的令牌被拒绝。
- Payload 可以是 `application/x-www-form-urlencoded` 或 `application/json`；`token`、`user_id` 和 `text` 是必需的。

## <a id="inbound-durability"></a> 入站持久性

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
      webhookUrl: "https://gateway.example.com/webhook/synology",
      webhookPath: "/webhook/synology",
      dmPolicy: "allowlist",
      allowedUserIds: ["123456"],
      rateLimitPerMinute: 30,
      allowInsecureSsl: false,
    },
  },
}
```

## <a id="environment-variables"></a> 环境变量

对于默认账户，你可以使用环境变量：

- `SYNOLOGY_CHAT_TOKEN`
- `SYNOLOGY_CHAT_INCOMING_URL`
- `SYNOLOGY_NAS_HOST`
- `SYNOLOGY_ALLOWED_USER_IDS`（逗号分隔）
- `SYNOLOGY_RATE_LIMIT`
- `OPENCLAW_BOT_NAME`

配置值会覆盖环境变量。

无法从工作区 `.env` 中设置 `SYNOLOGY_CHAT_INCOMING_URL` 和 `SYNOLOGY_NAS_HOST`；请参阅 [ 工作区 `.env` 文件 ](/gateway/security/secrets-and-storage#workspace-env-files)。

## <a id="dm-policy-and-access-control"></a> DM 策略与访问控制

- 支持的 `dmPolicy` 值：`allowlist`（默认）、`open` 和 `disabled`。 Synology 聊天无配对流程；通过将数字 Synology 用户 ID 添加到 `allowedUserIds` 来批准发件人。
- `allowedUserIds` 接受 Synology 用户 ID 的列表（或逗号分隔的字符串）。
- 在 `allowlist` 模式下，空的 `allowedUserIds` 列表会被视为配置错误，webhook 路由不会启动。
- `dmPolicy: "open"` 仅当 `allowedUserIds` 包含 `"*"` 时才允许公共 DM；通过限制性条目，只有匹配的用户才能聊天。 `allowedUserIds` 列表为空的 `open` 也拒绝启动路由。
- `dmPolicy: "disabled"` 阻止 DM。
- 默认情况下，回复收件人绑定保持稳定的数字 `user_id`。 `channels.synology-chat.dangerouslyAllowNameMatching: true` 是打破玻璃兼容模式，可重新启用可变 username/nickname 查找以进行回复传递。

## <a id="outbound-delivery"></a> 发出消息投递

使用数字 Synology 聊天用户 ID 作为目标。接受 `synology-chat:`、`synology_chat:` 和 `synology:` 前缀。

示例：

```bash
openclaw message send --channel synology-chat --target 123456 --message "Hello from OpenClaw"
openclaw message send --channel synology-chat --target synology-chat:123456 --message "Hello again"
openclaw message send --channel synology-chat --target synology:123456 --message "Short prefix"
```

出站文本分块于2000字符和普通链接保持不变。保持**隐藏URL对话和频道中的预览**启用于Synology支持的聊天服务器版本上的聊天管理控制台。

对于附件，OpenClaw 在其受保护的出站媒体策略下加载源，将生成的字节冻结在有界插件范围的 SQLite 状态中，并在配置的 Webhook 路由上为 Synology 提供短暂的不透明 HTTPS 功能。 NAS 仅接收此 OpenClaw- 托管的 URL，而不是原始远程或本地媒体引用。功能是帐户和路由范围的，可在十分钟的生命周期内重复用于延迟的 `GET` 或 `HEAD` 请求，并自动过期。文件限制为 32 MB。每个账户最多可以同时提供4个附件响应，每分钟128个MB；停滞的响应将在两分钟后关闭。不公布字节范围响应。

`webhookUrl` 和 `webhookPath` 具有不同的作用：

- `webhookUrl` 是 Synology 聊天中配置的外部可访问的 HTTPS 回调。 OpenClaw 在创建附件功能时使用其公共来源、路径和现有查询字符串。
- `webhookPath` 是内部网关路由。反向代理可以将公共 URL 映射到此路由，但应仅公开此插件路径，而不是一般网关 HTTP 表面。
- `incomingUrl` 指向相反的方向：OpenClaw 使用它来发布对 NAS 的回复。

OpenClaw 永远不会从 `Host` 或 `X-Forwarded-*` 标头派生公共 URL，并且永远不会回退到转发原始源 URL。如果 `webhookUrl` 丢失或无效，入站消息和出站文本将继续工作，但附件发送失败并出现可操作的设置错误。

## <a id="multi-account"></a> 多账户

`channels.synology-chat.accounts` 支持多个 Synology 聊天帐户。每个帐户都可以覆盖令牌、传入 URL、公共 Webhook URL、Webhook 路径、DM 策略和限制。直接消息会话是按帐户和用户隔离的，因此两个不同 Synology 帐户上的相同数字 `user_id` 不会共享转录状态。对于每个传入 Webhook URL（包括其令牌），出站发送的速度是独立的。发送到同一 webhook 的文本和附件共享 500 毫秒的最小间隔；一个 Webhook 上的突发不会延迟另一个 Webhook。为每个启用的帐户指定一个不同的 `webhookPath`。 OpenClaw 拒绝重复的精确路径，并拒绝启动仅在多帐户设置中继承共享 Webhook 路径的命名帐户。如果您有意需要指定帐户的旧式继承，请在该帐户或 `channels.synology-chat` 处设置 `dangerouslyAllowInheritedWebhookPath: true`，但重复的确切路径仍会被拒绝。更喜欢明确的每个帐户路径。

```json5
{
  channels: {
    "synology-chat": {
      enabled: true,
      accounts: {
        default: {
          token: "token-a",
          incomingUrl: "https://nas-a.example.com/...token=...",
          webhookUrl: "https://gateway.example.com/webhook/synology",
        },
        alerts: {
          token: "token-b",
          incomingUrl: "https://nas-b.example.com/...token=...",
          webhookUrl: "https://gateway.example.com/webhook/synology-alerts",
          webhookPath: "/webhook/synology-alerts",
          dmPolicy: "allowlist",
          allowedUserIds: ["987654"],
        },
      },
    },
  },
}
```

## <a id="security-notes"></a> 安全说明

- 保持 `token` 机密，如果泄露则立即轮换。
- 除非你明确信任自签名的本地 NAS 证书，否则请保持 `allowInsecureSsl: false`。
- 入站 webhook 请求会进行 token 验证，并按发送方进行限流（`rateLimitPerMinute`，默认 30）。
- 无效令牌检查使用常量时间秘密比较并拒绝请求；重复的无效令牌尝试暂时锁定源 IP。
- 入站消息文本会针对已知的提示注入模式进行清理，并在 4000 个字符处截断。
- 生产环境优先使用 `dmPolicy: "allowlist"`。
- 除非你明确需要基于旧版用户名的回复投递，否则请关闭 `dangerouslyAllowNameMatching`。
- 除非你明确接受多账户设置中的共享路径路由风险，否则请关闭 `dangerouslyAllowInheritedWebhookPath`。
- 反向代理访问日志可以捕获附件功能令牌。禁用查询字符串日志记录或编辑 `__openclaw_synology_media_token_*` 参数，并保持应用程序日志中不含完整功能 URL。
- 托管附件使用 `Content-Disposition: attachment`、`X-Content-Type-Options: nosniff` 和 `Cache-Control: no-store`。声明或命名为 HTML、SVG 或 XML 的文件将被拒绝。在可选编码标记、空格和注释之后以 UTF-8、UTF-16 或 UTF-32 标记文档开头的冻结字节也将被拒绝；被动文本或源文件中后面的文字标记不会使这些文件成为主动文档。

## <a id="troubleshooting"></a> 故障排查

- `Missing required fields (token, user_id, text)`:
  - outgoing webhook 载荷缺少所需字段之一
  - 如果 Synology 将 token 放在 headers 中，请确保 gateway/proxy 会保留这些 headers
- `Invalid token`:
  - outgoing webhook secret 与 `channels.synology-chat.token` 不匹配
  - 请求命中了错误的account/webhook路径
  - 反向代理在请求到达 OpenClaw 之前剥离了 token header
- `Rate limit exceeded`:
  - 来自同一来源的无效 token 尝试过多，可能会暂时将该来源锁定
  - 已认证发送者也有单独的按用户消息速率限制
- `Allowlist is empty. Configure allowedUserIds or use dmPolicy=open with allowedUserIds=["*"].`:
  - 已启用 `dmPolicy="allowlist"`，但未配置任何用户
- `User not authorized`:
  - 发送者的数字 `user_id` 不在 `allowedUserIds` 中
- `Synology Chat attachments require webhookUrl`:
  - 设置帐户的确切外部可达性 HTTPS 传出 Webhook 回调 URL
  - 确认反向代理仅将公共路由映射到`webhookPath`
  - 附件设置不完整时文本和入站消息仍然可用

## <a id="related"></a> 相关内容

- [Channels Overview](/channels) — 所有支持的通道
- [Groups](/channels/groups) — 群聊行为和提及门控
- [通道路由](/channels/channel-routing) — 消息的会话路由
- [Security](/gateway/security) — 访问模型和强化
