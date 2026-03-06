---
summary: "OpenClaw 在渠道、路由、媒体和用户体验方面的功能。"
read_when:
  - 您想要一份 OpenClaw 支持功能的完整列表
title: "功能"
---

## 亮点

<Columns>
  <Card title="渠道" icon="message-square">
    通过单一网关支持 WhatsApp、Telegram、Discord 和 iMessage。
  </Card>
  <Card title="插件" icon="plug">
    通过扩展添加 Mattermost 等。
  </Card>
  <Card title="路由" icon="route">
    多代理路由，支持隔离会话。
  </Card>
  <Card title="媒体" icon="image">
    支持图片、音频和文档的收发。
  </Card>
  <Card title="应用和用户界面" icon="monitor">
    网页控制界面和 macOS 伴生应用。
  </Card>
  <Card title="移动节点" icon="smartphone">
    支持 iOS 和 Android 节点，含配对、语音/聊天及丰富的设备命令。
  </Card>
</Columns>

## 完整列表

- 通过 WhatsApp Web (Baileys) 集成 WhatsApp
- 支持 Telegram 机器人 (grammY)
- 支持 Discord 机器人 (channels.discord.js)
- 支持 Mattermost 机器人（插件）
- 通过本地 imsg CLI（macOS）集成 iMessage
- Pi 代理桥接，RPC 模式，支持工具流式传输
- 长响应的流式传输与分块
- 针对每个工作区或发送者的隔离会话多代理路由
- 通过 OAuth 支持 Anthropic 和 OpenAI 的订阅认证
- 会话：直接聊天折叠到共享的 `main`；群聊隔离管理
- 支持通过提及激活的群聊
- 支持图片、音频和文档等媒体
- 可选的语音笔记转录钩子
- WebChat 和 macOS 菜单栏应用
- iOS 节点支持配对、Canvas、相机、屏幕录制、位置和语音功能
- Android 节点支持配对、连接标签、聊天会话、语音标签、Canvas/相机/屏幕、设备命令、通知、联系人/日历、运动、照片、短信和应用更新命令

<Note>
已移除旧版 Claude、Codex、Gemini 和 Opencode 路径。Pi 现为唯一的编码代理路径。
</Note>
