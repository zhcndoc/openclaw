---
summary: "配置官方外部 LanceDB 记忆插件，包括本地 Ollama 兼容嵌入"
read_when:
  - 你正在配置 memory-lancedb 插件
  - 你希望使用 LanceDB 支持的长期记忆，并启用自动召回或自动捕获
  - 你正在使用本地的 OpenAI 兼容嵌入，例如 Ollama
title: "内存 LanceDB"
sidebarTitle: "内存 LanceDB"
---

`memory-lancedb` 是一个官方外部记忆插件，它将长期记忆存储在
LanceDB 中，并使用嵌入进行召回。它可以在模型轮次之前自动召回相关
记忆，并在响应后捕获重要事实。

当你需要一个用于记忆的本地向量数据库、需要一个
OpenAI 兼容的嵌入端点，或者想要将记忆数据库保存在默认内置
记忆存储之外时，请使用它。

## 安装

在设置 `plugins.slots.memory = "memory-lancedb"` 之前，请先安装 `memory-lancedb`：

```bash
openclaw plugins install @openclaw/memory-lancedb
```

该插件已发布到 npm，并未打包进 OpenClaw 运行时镜像中。
当没有其他插件拥有该槽位时，安装器会写入插件条目并切换内存槽位。

<Note>
`memory-lancedb` 是一个处于激活状态的内存插件。通过选择内存
槽位 `plugins.slots.memory = "memory-lancedb"` 来启用它。像
`memory-wiki` 这样的配套插件可以与它并行运行，但只有一个插件拥有活动内存槽位。
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

更改插件配置后，请重启 Gateway：

```bash
openclaw gateway restart
```

然后验证插件是否已加载：

```bash
openclaw plugins list
```

## 由提供商支持的嵌入

`memory-lancedb` 可以使用与
`memory-core` 相同的内存嵌入提供商适配器。设置 `embedding.provider`，并省略 `embedding.apiKey`，以使用
提供商配置的认证配置文件、环境变量，或
`models.providers.<provider>.apiKey`。

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
        },
      },
    },
  },
}
```

此路径适用于暴露嵌入凭据的提供商认证配置文件。
例如，当 GitHub Copilot 配置文件/套餐支持
嵌入时，可以使用 GitHub Copilot：

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
            provider: "github-copilot",
            model: "text-embedding-3-small",
          },
        },
      },
    },
  },
}
```

OpenAI Codex / ChatGPT OAuth（`openai-codex`）不是 OpenAI Platform
嵌入凭据。对于 OpenAI 嵌入，请使用 OpenAI API 密钥认证配置文件、
`OPENAI_API_KEY`，或 `models.providers.openai.apiKey`。仅使用 OAuth 的用户可以使用
其他支持嵌入的提供商，例如 GitHub Copilot 或 Ollama。

## Ollama 嵌入

对于 Ollama 嵌入，建议优先使用捆绑的 Ollama 嵌入提供商。它使用
原生 Ollama `/api/embed` 端点，并遵循与
[Ollama](/providers/ollama) 文档中描述的 Ollama 提供商相同的认证/基础 URL 规则。

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

对于非标准嵌入模型，请设置 `dimensions`。OpenClaw 知道
`text-embedding-3-small` 和 `text-embedding-3-large` 的维度；自定义
模型需要在配置中提供该值，以便 LanceDB 能够创建向量列。

对于较小的本地嵌入模型，如果你看到来自本地服务器的上下文
长度错误，请降低 `recallMaxChars`。

## OpenAI 兼容提供商

某些 OpenAI 兼容的嵌入提供商会拒绝 `encoding_format`
参数，而另一些则会忽略它并始终返回 `number[]` 向量。
因此，`memory-lancedb` 在嵌入请求中省略了 `encoding_format`，并
接受浮点数组响应或 base64 编码的 float32 响应。

如果你有一个原始的 OpenAI 兼容嵌入端点，但没有
捆绑的提供商适配器，请省略 `embedding.provider`（或将其保留为 `openai`），并
设置 `embedding.apiKey` 以及 `embedding.baseUrl`。这会保留直接的
OpenAI 兼容客户端路径。

对于模型维度未内置的提供商，请设置 `embedding.dimensions`。例如，
ZhiPu `embedding-3` 使用 `2048` 维：

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

## 召回与捕获限制

`memory-lancedb` 有两个独立的文本长度限制：

