---
summary: "可选的入站图像/音频/视频理解（带提供方 + CLI 回退）"
read_when:
  - 设计或重构媒体理解
  - 调整入站音频/视频/图像预处理
title: "媒体理解"
sidebarTitle: "媒体理解"
---

OpenClaw 可以在回复流程运行之前对入站媒体（图像/音频/视频）进行摘要，因此命令解析和路由可以基于简短文本，而不是原始字节。理解功能会自动检测本地工具或提供方密钥，或者你也可以配置显式模型。原始媒体始终会像往常一样传递给模型；当理解失败或被禁用时，回复流程会保持不变地继续。

供应商插件会注册能力元数据（哪个提供方支持哪种媒体类型、默认模型、优先级）。OpenClaw 核心负责共享的 `tools.media` 配置、回退顺序以及回复流水线集成。

## 工作原理

<Steps>
  <Step title="收集附件">
    收集有序的传入媒体信息（`path`、`url`、`contentType` 和 `kind`）。
  </Step>
  <Step title="按能力选择">
    对于每个已启用的能力（图像/音频/视频），根据 `attachments` 策略选择附件（默认：仅第一个附件）。
  </Step>
  <Step title="选择模型">
    选取第一个符合条件的模型条目（大小 + 能力 + 认证可用）。
  </Step>
  <Step title="失败时回退">
    如果某个模型报错、超时，或者媒体超过 `maxBytes`，则尝试下一个条目。
  </Step>
  <Step title="成功后应用">
    `Body` 会变为一个 `[Image]`、`[Audio]` 或 `[Video]` 块。音频还会设置 `{{Transcript}}`；命令解析在存在字幕文本时使用字幕文本，否则使用转写内容。字幕会作为块内的 `User text:` 保留。
  </Step>
</Steps>

## 配置

`tools.media` 持有一个按能力标记的模型列表，以及少量按能力控制项：

