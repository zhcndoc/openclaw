---
summary: "记忆搜索、嵌入提供方、QMD、混合搜索和多模态索引的所有配置开关"
title: "记忆配置参考"
sidebarTitle: "记忆配置"
read_when:
  - 你想配置记忆搜索提供方或嵌入模型
  - 你想设置 QMD 后端
  - 你想调优混合搜索、MMR 或时间衰减
  - 你想启用多模态记忆索引
---

本页面列出了 OpenClaw 记忆搜索的每一个配置开关。关于概念性概览，请参见：

<CardGroup cols={2}>
  <Card title="记忆概览" href="/concepts/memory">
    记忆的工作方式。
  </Card>
  <Card title="内置引擎" href="/concepts/memory-builtin">
    默认 SQLite 后端。
  </Card>
  <Card title="QMD 引擎" href="/concepts/memory-qmd">
    本地优先的侧车。
  </Card>
  <Card title="记忆搜索" href="/concepts/memory-search">
    搜索管线与调优。
  </Card>
  <Card title="主动记忆" href="/concepts/active-memory">
    用于交互式会话的记忆子代理。
  </Card>
</CardGroup>

除非另有说明，所有记忆搜索设置都位于 `openclaw.json` 中的 `agents.defaults.memorySearch` 下。

<Note>
如果你在寻找 **主动记忆** 功能开关和子代理配置，它位于 `plugins.entries.active-memory` 下，而不是 `memorySearch`。

主动记忆使用双门模型：

1. 必须启用该插件并将目标指向当前 agent id
2. 请求必须是符合条件的交互式持久聊天会话

有关激活模型、插件拥有的配置、转录持久化和安全发布模式，请参见 [主动记忆](/concepts/active-memory)。
</Note>

---

## 提供方选择

| Key        | Type      | Default          | Description                                                                                                                |
| ---------- | --------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `provider` | `string`  | 自动检测         | 嵌入适配器 ID：`bedrock`、`deepinfra`、`gemini`、`github-copilot`、`local`、`mistral`、`ollama`、`openai`、`voyage` |
| `model`    | `string`  | 提供方默认值     | 嵌入模型名称                                                                                                               |
| `fallback` | `string`  | `"none"`         | 主提供方失败时的回退适配器 ID                                                                                              |
| `enabled`  | `boolean` | `true`           | 启用或禁用记忆搜索                                                                                                         |

### 自动检测顺序

当未设置 `provider` 时，OpenClaw 会按以下顺序选择第一个可用项：

<Steps>
  <Step title="local">
    如果配置了 `memorySearch.local.modelPath` 且文件存在，则会被选中。
  </Step>
  <Step title="github-copilot">
    如果可以解析到 GitHub Copilot token（环境变量或认证配置文件），则会被选中。
  </Step>
  <Step title="openai">
    如果可以解析到 OpenAI key，则会被选中。
  </Step>
  <Step title="gemini">
    如果可以解析到 Gemini key，则会被选中。
  </Step>
  <Step title="voyage">
    如果可以解析到 Voyage key，则会被选中。
  </Step>
  <Step title="mistral">
    如果可以解析到 Mistral key，则会被选中。
  </Step>
  <Step title="deepinfra">
    如果可以解析到 DeepInfra key，则会被选中。
  </Step>
  <Step title="bedrock">
    如果 AWS SDK 凭证链可解析（实例角色、访问密钥、配置文件、SSO、Web 身份或共享配置），则会被选中。
  </Step>
</Steps>

`ollama` 支持，但不会自动检测（需显式设置）。

### API key 解析

远程嵌入需要 API key。Bedrock 则使用 AWS SDK 默认凭证链（实例角色、SSO、访问密钥）。

