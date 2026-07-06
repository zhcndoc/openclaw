---
summary: "内存搜索、嵌入提供方、QMD、混合搜索和多模态索引的所有配置项"
title: "内存配置参考"
sidebarTitle: "内存配置"
read_when:
  - 你想配置内存搜索提供方或嵌入模型
  - 你想设置 QMD 后端
  - 你想调整混合搜索、MMR 或时间衰减
  - 你想启用多模态内存索引
---

本页列出了 OpenClaw 内存搜索的每一个配置项。概念性概览请参见：

<CardGroup cols={2}>
  <Card title="内存概览" href="/concepts/memory">
    内存如何工作。
  </Card>
  <Card title="内置引擎" href="/concepts/memory-builtin">
    默认的 SQLite 后端。
  </Card>
  <Card title="QMD 引擎" href="/concepts/memory-qmd">
    本地优先的 sidecar。
  </Card>
  <Card title="内存搜索" href="/concepts/memory-search">
    搜索流程与调优。
  </Card>
  <Card title="活动内存" href="/concepts/active-memory">
    用于交互式会话的内存子代理。
  </Card>
</CardGroup>

所有内存搜索设置都位于 `openclaw.json` 中的 `agents.defaults.memorySearch` 下（或者在每个 agent 的 `agents.list[].memorySearch` 中进行覆盖），除非另有说明。

<Note>
如果你在寻找 **活动内存** 功能开关和子代理配置，它位于 `plugins.entries.active-memory` 下，而不是 `memorySearch`。

活动内存使用双门控模型：

1. 插件必须启用并且目标指向当前 agent id
2. 请求必须是符合条件的交互式持久聊天会话

有关激活模型、插件拥有的配置、对话转录持久化以及安全发布模式，请参见 [活动内存](/concepts/active-memory)。
</Note>

---

## 提供方选择

| Key        | Type      | Default          | Description                                                                                                                                                                                                                                                                                 |
| ---------- | --------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`  | `boolean` | `true`           | 启用或禁用内存搜索                                                                                                                                                                                                                                                                           |
| `provider` | `string`  | `"openai"`       | 嵌入适配器 ID，例如 `bedrock`、`deepinfra`、`gemini`、`github-copilot`、`local`、`mistral`、`ollama`、`openai`、`openai-compatible` 或 `voyage`；也可以是已配置的 `models.providers.<id>`，其 `api` 指向内存嵌入适配器或 OpenAI 兼容模型 API |
| `model`    | `string`  | provider default | 嵌入模型名称                                                                                                                                                                                                                                                                                |
| `fallback` | `string`  | `"none"`         | 主提供方失败时的回退适配器 ID                                                                                                                                                                                                                                                                |

当未设置 `provider` 时，OpenClaw 使用 OpenAI 嵌入。显式设置 `provider`
以使用 Bedrock、DeepInfra、Gemini、GitHub Copilot、Mistral、Ollama、
Voyage、本地 GGUF 模型，或 OpenAI 兼容的 `/v1/embeddings` 端点。
仍使用旧版 `provider: "auto"` 的配置会解析为 `openai`。

<Warning>
更改嵌入提供方、模型、提供方设置、来源、作用域、
分块或分词器，可能使现有的 SQLite 向量索引不兼容。
OpenClaw 会暂停向量搜索并报告索引身份警告，而不是
自动为全部内容重新嵌入。准备好后可使用
`openclaw memory status --index --agent <id>` 或
`openclaw memory index --force --agent <id>` 重建。
</Warning>

当 `provider` 未设置、保留了旧的 `provider: "auto"`，或
`provider: "none"` 用于有意选择仅 FTS 模式时，内存召回在嵌入不可用时仍可
使用词法 FTS 排名。

显式的非本地提供方会失败关闭。如果你将 `memorySearch.provider` 设置为
Bedrock、DeepInfra、Gemini、GitHub
Copilot、LM Studio、Mistral、Ollama、OpenAI、Voyage，或 OpenAI 兼容的
自定义提供方等具体的远程后端提供方，并且该提供方在运行时不可用，`memory_search`
会返回不可用结果，而不是悄悄退回为仅 FTS 召回。请修复
提供方/认证配置，切换到可访问的提供方，或在你想要有意使用仅 FTS 召回时设置
`provider: "none"`。

### 自定义 provider id

`memorySearch.provider` 可以指向自定义的 `models.providers.<id>` 条目，用于内存专用的提供方适配器，例如 `ollama`，或用于 OpenAI 兼容的模型 API，例如 `openai-responses` / `openai-completions`。OpenClaw 会解析该提供方的 `api` 所属方以用于嵌入适配器，同时保留自定义提供方 id 以处理端点、认证和模型前缀逻辑。这使多 GPU 或多主机部署可以将内存嵌入专门指向某个本地端点：

```json5
{
  models: {
    providers: {
      "ollama-5080": {
        api: "ollama",
        baseUrl: "http://gpu-box.local:11435",
        apiKey: "ollama-local",
        models: [{ id: "qwen3-embedding:0.6b", name: "Qwen3 Embedding 0.6B" }],
      },
    },
  },
  agents: {
    defaults: {
      memorySearch: {
        provider: "ollama-5080",
        model: "qwen3-embedding:0.6b",
      },
    },
  },
}
```

### API 密钥解析

远程嵌入需要 API 密钥。Bedrock 则使用 AWS SDK 默认凭证链（实例角色、SSO、访问密钥或 Bedrock API 密钥）。

| Provider       | Env var                                             | Config key                          |
| -------------- | --------------------------------------------------- | ----------------------------------- |
| Bedrock        | AWS credential chain, or `AWS_BEARER_TOKEN_BEDROCK` | 不需要 API 密钥                   |
| DeepInfra      | `DEEPINFRA_API_KEY`                                 | `models.providers.deepinfra.apiKey` |
| Gemini         | `GEMINI_API_KEY`                                    | `models.providers.google.apiKey`    |
| GitHub Copilot | `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, `GITHUB_TOKEN`  | 通过设备登录进行身份验证       |
| Mistral        | `MISTRAL_API_KEY`                                   | `models.providers.mistral.apiKey`   |
| Ollama         | `OLLAMA_API_KEY` (placeholder)                      | --                                  |
| OpenAI         | `OPENAI_API_KEY`                                    | `models.providers.openai.apiKey`    |
| Voyage         | `VOYAGE_API_KEY`                                    | `models.providers.voyage.apiKey`    |

