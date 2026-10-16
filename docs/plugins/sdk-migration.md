---
summary: "从旧版向后兼容层迁移到现代插件 SDK"
title: "插件 SDK 迁移"
sidebarTitle: "迁移到 SDK"
read_when:
  - "您在 OpenClaw 之前使用过 api.registerEmbeddedExtensionFactory 2026.4.25"
  - "正在将插件更新到现代插件架构"
  - "维护外部 OpenClaw 插件"
---

OpenClaw 用由小型、专注的导入构建的现代插件架构，替代了庞大的向后兼容层。如果你的插件早于这一变更，本指南将帮助你迁移到当前的契约。

对于同步SQLiteAPI，使用[完整的异步迁移指南](/plugins/sdk-migration/sqlite-async)。最终兼容日是**2026-12-31**；清除船舶在**第一月2027稳定发布**，没有插件SDK主要版本。这些表格涵盖了每个受影响的成员及其等待或准备的替代成员。

## <a id="what-changed"></a> 改变了什么

过去，一些过于宽泛的导入入口允许插件从单个入口访问几乎所有内容：

- **`openclaw/plugin-sdk`** 和 **`openclaw/plugin-sdk/compat`** - 在构建重点 SDK 时重新导出数十个助手。现在两个根都被移除了。相反，导入记录的子路径。
- **`openclaw/plugin-sdk/infra-runtime`** - 一个宽泛的聚合模块，混合了系统事件、心跳状态、投递队列、fetch/proxy 辅助函数、文件辅助函数、 审批类型以及其他无关工具。
- **`openclaw/plugin-sdk/config-runtime`** - 删除了广泛的配置桶，包括其已弃用的直接 `loadConfig` 和 `writeConfigFile` 导出。
- **`openclaw/plugin-sdk/channel-lifecycle`**、**`channel-message`** 和 **`channel-reply-pipeline`** - 删除了通道兼容性外墙。使用重点出站和入站合同，检查每个指定的导出。
- **`openclaw/extension-api`** - 一个已移除的桥接层，使插件可以直接访问主机侧辅助函数，例如内嵌代理运行器。
- **`api.registerEmbeddedExtensionFactory(...)`** - 已删除的仅限嵌入式运行器的挂钩，用于观察嵌入式运行器事件，例如 `tool_result`。请改用代理工具结果中间件（请参阅 [将嵌入式工具结果扩展迁移到中间件](/plugins/sdk-migration/how-to-migrate#how-to-migrate)）。

根 SDK、兼容桶、扩展桥、嵌入式扩展工厂和五个 channel/config/infrastructure 兼容外观已被删除。后者的退休于 2026 年 9 月 30 日获得了 SDK-owner 的明确批准；请参阅 [ 删除时间表 ](/plugins/sdk-migration/removal-timeline)。

<Warning>
  导入已删除的 SDK 或扩展表面的插件不再加载。升级前请遵循 [ 导入路径映射](/plugins/sdk-migration/import-paths)。
</Warning>

OpenClaw 不会在引入替换的同一更改中删除或重新解释记录的插件行为。破坏性合同变更首先要经过兼容性适配器、诊断、文档和弃用窗口。这适用于 SDK 导入、清单字段、设置 API、挂钩和运行时注册行为。

`ChatCommandDefinition.category` 保留 2026.8.1 SDK 接受的 `"docks"` 值。命令列表在 **Tools** 下显示这些旧定义。该类别不启用通道对接或恢复已停用的对接命令。新定义应使用 `"tools"`。

捆绑的 ACP 集成应等待来自本地 `openclaw/plugin-sdk/acp-runtime` 外观的 `readAcpSessionEntryAsync` 进行会话元数据读取。该外观仍然是 JavaScript 兼容性导出；它的声明被排除在类型 public SDK 之外。文件支持的读取在 SQLite 工作线程上运行，并在整个元数据连接过程中保留会话生命周期。文件支持的结果是分离的快照，包括提供 `clone: false` 时。返回的 `storeReadFailed` 标志仍然可以区分不可读的会话存储和丢失的元数据；设置该标志时，启动清理必须保留绑定。未绑定的旧 ACP 元数据仍然可以伴随该标志；它不验证会话行。源退休和工作人员故障拒绝读取，并且不得将其视为缺席会话。

`v2026.9.4` 中提供的同步 `readAcpSessionEntry` 和 `getAcpSessionManager().resolveSession()` 合约仍然可用于持久会话，但不推荐用于运行时使用。隐身目标拒绝使用 `IncognitoSessionSyncAccessError` 进行同步访问；请改用 `readAcpSessionEntryAsync` 和 `getAcpSessionManager().resolveSessionAsync()`。异步路径获取现有内存会话参与者，并通过共享状态工作线程加入全局 ACP 元数据。它不会创建丢失的隐身会话。

Discord 和 Telegram 启动清理将 `prepareAcpSessionEntryRead` 用于隐身目标。其准备好的读取器保留选定的内存所有者，并通过条件绑定删除来携带当前调用者权限。关闭会话即结束该权限；清理不会重新打开已停用的本机隐身数据库。

通过本地 `openclaw/plugin-sdk/acp-runtime` 外观暴露的 `IncognitoSessionEndedError` 和 `IncognitoSessionSyncAccessError` 必须通过清理和状态探测进行传播。在将其他故障视为缺席会话或不确定探测之前使用 `rethrowIncognitoSessionError(error)`；它还识别嵌套拒绝。已弃用的持久会话同步合约在 2026 年 12 月 31 日之前仍然可用，并在 2027 年 1 月的第一个稳定版本中被删除。

### <a id="session-and-command-preparation"></a> 会话和命令准备

使用`getSessionEntryAsync`， `readSessionUpdatedAtAsync`， `getConversationSessionAsync`， `readAmbientTranscriptWatermarkAsync`， `loadTranscriptEvents`， 和`readTranscriptStatsAsync`从`openclaw/plugin-sdk/session-store-runtime`用于普通会话读取。运行时等效为`api.runtime.agent.session.getSessionEntryAsync`。这些操作读取现有的会话工作线程并观察提交的进程内写入。仍然缺少条目`undefined`；读取失败会传播。`loadTranscriptEventsSync`和`readTranscriptStatsSync`已弃用；他们期待的替代品保留有序事件和转录统计数据，同时保持网关线程的持久读取。

等待 `UserTurnTranscriptRecorder.completeProcessingAsync(outcome)` 通过其会话所有者来解决已接受的输入。已弃用的 `completeProcessing` 方法保留同步完成，并在最终结果提交后返回，并显示迁移警告，直至 2026 年 12 月 31 日。没有接受输入的记录器保留其现有的无操作行为。

使用 `openclaw/plugin-sdk/session-transcript-runtime` 中的 `readSessionTranscriptCatalogTitleAsync` 作为目录标题。同步 `readSessionTranscriptCatalogTitle` 在 2026 年 12 月 31 日之前仍然被弃用。

准备本机命令时，请使用 `openclaw/plugin-sdk/command-auth-native` 中的 `resolveStoredModelOverrideAsync` 和 `resolveCommandArgMenuAsync`。 `resolveCommandArgMenuAsync` 也由 `openclaw/plugin-sdk/native-command-registry` 导出。继承模型加载器可能会返回一个承诺；直接覆盖仍然不需要父级读取。菜单准备在返回其选择之前读取当前会话的详细设置。

不推荐使用相应的同步 API 进行普通运行时使用。已发布的签名在 2026 年 12 月 31 日之前仍受支持。新的旧版调用会发出有限的弃用警告。捆绑的调用者使用等待的操作；最终工具、披露和突变权限检查保留其当前所有者和时间安排。

要获得完整的跨会话商店视图，请等待 `openclaw/plugin-sdk/session-transcript-hit` 的 `loadCombinedSessionStoreForGatewayAsync`。它在通过现有数据库工作线程读取持久存储时保留完整的会话条目并排除隐身会话。同步`loadCombinedSessionStoreForGateway`保留其返回值并发出有界弃用警告；到 2026 年 12 月 31 日为止，它仍然受到支持。

### <a id="native-session-lineage"></a> Native 会话沿袭

使用 `openclaw/plugin-sdk/agent-harness-session-runtime` 中的 `resolvePreparedNativeSessionBinding` 或 `retainNativeSessionGenerationAuthority` 在会话工作线程中准备沿袭。两者都返回一个拥有的捕获：在最后一个效果和任何终端清理之后调用 `finally` 中的 `release()` 。重复的权限检查使用会话所有者发布的事实并立即拒绝撤销的沿袭。

当清理需要自己的生命周期检查时，请使用 `authority.withLiveness(assertCurrent)`。这借用了相同的来源；它不会延长捕获的生命周期。当没有存储的会话沿袭时，使用 `createNativeSessionBindingScope`。已发布的 `createNativeSessionBindingAuthority`、`combineNativeSessionBindingAuthority`、`prepareNativeSessionGenerationAuthority` 和 `resolveNativeSessionBindingWithAuthority` 合约仍然可用，但已弃用。他们的同步阅读器是兼容路径；捆绑harness使用准备好的API。

### <a id="exec-approval-reads"></a> Exec 批准读取

等待来自 `openclaw/plugin-sdk/exec-approvals-runtime` 的 `loadExecApprovalsReadOnlyAsync` 或 `readExecApprovalsSnapshotAsync`。两者都使用现有的共享状态读取工作线程。同步 `loadExecApprovals` 和 `readExecApprovalsSnapshot` 导出将在 2026 年 12 月 31 日之前保留其签名，发出有限弃用警告，并计划在 2027 年 1 月的第一个稳定版本中删除。捆绑的运行时调用者使用等待的读取。执行所有者仍然会在命令执行前立即使用已提交的进程内策略发布来检查当前的批准策略；最终检查不会查询 SQLite。

### <a id="session-reset-freshness"></a> 会话重置新鲜度

通道运行时使用者在决定会话是否需要重置时应等待 `runtime.channel.session.resolveEntryResetFreshnessAsync(...)`。文件支持的条目和副本生命周期时间戳是从同一工作快照中读取的，并通过验证和清理保留原始数据库所有者。 `v2026.9.8` 中提供的同步 `resolveEntryResetFreshness(...)` 方法仍然可供现有的 JavaScript 使用者使用，并且已弃用运行时使用；移除将于 2026 年 12 月 31 日兼容性截止后的 2027 年 1 月第一个稳定版本中发布。两种方法都保留现有的重置策略和进程保持的隐身​​行为。

### <a id="why"></a> 原因

- **启动缓慢** - 导入一个辅助函数会加载数十个无关模块。
- **循环依赖** - 宽泛的重新导出很容易导致创建导入循环。
- **API 表面不清晰** - 无法判断哪些导出是稳定的，哪些是内部的。

类型化的公共 SDK 被组织成具有记录合同的重点子路径。并非每个 SDK 构建入口点都是公共插件 API。

捆绑渠道的传统提供商便利接口也消失了 - 渠道品牌的帮助快捷方式是私人单一存储库便利，而不是稳定的插件合同。请改用窄通用 SDK 子路径。在捆绑的插件工作区中，将提供者拥有的助手保留在该插件自己的 `api.ts` 或 `runtime-api.ts` 中：

- Anthropic 将 Claude- 特定的流助手保留在其自己的 `api.ts` / `contract-api.ts` 接口中。
- OpenAI 将提供商构建器、默认模型辅助函数以及实时提供商构建器保留在自己的 `api.ts` 中。
- OpenRouter 将提供程序构建器和 onboarding/config 帮助程序保留在其自己的 `api.ts` 中。

## <a id="where-each-topic-lives"></a> 每个主题所在的位置

单页版本的每个部分都位于下面六页之一。单页版本中的锚点仍然在这里解析。

### <a id="migration-steps"></a> 迁移步骤

[如何迁移插件](/plugins/sdk-migration/how-to-migrate) — 有序的迁移步骤。

- [等待个人模型-账户操作](/plugins/sdk-migration/how-to-migrate#await-personal-model-account-operations)
- [等待会话记录持久性](/plugins/sdk-migration/how-to-migrate#await-session-transcript-persistence)
- [等待扩展会话更改](/plugins/sdk-migration/how-to-migrate#await-extension-session-changes)
- [等待提供商重播元数据](/plugins/sdk-migration/how-to-migrate#await-provider-replay-metadata)
- <a id="how-to-migrate"></a>[如何迁移](/plugins/sdk-migration/how-to-migrate#how-to-migrate)
- <a id="migrate-runtime-config-load%2Fwrite-helpers"></a>[迁移运行时配置 load/write 帮助程序](/plugins/sdk-migration/how-to-migrate#migrate-runtime-config-load%2Fwrite-helpers)
- <a id="migrate-embedded-tool-result-extensions-to-middleware"></a>[将嵌入式工具结果扩展迁移到中间件](/plugins/sdk-migration/how-to-migrate#migrate-embedded-tool-result-extensions-to-middleware)
- <a id="migrate-approval-native-handlers-to-capability-facts"></a>[将审批本机处理程序迁移到功能事实](/plugins/sdk-migration/how-to-migrate#migrate-approval-native-handlers-to-capability-facts)
- <a id="audit-windows-wrapper-fallback-behavior"></a>[审核 Windows 包装器回退行为](/plugins/sdk-migration/how-to-migrate#audit-windows-wrapper-fallback-behavior)
- <a id="find-deprecated-imports"></a>[查找已弃用的导入](/plugins/sdk-migration/how-to-migrate#find-deprecated-imports)
- <a id="replace-with-focused-imports"></a>[替换为重点进口](/plugins/sdk-migration/how-to-migrate#replace-with-focused-imports)
- <a id="replace-broad-infra-runtime-imports"></a>[替换广泛的`infra-runtime`进口](/plugins/sdk-migration/how-to-migrate#replace-broad-infra-runtime-imports)
- <a id="migrate-channel-route-helpers"></a>[迁移通道路由助手](/plugins/sdk-migration/how-to-migrate#migrate-channel-route-helpers)
- <a id="build-and-test"></a>[构建和测试](/plugins/sdk-migration/how-to-migrate#build-and-test)

### <a id="import-paths"></a> 导入路径

[导入路径引用](/plugins/sdk-migration/import-paths) — 类型化公共子路径替换每个旧导入。

- <a id="import-path-reference"></a>[导入路径参考](/plugins/sdk-migration/import-paths#import-path-reference)
- <a id="retained-channel-facade-mappings"></a>[已删除通道立面映射](/plugins/sdk-migration/import-paths#retained-channel-facade-mappings)

### <a id="removed-surfaces-and-replacements"></a> 删除的表面和替换

[删除的表面和替换](/plugins/sdk-migration/removed-surfaces) - 删除的内容以及每个旧版API的替换。

- <a id="removed-compatibility-surfaces"></a>[已删除的兼容表面](/plugins/sdk-migration/removed-surfaces#removed-compatibility-surfaces)
- <a id="process-global-api-provider-publication"></a>[Process-global API-提供商出版物](/plugins/sdk-migration/removed-surfaces#process-global-api-provider-publication)
- <a id="deactivate-hook-alias"></a>[停用挂钩别名](/plugins/sdk-migration/removed-surfaces#deactivate-hook-alias)
- <a id="private-testing-barrel"></a>[专用测试桶](/plugins/sdk-migration/removed-surfaces#private-testing-barrel)
- <a id="migration-reference"></a>[迁移参考](/plugins/sdk-migration/removed-surfaces#migration-reference)
- <a id="command-auth"></a>[`command-auth` 帮助构建者 -> `command-status`](/plugins/sdk-migration/removed-surfaces#command-auth-help-builders-command-status)
- <a id="mention"></a>[提及门控助手 -> `resolveInboundMentionDecision`](/plugins/sdk-migration/removed-surfaces#mention-gating-helpers-resolveinboundmentiondecision)
- <a id="channel-runtime-shim-and-channel-actions-helpers"></a>[通道运行时填充程序和通道操作帮助程序](/plugins/sdk-migration/removed-surfaces#channel-runtime-shim-and-channel-actions-helpers)
- <a id="web"></a>[Web 搜索提供程序 `tool()` 帮助程序 -> 插件上的 `createTool()`](/plugins/sdk-migration/removed-surfaces#web-search-provider-tool-helper-createtool-on-the-plugin)
- <a id="plaintext"></a>[明文通道信封 -> `BodyForAgent`](/plugins/sdk-migration/removed-surfaces#plaintext-channel-envelopes-bodyforagent)
- <a id="subagent-spawning"></a>[`subagent_spawning` 挂钩 -> 芯线装订](/plugins/sdk-migration/removed-surfaces#subagent-spawning-hook-core-thread-binding)
- <a id="provider"></a>[提供者发现类型 -> 提供者目录类型](/plugins/sdk-migration/removed-surfaces#provider-discovery-types-provider-catalog-types)
- <a id="thinking"></a>[思维策略挂钩 -> `resolveThinkingProfile`](/plugins/sdk-migration/removed-surfaces#thinking-policy-hooks-resolvethinkingprofile)
- <a id="external"></a>[外部身份验证提供商 -> `contracts.externalAuthProviders`](/plugins/sdk-migration/removed-surfaces#external-auth-providers-contracts-externalauthproviders)
- <a id="provider-1"></a>[Provider 环境变量查找 -> `setup.providers[].envVars`](/plugins/sdk-migration/removed-surfaces#provider-env-var-lookup-setup-providers-envvars)
- <a id="memory"></a>[内存插件注册 -> `registerMemoryCapability`](/plugins/sdk-migration/removed-surfaces#memory-plugin-registration-registermemorycapability)
- <a id="memory-embedding-provider-api"></a>[内存嵌入提供商 API](/plugins/sdk-migration/removed-surfaces#memory-embedding-provider-api)
- <a id="raw"></a>[原始通道发送结果 -> `OutboundDeliveryResult`](/plugins/sdk-migration/removed-surfaces#raw-channel-send-results-outbounddeliveryresult)
- <a id="subagent-session-messages-types-renamed"></a>[子代理会话消息类型已重命名](/plugins/sdk-migration/removed-surfaces#subagent-session-messages-types-renamed)
- <a id="removed-session-and-transcript-file-apis"></a>[已删除的会话和转录文件 API](/plugins/sdk-migration/removed-surfaces#removed-session-and-transcript-file-apis)
- <a id="agent"></a>[Agent harness尝试参数 -> V2 主机能力合约](/plugins/sdk-migration/removed-surfaces#agent-harness-attempt-params-v2-host-capability-contract)
- <a id="embedded"></a>[嵌入式扩展工厂 -> 代理工具-结果中间件](/plugins/sdk-migration/removed-surfaces#embedded-extension-factories-agent-tool-result-middleware)
- <a id="openclawschematype"></a>[`OpenClawSchemaType` 别名 -> `OpenClawConfig`](/plugins/sdk-migration/removed-surfaces#openclawschematype-alias-openclawconfig)

### <a id="talk-and-voice"></a> 通话和语音

[Talk和实时语音迁移](/plugins/sdk-migration/talk) — 统一的Talk会话API及其方法图。

- <a id="talk-and-realtime-voice-migration"></a>[Talk 和实时语音迁移](/plugins/sdk-migration/talk#talk-and-realtime-voice-migration)

### <a id="compatibility-records"></a> 兼容性记录

[兼容性策略和记录](/plugins/sdk-migration/compatibility-policy) — 保留什么、为什么以及在什么条件下可以删除。

- <a id="compatibility-policy"></a>[兼容性政策](/plugins/sdk-migration/compatibility-policy#compatibility-policy)
- <a id="retained-helper-contracts"></a>[保留助手合约](/plugins/sdk-migration/compatibility-policy#retained-helper-contracts)
- <a id="harness-attempt-result-migration"></a>[harness尝试结果迁移](/plugins/sdk-migration/compatibility-policy#harness-attempt-result-migration)
- <a id="model-provider-result-compatibility"></a>[模型提供者结果兼容性](/plugins/sdk-migration/compatibility-policy#model-provider-result-compatibility)
- <a id="memory-read-missing-results"></a>[内存读取缺失结果](/plugins/sdk-migration/compatibility-policy#memory-read-missing-results)
- <a id="config-record-migrations"></a>[配置记录迁移](/plugins/sdk-migration/compatibility-policy#config-record-migrations)
- <a id="plugin-state-migration-declarations"></a>[插件状态迁移声明](/plugins/sdk-migration/compatibility-policy#plugin-state-migration-declarations)
- <a id="authstorage-sqlite-migration"></a>[AuthStorage SQLite 迁移](/plugins/sdk-migration/compatibility-policy#authstorage-sqlite-migration)
- <a id="published-channel-setup-compatibility"></a>[已发布通道设置兼容性](/plugins/sdk-migration/compatibility-policy#published-channel-setup-compatibility)
- <a id="channel-setup-input-field-compatibility"></a>[通道设置输入字段兼容性](/plugins/sdk-migration/compatibility-policy#channel-setup-input-field-compatibility)
- <a id="verifying-readers"></a>[验证读卡器](/plugins/sdk-migration/compatibility-policy#verifying-readers)
- <a id="media-legacy-projection"></a>[媒体传统投影](/plugins/sdk-migration/compatibility-policy#media-legacy-projection)

### <a id="timeline"></a> 时间线

[删除时间表](/plugins/sdk-migration/removal-timeline) - 当已弃用的表面符合删除条件时。

- <a id="removal-timeline"></a>[移除时间表](/plugins/sdk-migration/removal-timeline#removal-timeline)

## <a id="related"></a> 相关内容

- [获取 Started](/plugins/building-plugins) - 构建您的第一个插件
- [SDK Overview](/plugins/sdk-overview) - 完整的子路径导入参考
- [Channel Plugins](/plugins/sdk-channel-plugins) - 构建频道插件
- [Provider Plugins](/plugins/sdk-provider-plugins) - 构建提供商插件
- [插件 Internals](/plugins/architecture) - 架构深入探讨
- [Plugin Manifest](/plugins/manifest) - 清单架构参考
- [插入式挂钩](/plugins/hooks) - 类型和定制挂钩表面

<a id="runtime-tasks-flow" />

对于已删除的任务和 TaskFlow 表面，请参见 [Tasks 和 TaskFlow API 删除 ](/plugins/sdk-migration/removed-surfaces#tasks-and-taskflow-apis-removed)。

`agent-runtime` 快照发布者现在提供 `replaceRuntimeAuthProfileStoreSnapshotsAsync`。发布默认共享所有者快照时等待它；它通过数据库工作者解决冷所有权问题。同步 `replaceRuntimeAuthProfileStoreSnapshots` 仍然被弃用，直到更高的稳定版本为止，并保留本机冷所有者许可以实现兼容性。具有显式数据库路径或代理目录的条目保留在内存中的发布中。
