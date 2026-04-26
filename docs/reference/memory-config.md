---
summary: "内存搜索、嵌入提供商、QMD、混合搜索和多模态索引的所有配置选项"
title: "内存配置参考"
read_when:
  - 想要配置内存搜索提供商或嵌入模型
  - 想要设置 QMD 后端
  - 想要调整混合搜索、MMR 或时间衰减
  - 想要启用多模态内存索引
---

本页列出了 OpenClaw 内存搜索的每一个配置选项。有关概念性概述，请参见：

- [内存概述](/concepts/memory) -- 内存如何工作
- [内置引擎](/concepts/memory-builtin) -- 默认 SQLite 后端
- [QMD 引擎](/concepts/memory-qmd) -- 本地优先侧车
- [内存搜索](/concepts/memory-search) -- 搜索管道和调优
- [活跃内存](/concepts/active-memory) -- 为交互式会话启用内存子代理

除非另有说明，所有内存搜索设置都位于 `openclaw.json` 中的 `agents.defaults.memorySearch` 下。

如果您正在寻找 **活跃内存** 功能开关和子代理配置，
它位于 `plugins.entries.active-memory` 下，而不是 `memorySearch`。

活跃内存使用双门模型：

1. 插件必须启用并针对当前代理 ID
2. 请求必须是符合条件的交互式持久聊天会话

参见 [活跃内存](/concepts/active-memory) 了解激活模型、
插件拥有的配置、转录持久性和安全推出模式。

---

## 提供商选择

| Key        | Type      | Default          | Description                                                                                                   |
| ---------- | --------- | ---------------- | ------------------------------------------------------------------------------------------------------------- |
| `provider` | `string`  | auto-detected    | 嵌入适配器 ID：`bedrock`、`gemini`、`github-copilot`、`local`、`mistral`、`ollama`、`openai`、`voyage` |
| `model`    | `string`  | provider default | 嵌入模型名称                                                                                                  |
| `fallback` | `string`  | `"none"`         | 主提供商失败时的回退适配器 ID                                                                                |
| `enabled`  | `boolean` | `true`           | 启用或禁用内存搜索                                                                                           |

### 自动检测顺序

当未设置 `provider` 时，OpenClaw 选择第一个可用的：

1. `local` -- 如果配置了 `memorySearch.local.modelPath` 且文件存在。
2. `github-copilot` -- 如果可以解析出 GitHub Copilot 令牌（环境变量或认证配置文件）。
3. `openai` -- 如果可以解析出 OpenAI 密钥。
4. `gemini` -- 如果可以解析出 Gemini 密钥。
5. `voyage` -- 如果可以解析出 Voyage 密钥。
6. `mistral` -- 如果可以解析出 Mistral 密钥。
7. `bedrock` -- 如果 AWS SDK 凭证链可以解析（实例角色、访问密钥、配置文件、SSO、Web 身份令牌或共享配置）。

支持 `ollama` 但不会自动检测（需显式设置）。

### API 密钥解析

远程嵌入需要 API 密钥。Bedrock 使用 AWS SDK 默认
凭证链代替（实例角色、SSO、访问密钥）。

| Provider       | Env var                                            | Config key                        |
| -------------- | -------------------------------------------------- | --------------------------------- |
| Bedrock        | AWS credential chain                               | 不需要 API 密钥                  |
| Gemini         | `GEMINI_API_KEY`                                   | `models.providers.google.apiKey`  |
| GitHub Copilot | `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, `GITHUB_TOKEN` | 通过设备登录的认证配置文件       |
| Mistral        | `MISTRAL_API_KEY`                                  | `models.providers.mistral.apiKey` |
| Ollama         | `OLLAMA_API_KEY` (placeholder)                     | --                                |
| OpenAI         | `OPENAI_API_KEY`                                   | `models.providers.openai.apiKey`  |
| Voyage         | `VOYAGE_API_KEY`                                   | `models.providers.voyage.apiKey`  |

Codex OAuth 仅涵盖 chat/completions，不满足嵌入请求。

---

## 远程端点配置

用于自定义兼容 OpenAI 的端点或覆盖提供商默认值：

| 键               | 类型     | 描述                                           |
| ---------------- | -------- | ---------------------------------------------- |
| `remote.baseUrl` | `string` | 自定义 API 基础 URL                            |
| `remote.apiKey`  | `string` | 覆盖 API 密钥                                  |
| `remote.headers` | `object` | 额外 HTTP 头（与提供商默认值合并）             |

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "openai",
        model: "text-embedding-3-small",
        remote: {
          baseUrl: "https://api.example.com/v1/",
          apiKey: "YOUR_KEY",
        },
      },
    },
  },
}
```

