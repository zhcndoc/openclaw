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

- **核心 npm 包：** 内置于 `openclaw` npm 包中，无需安装单独的插件即可使用。
- **官方外部包：** 由 OpenClaw 维护的插件，不包含在核心 npm 包中，保存在此官方列表中，并可通过 ClawHub 和/或 npm 按需安装。
- **仅源码检出：** 仅保留在本地仓库中的插件，不包含在已发布的 npm 制品中，也不会作为可安装包进行推广。

源码检出与 npm 安装不同：在 `pnpm install` 之后，捆绑插件会从 `extensions/<id>` 加载，因此本地修改和包内工作区依赖都可用。

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

每个条目列出包名、分发路线和描述。

## 核心 npm 包

54 个插件

- **[admin-http-rpc](/plugins/reference/admin-http-rpc)** (`@openclaw/admin-http-rpc`) - 包含在 OpenClaw 中。OpenClaw 管理 HTTP RPC 端点。

- **[alibaba](/plugins/reference/alibaba)** (`@openclaw/alibaba-provider`) - 包含在 OpenClaw 中。添加视频生成提供方支持。

- **[anthropic](/plugins/reference/anthropic)** (`@openclaw/anthropic-provider`) - 包含在 OpenClaw 中。Anthropic 模型、Claude CLI 和原生 Claude 会话目录。

- **[azure-speech](/plugins/reference/azure-speech)** (`@openclaw/azure-speech`) - 包含在 OpenClaw 中。Azure AI Speech 文本转语音（MP3、原生 Ogg/Opus 语音笔记、PCM 电话语音）。

- **[beam](/plugins/reference/beam)** (`@openclaw/beam`) - 包含在 OpenClaw 中。只读的编码会话 Beam 接收器。

- **[bonjour](/plugins/reference/bonjour)** (`@openclaw/bonjour`) - 包含在 OpenClaw 中。通过 Bonjour/mDNS 广播本地 OpenClaw 网关。

- **[browser](/plugins/reference/browser)** (`@openclaw/browser-plugin`) - 包含在 OpenClaw 中。添加 agent 可调用工具。

- **[canvas](/plugins/reference/canvas)** (`@openclaw/canvas-plugin`) - 包含在 OpenClaw 中。为配对节点提供实验性的 Canvas 控制和 A2UI 渲染界面。

- **[clawrouter](/plugins/reference/clawrouter)** (`@openclaw/clawrouter`) - 包含在 OpenClaw 中。向 OpenClaw 添加 ClawRouter 模型提供方支持。

- **[copilot-proxy](/plugins/reference/copilot-proxy)** (`@openclaw/copilot-proxy`) - 包含在 OpenClaw 中。向 OpenClaw 添加 Copilot Proxy 模型提供方支持。

- **[crabbox](/plugins/reference/crabbox)** (`@openclaw/crabbox-provider`) - 包含在 OpenClaw 中。由 Crabbox CLI 支持的云工作器提供方。

- **[cua-computer](/plugins/reference/cua-computer)** (`@openclaw/cua-computer`) - 包含在 OpenClaw 中。面向 Windows 和 Linux 节点主机的实验性 CUA Driver SDK 计算机控制。

- **[deepgram](/plugins/reference/deepgram)** (`@openclaw/deepgram-provider`) - 包含在 OpenClaw 中。添加媒体理解提供方支持。添加实时转录提供方支持。

- **[document-extract](/plugins/reference/document-extract)** (`@openclaw/document-extract-plugin`) - 包含在 OpenClaw 中。从本地文档附件中提取文本和备用页图像。

- **[elevenlabs](/plugins/reference/elevenlabs)** (`@openclaw/elevenlabs-speech`) - 包含在 OpenClaw 中。添加媒体理解提供方支持。添加实时转录提供方支持。添加文本转语音提供方支持。

- **[fal](/plugins/reference/fal)** (`@openclaw/fal-provider`) - 包含在 OpenClaw 中。为 OpenClaw 添加 fal 模型提供方支持。

- **[file-transfer](/plugins/reference/file-transfer)** (`@openclaw/file-transfer`) - 包含在 OpenClaw 中。通过专用节点命令在配对节点上获取、列出和写入文件。使用 node.invoke 上的 base64 绕过 bash stdout 截断，支持最大 16 MB 的二进制文件。

