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

3. 如果启用了 LM Studio 身份验证，请设置 `LM_API_TOKEN`：

```bash
export LM_API_TOKEN="your-lm-studio-api-token"
```

如果未启用 LM Studio 身份验证，您可以在交互式 OpenClaw 设置期间将 API 密钥留空。

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

或者指定基础 URL、模型和可选 API 密钥：

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

对于已认证的 LM Studio 服务器，请传入 `--lmstudio-api-key` 或设置 `LM_API_TOKEN`。
对于未认证的 LM Studio 服务器，请省略该密钥；OpenClaw 会存储一个本地非密钥标记。

`--custom-api-key` 仍受支持以保持兼容性，但建议对 LM Studio 使用 `--lmstudio-api-key`。

这将写入 `models.providers.lmstudio`，并将默认模型设置为
`lmstudio/<custom-model-id>`。当您提供 API 密钥时，设置还会写入
`lmstudio:default` 身份验证配置文件。

交互式设置可能会提示您填写可选的首选加载上下文长度，并将其应用于它保存到配置中的已发现 LM Studio 模型。
LM Studio 插件配置会信任所配置的 LM Studio 端点用于模型请求，包括 loopback、LAN 和 tailnet 主机。您可以通过将 `models.providers.lmstudio.request.allowPrivateNetwork: false` 来选择退出。

## 配置

### 流式使用兼容性

LM Studio 兼容流式使用。当它不发出 OpenAI 形式的 `usage` 对象时，OpenClaw 会根据 llama.cpp 风格的 `timings.prompt_n` / `timings.predicted_n` 元数据恢复令牌计数。

相同的流式使用行为也适用于以下 OpenAI 兼容的本地后端：

- vLLM
- SGLang
- llama.cpp
- LocalAI
- Jan
- TabbyAPI
- text-generation-webui

### Thinking 兼容性

当 LM Studio 的 `/api/v1/models` 发现接口报告模型特定的推理选项时，OpenClaw 会在模型兼容元数据中保留这些原生值。对于声明 `allowed_options: ["off", "on"]` 的二元 thinking 模型，OpenClaw 会将禁用 thinking 映射为 `off`，将启用的 `/think` 等级映射为 `on`，而不是发送诸如 `low` 或 `medium` 之类仅 OpenAI 可用的值。

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

确保 LM Studio 正在运行。如果启用了身份验证，还请设置 `LM_API_TOKEN`：

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

- 检查 `LM_API_TOKEN` 是否与 LM Studio 中配置的密钥一致。
- 有关 LM Studio 身份验证设置的详细信息，请参阅 [LM Studio 身份验证](https://lmstudio.ai/docs/developer/core/authentication)。
- 如果您的服务器不需要身份验证，请在设置期间将密钥留空。

### 即时模型加载

LM Studio 支持即时（JIT）模型加载，即模型会在首次请求时加载。请确保已启用此功能，以避免出现“模型未加载”错误。

### LAN 或 tailnet LM Studio 主机

使用 LM Studio 主机的可访问地址，保留 `/v1`，并确保该机器上的 LM Studio 绑定到非 loopback 地址：

```json5
{
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://gpu-box.local:1234/v1",
        apiKey: "lmstudio",
        api: "openai-completions",
        models: [{ id: "qwen/qwen3.5-9b" }],
      },
    },
  },
}
```

与通用的 OpenAI 兼容提供者不同，`lmstudio` 会自动信任其配置的本地/私有端点用于受保护的模型请求。自定义的 loopback 提供者 ID（如 `localhost` 或 `127.0.0.1`）也会被自动信任；对于 LAN、tailnet 或私有 DNS 的自定义提供者 ID，请显式设置 `models.providers.<id>.request.allowPrivateNetwork: true`。

## 相关内容

- [模型选择](/concepts/model-providers)
- [Ollama](/providers/ollama)
- [本地模型](/gateway/local-models)
