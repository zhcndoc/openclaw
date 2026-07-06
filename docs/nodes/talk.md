---
summary: "Talk 模式：跨本地 STT/TTS 和实时语音的连续语音对话"
read_when:
  - 在 macOS/iOS/Android 上实现 Talk 模式时
  - 更改语音/TTS/中断行为时
title: "Talk 模式"
---

Talk 模式涵盖五种运行形态：

- **原生 macOS/iOS/Android Talk**：本地语音识别、Gateway 聊天，以及 `talk.speak` TTS。节点会声明 `talk` 能力，并声明它们支持哪些 `talk.*` 命令。
- **iOS Talk（实时）**：对于选择 `webrtc` 传输或省略传输的 OpenAI 实时配置，使用客户端拥有的 WebRTC。显式的 `gateway-relay`、`provider-websocket` 以及非 OpenAI 实时配置仍然使用 Gateway 托管的中继；非实时配置使用原生语音循环。
- **浏览器 Talk**：用于客户端拥有的 `webrtc`/`provider-websocket` 会话的 `talk.client.create`，或用于 Gateway 托管的 `gateway-relay` 会话的 `talk.session.create`。`managed-room` 专供 Gateway 接手和对讲房间使用。
- **Android Talk（实时）**：通过设置 `talk.realtime.mode: "realtime"` 和 `talk.realtime.transport: "gateway-relay"` 来启用。否则 Android 仍然使用原生语音识别、Gateway 聊天和 `talk.speak`。
- **仅转录客户端**：`talk.session.create({ mode: "transcription", transport: "gateway-relay", brain: "none" })`，然后使用 `talk.session.appendAudio`、`talk.session.cancelTurn` 和 `talk.session.close`，即可在没有助手语音回复的情况下用于字幕/听写。一键上传的语音笔记仍然使用 [媒体理解](/nodes/media-understanding) 音频路径。

原生 Talk 是一个连续循环：监听语音，将转录结果通过活动会话发送到模型，等待回复，然后通过已配置的 Talk 提供方（`talk.speak`）进行朗读。

客户端拥有的实时 Talk 会通过 `talk.client.toolCall` 转发提供方工具调用，而不是直接调用 `chat.send`。在实时咨询处于活动状态时，客户端可以调用 `talk.client.steer` 或 `talk.session.steer`，将口语输入分类为 `status`、`steer`、`cancel` 或 `followup`。被接受的 steer 会排队进入当前嵌入式运行；被拒绝的 steer 会返回类似 `no_active_run`、`not_streaming` 或 `compacting` 的原因。

仅转录 Talk 产生的事件封装与实时和 STT/TTS 会话相同，但使用 `mode: "transcription"` 和 `brain: "none"`。所有 Talk 会话都会在 `talk.event` 通道上广播事件；客户端订阅该通道以接收部分/最终转录更新（`transcript.delta`/`transcript.done`）以及其他会话遥测信息。

## 行为（macOS）

- 在 Talk 模式启用时始终显示覆盖层。
- **倾听 &rarr; 思考 &rarr; 说话** 阶段转换。
- 在短暂停顿（静默窗口）时，当前转录内容会被发送。
- 回复会写入 WebChat（与输入相同）。
- **语音打断**（默认开启）：如果用户在助手说话时开口，播放会停止，并记录打断时间戳供下一个提示使用。

## 回复中的语音指令

助手可以在回复前添加一行 JSON 以控制语音：

```json
{ "voice": "<voice-id>", "once": true }
```

规则：

- 仅限第一条非空行；在 TTS 播放前，该 JSON 行会被移除。
- 未知键会被忽略。
- `once: true` 仅适用于当前回复；如果不指定，它会成为新的 Talk 模式默认值。

