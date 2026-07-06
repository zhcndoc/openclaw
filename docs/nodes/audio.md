---
summary: "入站音频/语音笔记如何被下载、转写并注入回复"
read_when:
  - 更改音频转写或媒体处理
title: "音频和语音笔记"
---

## 它的作用

当启用（或自动检测到）音频理解时，OpenClaw 会：

1. 定位第一个音频附件（本地路径或 URL），并在需要时下载它。
2. 在发送到每个模型条目之前强制执行 `maxBytes`。
3. 按顺序运行第一个符合条件的模型条目（提供方或 CLI）；如果某个条目失败或跳过（大小/超时），则尝试下一个条目。
4. 成功后，将 `Body` 替换为 `[Audio]` 块，并设置 `{{Transcript}}`。

当转录成功时，`CommandBody`/`RawBody` 也会被设置为转录文本，因此斜杠命令仍然可以工作。启用 `--verbose` 时，日志会显示转录何时运行以及何时替换正文。

## 自动检测（默认）

如果你没有配置模型，并且 `tools.media.audio.enabled` 不是 `false`，OpenClaw 会按以下顺序自动检测，并在找到第一个可用选项时停止：

1. **当前活跃的回复模型**，前提是其提供方支持音频理解。
2. **已配置的提供方认证** —— 任何带有可用认证的 `models.providers.*` 条目，只要对应提供方支持音频转录，就会被检查。此检查优先于本地 CLI，因此已配置的 API 密钥总会优先于 `PATH` 上的本地二进制文件。
   当配置了多个提供方时，其优先级为：Groq、OpenAI、xAI、Deepgram、Google、SenseAudio、ElevenLabs、Mistral。
3. **本地 CLI**（仅当没有解析到提供方认证时），按以下顺序检查：
   - `sherpa-onnx-offline`（需要 `SHERPA_ONNX_MODEL_DIR`，其中包含 `tokens.txt`、`encoder.onnx`、`decoder.onnx` 和 `joiner.onnx`）
   - `whisper-cli`（来自 `whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或内置的 tiny 模型）
   - `whisper`（Python CLI；会自动下载模型）

用于媒体理解的 Gemini CLI 自动检测已被替换为一个沙箱化的 Antigravity CLI（`agy`）回退方案，用于图像/视频；音频不会在上述本地二进制文件之外使用 CLI 回退。

如需禁用自动检测，请设置 `tools.media.audio.enabled: false`。如需自定义，请设置 `tools.media.audio.models`。

<Note>
二进制检测在 macOS/Linux/Windows 上尽力而为。请确保该 CLI 位于 `PATH` 中（会展开 `~`），或使用完整命令路径显式设置一个 CLI 模型。
</Note>

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
          { provider: "openai", model: "gpt-4o-transcribe" },
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
        models: [{ provider: "openai", model: "gpt-4o-transcribe" }],
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
        echoTranscript: true, // 默认值为 false
        echoFormat: '📝 "{transcript}"', // 可选，支持 {transcript}
        models: [{ provider: "openai", model: "gpt-4o-transcribe" }],
      },
    },
  },
}
```

## 注意和限制

