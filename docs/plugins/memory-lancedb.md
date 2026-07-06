---
summary: "配置官方外部 LanceDB 记忆插件，包括本地 Ollama 兼容嵌入"
read_when:
  - 你正在配置 memory-lancedb 插件
  - 你希望使用 LanceDB 支持的长期记忆，并启用自动召回或自动捕获
  - 你正在使用本地的 OpenAI 兼容嵌入，例如 Ollama
title: "内存 LanceDB"
sidebarTitle: "内存 LanceDB"
---

`memory-lancedb` 是一个官方外部插件，它使用向量搜索将长期记忆存储在
LanceDB 中。它可以在模型
运行前自动召回相关记忆，并在响应后自动捕获重要事实。

它适用于本地向量数据库、OpenAI 兼容的嵌入端点，或
默认内置记忆后端之外的记忆存储。

## 安装

```bash
openclaw plugins install @openclaw/memory-lancedb
```

该插件已发布到 npm；它未打包进 OpenClaw 运行时镜像。安装它会写入插件条目、启用它，并将 `plugins.slots.memory` 切换为 `memory-lancedb`。如果当前有其他插件占用了 memory 插槽，该插件会被禁用，并伴随一条警告。

<Note>
`memory-wiki` 等配套插件可以与 `memory-lancedb` 一起运行，但同一时间只有一个插件拥有活动的 memory 插槽。
</Note>

## 快速开始

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

更改插件配置后重启 Gateway，然后验证是否已加载：

```bash
openclaw gateway restart
openclaw plugins list
```

## 嵌入配置

`embedding` 是必需的，且必须至少包含一个字段。`provider`
默认值为 `openai`；`model` 默认值为 `text-embedding-3-small`。

| 字段                   | 类型           | 说明                                                                     |
| ---------------------- | -------------- | ------------------------------------------------------------------------ |
| `embedding.provider`   | string         | 适配器 ID，例如 `openai`、`github-copilot`、`ollama`。默认 `openai`。 |
| `embedding.model`      | string         | 默认 `text-embedding-3-small`。                                        |
| `embedding.apiKey`     | string         | 可选；支持 `${ENV_VAR}` 展开。                               |
| `embedding.baseUrl`    | string         | 可选；支持 `${ENV_VAR}` 展开。                               |
| `embedding.dimensions` | integer (>=1)  | 对于不在内置表中的模型是必需的（见下文）。               |

存在两种请求路径：

- **提供方适配器路径**（默认）：设置 `embedding.provider` 并省略
  `embedding.apiKey`/`embedding.baseUrl`。插件会通过 `memory-core` 使用的
  相同内存嵌入适配器，解析提供方已配置的认证配置文件、环境变量，或
  `models.providers.<provider>.apiKey`。这是 `github-copilot`、`ollama`
  以及任何其他带有嵌入支持的捆绑提供方所使用的路径。
- **直接的 OpenAI 兼容客户端路径**：保持 `embedding.provider` 未设置
  （或设为 `"openai"`），并设置 `embedding.apiKey` 与 `embedding.baseUrl`。当你使用的是一个原生的、没有捆绑提供方适配器的 OpenAI 兼容嵌入端点时，请使用此路径。

OpenAI Codex / ChatGPT OAuth 不是 OpenAI Platform 的嵌入凭据。
对于 OpenAI 嵌入，请使用 OpenAI API key 认证配置文件、`OPENAI_API_KEY`，或
`models.providers.openai.apiKey`。仅支持 OAuth 的用户应选择其他支持嵌入的提供方，例如 `github-copilot` 或 `ollama`。

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

某些 OpenAI 兼容的嵌入端点会拒绝 `encoding_format`
参数；另一些则会忽略它并始终返回 `number[]`。`memory-lancedb`
在请求中省略 `encoding_format`，并接受浮点数组或
base64 编码的 float32 响应，因此这两种响应形式都可在无需配置的情况下正常工作。

### 维度

OpenClaw 仅内置了 `text-embedding-3-small`（1536）和
`text-embedding-3-large`（3072）的维度。任何其他模型都需要显式设置
`embedding.dimensions`，以便 LanceDB 能创建向量列，例如智谱的
`embedding-3`，维度为 2048：

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

## Ollama 嵌入

使用捆绑的 Ollama 提供商适配器路径（`embedding.provider: "ollama"`）。
它会调用 Ollama 原生的 `/api/embed` 端点，并遵循与 [Ollama](/providers/ollama) 提供商相同的认证/基础
URL 规则。

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

## 召回与捕获限制

| 设置 | 默认值 | 范围 | 适用对象 |
| ----------------- | ------- | ---------------------------- | ---------------------------------------------------------- |
| `recallMaxChars`  | `1000`  | 100-10000                    | 发送到 embedding API 用于召回的文本。                 |
| `captureMaxChars` | `500`   | 100-10000                    | 有资格进行自动捕获的消息长度。                  |
| `customTriggers`  | `[]`    | 0-50 项，每项小于等于 100 字符 | 使自动捕获将某条消息纳入考虑的字面短语。 |

