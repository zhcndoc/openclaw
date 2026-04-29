---
summary: "通过 Moonshot 网页搜索使用 Kimi 进行 web_search"
read_when:
  - 你想使用 Kimi 进行 web_search
  - 你需要一个 KIMI_API_KEY 或 MOONSHOT_API_KEY
title: "Kimi 搜索"
---

OpenClaw 支持将 Kimi 作为 `web_search` 提供方，使用 Moonshot 网页搜索
生成带有引用的 AI 综合答案。

## 获取 API 密钥

<Steps>
  <Step title="创建密钥">
    从 [Moonshot AI](https://platform.moonshot.cn/) 获取 API 密钥。
  </Step>
  <Step title="存储密钥">
    在 Gateway 环境中设置 `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`，或者
    通过以下方式配置：

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

当你在 `openclaw onboard` 或
`openclaw configure --section web` 期间选择 **Kimi** 时，OpenClaw 还可能会询问：

- Moonshot API 区域：
  - `https://api.moonshot.ai/v1`
  - `https://api.moonshot.cn/v1`
- 默认的 Kimi web-search 模型（默认为 `kimi-k2.6`）

## 配置

```json5
{
  plugins: {
    entries: {
      moonshot: {
        config: {
          webSearch: {
            apiKey: "sk-...", // 如果已设置 KIMI_API_KEY 或 MOONSHOT_API_KEY，则为可选项
            baseUrl: "https://api.moonshot.ai/v1",
            model: "kimi-k2.6",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "kimi",
      },
    },
  },
}
```

如果你在聊天中使用中国区 API 主机（`models.providers.moonshot.baseUrl`：
`https://api.moonshot.cn/v1`），当省略 `tools.web.search.kimi.baseUrl` 时，OpenClaw 也会为 Kimi
`web_search` 复用同一个主机，因此来自
[platform.moonshot.cn](https://platform.moonshot.cn/) 的密钥不会误请求到
国际端点（这通常会返回 HTTP 401）。当你需要不同的搜索基础 URL 时，
请使用 `tools.web.search.kimi.baseUrl` 覆盖。

**环境变量替代方案：** 在
Gateway 环境中设置 `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`。对于 gateway 安装，请将其放入 `~/.openclaw/.env`。

如果省略 `baseUrl`，OpenClaw 默认使用 `https://api.moonshot.ai/v1`。
如果省略 `model`，OpenClaw 默认使用 `kimi-k2.6`。

## 工作原理

Kimi 使用 Moonshot 网页搜索来综合答案并在文中插入引用，
类似于 Gemini 和 Grok 的 grounded response 方法。

## 支持的参数

Kimi 搜索支持 `query`。

`count` 也被共享 `web_search` 兼容性所接受，但 Kimi 仍然
返回一条带有引用的综合答案，而不是 N 条结果列表。

目前不支持特定于提供方的过滤器。

## 相关内容

- [Web Search 概览](/tools/web) -- 所有提供方和自动检测
- [Moonshot AI](/providers/moonshot) -- Moonshot 模型 + Kimi Coding 提供方文档
- [Gemini Search](/tools/gemini-search) -- 通过 Google grounding 生成 AI 综合答案
- [Grok Search](/tools/grok-search) -- 通过 xAI grounding 生成 AI 综合答案
