---
summary: "通过 Ollama（云端和本地模型）运行 OpenClaw"
read_when:
  - 你想通过 Ollama 运行云端或本地模型的 OpenClaw
  - 你需要 Ollama 的安装与配置指导
title: "Ollama"
---

# Ollama

Ollama 是一个本地 LLM 运行时，能够让你轻松在本机运行开源模型。OpenClaw 与 Ollama 的原生 API (`/api/chat`) 集成，支持流式输出和工具调用，并且可以在你通过设置 `OLLAMA_API_KEY`（或认证配置）并且未显式定义 `models.providers.ollama` 条目的情况下，**自动发现支持工具调用的模型**。

<Warning>
**远程 Ollama 用户注意**：不要使用带有 `/v1` 的 OpenAI 兼容 URL（例如 `http://host:11434/v1`）与 OpenClaw 一起使用。这会导致工具调用失效，模型可能会以纯文本形式输出原始的工具 JSON。应使用 Ollama 的原生 API URL：`baseUrl: "http://host:11434"`（不要加 `/v1`）。
</Warning>

## 快速开始

### Onboarding (recommended)

The fastest way to set up Ollama is through onboarding:

```bash
openclaw onboard
```

Select **Ollama** from the provider list. Onboarding will:

1. 询问你的实例可访问的 Ollama 基础 URL（默认 `http://127.0.0.1:11434`）。
2. 让你选择 **Cloud + Local**（云模型和本地模型）或 **Local**（仅本地模型）。
3. 如果选择了 **Cloud + Local** 且未登录 ollama.com，会自动打开浏览器进行登录。
4. 发现可用模型并建议默认选项。
5. 若所选模型本地不存在，会自动拉取。

还支持非交互模式：

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --accept-risk
```

可选地指定自定义基础 URL 或模型：

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --custom-base-url "http://ollama-host:11434" \
  --custom-model-id "qwen3.5:27b" \
  --accept-risk
```

### 手动设置

1. 安装 Ollama: [https://ollama.com/download](https://ollama.com/download)

2. 如果希望进行本地推理，可以拉取本地模型：

```bash
ollama pull glm-4.7-flash
# 或者
ollama pull gpt-oss:20b
# 或
ollama pull llama3.3
```

3. 如果还想使用云端模型，请登录：

```bash
ollama signin
```

4. 运行入门指引并选择 `Ollama`：

```bash
openclaw onboard
```

- `Local`：仅使用本地模型
- `Cloud + Local`：本地模型加云模型
- 云模型如 `kimi-k2.5:cloud`、`minimax-m2.5:cloud` 和 `glm-5:cloud` **无需本地拉取**

OpenClaw 当前推荐：

- 本地默认：`glm-4.7-flash`
- 云默认：`kimi-k2.5:cloud`、`minimax-m2.5:cloud`、`glm-5:cloud`

5. 如果你偏好手动配置，可直接为 OpenClaw 启用 Ollama（任意值均可；Ollama 不要求真实密钥）：

```bash
# 设置环境变量
export OLLAMA_API_KEY="ollama-local"

# 或在配置文件中设置
openclaw config set models.providers.ollama.apiKey "ollama-local"
```

6. 查看或切换模型：

```bash
openclaw models list
openclaw models set ollama/glm-4.7-flash
```

7. 或在配置中设置默认模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "ollama/glm-4.7-flash" },
    },
  },
}
```

## 模型自动发现（隐式提供者）

当你设置了 `OLLAMA_API_KEY`（或认证配置），**且没有定义** `models.providers.ollama` 时，OpenClaw 会从本地 Ollama 实例（默认 `http://127.0.0.1:11434`）自动发现模型：

- 查询 `/api/tags`
- 尽力使用 `/api/show` 读取可用的 `contextWindow`
- 根据模型名启发式标记推理能力 (`r1`、`reasoning`、`think`)
- 将 `maxTokens` 设置为 OpenClaw 使用的 Ollama 默认最大 token 限制
- 所有费用均设为 `0`

此做法避免了手动维护模型条目，同时保证目录与本地 Ollama 实例保持一致。

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

- Ollama 运行在其他主机或端口。
- 你想强制指定上下文窗口或模型列表。
- 你想完全手动定义模型信息。

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

## 云端模型

云端模型允许你同时运行云端托管模型（例如 `kimi-k2.5:cloud`，`minimax-m2.5:cloud`，`glm-5:cloud`）和本地模型。

To use cloud models, select **Cloud + Local** mode during setup. The wizard checks whether you are signed in and opens a browser sign-in flow when needed. If authentication cannot be verified, the wizard falls back to local model defaults.

你也可以直接在 [ollama.com/signin](https://ollama.com/signin) 登录。

## 高级

### 推理模型

OpenClaw 默认将名称包含 `deepseek-r1`、`reasoning` 或 `think` 的模型视为具备推理能力：

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

对于自动发现的模型，OpenClaw 使用 Ollama 报告的上下文窗口（如有），否则默认为 OpenClaw 使用的 Ollama 默认上下文窗口。你可以在显式的提供者配置中覆盖 `contextWindow` 和 `maxTokens`。

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

如果你的模型未被列出，请：

- 在本地拉取该模型，或
- 在 `models.providers.ollama` 中显式定义模型。

添加模型示例：

```bash
ollama list  # 查看已安装模型
ollama pull glm-4.7-flash
ollama pull gpt-oss:20b
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
