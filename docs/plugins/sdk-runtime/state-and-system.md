---
summary: "配置快照、SQLite-支持的插件状态、系统实用程序、事件和日志记录"
read_when:
  - "您需要适用于您的插件的持久键控或 blob 存储"
  - "您维护一个通过每个代理 SQLite 句柄写入的捆绑或官方插件"
  - "您正在重新启动时缓冲通道入口"
  - "您需要配置快照、系统实用程序、事件或范围记录器"
title: "插件运行时状态和系统"
sidebarTitle: "国家与制度"
---

运行时配置快照、持久的插件范围存储、系统实用程序、事件订阅和日志记录。 [Plugin 运行时助手](/plugins/sdk-runtime) 参考的一部分； [配置和实用程序](/plugins/sdk-runtime/config-and-utilities#config-loading-and-writes)涵盖更广泛的配置读取和写入指南。

## <a id="sqlite-maintenance-lifetime"></a> SQLite 维护寿命

使用 `configureSqliteConnectionPragmas` 的插件工作人员商店从 `openclaw/plugin-sdk/plugin-state-runtime` 接收带有 `stop(): Promise<void>` 的维护句柄。在现有 `close()` 检查点和数据库句柄的本机关闭之前等待 `stop()`。停止则关闭定时器准入并加入已接受的维护；它不会更改事务所有权或关闭数据库。同步 `close()` 仍然可用于打开失败和进程退出清理，而异步连接无法完成。 Memory Core 的私有影子索引所有者在耗尽其私有队列并关闭连接之前，使用其现有 `memory-core-host-engine-storage` 外观中的 `stopMemorySqliteWalMaintenance(db)`。

在替换托管事务中的派生索引之前，Memory Core 的发布工作线程使用私有 `memory-core-host-engine-schema` 外观中的 `stageMemoryIndexSchemaExtension(db)`。成功提交会重新发布已经承认的内存表合约，因此干净的重启可以重用它们的密封，而无需重复模式设置。完整索引出版物提供了替代品 FTS 的可用性；缺少必需的索引会使入场无法修复。回滚不会发布替换收据，并且不干净的重新启动仍会执行正常的完整性和模式准入。

内存核心的 `MemorySearchManager.statusAsync({ includeCounts: false })` 返回进程内提供程序和索引事实，无需数据库诊断。查询调用者可以将相同的选项传递给`readMemorySearchManagerStatus`；内置管理器忽略文件、块、源、存储和嵌入缓存计数。调用 `statusAsync()` 会保留完整的诊断结果，而传统管理器会保留现有的同步回退。

## <a id="state%2C-config%2C-and-system-namespaces"></a><a id="state-config-and-system-namespaces"></a> 状态、配置和系统命名空间

<AccordionGroup>
  <Accordion title="api.runtime.config">
    当前运行时配置快照和事务性配置写入。优先使用已经传入当前调用路径的配置；仅当处理器需要直接获取进程快照时才使用 `current()`。

    ```typescript
    const cfg = api.runtime.config.current();
    await api.runtime.config.mutateConfigFile({
      afterWrite: { mode: "auto" },
      mutate(draft) {
        draft.plugins ??= {};
      },
    });
    ```

    `mutateConfigFile(...)` 和 `replaceConfigFile(...)` 会返回一个 `followUp` 值，例如 `{ mode: "restart", requiresRestart: true, reason }`， 它记录了写入方的意图，而不会把重启控制权从 Gateway 手中夺走。

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

    `requestHeartbeatNow(...)` 在 [ 兼容性注册表中被跟踪为 `plugin-runtime-api-compat-aliases`](/plugins/compatibility#current-compatibility-areas)，`removeAfter` 日期为 2026-10-01；在新代码中使用 `requestHeartbeat({ source, intent, reason })`。

    `openclaw/plugin-sdk/system-event-runtime` 帮助程序解析 SDK 边界处的旧会话别名。将已解析的 `agentId` 与 `sessionKey` 一起传递给 `api.runtime.system.enqueueSystemEvent(...)` 以保留插件运行时的生命周期检查。独立调用者可以使用 `enqueueRoutedSystemEvent(text, { agentId, sessionKey })`。读取与`peekSystemEventEntries(sessionKey, agentId)`相同主人的事件；这使得每个代理的 `global` 队列保持独立。没有明确所有者的呼叫保留配置的所有者别名解析并拒绝不明确的代理选择。无法标准化为代理 ID 的显式所有者将被拒绝。

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

    使用 `generateSecureToken({ bytes: 32, redact: true })` 从 `openclaw/plugin-sdk/secure-random-runtime` 生成私有传输令牌。对象形式需要至少 16 个随机字节，并在返回之前注册生成的值以进行精确的诊断编辑。现有的数字调用保持其普通的 ID 行为。这不授予凭证访问或请求权限；保留实时协议值并仅在表示边界处进行编辑。

    ```typescript
    const verbose = api.runtime.logging.shouldLogVerbose();
    const childLogger = api.runtime.logging.getChildLogger({ plugin: "my-plugin" }, { level: "debug" });
    ```

  </Accordion>
  <Accordion title="api.runtime.state">
    状态目录解析和 SQLite- 支持的键控存储。

    ```typescript
    const stateDir = api.runtime.state.resolveStateDir(process.env);
    const store = api.runtime.state.openKeyedStoreV2<MyRecord>({
      namespace: "my-feature",
      maxEntries: 200,
      defaultTtlMs: 15 * 60_000,
    });

    await store.register("key-1", { value: "hello" });
    const claimed = await store.registerIfAbsent("dedupe-key", { value: "first" });
    const value = await store.lookup("key-1");
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

    对于命令拥有的写入，`store.register(key, value, { assertCurrent })` 和 `store.delete(key, { assertCurrent })` 通过工作器准备和准入携带捕获的所有者断言。断言保留在主机中；它永远不会序列化为存储的数据。撤销会阻止待处理的写入被接纳，而工作线程已经接受的写入仍会正常处理。

    键控存储在重新启动后仍然存在，并由运行时绑定的插件 ID 隔离。使用 `registerIfAbsent(...)` 进行原子重复数据删除声明：当密钥丢失或过期并注册时，它返回 `true`；当实时值已存在而不覆盖其值、创建时间或 TTL 时，它返回 `false`。当突变依赖于当前值时，将 `observe(...)` 与 `compareAndApply(...)` 结合使用；比较和变异在一个 SQLite 工作事务中运行。每个命名空间都拥有其 `maxEntries` 保留策略和可选的 TTL 过期时间；插件的命名空间之间没有聚合行限制。 JSON 值仅限于 UTF-8 编码的 JSON 的 1 个 MiB。默认情况下，对 `maxEntries` 的写入仅从该命名空间中删除最旧的活动行。设置 `overflowPolicy: "reject-new"` 以获得永远不会被驱逐的持久所有权记录：新密钥在命名空间限制下失败，而现有密钥仍然可更新。同级缓存中的增长不能拒绝或驱逐这些所有权记录。升级时无需迁移或清理现有数据库；它们存储的行被保留。

    过期值在 TTL 截止日期后立即变得不可用。命名空间突变会删除有界批次中的过期行；网关不运行定期键控状态到期扫描。不活动的命名空间可能会在磁盘上保留过期的行，直到稍后发生突变，而不使这些值可读或将它们计入实时容量。

    要保留记录而不进行基于计数的逐出，请使用带有 `retention: "retained"` 的异步开启器，而不是 `maxEntries`：

    ```typescript
    const history = api.runtime.state.openKeyedStoreV2<MyRecord>({
      namespace: "conversation-history",
      retention: "retained",
    });
    await history.register("room-a:0000000042", { value: "hello" });
    ```

    `OpenKeyedStoreOptions` 仍然是有界期权类型。 `OpenRetainedKeyedStoreOptions` 描述保留的设置，`OpenAsyncKeyedStoreOptions` 是异步开启器的联合。同步开启器仅接受有界设置。

    保留存储使用内部 `@retained.` 命名空间前缀下的现有 SQLite 表，该前缀不能与调用者提供的有效命名空间冲突。它们不消耗有界存储行配额。它们拒绝 `maxEntries`、`overflowPolicy`、默认 TTL 和每次写入 TTL；记录将一直保留到明确删除或清除为止。每个值 JSON 限制仍然适用，并且该插件拥有磁盘增长和删除策略。调用者提供的命名空间保留其现有的验证和长度限制。

    `entriesInKeyRange({ keyStartInclusive, keyEndExclusive, limit, order })` 读取词法键范围，包括下限，不包括上限。 `limit` 必须是正安全整数； `order` 默认为 `"asc"` 或 `"desc"`。存储在返回值之前应用排序和限制。当本机标识符不按词法排序时，对可排序键进行编码。使用有界页面而不是 `entries()` 来读取不断增长的保留存储。

    `moveEntriesFrom({ namespace, entries: [{ sourceKey, targetKey }] })` 将同一插件拥有的有界命名空间中的最多 10,000 行提升到接收保留存储中。一项事务重新读取并移动源记录，而不解码或重写其有效负载。现有的目标记录获胜，丢失的源记录不执行任何操作，并且在完成移动后重试不会产生任何额外效果。带有 TTL 的实时源记录拒绝整个操作；过期记录不会恢复。返回的数字对已确定的源行进行计数。此操作不会创建另一个表或需要 Doctor 步骤。

    这两种方法在现有适配器的公共存储类型中仍然是可选的。使用保留存储的插件必须需要它所需的主机功能；不要默默地回退到驱逐存储或通过不同的路径重试失败的读取。保留的运行时在其拥有的功能关闭后处理拒绝操作。

    <Warning>
    保留存储不会添加数据库版本围栏。较旧的 OpenClaw 二进制文件仍然应用较旧的缓存和插件配额规则，并且不得写入扩展保留状态。降级前，恢复兼容的更新前备份；单独匹配 SQLite 架构版本并不能建立安全保留行为。
    </Warning>

    `lookupMany(keys)` 是一种可选的密钥存储功能，每次调用最多可存储 10,000 个精确密钥。结果与输入具有相同的长度和顺序，包括重复项。每个位置都是 `Result<T | undefined, PluginStateStoreError>`：成功时为 `{ ok: true, value }`，包括用于丢失或过期密钥的 `value: undefined`，或用于损坏存储的 JSON 的 `{ ok: false, error }`。空请求返回 `[]`。密钥使用与 `lookup` 相同的修剪和 512 字节 UTF-8 限制；无效密钥或过大的请求在读取之前失败并显示 `PLUGIN_STATE_INVALID_INPUT` 和操作 `lookup`。数据库获取和查询错误导致整个调用失败。 Corrupt-JSON 错误在其每键结果中保留 `lookup` 错误代码和操作。仅当读者到达该位置时检查每个结果，如果不是 `ok` 则抛出 `result.error` ；这可以让读取器停在较早的丢失或无效块上，而不会引发以后的损坏错误。每次调用都在同一插件和命名空间中使用一个到期截止日期和一个 SQLite 选择，而不会创建丢失的数据库。单独的调用（包括元数据读取）不共享快照；分块格式必须保留其生成、摘要和读取器生命周期检查。

    当前主机工厂提供 `lookupMany`，但公共存储类型使其对于现有第三方适配器和声明的旧主机版本保持可选。支持这些主机的插件必须检查该方法并在不存在时使用其现有的顺序 `lookup` 路径；切勿重试通过该路径失败的批量读取。 Matrix、Microsoft Teams 和语音呼叫保留此兼容性，直到其声明的最低主机提供该功能。不要仅仅为了检测此方法而从旧主机导入新的帮助程序导出。

    `count()` 返回运行时绑定插件和命名空间中实时存储的行数，而无需加载或解码其 JSON 值。当行的到期时间戳等于或早于调用截止时，行就到期。计数不会删除过期行、创建丢失的数据库或加入可写数据库生命周期。损坏的 JSON 仍占据活动行并被计数； `lookup` 和 `entries` 保留其解码错误。数据库获取和查询失败通过操作 `count` 传播。计数和稍后的写入是单独的操作；写入仍然负责强制执行容量。

    当前主机工厂提供 `count`，但对于受支持的旧主机和适配器，它在公共异步和同步存储类型中仍然是可选的。支持这些商店的呼叫者可以使用 `store.count ? await store.count() : (await store.entries()).length`；同步调用者省略 `await`。后备保留了旧存储的枚举和解码行为。仅当该方法不存在时才回退，而绝不会在计数失败后回退。

    使用 `openKeyedStoreV2<T>(...)` 并等待其方法。 `openSyncKeyedStore<T>(...)` 保留已发布的同步返回值和错误，直至 2026 年 12 月 31 日（最后兼容日）。删除在 2027 年 1 月第一个稳定版本中发布，没有插件 SDK 主要版本。请参阅 [同步密钥存储迁移](/plugins/sdk-runtime/state-and-system#synchronous-keyed-store-migration) 和 [ 完整迁移映射](/plugins/sdk-migration/sqlite-async#keyed-state)。

    `openBlobStore<TMetadata>(...)` 将有界二进制有效负载存储在共享 SQLite 中，无需使用 base64 或文件 sidecar。它需要每个条目、每个命名空间字节和行限制；在 API 边界复制字节数组；并列出元数据，而无需加载每个 BLOB。 `register(...)` 是显式更新插入，包括过期密钥。 `registerIfAbsent(...)` 提供碰撞安全创建：过期密钥将保持占用状态，直到其所有者使用 `deleteExpiredKey(key)` 或 `deleteExpired()` 声明它，并保留在 SQLite 提交后删除相关命名工件所需的元数据。任何带有 TTL 的行都是暂时的，甚至在过期之前就被排除在 backup/restore 之外；省略 TTL 以获得持久、可恢复的状态。主机熔丝将每个 BLOB 限制为 100 MiB，每个插件限制为 512 MiB 物理存储的 BLOB，每个插件限制为 50,000 个物理存储行，包括等待所有者清理的过期行。当外部物化不能通过替换或驱逐而默默地孤立时，请将 `registerIfAbsent(...)` 与 `overflowPolicy: "reject-new"` 一起使用。

    Blob 突变使用共享的 SQLite 工作线程，并在一笔事务中保留配额检查和更改。 `lookup` 和 `entries` 使用保留的只读工作路径。失踪的商店仍然缺席。普通未选择的读取观察独立提交的数据；不相关的缓存本机游标可以保留较旧的视图。显式选择的快照在完成过程中保留其私有源。在发布相关工件或删除其存储之前等待所有方法。共享读取器准入是有界的：按顺序或有界并发处理清单，并在报告批处理失败或完成关闭之前加入每个已启动的操作。工作器错误保留 `PluginBlobStoreError` 分类、操作、路径和因果错误。字节复制、元数据序列化和完整结果实现仍然使用调用者内存；这不是流媒体 BLOB API。

    `openChannelIngressQueue<TPayload>(...)` 打开一个持久的入口队列，其范围仅限于调用插件，用于缓冲重新启动时需要至少处理一次的入站事件。当过时声明恢复使用 `shouldRecover` 时，如果应隔离损坏的声明有效负载，还需要提供 `shouldRecoverCorrupt`：其独立于有效负载的声明身份允许插件在队列逻辑删除行之前保留实时所有者和通道策略。

    具有可撤销的每个事件权限的来源需要 `queue.enqueueAuthorized(id, payload, { assertCurrent, receivedAt?, laneKey?, metadata? })`。它的同步断言是由队列所有者在事务和最终提交准入时组成的；回调永远不会跨越存储的 JSON。该方法仅对于现有的外部队列实现是可选的。需要它的源必须在它不存在时拒绝，而不是退回到无人看守的 `enqueue`。撤销一个源不会废弃共享帐户队列。

    主机入口队列提供 `listUnsettled({ orderBy })`，从共享状态代理中的一个快照返回 `{ pending, claims }`，并按队列突变排序。共享排水沟使用这种连贯视图，因此在检查期间发布的索赔不会让后来的事件超过其车道头。该方法对于现有外部队列实现仍然是可选的，直到单独宣布的兼容性窗口结束；只有那些实现保留单独的 `listPending`/`listClaims` 路径。失败的快照读取永远不会回退到单独的读取。

    2026.8.1. 中删除了插件状态租约。使用插件范围的键控存储 （`openKeyedStoreV2`） 来实现有界持久状态，并将其纯数据命令用于原子数据库工作。

    `openChannelIngressDrain(...)` 在该队列上打开与通道无关的核心工作线程（或者在未提供任何队列时创建一个队列）。 Drain 拥有过时声明恢复、每通道声明序列化、采用时完成或分派返回时完成、retry/dead-letter 处置、可选的预采用取代以及声明→采用停顿超时。使用 `turnAdoptionLifecycle`（通过来自 `plugin-sdk/channel-outbound` 的 `bindIngressLifecycleToReplyOptions`）将声明所有权电汇到回复生成中。通道插件保留接受端排队、通道派生、不可重试分类以及任何取代授权策略。

    共享入口监视器在关闭期间保持其排水活动，直到完成、释放和已经开始解决的故障写入。如果写入失败，而排出方仍拥有该声明，则 shutdown 会报告错误并保留该所有权。

    `openBlobStore`、`openKeyedStoreV2`、`openChannelIngressQueue` 和 `openChannelIngressDrain` 可用于每个加载的插件，包括工作区插件、`plugins.load.paths` 和链接安装。保留的 `openKeyedStore` 和 `openSyncKeyedStore` 兼容性开启器具有相同的可用性。运行时将每个句柄绑定到调用插件的命名空间；现有的配额、保留和溢出政策、范围检查和工人所有权仍然适用。此更改不需要来源修复或数据迁移。

    `plugins inspect` 和启动来源警告仍然报告信任信息。挂钩代理轮流和网关范围提升仍然需要信任；有关这些功能，请参阅 [Plugin 运行时信任拒绝 ](/tools/plugin#plugin-runtime-trust-refused)。

  </Accordion>
</AccordionGroup>

## <a id="prepared-keyed-state-effect-guards"></a> 准备好的键控状态效果器

`preparePluginStateRead(store, key)` 中的 `openclaw/plugin-sdk/plugin-state-runtime` 为主机创建的存储准备当前读取。返回`{ read, release }`；在工具、披露或外部发送之前调用 `read()`，并在 `finally` 中调用 `release()`。当所有者没有已发布的行或缺席时，准备工作将使用状态工作人员。最终读取使用内存，遵循提交的替换和删除，并尊重到期和运行时退休。

排队的突变在提交之前拒绝这些读取。已知的回滚保留了先前的事实；复合绑定清理在释放拒绝之前发布删除或补偿。未知结果会导致该数据库身份的效果防护被拒绝，直到网关重新启动。普通的描述性读物仍然可用。

自定义存储适配器返回 `undefined`，因为主机无法观察其写入器。对于这种情况，请保留适配器的权威读者。失败的准备读取是一种拒绝，永远不允许回退到旧值。准备及其接收不会取代帐户、会话化身或其他独立的安全检查。

保留的同步效果防护可以在本机读取之前使用主机创建的异步存储调用 `assertPluginStateReadAvailable(store)`。这会检查相同的挂起、未知和运行时状态，而不依赖于缓存的行。在效果边界使用它，而不是在作者自己的准入回调内使用。

## <a id="synchronous-keyed-store-migration"></a> 同步密钥存储迁移

自 2026 年 9 月 11 日起，`api.runtime.state.openSyncKeyedStore` 和 `PluginStateSyncKeyedStore` 已弃用。现有的 `createPluginStateSyncKeyedStore` 工厂名为 `plugin-state-sync-keyed-store` 兼容性适配器。在稳定的弃用期内，现有方法仍受支持。在以后的稳定版本中删除需要支持的外部插件迁移。

使用具有相同命名空间和选项的 `api.runtime.state.openKeyedStoreV2`，然后等待其操作。 opener 本身仍然同步返回一个 store。两个接口都使用相同的插件范围数据，因此不需要数据迁移。

没有绑定插件 API 的延迟运行时代码可以从 `openclaw/plugin-sdk/plugin-state-store-runtime` 导入 `createPluginStateKeyedStoreV2`。传递插件 ID、相同的命名空间选项以及所有者所需的 `{ assertCurrent }` 功能，然后等待每个操作。保持此导入惰性，因为工厂会加载状态数据库运行时。

```typescript
const store = api.runtime.state.openKeyedStoreV2<MyRecord>({
  namespace: "my-feature",
  maxEntries: 200,
});
await store.register("key-1", { value: "hello" });
const value = await store.lookup("key-1");
```

对于代表当前工具调用或其他可撤销操作的写入，请将主机提供的断言与操作的权限检查绑定在一起：

```typescript
const actionStore = api.runtime.state.openKeyedStoreV2<MyRecord>(
  {
    namespace: "my-feature",
    maxEntries: 200,
  },
  {
    assertCurrent: () => {
      context.assertInvocationCurrent();
      assertActionAllowed();
    },
  },
);
await actionStore.register("key-1", { value: "hello" });
```

返回的 `PluginStateKeyedStore<T, 2>` 是到相同命名空间、设置和插件生命周期的不可变绑定。它公开了纯数据操作；它没有 `update`、`deleteIf` 或重新绑定方法。断言保留在主机上，并在读取后以及事务和写入的最终提交准入（包括有界存储）时进行检查。为每个动作创建单独的视图；不要保留一个调用者对共享服务的权限。旧版 `PluginStateKeyedStore<T>` 通过其可选的 `withCurrent` 方法使此功能对于较旧的主机和适配器保持可选。当该能力不存在时，需要该能力的操作必须拒绝。 V2 开启器绑定插件生命周期，无需单独操作；其可选权限添加了操作的撤销检查。工作人员完成包括承诺的事实安装。

`observe` 和比较冲突返回观察结果而不提交请求的突变；他们在返回该数据时还需要当前权限。

在提交授予之前拒绝会回滚突变。一旦提交被授权，以后的撤销不会将已确定的写入变成拒绝。下次外部影响前重新检查权限，并保存记录结果；切勿重试已提交或未知的写入来补偿撤销。运行时适配器可以使用 `openclaw/plugin-sdk/sqlite-runtime` 中的 `hasSqliteWorkerOutcomeUnknown(error)` 通过规范错误原因识别未知结果。对于未知的结果，废弃不确定的缓存视图，而不是尝试协调读取；仅仅拒绝并不能证明本地工作已经停止。

异步存储的 `update` 更新程序和 `deleteIf` 谓词是已弃用的兼容性方法。它们仍然在包含权威读取和突变的事务内的主线程上同步运行，并在 2026 年 12 月 31 日之前保持支持，并在 2027 年 1 月的第一个稳定版本中删除。实际的遗留调用会为每个网关进程的每个插件和功能系列发出一个弃用诊断；导入 SDK 不会发出警告。同步方法在返回之前仍然提交并安装它们的事实。

捆绑的缓存、重复数据删除存储和 Discord/Telegram 绑定持久性直接打开 V2 接收器。帐户范围的对话绑定管理器还返回一个仅异步的 V2 接收器；其已弃用的工厂单独为同一所有者提供同步方法。本机会话初始化使用 `linkAsync`，包括通过上游链路工作线程进行精确身份回滚。

最终的 ClickClack 和 Codex binding/revocation 检查仍然使用本机读取，其中复合绑定结算使事实无效而不发布其替换。有界观察缓存对于冷键或被逐出的键来说并不是完整的权限。这些安全读取仍然是迁移债务，直到所有者可以发布每个替换和删除；他们必须继续立即否认已撤销的行动。

即使在打开调用之外调用保存的方法，运行时绑定存储也会保留其插件标识以进行诊断。在调用这些方法之前完成异步计划；不要使它们的回调异步或用单独的查找和写入替换原子操作。从更新程序返回 `undefined` 会使条目保持不变。 `update`、`deleteIf`、`lookupMany` 和 `count` 在公共存储类型中仍然是可选的，因此保留对受支持的旧主机和第三方适配器的功能检查。

保留已弃用的缓存突变的线程绑定适配器可以从 `openclaw/plugin-sdk/thread-bindings-session-runtime` 导入 `warnPluginSdkDeprecation`。使用静态 `family`、`method` 和 `replacement` 描述以及已知的 `pluginId` 和准确的 `compatibility` 描述在旧操作中调用它。它共享主机的警告预算；推迟持久性的缓存突变必须描述该时间，而不是声明写入已经提交。

对于新的原子突变，请使用 `observe` 和 `compareAndApply`，它们在 V2 存储上是必需的，并且仅在旧结构存储合约中是可选的。 `observe(key)` 通过规范的可写数据库准入准备突变，并可以创建或打开状态。返回`{ value, comparison }`；使用 `lookup` 进行简单的、非创建性的读取。当调用者准备下一个值时，没有事务保持打开状态。

`compareAndApply(key, comparison, intent, options?)` 在同一工作人员拥有的事务中更改当前活动行之前会对其进行比较。不透明的比较绑定实际的数据库、插件、命名空间、密钥、存储的 JSON 字节、创建时间和到期时间。它比较内容和元数据；它不是化身令牌或行动许可。另一个存储或密钥拒绝与 `PLUGIN_STATE_INVALID_INPUT` 进行比较。

可选的 `conditions` 数组包含同一插件命名空间中其他键的最多 100 个观察值。在应用意图之前，工作人员会在目标的交易中检查它们。条件冲突返回目标的当前观察结果；在准备另一次尝试之前重新读取所有相关输入。这保留了跨键谓词，而无需在异步准备期间发送闭包或保持事务打开。

意图很明确：

- `{ operation: "update", action: "set", value, ttlMs? }` 写入定义的值并刷新其创建时间和 TTL，即使该值未更改也是如此。
- `{ operation: "update", action: "keep" }` 保持条目不变，同时保留可写准入和现有命名空间到期扫描。
- `{ operation: "delete", action: "delete" }` 删除匹配的实时条目。
- `{ operation: "delete", action: "keep" }` 保留可写准入，无需到期扫描或条目突变。

结果是 `{ status: "applied" }`、`{ status: "unchanged" }` 或 `{ status: "conflict", current }`。冲突不会改变插件状态行并提供新的观察结果。观察冲突后过期的条目；丢失和过期的条目否则共享逻辑缺席语义。现有的配额、驱逐令、验证和存储错误仍然适用。

在发生显式冲突时，插件可能会重新计算 `current.value` 的命名纯决策，然后重试。准备好时钟、随机性和决策之外的外部影响。切勿重试传输失败、未知结果或任意回调。接受遗留存储时，请在使用此功能之前检查两个可选方法；不存在由单独的查找和无条件写入组成的安全回退。

对于跨越键或命名空间的完整操作，请使用可选的 `store.createOperation` 功能。其命名的插件模块在现有共享状态工作线程内部运行，所有读取和写入都在一个同步事务中进行。工厂在任何等待之前捕获已承认的插件生成、物理状态源、命名空间句柄和实时操作权限。

```typescript
type MoveOperations = {
  move: { input: { key: string }; output: boolean };
};
const operation = source.createOperation<MoveOperations>(
  [source, destination],
  {
    moduleName: "transfer-operation-api.js",
    exportName: "executeTransfer",
  },
  { assertCurrent },
);
const receipt = await operation.execute(
  { type: "move", input: { key } },
  { writeStores: [0, 1], watchStores: [1] },
);
receipt.assertCurrent();
```

工作程序导出接受键入的命令和 `PluginStateOperationTransaction`。其同步 `lookup`、`lookupMany`、`entries`、`set` 和 `delete` 方法按索引对捕获的存储进行寻址。重复读取共享事务的行视图； `lookupMany` 一起选择未缓存的键。写入更新以查看和保留现有 JSON 限制、命名空间配额、驱逐和 TTL 规则。主机拒绝 `writeStores` 之外的写入，保留返回后使用的事务方法以及 Promise 或 thenable 处理程序结果。失败会回滚整个操作。

将操作入口点放在插件包根目录为 `*-operation-api.ts`（或编译后的 JavaScript）。它们是通过承认的插件生成捕获的，并由现有的捆绑和独立插件构建所有者包含。工作人员在进入交易之前加载捕获的模块。捕获的插件所有者解析其所选源或构建系列中的顶级文件名，包括 `.js` 对 TypeScript 源的引用。路径和 URL 被拒绝。它不会通过 id 重新发现当前插件、序列化闭包或打开另一个数据库所有者。插件不需要进程运行时导入或它们自己的源、捆绑构建和独立包目录布局知识。

对于捆绑插件，捕获遵循所选源或构建系列中的所有操作入口点及其实际导入。编译到这些文件中的包也不需要仅仅因为源清单声明了它们而安装的运行时副本。外部导入仍然需要它们的运行时依赖项。这些条目共享一个捕获的生成，包括它们的共同依赖项，并且恢复会保留这些字节，直到最后一个拥有的实例释放它们。编译的条目还可以从其所属的主机包中捕获共享块。当 Doctor 在更新期间加载插件时，这也适用。

空的 `writeStores` 数组选择非创建读取。当不存在的物理数据库具有定义的结果（包括显式 `undefined`）时，提供 `missingValue`；主机返回该值而不创建数据库或执行处理程序。没有 `missingValue` 的缺席源拒绝呼叫。

网关拥有在线数据库突变。操作收据使用其进程内写入发布、待修改失效、到期和生命周期状态。它们不会轮询 SQLite 的外部提交或在主线程上重新读取行。在稍后的外部效果之前立即调用 `receipt.assertCurrent()`。 `watchStores` 选择该效果所依赖的命名空间；对其他命名空间的不相关写入不会使其失效。排队的突变会使旧的收据在本机提交之前失效。未知的结果永远不会授权重播。当调用者关闭时，接受的写入仍然会稳定下来；返回的历史结果并不授予新效果的权限。

当编写具有更多存储句柄的延续时，请在工厂权限选项中传递其原始 `sourceReceipt`。主机在等待之前验证所有参与者都属于该捕获的源；新环境选择无法重定向恢复操作。

`createOperation` 在版本 1 和版本 2 存储类型中仍然是可选的，因此已发布的主机和第三方适配器保持源兼容。仅当该功能不存在时，在等待之前才选择指定的兼容性路径。工作人员、权限或模块加载失败永远不会选择同步回退。无需更改架构、保留、持久性或最低主机版本。

`registerIfAbsent` 和可选的 `deleteIfEqual(key, expected)` 操作使用共享状态 SQLite 工作线程。 `deleteIfEqual` 接受字符串、有限数字、布尔值或 `null`，并将其与删除时同一事务中解码的实时值进行比较。丢失或过期条目返回`false`；格式错误的存储 JSON 仍然是类型存储错误。这些操作与旧同步存储共享现有数据、限制和过期规则。

`register`、`lookup`、`lookupMany`、`consume`、`delete`、`entries`、`count` 和 `clear` 也在同一工作线程中执行 SQLite。读取保留丢失存储行为而不创建数据库。 `lookupMany` 对每个输入键返回一个结果，包括重复项和每个键损坏值错误。 `consume` 原子读取和删除；解码失败会回滚删除。存储创建、输入验证和 JSON 序列化保留在调用线程上。

基于回调的`update`和`deleteIf`保留原生同步事务；不要用单独的查找和写入替换其中任何一个。工作器错误保留 `PluginStateStoreError` 代码、操作和路径。 OpenClaw 状态错误使用其现有的编解码器；其他本地原因保留有限的因果消息、错误代码和数字 `errno` 值。结构化文件日志包括在 `owner` 中构造插件状态错误的进程 ID、线程 ID 和 OpenClaw 版本，以及嵌套原因详细信息。命令分派之前的失败将被包装在调用者线程上。本机原因代码在这些记录中显示为 `errorCode`；内存中错误保留其原始 `code`。现有的日志编辑仍然适用。任意自定义属性和原始堆栈不会跨越工作边界。 `PLUGIN_STATE_OPEN_FAILED`可以在SQLite打开之前描述被拒绝的入场；在诊断文件错误之前检查原因和所有者。

Discord 和 Slack 在放弃存在冷却时间时使用标量条件删除。在没有该可选功能的旧主机上，他们会让其过期，而不是冒着删除较新保留的风险。

FaceTime 按调用顺序保留挂起的拨号快照，并使用工作器比较来仅清除匹配的拨号。帮助程序调度等待持久意图，关闭连接接受持久性。其支持的 2026.9.4 主机无需比较，保留原子 `deleteIf` 清理；失败的工作操作永远不会选择该兼容性路径。命名空间、存储记录和保留保持不变，因此此切换不需要数据迁移。

每个加载的插件都可以使用旧版和版本化的运行时开启器。实际遗留操作警告如上所述；开店不警告。仅上面标识的操作在工作线程上执行。在此迁移期间，回调执行、存储的数据和保留均保持不变。

## <a id="per-agent-sqlite-writes"></a> Per-agent SQLite 写入

已经使用私有 `sqlite-runtime` 外观的捆绑插件和官方插件使用具有所需实时权限的 `openOpenClawAgentSqliteWorkerStoreV2`。将可序列化的域命令发送到其配对后端，在需要创建时显式等待 `prepare()`，并在接受的工作解决后关闭存储。 `executeExisting` 保留缺席。请参阅 [native SQLite 迁移](/plugins/sdk-migration/how-to-migrate#replace-native-sqlite-runtime-writes)。这仍然是一个内部运行时外观，而不是第三方插件的类型化公共 SDK 入口点。

已弃用的 `withOpenClawAgentDatabaseWrite` 和 raw-handle 导出在宣布的稳定弃用期内保留其原生回调顺序。等待他们的加入不会将回调从主机上移走。实际遗留使用共享每个插件功能系列警告预算；显式只读检查、离线维护和工作内核保留其范围内的合同。

异步 AgentSession 消息、模型、压缩和树操作使用此准入进行转录写入。嵌入式提示准备、重播修复和工具结果清理在发布相关结果或处置其资源之前等待其写入。模型选择挂钩在写入准入发布后运行。 SessionManager `appendModelChange` 和 `appendThinkingLevelChange` 返回其提交的条目 ID 的承诺； AgentSession 和分机 `setThinkingLevel` 返回 `Promise<void>`。在使用生成的模型或思维状态之前等待这些操作。其他 SessionManager 转录写入通过相同的共享 SQLite 工作程序使用其等待的 `Async` 同伴。它们保留调用者的实时写入权限，在依赖发布之前提交，并在提交之前保留失败时加载的视图。请参阅[完整会话迁移表](/plugins/sdk-migration/how-to-migrate#await-session-transcript-persistence)。

使用 `await SessionManager.appendMessageToTranscriptAsync(...)` 进行普通、自定义或 Bash 执行消息的静态追加。在工作线程提交后，它解析为持久消息 ID。 `SessionManager.appendMessageToTranscript` 使用 v2026.9.5 API 保留第三方插件的同步返回契约，每个进程发出一次弃用警告，并且仍然可以在调用线程上执行 SQLite 工作。 `session-manager-sync-persistence` 记录需要稍后发布稳定的删除版本，并公布迁移窗口。捆绑的生产路径使用等待的操作。

核心失败图像结算使用内部 `appendSessionTranscriptNote` 操作，该操作接受自定义消息并返回其持久 `messageId`、存储的 `message`、追加所有者的 `appended` 结果以及来自同一快照的 `currentTail` 事实的承诺。尾部事实使用事务的可见叶和生成：侧面元数据不会抑制重试的发布，而稍后的可见条目则会抑制重试的发布。文件支持的注释使用相同的共享代理工作线程和写入队列，在异步目标准备之前保留轮流。嵌入式运行器会等待其失败图像注释，然后在实时上下文中发布存储的消息或在所有者附加消息时发布完整的结果，或者在丢失回复后确认它仍然是当前尾部。较早追加的重复结果不会重新引入压缩省略的注释。输入和目标捕获先于等待的工作；事务和发布检查保留原始作者和会话绑定。发布失败后的已知提交会保留其消息 ID 并防止模型回退重播追加。隐身笔记在其现有进程持有的本机写入所有者下使用相同的存储附加快照，直到其参与者切换；该路径仍然执行调用者线程 SQLite 工作。它使管理器的加载视图保持不变，并应用相同的新 append/current-tail 发布规则。分离的注释通过其内存管理器所有者继续。关闭底层存储会撤销挂起的异步注释，并在释放存储之前加入其目标准备、已接受的工作和清理。失败图像注释使用现有的消息幂等性密钥来避免编辑和相同运行重试。现有的未加密笔记保留其运行元数据匹配。

`SessionManager.openAsync`、`openBoundedAsync` 和 `setSessionTargetAsync` 在读取转录本或调用 `onTruncated` 之前捕获 `storePath` 作为绝对词汇定位符。相对定位器在入口处针对进程工作目录进行解析； `getSessionTarget()` 返回捕获的定位器。后来的工作目录更改使管理器绑定到其原始存储。绑定还捕获已解析的状态目录和主管模式；环境更改无法重定向以后的写入。现有的 `sessions.json` 和自定义存储路由和符号链接拼写将被保留。

文件支持的副本写入通过底层代理数据库工作器执行。排队的扩展操作通过事务和提交准入保留其原始运行时和会话权限。运行时会话水合使用现有的读取工作线程。已弃用的第三方同步适配器和隐身转录持久性保留其本机所有者；等待的 API 在其单独的工作线程切换之前不会将隐身存储移出线程。

在异步清理之前，提交的元数据会与转录视图采用一起更新绑定会话的模型或思维状态。设置设置者保留其现有的持久队列。如果视图重建、本地发布或依赖思维更改在追加提交后失败，则该错误会保留已提交的条目并防止模型回退重播它。失败的视图重建使现有管理器拒绝进一步的转录访问；丢弃它并在解决读取失败后通过会话所有者重新打开。重试追加会重复已提交的写入。

签名为`withOpenClawAgentDatabaseWrite(options, operation, expectedDatabase?)`。 `options` 使用现有的代理数据库选项，包括必需的 `agentId` 和可选的具体 `path`。同步`operation`接收`OpenClawAgentDatabase`；操作结束后，返回的 Promise 将解析为其结果。如果没有`expectedDatabase`，助手也拥有异步数据库打开准入。帮助程序在等待之前捕获环境、选定的状态目录和数据库路径，因此更改工作目录不会重新定位排队的写入。单独打开或借用句柄并不允许写入。

对于已借用的句柄，将其确切的 `DatabaseSync` 作为第三个参数传递。等待后，助手会拒绝关闭或替换的句柄，而不是代表其打开替换句柄。保留原始借用直至操作完成。调用者仍然拥有交易和授权。对于大型本地出版物，`openOpenClawAgentSqliteWorkerStore(options, borrowedDb, { moduleUrl, input })` 保留原始借用的句柄和物理标识。它的 `run(operation, assertCurrent)` 加入现有的代理写入队列并借用共享代理执行器来完成操作。模块出口`bindSqliteWorkerBackend(input, { databasePath, database, admit })`；它使用提供的连接并仅关闭其自己的临时状态。它不得打开或关闭代理数据库。该操作仅接收绑定后端的`execute`方法；在调用 `close()` 之前完成它。客户端关闭撤销新工作，耗尽其已接受的操作，并释放其原始借用。共享执行器拥有本机连接、租用、空闲重用和最终关闭。

与该所有者一起使用的后端通过提供的 `admit` 回调在 BEGIN 之后请求 `transaction` 准入，并在 COMMIT 之前请求 `commit` 准入。主机在两个点上检查底层连接和当前调用者权限，而无需同步等待本机事务。接受的提交授权命令在稍后撤销之前提交；先前的拒绝会回滚。调用者必须保留已承诺或未知的结果，并且决不重播它们。私人文件所有者可以使用`runSqliteWorkerStoreWrite`，并拥有自己的许可权和生命周期；它不提供共享代理队列或租用。

`runSqliteWorkerStoreOperation(store, operation, undefined, assertCurrent)` 保留一名现有的工作角色，并通过经纪人准入检查所提供的权限。当私有存储异步准备命令时使用它；仅在工作人员打开留下旧快照授权的待处理工作之前进行检查。该操作助手保留了公认的本机结算，并且不会向未实现握手的后端添加 transaction/commit 握手。

Worker 后端可以在 `prepare(command)` 中异步加载模块先决条件。准备携带捕获的 state/runtime 事实并且不执行本机工作。确定后，`execute(command)`进入新的同步权限范围；连接绑定执行会在本机工作之前重新验证权限。扩展加载、事务和域回调保持同步。代理连接策略（包括 TEMP 存储）属于基础连接所有者，并且在发布绑定时无法重置。

其故障处理可能会留下不可用的本机连接的后端实现同步 `assertSettled()`。代理在命令返回或抛出后调用它。失败的断言会使 Worker 退出并等待本机退出，然后再释放操作许可。使用 `assertTransactionUsable(db)` 检测交易所有者的保留失败，并拒绝任何幸存的开放交易。安全回滚的普通故障仍然可以返回其域结果。

例如，给定现有的 `borrowedDb`、实时所有者 `assertCurrent()` 检查和同步 `applyPreparedChanges(db)`：

```typescript
import {
  runSqliteImmediateTransactionSync,
  withOpenClawAgentDatabaseWrite,
} from "openclaw/plugin-sdk/sqlite-runtime";

await withOpenClawAgentDatabaseWrite(
  { agentId, path: databasePath },
  ({ db }) =>
    runSqliteImmediateTransactionSync(db, () => {
      assertCurrent();
      applyPreparedChanges(db);
    }),
  borrowedDb,
);
```

在请求写入许可之前准备文件、嵌入、网络结果和挂钩决策。保持承认的回调同步；不要在提供者调用或整个异步挂钩中返回承诺或保留准入。在突变之前，重新检查回调中适用的 manager/run 所有权和取消。代理身份和句柄平等均不授权。

对于 SQLite 锁争用后可以重复的准备，`runSqliteImmediateTransaction(db, prepare, options, admit)` 接受同一所有者的准入回调。 `prepare` 在准入之前运行并返回同步交易回调。将 `(write) => withOpenClawAgentDatabaseWrite(databaseOptions, write, borrowedDb)` 传递为 `admit`；不要将异步准备放在已承认的回调中。助手在等待后重新检查事务状态，并且不会重复已经进入其事务的回调。

`withOpenClawAgentDatabaseWrite` 不启动事务、授予授权租约或协调不相关的流程。原始 SQLite 外部准入调用会绕过它，并且现有的同步 API 不会自动变为异步。被拒绝的过时所有者写入必须返回其生命周期所有者进行恢复，而不是使用替换句柄重试。有关存储设计和迁移要求，请参阅[数据库架构](/reference/database-schemas)。
