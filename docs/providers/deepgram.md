---
summary: "Deepgram 用于来访语音笔记的转录"
read_when:
  - 您希望为音频附件使用 Deepgram 语音转文本
  - 您希望为语音通话使用 Deepgram 流式转录
  - 您需要一个快速的 Deepgram 配置示例
title: "Deepgram"
---

Deepgram 是一个语音转文本 API。在 OpenClaw 中，它通过 `tools.media.audio` 用于入站
音频/语音笔记转录，并通过 `plugins.entries.voice-call.config.streaming` 用于语音通话
流式 STT。

对于批量转录，OpenClaw 会将完整音频文件上传到 Deepgram，
并将转录文本注入回复流程（`{{Transcript}}` +
`[Audio]` 块）。对于语音通话流式处理，OpenClaw 会通过 Deepgram 的 WebSocket `listen`
端点转发实时 G.711
u-law 帧，并在 Deepgram 返回时发出部分或
最终转录结果。

| 详情          | 值                                                         |
| ------------- | ---------------------------------------------------------- |
| 网站          | [deepgram.com](https://deepgram.com)                       |
| 文档          | [developers.deepgram.com](https://developers.deepgram.com) |
| 认证          | `DEEPGRAM_API_KEY`                                         |
| 默认模型      | `nova-3`                                                   |

## 快速开始

<Steps>
  <Step title="设置 API 密钥">
    将您的 Deepgram API 密钥添加到环境变量：

    ```
    DEEPGRAM_API_KEY=dg_...
    ```

  </Step>
  <Step title="启用音频提供商">
    ```json5
    {
      tools: {
        media: {
          audio: {
            enabled: true,
            models: [{ provider: "deepgram", model: "nova-3" }],
          },
        },
      },
    }
    ```
  </Step>
  <Step title="发送语音笔记">
    通过任何已连接的渠道发送音频消息。OpenClaw 将通过 Deepgram 转录它，并将转录文本注入回复流程。
  </Step>
</Steps>

## 配置选项

| 选项            | 路径                                                         | 描述                                  |
| ----------------- | ------------------------------------------------------------ | ------------------------------------- |
| `model`           | `tools.media.audio.models[].model`                           | Deepgram 模型 id（默认：`nova-3`）    |
| `language`        | `tools.media.audio.models[].language`                        | 语言提示（可选）                      |
| `detect_language` | `tools.media.audio.providerOptions.deepgram.detect_language` | 启用语言检测（可选）                  |
| `punctuate`       | `tools.media.audio.providerOptions.deepgram.punctuate`       | 启用标点符号（可选）                  |
| `smart_format`    | `tools.media.audio.providerOptions.deepgram.smart_format`    | 启用智能格式化（可选）                |

<Tabs>
  <Tab title="带语言提示">
    ```json5
    {
      tools: {
        media: {
          audio: {
            enabled: true,
            models: [{ provider: "deepgram", model: "nova-3", language: "en" }],
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="带 Deepgram 选项">
    ```json5
    {
      tools: {
        media: {
          audio: {
            enabled: true,
            providerOptions: {
              deepgram: {
                detect_language: true,
                punctuate: true,
                smart_format: true,
              },
            },
            models: [{ provider: "deepgram", model: "nova-3" }],
          },
        },
      },
    }
    ```
  </Tab>
</Tabs>

## Voice Call streaming STT

内置的 `deepgram` 插件还会为 Voice Call 插件注册一个实时转录提供商。

| 设置            | 配置路径                                                            | 默认值                           |
| --------------- | ----------------------------------------------------------------------- | -------------------------------- |
| API key         | `plugins.entries.voice-call.config.streaming.providers.deepgram.apiKey` | 回退到 `DEEPGRAM_API_KEY`        |
| Model           | `...deepgram.model`                                                     | `nova-3`                         |
| Language        | `...deepgram.language`                                                  | （未设置）                       |
| Encoding        | `...deepgram.encoding`                                                  | `mulaw`                          |
| Sample rate     | `...deepgram.sampleRate`                                                | `8000`                           |
| Endpointing     | `...deepgram.endpointingMs`                                             | `800`                            |
| Interim results | `...deepgram.interimResults`                                            | `true`                           |

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

<Note>
Voice Call 接收的电话音频为 8 kHz G.711 u-law。Deepgram
流式提供商默认使用 `encoding: "mulaw"` 和 `sampleRate: 8000`，因此
Twilio 媒体帧可以直接转发。
</Note>

## Notes

<AccordionGroup>
  <Accordion title="认证">
    认证遵循标准的提供商认证顺序。`DEEPGRAM_API_KEY` 是最简单的路径。
  </Accordion>
  <Accordion title="代理和自定义端点">
    使用代理时，可以通过 `tools.media.audio.baseUrl` 和
    `tools.media.audio.headers` 覆盖端点或标头。
  </Accordion>
  <Accordion title="输出行为">
    输出遵循与其他提供商相同的音频规则（大小限制、超时、转录注入）。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="Media tools" href="/tools/media-overview" icon="photo-film">
    音频、图像和视频处理流水线概览。
  </Card>
  <Card title="Configuration" href="/gateway/configuration" icon="gear">
    包括媒体工具设置在内的完整配置参考。
  </Card>
  <Card title="故障排除" href="/help/troubleshooting" icon="wrench">
    常见问题和调试步骤。
  </Card>
  <Card title="常见问题" href="/help/faq" icon="circle-question">
    关于 OpenClaw 设置的常见问题。
  </Card>
</CardGroup>