```json5
{
  tools: {
    media: {
      concurrency: 2, // 最大并发能力运行数（默认）
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

| Key              | Type      | Default                                | Notes                                                                |
| ---------------- | --------- | -------------------------------------- | -------------------------------------------------------------------- |
| `enabled`        | `boolean` | auto (`false` disables)                | 将 `false` 设置为关闭该能力的自动检测                                   |
| `preferredModel` | `string`  | first compatible entry                 | 优先使用 `provider/model`、model id、`provider:<id>` 或 `cli:command` |
| `prompt`         | `string`  | capability default                     | 当某个条目未覆盖时使用的默认提示词                                       |
| `maxChars`       | `number`  | `500` image/video, unset audio         | 默认输出限制                                                            |
| `maxBytes`       | `number`  | 10MB image, 20MB audio, 50MB video     | 默认输入限制                                                            |
| `timeoutSeconds` | `number`  | `60` image/audio, `120` video          | 默认请求超时                                                            |
| `language`       | `string`  | unset                                  | 音频转写提示                                                            |
| `scope`          | object    | unset                                  | 按 channel/chat type/source key 进行门控                                 |
| `attachments`    | object    | `{ mode: "first", maxAttachments: 1 }` | 选择要处理的匹配附件                                                    |
| `echoTranscript` | `boolean` | `false`                                | 仅音频：在代理处理前回显转写内容                                         |
| `echoFormat`     | `string`  | `'📝 "{transcript}"'`                  | 仅音频：回显转写内容的格式                                              |

提示词、限制、语言提示、请求覆盖项和提供方选项可以作为能力默认值设置，也可以在单独的 `tools.media.models[]` 条目中覆盖。即使未显式配置模型，能力默认值也会覆盖自动检测到的提供方。

### 模型条目

每个 `models[]` 条目都是一个 **提供方** 条目（默认）或一个 **CLI** 条目：

<Tabs>
  <Tab title="提供方条目">
    ```json5
    {
      type: "provider", // 如果省略则默认为此
      provider: "openai",
      model: "gpt-5.6-sol",
      prompt: "用不超过 500 个字符描述图像。",
      maxChars: 500,
      maxBytes: 10485760,
      timeoutSeconds: 60,
      capabilities: ["image"],
      profile: "vision-profile",
      preferredProfile: "vision-fallback",
    }
    ```
  </Tab>
  <Tab title="CLI 条目">
    ```json5
    {
      type: "cli",
      command: "gemini",
      args: [
        "-m",
        "gemini-3-flash",
        "--allowed-tools",
        "read_file",
        "读取位于 {{AttachmentPath}} 的媒体，并用不超过 {{MaxChars}} 个字符进行描述。",
      ],
      maxChars: 500,
      maxBytes: 52428800,
      timeoutSeconds: 120,
      capabilities: ["video", "image"],
    }
    ```

    CLI 模板还可以使用 `{{AttachmentUrl}}`、`{{AttachmentContentType}}`、`{{AttachmentDir}}`、`{{AttachmentIndex}}`、`{{OutputDir}}`（本次运行创建的临时目录）以及 `{{OutputBase}}`（临时文件基础路径，无扩展名）。较旧的 `{{MediaPath}}`、`{{MediaUrl}}`、`{{MediaType}}` 和 `{{MediaDir}}` 名称仍保留为已弃用的兼容别名。

  </Tab>
</Tabs>

### 提供方凭证

Provider media understanding 使用与普通模型调用相同的认证解析方式：认证配置文件、环境变量，然后是 `models.providers.<providerId>.apiKey`。`tools.media.models[]` 条目不接受内联的 `apiKey` 字段。

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

有关配置文件、环境变量和自定义基础 URL，请参见 [Tools and custom providers](/gateway/config-tools)。

## 规则和行为

- 超过 `maxBytes` 的媒体会跳过该模型并尝试下一个。
- 小于 1024 字节的音频文件会被视为空/损坏，并在转录前跳过；代理会获得一个确定性的占位转录结果。
- 如果当前主图像模型已原生支持视觉，OpenClaw 会跳过 `[Image]` 摘要块，并将原始图像直接传给模型。MiniMax 是个例外：`minimax`、`minimax-cn`、`minimax-portal` 和 `minimax-portal-cn` 始终通过插件拥有的 `MiniMax-VL-01` 媒体提供方来处理图像理解，即使旧版 MiniMax M2.x 聊天元数据声称支持图像输入（只有 `MiniMax-M3` 及之后版本才被视为原生具备视觉能力）。
- 如果 Gateway/WebChat 主模型仅支持文本，图像附件会保留为卸载后的 `media://inbound/*` 引用，这样图像/PDF 工具或已配置的图像模型仍然可以检查它们，而不会丢失附件。
- 显式执行 `openclaw infer image describe --file <path> --model <provider/model>`（别名：`openclaw capability image describe`）会直接运行该支持图像的 provider/model，包括诸如 `ollama/qwen2.5vl:7b` 之类的 Ollama 引用，只要在 `models.providers.ollama.models[]` 下配置了匹配的支持图像模型。
- 如果 `<capability>.enabled` 不为 `false` 但未配置任何模型，OpenClaw 会在活动回复模型的 provider 支持该能力时尝试使用该模型。

### 自动检测（默认）

当 `tools.media.<capability>.enabled` 不为 `false` 且未配置任何模型时，OpenClaw 会按以下顺序尝试，并在第一个可用选项处停止：

<Steps>
  <Step title="已配置的图像模型（仅图像）">
    `agents.defaults.imageModel` 的主/备用引用，除非当前活动回复模型已经原生支持视觉。优先使用 `provider/model` 引用；裸引用仅在匹配到已配置的、具备图像能力的 provider 模型条目且匹配唯一时才会被限定。
  </Step>
  <Step title="活动回复模型">
    当前活动回复模型，在其 provider 支持该能力时。
  </Step>
  <Step title="Provider auth（仅音频，在本地 CLI 之前）">
    先尝试已配置的、支持音频的 `models.providers.*` 条目，再尝试本地 CLI。内置 provider 优先级顺序（并列时按 provider id 字母顺序打破平局）：Groq/OpenAI → xAI → Deepgram → OpenRouter → Google/SenseAudio → Deepinfra/ElevenLabs → Mistral。
  </Step>
  <Step title="本地 CLI（仅音频）">
    已就绪的本地二进制文件会成为一个有序的后备列表：
    - `whisper-cli` 仅在当前进程中较早的一次模型调用观察到 Metal 或 CUDA 后才会优先使用
    - CPU 默认的 `sherpa-onnx-offline`（需要 `SHERPA_ONNX_MODEL_DIR`，其中包含 `tokens.txt`/`encoder.onnx`/`decoder.onnx`/`joiner.onnx`）
    - 当加速仅表现为具备构建能力或尚未被观察到时使用 `whisper-cli`
    - Apple Silicon 上的 `parakeet-mlx`（具备 MLX 能力，但设备使用尚未被观察到）
    - `whisper`（Python CLI；默认使用 `turbo` 模型，并会自动下载）

    后端能力检查会被缓存且不会加载模型。构建能力、请求的后端标志，以及从真实调用中观察到的后端，彼此保持独立。自动检测到的 whisper.cpp 会保持模型运行日志开启，以便记录上游选择的后端行。显式 CLI 条目会保留其配置顺序、后端标志和输出标志。

  </Step>
  <Step title="Provider auth（图像/视频）">
    先尝试已配置的、支持该能力的 `models.providers.*` 条目，再尝试内置回退顺序。仅图像的配置 provider 如果有一个支持图像的模型，即使它不是内置厂商插件，也会自动注册用于媒体理解。

    内置 provider 优先级顺序（并列时按 provider id 字母顺序打破平局）：
    - 图像：Anthropic/OpenAI → Google → MiniMax → Deepinfra → MiniMax Portal → Z.AI
    - 视频：Google → Qwen → Moonshot

  </Step>
  <Step title="Antigravity CLI（仅图像/视频）">
    首先尝试已安装的 `agy` 或 `antigravity` 二进制（可通过 `OPENCLAW_ANTIGRAVITY_CLI` 覆盖），并对媒体所在目录进行沙盒限制。
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
二进制检测在 macOS/Linux/Windows 上尽力而为；请确保该 CLI 在 `PATH` 中（会展开 `~`），或者设置一个带完整命令路径的显式 CLI 模型条目。
</Note>

