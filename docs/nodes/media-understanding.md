---
summary: "可选的入站图像/音频/视频理解（带提供方 + CLI 回退）"
read_when:
  - 设计或重构媒体理解
  - 调整入站音频/视频/图像预处理
title: "媒体理解"
sidebarTitle: "媒体理解"
---

OpenClaw 可以在**回复流水线运行之前汇总入站媒体**（图像/音频/视频）。它会自动检测本地工具或提供方密钥是否可用，并且可以被禁用或自定义。如果理解功能关闭，模型仍然会像往常一样接收原始文件/URL。

特定厂商的媒体行为由厂商插件注册，而 OpenClaw 核心负责共享的 `tools.media` 配置、回退顺序以及回复流水线集成。

## 目标

- 可选：将入站媒体预先提炼为简短文本，以加快路由速度并提升命令解析效果。
- 始终保留原始媒体传递给模型。
- 支持**提供方 API**和**CLI 回退**。
- 允许多个模型按顺序回退（错误/大小/超时）。

## 高层行为

<Steps>
  <Step title="收集附件">
    收集入站附件（`MediaPaths`、`MediaUrls`、`MediaTypes`）。
  </Step>
  <Step title="按能力选择">
    对每个已启用的能力（图像/音频/视频），按策略选择附件（默认：**第一个**）。
  </Step>
  <Step title="选择模型">
    选择第一个符合条件的模型条目（大小 + 能力 + 认证）。
  </Step>
  <Step title="失败时回退">
    如果某个模型失败或媒体过大，**回退到下一个条目**。
  </Step>
  <Step title="应用成功块">
    成功后：

    - `Body` 变为 `[Image]`、`[Audio]` 或 `[Video]` 块。
    - 音频会设置 `{{Transcript}}`；命令解析会在有字幕文本时使用字幕文本，否则使用转录文本。
    - 字幕会作为块内的 `User text:` 保留。

  </Step>
</Steps>

如果理解失败或被禁用，**回复流程会继续**，并保留原始正文 + 附件。

## 配置概览

`tools.media` 支持**共享模型**以及按能力的覆盖配置：

<AccordionGroup>
  <Accordion title="顶层键">
    - `tools.media.models`：共享模型列表（使用 `capabilities` 进行门控）。
    - `tools.media.image` / `tools.media.audio` / `tools.media.video`：
      - 默认值（`prompt`、`maxChars`、`maxBytes`、`timeoutSeconds`、`language`）
      - 提供方覆盖（`baseUrl`、`headers`、`providerOptions`）
      - 通过 `tools.media.audio.providerOptions.deepgram` 配置 Deepgram 音频选项
      - 音频转录回显控制（`echoTranscript`，默认 `false`；`echoFormat`）
      - 可选的**按能力 `models` 列表**（优先于共享模型）
      - `attachments` 策略（`mode`、`maxAttachments`、`prefer`）
      - `scope`（可选：按 channel/chatType/session key 进行门控）
    - `tools.media.concurrency`：最大并发能力运行数（默认 **2**）。

  </Accordion>
</AccordionGroup>

```json5
{
  tools: {
    media: {
      models: [
        /* 共享列表 */
      ],
      image: {
        /* 可选覆盖 */
      },
      audio: {
        /* 可选覆盖 */
        echoTranscript: true,
        echoFormat: '📝 "{transcript}"',
      },
      video: {
        /* 可选覆盖 */
      },
    },
  },
}
```

### 模型条目

每个 `models[]` 条目可以是**提供方**或**CLI**：

