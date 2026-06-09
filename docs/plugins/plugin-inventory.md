---
summary: "OpenClaw 内置、外部发布或仅保留源码的插件清单"
read_when:
  - 你正在决定一个插件是随核心 npm 包发布还是单独安装
  - 你正在更新打包插件的包元数据或发布自动化
  - 你需要内部与外部插件的权威清单
title: "插件清单"
---

# 插件清单

此页面由 `extensions/*/package.json`、`openclaw.plugin.json`
以及根 npm 包的 `files` 排除项生成。可使用以下命令重新生成：

```bash
pnpm plugins:inventory:gen
```

## 定义

- **核心 npm 包：** 内置于 `openclaw` npm 包中，无需单独安装插件即可使用。
- **官方外部包：** 由 OpenClaw 维护的插件，不包含在核心 npm 包中，保留在此官方清单里，并可通过 ClawHub 和/或 npm 按需安装。
- **仅源码检出：** 仅保留在仓库本地的插件，不包含在已发布的 npm 制品中，也不作为可安装包进行宣传。

源码检出与 npm 安装不同：在 `pnpm install` 之后，捆绑插件从 `extensions/<id>` 加载，因此本地修改和包内工作区依赖都可用。

## 安装插件

使用每个条目中的安装路线来判断是否需要安装。标注为 `included in OpenClaw` 的插件已包含在核心包中。
官方外部包需要安装一次，然后重启 Gateway。

例如，Discord 是一个官方外部包：

```bash
openclaw plugins install @openclaw/discord
openclaw gateway restart
openclaw plugins inspect discord --runtime --json
```

在发布切换期间，普通的裸包规范仍然会从 npm 安装。
在需要明确来源时，请使用 `clawhub:@openclaw/discord` 或 `npm:@openclaw/discord`。
安装后，请按照插件的设置文档（例如
[Discord](/channels/discord)）添加凭据和频道配置。有关更新、卸载和发布
命令，请参见 [管理插件](/plugins/manage-plugins)。

Each entry lists the package, distribution route, and description.

## Core npm package

90 plugins

- **[admin-http-rpc](/plugins/reference/admin-http-rpc)** (`@openclaw/admin-http-rpc`) - included in OpenClaw. OpenClaw admin HTTP RPC endpoint.

- **[alibaba](/plugins/reference/alibaba)** (`@openclaw/alibaba-provider`) - included in OpenClaw. Adds video generation provider support.

- **[anthropic](/plugins/reference/anthropic)** (`@openclaw/anthropic-provider`) - included in OpenClaw. Adds Anthropic model provider support to OpenClaw.

- **[arcee](/plugins/reference/arcee)** (`@openclaw/arcee-provider`) - included in OpenClaw. Adds Arcee model provider support to OpenClaw.

- **[azure-speech](/plugins/reference/azure-speech)** (`@openclaw/azure-speech`) - included in OpenClaw. Azure AI Speech text-to-speech (MP3, native Ogg/Opus voice notes, PCM telephony).

- **[bonjour](/plugins/reference/bonjour)** (`@openclaw/bonjour`) - included in OpenClaw. 通过 Bonjour/mDNS 广播本地 OpenClaw 网关。

- **[browser](/plugins/reference/browser)** (`@openclaw/browser-plugin`) - included in OpenClaw. 添加 agent 可调用工具。

- **[byteplus](/plugins/reference/byteplus)** (`@openclaw/byteplus-provider`) - included in OpenClaw. 向 OpenClaw 添加 BytePlus、BytePlus Plan 模型提供方支持。

- **[canvas](/plugins/reference/canvas)** (`@openclaw/canvas-plugin`) - included in OpenClaw. 面向配对节点的实验性 Canvas 控制和 A2UI 渲染表面。

- **[cerebras](/plugins/reference/cerebras)** (`@openclaw/cerebras-provider`) - included in OpenClaw. 向 OpenClaw 添加 Cerebras 模型提供方支持。

