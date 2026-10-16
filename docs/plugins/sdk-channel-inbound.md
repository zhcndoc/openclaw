---
summary: "面向频道插件的入站事件辅助：上下文构建、共享运行器编排、会话记录，以及已准备回复的派发"
title: "频道入站 API"
doc-schema-version: 1
read_when:
  - "你正在构建或重构消息频道插件的接收路径"
  - "你需要共享的入站上下文构建、会话记录或已准备回复派发"
  - "您正在将旧的频道转向助手迁移到 inbound/message API"
---

频道接收路径遵循一个流程：

```text
platform event -> inbound facts/context -> agent reply -> message delivery
```

使用 `openclaw/plugin-sdk/channel-inbound` 进行入站事件规范化、 格式化、根节点和编排。使用 `openclaw/plugin-sdk/channel-outbound` 进行原生发送、回执、持久化投递以及实时预览行为。

## <a id="core-helpers"></a> 核心辅助函数

```ts
import {
  buildChannelInboundEventContext,
  runChannelInboundEvent,
  dispatchChannelInboundReply,
} from "openclaw/plugin-sdk/channel-inbound";
```

- `buildChannelInboundEventContext(...)`：将标准化通道事实投影到 prompt/session 上下文中。通过 `channelContext` 传递通道拥有的 sender/chat 元数据，插件挂钩将其视为 `ctx.channelContext`。从此子路径中增强 `PluginHookChannelSenderContext` 或 `PluginHookChannelChatContext` 以获取特定于通道的字段。这个公共独立构建器是非权威的，不能铸造参与者证据。捆绑生产接收路径使用主机注入的注册 `runtime.channel.inbound.buildContext` 并将准确的 [ 通道入口](/plugins/sdk-channel-ingress) 解析器结果作为 `channelIngress` 传递。最终路由选择后，用 `contextBinding` 解决该结果。仅当相同的活动插件记录、生命周期纪元、代理、会话、消息、事件和准入范围仍然匹配时，Core 才会接受一次；接收路径不得从上下文字段重建参与者来源。只有命名的、经过源验证的不受支持的路径才能通过 `channelIngress: "unsupported"`。
- `runChannelInboundEvent(...)`：对单个入站平台事件执行 ingest、classify、preflight、resolve、 record、dispatch 和 finalize。
- `dispatchChannelInboundReply(...)`：使用投递适配器记录并分发一个已组装好的入站回复。

对于回复，通道插件解码平台参考并水合可访问的父消息。即使无法获取父级，也将引用作为 `reply.replyToId` 传递，并将可用文本和发件人事实作为 `supplemental.quote` 传递。 Core 应用配置的上下文可见性策略并呈现模型的回复关系。引用的机器人文本是当前消息的上下文；它不独立承认机器人创作的转向。默认情况下会保留自行创作的引文文本。默认跳过自行创作的引用媒体；调用者在解析补充媒体时可以显式设置 `suppressSelfQuoteBody: true` 或 `suppressSelfQuoteMedia: false`。

本机命令适配器必须在准备配置的绑定之前对发送者进行授权。来自 `openclaw/plugin-sdk/command-auth-native` 的 `resolveCommandAuthorization(...)` 返回一个可选的 `assertOwnerCurrent` 回调，其中包含主机承认的所有者检查。它不能授予所有权；当没有绑定所有者检查时，回调不存在。在等待准备之前捕获授权结果，将其回调与当前通道和命令策略检查结合起来，并将结果回调作为 `assertActive` 传递到 `ensureConfiguredBindingRouteReady`。 ACP 准备在稍后的后端效果之前检查它，包括排队控件、句柄重新打开和会话替换。撤销后，接受的控制权和结算结果仍然结算；撤销会阻止下一个效果。可选回调保留不携带通道请求权限的现有调用者。

