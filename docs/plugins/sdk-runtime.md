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

## 配置加载与写入

优先使用已经传入当前调用路径的配置，例如注册期间的 `api.config`，或者 channel/provider 回调中的 `cfg` 参数。这样可以让单次进程快照贯穿整个工作流程，而不是在热点路径上重复解析配置。

仅当长生命周期处理器需要当前进程快照且该函数未传入配置时，才使用 `api.runtime.config.current()`。返回值是只读的；在编辑前请先克隆，或使用修改辅助工具。

工具工厂会接收 `ctx.runtimeConfig` 以及 `ctx.getRuntimeConfig()`。当长生命周期工具的 `execute` 回调中，配置可能在工具定义创建后发生变化时，请在回调内使用 getter。

通过 `api.runtime.config.mutateConfigFile(...)` 或 `api.runtime.config.replaceConfigFile(...)` 持久化更改。每次写入都必须选择明确的 `afterWrite` 策略：

- `afterWrite: { mode: "auto" }` 允许 gateway 重新加载规划器自行决定。
- `afterWrite: { mode: "restart", reason: "..." }` 当写入方知道热重载不安全时，强制进行一次干净重启。
- `afterWrite: { mode: "none", reason: "..." }` 仅当调用方自己负责后续处理时，才抑制自动重载/重启。

这些修改辅助工具会返回 `afterWrite` 以及带类型的 `followUp` 摘要，因此调用方可以记录或测试自己是否请求了重启。gateway 仍然负责决定重启何时真正发生。

`api.runtime.config.loadConfig()` 和 `api.runtime.config.writeConfigFile(...)` 是 `runtime-config-load-write` 下的弃用兼容辅助工具。它们会在运行时警告一次，并在迁移窗口内继续供旧版外部插件使用。打包后的插件不得使用它们；如果插件代码调用这些辅助工具，或从插件 SDK 子路径导入它们，配置边界保护会失败。

对于直接的 SDK 导入，请使用更聚焦的配置子路径，而不是宽泛的 `openclaw/plugin-sdk/config-runtime` 兼容聚合入口：`config-types` 用于类型，`plugin-config-runtime` 用于已加载配置断言和插件入口查找，`runtime-config-snapshot` 用于当前进程快照，`config-mutation` 用于写入。打包插件测试应直接 mock 这些聚焦子路径，而不是 mock 宽泛的兼容聚合入口。

OpenClaw 内部运行时代码遵循相同方向：在 CLI、gateway 或进程边界只加载一次配置，然后将该值向下传递。成功的修改写入会刷新进程运行时快照并推进其内部修订版本；长生命周期缓存应使用运行时拥有的缓存键，而不是在本地序列化配置。长生命周期运行时模块对环境中的 `loadConfig()` 调用实行零容忍扫描；请使用传入的 `cfg`、请求的 `context.getRuntimeConfig()`，或在明确的进程边界使用 `getRuntimeConfig()`。

provider 和 channel 的执行路径必须使用当前运行时配置快照，而不是用于配置回读或编辑的文件快照。文件快照会保留源值，例如用于 UI 和写入的 SecretRef 标记；provider 回调需要的是解析后的运行时视图。当某个辅助工具可能接收当前源快照或当前运行时快照中的任意一种时，请在读取凭据前通过 `selectApplicableRuntimeConfig()` 进行路由。

## 运行时命名空间

