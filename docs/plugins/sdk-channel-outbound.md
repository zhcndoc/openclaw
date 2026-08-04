---
summary: "用于频道插件的出站消息生命周期 API：适配器、回执、持久化发送、实时预览和回复流水线辅助工具"
title: "频道出站 API"
read_when:
  - 你正在构建或重构消息频道插件的发送路径
  - 你需要持久化的最终回复发送、回执、实时预览最终化或接收确认策略
  - 你正在从 channel-message 或旧版回复分发辅助工具迁移
---

频道插件通过
`openclaw/plugin-sdk/channel-outbound` 暴露出站消息行为。使用
`openclaw/plugin-sdk/channel-inbound` 进行接收/上下文/分发
编排。

核心负责队列处理、持久化、持久化的**入口监控与排空**
（`createChannelIngressMonitor`、`createChannelIngressDrain` 和
`openChannelIngressDrain`）、通用重试策略、回合接管生命周期
（`turnAdoptionLifecycle` / `bindIngressLifecycleToReplyOptions`）、钩子、
回执以及共享的 `message` 工具。插件负责原生的
发送/编辑/删除调用、目标规范化、平台线程处理、选定的引用、通知标志、
账户状态、入口检查与负载编码、通道键、不可重试谓词、可选的替换授权以及
平台特定的副作用。

## 持久化入口监控器

当通道必须在分发之前持久化已接受的传输事件时，请使用
`createChannelIngressMonitor(...)`。它将通道入口队列和排空流程与共享的接纳、轮询、清理、投递和关闭生命周期组合在一起。仅当传输层拥有实质不同的接纳或泵送契约时，才使用较底层的 `createChannelIngressDrain(...)`。

必需的选项如下：

| 选项                           | 契约                                                                                                                                                                                                                                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `queue`                          | 一个 `ChannelIngressQueue`，或用于打开账户作用域队列的延迟工厂。                                                                                                                                                                                                                                  |
| `inspect(raw, context)`          | 返回稳定的 `eventId` 和序列化后的 `laneKey`；对于应忽略的事件返回 `null`。声明时的事实必须与持久化的 id 和 lane 匹配。                                                                                                                                                                    |
| `payload`                        | 提供负载版本以及主体的序列化/反序列化。标准的 `{ version, rawEvent }` 字符串封装使用 `storage: "raw-event"`；对于已有的通道特定形态，则提供自定义的编码/解码回调。`createClaimError` 用于对无效版本或已变更的身份进行分类。 |
| `deliver(raw, lifecycle, claim)` | 分发一个解码后的事件，并接收完整的接管生命周期。它可以返回 `completed`、`deferred`、`failed-retryable`，或不返回任何内容。                                                                                                                                                                |
| `pollIntervalMs`                 | 在监控器运行期间安排恢复/排空轮询。                                                                                                                                                                                                                                                     |
| `retention`                      | 提供清理周期，以及已完成/失败项目的 TTL 和条目上限。                                                                                                                                                                                                                                              |

监控器会串行化接纳操作，因此追加退避不会颠倒某个 lane 的顺序。默认的有界追加延迟为 `0`、`100` 和 `300` 毫秒；耗尽后会拒绝传输回调，而不是分发尚未持久化的事件。在声明时，它会解码带版本的负载，重新运行 `inspect`，并在投递前拒绝 id 或 lane 不匹配的情况。

`deliver` 会接收 `onAdopted`、`onDeferred`、`onAdoptionFinalizing`、`onAbandoned` 和 `abortSignal`。如果返回时没有进行显式移交，则会将该终止状态的无分发事件标记为已接管。`admission` 始终为 `exclusive`。延迟移交会保持声明，关闭或中止则会使未接管的工作保持可重试状态。监控器会独立于声明结算跟踪投递，因为接管可能会在通道的投递 promise 返回之前将某一行标记为墓碑。

可选设置包括自定义追加延迟、用于高级排空排序/并发/重试策略的 `drain` 选项块、外部 `abortSignal`、时钟、泵错误报告、停止错误工厂以及接纳策略。返回的监控器会暴露 `admit`、`ensureQueueAvailable`、`start`、`pause`、`stop`、`waitForIdle`、`isRunning` 和 `isStopped`。当插件负责的迁移或准备工作必须在队列打开后、排空开始前运行时，请使用幂等的 `ensureQueueAvailable()` 检查。`stop` 会先结算已接受的接纳操作，然后中止并释放排空流程，等待泵和活动投递完成，最后再次释放，以关闭延迟创建竞态。

将传输特定的脱敏、原始封装验证、不可重试分类以及持久化负载形态保留在插件中。Webhook 传输应仅在 `admit` 完成后确认；不可重放传输应显式报告持久化追加耗尽，而不是静默分发。

## 适配器

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

只声明原生传输实际会保留的能力。请使用从此子路径导出的契约辅助函数，覆盖每一个已声明的发送、回执、实时预览和接收确认能力。

## 出站回声抑制

当平台可能将插件自身发送的出站消息重新作为入站消息投递时，请使用频道、账户、会话以及稳定的平台消息或来源标识调用 `recordOutboundMessageIdentity(...)`。共享的入站轮次路径会在会话记录或代理分发之前，在有界的 30 秒时间窗口内丢弃匹配的标识；来源标识可以在发送前预留，或在移除频道路由时刷新，以消除投递竞态。`isRecentOutboundMessageIdentity(...)` 为频道诊断和测试提供相同的查询功能。不要针对同一个稳定标识维护并行的频道本地 TTL 缓存。

## 纯文本清理

