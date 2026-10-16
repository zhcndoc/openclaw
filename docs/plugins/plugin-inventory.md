---
summary: "OpenClaw 内置、外部发布或仅保留源码的插件清单"
read_when:
  - You are deciding whether a plugin ships in the core npm package or installs separately
  - You are updating bundled plugin package metadata or release automation
  - You need the current internal vs external plugin list
title: "Plugin inventory"
---

<!-- Generated file. Do not edit by hand.
Run `pnpm plugins:inventory:gen` to rebuild it. -->

This page lists every OpenClaw plugin with its package, install route, and
description. Operators use it to find a plugin and to see whether that plugin
needs a separate install. Maintainers use it to check bundled plugin metadata
and release automation.

## 定义

- **核心 npm 包：** 内置于 `openclaw` npm 包中，无需安装单独的插件即可使用。
- **官方外部包：** 由 OpenClaw 维护的插件，不包含在核心 npm 包中，保存在此官方列表中，并可通过 ClawHub 和/或 npm 按需安装。
- **仅源码检出：** 仅保留在本地仓库中的插件，不包含在已发布的 npm 制品中，也不会作为可安装包进行推广。

源码检出与 npm 安装不同：在 `pnpm install` 之后，捆绑插件会从 `extensions/<id>` 加载，因此本地修改和包内工作区依赖都可用。

## 安装插件

Use the install route in each entry to decide whether install is needed. Plugins
that say `included in OpenClaw` are already present in the core package.
Official external packages need one install. Installation applies to the running
local Gateway without restarting it; start the Gateway if it was stopped.

例如，Discord 是一个官方外部包：

```bash
openclaw plugins install @openclaw/discord
openclaw plugins inspect discord --runtime --json
```

Ordinary bare package specs install from npm. Use `clawhub:@openclaw/discord`
or `npm:@openclaw/discord` when you need an explicit source. After install,
follow the plugin's setup doc, such as [Discord](/channels/discord), to add
credentials and channel config. See
[Manage plugins](/plugins/manage-plugins) for update, uninstall, and publishing
commands.

每个条目列出包名、分发路线和描述。

## 核心 npm 包

70 plugins

- **[a2a](/plugins/reference/a2a)** (`@openclaw/a2a`) - included in OpenClaw. A2A v1.0 Agent-to-Agent protocol channel plugin.

- **[active-memory](/plugins/reference/active-memory)** (`openclaw`) - 包含在 OpenClaw 中。在回复前执行有界的记忆检索，并为符合条件的私有对话实现跨对话的每个 agent 的 Remember。

- **[admin-http-rpc](/plugins/reference/admin-http-rpc)** (`@openclaw/admin-http-rpc`) - 包含在 OpenClaw 中。OpenClaw 管理 HTTP RPC 端点。

- **[advisor](/plugins/reference/advisor)** (`@openclaw/advisor`) - included in OpenClaw. Experimental: reviews ongoing agent work on the session's own model and offers one short correction.

- **[agent-guidance](/plugins/reference/agent-guidance)** (`@openclaw/agent-guidance`) - included in OpenClaw. Shares instruction files across selected agents without editing their workspace files.

- **[agentsapi](/plugins/reference/agentsapi)** (`@openclaw/agentsapi`) - included in OpenClaw. OpenAI Agents API harness with hosted or self-hosted sessions.

- **[alibaba](/plugins/reference/alibaba)** (`@openclaw/alibaba-provider`) - included in OpenClaw. Adds video generation provider support.

- **[anthropic](/plugins/reference/anthropic)** (`@openclaw/anthropic-provider`) - 包含在 OpenClaw 中。Anthropic 模型、Claude CLI 和原生 Claude 会话目录。

- **[apple-fm](/plugins/reference/apple-fm)** (`@openclaw/apple-fm-provider`) - included in OpenClaw. On-device Apple Intelligence inference for lightweight setup and short tasks.

- **[azure-speech](/plugins/reference/azure-speech)** (`@openclaw/azure-speech`) - included in OpenClaw. Azure AI Speech text-to-speech (MP3, native Ogg/Opus voice notes, PCM telephony).

- **[beam](/plugins/reference/beam)** (`@openclaw/beam`) - 包含在 OpenClaw 中。只读的编码会话 Beam 接收器。

- **[bonjour](/plugins/reference/bonjour)** (`@openclaw/bonjour`) - 包含在 OpenClaw 中。通过 Bonjour/mDNS 广播本地 OpenClaw 网关。

- **[browser](/plugins/reference/browser)** (`@openclaw/browser-plugin`) - 包含在 OpenClaw 中。添加 agent 可调用工具。

