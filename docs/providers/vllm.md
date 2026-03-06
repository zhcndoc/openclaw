---
summary: "使用 vLLM（兼容 OpenAI 的本地服务器）运行 OpenClaw"
read_when:
  - 你想对本地的 vLLM 服务器运行 OpenClaw
  - 你想用自己的模型实现兼容 OpenAI 的 /v1 端点
title: "vLLM"
---

# vLLM

vLLM 可以通过**兼容 OpenAI** 的 HTTP API 提供开源（以及部分自定义）模型服务。OpenClaw 可以使用 `openai-completions` API 连接到 vLLM。

当你选择使用 `VLLM_API_KEY`（如果你的服务器不强制认证，任何值都可以）且没有明确定义 `models.providers.vllm` 条目时，OpenClaw 还能**自动发现** vLLM 中可用的模型。

## 快速开始

1. 启动一个兼容 OpenAI 的 vLLM 服务器。

你的基础 URL 应该暴露 `/v1` 端点（例如 `/v1/models`，`/v1/chat/completions`）。vLLM 通常运行于：

- `http://127.0.0.1:8000/v1`

2. 选择启用（如果没有认证，任何值都行）：

```bash
export VLLM_API_KEY="vllm-local"
```

3. 选择一个模型（替换为你的 vLLM 模型 ID）：

```json5
{
  agents: {
    defaults: {
      model: { primary: "vllm/your-model-id" },
    },
  },
}
```

## 模型发现（隐式提供者）

当设置了 `VLLM_API_KEY`（或存在认证配置）且**没有**定义 `models.providers.vllm` 时，OpenClaw 会请求：

- `GET http://127.0.0.1:8000/v1/models`

…并将返回的 ID 转换成模型条目。

如果你显式设置了 `models.providers.vllm`，则跳过自动发现，必须手动定义模型。

## 显式配置（手动模型）

显式配置适用于：

- vLLM 运行在不同的主机/端口。
- 你想固定 `contextWindow` / `maxTokens` 参数。
- 服务器需要真实的 API key（或你想控制请求头）。

```json5
{
  models: {
    providers: {
      vllm: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "${VLLM_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "your-model-id",
            name: "本地 vLLM 模型",
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

## 故障排查

- 检查服务器是否可访问：

```bash
curl http://127.0.0.1:8000/v1/models
```

- 如果请求因认证失败，设置与你服务器配置匹配的真实 `VLLM_API_KEY`，或者在 `models.providers.vllm` 下显式配置提供者。
