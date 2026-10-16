---
summary: "类型化的生命周期钩子和每个钩子应用的决策规则"
title: "插件 SDK 事件和钩子语义"
sidebarTitle: "事件和钩子语义"
read_when:
  - "您正在从插件订阅类型化生命周期挂钩"
  - "您需要知道钩子结果是否是终端"
  - "您正在将 Gateway cron 状态投影到外部调度程序中"
---

类型化生命周期钩子注册器和决策语义核心适用于每个钩子结果。 [插件SDK概述](/plugins/sdk-overview)的一部分。

## <a id="events-and-lifecycle"></a> 事件和生命周期

| 方法                                       | 它的作用                  |
| -------------------------------------------- | ----------------------------- |
| `api.on(hookName, handler, opts?)`           | 类型化生命周期钩子          |
| `api.onConversationBindingResolved(handler)` | 会话绑定回调 |

示例、常见钩子名称和守卫语义请参见 [插件钩子](/plugins/hooks)。

## <a id="hook-decision-semantics"></a> Hook 决策语义

`before_model_resolve` 可以与 `providerOverride` 和 `modelOverride` 一起返回 `fallbacksOverride: string[]`。显式列表取代了运行的后备链； `[]` 禁用模型回退。每个字段的第一个定义值按优先级降序排列获胜，注册顺序打破平局。请参见 [ 本地模型路由](/plugins/hooks/prompt-and-session#restrict-a-run-to-local-models)。

`before_install` 是插件运行时生命周期挂钩，而不是操作员安装策略表面。当 allow/warn/block 决策必须涵盖 CLI 和网关支持的安装或更新路径时，请使用 `security.installPolicy`。

- `before_tool_call`: 返回 `{ block: true }` 是终结性的。一旦任何处理器设置了它，低优先级处理器就会被跳过。
- `before_tool_call`: 返回 `{ block: false }` 会被视为没有决策（与省略 `block` 相同），而不是覆盖。
- `before_install`: 返回 `{ block: true }` 是终结性的。一旦任何处理器设置了它，低优先级处理器就会被跳过。
- `before_install`: 返回 `{ block: false }` 会被视为没有决策（与省略 `block` 相同），而不是覆盖。
- `reply_dispatch`: 返回 `{ handled: true, ... }` 是终结性的。一旦任何处理器声明接管分发，低优先级处理器和默认模型分发路径都会被跳过。
- `message_sending`: 返回 `{ cancel: true }` 是终结性的。一旦任何处理器设置了它，低优先级处理器就会被跳过。
- `message_sending`: 返回 `{ cancel: false }` 会被视为没有决策（与省略 `cancel` 相同），而不是覆盖。
- `message_received`：当您需要入站 thread/topic 路由时，使用类型化的 `threadId` 字段。保留 `metadata` 以获取特定于频道的附加功能。
- `message_sending`：在回退到特定于通道的 `metadata` 之前，使用类型化的 `replyToId` / `threadId` 路由字段。
- `gateway_start`: 请使用 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()` 来获取 Gateway 拥有的启动状态，而不是依赖内部的 `gateway:startup` 钩子。此时 Cron 可能仍在加载中。
- `cron_reconciled`: 在启动或调度器重新加载后，重建完整的外部 cron 投影。它包含 `reason` 和有效的 `enabled` 状态，包括 `enabled: false`，而 `ctx.getCron?.()` 返回的是精确对齐后的调度器。将 `ctx.abortSignal` 传入持久化投影工作；当该调度器快照被替换或 Gateway 关闭时，它会中止。
- `cron_changed`: 观察 Gateway 拥有的 cron 生命周期变化。`scheduled` 和 `removed` 事件是提交后的对账提示，而不是有序的增量日志。scheduled 事件的 `event.nextRunAtMs` 在任务没有下次唤醒时会缺失；removed 事件仍然携带已删除任务的快照。

外部唤醒调度器应对 `cron_changed` 事件进行去抖或合并， 然后从 `cron_reconciled` 最后捕获的调度器中重新读取完整的持久视图。不要从 `cron_changed` 上下文中采用调度器：来自较旧调度器的分离提示可能会与后续重新加载重叠。

将 `cron_reconciled` 作为在 Gateway 启动或调度器替换时加载的持久状态的完整快照触发器。它不会在仅插件热重载时重新播放。观察处理器并行运行，且即发即忘的分发可能重叠，因此消费者不能依赖事件完成顺序。请将 OpenClaw 作为到期检查和执行的事实来源。

对于具有耐用更换、retry/backoff 和干净关闭功能的单飞行适配器，请参阅 [Safe 外部 cron 投影](/plugins/hooks/lifecycle#safe-external-cron-projection)。
