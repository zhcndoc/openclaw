---
summary: "实时语音对话、工具策略、座席语音上下文和流转录"
read_when:
  - "您希望在通话时使用全双工实时语音模型"
  - "您正在调整实时工具策略或代理咨询"
  - "您正在将 Twilio 通话音频流式传输到转录提供商"
title: "语音通话实时和流媒体"
sidebarTitle: "实时和流媒体"
---

全双工实时语音、挂断检测、工具和咨询策略、座席语音上下文和 Twilio 媒体流转录。 [语音通话插件](/plugins/voice-call)指南的一部分。

## <a id="realtime-voice-conversations"></a> 实时语音对话

`realtime` 为实时通话音频选择一个全双工实时语音提供商。 它与 `streaming` 是分开的，后者只会把音频转发给实时转录提供商。

<Warning>
`realtime.enabled` 不能与 `streaming.enabled` 组合使用。每个通话只能选择一种音频模式。
</Warning>

运行时行为：

- `realtime.enabled` 支持 Twilio 和 Telnyx。
- `realtime.provider` 是可选的。如果未设置，语音呼叫将按提供商优先级顺序选择第一个配置的实时语音提供商。即使另一个提供程序已经处于活动状态，也会发现 `realtime.providers` 中指定的提供程序；插件禁用和 allow/deny 规则仍然适用。
- 内置实时语音提供商：Google Gemini Live（`google`）和 OpenAI（`openai`），由各自的提供商插件注册。
- 提供商自有的原始配置位于 `realtime.providers.<providerId>` 下。
- 在支持功能工具的模型上，语音通话公开内置的 `openclaw_end_call` 实时工具。它不带参数或调用 ID；活动语音桥将其绑定到当前呼叫。
- Voice Call 默认公开共享的 `openclaw_agent_consult` 实时工具。 GPT-Live 使用本机委派到同一呼叫拥有的​​座席咨询。当调用者要求更深入的推理、当前信息或普通的 OpenClaw 工具时，实时模型可以进行委托。
- `realtime.consultPolicy` 可选地为实时模型何时应调用 `openclaw_agent_consult` 添加指导。
- `realtime.idleHangupMs` 可选择在双方均未在配置的正毫秒数内发出语音后结束活动呼叫。计时器会在座席咨询运行时暂停，并在未设置时禁用。
- 在具有共享上下文解析器的主机上，语音呼叫始终告诉实时模型，它代表可能有其他会话和工作的 OpenClaw 代理。 `realtime.agentContext.enabled` 默认关闭，并控制附加配置的身份和配置文件上下文。支持的较旧主机保留 [ 旧版上下文行为 ](/plugins/voice-call/realtime-and-streaming#agent-voice-context)。
- `realtime.fastContext.enabled` 默认关闭。启用后，语音呼叫首先在索引的 memory/session 上下文中搜索咨询问题，并将授权片段返回到 `realtime.fastContext.timeoutMs` 内的实时模型，然后仅在 `realtime.fastContext.fallbackToConsult` 为 true 时才回退到完整咨询代理。活动内存插件授权会话记录命中；没有该功能的插件无法返回会话命中，而普通内存命中仍然可用。
- 如果 `realtime.provider` 指向未注册的提供商，或根本没有注册实时语音提供商，Voice Call 会记录警告并跳过实时媒体，而不是导致整个插件失败。
- 当 `realtime.enabled` 为 true 时，`inboundPolicy` 不得为 `"disabled"`； `validateProviderConfig` 拒绝该组合。
- Consult 会话密钥在可用时重用存储的呼叫会话，然后回退到配置的 `sessionScope`（默认情况下为 `per-phone`，针对隔离呼叫使用 `per-call`，或者针对配置的座席主会话使用 `main`）。

GPT-Live 使用代理委托而不是本机功能工具。委托代理只能通过呼叫范围的 `voice_call` 绑定结束活动呼叫。其他 `voice_call` 操作和自定义 `realtime.tools` 通过本机委派仍然不可用。

当座席咨询正在进行时，主机语音检测会暂停本地中断。一旦主动呼叫助手接受挂断，取消咨询不会中断该控制操作。助手在执行操作之前仍会检查其绑定调用是否处于活动状态。

### <a id="gpt-live"></a> GPT-直播

语音呼叫使用与 Discord 和 Talk 相同的 Gateway 拥有的 GPT-Live 桥。选择`gpt-live-1-codex`和`cove`即可使用ChatGPT OAuth路由；它首先尝试路由代理的 OpenClaw ChatGPT 配置文件（OAuth 登录或粘贴的 ChatGPT 访问令牌），然后尝试配置的平台密钥、API-key 配置文件和 `OPENAI_API_KEY`。公共平台API路由选择`gpt-live-1`和`marin`。不设置模型会保留语音呼叫提供商的默认设置。

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          realtime: {
            enabled: true,
            provider: "openai",
            consultPolicy: "auto",
            providers: {
              openai: { model: "gpt-live-1-codex", voice: "cove" },
            },
          },
        },
      },
    },
  },
}
```

该桥将 8 kHz 的载波 G.711 mu-law 音频与模型的 24 kHz PCM 流进行转换。 GPT-Live在播放时接收麦克风输入，并具有语音中断功能；语音呼叫不添加本地语音触发取消。出站初始问候语将被固定为以其原始语言进行的第一个逐字回复。语音呼叫等待被叫者的第一次讲话，并有 3 秒的回退时间以静音接听。当启用 Twilio 应答机检测时，出站对话呼叫将保持实时输入和开放，直到出现人为或未知结果为止，在桥准备就绪后有 30 秒的上限。将 `voicemail.holdOpeningMaxMs` 设置为以毫秒为单位的正整数以调整此上限（默认 `30000`）。上限仅释放保留，不分级；人类和未知结果立即释放它。三十秒可以容纳很长的答录机问候语，而不会让错过的回电无限期地保持开放。包括`machine_start`在内的机器结果抑制了超出上限的实时语音；主机拥有语音邮件播放功能。入站问候时间不变。 `voicecall.speak` 请求使用相同的本机会话上下文路径。委派工作保留呼叫的代理、工具策略和取消生命周期。

GPT-Live 拒绝 `realtime.consultPolicy: "always"`：它拥有委派，并且无法强制执行主机触发的转录协商。使用`"auto"`或`"substantive"`引导，或选择支持主机控制转弯的模型。 `realtime.toolPolicy: "none"` 也禁用本机委派的代理协商。

### <a id="per-call-briefs-and-errands"></a> 每次通话的简报和差事

出站 `initiate_call`、`voicecall.initiate` 和 CLI 接受可选的 `brief`。它仅适用于该呼叫并到达语音模型及其座席咨询。开场 `message` 仍然是第一句话。

每个简短字段都是可选的：

| 字段                | 含义                                                                            |
| -------------------- | ---------------------------------------------------------------------------------- |
| `task`               | 以纯文本形式实现什么目标。                                                    |
| `context`            | 任务所需的事实，例如日期、地址和参考号。        |
| `language`           | BCP-47 语言标签或语言描述。                                     |
| `identity`           | 介绍文字，或`{ introduction, disclose: "volunteer" \| "when-asked" }`。   |
| `disclosures`        | 声音可能分享的一系列细节；默认为除身份之外的任何内容。            |
| `approvals`          | 声音可能同意什么；默认情况下不允许付款或额外承诺。 |
| `voicemailMessage`   | 检测到语音邮件时要留下的确切消息。                                 |
| `successCriteria`    | 什么算完成任务。                                                |
| `maxDurationSeconds` | 正整数覆盖，由插件 `maxDurationSeconds` 限制。                  |

编码摘要限制为 8,000 个字符。有关各个字段限制和水管工预订示例，请参阅插件 README。将简短的转向和实时转向视为车主的权威；另一方的声明不会扩大批准或披露权限。

`steer_call` 和 `voicecall.steer` 接受 `callId`、`message` 和可选的 `mode`（默认为 `guidance`，或逐字语音为 `say`）。转向仅限于请求者会话或授权操作员，并且需要精确的活动呼叫 ID。本机委派使用主持人的口头响应路径。随后的咨询会收到最近的八个业主指示。

可选插件配置：

```json5 validate=false
{
  reports: { enabled: true, includeTranscript: true },
  live: { transcript: true, minIntervalMs: 5000 },
  callbacks: { enabled: true, windowMinutes: 60 },
  voicemail: { detection: "twilio", onMachine: "leave-message" },
}
```

报告根据摘要总结文字记录，包括持续时间、结束原因、应答机分类以及启用时的完整文字记录。长文本通过请求者存储的通道路由以有序文本部分发送。 `reports.summaryModel` 可选选择汇总模型； `reports.inboundSessionKey` 为普通呼入提供目标。现有的本地或网络聊天会话通过 SDK 记录编写器接收助理文本，该记录编写器无需其他代理轮流或管理范围即可发布会话更新。不可用的请求者会话会产生记录的传送错误；通话记录保留在通话记录中。默认情况下，所有四个功能均处于禁用状态。

在 `inboundPolicy: "allowlist"` 下，仅当启用实时语音时，启用的回调才会接受在配置的窗口内呼叫的确切 E.164 号码。经典的 STT/TTS 路径从不接受回调。回调链接到出站呼叫，并使用接待员简介来获取消息，而不共享详细信息。 `callbacks.greeting` 和 `callbacks.brief` 可以选择自定义该行为。窗口外的号码遵循现有的呼入政策。

Twilio 接收到指向经过签名验证的语音 Webhook 的 `AsyncAmdStatusCallback`，其中包含 `AsyncAmdStatusCallbackMethod: "POST"`。对于`DetectMessageEnd`，Twilio立即报告人类，但仅在问候语结束时报告机器；在此模式下不保证早期的 `machine_start`。请参阅 [Twilio AMD](https://www.twilio.com/docs/voice/answering-machine-detection)。每个收到的分类都会通过调用 ID 和时间戳进行记录。呼叫元数据保留 `answeredByFirst` 和最新的 `answeredBy`。

Twilio 应答机检测在留下简报的语音邮件消息之前等待 `machine_end_*`。丢失的消息使用提供的身份介绍或中立的联系原因，并承诺稍后重试。它从不读取任务。实时语音将默认语言翻译成简报的语言；明确的消息仍逐字保留。运营商后备默认支持英语、西班牙语、法语、德语、意大利语、葡萄牙语和加泰罗尼亚语；除非提供明确的消息，否则其他语言将回退到英语。

主动实时桥通过与实时转向相同的主机语音路径说出消息。主机在大约 1.5 秒后结束呼叫，没有声音模型输出（在节奏音频离开队列时测量）。无声帧不会延长播放时间。丢失或未完成的响应将在 45 秒后失败，并以错误结束呼叫。仅在没有活动桥的情况下才使用载波文本转语音然后挂断。

在等待检测时，超过三秒的持续远端语音触发了简报语言的简短确认。开口保持固定状态，直到分类或配置固定盖。请参阅 [AMD 调整 ](/plugins/voice-call/configuration#twilio-voicemail-detection-tuning)。该简报告诉语音和咨询代理主机拥有检测到的语音邮件，从而防止模型发送第二条消息。通知呼叫等待检测，然后再向人员播放开头消息或向机器播放语音邮件消息。 `onMachine: "hang-up"` 立即结束机器呼叫。模拟提供者可以模拟检测；其他运营商不变。

### <a id="hangup-detection"></a> 挂机检测

当运营商发送流停止事件或关闭媒体 WebSocket 时，实时呼叫通常结束。如果中介没有立即转发该关闭，OpenClaw 会将 30 秒没有入站媒体视为断开连接，等待 2 秒的宽限期以恢复媒体，然后结束呼叫。

设置 `realtime.idleHangupMs` 以在长时间的语音静音后结束已连接的呼叫。呼叫者语音、呼叫者文字记录、助理 transcript/audio 和飞行中的代理咨询重置或暂停此计时器。取消设置会禁用此行为。保持音乐不是语音，因此请选择适合预期保持时间的值。

如果实时提供程序首先结束其会话，OpenClaw 也会结束运营商呼叫，包括当提供程序报告正常关闭时。这可以防止静默电话连接在语音会话结束后保持打开状态。

支持功能工具的机型还可以在来电要求挂机时拨打`openclaw_end_call`。模型必须在调用该工具之前说出任何最后的话：成功的调用会立即结束当前的提供程序会话和电话连接，因此不会再说出任何后续回复。如果运营商无法结束呼叫，桥接器将保持连接状态，并且模型会收到一个错误，可以向呼叫者解释。配置的 `realtime.tools` 无法按名称替换此内置函数。

对于入站 Twilio 号码，还可以使用 `POST` 将状态回调配置到公共 Webhook URL，并附加 `?type=status`，例如 `https://voice.example.com/voice/webhook?type=status`。包括 `completed` 呼叫事件。 OpenClaw-创建的出站呼叫自动配置其回调。回调提供最快的拆卸信号，而流关闭和不活动后停止保持独立于它。

