---
summary: "审计哪些功能可能花费资金，哪些密钥被使用，以及如何查看使用情况"
read_when:
  - 你想了解哪些功能可能调用付费 API
  - 你需要审计密钥、费用和使用情况的可见性
  - 你正在解释 /status 或 /usage 的费用报告
title: "API 使用与费用"
---

# API 使用与费用

本文档列出了**可能调用 API 密钥的功能**及其费用出现的位置。重点关注
OpenClaw 中可能生成提供商调用或付费 API 的功能。

## 费用显示位置（聊天 + CLI）

**每会话费用快照**

- `/status` 显示当前会话模型、上下文使用量和最后回复的 token。
- 如果模型使用 **API 密钥认证**，`/status` 还会显示最后回复的 **估算费用**。
- 如果实时会话元数据稀疏，`/status` 可以从最新的使用记录条目中恢复 token/缓存
  计数器和活动运行时模型标签。现有的非零实时值仍然优先，当存储的总计缺失或较小时，
  提示大小的转录总计可以胜出。

**每条消息费用页脚**

- `/usage full` 为每条回复附加使用量页脚，包括 **估算费用**（仅限 API 密钥）。
- `/usage tokens` 仅显示 token；订阅式 OAuth/token 和 CLI 流程隐藏美元费用。
- Gemini CLI 注意：当 CLI 返回 JSON 输出时，OpenClaw 从
  `stats` 读取使用量，将 `stats.cached` 标准化为 `cacheRead`，并在需要时从
  `stats.input_tokens - stats.cached` 推导输入 token。

Anthropic 注意：Anthropic 工作人员告诉我们 OpenClaw 风格的 Claude CLI 使用再次被
允许，因此 OpenClaw 将 Claude CLI 重用和 `claude -p` 使用视为此集成的授权行为，除非
Anthropic 发布新政策。Anthropic 仍然不公开 OpenClaw 可以在
`/usage full` 中显示的每条消息美元估算值。

**CLI 使用窗口（提供商配额）**

- `openclaw status --usage` 和 `openclaw channels list` 显示提供商 **使用窗口**
  （配额快照，而非每条消息费用）。
- 人类输出在所有提供商之间标准化为 `剩余 X%`。
- 当前使用窗口提供商：Anthropic、GitHub Copilot、Gemini CLI、
  OpenAI Codex、MiniMax、Xiaomi 和 z.ai。
- MiniMax 注意：其原始 `usage_percent` / `usagePercent` 字段意味着剩余
  配额，因此 OpenClaw 在显示前将其反转。当存在基于计数的字段时仍然优先。如果提供商返回 `model_remains`，OpenClaw 优先使用
  聊天模型条目，在需要时从时间戳推导窗口标签，并在计划标签中包含模型名称。
- 这些配额窗口的使用认证来自特定提供商的钩子（如果可用）；否则 OpenClaw 回退到匹配来自认证配置文件、环境变量或配置的 OAuth/API 密钥
  凭证。

详情和示例请见 [Token 使用与费用](/reference/token-use)。

## 如何发现密钥

OpenClaw 可以从以下位置获取凭证：

- **认证配置文件** (每个代理，存储在 `auth-profiles.json` 中)。
- **环境变量** (例如 `OPENAI_API_KEY`、`BRAVE_API_KEY`、`FIRECRAWL_API_KEY`)。
- **配置** (`models.providers.*.apiKey`、`plugins.entries.*.config.webSearch.apiKey`、
  `plugins.entries.firecrawl.config.webFetch.apiKey`、`memorySearch.*`、
  `talk.providers.*.apiKey`)。
- **技能** (`skills.entries.<name>.apiKey`) 可能会将密钥导出到技能进程环境中。

## 可能花费密钥的功能

### 1) 核心模型回复（聊天 + 工具）

每次回复或调用工具都会使用**当前模型提供商**（OpenAI、Anthropic 等）。这是
主要的使用和费用来源。

这也包括仍在外部落账单的订阅式托管提供商，例如 **OpenAI Codex**、**Alibaba Cloud Model Studio
Coding Plan**、**MiniMax Coding Plan**、**Z.AI / GLM Coding Plan**，以及
启用了 **额外使用量** 的 Anthropic OpenClaw Claude 登录路径。

请参阅 [模型](/providers/models) 了解定价配置，以及 [Token 使用与费用](/reference/token-use) 了解显示内容。

### 2) 媒体理解（音频 / 图片 / 视频）

输入的媒体可以在回复前被摘要或转录。这会使用模型/提供商 API。

- 音频：OpenAI / Groq / Deepgram / Google / Mistral。
- 图片：OpenAI / OpenRouter / Anthropic / Google / MiniMax / Moonshot / Qwen / Z.AI。
- 视频：Google / Qwen / Moonshot。

详情见 [媒体理解](/nodes/media-understanding)。

### 3) 图片和视频生成

共享生成能力也会消耗提供商密钥：

- 图片生成：OpenAI / Google / fal / MiniMax
- 视频生成：Qwen

当 `agents.defaults.imageGenerationModel` 未设置时，图片生成可以推断基于认证的提供商默认值。视频生成目前需要显式的 `agents.defaults.videoGenerationModel`，例如
`qwen/wan2.6-t2v`。

