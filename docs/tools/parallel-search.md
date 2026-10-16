---
summary: "并行搜索——LLM-优化的网络资源密集摘录"
read_when:
  - "你想在无需 API 密钥的情况下进行网页搜索"
  - "你想使用 Parallel 的付费 Search API"
  - "你想要适合 LLM 上下文效率的密集摘要"
title: "Parallel 搜索"
---

Parallel 插件提供了两个 [Parallel](https://parallel.ai/) `web_search` 提供程序，均返回为 AI 代理构建的 Web 索引中的排名 LLM- 优化摘录：

| 提供者               | id              | 认证                                                                                       |
| ---------------------- | --------------- | ------------------------------------------------------------------------------------------ |
| Parallel Search（免费） | `parallel-free` | 无 -- Parallel 的免费 [Search MCP](https://docs.parallel.ai/integrations/mcp/search-mcp) |
| 并行搜索        | `parallel`      | `PARALLEL_API_KEY` -- 付费 Search API，更高的速率限制和目标调优             |

将 `tools.web.search.provider` 设置为 `parallel-free` 或 `parallel` 以明确选择一个。付费并行也可以通过其 API 密钥自动检测；必须明确选择并行搜索（免费）。

<Note>
  直接使用 OpenAI Responses 模型（`api: "openai-responses"`、提供程序 `openai`、官方 API base URL）时，当 `tools.web.search.provider` 未设置、为空、为 `"auto"`， 或为 `"openai"` 时，会自动使用 OpenAI 托管的原生网页搜索——因此默认会绕过 Parallel。将 `tools.web.search.provider` 设置为 `parallel-free` 或 `parallel`，即可改为通过 Parallel 路由它们。参见 [Web Search 概览](/tools/web)。
</Note>

## <a id="install-plugin"></a> 安装插件

```bash
openclaw plugins install @openclaw/parallel-plugin
```

安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

## <a id="api-key-(paid-provider)"></a><a id="api-key-paid-provider"></a> API 密钥（付费提供方）

`parallel-free` 不需要密钥，但仍必须显式选择。付费的 `parallel` 提供方需要 API 密钥：

<Steps>
  <Step id="create-an-account" title="创建一个帐户">
    在 [platform.parallel.ai](https://platform.parallel.ai) 注册，并从仪表板生成 API 密钥。
  </Step>
  <Step id="store-the-key" title="存储密钥">
    在 Gateway 环境中设置 `PARALLEL_API_KEY`，或通过以下方式配置：

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

## <a id="config"></a> 配置

```json5
{
  plugins: {
    entries: {
      parallel: {
        config: {
          webSearch: {
            apiKey: "par-...", // optional if PARALLEL_API_KEY is set
            baseUrl: "https://api.parallel.ai", // optional; OpenClaw appends /v1/search
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        // "parallel-free" for the free Search MCP, or "parallel" for the
        // paid API-backed provider shown here.
        provider: "parallel",
      },
    },
  },
}
```

**环境替代方案：** 在 Gateway 环境中设置 `PARALLEL_API_KEY`。对于 gateway 安装，请将其放入 `~/.openclaw/.env`。

## <a id="base-url-override"></a> 基础 URL 覆盖

仅适用于付费的 `parallel` 提供方；`parallel-free` 始终使用 `https://search.parallel.ai/mcp` 并忽略此设置。

将 `plugins.entries.parallel.config.webSearch.baseUrl` 设置为通过兼容的代理或备用端点路由付费请求（例如 Cloudflare AI Gateway）。OpenClaw 会通过在裸主机前加上 `https://` 来规范化它，并在路径尚未以 `/v1/search` 结尾时追加该路径。解析后的端点是搜索缓存键的一部分，因此来自不同端点的结果绝不会共享。

## <a id="tool-parameters"></a> 工具参数

Both providers expose Parallel's native search shape so the model fills in a 自然语言目标 plus a few short keyword queries -- the pairing Parallel [recommends](https://docs.parallel.ai/search/best-practices) for best results.

<ParamField path="objective" type="string" required>
底层问题或目标的自然语言描述（最多 5000 个字符）。应当自包含。
</ParamField>

<ParamField path="search_queries" type="string[]" required>
简洁的关键词搜索查询，每个 3-6 个词（1-5 项，每项最多 200 个字符）。 为获得最佳结果，请提供 2-3 个不同的查询。
</ParamField>

<ParamField path="count" type="number">
返回的结果数（1-40）。
</ParamField>

<ParamField path="session_id" type="string">
来自先前结果 `sessionId` 的可选并行会话 ID。将其传递到同一任务中的后续搜索，以便并行对相关调用进行分组并改进后续结果。 `parallel` 最多 1000 个字符；免费的 `parallel-free` 搜索 MCP 的上限为 100。超过限制的 ID 将被丢弃（付费）或创建一个新的 ID（免费）。
</ParamField>

<ParamField path="client_model" type="string">
进行调用的模型的可选标识符（e.g. `claude-opus-4-7`、`gpt-6-astra`），最多 100 个字符。让 Parallel 为您的模型功能定制默认设置。传递精确的活动模型段；不要缩写为家庭别名。
</ParamField>

## <a id="notes"></a> 说明

- Parallel 会对结果进行排序和压缩，以提升 LLM 推理可用性，而不是面向人类点击浏览；因此每条结果应预期为密集摘录，而非整页内容。
- 结果摘录会以 `excerpts` 数组返回，同时也会合并到 `description` 中，以兼容通用的 `web_search` 协议。
- 两个提供方都会返回一个 `session_id`；OpenClaw 会在工具负载中将其暴露为 `sessionId`，以便调用方对后续搜索进行分组。 如果是 Parallel 生成的 session id（即调用方未提供的），则会从缓存条目中排除，因为具有相同查询的无关任务不应继承它。
- 来自 Parallel 的 `searchId`、`warnings` 和 `usage` 在存在时都会原样透传。
- OpenClaw 总是将解析后的结果数量传递给 Parallel，作为 `advanced_settings.max_results`（`parallel`），或者在 Parallel 返回固定大小结果后在客户端侧应用 `count`（`parallel-free`）。调用方的 `count` 参数优先，其次是 `tools.web.search.maxResults`，否则使用 OpenClaw 的通用 `web_search` 默认值（5）——而 Parallel 自身 API 的默认值是 10。
- 结果默认缓存 15 分钟（`cacheTtlMinutes`）。
- 当调用者不提供 `parallel-free` 时，每次调用都会通过 MCP 握手铸造一个新的 `session_id`；在这种情况下，`parallel` 会将其保留为未设置。

## <a id="related"></a> 相关内容

- [网页搜索概述](/tools/web) -- 所有提供商和自动检测
- [Exa 搜索](/tools/exa-search) -- 带内容提取的神经搜索
- [Perplexity Search](/tools/perplexity-search) -- 带域过滤的结构化结果
