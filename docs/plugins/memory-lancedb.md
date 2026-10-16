---
summary: "配置官方外部LanceDB内存插件，包括本地Ollama-兼容嵌入"
read_when:
  - "你正在配置 memory-lancedb 插件"
  - "你希望使用 LanceDB 支持的长期记忆，并启用自动召回或自动捕获"
  - "您正在使用本地 OpenAI- 兼容嵌入，例如 Ollama"
title: "内存 LanceDB"
sidebarTitle: "内存 LanceDB"
---

`memory-lancedb` 是一个官方外部插件，它使用向量搜索将长期记忆存储在 LanceDB 中。它可以在模型运行前自动召回相关记忆，并在响应后自动捕获重要事实。

将其用于本地矢量数据库、OpenAI- 兼容的嵌入端点或默认内置内存后端之外的内存存储。

## <a id="installation"></a> 安装

```bash
openclaw plugins install @openclaw/memory-lancedb
```

该插件已发布到 npm；它未打包进 OpenClaw 运行时镜像。安装它会写入插件条目、启用它，并将 `plugins.slots.memory` 切换为 `memory-lancedb`。如果当前有其他插件占用了 memory 插槽，该插件会被禁用，并伴随一条警告。

<Note>
`memory-wiki` 等配套插件可以与 `memory-lancedb` 一起运行，但同一时间只有一个插件拥有活动的 memory 插槽。
</Note>

<Note>
LanceDB 的 `memory_recall` 未收到 `memory.search.rememberAcrossConversations` 使用的受保护私人转录授权。通过 [advanced Active Memory](/concepts/active-memory#lancedb-memory) 使用 LanceDB 的 `autoRecall` 或其 `memory_recall` 工具。 `openclaw doctor` 在当前内存提供程序无法使用“记住跨对话”时报告。
</Note>

## <a id="quick-start"></a> 快速开始

```json5
{
  plugins: {
    slots: {
      memory: "memory-lancedb",
    },
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            provider: "openai",
            model: "text-embedding-3-small",
          },
          autoRecall: true,
          autoCapture: false,
        },
      },
    },
  },
}
```

安装自动应用于正在运行的网关，配置更改适用于默认的混合重新加载模式。如果网关处于离线状态，请在配置后启动网关。检查应用结果并检查插件的运行时注册：

```bash
openclaw plugins inspect memory-lancedb --runtime --json
```

请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect) 和 [H 热重新加载 ](/gateway/configuration/hot-reload)。

## <a id="embedding-config"></a> 嵌入配置

`embedding` 是必需的，且必须至少包含一个字段。`provider` 默认值为 `openai`；`model` 默认值为 `text-embedding-3-small`。

| 字段                  | 类型          | 笔记                                                                    |
| ---------------------- | ------------- | ------------------------------------------------------------------------ |
| `embedding.provider`   | 字符串        | 适配器 ID，e.g. `openai`、`github-copilot`、`ollama`。默认`openai`。 |
| `embedding.model`      | 字符串        | 默认 `text-embedding-3-small`。                                        |
| `embedding.apiKey`     | 字符串        | 选修的；支持`${ENV_VAR}`扩展和实时凭证轮换。  |
| `embedding.baseUrl`    | 字符串        | 选修的；支持`${ENV_VAR}`扩展和实时端点旋转。    |
| `embedding.dimensions` | 整数 （>=1） | 对于不在内置表中的模型是必需的（见下文）。               |

存在两种请求路径：

- **Provider 适配器路径**（默认）：设置 `embedding.provider` 并省略 `embedding.apiKey`/`embedding.baseUrl`. 该插件通过相同的内存嵌入适配器 `memory-core` 解析提供者配置的身份验证配置文件、环境变量或 `models.providers.<provider>.apiKey`用途。这是 `github-copilot`、`ollama` 以及任何其他具有嵌入支持的捆绑提供程序的路径。
- **Direct OpenAI-兼容客户端路径**：保留`embedding.provider`未设置（或`"openai"`）并设置`embedding.apiKey`加`embedding.baseUrl`。将此用于没有捆绑提供程序适配器的原始 OpenAI- 兼容嵌入端点。

只要 `provider`、`model` 和 `dimensions` 保持不变，`embedding.apiKey` 和 `embedding.baseUrl` 就会从实时插件配置中重新读取以进行下一次内存操作。

