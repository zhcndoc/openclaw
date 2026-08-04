---
summary: "Talk 模式：跨本地 STT/TTS 和实时语音的连续语音对话"
read_when:
  - 在 macOS/iOS/Android 上实现 Talk 模式时
  - 更改语音/TTS/中断行为时
title: "Talk 模式"
---

Talk 模式涵盖五种运行形态：

- **原生 macOS/iOS/Android Talk**：原生语音识别、Gateway 聊天和 `talk.speak` TTS。macOS/iOS 上的 Apple 语音识别可能使用网络服务；Android 的行为取决于已安装的语音服务。节点会播报 `talk` 能力，并声明其支持哪些 `talk.*` 命令。
- **iOS Talk（实时）**：对于选择 `webrtc` 传输方式或省略传输方式的 OpenAI realtime 配置，使用由客户端持有的 WebRTC，包括有帧和无帧的转录/音频事件。显式指定 `gateway-relay`、`provider-websocket` 以及非 OpenAI realtime 配置的会话仍使用由 Gateway 持有的中继；非 realtime 配置使用原生语音循环。
- **浏览器 Talk**：客户端持有的 `webrtc`/`provider-websocket` 会话使用 `talk.client.create`，由 Gateway 持有的 `gateway-relay` 会话使用 `talk.session.create`。`managed-room` 仅用于 Gateway 移交和对讲机房间。
- **Android Talk（实时）**：当 `talk.catalog` 报告 realtime 组已就绪且配置的模型通过 Android 客户端门槛时，Android 使用由 Gateway 持有的中继 realtime；它绝不会打开由客户端持有的 WebRTC 会话。Gateway 现在支持 `gpt-live-*` 中继会话，但 Android 会有意让这些模型继续使用原生语音识别、Gateway 聊天和 `talk.speak`，直到在 Android 设备上验证中继路径确实可用。
- **仅转录客户端**：`talk.session.create({ mode: "transcription", transport: "gateway-relay", brain: "none" })`，然后使用 `talk.session.appendAudio`、`talk.session.cancelTurn` 和 `talk.session.close`，即可在没有助手语音回复的情况下生成字幕/听写。一次性上传的语音备注仍使用[媒体理解](/nodes/media-understanding)音频路径。

原生 Talk 是一个连续循环：监听语音，将转录结果通过活动会话发送到模型，等待回复，然后通过已配置的 Talk 提供方（`talk.speak`）进行朗读。

客户端持有的 realtime Talk 通常通过 `talk.client.toolCall` 转发提供方工具调用，而不是直接调用 `chat.send`。GPT-Live WebRTC 会话在 Gateway 持有的 sideband 上进行委托，Gateway 会将每个委托绑定到持有该委托的浏览器或 Gateway 中继 Talk 会话。后端 WebSocket 桥接使用正常的中继咨询路径。在 realtime 咨询处于活动状态时，客户端可以调用 `talk.client.steer` 或 `talk.session.steer`，将语音输入分类为 `status`、`steer`、`cancel` 或 `followup`；这也包括 GPT-Live 委托。接受的引导会排入当前活动的嵌入式运行；被拒绝的引导会返回诸如 `no_active_run`、`not_streaming` 或 `compacting` 之类的原因。较新的 GPT-Live 语音任务也会取代正在运行的委托。

已完成的实时用户和助手发言始终会实时追加到当前代理会话中，因此后续的聊天和语音轮次共享同一历史记录。客户端持有的传输会以稳定的条目 id 报告其已完成的转录；Gateway relay 会话则在服务端追加相同事件。提供方会话还会接收 Discord 语音所使用的受限 realtime profile 上下文。

