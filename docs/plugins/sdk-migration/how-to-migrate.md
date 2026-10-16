---
summary: "将插件移出已删除的 SDK 兼容层的有序步骤"
read_when:
  - "您现在正在将插件迁移到现代插件 SDK"
  - "您需要配置、中间件、批准和导入更改的有序步骤"
title: "如何迁移插件"
sidebarTitle: "如何迁移"
---

有序的迁移步骤。按顺序完成它们；每个步骤都是独立的。 [Plugin SDK 迁移](/plugins/sdk-migration) 指南的一部分。

同步的SQLite-本指南中支持的 API 仍可通过以下方式获得支持**2026-12-31**，最后的兼容日。拆除船舶在**第一月2027稳定发布**，没有插件SDK主要版本。此准备保留了 API。使用[完整的成员映射](/plugins/sdk-migration/sqlite-async)和[移除时间表](/plugins/sdk-migration/removal-timeline)来跟踪这个窗口。

在阅读或发布其结果之前等待每个替换。 `Async` 名称不允许在失败后回退到同步 API。较旧的主机适配器仅保留在其记录的功能检查在工作开始之前选择受支持的旧合同的情况下。

## <a id="await-durable-session-persistence"></a> Await 持久会话持久性

在网关主线程上使用异步 `SessionManager` 方法进行持久会话，包括 `openAsync`、`openModelContextAsync`、`readSessionContextAsync` 和 `appendMessageAsync`。已弃用的同步 SDK 方法仍然兼容，直到稍后发布稳定版本。将 `readCodexSessionContext` 替换为 `createCodexSessionContextReader` 的读卡器。

`codex-session-transcript-runtime` 外观还保留了已弃用的 `validateCodexSessionTranscriptReadAdmission` 和 `validateCodexSessionTranscriptContextVersion` 帮助程序。与提供给 `createCodexSessionContextReader` 的所有者保持验证，而不是发出单独的同步数据库读取。对于转录镜像，请将 `withCodexSessionTranscriptMirrorWriteLock` 替换为 `withCodexSessionTranscriptMirrorWrite`。这些兼容性帮助程序将一直保留到稍后宣布的稳定版本为止；参与者绑定和隐身目标拒绝其同步数据库访问。

不推荐使用不透明的 `AgentHarnessSessionDeletionMutation.commit` 回调。使用 `createNativeSessionBindingLifecycleV2` 用于存储的本机绑定，或使用 `createNativeSessionCommitFinalizer` 用于仅在提交后运行的效果。这些现有的参与者让会话删除留在数据库worker中；不透明回调保留同步兼容性适配器直到删除。

## <a id="await-github-publication-operations"></a> Await GitHub 发布操作

网关上下文的 `githubPublicationService` 为共享、个人和存储库发布提供版本化请求和等待的生命周期操作。在 `core` 或 `gateway-runtime` 中使用来自 `GatewayRequestHandlerOptions` 的相同服务，或者来自当前 `plugin-runtime` 请求范围的服务。没有新的 GitHub- 特定的 SDK 子路径。

| 已弃用的方法           | 替代方案                        |
| --------------------------- | ---------------------------------- |
| `requestForSession`         | `requestForSessionV2`              |
| `requestForClaim`           | `requestForClaimV2`                |
| `requestPersonalForSession` | `requestPersonalForSessionV2`      |
| `confirmPersonal`           | `confirmPersonalV2`                |
| `deferClaimPreparation`     | `await deferClaimPreparationAsync` |
| `deferOrphanedRequests`     | `await deferOrphanedRequestsAsync` |
| `listUnreportedResults`     | `await listUnreportedResultsAsync` |
| `markReported`              | `await markReportedAsync`          |
| `read`                      | `await readAsync`                  |
| `personalStatus`            | `await personalStatusAsync`        |

网关上下文还通过 `githubOAuthService` 公开托管 OAuth 方法。将 `cancelAuthorization(requestId)` 替换为 `await cancelAuthorizationAsync(requestId)`，将 `retireProfile(profileId)` 替换为 `await retireProfileAsync(profileId)`。旧方法在弃用期间保留同步结果并在使用时发出警告。

同一网关上下文通过 `githubOAuthService.personal` 公开个人连接操作。将 `personal.cancelAuthorization(action, requestId)` 替换为 `await personal.cancelAuthorizationAsync(action, requestId)`，将 `personal.disconnect(action)` 替换为 `await personal.disconnectAsync(action)`。参数不变。遗留方法保留其同步 `boolean` 和 `void` 结果并在返回之前提交；异步方法在工作线程提交并安装连接事实后解析。他们在下面分享了该出版物系列的弃用警告和删除窗口。

V2请求方法需要主机的`GitHubPublicationRequesterV2`；个人方法需要`PersonalGitHubSessionActionV2`。通过 `openclaw/plugin-sdk/gateway-runtime` 中的 `prepareGitHubPublicationRequesterV2` 或 `preparePersonalGitHubSessionActionV2` 来准备它们，传递允许的网关处理程序选项和选定的会话。通过适配器转发原始对象。除了现有的调用者断言之外，这些功能还包括 `version: 2`、生命周期 `signal` 和 `prepareSource`。不要从请求参数、保存的请求者快照或旧回调中合成它们。它们的源能力与已承认的会话和物理数据库生命周期绑定，并且无法从 JSON 重建。

用保留的主机准备替换旧的调用 `await service.requestForSession({ ...input, requester })` 及其不透明的请求者断言：

```ts
import {
  prepareGitHubPublicationRequesterV2,
  type GatewayRequestHandlerOptions,
} from "openclaw/plugin-sdk/gateway-runtime";

type Publications = NonNullable<
  GatewayRequestHandlerOptions["context"]["githubPublicationService"]
>;
type PublicationInput = Omit<
  Parameters<Publications["requestForSessionV2"]>[0],
  "requester" | "sessionKey"
> & { sessionKey: string };

async function publish(options: GatewayRequestHandlerOptions, input: PublicationInput) {
  const service = options.context.githubPublicationService;
  if (!service) throw new Error("GitHub publication is unavailable.");
  const prepared = await prepareGitHubPublicationRequesterV2(options, {
    agentId: input.agentId,
    sessionKey: input.sessionKey,
  });
  try {
    return await service.requestForSessionV2({ ...input, requester: prepared.requester });
  } finally {
    prepared.release();
  }
}
```

对于个人发布，请调用`await preparePersonalGitHubSessionActionV2(options, { sessionKey, agentId })`，将其`action`传递给`requestPersonalForSessionV2`或`confirmPersonalV2`，并以相同的`try`/`finally`模式发布。工厂从承认的处理程序上下文中获取个人和会话权限；已声明的配置文件 ID 不会授予访问权限。

V2 在获取数据库预留之前准备主机策略。工作线程在源排除下比较选定的会话生命周期、请求者、连接和工作区事实，然后在一个目标事务中提交请求和生命周期绑定。在交易结算之前，来源将保留。异步完成包括安装其提交的事实。保持请求者的所有者活着，直到操作和清理结束。

发布不再运行本机兼容性路径。旧发布方法会发出警告并失败，并显示替换方法名称；它们永远不会回退到同步 SQLite。在调用发布之前迁移到 V2。准备先于保留，类型化谓词授权提交；不支持任意事务本地回调可见性。失败或不确定的工作操作永远不会重播可接受的外部效果。

在相关读取或关闭之前等待延迟和报告。报告和索赔延迟都会更新一项工作人员事务中的相关发布类型。接受的簿记，包括执行索赔、头部更新、调度标记、观察到的效果和完成，可以在行动取消后结算，同时执行所有者保留保管权。工作人员在其事务内应用其请求和执行谓词；它不会为每个簿记提交请求另一次主机拨款。这不会授予另一个推送或拉取请求的权限。新的外部效果始终需要当前调用者和效果点的源权限。当最后一名后卫拒绝行动时，尝试派发标记可以保留；只有观察到的响应才会记录观察到的效果。

检查点准备失败和陈旧请求退出也会在没有源保留的情况下记录结果。检查点变得可用或检查后恢复会话可能需要新的发布请求；原始内容和录制的 GitHub 效果保持不变。

已弃用的发布方法保留其TypeScript签名以使迁移可发现，但在调用时显式失败。实际的旧版使用会针对每个插件发出一个警告，并且`github-publication`每个网关进程的家庭，通过共享SDK警告助手。该警告指出该方法不再执行发布工作并指定其替代方法。未知直接SDK消费者有一个共同的家庭警告。这些方法将**在随后宣布的稳定版本中删除**。个人的OAuth上述兼容性方法保留其现有的完成行为。不需要架构、存储数据、保留或更新迁移。

## <a id="replace-native-sqlite-runtime-writes"></a> 替换本机SQLite运行时写入

使用内部 `sqlite-runtime` 外观的插件应通过 `openOpenClawAgentSqliteWorkerStoreV2` 发送纯数据命令。其所需的 `{ version: 2, assertCurrent }` 功能与商店的生命周期保持一致。主持人准备输入；配对的工作后端重新读取谓词并在同步事务中提交。在发布结果或释放权限之前等待完成。

```ts
// Before: this callback executes on the host even though admission is awaited.
await withOpenClawAgentDatabaseWrite(options, ({ db }) => updateRows(db, input));

// After: the paired backend owns updateRows and its transaction.
const store = await openOpenClawAgentSqliteWorkerStoreV2(
  options,
  { version: 2, assertCurrent: owner.assertCurrent },
  { moduleUrl: workerUrl, input: backendOptions },
);
try {
  await store.prepare(); // Explicit creation/admission, when the flow requires it.
  await store.execute({ type: "updateRows", input }, owner.assertCurrent);
} finally {
  await store.close();
}
```

`execute` 和 `executeExisting` 允许跨后端绑定和命令的一笔事务。如果绑定提交独立模式初始化，请使用 `store.run((scope) => scope.execute(command), owner.assertCurrent)` 将绑定和命令保持在单独的许可中。此回调对工作命令进行排序；它永远不会收到本机数据库句柄。

`executeExisting` 保留缺席状态并且永远不会创建丢失的数据库。商店关闭拒绝新工作并加入已接受的业务。完成包括所属域的承诺事实安装；未知的结果永远不允许本地回退或自动重播。没有通用的异步原始 SQL 回调替换。主机闭包未序列化，并且纯数据命令不保证任意事务本地回调可见性。

可写的原始 open/borrow 帮助程序、本机查询帮助程序和不透明 `withOpenClawAgentDatabaseAsync`、`withOpenClawAgentDatabaseRuntime`、`withOpenClawAgentDatabaseWrite`、`runOpenClawAgentWriteAdmission` 和事务回调在兼容性期间保留其发布的签名和排序。同步写入在返回之前仍然会提交。他们的 `sqlite-runtime` 导出已被弃用，并将在稍后宣布的稳定版本中删除。实际遗留使用会对每个插件和功能系列发出一个警告；未指定范围的导入共享一个 SDK 警告。单独导入模块不会发出警告。

Worker 后端使用 `sqlite-worker-runtime` 原语。外部数据库读取必须使用 `readOnly: true` 显式打开； Doctor/import/reset 写入需要在网关停止时进行离线维护保管。测试标记为 SQLite 和状态桶是 fixture/QA 检查合约，而不是运行时写入 API。这些异常不会在普通插件处理程序中授权可写句柄。没有架构、存储字节、保留或更新迁移。

## <a id="use-worker-owned-approval-requests"></a> 使用工人拥有的批准请求

使用主机绑定的 `api.runtime.gateway.request` 进行批准请求、读取、历史记录、授权操作、解决和等待。读取过期行也是工作操作。主机的方法分类不会扩大内部主体允许的方法。已发布的不透明批准提交防护保留其同步回调签名并在工作线程预提交边界运行。抛出的回调会拒绝并回滚写入。它可以检查当前主机权限，但无法通过主机连接查询暂定工作行或依赖于以前的主机事务视图。原生SQLite适配器被移除；回调仍然被弃用，直到稍后宣布稳定版本。

共享警告预算是针对旧版使用的每个插件和功能系列的。当前的生效时间权限检查保持同步。架构、存储字节、权限和更新行为保持不变。

## <a id="await-plugin-state-and-conversation-bindings"></a> Await 插件状态和对话绑定

