---
summary: "Firecrawl 搜索、抓取和 web_fetch 回退"
read_when:
  - 你希望使用 Firecrawl 支持的网页提取
  - 你需要 Firecrawl API 密钥
  - 你想将 Firecrawl 作为 web_search 提供方
  - 你想为 web_fetch 使用反爬虫提取
title: "Firecrawl"
---

OpenClaw 可以通过三种方式使用 **Firecrawl**：

- 作为 `web_search` 提供方
- 作为显式插件工具：`firecrawl_search` 和 `firecrawl_scrape`
- 作为 `web_fetch` 的回退提取器

它是一项托管式提取/搜索服务，支持绕过机器人检测和缓存，
这有助于处理 JS 密集型站点或阻止普通 HTTP 抓取的页面。

## 获取 API 密钥

1. 创建 Firecrawl 账户并生成一个 API 密钥。
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

注意：

- 在 onboarding 中选择 Firecrawl，或使用 `openclaw configure --section web`，会自动启用捆绑的 Firecrawl 插件。
- 使用 Firecrawl 的 `web_search` 支持 `query` 和 `count`。
- 若需使用 Firecrawl 特有的控制项，如 `sources`、`categories` 或结果抓取，请使用 `firecrawl_search`。
- `baseUrl` 默认指向托管版 Firecrawl：`https://api.firecrawl.dev`。仅允许将自托管覆盖用于私有/内部端点；只有针对这些私有目标时才接受 HTTP。
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

注意：

- 只有在可用 API 密钥时，才会执行 Firecrawl 回退尝试（`plugins.entries.firecrawl.config.webFetch.apiKey` 或 `FIRECRAWL_API_KEY`）。
- `maxAgeMs` 控制缓存结果可有多旧（毫秒）。默认值为 2 天。
- 旧版 `tools.web.fetch.firecrawl.*` 配置会由 `openclaw doctor --fix` 自动迁移。
- Firecrawl 抓取/base URL 覆盖遵循与搜索相同的托管/私有规则：公开托管流量使用 `https://api.firecrawl.dev`；自托管覆盖必须解析到私有/内部端点。
- `firecrawl_scrape` 在将目标 URL 转发给 Firecrawl 之前，会拒绝明显的私有、回环、元数据以及非 HTTP(S) 目标 URL，这与显式 Firecrawl 抓取调用的 `web_fetch` 目标安全契约一致。

`firecrawl_scrape` 会复用相同的 `plugins.entries.firecrawl.config.webFetch.*` 设置和环境变量。

### 自托管 Firecrawl

当你自行运行 Firecrawl 时，设置 `plugins.entries.firecrawl.config.webSearch.baseUrl`、
`plugins.entries.firecrawl.config.webFetch.baseUrl`，或 `FIRECRAWL_BASE_URL`。
OpenClaw 仅对回环、私有网络、`.local`、`.internal` 或 `.localhost` 目标接受 `http://`。
公共自定义主机将被拒绝，以避免 Firecrawl API 密钥意外发送到任意端点。

## Firecrawl 插件工具

### `firecrawl_search`

当你想使用 Firecrawl 特定的搜索控制，而不是通用 `web_search` 时使用它。

核心参数：

- `query`
- `count`
- `sources`
- `categories`
- `scrapeResults`
- `timeoutSeconds`

### `firecrawl_scrape`

当页面是 JS 密集型或受机器人保护，而普通 `web_fetch` 较弱时使用它。

核心参数：

- `url`
- `extractMode`
- `maxChars`
- `onlyMainContent`
- `maxAgeMs`
- `proxy`
- `storeInCache`
- `timeoutSeconds`

## 隐身 / 反爬虫绕过

Firecrawl 提供了一个用于绕过机器人检测的 **proxy 模式** 参数（`basic`、`stealth` 或 `auto`）。
OpenClaw 对 Firecrawl 请求始终使用 `proxy: "auto"` 并附带 `storeInCache: true`。
如果省略 `proxy`，Firecrawl 默认使用 `auto`。`auto` 会在基础代理尝试失败时使用 stealth 代理重试，这可能比仅使用 basic 抓取消耗更多额度。

## `web_fetch` 如何使用 Firecrawl

`web_fetch` 提取顺序：

1. Readability（本地）
2. Firecrawl（如果被选中，或被自动检测为当前的 web-fetch 回退）
3. 基础 HTML 清理（最后回退）

选择开关是 `tools.web.fetch.provider`。如果你省略它，OpenClaw 会根据可用凭据
自动检测第一个可用的 web-fetch 提供方。
目前内置提供方是 Firecrawl。

## 相关内容

- [Web Search 概览](/tools/web) -- 所有提供方和自动检测
- [Web Fetch](/tools/web-fetch) -- 带有 Firecrawl 回退的 web_fetch 工具
- [Tavily](/tools/tavily) -- 搜索 + 提取工具
