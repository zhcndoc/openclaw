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

## Voice Commands in Replies

The assistant can add a line of JSON before its reply to control speech:

```json
{ "voice": "<voice-id>", "once": true }
```

Rules:

- Only for the first non-empty line; before TTS playback, this JSON line will be removed.
- Unknown keys will be ignored.
- `once: true` applies only to the current reply; if not specified, it will become the new default value for Talk mode.

Supported keys: `voice` / `voice_id` / `voiceId`, `model` / `model_id` / `modelId`, `speed`, `rate` (WPM), `stability`, `similarity`, `style`, `speakerBoost`, `seed`, `normalize`, `lang`, `output_format`, `latency_tier`, `once`.

## Configuration (`~/.openclaw/openclaw.json`)

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
      instructions: "Please speak enthusiastically and keep your answers brief.",
      mode: "realtime",
      transport: "webrtc",
      brain: "agent-consult",
    },
  },
}
```

| Key                                      | Default                                    | Notes                                                                                                                                                                                                                                                                      |
| ---------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`                               | -                                          | Active Talk TTS provider. Use `elevenlabs`, `mlx`, or `system` for macOS-local playback paths.                                                                                                                                                                             |
| `providers.<id>.voiceId`                 | -                                          | ElevenLabs falls back to `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID`, or the first available voice with an API key.                                                                                                                                                             |
| `providers.elevenlabs.modelId`           | `eleven_v3`                                |                                                                                                                                                                                                                                                                            |
| `providers.mlx.modelId`                  | `mlx-community/Soprano-80M-bf16`           |                                                                                                                                                                                                                                                                            |
| `providers.elevenlabs.apiKey`            | -                                          | Falls back to `ELEVENLABS_API_KEY` (or gateway shell profile if available).                                                                                                                                                                                                |
| `speechLocale`                           | device default                             | BCP 47 locale id for on-device Talk speech recognition on iOS/macOS.                                                                                                                                                                                                       |
| `silenceTimeoutMs`                       | `700` ms macOS/Android, `900` ms iOS       | Pause window before Talk sends the transcript.                                                                                                                                                                                                                             |
| `interruptOnSpeech`                      | `true`                                     |                                                                                                                                                                                                                                                                            |
| `outputFormat`                           | `pcm_44100` macOS/iOS, `pcm_24000` Android | Set `mp3_*` to force MP3 streaming.                                                                                                                                                                                                                                        |
| `consultThinkingLevel`                   | unset                                      | Thinking level override for the agent run behind realtime `openclaw_agent_consult` calls.                                                                                                                                                                                  |
| `consultFastMode`                        | unset                                      | Fast-mode override for realtime `openclaw_agent_consult` calls.                                                                                                                                                                                                            |
| `realtime.provider`                      | -                                          | `openai` for WebRTC, `google` for provider WebSocket, or a bridge-only provider through Gateway relay.                                                                                                                                                                     |
| `realtime.providers.<id>`                | -                                          | Provider-owned realtime config. Browsers receive only ephemeral/constrained session credentials, never a standard API key.                                                                                                                                                 |
| `realtime.providers.openai.speakerVoice` | `alloy`                                    | Built-in OpenAI Realtime voice id (the older `voice` key still works but is deprecated). Current `gpt-realtime-2.1` voices: `alloy`, `ash`, `ballad`, `cedar`, `coral`, `echo`, `marin`, `sage`, `shimmer`, `verse`; `marin` and `cedar` are recommended for best quality. |
| `realtime.transport`                     | -                                          | `webrtc`: client-owned OpenAI WebRTC on iOS and in the browser. `provider-websocket`: browser-owned, stays on Gateway relay on iOS. `gateway-relay`: keeps provider audio on the Gateway; Android uses realtime only with this transport.                                  |
| `realtime.brain`                         | -                                          | `agent-consult` routes realtime tool calls through Gateway policy; `direct-tools` is legacy direct-tool compatibility; `none` is for transcription/external orchestration.                                                                                                 |
| `realtime.consultRouting`                | -                                          | `provider-direct` preserves the provider's direct reply when it skips `openclaw_agent_consult`; `force-agent-consult` routes finalized user transcripts through OpenClaw instead.                                                                                          |
| `realtime.instructions`                  | -                                          | Appends provider-facing system instructions to OpenClaw's built-in realtime prompt (voice style/tone); the default `openclaw_agent_consult` guidance stays.                                                                                                                |

`talk.catalog` will expose normalized provider ids and registry aliases, each provider's valid modes/transports/brain strategies/realtime audio formats/capability flags, and the runtime-selected readiness results. First-party Talk clients should read this catalog instead of maintaining provider aliases locally; if an older Gateway omits group readiness status, treat it as unverified rather than explicitly unconfigured. Streaming transcription providers are discovered via `talk.catalog.transcription`; the current Gateway relay uses the Voice Call streaming provider configuration until a dedicated Talk transcription configuration interface is published.

## macOS 界面

- 菜单栏切换：**Talk**
- 配置标签页：**Talk Mode** 组（voice id + interrupt toggle）
- 覆盖层：该球体渲染通用的 talk 波形（与 iOS、watchOS 和 Android 共用）。Listening 跟随实时麦克风音量，Speaking 跟随实际的 TTS 播放包络，Thinking 轻柔呼吸。点击球体可暂停/恢复，双击可停止说话，点击 X 可退出 Talk 模式。

## Android 界面

- Voice 选项卡切换：**Talk**
- 手动 **Mic** 和 **Talk** 互斥的采集模式。
- 手动 Mic 和实时 Talk 优先使用已连接的 Bluetooth Classic 或 BLE 头戴式耳机麦克风；如果断开连接，应用会请求另一个头戴式输入，或回退到默认麦克风，并在采集停止后恢复默认偏好。
- 手动 Mic 在应用离开前台或用户离开 Voice 选项卡时停止。
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
