---
summary: "SenseAudio 批量语音转文本，用于传入语音消息"
read_when:
  - 你希望为音频附件使用 SenseAudio 语音转文本
  - 你需要 SenseAudio API key 环境变量或音频配置路径
title: "SenseAudio"
---

# SenseAudio

SenseAudio 可以通过 OpenClaw 共享的 `tools.media.audio` 管道对传入的音频/语音消息附件进行转写。OpenClaw 会将 multipart 音频发送到与 OpenAI 兼容的转写端点，并将返回的文本注入为 `{{Transcript}}` 以及一个 `[Audio]` 块。

| 详情          | 值                                               |
| ------------- | ------------------------------------------------ |
| 网站          | [senseaudio.cn](https://senseaudio.cn)           |
| 文档          | [senseaudio.cn/docs](https://senseaudio.cn/docs) |
| 认证          | `SENSEAUDIO_API_KEY`                             |
| 默认模型      | `senseaudio-asr-pro-1.5-260319`                  |
| 默认 URL      | `https://api.senseaudio.cn/v1`                   |

## 入门

<Steps>
  <Step title="设置你的 API key">
    ```bash
    export SENSEAUDIO_API_KEY="..."
    ```
  </Step>
  <Step title="启用音频提供方">
    ```json5
    {
      tools: {
        media: {
          audio: {
            enabled: true,
            models: [{ provider: "senseaudio", model: "senseaudio-asr-pro-1.5-260319" }],
          },
        },
      },
    }
    ```
  </Step>
  <Step title="发送语音消息">
    通过任何已连接的渠道发送音频消息。OpenClaw 会将音频上传到 SenseAudio，并在回复管道中使用转写文本。
  </Step>
</Steps>

## 选项

| 选项       | 路径                                 | 描述                            |
| ---------- | ------------------------------------ | -------------------------------- |
| `model`    | `tools.media.audio.models[].model`    | SenseAudio ASR 模型 ID          |
| `language` | `tools.media.audio.models[].language` | 可选的语言提示                   |
| `prompt`   | `tools.media.audio.prompt`            | 可选的转写提示                   |
| `baseUrl`  | `tools.media.audio.baseUrl` 或 model  | 覆盖 OpenAI 兼容的基础地址       |
| `headers`  | `tools.media.audio.request.headers`   | 额外的请求头                    |

<Note>
在 OpenClaw 中，SenseAudio 仅支持批量 STT。语音通话的实时转写仍然使用支持流式 STT 的提供方。
</Note>
