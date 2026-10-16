---
summary: "OpenClaw 在各个渠道、路由、媒体和 UX 方面的能力。"
read_when:
  - "你想查看 OpenClaw 支持的完整列表"
title: "功能"
---

## <a id="highlights"></a> 亮点

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
    图片、音频、视频、文档和image/video生成。
  </Card>
  <Card title="应用程序和 UI" icon="monitor" href="/platforms">
    Windows 集线器、浏览器 Control UI、macOS 菜单栏应用程序和移动节点。
  </Card>
  <Card title="移动节点" icon="smartphone" href="/nodes">
    iOS 和 Android 节点具有配对、voice/chat 和丰富的设备命令。
  </Card>
</Columns>

## <a id="full-list"></a> 完整列表

**渠道：**

- A2A、Reef、Telegram 和 WebChat 附带核心安装；每个其他频道都是随 `openclaw plugins install @openclaw/<id>` 安装的官方插件（或在 `openclaw onboard` / `openclaw channels add` 期间按需安装）
- 官方插件渠道：Discord、Feishu、Google Chat、iMessage、IRC、LINE、Matrix、Mattermost、 Microsoft Teams、Nextcloud Talk、Nostr、QQ Bot、Raft、Signal、Slack、SMS、Synology Chat、 Tlon、Twitch、Voice Call、WhatsApp、Zalo 和 Zalo Personal
- 在 OpenClaw 仓库外维护的外部插件渠道：WeChat、Yuanbao 和 Zalo ClawBot
- 支持基于提及激活的群聊
- DM 具有允许列表和配对的安全性

**代理：**

- 内置代理运行时，支持工具流式传输
- 按工作区或发送者进行隔离会话的多代理路由
- Sessions：直接聊天折叠为共享 `main`；默认情况下组是隔离的
- 针对长回复的流式传输和分块

**认证和提供商：**

- 许多 [ 模型提供者](/providers)（Anthropic、OpenAI、Google 等）— 提供者目录是维护的列表
- 通过 OAuth 进行订阅授权 （e.g. OpenAI Codex）
- 自定义和自托管提供商支持（vLLM、SGLang、Ollama、llama.cpp、LM Studio 以及任何 OpenAI- 兼容或 Anthropic- 兼容端点）

**媒体：**

- 支持收发图像、音频、视频和文档
- [跨 Control UI、iOS/macOS、Android 和 Linux 配套应用的内联音频和视频播放](/nodes/media-playback)
- 共享的图像生成和视频生成功能界面
- 语音消息转录
- 支持多个提供商的文本转语音

**应用和界面：**

- WebChat 和浏览器 Control UI
- macOS 菜单栏配套应用
- iOS 节点，具有配对、摄像头、屏幕录制、位置和语音功能
- Android 节点，具有配对、聊天、语音、摄像头和设备命令

**工具和自动化：**

- 浏览器自动化、exec、沙箱
- 网页搜索（Brave、DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Ollama Web Search、Perplexity、SearXNG、Tavily）
- Cron 任务和心跳调度
- Skills、插件和工作流管道（Lobster）

## <a id="related"></a> 相关内容

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