对于有意跳过，`logInboundDrop({ log, channel, reason, target?, onceKey?, hint? })` 通过提供的记录器格式化诊断。对提及门控组使用默认级别记录器和可操作的 `hint`。将 `onceKey` 设置为 account/conversation 示波器（例如 `JSON.stringify([accountId, conversationId])`），以抑制该通道和原因的重复。进程本地缓存保留512个最近使用过的key；被逐出的密钥可以再次记录。对于每条消息的日志记录，省略 `onceKey`。将消息正文和发件人详细信息排除在默认级别的诊断之外。

对于组设置提示，请使用 `openclaw/plugin-sdk/channel-policy` 中的 `resolveChannelGroupsConfigPath({ cfg, channel, accountId, groups })`。传递频道所有者选择的确切组映射，而不克隆它：用于共享组策略解析的 `resolveChannelGroups(cfg, channel, accountId)`，或用于具有自己的继承规则的插件的已解析帐户映射。这会标识创作的根或帐户映射，而无需替换继承的通配符或每组策略。

对于纯媒体入站事件，请将消息正文和命令文本保留为空，并为每个本机附件传递一个 `ChannelInboundMediaInput` 事实。当环境历史记录或其他纯文本载体必须描述这些事实时，请使用 `formatMediaPlaceholderText(media)`。它从 `kind`、MIME 类型、然后路径或 URL 扩展对每个事实进行分类；未下载的本机附件仍应每个提供一种仅类型事实。不要使用格式化程序来合成主要入站正文。

使用 `toInboundMediaFacts(...)` 规范化插件拥有的附件记录，然后将生成的有序数组传递到上下文的 `media` 字段：

```ts
// saved, nativeUrl, messageId, and caption are plugin-supplied values from the
// platform event you just normalized.
const media = toInboundMediaFacts([
  { path: saved.path, url: nativeUrl, contentType: saved.contentType, messageId },
]);

const ctx = runtime.channel.reply.finalizeInboundContext({ Body: caption, media });
```

`toInboundMediaFacts` 从此子路径导出。 `finalizeInboundContext` 不是：它是通过注入的插件运行时作为 `runtime.channel.reply.finalizeInboundContext` 到达的。

数组位置是附件标识。 Per-fact `transcribed`、`messageId` 和 `workspaceDir` 取代了传统并行 index/workspace 字段。 `MediaPath`、`MediaPaths`、`MediaUrl`、`MediaUrls`、`MediaType`、`MediaTypes`、`MediaTranscribedIndexes`、`MediaWorkspaceDir` 和 `MediaStaged` 上下文字段，以及`buildChannelInboundMediaPayload(...)`，仅作为已弃用的兼容性保留。兼容性注册表于 2026 年 7 月 24 日弃用了它们，`removeAfter` 日期为 2026 年 10 月 1 日；请参阅 [ 删除时间表 ](/plugins/sdk-migration/removal-timeline)。新插件不应构造或读取它们。

已经接收注入的插件运行时对象的 Bundled/native 通道可以调用 `runtime.channel.inbound.*` 下的相同帮助器，而不是直接导入此子路径：

```ts
await runtime.channel.inbound.run({
  channel: "demo",
  accountId,
  raw: platformEvent,
  adapter: {
    ingest: normalizePlatformEvent,
    resolveTurn: resolveInboundReply,
  },
});
```

为兼容性分发器组装 `dispatchChannelInboundReply(...)` 的输入，这些分发器将平台投递保留在投递适配器中。新的发送路径应改用 `channel-outbound` 中的消息适配器和持久化消息辅助函数。

## <a id="platform-selected-history-windows"></a> 平台选择的历史窗口

当平台拥有最近历史记录时，将所选条目传递为 `message.inboundHistory` 并设置 `sessionTranscript: { historyLimit, historyKind: "recent" }`。主机呈现该配置的窗口，而不将存储的记录行合并回其中。如果没有 `"recent"`，现有的成绩单丰富和传统的防御性 20 条目提示上限将保持不变。

