---
summary: "审计哪些功能会花钱、使用了哪些密钥，以及如何查看使用情况"
read_when:
  - "您想了解哪些功能可以调用付费 API"
  - "你需要审计密钥、成本和使用情况可见性"
  - "你在解释 /status 或 /usage 的成本报告"
title: "API 用量与成本"
---

OpenClaw 功能图，可以调用付费提供商 API，其中每个 API 读取其凭证，并显示生成的成本。

## <a id="where-costs-show-up"></a> 成本显示位置

**`/status`**（每个会话的快照）

- 显示当前会话模型、上下文使用情况以及上一条回复的 token 数。
- 当 OpenClaw 具有活动模型的使用元数据和本地定价（包括明确定价的非 API-key 提供程序（例如 Bedrock `aws-sdk` 模型）时，为最后回复添加 **estimated cost**。
- 如果实时会话快照信息较少，`/status` 会从最近的 transcript usage 条目中恢复 token/cache 计数器和当前模型标签。现有的非零实时值优先于 transcript 数据；当存储的总计缺失或更小时，按提示大小计算的 transcript 总计仍可能胜出。

**`/usage`**（每条消息的页脚）

- `/usage full` 会在每条回复后附加使用情况页脚，包括在配置了本地定价且有使用元数据可用时的**估算成本**。
- `/usage tokens` 只显示 token。订阅式 OAuth/token 和 CLI 运行时只显示 token，除非它们提供兼容的使用元数据以及明确的本地价格。
- `/usage cost` 输出本地成本摘要；`/usage off` 禁用页脚。
- Gemini CLI 说明：`stream-json` 和旧版 `json` 输出都会在 `stats` 中携带使用信息。OpenClaw 会将 `stats.cached` 规范化为 `cacheRead`，并在需要时根据 `stats.input_tokens - stats.cached` 推导输入 token。

**Control UI → 用法**（跨会话分析）

- 显示所选日期范围内基于 transcript 的 token 总数和估算成本总计，并按提供方、模型、agent、渠道以及 token 类型进行细分。
- Named 会话使用其存储的代理所有者。不同代理下的相同会话 ID 保持独立，包括对历史沿袭进行分组时。
- 会话重置后，甚至在新会话收到第一条消息之前，分组历史记录仍然可见。过滤和 JSON 导出保留缺少模型价格的条目的细分。
- 对比以所选范围结束日期为终点的更短日历窗口。缺失日期按零使用量的日历日计算；不会被跳过以生成更密集的窗口。
- 直接标注每日图表刻度。`√` 徽标表示平方根压缩正在保持低使用量日期可见。
- 这些总计描述了可用的本地会话历史记录，而不是提供商发票或生命周期帐单。当某些条目的定价缺失时，UI 会发出警告。

**CLI 使用窗口**（提供方配额，不是每条消息成本）

- `openclaw status --usage` 和 `openclaw channels list` 将提供方的**使用窗口**显示为 `X% left`。
- Usage-window 提供程序，对照 2026.9.3 检查：Anthropic、ClawRouter、DeepSeek、GitHub Copilot、MiniMax、OpenAI（涵盖ChatGPT/Codex OAuth/token auth）、OpenRouter、Venice、xAI、Xiaomi、Xiaomi Token Plan 和 z.ai. Provider 插件提供这些快照，因此已安装的插件可以添加一个。有关完整的 provider/flag 列表，请参阅 [ 模型 CLI](/cli/models) 和 [ 通道 CLI](/cli/channels)。
- MiniMax 的原始 `usage_percent` / `usagePercent` 字段报告的是剩余配额，因此 OpenClaw 会对其进行反转；如果存在按数量统计的字段，则优先使用这些字段。如果响应包含 `model_remains` 数组，OpenClaw 会选择聊天模型条目，在需要时根据时间戳推导窗口标签，并将模型名称包含在方案标签中。
- Usage 身份验证来自特定于提供者的挂钩（如果可用），否则 OpenClaw 会回退到匹配来自身份验证配置文件、env 或配置的 OAuth/API-key 凭据。

