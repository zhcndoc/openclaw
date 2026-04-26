---
summary: "语音通话插件：通过 Twilio/Telnyx/Plivo 实现外拨和接听（插件安装 + 配置 + CLI）"
read_when:
  - 你想从 OpenClaw 发起外拨语音通话
  - 你正在配置或开发语音通话插件
title: "语音通话插件"
---

# 语音通话（插件）

OpenClaw 的语音通话插件。支持外拨通知和带入站策略的多轮对话。

当前支持的服务提供商：

- `twilio`（可编程语音 + 媒体流）
- `telnyx`（呼叫控制 v2）
- `plivo`（语音 API + XML 转接 + GetInput 语音识别）
- `mock`（开发用/无网络）

简要思路：

- 安装插件
- 重启网关
- 在 `plugins.entries.voice-call.config` 下配置
- 使用 `openclaw voicecall ...` 或 `voice_call` 工具

## 运行位置（本地 vs 远程）

语音通话插件**运行在网关进程内部**。

如果使用远程网关，请在**运行网关的机器上**安装/配置插件，然后重启网关以加载插件。

## 安装

### 选项 A：通过 npm 安装（推荐）

```bash
openclaw plugins install @openclaw/voice-call
```

安装后请重启网关。

### 选项 B：从本地文件夹安装（开发用，无需复制）

```bash
PLUGIN_SRC=./path/to/local/voice-call-plugin
openclaw plugins install "$PLUGIN_SRC"
cd "$PLUGIN_SRC" && pnpm install
```

安装后请重启网关。

## 配置

