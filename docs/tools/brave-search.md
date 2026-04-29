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

- OpenClaw 使用 Brave **Search** 套餐。如果你有旧版订阅（例如最初的 Free 套餐，每月 2,000 次查询），它仍然有效，但不包含 LLM Context 或更高的速率限制等新功能。
- 每个 Brave 套餐都包含每月 **\$5 的免费额度**（按月重置）。Search 套餐的价格为每 1,000 次请求 \$5，因此这笔额度可覆盖每月 1,000 次查询。请在 Brave 控制台中设置你的使用上限，以避免意外收费。有关当前套餐信息，请参见 [Brave API portal](https://brave.com/search/api/)。
- Search 套餐包含 LLM Context 端点和 AI 推理权利。将结果存储用于训练或微调模型，需要具备明确存储权利的套餐。请参见 Brave [Terms of Service](https://api-dashboard.search.brave.com/terms-of-service)。
- `llm-context` 模式返回的是带依据的来源条目，而不是常规网页搜索摘要的结构。
- `llm-context` 模式不支持 `ui_lang`、`freshness`、`date_after` 或 `date_before`。
- `ui_lang` 必须包含地区子标签，例如 `en-US`。
- 结果默认缓存 15 分钟（可通过 `cacheTtlMinutes` 配置）。 

## 相关内容

- [Web Search overview](/tools/web) -- 所有提供方和自动检测
- [Perplexity Search](/tools/perplexity-search) -- 带域名过滤的结构化结果
- [Exa Search](/tools/exa-search) -- 带内容提取的神经搜索
