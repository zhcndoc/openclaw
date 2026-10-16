---
summary: "语音、实时转录、实时语音和媒体理解提供商功能"
read_when:
  - "您正在将文本转语音添加到提供商插件"
  - "您正在实施实时转录或实时语音"
  - "您需要实时语音标记、工具结果和委托合约"
  - "您正在注册媒体理解提供商"
title: "提供商语音功能"
sidebarTitle: "语音和音频"
---

提供程序插件可以与文本推理一起注册音频侧功能。 [构建提供商插件](/plugins/sdk-provider-plugins)指南的一部分。

## <a id="voice-and-audio-capabilities"></a> 语音和音频功能

在 `register(api)` 中与你现有的 `api.registerProvider(...)` 调用并列注册每种能力。只选择你需要的选项卡：

<Tabs>
  <Tab id="speech-tts" title="演讲（TTS）">
    ```typescript
    import {
      assertOkOrThrowProviderError,
      postJsonRequest,
    } from "openclaw/plugin-sdk/provider-http";

    api.registerSpeechProvider({
      id: "acme-ai",
      label: "Acme Speech",
      defaultTimeoutMs: 120_000,
      isConfigured: ({ config }) => Boolean(config.messages?.tts),
      synthesize: async (req) => {
        const { response, release } = await postJsonRequest({
          url: "https://api.example.com/v1/speech",
          headers: new Headers({ "Content-Type": "application/json" }),
          body: { text: req.text },
          timeoutMs: req.timeoutMs,
          fetchFn: fetch,
          auditContext: "acme speech",
        });
        try {
          await assertOkOrThrowProviderError(response, "Acme Speech API error");
          return {
            audioBuffer: Buffer.from(await response.arrayBuffer()),
            outputFormat: "mp3",
            fileExtension: ".mp3",
            voiceCompatible: false,
          };
        } finally {
          await release();
        }
      },
    });
    ```

    使用 `assertOkOrThrowProviderError(...)` 来处理提供程序 HTTP 故障，以便插件共享上限错误主体读取、JSON 错误解析和请求 ID 后缀。当请求携带凭据时，传递 `{ requestHeaders: headers }` 作为其第三个参数：这会在保留错误详细信息和元数据之前编辑反映的标头值。将相同的选项传递给 `readProviderJsonResponse(...)` 以忽略不安全的解析器摘录。对于特定于提供程序的故障负载，请使用来自同一 SDK 入口点的 `redactProviderResponseErrorText(text, headers)` 或有界 `readProviderResponseErrorText(response, limitBytes, headers)` 帮助程序。

  </Tab>
  <Tab id="realtime-transcription" title="实时转录">
    消费者可以将候选提供商 ID 作为可选的第二个参数传递给 `listRealtimeTranscriptionProviders(cfg, providerIds)`。这会发现插件本地配置中指定的提供程序，而无需扩大活动注册表或绕过插件启用和 allow/deny 策略。

    优先使用 `createRealtimeTranscriptionWebSocketSession(...)`——共享辅助函数会处理代理捕获、重连退避、关闭刷新、就绪握手、音频排队和关闭事件诊断。你的插件只需要映射上游事件。

    ```typescript
    api.registerRealtimeTranscriptionProvider({
      id: "acme-ai",
      label: "Acme Realtime Transcription",
      isConfigured: () => true,
      createSession: (req) => {
        const apiKey = String(req.providerConfig.apiKey ?? "");
        return createRealtimeTranscriptionWebSocketSession({
          providerId: "acme-ai",
          callbacks: req,
          url: "wss://api.example.com/v1/realtime-transcription",
          headers: { Authorization: `Bearer ${apiKey}` },
          onMessage: (event, transport) => {
            if (event.type === "session.created") {
              transport.sendJson({ type: "session.update" });
              transport.markReady();
              return;
            }
            if (event.type === "transcript.final") {
              req.onTranscript?.(event.text);
            }
          },
          sendAudio: (audio, transport) => {
            transport.sendJson({
              type: "audio.append",
              audio: audio.toString("base64"),
            });
          },
          onClose: (transport) => {
            transport.sendJson({ type: "audio.end" });
          },
        });
      },
    });
    ```

    批量 STT 提供程序，POST 多部分音频应使用 `openclaw/plugin-sdk/provider-http` 中的 `buildAudioTranscriptionFormData(...)`。该帮助程序规范上传文件名，包括需要 M4A- 样式文件名以实现兼容转录 API 的 AAC 上传。

    `requireTranscriptionText(value, message)` 验证响应记录并修剪空格。空字符串表示未检测到语音的音频，并按原样返回；媒体运行程序记录一个非致命的跳过。丢失或非字符串值仍然会随所提供的消息一起抛出。

    官方插件可以使用私有 `blob-runtime` 帮助器 `bufferToBlobPart(buffer)` 进行其他分段上传。直接传递给`new Blob(...)`以保留Buffer范围，无需中间副本；需要时复制共享支持。在等待其他工作之前构造 Blob，以便它立即拍摄字节快照。

  </Tab>
  <Tab id="realtime-voice" title="实时语音">
    消费者可以将候选提供商 ID 作为可选的第二个参数传递给 `listRealtimeVoiceProviders(cfg, providerIds)`。省略普通目录发现的参数；每次通话的候选人不会更改该目录。自动实时语音和语音呼叫转录选择使用声明的别名配置作为默认值，优先选择较早的别名，并优先考虑主要提供商值。显式选择的别名仍会覆盖主提供商配置，而不继承其他别名的设置。

    `resolveConfig` 与 `cfg` 和 `rawConfig` 一起接收可选主机上下文：`agentId`、`surface`（`browser-session`、`gateway-relay` 或 `bridge`）、`autoRespondToAudio` 和`requiredCapabilities.supportsVideoFrames`。使用此上下文来选择与帐户和会话兼容的默认值，同时保留显式模型。省略的表面保留桥接行为。浏览器会话创建为支持摄像头的呼叫者提供 `supportsVideoFrames: true`，为仅音频呼叫者提供 `false`；目录发现未指定要求。 OpenAI 按帐户选择 GPT-Live，除非呼叫者需要视频或手动响应。当网关中继策略控制响应时，会话设置 `autoRespondToAudio: false`。 `talk.catalog` 解析已配置的 Talk 代理和提供商设置的提供商发现默认值，不包括显式模型；准备度和能力使用有效的模型覆盖。在一个目录请求中，所选实时提供程序的解析配置、准备情况和功能将重新用于其目录条目。每个新请求都会再次检查可用性。在不更改现有模型默认值的情况下添加新传输的消费者可以将 `useProviderDefaultModel: true` 传递到 `resolveConfiguredRealtimeVoiceProvider(...)`。这将在特定于表面的分辨率之前填充所选提供商的 `defaultModel` 中缺失的模型；显式配置的模型和请求覆盖仍然获胜。可选的 `talk.catalog` 输入 `provider` 和 `model` 解析功能可实现特定的实时启动，而无需更改已保存的配置。网关音频消费者选择 `gateway-relay` 表面并使用 `resolveConfiguredRealtimeVoiceProvider(...)` 返回的 `capabilities`。该结果将配置、身份验证准备情况和功能绑定到相同的提供者标准化模型。浏览器调用者还将协商的 `clientControl` 传递给解析。将解析的功能携带到 `resolveRealtimeVoiceSessionPolicy(...)` 和共享的 bridge/session harness中，而不是读取提供程序的静态功能默认值。在不创建会话的情况下检查候选者时，目录仍然可以使用 `resolveRealtimeVoiceProviderCapabilities(...)`。例如，GPT-Live 拥有代理委派和中断，但不支持主机强制唤醒名称门控，尽管 GA OpenAI Realtime 支持。

    ```typescript
    api.registerRealtimeVoiceProvider({
      id: "acme-ai",
      label: "Acme Realtime Voice",
      capabilities: {
        transports: ["gateway-relay"],
        inputAudioFormats: [{ encoding: "pcm16", sampleRateHz: 24000, channels: 1 }],
        outputAudioFormats: [{ encoding: "pcm16", sampleRateHz: 24000, channels: 1 }],
        supportsBargeIn: true,
        handlesInputAudioBargeIn: true,
        supportsToolCalls: true,
      },
      isConfigured: ({ providerConfig }) => Boolean(providerConfig.apiKey),
      createBridge: (req) => ({
        // Set this only if the provider accepts multiple tool responses for
        // one call, for example an immediate "working" response followed by
        // the final result.
        supportsToolResultContinuation: false,
        connect: async () => {},
        sendAudio: () => {},
        setMediaTimestamp: () => {},
        handleBargeIn: () => {},
        submitToolResult: () => {},
        acknowledgeMark: () => {},
        close: () => {},
        isConnected: () => true,
      }),
    });
    ```

    声明 `capabilities`，以便 `talk.catalog` 可以向浏览器和本机 Talk 客户端公开有效的模式、传输、音频格式和功能标志。当传输可以检测到有人正在中断助理播放并且提供程序支持截断或清除活动音频响应时，实施 `handleBargeIn`。为没有响应边界的流设置 `bridge.outputAudioMode: "continuous"`，例如 GPT-Live。然后，主机立即播放短音频，在提供商清除后接受新音频，并将中断留给提供商。对于此模式，省略 `handleBargeIn` 并报告 `supportsBargeIn: false`；传入的音频已经驱动了本机中断。省略 `outputAudioMode` 或 `"response"` 将保留基于响应的播放。共享会话和harness拒绝连续流或 `supportsBargeIn: false` 的主机中断，包括后备输出清除。显式会话停止仍然是一个单独的操作。传输必须让参与者的音频可供提供商使用；在启用此行为之前，必须隔离包括注入助理输出的麦克风输入。为此目的，共享浏览器会议适配器与本机虚拟麦克风注入分开捕获远程回放。

    当提供程序以其采样率缓冲传入的 PCM 并在麦克风写入之间提供静音时，设置 `bridge.pacesInputAudio: true`。这可以防止 Discord 等传输在每个捕获边界附加额外的静默突发。 GPT-Live Gateway WebRTC 和 WebSocket 桥共享该输入时钟；关闭桥梁就可以阻止它。当本机音频事件识别某个项目时，将该身份与 PCM 一起传递为 `req.onAudio(audio, { itemId })`；省略没有本机项目 ID 的传输的元数据。如果提供，`req.getPlaybackState()` 按播放顺序返回保留的项目，并具有累积的、项目相关的 `audioEndMs`；排队项目的持续时间为零。在清除输出之前拍摄这些偏移量的快照，并使用提供程序的本机取消和截断语义同步丢弃的输出。空快照意味着没有保留的音频，即使正在生成新的响应。没有播放测量的主机会忽略回调并保留现有的媒体时间戳和播放标记契约。

    发出 PCM 后，提供者可以使用绑定到该确切提供者连接的确认回调来调用 `req.onMark?.(name, acknowledge)`。回调必须拒绝替换的连接和退役标记，同时如果在较旧的播放耗尽之前启动较新的响应，则回调必须保持有效。传输在消耗关联的 PCM 后按顺序调用作用域回调，而不是在接收或编码它时。取消和失败退出提供者单独标记所有权；被丢弃的 PCM 永远不会被报告为已玩过。现有的 `onMark(name)` 和 `bridge.acknowledgeMark(name)` 合同仍然可供远程传输和安装提供商使用。 Discord 保留对那些遗留的未划定范围标记的立即确认。 `onEvent` 观察诊断事件。 OpenAI和xAI将出站帧提交到本地套接字后报告；回调既不确认远程接收也不否决该帧。观察者内部请求的 Control 在该帧之后运行。 `submitToolResult` 可能会返回 `void` 用于同步提交，或者返回 `Promise<void>` 用于提供者桥可以公开的异步完成边界。网关中继会话在确认最终结果或清除链接运行之前等待该承诺；提交失败时拒绝。 `close` 可能会返回 `void` 进行同步处置，或者返回 `Promise<void>` 在提供程序最终确定和资源清理后进行解决。立即停止音频、工具和代表团准入。最终的成绩单回调可能会耗尽直到完成；消费者必须在密封转录队列或报告逻辑会话关闭之前等待它。通过`onClose`报告提供商的终端原因，并拒绝清理失败的承诺。会话外观保留同步处理。一旦提供者返回承诺，重复的关闭就会返回相同的待完成状态。提供者调用期间的可重入关闭调用是无操作的；终端回调不能等待它们自己的处理。

    连续单声道 PCM16/24 kHz 桥接器可以实现 `setAudioOutputPort(output)` 以在连接之前绑定工作人员拥有的播放接收器。 `RealtimeVoiceAudioOutputPort` 带有可转让的 Node `MessagePort` 和共享的关闭栅栏：其第一个 `Int32` 在打开时为 `0`，在撤销后永久为 `1`。绑定此接收器后，通过该端口发送 PCM 和清除事件，而不是 `onAudio` 和 `onClearAudio`；在主机上保留脚本、委托和生命周期回调。 `createRealtimeVoiceAudioPortSender` 提供有界队列、复制的缓冲区所有权、一条未完成的音频消息和有序清除。接收方可以发送`{ type: "flush", marker }`；发送方仅在其排队且未完成的 PCM 得到确认后（包括没有音频时）才回复 `{ type: "flushed", marker }`。较新的刷新标记取代较旧的待处理标记。这是本地接收器许可，而不是可听播放或未来提供商沉默的证明。消费者使用它来命令已提交媒体后面的控制平面完成。接收器使用 `{ type: "ack" }` 确认音频，在接受音频之前检查栅栏，并在端口关闭时关闭其播放资源。请勿使用此路径绕过主机响应或唤醒名称准入。接收器所有者在异步拆卸之前撤销栅栏，因此排队的音频无法进入替换呼叫。

    捆绑惰性提供程序使用私有本地 `openclaw/plugin-sdk/realtime-voice-provider` 表面中的 `createLazyRealtimeVoiceBridgeLifecycle` 来拥有加载、回调防护和等待处置。它在调用提供者工厂之前声明一个生成，因此同步回调可以在工厂返回桥之前关闭或替换桥。提供程序模块保留其输入队列、就绪策略、身份验证和重新连接行为；模块缓存保留在惰性运行时助手中。

    WebSocket 语音桥可以使用同一私有本地表面的 `RealtimeVoiceWebSocketTransport`。它通过提供的 `RealtimeVoiceSessionLifecycle` 共享套接字启动、捕获、发送、重新连接调度和终端清理。提供者保留凭证、套接字构造、会话初始化、事件处理和重播策略。

    该私有本地表面还导出主机的内部浏览器会话请求、功能和提供者 API 类型。官方插件应该导入这些类型，而不是重新声明进程私有挂钩合约。这些仅类型导入不会加载主机的会话或提供程序注册表运行时。

    当提供商无法兑现 `options.suppressResponse` 时，设置 `supportsToolResultSuppression: false`。 OpenClaw 然后避免对内部强制咨询和取消结果的抑制，并拒绝直接抑制结果请求，而不是静默地启动响应。 `createRealtimeVoiceBridgeSession`的消费者同样可以返回`onToolCall`的承诺；同步抛出和拒绝被路由到会话的 `onError` 回调。当响应状态空闲时，主机可以传递 `sendUserMessage(text, { toolChoice })`，以强制该响应使用一个命名函数；稍后的响应将返回会话的配置工具选择。当提供商拥有传入音频中断时设置 `handlesInputAudioBargeIn`。当可用时，通过 `onClearAudio("barge-in")` 转发提供程序缓冲区清除事件；连续提供者可以在没有单独的明确事件的情况下停止发言。主机不得为这些提供商发明本地中断。省略该标志的基于响应的提供程序使用 OpenClaw 的本地输入音频回退检测。

    浏览器会话请求的 `clientControl: { owner: "gateway" }` 记录显式协商的服务器拥有的控制。请求类型需要 `gatewayControl.bindControl` 以及该声明；没有它的请求保留旧的回调形状。 `gatewayControl` 回调的存在本身并不是一种协商：本机委托还可以使用它们进行生命周期处理，同时浏览器保留其数据通道和转录报告。

    对于协商控制，保持供应商身份验证和信令私有，将支持的 `submitToolResult` 和 `sendUserMessage` 命令与 `gatewayControl.bindControl(...)` 绑定，并通过提供的回调转发提供商准备情况、脚本和终端事件。将实例方法绑定到它们的接收者。边带不需要发明媒体方法或创建另一个音频对等体。 `bindBridge(fullBridge)` 仍然可用于稳定的 2026.8.1 SDK 合约，并且仅在版本化的 SDK 中断时被删除。网关仍然是工具策略和运行生命周期的所有者；切勿从模型名称或重复的客户拥有的转录写入中推断控制所有权。

    桥接请求和协商浏览器 `gatewayControl` 可能会提供 `handleDelegationInput(rawText, respond): "control" | "consult"`。在使用抄本上下文、替换挂起的工作或中止主动咨询之前，在本机委托输入上调用此同步的、具有副作用的准入挂钩。仅 `consult` 允许任务失败。 `control`结果消耗该请求，包括拒绝或失败；不要启动任务或发送任务收据。即使在空闲时，状态和取消也是可以控制的；重定向和后续工作需要呼叫所属的工作。普通的闲置请求仍然会被咨询。

    主机从已解析的 `handlesAgentConsult` 功能（而不是 `supportsToolCalls: false` 或回调存在）准备委派所有权。在这种模式下，最终的成绩单仅更新历史记录和可观察性。有工具支持、未指定和无工具的非委托提供者保留其现有的转录行为。没有钩子，保留现有的委派和确认策略。

    `createRealtimeVoiceBridgeSession` 将主机 `runAgentConsult` 转发到提供商拥有的委派桥，并将其绑定到承认的提供商连接。调用者提供其现有的身份和工具策略所有者； Discord 使用始发发言者的正常座席路由和权限。关闭或连接替换会撤销该回调的权限，而不是将其转移到下一个发言者或连接。

    在准备好策略后，主机将控制权限绑定到实际承认的后端尝试。支持代理在注册其句柄时利用现有的尝试指纹进行转发。实时语音提供商不会计算权限或将目标指纹复制到传入的用户输入中。来电者策略是由主机根据准确的实时注册来预测的，并且关闭或更换的主机拒绝注入。正常的回复拥有的尝试保留其原始权限快照和具体模型路由。仅借用回复操作进行生命周期管理的维护尝试会从其自己准备好的执行中接收权限。后端队列在异步输入准备之后、插入消息或回答待决问题之前立即重新验证所有权。

    将 `respond(message)` 绑定到传入控制委托和确切的 call/transport 实例。最多提交一次，在第一次发送尝试之前消耗响应；多个线块是一种响应。发送失败时请勿重试，以较新的 delegation/socket 为目标，或在 close/detach. 之后传送。取消可能会中止支持任务，但不会使其控制回复无效。将委托 ID 和线路编码保留在提供商内部；独立的主机语音和任务接收使用会话上下文。提交并不构成完成或可听交付。

    会话外观在桥采用后（包括准备就绪之前）承认此钩子，并在关闭后隔离操作和回复。包含回调失败，不会导致任务失败。 `onTranscript` 保留其 `void` 回调合约，包括可分配的异步处理程序和关闭时间最终记录刷新。

    具有累积临时成绩单的提供者可以将 `{ textMode: "snapshot" }` 作为第四个 `onTranscript` 参数传递。网关中继将其转发到浏览器，浏览器将临时文本替换到位。对于增量片段省略此元数据。在提供者的实际完成边界处针对每个话语发布一个最终结果，而不是针对每个临时快照。

    名为 `AbortError` 的主机 `runAgentConsult` 拒绝表示取消，即使提供商自己的信号仍然存在。不要将其变成失败任务或重试回复。 `TimeoutError` 仍然失败。关闭传输和取消接受的主机工作是单独的生命周期操作。

    网关中继客户端通过 `talk.session.close` 的可选 `disposition` 表达此选择：当客户端失败时，`"detach"` 保留已接受的代理工作，而 `"abort"`（或遗漏）在停止时取消它。在发送字段之前检查 `talk-session-close-disposition` 能力。如果失败，原始座席答案与任何录制的语音一起仍然可见；仅凭演讲无法证明进行了哪些重叠的磋商。首次记录时，分离后完成的答案可见。已经隐藏的答案会收到一个新的可见转录条目，从模型上下文中排除；结束谈话永远不会重写原始的文字记录消息。

  </Tab>
  <Tab id="media-understanding" title="媒体理解">
    拥有自己的凭证和端点合约的音频提供商可以实施 `transcribeAudioWithContext(request)`。主机在加载每个音频文件后调用它。该请求包括音频字节、文件名、模型、提示、语言、超时、传输设置、配置、代理目录和所选配置文件。解析该调用的凭据；不要在下载附件时保留凭据。

    转录后返回`{ ok: true, value: { text, model } }`。仅在上传音频 **之前验证或配置被拒绝** 时返回 `{ ok: false, error }`。主机记录该错误并自动选择可能会尝试下一个提供商或本地后端。代码为 `ProviderAuthError` 的 `missing-provider-auth` 会使任何自动候选者在没有失败尝试记录的情况下不可用。其他返回的错误将记录为失败的尝试。上传和 HTTP 失败必须抛出：自动选择然后停止，而不将记录发送给另一个提供商。显式模型列表保留其编写的后备顺序。

    已知时返回模型；否则主机将在其结果中保留所请求的模型。 `transcribeAudio` 仍然可供使用主机拥有的 API- 密钥解析和轮换的提供商使用。

    提供商可以实施可选的 `isAudioConfigured(context)`，以使用自己的凭据和端点规则报告音频就绪情况。它返回一个布尔值或 `Promise<boolean>`。导出的`AudioTranscriptionConfigContext`包括配置、配置文件选择器、模型、agent/workspace目录以及有效的基础URL、标头和请求覆盖；它不包含音频。 Gateway Talk 在广告或承认文件转录之前检查此挂钩。与转录共享凭证准备工作，但在实际上传时再次解析凭证。准备就绪并不授权稍后提出请求。如果没有这个钩子，上下文提供者将保留其现有的就绪行为；使用 `transcribeAudio` 的提供商保留主机拥有的凭证检查。

    捆绑媒体提供商可以从私有本地 `openclaw/plugin-sdk/provider-http` 入口点使用 `openProviderWebSocket(...)`。首先使用 `resolveProviderHttpRequestConfigWithOriginTrust(...)` 解析请求设置，然后将其 `baseUrl`、`headers`、`dispatcherPolicy`、`allowPrivateNetwork` 和 `trustConfiguredBaseUrlOrigin` 与 WebSocket `url` 一起传递。

    配置的代理路由保留解析的目标地址检查。适用的环境 HTTP（S） 代理和 OpenClaw- 托管代理保留其现有的 DNS 委派； `NO_PROXY` 绕过和单独的 `ALL_PROXY` 不会禁用目标地址检查。

    代理连接使用共享 Proxyline 支持的 Node 代理。准备好的代理 DNS 查找和代理 TLS 设置通过 `createNodeProxyAgent(...)` 上的 `proxyConnect` 选项；目标 TLS 保持独立。 Proxyline 拥有挂起的代理套接字，包括 CONNECT 完成之前的清理，因此提供程序不需要单独的代理代理依赖项。

    - 承诺在网络策略和代理准备后解析，而返回的套接字仍在连接中。立即附加 `error`、`close` 和 `open` 处理程序；在 `open` 之后发送帧。
    - `timeoutMs` 涵盖 DNS 准备、代理 CONNECT 和 WebSocket 握手作为一个连接截止时间。连接定时器停止在`open`；提供者拥有剩余的转录期限。
    - `signal` 取消准备并在套接字的生命周期内保持活动状态。关闭或终止套接字也会取消挂起的代理连接。释放操作的清理路径中的套接字。
    - `maxPayloadBytes` 限制每条传入消息，默认为 16 MiB。压缩已禁用。提供者拥有音频缓冲、帧节奏、协议解析和转录大小限制。

    ```typescript
    api.registerMediaUnderstandingProvider({
      id: "acme-ai",
      capabilities: ["image", "audio"],
      describeImage: async (req) => ({ text: "A photo of..." }),
      transcribeAudio: async (req) => ({ text: "Transcript..." }),
    });
    ```

    本地或自托管媒体提供方如果有意不需要凭据，可以暴露 `resolveAuth` 并返回 `kind: "none"`。 对于未明确选择加入的提供方，OpenClaw 仍然保留常规认证门控。现有提供方可以继续读取 `req.apiKey`； 新提供方应优先使用 `req.auth`。

    ```typescript
    api.registerMediaUnderstandingProvider({
      id: "local-audio",
      capabilities: ["audio"],
      resolveAuth: () => ({
        kind: "none",
        source: "local-audio plugin no-auth",
      }),
      transcribeAudio: async (req) => ({ text: "Transcript..." }),
    });
    ```

  </Tab>
</Tabs>
