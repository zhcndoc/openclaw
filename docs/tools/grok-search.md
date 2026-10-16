---
summary: "通过 xAI 基于网络的响应进行 Grok 网络搜索"
read_when:
  - "当你想使用 Grok 进行 web_search 时"
  - "当你想使用 xAI OAuth 或 XAI_API_KEY 进行网页搜索时"
title: "Grok 搜索"
---

OpenClaw 支持 Grok 作为 `web_search` 提供者，使用 xAI 基于网络的响应来生成由带引用的实时搜索结果支持的 AI- 合成答案。

Grok Web 搜索首选现有的 xAI OAuth 登录（如果可用）。如果不存在 OAuth 配置文件，则相同的 xAI API 密钥还会为用于 X（以前称为 Twitter）帖子搜索的内置 `x_search` 工具和 `code_execution` 工具提供支持。将密钥存储在 `plugins.entries.xai.config.webSearch.apiKey` 还可以让 OpenClaw 重新使用它作为捆绑的 xAI 模型提供程序的后备。

对于帖子级别的 X 指标（转发、回复、收藏、浏览量），请使用 [`x_search`](/tools/web#x_search) 并提供精确的帖子 URL 或状态 ID， 而不是宽泛的搜索查询。

## <a id="onboarding-and-configure"></a> 入门与配置

在 `openclaw onboard` 或 `openclaw configure --section web` 期间选择 **Grok** 可让 OpenClaw 重用现有的 xAI OAuth 配置文件，而不会提示输入单独的 Web 搜索密钥。如果没有 OAuth，则会回退到 xAI API-key 设置。

随后，OpenClaw 会提供一个后续步骤，使用相同的 xAI 凭据启用 `x_search`。该后续步骤：

- 仅在你为 `web_search` 选择 Grok 之后才会出现
- 不是一个单独的顶层网页搜索提供方选项
- 还可以在同一流程中可选地设置 `x_search` 模型

如果跳过它，可以稍后在配置中启用或更改 `x_search`。

## <a id="sign-in-or-get-an-api-key"></a> 登录或获取 API 密钥

提供 Grok Web 搜索的 `xai` 插件随 OpenClaw 一起提供，因此没有 `openclaw plugins install` 步骤。从您已有的凭证开始。

<Steps>
  <Step id="use-xai-oauth" title="使用 xAI OAuth">
    如果你在入门或模型认证期间已经使用 xAI 登录，请选择 Grok 作为 `web_search` 提供方。不需要单独的 API 密钥：

    ```bash
    openclaw onboard --auth-choice xai-oauth
    openclaw config set tools.web.search.provider grok
    ```

  </Step>
  <Step id="use-an-api-key-fallback" title="使用 API 密钥后备">
    当 OAuth 不可用或您有意需要密钥支持的 Web 搜索配置时，从 [xAI](https://console.x.ai/) 获取 API 密钥。
  </Step>
  <Step id="store-the-key" title="存储密钥">
    在 Gateway 环境中设置 `XAI_API_KEY`，或者通过以下方式配置：

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
      xai: {
        config: {
          webSearch: {
            apiKey: "xai-...", // optional if xAI OAuth or XAI_API_KEY is available
            baseUrl: "https://api.x.ai/v1", // optional Responses API proxy/base URL override
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

**凭证替代方案：** `openclaw models auth login --provider xai --method oauth`，Gateway 环境中的 `XAI_API_KEY`，或 `plugins.entries.xai.config.webSearch.apiKey`。对于 gateway 安装，请将环境变量放入 `~/.openclaw/.env`。

## <a id="how-it-works"></a> 工作原理

Grok 使用 xAI 基于网络的响应来综合答案，并在行内提供引用，类似于 Gemini 的 Google Search grounding 方法。

## <a id="supported-parameters"></a> 支持的参数

Grok 搜索支持 `query`。 `count` 因共享 `web_search` 兼容性而被接受，但 Grok 始终返回一个带有引文的综合答案，而不是 N- 结果列表。不支持特定于提供商的过滤器。

Grok 默认为 60 秒超时，因为 xAI 响应基于网络的搜索运行时间可能比共享的 `web_search` 默认值运行时间更长。该预算包括凭证准备、搜索请求和身份验证恢复。用 `tools.web.search.timeoutSeconds` 覆盖它。

OAuth 刷新失败仍然是身份验证错误，而不是报告为丢失 API 密钥。如果刷新无法恢复，请使用`openclaw models auth login --provider xai --method oauth`重新登录；增加搜索超时不会修复不可用的凭据。

## <a id="base-url-overrides"></a> Base URL 覆盖

设置 `plugins.entries.xai.config.webSearch.baseUrl` 以通过运营商代理或 xAI- 兼容响应端点路由 Grok Web 搜索。 OpenClaw 在修剪尾部斜杠后发布到 `<baseUrl>/responses`。除非设置了 `plugins.entries.xai.config.xSearch.baseUrl`，否则 `x_search` 会回退到相同的 `webSearch.baseUrl`。

## <a id="related"></a> 相关内容

- [网页搜索概述](/tools/web) -- 所有提供商和自动检测
- Web [x_search Search](/tools/web#x_search) -- 通过 xAI 进行一流的 X 搜索
- [Gemini Search](/tools/gemini-search) -- AI- 通过 Google 接地综合答案
- [Kimi search](/tools/kimi-search) — Moonshot-支持的搜索工具
