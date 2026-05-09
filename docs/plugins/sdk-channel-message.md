---
summary: "消息生命周期 API，适用于频道插件，包括持久化发送、回执、实时预览、接收确认策略以及旧版迁移"
title: "频道消息 API"
read_when:
  - 你正在构建或重构一个消息频道插件
  - 你需要可靠的最终回复投递、回执、实时预览定稿，或接收确认策略
  - 你正在从旧版回复管线或入站回复分发辅助函数迁移
---

频道插件应从
`openclaw/plugin-sdk/channel-message` 暴露一个 `message` 适配器。该适配器描述了平台支持的原生消息生命周期：

```text
receive -> 路由并记录 -> agent turn -> 持久化最终发送
send -> 渲染批次 -> 平台 I/O -> 回执 -> 生命周期副作用
live preview -> 最终编辑或回退 -> 回执
```

Core 负责队列、持久性、通用重试策略、hooks、回执，以及共享的 `message` 工具。插件负责原生的发送/编辑/删除调用、目标规范化、平台线程、选中的引用、通知标志、账户状态以及平台特定副作用。

请将此页面与 [构建频道插件](/plugins/sdk-channel-plugins) 一起使用。

`channel-message` 子路径被刻意设计得足够轻量，适合像 `channel.ts` 这样的热插件引导文件：它暴露适配器契约、能力证明、回执和兼容性适配层，而不会加载出站投递。运行时投递辅助函数可从
`openclaw/plugin-sdk/channel-message-runtime` 获取，适用于已经在进行异步消息 I/O 的监控/send 代码路径。

## 最小适配器

大多数新的频道插件都可以从一个小型适配器开始：

```typescript
import {
  defineChannelMessageAdapter,
  createMessageReceiptFromOutboundResults,
} from "openclaw/plugin-sdk/channel-message";

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

然后将其附加到频道插件：

```typescript
export const demoPlugin = createChatChannelPlugin({
  base: {
    id: "demo",
    message: demoMessageAdapter,
    // 其他频道插件字段
  },
});
```

只声明适配器真正保留的能力。每一项声明的能力都应该有契约测试。

## 出站桥接

如果频道已经有一个兼容的 `outbound` 适配器，优先从中派生 message 适配器，而不是重复发送代码：

```typescript
import { createChannelMessageAdapterFromOutbound } from "openclaw/plugin-sdk/channel-message";

