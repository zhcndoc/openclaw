---
summary: "通过 Twilio、Telnyx 或 Plivo 发起外呼并接听来电，可选支持实时语音和流式转录"
read_when:
  - 你想从 OpenClaw 发起外呼语音通话
  - 你正在配置或开发语音通话插件
  - 你需要在电话系统上使用实时语音或流式转录
title: "语音通话插件"
sidebarTitle: "语音通话"
---

通过插件为 OpenClaw 提供语音通话：外呼通知、多轮
对话、全双工实时语音、流式转录，以及
带有允许列表策略的来电。

**Providers:** `mock`（开发环境，无网络）、`plivo`（语音 API + XML 转接 +
GetInput 语音）、`telnyx`（Call Control v2）、`twilio`（可编程语音 +
Media Streams）。

<Note>
语音通话插件运行在 **Gateway 进程内部**。如果你使用
远程 Gateway，请在运行 Gateway 的机器上安装并配置该插件，
然后重启 Gateway 以加载它。
</Note>

## 快速开始

<Steps>
  <Step title="安装插件">
    <Tabs>
      <Tab title="通过 npm">
        ```bash
        openclaw plugins install @openclaw/voice-call
        ```
      </Tab>
      <Tab title="从本地文件夹安装（开发）">
        ```bash
        PLUGIN_SRC=./path/to/local/voice-call-plugin
        openclaw plugins install "$PLUGIN_SRC"
        cd "$PLUGIN_SRC" && pnpm install
        ```
      </Tab>
    </Tabs>

    使用裸包以跟随当前发布标签。只有在需要可复现安装时才固定
    精确版本。之后重启 Gateway，以便插件加载。

  </Step>
  <Step title="配置 provider 和 webhook">
    在 `plugins.entries.voice-call.config` 下设置配置（见下面的
    [配置](#configuration)）。至少需要：`provider`、provider
    凭据、`fromNumber`，以及一个可公开访问的 webhook URL。
  </Step>
  <Step title="验证设置">
    ```bash
    openclaw voicecall setup
    openclaw voicecall setup --json
    ```

    检查插件是否启用、provider 凭据、webhook 暴露情况，以及
    是否只启用了一个音频模式（`streaming` 或 `realtime`）。

  </Step>
  <Step title="冒烟测试">
    ```bash
    openclaw voicecall smoke
    openclaw voicecall smoke --to "+15555550123"
    ```

    默认情况下两者都是 dry run。添加 `--yes` 可发起一通简短的
    外呼通知电话：

    ```bash
    openclaw voicecall smoke --to "+15555550123" --yes
    ```

  </Step>
</Steps>

<Warning>
对于 Twilio、Telnyx 和 Plivo，设置必须解析为一个 **可公开访问的 webhook URL**。
如果 `publicUrl`、tunnel URL、Tailscale URL 或 serve 回退
解析到回环地址或私有网络空间，设置将失败，而不会
启动一个无法接收运营商 webhook 的提供商。
</Warning>

## 配置

如果 `enabled: true` 但所选提供商缺少凭据，Gateway 启动时会记录一条 setup-incomplete 警告，指出缺失的键，并跳过运行时启动。命令、RPC 调用和代理工具在使用时仍会返回精确缺失的配置。

<Note>
语音通话凭据支持 SecretRef。`plugins.entries.voice-call.config.twilio.authToken`、`plugins.entries.voice-call.config.realtime.providers.*.apiKey`、`plugins.entries.voice-call.config.streaming.providers.*.apiKey` 和 `plugins.entries.voice-call.config.tts.providers.*.apiKey` 会通过标准 SecretRef 接口解析；请参见 [SecretRef 凭据接口](/reference/secretref-credential-surface)。
</Note>

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio", // 或 "telnyx" | "plivo" | "mock"
          fromNumber: "+15550001234", // Twilio 也可以使用 TWILIO_FROM_NUMBER
          toNumber: "+15550005678",
          sessionScope: "per-phone", // per-phone | per-call
          numbers: {
            "+15550009999": {
              inboundGreeting: "Silver Fox Cards，您好，我能帮您什么？",
              responseSystemPrompt: "你是一位简明扼要的棒球卡专家。",
              tts: {
                providers: {
                  openai: { speakerVoice: "alloy" },
                },
              },
            },
          },

          twilio: {
            accountSid: "ACxxxxxxxx",
            authToken: "...",
            // region: "ie1", // 可选：us1 | ie1 | au1；默认为 us1
          },
          telnyx: {
            apiKey: "...",
            connectionId: "...",
            // 来自 Mission Control Portal 的 Telnyx webhook 公钥
            //（Base64；也可以通过 TELNYX_PUBLIC_KEY 设置）。
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

          // Webhook 安全性（建议用于 tunnel/proxy）
          webhookSecurity: {
            allowedHosts: ["voice.example.com"],
            trustedProxyIPs: ["100.64.0.1"],
          },

          // 公共暴露方式（任选其一）
          // publicUrl: "https://example.ngrok.app/voice/webhook",
          // tunnel: { provider: "ngrok" },
          // tailscale: { mode: "funnel", path: "/voice/webhook" },

          outbound: {
            defaultMode: "notify", // notify | conversation
          },

          streaming: { enabled: true /* 仅 Twilio；参见流式转写 */ },
          realtime: { enabled: false /* 参见实时语音对话 */ },
        },
      },
    },
  },
}
```

### 配置参考

`plugins.entries.voice-call.config` 下未在上面显示的顶层键：

| Key                             | Default      | Notes                                                                                              |
| ------------------------------- | ------------ | -------------------------------------------------------------------------------------------------- |
| `enabled`                       | `false`      | Master on/off switch.                                                                              |
| `inboundPolicy`                 | `"disabled"` | `disabled` \| `allowlist` \| `pairing` \| `open`. See [Inbound calls](#inbound-calls).             |
| `allowFrom`                     | `[]`         | E.164 allowlist for `inboundPolicy: "allowlist"`.                                                  |
| `maxDurationSeconds`            | `300`        | Hard per-call duration cap, enforced regardless of answered state.                                 |
| `staleCallReaperSeconds`        | `120`        | See [Stale call reaper](#stale-call-reaper). `0` disables it.                                      |
| `silenceTimeoutMs`              | `800`        | End-of-speech silence detection for the classic (non-realtime) flow.                               |
| `transcriptTimeoutMs`           | `180000`     | Max wait for a caller transcript before giving up on a turn.                                       |
| `ringTimeoutMs`                 | `30000`      | Ring timeout for outbound calls.                                                                   |
| `maxConcurrentCalls`            | `1`          | Outbound calls beyond this limit are rejected.                                                     |
| `outbound.notifyHangupDelaySec` | `3`          | Seconds to wait after TTS before auto-hangup in notify mode.                                       |
| `skipSignatureVerification`     | `false`      | Local testing only; never enable in production.                                                    |
| `store`                         | unset        | Overrides the default `$OPENCLAW_STATE_DIR/voice-calls` path (normally `~/.openclaw/voice-calls`). |
| `agentId`                       | `"main"`     | Agent used for response generation and session storage.                                            |
| `responseModel`                 | unset        | Overrides the default model for classic (non-realtime) responses.                                  |
| `responseSystemPrompt`          | generated    | Custom system prompt for classic responses.                                                        |
| `responseTimeoutMs`             | `30000`      | Timeout for classic response generation (ms).                                                      |

Twilio 默认使用其 US1 REST 端点。要在受支持的非美国区域处理通话，请将 `twilio.region` 设置为 `ie1` 或 `au1`，并使用该区域的凭据。请参见 [Twilio 的非美国 REST API 指南](https://www.twilio.com/docs/global-infrastructure/using-the-twilio-rest-api-in-a-non-us-region)。

<AccordionGroup>
  <Accordion title="提供商暴露与安全说明">
    - Twilio、Telnyx 和 Plivo 都需要一个**可公开访问**的 webhook URL。
    - `mock` 是本地开发提供商（不进行网络调用）。
    - Telnyx 需要 `telnyx.publicKey`（或 `TELNYX_PUBLIC_KEY`），除非 `skipSignatureVerification` 为 true。
    - `skipSignatureVerification` 仅用于本地测试。
    - 在 ngrok 免费套餐下，请将 `publicUrl` 设置为精确的 ngrok URL；始终会强制进行签名验证。
    - `tunnel.allowNgrokFreeTierLoopbackBypass: true` 仅当 `tunnel.provider="ngrok"` 且 `serve.bind` 为 loopback（ngrok 本地代理）时，才允许使用无效签名的 Twilio webhook。仅限本地开发。
    - ngrok 免费套餐的 URL 可能会变化或增加中间页行为；如果 `publicUrl` 发生漂移，Twilio 签名将失败。生产环境：优先使用稳定域名或 Tailscale funnel。

  </Accordion>
  <Accordion title="流式连接上限">
    - `streaming.preStartTimeoutMs`（默认 `5000`）会关闭从未发送有效 `start` 帧的 socket。
    - `streaming.maxPendingConnections`（默认 `32`）限制未认证、未开始的 socket 总数。
    - `streaming.maxPendingConnectionsPerIp`（默认 `4`）限制每个源 IP 的未认证、未开始 socket 数。
    - `streaming.maxConnections`（默认 `128`）限制所有打开的媒体流 socket（pending + active）。

  </Accordion>
  <Accordion title="旧配置迁移">
    配置解析会自动规范化这些旧键，并记录一条警告，说明替换路径；该兼容层将在未来版本（`2026.6.0`）移除，因此请运行 `openclaw doctor --fix` 将已提交的配置重写为规范形态：

    - `provider: "log"` → `provider: "mock"`
    - `twilio.from` → `fromNumber`
    - `streaming.sttProvider` → `streaming.provider`
    - `streaming.openaiApiKey` → `streaming.providers.openai.apiKey`
    - `streaming.sttModel` → `streaming.providers.openai.model`
    - `streaming.silenceDurationMs` → `streaming.providers.openai.silenceDurationMs`
    - `streaming.vadThreshold` → `streaming.providers.openai.vadThreshold`
    - `realtime.agentContext.includeSystemPrompt` 已移除（realtime 上下文现在使用生成的代理提示词）

  </Accordion>
</AccordionGroup>

## 会话范围

默认情况下，Voice Call 使用 `sessionScope: "per-phone"`，因此来自
同一来电者的重复通话会保留对话记忆。若每个运营商通话都应以新的上下文开始，
例如接待、预订、IVR，或 Google Meet bridge 流程中同一电话号码可能
代表不同会议时，请设置为 `sessionScope: "per-call"`。

Voice Call 会将生成的会话密钥存储在已配置的 agent 命名空间下
（`agent:<agentId>:voice:*`）。原始的显式集成密钥会解析到同一命名空间：
一个规范化的 `agent:<configuredAgentId>:*` 密钥会保留其所有者，并遵循核心的
`session.mainKey`/global-scope 别名规则；外部或格式错误的 `agent:*`
输入会作为一个不透明密钥，归入已配置的 agent 下；`global` 和 `unknown`
则保持为全局哨兵值。

## 实时语音对话

`realtime` 为实时通话音频选择一个全双工实时语音提供商。
它与 `streaming` 是分开的，后者只会把音频转发给实时
转录提供商。

<Warning>
`realtime.enabled` 不能与 `streaming.enabled` 组合使用。每个通话只能选择一种
音频模式。
</Warning>

当前运行时行为：

- `realtime.enabled` 支持 Twilio 和 Telnyx。
- `realtime.provider` 是可选项。如果未设置，Voice Call 会使用第一个已注册的实时语音提供商。
- 内置实时语音提供商：Google Gemini Live（`google`）和 OpenAI（`openai`），由其提供商插件注册。
- 提供商专属原始配置位于 `realtime.providers.<providerId>` 下。
- Voice Call 默认暴露共享的 `openclaw_agent_consult` 实时工具。实时模型在调用者请求更深入推理、当前信息或常规 OpenClaw 工具时可以调用它。
- `realtime.consultPolicy` 可选地添加指引，说明实时模型何时应调用 `openclaw_agent_consult`。
- `realtime.agentContext.enabled` 默认关闭。启用后，Voice Call 会在会话设置时将受限的代理身份以及选定的 workspace 文件胶囊注入到实时提供商指令中。
- `realtime.fastContext.enabled` 默认关闭。启用后，Voice Call 会先在索引的记忆/会话上下文中搜索 consult 问题，并在 `realtime.fastContext.timeoutMs` 内将这些片段返回给实时模型；只有当 `realtime.fastContext.fallbackToConsult` 为 true 时，才会回退到完整的 consult 代理。
- 如果 `realtime.provider` 指向未注册的提供商，或者完全没有注册任何实时语音提供商，Voice Call 会记录警告并跳过实时媒体，而不会使整个插件失败。
- 当 `realtime.enabled` 为 true 时，`inboundPolicy` 不能是 `"disabled"`；`validateProviderConfig` 会拒绝这种组合。
- 当可用时，Consult 会话 key 会复用已存储的通话会话，然后再回退到配置的 `sessionScope`（默认 `per-phone`，隔离通话时为 `per-call`）。

### 工具策略

`realtime.toolPolicy` 控制 consult 运行：

| 策略           | 行为                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `safe-read-only` | 暴露 consult 工具，并将常规代理限制为 `read`、`web_search`、`web_fetch`、`x_search`、`memory_search` 和 `memory_get`。 |
| `owner`          | 暴露 consult 工具，并允许常规代理使用正常的代理工具策略。                                                      |
| `none`           | 不暴露 consult 工具。自定义 `realtime.tools` 仍会传递给实时提供商。                               |

`realtime.consultPolicy` 仅控制实时模型指令：

| Policy        | Guidance                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------- |
| `auto`        | 保持默认提示，并让提供商自行决定何时调用 consult 工具。              |
| `substantive` | 直接回答简单的对话衔接内容，并在事实、记忆、工具或上下文之前先进行 consult。 |
| `always`      | 在每个实质性回答之前先 consult。                                                        |

### 代理语音上下文

当语音桥需要听起来像配置的 OpenClaw 代理，同时又不想在普通轮次中支付完整 agent-consult 往返成本时，启用 `realtime.agentContext`。上下文胶囊会在实时会话创建时添加一次，因此不会增加每轮延迟。对 `openclaw_agent_consult` 的调用仍会运行完整的 OpenClaw 代理，并且应当用于工具工作、当前信息、记忆查询或 workspace 状态。

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          agentId: "main",
          realtime: {
            enabled: true,
            provider: "google",
            toolPolicy: "safe-read-only",
            consultPolicy: "substantive",
            agentContext: {
              enabled: true,
              maxChars: 6000,
              includeIdentity: true,
              includeWorkspaceFiles: true,
              files: ["SOUL.md", "IDENTITY.md", "USER.md"],
            },
          },
        },
      },
    },
  },
}
```

