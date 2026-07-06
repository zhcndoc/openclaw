---
summary: "Perplexity 搜索 API 以及用于 web_search 的 Sonar/OpenRouter 兼容性"
read_when:
  - 你想使用 Perplexity Search 进行网页搜索
  - 你需要配置 PERPLEXITY_API_KEY 或 OPENROUTER_API_KEY
title: "Perplexity 搜索"
---

OpenClaw 支持 Perplexity Search API 作为 `web_search` 提供方。它会返回包含 `title`、`url` 和 `snippet` 字段的结构化结果。

为了兼容性，OpenClaw 也支持旧版 Perplexity Sonar/OpenRouter 配置。如果你使用 `OPENROUTER_API_KEY`、在 `plugins.entries.perplexity.config.webSearch.apiKey` 中使用 `sk-or-...` 密钥，或者设置了 `plugins.entries.perplexity.config.webSearch.baseUrl` / `model`，该提供方将切换到 chat-completions 路径，并返回带有引用的 AI 生成答案，而不是结构化的 Search API 结果。

## 安装插件

安装官方插件，然后重启 Gateway：

```bash
openclaw plugins install @openclaw/perplexity-plugin
openclaw gateway restart
```

## 获取 Perplexity API 密钥

1. 在 [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) 创建 Perplexity 账户。
2. 在仪表板中生成 API 密钥。
3. 将密钥存储在配置中，或在 Gateway 环境中设置 `PERPLEXITY_API_KEY`。

## OpenRouter 兼容性

如果你之前一直在使用 OpenRouter 配合 Perplexity Sonar，请保留 `provider: "perplexity"`，并在 Gateway 环境中设置 `OPENROUTER_API_KEY`，或者在 `plugins.entries.perplexity.config.webSearch.apiKey` 中存储一个 `sk-or-...` 密钥。

可选的兼容性控制项：

- `plugins.entries.perplexity.config.webSearch.baseUrl`
- `plugins.entries.perplexity.config.webSearch.model`

## 配置示例

### 原生 Perplexity 搜索 API

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

**通过配置：** 运行 `openclaw configure --section web`。它会将密钥存储在 `~/.openclaw/openclaw.json` 中的 `plugins.entries.perplexity.config.webSearch.apiKey` 下。该字段也接受 SecretRef 对象。

**通过环境变量：** 在 Gateway 进程环境中设置 `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`。对于 gateway 安装，请将其放入 `~/.openclaw/.env`（或你的服务环境）中。参见 [Env vars](/help/faq#env-vars-and-env-loading)。

如果已配置 `provider: "perplexity"`，而 Perplexity 的 key SecretRef 未解析且没有环境变量回退，启动/重载将会快速失败。

## 工具参数

这些参数适用于原生 Perplexity Search API 路径。

<ParamField path="query" type="string" required>
搜索查询。
</ParamField>

<ParamField path="count" type="number" default="5">
返回结果数量（1-10）。
</ParamField>

<ParamField path="country" type="string">
2 位 ISO 国家代码（例如 `US`、`DE`）。
</ParamField>

<ParamField path="language" type="string">
ISO 639-1 语言代码（例如 `en`、`de`、`fr`）。
</ParamField>

<ParamField path="freshness" type="'day' | 'week' | 'month' | 'year'">
时间筛选 - `day` 表示 24 小时。
</ParamField>

<ParamField path="date_after" type="string">
仅返回在此日期之后发布的结果（`YYYY-MM-DD`）。
</ParamField>

<ParamField path="date_before" type="string">
仅返回在此日期之前发布的结果（`YYYY-MM-DD`）。
</ParamField>

<ParamField path="domain_filter" type="string[]">
域名白名单/黑名单数组（最多 20 个）。
</ParamField>

<ParamField path="max_tokens" type="number" default="25000">
总内容预算（最大 1000000）。
</ParamField>

<ParamField path="max_tokens_per_page" type="number" default="2048">
每页 token 限制。
</ParamField>

对于旧版 Sonar/OpenRouter 兼容路径：

- `query`、`count` 和 `freshness` 可接受。
- `count` 仅用于兼容；响应仍然是一个带引用的合成答案，而不是 N 条结果列表。
- 仅搜索 API 的筛选项（`country`、`language`、`date_after`、`date_before`、`domain_filter`、`max_tokens`、`max_tokens_per_page`）会返回明确错误。

**示例：**

```javascript
// 按国家和语言进行搜索
await web_search({
  query: "renewable energy",
  country: "DE",
  language: "de",
});

// 获取最近结果（过去一周）
await web_search({
  query: "AI news",
  freshness: "week",
});

// 按日期范围搜索
await web_search({
  query: "AI developments",
  date_after: "2024-01-01",
  date_before: "2024-06-30",
});

// 域名过滤（白名单）
await web_search({
  query: "climate research",
  domain_filter: ["nature.com", "science.org", ".edu"],
});

// 域名过滤（黑名单 - 以 - 前缀开头）
await web_search({
  query: "product reviews",
  domain_filter: ["-reddit.com", "-pinterest.com"],
});

// 提取更多内容
await web_search({
  query: "detailed AI research",
  max_tokens: 50000,
  max_tokens_per_page: 4096,
});
```

### 域名过滤规则

- 每个过滤器最多 20 个域名。
- 不能在同一次请求中混合白名单和黑名单条目。
- 对黑名单条目使用 `-` 前缀（例如：`["-reddit.com"]`）。

## 说明

- Perplexity Search API 返回结构化的网页搜索结果（`title`、`url`、`snippet`）。
- OpenRouter，或显式设置 `plugins.entries.perplexity.config.webSearch.baseUrl` / `model`，会将 Perplexity 切回 Sonar 聊天补全，以保证兼容性。
- Sonar/OpenRouter 兼容模式会返回一个带引用的综合答案，而不是结构化的结果行。
- 结果默认缓存 15 分钟（可通过 `cacheTtlMinutes` 配置）。

## 相关内容

<CardGroup cols={2}>
  <Card title="Web 搜索概览" href="/tools/web" icon="globe">
    所有提供方和自动检测规则。
  </Card>
  <Card title="Brave 搜索" href="/tools/brave-search" icon="shield">
    具有国家和语言过滤器的结构化结果。
  </Card>
  <Card title="Exa 搜索" href="/tools/exa-search" icon="magnifying-glass">
    带内容提取的神经搜索。
  </Card>
  <Card title="Perplexity 搜索 API 文档" href="https://docs.perplexity.ai/docs/search/quickstart" icon="arrow-up-right-from-square">
    Perplexity Search API 官方快速入门和参考文档。
  </Card>
</CardGroup>