参见 [Token 使用与成本](/reference/token-use) 获取详细示例。

<Note>
截至2026年7月5日，Anthropic已确认Claude CLI重用（包括`claude -p`）是一种认可的集成模式，除非它发布新的策略；在依赖 Anthropic 之前，请重新检查其当前条款。 Anthropic 不会公开每条消息的美元估算，因此 `/usage full` 无法显示 Claude CLI 使用的成本。
</Note>

## <a id="how-keys-are-discovered"></a> 密钥如何被发现

- **Auth 配置文件**：SQLite 存储，代理本地配置文件覆盖共享的通读基础。请参阅 [Auth 凭证语义](/auth-credential-semantics#agent-copy-portability)。
- **Environment variables**: 例如 `OPENAI_API_KEY`、`BRAVE_API_KEY`、`FIRECRAWL_API_KEY`。
- **Config**：`models.providers.*.apiKey`、`plugins.entries.*.config.webSearch.apiKey`、`plugins.entries.firecrawl.config.webFetch.apiKey`、`memory.search.*`、`talk.providers.*.apiKey`。
- **Skills**: `skills.entries.<name>.apiKey`，它可能会将密钥导出到技能进程的 env 中。

## <a id="features-that-can-spend-keys"></a> 会花费密钥的功能

### <a id="core-model-responses-(chat-%2B-tools)"></a><a id="core-model-responses-chat-+-tools"></a> 核心模型回复（聊天 + 工具）

每个回复或工具调用都在当前模型提供程序上运行。这是使用量和成本的主要来源，包括在 OpenClaw 本地 UI 之外计费的订阅式托管计划：OpenAI Codex、阿里云模型工作室编码计划、MiniMax 编码计划、Z.AI/GLM 编码计划和 Anthropic 的编码计划Claude-登录路径启用了额外使用。

参见 [模型](/providers/models) 了解价格配置，参见 [令牌使用量和成本](/reference/token-use) 了解展示方式。

### <a id="media-understanding-(audio%2Fimage%2Fvideo)"></a><a id="media-understanding-audio/image/video"></a> 媒体了解（audio/image/video）

传入的媒体可在回复流水线运行前，通过提供商 API 进行摘要或转写。提供商支持按插件注册，并会随着插件增加而变化；参见 [媒体理解](/nodes/media-understanding) 获取当前列表和配置。

### <a id="image-and-video-generation"></a> 图像和视频生成

`image_generate` 和 `video_generate` 会路由到当前可用的任一已认证提供商。两者都可以在其 `agents.defaults.mediaModels` 条目未设置时，推断出基于认证的提供商默认值。

参见 [图像生成](/tools/image-generation) 和 [视频生成](/tools/video-generation) 获取当前提供商列表。

### <a id="memory-embeddings-and-semantic-search"></a> 记忆嵌入和语义搜索

当 `memory.search.provider` 命名远程适配器（例如 `openai`、`gemini`、`voyage`、`mistral`、`deepinfra`、`github-copilot`、`amazon-bedrock`）时，语义记忆搜索使用嵌入 API。 `memory.search.provider = "lmstudio"` 或 `"ollama"` 针对 local/self-hosted 服务器运行，通常没有托管计费。 `memory.search.provider = "local"` 将所有内容保留在设备上，而不使用 API。可选的 `memory.search.fallback` 提供程序可以解决本地嵌入故障。

参见 [记忆](/concepts/memory)。

### <a id="web-search-tool"></a> 网页搜索工具

`web_search` 的使用费用取决于所选提供商。每个提供商会先从环境变量读取密钥，然后再读取 `plugins.entries.<id>.config.webSearch.apiKey`：

| 提供者               | 环境变量                                                                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brave Search           | `BRAVE_API_KEY`                                                                                                                                                        |
| DuckDuckGo             | 无钥匙；非官方，基于HTML-，不计费                                                                                                                           |
| Exa                    | `EXA_API_KEY`                                                                                                                                                          |
| Firecrawl              | `FIRECRAWL_API_KEY`                                                                                                                                                    |
| Gemini（Google 搜索） | `GEMINI_API_KEY`                                                                                                                                                       |
| Grok (xAI)             | xAI OAuth 配置文件或 `XAI_API_KEY`                                                                                                                                     |
| Kimi (Moonshot)        | `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`                                                                                                                                   |
| MiniMax 搜索         | `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`、`MINIMAX_OAUTH_TOKEN` 或 `MINIMAX_API_KEY`                                                                         |
| Ollama 网页搜索      | 对于可访问且已登录的本地主机无需密钥；直接通过 `https://ollama.com` 搜索使用 `OLLAMA_API_KEY`；受认证保护的主机会复用正常的 Ollama 提供商 bearer 认证 |
| 平行线               | `PARALLEL_API_KEY`                                                                                                                                                     |
| Perplexity 搜索 API  | `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`                                                                                                                           |
| SearXNG                | `SEARXNG_BASE_URL`； key-free/self-hosted，无托管计费                                                                                                            |
| Tavily                 | `TAVILY_API_KEY`                                                                                                                                                       |

旧版 `tools.web.search.*` 配置路径仍会通过兼容层加载，但已不再是推荐方式。

**Brave Search 免费积分**：每个计划包括每月 5 美元的续订免费积分。搜索计划每 1,000 个请求的费用为 5 美元，因此免费赠送 1,000 个 requests/month。在 Brave 仪表板中设置使用限制以避免意外收费。

参见 [网页工具](/tools/web)。

### <a id="web-fetch-tool-(firecrawl)"></a><a id="web-fetch-tool-firecrawl"></a> 网页抓取工具（Firecrawl）

`web_fetch` 可通过 Firecrawl 使用免密钥的入门访问；如需更高限额，请添加 `FIRECRAWL_API_KEY`（或 `plugins.entries.firecrawl.config.webFetch.apiKey`）。如果未配置 Firecrawl，该工具会回退为直接抓取，并使用捆绑的 `web-readability` 插件（不使用付费 API）。禁用 `plugins.entries.web-readability.enabled` 可跳过本地 Readability 提取。

参见 [网页工具](/tools/web)。

### <a id="provider-usage-snapshots-(status%2Fhealth)"></a><a id="provider-usage-snapshots-status/health"></a> Provider 使用情况快照 （status/health）

`openclaw status --usage` 和 `openclaw models status --json` 调用提供程序使用端点来显示配额窗口或身份验证运行状况。调用量很小，但仍然会影响提供商 API。

参见 [模型 CLI](/cli/models)。

### <a id="compaction-safeguard-summarization"></a> 压缩保护机制摘要

压缩防护措施可以使用当前模型汇总会话历史记录，该模型在运行时调用提供程序 API。

参见 [会话管理和压缩](/reference/session-management-compaction)。

<a id="model-scan-probe" />

### <a id="model-scan-%2F-check"></a><a id="model-scan-/-check"></a> 模型扫描/检查

`openclaw models scan` 可以检查 OpenRouter 模型，并在启用检查时使用 `OPENROUTER_API_KEY`。

参见 [模型 CLI](/cli/models)。

### <a id="talk-(speech)"></a><a id="talk-speech"></a> Talk（语音）

在已配置的情况下，Talk 模式可以调用 ElevenLabs：`ELEVENLABS_API_KEY` 或 `talk.providers.elevenlabs.apiKey`。

参见 [Talk 模式](/nodes/talk)。

### <a id="skills-(third-party-apis)"></a><a id="skills-third-party-apis"></a> Skills（第三方API）

Skills 可以将 `apiKey` 存储在 `skills.entries.<name>.apiKey` 中。如果某个 skill 使用该密钥访问外部 API，则费用取决于该 skill 的提供商。

参见 [Skills](/tools/skills)。

## <a id="related"></a> 相关内容

- [代币使用和费用](/reference/token-use)
- [提示缓存](/reference/prompt-caching)
- [使用情况跟踪](/concepts/usage-tracking)
