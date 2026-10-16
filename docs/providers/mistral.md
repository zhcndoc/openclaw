---
summary: "使用 Mistral 模型和 Voxtral 转录与 OpenClaw"
read_when:
  - "您想要在 OpenClaw 中使用 Mistral 模型"
  - "你想为 Voice Call 使用 Voxtral 实时转录"
  - "你需要 Mistral API 密钥接入引导和模型引用"
title: "Mistral"
---

官方外部 `mistral` 插件注册了四项功能：聊天补全、 媒体理解（Voxtral 批量转录）、用于 Voice Call 的实时 STT （Voxtral Realtime）以及记忆嵌入（`mistral-embed`）。

| 属性         | 值                                       |
| ---------------- | ------------------------------------------- |
| 提供方 id      | `mistral`                                   |
| 插件           | `@openclaw/mistral-provider`                |
| 认证环境变量     | `MISTRAL_API_KEY`                           |
| 引导标志  | `--auth-choice mistral-api-key`             |
| 直接 CLI 标志  | `--mistral-api-key <key>`                   |
| API              | OpenAI-兼容（`openai-completions`）    |
| 基础 URL         | `https://api.mistral.ai/v1`                 |
| 默认模型    | `mistral/mistral-large-latest`              |
| 嵌入模型  | `mistral-embed`                             |
| Voxtral 批量    | `voxtral-mini-latest`（音频转录） |
| Voxtral 实时 | `voxtral-mini-transcribe-realtime-2602`     |

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="install-the-plugin" title="安装插件">
    ```bash
    openclaw plugins install @openclaw/mistral-provider
    ```

    安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

  </Step>
  <Step id="get-your-api-key" title="获取您的 API 密钥">
    在 [Mistral Console](https://console.mistral.ai/) 中创建 API 密钥。
  </Step>
  <Step id="run-onboarding" title="运行入门引导培训">
    ```bash
    openclaw onboard --auth-choice mistral-api-key
    ```

    或直接传入密钥：

    ```bash
    openclaw onboard --mistral-api-key "$MISTRAL_API_KEY"
    ```

  </Step>
  <Step id="set-a-default-model" title="设置默认模型">
    ```json5
    {
      env: { vars: { MISTRAL_API_KEY: "sk-..." } },
      agents: { defaults: { model: { primary: "mistral/mistral-large-latest" } } },
    }
    ```
  </Step>
  <Step id="verify-the-model-is-available" title="验证模型是否可用">
    ```bash
    openclaw models list --provider mistral
    ```
  </Step>
</Steps>

## <a id="built-in-llm-catalog"></a> 内置 LLM 目录

| 模型引用                        | 输入       | 上下文 | 最大输出 | 笔记                                                 |
| -------------------------------- | ----------- | ------- | ---------- | ----------------------------------------------------- |
| `mistral/mistral-large-latest`   | 文本、图像 | 262,144 | 16,384     | 默认模型                                         |
| `mistral/mistral-medium-3-5`     | 文本、图像 | 262,144 | 8,192      | Mistral Medium 3.5；可调整推理              |
| `mistral/mistral-small-latest`   | 文本、图像 | 262,144 | 16,384     | Mistral Small 4 最新版；可调整 `reasoning_effort` |
| `mistral/mistral-small-2603`     | 文本、图像 | 262,144 | 16,384     | Mistral Small 4 固定版本；可调整 `reasoning_effort` |
| `mistral/codestral-latest`       | 文本        | 128,000 | 4,096      | 编程                                                |
| `mistral/mistral-medium-2508`    | 文本、图像 | 128,000 | 8,192      | 已弃用；隐藏；请使用 Mistral Medium 3.5            |
| `mistral/devstral-medium-latest` | 文本        | 262,144 | 32,768     | 已弃用；隐藏；请使用 Mistral Medium 3.5            |

更改配置前，请查看插件目录中的对应行：

```bash
openclaw models list --all --provider mistral --plain
```

在不启动 Gateway 的情况下对模型进行烟雾测试：

```bash
openclaw infer model run --local \
  --model mistral/mistral-medium-3-5 \
  --prompt "Reply with exactly: mistral-ok" \
  --json
```

## <a id="audio-transcription-(voxtral)"></a><a id="audio-transcription-voxtral"></a> 音频转录（Voxtral）

通过媒体理解管道使用 Voxtral 进行批量音频转录：

```json5
{
  tools: {
    media: {
      models: [{ provider: "mistral", model: "voxtral-mini-latest", capabilities: ["audio"] }],
      audio: {
        enabled: true,
      },
    },
  },
}
```

<Tip>
媒体转录路径使用 `/v1/audio/transcriptions`。Mistral 的默认音频模型是 `voxtral-mini-latest`。
</Tip>

## <a id="voice-call-streaming-stt"></a> 语音通话流 STT

`mistral` 插件将 Voxtral Realtime 注册为语音通话流式 STT 提供商。

| 设置      | 配置路径                                                            | 默认值                                 |
| ------------ | ---------------------------------------------------------------------- | --------------------------------------- |
| API 密钥      | `plugins.entries.voice-call.config.streaming.providers.mistral.apiKey` | 回退到 `MISTRAL_API_KEY`         |
| 模型        | `...mistral.model`                                                     | `voxtral-mini-transcribe-realtime-2602` |
| 编码     | `...mistral.encoding`                                                  | `pcm_mulaw`                             |
| 采样率  | `...mistral.sampleRate`                                                | `8000`                                  |
| 目标延迟 | `...mistral.targetStreamingDelayMs`                                    | `800`                                   |

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
OpenClaw 默认将 Mistral 实时 STT 设置为 8 kHz 的 `pcm_mulaw`，因此语音通话可以直接转发 Twilio 媒体帧。仅当你的上游流已经是原始 PCM 时，才使用 `encoding: "pcm_s16le"` 并匹配相应的 `sampleRate`。
</Note>

## <a id="advanced-configuration"></a> 高级配置

<AccordionGroup>
  <Accordion id="adjustable-reasoning" title="可调节推理">
    `mistral/mistral-small-latest`、`mistral/mistral-small-2603` 和 `mistral/mistral-medium-3-5` 通过 `reasoning_effort` 支持 Chat Completions API 的[可调推理](https://docs.mistral.ai/studio-api/conversations/reasoning)（`none` 可最大限度减少输出中的额外思考；`high` 会在最终答案之前展示完整的思考过程）。

    思维默认为**off**。 OpenClaw 接受这些会话思维级别并将它们映射到 Mistral 的 API：

    | OpenClaw思维水平                                              | Mistral `reasoning_effort` |
    | ----------------------------------------------------------------------- | --------------------------- |
    | **off** / **最小**                                                 | `none`                      |
    | **低** / **中** / **高** / **x高** / **自适应** / **max** | `high`                       |

    <Warning>
    避免将 Medium 3.5 推理模式与 `temperature: 0` 结合使用。据报告，Mistral HTTP API 会拒绝 `reasoning_effort="high"` 和 `temperature: 0`，并返回 400 响应。保持温度未设置，或者转而思考 off/minimal，以便 OpenClaw 在设置低温之前发送 `reasoning_effort: "none"`。
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
    其他 Mistral 目录模型不使用此参数。 Mistral 的本机 Magistral 模型已弃用。在当前 API 模型的 Mistral Small 4 或 Mistral Medium 3.5 上使用可调整推理。
    </Note>

  </Accordion>

  <Accordion id="memory-embeddings" title="记忆嵌入">
    Mistral 可以通过 `/v1/embeddings` 提供记忆嵌入（默认模型：`mistral-embed`）：

    ```json5
    {
      memory: {
        search: { provider: "mistral" },
      },
    }
    ```

  </Accordion>

  <Accordion id="auth-and-base-url" title="授权和基础 URL">
    - Mistral 认证使用 `MISTRAL_API_KEY`（Bearer 头）。
    - Provider 基础 URL 默认为 `https://api.mistral.ai/v1` 并接受标准 OpenAI- 兼容聊天完成请求形状。
    - 接入引导的默认模型是 `mistral/mistral-large-latest`。
    - 只有当 Mistral 明确发布了你需要的区域端点时，才在 `models.providers.mistral.baseUrl` 下覆盖基础 URL。

  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="媒体理解" href="/nodes/media-understanding" icon="microphone">
    音频转录设置和提供方选择。
  </Card>
</CardGroup>
