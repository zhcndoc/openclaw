---
summary: "Talk 模式：跨本地 STT/TTS 和实时语音的连续语音对话"
read_when:
  - "在 macOS/iOS/Android 上实现 Talk 模式时"
  - "在 Apple 手表上使用独立语音"
  - "更改 voice/TTS/interrupt 行为"
title: "Talk 模式"
---

对话模式涵盖以下运行时形状：

- **Native macOS/iOS/Android Talk**：本机语音识别、网关聊天和 `talk.speak` TTS。 Apple macOS/iOS 上的语音识别可能会使用网络服务。 Android 行为取决于安装的语音服务。节点通告 `talk` 能力并声明它们支持哪些 `talk.*` 命令。
- **iOS 通话（实时）**：客户端拥有的 WebRTC，用于选择 `webrtc` 传输或省略传输的 OpenAI 实时配置。此路径包括有帧和无帧 transcript/audio 事件。显式 `gateway-relay`、`provider-websocket` 和非 OpenAI 实时配置保留在网关拥有的中继上。非实时配置使用本机语音循环。
- **Apple 观看独立 Talk**：通过 UDP 进行本机 WebRTC/Opus，具有网关拥有的呼叫控制 （`gateway-control-v1`）。手表使用网关配置的实时提供程序。它将工具和成绩单所有权保留在网关上。不支持的配置在没有中继回退的情况下会明显失败。
- **Browser Talk**：`talk.client.create` 用于客户端拥有的 `webrtc`/`provider-websocket` 会话，或 `talk.session.create` 用于网关拥有的 `gateway-relay` 会话。 `managed-room` 预留给网关切换和对讲机室。
- **Android 通话（实时）**：当 `talk.catalog` 报告实时组就绪时，Android 使用网关拥有的中继实时。对于支持的 GPT-Live 模型，网关通过 `talk.config` 通告中继功能，因此 Android 启动 `talk.session.create`，而不是本机语音识别和 `talk.speak`。 Android 从不打开客户端拥有的 WebRTC 会话。没有功能提示和未列出的 GPT-Live 路由的旧网关保留本机 Talk 并带有可见的解释。显式 `stt-tts` 模式也保持本机模式。中继功能不是身份验证准备就绪：目录和会话创建仍会验证所选帐户。订阅验证的 Android 现场音频验证仍在等待中。
- **仅转录客户端**：`talk.session.create({ mode: "transcription", transport: "gateway-relay", brain: "none" })`，然后是 `talk.session.appendAudio` 和 `talk.session.close`（对于 captions/dictation），无助理语音响应。一键上传的语音笔记仍然使用[媒体了解的](/nodes/media-understanding)音频路径。

Native Talk 是一个连续循环。它倾听讲话。它通过活动会话将转录本发送到模型。它等待响应。然后，它通过配置的 Talk 提供程序 （`talk.speak`） 说出响应。

对于以防护代码为主的回复，`talk.speak` 使用简短的语音消息将听众引导至屏幕。内联代码和普通散文仍然是口头回复的一部分。

