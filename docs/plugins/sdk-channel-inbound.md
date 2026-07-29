---
summary: "面向频道插件的入站事件辅助：上下文构建、共享运行器编排、会话记录，以及已准备回复的派发"
title: "频道入站 API"
read_when:
  - 你正在构建或重构消息频道插件的接收路径
  - 你需要共享的入站上下文构建、会话记录或已准备回复派发
  - 你正在将旧的 channel turn 辅助迁移到 inbound/message API
---

频道接收路径遵循一个流程：

```text
platform event -> inbound facts/context -> agent reply -> message delivery
```

使用 `openclaw/plugin-sdk/channel-inbound` 进行入站事件规范化、
格式化、根节点和编排。使用
`openclaw/plugin-sdk/channel-outbound` 进行原生发送、回执、持久化
投递以及实时预览行为。

## 核心辅助函数

```ts
import {
  buildChannelInboundEventContext,
  runChannelInboundEvent,
  dispatchChannelInboundReply,
} from "openclaw/plugin-sdk/channel-inbound";
```

- `buildChannelInboundEventContext(...)`：将规范化后的频道事实映射
  到提示词/会话上下文中。通过 `channelContext` 传递频道拥有的发送者/聊天元数据，
  插件钩子会将其视为 `ctx.channelContext`。可从此子路径扩展
  `PluginHookChannelSenderContext` 或 `PluginHookChannelChatContext`
  以添加频道特定字段。
- `runChannelInboundEvent(...)`：对单个入站平台事件执行 ingest、classify、preflight、resolve、
  record、dispatch 和 finalize。
- `dispatchChannelInboundReply(...)`：使用投递适配器记录并分发一个已
  组装好的入站回复。

For media-only inbound events, keep the message body and command text empty and
pass one `ChannelInboundMediaInput` fact per native attachment. When an ambient
history line or another text-only carrier must describe those facts, use
`formatMediaPlaceholderText(media)`. It classifies each fact from `kind`, MIME
type, then path or URL extension; undownloaded native attachments should still
contribute one type-only fact each. Do not use the formatter to synthesize the
primary inbound body.

Normalize plugin-owned attachment records with `toInboundMediaFacts(...)`, then
pass the resulting ordered array through the context's `media` field:

```ts
const media = toInboundMediaFacts([
  { path: saved.path, url: nativeUrl, contentType: saved.contentType, messageId },
]);

const ctx = finalizeInboundContext({ Body: caption, media });
```

Array position is attachment identity. Per-fact `transcribed`, `messageId`, and
`workspaceDir` replace the legacy parallel index/workspace fields. The
`MediaPath`, `MediaPaths`, `MediaUrl`, `MediaUrls`, `MediaType`, `MediaTypes`,
`MediaTranscribedIndexes`, `MediaWorkspaceDir`, and `MediaStaged` context fields,
plus `buildChannelInboundMediaPayload(...)`, remain available only as deprecated
compatibility. New plugins should not construct or read them.

Bundled/native channels that already receive the injected plugin runtime
object can call the same helpers under `runtime.channel.inbound.*` instead of
importing this subpath directly:

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

为兼容性分发器组装 `dispatchChannelInboundReply(...)` 的输入，这些分发器将平台投递保留在投递适配器中。新的发送
路径应改用 `channel-outbound` 中的消息适配器和持久化消息辅助函数。

## Delivery settlement contract

`ChannelInboundTurnPlan.delivery` owns the native send for each logical reply
payload. On the routed API, core runs `reply_payload_sending`, calls
`preparePayload`, and then assigns exactly one `message_sending` owner:

- a declared `durable` branch runs the hook inside shared durable delivery;
- a direct `deliver` branch runs the hook in core before the native adapter;
- an exceptional provider funnel can use
  `deliverWithProviderMessageSending` when it must choose durable delivery or
  native finalization inside that funnel.

Do not apply `message_sending` again inside a normal `deliver` callback. Use
the provider-owned callback only when the branch cannot be declared before
entering the provider funnel; it is mutually exclusive with `deliver` and
`durable`. Existing direct and durable plans keep using
`ChannelInboundTurnPlan`; explicitly type the exceptional funnel as
`ChannelInboundTurnPlan<"provider_message_sending">`. Caller-assembled
`dispatchChannelInboundReply(...)` remains the
compatibility boundary and keeps its caller-provided dispatcher ownership.

`preparePayload` may return `null` when channel policy intentionally suppresses the
logical payload. Core records a typed non-visible result and skips durable selection,
`message_sending`, and native delivery, so a later modifying hook cannot resurrect
content the channel rejected.

