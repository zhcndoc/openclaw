---
summary: "Brave Search API 的 web_search 配置"
read_when:
  - "你想将 Brave Search 用于 web_search"
  - "你需要 BRAVE_API_KEY 或套餐详情"
title: "Brave 搜索"
---

OpenClaw 支持 Brave Search API 作为 `web_search` 提供方。

## <a id="get-an-api-key"></a> 获取 API 密钥

1. 在 [https://brave.com/search/api/](https://brave.com/search/api/) 创建一个 Brave Search API 账户
2. 在控制台中，选择 **Search** 套餐并生成一个 API 密钥。
3. 将密钥存储到配置中，或在 Gateway 环境中设置 `BRAVE_API_KEY`。

## <a id="config-example"></a> 配置示例

```json5
{
  plugins: {
    entries: {
      brave: {
        config: {
          webSearch: {
            apiKey: "BRAVE_API_KEY_HERE",
            mode: "web", // or "llm-context"
            baseUrl: "https://api.search.brave.com", // optional proxy/base URL override
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

特定于提供商的 Brave 搜索设置位于 `plugins.entries.brave.config.webSearch.*` 下；这是要使用的配置路径。

`webSearch.mode` 控制 Brave 的传输方式：

- `web`（默认）：正常 Brave Web 搜索，包含标题、URL 和片段
- `llm-context`：Brave LLM Context API，返回预先提取的文本片段和来源，用于提供依据

`webSearch.baseUrl` 可以将 Brave 请求指向受信任的 Brave- 兼容代理或网关。 OpenClaw 将 `/res/v1/web/search` 或 `/res/v1/llm/context` 附加到配置的基础 URL 并将基础 URL 保留在缓存密钥中。公共端点必须使用`https://`； `http://` 仅适用于受信任的环回或专用网络代理主机。

## <a id="tool-parameters"></a> 工具参数

<ParamField path="query" type="string" required>
搜索查询。
</ParamField>

<ParamField path="count" type="number" default="5">
返回结果数量（1–10）。
</ParamField>

<ParamField path="country" type="string">
2 个字母 ISO 国家/地区代码（e.g. `US`、`DE`）。
</ParamField>

<ParamField path="language" type="string">
ISO 639-1 搜索结果的语言代码（e.g. `en`、`de`、`fr`）。
</ParamField>

<ParamField path="search_lang" type="string">
Brave 搜索语言代码（e.g. `en`、`en-gb`、`zh-hans`）。
</ParamField>

<ParamField path="ui_lang" type="string">
UI 元素的 ISO 语言代码。
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
```

## <a id="notes"></a> 说明

- Results 公开来自 Brave 的 ISO 发布元数据的 `published`：Web 模式下的 `page_age` 以及 `llm-context` 模式下匹配源的 ISO 时间戳或日期。相对年龄和获取时间戳不是发布日期。无偏移时间戳保持无偏移； OpenClaw 没有发明时区。当新鲜度很重要时，请验证来源日期。

- OpenClaw 使用 Brave **Search** 计划。如果您有旧版订阅（e.g. 原始免费套餐，包含 2,000 个 queries/month），它仍然有效，但不包括 LLM Context 等新功能或更高的速率限制。
- Each Brave 计划包括 **\5 美元/月的免费信用额度**（续订）。搜索计划的费用为每 1,000 个请求 5 美元，因此信用额度涵盖 1,000 queries/month. 在 Brave 仪表板中设置您的使用限制，以避免意外费用。有关当前计划，请参阅 [Brave API 门户 ](https://brave.com/search/api/)。
- 搜索计划包括 LLM 上下文端点和 AI 推理权限。存储结果以训练或调整模型需要具有明确存储权限的计划。请参阅 Brave [ Service](https://api-dashboard.search.brave.com/terms-of-service) 的条款。
- `llm-context` 模式返回有依据的来源条目，而不是普通 web-search 摘要的结构。
- `llm-context` 模式支持 `freshness` 和有界 `date_after` + `date_before` 范围。不支持`ui_lang`；没有 `date_after` 的 `date_before` 会被拒绝，因为 Brave 需要自定义新鲜度范围以包括开始日期和结束日期。
- `ui_lang` 必须包含区域子标签，例如 `en-US`。
- 结果默认缓存 15 分钟（可通过 `cacheTtlMinutes` 配置）。
- `tools.web.search.timeoutSeconds` 涵盖端点验证，包括 DNS、HTTP 请求以及两种 Brave 模式下的响应读取。
- 自定义的 `webSearch.baseUrl` 值会包含在 Brave 缓存标识中，因此不同代理的响应不会发生冲突。
- 启用 `brave.http` 诊断标志以在故障排除时记录 Brave 请求 URLs/query 参数、响应 status/timing 和搜索缓存 hit/miss/write 事件。该标志从不记录 API 密钥或响应正文，但搜索查询可能很敏感。

## <a id="related"></a> 相关内容

- [网页搜索概述](/tools/web) -- 所有提供商和自动检测
- [Perplexity Search](/tools/perplexity-search) -- 带域过滤的结构化结果
- [Exa Search](/tools/exa-search) -- 带有内容提取的神经搜索
