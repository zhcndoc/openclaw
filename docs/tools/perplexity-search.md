---
summary: "Perplexity 搜索 web_search 的 API 和 Sonar/OpenRouter 兼容性"
read_when:
  - "你想使用 Perplexity Search 进行网页搜索"
  - "你需要配置 PERPLEXITY_API_KEY 或 OPENROUTER_API_KEY"
title: "Perplexity 搜索"
---

OpenClaw 支持 Perplexity Search API 作为 `web_search` 提供方。它会返回包含 `title`、`url` 和 `snippet` 字段的结构化结果。

为了兼容性，OpenClaw 还支持旧版 Perplexity Sonar/OpenRouter 设置。如果您使用 `OPENROUTER_API_KEY`、`plugins.entries.perplexity.config.webSearch.apiKey` 中的 `sk-or-...` 密钥，或设置 `plugins.entries.perplexity.config.webSearch.baseUrl` / `model`，则提供程序会切换到聊天完成路径并返回带有引文的 AI- 综合答案，而不是结构化搜索 API 结果。

## <a id="install-plugin"></a> 安装插件

安装官方插件：

```bash
openclaw plugins install @openclaw/perplexity-plugin
```

安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

## <a id="getting-a-perplexity-api-key"></a> 获取 Perplexity API 密钥

1. 在[perplexity.ai/settings/api](https://www.perplexity.ai/settings/api).创建一个Perplexity帐户
2. 在仪表板中生成 API 密钥。
3. 将密钥存储在配置中，或在 Gateway 环境中设置 `PERPLEXITY_API_KEY`。

## <a id="openrouter-compatibility"></a> OpenRouter 兼容性

如果您已将 OpenRouter 用于 Perplexity 声纳，请保留 `provider: "perplexity"` 并在网关环境中设置 `OPENROUTER_API_KEY`，或在 `plugins.entries.perplexity.config.webSearch.apiKey` 中存储 `sk-or-...` 密钥。

可选的兼容性控制项：

- `plugins.entries.perplexity.config.webSearch.baseUrl`
- `plugins.entries.perplexity.config.webSearch.model`

## <a id="config-examples"></a> 配置示例

### <a id="native-perplexity-search-api"></a> 原生 Perplexity 搜索 API

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

### <a id="openrouter-%2F-sonar-compatibility"></a><a id="openrouter-/-sonar-compatibility"></a> OpenRouter / Sonar 兼容性

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

## <a id="where-to-set-the-key"></a> 在哪里设置密钥

**通过配置：** 运行 `openclaw configure --section web`。它会将密钥存储在 `~/.openclaw/openclaw.json` 中的 `plugins.entries.perplexity.config.webSearch.apiKey` 下。该字段也接受 SecretRef 对象。

**通过环境变量：** 在 Gateway 进程环境中设置 `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`。对于 gateway 安装，请将其放入 `~/.openclaw/.env`（或你的服务环境）中。参见 [Env vars](/help/faq#env-vars-and-env-loading)。

如果配置了 `provider: "perplexity"` 并且 Perplexity 密钥 SecretRef 未解析且没有 env 回退，则 startup/reload 会快速失败。

## <a id="tool-parameters"></a> 工具参数

这些参数适用于原生 Perplexity Search API 路径。

<ParamField path="query" type="string" required>
搜索查询。
</ParamField>

<ParamField path="count" type="number" default="5">
返回结果数量（1-10）。
</ParamField>

<ParamField path="country" type="string">
2 个字母 ISO 国家/地区代码（e.g. `US`、`DE`）。
</ParamField>

<ParamField path="language" type="string">
ISO 639-1 语言代码（e.g. `en`、`de`、`fr`）。
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
域 allowlist/denylist 数组（最多 20 个）。
</ParamField>

<ParamField path="max_tokens" type="number" default="25000">
总内容预算（最大 1000000）。
</ParamField>

<ParamField path="max_tokens_per_page" type="number" default="2048">
每页 token 限制。
</ParamField>

对于旧版 Sonar/OpenRouter 兼容路径：

- `query`、`count` 和 `freshness` 可接受。
- `count` 仅兼容；回复仍然是带有引文的综合答案，而不是 N- 结果列表。
- Search API-仅过滤器（`country`、`language`、`date_after`、`date_before`、`domain_filter`、`max_tokens`、`max_tokens_per_page`）返回显式错误。

**示例：**

```javascript
// Country and language-specific search
await web_search({
  query: "renewable energy",
  country: "DE",
  language: "de",
});

// Recent results (past week)
await web_search({
  query: "AI news",
  freshness: "week",
});

// Date range search
await web_search({
  query: "AI developments",
  date_after: "2024-01-01",
  date_before: "2024-06-30",
});

// Domain filtering (allowlist)
await web_search({
  query: "climate research",
  domain_filter: ["nature.com", "science.org", ".edu"],
});

// Domain filtering (denylist - prefix with -)
await web_search({
  query: "product reviews",
  domain_filter: ["-reddit.com", "-pinterest.com"],
});

// More content extraction
await web_search({
  query: "detailed AI research",
  max_tokens: 50000,
  max_tokens_per_page: 4096,
});
```

### <a id="domain-filter-rules"></a> 域名过滤规则

- 每个过滤器最多 20 个域名。
- 不能在同一次请求中混合白名单和黑名单条目。
- 对拒绝列表条目使用 `-` 前缀（e.g.、`["-reddit.com"]`）。

## <a id="notes"></a> 说明

- Perplexity Search API 返回结构化的网页搜索结果（`title`、`url`、`snippet`）。
- OpenRouter，或显式设置 `plugins.entries.perplexity.config.webSearch.baseUrl` / `model`，会将 Perplexity 切回 Sonar 聊天补全，以保证兼容性。
- Sonar/OpenRouter 兼容模式会返回一个带引用的综合答案，而不是结构化的结果行。
- 结果默认缓存 15 分钟（可通过 `cacheTtlMinutes` 配置）。

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="网络搜索概述" href="/tools/web" icon="globe">
    所有提供方和自动检测规则。
  </Card>
  <Card title="Brave 搜索" href="/tools/brave-search" icon="shield">
    具有国家和语言过滤器的结构化结果。
  </Card>
  <Card title="Exa 搜索" href="/tools/exa-search" icon="magnifying-glass">
    带内容提取的神经搜索。
  </Card>
  <Card title="Perplexity 提供商" href="/providers/perplexity-provider" icon="server">
    Perplexity Web 搜索的提供程序设置、身份验证和配置密钥。
  </Card>
  <Card title="Perplexity 搜索 API 文档" href="https://docs.perplexity.ai/docs/search/quickstart" icon="arrow-up-right-from-square">
    Perplexity Search API 官方快速入门和参考文档。
  </Card>
</CardGroup>
