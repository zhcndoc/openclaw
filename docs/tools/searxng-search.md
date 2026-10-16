---
summary: "SearXNG 网页搜索 -- 自托管、无密钥元搜索提供商"
read_when:
  - "你希望使用自托管的网页搜索提供商"
  - "你希望将 SearXNG 用作 web_search"
  - "你需要一个注重隐私或隔离网络环境中的搜索选项"
title: "SearXNG 搜索"
---

OpenClaw 支持 [SearXNG](https://docs.searxng.org/) 作为一个**自托管、无密钥**的 `web_search` 提供商。SearXNG 是一个开源元搜索引擎，会聚合来自 Google、Bing、DuckDuckGo 以及其他来源的结果。

优点：

- **免费且无限制** -- 无需 API 密钥或商业订阅
- **隐私 / 隔离网络** -- 查询绝不会离开你的网络
- **Works Anywhere** -- 商业搜索 API 无区域限制

## <a id="setup"></a> 设置

<Steps>
  <Step id="install-the-plugin" title="安装插件">
    ```bash
    openclaw plugins install @openclaw/searxng-plugin
    ```

    安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

  </Step>
  <Step id="run-a-searxng-instance" title="运行 SearXNG 实例">
    ```bash
    docker run -d -p 8888:8080 searxng/searxng
    ```

    或者使用你已有权限访问的任何现有 SearXNG 部署。有关生产环境设置，请参阅 [SearXNG 文档](https://docs.searxng.org/)。

  </Step>
  <Step id="configure" title="配置">
    ```bash
    openclaw configure --section web
    # Select "searxng" as the provider
    ```

    或者设置环境变量，让自动检测来发现它：

    ```bash
    export SEARXNG_BASE_URL="http://localhost:8888"
    ```

  </Step>
</Steps>

## <a id="config"></a> 配置

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
            categories: "general,news", // optional
            language: "en", // optional
          },
        },
      },
    },
  },
}
```

`baseUrl` 也接受一个 SecretRef 对象（例如 `{ source: "env", id: "SEARXNG_BASE_URL" }`）。

## <a id="environment-variable"></a> 环境变量

将 `SEARXNG_BASE_URL` 作为配置的替代方案：

```bash
export SEARXNG_BASE_URL="http://localhost:8888"
```

解析顺序：仅当 `baseUrl` 缺失时，配置 `baseUrl`（字符串或允许的环境 SecretRef），然后配置 `SEARXNG_BASE_URL`。只读配置检查块不会落入周围环境的显式 SecretRef；改为修复其提供程序、默认提供程序或 env 允许列表策略。当未设置任何配置路径且存在 `SEARXNG_BASE_URL` 且未选择显式提供程序时，自动检测将选择 SearXNG。

## <a id="plugin-config-reference"></a> 插件配置参考

| 字段        | 描述                                                        |
| ------------ | ------------------------------------------------------------------ |
| `baseUrl`    | 你的 SearXNG 实例的基础 URL（必填）                       |
| `categories` | 以逗号分隔的分类，例如 `general`、`news` 或 `science` |
| `language`   | 结果的语言代码，例如 `en`、`de` 或 `fr`              |

`web_search` 工具调用还接受 `count`（1-10 个结果）、`categories` 和 `language` 作为每次调用的覆盖参数。

## <a id="notes"></a> 说明

- **JSON API** -- 使用 SearXNG 原生的 `format=json` 端点，而不是 HTML 抓取
- **图像结果 URL** -- 当 SearXNG 返回直接图像 URL 时，图像类别结果包括 `img_src`
- **无需 API 密钥** -- 可直接与任何 SearXNG 实例配合使用
- **基础 URL 验证** -- `baseUrl` 必须是有效的 `http://` 或 `https://` URL
- **Network Guard** -- `http://` 基本 URL 必须针对受信任的私有或环回主机（公共主机必须使用 `https://`）；解析为 private/internal 地址的 `https://` 基本 URL 获得相同的自托管配额，而公开解析的 `https://` 基本 URL 保留严格的 SSRF 保护
- **自动检测顺序** -- SearXNG 需要配置 `baseUrl`（在已具备所需凭据的提供方中排序为 200）。像 DuckDuckGo 或 Ollama Web Search 这类无密钥提供方不会隐式赢得自动检测；它们仅在显式选择 `provider` 时激活
- **自托管** -- 你可以控制实例、查询以及上游搜索引擎
- **类别** 在未配置时默认为 `general`
- **类别回退** -- 如果非 `general` 类别请求成功但返回零结果，OpenClaw 会在返回空结果集之前，使用 `general` 再重试一次相同查询
- **结果缓存** -- 相同的查询（相同的 query、count、categories、language 和 base URL）会在进程内缓存一小段 TTL
- **版本要求** -- 该插件声明 `minHostVersion: >=2026.6.9`

<Tip>
  为了使 SearXNG JSON API 正常工作，请确保您的 SearXNG 实例在其 `search.formats` 下的 `settings.yml` 中启用了 `json` 格式。
</Tip>

## <a id="related"></a> 相关内容

- [网页搜索概述](/tools/web) -- 所有提供商和自动检测
- [DuckDuckGo Search](/tools/duckduckgo-search)——另一个无密钥提供商
- [Brave Search](/tools/brave-search) -- 带免费层级的结构化结果
