---
summary: "用于出站回复的文本转语音 (TTS)"
read_when:
  - Enabling text-to-speech for replies
  - Configuring TTS providers or limits
  - Using /tts commands
title: "Text-to-Speech (legacy path)"
---

# 文本转语音 (TTS)

OpenClaw can convert outbound replies into audio using ElevenLabs, Microsoft, or OpenAI.
It works anywhere OpenClaw can send audio; Telegram gets a round voice-note bubble.

## 支持的服务

- **ElevenLabs** (primary or fallback provider)
- **Microsoft** (primary or fallback provider; current bundled implementation uses `node-edge-tts`, default when no API keys)
- **OpenAI** (primary or fallback provider; also used for summaries)

### Microsoft speech notes

The bundled Microsoft speech provider currently uses Microsoft Edge's online
neural TTS service via the `node-edge-tts` library. It's a hosted service (not
local), uses Microsoft endpoints, and does not require an API key.
`node-edge-tts` exposes speech configuration options and output formats, but
not all options are supported by the service. Legacy config and directive input
using `edge` still works and is normalized to `microsoft`.

Because this path is a public web service without a published SLA or quota,
treat it as best-effort. If you need guaranteed limits and support, use OpenAI
or ElevenLabs.

## 可选密钥

如需使用 OpenAI 或 ElevenLabs：

- `ELEVENLABS_API_KEY`（或 `XI_API_KEY`）
- `OPENAI_API_KEY`

Microsoft speech does **not** require an API key. If no API keys are found,
OpenClaw defaults to Microsoft (unless disabled via
`messages.tts.microsoft.enabled=false` or `messages.tts.edge.enabled=false`).

若配置多个提供商，则优先使用选中提供商，其它作为备用。  
自动摘要使用配置的 `summaryModel`（或 `agents.defaults.model.primary`），启用摘要时，该提供商也必须已验证。

## 服务链接

- [OpenAI 文本转语音指南](https://platform.openai.com/docs/guides/text-to-speech)
- [OpenAI 音频 API 参考](https://platform.openai.com/docs/api-reference/audio)
- [ElevenLabs 文本转语音](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [ElevenLabs 认证](https://elevenlabs.io/docs/api-reference/authentication)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [微软语音输出格式](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)

## 默认是否启用？

否。自动 TTS 默认**关闭**。可在配置中启用 `messages.tts.auto`，或在会话中使用 `/tts always`（别名 `/tts on`）。

Microsoft speech **is** enabled by default once TTS is on, and is used automatically
when no OpenAI or ElevenLabs API keys are available.

## 配置

TTS 配置位于 `openclaw.json` 的 `messages.tts` 下。  
完整架构见 [网关配置](/gateway/configuration)。

### 最小配置（启用 + 选择提供商）

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "elevenlabs",
    },
  },
}
```

### OpenAI 主用，ElevenLabs 备用

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "openai",
      summaryModel: "openai/gpt-4.1-mini",
      modelOverrides: {
        enabled: true,
      },
      openai: {
        apiKey: "openai_api_key",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini-tts",
        voice: "alloy",
      },
      elevenlabs: {
        apiKey: "elevenlabs_api_key",
        baseUrl: "https://api.elevenlabs.io",
        voiceId: "voice_id",
        modelId: "eleven_multilingual_v2",
        seed: 42,
        applyTextNormalization: "auto",
        languageCode: "en",
        voiceSettings: {
          stability: 0.5,
          similarityBoost: 0.75,
          style: 0.0,
          useSpeakerBoost: true,
          speed: 1.0,
        },
      },
    },
  },
}
```

### Microsoft primary (no API key)

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "microsoft",
      microsoft: {
        enabled: true,
        voice: "en-US-MichelleNeural",
        lang: "en-US",
        outputFormat: "audio-24khz-48kbitrate-mono-mp3",
        rate: "+10%",
        pitch: "-5%",
      },
    },
  },
}
```

### Disable Microsoft speech

```json5
{
  messages: {
    tts: {
      microsoft: {
        enabled: false,
      },
    },
  },
}
```

### 自定义限制 + 偏好路径

```json5
{
  messages: {
    tts: {
      auto: "always",
      maxTextLength: 4000,
      timeoutMs: 30000,
      prefsPath: "~/.openclaw/settings/tts.json",
    },
  },
}
```

### 仅在收到语音消息后回复音频

```json5
{
  messages: {
    tts: {
      auto: "inbound",
    },
  },
}
```

### 禁用长回复自动摘要

```json5
{
  messages: {
    tts: {
      auto: "always",
    },
  },
}
```

然后执行：

```
/tts summary off
```

### 字段说明

- `auto`: auto‑TTS mode (`off`, `always`, `inbound`, `tagged`).
  - `inbound` only sends audio after an inbound voice note.
  - `tagged` only sends audio when the reply includes `[[tts]]` tags.
- `enabled`: legacy toggle (doctor migrates this to `auto`).
- `mode`: `"final"` (default) or `"all"` (includes tool/block replies).
- `provider`: speech provider id such as `"elevenlabs"`, `"microsoft"`, or `"openai"` (fallback is automatic).
- If `provider` is **unset**, OpenClaw prefers `openai` (if key), then `elevenlabs` (if key),
  otherwise `microsoft`.
- Legacy `provider: "edge"` still works and is normalized to `microsoft`.
- `summaryModel`: optional cheap model for auto-summary; defaults to `agents.defaults.model.primary`.
  - Accepts `provider/model` or a configured model alias.
- `modelOverrides`: allow the model to emit TTS directives (on by default).
  - `allowProvider` defaults to `false` (provider switching is opt-in).
- `maxTextLength`: hard cap for TTS input (chars). `/tts audio` fails if exceeded.
- `timeoutMs`: request timeout (ms).
- `prefsPath`: override the local prefs JSON path (provider/limit/summary).
- `apiKey` values fall back to env vars (`ELEVENLABS_API_KEY`/`XI_API_KEY`, `OPENAI_API_KEY`).
- `elevenlabs.baseUrl`: override ElevenLabs API base URL.
- `openai.baseUrl`: override the OpenAI TTS endpoint.
  - Resolution order: `messages.tts.openai.baseUrl` -> `OPENAI_TTS_BASE_URL` -> `https://api.openai.com/v1`
  - Non-default values are treated as OpenAI-compatible TTS endpoints, so custom model and voice names are accepted.
