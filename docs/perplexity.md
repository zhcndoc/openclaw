---
summary: "Perplexity 搜索 API 及 Sonar/OpenRouter 对 web_search 的兼容性"
read_when:
  - 您想使用 Perplexity 搜索进行网页搜索
  - 您需要设置 PERPLEXITY_API_KEY 或 OPENROUTER_API_KEY
title: "Perplexity 搜索"
---

# Perplexity 搜索 API

OpenClaw 支持 Perplexity 搜索 API，作为 `web_search` 提供者。  
它返回包含 `title`（标题）、`url`（链接）和 `snippet`（摘要）字段的结构化结果。

为了兼容，OpenClaw 也支持传统的 Perplexity Sonar/OpenRouter 配置。  
如果您使用 `OPENROUTER_API_KEY`，或者在 `tools.web.search.perplexity.apiKey` 中使用以 `sk-or-...` 开头的密钥，或设置了 `tools.web.search.perplexity.baseUrl` / `model`，则该提供者会切换到聊天补全路径，返回带有引用的 AI 合成答案，而非结构化的搜索 API 结果。

## 获取 Perplexity API 密钥

1. 在 [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) 创建一个 Perplexity 账号
2. 在控制面板生成一个 API 密钥
3. 将密钥存储在配置文件中，或在网关环境变量中设置 `PERPLEXITY_API_KEY`。

## OpenRouter 兼容性

如果您之前已经使用 OpenRouter 来调用 Perplexity Sonar，保持 `provider: "perplexity"`，并在网关环境变量中设置 `OPENROUTER_API_KEY`，或者在 `tools.web.search.perplexity.apiKey` 中存储一个以 `sk-or-...` 开头的密钥。

可选的传统配置项包括：

- `tools.web.search.perplexity.baseUrl`
- `tools.web.search.perplexity.model`

## 配置示例

### 原生 Perplexity 搜索 API

```json5
{
  tools: {
    web: {
      search: {
        provider: "perplexity",
        perplexity: {
          apiKey: "pplx-...",
        },
      },
    },
  },
}
```

### OpenRouter / Sonar 兼容配置

```json5
{
  tools: {
    web: {
      search: {
        provider: "perplexity",
        perplexity: {
          apiKey: "<openrouter-api-key>",
          baseUrl: "https://openrouter.ai/api/v1",
          model: "perplexity/sonar-pro",
        },
      },
    },
  },
}
```

## 在哪里设置密钥

**通过配置：**运行 `openclaw configure --section web`。它会将密钥存储在  
`~/.openclaw/openclaw.json` 的 `tools.web.search.perplexity.apiKey` 字段。该字段也接受 SecretRef 对象。

**通过环境变量：**在网关进程环境中设置 `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`。  
对于网关安装，将其放入 `~/.openclaw/.env`（或您的服务环境）。详见 [环境变量](/help/faq#how-does-openclaw-load-environment-variables)。

如果配置了 `provider: "perplexity"` 并且 Perplexity 密钥 SecretRef 未解析且无环境变量后备，启动/重载将快速失败。

## 工具参数

这些参数适用于原生 Perplexity 搜索 API 路径。

| 参数                  | 描述                                                   |
| --------------------- | ------------------------------------------------------ |
| `query`               | 搜索查询（必填）                                       |
| `count`               | 返回结果数量（1-10，默认：5）                          |
| `country`             | 两字母 ISO 国家代码（如 "US", "DE"）                   |
| `language`            | ISO 639-1 语言代码（如 "en", "de", "fr"）              |
| `freshness`           | 时间筛选：`day`（24小时）、`week`、`month`、`year`    |
| `date_after`          | 只返回该日期之后发布的结果（格式 YYYY-MM-DD）          |
| `date_before`         | 只返回该日期之前发布的结果（格式 YYYY-MM-DD）          |
| `domain_filter`       | 域名允许列表/拒绝列表数组（最多 20 个）                 |
| `max_tokens`          | 内容总令牌预算（默认：25000，最大：1000000）            |
| `max_tokens_per_page` | 每页令牌限制（默认：2048）                              |

对于传统 Sonar/OpenRouter 兼容路径，仅支持 `query` 和 `freshness`。  
搜索 API 独有的过滤参数如 `country`、`language`、`date_after`、`date_before`、`domain_filter`、`max_tokens` 和 `max_tokens_per_page` 会返回明确的错误。

**示例：**

```javascript
// 针对特定国家和语言的搜索
await web_search({
  query: "renewable energy",
  country: "DE",
  language: "de",
});

// 近期结果（过去一周）
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

// 域名过滤（拒绝列表，前缀加 -）
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

- 每次请求最多允许 20 个域名
- 不可在同一次请求中混合使用允许列表和拒绝列表
- 拒绝列表条目前加 `-` 前缀（例如 `["-reddit.com"]`）

## 注意事项

- Perplexity 搜索 API 返回结构化网页搜索结果（`title`、`url`、`snippet`）
- 使用 OpenRouter 或显式设置 `baseUrl` / `model` 会将 Perplexity 切换回 Sonar 聊天补全以保证兼容
- 结果默认缓存 15 分钟（可通过 `cacheTtlMinutes` 配置）

详见 [Web 工具](/tools/web) 获取完整的 web_search 配置说明。  
更多详情参见 [Perplexity 搜索 API 文档](https://docs.perplexity.ai/docs/search/quickstart) 。
