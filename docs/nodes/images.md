---
summary: "用于发送、网关和代理回复的图片和媒体处理规则"
read_when:
  - 修改媒体流水线或附件
title: "图片和媒体支持"
---

WhatsApp 频道通过 **Baileys Web** 运行。本文档记录了用于发送、网关和代理回复的当前媒体处理规则。

## 目标

- 通过 `openclaw message send --media` 发送可选附带说明文字的媒体。
- 允许来自网页收件箱的自动回复在文本之外附带媒体。
- 保持各类型限制合理且可预测。

## CLI 接口

- `openclaw message send --media <path-or-url> [--message <caption>]`
  - `--media` 为可选；仅发送媒体时说明文字可以为空。
  - `--dry-run` 打印解析后的有效载荷；`--json` 输出 `{ channel, to, messageId, mediaUrl, caption }`。

## WhatsApp Web 频道行为

- 输入：本地文件路径 **或** HTTP(S) URL。
- 流程：加载到 Buffer，检测媒体类型，并构建正确的有效载荷：
  - **图片：** 重新调整大小并重新压缩为 JPEG（最长边 2048px），目标为 `channels.whatsapp.mediaMaxMb`（默认：50 MB）。
  - **音频/语音/视频：** 直通，最大 16 MB；音频以语音消息形式发送（`ptt: true`）。
  - **文档：** 其他所有类型，最大 100 MB，并在可用时保留文件名。
- WhatsApp GIF 风格播放：发送带有 `gifPlayback: true` 的 MP4（CLI：`--gif-playback`），使移动端客户端以内联方式循环播放。
- MIME 检测优先使用魔术字节，其次是头信息，然后是文件扩展名。
- 说明文字来自 `--message` 或 `reply.text`；允许为空说明文字。
- 日志：非详细模式显示 `↩️`/`✅`；详细模式包含大小和来源路径/URL。

## 自动回复流水线

- `getReplyFromConfig` 返回 `{ text?, mediaUrl?, mediaUrls? }`。
- 当存在媒体时，Web 发送器使用与 `openclaw message send` 相同的流水线来解析本地路径或 URL。
- 如果提供多个媒体条目，则按顺序逐个发送。

## 传入命令的入站媒体（Pi）

- 当入站 Web 消息包含媒体时，OpenClaw 会下载到临时文件，并暴露模板变量：
  - `{{MediaUrl}}` 表示入站媒体的伪 URL。
  - `{{MediaPath}}` 表示在运行命令前写入的本地临时路径。
- 当启用按会话划分的 Docker 沙箱时，入站媒体会被复制到沙箱工作区，且 `MediaPath`/`MediaUrl` 会被重写为类似 `media/inbound/<filename>` 的相对路径。
- 媒体理解（如果通过 `tools.media.*` 或共享的 `tools.media.models` 配置）会在模板渲染之前运行，并可在 `Body` 中插入 `[Image]`、`[Audio]` 和 `[Video]` 块。
  - 音频会设置 `{{Transcript}}`，并使用该转写内容进行命令解析，因此斜杠命令仍然可用。
  - 视频和图片描述会保留任何说明文字，以便进行命令解析。
  - 如果当前主图片模型已原生支持视觉能力，OpenClaw 会跳过 `[Image]` 摘要块，而是将原始图片传递给模型。
- 默认情况下，只处理第一个匹配的图片/音频/视频附件；设置 `tools.media.<cap>.attachments` 可处理多个附件。

## 限制和错误

**出站发送上限（WhatsApp web send）**

- 图片：在重新压缩后最高可达 `channels.whatsapp.mediaMaxMb`（默认：50 MB）。
- 音频/语音/视频：16 MB 上限；文档：100 MB 上限。
- 超大或无法读取的媒体 → 在日志中给出明确错误，并跳过该回复。

**媒体理解上限（转写/描述）**

- 图片默认：10 MB（`tools.media.image.maxBytes`）。
- 音频默认：20 MB（`tools.media.audio.maxBytes`）。
- 视频默认：50 MB（`tools.media.video.maxBytes`）。
- 超大媒体会跳过理解处理，但回复仍会使用原始正文继续执行。

## 测试说明

- 覆盖图片/音频/文档场景下的发送 + 回复流程。
- 验证图片的重新压缩（大小限制）和音频的语音消息标志。
- 确保多媒体回复会作为一系列顺序发送进行展开。

## 相关内容

- [相机拍摄](/nodes/camera)
- [媒体理解](/nodes/media-understanding)
- [音频和语音消息](/nodes/audio)
