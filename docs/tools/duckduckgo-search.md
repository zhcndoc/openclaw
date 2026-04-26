---
summary: "DuckDuckGo 网页搜索 -- 无密钥回退提供商（实验性，基于 HTML）"
read_when:
  - 你想要一个不需要 API 密钥的网页搜索提供商
  - 你想将 DuckDuckGo 用于 web_search
  - 你需要一个零配置的搜索回退方案
title: "DuckDuckGo 搜索"
---

OpenClaw 支持 DuckDuckGo 作为一个**无密钥**的 `web_search` 提供商。无需 API
密钥或账户。

<Warning>
  DuckDuckGo 是一个**实验性、非官方**的集成，它从 DuckDuckGo 的非 JavaScript 搜索页面中抓取结果 —— 不是官方 API。请预期
  可能会因机器人挑战页面或 HTML 变化而偶尔失效。
</Warning>

## 设置

无需 API 密钥 —— 只需将 DuckDuckGo 设置为你的提供商：

<Steps>
  <Step title="配置">
    ```bash
    openclaw configure --section web
    # 选择 "duckduckgo" 作为提供商
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

可选的插件级区域和 SafeSearch 设置：

```json5
{
  plugins: {
    entries: {
      duckduckgo: {
        config: {
          webSearch: {
            region: "us-en", // DuckDuckGo 区域代码
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
要返回的结果数量（1–10）。
</ParamField>

<ParamField path="region" type="string">
DuckDuckGo 区域代码（例如 `us-en`、`uk-en`、`de-de`）。
</ParamField>

<ParamField path="safeSearch" type="'strict' | 'moderate' | 'off'" default="moderate">
SafeSearch 级别。
</ParamField>

区域和 SafeSearch 也可以在插件配置中设置（见上文）——工具
参数会按查询覆盖配置值。

## 说明

- **无需 API 密钥** — 开箱即用，零配置
- **实验性** — 从 DuckDuckGo 的非 JavaScript HTML
  搜索页面获取结果，不是官方 API 或 SDK
- **机器人挑战风险** — DuckDuckGo 可能在高负载或自动化使用下返回 CAPTCHA 或阻止请求
- **HTML 解析** — 结果取决于页面结构，该结构可能在没有
  通知的情况下变化
- **自动检测顺序** — DuckDuckGo 是自动检测中的第一个无密钥回退
  （顺序 100）。带有已配置密钥的 API 提供商会先运行，
  然后是 Ollama Web Search（顺序 110），再然后是 SearXNG（顺序 200）
- **未配置时 SafeSearch 默认为 moderate**

<Tip>
  在生产环境中使用时，建议考虑 [Brave Search](/tools/brave-search)（有免费层
  可用）或其他基于 API 的提供商。
</Tip>

## 相关内容

- [Web Search overview](/tools/web) -- 所有提供商和自动检测
- [Brave Search](/tools/brave-search) -- 带免费层的结构化结果
- [Exa Search](/tools/exa-search) -- 带内容提取的神经搜索
