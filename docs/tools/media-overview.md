---
summary: "一览图像、视频、音乐、语音和媒体理解能力"
read_when:
  - "寻找 OpenClaw 媒体能力概览"
  - "决定配置哪个媒体提供商"
  - "了解异步媒体生成的工作方式"
title: "媒体概览"
sidebarTitle: "媒体概览"
---

OpenClaw 可生成图像、视频和音乐，理解传入媒体 （图像、音频、视频），并通过文本转语音将回复朗读出来。所有媒体能力都由工具驱动：代理会根据对话决定何时使用它们， 并且每个工具只有在至少配置了一个后端提供商时才会出现。

实时语音使用 Talk 会话契约，而不是一次性媒体工具路径。Talk 有三种模式：提供商原生 `realtime`、本地或流式 `stt-tts`，以及用于仅观察式语音采集的 `transcription`。这些模式与电话、会议、浏览器实时和原生按住说话客户端共享提供商目录、事件封装和取消语义。

## <a id="capabilities"></a> 功能

<CardGroup cols={2}>
  <Card title="图像生成" href="/tools/image-generation" icon="image">
    通过文本提示或参考图像，使用 `image_generate` 创建和编辑图像。聊天会话中异步运行——在后台运行，并在准备好时发布结果。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    通过 `video_generate` 实现文生视频、图生视频和视频转视频。 异步——在后台运行，并在准备好时发布结果。
  </Card>
  <Card title="音乐生成" href="/tools/music-generation" icon="music">
    通过 `music_generate` 生成音乐或音轨。聊天会话中异步运行，使用共享的媒体生成任务生命周期。
  </Card>
  <Card title="文本转语音" href="/tools/tts" icon="microphone">
    通过 `tts` 工具以及 `tts` 配置将对外回复转换为语音音频。同步。
  </Card>
  <Card title="媒体理解" href="/nodes/media-understanding" icon="eye">
    使用具备视觉能力的模型提供商和专用媒体理解插件，对传入的图像、音频和视频进行摘要。
  </Card>
  <Card title="语音转文本" href="/nodes/audio" icon="ear-listen">
    通过批量 STT 或语音通话流式 STT 提供商转录传入的语音消息。
  </Card>
  <Card title="媒体播放" href="/nodes/media-playback" icon="play">
    通过托管访问和便携式播放演绎，在 Control UI 和本机应用程序中内联播放助理音频和视频。
  </Card>
</CardGroup>

## <a id="local-media-files"></a> 本地媒体文件

`view_image`、`pdf` 以及 `image_generate`、`music_generate` 和 `video_generate` 的参考输入使用任务的工作目录作为相对路径。即使代理的默认工作区位于其他位置，在 Git 工作树中运行的任务也可以从该工作树读取媒体。

仅工作区访问遵循会话批准的文件系统根目录，其中可以包括当前工作目录的父目录。主机工具还可以读取网关的媒体存储，包括浏览器屏幕截图和暂存的入站附件。这些根之外的路径和符号链接将被拒绝。沙盒工具读取沙盒文件系统；选择主机工作树不会授予沙箱外部的访问权限。

## <a id="provider-capability-matrix"></a> 提供商能力矩阵

