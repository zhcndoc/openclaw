---
summary: "用于出站回复的文本转语音——提供商、角色、斜杠命令以及按频道输出"
read_when:
  - 为回复启用文本转语音
  - 配置 TTS 提供商、回退链或角色
  - 使用 /tts 命令或指令
title: "文本转语音"
sidebarTitle: "文本转语音（TTS）"
---

OpenClaw 可以将出站回复转换为音频，支持 **14 个语音提供商**，并可在飞书、Matrix、Telegram 和 WhatsApp 上发送原生语音消息，在其他平台发送音频附件，并为电话和 Talk 提供 PCM/Ulaw 流。

TTS 是 Talk 的 `stt-tts` 模式中的语音输出部分。原生提供商
`realtime` Talk 会话会在实时提供商内部合成语音，而不是调用此 TTS 路径，
而 `transcription` 会话不会合成助手的语音回复。

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

TTS 配置位于 `~/.openclaw/openclaw.json` 的 `messages.tts` 下。选择一个
预设并调整提供商块：

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
- `stability`、`similarityBoost`、`style`、`speed`、`useSpeakerBoost`
- `vol` / `volume`（MiniMax 音量，0–10）
- `pitch`（MiniMax 整数音高，−12 到 12；小数值会被截断）
- `emotion`（Volcengine 情感标签）
- `applyTextNormalization`（`auto|on|off`）
- `languageCode`（ISO 639-1）
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

- `/tts on` 会将本地 TTS 偏好写为 `always`；`/tts off` 会将其写为 `off`。
- `/tts chat on|off|default` 会为当前聊天写入一个会话范围的自动 TTS 覆盖。
- `/tts persona <id>` 会写入本地 persona 偏好；`/tts persona off` 会清除它。
- `/tts latest` 会读取当前会话 transcript 中最新的助手回复，并将其一次性作为音频发送。它只会在会话条目上保存该回复的哈希，以抑制重复的语音发送。
- `/tts audio` 会生成一次性的音频回复（**不会**切换 TTS 为开启）。
- `limit` 和 `summary` 存储在**本地偏好**中，而不是主配置里。
- `/tts status` 会包含最近一次尝试的回退诊断信息——`Fallback: <primary> -> <used>`、`Attempts: ...`，以及每次尝试的细节（`provider:outcome(reasonCode) latency`）。
- 当 TTS 启用时，`/status` 会显示活动 TTS 模式，以及已配置的提供商、模型、语音和已清理的自定义端点元数据。

## 每用户偏好

Slash 命令会将本地覆盖写入 `prefsPath`。默认值为 `~/.openclaw/settings/tts.json`；可通过 `OPENCLAW_TTS_PREFS` 环境变量或 `messages.tts.prefsPath` 覆盖。

| 存储字段     | 作用                                         |
| ------------ | -------------------------------------------- |
| `auto`       | 本地自动 TTS 覆盖（`always`、`off` 等）      |
| `provider`   | 本地主提供商覆盖                             |
| `persona`    | 本地 persona 覆盖                            |
| `maxLength`  | 摘要阈值（默认 `1500` 字符）                 |
| `summarize`  | 摘要开关（默认 `true`）                      |

这些设置会覆盖来自 `messages.tts` 以及该主机上活动 `agents.list[].tts` 块的有效配置。

## 输出格式（固定）

TTS 语音投递由通道能力驱动。通道插件会声明语音风格 TTS 应该向提供商请求原生 `voice-note` 目标，还是保留普通 `audio-file` 合成，并仅将兼容输出标记为语音投递。

- **支持语音消息的通道**：语音消息回复优先使用 Opus（ElevenLabs 用 `opus_48000_64`，OpenAI 用 `opus`）。
  - 48kHz / 64kbps 是语音消息的良好折中。
- **Feishu / WhatsApp**：当语音消息回复以 MP3/WebM/WAV/M4A
  或其他可能的音频文件形式生成时，通道插件会在发送原生语音消息前，使用 `ffmpeg`
  将其转码为 48kHz 的 Ogg/Opus。WhatsApp 会通过 Baileys 的 `audio` 负载发送结果，
  并设置 `ptt: true` 和 `audio/ogg; codecs=opus`。如果转换失败，Feishu 会将原始
  文件作为附件接收；WhatsApp 则发送失败，而不是发布不兼容的 PTT 负载。
- **其他通道**：MP3（ElevenLabs 用 `mp3_44100_128`，OpenAI 用 `mp3`）。
  - 44.1kHz / 128kbps 是语音清晰度的默认平衡。
