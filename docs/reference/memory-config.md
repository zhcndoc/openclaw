---
summary: "内置内存搜索提供商、检索模式和多模态索引"
title: "内存配置参考"
sidebarTitle: "内存配置"
read_when:
  - 你想配置内存搜索提供商或嵌入模型
  - 你想了解混合搜索、MMR 或时间衰减默认值
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
  <Card title="内存搜索" href="/concepts/memory-search">
    搜索管道和调优。
  </Card>
  <Card title="活动内存" href="/concepts/active-memory">
    用于交互式会话的内存子代理。
  </Card>
</CardGroup>

所有共享内存设置都位于 `openclaw.json` 顶层的 `memory` 下。搜索默认值使用 `memory.search`；按代理的搜索覆盖使用 `agents.entries.*.memory.search`。

<Note>
对于推荐的个人代理工作流，请使用
`memory.search.rememberAcrossConversations`。高级活动内存定位、
模型、提示词和延迟控制位于 `plugins.entries.active-memory` 下。

请参见 [活动内存](/concepts/active-memory)，了解两种激活路径、
会话记录持久化以及安全发布指南。
</Note>

---

## 跨会话记忆

| Key                           | Type      | Default                                                    | Description                                                                    |
| ----------------------------- | --------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `rememberAcrossConversations` | `boolean` | 对个人安装为开启；在配置了 DM 隔离时为关闭 | 使用该代理的其他已识别私密对话中的相关上下文。 |

仅当只有受信任的个人代理应使用跨会话转录回忆时，按代理进行配置：

```json5
{
  agents: {
    entries: {
      personal: {
        memory: {
          search: {
            rememberAcrossConversations: true,
          },
        },
      },
    },
  },
}
```

该值遵循正常的 `memory.search` 继承规则，并支持按代理覆盖。未设置时，仅当全局
`session.dmScope` 未设置或为 `"main"`，且没有任何绑定配置 `session.dmScope`
覆盖时，才默认为开启。任何已配置的 DM 隔离都会使其默认为关闭。显式设置为 `true` 或
`false` 始终优先。启用后会启用会话转录索引，并将 `sessions` 添加到该代理解析后的记忆源中。

OpenClaw 的内置记忆提供商支持此受保护路径。其他记忆提供商可以继续使用自己的
回忆钩子和高级 Active Memory 工具，但除非当前提供商支持受保护的私密转录回忆，否则会跳过此设置。
`openclaw doctor` 会报告不受支持的提供商，或报告显式的 Active Memory `toolsAllow` 列表中未包含
`memory_search` 的情况。

检索边界比一般会话搜索更窄：

- 仅同一代理已识别的私密对话符合条件
- 正在回答的对话会被排除
- 群组和频道会被排除为来源和目标
- 未知的对话类型会失败并关闭
- 沙箱化回忆不能使用特殊的跨会话授权

该设置不会更改 `tools.sessions.visibility`、会话密钥、转录存储、传递路由，也不会更改
`sessions_list`、`sessions_history` 和 `sessions_send` 的权限。Active Memory 会执行一次有边界的只读检索；不可用或超时的检索不会阻塞回复。

---

## 提供方选择

