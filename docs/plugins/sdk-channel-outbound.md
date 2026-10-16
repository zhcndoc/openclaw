---
summary: "用于频道插件的出站消息生命周期 API：适配器、回执、持久化发送、实时预览和回复流水线辅助工具"
title: "频道出站 API"
doc-schema-version: 1
read_when:
  - "你正在构建或重构消息频道插件的发送路径"
  - "你需要持久化的最终回复发送、回执、实时预览最终化或接收确认策略"
  - "你正在从 channel-message 或旧版回复分发辅助工具迁移"
---

通道插件公开来自 `openclaw/plugin-sdk/channel-outbound` 的出站消息行为。使用 `openclaw/plugin-sdk/channel-inbound` 进行 receive/context/dispatch 编排。

核心拥有队列、耐用性、耐用的 **ingress 监视器和排出**（`createChannelIngressMonitor`、`createChannelIngressDrain` 和 `openChannelIngressDrain`）、通用重试策略、回合采用生命周期（`turnAdoptionLifecycle` / `bindIngressLifecycleToReplyOptions`）、挂钩、收据，以及共享的 `message` 工具。该插件拥有本机 send/edit/delete 调用、目标规范化、平台线程、选定的报价、通知标志、帐户状态、入口检查和有效负载编码、通道键、不可重试谓词、可选的取代授权和特定于平台的副作用。

## <a id="durable-ingress-monitors"></a> 持久化入口监控器

当通道必须在分发之前持久化已接受的传输事件时，请使用 `createChannelIngressMonitor(...)`。它将通道入口队列和排空流程与共享的接纳、轮询、清理、投递和关闭生命周期组合在一起。仅当传输层拥有实质不同的接纳或泵送契约时，才使用较底层的 `createChannelIngressDrain(...)`。

必需的选项如下：

| 选项                           | 契约                                                                                                                                                                                                                                                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `queue`                          | 一个 `ChannelIngressQueue`，或用于打开账户作用域队列的延迟工厂。                                                                                                                                                                                                                                  |
| `inspect(raw, context)`          | 返回稳定的 `eventId` 和序列化后的 `laneKey`；对于应忽略的事件返回 `null`。声明时的事实必须与持久化的 id 和 lane 匹配。                                                                                                                                                                    |
| `payload`                        | 提供有效负载版本和主体 serialization/deserialization. 使用 `storage: "raw-event"` 作为标准 `{ version, rawEvent }` 字符串包络，或为现有的特定于通道的形状提供自定义 encode/decode 回调。 `createClaimError` 对无效版本或更改的身份进行分类。 |
| `deliver(raw, lifecycle, claim)` | 分发一个解码后的事件，并接收完整的接管生命周期。它可以返回 `completed`、`deferred`、`failed-retryable`，或不返回任何内容。                                                                                                                                                                |
| `pollIntervalMs`                 | 在监视器运行时安排 recovery/drain 轮询。                                                                                                                                                                                                                                                     |
| `retention`                      | 提供修剪节奏和 completed/failed TTL 和入口盖。                                                                                                                                                                                                                                              |

监视器对准入进行序列化，因此附加退避不能反转通道。默认有界附加延迟为 `0`、`100` 和 `300` ms；耗尽会拒绝传输回调，而不是调度未持久化的事件。在索赔时，它会解码版本有效负载，重新运行 `inspect`，并在交付前拒绝 id 或通道不匹配。当检查需要异步准备时，设置可选的`inspectAsync(raw, context)`。在准入和声明验证方面，支持主机更喜欢它而不是 `inspect`。保留 `inspect` 作为较旧主机的同步后备，从而忽略同伴。两个回调必须派生相同的标识和通道。标准原始事件便利监视器保留其同步检查合同。

