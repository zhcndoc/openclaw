---
summary: "Gemini 使用 Google Search grounding 的网页搜索"
read_when:
  - 当你想将 Gemini 用于 web_search
  - 你需要一个 GEMINI_API_KEY
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
    在 Gateway 环境中设置 `GEMINI_API_KEY`，或者通过以下方式配置：

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
            apiKey: "AIza...", // 如果已设置 GEMINI_API_KEY，则为可选项
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

**环境替代方案：** 在 Gateway 环境中设置 `GEMINI_API_KEY`。
对于 gateway 安装，请将其放在 `~/.openclaw/.env` 中。

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

Gemini 搜索支持 `query`。

`count` 被接受用于共享 `web_search` 兼容性，但 Gemini grounding
仍然只返回一个带引用的综合答案，而不是包含 N 个结果的列表。

不支持 `country`、`language`、`freshness` 和
`domain_filter` 等特定于提供商的筛选条件。

## 模型选择

默认模型是 `gemini-2.5-flash`（快速且经济高效）。任何支持 grounding 的 Gemini
模型都可以通过
`plugins.entries.google.config.webSearch.model` 使用。

## 相关内容

- [Web Search 概览](/tools/web) -- 所有提供商和自动检测
- [Brave Search](/tools/brave-search) -- 带摘要的结构化结果
- [Perplexity Search](/tools/perplexity-search) -- 结构化结果 + 内容提取