在 `plugins.entries.voice-call.config` 下设置配置项：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio", // 或 "telnyx" | "plivo" | "mock"
          fromNumber: "+15550001234", // Twilio 可使用 TWILIO_FROM_NUMBER
          toNumber: "+15550005678",

          twilio: {
            accountSid: "ACxxxxxxxx",
            authToken: "...",
          },

          telnyx: {
            apiKey: "...",
            connectionId: "...",
            // 来自 Telnyx Mission Control 门户的 Telnyx webhook 公钥
            // （Base64 字符串；也可通过环境变量 TELNYX_PUBLIC_KEY 设置）。
            publicKey: "...",
          },

          plivo: {
            authId: "MAxxxxxxxxxxxxxxxxxxxx",
            authToken: "...",
          },

          // Webhook 服务器
          serve: {
            port: 3334,
            path: "/voice/webhook",
          },

          // Webhook 安全（建议用于隧道/代理）
          webhookSecurity: {
            allowedHosts: ["voice.example.com"],
            trustedProxyIPs: ["100.64.0.1"],
          },

          // 公开访问（任选其一）
          // publicUrl: "https://example.ngrok.app/voice/webhook",
          // tunnel: { provider: "ngrok" },
          // tailscale: { mode: "funnel", path: "/voice/webhook" }

          outbound: {
            defaultMode: "notify", // 可选：notify | conversation
          },

          streaming: {
            enabled: true,
            provider: "openai", // 可选；未设置时使用第一个已注册的实时转录提供商
            streamPath: "/voice/stream",
            providers: {
              openai: {
                apiKey: "sk-...", // 如果已设置 OPENAI_API_KEY，则可选
                model: "gpt-4o-transcribe",
                silenceDurationMs: 800,
                vadThreshold: 0.5,
              },
            },
            preStartTimeoutMs: 5000,
            maxPendingConnections: 32,
            maxPendingConnectionsPerIp: 4,
            maxConnections: 128,
          },

          realtime: {
            enabled: false,
            provider: "google", // 可选；未设置时使用第一个已注册的实时语音提供商
            toolPolicy: "safe-read-only",
            providers: {
              google: {
                model: "gemini-2.5-flash-native-audio-preview-12-2025",
                voice: "Kore",
              },
            },
          },
        },
      },
    },
  },
}
```

说明：

- Twilio/Telnyx 需要一个**可公开访问**的 webhook URL。
- Plivo 需要一个**可公开访问**的 webhook URL。
- `mock` 是本地开发提供商（不发起网络请求）。
- 如果旧配置仍使用 `provider: "log"`、`twilio.from` 或旧版 `streaming.*` OpenAI 键，请运行 `openclaw doctor --fix` 进行重写。
- 除非 `skipSignatureVerification` 为 true，否则 Telnyx 需要 `telnyx.publicKey`（或 `TELNYX_PUBLIC_KEY`）。
- `skipSignatureVerification` 仅用于本地测试。
- 如果你使用 ngrok 免费版，请将 `publicUrl` 设置为精确的 ngrok URL；始终会强制执行签名验证。
- `tunnel.allowNgrokFreeTierLoopbackBypass: true` 仅在 `tunnel.provider="ngrok"` 且 `serve.bind` 为回环地址（ngrok 本地代理）时，允许 Twilio webhook 使用无效签名。仅用于本地开发。
- ngrok 免费版 URL 可能变化或增加中间页行为；如果 `publicUrl` 漂移，Twilio 签名将失败。生产环境建议使用稳定域名或 Tailscale funnel。
- `realtime.enabled` 会启动完整的语音到语音对话；不要与 `streaming.enabled` 同时启用。
- 流式传输安全默认值：
  - `streaming.preStartTimeoutMs` 会关闭那些始终未发送有效 `start` 帧的 socket。
- `streaming.maxPendingConnections` 限制未认证、预启动 socket 的总数。
- `streaming.maxPendingConnectionsPerIp` 限制每个源 IP 的未认证、预启动 socket 数量。
- `streaming.maxConnections` 限制打开的媒体流 socket 总数（待定 + 活跃）。
- 运行时回退目前仍接受这些旧的语音通话键，但重写路径是 `openclaw doctor --fix`，兼容层只是临时的。

## 实时语音对话

`realtime` 会为实时通话音频选择一个全双工实时语音提供商。
它与 `streaming` 是分开的，后者只会把音频转发给实时转录提供商。

当前运行时行为：

- `realtime.enabled` 支持 Twilio Media Streams。
- `realtime.enabled` 不能与 `streaming.enabled` 组合使用。
- `realtime.provider` 是可选的。如果未设置，Voice Call 会使用第一个
  已注册的实时语音提供商。
- 内置的实时语音提供商包括 Google Gemini Live（`google`）和
  OpenAI（`openai`），由其提供商插件注册。
- 提供商拥有的原始配置位于 `realtime.providers.<providerId>` 下。
- Voice Call 默认公开共享的 `openclaw_agent_consult` 实时工具。
  当来电者要求更深入的推理、当前信息或常规 OpenClaw 工具时，实时模型可以调用它。
- `realtime.toolPolicy` 控制 consult 运行方式：
  - `safe-read-only`：公开 consult 工具，并将常规 agent 限制为
    `read`、`web_search`、`web_fetch`、`x_search`、`memory_search` 和
    `memory_get`。
  - `owner`：公开 consult 工具，并允许常规 agent 使用标准
    agent 工具策略。
  - `none`：不公开 consult 工具。自定义的 `realtime.tools` 仍会透传给实时提供商。
- consult 会话键在可用时会复用现有语音会话，然后再回退到来电者/接听者电话号码，
  这样后续的 consult 调用可以在通话期间保持上下文。
- 如果 `realtime.provider` 指向未注册的提供商，或者根本没有注册任何实时
  语音提供商，Voice Call 会记录警告并跳过实时媒体，而不是让整个插件失败。

Google Gemini Live 实时默认值：

- API key：`realtime.providers.google.apiKey`、`GEMINI_API_KEY` 或
  `GOOGLE_GENERATIVE_AI_API_KEY`
- model：`gemini-2.5-flash-native-audio-preview-12-2025`
- voice：`Kore`

示例：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          provider: "twilio",
          inboundPolicy: "allowlist",
          allowFrom: ["+15550005678"],
          realtime: {
            enabled: true,
            provider: "google",
            instructions: "简短发言。在使用更深层工具前先调用 openclaw_agent_consult。",
            toolPolicy: "safe-read-only",
            providers: {
              google: {
                apiKey: "${GEMINI_API_KEY}",
                model: "gemini-2.5-flash-native-audio-preview-12-2025",
                voice: "Kore",
              },
            },
          },
        },
      },
    },
  },
}
```

改用 OpenAI：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          realtime: {
            enabled: true,
            provider: "openai",
            providers: {
              openai: {
                apiKey: "${OPENAI_API_KEY}",
              },
            },
          },
        },
      },
    },
  },
}
```

有关各提供商特定的实时语音选项，请参阅 [Google provider](/providers/google) 和 [OpenAI provider](/providers/openai)。

## 流式转录

`streaming` 会为实时通话音频选择一个实时转录提供商。

当前运行时行为：

- `streaming.provider` 是可选的。如果未设置，Voice Call 会使用第一个
  已注册的实时转录提供商。
- 内置的实时转录提供商包括 Deepgram（`deepgram`）、
  ElevenLabs（`elevenlabs`）、Mistral（`mistral`）、OpenAI（`openai`）和 xAI
  (`xai`)，由其提供商插件注册。
- 提供商拥有的原始配置位于 `streaming.providers.<providerId>` 下。
- 如果 `streaming.provider` 指向未注册的提供商，或者根本没有注册任何实时
  转录提供商，Voice Call 会记录警告并跳过媒体流，而不是让整个插件失败。

OpenAI 流式转录默认值：

- API key：`streaming.providers.openai.apiKey` 或 `OPENAI_API_KEY`
- model：`gpt-4o-transcribe`
- `silenceDurationMs`：`800`
- `vadThreshold`：`0.5`

xAI 流式转录默认值：

- API key：`streaming.providers.xai.apiKey` 或 `XAI_API_KEY`
- endpoint：`wss://api.x.ai/v1/stt`
- `encoding`：`mulaw`
- `sampleRate`：`8000`
- `endpointingMs`：`800`
- `interimResults`：`true`

