---
summary: "代理身份、目录、会话存储、记录和沙箱权限"
read_when:
  - "您正在解析代理目录、身份或思考默认值"
  - "您正在从插件读取或写入会话条目和记录"
  - "您需要会话的有效沙箱工作区权限"
title: "插件运行时代理助手"
sidebarTitle: "代理和会话"
---

`api.runtime` 的代理、会话、脚本和沙箱表面，以及插件命令处理程序接收的请求绑定功能。 [Plugin 运行时助手](/plugins/sdk-runtime) 参考的一部分。

## <a id="plugin-command-runtime-helpers"></a> Plugin 命令运行时帮助程序

插件命令处理程序通过 `ctx.runtimeContext` 接收请求绑定功能。当命令绑定到当前会话时，`ctx.runtimeContext.compactCurrent()` 运行与 `/compact` 相同的手动压缩管道，包括本机代理harness完成和会话令牌记帐：

```typescript
const compactCurrent = ctx.runtimeContext?.compactCurrent;
if (!compactCurrent) {
  return { text: "This command needs a bound session." };
}

const result = await compactCurrent();
return {
  text: result.compacted
    ? `Compacted to ${result.tokensAfter ?? "an unknown number of"} tokens.`
    : `Compaction did not complete: ${result.reason ?? "unknown reason"}.`,
};
```

此通用功能适用于每个插件命令，而不仅仅是 Codex。主机将其门控到当前调用和精确绑定会话生成。当前会话未绑定时，该能力不存在；处理程序稳定后，保留的回调会拒绝调用。不要保留它或使用会话存储补丁和工具调用重建压缩。结果包含 `compacted`、可选的 `reason` 以及可选的 `tokensBefore` 和 `tokensAfter` 快照； OpenClaw 拥有所有持久性和生命周期协调。

## <a id="auth-profile-resolution"></a> Auth-配置文件解析

实验性 `openclaw/plugin-sdk/agent-runtime` 入口点导出 `resolveApiKeyForProfile(...)`。在使用、采用、保留或返回凭证之前，其可选的同步 `validateOAuthCredential` 回调会为每个 OAuth 候选者运行，包括旧版 `provider:default` 回退。正常返回接受凭证；抛出来拒绝它。

存储的凭据在刷新之前进行验证，刷新的凭据在持久化之前进行验证。如果允许回退并且拒绝每个允许的候选者，则解决方案将保留原始选定配置文件刷新失败。主动刷新结算期间的拒绝可能会最终阻止凭证生成并需要重新进行身份验证。省略回调会保留现有行为。当所选配置文件代表不得轮换到不同配置配置文件的帐户边界时，设置 `allowProfileFallback: false`。

## <a id="session-transcript-hydration"></a> 会话记录水合作用

使用 `openclaw/plugin-sdk/agent-sessions` 中的 `await SessionManager.openAsync(target, cwd?, contextLimits?, signal?)` 加载现有的 SQLite 转录本。 `openBoundedAsync(target, { maxBytes, maxEvents, cwd?, onTruncated?, signal? })` 加载选定的活动分支，`openDetachedBoundedAsync` 返回相同的选择，但没有持久性。文件支持的 SQLite 读取在历史工作线程上运行。同步 getter 消耗准备好的视图而不读取存储。

水合条目和消息信封仍然是可变的本地视图。它们的嵌套有效负载在迁移后被冻结，并且可以在重写快照之间共享。将有效负载替换为新值，而不是编辑其嵌套对象或数组。

完整读取从一个已提交的 SQLite 快照传输有界块，而无需截断转录本以适合工作线程。调用者仍然将完整的结果保存在内存中；当不需要完整的历史记录时，使用有界方法。取消和失败的传输使当前视图保持不变并加入工作人员清理。

`await manager.setSessionTargetAsync(target, signal?)` 替换准备好的视图。如果管理器在读取时发生更改，它会拒绝，并在准备失败时保持当前视图不变。 `reloadPersistedTranscriptAsync(signal?)` 保留管理器的运行时工作目录。在等待之前捕获目标，包括相对存储路径；截断回调无法重定向以后的持久性。绑定还保留已解析的状态目录和主管模式。稍后的环境更改不会重定向重新加载或写入。 `getSessionTarget()` 返回包含这些存储事实的防御副本，没有不相关的环境值。

这些读取器不会创建丢失的数据库或修复其架构。会话创建所有者必须首先准备存储。具有空记录的现有数据库将保留惰性标头初始化，直到其第一次追加。 Incognito SQLite 仍属于其流程本地所有者。 `SessionManager.inMemory()` 保持同步并且不访问 SQLite。

同步 `open`、`openBounded`、`openDetachedBounded`、`openModelContext`、`setSessionTarget` 和 `reloadPersistedTranscript` 方法是已弃用的第三方兼容性变体。它们将在弃用期过后的后续稳定版本中删除。运行时代码应该等待其异步对应部分。

## <a id="awaited-transcript-mutations"></a> 等待的转录本突变

在使用生成的视图或发布相关工作之前，等待 `appendMessageAsync`、`appendCustomEntryAsync`、`appendSessionInfoAsync` 和其他 `Async` 持久性方法。文件支持的写入重用共享的 SQLite 工作线程，保留每个会话的 FIFO 顺序，并在承诺解析之前采用提交的结果。用户和自定义消息以及 `beforeFreshMessageCommit` 使用相同的工作路径。 Incognito 保留其进程本地持久性所有者；其等待的 API 保留相同的完成顺序。

低级 `persistAsync` 保留其原始持久性契约，并且不会将提供的条目添加到加载的树中；使用附加方法或之后重新加载。 `branchAsync`和`resetLeafAsync`按队列顺序准备导航，而无需自己编写叶子记录。同步 `resetLeaf()` 仍然是受支持的内存中操作。

