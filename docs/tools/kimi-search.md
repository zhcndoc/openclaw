---
summary: "通过 Moonshot 网页搜索使用 Kimi 进行 web_search"
read_when:
  - 你想使用 Kimi 进行 web_search
  - 你需要一个 KIMI_API_KEY 或 MOONSHOT_API_KEY
title: "Kimi 搜索"
---

Kimi 是由 Moonshot 原生网页搜索支持的 `web_search` 提供方。Moonshot
会综合生成一个带行内引用的答案，类似于 Gemini 和 Grok 的
基于事实回答提供方，而不是返回一个按排名排序的结果列表。

## 设置

<Steps>
  <Step title="创建密钥">
    从 [Moonshot AI](https://platform.moonshot.cn/) 获取 API 密钥。
  </Step>
  <Step title="存储密钥">
    在 Gateway 环境中设置 `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`（对于
    gateway 安装，将其添加到 `~/.openclaw/.env`），或者通过以下方式配置：

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

在 `openclaw onboard` 或 `openclaw configure --section web` 期间选择 **Kimi**
也会提示输入：

- Moonshot API 区域：`https://api.moonshot.ai/v1` 或 `https://api.moonshot.cn/v1`
- 网页搜索模型（默认值为 `kimi-k2.6`）

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

`tools.web.search.provider` 在省略时会根据可用的 API 密钥自动检测；
如果配置了多个搜索凭据，请将其显式设置为 `kimi`。

在 `tools.web.search.kimi` 下的等效作用域形式（`apiKey`、`baseUrl`、`model`）
也可正常工作；这两种结构都会合并为同一个解析后的配置。

默认值：省略时 `baseUrl` 默认为 `https://api.moonshot.ai/v1`，`model`
默认为 `kimi-k2.6`。

如果聊天流量使用中国区主机（`models.providers.moonshot.baseUrl`：
`https://api.moonshot.cn/v1`），当 Kimi 的 `web_search` 自身的 `baseUrl` 未设置时，
它会自动复用该主机，因此 `.cn` 密钥不会意外访问
国际端点（该端点会对这些密钥返回 HTTP 401）。设置显式的
Kimi `baseUrl` 可覆盖此继承行为。

## 基于来源的要求

OpenClaw 只有在 Moonshot 的响应包含原生 web-search 基于来源证据时，才会返回一个 Kimi `web_search` 结果，例如 `$web_search` 工具调用回放、`search_results` 或引用 URL。  
如果 Kimi 直接作答且没有基于来源（例如“I cannot browse the internet”），OpenClaw 会返回 `kimi_web_search_ungrounded` 错误，而不是将该文本视为搜索结果。请重试查询，切换到 Brave 等结构化提供方，或者在你已经有目标 URL 时使用 `web_fetch` / 浏览器工具。

## 工具参数

| 参数                                                            | 支持                                                                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `query`                                                         | 是                                                                                                                      |
| `count`                                                         | 为了跨提供方兼容性而接受，但会被忽略：Kimi 始终返回一个综合答案，而不是 N 个结果列表 |
| `country`, `language`, `freshness`, `date_after`, `date_before` | 否                                                                                                                       |

## 相关内容

- [Web Search 概述](/tools/web) - 所有提供商和自动检测
- [Moonshot AI](/providers/moonshot) - Moonshot 模型 + Kimi Coding 提供商文档
- [Gemini Search](/tools/gemini-search) - 通过 Google grounding 提供 AI 综合答案
- [Grok Search](/tools/grok-search) - 通过 xAI grounding 提供 AI 综合答案