- `elevenlabs.voiceSettings`:
  - `stability`, `similarityBoost`, `style`: `0..1`
  - `useSpeakerBoost`: `true|false`
  - `speed`: `0.5..2.0` (1.0 = normal)
- `elevenlabs.applyTextNormalization`: `auto|on|off`
- `elevenlabs.languageCode`: 2-letter ISO 639-1 (e.g. `en`, `de`)
- `elevenlabs.seed`: integer `0..4294967295` (best-effort determinism)
- `microsoft.enabled`: allow Microsoft speech usage (default `true`; no API key).
- `microsoft.voice`: Microsoft neural voice name (e.g. `en-US-MichelleNeural`).
- `microsoft.lang`: language code (e.g. `en-US`).
- `microsoft.outputFormat`: Microsoft output format (e.g. `audio-24khz-48kbitrate-mono-mp3`).
  - See Microsoft Speech output formats for valid values; not all formats are supported by the bundled Edge-backed transport.
- `microsoft.rate` / `microsoft.pitch` / `microsoft.volume`: percent strings (e.g. `+10%`, `-5%`).
- `microsoft.saveSubtitles`: write JSON subtitles alongside the audio file.
- `microsoft.proxy`: proxy URL for Microsoft speech requests.
- `microsoft.timeoutMs`: request timeout override (ms).
- `edge.*`: legacy alias for the same Microsoft settings.

## 模型驱动覆盖（默认启用）

默认情况下，模型**可以**在单次回复中生成 TTS 指令。  
当 `messages.tts.auto` 设置为 `tagged` 时，必须使用这些指令才会触发音频。

启用时，模型可以发出 `[[tts:...]]` 指令覆盖单个回复的语音配置，并可使用选填的 `[[tts:text]]...[[/tts:text]]` 块添加仅音频中出现的表达性标签（如笑声、唱歌提示等）。

`provider=...` 指令仅在 `modelOverrides.allowProvider: true` 时生效。

示例回复内容：

