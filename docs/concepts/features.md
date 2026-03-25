---
summary: "OpenClaw 在渠道、路由、媒体和用户体验方面的功能。"
read_when:
  - 您想要一份 OpenClaw 支持功能的完整列表
title: "功能"
---

# 功能

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

**渠道：**

- WhatsApp、Telegram、Discord、iMessage（内置）
- Mattermost、Matrix、Microsoft Teams、Nostr 等（插件）
- 支持群聊，可通过提及激活
- 私信安全，支持白名单和配对

**代理：**

- 嵌入式代理运行时，支持工具流式传输
- 多代理路由，按工作区或发送者隔离会话
- 会话：直接聊天合并到共享的 `main`；群组相互隔离
- 长响应支持流式传输和分块

**认证和提供商：**

- 35+ 模型提供商（Anthropic、OpenAI、Google 等）
- 通过 OAuth 进行订阅认证（例如 OpenAI Codex）
- 支持自定义和自托管提供商（vLLM、SGLang、Ollama，以及任何兼容 OpenAI 或 Anthropic 的端点）

**媒体：**

- 支持图片、音频、视频和文档的收发
- 语音笔记转录
- 支持多提供商的文本转语音

**应用和界面：**

- WebChat 和浏览器控制界面
- macOS 菜单栏伴生应用
- iOS 节点，支持配对、Canvas、相机、屏幕录制、位置和语音
- Android 节点，支持配对、聊天、语音、Canvas、相机和设备命令

**工具和自动化：**

- 浏览器自动化、执行、沙箱
- 网页搜索（Brave、Perplexity、Gemini、Grok、Kimi、Firecrawl）
- Cron 任务和心跳调度
- 技能、插件和工作流管道（Lobster）