### <a id="tool-policy"></a> 工具策略

`realtime.toolPolicy` 仅控制咨询运行。它永远不会在支持功能工具的模型上禁用 `openclaw_end_call`：

| 策略           | 行为                                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `safe-read-only` | 暴露 consult 工具，并将常规代理限制为 `read`、`web_search`、`web_fetch`、`x_search`、`memory_search` 和 `memory_get`。                            |
| `owner`          | 暴露 consult 工具，并允许常规代理使用正常的代理工具策略。                                                                                 |
| `none`           | 禁用咨询工具和本机代理委派。在支持功能工具的模型上，内置的结束调用工具和自定义 `realtime.tools` 仍然可用。 |

`realtime.consultPolicy`引导实时模型。当提供商不咨询且 GPT-Live 不支持时，`always` 还会启用主机转录回退：

| 策略        | 指导                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------- |
| `auto`        | 保持默认提示，并让提供商自行决定何时调用 consult 工具。              |
| `substantive` | 直接回答简单的对话衔接内容，并在事实、记忆、工具或上下文之前先进行 consult。 |
| `always`      | 在每个实质性回答之前先 consult。                                                        |

每次调用一次仅运行一次本机咨询。在活动语音会话中重放相同的提供程序调用会共享其待处理结果。即使参数匹配，新调用也会收到 `started: false` 和 `retryable: true` 的繁忙错误。实时模型应在重试之前等待主动咨询的结果，而不是在运行时进行轮询。当不相关的主机强制咨询运行时，本机请求也会收到忙；只有匹配的强制问题（修剪空格后）才能共享该结果。仅相似的措辞并不能识别相同的请求。

