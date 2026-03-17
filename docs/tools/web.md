---
summary: "网络搜索 + 抓取工具（Brave、Firecrawl、Gemini、Grok、Kimi 和 Perplexity 提供商）"
read_when:
  - 你想启用 web_search 或 web_fetch
  - 你需要设置提供商 API 密钥
  - 你想使用基于 Google 搜索基础的 Gemini
title: "网络工具"
---

# 网络工具

OpenClaw 提供两个轻量级的网络工具：

- `web_search` — 通过 Brave Search API、Firecrawl Search、具备 Google 搜索基础的 Gemini、Grok、Kimi 或 Perplexity Search API 搜索网络。
- `web_fetch` — HTTP 抓取 + 可读内容提取（HTML → markdown/文本）。

这些**不是浏览器自动化**。对于重度 JS 网站或需要登录的情况，请使用
[浏览器工具](/tools/browser)。

## 工作原理

- `web_search` 调用你配置的提供商并返回结果。
- 结果按查询缓存 15 分钟（可配置）。
- `web_fetch` 执行普通 HTTP GET 请求并提取可读内容
  （HTML → markdown/文本），**不执行 JavaScript**。
- `web_fetch` 默认启用（除非显式禁用）。
- 捆绑的 Firecrawl 插件启用时，还会添加 `firecrawl_search` 和 `firecrawl_scrape`。

请参阅 [Brave Search 设置](/brave-search) 和 [Perplexity Search 设置](/perplexity) 获取提供商相关详情。

## 选择搜索提供商

