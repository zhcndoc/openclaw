---
summary: "Deepgram 用于入站语音笔记转录"
read_when:
  - 你想要对音频附件使用 Deepgram 语音转文字
  - 你想要为 Voice Call 使用 Deepgram 流式转录
  - 你需要一个快速的 Deepgram 配置示例
title: "Deepgram"
---

Deepgram 是一个语音转文本 API。OpenClaw 使用它通过 `tools.media.audio` 进行入站音频/语音笔记
转录，并通过 `plugins.entries.voice-call.config.streaming` 进行 Voice Call 流式 STT。

批量转录会将完整的音频文件上传到 Deepgram，并将转录文本注入到回复流程中
（`{{Transcript}}` + `[Audio]` 块）。
Voice Call 流式转录会通过 Deepgram 的
WebSocket `listen` 端点转发实时 G.711 u-law 帧，并在 Deepgram 返回部分/最终转录时发出它们。

| 详情          | 值                                                         |
| ------------- | ---------------------------------------------------------- |
| Docs          | [developers.deepgram.com](https://developers.deepgram.com) |
| Auth          | `DEEPGRAM_API_KEY`                                         |
| Default model | `nova-3`                                                   |

## 入门

<Steps>
  <Step title="设置你的 API 密钥">
    ```bash
    DEEPGRAM_API_KEY=dg_...
    ```
  </Step>
  <Step title="启用音频提供方">
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
  <Step title="发送语音笔记">
    通过任意已连接的渠道发送音频消息。OpenClaw 会通过
    Deepgram 转录它，并将转录文本注入回复流水线。
  </Step>
</Steps>

## 配置选项

| 选项       | 路径                            | 描述                                  |
| ---------- | ------------------------------- | ------------------------------------- |
| `model`    | `tools.media.models[].model`    | Deepgram 模型 ID（默认：`nova-3`） |
| `language` | `tools.media.models[].language` | 语言提示（可选）              |

`providerOptions.deepgram` 会将额外的查询参数直接合并到
Deepgram `/listen` 请求中，因此可以使用 Deepgram 支持的任何参数名称
（例如 `detect_language`、`punctuate`、`smart_format`）：

<Tabs>
  <Tab title="使用语言提示">
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
  <Tab title="使用 Deepgram 选项">
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

## Voice Call 流式 STT

内置的 `deepgram` 插件还会为 Voice Call 插件注册一个实时转录提供方。

| 设置            | 配置路径                                                            | 默认值                                       |
| --------------- | ------------------------------------------------------------------- | -------------------------------------------- |
| API 密钥         | `plugins.entries.voice-call.config.streaming.providers.deepgram.apiKey` | 回退到 `DEEPGRAM_API_KEY`                   |
| 基础 URL        | `...deepgram.baseUrl`                                               | `DEEPGRAM_BASE_URL` 或 Deepgram 的公共 API   |
| 模型            | `...deepgram.model`                                                 | `nova-3`                                     |
| 语言            | `...deepgram.language`                                              | （未设置）                                   |
| 编码            | `...deepgram.encoding`                                              | `mulaw`                                      |
| 采样率          | `...deepgram.sampleRate`                                           | `8000`                                       |
| 端点检测        | `...deepgram.endpointingMs`                                        | `800`                                        |
| 中间结果        | `...deepgram.interimResults`                                       | `true`                                       |

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

对于 [Deepgram 自定义端点](https://developers.deepgram.com/reference/custom-endpoints)，
将 `baseUrl` 设置为端点根地址，包括任何基础路径，但不包括 `/listen`。
实时端点接受 `http://`、`https://`、`ws://` 和 `wss://`。HTTP
会映射为 WS，HTTPS 会映射为 WSS，而显式的 WebSocket 协议保持不变。
格式错误的 URL 和其他协议会在会话设置期间失败。

<Note>
Voice Call 接收的是 8 kHz G.711 u-law 电话音频。Deepgram
流式提供方默认使用 `encoding: "mulaw"` 和 `sampleRate: 8000`，因此
Twilio 媒体帧可以直接转发。
</Note>

## 说明

<AccordionGroup>
  <Accordion title="认证">
    认证遵循标准的提供方认证顺序。`DEEPGRAM_API_KEY` 是
    最简单的方式。
  </Accordion>
  <Accordion title="代理和自定义端点">
    使用代理时，覆盖 Deepgram `tools.media.models[]` 条目中的端点或请求头。
  </Accordion>
  <Accordion title="输出行为">
    输出遵循与其他提供方相同的音频规则（大小限制、超时、
    转录注入）。
  </Accordion>
</AccordionGroup>

## 相关内容

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
  <Card title="常见问题" href="/help/faq" icon="circle-question">
    关于 OpenClaw 设置的常见问题。
  </Card>
</CardGroup>
