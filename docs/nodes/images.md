---
summary: "用于发送、网关和代理回复的图片和媒体处理规则"
read_when:
  - 修改媒体流水线或附件
title: "图片和媒体支持"
---

WhatsApp 渠道运行在 Baileys Web 上。本页面涵盖发送、网关和代理回复的媒体处理规则。

有关控制界面和原生应用中的内联音频和视频，包括便携式格式、字节限制以及延迟转码，请参阅
[媒体播放](/nodes/media-playback)。

## 目标

- 通过 `openclaw message send --media` 发送带可选标题的媒体。
- 允许来自网页收件箱的自动回复在文本之外附带媒体。
- 保持按类型的限制合理且可预测。

## CLI 接口

`openclaw message send --target <dest> --media <path-or-url> [--message <caption>]`

- `--media <path-or-url>` — 附加媒体（图片/音频/视频/文档）；接受本地路径或 URL。可选；仅发送媒体时标题可以为空。
- `--gif-playback` — 将视频媒体作为 GIF 播放处理（仅限 WhatsApp）。
- `--force-document` — 在 Slack 上保留原始图片字节，或在 Telegram 和 WhatsApp 上将图片、GIF 和视频作为文档发送，以避免渠道压缩。
- `--reply-to <id>`、`--thread-id <id>`、`--pin`、`--silent` — 与仅文本发送共享的投递/线程选项。
- `--dry-run` — 打印解析后的负载并跳过发送。
- `--json` — 将结果打印为 JSON：`{ action, channel, dryRun, handledBy, messageId?, payload }`（`payload` 携带特定渠道的发送结果，包括任何媒体引用）。

## WhatsApp Web 频道行为

- 输入：本地文件路径 **或** HTTP(S) URL。
- 流程：加载到缓冲区，检测媒体类型，然后按类型构建出站负载：
  - **图片：** 优化到低于 `channels.whatsapp.mediaMaxMb`（默认 50MB）。不透明图片会重新压缩为 JPEG（默认边长阶梯从 2048px 开始，在重复未命中大小限制时逐步降低）；带透明度的图片会保留为 PNG。如果源文件已经是可接受的 JPEG/PNG/WebP，且在大小和边长预算内，则保留原始字节不变，而不是重新压缩。动画 GIF 从不重新编码，只进行大小检查。
  - **音频/语音：** 除非已经是原生语音音频（`.ogg`/`.opus`，或 `audio/ogg`/`audio/opus`），否则出站音频会通过 `ffmpeg` 转码为 Opus/OGG（48kHz 单声道，64kbps，最长 20 分钟），然后作为语音消息发送（`ptt: true`）。
  - **视频：** 直通，最大 16MB。
  - **文档：** 其他任何内容，最大 100MB，如有可用则保留文件名。
- WhatsApp GIF 样式播放：发送一个带有 `gifPlayback: true` 的 MP4（CLI：`--gif-playback`），这样移动客户端会在内联中循环播放它。
- MIME 检测优先使用嗅探到的魔术字节，其次是文件扩展名，然后是响应头；通用嗅探容器（`application/octet-stream`、`zip`）绝不会覆盖更具体的扩展名映射（例如 XLSX 与 ZIP 的区别）。
- Caption 来自 `--message` 或 `reply.text`；允许为空 caption。
- 日志：非详细模式显示 `↩️`/`✅`；详细模式包含大小和源路径/URL。

<Note>
上面的 16MB 音频/视频和 100MB 文档数值，是在未传入明确字节上限时使用的共享按类型媒体默认值。WhatsApp 发送会从 `channels.whatsapp.mediaMaxMb`（默认 50MB）设置一个明确上限，该上限会统一应用于该账户的所有类型。
</Note>

## 自动回复流水线

- `getReplyFromConfig` 返回一个回复载荷（或载荷数组），其中包含 `text?`、`mediaUrl?` 和 `mediaUrls?` 等字段。
- 当存在媒体时，web 发送端会使用与 `openclaw message send` 相同的流水线来解析本地路径或 URL。
- 如果提供了多个媒体条目，则会按顺序发送。

## 入站媒体到命令

- 当入站网页消息包含媒体时，OpenClaw 会将其下载到临时文件，并暴露以下模板变量：
  - `{{AttachmentUrl}}` — 当前附件的原始 URL 或提供方引用。
  - `{{AttachmentPath}}` — 在运行命令前写入的本地临时路径。
  - `{{AttachmentContentType}}` — MIME 内容类型。
  - `{{AttachmentDir}}` — 包含本地路径的目录。
  - `{{AttachmentIndex}}` — 从 0 开始的源事实索引。
- 当启用按会话隔离的 Docker 沙箱时，入站媒体会被复制到沙箱工作区，并且附件路径/引用会被重写为类似 `media/inbound/<filename>` 的沙箱相对路径。
- 在插件 SDK 迁移窗口期间，`{{MediaPath}}`、`{{MediaUrl}}`、`{{MediaType}}` 和 `{{MediaDir}}` 仍然是已弃用的兼容别名。
- 媒体理解（通过 `tools.media.*` 或共享的 `tools.media.models` 配置）会在模板渲染之前运行，并可向 `Body` 中插入 `[Image]`、`[Audio]` 和 `[Video]` 块。
  - 音频会设置 `{{Transcript}}`，并使用转录文本进行命令解析，因此斜杠命令仍可正常工作。
  - 视频和图像描述会保留任何字幕文本以用于命令解析。
  - 如果当前主模型已原生支持视觉功能，OpenClaw 会跳过 `[Image]` 摘要块，并改为将原始图像传递给模型。
- 默认情况下，仅处理第一个匹配的图像/音频/视频附件；使用 `tools.media.<capability>.attachments` 可选择多个附件。

## 限制和错误

**出站发送上限（WhatsApp web send）**

- 图片：优化后最高可达 `channels.whatsapp.mediaMaxMb`（默认 50MB）。
- 音频/视频：16MB 上限（共享默认值；通过 WhatsApp 发送时可被 `mediaMaxMb` 覆盖）。
- 文档：100MB 上限（共享默认值；通过 WhatsApp 发送时可被 `mediaMaxMb` 覆盖）。
- 过大或无法读取的媒体会在日志中产生清晰的错误，且会跳过回复。

**媒体理解上限（转写/描述）**

- 图片默认：10MB（可通过 `tools.media.image.maxBytes` 覆盖，或在每个
  `tools.media.models[]` 条目中通过 `maxBytes` 覆盖）。
- 音频默认：20MB（可通过 `tools.media.audio.maxBytes` 覆盖，或在每个条目中覆盖）。
- 视频默认：50MB（可通过 `tools.media.video.maxBytes` 覆盖，或在每个条目中覆盖）。
- 超大媒体会跳过理解，但回复仍会使用原始正文继续发送。

## 测试说明

- 覆盖图片/音频/文档场景的发送和回复流程。
- 验证图片优化后的大小边界，以及音频的语音消息标记。
- 确保多媒体回复按顺序发送。

## 相关内容

- [相机拍摄](/nodes/camera)
- [媒体理解](/nodes/media-understanding)
- [媒体播放](/nodes/media-playback)
- [音频和语音笔记](/nodes/audio)