---

## Gemini 特定配置

| 键                     | 类型     | 默认值                 | 描述                                   |
| ---------------------- | -------- | ---------------------- | -------------------------------------- |
| `model`                | `string` | `gemini-embedding-001` | 也支持 `gemini-embedding-2-preview`    |
| `outputDimensionality` | `number` | `3072`                 | 对于 Embedding 2：768、1536 或 3072    |

<Warning>
更改模型或 `outputDimensionality` 会触发自动全量重新索引。
</Warning>

---

## Bedrock 嵌入配置

Bedrock 使用 AWS SDK 默认凭证链 -- 不需要 API 密钥。
如果 OpenClaw 在具有启用 Bedrock 实例角色的 EC2 上运行，只需设置
提供商和模型：

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "bedrock",
        model: "amazon.titan-embed-text-v2:0",
      },
    },
  },
}
```

| 键                     | 类型     | 默认值                         | 描述                              |
| ---------------------- | -------- | ------------------------------ | --------------------------------- |
| `model`                | `string` | `amazon.titan-embed-text-v2:0` | 任何 Bedrock 嵌入模型 ID          |
| `outputDimensionality` | `number` | 模型默认                       | 对于 Titan V2：256、512 或 1024   |

### 支持的模型

支持以下模型（具有家族检测和维度默认值）：

| 模型 ID                                    | 提供商     | 默认维度     | 可配置维度           |
| ------------------------------------------ | ---------- | ------------ | -------------------- |
| `amazon.titan-embed-text-v2:0`             | Amazon     | 1024         | 256, 512, 1024       |
| `amazon.titan-embed-text-v1`               | Amazon     | 1536         | --                   |
| `amazon.titan-embed-g1-text-02`            | Amazon     | 1536         | --                   |
| `amazon.titan-embed-image-v1`              | Amazon     | 1024         | --                   |
| `amazon.nova-2-multimodal-embeddings-v1:0` | Amazon     | 1024         | 256, 384, 1024, 3072 |
| `cohere.embed-english-v3`                  | Cohere     | 1024         | --                   |
| `cohere.embed-multilingual-v3`             | Cohere     | 1024         | --                   |
| `cohere.embed-v4:0`                        | Cohere     | 1536         | 256-1536             |
| `twelvelabs.marengo-embed-3-0-v1:0`        | TwelveLabs | 512          | --                   |
| `twelvelabs.marengo-embed-2-7-v1:0`        | TwelveLabs | 1024         | --                   |

带有吞吐量后缀的变体（例如，`amazon.titan-embed-text-v1:2:8k`）继承
基础模型的配置。

### 认证

Bedrock 认证使用标准 AWS SDK 凭证解析顺序：

1. 环境变量 (`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`)
2. SSO 令牌缓存
3. Web 身份令牌凭证
4. 共享凭证和配置文件
5. ECS 或 EC2 元数据凭证

区域从 `AWS_REGION`、`AWS_DEFAULT_REGION`、
`amazon-bedrock` 提供商 `baseUrl` 解析，或默认为 `us-east-1`。

### IAM 权限

IAM 角色或用户需要：

```json
{
  "Effect": "Allow",
  "Action": "bedrock:InvokeModel",
  "Resource": "*"
}
```

对于最小权限，将 `InvokeModel` 限定到特定模型：

```
arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0
```

---

## 本地嵌入配置

| Key                   | Type               | Default                | Description                                                                                                                                                                                                                                                                                                          |
| --------------------- | ------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `local.modelPath`     | `string`           | auto-downloaded        | GGUF 模型文件路径                                                                                                                                                                                                                                                                                                   |
| `local.modelCacheDir` | `string`           | node-llama-cpp default | 已下载模型的缓存目录                                                                                                                                                                                                                                                                                                |
| `local.contextSize`   | `number \| "auto"` | `4096`                 | 嵌入上下文的上下文窗口大小。4096 覆盖典型块（128–512 tokens），同时限制非权重显存。在受限主机上可降至 1024–2048。`"auto"` 使用模型训练时的最大值——不建议用于 8B+ 模型（Qwen3-Embedding-8B：40 960 tokens → 约 32 GB 显存，而 4096 时约 8.8 GB）。 |

默认模型：`embeddinggemma-300m-qat-Q8_0.gguf`（约 0.6 GB，自动下载）。
需要原生构建：`pnpm approve-builds` 然后 `pnpm rebuild node-llama-cpp`。

使用独立 CLI 验证 Gateway 使用的相同提供商路径：

```bash
openclaw memory status --deep --agent main
openclaw memory index --force --agent main
```

如果 `provider` 为 `auto`，则仅当 `local.modelPath` 指向
一个现有的本地文件时才会选择 `local`。`hf:` 和 HTTP(S) 模型引用仍然可以
在 `provider: "local"` 时显式使用，但在模型尚未位于磁盘上之前，
它们不会让 `auto` 选择 `local`。

---

## 混合搜索配置

全部位于 `memorySearch.query.hybrid` 下：

| 键                    | 类型      | 默认值  | 描述                             |
| --------------------- | --------- | ------- | -------------------------------- |
| `enabled`             | `boolean` | `true`  | 启用混合 BM25 + 向量搜索         |
| `vectorWeight`        | `number`  | `0.7`   | 向量分数的权重 (0-1)             |
| `textWeight`          | `number`  | `0.3`   | BM25 分数的权重 (0-1)            |
| `candidateMultiplier` | `number`  | `4`     | 候选池大小乘数                   |

### MMR（多样性）

| 键            | 类型      | 默认值  | 描述                             |
| ------------- | --------- | ------- | -------------------------------- |
| `mmr.enabled` | `boolean` | `false` | 启用 MMR 重新排序                |
| `mmr.lambda`  | `number`  | `0.7`   | 0 = 最大多样性，1 = 最大相关性   |

### 时间衰减（近期性）

| 键                           | 类型      | 默认值  | 描述                  |
| ---------------------------- | --------- | ------- | --------------------- |
| `temporalDecay.enabled`      | `boolean` | `false` | 启用近期性提升        |
| `temporalDecay.halfLifeDays` | `number`  | `30`    | 分数每 N 天减半       |

常青文件（`MEMORY.md`，`memory/` 中无日期的文件）永远不会衰减。

### 完整示例

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        query: {
          hybrid: {
            vectorWeight: 0.7,
            textWeight: 0.3,
            mmr: { enabled: true, lambda: 0.7 },
            temporalDecay: { enabled: true, halfLifeDays: 30 },
          },
        },
      },
    },
  },
}
```

