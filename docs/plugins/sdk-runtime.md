---
summary: "api.runtime -- 可注入给插件的运行时辅助工具"
title: "插件运行时辅助工具"
sidebarTitle: "运行时辅助工具"
read_when:
  - 你需要从插件中调用核心辅助工具（TTS、STT、image gen、web search、Gateway、subagent、nodes）
  - 你想了解 api.runtime 暴露的内容
  - 你正在从插件代码中访问 config、agent 或 media 辅助工具
  - 你正在 channel 插件中实现 model-picker 持久化
---

`api.runtime` 对象的参考文档，该对象会在每个插件注册时注入。请使用这些辅助工具，而不是直接导入宿主内部实现。

<CardGroup cols={2}>
  <Card title="Channel 插件" href="/plugins/sdk-channel-plugins">
    在 channel 插件上下文中使用这些辅助工具的分步指南。
  </Card>
  <Card title="Provider 插件" href="/plugins/sdk-provider-plugins">
    在 provider 插件上下文中使用这些辅助工具的分步指南。
  </Card>
</CardGroup>

```typescript
register(api) {
  const runtime = api.runtime;
}
```

`api.runtime.version` 是当前的 OpenClaw 产品版本，来源于共享版本解析器，因此插件看到的值与 CLI 报告的值相同。

## 配置加载与写入

优先使用已经传入当前调用路径的配置，例如注册期间的 `api.config`，或者 channel/provider 回调中的 `cfg` 参数。这样可以让单次进程快照贯穿整个工作流程，而不是在热点路径上重复解析配置。

仅当长生命周期处理器需要当前进程快照且该函数未传入配置时，才使用 `api.runtime.config.current()`。返回值是只读的；在编辑前请先克隆，或使用修改辅助工具。

工具工厂会接收 `ctx.runtimeConfig` 以及 `ctx.getRuntimeConfig()`。当长生命周期工具的 `execute` 回调中，配置可能在工具定义创建后发生变化时，请在回调内使用 getter。

通过 `api.runtime.config.mutateConfigFile(...)` 或 `api.runtime.config.replaceConfigFile(...)` 持久化更改。每次写入都必须选择明确的 `afterWrite` 策略：

- `afterWrite: { mode: "auto" }` 允许 gateway 重新加载规划器自行决定。
- `afterWrite: { mode: "restart", reason: "..." }` 当写入方知道热重载不安全时，强制进行一次干净重启。
- `afterWrite: { mode: "none", reason: "..." }` 仅当调用方自己负责后续处理时，才抑制自动重载／重启。

这些修改辅助工具会返回 `afterWrite` 以及带类型的 `followUp` 摘要，因此调用方可以记录或测试自己是否请求了重启。gateway 仍然负责决定重启何时真正发生。

使用 `current()`、传入的 `cfg`、`mutateConfigFile(...)` 或 `replaceConfigFile(...)` 访问和写入运行时配置。

对于直接导入 SDK，优先使用专用的配置子路径，而不是宽泛的 `openclaw/plugin-sdk/config-runtime` 兼容性 barrel：使用 `config-contracts` 获取类型，使用 `runtime-config-snapshot` 获取当前进程快照，使用 `config-mutation` 执行写入。从 `api.pluginConfig` 读取入口作用域的值；仅针对其运行时范围的配置快照使用所提供的工具上下文，并在该边界处完成插件特定的合并。打包的插件测试应直接 mock 这些专用子路径，而不是 mock 宽泛的兼容性 barrel。

内部 OpenClaw 运行时代码遵循相同的方向：在 CLI、gateway 或进程边界处加载一次配置，然后传递该值。成功的修改写入会刷新进程运行时快照并推进其内部修订版本；长生命周期缓存应使用运行时拥有的缓存键，而不是在本地序列化配置。长生命周期运行时模块对环境中的 `loadConfig()` 调用实行零容忍扫描；请使用传入的 `cfg`、请求中的 `context.getRuntimeConfig()`，或在明确的进程边界处使用 `getRuntimeConfig()`。

provider 和 channel 的执行路径必须使用当前运行时配置快照，而不是用于配置回读或编辑的文件快照。文件快照会保留源值，例如用于 UI 和写入的 SecretRef 标记；provider 回调需要的是解析后的运行时视图。当某个辅助工具可能接收当前源快照或当前运行时快照中的任意一种时，请在读取凭据前通过 `selectApplicableRuntimeConfig()` 进行路由。

## 可复用运行时工具

Model-picker 集成使用两个专用运行时子路径。从
`openclaw/plugin-sdk/interactive-runtime` 导入类型化的
`ModelPickerAction` 和 `ModelPickerCapabilityProfile` 契约。从
`openclaw/plugin-sdk/model-session-runtime` 导入
`applySessionModelSelection(...)` 及其结果类型；这是实时会话变更的接入点，
包括权威冲突检查和提交后的副作用。较低层级的
`applyModelOverrideToSessionEntry(...)` 辅助函数不是 picker 持久化 API。

仅当 channel 回调无法进入完整的实时会话事务，且已经拥有原子化的规范会话条目补丁时，才将
`applyModelOverrideWithAuthProfileCompatibility(...)` 用作直接持久化回退方案。传入活动配置、
已解析的 agent 目录、条目、更改前的有效 provider，以及经过验证的选择。该辅助函数仅会变更该条目：
当固定的 auth profile 所记录的凭据 provider 或已配置别名兼容时保留它，清除不兼容的固定配置，并强制执行模型选择锁定。
调用方仍负责模型 allowlist 验证、原子持久化、
`markLiveSwitchPending` 以及所有提交后的副作用。只要完整事务可用，就应优先使用
`applySessionModelSelection(...)`。

Model-picker 操作仅携带有界的快照和目录 token。Channel actor 身份、源消息绑定以及序列化的回调数据仍保留在
channel 的私有认证信封中。Channel 编解码器通过 `{ modelPicker: true }` 选择解析这些操作；
不具备 picker 能力的 channel 会继续安全失败，而不是将该操作视为不透明的回调。

对于 bot 编写的入站消息，使用入站的 `botLoopProtection` 事实。Core 会在会话记录和分发之前应用共享的内存滑动窗口防护，
而不会将策略绑定到某一个 channel。该防护会跟踪
`(scopeId, conversationId, participant pair)` 键，将一对参与者的两个方向合并计数，在超过窗口预算后应用冷却时间，
并主动清理不活跃的条目。可重试的传输还应提供稳定的 `eventId`；在事件仍处于活动窗口期间，重放已接受的事件不会再次消耗预算槽位。
被抑制的事件不会新增任何保留的事件身份状态。

向操作员暴露此行为的 channel 插件应优先使用共享的 `channels.defaults.botLoopProtection` 结构作为基础预算，然后再叠加 channel/provider 特定覆盖。共享配置使用秒作为单位，因为它面向用户：

```typescript
type ChannelBotLoopProtectionConfig = {
  enabled?: boolean;
  maxEventsPerWindow?: number;
  windowSeconds?: number;
  cooldownSeconds?: number;
};
```