由语音发起的咨询运行，在执行发送消息、控制节点、浏览器/计算机操作、服务变更、破坏性 shell 命令或发布等高影响操作前，需要新的、完全匹配的语音确认。该门禁适用于通过 `talk.client.toolCall`、Gateway 中继和 GPT-Live sideband 委托启动的运行。确认仅适用于规范的最终执行参数，并且只会被消费一次；如果策略或钩子重写了已批准的操作，OpenClaw 会阻止该操作，直到重写后的操作得到确认。不相关的并发运行不受影响。通话结束时，OpenClaw 可以将针对变更型工具的精简 **语音通话变更**摘要发送到会话最近使用的非 WebChat 投递目标。

仅转录 Talk 产生的事件封装与实时和 STT/TTS 会话相同，但使用 `mode: "transcription"` 和 `brain: "none"`。所有 Talk 会话都会在 `talk.event` 通道上广播事件；客户端订阅该通道以接收部分/最终转录更新（`transcript.delta`/`transcript.done`）以及其他会话遥测信息。

浏览器视频 Talk 可用于 OpenAI Realtime WebRTC 和 Google Live 提供方 WebSocket 会话。OpenAI 在 `describe_view` 请求视觉上下文时只接收单张受限的 JPEG；它不会接收连续的摄像头轨道。Google Live 会以每秒最多一帧的速率直接从浏览器接收受限的 JPEG 帧，而 `describe_view` 会报告摄像头流状态。在这两种情况下，摄像头帧都会绕过 Gateway，停止 Talk 会释放摄像头和麦克风轨道。

## 行为（macOS）

- 在 Talk 模式启用时始终显示覆盖层。
- **倾听 &rarr; 思考 &rarr; 说话** 阶段转换。
- 在短暂停顿（静默窗口）时，当前转录内容会被发送。
- 回复会写入 WebChat（与输入相同）。
- **语音打断**（默认开启）：如果用户在助手说话时开口，播放会停止，并记录打断时间戳供下一个提示使用。

## 回复中的语音命令

助手可以在回复前添加一行 JSON 来控制语音播放：

```json
{ "voice": "<voice-id>", "once": true }
```

规则：

- 仅适用于第一个非空行；在 TTS 播放前，这一行 JSON 会被移除。
- 未知键将被忽略。
- `once: true` 仅适用于当前回复；如果未指定，它将成为 Talk 模式的新默认值。

支持的键：`voice` / `voice_id` / `voiceId`，`model` / `model_id` / `modelId`，`speed`，`rate`（每分钟词数，WPM），`stability`，`similarity`，`style`，`speakerBoost`，`seed`，`normalize`，`lang`，`output_format`，`latency_tier`，`once`。

## 配置（`~/.openclaw/openclaw.json`）

```json5
{
  talk: {
    provider: "elevenlabs",
    providers: {
      elevenlabs: {
        voiceId: "elevenlabs_voice_id",
        modelId: "eleven_v3",
        outputFormat: "mp3_44100_128",
        apiKey: "elevenlabs_api_key",
      },
      mlx: {
        modelId: "mlx-community/Soprano-80M-bf16",
        // Fish S2 Pro 也可以使用本地参考声音：
        // referenceAudioPath: "/Users/example/Voices/reference.wav",
        // referenceText: "参考音频片段的准确转录文本。",
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
          apiKey: "openai_api_key",
          model: "gpt-realtime-2.1",
          speakerVoice: "cedar",
        },
      },
      instructions: "请充满热情地说话，并保持回答简短。",
      mode: "realtime",
      transport: "webrtc",
      brain: "agent-consult",
    },
  },
}
```

