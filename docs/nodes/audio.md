---
summary: "入站音频/语音笔记如何被下载、转写并注入回复"
read_when:
  - 更改音频转写或媒体处理
title: "音频和语音笔记"
---

## 可用功能

- **媒体理解（音频）**：如果启用了音频理解（或自动检测到），OpenClaw 会：
  1. 定位第一条音频附件（本地路径或 URL），并在需要时下载它。
  2. 在发送给每个模型条目之前强制执行 `maxBytes`。
  3. 按顺序运行第一个符合条件的模型条目（提供方或 CLI）。
  4. 如果失败或跳过（大小/超时），则尝试下一个条目。
  5. 成功后，它会将 `Body` 替换为 `[音频]` 块，并设置 `{{Transcript}}`。
- **命令解析**：转写成功后，`CommandBody`/`RawBody` 会被设置为转写内容，因此斜杠命令仍然可用。
- **详细日志**：在 `--verbose` 模式下，我们会记录转写何时运行以及何时替换正文。

## 自动检测（默认）

如果你**没有配置模型**，并且 `tools.media.audio.enabled` **未**设置为 `false`，
OpenClaw 会按以下顺序自动检测，并在第一个可用选项处停止：

1. **活动回复模型**：当其提供方支持音频理解时。
2. **本地 CLI**（如果已安装）
   - `sherpa-onnx-offline`（需要 `SHERPA_ONNX_MODEL_DIR`，其中包含 encoder/decoder/joiner/tokens）
   - `whisper-cli`（来自 `whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或内置的 tiny 模型）
   - `whisper`（Python CLI；自动下载模型）
3. **提供方认证**
   - 先尝试已配置的、支持音频的 `models.providers.*` 条目
   - 提供方回退顺序：OpenAI → Groq → xAI → Deepgram → Google → SenseAudio → ElevenLabs → Mistral

截至 2026-05-22，Gemini CLI 已不再支持媒体理解的自动检测。Google 正在将 Gemini CLI 用户迁移到 Antigravity CLI；音频应使用本地或提供方转写，而图片/视频的 CLI 回退应迁移到 Antigravity CLI（`agy`）。

要禁用自动检测，请设置 `tools.media.audio.enabled: false`。
要自定义，请设置 `tools.media.audio.models`。
注意：二进制检测在 macOS/Linux/Windows 上尽力而为；请确保 CLI 在 `PATH` 中（我们会展开 `~`），或者为 CLI 模型设置带完整命令路径的显式配置。

## 配置示例

### 提供方 + CLI 兜底（OpenAI + Whisper CLI）

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

### 仅提供方，并带范围控制

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

### 仅提供方（Deepgram）

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

### 仅提供方（Mistral Voxtral）

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

### 仅提供方（SenseAudio）

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "senseaudio", model: "senseaudio-asr-pro-1.5-260319" }],
      },
    },
  },
}
```

