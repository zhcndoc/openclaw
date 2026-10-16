---
summary: "messages.* 传递、前缀、ack 反应、排队、TTS 和 talk.* 默认值"
read_when:
  - "调整回复前缀、确认反应或消息队列"
  - "配置文本转语音输出"
  - "设置通话模式默认值"
title: "配置——消息和对话"
---

`messages.*` 传送行为、文本转语音和 `talk.*` 默认为通话模式。

## <a id="messages"></a> 消息

```json5
{
  messages: {
    responsePrefix: "🦞", // or "auto"
    ackReaction: "👀",
    ackReactionScope: "group-mentions", // group-mentions | group-all | direct | all | off | none
    queue: {
      mode: "steer", // steer (default) | followup | collect | interrupt
      cap: 20,
      drop: "summarize", // old | new | summarize (default)
      byChannel: {
        whatsapp: "followup",
        telegram: "followup",
      },
    },
    inbound: {
      debounceMs: 2000, // 0 disables ordinary burst batching
      byChannel: {
        whatsapp: 5000,
        slack: 1500,
      },
    },
  },
}
```

### <a id="response-prefix"></a> 回复前缀

每个 channel/account 覆盖：`channels.<channel>.responsePrefix`、`channels.<channel>.accounts.<id>.responsePrefix`。

解析顺序（越具体优先级越高）：账户 → 频道 → 全局。`""` 表示禁用并停止级联。`"auto"` 会派生为 `[{identity.name}]`。

**模板变量：**

| 变量          | 描述            | 示例                     |
| ----------------- | ---------------------- | --------------------------- |
| `{model}`         | 简短模型名       | `claude-opus-4-6`           |
| `{modelFull}`     | 完整模型标识  | `anthropic/claude-opus-4-6` |
| `{provider}`      | 提供方名称          | `anthropic`                 |
| `{thinkingLevel}` | 当前思考级别 | `high`, `low`, `off`        |
| `{identity.name}` | 代理身份名称    | （与 `"auto"` 相同）          |

变量不区分大小写。`{think}` 是 `{thinkingLevel}` 的别名。

### <a id="ack-reaction"></a> 确认反应

