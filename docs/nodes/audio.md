---
summary: "如何下载、转录入站 audio/voice 注释并将其注入回复中"
read_when:
  - "更改音频转写或媒体处理"
title: "音频和语音笔记"
---

本页面介绍入站转写和语音笔记处理。有关 OpenClaw 聊天客户端中的内联音频和视频播放器，请参阅 [媒体播放](/nodes/media-playback)。

## <a id="what-it-does"></a> 它的作用

当启用（或自动检测到）音频理解时，OpenClaw 会：

1. 定位第一个音频附件（本地路径或 URL），并在需要时下载它。
2. 在发送到每个模型条目之前强制执行 `maxBytes`。
3. 按顺序运行第一个符合条件的模型条目（提供商或 CLI）；如果某个条目失败或跳过 （size/timeout），则尝试下一个条目。返回未检测到语音的空音频记录的提供程序将被跳过，而不是失败；在任何通道中缺少所需转录字段的批处理响应仍然会失败。 Deepgram Flux 流在刷新音频后干净地关闭而没有任何转动，也代表沉默。
4. 成功后，将 `Body` 替换为 `[Audio]` 块，并设置 `{{Transcript}}`。

当转录成功时，`CommandBody`/`RawBody` 也会被设置为转录文本，因此斜杠命令仍然可以工作。启用 `--verbose` 时，日志会显示转录何时运行以及何时替换正文。

对于插件调用者，文件转录返回 `decision.attachmentProcessing`，由附件索引键入。 `"completed"`表示CLI或提供者完成输入处理，包括成功的空输出； `"omitted"` 表示未完成。独立转录工件（例如 `context:`、`###` 和 `Transcribe the audio.`）在到达会议存储或代理输入之前被视为不含语音的完整音频。包含这些单词的实质性文本将被保留。这一事实与可用的转录文本和附件显示标记是分开的。较旧的 SDK 结果中缺少字段意味着处理未知。对于Discord批量语音，已知的省略输入会阻止部分话语成为对话命令或主动运行控制；有效捕获的笔记仍然保存。

## <a id="auto-detection-(default)"></a><a id="auto-detection-default"></a> 自动检测（默认）

如果你没有配置模型，并且 `tools.media.audio.enabled` 不是 `false`，OpenClaw 会按以下顺序自动检测，并在找到第一个可用选项时停止：

1. **活动回复模型**，当其提供商支持音频理解时。
2. **配置的提供者身份验证** — 具有可用于支持音频转录的提供者的身份验证的任何 `models.providers.*` 条目。这是在本地 CLI 之前检查的，因此配置的 API 密钥始终胜过 `PATH` 上的本地二进制文件。配置多个时提供商优先级：Groq、OpenAI、xAI、Deepgram、Google、SenseAudio、ElevenLabs、Mistral。
3. **本地 CLI**（仅当未解决提供商身份验证时）。 OpenClaw 构建一个有序的后备列表：
   - `whisper-cli`，仅当当前进程中先前的某次模型调用观察到 Metal 或 CUDA 时，才会在 CPU 默认项之前使用
   - `sherpa-onnx-offline`，使用其默认 CPU 提供商（需要 `SHERPA_ONNX_MODEL_DIR`，其中包含 `tokens.txt`、`encoder.onnx`、`decoder.onnx` 和 `joiner.onnx`）
   - `whisper-cli`，当 Metal/CUDA 仅具备构建能力，或者所选后端否则未被观察到时
   - Apple 芯片上的 `parakeet-mlx`（支持 MLX-；器件使用情况尚未观察到）
   - `whisper`（Python CLI；会自动下载模型）

Install/link 出处是能力证据，而不是执行证据。它本身永远不会将候选人移至 CPU 夏尔巴协作之前。 OpenClaw 在设置或状态检查期间不会加载模型，只是为了检查后端。自动检测到的 whisper.cpp 保持其正常模型运行日志启用，以便 OpenClaw 可以记录上游 `using … backend` 线路。显式 CLI 条目保留其配置的输出标志。

Gemini CLI 和 Antigravity 不会针对媒体理解进行自动检测。音频不会使用上述本地二进制文件之外的 CLI 回退选项。

要禁用自动检测，请设置 `tools.media.audio.enabled: false`。要进行自定义，请向 `tools.media.models` 添加带有能力标签的条目。

<Note>
在 macOS/Linux/Windows. 上尽最大努力进行二进制检测确保 CLI 位于 `PATH` 上（`~` 已展开），或设置具有完整命令路径的显式 CLI 模型。
</Note>

