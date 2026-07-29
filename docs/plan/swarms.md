# Swarms — 代码模式中的 agent 扇出与编排

状态：已发布 — 已被 `docs/tools/swarm.md` 取代。本文档仍作为实现设计记录保留。

## 1. 什么以及为什么

**swarm** 是许多子代理通过代码模式脚本以确定性方式编排而成：扇出 N 个读取器，采用对抗性方式验证发现，通过有状态的优先级排序器进行综合，并在决策关卡上循环。控制流（`Promise.all`、`while`、`if`）_就是_ 编排本身——这里刻意**没有图 DSL、没有新模式、没有新的顶层工具表面**。

OpenClaw 代码模式（QuickJS-WASI、快照/恢复、桥接请求）是底层基质。一个已挂起的桥接调用会在 VM 快照、网关重启后继续存活，并且会精确恢复到停止的位置——这比日志重放设计更强，而且对脚本没有确定性约束。

命名：产品/文档名称是 **Swarm**。代码标识符保持字面不变：`agents.*` 客户端 API、`tools.swarm` 配置、`swarm` 分组列。

## 2. 决策（维护者，2026-07-17）

- 成本：强制配置上限；可选的每个 swarm 令牌预算。不设强制预算。
- 批准：子任务以 **fail-closed / non-interactive** 方式运行。需要批准的
  操作会被拒绝；拒绝结果会在子结果中报告；由脚本决定。不从 fan-out 中向操作员
  弹出提示轰炸。
- v1 仅限模型编写的临时脚本。已保存/命名的工作流、CLI/cron
  入口：后续再支持（无头代码模式已可用于 cron）。
- 子身份：默认通过 `tools.swarm.defaultAgentId`
  配置使用专用 worker agent（经现有子 agent 目标 allowlist 校验）；每次 spawn 可覆盖
  `agentId`。核心不捆绑任何 agent id；文档建议使用精简的 `worker` agent 配置。
- 不修改 Codex 源码。Codex harness 使用 spawn/wait 习语（§8）。

## 3. 架构概览

```
code-mode 脚本（QuickJS VM，gateway）          Codex V8 脚本（codex 进程）
  agents.run(...) ── parked bridge call           tools.sessions_spawn / tools.agents_wait
        │                                                │ item/tool/call RPC（每个 ≤600s）
        ▼                                                ▼
             CORE（与 harness 无关，本仓库）
  sessions_spawn {collect:true, outputSchema, fastMode, groupId}
  agents_wait {ids, timeoutSeconds}
        │
  subagent 注册表（SQLite）：collector 完成记录，swarm group id
        │
        children = ordinary subagent sessions（lane-capped, fail-closed approvals）
        │
        sessions.changed SSE ──► 控制 UI dots / sidebar / channel status message
```

一个统一的权威所有者负责 spawn/complete/settle 语义（核心工具 + 注册表）。
两种 await 传输方式：QuickJS 将 bridge call 无限期挂起（snapshot）；
Codex 通过有界 RPC 轮询 `agents_wait`。

## 4. 配置闸门（v1）

新的 `tools.swarm`（全局 + 按 agent 覆盖，合并模式与 `tools.codeMode` 相同）：

```jsonc
"tools": {
  "swarm": {
    "enabled": false,            // 主开关，默认关闭
    "maxConcurrent": 8,          // 同时运行的子任务数（swarm 车道上限）
    "maxChildrenPerGroup": 50,   // 每个 swarm 组的存活子任务数
    "maxTotalPerGroup": 200,     // 每个组的生命周期创建总数（失控保护）
    "waitTimeoutSecondsMax": 600,
    "defaultAgentId": ""         // 可选；当 spawn 未传 agentId 时使用的子 agent id
  }
}
```

- Zod：像 `CodeModeSchema` 一样使用 `boolean | strict object` 联合类型
  （`src/config/zod-schema.agent-runtime.ts`）；`swarm: true` → `{enabled: true}`。
- `src/config/types.tools.ts` 中的类型（包括按 agent 和顶层 `tools`），
  `schema.labels.ts` 中的标签，以及 `schema.help.runtime.ts` 中的帮助信息。
- 解析辅助函数 `resolveSwarmConfig(cfg, agentId)` 参照
  `resolveCodeModeConfig`（`src/agents/code-mode.ts:215`），并对所有数字做截断限制。
- 关闭时的闸门效果：`agents_wait` 工具不会出现在目录中；
  `sessions_spawn` 上的 `collect`/`outputSchema`/`fastMode`/`groupId` 参数会被拒绝，并给出明确错误，错误中需写明配置键。除此之外不改变任何行为。
- `defaultAgentId` 通过 `resolveSubagentAllowedTargetIds`
  （`src/agents/subagent-target-policy.ts`）进行校验；未知 id → 触发 spawn 错误，不回退。

## 5. 核心：collector-mode spawn + `agents_wait`（v1）

### 5.1 `sessions_spawn` 增补（全部仅在 swarm 启用时生效）