- **MiniMax**：用于普通音频附件时使用 MP3（`speech-2.8-hd` 模型，32kHz 采样率）。对于通道声明支持的语音消息目标，当通道支持转码时，OpenClaw 会在发送前使用 `ffmpeg` 将 MiniMax 的 MP3 转码为 48kHz Opus。
- **Xiaomi MiMo**：默认使用 MP3，或在配置时使用 WAV。对于通道声明支持的语音消息目标，当通道支持转码时，OpenClaw 会在发送前使用 `ffmpeg` 将 Xiaomi 输出转码为 48kHz Opus。
- **本地 CLI**：使用已配置的 `outputFormat`。语音消息目标
  会转换为 Ogg/Opus，而电话输出会使用 `ffmpeg`
  转换为原始 16 kHz 单声道 PCM。
- **Google Gemini**：Gemini API TTS 返回原始 24kHz PCM。OpenClaw 会将其包装为 WAV 用于音频附件，将其转码为 48kHz Opus 用于语音消息目标，并为 Talk/电话直接返回 PCM。
- **Gradium**：音频附件使用 WAV，语音消息目标使用 Opus，电话使用 8 kHz 的 `ulaw_8000`。
- **Inworld**：普通音频附件使用 MP3，语音消息目标使用原生 `OGG_OPUS`，Talk/电话使用 22050 Hz 的原始 `PCM`。
- **xAI**：默认使用 MP3；`responseFormat` 可以是 `mp3`、`wav`、`pcm`、`mulaw` 或 `alaw`。OpenClaw 使用 xAI 的批量 REST TTS 端点并返回完整的音频附件；此提供商路径不使用 xAI 的流式 TTS WebSocket。此路径不支持原生 Opus 语音消息格式。
- **Microsoft**：使用 `microsoft.outputFormat`（默认 `audio-24khz-48kbitrate-mono-mp3`）。
  - 捆绑的传输层接受 `outputFormat`，但并非所有格式都可从服务中获得。
  - 输出格式值遵循 Microsoft Speech 输出格式（包括 Ogg/WebM Opus）。
  - Telegram `sendVoice` 接受 OGG/MP3/M4A；如果你需要
    保证的 Opus 语音消息，请使用 OpenAI/ElevenLabs。
  - 如果配置的 Microsoft 输出格式失败，OpenClaw 会重试 MP3。

OpenAI/ElevenLabs 的输出格式按通道固定（见上文）。

## Auto-TTS 行为

当启用 `messages.tts.auto` 时，OpenClaw 会：

- 如果回复已经包含结构化媒体，则跳过 TTS。
- 跳过非常短的回复（少于 10 个字符）。
- 在启用摘要时，对长回复进行摘要，使用 `summaryModel`（或 `agents.defaults.model.primary`）。
- 将生成的音频附加到回复中。
- 在 `mode: "final"` 下，即使对于流式最终回复，在文本流完成后仍会发送仅音频的 TTS；生成的媒体会像普通回复附件一样经过相同的通道媒体规范化。

如果回复超过 `maxLength` 且摘要关闭（或摘要模型没有 API key），则会跳过音频并发送普通文本回复。

```text
Reply -> TTS enabled?
  no  -> send text
  yes -> has media / short?
          yes -> send text
          no -> length > limit?
                   no  -> TTS -> attach audio
                   yes -> summary enabled?
                            no  -> send text
                            yes -> summarize -> TTS -> attach audio
```

## 各 channel 的输出格式

| 目标                                   | 格式                                                                                                                                     |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Feishu / Matrix / Telegram / WhatsApp  | 语音笔记回复优先使用 **Opus**（ElevenLabs 的 `opus_48000_64`，OpenAI 的 `opus`）。48 kHz / 64 kbps 在清晰度和体积之间取得平衡。 |
| 其他 channels                           | **MP3**（ElevenLabs 的 `mp3_44100_128`，OpenAI 的 `mp3`）。44.1 kHz / 128 kbps 是语音的默认值。                                 |
| Talk / telephony                       | 提供方原生 **PCM**（Inworld 22050 Hz，Google 24 kHz），或 Gradium 的 `ulaw_8000` 用于 telephony。                                 |

各提供方说明：

