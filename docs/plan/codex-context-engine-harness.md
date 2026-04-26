---
title: "Codex Harness Context Engine Port"
summary: "为让捆绑的 Codex app-server harness 遵守 OpenClaw context-engine 插件的规范"
read_when:
  - 你正在将 context-engine 生命周期行为接入 Codex harness
  - 你需要 lossless-claw 或其他 context-engine 插件与 codex/* 内嵌 harness 会话协同工作
  - 你正在比较内嵌 PI 与 Codex app-server 的 context 行为
---

## Status

草案实现规范。

## Goal

使捆绑的 Codex app-server harness 遵守与内嵌 PI 回合已遵守的相同 OpenClaw context-engine
生命周期契约。

使用 `agents.defaults.embeddedHarness.runtime: "codex"` 或
`codex/*` 模型的会话，仍应让所选的 context-engine 插件（例如
`lossless-claw`）在 Codex app-server 边界允许的范围内，控制上下文组装、回合后摄取、维护以及
OpenClaw 级别的压缩策略。

## Non-goals

- 不重新实现 Codex app-server 内部机制。
- 不让 Codex 原生线程压缩生成 lossless-claw 摘要。
- 不要求非 Codex 模型使用 Codex harness。
- 不更改 ACP/acpx 会话行为。本规范仅适用于
  非 ACP 的内嵌 agent harness 路径。
- 不要求第三方插件注册 Codex app-server 扩展工厂；
  现有的捆绑插件信任边界保持不变。

## Current architecture

内嵌运行循环会在选择具体的底层 harness 之前，按每次运行解析一次已配置的 context engine：

- `src/agents/pi-embedded-runner/run.ts`
  - 初始化 context-engine 插件
  - 调用 `resolveContextEngine(params.config)`
  - 将 `contextEngine` 和 `contextTokenBudget` 传入
    `runEmbeddedAttemptWithBackend(...)`

`runEmbeddedAttemptWithBackend(...)` 会委托给所选的 agent harness：

- `src/agents/pi-embedded-runner/run/backend.ts`
- `src/agents/harness/selection.ts`

Codex app-server harness 由捆绑的 Codex 插件注册：

- `extensions/codex/index.ts`
- `extensions/codex/harness.ts`

Codex harness 实现接收与 PI-backed 尝试相同的
`EmbeddedRunAttemptParams`：

- `extensions/codex/src/app-server/run-attempt.ts`

这意味着所需的挂钩点位于 OpenClaw 控制的代码中。外部边界是 Codex app-server 协议本身：OpenClaw 可以控制它向
`thread/start`、`thread/resume` 和 `turn/start` 发送什么，也可以观察通知，
但不能改变 Codex 的内部线程存储或原生压缩器。

## Current gap

内嵌 PI 尝试会直接调用 context-engine 生命周期：

- 在尝试前进行 bootstrap/maintenance
- 在模型调用前进行 assemble
- 在尝试后进行 afterTurn 或 ingest
- 在成功回合后进行 maintenance
- 对拥有压缩职责的 engine 执行 context-engine compaction

相关 PI 代码：

- `src/agents/pi-embedded-runner/run/attempt.ts`
- `src/agents/pi-embedded-runner/run/attempt.context-engine-helpers.ts`
- `src/agents/pi-embedded-runner/context-engine-maintenance.ts`

而 Codex app-server 尝试当前只运行通用 agent-harness 钩子并镜像转录内容，但不会调用
`params.contextEngine.bootstrap`、`params.contextEngine.assemble`、`params.contextEngine.afterTurn`、
`params.contextEngine.ingestBatch`、`params.contextEngine.ingest` 或
`params.contextEngine.maintain`。

相关 Codex 代码：

- `extensions/codex/src/app-server/run-attempt.ts`
- `extensions/codex/src/app-server/thread-lifecycle.ts`
- `extensions/codex/src/app-server/event-projector.ts`
- `extensions/codex/src/app-server/compact.ts`

## Desired behavior

对于 Codex harness 的回合，OpenClaw 应保留如下生命周期：

1. 读取镜像化的 OpenClaw 会话转录。
2. 当存在先前的会话文件时，bootstrap 当前 context engine。
3. 在可用时运行 bootstrap maintenance。
4. 使用当前 context engine 组装上下文。
5. 将组装后的上下文转换为与 Codex 兼容的输入。
6. 使用包含任何 context-engine `systemPromptAddition` 的开发者指令，启动或恢复 Codex 线程。
7. 使用组装后的面向用户提示启动 Codex 回合。
8. 将 Codex 结果镜像回 OpenClaw 转录。
9. 如果实现了 `afterTurn`，则调用它；否则调用 `ingestBatch`/`ingest`，并使用镜像后的转录快照。
10. 在成功且未中止的回合后运行 turn maintenance。
11. 保留 Codex 原生压缩信号和 OpenClaw 压缩钩子。

## Design constraints

### Codex app-server remains canonical for native thread state

Codex 拥有其原生线程以及任何内部扩展历史。OpenClaw 不应尝试通过受支持协议调用之外的方式去修改 app-server 的内部历史。

OpenClaw 的转录镜像仍是 OpenClaw 功能的数据源：

- 聊天历史
- 搜索
- `/new` 和 `/reset` 记账
- 未来的模型或 harness 切换
- context-engine 插件状态

### Context engine assembly must be projected into Codex inputs

context-engine 接口返回的是 OpenClaw `AgentMessage[]`，而不是 Codex 线程补丁。Codex app-server `turn/start` 接受当前用户输入，而 `thread/start` 和 `thread/resume` 接受开发者指令。

因此实现需要一个投影层。安全的第一版应避免假装自己可以替换 Codex 内部历史。它应将组装后的上下文作为确定性的提示/开发者指令材料注入到当前回合周围。

### Prompt-cache stability matters

对于像 lossless-claw 这样的 engine，组装后的上下文应在输入不变时保持确定性。不要在生成的上下文文本中添加时间戳、随机 id，或非确定性的排序。

### PI fallback semantics do not change

harness 选择保持不变：

- `runtime: "pi"` 强制使用 PI
- `runtime: "codex"` 选择已注册的 Codex harness
- `runtime: "auto"` 允许插件 harness 声明支持的 provider
- `fallback: "none"` 在没有插件 harness 匹配时禁用 PI 回退

此项工作只改变在选择了 Codex harness 之后发生的行为。

## Implementation plan

### 1. 导出或移动可复用的 context-engine 尝试辅助函数

目前可复用的生命周期辅助函数位于 PI runner 下：

- `src/agents/pi-embedded-runner/run/attempt.context-engine-helpers.ts`
- `src/agents/pi-embedded-runner/run/attempt.prompt-helpers.ts`
- `src/agents/pi-embedded-runner/context-engine-maintenance.ts`

如果可避免，Codex 不应从一个名字暗示 PI 的实现路径导入。

创建一个与 harness 无关的模块，例如：

- `src/agents/harness/context-engine-lifecycle.ts`

移动或重新导出：

- `runAttemptContextEngineBootstrap`
- `assembleAttemptContextEngine`
- `finalizeAttemptContextEngineTurn`
- `buildAfterTurnRuntimeContext`
- `buildAfterTurnRuntimeContextFromUsage`
- 一个围绕 `runContextEngineMaintenance` 的小包装器

通过从旧文件重新导出或在同一 PR 中更新 PI 调用点，保持 PI 导入可用。

这些中性辅助函数名不应提及 PI。

建议名称：

- `bootstrapHarnessContextEngine`
- `assembleHarnessContextEngine`
- `finalizeHarnessContextEngineTurn`
- `buildHarnessContextEngineRuntimeContext`
- `runHarnessContextEngineMaintenance`

### 2. 添加 Codex context 投影辅助函数

添加一个新模块：

- `extensions/codex/src/app-server/context-engine-projection.ts`

职责：

- 接受组装后的 `AgentMessage[]`、原始镜像历史和当前提示。
- 判断哪些 context 应进入开发者指令，哪些应进入当前用户输入。
- 保留当前用户提示作为最终可执行请求。
- 以稳定、明确的格式渲染先前消息。
- 避免易变元数据。

建议 API：

```ts
export type CodexContextProjection = {
  developerInstructionAddition?: string;
  promptText: string;
  assembledMessages: AgentMessage[];
  prePromptMessageCount: number;
};

export function projectContextEngineAssemblyForCodex(params: {
  assembledMessages: AgentMessage[];
  originalHistoryMessages: AgentMessage[];
  prompt: string;
  systemPromptAddition?: string;
}): CodexContextProjection;
```

推荐的首版投影：

- 将 `systemPromptAddition` 放入开发者指令。
- 将组装后的转录上下文放在 `promptText` 中当前提示之前。
- 清楚标注其为 OpenClaw 组装的上下文。
- 保留当前提示在最后。
- 如果当前用户提示已经出现在尾部，则排除重复项。

示例 prompt 形状：

```text
OpenClaw 为本回合组装的上下文：

<conversation_context>
[user]
...

[assistant]
...
</conversation_context>

当前用户请求：
...
```

这不如原生 Codex 历史操作优雅，但它可以在 OpenClaw 内实现，并保留 context-engine 语义。

未来改进：如果 Codex app-server 暴露了用于替换或补充线程历史的协议，则将此投影层切换为使用该 API。

### 3. 在 Codex thread 启动前接入 bootstrap

在 `extensions/codex/src/app-server/run-attempt.ts` 中：

- 像现在一样读取镜像的会话历史。
- 确定会话文件在本次运行前是否存在。优先使用一个辅助函数，在镜像写入前检查 `fs.stat(params.sessionFile)`。
- 如辅助函数需要，则打开 `SessionManager` 或使用一个窄化的 session manager 适配器。
- 当 `params.contextEngine` 存在时，调用中性的 bootstrap 辅助函数。

伪流程：

```ts
const hadSessionFile = await fileExists(params.sessionFile);
const sessionManager = SessionManager.open(params.sessionFile);
const historyMessages = sessionManager.buildSessionContext().messages;

await bootstrapHarnessContextEngine({
  hadSessionFile,
  contextEngine: params.contextEngine,
  sessionId: params.sessionId,
  sessionKey: sandboxSessionKey,
  sessionFile: params.sessionFile,
  sessionManager,
  runtimeContext: buildHarnessContextEngineRuntimeContext(...),
  runMaintenance: runHarnessContextEngineMaintenance,
  warn,
});
```

使用与 Codex 工具桥和转录镜像相同的 `sessionKey` 约定。目前 Codex 会根据 `params.sessionKey` 或 `params.sessionId` 计算 `sandboxSessionKey`；除非有理由保留原始 `params.sessionKey`，否则应始终如一地使用它。

### 4. 在 `thread/start` / `thread/resume` 和 `turn/start` 前接入 assemble

在 `runCodexAppServerAttempt` 中：

1. 先构建动态工具，以便 context engine 能看到实际可用的工具名。
2. 读取镜像的会话历史。
3. 当 `params.contextEngine` 存在时运行 context-engine `assemble(...)`。
4. 将组装结果投影为：
   - 开发者指令补充
   - `turn/start` 的 prompt 文本

现有的钩子调用：

```ts
resolveAgentHarnessBeforePromptBuildResult({
  prompt: params.prompt,
  developerInstructions: buildDeveloperInstructions(params),
  messages: historyMessages,
  ctx: hookContext,
});
```

应变为 context-aware：

1. 使用 `buildDeveloperInstructions(params)` 计算基础开发者指令
2. 应用 context-engine 的 assembly/projection
3. 运行 `before_prompt_build`，输入投影后的 prompt / 开发者指令

这个顺序能让通用 prompt 钩子看到 Codex 实际将接收的同一份 prompt。若需要严格 PI 对齐，则应在钩子组合之前运行 context-engine assemble，因为 PI 会在其 prompt 管线之后，将 context-engine 的 `systemPromptAddition` 应用到最终 system prompt。关键不变量是：context engine 和钩子都应获得确定且有文档记录的顺序。

首个实现建议顺序：

1. `buildDeveloperInstructions(params)`
2. context-engine `assemble()`
3. 将 `systemPromptAddition` 追加/前置到开发者指令
4. 将组装后的消息投影为 prompt 文本
5. `resolveAgentHarnessBeforePromptBuildResult(...)`
6. 将最终开发者指令传给 `startOrResumeThread(...)`
7. 将最终 prompt 文本传给 `buildTurnStartParams(...)`

本规范应写入测试，以便未来更改不会意外重新排序。

### 5. 保持 prompt-cache 稳定格式

投影辅助函数必须针对相同输入产生字节级稳定输出：

- 稳定的消息顺序
- 稳定的角色标签
- 不生成时间戳
- 不泄露对象键顺序
- 不使用每次运行不同的 id
- 不使用随机分隔符

使用固定分隔符和明确区块。

### 6. 在转录镜像之后接入 post-turn

Codex 的 `CodexAppServerEventProjector` 会为当前回合构建一个本地 `messagesSnapshot`。
`mirrorTranscriptBestEffort(...)` 会将该快照写入 OpenClaw 的转录镜像。

在镜像成功或失败之后，都使用可获得的最佳消息快照调用 context-engine finalizer：

- 优先在写入后使用完整的镜像会话上下文，因为 `afterTurn` 需要的是会话快照，而不仅是当前回合。
- 如果无法重新打开会话文件，则退回到 `historyMessages + result.messagesSnapshot`。

伪流程：

```ts
const prePromptMessageCount = historyMessages.length;
await mirrorTranscriptBestEffort(...);
const finalMessages = readMirroredSessionHistoryMessages(params.sessionFile)
  ?? [...historyMessages, ...result.messagesSnapshot];

await finalizeHarnessContextEngineTurn({
  contextEngine: params.contextEngine,
  promptError: Boolean(finalPromptError),
  aborted: finalAborted,
  yieldAborted,
  sessionIdUsed: params.sessionId,
  sessionKey: sandboxSessionKey,
  sessionFile: params.sessionFile,
  messagesSnapshot: finalMessages,
  prePromptMessageCount,
  tokenBudget: params.contextTokenBudget,
  runtimeContext: buildHarnessContextEngineRuntimeContextFromUsage({
    attempt: params,
    workspaceDir: effectiveWorkspace,
    agentDir,
    tokenBudget: params.contextTokenBudget,
    lastCallUsage: result.attemptUsage,
    promptCache: result.promptCache,
  }),
  runMaintenance: runHarnessContextEngineMaintenance,
  sessionManager,
  warn,
});
```

如果镜像失败，仍然要使用回退快照调用 `afterTurn`，但应记录 context engine 正在从回退的回合数据摄取。

### 7. 标准化 usage 和 prompt-cache 运行时上下文

Codex 结果在可用时会包含来自 app-server token 通知的标准化 usage。将该 usage 传入 context-engine 运行时上下文。

如果 Codex app-server 将来暴露缓存读/写细节，则将其映射到 `ContextEnginePromptCacheInfo`。在此之前，不要凭空填入 0，而应省略 `promptCache`。

### 8. 压缩策略

存在两套压缩系统：

1. OpenClaw context-engine `compact()`
2. Codex app-server 原生 `thread/compact/start`

不要悄悄将它们混为一谈。

#### `/compact` 和显式 OpenClaw 压缩

当所选 context engine 的 `info.ownsCompaction === true` 时，显式 OpenClaw 压缩应优先使用 context engine 的 `compact()` 结果来处理 OpenClaw 转录镜像和插件状态。

当所选 Codex harness 拥有原生线程绑定时，也可以额外请求 Codex 原生压缩，以保持 app-server 线程健康，但这必须在 details 中作为单独的后端动作报告。

建议行为：

- 如果 `contextEngine.info.ownsCompaction === true`：
  - 先调用 context-engine `compact()`
  - 然后在存在线程绑定时尽最大努力调用 Codex 原生压缩
  - 将 context-engine 结果作为主要结果返回
  - 在 `details.codexNativeCompaction` 中包含 Codex 原生压缩状态
- 如果活动 context engine 不拥有压缩职责：
  - 保留当前 Codex 原生压缩行为

这很可能需要修改 `extensions/codex/src/app-server/compact.ts`，或者从通用压缩路径对其进行包装，具体取决于
`maybeCompactAgentHarnessSession(...)` 的调用位置。

#### 回合内 Codex 原生 contextCompaction 事件

Codex 可能在回合期间发出 `contextCompaction` item 事件。保持当前在 `event-projector.ts` 中的前/后压缩钩子发射，但不要将其视为已完成的 context-engine 压缩。

对于拥有压缩职责的 engine，如果 Codex 仍然执行原生压缩，请发出明确的诊断：

- stream/event 名称：现有的 `compaction` stream 即可
- details：`{ backend: "codex-app-server", ownsCompaction: true }`

这样可以让职责拆分可审计。

### 9. 会话重置与绑定行为

现有的 Codex harness `reset(...)` 会从 OpenClaw 会话文件中清除 Codex app-server 绑定。请保留该行为。

同时确保 context-engine 状态清理继续通过现有的 OpenClaw 会话生命周期路径进行。除非当前 context-engine 生命周期对所有 harness 都遗漏了 reset/delete 事件，否则不要添加 Codex 特定清理。

### 10. 错误处理

遵循 PI 语义：

- bootstrap 失败：发出警告并继续
- assemble 失败：发出警告并回退到未组装的管线消息 / prompt
- afterTurn/ingest 失败：发出警告并将回合后最终化标记为不成功
- maintenance 仅在成功、未中止、未 yield 的回合后运行
- 压缩错误不应作为新的 prompt 重试

Codex 特定补充：

- 如果 context 投影失败，发出警告并回退到原始 prompt。
- 如果转录镜像失败，仍尝试使用回退消息进行 context-engine 最终化。
- 如果在 context-engine 压缩成功后 Codex 原生压缩失败，当 context engine 是主路径时，不要让整个 OpenClaw 压缩失败。

## 测试计划

### 单元测试

在 `extensions/codex/src/app-server` 下添加测试：

1. `run-attempt.context-engine.test.ts`
   - 当会话文件存在时，Codex 调用 `bootstrap`。
   - Codex 使用镜像消息、token 预算、工具名称、引用模式、模型 id 和 prompt 调用 `assemble`。
   - `systemPromptAddition` 会包含在开发者指令中。
   - 组装后的消息会在当前请求之前投影到 prompt 中。
   - Codex 在转录镜像之后调用 `afterTurn`。
   - 在没有 `afterTurn` 的情况下，Codex 调用 `ingestBatch` 或按消息逐条调用 `ingest`。
   - 成功回合后会运行回合维护。
   - 在 prompt 错误、abort 或 yield abort 时不会运行回合维护。

2. `context-engine-projection.test.ts`
   - 相同输入应有稳定输出
   - 当组装后的历史中已包含当前 prompt 时，不应重复当前 prompt
   - 处理空历史
   - 保持角色顺序
   - 仅在开发者指令中包含系统 prompt 附加内容

3. `compact.context-engine.test.ts`
   - 所属 context engine 的主要结果获胜
   - 当 Codex 原生压缩也被尝试时，Codex 原生压缩状态会出现在详情中
   - Codex 原生失败不会导致所属 context-engine 压缩失败
   - 非所属 context engine 保留当前原生压缩行为

### 需要更新的现有测试

- `extensions/codex/src/app-server/run-attempt.test.ts`，如果存在；否则更新最近的 Codex app-server 运行测试。
- 仅当压缩事件详情发生变化时，更新 `extensions/codex/src/app-server/event-projector.test.ts`。
- `src/agents/harness/selection.test.ts` 通常不需要修改，除非配置行为发生变化；它应保持稳定。
- PI context-engine 测试应继续保持不变并通过。

### 集成 / 线上测试

添加或扩展 Codex harness 的冒烟线上测试：

- 将 `plugins.slots.contextEngine` 配置为测试引擎
- 将 `agents.defaults.model` 配置为 `codex/*` 模型
- 将 `agents.defaults.embeddedHarness.runtime` 配置为 `"codex"`
- 断言测试引擎观察到了：
  - bootstrap
  - assemble
  - afterTurn 或 ingest
  - maintenance

避免在 OpenClaw 核心测试中依赖 lossless-claw。使用一个小型、仓库内的伪 context engine 插件。

## 可观测性

为 Codex context-engine 生命周期调用添加调试日志：

- `codex context engine bootstrap started/completed/failed`
- `codex context engine assemble applied`
- `codex context engine finalize completed/failed`
- `codex context engine maintenance skipped` 并附带原因
- `codex native compaction completed alongside context-engine compaction`

避免记录完整 prompt 或转录内容。

在合适的地方添加结构化字段：

- `sessionId`
- `sessionKey`，按现有日志实践进行脱敏或省略
- `engineId`
- `threadId`
- `turnId`
- `assembledMessageCount`
- `estimatedTokens`
- `hasSystemPromptAddition`

## 迁移 / 兼容性

这应该保持向后兼容：

- 如果未配置 context engine，传统的 context engine 行为应与当前 Codex harness 行为等价。
- 如果 context-engine `assemble` 失败，Codex 应继续使用原始 prompt 路径。
- 现有的 Codex thread 绑定应继续有效。
- 动态工具指纹不应包含 context-engine 输出；否则每次 context 变化都可能强制创建新的 Codex thread。只有工具目录应影响动态工具指纹。

## 未决问题

1. 组装后的上下文应该完全注入到 user prompt 中、完全注入到 developer instructions 中，还是拆分注入？

   建议：拆分。将 `systemPromptAddition` 放入 developer instructions；将组装后的转录上下文放入 user prompt 包装中。这最符合当前 Codex 协议，同时不修改原生 thread 历史。

2. 当 context engine 负责压缩时，是否应禁用 Codex 原生压缩？

   建议：不应，至少当前不应。Codex 原生压缩可能仍然是维持 app-server thread 存活所必需的。但它必须被报告为原生 Codex 压缩，而不是 context-engine 压缩。

3. `before_prompt_build` 应该在 context-engine assembly 之前还是之后运行？

   建议：对 Codex 来说在 context-engine projection 之后运行，这样通用 harness 钩子看到的是 Codex 实际将接收的 prompt/developer instructions。如果 PI 对等性要求相反，则把所选顺序编码到测试中并在此处记录。

4. Codex app-server 未来是否可以接受结构化的 context/history 覆盖？

   未知。如果可以，则用该协议替换文本投影层，并保持生命周期调用不变。

## 验收标准

- 一个 `codex/*` embedded harness 回合会调用所选 context engine 的 assemble 生命周期。
- context-engine 的 `systemPromptAddition` 会影响 Codex 开发者指令。
- 组装后的上下文会以确定性方式影响 Codex 回合输入。
- 成功的 Codex 回合会调用 `afterTurn` 或 ingest 回退。
- 成功的 Codex 回合会运行 context-engine 的回合维护。
- 失败 / 中止 / yield-aborted 的回合不会运行回合维护。
- 由 context-engine 负责的压缩对 OpenClaw / 插件状态仍然是主路径。
- Codex 原生压缩仍可作为原生 Codex 行为被审计。
- 现有 PI context-engine 行为保持不变。
- 当未选择非传统的 context engine，或 assembly 失败时，现有 Codex harness 行为保持不变。