将规范化后的 bot-pair 事实与已解析的 turn 一起传入。Core 会解析默认值、单位转换和 `enabled` 语义：

```typescript
return {
  channel: "example",
  routeSessionKey,
  storePath,
  ctxPayload,
  recordInboundSession,
  runDispatch,
  botLoopProtection: {
    scopeId: "account-1",
    conversationId: "channel-1",
    senderId: "bot-a",
    receiverId: "bot-b",
    eventId: providerEvent.id,
    config: channelConfig.botLoopProtection,
    defaultsConfig: runtimeConfig.channels?.defaults?.botLoopProtection,
    defaultEnabled: allowBotsMode !== "off",
  },
};
```

仅将 `openclaw/plugin-sdk/pair-loop-guard-runtime` 直接用于不经由共享入站回复运行器的自定义双人事件循环。

## 运行时命名空间

<AccordionGroup>
  <Accordion title="api.runtime.agent">
    Agent 身份、目录和会话管理。

    ```typescript
    // Resolve the agent's working directory (agentId is required)
    const agentDir = api.runtime.agent.resolveAgentDir(cfg, agentId);

    // Resolve agent workspace
    const workspaceDir = api.runtime.agent.resolveAgentWorkspaceDir(cfg, agentId);

    // 获取 agent 身份
    const identity = api.runtime.agent.resolveAgentIdentity(cfg);

    // 获取默认思考级别
    const thinking = api.runtime.agent.resolveThinkingDefault({
      cfg,
      provider,
      model,
    });

    // 根据当前 provider profile 验证用户提供的思考级别
    const policy = api.runtime.agent.resolveThinkingPolicy({ provider, model });
    const level = api.runtime.agent.normalizeThinkingLevel("extra high");
    if (level && policy.levels.some((entry) => entry.id === level)) {
      // 将 level 传递给嵌入式运行
    }

    // Resolve a synchronous create target for a session catalog
    const target = api.runtime.agent.resolveSessionCatalogCreateTarget({
      config: api.runtime.config.current(),
      requestedAgentId: agentId,
      provider: "example",
      modelIds: ["example-model"],
      agentRuntime: "example-cli",
    });

    // Get agent timeout
    const timeoutMs = api.runtime.agent.resolveAgentTimeoutMs(cfg);

    // 确保工作区存在
    await api.runtime.agent.ensureAgentWorkspace(cfg);

    // Run an embedded agent turn
    const result = await api.runtime.agent.runEmbeddedAgent({
      sessionId: "my-plugin:task-1",
      runId: crypto.randomUUID(),
      workspaceDir: api.runtime.agent.resolveAgentWorkspaceDir(cfg, agentId),
      prompt: "Summarize the latest changes",
      timeoutMs: api.runtime.agent.resolveAgentTimeoutMs(cfg),
    });
    ```

    `runEmbeddedAgent(...)` 是从插件代码中启动正常 OpenClaw agent 回合的中性辅助工具。它使用与 channel 触发回复相同的 provider/model 解析和 agent-harness 选择。

    `runEmbeddedPiAgent(...)` 仍然作为现有插件的已弃用兼容别名保留。新代码应使用 `runEmbeddedAgent(...)`。

    `resolveCliBackendDispatchEligibility({ provider, model, agentId, authProfileId, config, agentDir, workspaceDir })` 共享嵌入式运行器的 CLI-backend 调度决策（路由、后端声明的 `subscriptionAuthDispatch` 能力、已存储的凭据模式——遵循显式固定的 `authProfileId`），供选择通过 `cliBackendDispatch: "subscription-auth"` 运行嵌入式任务的调用方使用。当运行将通过 CLI 后端执行时，它返回 `{ provider }`；当运行保持直接透传时返回 `undefined`，因此调用方可以为实际执行的运行预算超时时间。

    `resolveThinkingPolicy(...)` 返回 provider/model 支持的思考级别和可选默认值。Provider 插件通过其思考钩子负责维护特定模型的 profile，因此工具插件应调用此运行时辅助工具，而不是导入或重复 provider 列表。

    `normalizeThinkingLevel(...)` 会将用户文本（例如 `on`、`x-high` 或 `extra high`）转换为规范化的存储级别，然后再将其与解析出的策略进行比较。

    `resolveSessionCatalogCreateTarget(...)` 是受支持的同步策略接口，供实现 `SessionCatalogProvider.resolveCreateSession` 的受信任原生插件使用。它会选择路由到请求运行时且允许请求 agent 或默认 agent 使用的第一个候选模型。当没有候选项同时满足这两项策略时，它返回 `undefined`。在插件中应使用此辅助工具，而不是导入或重复核心模型选择策略。

    **会话存储辅助工具**位于 `api.runtime.agent.session` 下：

    ```typescript
    const entry = api.runtime.agent.session.getSessionEntry({ agentId, sessionKey });
    for (const { sessionKey, entry } of api.runtime.agent.session.listSessionEntries({ agentId })) {
      // 在不依赖旧版 sessions.json 形状的情况下遍历会话行。
    }
    await api.runtime.agent.session.patchSessionEntry({
      agentId,
      sessionKey,
      update: (entry) => ({ thinkingLevel: "high" }),
    });

    const created = await api.runtime.agent.session.createSessionEntry({
      cfg,
      key: "agent:main:my-plugin:task-1",
      initialEntry: {
        agentHarnessId: "my-harness",
        modelSelectionLocked: true,
        pluginExtensions: { "my-plugin": { phase: "initializing" } },
      },
      afterCreate: async () => ({
        pluginExtensions: { "my-plugin": { phase: "ready" } },
      }),
    });

    const storePath = api.runtime.agent.session.resolveStorePath(cfg.session?.store, { agentId });
    await api.runtime.agent.session.runWithWorkAdmission(
      { storePath, sessionKey },
      async (signal) => {
        // Create or update the session, then pass signal to the admitted agent run.
      },
    );
    ```

    对于会话工作流，优先使用 `getSessionEntry(...)`、`listSessionEntries(...)`、`patchSessionEntry(...)` 或 `upsertSessionEntry(...)`。这些辅助工具根据 agent/会话身份定位会话，因此插件不依赖旧版 `sessions.json` 存储形状。对于不应刷新会话活动时间的仅元数据补丁，请使用 `preserveActivity: true`；仅当回调返回完整条目且删除的字段必须保持删除状态时，才使用 `replaceEntry: true`。Doctor 和迁移路径可以组合使用 `fallbackEntry`、`skipMaintenance` 和 `requireWriteSuccess`，以执行一次原子的规范存储修复。

    `createSessionEntry(...)` 会创建新的规范会话行和转录。其受信任的 `initialEntry` 接口经过有意收窄。插件可以选择由自身拥有的 `agentHarnessId`；使用 `cliBackendId`、`model` 和 `cliSessionBinding` 为自身拥有的 CLI 后端植入初始值；或者使用 `acpBackendId` 和 `acpSessionBinding: { acpAgentId, agentSessionId }` 为持久 ACP 会话植入初始值。ACP 变体会通过规范 SQLite ACP 元数据所有者持久化提供的原生 agent 会话 ID，使第一次回合能够恢复该外部会话。注入的运行时会将插件拥有的 CLI 和 ACP 会话限制在调用插件的 `plugin:<id>:` 命名空间内；必须通过 `registerAgentHarness(...)` 获得 harness ID 的所有权。这些是所有权不变量，而不是进程内插件之间的沙箱隔离。创建操作会拒绝已有行；`label` 和 `spawnedCwd` 是独立的创建字段，而不是受信任条目补丁。

    在公布基于 ACP 的操作前，请使用 `openclaw/plugin-sdk/acp-runtime` 中的 `resolveAcpSessionAvailability(...)`。它会执行规范的启用、调度、允许 agent、已注册后端和后端健康检查；在创建会话前应立即重新检查。

    创建操作会一直持有会话生命周期变更栅栏，直到 `afterCreate` 完成，因此新工作会等待插件拥有的初始化结束，而预先已准入的工作会使创建失败。回调接收所创建状态的副本。如果回调返回补丁，该补丁只能包含 `pluginExtensions`，其值就是完整的最终 `pluginExtensions` 字段。回调或最终持久化失败会回滚未发生变化的新行和转录；受保护的回滚会保留同时被更改或认领的行。`recoverMatchingInitialEntry: true` 仅用于在持久化的受信任字段完全匹配时重试中断的初始化，并且恢复操作要求 `afterCreate` 返回最终补丁。

    当插件开始处理持久化会话上的工作时，请使用 `runWithWorkAdmission(...)`。回调会拒绝已归档或被并发替换的会话，在完成期间协调归档、重置和删除变更，并接收必须转发给 agent 运行的 `AbortSignal`。harness 可以通过其实验性的 `delegatedExecutionPluginIds` 注册字段，显式指定受信任的执行委托方。委托方只能准入并运行一个完全匹配的、已存在的模型锁定会话；所有会话变更仍限制在 harness 所有者范围内。请参阅[Agent harness 插件](/plugins/sdk-agent-harness#delegated-execution)。

    维护和修复插件可以使用 `deleteSessionEntry(...)` 删除一个范围限定的会话条目，使用 `cleanupSessionLifecycleArtifacts(...)` 清理由生命周期拥有的临时会话，并在修改存储前使用 `resolveSessionStoreBackupPaths(...)`。当删除操作不得与并发会话更新发生竞争时，请传入 `expectedSessionId` 和 `expectedUpdatedAt`；当较早的快照没有会话 ID 时，请使用 `expectedSessionId: null`。这些辅助工具是范围狭窄的修复/生命周期接口，不是通用存储删除 API。

    `resolveStorePath(...)` 和 `updateSessionStoreEntry(...)` 补充了会话辅助工具：`resolveStorePath` 为给定范围解析会话存储路径，而 `updateSessionStoreEntry({ storePath, sessionKey, update })` 则在调用方已经知道存储路径时，直接按存储路径补丁更新一个条目。

    `loadTranscriptEventsSync(...)` 可用于无法使用异步转录运行时的同步 doctor 和修复路径。它返回原始的 `SessionStoreTranscriptEvent` 记录。正常的插件运行时代码应优先使用 `openclaw/plugin-sdk/session-transcript-runtime`。

    `formatSqliteSessionFileMarker(...)`、`parseSqliteSessionFileMarker(...)` 和 `sqliteSessionFileMarkerMatchesSession(...)` 是过渡性辅助工具，供仍会接收名为 `sessionFile` 的旧字段的代码使用。解析后的 SQLite 标记用于标识活动的 SQLite 转录目标；它不是文件系统路径。新 API 应携带类型化的会话身份，而不是标记字符串。

    对于转录读取和写入，请导入 `openclaw/plugin-sdk/session-transcript-runtime`，并使用 `resolveSessionTranscriptIdentity(...)`、`resolveSessionTranscriptTarget(...)`、`readSessionTranscriptEvents(...)`、`readSessionTranscriptRawDelta(...)`、`readSessionTranscriptVisibleMessageDelta(...)`、`readVisibleSessionTranscriptMessageEntries(...)`、`appendSessionTranscriptMessageByIdentity(...)`、`publishSessionTranscriptUpdateByIdentity(...)` 或 `withSessionTranscriptWriteLock(...)`，并传入 `{ agentId, sessionKey, sessionId }`。这些 API 允许插件标识转录、读取原始事件或对分支安全的可见消息条目、追加消息、发布更新，并在同一个转录写锁下运行相关操作，而不依赖活动转录文件路径。`readVisibleSessionTranscriptMessageEntries(...)` 返回有序的读取元数据；其 `seq` 字段不是可恢复的游标。

    `appendSessionTranscriptMessageByIdentity(...)` 用于低级追加已经规范化的消息。插件不得合成带媒体的用户行，其中顶层包含 `MediaPath`、`MediaPaths`、`MediaUrl`、`MediaUrls`、`MediaType` 或 `MediaTypes`。Channel 入站处理应通过 `MsgContext.media` 传递有序事实，并让宿主负责用户回合持久化。由宿主准备的持久化用户消息会在 `message.__openclaw.media` 下携带规范的有序事实；通用追加 API 不会推断或修复旧版并行数组。

    `readSessionTranscriptRawDelta(...)` 返回有界的 `page`、`reset` 或 `missing` 结果。将不透明的 `page.cursor` 传入下一次调用。纯追加会保留游标，而转录替换会返回带有新引导游标的 `reset`。每页默认为 1,000 个事件和 1,000,000 个序列化字节；调用方最多可请求 10,000 个事件和 64 MiB。当下一个事件本身超过 `maxBytes` 时，该页为空并报告 `requiredBytes`；当该值不超过 64 MiB 时，请使用至少该字节数的限制重试。更大的单个事件需要使用完整读取 API。游标只标识位置，绝不会授予访问其他会话的权限。

    `readSessionTranscriptVisibleMessageDelta(...)` 为宿主拥有的活动消息投影提供相同的有界引导和恢复形状。它会按从最旧到最新的顺序返回消息，因此上下文引擎可以排空初始历史记录，并将不透明游标持久化为其水位线。原样存储并返回游标；它是继续读取提示，而不是授权凭据。线性追加会从最后一条返回消息之后继续。转录替换、游标锚点离开或在活动分支内移动、格式错误的游标以及跨会话游标，都会返回带有新引导游标的 `reset`。计数和字节数的默认值及上限与原始增量 API 相同。当分支变更后活动投影正在重建时，结果为原因是 `projection_rebuilding` 的 `unavailable`；请稍后重试，而不要回退到活动转录文件。

    旧版的整个存储和活动转录文件辅助工具不再从插件 SDK 导出。会话元数据请使用范围限定的条目辅助工具，活动转录操作请使用转录身份辅助工具。需要文件工件的归档/支持工作流应使用专用归档接口，而不是活动会话运行时 API。

  </Accordion>
  <Accordion title="api.runtime.agent.defaults">
    默认模型和 provider 常量：

    ```typescript
    const model = api.runtime.agent.defaults.model; // e.g. "gpt-5.6-sol"
    const provider = api.runtime.agent.defaults.provider; // e.g. "openai"
    ```

  </Accordion>

  <Accordion title="api.runtime.llm">
    在不导入 provider 内部实现或重复 OpenClaw 模型/认证/基础 URL 准备逻辑的情况下，运行一次宿主拥有的文本补全。

    ```typescript
    const result = await api.runtime.llm.complete({
      messages: [{ role: "user", content: "总结这段转录内容。" }],
      purpose: "my-plugin.summary",
      maxTokens: 512,
      temperature: 0.2,
      reasoning: "high",
    });
    ```

    `maxTokens` 和 `temperature` 是建议性的采样提示。选定的
    provider、CLI 或 harness 会在其传输层提供等效控制时应用这些提示，否则可能忽略它们。它们不会削弱执行模式的隔离保证。

    若要要求使用已配置的 agent 运行时和字面意义上的零工具模型接口，请显式选择隔离执行：

    ```typescript
    const result = await api.runtime.llm.complete({
      messages: [{ role: "user", content: "Return one JSON value." }],
      systemPrompt: "You are a JSON-only function.",
      model: "openai/gpt-5.6-sol",
      execution: {
        mode: "isolated-agent-runtime",
        authProfileId: "openai:work",
        timeoutMs: 30_000,
      },
    });
    ```

    此模式只接受一条用户消息。Core 会派生已配置的 CLI 或 harness 所有者，启动全新上下文，不公开任何模型可调用工具，并且绝不会回退到直接 provider 传输。不支持的运行时会在推理前失败。`result.execution.owner` 会报告选定的所有者；当 CLI 无法报告令牌用量时，令牌用量仍然缺失。

    补全失败时，抛出的错误会公开稳定的 `code`。隔离调用方可以区分授权失败、无效的隔离输入、不受支持或不可用的运行时、中止、超时、被拒绝的输出以及其他补全失败，而无需匹配错误消息文本。

    Provider 编排还可以在发出 HTTP 请求前获取已配置的本地服务生命周期：

    ```typescript
    const lease = await api.runtime.llm.acquireLocalService(
      {
        providerId,
        baseUrl,
        headers,
      },
      signal,
    );
    try {
      // Send and fully consume the provider request.
    } finally {
      await lease?.release();
    }
    ```

    `acquireLocalService(...)` 是稳定的通用 provider 服务 SDK 合约。宿主会从 `models.providers.<providerId>.localService` 解析进程配置；调用方不能提供命令、参数、环境或生命周期策略。进程生成、就绪状态、诊断和空闲停止策略仍由宿主内部负责。

    传入准确配置的 provider ID 和解析后的请求基础 URL。不要将别名替换为适配器 ID：不同别名可能指向不同的本地 GPU 主机。除 Ollama 和 LM Studio 适配器使用的 `/v1` 规范化外，宿主会拒绝与已配置 provider 基础 URL 不匹配的端点。宿主负责启动串行化、就绪探测、请求租约、中止处理和空闲关闭。

    此辅助工具使用与 OpenClaw 内置运行时相同的简单补全准备路径，以及宿主拥有的运行时配置快照。上下文引擎会接收与会话绑定的 `llm.complete` 能力，因此模型调用使用活动会话的 agent，不会静默回退到默认 agent。结果包含 provider/model/agent 归属信息，以及可用时规范化的令牌、缓存和估算成本用量。

    设置 `reasoning` 可为选定模型请求推理力度。宿主会在分发补全前，针对选定的 provider 和模型规范化标准思考级别（`off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`adaptive`、`max` 和 `ultra`）。当受支持时，`adaptive` 会变为 `medium`，`max` 和 `ultra` 会变为 `max`；否则会变为 `xhigh`。

    <Warning>
    模型覆盖需要操作员在配置中通过 `plugins.entries.<id>.llm.allowModelOverride: true` 明确选择启用。`plugins.entries.<id>.llm.allowedModels` 会限制这些覆盖；`plugins.entries.<id>.llm.allowedCompletionModels` 则单独限制每次补全，包括宿主解析的默认值。对于直接补全，`model@profile` 覆盖仍属于已授权的模型覆盖范围。隔离模式下的 `model@profile` 覆盖和 `execution.authProfileId` 需要 `plugins.entries.<id>.llm.allowAuthProfileOverride: true`。跨 agent 补全需要 `plugins.entries.<id>.llm.allowAgentIdOverride: true`。
    </Warning>

  </Accordion>
  <Accordion title="api.runtime.gateway">
    在进程内调用另一个 Gateway 方法，同时保留当前插件受信任的运行时身份。此接口面向捆绑或受信任的官方插件，用于组合插件拥有的 Gateway 能力，而无需建立回环 WebSocket 连接。

    ```typescript
    if (await api.runtime.gateway.isAvailable()) {
      const result = await api.runtime.gateway.request<{ callId: string }>(
        "voicecall.start",
        { to: "+15550001234", mode: "conversation" },
        { timeoutMs: 60_000 },
      );
    }
    ```

    请求使用 `operator.write` 作用域，不会授予 admin 作用域。来自任意外部插件的调用都会被拒绝。失败的方法会抛出 `GatewayClientRequestError`，并保留结构化的 `details`、重试元数据和 Gateway 错误代码，以供恢复流程使用。对于也可以在独立 agent 进程中运行的工具，应先使用 `isAvailable()` 再选择此路径。

  </Accordion>
  <Accordion title="api.runtime.subagent">
    启动并管理后台 subagent 运行。

    ```typescript
    // 开始一个 subagent 运行
    const { runId } = await api.runtime.subagent.run({
      sessionKey: "agent:main:subagent:search-helper",
      message: "Expand this query into focused follow-up searches.",
      toolsAlsoAllow: ["my_plugin_progress"],
      provider: "openai", // optional override
      model: "gpt-5.6-sol", // optional override
      deliver: false,
      completionDelivery: "current-requester", // optional, before_dispatch hooks only
    });

    // 等待完成
    const result = await api.runtime.subagent.waitForRun({ runId, timeoutMs: 30000 });

    // 读取会话消息
    const { messages } = await api.runtime.subagent.getSessionMessages({
      sessionKey: "agent:main:subagent:search-helper",
      limit: 10,
    });

    // 删除会话
    await api.runtime.subagent.deleteSession({
      sessionKey: "agent:main:subagent:search-helper",
    });
    ```

    <Warning>
    模型覆盖（`provider`/`model`）需要在配置中通过 `plugins.entries.<id>.subagent.allowModelOverride: true` 获得操作员明确允许。未受信任的插件仍然可以运行 subagent，但覆盖请求会被拒绝。
    </Warning>

    `toolsAlsoAllow` 会将由调用插件注册且由其唯一拥有的工具，按精确名称添加到 worker 的常规工具接口中。运行时会拒绝 Core 工具以及与其他插件共享的名称。Profile 和操作员工具策略仍然适用，包括显式允许列表和拒绝列表。

    `completionDelivery: "current-requester"` 默认关闭，并且仅在 `before_dispatch` 钩子处理经过身份验证的入站请求时可用。OpenClaw 会在调用插件前捕获规范的请求方会话和投递路由，然后通过正常的 announce 路径投递 subagent 补全结果。插件无法提供或覆盖请求方谱系或目标字段。在该请求方绑定的钩子上下文之外调用会被拒绝。

    `deleteSession(...)` 可以删除同一插件通过 `api.runtime.subagent.run(...)` 创建的会话。删除任意用户或操作员会话仍然需要具有 admin 作用域的 Gateway 请求。

  </Accordion>
  <Accordion title="api.runtime.sandbox">
    检查 agent 会话的有效沙箱工作区权限。

    ```typescript
    const authority = api.runtime.sandbox.resolveWorkspaceAuthority({
      config: cfg,
      agentId,
      sessionKey,
    });

    const liveAuthority = await api.runtime.sandbox.prepareWorkspaceAuthority({
      config: cfg,
      agentId,
      sessionKey,
      workspaceDir,
      confinedToolNames: ["my_plugin_safe_tool"],
    });
    ```

    结果会报告此会话是否处于沙箱中、其工作区是否不可用、只读或可写，以及当有效的 Docker、工具、会话、浏览器或提权策略能够逃逸该工作区时提供可选的 `confinementError`。对于不得授予 worker 比调用方更多权限的宿主委托决策，请使用此工具。它是证明辅助工具，不能替代对调用方自身授权的检查。

    `prepareWorkspaceAuthority(...)` 会执行相同的策略检查，并为 `workspaceDir` 准备 Docker 沙箱。如果活动容器的配置哈希与请求的挂载或策略不匹配，它会拒绝该容器。仅传入调用插件能够限制其注册实现的确切工具名称；通配符前缀无法证明工具所有权。

  </Accordion>
  <Accordion title="api.runtime.nodes">
    列出已连接节点，并从 Gateway 加载的插件代码或插件 CLI 命令中调用节点主机命令。当插件拥有配对设备上的本地工作时使用，例如另一台 Mac 上的浏览器或音频桥接。

    ```typescript
    const controller = new AbortController();
    const { nodes } = await api.runtime.nodes.list({ connected: true });

    const result = await api.runtime.nodes.invoke({
      nodeId: "mac-studio",
      command: "my-plugin.command",
      params: { action: "start" },
      timeoutMs: 30000,
      signal: controller.signal,
    });
    ```

    当调用方可以被取消时，将 agent 工具或请求的 `AbortSignal` 作为 `signal` 传入。Gateway 加载的调用会将取消操作转发到配对节点；节点主机命令处理程序会通过 `context.signal` 接收该信号，以便停止正在进行的请求并释放本地资源。省略该信号的现有调用仍保持原有行为。

    当节点向 agent 暴露插件或基于 MCP 的工具时，`nodes.list(...)` 会包含每个已连接节点所公布的 `nodePluginTools` 描述符。这些描述符属于实时连接状态：Gateway 会在节点断开连接时丢弃它们；节点也可以在本地插件/MCP 清单发生变化后，通过 `node.pluginTools.update` 替换它们。

    在 Gateway 内部，此运行时处于进程内。在插件 CLI 命令中，它会通过 RPC 调用已配置的 Gateway，因此诸如 `openclaw googlemeet recover-tab` 这样的命令可以从终端检查配对节点。节点命令仍然会经过正常的 Gateway 节点配对、命令允许列表、插件节点调用策略和节点本地命令处理。

    暴露节点托管 agent 工具的插件可以为默认应加入允许列表的非危险命令设置 `agentTool.defaultPlatforms`。当操作员必须通过 `gateway.nodes.commands.allow` 主动启用时，请省略该字段。危险的节点主机命令应使用 `api.registerNodeInvokePolicy(...)` 注册节点调用策略；该策略在 Gateway 中于命令允许列表检查之后、命令转发到节点之前运行，因此直接的 `node.invoke` 调用、节点托管的插件工具和更高层级的插件工具会共享相同的执行路径。

    <Warning>
    可选的 `scopes` 字段会为调用请求 Gateway 操作员作用域。OpenClaw 仅对捆绑插件和受信任的官方插件安装兑现该字段；来自其他插件的请求不会提升调用权限。仅当受信任插件必须使用更严格的 Gateway 作用域调用节点命令时才使用它，例如 `operator.admin`。
    </Warning>

  </Accordion>
  <Accordion title="api.runtime.tasks">
    将 Task Flow 和 Task Run 状态绑定到现有的 OpenClaw 会话键或受信任的工具上下文。

    - `api.runtime.tasks.managedFlows` 具备变更能力：创建、推进和取消 Task Flow。
    - `api.runtime.tasks.flows` 和 `api.runtime.tasks.runs` 是只读 DTO 视图，用于列表和状态查询；两者都提供 `bindSession(...)` / `fromToolContext(...)` 以及 `get`、`list`、`findLatest` 和 `resolve`。

    Task Flow 跟踪持久的多步骤工作流状态。它不是调度器：
    对未来唤醒请使用 Cron 或 `api.session.workflow.scheduleSessionTurn(...)`，然后在该计划回合中使用
    `managedFlows`，当该工作需要 flow 状态、子任务、等待或取消时再使用它。

    ```typescript
    const taskFlow = api.runtime.tasks.managedFlows.fromToolContext(ctx);

    const created = taskFlow.createManaged({
      controllerId: "my-plugin/review-batch",
      goal: "Review new pull requests",
    });

    const child = taskFlow.runTask({
      flowId: created.flowId,
      runtime: "acp",
      childSessionKey: "agent:main:subagent:reviewer",
      task: "Review PR #123",
      status: "running",
      startedAt: Date.now(),
    });

    const waiting = taskFlow.setWaiting({
      flowId: created.flowId,
      expectedRevision: created.revision,
      currentStep: "await-human-reply",
      waitJson: { kind: "reply", channel: "telegram" },
    });
    ```

    当你已经从自己的绑定层获得了受信任的 OpenClaw 会话键时，请使用 `bindSession({ sessionKey, requesterOrigin })`。不要从原始用户输入中进行绑定。

  </Accordion>
  <Accordion title="api.runtime.tts">
    文本转语音合成。

    ```typescript
    // 标准 TTS
    const clip = await api.runtime.tts.textToSpeech({
      text: "Hello from OpenClaw",
      cfg: api.config,
    });

    // 面向电话优化的 TTS
    const telephonyClip = await api.runtime.tts.textToSpeechTelephony({
      text: "Hello from OpenClaw",
      cfg: api.config,
    });

    // 列出可用语音
    const voices = await api.runtime.tts.listVoices({
      provider: "elevenlabs",
      cfg: api.config,
    });
    ```

    使用 Core 的 `tts` 配置和 provider 选择。返回 PCM 音频缓冲区及采样率。还提供 `textToSpeechStream` 以支持流式合成。

  </Accordion>
  <Accordion title="api.runtime.mediaUnderstanding">
    图像、音频和视频分析。

    ```typescript
    // 描述一张图片
    const image = await api.runtime.mediaUnderstanding.describeImageFile({
      filePath: "/tmp/inbound-photo.jpg",
      cfg: api.config,
      agentDir: "/tmp/agent",
    });

    // 转写音频
    const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
      filePath: "/tmp/inbound-audio.ogg",
      cfg: api.config,
      mime: "audio/ogg", // 可选，当无法推断 MIME 时使用
    });

    // 描述一个视频
    const video = await api.runtime.mediaUnderstanding.describeVideoFile({
      filePath: "/tmp/inbound-video.mp4",
      cfg: api.config,
    });

    // 通用文件分析
    const result = await api.runtime.mediaUnderstanding.runFile({
      filePath: "/tmp/inbound-file.pdf",
      cfg: api.config,
    });

    // 通过特定 provider/model 进行结构化图像提取。
    // 至少包含一张图片；文本输入作为补充上下文。
    const evidence = await api.runtime.mediaUnderstanding.extractStructuredWithModel({
      provider: "codex",
      model: "gpt-5.6-sol",
      input: [
        {
          type: "image",
          buffer: receiptImageBuffer,
          fileName: "receipt.png",
          mime: "image/png",
        },
        { type: "text", text: "优先使用打印出来的总计，而不是手写备注。" },
      ],
      instructions: "提取供应商、总额和可搜索标签。",
      schemaName: "receipt.evidence",
      jsonSchema: {
        type: "object",
        properties: {
          vendor: { type: "string" },
          total: { type: "number" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["vendor", "total"],
      },
      cfg: api.config,
    });
    ```

    当未产生任何输出时返回 `{ text: undefined }`（例如跳过输入）。

    `describeImageFileWithModel(...)` 会通过特定 provider/model 描述一个已知图像，绕过 `describeImageFile(...)` 使用的默认活动模型解析。

  </Accordion>
  <Accordion title="api.runtime.imageGeneration">
    图像生成。

    ```typescript
    const result = await api.runtime.imageGeneration.generate({
      prompt: "A robot painting a sunset",
      cfg: api.config,
    });

    const providers = api.runtime.imageGeneration.listProviders({ cfg: api.config });
    ```

  </Accordion>
  <Accordion title="api.runtime.videoGeneration">
    视频生成，形态与图像生成一致。

    ```typescript
    const result = await api.runtime.videoGeneration.generate({
      prompt: "A drone shot flying over a coastline at sunrise",
      cfg: api.config,
    });

    const providers = api.runtime.videoGeneration.listProviders({ cfg: api.config });
    ```

  </Accordion>
  <Accordion title="api.runtime.musicGeneration">
    音乐生成，形态与图像生成一致。

    ```typescript
    const result = await api.runtime.musicGeneration.generate({
      prompt: "An upbeat lo-fi track for a coding session",
      cfg: api.config,
    });

    const providers = api.runtime.musicGeneration.listProviders({ cfg: api.config });
    ```

  </Accordion>
  <Accordion title="api.runtime.webSearch">
    网页搜索。

    ```typescript
    const providers = api.runtime.webSearch.listProviders({ config: api.config });

    const result = await api.runtime.webSearch.search({
      config: api.config,
      args: { query: "OpenClaw plugin SDK", count: 5 },
    });
    ```

  </Accordion>
  <Accordion title="api.runtime.media">
    低级媒体工具。

    ```typescript
    const webMedia = await api.runtime.media.loadWebMedia(url);
    const mime = await api.runtime.media.detectMime(buffer);
    const kind = api.runtime.media.mediaKindFromMime("image/jpeg"); // "image"
    const isVoice = api.runtime.media.isVoiceCompatibleAudio(filePath);
    const metadata = await api.runtime.media.getImageMetadata(filePath);
    const resized = await api.runtime.media.resizeToJpeg(buffer, { maxWidth: 800 });
    const terminalQr = await api.runtime.media.renderQrTerminal("https://openclaw.ai");
    const pngQr = await api.runtime.media.renderQrPngBase64("https://openclaw.ai", {
      scale: 6, // 1-12
      marginModules: 4, // 0-16
    });
    const pngQrDataUrl = await api.runtime.media.renderQrPngDataUrl("https://openclaw.ai");
    const tmpRoot = resolvePreferredOpenClawTmpDir();
    const pngQrFile = await api.runtime.media.writeQrPngTempFile("https://openclaw.ai", {
      tmpRoot,
      dirPrefix: "my-plugin-qr-",
      fileName: "qr.png",
    });
    ```

  </Accordion>
  <Accordion title="api.runtime.config">
    当前运行时配置快照和事务性配置写入。优先使用已经传入当前调用路径的配置；仅当处理器需要直接获取进程快照时才使用
    `current()`。

    ```typescript
    const cfg = api.runtime.config.current();
    await api.runtime.config.mutateConfigFile({
      afterWrite: { mode: "auto" },
      mutate(draft) {
        draft.plugins ??= {};
      },
    });
    ```

    `mutateConfigFile(...)` 和 `replaceConfigFile(...)` 会返回一个 `followUp`
    值，例如 `{ mode: "restart", requiresRestart: true, reason }`，
    它记录了写入方的意图，而不会把重启控制权从 Gateway 手中夺走。

  </Accordion>
  <Accordion title="api.runtime.system">
    系统级工具。

    ```typescript
    const accepted = api.runtime.system.enqueueSystemEvent(text, options);
    api.runtime.system.requestHeartbeat({
      source: "other",
      intent: "event",
      reason: "plugin-event",
    });
    api.runtime.system.requestHeartbeatNow({ reason: "plugin-event" }); // Deprecated compatibility alias.
    const heartbeatResult = await api.runtime.system.runHeartbeatOnce({
      reason: "plugin-triggered-check",
    });
    const output = await api.runtime.system.runCommandWithTimeout(cmd, args, opts);
    const hint = api.runtime.system.formatNativeDependencyHint(pkg);
    ```

    `runHeartbeatOnce(...)` 会立即运行一次心跳周期，绕过正常的合并计时器。投递目标默认为已配置的操作员 DM（`commands.ownerAllowFrom`，然后是 channel `allowFrom`）；传入 `{ heartbeat: { target: "none" } }` 可执行仅内部运行。

    `runCommandWithTimeout(...)` 返回捕获的 `stdout` 和 `stderr`、可选的截断计数、`code`、`signal`、`killed`、`termination` 以及 `noOutputTimedOut`。当子进程未提供非零退出代码时，超时和无输出超时结果会报告 `code: 124`。非超时的信号退出仍可能返回 `code: null`，因此请使用 `termination` 和 `noOutputTimedOut` 区分超时原因。

  </Accordion>
  <Accordion title="api.runtime.events">
    事件订阅。

    ```typescript
    api.runtime.events.onAgentEvent((event) => {
      /* ... */
    });
    api.runtime.events.onSessionTranscriptUpdate((update) => {
      /* ... */
    });
    ```

  </Accordion>
  <Accordion title="api.runtime.logging">
    日志记录。

    ```typescript
    const verbose = api.runtime.logging.shouldLogVerbose();
    const childLogger = api.runtime.logging.getChildLogger({ plugin: "my-plugin" }, { level: "debug" });
    ```

  </Accordion>
  <Accordion title="api.runtime.modelAuth">
    模型和 provider 认证解析。

    ```typescript
    const auth = await api.runtime.modelAuth.getApiKeyForModel({ model, cfg });

    // Request-ready auth, including provider runtime exchanges (e.g. OAuth refresh)
    const runtimeAuth = await api.runtime.modelAuth.getRuntimeAuthForModel({ model, cfg });

    const providerAuth = await api.runtime.modelAuth.resolveApiKeyForProvider({
      provider: "openai",
      cfg,
    });
    ```

  </Accordion>
  <Accordion title="api.runtime.state">
    状态目录解析和基于 SQLite 的键值存储。

    ```typescript
    const stateDir = api.runtime.state.resolveStateDir(process.env);
    const store = api.runtime.state.openKeyedStore<MyRecord>({
      namespace: "my-feature",
      maxEntries: 200,
      defaultTtlMs: 15 * 60_000,
    });

    await store.register("key-1", { value: "hello" });
    const claimed = await store.registerIfAbsent("dedupe-key", { value: "first" });
    const value = await store.lookup("key-1");
    await store.deleteIf?.("key-1", (current) => current.value === "hello");
    await store.consume("key-1");
    await store.clear();

    const blobs = api.runtime.state.openBlobStore<MyBlobMetadata>({
      namespace: "rendered-artifacts",
      maxEntries: 100,
      maxBytesPerEntry: 4 * 1024 * 1024,
      maxBytesPerNamespace: 64 * 1024 * 1024,
      defaultTtlMs: 15 * 60_000,
    });
    await blobs.register(
      "artifact-1",
      new TextEncoder().encode("binary or text payload"),
      { contentType: "text/plain" },
    );
    const blob = await blobs.lookup("artifact-1");
    ```

    键值存储可以跨重启保留，并按运行时绑定的插件 ID 隔离。使用 `registerIfAbsent(...)` 进行原子去重认领：当键缺失或已过期并完成注册时返回 `true`；当仍存在有效值时返回 `false`，且不会覆盖其值、创建时间或 TTL。需要只删除之前观察到的值时，请使用 `deleteIf(...)`；其同步谓词和删除操作在同一个 SQLite 事务中运行。限制包括：每个命名空间的 `maxEntries`、每个插件 50,000 个有效行、JSON 值小于 64KB，以及可选的 TTL 过期。默认情况下，达到任一行数限制时，写入会从正在写入的命名空间中清除最早的有效行；同级命名空间不会因该写入被驱逐；如果命名空间无法释放足够行数，写入仍会失败。对于绝不能被驱逐的持久所有权记录，请设置 `overflowPolicy: "reject-new"`：达到任一限制时新键会失败，而现有键仍可更新。

    `openSyncKeyedStore<T>(...)` 返回相同形态的存储，但方法是同步的（`register`、`registerIfAbsent`、`deleteIf`、`lookup`、`consume`、`clear` 都会直接返回值，而不是返回 promise），适用于无法等待的调用方。

    `openBlobStore<TMetadata>(...)` 会在共享 SQLite 中存储有界二进制载荷，无需 base64 或文件旁路文件。它要求设置每条记录、每个命名空间的字节数和行数限制；会在 API 边界复制字节数组；并且列出元数据时不会加载每个 BLOB。`register(...)` 是显式 upsert，包括对已过期键的操作。`registerIfAbsent(...)` 提供无冲突创建：已过期的键在其所有者通过 `deleteExpiredKey(key)` 或 `deleteExpired()` 认领前仍保持占用，从而保留在 SQLite 提交后删除相关命名工件所需的元数据。任何带 TTL 的行都是临时的，即使尚未过期也会从备份/恢复中排除；对于持久且可恢复的状态，请省略 TTL。宿主保险机制将每个 BLOB 限制为 100 MiB、每个插件物理存储的 BLOB 限制为 512 MiB，并将每个插件物理存储的行限制为 50,000 行，包括等待所有者清理的过期行。当外部物化结果不得因替换或驱逐而被静默遗弃时，请将 `overflowPolicy: "reject-new"` 与 `registerIfAbsent(...)` 一起使用。

    `openChannelIngressQueue<TPayload>` 会打开一个范围限定到调用插件的持久化入站队列，用于缓冲需要在重启期间至少处理一次的入站事件。当过期认领恢复使用 `shouldRecover` 时，如果损坏的已认领载荷应被隔离，还应提供 `shouldRecoverCorrupt`：其与载荷无关的认领身份使插件能够在队列将该行标记为墓碑前保留活动所有者和通道策略。

    插件状态租约已被移除。对于原子数据库工作，请使用短 SQLite 事务；对于有界持久状态，请使用范围限定到插件的键值存储（`openKeyedStore` 或 `openSyncKeyedStore`）。

    `openChannelIngressDrain(...)` 会在该队列上打开 Core 的与 channel 无关的 worker（如果未提供队列，则创建一个队列）。该 drain 负责过期认领恢复、按通道进行的认领串行化、在采用时完成或在调度返回时完成、重试/死信处置、可选的采用前替代，以及认领到采用的停滞超时。通过 `plugin-sdk/channel-outbound` 中的 `bindIngressLifecycleToReplyOptions`，使用 `turnAdoptionLifecycle` 将认领所有权接入回复生成。Channel 插件负责接收侧入队、通道派生、不可重试分类以及任何替代授权策略。

    <Warning>
    在此版本中，`openBlobStore`、`openKeyedStore`、`openSyncKeyedStore`、`openChannelIngressQueue` 和 `openChannelIngressDrain` 仅对捆绑插件和受信任的官方插件安装可用。拒绝信息会包含插件 ID 及其加载来源；从 `plugins.load.paths` 加载的 channel 插件或非官方安装均不受信任，因此其入站监控会使 channel 启动失败，而不是在没有持久化队列的情况下运行。
    </Warning>

  </Accordion>
  <Accordion title="api.runtime.channel">
    Channel 特定的运行时辅助工具（加载 channel 插件时可用）。按关注点分组：

    | 分组 | 用途 |
    | --- | --- |
    | `text` | 分块（`chunkText`、`chunkMarkdownText`、`resolveChunkMode`）、控制命令检测、Markdown 表格转换。 |
    | `reply` | 缓冲块回复调度、信封格式化、有效消息/人工延迟配置解析。 |
    | `routing` | `buildAgentSessionKey`、`resolveAgentRoute`。 |
    | `pairing` | `buildPairingReply`、允许列表读取/删除、配对请求 upsert，以及从请求派生的审批条目。 |
    | `media` | 远程媒体下载/保存（见下文）。 |
    | `activity` | 记录/读取最近的 channel 活动。 |
    | `session` | 从入站事件获取会话元数据、更新最近路由。 |
    | `mentions` | 提及策略辅助工具（见下文）。 |
    | `reactions` | 用于正在进行的处理指示器的确认反应句柄。 |
    | `groups` | 群组策略和需提及解析。 |
    | `debounce` | 入站消息去抖。 |
    | `commands` | 命令授权和文本命令门控。 |
    | `outbound` | 加载 channel 的出站适配器。 |
    | `inbound` | 构建入站事件上下文并运行共享的入站事件/回复内核。 |
    | `threadBindings` | 调整已绑定会话线程的空闲超时/最大时长。 |
    | `runtimeContexts` | 注册、读取和监视进程本地的每 channel/账户/能力上下文。 |

    `api.runtime.channel.media` 是 channel 媒体下载和存储的首选接口：

    ```typescript
    const saved = await api.runtime.channel.media.saveRemoteMedia({
      url,
      subdir: "inbound",
      maxBytes,
      filePathHint: fileName,
    });
    ```

    当远程 URL 应该成为 OpenClaw 媒体时使用 `saveRemoteMedia(...)`。当插件已经使用插件自有的认证、重定向或允许列表处理获取到 `Response` 时，使用 `saveResponseMedia(...)`。仅当插件需要原始字节进行检查、转换、解密或重新上传时，才使用 `readRemoteMediaBuffer(...)`。`fetchRemoteMedia(...)` 仍然作为 `readRemoteMediaBuffer(...)` 的已弃用兼容别名保留。

    `api.runtime.channel.mentions` 是使用运行时注入的捆绑 channel 插件共享的入站提及策略接口：

    ```typescript
    const mentionMatch = api.runtime.channel.mentions.matchesMentionWithExplicit(text, {
      mentionRegexes,
      mentionPatterns,
    });

    const decision = api.runtime.channel.mentions.resolveInboundMentionDecision({
      facts: {
        canDetectMention: true,
        wasMentioned: mentionMatch.matched,
        implicitMentionKinds: api.runtime.channel.mentions.implicitMentionKindWhen(
          "reply_to_bot",
          isReplyToBot,
        ),
      },
      policy: {
        isGroup,
        requireMention,
        allowTextCommands,
        hasControlCommand,
        commandAuthorized,
      },
    });
    ```

    可用的提及辅助工具：

    - `buildMentionRegexes`
    - `matchesMentionPatterns`
    - `matchesMentionWithExplicit`
    - `implicitMentionKindWhen`
    - `resolveInboundMentionDecision`

    使用规范化的 `{ facts, policy }` 路径进行提及决策。

    `reply`、`session` 和 `inbound` 下的多个字段带有指向当前 channel-turn 内核或 channel-outbound 适配器的 `@deprecated` 注释；在基于特定辅助工具构建新代码前，请查看其内联 JSDoc。

  </Accordion>
</AccordionGroup>

## Gateway 服务事件

使用 `api.registerService(...)` 注册的长期运行服务，在进程运行 Gateway 广播器时会收到一个进程本地的
`ctx.gatewayEvents` facade；在没有广播器的运行时中，该字段不存在，因此请进行特性检测并保留回退方案（例如粗粒度轮询）。使用
`onSessionsChanged(...)` 在 Gateway 广播 `sessions.changed` 通知后作出响应：

```typescript
let unsubscribeSessionsChanged: (() => void) | undefined;

api.registerService({
  id: "session-index",
  start(ctx) {
    unsubscribeSessionsChanged = ctx.gatewayEvents?.onSessionsChanged((event) => {
      // event: { sessionKey, agentId?, label?, displayName?, reason?, phase? }
      refreshSession(event.sessionKey);
    });
  },
  stop() {
    unsubscribeSessionsChanged?.();
    unsubscribeSessionsChanged = undefined;
  },
});
```

处理程序在 Gateway 进程中运行，不会添加 Gateway 协议订阅。请保留返回的取消订阅函数，并在服务清理期间调用它。该负载是轻量级的变更通知；当插件需要完整的当前会话条目时，请使用 `api.runtime.agent.session.getSessionEntry(...)`。

## 存储运行时引用

使用 `createPluginRuntimeStore` 在 `register` 回调之外存储运行时引用：

<Steps>
  <Step title="创建存储">
    ```typescript
    import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
    import type { PluginRuntime } from "openclaw/plugin-sdk/runtime-store";

    const store = createPluginRuntimeStore<PluginRuntime>({
      pluginId: "my-plugin",
      errorMessage: "my-plugin runtime not initialized",
    });
    ```

  </Step>
  <Step title="接入入口点">
    ```typescript
    export default defineChannelPluginEntry({
      id: "my-plugin",
      name: "My Plugin",
      description: "示例",
      plugin: myPlugin,
      setRuntime: store.setRuntime,
    });
    ```
  </Step>
  <Step title="从其他文件访问">
    ```typescript
    export function getRuntime() {
      return store.getRuntime(); // 如果未初始化则抛出
    }

    export function tryGetRuntime() {
      return store.tryGetRuntime(); // 如果未初始化则返回 null
    }
    ```

  </Step>
</Steps>

<Note>
在 runtime-store 标识中优先使用 `pluginId`。较低层级的 `key` 形式适用于少数场景，即某个插件有意需要多个运行时槽位。
</Note>

## 其他顶层 `api` 字段

除了 `api.runtime` 之外，API 对象还提供：

<ParamField path="api.id" type="string">
  插件 id。
</ParamField>
<ParamField path="api.name" type="string">
  插件显示名称。
</ParamField>
<ParamField path="api.config" type="OpenClawConfig">
  当前配置快照（如可用，则为当前内存中的运行时快照）。
</ParamField>
<ParamField path="api.pluginConfig" type="Record<string, unknown>">
  来自 `plugins.entries.<id>.config` 的插件专属配置。
</ParamField>
<ParamField path="api.logger" type="PluginLogger">
  作用域日志记录器（`debug`、`info`、`warn`、`error`）。
</ParamField>
<ParamField path="api.registrationMode" type="PluginRegistrationMode">
  当前加载模式：`"full"`（实时激活）、`"discovery"` / `"tool-discovery"`（只读能力发现）、`"setup-only"`（轻量级设置入口）、`"setup-runtime"`（同时需要运行时通道入口的设置流程）或 `"cli-metadata"`（CLI 命令元数据收集）。
</ParamField>
<ParamField path="api.resolvePath(input)" type="(string) => string">
  解析相对于插件根目录的路径。
</ParamField>

## 相关内容

- [插件内部机制](/plugins/architecture) — 能力模型和注册表
- [SDK 入口点](/plugins/sdk-entrypoints) — `definePluginEntry` 选项
- [SDK 概览](/plugins/sdk-overview) — 子路径参考
