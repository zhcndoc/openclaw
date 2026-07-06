---
summary: "使用 SGLang 运行 OpenClaw（兼容 OpenAI 的自托管服务器）"
read_when:
  - 你希望将 OpenClaw 连接到本地 SGLang 服务器
  - 你希望使用自己的模型并获得兼容 OpenAI 的 /v1 端点
title: "SGLang"
---

SGLang 通过兼容 OpenAI 的 HTTP API 提供开源权重模型。OpenClaw 使用 `openai-completions` 提供方家族连接到 SGLang，并自动发现可用模型。

| Property                  | Value                                                        |
| ------------------------- | ------------------------------------------------------------ |
| Provider id               | `sglang`                                                     |
| Plugin                    | bundled, `enabledByDefault: true`                            |
| Auth env var              | `SGLANG_API_KEY`（如果服务器没有认证，则任意非空值均可） |
| Onboarding flag           | `--auth-choice sglang`                                       |
| API                       | 兼容 OpenAI（`openai-completions`）                     |
| Default base URL          | `http://127.0.0.1:30000/v1`                                  |
| Default model placeholder | `sglang/Qwen/Qwen3-8B`                                       |
| Streaming usage           | 是（`supportsStreamingUsage: true`）                         |
| Pricing                   | 标记为外部免费（`modelPricing.external: false`）        |

OpenClaw 还会在你使用 `SGLANG_API_KEY` 时 **自动发现** SGLang 中可用的模型。若你同时配置了自定义的 SGLang base URL，请在 `agents.defaults.models` 中使用 `sglang/*` 以保持动态发现。参见下方 [模型发现（隐式提供方）](#model-discovery-implicit-provider)。

## 入门

<Steps>
  <Step title="启动 SGLang">
    使用兼容 OpenAI 的服务器启动 SGLang。你的基础 URL 应暴露
    `/v1` 端点（例如 `/v1/models`、`/v1/chat/completions`）。SGLang
    通常运行在：

    - `http://127.0.0.1:30000/v1`

  </Step>
  <Step title="设置 API 密钥">
    如果你的服务器未配置认证，任何值都可以：

    ```bash
    export SGLANG_API_KEY="sglang-local"
    ```

  </Step>
  <Step title="运行 onboarding 或直接设置模型">
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

## 模型发现（隐式提供方）

当设置了 `SGLANG_API_KEY`（或存在认证配置文件）且你**没有**
定义 `models.providers.sglang` 时，OpenClaw 会查询：

- `GET http://127.0.0.1:30000/v1/models`

并将返回的 ID 转换为模型条目。

<Note>
如果你显式设置了 `models.providers.sglang`，OpenClaw 默认会使用你声明的模型。当你希望 OpenClaw 查询该已配置提供方的 `/models` 端点并包含所有已公布的 SGLang 模型时，请在 `agents.defaults.models` 中添加 `"sglang/*": {}`。
</Note>

## 显式配置（手动模型）

在以下情况下使用显式配置：

- SGLang 运行在不同的主机/端口上。
- 你想固定 `contextWindow`/`maxTokens` 的值。
- 你的服务器需要真实的 API 密钥（或者你想控制请求头）。

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
    SGLang 被视为一个代理式的、兼容 OpenAI 的 `/v1` 后端，而不是
    原生 OpenAI 端点。

    | Behavior | SGLang |
    |----------|--------|
    | 仅 OpenAI 请求整形 | 不适用 |
    | `service_tier`、Responses 的 `store`、prompt-cache 提示 | 不发送 |
    | 兼容推理的负载整形 | 不适用 |
    | 隐藏的归因请求头（`originator`、`version`、`User-Agent`） | 在自定义 SGLang 基础 URL 上不会注入 |

  </Accordion>

  <Accordion title="故障排查">
    **服务器不可访问**

    确认服务器正在运行并且有响应：

    ```bash
    curl http://127.0.0.1:30000/v1/models
    ```

    **认证错误**

    如果请求因认证错误失败，请设置一个与
    你的服务器配置匹配的真实 `SGLANG_API_KEY`，或者在
    `models.providers.sglang` 下显式配置该提供方。

    <Tip>
    如果你在没有认证的情况下运行 SGLang，则
    `SGLANG_API_KEY` 只需设置为任意非空值即可启用模型发现。
    </Tip>

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用和故障切换行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    完整的配置模式，包括提供方条目。
  </Card>
</CardGroup>