示例：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          streaming: {
            enabled: true,
            provider: "openai",
            streamPath: "/voice/stream",
            providers: {
              openai: {
                apiKey: "sk-...", // 如果已设置 OPENAI_API_KEY，则可选
                model: "gpt-4o-transcribe",
                silenceDurationMs: 800,
                vadThreshold: 0.5,
              },
            },
          },
        },
      },
    },
  },
}
```

改用 xAI：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          streaming: {
            enabled: true,
            provider: "xai",
            streamPath: "/voice/stream",
            providers: {
              xai: {
                apiKey: "${XAI_API_KEY}", // 如果已设置 XAI_API_KEY，则可选
                endpointingMs: 800,
                language: "en",
              },
            },
          },
        },
      },
    },
  },
}
```

旧键仍会被 `openclaw doctor --fix` 自动迁移：

- `streaming.sttProvider` → `streaming.provider`
- `streaming.openaiApiKey` → `streaming.providers.openai.apiKey`
- `streaming.sttModel` → `streaming.providers.openai.model`
- `streaming.silenceDurationMs` → `streaming.providers.openai.silenceDurationMs`
- `streaming.vadThreshold` → `streaming.providers.openai.vadThreshold`

## 过期通话清理器

使用 `staleCallReaperSeconds` 结束从未收到终止 webhook 的通话（例如，通知模式中未完成的通话）。默认值为 `0`（禁用）。

推荐范围：

- **生产环境**：通知型流程建议设置为 `120`–`300` 秒。
- 保持此值**高于 `maxDurationSeconds`**，以便正常通话能完成。推荐起始值为 `maxDurationSeconds + 30–60` 秒。

示例：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          maxDurationSeconds: 300,
          staleCallReaperSeconds: 360,
        },
      },
    },
  },
}
```

## Webhook 安全

当代理或隧道位于网关之前时，插件会重建用于签名验证的公共 URL。以下选项控制信任哪些转发头。

`webhookSecurity.allowedHosts` 允许通过头中的主机名白名单。

`webhookSecurity.trustForwardingHeaders` 在无白名单时信任转发头。

`webhookSecurity.trustedProxyIPs` 仅当请求远程 IP 位于列表时信任转发头。

Twilio 和 Plivo 已启用 webhook 重放保护。重放的有效 webhook 请求会被确认但跳过副作用执行。

Twilio 会话轮转在 `<Gather>` 回调中包含每轮的令牌，因此过期或重放的语音回调无法满足较新的待处理转录。

当提供商所需的签名头缺失时，未经认证的 webhook 请求会在读取正文之前被拒绝。

voice-call webhook 使用共享的预认证正文配置文件（64 KB / 5 秒），并在签名验证之前加上每个 IP 的进行中请求上限。

使用稳定公共主机的示例：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          publicUrl: "https://voice.example.com/voice/webhook",
          webhookSecurity: {
            allowedHosts: ["voice.example.com"],
          },
        },
      },
    },
  },
}
```

## 通话的 TTS

语音通话使用核心 `messages.tts` 配置来进行通话中的流式语音。您可以在插件配置下使用**相同的结构**覆盖它——它会与 `messages.tts` 深度合并。

```json5
{
  tts: {
    provider: "elevenlabs",
    providers: {
      elevenlabs: {
        voiceId: "pMsXgVXv3BLzUgSXRplE",
        modelId: "eleven_multilingual_v2",
      },
    },
  },
}
```

说明：

- 插件配置中遗留的 `tts.<provider>` 键（`openai`, `elevenlabs`, `microsoft`, `edge`）在加载时会自动迁移到 `tts.providers.<provider>`。建议在提交的配置中使用 `providers` 结构。
- **语音通话会忽略 Microsoft 语音**（电话音频需要 PCM；当前的 Microsoft 传输不暴露电话 PCM 输出）。
- 当启用 Twilio 媒体流时使用核心 TTS；否则通话回退到提供商原生语音。
- 如果 Twilio 媒体流已激活，语音通话不会回退到 TwiML `<Say>`。如果在该状态下电话 TTS 不可用，播放请求将失败，而不是混合两条播放路径。
- 当电话 TTS 回退到次要提供商时，语音通话会记录一条包含提供商链（`from`, `to`, `attempts`）的警告以供调试。

