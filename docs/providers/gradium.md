---
summary: "在 OpenClaw 中使用 Gradium 文本转语音"
read_when:
  - 你想在文本转语音中使用 Gradium
  - 你需要 Gradium API 密钥、语音或指令令牌配置
title: "Gradium"
---

[Gradium](https://gradium.ai) 是 OpenClaw 的一个文本转语音提供商。该插件可以渲染普通音频回复（WAV）、兼容语音笔记的 Opus 输出，以及用于电话场景的 8 kHz u-law 音频。

| Property      | Value                                |
| ------------- | ------------------------------------ |
| Provider id   | `gradium`                            |
| Auth          | `GRADIUM_API_KEY` 或配置 `apiKey`    |
| Base URL      | `https://api.gradium.ai`（默认）      |
| Default voice | `Emma` (`YTpq7expH9539ERJ`)          |

## 安装插件

安装官方插件，然后重启 Gateway：

```bash
openclaw plugins install @openclaw/gradium-speech
openclaw gateway restart
```

## 设置

创建一个 Gradium API 密钥，然后通过环境变量或配置键将其提供给 OpenClaw。

<Tabs>
  <Tab title="Env var">
    ```bash
    export GRADIUM_API_KEY="gsk_..."
    ```
  </Tab>

  <Tab title="Config key">
    ```json5
    {
      messages: {
        tts: {
          auto: "always",
          provider: "gradium",
          providers: {
            gradium: {
              apiKey: "${GRADIUM_API_KEY}",
            },
          },
        },
      },
    }
    ```
  </Tab>
</Tabs>

该插件会先检查解析后的 `apiKey`，然后回退到 `GRADIUM_API_KEY` 环境变量。

## 配置

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "gradium",
      providers: {
        gradium: {
          speakerVoiceId: "YTpq7expH9539ERJ",
          // apiKey: "${GRADIUM_API_KEY}",
          // baseUrl: "https://api.gradium.ai",
        },
      },
    },
  },
}
```

| Key                                             | Type   | Description                                                                                   |
| ----------------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| `messages.tts.providers.gradium.apiKey`         | string | 解析后的 API 密钥。支持 `${ENV}` 和 secret 引用。                                               |
| `messages.tts.providers.gradium.baseUrl`        | string | 覆盖 API 源地址。会移除末尾斜杠。默认值为 `https://api.gradium.ai`。                            |
| `messages.tts.providers.gradium.speakerVoiceId` | string | 当没有指令覆盖时使用的默认语音 ID。                                                             |

输出音频格式会由运行时根据目标场景自动选择，不能通过 `openclaw.json` 配置。参见下方的 [输出](#output)。

## 语音

| 名称      | 语音 ID            |
| --------- | ------------------ |
| Emma      | `YTpq7expH9539ERJ` |
| Kent      | `LFZvm12tW_z0xfGo` |
| Tiffany   | `Eu9iL_CYe8N-Gkx_` |
| Christina | `2H4HY2CBNyJHBCrP` |
| Sydney    | `jtEKaLYNn6iif5PR` |
| John      | `KWJiFWu2O9nMPYcR` |
| Arthur    | `3jUdJyOi9pgbxBTK` |

默认语音：Emma。

### 每条消息的语音覆盖

当当前语音策略允许语音覆盖时，你可以使用指令令牌在行内切换语音。对于提供商原生语音 ID，请使用 `speakerVoiceId`。

```text
/voice:LFZvm12tW_z0xfGo
/voice_id:LFZvm12tW_z0xfGo
/voiceid:LFZvm12tW_z0xfGo
/gradium_voice:LFZvm12tW_z0xfGo
/gradiumvoice:LFZvm12tW_z0xfGo
```

如果语音策略禁用了语音覆盖，则该指令会被消费但忽略。

## 输出

运行时会根据目标场景选择输出格式。当前提供商不会生成其他格式。

| Target         | Format      | File ext | Sample rate | Voice-compatible flag |
| -------------- | ----------- | -------- | ----------- | --------------------- |
| Standard audio | `wav`       | `.wav`   | provider    | no                    |
| Voice note     | `opus`      | `.opus`  | provider    | yes                   |
| Telephony      | `ulaw_8000` | n/a      | 8 kHz       | n/a                   |

## 自动选择顺序

在已配置的 TTS 提供商中，Gradium 的自动选择顺序为 `30`。关于当 `messages.tts.provider` 未固定时 OpenClaw 如何选择当前提供商，请参见 [文本转语音](/tools/tts)。

## 相关内容

- [文本转语音](/tools/tts)
- [媒体概览](/tools/media-overview)
