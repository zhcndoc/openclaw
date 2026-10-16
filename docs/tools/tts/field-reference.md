---
summary: "每个tts.*和tts.providers.<id>.*配置字段"
title: "文本转语音字段参考"
read_when:
  - "您需要一个 TTS 字段的类型、默认值或环境变量"
  - "您正在检查旧字段别名"
  - "您正在验证提供商块"
---

## <a id="field-reference"></a> 字段参考

提供程序 `apiKey` 字段（包括 `personas.<id>.providers.<provider>.apiKey`）可以是全局、每个代理和 Discord 语音 TTS 配置中的原始字符串或 SecretRefs。在网关冷启动期间，不可用的 TTS SecretRef 标记内置 TTS 功能配置为不可用，而不是停止网关。然后，`tts.speak` 返回 `UNAVAILABLE`，原因为 `SECRET_SURFACE_UNAVAILABLE`，并且不发送提供者请求。状态和医生列出了降级的 TTS 所有者及其配置路径。显式引用保留在运行时快照中，因此环境或配置文件凭据无法静默选择不同的帐户。重新加载和配置写入预检应用所有者感知的降级策略：未更改的合格 TTS 所有者可能会将其最后已知的良好凭据保持为过时，而新的或更改的故障会变冷，而不会阻止健康的所有者。结构上无效的引用和解析值仍然会导致启动失败或拒绝更新。