### 代理支持（音频/视频 provider 调用）

基于 provider 的**音频**和**视频**理解会遵守标准的出站代理环境变量，包括 `NO_PROXY`/`no_proxy` 绕过规则：`HTTPS_PROXY`、`HTTP_PROXY`、`ALL_PROXY`、`https_proxy`、`http_proxy`、`all_proxy`。小写变量优先于大写变量。如果未设置这些变量，媒体理解将直接出站；如果代理值格式错误，OpenClaw 会记录警告并回退到直接获取。图像理解不会经过此代理路径。

## 功能

在 `models[]` 条目上设置 `capabilities`，可将其限制为特定的媒体类型。对于共享列表，OpenClaw 会为每个内置提供商推断默认值：

| 提供商                                                                 | 功能                  |
| ------------------------------------------------------------------------ | --------------------- |
| `openai`, `anthropic`, `minimax`                                         | 图像                  |
| `minimax-portal`                                                         | 图像                  |
| `moonshot`                                                               | 图像 + 视频            |
| `openrouter`                                                             | 图像 + 音频            |
| `google` (Gemini API)                                                    | 图像 + 音频 + 视频     |
| `qwen`                                                                   | 图像 + 视频            |
| `deepinfra`                                                              | 图像 + 音频            |
| `mistral`                                                                | 音频                  |
| `zai`                                                                    | 图像                  |
| `groq`, `xai`, `deepgram`, `senseaudio`                                  | 音频                  |
| 任何包含支持图像模型的 `models.providers.<id>.models[]` 目录               | 图像                  |

对于 CLI 条目，请显式设置 `capabilities` 以避免意外匹配；如果省略，该条目在其出现的每个功能列表中都符合条件。

## 提供方支持矩阵

| 能力 | 提供方                                                                                                                                               | 说明                                                                                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 图像      | Anthropic, Codex app-server, Deepinfra, Google, MiniMax, MiniMax Portal, Moonshot, OpenAI, OpenAI Codex OAuth, OpenRouter, Qwen, Z.AI, config providers | 厂商插件注册图像支持；`openai/*` 可使用 API 密钥或 Codex OAuth 路由；`codex/*` 使用受限的 Codex app-server 回合；支持图像的配置提供方会自动注册。 |
| 音频      | Deepgram, Deepinfra, ElevenLabs, Google, Groq, Mistral, OpenAI, OpenRouter, SenseAudio, xAI                                                             | 提供方转写（Whisper/Groq/xAI/Deepgram/OpenRouter STT/Gemini/SenseAudio/Scribe/Voxtral）。                                                                                     |
| 视频      | Google, Moonshot, Qwen                                                                                                                                  | 通过厂商插件进行提供方视频理解；Qwen 视频理解使用标准 DashScope 端点。                                                                        |

<Note>
**MiniMax 注**：`minimax`, `minimax-cn`, `minimax-portal`, and `minimax-portal-cn` 的图像理解始终来自插件拥有的 `MiniMax-VL-01` 媒体提供方，即使旧版 MiniMax M2.x 聊天元数据声称支持图像输入。
</Note>