<Tabs>
  <Tab title="提供方条目">
    ```json5
    {
      type: "provider", // 如果省略则默认如此
      provider: "openai",
      model: "gpt-5.5",
      prompt: "将图像描述在 <= 500 个字符内。",
      maxChars: 500,
      maxBytes: 10485760,
      timeoutSeconds: 60,
      capabilities: ["image"], // 可选，用于多模态条目
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
        "读取 {{MediaPath}} 处的媒体，并将其描述在 <= {{MaxChars}} 个字符内。",
      ],
      maxChars: 500,
      maxBytes: 52428800,
      timeoutSeconds: 120,
      capabilities: ["video", "image"],
    }
    ```

    CLI 模板也可以使用：

    - `{{MediaDir}}`（包含媒体文件的目录）
    - `{{OutputDir}}`（为本次运行创建的临时目录）
    - `{{OutputBase}}`（临时文件基础路径，无扩展名）

  </Tab>
</Tabs>

### 提供方凭据（`apiKey`）

提供方媒体理解使用与常规模型调用相同的提供方认证解析方式：认证配置文件、环境变量，然后是
`models.providers.<providerId>.apiKey`。

`tools.media.*.models[]` 条目不接受内联的 `apiKey` 字段。媒体模型条目中的 `provider` 值，例如 `openai` 或 `moonshot`，必须通过标准提供方认证来源之一提供可用凭据。

最小示例：

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

有关完整的提供方认证参考，包括配置文件、环境变量和自定义 base URL，请参见 [工具和自定义提供方](/gateway/config-tools)。

## 默认值和限制

推荐默认值：

- `maxChars`：图像/视频为 **500**（简短、便于命令使用）
- `maxChars`：音频为 **不设置**（完整转录，除非你设置限制）
- `maxBytes`：
  - 图像：**10MB**
  - 音频：**20MB**
  - 视频：**50MB**

<AccordionGroup>
  <Accordion title="规则">
    - 如果媒体超过 `maxBytes`，该模型会被跳过，并且会**尝试下一个模型**。
    - 小于 **1024 字节**的音频文件会被视为空/损坏，并在提供方/CLI 转录之前跳过；入站回复上下文会收到一个确定性的占位转录文本，以便代理知道该备注过小。
    - 如果模型返回超过 `maxChars`，输出会被截断。
    - `prompt` 默认是简单的“Describe the {media}.”，并附带 `maxChars` 指引（仅图像/视频）。
    - 如果当前主图像模型原生支持视觉能力，OpenClaw 会跳过 `[Image]` 汇总块，并将原始图像直接传递给模型。
    - 如果 Gateway/WebChat 主模型是纯文本模型，图像附件会作为卸载的 `media://inbound/*` 引用保留，这样图像/PDF 工具或已配置的图像模型仍然可以检查它们，而不会丢失附件。
    - 显式的 `openclaw infer image describe --model <provider/model>` 请求不同：它们会直接运行那个具备图像能力的提供方/模型，包括诸如 `ollama/qwen2.5vl:7b` 之类的 Ollama 引用。
    - 如果 `<capability>.enabled: true` 但未配置模型，OpenClaw 会在其提供方支持该能力时尝试**当前回复模型**。

  </Accordion>
</AccordionGroup>

### 自动检测媒体理解（默认）

如果未将 `tools.media.<capability>.enabled` 设置为 **false**，且你没有配置模型，OpenClaw 会按以下顺序自动检测，并在**第一个可用选项**处停止：

