---
summary: "出站回复的文本转语音（TTS）"
read_when:
  - 启用回复的文本转语音
  - 配置 TTS 提供商或限制
  - 使用 /tts 命令
title: "文本转语音"
---

# 文本转语音（TTS）

OpenClaw 可以使用 ElevenLabs、Microsoft 或 OpenAI 将出站回复转换为音频。
只要 OpenClaw 能发送音频的地方，都可以使用。

## 支持的服务

- **ElevenLabs**（主提供商或备用提供商）
- **Microsoft**（主提供商或备用提供商；当前内置实现使用 `node-edge-tts`，在没有 API 密钥时为默认值）
- **OpenAI**（主提供商或备用提供商；也用于摘要）

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

如果你想使用 OpenAI 或 ElevenLabs：

- `ELEVENLABS_API_KEY`（或 `XI_API_KEY`）
- `OPENAI_API_KEY`

Microsoft 语音 **不** 需要 API 密钥。如果未找到任何 API 密钥，
OpenClaw 会默认使用 Microsoft（除非通过
`messages.tts.microsoft.enabled=false` 或 `messages.tts.edge.enabled=false` 禁用）。

如果配置了多个提供商，先使用所选提供商，其余作为备用选项。
自动摘要使用配置的 `summaryModel`（或 `agents.defaults.model.primary`），
因此如果启用摘要，该提供商也必须完成身份验证。

## 服务链接