异步检查保持在现有准入顺序内。 Shutdown 和 `waitForIdle()` 加入已接受的检查及其持久附件，包括当渠道拥有其单独的交付宽限时的待处理索赔检查。索赔检查在交货前重新检查停机和索赔取消。待处理的索赔检查会占用现有的起始时隙，并使 `onActivityChange` 保持忙碌，直到完成或转移到交货。

`onDurableAdmission(raw, context)` 在每个持久队列（包括重复队列）之后运行。当且仅当此准入插入了 `(queue_name, event_id)` 行时，`context.isNew` 才是 `true`。它并不表明索赔所有权或最终交付。如果保留先前修剪了该行，则稍后的准入可能会再次插入该行并报告 `isNew: true`。

`deliver` 接收 `onAdopted`、`onDeferred`、`onAdoptionFinalizing`、`onFailed`、`onCancelled`、`onAbandoned` 和 `abortSignal`。使用 `onFailed` 表示传递错误，使用 `onCancelled` 表示必须保留重试记帐的显式预采用取消，并使用 `onAbandoned` 表示未采用的回合应消耗重试尝试。没有明确切换的返回标志着采用了终端无调度事件。 `admission` 始终是 `exclusive`。延迟移交可以保留声明，而关闭或中止则可以重试未采用的工作。监控器独立于索赔结算来跟踪交付，因为采用可以在渠道的交付承诺返回之前删除一行。

### <a id="one-turn%2C-several-durable-claims"></a><a id="one-turn-several-durable-claims"></a> 一转，几项持久索赔

一个轮流回答多个入站事件的通道为每个事件保留一个持久声明，并且每个事件都必须达到最终处置。`fanInChannelIngressLifecycles(lifecycles)`， 从`openclaw/plugin-sdk/channel-ingress-runtime`，返回单个`ChannelIngressLifecycle`将每个回调分散到所有回调中，加上`settle`， `abandon`， 和`cancel`对于在回调之外完成的路径。按照事件声明的顺序传递事件的生命周期；`undefined`条目被跳过，并且输入为空`lifecycle: undefined`因此调用者可以退回到单声明路径而无需分支。采用组合生命周期会采用每个索赔，而放弃它会将每个索赔返回到其重试预算 - 没有索赔会被半解决。采用按照声明被通过的顺序进行，而采用被拒绝的声明（当另一个所有者采用它时，消耗会增加）会自行失败，而其后面的每个声明，而已采用的声明仍保持采用，因此拒绝到达调用者，而没有留下任何东西。

仅当一名智能体真正消耗了多项索赔时才使用它。单独响应每个事件的通道会直接传递该事件的生命周期。

### <a id="start-slots-and-deferral"></a> 开始时段和延期

`drain.startLimit` 限制排水一次开始的交付数量。延迟的交付通常会保留其槽位，因为默认 `deferredLaneOccupancy: "hold"` 上的延迟交付仍会序列化其通道。声明 `deferredLaneOccupancy: "release"` 的耗尽会在延期上放弃通道，因此其延期交付也会返还其起始槽位，其范围受等于 `startLimit` 的预算限制：开放交付回调保持在 `startLimit` 加上该预算之内，超过它的延期将保留其槽位。如果没有发布，少数延期交付将占据每个槽位并拖延其他通道。有多少已移交的延迟工作可能会立即悬而未决，这仍然是排水所有者的语义，不受此预算的影响。

可选设置包括自定义附加延迟、用于高级排出 ordering/concurrency/retry 策略的 `drain` 选项块、外部 `abortSignal`、时钟、泵错误报告、停止错误工厂和准入策略。返回的监视器暴露 `admit`、`ensureQueueAvailable`、`start`、`pause`、`stop`、`waitForIdle`、`isRunning` 和 `isStopped`。当插件拥有的迁移或准备必须在队列打开之后但排出开始之前运行时，请使用 `ensureQueueAvailable()` 检查（可以安全重复）。 `stop` 首先解决接受的接纳，然后中止并处理排水，等待泵和主动交付，并再次处理以结束惰性创建竞赛。