| 设置               | 默认值   | 范围       | 适用于                                                     |
| ------------------ | ------- | --------- | --------------------------------------------------------- |
| `recallMaxChars`   | `1000`  | 100-10000 | 发送到嵌入 API 用于召回的文本                               |
| `captureMaxChars`   | `500`   | 100-10000 | 适合自动捕获的消息长度                                     |
| `customTriggers`    | `[]`    | 0-50      | 使自动捕获考虑某条消息的字面短语                            |

`recallMaxChars` 控制自动召回、`memory_recall` 工具、
`memory_forget` 查询路径以及 `openclaw ltm search`。自动召回会优先使用本轮中的最新用户消息，
只有在没有用户消息可用时才回退到完整提示词。这可以将频道元数据和大型提示块
排除在嵌入请求之外。

`captureMaxChars` 控制回复是否足够短，从而可被考虑进行
自动捕获。它不会限制召回查询的嵌入。

`customTriggers` 允许你添加字面量的自动捕获短语，而无需编写
正则表达式。内置触发词包括常见的英文、捷克文、
中文、日文和韩文记忆短语。

## 命令

当 `memory-lancedb` 是活动内存插件时，它会注册 `ltm` CLI
命名空间：

```bash
openclaw ltm list
openclaw ltm search "project preferences"
openclaw ltm stats
```

该插件还会通过一个非向量的 `query` 子命令扩展 `openclaw memory`，
该命令直接针对 LanceDB 表运行：

```bash
openclaw memory query --cols id,text,createdAt --limit 20
openclaw memory query --filter "category = 'preference'" --order-by createdAt:desc
```

- `--cols <columns>`：以逗号分隔的列白名单（默认 `id`、`text`、`importance`、`category`、`createdAt`）。
- `--filter <condition>`：SQL 风格的 WHERE 子句；长度上限为 200 个字符，并且仅限于字母数字、比较运算符、引号、括号以及少量安全标点符号。
- `--limit <n>`：正整数；默认 `10`。
- `--order-by <column>:<asc|desc>`：在过滤后应用的内存排序；排序列会自动包含在投影中。

代理还会从活动内存插件获得 LanceDB 内存工具：

- `memory_recall` 用于基于 LanceDB 的召回
- `memory_store` 用于保存重要事实、偏好、决策和实体
- `memory_forget` 用于移除匹配的记忆

## 存储

默认情况下，LanceDB 数据位于 `~/.openclaw/memory/lancedb`。可以通过 `dbPath` 覆盖
路径：

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

`storageOptions` 接受用于 LanceDB 存储后端的字符串键/值对，并
支持 `${ENV_VAR}` 展开：

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

## 运行时依赖

`memory-lancedb` 依赖原生 `@lancedb/lancedb` 包。打包后的
OpenClaw 将该包视为插件包的一部分。Gateway 启动
不会修复插件依赖；如果缺少该依赖，请重新安装或
更新插件包并重启 Gateway。

如果较旧的安装在插件加载期间记录了缺少 `dist/package.json` 或缺少
`@lancedb/lancedb` 的错误，请升级 OpenClaw 并重启
Gateway。

如果插件日志显示 LanceDB 在 `darwin-x64` 上不可用，请在该机器上使用默认的
内存后端，或将 Gateway 移动到受支持的平台，或者
禁用 `memory-lancedb`。

## 故障排除

### 输入长度超过上下文长度

这通常意味着嵌入模型拒绝了召回查询：

```text
memory-lancedb: recall failed: Error: 400 the input length exceeds the context length
```

设置更低的 `recallMaxChars`，然后重启 Gateway：

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

对于 Ollama，还要验证从 Gateway 主机是否能够访问嵌入服务器：

```bash
curl http://127.0.0.1:11434/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model":"mxbai-embed-large","input":"hello"}'
```

### 不支持的嵌入模型

如果没有 `dimensions`，则只知道内置的 OpenAI 嵌入维度。
对于本地或自定义嵌入模型，请将 `embedding.dimensions` 设置为该模型
报告的向量大小。

### 插件已加载但没有出现记忆

检查 `plugins.slots.memory` 是否指向 `memory-lancedb`，然后运行：

```bash
openclaw ltm stats
openclaw ltm search "recent preference"
```

如果禁用了 `autoCapture`，插件会召回已有记忆，但不会
自动存储新的记忆。若你希望自动捕获，请使用 `memory_store` 工具或启用
`autoCapture`。

## 相关内容

- [内存概览](/concepts/memory)
- [活动内存](/concepts/active-memory)
- [内存搜索](/concepts/memory-search)
- [内存 Wiki](/plugins/memory-wiki)
- [Ollama](/providers/ollama)
