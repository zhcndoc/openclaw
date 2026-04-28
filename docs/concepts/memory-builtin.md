---
summary: "默认基于 SQLite 的内存后端，支持关键词、向量和混合搜索"
title: "内置内存引擎"
read_when:
  - 你想了解默认内存后端
  - 你想配置嵌入提供商或混合搜索
---

内置引擎是默认的内存后端。它将你的内存索引存储在按代理划分的 SQLite 数据库中，且无需任何额外依赖即可开始使用。

## 它提供什么

- **关键词搜索** 通过 FTS5 全文索引（BM25 评分）。
- **向量搜索** 通过任何支持的提供商提供的嵌入。
- **混合搜索** 结合两者以获得最佳结果。
- **CJK 支持** 通过三元组分词支持中文、日文和韩文。
- **sqlite-vec 加速** 用于数据库内向量查询（可选）。

## 快速开始

如果你拥有 OpenAI、Gemini、Voyage 或 Mistral 的 API 密钥，内置引擎会自动检测并启用向量搜索。无需配置。

要显式设置提供商：

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "openai",
      },
    },
  },
}
```

如果没有嵌入提供商，则仅可用关键词搜索。

要强制使用内置的本地嵌入提供商，请将 `local.modelPath` 指向一个
GGUF 文件：

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "local",
        fallback: "none",
        local: {
          modelPath: "~/.node-llama-cpp/models/embeddinggemma-300m-qat-Q8_0.gguf",
        },
      },
    },
  },
}
```

## 支持的嵌入提供商

| 提供商 | ID        | 自动检测 | 备注                               |
| -------- | --------- | ------------- | ----------------------------------- |
| OpenAI   | `openai`  | 是           | 默认：`text-embedding-3-small`   |
| Gemini   | `gemini`  | 是           | 支持多模态（图像 + 音频） |
| Voyage   | `voyage`  | 是           |                                     |
| Mistral  | `mistral` | 是           |                                     |
| Ollama   | `ollama`  | 否            | 本地，需显式设置               |
| Local    | `local`   | 是（优先）   | GGUF 模型，约 0.6 GB 下载量        |

自动检测按所示顺序选择第一个可解析 API 密钥的提供商。设置 `memorySearch.provider` 可覆盖此行为。

## 索引工作原理

OpenClaw 将 `MEMORY.md` 和 `memory/*.md` 索引为块（约 400 个 token，重叠 80 个 token），并将它们存储在每个代理独立的 SQLite 数据库中。

- **Index location:** `~/.openclaw/memory/<agentId>.sqlite`
- **Storage maintenance:** SQLite WAL sidecars are bounded with periodic and
  shutdown checkpoints.
- **File watching:** changes to memory files trigger a debounced reindex (1.5s).
- **Auto-reindex:** when the embedding provider, model, or chunking config
  changes, the entire index is rebuilt automatically.
- **Reindex on demand:** `openclaw memory index --force`

<Info>
你也可以使用 `memorySearch.extraPaths` 索引工作区外的 Markdown 文件。请参阅 [配置参考](/reference/memory-config#additional-memory-paths)。
</Info>

## 何时使用

内置引擎是大多数用户的正确选择：

- 开箱即用，无需额外依赖。
- 很好地处理关键词和向量搜索。
- 支持所有嵌入提供商。
- 混合搜索结合了两种检索方法的优势。

如果你需要重排序、查询扩展，或想要索引工作区外的目录，请考虑切换到 [QMD](/concepts/memory-qmd)。

如果你想要带有自动用户建模的跨会话内存，请考虑 [Honcho](/concepts/memory-honcho)。

## 故障排除

**内存搜索已禁用？** 检查 `openclaw memory status`。如果未检测到提供商，请显式设置一个或添加 API 密钥。

**未检测到本地提供商？** 确认本地路径存在，然后运行：

```bash
openclaw memory status --deep --agent main
openclaw memory index --force --agent main
```

独立的 CLI 命令和 Gateway 都使用相同的 `local` 提供商 ID。
如果提供商设置为 `auto`，则仅当 `memorySearch.local.modelPath` 指向
一个存在的本地文件时，才会优先考虑本地嵌入。

**结果过时？** 运行 `openclaw memory index --force` 进行重建。监视器
在少数边缘情况下可能会错过更改。

**sqlite-vec 未加载？** OpenClaw 会自动回退到进程内余弦相似度。检查日志以获取具体的加载错误。

## 配置

有关嵌入提供商设置、混合搜索调优（权重、MMR、时间
衰减）、批量索引、多模态内存、sqlite-vec、额外路径以及所有
其他配置选项，请参阅
[内存配置参考](/reference/memory-config)。

## 相关内容

- [内存概览](/concepts/memory)
- [内存搜索](/concepts/memory-search)
- [活动内存](/concepts/active-memory)
