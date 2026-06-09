---
title: "Codex 运行时上下文引擎端口"
summary: "使捆绑的 Codex 应用服务器辅助程序遵循 OpenClaw 上下文引擎插件的规范"
read_when:
  - 你正在将上下文引擎的生命周期行为接入 Codex 运行框架
  - 您需要 lossless-claw 或其他上下文引擎插件才能与 codex/* 嵌入式运行环境会话配合使用
  - 你正在比较嵌入式 OpenClaw 和 Codex 应用服务器上下文行为
---

## 状态

草案实现规范。

## 目标

让捆绑的 Codex app-server harness 遵守与内嵌 OpenClaw 轮次已经遵守的同一套 OpenClaw context-engine
生命周期契约。

使用 provider/model `agentRuntime.id: "codex"` 或 `codex/*` 模型的会话，
仍然应当允许所选 context-engine 插件（例如
`lossless-claw`）在 Codex app-server 边界允许的范围内，控制上下文组装、turn 后摄取、维护，以及
OpenClaw 级别的压缩策略。

## 非目标

- 不要重新实现 Codex app-server 的内部机制。
- 不要让 Codex 原生线程压缩生成 lossless-claw 摘要。
- 不要要求非 Codex 模型使用 Codex harness。
- 不要改变 ACP/acpx 会话行为。本规范仅适用于
  非 ACP 的内嵌 agent harness 路径。
- 不要让第三方插件注册 Codex app-server 扩展工厂；
  现有的捆绑插件信任边界保持不变。

## 当前架构

内嵌运行循环会在选择具体低层 harness 之前，针对每次运行解析一次配置的 context engine：

- `src/agents/embedded-agent-runner/run.ts`
  - 初始化 context-engine 插件
  - 调用 `resolveContextEngine(params.config)`
  - 将 `contextEngine` 和 `contextTokenBudget` 传入
    `runEmbeddedAttemptWithBackend(...)`

`runEmbeddedAttemptWithBackend(...)` 会委托给所选 agent harness：

- `src/agents/embedded-agent-runner/run/backend.ts`
- `src/agents/harness/selection.ts`

Codex app-server harness 由捆绑的 Codex 插件注册：

- `extensions/codex/index.ts`
- `extensions/codex/harness.ts`

Codex harness 实现接收与内置 OpenClaw 尝试相同的 `EmbeddedRunAttemptParams`：

- `extensions/codex/src/app-server/run-attempt.ts`

这意味着所需的 hook 点位于 OpenClaw 可控代码中。外部边界是 Codex app-server 协议本身：OpenClaw 可以控制它向 `thread/start`、`thread/resume` 和 `turn/start` 发送什么，也可以观察通知，但不能改变 Codex 的内部线程存储或原生压缩器。

## 当前缺口

内置 OpenClaw 尝试会直接调用 context-engine 生命周期：

- 在 attempt 前进行 bootstrap/maintenance
- 在模型调用前进行 assemble
- 在 attempt 后进行 afterTurn 或 ingest
- 成功 turn 后进行 maintenance
- 对拥有压缩权的引擎执行 context-engine 压缩

相关 OpenClaw 代码：

- `src/agents/embedded-agent-runner/run/attempt.ts`
- `src/agents/embedded-agent-runner/run/attempt.context-engine-helpers.ts`
- `src/agents/embedded-agent-runner/context-engine-maintenance.ts`

Codex app-server 尝试目前只运行通用 agent-harness hooks 并镜像 transcript，但不会调用
`params.contextEngine.bootstrap`、`params.contextEngine.assemble`、
`params.contextEngine.afterTurn`、`params.contextEngine.ingestBatch`、
`params.contextEngine.ingest` 或 `params.contextEngine.maintain`。

相关 Codex 代码：

- `extensions/codex/src/app-server/run-attempt.ts`
- `extensions/codex/src/app-server/thread-lifecycle.ts`
- `extensions/codex/src/app-server/event-projector.ts`
- `extensions/codex/src/app-server/compact.ts`

## 期望行为

对于 Codex harness 的 turn，OpenClaw 应保留以下生命周期：

1. 读取镜像的 OpenClaw 会话 transcript。
2. 当存在前一个会话文件时，bootstrap 当前 context engine。
3. 在可用时运行 bootstrap maintenance。
4. 使用活动 context engine 组装上下文。
5. 将组装后的上下文转换为 Codex 兼容输入。
6. 以包含任意 context-engine `systemPromptAddition` 的 developer instructions 启动或恢复 Codex thread。
7. 使用组装后的面向用户提示启动 Codex turn。
8. 将 Codex 结果镜像回 OpenClaw transcript。
9. 如果实现了 `afterTurn`，则调用它；否则调用 `ingestBatch`/`ingest`，并使用镜像后的 transcript 快照。
10. 在成功且未中止的 turn 后运行 turn maintenance。
11. 保留 Codex 原生压缩信号和 OpenClaw 压缩 hooks。

## 设计约束

### Codex app-server 仍然是原生线程状态的权威来源

Codex 拥有其原生线程以及任何内部扩展历史。OpenClaw 不应尝试通过支持的协议调用之外的方式修改 app-server 的内部历史。

OpenClaw 的 transcript 镜像仍然是 OpenClaw 功能的数据源：

- 聊天历史
- 搜索
- `/new` 和 `/reset` 记账
- 未来的模型或 harness 切换
- context-engine 插件状态

### Context engine 组装必须投影到 Codex 输入中

context-engine 接口返回的是 OpenClaw `AgentMessage[]`，而不是 Codex thread patch。Codex app-server 的 `turn/start` 接受当前用户输入，而 `thread/start` 和 `thread/resume` 接受 developer instructions。

因此实现需要一个投影层。安全的第一版应避免假装它能够替换 Codex 内部历史。它应将组装后的上下文作为确定性的提示词/developer-instruction 材料注入到当前 turn 周围。

### 提示缓存稳定性很重要

对于像 lossless-claw 这样的引擎，组装后的上下文在输入不变时应当是确定性的。不要在生成的上下文文本中加入时间戳、随机 id 或非确定性排序。

### 运行时选择语义不变

harness 选择保持原样：

- `runtime: "openclaw"` 选择内置 OpenClaw harness
- `runtime: "codex"` 选择已注册的 Codex harness
- `runtime: "auto"` 让插件 harness 抢占支持的 provider
- 未匹配的 `auto` 运行使用内置 OpenClaw harness

本工作改变的是 Codex harness 被选中之后发生的事情。

## 实现计划

### 1. 导出或重定位可复用的 context-engine attempt helpers

目前可复用的生命周期 helpers 位于内嵌 agent runner 下：

- `src/agents/embedded-agent-runner/run/attempt.context-engine-helpers.ts`
- `src/agents/embedded-agent-runner/run/attempt.prompt-helpers.ts`
- `src/agents/embedded-agent-runner/context-engine-maintenance.ts`

Codex 应该导入与 harness 无关的 helpers，而不是直接依赖 runner 实现细节。

创建一个与 harness 无关的模块，例如：

- `src/agents/harness/context-engine-lifecycle.ts`

移动或重新导出：

- `runAttemptContextEngineBootstrap`
- `assembleAttemptContextEngine`
- `finalizeAttemptContextEngineTurn`
- `buildAfterTurnRuntimeContext`
- `buildAfterTurnRuntimeContextFromUsage`
- 一个围绕 `runContextEngineMaintenance` 的小包装

同一 PR 中更新内置 harness 的调用点。

中性 helper 名称不应提及内置 harness。

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

- 接收组装后的 `AgentMessage[]`、原始镜像历史以及当前 prompt。
- 确定哪些 context 应放入 developer instructions，哪些应放入当前用户输入。
- 将当前用户 prompt 保留为最终可执行请求。
- 以稳定、显式的格式渲染先前消息。
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

推荐的第一版投影：

- 将 `systemPromptAddition` 放入 developer instructions。
- 将组装后的 transcript 上下文放在 `promptText` 中当前 prompt 之前。
- 清楚标注为 OpenClaw assembled context。
- 将当前 prompt 保持在最后。
- 如果当前用户 prompt 已经出现在尾部，则排除重复项。

示例 prompt 形状：

```text
OpenClaw 本轮组装上下文：

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

未来改进：如果 Codex app-server 暴露了替换或补充 thread history 的协议，就把这个投影层切换到该 API。

### 3. 在 Codex thread 启动前接入 bootstrap

在 `extensions/codex/src/app-server/run-attempt.ts` 中：

- 如现有逻辑一样读取镜像的 session 历史。
- 判断本次运行前 session 文件是否已存在。优先使用在镜像写入之前检查 `fs.stat(params.sessionFile)` 的 helper。
- 如 helper 需要，可打开 `SessionManager` 或使用一个窄化的 session manager 适配器。
- 当 `params.contextEngine` 存在时调用中性的 bootstrap helper。

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

使用与 Codex tool bridge 和 transcript mirror 相同的 `sessionKey` 约定。当前 Codex 会根据 `params.sessionKey` 或 `params.sessionId` 计算 `sandboxSessionKey`；除非有理由保留原始 `params.sessionKey`，否则应保持一致。

### 4. 在 `thread/start` / `thread/resume` 与 `turn/start` 之前接入 assemble

在 `runCodexAppServerAttempt` 中：

1. 先构建动态 tools，这样 context engine 能看到实际可用的工具名。
2. 读取镜像的 session 历史。
3. 当 `params.contextEngine` 存在时运行 context-engine `assemble(...)`。
4. 将组装结果投影为：
   - developer instruction 增量
   - `turn/start` 的 prompt 文本

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

1. 先用 `buildDeveloperInstructions(params)` 计算基础 developer instructions
2. 应用 context-engine 组装/投影
3. 运行 `before_prompt_build`，使用投影后的 prompt/developer instructions

这个顺序让通用 prompt hooks 看到与 Codex 将接收的相同 prompt。如果需要严格的 OpenClaw 一致性，则应在 hook composition 之前运行 context-engine assemble，因为内置 harness 会在其 prompt pipeline 之后，将 context-engine `systemPromptAddition` 应用到最终 system prompt。关键不变量是：context engine 和 hooks 都得到确定且文档化的顺序。

建议的首版顺序：

1. `buildDeveloperInstructions(params)`
2. context-engine `assemble()`
3. 将 `systemPromptAddition` 追加/前置到 developer instructions
4. 将组装后的 messages 投影为 prompt text
5. `resolveAgentHarnessBeforePromptBuildResult(...)`
6. 将最终 developer instructions 传给 `startOrResumeThread(...)`
7. 将最终 prompt text 传给 `buildTurnStartParams(...)`

应在测试中编码该规范，防止未来无意间调整顺序。

### 5. 保持 prompt-cache 稳定格式

投影 helper 必须在相同输入下产生字节稳定输出：

- 稳定的 message 顺序
- 稳定的角色标签
- 不生成时间戳
- 不泄漏对象 key 顺序
- 不使用随机分隔符
- 不使用每次运行都不同的 id

使用固定分隔符和显式分段。

### 6. 在 transcript 镜像后接入 post-turn

Codex 的 `CodexAppServerEventProjector` 会为当前 turn 构建本地 `messagesSnapshot`。`mirrorTranscriptBestEffort(...)` 会将该 snapshot 写入 OpenClaw transcript 镜像。

在镜像成功或失败之后，都应使用可获得的最佳 message snapshot 调用 context-engine finalizer：

- 优先使用写入后的完整镜像 session context，因为 `afterTurn` 期望的是 session snapshot，而不仅仅是当前 turn。
- 如果无法重新打开 session 文件，则退回到 `historyMessages + result.messagesSnapshot`。

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

如果镜像失败，仍然应使用 fallback snapshot 调用 `afterTurn`，但要记录日志，说明 context engine 正在从 fallback turn data 进行 ingest。

### 7. 规范化 usage 和 prompt-cache runtime context

Codex 结果会在可用时包含来自 app-server token notifications 的规范化 usage。应将该 usage 传入 context-engine runtime context。

如果 Codex app-server 未来暴露 cache read/write 细节，把它们映射到 `ContextEnginePromptCacheInfo`。在此之前，不要凭空伪造 0 值，而是省略 `promptCache`。

### 8. 压缩策略

存在两套压缩系统：

1. OpenClaw context-engine `compact()`
2. Codex app-server 原生 `thread/compact/start`

不要悄悄混淆它们。

#### `/compact` 与显式的 OpenClaw 压缩

当所选 context engine 的 `info.ownsCompaction === true` 时，显式的 OpenClaw 压缩应优先使用 context engine 的 `compact()` 结果来处理 OpenClaw transcript 镜像和插件状态。

当所选 Codex harness 有原生 thread 绑定时，可以额外请求 Codex 原生压缩以保持 app-server thread 健康，但这必须作为单独的 backend action 在 details 中报告。

推荐行为：

- 如果 `contextEngine.info.ownsCompaction === true`：
  - 先调用 context-engine `compact()`
  - 然后在存在 thread binding 时，尽力调用 Codex 原生压缩
  - 将 context-engine 结果作为主结果返回
  - 在 `details.codexNativeCompaction` 中包含 Codex 原生压缩状态
- 如果活动 context engine 不拥有压缩权：
  - 保留当前 Codex 原生压缩行为

这很可能需要修改 `extensions/codex/src/app-server/compact.ts`，或者从通用压缩路径对其进行包装，具体取决于 `maybeCompactAgentHarnessSession(...)` 在哪里被调用。

#### turn 内的 Codex 原生 `contextCompaction` 事件

Codex 可能在 turn 中发出 `contextCompaction` item 事件。保留 `event-projector.ts` 里现有的 before/after compaction hook 发射，但不要把它视为已完成的 context-engine compaction。

对于拥有压缩权的引擎，如果 Codex 仍执行原生压缩，应显式发出诊断信息：

- stream/event 名称：可继续使用现有 `compaction` stream
- details: `{ backend: "codex-app-server", ownsCompaction: true }`

这样可以审计两者的分离。

### 9. Session reset 与 binding 行为

现有 Codex harness 的 `reset(...)` 会清除 OpenClaw session 文件中的 Codex app-server binding。保留该行为。

同时确保 context-engine 状态清理继续通过现有 OpenClaw session 生命周期路径完成。除非当前 context-engine 生命周期对所有 harness 的 reset/delete 事件都存在缺失，否则不要添加 Codex 专属清理逻辑。

### 10. 错误处理

遵循内置 OpenClaw 语义：

- bootstrap 失败时警告并继续
- assemble 失败时警告并回退到未组装的 pipeline messages/prompt
- afterTurn/ingest 失败时警告并将 post-turn finalization 标记为失败
- maintenance 仅在成功、未中止、未 yield 的 turn 后运行
- compaction 错误不应作为新的 prompt 重试

Codex 特有的补充：

- 如果 context projection 失败，发出警告并回退到原始 prompt。
- 如果 transcript mirror 失败，仍尝试用 fallback messages 进行 context-engine finalization。
- 如果 Codex 原生压缩在 context-engine 压缩成功后失败，只要 context engine 是主路径，就不要让整个 OpenClaw 压缩失败。

## 测试计划

### 单元测试

在 `extensions/codex/src/app-server` 下添加测试：

1. `run-attempt.context-engine.test.ts`
   - 当存在会话文件时，Codex 调用 `bootstrap`。
   - Codex 使用镜像消息、token 预算、工具名称、引用模式、模型 ID 和提示词调用 `assemble`。
   - `systemPromptAddition` 会包含在开发者指令中。
   - 组装后的消息会在当前请求之前投影到提示词中。
   - 在转录镜像之后，Codex 会调用 `afterTurn`。
   - 在没有 `afterTurn` 时，Codex 调用 `ingestBatch` 或逐条 `ingest`。
   - 成功的回合之后会运行回合维护。
   - 在提示词错误、中止或 yield 中止时，不运行回合维护。

2. `context-engine-projection.test.ts`
   - 相同输入下输出稳定
   - 当组装后的历史包含当前提示词时，不会重复当前提示词
   - 处理空历史
   - 保持角色顺序
   - 仅在开发者指令中包含系统提示追加内容

3. `compact.context-engine.test.ts`
   - 拥有者上下文引擎的主要结果获胜
   - 当也尝试了 Codex 原生压缩时，详细信息中会出现该状态
   - Codex 原生失败不会导致拥有者上下文引擎压缩失败
   - 非拥有者上下文引擎会保留当前原生压缩行为

### 需要更新的现有测试

- `extensions/codex/src/app-server/run-attempt.test.ts`（如果存在，否则更新最接近的 Codex app-server 运行测试）
- `extensions/codex/src/app-server/event-projector.test.ts`，仅在压缩事件详情发生变化时更新
- `src/agents/harness/selection.test.ts` 一般不需要修改，除非配置行为发生变化；它应保持稳定
- 内置 harness 的 context-engine 测试应继续按原样通过

### 集成 / 真实测试

添加或扩展 Codex harness 的 smoke 测试：

- 将 `plugins.slots.contextEngine` 配置为测试引擎
- 将 `agents.defaults.model` 配置为 `codex/*` 模型
- 将 provider/model 的 `agentRuntime.id` 配置为 `"codex"`
- 断言测试引擎已观测到：
  - `bootstrap`
  - `assemble`
  - `afterTurn` 或 `ingest`
  - `maintenance`

避免在 OpenClaw 核心测试中依赖 `lossless-claw`。使用一个小型仓库内置的假 context engine 插件。

## 可观测性

在 Codex context-engine 生命周期调用周围添加调试日志：

- `codex context engine bootstrap started/completed/failed`
- `codex context engine assemble applied`
- `codex context engine finalize completed/failed`
- `codex context engine maintenance skipped` 并附带原因
- `codex native compaction completed alongside context-engine compaction`

避免记录完整提示词或转录内容。

在合适的地方添加结构化字段：

- `sessionId`
- `sessionKey` 根据现有日志实践进行脱敏或省略
- `engineId`
- `threadId`
- `turnId`
- `assembledMessageCount`
- `estimatedTokens`
- `hasSystemPromptAddition`

## 迁移 / 兼容性

这应当保持向后兼容：

- 如果没有配置 context engine，旧的 context engine 行为应与当前 Codex harness 行为等价。
- 如果 context-engine 的 `assemble` 失败，Codex 应继续走原始提示词路径。
- 现有的 Codex thread 绑定应保持有效。
- 动态工具指纹不应包含 context-engine 输出；否则每次 context 变更都可能强制创建新的 Codex thread。只有工具目录应该影响动态工具指纹。

## 未决问题

1. 应该将组装后的上下文完全注入到用户提示词中、完全注入到开发者指令中，还是拆分处理？

   推荐：拆分。将 `systemPromptAddition` 放入开发者指令；将组装后的转录上下文放入用户提示词包装中。这最符合当前 Codex 协议，也不会修改原生 thread 历史。

2. 当 context engine 拥有压缩时，是否应禁用 Codex 原生压缩？

   推荐：暂时不禁用。Codex 原生压缩可能仍然需要以保持 app-server thread 存活。但它必须被报告为原生 Codex 压缩，而不是 context-engine 压缩。

3. `before_prompt_build` 应该在 context-engine 组装之前还是之后运行？

   推荐：对 Codex 来说，在 context-engine 投影之后运行，这样通用 harness 钩子看到的是 Codex 实际将接收的提示词/开发者指令。如果内置 harness 的一致性要求相反，就把选定顺序编码到测试中并在这里记录。

4. Codex app-server 能否接受未来结构化的 context/history 覆盖？

   未知。如果可以，用该协议替换文本投影层，同时保持生命周期调用不变。

## 验收标准

- 一个 `codex/*` 嵌入式 harness 回合会调用所选 context engine 的 `assemble` 生命周期。
- context-engine 的 `systemPromptAddition` 会影响 Codex 的开发者指令。
- 组装后的上下文会确定性地影响 Codex 的回合输入。
- 成功的 Codex 回合会调用 `afterTurn` 或 ingest 回退。
- 成功的 Codex 回合会运行 context-engine 的回合维护。
- 失败 / 中止 / yield 中止的回合不会运行回合维护。
- 由 context-engine 拥有的压缩仍然是 OpenClaw / 插件状态的主路径。
- Codex 原生压缩仍然可以作为原生 Codex 行为被审计。
- 现有的内置 harness context-engine 行为保持不变。
- 当未选择非遗留 context engine，或组装失败时，现有 Codex harness 行为保持不变。