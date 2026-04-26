---
summary: "出站回复的文本转语音（TTS）"
read_when:
  - 启用回复的文本转语音
  - 配置 TTS 提供商或限制
  - 使用 /tts 命令
title: "文本转语音"
---

OpenClaw 可以使用 ElevenLabs、Google Gemini、Gradium、Microsoft、MiniMax、OpenAI、Vydra 或 xAI 将出站回复转换为音频。
它适用于 OpenClaw 能发送音频的任何地方。

## 支持的服务

- **ElevenLabs**（主提供商或备用提供商）
- **Google Gemini**（主提供商或备用提供商；使用 Gemini API TTS）
- **Gradium**（主提供商或备用提供商；支持语音笔记和电话输出）
- **Microsoft**（主提供商或备用提供商；当前内置实现使用 `node-edge-tts`）
- **MiniMax**（主提供商或备用提供商；使用 T2A v2 API）
- **OpenAI**（主提供商或备用提供商；也用于摘要）
- **Vydra**（主提供商或备用提供商；共享图像、视频和语音提供商）
- **xAI**（主提供商或备用提供商；使用 xAI TTS API）

### Microsoft 语音说明

当前内置的 Microsoft 语音提供商通过 `node-edge-tts` 库使用 Microsoft Edge 的在线
神经 TTS 服务。这是一个托管服务（非
本地），使用 Microsoft 端点，并且不需要 API 密钥。
`node-edge-tts` 暴露了语音配置选项和输出格式，但
并非所有选项都受该服务支持。使用 `edge` 的旧版配置和指令输入
仍然有效，并会被规范化为 `microsoft`。

由于这条路径是一个没有公开 SLA 或配额的公共 Web 服务，
请将其视为尽力而为。如果你需要有保障的限制和支持，请使用 OpenAI
或 ElevenLabs。

## 可选密钥

如果你想使用 OpenAI、ElevenLabs、Google Gemini、Gradium、MiniMax、Vydra 或 xAI：

- `ELEVENLABS_API_KEY`（或 `XI_API_KEY`）
- `GEMINI_API_KEY`（或 `GOOGLE_API_KEY`）
- `GRADIUM_API_KEY`
- `MINIMAX_API_KEY`
- `OPENAI_API_KEY`
- `VYDRA_API_KEY`
- `XAI_API_KEY`

Microsoft 语音 **不** 需要 API 密钥。

如果配置了多个提供商，先使用所选提供商，其余作为备用选项。
自动摘要使用配置的 `summaryModel`（或 `agents.defaults.model.primary`），
因此如果启用摘要，该提供商也必须完成身份验证。

## 服务链接