| 提供商                    | 结果形式                          | 提供商特定过滤器                                           | 备注                                                                            | API 密钥                                     |
| ------------------------- | --------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------- |
| **Brave Search API**      | 结构化结果带摘要                  | `country`、`language`、`ui_lang`、时间                      | 支持 Brave 的 `llm-context` 模式                                              | `BRAVE_API_KEY`                             |
| **Firecrawl Search**      | 结构化结果带摘要                  | 使用 `firecrawl_search` 支持 Firecrawl 特定搜索选项           | 最适合配合 Firecrawl 抓取/提取使用                                            | `FIRECRAWL_API_KEY`                         |
| **Gemini**                | AI 合成答案 + 引用                | —                                                          | 使用 Google 搜索基础                                                           | `GEMINI_API_KEY`                            |
| **Grok**                  | AI 合成答案 + 引用                | —                                                          | 使用 xAI 网页基础回答                                                          | `XAI_API_KEY`                               |
| **Kimi**                  | AI 合成答案 + 引用                | —                                                          | 使用 Moonshot 网络搜索                                                         | `KIMI_API_KEY` / `MOONSHOT_API_KEY`         |
| **Perplexity Search API** | 结构化结果带摘要                  | `country`、`language`、时间、`domain_filter`                 | 支持内容提取控制；OpenRouter 兼容 Sonar 路径                                | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` |

### 自动检测

上表按字母顺序排列。如果未显式设置 `provider`，运行时自动检测按以下顺序检查提供商：

1. **Brave** — `BRAVE_API_KEY` 环境变量或 `tools.web.search.apiKey` 配置
2. **Gemini** — `GEMINI_API_KEY` 环境变量或 `tools.web.search.gemini.apiKey` 配置
3. **Grok** — `XAI_API_KEY` 环境变量或 `tools.web.search.grok.apiKey` 配置
4. **Kimi** — `KIMI_API_KEY` / `MOONSHOT_API_KEY` 环境变量或 `tools.web.search.kimi.apiKey` 配置
5. **Perplexity** — `PERPLEXITY_API_KEY`、`OPENROUTER_API_KEY` 或 `tools.web.search.perplexity.apiKey` 配置
6. **Firecrawl** — `FIRECRAWL_API_KEY` 环境变量或 `tools.web.search.firecrawl.apiKey` 配置

如果未找到密钥，将回退至 Brave（此时你会收到缺少密钥的错误提示，提醒你进行配置）。

运行时 SecretRef 行为：

- 网络工具 SecretRef 在网关启动/重载时原子解析。
- 在自动检测模式下，OpenClaw 仅解析所选提供商的密钥。未选提供商的 SecretRef 保持不活动，直到选中。
- 若所选提供商 SecretRef 未解析且无提供商环境变量回退，启动/重载会快速失败。

## 设置网络搜索

使用 `openclaw configure --section web` 设置你的 API 密钥并选择提供商。

### Brave Search

1. 在[brave.com/search/api](https://brave.com/search/api/) 创建 Brave Search API 账号
2. 在控制面板选择 **Search** 计划并生成 API 密钥。
3. 运行 `openclaw configure --section web` 将密钥存入配置，或在环境中设置 `BRAVE_API_KEY`。

每个 Brave 计划包含 **每月 5 美元免费额度**（自动续订）。Search 计划费用是每 1,000 次请求 5 美元，额度覆盖每月 1,000 次查询。请在 Brave 控制面板设置使用上限以避免意外费用。详情见
[Brave API 入口](https://brave.com/search/api/) 的最新计划和价格。

### Perplexity Search

1. 在 [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) 创建 Perplexity 账号
2. 在控制面板生成 API 密钥
3. 运行 `openclaw configure --section web` 将密钥存入配置，或在环境中设置 `PERPLEXITY_API_KEY`。

为兼容旧版 Sonar/OpenRouter，设置 `OPENROUTER_API_KEY`，或配置 `tools.web.search.perplexity.apiKey` 为 `sk-or-...` 形式的密钥。设置 `tools.web.search.perplexity.baseUrl` 或 `model` 也会切换至聊天补全兼容路径。

详见 [Perplexity Search API 文档](https://docs.perplexity.ai/guides/search-quickstart)。

### 密钥存储位置

**通过配置：** 运行 `openclaw configure --section web`，密钥存储在提供商专用配置路径下：

- Brave: `tools.web.search.apiKey`
- Firecrawl: `tools.web.search.firecrawl.apiKey`
- Gemini: `tools.web.search.gemini.apiKey`
- Grok: `tools.web.search.grok.apiKey`
- Kimi: `tools.web.search.kimi.apiKey`
- Perplexity: `tools.web.search.perplexity.apiKey`

所有这些字段均支持 SecretRef 对象。

**通过环境变量：** 在网关进程环境中设置对应提供商环境变量：

- Brave: `BRAVE_API_KEY`
- Firecrawl: `FIRECRAWL_API_KEY`
- Gemini: `GEMINI_API_KEY`
- Grok: `XAI_API_KEY`
- Kimi: `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`
- Perplexity: `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`

对于网关安装，将其放入 `~/.openclaw/.env`（或你的服务环境）。详见 [环境变量](/help/faq#how-does-openclaw-load-environment-variables)。

### 配置示例

**Brave Search:**

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "brave",
        apiKey: "YOUR_BRAVE_API_KEY", // 若已设置 BRAVE_API_KEY 可选 // pragma: allowlist secret
      },
    },
  },
}
```

**Firecrawl Search:**

```json5
{
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
      },
    },
  },
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "firecrawl",
        firecrawl: {
          apiKey: "fc-...", // 若已设置 FIRECRAWL_API_KEY 可选
          baseUrl: "https://api.firecrawl.dev",
        },
      },
    },
  },
}
```

当你在引导配置或 `openclaw configure --section web` 中选择 Firecrawl 时，OpenClaw 会自动启用捆绑的 Firecrawl 插件，从而使 `web_search`、`firecrawl_search` 和 `firecrawl_scrape` 均可用。

**Brave LLM Context 模式：**

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "brave",
        apiKey: "YOUR_BRAVE_API_KEY", // 若已设置 BRAVE_API_KEY 可选 // pragma: allowlist secret
        brave: {
          mode: "llm-context",
        },
      },
    },
  },
}
```

`llm-context` 模式返回提取的页面片段作为基础，而非标准 Brave 摘要。
此模式下，`country` 和 `language` / `search_lang` 仍有效，但 `ui_lang`、
`freshness`、`date_after` 和 `date_before` 会被忽略。

**Perplexity Search:**

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "perplexity",
        perplexity: {
          apiKey: "pplx-...", // 若已设置 PERPLEXITY_API_KEY 可选
        },
      },
    },
  },
}
```

