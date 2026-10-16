---
summary: "OpenClaw 文本转语音文档的索引，每个读者作业一页"
title: "文本转语音"
sidebarTitle: "文本转语音（TTS）"
read_when:
  - "为回复启用文本转语音"
  - "配置 TTS 提供商、回退链或角色"
  - "使用 /tts 命令或指令"
---

OpenClaw 将出站回复转换为 Feishu、Matrix、Telegram 和 WhatsApp 上的本机语音消息。每个其他频道都会收到一个音频附件。电话和通话接收 PCM 或 Ulaw 流。

TTS 是 [Talk](/nodes/talk) 的 `stt-tts` 模式的语音输出一半（`talk.speak` 将此称为相同的合成路径）。提供商本地 `realtime` Talk 会话改为在实时提供商内部合成语音。 `transcription` 会话从不合成助理语音回复。

此页是一个索引。文本转语音记录共七页，每个读者作业一页。打开与您的任务匹配的页面。

| 页面                                                         | 读它的时候                                                                                 |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| [文本转语音快速入门](/tools/tts/quickstart)           | 您正在打开 TTS、选择提供商并通过聊天对其进行测试。                       |
| [文字转语音配置](/tools/tts/configuration)     | 您需要 `tts` 配置块、提供程序片段、本地引擎或覆盖优先级。 |
| [文本转语音角色](/tools/tts/personas)               | 您需要一种稳定的语音身份、其提供者绑定及其后备策略。         |
| [命令和指令](/tools/tts/commands)               | 您需要 `[[tts:...]]` 指令、`/tts` 命令或本地首选项所在的位置。     |
| [输出和自动TTS行为](/tools/tts/output)            | 您需要每个通道的音频格式、转码规则或 Auto-TTS 何时汇总。       |
| [文本转语音字段参考](/tools/tts/field-reference) | 您需要一个 TTS 字段的类型、默认值、环境变量或旧别名。                      |
| [代理工具和网关 RPC](/tools/tts/api)                 | 您正在从代理工具调用或网关 RPC 方法调用 TTS。                         |

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/tools/tts#per-agent-voice-overrides`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="quick-start" />[快速入门](/tools/tts/quickstart#quick-start)
- <a id="supported-providers" />[支持的提供商](/tools/tts/quickstart#supported-providers)
- <a id="configuration" />[配置](/tools/tts/configuration#configuration)
- <a id="local-speech-swift-and-speech-core" />[本地语音 Swift 和语音核心](/tools/tts/configuration#local-speech-swift-and-speech-core)
- <a id="per-agent-voice-overrides" />[每座席语音覆盖](/tools/tts/configuration#per-agent-voice-overrides)
- <a id="personas" />[人物角色](/tools/tts/personas#personas)
- <a id="minimal-persona" />[最小人物](/tools/tts/personas#minimal-persona)
- <a id="full-persona-(provider-specific-shaping)" />[完整角色（特定于提供商的塑造）](</tools/tts/personas#full-persona-(provider-specific-shaping)>）
- <a id="persona-resolution" />[人物解析](/tools/tts/personas#persona-resolution)
- <a id="custom-persona-shaping" />[自定义人物塑造](/tools/tts/personas#custom-persona-shaping)
- <a id="fallback-policy" />[后备策略](/tools/tts/personas#fallback-policy)
- <a id="model-driven-directives" />[模型驱动指令](/tools/tts/commands#model-driven-directives)
- <a id="slash-commands" />[斜线命令](/tools/tts/commands#slash-commands)
- <a id="per-user-preferences" />[每用户首选项](/tools/tts/commands#per-user-preferences)
- <a id="output-formats" />[输出格式](/tools/tts/output#output-formats)
- <a id="auto-tts-behavior" />[自动-TTS行为](/tools/tts/output#auto-tts-behavior)
- <a id="field-reference" />[现场参考](/tools/tts/field-reference#field-reference)
- <a id="inworld-primary" />[世界初级](/tools/tts/field-reference#inworld-primary)
- <a id="agent-tool" />[代理工具](/tools/tts/api#agent-tool)
- <a id="gateway-rpc" />[网关RPC](/tools/tts/api#gateway-rpc)
- <a id="full-persona-provider-specific-shaping" />[完整角色（特定于提供商的塑造）](/tools/tts/personas#full-persona-provider-specific-shaping)

## <a id="component-anchors"></a> 组件锚栓

之前的单页版本还为每个步骤、选项卡、手风琴和字段创建了一个锚点。这些锚点被保留在这里，以便任何到旧页面的深层链接仍然可以解析。当共享其 slug 的选项卡移至不同页面时，九个手风琴锚丢失了 `-1` 后缀。下面的存根保留旧的 id 并指向新的 id。

**快速入门**

- <a id="pick-a-provider" />[选择提供商](/tools/tts/quickstart#pick-a-provider)
- <a id="set-the-api-key" />[设置API密钥](/tools/tts/quickstart#set-the-api-key)
- <a id="enable-in-config" />[在配置中启用](/tools/tts/quickstart#enable-in-config)
- <a id="try-it-in-chat" />[在聊天中尝试](/tools/tts/quickstart#try-it-in-chat)

**配置**

- <a id="azure-speech" />[Azure Speech](/tools/tts/configuration#azure-speech)
- <a id="elevenlabs" />[ElevenLabs](/tools/tts/configuration#elevenlabs)
- <a id="fish-audio" />[鱼 Audio](/tools/tts/configuration#fish-audio)
- <a id="google-gemini" />[Google Gemini](/tools/tts/configuration#google-gemini)
- <a id="gradium" />[Gradium](/tools/tts/configuration#gradium)
- <a id="inworld" />[Inworld](/tools/tts/configuration#inworld)
- <a id="local-cli" />[本地 CLI](/tools/tts/configuration#local-cli)
- <a id="microsoft-no-key" />[Microsoft（无密钥）](/tools/tts/configuration#microsoft-no-key)
- <a id="minimax" />[MiniMax](/tools/tts/configuration#minimax)
- <a id="openai-%2B-elevenlabs" />[OpenAI + ElevenLabs](/tools/tts/configuration#openai-%2B-elevenlabs)
- <a id="openrouter" />[OpenRouter](/tools/tts/configuration#openrouter)
- <a id="volcengine" />[Volcengine](/tools/tts/configuration#volcengine)
- <a id="xai" />[xAI](/tools/tts/configuration#xai)
- <a id="xiaomi-mimo" />[小米 MiMo](/tools/tts/configuration#xiaomi-mimo)
- <a id="macos-http" />[macOS HTTP](/tools/tts/configuration#macos-http)
- <a id="macos-cli" />[macOS CLI](/tools/tts/configuration#macos-cli)
- <a id="linux-cli" />[Linux CLI](/tools/tts/configuration#linux-cli)
- <a id="windows-cli" />[Windows CLI](/tools/tts/configuration#windows-cli)

**现场参考**

- <a id="top-level-tts" />[顶级tts.*](/tools/tts/field-reference#top-level-tts)
- <a id="param-auto" />[顶级tts.* → `auto`](/tools/tts/field-reference#param-auto)
- <a id="param-enabled" />[顶级tts.* → `enabled`](/tools/tts/field-reference#param-enabled)
- <a id="param-mode" />[顶级tts.* → `mode`](/tools/tts/field-reference#param-mode)
- <a id="param-provider" />[顶级tts.* → `provider`](/tools/tts/field-reference#param-provider)
- <a id="param-persona" />[顶级tts.* → `persona`](/tools/tts/field-reference#param-persona)
- <a id="param-personas-id" />[顶级tts.* → `personas.<id>`](/tools/tts/field-reference#param-personas-id)
- <a id="param-summary-model" />[顶级tts.* → `summaryModel`](/tools/tts/field-reference#param-summary-model)
- <a id="param-model-overrides" />[顶级tts.* → `modelOverrides`](/tools/tts/field-reference#param-model-overrides)
- <a id="param-providers-id" />[顶级tts.* → `providers.<id>`](/tools/tts/field-reference#param-providers-id)
- <a id="param-max-text-length" />[顶级tts.* → `maxTextLength`](/tools/tts/field-reference#param-max-text-length)
- <a id="param-timeout-ms" />[顶级tts.* → `timeoutMs`](/tools/tts/field-reference#param-timeout-ms)
- <a id="azure-speech-1" />[Azure Speech](/tools/tts/field-reference#azure-speech)
- <a id="param-api-key" />[Azure 语音 → `apiKey`](/tools/tts/field-reference#param-api-key)
- <a id="param-region" />[Azure 语音 → `region`](/tools/tts/field-reference#param-region)
- <a id="param-endpoint" />[Azure 语音 → `endpoint`](/tools/tts/field-reference#param-endpoint)
- <a id="param-speaker-voice" />[Azure 语音 → `speakerVoice`](/tools/tts/field-reference#param-speaker-voice)
- <a id="param-lang" />[Azure 语音 → `lang`](/tools/tts/field-reference#param-lang)
- <a id="param-output-format" />[Azure 语音 → `outputFormat`](/tools/tts/field-reference#param-output-format)
- <a id="param-voice-note-output-format" />[Azure 语音 → `voiceNoteOutputFormat`](/tools/tts/field-reference#param-voice-note-output-format)
- <a id="elevenlabs-1" />[ElevenLabs](/tools/tts/field-reference#elevenlabs)
- <a id="param-api-key-1" />[ElevenLabs → `apiKey`](/tools/tts/field-reference#param-api-key-1)
- <a id="param-model" />[ElevenLabs → `modelId`](/tools/tts/field-reference#param-model)
- <a id="param-speaker-voice-id" />[ElevenLabs → `speakerVoiceId`](/tools/tts/field-reference#param-speaker-voice-id)
- <a id="param-voice-settings" />[ElevenLabs → `voiceSettings`](/tools/tts/field-reference#param-voice-settings)
- <a id="param-apply-text-normalization" />[ElevenLabs → `applyTextNormalization`](/tools/tts/field-reference#param-apply-text-normalization)
- <a id="param-language-code" />[ElevenLabs → `languageCode`](/tools/tts/field-reference#param-language-code)
- <a id="param-seed" />[ElevenLabs → `seed`](/tools/tts/field-reference#param-seed)
- <a id="param-base-url" />[ElevenLabs → `baseUrl`](/tools/tts/field-reference#param-base-url)
- <a id="google-gemini-1" />[Google Gemini](/tools/tts/field-reference#google-gemini)
- <a id="param-api-key-2" />[谷歌 Gemini → `apiKey`](/tools/tts/field-reference#param-api-key-2)
- <a id="param-model-1" />[谷歌 Gemini → `model`](/tools/tts/field-reference#param-model-1)
- <a id="param-speaker-voice-1" />[谷歌 Gemini → `speakerVoice`](/tools/tts/field-reference#param-speaker-voice-1)
- <a id="param-audio-profile" />[谷歌 Gemini → `audioProfile`](/tools/tts/field-reference#param-audio-profile)
- <a id="param-speaker-name" />[谷歌 Gemini → `speakerName`](/tools/tts/field-reference#param-speaker-name)
- <a id="param-prompt-template" />[谷歌 Gemini → `promptTemplate`](/tools/tts/field-reference#param-prompt-template)
- <a id="param-persona-prompt" />[谷歌 Gemini → `personaPrompt`](/tools/tts/field-reference#param-persona-prompt)
- <a id="param-base-url-1" />[谷歌 Gemini → `baseUrl`](/tools/tts/field-reference#param-base-url-1)
- <a id="gradium-1" />[Gradium](/tools/tts/field-reference#gradium)
- <a id="param-api-key-3" />[梯度 → `apiKey`](/tools/tts/field-reference#param-api-key-3)
- <a id="param-base-url-2" />[梯度 → `baseUrl`](/tools/tts/field-reference#param-base-url-2)
- <a id="param-speaker-voice-id-1" />[梯度 → `speakerVoiceId`](/tools/tts/field-reference#param-speaker-voice-id-1)
- <a id="inworld-1" />[Inworld](/tools/tts/field-reference#inworld)
- <a id="param-api-key-4" />[Inworld → `apiKey`](/tools/tts/field-reference#param-api-key-4)
- <a id="param-base-url-3" />[Inworld → `baseUrl`](/tools/tts/field-reference#param-base-url-3)
- <a id="param-model-id" />[Inworld → `modelId`](/tools/tts/field-reference#param-model-id)
- <a id="param-speaker-voice-id-2" />[Inworld → `speakerVoiceId`](/tools/tts/field-reference#param-speaker-voice-id-2)
- <a id="param-temperature" />[Inworld → `temperature`](/tools/tts/field-reference#param-temperature)
- <a id="local-cli-tts-local-cli" />[本地 CLI （tts-local-cli）](/tools/tts/field-reference#local-cli-tts-local-cli)
- <a id="param-command" />[本地 CLI （tts-local-cli） → `command`](/tools/tts/field-reference#param-command)
- <a id="param-args" />[本地 CLI （tts-local-cli） → `args`](/tools/tts/field-reference#param-args)
- <a id="param-output-format-1" />[本地 CLI （tts-local-cli） → `outputFormat`](/tools/tts/field-reference#param-output-format-1)
- <a id="param-timeout-ms-1" />[本地 CLI （tts-local-cli） → `timeoutMs`](/tools/tts/field-reference#param-timeout-ms-1)
- <a id="param-cwd" />[本地 CLI （tts-local-cli） → `cwd`](/tools/tts/field-reference#param-cwd)
- <a id="param-env" />[本地 CLI （tts-local-cli） → `env`](/tools/tts/field-reference#param-env)
- <a id="microsoft-no-api-key" />[Microsoft（无 API 密钥）](/tools/tts/field-reference#microsoft-no-api-key)
- <a id="param-enabled-1" />[Microsoft（无 API 密钥）→ `enabled`](/tools/tts/field-reference#param-enabled-1)
- <a id="param-speaker-voice-2" />[Microsoft（无 API 密钥）→ `speakerVoice`](/tools/tts/field-reference#param-speaker-voice-2)
- <a id="param-lang-1" />[Microsoft（无 API 密钥）→ `lang`](/tools/tts/field-reference#param-lang-1)
- <a id="param-output-format-2" />[Microsoft（无 API 密钥）→ `outputFormat`](/tools/tts/field-reference#param-output-format-2)
- <a id="param-rate-pitch-volume" />[Microsoft（无 API 密钥）→ `rate / pitch / volume`](/tools/tts/field-reference#param-rate-pitch-volume)
- <a id="param-save-subtitles" />[Microsoft（无 API 密钥）→ `saveSubtitles`](/tools/tts/field-reference#param-save-subtitles)
- <a id="param-proxy" />[Microsoft（无 API 密钥）→ `proxy`](/tools/tts/field-reference#param-proxy)
- <a id="param-timeout-ms-2" />[Microsoft（无 API 密钥）→ `timeoutMs`](/tools/tts/field-reference#param-timeout-ms-2)
- <a id="param-edge" />[Microsoft（无 API 密钥）→ `edge.*`](/tools/tts/field-reference#param-edge)
- <a id="minimax-1" />[MiniMax](/tools/tts/field-reference#minimax)
- <a id="param-api-key-5" />[MiniMax → `apiKey`](/tools/tts/field-reference#param-api-key-5)
- <a id="param-base-url-4" />[MiniMax → `baseUrl`](/tools/tts/field-reference#param-base-url-4)
- <a id="param-model-2" />[MiniMax → `model`](/tools/tts/field-reference#param-model-2)
- <a id="param-speaker-voice-id-3" />[MiniMax → `speakerVoiceId`](/tools/tts/field-reference#param-speaker-voice-id-3)
- <a id="param-speed" />[MiniMax → `speed`](/tools/tts/field-reference#param-speed)
- <a id="param-vol" />[MiniMax → `vol`](/tools/tts/field-reference#param-vol)
- <a id="param-pitch" />[MiniMax → `pitch`](/tools/tts/field-reference#param-pitch)
- <a id="openai" />[OpenAI](/tools/tts/field-reference#openai)
- <a id="param-api-key-6" />[OpenAI → `apiKey`](/tools/tts/field-reference#param-api-key-6)
- <a id="param-model-3" />[OpenAI → `model`](/tools/tts/field-reference#param-model-3)
- <a id="param-speaker-voice-3" />[OpenAI → `speakerVoice`](/tools/tts/field-reference#param-speaker-voice-3)
- <a id="param-instructions" />[OpenAI → `instructions`](/tools/tts/field-reference#param-instructions)
- <a id="param-response-format" />[OpenAI → `responseFormat`](/tools/tts/field-reference#param-response-format)
- <a id="param-extra-body-extra-body" />[OpenAI → `extraBody / extra_body`](/tools/tts/field-reference#param-extra-body-extra-body)
- <a id="param-base-url-5" />[OpenAI → `baseUrl`](/tools/tts/field-reference#param-base-url-5)
- <a id="openrouter-1" />[OpenRouter](/tools/tts/field-reference#openrouter)
- <a id="param-api-key-7" />[OpenRouter → `apiKey`](/tools/tts/field-reference#param-api-key-7)
- <a id="param-base-url-6" />[OpenRouter → `baseUrl`](/tools/tts/field-reference#param-base-url-6)
- <a id="param-model-4" />[OpenRouter → `model`](/tools/tts/field-reference#param-model-4)
- <a id="param-speaker-voice-4" />[OpenRouter → `speakerVoice`](/tools/tts/field-reference#param-speaker-voice-4)
- <a id="param-response-format-1" />[OpenRouter → `responseFormat`](/tools/tts/field-reference#param-response-format-1)
- <a id="param-speed-1" />[OpenRouter → `speed`](/tools/tts/field-reference#param-speed-1)
- <a id="volcengine-byteplus-seed-speech" />[Volcengine （BytePlus 种子语音）](/tools/tts/field-reference#volcengine-byteplus-seed-speech)
- <a id="param-api-key-8" />[Volcengine （BytePlus 种子语音） → `apiKey`](/tools/tts/field-reference#param-api-key-8)
- <a id="param-resource-id" />[Volcengine （BytePlus 种子语音） → `resourceId`](/tools/tts/field-reference#param-resource-id)
- <a id="param-app-key" />[Volcengine （BytePlus 种子语音） → `appKey`](/tools/tts/field-reference#param-app-key)
- <a id="param-base-url-7" />[Volcengine （BytePlus 种子语音） → `baseUrl`](/tools/tts/field-reference#param-base-url-7)
- <a id="param-speaker-voice-5" />[Volcengine （BytePlus 种子语音） → `speakerVoice`](/tools/tts/field-reference#param-speaker-voice-5)
- <a id="param-speed-ratio" />[Volcengine （BytePlus 种子语音） → `speedRatio`](/tools/tts/field-reference#param-speed-ratio)
- <a id="param-emotion" />[Volcengine （BytePlus 种子语音） → `emotion`](/tools/tts/field-reference#param-emotion)
- <a id="param-app-id-token-cluster" />[Volcengine （BytePlus 种子语音） → `appId / token / cluster`](/tools/tts/field-reference#param-app-id-token-cluster)
- <a id="xai-1" />[xAI](/tools/tts/field-reference#xai)
- <a id="param-api-key-9" />[xAI → `apiKey`](/tools/tts/field-reference#param-api-key-9)
- <a id="param-base-url-8" />[xAI → `baseUrl`](/tools/tts/field-reference#param-base-url-8)
- <a id="param-speaker-voice-id-4" />[xAI → `speakerVoiceId`](/tools/tts/field-reference#param-speaker-voice-id-4)
- <a id="param-language" />[xAI → `language`](/tools/tts/field-reference#param-language)
- <a id="param-response-format-2" />[xAI → `responseFormat`](/tools/tts/field-reference#param-response-format-2)
- <a id="param-speed-2" />[xAI → `speed`](/tools/tts/field-reference#param-speed-2)
- <a id="xiaomi-mimo-1" />[小米 MiMo](/tools/tts/field-reference#xiaomi-mimo)
- <a id="param-api-key-10" />[小米 MiMo → `apiKey`](/tools/tts/field-reference#param-api-key-10)
- <a id="param-base-url-9" />[小米 MiMo → `baseUrl`](/tools/tts/field-reference#param-base-url-9)
- <a id="param-model-5" />[小米 MiMo → `model`](/tools/tts/field-reference#param-model-5)
- <a id="param-speaker-voice-6" />[小米 MiMo → `speakerVoice`](/tools/tts/field-reference#param-speaker-voice-6)
- <a id="param-format" />[小米 MiMo → `format`](/tools/tts/field-reference#param-format)
- <a id="param-style" />[小米 MiMo → `style`](/tools/tts/field-reference#param-style)

## <a id="service-links"></a> 服务链接

- [Azure Speech 提供商](/providers/azure-speech)
- [Azure Speech REST 文本转语音](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech)
- [11个实验室提供商](/providers/elevenlabs)
- [ElevenLabs Authentication](https://elevenlabs.io/docs/api-reference/authentication)
- [ElevenLabs 文本至 Speech](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [鱼音频提供商](/providers/fish-audio)
- [Gradiium](/providers/gradium)
- [全球提供商](/providers/inworld)
- [Inworld TTS API](https://docs.inworld.ai/tts/tts)
- [Microsoft Speech 输出格式](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)
- [MiniMax 提供商](/providers/minimax)
- [MiniMax T2A v2 API](https://platform.minimaxi.com/document/T2A%20V2)
- [节点边缘-tts](https://github.com/SchneeHertz/node-edge-tts)
- [OpenAI 提供商](/providers/openai)
- [OpenAI 音频 API 参考](https://platform.openai.com/docs/api-reference/audio)
- [OpenAI 文本转语音指南](https://platform.openai.com/docs/guides/text-to-speech)
- [语音核心](https://github.com/soniqo/speech-core)
- [语音 Swift](https://github.com/soniqo/speech-swift)
- [火山引擎 TTS HTTP API](/providers/volcengine#text-to-speech)
- [xAI提供商](/providers/xai)
- [xAI 文本转语音](https://docs.x.ai/developers/rest-api-reference/inference/voice#text-to-speech-rest)
- [小米 MiMo 语音合成](/providers/xiaomi#text-to-speech)。

## <a id="related"></a> 相关内容

- [媒体概览](/tools/media-overview)
- [媒体播放](/nodes/media-playback)
- [音乐生成](/tools/music-generation)
- [视频生成](/tools/video-generation)
- [斜杠命令](/tools/slash-commands)
- [语音通话插件](/plugins/voice-call)
