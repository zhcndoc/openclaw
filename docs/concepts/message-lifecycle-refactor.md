---
summary: "统一的持久化消息接收、发送、预览、编辑和流式生命周期设计方案"
read_when:
  - 重构 channel 发送或接收行为时
  - 更改 channel turn、reply 分发、出站队列、预览流、或插件 SDK 消息 API 时
  - 设计需要持久化发送、回执、预览、编辑或重试的新 channel 插件时
title: "消息生命周期重构"
---

本页是将零散的 channel turn、reply 分发、预览流和出站投递辅助方法替换为一个持久化消息生命周期的目标设计。

简要版本：

- 核心原语应该是 **receive** 和 **send**，而不是 **reply**。
- reply 只是出站消息上的一种关系。
- turn 是一个入站处理便利抽象，不是投递的所有者。
- 发送必须基于上下文：`begin`、render、preview 或 stream、final send、commit、fail。
- 接收也必须基于上下文：normalize、dedupe、route、record、dispatch、platform ack、fail。
- 公共插件 SDK 应该收敛为一个小的 channel-message 接口面。

## 问题

当前的 channel 栈是从几个本地上合理的需求逐步演化出来的：

- 简单的入站适配器使用 `runtime.channel.turn.run`。
- 丰富的适配器使用 `runtime.channel.turn.runPrepared`。
- 旧的辅助方法使用 `dispatchInboundReplyWithBase`、
  `recordInboundSessionAndDispatchReply`、reply payload 辅助方法、reply 分块、reply 引用，以及出站运行时辅助方法。
- 预览流存在于 channel 特定的分发器中。
- 最终投递的持久性正在围绕现有的 reply payload 路径添加。

这种结构修复了局部 bug，但也让 OpenClaw 拥有了太多公共概念，以及太多投递语义可能漂移的地方。

暴露出这个问题的可靠性故障是：

```text
Telegram 轮询更新被 ack
  -> assistant 最终文本已存在
  -> 进程在 sendMessage 成功前重启
  -> 最终响应丢失
```

目标不变量比 Telegram 更广：一旦核心决定某个可见的出站消息应该存在，则在尝试平台发送之前，该意图必须是持久化的，并且平台回执必须在成功后提交。这为 OpenClaw 提供至少一次恢复能力。精确一次行为只存在于那些能够证明原生幂等性，或能够在发送后状态未知的情况下、在重放前与平台状态进行协调的适配器。

这就是本次重构的最终状态，而不是当前所有路径的描述。在迁移期间，如果尽力而为的队列写入失败，现有的出站辅助方法仍然可以直接发送。只有当持久化最终发送要么失败即关闭，要么明确通过文档化的非持久化策略选择退出时，重构才算完成。

## 目标

- 为所有 channel 消息接收和发送路径提供一套核心生命周期。
- 在新的消息生命周期中，适配器声明可重放安全行为后，默认启用持久化最终发送。
- 共享的预览、编辑、流式、终结、重试、恢复和回执语义。
- 一个更小的插件 SDK 面，便于第三方插件学习和维护。
- 在迁移期间与现有 `channel.turn` 调用方保持兼容。
- 为新的 channel 能力提供清晰的扩展点。
- 核心中不出现平台特定分支。
- 不要有 token-delta channel 消息。channel 流式仍然保持为消息预览、编辑、追加或已完成块投递。
- 为运维/系统输出提供结构化的 OpenClaw 来源元数据，这样可见的网关失败就不会在启用 bot 的共享房间中作为新的提示词重新进入。

## 非目标

- 第一阶段不要移除 `runtime.channel.turn.*`。
- 不要强迫每个 channel 都采用相同的原生传输行为。
- 不要让核心去理解 Telegram topics、Slack 原生流、Matrix redaction、飞书卡片、QQ 语音或 Teams activities。
- 不要把所有内部迁移辅助方法都发布为稳定的 SDK API。
- 不要通过重试去重放已完成的、非幂等的平台操作。

## 参考模型

Vercel Chat 提供了一个不错的公开心智模型：

- `Chat`
- `Thread`
- `Channel`
- `Message`
- 诸如 `postMessage`、`editMessage`、`deleteMessage`、`stream`、`startTyping` 和历史获取之类的适配器方法
- 用于去重、锁、队列和持久化的状态适配器

OpenClaw 应该借鉴这些词汇，而不是照搬其表面 API。

OpenClaw 相比该模型还需要：

- 在直接传输调用之前，先持久化出站发送意图。
- 显式的发送上下文，包含 begin、commit 和 fail。
- 知晓平台 ack 策略的接收上下文。
- 能在重启后保留，并可驱动编辑、删除、恢复和重复抑制的回执。
- 更小的公共 SDK。内置插件可以使用内部运行时辅助方法，但第三方插件应该看到一个连贯的消息 API。
- 面向 agent 的特定行为：会话、转录、块流式、工具进度、审批、媒体指令、静默回复，以及群组提及历史。

`thread.post()` 风格的 promise 对 OpenClaw 来说还不够。它们隐藏了决定一次发送是否可恢复的事务边界。

## 核心模型

新的领域应位于一个内部核心命名空间下，例如 `src/channels/message/*`。

它有四个概念：

```typescript
core.messages.receive(...)
core.messages.send(...)
core.messages.live(...)
core.messages.state(...)
```

`receive` 负责入站生命周期。

`send` 负责出站生命周期。

`live` 负责预览、编辑、进度和流式状态。

`state` 负责持久化意图存储、回执、幂等性、恢复、锁和去重。

## 消息术语

### Message

规范化后的消息是平台无关的：

