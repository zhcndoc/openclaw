---
summary: "通过 xAI 网页接地响应进行 Grok 网页搜索"
read_when:
  - 您想使用 Grok 进行 web_search
  - 您需要一个用于网页搜索的 XAI_API_KEY
title: "Grok 搜索"
---

OpenClaw 支持将 Grok 作为 `web_search` 提供商，使用 xAI 网页接地
响应来生成由实时搜索结果支持并带有引用的 AI 综合答案。

相同的 `XAI_API_KEY` 也可以为内置的 `x_search` 工具提供动力，用于搜索 X（前身为 Twitter）帖子。如果您将密钥存储在 `plugins.entries.xai.config.webSearch.apiKey` 下，OpenClaw 现在也会将其重用为捆绑的 xAI 模型提供商的后备方案。

对于帖子级别的 X 指标，如转发、回复、书签或浏览量，建议使用 `x_search` 配合确切的帖子 URL 或状态 ID，而不是广泛的搜索查询。

## 上手与配置

如果您在以下过程中选择 **Grok**：

- `openclaw onboard`
- `openclaw configure --section web`

OpenClaw 可以显示一个单独的后续步骤来启用 `x_search` 并使用相同的 `XAI_API_KEY`。该后续步骤：

- 仅在您为 `web_search` 选择 Grok 后出现
- 不是一个单独的顶层网页搜索提供商选择
- 可以在同一流程中可选地设置 `x_search` 模型

如果您跳过它，可以在配置中稍后启用或更改 `x_search`。

## 获取 API 密钥

<Steps>
  <Step title="创建密钥">
    从 [xAI](https://console.x.ai/) 获取 API 密钥。
  </Step>
  <Step title="存储密钥">
    在 Gateway 环境中设置 `XAI_API_KEY`，或通过以下方式配置：

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
            apiKey: "xai-...", // 如果设置了 XAI_API_KEY 则为可选
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

**环境替代方案：** 在 Gateway 环境中设置 `XAI_API_KEY`。
对于 gateway 安装，将其放入 `~/.openclaw/.env`。

## 工作原理

Grok 使用 xAI 网页接地响应来综合答案并带有内联引用，类似于 Gemini 的 Google 搜索接地方法。

## 支持的参数

Grok 搜索支持 `query`。

`count` 可用于共享 `web_search` 兼容性，但 Grok 仍然
返回一个带有引用的综合答案，而不是 N 结果列表。

当前不支持特定于提供商的过滤器。

## 相关内容

- [网页搜索概览](/tools/web) -- 所有提供商和自动检测
- [网页搜索中的 x_search](/tools/web#x_search) -- 通过 xAI 进行一流的 X 搜索
- [Gemini 搜索](/tools/gemini-search) -- 通过 Google 接地生成的 AI 综合答案
