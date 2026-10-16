---
summary: "与提供商的入站 image/audio/video 了解（可选）+ CLI 后备"
read_when:
  - "设计或重构媒体理解"
  - "调整入站 audio/video/image 预处理"
title: "媒体理解"
sidebarTitle: "媒体理解"
---

OpenClaw 可以在回复管道运行之前汇总入站媒体 （image/audio/video），因此命令解析和路由基于短文本而不是原始字节。了解自动检测本地工具或提供程序密钥，或者您可以配置显式模型。在 OpenClaw- 托管回复路径中，成功描述的图像由文本表示，而不是再次作为本机图像附加。失败、禁用或未选择的图像仍然有资格进行正常的本机图像交付；理解错误不会阻止回复。

供应商插件会注册能力元数据（哪个提供方支持哪种媒体类型、默认模型、优先级）。OpenClaw 核心负责共享的 `tools.media` 配置、回退顺序以及回复流水线集成。

## <a id="how-it-works"></a> 工作原理

<Steps>
  <Step id="collect-attachments" title="收集附件">
    收集有序的传入媒体信息（`path`、`url`、`contentType` 和 `kind`）。
  </Step>
  <Step id="select-per-capability" title="按功能选择">
    对于每个启用的功能 （image/audio/video），根据 `attachments` 策略选择附件（默认值：仅第一个附件）。
  </Step>
  <Step id="choose-a-model" title="选择模型">
    选取第一个符合条件的模型条目（大小 + 能力 + 认证可用）。
  </Step>
  <Step id="fall-back-on-failure" title="失败后退缩">
    如果某个模型报错、超时，或者媒体超过 `maxBytes`，则尝试下一个条目。
  </Step>
  <Step id="apply-on-success" title="申请成功">
    `Body` 会变为一个 `[Image]`、`[Audio]` 或 `[Video]` 块。音频还会设置 `{{Transcript}}`；命令解析在存在字幕文本时使用字幕文本，否则使用转写内容。字幕会作为块内的 `User text:` 保留。
  </Step>
</Steps>

## <a id="config"></a> 配置

`tools.media` 持有一个按能力标记的模型列表，以及少量按能力控制项：

```json5
{
  tools: {
    media: {
      concurrency: 2, // max concurrent capability runs (default)
      models: [
        { provider: "openai", model: "gpt-4o-mini-transcribe", capabilities: ["audio"] },
        { provider: "google", model: "gemini-3-flash-preview", capabilities: ["image", "video"] },
      ],
      image: { preferredModel: "google/gemini-3-flash-preview" },
      audio: { enabled: true },
      video: { enabled: true },
    },
  },
}
```

按能力（`image`/`audio`/`video`）的键：

| 键              | 类型      | 默认值                                | 笔记                                                                |
| ---------------- | --------- | -------------------------------------- | -------------------------------------------------------------------- |
| `enabled`        | `boolean` | 自动（`false` 禁用）                | 将 `false` 设置为关闭该能力的自动检测              |
| `preferredModel` | `string`  | 第一个兼容条目                 | 优先使用 `provider/model`、model id、`provider:<id>` 或 `cli:command` |
| `prompt`         | `string`  | 能力默认值                     | 当某个条目未覆盖时使用的默认提示词                    |
| `maxChars`       | `number`  | `500` image/video，未设置音频         | 默认输出限制                                                 |
| `maxBytes`       | `number`  | 图像为 10MB，音频为 20MB，视频为 50MB     | 默认输入限制                                                  |
| `timeoutSeconds` | `number`  | `60` image/audio、`120` 视频          | 默认请求超时                                              |
| `language`       | `string`  | 未设置                                  | 音频转写提示                                             |
| `scope`          | 目的    | 未设置                                  | 按 channel/chat type/source key 进行门控                                 |
| `attachments`    | 目的    | `{ mode: "first", maxAttachments: 1 }` | 选择要处理的匹配附件                      |
| `echoTranscript` | `boolean` | `false`                                | 仅音频：在代理处理前回显转写内容              |
| `echoFormat`     | `string`  | `'📝 "{transcript}"'`                  | 仅音频：回显转写内容的格式                         |