- [OpenAI 文本转语音指南](https://platform.openai.com/docs/guides/text-to-speech)
- [OpenAI 音频 API 参考](https://platform.openai.com/docs/api-reference/audio)
- [ElevenLabs 文本转语音](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [ElevenLabs 身份验证](https://elevenlabs.io/docs/api-reference/authentication)
- [Gradium](/providers/gradium)
- [MiniMax T2A v2 API](https://platform.minimaxi.com/document/T2A%20V2)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Microsoft Speech 输出格式](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)
- [xAI 文本转语音](https://docs.x.ai/developers/rest-api-reference/inference/voice#text-to-speech-rest)

## 默认是否启用？

否。自动 TTS 默认处于 **关闭** 状态。请在配置中通过
`messages.tts.auto` 启用，或在本地使用 `/tts on` 启用。

当 `messages.tts.provider` 未设置时，OpenClaw 会选择注册表中自动选择顺序里的第一个已配置语音提供商。

## 配置

TTS 配置位于 `openclaw.json` 中的 `messages.tts` 下。
完整 schema 见 [网关配置](/gateway/configuration)。

### 最小配置（启用 + 提供商）

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

### OpenAI 为主，ElevenLabs 为备份

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
      providers: {
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
  },
}
```

### Microsoft 为主（无 API 密钥）

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "microsoft",
      providers: {
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
  },
}
```

### MiniMax 为主

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "minimax",
      providers: {
        minimax: {
          apiKey: "minimax_api_key",
          baseUrl: "https://api.minimax.io",
          model: "speech-2.8-hd",
          voiceId: "English_expressive_narrator",
          speed: 1.0,
          vol: 1.0,
          pitch: 0,
        },
      },
    },
  },
}
```

### Google Gemini 作为主提供商

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "google",
      providers: {
        google: {
          apiKey: "gemini_api_key",
          model: "gemini-3.1-flash-tts-preview",
          voiceName: "Kore",
        },
      },
    },
  },
}
```

Google Gemini TTS 使用 Gemini API key 路径。一个在 Google Cloud Console 中限制为 Gemini API 的 key 也可以在这里使用，它与捆绑的 Google 图像生成 provider 使用的是同一类 key。解析顺序为 `messages.tts.providers.google.apiKey` -> `models.providers.google.apiKey` -> `GEMINI_API_KEY` -> `GOOGLE_API_KEY`。

### xAI 主提供商

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "xai",
      providers: {
        xai: {
          apiKey: "xai_api_key",
          voiceId: "eve",
          language: "en",
          responseFormat: "mp3",
          speed: 1.0,
        },
      },
    },
  },
}
```

xAI TTS 使用与捆绑的 Grok 模型提供商相同的 `XAI_API_KEY` 路径。
解析顺序为 `messages.tts.providers.xai.apiKey` -> `XAI_API_KEY`。
当前可用的语音为 `ara`、`eve`、`leo`、`rex`、`sal` 和 `una`；`eve` 是
默认值。`language` 接受 BCP-47 标签或 `auto`。

### Gradium 主提供商

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "gradium",
      providers: {
        gradium: {
          apiKey: "gradium_api_key",
          baseUrl: "https://api.gradium.ai",
          voiceId: "YTpq7expH9539ERJ",
        },
      },
    },
  },
}
```

### 禁用 Microsoft 语音

```json5
{
  messages: {
    tts: {
      providers: {
        microsoft: {
          enabled: false,
        },
      },
    },
  },
}
```

### 自定义限制 + prefs 路径

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

### 仅在收到入站语音消息后回复音频

```json5
{
  messages: {
    tts: {
      auto: "inbound",
    },
  },
}
```

### 为长回复禁用自动摘要

```json5
{
  messages: {
    tts: {
      auto: "always",
    },
  },
}
```

然后运行：

```
/tts summary off
```

### 字段说明

- `auto`: 自动 TTS 模式（`off`、`always`、`inbound`、`tagged`）。
  - `inbound` 仅在收到入站语音消息后发送音频。
  - `tagged` 仅在回复包含 `[[tts:key=value]]` 指令或 `[[tts:text]]...[[/tts:text]]` 块时发送音频。
- `enabled`: 旧版开关（doctor 会将其迁移到 `auto`）。
- `mode`: `"final"`（默认）或 `"all"`（包括工具/块回复）。
- `provider`: 语音提供商 id，例如 `"elevenlabs"`、`"google"`、`"gradium"`、`"microsoft"`、`"minimax"`、`"openai"`、`"vydra"` 或 `"xai"`（备用项自动选择）。
- 如果 `provider` **未设置**，OpenClaw 会使用注册表自动选择顺序中的第一个已配置语音提供商。
- 旧版 `provider: "edge"` 仍然有效，并会规范化为 `microsoft`。
- `summaryModel`: 用于自动摘要的可选低成本模型；默认值为 `agents.defaults.model.primary`。
  - 接受 `provider/model` 或已配置的模型别名。
- `modelOverrides`: 允许模型发出 TTS 指令（默认开启）。
  - `allowProvider` 默认值为 `false`（切换提供商需显式启用）。
