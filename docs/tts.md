---
summary: "用于出站回复的文本转语音 (TTS)"
read_when:
  - 启用回复的文本转语音
  - 配置 TTS 提供商或限制
  - 使用 /tts 命令
title: "文本转语音（旧路径）"
---

# 文本转语音 (TTS)

OpenClaw 可以使用 ElevenLabs、Microsoft 或 OpenAI 将出站回复转换为音频。
它适用于 OpenClaw 能发送音频的任何场景。

## 支持的服务

- **ElevenLabs**（主用或备用提供商）
- **Microsoft**（主用或备用提供商；当前内置实现使用 `node-edge-tts`，在没有 API 密钥时为默认值）
- **OpenAI**（主用或备用提供商；也用于摘要）

### Microsoft 语音说明

当前内置的 Microsoft 语音提供商通过 `node-edge-tts` 库使用 Microsoft Edge 的在线
神经 TTS 服务。它是托管服务（非本地），使用 Microsoft 端点，且不需要 API 密钥。
`node-edge-tts` 暴露了语音配置选项和输出格式，但并非所有选项都受服务支持。
旧版配置和指令输入中使用 `edge` 仍然有效，并会规范化为 `microsoft`。

由于该路径是一个没有公开 SLA 或配额的公共 Web 服务，
请将其视为尽力而为。如果你需要有保障的限制和支持，请使用 OpenAI
或 ElevenLabs。

## 可选密钥

如需使用 OpenAI 或 ElevenLabs：

- `ELEVENLABS_API_KEY`（或 `XI_API_KEY`）
- `OPENAI_API_KEY`

Microsoft 语音 **不** 需要 API 密钥。如果未找到任何 API 密钥，
OpenClaw 将默认使用 Microsoft（除非通过
`messages.tts.microsoft.enabled=false` 或 `messages.tts.edge.enabled=false` 禁用）。

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

一旦启用 TTS，Microsoft 语音 **会** 默认启用，并且在没有 OpenAI 或 ElevenLabs API 密钥可用时会自动使用。

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

### Microsoft 主用（无 API 密钥）

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

### 仅在收到传入语音消息后回复音频

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

- `auto`: 自动 TTS 模式（`off`、`always`、`inbound`、`tagged`）。
  - `inbound` 仅在收到传入语音消息后发送音频。
  - `tagged` 仅在回复包含 `[[tts]]` 标签时发送音频。
- `enabled`: 旧版开关（doctor 会将其迁移为 `auto`）。
- `mode`: `"final"`（默认）或 `"all"`（包含工具/块回复）。
- `provider`: 语音提供商 id，例如 `"elevenlabs"`、`microsoft` 或 `"openai"`（会自动回退）。
- 如果 `provider` **未设置**，OpenClaw 会优先使用 `openai`（如果有 key），然后是 `elevenlabs`（如果有 key），
  否则使用 `microsoft`。
- 旧版 `provider: "edge"` 仍然有效，并会规范化为 `microsoft`。
- `summaryModel`: 用于自动摘要的可选廉价模型；默认 `agents.defaults.model.primary`。
  - 接受 `provider/model` 或已配置的模型别名。
- `modelOverrides`: 允许模型发出 TTS 指令（默认开启）。
  - `allowProvider` 默认是 `false`（切换提供商需显式开启）。
- `maxTextLength`: TTS 输入的硬上限（字符）。超过后 `/tts audio` 会失败。
- `timeoutMs`: 请求超时（毫秒）。
- `prefsPath`: 覆盖本地偏好 JSON 路径（提供商/限制/摘要）。
- `apiKey` 值会回退到环境变量（`ELEVENLABS_API_KEY`/`XI_API_KEY`、`OPENAI_API_KEY`）。
- `elevenlabs.baseUrl`: 覆盖 ElevenLabs API 基础 URL。
- `openai.baseUrl`: 覆盖 OpenAI TTS 端点。
  - 解析顺序：`messages.tts.openai.baseUrl` -> `OPENAI_TTS_BASE_URL` -> `https://api.openai.com/v1`
  - 非默认值会被视为 OpenAI 兼容的 TTS 端点，因此可接受自定义模型和语音名称。
- `elevenlabs.voiceSettings`：
  - `stability`、`similarityBoost`、`style`：`0..1`
  - `useSpeakerBoost`：`true|false`
  - `speed`：`0.5..2.0`（1.0 = 正常）