```
Here you go.

[[tts:voiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

可用指令键（启用时）：

- `provider` (registered speech provider id, for example `openai`, `elevenlabs`, or `microsoft`; requires `allowProvider: true`)
- `voice` (OpenAI voice) or `voiceId` (ElevenLabs)
- `model` (OpenAI TTS model or ElevenLabs model id)
- `stability`, `similarityBoost`, `style`, `speed`, `useSpeakerBoost`
- `applyTextNormalization` (`auto|on|off`)
- `languageCode` (ISO 639-1)
- `seed`

禁用所有模型覆盖：

```json5
{
  messages: {
    tts: {
      modelOverrides: {
        enabled: false,
      },
    },
  },
}
```

启用白名单（允许切换提供商且保持其它参数可配置）：

```json5
{
  messages: {
    tts: {
      modelOverrides: {
        enabled: true,
        allowProvider: true,
        allowSeed: false,
      },
    },
  },
}
```

## 用户级偏好设置

斜杠命令写入本地覆盖文件至 `prefsPath`（默认：`~/.openclaw/settings/tts.json`，可用环境变量 `OPENCLAW_TTS_PREFS` 或 `messages.tts.prefsPath` 覆盖）。

存储字段：

- `enabled`
- `provider`
- `maxLength`（摘要阈值；默认 1500 字符）
- `summarize`（默认 `true`）

这些设置会覆盖对应主机的 `messages.tts.*` 配置。

## 输出格式（固定）

- **Telegram**: Opus voice note (`opus_48000_64` from ElevenLabs, `opus` from OpenAI).
  - 48kHz / 64kbps is a good voice-note tradeoff and required for the round bubble.
- **Other channels**: MP3 (`mp3_44100_128` from ElevenLabs, `mp3` from OpenAI).
  - 44.1kHz / 128kbps is the default balance for speech clarity.
- **Microsoft**: uses `microsoft.outputFormat` (default `audio-24khz-48kbitrate-mono-mp3`).
  - The bundled transport accepts an `outputFormat`, but not all formats are available from the service.
  - Output format values follow Microsoft Speech output formats (including Ogg/WebM Opus).
  - Telegram `sendVoice` accepts OGG/MP3/M4A; use OpenAI/ElevenLabs if you need
    guaranteed Opus voice notes. citeturn1search1
  - If the configured Microsoft output format fails, OpenClaw retries with MP3.

OpenAI 和 ElevenLabs 的格式固定；Telegram 要求 Opus 用于良好语音消息体验。

## 自动 TTS 行为

启用后，OpenClaw：

- 如果回复已有媒体或包含 `MEDIA:` 指令，则跳过 TTS。
- 跳过非常短的回复（少于 10 字符）。
- 启用时对长回复自动摘要，使用 `agents.defaults.model.primary`（或 `summaryModel`）。
- 将生成的音频附加到回复中。

如果回复超过 `maxLength` 并且未启用摘要（或无摘要模型的 API 密钥），则跳过音频，发送普通文本回复。

## 流程图

```
回复 -> 是否启用 TTS？
  否  -> 发送文本
  是  -> 是否有媒体 / MEDIA: / 回复短?
          是  -> 发送文本
          否  -> 长度 > 限制?
                   否  -> 生成 TTS -> 附加音频
                   是  -> 是否启用摘要?
                            否  -> 发送文本
                            是  -> 摘要（summaryModel 或 agents.defaults.model.primary）
                                      -> 生成 TTS -> 附加音频
```

## 斜杠命令用法

只有一个命令：`/tts`。  
启用详情见 [斜杠命令](/tools/slash-commands)。

Discord 注意事项：`/tts` 是 Discord 内置命令，故 OpenClaw 在其上注册 `/voice` 作为本地命令。  
文本 `/tts ...` 仍然有效。

```
/tts off
/tts always
/tts inbound
/tts tagged
/tts status
/tts provider openai
/tts limit 2000
/tts summary off
/tts audio Hello from OpenClaw
```

说明：

- 命令需由授权发件人执行（白名单/所有者规则依然适用）。
- 需启用 `commands.text` 或本地命令注册。
- `off|always|inbound|tagged` 是会话级开关（`/tts on` 等同于 `/tts always`）。
- `limit` 和 `summary` 存储在本地偏好中，而非主配置。
- `/tts audio` 生成一次性音频回复（不切换 TTS 状态）。

## 代理工具

The `tts` tool converts text to speech and returns an audio attachment for
reply delivery. When the result is Telegram-compatible, OpenClaw marks it for
voice-bubble delivery.

## 网关 RPC

网关方法：

- `tts.status`
- `tts.enable`
- `tts.disable`
- `tts.convert`
- `tts.setProvider`
- `tts.providers`