| 键         | 类型      | 默认值           | 描述                                                                                                                                                                                                                                                                                     |
| ---------- | --------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`  | `boolean` | `true`           | 启用或禁用内存搜索                                                                                                                                                                                                                                                                       |
| `provider` | `string`  | `"openai"`       | 嵌入适配器 ID，例如 `bedrock`、`deepinfra`、`gemini`、`github-copilot`、`local`、`mistral`、`ollama`、`openai`、`openai-compatible` 或 `voyage`；也可以是已配置的 `models.providers.<id>`，其 `api` 指向内存嵌入适配器或 OpenAI 兼容模型 API |
| `model`    | `string`  | 提供方默认值     | 嵌入模型名称                                                                                                                                                                                                                                                                              |
| `fallback` | `string`  | `"none"`         | 主提供方失败时的回退适配器 ID                                                                                                                                                                                                                                                             |

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

明确指定的非本地提供方会在失败时直接返回错误。如果你将 `memory.search.provider` 设置为
Bedrock、DeepInfra、Gemini、GitHub
Copilot、LM Studio、Mistral、Ollama、OpenAI、Voyage 或 OpenAI 兼容的
自定义提供方等具体的远程后端提供方，并且该提供方在运行时不可用，`memory_search`
会返回不可用结果，而不是静默退回到仅 FTS 检索。请修复
提供方/身份验证配置，切换到可访问的提供方，或者如果你希望有意使用仅 FTS 检索，
请设置 `provider: "none"`。

### 自定义提供方 ID

`memory.search.provider` 可以指向自定义的 `models.providers.<id>` 条目，用于内存专用的提供方适配器（例如 `ollama`），或用于 OpenAI 兼容的模型 API（例如 `openai-responses` / `openai-completions`）。OpenClaw 会解析该提供方的 `api` 所属适配器，同时保留自定义提供方 ID，以处理端点、身份验证和模型前缀。这使多 GPU 或多主机设置能够将内存嵌入专用于特定的本地端点：

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
  memory: {
    search: {
      provider: "ollama-5080",
      model: "qwen3-embedding:0.6b",
    },
  },
}
```

### API 密钥解析

远程嵌入需要 API 密钥。Bedrock 则使用 AWS SDK 默认凭证链（实例角色、SSO、访问密钥或 Bedrock API 密钥）。