<Steps>
  <Step title="当前回复模型">
    当前回复模型在其提供方支持该能力时。
  </Step>
  <Step title="agents.defaults.imageModel">
    `agents.defaults.imageModel` 主/回退引用（仅图像）。
    优先使用 `provider/model` 引用。裸引用仅在与已配置的支持图像能力的提供方模型条目唯一匹配时才会被补全。
  </Step>
  <Step title="本地 CLI（仅音频）">
    本地 CLI（如果已安装）：

    - `sherpa-onnx-offline`（需要 `SHERPA_ONNX_MODEL_DIR`，其中包含 encoder/decoder/joiner/tokens）
    - `whisper-cli`（`whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或内置的 tiny 模型）
    - `whisper`（Python CLI；会自动下载模型）

  </Step>
  <Step title="Gemini CLI">
    使用 `read_many_files` 的 `gemini`。
  </Step>
  <Step title="提供方认证">
    - 会优先尝试已配置的、支持该能力的 `models.providers.*` 条目，然后再使用内置回退顺序。
    - 具有图像能力模型的仅图像配置提供方会自动注册为媒体理解，即使它们不是内置的厂商插件。
    - 只要显式选择了 Ollama 图像理解，就可用，例如通过 `agents.defaults.imageModel` 或 `openclaw infer image describe --model ollama/<vision-model>`。

    内置回退顺序：

    - 音频：OpenAI → Groq → xAI → Deepgram → OpenRouter → Google → SenseAudio → ElevenLabs → Mistral
    - 图像：OpenAI → Anthropic → Google → MiniMax → MiniMax Portal → Z.AI
    - 视频：Google → Qwen → Moonshot

  </Step>
</Steps>

要禁用自动检测，请设置：

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
二进制检测在 macOS/Linux/Windows 上均为尽力而为；请确保 CLI 位于 `PATH` 中（我们会展开 `~`），或者使用完整命令路径显式设置 CLI 模型。
</Note>

### 代理环境支持（提供方模型）

当启用基于提供方的**音频**和**视频**媒体理解时，OpenClaw 会在提供方 HTTP 调用中遵循标准的出站代理环境变量：

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `ALL_PROXY`
- `https_proxy`
- `http_proxy`
- `all_proxy`

如果未设置任何代理环境变量，媒体理解将使用直接出站连接。如果代理值格式错误，OpenClaw 会记录警告并回退到直接获取。

## 能力（可选）

如果你设置了 `capabilities`，该条目只会针对这些媒体类型运行。对于共享列表，OpenClaw 可以推断默认值：

- `openai`, `anthropic`, `minimax`: **image**
- `minimax-portal`: **image**
- `moonshot`: **image + video**
- `openrouter`: **image + audio**
- `google` (Gemini API): **image + audio + video**
- `qwen`: **image + video**
- `mistral`: **audio**
- `zai`: **image**
- `groq`: **audio**
- `xai`: **audio**
- `deepgram`: **audio**
- Any `models.providers.<id>.models[]` catalog with an image-capable model: **image**

对于 CLI 条目，**请显式设置 `capabilities`** 以避免意外匹配。如果你省略 `capabilities`，该条目会对其所在的列表具备资格。

## 提供方支持矩阵（OpenClaw 集成）

| Capability | Provider integration                                                                                                         | Notes                                                                                                                                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Image      | OpenAI, OpenAI Codex OAuth, Codex app-server, OpenRouter, Anthropic, Google, MiniMax, Moonshot, Qwen, Z.AI, config providers | Vendor plugins register image support; `openai/*` can use API-key or Codex OAuth routing; `codex/*` uses a bounded Codex app-server turn; MiniMax and MiniMax OAuth both use `MiniMax-VL-01`; image-capable config providers auto-register. |
| Audio      | OpenAI, Groq, xAI, Deepgram, OpenRouter, Google, SenseAudio, ElevenLabs, Mistral                                             | Provider transcription (Whisper/Groq/xAI/Deepgram/OpenRouter STT/Gemini/SenseAudio/Scribe/Voxtral).                                                                                                                                         |
| Video      | Google, Qwen, Moonshot                                                                                                       | Provider video understanding via vendor plugins; Qwen video understanding uses the Standard DashScope endpoints.                                                                                                                            |

<Note>
**MiniMax 说明**

- `minimax`, `minimax-cn`, `minimax-portal`, and `minimax-portal-cn` 图像理解来自插件拥有的 `MiniMax-VL-01` 媒体提供方。
- 即使旧版 MiniMax M2.x 聊天元数据声称支持图像输入，自动图像路由仍会继续使用 `MiniMax-VL-01`。

</Note>

## 模型选择指南

- 当质量和安全很重要时，优先选择每种媒体能力可用的最强最新一代模型。
- 对于处理不受信任输入的工具型代理，避免使用较旧/较弱的媒体模型。
- 每种能力至少保留一个回退方案以保证可用性（高质量模型 + 更快/更便宜的模型）。
- 当提供方 API 不可用时，CLI 回退（`whisper-cli`、`whisper`、`gemini`）很有用。
- `parakeet-mlx` 注：在使用 `--output-dir` 时，OpenClaw 会在输出格式为 `txt`（或未指定）时读取 `<output-dir>/<media-basename>.txt`；非 `txt` 格式则回退到 stdout。

## 附件策略

按能力配置的 `attachments` 控制会处理哪些附件：

<ParamField path="mode" type='"first" | "all"' default="first">
  处理所选的第一个附件，还是处理全部附件。
</ParamField>
<ParamField path="maxAttachments" type="number" default="1">
  限制处理数量。
</ParamField>
<ParamField path="prefer" type='"first" | "last" | "path" | "url"'>
  在候选附件中的选择偏好。
</ParamField>

当 `mode: "all"` 时，输出会标记为 `[Image 1/2]`、`[Audio 2/2]` 等。

<AccordionGroup>
  <Accordion title="文件附件提取行为">
    - 提取出的文件文本在附加到媒体提示词之前，会被包装为**不受信任的外部内容**。
    - 注入的块使用明确的边界标记，例如 `<<<EXTERNAL_UNTRUSTED_CONTENT id="...">>>` / `<<<END_EXTERNAL_UNTRUSTED_CONTENT id="...">>>`，并包含一行 `Source: External` 元数据。
    - 这种附件提取路径有意省略了较长的 `SECURITY NOTICE:` 横幅，以避免让媒体提示词过大；但边界标记和元数据仍然保留。
    - 如果文件没有可提取的文本，OpenClaw 会注入 `[No extractable text]`。
    - 如果在此路径中 PDF 回退为渲染后的页面图片，媒体提示词会保留占位符 `[PDF content rendered to images; images not forwarded to model]`，因为此附件提取步骤传递的是文本块，而不是渲染后的 PDF 图片。

  </Accordion>
</AccordionGroup>

## 配置示例

<Tabs>
  <Tab title="共享模型 + 覆盖">
    ```json5
    {
      tools: {
        media: {
          models: [
            { provider: "openai", model: "gpt-5.5", capabilities: ["image"] },
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
                "读取位于 {{MediaPath}} 的媒体内容，并用不超过 {{MaxChars}} 个字符描述它。",
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
                args: ["--model", "base", "{{MediaPath}}"],
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
                  "读取位于 {{MediaPath}} 的媒体内容，并用不超过 {{MaxChars}} 个字符描述它。",
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
              { provider: "openai", model: "gpt-5.5" },
              { provider: "anthropic", model: "claude-opus-4-6" },
              {
                type: "cli",
                command: "gemini",
                args: [
                  "-m",
                  "gemini-3-flash",
                  "--allowed-tools",
                  "read_file",
                  "读取位于 {{MediaPath}} 的媒体内容，并用不超过 {{MaxChars}} 个字符描述它。",
                ],
              },
            ],
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="多模态单条入口">
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

当媒体理解运行时，`/status` 会包含一行简短摘要：

```
📎 媒体：image 成功 (openai/gpt-5.4) · audio 跳过 (maxBytes)
```

这会显示每种能力的结果，以及适用时所选的提供方/模型。

## 备注

- 理解功能是**尽力而为**的。错误不会阻止回复。
- 即使禁用了理解功能，附件仍会传递给模型。
- 使用 `scope` 限制理解功能运行的位置（例如仅在私信中）。

## 相关内容

- [配置](/gateway/configuration)
- [图片与媒体支持](/nodes/images)
