---
summary: "Google Meet 插件配置默认值、覆盖和提供程序示例"
read_when:
  - "您正在查找 Google Meet 插件配置密钥及其默认值"
  - "您将 Google Meet 指向特定的实时提供商或 TTS 提供商"
  - "您正在为 Google Meet 配置 Twilio 拨号计划"
title: "Google 满足配置"
sidebarTitle: "配置"
---

插件配置默认值、可选覆盖和语音提供程序示例。 [Google Meet 插件](/plugins/google-meet) 指南的一部分。

## <a id="config"></a> 配置

通用的 Chrome agent 路径只需要启用插件、BlackHole、SoX、一个实时提供商密钥，以及一个已配置的 OpenClaw TTS 提供商：

```json5
{
  plugins: {
    entries: {
      "google-meet": {
        enabled: true,
        config: {},
      },
    },
  },
}
```

### <a id="defaults"></a> 默认值

| 键                               | 默认值                                  | 笔记                                                                                                                                                                                                                                            |
| --------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `defaultTransport`                | `"chrome"`                               |                                                                                                                                                                                                                                                  |
| `defaultMode`                     | `"agent"`                                | `"realtime"` 是 `"agent"` 的旧版别名；新调用方应使用 `"agent"`                                                                                                                                                       |
| `chromeNode.node`                 | 未设置                                    | Node id/name/IP 为 `chrome-node`；当可能连接多个有能力的节点时需要                                                                                                                                                     |
| `chrome.launch`                   | `true`                                   | 为加入通话启动 Chrome；仅在复用已打开的会话时设为 `false`                                                                                                                                                                |
| `chrome.audioBackend`             | `"auto"`                                 | 在 macOS 上选择 `blackhole-2ch` 或在 Linux 上选择 `pipewire-pulse`；当配对的 Chrome 节点使用与网关不同的 OS 时，设置显式后端                                                                                            |
| `chrome.guestName`                | `"OpenClaw Agent"`                       | 显示在未登录状态的 Meet 来宾界面上                                                                                                                                                                                                        |
| `chrome.autoJoin`                 | `true`                                   | 在 `chrome-node` 上尽力填写来宾名称并点击“立即加入”                                                                                                                                                                                  |
| `chrome.reuseExistingTab`         | `true`                                   | 激活现有的 Meet 标签页，而不是打开重复的标签页                                                                                                                                                                                     |
| `chrome.waitForInCallMs`          | `20000`                                  | 等待 Meet 标签页报告已进入通话状态，然后再播放语音回复开场白                                                                                                                                                                         |
| `chrome.audioFormat`              | `"pcm16-24khz"`                          | 命令对音频格式； `"g711-ulaw-8khz"` 仅适用于发出电话音频的 legacy/custom 命令对                                                                                                                                  |
| `chrome.audioBufferBytes`         | `4096`                                   | 用于推导生成的命令延迟的处理缓冲区；值会被限制为至少 17 字节                                                                                                                                          |
| `chrome.audioInputCommand`        | 生成的本机命令                 | 显式命令向提供者提供参与者输入。如果没有覆盖，浏览器回放会提供参与者输入，生成的本机命令会验证助理注入。在 macOS 上使用 SoX/CoreAudio 或在 Linux 上使用 `parec`。 |
| `chrome.audioOutputCommand`       | 生成的本机命令                 | 使用 macOS 上的 SoX/CoreAudio 或 Linux 上的 `pacat` 将助理语音注入虚拟麦克风。                                                                                                                                           |
| `chrome.bargeInInputCommand`      | 未设置                                    | 可选的独立本地麦克风，供提供商在网关托管的命令对桥上支持主机驱动的中断。 GPT-Live 自行处理中断，不启动该命令。                                           |
| `chrome.bargeInRmsThreshold`      | `650`                                    | 被视为人为打断的 RMS 音量                                                                                                                                                                                                          |
| `chrome.bargeInPeakThreshold`     | `2500`                                   | 被视为人为打断的峰值音量                                                                                                                                                                                                         |
| `chrome.bargeInCooldownMs`        | `900`                                    | 两次重复打断清除之间的最短延迟                                                                                                                                                                                               |
| `mode`（每次请求）              | `"agent"`                                | 对讲模式；请参阅 [Agent 和 bidi 模式](/plugins/google-meet/tool-and-modes#agent-and-bidi-modes) 表                                                                                                                                   |
| `realtime.provider`               | `"openai"`                               | 当下方的作用域字段未设置时使用的兼容性回退值                                                                                                                                                                               |
| `realtime.transcriptionProvider`  | `"openai"`                               | `agent` 模式用于实时转录的提供者 ID                                                                                                                                                                                      |
| `realtime.voiceProvider`          | 未设置                                    | `bidi` 模式使用的提供商 ID。设置`"google"`为Gemini Live或`"openai"`为OpenAI实时语音；与 `realtime.model` 配对以获得显式模型。                                                                                       |
| `realtime.toolPolicy`             | `"safe-read-only"`                       | 请参阅 [ 代理和双向模式](/plugins/google-meet/tool-and-modes#agent-and-bidi-modes)                                                                                                                                                             |
| `realtime.instructions`           | 简短的语音回复指令          | 告知模型简短发言，并使用 `openclaw_agent_consult` 获取更深入的回答                                                                                                                                                             |
| `realtime.introMessage`           | `"Say exactly: I'm here and listening."` | 实时桥接连接时播放一次；设为 `""` 可静默加入                                                                                                                                                                      |
| `realtime.agentId`                | `"main"`                                 | OpenClaw 用于功能工具咨询和本机 Live 委派的代理 ID。                                                                                                                                                                    |
| `voiceCall.enabled`               | `true`                                   | 将 Twilio PSTN 通话、DTMF 和开场问候语交由 Voice Call 插件处理                                                                                                                                                                |
| `voiceCall.dtmfDelayMs`           | `12000`                                  | 在通过 Twilio 播放 PIN- 派生的 DTMF 序列之前引导等待                                                                                                                                                                              |
| `voiceCall.postDtmfSpeechDelayMs` | `5000`                                   | Voice Call 启动 Twilio 通话线路后，请求实时开场问候语前的延迟                                                                                                                                                       |

`chrome.audioBridgeCommand` 和 `chrome.audioBridgeHealthCommand` 让外部桥接器拥有整个本地音频路径，而不是 `chrome.audioInputCommand`/`chrome.audioOutputCommand`；有关哪种模式可以使用它们的约束，请参阅 [Notes](/plugins/google-meet#notes)。

旧版 `realtime.provider: "google"` 形状存在 `openclaw doctor --fix` 迁移：当尚未设置这些字段时，它将将该意图移至 `realtime.voiceProvider: "google"` 加上 `realtime.transcriptionProvider: "openai"`。

### GPT-Live with Cove

选择 `bidi` 模式进行 GPT-Live 语音。 `agent`模式继续使用实时转录和常规OpenClaw TTS；更改实时语音模型不会更改该模式的语音。

使用 `openclaw models auth login --provider openai` 登录网关主机，然后配置现有模型和提供程序字段：

```json5
{
  plugins: {
    entries: {
      "google-meet": {
        config: {
          defaultMode: "bidi",
          realtime: {
            voiceProvider: "openai",
            model: "gpt-live-1-codex",
            providers: {
              openai: { voice: "cove" },
            },
          },
        },
      },
    },
  },
}
```

这使用与 Discord 和 Talk 相同的网关拥有的 GPT-Live 路由，包括本机代理委派和提供商拥有的中断。将 `chrome.audioFormat` 保留为 24 kHz PCM16 默认值。现有的非固定会议配置保留提供商的默认模型；明确选择“实时”。

删除任何显式 `chrome.audioInputCommand` 以使用 Live 的托管隔离浏览器输入。现有的自定义输入命令保留了其他模型的提供者输入行为； Live 拒绝该路径，因为无法验证其隔离性。选择“实时”不会默默地放弃已配置的输入源。

对于公共平台 API 路由，请使用 `model: "gpt-live-1"` 和支持的语音（例如 `voice: "marin"`），并在网关主机上使用 OpenAI API 密钥。 `cove`属于Codex路线。请参阅 [OpenAI 语音和语音 ](/providers/openai/voice-and-speech) 了解身份验证和 model/voice 兼容性。

### <a id="optional-overrides"></a> 可选覆盖

```json5
{
  defaults: {
    meeting: "https://meet.google.com/abc-defg-hij",
  },
  browser: {
    defaultProfile: "openclaw",
  },
  chrome: {
    guestName: "OpenClaw Agent",
    waitForInCallMs: 30000,
    bargeInInputCommand: [
      "sox",
      "-q",
      "-t",
      "coreaudio",
      "External Microphone",
      "-r",
      "24000",
      "-c",
      "1",
      "-b",
      "16",
      "-e",
      "signed-integer",
      "-t",
      "raw",
      "-",
    ],
  },
  chromeNode: {
    node: "parallels-macos",
  },
  defaultMode: "agent",
  realtime: {
    provider: "openai",
    transcriptionProvider: "openai",
    voiceProvider: "google",
    model: "gemini-3.1-flash-live-preview",
    agentId: "jay",
    toolPolicy: "owner",
    introMessage: "Say exactly: I'm here.",
    providers: {
      google: {
        speakerVoice: "Kore",
      },
    },
  },
}
```

同时用于 agent 模式听和说的 ElevenLabs：

```json5
{
  tts: {
    provider: "elevenlabs",
    providers: {
      elevenlabs: {
        modelId: "eleven_v3",
        speakerVoiceId: "pMsXgVXv3BLzUgSXRplE",
      },
    },
  },
  plugins: {
    entries: {
      "google-meet": {
        config: {
          realtime: {
            transcriptionProvider: "elevenlabs",
            providers: {
              elevenlabs: {
                modelId: "scribe_v2_realtime",
                audioFormat: "ulaw_8000",
                sampleRate: 8000,
                commitStrategy: "vad",
              },
            },
          },
        },
      },
    },
  },
}
```

持久的 Meet 声音来自 `tts.providers.elevenlabs.speakerVoiceId`。当启用 TTS 模型覆盖时，代理回复还可以使用每个回复 `[[tts:speakerVoiceId=... model=eleven_v3]]` 指令，但配置会提供会议的固定默认值。加入时，日志显示 `transcriptionProvider=elevenlabs`，每个语音回复都会记录 `provider=elevenlabs model=eleven_v3 speakerVoiceId=<voiceId>`。

Twilio-仅配置：

```json5
{
  defaultTransport: "twilio",
  twilio: {
    defaultDialInNumber: "+15551234567",
    defaultPin: "123456",
  },
  voiceCall: {
    gatewayUrl: "ws://127.0.0.1:18789",
  },
}
```

当 `voiceCall.enabled: true`（默认值）且使用 Twilio 传输时，Voice Call 会在打开实时媒体流之前先拨打 DTMF 序列，然后使用保存的开场文本作为初始实时问候。如果未启用 `voice-call`，Google Meet 仍然可以验证并记录拨号计划，但无法发起 Twilio 呼叫。

保留 `voiceCall.gatewayUrl` 未设置以使用本地可信网关运行时，这会保留完整调用的调用代理。配置的网关 URL 仍然是显式的 WebSocket 目标，并且无法验证插件来源；非默认代理加入将被拒绝，而不是默默地使用另一个代理。当需要每个座席路由时，在同一网关进程中运行 Google Meet 和语音呼叫。
