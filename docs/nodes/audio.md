---
summary: "入站音频/语音笔记如何下载、转录并注入回复中"
read_when:
  - 更改音频转录或媒体处理方式时
title: "音频与语音笔记"
---

# Audio / Voice Notes (2026-01-17)

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

1. **本地 CLI**（如果已安装）
   - `sherpa-onnx-offline`（需要带有编码器/解码器/连接器/词元的 `SHERPA_ONNX_MODEL_DIR`）
   - `whisper-cli`（来自 `whisper-cpp`，使用 `WHISPER_CPP_MODEL` 或捆绑的 tiny 模型）
   - `whisper`（Python CLI，模型自动下载）
2. **Gemini CLI**（`gemini`），使用 `read_many_files`
3. **提供商密钥**（OpenAI → Groq → Deepgram → Google）

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

- 提供商认证遵从标准模型认证顺序（认证配置文件、环境变量、`models.providers.*.apiKey`）。
- 使用 `provider: "deepgram"` 时，Deepgram 会自动使用 `DEEPGRAM_API_KEY`。
- Deepgram 设置详情见：[Deepgram (音频转录)](/providers/deepgram)。
- Mistral 设置详情见：[Mistral](/providers/mistral)。
- 音频提供商可通过 `tools.media.audio` 覆盖 `baseUrl`、`headers` 和 `providerOptions`。
- 默认大小上限为 20MB（`tools.media.audio.maxBytes`）。超大音频会跳过该模型，并尝试下一个条目。
- 小于 1024 字节的空/微小音频文件在提供商/CLI转录前被跳过。
- 音频的默认 `maxChars` **未设置**（转录全文）。可通过 `tools.media.audio.maxChars` 或单条目 `maxChars` 修剪输出。
- OpenAI 默认自动模型为 `gpt-4o-mini-transcribe`；可设为 `gpt-4o-transcribe` 以提高准确率。
- 使用 `tools.media.audio.attachments` 可处理多条语音笔记（`mode: "all"` + `maxAttachments`）。
- 转录结果可通过模板变量 `{{Transcript}}` 获取。
- `tools.media.audio.echoTranscript` 默认关闭，开启后会在代理处理前将转录文本回显给发起聊天。
- `tools.media.audio.echoFormat` 定制回显文本（占位符：`{transcript}`）。
- CLI 标准输出被限制为 5MB，建议输出简洁明了。

### 代理环境支持

基于提供商的音频转录支持标准的外发代理环境变量：

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `https_proxy`
- `http_proxy`

无代理环境变量时使用直接访问。代理配置不正当时，OpenClaw 会记录警告并回退为直接访问。

## 群组中的提及检测

当对群聊设置了 `requireMention: true`，OpenClaw 会**在检查提及之前**先转录音频。这使得即使语音笔记中包含提及，也能顺利处理。

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

- 范围规则遵循首次匹配优先。`chatType` 被规范化为 `direct`，`group`，或 `room`。
- 确保 CLI 退出码为 0 且输出纯文本；若输出 JSON，请用 `jq -r .text` 提取。
- 对于 `parakeet-mlx`，若传入 `--output-dir`，OpenClaw 会在 `--output-format` 为 `txt`（或默认）时读取 `<output-dir>/<media-basename>.txt`；非 txt 格式回退解析 stdout。
- 超时设置合理（`timeoutSeconds` 默认 60秒），避免阻塞回复队列。
- 预检转录只处理**第一个**音频附件用于提及检测，其他音频在主媒体识别阶段处理。