在不转写音频的情况下检查本地选择：

```bash
openclaw capability audio providers
openclaw doctor --lint --only core/doctor/local-audio-acceleration --severity-min info
```

提供商库存报告独立于全局提供商选择的本地后备获胜者，以及有能力的、请求的和观察到的后端字段。转录运行后，`/status` 报告媒体行中请求或观察到的后端。支持显式音频的 `tools.media.models` CLI 条目仍会绕过自动选择；使用特定于后端的标志，例如 sherpa `--provider=cuda` 或 whisper.cpp `--no-gpu`/`--device`.

## <a id="openai-transcription-alongside-chatgpt%2Fcodex-oauth"></a><a id="openai-transcription-alongside-chatgpt/codex-oauth"></a> OpenAI 与 ChatGPT/Codex OAuth 一起转录

OpenAI 音频使用标准 `/v1/audio/transcriptions` 端点以及选定的 API-key 或 ChatGPT/Codex OAuth 配置文件。 OAuth登录可以在账户允许的情况下进行转录；访问、配额和计费仍然是特定于帐户的。默认模型为`gpt-4o-transcribe`；配置的模型、提示和语言提示通过任一凭证类的相同多部分请求发送。自定义端点和请求覆盖需要 API-key 配置文件。

当 OpenAI 插件在上传音频之前拒绝身份验证或配置时，自动选择可以尝试其他提供商或本地后端。拒绝在尝试结果中仍然可见；缺少凭据只会让该候选人无法获得。一旦提供商尝试转录，就会报告上传或 HTTP 失败，而不会自动将录音发送给另一个提供商或切换凭证类别。显式模型列表保留其配置的后备顺序。

除非明确选择配置文件或 OAuth 身份验证模式，否则创作的 OpenAI 提供程序密钥优先于音频的环境 OAuth。要保持音频计费明确分开，同时将 OAuth 保留在普通文本和推理的首位，请创建专用的 API-key 配置文件，并仅在音频模型条目上选择它。这是可选的；仅仅选择转录模型并不需要 API 密钥。

对每个可以接收音频的代理重复这些步骤。对于单代理安装，请为该代理运行一次。

1. 列出代理的 OpenAI 配置文件，以便您可以复制准确的 OAuth 配置文件 ID：

   ```bash
   openclaw models auth list --agent AGENT_NAME_HERE --provider openai
   ```

2. 创建专用的API-密钥配置文件。该命令提示输入密钥；将其粘贴到提示符中，而不是将其放入命令行中：

   ```bash
   openclaw models auth paste-api-key --agent AGENT_NAME_HERE --provider openai --profile-id openai:CUSTOM_PROFILE_NAME_HERE
   ```

   示例：

   ```bash
   openclaw models auth paste-api-key --agent smith --provider openai --profile-id openai:audio
   ```

3. 在代理的 OpenAI 身份验证顺序中，将 OAuth 配置文件放在第一位，将音频 API-key 配置文件放在第二位。将第一个配置文件 ID 替换为 list 命令报告的确切的 OAuth 配置文件 ID：

   ```bash
   openclaw models auth order set --agent AGENT_NAME_HERE --provider openai openai:YOUR_OPENAI_ACCOUNT_EMAIL_ADDRESS openai:CUSTOM_PROFILE_NAME_HERE
   ```

   示例：

   ```bash
   openclaw models auth order set --agent smith --provider openai openai:youremailaddress@email.com openai:audio
   ```

4. 配置 OpenAI 转录模型并显式选择 API-key 配置文件：

   ```json5
   {
     tools: {
       media: {
         models: [
           {
             provider: "openai",
             model: "gpt-4o-transcribe",
             profile: "openai:audio",
             baseUrl: "https://api.openai.com/v1",
             capabilities: ["audio"],
           },
         ],
         audio: { enabled: true },
       },
     },
   }
   ```

   如果您选择了不同的自定义配置文件名称，请在 `profile` 中使用确切的配置文件 ID。您也可以将模型替换为 `gpt-4o-mini-transcribe`。

当 OpenClaw 可以明确选择兼容的 API-key 配置文件时，不需要 `profile` 字段，但强烈建议这样做。如果现在存在或稍后添加另一个 OpenAI API-key 配置文件，显式选择会保持音频路由固定。对于普通提供商解析，身份验证顺序仍然首先保留 OAuth 配置文件。

<Warning>
不要仅设置 `models.providers.openai.apiKey` 以在使用 ChatGPT/Codex OAuth 进行正常推理的安装上启用转录。该设置是提供商范围内的，而不是仅限于音频模型条目。
</Warning>

