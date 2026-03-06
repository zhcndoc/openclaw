---
summary: "通过 Ollama 运行 OpenClaw（本地 LLM 运行时）"
read_when:
  - 你想通过 Ollama 使用本地模型运行 OpenClaw
  - 你需要 Ollama 的安装和配置指南
title: "Ollama"
---

# Ollama

Ollama 是一个本地 LLM 运行时，能够让你轻松在本机运行开源模型。OpenClaw 与 Ollama 的原生 API (`/api/chat`) 集成，支持流式输出和工具调用，并且可以在你通过设置 `OLLAMA_API_KEY`（或认证配置）并且未显式定义 `models.providers.ollama` 条目的情况下，**自动发现支持工具调用的模型**。

<Warning>
**远程 Ollama 用户注意**：不要使用带有 `/v1` 的 OpenAI 兼容 URL（例如 `http://host:11434/v1`）与 OpenClaw 一起使用。这会导致工具调用失效，模型可能会以纯文本形式输出原始的工具 JSON。应使用 Ollama 的原生 API URL：`baseUrl: "http://host:11434"`（不要加 `/v1`）。
</Warning>

## 快速开始

1. 安装 Ollama：[https://ollama.ai](https://ollama.ai)

2. 拉取模型：

```bash
ollama pull gpt-oss:20b
# 或者
ollama pull llama3.3
# 或者
ollama pull qwen2.5-coder:32b
# 或者
ollama pull deepseek-r1:32b
```

3. 启用 OpenClaw 的 Ollama（任意值均可；Ollama 不要求真实密钥）：

```bash
# 设置环境变量
export OLLAMA_API_KEY="ollama-local"

# 或在配置文件中设置
openclaw config set models.providers.ollama.apiKey "ollama-local"
```

4. 使用 Ollama 模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "ollama/gpt-oss:20b" },
    },
  },
}
```

## 模型自动发现（隐式提供者）

当你设置了 `OLLAMA_API_KEY`（或认证配置），**且没有定义** `models.providers.ollama` 时，OpenClaw 会从本地 Ollama 实例（默认 `http://127.0.0.1:11434`）自动发现模型：

- 请求 `/api/tags` 和 `/api/show`
- 仅保留报告支持 `tools` 功能的模型
- 如果模型报告了 `thinking`，则标记为 `reasoning`
- 如果可用，从 `model_info["<arch>.context_length"]` 读取 `contextWindow`
- 将 `maxTokens` 设置为上下文窗口的 10 倍
- 所有费用均设为 `0`

这样避免了手动维护模型条目，同时目录与 Ollama 的实际能力保持一致。

查看可用模型：

```bash
ollama list
openclaw models list
```

添加新模型，只需使用 Ollama 拉取：

```bash
ollama pull mistral
```

新模型会被自动发现并可用。

如果你显式设置了 `models.providers.ollama`，自动发现将被跳过，你必须手动定义模型（如下所示）。

## 配置

### 基础设置（隐式发现）

启用 Ollama 最简单的方式是通过环境变量：

```bash
export OLLAMA_API_KEY="ollama-local"
```

### 显式设置（手动定义模型）

在下列情况下使用显式配置：

- Ollama 运行在不同的主机或端口。
- 你想强制指定上下文窗口或模型列表。
- 你想包含未报告工具支持的模型。

示例配置：

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434",
        apiKey: "ollama-local",
        api: "ollama",
        models: [
          {
            id: "gpt-oss:20b",
            name: "GPT-OSS 20B",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 8192,
            maxTokens: 8192 * 10
          }
        ]
      }
    }
  }
}
```

如果已设置 `OLLAMA_API_KEY`，可以省略 `apiKey`，OpenClaw 会在可用性检查时自动填充。

### 自定义基础 URL（显式配置）

如果 Ollama 运行在其他主机或端口（显式配置会禁用自动发现，需手动定义模型），示例如下：

```json5
{
  models: {
    providers: {
      ollama: {
        apiKey: "ollama-local",
        baseUrl: "http://ollama-host:11434", // 不要加 /v1，使用 Ollama 原生 API URL
        api: "ollama", // 明确设置以保证原生工具调用功能
      },
    },
  },
}
```

<Warning>
不要在 URL 后加 `/v1`。`/v1` 路径使用 OpenAI 兼容模式，工具调用功能不可靠。请使用不带路径后缀的 Ollama 基础 URL。
</Warning>

### 模型选择

配置完成后，你所有的 Ollama 模型都可用：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "ollama/gpt-oss:20b",
        fallbacks: ["ollama/llama3.3", "ollama/qwen2.5-coder:32b"],
      },
    },
  },
}
```

## 高级

### 推理模型

当 Ollama 在 `/api/show` 报告模型支持 `thinking` 时，OpenClaw 会将其标记为推理模型：

```bash
ollama pull deepseek-r1:32b
```

### 模型费用

Ollama 免费且本地运行，因此所有模型费用均为 0。

### 流式配置

OpenClaw 默认使用 Ollama **原生 API**（`/api/chat`），完全支持流式输出和工具调用同时进行，无需额外配置。

#### 旧版 OpenAI 兼容模式

<Warning>
**OpenAI 兼容模式下，工具调用不可靠。** 仅当你需要使用 OpenAI 格式代理且不依赖原生工具调用时使用本模式。
</Warning>

如果需要使用 OpenAI 兼容端点（例如，在只支持 OpenAI 格式代理后端），请显式设置 `api: "openai-completions"`：

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434/v1",
        api: "openai-completions",
        injectNumCtxForOpenAICompat: true, // 默认开启
        apiKey: "ollama-local",
        models: [...]
      }
    }
  }
}
```

此模式可能无法同时支持流式和工具调用。你可能需要在模型配置中通过 `params: { streaming: false }` 禁用流式输出。

当使用 `api: "openai-completions"` 时，OpenClaw 默认注入 `options.num_ctx`，防止 Ollama 回退到默认 4096 上下文窗口。如果你的代理/上游拒绝未知的 `options` 字段，可以关闭此行为：

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434/v1",
        api: "openai-completions",
        injectNumCtxForOpenAICompat: false,
        apiKey: "ollama-local",
        models: [...]
      }
    }
  }
}
```

### 上下文窗口

对于自动发现的模型，OpenClaw 使用 Ollama 报告的上下文窗口（如有），否则默认 `8192`。显式配置时可覆盖 `contextWindow` 和 `maxTokens`。

## 故障排查

### Ollama 未检测到

请确认 Ollama 正在运行且已设置 `OLLAMA_API_KEY`（或认证配置），且你并未定义显式的 `models.providers.ollama`：

```bash
ollama serve
```

确保 API 可访问：

```bash
curl http://localhost:11434/api/tags
```

### 没有可用模型

OpenClaw 仅自动发现报告支持工具调用的模型。如果模型未列出，请：

- 拉取一个支持工具调用的模型，或
- 在 `models.providers.ollama` 中显式定义模型。

添加模型示例：

```bash
ollama list  # 查看已安装模型
ollama pull gpt-oss:20b  # 拉取支持工具调用的模型
ollama pull llama3.3     # 或其他模型
```

### 连接被拒绝

检查 Ollama 是否在正确端口运行：

```bash
# 检查 Ollama 是否运行
ps aux | grep ollama

# 或重启 Ollama
ollama serve
```

## 参考链接

- [模型提供者](/concepts/model-providers) - 所有提供者概览
- [模型选择](/concepts/models) - 如何选择模型
- [配置](/gateway/configuration) - 完整配置参考
