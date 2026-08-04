---
summary: "审计哪些功能会花钱、使用了哪些密钥，以及如何查看使用情况"
read_when:
  - 你想了解哪些功能可能会调用付费 API
  - 你需要审计密钥、成本和使用情况可见性
  - 你在解释 /status 或 /usage 的成本报告
title: "API 用量与成本"
---

OpenClaw 功能中可调用付费提供商 API 的部分、各自读取凭据的位置，以及产生的成本会显示在哪里。

## 成本显示位置

**`/status`**（每个会话的快照）

- 显示当前会话模型、上下文使用情况以及上一条回复的 token 数。
- 当 OpenClaw 拥有使用元数据以及当前模型的本地定价时，会为上一条回复添加**估算成本**，包括像 Bedrock `aws-sdk` 模型这类明确标价的非 API key 提供方。
- 如果实时会话快照信息较少，`/status` 会从最近的 transcript usage 条目中恢复 token/cache 计数器和当前模型标签。现有的非零实时值优先于 transcript 数据；当存储的总计缺失或更小时，按提示大小计算的 transcript 总计仍可能胜出。

**`/usage`**（每条消息的页脚）

- `/usage full` 会在每条回复后附加使用情况页脚，包括在配置了本地定价且有使用元数据可用时的**估算成本**。
- `/usage tokens` 只显示 token。订阅式 OAuth/token 和 CLI 运行时只显示 token，除非它们提供兼容的使用元数据以及明确的本地价格。
- `/usage cost` 输出本地成本摘要；`/usage off` 禁用页脚。
- Gemini CLI 说明：`stream-json` 和旧版 `json` 输出都会在 `stats` 中携带使用信息。OpenClaw 会将 `stats.cached` 规范化为 `cacheRead`，并在需要时根据 `stats.input_tokens - stats.cached` 推导输入 token。

**控制界面 → 使用情况**（跨会话分析）

- 显示所选日期范围内基于 transcript 的 token 总数和估算成本总计，并按提供方、模型、agent、渠道以及 token 类型进行细分。
- 对比以所选范围结束日期为终点的更短日历窗口。缺失日期按零使用量的日历日计算；不会被跳过以生成更密集的窗口。
- 直接标注每日图表刻度。`√` 徽标表示平方根压缩正在保持低使用量日期可见。
- 这些总计描述的是可用的本地会话历史，不是提供方账单或终身计费台账。对于某些条目缺少定价时，界面会发出警告。

**CLI 使用窗口**（提供方配额，不是每条消息成本）

- `openclaw status --usage` 和 `openclaw channels list` 将提供方的**使用窗口**显示为 `X% left`。
- 当前支持使用窗口的提供方：Anthropic、ClawRouter、DeepSeek、GitHub Copilot、MiniMax、OpenAI（涵盖 ChatGPT/Codex OAuth/token 身份验证）、Xiaomi 和 z.ai。完整的提供方/标志列表请参见 [模型 CLI](/cli/models) 和 [渠道 CLI](/cli/channels)。
- MiniMax 的原始 `usage_percent` / `usagePercent` 字段报告的是剩余配额，因此 OpenClaw 会对其进行反转；如果存在按数量统计的字段，则优先使用这些字段。如果响应包含 `model_remains` 数组，OpenClaw 会选择聊天模型条目，在需要时根据时间戳推导窗口标签，并将模型名称包含在方案标签中。
- 使用身份验证信息在可用时来自提供方专用钩子，否则 OpenClaw 会从身份验证配置文件、环境变量或配置中回退到匹配的 OAuth/API key 凭据。

参见 [Token 使用与成本](/reference/token-use) 获取详细示例。

<Note>
Anthropic 已确认 Claude CLI 复用（包括 `claude -p`）是一种被认可的集成模式，除非其发布新的政策。Anthropic 不提供每条消息的美元估算，因此 `/usage full` 无法显示 Claude CLI 使用的成本。
</Note>

## 密钥如何被发现

- **Auth profiles**: 每个代理单独配置，存储在 `auth-profiles.json` 中。
- **Environment variables**: 例如 `OPENAI_API_KEY`、`BRAVE_API_KEY`、`FIRECRAWL_API_KEY`。
- **Config**: `models.providers.*.apiKey`、`plugins.entries.*.config.webSearch.apiKey`、`plugins.entries.firecrawl.config.webFetch.apiKey`、`memory.search.*`、`talk.providers.*.apiKey`。
- **Skills**: `skills.entries.<name>.apiKey`，它可能会将密钥导出到技能进程的 env 中。

## 会花费密钥的功能

### 核心模型回复（聊天 + 工具）

每次回复或工具调用都会在当前模型提供商上运行。这是使用量和成本的主要来源，包括在 OpenClaw 本地 UI 之外计费的订阅式托管计划：OpenAI Codex、Alibaba Cloud Model Studio Coding Plan、MiniMax Coding Plan、Z.AI/GLM Coding Plan，以及启用了 Extra Usage 的 Anthropic Claude 登录路径。

参见 [模型](/providers/models) 了解价格配置，参见 [令牌使用量和成本](/reference/token-use) 了解展示方式。

### 媒体理解（音频/图像/视频）