- **[github-copilot](/plugins/reference/github-copilot)** (`@openclaw/github-copilot-provider`) - 包含在 OpenClaw 中。为 OpenClaw 添加 GitHub Copilot 模型提供方支持。

- **[google](/plugins/reference/google)** (`@openclaw/google-plugin`) - 包含在 OpenClaw 中。为 OpenClaw 添加 Google、Google Gemini CLI、Google Vertex 模型提供方支持。

- **[huggingface](/plugins/reference/huggingface)** (`@openclaw/huggingface-provider`) - 包含在 OpenClaw 中。为 OpenClaw 添加 Hugging Face 模型提供方支持。

- **[linux-canvas](/plugins/reference/linux-canvas)** (`@openclaw/linux-canvas`) - 包含在 OpenClaw 中。OpenClaw Linux 桌面应用的 Canvas 渲染桥接。

- **[linux-node](/plugins/reference/linux-node)** (`@openclaw/linux-node`) - 包含在 OpenClaw 中。Linux 节点主机的桌面通知、摄像头捕获和位置功能。

- **[litellm](/plugins/reference/litellm)** (`@openclaw/litellm-provider`) - 包含在 OpenClaw 中。为 OpenClaw 添加 LiteLLM 模型提供方支持。

- **[llm-task](/plugins/reference/llm-task)** (`@openclaw/llm-task`) - 包含在 OpenClaw 中。可供工作流调用的通用仅 JSON LLM 工具，用于结构化任务。

- **[lmstudio](/plugins/reference/lmstudio)** (`@openclaw/lmstudio-provider`) - 包含在 OpenClaw 中。向 OpenClaw 添加 LM Studio 模型提供方支持。

- **[logbook](/plugins/reference/logbook)** (`@openclaw/logbook`) - 包含在 OpenClaw 中。自动工作日志：从配对节点定期捕获屏幕快照，并将其转换为可回顾的日程时间线。

- **[memory-core](/plugins/reference/memory-core)** (`@openclaw/memory-core`) - 包含在 OpenClaw 中。添加 agent 可调用工具。

- **[memory-wiki](/plugins/reference/memory-wiki)** (`@openclaw/memory-wiki`) - 包含在 OpenClaw 中。OpenClaw 的持久化 wiki 编译器和面向 Obsidian 的知识库。

- **[microsoft](/plugins/reference/microsoft)** (`@openclaw/microsoft-speech`) - 包含在 OpenClaw 中。添加文本转语音提供方支持。

- **[microsoft-foundry](/plugins/reference/microsoft-foundry)** (`@openclaw/microsoft-foundry`) - 包含在 OpenClaw 中。向 OpenClaw 添加 Microsoft Foundry 模型提供方支持。

- **[migrate-claude](/plugins/reference/migrate-claude)** (`@openclaw/migrate-claude`) - 包含在 OpenClaw 中。将 Claude Code 和 Claude Desktop 的指令、MCP 服务器、技能以及安全配置导入 OpenClaw。

- **[migrate-hermes](/plugins/reference/migrate-hermes)** (`@openclaw/migrate-hermes`) - 包含在 OpenClaw 中。将 Hermes 的配置、记忆、技能和受支持凭据导入 OpenClaw。

- **[minimax](/plugins/reference/minimax)** (`@openclaw/minimax-provider`) - 包含在 OpenClaw 中。向 OpenClaw 添加 MiniMax、MiniMax Portal 模型提供方支持。

- **[nvidia](/plugins/reference/nvidia)** (`@openclaw/nvidia-provider`) - 包含在 OpenClaw 中。向 OpenClaw 添加 NVIDIA 模型提供方支持。

- **[oc-path](/plugins/reference/oc-path)** (`@openclaw/oc-path`) - 包含在 OpenClaw 中。添加 openclaw path CLI，用于 `oc://` 工作区文件寻址。

- **[ollama](/plugins/reference/ollama)** (`@openclaw/ollama-provider`) - 包含在 OpenClaw 中。向 OpenClaw 添加 Ollama、Ollama Cloud 模型提供方支持。