**通过 OpenRouter / Sonar 兼容使用 Perplexity:**

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "perplexity",
        perplexity: {
          apiKey: "<openrouter-api-key>", // 若已设置 OPENROUTER_API_KEY 可选
          baseUrl: "https://openrouter.ai/api/v1",
          model: "perplexity/sonar-pro",
        },
      },
    },
  },
}
```

## 使用 Gemini（基于 Google 搜索基础）

Gemini 模型支持内置的 [Google 搜索基础](https://ai.google.dev/gemini-api/docs/grounding)，
能返回依托实时 Google 搜索结果和引用来源的 AI 合成答案。

### 获取 Gemini API 密钥

1. 访问 [Google AI Studio](https://aistudio.google.com/apikey)
2. 创建 API 密钥
3. 在 Gateway 环境设置 `GEMINI_API_KEY`，或配置 `tools.web.search.gemini.apiKey`

### 设置 Gemini 搜索

```json5
{
  tools: {
    web: {
      search: {
        provider: "gemini",
        gemini: {
          // API 密钥（若已设置 GEMINI_API_KEY 可选）
          apiKey: "AIza...",
          // 模型（默认 "gemini-2.5-flash"）
          model: "gemini-2.5-flash",
        },
      },
    },
  },
}
```

**环境变量替代：** 在 Gateway 环境设置 `GEMINI_API_KEY`。
网关安装时放入 `~/.openclaw/.env`。

### 注意事项

- Gemini 搜索的引用链接会自动从 Google 重定向链接解析为直接链接。
- 解析重定向使用 SSRF 保护（HEAD 请求 + 重定向检查 + http/https 验证）后返回最终引用。
- 采用严格 SSRF 默认设置，重定向至私有/内部目标将被阻止。
- 默认模型（`gemini-2.5-flash`）速度快且成本效益高。
  任何支持基础搜索的 Gemini 模型均可使用。

## web_search

使用你配置的提供商执行网络搜索。

### 要求

- `tools.web.search.enabled` 不能为 `false`（默认启用）
- 你选择的提供商 API 密钥：
  - **Brave**: `BRAVE_API_KEY` 或 `tools.web.search.apiKey`
  - **Firecrawl**: `FIRECRAWL_API_KEY` 或 `tools.web.search.firecrawl.apiKey`
  - **Gemini**: `GEMINI_API_KEY` 或 `tools.web.search.gemini.apiKey`
  - **Grok**: `XAI_API_KEY` 或 `tools.web.search.grok.apiKey`
  - **Kimi**: `KIMI_API_KEY`、`MOONSHOT_API_KEY` 或 `tools.web.search.kimi.apiKey`
  - **Perplexity**: `PERPLEXITY_API_KEY`、`OPENROUTER_API_KEY` 或 `tools.web.search.perplexity.apiKey`
- 以上所有提供商的密钥字段均支持 SecretRef 对象。

### 配置示例

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        apiKey: "BRAVE_API_KEY_HERE", // 若已设置 BRAVE_API_KEY 可选
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
    },
  },
}
```

### 工具参数

参数取决于所选提供商。

Perplexity 的 OpenRouter/Sonar 兼容路径仅支持 `query` 和 `freshness`。
若设置了 `tools.web.search.perplexity.baseUrl` / `model`，或使用 `OPENROUTER_API_KEY`，或配置了 `sk-or-...` 形式的密钥，
仅支持搜索 API 的筛选器会报错。

| 参数                  | 说明                                          |
| --------------------- | --------------------------------------------- |
| `query`               | 查询内容（必填）                              |
| `count`               | 返回结果数量（1-10，默认 5）                  |
| `country`             | 两位 ISO 国家代码（例如 "US"，"DE"）          |
| `language`            | ISO 639-1 语言代码（例如 "en"，"de"）         |
| `freshness`           | 时间过滤：`day`，`week`，`month` 或 `year`    |
| `date_after`          | 返回此日期之后的结果（格式 YYYY-MM-DD）       |
| `date_before`         | 返回此日期之前的结果（格式 YYYY-MM-DD）       |
| `ui_lang`             | 界面语言代码（仅 Brave 支持）                 |
| `domain_filter`       | 域名白名单/黑名单数组（仅 Perplexity 支持）   |
| `max_tokens`          | 总内容预算，默认 25000（仅 Perplexity 支持）  |
| `max_tokens_per_page` | 每页令牌限制，默认 2048（仅 Perplexity 支持） |

