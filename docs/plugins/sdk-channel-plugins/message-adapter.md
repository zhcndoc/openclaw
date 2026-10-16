---
summary: "通道消息适配器表面：实时和终结器功能、进度可见性、评论传送和本机 TTS 语音传送"
read_when:
  - "您正在为通道声明 `message` 适配器功能"
  - "您需要进步、安静进步或评论传递规则"
  - "您正在为通道连接本机语音注释传送"
title: "通道消息适配器"
sidebarTitle: "消息适配器"
---

声明并连接核心用于通过您的通道发送的 `message` 适配器。 [构建频道插件](/plugins/sdk-channel-plugins)指南的一部分。

## <a id="message-adapter"></a> 消息适配器

使用 `openclaw/plugin-sdk/channel-outbound` 中的 `defineChannelMessageAdapter` 公开 `message` 适配器。仅声明您的本机传输实际支持的持久最终发送功能，并由证明本机副作用和返回收据的合同测试支持。点 text/media 使用传统 `outbound` 适配器使用的相同传输功能进行发送。有关完整的 API 合同、功能矩阵、接收规则、实时预览最终确定、接收确认策略、测试和迁移表，请参阅 [Channel 出站 API](/plugins/sdk-channel-outbound)。

如果您现有的 `outbound` 适配器已具有正确的发送方法和功能元数据，请使用 `createChannelMessageAdapterFromOutbound(...)` 派生 `message` 适配器，而不是手写另一个桥。适配器发送返回 `MessageReceipt` 值。对于旧版 ID，请使用 `listMessageReceiptPlatformIds(...)` 或 `resolveMessageReceiptPrimaryId(...)` 派生它们，而不是保留并行的 `messageIds` 字段。

对于聚合已确认的可见发送的回合适配器，请使用 `openclaw/plugin-sdk/channel-inbound` 中的 `createAcceptedChannelDeliveryResult(...)`。它结合了本机 `results` 和逻辑​​ `deliveryResults`，包括部分传递错误的可接受子集。逻辑结果的接收优先于其旧消息 ID。结果携带收据、`messageIds`（含空数组）、`visibleReplySent: true`；路由字段保留在收据中。可选的 `content` 被传递，并且 `kind` 和 `replyToId` 使用收据生成器的规则。对于使用换行符连接接受的文本的批次，请使用 `openclaw/plugin-sdk/channel-outbound` 中的 `createChannelDeliveryAccumulator({ kind?, replyToId? })`。每次物理发送成功后才调用`add(source, acceptedText?)`。 `size` 对已接受的发送进行计数，`result()` 返回其组合的收据和非空文本，或者对空批次进行 `no_visible_result` 抑制。失败时，抛出 `partialError(error)` 以保留较早的发送和嵌套的部分传递错误的接受子集；任何验收之前的失败均保持不变。保留传输接受副作用、其他内容加入规则以及无身份结果是否需要适配器中的收据。

通道操作和适配器功能来自所选的插件注册。省略的 `actions`、`message` 或 `outbound` 表面不会由具有相同通道 ID 的另一个插件填充。在注册表范围内创建的准备好的交付处理程序在调用者离开范围后调用时会保留该句柄。

精确声明实时和定稿器能力——core 会据此判断一个渠道能做什么，而声明与实际行为之间的偏差会被视为契约测试失败：

| 表面                               | 值                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `message.live.capabilities`           | `draftPreview`, `previewFinalization`, `progressUpdates`, `nativeStreaming`, `quietFinalization` |
| `message.live.finalizer.capabilities` | `finalEdit`, `normalFallback`, `discardPending`, `previewReceipt`, `retainOnAmbiguousFailure`    |

