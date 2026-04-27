---
summary: "web_search、x_search 和 web_fetch -- 搜索网页、搜索 X 帖子或获取页面内容"
title: "网页搜索"
sidebarTitle: "网页搜索"
read_when:
  - 您想要启用或配置 web_search
  - 您想要启用或配置 x_search
  - 您需要选择搜索提供商
  - 您想要了解自动检测和提供商回退
---

`web_search` 工具使用您配置的提供商搜索网页，并返回结果。结果会按查询缓存 15 分钟（可配置）。

OpenClaw 还包括用于 X（前身为 Twitter）帖子的 `x_search` 和用于轻量级 URL 获取的 `web_fetch`。在此阶段，`web_fetch` 保持本地运行，而 `web_search` 和 `x_search` 可以在底层使用 xAI Responses。

<Info>
  `web_search` 是一个轻量级 HTTP 工具，而非浏览器自动化。对于重 JS 网站或登录场景，请使用 [Web Browser](/tools/browser)。对于获取特定 URL，请使用 [Web Fetch](/tools/web-fetch)。
</Info>

## 快速开始

<Steps>
  <Step title="选择提供商">
    选择一个提供商并完成所需的任何设置。某些提供商无需密钥，而其他提供商则使用 API 密钥。详情请参阅下面的提供商页面。
  </Step>
  <Step title="配置">
    ```bash
    openclaw configure --section web
    ```
    这会存储提供商以及所需的任何凭据。对于基于 API 的提供商，您也可以设置环境变量（例如 `BRAVE_API_KEY`）并跳过此步骤。
  </Step>
  <Step title="使用">
    代理现在可以调用 `web_search`：

    ```javascript
    await web_search({ query: "OpenClaw plugin SDK" });
    ```

    对于 X 帖子，使用：

    ```javascript
    await x_search({ query: "dinner recipes" });
    ```

  </Step>
</Steps>

## 选择提供商

<CardGroup cols={2}>
  <Card title="Brave 搜索" icon="shield" href="/tools/brave-search">
    结构化结果带片段。支持 `llm-context` 模式、国家/语言过滤器。提供免费层级。
  </Card>
  <Card title="DuckDuckGo 搜索" icon="bird" href="/tools/duckduckgo-search">
    无密钥回退。无需 API 密钥。非官方基于 HTML 的集成。
  </Card>
  <Card title="Exa 搜索" icon="brain" href="/tools/exa-search">
    神经 + 关键词搜索，带内容提取（高亮、文本、摘要）。
  </Card>
  <Card title="Firecrawl 搜索" icon="flame" href="/tools/firecrawl">
    结构化结果。最好与 `firecrawl_search` 和 `firecrawl_scrape` 配对使用以进行深度提取。
  </Card>
  <Card title="Gemini 搜索" icon="sparkles" href="/tools/gemini-search">
    通过 Google Search grounding 提供带引用的 AI 合成答案。
  </Card>
  <Card title="Grok 搜索" icon="zap" href="/tools/grok-search">
    通过 xAI web grounding 提供带引用的 AI 合成答案。
  </Card>
  <Card title="Kimi 搜索" icon="moon" href="/tools/kimi-search">
    通过 Moonshot 网页搜索提供带引用的 AI 合成答案。
  </Card>
  <Card title="MiniMax 搜索" icon="globe" href="/tools/minimax-search">
    通过 MiniMax Coding Plan 搜索 API 提供结构化结果。
  </Card>
  <Card title="Ollama Web Search" icon="globe" href="/tools/ollama-search">
    通过已登录的本地 Ollama 主机或托管的 Ollama API 进行搜索。
  </Card>
  <Card title="Perplexity" icon="search" href="/tools/perplexity-search">
    具有内容提取控制和域过滤的结构化结果。
  </Card>
  <Card title="SearXNG" icon="server" href="/tools/searxng-search">
    自托管元搜索。无需 API 密钥。聚合 Google、Bing、DuckDuckGo 等结果。
  </Card>
  <Card title="Tavily" icon="globe" href="/tools/tavily">
    具有搜索深度、主题过滤和用于 URL 提取的 `tavily_extract` 的结构化结果。
  </Card>
</CardGroup>

### 提供商比较