重叠调用无法替换待处理咨询的调用者上下文。完成主动咨询仅消耗其所使用的语音；被拒绝的呼叫者语音仍可在现有转录窗口内重试。

当主机工具运行报告取消时，实时模型会收到取消结果，并且电话呼叫保持打开状态。超时和其他工具故障仍然是错误；结束电话会话会抑制未决的咨询结果。

### <a id="agent-voice-context"></a> 代理语音上下文

在具有共享上下文解析器的主机上，每个实时会话都包含一个代理上下文段落，解释语音模型代表具有多个会话的 OpenClaw 代理。它将有关其他会话、运行工作、进度或优先级的问题引导至 OpenClaw。当 `realtime.agentContext.enabled` 为 `false` 时，该段落仍然存在。

启用 `realtime.agentContext` 添加配置的座席身份和选定的配置文件以进行普通语音轮流。 `includeIdentity` 控制配置的名称、表情符号、氛围、主题和 creature/persona 字段； `includeWorkspaceFiles` 控制 `files` 中列出的文件。共享核心解析器通过正常引导路径加载 `IDENTITY.md`、`USER.md` 和 `SOUL.md`，支持引导挂钩和工作区访问。其他工作区相关文件使用安全工作区读取；丢失或不可读的文件将被跳过。 `maxChars` 限制配置文件块，默认为 6000 个字符，并排除代理上下文段落和配置的身份。

