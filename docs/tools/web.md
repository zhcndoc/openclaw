---
summary: "web_search、x_search 和 web_fetch —— 搜索网络、搜索 X 帖子，或获取页面内容"
title: "网页搜索"
sidebarTitle: "网页搜索"
read_when:
  - 你想启用或配置 web_search
  - 你想启用或配置 x_search
  - 你需要选择一个搜索提供商
  - 你想了解自动检测和提供商选择
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
  <Card title="Codex 托管搜索" icon="search" href="/plugins/codex-harness">
    通过你的 Codex 应用服务器账户生成 AI 综合且有依据的答案。
  </Card>
  <Card title="DuckDuckGo" icon="bird" href="/tools/duckduckgo-search">
    无密钥提供商。无需 API 密钥。基于 HTML 的非官方集成。
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
  <Card title="Parallel" icon="layer-group" href="/tools/parallel-search">
    付费的 Parallel Search API（`PARALLEL_API_KEY`）；更高的速率限制和目标调优。
  </Card>
  <Card title="Parallel Search (Free)" icon="layer-group" href="/tools/parallel-search">
    无密钥可选加入。Parallel 的免费 Search MCP，提供针对 LLM 优化的高密度摘录，无需 API 密钥。
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

| Provider                                         | Result style                                                   | Filters                                          | API key                                                                                 |
| ------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| [Brave](/tools/brave-search)                     | Structured snippets                                            | Country, language, time, `llm-context` mode      | `BRAVE_API_KEY`                                                                         |
| [Codex 托管搜索](/plugins/codex-harness)    | AI 综合 + 来源 URL                                   | 域名、上下文大小、用户位置             | 无；使用 Codex/OpenAI 登录                                                         |
| [DuckDuckGo](/tools/duckduckgo-search)           | Structured snippets                                            | --                                               | 无（无密钥）                                                                         |
| [Exa](/tools/exa-search)                         | Structured + extracted                                         | Neural/keyword mode, date, content extraction    | `EXA_API_KEY`                                                                           |
| [Firecrawl](/tools/firecrawl)                    | Structured snippets                                            | Via `firecrawl_search` tool                      | `FIRECRAWL_API_KEY`                                                                     |
| [Gemini](/tools/gemini-search)                   | AI-synthesized + citations                                     | --                                               | `GEMINI_API_KEY`                                                                        |
| [Grok](/tools/grok-search)                       | AI-synthesized + citations                                     | --                                               | xAI OAuth, `XAI_API_KEY`, or `plugins.entries.xai.config.webSearch.apiKey`              |
| [Kimi](/tools/kimi-search)                       | AI-synthesized + citations; fails on ungrounded chat fallbacks | --                                               | `KIMI_API_KEY` / `MOONSHOT_API_KEY`                                                     |
| [MiniMax Search](/tools/minimax-search)          | Structured snippets                                            | Region (`global` / `cn`)                         | `MINIMAX_CODE_PLAN_KEY` / `MINIMAX_CODING_API_KEY` / `MINIMAX_OAUTH_TOKEN`              |
| [Ollama Web Search](/tools/ollama-search)        | Structured snippets                                            | --                                               | None for signed-in local hosts; `OLLAMA_API_KEY` for direct `https://ollama.com` search |
| [Parallel](/tools/parallel-search)               | 按 LLM 上下文排序的密集摘录                                    | --                                               | `PARALLEL_API_KEY`（付费）                                                               |
| [Parallel Search (Free)](/tools/parallel-search) | 按 LLM 上下文排序的密集摘录                                    | --                                               | 无（免费 Search MCP）                                                                  |
| [Perplexity](/tools/perplexity-search)           | Structured snippets                                            | Country, language, time, domains, content limits | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY`                                             |
| [SearXNG](/tools/searxng-search)                 | Structured snippets                                            | Categories, language                             | 无（自托管）                                                                      |
| [Tavily](/tools/tavily)                          | Structured snippets                                            | Via `tavily_search` tool                         | `TAVILY_API_KEY`                                                                        |

## 自动检测

## 原生 OpenAI 网页搜索

当 OpenClaw 网页搜索已启用且未固定托管提供商时，直接使用 OpenAI Responses 模型会自动使用 OpenAI 托管的 `web_search` 工具。这是捆绑的 OpenAI 插件中的提供商自有行为，仅适用于原生 OpenAI API 流量，不适用于 OpenAI 兼容的代理 base URL 或 Azure 路由。将 `tools.web.search.provider` 设置为其他提供商（例如 `brave`）可让 OpenAI 模型继续使用受管理的 `web_search` 工具；或者将 `tools.web.search.enabled: false` 设置为同时禁用受管理搜索和原生 OpenAI 搜索。

## 原生 Codex 网页搜索

Codex 应用服务器运行时在启用网页搜索且未选择受管理提供商时，会自动使用 Codex 托管的 `web_search` 工具。原生托管搜索与 OpenClaw 的受管理 `web_search` 动态工具互斥，因此受管理搜索无法绕过原生域名限制。当托管搜索不可用、被显式禁用或被所选受管理提供商替代时，OpenClaw 会使用受管理工具。OpenClaw 保持 Codex 的独立 `web.run` 扩展为禁用状态，因为生产应用服务器流量会拒绝其用户定义的 `web` 命名空间。

- 在 `tools.web.search.openaiCodex` 下配置原生搜索
- 将 `tools.web.search.provider: "codex"` 设置为将 Codex 托管搜索作为任何父模型的受管理 `web_search` 提供商。每次调用都会运行一个有边界的、短暂的 Codex 应用服务器回合，并在 Codex 未输出托管的 `webSearch` 项时失败。
- `mode: "cached"` 是默认首选项，但 Codex 会将其解析为对无限制应用服务器回合的实时外部访问；如需明确请求实时访问，请设置为 `"live"`
- 将 `tools.web.search.provider` 设置为诸如 `brave` 之类的受管理提供商，以使用 OpenClaw 的受管理 `web_search`
- 将 `tools.web.search.openaiCodex.enabled: false` 设置为退出 Codex 托管搜索；其他受管理提供商仍然可用
- 限制 Codex 原生工具面也会保持受管理 `web_search` 可用
- 当设置了 `allowedDomains` 时，如果托管搜索不可用，自动受管理回退将失败关闭，这样原生允许列表就不能被绕过
- 工具禁用的仅 LLM 运行会同时禁用原生和受管理搜索
- `tools.web.search.enabled: false` 会同时禁用受管理和原生搜索

对 Codex 搜索策略的持久有效更改会启动一个新的绑定线程，因此已加载的应用服务器线程不能保留过期的托管搜索访问权限。每回合的临时限制使用临时受限线程，并保留现有绑定以便之后恢复。

直接的 OpenAI ChatGPT Responses 流量也可以使用 OpenAI 托管的 `web_search` 工具。那条独立路径仍然需要通过 `tools.web.search.openaiCodex.enabled: true` 明确启用，并且仅适用于使用 `api: "openai-chatgpt-responses"` 的符合条件的 `openai/*` 模型。

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        // 可选：也可在非 Codex 父模型中使用 Codex 托管搜索。
        provider: "codex",
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

对于不支持原生 Codex 搜索的运行时和提供商，Codex 可以通过 OpenClaw 的动态工具命名空间使用受管理的 `web_search` 回退。当你需要 OpenClaw 具备提供商特定的网络控制而不是 Codex 托管搜索时，请使用显式的受管理提供商。

选择 `provider: "codex"` 会启用捆绑的 `codex` 插件，并使用上面显示的相同 `tools.web.search.openaiCodex` 限制。请先使用 `openclaw models auth login --provider openai` 对 Codex 应用服务器进行身份验证。父代理可以使用任何模型或运行时；只有受边界限制的搜索工作进程通过 Codex 运行。

## 网络安全

Managed HTTP `web_search` provider calls use OpenClaw's guarded fetch path. For
trusted provider API hosts, OpenClaw allows Surge, Clash, and sing-box fake-IP
DNS answers in `198.18.0.0/15` and `fc00::/7` only for that provider hostname.
Other private, loopback, link-local, and metadata destinations remain blocked.
Codex Hosted Search is the exception: its bounded worker delegates network
access to Codex app-server's hosted `web_search` tool.

此自动允许不适用于任意 `web_fetch` URL。对于 `web_fetch`，仅当你的受信任代理拥有这些合成范围时，才显式启用 `tools.web.fetch.ssrfPolicy.allowRfc2544BenchmarkRange` 和 `tools.web.fetch.ssrfPolicy.allowIpv6UniqueLocalRange`。

## 设置网页搜索

文档和设置流程中的提供商列表按字母顺序排列。自动检测则使用单独的优先级顺序。

如果未设置 `provider`，OpenClaw 会按以下顺序检查提供商，并使用第一个可用的提供商：

首先是基于 API 的提供商：

1. **Brave** -- `BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey`（顺序 10）
2. **MiniMax Search** -- `MINIMAX_CODE_PLAN_KEY` / `MINIMAX_CODING_API_KEY` / `MINIMAX_OAUTH_TOKEN` / `MINIMAX_API_KEY` 或 `plugins.entries.minimax.config.webSearch.apiKey`（顺序 15）
3. **Gemini** -- `plugins.entries.google.config.webSearch.apiKey`、`GEMINI_API_KEY` 或 `models.providers.google.apiKey`（顺序 20）
4. **Grok** -- xAI OAuth、`XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey`（顺序 30）
5. **Kimi** -- `KIMI_API_KEY` / `MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey`（顺序 40）
6. **Perplexity** -- `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey`（顺序 50）
7. **Firecrawl** -- `FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webSearch.apiKey`（顺序 60）
8. **Exa** -- `EXA_API_KEY` 或 `plugins.entries.exa.config.webSearch.apiKey`；可选的 `plugins.entries.exa.config.webSearch.baseUrl` 会覆盖 Exa 端点（顺序 65）
9. **Tavily** -- `TAVILY_API_KEY` 或 `plugins.entries.tavily.config.webSearch.apiKey`（顺序 70）
10. **Parallel** -- 付费的 Parallel Search API，通过 `PARALLEL_API_KEY` 或 `plugins.entries.parallel.config.webSearch.apiKey`；可选的 `plugins.entries.parallel.config.webSearch.baseUrl` 会覆盖端点（顺序 75）

其后是已配置的端点提供商：

11. **SearXNG** -- `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`（顺序 200）

像 **Parallel Search (Free)**、**DuckDuckGo**、
**Ollama Web Search** 和 **Codex Hosted Search** 这样的无密钥提供商，只有当你
通过 `tools.web.search.provider` 或通过
`openclaw configure --section web` 显式选择它们时才可用。即使没有配置任何基于 API 的提供商，OpenClaw 也不会因为这个原因就把托管的
`web_search` 查询发送给无密钥提供商。

OpenAI Responses 模型是一个例外：当 `tools.web.search.provider` 未设置时，它们会使用 OpenAI 原生网页搜索，而不是上面的托管提供商。将 `tools.web.search.provider` 设置为 `parallel-free`（或其他提供商）即可让它们走托管路径。

<Note>
  所有提供商密钥字段都支持 SecretRef 对象。位于
  `plugins.entries.<plugin>.config.webSearch.apiKey` 下的插件作用域 SecretRef 会为
  已安装的基于 API 的网页搜索提供商解析，包括 Brave、Exa、Firecrawl、
  Gemini、Grok、Kimi、MiniMax、Parallel、Perplexity 和 Tavily，
  无论是通过 `tools.web.search.provider` 显式选择提供商，还是通过
  自动检测选中提供商。在自动检测模式下，OpenClaw 只解析
  被选中的提供商密钥——未选中的 SecretRef 保持不激活，因此你可以
  配置多个提供商，而无需为未使用的提供商承担解析成本。
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
- 或省略该字段，让 OpenClaw 从已配置凭据中自动检测第一个可用的 web-fetch
  提供商
- 非沙箱化的 `web_fetch` 可以使用声明了 `contracts.webFetchProviders` 的已安装插件提供商；沙箱化抓取允许捆绑提供商和已验证的官方插件安装，但不包括第三方外部插件
- 官方 Firecrawl 插件提供 web-fetch 备用功能，配置位于 `plugins.entries.firecrawl.config.webFetch.*`

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
| `language`           | ISO 639-1 语言代码（例如 "en"、"de"）              |
| `search_lang`         | 搜索语言代码（仅 Brave）                            |
| `freshness`           | 时间筛选：`day`、`week`、`month` 或 `year`         |
| `date_after`          | 此日期之后的结果（YYYY-MM-DD）                     |
| `date_before`         | 此日期之前的结果（YYYY-MM-DD）                     |
| `ui_lang`             | UI 语言代码（仅 Brave）                             |
| `domain_filter`       | 域名允许/拒绝列表数组（仅 Perplexity）              |
| `max_tokens`          | 总内容预算，默认 25000（仅 Perplexity）            |
| `max_tokens_per_page` | 每页 token 限制，默认 2048（仅 Perplexity）        |

<Warning>
  并非所有参数都适用于所有提供商。Brave `llm-context` 模式
  会拒绝 `ui_lang`；`date_before` 也需要 `date_after`，因为 Brave 自定义
  freshness 范围要求同时提供开始和结束日期。
  Gemini、Grok 和 Kimi 会返回带引文的一条综合答案。它们
  接受 `count` 以兼容共享工具，但这不会改变有依据的答案形式。
  Gemini 会将 `day` freshness 视为近期提示；更宽的 freshness 值和显式日期会设置 Google Search 的依据时间范围。
  当你使用 Sonar/OpenRouter
  兼容路径（`plugins.entries.perplexity.config.webSearch.baseUrl` /
  `model` 或 `OPENROUTER_API_KEY`）时，Perplexity 的行为也是如此。
  SearXNG 仅对受信任的私有网络或回环主机接受 `http://`；公共 SearXNG 端点必须使用 `https://`。
  Firecrawl 和 Tavily 通过 `web_search`
  只支持 `query` 和 `count`——高级选项请使用它们各自的专用工具。
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
