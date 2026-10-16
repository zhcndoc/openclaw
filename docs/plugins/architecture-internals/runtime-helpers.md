---
summary: "从插件调用核心语音、媒体理解、子代理、网络搜索和图像生成助手"
read_when:
  - "您正在从插件调用核心 TTS、媒体理解、子代理或网络搜索助手"
  - "您正在注册演讲、媒体理解或网络搜索提供商"
  - "您需要核心编排和供应商行为之间的所有权划分"
title: "核心运行时助手"
sidebarTitle: "核心运行时助手"
---

`api.runtime` 向插件代码公开的内容，以及匹配提供者注册的所有权规则。 [插件架构内部](/plugins/architecture-internals)指南的一部分。

## <a id="runtime-helpers"></a> 运行时辅助工具

插件可以通过 `api.runtime` 访问选定的核心辅助工具。对于 TTS：

```ts
const clip = await api.runtime.tts.textToSpeech({
  text: "Hello from OpenClaw",
  cfg: api.config,
});

const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});

const voices = await api.runtime.tts.listVoices({
  provider: "elevenlabs",
  cfg: api.config,
});
```

注意：

- `textToSpeech` 返回 file/voice-note 表面的正常核心 TTS 输出有效负载。
- 使用核心 `tts` 配置和提供方选择。
- 返回PCM音频缓冲区+采样率。对于提供商来说，插件必须为 resample/encode。
- `listVoices` 对每个提供方来说都是可选的。将其用于供应商自有的语音选择器或设置流程。
- 核心会向提供方的 `listVoices` 钩子传递解析后的请求截止时间；提供方特定的超时设置可能会覆盖该时间。
- 语音列表可以包含更丰富的元数据，例如区域设置、性别和个性标签，以便支持提供方感知的选择器。
- Telephony 需要一个实现 `synthesizeTelephony` 的提供者；如果没有它，核心会跳过提供程序并报告 `unsupported_for_telephony`。实现它的捆绑提供程序：`azure-speech`、`elevenlabs`、`fish-audio-speech`、`google`、`gradium`、`inworld`、`openai`、`tts-local-cli` 和 `xai`。 `microsoft` 没有。

插件也可以通过 `api.registerSpeechProvider(...)` 注册语音提供方。

```ts
api.registerSpeechProvider({
  id: "acme-speech",
  label: "Acme Speech",
  isConfigured: ({ config }) => Boolean(config.messages?.tts),
  synthesize: async (req) => {
    return {
      audioBuffer: Buffer.from([]),
      outputFormat: "mp3",
      fileExtension: ".mp3",
      voiceCompatible: false,
    };
  },
});
```

注意：

- 将 TTS 策略、回退和回复投递保留在核心中。
- 对于供应商自有的合成行为，请使用语音提供方。
- 旧版 Microsoft `edge` 输入会被规范化为 `microsoft` 提供方 id。
- 推荐的所有权模型是公司导向的：一个供应商插件可以拥有文本、语音、图像，以及 OpenClaw 增加这些能力合同时的未来媒体提供方。

对于 image/audio/video 的理解，插件注册一种类型化媒体理解提供程序，而不是通用的 key/value 包：

```ts
api.registerMediaUnderstandingProvider({
  id: "google",
  capabilities: ["image", "audio", "video"],
  describeImage: async (req) => ({ text: "..." }),
  transcribeAudio: async (req) => ({ text: "..." }),
  describeVideo: async (req) => ({ text: "..." }),
});
```

注意：

- 将编排、回退、配置和通道接线保留在核心中。
- 将供应商行为保留在提供方插件中。
- 增量扩展应保持类型化：新增可选方法、新增可选结果字段、新增可选能力。
- 视频生成已经遵循相同模式：
  - 核心负责能力合约和运行时辅助工具
  - 供应商插件注册 `api.registerVideoGenerationProvider(...)`
  - feature/channel 插件消耗 `api.runtime.videoGeneration.*`

对于媒体理解运行时辅助工具，插件可以调用：

