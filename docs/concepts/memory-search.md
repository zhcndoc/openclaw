---
summary: "Memory 搜索如何使用嵌入和混合检索查找相关笔记"
title: "记忆搜索"
read_when:
  - 你想了解 memory_search 是如何工作的
  - 你想选择一个嵌入提供方
  - 你想调优搜索质量
---

`memory_search` 会从你的 memory 文件中查找相关笔记，即使措辞与原文不同也是如此。它会将 memory 分块为较小的片段，并使用嵌入、关键词或两者进行搜索。

## 快速开始

OpenClaw 默认使用 OpenAI embeddings。要使用其他提供商，请显式设置它：

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "openai", // 或 "gemini"、"voyage"、"mistral"、"bedrock"、"local"、"ollama"、"lmstudio"、"github-copilot"、"openai-compatible"
      },
    },
  },
}
```

`provider` 也可以引用自定义的 `models.providers.<id>` 条目（例如
`ollama-5080`），前提是该条目将 `api` 设置为 `"ollama"`，或设置为另一个带有内存嵌入适配器的 provider id。

对于没有 API key 的本地 embeddings，请安装官方的 llama.cpp provider
插件并设置 `provider: "local"`：

```bash
openclaw plugins install @openclaw/llama-cpp-provider
```

源码检出仍然需要本地构建审批：`pnpm approve-builds`，然后执行
`pnpm rebuild node-llama-cpp`。

某些与 OpenAI 兼容的 embedding 端点需要不对称的 `input_type`
标签，例如搜索使用 `"query"`，而索引块使用 `"document"`/`"passage"`。
请使用 `queryInputType` 和 `documentInputType` 来设置它们；请参阅
[内存配置参考](/reference/memory-config#provider-specific-config)。

## 支持的提供方

| 提供方              | ID                  | 需要 API key | 备注                              |
| ------------------- | ------------------- | ------------ | --------------------------------- |
| Bedrock             | `bedrock`           | 否           | 使用 AWS 凭证链                   |
| DeepInfra           | `deepinfra`         | 是           | 默认模型 `BAAI/bge-m3`            |
| Gemini              | `gemini`            | 是           | 支持图片/音频索引                  |
| GitHub Copilot      | `github-copilot`    | 否           | 使用你的 Copilot 订阅              |
| 本地                | `local`             | 否           | GGUF 模型，约 0.6 GB 自动下载      |
| LM Studio           | `lmstudio`          | 否           | 本地/自托管服务器                  |
| Mistral             | `mistral`           | 是           |                                   |
| Ollama              | `ollama`            | 否           | 本地/自托管服务器                  |
| OpenAI              | `openai`            | 是           | 默认                               |
| OpenAI 兼容         | `openai-compatible` | 通常需要      | 通用 `/v1/embeddings` 端点         |
| Voyage              | `voyage`            | 是           |                                   |

## 搜索如何工作

OpenClaw 会并行运行两条检索路径，并合并结果：

```mermaid
flowchart LR
    Q["Query"] --> E["Embedding"]
    Q --> T["标记化"]
    E --> VS["向量搜索"]
    T --> BM["BM25 搜索"]
    VS --> M["加权合并"]
    BM --> M
    M --> R["前排结果"]
```

- **向量搜索** 匹配相似含义（“gateway host” 匹配 “运行 OpenClaw 的
  机器”）。
- **BM25 关键词搜索** 匹配精确术语（ID、错误字符串、配置
  键）。

如果只有一条路径可用，另一条将单独运行。

**仅 FTS 模式。** 设置 `provider: "none"` 可有意禁用嵌入，并仅使用关键词进行搜索。将 `provider` 留空或设为 `"auto"`，如果没有配置嵌入认证，也会回退到仅关键词排名，而不会报错；当 `provider: "local"`（GGUF/llama.cpp
提供方）失败时也是如此。

**显式提供方不可用。** 如果你显式指定了其他任何提供方（例如 `openai`、`ollama`、`gemini`），并且它在请求时变得不可用（认证错误、网络故障），`memory_search` 会报告记忆不可用，而不是静默降级为仅 FTS 结果。这样可以让已损坏的已配置提供方保持可见。若要有意进行仅 FTS 的召回，请设置 `provider: "none"`；或者修复提供方/认证配置以恢复语义排名。

## 提升搜索质量

两个可选功能有助于处理大量笔记历史。

### 时间衰减

旧笔记会逐渐失去排名权重，因此较新的信息会优先显示。
在默认的 30 天半衰期下，来自上个月的笔记得分为其原始权重的 50%。
`MEMORY.md` 和 `memory/` 下其他未标注日期的文件会长期保留，不会衰减；只有带日期的 `memory/YYYY-MM-DD.md` 文件会衰减。

<Tip>
如果你的 agent 有数月的每日笔记，而且过时信息总是比最新上下文排名更高，就启用这个功能。
</Tip>

### MMR（多样性）

减少重复结果。如果有五条笔记都提到了同一个路由器配置，MMR 会确保顶部结果覆盖不同主题，而不是重复出现。

<Tip>
如果 `memory_search` 不断从不同的每日笔记中返回几乎重复的片段，就启用这个功能。
</Tip>

### 同时启用两者

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        query: {
          hybrid: {
            mmr: { enabled: true },
            temporalDecay: { enabled: true },
          },
        },
      },
    },
  },
}
```

## 多模态记忆

借助 `gemini-embedding-2-preview`，你可以将图像和音频与 Markdown 一起编入索引。这仅适用于 `memorySearch.extraPaths` 下的文件；默认的记忆根目录（`MEMORY.md`、`memory/*.md`）仍然只支持 Markdown。搜索查询仍然是文本，但它们可以与视觉和音频内容匹配。有关设置，请参阅[记忆配置参考](/reference/memory-config#multimodal-memory-gemini)。

## 会话记忆搜索

可选地索引会话转录，以便 `memory_search` 能够回忆更早的
对话。这是一个可选功能：设置 `experimental.sessionMemory: true` 并将
`"sessions"` 添加到 `sources` 中（默认的 `sources` 是 `["memory"]`）。

会话命中遵循 `tools.sessions.visibility`：默认的 `"tree"` 只会
暴露当前会话及其派生出的会话。若要从另一个会话中回忆一个无关的
同代理会话（例如，从 DM 中由网关分发的会话），请将可见性扩大到 `"agent"`。

使用 QMD 后端时，还需要设置 `memory.qmd.sessions.enabled: true`，这样
转录内容才会导出到 QMD 集合；仅设置 `experimental.sessionMemory`
和 `sources` 并不会将转录内容导出到 QMD。参见
[配置参考](/reference/memory-config#session-memory-search-experimental)。

## 故障排查

**没有结果？** 运行 `openclaw memory status` 检查索引。如果为空，运行 `openclaw memory index --force`。

**只有关键词匹配？** 你的嵌入提供方可能尚未配置。检查 `openclaw memory status --deep`。

**本地嵌入超时？** `ollama`、`lmstudio` 和 `local` 默认使用更长的
内联批处理超时。如果主机只是较慢，请设置
`agents.defaults.memorySearch.sync.embeddingBatchTimeoutSeconds` 并重新运行
`openclaw memory index --force`。

**找不到 CJK 文本？** 使用 `openclaw memory index --force` 重建 FTS 索引。

## 相关内容

- [内存概述](/concepts/memory)
- [活动内存](/concepts/active-memory)
- [内置内存引擎](/concepts/memory-builtin)
- [内存配置参考](/reference/memory-config)