- **Feishu / WhatsApp 转码：** 当语音笔记回复以 MP3/WebM/WAV/M4A 形式落地时，channel 插件会使用 `ffmpeg` 转码为 48 kHz Ogg/Opus。WhatsApp 通过 Baileys 发送，使用 `ptt: true` 和 `audio/ogg; codecs=opus`。如果转换失败：Feishu 会回退为附加原始文件；WhatsApp 则发送失败，而不是发布不兼容的 PTT payload。
- **MiniMax / Xiaomi MiMo：** 默认输出 MP3（MiniMax 的 `speech-2.8-hd` 为 32 kHz）；针对语音笔记目标会通过 `ffmpeg` 转码为 48 kHz Opus。
- **本地 CLI：** 使用配置的 `outputFormat`。语音笔记目标会转换为 Ogg/Opus，telephony 输出会转换为原始 16 kHz 单声道 PCM。
- **Google Gemini：** 返回原始 24 kHz PCM。OpenClaw 会将其包装为 WAV 用于附件，对语音笔记目标转码为 48 kHz Opus，对 Talk/telephony 则直接返回 PCM。
- **Inworld：** MP3 附件，原生 `OGG_OPUS` 语音笔记，Talk/telephony 使用原始 `PCM` 22050 Hz。
- **xAI：** 默认 MP3；`responseFormat` 可为 `mp3|wav|pcm|mulaw|alaw`。使用 xAI 的批量 REST 端点——**不**使用 streaming WebSocket TTS。**不**支持原生 Opus 语音笔记格式。
- **Microsoft：** 使用 `microsoft.outputFormat`（默认 `audio-24khz-48kbitrate-mono-mp3`）。Telegram 的 `sendVoice` 接受 OGG/MP3/M4A；如果你需要保证获得 Opus 语音消息，请使用 OpenAI/ElevenLabs。如果配置的 Microsoft 格式失败，OpenClaw 会重试 MP3。

OpenAI 和 ElevenLabs 的输出格式按上表针对各 channel 固定。