### 实时提供商示例

<Tabs>
  <Tab title="Google Gemini Live">
    默认值：API key 来自 `realtime.providers.google.apiKey`、`GEMINI_API_KEY`
    或 `GOOGLE_API_KEY`；模型为 `gemini-3.1-flash-live-preview`；
    语音为 `Kore`。`sessionResumption` 和 `contextWindowCompression` 默认开启，
    适用于更长、可重新连接的通话。可使用 `silenceDurationMs`、
    `startSensitivity` 和 `endSensitivity` 来调优电话音频中的更快轮次切换。

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
                instructions: "简短说话。在使用更深层工具之前先调用 openclaw_agent_consult。",
                toolPolicy: "safe-read-only",
                consultPolicy: "substantive",
                consultThinkingLevel: "low",
                consultFastMode: true,
                agentContext: { enabled: true },
                providers: {
                  google: {
                    apiKey: "${GEMINI_API_KEY}",
                    model: "gemini-3.1-flash-live-preview",
                    speakerVoice: "Kore",
                    silenceDurationMs: 500,
                    startSensitivity: "high",
                  },
                },
              },
            },
          },
        },
      },
    }
    ```

  </Tab>
  <Tab title="OpenAI">
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
                  openai: { apiKey: "${OPENAI_API_KEY}" },
                },
              },
            },
          },
        },
      },
    }
    ```
  </Tab>
