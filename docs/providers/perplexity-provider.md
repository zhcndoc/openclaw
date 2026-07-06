---
summary: "Perplexity 网页搜索提供方设置（API 密钥、搜索模式、过滤）"
title: "Perplexity"
read_when:
  - 你想将 Perplexity 配置为网页搜索提供方
  - 你需要 Perplexity API 密钥或 OpenRouter 代理设置
---

Perplexity 插件注册了一个 `web_search` 提供方，提供两种传输方式：原生
Perplexity Search API（带过滤器的结构化结果）以及 Perplexity
Sonar 聊天补全，可直接使用或通过 OpenRouter 使用（带引用的 AI 综合回答）。

<Note>
本页介绍 Perplexity **提供方** 的设置。关于 Perplexity **工具**（代理如何使用它），请参见 [Perplexity search](/tools/perplexity-search)。
</Note>

| Property    | Value                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| 类型        | 网页搜索提供方（不是模型提供方）                                         |
| 认证        | `PERPLEXITY_API_KEY`（原生）或 `OPENROUTER_API_KEY`（通过 OpenRouter） |
| 配置路径    | `plugins.entries.perplexity.config.webSearch.apiKey`                   |
| 覆盖项      | `plugins.entries.perplexity.config.webSearch.baseUrl` / `.model`       |
| 获取密钥    | [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)   |

## 安装插件

```bash
openclaw plugins install @openclaw/perplexity-plugin
openclaw gateway restart
```

## 入门

<Steps>
  <Step title="设置 API 密钥">
    ```bash
    openclaw configure --section web
    ```

    或直接设置密钥：

    ```bash
    openclaw config set plugins.entries.perplexity.config.webSearch.apiKey "pplx-xxxxxxxxxxxx"
    ```

    在 Gateway 环境中导出为 `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY` 的密钥也可以使用。

  </Step>
  <Step title="开始搜索">
    `web_search` 一旦检测到 Perplexity 密钥是可用的搜索凭据，就会自动识别 Perplexity；无需进一步设置。若要显式固定提供方：

    ```bash
    openclaw config set tools.web.search.provider perplexity
    ```

  </Step>
</Steps>

## 搜索模式

该插件按以下顺序解析传输方式：

1. 已设置 `webSearch.baseUrl` 或 `webSearch.model`：始终通过该端点的 Sonar chat completions 路由，而不管密钥类型如何。
2. 否则，由密钥来源决定端点：已配置密钥的前缀决定传输方式（配置优先于环境变量）；环境密钥则直接使用其匹配的端点。

| Key prefix | Transport                                                  | Features                                         |
| ---------- | ---------------------------------------------------------- | ------------------------------------------------ |
| `pplx-`    | 原生 Perplexity Search API (`https://api.perplexity.ai`) | 结构化结果、域名/语言/日期过滤器                   |
| `sk-or-`   | OpenRouter (`https://openrouter.ai/api/v1`)，Sonar 模型   | 带引用的 AI 生成答案                             |

任何其他前缀的已配置密钥也会使用原生 Search API。chat-completions 路径默认使用 `perplexity/sonar-pro` 模型；可通过 `plugins.entries.perplexity.config.webSearch.model` 覆盖。

## 原生 API 过滤

| 过滤器                               | 说明                                                     | 传输方式   |
| ------------------------------------ | --------------------------------------------------------------- | ----------- |
| `count`                              | 每次搜索的结果数，1-10（默认 5）                            | 仅原生      |
| `freshness`                          | 新近时间窗口：`day`、`week`、`month`、`year`                  | 两者均可        |
| `country`                            | 2 字母国家代码（`us`、`de`、`jp`）                        | 仅原生      |
| `language`                           | ISO 639-1 语言代码（`en`、`fr`、`zh`）                      | 仅原生      |
| `date_after` / `date_before`         | 以 `YYYY-MM-DD` 表示的发布日期范围                            | 仅原生      |
| `domain_filter`                      | 最多 20 个域名；允许列表或以 `-` 前缀表示的拒绝列表，不能混用 | 仅原生      |
| `max_tokens` / `max_tokens_per_page` | 所有结果 / 每页的内容预算                    | 仅原生      |

仅原生的过滤器在 chat-completions 路径上会返回描述性错误。
`freshness` 不能与 `date_after`/`date_before` 组合使用。

## 高级配置

<AccordionGroup>
  <Accordion title="守护进程的环境变量">
    <Warning>
    仅在交互式 shell 中导出的密钥对 launchd/systemd Gateway 守护进程不可见，除非显式导入该环境。请将该密钥设置在 `~/.openclaw/.env` 中，或通过 `env.shellEnv` 设置，这样 Gateway 进程才能读取它。有关完整的优先级顺序，请参见 [环境变量](/help/environment)。
    </Warning>
  </Accordion>

  <Accordion title="OpenRouter 代理设置">
    要通过 OpenRouter 路由 Perplexity 搜索，请设置 `OPENROUTER_API_KEY`
    （前缀为 `sk-or-`），而不是原生的 Perplexity 密钥。OpenClaw 会检测
    该密钥并自动切换到 Sonar 传输。如果你已经配置了 OpenRouter 计费并希望在那边整合提供商，这会很有用。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="Perplexity 搜索工具" href="/tools/perplexity-search" icon="magnifying-glass">
    代理如何调用 Perplexity 搜索并解释结果。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    包含插件条目的完整配置参考。
  </Card>
</CardGroup>