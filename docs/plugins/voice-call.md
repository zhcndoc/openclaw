---
summary: "通过 Twilio、Telnyx 或 Plivo 发起外呼并接听来电，可选支持实时语音和流式转录"
read_when:
  - 你想从 OpenClaw 发起外呼语音通话
  - 你正在配置或开发语音通话插件
  - 你需要在电话系统上使用实时语音或流式转录
title: "语音通话插件"
sidebarTitle: "语音通话"
---

通过插件为 OpenClaw 提供语音通话功能。支持外呼通知、
多轮对话、全双工实时语音、流式
转录，以及带白名单策略的来电接听。

**当前提供商：** `twilio`（Programmable Voice + Media Streams）、
`telnyx`（Call Control v2）、`plivo`（Voice API + XML transfer + GetInput
speech）、`mock`（开发/无网络）。

<Note>
语音通话插件运行在 **Gateway 进程内部**。如果你使用远程 Gateway，请在运行 Gateway 的机器上安装并配置该插件，然后重启 Gateway 以加载它。
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

    使用裸包可跟随当前官方发布标签。只有在需要可复现安装时，才固定到
    精确版本。

    随后重启 Gateway 以便插件加载。

  </Step>
  <Step title="配置提供商和 webhook">
    在 `plugins.entries.voice-call.config` 下设置配置（完整结构请参见下面的
    [Configuration](#configuration)）。至少需要：
    `provider`、提供商凭据、`fromNumber`，以及一个可公开访问的 webhook URL。
  </Step>
  <Step title="验证设置">
    ```bash
    openclaw voicecall setup
    ```

    默认输出可在聊天日志和终端中阅读。它会检查
    插件是否启用、提供商凭据、webhook 是否可外部访问，以及
    是否只有一种音频模式（`streaming` 或 `realtime`）处于激活状态。脚本场景请使用
    `--json`。

  </Step>
  <Step title="冒烟测试">
    ```bash
    openclaw voicecall smoke
    openclaw voicecall smoke --to "+15555550123"
    ```

    默认情况下这两项都只是演练。添加 `--yes` 才会真正发起一个简短的
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

如果 `enabled: true` 但所选提供商缺少凭据，
Gateway 启动日志会输出 setup-incomplete 警告，列出缺失的 key，并
跳过启动运行时。命令、RPC 调用和代理工具在使用时仍然会
返回精确缺失的提供商配置。

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
              inboundGreeting: "Silver Fox Cards, how can I help?",
              responseSystemPrompt: "You are a concise baseball card specialist.",
              tts: {
                providers: {
                  openai: { voice: "alloy" },
                },
              },
            },
          },

          twilio: {
            accountSid: "ACxxxxxxxx",
            authToken: "...",
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

          streaming: { enabled: true /* 见 流式转录 */ },
          realtime: { enabled: false /* 见 实时语音 */ },
        },
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="提供商暴露与安全说明">
    - Twilio、Telnyx 和 Plivo 都要求 webhook URL **可公开访问**。
    - `mock` 是本地开发提供商（不发起网络调用）。
    - Telnyx 需要 `telnyx.publicKey`（或 `TELNYX_PUBLIC_KEY`），除非 `skipSignatureVerification` 为 true。
    - `skipSignatureVerification` 仅用于本地测试。
    - 在 ngrok 免费套餐下，将 `publicUrl` 设置为精确的 ngrok URL；始终会强制进行签名验证。
    - `tunnel.allowNgrokFreeTierLoopbackBypass: true` 仅在 `tunnel.provider="ngrok"` 且 `serve.bind` 为回环地址（ngrok 本地代理）时，允许 Twilio webhook 使用无效签名。仅限本地开发。
    - ngrok 免费套餐 URL 可能会变更或增加插页行为；如果 `publicUrl` 漂移，Twilio 签名将失败。生产环境：优先使用稳定域名或 Tailscale funnel。

  </Accordion>
  <Accordion title="Streaming 连接上限">
    - `streaming.preStartTimeoutMs` 会关闭从未发送有效 `start` 帧的 socket。
    - `streaming.maxPendingConnections` 限制未认证的预启动 socket 总数。
    - `streaming.maxPendingConnectionsPerIp` 限制每个源 IP 的未认证预启动 socket 数量。
    - `streaming.maxConnections` 限制打开的 media stream socket 总数（pending + active）。

  </Accordion>
  <Accordion title="旧版配置迁移">
    使用 `provider: "log"`、`twilio.from` 或旧版
    `streaming.*` OpenAI key 的旧配置会被 `openclaw doctor --fix` 重写。
    运行时回退目前仍接受旧的 voice-call key，但
    重写路径是 `openclaw doctor --fix`，兼容 shim 是
    临时性的。

    自动迁移的 streaming key：

    - `streaming.sttProvider` → `streaming.provider`
    - `streaming.openaiApiKey` → `streaming.providers.openai.apiKey`
    - `streaming.sttModel` → `streaming.providers.openai.model`
    - `streaming.silenceDurationMs` → `streaming.providers.openai.silenceDurationMs`
    - `streaming.vadThreshold` → `streaming.providers.openai.vadThreshold`

  </Accordion>
