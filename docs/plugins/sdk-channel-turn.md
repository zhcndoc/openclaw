---
summary: "runtime.channel.turn -- bundled and third-party channel plugins 用于记录、分发和完成 agent turns 的共享 inbound turn kernel"
title: "Channel turn kernel"
sidebarTitle: "Channel turn"
read_when:
  - 你正在构建一个 channel 插件，并希望使用共享的 inbound turn 生命周期
  - 你正在将一个 channel monitor 从手写的 record/dispatch glue 迁移出去
  - 你需要了解 admission、ingest、classify、preflight、resolve、record、dispatch 和 finalize 阶段
---

channel turn kernel 是共享的 inbound state machine，它将标准化的平台事件转换为一个 agent turn。Channel plugins 提供平台事实和 delivery callback。Core 负责 orchestration：ingest、classify、preflight、resolve、authorize、assemble、record、dispatch 和 finalize。

当你的插件处于 inbound message 热路径时使用它。对于非消息事件（slash commands、modals、button interactions、lifecycle events、reactions、voice state），请保持在插件本地处理。Kernel 只负责那些可能变成 agent text turn 的事件。

<Info>
  Kernel 通过注入的 plugin runtime 以 `runtime.channel.turn.*` 形式访问。Plugin runtime 类型从 `openclaw/plugin-sdk/core` 导出，因此第三方 native plugins 可以像内置 channel plugins 一样使用这些入口点。
</Info>

## 为什么需要共享 kernel

Channel plugins 会重复同样的 inbound flow：normalize、route、gate、build context、record session metadata、dispatch agent turn、finalize delivery state。如果没有共享 kernel，mention gating、tool-only visible replies、session metadata、pending history 或 dispatch finalization 的任何变更都必须按 channel 分别应用。

Kernel 将四个概念刻意分离：

- `ConversationFacts`：消息来自哪里
- `RouteFacts`：哪个 agent 和 session 应该处理它
- `ReplyPlanFacts`：可见回复应该发往哪里
- `MessageFacts`：agent 应看到的正文和补充上下文

Slack DMs、Telegram topics、Matrix threads 和 Feishu topic sessions 在实践中都区分这些概念。把它们当成同一个标识符会随着时间推移导致偏差。

## 阶段生命周期

无论 channel 如何，kernel 都会运行同一条固定 pipeline：

1. `ingest` -- adapter 将原始平台事件转换为 `NormalizedTurnInput`
2. `classify` -- adapter 声明该事件是否可以启动一个 agent turn
3. `preflight` -- adapter 执行 dedupe、self-echo、hydration、debounce、decryption、partial fact prefill
4. `resolve` -- adapter 返回一个完整组装好的 turn（route、reply plan、message、delivery）
5. `authorize` -- 对组装后的 facts 应用 DM、group、mention 和 command policy
6. `assemble` -- 通过 `buildContext` 基于 facts 构建 `FinalizedMsgContext`
7. `record` -- 持久化 inbound session metadata 和 last route
8. `dispatch` -- 通过 buffered block dispatcher 执行 agent turn
9. `finalize` -- 即使 dispatch 出错，adapter 的 `onFinalize` 也会运行