```ts
const image = await api.runtime.mediaUnderstanding.describeImageFile({
  filePath: "/tmp/inbound-photo.jpg",
  cfg: api.config,
  agentDir: "/tmp/agent",
});

const video = await api.runtime.mediaUnderstanding.describeVideoFile({
  filePath: "/tmp/inbound-video.mp4",
  cfg: api.config,
});

// receiptImageBuffer is your own image bytes, not an SDK-provided value.
const extraction = await api.runtime.mediaUnderstanding.extractStructuredWithModel({
  provider: "codex",
  model: "gpt-6-astra",
  input: [
    {
      type: "image",
      buffer: receiptImageBuffer,
      fileName: "receipt.png",
      mime: "image/png",
    },
    { type: "text", text: "Use the printed fields as the source of truth." },
  ],
  instructions: "Return entities and searchable tags.",
  schemaName: "example.evidence",
  jsonSchema: {
    type: "object",
    properties: {
      entities: { type: "array", items: { type: "string" } },
      tags: { type: "array", items: { type: "string" } },
    },
  },
  cfg: api.config,
});
```

对于音频转写，插件可以使用媒体理解运行时，或者旧的 STT 别名：

```ts
const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

注意：

- `api.runtime.mediaUnderstanding.*` 是 image/audio/video 理解的首选共享表面。
- `extractStructuredWithModel(...)` 是面向插件的接口，用于有界提供商拥有的图像优先提取。包括至少一张图像输入；文本输入是补充上下文。产品插件拥有自己的路由和架构，而 OpenClaw 拥有 provider/runtime 边界。
- 使用核心媒体理解音频配置（`tools.media.audio`）和提供方回退顺序。
- 当未生成转录输出（例如 skipped/unsupported 输入）时，返回 `{ text: undefined }`。

插件还可以通过 `api.runtime.subagent` 启动后台子代理运行：

```ts
const result = await api.runtime.subagent.run({
  sessionKey: "agent:main:subagent:search-helper",
  message: "Expand this query into focused follow-up searches.",
  toolsAlsoAllow: ["my_plugin_progress"],
  provider: "openai",
  model: "gpt-4.1-mini",
  deliver: false,
});
```

注意：

- `provider` 和 `model` 是每次运行可选的覆盖项，不是持久的会话更改。
- `toolsAlsoAllow` 接受由调用插件注册的、精确且唯一拥有的工具名称。核心和含糊不清的名称会被拒绝。它会在正常配置文件的基础上进行叠加，但操作员的允许列表和拒绝列表仍然具有最终权威。
- OpenClaw 仅对受信任的调用方认可这些覆盖字段。
- 对于插件拥有的回退运行，操作员必须显式启用 `plugins.entries.<id>.subagent.allowModelOverride: true`。
- 使用 `plugins.entries.<id>.subagent.allowedModels` 将受信任插件限制为特定规范化 `provider/model` 目标，或使用 `"*"` 显式允许任何目标。
- 不受信任的插件子代理运行仍然可以工作，但覆盖请求会被拒绝，而不是静默回退。
- 由插件创建的子代理会话会标记创建它的插件 id。兼容的 `api.runtime.subagent.deleteSession(...)` 只能删除这些所属会话；任意会话删除仍然需要具有管理员范围的 Gateway 请求。

对于网络搜索，插件可以消费共享运行时辅助工具，而不是直接进入代理工具接线：

```ts
const providers = api.runtime.webSearch.listProviders({
  config: api.config,
});

const result = await api.runtime.webSearch.search({
  config: api.config,
  args: {
    query: "OpenClaw plugin runtime helpers",
    count: 5,
  },
});
```

插件也可以通过 `api.registerWebSearchProvider(...)` 注册网络搜索提供方。

注意：

- 将提供方选择、凭据解析和共享请求语义保留在核心中。
- 对于供应商特定的搜索传输，请使用网络搜索提供方。
- `api.runtime.webSearch.*` 是 feature/channel 插件的首选共享表面，这些插件需要搜索行为而不依赖于代理工具包装器。

### `api.runtime.imageGeneration`

```ts
const result = await api.runtime.imageGeneration.generate({
  config: api.config,
  args: { prompt: "A friendly lobster mascot", size: "1024x1024" },
});

const providers = api.runtime.imageGeneration.listProviders({
  config: api.config,
});
```

- `generate(...)`：使用已配置的图像生成提供方链生成图像。
- `listProviders(...)`：列出可用的图像生成提供方及其能力。