<Note>
此表涵盖专用的媒体生成、TTS 和 STT 插件。许多聊天模型提供商（Anthropic、Google、OpenAI 等）也能通过其回复模型理解传入媒体；请参阅 [媒体理解](/nodes/media-understanding#provider-support-matrix) 中的完整提供商列表。
</Note>

| 提供者          | 图像 | 视频 | 音乐 | TTS | STT | 实时语音 | 媒体理解 |
| ----------------- | :---: | :---: | :---: | :-: | :-: | :------------: | :-----------------: |
| 阿里巴巴           |       |   ✓   |       |     |     |                |                     |
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
| 本地 CLI         |       |       |       |  ✓  |     |                |                     |
| Microsoft         |       |       |       |  ✓  |     |                |                     |
| Microsoft代工厂 |   ✓   |       |       |     |     |                |                     |
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
**实时语音**此处表示提供商本机双向实时（Talk `realtime`模式、e.g. Gemini Live或OpenAI实时API） - 仅Google和OpenAI 立即注册。 Deepgram、ElevenLabs、Mistral、OpenAI和xAI分别注册语音通话流STT（单向音频转文本）；请参阅下面的 [Speech-to-text 和语音 Call](#speech-to-text-and-voice-call)。 xAI 实时语音是一种上游功能，但在共享实时语音合约可以代表它之前不会在 OpenClaw 中注册。
</Note>

## <a id="async-vs-synchronous"></a> 异步与同步

| 能力     | 模式         | 原因                                                                                                  |
| -------------- | ------------ | ---------------------------------------------------------------------------------------------------- |
| 图像          | 异步 | 提供商处理可能会超出一次聊天轮次；生成的附件使用共享完成路径。   |
| 文本转语音 | 同步  | 提供商响应会在数秒内返回；附加到回复音频。                                   |
| 视频          | 异步 | 提供商处理需要 30 秒到数分钟；较慢的队列可运行到配置的超时。 |
| 音乐          | 异步 | 与视频相同的提供商处理特性。                                                    |

对于异步工具，OpenClaw 将请求提交给提供者，立即返回任务 ID，并在媒体运行时跟踪作业。作业运行时，代理会继续响应其他消息。当提供者完成时，OpenClaw 使用生成的媒体路径唤醒代理，以便它可以通过会话的正常可见回复模式告诉用户：配置时自动最终回复传送，或当会话需要消息工具时 `message(action="send")`。如果请求方会话处于非活动状态或其主动唤​​醒失败，并且完成回复中仍然缺少某些生成的媒体，则 OpenClaw 会发送仅包含缺少媒体的直接回退，而不会在重试时重复发送。完成回复已交付的媒体不会再次发布。

如果无法确认完成传送并且原始会话仍然存在，OpenClaw 会尝试在该会话的历史记录中保留生成的媒​​体引用。完成仍与原始会话和存储位置绑定；替换会话永远不会收到它。瞬时队列准入失败使用有界重试。如果队列准入和历史存储仍然不可用，则完成以诊断和进程本地媒体引用结束；无法保证持久恢复。本地历史通知不会将媒体重新发送到频道。

## <a id="speech-to-text-and-voice-call"></a> 语音转文字和语音通话

Deepgram、DeepInfra、ElevenLabs、Google、Groq、Mistral、OpenAI、OpenRouter、 SenseAudio 和 xAI 在完成配置后，都可以通过批处理 `tools.media.audio` 路径转录传入的音频。会在提及门控或命令解析前预检查语音消息的频道插件，会在传入上下文中标记已转录的附件，使共享的媒体理解流程能够复用该转录结果，而无需对同一音频再次发起 STT 调用。

Deepgram、ElevenLabs、Mistral、OpenAI 和 xAI 还会注册语音通话流式 STT 提供商，因此实时通话音频可以转发给所选的提供商，无需等待录音结束。

对于实时用户对话，优先使用 [通话模式](/nodes/talk)。批量音频附件仍然通过媒体路径处理；浏览器实时音频、原生按住说话、电话和会议音频应使用 Talk 事件以及 Gateway 返回的会话作用域目录。

## <a id="provider-mappings-(how-vendors-split-across-surfaces)"></a><a id="provider-mappings-how-vendors-split-across-surfaces"></a> 供应商映射（各供应商如何分布到不同表面）

<AccordionGroup>
  <Accordion title="Google">
    图片、视频、音乐、批量 TTS、批量 STT、后端实时语音，以及媒体理解表面。
  </Accordion>
  <Accordion title="OpenAI">
    图像、视频、批量 TTS、批量 STT、Voice Call 流式 STT、后端实时语音，以及记忆嵌入相关能力。
  </Accordion>
  <Accordion title="DeepInfra">
    Chat/model 路由、图像 generation/editing、文本到视频、批处理 TTS、批处理 STT、图像媒体理解和内存嵌入表面。 DeepInfra 还公开了重新排序、分类、对象检测和其他本机模型类型； OpenClaw 还没有这些类别的提供商合同，因此该插件不会注册它们。
  </Accordion>
  <Accordion title="xAI">
    图像、视频、搜索、代码执行、批量 TTS、批量 STT，以及 Voice Call 流式 STT。xAI Realtime 语音是上游能力，但在共享实时语音合约能够表示它之前， 不会在 OpenClaw 中注册。
  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

- [图像生成](/tools/image-generation)
- [视频生成](/tools/video-generation)
- [音乐生成](/tools/music-generation)
- [文本转语音](/tools/tts)
- [媒体播放](/nodes/media-playback)
- [媒体理解](/nodes/media-understanding)
- [音频节点](/nodes/audio)
- [对话模式](/nodes/talk)
