---
summary: "Firecrawl 搜索、抓取和 web_fetch 回退"
read_when:
  - 你想使用 Firecrawl 支持的网页提取
  - 你需要 Firecrawl API 密钥
  - 你想将 Firecrawl 用作 web_search 提供者
  - 你想要用于 web_fetch 的反机器人提取
title: "Firecrawl"
---

# Firecrawl

OpenClaw 可以通过三种方式使用 **Firecrawl**：

- 作为 `web_search` 提供者
- 作为显式插件工具：`firecrawl_search` 和 `firecrawl_scrape`
- 作为 `web_fetch` 的回退提取器

它是一个托管的提取/搜索服务，支持反机器人和缓存，  
这有助于处理重度使用 JS 的网站或阻止普通 HTTP 抓取的页面。

## 获取 API 密钥

1. 创建一个 Firecrawl 账户并生成 API 密钥。
2. 将其存储在配置中，或在网关环境中设置 `FIRECRAWL_API_KEY`。

## Configure Firecrawl search

```json5
{
  tools: {
    web: {
      search: {
        provider: "firecrawl",
      },
    },
  },
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
        config: {
          webSearch: {
            apiKey: "FIRECRAWL_API_KEY_HERE",
            baseUrl: "https://api.firecrawl.dev",
          },
        },
      },
    },
  },
}
```

Notes:

- 在 onboarding 过程中选择 Firecrawl，或运行 `openclaw configure --section web` 会自动启用绑定的 Firecrawl 插件。
- Firecrawl 的 `web_search` 支持 `query` 和 `count`。
- 对于 Firecrawl 特定的控制参数，如 `sources`、`categories` 或结果抓取，请使用 `firecrawl_search`。

## Configure Firecrawl scrape + web_fetch fallback

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
      fetch: {
        firecrawl: {
          apiKey: "FIRECRAWL_API_KEY_HERE",
          baseUrl: "https://api.firecrawl.dev",
          onlyMainContent: true,
          maxAgeMs: 172800000,
          timeoutSeconds: 60,
        },
      },
    },
  },
}
```

备注：

- `firecrawl.enabled` 默认为 `true`，除非明确设置为 `false`。
- 仅当有可用的 API 密钥时，才会尝试 Firecrawl 回退（通过 `tools.web.fetch.firecrawl.apiKey` 或环境变量 `FIRECRAWL_API_KEY`）。
- `maxAgeMs` 控制缓存结果允许的最大时长（毫秒），默认是 2 天。

`firecrawl_scrape` 复用相同的 `tools.web.fetch.firecrawl.*` 设置和环境变量。

## Firecrawl 插件工具

### `firecrawl_search`

当你需要 Firecrawl 特定的搜索控制时使用，而不是通用的 `web_search`。

核心参数：

- `query`
- `count`
- `sources`
- `categories`
- `scrapeResults`
- `timeoutSeconds`

### `firecrawl_scrape`

用于 JS 密集或有反机器人保护的页面，那些纯 `web_fetch` 力不从心的场景。

核心参数：

- `url`
- `extractMode`
- `maxChars`
- `onlyMainContent`
- `maxAgeMs`
- `proxy`
- `storeInCache`
- `timeoutSeconds`

## 隐身 / 反机器人

Firecrawl 提供了一个 **代理模式** 参数用于反机器人（选项包括 `basic`、`stealth` 或 `auto`）。  
OpenClaw 对 Firecrawl 请求总是使用 `proxy: "auto"` 并设置 `storeInCache: true`。  
如果省略代理参数，Firecrawl 默认使用 `auto`。`auto` 会在基础代理失败时尝试隐身代理，这可能比仅用基础代理消耗更多积分。

## `web_fetch` 如何使用 Firecrawl

`web_fetch` 的提取顺序：

1. Readability（本地）
2. Firecrawl（如有配置）
3. 基础 HTML 清理（最后回退）

## Related

- [Web Search overview](/tools/web) -- all providers and auto-detection
- [Web Fetch](/tools/web-fetch) -- web_fetch tool with Firecrawl fallback
- [Tavily](/tools/tavily) -- search + extract tools
