---
summary: "在 2026 年 12 月 31 日兼容性截止之前替换已弃用的同步 SQLite SDK 调用"
title: "迁移同步 SQLite API"
sidebarTitle: "异步 SQLite 迁移"
read_when:
  - "您的插件收到同步 SQLite 弃用警告"
  - "您维护会话、提供者、批准、绑定或持久状态集成"
  - "您需要完整的同步到异步 SDK 方法映射"
---

将同步 SQLite SDK 调用迁移到下面等待或准备的替换。 **最终兼容日是 2026 年 12 月 31 日 （`2026-12-31`）。** 删除在 **2027 年 1 月第一个稳定版本** 中发货，没有插件 SDK 主要版本。此弃用版本保留了列出的合约；它不会删除它们。请参阅 [ 移除时间表 ](/plugins/sdk-migration/removal-timeline) 了解释放和装运表面闸门。

从您的插件使用的系列开始。对于直接替换 `Async`，保留参数并等待结果。返回适配器或准备好的读取器的工厂可以保持同步：等待对返回对象的操作，如下所述。围绕本机数据库回调的 Promise 返回包装器仍然在调用者的线程上运行该回调；迁移回调合约，而不仅仅是其调用站点。

这些更改保留了存储的数据、架构、保留和更新行为。在读取其结果或发布外部效果之前等待写入。切勿通过已弃用的同步路径重试失败的等待操作。捆绑插件以当前主机为目标，不需要旧主机后备。外部插件应该声明提供它们使用的功能的主机版本。

## <a id="session-reads-and-inbound-envelopes"></a> Session 读取和入站信封

使用 `session-store-runtime` 进行会话读取器，使用 `channel-inbound` 进行准备好的信封结构。相同的方法映射适用于 `api.runtime.agent.session` 和通道运行时别名。

```ts
// Before
const entry = api.runtime.agent.session.getSessionEntry(target);
// After
const entry = await api.runtime.agent.session.getSessionEntryAsync(target);
```

| 前                                          | 后                                                                                                           |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `getSessionEntry`                               | `await getSessionEntryAsync(...)`                                                                               |
| `getConversationSession`                        | `await getConversationSessionAsync(...)`                                                                        |
| `listSessionEntries`                            | `await listSessionEntriesAsync(...)`                                                                            |
| `loadCombinedSessionStoreForGateway`            | `await loadCombinedSessionStoreForGatewayAsync(...)` 来自 `session-transcript-hit`                              |
| `readAmbientTranscriptWatermark`                | `await readAmbientTranscriptWatermarkAsync(...)`                                                                |
| `readSessionUpdatedAt`                          | `await readSessionUpdatedAtAsync(...)`                                                                          |
| `resolveTranscriptSessionKeyBySessionId`        | `await resolveTranscriptSessionKeyBySessionIdAsync(...)`                                                        |
| `loadTranscriptEventsSync`                      | `await loadTranscriptEvents(...)`                                                                               |
| `readTranscriptStatsSync`                       | `await readTranscriptStatsAsync(...)`                                                                           |
| `readTranscriptStatsBatchReadOnlySync`          | `await readTranscriptStatsBatchReadOnlyAsync(...)`                                                              |
| `statSessionEntrySync`                          | `await statSessionEntry(...)`                                                                                   |
| `readAcpSessionEntry`                           | `await readAcpSessionEntryAsync(...)`                                                                           |
| `AcpSessionManager.resolveSession`              | `await manager.resolveSessionAsync(...)`                                                                        |
| `createChannelInboundEnvelopeBuilder`           | `await createChannelInboundEnvelopeBuilderAsync(...)`                                                           |
| `resolveChannelInboundRouteEnvelope`            | `resolveAgentRoute(...)`，然后 `await createChannelInboundEnvelopeBuilderAsync({ cfg, route })`                 |
| `resolveInboundSessionEnvelopeContext`          | `await resolveInboundSessionEnvelopeContextAsync(...)`                                                          |
| `createInboundEnvelopeBuilder`                  | `await createChannelInboundEnvelopeBuilderAsync({ cfg, route })`                                                |
| `resolveInboundRouteEnvelopeBuilder`            | `resolveAgentRoute(...)`，然后 `await createChannelInboundEnvelopeBuilderAsync({ cfg, route })`                 |
| `resolveInboundRouteEnvelopeBuilderWithRuntime` | 运行时 `routing.resolveAgentRoute(...)`，然后 `await createChannelInboundEnvelopeBuilderAsync({ cfg, route })` |
| `dispatchInboundDirectDmWithRuntime`            | `await dispatchInboundDirectDm(...)`                                                                            |