Apple 手表还保留了 **Talk to Claw**、单独的 [one-turn 同伴流 ](/platforms/ios#talk-to-claw-with-the-iphone)。该流程使用本机听写、通过 iPhone 转发的文本以及系统语音回读。 Watch**Talk** 是正常手表设置中包含的实时路径。请参阅 [ 独立语音设置 ](/platforms/ios#standalone-voice)。

## <a id="talk-documentation-pages"></a> Talk 文档页面

谈话模式记录在此页面和四个子页面上，每个读者作业一个。此页面保留语音指令和 `talk` 配置参考。打开与您的任务匹配的子页面。

| 页面                                                                   | 读它的时候                                                                          |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [Talk 实时会话和授权](/nodes/talk/realtime-sessions) | 您正在连接实时通话：语音选择、授权、引导和文字记录。 |
| [Talk 会话所有权](/nodes/talk/session-ownership)                | 您需要代理和会话解析、控制权限或封闭语义。         |
| [谈论macOS和网关继电器](/nodes/talk/macos-relay)         | 您在 macOS 上运行 Talk 或启用流式实时网关中继。                  |
| [Talk 客户端 UI](/nodes/talk/client-ui)                                | 您需要 macOS、Apple 手表或 Android 客户端控件和行为。             |

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/nodes/talk#session-ownership`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="choose-a-talk-voice-from-chat" />[从聊天中选择对话语音](/nodes/talk/realtime-sessions#choose-a-talk-voice-from-chat)
- <a id="session-ownership" />[会话所有权](/nodes/talk/session-ownership#session-ownership)
- <a id="behavior-(macos)" />[行为 （macOS）](</nodes/talk/macos-relay#behavior-(macos)>）
- <a id="behavior-macos" />[行为 （macOS）](/nodes/talk/macos-relay#behavior-macos)
- <a id="realtime-talk-over-the-gateway-relay-(macos)" />[通过网关中继实时通话 （macOS）](</nodes/talk/macos-relay#realtime-talk-over-the-gateway-relay-(macos)>）
- <a id="realtime-talk-over-the-gateway-relay-macos" />[通过网关中继实时通话 （macOS）](/nodes/talk/macos-relay#realtime-talk-over-the-gateway-relay-macos)
- <a id="when-realtime-cannot-start" />[实时无法启动时](/nodes/talk/macos-relay#when-realtime-cannot-start)
- <a id="macos-ui" />[macOS UI](/nodes/talk/client-ui#macos-ui)
- <a id="apple-watch-ui" />[Apple 手表 UI](/nodes/talk/client-ui#apple-watch-ui)
- <a id="android-ui" />[Android UI](/nodes/talk/client-ui#android-ui)

## <a id="voice-directives-in-replies"></a> 回复中的语音命令

助手可以在回复前添加一行 JSON 来控制语音播放：

```json
{ "voice": "<voice-id>", "once": true }
```

规则：

- 仅第一条非空行。 JSON 线在 TTS 播放之前被剥离。
- 未知键将被忽略。
- `once: true` 仅适用于当前回复。如果没有它，语音将成为新的默认通话模式。

支持的键：`voice` / `voice_id` / `voiceId`，`model` / `model_id` / `modelId`，`speed`，`rate`（每分钟词数，WPM），`stability`，`similarity`，`style`，`speakerBoost`，`seed`，`normalize`，`lang`，`output_format`，`latency_tier`，`once`。

## <a id="config-(~%2F.openclaw%2Fopenclaw.json)"></a><a id="config-/-openclaw/openclaw-json"></a> 配置（`~/.openclaw/openclaw.json`）

尖括号值（例如 `<elevenlabs-api-key>`）是占位符。用您自己的价值观替换它们。

```json5
{
  talk: {
    provider: "elevenlabs",
    providers: {
      elevenlabs: {
        voiceId: "<elevenlabs-voice-id>",
        modelId: "eleven_v3",
        outputFormat: "mp3_44100_128",
        apiKey: "<elevenlabs-api-key>",
      },
      mlx: {
        modelId: "mlx-community/Soprano-80M-bf16",
        // Fish S2 Pro can also use a local reference voice:
        // referenceAudioPath: "/Users/example/Voices/reference.wav",
        // referenceText: "Exact transcript of the reference clip.",
      },
      system: {},
    },
    speechLocale: "ru-RU",
    silenceTimeoutMs: 1500,
    interruptOnSpeech: true,
    realtime: {
      provider: "openai",
      providers: {
        openai: {
          apiKey: "<openai-api-key>",
          model: "gpt-realtime-2.1",
          speakerVoice: "cedar",
        },
      },
      instructions: "Speak warmly and keep answers brief.",
      mode: "realtime",
      transport: "webrtc",
      brain: "agent-consult",
    },
  },
}
```

OpenAI浏览器WebRTC和网关中继Talk支持本机GPT-Live。在 **设置 → Talk** 中，为公共 API 选择 `gpt-live-1`，或为 Codex 路由选择 `gpt-live-1-codex`。公共API需要平台密钥； Codex 路由更喜欢 OpenClaw ChatGPT OAuth 配置文件，并回退到平台 API-key 身份验证。 Browser Talk 使用具有网关拥有控制权的客户端 WebRTC。网关中继对 `gpt-live-1` 使用直接平台密钥 WebSockets，对 `gpt-live-1-codex` 使用网关拥有的 WebRTC。当配置相应的 Live 模型时，Discord 使用这些相同的网关网桥。

帐户发布的、未列出的路由可以在 `talk.realtime.model` 中设置，但不会通过目录或诊断发布。他们从不使用 OAuth 并且需要平台密钥。 GPT-Live browser Talk 还需要以完整模式注册捆绑的 `openai` 插件。限制性 `plugins.allow` 列表无法创建会话，并显示“OpenAI GPT-Live 浏览器会话代理不可用”。运行时限制：每个网关 8 个并发会话和一个 30 分钟的会话 TTL。浏览器会话还使用 60 秒的一次性优惠令牌。

Codex 路由使用 `arbor`、`breeze`、`cove`、`ember`、`juniper`、`maple`、`sol`、`spruce` 和`vale`，默认为 `cove`。公开的API默认为`marin`，并有自己的[语音列表](/providers/openai/voice-and-speech)。 Talk和Discord中选择相同模型和支持的语音即可使用相同的语音； `cove` 与公共 `gpt-live-1` 模型回落到 `marin`。未列出的路由使用其账户下发的语音合约；当前未列出的平台配置文件接受 `marin` 和 `cedar`。被拒绝的会话本身无法识别原因。检查所选的帐户、模型和语音。

GPT-Live 本机处理中断并产生连续音频，无需完成响应事件。 Discord 通过委托的 OpenClaw 工作保留每个发言者的身份。每个扬声器的语音模型连接保持独立；共享房间上下文属于 OpenClaw 座席对话。请参阅 Discord](/channels/discord/voice-channels#gpt-live-in-discord) 中的 [GPT-Live 了解配置以及主持人强制参与会议的限制。

| 使用者                    | GPT-Live 状态                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| 浏览器 Talk                | Codex路线：OAuth-第一；公共API和非列出路由：平台密钥客户端WebRTC           |
| Gateway 中继 Talk          | Codex路线：OAuth-先WebRTC；公共API和非上市路线：直达平台关键运输 |
| Discord 实时语音      | 与 Talk 相同的网关桥接：Codex OAuth-first WebRTC 或公共平台密钥 WebSocket        |
| 语音通话和电话    | 平台密钥后端 WebSocket                                                                 |
| iOS 客户端自有 Talk       | 实施的； GPT-Live 设备实时验证待处理                                         |
| Apple 观看独立演讲 | 实现了网关控制的WebRTC；实体手表验证待定                     |
| Android 实时 Talk       | 网关发布的路由使用中继； Android 现场音频验证待定          |

这些行描述了已实现的传输路径，而不是帐户权限或每个设备上成功的实时呼叫。 iOS 实现无框架转录和网关报价交换。 Android 遵循网关中继功能提示，并仅在该提示不存在时保留其旧版 GPT-Live 模型网关。模型能力限制请参见[Discord语音策略](/channels/discord/voice-channels#voice-channels)和[语音通话工具](/plugins/voice-call#realtime-voice-conversations)。

网关拥有的 WebRTC 路由使 OAuth 和平台凭证远离中继客户端。后端 WebSocket 路径将平台密钥保留在网关上。 OpenClaw 将电话 G.711 u-law 音频与 GPT-Live 的 24 kHz PCM 合约进行转换。

对于 GA `gpt-realtime-2.1`、`gpt-realtime-2.1-mini` 和 `gpt-realtime-2` 浏览器会话，平台凭据仍按以下顺序首选：配置的实时 API 密钥、`openai` API-key 配置文件，然后是 `OPENAI_API_KEY`。如果未进行任何配置，浏览器 Talk 会回退到 OpenClaw ChatGPT OAuth 配置文件，并通过网关的一次性报价代理交换 SDP，因此 OAuth 令牌永远不会到达浏览器。无法解析的已配置平台凭证会阻止请求，而不是默默地转至 OAuth。

iOS 客户端拥有的 WebRTC 和 GA 网关中继（包括 Android GA 实时）仍然仅是平台密钥。 GA browser Talk保留现有的客户端拥有的数据通道和`talk.client.toolCall`循环。 OAuth 下仅凭证所有者和 SDP 交换路径发生变化。 Codex GPT-Live 路线仍然是 OAuth-，并为浏览器和网关拥有的 WebRTC 提供平台回退，包括 Android Talk 和 Discord。公共 GPT-Live、直接后端套接字和未列出的 GPT-Live 路由仍然仅是平台密钥。

| 键                                      | 默认值                                     | 笔记                                                                                                                                                                                                                                                          |
| ---------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agentId`                                | 已配置的默认 agent                    | 负责没有显式 agent 作用域会话 key 时创建的 Talk 会话。                                                                                                                                                                                       |
| `provider`                               | -                                           | Active Talk TTS 提供商。使用 `elevenlabs`、`mlx` 或 `system` 作为 macOS- 本地播放路径。                                                                                                                                                                 |
| `providers.<id>.voiceId`                 | -                                           | ElevenLabs 会回退到 `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID`，或在有 API key 时使用第一个可用 voice。                                                                                                                                                 |
| `speechLocale`                           | 设备默认值                              | 用于 Android、iOS 和 macOS 原生语音识别的 BCP 47 区域设置，同时也用于 iOS 系统 voice 回退。Apple Speech 可能使用网络服务；Android 还会将语言部分传递给 realtime 输入转写。                                  |
| `providers.elevenlabs.modelId`           | `eleven_multilingual_v2`                    |                                                                                                                                                                                                                                                                |
| `providers.mlx.modelId`                  | `mlx-community/Soprano-80M-bf16`            |                                                                                                                                                                                                                                                                |
| `providers.mlx.referenceAudioPath`       | -                                           | 支持 voice cloning 的 MLX 模型可选的客户端本地参考录音。该路径会在原生 macOS 应用主机上解析。                                                                                                                        |
| `providers.mlx.referenceText`            | -                                           | `referenceAudioPath` 的准确转录文本；Fish S2 Pro 会使用这两个值进行本地 voice cloning。                                                                                                                                                                |
| `providers.elevenlabs.apiKey`            | -                                           | 回退到 `ELEVENLABS_API_KEY`（如果可用，也会回退到 gateway shell 配置文件）。                                                                                                                                                                                    |
| `silenceTimeoutMs`                       | `700` ms macOS/Android, `900` ms iOS        | Talk 发送转录文本前的暂停时间窗口。                                                                                                                                                                                                                 |
| `interruptOnSpeech`                      | `true`                                      |                                                                                                                                                                                                                                                                |
| `providers.<id>.outputFormat`            | macOS/iOS 为 `pcm_44100`，Android 为 `pcm_24000`  | 设置为 `mp3_*` 可强制使用 MP3 流式传输。                                                                                                                                                                                                                            |
| `consultThinkingLevel`                   | 未设置                                       | 为 realtime `openclaw_agent_consult` 调用背后的 agent 运行覆盖 thinking level。                                                                                                                                                                      |
| `consultFastMode`                        | 未设置                                       | 为 realtime `openclaw_agent_consult` 调用覆盖 fast-mode。                                                                                                                                                                                                |
| `realtime.provider`                      | -                                           | `openai` 用于 WebRTC，`google` 用于 provider WebSocket，或者通过 Gateway 中继使用仅桥接型 provider。                                                                                                                                                         |
| `realtime.providers.<id>`                | -                                           | 提供商拥有的实时配置。浏览器仅接收 ephemeral/constrained 会话凭证，而不是标准 API 密钥。                                                                                                                                     |
| `realtime.providers.openai.speakerVoice` | `alloy` 为 GA； GPT-Live 的特定路线 | 内置 OpenAI 实时语音 ID（较旧的 `voice` 密钥仍然有效，但已弃用）。 GA 语音：`alloy`、`ash`、`ballad`、`cedar`、`coral`、`echo`、`marin`、`sage`、 `shimmer`、`verse`。 GPT-Live 使用上面记录的特定于路由的语音系列。 |
| `realtime.model`                         | 提供方默认值                            | Realtime 语音模型。当两者都设置时，会覆盖 `realtime.providers.<id>.model`——会话创建时 `talk.client.create` 采用相同的优先级。                                                                                                          |
| `realtime.transport`                     | -                                           | `webrtc`：OpenAI iOS 上的 WebRTC、浏览器中以及具有网关控制的 Watch 上。 `provider-websocket`：浏览器拥有，停留在 iOS 上的网关中继上。 `gateway-relay`：在网关上保留提供商音频； Android 仅在此传输中使用实时。   |
| `realtime.brain`                         | -                                           | `agent-consult` 通过网关策略路由实时工具调用； `direct-tools` 是传统的直接工具兼容性； `none` 用于 transcription/external 编排。                                                                                     |
| `realtime.consultRouting`                | -                                           | `provider-direct` 在跳过 `openclaw_agent_consult` 时保留 provider 的直接回复；`force-agent-consult` 会将最终用户转写通过 OpenClaw 路由。                                                                              |
| `realtime.instructions`                  | -                                           | 将面向 provider 的系统指令追加到 OpenClaw 内置的 realtime 提示词中。                                                                                                                                                                            |

Realtime Talk 读取为 `talk.realtime`。如果较旧的安装继承了 Voice Call 的实时设置，Doctor 会将它们复制到 Talk，同时保留显式 Talk 设置并备份配置。稍后的语音通话编辑不再改变实时通话。请参阅 [Talk 实时迁移](/gateway/doctor/config-migrations#talk-realtime-inheritance)。

`talk.catalog` 公开主要提供商 ID 和注册表别名。它公开每个提供商的有效 modes/transports/brain strategies/realtime 音频 formats/capability 标志。它公开了运行时选择的就绪结果。第一方 Talk 客户端应读取该目录，而不是在本地维护提供者别名。将忽略组准备情况的旧网关视为未经验证而不是明确未配置。通过 `talk.catalog.transcription` 发现流转录提供程序。当前的网关中继使用语音呼叫流提供程序配置，直到专用的 Talk 转录配置发布为止。

## <a id="notes"></a> 说明

- 原生语音识别需要平台的语音和麦克风接入。独立实时观看需要麦克风访问，而不是本地语音识别。
- Native Talk 使用活动网关会话。 macOS 通过网关完成来观察已接受的运行，并在说话之前从历史记录中检索其完整的匹配回复。
- 网关使用活动的Talk提供程序通过`talk.speak`解析Talk播放。仅当 RPC 不可用时，Android 才会回退到本地系统 TTS。
- macOS 本地 MLX 播放会在可用时使用捆绑的 `openclaw-mlx-tts` 助手，或使用 `PATH` 上的可执行文件。在开发期间，可设置 `OPENCLAW_MLX_TTS_BIN` 指向自定义助手二进制文件。该助手以流式方式传输 PCM，使一个选定的模型常驻内存，并通过 `providers.mlx.referenceAudioPath` 和 `referenceText` 支持 Fish S2 Pro 参考音频。
- Voice 指令值范围 （ElevenLabs）：`stability`、`similarity` 和 `style` 键接受 `0..1`。 `speed` 密钥接受 `0.5..2`。 `latency_tier` 密钥接受 `0..4`。

## <a id="related"></a> 相关内容

- [语音唤醒](/nodes/voicewake)
- [音频和语音笔记](/nodes/audio)
- [媒体理解](/nodes/media-understanding)
- [Google Meet 插件](/plugins/google-meet)
- [媒体概述](/tools/media-overview) — 媒体工具如何组合在一起