### 将转写结果回显到聊天（可选启用）

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        echoTranscript: true, // 默认为 false
        echoFormat: '📝 "{transcript}"', // 可选，支持 {transcript}
        models: [{ provider: "openai", model: "gpt-4o-mini-transcribe" }],
      },
    },
  },
}
```

## 注意和限制

- 提供方认证遵循标准模型认证顺序（认证配置文件、环境变量、`models.providers.*.apiKey`）。
- Groq 设置细节： [Groq](/providers/groq)。
- 使用 `provider: "deepgram"` 时，Deepgram 会读取 `DEEPGRAM_API_KEY`。
- Deepgram 设置细节： [Deepgram（音频转写）](/providers/deepgram)。
- Mistral 设置细节： [Mistral](/providers/mistral)。
- 使用 `provider: "senseaudio"` 时，SenseAudio 会读取 `SENSEAUDIO_API_KEY`。
- SenseAudio 设置细节： [SenseAudio](/providers/senseaudio)。
- 音频提供方可通过 `tools.media.audio` 覆盖 `baseUrl`、`headers` 和 `providerOptions`。
- 默认大小上限为 20MB（`tools.media.audio.maxBytes`）。超大音频会在该模型处被跳过，并尝试下一个条目。
- 低于 1024 字节的微小/空音频文件会在提供方/CLI 转写之前被跳过。
- 音频的默认 `maxChars` 为**未设置**（完整转写）。设置 `tools.media.audio.maxChars` 或每个条目的 `maxChars` 可截断输出。
- OpenAI 自动默认模型为 `gpt-4o-mini-transcribe`；如需更高准确率，请设置 `model: "gpt-4o-transcribe"`。
- 使用 `tools.media.audio.attachments` 处理多个语音笔记（`mode: "all"` + `maxAttachments`）。
- 转写文本可在模板中通过 `{{Transcript}}` 获取。
- `tools.media.audio.echoTranscript` 默认关闭；启用后会在代理处理之前将转写确认回传到发起聊天。
- `tools.media.audio.echoFormat` 可自定义回显文本（占位符：`{transcript}`）。
- CLI stdout 有上限（5MB）；请保持 CLI 输出简洁。
- CLI `args` 应使用 `{{MediaPath}}` 指向本地音频文件路径。运行 `openclaw doctor --fix` 可迁移旧版 `audio.transcription.command` 配置中的已弃用 `{input}` 占位符。

### 代理环境支持

基于提供方的音频转写支持标准的出站代理环境变量：

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `ALL_PROXY`
- `https_proxy`
- `http_proxy`
- `all_proxy`

如果未设置任何代理环境变量，则使用直接出站连接。如果代理配置格式错误，OpenClaw 会记录警告并回退到直接获取。

## 群组中的提及检测

当群聊设置了 `requireMention: true` 时，OpenClaw 现在会在检查提及之前先转写音频。这使得语音笔记即使包含提及也能被处理。

**工作方式：**

1. 如果语音消息没有文本正文，并且群组要求提及，OpenClaw 会执行一次“预检”转写。
2. 系统会检查转写文本中的提及模式（例如 `@BotName`、表情触发器）。
3. 如果找到了提及，消息会进入完整的回复流程。
4. 由于使用了转写文本进行提及检测，语音笔记可以通过提及门控。

**回退行为：**

- 如果在预检期间转写失败（超时、API 错误等），消息将基于仅文本提及检测进行处理。
- 这可确保混合消息（文本 + 音频）不会被错误丢弃。

**按 Telegram 群组/话题单独关闭：**

- 为该群组设置 `channels.telegram.groups.<chatId>.disableAudioPreflight: true`，可跳过预检转写提及检查。
- 设置 `channels.telegram.groups.<chatId>.topics.<threadId>.disableAudioPreflight` 可按话题覆盖（`true` 表示跳过，`false` 表示强制启用）。
- 默认值为 `false`（当满足提及门控条件时启用预检）。

**示例：** 用户在一个 `requireMention: true` 的 Telegram 群组中发送了一条语音笔记，内容为“Hey @Claude, what's the weather?”。语音笔记会被转写，系统检测到提及，然后代理进行回复。

## 注意事项

- 范围规则采用“先匹配先获胜”。`chatType` 会被规范化为 `direct`、`group` 或 `room`。
- 确保你的 CLI 以 0 退出并输出纯文本；JSON 需要通过 `jq -r .text` 进行处理。
- 对于 `parakeet-mlx`，如果你传递 `--output-dir`，当 `--output-format` 为 `txt`（或省略）时，OpenClaw 会读取 `<output-dir>/<media-basename>.txt`；非 `txt` 的输出格式会回退到 stdout 解析。
- 保持超时时间合理（`timeoutSeconds`，默认 60 秒），以免阻塞回复队列。
- 预检转写只会处理**第一条**音频附件以用于提及检测。其他音频会在主要媒体理解阶段处理。

## 相关内容

- [媒体理解](/nodes/media-understanding)
- [聊天模式](/nodes/talk)
- [语音唤醒](/nodes/voicewake)