```typescript
type ChannelMessage = {
  id: string;
  channel: string;
  accountId?: string;
  direction: "inbound" | "outbound";
  target: MessageTarget;
  sender?: MessageActor;
  body?: MessageBody;
  attachments?: MessageAttachment[];
  relation?: MessageRelation;
  origin?: MessageOrigin;
  timestamp?: number;
  raw?: unknown;
};
```

### Target

目标描述消息所在的位置：

```typescript
type MessageTarget = {
  kind: "direct" | "group" | "channel" | "thread";
  id: string;
  label?: string;
  spaceId?: string;
  parentId?: string;
  threadId?: string;
  nativeChannelId?: string;
};
```

### Relation

reply 是一种关系，不是 API 根入口：

```typescript
type MessageRelation =
  | {
      kind: "reply";
      inboundMessageId?: string;
      replyToId?: string;
      threadId?: string;
      quote?: MessageQuote;
    }
  | {
      kind: "followup";
      sessionKey?: string;
      previousMessageId?: string;
    }
  | {
      kind: "broadcast";
      reason?: string;
    }
  | {
      kind: "system";
      reason:
        | "approval"
        | "task"
        | "hook"
        | "cron"
        | "subagent"
        | "message_tool"
        | "cli"
        | "control_ui"
        | "automation"
        | "error";
    };
```

这使得同一条发送路径可以处理普通 reply、cron 通知、审批提示、任务完成、message-tool 发送、CLI 或 Control UI 发送、subagent 结果，以及自动化发送。

### Origin

Origin 描述是谁产生了消息，以及 OpenClaw 应该如何处理该消息的回声。它与 relation 是分离的：一条消息可以是对用户的 reply，同时仍然是 OpenClaw 产生的运维输出。

```typescript
type MessageOrigin =
  | {
      source: "openclaw";
      schemaVersion: 1;
      kind: "gateway_failure";
      code: "agent_failed_before_reply" | "missing_api_key" | "model_login_expired";
      echoPolicy: "drop_bot_room_echo";
    }
  | {
      source: "user" | "external_bot" | "platform" | "unknown";
    };
```

核心负责 OpenClaw 产生输出的含义。各个 channel 负责如何把该 origin 编码进自己的传输协议中。

第一个必需用途是网关失败输出。人类仍然应该看到诸如 “Agent failed before reply” 或 “Missing API key” 之类的消息，但当启用 `allowBots` 时，带有 OpenClaw 运维输出标签的消息不应在共享房间中被当作 bot 生成的输入接受。

### Receipt

回执是一等公民：

```typescript
type MessageReceipt = {
  primaryPlatformMessageId?: string;
  platformMessageIds: string[];
  parts: MessageReceiptPart[];
  threadId?: string;
  replyToId?: string;
  editToken?: string;
  deleteToken?: string;
  url?: string;
  sentAt: number;
  raw?: unknown;
};

type MessageReceiptPart = {
  platformMessageId: string;
  kind: "text" | "media" | "voice" | "card" | "preview" | "unknown";
  index: number;
  threadId?: string;
  replyToId?: string;
  editToken?: string;
  deleteToken?: string;
  url?: string;
  raw?: unknown;
};
```

回执是从持久化意图通向未来的编辑、删除、预览终结、重复抑制和恢复的桥梁。

一个回执可以描述一条平台消息，也可以描述多段投递。分块文本、媒体加文本、语音加文本，以及卡片回退，都必须保留所有平台 id，同时仍然暴露一个用于线程关联和后续编辑的主 id。

## Receive context

接收不应该只是一个裸辅助调用。核心需要一个知道去重、路由、会话记录和平台 ack 策略的上下文。

```typescript
type MessageReceiveContext = {
  id: string;
  channel: string;
  accountId?: string;
  input: ChannelMessage;
  ack: ReceiveAckController;
  route: MessageRouteController;
  session: MessageSessionController;
  log: MessageLifecycleLogger;

  dedupe(): Promise<ReceiveDedupeResult>;
  resolve(): Promise<ResolvedInboundMessage>;
  record(resolved: ResolvedInboundMessage): Promise<RecordResult>;
  dispatch(recorded: RecordResult): Promise<DispatchResult>;
  commit(result: DispatchResult): Promise<void>;
  fail(error: unknown): Promise<void>;
};
```

接收流程：

```text
platform event
  -> begin receive context
  -> normalize
  -> classify
  -> dedupe and self-echo gate
  -> route and authorize
  -> record inbound session metadata
  -> dispatch agent run
  -> durable outbound sends happen through send context
  -> commit receive
  -> ack platform when policy allows
```

Ack 不是一回事。接收契约必须把这些信号分开：

- **Transport ack:** 告诉平台 webhook 或 socket，OpenClaw 已接受该事件封装。有些平台要求在 dispatch 之前完成这一步。
- **Polling offset ack:** 推进游标，使同一个事件不会再次被拉取。它不能越过那些无法恢复的工作。
- **Inbound record ack:** 确认 OpenClaw 已持久化足够的入站元数据，以便对重放做去重和路由。
- **User-visible receipt:** 可选的已读/状态/输入中行为；永远不是持久性边界。

`ReceiveAckPolicy` 只控制 transport 或 polling 的 ack。它不能被复用为已读回执或状态反应。

在 bot 授权之前，当 channel 能够解码消息 origin 元数据时，接收必须应用共享的 OpenClaw 回声策略：

```typescript
function shouldDropOpenClawEcho(params: {
  origin?: MessageOrigin;
  isBotAuthor: boolean;
  isRoomish: boolean;
}): boolean {
  return (
    params.isBotAuthor &&
    params.isRoomish &&
    params.origin?.source === "openclaw" &&
    params.origin.kind === "gateway_failure" &&
    params.origin.echoPolicy === "drop_bot_room_echo"
  );
}
```

