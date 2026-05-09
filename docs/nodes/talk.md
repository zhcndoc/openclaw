---
summary: "Talk 模式：跨本地 STT/TTS 和实时语音的连续语音对话"
read_when:
  - 在 macOS/iOS/Android 上实现 Talk 模式时
  - 更改语音/TTS/中断行为时
title: "Talk 模式"
---

Talk 模式有两种运行形态：

- 原生 macOS/iOS/Android Talk 使用本地语音识别、Gateway 聊天以及 `talk.speak` TTS。节点会声明 `talk` 能力，并声明它们支持的 `talk.*` 命令。
- 浏览器 Talk 对客户端拥有的 `webrtc` 和 `provider-websocket` 会话使用 `talk.client.create`，或对 Gateway 拥有的 `gateway-relay` 会话使用 `talk.session.create`。`managed-room` 仅保留给 Gateway 接管和对讲房间使用。
- 仅转写客户端在需要字幕或听写、但不需要助手语音回复时，使用 `talk.session.create({ mode: "transcription", transport: "gateway-relay", brain: "none" })`，然后使用 `talk.session.appendAudio`、`talk.session.cancelTurn` 和 `talk.session.close`。

原生 Talk 是一个连续的语音对话循环：

1. 监听语音
2. 通过当前会话将转写内容发送给模型
3. 等待回复
4. 通过已配置的 Talk 提供方（`talk.speak`）朗读出来

浏览器实时 Talk 会通过 `talk.client.toolCall` 转发提供方工具调用；浏览器客户端不会直接调用 `chat.send` 来进行实时咨询。

仅转写 Talk 会发出与实时和 STT/TTS 会话相同的通用 Talk 事件封装，但使用 `mode: "transcription"` 和 `brain: "none"`。它适用于字幕、听写和仅观察式语音捕获；一次性上传的语音笔记仍然使用 media/audio 路径。

## 行为（macOS）

- 启用 Talk 模式时显示**始终开启的覆盖层**。
- **Listening → Thinking → Speaking** 阶段转换。
- 在**短暂停顿**（静音窗口）时，发送当前转写内容。
- 回复会**写入 WebChat**（与手动输入相同）。
- **语音打断**（默认开启）：如果用户在助手说话时开始讲话，我们会停止播放，并记录中断时间戳以供下一个提示使用。

## 回复中的语音指令

助手可以在回复前添加一行**单独的 JSON 行**来控制语音：

```json
{ "voice": "<voice-id>", "once": true }
```

规则：

- 只能作为第一条非空行。
- 未知键会被忽略。
- `once: true` 仅应用于当前回复。
- 如果没有 `once`，该语音会成为 Talk 模式的新默认语音。
- 在 TTS 播放前会移除这行 JSON。

支持的键：

