---
summary: "使用 Fish Audio Drama 3 或 S2.1 托管的 TTS，或 Apple 芯片上的本地 S2 Pro"
read_when:
  - "您想要 Fish Audio 文本转语音 OpenClaw"
  - "你想使用 Fish Audio 的富有表现力或克隆声音"
  - "你想在 macOS Talk 模式下使用本地 Fish S2 Pro 语音"
title: "Fish Audio"
---

OpenClaw 支持通过两种不同方式使用 Fish Audio：

- **Hosted S2.1 和 Drama 3** 通过网关上的 `fish-audio` 语音提供程序运行，并跨渠道、语音注释、Talk 和电话工作。
- **本地版 S2 Pro** 通过现有的 `mlx` Talk 提供商在原生 macOS 应用中运行。它始终在 Mac 上运行，不需要 Fish API 密钥。

<Warning>
可下载的 S2 Pro 权重使用 Fish Audio Research License。允许用于个人、研究和非商业评估；商业用途需要单独获得 Fish Audio 的许可。托管 API 的使用须遵循 Fish Audio 的服务条款。
</Warning>

## <a id="hosted-s2.1"></a><a id="hosted-s2-1"></a> 托管 S2.1

安装 `fish-audio-speech` 插件：

```bash
openclaw plugins install @openclaw/fish-audio-speech
```

插件 ID 为 `fish-audio-speech`。提供商和 TTS 配置 ID 仍为 `fish-audio`。

从 [Fish Audio API Keys](https://fish.audio/app/api-keys) 页面设置 API 密钥：

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
        // Optional saved or public Fish Audio voice model id:
        speakerVoiceId: "802e3bc2b27e49c2995d23ef70e6ac89",
        latency: "balanced",
      },
    },
  },
}
```

`speakerVoiceId` 是可选的。如果没有它，Fish Audio 将使用其默认语音。 `FISH_AUDIO_API_KEY` 也被接受以与现有社区插件兼容，但 `FISH_API_KEY` 是标准 Fish SDK 环境变量。

### <a id="hosted-models"></a> 托管模型

| 模型             | 用途                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------- |
| `drama-3`         | 发布剧集 3。自然语言语音指导和单词级传递标签。                              |
| `drama-3-preview` | 预览。自然语言语音指导和单词级传递标签；行为和可用性可能会改变。 |
| `s2.1-pro`        | 默认模型。生产环境中的 S2.1 服务，附带你所选套餐提供的托管服务保障。                    |
| `s2.1-pro-free`   | 促销 S2.1 访问权限于 2026 年 8 月 31 日结束；无 TTFA 或 DPA 保证。                             |
| `s2-pro`          | 上一代 S2 模型。                                                                                       |
| `s1`              | 更早一代模型，支持使用圆括号控制情绪。                                                      |

对于普通音频，该提供商请求 MP3；对于原生语音消息，请求 48 kHz 的 Opus；对于电话通信，请求 8 kHz 的原始 PCM。对于 Discord 语音，OpenClaw 会在 Fish Audio 的分块 HTTP 响应到达时立即使用，而不是等待整个音频片段完成。

### <a id="expressive-speech"></a> 表现力语音

S2 和 S2.1 接受内联自然语言标签。将标签放入朗读文本中：

```text
[whisper] Keep this between us. [pause] [excited] We shipped it!
```

常见标签包括 `[whisper]`、`[laughing]`、`[excited]`、`[sad]`、`[pause]`，以及诸如 `[professional broadcast tone]` 之类的自由格式指令。

### <a id="drama-3"></a> 戏剧3

将 `tts.providers.fish-audio.model` 设置为 `"drama-3"` 以选择加入。提供商继续默认为 `s2.1-pro`；现有配置不会自动切换。 `"drama-3-preview"` 仍被接受。对于特定于 Talk 的覆盖，请使用 `talk.providers.fish-audio.modelId: "drama-3"`。

Drama 3 使用相同的托管 API、API 密钥和语音 ID。它接受方括号、声音和停顿中的简单语言指示，以及仅影响所包含单词的配对标签：

```text
[calm, reassuring] We have time. [short pause] <whisper>One step at a time.</whisper>
```

支持的交货标签包括 `<whisper>`、`<emphasis>`、`<soft>`、`<fast>`、`<slow>`、`<stress>` 和 `<forceful>`。方向属于语音文本，而不是单独的模型或语音设置。

有关方向示例和限制，请参阅 [Fish Audio Drama 3](https://docs.fish.audio/features/text-to-speech/drama-3)。 OpenClaw 当前每个合成请求选择一种鱼声；该提供商未公开​​ Fish 的多扬声器 `reference_id` 阵列。

### <a id="voice-selection-and-cloning"></a> 语音选择与克隆

使用 `/tts status` 检查活动提供程序并使用 `/tts audio <text>` 查找一次性剪辑。 Fish 语音 ID 可以来自您自己训练的声音或公共 Fish 语音库。 OpenClaw 首先列出您的声音，然后列出流行的公共声音的绑定页面。

语音提供者使用现有的语音 ID；它不会上传录音或创建语音模型。语音创建是 Fish Audio 应用程序或 API 中单独的同意敏感操作。

## <a id="local-s2-pro-on-macos"></a> macOS 上的本地 S2 Pro

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

### <a id="local-reference-voice"></a> 本地参考音色

当 Gateway 和 macOS 应用共享同一文件系统时，配置一段 10–30 秒的清晰参考录音及其准确转录文本：

```json5
{
  talk: {
    provider: "mlx",
    providers: {
      mlx: {
        modelId: "mlx-community/fish-audio-s2-pro-8bit",
        referenceAudioPath: "/Users/example/Voices/reference.wav",
        referenceText: "The exact words spoken in the reference recording.",
      },
    },
  },
}
```

`referenceAudioPath` 会在运行原生应用的 Mac 上解析，而不是在远程 Gateway 上解析。文件会保留在本地：应用仅将其传递给隔离的 MLX 辅助程序。本地 Fish 输出会以 PCM 流的形式传入 Talk 播放，因此语音可以在较长的生成过程完成之前开始播放。

<Note>
本地 MLX 目前仅适用于本机 macOS Talk。其他通道和客户端使用网关选择的托管语音提供商。 iOS 和 Android 保留其现有的 native/system 和网关通话路径。
</Note>

## <a id="troubleshooting"></a> 故障排查

- **`Fish Audio API key missing`**：设置 `FISH_API_KEY` 或 `tts.providers.fish-audio.apiKey`。
- **HTTP 401**：验证 Fish Audio 处的 API 密钥。
- **HTTP 402**：所选托管模型需要可用额度或相应的方案权限。
- **本地模型回退到系统语音**：确认Apple芯片、可用磁盘空间以及确切的Hugging Face模型ID。
- **本地克隆效果不匹配**：使用干净的单说话人音频，并确保 `referenceText` 与其完全一致。

请参阅 [Fish 音频 TTS API](https://docs.fish.audio/features/text-to-speech) 和 [Fish 音频研究 License](https://huggingface.co/fishaudio/s2-pro/blob/main/LICENSE.md)。
