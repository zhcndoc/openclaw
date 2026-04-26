---
summary: "媒体生成、理解和语音功能的统一入口页面"
read_when:
  - 查找媒体能力概览
  - 决定配置哪个媒体提供商
  - 了解异步媒体生成如何工作
title: "媒体概览"
---

# 媒体生成与理解

OpenClaw 生成图像、视频和音乐，理解入站媒体（图像、音频、视频），并通过文本转语音大声说出回复。所有媒体功能均由工具驱动：代理根据对话决定何时使用它们，并且只有在配置了至少一个支持提供商时，每个工具才会出现。

## 功能概览

| 功能                 | 工具             | 提供商                                                                                       | 作用                                                    |
| -------------------- | ---------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 图像生成             | `image_generate` | ComfyUI, fal, Google, MiniMax, OpenAI, Vydra, xAI                                            | 根据文本提示或参考图像创建或编辑图像                    |
| 视频生成             | `video_generate` | Alibaba, BytePlus, ComfyUI, fal, Google, MiniMax, OpenAI, Qwen, Runway, Together, Vydra, xAI | 根据文本、图像或现有视频创建视频                        |
| 音乐生成             | `music_generate` | ComfyUI, Google, MiniMax                                                                     | 根据文本提示创建音乐或音轨                              |
| 文本转语音（TTS）    | `tts`            | ElevenLabs, Google, Gradium, Microsoft, MiniMax, OpenAI, Vydra, xAI                          | 将外发回复转换为语音音频                                |
| 媒体理解             | （自动）         | 任何具备视觉/音频能力的模型提供商，以及 CLI 回退                                           | 总结入站图像、音频和视频                                 |

## 提供商功能矩阵

此表显示了哪些提供商支持平台上的哪些媒体功能。

| Provider   | Image | Video | Music | TTS | STT / Transcription | Realtime Voice | Media Understanding |
| ---------- | ----- | ----- | ----- | --- | ------------------- | -------------- | ------------------- |
| Alibaba    |       | Yes   |       |     |                     |                |                     |
| BytePlus   |       | Yes   |       |     |                     |                |                     |
| ComfyUI    | Yes   | Yes   | Yes   |     |                     |                |                     |
| Deepgram   |       |       |       |     | Yes                 |                |                     |
| ElevenLabs |       |       |       | Yes | Yes                 |                |                     |
| fal        | Yes   | Yes   |       |     |                     |                |                     |
| Google     | Yes   | Yes   | Yes   | Yes |                     | Yes            | Yes                 |
| Gradium    |       |       |       | Yes |                     |                |                     |
| Microsoft  |       |       |       | Yes |                     |                |                     |
| MiniMax    | Yes   | Yes   | Yes   | Yes |                     |                |                     |
| Mistral    |       |       |       |     | Yes                 |                |                     |
| OpenAI     | Yes   | Yes   |       | Yes | Yes                 | Yes            | Yes                 |
| Qwen       |       | Yes   |       |     |                     |                |                     |
| Runway     |       | Yes   |       |     |                     |                |                     |
| Together   |       | Yes   |       |     |                     |                |                     |
| Vydra      | Yes   | Yes   |       | Yes |                     |                |                     |
| xAI        | Yes   | Yes   |       | Yes | Yes                 |                |                     |

<Note>
媒体理解使用您在提供商配置中注册的任何具备视觉或音频能力的模型。上表突出了具有专用媒体理解支持的提供商；大多数具有多模态模型的 LLM 提供商（Anthropic、Google、OpenAI 等）在配置为活动回复模型时也可以理解入站媒体。
</Note>

## 异步生成如何工作

视频和音乐生成作为后台任务运行，因为提供商处理通常需要 30 秒到几分钟。当代理调用 `video_generate` 或 `music_generate` 时，OpenClaw 将请求提交给提供商，立即返回任务 ID，并在任务分类账中跟踪该作业。作业运行时，代理继续响应其他消息。当提供商完成时，OpenClaw 唤醒代理，以便它将完成的媒体发布回原始渠道。图像生成和 TTS 是同步的，并与回复一起内联完成。

Deepgram、ElevenLabs、Mistral、OpenAI 和 xAI 在配置时都可以通过批量 `tools.media.audio` 路径转录入站音频。Deepgram、ElevenLabs、Mistral、OpenAI 和 xAI 还会注册 Voice Call 流式 STT 提供商，因此实时电话音频可以在无需等待录音完成的情况下转发给所选供应商。

Google 映射到 OpenClaw 的图像、视频、音乐、批量 TTS、后端实时语音和媒体理解界面。OpenAI 映射到 OpenClaw 的图像、视频、批量 TTS、批量 STT、Voice Call 流式 STT、后端实时语音和记忆嵌入界面。xAI 当前映射到 OpenClaw 的图像、视频、搜索、代码执行、批量 TTS、批量 STT 和 Voice Call 流式 STT 界面。xAI Realtime voice 是上游能力，但在共享实时语音契约能够表示它之前，它不会在 OpenClaw 中注册。

## 快速链接

- [Image Generation](/tools/image-generation) -- 生成和编辑图像
- [Video Generation](/tools/video-generation) -- 文本生成视频、图像生成视频和视频生成视频
- [Music Generation](/tools/music-generation) -- 创建音乐和音轨
- [Text-to-Speech](/tools/tts) -- 将回复转换为语音音频
- [Media Understanding](/nodes/media-understanding) -- 理解入站图像、音频和视频

## 相关

- [Image generation](/tools/image-generation)
- [Video generation](/tools/video-generation)
- [Music generation](/tools/music-generation)
- [Text-to-speech](/tools/tts)
