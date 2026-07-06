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

已经接收到注入式插件运行时对象的打包/原生频道，可以直接通过
`runtime.channel.inbound.*` 调用相同的辅助函数，而不是
直接导入此子路径：

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

## 迁移

`runtime.channel.turn.*` runtime 别名已移除。请改用：

- `runtime.channel.inbound.run(...)` 用于原始入站事件。
- `runtime.channel.inbound.dispatchReply(...)` 用于组装后的回复上下文。
- `runtime.channel.inbound.buildContext(...)` 用于入站上下文载荷。
- `runtime.channel.inbound.runPreparedReply(...)`，已弃用，仅用于
  频道自有的已准备分发路径，这些路径已经会自行组装
  分发闭包。

新的插件代码不应引入 `turn` 命名的频道 API。请将 model 或 agent turn 词汇保留在 agent/provider 代码中；频道插件使用 inbound、message、delivery 和 reply 这些术语。
