---
summary: "api.runtime -- 可注入给插件的运行时辅助工具"
title: "插件运行时辅助工具"
sidebarTitle: "运行时辅助工具"
read_when:
  - 你需要从插件中调用核心辅助工具（TTS、STT、图像生成、网页搜索、子代理、节点）
  - 你想了解 api.runtime 暴露了什么
  - 你正在从插件代码中访问配置、代理或媒体辅助工具
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

<Warning>
`api.runtime.config.loadConfig()` and `api.runtime.config.writeConfigFile(...)` are deprecated. They warn once per plugin at runtime and remain available only for old external plugins during the migration window. Bundled plugins must not use them: an internal config boundary guard fails the build if plugin code calls them or imports those helpers from plugin SDK subpaths. Use `current()`, a passed-in `cfg`, `mutateConfigFile(...)`, or `replaceConfigFile(...)` instead.
</Warning>

For direct SDK imports, prefer the focused config subpaths over the broad `openclaw/plugin-sdk/config-runtime` compatibility barrel: `config-contracts` for types, `plugin-config-runtime` for already-loaded config assertions and plugin entry lookup, `runtime-config-snapshot` for current process snapshots, and `config-mutation` for writes. Bundled plugin tests should mock these focused subpaths directly instead of mocking the broad compatibility barrel.

Internal OpenClaw runtime code follows the same direction: load config once at the CLI, gateway, or process boundary, then pass that value through. Successful mutation writes refresh the process runtime snapshot and advance its internal revision; long-lived caches should key off the runtime-owned cache key instead of serializing config locally. Long-lived runtime modules have a zero-tolerance scanner for ambient `loadConfig()` calls; use a passed `cfg`, a request `context.getRuntimeConfig()`, or `getRuntimeConfig()` at an explicit process boundary.

provider 和 channel 的执行路径必须使用当前运行时配置快照，而不是用于配置回读或编辑的文件快照。文件快照会保留源值，例如用于 UI 和写入的 SecretRef 标记；provider 回调需要的是解析后的运行时视图。当某个辅助工具可能接收当前源快照或当前运行时快照中的任意一种时，请在读取凭据前通过 `selectApplicableRuntimeConfig()` 进行路由。

## 可复用运行时工具