- `providers.<id>`：按语音提供商 id 键控的提供商专有设置。
- 旧版直接提供商块（`messages.tts.openai`、`messages.tts.elevenlabs`、`messages.tts.microsoft`、`messages.tts.edge`）在加载时会自动迁移到 `messages.tts.providers.<id>`。
- `maxTextLength`：TTS 输入的硬上限（字符）。超过时 `/tts audio` 会失败。
- `timeoutMs`：请求超时（ms）。
- `prefsPath`：覆盖本地 prefs JSON 路径（提供商/限制/摘要）。
- `apiKey` 值会回退到环境变量（`ELEVENLABS_API_KEY`/`XI_API_KEY`、`GEMINI_API_KEY`/`GOOGLE_API_KEY`、`GRADIUM_API_KEY`、`MINIMAX_API_KEY`、`OPENAI_API_KEY`、`VYDRA_API_KEY`、`XAI_API_KEY`）。
- `providers.elevenlabs.baseUrl`：覆盖 ElevenLabs API 基础 URL。
- `providers.openai.baseUrl`：覆盖 OpenAI TTS 端点。
  - 解析顺序：`messages.tts.providers.openai.baseUrl` -> `OPENAI_TTS_BASE_URL` -> `https://api.openai.com/v1`
  - 非默认值会被视为兼容 OpenAI 的 TTS 端点，因此会接受自定义模型和语音名称。
- `providers.elevenlabs.voiceSettings`：
  - `stability`、`similarityBoost`、`style`：`0..1`
  - `useSpeakerBoost`：`true|false`
  - `speed`：`0.5..2.0`（1.0 = 正常）
- `providers.elevenlabs.applyTextNormalization`：`auto|on|off`
- `providers.elevenlabs.languageCode`：2 字母 ISO 639-1（例如 `en`、`de`）
- `providers.elevenlabs.seed`：整数 `0..4294967295`（尽力而为的确定性）
- `providers.minimax.baseUrl`：覆盖 MiniMax API 基础 URL（默认 `https://api.minimax.io`，环境变量：`MINIMAX_API_HOST`）。
- `providers.minimax.model`：TTS 模型（默认 `speech-2.8-hd`，环境变量：`MINIMAX_TTS_MODEL`）。
- `providers.minimax.voiceId`：语音标识符（默认 `English_expressive_narrator`，环境变量：`MINIMAX_TTS_VOICE_ID`）。
- `providers.minimax.speed`：播放速度 `0.5..2.0`（默认 1.0）。
- `providers.minimax.vol`：音量 `(0, 10]`（默认 1.0；必须大于 0）。
- `providers.minimax.pitch`：音高偏移 `-12..12`（默认 0）。
- `providers.google.model`：Gemini TTS 模型（默认 `gemini-3.1-flash-tts-preview`）。
- `providers.google.voiceName`：Gemini 预置语音名称（默认 `Kore`；也接受 `voice`）。
- `providers.google.baseUrl`：覆盖 Gemini API 基础 URL。仅接受 `https://generativelanguage.googleapis.com`。
  - 如果省略 `messages.tts.providers.google.apiKey`，TTS 可以在回退到环境变量之前复用 `models.providers.google.apiKey`。
- `providers.gradium.baseUrl`：覆盖 Gradium API 基础 URL（默认 `https://api.gradium.ai`）。
- `providers.gradium.voiceId`：Gradium 语音标识符（默认 Emma，`YTpq7expH9539ERJ`）。
- `providers.xai.apiKey`：xAI TTS API 密钥（环境变量：`XAI_API_KEY`）。
- `providers.xai.baseUrl`：覆盖 xAI TTS 基础 URL（默认 `https://api.x.ai/v1`，环境变量：`XAI_BASE_URL`）。
- `providers.xai.voiceId`：xAI 语音 id（默认 `eve`；当前可用语音：`ara`、`eve`、`leo`、`rex`、`sal`、`una`）。
- `providers.xai.language`：BCP-47 语言代码或 `auto`（默认 `en`）。
- `providers.xai.responseFormat`：`mp3`、`wav`、`pcm`、`mulaw` 或 `alaw`（默认 `mp3`）。
- `providers.xai.speed`：提供商原生速度覆盖。
- `providers.microsoft.enabled`：允许使用 Microsoft 语音（默认 `true`；无需 API 密钥）。
- `providers.microsoft.voice`：Microsoft 神经语音名称（例如 `en-US-MichelleNeural`）。
- `providers.microsoft.lang`：语言代码（例如 `en-US`）。
- `providers.microsoft.outputFormat`：Microsoft 输出格式（例如 `audio-24khz-48kbitrate-mono-mp3`）。
  - 有效值请参见 Microsoft Speech 输出格式；并非所有格式都受内置的 Edge 后端传输支持。
