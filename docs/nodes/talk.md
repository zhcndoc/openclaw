---
summary: "Talk 模式：跨本地 STT/TTS 和实时语音的连续语音对话"
read_when:
  - 在 macOS/iOS/Android 上实现 Talk 模式时
  - 更改语音/TTS/中断行为时
title: "Talk 模式"
---

Talk 模式涵盖五种运行形态：

- **原生 macOS/iOS/Android Talk**: 原生语音识别、Gateway 聊天，以及 `talk.speak` TTS。macOS/iOS 上的 Apple Speech 识别可能会使用网络服务；Android 行为取决于已安装的语音服务。节点会声明 `talk` 能力，并注明它们支持哪些 `talk.*` 命令。
- **iOS Talk（实时）**: 对于选择 `webrtc` 传输或省略传输的 OpenAI realtime 配置，由客户端持有 WebRTC；显式的 `gateway-relay`、`provider-websocket` 以及非 OpenAI realtime 配置则保持在 Gateway 持有的 relay 上；非实时配置使用原生语音循环。
- **浏览器 Talk**: 对于客户端持有的 `webrtc`/`provider-websocket` 会话，使用 `talk.client.create`；对于 Gateway 持有的 `gateway-relay` 会话，使用 `talk.session.create`。`managed-room` 仅保留用于 Gateway 接管和对讲机房间。
- **Android Talk（实时）**: 当 `talk.catalog` 报告实时分组已就绪时，Android 始终使用 Gateway 持有的 relay realtime；它从不打开客户端持有的 WebRTC 会话。若实时未就绪，Android 会继续使用原生语音识别、Gateway 聊天和 `talk.speak`。注意：就绪状态是按所配置传输的表面计算的，因此像 `gpt-live-*` 这样的仅浏览器模型可能会显示就绪，但 Android 打开的 relay 会话会被明确错误拒绝；Android 侧的门控是一个跟进事项。
- **仅转录客户端**: 使用 `talk.session.create({ mode: "transcription", transport: "gateway-relay", brain: "none" })`，然后通过 `talk.session.appendAudio`、`talk.session.cancelTurn` 和 `talk.session.close` 来实现字幕/听写，而不产生助手语音回复。一次性上传的语音便笺仍然使用 [media understanding](/nodes/media-understanding) 音频路径。

原生 Talk 是一个连续循环：监听语音，将转录结果通过活动会话发送到模型，等待回复，然后通过已配置的 Talk 提供方（`talk.speak`）进行朗读。

客户端持有的 realtime Talk 会通过 `talk.client.toolCall` 转发提供方工具调用，而不是直接调用 `chat.send`。在实时咨询处于活动状态时，客户端可以调用 `talk.client.steer` 或 `talk.session.steer`，将口语输入分类为 `status`、`steer`、`cancel` 或 `followup`。接受的 steering 会排队进入当前嵌入式运行；被拒绝的 steering 会返回诸如 `no_active_run`、`not_streaming` 或 `compacting` 之类的原因。GPT-Live 是例外：它的委派运行在 Gateway 持有的 sideband 上，而不是通过 `talk.client.toolCall`，因此 `talk.client.steer` 目前还无法到达它们——一个更新的口语任务会直接取代正在运行的委派。

已完成的实时用户和助手发言始终会实时追加到当前代理会话中，因此后续的聊天和语音轮次共享同一历史记录。客户端持有的传输会以稳定的条目 id 报告其已完成的转录；Gateway relay 会话则在服务端追加相同事件。提供方会话还会接收 Discord 语音所使用的受限 realtime profile 上下文。

由语音发起的咨询运行在执行发送消息、控制节点、浏览器/计算机操作、服务变更、破坏性 shell 命令或发布等高影响动作之前，需要一个新的、精确的口头确认。此门控绑定到通过 `talk.client.toolCall` 或 Gateway relay 启动的运行；GPT-Live sideband 委派目前还没有注册该绑定，因此它们会改用代理的常规（非语音）批准策略。该确认仅适用于规范化后的最终执行参数，并且只会被消耗一次；如果策略或 hook 重写了已批准的动作，OpenClaw 会阻止它，直到重写后的动作也被确认。无关的并发运行不受影响。当调用关闭时，OpenClaw 可以为可变更工具向会话的最后一个非 WebChat 交付目标发送一份压缩的 **Voice call changes** 摘要。

仅转录 Talk 产生的事件封装与实时和 STT/TTS 会话相同，但使用 `mode: "transcription"` 和 `brain: "none"`。所有 Talk 会话都会在 `talk.event` 通道上广播事件；客户端订阅该通道以接收部分/最终转录更新（`transcript.delta`/`transcript.done`）以及其他会话遥测信息。

浏览器视频 Talk 可用于 OpenAI Realtime WebRTC 和 Google Live provider-WebSocket 会话。OpenAI 在 `describe_view` 请求视觉上下文时只接收单张受限的 JPEG；它不会接收连续的摄像头轨道。Google Live 会以每秒最多一帧的速率直接从浏览器接收受限的 JPEG 帧，而 `describe_view` 会报告 camera-stream 状态。在这两种情况下，摄像头帧都会绕过 Gateway，停止 Talk 会释放摄像头和麦克风轨道。

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

