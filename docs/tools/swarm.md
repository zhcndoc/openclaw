---
summary: "使用带结构化结果、受限扇出和实时进度的 Code Mode 脚本协调并发子代理"
title: "群体"
sidebarTitle: "群体"
read_when:
  - "你想要一个 Code Mode 脚本将工作分发到多个代理"
  - "你需要结构化的子结果、决策门控或先完成管线"
  - "您正在禁用 Swarm 或调整 tools.swarm 限制"
  - "你想在聊天中观察 collector 子代理"
---

Swarm 从 [Code Mode](/tools/code-mode) 脚本编排许多子代理。默认情况下启用它，并明确选择退出。使用常规 JavaScript 控制流（例如 `Promise.all`、`while` 和 `if`）来扇出工作、收集结果并做出决策。

这里没有图形 DSL，也没有单独的工作流格式。程序本身就是协调过程。Swarm 为该程序增加了可等待的 collector 子代理、结构化结果、 受限并发和进度报告。

## <a id="when-to-use-swarm"></a> 何时使用 Swarm

使用普通的 `sessions_spawn` 宣布一个或几个孩子的跑步。为大型并行扇出保留 Swarm：几个类似的子节点（大约五个或更多），通常由具有控制流（例如 `Promise.all`）的代码模式 `agents.run` 驱动。收集器子级 （`collect: true`） 不会发送完成通知，并且无法被引导。必须明确收集他们的结果。使用 `outputSchema` 获取结构化结果，使用 `groupId` 对批次进行分组。

## <a id="enable-swarm"></a> 启用 Swarm