- **[onepassword](/plugins/reference/onepassword)** (`@openclaw/onepassword`) - 包含在 OpenClaw 中。1Password SecretRef 解析器和精选 agent 代理，支持审批策略和 SQLite 审计历史记录。

- **[open-prose](/plugins/reference/open-prose)** (`@openclaw/open-prose`) - 包含在 OpenClaw 中。带有 `/prose` 斜杠命令的 OpenProse VM 技能包。

- **[openai](/plugins/reference/openai)** (`@openclaw/openai-provider`) - 包含在 OpenClaw 中。向 OpenClaw 添加 OpenAI 模型提供方支持。

- **[openrouter](/plugins/reference/openrouter)** (`@openclaw/openrouter-provider`) - 包含在 OpenClaw 中。向 OpenClaw 添加 OpenRouter 模型提供方支持。

- **[policy](/plugins/reference/policy)** (`@openclaw/policy`) - 包含在 OpenClaw 中。添加由策略支持的 workspace 合规性 doctor 检查。

- **[reef](/plugins/reference/reef)** (`@openclaw/reef`) - 包含在 OpenClaw 中。受保护的端到端加密 claw 频道。

- **[runway](/plugins/reference/runway)** (`@openclaw/runway-provider`) - 包含在 OpenClaw 中。添加视频生成提供方支持。

- **[senseaudio](/plugins/reference/senseaudio)** (`@openclaw/senseaudio-provider`) - 包含在 OpenClaw 中。添加媒体理解提供方支持。

- **[sglang](/plugins/reference/sglang)** (`@openclaw/sglang-provider`) - 包含在 OpenClaw 中。向 OpenClaw 添加 SGLang 模型提供方支持。

- **[telegram](/plugins/reference/telegram)** (`@openclaw/telegram`) - 包含在 OpenClaw 中。添加 Telegram 频道界面，用于发送和接收 OpenClaw 消息。

- **[together](/plugins/reference/together)** (`@openclaw/together-provider`) - 包含在 OpenClaw 中。向 OpenClaw 添加 Together 模型提供方支持。

- **[tts-local-cli](/plugins/reference/tts-local-cli)** (`@openclaw/tts-local-cli`) - 包含在 OpenClaw 中。添加文本转语音提供方支持。

- **[vault](/plugins/reference/vault)** (`@openclaw/vault`) - 包含在 OpenClaw 中。HashiCorp Vault SecretRef 提供方集成。

- **[vllm](/plugins/reference/vllm)** (`@openclaw/vllm-provider`) - 包含在 OpenClaw 中。向 OpenClaw 添加 vLLM 模型提供方支持。

- **[web-readability](/plugins/reference/web-readability)** (`@openclaw/web-readability-plugin`) - 包含在 OpenClaw 中。从本地 HTML 网页抓取响应中提取可读的文章内容。

- **[webhooks](/plugins/reference/webhooks)** (`@openclaw/webhooks`) - 包含在 OpenClaw 中。经过认证的入站 webhook，用于将外部自动化绑定到 OpenClaw TaskFlows。

- **[workboard](/plugins/reference/workboard)** (`@openclaw/workboard`) - 包含在 OpenClaw 中。面向 agent 拥有的问题与会话的仪表板工作板。

- **[xai](/plugins/reference/xai)** (`@openclaw/xai-plugin`) - 包含在 OpenClaw 中。向 OpenClaw 添加 xAI 模型提供方支持。

## 官方外部包

91 个插件

- **[acpx](/plugins/reference/acpx)** (`@openclaw/acpx`) - npm；ClawHub。OpenClaw ACP 运行时后端，提供由插件拥有的会话和传输管理。

- **[amazon-bedrock](/plugins/reference/amazon-bedrock)** (`@openclaw/amazon-bedrock-provider`) - npm；ClawHub。OpenClaw Amazon Bedrock 提供程序插件，支持模型发现、嵌入和护栏。

- **[amazon-bedrock-mantle](/plugins/reference/amazon-bedrock-mantle)** (`@openclaw/amazon-bedrock-mantle-provider`) - npm；ClawHub。OpenClaw Amazon Bedrock Mantle 提供程序插件，用于与 OpenAI 兼容的模型路由。

