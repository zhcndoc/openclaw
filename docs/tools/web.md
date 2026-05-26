---
summary: "web_search、x_search 和 web_fetch —— 搜索网络、搜索 X 帖子，或获取页面内容"
title: "网页搜索"
sidebarTitle: "网页搜索"
read_when:
  - 你想启用或配置 web_search
  - 你想启用或配置 x_search
  - 你需要选择一个搜索提供商
  - 你想了解自动检测和提供商回退
---

`web_search` 工具使用你配置的提供商搜索网络，并返回结果。结果会按查询缓存 15 分钟（可配置）。

OpenClaw 还包含用于 X（原 Twitter）帖子的 `x_search`，以及用于轻量级 URL 获取的 `web_fetch`。在这个阶段，`web_fetch` 保持本地，而 `web_search` 和 `x_search` 可以在底层使用 xAI Responses。

<Info>
  `web_search` 是一个轻量级 HTTP 工具，不是浏览器自动化。对于 JS 重度依赖的网站或登录场景，请使用 [Web Browser](/tools/browser)。对于获取特定 URL，请使用 [Web Fetch](/tools/web-fetch)。
</Info>

## 快速开始

<Steps>
  <Step title="选择提供商">
    选择一个提供商并完成所需的设置。有些提供商无需密钥，而其他提供商使用 API 密钥。详情请参见下方的提供商页面。
  </Step>
  <Step title="配置">
    ```bash
    openclaw configure --section web
    ```
    这会保存提供商以及任何所需的凭据。你也可以设置一个环境变量（例如 `BRAVE_API_KEY`），并对基于 API 的提供商跳过这一步。
  </Step>
  <Step title="使用它">
    现在代理可以调用 `web_search`：

    ```javascript
    await web_search({ query: "OpenClaw plugin SDK" });
    ```

    对于 X 帖子，请使用：

    ```javascript
    await x_search({ query: "dinner recipes" });
    ```

  </Step>
</Steps>

## 选择提供商

<CardGroup cols={2}>
  <Card title="Brave Search" icon="shield" href="/tools/brave-search">
    结构化结果，带摘要。支持 `llm-context` 模式、国家/语言筛选。提供免费套餐。
  </Card>
  <Card title="DuckDuckGo" icon="bird" href="/tools/duckduckgo-search">
    无需密钥的回退方案。不需要 API 密钥。非官方的基于 HTML 的集成。
  </Card>
  <Card title="Exa" icon="brain" href="/tools/exa-search">
    神经网络 + 关键词搜索，并提供内容提取（高亮、文本、摘要）。
  </Card>
  <Card title="Firecrawl" icon="flame" href="/tools/firecrawl">
    结构化结果。最适合与 `firecrawl_search` 和 `firecrawl_scrape` 搭配，用于深度提取。
  </Card>
  <Card title="Gemini" icon="sparkles" href="/tools/gemini-search">
    通过 Google Search grounding 生成带引用的 AI 综合答案。
  </Card>
  <Card title="Grok" icon="zap" href="/tools/grok-search">
    通过 xAI web grounding 生成带引用的 AI 综合答案。
  </Card>
  <Card title="Kimi" icon="moon" href="/tools/kimi-search">
    通过 Moonshot 网页搜索生成带引用的 AI 综合答案；未接地的聊天回退会明确失败。
  </Card>
  <Card title="MiniMax Search" icon="globe" href="/tools/minimax-search">
    通过 MiniMax Token Plan 搜索 API 提供结构化结果。
  </Card>
  <Card title="Ollama Web Search" icon="globe" href="/tools/ollama-search">
    通过已登录的本地 Ollama 主机或托管的 Ollama API 进行搜索。
  </Card>
  <Card title="Perplexity" icon="search" href="/tools/perplexity-search">
    结构化结果，支持内容提取控制和域名过滤。
  </Card>
  <Card title="SearXNG" icon="server" href="/tools/searxng-search">
    自托管元搜索。不需要 API 密钥。聚合 Google、Bing、DuckDuckGo 等。
  </Card>
  <Card title="Tavily" icon="globe" href="/tools/tavily">
    通过搜索深度、主题过滤，以及用于 URL 提取的 `tavily_extract` 提供结构化结果。
  </Card>