- **[canvas](/plugins/reference/canvas)** (`@openclaw/canvas-plugin`) - included in OpenClaw. Presents hosted widget documents on paired macOS panels.

- **[clawrouter](/plugins/reference/clawrouter)** (`@openclaw/clawrouter`) - 包含在 OpenClaw 中。向 OpenClaw 添加 ClawRouter 模型提供方支持。

- **[cloudflare](/plugins/reference/cloudflare)** (`@openclaw/cloudflare`) - included in OpenClaw, and also from npm or ClawHub: `clawhub:@openclaw/cloudflare`. Cloudflare R2 storage for named OpenClaw storage locations.

- **[code-mode-quickjs](/plugins/reference/code-mode-quickjs)** (`@openclaw/code-mode-quickjs`) - included in OpenClaw. Hardened JavaScript execution for Code Mode using QuickJS in WebAssembly.

- **[copilot-proxy](/plugins/reference/copilot-proxy)** (`@openclaw/copilot-proxy`) - included in OpenClaw. Adds Copilot Proxy model provider support to OpenClaw.

- **[crabbox](/plugins/reference/crabbox)** (`@openclaw/crabbox-provider`) - included in OpenClaw. Cloud worker provider and lease-backed sandbox backend for the Crabbox CLI.

- **[cua-computer](/plugins/reference/cua-computer)** (`@openclaw/cua-computer`) - included in OpenClaw. Experimental CUA Driver computer control for macOS, Windows, and Linux node hosts.

- **[deepgram](/plugins/reference/deepgram)** (`@openclaw/deepgram-provider`) - included in OpenClaw. Deepgram audio transcription with Nova and Flux models, plus realtime speech recognition.

- **[device-pair](/plugins/reference/device-pair)** (`openclaw`) - 包含在 OpenClaw 中。生成设置代码并批准设备配对请求。

- **[document-extract](/plugins/reference/document-extract)** (`@openclaw/document-extract-plugin`) - 包含在 OpenClaw 中。从本地文档附件中提取文本和备用页面图像。

- **[elevenlabs](/plugins/reference/elevenlabs)** (`@openclaw/elevenlabs-speech`) - 包含在 OpenClaw 中。添加媒体理解提供方支持。添加实时转录提供方支持。添加文本转语音提供方支持。

- **[fal](/plugins/reference/fal)** (`@openclaw/fal-provider`) - 包含在 OpenClaw 中。为 OpenClaw 添加 fal 模型提供方支持。

- **[file-transfer](/plugins/reference/file-transfer)** (`@openclaw/file-transfer`) - 包含在 OpenClaw 中。通过专用节点命令在配对节点上获取、列出和写入文件。使用 node.invoke 上的 base64 绕过 bash stdout 截断，支持最大 16 MB 的二进制文件。

- **[geolocation](/plugins/reference/geolocation)** (`@openclaw/geolocation-plugin`) - included in OpenClaw. Resolves client IP addresses to a coarse city using a locally cached IP-geolocation database.

- **[github](/plugins/reference/github)** (`@openclaw/github`) - included in OpenClaw. Public GitHub link previews and document reader.

- **[github-copilot](/plugins/reference/github-copilot)** (`@openclaw/github-copilot-provider`) - included in OpenClaw. Adds GitHub Copilot model provider support to OpenClaw.

- **[google](/plugins/reference/google)** (`@openclaw/google-plugin`) - 包含在 OpenClaw 中。为 OpenClaw 添加 Google、Google Gemini CLI、Google Vertex 模型提供方支持。

- **[huggingface](/plugins/reference/huggingface)** (`@openclaw/huggingface-provider`) - 包含在 OpenClaw 中。为 OpenClaw 添加 Hugging Face 模型提供方支持。

- **[imap](/plugins/reference/imap)** (`@openclaw/imap`) - included in OpenClaw. Watch IMAP mailboxes and dispatch authenticated incoming email to isolated agent sessions.

- **[kie](/plugins/reference/kie)** (`@openclaw/kie-provider`) - included in OpenClaw. Adds Kie model provider support to OpenClaw.

- **[linux-node](/plugins/reference/linux-node)** (`@openclaw/linux-node`) - 包含在 OpenClaw 中。Linux 节点主机的桌面通知、摄像头捕获和位置功能。

- **[litellm](/plugins/reference/litellm)** (`@openclaw/litellm-provider`) - 包含在 OpenClaw 中。为 OpenClaw 添加 LiteLLM 模型提供方支持。

- **[llm-task](/plugins/reference/llm-task)** (`@openclaw/llm-task`) - 包含在 OpenClaw 中。可供工作流调用的通用仅 JSON LLM 工具，用于结构化任务。