---

## 额外内存路径

| 键           | 类型       | 描述                             |
| ------------ | ---------- | -------------------------------- |
| `extraPaths` | `string[]` | 要索引的额外目录或文件           |

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        extraPaths: ["../team-docs", "/srv/shared-notes"],
      },
    },
  },
}
```

路径可以是绝对路径或相对于工作区的路径。目录会被递归扫描以查找 `.md` 文件。符号链接的处理取决于活动的后端：内置引擎会忽略符号链接，而 QMD 则遵循底层 QMD 扫描器的行为。

对于代理范围内的跨代理转录搜索，请使用 `agents.list[].memorySearch.qmd.extraCollections` 而不是 `memory.qmd.paths`。这些额外集合遵循相同的 `{ path, name, pattern? }` 结构，但它们是按代理合并的，并且当路径指向当前工作区之外时，可以保留显式的共享名称。如果同一个解析后的路径同时出现在 `memory.qmd.paths` 和 `memorySearch.qmd.extraCollections` 中，QMD 会保留第一个条目并跳过重复项。

---

## 多模态内存 (Gemini)

使用 Gemini Embedding 2 索引 Markdown 旁边的图片和音频：

| 键                        | 类型       | 默认值     | 描述                             |
| ------------------------- | ---------- | ---------- | -------------------------------- |
| `multimodal.enabled`      | `boolean`  | `false`    | 启用多模态索引                   |
| `multimodal.modalities`   | `string[]` | --         | `["image"]`、`["audio"]` 或 `["all"]` |
| `multimodal.maxFileBytes` | `number`   | `10000000` | 索引的最大文件大小               |

仅适用于 `extraPaths` 中的文件。默认内存根目录保持仅 Markdown。
需要 `gemini-embedding-2-preview`。`fallback` 必须为 `"none"`。

支持的格式：`.jpg`、`.jpeg`、`.png`、`.webp`、`.gif`、`.heic`、`.heif`（图片）；`.mp3`、`.wav`、`.ogg`、`.opus`、`.m4a`、`.aac`、`.flac`（音频）。

---

## 嵌入缓存

| 键               | 类型      | 默认值  | 描述                           |
| ---------------- | --------- | ------- | ------------------------------ |
| `cache.enabled`  | `boolean` | `false` | 在 SQLite 中缓存块嵌入         |
| `cache.maxEntries` | `number`  | `50000` | 最大缓存嵌入数                 |

防止在重新索引或转录更新期间重新嵌入未更改的文本。

---

## 批量索引

| 键                            | 类型      | 默认值  | 描述                   |
| ----------------------------- | --------- | ------- | ---------------------- |
| `remote.batch.enabled`        | `boolean` | `false` | 启用批量嵌入 API       |
| `remote.batch.concurrency`    | `number`  | `2`     | 并行批处理作业         |
| `remote.batch.wait`           | `boolean` | `true`  | 等待批处理完成         |
| `remote.batch.pollIntervalMs` | `number`  | --      | 轮询间隔               |
| `remote.batch.timeoutMinutes` | `number`  | --      | 批处理超时             |

适用于 `openai`、`gemini` 和 `voyage`。OpenAI 批量通常是大型回填最快且最便宜的。

---

## 会话内存搜索（实验性）

索引会话转录文本并通过 `memory_search` 展示它们：

| 键                            | 类型       | 默认值       | 描述                                |
| ----------------------------- | ---------- | ------------ | ----------------------------------- |
| `experimental.sessionMemory`  | `boolean`  | `false`      | 启用会话索引                        |
| `sources`                     | `string[]` | `["memory"]` | 添加 `"sessions"` 以包含转录文本    |
| `sync.sessions.deltaBytes`    | `number`   | `100000`     | 重新索引的字节阈值                  |
| `sync.sessions.deltaMessages` | `number`   | `50`         | 重新索引的消息阈值                  |

会话索引是可选的并异步运行。结果可能略有滞后。会话日志存储在磁盘上，因此将文件系统访问视为信任边界。

---

## SQLite 向量加速 (sqlite-vec)

| 键                          | 类型      | 默认值  | 描述                       |
| ---------------------------- | --------- | ------- | --------------------------------- |
| `store.vector.enabled`       | `boolean` | `true`  | 使用 sqlite-vec 进行向量查询 |
| `store.vector.extensionPath` | `string`  | `bundled` | 覆盖 sqlite-vec 路径          |

当 sqlite-vec 不可用时，OpenClaw 会自动回退到进程内余弦相似度计算。

---

## 索引存储

| 键                   | 类型     | 默认值                               | 描述                                 |
| --------------------- | -------- | ------------------------------------- | ------------------------------------------- |
| `store.path`          | `string` | `~/.openclaw/memory/{agentId}.sqlite` | 索引位置（支持 `{agentId}` 占位符） |
| `store.fts.tokenizer` | `string` | `unicode61`                           | FTS5 分词器（`unicode61` 或 `trigram`）   |

---

## QMD 后端配置

设置 `memory.backend = "qmd"` 以启用。所有 QMD 设置均位于 `memory.qmd` 下：

| 键                      | 类型      | 默认值   | 描述                                  |
| ------------------------ | --------- | -------- | -------------------------------------------- |
| `command`                | `string`  | `qmd`    | QMD 可执行文件路径                          |
| `searchMode`             | `string`  | `search` | 搜索命令：`search`, `vsearch`, `query` |
| `includeDefaultMemory`   | `boolean` | `true`   | 自动索引 `MEMORY.md` + `memory/**/*.md`    |
| `paths[]`                | `array`   | --       | 额外路径：`{ name, path, pattern? }`      |
| `sessions.enabled`       | `boolean` | `false`  | 索引会话转录                    |
| `sessions.retentionDays` | `number`  | --       | 转录保留                         |
| `sessions.exportDir`     | `string`  | --       | 导出目录                             |

OpenClaw 首选当前的 QMD 集合和 MCP 查询结构，但在需要时会通过回退到遗留的 `--mask` 集合标志和旧的 MCP 工具名称来保持旧的 QMD 版本正常工作。

QMD 模型覆盖保留在 QMD 端，而非 OpenClaw 配置。如果您需要全局覆盖 QMD 的模型，请在网关运行环境中设置环境变量，例如 `QMD_EMBED_MODEL`、`QMD_RERANK_MODEL` 和 `QMD_GENERATE_MODEL`。

### 更新计划

| 键                       | 类型      | 默认值  | 描述                           |
| ------------------------- | --------- | ------- | ------------------------------------- |
| `update.interval`         | `string`  | `5m`    | 刷新间隔                      |
| `update.debounceMs`       | `number`  | `15000` | 文件变更防抖                 |
| `update.onBoot`           | `boolean` | `true`  | 启动时刷新                    |
| `update.waitForBootSync`  | `boolean` | `false` | 阻塞启动直到刷新完成 |
| `update.embedInterval`    | `string`  | --      | 独立嵌入节奏                |
| `update.commandTimeoutMs` | `number`  | --      | QMD 命令超时              |
| `update.updateTimeoutMs`  | `number`  | --      | QMD 更新操作超时     |
| `update.embedTimeoutMs`   | `number`  | --      | QMD 嵌入操作超时      |

### 限制

| 键                       | 类型     | 默认值  | 描述                |
| ------------------------- | -------- | ------- | -------------------------- |
| `limits.maxResults`       | `number` | `6`     | 最大搜索结果数         |
| `limits.maxSnippetChars`  | `number` | --      | 限制片段长度       |
| `limits.maxInjectedChars` | `number` | --      | 限制总注入字符数 |
| `limits.timeoutMs`        | `number` | `4000`  | 搜索超时             |

### 范围

控制哪些会话可以接收 QMD 搜索结果。与
[`session.sendPolicy`](/gateway/config-agents#session) 具有相同的模式：

```json5
{
  memory: {
    qmd: {
      scope: {
        default: "deny",
        rules: [{ action: "allow", match: { chatType: "direct" } }],
      },
    },
  },
}
```

内置默认配置允许直接会话和频道会话，但仍拒绝群组。

默认仅限私聊。`match.keyPrefix` 匹配标准化会话密钥；`match.rawKeyPrefix` 匹配原始密钥（包括 `agent:<id>:`）。

### 引用

`memory.citations` 适用于所有后端：

| 值            | 行为                                            |
| ---------------- | --------------------------------------------------- |
| `auto` (默认) | 在片段中包含 `Source: <path#line>` 页脚    |
| `on`             | 始终包含页脚                               |
| `off`            | 省略页脚（路径仍在内部传递给代理） |

