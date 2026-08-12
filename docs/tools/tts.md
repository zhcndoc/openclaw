---
summary: "用于出站回复的文本转语音——提供商、角色、斜杠命令以及按频道输出"
read_when:
  - 为回复启用文本转语音
  - 配置 TTS 提供商、回退链或角色
  - 使用 /tts 命令或指令
title: "文本转语音"
sidebarTitle: "文本转语音（TTS）"
---

OpenClaw 会将出站回复转换为音频，覆盖 **14 个语音提供商**：
飞书、Matrix、Telegram 和 WhatsApp 上的原生语音消息；其他地方则为音频
附件；以及用于电话和 Talk 的 PCM/Ulaw 流。

TTS 是 Talk 的 `stt-tts` 模式中语音输出的一半（`talk.speak` 调用这
同一路径进行合成）。采用提供商原生 `realtime` 的 Talk 会话会在实时提供商内部合成
语音；`transcription` 会话则从不合成助手的语音回复。

## 快速开始

<Steps>
  <Step title="选择提供商">
    OpenAI 和 ElevenLabs 是最可靠的托管选项。Microsoft 和
    Local CLI 无需 API 密钥。请查看 [提供商矩阵](#supported-providers)
    获取完整列表。
  </Step>
  <Step title="设置 API 密钥">
    为你的提供商导出环境变量（例如 `OPENAI_API_KEY`、
    `ELEVENLABS_API_KEY`）。Microsoft 和 Local CLI 不需要密钥。
  </Step>
  <Step title="在配置中启用">
    将 `tts.auto` 设置为 `"always"`，并设置 `tts.provider`：

    ```json5
    {
      tts: {
        auto: "always",
        provider: "elevenlabs",
      },
    }
    ```

  </Step>
  <Step title="在聊天中试用">
    `/tts status` 会显示当前状态。`/tts audio Hello from OpenClaw`
    会发送一次性的音频回复。
  </Step>
</Steps>

<Note>
默认情况下，自动 TTS 是**关闭**的。当 `tts.provider` 未设置时，
OpenClaw 会按注册表自动选择顺序选取第一个已配置的提供商。
内置的 `tts` 代理工具仅支持显式意图：普通聊天仍然是
文本，除非用户请求音频、使用 `/tts`，或启用自动 TTS／指令式
语音。
</Note>

## 支持的提供商

| 提供商            | 认证                                                                                                             | 说明                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Azure Speech**  | `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION`（也支持 `AZURE_SPEECH_API_KEY`、`SPEECH_KEY`、`SPEECH_REGION`）          | 原生 Ogg/Opus 语音消息输出和电话功能。                                            |
| **DeepInfra**     | `DEEPINFRA_API_KEY`                                                                                              | 兼容 OpenAI 的 TTS。默认为 `hexgrad/Kokoro-82M`。                                    |
| **ElevenLabs**    | `ELEVENLABS_API_KEY` 或 `XI_API_KEY`                                                                             | 语音克隆、多语言支持，通过 `seed` 实现确定性；为 Discord 语音播放提供流式传输。 |
| **Fish Audio**    | `FISH_API_KEY` 或 `FISH_AUDIO_API_KEY`                                                                           | 托管式 S2.1 TTS、表现力标签、语音发现、流式传输和电话功能。                |
| **Google Gemini** | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`                                                                             | Gemini API 批量 TTS；通过 `promptTemplate: "audio-profile-v1"` 支持角色设定。               |
| **Gradium**       | `GRADIUM_API_KEY`                                                                                                | 语音消息和电话输出。                                                            |
| **Inworld**       | `INWORLD_API_KEY`                                                                                                | 流式 TTS API。原生 Opus 语音消息和 PCM 电话功能。                                |
| **Local CLI**     | 无                                                                                                             | 运行配置的本地 TTS 命令。                                                        |
| **Microsoft**     | 无                                                                                                             | 通过 `node-edge-tts` 提供公开的 Edge 神经网络 TTS。尽力而为，不提供 SLA。                            |
| **MiniMax**       | `MINIMAX_API_KEY`（或 Token 方案：`MINIMAX_OAUTH_TOKEN`、`MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`）      | T2A v2 API。默认为 `speech-2.8-hd`。                                                    |
| **OpenAI**        | `OPENAI_API_KEY`                                                                                                 | 也用于自动摘要；支持 persona `instructions`。                                |
| **OpenRouter**    | `OPENROUTER_API_KEY`（可复用 `models.providers.openrouter.apiKey`）                                            | 默认模型为 `hexgrad/kokoro-82m`。                                                         |
| **Volcengine**    | `VOLCENGINE_TTS_API_KEY` 或 `BYTEPLUS_SEED_SPEECH_API_KEY`（旧版 AppID/token：`VOLCENGINE_TTS_APPID`/`_TOKEN`） | BytePlus Seed Speech HTTP API。                                                              |
| **Vydra**         | `VYDRA_API_KEY`                                                                                                  | 共享的图像、视频和语音提供商。                                                   |
| **xAI**           | `XAI_API_KEY`                                                                                                    | xAI 批量 TTS。不支持原生 Opus 语音消息。                                 |
| **Xiaomi MiMo**   | `XIAOMI_API_KEY`                                                                                                 | 通过小米聊天补全使用 MiMo TTS。                                                   |

如果配置了多个提供商，将首先使用当前选中的那个，其余作为回退选项。自动摘要使用 `summaryModel`（或
`agents.defaults.model.primary`），因此如果你保持摘要功能开启，该提供商也必须已完成认证。

<Warning>
捆绑的 **Microsoft** 提供商通过 `node-edge-tts` 使用 Microsoft Edge 的在线神经 TTS
服务。这是一个公开的 Web 服务，没有公布的 SLA 或配额——请将其视为尽力而为。旧的提供商 id `edge` 会被
规范化为 `microsoft`，并且 `openclaw doctor --fix` 会重写持久化的
配置；新配置应始终使用 `microsoft`。
</Warning>

## 配置

TTS 配置位于 `~/.openclaw/openclaw.json` 中的 `tts` 下。请选择一个
预设并调整提供方块。下面显示的 `speakerVoice`/`speakerVoiceId`
字段是规范字段；每个提供方自己的 `voice`/`voiceId`/
`voiceName` 字段名仍然可以作为旧别名使用。

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
        model: "eleven_multilingual_v2",
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
        model: "s2.1-pro",
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
        model: "gemini-3.1-flash-tts-preview",
        speakerVoice: "Kore",
        // 可选的自然语言风格提示：
        // audioProfile: "以平静、播客主持人的语气说话。",
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
  <Tab title="本地 CLI">
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
  <Tab title="Microsoft（无需密钥）">
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
        model: "eleven_multilingual_v2",
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

对于 Xiaomi `mimo-v2.5-tts-voicedesign`，省略 `speakerVoice` 并将 `style` 设置为
语音设计提示词。OpenClaw 会将该提示词作为 TTS 的 `user` 消息发送，
并且不会为 voicedesign 模型发送 `audio.voice`。

### 本地 Speech Swift 和 speech-core

[Speech Swift](https://github.com/soniqo/speech-swift) 和
[speech-core](https://github.com/soniqo/speech-core) 提供跨 macOS、Linux 和 Windows 的本地语音
推理。当 Speech Swift 和 OpenClaw 运行在同一台 Mac 上时，请使用兼容 OpenAI 的 HTTP
提供程序。在任何受支持的主机上，如需直接集成可执行文件，请使用本地 CLI。

当某个通道需要 OpenClaw 将 WAV 输出转换为 Opus 或
原始 PCM 时，请安装 `ffmpeg`。

<Tabs>
  <Tab title="macOS HTTP">
<Warning>
此 HTTP 配置需要 Speech Swift v0.0.23 或更高版本。如果 Homebrew 已经
安装了较旧版本，请先运行 `brew update && brew upgrade speech`。
</Warning>

启动 Speech Swift 的本地服务器：

```bash
brew install speech
speech-server --port 8080
```

将 OpenAI speech 提供程序指向其回环端点。`responseFormat`
必须是 `wav`，因为本地端点不会输出压缩音频：

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

`tts-1` 会选择 Kokoro。Speech Swift 注册表别名，例如 `qwen3-tts`、
`cosyvoice` 和 `voxcpm2` 会选择其他本地引擎。占位用 API 密钥是
OpenClaw 提供程序配置所必需的，但不会被回环服务器验证。
</Tab>
<Tab title="macOS CLI">
Homebrew 的 `speech` 可执行文件可以直接写入 OpenClaw
每次调用的输出路径：

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
安装 speech-core Linux 发布包，下载一次 ONNX 模型集，并在启动 OpenClaw 之前
验证合成：

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

有关发布包和模型目录设置，请参阅 [speech-core Linux CLI 参考](https://github.com/soniqo/speech-core/blob/main/docs/cli.md)
。
</Tab>
<Tab title="Windows CLI">
下载 speech-core Windows 发布版，解压它，并安装一次 ONNX
模型：

```powershell
$Version = "0.0.11"
$Url = "https://github.com/soniqo/speech-core/releases/download/v$Version/speech-$Version-windows-x64.zip"
Invoke-WebRequest $Url -OutFile speech.zip
Expand-Archive speech.zip
Set-Location "speech\speech-$Version-windows-x64\bin"
Set-ExecutionPolicy -Scope Process Bypass
.\speech_download_models.ps1
```

然后将本地 CLI 指向打包的 Kokoro 可执行文件：

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

有关打包服务器、模型缓存和独立命令语法，请参阅 [speech-core Windows CLI 参考](https://github.com/soniqo/speech-core/blob/main/docs/cli.md)
。

  </Tab>
</Tabs>

### 每个代理的语音覆盖

当某个代理应使用不同的提供商、声音、模型、角色设定或自动 TTS 模式时，使用 `agents.entries.*.tts`。代理块会对 `tts` 进行深度合并，因此提供商凭据可以保留在全局提供商配置中：

```json5
{
  tts: {
    auto: "always",
    provider: "elevenlabs",
    providers: {
      elevenlabs: { apiKey: "${ELEVENLABS_API_KEY}", model: "eleven_multilingual_v2" },
    },
  },
  agents: {
    entries: {
      reader: {
        default: true,
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

自动回复、`/tts audio`、`/tts status` 以及 `tts` 代理工具的优先级顺序为：

1. `tts`
2. 活跃的 `agents.entries.*.tts`
3. 当该频道支持 `channels.<channel>.tts` 时的频道覆盖
4. 当该频道传递 `channels.<channel>.accounts.<id>.tts` 时的账号覆盖
5. 此主机的本地 `/tts` 首选项
6. 在启用 [模型覆盖](#model-driven-directives) 时的内联 `[[tts:...]]` 指令

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

## 人设

**persona** 是一种稳定的口语身份，可在各个提供商之间以确定性方式应用。它可以偏好某个提供商，定义与提供商无关的提示意图，并携带用于声音、模型、提示模板、seed 和语音设置的提供商特定绑定。

### 最小 persona

```json5
{
  tts: {
    auto: "always",
    persona: "narrator",
    personas: {
      narrator: {
        label: "讲述者",
        provider: "elevenlabs",
        providers: {
          elevenlabs: {
            speakerVoiceId: "EXAVITQu4vr4xnSDxMaL",
            modelId: "eleven_multilingual_v2",
          },
        },
      },
    },
  },
}
```

### 完整 persona（提供商特定 shaping）

```json5
{
  tts: {
    auto: "always",
    persona: "alfred",
    personas: {
      alfred: {
        label: "阿尔弗雷德",
        description: "干练、温暖的英式管家式旁白。",
        provider: "google",
        fallbackPolicy: "preserve-persona",
        providers: {
          google: {
            model: "gemini-3.1-flash-tts-preview",
            speakerVoice: "Algieba",
            promptTemplate: "audio-profile-v1",
          },
          openai: { model: "gpt-4o-mini-tts", speakerVoice: "cedar" },
          elevenlabs: {
            speakerVoiceId: "voice_id",
            modelId: "eleven_multilingual_v2",
            seed: 42,
            voiceSettings: {
              stability: 0.65,
              similarityBoost: 0.8,
              style: 0.25,
              useSpeakerBoost: true,
              speed: 0.95,
            },
          },
        },
      },
    },
  },
}
```

### Persona 解析

活动 persona 按如下方式确定：

1. `/tts persona <id>` 本地偏好（如果已设置）。
2. `tts.persona`（如果已设置）。
3. 无 persona。

提供商选择按显式优先级运行：

1. 直接覆盖（CLI、gateway、Talk、允许的 TTS 指令）。
2. `/tts provider <id>` 本地偏好。
3. 活动 persona 的 `provider`。
4. `tts.provider`。
5. 注册表自动选择。

对于每次提供商尝试，OpenClaw 按以下顺序合并配置：

1. `tts.providers.<id>`
2. `tts.personas.<persona>.providers.<id>`
3. 受信任的请求覆盖
4. 允许的模型生成的 TTS 指令覆盖

### 自定义 persona shaping

提供商中立的 `personas.<id>.prompt.*` 配置已弃用。Doctor 会移除这些字段，并将其指向 speech-provider 接口。将内置提供商设置放在 `personas.<id>.providers.<provider>` 下（例如 Google 的 `personaPrompt` 或 OpenAI 的 `instructions`）。对于自定义 shaping，请实现一个 speech provider 插件，并在 `synthesize()` 运行前使用 `prepareSynthesis(ctx)` 返回调整后的文本、提供商配置或覆盖项。这样可以将富表达力的提示构造保留在提供商代码中，因为那里已知请求语义。

### 回退策略

`fallbackPolicy` 控制当某个 persona 对尝试的提供商**没有绑定**时的行为：

| 策略               | 行为                                                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `preserve-persona` | **默认。** 保留提供商无关提示字段；提供商可以使用它们，也可以忽略它们。                                                                        |
| `provider-defaults` | 在该次尝试中，persona 不会参与提示准备；提供商使用其中性默认值，同时继续回退到其他提供商。                                                     |
| `fail`             | 跳过该提供商尝试，并返回 `reasonCode: "not_configured"` 和 `personaBinding: "missing"`。仍会继续尝试回退提供商。                              |

只有当**每个**被尝试的提供商都被跳过或失败时，整个 TTS 请求才会失败。

Talk 会话提供商选择是会话范围内的。Talk 客户端应从 `talk.catalog` 中选择提供商 id、模型 id、语音 id 和语言区域，并通过 Talk 会话或 handoff 请求传递它们。打开语音会话不应修改 `tts` 或全局 Talk 提供商默认值。

## 模型驱动的指令

默认情况下，助手**可以**发出 `[[tts:...]]` 指令来为单条回复覆盖声音、模型或语速，并可选地使用
`[[tts:text]]...[[/tts:text]]` 块来加入仅应出现在音频中的表现性提示：

```text
给你。

[[tts:speakerVoiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]]（笑）再把这首歌读一遍。[[/tts:text]]
```

当 `tts.auto` 为 `"tagged"` 时，**需要使用指令**才能触发
音频。流式块传递会在通道看到可见文本之前移除其中的指令，即使这些指令被拆分在相邻的多个块中。

除非 `modelOverrides.allowProvider: true`，否则 `provider=...` 会被忽略。
当回复声明 `provider=...` 时，该指令中的其他键只会由该提供商解析；不支持的键会被剥离并作为 TTS 指令警告报告。

**可用的指令键：**

- `provider`（已注册的提供商 ID；需要 `allowProvider: true`）
- `speakerVoice` / `speakerVoiceId`（旧别名：`voice`、`voiceName`、`voice_name`、`google_voice`、`voiceId`）
- `model` / `google_model`
- `stability`、`similarityBoost`、`style`、`speed`、`useSpeakerBoost`
- `vol` / `volume`（MiniMax 音量，`(0, 10]`）
- `pitch`（MiniMax 整数音高，−12 到 12；小数值会被截断）
- `emotion`（Volcengine 情绪标签）
- `applyTextNormalization`（`auto|on|off`）
- `languageCode`（ISO 639-1）
- `seed`

**完全禁用模型覆盖：**

```json5
{ tts: { modelOverrides: { enabled: false } } }
```

**允许切换提供商，同时保持其他参数可配置：**

```json5
{ tts: { modelOverrides: { enabled: true, allowProvider: true, allowSeed: false } } }
```

## 斜杠命令

单个命令 `/tts`。在 Discord 上，OpenClaw 还会注册 `/voice`，因为 `/tts` 是内置的 Discord 命令——文本 `/tts ...` 仍然可用。

```text
/tts off | on | status
/tts chat on | off | default
/tts latest
/tts provider <id>
/tts persona <id> | off
/tts limit <chars>
/tts summary off
/tts audio <text>
```

<Note>
命令需要授权发送者（适用 allowlist/owner 规则），并且必须启用 `commands.text` 或原生命令注册。
</Note>

行为说明：

- `/tts on` 会将本地 TTS 偏好写为 `always`；`/tts off` 会将其写为 `off`。
- `/tts chat on|off|default` 会为当前聊天写入一个会话作用域的自动 TTS 覆盖设置。
- `/tts persona <id>` 会写入本地 persona 偏好；`/tts persona off` 会清除它。
- `/tts latest` 会从当前会话记录中读取最新的助手回复，并将其作为音频发送一次。它只会在会话条目上存储该回复的哈希值，以抑制重复的语音发送。
- `/tts audio` 会生成一次性的音频回复（**不会**切换 TTS 开关）。
- `/tts limit <chars>` 接受 **100–4096**（4096 是 Telegram 标题/消息最大长度）；超出该范围的值会被拒绝。
- `limit` 和 `summary` 存储在 **本地偏好** 中，而不是主配置中。
- `/tts status` 会包含最近一次尝试的回退诊断信息——`Fallback: <primary> -> <used>`、`Attempts: ...`，以及每次尝试的详细信息（`provider:outcome(reasonCode) latency`）。
- 当 TTS 启用时，`/status` 会显示当前 TTS 模式，以及已配置的 provider、model、voice 和已清理的自定义端点元数据。

## 每用户偏好

Slash 命令会将本地覆盖写入 TTS 偏好路径。默认值为
`~/.openclaw/settings/tts.json`；可使用 `OPENCLAW_TTS_PREFS` 进行覆盖。Doctor
会将已弃用的全局 `tts.prefsPath` 值迁移到共享机器状态中。
高级多代理设置在代理有意使用独立偏好存储时，仍然可以设置 `agents.entries.<id>.tts.prefsPath`。

| 存储字段 | 作用                                                                             |
| -------- | -------------------------------------------------------------------------------- |
| `auto`   | 本地 auto-TTS 覆盖（`always`、`off` 等）                                          |
| `provider` | 本地主提供方覆盖                                                                |
| `persona` | 本地 persona 覆盖                                                                |
| `maxLength` | 摘要/截断阈值（默认 `1500` 字符，`/tts limit` 范围 100–4096）                  |
| `summarize` | 摘要开关（默认 `true`）                                                         |

这些设置会覆盖该主机上来自 `tts` 以及当前激活的
`agents.entries.*.tts` 区块的有效配置。

## 输出格式

TTS 语音投递由通道能力驱动。通道插件会声明
语音风格的 TTS 是否应向提供方请求原生 `voice-note` 目标，还是
保持普通 `audio-file` 合成，以及通道在发送前是否会对非原生输出进行转码。

Telegram 还支持带字幕的最终 TTS。启用 `tts.mode: "final"` 并将
Auto-TTS 设置为 `always`（或符合条件的 `inbound` 模式）时，流式文本会一直保留
到合成完成，并作为语音笔记的字幕发送。超出 Telegram 字幕限制的文本会以普通文本消息的形式
跟随语音笔记发送。如果合成失败，或已确认的发送前投递步骤失败，OpenClaw 会改为发送可见文本。
`tagged` 模式保持其正常的流式行为，而 `[[tts:text]]` 块中的文本仍然仅作为音频发送。

合成后，OpenClaw 会将批量 TTS 输出持久化到媒体存储中的
`tool-speech-synthesis` 下。回复使用该稳定的媒体路径，而不是提供方的临时文件，并且常规媒体维护会清理过期输出。
本地 CLI 提供方仍可能在 OpenClaw 导入已完成的字节数据之前，将 `{{OutputPath}}` 用作临时空间。参见[媒体播放](/nodes/media-playback)，了解内联播放器格式和限制。

| 目标                                | 格式                                                                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 飞书 / Matrix / Telegram / WhatsApp   | 语音笔记回复优先使用 **Opus**（ElevenLabs 使用 `opus_48000_64`，OpenAI 使用 `opus`）。48 kHz / 64 kbps 在清晰度和体积之间取得平衡。 |
| 其他通道                              | **MP3**（ElevenLabs 使用 `mp3_44100_128`，OpenAI 使用 `mp3`）。44.1 kHz / 128 kbps 是语音的默认平衡。                               |
| Talk / 电话系统                      | 提供方原生 **PCM**（Inworld 22050 Hz，Google 24 kHz），或用于电话系统的 Gradium `ulaw_8000`。                                         |

按提供方说明：

- **飞书 / WhatsApp 转码：**当语音笔记回复最终以 MP3/WebM/WAV/M4A 或其他类似音频文件形式返回时，通道插件会在发送原生语音消息前，使用 `ffmpeg`（`libopus`，64 kbps）将其转码为 48 kHz Ogg/Opus。WhatsApp 会通过 Baileys 的 `audio` 负载发送结果，并设置 `ptt: true` 和 `audio/ogg; codecs=opus`。转码失败时：飞书会捕获错误并回退为将原始文件作为普通附件发送；WhatsApp 没有回退机制，因此发送本身会失败，而不是发布一个不兼容的 PTT 负载。
- **MiniMax：**普通音频附件使用 MP3（`speech-2.8-hd` 模型，32 kHz 采样率）；对于通道声明的语音笔记目标，会使用 `ffmpeg` 转码为 48 kHz Opus。
- **小米 MiMo：**默认使用 MP3，或在配置时使用 WAV；对于通道声明的语音笔记目标，会使用 `ffmpeg` 转码为 48 kHz Opus。
- **本地 CLI：**使用配置的 `outputFormat`。语音笔记目标会转换为 Ogg/Opus，电话系统输出会使用 `ffmpeg` 转换为原始 16 kHz 单声道 PCM。
- **Google Gemini：**返回原始 24 kHz PCM。OpenClaw 会将其包装为用于音频附件的 WAV，为语音笔记目标转码为 48 kHz Opus，并在 Talk/电话系统中直接返回 PCM。
- **Gradium：**音频附件使用 WAV，语音笔记目标使用 Opus，电话系统使用 8 kHz 的 `ulaw_8000`。
- **Inworld：**普通音频附件使用 MP3，语音笔记目标使用原生 `OGG_OPUS`，Talk/电话系统使用 22050 Hz 的原始 `PCM`。
- **xAI：**默认使用 MP3；音频文件合成可对缓冲和流式输出使用 `mp3`、`wav`、`pcm`、`mulaw` 或 `alaw`。语音笔记目标对流式和缓冲回退都使用 MP3，因为 xAI 的 `pcm`、`mulaw` 和 `alaw` 输出是无头的原始音频。缓冲合成使用 xAI 的批量 REST `/v1/tts` 端点；`textToSpeechStream` 使用原生 `wss://api.x.ai/v1/tts`。这不是实时语音契约。不支持原生 Opus 语音笔记格式。
- **Microsoft：**使用 `microsoft.outputFormat`（默认 `audio-24khz-48kbitrate-mono-mp3`）。
  - 绑定的传输层接受 `outputFormat`，但并非所有格式都能从服务端获取。
  - 输出格式值遵循 Microsoft Speech 输出格式（包括 Ogg/WebM Opus）。
  - Telegram `sendVoice` 接受 OGG/MP3/M4A；如果你需要保证获得 Opus 语音消息，请使用 OpenAI/ElevenLabs。
  - 如果配置的 Microsoft 输出格式失败，OpenClaw 会重试 MP3。
  - 当没有设置显式的语音覆盖且使用默认英文语音时，如果回复文本以 CJK 为主，OpenClaw 会自动切换为中文神经语音（`zh-CN-XiaoxiaoNeural`，`zh-CN` 区域设置）。

OpenAI 和 ElevenLabs 会按上表为各通道选择输出格式。显式的 OpenAI `responseFormat` 会覆盖该选择；不兼容语音笔记的格式可能会作为音频文件发送，或者由支持转换的通道进行转码。

## Auto-TTS 行为

当启用 `tts.auto` 时，OpenClaw：

- 如果回复已经包含结构化媒体，则跳过 TTS。
- 跳过非常简短的回复（少于 10 个字符）。
- 启用摘要时，使用 `summaryModel`（或 `agents.defaults.model.primary`）对较长的回复进行摘要。
- 将生成的音频附加到回复中。
- 在 `mode: "final"` 下，流式文本完成后发送 TTS。没有带字幕最终消息支持的频道会收到一个仅包含音频的补充消息；Telegram 会将不超过其字幕限制的文本放入语音消息的字幕中，并将超出部分作为后续文本发送。生成的媒体会经过与普通回复附件相同的频道媒体规范化处理。

如果回复超过 `maxLength`，OpenClaw 绝不会直接跳过音频：

- **开启摘要**（默认）且有可用的摘要模型：将文本摘要到大约 `maxLength` 个字符，然后合成该摘要。
- **关闭摘要**、摘要失败，或摘要模型没有可用的 API key：将文本截断为 `maxLength` 个字符，并合成截断后的文本。

```text
回复 -> 启用 TTS？
  否  -> 发送文本
  是  -> 有媒体 / 很短？
          是  -> 发送文本
          否  -> 长度 > 限制？
                   否  -> TTS -> 附加音频
                   是  -> 已启用且可用摘要？
                            否  -> 截断 -> TTS -> 附加音频
                            是  -> 摘要 -> TTS -> 附加音频
```

## 字段参考

<AccordionGroup>
  <Accordion title="顶层 tts.*">
    <ParamField path="auto" type='"off" | "always" | "inbound" | "tagged"'>
      自动 TTS 模式。`inbound` 仅在收到传入语音消息后发送音频；`tagged` 仅在回复包含 `[[tts:...]]` 指令或 `[[tts:text]]` 区块时发送音频。
    </ParamField>
    <ParamField path="enabled" type="boolean" deprecated>
      旧版开关。`openclaw doctor --fix` 会将其迁移为 `auto`。
    </ParamField>
    <ParamField path="mode" type='"final" | "all"' default="final">
      `"all"` 除最终回复外，还包括 tool/block 回复。
    </ParamField>
    <ParamField path="provider" type="string">
      语音提供方 id。未设置时，OpenClaw 会使用注册表自动选择顺序中的第一个已配置提供方。旧的 `provider: "edge"` 会被 `openclaw doctor --fix` 重写为 `"microsoft"`。
    </ParamField>
    <ParamField path="persona" type="string">
      来自 `personas` 的当前角色 id。会规范化为小写。
    </ParamField>
    <ParamField path="personas.<id>" type="object">
      稳定的口语身份。字段：`label`、`description`、`provider`、`fallbackPolicy`、`prompt`、`providers.<provider>`。见 [角色](#personas)。
    </ParamField>
    <ParamField path="summaryModel" type="string">
      用于自动摘要的便宜模型；默认值为 `agents.defaults.model.primary`。接受 `provider/model` 或已配置的模型别名。
    </ParamField>
    <ParamField path="modelOverrides" type="object">
      允许模型发出 TTS 指令。`enabled` 默认值为 `true`；`allowProvider` 默认值为 `false`。
    </ParamField>
    <ParamField path="providers.<id>" type="object">
      由语音提供方 id 键控的、提供方所有的设置。旧的直接块（`tts.openai`、`.elevenlabs`、`.microsoft`、`.edge`）会被 `openclaw doctor --fix` 重写；请只提交 `tts.providers.<id>`。
    </ParamField>
    <ParamField path="maxTextLength" type="number" default="4096">
      TTS 输入字符的硬性上限。超过时 `/tts audio`、`tts.convert` 和 `tts.speak` 会失败。
    </ParamField>
    <ParamField path="timeoutMs" type="number" default="30000">
      请求超时时间，单位毫秒。若设置了单次调用的 `timeoutMs`（agent tool、gateway），则以它为准；否则，显式配置的 `tts.timeoutMs` 会优先于任何插件作者提供的默认值。
    </ParamField>
  </Accordion>

  提供方 `apiKey` 字段可以是原始字符串或 SecretRef。在冷启动的 Gateway
  启动过程中，若某个不可用的 TTS SecretRef 命中内置 TTS 能力，
  则该能力会被标记为配置不可用，而不会停止 Gateway。此时 `tts.speak`
  会返回 `UNAVAILABLE`，原因是 `SECRET_SURFACE_UNAVAILABLE`，并且不会发送任何
  提供方请求。状态和 doctor 会列出降级的 TTS 所有者及其配置路径。显式
  引用会保留在运行时快照中，因此环境变量或配置文件中的凭据不会在无提示的情况下
  选择其他账户。重载和配置写入预检会应用基于所有者的降级策略：
  未改变且仍符合条件的 TTS 所有者可以保留其最后已知可用凭据作为过期状态，
  而新的或已更改的失败会变为冷态，但不会阻塞健康的所有者。结构无效的引用
  和已解析值仍然会导致启动失败或拒绝更新。

  <Accordion title="Azure Speech">
    <ParamField path="apiKey" type="string">环境变量：`AZURE_SPEECH_KEY`、`AZURE_SPEECH_API_KEY` 或 `SPEECH_KEY`。</ParamField>
    <ParamField path="region" type="string">Azure Speech 区域（例如 `eastus`）。环境变量：`AZURE_SPEECH_REGION` 或 `SPEECH_REGION`。</ParamField>
    <ParamField path="endpoint" type="string">可选的 Azure Speech 端点覆盖（别名 `baseUrl`）。</ParamField>
    <ParamField path="speakerVoice" type="string">Azure 语音 ShortName。默认 `en-US-JennyNeural`。旧别名：`voice`。</ParamField>
    <ParamField path="lang" type="string">SSML 语言代码。默认 `en-US`。</ParamField>
    <ParamField path="outputFormat" type="string">用于标准音频的 Azure `X-Microsoft-OutputFormat`。默认 `audio-24khz-48kbitrate-mono-mp3`。</ParamField>
    <ParamField path="voiceNoteOutputFormat" type="string">用于语音备注输出的 Azure `X-Microsoft-OutputFormat`。默认 `ogg-24khz-16bit-mono-opus`。</ParamField>
  </Accordion>

  <Accordion title="ElevenLabs">
    <ParamField path="apiKey" type="string">回退到 `ELEVENLABS_API_KEY` 或 `XI_API_KEY`。</ParamField>
    <ParamField path="model" type="string">模型 id。默认 `eleven_multilingual_v2`。旧 id `eleven_turbo_v2_5`/`eleven_turbo_v2` 会被规范化为匹配的 `flash` 模型。</ParamField>
    <ParamField path="speakerVoiceId" type="string">ElevenLabs 语音 id。默认 `pMsXgVXv3BLzUgSXRplE`。旧别名：`voiceId`。</ParamField>
    <ParamField path="voiceSettings" type="object">
      `stability`、`similarityBoost`、`style`（均为 `0..1`，默认分别为 `0.5`/`0.75`/`0`）、`useSpeakerBoost`（`true|false`，默认 `true`）、`speed`（`0.5..2.0`，默认 `1.0`）。
    </ParamField>
    <ParamField path="applyTextNormalization" type='"auto" | "on" | "off"'>文本规范化模式。</ParamField>
    <ParamField path="languageCode" type="string">2 位 ISO 639-1 代码（例如 `en`、`de`）。</ParamField>
    <ParamField path="seed" type="number">整数 `0..4294967295`，用于尽力而为的确定性。</ParamField>
    <ParamField path="baseUrl" type="string">覆盖 ElevenLabs API 基础 URL。</ParamField>
  </Accordion>

  <Accordion title="Google Gemini">
    <ParamField path="apiKey" type="string">回退到 `GEMINI_API_KEY` / `GOOGLE_API_KEY`。如果省略，在环境变量回退前，TTS 可以复用 `models.providers.google.apiKey`。</ParamField>
    <ParamField path="model" type="string">Gemini TTS 模型。默认 `gemini-3.1-flash-tts-preview`。</ParamField>
    <ParamField path="speakerVoice" type="string">Gemini 预设语音名称。默认 `Kore`。旧别名：`voiceName`、`voice`。</ParamField>
    <ParamField path="audioProfile" type="string">在口语文本前添加的自然语言风格提示。</ParamField>
    <ParamField path="speakerName" type="string">当你的提示使用了命名说话人时，可选地在口语文本前添加的说话人标签。</ParamField>
    <ParamField path="promptTemplate" type='"audio-profile-v1"'>设置为 `audio-profile-v1`，可将当前角色提示字段包装进确定性的 Gemini TTS 提示结构中。</ParamField>
    <ParamField path="personaPrompt" type="string">追加到模板“导演备注”的 Google 专用额外角色提示文本。</ParamField>
    <ParamField path="baseUrl" type="string">仅接受 `https://generativelanguage.googleapis.com`。</ParamField>
  </Accordion>

  <Accordion title="Gradium">
    <ParamField path="apiKey" type="string">环境变量：`GRADIUM_API_KEY`。</ParamField>
    <ParamField path="baseUrl" type="string">`api.gradium.ai` 上的 HTTPS Gradium API URL。默认 `https://api.gradium.ai`。</ParamField>
    <ParamField path="speakerVoiceId" type="string">默认 Emma（`YTpq7expH9539ERJ`）。旧别名：`voiceId`。</ParamField>
  </Accordion>

  <Accordion title="Inworld">
    ### Inworld 主配置

    <ParamField path="apiKey" type="string">环境变量：`INWORLD_API_KEY`。</ParamField>
    <ParamField path="baseUrl" type="string">默认 `https://api.inworld.ai`。</ParamField>
    <ParamField path="modelId" type="string">默认 `inworld-tts-1.5-max`。另有：`inworld-tts-1.5-mini`、`inworld-tts-1-max`、`inworld-tts-1`。</ParamField>
    <ParamField path="speakerVoiceId" type="string">默认 `Sarah`。旧别名：`voiceId`。</ParamField>
    <ParamField path="temperature" type="number">采样温度 `0..2`（不含 0）。</ParamField>

  </Accordion>

  <Accordion title="本地 CLI（tts-local-cli）">
    <ParamField path="command" type="string">用于 CLI TTS 的本地可执行文件或命令字符串。</ParamField>
    <ParamField path="args" type="string[]">命令参数。支持 `{{Text}}`、`{{OutputPath}}`、`{{OutputDir}}`、`{{OutputBase}}` 占位符。</ParamField>
    <ParamField path="outputFormat" type='"mp3" | "opus" | "wav"'>预期的 CLI 输出格式。音频附件默认 `mp3`。</ParamField>
    <ParamField path="timeoutMs" type="number">命令超时时间，单位毫秒。默认 `120000`。</ParamField>
    <ParamField path="cwd" type="string">可选的命令工作目录。</ParamField>
    <ParamField path="env" type="Record<string, string>">可选的命令环境变量覆盖。</ParamField>

    命令标准输出以及生成或转换后的音频限制为 50 MiB。诊断标准错误限制为 1 MiB。若任一限制被超过，OpenClaw 会终止命令并使合成失败。

  </Accordion>

  <Accordion title="Microsoft（无 API key）">
    <ParamField path="enabled" type="boolean" default="true">允许使用 Microsoft 语音。</ParamField>
    <ParamField path="speakerVoice" type="string">Microsoft 神经语音名称（例如 `en-US-MichelleNeural`）。旧别名：`voice`。如果默认英文语音生效且回复文本以 CJK 为主，OpenClaw 会自动切换到 `zh-CN-XiaoxiaoNeural`。</ParamField>
    <ParamField path="lang" type="string">语言代码（例如 `en-US`）。</ParamField>
    <ParamField path="outputFormat" type="string">Microsoft 输出格式。默认 `audio-24khz-48kbitrate-mono-mp3`。并非所有格式都受内置的 Edge 后端传输支持。</ParamField>
    <ParamField path="rate / pitch / volume" type="string">百分比字符串（例如 `+10%`、`-5%`）。</ParamField>
    <ParamField path="saveSubtitles" type="boolean">在音频文件旁写入 JSON 字幕。</ParamField>
    <ParamField path="proxy" type="string">Microsoft 语音请求的代理 URL。</ParamField>
    <ParamField path="timeoutMs" type="number">请求超时覆盖（毫秒）。</ParamField>
    <ParamField path="edge.*" type="object" deprecated>旧别名。运行 `openclaw doctor --fix` 可将持久化配置重写为 `providers.microsoft`。</ParamField>
  </Accordion>

  <Accordion title="MiniMax">
    <ParamField path="apiKey" type="string">回退到 `MINIMAX_API_KEY`。Token Plan 认证可通过 `MINIMAX_OAUTH_TOKEN`、`MINIMAX_CODE_PLAN_KEY` 或 `MINIMAX_CODING_API_KEY`。</ParamField>
    <ParamField path="baseUrl" type="string">默认 `https://api.minimax.io`。环境变量：`MINIMAX_API_HOST`。</ParamField>
    <ParamField path="model" type="string">默认 `speech-2.8-hd`。环境变量：`MINIMAX_TTS_MODEL`。</ParamField>
    <ParamField path="speakerVoiceId" type="string">默认 `English_expressive_narrator`。环境变量：`MINIMAX_TTS_VOICE_ID`。旧别名：`voiceId`。</ParamField>
    <ParamField path="speed" type="number">`0.5..2.0`。默认 `1.0`。</ParamField>
    <ParamField path="vol" type="number">`(0, 10]`。默认 `1.0`。</ParamField>
    <ParamField path="pitch" type="number">整数 `-12..12`。默认 `0`。小数值会在请求前被截断。</ParamField>
  </Accordion>

  <Accordion title="OpenAI">
    <ParamField path="apiKey" type="string">回退到 `OPENAI_API_KEY`。</ParamField>
    <ParamField path="model" type="string">OpenAI TTS 模型 id。默认 `gpt-4o-mini-tts`。</ParamField>
    <ParamField path="speakerVoice" type="string">语音名称（例如 `alloy`、`cedar`）。默认 `coral`。旧别名：`voice`。</ParamField>
    <ParamField path="instructions" type="string">显式的 OpenAI `instructions` 字段。设置后，不会自动映射角色提示字段。</ParamField>
    <ParamField path="responseFormat" type='"mp3" | "opus" | "wav"'>显式响应格式。未指定时，OpenClaw 会为语音备注目标选择 Opus，否则选择 MP3。对于不对压缩音频进行编码的兼容本地端点，请使用 `wav`。</ParamField>
    <ParamField path="extraBody / extra_body" type="Record<string, unknown>">在生成的 OpenAI TTS 字段之后，合并进 `/audio/speech` 请求体的额外 JSON 字段。可用于需要提供方特定键（如 `lang`）的 OpenAI 兼容端点，例如 Kokoro；不安全的原型键会被忽略。</ParamField>
    <ParamField path="baseUrl" type="string">
      覆盖 OpenAI TTS 端点。解析顺序：配置 → `OPENAI_TTS_BASE_URL` → `https://api.openai.com/v1`。非默认值会被视为 OpenAI 兼容的 TTS 端点，因此接受自定义模型名和语音名，并且 `speed` 将失去其 `0.25..4.0` 范围检查。
    </ParamField>
  </Accordion>

  <Accordion title="OpenRouter">
    <ParamField path="apiKey" type="string">环境变量：`OPENROUTER_API_KEY`。可复用 `models.providers.openrouter.apiKey`。</ParamField>
    <ParamField path="baseUrl" type="string">默认 `https://openrouter.ai/api/v1`。旧版 `https://openrouter.ai/v1` 会被规范化。</ParamField>
    <ParamField path="model" type="string">默认 `hexgrad/kokoro-82m`。别名：`modelId`。</ParamField>
    <ParamField path="speakerVoice" type="string">默认 `af_alloy`。旧别名：`voice`、`voiceId`。</ParamField>
    <ParamField path="responseFormat" type='"mp3" | "pcm"'>默认 `mp3`。</ParamField>
    <ParamField path="speed" type="number">提供方原生速度覆盖。</ParamField>
  </Accordion>

  <Accordion title="Volcengine（字节跳动 Seed Speech）">
    <ParamField path="apiKey" type="string">环境变量：`VOLCENGINE_TTS_API_KEY` 或 `BYTEPLUS_SEED_SPEECH_API_KEY`。</ParamField>
    <ParamField path="resourceId" type="string">默认 `seed-tts-1.0`。环境变量：`VOLCENGINE_TTS_RESOURCE_ID`。当你的项目具有 TTS 2.0 权限时使用 `seed-tts-2.0`。</ParamField>
    <ParamField path="appKey" type="string">App key 请求头。默认 `aGjiRDfUWi`。环境变量：`VOLCENGINE_TTS_APP_KEY`。</ParamField>
    <ParamField path="baseUrl" type="string">覆盖 Seed Speech TTS HTTP 端点。环境变量：`VOLCENGINE_TTS_BASE_URL`。</ParamField>
    <ParamField path="speakerVoice" type="string">语音类型。默认 `en_female_anna_mars_bigtts`。环境变量：`VOLCENGINE_TTS_VOICE`。旧别名：`voice`。</ParamField>
    <ParamField path="speedRatio" type="number">提供方原生速度比率，`0.2..3`。</ParamField>
    <ParamField path="emotion" type="string">提供方原生情感标签。</ParamField>
    <ParamField path="appId / token / cluster" type="string" deprecated>旧版 Volcengine Speech Console 字段。环境变量：`VOLCENGINE_TTS_APPID`、`VOLCENGINE_TTS_TOKEN`、`VOLCENGINE_TTS_CLUSTER`（默认 `volcano_tts`）。</ParamField>
  </Accordion>

  <Accordion title="xAI">
    <ParamField path="apiKey" type="string">环境变量：`XAI_API_KEY`。</ParamField>
    <ParamField path="baseUrl" type="string">默认 `https://api.x.ai/v1`。环境变量：`XAI_BASE_URL`。</ParamField>
    <ParamField path="speakerVoiceId" type="string">默认 `eve`。启用认证后，`openclaw infer tts voices --provider xai` 会获取当前内置目录；未认证时会列出离线回退 `ara`、`eve`、`leo`、`rex` 和 `sal`。即使账户自定义语音 ID 不在内置列表中，也会继续转发。旧别名：`voiceId`。</ParamField>
    <ParamField path="language" type="string">BCP-47 语言代码或 `auto`。默认 `en`。</ParamField>
    <ParamField path="responseFormat" type='"mp3" | "wav" | "pcm" | "mulaw" | "alaw"'>默认 `mp3`。</ParamField>
    <ParamField path="speed" type="number">提供方原生速度覆盖，`0.7..1.5`。</ParamField>
  </Accordion>

  <Accordion title="小米 MiMo">
    <ParamField path="apiKey" type="string">环境变量：`XIAOMI_API_KEY`。</ParamField>
    <ParamField path="baseUrl" type="string">默认 `https://api.xiaomimimo.com/v1`。环境变量：`XIAOMI_BASE_URL`。</ParamField>
    <ParamField path="model" type="string">默认 `mimo-v2.5-tts`。环境变量：`XIAOMI_TTS_MODEL`。也支持 `mimo-v2.5-tts-voicedesign`。</ParamField>
    <ParamField path="speakerVoice" type="string">对于预设语音模型，默认 `mimo_default`。环境变量：`XIAOMI_TTS_VOICE`。旧别名：`voice`。对于 `mimo-v2.5-tts-voicedesign` 不会发送该字段。</ParamField>
    <ParamField path="format" type='"mp3" | "wav"'>默认 `mp3`。环境变量：`XIAOMI_TTS_FORMAT`。</ParamField>
    <ParamField path="style" type="string">可选的自然语言风格指令，作为用户消息发送；不会被读出来。对于 `mimo-v2.5-tts-voicedesign`，这是语音设计提示；OpenClaw 在省略时会提供默认值。</ParamField>
  </Accordion>
</AccordionGroup>

## Agent 工具

`tts` 工具将文本转换为语音，并返回一个音频附件用于回复传递。在飞书、Matrix、Telegram 和 WhatsApp 上，音频会以语音消息而不是文件附件的形式发送。飞书和 WhatsApp 可以在 `ffmpeg` 可用时，将非 Opus 的 TTS 输出在此路径上转码。

WhatsApp 通过 Baileys 将音频作为 PTT 语音备注发送（`audio` 且 `ptt: true`），并且会**单独**发送可见文本，而不是与 PTT 音频一起发送，因为客户端对语音备注上的字幕渲染并不稳定。

该工具接受可选的 `channel` 和 `timeoutMs` 字段；`timeoutMs` 是每次调用的提供方请求超时时间，单位为毫秒。每次调用的值会覆盖 `tts.timeoutMs`；已配置的 TTS 超时会覆盖任何插件编写的提供方默认值。

## 网关 RPC

| 方法              | 用途                                      |
| ----------------- | ----------------------------------------- |
| `tts.status`      | 读取当前 TTS 状态和上次尝试。     |
| `tts.enable`      | 将本地自动偏好设置为 `always`。       |
| `tts.disable`     | 将本地自动偏好设置为 `off`。          |
| `tts.convert`     | 一次性文本 → 音频。                        |
| `tts.setProvider` | 设置本地提供商偏好。               |
| `tts.personas`    | 列出已配置的人设和当前激活的人设。 |
| `tts.setPersona`  | 设置本地人设偏好。                |
| `tts.providers`   | 列出已配置的提供商及其状态。        |

## 服务链接

- [Azure Speech 提供商](/providers/azure-speech)
- [Azure Speech REST 文本转语音](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech)
- [ElevenLabs 身份验证](https://elevenlabs.io/docs/api-reference/authentication)
- [ElevenLabs 文本转语音](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [Gradium](/providers/gradium)
- [Inworld TTS API](https://docs.inworld.ai/tts/tts)
- [Microsoft Speech 输出格式](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)
- [MiniMax T2A v2 API](https://platform.minimaxi.com/document/T2A%20V2)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [OpenAI 音频 API 参考](https://platform.openai.com/docs/api-reference/audio)
- [OpenAI 文本转语音指南](https://platform.openai.com/docs/guides/text-to-speech)
- [speech-core](https://github.com/soniqo/speech-core)
- [Speech Swift](https://github.com/soniqo/speech-swift)
- [火山引擎 TTS HTTP API](/providers/volcengine#text-to-speech)
- [xAI 文本转语音](https://docs.x.ai/developers/rest-api-reference/inference/voice#text-to-speech-rest)
- [小米 MiMo 语音合成](/providers/xiaomi#text-to-speech)。

## 相关内容

- [媒体概览](/tools/media-overview)
- [媒体播放](/nodes/media-playback)
- [音乐生成](/tools/music-generation)
- [视频生成](/tools/video-generation)
- [斜杠命令](/tools/slash-commands)
- [语音通话插件](/plugins/voice-call)。
