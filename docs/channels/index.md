---
summary: "OpenClaw 可连接的消息平台"
read_when:
  - 你想为 OpenClaw 选择一个聊天频道
  - 你需要快速了解支持的消息平台
title: "聊天频道"
---

OpenClaw 可以在你已经在使用的任何聊天应用上与你交流。每个频道都通过 Gateway 连接。
所有平台都支持文本；媒体和表情反应因频道而异。

iMessage、Telegram 和 WebChat UI 随核心安装一同提供。标记为
“official plugin”的频道可通过一条命令安装（`openclaw plugins install @openclaw/<id>`）
，或在执行 `openclaw onboard` / `openclaw channels add` 时按需安装，然后需要重启
Gateway。“External plugin” 频道由 OpenClaw 仓库之外维护。

## 支持的渠道

- [Buzz](/channels/buzz) - Buzz 团队聊天室，支持线程回复（官方插件）。
- [Discord](/channels/discord) - Discord Bot API + Gateway；支持服务器、频道和私信（官方插件）。
- [Feishu](/channels/feishu) - 通过 WebSocket 的 Feishu/Lark 机器人（官方插件）。
- [Google Chat](/channels/googlechat) - 通过 HTTP webhook 的 Google Chat API 应用（官方插件）。
- [iMessage](/channels/imessage) - 包含在核心中。通过已登录 Mac 上的 `imsg` 桥接实现原生 macOS 集成（如果 Gateway 在其他地方运行，则使用 SSH 包装器），包括用于回复、轻点回执、特效、附件和群组管理的私有 API 操作。
- [IRC](/channels/irc) - 经典 IRC 服务器；通过配对/允许列表控制的频道 + 私信（官方插件）。
- [LINE](/channels/line) - LINE Messaging API 机器人（官方插件）。
- [Matrix](/channels/matrix) - Matrix 协议（官方插件）。
- [Mattermost](/channels/mattermost) - Bot API + WebSocket；频道、群组、私信（官方插件）。
- [Microsoft Teams](/channels/msteams) - Bot Framework；企业级支持（官方插件）。
- [Nextcloud Talk](/channels/nextcloud-talk) - 通过 Nextcloud Talk 的自托管聊天（官方插件）。
- [Nostr](/channels/nostr) - 通过 NIP-04 的去中心化私信（官方插件）。
- [QQ Bot](/channels/qqbot) - QQ Bot API；私聊、群聊和富媒体（官方插件）。
- [Reef](/channels/reef) - 受保护的、端到端加密的 claw-to-claw 消息传递，发生在不同人的 OpenClaw 代理之间（捆绑插件）。
- [Raft](/channels/raft) - 用于人类与代理协作的 Raft CLI 唤醒桥接（官方插件）。
- [Signal](/channels/signal) - signal-cli；注重隐私（官方插件）。
- [Slack](/channels/slack) - Bolt SDK；工作区应用（官方插件）。
- [SMS](/channels/sms) - 通过 Gateway webhook 的 Twilio 支持短信（官方插件）。
- [Synology Chat](/channels/synology-chat) - 通过外发+入站 webhook 的 Synology NAS Chat（官方插件）。
- [Telegram](/channels/telegram) - 包含在核心中。通过 grammY 的 Bot API；支持群组。
- [Tlon](/channels/tlon) - 基于 Urbit 的消息工具（官方插件）。
- [Twitch](/channels/twitch) - 通过 IRC 连接的 Twitch 聊天（官方插件）。
- [Voice Call](/plugins/voice-call) - 通过 Plivo、Telnyx 或 Twilio 的电话通信（官方插件）。
- [WebChat](/web/webchat) - 包含在核心中。通过 WebSocket 的 Gateway WebChat UI。
- [WeChat](/channels/wechat) - 通过二维码登录的腾讯 iLink 机器人；仅支持私聊（外部插件）。
- [WhatsApp](/channels/whatsapp) - 最受欢迎；使用 Baileys 并需要二维码配对（官方插件）。
- [Yuanbao](/channels/yuanbao) - 腾讯元宝机器人（外部插件）。
- [Zalo](/channels/zalo) - Zalo Bot API；越南流行的聊天工具（官方插件）。
- [Zalo ClawBot](/channels/zaloclawbot) - 通过二维码登录的个人 Zalo 助手；绑定所有者（外部插件）。
- [Zalo Personal](/channels/zalouser) - 通过二维码登录的 Zalo 个人账号（官方插件）。

## 交付说明

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

## 备注

- 各个渠道可以同时运行；配置多个后，OpenClaw 会按聊天自动路由。
- 最快的设置通常是 **Telegram**（简单的机器人令牌，无需安装插件）。WhatsApp
  需要通过二维码配对，并且会在磁盘上存储更多状态。
- 群组行为因渠道而异；参见 [群组](/channels/groups)。
- 为了安全起见，DM 配对和允许列表会强制执行；参见 [安全](/gateway/security)。
- 故障排除：[渠道故障排除](/channels/troubleshooting)。
- 模型提供方单独记录；参见 [模型提供方](/providers/models)。
