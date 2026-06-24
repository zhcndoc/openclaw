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

- Telegram 回复中包含 Markdown 图片语法，例如 `![alt](url)`，
  会在最终出站路径中在可能时转换为媒体回复。
- Slack 多人私信会按群聊路由，因此群组策略、提及
  行为和群组会话规则都适用于 MPIM 对话。
- WhatsApp 的设置采用按需安装：引导流程可以在
  插件包尚未安装时显示，而 Gateway 只有在频道实际处于活动状态时才会加载外部
  ClawHub/npm 插件。
- 接受由机器人编写的入站消息的频道可以使用共享的
  [机器人循环保护](/channels/bot-loop-protection)，以防止机器人配对彼此
  无休止地回复。
- 支持常驻房间的频道可以使用 [环境房间事件](/channels/ambient-room-events)，
  这样未被提及的房间聊天就会成为安静的上下文，除非代理使用
  `message` 工具发送。

## 支持的频道

- [Discord](/channels/discord) - Discord Bot API + Gateway；支持服务器、频道和私信。
- [Feishu](/channels/feishu) - 通过 WebSocket 的飞书/Lark 机器人（内置插件）。
- [Google Chat](/channels/googlechat) - 通过 HTTP webhook 的 Google Chat API 应用（可下载插件）。
- [iMessage](/channels/imessage) - 在已登录 Mac 上通过 `imsg` 桥接进行原生 macOS 集成（如果 Gateway 在其他位置运行，则使用 SSH 包装器），包括用于回复、tapback、效果、附件和群组管理的私有 API 操作。在主机权限和 Messages 访问条件合适时，推荐用于新的 OpenClaw iMessage 设置。
- [IRC](/channels/irc) - 经典 IRC 服务器；带配对/允许名单控制的频道和私信。
- [LINE](/channels/line) - LINE Messaging API 机器人（可下载插件）。
- [Matrix](/channels/matrix) - Matrix 协议（可下载插件）。
- [Mattermost](/channels/mattermost) - Bot API + WebSocket；频道、群组、私信（可下载插件）。
- [Microsoft Teams](/channels/msteams) - Bot Framework；企业级支持（内置插件）。
- [Nextcloud Talk](/channels/nextcloud-talk) - 通过 Nextcloud Talk 的自托管聊天（内置插件）。
- [Nostr](/channels/nostr) - 通过 NIP-04 的去中心化私信（内置插件）。
- [QQ Bot](/channels/qqbot) - QQ Bot API；私聊、群聊和富媒体（内置插件）。
- [Raft](/channels/raft) - 用于人类与代理协作的 Raft CLI 唤醒桥接（外部插件）。
- [Signal](/channels/signal) - signal-cli；注重隐私。
- [Slack](/channels/slack) - Bolt SDK；工作区应用。
- [SMS](/channels/sms) - 通过 Gateway webhook 的 Twilio 支持 SMS（官方插件）。
- [Synology Chat](/channels/synology-chat) - 通过出站 + 入站 webhook 的群晖 NAS Chat（内置插件）。
- [Telegram](/channels/telegram) - 通过 grammY 的 Bot API；支持群组。
- [Tlon](/channels/tlon) - 基于 Urbit 的 messenger（内置插件）。
- [Twitch](/channels/twitch) - 通过 IRC 连接的 Twitch 聊天（内置插件）。
- [Voice Call](/plugins/voice-call) - 通过 Plivo 或 Twilio 的电话服务（插件，需单独安装）。
- [WebChat](/web/webchat) - 通过 WebSocket 的 Gateway WebChat 界面。
- [WeChat](/channels/wechat) - 通过二维码登录的腾讯 iLink Bot 插件；仅支持私聊（外部插件）。
- [WhatsApp](/channels/whatsapp) - 最常用；使用 Baileys 并需要二维码配对。
- [Yuanbao](/channels/yuanbao) - 腾讯元宝机器人（外部插件）。
- [Zalo](/channels/zalo) - Zalo Bot API；越南流行的 messenger（内置插件）。
- [Zalo ClawBot](/channels/zaloclawbot) - 通过二维码登录的个人 Zalo 助手；绑定所有者（外部插件）。
- [Zalo Personal](/channels/zalouser) - 通过二维码登录的 Zalo 个人账号（内置插件）。

## 说明

- 各频道可以同时运行；配置多个后，OpenClaw 会按聊天路由。
- 通常最快的设置方式是 **Telegram**（简单的 bot token）。WhatsApp 需要二维码配对，并且
  会在磁盘上存储更多状态。
- 各频道的群组行为不同；参见 [群组](/channels/groups)。
- 出于安全考虑，会强制执行私信配对和允许名单；参见 [安全](/gateway/security)。
- 故障排除：[频道故障排除](/channels/troubleshooting)。
- 模型提供方会单独记录；参见 [模型提供方](/providers/models)。