- `collect: boolean` — 为 true 时，子运行会以 `expectsCompletionMessage: false` 注册，并使用**collector 完成记录**，而不是 announcement/steering 交付。工具会立即返回 `{ runId, sessionKey }`。不绑定 channel/thread。
- `outputSchema: object` — JSON Schema。子任务会获得一个合成的 `structured_output` 工具，附加到其工具面板；系统提示附录会指示它恰好调用一次并传入最终结果。验证失败时，子任务会得到一次额外的 nudged retry；之后完成记录会携带 `structured: undefined`，以及原始文本和 `schemaError`。
- `fastMode: true | "auto" | false` — 通过 `resolveSubagentModelAndThinkingPlan`（`src/agents/subagent-spawn-plan.ts`）与 model/thinking 一起传入子会话补丁，使用现有的 `FastMode` 轴（`src/shared/fast-mode.ts`）。省略 = 继承。
- `groupId: string` — swarm 组标记。默认值为 `swarm:<requesterSessionKey>:<runId-of-requesting-run>`。持久化到 registry 记录和子会话行中。用于 cap、列表、批量归档以及 dots。
- `label: string` 已存在 — 会显示在 dots 和 `subagents list` 中。
- 子 agent id：`params.agentId` → 否则 `tools.swarm.defaultAgentId` → 否则请求方 agent（现有行为）。

### 5.2 审批 fail-closed

Collector 子任务运行时采用非交互式审批上下文：任何需要操作员审批的工具调用都会以结构化拒绝（`approval_required`）的形式返回给子任务，子任务应在其结果中报告该阻塞。实现方式：复用现有的 exec/tool approval policy 管线，并为 collector-mode 子运行强制使用 `deny` resolver。不会向操作员可见界面发出来自 collector 子任务的任何审批事件。

### 5.3 `agents_wait` 工具（新增，受控）

```
agents_wait({ ids: string[], timeoutSeconds?: number })
→ {
    completed: [{ runId, status: "done"|"failed"|"killed"|"timeout",
                  result: string, structured?: unknown, schemaError?: string,
                  sessionKey, label?, usage?: {inputTokens, outputTokens} }],
    pending: string[]
  }
```

- 一旦**至少有一个** id 完成就返回（first-completion / race 语义，支持流水线），或者在超时时返回 `completed: []`。
- `timeoutSeconds` 默认 30，并会被限制到 `waitTimeoutSecondsMax`。
- 幂等：已完成的 ids 会再次返回其记录（记录会保留到 group archive 之前）。未知 id → 按 id 返回错误条目，不抛出异常。
- 所有权：只有发起某个运行的会话（或其父链）才能等待它——与 code mode 中 `wait` 的所有权规则相同（`code-mode.ts:1684`）。
- registry：完成记录保存在现有的 subagent registry SQLite 存储（`subagent-registry.store.sqlite.ts`）中——新增字段，不新增 store，不进行 schema-version bump（仅增加列；见 §9 约束）。

### 5.4 Cap 执行

- `maxConcurrent`：collector 子任务运行在现有 subagent lane 上，但按 swarm group 计数；超过 cap 的 spawn 会 FIFO 排队（host 侧，在 spawn 路径中——立即返回 runId，运行会在有空位时启动）。
- `maxChildrenPerGroup` / `maxTotalPerGroup`：超过后 spawn 会以类型化错误拒绝；错误文本会注明配置键名。
- 深度：collector 子任务保持 `DEFAULT_SUBAGENT_MAX_SPAWN_DEPTH` 语义（子任务默认是叶子节点，除非显式配置了嵌套）。

## 6. 测试契约（v1，车道 A）

- 单元测试：配置解析/限幅；在禁用时的门控拒绝；groupId
  默认值；上限强制执行（排队 + 拒绝）；wait 竞态语义；wait
  幂等性；所有权拒绝；结构化输出校验 + 诱导重试 +
  schemaError 路径；fastMode 传入 session patch；defaultAgentId
  校验。
- 集成测试（vitest，模拟模型运行时）：启动 3 个 collector 子进程，循环
  调用 wait，断言最先完成的排序和最终清空；网关重启
  模拟：registry 重新加载 → wait 从持久化完成状态中解析返回。
- 所有测试同目录放置 `*.test.ts`；不调用真实模型。

## 7. QuickJS 客户端暴露面（lane B，core 之后）

- 安装在 `CONTROLLER_SOURCE` 中的客户端全局对象
  （`src/agents/code-mode.worker.ts:190-374`），保留名称添加到
  `code-mode-namespaces.ts` 中：
  - `agents.run(prompt, opts) → Promise<result|structured>` — 语法糖：
    collector spawn + 在专用桥接方法（`agentWait`）上的挂起等待，
    由宿主在完成时结算（无轮询；快照安全）。
  - `agents.session(system, opts) → Promise<handle>`;
    `handle.send(input, opts) → Promise<...>`；`handle.close()`.（v1.1 —
    在 `run()` 之后发布；使用 `mode:"session"` + 每轮 collector 记录。）
  - `phase(title)`, `log(message)` — 即发即忘的桥接通知 → swarm 进度事件。
