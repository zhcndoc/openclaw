---
summary: "tts 配置块、每个提供商的设置、本地语音引擎和覆盖优先级"
title: "文本转语音配置"
read_when:
  - "您正在 openclaw.json 中编写 tts 块"
  - "您需要一个语音提供商的配置片段"
  - "您需要本地 Speech Swift 或语音核心引擎"
  - "您需要按客服人员、按通道或按帐户进行语音覆盖"
---

## <a id="configuration"></a> 配置

TTS 配置位于 `~/.openclaw/openclaw.json` 中的 `tts` 下。选择一个预设并调整提供程序块。下面显示的 `speakerVoice`/`speakerVoiceId` 字段是当前名称；每个提供商自己的 `voice`/`voiceId`/ `voiceName` 字段名称仍然用作旧别名。

OpenRouter 和 DeepInfra 在提供程序默认值之前按顺序使用 `speakerVoice`、`speakerVoiceId`、`voice` 和 `voiceId` 中的第一个非空值。 Talk 将相同的顺序应用于其提供程序块；当所有四个字段都不存在或空白时，它保留基本 TTS 语音。

<Tabs>
  <Tab title="Azure Speech">
```json5
{
  tts: {
    auto: "always",
    provider: "azure-speech",
    providers: {
      "azure-speech": {
        apiKey: "${AZURE_SPEECH_KEY}",
        region: "eastus",
        speakerVoice: "en-US-JennyNeural",
        lang: "en-US",
        outputFormat: "audio-24khz-48kbitrate-mono-mp3",
        voiceNoteOutputFormat: "ogg-24khz-16bit-mono-opus",
      },
    },
  },
}
```
  </Tab>
  <Tab title="ElevenLabs">
```json5
{
  tts: {
    auto: "always",
    provider: "elevenlabs",
    providers: {
      elevenlabs: {
        apiKey: "${ELEVENLABS_API_KEY}",
        modelId: "eleven_multilingual_v2",
        speakerVoiceId: "EXAVITQu4vr4xnSDxMaL",
      },
    },
  },
}
```
  </Tab>
  <Tab title="Fish Audio">
```json5
{
  tts: {
    auto: "tagged",
    provider: "fish-audio",
    providers: {
      "fish-audio": {
        apiKey: "${FISH_API_KEY}",
        model: "s2.1-pro", // Or "drama-3" for expressive voice direction.
        speakerVoiceId: "802e3bc2b27e49c2995d23ef70e6ac89",
        latency: "balanced",
      },
    },
  },
}
```
  </Tab>
  <Tab title="Google Gemini">
```json5
{
  tts: {
    auto: "always",
    provider: "google",
    providers: {
      google: {
        apiKey: "${GEMINI_API_KEY}",
        model: "gemini-3.8-flash-tts",
        speakerVoice: "Kore",
        // Optional natural-language style prompts:
        // audioProfile: "Speak in a calm, podcast-host tone.",
        // speakerName: "Alex",
      },
    },
  },
}
```
  </Tab>
  <Tab title="Gradium">
```json5
{
  tts: {
    auto: "always",
    provider: "gradium",
    providers: {
      gradium: {
        apiKey: "${GRADIUM_API_KEY}",
        speakerVoiceId: "YTpq7expH9539ERJ",
      },
    },
  },
}
```
  </Tab>
  <Tab title="Inworld">
```json5
{
  tts: {
    auto: "always",
    provider: "inworld",
    providers: {
      inworld: {
        apiKey: "${INWORLD_API_KEY}",
        modelId: "inworld-tts-1.5-max",
        speakerVoiceId: "Sarah",
        temperature: 0.7,
      },
    },
  },
}
```
  </Tab>
  <Tab id="local-cli" title="本地 CLI">
```json5
{
  tts: {
    auto: "always",
    provider: "tts-local-cli",
    providers: {
      "tts-local-cli": {
        command: "say",
        args: ["-o", "{{OutputPath}}", "{{Text}}"],
        outputFormat: "wav",
        timeoutMs: 120000,
      },
    },
  },
}
```
  </Tab>
  <Tab id="microsoft-no-key" title="Microsoft（无钥匙）">
```json5
{
  tts: {
    auto: "always",
    provider: "microsoft",
    providers: {
      microsoft: {
        enabled: true,
        speakerVoice: "en-US-MichelleNeural",
        lang: "en-US",
        outputFormat: "audio-24khz-48kbitrate-mono-mp3",
        rate: "+0%",
        pitch: "+0%",
      },
    },
  },
}
```
  </Tab>
  <Tab title="MiniMax">
```json5
{
  tts: {
    auto: "always",
    provider: "minimax",
    providers: {
      minimax: {
        apiKey: "${MINIMAX_API_KEY}",
        model: "speech-2.8-hd",
        speakerVoiceId: "English_expressive_narrator",
        speed: 1.0,
        vol: 1.0,
        pitch: 0,
      },
    },
  },
}
```
  </Tab>
  <Tab title="OpenAI + ElevenLabs">
