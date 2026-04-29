---
summary: "使用 LM Studio 运行 OpenClaw"
read_when:
  - 你想通过 LM Studio 使用开源模型运行 OpenClaw
  - 你想设置并配置 LM Studio
title: "LM Studio"
---

LM Studio 是一款友好且强大的应用，可在你自己的硬件上运行开源权重模型。它支持运行 llama.cpp（GGUF）或 MLX 模型（Apple Silicon）。既有 GUI 版本，也有无头守护进程（`llmster`）版本。有关产品和安装文档，请参见 [lmstudio.ai](https://lmstudio.ai/)。

## 快速开始

1. 安装 LM Studio（桌面版）或 `llmster`（无头版），然后启动本地服务器：

```bash
curl -fsSL https://lmstudio.ai/install.sh | bash
```

2. 启动服务器

确保你已经启动桌面应用，或者使用以下命令运行守护进程：

```bash
lms daemon up
```

```bash
lms server start --port 1234
```

如果你正在使用应用，请确保已启用 JIT 以获得流畅体验。可在 [LM Studio JIT and TTL 指南](https://lmstudio.ai/docs/developer/core/ttl-and-auto-evict) 中了解更多。

3. 如果启用了 LM Studio 身份验证，请设置 `LM_API_TOKEN`：

```bash
export LM_API_TOKEN="your-lm-studio-api-token"
```

如果未启用 LM Studio 身份验证，你可以在交互式 OpenClaw 设置过程中将 API 密钥留空。

有关 LM Studio 身份验证设置的详细信息，请参见 [LM Studio Authentication](https://lmstudio.ai/docs/developer/core/authentication)。

4. 运行 onboarding 并选择 `LM Studio`：

```bash
openclaw onboard
```

5. 在 onboarding 中，使用 `Default model` 提示选择你的 LM Studio 模型。

你也可以稍后设置或更改它：

```bash
openclaw models set lmstudio/qwen/qwen3.5-9b
```

LM Studio 模型键遵循 `author/model-name` 格式（例如 `qwen/qwen3.5-9b`）。OpenClaw
模型引用会在前面加上提供方名称：`lmstudio/qwen/qwen3.5-9b`。你可以通过运行 `curl http://localhost:1234/api/v1/models` 并查看 `key` 字段来找到
模型的准确键值。

## 非交互式 onboarding

当你想通过脚本进行设置（CI、预配、远程引导）时，请使用非交互式 onboarding：

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --auth-choice lmstudio
```

或者指定基础 URL、模型，以及可选的 API 密钥：

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --auth-choice lmstudio \
  --custom-base-url http://localhost:1234/v1 \
  --lmstudio-api-key "$LM_API_TOKEN" \
  --custom-model-id qwen/qwen3.5-9b
```

`--custom-model-id` 接受 LM Studio 返回的模型键值（例如 `qwen/qwen3.5-9b`），不包含
`lmstudio/` 提供方前缀。

对于已认证的 LM Studio 服务器，请传入 `--lmstudio-api-key` 或设置 `LM_API_TOKEN`。
对于未认证的 LM Studio 服务器，请省略该密钥；OpenClaw 会存储一个本地的非机密标记。

`--custom-api-key` 仍然为兼容性保留支持，但对于 LM Studio，更推荐使用 `--lmstudio-api-key`。

这会写入 `models.providers.lmstudio` 并将默认模型设置为
`lmstudio/<custom-model-id>`。当你提供 API 密钥时，设置还会写入
`lmstudio:default` 身份验证配置文件。

交互式设置可能会提示你输入一个可选的首选加载上下文长度，并将其应用到它保存到配置中的已发现 LM Studio 模型上。
LM Studio 插件配置会信任已配置的 LM Studio 端点用于模型请求，包括 loopback、LAN 和 tailnet 主机。你可以通过设置 `models.providers.lmstudio.request.allowPrivateNetwork: false` 来选择退出。

## 配置

### 流式使用量兼容性

LM Studio 与流式使用量兼容。当它没有发出 OpenAI 形式的
`usage` 对象时，OpenClaw 会改为从 llama.cpp 风格的
`timings.prompt_n` / `timings.predicted_n` 元数据中恢复 token 数量。

以下 OpenAI 兼容的本地后端也适用相同的流式使用量行为：

- vLLM
- SGLang
- llama.cpp
- LocalAI
- Jan
- TabbyAPI
- text-generation-webui

### 思考兼容性

当 LM Studio 的 `/api/v1/models` 发现结果报告了模型特定的推理
选项时，OpenClaw 会在模型兼容元数据中保留这些原生值。对于
声明 `allowed_options: ["off", "on"]` 的二元思考模型，
OpenClaw 会将禁用思考映射为 `off`，将启用 `/think` 级别映射为 `on`，
而不是发送诸如 `low` 或 `medium` 之类仅 OpenAI 支持的值。

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

确保 LM Studio 正在运行。如果启用了身份验证，也请设置 `LM_API_TOKEN`：

```bash
# 通过桌面应用启动，或者无头模式：
lms server start --port 1234
```

验证 API 可访问：

```bash
curl http://localhost:1234/api/v1/models
```

### 身份验证错误（HTTP 401）

如果设置报告 HTTP 401，请验证你的 API 密钥：

- 检查 `LM_API_TOKEN` 是否与 LM Studio 中配置的密钥匹配。
- 有关 LM Studio 身份验证设置的详细信息，请参见 [LM Studio Authentication](https://lmstudio.ai/docs/developer/core/authentication)。
- 如果你的服务器不需要身份验证，请在设置过程中将密钥留空。

### 即时模型加载

LM Studio 支持即时（JIT）模型加载，即模型会在首次请求时加载。请确保已启用此功能，以避免出现“Model not loaded”错误。

### LAN 或 tailnet 上的 LM Studio 主机

使用 LM Studio 主机可访问的地址，保留 `/v1`，并确保该机器上的 LM Studio 绑定到 loopback 之外：

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

不同于通用的 OpenAI 兼容提供方，`lmstudio` 会自动信任其配置的本地/私有端点，用于受保护的模型请求。像 `localhost` 或 `127.0.0.1` 这样的自定义 loopback 提供方 ID 也会自动被信任；对于 LAN、tailnet 或私有 DNS 的自定义提供方 ID，请显式设置 `models.providers.<id>.request.allowPrivateNetwork: true`。

## 相关内容

- [模型选择](/concepts/model-providers)
- [Ollama](/providers/ollama)
- [本地模型](/gateway/local-models)