该通道拥有有界提取、当前 account/conversation 权限、重置边界和当前消息排除。历史记录故障不得静默恢复过时的缓存内容。使选定的快照在格式化上下文和结构化历史记录之间保持一致。

对于明文上下文，`openclaw/plugin-sdk/reply-history` 中的 `buildHistoryContext(...)` 和 `buildHistoryContextFromEntries(...)` 也接受 `historyKind: "recent"`。它们的默认 `"pending"` 成帧不变；使用这些助手而不是发明命令敏感标记。

## <a id="agent-group-dispatch"></a> 代理组调度

共享入站调度程序在普通单代理呼叫之前协调合格的 `broadcast` 条目。通过入站上下文传递真实通道、帐户、对话、线程和根消息身份。核心拥有参与者选择、agent/session 重新绑定、有界兄弟最终摘要、延续身份和同步 `maxTurns` 保留。频道插件拥有准入事实和平台编码；不要在插件中实现另一个参与者循环。

`MsgContext.GroupThread` 将准备好的参与者提及事实作为纯数据合约。共享上下文类型不依赖于提及匹配或渠道注册表；准入解析器在调度之前拥有提及匹配。

一轮是由协调员启动的一个参与者运行。它的预览、块和消息工具发送可以产生多个物理消息。请勿缓冲或计数交付以强制执行 `maxTurns`。组预算是进程本地的且不可恢复的。配置的 ACP 绑定保留其路由的独占所有权。

