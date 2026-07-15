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

1. **活动回复模型**，当其提供商支持音频理解时。
2. **已配置提供商认证** — 任何 `models.providers.*` 条目，只要该提供商支持音频转录且可用认证已存在。这里会在本地 CLI 之前检查，因此已配置的 API 密钥总是优先于 `PATH` 上的本地二进制文件。
   当配置了多个提供商时的优先级：Groq、OpenAI、xAI、Deepgram、Google、SenseAudio、ElevenLabs、Mistral。
3. **本地 CLI**（仅在没有解析到提供商认证时）。OpenClaw 会构建一个有序的回退列表：
   - `whisper-cli`，仅当当前进程中先前的某次模型调用观察到 Metal 或 CUDA 时，才会在 CPU 默认项之前使用
   - `sherpa-onnx-offline`，使用其默认 CPU 提供商（需要 `SHERPA_ONNX_MODEL_DIR`，其中包含 `tokens.txt`、`encoder.onnx`、`decoder.onnx` 和 `joiner.onnx`）
   - `whisper-cli`，当 Metal/CUDA 仅具备构建能力，或者所选后端否则未被观察到时
   - `parakeet-mlx`，运行于 Apple Silicon 上（具备 MLX 能力；设备使用情况仍未被观察到）
   - `whisper`（Python CLI；会自动下载模型）

安装/链接来源只是能力证据，不是执行证据。它本身绝不会把某个候选项排到 CPU sherpa 之前。OpenClaw 在设置或状态检查期间不会为了探测后端而加载模型。
自动检测到的 whisper.cpp 会保持其正常的模型运行日志启用，这样 OpenClaw 就可以记录上游的 `using … backend` 行。显式的 CLI 条目会保留其配置的输出标志。

用于媒体理解的 Gemini CLI 自动检测已被带沙箱的 Antigravity CLI（`agy`）回退方案取代，用于图像/视频；音频除上述本地二进制外不使用 CLI 回退。

如需禁用自动检测，请设置 `tools.media.audio.enabled: false`。如需自定义，请设置 `tools.media.audio.models`。

<Note>
二进制检测在 macOS/Linux/Windows 上尽力而为。请确保该 CLI 位于 `PATH` 中（会展开 `~`），或使用完整命令路径显式设置一个 CLI 模型。
</Note>

在不转写音频的情况下检查本地选择：

```bash
openclaw capability audio providers
openclaw doctor --lint --only core/doctor/local-audio-acceleration --severity-min info
```

提供商清单会分别报告本地回退赢家与全局提供商选择，以及可用、已请求和已观察到的后端字段。在转写运行后，`/status` 会在媒体行中报告已请求或已观察到的后端。显式的 `tools.media.audio.models` CLI 条目仍会绕过自动选择；请使用其特定于后端的标志，例如 sherpa 的 `--provider=cuda` 或 whisper.cpp 的 `--no-gpu`/`--device`。

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