- **[lmstudio](/plugins/reference/lmstudio)** (`@openclaw/lmstudio-provider`) - 包含在 OpenClaw 中。向 OpenClaw 添加 LM Studio 模型提供方支持。

- **[logbook](/plugins/reference/logbook)** (`@openclaw/logbook`) - 包含在 OpenClaw 中。自动工作日志：从配对节点定期捕获屏幕快照，并将其转换为可回顾的日程时间线。

- **[mcp-events](/plugins/reference/mcp-events)** (`@openclaw/mcp-events`) - included in OpenClaw. Subscribe to events from configured MCP accounts and trigger authored automations.

- **[mcp-relay](/plugins/reference/mcp-relay)** (`@openclaw/mcp-relay`) - included in OpenClaw. Connect remote MCP clients to your OpenClaw Gateway.

- **[memory-core](/plugins/reference/memory-core)** (`@openclaw/memory-core`) - included in OpenClaw. Adds agent-callable tools.

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

- **[openai](/plugins/reference/openai)** (`@openclaw/openai-provider`) - included in OpenClaw. Adds OpenAI model provider support to OpenClaw.

- **[opencode-go](/plugins/reference/opencode-go)** (`@openclaw/opencode-go-provider`) - 包含在 OpenClaw 中。向 OpenClaw 添加 OpenCode Go 模型提供方支持。

- **[openrouter](/plugins/reference/openrouter)** (`@openclaw/openrouter-provider`) - 包含在 OpenClaw 中。向 OpenClaw 添加 OpenRouter 模型提供方支持。

- **[policy](/plugins/reference/policy)** (`@openclaw/policy`) - 包含在 OpenClaw 中。添加由策略支持的 workspace 合规性 doctor 检查。

- **[reef](/plugins/reference/reef)** (`@openclaw/reef`) - 包含在 OpenClaw 中。受保护的端到端加密 claw 频道。

- **[runway](/plugins/reference/runway)** (`@openclaw/runway-provider`) - 包含在 OpenClaw 中。添加视频生成提供方支持。

- **[senseaudio](/plugins/reference/senseaudio)** (`@openclaw/senseaudio-provider`) - 包含在 OpenClaw 中。添加媒体理解提供方支持。

- **[session-share](/plugins/reference/session-share)** (`@openclaw/session-share`) - included in OpenClaw. Read-only OpenClaw sessions on paired gateways.

- **[sglang](/plugins/reference/sglang)** (`@openclaw/sglang-provider`) - included in OpenClaw. Adds SGLang model provider support to OpenClaw.

- **[talk-voice](/plugins/reference/talk-voice)** (`openclaw`) - 包含在 OpenClaw 中。管理 Talk 语音选择（列出／设置）。

- **[telegram](/plugins/reference/telegram)** (`@openclaw/telegram`) - included in OpenClaw. OpenClaw Telegram channel plugin.

- **[together](/plugins/reference/together)** (`@openclaw/together-provider`) - 包含在 OpenClaw 中。向 OpenClaw 添加 Together 模型提供方支持。

- **[tts-local-cli](/plugins/reference/tts-local-cli)** (`@openclaw/tts-local-cli`) - 包含在 OpenClaw 中。添加文本转语音提供方支持。

- **[vault](/plugins/reference/vault)** (`@openclaw/vault`) - 包含在 OpenClaw 中。HashiCorp Vault SecretRef 提供方集成。

- **[vllm](/plugins/reference/vllm)** (`@openclaw/vllm-provider`) - 包含在 OpenClaw 中。向 OpenClaw 添加 vLLM 模型提供方支持。

- **[web-readability](/plugins/reference/web-readability)** (`@openclaw/web-readability-plugin`) - 包含在 OpenClaw 中。从本地 HTML 网页抓取响应中提取可读的文章内容。

- **[workboard](/plugins/reference/workboard)** (`@openclaw/workboard`) - included in OpenClaw. Dashboard workboard for agent-owned issues and sessions.

- **[x](/plugins/reference/x)** (`@openclaw/x`) - included in OpenClaw. Allowlisted X mentions and public replies.

- **[xai](/plugins/reference/xai)** (`@openclaw/xai-plugin`) - included in OpenClaw. xAI provider for Grok models, Grok web and X search, code execution, speech, and media generation.

## 官方外部包

97 plugins

- **[acpx](/plugins/reference/acpx)** (`@openclaw/acpx`) - npm or ClawHub: `clawhub:@openclaw/acpx`. OpenClaw ACP runtime backend with plugin-owned session and transport management.