这个丢弃是基于标签的，不是基于文本的。一个 bot-authored 的房间消息，即使可见文本与网关失败文本相同，但如果没有 OpenClaw origin 元数据，仍然会通过正常的 `allowBots` 授权流程。

Ack 策略是显式的：

```typescript
type ReceiveAckPolicy =
  | { kind: "immediate"; reason: "webhook-timeout" | "platform-contract" }
  | { kind: "after-record" }
  | { kind: "after-durable-send" }
  | { kind: "manual" };
```

Telegram 轮询现在使用 receive-context ack 策略来管理其持久化的重启水位线。tracker 仍然会在 grammY 更新进入 middleware 链时观察它们，但 OpenClaw 只会在成功 dispatch 后持久化安全完成的 update id，从而让失败的或较低的 pending 更新在重启后可被重放。Telegram 上游的 `getUpdates` 拉取 offset 仍然由轮询库控制，因此如果我们需要平台级重发而不仅仅是 OpenClaw 的重启水位线，剩下更深层的改造仍然是一个完全持久化的 polling source。Webhook 平台可能需要立即的 HTTP ack，但它们仍然需要入站去重和持久化出站发送意图，因为 webhook 可能会重送。

## 发送上下文

发送也是基于上下文的：

```typescript
type MessageSendContext = {
  id: string;
  channel: string;
  accountId?: string;
  message: ChannelMessage;
  intent: DurableSendIntent;
  attempt: number;
  signal: AbortSignal;
  previousReceipt?: MessageReceipt;
  preview?: LiveMessageState;
  log: MessageLifecycleLogger;

  render(): Promise<RenderedMessageBatch>;
  previewUpdate(rendered: RenderedMessageBatch): Promise<LiveMessageState>;
  send(rendered: RenderedMessageBatch): Promise<MessageReceipt>;
  edit(receipt: MessageReceipt, rendered: RenderedMessageBatch): Promise<MessageReceipt>;
  delete(receipt: MessageReceipt): Promise<void>;
  commit(receipt: MessageReceipt): Promise<void>;
  fail(error: unknown): Promise<void>;
};
```

推荐的编排方式：

```typescript
await core.messages.withSendContext(message, async (ctx) => {
  const rendered = await ctx.render();

  if (ctx.preview?.canFinalizeInPlace) {
    return await ctx.edit(ctx.preview.receipt, rendered);
  }

  return await ctx.send(rendered);
});
```

该辅助函数会展开为：

```text
begin durable intent
  -> render
  -> optional preview/edit/stream work
  -> mark sending
  -> final platform send or final edit
  -> mark committing with raw receipt
  -> commit receipt
  -> ack durable intent
  -> fail durable intent on classified failure
```

意图必须在传输 I/O 之前存在。在 begin 之后、commit 之前发生重启是可恢复的。

危险边界在平台发送成功之后、收据提交之前。如果进程在此处死亡，OpenClaw 无法知道平台消息是否存在，除非适配器提供原生幂等性或收据协调路径。这些尝试必须恢复到 `unknown_after_send`，而不是盲目重放。若没有协调机制，频道只有在可见重复消息是该频道及关系中可接受且已文档化的权衡时，才可选择至少一次重放。当前 SDK 的协调桥接要求适配器声明 `reconcileUnknownSend`，然后调用 `durableFinal.reconcileUnknownSend` 将未知条目标记为 `sent`、`not_sent` 或 `unresolved`；只有 `not_sent` 允许重放，未解决条目则保持终态，或者仅重试协调检查。

持久化策略必须明确：

```typescript
type MessageDurabilityPolicy = "required" | "best_effort" | "disabled";
```

`required` 表示当核心无法写入持久化意图时必须失败关闭。`best_effort` 在持久化不可用时可以继续执行。`disabled` 保持旧的直接发送行为。在迁移期间，旧包装器和公共兼容性辅助函数默认使用 `disabled`；它们不得因为某个频道存在通用的出站适配器，就推断出 `required`。

发送上下文还拥有频道本地的发送后效果。如果持久化投递绕过了此前附着在频道直接发送路径上的本地行为，那么迁移就不安全。这些行为包括自回声抑制缓存、线程参与标记、原生编辑锚点、模型签名渲染，以及平台特定的重复消息防护。这些效果必须在该频道启用持久化通用最终投递之前，迁移到发送适配器、渲染适配器，或一个命名的发送上下文钩子中。

发送辅助函数必须将收据完整返回给调用方。持久化包装器不能吞掉消息 id，也不能用 `undefined` 替换频道的投递结果；缓冲分发器会用这些 id 来做线程锚点、后续编辑、预览最终化以及重复抑制。

回退发送按批次操作，而不是单个载荷。静默回复重写、媒体回退、卡片回退以及分片投影都可能产生不止一条可投递消息，因此发送上下文必须要么投递整个投影批次，要么明确说明为什么只有一个载荷有效。

```typescript
type RenderedMessageBatch = {
  units: RenderedMessageUnit[];
  atomicity: "all_or_retry_remaining" | "best_effort_parts";
  idempotencyKey: string;
};

type RenderedMessageUnit = {
  index: number;
  kind: "text" | "media" | "voice" | "card" | "preview" | "unknown";
  payload: unknown;
  required: boolean;
};
```

当这种回退是持久化的时，整个投影批次必须由一个持久化发送意图或另一种原子批次计划来表示。逐个记录每个载荷是不够的：载荷之间的崩溃会导致可见的部分回退存在，但剩余载荷没有任何持久化记录。恢复时必须知道哪些单元已经有收据，并且要么只重放缺失单元，要么将该批次标记为 `unknown_after_send`，直到适配器将其协调完成。