<AccordionGroup>
  <Accordion title="api.runtime.agent">
    Agent 身份、目录和会话管理。

    ```typescript
    // 解析 agent 的工作目录
    const agentDir = api.runtime.agent.resolveAgentDir(cfg);

    // 解析 agent 工作区
    const workspaceDir = api.runtime.agent.resolveAgentWorkspaceDir(cfg);

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

    // 运行一次嵌入式 agent 回合
    const agentDir = api.runtime.agent.resolveAgentDir(cfg);
    const result = await api.runtime.agent.runEmbeddedAgent({
      sessionId: "my-plugin:task-1",
      runId: crypto.randomUUID(),
      sessionFile: path.join(agentDir, "sessions", "my-plugin-task-1.jsonl"),
      workspaceDir: api.runtime.agent.resolveAgentWorkspaceDir(cfg),
      prompt: "总结最新更改",
      timeoutMs: api.runtime.agent.resolveAgentTimeoutMs(cfg),
    });
    ```

    `runEmbeddedAgent(...)` 是从插件代码中启动正常 OpenClaw agent 回合的中性辅助工具。它使用与 channel 触发回复相同的 provider/model 解析和 agent-harness 选择。

    `runEmbeddedPiAgent(...)` 仍然作为兼容别名保留。

    `resolveThinkingPolicy(...)` 返回 provider/model 支持的思考级别以及可选默认值。provider 插件通过其思考钩子拥有特定于模型的 profile，因此工具插件应调用这个运行时辅助工具，而不是导入或重复 provider 列表。

    `normalizeThinkingLevel(...)` 会将用户文本（例如 `on`、`x-high` 或 `extra high`）转换为规范化的存储级别，然后再将其与解析出的策略进行比较。

    **会话存储辅助工具** 位于 `api.runtime.agent.session` 下：

    ```typescript
    const storePath = api.runtime.agent.session.resolveStorePath(cfg);
    const store = api.runtime.agent.session.loadSessionStore(storePath);
    await api.runtime.agent.session.updateSessionStore(storePath, (nextStore) => {
      // 在不使用陈旧状态替换整个文件的情况下，修补一条记录。
      nextStore[sessionKey] = { ...nextStore[sessionKey], thinkingLevel: "high" };
    });
    const filePath = api.runtime.agent.session.resolveSessionFilePath(cfg, sessionId);
    ```

    优先使用 `updateSessionStore(...)` 或 `updateSessionStoreEntry(...)` 进行运行时写入。它们通过 Gateway 托管的 session-store 写入器进行路由，保留并发更新，并复用热缓存。`saveSessionStore(...)` 仍保留用于兼容性和离线维护式重写。

  </Accordion>
  <Accordion title="api.runtime.agent.defaults">
    默认模型和 provider 常量：

    ```typescript
    const model = api.runtime.agent.defaults.model; // 例如 "anthropic/claude-sonnet-4-6"
    const provider = api.runtime.agent.defaults.provider; // 例如 "anthropic"
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
      message: "把这个查询扩展为聚焦的后续搜索。",
      provider: "openai", // 可选覆盖
      model: "gpt-4.1-mini", // 可选覆盖
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

  </Accordion>
  <Accordion title="api.runtime.tasks.managedFlows">
    将 Task Flow 运行时绑定到现有的 OpenClaw 会话键或受信任的工具上下文，然后在不必每次调用都传入 owner 的情况下创建和管理 Task Flow。

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

    使用核心 `messages.tts` 配置和 provider 选择。返回 PCM 音频缓冲区 + 采样率。

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
    ```

    当未产生任何输出时返回 `{ text: undefined }`（例如跳过输入）。

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
    api.runtime.system.requestHeartbeatNow({ reason: "plugin-event" }); // 已弃用的兼容别名。
    const output = await api.runtime.system.runCommandWithTimeout(cmd, args, opts);
    const hint = api.runtime.system.formatNativeDependencyHint(pkg);
    ```

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

    键控存储可在重启后保留，并按运行时绑定的插件 id 隔离。使用 `registerIfAbsent(...)` 进行原子去重声明：当键缺失或已过期并已注册时返回 `true`；当已存在有效值且不会覆盖其值、创建时间或 TTL 时返回 `false`。限制：每个命名空间 `maxEntries`、每个插件 1,000 条有效行、64KB 以下的 JSON 值，以及可选的 TTL 过期。

    <Warning>
    仅限本版本中的打包插件。
    </Warning>

  </Accordion>
  <Accordion title="api.runtime.tools">
    内存工具工厂和 CLI。

    ```typescript
    const getTool = api.runtime.tools.createMemoryGetTool(/* ... */);
    const searchTool = api.runtime.tools.createMemorySearchTool(/* ... */);
    api.runtime.tools.registerMemoryCli(/* ... */);
    ```

  </Accordion>
  <Accordion title="api.runtime.channel">
    channel 特定的运行时辅助工具（在加载了 channel 插件时可用）。

    对于使用运行时注入的打包 channel 插件，`api.runtime.channel.mentions` 是共享的入站提及策略表面：

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
  当前加载模式；`"setup-runtime"` 是轻量级的、完整入口点启动/设置前窗口。
</ParamField>
<ParamField path="api.resolvePath(input)" type="(string) => string">
  解析相对于插件根目录的路径。
</ParamField>

## 相关内容

- [插件内部机制](/plugins/architecture) — 能力模型和注册表
- [SDK 入口点](/plugins/sdk-entrypoints) — `definePluginEntry` 选项
- [SDK 概览](/plugins/sdk-overview) — 子路径参考
