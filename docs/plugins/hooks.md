---
summary: "插件钩子：拦截 agent、tool、message、session 以及 Gateway 生命周期事件"
title: "插件钩子"
read_when:
  - 你正在构建一个需要 before_tool_call、before_agent_reply、message 钩子或生命周期钩子的插件
  - 你需要从插件中阻止、重写或要求审批 tool 调用
  - 你正在在内部钩子和插件钩子之间做选择
  - 你正在将 OpenClaw cron 唤醒投射到外部主机调度器
---

插件钩子是 OpenClaw 插件的进程内扩展点：可检查或
更改 agent 运行、tool 调用、消息流、session 生命周期、子 agent
路由、安装或 Gateway 启动。

对于一个由操作员安装的小型 `HOOK.md` 脚本，用于响应诸如 `/new`、
`/reset`、`/stop`、`agent:bootstrap` 或 `gateway:startup` 等命令和 Gateway 事件，
请改用 [内部钩子](/automation/hooks)。

## 快速开始

从插件入口使用 `api.on(...)` 注册类型化钩子：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "tool-preflight",
  name: "工具预检",
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
          },
        };
      },
      { priority: 50 },
    );
  },
});
```

可以返回决策或修改的处理器会按 `priority` 降序顺序依次运行；相同 `priority` 的处理器保持注册顺序。仅观察类处理器会并行运行，而“即发即弃”的观察分发可能与后续事件重叠。不要使用 priority 来安排观察副作用的顺序。

`api.on(name, handler, opts?)` 接受：

| Option      | Effect                                                                                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `priority`  | 顺序；数值越高越先运行。                                                                                                                                                                           |
| `timeoutMs` | 每个钩子的等待预算。到期后，OpenClaw 会停止等待该处理器并继续执行下一个。它不会取消该处理器或其副作用。省略则使用运行器的默认每钩子超时。 |

运维人员可以在不修改插件代码的情况下设置钩子预算：

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

`hooks.timeouts.<hookName>` 会覆盖 `hooks.timeoutMs`，后者又会覆盖插件作者通过 `api.on(..., { timeoutMs })` 指定的值。每个值都必须是一个不超过 600000 ms 的正整数。对于已知较慢的钩子，优先使用按钩子覆盖，这样某个插件不会在所有地方都获得更长的预算。

超时的处理器 promise 会继续运行，因为钩子回调不会收到取消信号。钩子分发在插件工作仍在进行时就可以释放其 Gateway admission。拥有长时间运行工作的插件必须提供自己的取消与关闭生命周期。

出站修改类钩子 `message_sending` 和 `reply_payload_sending` 默认每个处理器使用 15 秒。若某个处理器超时，OpenClaw 会记录插件错误并继续使用最新的 payload，以便序列化交付通道能够稳定下来。对于有意在交付前执行更慢工作的插件，请为每个钩子设置更大的预算。

使用 `createReplyDispatcher` 的通道插件同样可以通过 `beforeDeliverOptions: { timeoutMs }` 声明更大的正向每阶段预算，或者在通过 `dispatcher.appendBeforeDeliver(handler, { timeoutMs })` 追加工作时指定。若没有所有者声明的预算，这些回调会使用相同的 15 秒默认值，这样一个卡住的回调就不会占用序列化交付通道。

每个钩子都会接收 `event.context.pluginConfig`，也就是为注册该处理器的插件解析后的配置。OpenClaw 会按处理器逐个注入，而不会修改其他插件看到的共享事件对象。

## 钩子目录

Hooks 按其扩展的界面进行分组。**加粗**名称接受决策结果（阻止、取消、覆盖或要求批准）；其余仅用于观察。

**Agent 回合**

| Hook                            | Purpose                                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| `before_model_resolve`          | Override provider or model before session messages load                                  |
| `agent_turn_prepare`            | Consume queued plugin turn injections and add same-turn context before prompt hooks      |
| `before_prompt_build`           | Add dynamic context or system-prompt text before the model call                          |
| **`before_agent_run`**          | Inspect the final prompt and session messages before model submission; can block the run |
| **`before_agent_reply`**        | Short-circuit the model turn with a synthetic reply or silence                           |
| **`before_agent_finalize`**     | Inspect the natural final answer and request one more model pass                         |
| `agent_end`                     | Observe final messages, success state, and run duration                                  |
| `heartbeat_prompt_contribution` | Add heartbeat-only context for background monitor and lifecycle plugins                  |

**对话观察**

| Hook                                      | Purpose                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `model_call_started` / `model_call_ended` | 已清理的提供方/模型调用元数据：时间、结果、受限的请求 ID 哈希。不包含提示词或响应内容。 |
| `llm_input`                               | 提供方输入：系统提示词、提示词、历史记录                                                                     |
| `llm_output`                              | 提供方输出、用量，以及可用时解析得到的 `contextTokenBudget`                                       |

**工具**

| Hook                       | Purpose                                                   |
| -------------------------- | --------------------------------------------------------- |
| **`before_tool_call`**     | 重写工具参数、阻止执行或要求批准 |
| `after_tool_call`          | 观察工具结果、错误和持续时间                |
| `resolve_exec_env`         | 为 `exec` 提供插件拥有的环境变量   |
| **`tool_result_persist`**  | 重写由工具结果生成的助手消息 |
| **`before_message_write`** | 检查或阻止正在进行中的消息写入（少见）      |

**消息与传递**

| Hook                            | Purpose                                                           |
| ------------------------------- | ----------------------------------------------------------------- |
| **`inbound_claim`**             | 在代理路由前认领传入消息（合成回复） |
| **`channel_pairing_requested`** | 观察新创建的 DM 配对请求                         |
| `message_received`              | 观察传入内容、发送者、线程和元数据             |
| **`message_sending`**           | 重写外发内容或取消投递                       |
| **`reply_payload_sending`**     | 在投递前修改或取消规范化的回复负载        |
| `message_sent`                  | 观察外发投递成功或失败                      |
| **`before_dispatch`**           | 在通道交接前检查或重写外发分发    |
| **`reply_dispatch`**            | 参与最终的回复分发管线                  |

**Sessions 与压缩**

| Hook                                     | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `session_start` / `session_end`          | 跟踪会话生命周期边界。`reason` 取值为 `new`、`reset`、`idle`、`daily`、`compaction`、`deleted`、`shutdown`、`restart` 或 `unknown` 之一。`shutdown`/`restart` 会在 Gateway 关闭终结器中触发，当进程停止或在存在活跃会话时重启时，插件（内存、转录存储）可以完成幽灵行的收尾，而不是让它们在重启间保持未关闭状态。该终结器有上限，因此慢插件不会阻塞 SIGTERM/SIGINT。 |
| `before_compaction` / `after_compaction` | 观察或注释压缩周期                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `before_reset`                           | 观察会话重置事件（`/reset`、程序化重置）                                                                                                                                                                                                                                                                                                                                                                                                     |

For `sessions.create` calls with `parentSessionKey` and `emitCommandHooks: true`, a distinct child always receives `session_start`. Callers declare whether the parent also receives terminal `session_end` with `succeedsParent`: `true` means successor, `false` means parallel child. Omission preserves the legacy parent-rollover behavior. The `command:new` and `before_reset` hooks still describe the requested `/new` action in both cases.

**Subagents**

- `subagent_spawned` / `subagent_ended` - 观察子代理的启动和完成。
- `subagent_delivery_target` - 当没有核心会话绑定可投射路由时，用于完成投递的兼容性钩子。
- `subagent_spawning` - 已弃用的兼容性钩子。现在核心会在 `subagent_spawned` 触发前，通过通道会话绑定适配器为 `thread: true` 的子代理绑定做准备。
- `subagent_spawned` 在 OpenClaw 已在启动前解析出子会话原生模型时，会包含 `resolvedModel` 和 `resolvedProvider`。
- `subagent_ended` 包含 `targetSessionKey`（标识 - 与 `subagent_spawned.childSessionKey` 匹配）、`targetKind`（`"subagent"` 或 `"acp"`）、`reason`、可选的 `outcome`（`"ok"`、`"error"`、`"timeout"`、`"killed"`、`"reset"` 或 `"deleted"`）、可选的 `error`、`runId`、`endedAt`、`accountId` 和 `sendFarewell`。它**不**包含 `agentId` 或 `childSessionKey`；请使用 `targetSessionKey` 与匹配的 `subagent_spawned` 事件进行关联。

**生命周期**

| Hook                             | Purpose                                                                                              |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `gateway_start` / `gateway_stop` | 随 Gateway 启动或停止插件拥有的服务                                                 |
| `deactivate`                     | `gateway_stop` 的已弃用兼容别名；在新插件中使用 `gateway_stop`                 |
| `cron_reconciled`                | 在启动或重新加载后，根据完整的 Gateway cron 状态进行协调                            |
| `cron_changed`                   | 观察 Gateway 拥有的 cron 生命周期变更（添加、更新、移除、启动、完成、计划） |
| **`before_install`**             | 检查已加载插件运行时中的暂存技能或插件安装材料                         |

### Channel pairing requests

当插件需要在未配对的 DM 发送者创建待处理配对请求后通知操作员或写入审计记录时，使用 `channel_pairing_requested`。该钩子会在请求创建时派发；配对回复的通道投递不会因为缓慢或失败的钩子处理程序而延迟。

```typescript
api.on("channel_pairing_requested", async (event) => {
  await notifyOperator({
    text: `来自 ${event.senderId} 的新 ${event.channel} 配对请求：${event.code}`,
  });
});
```

该钩子仅用于观察。它不会批准、拒绝、抑制或重写配对回复。有效负载包含通道、可选的 `accountId`、按通道范围的 `senderId`、配对 `code` 以及通道元数据。请将配对代码视为实时一次性批准凭证，并仅将其交付给受信任的操作员接收端。请将 `metadata` 视为不受信任的、由发送者提供的身份文本。该钩子不包含传入消息正文或媒体。

## 调试运行时钩子

在代理轮次中使用 `before_model_resolve` 切换提供方或模型——它会在模型解析之前运行。`llm_output` 仅在一次模型尝试生成助手输出后运行。

要验证会话模型是否生效，请检查运行时注册信息，然后使用 `openclaw sessions` 或 Gateway 的 session/status 界面。要调试提供方载荷，请使用 `--raw-stream` 和 `--raw-stream-path <path>` 启动 Gateway，将原始模型流事件写入 jsonl 文件。

## 工具调用策略

`before_tool_call` 接收：

- `event.toolName`
- `event.params`
- optional `event.toolKind` and `event.toolInputKind`, host-authoritative
  discriminators for tools that intentionally share names; for example, outer
  code-mode `exec` calls use `toolKind: "code_mode_exec"` and include
  `toolInputKind: "javascript" | "typescript"` when the input language is
  known
- optional `event.derivedPaths`, best-effort host-derived target path hints
  for well-known tool envelopes such as `apply_patch`; these paths may be
  incomplete or over-approximate what the tool will actually touch (for
  example, with malformed or partial inputs)
- optional `event.runId`
- optional `event.toolCallId`
- context fields such as `ctx.agentId`, `ctx.sessionKey`, `ctx.sessionId`,
  `ctx.runId`, `ctx.toolKind`, `ctx.toolInputKind`, and diagnostic `ctx.trace`
- optional `ctx.requester`, the host-derived requester that initiated the current
  message run. It can include `channel`, `accountId`, `senderId`,
  `senderIsOwner`, and provider-native `roleIds`. Missing fields are unproven,
  not false assurances; fail closed when policy requires them.

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
      /** @deprecated 未解决的审批始终拒绝。 */
      timeoutBehavior?: "allow" | "deny";
      allowedDecisions?: Array<"allow-once" | "allow-always" | "deny">;
      pluginId?: string;
      onResolution?: (
        decision: "allow-once" | "allow-always" | "deny" | "timeout" | "cancelled",
      ) => Promise<void> | void;
    };
  };
```

