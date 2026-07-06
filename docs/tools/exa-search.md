---
summary: "Exa AI 搜索 -- 通过神经和关键词搜索并进行内容提取"
read_when:
  - 你想将 Exa 用于 web_search
  - 你需要一个 EXA_API_KEY
  - 你想使用神经搜索或内容提取
title: "Exa 搜索"
---

[Exa AI](https://exa.ai/) 是一个 `web_search` 提供方，支持神经、关键词和
混合搜索模式，并内置内容提取（高亮、文本、
摘要）。

## 安装插件

```bash
openclaw plugins install @openclaw/exa-plugin
openclaw gateway restart
```

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
            apiKey: "exa-...", // 如果设置了 EXA_API_KEY，则为可选
            baseUrl: "https://api.exa.ai", // 可选；OpenClaw 会追加 /search
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

**环境替代方案：** 在 Gateway 环境中设置 `EXA_API_KEY`。对于
Gateway 安装，请将其放入 `~/.openclaw/.env`。参见
[环境变量](/help/faq#env-vars-and-env-loading)。

## 基础 URL 覆盖

将 `plugins.entries.exa.config.webSearch.baseUrl` 设置为通过兼容的代理或其他端点路由 Exa 搜索请求。OpenClaw 会通过添加 `https://` 来规范化裸主机名，并在路径未以 `/search` 结尾时追加 `/search`。解析后的端点会作为搜索缓存键的一部分，因此来自不同端点的结果绝不会共享。

## 工具参数

<ParamField path="query" type="string" required>
搜索查询。
</ParamField>

<ParamField path="count" type="number" default="5">
返回结果数量（1-100，受 Exa 搜索类型限制）。
</ParamField>

<ParamField path="type" type="'auto' | 'neural' | 'fast' | 'deep' | 'deep-reasoning' | 'instant'">
搜索模式。
</ParamField>

<ParamField path="freshness" type="'day' | 'week' | 'month' | 'year'">
时间筛选。不能与 `date_after`/`date_before` 组合使用。
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

传入一个 `contents` 对象来控制结果中提取的内容：

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

| 内容选项 | 类型                                                                  | 描述            |
| --------------- | --------------------------------------------------------------------- | ---------------------- |
| `text`          | `boolean \| { maxCharacters }`                                        | 提取完整页面文本 |
| `highlights`    | `boolean \| { maxCharacters, query, numSentences, highlightsPerUrl }` | 提取关键句子  |
| `summary`       | `boolean \| { query }`                                                | AI 生成的摘要   |

如果省略 `contents`，Exa 默认使用 `{ highlights: true }`，因此结果会
包含关键句子摘录。结果描述会优先取自 highlights，其次是 summary，再次是 full text——
以可用的最先项为准。结果还会在可用时保留来自 Exa API
响应的原始 `highlightScores` 和 `summary` 字段。

### 搜索模式

| 模式             | 描述                       |
| ---------------- | --------------------------------- |
| `auto`           | Exa 选择最佳模式（默认） |
| `neural`         | 语义/基于含义的搜索     |
| `fast`           | 快速关键词搜索              |
| `deep`           | 彻底的深度搜索              |
| `deep-reasoning` | 带推理的深度搜索        |
| `instant`        | 最快结果                   |

## 注意事项

- `count` 最多可接受 100，受 Exa 搜索类型限制约束。
- 结果默认缓存 15 分钟。可配置共享的
  `tools.web.search.cacheTtlMinutes`（分钟）和
  `tools.web.search.timeoutSeconds`（默认 30 秒），以更改所有 `web_search` 提供方（包括 Exa）的缓存和
  请求超时。

## 相关内容

- [Web Search 概览](/tools/web) -- 所有提供方和自动检测
- [Brave Search](/tools/brave-search) -- 带国家/语言筛选的结构化结果
- [Perplexity Search](/tools/perplexity-search) -- 带域名筛选的结构化结果