## <a id="config-examples"></a> 配置示例

### <a id="provider-%2B-cli-fallback-(openai-%2B-whisper-cli)"></a><a id="provider-+-cli-fallback-openai-+-whisper-cli"></a> 提供方 + CLI 兜底（OpenAI + Whisper CLI）

```json5
{
  tools: {
    media: {
      models: [
        { provider: "openai", model: "gpt-4o-transcribe", capabilities: ["audio"] },
        {
          type: "cli",
          command: "whisper",
          args: ["--model", "base", "{{AttachmentPath}}"],
          timeoutSeconds: 45,
          capabilities: ["audio"],
        },
      ],
      audio: { enabled: true, preferredModel: "openai/gpt-4o-transcribe" },
    },
  },
}
```

### <a id="provider-only-(deepgram)"></a><a id="provider-only-deepgram"></a> 仅提供方（Deepgram）

```json5
{
  tools: {
    media: {
      models: [{ provider: "deepgram", model: "nova-3", capabilities: ["audio"] }],
      audio: { enabled: true },
    },
  },
}
```

### <a id="provider-only-(mistral-voxtral)"></a><a id="provider-only-mistral-voxtral"></a> 仅提供方（Mistral Voxtral）

```json5
{
  tools: {
    media: {
      models: [{ provider: "mistral", model: "voxtral-mini-latest", capabilities: ["audio"] }],
      audio: { enabled: true },
    },
  },
}
```

### <a id="provider-only-(senseaudio)"></a><a id="provider-only-senseaudio"></a> 仅提供方（SenseAudio）

```json5
{
  tools: {
    media: {
      models: [
        {
          provider: "senseaudio",
          model: "senseaudio-asr-pro-1.5-260319",
          capabilities: ["audio"],
        },
      ],
      audio: { enabled: true },
    },
  },
}
```

