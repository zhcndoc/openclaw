---
summary: "DuckDuckGo 网页搜索 -- 无密钥回退提供程序（实验性，基于 HTML）"
read_when:
  - 你想要一个不需要 API 密钥的网页搜索提供程序
  - 你想将 DuckDuckGo 用于 web_search
  - 你需要一个零配置的搜索回退方案
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
            safeSearch: "moderate", // "strict"、"moderate" 或 "off"
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

- **无需 API 密钥** - 开箱即用，零配置
- **实验性** - 从 DuckDuckGo 的非 JavaScript HTML
  搜索页面中收集结果，不是官方 API 或 SDK
- **存在机器人挑战风险** - 在高负载或自动化使用下，DuckDuckGo 可能会提供 CAPTCHA 或阻止请求
- **HTML 解析** - 结果依赖于页面结构，可能会在没有
  通知的情况下发生变化
- **自动检测顺序** - DuckDuckGo 是自动检测中第一个无密钥回退项
  （顺序 100）。带已配置密钥的 API 提供程序会先运行，然后是 Ollama Web Search（顺序 110），再然后是 SearXNG（顺序 200）
- **SafeSearch 默认为 moderate**，当未配置时

<Tip>
  对于生产环境使用，建议考虑 [Brave Search](/tools/brave-search)（提供免费层级）
  或其他基于 API 的提供程序。
</Tip>

## 相关内容

- [Web Search 概览](/tools/web) -- 所有提供程序和自动检测
- [Brave Search](/tools/brave-search) -- 带免费层级的结构化结果
- [Exa Search](/tools/exa-search) -- 带内容提取的神经搜索
