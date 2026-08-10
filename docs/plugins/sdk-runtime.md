---
summary: "api.runtime -- 可注入给插件的运行时辅助工具"
title: "插件运行时辅助工具"
sidebarTitle: "运行时辅助工具"
read_when:
  - You need to call core helpers from a plugin (TTS, STT, image gen, web search, Gateway, subagent, nodes)
  - You want to understand what api.runtime exposes
  - You are accessing config, agent, or media helpers from plugin code
  - You are implementing model-picker persistence in a channel plugin
---

`api.runtime` 对象的参考文档，该对象会在每个插件注册时注入。请使用这些辅助工具，而不是直接导入宿主内部实现。

<CardGroup cols={2}>
  <Card title="Channel plugins" href="/plugins/sdk-channel-plugins">
    在 channel 插件上下文中使用这些辅助工具的分步指南。
  </Card>
  <Card title="Provider plugins" href="/plugins/sdk-provider-plugins">
    在 provider 插件上下文中使用这些辅助工具的分步指南。
  </Card>
</CardGroup>

```typescript
register(api) {
  const runtime = api.runtime;
}
```

`api.runtime.version` is the current OpenClaw product version, sourced from the shared version resolver so plugins see the same value the CLI reports.

## Config loading and writes

优先使用已经传入当前调用路径的配置，例如注册期间的 `api.config`，或者 channel/provider 回调中的 `cfg` 参数。这样可以让单次进程快照贯穿整个工作流程，而不是在热点路径上重复解析配置。

仅当长生命周期处理器需要当前进程快照且该函数未传入配置时，才使用 `api.runtime.config.current()`。返回值是只读的；在编辑前请先克隆，或使用修改辅助工具。

工具工厂会接收 `ctx.runtimeConfig` 以及 `ctx.getRuntimeConfig()`。当长生命周期工具的 `execute` 回调中，配置可能在工具定义创建后发生变化时，请在回调内使用 getter。

通过 `api.runtime.config.mutateConfigFile(...)` 或 `api.runtime.config.replaceConfigFile(...)` 持久化更改。每次写入都必须选择明确的 `afterWrite` 策略：

- `afterWrite: { mode: "auto" }` 允许 gateway 重新加载规划器自行决定。
- `afterWrite: { mode: "restart", reason: "..." }` 当写入方知道热重载不安全时，强制进行一次干净重启。
- `afterWrite: { mode: "none", reason: "..." }` 仅当调用方自己负责后续处理时，才抑制自动重载/重启。

这些修改辅助工具会返回 `afterWrite` 以及带类型的 `followUp` 摘要，因此调用方可以记录或测试自己是否请求了重启。gateway 仍然负责决定重启何时真正发生。

Use `current()`, a passed-in `cfg`, `mutateConfigFile(...)`, or
`replaceConfigFile(...)` for runtime config access and writes.

For direct SDK imports, prefer the focused config subpaths over the broad `openclaw/plugin-sdk/config-runtime` compatibility barrel: `config-contracts` for types, `runtime-config-snapshot` for current process snapshots, and `config-mutation` for writes. Read entry-scoped values from `api.pluginConfig`; use a supplied tool context only for its runtime-wide config snapshot, and keep plugin-specific merging at that boundary. Bundled plugin tests should mock these focused subpaths directly instead of mocking the broad compatibility barrel.

Internal OpenClaw runtime code follows the same direction: load config once at the CLI, gateway, or process boundary, then pass that value through. Successful mutation writes refresh the process runtime snapshot and advance its internal revision; long-lived caches should key off the runtime-owned cache key instead of serializing config locally. Long-lived runtime modules have a zero-tolerance scanner for ambient `loadConfig()` calls; use a passed `cfg`, a request `context.getRuntimeConfig()`, or `getRuntimeConfig()` at an explicit process boundary.