- **[anthropic-vertex](/plugins/reference/anthropic-vertex)** (`@openclaw/anthropic-vertex-provider`) - npm；ClawHub。OpenClaw Anthropic Vertex 提供程序插件，用于 Google Vertex AI 上的 Claude 模型。

- **[arcee](/plugins/reference/arcee)** (`@openclaw/arcee-provider`) - npm；ClawHub：`clawhub:@openclaw/arcee-provider`。为 OpenClaw 添加 Arcee 模型提供方支持。

- **[baseten](/plugins/reference/baseten)** (`@openclaw/baseten-provider`) - npm；ClawHub：`clawhub:@openclaw/baseten-provider`。OpenClaw Baseten 提供程序插件。

- **[brave](/plugins/reference/brave)** (`@openclaw/brave-plugin`) - npm；ClawHub。用于网页搜索的 OpenClaw Brave Search 提供程序插件。

- **[buzz](/plugins/reference/buzz)** (`@openclaw/buzz`) - npm；ClawHub：`clawhub:@openclaw/buzz`。将 OpenClaw agent 连接到 Buzz 房间。

- **[byteplus](/plugins/reference/byteplus)** (`@openclaw/byteplus-provider`) - npm；ClawHub：`clawhub:@openclaw/byteplus-provider`。为 OpenClaw 添加 BytePlus、BytePlus Plan 模型提供方支持。

- **[cerebras](/plugins/reference/cerebras)** (`@openclaw/cerebras-provider`) - npm；ClawHub：`clawhub:@openclaw/cerebras-provider`。为 OpenClaw 添加 Cerebras 模型提供方支持。

- **[chutes](/plugins/reference/chutes)** (`@openclaw/chutes-provider`) - npm；ClawHub：`clawhub:@openclaw/chutes-provider`。为 OpenClaw 添加 Chutes 模型提供方支持。

- **[clickclack](/plugins/reference/clickclack)** (`@openclaw/clickclack`) - npm；ClawHub：`clawhub:@openclaw/clickclack`。添加用于发送和接收 OpenClaw 消息的 Clickclack 频道表面。

- **[cloudflare-ai-gateway](/plugins/reference/cloudflare-ai-gateway)** (`@openclaw/cloudflare-ai-gateway-provider`) - npm；ClawHub：`clawhub:@openclaw/cloudflare-ai-gateway-provider`。为 OpenClaw 添加 Cloudflare AI Gateway 模型提供方支持。

- **[codex](/plugins/reference/codex)** (`@openclaw/codex`) - npm；ClawHub。Codex app-server 工具和原生会话目录。

- **[cohere](/plugins/reference/cohere)** (`@openclaw/cohere-provider`) - npm；ClawHub：`clawhub:@openclaw/cohere-provider`。OpenClaw Cohere 提供程序插件。

- **[comfy](/plugins/reference/comfy)** (`@openclaw/comfy-provider`) - npm；ClawHub：`clawhub:@openclaw/comfy-provider`。为 OpenClaw 添加 ComfyUI 模型提供方支持。

- **[copilot](/plugins/reference/copilot)** (`@openclaw/copilot`) - npm；ClawHub：`clawhub:@openclaw/copilot`。注册 GitHub Copilot agent 运行时。

- **[deepinfra](/plugins/reference/deepinfra)** (`@openclaw/deepinfra-provider`) - npm；ClawHub：`clawhub:@openclaw/deepinfra-provider`。为 OpenClaw 添加 DeepInfra 模型提供方支持。

- **[deepseek](/plugins/reference/deepseek)** (`@openclaw/deepseek-provider`) - npm；ClawHub：`clawhub:@openclaw/deepseek-provider`。为 OpenClaw 添加 DeepSeek 模型提供方支持。

- **[diagnostics-otel](/plugins/reference/diagnostics-otel)** (`@openclaw/diagnostics-otel`) - npm；ClawHub：`clawhub:@openclaw/diagnostics-otel`。OpenClaw 诊断 OpenTelemetry 导出器，用于指标、链路追踪和日志。

