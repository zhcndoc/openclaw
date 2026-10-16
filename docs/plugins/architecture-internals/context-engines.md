---
summary: "注册拥有会话摄取、组装和压缩的上下文引擎插件"
read_when:
  - "添加上下文引擎插件"
  - "您正在替换或扩展默认上下文管道"
  - "您需要将压缩委托回运行时"
title: "上下文引擎"
sidebarTitle: "上下文引擎"
---

插件如何通过 `contextEngine` 插槽接管会话上下文编排，以及它仍然必须委托什么。 [插件架构内部](/plugins/architecture-internals)指南的一部分。

## <a id="context-engine-plugins"></a> 上下文引擎插件

上下文引擎插件负责会话上下文的编排，包括摄取、组装和压缩。通过你的插件使用 `api.registerContextEngine(id, factory)` 注册它们，然后通过 `plugins.slots.contextEngine` 选择当前启用的引擎。

当你的插件需要替换或扩展默认的上下文流水线，而不仅仅是增加记忆搜索或钩子时，请使用此功能。

```ts
import { buildMemorySystemPromptAddition } from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("lossless-claw", (ctx) => ({
    info: {
      id: "lossless-claw",
      name: "Lossless Claw",
      ownsCompaction: true,
      acceptedHostParams: ["sessionKey"],
    },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages, sessionKey, availableTools, citationsMode }) {
      return {
        messages,
        estimatedTokens: 0,
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
          agentSessionKey: sessionKey,
        }),
      };
    },
    async compact() {
      return { ok: true, compacted: false };
    },
  }));
}
```

工厂函数 `ctx` 提供可选的 `config`、`agentDir` 和 `workspaceDir` 值，用于构造时初始化。

主机会在调用非旧版引擎的 `assemble()` 之前，完成已注册的异步记忆提示准备。`buildMemorySystemPromptAddition(...)` 保持同步，并在 `assemble()` 执行期间读取该不可变的运行快照。请原样传递所提供的工具和引用上下文，以确保快照不会跨越运行边界。

当活动harness具有持久后端线程时，`assemble()` 可能会返回 `contextProjection`。对于传统的每转投影，请忽略它。当组装的上下文应一次注入后端线程并重用直到纪元更改时，返回 `{ mode: "thread_bootstrap", epoch }`。在引擎的语义上下文更改后更改纪元，例如在引擎拥有的压缩传递之后。主机可以在线程引导投影中保留工具调用元数据、输入形状和工具结果，以便新的后端线程保持工具的连续性。工具结果文本未经过秘密屏蔽。

如果你的引擎**不**负责压缩算法，请保留 `compact()` 的实现，并显式委托它：

```ts
import {
  buildMemorySystemPromptAddition,
  delegateCompactionToRuntime,
} from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("my-memory-engine", (ctx) => ({
    info: {
      id: "my-memory-engine",
      name: "My Memory Engine",
      ownsCompaction: false,
    },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages, sessionKey, availableTools, citationsMode }) {
      return {
        messages,
        estimatedTokens: 0,
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
          agentSessionKey: sessionKey,
        }),
      };
    },
    async compact(params) {
      return await delegateCompactionToRuntime(params);
    },
  }));
}
```
