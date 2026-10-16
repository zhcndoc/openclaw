---
summary: "Deepgram 用于入站语音笔记转录"
read_when:
  - "你想要对音频附件使用 Deepgram 语音转文字"
  - "你想要为 Voice Call 使用 Deepgram 流式转录"
  - "你需要一个快速的 Deepgram 配置示例"
title: "Deepgram"
---

Deepgram 是语音转文本 API。 OpenClaw 将其用于通过 `tools.media.audio` 的入站 audio/voice-note 转录以及通过 `plugins.entries.voice-call.config.streaming` 的语音呼叫流 STT。

批量转录将完整的音频文件上传到Deepgram。 Flux 模型使用 Deepgram 的一次性 WebSocket 代替。两条路径都将转录本注入回复管道（`{{Transcript}}` + `[Audio]` 块）。语音呼叫流通过 Deepgram 的 WebSocket `listen` 端点转发实时 G.711 u-law 帧，并在 Deepgram 返回时发出 partial/final 转录本。

| 详情        | 值                                                      |
| ------------- | ---------------------------------------------------------- |
| 文档          | [developers.deepgram.com](https://developers.deepgram.com) |
| 认证          | `DEEPGRAM_API_KEY`                                         |
| 默认模型 | `nova-3`                                                   |

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="set-your-api-key" title="设置您的 API 密钥">
    ```bash
    export DEEPGRAM_API_KEY=dg_...
    ```
  </Step>
  <Step id="enable-the-audio-provider" title="启用音频提供程序">
    ```json5
    {
      tools: {
        media: {
          models: [{ provider: "deepgram", model: "nova-3", capabilities: ["audio"] }],
          audio: {
            enabled: true,
          },
        },
      },
    }
    ```
  </Step>
  <Step id="send-a-voice-note" title="发送语音留言">
    通过任意已连接的渠道发送音频消息。OpenClaw 会通过 Deepgram 转录它，并将转录文本注入回复流水线。
  </Step>
</Steps>

## <a id="configuration-options"></a> 配置选项

| 选项     | 路径                            | 描述                           |
| ---------- | ------------------------------- | ------------------------------------- |
| `model`    | `tools.media.models[].model`    | Deepgram 模型 ID（默认：`nova-3`） |
| `language` | `tools.media.models[].language` | 语言提示（可选）              |

`providerOptions.deepgram` 将额外的查询参数直接合并到 Deepgram `/listen` 请求中，因此任何 Deepgram- 支持的参数名称都可以工作（例如 `detect_language`、`punctuate`、`smart_format`）：

<Tabs>
  <Tab id="with-language-hint" title="有语言提示">
    ```json5
    {
      tools: {
        media: {
          models: [
            { provider: "deepgram", model: "nova-3", language: "en", capabilities: ["audio"] },
          ],
          audio: {
            enabled: true,
          },
        },
      },
    }
    ```
  </Tab>
  <Tab id="with-deepgram-options" title="带 Deepgram 选项">
    ```json5
    {
      tools: {
        media: {
          models: [{ provider: "deepgram", model: "nova-3", capabilities: ["audio"] }],
          audio: {
            enabled: true,
            providerOptions: {
              deepgram: {
                detect_language: true,
                punctuate: true,
                smart_format: true,
              },
            },
          },
        },
      },
    }
    ```
  </Tab>
</Tabs>

### <a id="flux-models"></a> Flux 模型

使用 `flux-general-en` 或 `flux-general-multi` 作为 Deepgram 助焊剂。 OpenClaw 使用 `ffmpeg` 将语音注释转换为 16 kHz 单声道线性 16 音频，然后将其发送到 Deepgram 的 `/v2/listen` WebSocket 端点。在上面的入门配置中将 `tools.media.models[].model` 设置为任一 Flux 模型。

语音笔记转换可处理完整的音频文件，包括长度超过 20 分钟的笔记。解码的音频使用私有临时文件，该文件在尝试转录后将被删除。配置的输入大小和请求超时限制仍然适用；转换或上传失败不会返回部分成绩单。

Flux支持`eager_eot_threshold`、`eot_threshold`、`eot_timeout_ms`、`keyterm`、`language_hint`、`mip_opt_out`、`numerals`、`profanity_filter`、`redact`和`tag` 中的 `providerOptions.deepgram`。 OpenClaw 忽略 Flux 上的仅批处理选项，例如 `detect_language`、`punctuate` 和 `smart_format`。语言提示仅适用于 `flux-general-multi`：OpenClaw 将模型条目的 `language` 设置映射到 `language_hint`，显式提供程序选项优先。对于仅英语的 `flux-general-en` 模型，这两个设置都会被忽略。

## <a id="voice-call-streaming-stt"></a> 语音通话流 STT

内置的 `deepgram` 插件还会为 Voice Call 插件注册一个实时转录提供方。

| 设置         | 配置路径                                                             | 默认值                                      |
| --------------- | ----------------------------------------------------------------------- | -------------------------------------------- |
| API 密钥         | `plugins.entries.voice-call.config.streaming.providers.deepgram.apiKey` | 回退到 `DEEPGRAM_API_KEY`             |
| 基础 URL        | `...deepgram.baseUrl`                                                   | `DEEPGRAM_BASE_URL` 或 Deepgram 的公共 API |
| 模型           | `...deepgram.model`                                                     | `nova-3`                                     |
| 语言        | `...deepgram.language`                                                  | （未设置）                                      |
| 编码        | `...deepgram.encoding`                                                  | `mulaw`                                      |
| 采样率     | `...deepgram.sampleRate`                                                | `8000`                                       |
| 端点检测     | `...deepgram.endpointingMs`                                             | `800`                                        |
| 中间结果 | `...deepgram.interimResults`                                            | `true`                                       |

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          streaming: {
            enabled: true,
            provider: "deepgram",
            providers: {
              deepgram: {
                apiKey: "${DEEPGRAM_API_KEY}",
                model: "nova-3",
                endpointingMs: 800,
                language: "en-US",
              },
            },
          },
        },
      },
    },
  },
}
```

对于 [Deepgram 自定义端点 ](https://developers.deepgram.com/reference/custom-endpoints)，将 `baseUrl` 设置为端点根，包括任何基本路径，但不包括 `/listen`。实时端点接受 `http://`、`https://`、`ws://` 和 `wss://`。 HTTP 映射到 WS，HTTPS 映射到 WSS，显式 WebSocket 方案保持不变。格式错误的 URL 和其他方案在会话设置期间会失败。