- **[diagnostics-prometheus](/plugins/reference/diagnostics-prometheus)** (`@openclaw/diagnostics-prometheus`) - npm；ClawHub：`clawhub:@openclaw/diagnostics-prometheus`。OpenClaw 诊断 Prometheus 导出器，用于运行时指标。

- **[diffs](/plugins/reference/diffs)** (`@openclaw/diffs`) - npm；ClawHub。OpenClaw 只读差异查看器插件和供 agent 使用的文件渲染器。

- **[diffs-language-pack](/plugins/reference/diffs-language-pack)** (`@openclaw/diffs-language-pack`) - npm；ClawHub：`clawhub:@openclaw/diffs-language-pack`。为默认 diffs 查看器集合之外的语言添加语法高亮。

- **[discord](/plugins/reference/discord)** (`@openclaw/discord`) - npm；ClawHub。OpenClaw Discord 频道插件，支持频道、私信、命令和应用事件。

- **[duckduckgo](/plugins/reference/duckduckgo)** (`@openclaw/duckduckgo-plugin`) - npm；ClawHub：`clawhub:@openclaw/duckduckgo-plugin`。添加网页搜索提供方支持。

- **[exa](/plugins/reference/exa)** (`@openclaw/exa-plugin`) - npm；ClawHub：`clawhub:@openclaw/exa-plugin`。添加网页搜索提供方支持。

- **[featherless](/plugins/reference/featherless)** (`@openclaw/featherless-provider`) - npm；ClawHub：`clawhub:@openclaw/featherless-provider`。OpenClaw Featherless AI 提供程序插件。

- **[feishu](/plugins/reference/feishu)** (`@openclaw/feishu`) - npm；ClawHub。OpenClaw 飞书/Lark 频道插件，用于聊天和办公工具（由 @m1heng 社区维护）。

- **[firecrawl](/plugins/reference/firecrawl)** (`@openclaw/firecrawl-plugin`) - npm；ClawHub：`clawhub:@openclaw/firecrawl-plugin`。添加 agent 可调用工具。添加网页抓取提供方支持。添加网页搜索提供方支持。

- **[fireworks](/plugins/reference/fireworks)** (`@openclaw/fireworks-provider`) - npm；ClawHub：`clawhub:@openclaw/fireworks-provider`。为 OpenClaw 添加 Fireworks 模型提供方支持。

- **[fish-audio](/plugins/reference/fish-audio)** (`@openclaw/fish-audio-speech`) - npm；ClawHub：`clawhub:@openclaw/fish-audio-speech`。Fish Audio S2.1 托管式文本转语音，支持流式传输、语音笔记和电话系统输出。

- **[gmi](/plugins/reference/gmi)** (`@openclaw/gmi-provider`) - npm；ClawHub：`clawhub:@openclaw/gmi-provider`。OpenClaw GMI Cloud 提供程序插件。

- **[google-meet](/plugins/reference/google-meet)** (`@openclaw/google-meet`) - npm；ClawHub。OpenClaw Google Meet 参与者插件，用于通过 Chrome 或 Twilio 传输加入通话。

- **[googlechat](/plugins/reference/googlechat)** (`@openclaw/googlechat`) - npm；ClawHub。OpenClaw Google Chat 频道插件，用于空间和直接消息。

- **[gradium](/plugins/reference/gradium)** (`@openclaw/gradium-speech`) - npm；ClawHub：`clawhub:@openclaw/gradium-speech`。添加文本转语音提供方支持。

- **[groq](/plugins/reference/groq)** (`@openclaw/groq-provider`) - npm；ClawHub：`clawhub:@openclaw/groq-provider`。为 OpenClaw 添加 Groq 模型提供方支持。

- **[imessage](/plugins/reference/imessage)** (`@openclaw/imessage`) - npm；ClawHub：`clawhub:@openclaw/imessage`。添加用于发送和接收 OpenClaw 消息的 iMessage 频道表面。

- **[inworld](/plugins/reference/inworld)** (`@openclaw/inworld-speech`) - npm；ClawHub：`clawhub:@openclaw/inworld-speech`。Inworld 流式文本转语音（MP3、OGG_OPUS、电话系统 PCM）。