## 活动上下文

预览、编辑、进度和流式行为应该作为一个可选加入的生命周期。

```typescript
type MessageLiveAdapter = {
  begin?(ctx: MessageSendContext): Promise<LiveMessageState>;
  update?(
    ctx: MessageSendContext,
    state: LiveMessageState,
    update: LiveMessageUpdate,
  ): Promise<LiveMessageState>;
  finalize?(
    ctx: MessageSendContext,
    state: LiveMessageState,
    final: RenderedMessageBatch,
  ): Promise<MessageReceipt>;
  cancel?(
    ctx: MessageSendContext,
    state: LiveMessageState,
    reason: LiveCancelReason,
  ): Promise<void>;
};
```

活动状态的持久化程度足以用于恢复或抑制重复：

```typescript
type LiveMessageState = {
  mode: "partial" | "block" | "progress" | "native";
  receipt?: MessageReceipt;
  visibleSince?: number;
  canFinalizeInPlace: boolean;
  lastRenderedHash?: string;
  staleAfterMs?: number;
};
```

这应当覆盖当前行为：

- Telegram 发送加编辑预览，并在预览陈旧到一定时长后生成新的最终消息。
- Discord 发送加编辑预览，在媒体/错误/显式回复时取消。
- Slack 原生流式或草稿预览，取决于线程形态。
- Mattermost 草稿帖子最终化。
- Matrix 草稿事件最终化，或在不匹配时撤回。
- Teams 原生进度流。
- QQ Bot 流式或累积式回退。

## 适配器表面

公共 SDK 目标应当是一个子路径：

```typescript
import { defineChannelMessageAdapter } from "openclaw/plugin-sdk/channel-message";
```

目标形状：

```typescript
type ChannelMessageAdapter = {
  receive?: MessageReceiveAdapter;
  send: MessageSendAdapter;
  live?: MessageLiveAdapter;
  origin?: MessageOriginAdapter;
  render?: MessageRenderAdapter;
  capabilities: MessageCapabilities;
};
```

发送适配器：

```typescript
type MessageSendAdapter = {
  send(ctx: MessageSendContext, rendered: RenderedMessageBatch): Promise<MessageReceipt>;
  edit?(
    ctx: MessageSendContext,
    receipt: MessageReceipt,
    rendered: RenderedMessageBatch,
  ): Promise<MessageReceipt>;
  delete?(ctx: MessageSendContext, receipt: MessageReceipt): Promise<void>;
  classifyError?(ctx: MessageSendContext, error: unknown): DeliveryFailureKind;
  reconcileUnknownSend?(ctx: MessageSendContext): Promise<MessageReceipt | null>;
  afterSendSuccess?(ctx: MessageSendContext, receipt: MessageReceipt): Promise<void>;
  afterCommit?(ctx: MessageSendContext, receipt: MessageReceipt): Promise<void>;
};
```

接收适配器：

```typescript
type MessageReceiveAdapter<TRaw = unknown> = {
  normalize(raw: TRaw, ctx: MessageNormalizeContext): Promise<ChannelMessage>;
  classify?(message: ChannelMessage): Promise<MessageEventClass>;
  preflight?(message: ChannelMessage, event: MessageEventClass): Promise<MessagePreflightResult>;
  ackPolicy?(message: ChannelMessage, event: MessageEventClass): ReceiveAckPolicy;
};
```

在预检授权之前，只要 `origin.decode` 返回了 OpenClaw 起源元数据，核心必须运行共享的 OpenClaw 回声谓词。接收适配器提供诸如机器人作者和房间形状之类的平台事实；核心负责丢弃决策和顺序，因此各频道不会重复实现文本过滤器。

起源适配器：

```typescript
type MessageOriginAdapter<TRaw = unknown, TNative = unknown> = {
  encode?(origin: MessageOrigin): TNative | undefined;
  decode?(raw: TRaw): MessageOrigin | undefined;
};
```

核心设置 `MessageOrigin`。频道只负责把它翻译为原生传输元数据，以及从原生传输元数据翻译回来。Slack 可将其映射到 `chat.postMessage({ metadata })` 和入站 `message.metadata`；Matrix 可以将其映射到额外的事件内容；没有原生元数据的频道可以在这是最佳可用近似时使用收据/出站注册表。

能力：

```typescript
type MessageCapabilities = {
  text: { maxLength?: number; chunking?: boolean };
  attachments?: {
    upload: boolean;
    remoteUrl: boolean;
    voice?: boolean;
  };
  threads?: {
    reply: boolean;
    topic?: boolean;
    nativeThread?: boolean;
  };
  live?: {
    edit: boolean;
    delete: boolean;
    nativeStream?: boolean;
    progress?: boolean;
  };
  delivery?: {
    idempotencyKey?: boolean;
    retryAfter?: boolean;
    receiptRequired?: boolean;
  };
};
```

## 公共 SDK 收敛

新的公共表面应当吸收或弃用这些概念区域：

- `reply-runtime`
- `reply-dispatch-runtime`
- `reply-reference`
- `reply-chunking`
- `reply-payload`
- `inbound-reply-dispatch`
- `channel-reply-pipeline`
- `outbound-runtime` 的大部分公共用法
- 临时的草稿流生命周期辅助函数

兼容性子路径可以保留为包装器，但新的第三方插件不应需要它们。

打包插件在迁移期间可以通过保留的运行时子路径继续内部导入辅助函数。公共文档应当在 `plugin-sdk/channel-message` 存在后，引导插件作者使用它。

## 与频道轮次的关系

`runtime.channel.turn.*` 在迁移期间应保持存在。

它应当成为一个兼容性适配器：