- **[amazon-bedrock](/plugins/reference/amazon-bedrock)** (`@openclaw/amazon-bedrock-provider`) - npm or ClawHub: `clawhub:@openclaw/amazon-bedrock-provider`. OpenClaw Amazon Bedrock provider plugin with model discovery, embeddings, and guardrail support.

- **[amazon-bedrock-mantle](/plugins/reference/amazon-bedrock-mantle)** (`@openclaw/amazon-bedrock-mantle-provider`) - npm or ClawHub: `clawhub:@openclaw/amazon-bedrock-mantle-provider`. OpenClaw Amazon Bedrock Mantle provider plugin for OpenAI-compatible model routing.

- **[anthropic-vertex](/plugins/reference/anthropic-vertex)** (`@openclaw/anthropic-vertex-provider`) - npm or ClawHub: `clawhub:@openclaw/anthropic-vertex-provider`. OpenClaw Anthropic Vertex provider plugin for Claude models on Google Vertex AI.

- **[arcee](/plugins/reference/arcee)** (`@openclaw/arcee-provider`) - npm or ClawHub: `clawhub:@openclaw/arcee-provider`. Adds Arcee model provider support to OpenClaw.

- **[baseten](/plugins/reference/baseten)** (`@openclaw/baseten-provider`) - npm or ClawHub: `clawhub:@openclaw/baseten-provider`. OpenClaw Baseten provider plugin.

- **[brave](/plugins/reference/brave)** (`@openclaw/brave-plugin`) - npm or ClawHub: `clawhub:@openclaw/brave-plugin`. OpenClaw Brave Search provider plugin for web search.

- **[buzz](/plugins/reference/buzz)** (`@openclaw/buzz`) - npm or ClawHub: `clawhub:@openclaw/buzz`. Connect OpenClaw agents to Buzz rooms.

- **[byteplus](/plugins/reference/byteplus)** (`@openclaw/byteplus-provider`) - npm or ClawHub: `clawhub:@openclaw/byteplus-provider`. Adds BytePlus, BytePlus Plan model provider support to OpenClaw.

- **[cerebras](/plugins/reference/cerebras)** (`@openclaw/cerebras-provider`) - npm or ClawHub: `clawhub:@openclaw/cerebras-provider`. Adds Cerebras model provider support to OpenClaw.

- **[chutes](/plugins/reference/chutes)** (`@openclaw/chutes-provider`) - npm or ClawHub: `clawhub:@openclaw/chutes-provider`. Adds Chutes model provider support to OpenClaw.

- **[clickclack](/plugins/reference/clickclack)** (`@openclaw/clickclack`) - npm or ClawHub: `clawhub:@openclaw/clickclack`. OpenClaw ClickClack channel plugin.

- **[cloudflare-ai-gateway](/plugins/reference/cloudflare-ai-gateway)** (`@openclaw/cloudflare-ai-gateway-provider`) - npm or ClawHub: `clawhub:@openclaw/cloudflare-ai-gateway-provider`. Adds Cloudflare AI Gateway model provider support to OpenClaw.

- **[codex](/plugins/reference/codex)** (`@openclaw/codex`) - npm or ClawHub: `clawhub:@openclaw/codex`. Codex app-server harness and native session catalog.

- **[cohere](/plugins/reference/cohere)** (`@openclaw/cohere-provider`) - npm or ClawHub: `clawhub:@openclaw/cohere-provider`. OpenClaw Cohere provider plugin.

- **[comfy](/plugins/reference/comfy)** (`@openclaw/comfy-provider`) - npm or ClawHub: `clawhub:@openclaw/comfy-provider`. Adds ComfyUI model provider support to OpenClaw.

- **[copilot](/plugins/reference/copilot)** (`@openclaw/copilot`) - npm or ClawHub: `clawhub:@openclaw/copilot`. Registers the GitHub Copilot agent runtime.

- **[deepinfra](/plugins/reference/deepinfra)** (`@openclaw/deepinfra-provider`) - npm or ClawHub: `clawhub:@openclaw/deepinfra-provider`. Adds DeepInfra model provider support to OpenClaw.

- **[deepseek](/plugins/reference/deepseek)** (`@openclaw/deepseek-provider`) - npm or ClawHub: `clawhub:@openclaw/deepseek-provider`. Adds DeepSeek model provider support to OpenClaw.

- **[diagnostics-otel](/plugins/reference/diagnostics-otel)** (`@openclaw/diagnostics-otel`) - npm or ClawHub: `clawhub:@openclaw/diagnostics-otel`. OpenClaw diagnostics OpenTelemetry exporter for metrics, traces, and logs.