<Note>
Codex OAuth 仅覆盖聊天/补全，不满足嵌入请求。
</Note>

---

## 远程端点配置

对于不应继承全局 OpenAI 聊天凭证的通用 OpenAI 兼容
`/v1/embeddings` 服务，请使用 `provider: "openai-compatible"`。

<ParamField path="remote.baseUrl" type="string">
  自定义 API 基础 URL。
</ParamField>
<ParamField path="remote.apiKey" type="string">
  覆盖 API 密钥。
</ParamField>
<ParamField path="remote.headers" type="object">
  额外的 HTTP 标头（与提供方默认值合并）。
</ParamField>

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "openai-compatible",
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
    | ---------------------- | ---------------------- | ------------------------------------------- |
    | `model`                | `string` | `gemini-embedding-001` | 也支持 `gemini-embedding-2-preview` |
    | `outputDimensionality` | `number` | `3072`                 | 对于 Embedding 2：768、1536 或 3072        |

    <Warning>
    更改模型或 `outputDimensionality` 会改变索引身份。OpenClaw
    会暂停向量搜索，直到你显式重建内存索引。
    </Warning>

  </Accordion>
  <Accordion title="OpenAI-compatible input types">
    OpenAI 兼容的嵌入端点可以选择启用提供方特定的 `input_type` 请求字段。这对于需要为查询和文档嵌入使用不同标签的非对称嵌入模型很有用。

    | Key                 | Type     | Default | Description                                             |
    | ------------------- | ------- | ------- | -------------------------------------------------------- |
    | `inputType`         | `string` | unset   | 查询和文档嵌入共用的 `input_type`   |
    | `queryInputType`    | `string` | unset   | 查询时的 `input_type`；会覆盖 `inputType`          |
    | `documentInputType` | `string` | unset   | 索引/文档的 `input_type`；会覆盖 `inputType`      |

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            provider: "openai-compatible",
            remote: {
              baseUrl: "https://embeddings.example/v1",
              apiKey: "${EMBEDDINGS_API_KEY}",
            },
            model: "asymmetric-embedder",
            queryInputType: "query",
            documentInputType: "passage",
          },
        },
      },
    }
    ```

    更改这些值会影响提供方批量索引的嵌入缓存标识，当上游模型对这些标签的处理方式不同时时，应随后执行一次内存重建索引。

  </Accordion>
  <Accordion title="Bedrock">
    ### Bedrock 嵌入配置

    Bedrock 使用 AWS SDK 默认凭证链，再加上 OpenClaw 检查过的 bearer token，因此配置中不会存储 API key。如果 OpenClaw 运行在启用了 Bedrock 的 EC2 实例角色上，只需设置 provider 和 model：

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
    | ---------------------- | ------------------ | -------------------------------- |
    | `model`                | `string` | `amazon.titan-embed-text-v2:0` | 任意 Bedrock 嵌入模型 ID  |
    | `outputDimensionality` | `number` | model default                  | 对于 Titan V2：256、512 或 1024 |

    **支持的模型**（带有家族检测和维度默认值）：

    | Model ID                                   | Provider   | Default Dims | Configurable Dims          |
    | ------------------------------------------- | ---------- | ------------- | -------------------------- |
    | `amazon.titan-embed-text-v2:0`             | Amazon     | 1024         | 256, 512, 1024             |
    | `amazon.titan-embed-text-v1`               | Amazon     | 1536         | --                          |
    | `amazon.titan-embed-g1-text-02`            | Amazon     | 1536         | --                          |
    | `amazon.titan-embed-image-v1`              | Amazon     | 1024         | --                          |
    | `amazon.nova-2-multimodal-embeddings-v1:0` | Amazon     | 1024         | 256, 384, 1024, 3072       |
    | `cohere.embed-english-v3`                  | Cohere     | 1024         | --                          |
    | `cohere.embed-multilingual-v3`             | Cohere     | 1024         | --                          |
    | `cohere.embed-v4:0`                        | Cohere     | 1536         | 256, 384, 512, 768, 1024, 1536 |
    | `twelvelabs.marengo-embed-3-0-v1:0`        | TwelveLabs | 512          | --                          |
    | `twelvelabs.marengo-embed-2-7-v1:0`        | TwelveLabs | 1024         | --                          |

    带吞吐量后缀的变体（例如 `amazon.titan-embed-text-v1:2:8k`）以及带区域前缀的推理配置文件 ID（例如 `us.amazon.titan-embed-text-v2:0`）会继承基础模型的配置。

    **区域：** 按以下顺序解析：`memorySearch.remote.baseUrl` 覆盖项、`models.providers.amazon-bedrock.baseUrl` 配置、`AWS_REGION`、`AWS_DEFAULT_REGION`，然后默认使用 `us-east-1`。

    **身份验证：** OpenClaw 会先检查 `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` 或 `AWS_BEARER_TOKEN_BEDROCK`，然后回退到标准 AWS SDK 默认凭证提供链：

    1. 环境变量（`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`），除非同时设置了 `AWS_PROFILE`
    2. SSO（仅当配置了 SSO 字段时）
    3. 共享凭证和配置文件（`fromIni`，包含 `AWS_PROFILE`）
    4. 凭证进程（AWS 配置文件中的 `credential_process`）
    5. Web 身份令牌凭证
    6. ECS 或 EC2 实例元数据凭证

    **IAM 权限：** IAM 角色或用户需要：

    ```json
    {
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": "*"
    }
    ```

    为遵循最小权限原则，可将 `InvokeModel` 限定到特定模型：

    ```text
    arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0
    ```

  </Accordion>
  <Accordion title="Local (GGUF + llama.cpp)">
    | Key                   | Type               | Default                | Description                                                                                                                                                                                                                                                                                                          |
    | --------------------- | ------------------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | `local.modelPath`     | `string`           | 自动下载                | GGUF 模型文件路径                                                                                                                                                                                                                                                                                              |
    | `local.modelCacheDir` | `string`           | node-llama-cpp 默认值 | 已下载模型的缓存目录                                                                                                                                                                                                                                                                                      |
    | `local.contextSize`   | `number \| "auto"` | `4096`                 | 嵌入上下文的上下文窗口大小。4096 可覆盖典型分块（128-512 tokens），同时限制非权重 VRAM。受限主机上可降低到 1024-2048。`"auto"` 使用模型训练时的最大值——不建议用于 8B+ 模型（Qwen3-Embedding-8B：最多 40 960 tokens 可能会将 VRAM 推高到约 32 GB）。 |

    安装官方 llama.cpp 提供方：`openclaw plugins install @openclaw/llama-cpp-provider`。
    默认模型：`embeddinggemma-300m-qat-Q8_0.gguf`（约 0.6 GB，自动下载）。源码检出仍需要本地构建授权：`pnpm approve-builds` 然后 `pnpm rebuild node-llama-cpp`。

    使用独立 CLI 验证 Gateway 使用的相同 provider 路径：

    ```bash
    openclaw memory status --deep --agent main
    openclaw memory index --force --agent main
    ```

    对本地 GGUF 嵌入显式设置 `provider: "local"`。`hf:` 和 HTTP(S) 模型引用也支持显式本地配置（通过 node-llama-cpp 的模型解析），但它们不会改变默认 provider。

  </Accordion>
</AccordionGroup>

### 内联嵌入超时

<ParamField path="sync.embeddingBatchTimeoutSeconds" type="number">
  覆盖内存索引期间内联嵌入批次的超时时间。

未设置时使用提供方默认值：本地/自托管提供方（如 `local`、`ollama` 和 `lmstudio`）为 600 秒，托管提供方为 120 秒。当本地 CPU 受限的嵌入批次运行正常但较慢时，可增大该值。
</ParamField>

---

## 索引行为

除非另有说明，否则均属于 `memorySearch.sync`：

| 键                             | 类型      | 默认值 | 描述                                                               |
| ------------------------------ | --------- | ------ | ------------------------------------------------------------------ |
| `onSessionStart`               | `boolean` | `true` | 会话开始时同步内存索引                                               |
| `onSearch`                     | `boolean` | `true` | 在搜索时检测到内容变化后延迟同步                                       |
| `watch`                        | `boolean` | `true` | 监视内存文件（chokidar），并在变更时安排重新索引                         |
| `watchDebounceMs`              | `number`  | `1500` | 用于合并快速文件监听事件的防抖窗口                                       |
| `intervalMinutes`              | `number`  | `0`    | 定期重新索引的时间间隔（分钟）（`0` 表示禁用）                             |
| `sessions.postCompactionForce` | `boolean` | `true` | 在压缩触发的转录更新后强制重新进行会话索引                                |

<ParamField path="chunking.tokens" type="number">
  在拆分内存源以进行嵌入之前使用的分块大小（以 token 计，默认值：400）。
</ParamField>
<ParamField path="chunking.overlap" type="number">
  相邻分块之间的 token 重叠，用于在拆分边界附近保留上下文（默认值：80）。
</ParamField>

<Note>
更改 `chunking.tokens` 或 `chunking.overlap` 会改变分块边界，并使现有索引标识失效（参见 Provider 选择下的 Warning）。
</Note>

---

## 混合搜索配置

都位于 `memorySearch.query` 下：

| 键           | 类型     | 默认值 | 描述                               |
| ------------ | -------- | ------ | ---------------------------------- |
| `maxResults` | `number` | `6`    | 注入前返回的最大记忆命中数         |
| `minScore`   | `number` | `0.35` | 纳入命中的最低相关性分数          |

以及位于 `memorySearch.query.hybrid` 下：

| 键                   | 类型      | 默认值  | 描述                        |
| --------------------- | --------- | ------- | ---------------------------------- |
| `enabled`             | `boolean` | `true`  | 启用混合 BM25 + 向量搜索 |
| `vectorWeight`        | `number`  | `0.7`   | 向量分数权重（0-1）     |
| `textWeight`          | `number`  | `0.3`   | BM25 分数权重（0-1）       |
| `candidateMultiplier` | `number`  | `4`     | 候选池大小乘数     |

<Tabs>
  <Tab title="MMR（多样性）">
    | 键           | 类型      | 默认值 | 描述                          |
    | ------------- | --------- | ------ | ------------------------------------- |
    | `mmr.enabled` | `boolean` | `false` | 启用 MMR 重排序                |
    | `mmr.lambda`  | `number`  | `0.7`   | 0 = 最大多样性，1 = 最大相关性 |
  </Tab>
  <Tab title="时间衰减（新近性）">
    | 键                          | 类型      | 默认值 | 描述               |
    | ---------------------------- | --------- | ------ | -------------------------- |
    | `temporalDecay.enabled`      | `boolean` | `false` | 启用新近性提升      |
    | `temporalDecay.halfLifeDays` | `number`  | `30`    | 分数每 N 天减半 |

    常青文件（`MEMORY.md`、`memory/` 中非日期文件）永不衰减。

  </Tab>
</Tabs>

### 完整示例

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        query: {
          maxResults: 6,
          minScore: 0.35,
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

## 附加内存路径

| 键          | 类型       | 描述                              |
| ------------ | ---------- | ---------------------------------------- |
| `extraPaths` | `string[]` | 要索引的额外目录或文件 |

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

路径可以是绝对路径或相对于工作区的路径。目录会递归扫描 `.md` 文件。符号链接的处理取决于当前启用的后端：内置引擎会跳过符号链接，而 QMD 则遵循底层 QMD 扫描器的行为。

对于按 agent 作用域的跨 agent 会话记录搜索，请使用 `agents.list[].memorySearch.qmd.extraCollections`，而不是 `memory.qmd.paths`。这些额外集合遵循相同的 `{ path, name, pattern? }` 结构，但它们会按 agent 合并，并且当路径指向当前工作区之外时，可以保留显式的共享名称。如果同一个解析后的路径同时出现在 `memory.qmd.paths` 和 `memorySearch.qmd.extraCollections` 中，QMD 会保留第一条并跳过重复项。

---

## 多模态内存（Gemini）

使用 Gemini Embedding 2 将图片和音频与 Markdown 一起建立索引：

| 键                       | 类型       | 默认值    | 描述                            |
| ------------------------- | ---------- | ---------- | -------------------------------------- |
| `multimodal.enabled`      | `boolean`  | `false`    | 启用多模态索引             |
| `multimodal.modalities`   | `string[]` | --         | `["image"]`、`["audio"]` 或 `["all"]` |
| `multimodal.maxFileBytes` | `number`   | `10485760` | 用于索引的最大文件大小（10 MiB）    |

<Note>
仅适用于 `extraPaths` 中的文件。默认内存根目录仍然只支持 Markdown。需要 `gemini-embedding-2-preview`。`fallback` 必须为 `"none"`。
</Note>

支持的格式：`.jpg`、`.jpeg`、`.png`、`.webp`、`.gif`、`.heic`、`.heif`（图片）；`.mp3`、`.wav`、`.ogg`、`.opus`、`.m4a`、`.aac`、`.flac`（音频）。

---

## 嵌入缓存

| Key                | Type      | Default | Description                                  |
| ------------------ | --------- | ------- | -------------------------------------------- |
| `cache.enabled`    | `boolean` | `true`  | 将分块嵌入缓存到 SQLite 中             |
| `cache.maxEntries` | `number`  | unset   | 缓存嵌入的尽力而为的上限 |

可防止在重新索引或转录更新期间对未更改的文本重复进行嵌入。将 `maxEntries` 保持为 unset 可获得无上限缓存；当磁盘增长比重新索引峰值速度更重要时再设置它。设置后，一旦缓存超过限制，最旧的条目（按最后更新时间）会优先被清除。

## 批量索引

| 键                           | 类型      | 默认值  | 描述                |
| ----------------------------- | --------- | ------- | -------------------------- |
| `remote.nonBatchConcurrency`  | `number`  | `4`     | 并行内联嵌入 |
| `remote.batch.enabled`        | `boolean` | `false` | 启用批量嵌入 API |
| `remote.batch.concurrency`    | `number`  | `2`     | 并行批量任务        |
| `remote.batch.wait`           | `boolean` | `true`  | 等待批量完成  |
| `remote.batch.pollIntervalMs` | `number`  | `2000`  | 轮询间隔              |
| `remote.batch.timeoutMinutes` | `number`  | `60`    | 批量超时              |

可用于 `gemini`、`openai` 和 `voyage`。对于大规模回填，OpenAI 批量通常是最快且最便宜的。

`remote.nonBatchConcurrency` 控制本地/自托管提供方以及在提供方批处理 API 未启用时的托管提供方所使用的内联嵌入调用。Ollama 在非批量索引时默认使用 `1`，以避免压垮较小的本地主机；在更大的机器上可设置更高的值。

这与 `sync.embeddingBatchTimeoutSeconds` 是分开的，后者控制内联嵌入调用的超时时间。

---

## 会话内存搜索（实验性）

索引会话记录，并通过 `memory_search` 暴露它们：

| 键                           | 类型       | 默认值      | 描述                             |
| ----------------------------- | ---------- | ------------ | --------------------------------------- |
| `experimental.sessionMemory`  | `boolean`  | `false`      | 启用会话索引                           |
| `sources`                     | `string[]` | `["memory"]` | 添加 `"sessions"` 以包含会话记录       |
| `sync.sessions.deltaBytes`    | `number`   | `100000`     | 重新索引的字节阈值                     |
| `sync.sessions.deltaMessages` | `number`   | `50`         | 重新索引的消息阈值                     |

<Warning>
会话索引需要显式启用，并且以异步方式运行。结果可能会略有延迟。会话日志保存在磁盘上，因此请将文件系统访问视为信任边界。
</Warning>

会话转录命中也遵循
[`tools.sessions.visibility`](/gateway/config-tools#toolssessions)。默认的
`tree` 可见性仅公开当前会话及其派生的会话。要从其他会话中召回一个无关的、同代理网关分发的会话，例如 DM，请有意将可见性扩大到 `agent`（仅当还需要跨代理召回且代理到代理策略允许时，才使用 `all`）。

下面的示例将这些设置放在 `agents.defaults` 下。当只有一个代理应索引并搜索会话转录时，你也可以在按代理覆盖中应用等效的 `memorySearch` 设置。

用于同代理从网关到 DM 的召回：

<Tabs>
  <Tab title="Builtin backend">
    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            experimental: { sessionMemory: true },
            sources: ["memory", "sessions"],
          },
        },
      },
      tools: {
        sessions: { visibility: "agent" },
      },
    }
    ```
  </Tab>
  <Tab title="QMD backend">
    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            experimental: { sessionMemory: true },
            sources: ["memory", "sessions"],
          },
        },
      },
      memory: {
        backend: "qmd",
        qmd: {
          sessions: { enabled: true },
        },
      },
      tools: {
        sessions: { visibility: "agent" },
      },
    }
    ```
  </Tab>
</Tabs>

使用 QMD 时，`agents.defaults.memorySearch.experimental.sessionMemory` 和
`sources: ["sessions"]` 本身不会将转录导出到 QMD。也要设置
`memory.qmd.sessions.enabled: true`。

---

## SQLite 向量加速（sqlite-vec）

| 键                          | 类型      | 默认值 | 描述                       |
| ---------------------------- | --------- | ------- | --------------------------------- |
| `store.vector.enabled`       | `boolean` | `true`  | 使用 sqlite-vec 进行向量查询     |
| `store.vector.extensionPath` | `string`  | bundled | 覆盖 sqlite-vec 路径              |

当 sqlite-vec 不可用时，OpenClaw 会自动回退到进程内余弦相似度。

---

## 索引存储

内置内存索引位于每个 agent 的 OpenClaw SQLite 数据库中：
`agents/<agentId>/agent/openclaw-agent.sqlite`。

| 键                   | 类型     | 默认值     | 描述                               |
| --------------------- | -------- | ----------- | ----------------------------------------- |
| `store.fts.tokenizer` | `string` | `unicode61` | FTS5 分词器（`unicode61` 或 `trigram`） |

---

## QMD 后端配置

设置 `memory.backend = "qmd"` 以启用。所有 QMD 设置都位于 `memory.qmd` 下：

| 键                      | 类型      | 默认值  | 描述                                                                           |
| ------------------------ | --------- | -------- | ------------------------------------------------------------------------------------- |
| `command`                | `string`  | `qmd`    | QMD 可执行文件路径；当服务 `PATH` 与你的 shell 不同时时，请设置绝对路径 |
| `searchMode`             | `string`  | `search` | 搜索命令：`search`、`vsearch`、`query`                                          |
| `rerank`                 | `boolean` | --       | 与 `searchMode: "query"` 和 QMD 2.1+ 一起设置为 `false`，可跳过 QMD 重排序          |
| `includeDefaultMemory`   | `boolean` | `true`   | 自动索引 `MEMORY.md` + `memory/**/*.md`                                             |
| `paths[]`                | `array`   | --       | 额外路径：`{ name, path, pattern? }`                                               |
| `sessions.enabled`       | `boolean` | `false`  | 将会话转录导出到 QMD                                                   |
| `sessions.retentionDays` | `number`   | --       | 转录保留期限                                                                  |
| `sessions.exportDir`     | `string`   | --       | 导出目录                                                                      |

`searchMode: "search"` 仅支持词法/BM25。OpenClaw 不会为该模式运行语义向量就绪探测或 QMD 嵌入维护，包括在 `memory status --deep` 期间；`vsearch` 和 `query` 仍然需要 QMD 向量就绪和嵌入。

`rerank: false` 仅会更改 QMD `query` 模式，并且需要 QMD 2.1 或更新版本。在直接 CLI 模式下，OpenClaw 传递 `--no-rerank`；在由 mcporter 支持的 MCP 模式下，它会将 `rerank: false` 传递给 QMD 的统一查询工具。保持其未设置即可使用 QMD 默认的查询重排序行为。

OpenClaw 更倾向于使用当前的 QMD collection 和 MCP 查询形态，但在需要时也会通过尝试兼容的 collection 模式标志以及较旧的 MCP 工具名称来兼容旧版 QMD。当前 QMD 声明支持多个 collection 过滤器时，同源 collection 会由一个 QMD 进程一起搜索；较旧的 QMD 构建版本则保留按 collection 的兼容路径。同源是指持久化内存 collection（默认内存文件加自定义路径）会被分到一组，而会话转录 collection 会保持为单独一组，因此来源多样化仍然同时包含这两类输入。

<Note>
QMD 模型覆盖保留在 QMD 侧，而不是 OpenClaw 配置中。如果你需要全局覆盖 QMD 的模型，请在网关运行时环境中设置 `QMD_EMBED_MODEL`、`QMD_RERANK_MODEL` 和 `QMD_GENERATE_MODEL` 等环境变量。
</Note>

### mcporter 集成

所有配置都位于 `memory.qmd.mcporter` 下。它通过一个长期运行的 `mcporter` MCP 守护进程来路由 QMD 搜索，而不是每次查询都启动 `qmd`，从而为较大的模型降低冷启动开销。

| Key           | Type      | Default | Description                                                            |
| ------------- | --------- | ------- | ---------------------------------------------------------------------- |
| `enabled`     | `boolean` | `false` | 通过 mcporter 路由 QMD 调用，而不是每次请求都启动 `qmd` |
| `serverName`  | `string`  | `qmd`   | 运行 `qmd mcp` 且 `lifecycle: keep-alive` 的 mcporter 服务器名称  |
| `startDaemon` | `boolean` | `true`  | 当 `enabled` 为 true 时自动启动 mcporter 守护进程         |

需要安装 `mcporter` 并将其放在 PATH 上，同时还需要配置一个运行 `qmd mcp` 的 mcporter 服务器。对于更简单的本地设置，如果可以接受每次查询启动进程的成本，请保持禁用。

<AccordionGroup>
  <Accordion title="更新计划">
    | Key                       | Type      | Default | Description                           |
    | --------------------------- | --------- | -------- | ---------------------------------------- |
    | `update.interval`         | `string`  | `5m`    | 刷新间隔                      |
    | `update.debounceMs`       | `number`  | `15000` | 文件变更去抖                 |
    | `update.onBoot`           | `boolean` | `true`  | 当长期运行的 QMD 管理器打开时刷新；设为 false 可跳过启动时的立即更新 |
    | `update.startup`          | `string`  | `off`   | 可选的网关启动时 QMD 初始化：`off`、`idle` 或 `immediate` |
    | `update.startupDelayMs`   | `number`  | `120000` | `startup: "idle"` 刷新运行前的延迟 |
    | `update.waitForBootSync`  | `boolean` | `false` | 在初始刷新完成之前阻止管理器打开 |
    | `update.embedInterval`    | `string`  | `60m`   | 单独的嵌入周期                |
    | `update.commandTimeoutMs` | `number`  | `30000` | QMD 维护命令（collection list/add）的超时时间 |
    | `update.updateTimeoutMs`  | `number`  | `120000` | 每个 `qmd update` 周期的超时时间   |
    | `update.embedTimeoutMs`   | `number`  | `120000` | 每个 `qmd embed` 周期的超时时间    |
  </Accordion>
  <Accordion title="限制">
    | Key                       | Type     | Default | Description                |
    | --------------------------- | -------- | ------- | ------------------------------ |
    | `limits.maxResults`       | `number` | `4`     | 最大搜索结果数         |
    | `limits.maxSnippetChars`  | `number` | `450`   | 截断片段长度       |
    | `limits.maxInjectedChars` | `number` | `2200`  | 截断注入总字符数 |
    | `limits.timeoutMs`        | `number` | `4000`  | 搜索超时             |
  </Accordion>
  <Accordion title="作用域">
    控制哪些会话可以接收 QMD 搜索结果。与 [`session.sendPolicy`](/gateway/config-agents#session) 具有相同的 schema：

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

    随附的默认值是仅限 DM/direct，拒绝群组和其他频道类型。`match.keyPrefix` 匹配归一化后的会话键；`match.rawKeyPrefix` 匹配包含 `agent:<id>:` 的原始键。

  </Accordion>
  <Accordion title="引用">
    `memory.citations` 适用于所有后端：

    | Value            | Behavior                                            |
    | ------------------ | ------------------------------------------------------ |
    | `auto` (default) | 在片段中包含 `Source: <path#line>` 页脚    |
    | `on`             | 始终包含页脚                               |
    | `off`            | 省略页脚（路径仍会在内部传递给 agent） |

  </Accordion>
