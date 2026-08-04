---
summary: "OpenClaw 可连接的消息平台"
read_when:
  - 你想为 OpenClaw 选择一个聊天频道
  - 你需要快速了解支持的消息平台
title: "聊天频道"
---

OpenClaw 可以在你已经在使用的任何聊天应用上与你交流。每个频道都通过 Gateway 连接。
所有平台都支持文本；媒体和表情反应因频道而异。

标记为“捆绑插件”或“核心内置”的条目随核心安装一起提供。标记为“官方插件”的频道可以通过一条命令安装
（`openclaw plugins install @openclaw/<id>`），也可以在
`openclaw onboard` / `openclaw channels add` 期间按需安装，之后需要重启 Gateway。
“外部插件”频道由 OpenClaw 仓库之外的维护者维护。

## 支持的渠道

<!-- 开始生成：官方渠道目录 -->
<!-- 由 `pnpm channels:catalog:gen` 生成。编辑 manifests/seed 以调整成员和路由；编辑页面 frontmatter 以调整公开名称和摘要。 -->

- [Buzz](/channels/buzz) - 将 OpenClaw 代理连接到 Buzz 房间（官方插件）。
- [ClickClack](/channels/clickclack) - ClickClack 机器人令牌渠道设置和目标语法（官方插件）。
- [Discord](/channels/discord) - Discord 机器人设置、配置项、组件、语音和故障排除（官方插件）。
- [飞书](/channels/feishu) - 飞书机器人概览、功能和配置（官方插件）。
- [Google Chat](/channels/googlechat) - Google Chat 应用支持状态、功能和配置（官方插件）。
- [iMessage](/channels/imessage) - 通过 imsg 提供原生 iMessage 支持（通过标准输入输出进行 JSON-RPC），并支持用于回复、Tapback、效果、投票、附件和群组管理的私有 API 操作。当主机要求满足条件时，推荐用于新的 OpenClaw iMessage 设置（官方插件）。
- [IRC](/channels/irc) - IRC 插件设置、访问控制和故障排除（官方插件）。
- [LINE](/channels/line) - LINE Messaging API 插件设置、配置和使用（官方插件）。
- [Matrix](/channels/matrix) - Matrix 支持状态、设置和配置示例（官方插件）。
- [Mattermost](/channels/mattermost) - Mattermost 机器人设置和 OpenClaw 配置（官方插件）。
- [Microsoft Teams](/channels/msteams) - Microsoft Teams 机器人支持状态、功能和配置（官方插件）。
- [Nextcloud Talk](/channels/nextcloud-talk) - Nextcloud Talk 支持状态、功能和配置（官方插件）。
- [Nostr](/channels/nostr) - 通过 NIP-04 加密消息实现的 Nostr 私信渠道（官方插件）。
- [QQ 机器人](/channels/qqbot) - QQ 机器人设置、配置和使用（官方插件）。
- [Raft](/channels/raft) - 通过 Raft CLI 唤醒桥接支持 Raft 外部代理（官方插件）。
- [Reef](/channels/reef) - Reef 渠道设置：不同用户的 OpenClaw 代理之间受保护的端到端加密消息传递（内置插件）。
- [Signal](/channels/signal) - 通过 signal-cli 支持 Signal（原生守护进程或 bbernhard 容器），包括设置路径和号码模型（官方插件）。
- [Slack](/channels/slack) - Slack 设置和运行时行为（Socket Mode、HTTP Request URL 和中继模式）（官方插件）。
- [SMS](/channels/sms) - Twilio SMS/MMS 设置、访问控制、Webhook 和投递状态（官方插件）。
- [Synology Chat](/channels/synology-chat) - Synology Chat Webhook 设置和 OpenClaw 配置（官方插件）。
- [Telegram](/channels/telegram) - Telegram 机器人支持状态、功能和配置（内置插件）。
- [Tlon](/channels/tlon) - Tlon/Urbit 支持状态、功能和配置（官方插件）。
- [Twitch](/channels/twitch) - Twitch 聊天机器人：安装、凭据、访问控制和令牌刷新（官方插件）。
- [WebChat](/web/webchat) - 通过 Gateway WebSocket 使用原生 WebChat 和控制 UI WebChat（核心内置）。
- [微信](/channels/wechat) - 通过外部 openclaw-weixin 插件设置微信渠道（外部插件）。
- [企业微信](/channels/wecom) - 安装官方企业微信插件并查找对应版本的设置文档（外部插件）。
- [WhatsApp](/channels/whatsapp) - WhatsApp 渠道支持、访问控制、投递行为和运维（官方插件）。
- [元宝](/channels/yuanbao) - 元宝机器人概览、功能和配置（外部插件）。
- [Zalo](/channels/zalo) - Zalo 机器人支持状态、功能和配置（官方插件）。
- [Zalo ClawBot](/channels/zaloclawbot) - 通过外部 openclaw-zaloclawbot 插件设置 Zalo ClawBot 渠道（外部插件）。
- [Zalo 个人版](/channels/zalouser) - 通过原生 zca-js（二维码登录）支持 Zalo 个人账户，包括功能和配置（官方插件）。

<!-- 结束生成：官方渠道目录 -->

### 相关通信插件

- [语音通话](/plugins/voice-call) - 通过 Plivo、Telnyx 或 Twilio 提供电话服务（官方插件）。

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