历史记录密钥解析器包括会话重置后保留的 `session_windows`。 `getSessionEntryByIdAsync(...).sessionKey` 不能替代历史查找。查看[精确历史查找合约](/plugins/sdk-migration/async-transcript-and-tts#historical-transcript-keys)。

每条入站消息准备一次信封生成器。它返回一个同步格式化程序，生成正文字符串；旧的通用构建器返回 `{ storePath, body }`。如果调用者仍然需要存储路径，请从同一配置的存储中解析它并通过 `runtime.channel.session.resolveStorePath` 进行路由。对于自定义格式化，等待 `readSessionUpdatedAtAsync` 一次并将该时间戳传递到格式化程序中，而不是保留数据库读取回调。

`listSessionEntriesAsync` 返回只读元数据投影，而不是分离的快照，例如保存的技能提示。它不采用同步列表的 `readOnly`、快照水化或源捕获选项。使用 `getSessionEntryAsync` 获取完整的公开条目。在现有效果边界保留对转录本或元数据披露的授权。内存统计信息和存档读取器保留在其现有的记录或本地子路径上；此迁移不会将私有主机外观公开。

对于条目写入，用所有者准备或已经准备好的补丁替换不透明回调：

| 前                                       | 后                                                                                                             |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `patchSessionEntry({ update, ...target })`   | `await prepareSessionEntryPatch({ prepare, ...target })`, or `await applySessionEntryPatch({ patch, ...target })` |
| `updateSessionStoreEntry`                    | `prepareSessionEntryPatch` / `applySessionEntryPatch`                                                             |
| `updateLastRoute` 与 `assertCommitAllowed` | `await updateLastRouteWithAuthority(...)`                                                                         |
| `upsertSessionUpstreamLink`                  | `await upsertSessionUpstreamLinkAsync(...)`                                                                       |
| `deleteSessionUpstreamLink`                  | `await deleteSessionUpstreamLinkAsync(...)`                                                                       |
| 初始化所有者的`prepare().link(...)` | 等待 `prepare()`，然后 `await prepared.linkAsync(...)`                                                           |

```ts
// Before: a callback depends on the stored entry.
await patchSessionEntry({ ...target, update: choosePatch });
// After: preparation happens outside the transaction; the owner detects conflicts.
await prepareSessionEntryPatch({ ...target, prepare: choosePatch });
```

转换事务本地回调行为时，请参阅 [entry 补丁冲突和权限 ](/plugins/sdk-migration/how-to-migrate#prepare-session-entry-changes)。

## <a id="auth-profiles-and-provider-readiness"></a> Auth 配置文件和提供商准备情况

使用公共 `provider-auth` 表面进行配置文件存储和写入。捆绑插件还使用私有 `provider-auth-runtime` 表面来存储配置文件元数据，使用 `agent-sessions` 来存储 `AuthStorage` 和 `ModelRegistry`。现有的 `agent-runtime` 和运行时 `modelAuth` 别名遵循相同的映射；更喜欢焦点公共子路径（如果存在）。

```ts
// Before
const auth = AuthStorage.forAgent(agentDir, config);
auth.set(providerId, credential);
// After
const auth = await AuthStorage.forAgentAsync(agentDir, config);
await auth.setAsync(providerId, credential);
```

| 前                                                   | 后                                                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `ensureAuthProfileStore`                                 | `await ensureAuthProfileStoreAsync(...)`                                                                                       |
| `ensureAuthProfileStoreForLocalUpdate`                   | `await ensureAuthProfileStoreForLocalUpdateAsync(...)`                                                                         |
| `upsertAuthProfile`                                      | `await upsertAuthProfileAsync(...)`                                                                                            |
| `upsertApiKeyProfile`                                    | `await upsertApiKeyProfileAsync(...)`                                                                                          |
| `isProviderApiKeyConfigured`                             | `await isProviderApiKeyConfiguredAsync(...)`                                                                                   |
| `isProviderAuthProfileConfigured`                        | `await isProviderAuthProfileConfiguredAsync(...)`                                                                              |
| `listUsableProviderAuthProfileIds`                       | `await listUsableProviderAuthProfileIdsAsync(...)`                                                                             |
| `resolveProviderAuthProfileMetadata`                     | `await resolveProviderAuthProfileMetadataAsync(...)`                                                                           |
| `loadAuthProfileStoreWithoutExternalProfiles`            | `await loadAuthProfileStoreWithoutExternalProfilesAsync(...)`                                                                  |
| `loadAuthProfileStoreForRuntime`                         | `await loadAuthProfileStoreForRuntimeAsync(...)`                                                                               |
| `loadAuthProfileStoreForSecretsRuntime`                  | `await loadAuthProfileStoreForRuntimeAsync(agentDir, { ...options, readOnly: true, allowKeychainPrompt: false })`              |
| `saveAuthProfileStore`                                   | `await updateAuthProfileStoreWithLock(...)` 来自 `provider-auth`；改变其所有者下的当前商店                     |
| `findPersistedAuthProfileCredential`                     | `await findPersistedAuthProfileCredentialAsync(...)`                                                                           |
| `resolvePersistedAuthProfileOwnerAgentDir`               | `await resolvePersistedAuthProfileOwnerAgentDirAsync(...)`                                                                     |
| `resolveAuthStorePathForDisplay`                         | 淘汰物理数据库路径显示；显示 provider/profile 标识符。没有公共异步路径替换。        |
| `replaceRuntimeAuthProfileStoreSnapshots`                | `await replaceRuntimeAuthProfileStoreSnapshotsAsync(...)`                                                                      |
| `AuthStorage.create(authPath)`                           | `await AuthStorage.forAgentAsync(agentDir)` 使用该路径所属的代理目录                                            |
| `AuthStorage.forAgent`                                   | `await AuthStorage.forAgentAsync(...)`                                                                                         |
| `AuthStorage.reload`                                     | `await auth.reloadAsync(...)`                                                                                                  |
| `AuthStorage.set`                                        | `await auth.setAsync(...)`                                                                                                     |
| `AuthStorage.remove`                                     | `await auth.removeAsync(...)`                                                                                                  |
| `AuthStorage.logout`                                     | `await auth.logoutAsync(...)`                                                                                                  |
| `ModelRegistry.create`                                   | `await ModelRegistry.createAsync(...)`，或 SQL-free `ModelRegistry.fromCapturedSources(...)`（当源已准备好时） |
| `ModelRegistry.refresh`                                  | `await registry.refreshAsync(...)`                                                                                             |
| `ModelRegistry.unregisterProvider`                       | `await registry.unregisterProviderAsync(...)`                                                                                  |
| `resolveModelAuthMode`                                   | `await resolveModelAuthModeAsync(...)`                                                                                         |
| `formatModelsAvailableHeader`                            | `await formatModelsAvailableHeaderAsync(...)`                                                                                  |
| `resolveCapabilityModelCandidates`                       | `await resolveCapabilityModelCandidatesAsync(...)`                                                                             |
| `resolveConfiguredCapabilityProvider`                    | `await resolveConfiguredCapabilityProviderAsync(...)`                                                                          |
| `resolveConfiguredRealtimeVoiceProvider`                 | `await resolveConfiguredRealtimeVoiceProviderAsync(...)`                                                                       |
| `getTtsProvider`                                         | `await getTtsProviderAsync(...)`                                                                                               |
| `isTtsProviderConfigured`                                | `await isTtsProviderConfiguredAsync(...)`                                                                                      |
| `resolveExplicitTtsOverrides`                            | `await resolveExplicitTtsOverridesAsync(...)`                                                                                  |
| 运行时 `webSearch.listProviders`                        | `await webSearch.listProvidersAsync(...)`                                                                                      |
| `api.runtime.agent.resolveCliBackendDispatchEligibility` | `await api.runtime.agent.resolveCliBackendDispatchEligibilityAsync(...)`                                                       |

harness应使用主机准备的 `params.authStorage`。 `AuthStorage` `get`、`list` 和 `has` 保持对其准备视图的同步读取； `login` 和 `getApiKey` 已返回承诺。不要用以前加载的快照替换较新的整个身份验证存储：使用 `updateAuthProfileStoreWithLock` 进行所有者支持的突变。

物理数据库路径显示在 2026 年 12 月 31 日后停用。外部插件应显示 provider/profile 标识符；所选数据库路径没有公共异步 API。私有捆绑插件帮助程序 `AuthStorage.resolvePathForDisplayAsync` 保留代理本地与共享数据库选择，包括尚不存在的配置文件的定位器。元数据助手返回 profile/account 身份，并且不是路径替代品。

提供者就绪挂钩添加等待的回调：

| 前                                                               | 后                                    |
| -------------------------------------------------------------------- | ---------------------------------------- |
| `ImageGenerationProvider.isConfigured`                               | `isConfiguredAsync`                      |
| `MusicGenerationProvider.isConfigured`                               | `isConfiguredAsync`                      |
| `VideoGenerationProvider.isConfigured`                               | `isConfiguredAsync`                      |
| `SpeechProviderPlugin.isConfigured`                                  | `isConfiguredAsync`                      |
| `RealtimeTranscriptionProviderPlugin.isConfigured`                   | `isConfiguredAsync`                      |
| `RealtimeVoiceProviderPlugin.isConfigured`                           | `isConfiguredAsync`                      |
| `RealtimeVoiceProviderPlugin.resolveConfig`                          | `resolveConfigAsync`                     |
| `InternalRealtimeVoiceProviderApi.isBrowserSessionConfigured`        | `isBrowserSessionConfiguredAsync`        |
| `InternalRealtimeVoiceProviderApi.isGatewayRelayConfigured`          | `isGatewayRelayConfiguredAsync`          |
| `InternalRealtimeVoiceProviderApi.resolveBrowserSessionCapabilities` | `resolveBrowserSessionCapabilitiesAsync` |

```ts
// Before
isConfigured: (context) => isProviderApiKeyConfigured(context),
// After
// Preserve synchronous SDK callers through 2026-12-31.
isConfigured: (context) => isProviderApiKeyConfigured(context),
isConfiguredAsync: async (context) => await isProviderApiKeyConfiguredAsync(context),
```

使用挂钩的现有上下文和特定于提供者的输入。主机等待准备就绪并更喜欢异步钩子；失败的异步挂钩不会通过旧挂钩重试。准备情况结果并不授权以后使用凭证。在 2026 年 12 月 31 日之前保留提供程序类型所需的同步挂钩。捆绑提供程序还保留同步挂钩，以支持公共同步 SDK API 的调用者，直到该日期；普通运行时调用者使用异步钩子。请参阅 [auth 和可用性详细信息](/plugins/sdk-migration/how-to-migrate#await-auth-profile-and-provider-availability-operations)。

## <a id="approval-routing-and-command-authorization"></a> 审批路由及命令授权

直接解析器返回承诺。以下名称以`Async`结尾的工厂仍然同步返回适配器；他们的路由和资格回调返回承诺，主机等待他们。

```ts
// Before
const auth = resolveCommandAuthorization(input);
// After
const auth = await resolveCommandAuthorizationAsync(input);

// Factory migration: construction itself stays synchronous.
const adapter = createChannelApprovalNativeRuntimeAdapterAsync(options);
```

| 前                                                                 | 后                                                                       |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `readChannelAllowFromStoreSync`                                        | `await readChannelAllowFromStore(...)`                                      |
| `loadExecApprovals`                                                    | `await loadExecApprovalsReadOnlyAsync(...)`                                 |
| `readExecApprovalsSnapshot`                                            | `await readExecApprovalsSnapshotAsync(...)`                                 |
| `resolveCommandAuthorization`                                          | `await resolveCommandAuthorizationAsync(...)`                               |
| `resolveStoredModelOverride`                                           | `await resolveStoredModelOverrideAsync(...)`                                |
| `resolveCommandArgMenu`                                                | `await resolveCommandArgMenuAsync(...)`                                     |
| `createApproverRestrictedNativeApprovalCapability`                     | `createApproverRestrictedNativeApprovalCapabilityAsync`                     |
| `createChannelApprovalNativeRuntimeAdapter`                            | `createChannelApprovalNativeRuntimeAdapterAsync`                            |
| `createLazyChannelApprovalNativeRuntimeAdapter`                        | `createLazyChannelApprovalNativeRuntimeAdapterAsync`                        |
| `createNativeApprovalChannelRouteGates`                                | `createNativeApprovalChannelRouteGatesAsync`                                |
| `createChannelNativeOriginTargetResolver`                              | `createChannelNativeOriginTargetResolverAsync`                              |
| `createChannelExecApprovalProfile`                                     | `createChannelExecApprovalProfileAsync`                                     |
| `createApproverRestrictedNativeApprovalCapabilityFromForwardingRoutes` | `createApproverRestrictedNativeApprovalCapabilityFromForwardingRoutesAsync` |
| `createChannelApproverDmTargetResolver`                                | `createChannelApproverDmTargetResolverAsync`                                |
| `createNativeApprovalForwardingFallbackSuppressor`                     | `createNativeApprovalForwardingFallbackSuppressorAsync`                     |
| `resolveExecApprovalSessionTarget`                                     | `await resolveExecApprovalSessionTargetAsync(...)`                          |
| `resolveApprovalRequestSessionTarget`                                  | `await resolveApprovalRequestSessionTargetAsync(...)`                       |
| `resolveApprovalRequestOriginTarget`                                   | `await resolveApprovalRequestOriginTargetAsync(...)`                        |
| `resolveApprovalRequestAccountId`                                      | `await resolveApprovalRequestAccountIdAsync(...)`                           |
| `resolveApprovalRequestChannelAccountId`                               | `await resolveApprovalRequestChannelAccountIdAsync(...)`                    |
| `doesApprovalRequestMatchChannelAccount`                               | `await doesApprovalRequestMatchChannelAccountAsync(...)`                    |
| `doesApprovalRequestSelectChannelAccount`                              | `await doesApprovalRequestSelectChannelAccountAsync(...)`                   |

如果一项操作需要多个路由决策，则准备一次 `resolveApprovalRequestSessionDeliveryAsync` 并将其 `sessionDelivery` 传递给助手。将当前的批准、命令执行和交付权限保持在其效果范围内。请参阅 [ 批准路由和导入路径 ](/plugins/sdk-migration/how-to-migrate#await-session-backed-approval-routing)。

## <a id="conversation-and-native-session-bindings"></a> 对话和本机会话绑定

使用 `createAccountScopedConversationBindingManagerV2` 创建当前主机管理器，并使用 `registerSessionBindingAdapterV2` 注册自定义适配器。 V2 管理器工厂保持同步并返回仅异步接收器。

```ts
// Before
const manager = createAccountScopedConversationBindingManager(options);
const binding = manager.getByConversationId(conversationId);
// After
const manager = createAccountScopedConversationBindingManagerV2(options);
const binding = await manager.getByConversationIdAsync(conversationId);
```

| 前                                                                                                                 | 后                                                                               |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `createAccountScopedConversationBindingManager`                                                                        | `createAccountScopedConversationBindingManagerV2`                                   |
| iMessage `createIMessageConversationBindingManager`                                                                    | `createIMessageConversationBindingManagerV2`；等待下面相同的接收方法 |
| 经理 `getByConversationId`、`listBySessionKey`                                                                      | 等待`getByConversationIdAsync`，`listBySessionKeyAsync`                           |
| 经理 `bindConversation`、`touchConversation`                                                                        | 等待`bindConversationAsync`，`touchConversationAsync`                             |
| 经理 `unbindConversation`、`unbindBySessionKey`                                                                     | 等待`unbindConversationAsync`，`unbindBySessionKeyAsync`                          |
| `registerSessionBindingAdapter` / `SessionBindingAdapter`                                                              | `registerSessionBindingAdapterV2` / `SessionBindingAdapterV2`                       |
| 服务或适配器 `touch`                                                                                             | `touchAsync`                                                                        |
| 服务或适配器 `resolveByConversation`                                                                             | `resolveByConversationAsync`                                                        |
| 服务或适配器 `listBySession`                                                                                     | `listBySessionAsync`                                                                |
| 适配器 `inspectByConversation`                                                                                        | `inspectByConversationAsync`                                                        |
| `inspectSessionBindingByConversation`                                                                                  | `await inspectSessionBindingByConversationAsync(...)`                               |
| `inspectConversationBinding`                                                                                           | `await inspectConversationBindingAsync(...)`                                        |
| `resolveRuntimeConversationBindingRoute`                                                                               | `await resolveRuntimeConversationBindingRouteAsync(...)`                            |
| `ChannelConversationBindingSupport.setIdleTimeoutBySessionKey` 和运行时 `threadBindings.setIdleTimeoutBySessionKey` | `setIdleTimeoutBySessionKeyAsync`                                                   |
| `ChannelConversationBindingSupport.setMaxAgeBySessionKey` 和运行时 `threadBindings.setMaxAgeBySessionKey`           | `setMaxAgeBySessionKeyAsync`                                                        |
| `setThreadBindingIdleTimeoutBySessionKey`                                                                              | `await setThreadBindingIdleTimeoutBySessionKeyAsync(...)`                           |
| `setThreadBindingMaxAgeBySessionKey`                                                                                   | `await setThreadBindingMaxAgeBySessionKeyAsync(...)`                                |
| `setTelegramThreadBindingIdleTimeoutBySessionKey`                                                                      | `await setTelegramThreadBindingIdleTimeoutBySessionKeyAsync(...)`                   |
| `setTelegramThreadBindingMaxAgeBySessionKey`                                                                           | `await setTelegramThreadBindingMaxAgeBySessionKeyAsync(...)`                        |
| `setMatrixThreadBindingIdleTimeoutBySessionKey`                                                                        | `await setMatrixThreadBindingIdleTimeoutBySessionKeyAsync(...)`                     |
| `setMatrixThreadBindingMaxAgeBySessionKey`                                                                             | `await setMatrixThreadBindingMaxAgeBySessionKeyAsync(...)`                          |

特定于通道的设置器名称保留在其现有的本地通道表面上。它们不会创建新的跨插件导入。自定义适配器拥有自己的存储，并且必须实现 V2 异步和当前所有者合约。

原生harness必须迁移所有权，而不仅仅是重命名getter：

| 前                                        | 后                                                                                              |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `captureNativeSessionGenerationAuthority`     | 等待`prepareNativeSessionGenerationAuthority`，或者使用下面当前保留的制剂API |
| `resolveNativeSessionBinding`                 | 等待`resolvePreparedNativeSessionBinding`并释放其捕获                                |
| `reclaimNativeSessionGeneration`              | 准备好权限，则`await reclaimNativeSessionGenerationWithAuthority(...)`                   |
| `NativeSessionGenerationOperations`           | `NativeSessionGenerationOperationsV2`                                                              |
| `createNativeSessionBindingLifecycle`         | `createNativeSessionBindingLifecycleV2`                                                            |
| `NativeSessionBindingStateStore`              | `NativeSessionBindingStateStoreV2`                                                                 |
| `resolveNativeSessionBindingWithAuthority`    | 等待`resolvePreparedNativeSessionBinding`并释放其捕获                                |
| `AgentHarness.resolveSessionRuntimeOwnership` | `resolveSessionRuntimeOwnershipAsync`                                                              |

对于新的工具代码，请遵循 [native 会话沿袭 ](/plugins/sdk-migration#native-session-lineage)：等待 `resolvePreparedNativeSessionBinding` 或 `retainNativeSessionGenerationAuthority`，使用拥有的捕获，并在 `finally` 中调用 `release()`。通过效果和终端清理让主人活下去。冷的或无效的缓存绑定不能替代当前所有者权限。

## <a id="keyed-state"></a> 键控状态

提供显式插件所有者时，使用 `api.runtime.state.openKeyedStoreV2` 或 `plugin-state-store-runtime` 中的惰性 `createPluginStateKeyedStoreV2` 工厂。这些工厂立即返回；他们的方法执行工人操作。

```ts
// Before
const store = api.runtime.state.openSyncKeyedStore(options);
store.register("item", value);
const stored = store.lookup("item");
// After
const store = api.runtime.state.openKeyedStoreV2(options);
await store.register("item", value);
const stored = await store.lookup("item");
```

| 前                                                                            | 后                                                                                     |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `openSyncKeyedStore`, `createPluginStateSyncKeyedStore`                           | `openKeyedStoreV2`, `createPluginStateKeyedStoreV2`                                       |
| 同步 `register`、`registerIfAbsent`                                               | 等待 V2 `register`， `registerIfAbsent`                                                   |
| 同步 `lookup`、`lookupMany`                                                       | 等待 V2 `lookup`， `lookupMany`                                                           |
| 同步 `consume`、`delete`                                                          | 等待 V2 `consume`， `delete`                                                              |
| 同步 `entries`、`count`、`clear`                                                  | 等待 V2 `entries`、`count`、`clear`                                                      |
| 同步 `update`、`deleteIf`                                                         | V2 `observe` 加上 `compareAndApply`，或所有者定义的工人 `createOperation`         |
| V1 `openKeyedStore` / `createPluginStateKeyedStore` 接收器 `update`、`deleteIf` | 打开 V2 并将回调替换为 `observe` / `compareAndApply` 或 `createOperation` |

V1 回调方法已经返回承诺，但其不透明的 JavaScript 回调仍然在本机主机事务中执行。不要用无条件查找替换原子更新并写入：

```ts
// Before
await legacyStore.update("counter", (value) => (value ?? 0) + 1);
// After
const observed = await store.observe("counter");
const result = await store.compareAndApply("counter", observed.comparison, {
  operation: "update",
  action: "set",
  value: (observed.value ?? 0) + 1,
});
if (result.status === "conflict") {
  // Recompute from a new observation or report the conflict to the caller.
}
```

对于 `deleteIf`，根据观察评估谓词，然后有条件地将 `{ operation: "delete", action: "delete" }` 与该观察的比较应用。冲突意味着没有提交请求的突变。不要重放具有外部副作用的未知写入或回调。有关多键条件和工作器操作，请参阅 [ 键状态迁移](/plugins/sdk-migration/how-to-migrate#await-plugin-state-and-conversation-bindings)。普通的 V1 仅数据方法不是回调删除目标。

## <a id="sessionmanager%2C-extension-persistence%2C-and-replay"></a><a id="sessionmanager-extension-persistence-and-replay"></a> SessionManager，扩展持久性和重放

使用 `agent-sessions` 作为管理器 API。下面的每个持久性方法都必须在读取结果视图或发布依赖效果之前解决。

```ts
// Before
const manager = SessionManager.open(target);
const id = manager.appendCustomEntry("checkpoint", { stage: "ready" });
// After
const manager = await SessionManager.openAsync(target);
const id = await manager.appendCustomEntryAsync("checkpoint", { stage: "ready" });
```

| 前                                                               | 后                                                                                                            |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `SessionManager.open`                                                | `await SessionManager.openAsync(...)`                                                                            |
| `SessionManager.openBounded`                                         | `await SessionManager.openBoundedAsync(...)`                                                                     |
| `SessionManager.openDetachedBounded`                                 | `await SessionManager.openDetachedBoundedAsync(...)`                                                             |
| `SessionManager.openModelContext`                                    | `await SessionManager.openModelContextAsync(...)`                                                                |
| `SessionManager.readSessionContext`                                  | `await SessionManager.readSessionContextAsync(...)`                                                              |
| `setSessionTarget`                                                   | `await manager.setSessionTargetAsync(...)`                                                                       |
| `reloadPersistedTranscript`                                          | `await manager.reloadPersistedTranscriptAsync(...)`                                                              |
| `SessionManager.appendMessageToTranscript`                           | `await SessionManager.appendMessageToTranscriptAsync(...)`                                                       |
| `appendMessage`                                                      | `await manager.appendMessageAsync(...)`                                                                          |
| `appendMessageWithTranscriptAnchor`                                  | `await manager.appendMessageWithTranscriptAnchorAsync(...)`                                                      |
| `appendCompaction`                                                   | `await manager.appendCompactionAsync(...)`                                                                       |
| `appendResetBoundary`                                                | `await manager.appendResetBoundaryAsync(...)`                                                                    |
| `appendCustomEntry`                                                  | `await manager.appendCustomEntryAsync(...)`                                                                      |
| `appendSessionInfo`                                                  | `await manager.appendSessionInfoAsync(...)`                                                                      |
| `appendCustomMessageEntry`                                           | `await manager.appendCustomMessageEntryAsync(...)`                                                               |
| `appendLeafControl`                                                  | `await manager.appendLeafControlAsync(...)`                                                                      |
| `appendLabelChange`                                                  | `await manager.appendLabelChangeAsync(...)`                                                                      |
| `branch`                                                             | `await manager.branchAsync(...)`                                                                                 |
| `branchWithSummary`                                                  | `await manager.branchWithSummaryAsync(...)`                                                                      |
| `persist`                                                            | `await manager.persistAsync(...)`                                                                                |
| `removeTrailingEntries`                                              | `await manager.removeTrailingEntriesAsync(...)`                                                                  |
| `prepareTranscriptRewrite`                                           | `await manager.prepareTranscriptRewriteAsync(...)`；也等待它的`commit(...)`                                  |
| `resolveCurrentTurnEntryId({ includeOmittedCustomMessages: true })`  | 等待 `SessionManager.openAsync(target)` 完全水化，然后调用加载视图 `resolveCurrentTurnEntryId()` |
| `ExtensionAPI.appendEntry`                                           | `await api.appendEntryAsync(...)`                                                                                |
| `ExtensionAPI.setSessionName`                                        | `await api.setSessionNameAsync(...)`                                                                             |
| `ExtensionAPI.setLabel`                                              | `await api.setLabelAsync(...)`                                                                                   |
| `AgentSession.setSessionName`                                        | `await session.setSessionNameAsync(...)`                                                                         |
| `ProviderPlugin.sanitizeReplayHistory`                               | `sanitizeReplayHistoryAsync`                                                                                     |
| `ProviderReplaySessionState.appendCustomEntry`                       | V2 `appendCustomEntryAsync`                                                                                      |
| `ProviderReplaySessionState`, `ProviderSanitizeReplayHistoryContext` | `ProviderReplaySessionStateV2`, `ProviderSanitizeReplayHistoryContextV2`                                         |
| `sanitizeGoogleGeminiReplayHistory`                                  | `await sanitizeGoogleGeminiReplayHistoryAsync(...)`，或提供商本地等待重放挂钩                   |
| `SessionPendingInputReceipt.complete`                                | `await receipt.completeAsync(...)`                                                                               |
| `UserTurnTranscriptRecorder.completeProcessing`                      | `await recorder.completeProcessingAsync(...)`                                                                    |

使用 `ExtensionActionsV2`、`ExtensionRuntimeV2` 和 `bindCoreAsync` 提供等待的扩展操作。原始 action/runtime 类型和 `bindCore` 不会仅仅因为它们可以托管旧操作而被删除。 SQL-free 准备好的视图获取器、`inMemory()` 和 `fromEntries()` 保持同步。有关完成语义和类型，请参阅 [session persistence](/plugins/sdk-migration/how-to-migrate#await-session-transcript-persistence) 和 [provider replay](/plugins/sdk-migration/how-to-migrate#await-provider-replay-metadata)。

## <a id="transcript-write-callbacks%2C-readers%2C-and-catalogs"></a><a id="transcript-write-callbacks-readers-and-catalogs"></a> Transcript 写入回调、读取器和目录

| 前                                                                                                                                                    | 后                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `withSessionTranscriptWriteLock`                                                                                                                          | `await withSessionTranscriptWrite(...)`                                                           |
| `withCodexSessionTranscriptMirrorWriteLock`                                                                                                               | `await withCodexSessionTranscriptMirrorWrite(...)`                                                |
| 锁定附加或 `appendSessionTranscriptMessageByIdentity` / `appendSessionTranscriptMessageByIdentityStrict` 选项 `prepareMessageAfterIdempotencyCheck` | `preparation.prepareMessage`，可能会返回一个承诺                                          |
| 这些附加的 `beforeFreshMessageCommit` 选项                                                                                                          | `preparation.source` 使用主机拥有的源断言                                        |
| `loadArchivedSessions`                                                                                                                                    | `await loadArchivedSessionsAsync(...)`                                                            |
| `resolveMemorySessionTargets`                                                                                                                             | `await resolveMemorySessionTargetsAsync(...)`                                                     |
| `loadMemorySessionMetadata`                                                                                                                               | `await loadMemorySessionMetadataAsync(...)`，或 `loadMemorySessionMetadataBatchAsync` 批次 |
| `readSessionTranscriptCatalogTitle`                                                                                                                       | `await readSessionTranscriptCatalogTitleAsync(...)`                                               |
| `createSessionCatalogSourceActorProjector`                                                                                                                | `await prepareSessionCatalogSourceActorProjector(...)`                                            |
| `createSessionCatalogGitHubLinker`                                                                                                                        | `await prepareSessionCatalogGitHubLinker(...)`                                                    |
| `validateCodexSessionTranscriptReadAdmission`                                                                                                             | `await validateCodexSessionTranscriptReadAdmissionAsync(...)`                                     |
| `validateCodexSessionTranscriptContextVersion`                                                                                                            | `await validateCodexSessionTranscriptContextVersionAsync(...)`                                    |

```ts
// Before
await withSessionTranscriptWriteLock(target, async (writer) => {
  await writer.appendMessage({ message, prepareMessageAfterIdempotencyCheck: prepareSync });
});
// After
await withSessionTranscriptWrite(target, async (writer) => {
  await writer.appendMessage({
    message,
    preparation: { prepareMessage: prepareAsync, source: sourceAuthority },
  });
});
```

准备工作在重复检测之后并在数据库事务之外运行。返回 `undefined` 以抑制新的追加；副本保留其存储的字节并跳过准备。避免外部可见的副作用发生。新的写入范围不承诺旧回调的本机事务视图或回滚已提交的附加。参见[锁定转录本制备](/plugins/sdk-migration/how-to-migrate#await-locked-transcript-preparation)。

## <a id="reply%2C-observer%2C-and-harness-preparation"></a><a id="reply-observer-and-harness-preparation"></a> 回复、观察者和harness准备

| 前                                                                                          | 后                                                                                                            |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `sessionObserver.handleEvent`                                                                   | `await sessionObserver.handleEventAsync(...)`                                                                    |
| `sessionObserver.getCompanionSnapshot`                                                          | `await sessionObserver.getCompanionSnapshotAsync(...)`                                                           |
| `sessionObserver.dispose`                                                                       | `await sessionObserver.disposeAsync()`                                                                           |
| 回复调度 `shouldSendToolSummaries`、`shouldSendFullToolDetails`                           | 等待`shouldSendToolSummariesAsync()`，`shouldSendFullToolDetailsAsync()`                                       |
| `onVerboseProgressVisibility`                                                                   | `onVerboseProgressVisibilityAsync`；等待它的可见性获取器                                                  |
| `tryDispatchAcpReplyHook` 输入布尔值 `shouldSendToolSummaries`、`shouldSendFullToolDetails` | 传递 `shouldSendToolSummariesAsync` 和 `shouldSendFullToolDetailsAsync` 谓词                              |
| `GetReplyOptions.onAgentRunStart`                                                               | `onPreparedAgentRunStart` 以及所需的 `transcriptStart` 事实（或 `null`）                                      |
| `resolveEntryResetFreshness`                                                                    | `await resolveEntryResetFreshnessAsync(...)`                                                                     |
| `runAgentEndSideEffects`                                                                        | `await runAgentEndSideEffectsAsync(...)`                                                                         |
| 尝试`replyOperation.bindToolAuthoritySnapshot`                                              | `await replyOperation.bindToolAuthoritySnapshotAsync(...)`                                                       |
| 尝试`replyOperation.projectToolAuthorityFingerprint`                                        | `await replyOperation.projectToolAuthorityFingerprintAsync(...)`                                                 |
| 尝试`replyOperation.bindToolAuthorityRoute`                                                 | `await replyOperation.bindToolAuthorityRouteAsync(...)`                                                          |
| `ReplyToolAuthoritySnapshot.fingerprint`, `project`                                             | 等待`fingerprintAsync`，`projectAsync`                                                                         |
| `ReplyBackendMessageInjectionV2.queueMessage`                                                   | `queueMessageAsync` 与提供的准备对象                                                         |
| `ReplyBackendMessageInjectionV2.claimPendingUserInputAnswer`                                    | `claimPendingUserInputAnswerAsync` 与提供的准备对象                                          |
| `ReplyBackendMessageInjectionV2.cancelPendingUserInput`                                         | `cancelPendingUserInputAsync` 与提供的准备对象                                               |
| 问题调度程序 `authority.assertCurrent` 作为数据库读取准备步骤          | 等待`authority.assertCurrentAsync`，在效果处保留SQL-free `assertCurrent`                       |
| `buildWatchedSessionsHarnessContext`                                                            | `await prepareWatchedSessionsHarnessContext(...)`                                                                |
| `listSkillCommandsForAgents`, `listSkillCommandsForWorkspace`                                   | 等待`listSkillCommandsForAgentsAsync`，`listSkillCommandsForWorkspaceAsync`                                    |
| `createToolSurface`, `createOpenClawCodingTools`                                                | 等待`createToolSurfaceAsync`，`createOpenClawCodingToolsAsync`                                                 |
| `createAgentHarnessToolSurfaceRuntime`                                                          | `await createAgentHarnessToolSurfaceRuntimeAsync(...)`；返回 `compactTools` 和 `cleanup` 保持同步 |
| `getOpenRouterModelCapabilities`                                                                | `await loadOpenRouterModelCapabilities(modelId)`，然后 SQL- 释放 `getLoadedOpenRouterModelCapabilities(modelId)`  |

```ts
// Before
sessionObserver.handleEvent(event);
// After
await sessionObserver.handleEventAsync(event);
```

`onPreparedAgentRunStart`仍必须同步返回完成所有权；在调用之前准备好转录事实。等待政策准备并不意味着允许以后执行或披露。在生效前保留宿主当前的权限。参见[回复权限](/plugins/sdk-migration/how-to-migrate#await-reply-tool-authority)和[观察者可见性](/plugins/sdk-migration/how-to-migrate#await-session-observer-and-progress-visibility)。

## <a id="account-services%2C-runtime-config%2C-workspace%2C-and-tts"></a><a id="account-services-runtime-config-workspace-and-tts"></a> 帐户服务、运行时配置、工作区和 TTS

| 前                                                                                         | 后                                                                                                        |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `modelAccountConnectService.listLinks`, `link`, `unlink`, `list`, `select`, `status`, `cancel` | 等待 `listLinksAsync`、`linkAsync`、`unlinkAsync`、`listAsync`、`selectAsync`、`statusAsync`、`cancelAsync` |
| GitHub OAuth `cancelAuthorization`, `retireProfile`                                            | 等待`cancelAuthorizationAsync`，`retireProfileAsync`                                                       |
| 个人 GitHub `cancelAuthorization`、`disconnect`                                            | 等待`cancelAuthorizationAsync`，`disconnectAsync`                                                          |
| `getRuntimeConfig` on `runtime-config-snapshot` / `memory-core-host-runtime-core`              | 准备`readRuntimeConfig()`；用于冷准备，`await captureRuntimeConfigAsyncReader()()`            |
| `resolveCronStorePath`                                                                         | `await resolveCronStorePathAsync(...)`                                                                       |
| `OpenClawPluginNodeHostCommandContext.acquireManagedWorkspace`                                 | `await context.acquireManagedWorkspaceAsync(...)`；释放 `finally` 中的租约                            |
| `ensureAgentWorkspace.beforePersistentApply`                                                   | 呼叫前等待业主准备，并在效果时使用 SQL-free `guard.assertHost`                |
| 措手不及 `resolveTtsPrefsPath`                                                               | `await resolveTtsPrefsPathAsync(...)`，或通过`preparedTtsPreferences`                                      |
| 措手不及 `buildTtsSystemPromptHint`                                                          | `await api.runtime.tts.buildSystemPromptHintAsync(...)`                                                      |

```ts
// Before
const hint = buildTtsSystemPromptHint(config, agentId);
// After
const prepareHint = api.runtime.tts.buildSystemPromptHintAsync;
if (!prepareHint) {
  throw new Error("Update OpenClaw to use async TTS prompt preparation.");
}
const hint = await prepareHint(config, agentId);
```

捆绑的插件可以每回合调用一次私有 `prepareTtsPreferences` 并将该结果传递给支持的准备重载。这些 SQL-free 同步重载并未被弃用。外部插件使用上面的公共运行时方法。参见[公共TTS制备配方](/plugins/sdk-migration/async-transcript-and-tts#tts-prompts)。

## <a id="debug-proxy-capture-and-raw-sqlite"></a> 调试代理捕获和原始 SQLite

| 前                                                                                 | 后                                                                                                              |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `DebugProxyCaptureStore`, `getDebugProxyCaptureStore`, `acquireDebugProxyCaptureStore` | `await acquireDebugProxyCaptureStoreAsync(...)`； `lease.store` 上的等待方法                                    |
| `closeDebugProxyCaptureStore`                                                          | `await lease.release()` in `finally`                                                                               |
| `DebugProxyCaptureReader`, `createDebugProxyCaptureReader`                             | `AsyncDebugProxyCaptureReader`、`createDebugProxyCaptureReaderAsync`；工厂保持同步，等待读取 |
| `initializeDebugProxyCapture`                                                          | `await initializeDebugProxyCaptureAsync(...)`                                                                      |
| `captureHttpExchange`                                                                  | `await captureHttpExchangeAsync(...)`                                                                              |
| `captureWsEvent`，捕获上下文`captureWsEvent`                                     | `await captureWsEventAsync(...)`                                                                                   |
| `finalizeDebugProxyCapture`                                                            | `await finalizeDebugProxyCaptureAsync(...)`                                                                        |

```ts
// Before
const store = acquireDebugProxyCaptureStore(options);
// After
const lease = await acquireDebugProxyCaptureStoreAsync(options);
try {
  // Await capture operations on lease.store.
} finally {
  await lease.release();
}
```

以下 `sqlite-runtime` 操作没有机械异步 SQL 包装器。使用 `openOpenClawAgentSqliteWorkerStoreV2` 和可序列化所有者命令进行普通运行时存储。使用 `sqlite-worker-runtime` 将本机实现移至配对的工作后端：

| 前                                                                                                                                 | 后                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 可写 `openNodeSqliteDatabase`、`openOpenClawAgentDatabase`、`borrowOpenClawAgentDatabase`                                          | 工作存储采集、准备和纯数据命令     |
| 旧版工人商店 `publicationSource.DatabaseSync`                                                                                   | V2 工人商店发布源                                |
| `withOpenClawAgentDatabaseAsync`, `withOpenClawAgentDatabaseWrite`, `runOpenClawAgentWriteAdmission`                                   | 等待 V2 工作存储命令；不传递本机主机回调 |
| `runSqliteImmediateTransaction`, `runSqliteImmediateTransactionSync`                                                                   | 工作后端内的事务                             |
| `executeSqliteQuerySync`, `executeSqliteQueryTakeFirstSync`, `iterateSqliteQuerySync`, `prepareSqliteQuerySync`, `getNodeSqliteKysely` | 工人本地原语；向主机公开仅数据操作 |

```ts
// Before: awaiting admission does not move this callback off the host.
await withOpenClawAgentDatabaseWrite(options, ({ db }) => updateRows(db, input));
// After: updateRows and its transaction belong to the paired worker backend.
await store.execute({ type: "updateRows", input }, owner.assertCurrent);
```

保留显式只读检查、离线 Doctor/CLI 维护保管以及支持的工人本地原语。不要将它们视为网关处理程序中可写本机句柄的权限。请参阅 [worker 存储构建、清理和缺失存储语义](/plugins/sdk-migration/how-to-migrate#replace-native-sqlite-runtime-writes)。

## <a id="verify-the-migration"></a> 验证迁移

在等待每个迁移所有者的进程内写入后执行一次读取。对于条件状态更新，证明竞争写入会产生冲突而不是丢失。检查回调完成并释放`finally`中的资源。确认迁移的流不会发出同步 SQLite 弃用警告，并且错误会在没有旧版重试的情况下传播。

本指南涵盖同步 SQLite 删除窗口。不相关的别名、活动兼容性记录、准备好的 SQL-free 重载和 private/internal 实现内核保留自己的合同。一月份删除公共适配器并不授权删除实时安全检查或更改存储的数据。
