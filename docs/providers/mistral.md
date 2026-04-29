---
summary: "使用 OpenClaw 的 Mistral 模型和 Voxtral 转录"
read_when:
  - 你想在 OpenClaw 中使用 Mistral 模型
  - 你想为 Voice Call 使用 Voxtral 实时转录
  - 你需要 Mistral API 密钥接入引导和模型引用
title: "Mistral"
---

OpenClaw 支持 Mistral 用于文本/图像模型路由（`mistral/...`）以及
通过媒体理解中的 Voxtral 进行音频转录。
Mistral 也可用于记忆嵌入（`memorySearch.provider = "mistral"`）。

- 提供方：`mistral`
- 认证：`MISTRAL_API_KEY`
- API：Mistral Chat Completions（`https://api.mistral.ai/v1`）

## 开始使用

<Steps>
  <Step title="获取你的 API 密钥">
    在 [Mistral Console](https://console.mistral.ai/) 中创建一个 API 密钥。
  </Step>
  <Step title="运行接入引导">
    ```bash
    openclaw onboard --auth-choice mistral-api-key
    ```

    或者直接传入密钥：

    ```bash
    openclaw onboard --mistral-api-key "$MISTRAL_API_KEY"
    ```

  </Step>
  <Step title="设置默认模型">
    ```json5
    {
      env: { MISTRAL_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "mistral/mistral-large-latest" } } },
    }
    ```
  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider mistral
    ```
  </Step>
</Steps>

## 内置 LLM 目录

OpenClaw 当前附带以下 Mistral 目录：

| 模型引用                         | 输入         | 上下文  | 最大输出 | 备注                                                             |
| -------------------------------- | ------------ | ------- | -------- | ---------------------------------------------------------------- |
| `mistral/mistral-large-latest`   | text, image  | 262,144 | 16,384   | 默认模型                                                         |
| `mistral/mistral-medium-2508`    | text, image  | 262,144 | 8,192    | Mistral Medium 3.1                                              |
| `mistral/mistral-small-latest`   | text, image  | 128,000 | 16,384   | Mistral Small 4；可通过 API `reasoning_effort` 调整推理强度      |
| `mistral/pixtral-large-latest`   | text, image  | 128,000 | 32,768   | Pixtral                                                          |
| `mistral/codestral-latest`       | text         | 256,000 | 4,096    | 编码                                                             |
| `mistral/devstral-medium-latest` | text         | 262,144 | 32,768   | Devstral 2                                                       |
| `mistral/magistral-small`        | text         | 128,000 | 40,000   | 支持推理                                                         |

## 音频转录（Voxtral）

通过媒体理解流水线使用 Voxtral 进行批量音频转录。

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "mistral", model: "voxtral-mini-latest" }],
      },
    },
  },
}
```

<Tip>
媒体转录路径使用 `/v1/audio/transcriptions`。Mistral 的默认音频模型是 `voxtral-mini-latest`。
</Tip>

## Voice Call 流式 STT

内置的 `mistral` 插件会将 Voxtral Realtime 注册为 Voice Call 的
流式 STT 提供方。

| 设置         | 配置路径                                                             | 默认值                                  |
| ------------ | -------------------------------------------------------------------- | --------------------------------------- |
| API key      | `plugins.entries.voice-call.config.streaming.providers.mistral.apiKey` | 回退到 `MISTRAL_API_KEY`              |
| 模型         | `...mistral.model`                                                   | `voxtral-mini-transcribe-realtime-2602` |
| 编码         | `...mistral.encoding`                                                | `pcm_mulaw`                             |
| 采样率       | `...mistral.sampleRate`                                              | `8000`                                  |
| 目标延迟     | `...mistral.targetStreamingDelayMs`                                  | `800`                                   |

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          streaming: {
            enabled: true,
            provider: "mistral",
            providers: {
              mistral: {
                apiKey: "${MISTRAL_API_KEY}",
                targetStreamingDelayMs: 800,
              },
            },
          },
        },
      },
    },
  },
}
```

<Note>
OpenClaw 将 Mistral 实时 STT 默认设为 8 kHz 的 `pcm_mulaw`，因此 Voice Call
可以直接转发 Twilio 媒体帧。只有当你的上游流已经是原始 PCM 时，才使用 `encoding: "pcm_s16le"` 并配合
匹配的 `sampleRate`。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="可调整推理（mistral-small-latest）">
    `mistral/mistral-small-latest` 映射到 Mistral Small 4，并在 Chat Completions API 上通过 [`reasoning_effort`](https://docs.mistral.ai/capabilities/reasoning/adjustable) 支持[可调整推理](https://docs.mistral.ai/capabilities/reasoning/adjustable)（`none` 会尽量减少输出中的额外思考；`high` 会在最终答案前展示完整思考轨迹）。

    OpenClaw 会将会话的 **thinking** 级别映射到 Mistral 的 API：

    | OpenClaw thinking 级别                         | Mistral `reasoning_effort` |
    | ---------------------------------------------- | -------------------------- |
    | **off** / **minimal**                         | `none`                     |
    | **low** / **medium** / **high** / **xhigh** / **adaptive** / **max** | `high`     |

    <Note>
    其他内置的 Mistral 目录模型不使用此参数。当你想要 Mistral 原生的“优先推理”行为时，请继续使用 `magistral-*` 模型。
    </Note>

  </Accordion>

  <Accordion title="记忆嵌入">
    Mistral 可以通过 `/v1/embeddings` 提供记忆嵌入（默认模型：`mistral-embed`）。

    ```json5
    {
      memorySearch: { provider: "mistral" },
    }
    ```

  </Accordion>

  <Accordion title="认证和基础 URL">
    - Mistral 认证使用 `MISTRAL_API_KEY`。
    - 提供方基础 URL 默认是 `https://api.mistral.ai/v1`。
    - 接入引导的默认模型是 `mistral/mistral-large-latest`。
    - Z.AI 使用带有你的 API 密钥的 Bearer 认证。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用和故障转移行为。
  </Card>
  <Card title="媒体理解" href="/nodes/media-understanding" icon="microphone">
    音频转录设置和提供方选择。
  </Card>
</CardGroup>