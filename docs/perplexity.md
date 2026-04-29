---
summary: "Perplexity 搜索 API 以及用于 web_search 的 Sonar/OpenRouter 兼容性"
read_when:
  - 你想使用 Perplexity 搜索进行网页搜索
  - 你需要设置 PERPLEXITY_API_KEY 或 OPENROUTER_API_KEY
title: "Perplexity 搜索（旧路径）"
---

# Perplexity 搜索 API

OpenClaw 支持将 Perplexity Search API 作为 `web_search` 提供程序。
它会返回包含 `title`、`url` 和 `snippet` 字段的结构化结果。

为保持兼容性，OpenClaw 也支持旧版 Perplexity Sonar/OpenRouter 配置。
如果你使用 `OPENROUTER_API_KEY`、在 `plugins.entries.perplexity.config.webSearch.apiKey` 中使用 `sk-or-...` 密钥，或设置 `plugins.entries.perplexity.config.webSearch.baseUrl` / `model`，提供程序就会切换到 chat-completions 路径，并返回带引用来源的 AI 综合答案，而不是结构化的 Search API 结果。

## 获取 Perplexity API 密钥

1. 在 [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) 创建一个 Perplexity 账号
2. 在控制台中生成 API 密钥
3. 将密钥存储在配置中，或在 Gateway 环境中设置 `PERPLEXITY_API_KEY`

## OpenRouter 兼容性

如果你之前已经在使用 OpenRouter 访问 Perplexity Sonar，请保留 `provider: "perplexity"`，并在 Gateway 环境中设置 `OPENROUTER_API_KEY`，或者在 `plugins.entries.perplexity.config.webSearch.apiKey` 中存储一个 `sk-or-...` 密钥。

可选的兼容性控制项：

- `plugins.entries.perplexity.config.webSearch.baseUrl`
- `plugins.entries.perplexity.config.webSearch.model`

## 配置示例

### 原生 Perplexity Search API

```json5
{
  plugins: {
    entries: {
      perplexity: {
        config: {
          webSearch: {
            apiKey: "pplx-...",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "perplexity",
      },
    },
  },
}
```

### OpenRouter / Sonar 兼容性

```json5
{
  plugins: {
    entries: {
      perplexity: {
        config: {
          webSearch: {
            apiKey: "<openrouter-api-key>",
            baseUrl: "https://openrouter.ai/api/v1",
            model: "perplexity/sonar-pro",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "perplexity",
      },
    },
  },
}
```

## 在哪里设置密钥

**通过配置：** 运行 `openclaw configure --section web`。它会将密钥存储在
`~/.openclaw/openclaw.json` 中的 `plugins.entries.perplexity.config.webSearch.apiKey` 下。
该字段也支持 SecretRef 对象。

**通过环境变量：** 在 Gateway 进程环境中设置 `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`。
对于网关安装，请将其放入 `~/.openclaw/.env`（或你的服务环境）中。另见 [Env vars](/help/faq#env-vars-and-env-loading)。

如果已配置 `provider: "perplexity"`，且 Perplexity 密钥 SecretRef 未解析并且没有环境变量回退，启动/重载将快速失败。

## 工具参数

这些参数适用于原生 Perplexity Search API 路径。

| 参数                  | 描述                                                 |
| --------------------- | ---------------------------------------------------- |
| `query`               | 搜索查询（必填）                                     |
| `count`               | 返回结果数量（1-10，默认：5）                        |
| `country`             | 2 位字母的 ISO 国家/地区代码（例如 "US"、"DE"）       |
| `language`            | ISO 639-1 语言代码（例如 "en"、"de"、"fr"）          |
| `freshness`           | 时间筛选：`day`（24 小时）、`week`、`month` 或 `year` |
| `date_after`          | 仅返回在此日期之后发布的结果（YYYY-MM-DD）           |
| `date_before`         | 仅返回在此日期之前发布的结果（YYYY-MM-DD）           |
| `domain_filter`       | 域名允许列表/拒绝列表数组（最多 20 个）              |
| `max_tokens`          | 总内容预算（默认：25000，最大：1000000）             |
| `max_tokens_per_page` | 每页 token 上限（默认：2048）                        |

对于旧版 Sonar/OpenRouter 兼容路径：

- 接受 `query`、`count` 和 `freshness`
- 其中 `count` 仅用于兼容；返回结果仍然是一个带引用来源的综合答案，而不是 N 条结果的列表
- Search API 专用筛选项（如 `country`、`language`、`date_after`、
  `date_before`、`domain_filter`、`max_tokens` 和 `max_tokens_per_page`
  ）会返回明确错误

**示例：**

```javascript
// 按国家和语言搜索
await web_search({
  query: "renewable energy",
  country: "DE",
  language: "de",
});

// 最近结果（过去一周）
await web_search({
  query: "AI news",
  freshness: "week",
});

// 日期范围搜索
await web_search({
  query: "AI developments",
  date_after: "2024-01-01",
  date_before: "2024-06-30",
});

// 域名过滤（允许列表）
await web_search({
  query: "climate research",
  domain_filter: ["nature.com", "science.org", ".edu"],
});

// 域名过滤（拒绝列表 - 使用 - 前缀）
await web_search({
  query: "product reviews",
  domain_filter: ["-reddit.com", "-pinterest.com"],
});

// 更多内容提取
await web_search({
  query: "detailed AI research",
  max_tokens: 50000,
  max_tokens_per_page: 4096,
});
```

### 域名过滤规则

- 每个过滤器最多 20 个域名
- 同一次请求中不能同时混用允许列表和拒绝列表
- 拒绝列表条目使用 `-` 前缀（例如 `["-reddit.com"]`）

## 说明

- Perplexity Search API 返回结构化网页搜索结果（`title`、`url`、`snippet`）
- OpenRouter 或显式设置 `plugins.entries.perplexity.config.webSearch.baseUrl` / `model` 会将 Perplexity 切回 Sonar chat completions，以保持兼容性
- Sonar/OpenRouter 兼容性会返回一个带引用来源的综合答案，而不是结构化的结果行
- 默认情况下结果会缓存 15 分钟（可通过 `cacheTtlMinutes` 配置）

查看 [Web tools](/tools/web) 了解完整的 `web_search` 配置。
查看 [Perplexity Search API docs](https://docs.perplexity.ai/docs/search/quickstart) 了解更多详情。

## 相关内容

- [Perplexity search](/tools/perplexity-search)
- [Web search](/tools/web)
