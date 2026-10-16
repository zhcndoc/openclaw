---
summary: "Inworld 流式传输 OpenClaw 回复的文本到语音"
read_when:
  - "你想为外发回复使用 Inworld 语音合成"
  - "你需要来自 Inworld 的 PCM 语音通话或 OGG_OPUS 语音备注输出"
title: "Inworld"
---

Inworld 是一个流式文本转语音（TTS）提供商。在 OpenClaw 中，它会为外发回复合成音频（默认 MP3，语音备注使用 OGG_OPUS）以及用于语音通话等电话渠道的原始 PCM 音频。

OpenClaw 会向 Inworld 的流式 TTS 端点发送请求，将返回的 base64 音频分块拼接成单个缓冲区，然后把结果交给标准的回复音频流水线。

| 属性      | 值                                                           |
| ------------- | --------------------------------------------------------------- |
| 提供方 id   | `inworld`                                                       |
| 插件        | 官方外包装（`@openclaw/inworld-speech`）          |
| 契约      | `speechProviders`（仅限 TTS）                                    |
| 认证环境变量  | `INWORLD_API_KEY`（HTTP 基本、Base64 仪表板凭证）     |
| 基础 URL      | `https://api.inworld.ai`                                        |
| 默认语音 | `Sarah`                                                         |
| 默认模型 | `inworld-tts-1.5-max`                                           |
| 输出        | MP3（默认）、OGG_OPUS（语音备注）、PCM 22050 Hz（电话） |
| 网站       | [inworld.ai](https://inworld.ai)                                |
| 文档          | [docs.inworld.ai/tts/tts](https://docs.inworld.ai/tts/tts)      |

## <a id="install-plugin"></a> 安装插件

```bash
openclaw plugins install @openclaw/inworld-speech
```

安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="set-your-api-key" title="设置您的 API 密钥">
    从 Inworld 仪表板（Workspace > API Keys）复制凭据，并将其设置为环境变量。该值会按原样作为 HTTP Basic 凭据发送，因此不要再次对其进行 Base64 编码，也不要将其转换为 bearer token。

    ```bash
    INWORLD_API_KEY=<base64-credential-from-dashboard>
    ```

  </Step>
  <Step id="select-inworld-in-tts" title="在 tts 中选择 Inworld">
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
  <Step id="send-a-message" title="发送消息">
    通过任何已连接的渠道发送回复。OpenClaw 会使用 Inworld 合成音频，并将其以 MP3 形式发送（如果该渠道期望语音备注，则发送 OGG_OPUS）。
  </Step>
</Steps>

## <a id="configuration-options"></a> 配置选项

| 选项        | 路径                                | 描述                                                         |
| ------------- | ----------------------------------- | ------------------------------------------------------------------- |
| `apiKey`      | `tts.providers.inworld.apiKey`      | Base64 仪表板凭据。回落至 `INWORLD_API_KEY`。       |
| `baseUrl`     | `tts.providers.inworld.baseUrl`     | 覆盖 Inworld API 基础 URL（默认 `https://api.inworld.ai`）。   |
| `voiceId`     | `tts.providers.inworld.voiceId`     | 语音标识符（默认`Sarah`）。旧别名：`speakerVoiceId`。 |
| `modelId`     | `tts.providers.inworld.modelId`     | TTS 模型 ID（默认 `inworld-tts-1.5-max`）。                       |
| `temperature` | `tts.providers.inworld.temperature` | 采样温度，`0`（独有）至`2`（可选）。            |

## <a id="notes"></a> 说明

<AccordionGroup>
  <Accordion id="authentication" title="认证">
    Inworld 使用 HTTP Basic 身份验证，并使用单个 Base64 编码的凭据字符串。请从 Inworld 仪表板中原样复制它。该提供商会将其作为 `Authorization: Basic <apiKey>` 发送，不会进行任何进一步编码，因此不要自行对其进行 Base64 编码，也不要传入 bearer 风格的 token。有关相同提示，请参见 [TTS auth notes](/tools/tts#inworld-primary)。
  </Accordion>
  <Accordion id="models" title="模型">
    支持的模型 ids：`inworld-tts-1.5-max`（默认）、`inworld-tts-1.5-mini`、`inworld-tts-1-max`、`inworld-tts-1`。
  </Accordion>
  <Accordion id="audio-outputs" title="音频输出">
    回复默认使用 MP3。当天渠道目标是 `voice-note` 时，OpenClaw 会请求 Inworld 返回 `OGG_OPUS`，以便音频作为原生语音气泡播放。电话合成使用 22050 Hz 的原始 `PCM`，以供电话桥接使用。
  </Accordion>
  <Accordion id="custom-endpoints" title="自定义端点">
    使用 `tts.providers.inworld.baseUrl` 覆盖 API 主机。在发送请求之前，尾部斜杠将被去除。
  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="文本转语音" href="/tools/tts" icon="waveform-lines">
    TTS 概述、提供程序和 `tts` 配置。
  </Card>
  <Card title="配置" href="/gateway/configuration" icon="gear">
    完整的配置参考，包括 `tts` 设置。
  </Card>
  <Card title="供应商" href="/providers" icon="grid">
    所有受支持的 OpenClaw 提供商。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    常见问题和调试步骤。
  </Card>
</CardGroup>
