---
summary: "SenseAudio 批量语音转文本，用于传入语音消息"
read_when:
  - "你希望为音频附件使用 SenseAudio 语音转文本"
  - "你需要 SenseAudio API 密钥环境变量或音频配置路径"
title: "SenseAudio"
---

SenseAudio 通过 OpenClaw 的共享 `tools.media.audio` 管道转录入站音频和语音注释附件。 OpenClaw 将多部分音频发布到 OpenAI- 兼容转录端点，并将返回的文本注入为 `{{Transcript}}` 加上 `[Audio]` 块。

| 属性      | 值                                            |
| ------------- | ------------------------------------------------ |
| 提供方 id   | `senseaudio`                                     |
| 插件        | 内置，`enabledByDefault: true`                |
| 契约      | `mediaUnderstandingProviders`（音频）            |
| 认证环境变量  | `SENSEAUDIO_API_KEY`                             |
| 默认模型 | `senseaudio-asr-pro-1.5-260319`                  |
| 默认 URL   | `https://api.senseaudio.cn/v1`                   |
| 网站       | [senseaudio.cn](https://senseaudio.cn)           |
| 文档          | [docs.senseaudio.cn](https://docs.senseaudio.cn) |

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="set-your-api-key" title="设置您的 API 密钥">
    ```bash
    export SENSEAUDIO_API_KEY="..."
    ```
  </Step>
  <Step id="enable-the-audio-provider" title="启用音频提供程序">
    ```json5
    {
      tools: {
        media: {
          models: [
            {
              provider: "senseaudio",
              model: "senseaudio-asr-pro-1.5-260319",
              capabilities: ["audio"],
            },
          ],
          audio: {
            enabled: true,
          },
        },
      },
    }
    ```
  </Step>
  <Step id="send-a-voice-note" title="发送语音留言">
    通过任何已连接的渠道发送音频消息。OpenClaw 会将音频上传到 SenseAudio，并在回复管道中使用转写文本。
  </Step>
</Steps>

## <a id="options"></a> 选项

| 选项     | 路径                            | 描述                         |
| ---------- | ------------------------------- | ----------------------------------- |
| `model`    | `tools.media.models[].model`    | SenseAudio ASR 模型             |
| `language` | `tools.media.models[].language` | 可选语言提示              |
| `prompt`   | `tools.media.models[].prompt`   | 可选转写提示       |
| `baseUrl`  | `tools.media.models[].baseUrl`  | 覆盖 OpenAI- 兼容底座 |
| `headers`  | `tools.media.models[].headers`  | 额外请求标头               |

<Note>
SenseAudio 是批次 STT 仅在 OpenClaw 中。 [Voice Call](/plugins/voice-call) 实时转录继续使用支持流媒体 STT 的提供程序。
</Note>

## <a id="related"></a> 相关内容

- [媒体理解（音频）](/nodes/audio)
- [模型提供商](/concepts/model-providers)