- Provider 认证遵循标准模型认证顺序（auth profiles、env vars、`models.providers.*.apiKey`）。
- Groq 配置详情：[Groq](/providers/groq)。
- 当使用 `provider: "deepgram"` 时，Deepgram 会读取 `DEEPGRAM_API_KEY`。配置详情：[Deepgram](/providers/deepgram)。
- Mistral 配置详情：[Mistral](/providers/mistral)。
- 当使用 `provider: "senseaudio"` 时，SenseAudio 会读取 `SENSEAUDIO_API_KEY`。配置详情：[SenseAudio](/providers/senseaudio)。
- 音频 provider 可通过 `tools.media.audio` 覆盖 `baseUrl`、`headers` 和 `providerOptions`。
- 默认大小上限为 20MB（`tools.media.audio.maxBytes`）。超出大小的音频会跳过该模型，并尝试下一个条目。
- 小于 1024 字节的音频文件会在 provider/CLI 转写之前被跳过。
- 音频的默认 `maxChars` 为 **未设置**（完整转写）。设置 `tools.media.audio.maxChars` 或单个条目的 `maxChars` 可截断输出。
- OpenAI 自动检测默认使用 `gpt-4o-transcribe`；设置 `model: "gpt-4o-mini-transcribe"` 可获得更便宜/更快的选项。
- 使用 `tools.media.audio.attachments` 处理多个语音笔记（`mode: "all"` 加上 `maxAttachments`，默认 1）。
- 转写文本可通过模板中的 `{{Transcript}}` 获取。
- `tools.media.audio.echoTranscript` 默认关闭；启用后，会在 agent 处理前将转写确认回传到发起聊天。
- `tools.media.audio.echoFormat` 可自定义回显文本（占位符：`{transcript}`；默认 `📝 "{transcript}"`）。
- CLI stdout 上限为 5MB；请保持 CLI 输出简洁。
- CLI `args` 应使用 `{{MediaPath}}` 作为本地音频文件路径。运行 `openclaw doctor --fix` 可迁移旧版 `audio.transcription.command` 配置中的已弃用 `{input}` 占位符（已退役键：`audio.transcription`，现由 `tools.media.audio.models` 取代）。
- `tools.media.concurrency` 限制媒体任务数量；它不是 GPU 调度器。

### 常驻本地 STT

自动检测到的本地 STT 仍然是“每请求一个进程”。OpenClaw 目前不会管理常驻的 whisper.cpp 服务，因为标准的 Homebrew `whisper-cpp` 包禁用了该服务，而上游示例又没有配置有界准入队列。要安全启用插件拥有的常驻生命周期，必须先具备一个维护良好的打包 worker，支持健康检查/启动、模型常驻、有界队列、取消/超时、仅回环地址无认证运行，并且在启用前不得有云端回退。

### 代理环境支持

基于 Provider 的音频转写会遵循标准的出站代理环境变量，行为与 undici 的 `EnvHttpProxyAgent` 语义一致：

- `HTTPS_PROXY` / `https_proxy`
- `HTTP_PROXY` / `http_proxy`
- `ALL_PROXY` / `all_proxy`

小写变量优先于大写；`NO_PROXY`/`no_proxy` 条目（主机名、`*.suffix` 或 `host:port`）会绕过代理。如果未设置代理环境变量，则直接访问。如果代理设置失败（URL 格式错误），OpenClaw 会记录警告并回退到直接 fetch。

## 群组中的提及检测

在支持音频预检的频道上，当群聊设置了 `requireMention: true` 时，OpenClaw 会在检查提及之前先转写音频。这使得一条没有字幕的语音消息在其转写内容包含已配置的提及模式时，能够通过提及门控。各频道的文档会描述那些需要手动输入提及的传输方式。

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

- 范围规则采用“首个匹配优先”；`chatType` 会被规范化为 `direct`、`group` 或 `channel`。
- 确保你的 CLI 以 0 退出并打印纯文本；JSON 输出需要通过 `jq -r .text` 进行处理。
- 已知的文件输出模式具有权威性：推断出的转写文件为空或缺失时，不会生成转写内容，而不是回退到 CLI 的进度输出。
- 对于 `parakeet-mlx`，请使用 `--output-format txt`（或 `all`）配合 `--output-dir` 和默认的 `{filename}` 输出模板。上游的 `PARAKEET_OUTPUT_FORMAT` 和 `PARAKEET_OUTPUT_TEMPLATE` 环境变量也会被遵循。OpenClaw 读取 `<output-dir>/<media-basename>.txt`；默认的 `srt` 格式、其他格式以及自定义输出模板仍会使用 stdout。
- 保持超时时间合理（`timeoutSeconds`，默认 60 秒），以避免阻塞回复队列。
- 预检转写仅处理**第一个**音频附件以进行提及检测。其他音频附件会在主要的媒体理解阶段处理。

## 相关内容

- [媒体理解](/nodes/media-understanding)
- [聊天模式](/nodes/talk)
- [语音唤醒](/nodes/voicewake)