- **[diagnostics-prometheus](/plugins/reference/diagnostics-prometheus)** (`@openclaw/diagnostics-prometheus`) - npm or ClawHub: `clawhub:@openclaw/diagnostics-prometheus`. OpenClaw diagnostics Prometheus exporter for runtime metrics.

- **[diffs](/plugins/reference/diffs)** (`@openclaw/diffs`) - npm or ClawHub: `clawhub:@openclaw/diffs`. OpenClaw read-only diff viewer plugin and file renderer for agents.

- **[diffs-language-pack](/plugins/reference/diffs-language-pack)** (`@openclaw/diffs-language-pack`) - npm or ClawHub: `clawhub:@openclaw/diffs-language-pack`. Adds syntax highlighting for languages outside the default diffs viewer set.

- **[discord](/plugins/reference/discord)** (`@openclaw/discord`) - npm or ClawHub: `clawhub:@openclaw/discord`. OpenClaw Discord channel plugin for channels, DMs, commands, and app events.

- **[duckduckgo](/plugins/reference/duckduckgo)** (`@openclaw/duckduckgo-plugin`) - npm or ClawHub: `clawhub:@openclaw/duckduckgo-plugin`. Adds web search provider support.

- **[exa](/plugins/reference/exa)** (`@openclaw/exa-plugin`) - npm or ClawHub: `clawhub:@openclaw/exa-plugin`. Adds web search provider support.

- **[facetime](/plugins/reference/facetime)** (`@openclaw/facetime`) - npm or ClawHub: `clawhub:@openclaw/facetime`. Experimental FaceTime realtime voice carrier for OpenClaw agents.

- **[featherless](/plugins/reference/featherless)** (`@openclaw/featherless-provider`) - npm or ClawHub: `clawhub:@openclaw/featherless-provider`. OpenClaw Featherless AI provider plugin.

- **[feishu](/plugins/reference/feishu)** (`@openclaw/feishu`) - npm or ClawHub: `clawhub:@openclaw/feishu`. OpenClaw Feishu/Lark channel plugin for chats and workplace tools (community maintained by @m1heng).

- **[firecrawl](/plugins/reference/firecrawl)** (`@openclaw/firecrawl-plugin`) - npm or ClawHub: `clawhub:@openclaw/firecrawl-plugin`. Adds agent-callable tools. Adds web fetch provider support. Adds web search provider support.

- **[fireworks](/plugins/reference/fireworks)** (`@openclaw/fireworks-provider`) - npm or ClawHub: `clawhub:@openclaw/fireworks-provider`. Adds Fireworks model provider support to OpenClaw.

- **[fish-audio-speech](/plugins/reference/fish-audio-speech)** (`@openclaw/fish-audio-speech`) - npm or ClawHub: `clawhub:@openclaw/fish-audio-speech`. Fish Audio hosted text-to-speech with streaming, voice notes, and telephony output.

- **[gmi](/plugins/reference/gmi)** (`@openclaw/gmi-provider`) - npm or ClawHub: `clawhub:@openclaw/gmi-provider`. OpenClaw GMI Cloud provider plugin.

- **[google-meet](/plugins/reference/google-meet)** (`@openclaw/google-meet`) - npm or ClawHub: `clawhub:@openclaw/google-meet`. OpenClaw Google Meet participant plugin for joining calls through Chrome or Twilio transports.

- **[googlechat](/plugins/reference/googlechat)** (`@openclaw/googlechat`) - npm or ClawHub: `clawhub:@openclaw/googlechat`. OpenClaw Google Chat channel plugin for spaces and direct messages.

- **[gradium](/plugins/reference/gradium)** (`@openclaw/gradium-speech`) - npm or ClawHub: `clawhub:@openclaw/gradium-speech`. Adds text-to-speech provider support.

- **[groq](/plugins/reference/groq)** (`@openclaw/groq-provider`) - npm or ClawHub: `clawhub:@openclaw/groq-provider`. Adds Groq model provider support to OpenClaw.

- **[imessage](/plugins/reference/imessage)** (`@openclaw/imessage`) - npm or ClawHub: `clawhub:@openclaw/imessage`. OpenClaw iMessage channel plugin using imsg on a signed-in Mac.

- **[inworld](/plugins/reference/inworld)** (`@openclaw/inworld-speech`) - npm or ClawHub: `clawhub:@openclaw/inworld-speech`. Inworld streaming text-to-speech (MP3, OGG_OPUS, PCM telephony).

- **[irc](/plugins/reference/irc)** (`@openclaw/irc`) - npm or ClawHub: `clawhub:@openclaw/irc`. OpenClaw IRC channel plugin.