我会严格保留原有 Markdown/HTML 结构，只翻译可见文本和注释类内容。先直接输出完整中文译文，不改标签、属性名或代码标识。## 字段参考

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
    <ParamField path="maxTextLength" type="number">
      TTS 输入字符的硬上限。超出时 `/tts audio` 会失败。
    </ParamField>
    <ParamField path="timeoutMs" type="number">
      请求超时时间（毫秒）。
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
    <ParamField path="apiKey" type="string">回退到 `ELEVENLABS_API_KEY` 或 `XI_API_KEY`。</ParamField>
    <ParamField path="model" type="string">模型 id（例如 `eleven_multilingual_v2`、`eleven_v3`）。</ParamField>
    <ParamField path="speakerVoiceId" type="string">ElevenLabs 语音 id。旧别名：`voiceId`。</ParamField>
    <ParamField path="voiceSettings" type="object">
      `stability`、`similarityBoost`、`style`（均为 `0..1`）、`useSpeakerBoost`（`true|false`）、`speed`（`0.5..2.0`，`1.0` = 正常）。
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
    <ParamField path="apiKey" type="string">环境变量：`GRADIUM_API_KEY`。</ParamField>
    <ParamField path="baseUrl" type="string">默认 `https://api.gradium.ai`。</ParamField>
    <ParamField path="speakerVoiceId" type="string">默认 Emma（`YTpq7expH9539ERJ`）。旧别名：`voiceId`。</ParamField>
  </Accordion>

  <Accordion title="Inworld">
    ### Inworld 主配置

    <ParamField path="apiKey" type="string">环境变量：`INWORLD_API_KEY`。</ParamField>
    <ParamField path="baseUrl" type="string">默认 `https://api.inworld.ai`。</ParamField>
    <ParamField path="modelId" type="string">默认 `inworld-tts-1.5-max`。另外还有：`inworld-tts-1.5-mini`、`inworld-tts-1-max`、`inworld-tts-1`。</ParamField>
    <ParamField path="speakerVoiceId" type="string">默认 `Sarah`。旧别名：`voiceId`。</ParamField>
    <ParamField path="temperature" type="number">采样温度 `0..2`。</ParamField>

  </Accordion>

  <Accordion title="本地 CLI (tts-local-cli)">
    <ParamField path="command" type="string">用于 CLI TTS 的本地可执行文件或命令字符串。</ParamField>
    <ParamField path="args" type="string[]">命令参数。支持 `{{Text}}`、`{{OutputPath}}`、`{{OutputDir}}`、`{{OutputBase}}` 占位符。</ParamField>
    <ParamField path="outputFormat" type='"mp3" | "opus" | "wav"'>预期的 CLI 输出格式。音频附件默认使用 `mp3`。</ParamField>
    <ParamField path="timeoutMs" type="number">命令超时时间（毫秒）。默认 `120000`。</ParamField>
    <ParamField path="cwd" type="string">可选的命令工作目录。</ParamField>
    <ParamField path="env" type="Record<string, string>">命令的可选环境变量覆盖。</ParamField>
  </Accordion>

  <Accordion title="Microsoft (no API key)">
    <ParamField path="enabled" type="boolean" default="true">允许使用 Microsoft 语音。</ParamField>
    <ParamField path="speakerVoice" type="string">Microsoft 神经语音名称（例如 `en-US-MichelleNeural`）。旧别名：`voice`。</ParamField>
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
    <ParamField path="model" type="string">OpenAI TTS 模型 id（例如 `gpt-4o-mini-tts`）。</ParamField>
    <ParamField path="speakerVoice" type="string">语音名称（例如 `alloy`、`cedar`）。旧别名：`voice`。</ParamField>
    <ParamField path="instructions" type="string">显式的 OpenAI `instructions` 字段。设置后，角色提示字段不会自动映射。</ParamField>
    <ParamField path="extraBody / extra_body" type="Record<string, unknown>">在生成的 OpenAI TTS 字段之后合并到 `/audio/speech` 请求体中的额外 JSON 字段。用于 OpenAI 兼容端点，例如需要 provider 特定键（如 `lang`）的 Kokoro；不安全的原型键会被忽略。</ParamField>
    <ParamField path="baseUrl" type="string">
      覆盖 OpenAI TTS 端点。解析顺序：config → `OPENAI_TTS_BASE_URL` → `https://api.openai.com/v1`。非默认值会被视为 OpenAI 兼容的 TTS 端点，因此会接受自定义模型和 voice 名称。
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
    <ParamField path="apiKey" type="string">环境变量：`VOLCENGINE_TTS_API_KEY` 或 `BYTEPLUS_SEED_SPEECH_API_KEY`。</ParamField>
    <ParamField path="resourceId" type="string">默认 `seed-tts-1.0`。环境变量：`VOLCENGINE_TTS_RESOURCE_ID`。当你的项目拥有 TTS 2.0 权限时，请使用 `seed-tts-2.0`。</ParamField>
    <ParamField path="appKey" type="string">应用密钥头。默认 `aGjiRDfUWi`。环境变量：`VOLCENGINE_TTS_APP_KEY`。</ParamField>
    <ParamField path="baseUrl" type="string">覆盖 Seed Speech TTS HTTP 端点。环境变量：`VOLCENGINE_TTS_BASE_URL`。</ParamField>
    <ParamField path="speakerVoice" type="string">语音类型。默认 `en_female_anna_mars_bigtts`。环境变量：`VOLCENGINE_TTS_VOICE`。旧别名：`voice`。</ParamField>
    <ParamField path="speedRatio" type="number">提供方原生语速比例。</ParamField>
    <ParamField path="emotion" type="string">提供方原生情绪标签。</ParamField>
    <ParamField path="appId / token / cluster" type="string" deprecated>旧版 Volcengine Speech Console 字段。环境变量：`VOLCENGINE_TTS_APPID`、`VOLCENGINE_TTS_TOKEN`、`VOLCENGINE_TTS_CLUSTER`（默认 `volcano_tts`）。</ParamField>
  </Accordion>

  <Accordion title="xAI">
    <ParamField path="apiKey" type="string">环境变量：`XAI_API_KEY`。</ParamField>
    <ParamField path="baseUrl" type="string">默认 `https://api.x.ai/v1`。环境变量：`XAI_BASE_URL`。</ParamField>
    <ParamField path="speakerVoiceId" type="string">默认 `eve`。可用语音：`ara`、`eve`、`leo`、`rex`、`sal`、`una`。旧别名：`voiceId`。</ParamField>
    <ParamField path="language" type="string">BCP-47 语言代码或 `auto`。默认 `en`。</ParamField>
    <ParamField path="responseFormat" type='"mp3" | "wav" | "pcm" | "mulaw" | "alaw"'>默认 `mp3`。</ParamField>
    <ParamField path="speed" type="number">提供方原生速度覆盖。</ParamField>
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

| 方法              | 作用                                   |
| ----------------- | -------------------------------------- |
| `tts.status`      | 读取当前 TTS 状态和上次尝试。          |
| `tts.enable`      | 将本地自动偏好设置为 `always`。        |
| `tts.disable`     | 将本地自动偏好设置为 `off`。           |
| `tts.convert`     | 一次性文本 → 音频。                    |
| `tts.setProvider` | 设置本地提供方偏好。                   |
| `tts.setPersona`  | 设置本地人格偏好。                     |
| `tts.providers`   | 列出已配置的提供方及其状态。           |

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