<Warning>
`embedding.provider`、`embedding.model` 和 `embedding.dimensions` 定义持久化 LanceDB 索引标识。在更改其中任何一个之前，请计划 LanceDB 重新嵌入或重建，以便每个存储的行都使用新的向量空间和维度。自动插件重新加载会创建一个具有更改后身份的新实例；它不会重新嵌入现有行。
</Warning>

当帐户授予嵌入访问权限时，OpenAI 提供程序适配器可以使用存储的 Codex OAuth 配置文件。单独的“使用 ChatGPT 登录”令牌共享授予并不授权嵌入。 API-key 身份验证仍然可通过配置文件、`OPENAI_API_KEY` 或 `models.providers.openai.apiKey` 使用。其他支持嵌入的提供程序包括 `github-copilot` 和 `ollama`。

```json5
{
  plugins: {
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            provider: "github-copilot",
            model: "text-embedding-3-small",
          },
        },
      },
    },
  },
}
```

某些 OpenAI- 兼容嵌入端点拒绝 `encoding_format` 参数；其他人忽略它并始终返回 `number[]`。 `memory-lancedb` 在请求上省略 `encoding_format` 并接受 float 数组或 base64 编码的 float32 响应，因此两种响应形状无需配置即可工作。

### <a id="dimensions"></a> 维度

OpenClaw 仅具有 `text-embedding-3-small` （1536） 和 `text-embedding-3-large` （3072） 的内置尺寸。任何其他模型都需要显式 `embedding.dimensions`，以便 LanceDB 可以创建向量列，例如 2048 维的 ZhiPu `embedding-3`：

```json5
{
  plugins: {
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            apiKey: "${ZHIPU_API_KEY}",
            baseUrl: "https://open.bigmodel.cn/api/paas/v4",
            model: "embedding-3",
            dimensions: 2048,
          },
        },
      },
    },
  },
}
```

## <a id="ollama-embeddings"></a> Ollama 嵌入

使用捆绑的 Ollama 提供程序适配器路径 （`embedding.provider: "ollama"`）。它调用 Ollama 的本机 `/api/embed` 端点，并遵循与 [Ollama](/providers/ollama) 提供程序相同的 auth/base URL 规则。

```json5
{
  plugins: {
    slots: {
      memory: "memory-lancedb",
    },
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            provider: "ollama",
            baseUrl: "http://127.0.0.1:11434",
            model: "mxbai-embed-large",
            dimensions: 1024,
          },
          recallMaxChars: 400,
          autoRecall: true,
          autoCapture: false,
        },
      },
    },
  },
}
```

`mxbai-embed-large` 不在内置维度表中，因此需要 `dimensions`。对于较小的本地嵌入模型，如果本地服务器返回上下文长度错误，请降低 `recallMaxChars`。

## <a id="recall-and-capture-limits"></a> 召回与捕获限制

| 设置           | 默认值 | 范围                       | 适用于                                                        |
| ----------------- | ------- | --------------------------- | ----------------------------------------------------------------- |
| `recallMaxChars`  | `1000`  | 100-10000                   | 召回查询长度和每个转义模型可见的召回项。 |
| `captureMaxChars` | `500`   | 100-10000                   | `memory_store` 输入限制和自动捕获资格。          |
| `customTriggers`  | `[]`    | 0-50条，每条≤100个字符 | 使自动捕获将某条消息纳入考虑的字面短语。        |

`recallMaxChars` 绑定 `before_prompt_build` 自动调用查询、`memory_recall` 工具、`memory_forget` 查询路径和 `openclaw ltm search`。在删除媒体附件注释并规范化空白后，自动调用会嵌入当前回合的提示。在文本到达模型之前提示转义后，相同的限制限制了每个调用的项目。

`captureMaxChars` 控制来自回合 `agent_end` 事件的用户消息是否足够短以考虑自动捕获。 `memory_store` 在嵌入或存储之前拒绝较长的文本；该设置不会影响召回查询。

`customTriggers` 用于添加按字面匹配的自动捕获短语，不支持正则表达式。内置触发词涵盖常见的英语、捷克语、中文、日语和韩语记忆短语（如 `remember`、`prefer`、`记住`、`覚えて`、`기억해` 等）。

自动捕获还会拒绝看起来像 envelope/transport 元数据、提示注入有效负载或已注入的 `<relevant-memories>` 上下文的文本，并且每个代理轮次捕获的内存上限为 3 个。