### 更多示例

仅使用核心 TTS（无覆盖）：

```json5
{
  messages: {
    tts: {
      provider: "openai",
      providers: {
        openai: { voice: "alloy" },
      },
    },
  },
}
```

仅对通话覆盖为 ElevenLabs（其他场景保留核心默认）：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          tts: {
            provider: "elevenlabs",
            providers: {
              elevenlabs: {
                apiKey: "elevenlabs_key",
                voiceId: "pMsXgVXv3BLzUgSXRplE",
                modelId: "eleven_multilingual_v2",
              },
            },
          },
        },
      },
    },
  },
}
```

仅对通话覆盖 OpenAI 模型（深度合并示例）：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          tts: {
            providers: {
              openai: {
                model: "gpt-4o-mini-tts",
                voice: "marin",
              },
            },
          },
        },
      },
    },
  },
}
```

## 入站调用

入站策略默认禁用。启用入站通话，设置：

```json5
{
  inboundPolicy: "allowlist",
  allowFrom: ["+15550001234"],
  inboundGreeting: "您好！我能帮您什么？",
}
```

`inboundPolicy: "allowlist"` 是一种低保证的来电显示筛选。插件会规范化提供商传递的 `From` 值并与 `allowFrom` 进行比较。Webhook 验证确保提供商的交付和数据完整性，但不证明 PSTN/VoIP 来电号码所有权。请将 `allowFrom` 视作来电显示过滤，而非强身份验证。

自动响应使用代理系统。可调参数：

- `responseModel`
- `responseSystemPrompt`
- `responseTimeoutMs`

### 语音输出契约

对于自动响应，语音通话会将严格的语音输出契约附加到系统提示中：

- `{"spoken":"..."}`

然后语音通话会防御性地提取语音文本：

- 忽略标记为推理/错误内容的负载。
- 解析直接 JSON、围栏 JSON 或内联 `"spoken"` 键。
- 回退到纯文本并移除可能的规划/元数据引导段落。

这使得语音播放专注于面向呼叫者的文本，并避免将规划文本泄露到音频中。

### 对话启动行为

对于外拨 `conversation` 通话，第一条消息的处理与实时播放状态绑定：

- Barge-in 队列清理和自动响应仅在初始问候语正在播放时被抑制。
- 如果初始播放失败，通话会返回到 `listening`，且初始消息会保留在队列中以便重试。
- Twilio 流式播放的初始播放在流连接后立即开始，无额外延迟。
- 实时语音对话使用实时流自身的开场轮次。Voice Call 不会为该初始消息发布旧版 `<Say>` TwiML 更新，因此外拨 `<Connect><Stream>` 会话会保持连接。

### Twilio 流断开宽限期

当 Twilio 媒体流断开时，语音通话会等待 `2000ms` 然后自动结束通话：

- 如果流在该窗口期内重新连接，则取消自动结束。
- 如果宽限期后没有流重新注册，则结束通话以防止活跃通话卡住。

## CLI

```bash
openclaw voicecall call --to "+15555550123" --message "Hello from OpenClaw"
openclaw voicecall start --to "+15555550123"   # call 的别名
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall speak --call-id <id> --message "One moment"
openclaw voicecall dtmf --call-id <id> --digits "ww123456#"
openclaw voicecall end --call-id <id>
openclaw voicecall status --call-id <id>
openclaw voicecall tail
openclaw voicecall latency                     # 汇总日志中的轮次延迟
openclaw voicecall expose --mode funnel
```

`latency` 从默认语音通话存储路径读取 `calls.jsonl`。使用 `--file <path>` 指向不同的日志，使用 `--last <n>` 将分析限制为最后 N 条记录（默认 200）。输出包括轮次延迟和监听等待时间的 p50/p90/p99。

## Agent 工具

工具名称：`voice_call`

动作：

- `initiate_call` (message, to?, mode?)
- `continue_call` (callId, message)
- `speak_to_user` (callId, message)
- `send_dtmf` (callId, digits)
- `end_call` (callId)
- `get_status` (callId)

本仓库附带匹配的技能文档，位于 `skills/voice-call/SKILL.md`。

## 网关 RPC

- `voicecall.initiate` (`to?`, `message`, `mode?`)
- `voicecall.continue` (`callId`, `message`)
- `voicecall.speak` (`callId`, `message`)
- `voicecall.dtmf` (`callId`, `digits`)
- `voicecall.end` (`callId`)
- `voicecall.status` (`callId`)

## 相关

- [文本转语音](/tools/tts)
- [对话模式](/nodes/talk)
- [语音唤醒](/nodes/voicewake)
