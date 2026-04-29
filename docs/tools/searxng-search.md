---
summary: "SearXNG 网页搜索 -- 自托管、无密钥元搜索提供商"
read_when:
  - 你希望使用自托管的网页搜索提供商
  - 你希望将 SearXNG 用作 web_search
  - 你需要一个注重隐私或隔离网络环境中的搜索选项
title: "SearXNG 搜索"
---

OpenClaw 支持 [SearXNG](https://docs.searxng.org/) 作为一个**自托管、无密钥**的 `web_search` 提供商。SearXNG 是一个开源元搜索引擎，会聚合来自 Google、Bing、DuckDuckGo 以及其他来源的结果。

优点：

- **免费且无限制** -- 无需 API 密钥或商业订阅
- **隐私 / 隔离网络** -- 查询绝不会离开你的网络
- **到处可用** -- 商业搜索 API 没有地区限制

## 设置

<Steps>
  <Step title="运行一个 SearXNG 实例">
    ```bash
    docker run -d -p 8888:8080 searxng/searxng
    ```

    或者使用你已有权限访问的任何现有 SearXNG 部署。有关生产环境设置，请参阅
    [SearXNG 文档](https://docs.searxng.org/)。

  </Step>
  <Step title="配置">
    ```bash
    openclaw configure --section web
    # 选择 "searxng" 作为提供商
    ```

    或者设置环境变量，让自动检测来发现它：

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

将 `SEARXNG_BASE_URL` 作为配置的替代方案：

```bash
export SEARXNG_BASE_URL="http://localhost:8888"
```

当设置了 `SEARXNG_BASE_URL` 且未显式配置提供商时，自动检测会自动选择 SearXNG（优先级最低 -- 任何带密钥的 API 驱动提供商会优先获胜）。

## 插件配置参考

| 字段         | 说明                                                     |
| ------------ | -------------------------------------------------------- |
| `baseUrl`    | 你的 SearXNG 实例的基础 URL（必填）                      |
| `categories` | 以逗号分隔的分类，例如 `general`、`news` 或 `science`   |
| `language`   | 结果的语言代码，例如 `en`、`de` 或 `fr`                |

## 注意事项

- **JSON API** -- 使用 SearXNG 原生的 `format=json` 端点，而不是 HTML 抓取
- **无 API 密钥** -- 可直接与任何 SearXNG 实例配合使用
- **基础 URL 校验** -- `baseUrl` 必须是有效的 `http://` 或 `https://`
  URL；公共主机必须使用 `https://`
- **自动检测顺序** -- 在自动检测中，SearXNG 最后检查（顺序 200）。先运行已配置密钥的 API 驱动提供商，然后是 DuckDuckGo（顺序 100），再然后是 Ollama Web Search（顺序 110）
- **自托管** -- 你可以控制实例、查询以及上游搜索引擎
- **categories** 未配置时默认为 `general`

<Tip>
  为了让 SearXNG JSON API 正常工作，请确保你的 SearXNG 实例在其 `settings.yml` 的 `search.formats` 下启用了 `json`
  格式。
</Tip>

## 相关内容

- [网页搜索概览](/tools/web) -- 所有提供商和自动检测
- [DuckDuckGo 搜索](/tools/duckduckgo-search) -- 另一个无密钥回退方案
- [Brave 搜索](/tools/brave-search) -- 带免费额度的结构化结果
