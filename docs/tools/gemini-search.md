---
summary: "Gemini web search with Google Search grounding"
read_when:
  - 你想使用 Gemini 进行 web_search
  - 你需要一个 GEMINI_API_KEY
  - 你想使用 Google Search grounding
title: "Gemini search"
---

OpenClaw 支持带内置
[Google Search grounding](https://ai.google.dev/gemini-api/docs/grounding) 的 Gemini 模型，
它会返回由实时 Google 搜索结果支持、带有引用的 AI 合成答案。

## 获取 API 密钥

<Steps>
  <Step title="创建密钥">
    前往 [Google AI Studio](https://aistudio.google.com/apikey) 并创建一个
    API key。
  </Step>
  <Step title="保存密钥">
    在 Gateway 环境中设置 `GEMINI_API_KEY`，或通过以下方式配置：

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

**环境替代方案：**在 Gateway 环境中设置 `GEMINI_API_KEY`。
对于 gateway 安装，请将其放在 `~/.openclaw/.env` 中。

## 工作原理

与返回链接和摘要列表的传统搜索提供商不同，
Gemini 使用 Google Search grounding 来生成带有行内引用的 AI 合成答案。结果既包括合成答案，也包括来源
URL。

- 来自 Gemini grounding 的引用 URL 会自动从 Google
  重定向 URL 解析为直接 URL。
- 重定向解析在返回最终引用 URL 之前，会使用 SSRF 防护路径（HEAD + 重定向检查 +
  http/https 验证）。
- 重定向解析使用严格的 SSRF 默认设置，因此会阻止重定向到
  私有/内部目标。

## 支持的参数

Gemini search 支持 `query`。

`count` 会被接受以兼容共享的 `web_search`，但 Gemini grounding
仍然会返回一个带引用的合成答案，而不是一个 N 条结果的
列表。

不支持诸如 `country`、`language`、`freshness` 和
`domain_filter` 之类的提供商特定筛选器。

## 模型选择

默认模型是 `gemini-2.5-flash`（速度快且成本低）。任何支持 grounding 的 Gemini
模型都可以通过
`plugins.entries.google.config.webSearch.model` 使用。

## 相关内容

- [Web Search 概览](/tools/web) -- 所有提供商和自动检测
- [Brave Search](/tools/brave-search) -- 带摘要的结构化结果
- [Perplexity Search](/tools/perplexity-search) -- 结构化结果 + 内容提取