- `voice` / `voice_id` / `voiceId`
- `model` / `model_id` / `modelId`
- `speed`, `rate`（WPM）, `stability`, `similarity`, `style`, `speakerBoost`
- `seed`, `normalize`, `lang`, `output_format`, `latency_tier`
- `once`

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
          voice: "cedar",
        },
      },
      mode: "realtime",
      transport: "webrtc",
      brain: "agent-consult",
    },
  },
}
```

默认值：

- `interruptOnSpeech`: true
- `silenceTimeoutMs`: 未设置时，Talk 会在发送转写内容前保持平台默认的停顿窗口（macOS 和 Android 为 `700 ms`，iOS 为 `900 ms`）
- `provider`: 选择当前激活的 Talk 提供方。对于 macOS 本地播放路径，可使用 `elevenlabs`、`mlx` 或 `system`。
- `providers.<provider>.voiceId`: 对 ElevenLabs 会回退到 `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID`（如果 API key 可用，则回退到第一个 ElevenLabs 语音）。
- `providers.elevenlabs.modelId`: 未设置时默认为 `eleven_v3`。
- `providers.mlx.modelId`: 未设置时默认为 `mlx-community/Soprano-80M-bf16`。
- `providers.elevenlabs.apiKey`: 回退到 `ELEVENLABS_API_KEY`（或可用时的 gateway shell profile）。
- `realtime.provider`: 选择当前激活的浏览器/服务器实时语音提供方。WebRTC 使用 `openai`，provider WebSocket 使用 `google`，或者通过 Gateway relay 使用仅桥接型提供方。
- `realtime.providers.<provider>` 存储提供方拥有的实时配置。浏览器只接收短期有效或受限的会话凭据，绝不会接收标准 API key。
- `realtime.providers.openai.voice`: 内置 OpenAI Realtime 语音 id。当前 `gpt-realtime-2` 的语音有 `alloy`、`ash`、`ballad`、`coral`、`echo`、`sage`、`shimmer`、`verse`、`marin` 和 `cedar`；推荐使用 `marin` 和 `cedar` 以获得最佳质量。
- `realtime.brain`: `agent-consult` 通过 Gateway 策略路由实时工具调用；`direct-tools` 是仅所有者可用的兼容行为；`none` 用于转写或外部编排。
- `talk.catalog` 公开每个提供方的有效模式、传输方式、brain 策略、实时音频格式和能力标志，以便第一方 Talk 客户端避免不受支持的组合。
- 流式转写提供方通过 `talk.catalog.transcription` 发现。当前 Gateway relay 使用 Voice Call 流式提供方配置，直到加入专门的 Talk 转写配置接口。
- `speechLocale`: 用于 iOS/macOS 设备端 Talk 语音识别的可选 BCP 47 locale id。留空则使用设备默认值。
- `outputFormat`: macOS/iOS 默认是 `pcm_44100`，Android 默认是 `pcm_24000`（设置 `mp3_*` 可强制使用 MP3 流）

## macOS 界面

- 菜单栏开关：**Talk**
- 配置选项卡：**Talk Mode** 组（voice id + interrupt 切换）
- 覆盖层：
  - **Listening**：云朵随麦克风音量脉冲变化
  - **Thinking**：下沉动画
  - **Speaking**：辐射环
  - 点击云朵：停止说话
  - 点击 X：退出 Talk 模式

## Android 界面

- Voice 选项卡开关：**Talk**
- 手动 **Mic** 和 **Talk** 在运行时是互斥的捕获模式。
- 当应用离开前台或用户离开 Voice 选项卡时，手动 Mic 会停止。
- Talk Mode 会持续运行，直到被切换关闭或 Android 节点断开；激活期间会使用 Android 的麦克风前台服务类型。

## 备注

- 需要 Speech + Microphone 权限。
- 原生 Talk 使用当前 Gateway 会话，仅在没有 response 事件可用时才回退到历史轮询。
- 浏览器实时 Talk 使用 `talk.client.toolCall` 来处理 `openclaw_agent_consult`，而不是向提供方拥有的浏览器会话暴露 `chat.send`。
- 仅转写 Talk 使用 `talk.session.create`、`talk.session.appendAudio`、`talk.session.cancelTurn` 和 `talk.session.close`；客户端订阅 `talk.event` 以获取部分/最终转写更新。
- Gateway 会通过当前 Talk 提供方使用 `talk.speak` 来解析 Talk 播放。只有在该 RPC 不可用时，Android 才回退到本地系统 TTS。
- macOS 本地 MLX 播放在可用时会使用捆绑的 `openclaw-mlx-tts` 辅助程序，或者使用 `PATH` 上的可执行文件。开发期间可设置 `OPENCLAW_MLX_TTS_BIN` 指向自定义辅助程序二进制文件。
- `eleven_v3` 的 `stability` 已验证为 `0.0`、`0.5` 或 `1.0`；其他模型接受 `0..1`。
- 设置 `latency_tier` 时，其值会被验证为 `0..4`。
- Android 支持 `pcm_16000`、`pcm_22050`、`pcm_24000` 和 `pcm_44100` 输出格式，用于低延迟 AudioTrack 流式传输。

## 相关内容

- [Voice wake](/nodes/voicewake)
- [Audio and voice notes](/nodes/audio)
- [Media understanding](/nodes/media-understanding)