```json5
{
  tts: {
    auto: "always",
    provider: "openai",
    summaryModel: "openai/gpt-4.1-mini",
    modelOverrides: { enabled: true },
    providers: {
      openai: {
        apiKey: "${OPENAI_API_KEY}",
        model: "gpt-4o-mini-tts",
        speakerVoice: "alloy",
      },
      elevenlabs: {
        apiKey: "${ELEVENLABS_API_KEY}",
        modelId: "eleven_multilingual_v2",
        speakerVoiceId: "EXAVITQu4vr4xnSDxMaL",
        voiceSettings: { stability: 0.5, similarityBoost: 0.75, style: 0.0, useSpeakerBoost: true, speed: 1.0 },
        applyTextNormalization: "auto",
        languageCode: "en",
      },
    },
  },
}
```
  </Tab>
  <Tab title="OpenRouter">
```json5
{
  tts: {
    auto: "always",
    provider: "openrouter",
    providers: {
      openrouter: {
        apiKey: "${OPENROUTER_API_KEY}",
        model: "hexgrad/kokoro-82m",
        speakerVoice: "af_alloy",
        responseFormat: "mp3",
      },
    },
  },
}
```
  </Tab>
  <Tab title="Volcengine">
```json5
{
  tts: {
    auto: "always",
    provider: "volcengine",
    providers: {
      volcengine: {
        apiKey: "${VOLCENGINE_TTS_API_KEY}",
        resourceId: "seed-tts-1.0",
        speakerVoice: "en_female_anna_mars_bigtts",
      },
    },
  },
}
```
  </Tab>
  <Tab title="xAI">
```json5
{
  tts: {
    auto: "always",
    provider: "xai",
    providers: {
      xai: {
        apiKey: "${XAI_API_KEY}",
        speakerVoiceId: "eve",
        language: "en",
        responseFormat: "mp3",
      },
    },
  },
}
```
  </Tab>
  <Tab title="Xiaomi MiMo">
```json5
{
  tts: {
    auto: "always",
    provider: "xiaomi",
    providers: {
      xiaomi: {
        apiKey: "${XIAOMI_API_KEY}",
        model: "mimo-v2.5-tts",
        speakerVoice: "mimo_default",
        format: "mp3",
      },
    },
  },
}
```
  </Tab>
</Tabs>

对于 Xiaomi `mimo-v2.5-tts-voicedesign`，省略 `speakerVoice` 并将 `style` 设置为语音设计提示词。OpenClaw 会将该提示词作为 TTS 的 `user` 消息发送， 并且不会为 voicedesign 模型发送 `audio.voice`。

### <a id="local-speech-swift-and-speech-core"></a> 本地 Speech Swift 和 speech-core

