---
summary: "OpenClaw 在渠道、路由、媒体和用户体验方面的功能。"
read_when:
  - 您想要一份 OpenClaw 支持功能的完整列表
title: "功能"
---

## 亮点

<Columns>
  <Card title="渠道" icon="message-square" href="/channels">
    Discord、iMessage、Signal、Slack、Telegram、WhatsApp、WebChat 等，只需一个 Gateway。
  </Card>
  <Card title="插件" icon="plug" href="/tools/plugin">
    捆绑插件可在正常的当前版本中无需单独安装即可添加 Matrix、Nextcloud Talk、Nostr、Twitch、Zalo 等更多渠道。
  </Card>
  <Card title="路由" icon="route" href="/concepts/multi-agent">
    具有隔离会话的多代理路由。
  </Card>
  <Card title="媒体" icon="image" href="/nodes/images">
    图片、音频、视频、文档，以及图像/视频生成。
  </Card>
  <Card title="应用和 UI" icon="monitor" href="/web/control-ui">
    Web 控制 UI 和 macOS 伴生应用。
  </Card>
  <Card title="移动节点" icon="smartphone" href="/nodes">
    支持配对、语音/聊天以及丰富设备命令的 iOS 和 Android 节点。
  </Card>
</Columns>

## 完整列表

**渠道：**

- 内置渠道包括 Discord、Google Chat、iMessage（旧版）、IRC、Signal、Slack、Telegram、WebChat 和 WhatsApp
- 捆绑插件渠道包括用于 iMessage 的 BlueBubbles、Feishu、LINE、Matrix、Mattermost、Microsoft Teams、Nextcloud Talk、Nostr、QQ Bot、Synology Chat、Tlon、Twitch、Zalo 和 Zalo Personal
- 可选单独安装的渠道插件包括语音通话以及第三方包（如微信）
- 第三方渠道插件可以进一步扩展网关，例如微信
- 支持群聊，基于提及激活
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

- 支持图片、音频、视频和文档的输入输出
- 共享图片生成和视频生成功能界面
- 语音笔记转录
- 支持多种提供商的文本转语音

**应用和界面：**

- WebChat 和浏览器控制界面
- macOS 菜单栏伴生应用
- iOS 节点，支持配对、Canvas、相机、屏幕录制、位置和语音
- Android 节点，支持配对、聊天、语音、Canvas、相机和设备命令

**工具和自动化：**

- Browser automation, exec, sandboxing
- Web search (Brave, DuckDuckGo, Exa, Firecrawl, Gemini, Grok, Kimi, MiniMax Search, Ollama Web Search, Perplexity, SearXNG, Tavily)
- Cron jobs and heartbeat scheduling
- Skills, plugins, and workflow pipelines (Lobster)

## 相关

- [Experimental features](/concepts/experimental-features)
- [Agent runtime](/concepts/agent)
