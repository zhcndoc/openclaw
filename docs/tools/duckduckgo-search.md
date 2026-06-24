---
summary: "DuckDuckGo 网络搜索 -- 无密钥提供程序（实验性，基于 HTML）"
read_when:
  - 你想要一个不需要 API 密钥的网络搜索提供程序
  - 你想在 web_search 中使用 DuckDuckGo
  - 你想显式选择一个无密钥搜索提供程序
title: "DuckDuckGo 搜索"
---

OpenClaw 支持 DuckDuckGo 作为一个**无密钥**的 `web_search` 提供程序。不需要 API
密钥或账户。

<Warning>
  DuckDuckGo 是一个**实验性、非官方**的集成，它从 DuckDuckGo 的非 JavaScript 搜索页面中获取结果——不是官方 API。预计会偶尔因机器人挑战页面或 HTML 更改而出现故障。
</Warning>

## 设置

无需 API 密钥——只需将 DuckDuckGo 设置为你的提供程序：

<Steps>
  <Step title="配置">
    ```bash
    openclaw configure --section web
    # 选择 "duckduckgo" 作为提供程序
    ```
  </Step>
</Steps>

## 配置

```json5
{
  tools: {
    web: {
      search: {
        provider: "duckduckgo",
      },
    },
  },
}
```

可选的插件级地区和 SafeSearch 设置：

```json5
{
  plugins: {
    entries: {
      duckduckgo: {
        config: {
          webSearch: {
            region: "us-en", // DuckDuckGo 地区代码
            safeSearch: "moderate", // "严格"、"适中" 或 "关闭"
          },
        },
      },
    },
  },
}
```

## 工具参数

<ParamField path="query" type="string" required>
搜索查询。
</ParamField>

<ParamField path="count" type="number" default="5">
返回结果数量（1-10）。
</ParamField>

<ParamField path="region" type="string">
DuckDuckGo 地区代码（例如 `us-en`、`uk-en`、`de-de`）。
</ParamField>

<ParamField path="safeSearch" type="'strict' | 'moderate' | 'off'" default="moderate">
SafeSearch 级别。
</ParamField>

地区和 SafeSearch 也可以在插件配置中设置（见上文）——工具
参数会按每次查询覆盖配置值。

## 注意事项

- **无 API 密钥** - 选择 DuckDuckGo 作为你的 `web_search`
  提供程序后即可使用
- **实验性** - 从 DuckDuckGo 的非 JavaScript HTML
  搜索页面获取结果，而不是官方 API 或 SDK
- **机器人挑战风险** - DuckDuckGo 可能在高频或自动化使用时返回 CAPTCHA 或阻止请求
- **HTML 解析** - 结果依赖于页面结构，而页面结构可能在没有
  通知的情况下更改
- **显式选择** - 当没有配置基于 API 的提供程序时，OpenClaw 不会自动选择 DuckDuckGo
- **未配置时 SafeSearch 默认为适中**

<Tip>
  对于生产环境使用，建议考虑 [Brave Search](/tools/brave-search)（提供免费层级）
  或其他基于 API 的提供程序。
</Tip>

## 相关内容

- [Web Search 概览](/tools/web) -- 所有提供程序和自动检测
- [Brave Search](/tools/brave-search) -- 带免费层级的结构化结果
- [Exa Search](/tools/exa-search) -- 带内容提取的神经搜索
