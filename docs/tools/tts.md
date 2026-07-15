---
summary: "用于出站回复的文本转语音——提供商、角色、斜杠命令以及按频道输出"
read_when:
  - 为回复启用文本转语音
  - 配置 TTS 提供商、回退链或角色
  - 使用 /tts 命令或指令
title: "文本转语音"
sidebarTitle: "文本转语音（TTS）"
---

OpenClaw converts outbound replies into audio across **14 speech providers**:
native voice messages on Feishu, Matrix, Telegram, and WhatsApp; audio
attachments everywhere else; and PCM/Ulaw streams for telephony and Talk.

TTS is the speech-output half of Talk's `stt-tts` mode (`talk.speak` calls this
same synthesis path). Provider-native `realtime` Talk sessions synthesize
speech inside the realtime provider instead; `transcription` sessions never
synthesize an assistant voice reply.

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
    设置 `messages.tts.auto: "always"` 和 `messages.tts.provider`：

    ```json5
    {
      messages: {
        tts: {
          auto: "always",
          provider: "elevenlabs",
        },
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
自动 TTS 默认**关闭**。当 `messages.tts.provider` 未设置时，OpenClaw 会按注册表自动选择顺序选择第一个已配置的提供商。
内置的 `tts` 代理工具仅在明确意图时才会触发：普通聊天保持文本输出，除非用户要求音频、使用 `/tts`，或启用自动 TTS/指令式
语音。
</Note>

## 支持的提供商

| 提供商            | 认证                                                                                                             | 说明                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Azure Speech**  | `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` (also `AZURE_SPEECH_API_KEY`, `SPEECH_KEY`, `SPEECH_REGION`)          | 原生 Ogg/Opus 语音消息输出和电话功能。                                                      |
| **DeepInfra**     | `DEEPINFRA_API_KEY`                                                                                              | 兼容 OpenAI 的 TTS。默认为 `hexgrad/Kokoro-82M`。                                           |
| **ElevenLabs**    | `ELEVENLABS_API_KEY` or `XI_API_KEY`                                                                             | 声音克隆、多语言、可通过 `seed` 确定性复现；用于 Discord 语音播放时流式传输。              |
| **Google Gemini** | `GEMINI_API_KEY` or `GOOGLE_API_KEY`                                                                             | Gemini API 批量 TTS；通过 `promptTemplate: "audio-profile-v1"` 感知角色。                 |
| **Gradium**       | `GRADIUM_API_KEY`                                                                                                | 语音消息和电话输出。                                                                        |
| **Inworld**       | `INWORLD_API_KEY`                                                                                                | 流式 TTS API。原生 Opus 语音消息和 PCM 电话功能。                                           |
| **Local CLI**     | none                                                                                                             | 运行一个已配置的本地 TTS 命令。                                                              |
| **Microsoft**     | none                                                                                                             | 通过 `node-edge-tts` 使用 Microsoft Edge 的公开神经 TTS。尽力而为，无 SLA。               |
| **MiniMax**       | `MINIMAX_API_KEY` (or Token Plan: `MINIMAX_OAUTH_TOKEN`, `MINIMAX_CODE_PLAN_KEY`, `MINIMAX_CODING_API_KEY`)      | T2A v2 API。默认为 `speech-2.8-hd`。                                                        |
| **OpenAI**        | `OPENAI_API_KEY`                                                                                                 | 也用于自动摘要；支持角色 `instructions`。                                                   |
| **OpenRouter**    | `OPENROUTER_API_KEY` (can reuse `models.providers.openrouter.apiKey`)                                            | 默认模型 `hexgrad/kokoro-82m`。                                                             |
| **Volcengine**    | `VOLCENGINE_TTS_API_KEY` or `BYTEPLUS_SEED_SPEECH_API_KEY` (legacy AppID/token: `VOLCENGINE_TTS_APPID`/`_TOKEN`) | BytePlus Seed Speech HTTP API。                                                             |
| **Vydra**         | `VYDRA_API_KEY`                                                                                                  | 共享的图像、视频和语音提供商。                                                              |
| **xAI**           | `XAI_API_KEY`                                                                                                    | xAI 批量 TTS。不支持原生 Opus 语音消息。                                                     |
| **Xiaomi MiMo**   | `XIAOMI_API_KEY`                                                                                                 | 通过小米聊天补全实现 MiMo TTS。                                                            |

如果配置了多个提供商，将首先使用当前选中的那个，其余作为回退选项。自动摘要使用 `summaryModel`（或
`agents.defaults.model.primary`），因此如果你保持摘要功能开启，该提供商也必须已完成认证。

<Warning>
捆绑的 **Microsoft** 提供商通过 `node-edge-tts` 使用 Microsoft Edge 的在线神经 TTS
服务。这是一个公开的 Web 服务，没有公布的 SLA 或配额——请将其视为尽力而为。旧的提供商 id `edge` 会被
规范化为 `microsoft`，并且 `openclaw doctor --fix` 会重写持久化的
配置；新配置应始终使用 `microsoft`。
</Warning>

## 配置

TTS config lives under `messages.tts` in `~/.openclaw/openclaw.json`. Pick a
preset and adapt the provider block. The `speakerVoice`/`speakerVoiceId`
fields shown below are canonical; each provider's own `voice`/`voiceId`/
`voiceName` field names still work as legacy aliases.

<Tabs>
  <Tab title="Azure Speech">
```json5
{
  messages: {
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
  },
}
```
  </Tab>
  <Tab title="ElevenLabs">
```json5
{
  messages: {
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
  },
}
```
  </Tab>
  <Tab title="Google Gemini">
```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "google",
      providers: {
        google: {
          apiKey: "${GEMINI_API_KEY}",
          model: "gemini-3.1-flash-tts-preview",
          speakerVoice: "Kore",
          // 可选的自然语言风格提示：
          // audioProfile: "以平静、播客主持人般的语气说话。",
          // speakerName: "Alex",
        },
      },
    },
  },
}
```
  </Tab>
  <Tab title="Gradium">
```json5
{
  messages: {
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
  },
}
```
  </Tab>
  <Tab title="Inworld">
```json5
{
  messages: {
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
  },
}
```
  </Tab>
  <Tab title="Local CLI">
```json5
{
  messages: {
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
  },
}
```
  </Tab>
  <Tab title="Microsoft（无需密钥）">
```json5
{
  messages: {
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
  },
}
```
  </Tab>
  <Tab title="MiniMax">
```json5
{
  messages: {
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
  },
}
```
  </Tab>
  <Tab title="OpenAI + ElevenLabs">
```json5
{
  messages: {
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
  },
}
```
  </Tab>
  <Tab title="OpenRouter">
```json5
{
  messages: {
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
  },
}
```
  </Tab>
  <Tab title="Volcengine">
```json5
{
  messages: {
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
  },
}
```
  </Tab>
  <Tab title="xAI">
```json5
{
  messages: {
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
  },
}
```
  </Tab>
  <Tab title="Xiaomi MiMo">
```json5
{
  messages: {
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
  },
}
```
  </Tab>
</Tabs>

For Xiaomi `mimo-v2.5-tts-voicedesign`, omit `speakerVoice` and set `style` to
the voice-design prompt. OpenClaw sends that prompt as the TTS `user` message
and does not send `audio.voice` for the voicedesign model.

### Per-agent voice overrides

当某个代理应使用不同的提供商、语音、模型、角色或自动 TTS 模式时，使用 `agents.list[].tts`。代理块会在 `messages.tts`
之上进行深度合并，因此提供商凭据可以保留在全局提供商配置中：

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "elevenlabs",
      providers: {
        elevenlabs: { apiKey: "${ELEVENLABS_API_KEY}", model: "eleven_multilingual_v2" },
      },
    },
  },
  agents: {
    list: [
      {
        id: "reader",
        tts: {
          providers: {
            elevenlabs: { speakerVoiceId: "EXAVITQu4vr4xnSDxMaL" },
          },
        },
      },
    ],
  },
}
```

