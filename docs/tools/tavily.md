---
summary: "Tavily 搜索和提取工具"
read_when:
  - "您想要 Tavily- 支持的网络搜索"
  - "你需要 Tavily API 密钥"
  - "你想将 Tavily 作为 web_search 提供方"
  - "您想要从 URL 中提取内容"
title: "Tavily"
---

[Tavily](https://tavily.com) 是专为 AI 应用而设计的搜索 API。 OpenClaw 通过两种方式公开它：

- 作为通用搜索工具的 `web_search` 提供方
- 作为显式插件工具：`tavily_search` 和 `tavily_extract`

Tavily 返回针对 LLM 使用而优化的结构化结果，具有可配置的搜索深度、主题过滤、域过滤器、AI- 生成的答案摘要以及从 URL（包括 JavaScript- 渲染的页面）中提取内容。

| 属性  | 值                                                                                         |
| --------- | --------------------------------------------------------------------------------------------- |
| 插件 id | `tavily`                                                                                      |
| 包裹   | `@openclaw/tavily-plugin`                                                                     |
| 认证      | `TAVILY_API_KEY` 环境变量或配置 `apiKey`                                                   |
| 基础 URL  | `https://api.tavily.com`（默认）；可使用 `TAVILY_BASE_URL` 环境变量或配置 `baseUrl` 覆盖 |
| 超时  | 30 秒搜索，60 秒提取（默认）                                                             |
| 工具     | `tavily_search`, `tavily_extract`                                                             |

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="install-the-plugin" title="安装插件">
    ```bash
    openclaw plugins install @openclaw/tavily-plugin
    ```
  </Step>
  <Step id="get-an-api-key" title="获取 API 密钥">
    在 [tavily.com](https://tavily.com) 创建 Tavily 账户，然后在控制台中生成 API 密钥。
  </Step>
  <Step id="configure-the-plugin-and-provider" title="配置插件和提供程序">
    ```json5
    {
      plugins: {
        entries: {
          tavily: {
            enabled: true,
            config: {
              webSearch: {
                apiKey: "tvly-...", // optional if TAVILY_API_KEY is set
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
  <Step id="verify-search-runs" title="验证搜索运行">
    从任意 agent 触发一次 `web_search`，或直接调用 `tavily_search`。
  </Step>
</Steps>

<Tip>
在引导流程中选择 Tavily，或运行 `openclaw configure --section web`，会在需要时安装并启用官方 Tavily 插件。
</Tip>

## <a id="tool-reference"></a> 工具参考

### `tavily_search`

当您需要 Tavily- 特定搜索控件而不是通用 `web_search` 时，请使用此选项。

| 参数         | 类型         | 约束 / 默认                  | 描述                                   |
| ----------------- | ------------ | -------------------------------------- | --------------------------------------------- |
| `query`           | 字符串       | 必填                               | 搜索查询字符串。                          |
| `search_depth`    | 枚举         | `basic`（默认）、`advanced`          | `advanced` 更慢，但相关性更高。    |
| `topic`           | 枚举         | `general`（默认）、`news`、`finance` | 按主题类别筛选。                       |
| `max_results`     | 整数      | 1-20，默认 `5`                      | 结果数量。                            |
| `include_answer`  | 布尔值      | 默认`false`                        | 包括 Tavily AI- 生成的答案摘要。 |
| `time_range`      | 枚举         | `day`, `week`, `month`, `year`         | 按时间新旧筛选结果。                    |
| `include_domains` | 字符串数组 | （无）                                 | 只包含这些域名中的结果。      |
| `exclude_domains` | 字符串数组 | （无）                                 | 排除这些域名中的结果。           |

对于发布元数据，请使用 `topic: "news"`。当 Tavily 提供 `published_date` 时，OpenClaw 将其返回为 `published`； GMT 新闻时间戳转换为 ISO 8601。缺少日期、相对年龄和任意文本仍然不存在。 `time_range` 过滤器并不是发布日期的证据，返回的日期仍然需要对新鲜度敏感的工作流程进行源验证。

搜索深度取舍：

| 深度      | 速度  | 相关性 | 最适合                             |
| ---------- | ------ | --------- | ------------------------------------ |
| `basic`    | 更快 | 高      | 通用查询（默认）。   |
| `advanced` | 更慢 | 最高   | 精准研究和事实查证。 |

### `tavily_extract`

使用它可以从一个或多个 URL 中提取干净的内容。处理 JavaScript- 渲染页面并支持以查询为中心的分块以进行有针对性的提取。

| 参数           | 类型         | 约束 / 默认         | 描述                                                 |
| ------------------- | ------------ | ----------------------------- | ----------------------------------------------------------- |
| `urls`              | 字符串数组 | 必填，1-20                | 从中提取内容的 URL。                               |
| `query`             | 字符串       | （可选）                    | 按与此查询的相关性对提取出的片段重新排序。         |
| `extract_depth`     | 枚举         | `basic`（默认）、`advanced` | 将 `advanced` 用于 JS-heavy 页面、SPA 或动态表。 |
| `chunks_per_source` | 整数      | 1-5；**需要 `query`**     | 每个 URL 返回的片段数。如果未设置 `query`，则报错。     |
| `include_images`    | 布尔值      | 默认`false`               | 在结果中包含图像 URL。                              |

提取深度取舍：

| 深度      | 何时使用                                |
| ---------- | ------------------------------------------ |
| `basic`    | 简单页面。优先尝试这个。              |
| `advanced` | JS-渲染的 SPA、动态内容、表格。 |

<Tip>
将较大的 URL 列表分批拆分为多个 `tavily_extract` 调用（每次最多 20 个）。结合 `query` 和 `chunks_per_source`，可以只获取相关内容，而不是整页内容。
</Tip>

## <a id="choosing-the-right-tool"></a> 选择合适的工具

| 需求                                 | 工具             |
| ------------------------------------ | ---------------- |
| 快速网页搜索，无特殊选项 | `web_search`     |
| 带深度、主题、AI 回答的搜索 | `tavily_search`  |
| 从特定 URL 中提取内容   | `tavily_extract` |

<Note>
以 Tavily 作为提供者的通用 `web_search` 工具支持 `query` 和 `count`（最多 20 个结果）。对于 Tavily- 特定控件（`search_depth`、`topic`、`include_answer`、域过滤器、时间范围），请改用 `tavily_search`。
</Note>

## <a id="advanced-configuration"></a> 高级配置

Tavily `web_search` 和 `tavily_search` 使用 `tools.web.search.cacheTtlMinutes` 作为 OpenClaw 的本地结果缓存（默认值：15 分钟）。将其设置为 `0` 以绕过缓存读写。较短的 TTL 限制了现有条目的重用；较长的 TTL 不会延长其原始有效期。此设置不控制单独的 `tavily_extract` 缓存。

<AccordionGroup>
  <Accordion id="api-key-resolution-order" title="API 按键解析顺序">
    Tavily 客户端按以下顺序查找 API 密钥：

    1. `plugins.entries.tavily.config.webSearch.apiKey`（通过 SecretRefs 解析）。
    2. 网关环境中的 `TAVILY_API_KEY`。

    `tavily_search` 和 `tavily_extract` 如果都不存在，则会抛出设置错误。

  </Accordion>

  <Accordion id="custom-base-url" title="定制底座 URL">
    如果你通过代理转发 Tavily，可以覆盖 `plugins.entries.tavily.config.webSearch.baseUrl`，或设置 `TAVILY_BASE_URL`。配置优先于环境变量。默认值是 `https://api.tavily.com`。
  </Accordion>

  <Accordion id="chunks-per-source-requires-query" title="`chunks_per_source` 需要 `query`">
    `tavily_extract` 拒绝在没有 `query` 的情况下通过 `chunks_per_source` 的呼叫。 Tavily 根据查询相关性对块进行排序，因此如果没有该参数，则该参数毫无意义。
  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="网页搜索概述" href="/tools/web" icon="magnifying-glass">
    所有提供方和自动检测规则。
  </Card>
  <Card title="Firecrawl" href="/tools/firecrawl" icon="fire">
    带内容提取的搜索与抓取。
  </Card>
  <Card title="Exa 搜索" href="/tools/exa-search" icon="binoculars">
    带内容提取的神经搜索。
  </Card>
  <Card title="配置" href="/gateway/configuration" icon="gear">
    插件条目和工具路由的完整配置架构。
  </Card>
</CardGroup>
