---
summary: "入站图像/音频/视频理解（可选），支持提供商 + CLI 回退"
read_when:
  - 设计或重构媒体理解
  - 调优入站音频/视频/图像预处理
title: "媒体理解"
---

# Media Understanding - Inbound (2026-01-17)

OpenClaw 可以在回复管道运行前**总结入站媒体**（图像/音频/视频）。它能自动检测本地工具或提供商密钥是否可用，并可禁用或自定义。如果关闭理解功能，模型仍会按惯例接收原始文件/URL。

Vendor-specific media behavior is registered by vendor plugins, while OpenClaw
core owns the shared `tools.media` config, fallback order, and reply-pipeline
integration.

## Goals

- 可选：预先将入站媒体提炼成简短文本，以实现更快的路由和更好的命令解析。
- 保留原始媒体传递给模型（始终如此）。
- 支持**提供商 API**和**CLI 回退**。
- 允许多个模型按顺序回退（错误/大小限制/超时）。

## High-level behavior

1. 收集入站附件（`MediaPaths`、`MediaUrls`、`MediaTypes`）。
2. 对每种启用的功能（图像/音频/视频），按策略选择附件（默认：**第一个**）。
3. 选择第一个符合条件的模型条目（大小+功能+授权）。
4. 如果模型失败或媒体过大，**回退到下一个条目**。
5. 成功时：
   - `Body` 变为 `[Image]`、`[Audio]` 或 `[Video]` 块。
   - 音频设置 `{{Transcript}}`；命令解析优先使用存在的字幕文本，否则使用转录文本。
   - 字幕作为 `User text:` 保存在块内。

如果理解失败或被禁用，**回复流程继续**，使用原始正文 + 附件。

## 配置概览

`tools.media` 支持**共享模型**以及按功能覆盖：

- `tools.media.models`：共享模型列表（使用 `capabilities` 限定）。
- `tools.media.image` / `tools.media.audio` / `tools.media.video`：
  - 默认（`prompt`，`maxChars`，`maxBytes`，`timeoutSeconds`，`language`）
  - 提供商覆盖（`baseUrl`，`headers`，`providerOptions`）
  - 通过 `tools.media.audio.providerOptions.deepgram` 配置 Deepgram 音频选项
  - 音频转录回显控制（`echoTranscript`，默认 `false`；`echoFormat`）
  - 可选**每功能独立的 `models` 列表**（优先于共享模型）
  - `attachments` 策略（`mode`，`maxAttachments`，`prefer`）
  - `scope`（可选：按频道/聊天类型/会话键限流）
- `tools.media.concurrency`：最大并发功能运行数（默认为 **2**）。

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

每个 `models[]` 条目可以是**提供商**或**CLI**：

```json5
{
  type: "provider", // 省略时默认为提供商
  provider: "openai",
  model: "gpt-5.2",
  prompt: "用不超过 500 字描述图像。",
  maxChars: 500,
  maxBytes: 10485760,
  timeoutSeconds: 60,
  capabilities: ["image"], // 可选，用于多模态条目
  profile: "vision-profile",
  preferredProfile: "vision-fallback",
}
```

```json5
{
  type: "cli",
  command: "gemini",
  args: [
    "-m",
    "gemini-3-flash",
    "--allowed-tools",
    "read_file",
    "读取 {{MediaPath}} 的媒体并用不超过 {{MaxChars}} 字描述。",
  ],
  maxChars: 500,
  maxBytes: 52428800,
  timeoutSeconds: 120,
  capabilities: ["video", "image"],
}
```

CLI 模板还可以使用：

- `{{MediaDir}}`（包含媒体文件的文件夹）
- `{{OutputDir}}`（为本次运行创建的临时文件夹）
- `{{OutputBase}}`（临时文件基本路径，无扩展名）

## 默认值和限制

推荐默认值：

- `maxChars`：图像/视频为 **500**（简短、易于命令解析）
- `maxChars`：音频未设置（默认为完整转录，除非你设置限制）
- `maxBytes`：
  - 图像：**10MB**
  - 音频：**20MB**
  - 视频：**50MB**

规则：

- 如果媒体超过 `maxBytes`，跳过该模型，**尝试下一个模型**。
- 小于 **1024 字节** 的音频文件视为空文件/损坏，转录前跳过。
- 模型返回超过 `maxChars` 文本时，输出被裁剪。
- `prompt` 默认为简单的“描述 {media}。”并加上 `maxChars` 限制说明（仅图像/视频）。
- 如果 `<capability>.enabled: true` 但无模型配置，OpenClaw 会尝试当前激活的回复模型（若其提供商支持该功能）。

### 媒体理解自动检测（默认）

若未将 `tools.media.<capability>.enabled` 设置为 `false` 且无模型配置，OpenClaw 按以下顺序自动检测，**遇到首个可用方案即停止**：