- **[chutes](/plugins/reference/chutes)** (`@openclaw/chutes-provider`) - included in OpenClaw. 向 OpenClaw 添加 Chutes 模型提供方支持。

- **[clickclack](/plugins/reference/clickclack)** (`@openclaw/clickclack`) - included in OpenClaw. 添加用于发送和接收 OpenClaw 消息的 Clickclack 频道表面。

- **[cloudflare-ai-gateway](/plugins/reference/cloudflare-ai-gateway)** (`@openclaw/cloudflare-ai-gateway-provider`) - included in OpenClaw. 向 OpenClaw 添加 Cloudflare AI Gateway 模型提供方支持。

- **[codex-supervisor](/plugins/reference/codex-supervisor)** (`@openclaw/codex-supervisor`) - included in OpenClaw. 从 OpenClaw 管理 Codex app-server 会话。

- **[comfy](/plugins/reference/comfy)** (`@openclaw/comfy-provider`) - included in OpenClaw. 向 OpenClaw 添加 ComfyUI 模型提供方支持。

- **[copilot-proxy](/plugins/reference/copilot-proxy)** (`@openclaw/copilot-proxy`) - included in OpenClaw. 向 OpenClaw 添加 Copilot Proxy 模型提供方支持。

- **[deepgram](/plugins/reference/deepgram)** (`@openclaw/deepgram-provider`) - included in OpenClaw. 添加媒体理解提供方支持。添加实时转录提供方支持。

- **[deepinfra](/plugins/reference/deepinfra)** (`@openclaw/deepinfra-provider`) - included in OpenClaw. 向 OpenClaw 添加 DeepInfra 模型提供方支持。

- **[deepseek](/plugins/reference/deepseek)** (`@openclaw/deepseek-provider`) - included in OpenClaw. 向 OpenClaw 添加 DeepSeek 模型提供方支持。

- **[document-extract](/plugins/reference/document-extract)** (`@openclaw/document-extract-plugin`) - included in OpenClaw. 从本地文档附件中提取文本，并在需要时回退为页面图片。

- **[duckduckgo](/plugins/reference/duckduckgo)** (`@openclaw/duckduckgo-plugin`) - included in OpenClaw. 添加网页搜索提供方支持。

- **[elevenlabs](/plugins/reference/elevenlabs)** (`@openclaw/elevenlabs-speech`) - included in OpenClaw. 添加媒体理解提供方支持。添加实时转录提供方支持。添加文本转语音提供方支持。

- **[exa](/plugins/reference/exa)** (`@openclaw/exa-plugin`) - included in OpenClaw. 添加网页搜索提供方支持。

- **[fal](/plugins/reference/fal)** (`@openclaw/fal-provider`) - included in OpenClaw. 向 OpenClaw 添加 fal 模型提供方支持。

- **[file-transfer](/plugins/reference/file-transfer)** (`@openclaw/file-transfer`) - included in OpenClaw. 通过专用节点命令在配对节点上获取、列出和写入文件。使用 node.invoke 上的 base64 绕过 bash stdout 截断，支持最大 16 MB 的二进制文件。

- **[firecrawl](/plugins/reference/firecrawl)** (`@openclaw/firecrawl-plugin`) - included in OpenClaw. 添加 agent 可调用工具。添加网页获取提供方支持。添加网页搜索提供方支持。

- **[fireworks](/plugins/reference/fireworks)** (`@openclaw/fireworks-provider`) - included in OpenClaw. 向 OpenClaw 添加 Fireworks 模型提供方支持。

- **[github-copilot](/plugins/reference/github-copilot)** (`@openclaw/github-copilot-provider`) - included in OpenClaw. 向 OpenClaw 添加 GitHub Copilot 模型提供方支持。

- **[gmi](/plugins/reference/gmi)** (`@openclaw/gmi-provider`) - included in OpenClaw. 向 OpenClaw 添加 Gmi、Gmi Cloud、Gmicloud 模型提供方支持。

