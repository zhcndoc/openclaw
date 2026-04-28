---
summary: "插件钩子：拦截 agent、工具、消息、会话和 Gateway 生命周期事件"
title: "插件钩子"
read_when:
  - 你正在构建一个需要 before_tool_call、before_agent_reply、消息钩子或生命周期钩子的插件
  - 你需要阻止、重写或要求对插件发起的工具调用进行批准
  - 你正在在内部钩子和插件钩子之间做选择
---

插件钩子是 OpenClaw 插件的进程内扩展点。当插件需要检查或修改 agent 运行、工具调用、消息流、会话生命周期、子 agent 路由、安装或 Gateway 启动时，请使用它们。

当你想要一个由操作员安装的、用于命令和 Gateway 事件的简短 `HOOK.md` 脚本，例如 `/new`、`/reset`、`/stop`、`agent:bootstrap` 或 `gateway:startup` 时，请改用 [内部钩子](/automation/hooks)。

## 快速开始

使用插件入口中的 `api.on(...)` 注册类型化插件钩子：

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

钩子处理器按 `priority` 降序顺序依次运行。相同优先级的钩子会保持注册顺序。

每个钩子都会接收 `event.context.pluginConfig`，也就是为注册该处理器的插件解析后的配置。请将其用于需要当前插件选项的钩子决策；OpenClaw 会按处理器注入它，而不会修改其他插件看到的共享事件对象。

## 钩子目录

钩子按其扩展的作用域分组。**粗体**中的名称接受决策结果（阻止、取消、覆盖或要求批准）；其他全部为仅观察。

**Agent 回合**

- `before_model_resolve` — 在会话消息加载之前覆盖提供方或模型
- `before_prompt_build` — 在模型调用之前添加动态上下文或系统提示文本
- `before_agent_start` — 仅用于兼容的组合阶段；优先使用上面的两个钩子
- **`before_agent_reply`** — 通过合成回复或静默来短路模型回合
- `agent_end` — 观察最终消息、成功状态和运行时长

**对话观察**

- `llm_input` — 观察提供方输入（系统提示、提示词、历史记录）
- `llm_output` — 观察提供方输出

**工具**

- **`before_tool_call`** — 重写工具参数、阻止执行或要求批准
- `after_tool_call` — 观察工具结果、错误和持续时间
- **`tool_result_persist`** — 重写由工具结果生成的助手消息
- **`before_message_write`** — 检查或阻止正在进行的消息写入（少见）

**消息与投递**

- **`inbound_claim`** — 在 agent 路由之前认领传入消息（合成回复）
- `message_received` — 观察传入内容、发送者、线程和元数据
- **`message_sending`** — 重写发出的内容或取消投递
- `message_sent` — 观察发出投递的成功或失败
- **`before_dispatch`** — 在通道移交之前检查或重写发出的调度
- **`reply_dispatch`** — 参与最终的回复投递管道

**会话与压缩**

- `session_start` / `session_end` — 跟踪会话生命周期边界
- `before_compaction` / `after_compaction` — 观察或注释压缩周期
- `before_reset` — 观察会话重置事件（`/reset`、程序化重置）

**子 agent**

- `subagent_spawning` / `subagent_delivery_target` / `subagent_spawned` / `subagent_ended` — 协调子 agent 路由和完成投递

**生命周期**

- `gateway_start` / `gateway_stop` — 随 Gateway 启动或停止插件拥有的服务
- **`before_install`** — 检查技能或插件安装扫描，并可选择阻止

## 工具调用策略

`before_tool_call` 接收：

- `event.toolName`
- `event.params`
- 可选的 `event.runId`
- 可选的 `event.toolCallId`
- 以及诸如 `ctx.agentId`、`ctx.sessionKey`、`ctx.sessionId` 和诊断信息 `ctx.trace` 等上下文字段

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

- `block: true` 是终态，并会跳过更低优先级的处理器。
- `block: false` 会被视为没有决策。
- `params` 会重写用于执行的工具参数。
- `requireApproval` 会暂停 agent 运行，并通过插件审批请求用户。`/approve` 命令可以批准 exec 和插件审批。
- 低优先级的 `block: true` 仍然可以在高优先级钩子请求批准后阻止执行。
- `onResolution` 会接收已解析的批准决策——`allow-once`、`allow-always`、`deny`、`timeout` 或 `cancelled`。

