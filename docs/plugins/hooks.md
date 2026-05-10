---
summary: "插件钩子：拦截 agent、tool、message、session 以及 Gateway 生命周期事件"
title: "插件钩子"
read_when:
  - 你正在构建一个需要 before_tool_call、before_agent_reply、message 钩子或生命周期钩子的插件
  - 你需要从插件中阻止、重写或要求批准 tool 调用
  - 你正在内部钩子和插件钩子之间做选择
---

插件钩子是 OpenClaw 插件的进程内扩展点。当插件需要检查或修改 agent 运行、tool 调用、消息流、session 生命周期、subagent 路由、安装，或 Gateway 启动时使用它们。

当你想为命令和 Gateway 事件（例如 `/new`、`/reset`、`/stop`、`agent:bootstrap` 或 `gateway:startup`）使用一个由操作员安装的小型 `HOOK.md` 脚本时，请改用[内部钩子](/automation/hooks)。

## 快速开始

在插件入口中使用 `api.on(...)` 注册带类型的插件钩子：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "tool-preflight",
  name: "Tool Preflight",
  register(api) {
    api.on(
      "before_tool_call",
      async (event) => {
        if (event.toolName !== "web_search") {
          return;
        }

        return {
          requireApproval: {
            title: "运行网页搜索",
            description: `允许搜索查询：${String(event.params.query ?? "")}`,
            severity: "info",
            timeoutMs: 60_000,
            timeoutBehavior: "deny",
          },
        };
      },
      { priority: 50 },
    );
  },
});
```

钩子处理器按 `priority` 降序依次运行。相同优先级的钩子会保留注册顺序。

`api.on(name, handler, opts?)` 接受：

- `priority` - 处理器排序（越高越先运行）。
- `timeoutMs` - 可选的单钩子预算。设置后，钩子运行器会在预算耗尽后中止该处理器，并继续下一个，而不是让缓慢的初始化或回忆工作消耗调用方配置的模型超时。省略它可使用钩子运行器通用应用的默认观察/决策超时。

操作员也可以在不修改插件代码的情况下设置钩子预算：

```json
{
  "plugins": {
    "entries": {
      "my-plugin": {
        "hooks": {
          "timeoutMs": 30000,
          "timeouts": {
            "before_prompt_build": 90000,
            "agent_end": 60000
          }
        }
      }
    }
  }
}
```

`hooks.timeouts.<hookName>` 会覆盖 `hooks.timeoutMs`，而 `hooks.timeoutMs` 会覆盖插件作者在 `api.on(..., { timeoutMs })` 中设置的值。每个已配置的值必须是大于 0 且不超过 600000 毫秒的正整数。对于已知较慢的钩子，优先使用按钩子覆盖，这样单个插件不会在所有地方都获得更长的预算。

每个钩子都会接收 `event.context.pluginConfig`，即注册该处理器的插件解析后的配置。将其用于需要当前插件选项的钩子决策；OpenClaw 会为每个处理器单独注入它，而不会修改其他插件看到的共享事件对象。

## 钩子目录

钩子按其扩展的表面分组。**加粗**名称接受决策结果（阻止、取消、覆盖或要求批准）；其余均仅用于观察。

**Agent 回合**

- `before_model_resolve` - 在会话消息加载前覆盖提供方或模型
- `agent_turn_prepare` - 消耗已排队的插件回合注入，并在提示词钩子之前添加同回合上下文
- `before_prompt_build` - 在模型调用前添加动态上下文或系统提示词文本
- `before_agent_start` - 仅为兼容保留的组合阶段；优先使用上面的两个钩子
- **`before_agent_run`** - 在模型提交前检查最终提示词和会话消息，并可选择阻止运行
- **`before_agent_reply`** - 用合成回复或静默短路模型回合
- **`before_agent_finalize`** - 检查自然生成的最终答案并请求再进行一次模型传递
- `agent_end` - 观察最终消息、成功状态和运行时长
- `heartbeat_prompt_contribution` - 为后台监视器和生命周期插件添加仅用于 heartbeat 的上下文

**对话观察**

- `model_call_started` / `model_call_ended` - 观察已脱敏的提供方/模型调用元数据、计时、结果，以及带边界限制的请求 ID 哈希，不包含提示词或响应内容
- `llm_input` - 观察提供方输入（系统提示词、提示词、历史记录）
- `llm_output` - 观察提供方输出

**工具**

- **`before_tool_call`** - 重写工具参数、阻止执行或要求批准
- `after_tool_call` - 观察工具结果、错误和持续时间
- **`tool_result_persist`** - 重写由工具结果生成的 assistant 消息
- **`before_message_write`** - 检查或阻止正在进行的消息写入（较少见）

**消息与传递**

- **`inbound_claim`** - 在 agent 路由前认领传入消息（合成回复）
- `message_received` - 观察传入内容、发送者、线程和元数据
- **`message_sending`** - 重写传出内容或取消投递
- `message_sent` - 观察传出投递成功或失败
- **`before_dispatch`** - 在通道交接前检查或重写传出分发
- **`reply_dispatch`** - 参与最终回复分发流水线

**Sessions 与压缩**

- `session_start` / `session_end` - 跟踪 session 生命周期边界
- `before_compaction` / `after_compaction` - 观察或标注压缩周期
- `before_reset` - 观察 session 重置事件（`/reset`、程序化重置）

**Subagent**

- `subagent_spawning` / `subagent_delivery_target` / `subagent_spawned` / `subagent_ended` - 协调 subagent 路由和完成投递

**生命周期**

- `gateway_start` / `gateway_stop` - 随 Gateway 启动或停止插件拥有的服务
- `cron_changed` - 观察 Gateway 拥有的 cron 生命周期变更（添加、更新、移除、启动、完成、已调度）
- **`before_install`** - 检查 skill 或插件安装扫描并可选择阻止

## Tool 调用策略

`before_tool_call` 接收：

- `event.toolName`
- `event.params`
- 可选的 `event.derivedPaths`，其中包含尽力而为的、基于主机推导的目标路径提示，适用于诸如 `apply_patch` 之类的已知工具封装；如果存在，这些路径可能不完整，或者可能比工具实际会触及的范围更宽泛（例如，输入格式错误或不完整时）
- 可选的 `event.runId`
- 可选的 `event.toolCallId`
- `ctx.agentId`、`ctx.sessionKey`、`ctx.sessionId`、`ctx.runId`、`ctx.jobId`（在 cron 驱动的运行中设置）以及诊断信息 `ctx.trace` 等上下文字段

它可以返回：

```typescript
type BeforeToolCallResult = {
  params?: Record<string, unknown>;
  block?: boolean;
  blockReason?: string;
  requireApproval?: {
    title: string;
    description: string;
    severity?: "info" | "warning" | "critical";
    timeoutMs?: number;
    timeoutBehavior?: "allow" | "deny";
    pluginId?: string;
    onResolution?: (
      decision: "allow-once" | "allow-always" | "deny" | "timeout" | "cancelled",
    ) => Promise<void> | void;
  };
};
```

规则：

- `block: true` 是终止性的，会跳过低优先级处理器。
- `block: false` 视为没有决策。
- `params` 会为执行重写工具参数。
- `requireApproval` 会暂停 agent 运行，并通过插件批准向用户请求。
  `/approve` 命令可以批准 exec 和插件批准。
- 较低优先级的 `block: true` 仍然可以在较高优先级钩子请求批准后阻止执行。
- `onResolution` 接收已解析的批准决策 - `allow-once`、
  `allow-always`、`deny`、`timeout` 或 `cancelled`。

需要主机级策略的捆绑插件可以用 `api.registerTrustedToolPolicy(...)` 注册受信任的 tool 策略。这些会在普通 `before_tool_call` 钩子和外部插件决策之前运行。仅将其用于主机信任的门禁，例如工作区策略、预算执行或保留工作流安全。外部插件应使用常规的 `before_tool_call` 钩子。

### Tool 结果持久化

Tool 结果可以包含用于 UI 渲染、诊断、媒体路由或插件自有元数据的结构化 `details`。请将 `details` 视为运行时元数据，而不是提示词内容：

- OpenClaw 会在 provider 回放和压缩输入之前去除 `toolResult.details`，因此元数据不会变成模型上下文。
- 持久化的 session 条目只保留有边界限制的 `details`。过大的 details 会被替换为紧凑摘要，并标记 `persistedDetailsTruncated: true`。
- `tool_result_persist` 和 `before_message_write` 会在最终持久化上限之前运行。钩子仍应保持返回的 `details` 足够小，并避免只把与提示词相关的文本放在 `details` 中；应把模型可见的 tool 输出放在 `content` 中。

## 提示词与模型钩子

新插件应使用按阶段划分的钩子：

- `before_model_resolve`：只接收当前提示词和附件元数据。返回 `providerOverride` 或 `modelOverride`。
- `agent_turn_prepare`：接收当前提示词、已准备好的 session 消息，以及为该 session 取出的任何一次性排队注入。返回 `prependContext` 或 `appendContext`。
- `before_prompt_build`：接收当前提示词和 session 消息。返回 `prependContext`、`appendContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。
- `heartbeat_prompt_contribution`：仅在 heartbeat 回合运行，返回 `prependContext` 或 `appendContext`。它面向需要总结当前状态但不改变用户发起回合的后台监视器。

