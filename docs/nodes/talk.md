---
summary: "对话模式：与 ElevenLabs TTS 进行持续语音对话"
read_when:
  - 在 macOS/iOS/Android 上实现对话模式
  - 更改语音/TTS/打断行为
title: "对话模式"
---

# 对话模式

对话模式是一个持续的语音对话循环：

1. 监听语音
2. 将转录文本发送给模型（主会话，chat.send）
3. 等待响应
4. 通过 ElevenLabs 朗读（流式播放）

## 行为（macOS）

- 启用对话模式时，**始终显示覆盖层**。
- 包含 **监听 → 思考 → 讲话** 阶段转换。
- 在 **短暂停顿**（静默窗口）时，发送当前转录文本。
- 回复被 **写入 WebChat**（同于输入）。
- **检测语音中断**（默认开启）：用户在助理讲话时开始说话，我们会停止播放并记录中断时间戳用于下次提示。

## 回复中的语音指令

助理可能会在回复前以一行 **JSON 格式** 前缀来控制语音：

```json
{ "voice": "<voice-id>", "once": true }
```

规则：

- 仅限第一条非空行。
- 未知键将被忽略。
- `once: true` 仅应用于当前回复。
- 无 `once` 时，语音设置将成为对话模式的新默认。
- 该 JSON 行会在 TTS 播放前被移除。

支持的键：

- `voice` / `voice_id` / `voiceId`
- `model` / `model_id` / `modelId`
- `speed`，`rate`（词/分钟），`stability`，`similarity`，`style`，`speakerBoost`
- `seed`，`normalize`，`lang`，`output_format`，`latency_tier`
- `once`

## 配置（`~/.openclaw/openclaw.json`）

```json5
{
  talk: {
    voiceId: "elevenlabs_voice_id",
    modelId: "eleven_v3",
    outputFormat: "mp3_44100_128",
    apiKey: "elevenlabs_api_key",
    interruptOnSpeech: true,
  },
}
```

默认值：

- `interruptOnSpeech`：true
- `voiceId`：回退使用 `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID`（或 API key 可用时第一个 ElevenLabs 语音）
- `modelId`：未设置时默认 `eleven_v3`
- `apiKey`：回退使用 `ELEVENLABS_API_KEY`（或可用时的 gateway shell 配置）
- `outputFormat`：macOS/iOS 默认 `pcm_44100`，Android 默认 `pcm_24000`（设置为 `mp3_*` 可强制使用 MP3 流）

## macOS 界面

- 菜单栏切换项：**对话**
- 配置页签：**对话模式** 分组（语音 ID + 中断开关）
- 覆盖层：
  - **监听**：云朵随麦克风音量闪动
  - **思考**：下沉动画
  - **讲话**：辐射环动画
  - 点击云朵：停止讲话
  - 点击 X：退出对话模式

## 注意事项

- 需要语音识别和麦克风权限。
- 使用 `chat.send` 针对会话键 `main`。
- TTS 使用带有 `ELEVENLABS_API_KEY` 的 ElevenLabs 流式 API，在 macOS/iOS/Android 上实现增量播放以降低延迟。
- `eleven_v3` 语音的 `stability` 仅接受 `0.0`、`0.5` 或 `1.0`，其他模型则接受 `[0..1]` 区间值。
- 设置时 `latency_tier` 被验证在 `[0..4]` 范围。
- 安卓支持 `pcm_16000`、`pcm_22050`、`pcm_24000` 和 `pcm_44100` 输出格式，用于低延迟 AudioTrack 流式播放。
