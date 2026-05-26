---
summary: "通过 xAI 基于网络的响应进行 Grok 网页搜索"
read_when:
  - 当你想使用 Grok 进行 web_search 时
  - 当你想使用 xAI OAuth 或 XAI_API_KEY 进行网页搜索时
title: "Grok 搜索"
---

OpenClaw 支持将 Grok 作为 `web_search` 提供方，使用 xAI 基于网络的
响应生成由实时搜索结果支撑并带有引用的 AI 综合答案。

Grok 网页搜索在可用时会优先使用你现有的 xAI OAuth 登录。
如果不存在 OAuth 配置文件，同一个 xAI API 密钥也可以为内置的
`x_search` 工具提供支持，用于 X（前身为 Twitter）帖子搜索以及 `code_execution`
工具。如果你将密钥存储在 `plugins.entries.xai.config.webSearch.apiKey` 下，
OpenClaw 也会将其作为捆绑的 xAI 模型提供方的回退方案。

对于帖子级别的 X 指标，例如转发、回复、收藏或浏览量，请优先使用
`x_search` 并提供精确的帖子 URL 或状态 ID，而不是宽泛的搜索
查询。

## 入门与配置

如果你在以下过程中选择 **Grok**：

- `openclaw onboard`
- `openclaw configure --section web`

OpenClaw 可以在不提示单独网页搜索密钥的情况下使用现有的 xAI OAuth 配置文件。
如果 OAuth 不可用，则会回退到 xAI API 密钥设置。
OpenClaw 还可以显示一个单独的后续步骤，使用相同的 xAI 凭据启用 `x_search`。
该后续步骤：

- 仅在你为 `web_search` 选择 Grok 之后出现
- 不是一个独立的顶层网页搜索提供方选择
- 也可以在同一流程中可选地设置 `x_search` 模型

如果你跳过它，之后仍可以在配置中启用或更改 `x_search`。

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

**凭据替代方案：**使用 `openclaw models auth login
--provider xai --method oauth` 登录，在 Gateway 环境中设置 `XAI_API_KEY`，
或者存储 `plugins.entries.xai.config.webSearch.apiKey`。对于 gateway 安装，
请将环境变量放在 `~/.openclaw/.env` 中。

## 工作原理

Grok 使用 xAI 基于网络的响应来综合答案，并在行内提供
引用，类似于 Gemini 的 Google Search grounding 方法。

## 支持的参数

Grok 搜索支持 `query`。

`count` 为了兼容共享的 `web_search` 而被接受，但 Grok 仍然
返回一条带引用的综合答案，而不是一个 N 个结果的列表。

目前不支持特定于提供方的过滤器。

Grok 使用特定于提供方的 60 秒默认超时，因为 xAI Responses
基于网络的检索可能比共享的 `web_search` 默认值运行更久。设置
`tools.web.search.timeoutSeconds` 可覆盖它。

## Base URL 覆盖

当 Grok 网页搜索需要通过运营商代理或兼容 xAI 的 Responses 端点路由时，设置 `plugins.entries.xai.config.webSearch.baseUrl`。OpenClaw
会在去除尾部斜杠后向 `<baseUrl>/responses` 发送请求。`x_search`
使用相同的 `webSearch.baseUrl` 回退，除非
`plugins.entries.xai.config.xSearch.baseUrl` 已设置。

## 相关

- [Web Search 概览](/tools/web) -- 所有提供方和自动检测
- [Web Search 中的 x_search](/tools/web#x_search) -- 通过 xAI 提供的原生 X 搜索
- [Gemini Search](/tools/gemini-search) -- 通过 Google grounding 生成 AI 综合答案