`before_agent_start` 仍保留用于兼容。建议优先使用上面的显式钩子，这样插件就不会依赖旧的组合阶段。

`before_agent_run` 在提示词构建完成后、任何模型输入之前运行，包括提示词本地图片加载和 `llm_input` 观察。它接收当前用户输入作为 `prompt`，以及已加载的会话历史 `messages` 和活动系统提示词。返回 `{ outcome: "block", reason, message? }` 可在模型读取提示词之前停止运行。`reason` 是内部原因；`message` 是面向用户的替代文本。唯一支持的结果是 `pass` 和 `block`；不支持的决策形状会默认关闭失败。

当运行被阻止时，OpenClaw 只会在 `message.content` 中存储替代文本，以及诸如阻止插件 id 和时间戳之类的非敏感阻止元数据。原始用户文本不会保留在转录或未来上下文中。内部阻止原因被视为敏感信息，并会从转录、历史、广播、日志和诊断载荷中排除。可观测性应使用经过脱敏的字段，例如阻止者 id、结果、时间戳或安全类别。

当 OpenClaw 能识别活动运行时，`before_agent_start` 和 `agent_end` 会包含 `event.runId`。同样的值也可在 `ctx.runId` 中获得。由 cron 驱动的运行还会暴露 `ctx.jobId`（来源 cron 作业 id），以便插件钩子可以将指标、副作用或状态限定到特定的计划作业。

