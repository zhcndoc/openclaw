---
summary: "SearXNG 网络搜索 -- 自托管、免密钥的元搜索提供商"
read_when:
  - 你想要一个自托管的网络搜索提供商
  - 你想在 web_search 中使用 SearXNG
  - 你需要一个注重隐私或空气隔离的搜索选项
title: "SearXNG 搜索"
---

OpenClaw 支持 [SearXNG](https://docs.searxng.org/) 作为一个 **自托管、免密钥** 的 `web_search` 提供商。SearXNG 是一个开源元搜索引擎，可聚合来自 Google、Bing、DuckDuckGo 以及其他来源的结果。

优点：

- **免费且无限制** -- 无需 API 密钥或商业订阅
- **隐私 / 空气隔离** -- 查询永远不会离开你的网络
- **适用于任何地方** -- 不受商业搜索 API 的地域限制

## 设置

<Steps>
  <Step title="运行一个 SearXNG 实例">
    ```bash
    docker run -d -p 8888:8080 searxng/searxng
    ```

    或使用你可以访问的任何现有 SearXNG 部署。有关生产环境设置，请参阅
    [SearXNG 文档](https://docs.searxng.org/)。

  </Step>
  <Step title="配置">
    ```bash
    openclaw configure --section web
    # 选择 "searxng" 作为提供商
    ```

    或设置环境变量并让自动检测找到它：

    ```bash
    export SEARXNG_BASE_URL="http://localhost:8888"
    ```

  </Step>
</Steps>

## 配置

```json5
{
  tools: {
    web: {
      search: {
        provider: "searxng",
      },
    },
  },
}
```

SearXNG 实例的插件级设置：

```json5
{
  plugins: {
    entries: {
      searxng: {
        config: {
          webSearch: {
            baseUrl: "http://localhost:8888",
            categories: "general,news", // 可选
            language: "en", // 可选
          },
        },
      },
    },
  },
}
```

`baseUrl` 字段也接受 SecretRef 对象。

传输规则：

- `https://` 适用于公共或私有的 SearXNG 主机
- `http://` 仅接受受信任的私有网络或回环主机
- 公共 SearXNG 主机必须使用 `https://`

## 环境变量

将 `SEARXNG_BASE_URL` 设为配置的替代方案：

```bash
export SEARXNG_BASE_URL="http://localhost:8888"
```

当设置了 `SEARXNG_BASE_URL` 且未显式配置提供商时，自动检测会自动选择 SearXNG（优先级最低 -- 任何已配置密钥的 API 驱动提供商会优先命中）。

## 插件配置参考

| 字段         | 描述                                                         |
| ------------ | ------------------------------------------------------------ |
| `baseUrl`    | 你的 SearXNG 实例的基础 URL（必需）                          |
| `categories` | 以逗号分隔的分类，例如 `general`、`news` 或 `science`       |
| `language`   | 结果所使用的语言代码，例如 `en`、`de` 或 `fr`               |

## 注意事项

- **JSON API** -- 使用 SearXNG 原生的 `format=json` 端点，而不是 HTML 抓取
- **无需 API 密钥** -- 开箱即用，适用于任何 SearXNG 实例
- **基础 URL 验证** -- `baseUrl` 必须是有效的 `http://` 或 `https://`
  URL；公共主机必须使用 `https://`
- **自动检测顺序** -- SearXNG 在自动检测中最后检查（顺序 200）。首先运行的是已配置密钥的 API 驱动提供商，然后是 DuckDuckGo（顺序 100），再然后是 Ollama Web Search（顺序 110）
- **自托管** -- 你可以控制实例、查询以及上游搜索引擎
- **Categories** 未配置时默认为 `general`

<Tip>
  要使 SearXNG JSON API 正常工作，请确保你的 SearXNG 实例已在 `settings.yml` 的 `search.formats` 下启用 `json`
  格式。
</Tip>

## 相关内容

- [Web Search 概览](/tools/web) -- 所有提供商和自动检测
- [DuckDuckGo Search](/tools/duckduckgo-search) -- 另一种免密钥回退方案
- [Brave Search](/tools/brave-search) -- 带免费额度的结构化结果