- 添加到 `CodeModeBridgeMethod` 的桥接方法（`code-mode.ts:91`）：
  `agentSpawn`, `agentWait`, `swarmNote`。`agentSpawn`/`agentWait` 通过
  **构造即具备** 回放安全：幂等键 `(codeModeRunId, bridgeId)`
  存储在 registry 记录上；重启后根据持久化完成状态重新结算，
  且绝不会重复 spawn。
- 待处理的 `agentWait` 桥接调用会延长运行的快照 TTL（待处理的 agent 集合就是信号；无需标志位）。
- `API.read("agents.d.ts")` 虚拟文件记录了带类型的暴露面 + 扇出 / gate / cycle 习惯用法
  (`createCodeModeApiVirtualFiles`, `code-mode-namespaces.ts:876`)。

## 8. Codex 预投影（后续路径）

- `sessions_spawn`（带新参数）和 `agents_wait` 通过现有的动态工具桥接流转；在 Codex 代码模式脚本中，它们会自动以 `tools.*` 的形式出现（已验证：`codex-rs/code-mode/src/runtime/globals.rs:14-65`，`codex-rs/core/src/tools/spec_plan.rs:448-507`）。
- `agents_wait` 采用较长的动态工具超时类别（600 秒上限；`extensions/codex/src/app-server/dynamic-tool-execution.ts:37-39`），并被标记为 timeout/replay-safe。
- Codex 父级的组键：`swarm:<parentSessionKey>:<turnId>`。
- Codex 原生的 `spawn_agent` 子代理可共存；它们的 task-mirror 行会汇入同一个进度展示面板。

## 9. 持久化和保留

- 不新增存储。注册表记录扩展现有的 subagent 注册表
  SQLite 表；子项是普通的 `sessions` 行。仅允许追加列
  — **任何需要 SQLite schema-version 升级的更改都必须先获得维护者明确批准**（仓库政策）。
- 注册表记录上的 swarm group id + 子会话元数据。
- 保留：已完成的收集器记录持续保留，直到**组归档**：
  当父运行结束（或 TTL 到期）时，该组的子项会作为一个批次归档（扩展现有的 `DEFAULT_SUBAGENT_ARCHIVE_AFTER_MINUTES`
  扫描，使其按组执行）。

## 10. 进度表面（“点点”）— 后续泳道

- 隐式，由 harness 驱动。基于现有的 `sessions.changed` SSE +
  registry 派生；`phase`/`log` 注释增加语义。没有 agent 驱动的渲染。
- 控制 UI：工作区小组件家族中的 `swarm` 渲染器
  (`ui/src/lib/workspace/widgets/`) — 按 phase 分组的点阵、叙述者
  行、每个点的状态/标签/模型；侧边栏子树保持不变。
- 通道：每组一条限流后的已编辑状态消息（遵循
  `docs/concepts/streaming.md`；绝不发送每个子项消息）。

## 11. 实验室页面（控制 UI，独立分支）

设置 → **实验室**：实验性功能开关，首批条目为 **代码模式**
和 **蜂群**。每一行：名称、一行描述、文档链接、通过现有 `config.patch` RPC 连接的开关（RFC 7396 merge-patch — 设置
`tools.codeMode.enabled` / `tools.swarm.enabled`），以及在适用时显示“需要重启”
提示。可被发现，但文案需清楚表明其为实验性状态。i18n：所有字符串通过常规的 `en.ts` + 同步流水线。

## 12. 放置（后续）

- `placement` 在 spawn 上的选项：`"local"`（默认）| `"cloud:<profile>"`，通过
  现有的 worker-environment 分发（`sessions.dispatch`）；如果共享盒子 SSH 沙箱子进程被证明不足，后续再支持池化放置。
- Orchestrator VM 始终留在网关上；settle/dots/budget 对放置位置不敏感。

## 13. 非目标

- 不提供图形 DSL——控制流就是图本身（这是有意为之，并已记录）。
- 不对 Codex 源码做更改；不复用 Codex Code Mode 内部实现。
- v1 不提供已保存/命名的工作流；不提供 CLI 入口点。
- 不提供逐子任务的操作员审批上浮。
- 不在扇出规模下提供 1:1 云端预配。
- 不提供稳态运行时兼容适配层；swarm 是新的接口面，且受门控。

## 14. 构建阶段 / PR 切分

1. **通道 A（核心）**：§4 配置 + §5 spawn/wait/caps/approvals + §6 测试。
2. **通道 C（Labs 页面）**：§11 —— 独立，可先落地。
3. **通道 B（QuickJS 表面）**：§7 —— 在 A 合约落地之后。
4. 点状渲染器（§10）、Codex 投影（§8）、`agents.session`（§7 v1.1）、
   放置（§12）、用户文档重写 —— 按此顺序作为后续 PR。

每个 PR：CI 通过，`$autoreview` 干净，默认关闭并受门控，主分支可随时发布。
