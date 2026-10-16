---
summary: "Gemini 网络搜索与 Google 搜索接地"
read_when:
  - "您想将 Gemini 用于 web_search"
  - "你需要 GEMINI_API_KEY 或 models.providers.google.apiKey"
  - "你想使用 Google Search grounding"
  - "你的 Gemini 网关需要请求标头"
title: "Gemini 搜索"
---

OpenClaw 支持具有内置 [Google 搜索基础 ](https://ai.google.dev/gemini-api/docs/grounding) 的 Gemini 模型，该模型返回由实时 Google 搜索结果和引文支持的 AI- 合成答案。

## <a id="get-an-api-key"></a> 获取 API 密钥

<Steps>
  <Step id="create-a-key" title="创建密钥">
    Go 到 [Google AI Studio](https://aistudio.google.com/apikey) 并创建 API 密钥。
  </Step>
  <Step id="store-the-key" title="存储密钥">
    在 Gateway 环境中设置 `GEMINI_API_KEY`，复用 `models.providers.google.apiKey`，或者通过以下方式配置专用的 web-search 密钥：

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

## <a id="config"></a> 配置

```json5
{
  plugins: {
    entries: {
      google: {
        config: {
          webSearch: {
            apiKey: "AIza...", // optional if GEMINI_API_KEY or models.providers.google.apiKey is set
            baseUrl: "https://generativelanguage.googleapis.com/v1beta", // optional; falls back to models.providers.google.baseUrl
            headers: {
              "X-Routing-Target": "staging",
              "X-Gateway-Token": {
                source: "env",
                provider: "default",
                id: "GEMINI_GATEWAY_TOKEN",
              },
            },
            model: "gemini-3.6-flash", // default
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

**凭证优先级：** Gemini Web 搜索首先使用 `plugins.entries.google.config.webSearch.apiKey`，然后是 `GEMINI_API_KEY`，然后是 `models.providers.google.apiKey`。对于基本 URL，专用 `plugins.entries.google.config.webSearch.baseUrl` 在 `models.providers.google.baseUrl` 之前获胜。

对于 gateway 安装，请将环境变量键放在 `~/.openclaw/.env` 中。

### <a id="request-headers"></a> 请求标头

当运营商网关需要额外的请求元数据时，设置 `plugins.entries.google.config.webSearch.headers`。普通字符串值使用常规配置处理； 它们不会仅仅因为是标头就自动被视为机密。当标头包含机密时，请使用如上所示的 [SecretRef](/gateway/secrets) 值。OpenClaw 会在运行时解析该值，并对其应用现有的机密脱敏路径。

Gemini 请求会保留对 `Content-Type`、`x-goog-api-key` 和 `x-goog-api-client` 的所有权； 这些值会覆盖同名的已配置标头。不会继承 `models.providers.google.headers`，因为它们属于模型提供商端点，而该端点可能与 web-search 端点不同。

空的纯字符串值是有效的。无效字段和传输拥有或框架名称（例如 `Content-Length`、`Host` 和 `Transfer-Encoding`）在缓存查找或网络 I/O. 之前使当前搜索失败

有效的标头名称和值会通过摘要对内存中的搜索缓存进行分区，因此两个路由目标不会共享结果。 针对上述提供商所有名称配置的值会被忽略，也不会对缓存进行分区。在跨源重定向时，受保护的 fetch 路径仅保留其标准安全重定向标头。

## <a id="how-it-works"></a> 工作原理

与返回链接和片段列表的传统搜索提供商不同，Gemini 使用 Google 搜索基础来生成带有内联引用的 AI- 综合答案。结果包括合成答案和源 URL。

- 来自 Gemini 接地的引文 URL 会自动从 Google 重定向 URL 解析为通过 HEAD 请求通过 OpenClaw 的 SSRF-guarded 获取路径（重定向跟随，http/https 验证）的直接 URL。
- Redirect 解析使用严格的 SSRF 默认值，因此重定向到 private/internal 目标将被阻止。

## <a id="supported-parameters"></a> 支持的参数

Gemini 搜索支持 `query`、`freshness`、`date_after` 和 `date_before`。

`count` 因共享 `web_search` 兼容性而被接受，但 Gemini 接地仍然返回一个带有引文的综合答案，而不是 N- 结果列表。

`freshness` 接受 `day`、`week`、`month`、`year`，以及共享快捷方式 `pd`、`pw`、`pm` 和 `py`。`day`/`pd` 会向 Gemini 查询添加新近性指令，而不是硬性的 24 小时范围。`week`、`month`、`year`，以及显式的 `date_after`/`date_before` 范围会设置 Gemini Google Search grounding 的 `timeRangeFilter`。不支持 `country`、`language` 和 `domain_filter`。

## <a id="model-selection"></a> 模型选择

默认模型是稳定的 `gemini-3.6-flash`。省略 `plugins.entries.google.config.webSearch.model` 使用此默认值；显式模型保持固定。您可以选择任何支持接地且可用于您的 API 密钥的 Gemini 模型。

Gemini 3 接地按搜索查询计费，而 Gemini 2.5 接地按提示计费。请参阅 [Google 搜索基础定价 ](https://ai.google.dev/gemini-api/docs/google-search#pricing)。

## <a id="base-url-overrides"></a> Base URL 覆盖

当 Gemini Web 搜索必须通过运营商代理或自定义 Gemini- 兼容端点进行路由时，设置 `plugins.entries.google.config.webSearch.baseUrl`。如果未设置，Gemini Web 搜索将重用 `models.providers.google.baseUrl`。普通的 `https://generativelanguage.googleapis.com` 值被归一化为 `https://generativelanguage.googleapis.com/v1beta`；修剪尾部斜杠后，自定义代理路径将按提供的方式保留。

## <a id="related"></a> 相关内容

- [网页搜索概述](/tools/web) -- 所有提供商和自动检测
- [Brave Search](/tools/brave-search) -- 带片段的结构化结果
- [Perplexity Search](/tools/perplexity-search) -- 带域过滤的结构化结果
- [Kimi search](/tools/kimi-search) -- Kimi 通过 Moonshot 进行网络搜索