`recallMaxChars` 限定 `before_prompt_build` 自动召回查询、`memory_recall` 工具、`memory_forget` 查询路径以及 `openclaw ltm
search`。自动召回会嵌入当前轮次中最新的用户消息；只有在不存在用户消息时，才回退到完整提示，从而避免将频道元数据和大型提示块包含进嵌入请求。

`captureMaxChars` 用于判断当前轮次 `agent_end`
事件中的用户消息是否足够短，从而可被纳入自动捕获；它不会影响
召回查询。

`customTriggers` 添加字面量的自动捕获短语，不使用正则表达式。内置
触发器覆盖常见的英文、捷克文、中文、日文和韩文记忆短语（`remember`、`prefer`、`记住`、`覚えて`、`기억해` 等类似表达）。

自动捕获还会拒绝看起来像信封/传输元数据、提示注入载荷，或已经注入的 `<relevant-memories>` 上下文的文本，并且每个 agent 回合最多捕获 3 条记忆。

## 命令

`memory-lancedb` 在安装后会注册 `ltm` CLI 命名空间
（不仅仅是在它拥有当前活动内存槽时）：

```bash
openclaw ltm list [--limit <n>] [--order-by-created-at]
openclaw ltm search <query> [--limit <n>]
openclaw ltm stats
```

`ltm query` 直接对 LanceDB 表执行非向量查询：

```bash
openclaw ltm query --cols id,text,createdAt --limit 20
openclaw ltm query --filter "category = 'preference'" --order-by createdAt:desc
```

| 标志                              | 默认值                                  | 说明                                                                                                                                     |
| --------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `--cols <columns>`                | `id,text,importance,category,createdAt` | 以逗号分隔的列白名单。                                                                                                                     |
| `--filter <condition>`            | 无                                       | SQL 风格的 WHERE 子句。最多 200 个字符；仅允许字母数字、`_-`、空白字符，以及 `='"<>!.,()%*`。                                              |
| `--limit <n>`                     | `10`                                    | 正整数。                                                                                                                                 |
| `--order-by <column>:<asc\|desc>` | 无                                       | 在过滤器运行后于内存中排序；排序列会自动添加到投影中，并在未被请求时从输出中剥离。                                                         |

代理可从活动内存插件获得三个工具：

- `memory_recall`：对已存储的记忆进行向量搜索。
- `memory_store`：保存事实、偏好、决定或实体（会拒绝看起来像提示注入载荷的文本；
  会跳过近似重复的存储）。
- `memory_forget`：按 `memoryId` 删除，或按 `query` 删除（若分数高于 90%，则自动删除单个
  匹配项，否则列出候选 ID 以消除歧义）。

## 存储

LanceDB 数据默认存储在 `~/.openclaw/memory/lancedb`。可通过 `dbPath` 覆盖：

```json5
{
  plugins: {
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          dbPath: "~/.openclaw/memory/lancedb",
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

`storageOptions` 接受用于 LanceDB 存储后端的字符串键/值对
（例如与 S3 兼容的对象存储），并支持 `${ENV_VAR}` 展开：

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

## 运行时依赖和平台支持

`memory-lancedb` 依赖于原生的 `@lancedb/lancedb` 包，该包由插件包拥有（而不是 OpenClaw 核心发布包）。Gateway 启动不会修复插件依赖；如果原生依赖缺失或加载失败，请重新安装或更新插件包并重启 Gateway。

`@lancedb/lancedb` 未为 `darwin-x64`（Intel Mac）发布原生构建。在该平台上，插件会在加载时记录 LanceDB 不可用；请使用默认内存后端，在受支持的平台/架构上运行 Gateway，或禁用 `memory-lancedb`。

## 故障排除

### 输入长度超过上下文长度

嵌入模型拒绝了回忆查询：

```text
memory-lancedb: recall failed: Error: 400 the input length exceeds the context length
```

降低 `recallMaxChars`，然后重启 Gateway：

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

### 不支持的嵌入模型

如果没有 `embedding.dimensions`，则只知道内置的 OpenAI 嵌入维度（`text-embedding-3-small`、`text-embedding-3-large`）。对于任何其他模型，请将 `embedding.dimensions` 设置为该模型报告的向量大小。

### 插件已加载但没有出现记忆

确认 `plugins.slots.memory` 指向 `memory-lancedb`，然后运行：

```bash
openclaw ltm stats
openclaw ltm search "recent preference"
```

如果 `autoCapture` 已禁用，插件仍会回忆已有记忆，但不会自动存储新记忆。请使用 `memory_store` 工具，或启用 `autoCapture`。

## 相关内容

- [内存概览](/concepts/memory)
- [活动内存](/concepts/active-memory)
- [内存搜索](/concepts/memory-search)
- [内存 Wiki](/plugins/memory-wiki)
- [Ollama](/providers/ollama)
