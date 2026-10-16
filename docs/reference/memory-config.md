---
summary: "内置内存搜索、准入排除和梦想配置"
title: "内存配置参考"
sidebarTitle: "内存配置"
doc-schema-version: 1
read_when:
  - "你想配置内存搜索提供商或嵌入模型"
  - "你想了解混合搜索、MMR 或时间衰减默认值"
  - "你想启用多模态内存索引"
  - "您需要从自动做梦摄取中排除特定会话源"
  - "您看到内存文件监视压力警告"
---

本页列出了 OpenClaw 内存搜索的每一个配置项。概念性概览请参见：

<CardGroup cols={2}>
  <Card title="记忆概览" href="/concepts/memory">
    内存如何工作。
  </Card>
  <Card title="内置引擎" href="/concepts/memory-builtin">
    默认的 SQLite 后端。
  </Card>
  <Card title="记忆搜索" href="/concepts/memory-search">
    搜索管道和调优。
  </Card>
  <Card title="主动记忆" href="/concepts/active-memory">
    用于交互式会话的内存子代理。
  </Card>
</CardGroup>

所有共享内存设置都位于 `openclaw.json` 中的顶级 `memory` 下。搜索默认使用`memory.search`；每个代理搜索覆盖使用 `agents.entries.*.memory.search`。

<Note>
对于推荐的个人代理工作流，请使用 `memory.search.rememberAcrossConversations`。高级活动内存定位、 模型、提示词和延迟控制位于 `plugins.entries.active-memory` 下。

有关激活路径、转录本持久性和安全推出指南，请参阅 [Active Memory](/concepts/active-memory)。
</Note>

---

## <a id="remember-across-conversations"></a> 跨会话记忆

| 键                           | 类型      | 默认值                                                    | 描述                                                                    |
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

该值遵循正常的 `memory.search` 继承规则，并支持按代理覆盖。未设置时，仅当全局 `session.dmScope` 未设置或为 `"main"`，且没有任何绑定配置 `session.dmScope` 覆盖时，才默认为开启。任何已配置的 DM 隔离都会使其默认为关闭。显式设置为 `true` 或 `false` 始终优先。启用后会启用会话转录索引，并将 `sessions` 添加到该代理解析后的记忆源中。

OpenClaw 的内置记忆提供商支持此受保护路径。其他记忆提供商可以继续使用自己的回忆钩子和高级 Active Memory 工具，但除非当前提供商支持受保护的私密转录回忆，否则会跳过此设置。 `openclaw doctor` 会报告不受支持的提供商，或报告显式的 Active Memory `toolsAllow` 列表中未包含 `memory_search` 的情况。

检索边界比一般会话搜索更窄：

- 仅同一代理已识别的私密对话符合条件
- 正在回答的对话会被排除
- 群组和频道会被排除为来源和目标
- 未知对话类型块召回
- 沙箱化回忆不能使用特殊的跨会话授权

该设置不会更改 `tools.sessions.visibility`、会话密钥、转录存储、传递路由，也不会更改 `sessions_list`、`sessions_history` 和 `sessions_send` 的权限。Active Memory 会执行一次有边界的只读检索；不可用或超时的检索不会阻塞回复。

---

## <a id="provider-selection"></a> 提供方选择