已完成的消息事件在保留在对话记录中时不会再次处理，包括在压缩之后。最后 60 个完成的文本块在其消息离开记录后也会保持去重状态。此历史记录包括与现有内存匹配的文本以及部分失败消息中的成功块。后面的消息仍然可以捕获先前出现的由于每轮限制而跳过的文本。没有不同时间戳或保留上下文的相同替换可能与未更改的重播无法区分。重置或结束对话会清除该进度。一次对话中的重叠完成共享捕获进度；其他对话可以独立进行。关闭时，插件会停止新的捕获工作并等待挂起的捕获，然后再关闭其存储。

每一段记忆都由一个代理拥有。回想一下，重复检测、捕获、列出、原始查询和删除都会在返回或更改行之前强制执行该所有者。 `agents.entries.*` 条目中带有 `memory.search.enabled: false` 的代理，或者继承禁用的顶级搜索的代理，也不会获得 `memory_recall`、`memory_store` 或 `memory_forget` 工具，并且不参与自动调用或捕获，即使插件级 `autoRecall`/`autoCapture` 标志打开也是如此。

隐身会话会跳过自动调用和捕获。它们的提示不会发送到嵌入提供商以进行自动调用，并且 `memory_store` 拒绝保存它们。显式工具调用仍然遵循其正常的数据处理规则。

## <a id="commands"></a> 命令

`memory-lancedb` 在安装后会注册 `ltm` CLI 命名空间 （不仅仅是在它拥有当前活动内存槽时）：

```bash
openclaw ltm list [--agent <id>] [--limit <n>] [--order-by-created-at]
openclaw ltm search <query> [--agent <id>] [--limit <n>]
openclaw ltm stats [--agent <id>]
```

`ltm stats` 在插件注册后 60 秒内读取数据库。它在报告超时之前停止隔离读取器，而无需创建内存表或更改现有内存数据。没有内存表的数据库报告为零。插件发现和源捕获发生在此截止日期之前。

`ltm query` 直接对 LanceDB 表执行非向量查询：

```bash
openclaw ltm query --agent research --cols id,text,createdAt --limit 20
openclaw ltm query --filter "category = 'preference'" --order-by createdAt:desc
```

| 标志                              | 默认值                                 | 笔记                                                                                                                                     |
| --------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `--agent <id>`                    | 已配置的默认 agent                | 选择专用代理命名空间。适用于 `list`、`search`、`query` 和 `stats`。                                                 |
| `--cols <columns>`                | `id,text,importance,category,createdAt` | 以逗号分隔的列允许列表。                                                                                                         |
| `--filter <condition>`            | 无                                    | 对输出列的一次比较，例如 `category = 'preference'` 或 `importance >= 0.8`。字符串值必须加引号。             |
| `--limit <n>`                     | `10`                                    | 正整数。                                                                                                                         |
| `--order-by <column>:<asc\|desc>` | 无                                    | 过滤器运行后在内存中排序；排序列会自动添加到投影中，如果没有请求，则会从输出中删除。 |

代理可从活动内存插件获得三个工具：

- `memory_recall`：对已存储的记忆进行向量搜索。
- `memory_store`：保存事实、偏好、决策或实体（拒绝看起来像提示注入有效负载的文本；在规范化行结尾、Unicode NFC 和周围的空白后跳过精确的重复项，但使用不同的文本存储语义相似的内存）。
- `memory_forget`：按 `memoryId` 或 `query` 删除（自动删除高于 90% 分数的单个匹配项，否则列出候选 ID 以消除歧义）。

## <a id="storage"></a> 存储