const demoMessageAdapter = createChannelMessageAdapterFromOutbound({
  id: "demo",
  outbound: demoOutboundAdapter,
});
```

该桥接会将旧的 outbound 发送结果转换为 `MessageReceipt` 值。新代码应该端到端传递回执，只在兼容边界使用 `listMessageReceiptPlatformIds(...)` 或 `resolveMessageReceiptPrimaryId(...)` 之类的方法派生旧版 id。
如果未提供接收策略，`createChannelMessageAdapterFromOutbound(...)` 会使用 `manual` 接收确认策略。这使得插件拥有的平台确认显式化，同时不会改变那些在通用 receive 上下文之外通过 webhook、socket 或轮询偏移量进行确认的频道。

## 消息工具发送

共享的 `message(action="send")` 路径应使用与最终回复相同的核心投递生命周期。如果频道需要针对工具发送进行特定于提供方的整形，请实现 `actions.prepareSendPayload(...)`，而不是从 `actions.handleAction(...)` 中发送。

`prepareSendPayload(...)` 会接收规范化后的 core `ReplyPayload` 以及完整的动作上下文。返回一个在 `payload.channelData.<channel>` 中包含频道特定数据的 payload，并让 core 调用 `sendMessage(...)`、`deliverOutboundPayloads(...)`、写前日志队列、message-sending hooks、重试、恢复以及 ack 清理。

只有当发送无法表示为持久化 payload 时才返回 `null`，例如它包含一个不可序列化的组件工厂。Core 会为兼容性保留旧版插件动作回退，但新的频道发送特性应当能够表示为持久化 payload 数据。

```typescript
export const demoActions: ChannelMessageActionAdapter = {
  describeMessageTool: () => ({ actions: ["send"], capabilities: ["presentation"] }),
  prepareSendPayload: ({ ctx, payload }) => {
    if (ctx.action !== "send") {
      return null;
    }
    return {
      ...payload,
      channelData: {
        ...payload.channelData,
        demo: {
          ...(payload.channelData?.demo as object | undefined),
          nativeCard: ctx.params.card,
        },
      },
    };
  },
};
```

随后 outbound 适配器会在 `sendPayload` 中读取 `payload.channelData.demo`。这使平台特定的渲染保留在插件中，同时 core 仍然负责持久化、重试、恢复、hooks 和 ack。

准备好的 `message(action="send")` payload 以及通用最终回复投递，默认都使用 core delivery，并采用尽力而为的队列机制。只有在 core 验证该频道能够在崩溃后对结果未知的发送进行一致处理时，才允许使用必需的持久化队列。如果适配器无法实现 `reconcileUnknownSend`，请将准备好的发送路径保持为尽力而为；core 仍会尝试写前日志队列，但队列持久化或不确定的崩溃恢复不属于必需投递契约的一部分。

## 持久化最终能力

持久化最终投递按副作用逐项启用。只有当适配器声明了 payload 和投递选项所需的全部能力时，core 才会使用通用持久化投递。

| 能力                   | 何时声明                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `text`                 | 适配器能够发送文本并返回回执。                                                     |
| `media`                | 媒体发送会为每条可见的平台消息返回回执。                                           |
| `payload`              | 适配器保留富回复 payload 语义，而不仅仅是文本和单个媒体 URL。                      |
| `replyTo`              | 原生回复目标能够到达平台。                                                         |
| `thread`               | 原生线程、主题或频道线程目标能够到达平台。                                         |
| `silent`               | 通知抑制能够到达平台。                                                             |
| `nativeQuote`          | 选中的引用元数据能够到达平台。                                                     |
| `messageSendingHooks`  | 核心 message-sending hooks 可以在平台 I/O 之前取消或重写内容。                     |
| `batch`                | 多部分渲染批次可以作为一个持久化计划重放。                                         |
| `reconcileUnknownSend` | 适配器可以在不盲目重放的情况下解决 `unknown_after_send` 恢复。                     |
| `afterSendSuccess`     | 频道本地的 send 后副作用只运行一次。                                               |
| `afterCommit`          | 频道本地的 commit 后副作用只运行一次。                                             |

尽力而为的最终投递不要求 `reconcileUnknownSend`；当适配器保留了 payload 的可见语义时，它使用共享生命周期，并在队列持久化不可用时回退到直接的平台 I/O。必需的持久化最终投递必须明确要求 `reconcileUnknownSend`。如果适配器无法判断一个已开始/未知状态的发送是否已到达平台，请不要声明该能力；core 会在队列化之前拒绝必需的持久化投递。

当调用方需要持久化投递时，请派生需求，而不是手工构建映射：

```typescript
import { deriveDurableFinalDeliveryRequirements } from "openclaw/plugin-sdk/channel-message";