将传输特定的脱敏、原始封装验证、不可重试分类以及持久化负载形态保留在插件中。Webhook 传输应仅在 `admit` 完成后确认；不可重放传输应显式报告持久化追加耗尽，而不是静默分发。

### <a id="deferred-claim-heartbeats"></a> 延迟索赔心跳

当插件包装入口生命周期或将其映射到 `turnAdoptionLifecycle` 时，转发 `onDeferredHeartbeat` 和 `deferredHeartbeatIntervalMs`。 `bindIngressLifecycleToReplyOptions(...)` 转发两者。排水器从其采用停顿超时中得出可选节奏；扇入使用最短的正、有限源节奏。队列仅在拥有生命周期时进行更新，在采用、完成、所有权丢失或回调失败后停止。心跳并不采纳或完成声明。

省略节奏的包装器仍然有效，但不能定期更新；他们的延期声明仍然可以达到收养监管超时。插件不得运行独立的计时器来使废弃的工作保持活动状态。

## <a id="adapter"></a> 适配器

大多数插件会定义一个 `message` 适配器：

```ts
import {
  defineChannelMessageAdapter,
  createMessageReceiptFromOutboundResults,
} from "openclaw/plugin-sdk/channel-outbound";

export const demoMessageAdapter = defineChannelMessageAdapter({
  id: "demo",
  durableFinal: {
    capabilities: {
      text: true,
      replyTo: true,
      thread: true,
      messageSendingHooks: true,
    },
  },
  send: {
    text: async ({ cfg, to, text, accountId, replyToId, threadId, signal }) => {
      const sent = await sendDemoMessage({
        cfg,
        to,
        text,
        accountId: accountId ?? undefined,
        replyToId: replyToId ?? undefined,
        threadId: threadId == null ? undefined : String(threadId),
        signal,
      });

      return {
        receipt: createMessageReceiptFromOutboundResults({
          results: [{ channel: "demo", messageId: sent.id, conversationId: to }],
          kind: "text",
          threadId: threadId == null ? undefined : String(threadId),
          replyToId: replyToId ?? undefined,
        }),
      };
    },
  },
});
```

仅声明本机传输实际保留的功能。使用从此子路径导出的匹配合约助手覆盖每个声明的功能：

- 发送：`verifyChannelMessageAdapterCapabilityProofs(...)`
- 持久最终交付：`verifyDurableFinalCapabilityProofs(...)`
- 实时预览：`verifyChannelMessageLiveCapabilityAdapterProofs(...)` 和 `verifyChannelMessageLiveFinalizerProofs(...)`
- 接收确认：`verifyChannelMessageReceiveAckPolicyAdapterProofs(...)`

## <a id="progress-and-preview-delivery-ownership"></a> 进度和预览交付所有权

为每个承认的回复生命周期从 `openclaw/plugin-sdk/channel-outbound` 创建一个 `createLivePreviewLifecycle<TPayload, TId>(options)`。它拥有最终交付事实和预览托管权。将提供者操作、线程、授权和本机验收检查保留在通道适配器中；不要保留并行 `finalDelivered` 或 `previewCommitted` 标志。

可选的 `draft` 提供 `flush`、`id`、`discardPending`、`clear` 以及 `seal`（如果支持）。 `discardPending` 必须在等待正在进行的工作之前停止新的更新。 `clear` 删除捕获的提供者工件；返回`false`表示未确认删除。没有可删除预览的本机流省略 `draft` 而不是提供无操作操作。

| 选项               | 含义                                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `retainOnError`      | 接受错误后保留最终预览。默认为`false`；使用通道现有的错误呈现策略。 |
| `cleanupUndelivered` | 当没有交付最终结果并且回合没有失败时，允许清理未使用的预览。默认为 `false`。               |
| `onFinalStarted`     | 当最终交付开始时同步停止进度生产者。                                                          |
| `onFinalDelivered`   | 同步观察无错误决赛的完成。部分接受不会触发此通知。              |
| `onCleanupFailure`   | 报告清理失败而不替换已接受的交付结果。默认发出一般警告。                 |