提示、限制、语言提示、请求覆盖和提供程序选项可以设置为功能默认值或在各个 `tools.media.models[]` 条目上覆盖。当未配置显式模型时，功能默认值还涵盖自动检测的提供程序。模型列表选择运行哪些条目；它不会隐藏其他启用的提供程序以防止提供程序发现。

### <a id="model-entries"></a> 模型条目

每个 `models[]` 条目都是一个 **提供方** 条目（默认）或一个 **CLI** 条目：

<Tabs>
  <Tab id="provider-entry" title="提供商条目">
    ```json5
    {
      type: "provider", // default if omitted
      provider: "openai",
      model: "gpt-6-astra",
      prompt: "Describe the image in <= 500 chars.",
      maxChars: 500,
      maxBytes: 10485760,
      timeoutSeconds: 60,
      capabilities: ["image"],
      profile: "vision-profile",
      preferredProfile: "vision-fallback",
    }
    ```
  </Tab>
  <Tab id="cli-entry" title="CLI 条目">
    ```json5
    {
      type: "cli",
      command: "gemini",
      args: [
        "-m",
        "gemini-3-flash",
        "--allowed-tools",
        "read_file",
        "Read the media at {{AttachmentPath}} and describe it in <= {{MaxChars}} characters.",
      ],
      maxChars: 500,
      maxBytes: 52428800,
      timeoutSeconds: 120,
      capabilities: ["video", "image"],
    }
    ```

    占位符按字面意思替换到每个参数中，未设置的占位符将成为 **空参数** 而不是被删除。 `{{Language}}` 仅针对音频填充，当从请求解析语言时，条目的 `language` 或 `tools.media.audio.language`；如果未设置，`["--language", "{{Language}}"]` 将作为 `--language ""` 运行。拒绝空语言的转录者应该忽略标志及其值，并依赖于自动检测。 `{{Prompt}}` 回退到内置默认提示，因此通常会填充。同样的空替换适用于任何其他没有值的占位符，例如 `{{AttachmentContentType}}` 表示没有 MIME 类型的附件。

    CLI 模板还可以使用 `{{AttachmentUrl}}`、`{{AttachmentContentType}}`、`{{AttachmentDir}}`、`{{AttachmentIndex}}`、`{{OutputDir}}`（为此运行创建的临时目录）和 `{{OutputBase}}`（临时文件基本路径，无扩展名）。 `{{Attachment*}}` 名称替换了 2026.8.1. 中的 `{{MediaPath}}`、`{{MediaUrl}}`、`{{MediaType}}` 和 `{{MediaDir}}` 旧名称在 `media-legacy-projection` 记录下仍然不推荐使用兼容性别名：其批准的 `removeAfter` 日期为2026 年 10 月 1 日，删除还通过干净的已发布插件工件扫描进行控制。在该日期之前迁移 - 请参阅 [Media 旧投影](/plugins/sdk-migration/compatibility-policy#media-legacy-projection)。

  </Tab>
</Tabs>

CLI 条目需要非空 `command` 和非空 `args` 列表。参数仍然是带有可选模板插值的文字字符串；支持现有的文字文件路径和自定义包装器参数。通过 `{{AttachmentPath}}` 等模板或命令的现有输入协定传递附件。不支持空参数列表，因为 OpenClaw 不会将附件提供给 CLI 标准输入。 `openclaw doctor` 报告丢失的命令或参数以及确切的配置路径和手动修复；它不会发明命令或重写这些条目。在运行时，不完整的条目会记录失败而不启动二进制文件，并尝试下一个配置的模型。如果没有成功，附件将获得失败结果并记录警告。配置验证仍然允许这些字段，因此现有配置在更新后仍然可以启动网关。

仅当 CLI 需要文件路径时，远程附件才会暂存为临时文件。媒体理解运行拥有这些文件并在处理后删除它们；失败的暂存尝试会使其他暂存附件可用。现有的本地附件将被读取并保留。

### <a id="provider-credentials"></a> 提供者凭证

提供方媒体理解使用与普通模型调用相同的认证解析方式：认证配置文件、环境变量，然后是 `models.providers.<providerId>.apiKey`。`tools.media.models[]` 条目不接受内联的 `apiKey` 字段。

```json5
{
  models: {
    providers: {
      openai: { apiKey: "<OPENAI_API_KEY>" },
      moonshot: { apiKey: "<MOONSHOT_API_KEY>" },
    },
  },
}
```

有关配置文件、环境变量和自定义基本 URL，请参阅 [ 工具和自定义提供程序](/gateway/config-tools)。

## <a id="rules-and-behavior"></a> 规则和行为

- 超过 `maxBytes` 的媒体会跳过该模型并尝试下一个。
- 1024字节以下的音频文件被视为empty/corrupt并在转录前跳过；代理会得到一个固定的占位符记录。
- 如果当前主图像模型已原生支持视觉，OpenClaw 会跳过 `[Image]` 摘要块，并将原始图像直接传给模型。MiniMax 是个例外：`minimax`、`minimax-cn`、`minimax-portal` 和 `minimax-portal-cn` 始终通过插件拥有的 `MiniMax-VL-01` 媒体提供方来处理图像理解，即使旧版 MiniMax M2.x 聊天元数据声称支持图像输入（只有 `MiniMax-M3` 及之后版本才被视为原生具备视觉能力）。
- 如果 Gateway/WebChat 主模型仅包含文本，则图像附件将保留为卸载的 `media://inbound/*` 引用，以便 image/PDF 工具或配置的图像模型仍然可以检查它们，而不会丢失附件。
- 显式执行 `openclaw infer image describe --file <path> --model <provider/model>`（别名：`openclaw capability image describe`）会直接运行该支持图像的 provider/model，包括诸如 `ollama/qwen2.5vl:7b` 之类的 Ollama 引用，只要在 `models.providers.ollama.models[]` 下配置了匹配的支持图像模型。
- 如果 `<capability>.enabled` 不为 `false` 但未配置任何模型，OpenClaw 会在活动回复模型的 provider 支持该能力时尝试使用该模型。

### <a id="auto-detect-(default)"></a><a id="auto-detect-default"></a> 自动检测（默认）

当 `tools.media.<capability>.enabled` 不为 `false` 且未配置任何模型时，OpenClaw 会按以下顺序尝试，并在第一个可用选项处停止：

<Steps>
  <Step id="configured-image-model-image-only" title="配置的图像模型（仅图像）">
    `agents.defaults.imageModel` primary/fallback 参考，除非主动回复模型已经原生支持视觉。更喜欢 `provider/model` 参考文献；仅当匹配是唯一的时，裸引用才符合配置的支持图像的提供程序模型条目的资格。
  </Step>
  <Step id="active-reply-model" title="主动回复模型">
    当前活动回复模型，在其 provider 支持该能力时。
  </Step>
  <Step id="provider-auth-audio-only%2C-before-local-clis" title="提供商身份验证（仅音频，在本地 CLI 之前）">
    在本地 CLI 之前尝试配置的支持音频的 `models.providers.*` 条目。捆绑的提供商优先顺序（按提供商 ID 的字母顺序排列）： Groq/OpenAI &rarr; xAI &rarr; Deepgram &rarr; OpenRouter &rarr; Google/SenseAudio &rarr; Deepinfra/ElevenLabs &rarr; Mistral。
  </Step>
  <Step id="local-clis-audio-only" title="本地 CLI（仅限音频）">
    已就绪的本地二进制文件会成为一个有序的后备列表：
    - `whisper-cli` 仅在当前进程中较早的一次模型调用观察到 Metal 或 CUDA 后才会优先使用
    - CPU-默认 `sherpa-onnx-offline`（需要 `SHERPA_ONNX_MODEL_DIR` 和 `tokens.txt`/`encoder.onnx`/`decoder.onnx`/`joiner.onnx`）
    - 当加速仅表现为具备构建能力或尚未被观察到时使用 `whisper-cli`
    - Apple 芯片上的 `parakeet-mlx`（支持 MLX-，设备使用未观察到）
    - `whisper`（Python CLI；默认使用 `turbo` 模型，并会自动下载）

    后端能力检查会被缓存且不会加载模型。构建能力、请求的后端标志，以及从真实调用中观察到的后端，彼此保持独立。自动检测到的 whisper.cpp 会保持模型运行日志开启，以便记录上游选择的后端行。显式 CLI 条目会保留其配置顺序、后端标志和输出标志。

  </Step>
  <Step id="provider-auth-image%2Fvideo" title="提供商授权 （image/video）">
    先尝试已配置的、支持该能力的 `models.providers.*` 条目，再尝试内置回退顺序。仅图像的配置 provider 如果有一个支持图像的模型，即使它不是内置厂商插件，也会自动注册用于媒体理解。

    内置 provider 优先级顺序（并列时按 provider id 字母顺序打破平局）：
    - 图片：Anthropic/OpenAI &rarr; Google &rarr; MiniMax &rarr; Deepinfra &rarr; MiniMax 门户 &rarr; Z.AI
    - 视频：Google &rarr; Qwen &rarr; Moonshot

  </Step>
</Steps>

要为某个能力禁用自动检测：

```json5
{
  tools: {
    media: {
      audio: {
        enabled: false,
      },
    },
  },
}
```

<Note>
macOS/Linux/Windows 中的二进制检测是尽力而为的；将 CLI 放在 `PATH` 上（`~` 已展开），或者使用完整命令路径设置显式 CLI 模型条目。
</Note>

### <a id="proxy-support-(audio%2Fvideo-provider-calls)"></a><a id="proxy-support-audio/video-provider-calls"></a> 代理支持（audio/video提供商调用）

基于提供程序的 **audio** 和 **video** 理解遵循标准出站代理环境变量，包括 `NO_PROXY`/`no_proxy` 绕过规则：`HTTPS_PROXY`、`HTTP_PROXY`、`ALL_PROXY`、 `https_proxy`、`http_proxy`、`all_proxy`。小写变量优先于大写变量。如果未设置，媒体理解将使用直接出口；如果代理值格式错误，OpenClaw 会记录警告并回退到直接获取。图像理解不经过此代理路径。

## <a id="capabilities"></a> 功能

在 `models[]` 条目上设置 `capabilities` 以将其限制为特定媒体类型。对于共享列表，OpenClaw 推断每个捆绑提供程序的默认值：

| 提供者                                                                 | 功能          |
| ------------------------------------------------------------------------ | --------------------- |
| `openai`, `anthropic`, `minimax`                                         | 图像                 |
| `minimax-portal`                                                         | 图像                 |
| `moonshot`                                                               | 图像 + 视频         |
| `openrouter`                                                             | 图像 + 音频         |
| `google` (Gemini API)                                                    | 图像 + 音频 + 视频 |
| `qwen`                                                                   | 图像 + 视频         |
| `deepinfra`                                                              | 图像 + 音频         |
| `mistral`                                                                | 音频                 |
| `zai`                                                                    | 图像                 |
| `groq`, `xai`, `deepgram`, `senseaudio`                                  | 音频                 |
| 任何包含支持图像模型的 `models.providers.<id>.models[]` 目录 | 图像                 |

CLI 条目需要显式 `capabilities`；没有有效功能标签的条目将被跳过。没有有效显式标签的提供者条目使用其注册的功能元数据。

## <a id="provider-support-matrix"></a> 提供方支持矩阵

| 能力 | 供应商                                                                                                                                               | 笔记                                                                                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 图像      | Anthropic、Codex 应用程序服务器、Deepinfra、Google、MiniMax、MiniMax 门户、Moonshot、OpenAI、OpenAI Codex OAuth、 OpenRouter、Qwen、Z.AI、配置提供程序 | 供应商插件注册图像支持； `openai/*`可以使用API-key或Codex OAuth路由； `codex/*` 使用有界的 Codex 应用程序服务器轮次；支持图像的配置提供程序自动注册。 |
| 音频      | Deepgram、Deepinfra、ElevenLabs、Google、Groq、Mistral、OpenAI、OpenRouter、SenseAudio、xAI                                                             | 提供方转写（Whisper/Groq/xAI/Deepgram/OpenRouter STT/Gemini/SenseAudio/Scribe/Voxtral）。                                                                                     |
| 视频      | Google, Moonshot, Qwen                                                                                                                                  | 通过厂商插件进行提供方视频理解；Qwen 视频理解使用标准 DashScope 端点。                                                                        |

<Note>
**MiniMax 注**：`minimax`、`minimax-cn`、`minimax-portal` 和 `minimax-portal-cn` 的图像理解始终来自插件拥有的 `MiniMax-VL-01` 媒体提供方，即使旧版 MiniMax M2.x 聊天元数据声称支持图像输入。
</Note>

## <a id="model-selection-guidance"></a> 模型选择指南

- 当质量和安全性至关重要时，请针对每种媒体能力，优先选择当前一代中最强大的模型。
- 对于处理不受信任输入的支持工具的代理，请避免使用 older/weaker 媒体模型。
- 为可用性的每项功能至少保留一个后备（质量模型 + faster/cheaper 模型）。
- CLI 后备（`whisper-cli`、`whisper`、`gemini`）在提供程序 API 不可用时提供帮助。
- 已知的文件输出模式是权威的：空的或丢失的推断转录本文件不会生成转录本，而不是回退到 CLI 进度输出。
- `parakeet-mlx`：将 `--output-format txt`（或 `all`）与 `--output-dir` 以及默认的 `{filename}` 输出模板结合使用。上游的 `PARAKEET_OUTPUT_FORMAT` 和 `PARAKEET_OUTPUT_TEMPLATE` 环境变量同样会被遵循。OpenClaw 会读取 `<output-dir>/<media-basename>.txt`；默认的 `srt` 格式、其他格式以及自定义输出模板仍会使用 stdout。

## <a id="attachment-policy"></a> 附件策略

按能力配置的 `attachments` 控制会处理哪些附件：

<ParamField path="mode" type='"first" | "all"' default="first">
  仅处理第一个选中的附件，或处理全部附件。
</ParamField>
<ParamField path="maxAttachments" type="number" default="1">
  限制处理数量。
</ParamField>
<ParamField path="prefer" type='"first" | "last" | "path" | "url"'>
  在候选附件中的选择偏好。
</ParamField>

当 `mode: "all"` 时，输出会标记为 `[Image 1/2]`、`[Audio 2/2]` 等。

本地附件保留在会话允许的媒体根中。当打开的文件保留在这些根目录中时，会接受诸如 macOS、`/tmp` 和 `/private/tmp` 之类的目录别名；他们不授予对同级沙箱工作区的访问权限。

### <a id="file-attachment-extraction"></a> 文件附件提取

- 每个传入的文档附件最终都会出现在模型可见的文件块中。被路由到图像、音频或视频理解的附件不受此约定约束；这些阶段负责处理各自的结果。
- 提取的文件文本会在追加到媒体提示词之前，被包装为不受信任的外部内容，并使用类似 `<<<EXTERNAL_UNTRUSTED_CONTENT id="...">>>` / `<<<END_EXTERNAL_UNTRUSTED_CONTENT id="...">>>` 的边界标记，以及一行 `Source: External` 元数据。
- 此路径有意省略一行数据边界注释，以保持媒体提示简短；边界标记和元数据仍然适用。
- 仅当回复运行时证明它可以读取主机本地路径（当前非沙盒嵌入式会话）时，保存在本地磁盘上的不受支持的文件才会获得自助指导。该路径被隔离为不受信任的外部元数据；可信指南告诉代理使用自己的工具提取文件，现代 Office 文件会获得解压缩提示。通用 ACP 后端、URL-only 附件和沙盒会话保留普通 `[Unsupported document format: <mime>. PDF and plain-text attachments can be read.]` 标记。
- 被操作员配置的允许列表拒绝的文件绝不会包含自助处理路径；策略拒绝不得引导代理绕过操作员的决定。
- 被操作员配置的 `allowedMimes` 列表拒绝的文件会改为获得 `[Attachment type not allowed: <mime>]`，这样提示词就不会声称支持当前配置所禁用的类型。
- 读取失败会获得 `[Attachment could not be read]`。
- 当 URL 文件源被禁用时，URL 附件会获得 `[Attachment skipped: URL file sources are disabled]`。
- 没有可提取文本的 A 文件（包括空的本地文本文件）将获取 `[No extractable text]` 并且不消耗跳过标记预算。
- 每条消息最多渲染五个跳过标记；后续被跳过的附件会合并为一个与原因无关的 `[<n> more attachments skipped]` 摘要，从而避免垃圾附件无限增加提示词。文件标记以及图像、音频或视频标记共享这五个标记的额度。
- 如果 PDF 回退为渲染后的页面图像，OpenClaw 会将这些图像转发给具备视觉能力的回复模型，并在文件块中保留占位符 `[PDF content rendered to images]`。
- 如果页面、文本或图像限制导致文档提取不完整，则文件块以有界的 `[Partial document: ...]` 标记开头，以便回复模型不会将可见前缀误认为是完整附件。
- 图像、音频和视频决策会为每个附件候选记录一个已关闭的处置结果：已处理、已交给原生视觉、达到附件限制后未选中、已禁用、缺少模型、被聊天范围拒绝或失败。
- 未处理的媒体获得有界的模型可见标记。传递给原生视觉的图像不会添加标记。当本机harness拥有转弯并且 OpenClaw 仅运行音频预处理时，失败或跳过的音频仍然会获得标记；图像、视频和文档输入仍归harness所有。太小的音频会保留其占位符转录而没有重复标记。

## <a id="vision-models-and-image-replay-cost"></a> Vision模型和图像回放成本

在 OpenClaw- 托管回复路径中，具有视觉功能的回复模型通常会接收本机图像，而无需单独的描述通道。后续请求中保留的图像可能会增加投入成本；数量取决于提供者和活动运行时的上下文处理。有关适用的清理行为，请参阅 [Session pruning](/concepts/session-pruning#legacy-image-cleanup)。

对于不需要持续像素访问的识别或提取任务，即使回复模型支持视觉，`tools.media.models[]` 中具有图像功能的条目也会选择图像理解。对于成功描述的每个选定图像，回复会收到描述文本来代替该本机图像。这并不能保证每个附加图像都会被转换或以后的请求不包含图像。

```json5
{
  tools: {
    media: {
      models: [{ provider: "google", model: "gemini-3-flash-preview", capabilities: ["image"] }],
    },
  },
}
```

权衡和边界：

- Selection 默认仅选择第一个匹配图像。使用现有的 `tools.media.image.attachments` 策略选择更多，并具有明确的 `maxAttachments` 上限。失败或未选择的图像仍可以本地交付。
- A 成功描述会替换当前回复回合中该图像的像素。当回复模型需要直接检查像素时，例如屏幕截图、UI 审查或可视化调试，请避免这种情况。
- 具有显式图像功能的 `tools.media.models[]` 条目会覆盖本机视觉跳过，但须遵守现有的启用、范围、大小和附件限制。 `tools.media.image.preferredModel` 本身不会覆盖该跳过。
- `tools.media.image.enabled: false` 禁用图像理解；它不会禁用本机图像传输。
- 这描述了OpenClaw-托管预处理。拥有图像处理功能的本机工具有自己的交付和上下文规则；不要假设此设置控制其图像重播或计费。

## <a id="config-examples"></a> 配置示例

<Tabs>
  <Tab id="shared-models-%2B-overrides" title="共享模型+覆盖">
    ```json5
    {
      tools: {
        media: {
          models: [
            { provider: "openai", model: "gpt-6-astra", capabilities: ["image"] },
            {
              provider: "google",
              model: "gemini-3-flash-preview",
              capabilities: ["image", "audio", "video"],
            },
            {
              type: "cli",
              command: "gemini",
              args: [
                "-m",
                "gemini-3-flash",
                "--allowed-tools",
                "read_file",
                "Read the media at {{AttachmentPath}} and describe it in <= {{MaxChars}} characters.",
              ],
              capabilities: ["image", "video"],
            },
          ],
          audio: {
            attachments: { mode: "all", maxAttachments: 2 },
          },
          video: {
            maxChars: 500,
          },
        },
      },
    }
    ```
  </Tab>
  <Tab id="audio-%2B-video-only" title="仅音频+视频">
    ```json5
    {
      tools: {
        media: {
          models: [
            {
              provider: "openai",
              model: "gpt-4o-mini-transcribe",
              capabilities: ["audio"],
            },
            {
              type: "cli",
              command: "whisper",
              args: ["--model", "base", "{{AttachmentPath}}"],
              capabilities: ["audio"],
            },
            {
              provider: "google",
              model: "gemini-3-flash-preview",
              capabilities: ["video"],
            },
            {
              type: "cli",
              command: "gemini",
              args: [
                "-m",
                "gemini-3-flash",
                "--allowed-tools",
                "read_file",
                "Read the media at {{AttachmentPath}} and describe it in <= {{MaxChars}} characters.",
              ],
              capabilities: ["video"],
            },
          ],
          audio: {
            enabled: true,
          },
          video: {
            enabled: true,
            maxChars: 500,
          },
        },
      },
    }
    ```
  </Tab>
  <Tab id="image-only" title="仅图像">
    ```json5
    {
      tools: {
        media: {
          models: [
            { provider: "openai", model: "gpt-6-astra", capabilities: ["image"] },
            { provider: "anthropic", model: "claude-opus-5", capabilities: ["image"] },
            {
              type: "cli",
              command: "gemini",
              args: [
                "-m",
                "gemini-3-flash",
                "--allowed-tools",
                "read_file",
                "Read the media at {{AttachmentPath}} and describe it in <= {{MaxChars}} characters.",
              ],
              capabilities: ["image"],
            },
          ],
          image: {
            enabled: true,
            maxBytes: 10485760,
            maxChars: 500,
          },
        },
      },
    }
    ```
  </Tab>
  <Tab id="multi-modal-single-entry" title="多式联运单次入境">
    ```json5
    {
      tools: {
        media: {
          models: [
            {
              provider: "google",
              model: "gemini-3.1-pro-preview",
              capabilities: ["image", "video", "audio"],
            },
          ],
        },
      },
    }
    ```
  </Tab>
</Tabs>

## <a id="status-output"></a> 状态输出

当媒体理解运行时，`/status` 会包含一行按能力划分的摘要：

```
📎 Media: image ok (openai/gpt-6-astra) · audio ok (whisper-cli observed=metal)
```

自动检测的本地音频工具将其解析的可执行路径报告为结果 `model`，因此状态和详细摘要可以包括该路径以及工具系列和后端。显式 CLI 条目保留其编写的命令；预检清单保留逻辑工具名称。

对于预检清单，请运行 `openclaw capability audio providers`。本地行会单独显示本地回退获胜者，以及全局提供方选择、就绪状态和分别的 capable/requested/observed 后端字段。相同的本地选择也可作为信息性的 doctor 发现项获取：

```bash
openclaw doctor --lint --only core/doctor/local-audio-acceleration --severity-min info
```

## <a id="notes"></a> 说明

- 功能理解尽力而为。错误不会阻止回复。
- 即使禁用功能理解，附件仍会传递给模型。
- 使用 `scope` 来限制功能理解运行的范围（例如，仅限私信）。

## <a id="related"></a> 相关内容

- [配置](/gateway/configuration)
- [图片与媒体支持](/nodes/images)
- [音频和语音笔记](/nodes/audio)
- [相机捕获](/nodes/camera)
- [媒体播放](/nodes/media-playback)
- [对话模式](/nodes/talk)
- [语音唤醒](/nodes/voicewake)
- [Mistral](/providers/mistral) — Voxtral 音频转录，上述支持音频的提供程序之一
- [媒体概述](/tools/media-overview) — 媒体工具如何组合在一起