- [OpenAI 文本转语音指南](https://platform.openai.com/docs/guides/text-to-speech)
- [OpenAI 音频 API 参考](https://platform.openai.com/docs/api-reference/audio)
- [ElevenLabs 文本转语音](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [ElevenLabs 身份验证](https://elevenlabs.io/docs/api-reference/authentication)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Microsoft Speech 输出格式](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)

## 默认是否启用？

否。自动 TTS 默认是 **关闭** 的。通过配置中的
`messages.tts.auto` 启用，或在每个会话中使用 `/tts always`（别名：`/tts on`）。

一旦 TTS 开启，Microsoft 语音 **会** 默认启用，并且当没有 OpenAI 或 ElevenLabs API 密钥可用时会自动使用。

## 配置

TTS 配置位于 `openclaw.json` 中的 `messages.tts` 下。
完整 schema 见 [Gateway 配置](/gateway/configuration)。

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

### Microsoft 为主（无 API 密钥）

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

### 禁用 Microsoft 语音

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

- `auto`：自动 TTS 模式（`off`、`always`、`inbound`、`tagged`）。
  - `inbound` 仅在收到入站语音消息后发送音频。
  - `tagged` 仅在回复中包含 `[[tts]]` 标签时发送音频。
- `enabled`：旧版开关（doctor 会将其迁移为 `auto`）。
- `mode`：`"final"`（默认）或 `"all"`（包括工具/块回复）。
- `provider`：语音提供商 id，例如 `"elevenlabs"`、`"microsoft"` 或 `"openai"`（会自动回退）。
- 如果 `provider` **未设置**，OpenClaw 会优先选择 `openai`（如果有 key），然后是 `elevenlabs`（如果有 key），
  否则使用 `microsoft`。
- 旧版 `provider: "edge"` 仍然有效，并会被规范化为 `microsoft`。
- `summaryModel`：用于自动摘要的可选低成本模型；默认为 `agents.defaults.model.primary`。
  - 接受 `provider/model` 或已配置的模型别名。
- `modelOverrides`：允许模型发出 TTS 指令（默认开启）。
  - `allowProvider` 默认是 `false`（提供商切换需要显式启用）。
- `maxTextLength`：TTS 输入的硬上限（字符）。超过时 `/tts audio` 会失败。
- `timeoutMs`：请求超时（毫秒）。
- `prefsPath`：覆盖本地 prefs JSON 路径（提供商/限制/摘要）。
- `apiKey` 值会回退到环境变量（`ELEVENLABS_API_KEY`/`XI_API_KEY`、`OPENAI_API_KEY`）。
- `elevenlabs.baseUrl`：覆盖 ElevenLabs API 基础 URL。
- `openai.baseUrl`：覆盖 OpenAI TTS 端点。
  - 解析顺序：`messages.tts.openai.baseUrl` -> `OPENAI_TTS_BASE_URL` -> `https://api.openai.com/v1`
  - 非默认值会被视为与 OpenAI 兼容的 TTS 端点，因此可接受自定义模型和音色名称。
- `elevenlabs.voiceSettings`：
  - `stability`、`similarityBoost`、`style`：`0..1`
  - `useSpeakerBoost`：`true|false`
  - `speed`：`0.5..2.0`（1.0 = 正常）
- `elevenlabs.applyTextNormalization`：`auto|on|off`
- `elevenlabs.languageCode`：2 位 ISO 639-1 代码（例如 `en`、`de`）
- `elevenlabs.seed`：整数 `0..4294967295`（尽力而为的确定性）
- `microsoft.enabled`：允许使用 Microsoft 语音（默认 `true`；无需 API 密钥）。
- `microsoft.voice`：Microsoft 神经语音名称（例如 `en-US-MichelleNeural`）。
- `microsoft.lang`：语言代码（例如 `en-US`）。
- `microsoft.outputFormat`：Microsoft 输出格式（例如 `audio-24khz-48kbitrate-mono-mp3`）。
  - 有效值请参见 Microsoft Speech 输出格式；并非所有格式都受内置 Edge 传输支持。
- `microsoft.rate` / `microsoft.pitch` / `microsoft.volume`：百分比字符串（例如 `+10%`、`-5%`）。
- `microsoft.saveSubtitles`：将 JSON 字幕与音频文件一起写出。
- `microsoft.proxy`：Microsoft 语音请求的代理 URL。
- `microsoft.timeoutMs`：请求超时覆盖值（毫秒）。
- `edge.*`：相同 Microsoft 设置的旧版别名。

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
Here you go.

[[tts:voiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

可用的指令键（启用时）：

- `provider`（已注册的语音提供商 id，例如 `openai`、`elevenlabs` 或 `microsoft`；需要 `allowProvider: true`）
- `voice`（OpenAI 音色）或 `voiceId`（ElevenLabs）
- `model`（OpenAI TTS 模型或 ElevenLabs 模型 id）
- `stability`、`similarityBoost`、`style`、`speed`、`useSpeakerBoost`
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

- **飞书 / Matrix / Telegram / WhatsApp**：Opus 语音消息（ElevenLabs 为 `opus_48000_64`，OpenAI 为 `opus`）。
  - 48kHz / 64kbps 是语音消息的良好折中。
- **其他频道**：MP3（ElevenLabs 为 `mp3_44100_128`，OpenAI 为 `mp3`）。
  - 44.1kHz / 128kbps 是语音清晰度的默认平衡。
- **Microsoft**：使用 `microsoft.outputFormat`（默认 `audio-24khz-48kbitrate-mono-mp3`）。
  - 内置传输接受 `outputFormat`，但并非所有格式都可从服务端获得。
  - 输出格式值遵循 Microsoft Speech 输出格式（包括 Ogg/WebM Opus）。
  - Telegram 的 `sendVoice` 接受 OGG/MP3/M4A；如果你需要
    受保证的 Opus 语音消息，请使用 OpenAI/ElevenLabs。
  - 如果配置的 Microsoft 输出格式失败，OpenClaw 会重试 MP3。

OpenAI/ElevenLabs 输出格式按频道固定（见上文）。

## Auto-TTS 行为

启用后，OpenClaw 会：

- 如果回复已包含媒体或 `MEDIA:` 指令，则跳过 TTS。
- 跳过很短的回复（< 10 个字符）。
- 在启用时使用 `agents.defaults.model.primary`（或 `summaryModel`）对较长回复进行摘要。
- 将生成的音频附加到回复中。

如果回复超过 `maxLength` 且未开启摘要（或摘要模型没有 API key），则会跳过音频，并发送普通文本回复。

## 流程图

```
Reply -> TTS enabled?
  no  -> send text
  yes -> has media / MEDIA: / short?
          yes -> send text
          no  -> length > limit?
                   no  -> TTS -> attach audio
                   yes -> summary enabled?
                            no  -> send text
                            yes -> summarize (summaryModel or agents.defaults.model.primary)
                                      -> TTS -> attach audio
```

## Slash 命令用法

这里只有一个命令：`/tts`。
启用详情请参见 [Slash commands](/tools/slash-commands)。

Discord 说明：`/tts` 是 Discord 的内置命令，因此 OpenClaw 在那里注册
`/voice` 作为原生命令。文本形式的 `/tts ...` 仍然可用。

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

注意：

- 命令需要授权发送者（allowlist/owner 规则仍然适用）。
- 必须启用 `commands.text` 或原生命令注册。
- `off|always|inbound|tagged` 是按会话切换的开关（`/tts on` 是 `/tts always` 的别名）。
- `limit` 和 `summary` 存储在本地偏好设置中，不在主配置里。
- `/tts audio` 会生成一次性的音频回复（不会将 TTS 切换为开启）。

## Agent 工具

`tts` 工具将文本转换为语音，并返回一个音频附件用于
回复投递。当频道是飞书、Matrix、Telegram 或 WhatsApp 时，
音频会以语音消息而不是文件附件的形式发送。

## Gateway RPC

Gateway 方法：

- `tts.status`
- `tts.enable`
- `tts.disable`
- `tts.convert`
- `tts.setProvider`
- `tts.providers`