OpenClaw 2026.9.6 缺少该共享解析器。在此支持的主机上，语音呼叫保留其附带的可选上下文胶囊：`enabled: false` 省略该胶囊；启用后，身份字段和选定的安全工作区相关文件将遵循各自的控制。 `maxChars` 界定整个可选胶囊，包括标识、标题和截断标记。较新的多会话段落在此路径上不可用。当支持的主机层包含共享上下文解析器时，此兼容性路径将停用。

创建实时会话时会添加上下文，因此不会增加每轮延迟。对 `openclaw_agent_consult` 的调用仍然运行完整的 OpenClaw 代理，并且应用于工具工作、当前信息、内存查找或工作区状态。

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

### <a id="realtime-provider-examples"></a> 实时提供商示例

<Tabs>
  <Tab id="google-gemini-live" title="Google Gemini 直播">
    默认值：API key 来自 `realtime.providers.google.apiKey`、`GEMINI_API_KEY` 或 `GOOGLE_API_KEY`；模型为 `gemini-3.1-flash-live-preview`； 语音为 `Kore`。`sessionResumption` 和 `contextWindowCompression` 默认开启， 适用于更长、可重新连接的通话。可使用 `silenceDurationMs`、 `startSensitivity` 和 `endSensitivity` 来调优电话音频中的更快轮次切换。

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
                instructions: "Speak briefly. Call openclaw_agent_consult before using deeper tools.",
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

