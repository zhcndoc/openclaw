---
summary: "使用 ElevenLabs 语音、Scribe STT，以及与 OpenClaw 的实时转录"
read_when:
  - 你想在 OpenClaw 中使用 ElevenLabs 文本转语音
  - 你想为音频附件使用 ElevenLabs Scribe 语音转文本
  - 你想为 Voice Call 使用 ElevenLabs 实时转录
title: "ElevenLabs"
---

OpenClaw 使用 ElevenLabs 提供文本转语音、使用 Scribe v2 提供批量语音转文本，以及使用 Scribe v2 Realtime 为 Voice Call 提供流式 STT。

| 能力                     | OpenClaw 表面                                | 默认值                   |
| ------------------------ | --------------------------------------------- | ------------------------ |
| 文本转语音               | `messages.tts` / `talk`                       | `eleven_multilingual_v2` |
| 批量语音转文本           | `tools.media.audio`                           | `scribe_v2`              |
| 流式语音转文本           | Voice Call `streaming.provider: "elevenlabs"` | `scribe_v2_realtime`     |

## 身份验证

在环境中设置 `ELEVENLABS_API_KEY`。为兼容现有 ElevenLabs 工具，也接受 `XI_API_KEY`。

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

将 `modelId` 设置为 `eleven_v3` 以使用 ElevenLabs v3 TTS。OpenClaw 会将
`eleven_multilingual_v2` 保持为现有安装的默认值。

## 语音转文本

对传入的音频附件和短录制语音片段使用 Scribe v2：

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

OpenClaw 会向 ElevenLabs `/v1/speech-to-text` 发送 multipart 音频，并使用
`model_id: "scribe_v2"`。语言提示在存在时会映射到 `language_code`。

## Voice Call 流式 STT

内置的 `elevenlabs` 插件会为 Voice Call 注册 Scribe v2 Realtime 流式转录。

| 设置           | 配置路径                                                               | 默认值                                            |
| -------------- | ---------------------------------------------------------------------- | ------------------------------------------------- |
| API key        | `plugins.entries.voice-call.config.streaming.providers.elevenlabs.apiKey` | 回退到 `ELEVENLABS_API_KEY` / `XI_API_KEY` |
| Model          | `...elevenlabs.modelId`                                                | `scribe_v2_realtime`                              |
| Audio format   | `...elevenlabs.audioFormat`                                            | `ulaw_8000`                                       |
| Sample rate    | `...elevenlabs.sampleRate`                                             | `8000`                                            |
| Commit strategy | `...elevenlabs.commitStrategy`                                         | `vad`                                             |
| Language       | `...elevenlabs.languageCode`                                           | （未设置）                                         |

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
Voice Call 接收来自 Twilio 的媒体格式为 8 kHz G.711 μ-law。ElevenLabs realtime
provider 默认使用 `ulaw_8000`，因此电话帧可以在无需转码的情况下直接转发。
</Note>

## 相关内容

- [文本转语音](/tools/tts)
- [模型选择](/concepts/model-providers)
