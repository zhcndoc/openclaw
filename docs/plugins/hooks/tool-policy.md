---
summary: "门控、重写和批准工具调用，并在持久化之前重写工具结果"
read_when:
  - "您需要阻止工具调用或需要插件的批准"
  - "您需要观察工具调用运行后做了什么"
  - "您正在独立的插件文件中编写发件人感知工具策略"
  - "您正在向 exec 工具贡献环境变量"
  - "您正在重写或阻止抄本写入"
title: "工具调用策略挂钩"
sidebarTitle: "工具政策"
---

工具端挂钩：参数重写、阻止、批准、执行环境贡献和转录持久性。 [ 插件挂钩 ](/plugins/hooks) 指南的一部分。

## <a id="tool-call-policy"></a> 工具调用策略

`before_tool_call` 接收：

- `event.toolName`
- `event.params`
- 可选`event.toolKind`和`event.toolInputKind`，有意共享名称的工具的主机权威鉴别器；例如，外部代码模式 `exec` 调用使用 `toolKind: "code_mode_exec"` 并包含 `toolInputKind: "javascript"` 来接受代码模式输入
- 可选的 `event.derivedPaths`，由宿主尽力推导的目标路径提示， 适用于 `apply_patch` 等已知工具封装；这些路径可能不完整，或过度近似工具实际会修改的内容 （例如，对于格式错误或不完整的输入）
- 可选的 `event.runId`
- 可选的 `event.toolCallId`
- 上下文字段，例如 `ctx.agentId`、`ctx.sessionKey`、`ctx.sessionId`、 `ctx.runId`、`ctx.toolKind`、`ctx.toolInputKind`，以及诊断用的 `ctx.trace`
- 可选的 `ctx.abortSignal`，在所属工具调用被取消时触发；处理器应将其传递给可取消的 I/O，并移除其注册的任何监听器
- 可选 `ctx.requester`，发起当前消息运行的主机派生请求者。它可以包括 `channel`、`accountId`、`senderId`、`senderIsOwner` 和提供商本机 `roleIds`。缺失的字段是未经证实的，不是虚假的保证；如果策略需要这些字段，则拒绝该操作。

它可以返回：

