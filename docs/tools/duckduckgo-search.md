---
summary: "DuckDuckGo 网络搜索 -- 无密钥提供程序（实验性，基于 HTML）"
read_when:
  - 你想要一个不需要 API 密钥的网络搜索提供程序
  - 你想在 web_search 中使用 DuckDuckGo
  - 你想显式选择一个无密钥搜索提供程序
title: "DuckDuckGo 搜索"
---

OpenClaw 支持将 DuckDuckGo 作为一个**无密钥**的 `web_search` 提供程序。无需 API 密钥或账号。

<Warning>
  DuckDuckGo 是一个**实验性、非官方**的集成，它会抓取 DuckDuckGo 的非 JavaScript HTML 搜索页面——而不是官方 API。请预期可能会因机器人挑战页面或 HTML 变更而偶尔失效。
</Warning>

## 设置

DuckDuckGo 从不被自动选择，因为自动检测只会考虑具有可用凭据的提供程序。请显式设置它：

<Steps>
  <Step title="配置">
    ```bash
    openclaw configure --section web
    # 选择 "duckduckgo" 作为提供程序
    ```
  </Step>
</Steps>

## 配置

在 config 中直接设置提供程序：

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

`region` 和 `safeSearch` 工具参数会按每次查询覆盖上方的插件配置值。

## 注意事项

- **无 API key** —— 一旦选择 DuckDuckGo 作为 `web_search` 提供程序即可工作。
- **实验性** —— 抓取的是 DuckDuckGo 的非 JavaScript HTML 搜索页面，不是官方 API 或 SDK。结果取决于页面结构，且可能在未通知的情况下发生变化。
- **机器人挑战风险** —— 在高频或自动化使用下，DuckDuckGo 可能会返回 CAPTCHA 或阻止请求。
- **仅可显式选择** —— OpenClaw 的自动检测只会考虑具有可用凭据的提供程序，因此像 DuckDuckGo 这样的免密钥提供程序不会被自动选中；你必须设置 `provider: "duckduckgo"`。
- **SafeSearch 在未配置时默认为 `moderate`**。

<Tip>
  生产环境使用时，建议考虑 [Brave Search](/tools/brave-search)（提供免费层）或其他基于 API 的提供程序。
</Tip>

## 相关内容

- [Web Search 概览](/tools/web) -- 所有提供程序和自动检测
- [Brave Search](/tools/brave-search) -- 带免费层级的结构化结果
- [Exa Search](/tools/exa-search) -- 带内容提取的神经搜索