在实际交割边界拨打`deliver({ kind, payload, isError, adapter, deliverNormally, onNormalDelivered })`。 `deliverNormally` 返回 `LivePreviewDeliveryResult`：现有通道传送结果，具有显式 `visibleReplySent` 布尔值和提供者的收据或消息 ID（如果可用）。不要将排队或本地缓冲的工作报告为已接受的交付。

对于就地促销，`adapter` 提供 `buildFinalEdit`、`editFinal` 以及任何提供商特定的收据、补充媒体或模糊编辑处理。新最终传输省略了编辑操作。所有者在观察员和补充交付之前记录升级，因此稍后的警告无法编辑或删除升级的答案。

`deliver` 返回交付类型、实时状态快照以及任何已接受的 `deliveryResult`。已接受的部分错误保留其已接受的收据。进度刷新的错误不是最终发送的证据。失败或抑制的最终发送不会触发成功的最终清理。不会重试显式补充抑制；旧版布尔值 `false` 补充结果仍然符合正常回退的条件。

| 手术                              | 用途                                                                                                                                                                                                                                                                                                   |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `beginFinalDelivery()`                 | 在等待提供商拥有的最终确定之前冻结进度。这记录了待交付，而不是接受，并且不会停止本机传输。                                                                                                                                                   |
| `observeDelivery(result, { isError })` | 通过本机或 source/message-tool 路径记录提供商确认的最终交付，并取消符合条件的临时进度。看不见的结果会被忽略；进度收据不是最终证据。 `isError` 区分接受的错误响应和任务成功，默认为 `false`。 |
| `observeFailure(result?)`              | 记录最终调度程序失败。传递提供商确认的接受子集以进行部分交付；永远不要从错误的类别推断接受。先前完成的决赛不会被撤销。                                                                                                        |
| `observeSuppression()`                 | 记录有意的最终不发送决定，例如通过出站修饰符挂钩取消。它无法隐藏现有的交付失败或撤销已接受的内容。                                                                                                                              |
| `cleanup({ failed })`                  | 暂停更新并清理符合条件的临时预览。 Failed/partial 决赛和保留或升级的预览将受到保护。清理失败无法授权重新发送已接受的内容。                                                                                                           |
| `retainPreview()`                      | 将工件从自动清理中移出，例如在接受的连续切换之后。这并不要求最终交付。                                                                                                                                                               |
| `reset()`                              | 开始下一个承认的回合、助理回答或区块生成。业主的栅栏陈旧，等待新一代完成。传输仍然拥有其相应的消息身份轮换；两者都在辅助边界上前进。                                                |

只读 `finalStarted`、`finalDelivered`、`finalSucceeded`、`finalFailed`、`finalSuppressed` 和 `previewFinalized` 属性是该所有者的投影。 `finalDelivered`表示部分最终内容被接受，包括partial/error结果；这并不意味着完成。 `finalSucceeded` 要求决赛完整无误。 `finalFailed` 标识失败或部分传递，而不是错误消息传递成功的模型错误。保留退回的收据。 `previewFinalized` 还涵盖保留的工件和无法再次升级的已接受替代品。

当提供商拥有的分页或延迟完成无法使用通用 `deliver` 算法时，请使用观察操作。在第一次等待之前开始，然后在实际结算时报告接受、失败或故意抑制。缓冲的内容和不确定的发送不是可见的最终证据。

已发布的 `defineFinalizableLivePreviewAdapter` 和 `deliverWithFinalizableLivePreviewAdapter` 帮助程序保留其现有签名和旧版 `void`-means 提供的约定。他们调用相同的交付实现，而不是第二个状态机。新的集成应该使用有状态的所有者和显式的结果。这不会更改任何通道配置或流默认值。