- **[google](/plugins/reference/google)** (`@openclaw/google-plugin`) - included in OpenClaw. 向 OpenClaw 添加 Google、Google Gemini CLI、Google Vertex 模型提供方支持。

- **[gradium](/plugins/reference/gradium)** (`@openclaw/gradium-speech`) - included in OpenClaw. 添加文本转语音提供方支持。

- **[groq](/plugins/reference/groq)** (`@openclaw/groq-provider`) - included in OpenClaw. 向 OpenClaw 添加 Groq 模型提供方支持。

- **[huggingface](/plugins/reference/huggingface)** (`@openclaw/huggingface-provider`) - included in OpenClaw. 向 OpenClaw 添加 Hugging Face 模型提供方支持。

- **[imessage](/plugins/reference/imessage)** (`@openclaw/imessage`) - included in OpenClaw. 添加用于发送和接收 OpenClaw 消息的 iMessage 频道表面。

- **[inworld](/plugins/reference/inworld)** (`@openclaw/inworld-speech`) - included in OpenClaw. Inworld 流式文本转语音（MP3、OGG_OPUS、PCM telephony）。

- **[irc](/plugins/reference/irc)** (`@openclaw/irc`) - included in OpenClaw. 添加用于发送和接收 OpenClaw 消息的 IRC 频道表面。

- **[kilocode](/plugins/reference/kilocode)** (`@openclaw/kilocode-provider`) - included in OpenClaw. 向 OpenClaw 添加 Kilocode 模型提供方支持。

- **[kimi](/plugins/reference/kimi)** (`@openclaw/kimi-provider`) - included in OpenClaw. 向 OpenClaw 添加 Kimi、Kimi Coding 模型提供方支持。

- **[litellm](/plugins/reference/litellm)** (`@openclaw/litellm-provider`) - included in OpenClaw. 向 OpenClaw 添加 LiteLLM 模型提供方支持。

- **[llm-task](/plugins/reference/llm-task)** (`@openclaw/llm-task`) - included in OpenClaw. 可供工作流调用的通用仅 JSON LLM 工具，用于结构化任务。

- **[lmstudio](/plugins/reference/lmstudio)** (`@openclaw/lmstudio-provider`) - included in OpenClaw. 向 OpenClaw 添加 LM Studio 模型提供方支持。

- **[mattermost](/plugins/reference/mattermost)** (`@openclaw/mattermost`) - included in OpenClaw. 添加用于发送和接收 OpenClaw 消息的 Mattermost 频道表面。

- **[memory-core](/plugins/reference/memory-core)** (`@openclaw/memory-core`) - included in OpenClaw. 添加记忆嵌入提供方支持。添加 agent 可调用工具。

- **[memory-wiki](/plugins/reference/memory-wiki)** (`@openclaw/memory-wiki`) - included in OpenClaw. OpenClaw 的持久化 wiki 编译器和面向 Obsidian 的知识库。

- **[microsoft](/plugins/reference/microsoft)** (`@openclaw/microsoft-speech`) - included in OpenClaw. 添加文本转语音提供方支持。

- **[microsoft-foundry](/plugins/reference/microsoft-foundry)** (`@openclaw/microsoft-foundry`) - included in OpenClaw. 向 OpenClaw 添加 Microsoft Foundry 模型提供方支持。

- **[migrate-claude](/plugins/reference/migrate-claude)** (`@openclaw/migrate-claude`) - included in OpenClaw. 将 Claude Code 和 Claude Desktop 的指令、MCP 服务器、技能以及安全配置导入 OpenClaw。

- **[migrate-hermes](/plugins/reference/migrate-hermes)** (`@openclaw/migrate-hermes`) - included in OpenClaw. 将 Hermes 的配置、记忆、技能和受支持凭据导入 OpenClaw。

- **[minimax](/plugins/reference/minimax)** (`@openclaw/minimax-provider`) - included in OpenClaw. 向 OpenClaw 添加 MiniMax、MiniMax Portal 模型提供方支持。