类型化生命周期钩子的守卫行为：

- `block: true` 是终结性的，并会跳过更低优先级的处理器。
- `block: false` 视为没有决策。
- `params` 会重写用于执行的工具参数。
- `requireApproval` 会暂停代理运行，并通过插件审批请求用户。`/approve` 可以同时批准 exec 和插件审批。在 Codex
  app-server report-mode 原生 `PreToolUse` 转发中，这会委托给
  匹配的 app-server 审批请求；参见
  [Codex harness runtime](/plugins/codex-harness-runtime#hook-boundaries)。
- 更低优先级的 `block: true` 即使在更高优先级钩子请求了批准之后，仍然可以阻止执行。
- `onResolution` 接收已解析的决策：`allow-once`、`allow-always`、
  `deny`、`timeout` 或 `cancelled`。

### Sender-aware policy in one file

A standalone plugin file can keep deployment-specific policy in code instead
of adding another configuration schema. This example gives owners every tool,
lets configured maintainers use a conservative tool and message-action set,
and exposes `/fix` to senders already authorized by the channel configuration:

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

const AGENT_ID = "maintenance-agent";
const MAINTAINER_SCOPES = [
  {
    channel: "discord",
    accountId: "operations",
    senderIds: new Set(["maintainer-user-id"]),
    roleIds: new Set(["maintainer-role-id"]),
  },
];
const MAINTAINER_TOOLS = new Set(["read", "web_fetch", "web_search", "session_status", "message"]);
const MAINTAINER_MESSAGE_ACTIONS = new Set(["react", "reply", "thread-create", "thread-reply"]);

export default definePluginEntry({
  id: "maintenance-access",
  name: "Maintenance access",
  description: "Apply sender-aware tool policy to the maintenance agent.",
  register(api) {
    api.on("before_tool_call", (event, ctx) => {
      if (ctx.agentId !== AGENT_ID) {
        return;
      }

      const requester = ctx.requester;
      if (requester?.senderIsOwner === true) {
        return;
      }

      const maintainerScope = requester
        ? MAINTAINER_SCOPES.find(
            (scope) =>
              scope.channel === requester.channel && scope.accountId === requester.accountId,
          )
        : undefined;
      const isMaintainer =
        maintainerScope !== undefined &&
        ((requester?.senderId !== undefined && maintainerScope.senderIds.has(requester.senderId)) ||
          requester?.roleIds?.some((roleId) => maintainerScope.roleIds.has(roleId)) === true);
      if (!isMaintainer) {
        return { block: true, blockReason: "Maintainer access required." };
      }

      if (event.toolName === "message") {
        const action = typeof event.params.action === "string" ? event.params.action : "";
        if (MAINTAINER_MESSAGE_ACTIONS.has(action)) {
          return;
        }
        return { block: true, blockReason: `Owner required for message.${action || "unknown"}.` };
      }

      if (MAINTAINER_TOOLS.has(event.toolName)) {
        return;
      }
      return { block: true, blockReason: `Owner required for ${event.toolName}.` };
    });

    api.registerCommand({
      name: "fix",
      description: "Ask the maintenance agent to investigate and fix an issue.",
      acceptsArgs: true,
      requireAuth: true,
      handler: async (ctx) =>
        ctx.agentId === AGENT_ID
          ? { continueAgent: true }
          : { text: "This command is only available in the maintenance conversation." },
    });
  },
});
```

Load the file directly and restart the Gateway:

```json5
{
  agents: {
    list: [
      {
        id: "maintenance-agent",
        workspace: "~/.openclaw/workspace-maintenance",
      },
    ],
  },
  bindings: [
    {
      agentId: "maintenance-agent",
      match: {
        channel: "discord",
        accountId: "operations",
        peer: { kind: "channel", id: "maintenance-channel-id" },
      },
    },
  ],
  plugins: {
    load: { paths: ["~/.openclaw/policies/maintenance-access.ts"] },
  },
}
```

`AGENT_ID` must name the agent bound to the maintenance conversation. The
binding selects that agent for normal messages and `/fix`; the standalone file
remains the single owner of owner-versus-maintainer tool policy.

`requireAuth: true` reuses each channel's existing sender admission. For
Discord, a guild or channel `users`/`roles` allowlist can authorize the
maintenance audience. Other channels can use stable sender ids. The hook then
applies the finer per-tool decision on every tool call in the run, including
Codex native `PreToolUse` calls. It can veto a tool the model sees, but cannot
add a tool omitted by the host. Existing sandbox, exec approval, owner-only
core-tool, and channel policies still apply; the hook cannot grant past them.

Scope sender and role ids to an exact channel/account pair as shown; both are
provider-local namespaces. Keep the allowlists conservative. Add write or
execution tools only when the deployment's sandbox and approval policy make
that safe. For automated or system runs, decide explicitly whether an absent
`ctx.requester` should pass; the example denies it for the scoped agent.

See [Plugin permission requests](/plugins/plugin-permission-requests) for
approval routing, decision behavior, and when to use `requireApproval` instead
of optional tools or exec approvals.

需要宿主级策略的插件可以通过 `api.registerTrustedToolPolicy(...)` 注册受信任的工具策略。这些策略会在普通的 `before_tool_call` 钩子之前以及正常钩子决策之前运行。捆绑的受信任策略最先运行；已安装插件的受信任策略随后按插件加载顺序运行；普通的 `before_tool_call` 钩子在它们之后运行。捆绑插件保留现有的受信任策略路径。已安装插件必须显式启用，并在 `contracts.trustedToolPolicies` 中声明每个策略 id；未声明的 id 会在注册前被拒绝。策略 id 仅在注册该策略的插件范围内有效，因此不同插件可以重用相同的本地 id。仅在工作区策略、预算执行或保留工作流安全等宿主信任的门控场景中使用这一层。

### Exec 环境钩子

`resolve_exec_env` 允许插件在命令运行之前，为 `exec`
工具调用贡献环境变量。它接收：

- `event.sessionKey`
- `event.toolName`，当前始终为 `"exec"`
- `event.host`，取值为 `"gateway"`、`"sandbox"` 或 `"node"`
- 上下文字段，例如 `ctx.agentId`、`ctx.sessionKey`、
  `ctx.messageProvider` 和 `ctx.channelId`

返回一个 `Record<string, string>` 以合并到 exec 环境中。处理器
按优先级顺序运行；后面的结果会覆盖较早结果中相同的
键。

在合并之前，钩子输出会经过宿主 exec 环境键策略过滤。`PATH` 始终会被丢弃（命令解析和 safe-bin 检查
依赖它）。无效键以及危险的宿主覆盖键，如 `LD_*`、
`DYLD_*`、`NODE_OPTIONS`、代理变量（`HTTP_PROXY`、`HTTPS_PROXY`、
`ALL_PROXY`、`NO_PROXY`）和 TLS 覆盖变量（`NODE_TLS_REJECT_UNAUTHORIZED`、
`SSL_CERT_FILE` 及类似项）都会被丢弃。过滤后的插件环境会包含在 Gateway 审批/审计元数据中，并转发给 node-host 执行
请求。

### 工具结果持久化

工具结果可以包含用于 UI 渲染、诊断、媒体路由或插件自有元数据的结构化 `details`。请将 `details` 视为运行时元数据，而不是提示词内容：

- OpenClaw 会在提供方回放和压缩输入之前剥离 `toolResult.details`，因此元数据不会成为模型上下文。
- 持久化的会话条目只保留有界的 `details`。过大的 details 会被替换为紧凑摘要和 `persistedDetailsTruncated: true`。
- `tool_result_persist` 和 `before_message_write` 在最终持久化上限之前运行。请保持返回的 `details` 较小，并避免只把与提示相关的文本放在 `details` 中；应将模型可见的工具输出放在 `content` 中。

## 提示词与模型钩子

新插件应使用按阶段划分的钩子：

- `before_model_resolve`: 仅接收当前提示词和附件
  元数据。返回 `providerOverride` 或 `modelOverride`。
- `agent_turn_prepare`: 接收当前提示词、已准备好的会话
  消息，以及本会话中已清空的任何 exactly-once 队列注入。
  返回 `prependContext` 或 `appendContext`。
- `before_prompt_build`: 接收当前提示词和会话消息。
  返回 `prependContext`、`appendContext`、`systemPrompt`、
  `prependSystemContext` 或 `appendSystemContext`。
- `heartbeat_prompt_contribution`: 仅在 heartbeat 回合运行，返回
  `prependContext` 或 `appendContext`。适用于需要总结当前状态
  但不改变用户发起回合的后台监控。

`before_agent_run` runs after prompt construction and before any model input,
including prompt-local image loading and `llm_input` observation. It receives
the current user input as `prompt`, plus loaded session history in `messages`
and the active system prompt. Return `{ outcome: "block", reason, message? }`
to stop the run before the model reads the prompt. `reason` is internal;
`message` is the user-facing replacement. Only `pass` and `block` outcomes are
supported; unsupported decision shapes fail closed.

当运行被阻止时，OpenClaw 只会在 `message.content` 中存储替换文本，
以及非敏感的阻止元数据，例如阻止插件 id 和时间戳。原始用户文本
不会保留在转录或未来上下文中。内部阻止原因被视为敏感信息，
不会出现在转录、历史、广播、日志和诊断载荷中。可观测性应使用
已清洗字段，例如阻止者 id、结果、时间戳或安全分类。

Agent-turn hooks including `agent_end` include `event.runId` when OpenClaw can
identify the active run; the same value is also on `ctx.runId`. Cron-driven
runs also expose `ctx.jobId` (the originating cron job id) on the agent-turn
context so hooks can scope metrics, side effects, or state to a specific
scheduled job. `ctx.jobId` is not part of the `before_tool_call` tool context.

对于通道发起的运行，`ctx.channel` 和 `ctx.messageProvider` 用于标识
提供方表面，例如 `discord` 或 `telegram`，而 `ctx.channelId` 是会话
目标标识符，当 OpenClaw 能从 session key 或投递元数据推导出时会提供。

当发送者身份可用时，agent 钩子上下文还包括：

- `ctx.senderId` - channel-scoped sender ID（例如 Feishu `open_id`、Discord
  user ID）。当运行源自带有已知发送者元数据的用户消息时填充。
- `ctx.chatId` - transport-native conversation identifier（例如 Feishu `chat_id`、
  Telegram `chat_id`）。当来源通道提供原生会话 ID 时填充。
- `ctx.channelContext.sender.id` - 与 `ctx.senderId` 相同的发送者 ID，
  位于一个由通道拥有的对象下，插件可以通过通道特定字段进行扩展。
- `ctx.channelContext.chat.id` - 与 `ctx.chatId` 相同的会话 ID，
  位于一个由通道拥有的对象下，插件可以通过通道特定字段进行扩展。

Core 只定义嵌套的 `id` 字段。通过 inbound helper 传递更丰富发送者或聊天元数据的通道插件，可以从 `openclaw/plugin-sdk/channel-inbound` 扩展 `PluginHookChannelSenderContext` 或 `PluginHookChannelChatContext`：

```ts
declare module "openclaw/plugin-sdk/channel-inbound" {
  interface PluginHookChannelSenderContext {
    unionId?: string;
    userId?: string;
  }
}
```

通道插件通过 inbound SDK helper 传递这些字段：

```ts
buildChannelInboundEventContext({
  // ...
  channelContext: {
    sender: { id: senderOpenId, unionId, userId },
    chat: { id: chatId },
  },
});
```

这些字段是可选的，对于系统发起的运行（heartbeat、cron、exec-event）则不存在。

`ctx.senderExternalId` 仍作为一个废弃的向后兼容字段保留给旧插件。
Core 不会填充它；新的通道特定发送者身份应通过模块增强放在
`ctx.channelContext.sender` 下。

`agent_end` 是一个观测钩子。Gateway 和持久化 harness 路径会在回合结束后
以 fire-and-forget 方式运行它，而短生命周期的一次性 CLI 路径会在进程清理前
等待该钩子 promise，以便受信任的插件可以刷新终端可观测性或捕获状态。
钩子运行器会应用 30 秒超时，因此卡住的插件或嵌入端点不会让 hook promise
永久悬挂。超时会被记录，OpenClaw 会继续执行；除非插件也使用自己的 abort
signal，否则不会取消插件拥有的网络工作。

使用 `model_call_started` 和 `model_call_ended` 来做 provider 调用遥测，这些
遥测不应接收原始提示词、历史、响应、请求头、请求体或 provider 请求 ID。
这些钩子包含稳定元数据，例如 `runId`、`callId`、`provider`、`model`、
可选的 `api`/`transport`、终态 `durationMs`/`outcome`，以及当 OpenClaw
能推导出受限 provider request-id hash 时的 `upstreamRequestIdHash`。
当运行时已经解析出上下文窗口元数据时，钩子事件和上下文还会包括
`contextTokenBudget`，即模型/配置/agent 限制后的有效 token 预算，以及
在施加更低上限时的 `contextWindowSource` 和 `contextWindowReferenceTokens`。

`before_agent_finalize` 仅在 harness 即将接受自然的最终助手回复时运行。它不是
`/stop` 取消路径，也不会在用户中止回合时运行。返回 `{ action: "revise", reason }`
可要求 harness 在最终定稿前再进行一次模型传递，返回 `{ action:
"finalize", reason? }` 可强制最终定稿，或省略结果以继续。处理器默认预算为 15 秒；
超时后，OpenClaw 会记录失败并继续使用原始最终答案。
Codex 原生的 `Stop` 钩子会作为 OpenClaw 的 `before_agent_finalize`
决策转发到此钩子中。

当返回 `action: "revise"` 时，插件可以包含 `retry` 元数据，以便让额外的模型传递
保持有界且可重放：

```typescript
type BeforeAgentFinalizeRetry = {
    instruction: string;
    idempotencyKey?: string;
    maxAttempts?: number;
};
```

`instruction` 会附加到发送给 harness 的修订原因中。
`idempotencyKey` 允许宿主在等价的 finalize 决策之间统计同一插件请求的重试次数，
而 `maxAttempts` 则限制宿主在继续使用自然最终答案之前允许的额外传递次数。

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

Prompt-mutating hooks 和 durable next-turn injections 可以通过
`plugins.entries.<id>.hooks.allowPromptInjection=false` 按插件禁用。

### 会话扩展与下一回合注入

Workflow 插件可以使用 `api.session.state.registerSessionExtension(...)` 持久化小型
JSON 兼容会话状态，并通过 Gateway 的 `sessions.pluginPatch` 方法更新它。会话行会将
已注册的扩展状态通过 `pluginExtensions` 映射出来，让 Control UI 和其他客户端在不
了解插件内部实现的情况下也能渲染插件拥有的状态。
`api.registerSessionExtension(...)` 仍然可用，但已弃用，建议改用
`api.session.state` 命名空间。

当插件需要让持久化上下文恰好一次地到达下一次模型回合时，请使用
`api.session.workflow.enqueueNextTurnInjection(...)`（顶层的
`api.enqueueNextTurnInjection(...)` 是一个具有相同行为的已弃用别名）。
OpenClaw 会在提示词钩子之前清空已排队的注入，丢弃过期注入，并按插件的
`idempotencyKey` 去重。这是批准恢复、策略摘要、后台监控增量以及命令续接的合适
接入点：这些内容应在下一回合对模型可见，但不应变成永久的系统提示词文本。

清理语义是契约的一部分。会话扩展清理和运行时生命周期清理回调会接收 `reset`、
`delete`、`disable` 或 `restart`。主机会在 reset/delete/disable 时移除拥有该插件的
持久会话扩展状态和待处理的下一回合注入；restart 会保留持久会话状态，而清理回调则
允许插件释放旧运行代的调度器任务、运行上下文以及其他带外资源。

## 消息钩子

将消息钩子用于通道级路由和投递策略：

- `message_received`: observe inbound content, sender, `threadId`,
  `messageId`, `senderId`, optional run/session correlation, ordered `media`,
  and metadata.
- `message_sending`: rewrite `content` or return `{ cancel: true }`.
- `reply_payload_sending`: rewrite normalized `ReplyPayload` objects
  (including `presentation`, `delivery`, media refs, and text) or return
  `{ cancel: true }`.
- `message_sent`: observe final success or failure.

对于仅音频的 TTS 回复，即使通道负载中没有可见文本/标题，`content` 也可能包含隐藏的口语转写。
重写该 `content` 只会更新钩子可见的转写内容；它不会
作为媒体标题进行渲染。

`reply_payload_sending` 事件可能包含 `usageState`，这是对每次 turn 的模型/用量/上下文的尽力而为的实时快照。持久化投递、恢复回放以及没有精确运行关联的回复会省略它。

当可用时，Message hook 上文会暴露稳定的关联字段：
`ctx.sessionKey`、`ctx.runId`、`ctx.messageId`、`ctx.senderId`、`ctx.trace`、
`ctx.traceId`、`ctx.spanId`、`ctx.parentSpanId` 和 `ctx.callDepth`。入站
和 `before_dispatch` 上下文在通道具有可见性过滤的引用消息数据时也会暴露回复元数据：`replyToId`、`replyToIdFull`、
`replyToBody`、`replyToSender` 和 `replyToIsQuote`。在读取旧版元数据之前，请优先使用这些一等字段。

优先使用类型化的 `threadId` 和 `replyToId` 字段，然后再使用特定于通道的元数据。

Inbound claim and message-received events expose `media?:
PluginHookMediaFact[]` as the canonical attachment API. Each fact can carry
`path`, `url`, `contentType`, `kind`, `transcribed`, `messageId`, and
`workspaceDir`; array position is attachment identity. When a remote attachment
has not been staged locally yet, `media` is omitted,
`mediaStagingPending: true`, and `originalMedia` contains the provider-side
facts. Do not treat `originalMedia.path` as locally readable until a later
staged event supplies `media`.

The singular/plural `mediaPath`, `mediaUrl`, `mediaType`, `mediaPaths`,
`mediaUrls`, `mediaTypes`, and matching `originalMedia*` metadata properties are
deprecated compatibility aliases. New hooks should use the typed top-level
arrays.

Decision rules:

- `message_sending` 中的 `cancel: true` 是终态。
- `message_sending` 中的 `cancel: false` 视为未作出决定。
- 重写后的 `content` 会继续传递给低优先级钩子，除非后续钩子
  取消投递。
- `reply_payload_sending` 在负载规范化之后、通道
  投递之前运行，包括路由回原始通道的回复。
  处理程序按顺序运行，每个处理程序都会看到更高优先级处理程序生成的最新负载。
- `reply_payload_sending` 负载不会暴露运行时信任标记，例如
  `trustedLocalMedia`；插件可以编辑负载形状，但不能授予本地
  媒体信任。
- `message_sending` 可以在取消时返回 `cancelReason` 和受限的 `metadata`。新的消息生命周期 API 会将其作为被抑制的投递结果暴露，并给出原因 `cancelled_by_message_sending_hook`；为兼容性起见，旧版直接投递仍会返回空结果数组。
- `message_sent` 仅用于观察。处理程序失败会被记录，但不会
  改变投递结果。

## 安装钩子

使用 `security.installPolicy` 处理由运维方拥有的允许/阻止决策。该策略运行于 OpenClaw 配置中，覆盖 CLI 安装和更新路径，并且在启用但不可用时会默认拒绝（fail closed）。

`before_install` 是一个插件运行时生命周期钩子。它仅在 `security.installPolicy` 之后执行，并且只在已加载插件钩子的 OpenClaw 进程中运行，例如由 Gateway 支持的安装流程。它适用于插件自身的观测、警告和兼容性检查，但它并不是安装过程中主要的企业级或主机安全边界。`builtinScan` 字段仍保留在事件负载中以保持兼容性，但 OpenClaw 不再执行内置的安装时危险代码阻止逻辑，因此它会是一个空的 `ok` 结果。返回额外的发现结果，或返回 `{ block: true, blockReason }` 以在该进程中停止安装。

`block: true` 为终止性结果。`block: false` 会被视为没有决策。处理程序失败会以 fail-closed 方式阻止安装。

## 网关生命周期

使用 `gateway_start` 来启动通用插件服务，并使用 `gateway_stop` 来清理长期运行的资源。cron 调度器在 `gateway_start` 运行时仍可能处于加载中，因此不要把它作为外部 cron 投影的基线信号。

不要依赖内部的 `gateway:startup` 钩子来实现插件拥有的运行时服务。

`cron_reconciled` 会在 Gateway 的 cron 调度器及其退出时监听器完成有状态协调后触发。它既会在初始启动时触发，也会在配置重载时调度器替换后触发。该事件会报告 `reason`（`startup` 或 `reload`）以及实际生效的 `enabled` 状态。即使 cron 被禁用，也会以 `enabled: false` 触发，从而允许外部投影清除过期的唤醒。使用 `ctx.getCron?.()` 获取完成协调的精确调度器实例；之后的重载不会重新指向该回调。`ctx.abortSignal` 持有同一份调度器快照。Gateway 会在有更新的调度器被启用或关闭开始时立刻中止它。请将它传递给每一个持久化副作用，并且在它中止后不要再接受该快照。
这是一个调度器生命周期信号，不是插件激活信号：仅插件热重载不会再次触发它。新启用的消费者会在下一次调度器替换或 Gateway 启动时收到它的第一个基线信号。

与其他观察钩子类似，`gateway_start` 和 `cron_reconciled` 的回调可能会重叠。如果两个处理器共享插件初始化，请使用插件本地的就绪 promise 来协调，而不要依赖回调顺序。

`cron_changed` 会针对 Gateway 拥有的 cron 生命周期事件触发，并带有类型化事件载荷，涵盖 `added`、`updated`、`removed`、`started`、`finished` 和 `scheduled` 这些原因。该事件携带一个 `PluginHookGatewayCronJob` 快照（在存在时包括 `state.nextRunAtMs`、`state.lastRunStatus` 和 `state.lastError`），以及一个 `PluginHookGatewayCronDeliveryStatus`，其值可以是 `not-requested` | `delivered` | `not-delivered` | `unknown`。`removed` 事件属于提交后事件：只有在持久化删除成功后才会触发，并且仍然携带已删除的作业快照，以便外部调度器协调状态。

`scheduled` 事件也属于提交后事件：它只会在一次成功的持久化写入改变了现有作业的有效 `nextRunAtMs` 之后触发，并且不包括该作业显式的 `added`、`updated` 或 `removed` 生命周期事件。顶层的 `event.nextRunAtMs` 是已提交的下一次唤醒时间；当它缺失时，表示该作业没有下一次唤醒。请把这些事件视为协调提示，而不是有序的增量日志。将它们作为可合并的提示，用来重新读取由 `cron_reconciled` 最后捕获的调度器；不要从 `cron_changed` 上下文中接管调度器。将 OpenClaw 作为到期检查和执行的唯一真实来源。

### 安全的外部 cron 投影

投影完整的唤醒快照，而不是转发 cron 事件增量。外部适配器的 `replaceAll` 操作必须是原子且幂等的，并且只有在宿主已持久化接受该快照后才算完成。它还必须遵守所提供的中止信号：如果该信号在持久化接受之前中止，则适配器不得接受该快照。

这种模式使得同一时刻只有一个最新状态 worker 在运行。只有 `cron_reconciled` 会接管一个调度器实例；`cron_changed` 只是要求该 worker 重新读取权威实例，因此迟到的提示不会恢复较旧的调度器。更新的版本会在宿主尝试接受陈旧快照之前中止当前尝试。

```typescript
import { setTimeout as sleep } from "node:timers/promises";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";

type ExternalWake = { jobId: string; runAtMs: number };

type ExternalWakeHost = {
  replaceAll(wakes: readonly ExternalWake[], options: { signal: AbortSignal }): Promise<void>;
  close(): Promise<void>;
};

type CronReader = {
  list(options: { includeDisabled: true }): Promise<
    Array<{
      id: string;
      enabled?: boolean;
      state?: { nextRunAtMs?: number };
    }>
  >;
};

export function registerCronProjection(api: OpenClawPluginApi, host: ExternalWakeHost) {
  const lifecycle = new AbortController();
  let cron: CronReader | undefined;
  let enabled = false;
  let hasBaseline = false;
  let reconciliationSignal: AbortSignal | undefined;
  let requestedRevision = 0;
  let appliedRevision = 0;
  let worker = Promise.resolve();
  let activeAttempt: AbortController | undefined;

  const projectLatest = async () => {
    let retryMs = 1_000;

    while (!lifecycle.signal.aborted && appliedRevision < requestedRevision) {
      const ownerSignal = reconciliationSignal;
      if (!ownerSignal || ownerSignal.aborted) {
        return;
      }
      const targetRevision = requestedRevision;
      const attempt = new AbortController();
      const signal = AbortSignal.any([lifecycle.signal, ownerSignal, attempt.signal]);
      activeAttempt = attempt;

      try {
        const jobs = enabled && cron ? await cron.list({ includeDisabled: true }) : [];
        if (signal.aborted || targetRevision !== requestedRevision) {
          continue;
        }
        const wakes = jobs
          .flatMap((job): ExternalWake[] => {
            const runAtMs = job.enabled === false ? undefined : job.state?.nextRunAtMs;
            return runAtMs === undefined ? [] : [{ jobId: job.id, runAtMs }];
          })
          .sort((a, b) => a.runAtMs - b.runAtMs || a.jobId.localeCompare(b.jobId));

        await host.replaceAll(wakes, { signal });
        if (signal.aborted || targetRevision !== requestedRevision) {
          continue;
        }
        appliedRevision = targetRevision;
        retryMs = 1_000;
      } catch {
        if (lifecycle.signal.aborted || ownerSignal.aborted) {
          return;
        }
        if (attempt.signal.aborted) {
          continue;
        }
        api.logger.warn(`外部 cron 投影失败；将在 ${retryMs}ms 后重试`);
        try {
          await sleep(retryMs, undefined, { signal });
        } catch {
          if (lifecycle.signal.aborted) {
            return;
          }
          if (attempt.signal.aborted) {
            continue;
          }
        }
        retryMs = Math.min(retryMs * 2, 30_000);
      } finally {
        if (activeAttempt === attempt) {
          activeAttempt = undefined;
        }
      }
    }
  };

  const requestProjection = () => {
    const targetRevision = ++requestedRevision;
    activeAttempt?.abort();
    worker = worker.then(async () => {
      if (!lifecycle.signal.aborted && appliedRevision < targetRevision) {
        await projectLatest();
      }
    });
    return worker;
  };

  api.on("cron_reconciled", (event, ctx) => {
    const reconciledCron = ctx.getCron?.();
    if (event.enabled && !reconciledCron) {
      api.logger.warn("cron 协调未暴露调度器");
      return;
    }
    cron = reconciledCron;
    enabled = event.enabled;
    hasBaseline = true;
    reconciliationSignal = ctx.abortSignal;
    return requestProjection();
  });

  api.on("cron_changed", () => {
    if (hasBaseline) {
      return requestProjection();
    }
  });

  api.on("gateway_stop", async () => {
    lifecycle.abort();
    await worker;
    await host.close();
  });
}
```

当 `cron_reconciled` 报告 `enabled: false` 时，同一路径会调用 `replaceAll([])` 并清除过期的外部唤醒。此示例中的重试/退避是进程本地的，并将运行时适配器失败视为暂时性错误；请在注册前验证不可重试的配置。OpenClaw 不为插件钩子副作用提供 outbox。如果进程在持久化接受之前退出，下一次 Gateway 启动会发出新的权威 `cron_reconciled` 快照。`gateway_stop` 会中止正在进行的宿主工作，等待 worker 稳定下来，然后关闭适配器。

## 即将弃用

有少数与钩子相邻的接口已弃用，但仍受支持。请在下一次重大版本发布前迁移：

- **Plaintext channel envelopes** in `inbound_claim` and `message_received`
  handlers. Read `BodyForAgent` and the structured user-context blocks
  instead of parsing flat envelope text. See
  [Plaintext channel envelopes → BodyForAgent](/plugins/sdk-migration#active-deprecations).
- **`subagent_spawning`** remains for compatibility with older plugins, but
  new plugins should not return thread routing from it. Core prepares
  `thread: true` subagent bindings through channel session-binding adapters
  before `subagent_spawned` fires.
- **`deactivate`** remains as a deprecated cleanup compatibility alias until
  after 2026-08-16. New plugins should use `gateway_stop`.
- **`onResolution` in `before_tool_call`** now uses the typed
  `PluginApprovalResolution` union (`allow-once` / `allow-always` / `deny` /
  `timeout` / `cancelled`) instead of a free-form `string`.
- **`api.registerSessionExtension` / `api.enqueueNextTurnInjection`** remain
  as top-level compatibility aliases. New plugins should use
  `api.session.state.registerSessionExtension(...)` and
  `api.session.workflow.enqueueNextTurnInjection(...)`.

有关完整列表——内存能力注册、提供方思维
配置文件、外部认证提供方、提供方发现类型、任务运行时
访问器，以及 `command-auth` → `command-status` 重命名——请参见
[插件 SDK 迁移 → 活跃弃用项](/plugins/sdk-migration#active-deprecations)。

## 相关内容

- [插件 SDK 迁移](/plugins/sdk-migration) - 活跃弃用项和移除时间线
- [构建插件](/plugins/building-plugins)
- [插件 SDK 概览](/plugins/sdk-overview)
- [插件入口点](/plugins/sdk-entrypoints)
- [内部钩子](/automation/hooks)
- [插件架构内部](/plugins/architecture-internals)
