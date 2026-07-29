---
summary: "在 OpenClaw 中使用 Gradium 文本转语音"
read_when:
  - 你想在文本转语音中使用 Gradium
  - 你需要 Gradium API 密钥、语音或指令令牌配置
title: "Gradium"
---

[Gradium](https://gradium.ai) 是 OpenClaw 的文本转语音提供商。它可生成标准音频回复（WAV）、兼容语音备注的 Opus 输出，以及用于电话场景的 8 kHz u-law 音频。

| Property      | Value                                |
| ------------- | ------------------------------------ |
| Provider id   | `gradium`                            |
| Auth          | `GRADIUM_API_KEY` 或配置 `apiKey`    |
| Base URL      | `https://api.gradium.ai`（默认）      |
| Default voice | `Emma` (`YTpq7expH9539ERJ`)          |

## 安装插件

Gradium 是一个官方外部插件。安装它，然后重启 Gateway：

```bash
openclaw plugins install @openclaw/gradium-speech
openclaw gateway restart
```

## 设置

创建一个 Gradium API 密钥，然后通过环境变量或配置键将其暴露。配置优先于环境变量。

<Tabs>
  <Tab title="环境变量">
    ```bash
    export GRADIUM_API_KEY="gsk_..."
    ```
  </Tab>

  <Tab title="配置键">
    ```json5
    {
      tts: {
        auto: "always",
        provider: "gradium",
        providers: {
          gradium: {
            apiKey: "${GRADIUM_API_KEY}",
          },
        },
      },
    }
    ```
  </Tab>
</Tabs>

## 配置

```json5
{
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
}
```

| Key                                    | Type   | Description                                                                                             |
| -------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| `tts.providers.gradium.apiKey`         | string | Resolved API key. Supports `${ENV}` and secret refs.                                                    |
| `tts.providers.gradium.baseUrl`        | string | HTTPS Gradium API URL on `api.gradium.ai`. Trailing slashes stripped. Default `https://api.gradium.ai`. |
| `tts.providers.gradium.speakerVoiceId` | string | Default voice id used when no directive override is present.                                            |

输出格式会根据目标平台自动选择（见 [输出](#output)），并且不能在 `openclaw.json` 中配置。

## 语音

| 名称               | 语音 ID           |
| ------------------ | ------------------ |
| Arthur             | `3jUdJyOi9pgbxBTK` |
| Christina          | `2H4HY2CBNyJHBCrP` |
| Emma **(默认)** | `YTpq7expH9539ERJ` |
| John               | `KWJiFWu2O9nMPYcR` |
| Kent               | `LFZvm12tW_z0xfGo` |
| Sydney             | `jtEKaLYNn6iif5PR` |
| Tiffany            | `Eu9iL_CYe8N-Gkx_` |

### 每条消息的语音覆盖

当启用的语音策略允许语音覆盖时，使用指令标记在行内切换语音（以下任意一种都等效，都会接受提供方原生的语音 ID）：

```text
/voice:LFZvm12tW_z0xfGo
/voice_id:LFZvm12tW_z0xfGo
/voiceid:LFZvm12tW_z0xfGo
/gradium_voice:LFZvm12tW_z0xfGo
/gradiumvoice:LFZvm12tW_z0xfGo
```

如果语音策略禁用了语音覆盖，则该指令会被消费但忽略。

## 输出

输出格式由目标端选择；提供方不会合成其他格式。

| 目标           | 格式         | 文件扩展名 | 采样率      | 语音兼容标志 |
| -------------- | ------------ | -------- | ----------- | ------------- |
| 标准音频       | `wav`       | `.wav`   | 提供方      | 否                    |
| 语音笔记       | `opus`      | `.opus`  | 提供方      | 是                   |
| 电话通信       | `ulaw_8000` | n/a      | 8 kHz       | n/a                   |

## 自动选择顺序

Among configured TTS providers, Gradium's auto-select order is `30`. See [Text-to-Speech](/tools/tts) for how OpenClaw picks the active provider when `tts.provider` is not pinned.

## 相关内容

- [文本转语音](/tools/tts)
- [媒体概览](/tools/media-overview)