Firecrawl `web_search` 支持 `query` 和 `count`。Firecrawl 特定控制参数（如 `sources`、`categories`、结果抓取、抓取超时）请使用捆绑的 Firecrawl 插件中的 `firecrawl_search`。

**示例：**

```javascript
// 德语搜索示例
await web_search({
  query: "TV online schauen",
  country: "DE",
  language: "de",
});

// 最近一周的结果
await web_search({
  query: "TMBG interview",
  freshness: "week",
});

// 日期范围搜索
await web_search({
  query: "AI developments",
  date_after: "2024-01-01",
  date_before: "2024-06-30",
});

// 域名过滤（仅 Perplexity）
await web_search({
  query: "climate research",
  domain_filter: ["nature.com", "science.org", ".edu"],
});

// 排除域名（仅 Perplexity）
await web_search({
  query: "product reviews",
  domain_filter: ["-reddit.com", "-pinterest.com"],
});

// 增加内容提取量（仅 Perplexity）
await web_search({
  query: "detailed AI research",
  max_tokens: 50000,
  max_tokens_per_page: 4096,
});
```

当启用 Brave `llm-context` 模式时，`ui_lang`、`freshness`、`date_after` 和
`date_before` 无法支持。请使用 Brave `web` 模式以支持这些过滤器。

## web_fetch

抓取 URL 并提取可读内容。

### web_fetch 要求

- `tools.web.fetch.enabled` 不能为 `false`（默认启用）
- 可选 Firecrawl 回退：设置 `tools.web.fetch.firecrawl.apiKey` 或环境变量 `FIRECRAWL_API_KEY`。
- `tools.web.fetch.firecrawl.apiKey` 支持 SecretRef 对象。

### web_fetch 配置示例

```json5
{
  tools: {
    web: {
      fetch: {
        enabled: true,
        maxChars: 50000,
        maxCharsCap: 50000,
        maxResponseBytes: 2000000,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
        maxRedirects: 3,
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        readability: true,
        firecrawl: {
          enabled: true,
          apiKey: "FIRECRAWL_API_KEY_HERE", // 如果已经设置了 FIRECRAWL_API_KEY，该项为可选
          baseUrl: "https://api.firecrawl.dev",
          onlyMainContent: true,
          maxAgeMs: 86400000, // 毫秒（1 天）
          timeoutSeconds: 60,
        },
      },
    },
  },
}
```

### web_fetch 工具参数

- `url`（必填，只支持 http/https）
- `extractMode` （`markdown` | `text`）
- `maxChars` （截断过长页面）

说明：

- `web_fetch` 先使用 Readability 进行主体内容提取，若失败则尝试 Firecrawl（如果配置了）。两者都失败则返回错误。
- Firecrawl 请求使用反爬虫模式，并默认缓存结果。
- Firecrawl SecretRef 仅在 Firecrawl 启用（`tools.web.fetch.enabled !== false` 且 `tools.web.fetch.firecrawl.enabled !== false`）时解析。
- 若 Firecrawl 启用且它的 SecretRef 未解析，且无环境变量 `FIRECRAWL_API_KEY` 回退，启动/重载将快速失败。
- `web_fetch` 默认发送类似 Chrome 的 User-Agent 和 `Accept-Language`，需要可覆写 `userAgent`。
- `web_fetch` 阻止访问私有/内部主机名，并会重复检测重定向（数量限制为 `maxRedirects`）。
- `maxChars` 会被限制到 `tools.web.fetch.maxCharsCap`。
- `web_fetch` 会限制下载响应体大小为 `tools.web.fetch.maxResponseBytes`，超出时截断并附带警告。
- `web_fetch` 为尽力而为的内容提取，部分网站仍需使用浏览器工具。
- 详见 [Firecrawl](/tools/firecrawl) 获取密钥设置和服务详情。
- 响应默认缓存（15 分钟）以减少重复抓取。
- 如使用工具侧配置/白名单，请添加 `web_search`/`web_fetch` 或 `group:web`。
- 若缺少 API 密钥，`web_search` 返回包含文档链接的简短设置提示。
