---
summary: "OpenClaw 可以连接的消息平台"
read_when:
  - 你想为 OpenClaw 选择一个聊天通道
  - 你需要快速了解支持的消息平台
title: "聊天通道"
---

# 聊天通道

OpenClaw 可以和你常用的任何聊天应用对话。每个通道都通过网关连接。
所有通道均支持文本；多媒体和表情反应因通道而异。

## 支持的通道

- [BlueBubbles](/channels/bluebubbles) — **推荐用于 iMessage**；使用 BlueBubbles macOS 服务器 REST API，支持完整功能（编辑、撤回、特效、表情反应、群组管理——编辑功能目前在 macOS 26 Tahoe 上存在问题）。
- [Discord](/channels/discord) — Discord Bot API + Gateway；支持服务器、频道和私信。
- [Feishu](/channels/feishu) — 通过 WebSocket 连接的飞书/ Lark 机器人（插件，需单独安装）。
- [Google Chat](/channels/googlechat) — 通过 HTTP webhook 连接的 Google Chat API 应用。
- [iMessage (legacy)](/channels/imessage) — 通过 imsg CLI 的传统 macOS 集成（已弃用，新安装请使用 BlueBubbles）。
- [IRC](/channels/irc) — 经典 IRC 服务器；支持频道和私信，带有配对/白名单控制。
- [LINE](/channels/line) — LINE Messaging API 机器人（插件，需单独安装）。
- [Matrix](/channels/matrix) — Matrix 协议（插件，需单独安装）。
- [Mattermost](/channels/mattermost) — Bot API + WebSocket；支持频道、群组和私信（插件，需单独安装）。
- [Microsoft Teams](/channels/msteams) — Bot Framework；企业级支持（插件，需单独安装）。
- [Nextcloud Talk](/channels/nextcloud-talk) — 通过 Nextcloud Talk 的自托管聊天（插件，需单独安装）。
- [Nostr](/channels/nostr) — 通过 NIP-04 的去中心化私信（插件，需单独安装）。
- [Signal](/channels/signal) — signal-cli；注重隐私。
- [Slack](/channels/slack) — Bolt SDK；工作区应用。
- [Synology Chat](/channels/synology-chat) — 通过出站+入站 webhook 连接的 Synology NAS Chat（插件，需单独安装）。
- [Telegram](/channels/telegram) — 通过 grammY 的 Bot API；支持群组。
- [Tlon](/channels/tlon) — 基于 Urbit 的即时通讯工具（插件，需单独安装）。
- [Twitch](/channels/twitch) — 通过 IRC 连接的 Twitch 聊天（插件，需单独安装）。
- [Voice Call](/plugins/voice-call) — 通过 Plivo 或 Twilio 的电话服务（插件，需单独安装）。
- [WebChat](/web/webchat) — 通过 WebSocket 的网关 WebChat 界面。
- [WhatsApp](/channels/whatsapp) — 最受欢迎；使用 Baileys 并需要二维码配对。
- [Zalo](/channels/zalo) — Zalo Bot API；越南流行的即时通讯工具（插件，需单独安装）。
- [Zalo Personal](/channels/zalouser) — 通过二维码登录的 Zalo 个人账户（插件，需单独安装）。

## 注意事项

- 通道可同时运行；配置多个时，OpenClaw 将按聊天路由消息。
- 最快的设置通常是 **Telegram**（简单的机器人 token）。WhatsApp 需要二维码配对，并且在磁盘上存储更多状态。
- 群组行为因通道而异；详情见 [群组](/channels/groups)。
- 为安全起见，私信配对和允许列表均有强制执行；详情见 [安全](/gateway/security)。
- 故障排除：请参见 [通道故障排除](/channels/troubleshooting)。
- 模型提供商另有文档；请参见 [模型提供商](/providers/models)。
