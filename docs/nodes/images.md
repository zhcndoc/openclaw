---
summary: "发送、网关和客服回复的图片及媒体处理规则"
read_when:
  - Modifying media pipeline or attachments
title: "图片和媒体支持"
---

# 图片与媒体支持 (2025-12-05)

WhatsApp 通道通过 **Baileys Web** 运行。本文档记录了当前发送、网关及客服回复的媒体处理规则。

## 目标

- 通过 `openclaw message send --media` 发送带可选文字说明的媒体。
- 允许网页收件箱中的自动回复包含文字和媒体。
- 保持各类型限制合理且可预测。

## CLI 接口

- `openclaw message send --media <路径或URL> [--message <说明>]`
  - `--media` 可选；说明可留空实现仅发送媒体。
  - `--dry-run` 打印解析后的负载；`--json` 输出 `{ channel, to, messageId, mediaUrl, caption }`。

## WhatsApp Web 通道行为

- 输入：本地文件路径 **或** HTTP(S) URL。
- 流程：加载到 Buffer 中，检测媒体类型，并构建正确的负载：
  - **图片：** 调整大小并重新压缩为 JPEG（最长边 2048px），目标为 `channels.whatsapp.mediaMaxMb`（默认：50 MB）。
  - **音频/语音/视频：** 直接传递，最大 16 MB；音频作为语音笔记发送（`ptt: true`）。
  - **文档：** 其他任何类型，最大 100 MB，且在可用时保留文件名。
- WhatsApp GIF 风格播放：发送带 `gifPlayback: true` 的 MP4（CLI：`--gif-playback`），使移动客户端以内联方式循环播放。
- MIME 检测优先使用魔数，其次是头信息，再次是文件扩展名。
- 说明文字来自 `--message` 或 `reply.text`；允许为空。
- 日志：非详细模式显示 `↩️`/`✅`；详细模式包含大小和来源路径/URL。

## 自动回复管道

- `getReplyFromConfig` 返回 `{ text?, mediaUrl?, mediaUrls? }`。
- 媒体存在时，网页发送端使用与 `openclaw message send` 相同的流程解析本地路径或 URL。
- 多个媒体条目顺序发送。

## 命令的入站媒体（Pi）

- 当入站网页消息包含媒体时，OpenClaw 会下载到临时文件，并暴露以下模板变量：
  - `{{MediaUrl}}` 入站媒体的伪 URL。
  - `{{MediaPath}}` 在运行命令前写入的本地临时路径。
- 当启用每会话 Docker 沙箱时，入站媒体会被复制到沙箱工作区，并且 `MediaPath`/`MediaUrl` 会被重写为类似 `media/inbound/<filename>` 的相对路径。
- 媒体理解（如果通过 `tools.media.*` 或共享的 `tools.media.models` 配置）会在模板渲染之前运行，并可在 `Body` 中插入 `[Image]`、`[Audio]` 和 `[Video]` 块。
  - 音频会设置 `{{Transcript}}`，并在命令解析中使用该转录文本，因此斜杠命令仍可正常工作。
  - 视频和图片描述会保留任何说明文字以供命令解析。
  - 如果当前主图像模型已经原生支持视觉能力，OpenClaw 会跳过 `[Image]` 摘要块，并改为将原始图像传递给模型。
- 默认情况下，仅处理第一个匹配的图片/音频/视频附件；设置 `tools.media.<cap>.attachments` 可处理多个附件。

## 限制与错误

**出站发送限制（WhatsApp Web 发送）**

- 图片：重新压缩后最大为 `channels.whatsapp.mediaMaxMb`（默认：50 MB）。
- 音频/语音/视频：上限 16 MB；文档：上限 100 MB。
- 超大或无法读取的媒体 → 在日志中显示清晰错误，并跳过回复。

**媒体理解限制（转录/描述）**

- 图片默认：10 MB（`tools.media.image.maxBytes`）。
- 音频默认：20 MB（`tools.media.audio.maxBytes`）。
- 视频默认：50 MB（`tools.media.video.maxBytes`）。
- 超大媒体会跳过理解，但原始正文仍会正常回复。

## 测试注意事项

- 覆盖图片/音频/文档场景下的发送与回复流程。
- 验证图片重新压缩（大小上限）和音频的语音笔记标志。
- 确保多媒体回复按顺序拆分发送。

## 相关

- [Camera capture](/nodes/camera)
- [Media understanding](/nodes/media-understanding)
- [Audio and voice notes](/nodes/audio)