</Tabs>

请参见 [Google provider](/providers/google) 和
[OpenAI provider](/providers/openai)，了解各提供商特定的实时语音
选项。

## 流式转录

`streaming` 将 Twilio Media Streams 连接到实时转录提供商。
经典的流式路径需要 `provider: "twilio"`；与 Telnyx、Plivo 或 mock 的
配置会被拒绝。Telnyx 实时音频则使用单独认证的
`realtime.enabled` 路径。

当前运行时行为：

- `streaming.provider` 是可选项。如果未设置，Voice Call 会使用第一个已注册的实时转录提供商。
- 内置实时转录提供商：Deepgram（`deepgram`）、ElevenLabs（`elevenlabs`）、Mistral（`mistral`）、OpenAI（`openai`）和 xAI（`xai`），由其提供商插件注册。
- 提供商专属原始配置位于 `streaming.providers.<providerId>` 下。
- Twilio 发送已接受的 stream `start` 消息后，Voice Call 会立即注册该流，在提供商连接期间通过转录提供商排队传入媒体，并且只有在实时转录就绪后才开始初始问候语。
- 如果 `streaming.provider` 指向未注册的提供商，或未注册任何提供商，Voice Call 会记录警告并跳过媒体流，而不是使整个插件失败。

### 流式提供商示例

