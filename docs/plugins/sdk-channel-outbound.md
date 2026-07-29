---
summary: "用于频道插件的出站消息生命周期 API：适配器、回执、持久化发送、实时预览和回复流水线辅助工具"
title: "频道出站 API"
read_when:
  - You are building or refactoring a messaging channel plugin send path
  - You need durable final reply delivery, receipts, live preview finalization, or receive acknowledgement policy
  - You are migrating from channel-message or legacy reply dispatch helpers
---

频道插件通过
`openclaw/plugin-sdk/channel-outbound` 暴露出站消息行为。使用
`openclaw/plugin-sdk/channel-inbound` 进行接收/上下文/分发
编排。

Core owns queueing, durability, the durable **ingress monitor and drain**
(`createChannelIngressMonitor`, `createChannelIngressDrain`, and
`openChannelIngressDrain`), generic retry policy, turn-adoption lifecycle
(`turnAdoptionLifecycle` / `bindIngressLifecycleToReplyOptions`), hooks,
receipts, and the shared `message` tool. The plugin owns native
send/edit/delete calls, target normalization, platform threading, selected
quotes, notification flags, account state, ingress inspection and payload
encoding, lane keys, non-retryable predicates, optional supersede
authorization, and platform-specific side effects.

## Durable ingress monitors

Use `createChannelIngressMonitor(...)` when a channel must persist accepted
transport events before dispatch. It composes a channel ingress queue and drain
with the shared admission, polling, pruning, delivery, and shutdown lifecycle.
Use the lower-level `createChannelIngressDrain(...)` only when the transport
owns a materially different admission or pump contract.

The required options are:

| Option                           | Contract                                                                                                                                                                                                                                                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `queue`                          | A `ChannelIngressQueue`, or a lazy factory that opens the account-scoped queue.                                                                                                                                                                                                                                  |
| `inspect(raw, context)`          | Returns the stable `eventId` and serialized `laneKey`, or `null` for an ignored event. Claim-time facts must match the persisted id and lane.                                                                                                                                                                    |
| `payload`                        | Supplies the payload version plus body serialization/deserialization. Use `storage: "raw-event"` for the standard `{ version, rawEvent }` string envelope, or provide custom encode/decode callbacks for an existing channel-specific shape. `createClaimError` classifies invalid versions or changed identity. |
| `deliver(raw, lifecycle, claim)` | Dispatches one decoded event and receives the complete adoption lifecycle. It may return `completed`, `deferred`, `failed-retryable`, or nothing.                                                                                                                                                                |
| `pollIntervalMs`                 | Schedules recovery/drain polls while the monitor is running.                                                                                                                                                                                                                                                     |
| `retention`                      | Supplies the prune cadence and completed/failed TTL and entry caps.                                                                                                                                                                                                                                              |

The monitor serializes admissions so append backoff cannot invert a lane. The
default bounded append delays are `0`, `100`, and `300` ms; exhaustion rejects
the transport callback instead of dispatching an event that was not made
durable. At claim time it decodes the versioned payload, re-runs `inspect`, and
rejects an id or lane mismatch before delivery.

`deliver` receives `onAdopted`, `onDeferred`, `onAdoptionFinalizing`,
`onAbandoned`, and `abortSignal`. Returning without an explicit handoff marks a
terminal no-dispatch event adopted. `admission` is always `exclusive`. A
deferred handoff keeps the claim held, while shutdown or abort leaves unadopted
work retryable. The monitor tracks delivery independently from claim settlement
because adoption can tombstone a row before the channel's delivery promise
returns.

Optional settings include custom append delays, a `drain` option block for
advanced drain ordering/concurrency/retry policy, an external `abortSignal`, a
clock, pump error reporting, a stopped-error factory, and admission policy.
The returned monitor exposes `admit`, `ensureQueueAvailable`, `start`, `pause`,
`stop`, `waitForIdle`, `isRunning`, and `isStopped`. Use the idempotent
`ensureQueueAvailable()` check when plugin-owned migration or preparation must
run after the queue opens but before the drain starts. `stop` first settles
accepted admissions, then aborts and disposes the drain, waits for the pump and
active deliveries, and disposes again to close the lazy-creation race.

