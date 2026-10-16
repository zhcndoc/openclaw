---
summary: "用于发送、网关和代理回复的图片和媒体处理规则"
read_when:
  - "修改媒体流水线或附件"
title: "图片和媒体支持"
---

WhatsApp 渠道运行在 Baileys Web 上。本页面涵盖发送、网关和代理回复的媒体处理规则。

有关 Control UI 和本机应用程序中的内联音频和视频，包括可移植格式、字节限制和延迟转码，请参阅 [ 媒体播放](/nodes/media-playback)。

## <a id="goals"></a> 目标

- 通过 `openclaw message send --media` 发送带可选标题的媒体。
- 允许来自网页收件箱的自动回复在文本之外附带媒体。
- 保持按类型的限制合理且可预测。

## <a id="cli-surface"></a> CLI 接口

`openclaw message send --target <dest> --media <path-or-url> [--message <caption>]`

- `--media <path-or-url>` — 连接介质 （image/audio/video/document）；接受本地路径或 URL。选修的；对于仅媒体发送，标题可以为空。
- `--gif-playback` — 将视频媒体作为 GIF 播放处理（仅限 WhatsApp）。
- `--force-document` — 在 Slack 上保留原始图像字节，或在 Telegram 和 WhatsApp 上将图像、GIF 和视频作为文档发送，以避免通道压缩。
- `--reply-to <id>`、`--thread-id <id>`、`--pin`、`--silent` — 与纯文本发送共享的 delivery/threading 选项。
- `--dry-run` — 打印解析后的负载并跳过发送。
- `--json` — 将结果打印为 JSON：`{ action, channel, dryRun, handledBy, messageId?, payload }`（`payload` 携带特定渠道的发送结果，包括任何媒体引用）。

## <a id="message-tool-attachment-metadata"></a> 消息工具附件元数据

对于 `buffer` 附件，`contentType` 优先于 `mimeType`；仅当两者均未提供时，才使用数据 URL 的 MIME 类型。对于 `reply`、`sendAttachment`、`upload-file` 和 `setGroupIcon`，顶级 MIME 元数据也优先于选定的 `attachments[]` 条目。 Hydration 将该选择作为 `contentType` 并使用它来推断丢失的文件名。显式文件名被保留。加载或暂存媒体字节时，此元数据优先级不会更改 MIME 检测。

## <a id="whatsapp-web-channel-behavior"></a> WhatsApp Web 频道行为

- 输入：本地文件路径 **或** HTTP(S) URL。
- 流程：加载到缓冲区，检测媒体类型，然后按类型构建出站负载：
  - **Images：** 经过优化以适合 `channels.whatsapp.mediaMaxMb`（默认 50MB）。不透明图像被重新压缩为 JPEG（默认侧梯从 2048px 开始，在重复尺寸缺失时递减）；具有透明度的图像保留为 PNG。如果源在大小和边长预算内已经是可接受的 JPEG/PNG/WebP，则原始字节将保持不变而不是重新压缩，即使转换后仍保留陈旧的 `.heic` 或 `.heif` 文件名。 GIF 和动画 WebP 图像保留其原始字节；超过字节上限或明确模型尺寸限制的图像将被拒绝，而不是平铺到一帧。
  - **Audio/voice：** 除非已经是本机语音音频（`.ogg`/`.opus` 或 `audio/ogg`/`audio/opus`），出站音频通过 `ffmpeg` 转码为 Opus/OGG（48kHz 单声道， 64kbps，上限为 20 分钟），然后以语音留言 （`ptt: true`） 形式发送。
  - **视频：** 直通，最大 16MB。
  - **文档：** 其他任何内容，最大 100MB，如有可用则保留文件名。
- WhatsApp GIF-风格播放：发送带有`gifPlayback: true`的MP4（CLI：`--gif-playback`），以便移动客户端内联循环播放。
- MIME 检测优先使用嗅探到的魔术字节，其次是文件扩展名，然后是响应头；通用嗅探容器（`application/octet-stream`、`zip`）绝不会覆盖更具体的扩展名映射（例如 XLSX 与 ZIP 的区别）。
- Caption 来自 `--message` 或 `reply.text`；允许为空 caption。
- Logging：非详细显示 `↩️`/`✅`；详细包括大小和来源 path/URL.

<Note>
上面的 16MB audio/video 和 100MB 文档数字是在未传递显式字节上限时使用的共享每种媒体默认值。 WhatsApp 从 `channels.whatsapp.mediaMaxMb` 发送设置显式上限（默认 50MB），该上限统一适用于该帐户的各种类型。
</Note>

## <a id="auto-reply-pipeline"></a> 自动回复流水线