</AccordionGroup>

## Session scope

默认情况下，Voice Call 使用 `sessionScope: "per-phone"`，因此来自
同一来电者的重复通话会保留对话记忆。若每个运营商通话都应以新的上下文开始，
例如接待、预订、IVR，或 Google Meet bridge 流程中同一电话号码可能
代表不同会议时，请设置为 `sessionScope: "per-call"`。

## 实时语音对话

`realtime` 会为实时通话音频选择一个全双工实时语音提供商。
它与 `streaming` 是分开的，后者只会把音频转发给
实时转录提供商。

<Warning>
`realtime.enabled` 不能与 `streaming.enabled` 组合使用。每个通话只能选择一种
音频模式。
</Warning>

当前运行时行为：

- `realtime.enabled` 支持 Twilio Media Streams。
- `realtime.provider` 是可选项。如果未设置，Voice Call 会使用第一个已注册的实时语音提供商。
- 内置实时语音提供商：Google Gemini Live（`google`）和 OpenAI（`openai`），由其提供商插件注册。
- 提供商专属原始配置位于 `realtime.providers.<providerId>` 下。
- Voice Call 默认暴露共享的 `openclaw_agent_consult` 实时工具。实时模型在来电者请求更深层推理、当前信息或常规 OpenClaw 工具时可以调用它。
- `realtime.fastContext.enabled` 默认关闭。启用后，Voice Call 会先在索引记忆/会话上下文中搜索咨询问题，并在 `realtime.fastContext.timeoutMs` 内把这些片段返回给实时模型，然后仅在 `realtime.fastContext.fallbackToConsult` 为 true 时才回退到完整 consult 代理。
- 如果 `realtime.provider` 指向未注册的提供商，或根本没有注册任何实时语音提供商，Voice Call 会记录警告并跳过实时媒体，而不是使整个插件失败。
- Consult 会话键会优先复用已存储的通话会话（如果可用），然后回退到已配置的 `sessionScope`（默认 `per-phone`，或用于隔离通话的 `per-call`）。

### 工具策略

`realtime.toolPolicy` 控制 consult 运行：

| 策略           | 行为                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `safe-read-only` | 暴露 consult 工具，并将常规代理限制为 `read`、`web_search`、`web_fetch`、`x_search`、`memory_search` 和 `memory_get`。 |
| `owner`          | 暴露 consult 工具，并允许常规代理使用正常的代理工具策略。                                                      |
| `none`           | 不暴露 consult 工具。自定义 `realtime.tools` 仍会传递给实时提供商。                               |

### 实时提供商示例

<Tabs>
  <Tab title="Google Gemini Live">
    默认值：API key 来自 `realtime.providers.google.apiKey`、
    `GEMINI_API_KEY` 或 `GOOGLE_GENERATIVE_AI_API_KEY`；模型
    `gemini-2.5-flash-native-audio-preview-12-2025`；语音 `Kore`。

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

`streaming` 会为实时通话音频选择一个实时转录提供商。

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
    `OPENAI_API_KEY`；模型 `gpt-4o-transcribe`；`silenceDurationMs: 800`；
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
    默认值：API key 为 `streaming.providers.xai.apiKey` 或 `XAI_API_KEY`；
    endpoint 为 `wss://api.x.ai/v1/stt`；编码为 `mulaw`；采样率为 `8000`；
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

Voice Call 在通话中使用核心 `messages.tts` 配置来进行
流式语音播放。你可以在插件配置下用**相同结构**覆盖它——
它会与 `messages.tts` 深度合并。

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

<Warning>
**Microsoft 语音会被语音通话忽略。** 电话音频需要 PCM；
当前的 Microsoft 传输不暴露电话 PCM 输出。
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
  </Tab>
</Tabs>

## 呼入电话

呼入策略默认是 `disabled`。要启用呼入电话，请设置：

```json5
{
  inboundPolicy: "allowlist",
  allowFrom: ["+15550001234"],
  inboundGreeting: "你好！我能帮你什么？",
}
```