<AccordionGroup>
  <Accordion id="top-level-tts" title="顶级tts.*">
    <ParamField path="auto" type='"off" | "always" | "inbound" | "tagged"'>
      自动 TTS 模式。`inbound` 仅在收到传入语音消息后发送音频；`tagged` 仅在回复包含 `[[tts:...]]` 指令或 `[[tts:text]]` 区块时发送音频。
    </ParamField>
    <ParamField path="enabled" type="boolean" deprecated>
      旧版开关。`openclaw doctor --fix` 会将其迁移为 `auto`。
    </ParamField>
    <ParamField path="mode" type='"final" | "all"' default="final">
      `"all"` 除最终回复外，还包括 tool/block 回复。
    </ParamField>
    <ParamField path="provider" type="string">
      语音提供商 ID。取消设置时，OpenClaw 使用注册表自动选择顺序中第一个配置的提供程序。旧版 `provider: "edge"` 被 `openclaw doctor --fix` 重写为 `"microsoft"`。
    </ParamField>
    <ParamField path="persona" type="string">
      来自 `personas` 的当前角色 id。会规范化为小写。
    </ParamField>
    <ParamField path="personas.<id>" 类型="对象">
      稳定的口语身份。字段：`label`、`description`、`provider`、`fallbackPolicy`、`providers.<provider>`。请参阅 [Personas](/tools/tts/personas#personas)。
    </ParamField>
    <ParamField path="summaryModel" type="string">
      用于自动摘要的便宜模型；默认值为 `agents.defaults.model.primary`。接受 `provider/model` 或已配置的模型别名。
    </ParamField>
    <ParamField path="modelOverrides" type="object">
      允许模型发出 TTS 指令。`enabled` 默认值为 `true`；`allowProvider` 默认值为 `false`。
    </ParamField>
    <ParamField path="providers.<id>" 类型="对象">
      由语音提供方 id 键控的、提供方所有的设置。旧的直接块（`tts.openai`、`.elevenlabs`、`.microsoft`、`.edge`）会被 `openclaw doctor --fix` 重写；请只提交 `tts.providers.<id>`。
    </ParamField>
    <ParamField path="maxTextLength" type="number" default="4096">
      TTS 输入字符的硬性上限。超过时 `/tts audio`、`tts.convert` 和 `tts.speak` 会失败。
    </ParamField>
    <ParamField path="timeoutMs" type="number" default="30000">
      请求超时时间，单位毫秒。若设置了单次调用的 `timeoutMs`（agent tool、gateway），则以它为准；否则，显式配置的 `tts.timeoutMs` 会优先于任何插件作者提供的默认值。
    </ParamField>
  </Accordion>
  <Accordion title="Azure Speech">
    <ParamField path="apiKey" type="string">Env：`AZURE_SPEECH_KEY`、`AZURE_SPEECH_API_KEY` 或 `SPEECH_KEY`.</ParamField>
    <ParamField path="region" type="string">Azure 语音区域 （e.g. `eastus`）。环境：`AZURE_SPEECH_REGION` 或 `SPEECH_REGION`.</ParamField>
    <ParamField path="endpoint" type="string">可选的 Azure Speech 端点覆盖（别名 `baseUrl`）。</ParamField>
    <ParamField path="speakerVoice" type="string">Azure 语音 ShortName。默认`en-US-JennyNeural`。旧别名：`voice`.</ParamField>
    <ParamField path="lang" type="string">SSML 语言代码。默认`en-US`.</ParamField>
    <ParamField path="outputFormat" type="string">Azure `X-Microsoft-OutputFormat` 适用于标准音频。默认`audio-24khz-48kbitrate-mono-mp3`.</ParamField>
    <ParamField path="voiceNoteOutputFormat" type="string">Azure `X-Microsoft-OutputFormat` 用于语音注释输出。默认`ogg-24khz-16bit-mono-opus`.</ParamField>
  </Accordion>

  <Accordion title="ElevenLabs">
    <ParamField path="apiKey" type="string">回退到 `ELEVENLABS_API_KEY` 或 `XI_API_KEY`.</ParamField>
    <ParamField id="param-model" path="modelId" type="string">模型 ID。默认`eleven_multilingual_v2`；为 v3 设置 `modelId: "eleven_v3"`。配置键 `model` 被忽略。旧 ID `eleven_turbo_v2_5`/`eleven_turbo_v2` 已标准化为匹配的 `flash` model.</ParamField>
    <ParamField path="speakerVoiceId" type="string">ElevenLabs 语音 ID。默认`pMsXgVXv3BLzUgSXRplE`。旧别名：`voiceId`.</ParamField>
    <ParamField path="voiceSettings" type="object">
      `stability`、`similarityBoost`、`style`（均为 `0..1`，默认分别为 `0.5`/`0.75`/`0`）、`useSpeakerBoost`（`true|false`，默认 `true`）、`speed`（`0.5..2.0`，默认 `1.0`）。
    </ParamField>
    <ParamField path="applyTextNormalization" type='"auto" | "on" | "off"'> 文本规范化 mode.</ParamField>
    <ParamField path="languageCode" type="string">2-字母ISO 639-1（e.g. `en`，`de`）.</ParamField>
    <ParamField path="seed" type="number"> 整数 `0..4294967295` 表示尽力而为 determinism.</ParamField>
    <ParamField path="baseUrl" type="string">覆盖 ElevenLabs API 底座 URL.</ParamField>
  </Accordion>

  <Accordion title="Google Gemini">
    <ParamField path="apiKey" type="string"> 回落至 `GEMINI_API_KEY` / `GOOGLE_API_KEY`。如果省略，TTS可以在env fallback.</ParamField>之前重用`models.providers.google.apiKey`
    <ParamField path="model" type="string">Gemini TTS 模型。默认`gemini-3.1-flash-tts-preview`。设置 `gemini-3.8-flash-tts` 或 `gemini-3.8-flash-lite-tts` 以选择加入 Gemini 3.8，OpenClaw 通过交互 API 发送。 `gemini-2.5-flash-preview-tts` 和 `gemini-2.5-pro-preview-tts` 以及 work.</ParamField>
    <ParamField path="speakerVoice" type="string">Gemini 预建语音名称。默认`Kore`。旧别名：`voiceName`、`voice`.</ParamField>
    <ParamField path="audioProfile" type="string">自然语言交付方式。 Gemini 3.8 将其发送为 `speech_metadata.style`。 Gemini 3.1 和 2.5 预览模型将其添加到口语 text.</ParamField> 之前
    <ParamField path="speakerName" type="string">可选扬声器标签。 Gemini 3.8 将其作为结构化 `speech_metadata.speaker` 标签与单个配置的语音一起发送。较旧的预览模型在口头 text.</ParamField> 之前添加 `Speaker name:`
    <ParamField path="speakers" type="array"> 正好两个 `{ speaker, voice, style? }` 条目。在 Gemini 3.8 上，以两个配置名称之一和冒号（带或不带后续空格）开头的行将成为对话轮，并且不会说出该名称；任何其他行，包括其他 `Word: text` 散文，都保留在当前回合内。没有配置标签的转录本保持单一 voice.</ParamField>
    <ParamField path="promptTemplate" type='"audio-profile-v1"'>在 Gemini 3.1 和 2.5 预览模型上，以固定提示格式包装活动角色字段。在 Gemini 3.8 上，`personaPrompt` 作为 `speech_metadata.style` 发送，并且不大声朗读；角色标签不是 sent.</ParamField>
    <ParamField path="personaPrompt" type="string">Google 特定角色方向。 Gemini 3.8 将其作为样式元数据发送。较旧的预览模型将其附加到音频配置文件模板的 Director 的 Notes.</ParamField>
    <ParamField path="baseUrl" type="string">只有`https://generativelanguage.googleapis.com`是accepted.</ParamField>
  </Accordion>

  <Accordion title="Gradium">
    <ParamField path="apiKey" type="string">Env：`GRADIUM_API_KEY`.</ParamField>
    <ParamField path="baseUrl" type="string">HTTPS Gradium API URL 上 `api.gradium.ai`。默认`https://api.gradium.ai`.</ParamField>
    <ParamField path="speakerVoiceId" type="string">默认艾玛（`YTpq7expH9539ERJ`）。旧别名：`voiceId`.</ParamField>
  </Accordion>

  <Accordion title="Inworld">
    <a id="inworld-primary" />

    <ParamField path="apiKey" type="string">Env：`INWORLD_API_KEY`.</ParamField>
    <ParamField path="baseUrl" type="string">默认`https://api.inworld.ai`.</ParamField>
    <ParamField path="modelId" type="string">默认`inworld-tts-1.5-max`。另：`inworld-tts-1.5-mini`、`inworld-tts-1-max`、`inworld-tts-1`.</ParamField>
    <ParamField path="speakerVoiceId" type="string">默认`Sarah`。旧别名：`voiceId`.</ParamField>
    <ParamField path="temperature" type="number">采样温度 `0..2`（不含 0）。</ParamField>

  </Accordion>

  <Accordion id="local-cli-tts-local-cli" title="本地 CLI （tts-local-cli）">
    <ParamField path="command" type="string"> CLI 的本地可执行文件或命令字符串 TTS.</ParamField>
    <ParamField path="args" type="string[]">命令参数。支持`{{Text}}`、`{{OutputPath}}`、`{{OutputDir}}`、`{{OutputBase}}` placeholders.</ParamField>
    <ParamField path="outputFormat" type='"mp3" | "opus" | "wav"'> 预期的 CLI 输出格式。音频默认 `mp3` attachments.</ParamField>
    <ParamField path="timeoutMs" type="number"> 命令超时（以毫秒为单位）。设置后覆盖已解析的 TTS 请求超时。省略时，遵循请求超时；插件默认为 `120000`.</ParamField>
    <ParamField path="cwd" type="string">可选命令工作 directory.</ParamField>
    <ParamField path="env" type="Record<string, string>">command.</ParamField> 的可选环境覆盖

    命令标准输出以及生成或转换后的音频限制为 50 MiB。诊断标准错误限制为 1 MiB。若任一限制被超过，OpenClaw 会终止命令并使合成失败。

  </Accordion>

  <Accordion id="microsoft-no-api-key" title="Microsoft（无 API 密钥）">
    <ParamField path="enabled" type="boolean" default="true">允许 Microsoft 讲话 usage.</ParamField>
    <ParamField path="speakerVoice" type="string">微软神经语音名称（e.g. `en-US-MichelleNeural`）。旧别名：`voice`。如果默认英文语音生效并且回复文本为 CJK-dominant，则 OpenClaw 自动切换为 `zh-CN-XiaoxiaoNeural`.</ParamField>
    <ParamField path="lang" type="string">语言代码 （e.g. `en-US`）.</ParamField>
    <ParamField path="outputFormat" type="string">Microsoft 输出格式。默认`audio-24khz-48kbitrate-mono-mp3`。捆绑的 Edge-backed transport.</ParamField> 并非支持所有格式
    <ParamField path="rate / pitch / volume" type="string"> 百分比字符串 （e.g. `+10%`、`-5%`）.</ParamField>
    <ParamField path="saveSubtitles" type="boolean"> 在音频 file.</ParamField> 旁边写入 JSON 字幕
    <ParamField path="proxy" type="string">Microsoft 语音的代理 URL requests.</ParamField>
    <ParamField path="timeoutMs" type="number">请求超时覆盖（毫秒）。</ParamField>
    <ParamField path="edge.*" type="object" deprecated>旧别名。运行 `openclaw doctor --fix` 将持久配置重写为 `providers.microsoft`.</ParamField>
  </Accordion>

  <Accordion title="MiniMax">
    <ParamField path="apiKey" type="string"> 回落至 `MINIMAX_API_KEY`。通过 `MINIMAX_OAUTH_TOKEN`、`MINIMAX_CODE_PLAN_KEY` 或 `MINIMAX_CODING_API_KEY`.</ParamField> 进行令牌计划授权
    <ParamField path="baseUrl" type="string">默认`https://api.minimax.io`。环境：`MINIMAX_API_HOST`.</ParamField>
    <ParamField path="model" type="string">默认`speech-2.8-hd`。环境：`MINIMAX_TTS_MODEL`.</ParamField>
    <ParamField path="speakerVoiceId" type="string">默认`English_expressive_narrator`。环境：`MINIMAX_TTS_VOICE_ID`。旧别名：`voiceId`.</ParamField>
    <ParamField path="speed" type="number">`0.5..2.0`。默认`1.0`.</ParamField>
    <ParamField path="vol" type="number">`(0, 10]`。默认`1.0`.</ParamField>
    <ParamField path="pitch" type="number"> 整数 `-12..12`。默认`0`。小数值在 request.</ParamField> 之前被截断
  </Accordion>

  <Accordion title="OpenAI">
    <ParamField path="apiKey" type="string">回落至`OPENAI_API_KEY`.</ParamField>
    <ParamField path="model" type="string">OpenAI TTS 模型 ID。默认`gpt-4o-mini-tts`.</ParamField>
    <ParamField path="speakerVoice" type="string">语音名称（e.g. `alloy`、`cedar`）。默认`coral`。旧别名：`voice`.</ParamField>
    <ParamField path="instructions" type="string"> 显式 OpenAI `instructions` 字段。设置后，角色提示字段为 **not** auto-mapped.</ParamField>
    <ParamField path="responseFormat" type='"mp3" | "opus" | "wav"'>显式响应格式。省略时，OpenClaw 选择 Opus 作为语音注释目标，否则选择 MP3。将 `wav` 用于不编码压缩 audio.</ParamField> 的兼容本地端点
    <ParamField path="extraBody / extra_body" type="Record<string, unknown>">生成 OpenAI TTS 字段后，额外的 JSON 字段合并到 `/audio/speech` 请求正文中。将此用于 OpenAI- 兼容端点，例如需要特定于提供者的密钥（如 `lang`）的 Kokoro；不安全的原型密钥是ignored.</ParamField>
    <ParamField path="baseUrl" type="string">
      覆盖 OpenAI TTS 端点。解析顺序：配置→`OPENAI_TTS_BASE_URL`→`https://api.openai.com/v1`。非默认值被视为 OpenAI- 兼容的 TTS 端点，因此接受自定义模型和语音名称，并且 `speed` 丢失其 `0.25..4.0` 范围检查。
    </ParamField>
  </Accordion>

  <Accordion title="OpenRouter">
    <ParamField path="apiKey" type="string">Env：`OPENROUTER_API_KEY`。可重复使用 `models.providers.openrouter.apiKey`.</ParamField>
    <ParamField path="baseUrl" type="string">默认`https://openrouter.ai/api/v1`。旧版 `https://openrouter.ai/v1` 是 normalized.</ParamField>
    <ParamField path="model" type="string">默认`hexgrad/kokoro-82m`。别名： `modelId`.</ParamField>
    <ParamField path="speakerVoice" type="string">默认`af_alloy`。旧别名：`voice`、`voiceId`.</ParamField>
    <ParamField path="responseFormat" type='"mp3" | "pcm"'>默认`mp3`.</ParamField>
    <ParamField path="speed" type="number">Provider-原生速度 override.</ParamField>
  </Accordion>

  <Accordion id="volcengine-byteplus-seed-speech" title="Volcengine（BytePlus种子演讲）">
    <ParamField path="apiKey" type="string">Env：`VOLCENGINE_TTS_API_KEY` 或 `BYTEPLUS_SEED_SPEECH_API_KEY`.</ParamField>
    <ParamField path="resourceId" type="string">默认`seed-tts-1.0`。环境：`VOLCENGINE_TTS_RESOURCE_ID`。当您的项目有 TTS 2.0 entitlement.</ParamField> 时，请使用 `seed-tts-2.0`
    <ParamField path="appKey" type="string">App 密钥标头。默认`aGjiRDfUWi`。环境：`VOLCENGINE_TTS_APP_KEY`.</ParamField>
    <ParamField path="baseUrl" type="string"> 覆盖种子语音 TTS HTTP 端点。环境：`VOLCENGINE_TTS_BASE_URL`.</ParamField>
    <ParamField path="speakerVoice" type="string">语音类型。默认`en_female_anna_mars_bigtts`。环境：`VOLCENGINE_TTS_VOICE`。旧别名：`voice`.</ParamField>
    <ParamField path="speedRatio" type="number">Provider-原生速比，`0.2..3`.</ParamField>
    <ParamField path="emotion" type="string">Provider-原生情感 tag.</ParamField>
    <ParamField path="appId / token / cluster" type="string" deprecated>旧版 Volcengine Speech Console 字段。环境变量：`VOLCENGINE_TTS_APPID`、`VOLCENGINE_TTS_TOKEN`、`VOLCENGINE_TTS_CLUSTER`（默认 `volcano_tts`）。</ParamField>
  </Accordion>

  <Accordion title="xAI">
    <ParamField path="apiKey" type="string">Env：`XAI_API_KEY`.</ParamField>
    <ParamField path="baseUrl" type="string">默认`https://api.x.ai/v1`。环境：`XAI_BASE_URL`.</ParamField>
    <ParamField path="speakerVoiceId" type="string">默认`eve`。通过auth，`openclaw infer tts voices --provider xai`获取当前内置目录；如果没有身份验证，它会列出离线后备 `ara`、`eve`、`leo`、`rex` 和 `sal`。即使帐户自定义语音 ID 不存在于内置列表中，也会被转发。旧别名：`voiceId`.</ParamField>
    <ParamField path="language" type="string">BCP-47 语言代码或 `auto`。默认`en`.</ParamField>
    <ParamField path="responseFormat" type='"mp3" | "wav" | "pcm" | "mulaw" | "alaw"'>默认`mp3`.</ParamField>
    <ParamField path="speed" type="number">Provider-本机速度覆盖，`0.7..1.5`.</ParamField>
  </Accordion>

  <Accordion title="Xiaomi MiMo">
    <ParamField path="apiKey" type="string">Env：`XIAOMI_API_KEY`.</ParamField>
    <ParamField path="baseUrl" type="string">默认`https://api.xiaomimimo.com/v1`。环境：`XIAOMI_BASE_URL`.</ParamField>
    <ParamField path="model" type="string">默认`mimo-v2.5-tts`。环境：`XIAOMI_TTS_MODEL`。还支持`mimo-v2.5-tts-voicedesign`.</ParamField>
    <ParamField path="speakerVoice" type="string"> 默认为 `mimo_default` 预设语音模型。环境：`XIAOMI_TTS_VOICE`。旧别名：`voice`。未发送 `mimo-v2.5-tts-voicedesign`.</ParamField>
    <ParamField path="format" type='"mp3" | "wav"'>默认`mp3`。环境：`XIAOMI_TTS_FORMAT`.</ParamField>
    <ParamField path="style" type="string">作为用户消息发送的可选自然语言风格指令；没有说话。对于`mimo-v2.5-tts-voicedesign`，这是语音设计提示；当 omitted.</ParamField> 时，OpenClaw 提供默认值
  </Accordion>
</AccordionGroup>