- Provider 认证遵循标准的模型认证顺序（auth profiles、env vars、`models.providers.*.apiKey`）。
- Groq 设置详情：[Groq](/providers/groq)。
- 当使用 `provider: "deepgram"` 时，Deepgram 会读取 `DEEPGRAM_API_KEY`。设置详情：[Deepgram](/providers/deepgram)。
- Mistral 设置详情：[Mistral](/providers/mistral)。
- 当使用 `provider: "senseaudio"` 时，SenseAudio 会读取 `SENSEAUDIO_API_KEY`。设置详情：[SenseAudio](/providers/senseaudio)。
- 音频 provider 可以通过 `tools.media.audio` 覆盖 `baseUrl`、`headers` 和 `providerOptions`。
- 默认大小上限为 20MB（`tools.media.audio.maxBytes`）。超出大小的音频会被跳过并尝试下一个条目。
- 小于 1024 bytes 的音频文件会在 provider/CLI 转写前被跳过。
- 音频的默认 `maxChars` 为**未设置**（完整转写）。设置 `tools.media.audio.maxChars` 或单个条目的 `maxChars` 可以截断输出。
- OpenAI 自动检测默认使用 `gpt-4o-transcribe`；设置 `model: "gpt-4o-mini-transcribe"` 可获得更便宜/更快的选项。
- 使用 `tools.media.audio.attachments` 处理多个语音笔记（`mode: "all"` 并加上 `maxAttachments`，默认 1）。
- 转写内容可在模板中通过 `{{Transcript}}` 获取。
- `tools.media.audio.echoTranscript` 默认关闭；启用后会在 agent 处理前把转写确认回传到源聊天。
- `tools.media.audio.echoFormat` 可自定义回传文本（占位符：`{transcript}`；默认 `📝 "{transcript}"`）。
- CLI stdout 限制为 5MB；请保持 CLI 输出简洁。
- CLI `args` 应使用本地音频文件路径 `{{MediaPath}}`。运行 `openclaw doctor --fix` 可将旧版 `audio.transcription.command` 配置中的弃用 `{input}` 占位符迁移过来（已废弃键：`audio.transcription`，已替换为 `tools.media.audio.models`）。

### 代理环境支持

基于 Provider 的音频转写会遵循标准的出站代理环境变量，行为与 undici 的 `EnvHttpProxyAgent` 语义一致：

- `HTTPS_PROXY` / `https_proxy`
- `HTTP_PROXY` / `http_proxy`
- `ALL_PROXY` / `all_proxy`

小写变量优先于大写；`NO_PROXY`/`no_proxy` 条目（主机名、`*.suffix` 或 `host:port`）会绕过代理。如果未设置代理环境变量，则直接访问。如果代理设置失败（URL 格式错误），OpenClaw 会记录警告并回退到直接 fetch。

## 群组中的提及检测

当为群聊设置 `requireMention: true` 时，OpenClaw 会在检查提及时先转写音频。这样即使消息没有文本正文，语音消息也能通过提及门控。

**工作方式：**

1. 如果语音消息没有文本正文，并且群组要求提及，OpenClaw 会先对第一个音频附件进行预检转写。
2. 系统会检查转写内容中的提及模式（例如 `@BotName`、表情触发）。
3. 如果检测到提及，消息会继续进入完整的回复流程。

**回退行为：**如果预检转写失败（超时、API 错误等），消息会回退到仅文本提及检测，因此混合消息（文本 + 音频）不会被丢弃。

**按 Telegram 群组/话题单独关闭：**

- 为该群组设置 `channels.telegram.groups.<chatId>.disableAudioPreflight: true`，可跳过预检转写提及检查。
- 设置 `channels.telegram.groups.<chatId>.topics.<threadId>.disableAudioPreflight` 可按话题覆盖（`true` 表示跳过，`false` 表示强制启用）。
- 默认值为 `false`（当满足提及门控条件时启用预检）。

**示例：**用户在一个设置了 `requireMention: true` 的 Telegram 群组中发送一条语音消息，内容是“嘿 @Claude，天气怎么样？”。语音消息会被转写，检测到提及后，代理会回复。

## 注意事项

- 作用域规则采用“先匹配先生效”；`chatType` 会规范化为 `direct`、`group` 或 `channel`。
- 确保你的 CLI 以 0 退出并输出纯文本；JSON 输出需要通过 `jq -r .text` 进行处理。
- 对于 `parakeet-mlx`，如果你传入 `--output-dir`，当 `--output-format` 为 `txt`（或省略）时，OpenClaw 会读取 `<output-dir>/<media-basename>.txt`；非 `txt` 输出格式则回退为从 stdout 解析。
- 保持合理的超时时间（`timeoutSeconds`，默认 60s），以避免阻塞回复队列。
- 预检转录仅处理用于提及检测的**第一**个音频附件。其余音频附件会在主媒体理解阶段处理。

## 相关内容

- [媒体理解](/nodes/media-understanding)
- [聊天模式](/nodes/talk)
- [语音唤醒](/nodes/voicewake)