Use inbound `botLoopProtection` facts for bot-authored inbound messages. Core applies the shared in-memory sliding-window guard before session record and dispatch, without tying the policy to one channel. The guard tracks `(scopeId, conversationId, participant pair)` keys, counts both directions of a pair together, applies a cooldown once the window budget is exceeded, and prunes inactive entries opportunistically.

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

    // 获取 agent 超时
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

    `resolveThinkingPolicy(...)` 返回 provider/model 支持的思考级别以及可选默认值。provider 插件通过其思考钩子拥有特定于模型的 profile，因此工具插件应调用这个运行时辅助工具，而不是导入或重复 provider 列表。

    `normalizeThinkingLevel(...)` 会将用户文本（例如 `on`、`x-high` 或 `extra high`）转换为规范化的存储级别，然后再将其与解析出的策略进行比较。

    **会话存储辅助工具** 位于 `api.runtime.agent.session` 下：

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

    const storePath = api.runtime.agent.session.resolveStorePath(cfg.session?.store, { agentId });
    await api.runtime.agent.session.runWithWorkAdmission(
      { storePath, sessionKey },
      async (signal) => {
        // Create or update the session, then pass signal to the admitted agent run.
      },
    );
    ```

    优先在会话工作流中使用 `getSessionEntry(...)`、`listSessionEntries(...)`、`patchSessionEntry(...)` 或 `upsertSessionEntry(...)`。这些辅助工具通过 agent/session 身份定位会话，因此插件不必依赖旧版 `sessions.json` 的存储形状。对于不应刷新会话活动时间的仅元数据补丁，请使用 `preserveActivity: true`；仅当回调返回完整条目且必须保留已删除字段确实被删除时，才使用 `replaceEntry: true`。

    Use `runWithWorkAdmission(...)` when a plugin starts work on a persisted session. The callback rejects archived or concurrently replaced sessions, keeps archive/reset/delete mutations coordinated through completion, and receives an `AbortSignal` that must be forwarded to the agent run.

    For transcript reads and writes, import `openclaw/plugin-sdk/session-transcript-runtime` and use `resolveSessionTranscriptIdentity(...)`, `resolveSessionTranscriptTarget(...)`, `readSessionTranscriptEvents(...)`, `appendSessionTranscriptMessageByIdentity(...)`, `publishSessionTranscriptUpdateByIdentity(...)`, or `withSessionTranscriptWriteLock(...)` with `{ agentId, sessionKey, sessionId }`. These APIs let plugins identify a transcript, read its events, append messages, publish updates, and run related operations under the same transcript write lock. Passing `sessionFile`, using `resolveSessionTranscriptLegacyFileTarget(...)`, or importing low-level `appendSessionTranscriptMessage(...)` / `emitSessionTranscriptUpdate(...)` from `openclaw/plugin-sdk/agent-harness-runtime` is deprecated; those paths exist only for legacy code that already receives an active transcript artifact.

    `resolveStorePath(...)` and `updateSessionStoreEntry(...)` round out the session helpers: `resolveStorePath` resolves the session store path for a given scope, and `updateSessionStoreEntry({ storePath, sessionKey, update })` patches one entry directly by store path when the caller already knows it.

    `loadSessionStore(...)`, `saveSessionStore(...)`, `updateSessionStore(...)`, and `resolveSessionFilePath(...)` are deprecated compatibility helpers for plugins that still intentionally depend on the legacy whole-store or transcript-file shape. New plugin code must not use those helpers, and existing callers should migrate to entry helpers and transcript identity helpers.

  </Accordion>
  <Accordion title="api.runtime.agent.defaults">
    默认模型和 provider 常量：

    ```typescript
    const model = api.runtime.agent.defaults.model; // e.g. "gpt-5.5"
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
    });
    ```

    该辅助工具使用与 OpenClaw 内置运行时相同的简单补全准备流程以及宿主拥有的运行时配置快照。上下文引擎会获得与会话绑定的 `llm.complete` 能力，因此模型调用会使用当前会话的 agent，而不会静默回退到默认 agent。返回结果会包含 provider/model/agent 归属信息，以及在可用时的规范化 token、缓存和估算成本使用情况。

    <Warning>
    模型覆盖需要在配置中通过 `plugins.entries.<id>.llm.allowModelOverride: true` 获得操作员明确允许。使用 `plugins.entries.<id>.llm.allowedModels` 可将受信任插件限制到特定的规范化 `provider/model` 目标。跨 agent 的补全调用需要 `plugins.entries.<id>.llm.allowAgentIdOverride: true`。
    </Warning>

  </Accordion>
  <Accordion title="api.runtime.subagent">
    启动并管理后台 subagent 运行。

    ```typescript
    // 开始一个 subagent 运行
    const { runId } = await api.runtime.subagent.run({
      sessionKey: "agent:main:subagent:search-helper",
      message: "Expand this query into focused follow-up searches.",
      provider: "openai", // optional override
      model: "gpt-5.5", // optional override
      deliver: false,
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

    `deleteSession(...)` 可以删除由同一插件通过 `api.runtime.subagent.run(...)` 创建的会话。删除任意用户或操作员会话仍需要带有 admin 作用域的 Gateway 请求。

  </Accordion>
  <Accordion title="api.runtime.nodes">
    列出已连接节点，并从 Gateway 加载的插件代码或插件 CLI 命令中调用节点主机命令。当插件拥有配对设备上的本地工作时使用，例如另一台 Mac 上的浏览器或音频桥接。

    ```typescript
    const { nodes } = await api.runtime.nodes.list({ connected: true });

    const result = await api.runtime.nodes.invoke({
      nodeId: "mac-studio",
      command: "my-plugin.command",
      params: { action: "start" },
      timeoutMs: 30000,
    });
    ```

    在 Gateway 内部，此运行时在进程内执行。在插件 CLI 命令中，它通过 RPC 调用已配置的 Gateway，因此像 `openclaw googlemeet recover-tab` 这样的命令可以从终端检查配对节点。节点命令仍然通过正常的 Gateway 节点配对、命令允许列表、插件节点调用策略以及节点本地命令处理。

    暴露危险节点主机命令的插件应使用 `api.registerNodeInvokePolicy(...)` 注册节点调用策略。该策略会在 Gateway 中运行，先于命令被转发到节点之前执行，且在命令允许列表检查之后，因此直接的 `node.invoke` 调用和更高层级的插件工具共享相同的强制执行路径。

    <Warning>
    The optional `scopes` field requests Gateway operator scopes for the invocation. OpenClaw honors it only for bundled plugins and trusted official plugin installations; requests from other plugins do not elevate the call. Use it only when a trusted plugin must invoke a node command with a stricter Gateway scope, such as `operator.admin`.
    </Warning>

  </Accordion>
  <Accordion title="api.runtime.tasks">
    Bind Task Flow and Task Run state to an existing OpenClaw session key or trusted tool context.

    - `api.runtime.tasks.managedFlows` is mutation-capable: create, advance, and cancel Task Flows.
    - `api.runtime.tasks.flows` and `api.runtime.tasks.runs` are read-only DTO views for listing and status lookups; both expose `bindSession(...)` / `fromToolContext(...)` plus `get`, `list`, `findLatest`, and `resolve`.
    - `api.runtime.tasks.flow` is a deprecated alias for `managedFlows`.

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

    Uses core `messages.tts` configuration and provider selection. Returns PCM audio buffer + sample rate. `textToSpeechStream` is also available for streaming synthesis.

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
      model: "gpt-5.5",
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

    <Info>
    `api.runtime.stt.transcribeAudioFile(...)` 仍然作为 `api.runtime.mediaUnderstanding.transcribeAudioFile(...)` 的兼容别名保留。
    </Info>

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
    await api.runtime.system.enqueueSystemEvent(event);
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
    await store.consume("key-1");
    await store.clear();
    ```

    Keyed stores survive restarts and are isolated by the runtime-bound plugin id. Use `registerIfAbsent(...)` for atomic dedupe claims: it returns `true` when the key was missing or expired and registered, or `false` when a live value already exists without overwriting its value, creation time, or TTL. Limits: `maxEntries` per namespace, 50,000 live rows per plugin, JSON values under 64KB, and optional TTL expiry. When a write would exceed the plugin row cap, the runtime sheds the oldest live rows from the namespace being written; sibling namespaces are not evicted for that write, and the write still fails if the namespace cannot free enough rows.

    `openSyncKeyedStore<T>(...)` returns the same store shape with synchronous methods (`register`, `registerIfAbsent`, `lookup`, `consume`, `clear` all return values directly instead of promises) for callers that cannot await.

    `openChannelIngressQueue<TPayload>(...)` opens a persisted ingress queue scoped to the calling plugin, for buffering inbound events that need at-least-once processing across restarts.

    <Warning>
    `openKeyedStore`, `openSyncKeyedStore`, and `openChannelIngressQueue` are available only to bundled plugins and trusted official plugin installations in this release.
    </Warning>

  </Accordion>
  <Accordion title="api.runtime.channel">
    Channel-specific runtime helpers (available when a channel plugin is loaded). Grouped by concern:

    | Group | Purpose |
    | --- | --- |
    | `text` | Chunking (`chunkText`, `chunkMarkdownText`, `resolveChunkMode`), control-command detection, Markdown table conversion. |
    | `reply` | Buffered-block reply dispatch, envelope formatting, effective messages/human-delay config resolution. |
    | `routing` | `buildAgentSessionKey`, `resolveAgentRoute`. |
    | `pairing` | `buildPairingReply`, allowlist reads, pairing-request upserts. |
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

    `api.runtime.channel.mentions` 刻意不暴露旧的 `resolveMentionGating*` 兼容辅助工具。请优先使用规范化的 `{ facts, policy }` 路径。

    Several fields under `reply`, `session`, and `inbound` carry per-field `@deprecated` notes pointing at the current channel-turn kernel or channel-outbound adapters; check the inline JSDoc on the specific helper before building new code on it.

  </Accordion>
</AccordionGroup>

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
  Current load mode: `"full"` (live activation), `"discovery"` / `"tool-discovery"` (read-only capability discovery), `"setup-only"` (lightweight setup entry), `"setup-runtime"` (setup flow that also needs the runtime channel entry), or `"cli-metadata"` (CLI command metadata collection).
</ParamField>
<ParamField path="api.resolvePath(input)" type="(string) => string">
  解析相对于插件根目录的路径。
</ParamField>

## 相关内容

- [插件内部机制](/plugins/architecture) — 能力模型和注册表
- [SDK 入口点](/plugins/sdk-entrypoints) — `definePluginEntry` 选项
- [SDK 概览](/plugins/sdk-overview) — 子路径参考