- **[mistral](/plugins/reference/mistral)** (`@openclaw/mistral-provider`) - included in OpenClaw. 向 OpenClaw 添加 Mistral 模型提供方支持。

- **[moonshot](/plugins/reference/moonshot)** (`@openclaw/moonshot-provider`) - included in OpenClaw. 向 OpenClaw 添加 Moonshot 模型提供方支持。

- **[novita](/plugins/reference/novita)** (`@openclaw/novita-provider`) - included in OpenClaw. 向 OpenClaw 添加 Novita、Novita AI、Novitaai 模型提供方支持。

- **[nvidia](/plugins/reference/nvidia)** (`@openclaw/nvidia-provider`) - included in OpenClaw. 向 OpenClaw 添加 NVIDIA 模型提供方支持。

- **[oc-path](/plugins/reference/oc-path)** (`@openclaw/oc-path`) - included in OpenClaw. 添加 openclaw path CLI，用于 `oc://` 工作区文件寻址。

- **[ollama](/plugins/reference/ollama)** (`@openclaw/ollama-provider`) - included in OpenClaw. 向 OpenClaw 添加 Ollama、Ollama Cloud 模型提供方支持。

- **[open-prose](/plugins/reference/open-prose)** (`@openclaw/open-prose`) - included in OpenClaw. 带有 `/prose` 斜杠命令的 OpenProse VM 技能包。

- **[openai](/plugins/reference/openai)** (`@openclaw/openai-provider`) - included in OpenClaw. 向 OpenClaw 添加 OpenAI 模型提供方支持。

- **[opencode](/plugins/reference/opencode)** (`@openclaw/opencode-provider`) - included in OpenClaw. 向 OpenClaw 添加 OpenCode 模型提供方支持。

- **[opencode-go](/plugins/reference/opencode-go)** (`@openclaw/opencode-go-provider`) - included in OpenClaw. 向 OpenClaw 添加 OpenCode Go 模型提供方支持。

- **[openrouter](/plugins/reference/openrouter)** (`@openclaw/openrouter-provider`) - included in OpenClaw. 向 OpenClaw 添加 OpenRouter 模型提供方支持。

- **[parallel](/tools/parallel-search)** (`@openclaw/parallel-plugin`) - included in OpenClaw. 添加网页搜索提供方支持。

- **[perplexity](/plugins/reference/perplexity)** (`@openclaw/perplexity-plugin`) - included in OpenClaw. 添加网页搜索提供方支持。

- **[policy](/plugins/reference/policy)** (`@openclaw/policy`) - included in OpenClaw. 添加由策略支持的 workspace 一致性 doctor 检查。

- **[qianfan](/plugins/reference/qianfan)** (`@openclaw/qianfan-provider`) - included in OpenClaw. 向 OpenClaw 添加 Qianfan 模型提供方支持。

- **[qwen](/plugins/reference/qwen)** (`@openclaw/qwen-provider`) - included in OpenClaw. 向 OpenClaw 添加 Qwen、Qwen Cloud、Model Studio、DashScope、Qwen Oauth、Qwen Portal、Qwen CLI 模型提供方支持。

- **[runway](/plugins/reference/runway)** (`@openclaw/runway-provider`) - included in OpenClaw. 添加视频生成提供方支持。

- **[searxng](/plugins/reference/searxng)** (`@openclaw/searxng-plugin`) - included in OpenClaw. 添加网页搜索提供方支持。

- **[senseaudio](/plugins/reference/senseaudio)** (`@openclaw/senseaudio-provider`) - included in OpenClaw. 添加媒体理解提供方支持。

- **[sglang](/plugins/reference/sglang)** (`@openclaw/sglang-provider`) - included in OpenClaw. 向 OpenClaw 添加 SGLang 模型提供方支持。

- **[signal](/plugins/reference/signal)** (`@openclaw/signal`) - included in OpenClaw. 添加用于发送和接收 OpenClaw 消息的 Signal 频道表面。

