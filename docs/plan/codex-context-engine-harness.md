---
title: "Codex Harness Context Engine Port"
summary: "使捆绑的 Codex app-server harness 支持 OpenClaw context-engine 插件的规范"
read_when:
  - 当你正在将 context-engine 生命周期行为接入 Codex harness 时
  - 当你需要 lossless-claw 或其他 context-engine 插件与 codex/* 内嵌 harness 会话协同工作时
  - 当你在比较内嵌 PI 和 Codex app-server 的 context 行为时
---

## 状态

草案实现规范。

## 目标

让捆绑的 Codex app-server harness 遵循与内嵌 PI turn 已经遵循的相同 OpenClaw context-engine
生命周期契约。

使用 `agents.defaults.embeddedHarness.runtime: "codex"` 或 `codex/*` 模型的会话，仍应让所选的 context-engine 插件（例如
`lossless-claw`）在 Codex app-server 边界允许的范围内，控制 context 组装、turn 后 ingest、维护，以及
OpenClaw 级别的压缩策略。

## 非目标

- 不要重新实现 Codex app-server 内部机制。
- 不要让 Codex 原生线程压缩生成 lossless-claw 摘要。
- 不要要求非 Codex 模型使用 Codex harness。
- 不要更改 ACP/acpx 会话行为。本规范仅适用于
  非 ACP 的内嵌 agent harness 路径。
- 不要让第三方插件注册 Codex app-server 扩展工厂；
  现有的捆绑插件信任边界保持不变。

## 当前架构

内嵌运行循环在选择具体的底层 harness 之前，会在每次 run 中解析一次已配置的 context engine：

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

Codex harness 实现接收与 PI-backed attempt 相同的 `EmbeddedRunAttemptParams`：

- `extensions/codex/src/app-server/run-attempt.ts`

这意味着所需的 hook 点位于 OpenClaw 控制的代码中。外部边界是 Codex app-server 协议本身：OpenClaw 可以控制发送给
`thread/start`、`thread/resume` 和 `turn/start` 的内容，并且可以观察通知，但不能改变 Codex 的内部 thread store 或原生 compactor。

## 当前缺口

内嵌 PI attempt 直接调用 context-engine 生命周期：

- 在 attempt 之前进行 bootstrap/maintenance
- 在模型调用之前进行 assemble
- 在 attempt 之后进行 afterTurn 或 ingest
- 在成功 turn 之后进行 maintenance
- 对拥有压缩能力的引擎执行 context-engine compaction

相关 PI 代码：

- `src/agents/pi-embedded-runner/run/attempt.ts`
- `src/agents/pi-embedded-runner/run/attempt.context-engine-helpers.ts`
- `src/agents/pi-embedded-runner/context-engine-maintenance.ts`

当前 Codex app-server attempt 只运行通用 agent-harness hooks 并镜像 transcript，但不会调用
`params.contextEngine.bootstrap`、`params.contextEngine.assemble`、`params.contextEngine.afterTurn`、`params.contextEngine.ingestBatch`、
`params.contextEngine.ingest` 或 `params.contextEngine.maintain`。

相关 Codex 代码：

- `extensions/codex/src/app-server/run-attempt.ts`
- `extensions/codex/src/app-server/thread-lifecycle.ts`
- `extensions/codex/src/app-server/event-projector.ts`
- `extensions/codex/src/app-server/compact.ts`

## 期望行为

对于 Codex harness turns，OpenClaw 应保留如下生命周期：

1. 读取镜像的 OpenClaw session transcript。
2. 当存在先前的 session 文件时，bootstrap 活跃的 context engine。
3. 在可用时运行 bootstrap maintenance。
4. 使用活跃的 context engine 组装 context。
5. 将组装后的 context 转换为 Codex 兼容输入。
6. 使用包含任意 context-engine `systemPromptAddition` 的 developer instructions 启动或恢复 Codex thread。
7. 使用组装后的面向用户的 prompt 启动 Codex turn。
8. 将 Codex 结果镜像回 OpenClaw transcript。
9. 如果实现了 `afterTurn`，则调用它；否则调用 `ingestBatch`/`ingest`，并使用镜像后的 transcript 快照。
10. 在成功且非中止的 turn 之后运行 turn maintenance。
11. 保留 Codex 原生 compaction 信号和 OpenClaw compaction hook。

## 设计约束

### Codex app-server 对原生 thread 状态仍然是权威来源

Codex 拥有其原生 thread 和任何内部扩展历史。OpenClaw 不应尝试通过支持的协议调用之外的方式去修改 app-server 的内部历史。

OpenClaw 的 transcript 镜像仍然是 OpenClaw 功能的来源：

- 聊天历史
- 搜索
- `/new` 和 `/reset` 账务
- 未来的模型或 harness 切换
- context-engine 插件状态

### context engine assembly 必须投影到 Codex 输入中

context-engine 接口返回的是 OpenClaw `AgentMessage[]`，而不是 Codex thread patch。Codex app-server 的 `turn/start` 接受当前 user 输入，而 `thread/start` 和 `thread/resume` 接受 developer instructions。

因此实现需要一个投影层。安全的首个版本应该避免假装它能替换 Codex 的内部历史。它应该把组装后的 context 作为确定性的 prompt/developer-instruction 材料，围绕当前 turn 注入。

### prompt-cache 稳定性很重要

对于像 lossless-claw 这样的引擎，组装后的 context 应在输入不变时保持确定性。不要在生成的 context 文本中加入时间戳、随机 id 或非确定性的顺序。

### PI fallback 语义不变

harness 选择保持原样：

- `runtime: "pi"` 强制使用 PI
- `runtime: "codex"` 选择已注册的 Codex harness
- `runtime: "auto"` 允许插件 harness 声明支持的 provider
- `fallback: "none"` 在没有插件 harness 匹配时禁用 PI fallback

本工作改变的是 Codex harness 被选中之后发生的事情。

## 实现计划

### 1. 导出或重定位可复用的 context-engine attempt helpers

目前可复用的生命周期 helpers 位于 PI runner 下：

- `src/agents/pi-embedded-runner/run/attempt.context-engine-helpers.ts`
- `src/agents/pi-embedded-runner/run/attempt.prompt-helpers.ts`
- `src/agents/pi-embedded-runner/context-engine-maintenance.ts`

如果可以避免，Codex 不应从一个名字暗示 PI 的实现路径中导入。

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

中性 helper 名称不应提及 PI。

建议名称：

- `bootstrapHarnessContextEngine`
- `assembleHarnessContextEngine`
- `finalizeHarnessContextEngineTurn`
- `buildHarnessContextEngineRuntimeContext`
- `runHarnessContextEngineMaintenance`

### 2. 添加 Codex context 投影 helper

添加一个新模块：

- `extensions/codex/src/app-server/context-engine-projection.ts`

职责：

- 接收组装后的 `AgentMessage[]`、原始镜像历史和当前 prompt。
- 确定哪些 context 应放入 developer instructions，哪些应放入当前 user 输入。
- 将当前 user prompt 作为最终可执行请求保留。
- 以稳定、明确的格式渲染先前消息。
- 避免易变的元数据。

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

- 将 `systemPromptAddition` 放入 developer instructions。
- 将组装后的 transcript context 放在 `promptText` 中当前 prompt 之前。
- 明确标注为 OpenClaw 组装的 context。
- 保持当前 prompt 在最后。
- 如果当前 user prompt 已经出现在尾部，则排除重复项。

示例 prompt 形状：

```text
OpenClaw 组装的本次 turn context：

<conversation_context>
[user]
...

[assistant]
...
</conversation_context>

当前用户请求：
...
```

这不如原生 Codex history 手术优雅，但可以在 OpenClaw 内部实现，并保留 context-engine 语义。

未来改进：如果 Codex app-server 暴露了用于替换或补充 thread history 的协议，就切换该投影层去使用那个 API。

### 3. 在 Codex thread 启动前接入 bootstrap

在 `extensions/codex/src/app-server/run-attempt.ts` 中：

- 像现在一样读取镜像后的 session history。
- 确定本次 run 前 session 文件是否已经存在。优先使用在镜像写入前检查 `fs.stat(params.sessionFile)` 的 helper。
- 打开 `SessionManager`，或者如果 helper 需要，则使用一个窄接口的 session manager 适配器。
- 当 `params.contextEngine` 存在时，调用中性 bootstrap helper。

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

使用与 Codex tool bridge 和 transcript mirror 相同的 `sessionKey` 约定。目前 Codex 会从 `params.sessionKey` 或 `params.sessionId` 计算 `sandboxSessionKey`；除非有理由保留原始 `params.sessionKey`，否则应始终一致使用它。

### 4. 在 `thread/start` / `thread/resume` 和 `turn/start` 之前接入 assemble

在 `runCodexAppServerAttempt` 中：

1. 先构建动态 tools，这样 context engine 能看到实际可用的工具名称。
2. 读取镜像后的 session history。
3. 当 `params.contextEngine` 存在时运行 context-engine `assemble(...)`。
4. 将组装结果投影为：
   - developer instruction addition
   - `turn/start` 的 prompt text

现有 hook 调用：

```ts
resolveAgentHarnessBeforePromptBuildResult({
  prompt: params.prompt,
  developerInstructions: buildDeveloperInstructions(params),
  messages: historyMessages,
  ctx: hookContext,
});
```

应变为 context-aware：

1. 使用 `buildDeveloperInstructions(params)` 计算基础 developer instructions
2. 应用 context-engine assembly/projection
3. 运行 `before_prompt_build`，传入投影后的 prompt/developer instructions

这个顺序让通用 prompt hooks 看到 Codex 实际将接收的同一 prompt。若需要严格的 PI parity，则在 hook 组合之前运行 context-engine assembly，因为 PI 会在其 prompt pipeline 之后将 context-engine `systemPromptAddition` 应用于最终 system prompt。关键不变量是：context engine 和 hooks 都应获得确定且有文档说明的顺序。

首个实现推荐顺序：

1. `buildDeveloperInstructions(params)`
2. context-engine `assemble()`
3. 将 `systemPromptAddition` 追加/前置到 developer instructions
4. 将组装后的 messages 投影到 prompt text
5. `resolveAgentHarnessBeforePromptBuildResult(...)`
6. 将最终 developer instructions 传给 `startOrResumeThread(...)`
7. 将最终 prompt text 传给 `buildTurnStartParams(...)`

该规范应编码进测试中，避免未来无意中重新排序。

### 5. 保持 prompt-cache 稳定格式

投影 helper 对相同输入必须生成字节级稳定的输出：

- 稳定的消息顺序
- 稳定的角色标签
- 不生成时间戳
- 不泄漏 object key 顺序
- 不使用随机分隔符
- 不使用每次运行不同的 id

使用固定分隔符和明确的分区。

### 6. 在 transcript 镜像之后接入 post-turn

Codex 的 `CodexAppServerEventProjector` 为当前 turn 构建本地 `messagesSnapshot`。`mirrorTranscriptBestEffort(...)` 将该快照写入 OpenClaw transcript 镜像。

在镜像成功或失败之后，使用最佳可用消息快照调用 context-engine finalizer：

- 优先使用写入后完整镜像的 session context，因为 `afterTurn` 期望的是 session 快照，而不只是当前 turn。
- 如果 session 文件无法重新打开，则回退到 `historyMessages + result.messagesSnapshot`。

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

如果镜像失败，仍然要使用回退快照调用 `afterTurn`，但记录 context engine 正在从 fallback turn data ingest。

### 7. 规范 usage 和 prompt-cache runtime context

Codex 结果在可用时包含来自 app-server token notifications 的规范化 usage。将该 usage 传入 context-engine runtime context。

如果 Codex app-server 最终暴露了 cache read/write 细节，则把它们映射到 `ContextEnginePromptCacheInfo`。在此之前，不要伪造零值，而应省略 `promptCache`。

### 8. 压缩策略

存在两个压缩系统：

1. OpenClaw context-engine `compact()`
2. Codex app-server 原生 `thread/compact/start`

不要悄悄地把它们混为一谈。

#### `/compact` 和显式 OpenClaw 压缩

当所选 context engine 的 `info.ownsCompaction === true` 时，显式 OpenClaw 压缩应优先对 OpenClaw transcript 镜像和插件状态使用 context engine 的 `compact()` 结果。

当所选 Codex harness 具有原生 thread 绑定时，我们也可以额外请求 Codex 原生压缩，以保持 app-server thread 健康，但这必须在 details 中作为单独的 backend action 报告。

推荐行为：

- 如果 `contextEngine.info.ownsCompaction === true`：
  - 先调用 context-engine `compact()`
  - 若存在 thread 绑定，再尽力调用 Codex 原生压缩
  - 将 context-engine 结果作为主结果返回
  - 在 `details.codexNativeCompaction` 中包含 Codex 原生压缩状态
- 如果活跃 context engine 不拥有 compaction：
  - 保持当前 Codex 原生压缩行为

这很可能需要修改 `extensions/codex/src/app-server/compact.ts`，或者从通用压缩路径对其进行包装，具体取决于 `maybeCompactAgentHarnessSession(...)` 在哪里被调用。

#### turn 内的 Codex 原生 contextCompaction 事件

Codex 可能会在 turn 中发出 `contextCompaction` item 事件。保留 `event-projector.ts` 中现有的 before/after compaction hook 事件发射，但不要把它视为已完成的 context-engine compaction。

对于拥有 compaction 的引擎，如果 Codex 仍然执行了原生压缩，则发出显式诊断：

- stream/event 名称：现有的 `compaction` stream 可以接受
- details：`{ backend: "codex-app-server", ownsCompaction: true }`

这样可以使二者的分离可审计。

### 9. session 重置和绑定行为

现有的 Codex harness `reset(...)` 会从 OpenClaw session 文件中清除 Codex app-server binding。保留该行为。

同时确保 context-engine 状态清理继续通过现有 OpenClaw session 生命周期路径发生。除非当前 context-engine 生命周期对所有 harness 都缺少 reset/delete 事件，否则不要添加 Codex 特定的清理逻辑。

### 10. 错误处理

遵循 PI 语义：

- bootstrap 失败时发出 warning 并继续
- assemble 失败时发出 warning，并回退到未组装的 pipeline messages/prompt
- afterTurn/ingest 失败时发出 warning，并将 post-turn finalization 标记为不成功
- maintenance 仅在成功、非中止、非 yield 的 turns 之后运行
- compaction 错误不应作为新的 prompt 重试

Codex 特定补充：

- 如果 context projection 失败，发出 warning 并回退到原始 prompt。
- 如果 transcript 镜像失败，仍尝试使用回退消息进行 context-engine finalization。
- 如果 Codex 原生 compaction 在 context-engine compaction 成功后失败，当 context engine 是主路径时，不要让整个 OpenClaw compaction 失败。

## 测试计划

### 单元测试

在 `extensions/codex/src/app-server` 下添加测试：

1. `run-attempt.context-engine.test.ts`
   - 当会话文件存在时，Codex 调用 `bootstrap`。
   - Codex 使用镜像消息、token budget、工具名称、引用模式、模型 id 和 prompt 调用 `assemble`。
   - `systemPromptAddition` 包含在开发者指令中。
   - 组装后的消息在当前请求之前投影到 prompt 中。
   - Codex 在 transcript 镜像之后调用 `afterTurn`。
   - 在没有 `afterTurn` 时，Codex 调用 `ingestBatch` 或逐条消息的 `ingest`。
   - 成功回合后运行回合维护。
   - 在 prompt 错误、abort 或 yield abort 时不运行回合维护。

2. `context-engine-projection.test.ts`
   - 对相同输入输出稳定
   - 当组装后的历史包含当前 prompt 时，不重复加入当前 prompt
   - 处理空历史
   - 保持 role 顺序
   - 仅在开发者指令中包含 system prompt addition

3. `compact.context-engine.test.ts`
   - 拥有 context engine 时，primary 结果优先
   - 当同时尝试时，Codex 原生 compaction 状态会出现在 details 中
   - Codex 原生失败不会导致拥有 context-engine 的 compaction 失败
   - 非拥有 context engine 保持当前原生 compaction 行为

### 需要更新的现有测试

- `extensions/codex/src/app-server/run-attempt.test.ts` 如果存在，否则更新最近的 Codex app-server 运行测试。
- `extensions/codex/src/app-server/event-projector.test.ts` 仅在 compaction event details 发生变化时更新。
- `src/agents/harness/selection.test.ts` 除非配置行为发生变化，否则不应需要修改；它应保持稳定。
- PI context-engine 测试应继续按原样通过。

### 集成 / 实时测试

添加或扩展 live Codex harness smoke tests：

- 将 `plugins.slots.contextEngine` 配置为测试引擎
- 将 `agents.defaults.model` 配置为 `codex/*` 模型
- 将 `agents.defaults.embeddedHarness.runtime` 配置为 `"codex"`
- 断言测试引擎观测到：
  - bootstrap
  - assemble
  - afterTurn 或 ingest
  - maintenance

避免在 OpenClaw core 测试中依赖 lossless-claw。使用一个小型的仓库内 fake context engine 插件。

## 可观测性

为 Codex context-engine 生命周期调用添加调试日志：

- `codex context engine bootstrap started/completed/failed`
- `codex context engine assemble applied`
- `codex context engine finalize completed/failed`
- `codex context engine maintenance skipped` with reason
- `codex native compaction completed alongside context-engine compaction`

避免记录完整 prompt 或 transcript 内容。

在有用的地方添加结构化字段：

- `sessionId`
- `sessionKey` 根据现有日志实践进行脱敏或省略
- `engineId`
- `threadId`
- `turnId`
- `assembledMessageCount`
- `estimatedTokens`
- `hasSystemPromptAddition`

## 迁移 / 兼容性

这应该是向后兼容的：

- 如果没有配置 context engine，传统 context engine 行为应与当前 Codex harness 行为等价。
- 如果 context-engine `assemble` 失败，Codex 应继续走原始 prompt 路径。
- 现有的 Codex thread 绑定应保持有效。
- 动态工具指纹不应包含 context-engine 输出；否则每次 context 变化都可能强制创建新的 Codex thread。只有工具目录应影响动态工具指纹。

## 未决问题

1. 组装后的上下文应完全注入到 user prompt 中、完全注入到 developer instructions 中，还是拆分注入？

   推荐：拆分。将 `systemPromptAddition` 放入 developer instructions；将组装后的 transcript 上下文放入 user prompt wrapper。这最符合当前 Codex 协议，同时不会修改原生 thread history。

2. 当 context engine 拥有 compaction 时，应禁用 Codex 原生 compaction 吗？

   推荐：暂时不要。Codex 原生 compaction 可能仍然是保持 app-server thread 存活所必需的。但它必须作为原生 Codex compaction 报告，而不是作为 context-engine compaction。

3. `before_prompt_build` 应该在 context-engine assembly 之前还是之后运行？

   推荐：对 Codex 来说在 context-engine projection 之后运行，这样通用 harness 钩子看到的是 Codex 实际将接收的 prompt/developer instructions。如果 PI 对齐需要相反顺序，就把选定顺序编码到测试中并在这里记录。

4. Codex app-server 将来能否接受结构化的 context/history override？

   未知。如果可以，就用该协议替换文本投影层，并保持生命周期调用不变。

## 验收标准

- `codex/*` embedded harness 回合会调用所选 context engine 的 assemble 生命周期。
- context-engine 的 `systemPromptAddition` 会影响 Codex developer instructions。
- 组装后的上下文会确定性地影响 Codex 回合输入。
- 成功的 Codex 回合会调用 `afterTurn` 或 ingest fallback。
- 成功的 Codex 回合会运行 context-engine 回合维护。
- 失败/中止/yield-aborted 的回合不会运行回合维护。
- 由 context-engine 拥有的 compaction 对 OpenClaw/plugin state 仍然是主流程。
- Codex 原生 compaction 仍可作为原生 Codex 行为被审计。
- 现有 PI context-engine 行为保持不变。
- 当未选择非 legacy context engine 或 assembly 失败时，现有 Codex harness 行为保持不变。