</CardGroup>

### 提供商对比

| Provider                                  | Result style                                                   | Filters                                          | API key                                                                                 |
| ----------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| [Brave](/tools/brave-search)              | 结构化片段                                                     | 国家、语言、时间、`llm-context` 模式             | `BRAVE_API_KEY`                                                                         |
| [DuckDuckGo](/tools/duckduckgo-search)    | 结构化片段                                                     | --                                               | 无（免密钥）                                                                            |
| [Exa](/tools/exa-search)                  | 结构化 + 提取内容                                              | 神经网络/关键词模式、日期、内容提取              | `EXA_API_KEY`                                                                           |
| [Firecrawl](/tools/firecrawl)             | 结构化片段                                                     | 通过 `firecrawl_search` 工具                     | `FIRECRAWL_API_KEY`                                                                     |
| [Gemini](/tools/gemini-search)            | AI 综合生成 + 引用                                              | --                                               | `GEMINI_API_KEY`                                                                        |
| [Grok](/tools/grok-search)                | AI 综合生成 + 引用                                              | --                                               | xAI OAuth、`XAI_API_KEY`，或 `plugins.entries.xai.config.webSearch.apiKey`              |
| [Kimi](/tools/kimi-search)                | AI 综合生成 + 引用；在未接地的聊天回退时失败                     | --                                               | `KIMI_API_KEY` / `MOONSHOT_API_KEY`                                                     |
| [MiniMax Search](/tools/minimax-search)   | 结构化片段                                                     | 区域（`global` / `cn`）                          | `MINIMAX_CODE_PLAN_KEY` / `MINIMAX_CODING_API_KEY` / `MINIMAX_OAUTH_TOKEN`              |
| [Ollama Web Search](/tools/ollama-search) | 结构化片段                                                     | --                                               | 已登录的本地主机无需密钥；直接的 `https://ollama.com` 搜索需要 `OLLAMA_API_KEY`         |
| [Perplexity](/tools/perplexity-search)    | 结构化片段                                                     | 国家、语言、时间、域名、内容限制                 | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY`                                             |
| [SearXNG](/tools/searxng-search)          | 结构化片段                                                     | 分类、语言                                       | 无（自托管）                                                                            |
| [Tavily](/tools/tavily)                   | 结构化片段                                                     | 通过 `tavily_search` 工具                         | `TAVILY_API_KEY`                                                                        |

## 自动检测

## 原生 OpenAI 网页搜索

当 OpenClaw 网页搜索已启用且未固定托管提供商时，直接使用 OpenAI Responses 模型会自动使用 OpenAI 托管的 `web_search` 工具。这是捆绑的 OpenAI 插件中的提供商自有行为，仅适用于原生 OpenAI API 流量，不适用于 OpenAI 兼容的代理 base URL 或 Azure 路由。将 `tools.web.search.provider` 设置为其他提供商（例如 `brave`）可让 OpenAI 模型继续使用受管理的 `web_search` 工具；或者将 `tools.web.search.enabled: false` 设置为同时禁用受管理搜索和原生 OpenAI 搜索。

## 原生 Codex 网页搜索

支持 Codex 的模型可以选择使用提供商原生的 Responses `web_search` 工具，而不是 OpenClaw 托管的 `web_search` 函数。

- 在 `tools.web.search.openaiCodex` 下进行配置
- 仅对支持 Codex 的模型生效（`openai-codex/*` 或使用 `api: "openai-codex-responses"` 的提供商）
- 托管的 `web_search` 仍然适用于非 Codex 模型
- `mode: "cached"` 是默认且推荐的设置
- `tools.web.search.enabled: false` 会同时禁用托管搜索和原生搜索

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

如果已启用原生 Codex 搜索，但当前模型不支持 Codex，OpenClaw 会保持正常的托管 `web_search` 行为。

## 网络安全

托管的 `web_search` 提供商调用使用 OpenClaw 的受保护获取路径。对于受信任的提供商 API 主机，OpenClaw 仅允许该提供商主机名使用 Surge、Clash 和 sing-box 的 fake-IP DNS 应答，范围为 `198.18.0.0/15` 和 `fc00::/7`。其他私有、回环、链路本地和元数据目的地仍然会被阻止。

此自动允许不适用于任意 `web_fetch` URL。对于 `web_fetch`，仅当你的受信任代理拥有这些合成范围时，才显式启用 `tools.web.fetch.ssrfPolicy.allowRfc2544BenchmarkRange` 和 `tools.web.fetch.ssrfPolicy.allowIpv6UniqueLocalRange`。

## 设置网页搜索

文档和设置流程中的提供商列表按字母顺序排列。自动检测则使用单独的优先级顺序。

如果未设置 `provider`，OpenClaw 会按以下顺序检查提供商，并使用第一个可用的提供商：

首先是基于 API 的提供商：

1. **Brave** -- `BRAVE_API_KEY` or `plugins.entries.brave.config.webSearch.apiKey` (order 10)
2. **MiniMax Search** -- `MINIMAX_CODE_PLAN_KEY` / `MINIMAX_CODING_API_KEY` / `MINIMAX_OAUTH_TOKEN` / `MINIMAX_API_KEY` or `plugins.entries.minimax.config.webSearch.apiKey` (order 15)
3. **Gemini** -- `plugins.entries.google.config.webSearch.apiKey`, `GEMINI_API_KEY`, or `models.providers.google.apiKey` (order 20)
4. **Grok** -- xAI OAuth, `XAI_API_KEY`, or `plugins.entries.xai.config.webSearch.apiKey` (order 30)
5. **Kimi** -- `KIMI_API_KEY` / `MOONSHOT_API_KEY` or `plugins.entries.moonshot.config.webSearch.apiKey` (order 40)
6. **Perplexity** -- `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` or `plugins.entries.perplexity.config.webSearch.apiKey` (order 50)
7. **Firecrawl** -- `FIRECRAWL_API_KEY` or `plugins.entries.firecrawl.config.webSearch.apiKey` (order 60)
8. **Exa** -- `EXA_API_KEY` or `plugins.entries.exa.config.webSearch.apiKey`; optional `plugins.entries.exa.config.webSearch.baseUrl` overrides the Exa endpoint (order 65)
9. **Tavily** -- `TAVILY_API_KEY` or `plugins.entries.tavily.config.webSearch.apiKey` (order 70)

之后是无需密钥的回退方案：

10. **DuckDuckGo** -- 无需密钥的 HTML 回退方案，不需要账户或 API 密钥（顺序 100）
11. **Ollama Web Search** -- 当你配置的本地 Ollama 主机可访问且已通过 `ollama signin` 登录时，可作为无需密钥的回退方案；当主机需要时可复用 Ollama 提供商 bearer 认证，并且在配置了 `OLLAMA_API_KEY` 时可调用直接的 `https://ollama.com` 搜索（顺序 110）
12. **SearXNG** -- `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`（顺序 200）

如果未检测到任何提供商，则回退到 Brave（你会收到一个缺少密钥的错误，提示你进行配置）。

<Note>
  所有提供商密钥字段都支持 SecretRef 对象。插件作用域内的 SecretRef，位于 `plugins.entries.<plugin>.config.webSearch.apiKey` 下，会为捆绑的基于 API 的网页搜索提供商解析，包括 Brave、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax、Perplexity 和 Tavily，无论提供商是通过 `tools.web.search.provider` 显式选择，还是通过自动检测选中。在自动检测模式下，OpenClaw 只解析所选提供商的密钥——未选中的 SecretRef 会保持不活动状态，因此你可以配置多个提供商，而无需为未使用的提供商承担解析成本。
</Note>

## 配置

```json5
{
  tools: {
    web: {
      search: {
        enabled: true, // 默认：true
        provider: "brave", // 或省略以便自动检测
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
    },
  },
}
```

特定提供商配置（API 密钥、base URL、模式）位于
`plugins.entries.<plugin>.config.webSearch.*` 下。Gemini 还可以在其专用网页搜索配置和 `GEMINI_API_KEY` 之后，
将 `models.providers.google.apiKey` 和 `models.providers.google.baseUrl` 作为优先级较低的
回退项复用。示例请参见各提供商页面。
Grok 还可以复用通过 `openclaw models auth login
--provider xai --method oauth` 获取的 xAI OAuth 认证配置文件；API 密钥配置仍然是回退方案。

`tools.web.search.provider` 会根据已捆绑和已安装插件清单中声明的网页搜索提供商 ID 进行验证。像 `"brvae"` 这样的拼写错误会导致配置验证失败，而不是静默回退到自动检测。如果某个已配置提供商只有过时的插件证据，例如卸载第三方插件后留下的
`plugins.entries.<plugin>` 配置块，
OpenClaw 会保持启动过程的弹性并报告警告，以便你重新安装该
插件或运行 `openclaw doctor --fix` 清理过时配置。

`web_fetch` 备用提供商的选择是独立的：

- 通过 `tools.web.fetch.provider` 选择
- 或省略该字段，让 OpenClaw 从可用凭据中自动检测第一个就绪的 web-fetch
  提供商
- 非沙箱化的 `web_fetch` 可使用声明了 `contracts.webFetchProviders` 的已安装插件提供商；沙箱化获取仍仅限捆绑提供商
- 目前捆绑的 web-fetch 提供商是 Firecrawl，在 `plugins.entries.firecrawl.config.webFetch.*` 下配置

当你在 `openclaw onboard` 或
`openclaw configure --section web` 期间选择 **Kimi** 时，OpenClaw 还可能会询问：

- Moonshot API 区域（`https://api.moonshot.ai/v1` 或 `https://api.moonshot.cn/v1`）
- 默认的 Kimi 网页搜索模型（默认为 `kimi-k2.6`）

用于 `x_search` 时，请配置 `plugins.entries.xai.config.xSearch.*`。它使用
与聊天相同的 xAI 认证配置文件，或 Grok 网页搜索使用的 `XAI_API_KEY` / 插件网页搜索
凭据。
旧版 `tools.web.x_search.*` 配置会由 `openclaw doctor --fix` 自动迁移。
当你在 `openclaw onboard` 或 `openclaw configure --section web` 中选择 Grok 时，
OpenClaw 还可以提供可选的 `x_search` 设置，并使用相同的凭据。
这是 Grok 路径中的一个单独后续步骤，不是另一个顶层
网页搜索提供商选择。如果你选择其他提供商，OpenClaw 不会
显示 `x_search` 提示。

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
                apiKey: "YOUR_KEY", // 允许列表机密
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

    对于网关安装，请将其放入 `~/.openclaw/.env`。
    参见 [环境变量](/help/faq#env-vars-and-env-loading)。

  </Tab>
</Tabs>

## 工具参数

| 参数                  | 描述                                               |
| --------------------- | -------------------------------------------------- |
| `query`               | 搜索查询（必填）                                   |
| `count`               | 返回结果数（1-10，默认：5）                        |
| `country`             | 2 字母 ISO 国家代码（例如 "US"、"DE"）            |
| `language`            | ISO 639-1 语言代码（例如 "en"、"de"）              |
| `search_lang`         | 搜索语言代码（仅 Brave）                            |
| `freshness`           | 时间筛选：`day`、`week`、`month` 或 `year`         |
| `date_after`          | 此日期之后的结果（YYYY-MM-DD）                     |
| `date_before`         | 此日期之前的结果（YYYY-MM-DD）                     |
| `ui_lang`             | UI 语言代码（仅 Brave）                             |
| `domain_filter`       | 域名允许/拒绝列表数组（仅 Perplexity）              |
| `max_tokens`          | 总内容预算，默认 25000（仅 Perplexity）            |
| `max_tokens_per_page` | 每页 token 限制，默认 2048（仅 Perplexity）        |

<Warning>
  并非所有参数都适用于所有提供商。Brave 的 `llm-context` 模式会拒绝 `ui_lang`；`date_before` 也需要 `date_after`，因为 Brave 自定义时间范围要求同时提供开始和结束日期。
  Gemini、Grok 和 Kimi 会返回一个带引文的综合答案。它们接受 `count` 以兼容共享工具，但不会改变接地答案的形状。Gemini 通过将 `freshness`、`date_after` 和
  `date_before` 转换为 Google Search grounding 时间范围来支持它们。
  当你使用 Sonar/OpenRouter 兼容路径（`plugins.entries.perplexity.config.webSearch.baseUrl` /
  `model` 或 `OPENROUTER_API_KEY`）时，Perplexity 的行为也相同。
  SearXNG 仅接受 `http://` 用于受信任的私有网络或回环主机；
  公共 SearXNG 端点必须使用 `https://`。
  Firecrawl 和 Tavily 通过 `web_search` 只支持 `query` 和 `count`
  -- 对高级选项请使用它们各自的专用工具。
</Warning>

## x_search

`x_search` 使用 xAI 查询 X（原 Twitter）帖子，并返回
带有引文的 AI 综合答案。它接受自然语言查询和
可选的结构化过滤器。OpenClaw 仅在提供此工具调用的请求上启用内置的 xAI `x_search`
工具。

<Note>
  xAI 将 `x_search` 文档化为支持关键词搜索、语义搜索、用户
  搜索以及线程抓取。对于每个帖子的互动统计信息，例如转发、回复、
  收藏或浏览，建议优先针对精确的帖子 URL 或状态 ID 进行定向查询。
  广泛的关键词搜索可能会找到正确的帖子，但返回的单帖元数据可能
  不够完整。一个好的模式是：先定位帖子，然后
  再运行第二个聚焦于该精确帖子的 `x_search` 查询。
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
            baseUrl: "https://api.x.ai/v1", // 可选，覆盖 webSearch.baseUrl
            inlineCitations: false,
            maxTurns: 2,
            timeoutSeconds: 30,
            cacheTtlMinutes: 15,
          },
          webSearch: {
            apiKey: "xai-...", // 如果已设置 xAI 认证配置文件或 XAI_API_KEY，则为可选
            baseUrl: "https://api.x.ai/v1", // 可选，共享的 xAI Responses base URL
          },
        },
      },
    },
  },
}
```

当 `plugins.entries.xai.config.xSearch.baseUrl` 已设置时，`x_search` 会向 `<baseUrl>/responses` 发起 POST 请求。如果省略该字段，则回退到 `plugins.entries.xai.config.webSearch.baseUrl`，然后是旧版 `tools.web.search.grok.baseUrl`，最后是公共 xAI 端点。

### x_search 参数

| 参数                         | 描述                                               |
| ---------------------------- | -------------------------------------------------- |
| `query`                      | 搜索查询（必填）                                   |
| `allowed_x_handles`          | 将结果限制为特定的 X 账号                        |
| `excluded_x_handles`         | 排除特定的 X 账号                                  |
| `from_date`                  | 仅包含此日期及之后的帖子（YYYY-MM-DD）             |
| `to_date`                    | 仅包含此日期及之前的帖子（YYYY-MM-DD）             |
| `enable_image_understanding` | 允许 xAI 检查匹配帖子中附带的图片                 |
| `enable_video_understanding` | 允许 xAI 检查匹配帖子中附带的视频                 |

### x_search 示例

```javascript
await x_search({
  query: "dinner recipes",
  allowed_x_handles: ["nytfood"],
  from_date: "2026-03-01",
});
```

```javascript
// 单帖统计：尽可能使用精确的状态 URL 或状态 ID
await x_search({
  query: "https://x.com/huntharo/status/1905678901234567890",
});
```

## 示例

```javascript
// 基础搜索
await web_search({ query: "OpenClaw plugin SDK" });

// 德语特定搜索
await web_search({ query: "TV online schauen", country: "DE", language: "de" });

// 最近结果（过去一周）
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

## 工具配置文件

如果你使用工具配置文件或允许列表，请添加 `web_search`、`x_search` 或 `group:web`：

```json5
{
  tools: {
    allow: ["web_search", "x_search"],
    // 或：allow: ["group:web"]  （包含 web_search、x_search 和 web_fetch）
  },
}
```

## 相关内容

- [Web Fetch](/tools/web-fetch) -- 获取 URL 并提取可读内容
- [Web Browser](/tools/browser) -- 针对 JS 密集型网站的完整浏览器自动化
- [Grok Search](/tools/grok-search) -- 将 Grok 作为 `web_search` 提供商
- [Ollama Web Search](/tools/ollama-search) -- 通过你的 Ollama 主机进行免密钥网页搜索
