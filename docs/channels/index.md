---
summary: "OpenClaw 可连接的消息平台"
read_when:
  - 你想为 OpenClaw 选择一个聊天频道
  - 你需要快速了解支持的消息平台
title: "聊天频道"
---

OpenClaw 可以在你已经在使用的任何聊天应用上与你交流。每个频道都通过 Gateway 连接。
所有平台都支持文本；媒体和表情反应因频道而异。

## 传递说明

- Telegram 回复中包含 markdown 图片语法（例如 `![alt](url)`）时，
  在可能的情况下，会在最终出站路径中转换为媒体回复。
- Slack 的多人私信会按群聊路由，因此 MPIM 对话适用群组策略、提及
  行为和群组会话规则。
- WhatsApp 的设置采用按需安装：在插件包尚未安装时，引导流程也可以显示设置步骤，
  而 Gateway 仅在频道真正处于活动状态时才加载 WhatsApp 运行时。

## 支持的频道

- [BlueBubbles](/channels/bluebubbles) — **推荐用于 iMessage**；使用带完整功能支持的 BlueBubbles macOS 服务器 REST API（捆绑插件；编辑、撤回、效果、反应、群组管理 — 编辑目前在 macOS 26 Tahoe 上损坏）。
- [Discord](/channels/discord) — Discord Bot API + Gateway；支持服务器、频道和私信。
- [Feishu](/channels/feishu) — 通过 WebSocket 的 Feishu/Lark bot（捆绑插件）。
- [Google Chat](/channels/googlechat) — 通过 HTTP webhook 的 Google Chat API 应用。
- [iMessage (legacy)](/channels/imessage) — 通过 imsg CLI 的旧版 macOS 集成（已弃用，新配置请使用 BlueBubbles）。
- [IRC](/channels/irc) — 经典 IRC 服务器；带配对/允许名单控制的频道 + 私信。
- [LINE](/channels/line) — LINE Messaging API bot（捆绑插件）。
- [Matrix](/channels/matrix) — Matrix 协议（捆绑插件）。
- [Mattermost](/channels/mattermost) — Bot API + WebSocket；频道、群组、私信（捆绑插件）。
- [Microsoft Teams](/channels/msteams) — Bot Framework；企业级支持（捆绑插件）。
- [Nextcloud Talk](/channels/nextcloud-talk) — 通过 Nextcloud Talk 的自托管聊天（捆绑插件）。
- [Nostr](/channels/nostr) — 通过 NIP-04 的去中心化私信（捆绑插件）。
- [QQ Bot](/channels/qqbot) — QQ Bot API；私聊、群聊和富媒体（捆绑插件）。
- [Signal](/channels/signal) — signal-cli；注重隐私。
- [Slack](/channels/slack) — Bolt SDK；工作区应用。
- [Synology Chat](/channels/synology-chat) — 通过出站+入站 webhook 的 Synology NAS Chat（捆绑插件）。
- [Telegram](/channels/telegram) — 通过 grammY 的 Bot API；支持群组。
- [Tlon](/channels/tlon) — 基于 Urbit 的 messenger（捆绑插件）。
- [Twitch](/channels/twitch) — 通过 IRC 连接的 Twitch chat（捆绑插件）。
- [Voice Call](/plugins/voice-call) — 通过 Plivo 或 Twilio 的电话通信（插件，需单独安装）。
- [WebChat](/web/webchat) — 通过 WebSocket 的 Gateway WebChat UI。
- [WeChat](/channels/wechat) — 通过二维码登录的腾讯 iLink Bot 插件；仅支持私聊（外部插件）。
- [WhatsApp](/channels/whatsapp) — 最受欢迎；使用 Baileys 并需要二维码配对。
- [Yuanbao](/channels/yuanbao) — 腾讯元宝 bot（外部插件）。
- [Zalo](/channels/zalo) — Zalo Bot API；越南流行的 messenger（捆绑插件）。
- [Zalo Personal](/channels/zalouser) — 通过二维码登录的 Zalo 个人账号（捆绑插件）。

## 说明

- 各频道可以同时运行；配置多个后，OpenClaw 会按聊天路由。
- 通常最快的设置方式是 **Telegram**（简单的 bot token）。WhatsApp 需要二维码配对，并且
  会在磁盘上存储更多状态。
- 各频道的群组行为不同；参见 [Groups](/channels/groups)。
- 出于安全考虑，会强制执行私信配对和允许名单；参见 [Security](/gateway/security)。
- 故障排除：[Channel troubleshooting](/channels/troubleshooting)。
- 模型提供方会单独记录；参见 [Model Providers](/providers/models)。
