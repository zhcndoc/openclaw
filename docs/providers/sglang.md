---
summary: "使用 SGLang 运行 OpenClaw（OpenAI 兼容的自托管服务器）"
read_when:
  - 你想将 OpenClaw 与本地 SGLang 服务器一起使用
  - 你想使用自己的模型提供 OpenAI 兼容的 /v1 接口
title: "SGLang"
---

SGLang 可以通过 **OpenAI 兼容** 的 HTTP API 提供开源模型服务。
OpenClaw 可以使用 `openai-completions` API 连接到 SGLang。

当你选择使用 `SGLANG_API_KEY`（如果服务器不强制认证，任意值均可）
且未定义显式的 `models.providers.sglang` 条目时，OpenClaw 还可以**自动发现** SGLang 上可用的模型。

OpenClaw 将 `sglang` 视为本地的 OpenAI 兼容提供者，支持
流式使用量统计，因此状态/上下文 token 计数可以根据
`stream_options.include_usage` 响应进行更新。

## Getting started

<Steps>
  <Step title="启动 SGLang">
    使用 OpenAI 兼容的服务器启动 SGLang。你的基础 URL 应该暴露 `/v1` 端点（例如 `/v1/models`, `/v1/chat/completions`）。SGLang 通常运行在：

    - `http://127.0.0.1:30000/v1`

  </Step>
  <Step title="设置 API 密钥">
    如果你的服务器未配置认证，任意值均可：

    ```bash
    export SGLANG_API_KEY="sglang-local"
    ```

  </Step>
  <Step title="运行引导流程或直接设置模型">
    ```bash
    openclaw onboard
    ```

    或手动配置模型：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "sglang/your-model-id" },
        },
      },
    }
    ```

  </Step>
</Steps>

## 模型发现（隐式提供者）

当设置了 `SGLANG_API_KEY`（或存在认证配置）且你**未**定义 `models.providers.sglang` 时，OpenClaw 会发送查询：

- `GET http://127.0.0.1:30000/v1/models`

并将返回的 ID 转换成模型条目。

<Note>
如果你显式设置了 `models.providers.sglang`，将跳过自动发现，你必须手动定义模型。
</Note>

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

## 高级配置

<AccordionGroup>
  <Accordion title="代理式行为">
    SGLang 被视为代理式的 OpenAI 兼容 `/v1` 后端，而不是原生 OpenAI 端点。

    | 行为 | SGLang |
    |----------|--------|
    | 仅 OpenAI 请求整形 | 不适用 |
    | `service_tier`, Responses `store`, prompt-cache 提示 | 不发送 |
    | 推理兼容负载整形 | 不适用 |
    | 隐藏归属头（`originator`, `version`, `User-Agent`） | 不在自定义 SGLang 基础 URL 上注入 |

  </Accordion>

  <Accordion title="故障排除">
    **服务器不可达**

    验证服务器是否正在运行并响应：

    ```bash
    curl http://127.0.0.1:30000/v1/models
    ```

    **认证错误**

    如果请求因认证错误失败，设置一个与服务器配置匹配的真实 `SGLANG_API_KEY`，或在 `models.providers.sglang` 下显式配置提供者。

    <Tip>
    如果你在没有认证的情况下运行 SGLang，`SGLANG_API_KEY` 的任何非空值都足以启用模型发现。
    </Tip>

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供者、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    包含提供者条目的完整配置模式。
  </Card>
</CardGroup>
