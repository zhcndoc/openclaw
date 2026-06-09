---
summary: "OpenClaw 的 Inworld 流式文本转语音"
read_when:
  - 你想为外发回复使用 Inworld 语音合成
  - 你需要来自 Inworld 的 PCM 语音通话或 OGG_OPUS 语音备注输出
title: "Inworld"
---

Inworld 是一个流式文本转语音（TTS）提供商。在 OpenClaw 中，它会
为外发回复合成音频（默认 MP3，语音备注为 OGG_OPUS）
以及用于 Voice Call 等通话渠道的 PCM 音频。

OpenClaw 会向 Inworld 的流式 TTS 端点发送请求，将返回的
base64 音频分片拼接为单个缓冲区，并将结果交给标准回复音频管道。

| 属性          | 值                                                              |
| ------------- | --------------------------------------------------------------- |
| 提供商 ID      | `inworld`                                                       |
| 插件          | bundled, `enabledByDefault: true`                               |
| 合约          | `speechProviders` (仅 TTS)                                      |
| 认证环境变量    | `INWORLD_API_KEY` (HTTP Basic, Base64 仪表盘凭证)                |
| 基础 URL      | `https://api.inworld.ai`                                        |
| 默认音色       | `Sarah`                                                         |
| 默认模型       | `inworld-tts-1.5-max`                                           |
| 输出          | MP3（默认）、OGG_OPUS（语音备注）、PCM 22050 Hz（电话）         |
| 网站          | [inworld.ai](https://inworld.ai)                                |
| 文档          | [docs.inworld.ai/tts/tts](https://docs.inworld.ai/tts/tts)      |

## 开始使用

<Steps>
  <Step title="设置你的 API 密钥">
    从你的 Inworld 仪表盘（Workspace > API Keys）复制凭证
    并将其设置为环境变量。该值会按原样作为 HTTP Basic
    凭证发送，因此不要再次对其进行 Base64 编码，也不要将其转换为 bearer
    token。

    ```
    INWORLD_API_KEY=<base64-credential-from-dashboard>
    ```

  </Step>
  <Step title="在 messages.tts 中选择 Inworld">
    ```json5
    {
      messages: {
        tts: {
          auto: "always",
          provider: "inworld",
          providers: {
            inworld: {
              speakerVoiceId: "Sarah",
              modelId: "inworld-tts-1.5-max",
            },
          },
        },
      },
    }
    ```
  </Step>
  <Step title="发送消息">
    通过任意已连接的渠道发送回复。OpenClaw 会使用 Inworld 合成
    音频，并将其作为 MP3（如果渠道
    期望语音备注，则为 OGG_OPUS）交付。
  </Step>
</Steps>

## 配置选项

| Option           | Path                                            | Description                                                       |
| ---------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| `apiKey`         | `messages.tts.providers.inworld.apiKey`         | Base64 仪表盘凭证。回退到 `INWORLD_API_KEY`。     |
| `baseUrl`        | `messages.tts.providers.inworld.baseUrl`        | 覆盖 Inworld API 基础 URL（默认 `https://api.inworld.ai`）。 |
| `speakerVoiceId` | `messages.tts.providers.inworld.speakerVoiceId` | 语音标识符（默认 `Sarah`）。                               |
| `modelId`        | `messages.tts.providers.inworld.modelId`        | TTS 模型 ID（默认 `inworld-tts-1.5-max`）。                     |
| `temperature`    | `messages.tts.providers.inworld.temperature`    | 采样温度 `0..2`（可选）。                           |

## 说明

<AccordionGroup>
  <Accordion title="认证">
    Inworld 使用 HTTP Basic 认证，采用一个 Base64 编码的凭证
    字符串。从 Inworld 仪表盘中原样复制即可。该提供商会将其作为
    `Authorization: Basic <apiKey>` 发送，不会进行任何进一步编码，因此
    不要自行对其进行 Base64 编码，也不要传入 bearer 风格的令牌。
    参见 [TTS 认证说明](/tools/tts#inworld-primary) 获取同样的提示。
  </Accordion>
  <Accordion title="模型">
    支持的模型 id：`inworld-tts-1.5-max`（默认）、
    `inworld-tts-1.5-mini`、`inworld-tts-1-max`、`inworld-tts-1`。
  </Accordion>
  <Accordion title="音频输出">
    回复默认使用 MP3。当渠道目标是 `voice-note`
    时，OpenClaw 会向 Inworld 请求 `OGG_OPUS`，以便音频作为原生
    语音气泡播放。通话合成使用原始 `PCM`，采样率为 22050 Hz，
    供通话桥接使用。
  </Accordion>
  <Accordion title="自定义端点">
    使用 `messages.tts.providers.inworld.baseUrl` 覆盖 API 主机。
    发送请求前会移除末尾的斜杠。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="文本转语音" href="/tools/tts" icon="waveform-lines">
    TTS 概览、提供商，以及 `messages.tts` 配置。
  </Card>
  <Card title="配置" href="/gateway/configuration" icon="gear">
    包含 `messages.tts` 设置在内的完整配置参考。
  </Card>
  <Card title="提供商" href="/providers" icon="grid">
    所有内置的 OpenClaw 提供商。
  </Card>
  <Card title="故障排除" href="/help/troubleshooting" icon="wrench">
    常见问题和调试步骤。
  </Card>
</CardGroup>