传入的媒体可在回复流水线运行前，通过提供商 API 进行摘要或转写。提供商支持按插件注册，并会随着插件增加而变化；参见 [媒体理解](/nodes/media-understanding) 获取当前列表和配置。

### 图像和视频生成

`image_generate` 和 `video_generate` 会路由到当前可用的任一已认证提供商。两者都可以在其 `agents.defaults.mediaModels` 条目未设置时，推断出基于认证的提供商默认值。

参见 [图像生成](/tools/image-generation) 和 [视频生成](/tools/video-generation) 获取当前提供商列表。

### 记忆嵌入和语义搜索

当 `memory.search.provider` 指定远程适配器时，语义记忆搜索会使用 embedding API（例如 `openai`、`gemini`、`voyage`、`mistral`、`deepinfra`、`github-copilot`、`amazon-bedrock`）。`memory.search.provider = "lmstudio"` 或 `"ollama"` 会在本地/自托管服务器上运行，通常没有托管计费。`memory.search.provider = "local"` 则完全在设备端运行，不会产生 API 使用量。可选的 `memory.search.fallback` 提供商可用于覆盖本地 embedding 失败的情况。

参见 [记忆](/concepts/memory)。

### 网页搜索工具

`web_search` 的使用费用取决于所选提供商。每个提供商会先从环境变量读取密钥，然后再读取 `plugins.entries.<id>.config.webSearch.apiKey`：

| 提供商               | 环境变量                                                                                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brave Search         | `BRAVE_API_KEY`                                                                                                                                                        |
| DuckDuckGo           | 无需密钥；非官方、基于 HTML、无计费                                                                                                                                    |
| Exa                  | `EXA_API_KEY`                                                                                                                                                          |
| Firecrawl            | `FIRECRAWL_API_KEY`                                                                                                                                                    |
| Gemini（Google Search） | `GEMINI_API_KEY`                                                                                                                                                       |
| Grok（xAI）          | xAI OAuth 配置文件或 `XAI_API_KEY`                                                                                                                                     |
| Kimi（Moonshot）     | `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`                                                                                                                                   |
| MiniMax Search       | `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`、`MINIMAX_OAUTH_TOKEN` 或 `MINIMAX_API_KEY`                                                                         |
| Ollama Web Search    | 对于可访问且已登录的本地主机无需密钥；直接通过 `https://ollama.com` 搜索使用 `OLLAMA_API_KEY`；受认证保护的主机会复用正常的 Ollama 提供商 bearer 认证 |
| Parallel             | `PARALLEL_API_KEY`                                                                                                                                                     |
| Perplexity Search API | `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`                                                                                                                           |
| SearXNG               | `SEARXNG_BASE_URL`；无需密钥/自托管，无托管计费                                                                                                                        |
| Tavily               | `TAVILY_API_KEY`                                                                                                                                                       |

旧版 `tools.web.search.*` 配置路径仍会通过兼容层加载，但已不再是推荐方式。

**Brave Search 免费额度**：每个计划都包含每月 5 美元的可续期免费额度。Search 计划的价格为每 1,000 次请求 5 美元，因此该额度可覆盖每月 1,000 次请求且无需额外付费。请在 Brave 仪表板中设置使用上限，以避免意外收费。

参见 [网页工具](/tools/web)。

### 网页抓取工具（Firecrawl）

`web_fetch` 可通过 Firecrawl 使用免密钥的入门访问；如需更高限额，请添加 `FIRECRAWL_API_KEY`（或 `plugins.entries.firecrawl.config.webFetch.apiKey`）。如果未配置 Firecrawl，该工具会回退为直接抓取，并使用捆绑的 `web-readability` 插件（不使用付费 API）。禁用 `plugins.entries.web-readability.enabled` 可跳过本地 Readability 提取。

参见 [网页工具](/tools/web)。

### 提供商使用量快照（状态/运行状况）

`openclaw status --usage` 和 `openclaw models status --json` 会调用提供商使用量端点，以显示配额窗口或认证运行状况。这些调用量较低，但仍会访问提供商 API。

参见 [模型 CLI](/cli/models)。

### 压缩保护机制摘要

压缩保护机制可以使用当前模型对会话历史进行摘要，因此在运行时会调用提供商 API。

参见 [会话管理和压缩](/reference/session-management-compaction)。

### 模型扫描/探测

`openclaw models scan` 可以探测 OpenRouter 模型，并在启用探测时使用 `OPENROUTER_API_KEY`。

参见 [模型 CLI](/cli/models)。

### Talk（语音）

在已配置的情况下，Talk 模式可以调用 ElevenLabs：`ELEVENLABS_API_KEY` 或 `talk.providers.elevenlabs.apiKey`。

参见 [Talk 模式](/nodes/talk)。

### 技能（第三方 API）

Skills 可以将 `apiKey` 存储在 `skills.entries.<name>.apiKey` 中。如果某个 skill 使用该密钥访问外部 API，则费用取决于该 skill 的提供商。

参见 [Skills](/tools/skills)。

## 相关内容

- [Token 使用与成本](/reference/token-use)
- [提示缓存](/reference/prompt-caching)
- [使用情况跟踪](/concepts/usage-tracking)
