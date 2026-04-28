---
summary: "如何下载、转录并将入站音频/语音笔记注入回复"
read_when:
  - 更改音频转录或媒体处理
title: "音频和语音笔记"
---

# 音频 / 语音笔记（2026-01-17）

## 功能介绍

- **媒体识别（音频）**：如果启用了音频理解（或自动检测），OpenClaw 会：
  1. 定位第一个音频附件（本地路径或 URL），如有需要则下载。
  2. 在发送到各模型条目前，强制执行 `maxBytes` 限制。
  3. 按顺序运行首个可用的模型条目（提供商或 CLI）。
  4. 若失败或跳过（因大小/超时），则尝试下一个条目。
  5. 成功时，用 `[Audio]` 块替换 `Body` 并设置 `{{Transcript}}`。
- **命令解析**：转录成功后，`CommandBody`/`RawBody` 会被设为转录文本，以确保斜线命令仍能生效。
- **详细日志**：在 `--verbose` 模式下，会记录转录启动及替换正文的时间。

## 自动检测（默认）

如果您**未配置模型**且 `tools.media.audio.enabled` **未设为 false**，
OpenClaw 会按以下顺序自动检测并停止于首个可用选项：

1. **当当前回复模型的提供商支持音频理解时，使用该模型。**
2. **本地 CLI**（如果已安装）
   - `sherpa-onnx-offline`（需要 `SHERPA_ONNX_MODEL_DIR`，其中包含 encoder/decoder/joiner/tokens）
   - `whisper-cli`（来自 `whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或内置的 tiny 模型）
   - `whisper`（Python CLI；会自动下载模型）
3. **Gemini CLI**（`gemini`），使用 `read_many_files`
4. **提供商认证**
   - 会优先尝试已配置且支持音频的 `models.providers.*` 条目
   - 内置后备顺序：OpenAI → Groq → Deepgram → Google → Mistral

如需禁用自动检测，设置 `tools.media.audio.enabled: false`。
如需自定义，请设置 `tools.media.audio.models`。
注意：二进制检测对 macOS/Linux/Windows 是尽力而为；请确保 CLI 在 `PATH`（支持扩展 `~`），或直接用完整命令路径设置 CLI 模型。

## 配置示例

### 提供商 + CLI 后备（OpenAI + Whisper CLI）

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        maxBytes: 20971520,
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" },
          {
            type: "cli",
            command: "whisper",
            args: ["--model", "base", "{{MediaPath}}"],
            timeoutSeconds: 45,
          },
        ],
      },
    },
  },
}
```

### 仅提供商且带范围控制

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        scope: {
          default: "allow",
          rules: [{ action: "deny", match: { chatType: "group" } }],
        },
        models: [{ provider: "openai", model: "gpt-4o-mini-transcribe" }],
      },
    },
  },
}
```

### 仅提供商（Deepgram）

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "deepgram", model: "nova-3" }],
      },
    },
  },
}
```

### 仅提供商（Mistral Voxtral）

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "mistral", model: "voxtral-mini-latest" }],
      },
    },
  },
}
```

### 回显转录文本到聊天（可选）

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        echoTranscript: true, // 默认是 false
        echoFormat: '📝 "{transcript}"', // 可选，支持 {transcript} 占位符
        models: [{ provider: "openai", model: "gpt-4o-mini-transcribe" }],
      },
    },
  },
}
```

## 注意事项与限制

