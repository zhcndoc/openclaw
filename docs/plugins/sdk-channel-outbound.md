---
summary: "用于频道插件的出站消息生命周期 API：适配器、回执、持久化发送、实时预览和回复流水线辅助工具"
title: "频道出站 API"
read_when:
  - 你正在构建或重构消息频道插件的发送路径
  - 你需要持久化的最终回复投递、回执、实时预览收尾或接收确认策略
  - 你正在从 `channel-message`、`channel-message-runtime` 或旧的回复分发辅助工具迁移
---

频道插件通过
`openclaw/plugin-sdk/channel-outbound` 暴露出站消息行为。使用
`openclaw/plugin-sdk/channel-inbound` 进行接收/上下文/分发
编排。

核心负责队列、持久化、通用重试策略、钩子、回执，以及
共享的 `message` 工具。插件负责原生发送/编辑/删除调用、
目标规范化、平台线程、已选引用、通知
标志、账户状态，以及平台特定副作用。

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

## 现有的出站适配器

如果该 channel 已经有一个兼容的 `outbound` 适配器，则应从中派生
message 适配器，而不是重复编写发送代码：

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

| Outcome          | Meaning                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `sent`           | 至少投递了一条可见的平台消息                                      |
| `suppressed`     | 没有平台消息应被视为缺失                                         |
| `partial_failed` | 在后续有效载荷或副作用失败之前，至少已投递了一条平台消息 |
| `failed`         | 未生成任何平台回执                                                         |

当一个批次混合了已发送、已抑制和失败的
有效载荷时，请使用 `payloadOutcomes`。不要根据空的旧版
直接投递结果推断 hook 被取消。

## 兼容性调度

通过 `channel-inbound` 中的 `dispatchChannelInboundReply(...)` 组装入站回复调度。将平台投递保留在投递适配器中；对消息适配器、持久化发送、回执、实时预览以及回复管道选项，使用 `channel-outbound`。