<Note>
Voice Call 接收的是 8 kHz G.711 u-law 电话音频。Deepgram 流式提供方默认使用 `encoding: "mulaw"` 和 `sampleRate: 8000`，因此 Twilio 媒体帧可以直接转发。
</Note>

## <a id="notes"></a> 说明

<AccordionGroup>
  <Accordion id="authentication" title="认证">
    认证遵循标准的提供方认证顺序。`DEEPGRAM_API_KEY` 是最简单的方式。
  </Accordion>
  <Accordion id="proxy-and-custom-endpoints" title="代理和自定义端点">
    使用代理时，覆盖 Deepgram `tools.media.models[]` 条目中的端点或请求头。
  </Accordion>
  <Accordion id="output-behavior" title="输出行为">
    输出遵循与其他提供方相同的音频规则（大小限制、超时、 转录注入）。
  </Accordion>
  <Accordion id="flux-requires-ffmpeg" title="Flux 需要 ffmpeg">
    在选择 Flux 模型之前，使用网关主机的包管理器安装 `ffmpeg`。
  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="媒体工具" href="/tools/media-overview" icon="photo-film">
    音频、图像和视频处理流水线概览。
  </Card>
  <Card title="配置" href="/gateway/configuration" icon="gear">
    包括媒体工具设置在内的完整配置参考。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    常见问题和调试步骤。
  </Card>
  <Card title="FAQ" href="/help/faq" icon="circle-question">
    关于 OpenClaw 设置的常见问题。
  </Card>
</CardGroup>
