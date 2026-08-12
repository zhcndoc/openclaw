---
summary: "SenseAudio 批量语音转文本，用于传入语音消息"
read_when:
  - 你希望为音频附件使用 SenseAudio 语音转文本
  - 你需要 SenseAudio API 密钥环境变量或音频配置路径
title: "SenseAudio"
---

SenseAudio 通过 OpenClaw 共享的 `tools.media.audio` 流水线转写传入的音频和语音备忘录附件。OpenClaw 会将多部分音频发送到与 OpenAI 兼容的转写端点，并将返回的文本注入为 `{{Transcript}}` 以及一个 `[Audio]` 块。

| 属性          | 值                                               |
| ------------- | ------------------------------------------------ |
| 提供商 ID     | `senseaudio`                                     |
| 插件          | 内置，`enabledByDefault: true`                   |
| 契约          | `mediaUnderstandingProviders`（音频）            |
| 认证环境变量  | `SENSEAUDIO_API_KEY`                             |
| 默认模型      | `senseaudio-asr-pro-1.5-260319`                  |
| 默认 URL      | `https://api.senseaudio.cn/v1`                   |
| 网站          | [senseaudio.cn](https://senseaudio.cn)           |
| 文档          | [docs.senseaudio.cn](https://docs.senseaudio.cn) |

## 快速开始

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
  <Step title="发送语音消息">
    通过任何已连接的渠道发送音频消息。OpenClaw 会将音频上传到 SenseAudio，并在回复管道中使用转写文本。
  </Step>
</Steps>

## 选项

| 选项       | 路径                            | 描述                         |
| ---------- | ------------------------------- | ---------------------------- |
| `model`    | `tools.media.models[].model`    | SenseAudio ASR 模型 ID       |
| `language` | `tools.media.models[].language` | 可选语言提示                 |
| `prompt`   | `tools.media.models[].prompt`   | 可选转写提示                 |
| `baseUrl`  | `tools.media.models[].baseUrl`  | 覆盖 OpenAI 兼容基础 URL     |
| `headers`  | `tools.media.models[].headers`  | 额外请求标头                 |

<Note>
在 OpenClaw 中，SenseAudio 仅支持批量 STT。语音通话的实时转写仍然使用支持流式 STT 的提供方。
</Note>

## 相关

- [媒体理解（音频）](/nodes/audio)
- [模型提供商](/concepts/model-providers)