```text
channel.turn.run
  -> messages.receive context
  -> session dispatch
  -> messages.send context for visible output
```

`channel.turn.runPrepared` 最初也应保留：

```text
channel-owned dispatcher
  -> messages.receive record/finalize bridge
  -> messages.live for preview/progress
  -> messages.send for final delivery
```

在所有打包插件和已知第三方兼容路径都完成桥接之后，`channel.turn` 就可以被弃用。在发布了 SDK 迁移路径，并且有契约测试证明旧插件仍能工作，或在失败时给出清晰的版本错误之前，它不应被移除。

## 兼容性护栏

在迁移期间，对于任何其现有发送回调除了“发送此有效载荷”之外还有副作用的通道，通用持久化投递都是可选启用的。

旧入口点默认不是持久化的：

- `channel.turn.run` 和 `dispatchAssembledChannelTurn` 会使用通道的发送回调，除非该通道显式提供了经过审计的持久化策略/选项对象。
- `channel.turn.runPrepared` 会一直由通道拥有，直到 prepared dispatcher 显式调用发送上下文。
- `recordInboundSessionAndDispatchReply`、`dispatchInboundReplyWithBase` 以及直接 DM 辅助函数等公共兼容性辅助函数，在调用者提供的 `deliver` 或 `reply` 回调之前，绝不会注入通用持久化投递。

对于迁移桥接类型，`durable: undefined` 表示“非持久化”。只有通过显式的策略/选项值才会启用持久化路径。`durable: false` 可以继续作为一种兼容写法，但实现不应要求每个尚未迁移的通道都添加它。

当前桥接代码必须保持持久化决策的显式性：

- 持久化的最终投递会返回一个可辨识的状态。`handled_visible` 和 `handled_no_send` 是终态；`unsupported` 和 `not_applicable` 可以回退到通道拥有的投递；`failed` 会传播发送失败。
- 通用持久化最终投递受适配器能力约束，例如静默投递、回复目标保留、原生引用保留以及消息发送钩子。缺少等价能力时应选择通道拥有的投递，而不是使用会改变用户可见行为的通用发送。
- 队列支持的持久化发送会暴露一个投递意图引用。在过渡期间，现有的 `pendingFinalDelivery*` 会话字段可以携带该意图 id；最终状态应是一个 `MessageSendIntent` 存储，而不是冻结的回复文本加上临时上下文字段。

在以下条件全部满足之前，不要为某个通道启用通用持久化路径：

- 通用发送适配器执行的渲染和传输行为与旧的直达路径完全一致。
- 发送后的本地副作用通过发送上下文得以保留。
- 适配器会返回包含所有平台消息 id 的回执或投递结果。
- prepared dispatcher 路径要么通过新的发送上下文，要么明确记录为不在持久化保证范围内。
- 回退投递会处理每一个投影出的有效载荷，而不仅仅是第一个。
- 持久化回退投递会将整个投影后的有效载荷数组作为一个可重放的意图或批处理计划进行记录。

需要保留的具体迁移风险：

- iMessage monitor 投递会在成功发送后把已发送消息记录到回声缓存中。持久化最终发送仍必须填充该缓存，否则 OpenClaw 可能会把自己的最终回复重新摄取为入站用户消息。
- Tlon 在群组回复后会附加可选的模型签名并记录已参与线程。通用持久化投递不得绕过这些效果；要么把它们移入 Tlon 的 render/send/finalize 适配器中，要么让 Tlon 继续走通道拥有路径。
- Discord 和其他 prepared dispatcher 已经自行拥有直达投递和预览行为。在它们的 prepared dispatcher 显式通过发送上下文路由最终消息之前，它们不在 assembled-turn 的持久化保证覆盖范围内。
- Telegram 静默回退投递必须传送完整的投影有效载荷数组。单一有效载荷的捷径可能会在投影后丢掉额外的回退有效载荷。
- LINE、Zalo、Nostr 以及其他现有的 assembled/helper 路径，可能具有回复令牌处理、媒体代理、已发送消息缓存、加载/状态清理或仅回调目标。它们应继续使用通道拥有的投递，直到这些语义被发送适配器表示并通过测试验证。
- 直接 DM 辅助函数可能拥有一个回复回调，而它才是唯一正确的传输目标。通用出站逻辑不能从 `OriginatingTo` 或 `To` 进行猜测并跳过该回调。
- OpenClaw 网关失败输出必须对人类可见，但带标记的机器人生成房间回声必须在 `allowBots` 授权之前被丢弃。通道不应使用可见文本前缀过滤器来实现这一点，除非作为短期紧急权宜之计；持久化契约依赖结构化的来源元数据。

## 内部存储

持久化队列应存储消息发送意图，而不是回复有效载荷。

```typescript
type DurableSendIntent = {
  id: string;
  idempotencyKey: string;
  channel: string;
  accountId?: string;
  message: ChannelMessage;
  batch?: RenderedMessageBatch;
  liveState?: LiveMessageState;
  status:
    | "pending"
    | "sending"
    | "committing"
    | "unknown_after_send"
    | "sent"
    | "failed"
    | "cancelled";
  attempt: number;
  nextAttemptAt?: number;
  receipt?: MessageReceipt;
  partialReceipt?: MessageReceipt;
  failure?: DeliveryFailure;
  createdAt: number;
  updatedAt: number;
};
```

恢复循环：

```text
load pending or sending intents
  -> acquire idempotency lock
  -> skip if receipt already committed
  -> reconstruct send context
  -> render if needed
  -> reconcile unknown_after_send if needed
  -> call adapter send/edit/finalize
  -> commit receipt, mark unknown_after_send, or schedule retry
```

队列应保留足够的身份信息，以便在重启后通过同一个账户、线程、目标、格式化策略和媒体规则进行重放。

