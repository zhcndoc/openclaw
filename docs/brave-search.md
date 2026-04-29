---
summary: "Brave Search API 的 web_search 配置"
read_when:
  - 你想将 Brave Search 用于 web_search
  - 你需要 BRAVE_API_KEY 或套餐详情
title: "Brave search（旧路径）"
---

# Brave Search API

OpenClaw 支持将 Brave Search API 作为 `web_search` 提供方。

## 获取 API 密钥

1. 在 [https://brave.com/search/api/](https://brave.com/search/api/) 创建一个 Brave Search API 账户
2. 在控制台中，选择 **Search** 套餐并生成 API 密钥。
3. 将密钥存储在配置中，或在 Gateway 环境中设置 `BRAVE_API_KEY`。

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

特定于提供方的 Brave 搜索设置现在位于 `plugins.entries.brave.config.webSearch.*` 下。
旧的 `tools.web.search.apiKey` 仍会通过兼容性适配层加载，但它已不再是规范的配置路径。

`webSearch.mode` 控制 Brave 的传输方式：

- `web`（默认）：常规 Brave 网页搜索，返回标题、URL 和摘要
- `llm-context`：Brave LLM Context API，返回预提取的文本块和用于 grounding 的来源

## 工具参数

| 参数          | 描述                                                                |
| ------------- | ------------------------------------------------------------------- |
| `query`       | 搜索查询（必填）                                                    |
| `count`       | 返回结果数量（1-10，默认：5）                                       |
| `country`     | 2 字母 ISO 国家/地区代码（例如 "US"、"DE"）                         |
| `language`    | 搜索结果的 ISO 639-1 语言代码（例如 "en"、"de"、"fr"）              |
| `search_lang` | Brave 搜索语言代码（例如 `en`、`en-gb`、`zh-hans`）                |
| `ui_lang`     | UI 元素的 ISO 语言代码                                             |
| `freshness`   | 时间过滤：`day`（24 小时）、`week`、`month` 或 `year`              |
| `date_after`  | 仅返回在此日期之后发布的结果（YYYY-MM-DD）                          |
| `date_before` | 仅返回在此日期之前发布的结果（YYYY-MM-DD）                          |

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

// 按日期范围搜索
await web_search({
  query: "AI developments",
  date_after: "2024-01-01",
  date_before: "2024-06-30",
});
```

## 注意事项

- OpenClaw 使用 Brave **Search** 套餐。如果你有旧版订阅（例如最初的免费套餐，每月 2,000 次查询），它仍然有效，但不包含诸如 LLM Context 或更高速率限制等新功能。
- 每个 Brave 套餐都包含每月 **\$5 的免费额度**（会续期）。Search 套餐每 1,000 次请求收费 \$5，因此这笔额度可覆盖每月 1,000 次查询。请在 Brave 控制台中设置使用上限，以避免意外收费。有关当前套餐，请参见 [Brave API portal](https://brave.com/search/api/)。
- Search 套餐包含 LLM Context 端点和 AI 推理权利。若要将结果存储用于训练或微调模型，需要具备明确存储权利的套餐。请参见 Brave [服务条款](https://api-dashboard.search.brave.com/terms-of-service)。
- `llm-context` 模式返回的是带来源依据的条目，而不是普通网页搜索摘要的结构。
- `llm-context` 模式不支持 `ui_lang`、`freshness`、`date_after` 或 `date_before`。
- `ui_lang` 必须包含区域子标签，例如 `en-US`。
- 结果默认缓存 15 分钟（可通过 `cacheTtlMinutes` 配置）。

有关完整的 web_search 配置，请参见 [Web tools](/tools/web)。

## 相关内容

- [Brave search](/tools/brave-search)