provider 和 channel 的执行路径必须使用当前运行时配置快照，而不是用于配置回读或编辑的文件快照。文件快照会保留源值，例如用于 UI 和写入的 SecretRef 标记；provider 回调需要的是解析后的运行时视图。当某个辅助工具可能接收当前源快照或当前运行时快照中的任意一种时，请在读取凭据前通过 `selectApplicableRuntimeConfig()` 进行路由。

## 可复用运行时工具

Model-picker integrations use two focused runtime subpaths. Import the typed
`ModelPickerAction` and `ModelPickerCapabilityProfile` contracts from
`openclaw/plugin-sdk/interactive-runtime`. Import
`applySessionModelSelection(...)` and its result types from
`openclaw/plugin-sdk/model-session-runtime`; this is the live-session mutation
seam, including its authoritative conflict check and post-commit effects. The
lower-level `applyModelOverrideToSessionEntry(...)` helper is not a picker
persistence API.

Use `applyModelOverrideWithAuthProfileCompatibility(...)` only as the direct
persistence fallback when a channel callback cannot enter the full live-session
transaction and already owns an atomic canonical session-entry patch. Pass the
active config, resolved agent directory, entry, effective provider before the
change, and validated selection. The helper mutates that entry only: it keeps a
pinned auth profile when its recorded credential provider or configured alias is
compatible, clears an incompatible pin, and enforces the model-selection lock.
The caller still owns model allowlist validation, atomic persistence,
`markLiveSwitchPending`, and any post-commit effects. Prefer
`applySessionModelSelection(...)` whenever the full transaction is available.

Model-picker actions carry only bounded snapshot and catalog tokens. Channel
actor identity, source-message binding, and serialized callback data stay in
the channel's private authenticated envelope. Channel codecs opt into resolving
these actions with `{ modelPicker: true }`; channels without a picker
capability continue to fail closed instead of treating the action as an opaque
callback.