## 失败类别

通道适配器将传输失败归类为受限类别：

```typescript
type DeliveryFailureKind =
  | "transient"
  | "rate_limit"
  | "auth"
  | "permission"
  | "not_found"
  | "invalid_payload"
  | "conflict"
  | "cancelled"
  | "unknown";
```

核心策略：

- 重试 `transient` 和 `rate_limit`。
- 除非存在渲染回退，否则不要重试 `invalid_payload`。
- 在配置未变更之前，不要重试 `auth` 或 `permission`。
- 对于 `not_found`，如果通道声明这样做是安全的，则让 live 最终化从编辑回退到重新发送。
- 对于 `conflict`，使用回执/idempotency 规则来判断消息是否已经存在。
- 在适配器可能已经完成平台 I/O 但在回执提交之前发生的任何错误，都应视为 `unknown_after_send`，除非适配器能够证明平台操作未发生。

## 通道映射

| 通道            | 迁移目标                                                                                                                                                                                                                                                                                                                                                    |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Telegram        | 接收 ack 策略加持久化最终发送。live 适配器负责发送与编辑预览、过期预览的最终发送、topic、引用回复预览跳过、媒体回退以及 retry-after 处理。                                                                                                                                                                                                                  |
| Discord         | 发送适配器封装现有的持久化有效载荷投递。live 适配器负责草稿编辑、进度草稿、媒体/错误预览取消、回复目标保留以及消息 id 回执。在共享房间中审计机器人生成的网关失败回声；如果 Discord 在普通消息上无法携带来源元数据，则使用出站注册表或其他原生等价方案。                                                                                  |
| Slack           | 发送适配器处理普通聊天消息。live 适配器在线程形态支持时选择原生 stream，否则使用草稿预览。回执保留线程时间戳。来源适配器将 OpenClaw 网关失败映射到 Slack `chat.postMessage.metadata`，并在 `allowBots` 授权之前丢弃带标记的机器人房间回声。                                                                                           |
| WhatsApp        | 发送适配器负责带持久化最终意图的文本/媒体发送。接收适配器处理群组提及和发送者身份。在 WhatsApp 拥有可编辑传输之前，live 可以保持不存在。                                                                                                                                                                                                                  |
| Matrix          | live 适配器负责草稿事件编辑、最终化、删除内容、加密媒体约束以及回复目标不匹配回退。接收适配器负责加密事件 hydration 和去重。来源适配器应将 OpenClaw 网关失败来源编码到 Matrix 事件内容中，并在 `allowBots` 处理之前丢弃已配置机器人房间回声。                                                                              |
| Mattermost      | live 适配器负责单个草稿帖子、进度/工具折叠、原地最终化以及重新发送回退。                                                                                                                                                                                                                                                                                |
| Microsoft Teams | live 适配器负责原生进度和块流行为。发送适配器负责活动和附件/卡片回执。                                                                                                                                                                                                                                                                                     |
| Feishu          | 渲染适配器负责文本/卡片/原始渲染。live 适配器负责流式卡片和重复最终消息抑制。发送适配器负责评论、topic 会话、媒体以及语音抑制。                                                                                                                                                                                                                         |
| QQ Bot          | live 适配器负责 C2C 流式、累加器超时以及回退最终发送。渲染适配器负责媒体标签和文本转语音。                                                                                                                                                                                                                                                              |
| Signal          | 简单接收加发送适配器。除非 signal-cli 增加可靠的编辑支持，否则不需要 live 适配器。                                                                                                                                                                                                                                                                         |
| iMessage        | 简单接收加发送适配器。iMessage 发送必须在持久化最终消息绕过 monitor 投递之前保留 monitor 回声缓存填充。                                                                                                                                                                                                                                                 |
| Google Chat     | 简单接收加发送适配器，并将线程关系映射到 spaces 和 thread ids。审计 `allowBots=true` 的房间行为，针对带标记的 OpenClaw 网关失败回声。                                                                                                                                                                                                                |
| LINE            | 简单接收加发送适配器，并将回复令牌约束建模为目标/关系能力。                                                                                                                                                                                                                                                                                               |
| Nextcloud Talk  | SDK 接收桥接加发送适配器。                                                                                                                                                                                                                                                                                                                                  |
| IRC             | 简单接收加发送适配器，没有持久化编辑回执。                                                                                                                                                                                                                                                                                                                 |
| Nostr           | 用于加密 DM 的接收加发送适配器；回执是事件 id。                                                                                                                                                                                                                                                                                                             |
| QA Channel      | 用于接收、发送、live、重试和恢复行为的契约测试适配器。                                                                                                                                                                                                                                                                                                      |
| Synology Chat   | 简单接收加发送适配器。                                                                                                                                                                                                                                                                                                                                      |
| Tlon            | 在启用通用持久化最终投递之前，发送适配器必须保留模型签名渲染和已参与线程跟踪。                                                                                                                                                                                                                                                                             |
| Twitch          | 简单接收加发送适配器，并带有速率限制分类。                                                                                                                                                                                                                                                                                                                |
| Zalo            | 简单接收加发送适配器。                                                                                                                                                                                                                                                                                                                                      |
| Zalo Personal   | 简单接收加发送适配器。                                                                                                                                                                                                                                                                                                                                      |

## 迁移计划

### 阶段 1：内部消息域

- 为消息、目标、关系、
  来源、收据、能力、持久化意图、接收上下文、发送
  上下文、实时上下文和失败类添加 `src/channels/message/*` 类型。
- 将当前回复投递所使用的迁移桥接载荷类型中添加 `origin?: MessageOrigin`，然后在重构用回复载荷替换时，将该字段移到 `ChannelMessage` 和渲染后的
  消息类型中。