若要为某个代理固定角色，请在提供商配置旁设置 `agents.list[].tts.persona`——它只会覆盖该代理的全局 `messages.tts.persona`。

自动回复、`/tts audio`、`/tts status` 以及 `tts` 代理工具的优先级顺序为：

1. `messages.tts`
2. 当前激活的 `agents.list[].tts`
3. 频道覆盖，当频道支持 `channels.<channel>.tts` 时
4. 账号覆盖，当频道传入 `channels.<channel>.accounts.<id>.tts` 时
5. 本地机器上的 `/tts` 本地偏好设置
6. 启用 [模型驱动指令](#model-driven-directives) 时的内联 `[[tts:...]]` 指令

Channel and account overrides use the same shape as `messages.tts` and
deep-merge over the earlier layers, so shared provider credentials can stay in
`messages.tts` while a channel or bot account changes only speaker voice, model, persona,
or auto mode:

```json5
{
  messages: {
    tts: {
      provider: "openai",
      providers: {
        openai: { apiKey: "${OPENAI_API_KEY}", model: "gpt-4o-mini-tts" },
      },
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
  messages: {
    tts: {
      auto: "always",
      persona: "narrator",
      personas: {
        narrator: {
          label: "旁白",
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
  },
}
```

### 完整 persona（提供商无关提示）

```json5
{
  messages: {
    tts: {
      auto: "always",
      persona: "alfred",
      personas: {
        alfred: {
          label: "Alfred",
          description: "一位干练、温暖的英式管家叙述者。",
          provider: "google",
          fallbackPolicy: "preserve-persona",
          prompt: {
            profile: "一位出色的英国管家。干练、机智、温暖、迷人、情感表达丰富，绝不千篇一律。",
            scene: "安静的深夜书房。为一位可信赖的操作员进行近距离麦克风叙述。",
            sampleContext: "说话者正在以简洁的自信和干爽的温暖回应一项私人的技术请求。",
            style: "优雅、克制、略带轻松的幽默感。",
            accent: "英式英语。",
            pacing: "节奏适中，带有短暂的戏剧性停顿。",
            constraints: ["不要大声读出配置值。", "不要解释这个 persona。"],
          },
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
  },
}
```

### Persona 解析

活动 persona 按如下方式确定：

1. `/tts persona <id>` 本地偏好（如果已设置）。
2. `messages.tts.persona`（如果已设置）。
3. 不使用 persona。

提供商选择按显式优先运行：

1. 直接覆盖（CLI、gateway、Talk、允许的 TTS 指令）。
2. `/tts provider <id>` 本地偏好。
3. 活动 persona 的 `provider`。
4. `messages.tts.provider`。
5. 注册表自动选择。

对于每次提供商尝试，OpenClaw 按以下顺序合并配置：

1. `messages.tts.providers.<id>`
2. `messages.tts.personas.<persona>.providers.<id>`
3. 可信请求覆盖
4. 允许的模型生成的 TTS 指令覆盖

### 提供商如何使用 persona 提示

Persona 提示字段（`profile`、`scene`、`sampleContext`、`style`、`accent`、
`pacing`、`constraints`）是**提供商无关**的。每个提供商决定如何使用它们：

<AccordionGroup>
  <Accordion title="Google Gemini">
    仅当有效的 Google 提供商配置设置了 `promptTemplate: "audio-profile-v1"`
    或 `personaPrompt` 时，才会将 persona 提示字段包装进 Gemini TTS 提示结构。
    较旧的 `audioProfile` 和 `speakerName` 字段仍会作为 Google 特定的提示文本前置。
    位于 `[[tts:text]]` 块中的内联音频标签，例如 `[whispers]` 或 `[laughs]`，
    会保留在 Gemini transcript 中；OpenClaw 不会生成这些标签。
  </Accordion>
  <Accordion title="OpenAI">
    仅当未配置显式的 OpenAI `instructions` 时，才会将 persona 提示字段映射到请求的
    `instructions` 字段。显式的 `instructions` 永远优先。
  </Accordion>
  <Accordion title="其他提供商">
    仅使用 `personas.<id>.providers.<provider>` 下的提供商特定 persona 绑定。
    除非提供商实现了自己的 persona 提示映射，否则会忽略 persona 提示字段。
  </Accordion>
</AccordionGroup>

### 回退策略

`fallbackPolicy` 控制当某个 persona 对尝试的提供商**没有绑定**时的行为：

| 策略               | 行为                                                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `preserve-persona` | **默认。** 保留提供商无关提示字段；提供商可以使用它们，也可以忽略它们。                                                                        |
| `provider-defaults` | 在该次尝试中，persona 不会参与提示准备；提供商使用其中性默认值，同时继续回退到其他提供商。                                                     |
| `fail`             | 跳过该提供商尝试，并返回 `reasonCode: "not_configured"` 和 `personaBinding: "missing"`。仍会继续尝试回退提供商。                              |

只有当**每个**被尝试的提供商都被跳过或失败时，整个 TTS 请求才会失败。

Talk 会话提供商选择以会话为作用域。Talk 客户端应从 `talk.catalog` 中选择 provider id、model id、voice id 和 locale，并通过 Talk 会话或交接请求传递它们。打开语音会话不应修改 `messages.tts` 或全局 Talk 提供商默认值。

## 模型驱动的指令

默认情况下，助手**可以**发出 `[[tts:...]]` 指令来为单条回复覆盖声音、模型或语速，并可选地使用
`[[tts:text]]...[[/tts:text]]` 块来加入仅应出现在音频中的表现性提示：

```text
给你。

[[tts:speakerVoiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

当 `messages.tts.auto` 为 `"tagged"` 时，**必须使用指令** 才会触发音频。
流式块传递会在通道看到它们之前，从可见文本中剥离指令，即使它们被拆分到相邻块中也是如此。

除非 `modelOverrides.allowProvider: true`，否则 `provider=...` 会被忽略。
当回复声明 `provider=...` 时，该指令中的其他键只会由该提供商解析；不支持的键会被剥离并作为 TTS 指令警告报告。

**可用的指令键：**

- `provider` (registered provider id; requires `allowProvider: true`)
- `speakerVoice` / `speakerVoiceId` (legacy aliases: `voice`, `voiceName`, `voice_name`, `google_voice`, `voiceId`)
- `model` / `google_model`
- `stability`, `similarityBoost`, `style`, `speed`, `useSpeakerBoost`
- `vol` / `volume` (MiniMax volume, `(0, 10]`)
- `pitch` (MiniMax integer pitch, −12 to 12; fractional values are truncated)
- `emotion` (Volcengine emotion tag)
- `applyTextNormalization` (`auto|on|off`)
- `languageCode` (ISO 639-1)
- `seed`

**完全禁用模型覆盖：**

```json5
{ messages: { tts: { modelOverrides: { enabled: false } } } }
```

**允许切换提供商，同时保持其他参数可配置：**

```json5
{ messages: { tts: { modelOverrides: { enabled: true, allowProvider: true, allowSeed: false } } } }
```

## Slash 命令

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

- `/tts on` writes the local TTS preference to `always`; `/tts off` writes it to `off`.
- `/tts chat on|off|default` writes a session-scoped auto-TTS override for the current chat.
- `/tts persona <id>` writes the local persona preference; `/tts persona off` clears it.
- `/tts latest` reads the latest assistant reply from the current session transcript and sends it as audio once. It stores only a hash of that reply on the session entry to suppress duplicate voice sends.
- `/tts audio` generates a one-off audio reply (does **not** toggle TTS on).
- `/tts limit <chars>` accepts **100–4096** (4096 is the Telegram caption/message max); values outside that range are rejected.
- `limit` and `summary` are stored in **local prefs**, not the main config.
- `/tts status` includes fallback diagnostics for the latest attempt — `Fallback: <primary> -> <used>`, `Attempts: ...`, and per-attempt detail (`provider:outcome(reasonCode) latency`).
- `/status` shows the active TTS mode plus configured provider, model, voice, and sanitized custom endpoint metadata when TTS is enabled.

## 每用户偏好

Slash 命令会将本地覆盖写入 `prefsPath`。默认值为 `~/.openclaw/settings/tts.json`；可通过 `OPENCLAW_TTS_PREFS` 环境变量或 `messages.tts.prefsPath` 覆盖。

| Stored field | Effect                                                                           |
| ------------ | -------------------------------------------------------------------------------- |
| `auto`       | Local auto-TTS override (`always`, `off`, …)                                     |
| `provider`   | Local primary provider override                                                  |
| `persona`    | Local persona override                                                           |
| `maxLength`  | Summary/truncation threshold (default `1500` chars, `/tts limit` range 100–4096) |
| `summarize`  | Summary toggle (default `true`)                                                  |

这些设置会覆盖来自 `messages.tts` 以及该主机上活动 `agents.list[].tts` 块的有效配置。

## Output formats

TTS voice delivery is channel-capability driven. Channel plugins advertise
whether voice-style TTS should ask providers for a native `voice-note` target or
keep normal `audio-file` synthesis, and whether the channel transcodes
non-native output before sending.

| Target                                | Format                                                                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Feishu / Matrix / Telegram / WhatsApp | Voice-note replies prefer **Opus** (`opus_48000_64` from ElevenLabs, `opus` from OpenAI). 48 kHz / 64 kbps balances clarity and size. |
| Other channels                        | **MP3** (`mp3_44100_128` from ElevenLabs, `mp3` from OpenAI). 44.1 kHz / 128 kbps is the default balance for speech.                  |
| Talk / telephony                      | Provider-native **PCM** (Inworld 22050 Hz, Google 24 kHz), or `ulaw_8000` from Gradium for telephony.                                 |

Per-provider notes:

- **Feishu / WhatsApp transcoding:** when a voice-note reply lands as MP3/WebM/WAV/M4A or another likely audio file, the channel plugin transcodes it to 48 kHz Ogg/Opus with `ffmpeg` (`libopus`, 64 kbps) before sending the native voice message. WhatsApp sends the result through the Baileys `audio` payload with `ptt: true` and `audio/ogg; codecs=opus`. On transcode failure: Feishu catches the error and falls back to sending the original file as a plain attachment; WhatsApp has no fallback, so the send itself fails rather than posting an incompatible PTT payload.
- **MiniMax:** MP3 (`speech-2.8-hd` model, 32 kHz sample rate) for normal audio attachments; transcoded to 48 kHz Opus with `ffmpeg` for channel-advertised voice-note targets.
- **Xiaomi MiMo:** MP3 by default, or WAV when configured; transcoded to 48 kHz Opus with `ffmpeg` for channel-advertised voice-note targets.
- **Local CLI:** uses the configured `outputFormat`. Voice-note targets are converted to Ogg/Opus and telephony output is converted to raw 16 kHz mono PCM with `ffmpeg`.
- **Google Gemini:** returns raw 24 kHz PCM. OpenClaw wraps it as WAV for audio attachments, transcodes it to 48 kHz Opus for voice-note targets, and returns PCM directly for Talk/telephony.
- **Gradium:** WAV for audio attachments, Opus for voice-note targets, and `ulaw_8000` at 8 kHz for telephony.
- **Inworld:** MP3 for normal audio attachments, native `OGG_OPUS` for voice-note targets, and raw `PCM` at 22050 Hz for Talk/telephony.
- **xAI:** MP3 by default; audio-file synthesis may use `mp3`, `wav`, `pcm`, `mulaw`, or `alaw` for both buffered and streaming output. Voice-note targets use MP3 for streaming and buffered fallback because xAI's `pcm`, `mulaw`, and `alaw` outputs are headerless raw audio. Buffered synthesis uses xAI's batch REST `/v1/tts` endpoint; `textToSpeechStream` uses native `wss://api.x.ai/v1/tts`. This is not the realtime voice contract. Native Opus voice-note format is not supported.
- **Microsoft:** uses `microsoft.outputFormat` (default `audio-24khz-48kbitrate-mono-mp3`).
  - The bundled transport accepts an `outputFormat`, but not all formats are available from the service.
  - Output format values follow Microsoft Speech output formats (including Ogg/WebM Opus).
  - Telegram `sendVoice` accepts OGG/MP3/M4A; use OpenAI/ElevenLabs if you need guaranteed Opus voice messages.
  - If the configured Microsoft output format fails, OpenClaw retries with MP3.
  - When no explicit voice override is set and the default English voice is used, OpenClaw auto-switches to a Chinese neural voice (`zh-CN-XiaoxiaoNeural`, `zh-CN` locale) if the reply text is CJK-dominant.

OpenAI and ElevenLabs output formats are fixed per channel as listed above.

## Auto-TTS 行为

当启用 `messages.tts.auto` 时，OpenClaw 会：

- 如果回复已经包含结构化媒体，则跳过 TTS。
- 跳过非常短的回复（少于 10 个字符）。
- 在启用摘要时，对长回复进行摘要，使用 `summaryModel`（或 `agents.defaults.model.primary`）。
- 将生成的音频附加到回复中。
- 在 `mode: "final"` 下，即使对于流式最终回复，在文本流完成后仍会发送仅音频的 TTS；生成的媒体会像普通回复附件一样经过相同的通道媒体规范化。

If the reply exceeds `maxLength`, OpenClaw never skips audio outright:

- **Summary on** (default) and a summary model is available: summarizes the
  text to roughly `maxLength` chars, then synthesizes the summary.
- **Summary off**, summarization fails, or no API key is available for the
  summary model: truncates the text to `maxLength` chars and synthesizes the
  truncated text.

```text
Reply -> TTS enabled?
  no  -> send text
  yes -> has media / short?
          yes -> send text
          no -> length > limit?
                   no  -> TTS -> attach audio
                   yes -> summary enabled and available?
                            no  -> truncate -> TTS -> attach audio
                            yes -> summarize -> TTS -> attach audio
```

## Field reference

<AccordionGroup>
  <Accordion title="顶层 messages.tts.*">
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
      由语音提供方 id 作为键的、提供方拥有的设置。旧的直接块（`messages.tts.openai`、`.elevenlabs`、`.microsoft`、`.edge`）会被 `openclaw doctor --fix` 重写；只提交 `messages.tts.providers.<id>`。
    </ParamField>
    <ParamField path="maxTextLength" type="number" default="4096">
      Hard cap for TTS input characters. `/tts audio`, `tts.convert`, and `tts.speak` fail if exceeded.
    </ParamField>
    <ParamField path="timeoutMs" type="number" default="30000">
      Request timeout in milliseconds. A per-call `timeoutMs` (agent tool, gateway) wins when set; otherwise an explicitly configured `messages.tts.timeoutMs` wins over any plugin-authored provider default.
    </ParamField>
    <ParamField path="prefsPath" type="string">
      覆盖本地 prefs JSON 路径（provider/limit/summary）。默认 `~/.openclaw/settings/tts.json`。
    </ParamField>
  </Accordion>

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
    <ParamField path="apiKey" type="string">Falls back to `ELEVENLABS_API_KEY` or `XI_API_KEY`.</ParamField>
    <ParamField path="model" type="string">Model id. Default `eleven_multilingual_v2`. Legacy ids `eleven_turbo_v2_5`/`eleven_turbo_v2` are normalized to the matching `flash` model.</ParamField>
    <ParamField path="speakerVoiceId" type="string">ElevenLabs voice id. Default `pMsXgVXv3BLzUgSXRplE`. Legacy alias: `voiceId`.</ParamField>
    <ParamField path="voiceSettings" type="object">
      `stability`, `similarityBoost`, `style` (each `0..1`, defaults `0.5`/`0.75`/`0`), `useSpeakerBoost` (`true|false`, default `true`), `speed` (`0.5..2.0`, default `1.0`).
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
    <ParamField path="personaPrompt" type="string">追加到模板 Director's Notes 的 Google 专用额外角色提示文本。</ParamField>
    <ParamField path="baseUrl" type="string">仅接受 `https://generativelanguage.googleapis.com`。</ParamField>
  </Accordion>

  <Accordion title="Gradium">
    <ParamField path="apiKey" type="string">Env: `GRADIUM_API_KEY`.</ParamField>
    <ParamField path="baseUrl" type="string">HTTPS Gradium API URL on `api.gradium.ai`. Default `https://api.gradium.ai`.</ParamField>
    <ParamField path="speakerVoiceId" type="string">Default Emma (`YTpq7expH9539ERJ`). Legacy alias: `voiceId`.</ParamField>
  </Accordion>

  <Accordion title="Inworld">
    ### Inworld 主配置

    <ParamField path="apiKey" type="string">Env: `INWORLD_API_KEY`.</ParamField>
    <ParamField path="baseUrl" type="string">Default `https://api.inworld.ai`.</ParamField>
    <ParamField path="modelId" type="string">Default `inworld-tts-1.5-max`. Also: `inworld-tts-1.5-mini`, `inworld-tts-1-max`, `inworld-tts-1`.</ParamField>
    <ParamField path="speakerVoiceId" type="string">Default `Sarah`. Legacy alias: `voiceId`.</ParamField>
    <ParamField path="temperature" type="number">Sampling temperature `0..2` (exclusive of 0).</ParamField>

  </Accordion>

  <Accordion title="Local CLI (tts-local-cli)">
    <ParamField path="command" type="string">Local executable or command string for CLI TTS.</ParamField>
    <ParamField path="args" type="string[]">Command arguments. Supports `{{Text}}`, `{{OutputPath}}`, `{{OutputDir}}`, `{{OutputBase}}` placeholders.</ParamField>
    <ParamField path="outputFormat" type='"mp3" | "opus" | "wav"'>Expected CLI output format. Default `mp3` for audio attachments.</ParamField>
    <ParamField path="timeoutMs" type="number">Command timeout in milliseconds. Default `120000`.</ParamField>
    <ParamField path="cwd" type="string">Optional command working directory.</ParamField>
    <ParamField path="env" type="Record<string, string>">Optional environment overrides for the command.</ParamField>

    Command stdout and generated or converted audio are limited to 50 MiB. Diagnostic stderr is limited to 1 MiB. OpenClaw terminates the command and fails synthesis when either limit is exceeded.

  </Accordion>

  <Accordion title="Microsoft (no API key)">
    <ParamField path="enabled" type="boolean" default="true">Allow Microsoft speech usage.</ParamField>
    <ParamField path="speakerVoice" type="string">Microsoft neural voice name (e.g. `en-US-MichelleNeural`). Legacy alias: `voice`. If the default English voice is in effect and reply text is CJK-dominant, OpenClaw auto-switches to `zh-CN-XiaoxiaoNeural`.</ParamField>
    <ParamField path="lang" type="string">Language code (e.g. `en-US`).</ParamField>
    <ParamField path="outputFormat" type="string">Microsoft output format. Default `audio-24khz-48kbitrate-mono-mp3`. Not all formats are supported by the bundled Edge-backed transport.</ParamField>
    <ParamField path="rate / pitch / volume" type="string">Percent strings (e.g. `+10%`, `-5%`).</ParamField>
    <ParamField path="saveSubtitles" type="boolean">Write JSON subtitles alongside the audio file.</ParamField>
    <ParamField path="proxy" type="string">Proxy URL for Microsoft speech requests.</ParamField>
    <ParamField path="timeoutMs" type="number">Request timeout override (ms).</ParamField>
    <ParamField path="edge.*" type="object" deprecated>Legacy alias. Run `openclaw doctor --fix` to rewrite persisted config to `providers.microsoft`.</ParamField>
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
    <ParamField path="apiKey" type="string">Falls back to `OPENAI_API_KEY`.</ParamField>
    <ParamField path="model" type="string">OpenAI TTS model id. Default `gpt-4o-mini-tts`.</ParamField>
    <ParamField path="speakerVoice" type="string">Voice name (e.g. `alloy`, `cedar`). Default `coral`. Legacy alias: `voice`.</ParamField>
    <ParamField path="instructions" type="string">Explicit OpenAI `instructions` field. When set, persona prompt fields are **not** auto-mapped.</ParamField>
    <ParamField path="extraBody / extra_body" type="Record<string, unknown>">Extra JSON fields merged into `/audio/speech` request bodies after generated OpenAI TTS fields. Use this for OpenAI-compatible endpoints such as Kokoro that require provider-specific keys like `lang`; unsafe prototype keys are ignored.</ParamField>
    <ParamField path="baseUrl" type="string">
      Override the OpenAI TTS endpoint. Resolution order: config → `OPENAI_TTS_BASE_URL` → `https://api.openai.com/v1`. Non-default values are treated as OpenAI-compatible TTS endpoints, so custom model and voice names are accepted, and `speed` loses its `0.25..4.0` range check.
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

  <Accordion title="Volcengine (BytePlus Seed Speech)">
    <ParamField path="apiKey" type="string">Env: `VOLCENGINE_TTS_API_KEY` or `BYTEPLUS_SEED_SPEECH_API_KEY`.</ParamField>
    <ParamField path="resourceId" type="string">Default `seed-tts-1.0`. Env: `VOLCENGINE_TTS_RESOURCE_ID`. Use `seed-tts-2.0` when your project has TTS 2.0 entitlement.</ParamField>
    <ParamField path="appKey" type="string">App key header. Default `aGjiRDfUWi`. Env: `VOLCENGINE_TTS_APP_KEY`.</ParamField>
    <ParamField path="baseUrl" type="string">Override the Seed Speech TTS HTTP endpoint. Env: `VOLCENGINE_TTS_BASE_URL`.</ParamField>
    <ParamField path="speakerVoice" type="string">Voice type. Default `en_female_anna_mars_bigtts`. Env: `VOLCENGINE_TTS_VOICE`. Legacy alias: `voice`.</ParamField>
    <ParamField path="speedRatio" type="number">Provider-native speed ratio, `0.2..3`.</ParamField>
    <ParamField path="emotion" type="string">Provider-native emotion tag.</ParamField>
    <ParamField path="appId / token / cluster" type="string" deprecated>Legacy Volcengine Speech Console fields. Env: `VOLCENGINE_TTS_APPID`, `VOLCENGINE_TTS_TOKEN`, `VOLCENGINE_TTS_CLUSTER` (default `volcano_tts`).</ParamField>
  </Accordion>

  <Accordion title="xAI">
    <ParamField path="apiKey" type="string">Env: `XAI_API_KEY`.</ParamField>
    <ParamField path="baseUrl" type="string">Default `https://api.x.ai/v1`. Env: `XAI_BASE_URL`.</ParamField>
    <ParamField path="speakerVoiceId" type="string">Default `eve`. With auth, `openclaw infer tts voices --provider xai` fetches the current built-in catalog; without auth it lists offline fallbacks `ara`, `eve`, `leo`, `rex`, and `sal`. Account custom voice IDs are forwarded even when absent from the built-in list. Legacy alias: `voiceId`.</ParamField>
    <ParamField path="language" type="string">BCP-47 language code or `auto`. Default `en`.</ParamField>
    <ParamField path="responseFormat" type='"mp3" | "wav" | "pcm" | "mulaw" | "alaw"'>Default `mp3`.</ParamField>
    <ParamField path="speed" type="number">Provider-native speed override, `0.7..1.5`.</ParamField>
  </Accordion>

  <Accordion title="小米 MiMo">
    <ParamField path="apiKey" type="string">环境变量：`XIAOMI_API_KEY`。</ParamField>
    <ParamField path="baseUrl" type="string">默认 `https://api.xiaomimimo.com/v1`。环境变量：`XIAOMI_BASE_URL`。</ParamField>
    <ParamField path="model" type="string">默认 `mimo-v2.5-tts`。环境变量：`XIAOMI_TTS_MODEL`。也支持 `mimo-v2-tts` 和 `mimo-v2.5-tts-voicedesign`。</ParamField>
    <ParamField path="speakerVoice" type="string">用于预设语音模型的默认值 `mimo_default`。环境变量：`XIAOMI_TTS_VOICE`。旧别名：`voice`。在 `mimo-v2.5-tts-voicedesign` 中不会发送。</ParamField>
    <ParamField path="format" type='"mp3" | "wav"'>默认 `mp3`。环境变量：`XIAOMI_TTS_FORMAT`。</ParamField>
    <ParamField path="style" type="string">可选的自然语言风格指令，作为用户消息发送；不会被朗读。对于 `mimo-v2.5-tts-voicedesign`，这是语音设计提示；省略时 OpenClaw 会提供默认值。</ParamField>
  </Accordion>
</AccordionGroup>

## Agent 工具

`tts` 工具将文本转换为语音，并返回一个音频附件用于回复传递。在飞书、Matrix、Telegram 和 WhatsApp 上，音频会以语音消息而不是文件附件的形式发送。飞书和 WhatsApp 可以在 `ffmpeg` 可用时，将非 Opus 的 TTS 输出在此路径上转码。

WhatsApp 通过 Baileys 将音频作为 PTT 语音备注发送（`audio` 且 `ptt: true`），并且会**单独**发送可见文本，而不是与 PTT 音频一起发送，因为客户端对语音备注上的字幕渲染并不稳定。

该工具接受可选的 `channel` 和 `timeoutMs` 字段；`timeoutMs` 是每次调用时提供方请求的超时时间，单位为毫秒。每次调用的值会覆盖 `messages.tts.timeoutMs`；已配置的 TTS 超时会覆盖插件作者设置的任何提供方默认值。

## 网关 RPC

| Method            | Purpose                                      |
| ----------------- | -------------------------------------------- |
| `tts.status`      | Read current TTS state and last attempt.     |
| `tts.enable`      | Set local auto preference to `always`.       |
| `tts.disable`     | Set local auto preference to `off`.          |
| `tts.convert`     | One-off text → audio.                        |
| `tts.setProvider` | Set local provider preference.               |
| `tts.personas`    | List configured personas and the active one. |
| `tts.setPersona`  | Set local persona preference.                |
| `tts.providers`   | List configured providers and status.        |

## 服务链接

- [OpenAI 文本转语音指南](https://platform.openai.com/docs/guides/text-to-speech)
- [OpenAI 音频 API 参考](https://platform.openai.com/docs/api-reference/audio)
- [Azure Speech REST 文本转语音](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech)
- [Azure Speech 提供方](/providers/azure-speech)
- [ElevenLabs 文本转语音](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [ElevenLabs 认证](https://elevenlabs.io/docs/api-reference/authentication)
- [Gradium](/providers/gradium)
- [Inworld TTS API](https://docs.inworld.ai/tts/tts)
- [MiniMax T2A v2 API](https://platform.minimaxi.com/document/T2A%20V2)
- [Volcengine TTS HTTP API](/providers/volcengine#text-to-speech)
- [Xiaomi MiMo 语音合成](/providers/xiaomi#text-to-speech)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Microsoft Speech 音频输出格式](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)
- [xAI 文本转语音](https://docs.x.ai/developers/rest-api-reference/inference/voice#text-to-speech-rest)

## 相关内容

- [媒体概览](/tools/media-overview)
- [音乐生成](/tools/music-generation)
- [视频生成](/tools/video-generation)
- [斜杠命令](/tools/slash-commands)
- [语音通话插件](/plugins/voice-call)