const requiredCapabilities = deriveDurableFinalDeliveryRequirements({
  payload,
  replyToId,
  threadId,
  silent,
  payloadTransport: true,
  extraCapabilities: {
    nativeQuote: hasSelectedQuote(payload),
  },
});
```

`messageSendingHooks` 默认是必需的。只有在某条路径明确无法运行全局 message-sending hooks 时，才将 `messageSendingHooks: false`。

## 持久化发送契约

持久化最终发送比旧版的频道自有投递有更严格的语义：

- 在平台 I/O 之前创建持久化意图。
- 如果持久化投递返回了已处理结果，不要回退到旧版发送。
- 将 hook 取消和 no-send 结果视为终态。
- 将 `unsupported` 仅视为预意图结果。
- 对于必需的持久性，如果队列无法记录平台发送已经开始，则在平台 I/O 之前失败。
- 对于必需的最终投递和必需的准备好消息工具发送，预检 `reconcileUnknownSend`；恢复必须能够确认一条已经发送的消息，或者仅在适配器证明原始发送未发生后才重放。
- 对于 `best_effort`，队列写入失败可以回退到直接的平台 I/O。
- 将中止信号传递给媒体加载和平台发送。
- 在队列 ack 之后运行 after-commit hooks；直接的尽力而为回退会在成功的平台 I/O 之后运行它们，因为此时没有持久化队列提交。
- 为每个可见的平台 message id 返回回执。
- 当平台能够检查一次不确定的发送是否已经到达用户时，使用 `reconcileUnknownSend`。

该契约可避免崩溃后重复发送，并避免绕过 message-sending 取消 hooks。

## 收据

`MessageReceipt` 是平台已接受内容的新的内部记录：

```typescript
type MessageReceipt = {
  primaryPlatformMessageId?: string;
  platformMessageIds: string[];
  parts: MessageReceiptPart[];
  threadId?: string;
  replyToId?: string;
  editToken?: string;
  deleteToken?: string;
  sentAt: number;
  raw?: readonly MessageReceiptSourceResult[];
};
```

在适配现有发送结果时使用 `createMessageReceiptFromOutboundResults(...)`。当实时预览消息变为最终收据时使用 `createPreviewMessageReceipt(...)`。避免新增 owner-local 的 `messageIds` 字段。兼容性边缘仍会产生旧的 `ChannelDeliveryResult.messageIds`。

## 实时预览

会流式发送草稿预览或进度更新的渠道应声明实时能力：

```typescript
const demoMessageAdapter = defineChannelMessageAdapter({
  id: "demo",
  live: {
    capabilities: {
      draftPreview: true,
      previewFinalization: true,
      progressUpdates: true,
      quietFinalization: true,
    },
    finalizer: {
      capabilities: {
        finalEdit: true,
        normalFallback: true,
        discardPending: true,
        previewReceipt: true,
        retainOnAmbiguousFailure: true,
      },
    },
  },
});
```

在运行时终结时使用 `defineFinalizableLivePreviewAdapter(...)` 和
`deliverWithFinalizableLivePreviewAdapter(...)`。终结器决定最终回复是就地编辑预览、发送常规回退、丢弃待处理的预览状态、保留一个含糊失败但不重复消息的已编辑内容，并返回最终收据。

## 接收 ack 策略

控制平台确认时机的入站接收器应声明接收策略：

```typescript
const demoMessageAdapter = defineChannelMessageAdapter({
  id: "demo",
  receive: {
    defaultAckPolicy: "after_agent_dispatch",
    supportedAckPolicies: ["after_receive_record", "after_agent_dispatch"],
  },
});
```

未声明接收策略的适配器默认为：

```typescript
{
  receive: {
    defaultAckPolicy: "manual",
    supportedAckPolicies: ["manual"],
  },
}
```

当平台没有可延迟的确认、在异步处理之前已经确认，或需要协议特定的响应语义时，使用默认值。只有当接收器确实使用接收上下文将平台确认推迟到更晚阶段时，才声明阶段式策略之一。

策略：

| 策略                   | 适用场景                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `after_receive_record` | 在解析并记录入站事件后即可向平台确认。                                                     |
| `after_agent_dispatch` | 平台应等待，直到 agent 分发已被接受。                                                      |
| `after_durable_send`   | 平台应等待，直到最终交付做出持久化决定。                                                    |
| `manual`               | 因平台语义不适合通用阶段，插件自行负责确认。                                               |

在需要延后 ack 状态的接收器中使用 `createMessageReceiveContext(...)`，当接收器需要测试某个阶段是否满足已配置策略时使用 `shouldAckMessageAfterStage(...)`。

## 合同测试

能力声明是插件合同的一部分。请用测试覆盖它们：

```typescript
import {
  verifyChannelMessageAdapterCapabilityProofs,
  verifyChannelMessageLiveCapabilityAdapterProofs,
  verifyChannelMessageLiveFinalizerProofs,
  verifyChannelMessageReceiveAckPolicyAdapterProofs,
} from "openclaw/plugin-sdk/channel-message";

