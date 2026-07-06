---
summary: "通过 xAI 基于网络的响应进行 Grok 网页搜索"
read_when:
  - 当你想使用 Grok 进行 web_search 时
  - 当你想使用 xAI OAuth 或 XAI_API_KEY 进行网页搜索时
title: "Grok 搜索"
---

OpenClaw 支持将 Grok 作为 `web_search` 提供方，使用 xAI 基于网络的
响应生成由实时搜索结果支撑并带有引用的 AI 综合答案。

如果有可用的现有 xAI OAuth 登录，Grok 网页搜索会优先使用它。
如果不存在 OAuth 配置文件，同一个 xAI API 密钥也会为内置的
`x_search` 工具（用于 X，前身为 Twitter 的帖子搜索）和 `code_execution`
工具提供支持。将密钥存储在 `plugins.entries.xai.config.webSearch.apiKey` 处，也
可以让 OpenClaw 将其作为捆绑的 xAI 模型提供方的后备方案重复使用。

对于帖子级别的 X 指标（转发、回复、收藏、浏览量），请使用
[`x_search`](/tools/web#x_search) 并提供精确的帖子 URL 或状态 ID，
而不是宽泛的搜索查询。

## 入门与配置

在 `openclaw onboard` 或 `openclaw configure --section
web` 中选择 **Grok**，可让 OpenClaw 复用现有的 xAI OAuth 配置文件，而无需提示输入单独的网页搜索密钥。没有 OAuth 时，则会回退到 xAI API 密钥设置。

随后，OpenClaw 会提供一个后续步骤，使用相同的 xAI 凭据启用 `x_search`。该后续步骤：

- 仅在你为 `web_search` 选择 Grok 之后才会出现
- 不是一个单独的顶层网页搜索提供方选项
- 还可以在同一流程中可选地设置 `x_search` 模型

如果跳过它，可以稍后在配置中启用或更改 `x_search`。

## 登录或获取 API 密钥

<Steps>
  <Step title="使用 xAI OAuth">
    如果你在入门或模型认证期间已经使用 xAI 登录，请选择
    Grok 作为 `web_search` 提供方。不需要单独的 API 密钥：

    ```bash
    openclaw onboard --auth-choice xai-oauth
    openclaw config set tools.web.search.provider grok
    ```

  </Step>
  <Step title="使用 API 密钥回退">
    当 OAuth 不可用，或者你有意希望使用基于密钥的网页搜索配置时，
    请从 [xAI](https://console.x.ai/) 获取 API 密钥。
  </Step>
  <Step title="存储密钥">
    在 Gateway 环境中设置 `XAI_API_KEY`，或者通过以下方式配置：

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
      xai: {
        config: {
          webSearch: {
            apiKey: "xai-...", // 如果 xAI OAuth 或 XAI_API_KEY 可用，则为可选项
            baseUrl: "https://api.x.ai/v1", // 可选的 Responses API 代理/基础 URL 覆盖
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "grok",
      },
    },
  },
}
```

**凭证替代方案：** `openclaw models auth login --provider xai
--method oauth`，Gateway 环境中的 `XAI_API_KEY`，或
`plugins.entries.xai.config.webSearch.apiKey`。对于 gateway 安装，请将环境
变量放入 `~/.openclaw/.env`。

## 工作原理

Grok 使用 xAI 基于网络的响应来综合答案，并在行内提供
引用，类似于 Gemini 的 Google Search grounding 方法。

## 支持的参数

Grok search 支持 `query`。`count` 为了与共享的 `web_search`
兼容而被接受，但 Grok 始终返回一个带引用的综合答案，
而不是 N 条结果列表。不支持提供商特定的过滤器。

Grok 默认使用 60 秒超时，因为 xAI Responses 的网页检索
搜索可能比共享的 `web_search` 默认耗时更长。你可以通过
`tools.web.search.timeoutSeconds` 覆盖它。

## Base URL 覆盖

将 `plugins.entries.xai.config.webSearch.baseUrl` 设置为通过运算符代理或 xAI 兼容的 Responses 端点路由 Grok 网页搜索。OpenClaw 会在去除末尾斜杠后向 `<baseUrl>/responses` 发送请求。除非设置了 `plugins.entries.xai.config.xSearch.baseUrl`，否则 `x_search` 将回退到相同的 `webSearch.baseUrl`。

## 相关

- [Web Search 概览](/tools/web) -- 所有提供方和自动检测
- [Web Search 中的 x_search](/tools/web#x_search) -- 通过 xAI 提供的原生 X 搜索
- [Gemini Search](/tools/gemini-search) -- 通过 Google grounding 生成 AI 综合答案