- `elevenlabs.applyTextNormalization`：`auto|on|off`
- `elevenlabs.languageCode`：2 字母 ISO 639-1（例如 `en`、`de`）
- `elevenlabs.seed`：整数 `0..4294967295`（尽力保持确定性）
- `microsoft.enabled`：允许使用 Microsoft 语音（默认 `true`；无需 API 密钥）。
- `microsoft.voice`：Microsoft 神经语音名称（例如 `en-US-MichelleNeural`）。
- `microsoft.lang`：语言代码（例如 `en-US`）。
- `microsoft.outputFormat`：Microsoft 输出格式（例如 `audio-24khz-48kbitrate-mono-mp3`）。
  - 有效值请参见 Microsoft Speech 输出格式；并非所有格式都受内置 Edge 支持传输方式支持。
- `microsoft.rate` / `microsoft.pitch` / `microsoft.volume`：百分比字符串（例如 `+10%`、`-5%`）。
- `microsoft.saveSubtitles`：将 JSON 字幕写入音频文件旁边。
- `microsoft.proxy`：Microsoft 语音请求的代理 URL。
- `microsoft.timeoutMs`：请求超时覆盖（毫秒）。
- `edge.*`：上述 Microsoft 设置的旧别名。

## 模型驱动覆盖（默认启用）

默认情况下，模型**可以**在单次回复中生成 TTS 指令。  
当 `messages.tts.auto` 设置为 `tagged` 时，必须使用这些指令才会触发音频。

启用时，模型可以发出 `[[tts:...]]` 指令覆盖单个回复的语音配置，并可使用选填的 `[[tts:text]]...[[/tts:text]]` 块添加仅音频中出现的表达性标签（如笑声、唱歌提示等）。

`provider=...` 指令仅在 `modelOverrides.allowProvider: true` 时生效。

示例回复内容：

```
Here you go.

[[tts:voiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) 再读一遍这首歌。[[/tts:text]]
```

可用指令键（启用时）：

- `provider`（已注册的语音提供商 id，例如 `openai`、`elevenlabs` 或 `microsoft`；需要 `allowProvider: true`）
- `voice`（OpenAI 语音）或 `voiceId`（ElevenLabs）
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

斜杠命令会写入本地覆盖文件至 `prefsPath`（默认：`~/.openclaw/settings/tts.json`，可用环境变量 `OPENCLAW_TTS_PREFS` 或 `messages.tts.prefsPath` 覆盖）。

存储字段：

- `enabled`
- `provider`
- `maxLength`（摘要阈值；默认 1500 字符）
- `summarize`（默认 `true`）

这些设置会覆盖对应主机的 `messages.tts.*` 配置。

## 输出格式（固定）

- **Feishu / Matrix / Telegram / WhatsApp**: Opus 语音消息（ElevenLabs 使用 `opus_48000_64`，OpenAI 使用 `opus`）。
  - 48kHz / 64kbps 是语音消息的良好折中。
- **Other channels**: MP3（ElevenLabs 使用 `mp3_44100_128`，OpenAI 使用 `mp3`）。
  - 44.1kHz / 128kbps 是语音清晰度的默认平衡。
- **Microsoft**：使用 `microsoft.outputFormat`（默认 `audio-24khz-48kbitrate-mono-mp3`）。
  - 内置传输支持 `outputFormat`，但服务并不提供所有格式。
  - 输出格式值遵循 Microsoft Speech 输出格式（包括 Ogg/WebM Opus）。
  - Telegram `sendVoice` 接受 OGG/MP3/M4A；如果你需要
    有保障的 Opus 语音消息，请使用 OpenAI/ElevenLabs。
  - 如果配置的 Microsoft 输出格式失败，OpenClaw 会重试 MP3。

OpenAI/ElevenLabs 输出格式按通道固定（见上文）。

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

`tts` 工具可将文本转换为语音，并返回一个音频附件用于
回复发送。当频道为飞书、Matrix、Telegram 或 WhatsApp 时，
音频会以语音消息而不是文件附件的形式发送。

## 网关 RPC

网关方法：

- `tts.status`
- `tts.enable`
- `tts.disable`
- `tts.convert`
- `tts.setProvider`
- `tts.providers`