Swarm 不需要启用设置。省略`tools.swarm`，一个空对象，或者一个仅设置限制所有离开Swarm启用的对象。代码模式仍然单独选择加入，并且正常的工具策略仍然适用。现有的 Codex 会话可以保留较旧的工具目录。请参阅下面的 [ 新鲜会话指南 ](/tools/swarm#use-swarm-from-other-harnesses)。

要选择退出，请在 **Settings → Agent Defaults → Tools** 中禁用 Swarm，或在 `openclaw.json` 中设置 `tools.swarm: false`：

```json5
{
  tools: {
    swarm: false,
  },
}
```

`swarm: { enabled: false }` 具有相同的效果，同时保留配置的限制。要重新启用 Swarm，请删除显式选择退出，设置 `swarm: true` 或 `swarm: { enabled: true }`，或在 **Settings → Agent Defaults → Tools** 中启用它。

要调整限制，请使用对象形式。这些是默认值。您只需要包含要更改的值：

```json5
{
  tools: {
    swarm: {
      maxConcurrent: 32,
      maxChildrenPerGroup: 50,
      maxTotalPerGroup: 200,
      waitTimeoutSecondsMax: 600,
      defaultAgentId: "",
    },
  },
}
```

| 字段                   | 默认值 | 描述                                                                                                                    |
| ----------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `enabled`               | `true`  | 启用受工具策略约束的收集器功能；设置 `false` 选择退出。代码模式有以下附加要求。        |
| `maxConcurrent`         | `32`    | 在一个 swarm 组的执行通道中同时运行的最大收集器子级。额外接受的子队列 FIFO。  |
| `maxChildrenPerGroup`   | `50`    | 单个组中存活的 collector 子进程最大数量。                                                                                  |
| `maxTotalPerGroup`      | `200`   | 一个组在其生命周期内可生成的 collector 子进程最大总数。这是防止失控生成的最后一道防线。                            |
| `waitTimeoutSecondsMax` | `600`   | 单次 `agents_wait` 调用可接受的最大超时时间。该调用的默认值为 30 秒。                                            |
| `defaultAgentId`        | `""`    | 当 spawn 省略 `agentId` 时使用的目标 agent。空值表示使用发起请求的 agent。现有的子 agent allowlist 仍然适用。 |

数值必须为正整数。OpenClaw 将 `maxConcurrent` 限制在 `1`–`1000`，`maxChildrenPerGroup` 限制在 `1`–`10000`， `maxTotalPerGroup` 限制在 `1`–`100000`，并将 `waitTimeoutSecondsMax` 限制在 `1`–`86400`。

每个组都有自己的执行通道，独立于父级普通子代理的限制。每个正在运行的子进程的一个模型流和一个代码模式工作线程隔离的预算。提高 `maxConcurrent` 会增加模型和网关资源使用；它不会引发 `maxChildrenPerGroup` 或 `maxTotalPerGroup`。

您可以使用 `agents.entries.*.tools.swarm` 覆盖一个已配置代理的 Swarm。每个代理的值合并到顶级设置上。代理的 `false` 或 `{ enabled: false }` 会禁用该代理的 Swarm。即使全局禁用，`true` 或 `{ enabled: true }` 也会启用它。仅限制的每代理对象继承全局启用，因此它不会重新启用全局 `false`。

## <a id="requirements"></a> 要求

要使用 `agents.run`、`phase` 和 `log` 来宾全局变量，请启用 OpenClaw 代码模式并保持 Swarm 启用：

```json5
{
  tools: {
    codeMode: true,
  },
}
```

仅当其目录包含本机 OpenClaw `sessions_spawn` 工具并且运行的执行白名单允许时，代码模式才会公开这些全局变量、`API.read("agents.d.ts")` 和 Swarm 提示提示。同名的 MCP 工具不符合条件。工具配置文件、allow/deny 策略、提供商规则和沙箱策略可以删除本机工具。如果 Swarm API 不存在，请检查 [ 代码模式激活 ](/tools/code-mode/configuration#activation) 和 [ 子代理 ](/tools/subagents)。

代码模式在内部等待收集器结果。其 `agents.run()` API 不需要允许使用独立的 `agents_wait` 工具。 [低级工具流](/tools/swarm#use-swarm-from-other-harnesses)需要同时允许`sessions_spawn`和`agents_wait`。启用 Swarm 绝不会授予工具或绕过策略。

`defaultAgentId` 和每次运行的 `agentId` 值必须命名为请求方的 `subagents.allowAgents` 策略所允许的已配置目标。OpenClaw 会拒绝未知或被禁止的目标，而不会回退到其他代理。

## <a id="write-a-swarm-script"></a> 编写 Swarm 脚本

当满足 [ 要求 ](/tools/swarm#requirements) 时，代码模式会公开此来宾 API：

```typescript
type AgentRunOptions = {
  label?: string;
  model?: string;
  thinking?: string;
  fastMode?: boolean | "auto";
  agentId?: string;
  schema?: Record<string, unknown>;
  phase?: string;
};

agents.run(prompt: string, options?: AgentRunOptions & { schema?: undefined }): Promise<string>;
agents.run<T>(prompt: string, options: AgentRunOptions & { schema: Record<string, unknown> }): Promise<T>;
phase(title: string): void;
log(message: string): void;
```

如果没有 `schema`，`agents.run()` 将解析为子级的最终文本。使用 JSON 架构，它解析为通过子项的 `structured_output` 工具提交的值。失败、终止、超时或架构无效的子级会拒绝 Promise，并出现错误，其 `name` 为 `"SwarmAgentError"`，其 `runId`、`status` 和 `message` 标识失败的子级和结果。没有全局 `SwarmAgentError` 构造函数。检查捕获的错误的字段。生成或桥故障可能会因其他错误而被拒绝。在代码模式中阅读 `API.read("agents.d.ts")` 中准确生成的声明和简短的编排习惯用法。

使用 `label` 作为会话记录中可识别的子名称。在选项中使用 `phase` 在该子级开始之前立即发布阶段，或者在多个子级属于同一阶段时调用 `phase()`。 `log()` 发布了简短的进度说明。进度调用是一劳永逸的。如果 UI 不可用，它们不会延迟脚本。

### <a id="fan-out-in-parallel-with-structured-results"></a> 并行分发并收集结构化结果

此示例为每个主题启动一名研究人员，等待每个结果，然后要求最后一个孩子综合成功的报告。即使合成也失败，失败的车道仍保留在结果中：

```javascript
const reportSchema = {
  type: "object",
  properties: {
    finding: { type: "string" },
    evidence: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
  },
  required: ["finding", "evidence", "confidence"],
  additionalProperties: false,
};

const topics = ["authentication", "storage", "recovery"];
phase("Independent review");

const settled = await Promise.allSettled(
  topics.map((topic) =>
    agents.run(`Review the ${topic} path. Return one finding with evidence.`, {
      label: `review-${topic}`,
      thinking: "high",
      fastMode: "auto",
      schema: reportSchema,
    }),
  ),
);

const reports = [];
const failures = [];
for (const [index, outcome] of settled.entries()) {
  if (outcome.status === "fulfilled") {
    reports.push({ topic: topics[index], report: outcome.value });
  } else {
    failures.push({ topic: topics[index], error: String(outcome.reason) });
  }
}

if (reports.length === 0) return { reports, failures };

phase("Synthesis");
log(`Collected ${reports.length} reports; ${failures.length} lanes failed.`);

try {
  const synthesis = await agents.run(
    `Reconcile these reports, explain disagreements, and disclose failed lanes:\n${JSON.stringify({ reports, failures })}`,
    { label: "synthesis" },
  );
  return { synthesis, reports, failures };
} catch (error) {
  return { reports, failures, synthesisError: String(error) };
}
```

`Promise.allSettled` 在等待每个孩子时保留部分结果。 `Promise.all` 在第一次失败时拒绝，并且不会为您收集剩余的结果。保留已完成的工作并报告失败的车道。不要自动重新生成批次。稍后的提供程序故障仍然可能会阻止最终模型回复，因此请保留收集的结果以进行恢复。

OpenClaw 启动该组的 `maxConcurrent` 子级，并按提交顺序对其余子级进行排队。

代码模式将并发访客桥接呼叫分别与`tools.codeMode.maxPendingToolCalls`（默认`16`，最大`128`）进行绑定。当这些槽已满时，Swarm 会自动启动、进度注释和结果等待队列。排队的请求在快照恢复中保留其原始参数。停止运行会丢弃尚未接受的请求。 `maxConcurrent` 仍然限制跑步儿童，团体儿童限制仍然适用。普通工具调用和计时器共享此来宾队列，但有自己的 128 个请求等待配额，与飞行中的桥接上限分开。 Swarm 启动、注释和结果等待不会消耗该配额并保留其现有组、VM 内存和快照限制。在调度来自同步边界的任何新调用之前，超过普通配额会使同步边界失败。而是等待较小的普通批次。有关队列、取消和资源限制语义，请参阅 [Code Mode](/tools/code-mode/internals#nested-tool-execution)。

### <a id="loop-on-a-decision-gate"></a> 在决策门上循环

当每一轮都要决定是否需要下一轮时，请使用有界的 `while` 循环：

```javascript
const gateSchema = {
  type: "object",
  properties: {
    ready: { type: "boolean" },
    reason: { type: "string" },
    nextAction: { type: "string" },
  },
  required: ["ready", "reason", "nextAction"],
  additionalProperties: false,
};

let pass = 0;
let decision = { ready: false, reason: "Not checked", nextAction: "Review" };

while (!decision.ready && pass < 4) {
  pass += 1;
  phase(`Decision pass ${pass}`);
  decision = await agents.run(
    `Check whether the release evidence is complete. Previous decision: ${JSON.stringify(decision)}`,
    {
      label: `release-gate-${pass}`,
      schema: gateSchema,
    },
  );
  log(decision.reason);
}

if (!decision.ready) {
  throw new Error(`Gate still closed after ${pass} passes: ${decision.nextAction}`);
}

return decision;
```

务必为决策循环设置边界。`maxTotalPerGroup` 只是最后的安全兜底，而不是清晰停止条件的替代品。

### <a id="process-the-first-child-that-finishes"></a> 处理最先完成的子任务

`agents.run()` 返回一个普通的 Promise，因此 `Promise.race` 可以对第一个代码模式子项做出反应。对于调用较低级别工具的harness，`agents_wait` 提供相同的首次完成边界：一旦至少一个请求的运行完成，或者当有界超时到期时，它就会返回。请参阅 [ 使用其他harness ](#use-swarm-from-other-harnesses) 中的 Swarm 来获得完整的排水回路。

## <a id="how-collector-children-behave"></a> 收集器子进程的行为

收集器子级是具有不同完成路径的普通隔离子代理会话。他们编写持久的收集器结果供父级等待，而不是宣布或将回复引导回父级会话。接受的生成收据描述了此路径：使用 `agents_wait` 收集结果，或在 OpenClaw 代码模式下等待 `agents.run()`。不要使用 `sessions_yield` 等待收集器子项。他们不发送完成通知。

`sessions_yield` 不提供嵌入式和 CLI- 支持的集电极匝。如果覆盖到达该工具，它会返回一个错误，说明收集器结果是显式收集的。然而，通过另一条路径让步的收集器会在自己的终端上安顿下来，而不是暂停，因此轮次完成，并且为服务员记录其收集的结果。

目标代理按以下顺序解析：

1. `agentId`，来自 spawn 或 `agents.run()` 调用。
2. `tools.swarm.defaultAgentId`.
3. 请求该操作的代理。

当收藏家需要更小的工具表面、更便宜的模型或更严格的沙箱政策时，专门的、精益的工人代理会很有用。 OpenClaw 不附带内置 `worker` 代理 ID。在将其命名为默认值之前配置一个。在每个代理配置中使用 `tools.swarm: false` 强化该工作进程，以便可以生成该工作进程，但无法从其自己的顶级会话启动集群：

```json5
{
  tools: { swarm: { enabled: true, defaultAgentId: "worker" } },
  agents: {
    ownership: "explicit",
    defaults: {
      heartbeat: { agentId: "main" },
      systemAgent: { agentId: "main" },
    },
    entries: {
      main: {
        workspace: "~/.openclaw/workspace",
        subagents: { allowAgents: ["worker"] },
      },
      worker: { tools: { swarm: false } },
    },
  },
  talk: { agentId: "main" },
}
```

收藏家否认需要批准的行动。孩子永远不会打开操作员批准提示。需要批准的工具操作被拒绝，子级可以在其结果中报告该拒绝，以便脚本可以决定下一步要做什么。

对于结构化输出，OpenClaw 向子级添加了一个合成的 `structured_output` 工具，并根据提供的 JSON 架构验证其有效负载。如果字符串值 `result` 验证失败，OpenClaw 会将其解码为 JSON 一次，并且仅当解码后的值与架构匹配时才接受解码值。有效字符串结果保持不变； JavaScript 安全范围之外的整数文字将保留为字符串。无效的有效负载会得到一个纠正性的推动。如果未提交有效负载，或者重试仍然无效，则收集器完成会保留子级的原始文本，使 `structured` 保持未设置状态，并包含 `schemaError`。低级 `agents_wait` 结果公开这些字段以实现显式恢复逻辑。

### <a id="keep-collector-groups-flat"></a> 保持收集器组平坦

收集器子级可以递归委托，但通常的编排习惯是将工作返回给父级而不是扩展收集器树：

```javascript
const plan = await agents.run("Plan this job as independent tasks.", {
  schema: {
    type: "object",
    properties: { tasks: { type: "array", items: { type: "string" } } },
    required: ["tasks"],
    additionalProperties: false,
  },
});
return await Promise.all(plan.tasks.map((task) => agents.run(task)));
```

嵌套的收集器子级不适合 Swarm。组上限、预算和可观察性都假设收集器组是平坦的。当工作流程必须强制执行该形状时，设置 `agents.defaults.subagents.maxSpawnDepth: 1`。

每个孩子都有一位入场所有者。公告和交互子项使用 `agents.defaults.subagents.maxChildrenPerAgent`（默认 `5`），并且不计算收集器子项。收藏家儿童仅使用 `maxChildrenPerGroup` 和 `maxTotalPerGroup`。他们不消耗每个会话的子预算。生成深度防护仍然适用于两种模式。

准入后，收集器子级在 `subagent:swarm:<schedulerGroupKey>` 中执行，上限为组解析的 `tools.swarm.maxConcurrent`（默认 `32`）。额外的子队列 FIFO。它们不消耗父级的普通 `subagent:<immediate session>` 插槽，该插槽仍受 `agents.defaults.subagents.maxConcurrent`（默认 `8`）的限制。由收集器生成的普通子级使用收集器自己的会话通道。超过任一组准入上限的收集器生成将被拒绝，并出现错误中的相关配置键。

## <a id="observe-a-swarm"></a> 观察群体

当集群处于活动状态时，让父会话在聊天中保持打开状态。 Control UI 和本机 Android、iOS 和 macOS 聊天界面在转录和作曲家之间显示了一个紧凑的 Swarm 进度小部件。

在 Control UI 中，卡片显示排队、正在运行、已完成以及 **失败或已停止** 计数以及可见的状态标记。合并计数包括失败、超时和取消的子项；摘要没有单独报告这些结果。单击或点击 **子项详细信息** 或使用键盘激活它，以展开可用的子项名称、状态图标和运行持续时间。该视图最多显示四个活动组以及最新完成的组，并在更多组处于活动状态时提供明确的计数。每张卡片最多显示 64 个标记和 64 个子详细信息。其计数包括每个接受的团体成员。

在子级完成后，最新完成的组的计数仍然可见，包括当父级在编写最终响应之前失败时。子级全部成功的组使用紧凑的完成行。激活该行以展开子项详细信息和最终响应提醒。具有正在运行、排队、失败或停止子项的组保留其可见状态标记和计数。这些是孩子的结果，而不是确认父母产生了综合。计数来自保留的收集器记录，因此重新加载页面或清理子会话不会减少报告的总数。它们将随着现有的收集器保留政策而过期。这不是永久执行档案。

本机 Android、iOS 和 macOS 聊天界面仍显示仅活动的阶段分组网格，每个阶段上限为 256 个标记，并有溢出计数。可访问的标签可识别每个孩子的状态。本地客户端将被杀死和超时的孩子视为失败。当本机组没有任何子级排队或运行时，它们会离开小部件。当没有活动组剩余时，本机小部件就会消失。

收藏家的孩子们出现在他们的会话记录中。他们没有会话侧边栏行。他们的活动和未读失败仍然会影响家长的侧边栏铃声和注意力信号。持久生成的会话和分叉保持其正常的侧边栏嵌套。

删除模式收集器子级可以在完成后立即清理其子会话，同时保留其可等待的结果。这些收集者记录将一直可用，直到每个成员达到其保留期限后对该组进行存档为止。保留的子会话此时将作为批次存档。

重置子会话会在更改该会话之前永久撤销已完成的运行清理，因此延迟清理重试无法删除其替换。如果完成仍处于稳定状态或无法保存撤销，则重置失败。如果重置失败或网关在保存撤销后停止，则原始会话可能会保留并禁用该清除。收集器结果和任务结果保持正常保留，主动重置延续继续运行。

## <a id="stop-a-swarm"></a> 阻止蜂群

在父聊天中使用 **Stop** 取消正在运行的集群。针对特定父运行的 Stop 还会取消其关联的收集器子项及其嵌套后代。收集器模式改变结果交付，而不是取消范围。成功取消可防止选定的排队子级在运行的同级停止时启动。它不会取消不相关的父轮流的工作。

Stop 还会等待所选子项的执行和排队启动清理。当清理仍在进行中时，子任务可以显示最终状态。

如果 Stop 超时或报告不完整的后代取消，请使用 `action: "list"` 检查 `subagents` 的剩余工作，并重试取消这些子项。单独停止的父级并不能确认每个子级都已停止，并且失败的请求可能会使清理挂起。

当父级正常完成、屈服或超时时，已被接受的子级仍保持独立。如果父任务不再活动，则直接取消子任务。请参阅 [ 子代理停止 ](/tools/subagents#stopping) 了解精确运行和会话范围的停止范围。

## <a id="use-swarm-from-other-harnesses"></a> 在其他 harness 中使用 Swarm

您可以在没有 OpenClaw 代码模式的情况下使用 Swarm。其核心工具与harness无关：使用 `sessions_spawn({ collect: true })` 启动收集器子级，并使用有界 `agents_wait` 调用耗尽它们。这两种工具都必须得到有效工具策略的允许。默认开启的 Swarm 不会将它们添加到限制性工具配置文件或白名单中。

Codex 代码模式自动公开 `tools.*` 下符合条件的动态 OpenClaw 工具。它不使用 OpenClaw 的来宾 API 或需要 `tools.codeMode`，但仍必须启用 `tools.swarm`。 Codex harness `agents_wait` 调用支持完整的 600 秒超时。

Codex 在本机线程启动时记录其动态工具目录。没有 `agents_wait` 创建的线程无法仅通过启用 Swarm 或升级 OpenClaw 来获得该读取器，因此收集器生成字段在该线程上仍然不可用。对于普通的解锁聊天，请使用 `/new` 或 `/reset` 开始使用当前工具。对于 [ 受监督、模型锁定的 Chat](/plugins/codex-supervision#branch-from-a-local-session)，打开 Control UI 的全局 **New Session** 页面并选择具体的 Codex- 支持模型以启动单独的普通会话。保持受监督聊天完好无损：`/new`、`/reset` 和父级链接的 **新聊天** 被阻止。新会话仍然需要允许这两种收集器工具的工具策略。

使用当前支持的 Codex 运行时，动态 OpenClaw 工具结果以 JSON 文本形式达到代码模式。在读取字段之前解析每个结果。 Codex 还序列化动态工具调用，因此 `Promise.all` 不会同时提交多个 `sessions_spawn` 调用。在有界循环中启动收集器子级。已被接受的孩子仍然可以在稍后提交启动时运行。

```javascript
function parseToolResult(value) {
  if (typeof value !== "string") return value;
  return JSON.parse(value);
}

const tasks = [
  "Check the authentication path.",
  "Check the storage path.",
  "Check the recovery path.",
];
const launches = [];
const failures = [];

for (const [index, task] of tasks.entries()) {
  const launch = parseToolResult(
    await tools.sessions_spawn({
      task,
      collect: true,
      label: `review-${index + 1}`,
    }),
  );
  if (launch.status !== "accepted") {
    failures.push({ task, error: launch.error ?? "Collector spawn was not accepted." });
    continue;
  }
  launches.push(launch);
}

const pending = new Set(launches.map((launch) => launch.runId));
const completed = [];

while (pending.size > 0) {
  const ids = [...pending].slice(0, 1000);
  const batch = parseToolResult(
    await tools.agents_wait({
      ids,
      timeoutSeconds: 30,
    }),
  );

  // Rotate this bounded window behind ids that have not been checked yet.
  for (const runId of ids) {
    if (pending.delete(runId)) pending.add(runId);
  }

  for (const item of batch.completed) {
    pending.delete(item.runId);
    if (item.status !== "done") {
      failures.push(item);
    } else {
      completed.push(item); // Process each result as soon as it finishes.
    }
  }

  for (const failure of batch.errors ?? []) {
    pending.delete(failure.runId);
    failures.push(failure);
  }
}

return { completed, failures };
```

在综合成功结果并报告失败之前，先清空待处理集。被拒绝的启动或失败的子项不得丢弃其他接受的子项的结果。保留返回的运行 ID 以供恢复。不要重复成功的启动或自动重新运行失败的工作。

每个 `agents_wait` 调用接受 1–1000 个运行 ID。使用 `awaitResults: true` 保持集合拥有，直到 **all** 授权请求的收集器解决，没有观察者轮询超时。与`timeoutSeconds`互斥；儿童和代理运行的截止日期、工具监管、取消和所有权检查仍然适用。在 OpenClaw 代码模式中，这也使得封闭单元成为必需，因此运行时（而不是重复的模型调用）等待注册表完成事件。普通调用保留其现有的首次完成和超时行为。

它返回：

```typescript
type AgentsWaitResult = {
  completed: Array<{
    runId: string;
    status: "done" | "failed" | "killed" | "timeout";
    result: string;
    structured?: unknown;
    error?: string;
    schemaError?: string;
    sessionKey: string;
    label?: string;
    usage?: { inputTokens: number; outputTokens: number };
  }>;
  pending: string[];
  errors?: Array<{
    runId: string;
    error: "not_found" | "not_owner";
  }>;
};
```

已完成的项目可以包含部分 `structured` 数据，并且当提供者或运行时随后失败时仍然具有 `status: "failed"`。在这种情况下，`error` 是权威终端故障。恢复代码应该首选非空白 `error`，然后是 `schemaError`，然后是非空白 `result`，最后是 run/status 回退。

个别失败的项目不会使混合 `agents_wait` 轮询成为顶级工具错误。轮询仍然是成功的 JSON 结果，因此调用者可以独立处理其 `completed`、`pending` 和 `errors` 数组。

当任何请求的子项已完成、至少一个挂起的子项完成、没有剩余有效的挂起 ID 或超时到期时，该调用会立即返回。传递已经完成的运行 ID 会再次返回相同的保存结果。只有生成会话或其授权的父链才能等待收集器。

这是有界长轮询，而不是繁忙状态循环。继续仅传递剩余的运行 ID，直到 `pending` 为空。收集器模式支持本机 OpenClaw 子代理。它不支持 ACP 运行时、线程绑定、可见会话或持久会话模式。

<a id="limits-and-roadmap" />

## <a id="limits"></a> 限制

Swarm 运行一次性收集器子代。不存在有状态的多轮工作线程 API。孩子们在其小组的 Swarm 通道中的本地网关上运行，并且生成没有云放置选项。保存的工作流程定义和图表 DSL 不属于 Swarm 当前方向的一部分。

## <a id="related"></a> 相关内容

- [JavaScript执行者的代码Mode](/tools/code-mode)和激活规则
- [子代理](/tools/subagents) 用于子策略、隔离和会话行为
- [多代理沙盒工具](/tools/multi-agent-sandbox-tools) 用于每个代理的限制
- [工具概览](/tools) 用于工具配置文件和策略路由。