- **[irc](/plugins/reference/irc)** (`@openclaw/irc`) - npm；ClawHub：`clawhub:@openclaw/irc`。添加用于发送和接收 OpenClaw 消息的 IRC 频道表面。

- **[kilocode](/plugins/reference/kilocode)** (`@openclaw/kilocode-provider`) - npm；ClawHub：`clawhub:@openclaw/kilocode-provider`。为 OpenClaw 添加 Kilocode 模型提供方支持。

- **[kimi](/plugins/reference/kimi)** (`@openclaw/kimi-provider`) - npm；ClawHub：`clawhub:@openclaw/kimi-provider`。为 OpenClaw 添加 Kimi、Kimi Coding 模型提供方支持。

- **[line](/plugins/reference/line)** (`@openclaw/line`) - npm；ClawHub。OpenClaw LINE 频道插件，用于 LINE Bot API 聊天。

- **[llama-cpp](/plugins/reference/llama-cpp)** (`@openclaw/llama-cpp-provider`) - npm；ClawHub。通过 node-llama-cpp 实现本地 GGUF 文本推理和嵌入。

- **[lobster](/plugins/reference/lobster)** (`@openclaw/lobster`) - npm；ClawHub。用于类型化流水线和可恢复审批的 Lobster 工作流工具插件。

- **[longcat](/plugins/reference/longcat)** (`@openclaw/longcat-provider`) - npm；ClawHub：`clawhub:@openclaw/longcat-provider`。OpenClaw LongCat 提供程序插件。

- **[matrix](/plugins/reference/matrix)** (`@openclaw/matrix`) - ClawHub：`clawhub:@openclaw/matrix`；npm。OpenClaw Matrix 频道插件，用于房间和直接消息。

- **[mattermost](/plugins/reference/mattermost)** (`@openclaw/mattermost`) - npm；ClawHub：`clawhub:@openclaw/mattermost`。添加用于发送和接收 OpenClaw 消息的 Mattermost 频道表面。

- **[memory-lancedb](/plugins/reference/memory-lancedb)** (`@openclaw/memory-lancedb`) - npm；ClawHub。OpenClaw 基于 LanceDB 的长期记忆插件，支持自动回忆、自动捕获和向量搜索。

- **[meta](/plugins/reference/meta)** (`@openclaw/meta-provider`) - npm；ClawHub：`clawhub:@openclaw/meta-provider`。为 OpenClaw 添加 Meta 模型提供方支持。

- **[mistral](/plugins/reference/mistral)** (`@openclaw/mistral-provider`) - npm；ClawHub：`clawhub:@openclaw/mistral-provider`。为 OpenClaw 添加 Mistral 模型提供方支持。

- **[moonshot](/plugins/reference/moonshot)** (`@openclaw/moonshot-provider`) - npm；ClawHub：`clawhub:@openclaw/moonshot-provider`。为 OpenClaw 添加 Moonshot 模型提供方支持。

- **[msteams](/plugins/reference/msteams)** (`@openclaw/msteams`) - npm；ClawHub。OpenClaw Microsoft Teams 频道插件，用于机器人对话。

- **[mxc](/plugins/reference/mxc)** (`@openclaw/mxc-sandbox`) - npm；ClawHub。通过 MXC 实现操作系统级沙盒工具执行：使用配置的 MXC 策略文件，在 Windows ProcessContainer 中运行命令。

- **[nextcloud-talk](/plugins/reference/nextcloud-talk)** (`@openclaw/nextcloud-talk`) - npm；ClawHub。OpenClaw Nextcloud Talk 频道插件，用于对话。

- **[nostr](/plugins/reference/nostr)** (`@openclaw/nostr`) - npm；ClawHub。OpenClaw Nostr 频道插件，用于采用 NIP-04 加密的直接消息。

- **[novita](/plugins/reference/novita)** (`@openclaw/novita-provider`) - npm；ClawHub：`clawhub:@openclaw/novita-provider`。为 OpenClaw 添加 Novita、Novita AI、Novitaai 模型提供方支持。

- **[opencode](/plugins/reference/opencode)** (`@openclaw/opencode-provider`) - npm；ClawHub：`clawhub:@openclaw/opencode-provider`。为 OpenClaw 添加 OpenCode 模型提供方支持。