同步持久性方法为第三方插件保留其立即返回值，并为每个进程的每个方法发出一次警告。它们将在弃用期过后的后续稳定版本中删除。有关每个替换、返回值以及附加扩展和提供程序重播 API，请参阅 [ 迁移表](/plugins/sdk-migration/how-to-migrate#await-session-transcript-persistence)。转录本格式、架构和更新行为保持不变。

## <a id="native-assistant-persistence"></a> 原生助手持久化

助理制作人应将已提交行的 `idempotencyKey` 重新用作现场 `assistant` 事件的 `itemId`。当发布其运行的提交时，网关会取消该确切事件，包括持久化后到达的更正。即使文本相同，单独的事件也需要单独的标识。

从 `openclaw/plugin-sdk/session-transcript-runtime` 发布带有 `publishSessionTranscriptUpdateByIdentity` 的已提交辅助行的本机harness可以包括 `update.assistantItemIds`。这些是确切的 `assistant` 流项目 ID，其实时显示被提交的行替换或取代。在等待持久性之前捕获 ID，并仅在行提交或相同的早期写入的确切持久性收据确认后才发布。空数组仍然标识没有前面的流项目的本机行。持久化行的现有幂等键还标识稍后存储的辅助帧。

该字段是显示来源，而不是终端或运行授权。现有会话和运行所有权检查仍然适用。它位于主机的转录通知路径内部：请勿将其放入持久消息或公共网关事件中。独立拥有的键控注释和异步行省略它。当转向提交已完成的项目时，仅包含该项目的 ID；即使其文本重复已提交的行，后来未完成的项目仍保持活动状态。

网关不会从文本推断所有权。未加密的生产者的文本将保留在实时尾部中，直到带有身份的提交可以拥有它或运行终止。这样的生产者可以暂时显示重复的持久行；网关倾向于保留未保存的文本，而不是猜测要隐藏的事件。

### <a id="channel-delivery-mirrors"></a> 通道传送镜

对于已结算的 `channel-final` 交货，`appendAssistantMirrorMessageByIdentity` 接受生产运行中的可选 `sourceRunId`。当提交另一条助理消息后排队的答案可以解决时通过它。助手将匹配文本与该运行中不相关的助手事件按照转录顺序关联起来，因此重复的答案保留了不同的身份。

交货收据仍被存储。对于纯文本回复，`chat.history` 会呈现一次相关答案；包含媒体事实或可显示的非文本内容的行仍然可见。这不会改变提供商重播。 A运行ID是出处，不是写授权；现有的会话检查仍然适用。如果未提供源运行，则相关性将保留最新消息行为。

SQLite 通过独立于运行相关性的索引来解析传递幂等键。运行关联从生产运行的索引输入开始读取辅助消息；对于没有该输入标识的旧运行，它仅搜索最近的 4,096 个转录事件。及时解决这些遗留交付问题，而不是依赖完整历史文本搜索。

媒体镜像保留交付事实中的完整引用，同时显示紧凑的文件名。源相关性在文件名扩展之前使用创作的标题，因此具有相同标题的媒体和普通答案在运行顺序中消耗不同的出现次数。未加密的镜子会抑制文本和媒体的精确重复；具有相同文件名的不同附件仍然不同。键控重放拒绝记录媒体引用的行的已更改媒体引用。早期的无场镜像重播其原始文本和传递事实，而不重写存储的字节；它们的仅文件名表示无法区分相同基名的附件。

## <a id="bounded-model-context"></a> 有界模型上下文

将 `openclaw/plugin-sdk/agent-sessions` 中的 `await SessionManager.openModelContextAsync(...)` 与可选的 `limits: { maxBytes, maxEvents }` 一起使用。默认情况下，有界读取是严格的。读取器在加载之前测量 SQLite 中的预计有效负载字节，并选择最近的上下文及其最新的压缩或重置边界。它保留工具结果所有权，并拒绝无法保留最新完整框架或所需边界的限制。存储的成绩单保持不变。省略 `limits` 将保留完整选定的上下文。异步读取保留准入、锚定和取消检查。

对于临时纯模型视图，调用者可以显式地将 `toolResultOverflow: "omit"` 添加到 `limits`。在字节压力下，读者在选择有界后缀之前用省略通知替换工具结果主体，因此早期的目标和约束可以保留在上下文中。在从 SQLite 加载这些实体之前，它仅忽略节省的空间有助于视图适配的实体。每个通知都会标识工具、调用和原始预计事件大小。如果删除前缀使保留的主体再次变得负担得起，则读者将恢复适合的最新主体。工具调用参数和拥有的 call/result 框架保持不变。

这是有损模型视图，而不是全保真历史记录 API。它不会重写存储的文字记录或更改证据和分叉阅读器。优先选择较早的请求而不是结果主体会更改保留，并可能更改可重用的提示前缀。相同的 byte/event 限制、所需边界和工具结果所有权检查仍然适用。如果所需的用户消息、调用参数、摘要或事件计数无法容纳，或者结果所有权不明确，则读取仍然会失败。省略 `toolResultOverflow` 会保留严格的有界读取行为。

## <a id="scoped-session-visibility"></a> 范围会话可见性

`openclaw/plugin-sdk/session-visibility` 中的 `createSessionVisibilityChecker` 通过 `registerScopedAccessProvider(syncProvider, { resolveAsync })` 支持窄主机拥有的会话授权。两个回调都接收 `{ action, requesterSessionKey, targetSessionKey }` 并返回 `{ expectedSessionId }` 仅对于授权的、精确的会话化身，或者当没有范围授权适用时返回 `undefined`。可选的 `resolveAsync` 回调返回一个承诺。提供者拥有针对当前权威状态的匹配操作和两个会话密钥。

会话工具正在等待 `createSessionVisibilityChecker.resolveScopedAccessAsync(...)`。对于每个注册，它在提供时使用 `resolveAsync`，否则使用同步提供程序。提供程序按注册顺序运行。空的、无效的或被拒绝的异步结果不会重试该注册的同步回调；其他注册提供商和普通可见性政策仍然适用。隐身目标无法获得范围补助。

直接检查器的 `check(...)`、警卫的 `check(...)` 和 `resolveScopedAccess(...)` 保持同步并重新调用同步提供者。现有的外部调用者保留此合同。较旧的主机忽略可选的注册参数，因此支持这些主机的插件必须保留新的同步实现；异步填充的启动缓存并不能替代。

一个注册拥有两个回调。它返回的清理函数取消注册两者。重新注册相同的同步函数会替换该注册，而不改变其位置；旧的清理功能无法删除替换功能。异步解析在等待后检查确切的注册，并丢弃来自未注册或替换所有者的结果。新注册的提供商仅参与后续决议。将清理工作连接到插件的现有运行时生命周期中，并在提供者自己等待的工作完成后重新验证插件拥有的权限。

## <a id="agent-and-session-namespaces"></a> Agent 和会话命名空间

<AccordionGroup>
  <Accordion title="api.runtime.agent">
    Agent 身份、目录和会话管理。

    ```typescript
    // Resolve the agent's working directory (agentId is required)
    const agentDir = api.runtime.agent.resolveAgentDir(cfg, agentId);

    // Resolve agent workspace
    const workspaceDir = api.runtime.agent.resolveAgentWorkspaceDir(cfg, agentId);

    // Get agent identity
    const identity = api.runtime.agent.resolveAgentIdentity(cfg);

    // Get default thinking level
    const thinking = api.runtime.agent.resolveThinkingDefault({
      cfg,
      provider,
      model,
    });

    // Validate a user-provided thinking level against the active provider profile
    const policy = api.runtime.agent.resolveThinkingPolicy({ provider, model });
    const level = api.runtime.agent.normalizeThinkingLevel("extra high");
    if (level && policy.levels.some((entry) => entry.id === level)) {
      // pass level to an embedded run
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

    // Create the workspace if needed
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

    调用者拥有 `terminalReplyExpectation`：`"required"` 用于正常请求的响应，`"optional"` 用于可选工作，或 `"result-required"` 用于必须返回结果的内部工作。外部转弯可能会明确地以整个词尾结束，并在任一默认回复期望下修剪为大写 `NO_REPLY`。终端生产者准备一次完整的有效负载并发布`meta.terminalReply`；传递消耗了这个事实而不重新解析文本。生产者准备仅删除一个前导 `NO_REPLY\n` 的文字，将剩余字节保留为可见文本。小写字母、标点符号、引号或 JSON 形式以及尾随标记是普通可见文本。内部结果要求轮次需要完整的当前源最终结果，而不是静默有效负载或进度更新。 `NO_REPLY` 会丢弃本回合写入的所有未发送的内容，因此请在静默结束之前发送确认。空输出并不意味着沉默：固定工具后的恢复使用免工具最终确定过程，而不是重复已完成的操作。

    对于没有权威显示或最终结果事实的存储助理文本，`openclaw/plugin-sdk/reply-runtime` 导出 `isSilentReplyText(text?: string)`，它仅检查 `text?.trim() === "NO_REPLY"`。它没有自定义令牌参数。 `reply-chunking` 不再导出静默助手，并且内存主机运行时不再重新导出它们。没有兼容性别名；实时交付必须使用生产者准备的输出，而不是这个存储文本助手。

    如果您的适配器在运行返回之前提供最终答复，请提供 `resolveReplyDelivery(minimumAssistantMessageIndex?)`。将确认的最终结果返回 `"delivered"` 到当前源，在其运输拥有交付或结果不确定时返回 `"pending"`，在没有交付最终结果时返回 `"missing"`。将观察结果绑定到本次运行和输入；当提供的下限提前时，排除较早输入的收据。收集区块、显示预览或写入外部通道的文字记录不是送达收据。观察失败将保留待定监护权，而不是授权另一次答复。

    当运行时将非空应答块交给 `onBlockReply` 时，不提供 `resolveReplyDelivery` 的现有插件保留调用者监护权。 [区块回复](/concepts/streaming#block-streaming-channel-messages)是正常频道消息，不是预览。运行时将此兼容性切换视为 `"pending"`，而不是 `"delivered"`：它可以防止重复恢复，而无需证明交付或使响应可选。抛出或拒绝的回调保留不确定的保管权，因为它可能已经发送了回复。推理、评论、status/progress 通知、空块和 `onPartialReply` 预览不建立此托管。

    显式的 `resolveReplyDelivery` 始终优先。如果 `onBlockReply` 仅收集输出、更新预览或发送前失败，则当适配器可以确认没有源传输拥有最终响应时返回 `"missing"`；这允许所需的恢复。将交付适配器迁移到观察者，以便他们可以报告实际接收和不确定的发送。块回调不返回传递结果，因此单独的通用拒绝并不授权恢复。遗留托管的范围仅限于运行和辅助消息索引，在取消或完成时退役以供以后输入；没有索引的块仅适用于初始输入。

    2026.9.4 中附带的可选 `githubPublicationAvailable` 输入已弃用并被忽略。将其从插件调用中删除：主机每次尝试都会检查当前会话和网关。 SDK 接受旧输入，直到单独宣布的普通稳定删除版本为止；它不会授予或禁用发布工具。

    `resolveCliBackendDispatchEligibility({ provider, model, agentId, authProfileId, config, agentDir, workspaceDir })` 共享嵌入式运行器的 CLI-backend 调度决策（路由、后端声明的 `subscriptionAuthDispatch` 能力、已存储的凭据模式——遵循显式固定的 `authProfileId`），供选择通过 `cliBackendDispatch: "subscription-auth"` 运行嵌入式任务的调用方使用。当运行将通过 CLI 后端执行时，它返回 `{ provider }`；当运行保持直接透传时返回 `undefined`，因此调用方可以为实际执行的运行预算超时时间。

    使用此 CLI 选择加入的原始调用会保留已保存的会话回退，以便选择同一代理子模型。显式和配置的子模型仍然优先。

    `resolveThinkingPolicy(...)` 返回 provider/model 支持的思考级别和可选默认值。Provider 插件通过其思考钩子负责维护特定模型的 profile，因此工具插件应调用此运行时辅助工具，而不是导入或重复 provider 列表。

    `normalizeThinkingLevel(...)` 将用户文本（例如 `on`、`x-high` 或 `extra high`）转换为标准存储级别，然后根据解析的策略进行检查。

    `resolveSessionCatalogCreateTarget(...)` 是实现 `SessionCatalogProvider.resolveCreateSession` 的受信任本机插件支持的同步策略接口。它选择路由到所请求的运行时并允许所请求或默认代理的第一个候选模型。当没有候选人满足这两个策略时，它返回 `undefined`。使用此帮助程序而不是在插件中导入或复制核心模型选择策略。

    **会话存储辅助工具**位于 `api.runtime.agent.session` 下：

    ```typescript
    const entry = await api.runtime.agent.session.getSessionEntryAsync({ agentId, sessionKey });
    const match = await api.runtime.agent.session.getSessionEntryByIdAsync({ agentId, sessionId });
    for (const { sessionKey, entry } of api.runtime.agent.session.listSessionEntries({ agentId })) {
      // Iterate session rows without depending on the legacy sessions.json shape.
    }
    await api.runtime.agent.session.prepareSessionEntryPatch({
      agentId,
      sessionKey,
      prepare: () => ({ thinkingLevel: "high" }),
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

    对于会话工作流程，首选 `getSessionEntryAsync(...)`、`getSessionEntryByIdAsync(...)`、`prepareSessionEntryPatch(...)` 或 `upsertSessionEntry(...)`。这些帮助程序通过 agent/session 身份来寻址会话，因此插件不依赖于旧版 `sessions.json` 存储形状。将 `preserveActivity: true` 用于不应刷新会话活动的纯元数据补丁，仅当回调返回完整条目且已删除字段必须保持删除状态时才使用 `replaceEntry: true`。医生和迁移路径可以组合 `fallbackEntry`、`skipMaintenance` 和 `requireWriteSuccess` 以对底层存储进行一次原子修复。

    两个异步 getter 也从现有的 `openclaw/plugin-sdk/session-store-runtime` 子路径导出。它们返回完整的公共条目投影，不包括主机私有字段，或者返回 `undefined` 缺失的条目。 by-ID 结果包括来自同一选定所有者的 `{ sessionKey, entry }`。显式 `storePath` 选择该物理商店；主机提供的隐身范围内的省略路径保留该范围。如果插件所有者在读取挂起时退出，托管运行时调用将被拒绝。返回的元数据并不授权稍后生效；重新验证调用者在该边界的当前权限。 SDK 和运行时 `getSessionEntry(...)` getter 已弃用，取而代之的是 `getSessionEntryAsync(...)`，并在 2026 年 12 月 31 日之前继续受支持，并在 2027 年 1 月的第一个稳定版本中删除。它们的同步行为在迁移窗口期间保持不变。现有的 `readSessionUpdatedAt(...)` 弃用遵循相同的删除窗口；而是等待 `readSessionUpdatedAtAsync(...)`。

    默认情况下，`getSessionEntryByIdAsync(...)` 选择会话密钥顺序中第一个可见的精确 ID 匹配，仅当没有精确匹配时才回退到修剪后的旧 ID。通过 `orderBy: "updatedAt"` 来选择精确 ID 和修剪 ID 之间最近更新的匹配，并使用会话密钥顺序打破平局。 Active Memory 使用此选项来保留其最近的会话选择。

    隐身参与者支持是非活动准备：普通的未绑定隐身调用仍然使用现有的主机拥有的存储并且不分配参与者。显式的主机绑定锻炼演员手臂；新选择的缺席仍然与最终保留的演员不同。 `rethrowIncognitoSessionError(error)` 在可选读取错误处理程序中保留这些类型化的拒绝。主动记忆等待进入、资格和状态准备，并且不会将演员的损失变成空的回忆。不引入架构、保留或更新迁移。

    当补丁授权在准备等待期间可能发生更改时，请使用 `authority: { kind: "host", assertCurrent }` 进行实时、无数据库的所有者检查，或将主机提供的准备源作为 `authority: { kind: "source", source }` 传递。 Worker 比较捕获的条目并在提交前重新检查权限；冲突在没有重放准备的情况下被拒绝。旧版 `patchSessionEntry` 和事务本地回调防护仍然是已弃用的兼容性适配器。有关仅数据补丁和保留的 incognito/cross-store 路由，请参阅 [ 会话条目迁移 ](/plugins/sdk-migration/how-to-migrate#prepare-session-entry-changes)。

    对于本机对话控制，等待 `openclaw/plugin-sdk/session-store-runtime` 中的 `getConversationSessionAsync(...)` 来读取一个传输地址的当前记录绑定。供应`agentId`、`channel`、`accountId`、`kind`（`direct`、`group`或`channel`）和入口`peerId`；可选的 `threadId` 选择精确的螺纹。可选的 `storePath` 和 `env` 选择与其他会话助手相同的代理存储。当不存在当前绑定时，它返回 `{ sessionKey, sessionId }` 或 `undefined`，并在会话重置后不创建会话。它不会列出活动运行或推断父地址。同步 `getConversationSession(...)` 已弃用。目标停止调度可以提供 `replyOptions.isCommandTargetCurrent`，这是在取消边界等待的正在进行的所有者检查。错误的结果会拒绝陈旧的目标；已取消的所有者无法将替换会话标记为已中止。

    来自 `openclaw/plugin-sdk/session-binding-runtime` 的 `captureSessionEntryCurrentCheckAsync(...)` 一起准备公共条目元数据及其原始来源。为操作消耗的确切策略值提供 `fields`，然后在其他等待的工作之后在效果边界处等待 `assertCurrent()` 或 `isCurrent()`。当前条目和对话谓词在一个读者-工作者快照中运行。除非显式选择 `matchGeneration: false`，否则会话身份和生命周期仍然是谓词的一部分。可选的 `expected` 条目拒绝在准备期间更改的选择。返回的条目是描述性数据；对其进行突变不会改变保留的保护。在最后一次权限检查后，在所属操作的 `finally` 块中调用 `release()`。将 `source` 传递给类型化的工作人员支持的突变权威，或将 `entryCurrent` 传递给接受 `SessionEntryCurrentCheck` 的所有者； `source.assertScopeCurrent()` 仅检查实时主机所有权，并且不会替换效果的当前行检查。永远不稳定的`captureSessionEntryCurrentCheck(...)`立面已被拆除；迁移到上面等待的检查和准备好的源。

    `createSessionEntry(...)` 创建新的存储会话行和记录。其值得信赖的 `initialEntry` 表面故意狭窄。插件可以选择拥有的 `agentHarnessId`；使用 `cliBackendId`、`model` 和 `cliSessionBinding` 为自有的 CLI 后端播种；或者与 `acpBackendId` 和 `acpSessionBinding: { acpAgentId, agentSessionId }` 建立持久的 ACP 会话。 ACP 变体通过共享的 SQLite ACP 元数据所有者保留提供的本机代理会话 ID，因此第一轮将恢复该外部会话。注入的运行时将插件拥有的 CLI 和 ACP 会话限制为调用插件的 `plugin:<id>:` 命名空间；harness ID 必须通过 `registerAgentHarness(...)` 拥有。这些是所有权不变量，而不是进程内插件之间的沙箱。创建拒绝现有行； `label`、`displayName` 和 `spawnedCwd` 是单独的创建字段，而不是可信条目补丁。

    可选的 `displayName` 以原子方式使用新行播种现有的表示字段。主机将其修剪并截断为最多 500 个 UTF-16 代码单元，而不拆分代理对；空或仅空白输入使其未设置。允许重复的显示标题，并且不声明可寻址标签。显式 `label` 值保留正常的唯一性验证和显示优先级。重用和中断初始化程序恢复保留所有存储的标签和标题快照，包括缺失的标题和较旧的自动分配的标签。此仅创建输入不允许通过 `initialEntry` 或 `afterCreate` 最终补丁更改标题，并且不是公共 `sessions.create` 网关参数。

    在通告 ACP- 支持的操作之前，请使用 `openclaw/plugin-sdk/acp-runtime` 中的 `resolveAcpSessionAvailability(...)`。它应用共享启用、调度、允许代理、注册后端和后端运行状况检查；在创建会话之前立即重新检查它。

    ACP 管理器输入接受可选的 `agentId` 标识 OpenClaw 会话所有者； `agent` 选择外部harness。通过后续调用（包括控制和清理）从 `resolveSession(...)` 携带已解析的所有者。 `expectedOwnerKey` 保留其父会话含义。

    后端可以在 `AcpRuntime` 上宣传 `ownerAwareSessions: 1`，包括其惰性外观。这保证了 `ensureSession(...)` 和 `prepareFreshSession(...)` 的所有者隔离。它们的可选 `agentId` 和手柄的可选 `agentId` 保留了现有后端源兼容性。合格的密钥继续与旧后端一起使用；需要隔离的裸会话会在生效前拒绝不具备此功能的后端。逻辑 `sessionKey` 仍为 SDK/tool 标识。可选的 `persistedHandle` 是用于检测旧后端定位器的投影，而不是执行权限。需要迁移的错误必须通过重置和恢复来传播，而无需清除元数据。

    ACP 后端可以从 `setConfigOption(...)` 返回 `AcpRuntimeConfigOptionResult`：`{ id, category?, currentValue, options? }` 的完整 `configOptions` 数组，其中 `currentValue` 是字符串或布尔值。选择包含 `{ value }` 条目或 `{ options: [{ value }] }` 组的 `options`。 OpenClaw 协调已接受的 `thought_level` 类别或公认的思维键中已选择的思维覆盖。仅当待定思考值仍然是当前或可选择时，自动模型重放才会保留该思考值；显式控制始终使用可接受的值。空数组会删除该覆盖；允许省略或为 null `category`，并且不固定后端默认值。返回 `void` 的现有第三方后端保留请求值持久性。后端持久化成功后返回快照；拒绝失败的写入。

    创建操作会一直持有会话生命周期变更栅栏，直到 `afterCreate` 完成，因此新工作会等待插件拥有的初始化结束，而预先已准入的工作会使创建失败。回调接收所创建状态的副本。如果回调返回补丁，该补丁只能包含 `pluginExtensions`，其值就是完整的最终 `pluginExtensions` 字段。回调或最终持久化失败会回滚未发生变化的新行和转录；受保护的回滚会保留同时被更改或认领的行。`recoverMatchingInitialEntry: true` 仅用于在持久化的受信任字段完全匹配时重试中断的初始化，并且恢复操作要求 `afterCreate` 返回最终补丁。

    回调的可选 `initialization` 句柄属于这个确切的待定子级、源化身、注册表和创建生命周期。使用`assertCurrent()`跨等待准备和写入；保留的句柄在准备就绪或关闭后拒绝。只有主机注册的回滚路径才能使用`assertRollbackCurrent()`。较旧的主机可能会省略句柄，因此需要创建权限的功能必须拒绝该路径而不是伪造运行。

    `initialization.prepareNativeToolPolicy(model)` 检查主机固定子级的本机执行环境和利用策略，然后返回其持久性 Web 搜索策略。有界本机模型选择是数据，而不是更改子项或注册表的权限。此句柄不会构造工具、调用提示挂钩、提供请求者资源或公开执行者、批准或凭据。实际承认的运行拥有他们可用的工具和实时挂钩；继承的本机声明仍然是元数据。

    当插件开始在持久会话上工作时，使用 `runWithWorkAdmission(...)`。回调拒绝存档或同时替换的会话，通过完成保持 archive/reset/delete 突变协调，并接收必须转发到代理运行的 `AbortSignal`。工具可以通过其实验性 `delegatedExecutionPluginIds` 注册字段显式命名受信任的执行委托。代表只能允许并运行确切的现有模型锁定会话；所有会话突变仍然仅限于harness所有者。请参阅 [Agent harness插件 ](/plugins/sdk-agent-harness#delegated-execution)。

    维护和修复插件可以使用 `deleteSessionEntry(...)` 作为一个范围会话条目，使用 `cleanupSessionLifecycleArtifacts(...)` 作为生命周期拥有的临时会话，并使用 `deleteSessionEntry({ ..., backupDir })` 在删除之前完成恢复快照。修复一个存储中的多个条目时，仅在第一次删除时传递 `backupDir`。备份使用经过验证的 SQLite 快照所有者，嵌入保留的冷记录，并发布一个独立的数据库，而无需 WAL 或 SHM sidecar 以及任何旧会话索引。使用新的备份目录；现有的目标文件永远不会被覆盖。 `resolveSessionStoreBackupPaths(...)` 仍然是工件清单，而不是安全的文件复制协议。当删除不得与并发会话更新竞争时，传递 `expectedSessionId` 和 `expectedUpdatedAt`；当早期快照没有会话 ID 时，使用 `expectedSessionId: null`。这些助手是狭窄的 repair/lifecycle 表面，而不是一般的存储删除 API。

    `resolveStorePath(...)` 和 `updateSessionStoreEntry(...)` 补充了会话辅助工具：`resolveStorePath` 为给定范围解析会话存储路径，而 `updateSessionStoreEntry({ storePath, sessionKey, update })` 则在调用方已经知道存储路径时，直接按存储路径补丁更新一个条目。

    `loadTranscriptEventsSync(...)` 可用于无法使用异步转录运行时的同步医生和修复路径。它返回原始 `SessionStoreTranscriptEvent` 记录，并且不咨询运行时 `session.store`；对于非默认存储，传递 `storePath`。正常的插件运行时代码应该更喜欢 `openclaw/plugin-sdk/session-transcript-runtime`。

    `formatSqliteSessionFileMarker(...)`、`parseSqliteSessionFileMarker(...)` 和 `sqliteSessionFileMarkerMatchesSession(...)` 是仍接收名为 `sessionFile` 的旧字段的代码的过渡帮助程序。解析后的 SQLite 标记识别实时 SQLite 转录目标；它不是文件系统路径。新的 API 应该携带类型化的会话身份而不是标记字符串。

    对于转录本读取和写入，导入 `openclaw/plugin-sdk/session-transcript-runtime` 并使用 `resolveSessionTranscriptIdentity(...)`、`resolveSessionTranscriptTarget(...)`、`readSessionTranscriptEvents(...)`、`readSessionTranscriptRawDelta(...)`、`readSessionTranscriptVisibleMessageDelta(...)`、`readVisibleSessionTranscriptMessageEntries(...)`、`appendSessionTranscriptMessageByIdentity(...)`、`publishSessionTranscriptUpdateByIdentity(...)`、或 `withSessionTranscriptWriteLock(...)` 与 `{ agentId, sessionKey, sessionId }`。这些 API 允许插件识别转录本、读取原始事件或可见的分支安全消息条目、附加消息、发布更新以及在同一转录本写入锁定下运行相关操作，而无需依赖于活动转录本文件路径。 `readVisibleSessionTranscriptMessageEntries(...)` 返回有序读取元数据；它的 `seq` 字段不是可恢复游标。

    对于上面列出的基于身份的操作，当操作接受一个时，省略的 `storePath` 会从提供的 `config` 中选择 `session.store`，否则从当前运行时配置快照中选择。显式具体 `storePath` 优先；隐身会话密钥始终选择隔离的内存存储。即使在回调等待期间运行时配置发生更改，写入锁也会固定其选定的存储以进行回调读取、追加和排队发布。公众身份和目标仍然无路可走。 `readLatestAssistantTextByIdentity(...)` 和 `appendAssistantMirrorMessageByIdentity(...)` 使用相同的商店选择规则。

    `readLatestAssistantTextByIdentity(...)` 保留所选助理文本的空白，并包括来自同一持久消息的可选的经过验证的 `openclawDelivery` 事实。恢复消费者可以保留回复、语音、媒体和 TTS 意图，而无需重新解析已删除的指令。这些事实并不授予交付权力；呼叫者仍然应用当前轮次和回复策略检查。

    `withSessionTranscriptWrite(...)` 公开 `readMessageFacts({ idempotencyKeys })` 进行精确键查找，而无需加载完整的转录本。事实和写入保留上下文捕获的会话和存储；保留的回调在上下文关闭后拒绝。本机历史记录修复可以保留现有消息的原始运行属性，同时保持附加所有者的严格有效负载比较不变。返回的身份是证据，而不是新的执行权限。

    `appendSessionTranscriptMessageByIdentity(...)` 是已采用受支持格式的消息的低级附加。插件不得将承载介质的用户行与顶级 `MediaPath`、`MediaPaths`、`MediaUrl`、`MediaUrls`、`MediaType` 或 `MediaTypes` 进行合成。通道入口应通过 `MsgContext.media` 传递有序事实，并让主机拥有用户轮持久性。主机准备的持久用户消息携带 `message.__openclaw.media` 下的规范化有序事实；通用附加 API 不会推断或修复旧的并行数组。

    在回复调度程序之外传递的本机命令适配器在确认传递后使用来自 `openclaw/plugin-sdk/session-transcript-runtime` **的 `recordDeliveredCommandExchange(...)`**。传递拥有的 `sessionKey`、可选的 `agentId`、`config` 或 `storePath`、文字 `commandText`、可见的 `replyText`、稳定的 `commandId` 和稳定的每次回复 `replyId`。发送前捕获`expectedSessionId`；可选的 lifecycle/writer 期望和 `assertCurrent` 保留绑定目标。帮助程序附加可重播的 user/assistant 行，通过会话创建所有者初始化以前不存在的会话，删除回复中的重复输入，编辑登录 URL 和凭证代码，并保留 `/btw` 和 `/side` 短暂的。它返回转录追加结果（`ok: true` 与 target/message ID，或 `ok: false` 与原因）；它不发送消息。切勿将其用于预览、失败的发送或已拥有其脚本行的普通模型回复。

    当本机交互也调度命令时，请使用 `scopeCommandTranscriptId(messageId, { channelId, accountId, conversationId })` 进行两个回复，以便命令存储一次。使用调度程序的消息标识和会话路由，而不是单独的触发标识；将发送的回复与 `replyId` 区分开来。

    支持 `sessions_yield` 的工具在成功结算收益后使用 `appendSessionYieldContext(...)` 在存储的会话记录中保留私有简历上下文。传递会话目标 `message` 和检查当前运行和结算权限的 `assertCurrent` 回调。作者在附加隐藏的上下文条目之前再次检查该回调。失败或撤销的和解不得附加上下文；公共工具结果和显示投影必须省略私人消息。

只读本机会话目录使用同一子路径中的 `readSessionTranscriptCatalogPage({ agentId, sessionKey, storePath?, limit, cursor, sourceDomain, pluginId })`。它以最新到第一个目录顺序返回 `{ items, nextCursor? }`；可选的不透明光标继续指向较旧的项目，并且格式错误的光标将被拒绝。当省略 `storePath` 时，读取器解析配置的会话存储，并将光标绑定到所选存储和会话。仅包含来自本地聊天显示投影的非空用户和助理文本；工具调用、工具结果、推理和其他非对话块被省略。文本保留凭据，并在剪切时设置 `truncated` 来限制每个项目。分享前先回顾一下；诊断导出保留其屏蔽。读取每页最多扫描 1,000 条源消息，因此仅包含省略的活动的页面可以没有项目，但仍返回继续游标。来自早期包含工具的投影的游标将被拒绝并显示重新加载消息。原始页读取限制为 8 MiB；过大的条目会返回显式错误。冷历史需要源网关恢复；目录读取器永远不会打开写入器来恢复它。用户发送者归属是可移植的：源本地配置文件成为调用者的 plugin/domain 命名空间中的远程身份，使用经过验证的数字 GitHub 帐户 ID（如果可用），否则使用源配置文件 ID。现有的远程和观察到的身份仍然是可移植的。调用者必须授权每个会话单独读取；游标或身份声明永远不会授予访问权限。 [Session Share](/plugins/session-share) 使用此读取器进行其配对节点发布。

选择页面后，目录列表发布者等待来自同一子路径的 `prepareSessionCatalogSourceActorProjector({ pluginId, sourceDomain, actors })`。它准备了工人的概况并验证了 GitHub 事实；按发布顺序同步调用每个参与者的返回函数。只有带有 `source: "profile"` 标记的人类创建者才能解析本地配置文件；由此产生的远程声明永远不会授予访问权限。为每个页面或请求准备一个新投影仪，以便刷新配置文件合并、显示名称和主 GitHub 帐户。同步 `createSessionCatalogSourceActorProjector` 已弃用，仅对现有使用者可用。请参阅 [ 目录身份准备](/plugins/sdk-migration/how-to-migrate#prepare-session-catalog-identities)。

    harness主机可以提供 `hostCapabilities.prepareContextMedia({ message, maxChars })` 以从存储的用户媒体重建保留的文档文本和图像。主机捕获当前运行的配置、工作空间、通道、帐户和权限；准备工作会重新检查异步工作的权限。 `maxChars` 必须是有限的并限制每个文件的提取。将所有返回的文本、附件注释和图像放入本机上下文预算中，并通过本机输入路径传递图像字节。准备工作重用普通本地根、URL、MIME、字节、页面和图像限制，无需重写脚本行或回显通道媒体。没有此可选功能的旧主机仍可以投影普通文本历史记录，但附件恢复必须显式失败，而不是默默地忽略已保存的输入。

    对于确切的现有会话，请使用 `appendSessionTranscriptMessageByIdentityStrict(...)` 表示一条消息，或使用 `appendSessionTranscriptMessagesByIdentity(...)` 表示原子有序批次。两者都接受可选的 `storePath`：当省略时，共享回合所有者从提供的 `config`（或当前运行时快照）、会话代理和 `env` 解析它；显式具体路径会覆盖 `session.store`，而隐身键保留其内存中路由。严格单一追加在消息准备拒绝追加时返回 `kind: "result"`、`kind: "suppressed"`，或者在预期会话不再匹配时返回 `{ kind: "rejected", reason: "session-rebound" }`。如果会话发生更改，则批处理会拒绝，并插入或重复整个组而不重复，而不是部分组。

    harness主机可以为其已接纳的当前提示提供 `hostCapabilities.annotateCurrentUserTurn(...)`。该操作仅接受`mirrorIdentity`、`upstreamUserText`、`mirrorOrigin`、`mirrorSourceFingerprint`；主机修复诊断运行相关性。仅在本机提示接受和外部转录写入锁定后调用它。它无法选择锚点、替换内容或注释历史记录。它重新验证实时主机、精确记录器、主动准入、session/writer 所有权、未更改的消息和提交时的源指纹，然后刷新记录器的生成并发布相同的事件 ID。相同出处不会再次重写或发布。能力缺失、冲突和陈旧的所有者必须继续拒绝；不要替换通用附录或推断出处。此可选功能不添加必需的主机版本字段，并且不会更改转录光标失效。

    主持人拥有注释资格。参与模型上下文的隐藏提示可以获得此能力；上下文排除的提示不能。无论是在本机回合开始还是结算时，harness都会重用已承认的提示的持久消息和收据，而不是附加其自己的副本。如果注释不可用，则保持主机行不变；如果它消失，请勿从本机转录本中重新创建它。

    `readSessionTranscriptRawDelta(...)` 返回有界的 `page`、`reset` 或 `missing` 结果。将不透明的 `page.cursor` 传入下一次调用。纯追加会保留游标，而转录替换会返回带有新引导游标的 `reset`。每页默认为 1,000 个事件和 1,000,000 个序列化字节；调用方最多可请求 10,000 个事件和 64 MiB。当下一个事件本身超过 `maxBytes` 时，该页为空并报告 `requiredBytes`；当该值不超过 64 MiB 时，请使用至少该字节数的限制重试。更大的单个事件需要使用完整读取 API。游标只标识位置，绝不会授予访问其他会话的权限。

    `readSessionTranscriptVisibleMessageDelta(...)` 在主机拥有的活动消息投影上提供相同的有界引导和恢复形状。它从最旧到最新返回消息，因此上下文引擎可以耗尽初始历史记录并将不透明光标保留为其水印。存储并返回光标不变；这是一个继续提示，而不是授权凭证。线性在最后返回的消息之后追加恢复。转录替换、锚点在活动分支内离开或移动的游标、格式错误的游标和跨会话游标将返回 `reset` 并带有新的引导游标。计数和字节默认值以及上限与原始增量 API 匹配。当活动投影在分支更改后重建时，结果为 `unavailable`，原因为 `projection_rebuilding`；稍后重试，而不是退回到活动的转录文件。

    beta.5 整个存储和转录路径桥已从 `openclaw/plugin-sdk/session-store-runtime` 中删除，以及包根 `loadSessionStore` 和 `saveSessionStore` 别名。 2026 年 9 月 30 日批准的 [ 支持的插件截止 ](/plugins/compatibility#session-store-bridge-retirement) 不包括 `v2026.7.1-beta.5` 和仍在导入该桥的其他版本。子路径、作用域条目帮助程序和 `resolveStorePath(...)` 仍然可用。将 `agentId` 显式传递给行操作；路径解析不会为以后的呼叫选择代理。

    使用范围条目帮助程序来处理会话元数据，使用脚本身份帮助程序来执行活动脚本操作。 Archive/support 需要文件工件的工作流应使用其专用存档表面，而不是活动会话运行时 API。 SQLite 仍然是事实来源，并且现有的遗留状态导入和 Doctor 迁移仍然可用。

  </Accordion>
  <Accordion title="api.runtime.agent.defaults">
    默认模型和 provider 常量：

    ```typescript
    const model = api.runtime.agent.defaults.model; // e.g. "gpt-5.6-sol"
    const provider = api.runtime.agent.defaults.provider; // e.g. "openai"
    ```

  </Accordion>
  <Accordion title="api.runtime.worktrees">
    托管工作树创建、发布和无损删除通过其 Git 和注册表效果保留所选状态根的所有权。所属网关内的呼叫保持在进程中。当没有进程拥有状态时，这些方法获得独占的离线保管，并在接受的工作解决后将其释放。

    外国实时网关或嵌入式所有者在局部影响之前拒绝使用 `code: "OWNER_UNAVAILABLE"` 的这些突变。在所属网关内运行插件操作，或通过其服务所有者停止网关并等待嵌入式运行完成，然后再重试脱机。 SDK 的 `create` 同步提交保护仍然是本地的，并且不能跨越 RPC。签出根和元数据检查保持只读。方法签名不变；不需要迁移。

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

    沙箱工作区准备检查所选状态根的实时所有者。这适用于 `openclaw/plugin-sdk/agent-harness-runtime` 中的 `prepareWorkspaceAuthority(...)` 和 `resolveSandboxContext(...)`。禁用的沙箱解析保持无操作，并且只读会话分类在外部进程中仍然可用。启用沙箱后，外部实时网关或嵌入式所有者会在沙箱工作区、注册表或投影突变之前导致 `code: "GATEWAY_STATE_OWNER_REQUIRED"`。在所属网关 plugin/runtime 内运行调用，或停止网关并等待嵌入式运行完成，然后脱机重试。

    由当前网关或嵌入所有者托管的呼叫保持在进程中。在工作区设置和后端配置之前，准备工作会重新检查捕获的托管权。失去监护权以 `GATEWAY_STATE_OWNER_REQUIRED` 拒绝；内置容器后端还保留跨配置等待的检查。当不存在实时所有者时，独立 SDK 呼叫者也保留在本地。 Preparation 不会通过 RPC 获取临时锁或转发权限回调；它不会阻止其他所有者在离线入场后启动。释放的参数和返回类型不变。较旧的 SDK 二进制文件和其他状态根仍保留在此同根门之外；数据库新鲜度检查仍然适用。无需迁移或更新步骤。

  </Accordion>
</AccordionGroup>