## 提示词和模型钩子

新插件请使用按阶段划分的钩子：

- `before_model_resolve`：仅接收当前提示词和附件元数据。返回 `providerOverride` 或 `modelOverride`。
- `before_prompt_build`：接收当前提示词和会话消息。返回 `prependContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。

`before_agent_start` 仍保留用于兼容。请优先使用上面的显式钩子，这样你的插件就不会依赖旧的组合阶段。

当 OpenClaw 能够识别活动运行时，`before_agent_start` 和 `agent_end` 会包含 `event.runId`。相同的值也可在 `ctx.runId` 上获取。

需要 `llm_input`、`llm_output` 或 `agent_end` 的未打包插件必须设置：

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

可以通过 `plugins.entries.<id>.hooks.allowPromptInjection=false` 为每个插件禁用提示词修改类钩子。

## 消息钩子

使用消息钩子进行通道级路由和投递策略控制：

- `message_received`：观察传入内容、发送者、`threadId`、`messageId`、`senderId`、可选的运行/会话关联以及元数据。
- `message_sending`：重写 `content` 或返回 `{ cancel: true }`。
- `message_sent`：观察最终成功或失败。

当可用时，消息钩子上下文会暴露稳定的关联字段：`ctx.sessionKey`、`ctx.runId`、`ctx.messageId`、`ctx.senderId`、`ctx.trace`、`ctx.traceId`、`ctx.spanId`、`ctx.parentSpanId` 和 `ctx.callDepth`。在读取旧版元数据之前，请优先使用这些一等字段。

在使用特定通道元数据之前，请优先使用类型化的 `threadId` 和 `replyToId` 字段。

决策规则：

- `message_sending` 中的 `cancel: true` 是终态。
- `message_sending` 中的 `cancel: false` 会被视为没有决策。
- 被重写的 `content` 会继续传递给更低优先级的钩子，除非后续钩子取消投递。

## 安装钩子

`before_install` 会在内置的技能和插件安装扫描之后运行。返回额外的发现结果或 `{ block: true, blockReason }` 以停止安装。

`block: true` 是终态。`block: false` 会被视为没有决策。

## Gateway 生命周期

为需要由 Gateway 拥有状态的插件服务使用 `gateway_start`。上下文会暴露 `ctx.config`、`ctx.workspaceDir` 以及用于 cron 检查和更新的 `ctx.getCron?.()`。使用 `gateway_stop` 清理长时间运行的资源。

不要依赖内部的 `gateway:startup` 钩子来实现插件拥有的运行时服务。

## 即将弃用的内容

有少数与钩子相关的接口已弃用，但仍受支持。请在下一个主要版本发布前迁移：

- **`inbound_claim` 和 `message_received` 处理器中的纯文本通道信封**。请读取 `BodyForAgent` 和结构化的用户上下文块，而不是解析扁平的信封文本。参见 [纯文本通道信封 → BodyForAgent](/plugins/sdk-migration#active-deprecations)。
- **`before_agent_start`** 仍保留用于兼容。新插件应使用 `before_model_resolve` 和 `before_prompt_build`，而不是这个组合阶段。
- **`before_tool_call` 中的 `onResolution`** 现在使用类型化的 `PluginApprovalResolution` 联合类型（`allow-once` / `allow-always` / `deny` / `timeout` / `cancelled`），而不是自由形式的 `string`。

完整列表——内存能力注册、提供方思考配置文件、外部认证提供方、提供方发现类型、任务运行时访问器，以及 `command-auth` → `command-status` 重命名——请参见 [插件 SDK 迁移 → 当前弃用项](/plugins/sdk-migration#active-deprecations)。

## 相关内容

- [插件 SDK 迁移](/plugins/sdk-migration) — 当前弃用项和移除时间线
- [构建插件](/plugins/building-plugins)
- [插件 SDK 概览](/plugins/sdk-overview)
- [插件入口点](/plugins/sdk-entrypoints)
- [内部钩子](/automation/hooks)
- [插件架构内部](/plugins/architecture-internals)