```typescript
type BeforeToolCallResult = {
  params?: Record<string, unknown>;
  block?: boolean;
  blockReason?: string;
  requireApproval?: {
    title: string;
    description: string;
    scope?: ApprovalScope;
    severity?: "info" | "warning" | "critical";
    timeoutMs?: number;
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
- 返回`params`重写主机拥有的工具参数。每个处理程序都会看到原始事件的独立副本，而不是先前返回的重写。最后返回的 `params` 获胜，直到请求批准。
- 第一个 `requireApproval` 获胜，其插件 id 由主机盖章。它冻结选定的参数快照：以后的处理程序可以阻止但不能更改已批准的参数。
- 原生工具继电器可以有更窄的合约。 Codex 原生工具支持阻塞和观察，但拒绝参数重写；请参阅 [Codex 挂钩边界](/plugins/codex-harness-runtime#hook-boundaries)。
- `requireApproval` 会暂停代理运行，并通过插件审批请求用户。`/approve` 可以同时批准 exec 和插件审批。在 Codex app-server report-mode 原生 `PreToolUse` 转发中，这会委托给匹配的 app-server 审批请求；参见 [Codex harness runtime](/plugins/codex-harness-runtime#hook-boundaries)。
- 更低优先级的 `block: true` 即使在更高优先级钩子请求了批准之后，仍然可以阻止执行。
- `onResolution` 接收已解析的决策：`allow-once`、`allow-always`、 `deny`、`timeout` 或 `cancelled`。

例如，将其添加到 `register(api)` 中以在主机拥有的 `exec` 调用之前进行询问。 `before_tool_call` 不需要选择加入对话访问：

```typescript
api.on(
  "before_tool_call",
  () => ({
    requireApproval: {
      title: "Run command",
      description: "Allow this exec tool call?",
      severity: "info",
      timeoutMs: 60_000,
    },
  }),
  { matcher: ["exec"], priority: 50 },
);
```

### <a id="sender-aware-policy-in-one-file"></a> 单文件中的发送者感知策略

独立插件文件可以将部署特定的策略保存在代码中，而无需添加其他配置模式。此示例为所有者提供每个工具的访问权限，让已配置的维护者使用一组保守的工具和消息操作，并向已获得频道配置授权的发送者开放 `/fix`：

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

将文件添加到`plugins.load.paths`并启用；默认混合重新加载模式应用更改。独立文件使用其文件名作为插件 ID（`maintenance-access.ts` 是 `maintenance-access`），因此请使其等于传递给 `definePluginEntry` 的 `id`：

```json5
{
  agents: {
    entries: {
      "maintenance-agent": {
        workspace: "~/.openclaw/workspace-maintenance",
      },
    },
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
    entries: { "maintenance-access": { enabled: true } },
  },
}
```

`AGENT_ID` 必须命名绑定到维护会话的代理。绑定选择正常消息和 `/fix` 的代理；独立文件仍然是所有者与维护者工具策略的单一所有者。编辑文件本身后，运行 `openclaw plugins reload maintenance-access`。

`requireAuth: true` 重用每个通道的现有发送者准入。对于 Discord，公会或频道 `users`/`roles` 白名单可以授权维护受众。其他渠道可以使用稳定的发件人 ID。然后，该挂钩将更精细的每个工具决策应用于运行中的每个工具调用，包括 Codex 本机 `PreToolUse` 调用。它可以否决模型看到的工具，但不能添加主机省略的工具。现有的沙箱、执行审批、仅限所有者的核心工具和渠道政策仍然适用；钩子无法通过它们。

将发送者和角色 ID 范围限定为精确的 channel/account 对，如图所示；两者都是提供者本地命名空间。保持许可名单保守。仅当部署的沙箱和批准策略确保安全时才添加写入或执行工具。对于自动化或系统运行，明确决定是否应通过不存在的 `ctx.requester`；该示例拒绝为作用域代理进行此操作。

参见[插件权限请求](/plugins/plugin-permission-requests)，了解审批路由、决策行为，以及何时应使用 `requireApproval` 而不是可选工具或 exec 审批。

需要宿主级策略的插件可以通过 `api.registerTrustedToolPolicy(...)` 注册受信任的工具策略。这些策略会在普通的 `before_tool_call` 钩子之前以及正常钩子决策之前运行。捆绑的受信任策略最先运行；已安装插件的受信任策略随后按插件加载顺序运行；普通的 `before_tool_call` 钩子在它们之后运行。捆绑插件保留现有的受信任策略路径。已安装插件必须显式启用，并在 `contracts.trustedToolPolicies` 中声明每个策略 id；未声明的 id 会在注册前被拒绝。策略 id 仅在注册该策略的插件范围内有效，因此不同插件可以重用相同的本地 id。仅在工作区策略、预算执行或保留工作流安全等宿主信任的门控场景中使用这一层。

可信策略可以将 `matcher` 设置为 `before_tool_call` 接受的相同标准工具 ID 列表。省略匹配器以保留全部匹配行为。

当可信策略批准内联完成时，普通 `before_tool_call` 挂钩会收到已批准参数的独立副本。参数未更改的调用仍然被允许，但要受到普通否决和稍后的执行检查。转换这些参数的普通挂钩必须返回 `requireApproval` 及其最终的 `params`，以便替换得到单独的批准。如果没有该批准请求，更改后的呼叫将被 `Tool call parameters changed after trusted approval` 阻止。

当升级将可信批准与普通参数重写相结合的插件时，请更新转换钩子以请求单独的批准。第一次批准并不授权替换参数。此内联边界不会改变上述较窄的本机中继合约。

### <a id="tool-call-observation"></a> 工具调用观察

`after_tool_call` 观察到已运行的工具调用。它是 `before_tool_call` 的另一半，用于记录门控调用所做的事情。它接收与`before_tool_call`（`PluginHookToolContext`）相同的上下文类型；可用的上下文字段取决于发射harness。其事件包含：

- `event.toolName`：工具名称。
- `event.params`：工具参数，包括 `before_tool_call` 的调整。
- 可选 `event.runId`：所属运行标识符。
- 可选 `event.toolCallId`：工具调用标识符。
- 可选 `event.result`：harness提供的工具结果。
- 可选 `event.error`：harness提供或提取的错误消息。
- 可选 `event.durationMs`：已知开始时间时经过的毫秒数。

```typescript
type AfterToolCallEvent = {
  toolName: string;
  params: Record<string, unknown>;
  runId?: string;
  toolCallId?: string;
  result?: unknown;
  error?: string;
  durationMs?: number;
};
```

它是一个观察钩子，所以它不能改变已经发生的事情：

- Handlers 并发运行，并且它们的返回值被忽略。
- A 抛出或超时的处理程序被记录，并继续执行。
- `matcher` 接受与 `before_tool_call` 相同的标准工具 ID 列表。

`result` 和 `error` 都是可选的，因此两者都不包含的事件并不能证明该工具成功。通过缺少 `error` 来推断成功的处理程序可以将失败的调用记录为成功的调用；将不可读的结果视为未知，而不是任一结果。 `result` 为 exec 和 bash 系列工具携带的内容在 [#102961](https://github.com/openclaw/openclaw/issues/102961) 中单独跟踪。

不要使用此挂钩来执行策略。正如 [hook 参考文献 ](/plugins/hooks/reference) 所说，使用一个在错误时阻止操作的门，而不是假设观察或传递钩子会在失败时拒绝操作。

### <a id="exec-environment-hook"></a> Exec 环境钩子

`resolve_exec_env` 允许插件在命令运行之前向 OpenClaw `exec` 工具调用提供环境变量。它并不是适用于所有harness-native shell 的钩子。它接收：

- `event.sessionKey`
- `event.toolName`，始终为 `"exec"`
- `event.host`，取值为 `"gateway"`、`"sandbox"` 或 `"node"`
- 上下文字段，例如`ctx.agentId`、`ctx.sessionKey`、`ctx.sessionId`、`ctx.messageProvider`和`ctx.channelId`

返回一个 `Record<string, string>` 以合并到 exec 环境中。处理器按优先级顺序运行；后面的结果会覆盖较早结果中相同的键。

在合并之前，钩子输出通过主机执行环境密钥策略进行过滤。 `PATH` 始终被丢弃（命令解析和安全箱检查取决于它）。无效密钥和危险主机覆盖密钥，例如 `LD_*`、`DYLD_*`、`NODE_OPTIONS`、代理变量（`HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY`、`NO_PROXY`）和 TLS 覆盖变量（`NODE_TLS_REJECT_UNAUTHORIZED`、`SSL_CERT_FILE` 和类似）已被删除。过滤后的插件环境包含在网关 approval/audit 元数据中，并转发到节点主机执行请求。

### <a id="tool-result-persistence"></a> 工具结果持久化

`tool_result_persist`和`before_message_write`是同步钩子。不要让他们的处理程序 `async`：返回的承诺将被忽略并带有警告。每个处理程序都会接收前一个处理程序返回的消息。 `tool_result_persist` 返回 `{ message }` 替换工具结果； `before_message_write` 可以返回 `{ message }` 或 `{ block: true }` 以防止转录写入。阻止持久性并不是工具执行否决权。

这些挂钩对 OpenClaw- 拥有的转录本写入进行操作。它们不会重写 Codex-native 工具记录；请参阅 [Codex 转录本边界 ](/plugins/codex-harness-runtime#compaction-and-transcript-mirror)。

工具结果可以包含用于 UI 渲染、诊断、媒体路由或插件自有元数据的结构化 `details`。请将 `details` 视为运行时元数据，而不是提示词内容：

- OpenClaw 会在提供方回放和压缩输入之前剥离 `toolResult.details`，因此元数据不会成为模型上下文。
- 持久化的会话条目只保留有界的 `details`。过大的 details 会被替换为紧凑摘要和 `persistedDetailsTruncated: true`。
- `tool_result_persist` 和 `before_message_write` 在最终持久化上限之前运行。请保持返回的 `details` 较小，并避免只把与提示相关的文本放在 `details` 中；应将模型可见的工具输出放在 `content` 中。