OpenAI 浏览器 WebRTC 和 Gateway-relay Talk 通过
`https://api.openai.com/v1/live` 支持原生 GPT-Live。将 `talk.realtime.model` 设置为
`gpt-live-1-codex`（推荐）或 `gpt-live-1-boulder-alpha`；`gpt-live-1`
和 `gpt-live-1-mini` 在此路由上无效。浏览器和 Gateway-relay
WebRTC 优先使用 ChatGPT OAuth 订阅配置，并回退到 Platform
API key 身份验证。其他后端桥接通过 Frameless Bidi
WebSocket 直接连接，并要求使用 Platform API key 身份验证；其 `/v1/live` 访问权限目前受
[候补名单限制](https://openai.com/form/gpt-live-1-in-the-api/)。

最快的设置方式是使用 Control UI：**Settings → Talk**，选择 **OpenAI** 和
一个 `gpt-live-*` 模型。OAuth 前置条件是使用
`openclaw models auth login --provider openai` 创建的 OpenClaw 身份验证配置文件——不会读取现有的
Codex CLI 登录状态。GPT-Live 还要求以完整模式注册内置的 `openai`
插件；限制性的 `plugins.allow` 列表会导致会话创建失败，并显示
"OpenAI GPT-Live browser session broker is unavailable"。运行时限制：每个 Gateway
最多 8 个并发会话，会话 TTL 为 30 分钟。浏览器会话还使用有效期 60 秒且只能使用一次的 offer token。

GPT-Live 接受 `alloy`、`ash`、`ballad`、`cedar`、`coral`、`echo`、`marin`、
`sage`、`shimmer` 和 `verse`。`403 Voice session access denied` 响应是
复用错误：无效的 voice 也会返回同样的响应。旧的
`chatgpt.com` 后端路由也会返回 `403`；OpenClaw 改为使用原生
`api.openai.com/v1/live` 路由。

| Consumer                    | GPT-Live status                                                         |
| --------------------------- | ----------------------------------------------------------------------- |
| Browser Talk                | 在客户端 WebRTC 和 Gateway 所有的 sideband 下受支持                 |
| Gateway-relay Talk          | 在 Gateway 所有的 WebRTC 和 sideband 下受支持                        |
| Discord bidirectional voice | 通过 Platform key 后端 WebSocket 受支持                       |
| Voice Call and telephony    | 通过 Platform key 后端 WebSocket 受支持                       |
| iOS client-owned Talk       | 待定                                                                 |
| Android realtime Talk       | 等待 Android 设备实时验证开关；Android 继续使用原生 Talk |

Gateway 所有的 WebRTC 路由不会将 OAuth 和 Platform 凭据暴露给
relay 客户端。后端 WebSocket 路径会将 Platform key 保留在 Gateway 上；
OpenClaw 会将电话系统的 G.711 u-law 音频转换为 GPT-Live 的 24 kHz PCM
格式，也会执行反向转换。

对于 GA `gpt-realtime-2.1`、`gpt-realtime-2.1-mini` 和 `gpt-realtime-2`
浏览器会话，Platform 凭据仍按以下顺序优先使用：已配置的 realtime API key、`openai`
API key 配置文件，然后是 `OPENAI_API_KEY`。如果均未配置，浏览器 Talk 会回退到 OpenClaw
ChatGPT OAuth 配置文件，并通过 Gateway 的一次性 offer broker 交换 SDP，因此 OAuth token 永远不会到达浏览器。若已配置的 Platform 凭据无法解析，则会安全失败，而不会静默回退到 OAuth。

iOS 客户端所有的 WebRTC、Voice Call、GA Gateway relay、provider WebSocket
传输、Discord realtime voice 以及 Android realtime 仍然
仅支持 Platform key。GA 浏览器 Talk 保留现有的客户端所有数据通道和
`talk.client.toolCall` 循环；在 OAuth 模式下，只有凭据所有者和 SDP 交换路径会发生变化。GPT-Live Gateway relay 优先使用 ChatGPT OAuth，并回退到已获得候补名单权限的 Platform 访问。

| 键                                      | 默认值                                    | 说明                                                                                                                                                                                                                                                                                   |
| ---------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agentId`                                | 已配置的默认 agent                        | 负责没有显式 agent 作用域会话 key 时创建的 Talk 会话。                                                                                                                                                                                                                                |
| `provider`                               | -                                          | 当前启用的 Talk TTS provider。对 macOS 本地播放路径可使用 `elevenlabs`、`mlx` 或 `system`。                                                                                                                                                                                            |
| `providers.<id>.voiceId`                 | -                                          | ElevenLabs 会回退到 `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID`，或在有 API key 时使用第一个可用 voice。                                                                                                                                                                                   |
| `speechLocale`                           | 设备默认值                                  | 用于 Android、iOS 和 macOS 原生语音识别的 BCP 47 区域设置，同时也用于 iOS 系统 voice 回退。Apple Speech 可能使用网络服务；Android 还会将语言部分传递给 realtime 输入转写。                                                                                                         |
| `providers.elevenlabs.modelId`           | `eleven_multilingual_v2`                   |                                                                                                                                                                                                                                                                                         |
| `providers.mlx.modelId`                  | `mlx-community/Soprano-80M-bf16`           |                                                                                                                                                                                                                                                                                         |
| `providers.mlx.referenceAudioPath`       | -                                          | 支持 voice cloning 的 MLX 模型可选的客户端本地参考录音。该路径会在原生 macOS 应用主机上解析。                                                                                                                                                 |
| `providers.mlx.referenceText`            | -                                          | `referenceAudioPath` 的准确转录文本；Fish S2 Pro 会使用这两个值进行本地 voice cloning。                                                                                                                                                                                         |
| `providers.elevenlabs.apiKey`            | -                                          | 回退到 `ELEVENLABS_API_KEY`（如果可用，也会回退到 gateway shell 配置文件）。                                                                                                                                                                                                             |
| `silenceTimeoutMs`                       | `700` ms macOS/Android, `900` ms iOS       | Talk 发送转录文本前的暂停时间窗口。                                                                                                                                                                                                                                          |
| `interruptOnSpeech`                      | `true`                                     |                                                                                                                                                                                                                                                                                         |
| `providers.<id>.outputFormat`            | macOS/iOS 为 `pcm_44100`，Android 为 `pcm_24000` | 设置为 `mp3_*` 可强制使用 MP3 流式传输。                                                                                                                                                                                                                                               |
| `consultThinkingLevel`                   | 未设置                                      | 为 realtime `openclaw_agent_consult` 调用背后的 agent 运行覆盖 thinking level。                                                                                                                                                                                                         |
| `consultFastMode`                        | 未设置                                      | 为 realtime `openclaw_agent_consult` 调用覆盖 fast-mode。                                                                                                                                                                                                                               |
| `realtime.provider`                      | -                                          | `openai` 用于 WebRTC，`google` 用于 provider WebSocket，或者通过 Gateway relay 使用仅桥接型 provider。                                                                                                                                                                                 |
| `realtime.providers.<id>`                | -                                          | provider 拥有的 realtime 配置。浏览器只接收临时/受限的会话凭据，绝不会接收标准 API key。                                                                                                                                                                                                |
| `realtime.providers.openai.speakerVoice` | GA 为 `alloy`；GPT-Live 为 `marin`       | 内置 OpenAI Realtime voice id（旧的 `voice` 键仍然可用，但已弃用）。当前 `gpt-realtime-2.1` 和 GPT-Live voices：`alloy`、`ash`、`ballad`、`cedar`、`coral`、`echo`、`marin`、`sage`、`shimmer`、`verse`；推荐使用 `marin` 和 `cedar` 以获得最佳质量。 |
| `realtime.model`                         | provider 默认值                           | Realtime 语音模型。当两者都设置时，会覆盖 `realtime.providers.<id>.model`——会话创建时 `talk.client.create` 采用相同的优先级。                                                                                                                                                        |
| `realtime.transport`                     | -                                          | `webrtc`：iOS 和浏览器中由客户端拥有的 OpenAI WebRTC。`provider-websocket`：由浏览器拥有，在 iOS 上保持在 Gateway relay。`gateway-relay`：将 provider 音频保留在 Gateway 上；Android 仅在此传输方式下使用 realtime。                                                               |
| `realtime.brain`                         | -                                          | `agent-consult` 通过 Gateway 策略路由 realtime 工具调用；`direct-tools` 是旧的直接工具兼容模式；`none` 用于转写/外部编排。                                                                                                                      |
| `realtime.consultRouting`                | -                                          | `provider-direct` 在跳过 `openclaw_agent_consult` 时保留 provider 的直接回复；`force-agent-consult` 会将最终用户转写通过 OpenClaw 路由。                                                                                                       |
| `realtime.instructions`                  | -                                          | 将面向 provider 的系统指令追加到 OpenClaw 内置的 realtime 提示词中。                                                                                                                                                                                                                  |

`talk.catalog` 将公开规范化的 provider id 和注册表别名、每个 provider 的有效模式/传输方式/brain 策略/realtime 音频格式/能力标志，以及运行时选择的就绪结果。第一方 Talk 客户端应读取此 catalog，而不是在本地维护 provider 别名；如果较旧的 Gateway 省略了组就绪状态，应将其视为未验证，而不是明确视为未配置。流式转写 provider 通过 `talk.catalog.transcription` 发现；当前的 Gateway relay 会使用 Voice Call 流式 provider 配置，直到发布专门的 Talk 转写配置接口。

## macOS 界面

- 菜单栏切换：**Talk**
- 配置标签页：**Talk Mode** 组（voice id + interrupt toggle）
- 覆盖层：该球体渲染通用的 talk 波形（与 iOS、watchOS 和 Android 共用）。Listening 跟随实时麦克风音量，Speaking 跟随实际的 TTS 播放包络，Thinking 轻柔呼吸。点击球体可暂停/恢复，双击可停止说话，点击 X 可退出 Talk 模式。

## Android 界面

- Android 的主导航是 **Home**、**Chat** 和 **Settings**。语音输入
  位于 Chat 编辑器中，而不是单独的 Voice 选项卡。
- 点击编辑器麦克风可进行设备端听写。长按它可录制
  语音笔记附件。从 Talk 波形开始连续 Talk。
- 听写、语音笔记录制和 Talk 是互斥的麦克风
  路径；启动其中一个会停止或阻止其他路径。
- 实时 Talk 优先使用已连接的 Bluetooth Classic 或 BLE 耳机
  麦克风；如果断开连接，应用会请求另一个耳机输入，或
  回退到默认麦克风，并在捕获停止后恢复默认偏好。
- 当应用离开前台或
  用户离开 Chat 时，听写和语音笔记录制会停止。
- Talk Mode 会一直运行，直到被切换关闭或节点断开连接，激活时使用 Android 的 microphone 前台服务类型。
- Android 支持 `pcm_16000`、`pcm_22050`、`pcm_24000` 和 `pcm_44100` 输出格式，用于低延迟的 `AudioTrack` 流式传输。

## 备注

- 需要语音和麦克风权限。
- 原生 Talk 使用当前活动的 Gateway 会话，仅当响应事件不可用时才回退到历史记录轮询。
- Gateway 通过 `talk.speak` 使用当前活动的 Talk 提供商处理 Talk 播放。仅当该 RPC 不可用时，Android 才会回退到本地系统 TTS。
- macOS 本地 MLX 播放会在可用时使用捆绑的 `openclaw-mlx-tts` 助手，或使用 `PATH` 上的可执行文件。在开发期间，可设置 `OPENCLAW_MLX_TTS_BIN` 指向自定义助手二进制文件。该助手以流式方式传输 PCM，使一个选定的模型常驻内存，并通过 `providers.mlx.referenceAudioPath` 和 `referenceText` 支持 Fish S2 Pro 参考音频。
- 语音指令值范围（ElevenLabs）：`stability`、`similarity` 和 `style` 接受 `0..1`；`speed` 接受 `0.5..2`；`latency_tier` 接受 `0..4`。

## 相关内容

- [语音唤醒](/nodes/voicewake)
- [音频和语音笔记](/nodes/audio)
- [媒体理解](/nodes/media-understanding)
