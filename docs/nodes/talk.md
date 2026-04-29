---
summary: "Talk 模式：与已配置 TTS 提供商进行持续语音对话"
read_when:
  - 在 macOS/iOS/Android 上实现 Talk 模式时
  - 更改语音/TTS/中断行为时
title: "Talk mode"
---

Talk 模式是一个持续的语音对话循环：

1. 监听语音
2. 将转写内容发送给模型（主会话，chat.send）
3. 等待响应
4. 通过已配置的 Talk 提供商朗读（`talk.speak`）

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
  },
}
```

默认值：

- `interruptOnSpeech`: true
- `silenceTimeoutMs`: 未设置时，Talk 会在发送转写内容前保持平台默认的停顿窗口（macOS 和 Android 上为 `700 ms`，iOS 上为 `900 ms`）
- `provider`: 选择当前激活的 Talk 提供商。对 macOS 本地播放路径使用 `elevenlabs`、`mlx` 或 `system`。
- `providers.<provider>.voiceId`: 对 ElevenLabs 回退到 `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID`（如果 API key 可用，则回退到第一个 ElevenLabs 语音）。
- `providers.elevenlabs.modelId`: 未设置时默认为 `eleven_v3`。
- `providers.mlx.modelId`: 未设置时默认为 `mlx-community/Soprano-80M-bf16`。
- `providers.elevenlabs.apiKey`: 回退到 `ELEVENLABS_API_KEY`（或可用时回退到 gateway shell 配置文件）。
- `speechLocale`: iOS/macOS 上设备端 Talk 语音识别的可选 BCP 47 区域标识。留空则使用设备默认值。
- `outputFormat`: macOS/iOS 上默认为 `pcm_44100`，Android 上默认为 `pcm_24000`（设置为 `mp3_*` 可强制使用 MP3 流式传输）

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
- 使用会话键 `main` 执行 `chat.send`。
- gateway 通过当前激活的 Talk 提供商使用 `talk.speak` 解析 Talk 播放。仅当该 RPC 不可用时，Android 才会回退到本地系统 TTS。
- macOS 本地 MLX 播放在可用时使用内置的 `openclaw-mlx-tts` 辅助程序，或者使用 `PATH` 上的可执行文件。开发期间可将 `OPENCLAW_MLX_TTS_BIN` 设置为指向自定义辅助程序二进制文件。
- `eleven_v3` 的 `stability` 会被验证为 `0.0`、`0.5` 或 `1.0`；其他模型接受 `0..1`。
- 设置 `latency_tier` 时会被验证为 `0..4`。
- Android 支持 `pcm_16000`、`pcm_22050`、`pcm_24000` 和 `pcm_44100` 输出格式，用于低延迟 AudioTrack 流式传输。

## 相关内容

- [Voice wake](/nodes/voicewake)
- [Audio and voice notes](/nodes/audio)
- [Media understanding](/nodes/media-understanding)