Core also owns terminal `message_sent` observation when the adapter opts in.
Keep these responsibilities separate so one payload cannot produce duplicate
modifier or terminal events.

The delivery result fields have these meanings:

| Field                    | Contract                                                                                                                                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `content`                | Provider-accepted visible text for the logical payload after native formatting or finalization. Omit it to use the prepared payload text for terminal observation. Media-only sends can omit it.                             |
| `messageIds` / `receipt` | Actual provider identities for the visible send. Prefer a `MessageReceipt`; core uses its primary provider id for `message_sent`.                                                                                            |
| `visibleReplySent`       | Set to `false` only when the provider produced no visible preview or final message. Core does not emit a successful `message_sent` for that result.                                                                          |
| `suppression`            | Typed intentional no-send reason after a modifying hook or payload policy settles. Hook cancellation can also include `cancelReason` and metadata. Core never calls the direct native adapter for a core-owned suppression.  |
| `finalization`           | A promise for delayed native settlement of the same logical payload, such as closing or editing an in-place streaming card. Its resolved fields override the immediate result before terminal observation and `onDelivered`. |

Set the delivery adapter's `observeMessageSent` option to `true` when core
should emit the canonical plugin and internal `message_sent` events for this
adapter's non-durable sends. Do not return this option from `deliver`, and do
not emit those events in the plugin too. Durable sends already emit through
the shared outbound owner and are not duplicated.

Return one result per logical payload. `finalization` is not a second send and
must not rerun `reply_payload_sending` or `message_sending`. As soon as
`deliver` returns, core observes the finalization promise's rejection so it
cannot become unhandled; core still awaits the original promise after reply
dispatch settles. It then emits at most one terminal observation per payload
with the finalized content and provider id. `onDelivered`, when present,
receives the settled result after that observation.

`onDelivered` also receives settled suppressed results. A suppressed result
has `visibleReplySent: false`, does not emit `message_sent`, and does not count
as a visible queued reply. This lets plugins distinguish hook cancellation
from provider failure without inventing a native message identity.

By default, routed turns record inbound metadata against
`ctxPayload.SessionKey ?? route.sessionKey`. Set `record.sessionKey` only when a
native command intentionally executes in one command session while updating a
different provider-routed target session. The override affects inbound metadata,
transcript-context merge, and record-stage diagnostics; it does not change dispatch
routing or hook correlation. An explicit override must be non-empty and contain no
surrounding whitespace.

Reject `deliver` or `finalization` when native delivery fails. If no provider
send was attempted, throw `PlatformMessageNotDispatchedError` from
`openclaw/plugin-sdk/error-runtime`; core suppresses a false `message_sent`
event. If a native send became visible before a later operation failed,
preserve the visible subset on the error:

```ts
import { createChannelPartialDeliveryError } from "openclaw/plugin-sdk/channel-inbound";

throw createChannelPartialDeliveryError(cause, {
  visibleReplySent: true,
  content: finalizedVisibleText,
  receipt,
});
```

Core emits a failed terminal observation with that provider-visible content and
identity, then keeps the delivery failed so callers do not mistake partial
success for a clean send. Do not report `visibleReplySent: false` after any
preview, draft, attachment, or final message became visible.

When `reply_payload_sending` or `message_sending` is registered, those hooks
must settle before anything provider-visible is created because either hook
can rewrite or cancel the logical payload. An eager native preview would leak
pre-rewrite content or leave a cancelled draft behind. Buffer preview content
until the accepted payload reaches `deliver`; compatibility dispatchers that
start previews earlier must suppress that eager preview while either hook is
registered. Use the finalizable live-preview helpers from
[Channel outbound API](/plugins/sdk-channel-outbound) for new preview paths.

## Migration

`runtime.channel.turn.*` runtime 别名已移除。请改用：

- `runtime.channel.inbound.run(...)` 用于原始入站事件。
- `runtime.channel.inbound.dispatchReply(...)` 用于组装后的回复上下文。
- `runtime.channel.inbound.buildContext(...)` 用于入站上下文载荷。
- `runtime.channel.inbound.runPreparedReply(...)`，已弃用，仅用于
  频道自有的已准备分发路径，这些路径已经会自行组装
  分发闭包。

新的插件代码不应引入 `turn` 命名的频道 API。请将 model 或 agent turn 词汇保留在 agent/provider 代码中；频道插件使用 inbound、message、delivery 和 reply 这些术语。