<Tabs>
  <Tab title="OpenAI">
    默认值：API key 为 `streaming.providers.openai.apiKey` 或
    `OPENAI_API_KEY`；模型为 `gpt-4o-transcribe`；`silenceDurationMs: 800`；
    `vadThreshold: 0.5`。

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
                    apiKey: "sk-...", // 如果设置了 OPENAI_API_KEY，则为可选项
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

  </Tab>
  <Tab title="xAI">
    默认值：API key 为 `streaming.providers.xai.apiKey` 或 `XAI_API_KEY`（如果两者都未设置，则回退到 xAI OAuth 认证配置文件）；端点
    `wss://api.x.ai/v1/stt`；编码 `mulaw`；采样率 `8000`；
    `endpointingMs: 800`；`interimResults: true`。

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
                    apiKey: "${XAI_API_KEY}", // 如果设置了 XAI_API_KEY，则为可选项
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

  </Tab>
</Tabs>

## 通话 TTS

Voice Call uses the core `tts` configuration for streaming speech on
calls. You can override it under the plugin config with the **same shape** —
it deep-merges with `tts`.

```json5
{
  tts: {
    provider: "elevenlabs",
    providers: {
      elevenlabs: {
        speakerVoiceId: "pMsXgVXv3BLzUgSXRplE",
        modelId: "eleven_multilingual_v2",
      },
    },
  },
}
```