## <a id="outbound-echo-suppression"></a> 出站回声抑制

当平台可能将插件自身发送的出站消息重新作为入站消息投递时，请使用频道、账户、会话以及稳定的平台消息或来源标识调用 `recordOutboundMessageIdentity(...)`。共享的入站轮次路径会在会话记录或代理分发之前，在有界的 30 秒时间窗口内丢弃匹配的标识；来源标识可以在发送前预留，或在移除频道路由时刷新，以消除投递竞态。`isRecentOutboundMessageIdentity(...)` 为频道诊断和测试提供相同的查询功能。不要针对同一个稳定标识维护并行的频道本地 TTL 缓存。

## <a id="plain-text-sanitization"></a> 纯文本清理

当出站适配器需要将受支持的 HTML 格式标签转换为轻量级文本标记时，请使用 `sanitizeForPlainText(...)`。默认会保留现有的聊天风格加粗和删除线标记。仅当该渠道会将结果重新解析为 Markdown 时，才传入 `{ style: "markdown" }`：

```ts
import { sanitizeForPlainText } from "openclaw/plugin-sdk/channel-outbound";

const chatText = sanitizeForPlainText(text);
const markdownText = sanitizeForPlainText(text, { style: "markdown" });
```

Markdown 风格使用 `**bold**` 和 `~~strikethrough~~`；斜体和行内代码在两种风格中都保留 `_italic_` 和反引号标记。应在渠道边界选择样式，而不是在清理后重写标记文本。

比较散文（例如 `🙂<limit and wait>5s`）仍保留文字文本，包括当左操作数是 Unicode 符号或字母时。

## <a id="delivery-evidence"></a> 投递证据

`MessageReceipt`记录通道适配器返回的结果。具体的平台消息标识符表明平台发送路径接受了该消息；它们不能证明收件人的设备显示或读取了它。目标和路由标识符（例如聊天、频道、房间、对话或收件人 JID）是元数据，而不是 `platformMessageIds`。没有平台消息标识符的收据仅是本地收据元数据。提供者观察到的接收线程会覆盖请求的路由线程。如果批次包含冲突的提供者线程，则每个部分保留其线程，并且聚合收据将省略 `threadId`。具有已读回执或设备传送状态的通道应通过单独的特定于通道的路径跟踪这些事实。

当适配器故意省略发送前发送时，返回 `outcome: "not_sent"` 并带有空收据且不包含消息 ID（旧版出站适配器使用空 `messageId`）。核心将 `adapter_returned_no_send` 记录为有意抑制，不计算任何物理发送，并跳过发送成功和提交挂钩。请勿将此结果用于没有平台 ID 的已确认发送或发送后的未知结果。空收据本身并不能区分这些州；当 `outcome` 被省略时，现有的确认行为不会改变。

如果通道适配器可以证明重试失败无法复制收件人可见的发送，并且没有开始可完成的调用，则从 `openclaw/plugin-sdk/error-runtime` 中抛出 `new PlatformMessageNotDispatchedError("...", { cause: error })`。然后，核心可以清除陈旧的发送尝试证据并安全地重试排队的意图。只有拥有最终调度边界的适配器才可以做出此断言。在 finalization/send 调用开始或返回不明确的结果后，切勿使用标记；错误标记可能会重复消息。

对于永久本地预检拒绝（例如未解决的帐户所有者），请传递 `{ cause: error, retryable: false }`。交货失败而未发货；它不是不明确的发送，并且在配置更正之前不应重试。

## <a id="existing-outbound-adapters"></a> 现有的出站适配器

如果频道已经有兼容的 `outbound` 适配器，请从中派生消息适配器，而不是重复发送代码：