- **[sms](/plugins/reference/sms)** (`@openclaw/sms`) - included in OpenClaw. OpenClaw 的 Twilio SMS 频道插件，用于文本消息。

- **[stepfun](/plugins/reference/stepfun)** (`@openclaw/stepfun-provider`) - included in OpenClaw. 向 OpenClaw 添加 StepFun、StepFun Plan 模型提供方支持。

- **[synthetic](/plugins/reference/synthetic)** (`@openclaw/synthetic-provider`) - included in OpenClaw. 向 OpenClaw 添加 Synthetic 模型提供方支持。

- **[tavily](/plugins/reference/tavily)** (`@openclaw/tavily-plugin`) - included in OpenClaw. 添加 agent 可调用工具。添加网页搜索提供方支持。

- **[telegram](/plugins/reference/telegram)** (`@openclaw/telegram`) - included in OpenClaw. 添加用于发送和接收 OpenClaw 消息的 Telegram 频道表面。

- **[tencent](/plugins/reference/tencent)** (`@openclaw/tencent-provider`) - included in OpenClaw. 向 OpenClaw 添加 Tencent TokenHub 模型提供方支持。

- **[together](/plugins/reference/together)** (`@openclaw/together-provider`) - included in OpenClaw. 向 OpenClaw 添加 Together 模型提供方支持。

- **[tts-local-cli](/plugins/reference/tts-local-cli)** (`@openclaw/tts-local-cli`) - included in OpenClaw. 添加文本转语音提供方支持。

- **[venice](/plugins/reference/venice)** (`@openclaw/venice-provider`) - included in OpenClaw. 向 OpenClaw 添加 Venice 模型提供方支持。

- **[vercel-ai-gateway](/plugins/reference/vercel-ai-gateway)** (`@openclaw/vercel-ai-gateway-provider`) - included in OpenClaw. 向 OpenClaw 添加 Vercel AI Gateway 模型提供方支持。

- **[vllm](/plugins/reference/vllm)** (`@openclaw/vllm-provider`) - included in OpenClaw. 向 OpenClaw 添加 vLLM 模型提供方支持。

- **[volcengine](/plugins/reference/volcengine)** (`@openclaw/volcengine-provider`) - included in OpenClaw. 向 OpenClaw 添加 Volcengine、Volcengine Plan 模型提供方支持。

- **[voyage](/plugins/reference/voyage)** (`@openclaw/voyage-provider`) - included in OpenClaw. 添加记忆嵌入提供方支持。

- **[vydra](/plugins/reference/vydra)** (`@openclaw/vydra-provider`) - included in OpenClaw. 向 OpenClaw 添加 Vydra 模型提供方支持。

- **[web-readability](/plugins/reference/web-readability)** (`@openclaw/web-readability-plugin`) - included in OpenClaw. 从本地 HTML 网页获取响应中提取可读文章内容。

- **[webhooks](/plugins/reference/webhooks)** (`@openclaw/webhooks`) - included in OpenClaw. 经过认证的入站 webhook，用于将外部自动化绑定到 OpenClaw TaskFlows。

- **[workboard](/plugins/reference/workboard)** (`@openclaw/workboard`) - included in OpenClaw. 面向 agent 拥有的问题与会话的仪表板工作板。

- **[xai](/plugins/reference/xai)** (`@openclaw/xai-plugin`) - included in OpenClaw. 向 OpenClaw 添加 xAI 模型提供方支持。

- **[xiaomi](/plugins/reference/xiaomi)** (`@openclaw/xiaomi-provider`) - included in OpenClaw. 向 OpenClaw 添加 Xiaomi、Xiaomi Token Plan 模型提供方支持。

- **[zai](/plugins/reference/zai)** (`@openclaw/zai-provider`) - included in OpenClaw. 向 OpenClaw 添加 Z.AI 模型提供方支持。

## 官方外部包

34 个插件

- **[acpx](/plugins/reference/acpx)** (`@openclaw/acpx`) - npm；ClawHub。OpenClaw ACP 运行时后端，提供由插件拥有的会话和传输管理。