- 提供商认证遵循标准模型认证顺序（认证配置文件、环境变量、`models.providers.*.apiKey`）。
- Groq 设置详情：[Groq](/providers/groq)。
- 当使用 `provider: "deepgram"` 时，会读取 `DEEPGRAM_API_KEY`。
- Deepgram 设置详情：[Deepgram（音频转录）](/providers/deepgram)。
- Mistral 设置详情：[Mistral](/providers/mistral)。
- 当使用 `provider: "senseaudio"` 时，会读取 `SENSEAUDIO_API_KEY`。
- SenseAudio 设置详情：[SenseAudio](/providers/senseaudio)。
- 音频提供商可通过 `tools.media.audio` 覆盖 `baseUrl`、`headers` 和 `providerOptions`。
- 默认大小上限为 20MB（`tools.media.audio.maxBytes`）。超出大小的音频会被该模型跳过，并尝试下一项。
- 低于 1024 字节的微小/空音频文件会在提供商/CLI 转录前被跳过。
- 音频默认的 `maxChars` **未设置**（完整转录）。设置 `tools.media.audio.maxChars` 或每个条目的 `maxChars` 可裁剪输出。
- OpenAI 的自动默认模型是 `gpt-4o-mini-transcribe`；如需更高准确率，请设置 `model: "gpt-4o-transcribe"`。
- 使用 `tools.media.audio.attachments` 处理多个语音笔记（`mode: "all"` + `maxAttachments`）。
- 转录内容可在模板中通过 `{{Transcript}}` 获取。
- `tools.media.audio.echoTranscript` 默认关闭；启用后会在代理处理前将转录确认回传到原始聊天。
- `tools.media.audio.echoFormat` 可自定义回显文本（占位符：`{transcript}`）。
- CLI 标准输出有上限（5MB）；请保持 CLI 输出简洁。
- CLI `args` 应使用 `{{MediaPath}}` 作为本地音频文件路径。运行 `openclaw doctor --fix` 可迁移旧版 `audio.transcription.command` 配置中的废弃 `{input}` 占位符。

### 代理环境支持

基于提供商的音频转录支持标准的外发代理环境变量：

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `ALL_PROXY`
- `https_proxy`
- `http_proxy`
- `all_proxy`

无代理环境变量时使用直接访问。代理配置不正当时，OpenClaw 会记录警告并回退为直接访问。

## 群组中的提及检测

当对群聊设置了 `requireMention: true` 时，OpenClaw 会**在检查提及之前**先转录音频。这使得即使语音笔记中包含提及，也能顺利处理。

**工作原理：**

1. 若语音消息无文本内容且群组要求提及，OpenClaw 会执行“预检”转录。
2. 对转录结果检测提及模式（例如 `@BotName`、表情符号触发等）。
3. 若检测到提及，消息走完整回复流程。
4. 使用转录文本进行提及检测，使语音笔记能通过提及门槛。

**降级处理：**

- 预检转录失败时（超时、API 出错等），消息基于文本提及检测处理。
- 确保混合内容（文本+音频）不会被错误忽略。

**Telegram 群组/话题中的单独关闭：**

- 设置 `channels.telegram.groups.<chatId>.disableAudioPreflight: true` 可跳过该群的预检转录提及检测。
- 设置 `channels.telegram.groups.<chatId>.topics.<threadId>.disableAudioPreflight` 可按话题覆盖（`true` 跳过，`false` 强制启用）。
- 默认值为 `false`（满足提及门条件时启用预检）。

**示例：** 用户在 Telegram 群聊里发送语音笔记说：“嘿 @Claude，今天天气怎样？”群组启用了 `requireMention: true`，则语音笔记先被转录，检测到提及后，代理回复。

## 常见注意事项

- 范围规则采用“首个匹配生效”。`chatType` 会规范化为 `direct`、`group` 或 `room`。
- 确保你的 CLI 以 0 退出并输出纯文本；JSON 需要通过 `jq -r .text` 处理。
- 对于 `parakeet-mlx`，如果你传入 `--output-dir`，当 `--output-format` 为 `txt`（或未指定）时，OpenClaw 会读取 `<output-dir>/<media-basename>.txt`；非 `txt` 输出格式会回退为标准输出解析。
- 请保持合理的超时时间（`timeoutSeconds`，默认 60 秒），以避免阻塞回复队列。
- 预检转录只会处理**第一个**音频附件用于提及检测。其余音频会在主媒体理解阶段处理。

## 相关内容

- [媒体理解](/nodes/media-understanding)
- [聊天模式](/nodes/talk)
- [语音唤醒](/nodes/voicewake)
