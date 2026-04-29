---
summary: "通过 xAI 基于网络的响应进行 Grok 网页搜索"
read_when:
  - 你想使用 Grok 进行 web_search
  - 你需要一个用于网页搜索的 XAI_API_KEY
title: "Grok 搜索"
---

OpenClaw 支持将 Grok 作为 `web_search` 提供方，使用 xAI 基于网络的
响应生成由实时搜索结果支撑并带有引用的 AI 综合答案。

同一个 `XAI_API_KEY` 也可以为内置的 `x_search` 工具提供支持，用于 X
（原 Twitter）帖子搜索。如果你将密钥存储在
`plugins.entries.xai.config.webSearch.apiKey` 下，OpenClaw 现在还会将其
作为捆绑的 xAI 模型提供方的备用密钥。

对于帖子级别的 X 指标，例如转发、回复、收藏或浏览量，请优先使用
`x_search` 并提供精确的帖子 URL 或状态 ID，而不是宽泛的搜索
查询。

## 入门与配置

如果你在以下过程中选择 **Grok**：

- `openclaw onboard`
- `openclaw configure --section web`

OpenClaw 可以显示一个单独的后续步骤，以使用相同的
`XAI_API_KEY` 启用 `x_search`。该后续步骤：

- 仅在你为 `web_search` 选择 Grok 之后出现
- 不是一个独立的顶层网页搜索提供方选择
- 也可以在同一流程中可选地设置 `x_search` 模型

如果你跳过它，之后仍可以在配置中启用或更改 `x_search`。

## 获取 API 密钥

<Steps>
  <Step title="创建密钥">
    从 [xAI](https://console.x.ai/) 获取一个 API 密钥。
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
            apiKey: "xai-...", // 如果已设置 XAI_API_KEY，则为可选项
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
对于 gateway 安装，请将其放在 `~/.openclaw/.env` 中。

## 工作原理

Grok 使用 xAI 基于网络的响应来综合答案，并在行内提供
引用，类似于 Gemini 的 Google Search grounding 方法。

## 支持的参数

Grok 搜索支持 `query`。

`count` 为了兼容共享的 `web_search` 而被接受，但 Grok 仍然
返回一条带引用的综合答案，而不是一个 N 个结果的列表。

目前不支持特定于提供方的过滤器。

## 相关内容

- [Web Search 概览](/tools/web) -- 所有提供方和自动检测
- [Web Search 中的 x_search](/tools/web#x_search) -- 通过 xAI 提供的原生 X 搜索
- [Gemini Search](/tools/gemini-search) -- 通过 Google grounding 生成 AI 综合答案
