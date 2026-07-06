---
summary: "Parallel 搜索——从网页来源提取并针对 LLM 优化的密集摘要"
read_when:
  - 你想在无需 API 密钥的情况下进行网页搜索
  - 你想使用 Parallel 的付费 Search API
  - 你想要适合 LLM 上下文效率的密集摘要
title: "Parallel 搜索"
---

Parallel 插件提供两个 [Parallel](https://parallel.ai/) `web_search`
提供程序，二者都会从为 AI 代理构建的网页索引中返回经过排序、针对 LLM 优化的摘录：

| 提供程序 | id | 认证 |
| ---------------------- | --------------- | ------------------------------------------------------------------------------------------ |
| Parallel Search（免费） | `parallel-free` | 无 -- Parallel 的免费 [Search MCP](https://docs.parallel.ai/integrations/mcp/search-mcp) |
| Parallel Search        | `parallel`      | `PARALLEL_API_KEY` -- 付费 Search API，更高的速率限制和目标调优 |

将 `tools.web.search.provider` 设置为 `parallel-free` 或 `parallel` 以显式选择其中一个；二者都不会被自动检测。

<Note>
  直接使用 OpenAI Responses 模型（`api: "openai-responses"`、提供程序
  `openai`、官方 API base URL）时，当 `tools.web.search.provider` 未设置、为空、为 `"auto"`，
  或为 `"openai"` 时，会自动使用 OpenAI 托管的原生网页搜索——因此默认会绕过 Parallel。将
  `tools.web.search.provider` 设置为 `parallel-free` 或 `parallel`，即可改为通过 Parallel
  路由它们。参见 [Web Search 概览](/tools/web)。
</Note>

## 安装插件

```bash
openclaw plugins install @openclaw/parallel-plugin
openclaw gateway restart
```

## API 密钥（付费提供方）

`parallel-free` 不需要密钥，但仍必须显式选择。付费的
`parallel` 提供方需要 API 密钥：

<Steps>
  <Step title="创建账户">
    在 [platform.parallel.ai](https://platform.parallel.ai) 注册，并
    从仪表板生成 API 密钥。
  </Step>
  <Step title="存储密钥">
    在 Gateway 环境中设置 `PARALLEL_API_KEY`，或通过以下方式配置：

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
      parallel: {
        config: {
          webSearch: {
            apiKey: "par-...", // 如果已设置 PARALLEL_API_KEY，则可选
            baseUrl: "https://api.parallel.ai", // 可选；OpenClaw 会追加 /v1/search
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        // "parallel-free" 用于免费的 Search MCP，或 "parallel" 用于此处显示的
        // 基于付费 API 的提供方。
        provider: "parallel",
      },
    },
  },
}
```

**环境替代方案：** 在 Gateway
环境中设置 `PARALLEL_API_KEY`。对于 gateway 安装，请将其放入 `~/.openclaw/.env`。

## 基础 URL 覆盖

仅适用于付费的 `parallel` 提供方；`parallel-free` 始终使用
`https://search.parallel.ai/mcp` 并忽略此设置。

将 `plugins.entries.parallel.config.webSearch.baseUrl` 设置为通过兼容的代理或备用端点路由付费
请求（例如 Cloudflare AI Gateway）。OpenClaw 会通过在裸主机前加上
`https://` 来规范化它，并在路径尚未以 `/v1/search` 结尾时追加该路径。解析后的
端点是搜索缓存键的一部分，因此来自不同端点的结果绝不会共享。

## 工具参数

Both providers expose Parallel's native search shape so the model fills in a
自然语言目标 plus a few short keyword queries -- the pairing
Parallel [recommends](https://docs.parallel.ai/search/best-practices) for
best results.

<ParamField path="objective" type="string" required>
底层问题或目标的自然语言描述（最多 5000 个字符）。应当自包含。
</ParamField>

<ParamField path="search_queries" type="string[]" required>
简洁的关键词搜索查询，每个 3-6 个词（1-5 项，每项最多 200 个字符）。
为获得最佳结果，请提供 2-3 个不同的查询。
</ParamField>

<ParamField path="count" type="number">
返回的结果数（1-40）。
</ParamField>

<ParamField path="session_id" type="string">
可选的 Parallel 会话 ID，来自先前结果的 `sessionId`。请在同一任务的后续搜索中传入它，以便 Parallel 对相关调用进行分组并改进后续结果。在 `parallel` 上最多 1000 个字符；免费的 `parallel-free` Search MCP 最多 100 个字符。超过限制的 ID 会被丢弃（付费版）或生成新的 ID（免费版）。
</ParamField>

<ParamField path="client_model" type="string">
调用该接口的模型可选标识符（例如 `claude-opus-4-7`、`gpt-5.5`），最多 100 个字符。这样 Parallel 可以根据你的模型能力调整默认设置。请传入当前活动模型的完整 slug；不要缩写为某个家族别名。
</ParamField>

## 说明

- Parallel 会对结果进行排序和压缩，以提升 LLM 推理可用性，而不是面向人类
  点击浏览；因此每条结果应预期为密集摘录，而非整页
  内容。
- 结果摘录会以 `excerpts` 数组返回，同时也会合并到
  `description` 中，以兼容通用的 `web_search` 协议。
- 两个提供方都会返回一个 `session_id`；OpenClaw 会在
  工具负载中将其暴露为 `sessionId`，以便调用方对后续搜索进行分组。
  如果是 Parallel 生成的 session id（即调用方未提供的），则会从
  缓存条目中排除，因为具有相同查询的无关任务不应继承它。
- 来自 Parallel 的 `searchId`、`warnings` 和 `usage` 在存在时都会原样透传。
- OpenClaw 总是将解析后的结果数量传递给 Parallel，作为 `advanced_settings.max_results`（`parallel`），或者在 Parallel 返回固定大小结果后在客户端侧应用 `count`（`parallel-free`）。调用方的 `count` 参数优先，其次是 `tools.web.search.maxResults`，否则使用 OpenClaw 的通用 `web_search` 默认值（5）——而 Parallel 自身 API 的默认值是 10。
- 结果默认缓存 15 分钟（`cacheTtlMinutes`）。
- 当调用方未提供 `session_id` 时，`parallel-free` 会通过其 MCP 握手在每次调用时生成一个新的 `session_id`；在这种情况下，`parallel` 会保持不设置。

## 相关内容

- [Web Search 概览](/tools/web) -- 所有提供方和自动检测
- [Exa 搜索](/tools/exa-search) -- 带内容提取的神经搜索
- [Perplexity 搜索](/tools/perplexity-search) -- 带域名过滤的结构化结果
