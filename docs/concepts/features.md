---
summary: "OpenClaw 在各个渠道、路由、媒体和 UX 方面的能力。"
read_when:
  - 你想查看 OpenClaw 支持的完整列表
title: "功能"
---

## 亮点

<Columns>
  <Card title="渠道" icon="message-square" href="/channels">
    Discord、iMessage、Signal、Slack、Telegram、WhatsApp、WebChat 等，只需一个 Gateway。
  </Card>
  <Card title="插件" icon="plug" href="/tools/plugin">
    官方插件通过一次安装命令即可添加 Matrix、Nextcloud Talk、Nostr、Twitch、Zalo 等数十种集成。
  </Card>
  <Card title="路由" icon="route" href="/concepts/multi-agent">
    具有隔离会话的多代理路由。
  </Card>
  <Card title="媒体" icon="image" href="/nodes/images">
    图片、音频、视频、文档，以及图像/视频生成。
  </Card>
  <Card title="应用和 UI" icon="monitor" href="/platforms">
    Windows Hub、浏览器控制 UI、macOS 菜单栏应用，以及移动节点。
  </Card>
  <Card title="移动节点" icon="smartphone" href="/nodes">
    支持配对、语音/聊天以及丰富设备命令的 iOS 和 Android 节点。
  </Card>
</Columns>

## 完整列表

**渠道：**

- iMessage、Telegram 和 WebChat 随核心安装包一同提供；其他所有渠道都是通过 `openclaw plugins install @openclaw/<id>` 安装的官方插件（或者在 `openclaw onboard` / `openclaw channels add` 期间按需安装）
- 官方插件渠道：Discord、Feishu、Google Chat、IRC、LINE、Matrix、Mattermost、Microsoft Teams、Nextcloud Talk、Nostr、QQ Bot、Raft、Signal、Slack、SMS、Synology Chat、Tlon、Twitch、Voice Call、WhatsApp、Zalo 和 Zalo Personal
- 在 OpenClaw 仓库外维护的外部插件渠道：WeChat、Yuanbao 和 Zalo ClawBot
- 支持基于提及触发的群聊激活
- 通过允许名单和配对机制保障私信安全

**代理：**

- 内置代理运行时，支持工具流式传输
- 按工作区或发送者进行隔离会话的多代理路由
- 会话：直接聊天会折叠到共享的 `main`；群组是隔离的
- 针对长回复的流式传输和分块

**认证和提供商：**

- 35+ 个模型提供商（Anthropic、OpenAI、Google 等）
- 通过 OAuth 的订阅认证（例如 OpenAI Codex）
- 支持自定义和自托管提供商（vLLM、SGLang、Ollama、llama.cpp、LM Studio，以及
  任何 OpenAI 兼容或 Anthropic 兼容的端点）

**媒体：**

- 图片、音频、视频和文档的收发
- 共享的图像生成和视频生成功能
- 语音笔记转录
- 支持多个提供商的文本转语音

**应用和界面：**

- WebChat 和浏览器控制 UI
- macOS 菜单栏配套应用
- 具备配对、Canvas、摄像头、屏幕录制、位置和语音功能的 iOS 节点
- 具备配对、聊天、语音、Canvas、摄像头和设备命令的 Android 节点

**工具和自动化：**

- 浏览器自动化、exec、沙箱
- 网页搜索（Brave、DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Ollama Web Search、Perplexity、SearXNG、Tavily）
- Cron 任务和心跳调度
- Skills、插件和工作流管道（Lobster）

## 相关内容

<CardGroup cols={2}>
  <Card title="实验性功能" href="/concepts/experimental-features" icon="flask">
    目前尚未在默认界面发布的可选启用功能。
  </Card>
  <Card title="代理运行时" href="/concepts/agent" icon="robot">
    代理运行时模型以及运行如何被分派。
  </Card>
  <Card title="渠道" href="/channels" icon="message-square">
    从一个 Gateway 连接 Telegram、WhatsApp、Discord、Slack 等更多渠道。
  </Card>
  <Card title="插件" href="/tools/plugin" icon="plug">
    扩展 OpenClaw 的官方和第三方插件。
  </Card>
</CardGroup>
