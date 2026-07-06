---
summary: "使用 ElevenLabs 语音、Scribe STT 和 OpenClaw 实时转录"
read_when:
  - 你想在 OpenClaw 中使用 ElevenLabs 文本转语音
  - 你想将 ElevenLabs Scribe 语音转文本用于音频附件
  - 你想将 ElevenLabs 实时转录用于 Voice Call 或 Google Meet
title: "ElevenLabs"
---

OpenClaw 使用 ElevenLabs 提供文本转语音、使用 Scribe v2 进行批量语音转文本，并使用 Scribe v2 Realtime 进行流式 STT。该插件已打包并默认启用；无需执行 `plugins install` 步骤。

| 功能                     | OpenClaw 接口                                                      | 默认值                   |
| ------------------------ | ------------------------------------------------------------------ | ------------------------ |
| 文本转语音               | `messages.tts` / `talk`                                            | `eleven_multilingual_v2` |
| 批量语音转文本           | `tools.media.audio`                                                | `scribe_v2`              |
| 流式语音转文本           | Voice Call 流式或 Google Meet `realtime.transcriptionProvider`    | `scribe_v2_realtime`     |

## 认证

在你的环境中设置 `ELEVENLABS_API_KEY`。为兼容现有的 ElevenLabs 工具，也接受 `XI_API_KEY`。

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

将 `modelId` 设置为 `eleven_v3` 可使用 ElevenLabs v3 TTS。OpenClaw 会为现有安装保留
`eleven_multilingual_v2` 作为默认值。

当 ElevenLabs 是选定的 `voice.tts`/`messages.tts` 提供方时，Discord 语音频道会使用 ElevenLabs 的流式 TTS 端点：播放会从
返回的音频流开始，而不是等待 OpenClaw 先下载完整的
音频文件。`latencyTier` 会映射到 ElevenLabs 的 `optimize_streaming_latency`
查询参数，适用于接受该参数的模型；OpenClaw 对
`eleven_v3` 会省略该参数，因为它会拒绝该参数。

## 语音转文本

对传入的音频附件和简短的录音语音片段使用 Scribe v2：

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

OpenClaw 将多部分音频发送到 ElevenLabs 的 `/v1/speech-to-text`，并使用
`model_id: "scribe_v2"`。当存在语言提示时，会映射到 `language_code`。

## 流式 STT

捆绑的 `elevenlabs` 插件会为 Voice Call 和 Google Meet 代理模式注册 Scribe v2 实时流式转写。

| 设置           | 配置路径                                                               | 默认值                                    |
| -------------- | --------------------------------------------------------------------------- | ------------------------------------------ |
| API key        | `plugins.entries.voice-call.config.streaming.providers.elevenlabs.apiKey` | 回退到 `ELEVENLABS_API_KEY` / `XI_API_KEY` |
| Model          | `...elevenlabs.modelId`                                                | `scribe_v2_realtime`                       |
| Audio format   | `...elevenlabs.audioFormat`                                            | `ulaw_8000`                                |
| Sample rate    | `...elevenlabs.sampleRate`                                             | `8000`                                     |
| Commit strategy | `...elevenlabs.commitStrategy`                                         | `vad`                                      |
| Language       | `...elevenlabs.languageCode`                                           | （未设置）                                 |

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
Voice Call 接收来自 Twilio 的 8 kHz G.711 μ-law 格式媒体。ElevenLabs 实时
提供程序默认使用 `ulaw_8000`，因此电话帧可以直接转发，无需转码。
</Note>

对于 Google Meet 代理模式，将
`plugins.entries.google-meet.config.realtime.transcriptionProvider` 设置为
`"elevenlabs"`，并在
`plugins.entries.google-meet.config.realtime.providers.elevenlabs` 下配置相同的 provider 块。

## 相关

- [文本转语音](/tools/tts)
- [Google Meet](/plugins/google-meet)
- [模型选择](/concepts/model-providers)
