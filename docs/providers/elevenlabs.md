---
summary: "在 OpenClaw 中使用 ElevenLabs 语音、Scribe STT 和实时转录"
read_when:
  - 你想在 OpenClaw 中使用 ElevenLabs 文本转语音
  - 你想为音频附件使用 ElevenLabs Scribe 语音转文本
  - 你想为 Voice Call 使用 ElevenLabs 实时转录
title: "ElevenLabs"
---

OpenClaw 使用 ElevenLabs 提供文本转语音、使用 Scribe v2 提供批量语音转文本，以及使用 Scribe v2 Realtime 为 Voice Call 提供流式 STT。

| 功能                     | OpenClaw 接口                                 | 默认值                   |
| ------------------------ | --------------------------------------------- | ------------------------ |
| 文本转语音               | `messages.tts` / `talk`                       | `eleven_multilingual_v2` |
| 批量语音转文本           | `tools.media.audio`                           | `scribe_v2`              |
| 流式语音转文本           | Voice Call `streaming.provider: "elevenlabs"` | `scribe_v2_realtime`     |

## 身份验证

在环境中设置 `ELEVENLABS_API_KEY`。为了兼容现有的 ElevenLabs 工具，也支持 `XI_API_KEY`。

```bash
export ELEVENLABS_API_KEY="..."
```

## 文本转语音

```json5
{
  messages: {
    tts: {
      providers: {
        elevenlabs: {
          apiKey: "${ELEVENLABS_API_KEY}",
          voiceId: "pMsXgVXv3BLzUgSXRplE",
          modelId: "eleven_multilingual_v2",
        },
      },
    },
  },
}
```

## 语音转文本

为传入的音频附件和简短录制的语音片段使用 Scribe v2：

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "elevenlabs", model: "scribe_v2" }],
      },
    },
  },
}
```

OpenClaw 会向 ElevenLabs 的 `/v1/speech-to-text` 发送 multipart 音频，
并使用 `model_id: "scribe_v2"`。当存在语言提示时，会映射到 `language_code`。

## Voice Call 流式 STT

内置的 `elevenlabs` 插件为 Voice Call 流式转录注册了 Scribe v2 Realtime。

| 设置            | 配置路径                                                               | 默认值                                           |
| --------------- | ------------------------------------------------------------------------- | ------------------------------------------------- |
| API 密钥       | `plugins.entries.voice-call.config.streaming.providers.elevenlabs.apiKey` | 回退到 `ELEVENLABS_API_KEY` / `XI_API_KEY`       |
| 模型           | `...elevenlabs.modelId`                                                   | `scribe_v2_realtime`                              |
| 音频格式       | `...elevenlabs.audioFormat`                                               | `ulaw_8000`                                       |
| 采样率         | `...elevenlabs.sampleRate`                                                | `8000`                                            |
| 提交策略       | `...elevenlabs.commitStrategy`                                            | `vad`                                             |
| 语言           | `...elevenlabs.languageCode`                                              | （未设置）                                        |

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          streaming: {
            enabled: true,
            provider: "elevenlabs",
            providers: {
              elevenlabs: {
                apiKey: "${ELEVENLABS_API_KEY}",
                audioFormat: "ulaw_8000",
                commitStrategy: "vad",
                languageCode: "en",
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
Voice Call 接收来自 Twilio 的媒体流，格式为 8 kHz G.711 u-law。ElevenLabs 实时提供程序默认使用 `ulaw_8000`，因此电话音频帧可以直接转发，无需转码。
</Note>

## 相关内容

- [文本转语音](/tools/tts)
- [模型选择](/concepts/model-providers)
