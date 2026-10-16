---
summary: "电话 TTS、入站策略、按号码路由和呼叫生命周期计时器"
read_when:
  - "您正在选择呼叫时使用的 TTS 语音"
  - "您正在启用呼入呼叫或按号码路由"
  - "您需要调整过时的呼叫收割者或呼叫持续时间上限"
title: "语音呼叫 TTS 和呼入电话"
sidebarTitle: "TTS 和呼入电话"
---

电话文本转语音、入站策略和每个号码路由、语音输出合同、对话启动和陈旧呼叫收割机。 [语音通话插件](/plugins/voice-call)指南的一部分。

## <a id="tts-for-calls"></a> 通话 TTS

Voice Call 使用核心 `tts` 配置在通话中流式传输语音。 你可以在插件配置下使用**相同的结构**进行覆盖 — 它会与 `tts` 深度合并。

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
- 恢复的呼叫者语音会丢弃仍在生成的旧自动回复。 Twilio 流媒体对语音开始和部分转录做出反应；当新的语音事件到达时，运营商 Webhook 调用会做出反应。明确的语音请求仍然可用，并且已经接受的代理工作可以完成，而无需说出过时的答复。

### <a id="tts-examples"></a> TTS 示例

<Tabs>
  <Tab id="core-tts-only" title="仅核心 TTS">
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
  <Tab id="override-to-elevenlabs-calls-only" title="覆盖 ElevenLabs（仅限调用）">
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
  <Tab id="openai-model-override-deep-merge" title="OpenAI 模型覆盖（深度合并）">
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

## <a id="inbound-calls"></a> 呼入电话

呼入策略默认是 `disabled`。要启用呼入电话，请设置：

```json5
{
  inboundPolicy: "allowlist",
  allowFrom: ["+15550001234"],
  inboundGreeting: "Hello! How can I help?",
}
```

<Warning>
`inboundPolicy: "allowlist"`是低保证呼叫者-ID屏幕。该插件对提供商提供的 `From` 值进行标准化，并将其与 `allowFrom` 进行比较。 Webhook 验证可验证提供者交付和有效负载的完整性，但它确实 **不证明** 证明 PSTN/VoIP 呼叫者号码所有权。将`allowFrom`视为呼叫者-ID过滤，不强呼叫者身份。
</Warning>

自动响应使用 agent 系统。可通过 `responseModel`、 `responseSystemPrompt` 和 `responseTimeoutMs` 进行调优。

### <a id="per-number-routing"></a> 按号码路由

当一个 Voice Call 插件接收多个电话号码的来电，并且每个号码都应表现得像不同线路时，请使用 `numbers`。例如， 一个号码可以使用随意的私人助手风格，而另一个使用商务人设、不同的响应 agent，以及不同的 TTS 声音。

路由会根据服务提供商提供的被拨叫 `To` 号码进行选择。键必须是 E.164 格式号码。来电到达时，Voice Call 会解析匹配的路由一次，将匹配到的路由存储在通话记录上，并在问候语、经典自动响应路径、实时咨询路径以及 TTS 播放中复用该有效配置。如果没有路由匹配，则使用全局 Voice Call 配置。外拨电话不会使用 `numbers`；发起通话时请显式传入外拨目标、消息和会话。

路由覆盖完全支持这些字段：

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
      openai: { speakerVoice: "coral" },
    },
  },
  numbers: {
    "+15550001111": {
      inboundGreeting: "Silver Fox Cards, how can I help?",
      responseSystemPrompt: "You are a concise baseball card specialist.",
      tts: {
        providers: {
          openai: { speakerVoice: "alloy" },
        },
      },
    },
  },
}
```

### <a id="spoken-output-contract"></a> 口语输出契约

对于自动响应，Voice Call 会在系统提示中附加一个严格的口语输出契约，要求返回 `{"spoken":"..."}` 的 JSON。Voice Call 会以防御性方式提取语音文本：

- 忽略标记为 reasoning/error 内容的有效负载。
- 解析直接 JSON、带围栏的 JSON 或内联 `"spoken"` 键。
- 恢复为纯文本并删除可能的 planning/meta 引入段落。

这可使语音播放专注于面向来电者的文本，并避免将规划文本泄漏到音频中。

### <a id="conversation-startup-behavior"></a> 会话启动行为

对于外拨 `conversation` 呼叫，首条消息的处理与实时播放状态相关：

- 只有在初始问候正在播放时，才会抑制插话队列清理和自动响应。
- 如果初始播放失败，通话会回到 `listening`，并且初始消息会保留在队列中以便重试。
- Twilio streaming 的初始播放会在 stream connect 时立即开始，不会额外延迟。
- 插话会中止当前播放，并清除已排队但尚未播放的 Twilio TTS 条目。被清除的条目会以 skipped 方式解决，因此后续响应逻辑可以继续，而无需等待永远不会播放的音频。
- Realtime 语音会话使用 realtime stream 自己的开场轮次。Voice Call **不会** 为该初始消息发布旧版 `<Say>` TwiML 更新，因此外拨 `<Connect><Stream>` 会话会保持连接。

### <a id="twilio-stream-disconnect-grace"></a> Twilio 流断开宽限期

当 Twilio 经典流或实时媒体流断开连接时，语音呼叫会在自动结束呼叫之前等待 **2000 ms**：

- 如果 stream 在该窗口内重新连接，自动结束会被取消。
- 如果宽限期结束后没有新的 stream 重新注册，则通话会结束，以防止卡住的活跃通话。
- 实时 bridge/session 资源、排队音频、转录所有权和飞行中咨询工作立即关闭。只有 call/provider 完成等待重新连接。

## <a id="stale-call-reaper"></a> 陈旧通话清理器

使用 `staleCallReaperSeconds`（默认值为 **120**）来结束那些从未接听、也从未进入实时对话状态的通话，例如通知模式下运营商从未发送终止 webhook 的通话。将其设为 `0` 可禁用。

清理器每 30 秒运行一次，并且只会结束那些没有 `answeredAt` 时间戳、且尚未处于终态或实时（`speaking`/`listening`）状态的通话，因此已接听的对话永远不会被这个定时器清理；`maxDurationSeconds`（默认值 300）则是另一项上限，用于结束持续时间过长的已接听通话。

网关服务拥有收割者计划，并在关闭其呼叫管理器之前加入待处理的提供程序挂断。当提供商挂起时，错过的检查会合并。独立的 CLI 调用绑定到其现有可执行文件 CLI 所有者，该所有者将保持活动状态，直到调用运行时关闭。

对于通知式流程，运营商传送 ring/answer webhook 的速度可能很慢，请将 `staleCallReaperSeconds` 提高到默认值以上，这样缓慢但正常的呼叫就不会过早收获； `120`-`300`秒是一个合理的生产范围。

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