- **[kilocode](/plugins/reference/kilocode)** (`@openclaw/kilocode-provider`) - npm or ClawHub: `clawhub:@openclaw/kilocode-provider`. Adds Kilocode model provider support to OpenClaw.

- **[kimi](/plugins/reference/kimi)** (`@openclaw/kimi-provider`) - npm or ClawHub: `clawhub:@openclaw/kimi-provider`. Adds Kimi, Kimi Code, Kimi Coding model provider support to OpenClaw.

- **[line](/plugins/reference/line)** (`@openclaw/line`) - npm or ClawHub: `clawhub:@openclaw/line`. OpenClaw LINE channel plugin for LINE Bot API chats.

- **[llama-cpp](/plugins/reference/llama-cpp)** (`@openclaw/llama-cpp-provider`) - npm or ClawHub: `clawhub:@openclaw/llama-cpp-provider`. Managed and external llama.cpp servers for GGUF chat, embeddings and local images.

- **[lobster](/plugins/reference/lobster)** (`@openclaw/lobster`) - npm or ClawHub: `clawhub:@openclaw/lobster`. Lobster workflow tool plugin for typed pipelines and resumable approvals.

- **[longcat](/plugins/reference/longcat)** (`@openclaw/longcat-provider`) - npm or ClawHub: `clawhub:@openclaw/longcat-provider`. OpenClaw LongCat provider plugin.

- **[matrix](/plugins/reference/matrix)** (`@openclaw/matrix`) - npm or ClawHub: `clawhub:@openclaw/matrix`. OpenClaw Matrix channel plugin for rooms and direct messages.

- **[mattermost](/plugins/reference/mattermost)** (`@openclaw/mattermost`) - npm or ClawHub: `clawhub:@openclaw/mattermost`. OpenClaw Mattermost channel plugin.

- **[memory-lancedb](/plugins/reference/memory-lancedb)** (`@openclaw/memory-lancedb`) - npm or ClawHub: `clawhub:@openclaw/memory-lancedb`. OpenClaw LanceDB-backed long-term memory plugin with auto-recall, auto-capture, and vector search.

- **[meta](/plugins/reference/meta)** (`@openclaw/meta-provider`) - npm or ClawHub: `clawhub:@openclaw/meta-provider`. Adds Meta model provider support to OpenClaw.

- **[mistral](/plugins/reference/mistral)** (`@openclaw/mistral-provider`) - npm or ClawHub: `clawhub:@openclaw/mistral-provider`. Adds Mistral model provider support to OpenClaw.

- **[moonshot](/plugins/reference/moonshot)** (`@openclaw/moonshot-provider`) - npm or ClawHub: `clawhub:@openclaw/moonshot-provider`. Adds Moonshot model provider support to OpenClaw.

- **[msteams](/plugins/reference/msteams)** (`@openclaw/msteams`) - npm or ClawHub: `clawhub:@openclaw/msteams`. OpenClaw Microsoft Teams channel plugin for bot conversations.

- **[muse](/plugins/reference/muse)** (`@openclaw/muse`) - npm or ClawHub: `clawhub:@openclaw/muse`. Runs Meta models through the Muse Code CLI.

- **[mxc](/plugins/reference/mxc)** (`@openclaw/mxc-sandbox`) - npm or ClawHub: `clawhub:@openclaw/mxc-sandbox`. OS-level sandboxed tool execution via MXC: runs commands in a Windows ProcessContainer with configured MXC policy files.

- **[nextcloud-talk](/plugins/reference/nextcloud-talk)** (`@openclaw/nextcloud-talk`) - npm or ClawHub: `clawhub:@openclaw/nextcloud-talk`. OpenClaw Nextcloud Talk channel plugin for conversations.

- **[nostr](/plugins/reference/nostr)** (`@openclaw/nostr`) - npm or ClawHub: `clawhub:@openclaw/nostr`. OpenClaw Nostr channel plugin for NIP-04 encrypted direct messages.

- **[novita](/plugins/reference/novita)** (`@openclaw/novita-provider`) - npm or ClawHub: `clawhub:@openclaw/novita-provider`. Adds Novita, Novita AI, Novitaai model provider support to OpenClaw.

- **[onnx](/plugins/reference/onnx)** (`@openclaw/onnx`) - npm or ClawHub: `clawhub:@openclaw/onnx`. Local typed decisions using pinned ONNX classifiers.

- **[opencode](/plugins/reference/opencode)** (`@openclaw/opencode-provider`) - npm or ClawHub: `clawhub:@openclaw/opencode-provider`. Adds OpenCode model provider support to OpenClaw.

