---
summary: "Tavily 搜索和提取工具"
read_when:
  - 你想使用基于 Tavily 的网页搜索
  - 你需要 Tavily API 密钥
  - 你想将 Tavily 作为 web_search 提供方
  - 你想从 URL 中提取内容
title: "Tavily"
---

OpenClaw 可以通过两种方式使用 **Tavily**：

- 作为 `web_search` 提供方
- 作为显式插件工具：`tavily_search` 和 `tavily_extract`

Tavily 是一个面向 AI 应用的搜索 API，会返回为 LLM 消费优化的结构化结果。它支持可配置的搜索深度、主题过滤、域名过滤、AI 生成的答案摘要，以及从 URL 提取内容（包括 JavaScript 渲染页面）。

## 获取 API 密钥

1. 在 [tavily.com](https://tavily.com/) 创建 Tavily 账户。
2. 在控制台中生成 API 密钥。
3. 将其存储在配置中，或在 gateway 环境中设置 `TAVILY_API_KEY`。

## 配置 Tavily 搜索

```json5
{
  plugins: {
    entries: {
      tavily: {
        enabled: true,
        config: {
          webSearch: {
            apiKey: "tvly-...", // 如果已设置 TAVILY_API_KEY，则为可选项
            baseUrl: "https://api.tavily.com",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "tavily",
      },
    },
  },
}
```

说明：

- 在 onboarding 中选择 Tavily，或运行 `openclaw configure --section web`，会自动启用
  捆绑的 Tavily 插件。
- 将 Tavily 配置存放在 `plugins.entries.tavily.config.webSearch.*` 下。
- 使用 Tavily 的 `web_search` 支持 `query` 和 `count`（最多 20 条结果）。
- 对于 `search_depth`、`topic`、`include_answer`
  或域名过滤等 Tavily 特定控制，请使用 `tavily_search`。

## Tavily 插件工具

### `tavily_search`

当你想要 Tavily 特定的搜索控制而不是通用 `web_search` 时，请使用它。

| 参数              | 说明                                                                  |
| ----------------- | --------------------------------------------------------------------- |
| `query`           | 搜索查询字符串（保持在 400 个字符以内）                               |
| `search_depth`    | `basic`（默认，平衡）或 `advanced`（最高相关性，较慢）                |
| `topic`           | `general`（默认）、`news`（实时更新）或 `finance`                    |
| `max_results`     | 结果数量，1-20（默认：5）                                             |
| `include_answer`  | 包含 AI 生成的答案摘要（默认：false）                                 |
| `time_range`      | 按时效过滤：`day`、`week`、`month` 或 `year`                         |
| `include_domains` | 限制结果范围的域名数组                                               |
| `exclude_domains` | 从结果中排除的域名数组                                               |

**搜索深度：**

| 深度       | 速度   | 相关性   | 最适合                              |
| ---------- | ------ | -------- | ----------------------------------- |
| `basic`    | 更快   | 高       | 通用查询（默认）                    |
| `advanced` | 更慢   | 最高     | 精确查询、特定事实、研究            |

### `tavily_extract`

用于从一个或多个 URL 中提取干净内容。可处理
JavaScript 渲染页面，并支持面向查询的分块，以便进行定向
提取。

| 参数                | 说明                                                   |
| ------------------- | ------------------------------------------------------ |
| `urls`              | 要提取的 URL 数组（每次请求 1-20 个）                 |
| `query`             | 根据与此查询的相关性对提取的块进行重新排序            |
| `extract_depth`     | `basic`（默认，快速）或 `advanced`（适用于 JS 密集页面） |
| `chunks_per_source` | 每个 URL 的块数，1-5（需要 `query`）                  |
| `include_images`    | 在结果中包含图片 URL（默认：false）                    |

**提取深度：**

| 深度       | 何时使用                               |
| ---------- | -------------------------------------- |
| `basic`    | 简单页面 - 先尝试这个                  |
| `advanced` | JS 渲染的 SPA、动态内容、表格          |

提示：

- 每次请求最多 20 个 URL。将更大的列表分批拆分为多个调用。
- 使用 `query` + `chunks_per_source` 仅获取相关内容，而不是整页内容。
- 先尝试 `basic`；如果内容缺失或不完整，再回退到 `advanced`。

## 选择合适的工具

| 需求                                 | 工具             |
| ------------------------------------ | ---------------- |
| 快速网页搜索，无特殊选项             | `web_search`     |
| 带深度、主题、AI 答案的搜索           | `tavily_search`  |
| 从特定 URL 提取内容                  | `tavily_extract` |

## 相关内容

- [Web Search 概览](/tools/web) -- 所有提供方和自动检测
- [Firecrawl](/tools/firecrawl) -- 带内容提取的搜索 + 抓取
- [Exa Search](/tools/exa-search) -- 带内容提取的神经搜索
