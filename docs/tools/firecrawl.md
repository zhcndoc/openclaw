---
summary: "Firecrawl 搜索、抓取和 web_fetch 回退"
read_when:
  - 你想要使用 Firecrawl 支持的网页提取
  - 你想要无需密钥的 Firecrawl web_fetch
  - 你需要 Firecrawl API 密钥来进行搜索或获取更高限额
  - 你想将 Firecrawl 作为 web_search 提供方
  - 你想为 web_fetch 使用反爬虫提取
title: "Firecrawl"
---

OpenClaw 可以通过三种方式使用 **Firecrawl**：

- 作为 `web_search` 提供方
- 作为显式插件工具：`firecrawl_search` 和 `firecrawl_scrape`
- 作为 `web_fetch` 的回退提取器

它是一个托管的提取/搜索服务，支持绕过机器人检测和缓存，这有助于处理依赖大量 JS 的站点或阻止普通 HTTP fetch 的页面。

## 安装插件

安装官方插件，然后重启 Gateway：

```bash
openclaw plugins install @openclaw/firecrawl-plugin
openclaw gateway restart
```

## 无密钥 web_fetch 和 API 密钥

明确选择的托管 Firecrawl `web_fetch` 回退支持无需 API 密钥的入门级访问。在网关环境中添加 `FIRECRAWL_API_KEY`，或在需要更高限制时进行配置。Firecrawl `web_search` 和 `firecrawl_scrape` 需要 API 密钥。

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

- 在 onboarding 中选择 Firecrawl 或使用 `openclaw configure --section web` 会自动启用已安装的 Firecrawl 插件。
- 使用 Firecrawl 的 `web_search` 支持 `query` 和 `count`。
- 对于 `sources`、`categories` 或结果抓取等 Firecrawl 特定控制，请使用 `firecrawl_search`。
- `baseUrl` 默认指向托管的 Firecrawl：`https://api.firecrawl.dev`。仅允许为私有/内部端点覆盖为自托管；只有针对这些私有目标时才接受 HTTP。
- `FIRECRAWL_BASE_URL` 是 Firecrawl 搜索和抓取 base URL 的共享环境变量回退值。
- Firecrawl 搜索请求默认超时时间为 30 秒；`firecrawl_search` 的 `timeoutSeconds` 参数可按调用覆盖它。

## 配置 Firecrawl web_fetch 回退

```json5
{
  tools: {
    web: {
      fetch: {
        provider: "firecrawl", // 显式选择会启用无密钥回退
      },
    },
  },
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
        config: {
          webFetch: {
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

- 显式选择的 Firecrawl `web_fetch` 回退在没有 API 密钥的情况下也可工作。配置后，OpenClaw 会发送 `plugins.entries.firecrawl.config.webFetch.apiKey` 或 `FIRECRAWL_API_KEY`，以获得更高的额度。
- 在引导设置期间选择 Firecrawl，或运行 `openclaw configure --section web`，会启用该插件并为 `web_fetch` 选择 Firecrawl，除非已经配置了其他抓取提供方。
- `firecrawl_scrape` 需要 API 密钥。
- `maxAgeMs` 控制缓存结果可以有多旧（毫秒）。默认值为 172,800,000 毫秒（2 天）。
- `onlyMainContent` 默认为 `true`；`timeoutSeconds` 默认为 60。
- 旧版的 `tools.web.fetch.firecrawl.*` 和 `tools.web.search.firecrawl.*` 配置会被 `openclaw doctor --fix` 自动迁移。
- Firecrawl 的抓取/基础 URL 覆盖遵循与搜索相同的托管/自托管规则：公共托管流量使用 `https://api.firecrawl.dev`；自托管覆盖必须解析到私有/内部端点。
- 在将 `firecrawl_scrape` 转发给 Firecrawl 之前，它会拒绝明显的私有、回环、元数据以及非 HTTP(S) 目标 URL，这与显式 Firecrawl 抓取调用的 `web_fetch` 目标安全契约一致。

`firecrawl_scrape` 会复用相同的 `plugins.entries.firecrawl.config.webFetch.*` 设置和环境变量，包括其必需的 API 密钥。

### 自托管 Firecrawl

当你自行运行 Firecrawl 时，请设置 `plugins.entries.firecrawl.config.webSearch.baseUrl`、`plugins.entries.firecrawl.config.webFetch.baseUrl` 或 `FIRECRAWL_BASE_URL`。OpenClaw 仅接受用于回环、私有网络、`.local`、`.internal` 或 `.localhost` 目标的 `http://`。公共自定义主机将被拒绝，以避免 Firecrawl API 密钥意外发送到任意端点。

## Firecrawl 插件工具

### `firecrawl_search`

当你想使用 Firecrawl 特定的搜索控制，而不是通用 `web_search` 时使用它。

参数：

- `query`
- `count`
- `sources`
- `categories`
- `scrapeResults`
- `timeoutSeconds`

### `firecrawl_scrape`

当页面是 JS 密集型或受机器人保护，而普通 `web_fetch` 较弱时使用它。

参数：

- `url`
- `extractMode`
- `maxChars`
- `onlyMainContent`
- `maxAgeMs`
- `proxy`
- `storeInCache`
- `timeoutSeconds`

## 隐身 / 反爬虫绕过

`firecrawl_scrape` 和 `web_fetch` 的 Firecrawl 回退默认使用 `proxy: "auto"` 以及 `storeInCache: true`，除非调用方覆盖这些参数。`firecrawl_search` 和 `web_search` 的 Firecrawl 提供方不支持 `proxy`/`storeInCache` 控制；隐身代理模式仅适用于 scrape/fetch 请求。

Firecrawl 的 `proxy` 模式控制机器人绕过（`basic`、`stealth` 或 `auto`）。`auto` 会在基础尝试失败时重试隐身代理，这可能比仅使用 basic 的抓取消耗更多 credits。

## `web_fetch` 如何使用 Firecrawl

`web_fetch` 提取顺序：

1. Readability（本地）
2. 已配置的抓取提供方，例如 Firecrawl（在选择时，或从已配置的凭据自动检测到时）
3. 基础 HTML 清理（最后的回退方案）

选择开关是 `tools.web.fetch.provider`。如果你省略它，OpenClaw 会从可用凭据中自动检测第一个可用的 web-fetch 提供方。官方 Firecrawl 插件提供了该回退方案。

## 相关内容

- [Web Search 概览](/tools/web) -- 所有提供方和自动检测
- [Web Fetch](/tools/web-fetch) -- 带有 Firecrawl 回退的 web_fetch 工具
- [Tavily](/tools/tavily) -- 搜索 + 提取工具