使用 `api.runtime.state.openKeyedStoreV2<T>(options)` 进行绑定到插件运行时生命周期的纯数据存储。对于单个可撤销操作，传递其 `assertCurrent` 权限作为第二个参数。具有显式所有者的延迟代码可以使用 `openclaw/plugin-sdk/plugin-state-store-runtime` 中的 `createPluginStateKeyedStoreV2(pluginId, options, authority)`。保持导入惰性。

开启器同步返回；在发布其结果或释放其所有者之前等待每个操作。读取和写入在现有工作线程中执行。突变完成包括本机提交和已提交事实的安装。 Atomic `consume` 和 `registerIfAbsent` 仍然是单人操作。

用观察和条件应用替换事务本地 JavaScript 回调：

```typescript
// Legacy: the callback executes inside a native transaction on the host.
await legacyStore.update("counter", (value) => (value ?? 0) + 1);

// Worker-owned: prepare outside the transaction and handle an explicit conflict.
const observed = await store.observe("counter");
const result = await store.compareAndApply("counter", observed.comparison, {
  operation: "update",
  action: "set",
  value: (observed.value ?? 0) + 1,
});
if (result.status === "conflict") {
  // Recompute from current observations or report the conflict to the caller.
}
```

比较绑定存储的内容和元数据，而不是权限或唯一的绑定化身。可选的第四个参数接受其他 namespace/key 观察的相同插件条件。工作人员检查一笔交易中的每个条件和目标。当发生冲突时，重新准备每个相关输入；返回的 `current` 仅描述目标。切勿重试传输错误、未知写入或任意回调。新的 API 不会序列化闭包或保留旧回调进行的事务本地读取。对于转录本回调，请使用单独的 [ 转录本准备合约 ](/plugins/sdk-migration/how-to-migrate#await-locked-transcript-preparation)，它在准备前检查重复项并支持显式抑制。

对于帐户范围的对话绑定，请使用 `openclaw/plugin-sdk/thread-bindings-runtime` 中的 `createAccountScopedConversationBindingManagerV2`。等待绑定、触摸、取消绑定和查找方法，包括绑定过期的查找。使用 `registerSessionBindingAdapterV2` 注册自定义适配器； V2 接口需要异步读取器和当前所有者检查。该服务公开 `listBySessionAsync`、`resolveByConversationAsync` 和 `touchAsync`。异步失败永远不会选择同步回退。外部适配器仍然对其自己的存储、当前性和提交的发布负责。

对于通道路由所有权，将 `resolveConversationRouteOwner` 替换为 `prepareConversationRouteOwnersAsync`。未发布的同步`prepareConversationRouteOwners`钩子已被删除。在准备期间等待其 `inspectBindings(refs)` 回调，然后为每个输入返回一个同步解析器。回调返回准备好的绑定事实的读取器；在解析器内部调用该读取器，以便提交的绑定更改在外部效果之前使所有权无效。返回后不保留准备回调。网关在选择或交付后发布事实。 Discord、Matrix、Slack 和 Telegram 使用此合约进行所有捆绑路由所有权读取；已发布的同步解析器在外部插件迁移时仍然不推荐使用，并在调用时发出警告。

原来的同步键控存储，不透明`update`/`deleteIf`回调、绑定管理器和适配器注册仍然是兼容性 API。它们保留同步提交前返回和回调顺序，并且是**在随后宣布的稳定版本中删除**在批准的兼容性窗口之后。实际遗留使用会为每个网关进程的每个插件和功能系列发出一个诊断；导入模块不会发出警告。诊断包含方法、替换和兼容性承诺，没有路径或存储值。

此迁移不会更改架构、存储格式、保留或更新行为。

当状态支持的读取馈送通道时，将其配置和安全适配器迁移到 [async 通道钩子 ](/plugins/sdk-channel-plugins)。通过包装器和设置适配器转发这些挂钩，同时保留旧主机的现有同步签名。

## <a id="migrate-inspection%2C-authorization%2C-and-approval-factories"></a><a id="migrate-inspection-authorization-and-approval-factories"></a> 迁移检查、授权、审批工厂

当检查或通道资格读取工作人员拥有的状态时，使用这些异步替换：

| SDK 子路径                               | 同步API                                    | 替代方案                                             |
| ----------------------------------------- | -------------------------------------------------- | ------------------------------------------------------- |
| `conversation-binding-inspection-runtime` | `inspectConversationBinding`                       | `inspectConversationBindingAsync`                       |
| `command-auth-native`                     | `resolveCommandAuthorization`                      | `resolveCommandAuthorizationAsync`                      |
| `command-auth-native`                     | `resolveStoredModelOverride`                       | `resolveStoredModelOverrideAsync`                       |
| `command-auth-native`                     | `resolveCommandArgMenu`                            | `resolveCommandArgMenuAsync`                            |
| `exec-approvals-runtime`                  | `loadExecApprovals`                                | `loadExecApprovalsReadOnlyAsync`                        |
| `approval-delivery-runtime`               | `createApproverRestrictedNativeApprovalCapability` | `createApproverRestrictedNativeApprovalCapabilityAsync` |
| `approval-handler-runtime`                | `createChannelApprovalNativeRuntimeAdapter`        | `createChannelApprovalNativeRuntimeAdapterAsync`        |
| `approval-handler-adapter-runtime`        | `createLazyChannelApprovalNativeRuntimeAdapter`    | `createLazyChannelApprovalNativeRuntimeAdapterAsync`    |

在使用其结果之前等待检查和命令授权。审批工厂仍然同步返回适配器；主机正在等待他们的异步资格回调。原始 API 通过稍后宣布的稳定版本兼容性窗口保留其同步合约。使用上面的狭窄子路径进行新导入；广泛的兼容性桶保留了现有的 API，无需重复替换。

## <a id="await-session-backed-approval-routing"></a> Await 会话支持的批准路由

选择帐户、解析会话目标或构建本机审批路由时，使用异步审批路由替换。他们通过会话工作线程读取传递事实，而不是在网关线程上查询 SQLite。下面的每个同步 API 均已弃用；将 `Async` 添加到其名称中以选择替换：

| SDK 子路径                 | 已弃用的 API                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `approval-native-runtime`   | `createNativeApprovalChannelRouteGates`, `createChannelNativeOriginTargetResolver`, `resolveExecApprovalSessionTarget`, `resolveApprovalRequestSessionTarget`, `resolveApprovalRequestOriginTarget`, `resolveApprovalRequestAccountId`, `resolveApprovalRequestChannelAccountId`, `doesApprovalRequestMatchChannelAccount`, `doesApprovalRequestSelectChannelAccount` |
| `approval-client-runtime`   | `createChannelExecApprovalProfile`                                                                                                                                                                                                                                                                                                                                    |
| `approval-delivery-runtime` | `createApproverRestrictedNativeApprovalCapabilityFromForwardingRoutes`                                                                                                                                                                                                                                                                                                |

工厂仍然同步返回它们的适配器。等待生成的依赖于会话的路由和资格方法。直接帐户和目标解析器返回承诺。现有的 `approval-runtime` 外观还公开了其保留 API 的替代品。

对于需要多个决策的路由操作，调用 `resolveApprovalRequestSessionDeliveryAsync` 一次并将其 `sessionDelivery` 结果传递给异步助手。 `null` 记录该会话没有传递事实。 `ApprovalRequestSessionDelivery` 类型描述了这个准备好的值。当回调需要异步路由时，使用`createChannelApproverDmTargetResolverAsync`和`createNativeApprovalForwardingFallbackSuppressorAsync`。

准备好配送事实，选择路线；他们不授权批准。保持主持人当前权限检查实际审批效果。已弃用的同步 API 会发出迁移警告，并在弃用期间保持可用。在稳定弃用后，它们将在后续版本中删除。这不会更改存储的格式、权限或更新行为。

## <a id="await-gateway-approval-publication"></a> 等待网关批准发布

在发布前使用 `await context.approvalEvents.publishRequestedAsync(kind, request)` 准备订户资格。如果较旧的主机仅提供 `publishRequested`，则在分派之前选择该同步回调；切勿通过旧回调重试失败的异步发布。

`publishRequested(kind, request)` 为同步订阅者保留其同步数字结果。它已被弃用，并在稍后发布的稳定版本 **中删除了**。如果任何订阅者需要异步资格，则旧方法会在将请求发送到任何订阅者之前引发迁移错误。对捆绑的本机审批运行时使用异步方法，其路由选择可以在工作人员中准备帐户状态。旧版发布者对象不需要实现可选的异步伴随对象。

## <a id="workspace-mutation-guards"></a> 工作空间变异守卫

等待`api.runtime.agent.ensureAgentWorkspace({ dir, guard: { assertHost } })`。在调用之前异步准备数据库派生的输入； `assertHost`必须在不访问SQLite的情况下同步检查当前调用者权限。核心拥有的恢复谓词在工作线程的事务连接上执行。

已发布的 `beforePersistentApply: () => void` 选项仍然支持 TypeScript 和 JavaScript 插件，直到稍后发布稳定版本。它在每个工作线程突变调度之前、外部准入授权以及主机文件系统突变边界处立即在主机上运行一次。适用的投掷停止。允许并弃用回调中的同步 OpenClaw 数据库访问；警告解释了每个进程一次的时间和键入的替换。

旧版回调或其数据库读取不会出现兼容性问题。时间差异在于遗留检查在分派之前运行，而 `guard.assertHost` 也在事务和提交授权内重新检查。更喜欢在提交时使用类型化防护进行实时撤销。回调错误继续传播。不需要架构、保留、持久性或更新迁移。

## <a id="await-mention-inbox-operations"></a> 等待提及收件箱操作

将同步 `context.mentionInbox.list(client)` 和 `context.mentionInbox.dismiss(client, ids)` 调用替换为 `listAsync(client, publish)` 和 `dismissAsync(client, ids, publish)`。这两种方法都在工作线程中准备持久状态，然后与当前授权结果同步调用 `publish`。在该回调中发送网关响应，无需等待更多工作：

```ts
await mentionInbox.listAsync(client, (result) => {
  respond(result.ok, result.ok ? result.value : undefined, result.ok ? undefined : result.error);
});
```

在释放请求资源或开始取决于操作的工作之前，等待返回的承诺。解雇 ID 保留精确匹配语义。

将 `recordCommittedInput(input)` 替换为 `await recordCommittedInputAsync(input)`，将 `invalidate(sessionKey)` 替换为 `await invalidateAsync(sessionKey)`。在读取生成的收件箱之前等待记录，并在依赖刷新的连接视图之前等待失效。在保存收件箱项目之前，录制还会等待协作作者的会话参与更新。两个写入都保留其现有所有者并在 Gateway 工作线程关闭之前解决。

附带的同步签名仍然被弃用，直到它们单独宣布的普通稳定删除版本为止，但它们的本机持久性适配器已经退役。 `list`和`dismiss`返回`UNAVAILABLE`，并在消息中等待替换； `invalidate` 引发迁移定向错误。旧版 `recordCommittedInput` 在任何封闭事务提交后对工作操作进行排队；回滚会丢弃它。等待 `recordCommittedInputAsync` 完成。每个插件和每个进程的功能系列都会发出一次 `DEP_SESSION_PERSISTENCE` 警告；无范围调用共享一个 SDK-level 系列警告。拒绝读取、驳回和失效不会安排后台工作。有序关闭时排队的旧记录会耗尽；突然的进程退出可能会丢失排队的提交。

将记录移到任何同步 SQLite 事务之外，并在源消息提交后等待它。等待的收件箱写入器拥有自己的事务，并且仅在写入提交后才发布通知。此迁移不会更改架构、保留的数据、保留或更新行为。

## <a id="await-personal-model-account-operations"></a> Await个人模型-账户操作

网关上下文的 `modelAccountConnectService` 现在为其七种同步存储方法提供了期待已久的替代方案。保留现有参数并等待结果，然后再发布响应、开始依赖工作或释放调用者的权限：

| 同步方式 | 等待更换 |
| ------------------ | ------------------- |
| `listLinks`        | `listLinksAsync`    |
| `link`             | `linkAsync`         |
| `unlink`           | `unlinkAsync`       |
| `list`             | `listAsync`         |
| `select`           | `selectAsync`       |
| `status`           | `statusAsync`       |
| `cancel`           | `cancelAsync`       |

每次替换都会解析为现有结果包络。传递当前所有者并实时回调`assertCurrent`；该服务会在披露帐户摘要或链接之前重新检查等待的工作的权限。结果从不包含凭据。如果写入的提交结果未知，请不要重试或回退到其同步对应项。

2026.9.8 中提供的同步方法保留其参数、立即返回值和完成时间，直到宣布稍后的稳定版本和明确的中断版本批准为止。每个插件和每个进程的功能系列都会发出一个 `DEP_SESSION_PERSISTENCE` 警告，包括跨插件重新加载；无作用域调用每个方法都会发出一次警告。核心和捆绑调用者使用等待的方法。此迁移不会更改 RPC 架构、存储的数据、保留或更新行为。

## <a id="await-skill-command-discovery"></a> 等待技能命令发现

构建本机命令菜单时，使用 `openclaw/plugin-sdk/skill-commands-runtime` 中的 `prepareSkillCommandsForAgents` 和 `prepareSkillCommandsForWorkspace`。 `command-auth-native` 还公开了 `prepareSkillCommandsForAgents` 及其现有的命令帮助程序。在注册命令或发布菜单之前等待准备工作，以便托管库选择通过其数据库工作程序运行。

同步 `listSkillCommandsForAgents` 和 `listSkillCommandsForWorkspace` 方法保留其数组结果，直到稍后发布稳定版本。它们已被弃用，并在使用时对每个插件和功能系列发出警告。捆绑的 Discord、Mattermost、Slack 和 Telegram 菜单使用期待的方法。命令名称、过滤、存储的选择和更新行为保持不变。

## <a id="await-placement-preparation"></a> 等待安置准备

在使用其结果、开始相关工作或释放请求资源之前，等待放置读取和突变。网关的本机同步适配器已停用；已弃用的签名将一直保留到其单独宣布的普通稳定删除版本为止。

| 已弃用的 `workerSessionPlacementService` 方法 | 等待更换                            |
| ------------------------------------------------- | ---------------------------------------------- |
| `get`                                             | `getAsync`                                     |
| `getMany`                                         | `getManyAsync`                                 |
| `list`                                            | `listAsync`                                    |
| `listForReconcile`                                | `listForReconcileAsync`                        |
| `listPendingWorkspaceResults`                     | `listPendingWorkspaceResultsAsync`             |
| `getWorkspaceResultReconcilingSessionIds`         | `getWorkspaceResultReconcilingSessionIdsAsync` |
| `retireSessionPlacement`                          | `retireSessionPlacementAsync`                  |
| `clearLocalTurnClaimsAfterRestart`                | `clearLocalTurnClaimsAfterRestartAsync`        |

`get` 和 `getMany` 仅消耗已提交的处理中收据。冷条目或无效条目会随迁移指南一起抛出；所有者发布的缺席仍然是有效结果。同步库存和变异方法总是抛出并且从不安排工作。每个插件和功能系列调用都会发出一次警告。

展示位置激活回调直接接收已提交的活动展示位置。使用该结果进行维护计划，而不是再次阅读它。对于最终执行或披露保护，请与配售所有者一起准备授权，然后在生效前立即检查其实时进程中的事实。

启动等待 `clearLocalTurnClaimsAfterRestartAsync`，同时保持状态目录锁，然后再接受轮流。工作人员清除陈旧的本地索赔并在成功后发布返回的记录。不确定结果导致启动失败；下次启动时可以安全地重复清理。捆绑的重置和删除路径正在等待 `retireSessionPlacementAsync`。

内置 `placementStandingGrants` 服务具有以下替换：

| 已弃用的方法 | 等待更换   |
| ----------------- | --------------------- |
| `resolveBinding`  | `resolveBindingAsync` |
| `retain`          | `retainAsync`         |
| `validate`        | `validateAsync`       |

同步方法会引发迁移导向的错误。 `resolveAsync` 在一个请求中结合了绑定和保留父验证。在传输切换之前等待`consumeAsync`，然后在生效时同步调用`consume`。最终调用检查准备好的写回执、过期时间、节点、配对和放置绑定，无需 SQLite；更改的收据将拒绝拨款。不要将较旧的制剂视为对以后效果的许可。

对于自定义服务实现，异步添加在已发布的接口上仍然是可选的。内置网关为它们提供支持，并且在工作线程发生故障后不会选择本机回退。

器件贴装需求也有一个令人期待的 `workerPlacementDispatchService.getAdmittedDeviceSessionCountsAsync` 伴侣。同步方法会保留其已发布的签名，直到其单独宣布的普通稳定删除版本为止。这些迁移不会更改架构、存储的数据或更新行为。

## <a id="await-reply-tool-authority"></a> Await回复工具权限

来自 `openclaw/plugin-sdk/agent-harness-runtime` 的利用尝试参数公开了可选的 `replyOperation`。等待其 `bindToolAuthoritySnapshotAsync`、`projectToolAuthorityFingerprintAsync` 和 `bindToolAuthorityRouteAsync` 方法。它们保留现有输入并分别解析为 `void`、`string | undefined` 和 `string`。准备检查当前会话策略，然后重新验证原始操作和具体后端路由。

工具权威快照提供者可以实现可选的 `fingerprintAsync` 和 `projectAsync` 同伴，同时保留其发布的同步方法。传统的两种方法快照对象仍然被接受。不要在等待后使用较早的哈希值作为权限：每个操作都需要重新准备和当前所有者权限。

V2注入后端可以添加`queueMessageAsync`。它保留现有参数，用 `{ prepareCurrent(): Promise<void>; assertCurrent(): void; compatAssertCurrent(): void }` 替换同步断言参数。仅准备工作并不能在阅读器关闭后授权输入。当委托给内置转向时，转发提供的准备函数不变，以便主机可以绑定最终读取并将其排队到一个准入。本机传输可以使用下面的 `withPreparedCurrent`。没有该消耗边界的接收器在其生效之前保留同步 `compatAssertCurrent()` 检查，在工作人员授予之外。主人在提供时选择等待的同伴；已发布的外部 V2 实现仍受支持。

旧版 V1 后端仍然接受运行拥有的输入，而无需单独的调用者生命周期绑定。仅靠制定工人政策并不能产生这种约束力。绑定到调用者、操作员或源的输入仍然需要 V2；主机在调用未绑定的遗留后端之前检查当前所有者和策略权限。

等待会话谱系准入的本机harness后端可以使用可选的 `NativeSessionBindingAuthority.withPreparedCurrent(consume, preparations)` 伴侣。对于工作人员准备的策略，它通过现有会话读取器一起读取工具策略和沿袭，然后在该准入当前时调用同步 `consume` 回调。使用 `withCurrent` 即可获得效果，无需准备工具策略；它的签名没有改变。未知或部分支持的准备提供程序在工作人员授权之外保留完全同步的策略、目标和沿袭检查，在使用之前无需等待。仅在拒绝该项目后，可选的每个项目 `onRefused(error)` 回调可能会返回 `"discarded"`；否则整个录取失败。后期兼容性拒绝会拒绝整个未分派的批次，而不会重复本机检查或结算回调。

待处理问题接收器可以实现 `claimPendingUserInputAnswerAsync` 和 `cancelPendingUserInputAsync`，采用与队列同伴相同的准备对象。将其作为 `authority.toolAuthorityPreparation` 与当前的后端断言一起传递到共享问题函数。问题所有者编写新的策​​略读取及其最终解决或取消边界。传统接收器保留其完全同步的 `compatAssertCurrent` 断言；早期的快照永远不能替代当前的政策。

自定义问题调度程序保留 `version: 2`。当源绑定权限提供 `assertCurrentAsync` 时，在传输准备后等待它，然后在 I/O. 之前立即调用 `assertCurrent` 仅调用 `assertCurrent` 的旧实现保留发布的新鲜本机检查。失败的等待检查不得触发同步回退或重放可能接受的输入。运行拥有的遗留回调在调度之前立即保留新的本机策略断言，因为它们的无作用域契约没有暴露任何等待的效果边界。

仅队列目标资格与普通队列准入保持一致；它不会将数据库读取添加到问题回调中。内置普通控制将输入安装在其最终许可中，并在发布该许可后通知订阅者。

在 `reply-tool-authority-sync-preparation` 下，同步指​​纹、投影、绑定和注入方法已被弃用，并在稍后宣布的稳定版本和明确的删除批准后删除。旧版准备和注入回退会针对每个功能系列发出一次警告。准备好的同步预测和所需的最终权威断言仍然受支持并且不发出警告。不引入架构、保留或更新迁移。

## <a id="prepare-harness-tool-surfaces"></a> 准备harness工具表面

在压缩harness工具目录之前，使用 `openclaw/plugin-sdk/agent-harness-tool-runtime` 中的 `await createAgentHarnessToolSurfaceRuntimeAsync(params)`。返回的运行时保持相同的同步 `compactTools` 和 `cleanup` 方法。当启用本地模型精益过滤时，构建通过会话工作器准备其会话策略；压缩重用了这些事实。其他表面不会加载会话元数据以进行精益过滤。

同步 `createAgentHarnessToolSurfaceRuntime` 在弃用期间仍受支持，每个插件发出一次警告，并将在稳定弃用后的后续版本中删除。捆绑的harness使用异步工厂。

## <a id="prepare-session-catalog-identities"></a> 准备会话目录身份

派生目录标题时，等待来自 `openclaw/plugin-sdk/session-transcript-runtime` 的 `readSessionTranscriptCatalogTitleAsync({ agentId, sessionKey, storePath, entry })`。它保留元数据优先级并通过历史工作者读取有界的第一条消息后备。 `readSessionTranscriptCatalogPage` 也使用该工作线程，同时保留分页的原始事件坐标。同步 `readSessionTranscriptCatalogTitle` 在稳定弃用期间仍受支持，每个插件发出一次警告，并将在稍后宣布的稳定版本中删除。

在投影源目录页面之前，使用 `openclaw/plugin-sdk/session-transcript-runtime` 中的 `await prepareSessionCatalogSourceActorProjector({ pluginId, sourceDomain, actors })`。返回的同步投影仪仅读取准备好的配置文件并验证 GitHub 事实。对于接收者归属，请使用 `await prepareSessionCatalogGitHubLinker({ participants, owners })`，传递页面的参与者和配置的所有者引用。其同步 `linkParticipant` 和 `resolveOwner` 方法保留每个经过验证的 GitHub 帐户和登录名，而源导出仅使用该人的主帐户。如果多个主机同时准备，请保留每个链接器的 `assertCurrent` 并在发布已完成的主机或聚合结果之前调用它。重新检查同一发布边界处每个主机的快照生命周期，包括不链接配置文件身份的主机。

传输工作完成后，再次准备每一页，然后进行投影和披露，无需等待。准备期间配置文件更改拒绝页面；身份声明永远不会授予访问权限。身份读取后的外部提交不会重写该页面的属性快照；下一个未固定的页面会读取新的事实。此快照永远不会取代权限检查。在披露之前重新检查来源当前的共享政策。现有的 `runtime.agent.session.listSessionEntries` 接受可选的 `sessionKeys` 以将最终读取限制为精确的持久密钥，同时保留存储数据列表验证。默认情况下，选定的读取包括派生参与者和计数。仅消耗共享元数据的守卫可以通过 `includeParticipants: false` 来跳过该水合作用；存储数据验证在只读和可写列表中保持启用状态。其可选的 `captureSource(assertCurrent)` 回调捕获已承认的实体商店；在准备之后和最终共享读取之前调用提供的断言以拒绝同一路径上的替换，即使会话 ID 被重用也是如此。

已发布的同步 `createSessionCatalogSourceActorProjector` 和 `createSessionCatalogGitHubLinker` 签名已弃用，但仍可用于现有插件；捆绑的会话共享使用等待的助手。架构、存储的数据、保留、权限和更新行为保持不变。

## <a id="replace-unbound-native-session-deletion-callbacks"></a> 替换未绑定的本机会话删除回调

Harness `withSessionDeletion` 和 `withSessionContextReset` 挂钩应将工厂生产的参与者传递给 `run`，而不是具有未绑定 `commit` 和 `rollback` 回调的普通 `AgentHarnessSessionDeletionMutation` 对象。从 `openclaw/plugin-sdk/agent-harness-session-runtime` 导入工厂：

| 已弃用的回调                                                   | 替代方案                                                                                |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 删除和恢复存储的本机绑定的直接回调      | 参与者由 `createNativeSessionBindingLifecycleV2(...).withDeletion(...)` 提供 |
| 仅在会话提交后完成清理的直接回调 | `createNativeSessionCommitFinalizer({ commit, rollback })`                                 |

绑定生命周期让现有的工作事务处理可逆的存储状态。提交终结器仅用于清理，没有可逆的存储效果；它不会将任意数据库回调移动到工作线程。在向任一参与者添加实时权限或结算挂钩时使用 `wrapNativeSessionDeletionMutation`，以便包装器保留其工人所有权。

在持久网关删除期间，仅在工作人员确认会话提交后才运行直接未绑定回调；不使用它们的回滚回调。清理失败会在不撤消删除的情况下发出警告，并且进程退出可能会导致清理未完成。停止的所有者维护和进程本地隐身删除保留其本机交易合同。旧版回调每个插件和回调系列发出一次警告，并将**在随后宣布的稳定版本中删除**。工厂生产的参与者和两个harness挂钩仍然受到支撑。看[删除同伴](/plugins/sdk-migration/compatibility-policy#harness-deletion-companions)。此迁移不会更改架构、存储格式、保留或更新行为。

## <a id="await-session-upstream-links"></a> Await 会话上游链接

使用 `openclaw/plugin-sdk/session-catalog` 中的 `upsertSessionUpstreamLinkAsync` 和 `deleteSessionUpstreamLinkAsync`。在绑定本机会话、发布采用或依赖于链接清理之前，保留现有参数并等待完成。 upsert 解析为布尔值；删除解析为 `"deleted"`、`"absent"`、`"changed"` 或 `undefined`，保留现有结果语义。

当写入依赖于实时权限时，传递现有的`assertCommitAllowed`回调。它在工作事务和提交准入时运行，因此它必须保持同步并且不得查询共享状态数据库。不确定的写入结果不允许重试写入或调用其同步对应项。

使用生产专用 `agent-harness-session-runtime` 初始化程序的官方harness应在调用 `initialization.bind(...)` 之前将 `initialization.link(input)` 替换为 `await initialization.linkAsync(input)`。在释放初始化程序的所有权之前等待回滚清理。

`v2026.9.8` 中提供的同步更新插入、删除和初始化程序 `link` 合约保留其参数、即时结果和完成时间，直到弃用后在后续稳定版本中删除。调用任何这些方法都会针对上游链路功能系列的每个插件和进程发出一个 `DEP_SESSION_PERSISTENCE` 警告；未涵盖的消费者共享一个 SDK- 级别警告。此迁移不会更改架构、存储的数据、保留或更新行为。

## <a id="await-session-and-transcript-readers"></a> Await 会话和成绩单阅读器

从 `openclaw/plugin-sdk/session-store-runtime` 导入这些助手并保留现有参数：

| 已弃用的读者                        | 等待更换                           |
| ---------------------------------------- | --------------------------------------------- |
| `getSessionEntry`                        | `getSessionEntryAsync`                        |
| `getConversationSession`                 | `getConversationSessionAsync`                 |
| `listSessionEntries`                     | `listSessionEntriesAsync`                     |
| `readAmbientTranscriptWatermark`         | `readAmbientTranscriptWatermarkAsync`         |
| `loadTranscriptEventsSync`               | `loadTranscriptEvents`                        |
| `resolveTranscriptSessionKeyBySessionId` | `resolveTranscriptSessionKeyBySessionIdAsync` |

运行时会话别名使用相同的异步替换。对于历史记录，请使用确切的会话密钥解析器：通过会话 ID 查找当前条目在会话替换后并不等效。有关历史窗口合约和公共 TTS 准备配方，请参阅 [awaited 成绩单和 TTS 助手 ](/plugins/sdk-migration/async-transcript-and-tts)。

## <a id="await-debug-proxy-capture"></a> Await 调试代理捕获

从 `openclaw/plugin-sdk/proxy-capture` 导入捕获助手。将直接使用的 `DebugProxyCaptureStore`、`getDebugProxyCaptureStore` 和 `acquireDebugProxyCaptureStore` 替换为 `await acquireDebugProxyCaptureStoreAsync`。等待对其 `store` 的操作，并且始终在 `finally` 中进行 `await lease.release()`；这取代了全局 `closeDebugProxyCaptureStore` 清理。

将 `DebugProxyCaptureReader` 和 `createDebugProxyCaptureReader` 替换为 `AsyncDebugProxyCaptureReader` 和 `createDebugProxyCaptureReaderAsync`。读卡器工厂保持同步；等待其 `getSessionEvents` 和 `readBlob` 方法。它不会创建不存在的数据库。

等待 `initializeDebugProxyCaptureAsync`、`captureHttpExchangeAsync` 和 `captureWsEventAsync` 代替其同步对应项。捕获上下文还公开 `captureWsEventAsync`。关闭时等待 `finalizeDebugProxyCaptureAsync` 加入写入并释放捕获资源。已弃用的调用保留其完成合同并发出有限的迁移警告。

## <a id="await-session-metadata-listings"></a> Await 会话元数据列表

在准备工作之前，使用 `openclaw/plugin-sdk/session-store-runtime` 或 `api.runtime.agent.session.listSessionEntriesAsync` 中的 `listSessionEntriesAsync` 枚举会话元数据。传递显式的 `agentId` 以及可选的现有 `storePath` 和 `env`，然后等待结果。读取通过会话工作线程运行，并且永远不会创建或注册丢失的代理数据库。

异步列表保留会话 ID、初始化状态、插件元数据和派生参与者，同时忽略分离的快照，例如保存的技能提示。当需要完整条目时，请使用 `getSessionEntryAsync`。异步列表始终是只读的，因此它不采用 `readOnly`、快照水合或同步源捕获选项。将最终删除或披露保护保持在现有的效果边界。

同步 `listSessionEntries` API 已弃用，直到稍后发布稳定版本为止。其现有参数和完整条目行为仍然可用于兼容性，并对遗留使用发出一次性弃用警告。

## <a id="await-transcript-statistics"></a> Await成绩单统计

使用 `openclaw/plugin-sdk/session-store-runtime` 中的 `await readTranscriptStatsAsync(scope)` 作为一个转录本，或使用 `openclaw/plugin-sdk/memory-core-host-engine-sessions` 中的 `await readTranscriptStatsBatchReadOnlyAsync(scopes)` 作为一批转录本。持久读取通过现有会话工作线程运行。批处理结果保留输入订单和重复 ID，对于现有商店中丢失的转录本返回零计数，对于不可用的商店返回 `null`，而不创建它们。

`readTranscriptStatsSync` 和 `readTranscriptStatsBatchReadOnlySync` 保留其已发布的签名，直到稍后宣布稳定版本。主线程上的旧版调用会发出共享会话存储弃用警告；已经在数据库工作线程中运行的内核可以保持同步读取而不会发出警告。

使用 `openclaw/plugin-sdk/memory-core-host-engine-sessions` 中的 `await statSessionEntry(path, options)` 通过工作器读取转录文件元数据。 `statSessionEntrySync` 在 2026 年 12 月 31 日之前仍然可用；将已准备好的转录本统计信息传递给它只会投影这些值，并且不会查询 SQLite。当提供 `onTranscriptMessage` 观察者时，`buildSessionEntry` 还会读取工作线程中的持久快照，然后使用原始消息和时间戳调用调用者上的观察者。

## <a id="prepare-session-entry-changes"></a> 准备会话条目更改

使用 `openclaw/plugin-sdk/session-store-runtime` 中的 `prepareSessionEntryPatch` 或 `applySessionEntryPatch`。代理运行时公开 `api.runtime.agent.session.prepareSessionEntryPatch` 以及由主机绑定的调用插件的生命周期和会话所有权检查。

```ts
// Legacy callback adapter: retained with its original transaction guard.
await patchSessionEntry({
  ...target,
  update: async (entry) => ({ displayName: await chooseTitle(entry) }),
  assertCommitAllowed: assertLegacyOwner,
});

// Prepare outside SQLite; commit only if the captured entry is unchanged.
await prepareSessionEntryPatch({
  ...target,
  prepare: async (entry) => ({ displayName: await chooseTitle(entry) }),
  authority: { kind: "host", assertCurrent: assertLiveOwner },
});

// Already prepared data needs only one worker mutation command.
await applySessionEntryPatch({
  ...target,
  expected: { sessionId, lifecycleRevision },
  patch: { displayName: title },
  preserveActivity: true,
});
```

准备工作在数据库事务之外运行一次。返回 `null` 会抑制写入并保留现有结果行为。工作人员在提交之前检查确切捕获的条目；冲突被拒绝而不重播回调。 `applySessionEntryPatch` 在提交事务中检查其可选的预期会话和生命周期； `expected: null` 需要缺席。创建缺失行时使用 `fallbackEntry`，仅当提供的补丁是完全替换时才使用 `replaceEntry: true`。

`host` 权限无需访问数据库即可检查实时所有权或取消。准备后以及工人入场和提交时会重新检查。当涉及存储谓词时，将现有的主机提供的源断言作为 `authority: { kind: "source", source }` 传递；将其包装在数据库读取回调中会丢失其准备好的源合同。普通直接 SDK CRUD 保留其现有的可选权限合同。

`patchSessionEntry`、`updateSessionStoreEntry` 和 `updateLastRoute.assertCommitAllowed` 选项已弃用，并将在稍后发布的稳定版本中删除。使用 `updateLastRouteWithAuthority` 进行受保护的路由更新。传统守卫保留其原始的本地交易可见性。新的准备工作不会序列化关闭或承诺可见性。共享警告预算是每个插件和每个进程的会话存储系列一次。

`upsertSessionEntry`和`updateAmbientTranscriptWatermark`保留其姓名和结果；他们现有的减速器现在在拥有的工人中执行。等待完成包括承诺事实安装。不引入架构、存储字节、保留或更新迁移。

隐身会话使用参与者的内存后端，包括没有显式绑定的调用。跨存储源断言保留其现有的本机适配器，直到类型化的跨存储条目编写器可用。该显式兼容性路线永远不会重试失败的工作人员突变。

## <a id="await-locked-transcript-preparation"></a> 等待锁定的成绩单准备

将 `withSessionTranscriptWriteLock` 替换为 `openclaw/plugin-sdk/session-transcript-runtime` 中的 `withSessionTranscriptWrite`。在`preparation`中传递消息准备和主机准备的源权限。

遗留形式在本机事务中运行不透明的准备：

```ts
await withSessionTranscriptWriteLock(target, async (transcript) => {
  await transcript.appendMessage({
    message,
    prepareMessageAfterIdempotencyCheck: redactMessageSync,
  });
});
```

替换等待该交易之外的准备：

```ts
await withSessionTranscriptWrite(target, async (transcript) => {
  const result = await transcript.appendMessage({
    message,
    idempotencyLookup: "scan",
    preparation: {
      prepareMessage: async (candidate) => redactMessage(candidate),
      source: sourceAuthority,
    },
  });
  if (result?.appended) {
    await transcript.publishUpdate({ messageId: result.messageId });
  }
});
```

`prepareMessage` 在重复检测后在事务外运行。返回 `undefined` 会抑制新的追加。重播保留存储的字节并跳过准备。所有者在准备之前捕获转录本版本，并在提交事务中再次检查；更改拒绝准备好的写入。它不会自动重播准备工作。将外部可见的副作用排除在准备之外，并且仅根据公认的结果进行发布。

`appendSessionTranscriptMessagesByIdentity` 仍然是已准备好的消息的原子批次。它不接受每条消息 `preparation`；当需要重复敏感的准备时，使用单例追加或写入序列。

新的作用域对接受的操作进行排序，并且每个追加独立提交。对于 actor 绑定的目标，它是乐观的：回调等待不会保留 actor 队列。读取捕获转录本版本，以后的新追加必须仍然匹配；成功追加会推进该版本。在另一个作者推进转录后，重复的重播可以返回其原始收据，但过时的范围会拒绝进一步的突变。

持久目标在回调等待期间保留其共享的工作写入器；已发布的持久本机兼容性保留其本机写入队列。他们的读取不会自动对以后的追加施加确切的版本前提条件。在每条路径上，等待的 `prepareMessage` 仍然会在新插入之前捕获并重新检查其自己的准备快照，如上所述。这些进程本地保留不排除外部进程或直接同步编写器。

回调失败不会回滚较早的追加，但会丢弃其排队的通知。在释放所有权之前，作用域会按照调用顺序加入已接受的操作，包括当其回调失败或在未等待追加的情况下返回时。回调完成后，保留的上下文方法会拒绝新的调用。

`preparation.source` 接受现有主机拥有的源断言。 Actor 和 Worker 支持的写入为所属事务准备其确切的行谓词，并在突变接纳和提交时重新检查其有界主机生命周期防护。通过公认的坚持，准备好的来源仍然保留。本机序列写入在新插入之前在事务内保留源的同步断言；他们没有获得单独的预制来源收据。通过 `composeSessionTranscriptWriteAssertion` 的包装器传递原始源能力；不要将其替换为不透明的数据库读取 lambda。保持其所有者处于活动状态，直到写入范围稳定。未准备好的源回调无法授权参与者绑定的写入。

范围捕获的作者权限与新消息的来源是分开的。阅读、重播、接受输入保管和发布仍然需要它。参与者范围保留准备好的权威及其确切的谓词，直到所有接受的工作和出版物都解决为止。

Codex镜像等效为`openclaw/plugin-sdk/codex-session-transcript-runtime`中的`withCodexSessionTranscriptMirrorWrite`；它具有相同的语义并保留消息序列收据。

旧的锁定函数 `prepareMessageAfterIdempotencyCheck` 和 `beforeFreshMessageCommit` 已弃用。持久目标保持其原始交易顺序，每个插件都会对此遗留合约发出一个警告。隐身目标（包括明确与参与者绑定的目标）拒绝旧形式，并显示错误命名 `withSessionTranscriptWrite` 和 `preparation.prepareMessage` / `preparation.source`。计划于 2027 年 1 月的第一个稳定版本中删除。 `prepareMessageAfterIdempotencyCheckAsync` 保持兼容的拼写；也将其迁移到 `preparation.prepareMessage`。

隐身目标选择内存参与者，包括没有显式绑定的调用。不存在隐身 SQLite 所有者或工人后备措施。此迁移不会更改架构或保留的持久数据，并且不需要更新步骤。

## <a id="await-session-transcript-persistence"></a> Await 会话记录持久化

使用 `openclaw/plugin-sdk/agent-sessions` 中期待的 `SessionManager` 方法。在读取新视图、发布其结果、开始相关工作或释放会话的写入权限之前等待每个变更：

```typescript
import { SessionManager } from "openclaw/plugin-sdk/agent-sessions";

const manager = await SessionManager.openAsync(target);
const entryId = await manager.appendCustomEntryAsync("plugin-checkpoint", {
  stage: "ready",
});
await manager.appendLabelChangeAsync(entryId, "Ready");
```

这里 `target` 是会话所有者准备的转录目标。异步调用保留该绑定以及调用者跨队列等待的实时权限。文件支持的 SQLite 持久性使用现有的写入工作线程和每个会话 FIFO 顺序。追加和持久树突变承诺在管理者采用提交的结果后解决；失败的写入会拒绝，而不是发布未提交的视图。父、叶、分支、防重复和返回条目语义保留在现有的转录本所有者中。在继续之前处理错误；不要通过调用同步方法重试不确定的写入。

| 已弃用的同步方法              | 等待更换                             | 解决结果                                                            |
| ------------------------------------------ | ----------------------------------------------- | -------------------------------------------------------------------------- |
| `appendMessage`                            | `appendMessageAsync`                            | 持久消息条目 ID                                                 |
| `appendMessageWithTranscriptAnchor`        | `appendMessageWithTranscriptAnchorAsync`        | 追加结果，包括条目 ID 和转录锚点                |
| `appendCompaction`                         | `appendCompactionAsync`                         | 压实入口 ID                                                        |
| `appendResetBoundary`                      | `appendResetBoundaryAsync`                      | 重置条目 ID                                                             |
| `appendCustomEntry`                        | `appendCustomEntryAsync`                        | 自定义条目 ID                                                            |
| `appendSessionInfo`                        | `appendSessionInfoAsync`                        | 会话信息条目 ID                                                      |
| `appendCustomMessageEntry`                 | `appendCustomMessageEntryAsync`                 | 自定义消息条目 ID                                                    |
| `appendLeafControl`                        | `appendLeafControlAsync`                        | 叶控记录                                                        |
| `appendLabelChange`                        | `appendLabelChangeAsync`                        | 标签条目 ID                                                             |
| `branch`                                   | `branchAsync`                                   | `void`；准备选定的分支                                       |
| `branchWithSummary`                        | `branchWithSummaryAsync`                        | 分支摘要条目 ID                                                    |
| `removeTrailingEntries`                    | `removeTrailingEntriesAsync`                    | 删除的条目数                                                  |
| `persist`                                  | `persistAsync`                                  | 现有的原始持久性结果；不将条目添加到加载的树中 |
| `prepareTranscriptRewrite`                 | `prepareTranscriptRewriteAsync`                 | 准备重写；也等待它的 `commit(...)`                          |
| `SessionManager.appendMessageToTranscript` | `SessionManager.appendMessageToTranscriptAsync` | 持久消息条目 ID                                                 |

Hydration 遵循相同的命名约定：将 `open`、`openBounded`、`openDetachedBounded` 和 `openModelContext` 替换为 `Async` 静态方法；将 `setSessionTarget` 和 `reloadPersistedTranscript` 替换为其 `Async` 实例方法。有关读取限制、取消和目标绑定规则，请参阅 [session 转录本水化](/plugins/sdk-runtime/agent#session-transcript-hydration)。同步 getter 读取准备好的视图。 `inMemory()` 和 `fromEntries()` 保持同步； `appendModelChange`、`appendThinkingLevelChange`、`createBranchedSession`已兑现承诺并保留名字。

将 `SessionManager.readSessionContext(target, read)` 替换为 `await SessionManager.readSessionContextAsync(target, read, { admission?, signal? })`。该读取器保留全保真消息，包括从模型上下文中省略的仅存储字段。它的消费者可能会返回一个承诺；当消费者安顿下来时迭代器关闭。持久读取器通过消费和清理保留其数据库所有者；数据库关闭、取消或撤销准入会拒绝读取。稍后的追加或重写不会使捕获的持久快照或已从中计算出的结果无效。随后的阅读会看到新的文字记录。 `session-manager-sync-context-read` 记录于 2026 年 10 月 4 日弃用同步读取器，每个进程发出一个警告，并在稍后宣布的稳定版本中删除。其现有同步结果在该窗口期间保持兼容。

隐身会话在存储访问或加载视图突变之前拒绝已弃用的同步持久性和上下文方法，包括没有显式参与者绑定的目标。该错误命名了等待的替换。持久同步兼容性不变。普通的 `resolveCurrentTurnEntryId()` 仅行走加载的视图。其 `includeOmittedCustomMessages` 选项已弃用；等待 `openAsync(target)` 并步行完整视图。

捆绑的 Codex 历史记录在屈服之前从 `openclaw/plugin-sdk/codex-session-transcript-runtime` 捕获 `captureCodexSessionContextReader(target, signal?)`。对于隐身模式，等待返回的具有相同目标和上下文使用者的阅读器。即使没有显式绑定，它也会捕获内存命名空间，并在使用提交的上下文时保留实时公开权限。持久目标返回 `undefined` 并保留其现有路线。同步Codex上下文读取器和验证器拒绝所有隐身目标；没有可重新打开的本机隐身数据库。

在自己的工作线程中投影持久历史记录的插件可以等待来自同一 SDK 子路径的 `readCodexSessionContextProjection(target, project, signal?)`。投影回调接收捕获的目标、准入和物理源。将这些事实传递给工作人员的 `readCodexSessionContext` 调用并返回 `{ value, version }`。保留的成绩单阅读器在返回结果之前验证结果，使最终版本和准入检查远离网关线程。同步验证导出保持兼容，直到稍后宣布稳定版本。

`branchAsync` 可以在选择分支之前通过读取工作器补充丢失的历史记录。 `resetLeafAsync(): Promise<void>` 通过排队会话写入命令内存中导航重置。这两个操作都不会自行写入叶记录；以下附加保留现有的分支语义。 `resetLeaf()` 仍然支持同步内存导航，并且并未弃用。

低级 `persistAsync` 镜像 `persist`：它写入提供的条目并返回其持久性结果，而不将该条目添加到加载的树中。当调用者需要视图采用时，首选追加方法；否则在读取结果树之前等待 `reloadPersistedTranscriptAsync()`。对于准备好的重写，请在使用重写视图之前等待 `prepareTranscriptRewriteAsync()` 和返回的 `commit(rewrittenEntryIds)`。

用户和自定义消息使用worker附加路径，包括带有`beforeFreshMessageCommit`的附加；这些选项不选择同步持久性。隐身存储使用参与者的内存后端，无需 SQLite 数据库或数据库工作线程。也等待其调用，以便相关发布保持相同的顺序。此迁移不会更改转录本格式、架构、保留或 update/Doctor 行为，并且不需要数据转换。

同步方法仍称为第三方兼容性适配器。他们保留现有的立即返回值，并为每个插件和每个进程的功能系列发出一个 `DeprecationWarning`，代码为 `DEP_SESSION_PERSISTENCE`，命名等待的替代品。 `session-manager-sync-persistence` 兼容性记录已于 2026 年 10 月 1 日在 `stable-deprecation-period` 下弃用它们。最终兼容日为 2026 年 12 月 31 日，并在 2027 年 1 月的第一个稳定版本中删除。捆绑的调用者使用等待的方法。采用新的 API 时，请勿添加同步回退。

对于 `SessionPendingInputReceipt`，将 `complete(outcome)` 替换为 `await completeAsync(outcome)`。用户轮转录记录器还提供可选的 `completeProcessingAsync(outcome)` 和 `waitForPendingInputSettlement()` 方法。在发布结果之前等待处理完成。完成记录处理与成绩单消耗分开；它不会追加或消耗待处理的输入。捆绑的调用者通过等待的方法完成。主机创建的记录器保留已弃用的同步 `completeProcessing` 适配器及其立即返回和事务语义，直到稍后发布稳定版本。每个插件使用它都会发出一次警告。将其替换为 `completeProcessingAsync`。当记录器没有异步同伴时，主机还接受插件提供的旧回调，而不会在异步失败或未定义的异步结果之后接受。

`finishPendingInput(disposition)`仍同步撤销即时​​保管。调用后，等待 `waitForPendingInputSettlement()`（可用时），然后再释放回合的会话许可。这连接了接受的完成和处置写入，包括收集的输入的每个原始来源。不确定的写入结果将被保留，并且不得通过任一回调重播。这些添加不会改变架构、保留或更新行为。

### <a id="await-extension-session-changes"></a> Await 扩展会话更改

扩展应该在阅读或发布其效果之前等待新方法：

| 已弃用的方法             | 等待更换                                | 解决结果                     |
| ----------------------------- | -------------------------------------------------- | ----------------------------------- |
| `ExtensionAPI.appendEntry`    | `ExtensionAPI.appendEntryAsync(customType, data?)` | 保留条目 ID                  |
| `ExtensionAPI.setSessionName` | `ExtensionAPI.setSessionNameAsync(name)`           | `void`                              |
| `ExtensionAPI.setLabel`       | `ExtensionAPI.setLabelAsync(entryId, label)`       | `void`； `undefined` 去除标签 |
| `AgentSession.setSessionName` | `AgentSession.setSessionNameAsync(name)`           | `void`                              |

旧方法保留其同步 `void` 合约以供第三方扩展。 `extension-session-sync-persistence` 记录其弃用和稳定弃用期移除门。添加的方法保留现有的源合同，同时允许主机在继续之前等待持久性失败和提交状态。已弃用的调用会发出相同的每系列一次 `DEP_SESSION_PERSISTENCE` 警告。

自定义扩展主机应通过 `ExtensionRunner.bindCoreAsync(...)` 提供 `ExtensionActionsV2`。绑定保持同步；所需的行动回报承诺。 `ExtensionRuntimeV2` 也需要这些操作，而原始 `ExtensionActions`、`ExtensionRuntime` 和 `bindCore(...)` 合约仍保持源兼容。 `createExtensionRuntime()` 保留其原始返回类型。在没有异步主机绑定的情况下调用的新异步 API 会拒绝并出现 `bindCoreAsync` 迁移错误，而不是回退到同步持久性。

### <a id="await-provider-replay-metadata"></a> Await 提供者重播元数据

使用 `ProviderSanitizeReplayHistoryContextV2` 实施 `ProviderPlugin.sanitizeReplayHistoryAsync`。其可选`sessionState`为`ProviderReplaySessionStateV2`；如果存在，它可提供所需的 `appendCustomEntryAsync(customType, data): Promise<string>` 功能。在返回清理后的重播消息之前等待元数据附加。当两个版本都存在时，主机更喜欢使用此挂钩，并且不会通过旧版本重试失败的异步挂钩。

对于 Gemini 重播，请使用 `openclaw/plugin-sdk/provider-model-shared` 中的 `sanitizeGoogleGeminiReplayHistoryAsync(ctx)` 或现有的 `buildProviderReplayFamilyHooks(...)` 构建器，它提供等待的钩子。同步 `sanitizeGoogleGeminiReplayHistory`、旧版 `sanitizeReplayHistory` 挂钩和 `ProviderReplaySessionState.appendCustomEntry` 仍然是第三方兼容性适配器。原始上下文类型保留其签名； V2 类型添加了所需的等待功能。这些表面被记录为 `provider-replay-sync-persistence`，以便在稍后宣布的稳定版本中删除。已弃用的调用会发出相同的每系列一次 `DEP_SESSION_PERSISTENCE` 警告。这家家庭建筑商保留了其对老年消费者的传统吸引力。等待的 Gemini 帮助程序传播元数据写入失败；旧适配器保留其历史上尽力而为的元数据行为。

## <a id="await-session-observer-and-progress-visibility"></a> Await 会话观察者和进度可见性

使用 `await context.sessionObserver.handleEventAsync(event)` 加入事件准入，使用 `await getCompanionSnapshotAsync(sessionKey, agentId?)` 加入当前同伴快照，使用 `await disposeAsync()` 加入关闭期间接受的观察者工作。连接可见性和删除保持同步。

回复调度挂钩应在每个可见性决策中等待 `event.shouldSendToolSummariesAsync()` 和 `event.shouldSendFullToolDetailsAsync()`。当前主机提供这两种方法；它们在原始事件类型中仍然是可选的，因此外部调用者仍然可以构造已发布的纯布尔事件。需要工作人员支持的可见性的插件应该报告旧主机上缺少的功能，而不是替换缓存的调度启动布尔值。

通道应注册 `onVerboseProgressVisibilityAsync` 而不是 `onVerboseProgressVisibility`。回调收到`() => Promise<boolean>`；在选择评论所有权之前，调度会等待注册。在渲染进度之前等待 getter，并在等待之后重新检查取消。在现有评论交付政策需要的情况下，评论所有权仍会被冻结；普通的实时可见性读数仍然新鲜。当提供两个回调时，异步回调优先。

已弃用的方法、布尔值和同步回调仍然可用，直到稍后宣布稳定版本和明确的中断版本批准为止。

## <a id="managed-node-workspace-acquisition"></a> 受管节点工作空间获取

Node-host 命令应在使用返回的工作空间之前等待 `context.acquireManagedWorkspaceAsync(request)`，并释放其在 `finally` 中的租约。主机在获取之前和之后检查确切的调用会话，如果调用关闭则释放延迟租约，并使准备好的工作空间 SQLite 保持在节点的事件循环之外。在开始外部工作之前继续检查命令取消。

2026.9.4 中提供的同步 `context.acquireManagedWorkspace(request)` 回调仍然可用于外部插件兼容性，但已弃用。它的返回值保持同步。捆绑命令使用异步同伴；要求同伴应报告不可用的主机功能的插件，而不是回退到同步采集。删除已弃用的回调需要明确批准并完成的普通稳定迁移窗口。 `stable-deprecation-period` 门本身并不授权删除或缩短现有的兼容性窗口。

## <a id="migrate-durable-ingress-files-through-doctor"></a> 通过Doctor迁移持久的入口文件

将遗留文件读取器保留在插件的 `PluginDoctorStateMigration` 中，通过其 Doctor 合约公开。在`collectBackupResources`中声明源目录和目标数据库；检测保持只读。运行时使用者使用共享的 SQLite 入口队列。

在修复期间，可信通道插件通过 `context.channelIngressQueues` 接收通道绑定访问。改变状态之前需要 `assertCurrent` 和 `importLegacyEntries`；当修复部分结束时，这些功能就会失效。在解析或规范化源之前，使用 `openclaw/plugin-sdk/runtime-doctor-migrations` 中的 `backupLegacyStateSource({ filePath, assertCurrent })`。它在私有、持久的 `.migrated` 文件（或编号的后继文件）中保留精确的字节，验证源身份，并返回快照和受保护的源清理。在发现期间，使用 `resolveLegacyMigrationSourcePath` 规范中断的声明文件名，删除原始路径的重复项，并将每个源发现的 `claimPaths` 传递给备份帮助程序。它在捕获快照之前通过共享迁移所有者恢复中断的声明；收据始终使用原始源路径。

使用规范化的 channel/account 身份调用 `importLegacyEntries({ accountId, entries })`。每个项目包含 `entry` 和 `sources`，其记录包含备份快照中的 `sourcePath`、`sha256` 和 `size`。主机将待处理条目或无负载失败的逻辑删除连同现有迁移分类账中的源收据一起提交。等效行和已完成的工作仍然具有权威性；冲突行不会收到完整的收据并保留其源文件。即使队列行被消耗或修剪后，收据也会抑制重复导入。更改的源字节形成不同的源代。历史接收和失败时间戳被保留。导入的行在导入时开始其突变年龄，因此挂起行修剪不能在第一次重播之前丢弃旧更新。

成功进口或确认事先收货后，请致电 `backup.removeSource(() => { result.markSourcesRemoved([backup.snapshot.sourcePath]); })`。共享所有者声明原始名称，记录其删除，然后删除声明。失败的簿记操作为下一个医生通行证保留了可发现的来源。回调必须是同步的。保留备份并报告与 `openclaw doctor --fix` 恢复指南的未解决冲突。确认提交后，当当前修复权限和保留的 source/backup 身份仍在验证时，仅清理失败可能会返回 `warningDisposition: "recoverable"`。冲突、失去权威和不确定的进口仍然是拒绝的原因。不要将导入实现为运行时 `enqueue`，后跟 `fail`：中断会将历史故障暴露为新的待处理工作。

## <a id="agent-roster-config"></a> Agent名册配置

作者代理名册为 `agents.entries`，由代理 ID 键入。条目不包含 `id` 字段或 `default` 标记；他们的插入顺序是花名册顺序。直接读取`cfg.agents.entries`，或者使用`openclaw/plugin-sdk/agent-runtime`中的`listAgentIds`和`resolveAgentConfig`。为您使用的表面明确选择所有者，例如系统工作的 `agents.defaults.systemAgent.agentId`。

创作的 `agents.list` 和布尔条目 `default` 标记将被拒绝。运行 `openclaw doctor --fix` 以迁移存储的旧配置； Doctor 还记录了迁移的多代理名册的明确所有权。

条目也不包含 `agentRuntime` 或 `compaction`。验证会拒绝这两者，因此编写的配置类型会忽略它们，并且 `resolveAgentConfig` 不再返回 `agentRuntime`。从每个模型 `models[ref].agentRuntime` 读取运行时策略，并从 `agents.defaults.compaction` 读取压缩设置。

`agents.defaults` 也不再类型 `imageGenerationModel`、`videoGenerationModel`、`musicGenerationModel`、`envelopeTimezone`、`envelopeTimestamp`、`envelopeElapsed`、`timeFormat`、`promptOverlays` 或`agentRuntime`；验证拒绝所有九个。使用具有内置包络和时间格式的 `mediaModels.image`、`mediaModels.video` 和 `mediaModels.music`、`userTimezone`、`plugins.entries.openai.config.personality` 以及每个模型的 `models[ref].agentRuntime`。这是仅类型 SDK 的更改；运行 `openclaw doctor --fix` 以迁移存储的配置。存储的 `agents.defaults.agentRuntime` 是当前 Doctor 拒绝的退役格式； [ 首先通过 OpenClaw 2026.9.5](/install/updating#upgrading-very-old-versions) 升级。

通过 2026.9.x 针对稳定的 SDK 版本构建的插件仍可能读取 [#113146](https://github.com/openclaw/openclaw/pull/113146) 中引入的已弃用的、不可枚举的运行时 `agents.list` 投影。它不再在内部键入或读取，不会由 `structuredClone` 序列化或复制，并计划在 2027 年 1 月 2 日之后删除。配置突变草稿必须读取和写入 `agents.entries`。此兼容性窗口不添加运行时警告。

## <a id="how-to-migrate"></a> 如何迁移

<Steps>
  <Step id="migrate-runtime-config-load%2Fwrite-helpers" title="迁移运行时配置 load/write 帮助程序">
    捆绑插件应停止直接调用 `api.runtime.config.loadConfig()` 和 `api.runtime.config.writeConfigFile(...)`。首选已传递到活动调用路径中的配置。需要当前进程快照的长期处理程序可以使用 `api.runtime.config.current()`。长期代理工具应读取 `execute` 内的 `ctx.getRuntimeConfig()`，以便在配置写入之前创建的工具仍然可以看到刷新的配置。

    配置写入通过事务辅助工具完成，并明确指定写入后的策略：

    ```typescript
    await api.runtime.config.mutateConfigFile({
      afterWrite: { mode: "auto" },
      mutate(draft) {
        draft.plugins ??= {};
      },
    });
    ```

    当变更需要干净地重启网关时，使用 `afterWrite: { mode: "restart", reason: "..." }`；仅当调用方负责后续操作并且有意抑制重新加载规划器时，才使用 `afterWrite: { mode: "none", reason: "..." }`。变更结果包含一个供测试和日志记录使用的类型化 `followUp` 摘要；网关仍负责执行或安排重启。

    `loadConfig` 和 `writeConfigFile` 已从插件运行时中删除。捆绑的插件和存储库运行时代码由 `pnpm check:deprecated-api-usage` 和 `pnpm check:no-runtime-action-load-config` 保护：新的生产插件使用彻底失败，直接配置写入失败，网关服务器方法必须使用请求运行时快照，运行时通道 send/action/client 帮助程序必须从其边界接收配置，并且长期运行时模块允许零环境 `loadConfig()` 调用。

    宽大的 `openclaw/plugin-sdk/config-runtime` 枪管已被移除。使用狭窄的子路径来完成作业：

    | 需求 | 导入 |
    | --- | --- |
    | `OpenClawConfig` 等配置类型 | `openclaw/plugin-sdk/config-contracts` |
    | 插件入口配置查找 | `api.pluginConfig` |
    | 配置合并 | 配置边界处的插件本地逻辑 |
    | 当前运行时快照读取 | `openclaw/plugin-sdk/runtime-config-snapshot` |
    | 配置写入 | `openclaw/plugin-sdk/config-mutation` |
    | 会话存储辅助工具 | `openclaw/plugin-sdk/session-store-runtime` |
    | Markdown 表格配置 | `api.runtime.channel.text.resolveMarkdownTableMode` |
    | 渠道组政策、提及要求和发件人工具政策 | `openclaw/plugin-sdk/channel-policy` |
    | 提供商默认组策略后备助手 | `openclaw/plugin-sdk/runtime-group-policy` |
    | 秘密输入解析 | `openclaw/plugin-sdk/secret-input-runtime` |
    | Model/session 覆盖 | `openclaw/plugin-sdk/model-session-runtime` |

    `api.pluginConfig` 是注册范围的，而不是实时 getter。替换 `resolveLivePluginConfigObject(...)` 需要通过运行时边界提供的当前配置来保持新鲜度。注入的 Markdown 解析器保留 channel/account 优先级和通道默认值； `markdown-table-runtime` 是私有的，JavaScript-only 主机导出。

    命名类型 `TtsMode`、`TtsPersonaConfig`、`TtsPersonaFallbackPolicy` 和 `SessionResetMode` 不变地移至 `config-contracts`。 Talk 配置、cron 存储操作、上下文可见性配置解析和危险名称检查缺乏完整的现代类型公共映射。调整插件拥有的行为或请求有针对性的公共合同；不要导入私有主机实现。

    捆绑的插件及其测试是针对广泛的扫描仪进行保护的，因此导入和模拟保留在它们所需的行为本地。

  </Step>

  <Step id="migrate-embedded-tool-result-extensions-to-middleware" title="将嵌入式工具结果扩展迁移到中间件">
    捆绑插件必须将仅适用于嵌入式运行器的 `api.registerEmbeddedExtensionFactory(...)` 工具结果处理程序替换为与运行时无关的中间件：

    ```typescript
    // OpenClaw runtime tools and Codex runtime dynamic tools (result may be
    // transformed). Codex-native tool results are also relayed for observation,
    // but their transformed output never reaches the model: the Codex
    // PostToolUse hook contract cannot replace a native tool response.
    api.registerAgentToolResultMiddleware(async (event) => {
      return compactToolResult(event);
    }, {
      runtimes: ["openclaw", "codex"],
    });
    ```

    同时更新插件清单：

    ```json
    {
      "contracts": {
        "agentToolResultMiddleware": ["openclaw", "codex"]
      }
    }
    ```

    在明确启用且每个目标运行时都已在 `contracts.agentToolResultMiddleware` 中声明的情况下，已安装的插件也可以注册工具结果中间件。未声明的已安装中间件注册会被拒绝。

  </Step>

  <Step id="migrate-approval-native-handlers-to-capability-facts" title="将审批本机处理程序迁移到功能事实">
    支持审批的通道插件通过 `approvalCapability.nativeRuntime` 以及共享的运行时上下文注册表来公开原生审批行为：

    - 将 `approvalCapability.handler.loadRuntime(...)` 替换为 `approvalCapability.nativeRuntime`。
    - 将批准特定的 auth/delivery 从传统 `plugin.auth` / `plugin.approvals` 接线移至 `approvalCapability`。
    - `ChannelPlugin.approvals` 已从公共通道插件合约中移除；将 delivery/native/render 字段移至 `approvalCapability`。
    - `plugin.auth` 仅保留用于通道 login/logout 流；核心不再读取那里的批准验证挂钩。
    - 通过 `openclaw/plugin-sdk/channel-runtime-context` 注册通道拥有的运行时对象（客户端、令牌、Bolt 应用）。
    - 不要从原生审批处理程序发送插件拥有的重新路由通知；核心负责根据实际投递结果发出已路由到其他位置的通知。
    - 将 `channelRuntime` 传入 `createChannelManager(...)` 时，应提供真实的 `createPluginRuntime().channel` 接口；不完整的存根会被拒绝。

    当前审批能力布局请参见[通道Plugins](/plugins/sdk-channel-plugins)。

  </Step>

  <Step id="audit-windows-wrapper-fallback-behavior" title="审核 Windows 包装器回退行为">
    如果您的插件使用 `openclaw/plugin-sdk/windows-spawn`，则未解析的 Windows `.cmd`/`.bat` 包装器现在将被拒绝，除非您明确传递 `allowShellFallback: true`：

    ```typescript
    // Before
    const program = applyWindowsSpawnProgramPolicy({ candidate });

    // After
    const program = applyWindowsSpawnProgramPolicy({
      candidate,
      // Only set this for trusted compatibility callers that intentionally
      // accept shell-mediated fallback.
      allowShellFallback: true,
    });
    ```

    如果你的调用方并不刻意依赖 shell 回退，不要设置 `allowShellFallback`，而应改为处理抛出的错误。

  </Step>

  <Step id="find-deprecated-imports" title="查找已弃用的导入">
    ```bash
    grep -r "plugin-sdk/compat" my-plugin/
    grep -r "plugin-sdk/infra-runtime" my-plugin/
    grep -r "plugin-sdk/config-runtime" my-plugin/
    grep -r "plugin-sdk/channel-lifecycle" my-plugin/
    grep -r "plugin-sdk/channel-message" my-plugin/
    grep -r "plugin-sdk/channel-reply-pipeline" my-plugin/
    grep -r "openclaw/extension-api" my-plugin/
    ```
  </Step>

  <Step id="replace-with-focused-imports" title="替换为集中导入">
    检查导出的名称和类型公共合约以及导入路径。一些函数被重命名；并非每个已删除的帮助程序或命名类型都有现代的公共替代品：

    ```typescript
    // Before (deprecated backwards-compatibility layer)
    import {
      createChannelReplyPipeline,
      createPluginRuntimeStore,
    } from "openclaw/plugin-sdk/compat";

    // After (modern focused imports)
    import {
      createChannelMessageReplyPipeline as createChannelReplyPipeline,
    } from "openclaw/plugin-sdk/channel-outbound";
    import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
    ```

    显式别名保留现有的 `createChannelReplyPipeline(...)` 调用站点。现代出口为`createChannelMessageReplyPipeline`；有关其余函数和命名类型，请参阅 [ 已删除的通道外观映射 ](/plugins/sdk-migration/import-paths#retained-channel-facade-mappings)。

    对于主机端辅助工具，应使用注入的插件运行时，而不是直接导入：

    ```typescript
    // Before (deprecated extension-api bridge)
    import { runEmbeddedAgent } from "openclaw/extension-api";
    const result = await runEmbeddedAgent({ sessionId, prompt });

    // After (injected runtime)
    const result = await api.runtime.agent.runEmbeddedAgent({ sessionId, prompt });
    ```

    其他旧版桥接辅助工具也采用相同模式：

    | 旧导入 | 现代等价项 |
    | --- | --- |
    | `resolveAgentDir` | `api.runtime.agent.resolveAgentDir` |
    | `resolveAgentWorkspaceDir` | `api.runtime.agent.resolveAgentWorkspaceDir` |
    | `resolveAgentIdentity` | `api.runtime.agent.resolveAgentIdentity` |
    | `resolveThinkingDefault` | `api.runtime.agent.resolveThinkingDefault` |
    | `resolveAgentTimeoutMs` | `api.runtime.agent.resolveAgentTimeoutMs` |
    | `ensureAgentWorkspace` | `api.runtime.agent.ensureAgentWorkspace` |
    | 会话存储辅助工具 | `api.runtime.agent.session.*` |

  </Step>

  <Step id="replace-broad-infra-runtime-imports" title="替换广泛的运行时导入">
    `openclaw/plugin-sdk/infra-runtime` 已被删除。为每个操作使用支持的表面：

    | 需求 | 类型化-公共导入或注入 API |
    | --- | --- |
    | 新系统事件生产者 | `api.runtime.system.enqueueSystemEvent` |
    | 系统事件快照检查和消费 | `openclaw/plugin-sdk/system-event-runtime` |
    | 心跳唤醒请求 | `api.runtime.system.requestHeartbeat` |
    | 通道活动遥测 | `api.runtime.channel.activity.record` 和 `.get` |
    | `createDedupeCache`, `resolveGlobalDedupeCache` | `openclaw/plugin-sdk/dedupe-runtime` |
    | 安全本地 file/media 路径、常规文件检查和符号链接父级检查 | `openclaw/plugin-sdk/security-runtime`（本身是一个已弃用的宽桶） |
    | `fetchWithSsrFGuard`，固定调度程序助手，`LookupFn`，`SsrFPolicy` | `openclaw/plugin-sdk/ssrf-runtime` |
    | 认证 request/resolution 类型 | `openclaw/plugin-sdk/approval-runtime` |
    | 审批回复负载和命令辅助工具 | `openclaw/plugin-sdk/approval-reply-runtime` |
    | `collectErrorGraphCandidates`, `extractErrorCode`, `formatErrorMessage`, `formatUncaughtError`, `readErrorName`, `toErrorObject` | `openclaw/plugin-sdk/error-runtime` |
    | `generateSecureToken`, `generateSecureUuid` | `openclaw/plugin-sdk/core` |
    | `parseFiniteNumber`, `parseStrictFiniteNumber`, `parseStrictInteger`, `parseStrictNonNegativeInteger`, `parseStrictPositiveInteger` | `openclaw/plugin-sdk/string-coerce-runtime` |

    OpenClaw 内部不再使用 `commandRequiresSecurityAuditSuppressionApproval`：抑制读取和写入遵循普通执行策略。 SDK 导出已与兼容桶一起移除。采用普通 exec 策略时删除此调用；没有替代的命令文本检测器。

    这些是特定于符号的映射，而不是整个桶的替代品。私有本地条目（例如 `heartbeat-runtime`、`delivery-queue-runtime`、`fetch-runtime`、`runtime-fetch` 和 `file-lock`）仅是 JavaScript- 主机导出，而不是类型化的第三方 API。 Heartbeat event/summary/visibility 帮助程序、待交付消耗、传输就绪性、并发性和文件锁定在这里没有等效的现代类型化公共映射。调整插件拥有的行为或请求针对缺失的主机功能的集中公共合同。

    `fetchWithSsrFGuard` 不是调度程序感知获取的直接替代品：它接受一个选项对象并返回 `{ response, finalUrl, release, ... }`，而不是一个裸露的 `Response`；调用者必须释放其资源。 `ssrf-runtime` 不会导出命名类型 `PinnedDispatcherPolicy`、`GuardedFetchOptions` 和 `GuardedFetchResult`。同样，`dedupe-runtime` 不会导出旧的 `DedupeCache` 或 `DedupeCacheOptions` 名称。显式迁移类型使用，而不是假设函数移动也会移动其类型。

    错误映射不包括`hasErrnoCode`、`isErrno`、`stringifyNonErrorCause`、`ErrorKind`、`detectErrorKind`；最后一个助手保留了遗留的子字符串分类。数字和随机映射同样不涵盖每个计时器、到期、十六进制、分数或整数助手。明确调整这些操作；删除的导入不再加载。

    从 `openclaw/plugin-sdk/system-event-runtime` 导入系统事件快照检查并使用帮助程序：使用 `peekSystemEventEntries` 进行检查，使用 `consumeSelectedSystemEventEntries` 来使用选定的快照。将旧版 `consumeSystemEventEntries` 别名替换为 `consumeSelectedSystemEventEntries`。当前快照对于一个排队事件带有不透明的 `id`。返回快照以供使用时，通过副本和序列化来保留它。旧版 ID-less 调用方保留结构匹配，这在队列搅动后可能会不明确。不要将 ID 视为在重新启动后持久或有效。

    文件锁嵌套的作用域为所有者。仅在同一逻辑操作中的嵌套获取时传入相同的 `reentrantOwner`；普通加锁时省略该参数。绝不要使用进程范围的常量，否则不相关的工作会错误地共享同一个临界区。

    捆绑插件受到扫描器保护，不得使用 `infra-runtime`，因此仓库代码无法回退到宽泛的统一入口。

  </Step>

  <Step id="migrate-channel-route-helpers" title="迁移通道路由助手">
    新的通道路由代码使用 `openclaw/plugin-sdk/channel-route`。较旧的路由键名称仍作为兼容性别名保留：

    | 旧辅助工具 | 现代辅助工具 |
    | --- | --- |
    | `channelRouteIdentityKey(...)` | `channelRouteDedupeKey(...)` |
    | `channelRouteKey(...)` | `channelRouteCompactKey(...)` |

    现代路由辅助工具会在原生审批、回复抑制、入站去重、 cron 投递和会话路由中一致地规范化 `{ channel, to, accountId, threadId }`。

    通道插件使用 `messaging.targetResolver.resolveTarget(...)` 进行目标 ID 规范化和目录缺失回退，当核心需要早期对等类型时使用 `messaging.inferTargetChatType(...)`，使用 `messaging.resolveOutboundSessionRoute(...)` 进行提供者本机会话和线程身份。

  </Step>

  <Step id="build-and-test" title="构建和测试">
    ```bash
    pnpm build
    pnpm test my-plugin/
    ```
  </Step>
</Steps>

## <a id="read-prepared-runtime-config"></a> 读取准备好的运行时配置

在需要当前发布配置的运行时处理程序中使用 `openclaw/plugin-sdk/runtime-config-snapshot` 中的 `readRuntimeConfig()`。它会在不打开存储的情况下读取准备好的快照，如果运行时尚未加载配置，则会报告缺少准备的错误。首选处理程序或工具上下文已提供的配置（如果可用）。

在冷准备边界，使用相同子路径的 `await captureRuntimeConfigAsyncReader()()` 并使用其返回的配置。现有所有者异步加载和发布快照；稍后调用 `readRuntimeConfig()` 直接读取。

SDK 上的 `runtime-config-snapshot` 和 `memory-core-host-runtime-core` 上的 `getRuntimeConfig(options?)` 仍可用于已发布插件的同步冷加载行为。它已被弃用，并针对每个插件和每个进程的运行时配置系列发出警告。将热读迁移到`readRuntimeConfig`，将冷准备迁移到`captureRuntimeConfigAsyncReader`。弃用发布后，将在稍后的稳定版本中删除；不需要存储配置迁移。

## <a id="await-strict-transcript-message-preparation"></a> 等待严格的抄本消息准备

对于`appendSessionTranscriptMessageByIdentityStrict`和`appendSessionTranscriptMessageByIdentity`，使用`preparation.prepareMessage`进行重复检测后的等待准备，使用`preparation.source`作为主机所有者的源权限。它们使用与 `withSessionTranscriptWrite` 相同的 [ 准备和冲突语义 ](/plugins/sdk-migration/how-to-migrate#await-locked-transcript-preparation)。严格附加仍然需要精确的会话 ID 并区分抑制和会话反弹。

发布的同步准备和提交前回调通过稍后宣布的稳定版本保留其持久目标行为，并为每个插件提供一次性警告。对于隐身和演员绑定的目标，他们会被拒绝。不需要存储的数据迁移或更新步骤。

## <a id="await-auth-profile-and-provider-availability-operations"></a> Await 身份验证配置文件和提供商可用性操作

外部插件应使用 provider/profile 标识符替换物理数据库路径显示。公共路径显示用例将在 2026 年 12 月 31 日后停用，并且不会替换公共异步路径。

捆绑插件可以等待来自私有 `openclaw/plugin-sdk/agent-sessions` 表面的 `AuthStorage.resolvePathForDisplayAsync` 以获取选定的数据库路径。它保留代理本地与共享存储选择，包括配置文件存在之前的迁移定位器，例如 `<selected-database-path>#<profile-id>`。 `resolveProviderAuthProfileMetadataAsync` 返回 profile/account 标识并且没有路径，因此它不能替代显示路径选择。

在发布模型选择、注册提供程序可用性或开始依赖于存储的凭据的工作之前，使用等待的身份验证 API。他们的数据库读取和写入通过现有的身份验证所有者和工作人员运行。保留相同的参数并等待替换的结果：

| SDK 子路径                              | 同步API                               | 等待更换                                  |
| ---------------------------------------- | --------------------------------------------- | ---------------------------------------------------- |
| `provider-auth`                          | `ensureAuthProfileStore`                      | `ensureAuthProfileStoreAsync`                        |
| `provider-auth`                          | `ensureAuthProfileStoreForLocalUpdate`        | `ensureAuthProfileStoreForLocalUpdateAsync`          |
| `provider-auth`                          | `upsertAuthProfile`                           | `upsertAuthProfileAsync`                             |
| `provider-auth`, `provider-auth-api-key` | `upsertApiKeyProfile`                         | `upsertApiKeyProfileAsync`                           |
| `provider-auth`                          | `isProviderApiKeyConfigured`                  | `isProviderApiKeyConfiguredAsync`                    |
| `provider-auth`                          | `isProviderAuthProfileConfigured`             | `isProviderAuthProfileConfiguredAsync`               |
| `provider-auth`                          | `listUsableProviderAuthProfileIds`            | `listUsableProviderAuthProfileIdsAsync`              |
| `provider-auth-runtime`                  | `resolveProviderAuthProfileMetadata`          | `resolveProviderAuthProfileMetadataAsync`            |
| `agent-runtime`                          | `loadAuthProfileStoreWithoutExternalProfiles` | `loadAuthProfileStoreWithoutExternalProfilesAsync`   |
| `agent-runtime`                          | `replaceRuntimeAuthProfileStoreSnapshots`     | `replaceRuntimeAuthProfileStoreSnapshotsAsync`       |
| `agent-runtime`                          | `loadAuthProfileStoreForSecretsRuntime`       | `loadAuthProfileStoreForRuntimeAsync`                |
| `agent-runtime`                          | `findPersistedAuthProfileCredential`          | `findPersistedAuthProfileCredentialAsync`            |
| `agent-runtime`                          | `resolvePersistedAuthProfileOwnerAgentDir`    | `resolvePersistedAuthProfileOwnerAgentDirAsync`      |
| `agent-harness-runtime`                  | `resolveModelAuthMode`                        | `resolveModelAuthModeAsync`                          |
| `models-provider-runtime`                | `formatModelsAvailableHeader`                 | `formatModelsAvailableHeaderAsync`                   |
| `image-generation-core`                  | `resolveCapabilityModelCandidates`            | `resolveCapabilityModelCandidatesAsync`              |
| `provider-selection-runtime`             | `resolveConfiguredCapabilityProvider`         | `resolveConfiguredCapabilityProviderAsync`           |
| `realtime-voice`                         | `resolveConfiguredRealtimeVoiceProvider`      | `resolveConfiguredRealtimeVoiceProviderAsync`        |
| `tts-runtime`, `agent-runtime`           | `getTtsProvider`                              | `getTtsProviderAsync`                                |
| `tts-runtime`                            | `isTtsProviderConfigured`                     | `isTtsProviderConfiguredAsync`                       |
| `tts-runtime`                            | `resolveExplicitTtsOverrides`                 | `resolveExplicitTtsOverridesAsync`                   |
| `agent-sessions`                         | `AuthStorage.forAgent`, `AuthStorage.create`  | `AuthStorage.forAgentAsync`                          |
| `agent-sessions`                         | `AuthStorage.reload`                          | `AuthStorage.reloadAsync`                            |
| `agent-sessions`                         | `AuthStorage.set`                             | `AuthStorage.setAsync`                               |
| `agent-sessions`                         | `AuthStorage.remove`, `AuthStorage.logout`    | `AuthStorage.removeAsync`, `AuthStorage.logoutAsync` |
| `agent-sessions`                         | `ModelRegistry.create`                        | `ModelRegistry.createAsync`                          |
| `agent-sessions`                         | `ModelRegistry.refresh`                       | `ModelRegistry.refreshAsync`                         |
| `agent-sessions`                         | `ModelRegistry.unregisterProvider`            | `ModelRegistry.unregisterProviderAsync`              |

已弃用的宽 `agent-runtime` 子路径还公开了 `ensureAuthProfileStoreAsync`；使用聚焦的 `provider-auth` 子路径进行新导入。

对于秘密分辨率读取，请使用 `agent-runtime` 中的 `loadAuthProfileStoreForRuntimeAsync` 以及 `readOnly: true` 和 `allowKeychainPrompt: false`，保留任何其他现有读取选项。核心助手 `loadAuthProfileStoreForSecretsRuntimeAsync` 不是公共 SDK 导出。

截至 2026 年 12 月 31 日，`resolveAuthStorePathForDisplay` 仍然是已弃用的 SDK 兼容性导出。其私有捆绑插件替代品 `AuthStorage.resolvePathForDisplayAsync` 保留了选定路径结果合约，而无需构建凭证存储；它不是公共 SDK 导入。当调用者需要 profile/account 元数据时，请使用 `provider-auth-runtime` 中的 `resolveProviderAuthProfileMetadataAsync`。

当现有 `agent-runtime` 集成需要持久凭证或使用事实而不需要运行时外部配置文件覆盖时，请使用 `loadAuthProfileStoreWithoutExternalProfilesAsync`。它在读取工作人员时保留继承的配置文件和选定的个人配置文件；它不使用 `ensureAuthProfileStoreAsync` 的运行时快照优先选择。

`resolveProviderAuthProfileMetadataAsync` 保留现有的可选 `profileId` 和 OAuth `accountId` 结果字段，并在没有配置文件匹配时返回空对象。使用它来准备提供程序发现元数据，而无需读取网关线程上的身份验证数据库。

准备凭证事实时，现有的 `agent-runtime` 集成也可以等待 `findPersistedAuthProfileCredentialAsync({ agentDir, profileId })`。它解析为存储的凭据或 `undefined`。它的同步副本仍然可用于实际效果边界上的当前凭证授权检查；先前准备的事实并不能取代该检查。

对于预备业主选择，请等待 `resolvePersistedAuthProfileOwnerAgentDirAsync({ agentDir, profileId })`。它保留继承的 OAuth 所有权：`undefined` 选择 shared/default 所有者，而独立拥有的本地配置文件解析为其代理目录。同步解析器仍然可以通过兼容性窗口供生效时间调用者使用。准备好的所有者目录不会授权以后使用凭据。

注入的运行时通过 `api.runtime.modelAuth.ensureAuthProfileStoreAsync` 和 `api.runtime.modelAuth.isProviderApiKeyConfiguredAsync` 提供相同的迁移。对于订阅 CLI 调度选择，请等待 `api.runtime.agent.resolveCliBackendDispatchEligibilityAsync` 代替 `resolveCliBackendDispatchEligibility`。

在使用其结果或开始相关读取之前等待每个更新插入。 `upsertAuthProfileAsync` 在规范编写者更新所选配置文件后解析；它保留相邻的配置文件。写入完成后，`upsertApiKeyProfileAsync` 解析为配置文件 ID。本地更新返回的存储是快照，而不是替换较新所有者状态的权限；使用所有者支持的突变 API 进行写入。

将 `agent-runtime` 的 `saveAuthProfileStore` 替换为 `provider-auth` 中的 `updateAuthProfileStoreWithLock`。它的更新器在写事务下接收所有者的当前存储；仅更改预期的配置文件并返回商店是否更改。在使用更新的凭据之前等待结果。这可以避免替换旧的全存储快照中的相邻写入。

`AuthStorage.forAgentAsync(agentDir, config)` 通过worker加载规范存储。在该实例上使用等待的突变和重新加载方法； `get`、`list` 和 `has` 读取其准备好的本地视图。 `getApiKey` 在解析凭据之前通过所有者刷新该视图。 `login` 和 `getApiKey` 保留其现有的异步签名。同步突变方法在通过已弃用的同步工厂创建的实例上仍然可用；异步实例使用所需的异步方法名称拒绝它们。通过将路径的代理目录传递到 `AuthStorage.forAgentAsync` 来迁移 `AuthStorage.create(path)`。

等待 `ModelRegistry.createAsync(authStorage, modelsJsonPath, options)` 和 `refreshAsync()` 以获取磁盘支持的目录。如果所有者已经捕获了插件目录，请使用 `ModelRegistry.fromCapturedSources` 和 `options.pluginCatalogs` 同步构建注册表，而无需打开其商店。从磁盘支持的注册表中删除提供程序时等待 `unregisterProviderAsync(name)`。捕获的会话分叉保留其直接的内存中行为。同步磁盘支持的方法在 2026 年 12 月 31 日之前仍然被弃用，并对本机读取发出警告，并在 2027 年 1 月的第一个稳定版本中删除。

在检查存储的凭据时，图像、音乐、视频、语音、实时语音和实时转录提供程序插件应实现 `isConfiguredAsync(context): Promise<boolean>` 而不是 `isConfigured`。能力选择等待这个钩子，并且当两个钩子都存在时更喜欢它。遗留的同步钩子仍然受支持；异步失败不会通过它重试。可用性和模型身份验证标签描述配置的选择，而不是实时服务运行状况或使用凭证的授权。

当配置需要存储凭据时，实时语音提供商还可以实施 `resolveConfigAsync(context)`。与 `resolveConfig` 相比，期待的实时选择器更喜欢它。通用 `resolveConfiguredCapabilityProviderAsync` 接受等待的 `resolveProviderConfig` 和 `isProviderConfigured` 回调，同时保留显式选择、自动排序和现有结果包络。

对于语音选择，请在使用所选提供商之前等待 `getTtsProviderAsync`，并在呈现配置状态结果之前等待 `isTtsProviderConfiguredAsync`。当模型或语音覆盖取决于选择的提供商时，请等待 `resolveExplicitTtsOverridesAsync`。这些保留了同步方法的选择并覆盖语义，同时允许在工作线程中运行存储的凭据检查。仅实现 `isConfigured` 的现有外部语音提供商仍受支持。

2026.10.1 中提供的同步 API 保留其签名、即时结果和完成时间，直至 2026 年 12 月 31 日（最后兼容日）。删除在 2027 年 1 月第一个稳定版本中发布，没有 SDK 主要版本。它们已被弃用；同步身份验证存储入口点对每个插件和每个进程的功能系列发出一次警告。普通的捆绑运行时调用者使用等待的 API。捆绑提供程序在 2026 年 12 月 31 日之前保留其原始同步就绪状态和配置回调，仅用于已发布的同步主机解析器。此迁移不会更改架构、存储格式、保留或更新行为。

本机 Web 搜索选择不再重复模型请求已拥有的凭证存在查找。因此，陈旧的可用性提示可能会选择本机搜索来搜索随后无法通过凭证准入的请求。模型请求仍然会在其外部影响之前解析并验证当前凭据；准备好的可用性永远不会取代权威检查。
