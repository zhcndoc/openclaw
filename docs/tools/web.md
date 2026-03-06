---
summary: "网络搜索 + 抓取工具（Perplexity Search API、Brave、Gemini、Grok 和 Kimi 提供商）"
read_when:
  - 你想启用 web_search 或 web_fetch
  - 你需要设置 Perplexity 或 Brave Search API 密钥
  - 你想使用带有 Google 搜索基础的 Gemini
title: "网络工具"
---

# 网络工具

OpenClaw 提供两个轻量级的网络工具：

- `web_search` — 使用 Perplexity Search API、Brave Search API、带 Google 搜索基础的 Gemini、Grok 或 Kimi 进行网络搜索。
- `web_fetch` — HTTP 抓取 + 可读内容提取（HTML → markdown/文本）。

这些**不**是浏览器自动化工具。对于 JS 密集型网站或登录操作，请使用[浏览器工具](/tools/browser)。

## 工作原理

- `web_search` 调用你配置的提供商并返回结果。
- 结果按照查询缓存 15 分钟（可配置）。
- `web_fetch` 仅执行普通的 HTTP GET 请求并提取可读内容（HTML → markdown/文本）。**不执行 JavaScript**。
- `web_fetch` 默认启用（除非显式禁用）。

有关提供商的具体细节，请参见[Perplexity Search 设置](/perplexity)和[Brave Search 设置](/brave-search)。

## 选择搜索提供商

| 提供商                    | 优点                                                                                              | 缺点                                         | API 密钥                           |
| ------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------- |
| **Perplexity Search API** | 快速、结构化结果；支持域名、语言、区域和新鲜度过滤；支持内容提取                                | —                                            | `PERPLEXITY_API_KEY`              |
| **Brave Search API**      | 快速、结构化结果                                                                                   | 过滤选项较少；AI 使用条款适用                | `BRAVE_API_KEY`                   |
| **Gemini**                | Google 搜索基础，AI 合成答案                                                                       | 需要 Gemini API 密钥                          | `GEMINI_API_KEY`                  |
| **Grok**                  | xAI 基于网络的响应                                                                                | 需要 xAI API 密钥                            | `XAI_API_KEY`                     |
| **Kimi**                  | Moonshot 网络搜索能力                                                                              | 需要 Moonshot API 密钥                        | `KIMI_API_KEY` / `MOONSHOT_API_KEY` |

### 自动检测

如果未显式设置 `provider`，OpenClaw 会根据可用的 API 密钥自动检测要使用的提供商，检测顺序如下：

1. **Brave** — 环境变量 `BRAVE_API_KEY` 或配置项 `tools.web.search.apiKey`
2. **Gemini** — 环境变量 `GEMINI_API_KEY` 或配置项 `tools.web.search.gemini.apiKey`
3. **Kimi** — 环境变量 `KIMI_API_KEY` / `MOONSHOT_API_KEY` 或配置项 `tools.web.search.kimi.apiKey`
4. **Perplexity** — 环境变量 `PERPLEXITY_API_KEY` 或配置项 `tools.web.search.perplexity.apiKey`
5. **Grok** — 环境变量 `XAI_API_KEY` 或配置项 `tools.web.search.grok.apiKey`

如果没有找到任何密钥，则回退使用 Brave （你将收到缺失密钥的错误提示，提示你进行配置）。

## 设置网络搜索

使用 `openclaw configure --section web` 来设置你的 API 密钥并选择提供商。

### Perplexity Search

1. 在 <https://www.perplexity.ai/settings/api> 创建 Perplexity 账户
2. 在控制面板生成 API 密钥
3. 运行 `openclaw configure --section web` 将密钥存入配置，或在环境中设置 `PERPLEXITY_API_KEY`

更多详情请参阅[Perplexity Search API 文档](https://docs.perplexity.ai/guides/search-quickstart)。

### Brave Search

1. 在 <https://brave.com/search/api/> 创建 Brave Search API 账户
2. 在控制面板选择 **Data for Search** 计划（非 “Data for AI”），然后生成 API 密钥
3. 运行 `openclaw configure --section web` 将密钥保存到配置（推荐），或在环境中设置 `BRAVE_API_KEY`

Brave 提供付费方案；请查看 Brave API 门户了解当前限制和价格。

### 密钥存储位置

**通过配置（推荐）：** 运行 `openclaw configure --section web`，它会将密钥存储在 `tools.web.search.perplexity.apiKey` 或 `tools.web.search.apiKey` 下。

**通过环境变量：** 在 Gateway 进程环境中设置 `PERPLEXITY_API_KEY` 或 `BRAVE_API_KEY`。如果是网关安装，请放入 `~/.openclaw/.env`（或你的服务环境）。参见[环境变量](/help/faq#how-does-openclaw-load-environment-variables)。

### 配置示例

**Perplexity Search:**

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "perplexity",
        perplexity: {
          apiKey: "pplx-...", // 如果已设置 PERPLEXITY_API_KEY，此项可选
        },
      },
    },
  },
}
```

**Brave Search:**

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "brave",
        apiKey: "BSA...", // 如果已设置 BRAVE_API_KEY，此项可选
      },
    },
  },
}
```

