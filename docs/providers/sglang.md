---
summary: "使用 SGLang 运行 OpenClaw（OpenAI- 兼容自托管服务器）"
read_when:
  - "你希望将 OpenClaw 连接到本地 SGLang 服务器"
  - "您希望 OpenAI- 兼容 /v1 端点与您自己的模型"
title: "西格朗"
---

SGLang 通过 OpenAI- 兼容的 HTTP API 提供开放重量模型。 OpenClaw 使用 `openai-completions` 提供程序系列连接到 SGLang，并自动发现可用模型。

| 属性                  | 值                                                        |
| ------------------------- | ------------------------------------------------------------ |
| 提供方 id               | `sglang`                                                     |
| 插件                    | 内置，`enabledByDefault: true`                            |
| 认证环境变量              | `SGLANG_API_KEY`（如果服务器没有认证，则任意非空值均可） |
| 引导标志           | `--auth-choice sglang`                                       |
| API                       | OpenAI-兼容（`openai-completions`）                     |
| 默认基础 URL          | `http://127.0.0.1:30000/v1`                                  |
| 默认模型占位符 | `sglang/Qwen/Qwen3-8B`                                       |
| 流式传输用量           | 是（`supportsStreamingUsage: true`）                         |
| 定价                   | 标记为外部免费（`modelPricing.external: false`）        |

OpenClaw还**自动发现**当您选择加入时，SGLang 提供可用模型`SGLANG_API_KEY`。使用`sglang/*` in `agents.defaults.models`当您还配置自定义 SGLang 基础时保持发现动态URL。看[模型发现（隐式提供者）](#model-discovery-implicit-provider)以下。

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="start-sglang" title="启动 SGLang">
    使用 OpenAI- 兼容服务器启动 SGLang。您的基础 URL 应公开 `/v1` 端点（例如 `/v1/models`、`/v1/chat/completions`）。 SGLang 通常运行在：

    - `http://127.0.0.1:30000/v1`

  </Step>
  <Step id="set-an-api-key" title="设置 API 密钥">
    如果你的服务器未配置认证，任何值都可以：

    ```bash
    export SGLANG_API_KEY="sglang-local"
    ```

  </Step>
  <Step id="run-onboarding-or-set-a-model-directly" title="运行入门引导或直接设置模型">
    ```bash
    openclaw onboard --auth-choice sglang
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

## <a id="model-discovery-(implicit-provider)"></a><a id="model-discovery-implicit-provider"></a> 模型发现（隐式提供方）

当设置了 `SGLANG_API_KEY`（或存在认证配置文件）且你**没有** 定义 `models.providers.sglang` 时，OpenClaw 会查询：

- `GET http://127.0.0.1:30000/v1/models`

并将返回的 ID 转换为模型条目。

<Note>
如果您显式设置 `models.providers.sglang`，则 OpenClaw 默认使用您声明的模型。当您希望 OpenClaw 查询配置的提供程序的 `/models` 端点并包含所有公布的 SGLang 模型时，请将 `"sglang/*": {}` 添加到 `agents.defaults.models`。
</Note>

## <a id="explicit-configuration-(manual-models)"></a><a id="explicit-configuration-manual-models"></a> 显式配置（手动模型）

在以下情况下使用显式配置：

- SGLang 在不同的 host/port. 上运行
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
            name: "Local SGLang Model",
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

## <a id="advanced-configuration"></a> 高级配置

<AccordionGroup>
  <Accordion id="proxy-style-behavior" title="代理式行为">
    SGLang 被视为代理样式的 OpenAI- 兼容 `/v1` 后端，而不是本机 OpenAI 端点。

    | 行为 | 西格朗 |
    |----------|--------|
    | OpenAI-仅请求整形 | 未应用 |
    | `service_tier`、Responses 的 `store`、prompt-cache 提示 | 不发送 |
    | 兼容推理的负载整形 | 未应用 |
    | 隐藏归因标头（`originator`、`version`、`User-Agent`） | 未注入自定义 SGLang 基本 URL |

  </Accordion>

  <Accordion id="troubleshooting" title="故障排查">
    **服务器不可访问**

    确认服务器正在运行并且有响应：

    ```bash
    curl http://127.0.0.1:30000/v1/models
    ```

    **认证错误**

    如果请求因认证错误失败，请设置一个与你的服务器配置匹配的真实 `SGLANG_API_KEY`，或者在 `models.providers.sglang` 下显式配置该提供方。

    <Tip>
    如果你在没有认证的情况下运行 SGLang，则 `SGLANG_API_KEY` 只需设置为任意非空值即可启用模型发现。
    </Tip>

  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    完整的配置模式，包括提供方条目。
  </Card>
</CardGroup>
