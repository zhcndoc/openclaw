---
summary: "面向频道插件的入站事件辅助：上下文构建、共享运行器编排、会话记录，以及已准备回复的派发"
title: "频道入站 API"
read_when:
  - 你正在构建或重构消息频道插件的接收路径
  - 你需要共享的入站上下文构建、会话记录或已准备回复派发
  - 你正在将旧的 channel turn 辅助迁移到 inbound/message API
---

频道插件应使用 inbound 和 message 这些名词来建模接收路径：

```text
platform event -> inbound facts/context -> agent reply -> message delivery
```

将 `openclaw/plugin-sdk/channel-inbound` 用于入站事件规范化、
格式化、根对象和编排。将
`openclaw/plugin-sdk/channel-outbound` 用于原生
发送、回执、持久化投递和实时预览行为。

## 核心辅助函数

```ts
import {
  buildChannelInboundEventContext,
  runChannelInboundEvent,
  dispatchChannelInboundReply,
} from "openclaw/plugin-sdk/channel-inbound";
```

- `buildChannelInboundEventContext(...)`：将规范化后的频道事实投射到
  提示词/会话上下文中。使用 `channelContext` 将频道拥有的
  发送者/聊天元数据传递给插件钩子 `ctx.channelContext`；从此
  子路径扩展 `PluginHookChannelSenderContext` 或 `PluginHookChannelChatContext`
  以支持频道特定字段。
- `runChannelInboundEvent(...)`：对单个入站平台事件执行摄取、
  分类、预检、解析、记录、派发和收尾。
- `dispatchChannelInboundReply(...)`：使用投递适配器记录并派发一个已组装好的
  入站回复。

注入的插件运行时会在 `runtime.channel.inbound.*` 下暴露相同的高层辅助函数，
供已经接收运行时对象的打包/原生频道使用。

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

兼容性派发器应组装 `dispatchChannelInboundReply(...)`
输入，并将平台投递保留在投递适配器中。新的发送路径应优先使用消息适配器和持久化消息辅助函数。

## 迁移

旧的 `runtime.channel.turn.*` 运行时别名已被移除。请改用：

- `runtime.channel.inbound.run(...)` 处理原始入站事件。
- `runtime.channel.inbound.dispatchReply(...)` 处理已组装好的回复上下文。
- `runtime.channel.inbound.buildContext(...)` 处理入站上下文载荷。
- `runtime.channel.inbound.runPreparedReply(...)` 仅用于频道自有的已准备
  派发路径，这些路径已经组装了自己的派发闭包。

新的插件代码不应引入 `turn` 命名的频道 API。请将 model 或 agent turn 词汇保留在 agent/provider 代码中；频道插件使用 inbound、message、delivery 和 reply 这些术语。