it("支持已声明的消息能力", async () => {
  await expect(
    verifyChannelMessageAdapterCapabilityProofs({
      adapterName: "demo",
      adapter: demoMessageAdapter,
      proofs: {
        text: async () => {
          const result = await demoMessageAdapter.send!.text!(textCtx);
          expect(result.receipt.platformMessageIds).toContain("msg-1");
        },
        replyTo: async () => {
          await demoMessageAdapter.send!.text!({ ...textCtx, replyToId: "parent-1" });
          expect(sendDemoMessage).toHaveBeenCalledWith(
            expect.objectContaining({
              replyToId: "parent-1",
            }),
          );
        },
        messageSendingHooks: () => {
          expect(demoMessageAdapter.durableFinal!.capabilities!.messageSendingHooks).toBe(true);
        },
      },
    }),
  ).resolves.toContainEqual({ capability: "text", status: "verified" });
});
```

当适配器声明了这些特性时，也要添加实时和接收证明测试套件。缺少证明应当导致测试失败，而不是悄悄扩大 durable surface。

## 已弃用的兼容 API

这些 API 仍可导入以兼容第三方。请勿将其用于新的渠道代码。

| 已弃用 API                                  | 替代方案                                                                                                         |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `openclaw/plugin-sdk/channel-reply-pipeline` | `openclaw/plugin-sdk/channel-message`                                                                               |
| `createChannelTurnReplyPipeline(...)`        | 兼容分发器使用 `createChannelMessageReplyPipeline(...)`，或新渠道代码使用 `message` 适配器 |
| `deliverDurableInboundReplyPayload(...)`     | 来自 `openclaw/plugin-sdk/channel-message-runtime` 的 `deliverInboundReplyWithMessageSendContext(...)`                 |
| `dispatchInboundReplyWithBase(...)`          | 仅供兼容分发器使用 `dispatchChannelMessageReplyWithBase(...)`                                       |
| `recordInboundSessionAndDispatchReply(...)`  | 仅供兼容分发器使用 `recordChannelMessageReplyDispatch(...)`                                         |
| `resolveChannelSourceReplyDeliveryMode(...)` | `resolveChannelMessageSourceReplyDeliveryMode(...)`                                                                 |
| `deliverFinalizableDraftPreview(...)`        | `defineFinalizableLivePreviewAdapter(...)` 加上 `deliverWithFinalizableLivePreviewAdapter(...)`                     |
| `DraftPreviewFinalizerDraft`                 | `LivePreviewFinalizerDraft`                                                                                         |
| `DraftPreviewFinalizerResult`                | `LivePreviewFinalizerResult`                                                                                        |

兼容分发器仍可通过消息外观层使用 `createReplyPrefixContext(...)`、
`createReplyPrefixOptions(...)` 和 `createTypingCallbacks(...)`。新的生命周期代码应避免旧的
`channel-reply-pipeline` 子路径。

## 迁移清单

1. 在渠道插件中添加 `message: defineChannelMessageAdapter(...)` 或
   `message: createChannelMessageAdapterFromOutbound(...)`。
2. 从文本、媒体和 payload 发送中返回 `MessageReceipt`。
3. 只声明由原生行为和测试支持的能力。
4. 用 `deriveDurableFinalDeliveryRequirements(...)` 替换手写的 durable 需求映射。
5. 当渠道会就地编辑草稿消息时，通过实时预览辅助函数来处理预览终结。
6. 仅当接收器确实可以延迟平台确认时，才声明接收 ack 策略。
7. 仅在兼容性边缘保留旧的回复分发辅助函数。
