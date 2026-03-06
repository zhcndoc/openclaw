---
summary: "Firecrawl 作为 web_fetch 的回退方案（反机器人 + 缓存提取）"
read_when:
  - 你想要使用 Firecrawl 支持的网页提取
  - 你需要一个 Firecrawl API 密钥
  - 你想为 web_fetch 使用反机器人提取
title: "Firecrawl"
---

# Firecrawl

OpenClaw 可以使用 **Firecrawl** 作为 `web_fetch` 的回退提取器。它是一个托管的内容提取服务，支持反机器人和缓存功能，有助于处理依赖大量 JS 的网站或阻止普通 HTTP 抓取的页面。

## 获取 API 密钥

1. 创建一个 Firecrawl 账户并生成 API 密钥。
2. 将其存储在配置中，或在网关环境中设置 `FIRECRAWL_API_KEY`。

## 配置 Firecrawl

```json5
{
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

- 当存在 API 密钥时，`firecrawl.enabled` 默认为 true。
- `maxAgeMs` 控制缓存结果允许的最大年龄（毫秒）。默认值为 2 天。

## 隐身模式 / 反机器人

Firecrawl 提供了一个 **代理模式** 参数用于反机器人（选项为 `basic`、`stealth` 或 `auto`）。  
OpenClaw 对 Firecrawl 请求总是使用 `proxy: "auto"` 加上 `storeInCache: true`。  
如果省略代理，Firecrawl 会默认使用 `auto`。`auto` 会在基础代理失败时尝试隐身代理，这可能会比只用基础代理消耗更多积分。

## `web_fetch` 如何使用 Firecrawl

`web_fetch` 的提取顺序：

1. Readability（本地）
2. Firecrawl（如有配置）
3. 基本的 HTML 清理（最后回退）

完整的网页工具设置请参见 [Web tools](/tools/web)。