- **[opencode-go](/plugins/reference/opencode-go)** (`@openclaw/opencode-go-provider`) - npm；ClawHub：`clawhub:@openclaw/opencode-go-provider`。为 OpenClaw 添加 OpenCode Go 模型提供方支持。

- **[openshell](/plugins/reference/openshell)** (`@openclaw/openshell-sandbox`) - npm；ClawHub。适用于 NVIDIA OpenShell CLI 的 OpenClaw 沙盒后端，支持镜像本地工作区和 SSH 命令执行。

- **[parallel](/tools/parallel-search)** (`@openclaw/parallel-plugin`) - npm；ClawHub：`clawhub:@openclaw/parallel-plugin`。添加网页搜索提供方支持。

- **[perplexity](/plugins/reference/perplexity)** (`@openclaw/perplexity-plugin`) - npm；ClawHub：`clawhub:@openclaw/perplexity-plugin`。添加网页搜索提供方支持。

- **[pixverse](/plugins/reference/pixverse)** (`@openclaw/pixverse-provider`) - npm；ClawHub：`clawhub:@openclaw/pixverse-provider`。OpenClaw PixVerse 视频生成提供程序插件。

- **[qianfan](/plugins/reference/qianfan)** (`@openclaw/qianfan-provider`) - npm；ClawHub：`clawhub:@openclaw/qianfan-provider`。为 OpenClaw 添加 Qianfan 模型提供方支持。

- **[qqbot](/plugins/reference/qqbot)** (`@openclaw/qqbot`) - npm；ClawHub。OpenClaw QQ Bot 频道插件，用于群组和直接消息工作流。

- **[qwen](/plugins/reference/qwen)** (`@openclaw/qwen-provider`) - npm；ClawHub：`clawhub:@openclaw/qwen-provider`。为 OpenClaw 添加 Qwen、Qwen Cloud、Model Studio、DashScope、Qwen Token Plan、Bailian Token Plan 模型提供方支持。

- **[raft](/plugins/reference/raft)** (`@openclaw/raft`) - npm；ClawHub。OpenClaw Raft 频道插件，用于安全 CLI 唤醒桥接。

- **[searxng](/plugins/reference/searxng)** (`@openclaw/searxng-plugin`) - npm；ClawHub：`clawhub:@openclaw/searxng-plugin`。添加网页搜索提供方支持。

- **[signal](/plugins/reference/signal)** (`@openclaw/signal`) - npm；ClawHub：`clawhub:@openclaw/signal`。添加用于发送和接收 OpenClaw 消息的 Signal 频道表面。

- **[slack](/plugins/reference/slack)** (`@openclaw/slack`) - npm；ClawHub。OpenClaw Slack 频道插件，支持频道、私信、命令和应用事件。

- **[sms](/plugins/reference/sms)** (`@openclaw/sms`) - npm；ClawHub：`clawhub:@openclaw/sms`。用于 OpenClaw 文本消息的 Twilio SMS 频道插件。

- **[stepfun](/plugins/reference/stepfun)** (`@openclaw/stepfun-provider`) - npm；ClawHub：`clawhub:@openclaw/stepfun-provider`。为 OpenClaw 添加 StepFun、StepFun Plan 模型提供方支持。

- **[synology-chat](/plugins/reference/synology-chat)** (`@openclaw/synology-chat`) - npm；ClawHub。Synology Chat 频道插件，用于 OpenClaw 频道和直接消息。

- **[synthetic](/plugins/reference/synthetic)** (`@openclaw/synthetic-provider`) - npm；ClawHub：`clawhub:@openclaw/synthetic-provider`。为 OpenClaw 添加 Synthetic 模型提供方支持。

- **[tavily](/plugins/reference/tavily)** (`@openclaw/tavily-plugin`) - npm；ClawHub：`clawhub:@openclaw/tavily-plugin`。添加 agent 可调用工具。添加网页搜索提供方支持。

- **[teams-meetings](/plugins/reference/teams-meetings)** (`@openclaw/teams-meetings`) - npm；ClawHub：`clawhub:@openclaw/teams-meetings`。作为 Chrome 浏览器访客加入 Microsoft Teams 会议。

