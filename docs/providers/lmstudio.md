---
summary: "使用 LM Studio 运行 OpenClaw"
read_when:
  - 您希望使用 LM Studio 通过开源模型运行 OpenClaw
  - 您希望设置并配置 LM Studio
title: "LM Studio"
---

LM Studio 是一款友好且强大的应用程序，可在您自己的硬件上运行开放权重模型。它支持运行 llama.cpp（GGUF）或 MLX 模型（Apple Silicon）。提供 GUI 版本或无头守护进程（`llmster`）。有关产品和设置文档，请参阅 [lmstudio.ai](https://lmstudio.ai/)。

## 快速开始

1. 安装 LM Studio（桌面版）或 `llmster`（无头模式），然后启动本地服务器：

```bash
curl -fsSL https://lmstudio.ai/install.sh | bash
```

2. 启动服务器

请确保您已启动桌面应用程序，或使用以下命令运行守护进程：

```bash
lms daemon up
```

```bash
lms server start --port 1234
```

如果您使用的是桌面应用程序，请确保已启用 JIT 以获得流畅体验。有关更多信息，请参考 [LM Studio JIT 和 TTL 指南](https://lmstudio.ai/docs/developer/core/ttl-and-auto-evict)。

3. OpenClaw 需要 LM Studio 的令牌值。请设置 `LM_API_TOKEN`：

```bash
export LM_API_TOKEN="your-lm-studio-api-token"
```

如果 LM Studio 身份验证已禁用，请使用任意非空令牌值：

```bash
export LM_API_TOKEN="placeholder-key"
```

有关 LM Studio 身份验证设置的详细信息，请参考 [LM Studio 身份验证](https://lmstudio.ai/docs/developer/core/authentication)。

4. 运行引导流程并选择 `LM Studio`：

```bash
openclaw onboard
```

5. 在引导流程中，使用 `Default model` 提示选择您的 LM Studio 模型。

您也可以稍后设置或更改它：

```bash
openclaw models set lmstudio/qwen/qwen3.5-9b
```

LM Studio 的模型键遵循 `作者/模型名称` 格式（例如 `qwen/qwen3.5-9b`）。OpenClaw 模型引用会加上提供者前缀：`lmstudio/qwen/qwen3.5-9b`。您可以通过运行以下命令查找模型的精确键：

```bash
curl http://localhost:1234/api/v1/models
```

并查看 `key` 字段。

## 非交互式引导

当您希望脚本化设置（CI、配置、远程引导）时，请使用非交互式引导：

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --auth-choice lmstudio
```

或者指定基础 URL 或模型与 API 密钥：

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --auth-choice lmstudio \
  --custom-base-url http://localhost:1234/v1 \
  --lmstudio-api-key "$LM_API_TOKEN" \
  --custom-model-id qwen/qwen3.5-9b
```

`--custom-model-id` 接收 LM Studio 返回的模型键（例如 `qwen/qwen3.5-9b`），不包含 `lmstudio/` 提供者前缀。

非交互式引导需要 `--lmstudio-api-key`（或环境变量中的 `LM_API_TOKEN`）。
对于未启用身份验证的 LM Studio 服务器，任何非空令牌值均可使用。

`--custom-api-key` 仍受支持以保持兼容性，但建议对 LM Studio 使用 `--lmstudio-api-key`。

这将写入 `models.providers.lmstudio`，设置默认模型为 `lmstudio/<custom-model-id>`，并写入 `lmstudio:default` 身份验证配置。

交互式设置可以提示选择可选的期望上下文长度，并将其应用于保存到配置中的所有已发现的 LM Studio 模型。

## 配置

### 流式使用兼容性

LM Studio 兼容流式使用。当它不发出 OpenAI 形式的 `usage` 对象时，OpenClaw 会根据 llama.cpp 风格的 `timings.prompt_n` / `timings.predicted_n` 元数据恢复令牌计数。

相同的行为也适用于以下 OpenAI 兼容的本地后端：

- vLLM
- SGLang
- llama.cpp
- LocalAI
- Jan
- TabbyAPI
- text-generation-webui

### 显式配置

```json5
{
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://localhost:1234/v1",
        apiKey: "${LM_API_TOKEN}",
        api: "openai-completions",
        models: [
          {
            id: "qwen/qwen3-coder-next",
            name: "Qwen 3 Coder Next",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## 故障排除

### 未检测到 LM Studio

请确保 LM Studio 正在运行，并已设置 `LM_API_TOKEN`（对于未启用身份验证的服务器，任何非空令牌值均可使用）：

```bash
# 通过桌面应用或无头模式启动：
lms server start --port 1234
```

验证 API 是否可访问：

```bash
curl http://localhost:1234/api/v1/models
```

### 身份验证错误（HTTP 401）

如果引导流程报告 HTTP 401，请验证您的 API 密钥：

- 检查 `LM_API_TOKEN` 是否与 LM Studio 中配置的密钥匹配。
- 有关 LM Studio 身份验证设置的详细信息，请参考 [LM Studio 身份验证](https://lmstudio.ai/docs/developer/core/authentication)。
- 如果服务器不需要身份验证，请为 `LM_API_TOKEN` 使用任意非空令牌值。

### 即时模型加载

LM Studio 支持即时（JIT）模型加载，即模型会在首次请求时加载。请确保已启用此功能，以避免出现“模型未加载”错误。

## 相关内容

- [模型选择](/concepts/model-providers)
- [Ollama](/providers/ollama)
- [本地模型](/gateway/local-models)
