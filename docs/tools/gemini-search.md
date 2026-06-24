---
summary: "Gemini 使用 Google Search grounding 的网页搜索"
read_when:
  - 你想使用 Gemini 进行 web_search
  - 你需要一个 GEMINI_API_KEY 或 models.providers.google.apiKey
  - 你想使用 Google Search grounding
title: "Gemini 搜索"
---

OpenClaw 支持内置
[Google Search grounding](https://ai.google.dev/gemini-api/docs/grounding) 的 Gemini 模型，
它会返回由实时 Google Search 结果支持、带有引用的 AI 综合答案。

## 获取 API 密钥

<Steps>
  <Step title="创建密钥">
    前往 [Google AI Studio](https://aistudio.google.com/apikey) 并创建一个
    API 密钥。
  </Step>
  <Step title="存储密钥">
    在 Gateway 环境中设置 `GEMINI_API_KEY`，复用
    `models.providers.google.apiKey`，或者通过以下方式配置专用的 web-search 密钥：

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

## 配置

```json5
{
  plugins: {
    entries: {
      google: {
        config: {
          webSearch: {
            apiKey: "AIza...", // 如果已设置 GEMINI_API_KEY 或 models.providers.google.apiKey，则可选
            baseUrl: "https://generativelanguage.googleapis.com/v1beta", // 可选；回退到 models.providers.google.baseUrl
            model: "gemini-2.5-flash", // 默认
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "gemini",
      },
    },
  },
}
```

**凭证优先级：** Gemini web search 会首先使用
`plugins.entries.google.config.webSearch.apiKey`，然后是 `GEMINI_API_KEY`，
最后是 `models.providers.google.apiKey`。对于 base URL，
`plugins.entries.google.config.webSearch.baseUrl` 的优先级高于
`models.providers.google.baseUrl`。

对于 gateway 安装，请将环境变量键放在 `~/.openclaw/.env` 中。

## 工作原理

与返回链接和摘要列表的传统搜索提供商不同，
Gemini 使用 Google Search grounding 生成带有行内引用的 AI 综合答案。结果同时包含综合后的答案和来源
URL。

- 来自 Gemini grounding 的引用 URL 会自动从 Google
  重定向 URL 解析为直接 URL。
- 在返回最终引用 URL 之前，重定向解析会使用 SSRF 防护路径（HEAD + 重定向检查 +
  http/https 验证）。
- 重定向解析使用严格的 SSRF 默认策略，因此会阻止重定向到
  私有/内部目标。

## 支持的参数

Gemini search 支持 `query`、`freshness`、`date_after` 和 `date_before`。

`count` 被接受用于共享 `web_search` 兼容性，但 Gemini grounding
仍然只返回一个带引用的综合答案，而不是包含 N 个结果的列表。

`freshness` 接受 `day`、`week`、`month`、`year`，以及共享快捷方式
`pd`、`pw`、`pm` 和 `py`。`day`/`pd` 会向 Gemini
查询添加新近性指令，而不是硬性的 24 小时范围。`week`、`month`、`year`，以及显式的
`date_after`/`date_before` 范围会设置 Gemini Google Search grounding 的
`timeRangeFilter`。不支持 `country`、`language` 和 `domain_filter`。

## 模型选择

默认模型是 `gemini-2.5-flash`（快速且经济高效）。任何支持 grounding 的 Gemini
模型都可以通过
`plugins.entries.google.config.webSearch.model` 使用。

## Base URL 覆盖

当 Gemini web search 必须通过运营商代理或自定义的 Gemini 兼容端点路由时，
请设置 `plugins.entries.google.config.webSearch.baseUrl`。如果未设置该项，
Gemini web search 会复用 `models.providers.google.baseUrl`。纯粹的
`https://generativelanguage.googleapis.com` 值会被规范化为
`https://generativelanguage.googleapis.com/v1beta`；自定义代理路径会在去除末尾斜杠后按提供的内容保留。

## 相关内容

- [Web Search 概览](/tools/web) -- 所有提供商和自动检测
- [Brave Search](/tools/brave-search) -- 带摘要的结构化结果
- [Perplexity Search](/tools/perplexity-search) -- 结构化结果 + 内容提取
