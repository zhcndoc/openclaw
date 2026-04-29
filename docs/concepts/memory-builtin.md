---
summary: "默认的基于 SQLite 的内存后端，支持关键词、向量和混合搜索"
title: "内置内存引擎"
read_when:
  - 你想了解默认的内存后端
  - 你想配置 embedding 提供商或混合搜索
---

内置引擎是默认的内存后端。它将你的内存索引存储在每个代理各自的 SQLite 数据库中，且无需额外依赖即可开始使用。

## 它提供什么

- **关键词搜索**：通过 FTS5 全文索引（BM25 评分）。
- **向量搜索**：通过任意受支持提供商的 embeddings。
- **混合搜索**：将两者结合以获得最佳结果。
- **CJK 支持**：通过三元组分词支持中文、日文和韩文。
- **sqlite-vec 加速**：用于数据库内向量查询（可选）。

## 快速开始

如果你有 OpenAI、Gemini、Voyage、Mistral 或 DeepInfra 的 API 密钥，内置引擎会自动检测并启用向量搜索。无需配置。

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

如果没有 embedding 提供商，则只能使用关键词搜索。

要强制使用内置的本地 embedding 提供商，请在 OpenClaw 旁边安装可选的
`node-llama-cpp` 运行时包，然后将 `local.modelPath`
指向一个 GGUF 文件：

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

## 支持的 embedding 提供商

| 提供商     | ID          | 自动检测 | 说明                                |
| --------- | ----------- | -------- | ----------------------------------- |
| OpenAI    | `openai`    | 是       | 默认：`text-embedding-3-small`      |
| Gemini    | `gemini`    | 是       | 支持多模态（图像 + 音频）            |
| Voyage    | `voyage`    | 是       |                                     |
| Mistral   | `mistral`   | 是       |                                     |
| DeepInfra | `deepinfra` | 是       | 默认：`BAAI/bge-m3`                 |
| Ollama    | `ollama`    | 否       | 本地，需显式设置                    |
| Local     | `local`     | 是（优先） | 可选的 `node-llama-cpp` 运行时     |

自动检测会按上表顺序，选择第一个可解析出 API 密钥的提供商。设置 `memorySearch.provider` 可覆盖此行为。

## 索引如何工作

OpenClaw 会将 `MEMORY.md` 和 `memory/*.md` 索引为若干块（约 400 个 token，重叠 80 个 token），并将它们存储在每个代理各自的 SQLite 数据库中。

- **索引位置：** `~/.openclaw/memory/<agentId>.sqlite`
- **存储维护：** SQLite WAL 侧车文件会通过定期检查点和关闭时检查点进行限流。
- **文件监视：** 内存文件的更改会触发去抖重新索引（1.5 秒）。
- **自动重新索引：** 当 embedding 提供商、模型或分块配置发生变化时，整个索引会自动重建。
- **按需重新索引：** `openclaw memory index --force`

<Info>
你也可以使用 `memorySearch.extraPaths` 索引工作区外的 Markdown 文件。请参阅
[配置参考](/reference/memory-config#additional-memory-paths)。
</Info>

## 何时使用

对于大多数用户来说，内置引擎是最佳选择：

- 开箱即用，无需额外依赖。
- 对关键词和向量搜索都有良好支持。
- 支持所有 embedding 提供商。
- 混合搜索结合了两种检索方式的优点。

如果你需要重排序、查询扩展，或者想索引工作区外的目录，可以考虑切换到 [QMD](/concepts/memory-qmd)。

如果你想要带有自动用户建模的跨会话内存，可以考虑 [Honcho](/concepts/memory-honcho)。

## 故障排查

**内存搜索已禁用？** 检查 `openclaw memory status`。如果没有检测到提供商，请显式设置一个，或添加 API 密钥。

**本地提供商未检测到？** 确认本地路径存在，然后运行：

```bash
openclaw memory status --deep --agent main
openclaw memory index --force --agent main
```

独立的 CLI 命令和 Gateway 使用相同的 `local` 提供商 ID。
如果提供商设置为 `auto`，则只有当 `memorySearch.local.modelPath` 指向一个存在的本地文件时，才会优先考虑本地 embeddings。

**结果过时？** 运行 `openclaw memory index --force` 进行重建。监视器在极少数边缘情况下可能会漏掉更改。

**sqlite-vec 未加载？** OpenClaw 会自动回退到进程内余弦相似度。
请查看日志以获取具体的加载错误。

## 配置

关于 embedding 提供商设置、混合搜索调优（权重、MMR、时间衰减）、批量索引、多模态内存、sqlite-vec、额外路径以及所有其他配置项，请参阅
[内存配置参考](/reference/memory-config)。

## 相关内容

- [内存概览](/concepts/memory)
- [内存搜索](/concepts/memory-search)
- [活动内存](/concepts/active-memory)
