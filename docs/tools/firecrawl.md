---
summary: "Firecrawl 搜索、抓取和 web_fetch 回退"
read_when:
  - "您想要 Firecrawl- 支持的网络提取"
  - "你想要无密钥的 Firecrawl Search（免费）或无密钥的 web_fetch"
  - "你需要 Firecrawl API 密钥用于搜索或更高的限制"
  - "你想将 Firecrawl 作为 web_search 提供方"
  - "你想为 web_fetch 使用反机器人提取"
title: "Firecrawl"
---

OpenClaw可以通过三种方式使用[Firecrawl](https://www.firecrawl.dev/)：

- 作为 `web_search` 提供方
- 作为显式插件工具：`firecrawl_search` 和 `firecrawl_scrape`
- 作为 `web_fetch` 的回退提取器

它是一项托管的 extraction/search 服务，支持机器人规避和缓存，有助于阻止普通 HTTP 获取的 JS-heavy 网站或页面。

## <a id="install-plugin"></a> 安装插件

安装官方插件：

```bash
openclaw plugins install @openclaw/firecrawl-plugin
```

安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

## <a id="keyless-access-and-api-keys"></a> 无密钥访问和 API 密钥

Firecrawl 注册了两个 `web_search` 提供方：

- **Firecrawl Search** (`firecrawl`) — 使用托管的 `/v2/search` API 和你的密钥；当检测到存在密钥时会自动选中。
- **Firecrawl Search (Free)** (`firecrawl-free`) — 使用托管的无密钥入门套餐，不需要 API 密钥。它**仅限手动选择**，且绝不会自动选中，因为选择它会将你的搜索查询发送到 Firecrawl 的免费套餐。

明确选择的 Firecrawl `web_fetch` 后备也是无密钥的。显式 `firecrawl_search` 和 `firecrawl_scrape` 工具需要 API 密钥。在网关环境中添加 `FIRECRAWL_API_KEY` 或将其配置为更高的限制。从 [Firecrawl 仪表板 ](https://www.firecrawl.dev/app/api-keys) 获取密钥。

## <a id="configure-firecrawl-search"></a> 配置 Firecrawl 搜索

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

- 在引导流程中选择 Firecrawl，或使用 `openclaw configure --section web`，会自动启用已安装的 Firecrawl 插件。
- 在引导流程中选择 **Firecrawl Search (Free)**（或设置 `provider: "firecrawl-free"`），即可无密钥运行，无需 API key。带密钥的 **Firecrawl Search** 提供程序会发送 `plugins.entries.firecrawl.config.webSearch.apiKey` 或 `FIRECRAWL_API_KEY`。
- 使用 Firecrawl 的 `web_search` 支持 `query` 和 `count`。
- 对于 Firecrawl- 特定控件（例如 `sources`、`categories` 或结果抓取），请使用 `firecrawl_search`。
- `baseUrl` 默认托管在 `https://api.firecrawl.dev` 处的 Firecrawl。仅允许 private/internal 端点进行自托管覆盖； HTTP 仅适用于那些私有目标。
- `FIRECRAWL_BASE_URL` 是 Firecrawl 搜索和抓取基本 URL 的共享环境后备。
- Firecrawl 搜索请求默认超时时间为 30 秒；`firecrawl_search` 的 `timeoutSeconds` 参数可按单次调用覆盖它。

Firecrawl `web_search` 提供程序和 `firecrawl_search` 都使用 `tools.web.search.cacheTtlMinutes` 作为 OpenClaw 的本地结果缓存（默认值：15 分钟）。将其设置为 `0` 以绕过缓存读写。较短的 TTL 限制了现有条目的重用；较长的 TTL 不会延长其原始有效期。此设置不会更改 Firecrawl 的上游抓取缓存。

## <a id="configure-firecrawl-web_fetch-fallback"></a> 配置 Firecrawl web_fetch 回退

```json5
{
  tools: {
    web: {
      fetch: {
        provider: "firecrawl", // explicit selection enables keyless fallback
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
- Firecrawl scrape/base URL 覆盖遵循与搜索相同的 hosted/private 规则：公共托管流量使用 `https://api.firecrawl.dev`；自托管覆盖必须解析为 private/internal 端点。
- `firecrawl_scrape` 在将其转发到 Firecrawl 之前拒绝明显的私有、环回、元数据和非 HTTP（S） 目标 URL，匹配用于显式 Firecrawl 抓取调用的 `web_fetch` 目标安全合约。

`firecrawl_scrape` 会复用相同的 `plugins.entries.firecrawl.config.webFetch.*` 设置和环境变量，包括其必需的 API 密钥。

### <a id="self-hosted-firecrawl"></a> 自托管 Firecrawl

当您自己运行 Firecrawl 时，请设置 `plugins.entries.firecrawl.config.webSearch.baseUrl`、`plugins.entries.firecrawl.config.webFetch.baseUrl` 或 `FIRECRAWL_BASE_URL`。 OpenClaw 仅针对环回、专用网络、`.local`、`.internal` 或 `.localhost` 目标接受 `http://`。公共自定义主机被拒绝，因此 Firecrawl API 密钥不会意外发送到任意端点。

## <a id="firecrawl-plugin-tools"></a> Firecrawl 插件工具

### `firecrawl_search`

当您需要 Firecrawl- 特定搜索控件而不是通用 `web_search` 时，请使用此选项。需要 API 密钥。

参数：

- `query`
- `count` (1-100)
- `sources`
- `categories`
- `includeDomains` / `excludeDomains`（仅限主机名；二者互斥）
- `tbs`（时间筛选，例如 `qdr:d`、`qdr:w`、`sbd:1`）
- `location` 和 `country`（地理定向）
- `scrapeResults`
- `timeoutSeconds`

### `firecrawl_scrape`

将此用于 JS-heavy 或普通 `web_fetch` 较弱的受机器人保护的页面。

参数：

- `url`
- `extractMode`
- `maxChars`
- `onlyMainContent`
- `maxAgeMs`
- `proxy`
- `storeInCache`
- `timeoutSeconds`

## <a id="stealth-%2F-bot-circumvention"></a><a id="stealth-/-bot-circumvention"></a> 隐身 / 反爬虫绕过

`firecrawl_scrape` 和 `web_fetch` 的 Firecrawl 回退默认使用 `proxy: "auto"` 以及 `storeInCache: true`，除非调用方覆盖这些参数。`firecrawl_search` 和 `web_search` 的 Firecrawl 提供方不支持 `proxy`/`storeInCache` 控制；隐身代理模式仅适用于 scrape/fetch 请求。

Firecrawl 的 `proxy` 模式控制机器人绕过（`basic`、`stealth` 或 `auto`）。`auto` 会在基础尝试失败时重试隐身代理，这可能比仅使用 basic 的抓取消耗更多 credits。

## <a id="how-web_fetch-uses-firecrawl"></a> `web_fetch` 如何使用 Firecrawl

`web_fetch` 提取顺序：

1. Readability（本地）
2. 已配置的抓取提供方，例如 Firecrawl（在选择时，或从已配置的凭据自动检测到时）
3. 基础 HTML 清理（最后的回退方案）

选择开关是 `tools.web.fetch.provider`。如果你省略它，OpenClaw 会从可用凭据中自动检测第一个可用的 web-fetch 提供方。官方 Firecrawl 插件提供了该回退方案。

## <a id="related"></a> 相关内容

- [网页搜索概述](/tools/web) -- 所有提供商和自动检测
- [Web Fetch](/tools/web-fetch) -- 带有 Firecrawl 回退的 web_fetch 工具
- [Tavily](/tools/tavily) -- 搜索 + 提取工具