| Provider       | Env var                                            | Config key                          |
| -------------- | -------------------------------------------------- | ----------------------------------- |
| Bedrock        | AWS 凭证链                                         | 不需要 API key                      |
| DeepInfra      | `DEEPINFRA_API_KEY`                                | `models.providers.deepinfra.apiKey` |
| Gemini         | `GEMINI_API_KEY`                                   | `models.providers.google.apiKey`    |
| GitHub Copilot | `COPILOT_GITHUB_TOKEN`、`GH_TOKEN`、`GITHUB_TOKEN` | 通过设备登录的认证配置文件           |
| Mistral        | `MISTRAL_API_KEY`                                  | `models.providers.mistral.apiKey`   |
| Ollama         | `OLLAMA_API_KEY`（占位符）                         | --                                  |
| OpenAI         | `OPENAI_API_KEY`                                   | `models.providers.openai.apiKey`    |
| Voyage         | `VOYAGE_API_KEY`                                   | `models.providers.voyage.apiKey`    |

<Note>
Codex OAuth 仅覆盖聊天/补全，不满足嵌入请求。
</Note>

---

## 远程端点配置

用于自定义 OpenAI 兼容端点或覆盖提供方默认值：

<ParamField path="remote.baseUrl" type="string">
  自定义 API 基础 URL。
</ParamField>
<ParamField path="remote.apiKey" type="string">
  覆盖 API key。
</ParamField>
<ParamField path="remote.headers" type="object">
  额外的 HTTP 头（会与提供方默认值合并）。
</ParamField>

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

## 提供方特定配置