使用 `openclaw configure --section memory` 进行可选的交互式 provider/model 和凭证设置。本地引导和经典入门提供相同的步骤。所选的云或本地 HTTP 路由必须返回合成文本的有效向量，然后才能保存。现有设置和每个代理的覆盖在跳过或验证失败后仍然存在； SecretRefs 在保存的配置中保留引用。该检查不会打开内存索引、下载本地模型或重新索引文件。 Ollama和LM Studio使用其运行服务器和已下载的嵌入模型；请参阅 [ 交互式内存设置 ](/cli/configure#memory-section)。

| 键        | 类型      | 默认值          | 描述                                                                                                                                                                                                                                                                                 |
| ---------- | --------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`  | `boolean` | `true`           | 启用或禁用内存搜索                                                                                                                                                                                                                                                             |
| `provider` | `string`  | `"openai"`       | 嵌入适配器ID，例如`bedrock`、`deepinfra`、`gemini`、`github-copilot`、`local`、`mistral`、`ollama`、`openai`、 `openai-compatible`，或`voyage`；也可以是已配置的 `models.providers.<id>`，其 `api` 指向内存嵌入适配器或 OpenAI- 兼容模型 API |
| `model`    | `string`  | 提供方默认值 | 嵌入模型名称                                                                                                                                                                                                                                                                        |
| `fallback` | `string`  | `"none"`         | 主提供方失败时的回退适配器 ID                                                                                                                                                                                                                                                  |

当未设置 `provider` 时，OpenClaw 使用 OpenAI 嵌入。明确设置 `provider` 以使用 Bedrock、DeepInfra、Gemini、GitHub Copilot、Mistral、Ollama、Voyage、本地 GGUF 模型或 OpenAI- 兼容模型`/v1/embeddings` 端点。仍然显示 `provider: "auto"` 的旧配置解析为 `openai`。

<Warning>
更改嵌入提供方、模型、提供方设置、来源、作用域、 分块或分词器，可能使现有的 SQLite 向量索引不兼容。 OpenClaw 会暂停向量搜索并报告索引身份警告，而不是自动为全部内容重新嵌入。准备好后可使用 `openclaw memory status --index --agent <id>` 或 `openclaw memory index --force --agent <id>` 重建。
</Warning>

如果中断激活了无法读取现有索引的回退，稍后搜索将重试配置的主索引，恢复尝试之间有 30 秒的冷却时间。一旦主服务器响应并匹配存储的提供程序、模型和提供程序设置，搜索就会恢复，而无需重新启动网关或重建索引。已经使用后备构建的索引保留在该兼容的提供者上；恢复永远不会默默地替换它的嵌入。

当 `provider` 未设置、旧版 `provider: "auto"` 存在或 `provider: "none"` 有意选择 FTS-only 模式时，当嵌入不可用时，内存调用仍可以使用词汇 FTS 排名。

显式非本地提供商不会回退到 FTS-only 召回。如果您将 `memory.search.provider` 设置为具体的远程支持提供程序，例如 Bedrock、DeepInfra、Gemini、GitHub Copilot、LM Studio、Mistral、Ollama、OpenAI、Voyage 或OpenAI- 兼容的自定义提供程序，并且该提供程序在运行时不可用，`memory_search` 返回不可用的结果，而不是默默地使用 FTS-only 回调。修复 provider/auth 配置，切换到可访问的提供商，或者如果您想要故意召回 FTS-，则设置 `provider: "none"`。

### <a id="custom-provider-ids"></a> 自定义提供商 ID

对于 Azure OpenAI 部署，将自定义提供程序的 `baseUrl` 设置为部署 URL，并在其 `headers` 中配置 `api-version`。将请求嵌入到 Azure OpenAI 和 Azure AI Foundry 主机会将该标头移动到 URL 查询中；现有的非空 `api-version` 查询值优先。其他 OpenAI- 兼容主机保持配置的标头不变。

`memory.search.provider` 可以指向特定于内存的提供程序适配器（例如 `ollama`）或 OpenAI- 兼容模型 API（例如 `openai-responses` / `openai-completions`）的自定义 `models.providers.<id>` 条目。 OpenClaw 解析该提供程序的 `api` 嵌入适配器所有者，同时保留端点、身份验证和模型前缀处理的自定义提供程序 ID。这使得多 GPU 或多主机设置将内存嵌入专用于特定的本地端点：

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

### <a id="api-key-resolution"></a> API 密钥解析

远程嵌入身份验证取决于提供商。 Bedrock 使用 AWS SDK 默认凭证链（实例角色、SSO、访问密钥或 Bedrock API 密钥）。

| 提供者       | 环境变量                                             | 配置键                          |
| -------------- | --------------------------------------------------- | ----------------------------------- |
| 基岩        | AWS 凭证链，或 `AWS_BEARER_TOKEN_BEDROCK` | 不需要 API 密钥                   |
| DeepInfra      | `DEEPINFRA_API_KEY`                                 | `models.providers.deepinfra.apiKey` |
| Gemini         | `GEMINI_API_KEY`                                    | `models.providers.google.apiKey`    |
| GitHub Copilot | `COPILOT_GITHUB_TOKEN`                              | 通过设备登录进行身份验证       |
| Mistral        | `MISTRAL_API_KEY`                                   | `models.providers.mistral.apiKey`   |
| Ollama         | `OLLAMA_API_KEY`（占位符）                      | --                                  |
| OpenAI         | `OPENAI_API_KEY`                                    | `models.providers.openai.apiKey`    |
| 航程         | `VOYAGE_API_KEY`                                    | `models.providers.voyage.apiKey`    |

对于自定义 OpenAI- 兼容提供程序，`models.providers.<id>.apiKey` 可以命名与 [`openclaw models auth`](/cli/models#auth-profiles) 一起保存的 API- 密钥或不记名令牌配置文件，例如 `my-embeddings:default`。即使为提供者保存了其他配置文件，文字键也会保留其配置值。空键不会选择已保存的配置文件。

<Note>
当账户授予嵌入访问权限时，OpenAI 嵌入可以使用存储的 Codex OAuth 配置文件。单独的“使用 ChatGPT 登录”令牌共享授予并不授权嵌入。运行 `openclaw memory status --deep` 检查您的帐户。
</Note>

---

## <a id="remote-endpoint-config"></a> 远程端点配置

将 `provider: "openai-compatible"` 用于通用 OpenAI- 兼容 `/v1/embeddings` 服务器，该服务器不应继承全局 OpenAI 聊天凭证。

<ParamField path="remote.baseUrl" type="string">
  定制 API 底座 URL。仅当解析为提供程序的配置目标时，才会继承提供程序凭据和标头。
</ParamField>

OpenAI- 兼容、Gemini 和 LM Studio 嵌入使用与模型推理相同的专用网络策略。对于 OpenAI- 兼容和 Gemini 嵌入，默认情况下信任配置的自定义和本地源，而不将该信任扩展到重定向到另一个源。 LM Studio 默认允许专用网络请求（包括重定向），以匹配其推理行为。所选提供商的 `models.providers.<id>.request.allowPrivateNetwork` 也适用：`false` 阻止专用目标，而 `true` 明确允许专用网络请求。解析为专用地址的已知提供商主机名（例如，Azure OpenAI 专用端点或水平分割 DNS）在升级后需要 `models.providers.<id>.request.allowPrivateNetwork: true`。在嵌入提供程序的 ID 上设置此项：OpenAI 为 `openai`，Gemini 为 `google`，或配置的 LM Studio 提供程序 ID。不同名称的聊天提供商的设置不会保留。

<ParamField path="remote.apiKey" type="string">
  API 密钥由远程目标拥有。当 `remote.baseUrl` 指向提供商配置的目标以外的某个位置时，请设置此项。
</ParamField>
<ParamField path="remote.headers" type="object">
  远程目标拥有的额外 HTTP 标头。仅针对提供程序的配置目标合并提供程序默认值。
</ParamField>

标头值必须是字符串。内存标头中的环境引用在秘密准备期间解析；在发送任何嵌入请求之前，未解析的引用会停止索引或搜索，并出现命名设置错误。已经解析的值按字面意思使用。不需要身份验证的 LM Studio 和通用 OpenAI- 兼容服务器仍然可以在没有凭据的情况下工作，包括在 LAN 主机上；配置损坏的引用与忽略身份验证不同。

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

## <a id="provider-specific-config"></a> 提供方特定配置

<AccordionGroup>
  <Accordion title="Gemini">
    | 键                    | 类型     | 默认值                | 描述                                |
    | ---------------------- | -------- | ---------------------- | ------------------------------------------- |
    | `model`                | `string` | `gemini-embedding-001` | 还支持`gemini-embedding-2`         |
    | `outputDimensionality` | `number` | `3072`                 | 128-3072；推荐：768、1536 或 3072  |

    在迁移到稳定模型期间，旧的 `gemini-embedding-2-preview` 标识符仍然被接受。

    <Warning>
    更改模型或 `outputDimensionality` 会改变索引身份。OpenClaw 会暂停向量搜索，直到你显式重建内存索引。

    即使您不编辑配置，升级已使用 `gemini-embedding-2` 的任何现有配置也会触发相同的暂停。在 2026.8.1 之前，无论 `outputDimensionality` 不存在还是明确设置，稳定模型的维度都会从索引标识中省略。从 2026.8.1 （[#128716](https://github.com/openclaw/openclaw/pull/128716)） 开始，缺失的设置解析为 3072，而 128 到 3072 之间的显式设置将成为标识的一部分。当此设置不存在时，默认 `gemini-embedding-001` 保留其现有标识； 2026.8.1 不再忽略的显式配置值也会更改身份。对于任一路径，请使用 `openclaw memory status --deep --agent <id>` 检查受影响的代理，然后在准备好后使用 `openclaw memory index --force --agent <id>` 进行重建。
    </Warning>

  </Accordion>
  <Accordion id="openai-compatible-input-types" title="OpenAI-兼容输入类型">
    OpenAI- 兼容的嵌入端点可以选择特定于提供商的 `input_type` 请求字段。这对于需要不同标签进行查询和文档嵌入的非对称嵌入模型非常有用。

    | 键                 | 类型     | 默认值 | 描述                                             |
    | ------------------- | -------- | ------- | -------------------------------------------------------- |
    | `inputType`         | `string` | 未设置   | 查询和文档嵌入共用的 `input_type`   |
    | `queryInputType`    | `string` | 未设置   | 查询时的 `input_type`；会覆盖 `inputType`          |
    | `documentInputType` | `string` | 未设置   | Index/document `input_type`；覆盖 `inputType`      |

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
  <Accordion id="bedrock" title="基岩">
    ### <a id="bedrock-embedding-config"></a> Bedrock 嵌入配置

    Bedrock 使用 AWS SDK 默认凭证链加上 OpenClaw-checked 不记名令牌，因此 config.json 中不存储 API 密钥。如果 OpenClaw 在 EC2 上运行且具有启用 Bedrock 的实例角色，则只需设置提供程序和模型：

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

    并发嵌入请求共享正在进行的 AWS 凭证刷新，因此批处理不会单独解析每个块的实例角色凭证。稍后的请求再次通过 SDK 刷新，获取轮换的配置文件和角色选择，而无需重新启动网关。

    | 键                    | 类型     | 默认值                        | 描述                     |
    | ---------------------- | -------- | ------------------------------- | -------------------------------- |
    | `model`                | `string` | `amazon.titan-embed-text-v2:0` | 任意 Bedrock 嵌入模型 ID  |
    | `outputDimensionality` | `number` | 模型默认值                  | 对于 Titan V2：256、512 或 1024 |

    **支持的模型**（带有家族检测和维度默认值）：

    | 模型 ID                                   | 提供者   | 默认维度 | 可配置维度          |
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

    吞吐量后缀的变体（e.g.、`amazon.titan-embed-text-v1:2:8k`）和区域前缀的推理配置文件 ID（e.g.、`us.amazon.titan-embed-text-v2:0`）继承基本模型的配置。

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
  <Accordion id="local-managed-llama-cpp-server" title="本地（托管llama.cpp服务器）">
    | 键               | 类型     | 默认值         | 描述             |
    | ----------------- | -------- | --------------- | ----------------------- |
    | `local.modelPath` | `string` | 自动下载 | GGUF 模型文件的路径 |

    安装官方 [llama.cpp 提供程序 ](/plugins/llama-cpp)，然后在交互式安装中选择一次 llama.cpp。 OpenClaw 安装固定的、经过验证的 `llama-server` 并写入其环回 `localService` 配置。默认模型：`embeddinggemma-300m-qat-Q8_0.gguf`（~0.3 GB，自动下载）。

    使用独立 CLI 验证 Gateway 使用的相同 provider 路径：

    ```bash
    openclaw memory status --deep --agent main
    openclaw memory index --force --agent main
    ```

    缓存放置由提供商拥有。 `openclaw memory status --deep` 报告在处理嵌入请求后从托管服务器观察到的服务器构建、模型路径、功能和端点事实。

    为本地 GGUF 嵌入显式设置 `provider: "local"`。显式本地配置支持完整的 `hf:` 文件引用和完整性承载的 HTTPS GGUF URL，但它们不会更改默认提供程序。

  </Accordion>
</AccordionGroup>

## <a id="indexing-behavior"></a> 索引行为

内存引擎负责同步、批处理、watch 以及压缩后索引启发式。OpenClaw 保持这些行为启用，并维持默认设置，而不是暴露按安装实例划分的时序开关。

### <a id="file-watcher-pressure"></a> 文件观察压力

“内存文件监视正在跟踪...”警告报告监视路径或目录的咨询计数，而不是测量的主机限制或确认的耗尽。删除不必要的 `memory.search.extraPaths` 条目或缩小其目录根目录。全局条目和 `agents.entries.<id>.memory.search.extraPaths` 条目相结合：空的每代理列表不会删除全局根。仅更改条目的 `pattern` 过滤器索引文件，而不是正在监视的目录树。当每个适用模式之外的事件不能影响索引文件或目录时，它们将被忽略。当索引内容可能已更改时，没有路径或未知条目类型的事件保持保守。

删除额外路径条目不会排除仍属于默认 `MEMORY.md`、`USER.md` 或 `memory/` 根的文件。如果减少额外路径还不够，请检查网关主机上的文件监视和打开文件限制。不存在支持的 `memory.search.sync.watch` 设置。

更改后，重新启动网关。要刷新受影响的索引，请使用其配置文件和环境（包括任何 `OPENCLAW_STATE_DIR` 或 `OPENCLAW_CONFIG_PATH` 覆盖）在网关主机上运行 `openclaw memory index --force --agent <id>`。使用受影响代理的ID；警告中打印的命令包括它以及活动配置文件或容器提示。参见[内存索引](/cli/memory#memory-index)。

## <a id="hybrid-search-config"></a> 混合搜索配置

位于 `memory.search.query` 下的所有配置：

| 键          | 类型     | 默认值 | 描述                                                                              |
| ------------ | -------- | ------- | ---------------------------------------------------------------------------------------- |
| `maxResults` | `number` | `6`     | 注入前返回的最大记忆命中数                                                |
| `minScore`   | `number` | `0.35`  | 新近度衰减前的最低相关性得分，包括重要性和项目权重 |

如果没有每次呼叫 `maxResults`，仅主要 `memory_search` 呼叫将使用此配置的限制，包括 `corpus=memory` 和 `corpus=sessions`。 Wiki 和组合搜索（`corpus=wiki` 或 `corpus=all`）保留各自默认的 10 个结果。显式工具 `maxResults` 会覆盖适用的默认值。

混合检索仍处于启用状态。内置引擎始终对带日期的每日笔记应用固定的 30 天时效半衰期，并在混合相关性之后应用固定的重要性乘数，随后使用固定 lambda 值 `0.7` 进行 MMR 多样性排序。`MEMORY.md`、`USER.md` 以及其他长期记忆文件不会衰减。可为空的重要性值按中性处理，因此现有索引无需迁移或新增调优键。

对已提升、受信任条目的强触发匹配，可在符合条件的交互轮次中注入最多三条紧凑记忆。目前，根目录下的 `MEMORY.md` 和 `USER.md` 是精选的可注入层级。日记和转录内容绝不会被自动注入。

### <a id="full-example"></a> 完整示例

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

## <a id="additional-memory-paths"></a> 附加内存路径

| 键          | 类型                                                  | 描述                              |
| ------------ | ----------------------------------------------------- | ---------------------------------------- |
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

路径可以是绝对路径，也可以是相对于工作空间的路径。递归扫描目录以查找支持的文件。对象条目使用 `/` 分隔符通过根相对 glob 缩小目录范围；直接文件条目被精确索引。具有相同解析目录的条目共享一次扫描，并且扫描会跳过其模式可能不相关的子目录。复杂的模式保留保守的遍历。内置引擎会跳过符号链接。当配置的根目录是符号链接时，`openclaw memory status` 在文本和 JSON 输出中命名跳过的根目录，并建议配置其解析的绝对目录。

对于共享笔记，请将每个工作区的 `memory/` 目录保留在本地，并将共享目录的解析文件系统路径添加到 `extraPaths`。此设置索引注释；它不授权通过符号链接进行旧主机事件迁移。

如果 `openclaw doctor --fix` 报告不安全的内存核心主机事件源，请检查命名路径和权限。在替换任何符号链接之前备份旧日志。要导入它，请将 `memory/.dreams/events.jsonl` 中的内容作为常规文件保留在预期工作空间内的常规目录下，然后重新运行 `openclaw doctor --fix`。医生对被拒绝的来源保持原样。支持到工作区根本身的符号链接。当存在遗留事件源、导入声明或迁移的存档时，该根下面的符号链接将被拒绝；没有这些源的目录不需要修复。

如果检查点 `events.jsonl.migrated` 存档发生了非追加更改，Doctor 会发出警告并保留存档和已导入的 SQLite 事件。它推迟了该工作区中的后续事件生成，同时继续不相关的修复。保存档案以供查阅；此警告并不意味着其编辑的内容已导入。不安全的源路径和失败的导入仍然阻止 Doctor。

---

## <a id="multimodal-memory-(gemini)"></a><a id="multimodal-memory-gemini"></a> 多模态记忆（Gemini）

使用 Gemini 嵌入 2 与 Markdown 一起索引图像和音频：

| 键                       | 类型       | 默认值    | 描述                            |
| ------------------------- | ---------- | ---------- | -------------------------------------- |
| `multimodal.enabled`      | `boolean`  | `false`    | 启用多模态索引             |
| `multimodal.modalities`   | `string[]` | --         | `["image"]`、`["audio"]` 或 `["all"]` |
| `multimodal.maxFileBytes` | `number`   | `10485760` | 建立索引时的最大文件大小（10 MiB）    |

<Note>
仅适用于 `extraPaths` 中的文件。默认内存根仅保留 Markdown-。需要 `gemini-embedding-2`（也接受旧版预览标识符）。 `fallback` 必须是 `"none"`。
</Note>

支持格式：`.jpg`、`.jpeg`、`.png`（图像）； `.mp3`、`.wav`（音频）。

---

## <a id="embedding-cache"></a> 嵌入缓存

| 键             | 类型      | 默认值 | 描述                      |
| --------------- | --------- | ------- | -------------------------------- |
| `cache.enabled` | `boolean` | `true`  | 将分块嵌入缓存到 SQLite 中 |

并发、轮询和超时行为由提供方负责。

---

## <a id="batch-indexing"></a> 会话记忆搜索

| 键                    | 类型      | 默认值 | 描述                |
| ---------------------- | --------- | ------- | -------------------------- |
| `remote.batch.enabled` | `boolean` | `false` | 启用批量嵌入 API |

适用于 `gemini`、`openai` 和 `voyage`。对于大型回填任务，OpenAI 批处理通常速度最快且成本最低。

批处理启用是唯一的远程批处理设置。并发、轮询和超时行为由提供商负责。

对于普通的嵌入请求，具有一个显式项目上限的已识别错误会直接调整重试批次的大小。不可用或冲突的上限将退回到将被拒绝的批次减半。成功的切片保留其输入顺序和缓存条目。

---

<a id="session-memory-search-experimental" />

## <a id="session-memory-search"></a> 会话记忆搜索

索引会话转录内容，并通过 `memory_search` 呈现：

| 键                           | 类型       | 默认值                                                    | 描述                              |
| ----------------------------- | ---------- | ---------------------------------------------------------- | ---------------------------------------- |
| `rememberAcrossConversations` | `boolean`  | 对个人安装为开启；在配置了 DM 隔离时为关闭 | 允许跨会话的私密回忆 |
| `sources`                     | `string[]` | `["memory"]`                                               | 添加 `"sessions"` 以请求成绩单  |

<Warning>
会话索引是可选的并且异步运行。结果可能有点陈旧。活动转录本位于代理的 SQLite 数据库中，而保留的转录本工件可以位于磁盘上。将对两者的访问视为同一信任边界的一部分。
</Warning>

在 `sources` 中请求 `"sessions"` 本身不会启用转录本索引。将 `memory.search.experimental.sessionMemory: true` 设置为索引会话，或启用 `memory.search.rememberAcrossConversations` 以进行私人交叉对话调用。当此门排除显式 `"sessions"` 源时，`openclaw memory status` 和 `openclaw doctor` 会报告。此信息性医生笔记不会失败 `openclaw doctor --lint`。

内部梦想叙事、计划任务和心跳会话记录未编入索引，包括保留的压缩叙事档案，其实时会话元数据已消失。它们可能会引用用户对话中的片段，但不是可搜索的记忆源。使用 [`openclaw memory forget`](/cli/memory#memory-forget) 清除的会话也会被永久排除，即使它们的源转录本仍保留在会话存储中。强制重新索引会删除陈旧的成绩单记录，而无需重新接纳任一组。普通用户会话记录（包括保留、重置和删除的会话存档）在明确定位之前仍然有效。

<Note>
[ 会话内存挂钩 ](/automation/hooks/bundled-hooks#session-memory) 将对话摘录保存到 `<workspace>/memory/`，`memory` 源已对其进行索引。如果还启用了转录索引，则 `memory` 和 `sessions` 中可能会出现相同的对话，从而导致搜索结果重叠和额外的嵌入工作。对于仅钩子调用，设置`sources: ["memory"]`和`rememberAcrossConversations: false`；单独使用 `sources` 是不够的，因为交叉对话召回会自动添加 `sessions`。如需完整转录本回忆，请运行 `openclaw hooks disable session-memory`。仅当您有意需要两种表示形式时才启用两者。
</Note>

普通模型调用的会话记录搜索遵循 [`tools.sessions.visibility`](/gateway/config-tools#tools-sessions)。默认 `all` 可见性允许未沙盒呼叫者进行跨代理会话访问，包括其他用户的记录。 `memory_search` 的范围仍然是所选代理的索引语料库；使用 [`sessions_search`](/concepts/session-search) 进行网关范围的转录本搜索。跨代理访问默认处于启用状态，并受 `tools.agentToAgent` 管辖；设置 `enabled: false` 阻止普通跨代理访问或使用 `allow` 限制代理对；请求者拥有的本机子代理和 ACP 子会话在 `tree` 或 `all` 下保持可访问。设置 `agent` 进行同代理召回，或设置 `tree` 进行当前加上生成的范围（主仍然可以看到所有同代理会话），或设置 `self` 进行严格的当前会话访问。每个对等点 DM 范围本身并不限制会话工具调用。沙盒限制和隐身排除仍然适用。

`rememberAcrossConversations` 不会扩大该设置。它提供了一个仅在运行时生效的单独授权，限制为同代理私有转录，并且仅在有界的 Active Memory 过程期间有效。

对 `sessions` 语料库的显式 `memory_search` 请求需要为该代理启用会话搜索。如果不可用，OpenClaw 解释了如何启用会话索引而不是默默地搜索内存文件。

下面的示例将这些设置放在顶层 `memory.search` 下。你也可以在按代理的 `memory.search` 覆盖中应用等效设置，当只有一个代理应当索引和搜索会话转录时。

要仅保留同一座席的转录记录回忆，请缩小默认 `all` 的会话可见性：

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

## <a id="sqlite-vector-acceleration-(sqlite-vec)"></a><a id="sqlite-vector-acceleration-sqlite-vec"></a> SQLite 向量加速（sqlite-vec）

| 键                          | 类型      | 默认值 | 描述                       |
| ---------------------------- | --------- | ------- | --------------------------------- |
| `store.vector.enabled`       | `boolean` | `true`  | 使用 sqlite-vec 进行向量查询 |
| `store.vector.extensionPath` | `string`  | 内置 | 覆盖 sqlite-vec 路径          |

对于macOS上的Bun，安装Homebrew SQLite即可启用扩展加载；请参阅 [Bun SQLite setup](/install/bun-compatibility#sqlite-library-selection) 以进行自动发现和 `OPENCLAW_SQLITE_LIBRARY` 库覆盖。

当 sqlite-vec 不可用时，OpenClaw 会自动回退到进程内余弦相似度。

---

## <a id="index-storage"></a> 索引存储

内置内存索引位于每个 agent 的 OpenClaw SQLite 数据库中： `agents/<agentId>/agent/openclaw-agent.sqlite`。

| 键                   | 类型     | 默认值     | 描述                               |
| --------------------- | -------- | ----------- | ----------------------------------------- |
| `store.fts.tokenizer` | `string` | `unicode61` | FTS5 分词器（`unicode61` 或 `trigram`） |

对于 `trigram`，短于三个字符的查询术语使用子字符串匹配，因此 `AI` 和 `UK` 等简短术语仍然可搜索。较长的术语保持全文匹配，包括在也包含短期术语的查询中。

---

## <a id="citations"></a> 引用

`memory.citations` 控制内置记忆结果的引用可见性：

引用的片段保留前导缩进；源页脚之前的尾随空白被删除。

| 值            | 行为                                               |
| ---------------- | ------------------------------------------------------ |
| `auto`（默认） | 有用时包括 `Source: <path#line>`              |
| `on`             | 始终包含来源页脚                       |
| `off`            | 省略页脚；路径仍可在内部使用 |

---

## <a id="memory-admission-policy"></a> 内存接纳策略

在 `plugins.entries.memory-core.config.memoryPolicy.excludeSessions` 下配置 **dreaming 摄取和会话回填** 的会话排除。这些设置不会禁用转录搜索、限制工作区写入或删除现有内存。有关覆盖和删除工作流程，请参阅 [ 内存来源和删除](/concepts/memory-provenance)。

| 键                          | 类型       | 默认值 | 匹配内容                                                    |
| ---------------------------- | ---------- | ------- | ---------------------------------------------------------- |
| `hookExternalContentSources` | `string[]` | `[]`    | 记录的外部内容挂钩源，例如 `"gmail"`。 |
| `channels`                   | `string[]` | `[]`    | 记录的是 channel/plugin 标识符，而不是房间 ID。         |
| `chatTypes`                  | `string[]` | `[]`    | 录制的聊天类型：`"direct"`、`"group"` 或 `"channel"`。 |

每个设置都是可选的。省略或空数组不添加排除项；正常的来源和会话类型的门仍然适用。配置的字符串将被修剪，删除空值，然后精确匹配并区分大小写。没有全局模式、子字符串匹配或消息内容搜索。

挂钩源是精确标识符：IMAP 使用 `email`，Gmail 挂钩使用 `gmail`，通用 Webhook 使用 `webhook`。要排除 IMAP 和 Gmail 提取，请设置 `hookExternalContentSources: ["email", "gmail"]`。

列表与 **OR** 结合。例如，配置挂钩源和 `chatTypes: ["group"]` 会排除该挂钩源 **和每个组会话**，而不仅仅是来自该源的组会话。匹配通过配置的 `session.store` 使用保留的实时会话元数据，包括自定义和共享存储，范围仅限于源代理。缺少元数据与规则不匹配。较旧的保留记录可能仅包含粗略的 `webhook` 分类；当原始确切来源消失时，`email` 和 `webhook` 都不会被推断进行匹配。需要时，通过完整的 ID 明确忘记这些会话。自动做梦单独跳过保留的档案；这些列表并不能确定另一个内存路径是否可以读取存档的记录。

```json5
{
  plugins: {
    entries: {
      "memory-core": {
        config: {
          memoryPolicy: {
            excludeSessions: {
              hookExternalContentSources: ["gmail"],
            },
          },
        },
      },
    },
  },
}
```

自动摄取会在读取文字记录之前检查这些规则。匹配会话的摄取检查点按优先顺序将 `excludedReason` 记录为 `hookExternalContentSource:<source>`、`channel:<channel>` 或 `chatType:<type>`。删除规则使会话有资格进行以后的扫描，但须遵守其他摄入门。

首先检查 [`memory forget`](/cli/memory#memory-forget) 选择的会话并收到原因 `forgotten`。它们的持久每个代理排除也适用于会话回填和转录索引，并且删除配置的规则不会撤消它。它排除选定的 ID，而不是来自同一源的每个未来会话。

<Warning>
配置的准入规则适用于自动梦想摄取和手动 `memory session-backfill` 预览、REM 输出和应用运行。原始转录本索引不适用于这些列表。直接代理写入和会话内存挂钩也不在此策略之内。当会话根本不能写入内存文件时，请使用工具权限和挂钩配置。
</Warning>

添加规则不会删除现有语料库、短期候选项或提升记忆。使用 `memory forget --dry-run` 预览现有的可归因工件，然后在应用之前检查其 [ 删除边界 ](/concepts/memory-provenance#what-deletion-does-not-cover)。源会话记录保留在会话存储中。

---

## <a id="dreaming"></a> 做梦

梦境配置在 `plugins.entries.memory-core.config.dreaming` 下，而不是在 `memory.search` 下。

Dreaming 作为一次预定扫描运行，并使用内部 light/deep/REM 阶段作为实现细节。

有关概念性行为和斜杠命令，请参见 [梦境](/concepts/dreaming)。

### <a id="user-settings"></a> 用户设置

| 键                                     | 类型      | 默认值       | 描述                                                                                                                      |
| --------------------------------------- | --------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                               | `boolean` | `true`        | 完全启用或禁用梦境                                                                                              |
| `frequency`                             | `string`  | `0 3 * * *`   | 用于完整梦境扫描的可选 cron 频率                                                                                |
| `model`                                 | `string`  | 默认模型 | 可选的梦境日记子代理模型覆盖                                                                                     |
| `phases.deep.maxPromotedSnippetTokens`  | `number`  | `160`         | 从每个被提升到 `MEMORY.md` 的短期回忆片段中保留的最大估计 token 数；来源元数据仍然可见 |
| `phases.deep.maxPriorEntryLossFraction` | `number`  | `0.25`        | 拒绝合并或追加压缩，删除超过此部分的先前条目                                  |

### <a id="example"></a> 示例

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
- Dreaming 将 Light、REM 和 `DREAMS.md`（或现有 `dreams.md`）中每次扫描的深度记忆提升到每个工作区至多一篇日记条目中。阶段报告保持独立，没有新材料的扫描不会产生日记条目。
- 深度整合将先前的`MEMORY.md`存储在SQLite-支持的插件状态中，并在`DREAMS.md`中记录重写计数和突出显示。
- 在整合和持久化提升之前，不受信任和系统生成的候选项会在结构上被排除。
- `dreaming.model` 使用现有的插件子代理信任门控；在启用它之前，请设置 `plugins.entries.memory-core.subagent.allowModelOverride: true`。
- 当配置的模型不可用时，梦境日记会使用会话默认模型重试一次。信任或允许列表失败会被记录，不会被静默重试。
- light/deep/REM 阶段策略和阈值是内部行为，而不是面向用户的配置。

</Note>

## <a id="related"></a> 相关内容

- [配置参考](/gateway/configuration-reference)
- [内存概览](/concepts/memory)
- [内存搜索](/concepts/memory-search)