- **[amazon-bedrock](/plugins/reference/amazon-bedrock)** (`@openclaw/amazon-bedrock-provider`) - npm；ClawHub。OpenClaw Amazon Bedrock 提供程序插件，支持模型发现、嵌入和护栏。

- **[amazon-bedrock-mantle](/plugins/reference/amazon-bedrock-mantle)** (`@openclaw/amazon-bedrock-mantle-provider`) - npm；ClawHub。OpenClaw Amazon Bedrock Mantle 提供程序插件，用于与 OpenAI 兼容的模型路由。

- **[anthropic-vertex](/plugins/reference/anthropic-vertex)** (`@openclaw/anthropic-vertex-provider`) - npm；ClawHub。OpenClaw Anthropic Vertex 提供程序插件，用于 Google Vertex AI 上的 Claude 模型。

- **[brave](/plugins/reference/brave)** (`@openclaw/brave-plugin`) - npm；ClawHub。OpenClaw Brave Search 提供程序插件，用于网页搜索。

- **[codex](/plugins/reference/codex)** (`@openclaw/codex`) - npm；ClawHub。OpenClaw Codex 应用服务器支架和模型提供程序插件，带有由 Codex 管理的 GPT 目录。

- **[copilot](/plugins/reference/copilot)** (`@openclaw/copilot`) - npm；ClawHub：`clawhub:@openclaw/copilot`。注册 GitHub Copilot 代理运行时。

- **[diagnostics-otel](/plugins/reference/diagnostics-otel)** (`@openclaw/diagnostics-otel`) - npm；ClawHub：`clawhub:@openclaw/diagnostics-otel`。OpenClaw 诊断 OpenTelemetry 导出器，用于指标和追踪。

- **[diagnostics-prometheus](/plugins/reference/diagnostics-prometheus)** (`@openclaw/diagnostics-prometheus`) - npm；ClawHub：`clawhub:@openclaw/diagnostics-prometheus`。OpenClaw 诊断 Prometheus 导出器，用于运行时指标。

- **[diffs](/plugins/reference/diffs)** (`@openclaw/diffs`) - npm；ClawHub。OpenClaw 只读差异查看器插件和供代理使用的文件渲染器。

- **[diffs-language-pack](/plugins/reference/diffs-language-pack)** (`@openclaw/diffs-language-pack`) - npm；ClawHub：`clawhub:@openclaw/diffs-language-pack`。为默认 diffs 查看器集合之外的语言添加语法高亮。

- **[discord](/plugins/reference/discord)** (`@openclaw/discord`) - npm；ClawHub。OpenClaw Discord 渠道插件，支持频道、私信、命令和应用事件。

- **[feishu](/plugins/reference/feishu)** (`@openclaw/feishu`) - npm；ClawHub。OpenClaw 飞书/Lark 渠道插件，用于聊天和办公工具（由 @m1heng 社区维护）。

- **[google-meet](/plugins/reference/google-meet)** (`@openclaw/google-meet`) - npm；ClawHub。OpenClaw Google Meet 参与者插件，用于通过 Chrome 或 Twilio 传输加入通话。

- **[googlechat](/plugins/reference/googlechat)** (`@openclaw/googlechat`) - npm；ClawHub。OpenClaw Google Chat 渠道插件，用于空间和直接消息。

- **[line](/plugins/reference/line)** (`@openclaw/line`) - npm；ClawHub。OpenClaw LINE 渠道插件，用于 LINE Bot API 聊天。

- **[lobster](/plugins/reference/lobster)** (`@openclaw/lobster`) - npm；ClawHub。Lobster 工作流工具插件，支持类型化流水线和可恢复审批。

- **[matrix](/plugins/reference/matrix)** (`@openclaw/matrix`) - ClawHub：`clawhub:@openclaw/matrix`；npm。OpenClaw Matrix 渠道插件，用于房间和直接消息。

