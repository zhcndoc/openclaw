---
summary: "Kimi 网络搜索通过 Moonshot 网络搜索"
read_when:
  - "你想使用 Kimi 进行 web_search"
  - "你需要一个 KIMI_API_KEY 或 MOONSHOT_API_KEY"
title: "Kimi 搜索"
---

Kimi 是由 Moonshot 的 `POST /tools/search` 端点支持的 `web_search` 提供商。它返回一个结构化的结果列表，其中包含标题、URL、描述和源元数据。没有使用聊天模型来合成答案。

## <a id="setup"></a> 设置

`moonshot` 插件不随 OpenClaw 一起提供；首先安装它。

<Steps>
  <Step id="install-the-plugin" title="安装插件">
    ```bash
    openclaw plugins install @openclaw/moonshot-provider
    ```

    安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

  </Step>
  <Step id="create-a-key" title="创建密钥">
    从 [Moonshot AI](https://platform.moonshot.cn/) 获取 API 密钥。
  </Step>
  <Step id="store-the-key" title="存储密钥">
    在 Gateway 环境中设置 `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`（对于 gateway 安装，将其添加到 `~/.openclaw/.env`），或者通过以下方式配置：

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

在 `openclaw onboard` 或 `openclaw configure --section web` 期间选择 **Kimi** 还会提示输入 Moonshot API 区域：`https://api.moonshot.ai/v1` 或 `https://api.moonshot.cn/v1`。

## <a id="config"></a> 配置

```json5
{
  plugins: {
    entries: {
      moonshot: {
        config: {
          webSearch: {
            apiKey: "sk-...", // optional if KIMI_API_KEY or MOONSHOT_API_KEY is set
            baseUrl: "https://api.moonshot.ai/v1",
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

`tools.web.search.provider` 在省略时会根据可用的 API 密钥自动检测； 如果配置了多个搜索凭据，请将其显式设置为 `kimi`。

在 `plugins.entries.moonshot.config.webSearch` 下配置 Kimi- 特定的 `apiKey` 和 `baseUrl` 值。

省略时，`baseUrl` 默认为 `https://api.moonshot.ai/v1`。

`plugins.entries.moonshot.config.webSearch.model` 已弃用并被忽略。包含它的现有配置仍然有效；您可以手动删除密钥。医生不会自动将其移除。较旧的 `tools.web.search.kimi` 块已经是旧配置：`openclaw doctor --fix` 将其移动到插件配置中，其中它的 `model` 键同样被忽略。

如果聊天流量使用中国区主机（`models.providers.moonshot.baseUrl`： `https://api.moonshot.cn/v1`），当 Kimi 的 `web_search` 自身的 `baseUrl` 未设置时， 它会自动复用该主机，因此 `.cn` 密钥不会意外访问国际端点（该端点会对这些密钥返回 HTTP 401）。设置显式的 Kimi `baseUrl` 可覆盖此继承行为。

<a id="grounding-requirement" />

## <a id="search-results"></a> 搜索结果

OpenClaw 将 `{ "text_query": "your query", "limit": 5 }` 发送到 `<baseUrl>/tools/search`。请求的 `count` 变为 `limit`。结果显示 `title`、`url`、`description`（来自搜索片段）、`siteName` 和 `published`（如果可用）。标题和描述被包装为不受信任的 Web 内容。空结果列表表示使用 `count: 0` 成功搜索。

这取代了 Moonshot 的聊天完成搜索内置功能，后者将于 2026 年 10 月 20 日停用。搜索计费遵循 Moonshot 的 [ 网络搜索定价 ](https://platform.kimi.ai/docs/pricing/websearch)，而不是所选的聊天模型。

## <a id="tool-parameters"></a> 工具参数

| 参数                                                       | 支持                            |
| --------------------------------------------------------------- | ------------------------------------ |
| `query`                                                         | 是                                  |
| `count`                                                         | 结果数（1–10，默认值：5） |
| `country`, `language`, `freshness`, `date_after`, `date_before` | No                                   |

当省略 `count` 时，适用 `tools.web.search.maxResults`。如果两者均未设置，Kimi 最多返回五个结果。

## <a id="related"></a> 相关内容

- [Web Search 概述](/tools/web) - 所有提供商和自动检测
- [Moonshot AI](/providers/moonshot) - Moonshot 模型 + Kimi Coding 提供商文档
- [Gemini Search](/tools/gemini-search) - AI-通过 Google 接地综合答案
- [Grok Search](/tools/grok-search) - AI- 通过 xAI 接地综合答案