- 默认使用活动代理的 `identity.emoji`，否则使用 `"👀"`。设置为 `""` 可禁用。
- Discord、Matrix、Slack 和 Telegram 支持每通道覆盖：`channels.<channel>.ackReaction`、`channels.<channel>.accounts.<id>.ackReaction`。对于支持确认反应的其他通道，请改用 `messages.ackReaction`。
- 解析顺序：账户 → 频道 → `messages.ackReaction` → 身份回退值。
- WhatsApp 是上述两条规则的例外情况。它仅从 `messages.ackReaction` 和 `messages.ackReactionScope` 获取表情符号和范围，并且在未设置 `messages.ackReaction` 时根本不发送确认，因此身份后备永远不会在那里应用。将 `channels.whatsapp.reactionLevel`（或每个帐户形式）设置为 `"off"` 仍然会抑制每个自动反应，包括确认。请参阅 [WhatsApp 确认反应](/channels/whatsapp#acknowledgment-reactions)。
- 范围：`group-mentions`（默认）、`group-all`、`direct`、`all`，或 `off`/`none`（完全禁用确认反应）。
- `group-mentions` 会确认提及代理的群组消息，包括设置了 `requireMention: false` 的群组。使用 `group-all` 可确认每条群组消息。
- `messages.statusReactions.enabled`：启用 Slack、Discord、Signal、Telegram 和 WhatsApp 上的生命周期状态反应。 在 Discord 上，未设置时，只要确认反应处于启用状态，状态反应就会保持启用。 在 Slack、Signal、Telegram 和 WhatsApp 上，必须明确设置为 `true` 才能启用生命周期状态反应。 默认情况下，Slack 使用其原生助手线程状态和轮换显示的加载消息来报告进度，同时保持配置的确认反应不变。

### <a id="queue"></a> 队列

- `mode`：在会话运行处于活动状态时到达的传入消息所使用的队列策略。默认值：`"steer"`。
  - `steer`：将新提示注入活动运行中。
  - `followup`：在活动运行完成后运行新提示。
  - `collect`：批处理兼容消息并稍后一起运行它们。具有单独持久入口准入的消息（包括Discord和Telegram）保留在单独的后续回合中；兼容的网关 `chat.send` 输入仍然可以组合。请参见 [ 队列模式](/concepts/queue#queue-modes)。
  - `interrupt`：在启动最新提示前中止活动运行。
- 队列使用内置的 500ms 去抖来进行引导、跟踪和收集批处理。
- `cap`：在应用丢弃策略前排队消息的最大数量。默认值：`20`。
- `drop`：超过上限时使用的策略。`"summarize"`（默认）会丢弃最旧的条目，但保留简要摘要；`"old"` 会丢弃最旧的条目且不保留摘要；`"new"` 会拒绝最新的条目。
- `byChannel`：每通道 `mode` 覆盖由提供商 ID 键入的内容。
- `debounceMsByChannel`：每通道去抖覆盖（以毫秒为单位），由提供商 ID 键入。

使用 `messages.inbound.debounceMs` 设置全局队列前去抖时间窗口。

### <a id="inbound-debounce"></a> 传入去抖

在安静窗口后，将来自同一发件人的快速纯文本消息批量发送到单个代理程序中。 Media/attachments 立即冲洗。 Control 命令绕过去抖动。

- `messages.inbound.byChannel.<channel>` 覆盖 `messages.inbound.debounceMs`。
- 两者都不设置，Telegram 使用 `300` 毫秒；其他通道没有通用的去抖延迟。
- `0` 禁用普通突发批处理。 Telegram 仍然自动组装接近极限的长粘贴片段，允许长达 `1500` 毫秒的连续性。

批处理是一种有限的时间启发式方法，不能保证长消息的每个部分都会变成一轮。请参阅 [Inbound debouncing](/concepts/messages#inbound-debouncing) 和 [Telegram 入站文本批处理 ](/channels/telegram/messaging#inbound-text-batching)。

### <a id="other-message-keys"></a> 其他消息键

- `channels.whatsapp.responsePrefix`：出站WhatsApp回复前缀。仅当当前值未设置时，Doctor 才会将已停用的入站 `messagePrefix` 值移至此处。
- `messages.visibleReplies`：控制直接、群组和频道会话中可见的源回复（`"message_tool"` 要求使用 `message(action=send)` 才能产生可见输出；`"automatic"` 则像以前一样发布普通回复）。
- `messages.usageTemplate` / `messages.responseUsage`：自定义 `/usage` 页脚模板和默认的每次回复使用模式（`off | tokens | full`，加上 `tokens` 的旧 `on` 别名）。
- `messages.groupChat.mentionPatterns` / `historyLimit`：群组消息提及触发模式和历史记录窗口大小。

### <a id="tts-(text-to-speech)"></a><a id="tts-text-to-speech"></a> TTS（文本转语音）

```json5
{
  tts: {
    auto: "off", // off (default) | always | inbound | tagged
    mode: "final", // final | all
    provider: "elevenlabs",
    summaryModel: "openai/gpt-5.4-mini",
    modelOverrides: { enabled: true },
    maxTextLength: 4000,
    timeoutMs: 30000,
    providers: {
      elevenlabs: {
        apiKey: "example-elevenlabs-api-key",
        baseUrl: "https://api.elevenlabs.io",
        speakerVoiceId: "voice_id",
        modelId: "eleven_multilingual_v2",
        seed: 42,
        applyTextNormalization: "auto",
        languageCode: "en",
        voiceSettings: {
          stability: 0.5,
          similarityBoost: 0.75,
          style: 0.0,
          useSpeakerBoost: true,
          speed: 1.0,
        },
      },
      microsoft: {
        speakerVoice: "en-US-MichelleNeural",
        lang: "en-US",
        outputFormat: "audio-24khz-48kbitrate-mono-mp3",
      },
      openai: {
        apiKey: "example-openai-api-key",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini-tts",
        speakerVoice: "coral",
      },
    },
  },
}
```

全局偏好路径属于机器状态（默认为 `~/.openclaw/settings/tts.json`；可使用 `OPENCLAW_TTS_PREFS` 覆盖）。高级的多代理设置可以通过 `agents.entries.<id>.tts.prefsPath` 为每个代理设置不同的偏好存储。

- `auto` 控制默认的自动 TTS 模式：`off`、`always`、`inbound` 或 `tagged`。`/tts on|off` 可以覆盖本地偏好，`/tts status` 会显示生效状态。
- `summaryModel` 会覆盖用于自动摘要的 `agents.defaults.model.primary`。
- `modelOverrides` 默认启用（`enabled !== false`）；`modelOverrides.allowProvider` 需要选择启用。
- API 密钥会回退使用 `ELEVENLABS_API_KEY`/`XI_API_KEY` 和 `OPENAI_API_KEY`。
- Bundled 语音提供程序是插件拥有的。如果设置了 `plugins.allow`，请包含您要使用的每个 TTS 提供程序插件，例如 Edge TTS 的 `microsoft`。旧版 `edge` 提供商 ID 被接受作为 `microsoft` 的别名。
- `providers.openai.baseUrl` 会覆盖 OpenAI TTS 端点。解析顺序为：配置项，然后是 `OPENAI_TTS_BASE_URL`，最后是 `https://api.openai.com/v1`。
- 当 `providers.openai.baseUrl` 指向非 OpenAI 端点时，OpenClaw 将其视为 OpenAI- 兼容的 TTS 服务器并放宽 model/voice 验证。

---

## <a id="talk"></a> 语音对话

通话模式的默认值（macOS/iOS/Android 和浏览器 Control UI）。

```json5
{
  talk: {
    agentId: "ops",
    provider: "elevenlabs",
    providers: {
      elevenlabs: {
        speakerVoiceId: "elevenlabs_voice_id",
        voiceAliases: {
          Clawd: "EXAVITQu4vr4xnSDxMaL",
          Roger: "CwhRBWXzGAHq8TQ4Fs17",
        },
        modelId: "eleven_multilingual_v2",
        outputFormat: "mp3_44100_128",
        apiKey: "elevenlabs_api_key",
      },
      mlx: {
        modelId: "mlx-community/Soprano-80M-bf16",
      },
      system: {},
    },
    consultThinkingLevel: "low",
    consultFastMode: true,
    speechLocale: "ru-RU",
    silenceTimeoutMs: 1500,
    interruptOnSpeech: true,
    realtime: {
      provider: "openai",
      providers: {
        openai: {
          model: "gpt-realtime-2.1",
          speakerVoice: "cedar",
        },
      },
      instructions: "Speak warmly and keep answers brief.",
      mode: "realtime", // realtime | stt-tts | transcription
      transport: "webrtc", // webrtc | provider-websocket | gateway-relay | managed-room
      vadThreshold: 0.5,
      silenceDurationMs: 500,
      prefixPaddingMs: 300,
      reasoningEffort: "medium",
      brain: "agent-consult", // agent-consult | direct-tools | none
    },
  },
}
```

- 当配置了多个语音对话提供商时，`talk.provider` 必须与 `talk.providers` 中的某个键匹配。
- 对于未指定代理作用域会话密钥而创建的语音对话会话，`talk.agentId` 负责管理这些会话。会话作用域的语音对话调用仍会使用该密钥中编码的代理。对于现有的多代理配置，Doctor 可能会创建一个仅包含此所有者的最小 `talk` 块。
- 旧版扁平语音对话键（`talk.voiceId`、`talk.voiceAliases`、`talk.modelId`、`talk.outputFormat`、`talk.apiKey`）仅用于兼容。运行 `openclaw doctor --fix`，将持久化配置重写为 `talk.providers.<provider>`。
- Voice ID 回退到 `ELEVENLABS_VOICE_ID` 或 `SAG_VOICE_ID`（macOS 通话客户端行为）。
- `providers.*.apiKey` 接受纯文本字符串或 SecretRef 对象。
- 仅当未配置语音对话 API 密钥时，才会应用 `ELEVENLABS_API_KEY` 回退值。
- `providers.*.voiceAliases` 允许语音对话指令使用易记名称。
- `providers.mlx.modelId` 选择 macOS 本地 MLX 帮助程序使用的 Hugging Face 存储库。如果省略，macOS 使用 `mlx-community/Soprano-80M-bf16`。
- macOS MLX 播放会在可用时通过捆绑的 `openclaw-mlx-tts` 辅助程序运行，否则使用 `PATH` 上的可执行文件；`OPENCLAW_MLX_TTS_BIN` 可在开发过程中覆盖辅助程序路径。
- `consultThinkingLevel` 控制在 Control UI Talk 实时 `openclaw_agent_consult` 呼叫后面运行的完整 OpenClaw 代理的思维级别。保持未设置状态以保留正常的 session/model 行为。
- `consultFastMode` 为 Control UI Talk 实时咨询设置一次性快速模式覆盖，而无需更改会话的正常快速模式设置。
- `speechLocale` 设置 Android、iOS 和 macOS Talk 语音识别以及 iOS 系统语音后备使用的 BCP 47 区域设置 ID。 Android 还使用其语言组件来指导实时输入转录。保留未设置以使用设备默认值。
- `silenceTimeoutMs` 控制通话模式在用户静音后发送文字记录之前等待的时间。取消设置保留平台默认暂停窗口 （`700 ms on macOS and Android, 900 ms on iOS`）。
- `realtime.instructions` 会将面向提供商的系统指令附加到 OpenClaw 的内置实时提示词中，因此无需丢失默认的 `openclaw_agent_consult` 指导即可配置语音风格。
- `realtime.vadThreshold` 将提供商的语音活动阈值设置为从 `0`（最敏感）到 `1`（最不敏感）。不设置则保留提供商默认值。
- `realtime.silenceDurationMs` 设置提供商提交实时用户回合之前的正整数静音时间窗口。不设置则保留提供商默认值。
- `realtime.prefixPaddingMs` 设置检测到语音开始之前所保留的非负整数音频时长。不设置则保留提供商默认值。
- `realtime.reasoningEffort` 设置实时会话所使用的提供商特定推理级别。不设置则保留提供商默认值。
- `realtime.consultRouting`：`"provider-direct"`（默认值）在实时提供商生成最终用户转录文本但未调用 `openclaw_agent_consult` 时，保留提供商的直接回复；`"force-agent-consult"` 则会将最终请求改由 OpenClaw 处理。