</AccordionGroup>

当启用 gateway-start QMD 初始化时，OpenClaw 仅为符合条件的 agent 启动 QMD。如果 `update.onBoot` 为 true 且未配置间隔/嵌入维护，则启动时会使用一次性管理器执行启动刷新并关闭它。如果配置了更新或嵌入间隔，则启动时会打开长期运行的 QMD 管理器，使其接管 watcher 和间隔计时器；`update.onBoot: false` 只会跳过立即的启动刷新。

### 完整 QMD 示例

```json5
{
  memory: {
    backend: "qmd",
    citations: "auto",
    qmd: {
      includeDefaultMemory: true,
      update: { interval: "5m", debounceMs: 15000 },
      limits: { maxResults: 4, timeoutMs: 4000 },
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

Dreaming 作为一次计划性扫描运行，并将内部的浅层/深层/REM 阶段作为实现细节。

有关概念性行为和斜杠命令，请参见 [Dreaming](/concepts/dreaming)。

### 用户设置

| Key                                    | Type      | Default       | Description                                                                                                                      |
| -------------------------------------- | --------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                              | `boolean` | `false`       | 完全启用或禁用 dreaming                                                                                                           |
| `frequency`                            | `string`  | `0 3 * * *`   | 可选的完整 dreaming 扫描 cron 频率                                                                                               |
| `model`                                | `string`  | default model | 可选的 Dream Diary 子代理模型覆盖                                                                                              |
| `phases.deep.maxPromotedSnippetTokens` | `number`  | `160`         | 每个提升到 `MEMORY.md` 的短期回忆片段所保留的最大估计 token 数；来源元数据仍保持可见 |

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
- Dreaming 会将可读的叙述性输出写入 `DREAMS.md`（或现有的 `dreams.md`）。
- `dreaming.model` 使用现有插件子代理的信任门控；在启用它之前，请设置 `plugins.entries.memory-core.subagent.allowModelOverride: true`。
- 当配置的模型不可用时，Dream Diary 会使用会话默认模型重试一次。信任或允许列表失败会被记录日志，不会被静默重试。
- 浅层/深层/REM 阶段策略和阈值属于内部行为，不是面向用户的配置。

</Note>

## 相关内容

- [配置参考](/gateway/configuration-reference)
- [记忆概览](/concepts/memory)
- [记忆搜索](/concepts/memory-search)