| Provider                                  | Result style               | Filters                                          | API key                                                                                 |
| ----------------------------------------- | -------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| [Brave](/tools/brave-search)              | Structured snippets        | Country, language, time, `llm-context` mode      | `BRAVE_API_KEY`                                                                         |
| [DuckDuckGo](/tools/duckduckgo-search)    | Structured snippets        | --                                               | None (key-free)                                                                         |
| [Exa](/tools/exa-search)                  | Structured + extracted     | Neural/keyword mode, date, content extraction    | `EXA_API_KEY`                                                                           |
| [Firecrawl](/tools/firecrawl)             | Structured snippets        | Via `firecrawl_search` tool                      | `FIRECRAWL_API_KEY`                                                                     |
| [Gemini](/tools/gemini-search)            | AI-synthesized + citations | --                                               | `GEMINI_API_KEY`                                                                        |
| [Grok](/tools/grok-search)                | AI-synthesized + citations | --                                               | `XAI_API_KEY`                                                                           |
| [Kimi](/tools/kimi-search)                | AI-synthesized + citations | --                                               | `KIMI_API_KEY` / `MOONSHOT_API_KEY`                                                     |
| [MiniMax Search](/tools/minimax-search)   | Structured snippets        | Region (`global` / `cn`)                         | `MINIMAX_CODE_PLAN_KEY` / `MINIMAX_CODING_API_KEY`                                      |
| [Ollama Web Search](/tools/ollama-search) | Structured snippets        | --                                               | None for signed-in local hosts; `OLLAMA_API_KEY` for direct `https://ollama.com` search |
| [Perplexity](/tools/perplexity-search)    | Structured snippets        | Country, language, time, domains, content limits | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY`                                             |
| [SearXNG](/tools/searxng-search)          | Structured snippets        | Categories, language                             | None (self-hosted)                                                                      |
| [Tavily](/tools/tavily)                   | Structured snippets        | Via `tavily_search` tool                         | `TAVILY_API_KEY`                                                                        |

## 自动检测

## 原生 OpenAI web search

当启用 OpenClaw web search 且未固定受管提供商时，直接使用 OpenAI Responses 模型会自动使用 OpenAI 托管的 `web_search` 工具。这是捆绑的 OpenAI 插件中的提供商自有行为，仅适用于原生 OpenAI API 流量，不适用于 OpenAI 兼容的代理基础 URL 或 Azure 路由。将 `tools.web.search.provider` 设置为其他提供商，例如 `brave`，以便为 OpenAI 模型保留受管的 `web_search` 工具；或者将 `tools.web.search.enabled: false` 设置为同时禁用受管搜索和原生 OpenAI 搜索。

## 原生 Codex web search

支持 Codex 的模型可以选择使用提供商原生的 Responses `web_search` 工具，而不是 OpenClaw 管理的 `web_search` 函数。

- 在 `tools.web.search.openaiCodex` 下配置
- 仅对支持 Codex 的模型激活（`openai-codex/*` 或使用 `api: "openai-codex-responses"` 的提供商）
- 管理的 `web_search` 仍适用于非 Codex 模型
- `mode: "cached"` 是默认且推荐的设置
- `tools.web.search.enabled: false` 禁用管理的和原生的搜索

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        openaiCodex: {
          enabled: true,
          mode: "cached",
          allowedDomains: ["example.com"],
          contextSize: "high",
          userLocation: {
            country: "US",
            city: "New York",
            timezone: "America/New_York",
          },
        },
      },
    },
  },
}
```

如果启用了原生 Codex 搜索但当前模型不支持 Codex，OpenClaw 将保持正常的托管 `web_search` 行为。

## 设置网页搜索

文档和设置流程中的提供商列表按字母顺序排列。自动检测使用单独的优先级顺序。

如果未设置 `provider`，OpenClaw 会按以下顺序检查提供商，并使用第一个可用的提供商：

首先是基于 API 的提供商：

1. **Brave** -- `BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey`（顺序 10）
2. **MiniMax 搜索** -- `MINIMAX_CODE_PLAN_KEY` / `MINIMAX_CODING_API_KEY` 或 `plugins.entries.minimax.config.webSearch.apiKey`（顺序 15）
3. **Gemini** -- `GEMINI_API_KEY` 或 `plugins.entries.google.config.webSearch.apiKey`（顺序 20）
4. **Grok** -- `XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey`（顺序 30）
5. **Kimi** -- `KIMI_API_KEY` / `MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey`（顺序 40）
6. **Perplexity** -- `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey`（顺序 50）
7. **Firecrawl** -- `FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webSearch.apiKey`（顺序 60）
8. **Exa** -- `EXA_API_KEY` 或 `plugins.entries.exa.config.webSearch.apiKey`（顺序 65）
9. **Tavily** -- `TAVILY_API_KEY` 或 `plugins.entries.tavily.config.webSearch.apiKey`（顺序 70）

随后是无需密钥的回退：

10. **DuckDuckGo** -- 无需密钥的 HTML 回退，无需账户或 API 密钥（顺序 100）
11. **Ollama Web Search** -- 通过您配置的本地 Ollama 主机进行无需密钥的回退，当它可达并已通过 `ollama signin` 登录时可用；当主机需要时可重用 Ollama 提供商的 bearer auth；并且在配置了 `OLLAMA_API_KEY` 时可直接调用 `https://ollama.com` 搜索（顺序 110）
12. **SearXNG** -- `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`（顺序 200）

如果未检测到任何提供商，则回退到 Brave（您将收到一个缺少密钥的错误，提示您进行配置）。

<Note>
  所有提供商密钥字段都支持 SecretRef 对象。位于 `plugins.entries.<plugin>.config.webSearch.apiKey` 下的插件作用域 SecretRef 会被解析，适用于内置的 Exa、Firecrawl、Gemini、Grok、Kimi、Perplexity 和 Tavily 提供商，无论是通过 `tools.web.search.provider` 显式选择提供商，还是通过自动检测选中提供商。在自动检测模式下，OpenClaw 只会解析所选提供商的密钥——未被选中的 SecretRef 保持非活动状态，因此您可以配置多个提供商，而无需为未使用的提供商承担解析成本。
</Note>

## 配置

```json5
{
  tools: {
    web: {
      search: {
        enabled: true, // 默认：true
        provider: "brave", // 或省略以进行自动检测
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
    },
  },
}
```

提供商特定的配置（API 密钥、基础 URL、模式）位于 `plugins.entries.<plugin>.config.webSearch.*` 下。请参阅提供商页面获取示例。

`web_fetch` 回退提供商选择是单独的：

- 通过 `tools.web.fetch.provider` 选择它
- 或省略该字段，让 OpenClaw 从可用凭据中自动检测第一个可用的 web-fetch 提供商
- 目前内置的 web-fetch 提供商是 Firecrawl，配置位于 `plugins.entries.firecrawl.config.webFetch.*`

当您在 `openclaw onboard` 或 `openclaw configure --section web` 期间选择 **Kimi** 时，OpenClaw 还可以询问：

- Moonshot API 区域（`https://api.moonshot.ai/v1` 或 `https://api.moonshot.cn/v1`）
- 默认的 Kimi 网页搜索模型（默认为 `kimi-k2.6`）

对于 `x_search`，请配置 `plugins.entries.xai.config.xSearch.*`。它使用与 Grok 网页搜索相同的 `XAI_API_KEY` 回退。
旧版 `tools.web.x_search.*` 配置会通过 `openclaw doctor --fix` 自动迁移。
当您在 `openclaw onboard` 或 `openclaw configure --section web` 期间选择 Grok 时，OpenClaw 还可以使用相同的密钥提供可选的 `x_search` 设置。
这是在 Grok 路径中的一个单独后续步骤，而不是一个单独的顶层网页搜索提供商选择。如果您选择其他提供商，OpenClaw 不会显示 `x_search` 提示。

### 存储 API 密钥

<Tabs>
  <Tab title="配置文件">
    运行 `openclaw configure --section web` 或直接设置密钥：

    ```json5
    {
      plugins: {
        entries: {
          brave: {
            config: {
              webSearch: {
                apiKey: "YOUR_KEY", // pragma: allowlist secret
              },
            },
          },
        },
      },
    }
    ```

  </Tab>
  <Tab title="环境变量">
    在 Gateway 进程环境中设置提供商环境变量：

    ```bash
    export BRAVE_API_KEY="YOUR_KEY"
    ```

    对于 gateway 安装，将其放入 `~/.openclaw/.env`。
    请参阅 [环境变量](/help/faq#env-vars-and-env-loading)。
  </Tab>
</Tabs>

## 工具参数

| 参数             | 描述                                           |
| --------------------- | ----------------------------------------------------- |
| `query`               | 搜索查询（必填）                               |
| `count`               | 要返回的结果数（1-10，默认：5）                  |
| `country`             | 2 位 ISO 国家代码（例如 "US"、"DE"）           |
| `language`            | ISO 639-1 语言代码（例如 "en"、"de"）             |
| `search_lang`         | 搜索语言代码（仅 Brave）                     |
| `freshness`           | 时间过滤器：`day`、`week`、`month` 或 `year`        |
| `date_after`          | 此日期之后的结果（YYYY-MM-DD）                  |
| `date_before`         | 此日期之前的结果（YYYY-MM-DD）                 |
| `ui_lang`             | UI 语言代码（仅 Brave）                         |
| `domain_filter`       | 域名允许列表/拒绝列表数组（仅 Perplexity）     |
| `max_tokens`          | 总内容预算，默认 25000（仅 Perplexity） |
| `max_tokens_per_page` | 每页 token 限制，默认 2048（仅 Perplexity）  |

<Warning>
  并非所有参数都适用于所有提供商。Brave 的 `llm-context` 模式会拒绝 `ui_lang`、`freshness`、`date_after` 和 `date_before`。
  Gemini、Grok 和 Kimi 会返回带引用的单个合成答案。为了与共享工具兼容，它们接受 `count`，但这不会改变受引导答案的形式。
  当您使用 Sonar/OpenRouter 兼容路径（`plugins.entries.perplexity.config.webSearch.baseUrl` /
  `model` 或 `OPENROUTER_API_KEY`）时，Perplexity 的行为也相同。
  SearXNG 仅对受信任的私有网络或回环主机接受 `http://`；公共 SearXNG 端点必须使用 `https://`。
  通过 `web_search`，Firecrawl 和 Tavily 仅支持 `query` 和 `count`——高级选项请使用它们各自的专用工具。
</Warning>

## x_search

`x_search` 使用 xAI 查询 X（前身为 Twitter）帖子，并返回带引用的 AI 合成答案。它接受自然语言查询和可选的结构化过滤器。OpenClaw 仅在服务于此工具调用的请求上启用内置的 xAI `x_search` 工具。

<Note>
  xAI 文档指出 `x_search` 支持关键词搜索、语义搜索、用户搜索和线程获取。对于单帖互动统计信息（如转发、回复、书签或查看次数），建议针对确切帖子 URL 或状态 ID 进行定向查找。广泛的关键词搜索可能会找到正确的帖子，但返回的每帖元数据可能不完整。一个好的模式是：先定位帖子，然后运行第二次针对该确切帖子的 `x_search` 查询。
</Note>

### x_search 配置

```json5
{
  plugins: {
    entries: {
      xai: {
        config: {
          xSearch: {
            enabled: true,
            model: "grok-4-1-fast-non-reasoning",
            inlineCitations: false,
            maxTurns: 2,
            timeoutSeconds: 30,
            cacheTtlMinutes: 15,
          },
          webSearch: {
            apiKey: "xai-...", // 如果设置了 XAI_API_KEY，则可选
          },
        },
      },
    },
  },
}
```

### x_search 参数

| 参数                    | 描述                                            |
| ---------------------------- | ------------------------------------------------------ |
| `query`                      | 搜索查询（必填）                                |
| `allowed_x_handles`          | 将结果限制为特定 X 账号                 |
| `excluded_x_handles`         | 排除特定 X 账号                             |
| `from_date`                  | 仅包含此日期或之后的帖子（YYYY-MM-DD）  |
| `to_date`                    | 仅包含此日期或之前的帖子（YYYY-MM-DD） |
| `enable_image_understanding` | 让 xAI 检查附加到匹配帖子的图片      |
| `enable_video_understanding` | 让 xAI 检查附加到匹配帖子的视频      |

### x_search 示例

```javascript
await x_search({
  query: "dinner recipes",
  allowed_x_handles: ["nytfood"],
  from_date: "2026-03-01",
});
```

```javascript
// 单帖统计：尽可能使用确切的状态 URL 或状态 ID
await x_search({
  query: "https://x.com/huntharo/status/1905678901234567890",
});
```

## 示例

```javascript
// 基本搜索
await web_search({ query: "OpenClaw 插件 SDK" });

// 特定于德国的搜索
await web_search({ query: "TV online schauen", country: "DE", language: "de" });

// 近期结果（过去一周）
await web_search({ query: "AI developments", freshness: "week" });

// 日期范围
await web_search({
  query: "climate research",
  date_after: "2024-01-01",
  date_before: "2024-06-30",
});

// 域名过滤（仅 Perplexity）
await web_search({
  query: "product reviews",
  domain_filter: ["-reddit.com", "-pinterest.com"],
});
```

## 工具配置

如果您使用工具配置或允许列表，请添加 `web_search`、`x_search` 或 `group:web`：

```json5
{
  tools: {
    allow: ["web_search", "x_search"],
    // 或：allow: ["group:web"]  (包括 web_search、x_search 和 web_fetch)
  },
}
```

## 相关内容

- [Web Fetch](/tools/web-fetch) -- 获取一个 URL 并提取可读内容
- [Web Browser](/tools/browser) -- 面向 JS 密集型网站的完整浏览器自动化
- [Grok Search](/tools/grok-search) -- 作为 `web_search` 提供方的 Grok
- [Ollama Web Search](/tools/ollama-search) -- 通过您的 Ollama 主机进行免密钥网页搜索