对于源自通道的运行，`ctx.messageProvider` 是诸如 `discord` 或 `telegram` 的提供方表面，而 `ctx.channelId` 是当 OpenClaw 能从 session key 或投递元数据推导出时的会话目标标识符。

`agent_end` 是一个观察型钩子，并在回合结束后以 fire-and-forget 方式运行。钩子运行器会应用 30 秒超时，因此卡住的插件或嵌入端点不会让钩子 promise 永远挂起。超时会被记录，OpenClaw 会继续执行；除非插件也使用自己的 abort signal，否则它不会取消插件拥有的网络工作。

使用 `model_call_started` 和 `model_call_ended` 来获取不应接收原始提示词、历史记录、响应、标头、请求体或 provider 请求 ID 的提供方调用遥测。这些钩子包含稳定元数据，例如 `runId`、`callId`、`provider`、`model`、可选的 `api`/`transport`、终态 `durationMs`/`outcome`，以及当 OpenClaw 能推导出受限的 provider 请求 ID 哈希时的 `upstreamRequestIdHash`。

`before_agent_finalize` 只在 harness 即将接受自然生成的最终 assistant 答案时运行。它不是 `/stop` 取消路径，也不会在用户中止回合时运行。返回 `{ action: "revise", reason }` 可请求 harness 在最终定稿前再进行一次模型传递，返回 `{ action: "finalize", reason? }` 可强制定稿，或省略结果以继续。Codex 原生的 `Stop` 钩子会作为 OpenClaw 的 `before_agent_finalize` 决策转发到这里。