LanceDB 数据默认为活动 OpenClaw 状态目录下的 `memory/lancedb`：默认配置文件为 `~/.openclaw/memory/lancedb`。 `OPENCLAW_STATE_DIR` 或 `--profile <name>` （`~/.openclaw-<name>`） 将其与状态目录一起移动。请参阅 [ 路径和实例](/help/environment#paths-and-instances)。

早期版本忽略了状态目录，因此命名的配置文件和自定义状态目录共享 `~/.openclaw/memory/lancedb`。这些设置现在从他们自己的商店开始。设置 `dbPath: "~/.openclaw/memory/lancedb"` 以继续使用旧的共享存储。

使用 `dbPath` 覆盖路径：

```json5
{
  plugins: {
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          dbPath: "/srv/openclaw/memory/lancedb",
          embedding: {
            apiKey: "${OPENAI_API_KEY}",
            model: "text-embedding-3-small",
          },
        },
      },
    },
  },
}
```

该插件保留一个 LanceDB 表并在每一行上存储规范化的代理所有者。这是存储边界，而不是搜索后过滤器：代理所有权在向量排名之前应用，并包含在列表、查询、计数和删除谓词中。 `ltm query --filter` 接受对公共输出列的一项经过验证的比较。存储与强制所有者谓词分开构建该比较，因此过滤器无法将查询扩展到另一个代理。

在每个代理拥有权之前创建的数据库没有可靠的行来源。升级时，`openclaw doctor --fix` 将这些旧行一次分配给配置的默认代理。在迁移完成之前，运行时访问将被阻止；其他代理永远不会继承旧的共享行。

`storageOptions` 接受 LanceDB 存储后端的字符串 key/value 对（e.g. S3- 兼容对象存储）并支持 `${ENV_VAR}` 扩展：

```json5
{
  plugins: {
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          dbPath: "s3://memory-bucket/openclaw",
          storageOptions: {
            access_key: "${AWS_ACCESS_KEY_ID}",
            secret_key: "${AWS_SECRET_ACCESS_KEY}",
            endpoint: "${AWS_ENDPOINT_URL}",
          },
          embedding: {
            apiKey: "${OPENAI_API_KEY}",
            model: "text-embedding-3-small",
          },
        },
      },
    },
  },
}
```

## <a id="runtime-dependencies-and-platform-support"></a> 运行时依赖和平台支持

`memory-lancedb` 捆绑 LanceDB 的 JavaScript。它的插件包将本机 `@lancedb/lancedb-*` 包声明为可选依赖项，因此安装会为主机平台选择匹配的二进制文件。网关启动不修复插件依赖；如果原生依赖缺失或加载失败，请重新安装或更新插件包并重启网关。

`@lancedb/lancedb` 未发布 `darwin-x64` （Intel Mac） 的本机版本。在该平台上，插件记录 LanceDB 在加载时不可用；使用默认内存后端、在支持的 platform/architecture 上运行网关或禁用 `memory-lancedb`。

## <a id="troubleshooting"></a> 故障排查

### <a id="embedding-provider-cleanup-failed"></a> 嵌入提供程序清理失败

该插件在关闭每个已停用的提供程序之前等待已接受的嵌入请求。如果本机清理失败，它会报告错误，而不是跨插件实例重试。重新启动网关以回收剩余的本机资源。

### <a id="input-length-exceeds-the-context-length"></a> 输入长度超过上下文长度

嵌入模型拒绝了回忆查询：

```text
memory-lancedb: recall failed: Error: 400 the input length exceeds the context length
```

下`recallMaxChars`；新的限制适用于下一个内存操作：

```json5
{
  plugins: {
    entries: {
      "memory-lancedb": {
        config: {
          recallMaxChars: 400,
        },
      },
    },
  },
}
```

对于 Ollama，还要使用其原生嵌入端点验证嵌入服务器是否可从 Gateway 主机访问：

```bash
curl http://127.0.0.1:11434/api/embed \
  -H "Content-Type: application/json" \
  -d '{"model":"mxbai-embed-large","input":"hello"}'
```

### <a id="unsupported-embedding-model"></a> 不支持的嵌入模型

如果没有 `embedding.dimensions`，则只知道内置的 OpenAI 嵌入维度（`text-embedding-3-small`、`text-embedding-3-large`）。对于任何其他模型，请将 `embedding.dimensions` 设置为该模型报告的向量大小。

### <a id="plugin-loads-but-no-memories-appear"></a> 插件已加载但没有出现记忆

确认 `plugins.slots.memory` 指向 `memory-lancedb`，然后运行：

```bash
openclaw ltm stats
openclaw ltm search "recent preference"
```

如果 `autoCapture` 已禁用，插件仍会回忆已有记忆，但不会自动存储新记忆。请使用 `memory_store` 工具，或启用 `autoCapture`。

## <a id="related"></a> 相关内容

- [内存概览](/concepts/memory)
- [活动内存](/concepts/active-memory)
- [内存搜索](/concepts/memory-search)
- [内存 Wiki](/plugins/memory-wiki)
- [Ollama](/providers/ollama)
