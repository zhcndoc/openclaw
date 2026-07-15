---
summary: "使用 OpenClaw 的 Mistral 模型和 Voxtral 转录"
read_when:
  - 你想在 OpenClaw 中使用 Mistral 模型
  - 你想为 Voice Call 使用 Voxtral 实时转录
  - 你需要 Mistral API 密钥接入引导和模型引用
title: "Mistral"
---

捆绑的 `mistral` 插件注册了四个契约：聊天补全、媒体理解（Voxtral 批量转录）、用于 Voice Call 的实时 STT（Voxtral Realtime），以及记忆嵌入（`mistral-embed`）。

| Property         | Value                                       |
| ---------------- | ------------------------------------------- |
| Provider id      | `mistral`                                   |
| Plugin           | bundled, enabled by default                 |
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

| Model ref                        | Input       | Context | Max output | Notes                                                 |
| -------------------------------- | ----------- | ------- | ---------- | ----------------------------------------------------- |
| `mistral/mistral-large-latest`   | 文本, 图像   | 262,144 | 16,384     | 默认模型                                              |
| `mistral/mistral-medium-2508`    | 文本, 图像   | 262,144 | 8,192      | Mistral Medium 3.1                                    |
| `mistral/mistral-medium-3-5`     | 文本, 图像   | 262,144 | 8,192      | Mistral Medium 3.5；可调推理                            |
| `mistral/mistral-small-latest`   | 文本, 图像   | 262,144 | 16,384     | Mistral Small 4 最新版；可调 `reasoning_effort`       |
| `mistral/mistral-small-2603`     | 文本, 图像   | 262,144 | 16,384     | Mistral Small 4 固定版本；可调 `reasoning_effort`     |
| `mistral/pixtral-large-latest`   | 文本, 图像   | 128,000 | 32,768     | Pixtral                                               |
| `mistral/codestral-latest`       | 文本        | 256,000 | 4,096      | 编码                                                  |
| `mistral/devstral-medium-latest` | 文本        | 262,144 | 32,768     | Devstral 2                                            |
| `mistral/magistral-small`        | 文本        | 128,000 | 40,000     | 支持推理                                              |

在更改配置之前，请先浏览内置目录中的该行：

```bash
openclaw models list --all --provider mistral --plain
```

在不启动 Gateway 的情况下对模型进行烟雾测试：

```bash
openclaw infer model run --local \
  --model mistral/mistral-medium-3-5 \
  --prompt "只回复：mistral-ok" \
  --json
```

## 音频转录（Voxtral）

通过媒体理解管道使用 Voxtral 进行批量音频转录：

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

捆绑的 `mistral` 插件将 Voxtral Realtime 注册为 Voice Call 流式 STT 提供方。

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
OpenClaw 默认将 Mistral 实时 STT 设置为 8 kHz 的 `pcm_mulaw`，因此 Voice Call 可以直接转发 Twilio 媒体帧。仅当你的上游流已经是原始 PCM 时，才使用 `encoding: "pcm_s16le"` 并匹配相应的 `sampleRate`。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="可调整推理">
    `mistral/mistral-small-latest`, `mistral/mistral-small-2603`, and `mistral/mistral-medium-3-5` support [adjustable reasoning](https://docs.mistral.ai/studio-api/conversations/reasoning/adjustable) on the Chat Completions API via `reasoning_effort` (`none` minimizes extra thinking in the output; `high` surfaces full thinking traces before the final answer).

    OpenClaw 会将会话的 **thinking** 级别映射到 Mistral 的 API：

    | OpenClaw thinking level                                              | Mistral `reasoning_effort` |
    | ----------------------------------------------------------------------- | --------------------------- |
    | **off** / **minimal**                                                 | `none`                      |
    | **low** / **medium** / **high** / **xhigh** / **adaptive** / **max** | `high`                       |

    <Warning>
    避免将 Medium 3.5 推理模式与 `temperature: 0` 组合使用；据报道，Mistral HTTP API 会拒绝 `reasoning_effort="high"` 加上 `temperature: 0` 并返回 400 响应。请保持 temperature 未设置，或者先关闭 thinking / 设为 minimal，这样在设置较低 temperature 之前，OpenClaw 会发送 `reasoning_effort: "none"`。
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

  <Accordion title="Memory embeddings">
    Mistral 可以通过 `/v1/embeddings` 提供记忆嵌入（默认模型：`mistral-embed`）：

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: { provider: "mistral" },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Authentication and Base URL">
    - Mistral 认证使用 `MISTRAL_API_KEY`（Bearer 头）。
    - 提供方基础 URL 默认为 `https://api.mistral.ai/v1`，并接受标准的 OpenAI 兼容 chat-completions 请求格式。
    - 接入引导的默认模型是 `mistral/mistral-large-latest`。
    - 只有当 Mistral 明确发布了你需要的区域端点时，才在 `models.providers.mistral.baseUrl` 下覆盖基础 URL。

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="Model selection" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用和故障转移行为。
  </Card>
  <Card title="Media understanding" href="/nodes/media-understanding" icon="microphone">
    音频转录设置和提供方选择。
  </Card>
</CardGroup>