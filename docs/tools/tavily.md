---
summary: "Tavily 搜索和提取工具"
read_when:
  - 你想使用 Tavily 支持的网页搜索
  - 你需要 Tavily API 密钥
  - 你想将 Tavily 作为 web_search 提供方
  - 你想从 URL 中提取内容
title: "Tavily"
---

[Tavily](https://tavily.com) 是一个专为 AI 应用设计的搜索 API。OpenClaw 通过两种方式暴露它：

- 作为通用搜索工具的 `web_search` 提供方
- 作为显式插件工具：`tavily_search` 和 `tavily_extract`

Tavily 返回为 LLM 消费优化的结构化结果，支持可配置的搜索深度、主题过滤、域名过滤、AI 生成的答案摘要，以及从 URL 中提取内容（包括 JavaScript 渲染的页面）。

| Property      | Value                               |
| ------------- | ----------------------------------- |
| Plugin id     | `tavily`                            |
| Auth          | `TAVILY_API_KEY` or config `apiKey` |
| Base URL      | `https://api.tavily.com` (default)  |
| Bundled tools | `tavily_search`, `tavily_extract`   |

## Getting started

<Steps>
  <Step title="获取 API 密钥">
    在 [tavily.com](https://tavily.com) 创建 Tavily 账号，然后在控制面板中生成 API 密钥。
  </Step>
  <Step title="配置插件和提供方">
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
  </Step>
  <Step title="验证搜索运行">
    从任意 agent 触发一次 `web_search`，或直接调用 `tavily_search`。
  </Step>
</Steps>

<Tip>
在引导流程中选择 Tavily，或运行 `openclaw configure --section web`，即可自动启用内置的 Tavily 插件。
</Tip>

## 工具参考

### `tavily_search`

当你需要 Tavily 特定的搜索控制，而不是通用的 `web_search` 时使用它。

| Parameter         | Type         | Constraints / default                  | Description                                     |
| ----------------- | ------------ | -------------------------------------- | ----------------------------------------------- |
| `query`           | string       | required                               | 搜索查询字符串。请保持在 400 个字符以内。         |
| `search_depth`    | enum         | `basic` (default), `advanced`          | `advanced` 更慢，但相关性更高。                  |
| `topic`           | enum         | `general` (default), `news`, `finance` | 按主题类别过滤。                                 |
| `max_results`     | integer      | 1-20                                   | 结果数量。                                       |
| `include_answer`  | boolean      | default `false`                        | 包含 Tavily 生成的 AI 答案摘要。                 |
| `time_range`       | enum         | `day`, `week`, `month`, `year`         | 按时效性过滤结果。                               |
| `include_domains` | string array | (none)                                 | 仅包含这些域名的结果。                          |
| `exclude_domains` | string array | (none)                                 | 排除这些域名的结果。                            |

搜索深度取舍：

| Depth      | Speed  | Relevance | Best for                             |
| ---------- | ------ | --------- | ------------------------------------ |
| `basic`    | 更快   | 高        | 通用查询（默认）。                    |
| `advanced` | 更慢   | 最高      | 精准研究和事实查证。                  |

### `tavily_extract`

当你想从一个或多个 URL 中提取干净内容时使用它。它能处理 JavaScript 渲染的页面，并支持基于查询的分块，以便进行有针对性的提取。

| Parameter           | Type         | Constraints / default         | Description                                                 |
| ------------------- | ------------ | ----------------------------- | ----------------------------------------------------------- |
| `urls`              | string array | required, 1-20                | 要从中提取内容的 URL。                                      |
| `query`             | string       | (optional)                    | 按与此查询的相关性对提取出的片段重新排序。                   |
| `extract_depth`     | enum         | `basic` (default), `advanced` | 对于 JS 内容较多的页面、SPA 或动态表格，请使用 `advanced`。 |
| `chunks_per_source` | integer      | 1-5; **requires `query`**     | 每个 URL 返回的片段数。如果未设置 `query`，则报错。         |
| `include_images`    | boolean      | default `false`               | 在结果中包含图片 URL。                                       |

提取深度取舍：

| Depth      | When to use                                |
| ---------- | ------------------------------------------ |
| `basic`    | 简单页面。优先尝试这个。                   |
| `advanced` | JavaScript 渲染的 SPA、动态内容、表格。      |

<Tip>
将较大的 URL 列表分批拆分为多个 `tavily_extract` 调用（每次最多 20 个）。结合 `query` 和 `chunks_per_source`，可以只获取相关内容，而不是整页内容。
</Tip>

## 选择合适的工具

| 需求                                 | 工具             |
| ------------------------------------ | ---------------- |
| 快速网页搜索，无特殊选项             | `web_search`     |
| 带深度、主题、AI 回答的搜索           | `tavily_search`  |
| 从特定 URL 提取内容                   | `tavily_extract` |

<Note>
以 Tavily 作为提供方的通用 `web_search` 工具支持 `query` 和 `count`（最多 20 个结果）。若要使用 Tavily 特定控制项（`search_depth`、`topic`、`include_answer`、域名过滤、时间范围），请改用 `tavily_search`。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="API 密钥解析顺序">
    Tavily 客户端按以下顺序查找 API 密钥：

    1. `plugins.entries.tavily.config.webSearch.apiKey`（通过 SecretRefs 解析）。
    2. 网关环境中的 `TAVILY_API_KEY`。

    如果两者都不存在，`tavily_extract` 会抛出设置错误。

  </Accordion>

  <Accordion title="自定义基础 URL">
    如果你通过代理转发 Tavily，可覆盖 `plugins.entries.tavily.config.webSearch.baseUrl`。默认值为 `https://api.tavily.com`。
  </Accordion>

  <Accordion title="`chunks_per_source` 需要 `query`">
    `tavily_extract` 会拒绝在未提供 `query` 的情况下传入 `chunks_per_source` 的调用。Tavily 会按查询相关性对片段排序，因此没有 `query` 时该参数没有意义。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="Web Search 概览" href="/tools/web" icon="magnifying-glass">
    所有提供方和自动检测规则。
  </Card>
  <Card title="Firecrawl" href="/tools/firecrawl" icon="fire">
    带内容提取的搜索与抓取。
  </Card>
  <Card title="Exa Search" href="/tools/exa-search" icon="binoculars">
    带内容提取的神经搜索。
  </Card>
  <Card title="Configuration" href="/gateway/configuration" icon="gear">
    插件条目和工具路由的完整配置架构。
  </Card>
</CardGroup>