OpenAI 浏览器 WebRTC Talk 通过
`https://api.openai.com/v1/live` 支持原生 GPT-Live。将 `talk.realtime.model` 设置为
`gpt-live-1-codex`（推荐）或 `gpt-live-1-boulder-alpha`；`gpt-live-1`
和 `gpt-live-1-mini` 在此路由上无效。GPT-Live 优先使用 ChatGPT
OAuth 订阅配置文件，并在此基础上回退到 Platform API-key 认证，其
`/v1/live` 访问当前处于
[等待名单限制](https://openai.com/form/gpt-live-1-in-the-api/)。

最快的设置方式是 Control UI：**Settings → Talk**，选择 **OpenAI** 和
一个 `gpt-live-*` 模型。OAuth 的前置条件是通过
`openclaw models auth login --provider openai` 创建的 OpenClaw 认证配置文件——
现有的 Codex CLI 登录不会被读取。GPT-Live 还要求内置的 `openai`
插件以完整模式注册；受限的 `plugins.allow` 列表会导致会话创建失败，报错
“OpenAI GPT-Live browser session broker is unavailable”。运行时限制：每个 Gateway
最多 8 个并发会话，30 分钟会话 TTL，60 秒一次性 offer token。

GPT-Live 接受 `alloy`、`ash`、`ballad`、`cedar`、`coral`、`echo`、`marin`、
`sage`、`shimmer` 和 `verse`。`403 Voice session access denied` 响应是
复用错误：无效的 voice 也会返回同样的响应。旧的
`chatgpt.com` 后端路由也会返回 `403`；OpenClaw 改为使用原生
`api.openai.com/v1/live` 路由。

GPT-Live 仅限于浏览器 Talk WebRTC 会话。电话、语音通话、Gateway relay、provider WebSocket 传输、iOS 和 Android 均不支持。
Gateway 负责已认证的 sideband，并通过
已配置的 OpenClaw agent 路由委派的工作；浏览器既不会收到 OAuth token，也不会收到
Platform API key。

对于 GA `gpt-realtime-*` 浏览器和 iOS WebRTC 会话，仍然需要按以下顺序提供 Platform 凭据：
已配置的 realtime API key、`openai`
API-key profile，然后是 `OPENAI_API_KEY`。ChatGPT OAuth 不会为这些
GA 会话、Voice Call、Gateway relay 或 Discord realtime voice 进行配置。

| 键                                      | 默认值                                    | 说明                                                                                                                                                                                                                                                                                   |
| ---------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agentId`                                | 已配置的默认 agent                        | 负责没有显式 agent 作用域会话 key 时创建的 Talk 会话。                                                                                                                                                                                                                                |
| `provider`                               | -                                          | 当前启用的 Talk TTS provider。对 macOS 本地播放路径可使用 `elevenlabs`、`mlx` 或 `system`。                                                                                                                                                                                            |
| `providers.<id>.voiceId`                 | -                                          | ElevenLabs 会回退到 `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID`，或在有 API key 时使用第一个可用 voice。                                                                                                                                                                                   |
| `speechLocale`                           | 设备默认值                                  | 用于 Android、iOS 和 macOS 原生语音识别的 BCP 47 区域设置，同时也用于 iOS 系统 voice 回退。Apple Speech 可能使用网络服务；Android 还会将语言部分传递给 realtime 输入转写。                                                                                                         |
| `providers.elevenlabs.modelId`           | `eleven_multilingual_v2`                   |                                                                                                                                                                                                                                                                                         |
| `providers.mlx.modelId`                  | `mlx-community/Soprano-80M-bf16`           |                                                                                                                                                                                                                                                                                         |
| `providers.elevenlabs.apiKey`            | -                                          | 回退到 `ELEVENLABS_API_KEY`（如果可用，也会回退到 gateway shell profile）。                                                                                                                                                                                                              |
| `silenceTimeoutMs`                       | macOS/Android 为 `700` ms，iOS 为 `900`   | Talk 发送转写前的暂停等待窗口。                                                                                                                                                                                                                                                          |
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

- 需要 Speech + Microphone 权限。
- Native Talk 使用当前活动的 Gateway 会话，并且仅在响应事件不可用时回退到历史轮询。
- gateway 通过使用当前活动的 Talk provider 的 `talk.speak` 来解析 Talk 播放。只有当该 RPC 不可用时，Android 才会回退到本地系统 TTS。
- macOS 本地 MLX 播放在存在时使用内置的 `openclaw-mlx-tts` helper，或者使用 `PATH` 上的可执行文件。在开发期间，设置 `OPENCLAW_MLX_TTS_BIN` 以指向自定义的 helper 二进制文件。
- Voice directive 值范围（ElevenLabs）：`stability`、`similarity` 和 `style` 接受 `0..1`；`speed` 接受 `0.5..2`；`latency_tier` 接受 `0..4`。

## 相关内容

- [语音唤醒](/nodes/voicewake)
- [音频和语音笔记](/nodes/audio)
- [媒体理解](/nodes/media-understanding)
