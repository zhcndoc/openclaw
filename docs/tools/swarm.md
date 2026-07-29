---
summary: "使用带结构化结果、受限扇出和实时进度的 Code Mode 脚本协调并发子代理"
title: "群体"
sidebarTitle: "群体"
read_when:
  - 你想要一个 Code Mode 脚本将工作分发到多个代理
  - 你需要结构化的子结果、决策门控或先完成管线
  - 你正在启用或调整 tools.swarm 限制
  - 你想在聊天中观察 collector 子代理
---

Swarm 是一种实验性的、可选择启用的方式，用于从一个
[Code Mode](/tools/code-mode) 脚本协调多个子代理。使用普通的 JavaScript 或 TypeScript
控制流，例如 `Promise.all`、`while` 和 `if`，来分发工作、收集
结果并做出决策。

这里没有图形 DSL，也没有单独的工作流格式。程序本身就是
协调过程。Swarm 为该程序增加了可等待的 collector 子代理、结构化结果、
受限并发和进度报告。

## 启用 Swarm

推荐路径是在 Control UI 中选择 **设置 → 实验室 → Swarm**。切换会立即生效，并将 `tools.swarm.enabled` 写入你的
配置。

你也可以直接在 `openclaw.json` 中启用 Swarm：

```json5
{
  tools: {
    swarm: {
      enabled: true,
      maxConcurrent: 8,
      maxChildrenPerGroup: 50,
      maxTotalPerGroup: 200,
      waitTimeoutSecondsMax: 600,
      defaultAgentId: "",
    },
  },
}
```

使用布尔简写可通过所有其他值的默认值来启用或禁用该功能：

```json5
{
  tools: {
    swarm: true,
  },
}
```

| 字段                    | 默认值  | 描述                                                                                                                          |
| ----------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `enabled`               | `false` | 暴露 collector 模式的 spawn 选项、`agents_wait`，以及 Code Mode 的 `agents.*` guest API。                                    |
| `maxConcurrent`         | `8`     | 单个 swarm 组中同时运行的 collector 子进程最大数量。额外被接受的子进程将按 FIFO 顺序排队。                                   |
| `maxChildrenPerGroup`   | `50`    | 单个组中存活的 collector 子进程最大数量。                                                                                     |
| `maxTotalPerGroup`      | `200`   | 一个组在其生命周期内可生成的 collector 子进程最大总数。这是防止失控生成的最后一道防线。                                      |
| `waitTimeoutSecondsMax` | `600`   | 单次 `agents_wait` 调用可接受的最大超时时间。该调用的默认值为 30 秒。                                                         |
| `defaultAgentId`        | `""`    | 当 spawn 省略 `agentId` 时使用的目标 agent。空值表示使用发起请求的 agent。现有的子 agent allowlist 仍然适用。                 |

数值必须为正整数。OpenClaw 将 `maxConcurrent` 限制在 `1`–`1000`，`maxChildrenPerGroup` 限制在 `1`–`10000`，
`maxTotalPerGroup` 限制在 `1`–`100000`，并将 `waitTimeoutSecondsMax` 限制在
`1`–`86400`。

你可以为某个已配置的 agent 通过 `agents.entries.*.tools.swarm` 覆盖 Swarm 设置。每个 agent 的对象会与顶层
`tools.swarm` 对象进行合并。

## 要求

`agents.run`、`phase` 和 `log` guest globals 需要同时启用 Swarm 和
OpenClaw Code Mode：

```json5
{
  tools: {
    codeMode: true,
    swarm: true,
  },
}
```

