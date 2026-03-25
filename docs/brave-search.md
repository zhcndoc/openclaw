---
summary: "Brave 搜索 API 用于 web_search 的设置"
read_when:
  - 当你想要使用 Brave Search 进行 web_search 时
  - 当你需要 BRAVE_API_KEY 或套餐详情时
title: "Brave 搜索（旧版路径）"
---

# Brave 搜索 API

OpenClaw 支持 Brave 搜索作为 `web_search` 的网络搜索提供者。

## 获取 API 密钥

1. 在 [https://brave.com/search/api/](https://brave.com/search/api/) 创建一个 Brave 搜索 API 账号
2. 在控制面板中，选择 **Search** 计划并生成 API 密钥。
3. 将密钥存储在配置文件中（推荐）或设置到 Gateway 环境变量 `BRAVE_API_KEY`。

## 配置示例

```json5
{
  plugins: {
    entries: {
      brave: {
        config: {
          webSearch: {
            apiKey: "BRAVE_API_KEY_HERE",
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

Provider-specific Brave 搜索设置现在位于 `plugins.entries.brave.config.webSearch.*` 下。
旧版 `tools.web.search.apiKey` 仍通过兼容层加载，但它已不再是规范的配置路径。

## 工具参数

| 参数         | 说明                                                             |
| ------------ | ---------------------------------------------------------------- |
| `query`      | 搜索查询（必填）                                                 |
| `count`      | 返回结果数量（1-10，默认：5）                                    |
| `country`    | 2 位 ISO 国家代码（例如 "US"、"DE"）                            |
| `language`   | 搜索结果的 ISO 639-1 语言代码（例如 "en"、"de"、"fr"）         |
| `ui_lang`    | UI 元素的 ISO 语言代码                                            |
| `freshness`  | 时间过滤：`day`（24小时）、`week`、`month` 或 `year`            |
| `date_after` | 仅返回该日期之后发布的结果（YYYY-MM-DD）                         |
| `date_before`| 仅返回该日期之前发布的结果（YYYY-MM-DD）                         |

**示例：**

```javascript
// 指定国家和语言的搜索
await web_search({
  query: "renewable energy",
  country: "DE",
  language: "de",
});

// 最近一周的结果
await web_search({
  query: "AI news",
  freshness: "week",
});

// 指定日期范围搜索
await web_search({
  query: "AI developments",
  date_after: "2024-01-01",
  date_before: "2024-06-30",
});
```

## 注意事项

- OpenClaw 使用 Brave **Search** 计划。如果你有旧版订阅（例如原始的免费计划，每月 2,000 次查询），它仍然有效，但不包括如 LLM 上下文或更高请求限制等新功能。
- 每个 Brave 计划包含 **每月 5 美元的免费额度**（可续订）。Search 计划费用是每 1,000 次请求 5 美元，因此该额度覆盖每月 1,000 次查询。在 Brave 控制面板中设置使用限制以避免意外收费。当前计划详情请参见 [Brave API 门户](https://brave.com/search/api/)。
- Search 计划包含 LLM 上下文端点和 AI 推理权限。存储结果以训练或调整模型需要拥有明确存储权限的计划。详见 Brave [服务条款](https://api-dashboard.search.brave.com/terms-of-service)。
- 默认结果缓存时间为 15 分钟（通过 `cacheTtlMinutes` 可配置）。

完整的 web_search 配置请参见 [Web 工具](/tools/web)。
