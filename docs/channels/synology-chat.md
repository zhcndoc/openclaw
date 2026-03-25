---
summary: "群晖 Synology Chat webhook 设置及 OpenClaw 配置"
read_when:
  - 使用 OpenClaw 设置 Synology Chat
  - 调试 Synology Chat webhook 路由
title: "群晖 Synology Chat"
---

# 群晖 Synology Chat（插件）

状态：通过插件支持，作为使用 Synology Chat webhook 的私信通道。  
该插件接收来自 Synology Chat 出站 webhook 的消息，并通过 Synology Chat 入站 webhook 发送回复。

## 需要安装插件

Synology Chat 是基于插件的，不包含在默认核心通道安装中。

从本地仓库安装：

```bash
openclaw plugins install ./extensions/synology-chat
```

详情见：[插件](/tools/plugin)

## 快速设置

1. 安装并启用 Synology Chat 插件。
   - `openclaw onboard` 现在在相同的通道设置列表中显示 Synology Chat，类似于 `openclaw channels add`。
   - 非交互式设置：`openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
2. 在 Synology Chat 集成中：
   - 创建一个入站 webhook 并复制其 URL。
   - 创建一个带有密钥令牌的出站 webhook。
3. 将出站 webhook URL 指向你的 OpenClaw 网关：
   - 默认是 `https://gateway-host/webhook/synology`。
   - 或你的自定义 `channels.synology-chat.webhookPath`。
4. 在 OpenClaw 完成设置。
   - 指导式：`openclaw onboard`
   - 直接操作：`openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
5. 重启网关并向 Synology Chat 机器人发送私信。

最小配置示例：

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

对于默认账号，可以使用环境变量：

- `SYNOLOGY_CHAT_TOKEN`  
- `SYNOLOGY_CHAT_INCOMING_URL`  
- `SYNOLOGY_NAS_HOST`  
- `SYNOLOGY_ALLOWED_USER_IDS`（逗号分隔）  
- `SYNOLOGY_RATE_LIMIT`  
- `OPENCLAW_BOT_NAME`  

配置文件中的值优先于环境变量。

## 私信策略与访问控制

- `dmPolicy: "allowlist"` 是推荐的默认设置。
- `allowedUserIds` 接受 Synology 用户 ID 的列表（或逗号分隔的字符串）。
- 在 `allowlist` 模式下，空的 `allowedUserIds` 列表被视为配置错误，webhook 路由将不会启动（使用 `dmPolicy: "open"` 允许所有用户）。
- `dmPolicy: "open"` 允许任何发送者。
- `dmPolicy: "disabled"` 阻止私信。
- 回复接收者绑定默认保持在稳定的数字 `user_id` 上。`channels.synology-chat.dangerouslyAllowNameMatching: true` 是应急兼容模式，可重新启用可变的用户名/昵称查找以进行回复投递。
- 配对审批适用于：
  - `openclaw pairing list synology-chat`
  - `openclaw pairing approve synology-chat <CODE>`

## 出站发送

使用数字形式的 Synology Chat 用户 ID 作为目标。

示例：

```bash
openclaw message send --channel synology-chat --target 123456 --text "来自 OpenClaw 的问候"
openclaw message send --channel synology-chat --target synology-chat:123456 --text "再次问好"
```

支持通过 URL 形式的文件发送媒体消息。

## 多账户支持

在 `channels.synology-chat.accounts` 下支持多个 Synology Chat 账户。
每个账户可以覆盖令牌、入站 URL、webhook 路径、私信策略和限制。
私信会话按账户和用户隔离，因此两个不同 Synology 账户上相同的数字 `user_id`
不共享对话状态。
为每个启用的账户指定不同的 `webhookPath`。OpenClaw 现在拒绝重复的精确路径，
并拒绝启动在多账户设置中仅继承共享 webhook 路径的命名账户。
如果你故意需要为命名账户使用传统继承，请在该账户或 `channels.synology-chat` 处设置
`dangerouslyAllowInheritedWebhookPath: true`，
但重复的精确路径仍会被拒绝（故障关闭）。建议使用明确的每账户路径。

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

## 安全注意事项

- 保持 `token` 机密，如果泄露请轮换。
- 保持 `allowInsecureSsl: false`，除非你明确信任自签名的本地 NAS 证书。
- 入站 webhook 请求经过令牌验证并按发送者限速。
- 生产环境建议使用 `dmPolicy: "allowlist"`。
- 保持 `dangerouslyAllowNameMatching` 关闭，除非你明确需要基于旧版用户名的回复投递。
- 保持 `dangerouslyAllowInheritedWebhookPath` 关闭，除非你明确接受多账户设置中的共享路径路由风险。