Code Mode 还必须能够有效访问 `sessions_spawn`。工具配置文件、
allow/deny 策略、提供方规则以及沙箱策略都可能移除该工具。
如果脚本报告 `sessions_spawn` 不可用，请参阅 [Code Mode 激活](/tools/code-mode#activation) 和
[子代理](/tools/subagents)。

`defaultAgentId` 和每次运行的 `agentId` 值必须命名为请求方的
`subagents.allowAgents` 策略所允许的已配置目标。OpenClaw 会拒绝未知或被禁止的目标，而不会回退到其他代理。

## 编写 Swarm 脚本

当启用 Swarm 时，Code Mode 会暴露以下 guest API：

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

如果没有 `schema`，`agents.run()` 返回子任务的最终文本。若提供了 JSON Schema，则它返回通过子任务 `structured_output` 工具提交的值。失败、被终止、超时或 schema 无效的子任务都会以 `SwarmAgentError` 拒绝该 promise。请在 Code Mode 内通过 `API.read("agents.d.ts")` 阅读精确生成的声明和简短的编排惯用法。

使用 `label` 为 dashboard 和侧边栏中的子任务设置一个可识别的名称。在选项中使用 `phase` 可在该子任务开始前立即发布一个阶段，或者当多个子任务属于同一阶段时调用 `phase()`。`log()` 会发布简短的进度说明。进度调用是 fire-and-forget；如果 UI 不可用，它们不会延迟脚本。

### 并行分发并收集结构化结果

此示例会为每个主题启动一个研究员，等待所有结果完成，然后请求最终子任务综合这些结构化报告：

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
phase("独立审查");

const reports = await Promise.all(
  topics.map((topic) =>
    agents.run(`Review the ${topic} path. Return one finding with evidence.`, {
      label: `review-${topic}`,
      thinking: "high",
      fastMode: "auto",
      schema: reportSchema,
    }),
  ),
);

phase("综合");
log(`已收集 ${reports.length} 份独立报告。`);

return await agents.run(
  `Reconcile these reports and explain disagreements:\n${JSON.stringify(reports)}`,
  { label: "synthesis" },
);
```

`Promise.all` 是分发与汇聚的边界。OpenClaw 会为该组最多启动 `maxConcurrent` 个子任务，其余任务按提交顺序排队。

Code Mode 还会通过 `tools.codeMode.maxPendingToolCalls` 单独限制并发 guest bridge 调用数（默认 `16`，最大 `128`）。对于非常大的组，应在该限制之下分批启动，并为 `phase()`、`log()` 以及子任务等待状态转换留出余量。`maxConcurrent` 只限制正在运行的子任务；它不会提高 guest bridge 调用上限。

### 在决策门上循环

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
let decision = { ready: false, reason: "未检查", nextAction: "Review" };

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

### 处理最先完成的子任务

`agents.run()` 返回的是普通 promise，因此 `Promise.race` 可以对第一个 Code Mode 子任务做出反应。对于直接调用底层工具的 harness，`agents_wait` 提供了相同的首个完成边界：只要至少有一个请求的 run 完成，或者在有界超时到期时，它就会返回。完整的 drain 循环请参见 [从其他 harness 使用 Swarm](#use-swarm-from-other-harnesses)。

## 收集器子进程的行为

收集器子进程是普通的隔离子代理会话，但具有不同的完成路径。它们会为父级写入一个持久化的收集器结果，供父级等待，而不是把回复通告或引导回父级会话中。

目标代理按以下顺序解析：

1. `agentId`，来自 spawn 或 `agents.run()` 调用。
2. `tools.swarm.defaultAgentId`。
3. 请求该操作的代理。

当 swarm 子进程需要更小的工具集、更便宜的模型或更严格的沙箱策略时，专用的轻量 worker 代理会很有用。OpenClaw 不内置 `worker` 代理 id；在将其设为默认值之前，请先配置它。可以在该 worker 的按代理配置中设置 `tools.swarm: false` 来加固它，这样它仍可被 spawn，但不能从自己的顶层会话启动 swarm：

```json5
{
  tools: { swarm: { enabled: true, defaultAgentId: "worker" } },
  agents: {
    list: [
      {
        id: "main",
        default: true,
        subagents: { allowAgents: ["worker"] },
      },
      { id: "worker", tools: { swarm: false } },
    ],
  },
}
```

收集器审批默认失败关闭。子进程不会打开操作员审批提示。任何需要审批的工具操作都会被拒绝，子进程可以在其结果中报告该拒绝，以便脚本决定下一步怎么做。

对于结构化输出，OpenClaw 会向子进程添加一个合成的 `structured_output` 工具，并根据提供的 JSON Schema 验证其负载。无效或缺失的负载会得到一次纠正提示。如果重试后仍未通过验证，收集器完成结果会保留子进程的原始文本，保持 `structured` 未设置，并包含 `schemaError`。低层级的 `agents_wait` 结果会暴露这些字段，便于显式的恢复逻辑处理。

### 子进程是叶子节点

Swarm 子进程默认是叶子节点。通用的 `agents.defaults.subagents.maxSpawnDepth` 保护机制会阻止子进程在默认深度 `1` 下继续 spawn 自己的子进程。常见的编排方式是把工作返回给父级，而不是从子进程继续派生更多工作：

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

嵌套子代理是通过 `agents.defaults.subagents.maxSpawnDepth` 由操作员选择开启的，但不建议用于 Swarm。组级上限、预算和可观测性都假定收集器组是扁平结构。

每个子进程只有一个准入所有者。公告型和交互型子进程使用 `agents.defaults.subagents.maxChildrenPerAgent`（默认 `5`），且不计入收集器子进程。收集器子进程只使用 `maxChildrenPerGroup` 和 `maxTotalPerGroup`；它们不会消耗每会话的子进程预算。spawn 深度保护仍适用于这两种模式。

在准入之后，超过 `maxConcurrent` 的子进程会在各自的 swarm 组内按 FIFO 排队，并嵌套在全局子代理通道之中。这些并发层级是排队工作，而不是拒绝工作。超出任一组上限的收集器 spawn 会被拒绝，并在错误中包含相关的配置键。

## 观察群体

在群体运行期间，请在聊天中保持父会话打开。Control UI 以及原生 Android、iOS 和 macOS 聊天界面会在转录内容和编辑器之间显示一个紧凑的群体进度小部件，将每个活动的收集器组渲染为一个点，每个子项对应一个点，并显示排队中、运行中、已完成或失败状态。无障碍标签会标识每个子项及其状态；Control UI 还会将它们显示为点的工具提示。每个组中的所有子项都达到终止状态后，该小部件会消失。

会话侧边栏会保留正常的父/子树。展开父行即可检查某个收集器子项，或打开其转录内容，而不会丢失群体层级结构。

在其组被归档之前，收集器结果仍然可等待。每个成员都达到其保留截止时间后，OpenClaw 会将该组的子项作为一个批次进行归档，这样已完成的群体就不会继续留在活动会话树中。

## 在其他 harness 中使用 Swarm

你可以在不使用 OpenClaw Code Mode 的情况下使用 Swarm。其核心工具
与 harness 无关：使用 `sessions_spawn({ collect: true })` 启动收集器子进程，
并通过有界的 `agents_wait` 调用来回收它们。

Codex Code Mode 会自动将符合条件的动态 OpenClaw 工具暴露到
`tools.*` 下。它不使用 OpenClaw 的 QuickJS guest API，也不需要
`tools.codeMode`，但 `tools.swarm` 仍然必须启用。Codex harness 中的
`agents_wait` 调用支持完整的 600 秒超时。

在当前支持的 Codex 运行时中，动态 OpenClaw 工具结果会以 JSON 文本的形式
传递到 Code Mode。读取字段之前，先解析每个结果。Codex 还会串行化动态工具调用，
因此 `Promise.all` 不会并发提交多个 `sessions_spawn` 调用。请在有界循环中启动收集器；
已被接受的子进程仍可在后续启动请求提交时继续运行。

```javascript
function parseToolResult(value) {
  if (typeof value !== "string") return value;
  return JSON.parse(value);
}

const tasks = [
  "检查认证路径。",
  "检查存储路径。",
  "检查恢复路径。",
];
const launches = [];

for (const [index, task] of tasks.entries()) {
  const launch = parseToolResult(
    await tools.sessions_spawn({
      task,
      collect: true,
      label: `review-${index + 1}`,
    }),
  );
  if (launch.status !== "accepted") {
    throw new Error(launch.error ?? "收集器启动未被接受。");
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

  // 将这个有界窗口轮转到尚未检查过的 ids 后面。
  for (const runId of ids) {
    if (pending.delete(runId)) pending.add(runId);
  }

  for (const item of batch.completed) {
    pending.delete(item.runId);
    if (item.status !== "done") {
      throw new Error(item.schemaError ?? item.result ?? `${item.runId}: ${item.status}`);
    }
    completed.push(item); // 一旦每个结果完成，立即处理它。
  }

  for (const failure of batch.errors ?? []) {
    pending.delete(failure.runId);
    throw new Error(`${failure.runId}: ${failure.error}`);
  }
}

return completed;
```

每次 `agents_wait` 调用接受 1–1000 个 run id。它返回：

```typescript
type AgentsWaitResult = {
  completed: Array<{
    runId: string;
    status: "done" | "failed" | "killed" | "timeout";
    result: string;
    structured?: unknown;
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

当任一请求的子进程已经完成、至少一个待处理子进程完成、没有有效的待处理 id
剩余，或者超时到期时，调用会立即返回。已完成记录是幂等的，因此传入一个
已完成的 run id 会再次返回其结果。只有发起该子进程的会话，或其被授权的父链，
才能等待一个收集器。

这是一种有界长轮询，而不是忙等的状态循环。请持续只传入剩余的 run id，
直到 `pending` 为空。收集器模式支持原生 OpenClaw 子代理；它不支持 ACP 运行时、
线程绑定、可见会话或持久会话模式。

## 限制与路线图

Swarm v1 运行一次性收集器子进程；计划中的 `agents.session()` API
将添加有状态的多轮工作器。子进程目前在本地
Gateway 的子代理通道上运行；云端部署计划作为一个显式的创建选项提供。已保存的工作流定义和图 DSL 并不属于 Swarm
当前的发展方向。

## 相关

- [代码模式](/tools/code-mode) 用于 QuickJS 客户端运行时和激活规则
- [子代理](/tools/subagents) 用于子策略、隔离和会话行为
- [多代理沙盒工具](/tools/multi-agent-sandbox-tools) 用于每个代理的限制
- [工具概览](/tools) 用于工具配置文件和策略路由