| 提供方       | 环境变量                                             | 配置键                          |
| -------------- | --------------------------------------------------- | ----------------------------------- |
| Bedrock        | AWS 凭证链，或 `AWS_BEARER_TOKEN_BEDROCK`           | 不需要 API 密钥                   |
| DeepInfra      | `DEEPINFRA_API_KEY`                                 | `models.providers.deepinfra.apiKey` |
| Gemini         | `GEMINI_API_KEY`                                    | `models.providers.google.apiKey`    |
| GitHub Copilot | `COPILOT_GITHUB_TOKEN`、`GH_TOKEN`、`GITHUB_TOKEN`  | 通过设备登录进行身份验证       |
| Mistral        | `MISTRAL_API_KEY`                                   | `models.providers.mistral.apiKey`   |
| Ollama         | `OLLAMA_API_KEY`（占位符）                          | --                                  |
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
  memory: {
    search: {
      provider: "openai-compatible",
      model: "text-embedding-3-small",
      remote: {
        baseUrl: "https://api.example.com/v1/",
        apiKey: "YOUR_KEY",
      },
    },
  },
}
```

---

## 提供方特定配置

<AccordionGroup>
  <Accordion title="Gemini">
    | 键                    | 类型     | 默认值                | 描述                                |
    | ---------------------- | ---------------------- | ------------------------------------------- |
    | `model`                | `string` | `gemini-embedding-001` | 也支持 `gemini-embedding-2-preview` |
    | `outputDimensionality` | `number` | `3072`                 | 对于 Embedding 2：768、1536 或 3072        |

    <Warning>
    更改模型或 `outputDimensionality` 会改变索引身份。OpenClaw
    会暂停向量搜索，直到你显式重建内存索引。
    </Warning>

  </Accordion>
  <Accordion title="OpenAI 兼容输入类型">
    OpenAI 兼容的嵌入端点可以选择启用提供方特定的 `input_type` 请求字段。这对于需要为查询和文档嵌入使用不同标签的非对称嵌入模型很有用。

    | 键                 | 类型     | 默认值 | 描述                                             |
    | ------------------- | ------- | ------- | -------------------------------------------------------- |
    | `inputType`         | `string` | 未设置   | 查询和文档嵌入共用的 `input_type`   |
    | `queryInputType`    | `string` | 未设置   | 查询时的 `input_type`；会覆盖 `inputType`          |
    | `documentInputType` | `string` | 未设置   | 索引/文档的 `input_type`；会覆盖 `inputType`      |

    ```json5
    {
      memory: {
        search: {
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
    }
    ```

    更改这些值会影响提供方批量索引的嵌入缓存标识；当上游模型对这些标签的处理方式不同时，应随后执行一次内存重建索引。

  </Accordion>
  <Accordion title="Bedrock">
    ### Bedrock 嵌入配置

    Bedrock 使用 AWS SDK 默认凭证链，再加上 OpenClaw 检查过的 bearer token，因此配置中不会存储 API key。如果 OpenClaw 运行在启用了 Bedrock 的 EC2 实例角色上，只需设置 provider 和 model：

    ```json5
    {
      memory: {
        search: {
          provider: "bedrock",
          model: "amazon.titan-embed-text-v2:0",
        },
      },
    }
    ```

    | 键                    | 类型     | 默认值                        | 描述                     |
    | ---------------------- | ------------------ | -------------------------------- |
    | `model`                | `string` | `amazon.titan-embed-text-v2:0` | 任意 Bedrock 嵌入模型 ID  |
    | `outputDimensionality` | `number` | 模型默认值                  | 对于 Titan V2：256、512 或 1024 |

    **支持的模型**（带有家族检测和维度默认值）：

    | 模型 ID                                   | 提供方   | 默认维度 | 可配置维度          |
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

    **区域：** 按以下顺序解析：`memory.search.remote.baseUrl` 覆盖值、`models.providers.amazon-bedrock.baseUrl` 配置、`AWS_REGION`、`AWS_DEFAULT_REGION`，最后使用默认值 `us-east-1`。

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
  <Accordion title="本地（GGUF + llama.cpp）">
    | 键                   | 类型               | 默认值                | 描述                                                                                                                                                                                                                                                                                                          |
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

    数值型 `local.contextSize` 值也会影响 node-llama-cpp 的自动 GPU 层放置，因此模型权重和所请求的嵌入上下文会被一起适配。`openclaw memory status --deep` 会在运行时加载后报告上次已知的 llama.cpp 后端、设备、卸载、请求上下文以及带时间戳的内存信息；被动状态不会加载模型。

    对本地 GGUF 嵌入显式设置 `provider: "local"`。明确的本地配置支持 `hf:` 和 HTTP(S) 模型引用（通过 node-llama-cpp 的模型解析），但这不会改变默认提供方。

  </Accordion>
</AccordionGroup>

## 索引行为

内存引擎负责同步、批处理、watch 以及压缩后  
索引启发式。OpenClaw 保持这些行为启用，并维持  
默认设置，而不是暴露按安装实例划分的时序开关。

## 混合搜索配置

位于 `memory.search.query` 下的所有配置：

| 键           | 类型     | 默认值 | 描述                               |
| ------------ | -------- | ------ | ---------------------------------- |
| `maxResults` | `number` | `6`    | 注入前返回的最大记忆命中数         |
| `minScore`   | `number` | `0.35` | 纳入命中的最低相关性分数          |

混合检索仍处于启用状态。内置引擎始终对带日期的每日笔记应用固定的
30 天时效半衰期，并在混合相关性之后应用固定的重要性乘数，随后使用固定
lambda 值 `0.7` 进行 MMR 多样性排序。`MEMORY.md`、`USER.md` 以及其他长期记忆文件
不会衰减。可为空的重要性值按中性处理，因此现有索引无需迁移或新增调优键。

对已提升、受信任条目的强触发匹配，可在符合条件的交互轮次中注入最多三条
紧凑记忆。目前，根目录下的 `MEMORY.md` 和 `USER.md` 是精选的可注入层级。日记和转录内容绝不会
被自动注入。

### 完整示例

```json5
{
  memory: {
    search: {
      query: {
        maxResults: 6,
        minScore: 0.35,
      },
    },
  },
}
```

---

## 附加内存路径

| 键           | 类型                                                | 描述                       |
| ------------ | --------------------------------------------------- | -------------------------- |
| `extraPaths` | `Array<string \| { path: string; pattern?: string }>` | 要索引的其他目录或文件 |

```json5
{
  memory: {
    search: {
      extraPaths: ["../team-docs", { path: "/srv/shared-notes", pattern: "runbooks/**/*.md" }],
    },
  },
}
```

路径可以是绝对路径，也可以是相对于工作区的路径。目录会递归扫描其中受支持的
文件。对象条目使用以 `/` 分隔、相对于根目录的 glob 来缩小目录范围；直接指定的
文件条目则会被精确索引。内置引擎会跳过符号链接。

## 多模态记忆（Gemini）

使用 Gemini Embedding 2 将图像和音频与 Markdown 一起建立索引：

| Key                       | Type       | Default    | Description                            |
| ------------------------- | ---------- | ---------- | -------------------------------------- |
| `multimodal.enabled`      | `boolean`  | `false`    | 启用多模态索引                         |
| `multimodal.modalities`   | `string[]` | --         | `["image"]`、`["audio"]` 或 `["all"]` |
| `multimodal.maxFileBytes` | `number`   | `10485760` | 建立索引时的最大文件大小（10 MiB）     |

<Note>
仅适用于 `extraPaths` 中的文件。默认记忆根目录仍仅支持 Markdown。需要 `gemini-embedding-2-preview`。`fallback` 必须为 `"none"`。
</Note>

支持的格式：`.jpg`、`.jpeg`、`.png`、`.webp`、`.gif`、`.heic`、`.heif`（图像）；`.mp3`、`.wav`、`.ogg`、`.opus`、`.m4a`、`.aac`、`.flac`（音频）。

---

## 嵌入缓存

| Key             | Type      | Default | Description                      |
| --------------- | --------- | ------- | -------------------------------- |
| `cache.enabled` | `boolean` | `true`  | 将分块嵌入缓存到 SQLite 中 |

在重新索引或转录更新期间，防止对未更改的文本重新生成嵌入。

## 批量索引

## 批量索引

| 键                          | 类型      | 默认值 | 描述                |
| --------------------------- | --------- | ------ | ------------------- |
| `remote.nonBatchConcurrency` | `number`  | `4`    | 并行内联嵌入 |
| `remote.batch.enabled`       | `boolean` | `false` | 启用批量嵌入 API |

可用于 `gemini`、`openai` 和 `voyage`。对于大规模回填，OpenAI 批量通常是最快且最便宜的。

并发、轮询和超时行为由提供方负责。

---

## 会话记忆搜索

索引会话记录，并通过 `memory_search` 暴露它们：

| Key                           | Type       | Default                                                    | Description                              |
| ----------------------------- | ---------- | ---------------------------------------------------------- | ---------------------------------------- |
| `rememberAcrossConversations` | `boolean`  | 对个人安装为开启；在配置了 DM 隔离时为关闭                      | 允许跨会话的私密回忆                        |
| `sources`                     | `string[]` | `["memory"]`                                               | 添加 `"sessions"` 以包含转录内容           |

<Warning>
会话索引需要显式启用，并且以异步方式运行。结果可能会略有延迟。会话日志保存在磁盘上，因此请将文件系统访问视为信任边界。
</Warning>

<Note>
[会话记忆钩子](/automation/hooks#session-memory)会将对话摘录保存到 `<workspace>/memory/`，而 `memory` 源已经会为其建立索引。
如果同时启用了转录索引，同一段对话可能会同时出现在 `memory` 和 `sessions` 中，从而导致搜索结果重叠，并增加嵌入处理的工作量。若只需使用钩子进行回忆，请设置 `sources: ["memory"]` 和 `rememberAcrossConversations: false`；仅设置 `sources` 是不够的，因为跨会话回忆会自动添加 `sessions`。如果需要完整转录回忆，请运行 `openclaw hooks disable session-memory`。只有在确实需要这两种表示形式时，才同时启用二者。
</Note>

普通的由模型调用的会话转录搜索遵循
[`tools.sessions.visibility`](/gateway/config-tools#toolssessions)。默认的
`tree` 可见性会暴露当前会话、由当前会话生成的会话，以及通过环境组感知机制监视的同代理组会话。其他不相关的会话需要使用 `agent` 可见性（只有在还需要跨代理回忆且代理间策略允许时，才使用 `all`）。

`rememberAcrossConversations` 不会扩大该设置。它提供了一个仅在运行时生效的单独授权，限制为
同代理私有转录，并且仅在有界的 Active Memory 过程期间有效。

下面的示例将这些设置放在顶层 `memory.search` 下。你也可以
在按代理的 `memory.search` 覆盖中应用等效设置，当只有一个
代理应当索引和搜索会话转录时。

用于同代理从网关到 DM 的回忆：

```json5
{
  memory: {
    search: {
      experimental: { sessionMemory: true },
      sources: ["memory", "sessions"],
    },
  },
  tools: {
    sessions: { visibility: "agent" },
  },
}
```

---

## SQLite 向量加速（sqlite-vec）

| 键                          | 类型      | 默认值 | 描述                       |
| ---------------------------- | --------- | ------- | --------------------------------- |
| `store.vector.enabled`       | `boolean` | `true`  | 使用 sqlite-vec 进行向量查询     |
| `store.vector.extensionPath` | `string`  | 内置    | 覆盖 sqlite-vec 路径              |

当 sqlite-vec 不可用时，OpenClaw 会自动回退到进程内余弦相似度。

---

## 索引存储

内置内存索引位于每个 agent 的 OpenClaw SQLite 数据库中：
`agents/<agentId>/agent/openclaw-agent.sqlite`。

| 键                   | 类型     | 默认值     | 描述                               |
| --------------------- | -------- | ----------- | ----------------------------------------- |
| `store.fts.tokenizer` | `string` | `unicode61` | FTS5 分词器（`unicode61` 或 `trigram`） |

---

## 引用

`memory.citations` 控制内置记忆结果的引用可见性：

| 值               | 行为                                               |
| ---------------- | -------------------------------------------------- |
| `auto`（默认）   | 在有用时包含 `来源：<path#line>`                    |
| `on`             | 始终包含来源页脚                                   |
| `off`            | 省略页脚；路径仍可在内部使用                       |

---

## 梦境

梦境配置在 `plugins.entries.memory-core.config.dreaming` 下，而不是在 `memory.search` 下。

梦境作为一次计划性扫描运行，并将内部的浅层/深层/REM 阶段作为实现细节。

有关概念性行为和斜杠命令，请参见 [梦境](/concepts/dreaming)。

### 用户设置

| 键                                      | 类型      | 默认值        | 描述                                                                                                                        |
| --------------------------------------- | --------- | ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                               | `boolean` | `true`        | 完全启用或禁用梦境                                                                                                          |
| `frequency`                             | `string`  | `0 3 * * *`   | 用于完整梦境扫描的可选 cron 频率                                                                                             |
| `model`                                 | `string`  | 默认模型      | 可选的梦境日记子代理模型覆盖                                                                                               |
| `phases.deep.maxPromotedSnippetTokens`  | `number`  | `160`         | 从每个被提升到 `MEMORY.md` 的短期回忆片段中保留的最大估计 token 数；来源元数据仍然可见                                     |
| `phases.deep.maxPriorEntryLossFraction` | `number`  | `0.25`        | 拒绝会移除超过此前条目该比例的合并重写                                                                                       |

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
- 梦境会将机器状态写入 `memory/.dreams/`。
- 梦境会将人类可读的叙述输出写入 `DREAMS.md`（或已有的 `dreams.md`）。
- 深度整合会将之前的 `MEMORY.md` 存储在基于 SQLite 的插件状态中，并在 `DREAMS.md` 中记录重写次数和要点。
- 在整合和持久化提升之前，不受信任和系统生成的候选项会在结构上被排除。
- `dreaming.model` 使用现有的插件子代理信任门控；在启用它之前，请设置 `plugins.entries.memory-core.subagent.allowModelOverride: true`。
- 当配置的模型不可用时，梦境日记会使用会话默认模型重试一次。信任或允许列表失败会被记录，不会被静默重试。
- 浅层/深层/REM 阶段策略和阈值属于内部行为，不是面向用户的配置。

</Note>

## 相关内容

- [配置参考](/gateway/configuration-reference)
- [记忆概览](/concepts/memory)
- [记忆搜索](/concepts/memory-search)