请参阅 [ 广播组 ](/channels/broadcast-groups) 以了解操作员配置，请参阅 [ 入站提及策略 ](/plugins/sdk-channel-plugins#inbound-mention-policy) 以了解参与者感知准入。

## <a id="internal-turn-sources"></a> 内部转动源

`MsgContext.InternalTurnSource` 标识内部唤醒：`"heartbeat"`、`"cron"` 或 `"exec"`。对于普通频道消息，请将其保留为未设置。它可以防止内部轮流重置会话或替换对话绑定；它不授予执行权限或取代`InputProvenance`。

保留`Provider`和`Surface`作为传输标识，并将回复路由保留在`OriginatingChannel`和`OriginatingTo`中。内部唤醒可能没有传输或显式回复目标。不要在这些通道字段中放置唤醒标签。

对于现有的 SDK 调用方，入站完成和会话记录入口点会将旧版 `Provider` 值 `"heartbeat"`、`"cron-event"` 和 `"exec-event"` 转换为 `InternalTurnSource`。他们从通道字段中删除这些标签，同时保留真实的回复路由。新调用者应直接设置键入的源。

## <a id="receive-acknowledgment-policy"></a> 接收确认策略

从 `openclaw/plugin-sdk/channel-outbound` 导出的 `createMessageReceiveContext(...)` 跟踪一个入站事件的确认状态。其`ackPolicy`选择`shouldAckAfter(...)`接受的阶段：

| 策略                 | 确认边界                                                   |
| ---------------------- | ------------------------------------------------------------------------- |
| `after_receive_record` | 记录持久的入站元数据后，用于重复数据删除和路由。 |
| `after_agent_dispatch` | 调度代理运行后。                                        |
| `after_durable_send`   | 持久外向交货提交后。                                  |
| `manual`               | 没有任何阶段会自动获得资格；呼叫者决定何时确认。 |

帮助程序默认为 `after_receive_record`，而不是 `manual`。调用者仍然执行工作并调用 `ack()` 或 `nack(error)`；选择策略本身并不持久、分派或发送消息。

## <a id="delivery-settlement-contract"></a> 交割结算合同

`ChannelInboundTurnPlan.delivery` 拥有每个逻辑回复有效负载的本机发送。在路由的 API 上，内核运行 `reply_payload_sending`，调用 `preparePayload`，然后准确分配一个 `message_sending` 所有者：

- a声明`durable`分支运行共享持久交付内的钩子；
- a 直接 `deliver` 分支在本机适配器之前运行核心中的钩子；
- an 特殊提供商漏斗在必须在该漏斗内选择持久交付或本机完成时可以使用 `deliverWithProviderMessageSending`。

不要在正常的 `deliver` 回调中再次应用 `message_sending`。仅当在进入提供商漏斗之前无法声明分支时，才使用提供商拥有的回调；它与 `deliver` 和 `durable` 互斥。现有的直接和持久计划继续使用`ChannelInboundTurnPlan`；将异常漏斗显式键入为 `ChannelInboundTurnPlan<"provider_message_sending">`。调用者组装的 `dispatchChannelInboundReply(...)` 保留兼容性边界，并保留其调用者提供的调度程序所有权。

当发送可能已完成但其结果尚未确认时，来自 `openclaw/plugin-sdk/reply-runtime` 的低级 `createReplyDispatcher(...)` 回调可能会返回 `ambiguous: true`。核心记录现有的 `unknown` 托管和 `failedAfterSend` 收据计数，抑制重复回退，而无需证明观察到的交付。已解决的 `suppression` 且原因为 `channel_transform` 记录 `suppressed` 托管。收据的 `anyVisibleDelivered` 仍然保守：它包括不确定的发送。经过验证的不发送仍然可以属于持久恢复队列。 Core 保留重试所有者并记录 `failedBeforeSend`，而不发布标题或最终后备；它不会将失败的尝试算作观察到的交付。

当通道策略有意抑制逻辑负载时，`preparePayload` 可能会返回 `null`。核心记录键入的不可见结果并跳过持久选择、`message_sending` 和本机交付，因此稍后修改挂钩无法恢复通道拒绝的内容。

当适配器选择加入时，核心还拥有终端 `message_sent` 观察。将这些职责分开，以便一个有效负载不会产生重复的修饰符或终端事件。

投递结果字段含义如下：

| 字段                    | 契约                                                                                                                                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `content`                | 本机格式化或最终确定后逻辑负载的提供商接受的可见文本。省略它以使用准备好的有效负载文本进行终端观察。仅媒体发送可以省略它。                             |
| `messageIds` / `receipt` | 可见发送的实际提供者身份。更喜欢 `MessageReceipt`；核心使用其主要提供商 ID 为 `message_sent`。                                                                                            |
| `visibleReplySent`       | 仅当提供程序未生成可见预览或最终消息时，才设置为 `false`。对于该结果，核心不会发出成功的 `message_sent`。                                                                          |
| `suppression`            | 在修改挂钩或有效负载策略解决后键入故意不发送的原因。挂钩取消还可以包括 `cancelReason` 和元数据。核心从不调用直接本机适配器来进行核心拥有的抑制。  |
| `finalization`           | 承诺延迟同一逻辑负载的本地解决，例如关闭或编辑就地流卡。其解析字段覆盖终端观察之前的立即结果和 `onDelivered`。 |

当核心应为此适配器的非持久发送发出标准插件和内部 `message_sent` 事件时，将传递适配器的 `observeMessageSent` 选项设置为 `true`。不要从 `deliver` 返回此选项，也不要在插件中发出这些事件。持久发送已通过共享出站所有者发出，并且不会重复。

每个逻辑负载返回一个结果。 `finalization` 不是第二次发送，不得重新运行 `reply_payload_sending` 或 `message_sending`。一旦 `deliver` 返回，核心就会观察到最终确定承诺的拒绝，因此它不会变得未经处理；回复发送解决后，核心仍在等待原始承诺。然后，它针对每个有效负载最多发出一个终端观察，其中包含最终内容和提供者 ID。 `onDelivered`（如果存在）会收到观察后的确定结果。

`onDelivered` 也收到已解决的抑制结果。抑制的结果具有 `visibleReplySent: false`，不会发出 `message_sent`，并且不计为可见的排队回复。这使得插件可以区分钩子取消和提供者失败，而无需发明本机消息标识。

默认情况下，路由轮次根据 `ctxPayload.SessionKey ?? route.sessionKey` 记录入站元数据。仅当本机命令有意在一个命令会话中执行，同时更新另一提供者路由的目标会话时，才设置 `record.sessionKey`。覆盖会影响入站元数据、转录上下文合并和记录阶段诊断；它不会更改调度路由或挂钩相关性。显式覆盖必须是非空的并且不包含周围的空格。

共享的 `recordInboundSession` 记录器在返回之前加入其元数据写入器，因此调度无法竞争会话存储的创建。如果代理数据库仍在等待启动检查，则在调度之前记录会拒绝，以便通道传输可以重试入站消息。其他元数据写入失败仍然达到`onRecordError`，而不会失败。传递给 `trackSessionMetaTask` 的承诺包括异步错误报告；报告和自动会话维护仍然在前台完成之外。

本机投递失败时拒绝 `deliver` 或 `finalization`。如果没有尝试发送提供商，则从 `openclaw/plugin-sdk/error-runtime` 抛出 `PlatformMessageNotDispatchedError`；核心抑制错误的 `message_sent` 事件。如果本机发送在后续操作失败之前变得可见，则保留错误的可见子集：

```ts
import { createChannelPartialDeliveryError } from "openclaw/plugin-sdk/channel-inbound";

throw createChannelPartialDeliveryError(cause, {
  visibleReplySent: true,
  content: finalizedVisibleText,
  receipt,
});
```

此帮助程序创建的错误在 `cause` 中保留原始故障。 `isChannelPartialDeliveryError(error)`之后，`error.cause`为`unknown`；结构围护结构可能会省略它。

Core 使用提供商可见的内容和身份发出失败的终端观察，然后保持传递失败，以便调用者不会将部分成功误认为是干净的发送。在任何预览、草稿、附件或最终消息可见后，请勿报告 `visibleReplySent: false`。

当 `reply_payload_sending` 或 `message_sending` 注册时，这些钩子必须在创建任何提供者可见的内容之前解决，因为任一钩子都可以重写或取消逻辑负载。急切的本机预览会泄漏预先重写的内容或留下取消的草稿。缓冲预览内容，直到接受的有效负载达到`deliver`；较早启动预览的兼容性调度程序必须在注册任一挂钩时抑制急切的预览。使用来自 [Channel 出站 API](/plugins/sdk-channel-outbound) 的可最终实时预览助手来获取新的预览路径。

## <a id="migration"></a> 迁移

`runtime.channel.turn` 是在入站重命名之前编译的已发布插件的已弃用兼容性别名。它与 `runtime.channel.inbound` 是同一对象，包括其运行时绑定的 `dispatch` 帮助程序。新的和迁移的插件应使用：

- `runtime.channel.inbound.run(...)` 用于原始入站事件。
- `runtime.channel.inbound.dispatchReply(...)` 用于组装后的回复上下文。
- `runtime.channel.inbound.buildContext(...)` 用于入站上下文载荷。
- `runtime.channel.inbound.runPreparedReply(...)`，已弃用，仅用于频道自有的已准备分发路径，这些路径已经会自行组装分发闭包。

`turn`和`runPreparedReply`由`plugin-runtime-api-compat-aliases`兼容性记录携带，其最早删除审核日期为2026年10月1日。该日期是审核日期，而不是预定的删除日期：别名将保留，直到证明每个枚举表面没有捆绑或发布的阅读器。

新插件代码不应引入 `turn`- 命名的通道 API。将模型或代理转词汇保存在agent/provider代码内；通道插件使用入站、消息、传递和回复术语。

## <a id="related"></a> 相关内容

- [Channel 入口 API](/plugins/sdk-channel-ingress) — 此页面将其结果用作 `channelIngress` 的解析器
- [Channel 出站 API](/plugins/sdk-channel-outbound) — 同一通道插件的发送端
- [构建通道插件](/plugins/sdk-channel-plugins) — 完整通道插件演练
