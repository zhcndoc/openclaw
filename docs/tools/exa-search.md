---
summary: "Exa AI 搜索 -- 通过神经和关键词搜索并进行内容提取"
read_when:
  - 你想将 Exa 用于 web_search
  - 你需要一个 EXA_API_KEY
  - 你想使用神经搜索或内容提取
title: "Exa 搜索"
---

OpenClaw 支持 [Exa AI](https://exa.ai/) 作为 `web_search` 提供方。Exa
提供神经、关键词和混合搜索模式，并内置内容提取（高亮、文本、摘要）。

## 获取 API 密钥

<Steps>
  <Step title="创建账户">
    在 [exa.ai](https://exa.ai/) 注册，并从你的
    控制面板生成 API 密钥。
  </Step>
  <Step title="保存密钥">
    在 Gateway 环境中设置 `EXA_API_KEY`，或通过以下方式配置：

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

## 配置

```json5
{
  plugins: {
    entries: {
      exa: {
        config: {
          webSearch: {
            apiKey: "exa-...", // 如果设置了 EXA_API_KEY，则为可选项
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "exa",
      },
    },
  },
}
```

**环境替代方案：** 在 Gateway 环境中设置 `EXA_API_KEY`。
对于 gateway 安装，将其放入 `~/.openclaw/.env`。

## 工具参数

<ParamField path="query" type="string" required>
搜索查询。
</ParamField>

<ParamField path="count" type="number">
要返回的结果数（1–100）。
</ParamField>

<ParamField path="type" type="'auto' | 'neural' | 'fast' | 'deep' | 'deep-reasoning' | 'instant'">
搜索模式。
</ParamField>

<ParamField path="freshness" type="'day' | 'week' | 'month' | 'year'">
时间筛选。
</ParamField>

<ParamField path="date_after" type="string">
此日期之后的结果（`YYYY-MM-DD`）。
</ParamField>

<ParamField path="date_before" type="string">
此日期之前的结果（`YYYY-MM-DD`）。
</ParamField>

<ParamField path="contents" type="object">
内容提取选项（见下文）。
</ParamField>

### 内容提取

Exa 可以在搜索结果旁返回提取的内容。传入一个 `contents`
对象即可启用：

```javascript
await web_search({
  query: "transformer architecture explained",
  type: "neural",
  contents: {
    text: true, // 完整页面文本
    highlights: { numSentences: 3 }, // 关键句子
    summary: true, // AI 摘要
  },
});
```

| Contents option | Type                                                                  | Description            |
| --------------- | --------------------------------------------------------------------- | ---------------------- |
| `text`          | `boolean \| { maxCharacters }`                                        | 提取完整页面文本 |
| `highlights`    | `boolean \| { maxCharacters, query, numSentences, highlightsPerUrl }` | 提取关键句子  |
| `summary`       | `boolean \| { query }`                                                | AI 生成的摘要   |

### 搜索模式

| Mode             | Description                       |
| ---------------- | --------------------------------- |
| `auto`           | Exa 选择最佳模式（默认） |
| `neural`         | 语义/基于含义的搜索     |
| `fast`           | 快速关键词搜索              |
| `deep`           | 彻底的深度搜索              |
| `deep-reasoning` | 带推理的深度搜索        |
| `instant`        | 最快结果                   |

## 注意事项

- 如果未提供 `contents` 选项，Exa 默认使用 `{ highlights: true }`
  因此结果会包含关键句摘录
- 当可用时，结果会保留来自 Exa API
  响应的 `highlightScores` 和 `summary` 字段
- 结果描述会优先从高亮内容解析，其次是摘要，然后是
  完整文本 —— 以可用者为准
- `freshness` 不能与 `date_after`/`date_before` 组合使用 — 请使用一种
  时间筛选模式
- 每个查询最多可返回 100 条结果（受 Exa 搜索类型
  限制）
- 结果默认缓存 15 分钟（可通过
  `cacheTtlMinutes` 配置）
- Exa 是带有结构化 JSON 响应的官方 API 集成

## 相关内容

- [Web Search 概览](/tools/web) -- 所有提供方和自动检测
- [Brave Search](/tools/brave-search) -- 带国家/语言筛选的结构化结果
- [Perplexity Search](/tools/perplexity-search) -- 带域名筛选的结构化结果