当提供 `log` callback 时，每个阶段都会发出结构化日志事件。参见 [Observability](#observability)。

## 接纳类型

当 turn 被 gate 时，kernel 不会抛错，而是返回一个 `ChannelTurnAdmission`：

| Kind          | When                                                                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `dispatch`    | Turn 被接纳。Agent turn 运行，并且可见回复路径会被执行。                                                                                      |
| `observeOnly` | Turn 完整运行，但 delivery adapter 不发送任何可见内容。用于 broadcast observer agents 和其他 passive multi-agent flows。                    |
| `handled`     | 一个平台事件已在本地被消费（lifecycle、reaction、button、modal）。Kernel 跳过 dispatch。                                                     |
| `drop`        | 跳过路径。可选地，`recordHistory: true` 会将消息保留在 pending group history 中，以便未来的 mention 具备上下文。                               |

Admission 可以来自 `classify`（事件类别表示它不能启动 turn）、`preflight`（dedupe、self-echo、缺少 mention 但记录历史）、或者 `resolveTurn` 本身。

## 入口点

Runtime 提供三个首选入口点，方便 adapters 以最适合该 channel 的层级接入。

```typescript
runtime.channel.turn.run(...)             // 由 adapter 驱动的完整 pipeline
runtime.channel.turn.runPrepared(...)     // channel 自主管理 dispatch；kernel 运行 record + finalize
runtime.channel.turn.buildContext(...)    // 从纯 facts 映射到 FinalizedMsgContext
```

另外还有两个旧的 runtime helpers 为 Plugin SDK 兼容性保留可用：

```typescript
runtime.channel.turn.runResolved(...)      // 已弃用的兼容别名；优先使用 run
runtime.channel.turn.dispatchAssembled(...) // 已弃用的兼容别名；优先使用 run 或 runPrepared
```

### run

当你的 channel 可以将 inbound flow 表达为 `ChannelTurnAdapter<TRaw>` 时使用。该 adapter 提供 `ingest`、可选的 `classify`、可选的 `preflight`、必需的 `resolveTurn` 以及可选的 `onFinalize` 回调。

```typescript
await runtime.channel.turn.run({
  channel: "tlon",
  accountId,
  raw: platformEvent,
  adapter: {
    ingest(raw) {
      return {
        id: raw.messageId,
        timestamp: raw.timestamp,
        rawText: raw.body,
        textForAgent: raw.body,
      };
    },
    classify(input) {
      return { kind: "message", canStartAgentTurn: input.rawText.length > 0 };
    },
    async preflight(input, eventClass) {
      if (await isDuplicate(input.id)) {
        return { admission: { kind: "drop", reason: "dedupe" } };
      }
      return {};
    },
    resolveTurn(input) {
      return buildAssembledTurn(input);
    },
    onFinalize(result) {
      clearPendingGroupHistory(result);
    },
  },
});
```

当 channel 只有较小的 adapter 逻辑，并且希望通过 hooks 自行掌握生命周期时，`run` 是合适的形式。

### runPrepared

当 channel 拥有复杂的本地 dispatcher，包含预览、重试、编辑或 thread bootstrap，且必须保持由 channel 自己负责时使用。Kernel 仍然会在 dispatch 前记录 inbound session，并返回统一的 `DispatchedChannelTurnResult`。

```typescript
const { dispatchResult } = await runtime.channel.turn.runPrepared({
  channel: "matrix",
  accountId,
  routeSessionKey,
  storePath,
  ctxPayload,
  recordInboundSession,
  record: {
    onRecordError,
    updateLastRoute,
  },
  onPreDispatchFailure: async (err) => {
    await stopStatusReactions();
  },
  runDispatch: async () => {
    return await runMatrixOwnedDispatcher();
  },
});
```

Rich channels（Matrix、Mattermost、Microsoft Teams、Feishu、QQ Bot）使用 `runPrepared`，因为它们的 dispatcher 编排着 kernel 不应了解的平台特定行为。

### buildContext

一个纯函数，用于将 fact bundles 映射为 `FinalizedMsgContext`。当你的 channel 手写了 pipeline 的部分步骤，但希望 context 形状保持一致时使用它。

```typescript
const ctxPayload = runtime.channel.turn.buildContext({
  channel: "googlechat",
  accountId,
  messageId,
  timestamp,
  from,
  sender,
  conversation,
  route,
  reply,
  message,
  access,
  media,
  supplemental,
});
```

当在 `resolveTurn` 回调中组装 turn 时，`buildContext` 也很有用，尤其适用于 `run`。

<Note>
  诸如 `dispatchInboundReplyWithBase` 之类已弃用的 SDK helpers 仍然通过 assembled-turn helper 进行桥接。新的插件代码应使用 `run` 或 `runPrepared`。
</Note>

## Fact 类型

Kernel 从你的 adapter 消费的 facts 是平台无关的。在交给 kernel 之前，请先将平台对象转换为这些形状。

### NormalizedTurnInput

| Field             | Purpose                                                                      |
| ----------------- | ---------------------------------------------------------------------------- |
| `id`              | 用于 dedupe 和 logs 的稳定 message id                                       |
| `timestamp`       | 可选的 epoch ms                                                             |
| `rawText`         | 从平台接收到的正文                                                           |
| `textForAgent`    | 可选的、供 agent 使用的清理后正文（去 mention、裁剪 typing）                  |
| `textForCommands` | 可选的、用于 `/command` parsing 的正文                                       |
| `raw`             | 可选的透传引用，供需要原始数据的 adapter callbacks 使用                       |

### ChannelEventClass

| Field                  | Purpose                                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| `kind`                 | `message`、`command`、`interaction`、`reaction`、`lifecycle`、`unknown` |
| `canStartAgentTurn`    | 如果为 false，kernel 返回 `{ kind: "handled" }`                         |
| `requiresImmediateAck` | 给需要在 dispatch 前先 ACK 的 adapters 的提示                              |

### SenderFacts

| Field          | Purpose                                                        |
| -------------- | -------------------------------------------------------------- |
| `id`           | 稳定的 platform sender id                                       |
| `name`         | 显示名                                                         |
| `username`     | 如果与 `name` 不同则为 handle                                     |
| `tag`          | Discord 风格的 discriminator 或平台 tag                         |
| `roles`        | role ids，用于 member-role allowlist matching                   |
| `isBot`        | 当 sender 是已知 bot 时为 true（kernel 用于 dropping）           |
| `isSelf`       | 当 sender 是已配置的 agent 自身时为 true                         |
| `displayLabel` | 为 envelope text 预渲染的标签                                    |

### ConversationFacts

| Field             | Purpose                                                              |
| ----------------- | -------------------------------------------------------------------- |
| `kind`            | `direct`、`group` 或 `channel`                                       |
| `id`              | 用于 routing 的 conversation id                                      |
| `label`           | envelope 的人类可读标签                                             |
| `spaceId`         | 可选的外层 space 标识符（Slack workspace、Matrix homeserver）         |
| `parentId`        | 当这是 thread 时的外层 conversation id                               |
| `threadId`        | 当消息位于 thread 中时的 thread id                                   |
| `nativeChannelId` | 当与 routing id 不同时的原生 platform channel id                      |
| `routePeer`       | 用于 `resolveAgentRoute` lookup 的 peer                              |

### RouteFacts

| Field                   | Purpose                                                    |
| ----------------------- | ---------------------------------------------------------- |
| `agentId`               | 应处理此 turn 的 agent                                     |
| `accountId`             | 可选覆盖（多账号 channels）                                 |
| `routeSessionKey`       | 用于 routing 的 session key                               |
| `dispatchSessionKey`    | dispatch 时使用的 session key（当与 route key 不同时）     |
| `persistedSessionKey`   | 写入持久化 session metadata 的 session key                 |
| `parentSessionKey`      | 分支 / thread sessions 的 parent                          |
| `modelParentSessionKey` | 分支 sessions 的 model-side parent                        |
| `mainSessionKey`        | direct conversations 的 main DM owner pin               |
| `createIfMissing`       | 允许 record step 创建缺失的 session row                    |

### ReplyPlanFacts

| Field                     | Purpose                                                 |
| ------------------------- | ------------------------------------------------------- |
| `to`                      | 写入 context `To` 的逻辑 reply target                   |
| `originatingTo`           | 源起 context target（`OriginatingTo`）                  |
| `nativeChannelId`         | 用于 delivery 的 platform-native channel id             |
| `replyTarget`             | 如果与 `to` 不同，则为最终可见 reply destination       |
| `deliveryTarget`          | 更低层级的 delivery override                             |
| `replyToId`               | 被引用 / 锚定的 message id                               |
| `replyToIdFull`           | 平台同时具有两种形式时的完整 quoted id                  |
| `messageThreadId`         | delivery 时的 thread id                                 |
| `threadParentId`          | thread 的 parent message id                             |
| `sourceReplyDeliveryMode` | `thread`、`reply`、`channel`、`direct` 或 `none`         |

### AccessFacts

`AccessFacts` 承载 authorize 阶段所需的布尔值。身份匹配保持在 channel 内部：kernel 只消费结果。

| Field      | Purpose                                                                   |
| ---------- | ------------------------------------------------------------------------- |
| `dm`       | DM allow/pairing/deny decision 以及 `allowFrom` 列表                      |
| `group`    | group policy、route allow、sender allow、allowlist、mention requirement  |
| `commands` | 跨已配置 authorizers 的 command authorization                            |
| `mentions` | 是否可以检测 mention，以及 agent 是否被 mention                          |

### MessageFacts

| Field            | Purpose                                                        |
| ---------------- | -------------------------------------------------------------- |
| `body`           | 最终 envelope body（格式化后）                                  |
| `rawBody`        | 原始 inbound body                                               |
| `bodyForAgent`   | agent 看到的正文                                               |
| `commandBody`    | 用于 command parsing 的正文                                     |
| `envelopeFrom`   | 为 envelope 预渲染的 sender 标签                                |
| `senderLabel`    | 渲染 sender 的可选覆盖值                                       |
| `preview`        | 用于 logs 的简短脱敏预览                                        |
| `inboundHistory` | 当 channel 保留缓冲区时，最近的 inbound history entries         |

### SupplementalContextFacts

Supplemental context 涵盖 quote、forwarded 和 thread-bootstrap 上下文。Kernel 会应用已配置的 `contextVisibility` policy。Channel adapter 只提供 facts 和 `senderAllowed` 标记，以便跨 channel policy 保持一致。

### InboundMediaFacts

Media 以 fact 形状表示。平台下载、auth、SSRF policy、CDN rules 和 decryption 保持在 channel 本地。Kernel 将 facts 映射为 `MediaPath`、`MediaUrl`、`MediaType`、`MediaPaths`、`MediaUrls`、`MediaTypes` 和 `MediaTranscribedIndexes`。

## 适配器契约

对于完整的 `run`，适配器形状如下：

```typescript
type ChannelTurnAdapter<TRaw> = {
  ingest(raw: TRaw): Promise<NormalizedTurnInput | null> | NormalizedTurnInput | null;
  classify?(input: NormalizedTurnInput): Promise<ChannelEventClass> | ChannelEventClass;
  preflight?(
    input: NormalizedTurnInput,
    eventClass: ChannelEventClass,
  ): Promise<PreflightFacts | ChannelTurnAdmission | null | undefined>;
  resolveTurn(
    input: NormalizedTurnInput,
    eventClass: ChannelEventClass,
    preflight: PreflightFacts,
  ): Promise<ChannelTurnResolved> | ChannelTurnResolved;
  onFinalize?(result: ChannelTurnResult): Promise<void> | void;
};
```

`resolveTurn` 返回一个 `ChannelTurnResolved`，它是一个带有可选准入类型的 `AssembledChannelTurn`。返回 `{ admission: { kind: "observeOnly" } }` 会在不产生可见输出的情况下运行该轮次。适配器仍然拥有投递回调；只不过在该轮次中它会变成空操作。

`onFinalize` 会在每个结果上运行，包括分发错误。可用它来清理待处理的群组历史、移除 ack 反应、停止状态指示器，并刷新本地状态。

## 投递适配器

内核不会直接调用平台。频道会向内核提供一个 `ChannelTurnDeliveryAdapter`：

```typescript
type ChannelTurnDeliveryAdapter = {
  deliver(payload: ReplyPayload, info: ChannelDeliveryInfo): Promise<ChannelDeliveryResult | void>;
  onError?(err: unknown, info: { kind: string }): void;
  durable?: false | DurableInboundReplyDeliveryOptions;
};

type ChannelDeliveryResult = {
  messageIds?: string[];
  receipt?: MessageReceipt;
  threadId?: string;
  replyToId?: string;
  visibleReplySent?: boolean;
};
```

`deliver` 每个缓冲的回复块会调用一次。在消息生命周期迁移期间，组装后的频道轮次投递默认由频道拥有：省略 `durable` 字段表示内核必须直接调用 `deliver`，且不得通过通用出站投递路径路由。只有在频道经过审计并证明通用发送路径能保持旧的投递行为后，才能设置 `durable`，包括回复/线程目标、媒体处理、已发送消息/自回显缓存、状态清理以及返回的消息 ID。`durable: false` 仍然是“使用频道拥有的回调”的兼容写法，但未迁移的频道不应需要添加它。如果频道有平台消息 ID，请返回它们，以便分发器保留线程锚点并在后续块中继续编辑；较新的投递路径还应返回 `receipt`，这样恢复、预览收尾和重复抑制就可以摆脱对 `messageIds` 的依赖。对于仅观察的轮次，返回 `{ visibleReplySent: false }`，或者使用 `createNoopChannelTurnDeliveryAdapter()`。

使用 `runPrepared` 且完全由频道拥有分发器的频道没有 `ChannelTurnDeliveryAdapter`。这些分发器默认不是 durable。它们应继续使用直接投递路径，直到显式选择新的发送上下文，并且具备完整的目标、可重放安全的适配器、receipt 契约以及频道副作用钩子。

诸如 `recordInboundSessionAndDispatchReply`、`dispatchInboundReplyWithBase` 和直接 DM 辅助函数之类的公共兼容性辅助工具，在迁移期间必须保持行为不变。它们不应在调用方拥有的 `deliver` 或 `reply` 回调之前调用通用 durable 投递。

## 记录选项

记录阶段会包装 `recordInboundSession`。大多数频道可以使用默认值。可通过 `record` 进行覆盖：

```typescript
record: {
  groupResolution,
  createIfMissing: true,
  updateLastRoute,
  onRecordError: (err) => log.warn("record failed", err),
  trackSessionMetaTask: (task) => pendingTasks.push(task),
}
```

分发器会等待记录阶段。如果记录抛出错误，内核会运行 `onPreDispatchFailure`（在通过 `runPrepared` 提供时），然后重新抛出。

## 可观测性

当提供 `log` 回调时，每个阶段都会发出一个结构化事件：

```typescript
await runtime.channel.turn.run({
  channel: "twitch",
  accountId,
  raw,
  adapter,
  log: (event) => {
    runtime.log?.debug?.(`turn.${event.stage}:${event.event}`, {
      channel: event.channel,
      accountId: event.accountId,
      messageId: event.messageId,
      sessionKey: event.sessionKey,
      admission: event.admission,
      reason: event.reason,
    });
  },
});
```

记录的阶段有：`ingest`、`classify`、`preflight`、`resolve`、`authorize`、`assemble`、`record`、`dispatch`、`finalize`。避免记录原始正文；请使用 `MessageFacts.preview` 作为简短的脱敏预览。

## 保持频道本地的内容

内核负责编排。频道仍然负责：

- 平台传输层（网关、REST、websocket、轮询、webhooks）
- 身份解析和显示名称匹配
- 原生命令、斜杠命令、自动补全、模态框、按钮、语音状态
- 卡片、模态框和自适应卡片渲染
- 媒体授权、CDN 规则、加密媒体、转录
- 编辑、反应、红action 和 presence API
- 回填和平台侧历史获取
- 需要平台特定验证的配对流程

如果两个频道开始需要为其中某一项使用同一个辅助工具，请提取一个共享的 SDK helper，而不是把它推进内核。

## 稳定性

`runtime.channel.turn.*` 是公共插件运行时表面的一部分。事实类型（`SenderFacts`、`ConversationFacts`、`RouteFacts`、`ReplyPlanFacts`、`AccessFacts`、`MessageFacts`、`SupplementalContextFacts`、`InboundMediaFacts`）和准入形状（`ChannelTurnAdmission`、`ChannelEventClass`）可以通过 `openclaw/plugin-sdk/core` 中的 `PluginRuntime` 访问。

向后兼容规则适用：新的事实字段只能追加，准入类型不会被重命名，入口点名称保持稳定。需要非追加式变更的新频道需求必须经过插件 SDK 迁移流程。

## 相关内容

- [Message lifecycle refactor](/concepts/message-lifecycle-refactor) for the planned send/receive/live lifecycle that will wrap this kernel
- [Building channel plugins](/plugins/sdk-channel-plugins) for the broader channel plugin contract
- [Plugin runtime helpers](/plugins/sdk-runtime) for other `runtime.*` surfaces
- [Plugin internals](/plugins/architecture-internals) for load pipeline and registry mechanics