具有预览功能的频道应使用 `openclaw/plugin-sdk/channel-outbound` 中的 `createLivePreviewLifecycle(...)` 进行最终验收、升级和清理。提供真实的传输操作和显式的传递结果，而不是保留通道本地 final/cleanup 标志。本机流媒体和持久卡保留其特定于传输的最终确定；它们不需要假装是可删除的草稿。查看 [ 进度并预览交付所有权 ](/plugins/sdk-channel-outbound#progress-and-preview-delivery-ownership)。

保持声明的功能由 `verifyChannelMessageLiveCapabilityAdapterProofs(...)` 和 `verifyChannelMessageLiveFinalizerProofs(...)` 测试支持，以便本机进度、编辑、fallback/retention、清理和接收行为不会悄无声息地漂移。

### <a id="progress-visibility-acceptance"></a> 进度可见性验收

进度回调报告的是操作员能够看到的内容，而不仅仅是插件排队的内容。在接受可见进度后返回 `true`，在投递仍处于等待状态或没有发生可见更新时返回 `false`。现有返回 `void` 的同步和异步回调仍保持向后兼容，并被视为可见；新的支持接纳结果的实现应使用显式布尔值。

### <a id="quiet-progress-presentation"></a> 安静的进展演示

当工具行被禁用时，本机进度呈现器必须保留批准请求以及创作的进度文本和计划行。中间工具故障和非零命令退出遵循工具行可见性设置；他们不得绕过安静模式。终端任务错误仍然使用正常的错误传递。共享进度合成器将此策略应用于其快照。

当省略第二个参数或 `undefined` 时，`resolveChannelStreamingPreviewToolProgress(entry, defaultValue?, mode?)` 保持其出厂默认值 `true`。捆绑通道传递 `mode !== "progress"` 作为第二个参数，并将其解析的流模式作为第三个参数，因此未配置的 `progress` 草稿隐藏普通工具行，而 `partial` 和 `block` 预览显示它们。

合成器和格式化程序的 `presentation: "summary"` 选项以及清单格式化程序的 `plain: true` 选项已弃用，但保留其显式输出，直到下一个重大 SDK 版本为止。新调用者应忽略它们并使用 `streaming.progress.toolProgress` 来控制具有标准进度标记的工具行。

使用准备好的代理项目时，使用 `preparedItems: true` 创建合成器。 `pushItemEvent`则拥有可见的工具进度；原始工具、命令输出和补丁回调保留诊断簿记，而无需添加重复行。对于使用原始回调的现有插件，请忽略此选项。它们的参数、细节模式、自定义线条生成器和终端 command/patch 渲染仍然受支持。这是适配器功能，而不是用户配置设置。

Telegram 和 Discord 还通过 `showWorkStatus: true`。通过隐藏详细的工具日志，合成器可以保留准备项目中的一个当前操作状态和有限的子代理状态行。该投影不包括参数、命令标题、输出和私人儿童散文；它保留更新和撤回的真实项目 ID。其他适配器将保留其现有的演示文稿，除非他们选择使用此功能。

对于默认草稿，请在回复选项中传递 `progressRequiresReply: true`。 Dispatch 使用其已承认的回复期望来保持可选的安静转向的私密性；排队的回合使用自己的期望，而不是前一个回合的期望。这不会抑制所需的持久工具结果，例如批准或媒体。

### <a id="quiet-acknowledgement-and-coalesced-progress"></a> 安静的确认和凝聚的进步

`createStatusReactionController({ presentation: "acknowledgement", ... })` 通过工作和成功保持初始反应，跳过不活动警告，并保留现有的 error/cleanup 生命周期。默认 `activity` 策略继续公开详细的生命周期反应。

对于编辑或本机进度，`createDraftStreamLoop` 和可最终草稿控件接受 `coalesceInFlight: true`，以保持后台更新在下一个节流窗口中发送期间到达。显式的 `flush()` 仍然绕过关注和最终确定的延迟。在关闭或旋转流之前取消挂起的更新并等待正在进行的工作。

使用 `createFinalizableDraftLifecycle` 进行物理删除保管，而不是维护插件本地重试队列。 `retire(id)` 声称有独立预览； `retire(id, { defer: true })` 将其记录下来，但没有立即删除。 `cleanupPending()` 重试已停用的 ID，而不删除当前预览。当传输清理策略必须更改时，将同步 `prepareCleanup` 回调传递给 `cleanupPending`；它在删除之前按清除顺序运行。被拒绝的删除仍保留所有权，以供以后尝试清理。

对于同步轮换，`reset()` 推进 `generation`，重新打开传递，并重置当前消息和挂起的更新。发布的消息仍然由适配器负责。 `reset("discard")` 也会在前几代的创建完成后将其淘汰。在序列化发送循环内调用`createMessage(send, publish)`；其同步 `publish` 回调仅安装当前一代的收据。在编辑之前捕获 `generation` 并在发布结果之前重新检查。 `retireCurrent(stopForClear)` 类似的围栏正在等待清理。在轮换之前已经解决发送的适配器可以使用 `resetMessage()` 重置身份和 pending/throttle 状态，而无需重新打开交付或推进生成。

当旋转必须保留现有节流窗口和计划刷新时，将 `"keep"` 作为节流参数传递给 `resetMessage("keep")` 或 `reset("discard", "keep")`。默认情况下会重置两者。在清理期间决定过时预览处置的传输可以将 `{ defer: true }` 作为第三个参数传递给 `createMessage`；陈旧的废弃收据然后进入删除保管状态，而无需立即尝试删除。

### <a id="commentary-delivery-ownership"></a> 评论交付所有权

当频道支持持久评论消息时，设置`commentaryPayloadsEnabled: true`。通常在一份不断发展的进展草案中提供评论的渠道也可以提供 `shouldDeliverCommentaryPayloads`。核心冻结回合的详细可见性，通过 `onVerboseProgressVisibility` 注册该 getter，在分派之前评估一次交付回调，以及整个回合结果的快照。会话更改适用于下一轮。回调是惰性的，除非 `commentaryPayloadsEnabled` 也是 `true`；如果没有静态选择加入，核心既不会评估回调，也不会冻结注册的可见性 getter。

当草稿拥有正常进度时返回 `false`，当详细进度导致草稿屈服于持久评论时返回 `true`。保持回调同步并只读通道拥有的、已准备好的状态。省略它可以保留使用静态选择加入的现有插件的持久交付。回调不控制推理、部分回复、工具进度或最终答案。

会延迟平台确认的入站接收器应声明 `message.receive.defaultAckPolicy` 和 `supportedAckPolicies`，而不是将确认时机隐藏在监控器本地状态中。请使用 `verifyChannelMessageReceiveAckPolicyAdapterProofs(...)` 覆盖每个已声明的策略。

### <a id="tts-voice-delivery"></a> TTS 语音投递

在 `capabilities.tts.voice` 下声明原生语音消息行为。当 TTS 提供商应生成原生语音消息格式时，设置 `synthesisTarget: "voice-note"`。仅当出站语音操作接受可见的最终文本，并执行其传输层的说明文字和溢出规则时，才设置 `captionedFinalText: true`。对于该操作，core 随后会暂存最终模式下的流式文本，并在语音负载被证明未发送时回退到文本。

旧版 `dispatchInboundReplyWithBase` 帮助程序仍然可以从已弃用的 `openclaw/plugin-sdk/inbound-reply-dispatch` 兼容性垫片中获取。请勿将其用于新的频道代码；从 `message` 适配器、收据和 `openclaw/plugin-sdk/channel-outbound` 上的 receive/send 生命周期助手开始。