- 在适配器和测试证明该形态之前，保持其仅限内部使用。
- 为状态转换和序列化添加纯单元测试。

### 阶段 2：持久化发送核心

- 将现有的出站队列从回复载荷持久化迁移到持久化
  消息发送意图。
- 让持久化发送意图承载一个投影后的载荷数组或批处理计划，而不只是
  一个回复载荷。
- 通过兼容性转换保留当前的队列恢复行为。
- 让 `deliverOutboundPayloads` 调用 `messages.send`。
- 在适配器声明了可重放安全性后，当新的消息生命周期中无法写入持久化意图时，将最终发送持久化设为默认并失败关闭。现有的 channel-turn 和 SDK 兼容路径在此阶段仍默认直接发送。
- 一致地记录收据。
- 将收据和投递结果返回给原始分发器调用者，而不是将持久化发送视为终态副作用。
- 通过持久化发送意图保留消息来源，以便恢复、重放和分块发送保留 OpenClaw 的运行来源。

### 阶段 3：Channel Turn 桥接

- 基于 `messages.receive` 和 `messages.send` 重新实现 `channel.turn.run` 和 `dispatchAssembledChannelTurn`。
- 保持当前事实类型稳定。
- 默认保持旧行为。只有当其适配器通过明确选择带有可重放安全持久化策略时，组装后的 turn channel 才会变为持久化。
- 将 `durable: false` 作为兼容性逃生口，用于那些完成原生编辑且目前无法安全重放的路径，但不要依赖 `false` 标记来保护尚未迁移的 channels。
- 仅在新的消息生命周期中默认启用组装 turn 的持久化，并且要在 channel 映射证明通用发送路径保留了旧的 channel 投递语义之后。

### 阶段 4：预置分发器桥接

- 用发送上下文桥接替换 `deliverDurableInboundReplyPayload`。
- 保留旧帮助函数作为包装器。
- 优先迁移 Telegram、WhatsApp、Slack、Signal、iMessage 和 Discord，因为它们已经有持久化最终化工作或更简单的发送路径。
- 将每个预置分发器都视为未覆盖，直到它明确选择启用发送上下文。文档和更新日志必须写明“组装后的 channel turns”或命名已迁移的 channel 路径，而不要声称所有自动最终回复都已覆盖。
- 保持 `recordInboundSessionAndDispatchReply`、直接 DM 帮助函数以及类似的公共兼容性帮助函数行为不变。它们之后也许会显式暴露发送上下文的选择加入，但在调用方拥有的投递回调之前，绝不能自动尝试通用持久化投递。

### 阶段 5：统一实时生命周期

- 构建 `messages.live`，并使用两个证明适配器：
  - Telegram：发送 + 编辑 + 过期最终发送。
  - Matrix：草稿最终化 + 删除回退。
- 然后迁移 Discord、Slack、Mattermost、Teams、QQ Bot 和飞书。
- 只有在每个 channel 都有对等测试之后，才删除重复的预览最终化代码。

### 阶段 6：公共 SDK

- 添加 `openclaw/plugin-sdk/channel-message`。
- 将其文档说明为首选的 channel 插件 API。
- 更新包导出、入口清单、生成的 API 基线和插件 SDK 文档。
- 在 channel-message SDK 接口中包含 `MessageOrigin`、来源编解码钩子，以及共享的 `shouldDropOpenClawEcho` 谓词。
- 为旧子路径保留兼容包装器。
- 在捆绑插件迁移后，在文档中将以 reply 命名的 SDK 帮助函数标记为已弃用。

### 阶段 7：所有发送者

将所有非回复类出站生产者迁移到 `messages.send` 上：

- cron 和心跳通知
- 任务完成
- hook 结果
- 审批提示和审批结果
- 消息工具发送
- 子代理完成通知
- 显式 CLI 或 Control UI 发送
- 自动化/广播路径

这里模型将不再是“代理回复”，而变成“OpenClaw 发送消息”。

### 阶段 8：弃用 Turn

- 至少保留一个兼容窗口期，将 `channel.turn` 作为包装器。
- 发布迁移说明。
- 针对旧导入运行插件 SDK 兼容性测试。
- 只有在没有捆绑插件需要它们且第三方契约已有稳定替代方案后，才移除或隐藏旧的内部帮助函数。

## 测试计划

单元测试：

- 持久化发送意图的序列化和恢复。
- 幂等键复用和重复抑制。
- 收据提交和重放跳过。
- `unknown_after_send` 恢复：当适配器支持协同时，在重放前进行协调。
- 失败分类策略。
- 接收 ack 策略排序。
- 回复、后续、系统和广播发送的关系映射。
- 网关失败来源工厂和 `shouldDropOpenClawEcho` 谓词。
- 通过载荷归一化、分块、持久化队列序列化和恢复保留来源信息。

集成测试：

- `channel.turn.run` 的简单适配器仍会记录并发送。
- 旧的组装 turn 投递不会变成持久化，除非 channel 明确选择加入。
- `channel.turn.runPrepared` 桥接仍会记录并最终化。
- 默认情况下，公共兼容性帮助函数会调用调用方拥有的投递回调，并且不会在这些回调之前进行通用发送。
- 持久化回退投递在重启后会重放整个投影载荷数组，并且不能在早期崩溃后留下后续载荷未被记录。
- 持久化组装 turn 投递会将平台消息 id 返回给缓冲分发器。
- 当关闭或不可用持久化投递时，自定义投递钩子仍会返回平台消息 id。
- 在 assistant 完成与平台发送之间重启后，最终回复仍可保留。
- 当允许时，预览草稿会原地最终化。
- 当媒体/错误/回复目标不匹配需要正常投递时，预览草稿会被取消或删除。
- 块流式传输和预览流式传输不会同时投递同一文本。
- 早期流式传输的媒体不会在最终投递中重复。