## 使用 Gemini（Google 搜索基础）

Gemini 模型支持内置的[Google 搜索基础](https://ai.google.dev/gemini-api/docs/grounding)，
能返回基于实时 Google 搜索结果和引用的 AI 合成答案。

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
          // API 密钥（如果已设置 GEMINI_API_KEY 可选）
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
对于网关安装，请放入 `~/.openclaw/.env`。

### 注意事项

- Gemini 基础的引用链接会自动从 Google 的重定向链接解析为直接链接。
- 重定向解析使用 SSRF 防护机制（HEAD 请求 + 重定向检查 + http/https 验证）后才返回最终引用链接。
- 重定向解析使用严格的 SSRF 默认设置，因此重定向到私有/内部目标将被阻止。
- 默认模型（`gemini-2.5-flash`）快速且成本效益高。
  任何支持基础功能的 Gemini 模型均可使用。

## web_search

使用你配置的提供商进行网络搜索。

### 要求

- `tools.web.search.enabled` 不能为 `false`（默认为启用）
- 你选择的提供商 API 密钥：
  - **Brave**：`BRAVE_API_KEY` 或 `tools.web.search.apiKey`
  - **Perplexity**：`PERPLEXITY_API_KEY` 或 `tools.web.search.perplexity.apiKey`
  - **Gemini**：`GEMINI_API_KEY` 或 `tools.web.search.gemini.apiKey`
  - **Grok**：`XAI_API_KEY` 或 `tools.web.search.grok.apiKey`
  - **Kimi**：`KIMI_API_KEY`、`MOONSHOT_API_KEY` 或 `tools.web.search.kimi.apiKey`

### 配置

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        apiKey: "BRAVE_API_KEY_HERE", // 如已设置 BRAVE_API_KEY 可选
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
    },
  },
}
```

### 工具参数

所有参数对 Brave 和 Perplexity 均适用，除非另有说明。

| 参数                  | 说明                                     |
| --------------------- | ---------------------------------------- |
| `query`               | 搜索查询（必填）                         |
| `count`               | 返回结果数量（1-10，默认：5）             |
| `country`             | 2 字母 ISO 国家代码（如 "US"，"DE"）      |
| `language`            | ISO 639-1 语言代码（如 "en"，"de"）       |
| `freshness`           | 时间过滤：`day`、`week`、`month` 或 `year` |
| `date_after`          | 从此日期之后的结果（格式 YYYY-MM-DD）     |
| `date_before`         | 在此日期之前的结果（格式 YYYY-MM-DD）     |
| `ui_lang`             | 界面语言代码（仅 Brave 支持）             |
| `domain_filter`       | 域名允许/拒绝列表数组（仅 Perplexity 支持） |
| `max_tokens`          | 总内容令牌预算，默认 25000（仅 Perplexity） |
| `max_tokens_per_page` | 每页令牌限制，默认 2048（仅 Perplexity）  |

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

## web_fetch

抓取 URL 并提取可读内容。

### web_fetch 要求

- `tools.web.fetch.enabled` 不能为 `false`（默认为启用）
- 可选 Firecrawl 备用：设置 `tools.web.fetch.firecrawl.apiKey` 或环境变量 `FIRECRAWL_API_KEY`。

### web_fetch 配置

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
          apiKey: "FIRECRAWL_API_KEY_HERE", // 如果已设置 FIRECRAWL_API_KEY 可选
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

- `url`（必需，仅支持 http/https）
- `extractMode`（`markdown` | `text`）
- `maxChars`（用于截断超长页面）

注意事项：

- `web_fetch` 首先使用 Readability（主体内容提取），然后使用 Firecrawl（如果配置了）。两者均失败时，工具返回错误。
- Firecrawl 请求使用绕过机器人检测模式，默认会缓存结果。
- `web_fetch` 默认发送类似 Chrome 的 User-Agent 和 `Accept-Language`；如有需要可覆盖 `userAgent`。
- `web_fetch` 会屏蔽私有/内部主机名，并重新检查重定向（限制最多 `maxRedirects` 次）。
- `maxChars` 会被限制在 `tools.web.fetch.maxCharsCap`。
- `web_fetch` 会限制下载响应体大小为 `tools.web.fetch.maxResponseBytes`，超出时截断并附带警告。
- `web_fetch` 是尽力而为的提取方案；部分网站可能需要浏览器工具。
- 有关密钥配置及服务详情，请参见 [Firecrawl](/tools/firecrawl)。
- 响应会缓存（默认 15 分钟），以减少重复抓取。
- 如果使用工具配置文件/允许列表，请添加 `web_search`/`web_fetch` 或 `group:web`。
- 若缺少 API 密钥，`web_search` 会返回简短的设置提示并附带文档链接。
