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

实时语音使用 Talk 会话契约，而不是一次性媒体工具路径。Talk 有三种模式：提供商原生 `realtime`、本地或流式 `stt-tts`，以及用于仅观察式语音采集的 `transcription`。这些模式与电话、会议、浏览器实时和原生按住说话客户端共享提供商目录、事件封装和取消语义。

## 功能

<CardGroup cols={2}>
  <Card title="图像生成" href="/tools/image-generation" icon="image">
    通过文本提示或参考图像，使用 `image_generate` 创建和编辑图像。聊天会话中异步运行——在后台运行，并在准备好时发布结果。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    通过 `video_generate` 实现文生视频、图生视频和视频转视频。
    异步——在后台运行，并在准备好时发布结果。
  </Card>
  <Card title="音乐生成" href="/tools/music-generation" icon="music">
    通过 `music_generate` 生成音乐或音轨。聊天会话中异步运行，使用共享的媒体生成任务生命周期。
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

<Note>
此表涵盖专用的媒体生成、TTS 和 STT 插件。许多聊天模型提供商（Anthropic、Google、OpenAI 等）也能通过其回复模型理解传入媒体；请参阅 [Media understanding](/nodes/media-understanding#provider-support-matrix) 中的完整提供商列表。
</Note>

| Provider          | Image | Video | Music | TTS | STT | Realtime voice | Media understanding |
| ----------------- | :---: | :---: | :---: | :-: | :-: | :------------: | :-----------------: |
| Alibaba           |       |   ✓   |       |     |     |                |                     |
| Azure Speech      |       |       |       |  ✓  |     |                |                     |
| BytePlus          |       |   ✓   |       |     |     |                |                     |
| ComfyUI           |   ✓   |   ✓   |   ✓   |     |     |                |                     |
| Deepgram          |       |       |       |     |  ✓  |                |                     |
| DeepInfra         |   ✓   |   ✓   |       |  ✓  |  ✓  |                |          ✓          |
| ElevenLabs        |       |       |       |  ✓  |  ✓  |                |                     |
| fal               |   ✓   |   ✓   |   ✓   |     |     |                |                     |
| Google            |   ✓   |   ✓   |   ✓   |  ✓  |  ✓  |       ✓        |          ✓          |
| Gradium           |       |       |       |  ✓  |     |                |                     |
| Inworld           |       |       |       |  ✓  |     |                |                     |
| LiteLLM           |   ✓   |       |       |     |     |                |                     |
| Local CLI         |       |       |       |  ✓  |     |                |                     |
| Microsoft         |       |       |       |  ✓  |     |                |                     |
| Microsoft Foundry |   ✓   |       |       |     |     |                |                     |
| MiniMax           |   ✓   |   ✓   |   ✓   |  ✓  |     |                |                     |
| Mistral           |       |       |       |     |  ✓  |                |                     |
| OpenAI            |   ✓   |   ✓   |       |  ✓  |  ✓  |       ✓        |          ✓          |
| OpenRouter        |   ✓   |   ✓   |   ✓   |  ✓  |  ✓  |                |          ✓          |
| PixVerse          |       |   ✓   |       |     |     |                |                     |
| Qwen              |       |   ✓   |       |     |     |                |          ✓          |
| Runway            |       |   ✓   |       |     |     |                |                     |
| SenseAudio        |       |       |       |     |  ✓  |                |                     |
| Together          |       |   ✓   |       |     |     |                |                     |
| Volcengine        |       |       |       |  ✓  |     |                |                     |
| Vydra             |   ✓   |   ✓   |       |  ✓  |     |                |                     |
| xAI               |   ✓   |   ✓   |       |  ✓  |  ✓  |                |          ✓          |
| Xiaomi MiMo       |       |       |       |  ✓  |     |                |                     |

<Note>
这里的 **Realtime voice** 指的是提供商原生的双向实时能力（Talk `realtime` 模式，例如 Gemini Live 或 OpenAI Realtime API）——目前只有 Google 和 OpenAI 注册了这一能力。Deepgram、ElevenLabs、Mistral、OpenAI 和 xAI 另外注册了 Voice Call 流式 STT（单向音频转文本）；请参阅下方 [Speech-to-text and Voice Call](#speech-to-text-and-voice-call)。
xAI Realtime voice 是上游能力，但在共享的 realtime-voice 合同能够表示它之前，尚未在 OpenClaw 中注册。
</Note>

## 异步与同步

| 能力            | 模式         | 原因                                                                                                 |
| -------------- | ------------ | ---------------------------------------------------------------------------------------------------- |
| 图像           | 异步         | 提供商处理可能会超出一次聊天轮次；生成的附件使用共享完成路径。   |
| 文本转语音     | 同步         | 提供商响应会在数秒内返回；附加到回复音频。                                   |
| 视频           | 异步         | 提供商处理需要 30 秒到数分钟；较慢的队列可运行到配置的超时。 |
| 音乐           | 异步         | 与视频相同的提供商处理特性。                                                    |

对于异步工具，OpenClaw 会将请求提交给提供商，立即返回一个任务 id，并在任务账本中跟踪该作业。代理在作业运行期间继续响应其他消息。当提供商完成后，OpenClaw 会用生成的媒体路径唤醒代理，以便它可以通过会话的正常可见回复模式告知用户：如果已配置，则自动发送最终回复；如果会话需要消息工具，则使用 `message(action="send")`。如果请求者会话处于非活动状态，或者其活动唤醒失败，并且完成回复中仍缺少某些生成的媒体，OpenClaw 会仅针对缺失的媒体发送幂等的直接回退。已由完成回复发送过的媒体不会再次发布。

## 语音转文本与 Voice Call

Deepgram、DeepInfra、ElevenLabs、Google、Groq、Mistral、OpenAI、OpenRouter、
SenseAudio 和 xAI 在配置后都可以通过批处理
`tools.media.audio` 路径转录传入音频。对语音消息进行预检以进行提及门控或命令解析的频道插件，会在传入上下文中标记已转录的附件，因此共享的媒体理解流程会复用该转录内容，而不是对同一音频进行第二次 STT 调用。

Deepgram、ElevenLabs、Mistral、OpenAI 和 xAI 也会注册 Voice Call
流式 STT 提供商，因此实时电话音频可以在无需等待录音完成的情况下
转发给所选
供应商。

对于实时用户对话，请优先使用 [Talk 模式](/nodes/talk)。批量音频附件仍保留在媒体路径上；浏览器实时、原生按住说话、电话和会议音频应使用 Talk 事件以及 Gateway 返回的会话作用域目录。

## Provider Mapping (How Each Vendor Is Distributed Across Surfaces)

<AccordionGroup>
  <Accordion title="Google">
    图片、视频、音乐、批量 TTS、批量 STT、后端实时语音，以及
    媒体理解表面。
  </Accordion>
  <Accordion title="OpenAI">
    图像、视频、批量 TTS、批量 STT、Voice Call 流式 STT、后端
    实时语音，以及记忆嵌入相关能力。
  </Accordion>
  <Accordion title="DeepInfra">
    聊天/模型路由、图像生成/编辑、文本转视频、批量 TTS、
    批量 STT、图像媒体理解，以及记忆嵌入表面。
    DeepInfra 还暴露了 reranking、classification、object-detection，以及
    其他原生模型类型；OpenClaw 目前尚未为这些类别提供供应商合约，
    因此此插件不会注册它们。
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
- [Talk 模式](/nodes/talk)