Channel 测试：

- Telegram 主题回复在轮询 ack 延迟到接收上下文的安全完成水位线之前不会提前确认。
- Telegram 对已接受但未投递更新的轮询恢复，由持久化的安全完成偏移模型覆盖。
- Telegram 过期预览会发送新的最终内容并清理预览。
- Telegram 静默回退会发送每一个投影的回退载荷。
- Telegram 静默回退持久化会将完整的投影回退数组原子性地记录下来，而不是在每次循环迭代中为单个载荷创建一个持久化意图。
- Discord 预览在媒体/错误/显式回复时取消。
- Discord 预置分发器的最终结果在文档或更新日志宣称 Discord 最终回复持久化之前，会先通过发送上下文路由。
- iMessage 持久化最终发送会填充监控中的已发送消息回显缓存。
- LINE、Zalo 和 Nostr 的旧投递路径不会在它们的适配器对等测试存在之前被通用持久化发送绕过。
- 除非显式迁移到完整消息目标和可重放安全的发送适配器，否则直接 DM/Nostr 回调投递仍然具有权威性。
- Slack 带标记的 OpenClaw 网关失败消息在出站时保持可见，带标签的 bot-room 回显会在 `allowBots` 之前被丢弃，而未标记但文本相同的 bot 消息仍按正常 bot 授权流程处理。
- Slack 原生流在顶层 DM 中回退到草稿预览。
- Matrix 预览最终化和删除回退。
- Matrix 中由已配置 bot 账户发出的、带标记的 OpenClaw 网关失败房间回显会在 `allowBots` 处理前丢弃。
- Discord 和 Google Chat 的共享房间网关失败级联审计在宣称通用保护前，要覆盖 `allowBots` 模式。
- Mattermost 草稿最终化和新鲜发送回退。
- Teams 原生进度最终化。
- 飞书重复最终发送抑制。
- QQ Bot 累加器超时回退。
- Tlon 持久化最终发送会保留模型签名渲染和参与线程跟踪。
- WhatsApp、Signal、iMessage、Google Chat、LINE、IRC、Nostr、Nextcloud Talk、Synology Chat、Tlon、Twitch、Zalo 和 Zalo Personal 的简单持久化最终发送。

验证：

- 开发期间使用有针对性的 Vitest 文件。
- 在 Testbox 中运行 `pnpm check:changed`，覆盖完整变更面。
- 在合并完整重构或公共 SDK/导出变更之前，在 Testbox 中运行更广泛的 `pnpm check`。
- 在移除兼容包装器之前，至少对一个可编辑 channel 和一个仅支持简单发送的 channel 进行线上或 qa-channel 冒烟测试。

## 未决问题

- Telegram 是否最终应将 grammY runner 源替换为一个完全持久化的轮询源，以便控制平台级重投，而不仅仅是 OpenClaw 的持久化重启水位线。
- 持久化实时预览状态是否应与最终发送意图存放在同一个队列记录中，还是存放在兄弟实时状态存储中。
- `plugin-sdk/channel-message` 发布后，兼容包装器应在文档中保留多久。
- 第三方插件应直接实现接收适配器，还是仅通过 `defineChannelMessageAdapter` 提供 normalize/send/live 钩子。
- 哪些收据字段可以安全地暴露在公共 SDK 中，而哪些应保留在内部运行时状态中。
- 自回显缓存和参与线程标记等副作用，应建模为发送上下文钩子、适配器拥有的最终化步骤，还是收据订阅者。
- 哪些 channels 拥有原生来源元数据，哪些需要持久化出站注册表，以及哪些无法提供可靠的跨 bot 回显抑制。

## 验收标准

- 每个捆绑的消息 channel 都通过 `messages.send` 发送最终可见输出。
- 每个入站消息 channel 都通过 `messages.receive` 或文档化的兼容包装器进入。
- 每个预览/编辑/流式 channel 都使用 `messages.live` 管理草稿状态和最终化。
- `channel.turn` 仅作为包装器存在。
- 以 reply 命名的 SDK 帮助函数只是兼容性导出，而不是推荐路径。
- 持久化恢复可以在重启后重放待处理的最终发送，而不会丢失最终响应或重复已经提交的发送；平台结果未知的发送会在重放前被协调，或者对该适配器文档化为至少一次语义。
- 除非调用方显式选择了文档化的非持久化模式，否则当无法写入持久化意图时，持久化最终发送会失败关闭。
- 旧的 channel-turn 和 SDK 兼容性帮助函数默认使用 channel 拥有的直接投递；通用持久化发送仅作为显式选择加入。
- 收据会为多段投递保留所有平台消息 id，并为线程/编辑便利保留一个主 id。
- 在替换直接投递回调之前，持久化包装器会保留 channel 级副作用。
- 在其最终投递路径明确使用发送上下文之前，预置分发器不被计为持久化。
- 回退投递会处理每一个投影载荷。
- 持久化回退投递会将每一个投影载荷记录在一个可重放的意图或批处理计划中。
- OpenClaw 发起的网关失败输出对人类可见，但在声明支持来源契约的 channels 上，带标签的 bot 作者房间回显会在 bot 授权之前被丢弃。
- 文档说明发送、接收、实时、状态、收据、关系、失败策略、迁移和测试覆盖。

## 相关

- [消息](/concepts/messages)
- [流式传输和分块](/concepts/streaming)
- [进度草稿](/concepts/progress-drafts)
- [重试策略](/concepts/retry)
- [通道轮次内核](/plugins/sdk-channel-turn)