Keep transport-specific redaction, raw-envelope validation, non-retryable
classification, and persisted payload shape in the plugin. Webhook transports
should acknowledge only after `admit` resolves; non-replay transports should
surface durable append exhaustion rather than silently dispatching.

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

## Outbound echo suppression

When a platform may redeliver the plugin's own outbound message as inbound, call `recordOutboundMessageIdentity(...)` with the channel, account, conversation, and a stable platform message or source identity. The shared inbound turn path drops matching identities for a bounded 30-second window before session recording or agent dispatch; a source identity may be reserved before send or refreshed when a channel route is removed to close delivery races. `isRecentOutboundMessageIdentity(...)` exposes the same query for channel diagnostics and tests. Do not maintain a parallel channel-local TTL cache for the same stable identity.

## Plain-text sanitization

当出站适配器需要将受支持的 HTML 格式标签转换为轻量级文本标记时，请使用 `sanitizeForPlainText(...)`。默认会保留现有的聊天风格加粗和删除线标记。仅当该渠道会将结果重新解析为 Markdown 时，才传入 `{ style: "markdown" }`：

```ts
import { sanitizeForPlainText } from "openclaw/plugin-sdk/channel-outbound";

const chatText = sanitizeForPlainText(text);
const markdownText = sanitizeForPlainText(text, { style: "markdown" });
```

Markdown 风格使用 `**bold**` 和 `~~strikethrough~~`；斜体和行内代码在两种风格中都保留 `_italic_` 和反引号标记。应在渠道边界选择样式，而不是在清理后重写标记文本。

## 投递证据

`MessageReceipt` 记录由通道适配器返回的结果。具体的平台消息标识符表明平台发送路径已接受该消息；它们并不能证明收件人的设备已经显示或读取了该消息。不带平台消息标识符的收据仅是本地收据元数据。对于具有已读回执或设备投递状态的通道，应通过单独的、通道特定的路径来跟踪这些事实。

如果某个通道适配器能够证明，重试失败不会导致收件人可见的发送重复，并且尚未开始任何具备最终化能力的调用，则应从 `openclaw/plugin-sdk/error-runtime` 抛出 `new PlatformMessageNotDispatchedError("...", { cause: error })`。这样 Core 就可以清除过时的发送尝试证据，并安全地重试队列中的意图。只有拥有最终分发边界的适配器才能做出这一断言。切勿在最终化/发送调用开始后或返回歧义结果后使用该标记；错误标记会导致消息重复。

## Existing outbound adapters

If the channel already has a compatible `outbound` adapter, derive the message adapter from it instead of duplicating the send code:

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

## 延迟投递准入

当已解析的账户无法安全接受由 core 管理的出站或延迟投递时，请使用 `message.durableFinal.admitDeferredDelivery(...)`。Core 会在实时出站工作之前同步调用此钩子，包括跳过队列持久化的路径，并且会在回放已恢复的意图之前再次调用。上下文包含 `cfg`、`channel`、`to`、`accountId`，以及值为 `live` 或 `recovery` 的 `phase`。

返回 `{ status: "allowed" }` 以继续。若投递不得被持久化、直接发送或回放，则返回 `{ status: "permanent_rejection", reason }`。实时拒绝会在创建队列、消息钩子或平台工作之前失败。恢复拒绝会将队列记录标记为失败，并跳过协调与回放。省略该钩子则表示允许。

该钩子是同步的准入决策，而不是发送路径。只读取已经加载的配置或运行时状态；不要进行网络、文件系统或其他异步 I/O。契约测试应通过来自 `openclaw/plugin-sdk/channel-outbound` 的 `ChannelMessageDurableFinalAdapter` 覆盖两个阶段以及两种结果变体。

## 兼容性分发

通过 `channel-inbound` 中的 `dispatchChannelInboundReply(...)` 组装入站回复调度。将平台投递保留在投递适配器中；对消息适配器、持久化发送、回执、实时预览以及回复管道选项，使用 `channel-outbound`。
