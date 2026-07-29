---
summary: "OpenClaw 的 Inworld 流式文本转语音"
read_when:
  - 你想为外发回复使用 Inworld 语音合成
  - 你需要来自 Inworld 的 PCM 语音通话或 OGG_OPUS 语音备注输出
title: "Inworld"
---

Inworld 是一个流式文本转语音（TTS）提供商。在 OpenClaw 中，它会为外发回复合成音频（默认 MP3，语音备注使用 OGG_OPUS）以及用于语音通话等电话渠道的原始 PCM 音频。

OpenClaw 会向 Inworld 的流式 TTS 端点发送请求，将返回的 base64 音频分块拼接成单个缓冲区，然后把结果交给标准的回复音频流水线。

| 属性          | 值                                                              |
| ------------- | --------------------------------------------------------------- |
| Provider id   | `inworld`                                                       |
| Plugin        | official external package (`@openclaw/inworld-speech`)          |
| Contract      | `speechProviders` (TTS only)                                    |
| Auth env var  | `INWORLD_API_KEY` (HTTP Basic, Base64 dashboard credential)     |
| Base URL      | `https://api.inworld.ai`                                        |
| Default voice | `Sarah`                                                         |
| Default model | `inworld-tts-1.5-max`                                           |
| Output        | MP3（默认）、OGG_OPUS（语音备注）、PCM 22050 Hz（电话）         |
| Website       | [inworld.ai](https://inworld.ai)                                |
| Docs          | [docs.inworld.ai/tts/tts](https://docs.inworld.ai/tts/tts)      |

## 安装插件

```bash
openclaw plugins install @openclaw/inworld-speech
openclaw gateway restart
```

## 开始使用

<Steps>
  <Step title="Set your API key">
    从 Inworld 仪表板（Workspace > API Keys）复制凭据，并将其设置为环境变量。该值会按原样作为 HTTP Basic 凭据发送，因此不要再次对其进行 Base64 编码，也不要将其转换为 bearer token。

    ```bash
    INWORLD_API_KEY=<base64-credential-from-dashboard>
    ```

  </Step>
  <Step title="Select Inworld in tts">
    ```json5
    {
      tts: {
        auto: "always",
        provider: "inworld",
        providers: {
          inworld: {
            voiceId: "Sarah",
            modelId: "inworld-tts-1.5-max",
          },
        },
      },
    }
    ```
  </Step>
  <Step title="发送消息">
    通过任何已连接的渠道发送回复。OpenClaw 会使用 Inworld 合成音频，并将其以 MP3 形式发送（如果该渠道期望语音备注，则发送 OGG_OPUS）。
  </Step>
</Steps>

## 配置选项

| Option        | Path                                | Description                                                         |
| ------------- | ----------------------------------- | ------------------------------------------------------------------- |
| `apiKey`      | `tts.providers.inworld.apiKey`      | Base64 dashboard credential. Falls back to `INWORLD_API_KEY`.       |
| `baseUrl`     | `tts.providers.inworld.baseUrl`     | Override Inworld API base URL (default `https://api.inworld.ai`).   |
| `voiceId`     | `tts.providers.inworld.voiceId`     | Voice identifier (default `Sarah`). Legacy alias: `speakerVoiceId`. |
| `modelId`     | `tts.providers.inworld.modelId`     | TTS model id (default `inworld-tts-1.5-max`).                       |
| `temperature` | `tts.providers.inworld.temperature` | Sampling temperature, `0` (exclusive) to `2` (optional).            |

## 说明

<AccordionGroup>
  <Accordion title="Authentication">
    Inworld 使用 HTTP Basic 身份验证，并使用单个 Base64 编码的凭据字符串。请从 Inworld 仪表板中原样复制它。该提供商会将其作为 `Authorization: Basic <apiKey>` 发送，不会进行任何进一步编码，因此不要自行对其进行 Base64 编码，也不要传入 bearer 风格的 token。有关相同提示，请参见 [TTS auth notes](/tools/tts#inworld-primary)。
  </Accordion>
  <Accordion title="Models">
    支持的模型 ids：`inworld-tts-1.5-max`（默认）、`inworld-tts-1.5-mini`、`inworld-tts-1-max`、`inworld-tts-1`。
  </Accordion>
  <Accordion title="Audio outputs">
    回复默认使用 MP3。当天渠道目标是 `voice-note` 时，OpenClaw 会请求 Inworld 返回 `OGG_OPUS`，以便音频作为原生语音气泡播放。电话合成使用 22050 Hz 的原始 `PCM`，以供电话桥接使用。
  </Accordion>
  <Accordion title="Custom endpoints">
    Override the API host with `tts.providers.inworld.baseUrl`. Trailing slashes are stripped before requests are sent.
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="Text-to-speech" href="/tools/tts" icon="waveform-lines">
    TTS overview, providers, and `tts` config.
  </Card>
  <Card title="Configuration" href="/gateway/configuration" icon="gear">
    Full config reference including `tts` settings.
  </Card>
  <Card title="Providers" href="/providers" icon="grid">
    所有受支持的 OpenClaw 提供商。
  </Card>
  <Card title="故障排除" href="/help/troubleshooting" icon="wrench">
    常见问题和调试步骤。
  </Card>
</CardGroup>