- **[openshell](/plugins/reference/openshell)** (`@openclaw/openshell-sandbox`) - npm or ClawHub: `clawhub:@openclaw/openshell-sandbox`. OpenClaw sandbox backend for the NVIDIA OpenShell CLI with mirrored local workspaces and SSH command execution.

- **[parallel](/tools/parallel-search)** (`@openclaw/parallel-plugin`) - npm or ClawHub: `clawhub:@openclaw/parallel-plugin`. Adds web search provider support.

- **[perplexity](/plugins/reference/perplexity)** (`@openclaw/perplexity-plugin`) - npm or ClawHub: `clawhub:@openclaw/perplexity-plugin`. Adds web search provider support.

- **[pixverse](/plugins/reference/pixverse)** (`@openclaw/pixverse-provider`) - npm or ClawHub: `clawhub:@openclaw/pixverse-provider`. OpenClaw PixVerse video generation provider plugin.

- **[qianfan](/plugins/reference/qianfan)** (`@openclaw/qianfan-provider`) - npm or ClawHub: `clawhub:@openclaw/qianfan-provider`. Adds Qianfan model provider support to OpenClaw.

- **[qqbot](/plugins/reference/qqbot)** (`@tencent-connect/openclaw-qqbot`) - npm。OpenClaw QQ Bot 频道插件，用于群组和直接消息工作流。

- **[qwen](/plugins/reference/qwen)** (`@openclaw/qwen-provider`) - npm or ClawHub: `clawhub:@openclaw/qwen-provider`. Adds Qwen, Qwen Cloud, Model Studio, DashScope, Qwen Token Plan, Bailian Token Plan model provider support to OpenClaw.

- **[radius](/plugins/reference/radius)** (`@openclaw/radius-provider`) - npm or ClawHub: `clawhub:@openclaw/radius-provider`. Radius model gateway provider.

- **[raft](/plugins/reference/raft)** (`@openclaw/raft`) - npm or ClawHub: `clawhub:@openclaw/raft`. OpenClaw Raft channel plugin for secure CLI wake bridges.

- **[searxng](/plugins/reference/searxng)** (`@openclaw/searxng-plugin`) - npm or ClawHub: `clawhub:@openclaw/searxng-plugin`. Adds web search provider support.

- **[signal](/plugins/reference/signal)** (`@openclaw/signal`) - npm or ClawHub: `clawhub:@openclaw/signal`. OpenClaw Signal channel plugin.

- **[slack](/plugins/reference/slack)** (`@openclaw/slack`) - npm or ClawHub: `clawhub:@openclaw/slack`. OpenClaw Slack channel plugin for channels, DMs, commands, and app events.

- **[slack-huddles](/plugins/reference/slack-huddles)** (`@openclaw/slack-huddles`) - npm or ClawHub: `clawhub:@openclaw/slack-huddles`. Join Slack huddles through a dedicated Slack user in Chrome.

- **[sms](/plugins/reference/sms)** (`@openclaw/sms`) - npm or ClawHub: `clawhub:@openclaw/sms`. Twilio SMS/MMS channel plugin for OpenClaw messages.

- **[stepfun](/plugins/reference/stepfun)** (`@openclaw/stepfun-provider`) - npm or ClawHub: `clawhub:@openclaw/stepfun-provider`. Adds StepFun, StepFun Plan model provider support to OpenClaw.

- **[synology-chat](/plugins/reference/synology-chat)** (`@openclaw/synology-chat`) - npm or ClawHub: `clawhub:@openclaw/synology-chat`. Synology Chat channel plugin for OpenClaw channels and direct messages.

- **[synthetic](/plugins/reference/synthetic)** (`@openclaw/synthetic-provider`) - npm or ClawHub: `clawhub:@openclaw/synthetic-provider`. Adds Synthetic model provider support to OpenClaw.

- **[tavily](/plugins/reference/tavily)** (`@openclaw/tavily-plugin`) - npm or ClawHub: `clawhub:@openclaw/tavily-plugin`. Adds agent-callable tools. Adds web search provider support.

- **[team-reports](/plugins/reference/team-reports)** (`@openclaw/team-reports`) - npm or ClawHub: `clawhub:@openclaw/team-reports`. Daily, weekly, and monthly team activity reports from GitHub and Discord, with model-written summaries, served in the Control UI.

- **[teams-meetings](/plugins/reference/teams-meetings)** (`@openclaw/teams-meetings`) - npm or ClawHub: `clawhub:@openclaw/teams-meetings`. Join Microsoft Teams meetings as a Chrome browser guest.

- **[tencent](/plugins/reference/tencent)** (`@openclaw/tencent-provider`) - npm or ClawHub: `clawhub:@openclaw/tencent-provider`. Adds Tencent TokenHub, Tencent Tokenplan model provider support to OpenClaw.