- `getReplyFromConfig` 返回一个回复载荷（或载荷数组），其中包含 `text?`、`mediaUrl?` 和 `mediaUrls?` 等字段。
- 当存在媒体时，Web 发送器使用与 `openclaw message send` 相同的管道解析本地路径或 URL。
- 如果提供了多个媒体条目，则会按顺序发送。

生成的附件与以后的工具错误警告分开。错误或推理中的图像引用不会选择或丢弃生成的附件。

当通道将 Markdown 图像链接转换为附件时，代码块或内联代码内的图像语法以及转义图像语法将保留在文本中。内联图像目标保留其 URL 标点符号。

## <a id="inbound-media-to-commands"></a> 入站媒体到命令

- 当入站网页消息包含媒体时，OpenClaw 会将其下载到临时文件，并暴露以下模板变量：
  - `{{AttachmentUrl}}` — 当前附件的原始 URL 或提供方引用。
  - `{{AttachmentPath}}` — 在运行命令前写入的本地临时路径。
  - `{{AttachmentContentType}}` — MIME 内容类型。
  - `{{AttachmentDir}}` — 包含本地路径的目录。
  - `{{AttachmentIndex}}` — 从零开始的源事实索引。
- 启用每会话 Docker 沙箱时，入站媒体将复制到沙箱工作区，并且附件 path/reference 将重写为沙箱相对路径（如 `media/inbound/<filename>`）。
- `{{MediaPath}}`、`{{MediaUrl}}`、`{{MediaType}}` 和 `{{MediaDir}}` 仍然是在 2026.8.1. 中替换它们的 `{{Attachment*}}` 名称的已弃用兼容性别名，其批准的 `removeAfter` 日期是2026 年 10 月 1 日，进行了一次干净的已发布插件工件扫描；在此之前迁移。请参阅 [ 媒体传统投影](/plugins/sdk-migration/compatibility-policy#media-legacy-projection)。
- Media Understanding（通过 `tools.media.*` 或共享 `tools.media.models` 配置）在模板化之前运行，并且可以将 `[Image]`、`[Audio]` 和 `[Video]` 块插入到 `Body` 中。
  - 音频会设置 `{{Transcript}}`，并使用转录文本进行命令解析，因此斜杠命令仍可正常工作。
  - 视频和图像描述会保留任何字幕文本以用于命令解析。
  - Native-vision 模型可以跳过 `[Image]` 摘要块。有关规则及其 MiniMax 例外，请参阅 [ 规则和行为 ](/nodes/media-understanding#rules-and-behavior)。
- 默认情况下，仅处理第一个匹配的 image/audio/video 附件；使用 `tools.media.<capability>.attachments` 选择多个附件。

## <a id="limits-and-errors"></a> 限制和错误

**出站发送上限（WhatsApp web send）**

- 图片：优化后最高可达 `channels.whatsapp.mediaMaxMb`（默认 50MB）。
- Audio/video：16MB 上限（共享默认值；通过 WhatsApp 发送时被 `mediaMaxMb` 覆盖）。
- 文档：100MB 上限（共享默认值；通过 WhatsApp 发送时可被 `mediaMaxMb` 覆盖）。
- 过大或不可读的介质会在日志中产生明显的错误，并且会跳过回复。大小错误使用可读字节单位，而不是将小数上限舍入为整个 MB。

**媒体理解帽（transcription/description）**

- 图片默认：10MB（可通过 `tools.media.image.maxBytes` 覆盖，或在每个 `tools.media.models[]` 条目中通过 `maxBytes` 覆盖）。
- 音频默认：20MB（可通过 `tools.media.audio.maxBytes` 覆盖，或在每个条目中覆盖）。
- 视频默认：50MB（可通过 `tools.media.video.maxBytes` 覆盖，或在每个条目中覆盖）。
- 超大媒体会跳过理解，但回复仍会使用原始正文继续发送。

图像描述在调整大小之前检查源字节上限。然后根据所选模型声明的图像限制准备已识别的图像；每个回退都从相同的标准化原始数据开始。没有声明图像限制的模型保留这些标准化字节。 `agents.defaults.imageQuality` 仍然是图像工具设置，不会改变媒体理解准备。

## <a id="notes-for-tests"></a> 测试说明

- 涵盖 image/audio/document 案例的发送和回复流程。
- 验证图片优化后的大小边界，以及音频的语音消息标记。
- 一次发送一项多媒体回复。

## <a id="related"></a> 相关内容

- [相机捕获](/nodes/camera)
- [媒体理解](/nodes/media-understanding)
- [媒体播放](/nodes/media-playback)
- [音频和语音笔记](/nodes/audio)
