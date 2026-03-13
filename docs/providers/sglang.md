---
summary: "使用 SGLang 运行 OpenClaw（OpenAI 兼容的自托管服务器）"
read_when:
  - 你想将 OpenClaw 与本地 SGLang 服务器一起使用
  - 你想使用自己的模型提供 OpenAI 兼容的 /v1 接口
title: "SGLang"
---

# SGLang

SGLang 可以通过 **OpenAI 兼容** 的 HTTP API 提供开源模型服务。
OpenClaw 可以使用 `openai-completions` API 连接 SGLang。

当你选择使用 `SGLANG_API_KEY`（如果服务器不强制认证，任意值均可）
且未定义显式的 `models.providers.sglang` 条目时，OpenClaw 还可以**自动发现** SGLang 上可用的模型。

## 快速开始

1. 启动运行兼容 OpenAI 的 SGLang 服务器。

你的基础 URL 应该暴露 `/v1` 端点（例如 `/v1/models`、`/v1/chat/completions`）。SGLang 通常运行在：

- `http://127.0.0.1:30000/v1`

2. 选择加入（如果未配置认证，任意值均可）：

```bash
export SGLANG_API_KEY="sglang-local"
```

3. 运行入门引导并选择 `SGLang`，或者直接设置模型：

```bash
openclaw onboard
```

```json5
{
  agents: {
    defaults: {
      model: { primary: "sglang/your-model-id" },
    },
  },
}
```

## 模型发现（隐式提供者）

当设置了 `SGLANG_API_KEY`（或存在认证配置）且你**未**定义 `models.providers.sglang` 时，OpenClaw 会发送查询：

- `GET http://127.0.0.1:30000/v1/models`

并将返回的 ID 转换成模型条目。

如果你显式设置了 `models.providers.sglang`，自动发现将被跳过，你必须手动定义模型。

## 显式配置（手动模型）

在以下情况使用显式配置：

- SGLang 在不同主机或端口运行。
- 你想固定 `contextWindow` / `maxTokens` 参数。
- 你的服务器要求使用真实的 API 密钥（或者你想控制请求头）。

```json5
{
  models: {
    providers: {
      sglang: {
        baseUrl: "http://127.0.0.1:30000/v1",
        apiKey: "${SGLANG_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "your-model-id",
            name: "本地 SGLang 模型",
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

- 检查服务器是否可访问：

```bash
curl http://127.0.0.1:30000/v1/models
```

- 如果请求因认证失败，设置一个与你服务器配置匹配的真实 `SGLANG_API_KEY`，或者在 `models.providers.sglang` 下显式配置提供者。
