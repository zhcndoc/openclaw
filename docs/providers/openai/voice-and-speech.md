---
summary: "OpenAI 文本转语音、转录以及实时语音设置和身份验证"
read_when:
  - "您正在配置 OpenAI 文本转语音或转录"
  - "您正在为“通话”、“语音呼叫”或 Discord 设置实时语音"
  - "您需要特定实时路线的授权订单"
title: "OpenAI 语音和语音"
sidebarTitle: "声音和言语"
---

## <a id="voice-and-speech"></a> 语音与音频

<AccordionGroup>
  <Accordion id="speech-synthesis-tts" title="语音合成（TTS）">
    捆绑的 `openai` 插件为 `tts` 表面注册语音合成。

    | 设置      | 配置路径                                            | 默认值                          |
    | ------------- | --------------------------------------------------------- | ----------------------------------- |
    | 模型        | `tts.providers.openai.model`                  | `gpt-4o-mini-tts`                |
    | 声音        | `tts.providers.openai.speakerVoice`           | `coral`                          |
    | 速度        | `tts.providers.openai.speed`                  | （未设置）                          |
    | 指令 | `tts.providers.openai.instructions`           | （未设置，仅适用于 `gpt-4o-mini-tts` 系列）  |
    | 格式       | `tts.providers.openai.responseFormat`         | 语音留言为 `opus`，文件为 `mp3` |
    | API 密钥      | `tts.providers.openai.apiKey`                 | 回退使用 `OPENAI_API_KEY`   |
    | 基础 URL     | `tts.providers.openai.baseUrl`                | `https://api.openai.com/v1`      |
    | 额外请求体   | `tts.providers.openai.extraBody` / `extra_body` | （未设置）                        |

    可用模型：`gpt-4o-mini-tts`、`gpt-4o-mini-tts-2025-12-15`、`tts-1`、 `tts-1-hd`。可用声音：`alloy`、`ash`、`ballad`、`cedar`、`coral`、 `echo`、`fable`、`juniper`、`marin`、`onyx`、`nova`、`sage`、`shimmer`、 `verse`。

    `extraBody` 在 OpenClaw 生成的字段之后合并到 `/audio/speech` 请求 JSON 中，因此将其用于需要额外密钥（例如 `lang`）的 OpenAI- 兼容端点。原型键将被忽略。

    ```json5
    {
      tts: {
        providers: {
          openai: { model: "gpt-4o-mini-tts", speakerVoice: "coral" },
        },
      },
    }
    ```

    <Note>
    设置 `OPENAI_TTS_BASE_URL` 以覆盖 TTS 基础 URL，而不影响聊天 API 端点。 OpenAI TTS 需要 OpenAI 平台 API 密钥。 OAuth-only 安装可以使用 Codex- 支持的聊天模型和 GA 实时浏览器在帐户具有访问权限时通过 ChatGPT 订阅进行交谈（请参阅实时手风琴）。 OpenAI TTS 和 GA 实时语音呼叫、网关中继和 Discord 会话仍然需要平台 API 密钥。 Codex GPT-Live 支持 ChatGPT OAuth 并通过共享网关拥有的网桥粘贴 ChatGPT 访问令牌配置文件，包括 Discord 和语音呼叫。
    </Note>

  </Accordion>

  <Accordion id="speech-to-text" title="语音转文本">
    捆绑的 `openai` 插件通过 OpenClaw 的媒体理解转录表面注册批量语音转文本。

    当账户允许时，批量转录可以在标准转录端点上使用选定的 OpenAI API-key 或 ChatGPT OAuth 配置文件。配置的模型、提示和语言提示通过相同的请求路径工作。无需切换凭证类别即可报告访问和配额错误； OAuth 支持并不意味着包含或无限制转录。自定义端点和请求覆盖需要 API-key 配置文件。请参阅 [ 音频和语音注释 ](/nodes/audio#openai-transcription-alongside-chatgpt%2Fcodex-oauth) 以在需要时选择单独的音频 API- 密钥配置文件。

    - 默认模型：`gpt-4o-transcribe`
    - 端点：OpenAI REST `/v1/audio/transcriptions`
    - 输入路径：multipart 音频文件上传
    - 在入站音频转录读取 `tools.media.audio` 的地方使用，包括 Discord 语音通道段和通道音频附件

    要强制入站音频转录使用 OpenAI：

    ```json5
    {
      tools: {
        media: {
          models: [
            {
              type: "provider",
              provider: "openai",
              model: "gpt-4o-transcribe",
              capabilities: ["audio"],
            },
          ],
          audio: {
            enabled: true,
          },
        },
      },
    }
    ```

    当共享的音频媒体配置或单次转录请求提供语言和提示提示时，它们会被转发给 OpenAI。

  </Accordion>

  <Accordion id="realtime-transcription" title="实时转录">
    捆绑的 `openai` 插件为 Voice Call 插件注册实时转录。

    | 设置          | 配置路径                                                          | 默认值 |
    | ----------------- | ----------------------------------------------------------------------- | --------- |
    | 模型            | `plugins.entries.voice-call.config.streaming.providers.openai.model` | `gpt-4o-transcribe` |
    | 语言         | `...openai.language`                                                 | （未设置） |
    | 提示           | `...openai.prompt`                                                   | （未设置） |
    | 静默时长 | `...openai.silenceDurationMs`                                        | `800`   |
    | VAD 阈值    | `...openai.vadThreshold`                                             | `0.5`   |
    | 认证             | `...openai.apiKey`、`OPENAI_API_KEY` 或 `openai` API- 密钥配置文件    | 需要平台 API 密钥 |

    <Note>
    使用 WebSocket 连接到带有 G.711 u-law （`g711_ulaw` / `audio/pcmu`） 音频的 `wss://api.openai.com/v1/realtime`。对于 `openai` API-key 配置文件，网关在打开 WebSocket 之前会创建一个临时实时转录客户端密钥。该流媒体提供商用于语音通话的实时转录路径； Discord 语音录制短片段并改用批量 `tools.media.audio` 转录路径。
    </Note>

  </Accordion>

  <Accordion id="realtime-voice" title="实时语音">
    捆绑的 `openai` 插件为 Voice Call 插件注册实时语音。

    | 设置                               | 配置路径                                                              | 默认值             |
    | --------------------------------------- | ---------------------------------------------------------------------------- | ---------------------- |
    | 模型                                  | `plugins.entries.voice-call.config.realtime.providers.openai.model`     | `gpt-realtime-2.1`  |
    | 声音                                  | `...openai.voice`                                                       | `alloy`             |
    | 温度（Azure 部署桥接）  | `...openai.temperature`                                                 | `0.8`               |
    | VAD 阈值                          | `...openai.vadThreshold`                                                | `0.5`                |
    | 静默时长                       | `...openai.silenceDurationMs`                                           | `500`                |
    | 前缀填充                         | `...openai.prefixPaddingMs`                                             | `300`                |
    | 推理力度                       | `...openai.reasoningEffort`                                             | （未设置）              |
    | 认证                                   | `openai` 身份验证配置文件、`...openai.apiKey` 或 `OPENAI_API_KEY` | GPT-Live API：需要平台； Codex GPT-直播：OAuth 第一；普通GA浏览器：平台优先 |

    `gpt-realtime-2.1` 可用的内置实时语音：`alloy`、`ash`、`ballad`、`coral`、`echo`、`sage`、`shimmer`、`verse`、 `marin`、`cedar`。 OpenAI 建议使用 `marin` 和 `cedar` 以获得最佳实时质量。这是与上面的文本转语音语音不同的一组； TTS-only 语音（例如 `fable`、`nova` 或 `onyx`）对于实时会话无效。当您更喜欢更小、成本更低的实时 2.1 变体时，请将模型明确设置为 `gpt-realtime-2.1-mini`。

    #### <a id="custom-realtime-endpoints"></a> 自定义实时端点

    将 `talk.realtime.providers.openai.baseUrl` 设置为 OpenAI 实时兼容服务器的完整 WebSocket 端点，然后选择 `gateway-relay`。保留 `provider: "openai"`：自定义 URL 不会注册新的提供商。

    ```json5
    {
      talk: {
        realtime: {
          provider: "openai",
          transport: "gateway-relay",
          model: "your-realtime-model",
          providers: {
            openai: {
              apiKey: "${REALTIME_API_KEY}",
              baseUrl: "wss://voice.example.com/custom/realtime?realtime=true",
            },
          },
        },
      },
    }
    ```

    默认值为 `wss://api.openai.com/v1/realtime`。保留URL的路径和查询参数； OpenClaw 设置所选模型的 `model` 查询参数。适用标准 URL 解析；对签名端点使用正确的 URL-encoded 查询。包括完整的端点路径，而不仅仅是 API 根（例如 `/v1`）。 `https:` 和 `http:` URL 分别转换为 `wss:` 和 `ws:`。在受信任的本地网络之外首选 TLS。带有嵌入凭据或片段的 URL 将被拒绝。

    相同的 `baseUrl` 选项可在 OpenAI 实时提供程序块中用于语音呼叫和其他网关端语音桥。它不会更改聊天、转录或 TTS 端点。当自定义端点没有显式模型时，GA Realtime 默认值仍然使用，而不是 GPT-Live。

    这是服务器端实时 WebSocket 覆盖，而不是通用协议适配器：该服务必须支持 OpenClaw 的实时会话事件、音频格式、语音和工具。不暗示特定于提供商的兼容性，包括 DashScope。 API密钥保留在网关上并直接验证套接字；不需要浏览器客户端秘密端点。浏览器 WebRTC、GPT-Live 和 Azure endpoint/deployment 设置无法与此替代结合使用。这些组合会失败，而不是将凭证或音频发送到默认的 OpenAI 端点。

    #### <a id="gateway-controlled-realtime-call-cleanup"></a> 网关控制的实时呼叫清理

    关闭网关控制的 GA 实时 WebRTC 会话会收回其网关权限，并在要求 OpenAI 挂断提供商呼叫之前关闭本地边带。这些是单独的事件；控制关闭不会建立提供者确认或召回已经排队的媒体。

    如果挂断失败，显式取消或清除会报告失败。代理会在 1 秒后自动重试，然后在 5 秒后自动重试，每次尝试的现有超时时间为 30 秒。三次尝试均失败后，日志报告 `cleanup INCOMPLETE`。确切的清理义务及其容量仍然保留，包括跨插件替换：全局八个会话，每个网关客户端两个会话。恢复提供商连接；稍后的 OpenAI broker/plugin 运行时清理可以重试这些保留的调用。重复结束或 `talk.client.close` 不是重试边界，因为网关会话可能已经停用。

    清理义务仅存在于内存中。网关退出、崩溃或重启都可能丢失它们；重新启动并不能证明提供者呼叫已结束。适配器的 30 分钟活动会话租用不是远程生命周期保证或挂断失败后的后备。

    #### <a id="ga-realtime-browser-authentication"></a> GA 实时浏览器身份验证

    普通的 GA browser Talk 首先按以下顺序尝试平台身份验证：配置的实时密钥、`openai` API-key 配置文件，然后是 `OPENAI_API_KEY`。当平台凭证可用时，网关会创建一个临时客户端密钥，并且浏览器直接执行 SDP 交换。

    当未配置平台凭证源时，普通 GA 浏览器 Talk 会回退到 OpenClaw ChatGPT OAuth 订阅配置文件。一次性网关报价经纪人将OAuth保留在服务器端，交换浏览器的SDP，并仅返回答案SDP。显式配置但不可用的平台凭据会失败，而不是回退到 OAuth。

    网关控制的 GA 中继、iOS 客户端拥有的 WebRTC、GA 语音呼叫、直接后端套接字和 GA Discord 实时语音需要平台身份验证。

    #### <a id="gpt-live-api"></a> GPT-直播 API

    未配置模型时，通话和网关中继会话选择 GPT-Live。 OpenAI 平台密钥、API-key 配置文件或 `OPENAI_API_KEY` 选择 `gpt-live-1` 和 `marin`； ChatGPT-only 账户选择 `gpt-live-1-codex` 和 `cove`。配置的平台凭据优先于 ChatGPT 登录，包括当该凭据需要修复时。

    GPT-Live 仅支持音频，因此 Control UI 在此默认情况下不提供相机捕获功能。明确选择 `gpt-realtime-2.1` 来使用相机。 `talk.catalog` 描述已配置的 Talk 代理的默认发现表面；范围为另一个代理的会话在启动时解析该代理的帐户。

    明确的模型选择和该模型支持的声音仍然有效；显式 GPT-Live 模型仅包含音频。当没有固定模型时，需要视频或强制代理咨询回复的请求会保留 `gpt-realtime-2.1`。直接工具桥、Discord 和语音呼叫，无需显式模型，并且 Azure 部署保留其现有默认值。 Discord 或语音呼叫中的显式 GPT-Live 模型使用共享网关中继桥和提供商拥有的委派。安装更新不会重写已保存的配置或切换活动会话。

    对于公共 [GPT-Live API](https://developers.openai.com/api/docs/guides/live)，将 `talk.realtime.model` 显式设置为 `gpt-live-1`。 GPT-Live 处理语音对话，同时委派任务通过您配置的 OpenClaw 代理运行。它可以边听边说；打断讲话本身并不取消智能体的工作。

    该模型需要具有模型访问权限的 OpenAI 平台 API 密钥（从配置的实时密钥、`openai` API-key 配置文件或 `OPENAI_API_KEY` 中选择）。 ChatGPT 订阅凭证不是 `gpt-live-1` 的后备。

    ```json5
    {
      talk: {
        realtime: {
          provider: "openai",
          model: "gpt-live-1",
          speakerVoice: "marin",
          transport: "webrtc",
        },
      },
    }
    ```

    Browser Talk 使用网关代理的 WebRTC；平台密钥保留在网关上。设置 `transport: "gateway-relay"` 为直接服务器 WebSocket 路径。 Discord 实时语音和使用 `gpt-live-1` 的语音呼叫使用相同的网关拥有的直接 WebSocket 桥接和本机代理委派。

    iOS 使用相同的代理 WebRTC 路径并显示公共实时字幕。物理设备语音验证仍悬而未决。

    默认语音为 `marin`。支持的内置语音有 `alloy`、`ash`、`ballad`、`beacon`、`bossa`、`cedar`、`cinder`、`coral`、`delta`、 `echo`、`gleam`、`marin`、`meridian`、`quartz`、`ripple`、`sage`、`shimmer`、`stone`、 `tempo`、`verse`、`vesper` 和 `willow`。不支持的配置语音回退到 `marin`。在开始会话之前选择声音。 `cove` 属于 `gpt-live-1-codex`；使用公共 `gpt-live-1` 模型选择它会回退到 `marin`。

    公共API使用`/v1/live/sessions`来创建WebRTC和主WebSockets。直接插座以`session.start`开头；浏览器会话在 SDP 交换期间启动。网关边带处理委派的工作，而浏览器媒体保留在 WebRTC 上。公开直播指令将 `session.thinking.append` 描述为安静环境，将 `session.commentary.append` 描述为语音更新。定制指令应保留这种区别； Codex 路线使用其单独的 commentary/speakable 通道合约。

    两条路由都指示语音模型等待委托结果，而不是重复相同的后端请求。仍然允许新用户跟进、更正和明确重试。这些指令指导模型的行为；他们不保证每个请求只执行一次。

    公共记录事件是片段，而不是完整的回合。网关拥有有限接收文本快照的持久性；客户端显示字幕而不保存另一个副本。实时字幕和保存的快照都可以跨越同一演讲者的多次交流；它们不重建时间顺序或跨说话者计时。重叠的片段不能识别完整的话语。保存文本并不表明语音或播放已完成。有关公共会话和语音合约，请参阅 OpenAI 的 [ 会话指南](https://developers.openai.com/api/docs/guides/live-conversations)。

    #### <a id="released-gpt-live-browser-and-gateway-relay-authentication"></a> 发布GPT-Live浏览器和网关中继认证

    单独的Codex GPT-Live模型`gpt-live-1-codex`保留了其ChatGPT订阅路线。其浏览器和网关中继 WebRTC 首先尝试 OpenClaw ChatGPT OAuth 订阅配置文件。当 OAuth 不可用时，网关按以下顺序回退到平台身份验证：配置的实时密钥、`openai` API-key 配置文件，然后是 `OPENAI_API_KEY`。使用 `openclaw models auth login --provider openai` 创建 OAuth 配置文件。

    当 `channels.discord.voice.realtime.model` 是 `gpt-live-1-codex` 时，Discord 使用相同的网关拥有的 WebRTC 桥。将 `channels.discord.voice.realtime.speakerVoice` 设置为 `cove` 作为 Codex 默认语音。其他支持的语音为 `arbor`、`breeze`、`ember`、`juniper`、`maple`、`sol`、`spruce` 和 `vale`。语音选择特定于其模型路由，无论客户端是 Talk、Discord 还是 Voice Call。

    当 `plugins.entries.voice-call.config.realtime.providers.openai.model` 为 `gpt-live-1-codex` 时，语音呼叫使用相同的 OAuth- 桥接器；在该提供程序块中设置 `voice: "cove"`。其音频适配器可将 8 kHz 的载波 G.711 mu-law 与模型的 24 kHz PCM 流进行转换，以用于 WebRTC 和直接 WebSocket 路由。初始问候语和 `voicecall.speak` 请求使用本机会话上下文。

    两条 GPT-Live 路由都会产生连续的音频和自己的中断。网关 WebSocket 和 WebRTC 使用相同的采样时钟以记录的速率发送麦克风输入，并在捕获之间提供静音。 Discord 不添加扬声器启动取消或等待响应完成事件来播放简短回复。显式 Discord `requireWakeName: true` 或 `consultPolicy: "always"` 被拒绝，因为 GPT-Live 无法强制执行这些主机策略；它的默认值使用自动提供者委派。每个演讲者的委派工作保留其 Discord 身份和权限。共享的 OpenClaw 座席对话提供房间上下文，而每个发言者的语音模型连接都有单独的声学对话历史记录。请参阅 Discord](/channels/discord/voice-channels#gpt-live-in-discord) 中的 [GPT-Live。

    语音通话还会在实时播放期间使麦克风输入保持打开状态，并且不会添加主持人语音开始取消功能。本机委托使用现有的呼叫拥有的​​代理咨询，包括其工具策略和取消生命周期。对于 GPT-Live，显式 `realtime.consultPolicy: "always"` 被拒绝。 `openclaw_end_call` 和自定义 `realtime.tools` 需要本机功能工具支持，并且在 GPT-Live 上仍然不可用；代表团不会揭露他们。请参阅语音 Call](/plugins/voice-call/realtime-and-streaming#gpt-live) 中的 [GPT-Live。

    两种凭证类型都保留在网关中。一次性报价经纪人交换浏览器的 SDP 并仅返回答案 SDP；它不会向浏览器发送 OAuth 令牌、平台密钥或临时客户端密钥。

    网关中继 WebRTC 根据连续采样时钟调整麦克风音频的速度，因此在较长的通话过程中计时器延迟不会累积。调度程序暂停后，排队的音频会以正常速度恢复，而时间戳会说明经过的间隙。呼叫隐藏格式错误的传入音频数据包并继续播放稍后的音频。一个被拒绝的音频数据包发送不会结束其他连接的呼叫。不可用的编解码器状态、意外的流更改和终端连接状态仍然会结束呼叫。丢包诊断忽略原始错误详细信息。

    启用的 OpenAI 插件会自动启动代理，包括在网关启动后登录时。仅当您启动语音会话时，代理才会打开提供商会话；登录不打开麦克风或加入Discord语音。登录后返回浏览器会刷新聊天麦克风的就绪状态。

    #### <a id="unlisted-and-private-realtime-transport-paths"></a> 未列出的私有实时传输路径

    未列出或私人浏览器 Talk 使用具有网关拥有控制权的平台密钥客户端 WebRTC。网关中继和其他直接后端消费者使用平台密钥双向传输。凭证和提供商控制保留在网关上。

    使用账户发布的实时模型值。未列出的模型值被接受为自由格式的 Talk 配置，但不会通过目录或诊断发布。使用 `talk.realtime.model` 明确选择加入；发布的模型仍然是默认的。

    当前平台密钥会话接受 `marin` 和 `cedar`。 OpenClaw 默认为 `marin` 并将不支持的配置语音映射回它。

    未列出或私有浏览器 WebRTC 先决条件，依次为：

    1. A 通过 `talk.realtime.providers.openai.apiKey`、`openai` API-key 配置文件或 `OPENAI_API_KEY` 配置的平台 API 密钥。
    2. `talk.realtime.model` 设置为帐户发行的值 - 通过 Control UI 中的 **Settings → Talk** 或下面的配置。
    3. 捆绑的`openai`插件以完整模式注册。限制性 `plugins.allow` 列表失败，并显示“OpenAI 实时浏览器会话代理不可用”。

    ```json5
    {
      talk: {
        realtime: {
          provider: "openai",
          model: "<account-issued-realtime-model>",
          transport: "webrtc",
        },
      },
    }
    ```

    网关中继使用直接双向传输：

    ```json5
    {
      talk: {
        realtime: {
          provider: "openai",
          model: "<account-issued-realtime-model>",
          transport: "gateway-relay",
        },
      },
    }
    ```

    浏览器 Talk 使用 `transport: "webrtc"`。

    | 使用者 | Unlisted/private 路由状态 |
    | --- | --- |
    | 浏览器 Talk | 支持平台关键客户端 WebRTC 和网关拥有的边带 |
    | Gateway 中继 Talk | 支持直接平台密钥传输 |
    | Discord 双向语音 | 由平台密钥后端 WebSocket 支持 |
    | 语音通话和电话 | 由平台密钥后端 WebSocket 支持 |
    | iOS 客户端自有 Talk | 实施的；设备实时验证待处理 |
    | Android 实时 Talk | 待Android设备防电翻转； Android 留在本地 Talk |

    这些行描述了已实现的传输，而不是帐户权利或完整的模型功能奇偶校验。在为这些消费者选择未列出或私有路由之前，请参阅 [Discord 语音策略限制](/channels/discord/voice-channels#voice-channels) 和 [ 语音呼叫工具限制](/plugins/voice-call#realtime-voice-conversations)。

    <Warning>
    未列出或私有路由需要平台 API 密钥，该密钥可以访问配置的帐户颁发的模型。 OAuth 不是他们的后备。如果会话创建被拒绝，请验证密钥和配置的模型是否属于同一平台项目。
    </Warning>

    `403 Voice session access denied` 响应已过载，并且其本身并不能证明帐户权限问题：无效的语音会产生相同的响应。首先根据上面接受的列表验证模型和语音，然后根据同一项目验证平台密钥和配置的模型。

    Codex GPT-Live 网关拥有的 WebRTC 路由首先使用 OAuth 和平台回退，通过配置的 OpenClaw 代理路由边带委派，并使凭据远离中继客户端。未列出或私有浏览器 WebRTC 和直接后端套接字仍然仅适用于平台。直接插座可实现Discord语音和语音Call/telephony； OpenClaw 将 G.711 u-law 电话音频与提供商的 24 kHz PCM 流进行转换。 Android 的客户端门保持关闭状态，直到网关中继路径收到来自 Android 设备的实时证明。

    WebRTC 路径创建提供商呼叫并加入其边带。直接 unlisted/private 后端路径打开一个双向会话，发送无帧 `session.update`，然后通过该套接字传送 PCM 音频、转录、委托和委托结果。

    维护人员可以通过选择加入实时测试来使用平台直接路径和单独的 GA 浏览器 OAuth 路径。从`talk.realtime.model`中读取账户发行的实时模型；缺少凭据或模型配置会产生经过净化的跳过，并且测试永远不会打印任一值：

    ```bash
    OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_GPT_LIVE=1 node --import tsx scripts/test-live.mts -- extensions/openai/realtime-quicksilver.live.test.ts
    OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_GPT_LIVE=1 node --import tsx scripts/test-live.mts -- extensions/openai/realtime-quicksilver-gateway-bridge.live.test.ts
    ```

    <Note>
    GA 后端 OpenAI 实时桥使用实时 WebSocket 会话形状，该形状不接受 `session.temperature`；公共 GPT-Live API 使用自己的 Live 会话形状，而 Codex 和 unlisted/private 路线保留其单独的运输合同。 Azure OpenAI 部署仍然可以通过 `azureEndpoint` 和 `azureDeployment` 进行使用，并保持部署兼容的会话形状（包括 `temperature`）。支持双向工具调用和G.711 u-law音频。
    </Note>

    <Note>
    创建会话时选择实时语音。 GA Realtime 允许大多数会话字段稍后更改，但模型发出音频后无法更改语音。 GPT-Live 在启动时修复了其模型、语音、音频格式和委托模式。 OpenClaw 将内置实时语音 ID 作为字符串公开。
    </Note>

    <Note>
    Control UI Talk 使用浏览器 WebRTC 会话。 Codex GPT-Live browser/Gateway-owned 路由首先通过网关报价代理尝试 ChatGPT OAuth，将 OAuth 保留在服务器端。当 OAuth 不可用时，它将按以下顺序回退到平台凭据：配置的实时密钥、API-key 配置文件，然后是 `OPENAI_API_KEY`。公共 `gpt-live-1` API、直接后端套接字以及未列出或私有实时路由需要平台凭据。 `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` 可提供维护者实时验证； OpenAI 腿验证后端 WebSocket 桥、合成的 PCM24 语音到响应音频往返以及浏览器 WebRTC SDP 交换，而无需记录机密。通过 `--openai-only` 运行那些没有 Google 凭证的分支。使用 `--openai-audio-cycles 3` 进行短暂的重复连接、对讲和关闭浸泡。
    </Note>

  </Accordion>
</AccordionGroup>
