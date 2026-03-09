---
summary: "用于出站回复的文本转语音 (TTS)"
read_when:
  - 启用文本转语音回复
  - 配置 TTS 提供商或限制
  - 使用 /tts 命令
title: "文本转语音"
---

# 文本转语音 (TTS)

OpenClaw 可以通过 ElevenLabs、OpenAI 或 Edge TTS 将出站回复转换为音频。  
它适用于 OpenClaw 能发送音频的任何地方；Telegram 则显示为圆形语音消息气泡。

## 支持的服务

- **ElevenLabs**（主用或备用提供商）
- **OpenAI**（主用或备用提供商；也用于摘要）
- **Edge TTS**（主用或备用提供商；使用 `node-edge-tts`，当无 API 密钥时默认为此）

### Edge TTS 说明

Edge TTS 通过 `node-edge-tts` 库使用微软 Edge 的在线神经 TTS 服务。  
这是一项托管服务（非本地），使用微软端点，且不需要 API 密钥。  
`node-edge-tts` 提供语音配置选项和输出格式，但并非所有选项均被 Edge 服务支持。 citeturn2search0

由于 Edge TTS 是公开的网络服务，未公布 SLA 或配额，故应视为尽力而为。  
若需保证限制和支持，请使用 OpenAI 或 ElevenLabs。  
微软的 Speech REST API 文档中每次请求限制 10 分钟音频；Edge TTS 未公布限制，故应假定类似或更低限制。 citeturn0search3

## 可选密钥

如需使用 OpenAI 或 ElevenLabs：

- `ELEVENLABS_API_KEY`（或 `XI_API_KEY`）
- `OPENAI_API_KEY`

Edge TTS **不需要** API 密钥。若无任何 API 密钥，OpenClaw 默认使用 Edge TTS（可通过 `messages.tts.edge.enabled=false` 禁用）。

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

开启 TTS 后，Edge TTS **默认启用**，且当无 OpenAI 或 ElevenLabs API 密钥时自动使用。

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

### Edge TTS 主用（无 API 密钥）

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "edge",
      edge: {
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

### 禁用 Edge TTS

```json5
{
  messages: {
    tts: {
      edge: {
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

- `auto`：自动 TTS 模式（`off`，`always`，`inbound`，`tagged`）。
  - `inbound` 仅在收到语音消息后发送音频回复。
  - `tagged` 仅在回复文本包含 `[[tts]]` 标签时发送音频。
- `enabled`：遗留开关（迁移工具会转为使用 `auto`）。
- `mode`：`"final"`（默认）或 `"all"`（包含工具/区块回复）。
- `provider`：`"elevenlabs"`、`"openai"` 或 `"edge"`（备用自动选择）。
- 若未设置 `provider`，OpenClaw 优先选择已配置密钥的 `openai`，否则为 `elevenlabs`，否则为 `edge`。
- `summaryModel`：可选的廉价模型用于自动摘要；默认是 `agents.defaults.model.primary`。
  - 接受 `provider/model` 格式或已配置的模型别名。
- `modelOverrides`：是否允许模型发出 TTS 指令（默认开启）。
  - `allowProvider` 默认为 `false`（允许切换提供商需显式开启）。
- `maxTextLength`：TTS 输入字符上限。超出时 `/tts audio` 命令会失败。
- `timeoutMs`：请求超时时间（毫秒）。
- `prefsPath`：覆盖本地偏好 JSON 路径（提供商/限制/摘要）。
- `apiKey` 会回退到环境变量（`ELEVENLABS_API_KEY`/`XI_API_KEY`、`OPENAI_API_KEY`）。
- `elevenlabs.baseUrl`：覆盖 ElevenLabs API 基础 URL。
- `openai.baseUrl`：覆盖 OpenAI TTS 端点。
  - 解析顺序：`messages.tts.openai.baseUrl` -> `OPENAI_TTS_BASE_URL` -> `https://api.openai.com/v1`  
  - 非默认值按 OpenAI 兼容端点对待，所以支持自定义模型和语音名称。
- `elevenlabs.voiceSettings`：
  - `stability`、`similarityBoost`、`style`：取值 `0..1`
  - `useSpeakerBoost`：布尔值（`true` 或 `false`）
  - `speed`：`0.5..2.0` （1.0为正常速度）
- `elevenlabs.applyTextNormalization`：`auto`、`on`、`off`
- `elevenlabs.languageCode`：2字母 ISO 639-1 语言代码（如 `en`、`de`）
- `elevenlabs.seed`：整数 `0..4294967295`（尽力确保确定性）
- `edge.enabled`：是否允许使用 Edge TTS（默认 `true`；无需 API 密钥）
- `edge.voice`：Edge 神经语音名称（例：`en-US-MichelleNeural`）
- `edge.lang`：语言代码（例：`en-US`）
- `edge.outputFormat`：Edge 输出格式（例：`audio-24khz-48kbitrate-mono-mp3`）
  - 参见微软语音输出格式以获取有效值；并非所有格式均被 Edge 支持。
- `edge.rate` / `edge.pitch` / `edge.volume`：百分比字符串（如 `+10%`、`-5%`）
- `edge.saveSubtitles`：是否保存 JSON 字幕文件与音频一起。
- `edge.proxy`：Edge TTS 请求代理 URL。
- `edge.timeoutMs`：请求超时覆盖（毫秒）。

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

- `provider`（`openai` | `elevenlabs` | `edge`，需 `allowProvider: true`）
- `voice`（OpenAI 语音）或 `voiceId`（ElevenLabs）
- `model`（OpenAI TTS 模型或 ElevenLabs 模型 ID）
- `stability`、`similarityBoost`、`style`、`speed`、`useSpeakerBoost`
- `applyTextNormalization`（`auto`、`on`、`off`）
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

- **Telegram**：Opus 语音消息（ElevenLabs 提供的 `opus_48000_64`，OpenAI 提供的 `opus`）。
  - 48kHz / 64kbps 是良好的语音消息折中选择，且为圆形气泡所需。
- **其它渠道**：MP3 格式（ElevenLabs 的 `mp3_44100_128`，OpenAI 的 `mp3`）。
  - 44.1kHz / 128kbps 是语音清晰度的默认平衡点。
- **Edge TTS**：使用 `edge.outputFormat`（默认 `audio-24khz-48kbitrate-mono-mp3`）。
  - `node-edge-tts` 接收 `outputFormat`，但并非所有格式均由 Edge 服务支持。citeturn2search0
  - 输出格式遵循微软语音输出格式（包括 Ogg/WebM Opus）。citeturn1search0
  - Telegram `sendVoice` 可接受 OGG/MP3/M4A；若需保证 Opus 语音消息，请使用 OpenAI/ElevenLabs。citeturn1search1
  - 若配置的 Edge 输出格式失败，OpenClaw 会重试使用 MP3。

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

`tts` 工具将文本转成语音并返回 `MEDIA:` 路径。  
若结果兼容 Telegram，工具会添加 `[[audio_as_voice]]`，使 Telegram 发送为语音气泡。

## 网关 RPC

网关方法：

- `tts.status`
- `tts.enable`
- `tts.disable`
- `tts.convert`
- `tts.setProvider`
- `tts.providers`