请参阅 [图片生成](/tools/image-generation)、[Qwen Cloud](/providers/qwen)
和 [模型](/concepts/models)。

### 4) 记忆嵌入 + 语义搜索

语义记忆搜索在配置为远程提供商时会使用**嵌入 API**：

- `memorySearch.provider = "openai"` → OpenAI embeddings
- `memorySearch.provider = "gemini"` → Gemini embeddings
- `memorySearch.provider = "voyage"` → Voyage embeddings
- `memorySearch.provider = "mistral"` → Mistral embeddings
- `memorySearch.provider = "lmstudio"` → LM Studio embeddings (本地/自托管)
- `memorySearch.provider = "ollama"` → Ollama embeddings (本地/自托管；通常没有托管 API 计费)
- 可选地，在本地嵌入失败时回退到远程提供商

您也可以使用 `memorySearch.provider = "local"` 保持本地，无需调用 API。

见 [记忆](/concepts/memory)。

### 5) 网络搜索工具

根据您的提供商不同，`web_search` 可能会产生使用费用：

- **Brave Search API**: `BRAVE_API_KEY` or `plugins.entries.brave.config.webSearch.apiKey`
- **Exa**: `EXA_API_KEY` or `plugins.entries.exa.config.webSearch.apiKey`
- **Firecrawl**: `FIRECRAWL_API_KEY` or `plugins.entries.firecrawl.config.webSearch.apiKey`
- **Gemini (Google Search)**: `GEMINI_API_KEY` or `plugins.entries.google.config.webSearch.apiKey`
- **Grok (xAI)**: `XAI_API_KEY` or `plugins.entries.xai.config.webSearch.apiKey`
- **Kimi (Moonshot)**: `KIMI_API_KEY`, `MOONSHOT_API_KEY`, or `plugins.entries.moonshot.config.webSearch.apiKey`
- **MiniMax Search**: `MINIMAX_CODE_PLAN_KEY`, `MINIMAX_CODING_API_KEY`, `MINIMAX_API_KEY`, or `plugins.entries.minimax.config.webSearch.apiKey`
- **Ollama Web Search**: 对于可访问的已登录本地 Ollama 主机无需密钥；直接 `https://ollama.com` 搜索使用 `OLLAMA_API_KEY`，受认证保护的主机可以复用正常的 Ollama 提供商 Bearer 认证
- **Perplexity Search API**: `PERPLEXITY_API_KEY`, `OPENROUTER_API_KEY`, or `plugins.entries.perplexity.config.webSearch.apiKey`
- **Tavily**: `TAVILY_API_KEY` or `plugins.entries.tavily.config.webSearch.apiKey`
- **DuckDuckGo**: 无密钥回退（无 API 计费，但非官方且基于 HTML）
- **SearXNG**: `SEARXNG_BASE_URL` or `plugins.entries.searxng.config.webSearch.baseUrl`（无需密钥/自托管；无托管 API 计费）

遗留的 `tools.web.search.*` 提供商路径仍然通过临时兼容层加载，但它们不再是推荐的配置表面。

**Brave Search 免费额度：** 每个 Brave 计划包含每月 5 美元的可续订免费额度。搜索计划每 1,000 次请求收费 5 美元，因此该额度涵盖每月 1,000 次请求免收费。请在 Brave 仪表板中设置使用限制，以避免意外收费。

详情见 [网络工具](/tools/web)。

### 6) 网络抓取工具（Firecrawl）

`web_fetch` 可在存在 API 密钥时调用 **Firecrawl**：

- `FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webFetch.apiKey`

如果未配置 Firecrawl，该工具会回退到直接抓取加上内置的 `web-readability` 插件（无付费 API）。禁用 `plugins.entries.web-readability.enabled` 可跳过本地 Readability 提取。

详情见 [网络工具](/tools/web)。

### 7) 提供商使用快照（状态 / 健康）

部分状态命令会调用**提供商使用端点**，以展示配额窗口或认证健康状况。
这些通常是低频调用，但仍会触及提供商 API：

- `openclaw status --usage`
- `openclaw models status --json`

详情见 [模型 CLI](/cli/models)。

### 8) 紧缩保护摘要

紧缩保护可以使用**当前模型**摘要会话历史，运行时会调用提供商 API。

详情见 [会话管理 + 紧缩](/reference/session-management-compaction)。

### 9) 模型扫描 / 探测

`openclaw models scan` 可探测 OpenRouter 模型，在启用探测时使用 `OPENROUTER_API_KEY`。

详情见 [模型 CLI](/cli/models)。

### 10) Talk（语音）

Talk 模式在配置时可调用 **ElevenLabs**：

- `ELEVENLABS_API_KEY` 或 `talk.providers.elevenlabs.apiKey`

详情见 [Talk 模式](/nodes/talk)。

### 11) 技能（第三方 API）

技能可以在 `skills.entries.<name>.apiKey` 中存储 `apiKey`。如果技能使用该密钥调用外部 API，
则会根据技能的提供商产生成本。

见 [技能](/tools/skills)。

## 相关内容

- [Token 使用与费用](/reference/token-use)
- [提示缓存](/reference/prompt-caching)
- [使用情况跟踪](/concepts/usage-tracking)