```ts
import { createChannelMessageAdapterFromOutbound } from "openclaw/plugin-sdk/channel-outbound";

export const messageAdapter = createChannelMessageAdapterFromOutbound({
  id: "demo",
  outbound,
  durableFinal: {
    capabilities: {
      text: true,
      media: true,
    },
  },
});
```

派生适配器并不会使通道拥有的准备调度程序持久。通过持久助手路由其最终发送，同时保留特定于通道的发送后效果和仅回调传输目标。本机发送成功后运行`message.send.lifecycle.afterSendSuccess`；对于排队发送，`afterCommit` 在队列确认后运行。将效果保留在所需的边界，而不是仅将它们留在遗留调度程序中。

## <a id="durable-sends"></a> 持久化发送

运行时发送辅助工具也位于 `channel-outbound`：

- `sendDurableMessageBatch(...)`
- `withDurableMessageSendContext(...)`
- `deliverInboundReplyWithMessageSendContext(...)`
- draft streaming/progress 帮助器，例如 `resolveChannelDraftStreamingChunking(...)`

`sendDurableMessageBatch(...)` 和 `withDurableMessageSendContext(...)` 默认为 `durability: "required"`：未能持久保存发送意图会在平台调用之前停止传递。使用 `durability: "best_effort"`，队列写入失败可能会转为记录的仅实时发送，而无需崩溃恢复。这些耐用帮手不接受 `durability: "disabled"`。

`sendDurableMessageBatch(...)` 返回一个明确结果：

| 结果          | 含义                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------- |
| `sent`           | 至少有一条可见的平台消息被平台发送路径接受            |
| `suppressed`     | 不应将任何平台消息视为缺失                                        |
| `partial_failed` | 在后续有效载荷或副作用失败之前，至少有一条平台消息被接受 |
| `failed`         | 未产生任何平台回执                                                        |

当一个批次混合了已发送、已抑制和失败的有效载荷时，请使用 `payloadOutcomes`。不要根据空的旧版直接投递结果推断 hook 被取消。

A `suppressed`当其原因是时，结果是不明确的`adapter_returned_no_identity`，或任何有效负载结果记录发送、无身份发送或失败`sentBeforeError`。在将抑制视为故意不交货之前检查整个批次。对于已知的遗漏，操作可以返回`{ status: "suppressed", reason: result.reason }`没有工具错误或伪造收据。保持自由形式的钩子诊断的私密性。抑制不会恢复先前失败的发送。

失败是不允许通过另一条路径发送相同的有效负载。一旦被接纳，队列就拥有重试或协调权，直到其确切所有者确认或最终撤销该意图。待保管不是交货收据：保留部分收据，并且不要将未确认的 `ask_user` 提示报告为可见。网关 `OUTBOUND_DELIVERY_QUEUED` 响应表示交付正在等待，不得重新发送；不明确的发送可能需要协调而不是自动重试。

当传输在首次成功发送期间创建线程时，出站适配器可以实现 `adoptTargetFromDelivery(...)`。从平台回执中返回类型化的线程 ID，Core 会将其传递到该持久化批次中的后续有效载荷、固定项和投递后 hook。Core 永远不会替换调用方明确指定的线程，也不会在适配器未选择加入的情况下，根据 `receipt.threadId` 推断是否采用线程。

### <a id="automatic-unknown-send-reconciliation"></a> 自动未知发送协调

仅当插件能够基于持久化的策略后状态协调存在歧义的提供商发送，且无需重新运行修改型 hook 或重新生成提供商有效载荷时，才设置 `message.durableFinal.automaticUnknownSendReconciliation`。Core 会在 hook 和取消处理完成后将其视为选择加入，并且仅适用于恰好一个已接受的已准备有效载荷。多有效载荷批次不会自动选择加入。

适配器还必须声明 `capabilities.reconcileUnknownSend: true`，并提供 `reconcileUnknownSend(...)`。使用 `reconcileUnknownSendKinds` 指明插件能够证明的具体传输分支，例如 `text` 或 `media`。如果存在该种类映射，则选定的分支必须为 `true`。省略该映射意味着回调声明支持所有选定分支，因此对于新插件，建议使用显式映射。

