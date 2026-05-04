---
summary: "Brave Search API 的 web_search 配置"
read_when:
  - 你想将 Brave Search 用于 web_search
  - 你需要 BRAVE_API_KEY 或套餐详情
title: "Brave 搜索"
---

# Brave Search API

OpenClaw 支持将 Brave Search API 作为 `web_search` 提供方。

## 获取 API 密钥

1. 在 [https://brave.com/search/api/](https://brave.com/search/api/) 创建一个 Brave Search API 账户
2. 在控制台中，选择 **Search** 套餐并生成一个 API 密钥。
3. 将密钥存储到配置中，或在 Gateway 环境中设置 `BRAVE_API_KEY`。

## 配置示例

```json5
{
  plugins: {
    entries: {
      brave: {
        config: {
          webSearch: {
            apiKey: "BRAVE_API_KEY_HERE",
            mode: "web", // 或 "llm-context"
            baseUrl: "https://api.search.brave.com", // 可选的代理/基础 URL 覆盖
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "brave",
        maxResults: 5,
        timeoutSeconds: 30,
      },
    },
  },
}
```

Brave 搜索的提供方特定设置现在位于 `plugins.entries.brave.config.webSearch.*` 下。
旧的 `tools.web.search.apiKey` 仍会通过兼容层加载，但它已不再是标准配置路径。

`webSearch.mode` 控制 Brave 的传输方式：

- `web`（默认）：常规 Brave 网页搜索，返回标题、URL 和摘要
- `llm-context`：Brave LLM Context API，返回预先提取的文本片段和来源，用于提供依据

`webSearch.baseUrl` 可以将 Brave 请求指向受信任的、兼容 Brave 的代理
或网关。OpenClaw 会在配置的 base URL 后附加 `/res/v1/web/search` 或 `/res/v1/llm/context`，
并将 base URL 保留在缓存键中。公共
端点必须使用 `https://`；`http://` 仅接受用于受信任的回环
或私有网络代理主机。

## 工具参数

<ParamField path="query" type="string" required>
搜索查询。
</ParamField>

<ParamField path="count" type="number" default="5">
返回结果数量（1–10）。
</ParamField>

<ParamField path="country" type="string">
两位 ISO 国家/地区代码（例如 `US`、`DE`）。
</ParamField>

<ParamField path="language" type="string">
搜索结果的 ISO 639-1 语言代码（例如 `en`、`de`、`fr`）。
</ParamField>

<ParamField path="search_lang" type="string">
Brave 搜索语言代码（例如 `en`、`en-gb`、`zh-hans`）。
</ParamField>

<ParamField path="ui_lang" type="string">
用于界面元素的 ISO 语言代码。
</ParamField>

<ParamField path="freshness" type="'day' | 'week' | 'month' | 'year'">
时间筛选器 — `day` 表示 24 小时。
</ParamField>

<ParamField path="date_after" type="string">
仅返回在此日期之后发布的结果（`YYYY-MM-DD`）。
</ParamField>

<ParamField path="date_before" type="string">
仅返回在此日期之前发布的结果（`YYYY-MM-DD`）。
</ParamField>

**示例：**

```javascript
// 按国家和语言进行搜索
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
```

## 注意事项

- OpenClaw 使用 Brave **Search** 套餐。如果你有旧版订阅（例如最初的免费套餐，每月 2,000 次查询），它仍然有效，但不包含诸如 LLM Context 或更高速率限制等新功能。
- 每个 Brave 套餐都包含 **每月 \$5 免费额度**（可续期）。Search 套餐每 1,000 次请求收费 \$5，因此这笔额度可覆盖每月 1,000 次查询。请在 Brave 仪表板中设置你的使用上限，以避免意外收费。有关当前套餐，请参阅 [Brave API portal](https://brave.com/search/api/)。
- Search 套餐包括 LLM Context 端点和 AI 推理权利。将结果存储用于训练或微调模型，需要具有明确存储权利的套餐。请参阅 Brave [Terms of Service](https://api-dashboard.search.brave.com/terms-of-service)。
- `llm-context` 模式返回有依据的来源条目，而不是普通 web-search 摘要的结构。
- `llm-context` 模式支持 `freshness` 和受限的 `date_after` + `date_before` 范围。它不支持 `ui_lang`；如果没有 `date_after`，`date_before` 会被拒绝，因为 Brave 要求自定义时间范围同时包含开始和结束日期。
- `ui_lang` 必须包含区域子标签，例如 `en-US`。
- 结果默认缓存 15 分钟（可通过 `cacheTtlMinutes` 配置）。
- 自定义的 `webSearch.baseUrl` 值会包含在 Brave 缓存标识中，因此
  不同代理的响应不会发生冲突。
- 启用 `brave.http` diagnostics 标志，可在排查问题时记录 Brave 请求 URL/查询参数、响应状态/耗时，以及搜索缓存的命中/未命中/写入事件。该标志绝不会记录 API 密钥或响应正文，但搜索查询本身可能是敏感信息。

## 相关内容

- [Web Search overview](/tools/web) -- 所有提供方和自动检测
- [Perplexity Search](/tools/perplexity-search) -- 带域名过滤的结构化结果
- [Exa Search](/tools/exa-search) -- 带内容提取的神经搜索
