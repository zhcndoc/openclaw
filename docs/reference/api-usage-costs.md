---
summary: "审计哪些功能会花钱、使用了哪些密钥，以及如何查看使用情况"
read_when:
  - 你想了解哪些功能可能会调用付费 API
  - 你需要审计密钥、成本和使用情况可见性
  - 你在解释 /status 或 /usage 的成本报告
title: "API usage and costs"
---

本文列出了**可以调用 API 密钥的功能**以及它们的成本会显示在哪里。重点介绍了
能够产生提供方用量或付费 API 调用的 OpenClaw 功能。

## 成本显示位置（聊天 + CLI）

**单次会话成本快照**

- `/status` 显示当前会话模型、上下文使用情况和上次回复的 token 数。
- 如果模型使用的是 **API key 认证**，`/status` 还会显示上一条回复的**估算成本**。
- 如果实时会话元数据较少，`/status` 可以从最近的 transcript 用量
  条目中恢复 token/cache
  计数器以及当前运行时模型标签。现有的非零实时值仍然优先，并且当存储的总计缺失或更小时，
  以 prompt 规模的 transcript 总数为准的结果会胜出。

**单条消息成本页脚**

- `/usage full` 会在每条回复后附加一个用量页脚，包括**估算成本**（仅限 API key）。
- `/usage tokens` 只显示 token；订阅式 OAuth/token 和 CLI 流程会隐藏美元成本。
- Gemini CLI 说明：当 CLI 返回 JSON 输出时，OpenClaw 会从
  `stats` 中读取用量，将 `stats.cached` 规范化为 `cacheRead`，并在需要时从
  `stats.input_tokens - stats.cached` 推导输入 token。

Anthropic 说明：Anthropic 员工告诉我们，OpenClaw 风格的 Claude CLI 用法
已再次被允许，因此除非 Anthropic 发布新的政策，OpenClaw 会将 Claude CLI 复用和
`claude -p` 用法视为对此集成的授权使用。
不过 Anthropic 仍然不会公开 OpenClaw 能在 `/usage full` 中显示的
逐条消息美元估算。

**CLI 使用窗口（提供方配额）**

- `openclaw status --usage` 和 `openclaw channels list` 会显示提供方**使用窗口**
  （配额快照，不是单条消息成本）。
- 人类可读输出会在不同提供方之间统一为 `X% left`。
- 当前支持使用窗口的提供方：Anthropic、GitHub Copilot、Gemini CLI、
  OpenAI Codex、MiniMax、小米和 z.ai。
- MiniMax 说明：其原始的 `usage_percent` / `usagePercent` 字段表示剩余
  配额，因此 OpenClaw 在显示前会反转它们。基于数量的字段在存在时仍然优先。如果提供方返回
  `model_remains`，OpenClaw 会优先使用聊天模型条目，在需要时根据时间戳推导窗口标签，
  并在计划标签中包含模型名称。
- 这些配额窗口的使用认证会在可用时来自提供方特定的钩子；否则 OpenClaw 会回退到从 auth 配置文件、环境变量或配置中匹配 OAuth/API key 凭据。

详见 [Token 使用与成本](/reference/token-use) 以获取更多细节和示例。

## 密钥如何被发现

OpenClaw 可以从以下来源获取凭据：

- **Auth 配置文件**（按代理存储，保存在 `auth-profiles.json` 中）。
- **环境变量**（例如 `OPENAI_API_KEY`、`BRAVE_API_KEY`、`FIRECRAWL_API_KEY`）。
- **配置**（`models.providers.*.apiKey`、`plugins.entries.*.config.webSearch.apiKey`、
  `plugins.entries.firecrawl.config.webFetch.apiKey`、`memorySearch.*`、
  `talk.providers.*.apiKey`）。
- **技能**（`skills.entries.<name>.apiKey`），它们可能会将密钥导出到技能进程的环境变量中。

## 会花费密钥的功能

### 1) 核心模型回复（聊天 + 工具）

每次回复或工具调用都会使用**当前模型提供方**（OpenAI、Anthropic 等）。这是
用量和成本的主要来源。

这也包括仍然在 OpenClaw 本地界面之外计费的订阅式托管提供方，例如 **OpenAI Codex**、**阿里云 Model Studio Coding Plan**、**MiniMax Coding Plan**、**Z.AI / GLM Coding Plan**，以及
Anthropic 的 OpenClaw Claude 登录路径并启用 **Extra Usage** 的情况。

有关价格配置请参见 [Models](/providers/models)，有关显示请参见 [Token 使用与成本](/reference/token-use)。

### 2) 媒体理解（音频/图片/视频）

传入的媒体在回复运行前可以被总结/转录。这会使用模型/提供方 API。

- 音频：OpenAI / Groq / Deepgram / DeepInfra / Google / Mistral。
- 图片：OpenAI / OpenRouter / Anthropic / DeepInfra / Google / MiniMax / Moonshot / Qwen / Z.AI。
- 视频：Google / Qwen / Moonshot。

参见 [媒体理解](/nodes/media-understanding)。

### 3) 图片和视频生成

共享生成能力也可能会消耗提供方密钥：

- 图片生成：OpenAI / Google / DeepInfra / fal / MiniMax
- 视频生成：DeepInfra / Qwen

