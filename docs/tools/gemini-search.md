---
summary: "使用 Google Search grounding 的 Gemini 网页搜索"
read_when:
  - 你想使用 Gemini 进行网页搜索
  - 你需要 GEMINI_API_KEY 或 models.providers.google.apiKey
  - 你想使用 Google Search grounding
  - 你的 Gemini 网关需要请求标头
title: "Gemini 搜索"
---

OpenClaw 支持内置的
[Google Search grounding](https://ai.google.dev/gemini-api/docs/grounding) Gemini 模型，
它会返回由实时 Google 搜索结果支持、带有引用的 AI 综合答案。

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
            headers: {
              "X-Routing-Target": "staging",
              "X-Gateway-Token": {
                source: "env",
                provider: "default",
                id: "GEMINI_GATEWAY_TOKEN",
              },
            },
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

### 请求标头

当运营商网关需要额外的请求元数据时，设置
`plugins.entries.google.config.webSearch.headers`。普通字符串值使用常规配置处理；
它们不会仅仅因为是标头就自动被视为机密。当标头包含机密时，请使用如上所示的
[SecretRef](/gateway/secrets) 值。OpenClaw 会在运行时解析该值，并对其应用现有的
机密脱敏路径。

Gemini 请求会保留对 `Content-Type`、`x-goog-api-key` 和 `x-goog-api-client` 的所有权；
这些值会覆盖同名的已配置标头。不会继承 `models.providers.google.headers`，因为它们属于
模型提供商端点，而该端点可能与 web-search 端点不同。

空的普通字符串值是有效的。无效字段以及传输层所有或成帧相关的名称（例如
`Content-Length`、`Host` 和 `Transfer-Encoding`）会导致当前搜索在缓存查找或网络 I/O
之前失败。

有效的标头名称和值会通过摘要对内存中的搜索缓存进行分区，因此两个路由目标不会共享结果。
针对上述提供商所有名称配置的值会被忽略，也不会对缓存进行分区。在跨源重定向时，受保护的
fetch 路径仅保留其标准安全重定向标头。

## 工作原理

与返回链接和摘要列表的传统搜索提供商不同，
Gemini 使用 Google Search grounding 生成带有行内引用的 AI 综合答案。结果同时包含综合后的答案和来源
URL。

- Gemini grounding 中的引用 URL 会通过 OpenClaw 受 SSRF 防护的抓取路径，经由 HEAD 请求自动从 Google
  重定向 URL 解析为直接 URL（跟随重定向、http/https 验证）。
- 重定向解析使用严格的 SSRF 默认设置，因此会阻止重定向到
  私有/内部目标。

## 支持的参数

Gemini 搜索支持 `query`、`freshness`、`date_after` 和 `date_before`。

`count` 被接受用于共享 `web_search` 兼容性，但 Gemini grounding
仍然只返回一个带引用的综合答案，而不是包含 N 个结果的列表。

`freshness` 接受 `day`、`week`、`month`、`year`，以及共享快捷方式
`pd`、`pw`、`pm` 和 `py`。`day`/`pd` 会向 Gemini
查询添加新近性指令，而不是硬性的 24 小时范围。`week`、`month`、`year`，以及显式的
`date_after`/`date_before` 范围会设置 Gemini Google Search grounding 的
`timeRangeFilter`。不支持 `country`、`language` 和 `domain_filter`。

## 模型选择

默认模型是 `gemini-2.5-flash`（快速且经济高效）。任何支持 grounding 的 Gemini 模型都可以通过 `plugins.entries.google.config.webSearch.model` 使用。

## 基础 URL 覆盖

当 Gemini 网页搜索必须通过运营商代理或自定义的 Gemini 兼容端点路由时，
请设置 `plugins.entries.google.config.webSearch.baseUrl`。如果未设置该项，
Gemini 网页搜索会复用 `models.providers.google.baseUrl`。纯粹的
`https://generativelanguage.googleapis.com` 值会被规范化为
`https://generativelanguage.googleapis.com/v1beta`；自定义代理路径会在去除末尾斜杠后按提供的内容保留。

## 相关内容

- [网络搜索概览](/tools/web) -- 所有提供商和自动检测
- [Brave 搜索](/tools/brave-search) -- 带摘要的结构化结果
- [Perplexity 搜索](/tools/perplexity-search) -- 结构化结果 + 内容提取