<Warning>
**Microsoft 语音会被通话忽略。** 电话合成需要一个实现 telephony-target 输出的提供商；Microsoft 语音提供商不支持，因此在通话中会被跳过，并改为尝试回退链中的其他提供商。
</Warning>

行为说明：

- 插件配置内的旧版 `tts.<provider>` key（`openai`、`elevenlabs`、`microsoft`、`edge`）会被 `openclaw doctor --fix` 修复；已提交配置应使用 `tts.providers.<provider>`。
- 当启用 Twilio media streaming 时，会使用核心 TTS；否则通话会回退到提供商原生语音。
- 如果 Twilio media stream 已经处于活动状态，Voice Call 不会回退到 TwiML `<Say>`。如果此状态下电话 TTS 不可用，播放请求会失败，而不会混合两条播放路径。
- 当电话 TTS 回退到次级提供商时，Voice Call 会记录一条警告，其中包含提供商链（`from`、`to`、`attempts`）以便调试。
- 当 Twilio barge-in 或 stream 终止清空待处理的 TTS 队列时，排队中的播放请求会正常结束，而不会让等待播放完成的呼叫者挂起。

### TTS 示例

<Tabs>
  <Tab title="仅使用核心 TTS">
```json5
{
  tts: {
    provider: "openai",
    providers: {
      openai: { speakerVoice: "alloy" },
    },
  },
}
```
  </Tab>
  <Tab title="覆盖为 ElevenLabs（仅通话）">
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
                speakerVoiceId: "pMsXgVXv3BLzUgSXRplE",
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
  </Tab>
  <Tab title="OpenAI 模型覆盖（深度合并）">
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
                speakerVoice: "marin",
              },
            },
          },
        },
      },
    },
  },
}
```
  </Tab>
</Tabs>

## 呼入电话

呼入策略默认是 `disabled`。要启用呼入电话，请设置：

```json5
{
  inboundPolicy: "allowlist",
  allowFrom: ["+15550001234"],
  inboundGreeting: "你好！我能为你做些什么？",
}
```

<Warning>
`inboundPolicy: "allowlist"` 是一种低保证级别的来电显示筛选。该插件会
规范化服务提供商提供的 `From` 值，并将其与 `allowFrom` 进行比较。
Webhook 验证会认证服务提供商的投递和载荷完整性，
但它**不能**证明 PSTN/VoIP 来电号码的所有权。请将
`allowFrom` 视为来电显示过滤，而不是强身份验证。
</Warning>

自动响应使用 agent 系统。可通过 `responseModel`、
`responseSystemPrompt` 和 `responseTimeoutMs` 进行调优。

### 按号码路由

当一个 Voice Call 插件接收多个电话号码的来电，并且每个号码都应表现得像不同线路时，请使用 `numbers`。例如，
一个号码可以使用随意的私人助手风格，而另一个使用商务
人设、不同的响应 agent，以及不同的 TTS 声音。

路由会根据服务提供商提供的被拨叫 `To` 号码进行选择。键必须
是 E.164 格式号码。来电到达时，Voice Call 会解析匹配的
路由一次，将匹配到的路由存储在通话记录上，并在问候语、经典自动响应路径、实时
咨询路径以及 TTS 播放中复用该有效配置。如果没有路由匹配，则使用全局 Voice Call
配置。外拨电话不会使用 `numbers`；发起通话时请显式传入外拨
目标、消息和会话。

当前支持的路由覆盖项：

- `inboundGreeting`
- `tts`
- `agentId`
- `responseModel`
- `responseSystemPrompt`
- `responseTimeoutMs`

`tts` 路由值会覆盖并深度合并到全局 Voice Call `tts` 配置之上，因此通常只需覆盖提供商语音：

```json5
{
  inboundGreeting: "来自主线路的问候。",
  responseSystemPrompt: "你是默认的语音助手。",
  tts: {
    provider: "openai",
    providers: {
      openai: { speakerVoice: "coral" },
    },
  },
  numbers: {
    "+15550001111": {
      inboundGreeting: "Silver Fox Cards，有什么可以帮您？",
      responseSystemPrompt: "你是一位简洁的棒球卡专家。",
      tts: {
        providers: {
          openai: { speakerVoice: "alloy" },
        },
      },
    },
  },
}
```

### 口语输出契约

对于自动响应，Voice Call 会在系统提示中附加一个严格的口语输出契约，要求返回 `{"spoken":"..."}` 的 JSON。Voice Call 会以防御性方式提取语音文本：

- 忽略标记为推理/错误内容的载荷。
- 解析直接 JSON、带围栏的 JSON 或内联 `"spoken"` 键。
- 回退到纯文本，并移除可能的规划/元信息开头段落。

这可使语音播放专注于面向来电者的文本，并避免将规划文本泄漏到音频中。

### 会话启动行为

对于外拨 `conversation` 呼叫，首条消息的处理与实时播放状态相关：

- 只有在初始问候正在播放时，才会抑制插话队列清理和自动响应。
- 如果初始播放失败，通话会回到 `listening`，并且初始消息会保留在队列中以便重试。
- Twilio streaming 的初始播放会在 stream connect 时立即开始，不会额外延迟。
- 插话会中止当前播放，并清除已排队但尚未播放的 Twilio TTS 条目。被清除的条目会以 skipped 方式解决，因此后续响应逻辑可以继续，而无需等待永远不会播放的音频。
- Realtime 语音会话使用 realtime stream 自己的开场轮次。Voice Call **不会** 为该初始消息发布旧版 `<Say>` TwiML 更新，因此外拨 `<Connect><Stream>` 会话会保持连接。

### Twilio 流断开宽限期

当 Twilio media stream 断开时，Voice Call 会等待 **2000 ms** 后才
自动结束通话：

- 如果 stream 在该窗口内重新连接，自动结束会被取消。
- 如果宽限期结束后没有新的 stream 重新注册，则通话会结束，以防止卡住的活跃通话。

## 陈旧通话清理器

使用 `staleCallReaperSeconds`（默认值为 **120**）来结束那些从未接听、也从未进入实时对话状态的通话，例如通知模式下运营商从未发送终止 webhook 的通话。将其设为 `0` 可禁用。

清理器每 30 秒运行一次，并且只会结束那些没有 `answeredAt` 时间戳、且尚未处于终态或实时（`speaking`/`listening`）状态的通话，因此已接听的对话永远不会被这个定时器清理；`maxDurationSeconds`（默认值 300）则是另一项上限，用于结束持续时间过长的已接听通话。

对于通知式流程，如果运营商发送响铃/接听 webhook 的速度较慢，可以将 `staleCallReaperSeconds` 调高到默认值以上，以免把正常但较慢的通话过早清理；`120`-`300` 秒是一个合理的生产环境范围。

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          maxDurationSeconds: 300,
          staleCallReaperSeconds: 120,
        },
      },
    },
  },
}
```

