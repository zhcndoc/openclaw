---
summary: "发送、网关和客服回复的图片及媒体处理规则"
read_when:
  - 修改媒体管道或附件时
title: "图片与媒体支持"
---

# 图片与媒体支持 — 2025-12-05

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

- 输入支持本地文件路径 **或** HTTP(S) URL。
- 流程：加载为 Buffer，检测媒体类型，并构建正确的负载：
  - **图片：** 调整尺寸并重新压缩为 JPEG（最大边长 2048px），目标大小为 `agents.defaults.mediaMaxMb`（默认 5 MB），最多 6 MB。
  - **音频/语音/视频：** 直通，最大 16 MB；音频作为语音消息发送 (`ptt: true`)。
  - **文档：** 其他格式，最大 100 MB，文件名可保留（若可用）。
- WhatsApp GIF 风格播放：发送带 `gifPlayback: true` 的 MP4（CLI 使用 `--gif-playback`），使移动端可循环播放。
- MIME 类型检测优先依赖魔术字节，然后是头部信息，最后是文件扩展名。
- 说明文字来自 `--message` 或 `reply.text`，允许为空。
- 日志记录：非详细模式显示 `↩️`/`✅`；详细模式包含文件大小及来源路径或 URL。

## 自动回复管道

- `getReplyFromConfig` 返回 `{ text?, mediaUrl?, mediaUrls? }`。
- 媒体存在时，网页发送端使用与 `openclaw message send` 相同的流程解析本地路径或 URL。
- 多个媒体条目顺序发送。

## 命令的入站媒体（Pi）

- 入站网页消息包含媒体时，OpenClaw 下载至临时文件并暴露模板变量：
  - `{{MediaUrl}}` 模拟的入站媒体 URL。
  - `{{MediaPath}}` 命令运行前写入的本地临时路径。
- 启用每会话 Docker 沙箱时，入站媒体复制到沙箱工作区，`MediaPath`/`MediaUrl` 被重写为相对路径如 `media/inbound/<文件名>`。
- 媒体理解（通过 `tools.media.*` 或共享 `tools.media.models` 配置）在模板渲染前执行，可以在 `Body` 中插入 `[Image]`、`[Audio]` 和 `[Video]` 块。
  - 音频设置 `{{Transcript}}` 并使用转录文本解析命令，确保斜杠命令有效。
  - 视频和图片描述保留任何说明文字供命令解析。
- 默认仅处理第一个匹配的图片/音频/视频附件；设置 `tools.media.<cap>.attachments` 可处理多个附件。

## 限制与错误

**出站发送限制（WhatsApp Web 发送）**

- 图片：重新压缩后大约 6 MB 限制。
- 音频/语音/视频：16 MB 限制；文档：100 MB 限制。
- 超大或不可读媒体 → 日志明确报错，跳过回复。

**媒体理解限制（转录/描述）**

- 图片默认：10 MB（`tools.media.image.maxBytes`）。
- 音频默认：20 MB（`tools.media.audio.maxBytes`）。
- 视频默认：50 MB（`tools.media.video.maxBytes`）。
- 超大媒体跳过理解，但原始正文仍正常回复。

## 测试注意事项

- 覆盖图片/音频/文档的发送与回复流程。
- 验证图片重新压缩（大小限制）及音频的语音消息标记。
- 确保多媒体回复按顺序逐条发送。
