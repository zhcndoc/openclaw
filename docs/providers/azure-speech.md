---
summary: "Azure AI Speech 用于 OpenClaw 回复的文本转语音"
read_when:
  - 你想要用于外发回复的 Azure Speech 合成
  - 你需要来自 Azure Speech 的原生 Ogg Opus 语音笔记输出
title: "Azure Speech"
---

Azure Speech 是一个捆绑的 Azure AI Speech 文本转语音提供商。OpenClaw 通过 SSML 直接调用 Azure Speech REST API，为标准回复合成 MP3，为语音笔记合成原生 Ogg/Opus，并为 Voice Call 等电话渠道合成 8 kHz mulaw。请求通过 `X-Microsoft-OutputFormat` 标头发送提供商拥有的输出格式。

| 详情                  | 值                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| Provider ID             | `azure-speech` (alias: `azure`)                                                                                |
| Website                 | [Azure AI Speech](https://azure.microsoft.com/products/ai-services/ai-speech)                                  |
| Docs                    | [Speech REST text-to-speech](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech) |
| Auth                    | `AZURE_SPEECH_KEY` plus `AZURE_SPEECH_REGION`                                                                  |
| Default voice           | `en-US-JennyNeural`                                                                                            |
| Default file output     | `audio-24khz-48kbitrate-mono-mp3`                                                                              |
| Default voice-note file | `ogg-24khz-16bit-mono-opus`                                                                                    |

## 开始使用

<Steps>
  <Step title="创建 Azure Speech 资源">
    在 Azure 门户中，创建一个 Speech 资源。从 Resource Management > Keys and Endpoint 中复制 **KEY 1**，并复制资源位置
    例如 `eastus`。

    ```
    AZURE_SPEECH_KEY=<speech-resource-key>
    AZURE_SPEECH_REGION=eastus
    ```

  </Step>
  <Step title="在 messages.tts 中选择 Azure Speech">
    ```json5
    {
      messages: {
        tts: {
          auto: "always",
          provider: "azure-speech",
          providers: {
            "azure-speech": {
              voice: "en-US-JennyNeural",
              lang: "en-US",
            },
          },
        },
      },
    }
    ```
  </Step>
  <Step title="发送消息">
    通过任意已连接的通道发送回复。OpenClaw 使用 Azure Speech 合成音频，
    标准音频发送 MP3，而当通道期望语音笔记时则发送 Ogg/Opus。
  </Step>
</Steps>

## 配置选项

所有选项都位于 `messages.tts.providers["azure-speech"]` 下。

| 选项                    | 描述                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| `apiKey`                | Azure Speech 资源密钥。回退到 `AZURE_SPEECH_KEY`、`AZURE_SPEECH_API_KEY` 或 `SPEECH_KEY`。      |
| `region`                | Azure Speech 资源区域。回退到 `AZURE_SPEECH_REGION` 或 `SPEECH_REGION`。                         |
| `endpoint`              | 可选的 Azure Speech endpoint 覆盖项。回退到 `AZURE_SPEECH_ENDPOINT`。                              |
| `baseUrl`               | 可选的 Azure Speech 基础 URL 覆盖项。                                                              |
| `voice`                 | Azure 语音 ShortName（默认 `en-US-JennyNeural`）。旧别名：`voiceId`。                             |
| `lang`                  | SSML 语言代码（默认 `en-US`）。                                                                    |
| `outputFormat`          | 音频文件输出格式（默认 `audio-24khz-48kbitrate-mono-mp3`）。                                       |
| `voiceNoteOutputFormat` | 语音笔记输出格式（默认 `ogg-24khz-16bit-mono-opus`）。                                            |
| `timeoutMs`             | 请求超时覆盖值，单位为毫秒。回退到全局 `messages.tts.timeoutMs`。                                  |

当 `apiKey` 已设置，并且 `region`、`endpoint` 或 `baseUrl` 中至少有一个已设置时，
该提供程序即视为已配置。环境变量仅作为未设置配置键的后备项进行检查。

## 说明

<AccordionGroup>
  <Accordion title="身份验证">
    Azure Speech 使用 Speech 资源密钥，而不是 Azure OpenAI 密钥。该密钥
    会作为 `Ocp-Apim-Subscription-Key` 发送；OpenClaw 会根据 `region`
    推导出 `https://<region>.tts.speech.microsoft.com`，除非你
    提供 `endpoint` 或 `baseUrl`。
  </Accordion>
  <Accordion title="语音名称">
    使用 Azure Speech 语音的 `ShortName` 值，例如
    `en-US-JennyNeural`。内置提供程序可以通过同一个 Speech 资源列出语音，
    并会过滤掉标记为已弃用、已退役或已禁用的语音。
  </Accordion>
  <Accordion title="音频输出">
    Azure 接受诸如 `audio-24khz-48kbitrate-mono-mp3`、
    `ogg-24khz-16bit-mono-opus` 和 `riff-24khz-16bit-mono-pcm` 等输出格式。OpenClaw
    会为 `voice-note` 目标请求 Ogg/Opus，以便通道可以发送原生语音气泡而无需额外的 MP3 转换，
    并且会为电话目标强制使用 `raw-8khz-8bit-mono-mulaw`。
  </Accordion>
  <Accordion title="别名">
    `azure` 可作为现有配置的提供程序别名被接受，但新配置应使用 `azure-speech`，
    以避免与 Azure OpenAI 模型提供程序混淆。
  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="文本转语音" href="/tools/tts" icon="waveform-lines">
    TTS 概览、提供程序以及 `messages.tts` 配置。
  </Card>
  <Card title="配置" href="/gateway/configuration" icon="gear">
    完整的配置参考，包括 `messages.tts` 设置。
  </Card>
  <Card title="提供程序" href="/providers" icon="grid">
    所有捆绑的 OpenClaw 提供程序。
  </Card>
  <Card title="故障排除" href="/help/troubleshooting" icon="wrench">
    常见问题和调试步骤。
  </Card>
</CardGroup>