回调必须使用提供者端重复预防或权威读回来返回 `sent` 以及实际提供者收据，仅当新发送可证明安全时返回 `not_sent`，或者当两个结果都无法证明时返回 `unresolved`。当明确要求协调时，不受支持的准备形状会在提供程序 I/O. 恢复之前失败。在恢复期间，丢失、不完整或不匹配的提供程序证明必须停止恢复，而不是重播可能已经可见的内容。

如果协调需要提供商拥有的持久证据，请实施 `afterUnknownSendTerminal(...)`。当不明确的队列行已权威地转移到失败（包括重试预算耗尽）后，核心会调用它。使用它来删除不再需要的提供商拥有的计划或有效负载。尽最大努力进行清理，并且必须安全地重复；记录失败而不使终端队列行再次可重播。

## <a id="deferred-delivery-admission"></a> 延迟投递准入

当解析的帐户无法安全地接受核心管理的出站或延期递送时，请使用 `message.durableFinal.admitDeferredDelivery(...)`。 Core 在实时出站工作（包括跳过队列持久性的路径）之前同步调用此挂钩，并在重放恢复的意图之前再次调用此挂钩。上下文包括 `cfg`、`channel`、`to`、`accountId` 以及 `live` 或 `recovery` 的 `phase`。

返回 `{ status: "allowed" }` 以继续。若投递不得被持久化、直接发送或回放，则返回 `{ status: "permanent_rejection", reason }`。实时拒绝会在创建队列、消息钩子或平台工作之前失败。恢复拒绝会将队列记录标记为失败，并跳过协调与回放。省略该钩子则表示允许。

挂钩是同步准入决策，而不是发送路径。只读取已加载的配置或运行时状态；不执行网络、文件系统或其他异步 I/O. 合约测试应通过 `ChannelMessageDurableFinalAdapter` 从 `openclaw/plugin-sdk/channel-outbound` 执行两个阶段和两个结果变体。

## <a id="compatibility-dispatch"></a> 兼容性分发

通过 `dispatchChannelInboundReply(...)` 从 `channel-inbound` 组装入站回复调度。将平台交付保留在交付适配器中；使用 `channel-outbound` 作为消息适配器、持久发送、接收、实时预览和回复管道选项。

### <a id="migrating-from-channel-message"></a> 从频道消息迁移

`openclaw/plugin-sdk/channel-message` 已被删除。从 `openclaw/plugin-sdk/channel-outbound` 导入其以前的出境出口。将这些别名迁移到 `openclaw/plugin-sdk/channel-inbound`：

| 删除别名                      | 替代方案                         |
| ---------------------------------- | ----------------------------------- |
| `hasFinalChannelTurnDispatch`      | `hasFinalInboundReplyDispatch`      |
| `hasVisibleChannelTurnDispatch`    | `hasVisibleInboundReplyDispatch`    |
| `resolveChannelTurnDispatchCounts` | `resolveInboundReplyDispatchCounts` |

SDK 所有者于 2026 年 9 月 30 日批准提前退休。请参阅 [ 删除时间表 ](/plugins/sdk-migration/removal-timeline) 并在升级到包含此删除的主机之前更新插件导入。

## <a id="related"></a> 相关内容

- [Channel inbound API](/plugins/sdk-channel-inbound) — 在发送回复之前记录和调度的接收方
- [Channel 入口 API](/plugins/sdk-channel-ingress) — 生成发送归因于的参与者身份的解析器
- [构建通道插件](/plugins/sdk-channel-plugins) — 完整通道插件演练
- [Plugin SDK subpaths](/plugins/sdk-subpaths) — 哪个子路径导出每个助手
- [Plugin SDK 迁移](/plugins/sdk-migration) — 旧出站导出的删除资格窗口
