---
summary: "默认的基于 SQLite 的内存后端，支持关键词、向量和混合搜索"
title: "内置内存引擎"
read_when:
  - 你想了解默认的内存后端
  - 你想配置 embedding 提供商或混合搜索
---

内置引擎是默认的内存后端。它将你的记忆索引存储在每个 agent 对应的 SQLite 数据库中，并且无需额外依赖即可开始使用。

## 它提供什么

- 通过 FTS5 全文索引（BM25 评分）进行**关键词搜索**。
- 通过任意受支持的提供商生成的嵌入向量进行**向量搜索**。
- 结合两者以获得最佳结果的**混合搜索**。
- 根据相关性、时效性和写入时重要性进行**确定性排序**。
- **多样性感知排序**，默认对混合结果启用 MMR。
- **可信触发器召回**，无需召回模型即可获取有界的回复前上下文。
- 通过对中文、日文和韩文进行三元组分词实现 **CJK 支持**。
- 使用 **sqlite-vec 加速**数据库内向量查询（可选）。

## 快速开始

默认情况下，内置引擎使用 OpenAI embeddings。如果 `OPENAI_API_KEY` 或
`models.providers.openai.apiKey` 已经配置好，那么向量搜索无需额外的内存配置即可工作。

要显式设置提供商：

```json5
{
  memory: {
    search: {
      provider: "openai",
    },
  },
}
```

如果没有 embedding 提供商，则只能使用关键词搜索。

要强制使用本地 GGUF embeddings，请安装官方的 llama.cpp 提供商
插件，然后将 `local.modelPath` 指向一个 GGUF 文件：

```bash
openclaw plugins install @openclaw/llama-cpp-provider
```

```json5
{
  memory: {
    search: {
      provider: "local",
      fallback: "none",
      local: {
        modelPath: "~/.node-llama-cpp/models/embeddinggemma-300m-qat-Q8_0.gguf",
      },
    },
  },
}
```

## 支持的 embedding 提供商

| 提供商            | ID                  | 备注                                |
| ----------------- | ------------------- | ----------------------------------- |
| Bedrock           | `bedrock`           | 使用 AWS 凭证链                   |
| DeepInfra         | `deepinfra`         | 默认：`BAAI/bge-m3`              |
| Gemini            | `gemini`            | 支持多模态（图像 + 音频） |
| GitHub Copilot    | `github-copilot`    | 使用你的 Copilot 订阅      |
| LM Studio         | `lmstudio`          | 本地/自托管                   |
| Local             | `local`             | `@openclaw/llama-cpp-provider`      |
| Mistral           | `mistral`           |                                     |
| Ollama            | `ollama`            | 本地/自托管                          |
| OpenAI            | `openai`            | 默认：`text-embedding-3-small`       |
| OpenAI-compatible | `openai-compatible` | 通用 `/v1/embeddings` 端点           |
| Voyage            | `voyage`            |                                     |

将 `memory.search.provider` 设置为切换离开 OpenAI。

## 索引如何工作

OpenClaw 会将 `MEMORY.md`、现有的根目录 `USER.md` 以及 `memory/*.md` 索引成
若干块（默认每块 400 个 token，重叠 80 个 token），并将它们存储在
按代理划分的 SQLite 数据库中。OpenClaw 不会自动创建 `USER.md`。

每个块都可以携带可为空的重要性和触发器元数据。空值表示中性，因此旧索引仍然可用。搜索会在应用 MMR 多样性处理之前，结合混合相关性、时间衰减和重要性；触发器召回只会注入经过整理或提升为可信的条目。

每个已索引的块还拥有由 SQLite 管理的来源信息：来源类别（`owner`、`agent`、`untrusted` 或 `system`）、会话类型、观察时间，以及可选的替代键。这些元数据与 Markdown 分开存储，因此被召回的文本不能改写其自身的信任分类。

- **索引位置：** 拥有该索引的代理数据库位于
  `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`
- **存储维护：** SQLite WAL 侧文件会通过定期检查点和关闭时检查点进行限制。
- **文件监听：** 对 memory 文件的更改会触发防抖式重新索引（默认 1.5 秒）。
- **自动重新索引：** 当 embedding 提供方、模型、分块配置、已配置的来源或作用域发生变化时，索引会自动重建。
- **按需重新索引：** `openclaw memory index --force`

<Info>
你也可以通过 `memory.search.extraPaths` 索引工作区之外的 Markdown 文件。参见
[配置参考](/reference/memory-config#additional-memory-paths)。
</Info>

## 何时使用

对于大多数用户来说，内置引擎是最佳选择：

- 开箱即用，无需额外依赖。
- 对关键词和向量搜索都有良好支持。
- 支持所有嵌入提供商。
- 混合搜索结合了两种检索方式的优点。

内置引擎可以使用
`memory.search.extraPaths` 为工作区之外的目录建立索引。它使用有界的词法查询扩展来改善对话记忆召回，但不提供基于学习或模型的相关性重排序阶段。其 MMR 处理过程是确定性的，并且在本地执行。

如果你希望获得带有自动用户建模的跨会话记忆，请考虑 [Honcho](/concepts/memory-honcho)。

## 故障排查

**内存搜索已禁用？** 检查 `openclaw memory status`。如果没有检测到提供商，请显式设置一个，或添加 API 密钥。

**本地提供商未检测到？** 确认本地路径存在，然后运行：

```bash
openclaw memory status --deep --agent main
openclaw memory index --force --agent main
```

独立的 CLI 命令和 Gateway 使用相同的 `local` 提供商 ID。  
当你希望使用本地嵌入时，请设置 `memory.search.provider: "local"`。

**结果过时？** 运行 `openclaw memory index --force` 进行重建。监视器在极少数边缘情况下可能会漏掉更改。

**sqlite-vec 未加载？** OpenClaw 会自动回退到进程内余弦相似度。  
`openclaw memory status --deep` 会分别报告本地向量存储和嵌入提供商，因此 `Vector store:
unavailable` 指向 sqlite-vec 加载问题，而 `Embeddings: unavailable`
指向提供商/认证或模型就绪问题。请检查日志以获取具体的加载
错误。

## 配置

有关嵌入提供商设置、搜索结果限制和阈值、批量索引、多模态记忆、sqlite-vec、额外路径以及所有其他配置项，请参阅
[记忆配置参考](/reference/memory-config)。

## 相关内容

- [内存概览](/concepts/memory)
- [内存搜索](/concepts/memory-search)
- [活动内存](/concepts/active-memory)