当出站适配器需要将受支持的 HTML 格式标签转换为轻量级文本标记时，请使用 `sanitizeForPlainText(...)`。默认会保留现有的聊天风格加粗和删除线标记。仅当该渠道会将结果重新解析为 Markdown 时，才传入 `{ style: "markdown" }`：

```ts
import { sanitizeForPlainText } from "openclaw/plugin-sdk/channel-outbound";

const chatText = sanitizeForPlainText(text);
const markdownText = sanitizeForPlainText(text, { style: "markdown" });
```

Markdown 风格使用 `**bold**` 和 `~~strikethrough~~`；斜体和行内代码在两种风格中都保留 `_italic_` 和反引号标记。应在渠道边界选择样式，而不是在清理后重写标记文本。

## 投递证据

`MessageReceipt` 记录由通道适配器返回的结果。具体的平台消息标识符表明平台发送路径已接受该消息；它们并不能证明收件人的设备已经显示或读取了该消息。不带平台消息标识符的收据仅是本地收据元数据。对于具有已读回执或设备投递状态的通道，应通过单独的、通道特定的路径来跟踪这些事实。

如果某个通道适配器能够证明，重试失败不会导致收件人可见的发送重复，并且尚未开始任何具备最终化能力的调用，则应从 `openclaw/plugin-sdk/error-runtime` 抛出 `new PlatformMessageNotDispatchedError("...", { cause: error })`。这样 Core 就可以清除过时的发送尝试证据，并安全地重试队列中的意图。只有拥有最终分发边界的适配器才能做出该断言。切勿在最终化/发送调用开始后或返回歧义结果后使用该标记；错误标记会导致消息重复。

## 现有的出站适配器

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

## 持久化发送

运行时发送辅助工具也位于 `channel-outbound`：

- `sendDurableMessageBatch(...)`
- `withDurableMessageSendContext(...)`
- `deliverInboundReplyWithMessageSendContext(...)`
- 草稿流式/进度辅助工具，例如 `resolveChannelDraftStreamingChunking(...)`

`sendDurableMessageBatch(...)` 返回一个明确结果：

| Outcome          | Meaning                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------- |
| `sent`           | 至少有一条可见的平台消息被平台发送路径接受                                                |
| `suppressed`     | 不应将任何平台消息视为缺失                                                                |
| `partial_failed` | 在后续有效载荷或副作用失败之前，至少有一条平台消息被接受                                  |
| `failed`         | 未产生任何平台回执                                                                      |

当一个批次混合了已发送、已抑制和失败的有效载荷时，请使用 `payloadOutcomes`。不要根据空的旧版直接投递结果推断 hook 被取消。

### 自动未知发送协调

仅当插件能够基于持久化的策略后状态协调存在歧义的提供商发送，且无需重新运行修改型 hook 或重新生成提供商有效载荷时，才设置 `message.durableFinal.automaticUnknownSendReconciliation`。Core 会在 hook 和取消处理完成后将其视为选择加入，并且仅适用于恰好一个已接受的已准备有效载荷。多有效载荷批次不会自动选择加入。

适配器还必须声明 `capabilities.reconcileUnknownSend: true`，并提供 `reconcileUnknownSend(...)`。使用 `reconcileUnknownSendKinds` 指明插件能够证明的具体传输分支，例如 `text` 或 `media`。如果存在该种类映射，则选定的分支必须为 `true`。省略该映射意味着回调声明支持所有选定分支，因此对于新插件，建议使用显式映射。

回调必须使用提供商自有的幂等机制或权威回读，在能够证明发送成功时返回带有实际提供商回执的 `sent`；仅当能够证明新发送是安全的情况下返回 `not_sent`；当两种结果都无法证明时返回 `unresolved`。明确要求协调时，不支持的已准备形状必须在提供商 I/O 之前失败。在恢复期间，缺失、不完整或不匹配的提供商证明必须采取故障关闭，而不是重放可能已经可见的内容。

如果协调需要由提供商持有的持久化证据，请实现 `afterUnknownSendTerminal(...)`。Core 会在歧义队列行权威地转为失败后调用它，包括重试预算耗尽的情况。使用它移除不再需要的提供商持有的计划或有效载荷。清理操作应尽力执行且必须具备幂等性；失败会被记录，但不会使终态队列行再次可重放。

## 延迟投递准入

当已解析的账户无法安全接受由 core 管理的出站或延迟投递时，请使用 `message.durableFinal.admitDeferredDelivery(...)`。Core 会在实时出站工作之前同步调用此钩子，包括跳过队列持久化的路径，并且会在回放已恢复的意图之前再次调用。上下文包含 `cfg`、`channel`、`to`、`accountId`，以及值为 `live` 或 `recovery` 的 `phase`。

返回 `{ status: "allowed" }` 以继续。若投递不得被持久化、直接发送或回放，则返回 `{ status: "permanent_rejection", reason }`。实时拒绝会在创建队列、消息钩子或平台工作之前失败。恢复拒绝会将队列记录标记为失败，并跳过协调与回放。省略该钩子则表示允许。

该钩子是同步的准入决策，而不是发送路径。只读取已经加载的配置或运行时状态；不要进行网络、文件系统或其他异步 I/O。契约测试应通过来自 `openclaw/plugin-sdk/channel-outbound` 的 `ChannelMessageDurableFinalAdapter` 覆盖两个阶段以及两种结果变体。

## 兼容性分发

通过 `channel-inbound` 中的 `dispatchChannelInboundReply(...)` 组装入站回复调度。将平台投递保留在投递适配器中；对消息适配器、持久化发送、回执、实时预览以及回复管道选项，使用 `channel-outbound`。
