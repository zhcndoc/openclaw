---
summary: "一览图像、视频、音乐、语音和媒体理解能力"
read_when:
  - 寻找 OpenClaw 媒体能力概览
  - 决定配置哪个媒体提供商
  - 了解异步媒体生成的工作方式
title: "媒体概览"
sidebarTitle: "媒体概览"
---

OpenClaw 可生成图像、视频和音乐，理解传入媒体
（图像、音频、视频），并通过文本转语音将回复朗读出来。所有
媒体能力都由工具驱动：代理会根据对话决定何时使用它们，
并且每个工具只有在至少配置了一个后端提供商时才会出现。

## 功能

<CardGroup cols={2}>
  <Card title="图像生成" href="/tools/image-generation" icon="image">
    通过 `image_generate` 从文本提示或参考图像创建和编辑图像。同步——在回复中内联完成。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    通过 `video_generate` 实现文生视频、图生视频和视频转视频。
    异步——在后台运行，并在准备好时发布结果。
  </Card>
  <Card title="音乐生成" href="/tools/music-generation" icon="music">
    通过 `music_generate` 生成音乐或音频轨道。在共享提供商上为异步；
    ComfyUI 工作流路径则同步运行。
  </Card>
  <Card title="文本转语音" href="/tools/tts" icon="microphone">
    通过 `tts` 工具加上 `messages.tts` 配置将外发回复转换为语音音频。同步。
  </Card>
  <Card title="媒体理解" href="/nodes/media-understanding" icon="eye">
    使用具备视觉能力的模型提供商和专用媒体理解插件，对传入的图像、音频和视频进行摘要。
  </Card>
  <Card title="语音转文本" href="/nodes/audio" icon="ear-listen">
    通过批量 STT 或 Voice Call 流式 STT 提供商转录传入的语音消息。
  </Card>
</CardGroup>

## 提供商能力矩阵

| 提供商       | 图像 | 视频 | 音乐 | TTS | STT | 实时语音 | 媒体理解 |
| ------------ | :--: | :--: | :--: | :-: | :-: | :------: | :------: |
| Alibaba      |      |  ✓   |      |     |     |          |          |
| BytePlus     |      |  ✓   |      |     |     |          |          |
| ComfyUI      |  ✓   |  ✓   |  ✓   |     |     |          |          |
| DeepInfra    |  ✓   |  ✓   |      |  ✓  |  ✓  |          |    ✓     |
| Deepgram     |      |      |      |     |  ✓  |    ✓     |          |
| ElevenLabs   |      |      |      |  ✓  |  ✓  |          |          |
| fal          |  ✓   |  ✓   |      |     |     |          |          |
| Google       |  ✓   |  ✓   |  ✓   |  ✓  |     |    ✓     |    ✓     |
| Gradium      |      |      |      |  ✓  |     |          |          |
| Local CLI     |      |      |      |  ✓  |     |          |          |
| Microsoft    |      |      |      |  ✓  |     |          |          |
| MiniMax      |  ✓   |  ✓   |  ✓   |  ✓  |     |          |          |
| Mistral      |      |      |      |     |  ✓  |          |          |
| OpenAI       |  ✓   |  ✓   |      |  ✓  |  ✓  |    ✓     |    ✓     |
| OpenRouter   |  ✓   |  ✓   |      |  ✓  |     |          |    ✓     |
| Qwen         |      |  ✓   |      |     |     |          |          |
| Runway       |      |  ✓   |      |     |     |          |          |
| SenseAudio   |      |      |      |     |  ✓  |          |          |
| Together     |      |  ✓   |      |     |     |          |          |
| Vydra        |  ✓   |  ✓   |      |  ✓  |     |          |          |
| xAI          |  ✓   |  ✓   |      |  ✓  |  ✓  |          |    ✓     |
| Xiaomi MiMo  |  ✓   |      |      |  ✓  |     |          |    ✓     |

<Note>
媒体理解使用在你的提供商配置中注册的任何具备视觉能力或音频能力的模型。上面的矩阵列出了具备专用媒体理解支持的提供商；大多数多模态 LLM 提供商（Anthropic、Google、OpenAI 等）在配置为当前回复模型时，也可以理解传入媒体。
</Note>

## 异步与同步

| 功能            | 模式         | 原因                                                               |
| --------------- | ------------ | ------------------------------------------------------------------ |
| 图像            | 同步         | 提供商响应在几秒内返回；在回复中内联完成。                          |
| 文本转语音      | 同步         | 提供商响应在几秒内返回；作为回复音频的一部分附加。                  |
| 视频            | 异步         | 提供商处理需要 30 秒到数分钟。                                     |
| 音乐（共享）    | 异步         | 与视频相同的提供商处理特征。                                       |
| 音乐（ComfyUI） | 同步         | 本地工作流针对已配置的 ComfyUI 服务器内联运行。                    |

对于异步工具，OpenClaw 会将请求提交给提供商，立即返回任务
id，并在任务账本中跟踪作业。代理会在作业运行时继续
响应其他消息。当提供商完成后，
OpenClaw 会唤醒代理，以便它将生成完成的媒体发布回
原始频道。

## 语音转文本与 Voice Call

当配置后，Deepgram、DeepInfra、ElevenLabs、Mistral、OpenAI、SenseAudio 和 xAI 都可以通过批量 `tools.media.audio` 路径转录
传入音频。
会对语音消息进行 mention gating 或命令
解析的频道插件，会在传入上下文中标记已转录的附件，因此共享
媒体理解流程会复用该转录内容，而不是对同一音频再发起第二次
STT 调用。

Deepgram、ElevenLabs、Mistral、OpenAI 和 xAI 也会注册 Voice Call
流式 STT 提供商，因此实时电话音频可以在无需等待录音完成的情况下
转发给所选
供应商。

## 提供商映射（供应商如何在各个表面上拆分）

<AccordionGroup>
  <Accordion title="Google">
    图像、视频、音乐、批量 TTS、后端实时语音，以及
    媒体理解相关能力。
  </Accordion>
  <Accordion title="OpenAI">
    图像、视频、批量 TTS、批量 STT、Voice Call 流式 STT、后端
    实时语音，以及记忆嵌入相关能力。
  </Accordion>
  <Accordion title="DeepInfra">
    聊天/模型路由、图像生成/编辑、文生视频、批量 TTS、
    批量 STT、图像媒体理解，以及记忆嵌入相关能力。
    在 OpenClaw 拥有这些类别的专用提供商合约之前，DeepInfra 原生的 rerank/classification/object-detection 模型不会注册。
  </Accordion>
  <Accordion title="xAI">
    图像、视频、搜索、代码执行、批量 TTS、批量 STT，以及 Voice
    Call 流式 STT。xAI Realtime 语音是上游能力，但在共享实时语音合约能够表示它之前，
    不会在 OpenClaw 中注册。
  </Accordion>
</AccordionGroup>

## 相关内容

- [图像生成](/tools/image-generation)
- [视频生成](/tools/video-generation)
- [音乐生成](/tools/music-generation)
- [文本转语音](/tools/tts)
- [媒体理解](/nodes/media-understanding)
- [音频节点](/nodes/audio)
