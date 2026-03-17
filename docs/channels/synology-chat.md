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

- 推荐默认使用 `dmPolicy: "allowlist"`。  
- `allowedUserIds` 接受 Synology 用户 ID 列表（数组或逗号分隔字符串）。  
- 在 `allowlist` 模式下，`allowedUserIds` 为空被视为配置错误，webhook 路由不会启动（可用 `dmPolicy: "open"` 开启所有访问）。  
- `dmPolicy: "open"` 允许任何发送者。  
- `dmPolicy: "disabled"` 禁止私信。  
- 可使用以下命令管理配对授权：  
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

支持在 `channels.synology-chat.accounts` 下配置多个 Synology Chat 账户。  
每个账户可以覆盖 token、入站 URL、webhook 路径、私信策略及限制。

示例：

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

- 保密 `token`，如泄露请及时更换。  
- 除非完全信任自签名的本地 NAS 证书，否则保持 `allowInsecureSsl: false`。  
- 入站 webhook 请求会通过令牌验证且对发送者进行限流。  
- 生产环境中推荐使用 `dmPolicy: "allowlist"`。