Use inbound `botLoopProtection` facts for bot-authored inbound messages. Core applies the shared in-memory sliding-window guard before session record and dispatch, without tying the policy to one channel. The guard tracks `(scopeId, conversationId, participant pair)` keys, counts both directions of a pair together, applies a cooldown once the window budget is exceeded, and prunes inactive entries opportunistically. Retryable transports should also supply a stable `eventId`; replaying an accepted event while it remains in the active window does not consume another budget slot. Suppressed events add no retained event-identity state.

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

    `resolveCliBackendDispatchEligibility({ provider, model, agentId, authProfileId, config, agentDir, workspaceDir })` shares the embedded runner's CLI-backend dispatch decision (route, the backend's declared `subscriptionAuthDispatch` capability, stored credential mode — honoring an explicitly pinned `authProfileId`) with callers that opt embedded runs into `cliBackendDispatch: "subscription-auth"`. It returns `{ provider }` when the run would execute through the CLI backend and `undefined` when it stays on the direct passthrough, so callers can budget timeouts for the run that will actually execute.

    `resolveThinkingPolicy(...)` returns the provider/model's supported thinking levels and optional default. Provider plugins own the model-specific profile through their thinking hooks, so tool plugins should call this runtime helper instead of importing or duplicating provider lists.

    `normalizeThinkingLevel(...)` 会将用户文本（例如 `on`、`x-high` 或 `extra high`）转换为规范化的存储级别，然后再将其与解析出的策略进行比较。

    `resolveSessionCatalogCreateTarget(...)` is the supported synchronous policy seam for trusted native plugins that implement `SessionCatalogProvider.resolveCreateSession`. It selects the first candidate model routed to the requested runtime and allowed for the requested or default agent. It returns `undefined` when no candidate satisfies both policies. Use this helper instead of importing or duplicating core model-selection policy in a plugin.

    **Session store helpers** are under `api.runtime.agent.session`:

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

    Prefer `getSessionEntry(...)`, `listSessionEntries(...)`, `patchSessionEntry(...)`, or `upsertSessionEntry(...)` for session workflows. These helpers address sessions by agent/session identity so plugins do not depend on the legacy `sessions.json` storage shape. Use `preserveActivity: true` for metadata-only patches that should not refresh session activity, and `replaceEntry: true` only when the callback returns a complete entry and deleted fields must stay deleted. Doctor and migration paths can combine `fallbackEntry`, `skipMaintenance`, and `requireWriteSuccess` for one atomic canonical-store repair.

    `createSessionEntry(...)` creates a new canonical session row and transcript. Its trusted `initialEntry` surface is deliberately narrow. A plugin may select an owned `agentHarnessId`; seed an owned CLI backend with `cliBackendId`, `model`, and `cliSessionBinding`; or seed a persistent ACP session with `acpBackendId` and `acpSessionBinding: { acpAgentId, agentSessionId }`. The ACP variant persists the supplied native agent session id through the canonical SQLite ACP metadata owner so the first turn resumes that external session. The injected runtime restricts plugin-owned CLI and ACP sessions to the calling plugin's `plugin:<id>:` namespace; harness ids must be owned through `registerAgentHarness(...)`. These are ownership invariants, not a sandbox between in-process plugins. Creation rejects an existing row; `label` and `spawnedCwd` are separate creation fields rather than trusted-entry patches.

    Before advertising an ACP-backed action, use `resolveAcpSessionAvailability(...)` from `openclaw/plugin-sdk/acp-runtime`. It applies the canonical enablement, dispatch, allowed-agent, registered-backend, and backend-health checks; recheck it immediately before creating the session.

    Creation holds the session lifecycle mutation fence through `afterCreate`, so new work waits for plugin-owned initialization to finish and pre-existing admitted work makes creation fail. The callback receives a clone of the created state. If it returns a patch, that patch may contain only `pluginExtensions`, and its value is the complete final `pluginExtensions` field. A callback or final-persistence failure rolls back the unchanged new row and transcript; guarded rollback preserves a row changed or claimed concurrently. `recoverMatchingInitialEntry: true` is only for retrying interrupted initialization when the persisted trusted fields match exactly, and recovery requires `afterCreate` to return a final patch.

    Use `runWithWorkAdmission(...)` when a plugin starts work on a persisted session. The callback rejects archived or concurrently replaced sessions, keeps archive/reset/delete mutations coordinated through completion, and receives an `AbortSignal` that must be forwarded to the agent run. A harness may explicitly name trusted execution delegates through its experimental `delegatedExecutionPluginIds` registration field. Delegates can admit and run only an exact existing model-locked session; all session mutations remain restricted to the harness owner. See [Agent harness plugins](/plugins/sdk-agent-harness#delegated-execution).

    Maintenance and repair plugins may use `deleteSessionEntry(...)` for one scoped session entry, `cleanupSessionLifecycleArtifacts(...)` for lifecycle-owned scratch sessions, and `resolveSessionStoreBackupPaths(...)` before mutating a store. Pass `expectedSessionId` and `expectedUpdatedAt` when deletion must not race a concurrent session update; use `expectedSessionId: null` when the earlier snapshot had no session id. These helpers are narrow repair/lifecycle surfaces, not a general store deletion API.

    `resolveStorePath(...)` and `updateSessionStoreEntry(...)` round out the session helpers: `resolveStorePath` resolves the session store path for a given scope, and `updateSessionStoreEntry({ storePath, sessionKey, update })` patches one entry directly by store path when the caller already knows it.

    `loadTranscriptEventsSync(...)` is available for synchronous doctor and repair paths that cannot use the async transcript runtime. It returns raw `SessionStoreTranscriptEvent` records. Normal plugin runtime code should prefer `openclaw/plugin-sdk/session-transcript-runtime`.

    `formatSqliteSessionFileMarker(...)`, `parseSqliteSessionFileMarker(...)`, and `sqliteSessionFileMarkerMatchesSession(...)` are transitional helpers for code that still receives a legacy field named `sessionFile`. A parsed SQLite marker identifies a live SQLite transcript target; it is not a filesystem path. New APIs should carry typed session identity instead of marker strings.

    For transcript reads and writes, import `openclaw/plugin-sdk/session-transcript-runtime` and use `resolveSessionTranscriptIdentity(...)`, `resolveSessionTranscriptTarget(...)`, `readSessionTranscriptEvents(...)`, `readSessionTranscriptRawDelta(...)`, `readSessionTranscriptVisibleMessageDelta(...)`, `readVisibleSessionTranscriptMessageEntries(...)`, `appendSessionTranscriptMessageByIdentity(...)`, `publishSessionTranscriptUpdateByIdentity(...)`, or `withSessionTranscriptWriteLock(...)` with `{ agentId, sessionKey, sessionId }`. These APIs let plugins identify a transcript, read raw events or visible branch-safe message entries, append messages, publish updates, and run related operations under the same transcript write lock without depending on active transcript file paths. `readVisibleSessionTranscriptMessageEntries(...)` returns ordered read metadata; its `seq` field is not a resumable cursor.

    `appendSessionTranscriptMessageByIdentity(...)` is a low-level append of an already canonical message. Plugins must not synthesize media-bearing user rows with top-level `MediaPath`, `MediaPaths`, `MediaUrl`, `MediaUrls`, `MediaType`, or `MediaTypes`. Channel ingress should pass ordered facts through `MsgContext.media` and let the host own user-turn persistence. A host-prepared persisted user message carries canonical ordered facts under `message.__openclaw.media`; the generic append API does not infer or repair legacy parallel arrays.

    `readSessionTranscriptRawDelta(...)` returns a bounded `page`, `reset`, or `missing` result. Pass the opaque `page.cursor` into the next call. Pure appends preserve the cursor, while transcript replacement returns `reset` with a new bootstrap cursor. Pages default to 1,000 events and 1,000,000 serialized bytes; callers may request up to 10,000 events and 64 MiB. When the next event alone exceeds `maxBytes`, the page is empty and reports `requiredBytes`; retry with at least that byte limit when it is no greater than 64 MiB. Larger individual events require the complete-read API. A cursor identifies position only and never grants access to another session.

    `readSessionTranscriptVisibleMessageDelta(...)` provides the same bounded bootstrap-and-resume shape over the host-owned active message projection. It returns messages from oldest to newest, so context engines can drain initial history and persist the opaque cursor as their watermark. Store and return the cursor unchanged; it is a continuation hint, not an authorization credential. Linear appends resume after the last returned message. Transcript replacement, a cursor whose anchor left or moved within the active branch, malformed cursors, and cross-session cursors return `reset` with a fresh bootstrap cursor. The count and byte defaults and caps match the raw delta API. While the active projection is rebuilding after a branch change, the result is `unavailable` with reason `projection_rebuilding`; retry later rather than falling back to an active transcript file.

    The legacy whole-store and active transcript file helpers are no longer exported from the plugin SDK. Use the scoped entry helpers for session metadata and the transcript identity helpers for active transcript operations. Archive/support workflows that need file artifacts should use their dedicated archive surfaces instead of active session runtime APIs.

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

    `maxTokens` and `temperature` are advisory sampling hints. The selected
    provider, CLI, or harness applies them when its transport exposes an
    equivalent control and otherwise may ignore them. They do not weaken the
    execution mode's isolation guarantees.

    To require the configured agent runtime and a literal zero-tool model
    surface, select isolated execution explicitly:

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

    This mode accepts exactly one user message. Core derives the configured CLI
    or harness owner, starts a fresh context, exposes no model-callable tools,
    and never falls back to direct provider transport. Unsupported runtimes fail
    before inference. `result.execution.owner` reports the selected owner;
    token usage remains absent when a CLI cannot report it.

    Completion failures expose a stable `code` on the thrown error. Isolated
    callers can distinguish authorization, invalid isolated input, unsupported
    or unavailable runtimes, aborts, timeouts, rejected output, and other
    completion failures without matching message text.

    Provider orchestration can also acquire the configured local-service
    lifecycle before issuing an HTTP request:

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

    `acquireLocalService(...)` is a stable, generic provider-service SDK
    contract. The host resolves process configuration from
    `models.providers.<providerId>.localService`; callers cannot supply a
    command, arguments, environment, or lifecycle policy. Process spawning,
    readiness, diagnostics, and idle-stop policy remain internal to the host.

    Pass the exact configured provider id and resolved request base URL. Do not
    replace aliases with an adapter id: separate aliases can point at separate
    local GPU hosts. The host rejects endpoints that do not match the configured
    provider base URL, apart from the `/v1` normalization used by Ollama and LM
    Studio adapters. The host owns startup serialization, readiness probes,
    request leases, abort handling, and idle shutdown.

    The helper uses the same simple-completion preparation path as OpenClaw's
    built-in runtime and the host-owned runtime config snapshot. Context engines
    receive a session-bound `llm.complete` capability, so model calls use the
    active session's agent and do not silently fall back to the default agent. The
    result includes provider/model/agent attribution plus normalized token,
    cache, and estimated cost usage when available.

    Set `reasoning` to request a reasoning effort for the selected model. The
    host normalizes the canonical thinking levels (`off`, `minimal`, `low`,
    `medium`, `high`, `xhigh`, `adaptive`, `max`, and `ultra`) for the selected
    provider and model before dispatching the completion. `adaptive` becomes
    `medium`; `max` and `ultra` become `max` when supported, otherwise `xhigh`.

    <Warning>
    Model overrides require operator opt-in via `plugins.entries.<id>.llm.allowModelOverride: true` in config. `plugins.entries.<id>.llm.allowedModels` restricts those overrides; `plugins.entries.<id>.llm.allowedCompletionModels` separately restricts every completion, including host-resolved defaults. For direct completions, a `model@profile` override remains part of the authorized model override. Isolated `model@profile` overrides and `execution.authProfileId` require `plugins.entries.<id>.llm.allowAuthProfileOverride: true`. Cross-agent completions require `plugins.entries.<id>.llm.allowAgentIdOverride: true`.
    </Warning>

  </Accordion>
  <Accordion title="api.runtime.gateway">
    Call another Gateway method in process while preserving the current plugin's trusted runtime
    identity. This is intended for bundled or trusted official plugins that compose plugin-owned
    Gateway capabilities without opening a loopback WebSocket connection.

    ```typescript
    if (await api.runtime.gateway.isAvailable()) {
      const result = await api.runtime.gateway.request<{ callId: string }>(
        "voicecall.start",
        { to: "+15550001234", mode: "conversation" },
        { timeoutMs: 60_000 },
      );
    }
    ```

    Requests use `operator.write` scope and do not grant admin scope. Calls from arbitrary external
    plugins are rejected. Failed methods throw a `GatewayClientRequestError`, preserving structured
    `details`, retry metadata, and the Gateway error code for recovery flows. Use `isAvailable()`
    before choosing this path from tools that can also run in standalone agent processes.

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

    `toolsAlsoAllow` adds exact, uniquely owned tools registered by the calling plugin to the worker's normal tool surface. The runtime rejects core tools and names shared with another plugin. Profiles and operator tool policies still apply, including explicit allowlists and denies.

    `completionDelivery: "current-requester"` is default-off and is only available while a `before_dispatch` hook is handling an authenticated inbound request. OpenClaw captures the canonical requester session and delivery route before invoking the plugin, then delivers the subagent completion through the normal announce path. Plugins cannot provide or override requester lineage or destination fields. Calls outside that requester-bound hook context are rejected.

    `deleteSession(...)` can delete sessions created by the same plugin through `api.runtime.subagent.run(...)`. Deleting arbitrary user or operator sessions still requires an admin-scoped Gateway request.

  </Accordion>
  <Accordion title="api.runtime.sandbox">
    Inspect the effective sandbox workspace authority for an agent session.

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

    The result reports whether this session is sandboxed, whether its workspace
    is unavailable, read-only, or writable, and an optional `confinementError`
    when the effective Docker, tool, session, browser, or elevated policy can
    escape that workspace. Use this for host-owned delegation decisions that
    must not grant a worker more authority than its caller. It is an attestation
    helper, not a replacement for checking the caller's own authorization.

    `prepareWorkspaceAuthority(...)` performs the same policy check and also
    prepares the Docker sandbox for `workspaceDir`. It rejects a hot container
    whose live config hash does not match the requested mounts or policy. Pass
    only exact tool names whose registered implementations the calling plugin
    confines; wildcard prefixes do not prove tool ownership.

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

    Pass the agent tool or request `AbortSignal` as `signal` when the caller can
    be canceled. Gateway-loaded calls forward cancellation to the paired node;
    node-host command handlers receive it as `context.signal` so they can stop
    in-flight requests and release local resources. Existing calls that omit the
    signal retain their previous behavior.

    `nodes.list(...)` includes each connected node's advertised
    `nodePluginTools` descriptors when that node exposes plugin or MCP-backed
    tools to the agent. Those descriptors are live connection state: the Gateway
    drops them when the node disconnects, and a node can replace them with
    `node.pluginTools.update` after local plugin/MCP inventory changes.

    Inside the Gateway this runtime is in-process. In plugin CLI commands it calls the configured Gateway over RPC, so commands such as `openclaw googlemeet recover-tab` can inspect paired nodes from the terminal. Node commands still go through normal Gateway node pairing, command allowlists, plugin node-invoke policies, and node-local command handling.

    Plugins that expose node-hosted agent tools can set `agentTool.defaultPlatforms` for non-dangerous commands that should be allowlisted by default. Omit it when operators must opt in with `gateway.nodes.commands.allow`. Dangerous node-host commands should register a node-invoke policy with `api.registerNodeInvokePolicy(...)`; the policy runs in the Gateway after command allowlist checks and before the command is forwarded to the node, so direct `node.invoke` calls, node-hosted plugin tools, and higher-level plugin tools share the same enforcement path.

    <Warning>
    The optional `scopes` field requests Gateway operator scopes for the invocation. OpenClaw honors it only for bundled plugins and trusted official plugin installations; requests from other plugins do not elevate the call. Use it only when a trusted plugin must invoke a node command with a stricter Gateway scope, such as `operator.admin`.
    </Warning>

  </Accordion>
  <Accordion title="api.runtime.tasks">
    Bind Task Flow and Task Run state to an existing OpenClaw session key or trusted tool context.

    - `api.runtime.tasks.managedFlows` is mutation-capable: create, advance, and cancel Task Flows.
    - `api.runtime.tasks.flows` and `api.runtime.tasks.runs` are read-only DTO views for listing and status lookups; both expose `bindSession(...)` / `fromToolContext(...)` plus `get`, `list`, `findLatest`, and `resolve`.

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

    Uses core `tts` configuration and provider selection. Returns PCM audio buffer + sample rate. `textToSpeechStream` is also available for streaming synthesis.

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

    `describeImageFileWithModel(...)` describes an already-known image through a specific provider/model, bypassing the default active-model resolution that `describeImageFile(...)` uses.

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
    Video generation, mirroring the image generation shape.

    ```typescript
    const result = await api.runtime.videoGeneration.generate({
      prompt: "A drone shot flying over a coastline at sunrise",
      cfg: api.config,
    });

    const providers = api.runtime.videoGeneration.listProviders({ cfg: api.config });
    ```

  </Accordion>
  <Accordion title="api.runtime.musicGeneration">
    Music generation, mirroring the image generation shape.

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
    它记录了写入方的意图，而不会把重启控制权从 gateway 手中夺走。

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

    `runHeartbeatOnce(...)` runs a single heartbeat cycle immediately, bypassing the normal coalesce timer. Pass `{ heartbeat: { target: "last" } }` to force delivery to the last active channel instead of the default `target: "none"` suppression.

    `runCommandWithTimeout(...)` returns captured `stdout` and `stderr`, optional
    truncation counts, `code`, `signal`, `killed`, `termination`, and
    `noOutputTimedOut`. Timeout and no-output-timeout results report `code: 124`
    when the child process does not provide a non-zero exit code. Non-timeout
    signal exits can still return `code: null`, so use `termination` and
    `noOutputTimedOut` to distinguish timeout reasons.

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

    Keyed stores survive restarts and are isolated by the runtime-bound plugin id. Use `registerIfAbsent(...)` for atomic dedupe claims: it returns `true` when the key was missing or expired and registered, or `false` when a live value already exists without overwriting its value, creation time, or TTL. Use `deleteIf(...)` when cleanup must remove only the value previously observed; its synchronous predicate and deletion run in one SQLite transaction. Limits: `maxEntries` per namespace, 50,000 live rows per plugin, JSON values under 64KB, and optional TTL expiry. By default, a write at either row limit sheds the oldest live rows from the namespace being written; sibling namespaces are not evicted for that write, and the write still fails if the namespace cannot free enough rows. Set `overflowPolicy: "reject-new"` for durable ownership records that must never be evicted: new keys fail at either limit, while existing keys remain updateable.

    `openSyncKeyedStore<T>(...)` returns the same store shape with synchronous methods (`register`, `registerIfAbsent`, `deleteIf`, `lookup`, `consume`, `clear` all return values directly instead of promises) for callers that cannot await.

    `openBlobStore<TMetadata>(...)` stores bounded binary payloads in shared SQLite without base64 or file sidecars. It requires per-entry, per-namespace byte, and row limits; copies byte arrays at the API boundary; and lists metadata without loading every BLOB. `register(...)` is an explicit upsert, including for expired keys. `registerIfAbsent(...)` provides collision-safe creation: an expired key remains occupied until its owner claims it with `deleteExpiredKey(key)` or `deleteExpired()`, preserving metadata needed to remove related named artifacts after the SQLite commit. Any row with a TTL is transient and excluded from backup/restore even before it expires; omit TTL for durable, restorable state. Host fuses cap each BLOB at 100 MiB, each plugin at 512 MiB of physically stored BLOBs, and each plugin at 50,000 physically stored rows, including expired rows awaiting owner cleanup. Use `registerIfAbsent(...)` with `overflowPolicy: "reject-new"` when external materializations must not be silently orphaned by replacement or eviction.

    `openChannelIngressQueue<TPayload>(...)` opens a persisted ingress queue scoped to the calling plugin, for buffering inbound events that need at-least-once processing across restarts. When stale-claim recovery uses `shouldRecover`, also provide `shouldRecoverCorrupt` if corrupt claimed payloads should be quarantined: its payload-independent claim identity lets the plugin preserve live owner and lane policy before the queue tombstones the row.

    Plugin-state leases were removed. Use short SQLite transactions for atomic database work and plugin-scoped keyed stores (`openKeyedStore` or `openSyncKeyedStore`) for bounded durable state.

    `openChannelIngressDrain(...)` opens the core channel-agnostic worker over that queue (or creates a queue when none is supplied). The drain owns stale-claim recovery, per-lane claim serialization, complete-at-adoption or complete-on-dispatch-return, retry/dead-letter disposition, optional pre-adoption supersede, and claim→adoption stall timeout. Wire claim ownership into reply generation with `turnAdoptionLifecycle` (via `bindIngressLifecycleToReplyOptions` from `plugin-sdk/channel-outbound`). Channel plugins keep accept-side enqueue, lane derivation, non-retryable classification, and any supersede authorization policy.

    <Warning>
    `openBlobStore`, `openKeyedStore`, `openSyncKeyedStore`, `openChannelIngressQueue`, and `openChannelIngressDrain` are available only to bundled plugins and trusted official plugin installations in this release. The rejection names the plugin id and the origin it loaded from; a channel plugin loaded from `plugins.load.paths` or an unofficial install is untrusted, so its ingress monitor fails channel start instead of running without a durable queue.
    </Warning>

  </Accordion>
  <Accordion title="api.runtime.channel">
    Channel-specific runtime helpers (available when a channel plugin is loaded). Grouped by concern:

    | Group | Purpose |
    | --- | --- |
    | `text` | Chunking (`chunkText`, `chunkMarkdownText`, `resolveChunkMode`), control-command detection, Markdown table conversion. |
    | `reply` | Buffered-block reply dispatch, envelope formatting, effective messages/human-delay config resolution. |
    | `routing` | `buildAgentSessionKey`, `resolveAgentRoute`. |
    | `pairing` | `buildPairingReply`, allowlist reads/removals, pairing-request upserts, and request-derived approval entries. |
    | `media` | Remote media download/save (see below). |
    | `activity` | Record/read last channel activity. |
    | `session` | Session metadata from inbound events, last-route updates. |
    | `mentions` | Mention-policy helpers (see below). |
    | `reactions` | Ack-reaction handles for in-flight processing indicators. |
    | `groups` | Group policy and require-mention resolution. |
    | `debounce` | Inbound message debouncing. |
    | `commands` | Command authorization and text-command gating. |
    | `outbound` | Load a channel's outbound adapter. |
    | `inbound` | Build inbound event context and run the shared inbound-event/reply kernel. |
    | `threadBindings` | Adjust idle-timeout/max-age for bound session threads. |
    | `runtimeContexts` | Register, read, and watch process-local per-channel/account/capability context. |

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

    `api.runtime.channel.mentions` 是使用运行时注入的打包 channel 插件共享的入站提及策略接口：

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

    Use the normalized `{ facts, policy }` path for mention decisions.

    Several fields under `reply`, `session`, and `inbound` carry per-field `@deprecated` notes pointing at the current channel-turn kernel or channel-outbound adapters; check the inline JSDoc on the specific helper before building new code on it.

  </Accordion>
</AccordionGroup>

## Gateway service events

Long-lived services registered with `api.registerService(...)` receive a process-local
`ctx.gatewayEvents` facade when the process runs a Gateway broadcaster; in runtimes without one the
field is absent, so feature-detect it and keep a fallback (for example a coarse poll). Use
`onSessionsChanged(...)` to react after the Gateway broadcasts a `sessions.changed` notice:

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

The handler runs in the Gateway process and does not add a Gateway protocol subscription. Keep the
returned unsubscribe function and call it during service cleanup. The payload is a lightweight
change notice; use `api.runtime.agent.session.getSessionEntry(...)` when the plugin needs the full
current session entry.

## Storing runtime references

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
  Current load mode: `"full"` (live activation), `"discovery"` / `"tool-discovery"` (read-only capability discovery), `"setup-only"` (lightweight setup entry), `"setup-runtime"` (setup flow that also needs the runtime channel entry), or `"cli-metadata"` (CLI command metadata collection).
</ParamField>
<ParamField path="api.resolvePath(input)" type="(string) => string">
  解析相对于插件根目录的路径。
</ParamField>

## 相关内容

- [插件内部机制](/plugins/architecture) — 能力模型和注册表
- [SDK 入口点](/plugins/sdk-entrypoints) — `definePluginEntry` 选项
- [SDK 概览](/plugins/sdk-overview) — 子路径参考