## Webhook 安全

当代理或隧道位于 Gateway 前方时，插件会重建用于签名验证的公共 URL。以下选项用于控制哪些转发头被信任：

<ParamField path="webhookSecurity.allowedHosts" type="string[]">
  允许来自转发头的主机白名单。
</ParamField>
<ParamField path="webhookSecurity.trustForwardingHeaders" type="boolean">
  在没有白名单的情况下信任转发头。
</ParamField>
<ParamField path="webhookSecurity.trustedProxyIPs" type="string[]">
  仅当请求的远程 IP 与列表匹配时才信任转发头。
</ParamField>

其他保护措施：

- 对于 Twilio、Telnyx 和 Plivo，Webhook **重放防护**已启用。重放的有效 webhook 请求会被确认，但会跳过副作用处理。
- Twilio 对话轮次会在 `<Gather>` 回调中包含每轮的 token，因此过期/重放的语音回调无法满足更新的待处理转写轮次。
- 当提供方所需的签名头缺失时，未认证的 webhook 请求会在读取正文之前被拒绝。
- 语音通话 webhook 在签名验证之前使用共享的预认证正文读取配置文件（最大 64 KB 正文、5 秒读取超时），并为每个 key 设置进行中的请求上限（默认每个 key 8 个并发请求）。

具有稳定公共主机的示例：

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

## CLI

