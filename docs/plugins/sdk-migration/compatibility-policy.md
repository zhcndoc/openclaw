---
summary: "外部插件兼容性政策和带日期的每个表面兼容性记录"
read_when:
  - "您需要知道是否仍然支持兼容表面"
  - "您正在检查特定保留合同的移除条件"
title: "兼容性政策和记录"
sidebarTitle: "兼容性记录"
---

接下来是顺序兼容性工作，以及每个表面的记录，说明保留的内容、原因以及在什么条件下可以删除。 [Plugin SDK 迁移](/plugins/sdk-migration) 指南的一部分。

## <a id="compatibility-policy"></a> 兼容性政策

外部插件兼容性工作遵循以下顺序：

1. 添加新合约。
2. 通过兼容性适配器保留旧行为。
3. 发出诊断信息或警告，指出旧路径及其替代方案。
4. 在测试中覆盖两条路径。
5. 记录弃用信息和迁移路径。
6. 仅在宣布的迁移窗口后、在指定的普通稳定版本中删除。

对于[同步SQLite蜜蜂](/plugins/sdk-migration/sqlite-async)，最终兼容日是**2026-12-31**。拆除船舶在**第一月2027稳定发布**，没有插件SDK主要版本。其他兼容性记录保留其自己单独公布的窗口。

SQLite 和 SDK 编写器迁移针对每个插件身份使用一个共享运行时警告预算，并针对每个网关进程使用已弃用的功能系列。警告发生在实际遗留使用中，从不导入，并在插件重新加载后继续存在。他们命名了调用的方法、支持的替换、当前的兼容性承诺以及在宣布的弃用期后在以后的稳定版本中删除。未知的直接 SDK 消费者每个家庭共享一个有限的 SDK- 级别警告。诊断不包含数据库路径、凭据、有效负载或堆栈转储。此策略取代了早期针对这些写入器迁移的无新运行时警告规则；仅限文档的读者记录保留其自己的策略。

保留本机适配器的同步兼容性编写器仍然会在返回之前提交。已退役的适配器会拒绝呼叫，如下面的记录所示。仅在安装了提交的事实后，等待的突变才会完成。 SessionManager 及其 extension/provider 适配器共享会话持久性警告预算。

### <a id="harness-deletion-companions"></a> harness删除同伴

不推荐使用未绑定的 `AgentHarnessSessionDeletionMutation` 回调。在网关操作期间，OpenClaw 在调用不透明的 `commit` 回调之前在其工作线程中提交文件支持的会话删除。当数据库事务失败时，它不会调用不透明的 `rollback` 回调，因为同伴尚未更改。旧版使用会对每个插件和回调系列发出一个弃用警告。删除未绑定的回调合约需要宣布的稳定发布窗口。

将尽力而为的外部清理从 `openclaw/plugin-sdk/agent-harness-session-runtime` 包装到 `createNativeSessionCommitFinalizer` 中。失败的遗留回调将被记录为清理警告；它不会撤消已确认的会话删除。会话提交后进程退出可能会导致同伴清理未完成，因此清理必须容忍会话缺席并且可以安全地重试。

使用现有的本机会话绑定生命周期进行可逆的插件状态更改，这些更改必须通过会话删除来解决。它的工作人员接收和回滚保留了这些存储保证。只有在同一个收据确认删除后，初始化程序回滚才会被标记为完成。显式停止所有者 Doctor/CLI 维护保留其已承认的本机事务，进程本地隐身所有者在其单独迁移期间也是如此。

### <a id="retained-helper-contracts"></a> 保留助手合约

`openclaw/plugin-sdk/sandbox.resolveSandboxRuntimeStatus` 已弃用。等待 `resolveSandboxRuntimeStatusAsync` 进行会话查找，或将 `resolvePreparedSandboxRuntimeStatus` 与已选择的完整会话条目一起使用（或使用 `null` 确认缺席）。同步适配器保留其旧行为，并为每个插件发出一个有限的 `sandbox-runtime-status` 警告。稳定弃用后，它将在后续版本中删除。捆绑执行路径通过会话工作器准备策略并通过效果保留其权限；此迁移不会更改架构、保留或更新行为。