<Warning>
`inboundPolicy: "allowlist"` 是一种低置信度的来电号码识别筛查。插件会对提供商提供的 `From` 值进行规范化，并将其与 `allowFrom` 进行比较。Webhook 验证可以确认提供商的投递和载荷完整性，但它**不能**证明 PSTN/VoIP 来电号码的所有权。请将 `allowFrom` 视为来电号码过滤，而不是强身份识别。
</Warning>

自动响应使用 agent 系统。可通过 `responseModel`、
`responseSystemPrompt` 和 `responseTimeoutMs` 进行调优。

### 按号码路由

当一个 Voice Call 插件接收多个电话号码的来电，且每个号码都应表现得像不同的线路时，请使用 `numbers`。例如，一个号码可以使用轻松随意的个人助理风格，而另一个号码可以使用商务人设、不同的响应 agent，以及不同的 TTS 语音。

路由会根据提供商提供的拨入 `To` 号码进行选择。键必须是 E.164 号码。来电到达时，Voice Call 会先解析一次匹配的路由，将匹配到的路由存储在通话记录中，并在问候语、经典自动响应路径、实时咨询路径以及 TTS 播放中重复使用该生效配置。如果没有匹配到任何路由，则使用全局 Voice Call 配置。外拨电话不使用 `numbers`；发起通话时，请显式传入外拨目标、消息和会话。

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
  inboundGreeting: "Hello from the main line.",
  responseSystemPrompt: "You are the default voice assistant.",
  tts: {
    provider: "openai",
    providers: {
      openai: { voice: "coral" },
    },
  },
  numbers: {
    "+15550001111": {
      inboundGreeting: "Silver Fox Cards, how can I help?",
      responseSystemPrompt: "You are a concise baseball card specialist.",
      tts: {
        providers: {
          openai: { voice: "alloy" },
        },
      },
    },
  },
}
```

### 口语输出契约

对于自动响应，Voice Call 会向系统提示附加一个严格的口语输出契约：

```text
{"spoken":"..."}
```

Voice Call 会防御性地提取语音文本：

- 忽略标记为推理/错误内容的载荷。
- 解析直接 JSON、带围栏的 JSON 或内联 `"spoken"` 键。
- 回退到纯文本，并移除可能的规划/元信息开头段落。

这可以让语音播放专注于面向来电者的文本，并避免将规划文本泄露到音频中。

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

使用 `staleCallReaperSeconds` 来结束那些从未收到终止
webhook 的通话（例如，从未完成的 notify 模式通话）。默认值是 `0`（禁用）。

推荐范围：

- **生产环境：** `120`–`300` 秒，适用于 notify 风格流程。
- 将此值保持为**高于** `maxDurationSeconds`，以便正常通话可以结束。一个好的起点是 `maxDurationSeconds + 30–60` 秒。

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

当代理或隧道位于 Gateway 前方时，插件会
重建用于签名验证的公共 URL。以下选项控制哪些转发头会被信任：

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

- Twilio 和 Plivo 已启用 webhook **重放保护**。被重放的有效 webhook 请求会被确认，但会跳过副作用。
- Twilio 对话轮次会在 `<Gather>` 回调中包含每轮令牌，因此过期/重放的语音回调无法满足更新后的待处理转写轮次。
- 当提供商所需的签名头缺失时，未认证的 webhook 请求会在读取正文之前被拒绝。
- voice-call webhook 在签名验证之前会使用共享的预认证正文配置文件（64 KB / 5 秒）以及按 IP 的 in-flight 上限。

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

当 Gateway 已在运行时，运行中的 `voicecall` 命令会委托给
Gateway 所拥有的 voice-call 运行时，因此 CLI 不会再绑定第二个
webhook 服务器。如果没有可访问的 Gateway，这些命令会回退到
独立的 CLI 运行时。

`latency` 会从默认 voice-call 存储路径读取 `calls.jsonl`。
使用 `--file <path>` 指向其他日志，使用 `--last <n>` 将分析限制为
最后 N 条记录（默认 200）。输出包含轮次延迟和听取等待时间的
p50/p90/p99。

## Agent 工具

工具名称：`voice_call`。

| Action          | Args                                       |
| --------------- | ------------------------------------------ |
| `initiate_call` | `message`, `to?`, `mode?`, `dtmfSequence?` |
| `continue_call` | `callId`, `message`                        |
| `speak_to_user` | `callId`, `message`                        |
| `send_dtmf`     | `callId`, `digits`                         |
| `end_call`      | `callId`                                   |
| `get_status`    | `callId`                                   |

本仓库还提供了匹配的技能文档：`skills/voice-call/SKILL.md`。

## Gateway RPC

| Method               | Args                                       |
| -------------------- | ------------------------------------------ |
| `voicecall.initiate` | `to?`, `message`, `mode?`, `dtmfSequence?` |
| `voicecall.continue` | `callId`, `message`                        |
| `voicecall.speak`    | `callId`, `message`                        |
| `voicecall.dtmf`     | `callId`, `digits`                         |
| `voicecall.end`      | `callId`                                   |
| `voicecall.status`   | `callId`                                   |

`dtmfSequence` 仅在 `mode: "conversation"` 时有效。如果 notify 模式的呼叫在接通后还需要输入按键，
应在通话存在后使用 `voicecall.dtmf`。

## 故障排查

### Setup fails webhook exposure

从运行 Gateway 的相同环境中运行 setup：

```bash
openclaw voicecall setup
openclaw voicecall setup --json
```

对于 `twilio`、`telnyx` 和 `plivo`，`webhook-exposure` 必须为绿色。即使已配置
`publicUrl`，如果它指向本地或私有网络地址，仍然会失败，因为运营商无法回拨到这些地址。不要将
`localhost`、`127.0.0.1`、`0.0.0.0`、`10.x`、`172.16.x`-`172.31.x`、
`192.168.x`、`169.254.x`、`fc00::/7` 或 `fd00::/8` 作为 `publicUrl`。

Twilio notify 模式外拨呼叫会在创建呼叫请求中直接发送其初始 `<Say>` TwiML，因此第一条语音消息
不依赖 Twilio 拉取 webhook TwiML。状态回调、conversation 呼叫、预接通 DTMF、realtime 流以及
接通后的呼叫控制仍然需要公共 webhook。

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
  `fromNumber`。
- Plivo: `plivo.authId`、`plivo.authToken` 和 `fromNumber`。

凭据必须存在于 Gateway 主机上。编辑本地 shell 配置文件不会影响已在运行的 Gateway，
直到它重启或重新加载其环境。

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

当反向代理或隧道位于 Gateway 前方时，将
`webhookSecurity.allowedHosts` 设置为公共主机名，或者对已知代理地址使用
`webhookSecurity.trustedProxyIPs`。仅当代理边界由你控制时，才使用
`webhookSecurity.trustForwardingHeaders`。

### Signature verification fails

提供商签名是针对 OpenClaw 根据传入请求重建的公共 URL 进行检查的。如果签名失败：

- 确认提供商 webhook URL 与 `publicUrl` 完全匹配，包括
  scheme、host 和 path。
- 对于 ngrok 免费层 URL，当隧道主机名变化时更新 `publicUrl`。
- 确保代理保留原始 host 和 proto 头，或者配置
  `webhookSecurity.allowedHosts`。
- 不要在本地测试之外启用 `skipSignatureVerification`。

### Google Meet Twilio joins fail

Google Meet 使用此插件来处理 Twilio 拨入加入。先验证 Voice Call：

```bash
openclaw voicecall setup
openclaw voicecall smoke --to "+15555550123"
```

然后显式验证 Google Meet 传输：

```bash
openclaw googlemeet setup --transport twilio
```

如果 Voice Call 是绿色的，但会议参与者始终没有加入，请检查 Meet
拨入号码、PIN 和 `--dtmf-sequence`。电话通话可能是正常的，而会议却拒绝
或忽略了错误的 DTMF 序列。

Google Meet 会将 Meet DTMF 序列和介绍文本传递给 `voicecall.start`。
对于 Twilio 呼叫，Voice Call 会先提供 DTMF TwiML，再重定向回
webhook，然后打开 realtime media stream，这样保存的介绍会在电话参与者
加入会议后生成。

使用 `openclaw logs --follow` 查看实时阶段追踪。健康的 Twilio Meet 加入日志顺序如下：

- Google Meet 将 Twilio 加入委托给 Voice Call。
- Voice Call 存储预接通 DTMF TwiML。
- 在 realtime 处理之前，Twilio 初始 TwiML 被消费并提供。
- Voice Call 为 Twilio 呼叫提供 realtime TwiML。
- realtime bridge 以已排队的初始问候开始。

`openclaw voicecall tail` 仍然会显示持久化的通话记录；它适合查看
通话状态和转写，但并非每一次 webhook/realtime 过渡都会出现在那里。

### Realtime call has no speech

确认只启用了一个音频模式。`realtime.enabled` 和
`streaming.enabled` 不能同时为 true。

对于 realtime Twilio 呼叫，还要确认：

- 已加载并注册一个 realtime provider 插件。
- `realtime.provider` 未设置，或指定了一个已注册的 provider。
- provider API key 对 Gateway 进程可用。
- `openclaw logs --follow` 显示已提供 realtime TwiML、realtime bridge
  已启动，并且初始问候已排队。

## 相关内容

- [对话模式](/nodes/talk)
- [文本转语音](/tools/tts)
- [语音唤醒](/nodes/voicewake)