[Speech Swift](https://github.com/soniqo/speech-swift) 和 [speech-core](https://github.com/soniqo/speech-core) 提供跨 macOS、Linux 和 Windows 的本地语音推理。当 Speech Swift 和 OpenClaw 在同一台 Mac 上运行时，请使用 OpenAI- 兼容的 HTTP 提供程序。使用本地 CLI 在任何支持的主机上进行直接可执行集成。

当某个通道需要 OpenClaw 将 WAV 输出转换为 Opus 或原始 PCM 时，请安装 `ffmpeg`。

<Tabs>
  <Tab title="macOS HTTP">
<Warning>
此 HTTP 配置需要 Speech Swift v0.0.23 或更高版本。如果 Homebrew 已经安装了较旧版本，请先运行 `brew update && brew upgrade speech`。
</Warning>

启动 Speech Swift 的本地服务器：

```bash
brew install speech
speech-server --port 8080
```

将 OpenAI speech 提供程序指向其回环端点。`responseFormat` 必须是 `wav`，因为本地端点不会输出压缩音频：

```json5
{
  tts: {
    auto: "always",
    provider: "openai",
    providers: {
      openai: {
        apiKey: "local",
        baseUrl: "http://127.0.0.1:8080/v1",
        model: "tts-1",
        speakerVoice: "alloy",
        responseFormat: "wav",
      },
    },
  },
}
```

`tts-1` 会选择 Kokoro。Speech Swift 注册表别名，例如 `qwen3-tts`、 `cosyvoice` 和 `voxcpm2` 会选择其他本地引擎。占位用 API 密钥是 OpenClaw 提供程序配置所必需的，但不会被回环服务器验证。
</Tab>
<Tab title="macOS CLI">
Homebrew 的 `speech` 可执行文件可以直接写入 OpenClaw 每次调用的输出路径：

```json5
{
  tts: {
    auto: "always",
    provider: "tts-local-cli",
    providers: {
      "tts-local-cli": {
        command: "speech",
        args: ["speak", "{{Text}}", "--output", "{{OutputPath}}"],
        outputFormat: "wav",
        timeoutMs: 120000,
      },
    },
  },
}
```

  </Tab>
  <Tab title="Linux CLI">
安装 speech-core Linux 发布包，下载一次 ONNX 模型集，并在启动 OpenClaw 之前验证合成：

```bash
speech download-models
speech speak "Hello from OpenClaw" hello.wav
```

然后配置打包的 Kokoro 命令：

```json5
{
  tts: {
    auto: "always",
    provider: "tts-local-cli",
    providers: {
      "tts-local-cli": {
        command: "speech",
        args: ["speak", "{{Text}}", "{{OutputPath}}"],
        outputFormat: "wav",
        timeoutMs: 120000,
      },
    },
  },
}
```

有关发布包和模型目录设置，请参阅 [speech-core Linux CLI 参考](https://github.com/soniqo/speech-core/blob/main/docs/cli.md) 。
</Tab>
<Tab title="Windows CLI">
下载 speech-core Windows 发布版，解压它，并安装一次 ONNX 模型：

```powershell
$Version = "0.0.11"
$Url = "https://github.com/soniqo/speech-core/releases/download/v$Version/speech-$Version-windows-x64.zip"
Invoke-WebRequest $Url -OutFile speech.zip
Expand-Archive speech.zip
Set-Location "speech\speech-$Version-windows-x64\bin"
Set-ExecutionPolicy -Scope Process Bypass
.\speech_download_models.ps1
```

`Set-ExecutionPolicy -Scope Process Bypass` 仅允许未签名的 `speech_download_models.ps1` 在此 shell 中运行。 `-Scope Process` 不改变机器或用户执行策略，当 shell 退出时放松结束。

然后将 Local CLI 指向打包的 Kokoro 可执行文件。将 `C:\path\to` 替换为您的提取目录，并将 `0.0.11` 替换为您下载的 `$Version`：

```json5
{
  tts: {
    auto: "always",
    provider: "tts-local-cli",
    providers: {
      "tts-local-cli": {
        command: "C:\\path\\to\\speech-0.0.11-windows-x64\\bin\\speech_synthesize.exe",
        args: ["{{OutputPath}}", "{{Text}}", "en"],
        outputFormat: "wav",
        timeoutMs: 120000,
      },
    },
  },
}
```

有关打包服务器、模型缓存和独立命令语法，请参阅 [speech-core Windows CLI 参考](https://github.com/soniqo/speech-core/blob/main/docs/cli.md) 。

  </Tab>
</Tabs>

### <a id="per-agent-voice-overrides"></a> 每个代理的语音覆盖

当某个代理应使用不同的提供商、声音、模型、角色设定或自动 TTS 模式时，使用 `agents.entries.*.tts`。代理块会对 `tts` 进行深度合并，因此提供商凭据可以保留在全局提供商配置中：

```json5
{
  tts: {
    auto: "always",
    provider: "elevenlabs",
    providers: {
      elevenlabs: { apiKey: "${ELEVENLABS_API_KEY}", modelId: "eleven_multilingual_v2" },
    },
  },
  agents: {
    entries: {
      reader: {
        tts: {
          providers: {
            elevenlabs: { speakerVoiceId: "EXAVITQu4vr4xnSDxMaL" },
          },
        },
      },
    },
  },
}
```

要为某个代理固定角色设定，请将 `agents.entries.*.tts.persona` 与提供商配置一起设置——它只会覆盖该代理的全局 `tts.persona`。

自动回复、`/tts audio`、`/tts status` 和 `tts` 代理工具的优先顺序。后面的层获胜：每一层都深度合并其上面的层，因此设置字段的最后一层决定其值。

1. `tts`
2. 活跃的 `agents.entries.*.tts`
3. 当该频道支持 `channels.<channel>.tts` 时的频道覆盖
4. 当该频道传递 `channels.<channel>.accounts.<id>.tts` 时的账号覆盖
5. 此主机的本地 `/tts` 首选项
6. 启用 [model overrides](/tools/tts/commands#model-driven-directives) 时的 inline `[[tts:...]]` 指令

频道和账号覆盖使用与 `tts` 相同的结构，并在更早的层之上进行深度合并，因此共享的提供商凭据可以保留在 `tts` 中，而频道或机器人账号只更改声音、模型、角色设定或自动模式：

```json5
{
  tts: {
    provider: "openai",
    providers: {
      openai: { apiKey: "${OPENAI_API_KEY}", model: "gpt-4o-mini-tts" },
    },
  },
  channels: {
    feishu: {
      accounts: {
        english: {
          tts: {
            providers: {
              openai: { speakerVoice: "shimmer" },
            },
          },
        },
      },
    },
  },
}
```
