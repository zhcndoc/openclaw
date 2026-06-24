---
summary: "Parallel 搜索——从网页来源提取并针对 LLM 优化的密集摘要"
read_when:
  - 你想在无需 API 密钥的情况下进行网页搜索
  - 你想使用 Parallel 的付费 Search API
  - 你想要适合 LLM 上下文效率的密集摘要
title: "Parallel 搜索"
---

Parallel 插件提供两个 [Parallel](https://parallel.ai/) `web_search` 提供方：

- **Parallel Search (Free)** (`parallel-free`) -- Parallel 的免费
  [Search MCP](https://docs.parallel.ai/integrations/mcp/search-mcp)。无需
  账户或 API 密钥。当你想使用 Parallel 托管的
  无密钥搜索路径时，请显式选择它。
- **Parallel Search** (`parallel`) -- Parallel 的付费 Search API。需要
  `PARALLEL_API_KEY`，并提供更高的速率限制和更精细的调优。

两者都会从为 AI 代理构建的网页索引中返回排序后的、针对 LLM 优化的摘要。
将 `tools.web.search.provider` 设置为 `parallel-free` 或 `parallel` 即可显式选择其一。

<Note>
  OpenAI Responses 模型在 `tools.web.search.provider` 未设置时会使用 OpenAI 原生网页搜索，
  因此会绕过 Parallel 提供方。将 `tools.web.search.provider` 设置为 `parallel-free` 或 `parallel`
  可让它们通过 Parallel 路由。
</Note>

## 安装插件

安装官方插件，然后重启 Gateway：

```bash
openclaw plugins install @openclaw/parallel-plugin
openclaw gateway restart
```

## API 密钥（付费提供方）

`parallel-free` 不需要 API 密钥，但仍然必须被选为
托管提供方。付费的 `parallel` 提供方需要 API 密钥：

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
        // 对免费的 Search MCP 使用 "parallel-free"，或使用这里展示的
        // 基于付费 API 的提供方 "parallel"。
        provider: "parallel",
      },
    },
  },
}
```

**环境替代方案：** 在 Gateway 环境中设置 `PARALLEL_API_KEY`。
对于 gateway 安装，请将其放入 `~/.openclaw/.env`。

## 基础 URL 覆盖

基础 URL 覆盖仅适用于付费的 `parallel` 提供方。免费的
`parallel-free` 提供方始终使用 `https://search.parallel.ai/mcp`。

当 Parallel 请求应通过兼容代理或其他 Parallel 端点时，
请设置 `plugins.entries.parallel.config.webSearch.baseUrl`（例如，Cloudflare AI Gateway）。
OpenClaw 会通过添加 `https://` 来规范化裸主机，并附加 `/v1/search`，除非路径已以此结尾。
解析后的端点会包含在搜索缓存键中，因此来自不同 Parallel 端点的结果不会共享。

## 工具参数

OpenClaw 公开了 Parallel 的原生搜索结构，因此模型可以同时填写自然语言目标和几个简短的关键词查询——这正是 Parallel
[建议](https://docs.parallel.ai/search/best-practices)用于获得最佳结果的组合。

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
可选的 Parallel 会话 id（`parallel` 上最多 1000 个字符；免费的
`parallel-free` Search MCP 限制为 100）。在后续属于同一任务的搜索中传入先前
Parallel 结果中的 `sessionId`，这样 Parallel 可以分组相关调用并改进后续结果。
超出限制的 id 会被丢弃并生成一个新的 id。
</ParamField>

<ParamField path="client_model" type="string">
发起调用的模型的可选标识符（例如 `claude-opus-4-7`、`gpt-5.5`）。
这能让 Parallel 根据你的模型能力调整默认设置。请传入准确的当前模型 slug；
不要缩短为家族别名。
</ParamField>

## 说明

- Parallel 会根据 LLM 推理效用对结果进行排序和压缩，而不是按人类点击率；因此每个结果中应出现密集摘要，而不是整页内容
- 结果摘要会以 `excerpts` 数组返回，并且也会合并到 `description` 字段中，以兼容通用的 `web_search` 契约
- Parallel 会在每个响应中返回 `session_id`；OpenClaw 会在工具负载中将其作为 `sessionId` 暴露，以便调用方分组后续搜索
- 当存在 `searchId`、`warnings` 和 `usage` 时，Parallel 会原样透传
- OpenClaw 始终会将解析后的结果数量作为 `advanced_settings.max_results` 转发给 Parallel。优先使用调用方的 `count` 参数，其次是顶层 `tools.web.search.maxResults` 设置，否则使用 OpenClaw 的通用 `web_search` 默认值（5）。这能在切换提供方时保持结果数量一致；Parallel 自身默认值为 10
- 结果默认缓存 15 分钟（可通过 `cacheTtlMinutes` 配置）
- 免费的 `parallel-free` 提供方接受相同参数。它会在客户端应用 `count`，并在未提供 `session_id` 时为每次调用生成一个。

## 相关内容

- [Web Search 概览](/tools/web) -- 所有提供方和自动检测
- [Exa 搜索](/tools/exa-search) -- 带内容提取的神经搜索
- [Perplexity 搜索](/tools/perplexity-search) -- 带域名过滤的结构化结果
