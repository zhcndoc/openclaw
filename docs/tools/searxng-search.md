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
  <Step title="安装插件">
    ```bash
    openclaw plugins install @openclaw/searxng-plugin
    ```
  </Step>
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

`baseUrl` 也接受一个 SecretRef 对象（例如 `{ source: "env", id: "SEARXNG_BASE_URL" }`）。

## 环境变量

将 `SEARXNG_BASE_URL` 作为配置的替代方案：

```bash
export SEARXNG_BASE_URL="http://localhost:8888"
```

解析顺序：已配置的 `baseUrl` 字符串，其次是 `baseUrl` 上的内联环境变量 SecretRef，然后是 `SEARXNG_BASE_URL`。当未设置任何配置路径且 `SEARXNG_BASE_URL` 存在、同时未显式选择提供方时，自动检测会选择 SearXNG。

## 插件配置参考

| 字段         | 说明                                                     |
| ------------ | -------------------------------------------------------- |
| `baseUrl`    | 你的 SearXNG 实例的基础 URL（必填）                      |
| `categories` | 以逗号分隔的分类，例如 `general`、`news` 或 `science`   |
| `language`   | 结果的语言代码，例如 `en`、`de` 或 `fr`                |

`web_search` 工具调用还接受 `count`（1-10 个结果）、`categories` 和 `language` 作为每次调用的覆盖参数。

## 说明

- **JSON API** -- 使用 SearXNG 原生的 `format=json` 端点，而不是 HTML 抓取
- **图片结果 URL** -- 图片类别结果在 SearXNG 返回直接图片 URL 时会包含 `img_src`
- **无需 API 密钥** -- 可直接与任何 SearXNG 实例配合使用
- **基础 URL 验证** -- `baseUrl` 必须是有效的 `http://` 或 `https://` URL
- **网络保护** -- `http://` 基础 URL 必须指向受信任的私有或回环主机（公网主机必须使用 `https://`）；解析到私有/内部地址的 `https://` 基础 URL 享有相同的自托管许可，而解析到公网的 `https://` 基础 URL 则保持严格的 SSRF 保护
- **自动检测顺序** -- SearXNG 需要配置 `baseUrl`（在已具备所需凭据的提供方中排序为 200）。像 DuckDuckGo 或 Ollama Web Search 这类无密钥提供方不会隐式赢得自动检测；它们仅在显式选择 `provider` 时激活
- **自托管** -- 你可以控制实例、查询以及上游搜索引擎
- **类别** 在未配置时默认为 `general`
- **类别回退** -- 如果非 `general` 类别请求成功但返回零结果，OpenClaw 会在返回空结果集之前，使用 `general` 再重试一次相同查询
- **结果缓存** -- 相同的查询（相同的 query、count、categories、language 和 base URL）会在进程内缓存一小段 TTL
- **版本要求** -- 该插件声明 `minHostVersion: >=2026.6.9`

<Tip>
  为了让 SearXNG JSON API 正常工作，请确保你的 SearXNG 实例在其 `settings.yml` 的 `search.formats` 下启用了 `json`
  格式。
</Tip>

## 相关内容

- [Web Search 概览](/tools/web) -- 所有提供商和自动检测
- [DuckDuckGo 搜索](/tools/duckduckgo-search) -- 另一个无密钥提供商
- [Brave 搜索](/tools/brave-search) -- 具有免费额度的结构化结果
