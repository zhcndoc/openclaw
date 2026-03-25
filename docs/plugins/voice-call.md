---
summary: "语音通话插件：通过 Twilio/Telnyx/Plivo 实现外拨和接听（插件安装 + 配置 + CLI）"
read_when:
  - 您想从 OpenClaw 发起外拨语音通话
  - 您正在配置或开发语音通话插件
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
openclaw plugins install ./extensions/voice-call
cd ./extensions/voice-call && pnpm install
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
          fromNumber: "+15550001234",
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
            defaultMode: "notify", // notify | conversation
          },

          streaming: {
            enabled: true,
            streamPath: "/voice/stream",
            preStartTimeoutMs: 5000,
            maxPendingConnections: 32,
            maxPendingConnectionsPerIp: 4,
            maxConnections: 128,
          },
        },
      },
    },
  },
}
```

说明：

- Twilio/Telnyx 需要**公开可访问**的 webhook URL。
- Plivo 也需要**公开可访问**的 webhook URL。
- `mock` 是本地开发用提供商（无网络调用）。
- Telnyx 需要 `telnyx.publicKey`（或环境变量 `TELNYX_PUBLIC_KEY`），除非设置了 `skipSignatureVerification` 为 true。
- `skipSignatureVerification` 仅用于本地测试。
- 使用 ngrok 免费版时，请将 `publicUrl` 设置为准确的 ngrok URL；签名验证始终强制启用。
- 设置 `tunnel.allowNgrokFreeTierLoopbackBypass: true` 可允许 Twilio webhook 带无效签名，仅当 `tunnel.provider="ngrok"` 且 `serve.bind` 为回环地址（ngrok 本地代理）时有效，仅限本地开发使用。
- ngrok 免费版 URL 可能变化或加入中间页；若 `publicUrl` 发生变化，Twilio 签名会验证失败。生产环境建议使用稳定域名或 Tailscale 漏斗。
- 流媒体安全默认：
  - `streaming.preStartTimeoutMs` 会关闭从未发送有效 `start` 帧的连接套接字。
  - `streaming.maxPendingConnections` 限制总未认证的预启动套接字数。
  - `streaming.maxPendingConnectionsPerIp` 限制每个源 IP 的未认证预启动套接字。
  - `streaming.maxConnections` 限制总媒体流套接字（预启动 + 活跃）。

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

Twilio 会话转轮在 `<Gather>` 回调中包含每轮的令牌，因此过期或重放的语音回调无法满足较新的待处理转录。

Unauthenticated webhook requests are rejected before body reads when the
provider's required signature headers are missing.

The voice-call webhook uses the shared pre-auth body profile (64 KB / 5 seconds)
plus a per-IP in-flight cap before signature verification.

Example with a stable public host:

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

Voice Call uses the core `messages.tts` configuration for
streaming speech on calls. You can override it under the plugin config with the
**same shape** — it deep‑merges with `messages.tts`.

```json5
{
  tts: {
    provider: "elevenlabs",
    elevenlabs: {
      voiceId: "pMsXgVXv3BLzUgSXRplE",
      modelId: "eleven_multilingual_v2",
    },
  },
}
```

说明：

- **Microsoft speech is ignored for voice calls** (telephony audio needs PCM; the current Microsoft transport does not expose telephony PCM output).
- Core TTS is used when Twilio media streaming is enabled; otherwise calls fall back to provider native voices.
- If a Twilio media stream is already active, Voice Call does not fall back to TwiML `<Say>`. If telephony TTS is unavailable in that state, the playback request fails instead of mixing two playback paths.

### 更多示例

仅使用核心 TTS（无覆盖）：

```json5
{
  messages: {
    tts: {
      provider: "openai",
      openai: { voice: "alloy" },
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
            openai: {
              model: "gpt-4o-mini-tts",
              voice: "marin",
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

### Spoken output contract

For auto-responses, Voice Call appends a strict spoken-output contract to the system prompt:

- `{"spoken":"..."}`

Voice Call then extracts speech text defensively:

- Ignores payloads marked as reasoning/error content.
- Parses direct JSON, fenced JSON, or inline `"spoken"` keys.
- Falls back to plain text and removes likely planning/meta lead-in paragraphs.

This keeps spoken playback focused on caller-facing text and avoids leaking planning text into audio.

### Conversation startup behavior

For outbound `conversation` calls, first-message handling is tied to live playback state:

- Barge-in queue clear and auto-response are suppressed only while the initial greeting is actively speaking.
- If initial playback fails, the call returns to `listening` and the initial message remains queued for retry.
- Initial playback for Twilio streaming starts on stream connect without extra delay.

### Twilio stream disconnect grace

When a Twilio media stream disconnects, Voice Call waits `2000ms` before auto-ending the call:

- If the stream reconnects during that window, auto-end is canceled.
- If no stream is re-registered after the grace period, the call is ended to prevent stuck active calls.

## CLI

```bash
openclaw voicecall call --to "+15555550123" --message "Hello from OpenClaw"
openclaw voicecall start --to "+15555550123"   # alias for call
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall speak --call-id <id> --message "One moment"
openclaw voicecall end --call-id <id>
openclaw voicecall status --call-id <id>
openclaw voicecall tail
openclaw voicecall latency                     # summarize turn latency from logs
openclaw voicecall expose --mode funnel
```

`latency` reads `calls.jsonl` from the default voice-call storage path. Use
`--file <path>` to point at a different log and `--last <n>` to limit analysis
to the last N records (default 200). Output includes p50/p90/p99 for turn
latency and listen-wait times.

## Agent tool

工具名称：`voice_call`

动作：

- `initiate_call`（message, to?，mode?）
- `continue_call`（callId，message）
- `speak_to_user`（callId，message）
- `end_call`（callId）
- `get_status`（callId）

本仓库附带匹配的技能文档，位于 `skills/voice-call/SKILL.md`。

## 网关 RPC

- `voicecall.initiate`（`to?`, `message`, `mode?`）
- `voicecall.continue`（`callId`, `message`）
- `voicecall.speak`（`callId`, `message`）
- `voicecall.end`（`callId`）
- `voicecall.status`（`callId`）
