---
summary: "使用 SGLang 运行 OpenClaw（兼容 OpenAI 的自托管服务器）"
read_when:
  - 你希望将 OpenClaw 连接到本地 SGLang 服务器
  - 你希望使用自己的模型并获得兼容 OpenAI 的 /v1 端点
title: "SGLang"
---

SGLang 可以通过 **兼容 OpenAI** 的 HTTP API 提供开源模型服务。
OpenClaw 可以使用 `openai-completions` API 连接到 SGLang。

当你通过 `SGLANG_API_KEY` 启用时（如果你的服务器不强制认证，任何值都可以）
且你没有定义显式的 `models.providers.sglang` 条目时，OpenClaw 还可以
**自动发现** SGLang 中可用的模型。

OpenClaw 将 `sglang` 视为一个本地的、兼容 OpenAI 的提供方，支持
流式使用量统计，因此状态/上下文 token 计数可以从
`stream_options.include_usage` 响应中更新。

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

当设置了 `SGLANG_API_KEY`（或存在认证配置文件）并且你**没有**
定义 `models.providers.sglang` 时，OpenClaw 将查询：

- `GET http://127.0.0.1:30000/v1/models`

并将返回的 ID 转换为模型条目。

<Note>
如果你显式设置了 `models.providers.sglang`，则会跳过自动发现，
你必须手动定义模型。
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