支持的键：`voice` / `voice_id` / `voiceId`，`model` / `model_id` / `modelId`，`speed`，`rate`（WPM），`stability`，`similarity`，`style`，`speakerBoost`，`seed`，`normalize`，`lang`，`output_format`，`latency_tier`，`once`。

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
          model: "gpt-realtime-2",
          speakerVoice: "cedar",
        },
      },
      instructions: "请热情地说话，并保持回答简短。",
      mode: "realtime",
      transport: "webrtc",
      brain: "agent-consult",
    },
  },
}
```

| 键                                       | 默认值                                     | 说明                                                                                                                                                                                                                                                                   |
| ---------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`                               | -                                          | 当前启用的 Talk TTS 提供方。对于 macOS 本地播放路径，请使用 `elevenlabs`、`mlx` 或 `system`。                                                                                                                                                                         |
| `providers.<id>.voiceId`                 | -                                          | ElevenLabs 会回退到 `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID`，或者在有 API 密钥时使用第一个可用的语音。                                                                                                                                                                |
| `providers.elevenlabs.modelId`           | `eleven_v3`                                |                                                                                                                                                                                                                                                                        |
| `providers.mlx.modelId`                  | `mlx-community/Soprano-80M-bf16`           |                                                                                                                                                                                                                                                                        |
| `providers.elevenlabs.apiKey`            | -                                          | 会回退到 `ELEVENLABS_API_KEY`（如果可用，也会回退到 gateway shell profile）。                                                                                                                                                                                          |
| `speechLocale`                           | 设备默认值                                 | 用于 iOS/macOS 设备端 Talk 语音识别的 BCP 47 locale id。                                                                                                                                                                                                               |
| `silenceTimeoutMs`                       | macOS/Android 为 `700` ms，iOS 为 `900` ms | Talk 发送转录文本前的停顿窗口。                                                                                                                                                                                                                                       |
| `interruptOnSpeech`                      | `true`                                     |                                                                                                                                                                                                                                                                        |
| `outputFormat`                           | macOS/iOS 为 `pcm_44100`，Android 为 `pcm_24000` | 设置为 `mp3_*` 可强制使用 MP3 流式传输。                                                                                                                                                                                                                              |
| `consultThinkingLevel`                   | 未设置                                     | 用于运行在实时 `openclaw_agent_consult` 调用后面的 agent 的思考级别覆盖。                                                                                                                                                                                             |
| `consultFastMode`                        | 未设置                                     | 用于实时 `openclaw_agent_consult` 调用的快速模式覆盖。                                                                                                                                                                                                                |
| `realtime.provider`                      | -                                          | `openai` 用于 WebRTC，`google` 用于提供方 WebSocket，或通过 Gateway relay 使用仅桥接的提供方。                                                                                                                                                                        |
| `realtime.providers.<id>`                | -                                          | 由提供方拥有的实时配置。浏览器只会接收临时/受限的会话凭据，绝不会接收标准 API 密钥。                                                                                                                                                                                  |
| `realtime.providers.openai.speakerVoice` | `alloy`                                    | 内置的 OpenAI Realtime 语音 id（旧的 `voice` 键仍然可用，但已弃用）。当前 `gpt-realtime-2` 的语音有：`alloy`、`ash`、`ballad`、`cedar`、`coral`、`echo`、`marin`、`sage`、`shimmer`、`verse`；推荐使用 `marin` 和 `cedar` 以获得最佳质量。 |
| `realtime.transport`                     | -                                          | `webrtc`：在 iOS 和浏览器中由客户端拥有的 OpenAI WebRTC。`provider-websocket`：由浏览器拥有，在 iOS 上保持在 Gateway relay。`gateway-relay`：将提供方音频保留在 Gateway 上；Android 仅在此传输方式下使用实时功能。                                                 |
| `realtime.brain`                         | -                                          | `agent-consult` 通过 Gateway policy 路由实时工具调用；`direct-tools` 是旧版 direct-tool 兼容模式；`none` 用于转录/外部编排。                                                                                                                                        |
| `realtime.consultRouting`                | -                                          | `provider-direct` 在跳过 `openclaw_agent_consult` 时保留提供方的直接回复；`force-agent-consult` 会将最终用户转录路由到 OpenClaw。                                                                                                                                    |
| `realtime.instructions`                  | -                                          | 将面向提供方的系统指令附加到 OpenClaw 内置的实时提示词（语音风格/语气）后面；默认的 `openclaw_agent_consult` 指导仍然保留。                                                                                                                                        |

`talk.catalog` 会公开规范化的提供方 id 和注册表别名、每个提供方有效的模式/传输方式/brain 策略/实时音频格式/能力标志，以及运行时选定的就绪结果。第一方 Talk 客户端应读取该 catalog，而不是在本地维护提供方别名；如果较旧的 Gateway 省略了组就绪状态，应将其视为未验证，而不是明确判定为未配置。流式转录提供方通过 `talk.catalog.transcription` 发现；当前的 Gateway relay 在专用 Talk 转录配置界面发布之前，会使用 Voice Call 流式提供方配置。

## macOS 界面

- 菜单栏切换：**Talk**
- 配置选项卡：**Talk Mode** 组（语音 ID + 中断开关）
- 悬浮层：Listening（云朵随麦克风音量脉动）&rarr; Thinking（下沉动画）&rarr; Speaking（放射状圆环）。点击云朵可停止说话，点击 X 可退出 Talk 模式。

## Android 界面

- Voice tab toggle: **Talk**
- Manual **Mic** 和 **Talk** 互斥的采集模式。
- Manual Mic 和实时 Talk 优先使用已连接的 Bluetooth Classic 或 BLE 头戴式耳机麦克风；如果断开连接，应用会请求另一个头戴式输入，或回退到默认麦克风，并在采集停止后恢复默认偏好。
- Manual Mic 在应用离开前台或用户离开 Voice 选项卡时停止。
- Talk Mode 会持续运行，直到被切换关闭或节点断开连接，运行期间使用 Android 的 microphone foreground-service 类型。
- Android 支持 `pcm_16000`、`pcm_22050`、`pcm_24000` 和 `pcm_44100` 输出格式，用于低延迟 `AudioTrack` 流式传输。

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