当 `agents.defaults.imageGenerationModel` 未设置时，图片生成可以推断一个由认证支持的提供方默认值。视频生成目前
需要显式设置 `agents.defaults.videoGenerationModel`，例如
`qwen/wan2.6-t2v`。

参见 [图片生成](/tools/image-generation)、[Qwen Cloud](/providers/qwen) 和 [Models](/concepts/models)。

### 4) 记忆嵌入 + 语义搜索

当为远程提供方配置时，语义记忆搜索会使用**嵌入 API**：

- `memorySearch.provider = "openai"` → OpenAI embeddings
- `memorySearch.provider = "gemini"` → Gemini embeddings
- `memorySearch.provider = "voyage"` → Voyage embeddings
- `memorySearch.provider = "mistral"` → Mistral embeddings
- `memorySearch.provider = "deepinfra"` → DeepInfra embeddings
- `memorySearch.provider = "lmstudio"` → LM Studio embeddings（本地/自托管）
- `memorySearch.provider = "ollama"` → Ollama embeddings（本地/自托管；通常没有托管 API 计费）
- 如果本地嵌入失败，可选地回退到远程提供方

你可以将其保持为本地模式：`memorySearch.provider = "local"`（无 API 用量）。

参见 [Memory](/concepts/memory)。

### 5) 网页搜索工具

`web_search` 可能会根据你的提供方产生使用费用：

- **Brave Search API**：`BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey`
- **Exa**：`EXA_API_KEY` 或 `plugins.entries.exa.config.webSearch.apiKey`
- **Firecrawl**：`FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webSearch.apiKey`
- **Gemini（Google Search）**：`GEMINI_API_KEY` 或 `plugins.entries.google.config.webSearch.apiKey`
- **Grok（xAI）**：`XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey`
- **Kimi（Moonshot）**：`KIMI_API_KEY`、`MOONSHOT_API_KEY`，或 `plugins.entries.moonshot.config.webSearch.apiKey`
- **MiniMax Search**：`MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`、`MINIMAX_API_KEY`，或 `plugins.entries.minimax.config.webSearch.apiKey`
- **Ollama Web Search**：对于可访问的已登录本地 Ollama 主机可免密钥；直接 `https://ollama.com` 搜索使用 `OLLAMA_API_KEY`，并且受认证保护的主机可以复用正常的 Ollama 提供方 bearer 认证
- **Perplexity Search API**：`PERPLEXITY_API_KEY`、`OPENROUTER_API_KEY`，或 `plugins.entries.perplexity.config.webSearch.apiKey`
- **Tavily**：`TAVILY_API_KEY` 或 `plugins.entries.tavily.config.webSearch.apiKey`
- **DuckDuckGo**：免密钥回退（无 API 计费，但非官方且基于 HTML）
- **SearXNG**：`SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`（免密钥/自托管；无托管 API 计费）

旧的 `tools.web.search.*` 提供方路径仍会通过临时兼容层加载，但它们已不再是推荐的配置入口。

**Brave Search 免费额度：** 每个 Brave 套餐都包含每月 \$5 的可续期
免费额度。Search 套餐的价格是每 1,000 次请求 \$5，因此该额度可覆盖
每月 1,000 次请求且无需额外付费。请在 Brave 控制台中设置使用上限，
以避免意外收费。

参见 [Web 工具](/tools/web)。

### 5) 网页抓取工具（Firecrawl）

`web_fetch` 在存在 API key 时可以调用 **Firecrawl**：

- `FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webFetch.apiKey`

如果未配置 Firecrawl，该工具会回退到直接抓取以及捆绑的 `web-readability` 插件（无付费 API）。禁用 `plugins.entries.web-readability.enabled` 可跳过本地 Readability 提取。

参见 [Web 工具](/tools/web)。

### 6) 提供方使用快照（status/health）

某些状态命令会调用**提供方使用端点**来显示配额窗口或认证健康状态。
这些通常是低频调用，但仍会访问提供方 API：

- `openclaw status --usage`
- `openclaw models status --json`

参见 [Models CLI](/cli/models)。

### 7) 处理压缩保护的摘要生成

处理压缩保护可以使用**当前模型**来总结会话历史，这会在运行时调用提供方 API。

参见 [会话管理 + 处理压缩](/reference/session-management-compaction)。

### 8) 模型扫描 / 探测

`openclaw models scan` 可以探测 OpenRouter 模型，并在启用探测时使用 `OPENROUTER_API_KEY`。

参见 [Models CLI](/cli/models)。

### 9) Talk（语音）

在配置后，Talk 模式可以调用 **ElevenLabs**：

- `ELEVENLABS_API_KEY` 或 `talk.providers.elevenlabs.apiKey`

参见 [Talk 模式](/nodes/talk)。

### 10) 技能（第三方 API）

Skills 可以将 `apiKey` 存储在 `skills.entries.<name>.apiKey` 中。如果某个技能将该密钥用于外部
API，则会根据该技能的提供方产生费用。

参见 [Skills](/tools/skills)。

## 相关内容

- [Token 使用与成本](/reference/token-use)
- [提示缓存](/reference/prompt-caching)
- [使用情况跟踪](/concepts/usage-tracking)