当返回 `action: "revise"` 时，插件可以包含 `retry` 元数据，以使额外的模型传递具有边界并且可安全回放：

```typescript
type BeforeAgentFinalizeRetry = {
  instruction: string;
  idempotencyKey?: string;
  maxAttempts?: number;
};
```

`instruction` 会附加到发送给 harness 的修订原因中。
`idempotencyKey` 允许宿主在等价的 finalize 决策之间统计同一插件请求的重试次数，而 `maxAttempts` 则限制宿主在继续采用自然最终答案之前允许的额外传递次数。

非捆绑插件若需要原始对话钩子（`before_model_resolve`、
`before_agent_reply`、`llm_input`、`llm_output`、`before_agent_finalize`、
`agent_end` 或 `before_agent_run`），必须设置：

```json
{
  "plugins": {
    "entries": {
      "my-plugin": {
        "hooks": {
          "allowConversationAccess": true
        }
      }
    }
  }
}
```

可通过 `plugins.entries.<id>.hooks.allowPromptInjection=false` 为每个插件禁用提示词修改钩子和持久化的下一回合注入。

### Session 扩展与下一回合注入

工作流插件可以通过 `api.registerSessionExtension(...)` 持久化小型、兼容 JSON 的 session 状态，并通过 Gateway 的 `sessions.pluginPatch` 方法更新它。Session 行会通过 `pluginExtensions` 映射已注册的扩展状态，让 Control UI 和其他客户端在不了解插件内部实现的情况下也能渲染插件自有状态。

当插件需要让持久化上下文只精确一次到达下一次模型回合时，请使用 `api.enqueueNextTurnInjection(...)`。OpenClaw 会在 prompt 钩子之前清空排队的注入，丢弃已过期的注入，并按插件的 `idempotencyKey` 去重。这是用于批准恢复、策略摘要、后台监视器增量，以及命令续接的正确切入点；这些内容应在下一回合对模型可见，但不应成为永久性的系统提示词文本。

清理语义是契约的一部分。Session 扩展清理和运行时生命周期清理回调会接收 `reset`、`delete`、`disable` 或 `restart`。对于 reset/delete/disable，宿主会移除所属插件的持久化 session 扩展状态和待处理的下一回合注入；restart 会保留持久化 session 状态，而清理回调可让插件释放旧运行时代次的调度作业、运行上下文以及其他带外资源。

## 消息钩子

将消息钩子用于通道级路由和投递策略：

- `message_received`：观察入站内容、发送者、`threadId`、`messageId`、
  `senderId`、可选的运行/会话关联信息以及元数据。
- `message_sending`：重写 `content` 或返回 `{ cancel: true }`。
- `message_sent`：观察最终成功或失败。

对于仅音频的 TTS 回复，即使通道负载中没有可见文本/说明文字，
`content` 也可能包含隐藏的口语转写。重写该 `content` 只会更新钩子可见的转写；
它不会作为媒体说明文字渲染。