<AccordionGroup>
  <Accordion title="Gemini">
    | Key                    | Type     | Default                | Description                                |
    | ---------------------- | -------- | ---------------------- | ------------------------------------------ |
    | `model`                | `string` | `gemini-embedding-001` | 也支持 `gemini-embedding-2-preview`         |
    | `outputDimensionality` | `number` | `3072`                 | 对于 Embedding 2：768、1536 或 3072        |

    <Warning>
    更改模型或 `outputDimensionality` 会触发自动完整重建索引。
    </Warning>

  </Accordion>
  <Accordion title="OpenAI 兼容输入类型">
    OpenAI 兼容的嵌入端点可以选择启用提供方特定的 `input_type` 请求字段。这对于需要为查询和文档嵌入使用不同标签的非对称嵌入模型很有用。

    | Key                 | Type     | Default | Description                                             |
    | ------------------- | -------- | ------- | ------------------------------------------------------- |
    | `inputType`         | `string` | 未设置  | 查询和文档嵌入共享的 `input_type`                       |
    | `queryInputType`    | `string` | 未设置  | 查询时的 `input_type`；覆盖 `inputType`                |
    | `documentInputType` | `string` | 未设置  | 索引/文档的 `input_type`；覆盖 `inputType`             |

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            provider: "openai",
            remote: {
              baseUrl: "https://embeddings.example/v1",
              apiKey: "env:EMBEDDINGS_API_KEY",
            },
            model: "asymmetric-embedder",
            queryInputType: "query",
            documentInputType: "passage",
          },
        },
      },
    }
    ```

    更改这些值会影响提供方批量索引的嵌入缓存标识；如果上游模型对这些标签的处理不同，则应随后进行记忆重建索引。

  </Accordion>
  <Accordion title="Bedrock">
    Bedrock 使用 AWS SDK 默认凭证链——不需要 API key。如果 OpenClaw 运行在带有已启用 Bedrock 的实例角色的 EC2 上，只需设置提供方和模型：

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

    | Key                    | Type     | Default                        | Description                     |
    | ---------------------- | -------- | ------------------------------ | ------------------------------- |
    | `model`                | `string` | `amazon.titan-embed-text-v2:0` | 任何 Bedrock 嵌入模型 ID        |
    | `outputDimensionality` | `number` | 模型默认值                    | 对于 Titan V2：256、512 或 1024 |

    **支持的模型**（含系列检测和维度默认值）：

    | Model ID                                   | Provider   | Default Dims | Configurable Dims    |
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

    带吞吐量后缀的变体（例如 `amazon.titan-embed-text-v1:2:8k`）会继承基础模型的配置。

    **认证：** Bedrock 认证使用标准 AWS SDK 凭证解析顺序：

    1. 环境变量（`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`）
    2. SSO token 缓存
    3. Web identity token 凭证
    4. 共享凭证和配置文件
    5. ECS 或 EC2 元数据凭证

    区域会从 `AWS_REGION`、`AWS_DEFAULT_REGION`、`amazon-bedrock` 提供方的 `baseUrl` 中解析，或默认使用 `us-east-1`。

    **IAM 权限：** IAM 角色或用户需要：

    ```json
    {
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": "*"
    }
    ```

    为了遵循最小权限原则，将 `InvokeModel` 限制到特定模型：

    ```
    arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0
    ```

  </Accordion>
  <Accordion title="本地（GGUF + node-llama-cpp）">
    | Key                   | Type               | Default                | Description                                                                                                                                                                                                                                                                                                          |
    | --------------------- | ------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | `local.modelPath`     | `string`           | 自动下载               | GGUF 模型文件路径                                                                                                                                                                                                                                                                                                   |
    | `local.modelCacheDir` | `string`           | node-llama-cpp 默认值  | 已下载模型的缓存目录                                                                                                                                                                                                                                                                                               |
    | `local.contextSize`   | `number \| "auto"` | `4096`                 | 用于嵌入上下文的上下文窗口大小。4096 可覆盖典型分块（128–512 tokens），同时限制非权重 VRAM。资源受限主机可降低到 1024–2048。`"auto"` 使用模型训练时的最大值——不建议用于 8B+ 模型（Qwen3-Embedding-8B：40 960 tokens → 约 32 GB VRAM，而 4096 时约 8.8 GB）。 |

    默认模型：`embeddinggemma-300m-qat-Q8_0.gguf`（约 0.6 GB，自动下载）。需要原生构建：先执行 `pnpm approve-builds`，然后执行 `pnpm rebuild node-llama-cpp`。

    使用独立 CLI 验证 Gateway 使用的相同提供方路径：

    ```bash
    openclaw memory status --deep --agent main
    openclaw memory index --force --agent main
    ```

    如果 `provider` 是 `auto`，则只有当 `local.modelPath` 指向已存在的本地文件时，才会选择 `local`。`hf:` 和 HTTP(S) 模型引用仍然可以在显式设置 `provider: "local"` 时使用，但在模型尚未可用并存放到磁盘上之前，它们不会让 `auto` 选择 local。

  </Accordion>
</AccordionGroup>

### 内联嵌入超时

<ParamField path="sync.embeddingBatchTimeoutSeconds" type="number">
  覆盖记忆索引期间内联嵌入批处理的超时时间。

未设置时使用提供方默认值：本地/自托管提供方（如 `local`、`ollama` 和 `lmstudio`）为 600 秒，托管提供方为 120 秒。当本地 CPU 绑定的嵌入批处理运行正常但较慢时，可增加该值。
</ParamField>

---

## 混合搜索配置

全部位于 `memorySearch.query.hybrid` 下：

| Key                   | Type      | Default | Description                        |
| --------------------- | --------- | ------- | ---------------------------------- |
| `enabled`             | `boolean` | `true`  | 启用 BM25 + 向量混合搜索            |
| `vectorWeight`        | `number`  | `0.7`   | 向量分数权重（0-1）                |
| `textWeight`          | `number`  | `0.3`   | BM25 分数权重（0-1）               |
| `candidateMultiplier` | `number`  | `4`     | 候选池大小倍数                      |

<Tabs>
  <Tab title="MMR（多样性）">
    | Key           | Type      | Default | Description                          |
    | ------------- | --------- | ------- | ------------------------------------ |
    | `mmr.enabled` | `boolean` | `false` | 启用 MMR 重排序                     |
    | `mmr.lambda`  | `number`  | `0.7`   | 0 = 最大多样性，1 = 最大相关性       |
  </Tab>
  <Tab title="时间衰减（新鲜度）">
    | Key                          | Type      | Default | Description               |
    | ---------------------------- | --------- | ------- | ------------------------- |
    | `temporalDecay.enabled`      | `boolean` | `false` | 启用新鲜度提升             |
    | `temporalDecay.halfLifeDays` | `number`  | `30`    | 每 N 天分数减半           |

    常青文件（`MEMORY.md`、`memory/` 中未标注日期的文件）永不衰减。

  </Tab>
</Tabs>

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

| 键           | 类型        | 描述                         |
| ------------ | ----------- | ---------------------------- |
| `extraPaths` | `string[]`  | 要索引的附加目录或文件        |

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

路径可以是绝对路径或相对于工作区的路径。目录会递归扫描 `.md` 文件。符号链接的处理取决于当前启用的后端：内置引擎会忽略符号链接，而 QMD 则遵循底层 QMD 扫描器的行为。

对于按代理作用域的跨代理转录搜索，请使用 `agents.list[].memorySearch.qmd.extraCollections`，而不是 `memory.qmd.paths`。这些额外集合遵循相同的 `{ path, name, pattern? }` 结构，但会按代理合并，并且当路径指向当前工作区之外时，可以保留显式的共享名称。如果同一个已解析路径同时出现在 `memory.qmd.paths` 和 `memorySearch.qmd.extraCollections` 中，QMD 会保留第一个条目并跳过重复项。

---

## 多模态内存（Gemini）

使用 Gemini Embedding 2 将图片和音频与 Markdown 一起建立索引：

| 键                     | 类型        | 默认值     | 描述                               |
| ---------------------- | ----------- | ---------- | ---------------------------------- |
| `multimodal.enabled`   | `boolean`   | `false`    | 启用多模态索引                     |
| `multimodal.modalities`| `string[]`  | --         | `["image"]`、`["audio"]` 或 `["all"]` |
| `multimodal.maxFileBytes` | `number` | `10000000` | 索引的最大文件大小                 |

<Note>
仅适用于 `extraPaths` 中的文件。默认内存根目录仍然只支持 Markdown。需要 `gemini-embedding-2-preview`。`fallback` 必须为 `"none"`。
</Note>

支持的格式：`.jpg`、`.jpeg`、`.png`、`.webp`、`.gif`、`.heic`、`.heif`（图片）；`.mp3`、`.wav`、`.ogg`、`.opus`、`.m4a`、`.aac`、`.flac`（音频）。

---

## 嵌入缓存

| 键                 | 类型        | 默认值  | 描述                          |
| ------------------ | ----------- | ------- | ----------------------------- |
| `cache.enabled`    | `boolean`   | `false` | 在 SQLite 中缓存分块嵌入结果   |
| `cache.maxEntries` | `number`    | `50000` | 最大缓存嵌入数                 |

可防止在重新索引或转录更新期间对未更改文本重复进行嵌入。

---

## 批量索引

| 键                           | 类型        | 默认值  | 描述                         |
| ----------------------------- | ----------- | ------- | ---------------------------- |
| `remote.nonBatchConcurrency`  | `number`    | `4`     | 并行内联嵌入                 |
| `remote.batch.enabled`        | `boolean`   | `false` | 启用批量嵌入 API            |
| `remote.batch.concurrency`    | `number`    | `2`     | 并行批处理任务               |
| `remote.batch.wait`           | `boolean`   | `true`  | 等待批处理完成               |
| `remote.batch.pollIntervalMs` | `number`    | --      | 轮询间隔                     |
| `remote.batch.timeoutMinutes` | `number`    | --      | 批处理超时                   |

适用于 `openai`、`gemini` 和 `voyage`。对于大规模回填，OpenAI 批处理通常最快且最便宜。

`remote.nonBatchConcurrency` 控制本地/自托管提供商以及在提供商批处理 API 未启用时的托管提供商所使用的内联嵌入调用。Ollama 在非批处理索引时默认值为 `1`，以避免压垮较小的本地主机；在更大的机器上可设置更高的值。

这与 `sync.embeddingBatchTimeoutSeconds` 不同，后者控制内联嵌入调用的超时时间。

---

## 会话内存搜索（实验性）

索引会话转录并通过 `memory_search` 暴露：

| 键                           | 类型        | 默认值       | 描述                               |
| ---------------------------- | ----------- | ------------ | ---------------------------------- |
| `experimental.sessionMemory` | `boolean`   | `false`      | 启用会话索引                       |
| `sources`                    | `string[]`  | `["memory"]` | 添加 `"sessions"` 以包含转录       |
| `sync.sessions.deltaBytes`    | `number`    | `100000`     | 触发重新索引的字节阈值            |
| `sync.sessions.deltaMessages` | `number`    | `50`         | 触发重新索引的消息阈值            |

<Warning>
会话索引需要显式启用，并且异步运行。结果可能会稍有延迟。会话日志存储在磁盘上，因此请将文件系统访问视为信任边界。
</Warning>

---

## SQLite 向量加速（sqlite-vec）

| 键                          | 类型        | 默认值   | 描述                          |
| ---------------------------- | ----------- | -------- | ----------------------------- |
| `store.vector.enabled`       | `boolean`   | `true`   | 使用 sqlite-vec 进行向量查询  |
| `store.vector.extensionPath` | `string`    | bundled  | 覆盖 sqlite-vec 路径           |

当 sqlite-vec 不可用时，OpenClaw 会自动回退到进程内余弦相似度。

---

## 索引存储

| 键                   | 类型      | 默认值                               | 描述                                       |
| --------------------- | --------- | ------------------------------------- | ------------------------------------------ |
| `store.path`          | `string`  | `~/.openclaw/memory/{agentId}.sqlite` | 索引位置（支持 `{agentId}` 占位符）         |
| `store.fts.tokenizer` | `string`  | `unicode61`                           | FTS5 分词器（`unicode61` 或 `trigram`）     |

---

## QMD 后端配置

设置 `memory.backend = "qmd"` 以启用。所有 QMD 设置都位于 `memory.qmd` 下：

| 键                      | 类型        | 默认值   | 描述                                                                 |
| ------------------------ | ----------- | -------- | -------------------------------------------------------------------- |
| `command`                | `string`    | `qmd`    | QMD 可执行文件路径；当服务的 `PATH` 与你的 shell 不同时，请设置绝对路径 |
| `searchMode`             | `string`    | `search` | 搜索命令：`search`、`vsearch`、`query`                               |
| `includeDefaultMemory`    | `boolean`   | `true`   | 自动索引 `MEMORY.md` + `memory/**/*.md`                              |
| `paths[]`                | `array`     | --       | 额外路径：`{ name, path, pattern? }`                                 |
| `sessions.enabled`       | `boolean`   | `false`  | 索引会话转录                                                         |
| `sessions.retentionDays` | `number`    | --       | 转录保留时间                                                         |
| `sessions.exportDir`     | `string`    | --       | 导出目录                                                             |

`searchMode: "search"` 仅为词法/BM25。OpenClaw 不会对该模式运行语义向量就绪探测或 QMD 嵌入维护，包括在 `memory status --deep` 期间；`vsearch` 和 `query` 仍然需要 QMD 向量就绪和嵌入。

OpenClaw 优先使用当前的 QMD 集合和 MCP 查询结构，但也会在需要时通过尝试兼容的集合模式标志以及较旧的 MCP 工具名称来保持对旧版 QMD 的兼容。当 QMD 声明支持多个集合过滤器时，同源集合会由一个 QMD 进程进行搜索；较旧的 QMD 构建版本则保留逐集合的兼容路径。所谓同源，是指持久内存集合会被分组在一起，而会话转录集合则保持为单独一组，这样来源多样化仍然可以同时包含两种输入。

<Note>
QMD 的模型覆盖保持在 QMD 侧，而不是 OpenClaw 配置侧。如果你需要全局覆盖 QMD 的模型，请在网关运行环境中设置诸如 `QMD_EMBED_MODEL`、`QMD_RERANK_MODEL` 和 `QMD_GENERATE_MODEL` 之类的环境变量。
</Note>

<AccordionGroup>
  <Accordion title="更新计划">
    | 键                       | 类型        | 默认值  | 描述                           |
    | ------------------------- | ----------- | ------- | ------------------------------ |
    | `update.interval`         | `string`    | `5m`    | 刷新间隔                       |
    | `update.debounceMs`       | `number`    | `15000` | 文件变更防抖                   |
    | `update.onBoot`           | `boolean`   | `true`  | 启动时刷新                     |
    | `update.waitForBootSync`  | `boolean`   | `false` | 等待刷新完成后再启动           |
    | `update.embedInterval`    | `string`    | --      | 单独的嵌入频率                 |
    | `update.commandTimeoutMs` | `number`    | --      | QMD 命令超时                  |
    | `update.updateTimeoutMs`  | `number`    | --      | QMD 更新操作超时              |
    | `update.embedTimeoutMs`   | `number`    | --      | QMD 嵌入操作超时              |
  </Accordion>
  <Accordion title="限制">
    | 键                      | 类型       | 默认值  | 描述                      |
    | ------------------------ | ---------- | ------- | ------------------------- |
    | `limits.maxResults`      | `number`   | `6`     | 最大搜索结果数            |
    | `limits.maxSnippetChars` | `number`   | --      | 限制片段长度              |
    | `limits.maxInjectedChars`| `number`   | --      | 限制注入总字符数          |
    | `limits.timeoutMs`       | `number`   | `4000`  | 搜索超时                  |
  </Accordion>
  <Accordion title="作用域">
    控制哪些会话可以接收 QMD 搜索结果。与 [`session.sendPolicy`](/gateway/config-agents#session) 的架构相同：

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

    随附的默认配置允许直接会话和频道会话，同时仍然拒绝群组。

    默认仅限私信。`match.keyPrefix` 匹配规范化后的会话键；`match.rawKeyPrefix` 匹配包含 `agent:<id>:` 的原始键。

  </Accordion>
  <Accordion title="引用">
    `memory.citations` 适用于所有后端：

    | 值                | 行为                                           |
    | ----------------- | ---------------------------------------------- |
    | `auto`（默认）    | 在片段中包含 `Source: <path#line>` 页脚        |
    | `on`              | 始终包含页脚                                   |
    | `off`             | 不包含页脚（路径仍会在内部传递给代理）         |

  </Accordion>