- **[memory-lancedb](/plugins/reference/memory-lancedb)** (`@openclaw/memory-lancedb`) - npm；ClawHub。OpenClaw 基于 LanceDB 的长期记忆插件，支持自动召回、自动捕获和向量搜索。

- **[msteams](/plugins/reference/msteams)** (`@openclaw/msteams`) - npm；ClawHub。OpenClaw Microsoft Teams 渠道插件，用于机器人对话。

- **[nextcloud-talk](/plugins/reference/nextcloud-talk)** (`@openclaw/nextcloud-talk`) - npm；ClawHub。OpenClaw Nextcloud Talk 渠道插件，用于对话。

- **[nostr](/plugins/reference/nostr)** (`@openclaw/nostr`) - npm；ClawHub。OpenClaw Nostr 渠道插件，用于 NIP-04 加密的直接消息。

- **[openshell](/plugins/reference/openshell)** (`@openclaw/openshell-sandbox`) - npm；ClawHub。NVIDIA OpenShell CLI 的 OpenClaw 沙箱后端，提供镜像本地工作区和 SSH 命令执行。

- **[pixverse](/plugins/reference/pixverse)** (`@openclaw/pixverse-provider`) - npm；ClawHub：`clawhub:@openclaw/pixverse-provider`。OpenClaw PixVerse 视频生成提供程序插件。

- **[qqbot](/plugins/reference/qqbot)** (`@openclaw/qqbot`) - npm；ClawHub。OpenClaw QQ Bot 渠道插件，用于群组和直接消息工作流。

- **[slack](/plugins/reference/slack)** (`@openclaw/slack`) - npm；ClawHub。OpenClaw Slack 渠道插件，支持频道、私信、命令和应用事件。

- **[synology-chat](/plugins/reference/synology-chat)** (`@openclaw/synology-chat`) - npm；ClawHub。用于 OpenClaw 频道和直接消息的 Synology Chat 渠道插件。

- **[tlon](/plugins/reference/tlon)** (`@openclaw/tlon`) - npm；ClawHub。OpenClaw Tlon/Urbit 渠道插件，用于聊天工作流。

- **[tokenjuice](/plugins/reference/tokenjuice)** (`@openclaw/tokenjuice`) - npm；ClawHub：`clawhub:@openclaw/tokenjuice`。使用 tokenjuice reducer 压缩 exec 和 bash 工具结果。

- **[twitch](/plugins/reference/twitch)** (`@openclaw/twitch`) - npm；ClawHub。OpenClaw Twitch 渠道插件，用于聊天和审核工作流。

- **[voice-call](/plugins/reference/voice-call)** (`@openclaw/voice-call`) - npm；ClawHub。OpenClaw 语音通话插件，适用于 Twilio、Telnyx 和 Plivo 电话呼叫。

- **[whatsapp](/plugins/reference/whatsapp)** (`@openclaw/whatsapp`) - ClawHub：`clawhub:@openclaw/whatsapp`；npm。OpenClaw WhatsApp 渠道插件，用于 WhatsApp Web 聊天。

- **[zalo](/plugins/reference/zalo)** (`@openclaw/zalo`) - npm；ClawHub。OpenClaw Zalo 渠道插件，用于机器人和 Webhook 聊天。

- **[zalouser](/plugins/reference/zalouser)** (`@openclaw/zalouser`) - npm；ClawHub。通过原生 zca-js 集成的 OpenClaw Zalo 个人账户插件。

## 仅源代码检出

3 个插件

- **[qa-channel](/plugins/reference/qa-channel)** (`@openclaw/qa-channel`) - 仅源代码检出。添加 QA Channel 界面，用于发送和接收 OpenClaw 消息。

- **[qa-lab](/plugins/reference/qa-lab)** (`@openclaw/qa-lab`) - 仅源代码检出。OpenClaw QA 实验室插件，带有私有调试器界面和场景运行器。

- **[qa-matrix](/plugins/reference/qa-matrix)** (`@openclaw/qa-matrix`) - 仅源代码检出。Matrix QA 传输运行器和基础层。