当可用时，消息钩子上下文会暴露稳定的关联字段：
`ctx.sessionKey`、`ctx.runId`、`ctx.messageId`、`ctx.senderId`、`ctx.trace`、
`ctx.traceId`、`ctx.spanId`、`ctx.parentSpanId` 和 `ctx.callDepth`。优先使用这些
一等字段，再读取旧版元数据。

优先使用类型化的 `threadId` 和 `replyToId` 字段，然后再使用特定于通道的元数据。

决策规则：

- `message_sending` 中的 `cancel: true` 是终止性的。
- `message_sending` 中的 `cancel: false` 视为没有决策。
- 重写后的 `content` 会继续传递给更低优先级的钩子，除非后续钩子取消投递。
- `message_sending` 可以在取消时返回 `cancelReason` 和有边界限制的 `metadata`。新的消息生命周期 API 会将其暴露为一个被抑制的投递结果，原因是 `cancelled_by_message_sending_hook`；旧版直接投递仍会为了兼容返回空结果数组。
- `message_sent` 仅用于观察。处理器失败会被记录，但不会改变投递结果。

## 安装钩子

`before_install` 在内置的技能和插件安装扫描之后运行。
返回额外的发现结果，或返回 `{ block: true, blockReason }` 以停止安装。

`block: true` 为终态。`block: false` 视为没有决策。

## 网关生命周期

为需要由 Gateway 托管状态的插件服务使用 `gateway_start`。上下文会暴露
`ctx.config`、`ctx.workspaceDir` 和用于 cron 检查与更新的 `ctx.getCron?.()`。
使用 `gateway_stop` 清理长时间运行的资源。

不要依赖内部的 `gateway:startup` 钩子来实现插件拥有的运行时服务。

`cron_changed` 会在 Gateway 托管的 cron 生命周期事件中触发，带有一个类型化的
事件载荷，覆盖 `added`、`updated`、`removed`、`started`、`finished` 和 `scheduled`
原因。该事件携带 `PluginHookGatewayCronJob` 快照（在存在时包括
`state.nextRunAtMs`、`state.lastRunStatus` 和 `state.lastError`），以及一个
`PluginHookGatewayCronDeliveryStatus`，其值为 `not-requested` | `delivered` |
`not-delivered` | `unknown`。被移除的事件仍然会携带已删除作业的快照，以便外部调度器
能够协调状态。与外部唤醒调度器同步时，使用运行时上下文中的 `ctx.getCron?.()`
和 `ctx.config`，并将 OpenClaw 作为到期检查和执行的事实来源。

## 即将弃用

有少数与钩子相邻的接口已弃用，但仍受支持。请在下一次重大版本发布前迁移：

- **`inbound_claim` 和 `message_received` 处理器中的纯文本通道封装**。请读取
  `BodyForAgent` 和结构化的用户上下文块，而不要解析扁平的封装文本。参见
  [纯文本通道封装 → BodyForAgent](/plugins/sdk-migration#active-deprecations)。
- **`before_agent_start`** 仍保留以兼容旧版。新插件应使用 `before_model_resolve`
  和 `before_prompt_build`，而不是这个合并阶段。
- **`before_tool_call` 中的 `onResolution`** 现在使用类型化的
  `PluginApprovalResolution` 联合类型（`allow-once` / `allow-always` / `deny` /
  `timeout` / `cancelled`），而不是自由形式的 `string`。

For the full list - memory capability registration, provider thinking
profile, external auth providers, provider discovery types, task runtime
accessors, and the `command-auth` → `command-status` rename - see
[Plugin SDK migration → Active deprecations](/plugins/sdk-migration#active-deprecations)。

## 相关内容

- [Plugin SDK migration](/plugins/sdk-migration) - active deprecations and removal timeline
- [Building plugins](/plugins/building-plugins)
- [Plugin SDK overview](/plugins/sdk-overview)
- [Plugin entry points](/plugins/sdk-entrypoints)
- [Internal hooks](/automation/hooks)
- [Plugin architecture internals](/plugins/architecture-internals)
