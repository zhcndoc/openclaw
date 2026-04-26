---
summary: "Firecrawl 搜索、抓取和 web_fetch 回退"
read_when:
  - 你想使用 Firecrawl 支持的网页提取
  - 你需要 Firecrawl API 密钥
  - 你想将 Firecrawl 用作 web_search 提供者
  - 你想要用于 web_fetch 的反机器人提取
title: "Firecrawl"
---

OpenClaw 可以通过三种方式使用 **Firecrawl**：

- 作为 `web_search` 提供者
- 作为显式插件工具：`firecrawl_search` 和 `firecrawl_scrape`
- 作为 `web_fetch` 的回退提取器

它是一个托管的提取/搜索服务，支持反机器人和缓存，  
这有助于处理重度使用 JS 的网站或阻止普通 HTTP 抓取的页面。

## 获取 API 密钥

1. 创建一个 Firecrawl 账户并生成 API 密钥。
2. 将其存储在配置中，或在网关环境中设置 `FIRECRAWL_API_KEY`。

## 配置 Firecrawl 搜索

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

备注：

- 在引导流程中选择 Firecrawl，或运行 `openclaw configure --section web`，会自动启用捆绑的 Firecrawl 插件。
- 使用 Firecrawl 的 `web_search` 支持 `query` 和 `count`。
- 对于 Firecrawl 特定的控制项，如 `sources`、`categories` 或结果抓取，请使用 `firecrawl_search`。
- `baseUrl` 覆盖必须保持为 `https://api.firecrawl.dev`。
- `FIRECRAWL_BASE_URL` 是 Firecrawl 搜索和抓取 base URL 的共享环境变量回退值。

## 配置 Firecrawl 抓取 + web_fetch 回退

```json5
{
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
        config: {
          webFetch: {
            apiKey: "FIRECRAWL_API_KEY_HERE",
            baseUrl: "https://api.firecrawl.dev",
            onlyMainContent: true,
            maxAgeMs: 172800000,
            timeoutSeconds: 60,
          },
        },
      },
    },
  },
}
```

备注：

- 只有在可用 API 密钥时才会运行 Firecrawl 回退尝试（`plugins.entries.firecrawl.config.webFetch.apiKey` 或 `FIRECRAWL_API_KEY`）。
- `maxAgeMs` 控制缓存结果可有多旧（毫秒）。默认值为 2 天。
- 旧版 `tools.web.fetch.firecrawl.*` 配置会由 `openclaw doctor --fix` 自动迁移。
- Firecrawl 抓取/base URL 覆盖仅限于 `https://api.firecrawl.dev`。

`firecrawl_scrape` 会复用相同的 `plugins.entries.firecrawl.config.webFetch.*` 设置和环境变量。

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
2. Firecrawl（如果被选中，或被自动检测为当前的 web-fetch 回退）
3. 基础 HTML 清理（最后回退）

选择开关是 `tools.web.fetch.provider`。如果你省略它，OpenClaw 会根据可用凭据自动检测第一个就绪的 web-fetch 提供者。  
当前捆绑的提供者是 Firecrawl。

## 相关内容

- [Web Search 概览](/tools/web) -- 所有提供者和自动检测
- [Web Fetch](/tools/web-fetch) -- 带 Firecrawl 回退的 web_fetch 工具
- [Tavily](/tools/tavily) -- 搜索 + 提取工具
