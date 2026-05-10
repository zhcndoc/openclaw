---
summary: "使用 OpenClaw 的 Mistral 模型和 Voxtral 转录"
read_when:
  - 你想在 OpenClaw 中使用 Mistral 模型
  - 你想为 Voice Call 使用 Voxtral 实时转录
  - 你需要 Mistral API 密钥接入引导和模型引用
title: "Mistral"
---

OpenClaw 包含一个捆绑的 Mistral 插件，注册了四个契约：聊天补全、媒体理解（Voxtral 批量转录）、用于 Voice Call 的实时 STT（Voxtral Realtime），以及记忆嵌入（`mistral-embed`）。

| Property         | Value                                       |
| ---------------- | ------------------------------------------- |
| Provider id      | `mistral`                                   |
| Plugin           | bundled, `enabledByDefault: true`           |
| Auth env var     | `MISTRAL_API_KEY`                           |
| Onboarding flag  | `--auth-choice mistral-api-key`             |
| Direct CLI flag  | `--mistral-api-key <key>`                   |
| API              | OpenAI-compatible (`openai-completions`)    |
| Base URL         | `https://api.mistral.ai/v1`                 |
| Default model    | `mistral/mistral-large-latest`              |
| Embedding model  | `mistral-embed`                             |
| Voxtral batch    | `voxtral-mini-latest` (音频转录) |
| Voxtral realtime | `voxtral-mini-transcribe-realtime-2602`     |

## 开始使用

<Steps>
  <Step title="获取你的 API 密钥">
    在 [Mistral 控制台](https://console.mistral.ai/) 中创建一个 API 密钥。
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

[Mistral Medium 3.5](https://docs.mistral.ai/models/model-cards/mistral-medium-3-5-26-04)
是捆绑目录中的当前混合式 Medium 模型：128B 稠密权重、
文本和图像输入、256K 上下文、函数调用、结构化输出、编码，
以及通过 Chat Completions API 可调的推理能力。若你想使用
Mistral 更新的统一 agentic/coding 模型而不是默认的 `mistral/mistral-large-latest`，
请使用 `mistral/mistral-medium-3-5`。

OpenClaw 当前提供以下捆绑的 Mistral 目录：

| Model ref                        | Input       | Context | Max output | Notes                                                            |
| -------------------------------- | ----------- | ------- | ---------- | ---------------------------------------------------------------- |
| `mistral/mistral-large-latest`   | text, image | 262,144 | 16,384     | 默认模型                                                    |
| `mistral/mistral-medium-2508`    | text, image | 262,144 | 8,192      | Mistral Medium 3.1                                               |
| `mistral/mistral-medium-3-5`     | text, image | 262,144 | 8,192      | Mistral Medium 3.5；可调推理                         |
| `mistral/mistral-small-latest`   | text, image | 128,000 | 16,384     | Mistral Small 4；可通过 API `reasoning_effort` 调整推理 |
| `mistral/pixtral-large-latest`   | text, image | 128,000 | 32,768     | Pixtral                                                          |
| `mistral/codestral-latest`       | text        | 256,000 | 4,096      | 编码                                                           |
| `mistral/devstral-medium-latest` | text        | 262,144 | 32,768     | Devstral 2                                                       |
| `mistral/magistral-small`        | text        | 128,000 | 40,000     | 支持推理                                                |

在接入引导之后、且不启动 Gateway 的情况下，对 Medium 3.5 进行烟雾测试：

```bash
openclaw infer model run --local \
  --model mistral/mistral-medium-3-5 \
  --prompt "Reply with exactly: mistral-ok" \
  --json
```

在更改配置之前，浏览捆绑目录中的这一行：

```bash
openclaw models list --all --provider mistral --plain
```

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
  <Accordion title="Adjustable reasoning">
    `mistral/mistral-small-latest` (Mistral Small 4) and `mistral/mistral-medium-3-5` support [adjustable reasoning](https://docs.mistral.ai/studio-api/conversations/reasoning/adjustable) on the Chat Completions API via `reasoning_effort` (`none` minimizes extra thinking in the output; `high` surfaces full thinking traces before the final answer). Mistral recommends `reasoning_effort="high"` for Medium 3.5 agentic and code use cases.

    OpenClaw 会将会话的 **thinking** 级别映射到 Mistral 的 API：

    | OpenClaw thinking 级别                         | Mistral `reasoning_effort` |
    | ---------------------------------------------- | -------------------------- |
    | **off** / **minimal**                         | `none`                     |
    | **low** / **medium** / **high** / **xhigh** / **adaptive** / **max** | `high`     |

    <Warning>
    不要将 Medium 3.5 推理模式与 `temperature: 0` 结合使用。Mistral
    HTTP API 会在 `reasoning_effort="high"` 加上 `temperature: 0` 时返回 400
    响应。请保持 temperature 不设置，让 Mistral 使用默认值，或者遵循
    [Medium 3.5 推荐设置](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B)
    并在高推理场景下使用 `temperature: 0.7`。对于确定性的直接
    答案，在降低 temperature 之前先关闭/最小化 thinking，使 OpenClaw 发送
    `reasoning_effort: "none"`。
    </Warning>

    Medium 3.5 推理的按模型配置示例：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "mistral/mistral-medium-3-5" },
          models: {
            "mistral/mistral-medium-3-5": {
              params: { thinking: "high" },
            },
          },
        },
      },
    }
    ```

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
    - Mistral 认证使用 `MISTRAL_API_KEY`（Bearer 头）。
    - 提供方基础 URL 默认为 `https://api.mistral.ai/v1`，并接受标准的 OpenAI 兼容 chat-completions 请求格式。
    - 接入引导的默认模型是 `mistral/mistral-large-latest`。
    - 只有当 Mistral 明确发布了你需要的区域端点时，才在 `models.providers.mistral.baseUrl` 下覆盖基础 URL。

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