- `providers.microsoft.rate` / `providers.microsoft.pitch` / `providers.microsoft.volume`：百分比字符串（例如 `+10%`、`-5%`）。
- `providers.microsoft.saveSubtitles`：在音频文件旁边写入 JSON 字幕。
- `providers.microsoft.proxy`：Microsoft 语音请求的代理 URL。
- `providers.microsoft.timeoutMs`：请求超时覆盖（ms）。
- `edge.*`：同一组 Microsoft 设置的旧版别名。

## 模型驱动的覆盖（默认开启）

默认情况下，模型 **可以** 为单条回复发出 TTS 指令。
当 `messages.tts.auto` 为 `tagged` 时，这些指令是触发音频所必需的。

启用后，模型可以发出 `[[tts:...]]` 指令来覆盖单条回复的音色，
还可以使用可选的 `[[tts:text]]...[[/tts:text]]` 块来
提供表达性标签（如笑声、演唱提示等），这些内容只应出现在
音频中。

除非 `modelOverrides.allowProvider: true`，否则 `provider=...` 指令会被忽略。

示例回复载荷：

```
给你。

[[tts:voiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) 再读一遍这首歌。[[/tts:text]]
```

可用的指令键（启用时）：

- `provider`（已注册的语音提供商 id，例如 `openai`、`elevenlabs`、`google`、`gradium`、`minimax`、`microsoft`、`vydra` 或 `xai`；需要 `allowProvider: true`）
- `voice`（OpenAI 或 Gradium 音色），`voiceName` / `voice_name` / `google_voice`（Google 音色），或 `voiceId`（ElevenLabs / Gradium / MiniMax / xAI）
- `model`（OpenAI TTS 模型、ElevenLabs 模型 id 或 MiniMax 模型）或 `google_model`（Google TTS 模型）
- `stability`、`similarityBoost`、`style`、`speed`、`useSpeakerBoost`
- `vol` / `volume`（MiniMax 音量，0-10）
- `pitch`（MiniMax 音高，-12 到 12）
- `applyTextNormalization`（`auto|on|off`）
- `languageCode`（ISO 639-1）
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

可选允许列表（在保持其他参数可配置的同时启用提供商切换）：

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

## 每用户偏好

斜杠命令会将本地覆盖写入 `prefsPath`（默认：
`~/.openclaw/settings/tts.json`，可通过 `OPENCLAW_TTS_PREFS` 或
`messages.tts.prefsPath` 覆盖）。

存储字段：

- `enabled`
- `provider`
- `maxLength`（摘要阈值；默认 1500 字符）
- `summarize`（默认 `true`）

这些会覆盖该主机上的 `messages.tts.*`。

## 输出格式（固定）

- **飞书 / Matrix / Telegram / WhatsApp**：Opus 语音消息（ElevenLabs 使用 `opus_48000_64`，OpenAI 使用 `opus`）。
  - 48kHz / 64kbps 是语音消息的较好折中。
- **其他频道**：MP3（ElevenLabs 使用 `mp3_44100_128`，OpenAI 使用 `mp3`）。
  - 44.1kHz / 128kbps 是语音清晰度的默认平衡。
