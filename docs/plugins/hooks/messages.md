---
summary: "认领入站消息并重写或取消出站交付"
read_when:
  - "您在正常模型调度之前声明了一条入站消息"
  - "您正在使用 reply_dispatch 接管回复生成"
  - "您需要重写或取消出站消息或回复负载"
title: "消息和传递挂钩"
sidebarTitle: "消息"
---

入站拦截、回复接管和出站传递策略。 [ 插件挂钩 ](/plugins/hooks) 指南的一部分。

## <a id="message-hooks"></a> 消息钩子

对于入站拦截，`before_dispatch` 在普通模型调度之前接收传入消息。返回 `{ handled: true, text: "..." }` 以发送最终回复，或 `{ handled: true }` 以不带文本的方式处理它。这是一个声明，而不是用于重写出站或入站内容的 API。

`reply_dispatch` 是高级接管钩子：它接收最终确定的消息上下文和主机调度程序，处理结果报告 `queuedFinal` 并交付 `counts`。使用 `before_agent_reply` 进行简单的合成回复，并使用下面的发送挂钩来转换传出的有效负载。

运行时接管应将 `ctx.onPreparedAgentRunStart`、`ctx.userTurnTranscriptRecorder` 和可选的 `ctx.prepareAssistantTranscriptMessage` 转发给其运行时助手。 ACP 调度助手会自动转发所有三个。共享记录器，以便运行时和网关不会独立附加同一用户轮次；仅在成功写入脚本后标记运行时持久性。

可选的 `ctx.turnAdoption` 句柄将输入的保管权转移给运行时接管。在后端提交之前等待`adopt()`；主机确认采用一次并停止入口启动看门狗。其 `assertCurrent()` 在调度清理或失败采用后抛出。传播采用失败而不是返回处理的结果，以便输入保持可重试。通过适配器转发相同的句柄，包括在重建消息上下文时。 ACP 帮助程序会自动执行此操作。年长的调用者可能会省略句柄；不需要 SDK 迁移。

主机提供的准备器记录使用在仅转录挂钩之前捕获的原始运行时文本，在存储的辅助附加之前显示所有权。它保留原始内容和 ID，并且不授予文件访问或写入权限。让它继续进行，并遵守它自己的轮流；在该轮次中止、被替换或完成后，它会返回未更改的消息。

`onPreparedAgentRunStart` 通知的 `options` 字段可以为 `completionSource: "reply-dispatch"` 提供 `getResult()` 回调。其必需的 `transcriptStart` 字段携带准备好的边界或 `null` 用于没有转录本的运行。主机必须同步返回`"reply-dispatch"`才能接受完成所有权；观察者和其他回调结果使生命周期完成保持不变。包装器必须转发完整的通知及其返回值。已弃用的 `onAgentRunStart` 回调保留其已发布插件的位置参数；请参阅 [ 运行启动迁移](/plugins/sdk-migration/compatibility-policy#reply-run-start-transcript-facts)。调度完成后，`getResult()` 提供记录的 `terminalOutcome`，并且当助手写入成功时，提供其 `assistantTranscript` 收据（目标、消息 ID、幂等性密钥和可选的投影锚点）。然后，主机从所交付的 post-hook 有效负载中发出一个聊天完成，同时保留运行时生命周期事件。收据可防止重复追加；它不授权写入已替换的会话。对于事件流已经拥有聊天完成的运行时，请省略此声明。

将 `eligibleDispatchKinds: ["acp"]` 用于 ACP-only 调度程序。主机对解析的目标（包括会话绑定）进行分类，并将 `ctx.dispatchKind` 传递为 `acp` 或 `agent`。存储的ACP元数据和ACP会话密钥都选择`acp`；丢失的 ACP 绑定不会回退到代理调度。主机在调用之前以及在决定挂钩是否阻止持久聊天准入时应用相同的资格检查。因此，ACP-only 挂钩不会阻止普通代理会话。遗漏的、空的、格式错误的或部分未知的资格列表仍然不受限制。丢失或未知的调度上下文也使钩子保持合格。

将消息钩子用于通道级路由和投递策略：

- `message_received`：观察入站内容，发件人，`threadId`，`messageId`，`senderId`，可选run/session相关性，有序`media`，归一化`location`，稳定`providerUpdate` 由通道提供的身份和元数据。
- `message_sending`：重写 `content` 或返回 `{ cancel: true }`。
- `reply_payload_sending`：重写规范化的 `ReplyPayload` 对象 （包括 `presentation`、`delivery`、媒体引用和文本），或返回 `{ cancel: true }`。
- `message_sent`：观察最终的成功或失败。

对于纯音频 TTS 回复，即使通道有效负载没有可见的 text/caption.，`content` 也可能包含隐藏的语音转录；重写 `content` 仅更新挂钩可见转录；它不会呈现为媒体标题。

`reply_payload_sending` 事件可能包括 `usageState`、尽力而为的每回合实时 model/usage/context 快照。持久交付、恢复重播和没有确切运行相关性的回复忽略它。

当可用时，消息钩子上文会暴露稳定的关联字段： `ctx.sessionKey`、`ctx.runId`、`ctx.messageId`、`ctx.senderId`、`ctx.trace`、 `ctx.traceId`、`ctx.spanId`、`ctx.parentSpanId` 和 `ctx.callDepth`。入站和 `before_dispatch` 上下文在通道具有可见性过滤的引用消息数据时也会暴露回复元数据：`replyToId`、`replyToIdFull`、 `replyToBody`、`replyToSender` 和 `replyToIsQuote`。在读取旧版元数据之前，请优先使用这些一等字段。

`before_dispatch` 在其事件和上下文中接收分配的入站 `messageId`。

在使用特定于通道的元数据之前，应优先使用类型化的 `threadId` 和 `replyToId` 字段。

入站声明和消息接收事件将 `media?: PluginHookMediaFact[]` 公开为标准附件 API。每个事实可以携带 `path`、`url`、`contentType`、`kind`、`transcribed`、`messageId` 和 `workspaceDir`；数组位置是附件标识。当远程附件尚未在本地暂存时，`media` 被省略，`mediaStagingPending: true` 和 `originalMedia` 包含提供者端事实。在后续阶段的事件提供 `media` 之前，请勿将 `originalMedia.path` 视为本地可读。

singular/plural、`mediaPath`、`mediaUrl`、`mediaType`、`mediaPaths`、`mediaUrls`、`mediaTypes` 和匹配的 `originalMedia*` 元数据属性是已弃用的兼容性别名。新的钩子应该使用类型化的顶级数组。

决策规则：

- `message_sending` 中的 `cancel: true` 是终态。
- `message_sending` 中的 `cancel: false` 视为未作出决定。
- Each `message_sending` 处理程序接收原始事件内容。最后返回的`content`获胜；后来的处理者仍然可以取消交货。
- `reply_payload_sending` 在负载规范化之后、通道投递之前运行，包括路由回原始通道的回复。 处理程序按顺序运行，每个处理程序都会看到更高优先级处理程序生成的最新负载。
- `reply_payload_sending` 负载不会暴露运行时信任标记，例如 `trustedLocalMedia`；插件可以编辑负载形状，但不能授予本地媒体信任。
- `message_sending` 可以返回 `cancelReason` 并有界 `metadata` 并取消。新的消息生命周期 API 将其公开为抑制的传递结果，原因为 `cancelled_by_message_sending_hook`；为了兼容性，传统的直接传递不断返回空结果数组。
- `message_sent` 仅用于观察。处理程序失败会被记录，但不会改变投递结果。