## Model Selection Guide

- When quality and safety matter, prefer the strongest model from the current generation for each media capability.
- For agentic tools that handle untrusted input, avoid older/weaker media models.
- Keep at least one fallback option for each capability to ensure availability (a high-quality model + a faster/cheaper model).
- When the provider API is unavailable, CLI fallbacks (`whisper-cli`, `whisper`, `gemini`) come in handy.
- Known file output patterns are authoritative: empty or missing inferred transcription files do not fall back to CLI progress output, and instead no transcription content will be generated.
- `parakeet-mlx`: use `--output-format txt` (or `all`) together with `--output-dir` and the default `{filename}` output template. Upstream `PARAKEET_OUTPUT_FORMAT` and `PARAKEET_OUTPUT_TEMPLATE` environment variables are also honored. OpenClaw reads `<output-dir>/<media-basename>.txt`; the default `srt` format, other formats, and custom output templates still use stdout.

## 附件策略

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

### 文件附件提取

- 提取出的文件文本会在附加到媒体提示词之前，被包装为不受信任的外部内容，使用类似 `<<<EXTERNAL_UNTRUSTED_CONTENT id="...">>>` / `<<<END_EXTERNAL_UNTRUSTED_CONTENT id="...">>>` 的边界标记，并附加 `Source: External` 元数据行。
- 这一路径有意省略了较长的 `SECURITY NOTICE:` 横幅，以保持媒体提示词简短；边界标记和元数据仍然适用。
- 没有可提取文本的文件会显示为 `[No extractable text]`。
- 如果 PDF 回退为渲染后的页面图像，OpenClaw 会将这些图像转发给支持视觉的回复模型，并在文件块中保留占位符 `[PDF content rendered to images]`。

## 配置示例

<Tabs>
  <Tab title="共享模型 + 覆盖">
    ```json5
    {
      tools: {
        media: {
          models: [
            { provider: "openai", model: "gpt-5.6-sol", capabilities: ["image"] },
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
  <Tab title="仅音频 + 视频">
    ```json5
    {
      tools: {
        media: {
          audio: {
            enabled: true,
            models: [
              { provider: "openai", model: "gpt-4o-mini-transcribe" },
              {
                type: "cli",
                command: "whisper",
                args: ["--model", "base", "{{AttachmentPath}}"],
              },
            ],
          },
          video: {
            enabled: true,
            maxChars: 500,
            models: [
              { provider: "google", model: "gemini-3-flash-preview" },
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
              },
            ],
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="仅图片">
    ```json5
    {
      tools: {
        media: {
          image: {
            enabled: true,
            maxBytes: 10485760,
            maxChars: 500,
            models: [
              { provider: "openai", model: "gpt-5.6-sol" },
              { provider: "anthropic", model: "claude-opus-5" },
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
              },
            ],
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="多模态单一入口">
    ```json5
    {
      tools: {
        media: {
          image: {
            models: [
              {
                provider: "google",
                model: "gemini-3.1-pro-preview",
                capabilities: ["image", "video", "audio"],
              },
            ],
          },
          audio: {
            models: [
              {
                provider: "google",
                model: "gemini-3.1-pro-preview",
                capabilities: ["image", "video", "audio"],
              },
            ],
          },
          video: {
            models: [
              {
                provider: "google",
                model: "gemini-3.1-pro-preview",
                capabilities: ["image", "video", "audio"],
              },
            ],
          },
        },
      },
    }
    ```
  </Tab>
</Tabs>

## 状态输出

当媒体理解运行时，`/status` 会包含一行按能力划分的摘要：

```
📎 Media: image ok (openai/gpt-5.6-sol) · audio ok (whisper-cli observed=metal)
```

对于预检清单，请运行 `openclaw capability audio providers`。本地行会单独显示本地回退获胜者，以及全局提供方选择、就绪状态和分别的 capable/requested/observed 后端字段。相同的本地选择也可作为信息性的 doctor 发现项获取：

```bash
openclaw doctor --lint --only core/doctor/local-audio-acceleration --severity-min info
```

## 说明

- 功能理解尽力而为。错误不会阻止回复。
- 即使禁用功能理解，附件仍会传递给模型。
- 使用 `scope` 来限制功能理解运行的范围（例如，仅限私信）。

## 相关内容

- [配置](/gateway/configuration)
- [图片与媒体支持](/nodes/images)