- **MiniMax**：MP3（`speech-2.8-hd` 模型，32kHz 采样率）。原生不支持语音便笺格式；如需保证 Opus 语音消息，请使用 OpenAI 或 ElevenLabs。
- **Google Gemini**：Gemini API TTS 返回原始 24kHz PCM。OpenClaw 会将其包装为用于音频附件的 WAV，并在 Talk/电话场景中直接返回 PCM。此路径不支持原生 Opus 语音便笺格式。
- **Gradium**：音频附件使用 WAV，语音便笺目标使用 Opus，电话场景使用 8 kHz 的 `ulaw_8000`。
- **xAI**：默认使用 MP3；`responseFormat` 可以是 `mp3`、`wav`、`pcm`、`mulaw` 或 `alaw`。OpenClaw 使用 xAI 的批量 REST TTS 端点并返回完整的音频附件；此提供商路径不使用 xAI 的流式 TTS WebSocket。此路径不支持原生 Opus 语音便笺格式。
- **Microsoft**：使用 `microsoft.outputFormat`（默认 `audio-24khz-48kbitrate-mono-mp3`）。
  - 随附的传输层接受 `outputFormat`，但并非所有格式都可从服务端获得。
  - 输出格式值遵循 Microsoft Speech 输出格式（包括 Ogg/WebM Opus）。
  - Telegram `sendVoice` 接受 OGG/MP3/M4A；如果你需要
    保证 Opus 语音消息，请使用 OpenAI/ElevenLabs。
  - 如果配置的 Microsoft 输出格式失败，OpenClaw 会重试 MP3。

OpenAI/ElevenLabs 的输出格式会按频道固定（见上文）。

## Auto-TTS 行为

启用后，OpenClaw 会：

- 如果回复已包含媒体或 `MEDIA:` 指令，则跳过 TTS。
- 跳过很短的回复（< 10 个字符）。
- 在启用时使用 `agents.defaults.model.primary`（或 `summaryModel`）对较长回复进行摘要。
- 将生成的音频附加到回复中。

如果回复超过 `maxLength` 且未开启摘要（或摘要模型没有 API key），则会跳过音频，并发送普通文本回复。

## 流程图

```
回复 -> 启用 TTS？
  否  -> 发送文本
  是 -> 包含媒体 / MEDIA: / 短消息？
          是 -> 发送文本
          否  -> 长度 > 限制？
                   否  -> TTS -> 附加音频
                   是  -> 启用摘要？
                            否  -> 发送文本
                            是  -> 摘要 (summaryModel 或 agents.defaults.model.primary)
                                      -> TTS -> 附加音频
```

## Slash 命令用法

这里只有一个命令：`/tts`。
启用详情请参见 [斜杠命令](/tools/slash-commands)。

Discord 说明：`/tts` 是 Discord 的内置命令，因此 OpenClaw 在那里注册
`/voice` 作为原生命令。文本形式的 `/tts ...` 仍然可用。

```
/tts off
/tts on
/tts status
/tts provider openai
/tts limit 2000
/tts summary off
/tts audio Hello from OpenClaw
```

注意：

- 命令需要授权的发送者（允许列表/所有者规则仍然适用）。
- 必须启用 `commands.text` 或原生命令注册。
- 配置 `messages.tts.auto` 接受 `off|always|inbound|tagged`。
- `/tts on` 将本地 TTS 偏好写入 `always`；`/tts off` 将其写入 `off`。
- 当你想要 `inbound` 或 `tagged` 默认值时使用配置。
- `limit` 和 `summary` 存储在本地偏好设置中，而不是主配置中。
- `/tts audio` 生成一次性音频回复（不会切换开启 TTS）。
- `/tts status` 包含最新尝试的回退可见性：
  - 成功回退：`Fallback: <primary> -> <used>` 加上 `Attempts: ...`
  - 失败：`Error: ...` 加上 `Attempts: ...`
  - 详细诊断：`Attempt details: provider:outcome(reasonCode) latency`
- OpenAI 和 ElevenLabs API 失败现在包含解析后的提供商错误详情和请求 ID（当提供商返回时），这些信息会显示在 TTS 错误/日志中。

## Agent 工具

`tts` 工具可将文本转换为语音，并返回一个用于回复投递的音频附件。
当频道为飞书、Matrix、Telegram 或 WhatsApp 时，音频会作为语音消息投递，而不是文件附件。
它接受可选的 `channel` 和 `timeoutMs` 字段；`timeoutMs` 是
每次调用的提供商请求超时时间，单位为毫秒。

## 网关 RPC

网关方法：

- `tts.status`
- `tts.enable`
- `tts.disable`
- `tts.convert`
- `tts.setProvider`
- `tts.providers`

## 相关内容

- [媒体概览](/tools/media-overview)
- [音乐生成](/tools/music-generation)
- [视频生成](/tools/video-generation)