### 完整 QMD 示例

```json5
{
  memory: {
    backend: "qmd",
    citations: "auto",
    qmd: {
      includeDefaultMemory: true,
      update: { interval: "5m", debounceMs: 15000 },
      limits: { maxResults: 6, timeoutMs: 4000 },
      scope: {
        default: "deny",
        rules: [{ action: "allow", match: { chatType: "direct" } }],
      },
      paths: [{ name: "docs", path: "~/notes", pattern: "**/*.md" }],
    },
  },
}
```

---

## 梦境

Dreaming 配置位于 `plugins.entries.memory-core.config.dreaming` 下，而不是 `agents.defaults.memorySearch` 下。

Dreaming 作为一次计划扫描运行，并使用内部的 light/deep/REM 阶段作为实现细节。

关于概念行为和斜杠命令，请参阅 [梦境](/concepts/dreaming)。

### 用户设置

| 键         | 类型      | 默认值     | 描述                                       |
| ----------- | --------- | ----------- | ------------------------------------------------- |
| `enabled`   | `boolean` | `false`     | 完全启用或禁用梦境               |
| `frequency` | `string`  | `0 3 * * *` | 完整梦境扫描的可选 cron 节奏 |

### 示例

```json5
{
  plugins: {
    entries: {
      "memory-core": {
        config: {
          dreaming: {
            enabled: true,
            frequency: "0 3 * * *",
          },
        },
      },
    },
  },
}
```

注意：

- Dreaming 将机器状态写入 `memory/.dreams/`。
- Dreaming 将人类可读的叙述输出写入 `DREAMS.md`（或现有的 `dreams.md`）。
- light/deep/REM 阶段策略和阈值属于内部行为，不是面向用户的配置。

## 相关内容

- [内存概览](/concepts/memory)
- [内存搜索](/concepts/memory-search)
- [配置参考](/gateway/configuration-reference)