### <a id="echo-transcript-to-chat-(opt-in)"></a><a id="echo-transcript-to-chat-opt-in"></a> 将转写结果回显到聊天（可选启用）

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        echoTranscript: true,
        echoFormat: '📝 "{transcript}"',
      },
    },
  },
}
```

## <a id="notes-and-limits"></a> 注意和限制

- Provider 身份验证遵循标准模型身份验证顺序（身份验证配置、环境变量、`models.providers.*.apiKey`）。
- Groq 配置详情：[Groq](/providers/groq)。
- 当使用 `provider: "deepgram"` 时，Deepgram 会拾取 `DEEPGRAM_API_KEY`。设置详细信息：[Deepgram](/providers/deepgram)。
- Mistral 配置详情：[Mistral](/providers/mistral)。
- 当使用 `provider: "senseaudio"` 时，SenseAudio 会拾取 `SENSEAUDIO_API_KEY`。设置详细信息：[SenseAudio](/providers/senseaudio)。
- 音频提供商可以使用 `tools.media.audio` 下的默认值或覆盖 `baseUrl`、`headers`、`providerOptions` 及其 `tools.media.models[]` 条目的限制。
- 保留 `tools.media.audio.language` 未设置以进行语言自动检测。提供者转录请求省略了隐含的“转录音频”。提示，包括选择英语时；保留明确的自定义提示和语言提示。使用音频语言中的上下文或拼写转录提示，而不是向下游代理发出指令。
- 内置音频大小上限为 20MB。条目级别的 `maxBytes` 覆盖值可以修改该上限；超大音频会被该模型跳过，并尝试下一个条目。
- 在 provider/CLI 转录之前会跳过低于 1024 字节的音频文件。
- 音频的默认 `maxChars` **未设置**（完整转录）。设置 `tools.media.audio.maxChars` 或每个条目的 `maxChars` 可截短输出。
- OpenAI 自动检测默认为 `gpt-4o-transcribe`；将 `model: "gpt-4o-mini-transcribe"` 设置为 cheaper/faster 选项。
- 转录内容可通过 `{{Transcript}}` 提供给模板。
- `tools.media.audio.echoTranscript` 默认关闭；`echoFormat` 接受 `{transcript}` 占位符。
- CLI 标准输出上限为 5MB；请保持 CLI 输出简洁。
- CLI `args` 应使用 `{{AttachmentPath}}` 作为本地音频文件路径。运行 `openclaw doctor --fix` 以从较旧的 `audio.transcription.command` 配置迁移已弃用的 `{input}` 占位符（已淘汰的密钥：`audio.transcription`，由 `tools.media.models` 替换）。 `{{MediaPath}}` 仍然是已弃用的兼容性别名。
- `tools.media.concurrency` 限制媒体任务数量；它不是 GPU 调度器。

### <a id="resident-local-stt"></a> 常驻本地 STT

自动检测到的本地 STT 仍按请求进行处理。 OpenClaw 不管理常驻 whisper.cpp 服务器，因为标准 Homebrew `whisper-cpp` 包禁用该服务器，而上游示例没有配置有界准入队列。插件拥有的驻留生命周期需要一个维护的打包工作程序，具有 health/startup、模型驻留、有界队列、cancellation/timeout、仅环回无身份验证操作，并且在安全启用之前没有云回退。

### <a id="proxy-environment-support"></a> 代理环境支持

基于 Provider 的音频转写会遵循标准的出站代理环境变量，行为与 undici 的 `EnvHttpProxyAgent` 语义一致：

- `HTTPS_PROXY` / `https_proxy`
- `HTTP_PROXY` / `http_proxy`
- `ALL_PROXY` / `all_proxy`

小写变量优先于大写；`NO_PROXY`/`no_proxy` 条目（主机名、`*.suffix` 或 `host:port`）会绕过代理。如果未设置代理环境变量，则直接访问。如果代理设置失败（URL 格式错误），OpenClaw 会记录警告并回退到直接 fetch。

## <a id="mention-detection-in-groups"></a> 群组中的提及检测

在支持音频预检的通道上，当 `requireMention: true` 设置为群聊时，OpenClaw 会在 **之前转录音频**，检查提及情况。当无字幕语音注释的文字记录包含配置的提及模式时，这可以让其通过提及门。特定于通道的文档描述了需要键入提及的传输。

**工作方式：**

1. 如果语音消息没有文本正文，并且群组要求提及，OpenClaw 会先对第一个音频附件进行预检转写。
2. 系统会检查转写内容中的提及模式（例如 `@BotName`、表情触发）。
3. 如果检测到提及，消息会继续进入完整的回复流程。

**回退行为：**如果预检转写失败（超时、API 错误等），消息会回退到仅文本提及检测，因此混合消息（文本 + 音频）不会被丢弃。

**根据 Telegram group/topic：** 选择退出

- 为该群组设置 `channels.telegram.groups.<chatId>.disableAudioPreflight: true`，可跳过预检转写提及检查。
- 设置 `channels.telegram.groups.<chatId>.topics.<threadId>.disableAudioPreflight` 可按话题覆盖（`true` 表示跳过，`false` 表示强制启用）。
- 默认值为 `false`（当满足提及门控条件时启用预检）。

**示例：** 用户发送语音留言说“嘿 @Claude，天气怎么样？”与 `requireMention: true` 位于 Telegram 组中。语音注释被转录，提及被检测，并且代理回复。

## <a id="gotchas"></a> 注意事项

- 范围规则采用“首个匹配优先”；`chatType` 会被规范化为 `direct`、`group` 或 `channel`。
- 检查你的CLI是否退出0并打印纯文本； JSON 输出需要通过 `jq -r .text` 进行按摩。
- 已知的文件输出模式是权威的：空的或丢失的推断转录本文件不会生成转录本，而不是回退到 CLI 进度输出。
- 对于 `parakeet-mlx`，请使用 `--output-format txt`（或 `all`）配合 `--output-dir` 和默认的 `{filename}` 输出模板。上游的 `PARAKEET_OUTPUT_FORMAT` 和 `PARAKEET_OUTPUT_TEMPLATE` 环境变量也会被遵循。OpenClaw 读取 `<output-dir>/<media-basename>.txt`；默认的 `srt` 格式、其他格式以及自定义输出模板仍会使用 stdout。
- 保持超时合理（`timeoutSeconds`，默认60秒）以避免阻塞回复队列。
- Preflight 转录仅处理 **first** 未转录音频附件以进行提及检测，即使主阶段更喜欢最后一个附件或处理所有附件也是如此。附加音频附件在主要媒体理解阶段遵循配置的策略；空预检结果不会将附件标记为已转录。
- 当后续媒体或链接处理添加上下文时，预检记录将保留在面向模型的消息中。单独的通道包络不会取代准备好的文本。

## <a id="related"></a> 相关内容

- [媒体播放](/nodes/media-playback)
- [媒体理解](/nodes/media-understanding)
- [对话模式](/nodes/talk)
- [语音唤醒](/nodes/voicewake)
- [媒体概述](/tools/media-overview) — 媒体工具如何组合在一起