- **[tencent](/plugins/reference/tencent)** (`@openclaw/tencent-provider`) - npm；ClawHub：`clawhub:@openclaw/tencent-provider`。为 OpenClaw 添加 Tencent TokenHub、Tencent Tokenplan 模型提供方支持。

- **[tlon](/plugins/reference/tlon)** (`@openclaw/tlon`) - npm；ClawHub。OpenClaw Tlon/Urbit 频道插件，用于聊天工作流。

- **[tokenjuice](/plugins/reference/tokenjuice)** (`@openclaw/tokenjuice`) - npm；ClawHub：`clawhub:@openclaw/tokenjuice`。使用 tokenjuice reducer 压缩 exec 和 bash 工具结果。

- **[twitch](/plugins/reference/twitch)** (`@openclaw/twitch`) - npm；ClawHub。OpenClaw Twitch 频道插件，用于聊天和审核工作流。

- **[venice](/plugins/reference/venice)** (`@openclaw/venice-provider`) - npm；ClawHub：`clawhub:@openclaw/venice-provider`。为 OpenClaw 添加 Venice 模型提供方支持。

- **[vercel-ai-gateway](/plugins/reference/vercel-ai-gateway)** (`@openclaw/vercel-ai-gateway-provider`) - npm；ClawHub：`clawhub:@openclaw/vercel-ai-gateway-provider`。为 OpenClaw 添加 Vercel AI Gateway 模型提供方支持。

- **[voice-call](/plugins/reference/voice-call)** (`@openclaw/voice-call`) - npm；ClawHub。OpenClaw 语音通话插件，用于 Twilio、Telnyx 和 Plivo 电话通话。

- **[volcengine](/plugins/reference/volcengine)** (`@openclaw/volcengine-provider`) - npm；ClawHub：`clawhub:@openclaw/volcengine-provider`。为 OpenClaw 添加 Volcengine、Volcengine Plan 模型提供方支持。

- **[voyage](/plugins/reference/voyage)** (`@openclaw/voyage-provider`) - npm；ClawHub：`clawhub:@openclaw/voyage-provider`。添加记忆嵌入提供方支持。

- **[vydra](/plugins/reference/vydra)** (`@openclaw/vydra-provider`) - npm；ClawHub：`clawhub:@openclaw/vydra-provider`。为 OpenClaw 添加 Vydra 模型提供方支持。

- **[whatsapp](/plugins/reference/whatsapp)** (`@openclaw/whatsapp`) - ClawHub：`clawhub:@openclaw/whatsapp`；npm。用于 WhatsApp Web 聊天的 OpenClaw WhatsApp 频道插件。

- **[xiaomi](/plugins/reference/xiaomi)** (`@openclaw/xiaomi-provider`) - npm；ClawHub：`clawhub:@openclaw/xiaomi-provider`。为 OpenClaw 添加 Xiaomi、Xiaomi Token Plan 模型提供方支持。

- **[zai](/plugins/reference/zai)** (`@openclaw/zai-provider`) - npm；ClawHub：`clawhub:@openclaw/zai-provider`。为 OpenClaw 添加 Z.AI 模型提供方支持。

- **[zalo](/plugins/reference/zalo)** (`@openclaw/zalo`) - npm；ClawHub。OpenClaw Zalo 频道插件，用于机器人和 webhook 聊天。

- **[zalouser](/plugins/reference/zalouser)** (`@openclaw/zalouser`) - npm；ClawHub。通过原生 zca-js 集成的 OpenClaw Zalo 个人账户插件。

- **[zoom-meetings](/plugins/reference/zoom-meetings)** (`@openclaw/zoom-meetings`) - npm；ClawHub：`clawhub:@openclaw/zoom-meetings`。作为 Chrome 浏览器访客加入 Zoom 会议。

## 仅源代码检出

2 个插件

- **[qa-channel](/plugins/reference/qa-channel)** (`@openclaw/qa-channel`) - 仅源代码检出。添加 QA Channel 界面，用于发送和接收 OpenClaw 消息。

- **[qa-lab](/plugins/reference/qa-lab)** (`@openclaw/qa-lab`) - 仅源代码检出。OpenClaw QA 实验室插件，包含私有调试器界面和场景运行器。