</AccordionGroup>

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

Dreaming 配置在 `plugins.entries.memory-core.config.dreaming` 下，而不是在 `agents.defaults.memorySearch` 下。

Dreaming 作为一次计划性扫描运行，并将内部的 light/deep/REM 阶段作为实现细节。

有关概念行为和斜杠命令，请参见 [Dreaming](/concepts/dreaming)。

### 用户设置

| 键          | 类型      | 默认值        | 描述                                           |
| ----------- | --------- | ------------- | ---------------------------------------------- |
| `enabled`    | `boolean` | `false`       | 完全启用或禁用 dreaming                        |
| `frequency`  | `string`   | `0 3 * * *`   | 全量 dreaming 扫描的可选 cron 频率              |
| `model`      | `string`   | default model | 可选的 Dream Diary 子代理模型覆盖              |

### 示例

```json5
{
  plugins: {
    entries: {
      "memory-core": {
        subagent: {
          allowModelOverride: true,
          allowedModels: ["anthropic/claude-sonnet-4-6"],
        },
        config: {
          dreaming: {
            enabled: true,
            frequency: "0 3 * * *",
            model: "anthropic/claude-sonnet-4-6",
          },
        },
      },
    },
  },
}
```

<Note>
- Dreaming 会将机器状态写入 `memory/.dreams/`。
- Dreaming 会将人类可读的叙述输出写入 `DREAMS.md`（或已有的 `dreams.md`）。
- `dreaming.model` 使用现有的插件子代理信任门禁；在启用它之前，请先设置 `plugins.entries.memory-core.subagent.allowModelOverride: true`。
- light/deep/REM 阶段策略和阈值属于内部行为，不是面向用户的配置。
</Note>

## 相关内容

- [配置参考](/gateway/configuration-reference)
- [内存概览](/concepts/memory)
- [内存搜索](/concepts/memory-search)