```bash
openclaw voicecall call --to "+15555550123" --message "你好，来自 OpenClaw"
openclaw voicecall start --to "+15555550123"   # call 的别名
openclaw voicecall continue --call-id <id> --message "有什么问题吗？"
openclaw voicecall speak --call-id <id> --message "稍等一下"
openclaw voicecall dtmf --call-id <id> --digits "ww123456#"
openclaw voicecall end --call-id <id>
openclaw voicecall status --call-id <id>
openclaw voicecall tail
openclaw voicecall latency                      # 从日志汇总轮次延迟
openclaw voicecall expose --mode funnel
```

当 Gateway 已经运行时，`voicecall` 的操作命令会委托给由 Gateway 管理的 voice-call 运行时，因此 CLI 不会再绑定第二个 webhook 服务器。如果找不到可用的 Gateway，这些命令会回退到独立的 CLI 运行时。

`latency` 会从默认的 voice-call 存储路径读取 `calls.jsonl`。使用 `--file <path>` 可以指定其他日志文件，使用 `--last <n>` 可以将分析限制为最后 N 条记录（默认 200）。输出包含轮次延迟和听取等待时间的最小值/最大值/平均值、p50 和 p95。

## Agent 工具

工具名称：`voice_call`。

| Action          | Args                                       |
| --------------- | ------------------------------------------ |
| `initiate_call` | `message`, `to?`, `mode?`, `dtmfSequence?` |
| `continue_call` | `callId`, `message`                        |
| `speak_to_user` | `callId`, `message`                        |
| `send_dtmf`     | `callId`, `digits`                         |
| `end_call`     | `callId`                                   |
| `get_status`     | `callId`                                   |

voice-call 插件附带一个匹配的 agent 技能。

## 网关 RPC

| 方法                      | 参数                                                             | 说明                                                                     |
| --------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `voicecall.initiate`        | `to?`, `message`, `mode?`, `sessionKey?`, `requesterSessionKey?` | 当省略 `to` 时，回退使用 `toNumber` 配置。                                 |
| `voicecall.start`           | `to`, `message?`, `mode?`, `dtmfSequence?`, `sessionKey?`        | 与 `initiate` 相同，但也接受连接前的 `dtmfSequence`。                     |
| `voicecall.continue`        | `callId`, `message`                                              | 阻塞直到当前轮次完成；返回转录内容。                                       |
| `voicecall.continue.start`  | `callId`, `message`                                              | 异步版本：立即返回一个 `operationId`。                                    |
| `voicecall.continue.result` | `operationId`                                                    | 轮询一个待处理的 `voicecall.continue.start` 操作以获取结果。              |
| `voicecall.speak`           | `callId`, `message`                                              | 立即播放而不等待；在 `realtime.enabled` 时使用实时桥接。                   |
| `voicecall.dtmf`            | `callId`, `digits`                                               |                                                                           |
| `voicecall.end`             | `callId`                                                         |                                                                           |
| `voicecall.status`          | `callId?`                                                        | 省略 `callId` 可列出所有活动通话。                                         |

`dtmfSequence` 仅在 `mode: "conversation"` 时有效；notify 模式的通话
如果需要在连接后发送按键，应在通话建立后使用 `voicecall.dtmf`。

## 故障排查

### Setup fails webhook exposure

从运行 Gateway 的相同环境中运行 setup：

```bash
openclaw voicecall setup
openclaw voicecall setup --json
```

对于 `twilio`、`telnyx` 和 `plivo`，`webhook-exposure` 必须为绿色。即使配置了 `publicUrl`，当它指向本地或私有网络地址时仍然会失败，因为运营商无法回拨到这些地址。不要将 `localhost`、`127.0.0.1`、`0.0.0.0`、`10.x`、`172.16.x`-`172.31.x`、`192.168.x`、`169.254.x`、`fc00::/7`、`fd00::/8`，或其他 carrier-grade-NAT 地址段用作 `publicUrl`。

Twilio notify-mode outbound calls 会在 create-call 请求中直接发送其初始 `<Say>` TwiML，因此第一条播报消息不依赖于 Twilio 获取 webhook TwiML。即便如此，状态回调、会话通话、预连接 DTMF、实时流以及连接后通话控制仍然需要一个公共 webhook。