1. **本地 CLI**（音频仅限；安装时启用）
   - `sherpa-onnx-offline`（需 `SHERPA_ONNX_MODEL_DIR`，包含编码器/解码器/连接器/令牌）
   - `whisper-cli`（`whisper-cpp`，使用 `WHISPER_CPP_MODEL` 或内置 tiny 模型）
   - `whisper`（Python CLI，自动下载模型）
2. **Gemini CLI**（`gemini`），使用 `read_many_files`
3. **提供商密钥**
   - 音频：OpenAI → Groq → Deepgram → Google
   - 图像：OpenAI → Anthropic → Google → MiniMax
   - 视频：Google

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

注意：二进制检测在 macOS/Linux/Windows 上均尽力而为；确保 CLI 在 `PATH` 中（支持展开 `~`），或设置带完整命令路径的显式 CLI 模型。

### 代理环境支持（提供商模型）

当启用基于提供商的**音频**和**视频**媒体理解时，OpenClaw 尊重以下标准代理环境变量用于 HTTP 调用：

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `https_proxy`
- `http_proxy`

若无代理环境变量设置，则媒体理解直连外网。
如代理值格式错误，OpenClaw 记录警告并回退至直连。

## 功能支持（可选）

如果设置 `capabilities`，该条目只适用于列出的媒体类型。对于共享列表，OpenClaw 能推断默认值：

- `openai`, `anthropic`, `minimax`: **image**
- `moonshot`: **image + video**
- `google` (Gemini API): **image + audio + video**
- `mistral`: **audio**
- `zai`: **image**
- `groq`: **audio**
- `deepgram`: **audio**

对于 CLI 条目，请**显式设置 `capabilities`**，避免意外匹配。
未设置 `capabilities` 时，条目适用于其所在列表。

## 提供商支持矩阵（OpenClaw 集成）

| Capability | Provider integration                               | Notes                                                                   |
| ---------- | -------------------------------------------------- | ----------------------------------------------------------------------- |
| Image      | OpenAI, Anthropic, Google, MiniMax, Moonshot, Z.AI | Vendor plugins register image support against core media understanding. |
| Audio      | OpenAI, Groq, Deepgram, Google, Mistral            | Provider transcription (Whisper/Deepgram/Gemini/Voxtral).               |
| Video      | Google, Moonshot                                   | Provider video understanding via vendor plugins.                        |

## 模型选择指南

- 对质量和安全要求高时，优先选择各媒体功能中最新一代的最强模型。
- 对于处理不可信输入的工具启用型代理，避免使用较旧/较弱的媒体模型。
- 保留每功能至少一个回退模型以保障可用性（优质模型 + 更快/更便宜模型）。
- 当提供商 API 不可用时，CLI 回退（`whisper-cli`、`whisper`、`gemini`）非常有用。
- `parakeet-mlx` 注意：使用 `--output-dir`，OpenClaw 会读取 `<output-dir>/<media-basename>.txt`（output 格式为文本或未指定时）；非文本格式回退到标准输出。

## 附件策略

按功能设置 `attachments` 控制处理哪些附件：

- `mode`：`first`（默认）或 `all`
- `maxAttachments`：最大处理数（默认 **1**）
- `prefer`：`first`、`last`、`path`、`url`

当 `mode: "all"` 时，输出标签格式如 `[Image 1/2]`、`[Audio 2/2]` 等。

## 配置示例

### 1) 共享模型列表 + 覆盖

```json5
{
  tools: {
    media: {
      models: [
        { provider: "openai", model: "gpt-5.2", capabilities: ["image"] },
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
            "读取 {{MediaPath}} 的媒体并用不超过 {{MaxChars}} 字描述。",
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

### 2) 仅音频 + 视频（关闭图像）

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
              "读取 {{MediaPath}} 的媒体并用不超过 {{MaxChars}} 字描述。",
            ],
          },
        ],
      },
    },
  },
}
```

### 3) 可选图像理解

```json5
{
  tools: {
    media: {
      image: {
        enabled: true,
        maxBytes: 10485760,
        maxChars: 500,
        models: [
          { provider: "openai", model: "gpt-5.2" },
          { provider: "anthropic", model: "claude-opus-4-6" },
          {
            type: "cli",
            command: "gemini",
            args: [
              "-m",
              "gemini-3-flash",
              "--allowed-tools",
              "read_file",
              "读取 {{MediaPath}} 的媒体并用不超过 {{MaxChars}} 字描述。",
            ],
          },
        ],
      },
    },
  },
}
```

### 4) Multi-modal single entry (explicit capabilities)

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

## 状态输出

媒体理解运行时，`/status` 包含简短汇总行：

```
📎 Media: image ok (openai/gpt-5.2) · audio skipped (maxBytes)
```

显示各功能结果及选用的提供商/模型（当前可用时）。

## 注意事项

- 理解为**尽力而为**。错误不会阻塞回复。
- 即便关闭理解，附件依然传递给模型。
- 使用 `scope` 限定理解范围（例如只对私聊启用）。

## 相关文档

- [配置](/gateway/configuration)
- [图像与媒体支持](/nodes/images)
