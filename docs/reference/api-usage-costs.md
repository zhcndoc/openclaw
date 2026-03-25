---
summary: "审计哪些功能可能花费资金，哪些密钥被使用，以及如何查看使用情况"
read_when:
  - 您想了解哪些功能可能调用付费 API
  - 您需要审计密钥、费用以及使用情况的可见性
  - 您正在解释 /status 或 /usage 的费用报告
title: "API 使用和费用"
---

# API 使用与费用

本文档列出了**可能调用 API 密钥的功能**及其费用出现的位置。重点关注
OpenClaw 中可能生成提供商调用或付费 API 的功能。

## 费用显示位置（聊天 + CLI）

**每会话费用快照**

- `/status` 显示当前会话模型、上下文使用情况和最后回复所用的 token 数。
- 如果模型使用 **API 密钥认证**，`/status` 还会显示**最后一次回复的预估费用**。

**每条消息费用页脚**

- `/usage full` 会在每次回复末尾附加使用情况页脚，包括**预估费用**（仅限 API 密钥认证）。
- `/usage tokens` 仅显示 token 数；OAuth 流程则隐藏美元费用。

**CLI 使用窗口（提供商配额）**

- `openclaw status --usage` 和 `openclaw channels list` 显示提供商的**使用窗口**
  （配额快照，不是每条消息的费用）。

详情和示例请见 [Token use & costs](/reference/token-use)。

## 如何发现密钥

OpenClaw 可以从以下位置获取凭证：

- **认证配置文件**（针对单个代理，存储在 `auth-profiles.json` 中）。
- **环境变量**（例如 `OPENAI_API_KEY`，`BRAVE_API_KEY`，`FIRECRAWL_API_KEY`）。
- **配置文件**（`models.providers.*.apiKey`，`tools.web.search.*`，`tools.web.fetch.firecrawl.*`，
  `memorySearch.*`，`talk.apiKey`）。
- **技能**（`skills.entries.<name>.apiKey`），可能将密钥导出到技能进程的环境变量。

## 可能花费密钥的功能

### 1) 核心模型回复（聊天 + 工具）

每次回复或调用工具都会使用**当前模型提供商**（OpenAI、Anthropic 等）。这是
主要的使用和费用来源。

定价配置见 [Models](/providers/models)，展示详情见 [Token use & costs](/reference/token-use)。

### 2) 媒体理解（音频 / 图片 / 视频）

输入的媒体可以在回复前被摘要或转录。这会使用模型/提供商 API。

- 音频：OpenAI / Groq / Deepgram（当存在密钥时**自动启用**）。
- 图片：OpenAI / Anthropic / Google。
- 视频：Google。

详情见 [Media understanding](/nodes/media-understanding)。

### 3) 记忆嵌入 + 语义搜索

语义记忆搜索在配置为远程提供商时会使用**嵌入 API**：

- `memorySearch.provider = "openai"` → OpenAI 嵌入
- `memorySearch.provider = "gemini"` → Gemini 嵌入
- `memorySearch.provider = "voyage"` → Voyage 嵌入
- `memorySearch.provider = "mistral"` → Mistral 嵌入
- `memorySearch.provider = "ollama"` → Ollama 嵌入（本地/自托管；通常无托管 API 计费）
- 本地嵌入失败时可选回退到远程提供商

您也可以使用 `memorySearch.provider = "local"` 保持本地，无需调用 API。

见 [Memory](/concepts/memory)。

### 4) Web 搜索工具

`web_search` 使用 API 密钥并可能产生费用，具体取决于您的提供商：

- **Brave Search API**: `BRAVE_API_KEY` or `plugins.entries.brave.config.webSearch.apiKey`
- **Gemini (Google Search)**: `GEMINI_API_KEY` or `plugins.entries.google.config.webSearch.apiKey`
- **Grok (xAI)**: `XAI_API_KEY` or `plugins.entries.xai.config.webSearch.apiKey`
- **Kimi (Moonshot)**: `KIMI_API_KEY`, `MOONSHOT_API_KEY`, or `plugins.entries.moonshot.config.webSearch.apiKey`
- **Perplexity Search API**: `PERPLEXITY_API_KEY`, `OPENROUTER_API_KEY`, or `plugins.entries.perplexity.config.webSearch.apiKey`

Legacy `tools.web.search.*` provider paths still load through the temporary compatibility shim, but they are no longer the recommended config surface.

**Brave Search 免费额度：** 每个 Brave 计划包含每月 5 美元的可续订免费额度。搜索计划每 1,000 次请求收费 5 美元，因此该额度涵盖每月 1,000 次请求免收费。请在 Brave 仪表板中设置使用限制，以避免意外收费。

详情见 [Web tools](/tools/web)。

### 5) 网络抓取工具（Firecrawl）

`web_fetch` 可在存在 API 密钥时调用 **Firecrawl**：

- `FIRECRAWL_API_KEY` 或 `tools.web.fetch.firecrawl.apiKey`

如果未配置 Firecrawl，工具则回退到直接抓取 + 可读性解析（无付费 API）。

详情见 [Web tools](/tools/web)。

### 6) 提供商使用快照（状态 / 健康）

部分状态命令会调用**提供商使用端点**，以展示配额窗口或认证健康状况。
这些通常是低频调用，但仍会触及提供商 API：

- `openclaw status --usage`
- `openclaw models status --json`

详情见 [Models CLI](/cli/models)。

### 7) 紧缩保护摘要

紧缩保护可以使用**当前模型**摘要会话历史，运行时会调用提供商 API。

详情见 [Session management + compaction](/reference/session-management-compaction)。

### 8) 模型扫描 / 探测

`openclaw models scan` 可探测 OpenRouter 模型，在启用探测时使用 `OPENROUTER_API_KEY`。

详情见 [Models CLI](/cli/models)。

### 9) Talk（语音）

Talk 模式在配置时可调用 **ElevenLabs**：

- `ELEVENLABS_API_KEY` 或 `talk.apiKey`

详情见 [Talk mode](/nodes/talk)。

### 10) 技能（第三方 API）

技能可以在 `skills.entries.<name>.apiKey` 中存储 `apiKey`。如果技能使用该密钥调用外部 API，
则会根据技能的提供商产生成本。

详情见 [Skills](/tools/skills)。
