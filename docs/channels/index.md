---
summary: "OpenClaw 可连接的消息平台"
read_when:
  - 你想为 OpenClaw 选择一个聊天渠道
  - 你需要快速了解支持的消息平台
title: "聊天渠道"
---

OpenClaw 可以在你已经在使用的任何聊天应用上与你交流。每个渠道都通过 Gateway 连接。
文本在所有地方都受支持；媒体和反应功能因渠道而异。

## 投递说明

- Telegram 中包含 markdown 图片语法的回复，例如 `![alt](url)`，
  在最终外发路径上会在可能时转换为媒体回复。
- Slack 的多人私信会作为群聊路由，因此群组策略、提及
  行为以及群组会话规则都适用于 MPIM 对话。
- WhatsApp 的设置采用按需安装：引导流程可以在
  Baileys 运行时依赖项准备好之前显示设置步骤，而 Gateway 仅在该渠道实际激活时才加载 WhatsApp
  运行时。

## 支持的渠道

- [BlueBubbles](/channels/bluebubbles) — **推荐用于 iMessage**；使用带有完整功能支持的 BlueBubbles macOS 服务器 REST API（捆绑插件；编辑、撤回、特效、反应、群组管理——在 macOS 26 Tahoe 上编辑功能目前失效）。
- [Discord](/channels/discord) — Discord Bot API + 网关；支持服务器、频道和私信。
- [Feishu](/channels/feishu) — 通过 WebSocket 使用的 Feishu/Lark 机器人（捆绑插件）。
- [Google Chat](/channels/googlechat) — 通过 HTTP Webhook 使用的 Google Chat API 应用。
- [iMessage（旧版）](/channels/imessage) — 通过 imsg CLI 实现的旧版 macOS 集成（已弃用，新设置请使用 BlueBubbles）。
- [IRC](/channels/irc) — 经典 IRC 服务器；支持频道和私信，并具备配对/允许列表控制。
- [LINE](/channels/line) — LINE 消息 API 机器人（捆绑插件）。
- [Matrix](/channels/matrix) — Matrix 协议（捆绑插件）。
- [Mattermost](/channels/mattermost) — 机器人 API + WebSocket；支持频道、用户组和私信（捆绑插件）。
- [Microsoft Teams](/channels/msteams) — 机器人框架；企业级支持（捆绑插件）。
- [Nextcloud Talk](/channels/nextcloud-talk) — 通过 Nextcloud Talk 提供的自托管聊天（捆绑插件）。
- [Nostr](/channels/nostr) — 通过 NIP-04 实现的去中心化私信（捆绑插件）。
- [QQ Bot](/channels/qqbot) — QQ 机器人 API；支持私聊、群聊和富媒体（捆绑插件）。
- [Signal](/channels/signal) — 使用 signal-cli；注重隐私。
- [Slack](/channels/slack) — 使用 Bolt SDK；支持工作区应用。
- [Synology Chat](/channels/synology-chat) — 通过外发和接收 Webhook 使用的 Synology NAS 聊天（捆绑插件）。
- [Telegram](/channels/telegram) — 使用 grammY 的机器人 API；支持群组。
- [Tlon](/channels/tlon) — 基于 Urbit 的消息应用（捆绑插件）。
- [Twitch](/channels/twitch) — 通过 IRC 连接使用的 Twitch 聊天（捆绑插件）。
- [Voice Call](/plugins/voice-call) — 通过 Plivo 或 Twilio 提供电话服务（插件，需单独安装）。
- [WebChat](/web/webchat) — 基于 WebSocket 的网关 WebChat 界面。
- [WeChat](/channels/wechat) — 通过二维码登录使用的腾讯 iLink 机器人插件；仅支持私聊（外部插件）。
- [WhatsApp](/channels/whatsapp) — 最受欢迎；使用 Baileys 并需要二维码配对，且会在磁盘上存储更多状态。
- [Zalo](/channels/zalo) — Zalo 机器人 API；越南流行的消息应用（捆绑插件）。
- [Zalo Personal](/channels/zalouser) — 通过二维码登录使用的 Zalo 个人账户（捆绑插件）。

## 注意事项

- 通道可以同时运行；配置多个时，OpenClaw 将按聊天路由消息。
- 最快的设置通常是 **Telegram**（只需简单的机器人 token）。WhatsApp 需要二维码配对，并在磁盘上存储更多状态。
- 群组行为因通道而异；详情请参见 [群组](/channels/groups)。
- 为安全起见，私信配对和允许列表均强制执行；详情请参见 [安全](/gateway/security)。
- 故障排除：请参见 [通道故障排除](/channels/troubleshooting)。
- 模型提供商另有文档；请参见 [模型提供商](/providers/models)。
