---
summary: "插件配置键、调用所有者、配置引用表和会话范围"
read_when:
  - "您正在设置语音通话插件配置键"
  - "您需要语音呼叫配置键的默认值"
  - "您正在选择呼叫会话的范围"
title: "语音通话配置"
sidebarTitle: "配置"
---

插件配置键、调用所有者、完整配置参考表和会话范围。 [语音通话插件](/plugins/voice-call)指南的一部分。

## <a id="configuration"></a> 配置

如果 `enabled: true` 但所选提供商缺少凭据，Gateway 启动时会记录一条 setup-incomplete 警告，指出缺失的键，并跳过运行时启动。命令、RPC 调用和代理工具在使用时仍会返回精确缺失的配置。

<Note>
语音呼叫凭据接受 SecretRefs。 `plugins.entries.voice-call.config.twilio.authToken`、`plugins.entries.voice-call.config.realtime.providers.*.apiKey`、`plugins.entries.voice-call.config.streaming.providers.*.apiKey`和`plugins.entries.voice-call.config.tts.providers.*.apiKey`通过标准SecretRef曲面解析；请参阅 [SecretRef 凭证表面 ](/reference/secretref-credential-surface)。
</Note>

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio", // or "telnyx" | "plivo" | "mock"
          fromNumber: "+15550001234", // or TWILIO_FROM_NUMBER for Twilio
          toNumber: "+15550005678",
          sessionScope: "per-phone", // per-phone | per-call | main
          numbers: {
            "+15550009999": {
              inboundGreeting: "Silver Fox Cards, how can I help?",
              responseSystemPrompt: "You are a concise baseball card specialist.",
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
            // region: "ie1", // optional: us1 | ie1 | au1; defaults to us1
          },
          telnyx: {
            apiKey: "...",
            connectionId: "...",
            // Telnyx webhook public key from the Mission Control Portal
            // (Base64; can also be set via TELNYX_PUBLIC_KEY).
            publicKey: "...",
          },
          plivo: {
            authId: "MAxxxxxxxxxxxxxxxxxxxx",
            authToken: "...",
          },

          // Webhook server
          serve: {
            port: 3334,
            path: "/voice/webhook",
          },

          // Webhook security (recommended for tunnels/proxies)
          webhookSecurity: {
            allowedHosts: ["voice.example.com"],
            trustedProxyIPs: ["100.64.0.1"],
          },

          // Public exposure (pick one)
          // publicUrl: "https://example.ngrok.app/voice/webhook",
          // tunnel: { provider: "ngrok" },
          // tailscale: { mode: "funnel", port: 8443, path: "/voice/webhook" },

          outbound: {
            defaultMode: "notify", // notify | conversation
          },

          streaming: { enabled: true /* Twilio only; see Streaming transcription */ },
          realtime: { enabled: false /* see Realtime voice conversations */ },
        },
      },
    },
  },
}
```

### <a id="choose-the-call-owner"></a> 选择呼叫所有者

通过配置一名代理，语音呼叫会自动使用该代理。对于多个代理，将 `plugins.entries.voice-call.config.agentId` 设置为预期响应和会话所有者。 `main` 是普通代理 ID，不是多代理舰队的后备。每个号码的路由可能会为呼入呼叫选择不同的座席，但不会替换插件的启动所有者。

如果启动报告语音呼叫没有明确的所有者，请使用 `openclaw agents list` 列出您的座席，设置现有的 `agentId` 字段，然后重新运行 `openclaw voicecall setup`。使用默认的混合重新加载模式，配置更改会自动重新加载插件；请参阅 [ 热重载 ](/gateway/configuration/hot-reload)。保留现有的旧默认代理选择；新的多代理设置应使用显式所有者。请参见[代理配置](/gateway/config-agents)。

### <a id="config-reference"></a> 配置参考

`plugins.entries.voice-call.config` 下未在上面显示的顶层键：

| 键                             | 默认值      | 笔记                                                                                                                           |
| ------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                       | `false`      | 主控on/off开关。                                                                                                           |
| `inboundPolicy`                 | `"disabled"` | `disabled` \| `allowlist` \| `pairing` \| `open`。请参阅 [ 入站呼叫 ](/plugins/voice-call/tts-and-inbound-calls#inbound-calls)。 |
| `allowFrom`                     | `[]`         | 用于 `inboundPolicy: "allowlist"` 的 E.164 格式允许列表。                                                                               |
| `callbacks`                     | 已禁用     | 仅接受实时呼叫的最近出站收件人；经典STT/TTS仍适用入站策略。                   |
| `maxDurationSeconds`            | `300`        | 单次通话的硬性时长上限，无论是否已接听都会强制执行。                                                              |
| `staleCallReaperSeconds`        | `120`        | 请参阅 [Stale 调用 reaper](/plugins/voice-call/tts-and-inbound-calls#stale-call-reaper)。 `0` 禁用它。                          |
| `silenceTimeoutMs`              | `800`        | 经典流程（非实时）中的语音结束静音检测时长。                                                            |
| `transcriptTimeoutMs`           | `180000`     | 等待呼叫者转写结果的最长时间，超时后放弃当前轮次。                                                                    |
| `ringTimeoutMs`                 | `30000`      | 出站通话的响铃超时时间。                                                                                                |
| `maxConcurrentCalls`            | `1`          | 超出此限制的出站通话会被拒绝。                                                                                  |
| `outbound.notifyHangupDelaySec` | `3`          | 通知模式下，TTS 播放完毕后等待自动挂断的秒数。                                                                    |
| `skipSignatureVerification`     | `false`      | 仅用于本地测试；切勿在生产环境中启用。                                                                                 |
| `store`                         | 未设置        | 覆盖默认的 `$OPENCLAW_STATE_DIR/voice-calls` 路径（通常为 `~/.openclaw/voice-calls`）。                              |
| `agentId`                       | 独家代理   | 用于响应生成和会话存储的代理。使用多个代理显式设置。                                    |
| `responseModel`                 | 未设置        | 覆盖经典响应（非实时）使用的默认模型。                                                               |
| `responseSystemPrompt`          | 生成    | 经典响应使用的自定义系统提示词。                                                                                     |
| `responseTimeoutMs`             | `30000`      | 经典响应生成超时时间（毫秒）。                                                                                   |

Twilio 默认为其 US1 REST 端点。要处理受支持的非 US 区域中的呼叫，请将 `twilio.region` 设置为 `ie1` 或 `au1` 并使用来自该区域的凭证。请参阅 [Twilio 的非 US REST API 指南](https://www.twilio.com/docs/global-infrastructure/using-the-twilio-rest-api-in-a-non-us-region)。

### <a id="twilio-voicemail-detection-tuning"></a> Twilio 语音邮件检测调整

设置 `voicemail.detection: "twilio"` 以启用答录机检测。这些可选的 `voicemail` 键可调整 Twilio 对出站呼叫的检测：

| 键                                    | 默认值 | 允许范围                             |
| -------------------------------------- | ------- | ----------------------------------------- |
| `machineDetectionSpeechThresholdMs`    | `6000`  | `1000`–`6000` ms                          |
| `machineDetectionSpeechEndThresholdMs` | `1200`  | `500`–`5000` ms                           |
| `machineDetectionSilenceTimeoutMs`     | `5000`  | `2000`–`10000` ms                         |
| `machineDetectionTimeoutMs`            | `30000` | `3000`–`59000` ms，以 `1000` 的倍数表示 |

语音阈值默认为 Twilio 的最大值六秒，以减少健谈的人类和较长的商务问候语的错误机器结果。 Twilio自己的默认是`2400` ms。较高的阈值也会延迟机器检测；它无法可靠地对说话不停顿三十秒的人进行分类。跨代表性问候语和载体进行调整。

其他默认值匹配 Twilio。所有值都是以毫秒为单位的整数；该插件将 `machineDetectionTimeoutMs` 转换为调用 API 的 `MachineDetectionTimeout` 的整秒。其他三个值以毫秒为单位传递。允许的范围遵循 [Twilio 的 AMD 调整参考 ](https://www.twilio.com/docs/voice/answering-machine-detection#optional-api-tuning-parameters) 及其 [ 无效检测配置错误 ](https://www.twilio.com/docs/api/errors/21234)。

<AccordionGroup>
  <Accordion id="provider-exposure-and-security-notes" title="提供商暴露和安全说明">
    - Twilio、Telnyx 和 Plivo 都需要一个**可公开访问**的 webhook URL。
    - `mock` 是本地开发提供商（不进行网络调用）。
    - Telnyx 需要 `telnyx.publicKey`（或 `TELNYX_PUBLIC_KEY`），除非 `skipSignatureVerification` 为 true。
    - `skipSignatureVerification` 仅用于本地测试。
    - 在 ngrok 免费套餐下，请将 `publicUrl` 设置为精确的 ngrok URL；始终会强制进行签名验证。
    - 当 `tunnel.provider="ngrok"` 和 `serve.bind` 是环回（ngrok 本地代理）时，`tunnel.allowNgrokFreeTierLoopbackBypass: true` 信任来自环回请求的转发标头。这重建了用于签名的公共URL；仍然需要有效的 Twilio 签名。
    - Ngrok 免费层 URL 可以更改或添加插页式行为；如果 `publicUrl` 漂移，则 Twilio 签名失败。生产：更喜欢稳定的域或 Tailscale 漏斗。
    - 当启用该音频模式时，Tailscale 服务和漏斗会自动公开实时或流式 WebSocket 路径。
    - `tailscale.port` 为 `tailscale.mode` 和统一 `tunnel.provider: "tailscale-serve" | "tailscale-funnel"` 选择外部 HTTPS 端口。默认为`443`；当另一个 HTTPS 服务器拥有端口 443 时，请使用 `8443`。Funnel 仅接受 `443`、`8443` 或 `10000`，而 Serve 接受任何有效的 TCP 端口。非默认端口出现在 Webhook 和实时流 URL 中。

  </Accordion>
  <Accordion id="streaming-connection-caps" title="流媒体连接上限">
    - `streaming.preStartTimeoutMs`（默认 `5000`）会关闭从未发送有效 `start` 帧的 socket。
    - `streaming.maxPendingConnections`（默认 `32`）限制未认证、未开始的 socket 总数。
    - `streaming.maxPendingConnectionsPerIp`（默认 `4`）限制每个源 IP 的未认证、未开始 socket 数。
    - `streaming.maxConnections`（默认 `128`）限制所有打开的媒体流 socket（待处理 + 活跃）。

  </Accordion>
  <Accordion id="legacy-config-migrations" title="旧版配置迁移">
    语音呼叫接受当前的配置形状。不再包括 2026 年 7 月之前停用的形状的迁移。使用这些替换手动更新旧配置，保留任何现有的当前值：

    - `provider: "log"` → `provider: "mock"`
    - `twilio.from` → `fromNumber`
    - `streaming.sttProvider` → `streaming.provider`
    - `streaming.openaiApiKey` → `streaming.providers.openai.apiKey`
    - `streaming.sttModel` → `streaming.providers.openai.model`
    - `streaming.silenceDurationMs` → `streaming.providers.openai.silenceDurationMs`
    - `streaming.vadThreshold` → `streaming.providers.openai.vadThreshold`
    - `realtime.agentContext.includeSystemPrompt` 已删除。具有共享上下文解析器的主机始终包含代理上下文指导； `realtime.agentContext` 控制可选的配置身份和配置文件。支持的旧主机保留其可选的有界上下文胶囊。请参阅 [ 座席语音上下文 ](/plugins/voice-call/realtime-and-streaming#agent-voice-context)。

  </Accordion>
</AccordionGroup>

## <a id="session-scope"></a> 会话范围

默认情况下，Voice Call 使用 `sessionScope: "per-phone"`，因此来自同一来电者的重复通话会保留对话记忆。若每个运营商通话都应以新的上下文开始， 例如接待、预订、IVR，或 Google Meet bridge 流程中同一电话号码可能代表不同会议时，请设置为 `sessionScope: "per-call"`。

当核心 `session.scope` 为 `"global"` 时，设置 `sessionScope: "main"` 将每个呼叫路由到已配置座席的主会话 `agent:<agentId>:main` 或 `global`。自定义核心 `session.mainKey` 值将被忽略。原始呼叫轮流然后与代理的主会话共享历史记录，因此仅当共享上下文是有意的时才使用此功能。

对于 `per-phone` 和 `per-call`，语音呼叫将生成的会话密钥存储在配置的座席命名空间 （`agent:<agentId>:voice:*`） 下。原始显式集成密钥解析为相同的命名空间：规范化的 `agent:<configuredAgentId>:*` 密钥保留该所有者并尊重核心 main-session/global-scope 别名；外部或格式错误的 `agent:*` 输入在配置的代理下被视为不透明密钥； `global` 和 `unknown` 仍然是全球哨兵。