转录追加和锁定准备现在使用 [`preparation.prepareMessage`、`preparation.source` 和 `withSessionTranscriptWrite`](/plugins/sdk-migration/how-to-migrate#await-locked-transcript-preparation)。 `transcript-lock-sync-message-preparation` 和 `transcript-strict-sync-message-preparation` 记录保留了旧的锁定函数 `prepareMessageAfterIdempotencyCheck` 和 `beforeFreshMessageCommit` 的持久目标及其原始事务顺序。该系列的每个插件都会发出一个弃用警告。隐身和演员绑定的目标拒绝旧形式并出现可操作的替换错误。旧的导出和字段仍然可用于通过 **2026-12-31** 编译现有插件，并将在 2027 年 1 月第一个稳定版本 **中删除**。隐身目标使用内存参与者。持久存储的数据、架构、保留和更新行为保持不变。

Discord 和 llama.cpp 保留其声明的 OpenClaw 2026.9.2 主机支持。当这些导出可用时，他们使用较新的准备到期、DM- 策略细化和实时目录结果助手，以及 2026.9.2 SDK 的插件本地回退。回退通过较旧的 SDK 验证器保留 Discord 的时间戳验证、空闲优先到期关系和 root/account DM- 策略验证，以及 llama.cpp 的就绪、身份验证被拒绝和不可用的目录结果（具有凭证配置文件属性）。它们不会重试或抑制来自可用的较新助手的错误。仅当声明的插件 API 层不再包含 2026.9.2 时才删除这些后备；在更改无条件 SDK 导入之前，针对该最小主机测试构建的插件导入。

语音呼叫还保留其声明的 2026.9.2 主机支持。其实时升级处理程序将两个 HTTP 拒绝响应保留在本地，因为 SDK 没有 `websocket-runtime` 子路径。在套接字被销毁之前拒绝字节刷新，并且套接字错误保留其正常的清理行为。仅当声明的插件 API 楼层不包括 2026.9.2. 时，才删除此本地传输兼容性代码

保留的兼容性入口点保留其传送的调用者名称：`inbound-envelope` 使用 `resolveStorePath`，`provider-catalog-runtime` 导出 `resolvePluginProviders`，而 `agent-runtime` 的 `resolveThinkingDefaultWithRuntimeCatalog` 接受 `loadModelCatalog`。

`resolvePluginProviders` 保持同步并返回现有的提供者数组。当它借用自有检查时，网关生命周期或可执行 CLI 调用将保留后备资源，直到其实际工作和清理完成。在主机关闭之前使用这些提供程序完成呼叫；保留阵列并不授权在主机退役后使用。已发布的检查将保持停用状态，并且拒绝通过该检查进行新的查找。 OpenClaw 主机外部的调用者保留此 SDK 合约的独立进程生命周期；进程退出不保证异步插件处理。

检验放行放弃了检验本身的声明。如果SDK主机仍然借用相同的源，则最终处置权属于该主机。主机在拆卸过程中报告后来的处置失败；他们无法追溯更改已返回的检查结果。内部提供程序解析器不会获得此兼容性生命周期。

`text-chunking` 保留 `CodeRegion` 位置输入，以及 `isInsideCode` 的 `start` 和 `end` 偏移量。 `findCodeRegions` 返回的区域还包括解析器拥有的 `block` 元数据；提供自己范围的调用者不需要提供它。

### <a id="session-header-link-helper"></a> Session 标头链接助手

`openclaw/plugin-sdk/control-ui` 中的 `createSessionHeaderLink` 在 OpenClaw 2026.10.1 中发货，已弃用。会话对话链接已停用，因此主机不再将 `props.session` 传递给 `session-header` 配件。助手仍然会挂载，但它的链接永远不会呈现。针对 2026.10.1 构建的插件不断加载。 Render 是定制配件。 `plugin-sdk-session-header-link` 记录允许在 2027 年 1 月 12 日之后删除。

### <a id="private-runtime-facade-exports"></a> 私有运行时外观导出

某些 `openclaw/plugin-sdk/*` 子路径作为 JavaScript-only 运行时外观提供，没有 `types` 导出条件。它们不是类型化的第三方合约，但已发布的插件仍然从它们导入命名帮助程序，并且缺少名称会导致 ESM 链接失败，因此整个插件停止加载。 OpenClaw 2026.10.5 beta 删除了其中一些名称。已发布的外部导入程序的导出将在 `plugin-sdk-private-runtime-shipped-exports` 记录下恢复和弃用，该记录列出了每个 `subpath.name` 表面并允许在 2027 年 1 月 15 日之后删除。示例包括 `approval-reaction-runtime` 中的 `readApprovalReactionDeliveryMetadata`、`provider-web-search` 中的 Web 搜索凭证设置器以及 `provider-web-fetch` 中的 `wrapWebContent`。移动到导出帮助程序的类型化公共子路径，或保留插件本地副本。

### <a id="harness-tool-construction"></a> harness工具构造

harness应等待 `params.hostCapabilities.createToolSurfaceAsync(options, bindingOptions?)`。每个结构通过现有的工作人员读取新的执行策略，然后将工具绑定到确切的承认的主机。普通的执行批准读取错误使用保守的拒绝默认值。迁移错误和权限丢失拒绝施工；调用者不得通过同步工厂重试。 `openclaw/plugin-sdk/agent-harness` 的公共 `createOpenClawCodingToolsAsync(options?)` 工厂为非harness呼叫者提供了同样期待的准备。harness使用主机功能来保留其源权限和私有绑定。

OpenClaw 2026.9.8 中提供的同步 `createToolSurface` 和 `createOpenClawCodingTools` 合约仍可使用其现有参数、数组结果和完成时间。 TypeScript 标记它们已弃用，并在宣布的窗口后的后续稳定版本中删除，但需要明确的维护者批准。捆绑的呼叫者使用期待已久的工厂。此迁移不会更改存储的数据、架构、保留或更新行为。

### <a id="websocket-options-and-constructors"></a> WebSocket 选项和构造函数

`websocket-runtime` 保留 `ws.ClientOptions` 别名和 OpenClaw 2026.9.6. 主机内部 TLS 中附带的 `WebSocket` 构造函数签名更正不得更改插件回调类型或构造函数重载。对此公共合同的源不兼容更正需要经过批准的版本化 SDK 迁移。

### <a id="gateway-worker-environment-creation"></a> Gateway工作环境创建

`core` 和 `gateway-runtime` 中的 `GatewayRequestHandlerOptions` 保留 OpenClaw 2026.9.5. 中提供的工作环境创建合约。当 `context.workerEnvironmentService` 可用时，其 `create` 方法按以下顺序接受位置参数：`profileId`， `idempotencyKey`、`machineClass?`、`executionMode?`、`projectPath?`、`signal?`、`os?` 和 `runSetupScript?`。避免重复效果的重试和调用者取消可以在主机升级过程中保持现有行为。更改此合同需要明确批准的 SDK 迁移。

### <a id="gateway-placement-and-publication-readers"></a> 网关放置和发布读者

`GatewayRequestHandlerOptions` 从 `core` 和 `gateway-runtime` 以及 `getPluginRuntimeGatewayRequestScope()` 从 `plugin-runtime` 公开的网关上下文保留已弃用的放置签名，直到它们单独宣布的普通稳定删除版本为止。放置读取和写入现在使用现有的共享状态工作线程；本机同步数据库路径已停用。

`workerSessionPlacementService.get` 和 `getMany` 只读已提交的处理中收据。冷条目或无效条目会抛出等待 `getAsync` 或 `getManyAsync` 的指令；仅当所有者发布该事实时，才会返回缺席情况。同步清单方法（`list`、`listForReconcile`、`listPendingWorkspaceResults` 和 `getWorkspaceResultReconcilingSessionIds`）和突变（`retireSessionPlacement` 和 `clearLocalTurnClaimsAfterRestart`）会随其 `Async` 替换而抛出。这些调用既不查询 SQLite 也不对工作进行队列。旧版放置读取和写入共享其每个插件功能系列警告。

内置的 `placementStandingGrants.resolveBinding`、`retain` 和 `validate` 方法同样会引发迁移定向错误。等待他们的 `Async` 替代品； `resolveAsync` 可以结合绑定和保留父验证。在运输前，等待 `consumeAsync`，然后使用同步 `consume` 进行最终收货和到期检查，无需 SQLite。目前仍然需要当前的放置、配对、家长批准和呼叫者权限。自定义发布的服务对象保留自己明确选择的兼容性契约；内置网关永远不会回退到本机 SQL。参见[放置准备](/plugins/sdk-migration/how-to-migrate#await-placement-preparation)。

`githubPublicationService.deferOrphanedRequests()` 保留其 `void` 签名，但现在调用失败；使用 `await deferOrphanedRequestsAsync()` 推迟孤立请求。其他已弃用的发布方法同样仅保留其签名以用于迁移发现，并且会因替换指导而失败。

GitHub 发布的不透明请求者 `personalStatus` 和同步生命周期方法，加上托管 OAuth `cancelAuthorization` 和 `retireProfile` 以及个人 OAuth `cancelAuthorization` 和 `disconnect`，共享`github-publication` 运行时警告预算。 OAuth 方法保留其同步结果，直到相同的移除门；将托管OAuth迁移到`cancelAuthorizationAsync`和`retireProfileAsync`，将个人OAuth迁移到`cancelAuthorizationAsync`和`disconnectAsync`。出版状态读者使用具有相同参数的 `await personalStatusAsync(...)`。按照 [V2 请求和生命周期迁移](/plugins/sdk-migration/how-to-migrate#await-github-publication-operations) 获取所需的主机功能和回调排序。这不会改变放置读者家族的警告政策。

### <a id="approval-callback-timing"></a> 审批回调时序

已弃用的 `GatewayRequestHandlerOptions.sessionMutationCommitGuard` 回调保留其批准请求的签名，但现在在工作线程的预提交边界上运行。抛出会拒绝并回滚该写入。回调可以检查直播主权限；它无法通过主机数据库连接观察暂定工作行，也无法依赖于以前的主机事务视图。请改用主机绑定的 `api.runtime.gateway.request` 批准方法。旧版使用共享 `native-approval-callback` 警告预算。引导孤儿清理和终端修剪保持同步引导允许工作。模式、保留的决策、持久性和更新行为保持不变。

### <a id="channel-pairing-allowlists"></a> 频道配对允许列表

自 2026 年 10 月 3 日起，`openclaw/plugin-sdk/channel-pairing` 中的 `readChannelAllowFromStoreSync` 已弃用。等待来自具有相同通道、环境和可选帐户 ID 的同一子路径的 `readChannelAllowFromStore`。两个 API 均以 OpenClaw 2026.9.8 形式发货；同步 API 保留其签名和本机行为，直到宣布稍后的稳定版本并明确维护者批准为止。

异步 API 和捆绑通道调用方读取共享状态工作线程中的当前允许列表行。帐户规范化、条目排序和入口策略门保持不变。丢失的存储会返回空的允许列表，而不创建存储； boot 和 Doctor 自己的初始化和迁移。读取失败会传播到调用者，并且入口仍然会阻止读取失败时的请求。准备好的条目不会取代当前的消息或频道权限。不需要架构、保留或更新迁移。同步白名单读取会发出有限的 `channel-pairing-sync-allowlist` 弃用警告。

### <a id="inbound-envelope-timestamps"></a> 入站信封时间戳

等待来自 `openclaw/plugin-sdk/session-store-runtime` 或 `runtime.channel.session.readSessionUpdatedAtAsync` 的 `readSessionUpdatedAtAsync`。现有的会话读取器捕获物理存储并读取其工作线程中的当前活动。缺少的商店会返回 `undefined`，而不创建或迁移数据库。读取失败会传播；没有同步回退。

从 `openclaw/plugin-sdk/channel-inbound` 开始，在消息的格式化边界处等待 `createChannelInboundEnvelopeBuilderAsync` 或 `resolveInboundSessionEnvelopeContextAsync`。在准备其信封之前，解析从 `openclaw/plugin-sdk/routing` 通过 `resolveAgentRoute` 的路由。为每条入站消息创建一个新的构建器。它返回的格式化程序是同步的，并重用该消息的准备时间戳； `previousTimestamp: null` 仍然抑制历史条目的时间戳。准备好的时间戳描述活动，并且永远不会取代当前通道或会话权限。

OpenClaw 2026.9.8 中提供的同步时间戳和信封 API 仍保持不推荐的兼容性，直到宣布稍后的稳定版本并明确维护者批准为止。通过 SDK 子路径或 `runtime.channel.session` 调用 `readSessionUpdatedAt` 会发出相同的弃用警告。兼容性窗口包括基于回调的`inbound-envelope`帮助器和`dispatchInboundDirectDmWithRuntime`；捆绑呼叫者使用等待的准备和`dispatchInboundDirectDm`。现有的同步签名和回调计时保持不变。不需要架构、存储的数据、保留或更新迁移。

### <a id="combined-session-store-reads"></a> 组合会话存储读取

等待来自 `openclaw/plugin-sdk/session-transcript-hit` 的 `loadCombinedSessionStoreForGatewayAsync`。它在读取数据库工作人员中的持久存储和外部父元数据时保留完整条目结果并排除隐身会话。每次调用都会观察已提交的进程内写入；它返回的视图保留了为该调用捕获的事实。

同步 `loadCombinedSessionStoreForGateway` 会发出弃用警告，并在弃用期间保留其现有签名和行为。稳定弃用后，它将在后续版本中删除。捆绑内存搜索使用异步方法。不需要架构、保留数据或更新迁移。

### <a id="progress-card-handoff"></a> 进度卡切换

自 2026 年 10 月 6 日起，`openclaw/plugin-sdk/reply-runtime` 中的 `ReplyDispatchRuntimeInfo.adoptProgressContinuation(receipt)` 已弃用。可编辑进度适配器使用 `adoptProgressDraft(draft)` 代替：它们保留卡及其渲染，主机推送准备好的项目并停用卡一次。参见 [ 进度卡切换 ](/plugins/sdk-channel-plugins/status-and-media#progress-card-handoff)。

OpenClaw 2026.9.8 中提供的收据类型保持源兼容，直到发布具有明确删除批准的后续稳定版本。主机从不提供它，因此检查它的已发布适配器保留普通的等待答复传递，并且主机永远不会收到收据。 Telegram 是唯一的捆绑采用者，使用草案切换。不需要架构、存储的数据、保留或更新迁移。

### <a id="watched-session-harness-context"></a> Watched 会话harness上下文

自 2026 年 10 月 3 日起，`openclaw/plugin-sdk/agent-harness-runtime` 中的 `buildWatchedSessionsHarnessContext` 已弃用。等待来自同一子路径的 `prepareWatchedSessionsHarnessContext`，传递相同的提示输入和绑定到当前主机功能的所需 `assertCurrent` 回调，并尝试取消。当该权限不再有效时，必须抛出回调；准备在读取之前检查它，并在公开准备好的上下文之前再次检查它。

等待的助手读取现有数据库工作人员中的监视会话和会话条目事实。它保留提示字节、排序、限制、工具可用性和可见性门，并且永远不会回退到调用者线程数据库读取。捆绑的harness使用了等待的助手。发布的同步助手将保留其 `string | undefined` 结果和行为，直到宣布稍后的稳定版本并明确维护者批准为止。 JSDoc 和兼容性注册表会记录弃用情况，并且遗留调用会发出有限的迁移警告。不需要架构迁移或更新更改。

### <a id="reply-tool-authority-preparation"></a> 回复工具权限准备

2026年10月4日的`reply-tool-authority-sync-preparation`记录保留了通过`EmbeddedRunAttemptParams.replyOperation`和`AgentHarnessAttemptParams.replyOperation`可到达的同步指纹、投影和绑定方法，包括它们的V2类型。这些合约以 OpenClaw 2026.9.8. 形式发货。仅包含 `fingerprint` 和 `project` 的现有快照文字仍然有效；他们等待的同伴是可选的。

该记录还保留了原来的V2队列方法。外部实现可以添加 [awaited 回复工具权限 ](/plugins/sdk-migration/how-to-migrate#await-reply-tool-authority) 中描述的可选等待队列伴侣。旧版外部 V2 注入后端保留新的本机策略检查；早期准备的指纹永远不会取代当前的权威。提供的 Talk 控制适配器保留完全渲染的转向和后续输入，包括准备好的上下文和转录记录器，即使它们忽略可选的准备回调也是如此。内置运行时在其队列预留内准备该输入，以在等待的策略读取中保持顺序。旧版 V1 后端保留未绑定的运行拥有的输入；调用者绑定输入仍然需要 V2。工人的准备并没有改变这种区别。传统的普通队列准备保留在其 FIFO 预留内，并在工作人员授权之外进行同步最终检查。完整的工作准备将其最终策略和目标读取绑定到队列中；入队后清理或通知失败会保留输入保管权，并且无​​法授权重播。问题声明和取消保留其现有的同步断言，并为准备好的后端提供可选的等待同伴。本机会话绑定机构保留其原始 `withCurrent` 合约。可选的`withPreparedCurrent`伴侣与本地血统许可组成新的工具策略；旧的权限实现仍然有效并使用完整的同步兼容性检查。

自定义问题调度程序保留其原始 `authority.assertCurrent` 回调，并可以添加可选的等待同伴。旧版外部 V2 调度程序保留新的本机策略检查。存储绑定秘密答案的保留提交守卫仍然重新检查其原始会话所有者。

删除需要稍后宣布的稳定版本和明确的维护者批准。 TypeScript注释和迁移文档覆盖整个合约；遗留准备和注入后备也会发出有限的警告。 SQL-free 准备的投影和实时效果断言与支持的路径共享，并且不会仅仅因为这些方法存在而发出警告。存储的数据、架构、保留和更新行为保持不变。

### <a id="harness-attempt-result-migration"></a> harness尝试结果迁移

在 OpenClaw 2026.8.1 中，`openclaw/plugin-sdk/agent-harness-runtime` 中的 `EmbeddedRunAttemptResult` 需要当前的 `terminal` 字段。针对 2026.7 直接别名编写的源在使用 `aborted`、`timedOut` 和 `promptError` 等旧字段构造结果时必须迁移；保留别名并不会使那些旧的构造函数与源代码兼容。

在迁移旧结果生成器时，使用同一子路径中的 `AgentHarnessAttemptResult`。该联合接受旧字段和当前格式结果，并且主机生命周期在核心使用旧结果之前规范它们。新生产者应构造`terminal`；联盟的消费者在阅读结果之前必须缩小结果范围。当前的 `EmbeddedRunAttemptResult` 合约保留 `terminal` 为必需。

### <a id="session-observer-and-progress-visibility"></a> Session 观察者和进度可见性

2026 年 10 月 4 日的 `session-observer-progress-sync-reads` 记录保留了 2026.9.8. 中提供的同步观察者方法和进度可见性合约，`context.sessionObserver.handleEvent`、`getCompanionSnapshot` 和 `dispose` 保留其同步签名和完成行为。 `PluginHookReplyDispatchEvent.shouldSendToolSummaries` 仍然是实时布尔值获取器，`shouldSendFullToolDetails` 仍然是调度时布尔值，而 `GetReplyOptions.onVerboseProgressVisibility` 仍然接收同步获取器。

核心和捆绑呼叫者使用 [awaited 替代品 ](/plugins/sdk-migration/how-to-migrate#await-session-observer-and-progress-visibility)。发布的 ACP 挂钩助手仍然接受来自外部调用者的纯布尔事件；主机创建的事件提供了新的期待的谓词。已弃用的本机读取仍然存在兼容性债务，直到稍后宣布稳定版本并得到明确的维护者批准。 JSDoc 和兼容性注册表记录了弃用情况，并且使用遗留观察者或可见性回调会发出有界迁移警告。架构、保留的数据和更新行为保持不变。

### <a id="mention-inbox-persistence"></a> 提及收件箱持久化

`mention-inbox-sync-persistence` 记录保留 `mentionInbox.list(client)`、`mentionInbox.dismiss(client, ids)`、`mentionInbox.recordCommittedInput(input)` 和 `mentionInbox.invalidate(sessionKey)` 的 TypeScript 签名，直到它们单独宣布普通稳定删除版本。他们的本机同步持久性适配器已于 2026 年 10 月 11 日停用，因此网关数据库工作仅在工作线程中运行。 `list` 和 `dismiss` 现在返回 `UNAVAILABLE` 结果以及迁移指导； `invalidate` 在相同的指导下抛出错误。这些被拒绝的调用不会读取、改变或安排数据库工作。旧版 `recordCommittedInput` 在任何封闭事务提交后对工作操作进行排队；回滚会丢弃它。等待 `recordCommittedInputAsync` 完成。有序关闭期间排队录制会耗尽；突然终止可能会丢失已接受的遗留提交。

使用 `listAsync` 和 `dismissAsync` 及其同步结果发布回调，并等待 `recordCommittedInputAsync` 和 `invalidateAsync`；请参阅 [ 等待提及收件箱操作 ](/plugins/sdk-migration/how-to-migrate#await-mention-inbox-operations)。核心和捆绑调用者使用这些工作程序支持的方法。旧版调用会针对每个进程的每个插件和功能系列发出一个 `DEP_SESSION_PERSISTENCE` 警告，并针对未指定范围的调用发出一个 SDK-level 系列警告。等待的操作在解析之前保留精确的 ID 匹配和完整的持久性。架构、保留的数据、保留和更新行为保持不变。

### <a id="personal-model-account-control-plane"></a> 个人模型-账户控制平面

十月3， 2026 `model-account-connect-sync-persistence`记录保留七个同步`modelAccountConnectService`运送方法2026.9.8： `listLinks`， `link`， `unlink`， `list`， `select`， `status`， 和`cancel`。它们仍然可以通过网关插件使用SDK与他们现有的论点、返回信封和立即完成相关，直到宣布稍后的稳定版本和明确的维护者批准。特别是释放的动作形状`{ owner: string; assertCurrent: () => void }`保持源兼容。

核心和捆绑调用者使用相应的 `Async` 方法；参见[等待个人模型-账户操作](/plugins/sdk-migration/how-to-migrate#await-personal-model-account-operations)。同步调用针对每个插件和每个进程的功能系列发出一个 `DEP_SESSION_PERSISTENCE` 警告；未指定范围的调用者共享一个家庭警告。兼容性适配器在此窗口期间保留本机数据库访问。 RPC 架构、凭证存储、保留和更新行为未更改。

### <a id="awaited-session-persistence"></a> Awaited 会话持久性

2026 年 10 月 1 日记录 `session-manager-sync-persistence`、`extension-session-sync-persistence` 和 `provider-replay-sync-persistence` 将已发布的同步转录合同保留为指定的第三方兼容性适配器。它们的最终兼容日是 2026 年 12 月 31 日，并在 2027 年 1 月第一个稳定版本中删除，并且没有插件 SDK 主要版本。插件迁移时，现有导出和立即返回值仍然可用；同步 SessionManager 方法及其 extension/provider 适配器每个插件和每个进程的会话持久性系列共享一个警告。

使用 [awaited 会话持久性迁移](/plugins/sdk-migration/how-to-migrate#await-session-transcript-persistence) 来实现完整的方法映射、扩展调用和版本化提供程序重播类型。捆绑代码使用期待已久的合约。文件支持的写入重用共享工作写入器； incognito 使用会话参与者的内存后端。同步隐身持久性拒绝访问并指定其等待的替代者。架构、持久字节和支持的更新路径未更改。拆除是在宣布的窗口和装运表面大门之后进行的。

### <a id="reply-run-start-transcript-facts"></a> 回复运行启动记录事实

来自 `openclaw/plugin-sdk/reply-runtime` 的 `GetReplyOptions.onPreparedAgentRunStart`，也提供给 `reply_dispatch` 钩子，接收一个 `PreparedAgentRunStart` 对象，其中包含 `runId`、可选的 `executionIdentityToken` 和 `options` 以及所需的 `transcriptStart` 事实（或`null`（当没有成绩单时）。在调用回调之前，通过等待的运行时准备转录边界。事实描述了记录边界，并不授予会话或写入权限。

捆绑的运行时和回调包装器使用此协定，因此网关在处理通知时不会读取 SQLite。转发完整的对象并同步返回回调结果。完成所有权需要同步返回`"reply-dispatch"`； Promise 并不转移所有权。

已弃用的 `onAgentRunStart` 保留了 OpenClaw 2026.9.8： `(runId, executionIdentityToken?, options?) => unknown` 中提供的回调，包括可选的第四个 script-facts 参数。已发布的回调和省略后续参数的生产者仍然受支持。旧版调用会针对每个插件和每个进程的回调系列发出一个 `DEP_SESSION_PERSISTENCE` 警告。网关的遗漏事实同步读取将一直保留到稍后宣布的稳定版本和明确的维护者批准为止。架构、保留的数据和更新行为保持不变。

### <a id="agent-execution-preparation-compatibility"></a> Agent执行准备兼容性

`openclaw/plugin-sdk/sqlite-runtime.openOpenClawAgentSqliteWorkerStore`接受的执行对象保留了`v2026.10.1-beta.1`发布的`prepare(source, signal?) => Promise<void>`合约。现有的调用者和两个参数的实现仍然受到支持。发布源还接受 `v2026.9.9` 中提供的执行对象形状。 `v2026.10.1-beta.1` 形状在参数派生类型中保留其可调用的 `capturePreparedGenerationClaim` 方法；插件不需要内部原生采用功能。普通准备和主机准入重用已完成的本地生成及其已发布的架构事实。 `v2026.10.3` 中的两参数合约也没有变化。

`agent-execution-preparation-released-signature` 兼容性记录处于活动状态，没有弃用警告或需要迁移。违反已发布的合同需要单独批准和宣布的兼容性窗口。架构、存储的数据和更新行为保持不变。

### <a id="acp-metadata-binding-compatibility"></a> ACP 元数据绑定兼容性

`openclaw/plugin-sdk/acp-runtime` 保留了 `v2026.9.8` 中发布的单参数 `readAcpSessionEntryAsync` 可调用函数。返回的 ACP 管理器的 `loadSessionEntryAsync` 和 `upsertSessionMeta` 注入回调也保留其发布的单参数签名和 Promise 结果。插件不提供内部隐身参与者绑定。

`acp-session-metadata-released-signatures` 兼容性记录处于活动状态：这些 API 仍受支持，没有弃用警告或需要迁移。 Worker 激活必须保留它们；更改这些已发布的合同需要单独批准和宣布的兼容性窗口。

同步 `readAcpSessionEntry` 导出仍然可用于 `v2026.9.4` 合约，但已弃用。等待 `readAcpSessionEntryAsync` 读取现有工作线程。捆绑呼叫者已迁移。旧版使用会为每个插件发出一个 `DEP_PLUGIN_SDK` 警告，并为每个进程发出 ACP-session 系列；弃用发布后，将在稍后的稳定版本中删除。上述异步签名仍然受支持，且不会发出警告。这不会更改架构或存储的数据。

### <a id="memory-session-binding-compatibility"></a> 内存会话绑定兼容性

`openclaw/plugin-sdk/memory-core-host-engine-sessions` 保留在 `v2026.9.8` 中发布的读者：`buildSessionEntry(path, options?)`、`listSessionTranscriptCorpusEntriesForAgent(agentId, options?)` 和 `readSessionResetRecallCutoff(scope)`。他们的Promise结果和同步`onTranscriptMessage(message, observedAt)`观察者保持不变。内部隐身参与者源不是插件参数。

Corpus 发现接受 `options.config` 以使用调用者准备的配置和会话存储，而无需读取主机的全局运行时快照。内存核心通过此选项传递其管理器或梦想配置。省略它的调用者将继续使用准备好的主机运行时配置。

`memory-session-released-signatures` 兼容性记录处于活动状态。这些 API 仍然受支持，不会发出警告或需要迁移。

### <a id="session-upstream-link-writes"></a> Session 上游链接写入

`openclaw/plugin-sdk/session-catalog`保留了`v2026.9.8`中发布的同步`upsertSessionUpstreamLink`和`deleteSessionUpstreamLink`合约，包括它们的立即返回值和完成时间。生产专用的 `agent-harness-session-runtime` 初始化程序还保留了其用于发布的官方harness的同步 `prepare().link(input)` 方法。

`session-upstream-links-sync-persistence` 兼容性记录不推荐使用这些方法，并且遗留调用会发出有限的迁移警告。核心和捆绑调用者等待 `upsertSessionUpstreamLinkAsync`、`deleteSessionUpstreamLinkAsync` 或初始化程序的 `linkAsync`。同步合约将一直保留到稍后宣布的稳定版本和明确的维护者批准为止。请参阅 [await 会话上游链接 ](/plugins/sdk-migration/how-to-migrate#await-session-upstream-links)。

### <a id="native-session-generation-authority"></a> Native会话生成权限

生产私有`agent-harness-session-runtime`子路径保留了通过OpenClaw 2026.9.8.发布的官方harness包消耗的合约，`captureNativeSessionGenerationAuthority`仍然同步返回`state`、`previousSessionId`、`assertHostCurrent`和`assertCurrent`。 `resolveNativeSessionBinding` 仍然返回 `{ binding, assertCurrent }`，而 `NativeSessionGenerationOperations` 保留其两个参数 `adopt` 和 `reclaim` 回调。他们提供的断言在等待的操作之后继续检查持久会话沿袭。

当前harness代码等待 `retainNativeSessionGenerationAuthority`、`resolvePreparedNativeSessionBinding` 或 `reclaimNativeSessionGenerationWithAuthority`。解析器返回 `{ binding, authority, release }` 并等待其 `readBinding` 回调。最终效果和终端清理后释放捕获；借用的权限不会延长其生命周期。 `NativeSessionGenerationOperationsV2` 要求每个突变回调接受 `(expectedPreviousSessionId, authority)` 并将该权限携带到绑定存储中。使用`authority.withCurrent`进行同步原生动作准入；其普通`assertCurrent`仅检查生命周期。持久沿袭读取使用会话工作线程。

`resolveNativeSessionBindingWithAuthority` 也已弃用：它保留了已发布harness的同步 `readBinding` 回调。当绑定读取使用工作人员拥有的插件状态时，使用准备好的解析器。

这些旧方法共享有限制的 `native-session-binding` 弃用警告。它们将一直保留到稍后宣布的稳定版本、受支持的已发布官方工具阅读器的迁移以及明确的维护者批准为止。这可以在主机升级过程中保留已安装的harness，而无需将专用子路径扩展到公共 SDK。

### <a id="model-provider-result-compatibility"></a> 模型提供商结果兼容性

`openclaw/plugin-sdk/models-provider-runtime` 保留 `ModelsProviderData` 构造形状和 `v2026.7.1-2` 中发布的 `buildModelsProviderData` 返回签名，包括返回该形状的类型化适配器。这些合约将继续受到支持，直到明确批准的 SDK- 突破边界为止。

转发模型选择时调用`buildPreparedModelsProviderData`。其结果包括所需的 `modelCatalog` 以及所选的物理路由元数据。两个构建器都使用一个元数据生成器；调用者必须将准备好的行向前传送，而不是根据 ID 重建它们。

两个构建器都会返回当前发布的菜单行，而无需等待完全发现。当采集在后台继续进行时，结果可能是不完整的； `pendingProviders` 标识的提供商仍然令人耳目一新。保持已知的选项可用，并在重新打开菜单时再次调用构建器。等待菜单生成器并不能保证库存完整。当请求库存获取时，使用目录的显式刷新操作，而不是将菜单视为一个菜单。

对于所选模型，使用同一 SDK 子路径中的 `getModelsRuntimeChoices(data, provider, model)`。非空数组包含该模型的合格运行时选择。空数组意味着当前观察不允许该模型运行。 `undefined` 表示选择未知：模型没有观察，调用者提供了较旧的结果形状，或者 `data.isCurrent()` 报告准备好的所有者已退休。请勿将任何结果替换为提供程序默认值或从其名称推断的运行时。在再次选择之前，通过其所属目录刷新已停用的数据。

省略 `model` 将返回提供者的浏览联盟。该联合并不为提供程序中的每个模型授权运行时。浏览会话时将 `sessionEntry` 传递给构建器，以便其配置文件首选项、显式配置文件引脚和运行时覆盖参与选择。保留准备好的物理行并通过普通命令所有者重新验证选择；显示的选择不是使用退役一代或绕过会话锁的权限。

提供商插件可以通过 `prepareSyntheticAuth` 和 `nativeAuth: { runtime, mode }` 发布本机登录状态，其中 `mode` 是 `api-key`、`oauth` 或 `token`。这些事实仅适用于准备好的生成中的指定运行时。他们不提供提供商持有凭证或授权将凭证导入到 OpenClaw 配置文件中。可选的 `pluginRoot` 上下文来自插件加载器；使用它来解决该插件安装中声明的依赖关系。

### <a id="memory-session-inventory-readers"></a> 内存会话库存读取器

自 2026 年 10 月 1 日起，`openclaw/plugin-sdk/memory-core-host-engine-sessions` 中的 `loadArchivedSessions` 和 `resolveMemorySessionTargets` 已弃用。等待来自同一子路径的 `loadArchivedSessionsAsync` 和 `resolveMemorySessionTargetsAsync`。替换在保留的会话工作线程中运行持久存档和选择器读取，并保留选择、排序、丢失存储行为和结果形状。 Incognito 从会话参与者的内存后端读取使用已提交的事实。

捆绑的记忆搜索和记忆遗忘使用了期待已久的读者。同步导出为现有消费者保留其持久签名和行为，直到在稍后宣布的稳定版本中删除为止。弃用是通过 JSDoc 和兼容性注册表进行传达的，并且每个插件和阅读器系列都会发出一次运行时警告。保留的同步选择器仍然可以在调用线程上查询参与者行；它等待的替代品将这项工作保留在会话工作人员中。

内存条目、重置截止、语料库和选择器读取捕获隐身内存命名空间，包括没有显式参与者绑定的调用。缺失状态返回正常缺失结果，无需创建会话；关闭的句柄无法重新打开它。档案发现不会返回隐身的持久工件。私人转录本不会添加到持久内存摄取语料库中。

同步 `loadMemorySessionMetadata` 帮助程序已弃用。改为等待 `loadMemorySessionMetadataAsync` 和 `loadMemorySessionMetadataBatchAsync`；捆绑摄取解析现有历史工作者中的每个存储批次。同步帮助程序在弃用期内保留其签名，并可能在以后的版本中删除。主线程调用会针对每个插件发出一个共享内存会话弃用警告。批量成绩单统计现报价`readTranscriptStatsBatchReadOnlyAsync`； `session-store-runtime` 为个人转录本提供 `readTranscriptStatsAsync`。它们的同步前身保留它们的签名，直到稍后宣布稳定版本并警告主线程使用。工作线程本地统计内核保持同步。使用 `statSessionEntry` 获取等待的文件或转录本元数据。已弃用的 `statSessionEntrySync` 在主机上读取 SQLite 时会发出警告；提供准备好的转录本统计数据仍然是同步投影，无需访问数据库。同步存档和选择器读取器保留其 durable/offline 合同。隐身目标拒绝使用 `IncognitoSessionSyncAccessError` 进行同步存储访问：await `resolveMemorySessionTargetsAsync`、`loadArchivedSessionsAsync` 或 `buildSessionEntry`（如错误所指定）。工作线程快照内核和提供的转录统计信息保持同步。发布的持久同步全行会话 getter 保留其单独的兼容性约定。

### <a id="memory-read-missing-results"></a> 内存读取缺失结果

现在，内存管理器在成功摘录时返回 `status: "ok"`，在允许的文件丢失时返回 `status: "not_found"`。这可以使空文件和空范围与丢失的文件区分开来，而无需依赖分页元数据。

注册时，来自旧外部内存管理器的每个无状态结果都会保留其遗留的成功读取语义，并变为 `status: "ok"`，包括没有范围元数据的空结果。只有明确的 `status: "not_found"` 报告缺席。新的生产者必须发出丢失文件的状态；在宣布普通稳定删除版本之前，注册输入标准化仍然可用。

### <a id="runtime-config-snapshot-reads"></a> 运行时配置快照读取

`runtime-config-snapshot.getRuntimeConfig` 和 `memory-core-host-runtime-core.getRuntimeConfig` 保留其已发布的同步冷负载合约，但已弃用。使用 `readRuntimeConfig` 进行准备快照，或在冷准备边界等待 `captureRuntimeConfigAsyncReader()()`。旧版使用会针对每个插件和每个进程的运行时配置系列发出一个 `DEP_SESSION_PERSISTENCE` 警告。弃用发布后，将在稍后的稳定版本中删除。这不会更改存储的配置格式。

### <a id="config-record-migrations"></a> Config 记录迁移

使用 `openclaw/plugin-sdk/runtime-doctor-migrations` 中的 `mergeMissing(canonical, legacy)` 填充未定义的字段，而无需替换创作值。它填充现有的嵌套记录并保留编写的数组、空值和标量。缺失值通过引用分配；调用者拥有将迁移与其输入隔离所需的任何克隆。

帮助器会在合并的每个级别跳过未定义的源值和 `__proto__`、`prototype` 和 `constructor` 键。它不会递归地清理新分配的子树。

### <a id="plugin-state-migration-declarations"></a> Plugin状态迁移声明

捆绑的插件应列出 `openclaw.plugin.json` 中 `doctorContract.stateMigrations` 下的每个迁移，并从其医生合同工件中导出匹配的 `stateMigrations` 数组。保持 ID、顺序、`doctorOnly` 标志和阶段相同。只读 Doctor 规划使用候选捆绑描述符来记录确切的插件所有者，而无需加载插件。

安装的外部插件工件不是复制状态或候选内容标识的一部分。复制状态规划拒绝迁移，包括包含描述符数组的清单，直到候选验证单独绑定这些工件。遗留值 `true` 继续定位其非计划 Doctor 流的动态合约。

基于计划的迁移可以使用 `openclaw/plugin-sdk/runtime-doctor-migrations` 中的 `definePluginDoctorMigrationFromPlans(...)` 来保留现有的移动、复制、预览和插件状态导入行为。

迁移可能会提供只读 `collectBackupResources` 回调，包括通过 `definePluginDoctorMigrationFromPlans(...)`。返回类型为 `sqlite`、`file` 或 `directory` 的绝对路径，包括尚不存在的目标。切勿在清点期间打开可写存储或运行迁移。当 `requireLocalResources` 为 true 时，拒绝远程或未列出的数据，而不是将不完整的清单报告为完整。

恢复库存收集器会针对每个插件报告一个类型为 `undeclared-migration-resources` 的警告，而无需回调；其额外迁移资源无法核实。核心捕获的数据库状态仍然被覆盖。当迁移仅更改核心捕获状态或没有数据资源时，声明显式空列表。格式错误的申报和无效的库存仍然会失败。收集不会捕获或恢复数据、授权迁移或替换更新程序所需的捕获检查。

对于单文件导入，`defineLegacyJsonStateMigration(...)` 会跳过缺失的源 （`ENOENT`） 并使用 `null` 来评估插件解析器拒绝的值。其他读取错误和无效JSON达到Doctor检测或迁移警告；源保持不变，因此操作员可以修复它并重试。

对于 [ 支持的升级窗口 ](/gateway/doctor/config-migrations#retention-policy) 之外的格式，请使用同一外观中的 `defineRetiredPluginStateMigration({ id, label, intermediateVersion, findSources })`。该插件提供绝对候选路径或直接目录选择 `{ directory, prefix?, suffix }`；帮助器检查存在性而不解析或更改源字节。缺失的路径将被忽略；其他读取错误仍然失败。 Doctor 报告拒绝命名中间版本和保留文件。当桥需要除 Doctor 之外的所有者特定步骤时，提供 `recoveryInstructions`。其 `assertSupportedState(input, sources?)` 操作在运行时准入时应用相同的检查；已选择文件的调用者可以显式传递该路径。使用插件保留帐户和工作区发现。

当迁移需要修复会话所有权证据时，请使用 `phase: "after-session-repair"`。普通医生检测到这些迁移； `--fix` 在会话修复后在 SQLite 维护所有权下应用它们。上下文仅在隔离修复期间提供有界 `readPluginStateEntriesInKeyRange` 和 `readSessionIdentityEvidenceBatch` 读取，以及 `deletePluginStateEntriesIfUnchanged`。保留未知或不明确的所有权。仅删除观察到的原始行；维护结束后保留​​的回调不能授权以后的写入。

受信任的捆绑插件和官方插件还可以使用可选的 `inspectCronJobs` 和 `repairCronJobs` 上下文方法来进行显式 cron 迁移。检查是非创建的，并返回每个持久分区的原始定义、行 ID、排序、验证结果和存储键。 `repairCronJobs(inventory, changes)` 仅在离线修复期间可用：它保存经过验证的共享状态 SQLite 备份，重新检查当前权限和检查的定义，然后在一个事务中应用所有选定的替换或删除。替换保留行 ID、分区、排序和运行时状态。删除使用正常的 cron 暂存和授予清理。结果报告`changed`和保留的`backupPath`；无操作不会创建备份。插件对自己的历史作业进行分类并保留不明确的行。较旧的主机可能会忽略这些方法，因此迁移必须检查可用性。

这些帮助程序遵循 [native 插件信任模型](/plugins/architecture#execution-model)：符合条件的插件以主机权限和自己的历史作业分类运行。主机强制执行安装来源、脱机修复权限、未更改的定义、经过验证的备份和原子持久性。 API 不承诺相互不信任的本机插件之间的隔离。

设置入口的 `legacyStateMigrations` 选项和功能标志 `setupFeatures.legacyStateMigrations`、 `BundledChannelLegacyStateMigrationDetector` 以及 `ChannelPlugin.lifecycle.detectLegacyStateMigrations` 仍通过一个面向外部插件的 doctor 流水线适配器得到支持，但已被弃用。移除计划：仅当已发布插件读取方扫描确认不再有任何使用者后，才在 OpenClaw 2027.1 之后移除该适配器。

### <a id="authstorage-sqlite-migration"></a> AuthStorage SQLite 迁移

`await AuthStorage.forAgentAsync(agentDir)` 是主机会话存储的标准构造函数。它通过代理的 `openclaw-agent.sqlite` 身份验证配置文件行保留提供程序默认凭据，并且从不创建 `auth.json`。 Harness 插件接收准备好的存储实例，名称为 `params.authStorage`。

`AuthStorage.create(authPath)` 仍然作为现有插件的命名已弃用适配器。该路径仅用于派生所属代理目录；适配器读取和写入 SQLite，而不是指定的 JSON 文件。立即迁移到 `await AuthStorage.forAgentAsync(...)`。取路形式发出 `AUTH_STORAGE_CREATE_DEPRECATED`。 10 月初的审核条件被通用同步 SQLite 兼容窗口取代：最终兼容日为 2026 年 12 月 31 日，在 2027 年 1 月第一个稳定版本中删除，并且没有插件 SDK 主要版本。

`FileAuthStorageBackend` 是内部 SQLite- 支持的适配器，而不是导出的插件 SDK 后端。它不可用作来自 `openclaw/plugin-sdk/agent-sessions` 的命名导入。 Harness插件应使用主机准备的`params.authStorage`；构建存储的主机代码应使用 `await AuthStorage.forAgentAsync(agentDir)`。内部适配器发出 `FILE_AUTH_STORAGE_BACKEND_DEPRECATED` 并且从不读取或写入旧文件。其内部弃用窗口不保留以前的 SDK 导入。

### <a id="auth-display-path-compatibility"></a> Auth 显示路径兼容性

公共物理数据库路径显示将在 2026 年 12 月 31 日后停用。外部插件应显示 provider/profile 标识符； `resolveAuthStorePathForDisplay` 没有公共异步替代品。

捆绑插件可以等待来自私有 `openclaw/plugin-sdk/agent-sessions` 表面的 `AuthStorage.resolvePathForDisplayAsync`。与已弃用的同步帮助程序一样，当该身份验证存储存在时，它会选择代理本地数据库，否则选择共享存储。 `resolveProviderAuthProfileMetadataAsync` 返回 profile/account 标识符，而不是选定的数据库路径，因此它不是等效替换。

捆绑的 Hermes 迁移在身份验证和秘密预览目标 （`database-path#profileId`） 中使用了这种区别，包括尚不存在的配置文件。源调用者为`extensions/migrate-hermes/auth.ts`和`extensions/migrate-hermes/secrets.ts`； `src/agents/auth-profiles/paths-direct-import.test.ts` 涵盖了选定商店行为。私有静态方法使用规范等待的解析器，无需构造 `AuthStorage` 或加载凭据。同步助手在 2026 年 12 月 31 日之前保持兼容，并在 2027 年 1 月的第一个稳定版本中被删除。

如果某个清单字段仍被接受，请继续使用它，直到文档和诊断信息另行说明。新代码应优先使用文档中说明的替代方案； 现有插件不应在正常的小版本发布期间被破坏。

过时的兼容性注册表还跟踪不属于一个旧子路径的已发布注释。除非下面列出了较晚的日期，否则这些记录使用 2026 年 10 月 1 日作为最早审核日期；删除仍然需要最后一列中的读者条件。 10 月 1 日的家庭是 `removal-pending`，而这些迁移尚未得到验证；他们原来的日期没有改变。

| 兼容性代码                                | 替代方案                                                       | 移除条件                                                                                                    |
| ------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk-broad-runtime-barrels`                | 专用能力子路径                                       | 不再存在对七个列举的宽泛 barrel 的捆绑或已发布导入。                                        |
| `plugin-sdk-provider-owned-helper-shims`          | 提供商本地 auth/model/replay/OAuth/stream API                | 每个枚举的帮助程序都会迁移到官方提供程序中，并且不会出现在已发布的插件中。                         |
| `message-presentation-legacy-bridges`             | `MessagePresentation` 和频道展示渲染器          | 生产方和官方频道包不再生成或读取旧版交互式回复。                           |
| `plugin-sdk-focused-compat-aliases`               | 每个 `@deprecated` 注解中指定的专用替代方案    | 每个列举的别名都不再有任何捆绑或已发布的读取方。                                                       |
| `agent-harness-terminal-result-aliases`           | `AgentHarnessAttemptResult.terminal` 和 `visibleReplies`         | Harness 插件不再读取旧版终端布尔值或 `sourceVisibleReplies`。                                   |
| `official-plugin-export-aliases`                  | 演示渲染器和主机拥有的 Discord 超时行为    | 最低支持版本的官方插件包不再导入这些别名。                                             |
| `memory-host-compatibility-aliases`               | 当前内存 cache/FTS 表                                   | 支持的工件不再传递表覆盖，并且遗留表数据仍然保留。                         |
| `plugin-runtime-api-compat-aliases`               | 命名空间插件 API 和重点运行时方法                | 所有枚举的平面 API/runtime 别名都没有读取器。                                                             |
| `plugin-provider-manifest-compat-aliases`         | Manifest拥有的kind/setup元数据和模型目录注册 | 提供者不再发布运行时类型或旧目录挂钩。                                                    |
| `agent-harness-credential-prompt-string-argument` | 选项对象 `{ controlToolsAvailable }`                        | 已弃用并于 2026 年 9 月 9 日开始发出警告；支持至 2026 年 11 月 30 日。一旦调用者迁移，请在该日期之后删除。 |

已弃用的 GitHub Copilot 令牌交换导出已从 `provider-auth` 中删除：`DEFAULT_COPILOT_API_BASE_URL`、`deriveCopilotApiBaseUrlFromToken`、`resolveCopilotApiToken` 和 `CachedCopilotToken`。 GitHub Copilot插件拥有身份验证和帐户端点解析；提供商集成应使用其注册的身份验证挂钩，而不是已停用的 `/v2/token` 交换。 `normalizeGithubCopilotDomain` 仍然可用。

在更新主机之前更新导入已删除导出的插件。此删除不会重写凭据、删除现有缓存条目或更改当前 GitHub Copilot 插件的身份验证流程。

2026 年 7 月的 `@openclaw/codex` 插件仍支持已弃用的 `sourceVisibleReplies` 交付默认值。迁移到 [`deliveryDefaults.visibleReplies`](/plugins/sdk-agent-harness/sessions-and-results#harness-delivery-defaults)。已发布的插件检查必须包括受支持的旧版本：更新可以保留旧的或链接的插件包。

八个已弃用的流和重放挂钩常量已被删除。使用 `provider-stream-family` 中的 `buildProviderStreamFamilyHooks` 或 `provider-model-shared` 中的 `buildProviderReplayFamilyHooks` 构建相同的钩子：

| 删除常数                   | 构造函数参数               |
| ---------------------------------- | ---------------------------------- |
| `GOOGLE_THINKING_STREAM_HOOKS`     | `"google-thinking"`                |
| `KILOCODE_THINKING_STREAM_HOOKS`   | `"kilocode-thinking"`              |
| `MINIMAX_FAST_MODE_STREAM_HOOKS`   | `"minimax-fast-mode"`              |
| `OPENAI_RESPONSES_STREAM_HOOKS`    | `"openai-responses-defaults"`      |
| `OPENROUTER_THINKING_STREAM_HOOKS` | `"openrouter-thinking"`            |
| `TOOL_STREAM_DEFAULT_ON_HOOKS`     | `"tool-stream-default-on"`         |
| `ANTHROPIC_BY_MODEL_REPLAY_HOOKS`  | `{ family: "anthropic-by-model" }` |
| `OPENAI_COMPATIBLE_REPLAY_HOOKS`   | `{ family: "openai-compatible" }`  |

`provider-stream` 和 `provider-stream-family` 中的流常量均被删除。在更新主机之前更新导入它们的插件。构造函数保留其现有行为；此删除不会更改存储的配置、凭据或会话数据。

`MOONSHOT_THINKING_STREAM_HOOKS` 保留在已发布的 Moonshot 提供程序的两个流子路径上。对于已发布的 Anthropic Vertex 和 Kilocode 提供程序，`NATIVE_ANTHROPIC_REPLAY_HOOKS` 和 `PASSTHROUGH_GEMINI_REPLAY_HOOKS` 保留在 `provider-model-shared` 上。他们的 `2026.7.1` 和 `2026.7.33` 到 `2026.7.35` 包仍然导入这些名称。新代码首选构造函数，但这些别名保留其依赖于读者的删除条件。

未使用的私有内存主机 `loadConfig` 重新导出已被删除。内存实现使用 `readRuntimeConfig` 或调用者提供的配置；冷入口点等待 `captureRuntimeConfigAsyncReader()()`。自定义表迁移行为保持不变。

### <a id="published-channel-setup-compatibility"></a> 已发布频道设置兼容性

通过 `2026.7.1` 发布的 Slack、Discord、Signal 和 Microsoft Teams 软件包从 `openclaw/plugin-sdk/bundled-channel-config-schema` 导入特定于通道的配置架构。已发布的 Slack 和 Discord 软件包还从 `openclaw/plugin-sdk/setup-runtime` 导入 `createLegacyCompatChannelDmPolicy` 和 `promptLegacyChannelAllowFromForAccount`。

这些导出仍作为已弃用的运行时兼容适配器提供。新的及重新发布的插件应在本地维护其配置架构和设置策略，并使用 `channel-config-schema` 和 `setup-runtime` 中的通用基础原语。只有在最低支持的已发布软件包版本不再导入这些导出后，才能移除这些兼容性导出。

### <a id="channel-setup-input-field-compatibility"></a> 频道设置输入字段兼容性

`ChannelSetupInput` 现在只永久保留跨频道设置信封的类型。频道特定字段仍在已弃用的兼容层中保留类型，以便现有外部插件继续编译，同时插件作者将这些字段迁移到插件本地的设置输入类型中。

OpenClaw 不发布大版本。2026-07-22 的注册表扫描检查了 426 个已发布的树外频道插件，并移除了 21 个没有读取方的字段。保留的 22 个字段各自都有已知的已发布读取方。之后，只要没有已发布插件读取某个字段，就会立即删除该字段；随着插件作者迁移到插件本地的设置输入类型，保留字段集合会逐渐缩小。

同一次扫描还移除了 23 个没有已发布依赖方的旧版未声明适配器提升键。六个常用键和仅用于设置的 `rooms` 键仍然保留。随着已发布插件声明 `singleAccountKeysToMove`，该集合也会逐渐缩小。

共享类型没有索引签名。插件自有的键仍然可以存在于运行时输入对象中；请在插件本地的交叉类型中声明这些键，或通过所属插件的设置 schema 对其进行收窄。

| `code`                                  | `owner`   | `replacement`                                                                                    | 移除条件                                                     |
| --------------------------------------- | --------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `plugin-sdk-channel-setup-input-fields` | `channel` | 将 `ChannelSetupInput` 与声明所属频道字段的插件本地类型进行交叉组合 | 已发布插件注册表扫描中没有读取方时删除字段 |

旧版未声明适配器提升层遵循相同的读取方驱动策略。请声明 `singleAccountKeysToMove`；如果插件不需要额外的提升键，也要声明一个空数组，以便共享回退机制能够逐个键地退役。

#### <a id="verifying-readers"></a> 验证读取方

1. 对每个 `nextCursor` 翻阅 `https://clawhub.ai/api/v1/packages?family=code-plugin&limit=100`，并保留 `categories` 包含 `channels` 的包。
2. 从 `npm search --json --searchlimit=1000 "openclaw channel plugin"` 添加 npm 候选项。通过 GitHub 代码搜索 `openclaw/plugin-sdk/channel-setup`、`openclaw/plugin-sdk/setup` 和 `openclaw/plugin-sdk/core` 添加仅源代码候选项。
3. 解决每个候选者的最新发布版本。运行 `npm pack <package>@<version> --json --pack-destination <temp-dir>`，解压它，然后检查已发货的 `dist`、JavaScript 以及直接或解构字段读取的声明。当软件包没有 npm 版本时，下载 ClawHub 工件。
4. 记录包、版本、字段或提升键，以及匹配的文件。只有当没有任何已发布插件制品读取某个字段或键时，才可以删除它。保持代码中保留字段和键列表旁的读取方名称与扫描结果同步。

这只是 source/type 兼容性记录。注册表项具有 `removeAfter: 2026-10-01`，但安装输入运行时对象和行为未更改。开始审核的日期；每个字段都会保留，直到其已发布的工件读者计数为零。

使用 `pnpm plugins:boundary-report` 审查当前迁移队列：

| 标志                                                    | 作用                                                                                             |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `--summary` (or `pnpm plugins:boundary-report:summary`) | 紧凑的计数而不是完整的细节。                                                             |
| `--json`                                                | 机器可读的报告。                                                                           |
| `--owner <id>`                                          | 筛选到一位兼容性所有者。                                                                 |
| `--fail-on-eligible-compat`                             | 对于从 `removeAfter` 后一天 00：00 UTC 开始的日期 `deprecated` 记录，退出非零。 |

`pnpm plugins:boundary-report:ci` 运行时带有兼容性失败标志。对于注明日期的 `deprecated` 记录，`removeAfter` 是最终兼容日：`2026-09-01` 在 `2026-09-02T00:00:00Z` 时（而不是 9 月 1 日开始）变得符合资格。`removal-pending` 记录是单独的：它们将于 00：00 UTC 上进行审核。 `removeAfter` 日期并与阻止程序一起报告，但不会触发此失败标志。两个州都没有授权自动删除。

已弃用的异步迁移记录使用 `stable-deprecation-period`，而所属维护者则准备普通的稳定发布窗口。在最终兼容性日期获得批准和公布之前，不要设置 `removeAfter`。此门或仅弃用源代码均不授权删除；替换和弃用必须首先在稳定中发货。没有任何字段的记录显示为 `no-date` 并且仍然不符合条件。该报告显示日期或命名门，计算本地 code/doc 引用，列出 `removal-pending` 记录及其阻止程序和表面令牌读取器引用，并总结私有内存主机 SDK 桥。这些读者参考是分类信号，而不是已发布的工件证明。

### <a id="tts-preference-resolution"></a> TTS 偏好分辨率

等待来自 `openclaw/plugin-sdk/agent-runtime` 或 `openclaw/plugin-sdk/tts-runtime` 的 `resolveTtsPrefsPathAsync(config)` 通过共享状态读取器解析机器拥有的首选项路径。显式配置和环境路径保留其优先级。主机提示、状态、命令和语音准备通过其现有操作携带已解决的首选项，而不是重新打开状态存储。

已发布的 `resolveTtsPrefsPath(config)` 调用仍同步返回 `string`，但已弃用，并在需要旧解析时发出有限警告。它仅使用异步所有者已经承认的机器路径；在准备之前，在检查显式配置和环境后，它会回退到默认路径。它永远不会打开 SQLite，并且进程内机器状态写入会更新其承认的路径。 `buildTtsSystemPromptHint(config, agentId, options)` 保留其同步返回值；主机传递准备好的首选项以使其免受状态存储读取。当未提供任何首选项时，异步 `maybeApplyTtsToPayload` 调用将继续准备首选项。

`tts-preferences-sync-resolution` 兼容性记录保留已发布的签名，直到宣布以后的稳定版本、已发布插件阅读器的迁移以及明确的维护者批准为止。首选项文件、存储的数据和更新行为保持不变。

### <a id="media-legacy-projection"></a> 媒体旧版投影

`media-legacy-projection` 兼容性记录涵盖旧的并行媒体字段、有效负载构建器、挂钩元数据别名和媒体模板名称。其批准的 `removeAfter` 日期为 **2026-10-01**（事实优先替换件发货后的两个发布系列）。删除还需要彻底清除已发布的插件工件。该记录现在为 `removal-pending`，并保留原始日期，直到证明完成。

未使用的 `buildChannelTurnMediaPayload` 别名已从 `openclaw/plugin-sdk/channel-inbound` 中删除。其主要 `buildChannelInboundMediaPayload` 导出仍然可用于上面的兼容性窗口。新的入口代码应该直接传递有序的媒体事实。

对于通道入口，替换 singular/plural `MediaPath`、`MediaUrl`、`MediaType`、`MediaPaths`、`MediaUrls`、`MediaTypes`、`MediaTranscribedIndexes`、`MediaWorkspaceDir` 和`MediaStaged` 与有序事实：

```ts
import { toInboundMediaFacts } from "openclaw/plugin-sdk/channel-inbound";

const media = toInboundMediaFacts([
  { path: saved.path, url: nativeUrl, contentType: saved.contentType, messageId },
]);

const ctx = finalizeInboundContext({ Body: caption, media });
```

在 `inbound_claim` 和 `message_received` 挂钩中使用 `event.media`。如果远程媒体未在本地暂存，则对 identity/diagnostics 使用 `event.originalMedia` 并等待 `event.media`； `event.mediaStagingPending` 区分该状态。不要从 `event.metadata` 读取已弃用的 singular/plural 属性。

对于 CLI 媒体模型，将 `{{MediaPath}}`、`{{MediaUrl}}`、`{{MediaType}}` 和 `{{MediaDir}}` 替换为 `{{AttachmentPath}}`、`{{AttachmentUrl}}`、 `{{AttachmentContentType}}` 和 `{{AttachmentDir}}`。当附件位置很重要时，使用 `{{AttachmentIndex}}`。

对于本地介质读取策略，从 `openclaw/plugin-sdk/media-local-roots` 导入 `getAgentScopedMediaLocalRoots(...)` 或 `getAgentScopedMediaLocalRootsForSources(...)`。 `openclaw/plugin-sdk/agent-media-payload` 立面及其 `buildAgentMediaPayload(...)` 投影已弃用。

### <a id="cron-store-path-resolution"></a> Cron存储路径解析

在呼叫 `loadCronStore` 或 `saveCronStore` 之前，等待来自 `openclaw/plugin-sdk/cron-store-runtime` 的 `resolveCronStorePathAsync(storePath?)`。解析器通过共享状态worker读取机器拥有的cron分区；显式路径仍然优先。

`cron-store-sync-path` 兼容性记录保留 `resolveCronStorePath(storePath?)` 及其同步返回值，直到以后的稳定版本。旧版调用会针对每个插件和功能系列发出一个有界 `DEP_PLUGIN_SDK` 警告。存储的 cron 数据、分区选择和更新行为保持不变。

### <a id="session-transcript-search-views"></a> 会话记录搜索视图

准备转录搜索视图时，等待来自 `openclaw/plugin-sdk/session-transcript-hit` 的 `loadCombinedSessionStoreForGatewayAsync(config, options)`。它通过现有数据库工作人员读取相同的完整会话条目并排除隐身会话。

同步 `loadCombinedSessionStoreForGateway(config, options)` 保持已安装插件的返回形状并发出有限的弃用警告。捆绑插件使用异步替换。同步导出计划在以后的稳定版本中删除。

### <a id="web-search-provider-lists"></a> Web 搜索提供商列表

列出可用的网络搜索提供商时，请等待 `runtime.webSearch.listProvidersAsync({ config })`。在应用现有的提供者选择规则之前，它通过共享状态工作人员准备机器拥有的发现策略。

同步 `runtime.webSearch.listProviders({ config })` 保持已安装插件的返回形状，并为每个插件和功能系列发出一个有界 `DEP_PLUGIN_SDK` 警告。它计划在弃用后在稍后的稳定版本中删除。本机同步发现仍为离线CLI/Doctor准备和此兼容方法；网关网络搜索准备使用异步所有者。