请参见 [Google provider](/providers/google) 和 [OpenAI provider](/providers/openai)，了解各提供商特定的实时语音选项。

## <a id="streaming-transcription"></a> 流式转录

`streaming` 将 Twilio Media Streams 连接到实时转录提供商。 经典的流式路径需要 `provider: "twilio"`；与 Telnyx、Plivo 或 mock 的配置会被拒绝。Telnyx 实时音频则使用单独认证的 `realtime.enabled` 路径。

运行时行为：

- `streaming.provider` 是可选的。如果未设置，语音呼叫将按提供商优先级顺序选择第一个配置的实时转录提供商。即使另一个提供程序已经处于活动状态，也会发现 `streaming.providers` 中指定的提供程序；插件禁用和 allow/deny 规则仍然适用。
- 内置实时转录提供商：Deepgram（`deepgram`）、ElevenLabs（`elevenlabs`）、Mistral（`mistral`）、OpenAI（`openai`）和 xAI（`xai`），由其提供商插件注册。
- 提供商专属原始配置位于 `streaming.providers.<providerId>` 下。
- Twilio 发送已接受的 stream `start` 消息后，Voice Call 会立即注册该流，在提供商连接期间通过转录提供商排队传入媒体，并且只有在实时转录就绪后才开始初始问候语。
- 如果 `streaming.provider` 指向未注册的提供商，或未注册任何提供商，Voice Call 会记录警告并跳过媒体流，而不是使整个插件失败。

### <a id="streaming-provider-examples"></a> 流式提供商示例

<Tabs>
  <Tab title="OpenAI">
    默认值：API key 为 `streaming.providers.openai.apiKey` 或 `OPENAI_API_KEY`；模型为 `gpt-4o-transcribe`；`silenceDurationMs: 800`； `vadThreshold: 0.5`。

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
                    apiKey: "sk-...", // optional if OPENAI_API_KEY is set
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
    默认值：API key 为 `streaming.providers.xai.apiKey` 或 `XAI_API_KEY`（如果两者都未设置，则回退到 xAI OAuth 认证配置文件）；端点 `wss://api.x.ai/v1/stt`；编码 `mulaw`；采样率 `8000`； `endpointingMs: 800`；`interimResults: true`。

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
                    apiKey: "${XAI_API_KEY}", // optional if XAI_API_KEY is set
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