使用一种公共暴露路径：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          publicUrl: "https://voice.example.com/voice/webhook",
          // 或
          tunnel: { provider: "ngrok" },
          // 或
          tailscale: { mode: "funnel", path: "/voice/webhook" },
        },
      },
    },
  },
}
```

更改配置后，重启或重新加载 Gateway，然后运行：

```bash
openclaw voicecall setup
openclaw voicecall smoke
```

除非你传入 `--yes`，否则 `voicecall smoke` 只是一次 dry run。

### Provider credentials fail

检查所选提供商以及所需的凭据字段：

- Twilio: `twilio.accountSid`、`twilio.authToken` 和 `fromNumber`，或
  `TWILIO_ACCOUNT_SID`、`TWILIO_AUTH_TOKEN` 和 `TWILIO_FROM_NUMBER`。
- Telnyx: `telnyx.apiKey`、`telnyx.connectionId`、`telnyx.publicKey` 和
  `fromNumber`，或 `TELNYX_API_KEY`、`TELNYX_CONNECTION_ID` 和
  `TELNYX_PUBLIC_KEY`。
- Plivo: `plivo.authId`、`plivo.authToken` 和 `fromNumber`，或
  `PLIVO_AUTH_ID` 和 `PLIVO_AUTH_TOKEN`。

凭据必须存在于 Gateway 主机上。编辑本地 shell 配置文件不会影响已经运行的 Gateway，直到它重启或重新加载其环境。

### Calls start but provider webhooks do not arrive

确认提供商控制台指向的是精确的公共 webhook URL：

```text
https://voice.example.com/voice/webhook
```

然后检查运行时状态：

```bash
openclaw voicecall status --call-id <id>
openclaw voicecall tail
openclaw logs --follow
```

常见原因：

- `publicUrl` 指向的路径与 `serve.path` 不同。
- Gateway 启动后隧道 URL 发生了变化。
- 代理转发了请求，但移除了或重写了 host/proto 头。
- 防火墙或 DNS 将公共主机名路由到了 Gateway 之外的地方。
- Gateway 在未启用 Voice Call 插件的情况下重启了。

当反向代理或隧道位于 Gateway 前方时，将 `webhookSecurity.allowedHosts` 设置为公共主机名，或者对已知代理地址使用 `webhookSecurity.trustedProxyIPs`。仅当代理边界由你控制时，才使用 `webhookSecurity.trustForwardingHeaders`。

### Signature verification fails

提供商签名是针对 OpenClaw 根据传入请求重建的公共 URL 进行检查的。如果签名失败：

- 确认提供商 webhook URL 与 `publicUrl` 完全一致，包括 scheme、host 和 path。
- 对于 ngrok 免费层级的 URL，当隧道主机名变化时更新 `publicUrl`。
- 确保代理保留原始的 host 和 proto 头，或者配置 `webhookSecurity.allowedHosts`。
- 不要在本地测试之外启用 `skipSignatureVerification`。

### Google Meet Twilio joins fail

Google Meet 使用此插件来完成 Twilio 拨入加入。首先验证 Voice Call：

```bash
openclaw voicecall setup
openclaw voicecall smoke --to "+15555550123"
```

然后显式验证 Google Meet 传输：

```bash
openclaw googlemeet setup --transport twilio
```

如果 Voice Call 是绿色的，但参会者始终未加入，请检查 Meet 的拨入号码、PIN 以及 `--dtmf-sequence`。电话呼叫本身可能是正常的，但会议会拒绝或忽略错误的 DTMF 序列。

Google Meet 通过带有预连接 DTMF 序列的 `voicecall.start` 启动 Twilio 电话链路。基于 PIN 生成的序列会包含 Google Meet 插件的 `voiceCall.dtmfDelayMs`（默认 **12000 ms**）作为前导 Twilio 等待数字，因为 Meet 的拨入提示可能会延迟到达。随后 Voice Call 会在请求介绍语音之前切回实时处理。

使用 `openclaw logs --follow` 查看实时阶段追踪。健康的 Twilio Meet 加入日志顺序如下：

- Google Meet 将 Twilio 加入委托给 Voice Call。
- Voice Call 存储预连接 DTMF TwiML。
- 在实时处理之前，Twilio 初始 TwiML 被消耗并提供。
- Voice Call 为 Twilio 呼叫提供实时 TwiML。
- Google Meet 在 post-DTMF 延迟后使用 `voicecall.speak` 请求介绍语音。

`openclaw voicecall tail` 仍然会显示已持久化的通话记录；它对通话状态和转录很有用，但并不是每个 webhook/实时转换都会出现在那里。

### Realtime call has no speech

确认只启用了一个音频模式：`realtime.enabled` 和
`streaming.enabled` 不能同时为 true。

对于实时 Twilio/Telnyx 呼叫，还要验证：

- 已加载并注册实时提供商插件。
- `realtime.provider` 未设置，或指定了一个已注册的提供商。
- 提供商 API key 对 Gateway 进程可用。
- `openclaw logs --follow` 显示已提供实时 TwiML、实时桥接已启动，并且初始问候语已排队。

## 相关内容

- [对话模式](/nodes/talk)
- [文本转语音](/tools/tts)
- [语音唤醒](/nodes/voicewake)