- **[tlon](/plugins/reference/tlon)** (`@openclaw/tlon`) - npm or ClawHub: `clawhub:@openclaw/tlon`. OpenClaw Tlon/Urbit channel plugin for chat workflows.

- **[tokenjuice](/plugins/reference/tokenjuice)** (`@openclaw/tokenjuice`) - npm or ClawHub: `clawhub:@openclaw/tokenjuice`. Compacts exec and bash tool results with tokenjuice reducers.

- **[twitch](/plugins/reference/twitch)** (`@openclaw/twitch`) - npm or ClawHub: `clawhub:@openclaw/twitch`. OpenClaw Twitch channel plugin for chat and moderation workflows.

- **[typesafe](/plugins/reference/typesafe)** (`@openclaw/typesafe`) - npm or ClawHub: `clawhub:@openclaw/typesafe`. Typed decision provider for hosted Jev and local System One models.

- **[venice](/plugins/reference/venice)** (`@openclaw/venice-provider`) - npm or ClawHub: `clawhub:@openclaw/venice-provider`. Adds Venice model provider support to OpenClaw.

- **[vercel-ai-gateway](/plugins/reference/vercel-ai-gateway)** (`@openclaw/vercel-ai-gateway-provider`) - npm or ClawHub: `clawhub:@openclaw/vercel-ai-gateway-provider`. Adds Vercel AI Gateway model provider support to OpenClaw.

- **[voice-call](/plugins/reference/voice-call)** (`@openclaw/voice-call`) - npm or ClawHub: `clawhub:@openclaw/voice-call`. OpenClaw voice-call plugin for Twilio, Telnyx, and Plivo phone calls.

- **[volcengine](/plugins/reference/volcengine)** (`@openclaw/volcengine-provider`) - npm or ClawHub: `clawhub:@openclaw/volcengine-provider`. Adds Volcengine, Volcengine Plan model provider support to OpenClaw.

- **[voyage](/plugins/reference/voyage)** (`@openclaw/voyage-provider`) - npm or ClawHub: `clawhub:@openclaw/voyage-provider`. Adds embedding provider support, including memory search.

- **[vydra](/plugins/reference/vydra)** (`@openclaw/vydra-provider`) - npm or ClawHub: `clawhub:@openclaw/vydra-provider`. Adds Vydra model provider support to OpenClaw.

- **[whatsapp](/plugins/reference/whatsapp)** (`@openclaw/whatsapp`) - npm or ClawHub: `clawhub:@openclaw/whatsapp`. OpenClaw WhatsApp channel plugin for WhatsApp Web chats.

- **[xiaomi](/plugins/reference/xiaomi)** (`@openclaw/xiaomi-provider`) - npm or ClawHub: `clawhub:@openclaw/xiaomi-provider`. Adds Xiaomi, Xiaomi Token Plan model provider support to OpenClaw.

- **[zai](/plugins/reference/zai)** (`@openclaw/zai-provider`) - npm or ClawHub: `clawhub:@openclaw/zai-provider`. Adds Z.AI model provider support to OpenClaw.

- **[zalo](/plugins/reference/zalo)** (`@openclaw/zalo`) - npm or ClawHub: `clawhub:@openclaw/zalo`. OpenClaw Zalo channel plugin for bot and webhook chats.

- **[zalouser](/plugins/reference/zalouser)** (`@openclaw/zalouser`) - npm or ClawHub: `clawhub:@openclaw/zalouser`. OpenClaw Zalo Personal Account plugin via native zca-js integration.

- **[zoom-meetings](/plugins/reference/zoom-meetings)** (`@openclaw/zoom-meetings`) - npm or ClawHub: `clawhub:@openclaw/zoom-meetings`. Join Zoom meetings as a Chrome browser guest.

## 仅源代码检出

3 plugins

- **[qa-channel](/plugins/reference/qa-channel)** (`@openclaw/qa-channel`) - source checkout only. OpenClaw QA synthetic channel plugin.

- **[qa-lab](/plugins/reference/qa-lab)** (`@openclaw/qa-lab`) - source checkout only. OpenClaw QA lab plugin with private debugger UI and scenario runner.

- **[visitor-access](/plugins/reference/visitor-access)** (`@openclaw/visitor-access`) - source checkout only. Manage expiring visitor grants through one Cloudflare Access email policy.

## How this page is built

OpenClaw generates this page from the top-level
`extensions/*/openclaw.plugin.json` manifests and the root npm package
`files` exclusions. Optional `package.json` metadata enriches package and
distribution details. Regenerate the page with:

```bash
pnpm plugins:inventory:gen
```
