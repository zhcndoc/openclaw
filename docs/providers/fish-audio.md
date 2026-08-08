---
summary: "使用 Fish Audio 托管的 S2.1 或在 Apple 芯片上运行本地 S2 Pro"
read_when:
  - 你想在 OpenClaw 中使用 Fish Audio 文字转语音
  - 你想使用 Fish Audio 的富有表现力或克隆声音
  - 你想在 macOS Talk 模式下使用本地 Fish S2 Pro 语音
title: "Fish Audio"
---

OpenClaw 支持通过两种不同方式使用 Fish Audio：

- **托管版 S2.1** 通过 Gateway 上的 `fish-audio` 语音提供商运行，可用于各个频道、语音留言、Talk 和电话服务。
- **本地版 S2 Pro** 通过现有的 `mlx` Talk 提供商在原生 macOS 应用中运行。它始终在 Mac 上运行，不需要 Fish API 密钥。

<Warning>
可下载的 S2 Pro 权重使用 Fish Audio Research License。允许用于个人、研究和非商业评估；商业用途需要单独获得 Fish Audio 的许可。托管 API 的使用须遵循 Fish Audio 的服务条款。
</Warning>

## 托管 S2.1

安装 `fish-audio-speech` 插件：

```bash
openclaw plugins install @openclaw/fish-audio-speech
```

插件 ID 为 `fish-audio-speech`。提供商和 TTS 配置 ID
仍为 `fish-audio`。

从 [Fish Audio API 密钥](https://fish.audio/app/api-keys) 页面设置 API 密钥：

```bash
export FISH_API_KEY="..."
```

然后配置提供商：

```json5
{
  tts: {
    auto: "tagged",
    provider: "fish-audio",
    providers: {
      "fish-audio": {
        apiKey: "${FISH_API_KEY}",
        model: "s2.1-pro",
        // 可选的已保存或公开 Fish Audio 语音模型 ID：
        speakerVoiceId: "802e3bc2b27e49c2995d23ef70e6ac89",
        latency: "balanced",
      },
    },
  },
}
```

`speakerVoiceId` 是可选的。不设置时，Fish Audio 会使用其默认语音。
为兼容现有的社区插件，也接受 `FISH_AUDIO_API_KEY`，但 `FISH_API_KEY` 才是 Fish SDK 的标准环境变量。

### 托管模型

| 模型            | 用途                                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------------------------- |
| `s2.1-pro`      | 默认模型。生产环境中的 S2.1 服务，附带你所选套餐提供的托管服务保障。                                             |
| `s2.1-pro-free` | 截至 2026 年 8 月 31 日的促销版 S2.1 访问权限；不提供 TTFA 或 DPA 保障。有效期间需显式选择此模型。              |
| `s2-pro`        | 上一代 S2 模型。                                                                                               |
| `s1`            | 更早一代模型，支持使用圆括号控制情绪。                                                                         |

对于普通音频，该提供商请求 MP3；对于原生语音消息，请求 48 kHz 的 Opus；对于电话通信，请求 8 kHz 的原始 PCM。对于 Discord 语音，OpenClaw 会在 Fish Audio 的分块 HTTP 响应到达时立即使用，而不是等待整个音频片段完成。

### 表现力语音

S2 和 S2.1 接受内联自然语言标签。将标签放入朗读文本中：

```text
[whisper] 这件事要保密。 [pause] [excited] 我们交付成功了！
```

常见标签包括 `[whisper]`、`[laughing]`、`[excited]`、`[sad]`、`[pause]`，以及诸如 `[professional broadcast tone]` 之类的自由格式指令。

### 语音选择与克隆

使用 `/tts status` 查看当前激活的提供商，使用 `/tts audio <text>` 生成一次性音频片段。Fish 语音 ID 可以来自你自己训练的语音或 Fish 公共语音库。OpenClaw 会优先列出你的语音，然后列出数量有限的热门公共语音。

语音提供商使用已有的语音 ID；它不会上传录音或创建语音模型。创建语音是 Fish Audio 应用或 API 中一项单独且涉及同意的操作。

## macOS 上的本地 S2 Pro

原生 macOS 应用捆绑了一个隔离的 MLX TTS 辅助程序。在 Apple 芯片设备上，将现有的 `mlx` Talk 提供商指向 8 位 Fish 转换版本：

```json5
{
  talk: {
    provider: "mlx",
    providers: {
      mlx: {
        modelId: "mlx-community/fish-audio-s2-pro-8bit",
      },
    },
  },
}
```

第一次生成语音时会下载约 6.8 GB 的模型和编解码器数据。OpenClaw 会让一个选定的 MLX 模型保持驻留，以便重复生成语音；经过五分钟空闲时间、应用关闭或出现内存压力后，模型会被卸载。

### 本地参考音色

当 Gateway 和 macOS 应用共享同一文件系统时，配置一段 10–30 秒的清晰参考录音及其准确转录文本：

```json5
{
  talk: {
    provider: "mlx",
    providers: {
      mlx: {
        modelId: "mlx-community/fish-audio-s2-pro-8bit",
        referenceAudioPath: "/Users/example/Voices/reference.wav",
        referenceText: "参考录音中说出的确切词语。",
      },
    },
  },
}
```

`referenceAudioPath` 会在运行原生应用的 Mac 上解析，而不是在远程 Gateway 上解析。文件会保留在本地：应用仅将其传递给隔离的 MLX 辅助程序。本地 Fish 输出会以 PCM 流的形式传入 Talk 播放，因此语音可以在较长的生成过程完成之前开始播放。

<Note>
本地 MLX 目前仅适用于原生 macOS Talk。其他频道和客户端使用由 Gateway 选定的托管语音提供商。iOS 和 Android 继续保留现有的原生/系统及 Gateway Talk 路径。
</Note>

## 故障排查

- **`Fish Audio API key missing`**：设置 `FISH_API_KEY` 或 `tts.providers.fish-audio.apiKey`。
- **HTTP 401**：在 Fish Audio 验证 API 密钥。
- **HTTP 402**：所选托管模型需要可用额度或相应的方案权限。
- **本地模型回退到系统语音**：确认使用的是 Apple 芯片、磁盘空间充足，并核对 Hugging Face 模型 ID 是否准确。
- **本地克隆效果不匹配**：使用干净的单说话人音频，并确保 `referenceText` 与其完全一致。

请参阅 [Fish Audio TTS API](https://docs.fish.audio/features/text-to-speech)
和 [Fish Audio 研究许可证](https://huggingface.co/fishaudio/s2-pro/blob/main/LICENSE.md)。
