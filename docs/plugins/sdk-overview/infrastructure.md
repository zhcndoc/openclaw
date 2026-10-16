---
summary: "挂钩、HTTP 路由、网关方法、服务以及 Webhook 和 SQLite 帮助程序"
title: "插件 SDK 基础设施注册"
sidebarTitle: "基础设施注册"
read_when:
  - "您正在注册网关 HTTP 路由、RPC 方法或后台服务"
  - "您正在读取 webhook 主体或承认来自插件的 SQLite 写入"
  - "您需要每个请求者 MCP 传输来获取静态服务器名称"
---

挂钩、网关 HTTP 路由和 RPC 方法、CLI 条目和后台服务的注册器，以及这些表面所依赖的 SDK 帮助程序。 [插件SDK概述](/plugins/sdk-overview)的一部分。

## <a id="infrastructure"></a> 基础设施

| 方法                                            | 注册内容                                                      |
| ------------------------------------------------- | ---------------------------------------------------------------------- |
| `api.registerHook(events, handler, opts?)`        | 事件钩子                                                             |
| `api.registerHttpRoute(params)`                   | 网关 HTTP 端点                                                  |
| `api.registerGatewayMethod(name, handler, opts?)` | 网关 RPC 方法                                                     |
| `api.registerGatewayDiscoveryService(service)`    | 本地网关发现播发器                                     |
| `api.registerCli(registrar, opts?)`               | CLI 子命令                                                         |
| `api.registerNodeCliFeature(registrar, opts?)`    | Node 在 `openclaw nodes` 下具有 CLI                                |
| `api.registerService(service)`                    | 后台服务                                                     |
| `api.registerInteractiveHandler(registration)`    | 交互处理器                                                    |
| `api.registerAgentToolResultMiddleware(...)`      | 运行时工具结果中间件                                         |
| `api.registerMemoryPromptSupplement(builder)`     | 附加的记忆相关提示词部分                                |
| `api.registerMemoryPromptPreparation(prepare)`    | 记忆相关提示词部分的异步准备                 |
| `api.registerMemoryCorpusSupplement(adapter)`     | 附加记忆 search/read 语料库                                     |
| `api.registerHostedMediaResolver(resolver)`       | 浏览器式托管媒体 URL 的解析器                           |
| `api.registerMcpServerConnectionResolver(...)`    | 静态服务器名称对应的按请求方 MCP 传输（`url`/`headers`） |
| `api.registerTextTransforms(transforms)`          | 插件拥有的 prompt/message 兼容性文本重写                |
| `api.registerConfigMigration(migrate)`            | 插件运行时加载前执行的轻量级配置迁移           |
| `api.registerMigrationProvider(provider)`         | `openclaw migrate` 的导入器                                        |
| `api.registerAutoEnableProbe(probe)`              | 配置检查可以自动启用此插件                          |
| `api.registerReload(registration)`                | Restart/hot/noop 用于重新加载处理的配置前缀策略              |
| `api.registerNodeInvokePolicy(policy)`            | Allowlist/approval 节点调用命令的策略                    |
| `api.registerSecurityAuditCollector(collector)`   | `openclaw security audit` 的发现项收集器                       |

网关方法默认为 `profileAccess: "required"`，因此如果经过身份验证的配置文件验证失败，则在插件调度之前请求将被拒绝。仅针对既不读取也不改变持久用户或会话状态的审核方法设置 `profileAccess: "independent"`。操作员范围仍然是单独的授权要求。

只读方法可以选择使用注册选项 `shareKey(caller, params)`、`shareInvalidationEvents` 和 `shareMaxAgeMs` 进行 WebSocket 响应共享。当请求无法共享时返回`null`。密钥必须包含每个调用者和参数依赖性，包括身份、范围、功能、代理和帐户选择。成功的结果在发布后必须是不可变的。调度程序检查每个调用者的权限并仅共享结果和序列化的有效负载；错误不会被缓存。列出的广播使待处理和已完成的条目无效。默认绝对上限为一秒，主机将其上限为五秒。网关在所有方法中最多保留 16 个响应，每个响应最多 1 MiB，并在替换其方法注册表时清除它们。到期和失效释放等待调用者执行自己的读取，而不是重复加入退休工作。仅当方法的授权被调度完全覆盖时才选择加入；执行额外的特定于调用者的授权或嵌套请求的处理程序必须保持请求本地。对于突变、订阅和连接绑定提供程序，请忽略这些选项。

### <a id="file-watch-capacity-errors"></a> 文件监视容量错误

对于本机监视故障，`openclaw/plugin-sdk/file-access-runtime` 中的 `getFileWatchCapacityCode(error)` 返回 `EMFILE`、`ENFILE` 或 `ENOSPC`，对于其他错误则返回 `undefined`。它需要 `syscall: "watch"`，因为观察程序库可以通过同一错误事件转发目录扫描错误。使用观察者生命周期所有者中的结果来停止本机重试并选择现有刷新路径​​。

### <a id="filesystem-observation-and-worker-notifications"></a> 文件系统观察和工作人员通知

`openclaw/plugin-sdk/file-access-runtime` 中的 `resolveFsObservationMode(env?)` 和 `resolveFsObservationIntervalMs(env?)` 共享主机保留的 [`CHOKIDAR_*` 环境合约 ](/help/environment#filesystem-observation)。使用 `admitObservationRoot`、`watch` 及其来自同一 SDK 入口点的类型，包括 `ObservationRoot`、`WatchOptions` 和 `WatchSubscription`。这些操作共享主机的 fs 安全实例；插件的单独依赖项副本无法观察这些根。将解析的模式和 `pollIntervalMs` 传递给 `watch`，以便自动回退保留轮询间隔。在消费者中继续解析、解决、重试和索引。通过fs-safe，通过`health.failure.operation === "watch"`和`health.failure.code === "watch-limit"`对原生手表容量进行分类； `getFileWatchCapacityCode` 保留其现有的 Node 手表错误合同。

对于相同版本的观察工作线程，来自同一 SDK 入口点的 `createFileWatchNotifier(output, onFailure)` 通过借用的可写流发送 JSON 行。请致电 `send("change" | "unavailable" | "available")` 获取失效和可用性更新。它合并待处理的通知，保持一次写入，并在输出失败或意外关闭时调用 `onFailure`。等待 `close()` 停止接受通知并加入已接受的写入，然后再退出工作线程；该流仍然由调用者拥有。它携带当前的观察状态，而不是文件系统事件的完整历史记录。

### <a id="streaming-file-verification"></a> 流文件验证

`sha256File(pathOrHandle, { maxBytes, signal })` 从 `openclaw/plugin-sdk/file-access-runtime` 返回 `{ bytes, digest }` 而不将整个文件加载到内存中。它读取 EOF 并拒绝超出字节限制的文件。借用的句柄以其原始偏移量保持打开状态；调用者拥有入场和关闭。路径输入拒绝最终符号链接并关闭其拥有的句柄。取消可以在拒绝之前解决待处理的工作。可选的本机助手对 JavaScript 事件循环进行哈希处理；后备使用有界缓冲区。这两种路由都不提供并发写入的快照。

### <a id="browser-lifecycle-cleanup"></a> 浏览器生命周期清理

来自 `openclaw/plugin-sdk/browser-maintenance` 的 `closeTrackedBrowserTabsForSessions` 在插件激活之后和每个新的清理声明之前接受可选的 `prepareCurrent(): Promise<boolean>` 检查。返回 `false` 会跳过新的索赔；现有的 `isCurrent()` 回调在等待准备后仍然是同步所有者检查。主机提供的 `sessionEntryCurrent` 检查使用当前会话事实限制本机声明和预声明状态写入；它不授予商店访问权限。提供 `sessionEntryCurrent` 还需要 `prepareCurrent`，它在获取清理预留之前检查进程本地选项卡。在选项卡清理开始之前，未配对的检查将被拒绝并发出警告。官方插件通过`openclaw/plugin-sdk/plugin-state-runtime`共享`SessionEntryCurrentPreparation`和`SessionEntryCurrentCheck`类型。一旦一个选项卡被声明，即使清理调用者随后发生变化，该选项卡的关闭和退出也会在其捕获的浏览器权限下完成。 Artifacts 以 `supportsSessionEntryCurrent: true` 宣传此合同。针对较旧工件的防护清理不会影响选项卡并报告更新警告；仅使用现有同步防护的调用者仍受支持。

### <a id="sqlite-write-admission"></a> SQLite 写录取

对于运行时存储，使用所属域的等待操作或`openOpenClawAgentSqliteWorkerStoreV2`；请参阅 [native SQLite 迁移](/plugins/sdk-migration/how-to-migrate#replace-native-sqlite-runtime-writes)。以下 `sqlite-runtime` 回调帮助程序在 2026 年 12 月 31 日之前已不再兼容。等待准入不会将其 SQL 从调用者的线程中移出。

来自 `openclaw/plugin-sdk/sqlite-runtime` 的 `runSqliteImmediateTransaction(db, prepare, options?)` 等待写入许可，而不阻塞事件循环。当另一个写入者持有数据库时，其异步 `prepare` 函数可能会运行多次。保持准备工作可重复：在那里读取和计划，然后返回 **synchronous** 事务回调。在写入之前重新验证该回调中的当前所有者和行谓词。

从准备中返回 `undefined` 会跳过写入并将帮助器解析为 `undefined`，即使另一个写入器保持活动状态也是如此。否则，助手将解析事务回调的结果。它拒绝已经处于活动状态的事务或使事务处于打开状态的准备工作。一旦被接纳，回调就会运行一次；回调和提交失败永远不会重播。

准入重试使用连接的现有 `busy_timeout`；这不是准备或交易执行的总期限。 `options` 提供与 `runSqliteImmediateTransactionSync` 相同的事务诊断。保持数据库句柄及其所属操作处于活动状态，直到返回的承诺解决。回调和 SQLite 调用仍然在调用者的线程上同步运行。

在工作后端内，来自 `openclaw/plugin-sdk/sqlite-worker-runtime` 的 `prepareSqliteQuerySync(db, build)` 编译一次重复的固定查询的 Kysely 形状，并在每次调用时绑定新参数。当启用时，它使用正常的同步执行器和连接的有界语句缓存。将准备好的函数与其数据库所有者保留在一起，并在关闭连接时将其丢弃；事务回调必须保持同步。

### <a id="database-engine-adapters-(experimental)"></a><a id="database-engine-adapters-experimental"></a> 数据库引擎适配器（实验性）

引擎感知存储使用两个狭窄的 SDK 入口点。让它们位于 host/worker 边界的所属一侧：

- `openclaw/plugin-sdk/database-engine-runtime` 仅限主机。等待 `resolveDatabaseEngineInput(config)` 解析配置的连接密钥，然后通过现有的工作输入传输传输生成的 `DatabaseEngineInput`。 `openEngineWorkerStore` 打开工作存储并观察其连接打开、执行和关闭请求。 `runEngineStoreOperation` 包装主机端存储操作，保留写准入、当前权限检查和工作请求观察，而无需在引擎上创建存储外观分支。此入口点不加载同步 PostgreSQL 桥。
- `openclaw/plugin-sdk/database-engine-worker-runtime` 是 worker/admission-only. 使用物理 SQLite 句柄、`StoreSchema`、解析的输入以及商店现有的 SQLite 打开和锚点准备回调来调用 `openEngineStore`。 `StoreSchema` 声明商店 ID、版本、规范 SQLite DDL 和可选生成的 PostgreSQL DDL。店主选择适配器，进入实体店一次，返回`EngineConnection`。使用 `runEngineStoreReadSnapshot` 进行快照读取。 `runEngineWorkerWrite` 使用内核的事务回调选择额外的 PostgreSQL 工作信封； SQLite 直接执行操作。在两个引擎上保持内核自己的写事务 API 原子性。 `jsonPathValue(connection, value, path, kind)` 将对象成员 JSON 路径投影为文本、数字或 JSON 文本。它保留 SQLite 的 `json_extract` 语句和绑定，并为该引擎选择 PostgreSQL 表达式。

工作线程入口点导出 `EngineConnection`、`StoreSchema` 和 `DatabaseEngineAdapter` 类型；它不导出 PostgreSQL 连接构造函数。通过`openEngineStore`打开物理专线。未注册PostgreSQL DDL的商店停留在SQLite；失败准入的选定 PostgreSQL 存储永远不会回退。有关配置、支持的存储、持久性、锚点和观察事件，请参阅 [ 数据库引擎](/reference/database-engines)。

实验性搜索功能使用相同的工作入口点。使用已承认的存储及其现有索引声明调用 `admitStoreSearch` 以绑定 `TextIndex` 和 `VectorIndex` 句柄。 `FullTextCapability` 提供原生 Kysely 表达式； `VectorCapability` 拥有本机候选查询和派生索引维护。调用者保留过滤器、限制、时间顺序、片段的显示范围和评分策略。适配器的现有功能标签仍然是诊断元数据。 SQLite 保留其 L2 候选选择和余弦重新排名，并在本机向量不可用时内存所有者的精确回退。 PostgreSQL 搜索功能目前为 `null` 具有准入诊断功能；他们稍后的实现将使用明确记录的本机排名，而不是承诺 SQLite 排名等效性。

### <a id="owned-stdio-processes"></a> 拥有stdio进程

具有双向 CLI 协议的捆绑和官方插件可以使用 `openclaw/plugin-sdk/process-runtime` 中的 `createOwnedStdioProcess(options)` 和 `closeOwnedStdioProcess(child, options?)`。 `OwnedStdioProcessOptions` 和 `OwnedStdioProcess` 类型描述启动及其进程树所有者。创建在启动和私人输入交付后解决。如果无法确认资源关闭，则失败的启动还会报告清理失败。

将命令和参数一起传递为 `argv`，可选 `argv0`、`cwd`、`env` 和 `abortSignal`。对于已经准备好的 CLI 调用，`exactEnv: true` 保留其环境并避免 shell 包装器；共享本机子 OOM 策略仍然适用于 Linux。 `windowsShell: true` 在需要时保留配置的 Windows 包装器的 shell 启动合同。

| 选项                            | 契约                                                                                                                                                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `terminateOnHostLoss: true`       | 在 POSIX 上，在转发输入 EOF 之前，当其主机消失时终止拥有的进程树。显式 `child.stdin.end()` 仍然提供优雅的协议 EOF。省略现有输入 EOF 行为。 |
| `secretInput: { fd, createData }` | 通过编号为 3 或更高的私有描述符传递一个凭证缓冲区。所有者在交付后关闭描述符并清除返回的缓冲区。                                                |
| `assertCurrent`                   | 在启动准备期间和私人输入交付之前重新验证调用者的权限。                                                                                                                 |
| `stdoutConsumption: "awaited"`    | 返回一个附加的 `consumeStdout(listener)` 方法。订阅一次；它等待每个接受的块、解码器刷新和 EOF。                                                                                  |
| `stderrDestination`               | 将 stderr 发送到提供的可写流而不是回调观察。                                                                                                                                   |

使用 `onStdout`、`onStderr`、`onExit` 和 `onError` 进行观察。 `wait()` 加入命令的结果；它本身并不能证明后代已经停止了。如需关闭，请等待 `closeOwnedStdioProcess(child)`。它发送正常输入 EOF，等待 `graceMs`（默认为 2,000 毫秒），然后根据需要通过 `SIGTERM` 和 `SIGKILL` 升级。 `{ force: true }` 直接跳至 ​​`SIGKILL`。两条路径都加入进程树清理、报告清理失败并处置所有者。不要用子退出侦听器或单独的进程普查替换该连接。

### <a id="worker-task-admission"></a> Worker任务准入

`openclaw/plugin-sdk/process-runtime` 中的 `WorkerTaskPool` 支持捆绑和单独发布的官方插件的可重用计算工作者。在这些工作线程中，从 `openclaw/plugin-sdk/worker-task-server` 导入 `serveWorkerTasks` 和 `WorkerTaskControl` 类型，以避免加载主机进程和池运行时。两条路径使用相同的任务协议。

共享实现位于私有 `@openclaw/worker-runtime` 工作区包中。插件继续使用这些公共 SDK 入口点； OpenClaw 的主机适配器为同一个调度程序提供工作线程创建、资源清理和进程统计。

`process-runtime` 中较旧的服务导出仍用于已发布的官方插件。捆绑工使用`worker-task-server`；仅在受支持的官方插件版本迁移到具有此子路径的主机后才删除旧的导出。

每个池默认有 128 个未完成的任务和 256 MiB 报告的输入字节，包括排队、准备和运行的任务。构建池时设置 `maxPendingTasks` 和 `maxPendingBytes` 以选择不同的正限制。使用 `run(input, { inputBytes })` 报告已知的保留输入，包括输入工厂捕获的缓冲区。省略 `inputBytes` 算作零；此统计不测量序列化有效负载大小、解码数据、结果或工作堆。

在准备或执行该输入之前，容量耗尽会拒绝 `run()` 和 `WorkerTaskError.code = "overloaded"`。已接受的工作在单个工作人员池中保持有序状态。将被拒绝的操作报告为不成功；不要替换空结果或通过同步执行绕过限制。接受的工作稳定后，同一个池再次接受新的工作。调用者可以在压力耗尽并且其原始权限和截止日期重新生效后重试被拒绝的操作；池不会自动重试。

对于无状态计算，`sharedCompute: true` 还与同一隔离中的参与池共享总计 128-task/256-MiB 准入预算和 CPU 执行容量。专用有序池保留自己的执行能力，并仍然执行其单独的准入限制。

对于等待主机响应的交互式任务，队列压力可以通过 `yieldSignal` 请求协作检查点，以便排队的工作可以运行。主机操作保留其自己的生命周期。内部 `openclaw.worker.task` 诊断包括 `hostWaitMs` 以及现有的计时字段；主机等待包含在 `runMs` 中，而不是添加到其中。该字段是诊断数据，而不是公共配置选项。

任务的 `timeoutMs` 包括主机回调。到期将中止回调的 `signal` 并退休该工作人员；主机响应可以缩短剩余期限，但不能延长期限。已经强制执行单独的、可获批准的主机截止日期的所有者可以设置 `hostTimeout: "owner"` 在主机回调期间暂停池时钟，并在响应中提供其剩余预算。接受的宿主效应仍然需要其所有者的结算和清理收据。将回调信号转发为排队的读、写、锁和网络请求；仅在 `await` 将已取消的工作留在队列中后才检查它。主机等待超时会发出 `WORKER_HOST_CALLBACK_TIMEOUT` 以及回调的操作名称（字符串请求或其 `kind`/`type` 字段），而不记录其有效负载。没有标签的请求会识别其工作线程入口点。

在 `workerOptions` 中传递静态 Node.js Worker 设置。对于每个工作线程设置，`prepareWorker()` 每次尝试创建工作线程都会运行一次并返回 `{ options, temporaryDirectory? }`。它的 `options` 浅层覆盖 `workerOptions`：`env`、`workerData` 和 `resourceLimits` 等属性替换整个静态属性，而不是合并嵌套值。

返回的 `temporaryDirectory` 将新分配的一次性目录传输到池中。如果准备在返回之前失败，则负责清理。仅当该 Worker 退出（包括启动失败或取消）后，池才会删除该目录，并报告删除失败而不替换任务结果。 Worker退出释放执行能力； `close()` 还等待挂起的文件清理。将 Worker 外部借用的持久数据和文件保留在该目录之外。

当本机终止失败时，池保留该工作人员的输入保管权和容量。 `retryFailedRetirements()` 仅重试那些失败的退出，并加入本机退出和挂起的文件清理，而不会中断正常任务或等待它们完成。它不会重播失败的工作或关闭池。正在关闭的所有者必须停止新的接入，排出健康的任务，并以 `close()` 结束。

`serveWorkerTasks` 提供第三个处理程序参数 `WorkerTaskControl`。在每个有界本机操作周围等待 `control.runNativeSection(() => nativeOperation())`，该操作必须在其工作线程终止之前完成。对于具有异步入口点的本机库，栅栏还等待返回的承诺。将不相关的工作和渲染放在围栏之外；不要隔离整个文档或主机请求。在页面或其他工作单元之间调用 `control.throwIfCancelled()`，因此取消无法启动另一个本机操作。

取消、截止日期、池关闭和工人退休自动关闭本地部分入场。没有围栏的工人立即被解雇；受隔离的工作线程仍会受到准入和执行能力的影响，直到其当前的本机操作完成并且工作线程退出。截止日期要求取消；它无法安全地中断卡住的本机调用。因此，本机部分必须具有有界输入，并且不得等待网络、用户输入或无界工作。

### <a id="sqlite-worker-stores"></a> SQLite 工人商店

对于规范代理数据库，请使用 `openOpenClawAgentSqliteWorkerStoreV2` 和 `{ version: 2, assertCurrent }`。它保留现有的代理执行所有者，提供显式的工作人员拥有的 `prepare()` 用于创建，并检查事务和提交准入的实时权限。 `executeExisting` 不存在丢失的存储。请参阅 [ 迁移示例 ](/plugins/sdk-migration/how-to-migrate#replace-native-sqlite-runtime-writes)。已发布的原始本机回调保留其顺序并在使用时发出警告，直到在 2027 年 1 月的第一个稳定版本中将其删除。

使用 `openclaw/plugin-sdk/sqlite-runtime` 中的 `openSqliteWorkerStore<Operations>` 将功能的 SQLite 生命周期移出应用程序事件循环。使用 `{ moduleUrl, databasePath, input }` 从主应用程序线程调用它。 `Operations` 将每个域操作映射到其 `{ input, output }` 类型； `store.execute({ type, input }, { signal }?)` 返回相应的输出承诺。主机当前拒绝来自其他应用程序工作线程的调用，这些应用程序工作线程需要共享的主机代理连接。

第一个主机仅支持文件系统支持的数据库。空路径、SQLite URI、`:memory:` 和 OpenClaw 的保留隐身数据库基本名称在规范化或工作线程准入之前被拒绝。内存中和隐身所有权仍悬而未决；这些定位符绝不能成为磁盘文件名。

静态本地`moduleUrl`标识导出`createSqliteWorkerBackend(input, { databasePath })`的可信特征模块。其工厂拥有数据库开放和模式设置；其同步`execute(command)`拥有查询和事务。 `close()` 可能等待外部交易清理；主持人保留演员，直到清理工作解决。将本机句柄、WAL 维护和准备好的语句保留在该后端内。跨边界发送可序列化的域命令和结果，绝不是 SQL 字符串、回调或 Kysely 构建器。使用 [`openclaw.build.workerEntries`](/plugins/dependency-resolution#native-imports-from-a-standalone-source-build) 声明私有构建条目，并从加载程序的 `api.runtimeSource` 事实中获取它们的位置。

当采集必须保留丢失的数据库时通过`existingOnly: true`。当文件不存在并且没有活动参与者保留该路径时，调用将返回 `undefined`，而不启动工作程序或调用工厂。冷现有打开需要模块的显式 `openExistingSqliteWorkerBackend(input, { databasePath })` 导出。宿主永远不会替代普通的创造工厂。现有工厂必须使用 SQLite 的本机只读或现有文件打开模式并验证当前模式，而无需创建或迁移它。文件系统存在性检查以及普通的“如果丢失则创建”打开不满足此约定。

主机在派遣现有工厂之前检查物理身份，并在返回商店之前再次检查物理身份。入院后失踪或替换者拒绝获取。当模块和初始化输入匹配时，现有客户端和普通客户端共享相同的物理参与者；更改打开意图不会重新运行工厂或创建另一个连接。域命令仍然拥有写入权限和任何后续模式初始化。仅现有采集不为后续命令提供只读功能。

中止信号删除仍在排队的操作。一旦分派，操作将保留其结果或失败；取消并不证明回滚。 `close()` 拒绝新工作并耗尽客户已接受的操作。最后一个客户端也关闭其数据库后端；最后一个后端释放其工作人员。工作人员丢失或未能序列化已完成操作的结果可能会被拒绝，并显示 `code: "outcome-unknown"`。该操作可能已承诺：在决定下一步做什么之前检查权威状态。主机永远不会自动重试写入。

异步 `execute` 返回违反了命令约定。主机在报告 `outcome-unknown` 之前退休并加入该工作人员；当无法解码已完成的回复时，它会执行相同的操作。当工作进程耗尽时，失败的清理会保留其原始错误。

进程范围主机延迟启动，并根据可用 CPU 使用两到八个共享 Node 工作线程。 Bun 使用多达 64 名专职工作人员，直到其原生 SQLite 近距离修复发货。主机允许 64 个打开或实时存储客户端（包括共享数据库的客户端）、每个工作线程 128 个未完成的操作以及所有工作线程的 256 MiB 排队和保留输入。仅计数溢出在其工作线程上按 FIFO 顺序等待最多 10 秒；独立工作者保留自己的请求能力。字节、消息和存储限制立即拒绝，并显示 `code: "overloaded"`。每条输入消息限制为 32 个 MiB。更大的执行输入以 8 个 MiB 块的形式到达；验证完整命令后，后端运行一次。工厂初始化输入仍然是单个有界消息。

最多保留 64 MiB 序列化输入的命令可以排队，并在结算之前按其完整字节长度计费。更大的命令必须立即在具有保留的 32 MiB 传输窗口的空闲工作线程上启动；否则在发货前会以 `overloaded` 拒绝。总预算限制了接纳的队列字节和保留的传输窗口，而不是活动的超大命令或结果所持有的完整值。一旦演出开始，现有的调度后取消和排水规则将适用。

最多 64 MiB 的结果使用内联回复；较大的结果在有界的 8 个 MiB 块中传输其完整序列化值。调用者仍然在内存中实现完整的结果，并且通过传输验证和清理仍然拥有原始操作。对一个数据库的操作共享其连接所有者并按顺序执行。没有读取器副本或工作池配置选项。

文件身份是准入事实，而不是本机句柄证明。在替换或重新定位数据库文件之前，请关闭并排空数据库的客户端。主机拒绝观察到的身份变化以及与现有所有者的冲突；路径检查无法防止不协调的文件系统替换。每个客户端通过引流和关闭保留其承认的词法路径名和解析的文件系统路径。后端的打开路径在其本机生命周期内保持固定；当其他客户端存在时，已发布的辅助别名不会累积。

### <a id="computation-worker-entrypoints"></a> 计算工作线程入口点

对于插件拥有的工作线程，将 `package: { name, distWorkerPath }` 从同一 SDK 子路径传递到 `resolveRuntimeWorkerUrl`。使用插件的 `package.json` 名称和相对于其 `dist` 目录的工作路径。然后，描述符支持捆绑和独立安装，包括重命名的安装目录。在 [`openclaw.build.workerEntries`](/plugins/dependency-resolution#native-imports-from-a-standalone-source-build) 中声明工作线程的源条目，以便包构建发出它。

### <a id="webhook-body-rejection"></a> Webhook主体拒绝

使用 `openclaw/plugin-sdk/webhook-request-guards` 中的 `readWebhookBodyOrReject` 或 `readJsonWebhookBodyOrReject` 进行有界主体读取。当结果为`{ ok: false }`时返回；帮助者负责错误响应和连接清理。正文字节限制和读取超时与传输清理保持独立。

对于读取响应优先正文后的自定义错误表示，请等待 `sendHttpRequestRejection(req, res, statusCode, body, contentType?)`，而不是调用 `res.end()` 并销毁请求。它保留安全标头，构建完整的错误，然后在 Node 和 Node- 兼容的 Bun HTTP 上传输关闭写入端，同时保持应用程序主体读取器暂停。 Node的请求反压限制了剩余输入缓冲；清理最多允许一秒，而不是另一个正文读取超时。对等点断开连接、格式错误的 HTTP 或清理预算耗尽都可能会阻止交付。提交的响应将被关闭，而不附加替换错误或完成部分成功的正文。

在这些传输上，拒绝会发出响应 `close`，但不发出 `finish`。使用 `close` 进行终端清理或选定错误诊断；它并不能证明交付。通过调用者的成功状态检查，将成功响应活动保留在 `finish` 上，以便中止的请求无法报告正常活动。

较旧的 Bun HTTP 传输使用本机响应完成，因为它们的原始套接字操作不会刷新 HTTP 响应。 OpenClaw 检测由 Bun 的 Node 兼容性返工引入的本机 HTTP `destroySoon` 实现，而不是依赖于不同金丝雀构建共享的版本标签。较新的 Bun 上的排队 HEAD 拒绝等待响应套接字分配，包括没有 HTTP 响应完成诊断的构建。较旧的 Bun 仍然可以在大型未完成上传期间报告客户端连接重置，即使在提供完整错误之后也是如此。

网关 HTTP 请求在每个连接上按顺序运行，包括其响应生命周期。正在关闭的连接无法接受以后的请求或升级。排队的请求应用输入反压，直到较早的响应完成；有限的管道按顺序排出。对并发请求使用单独的连接。将`beginWebhookRequestPipelineOrReject`返回的释放钩保留在`finally`中；它会在释放运行中的插槽之前保留任何选定的拒绝清理。

Webhook 传输可以从 `openclaw/plugin-sdk/webhook-ingress` 向 `registerPluginHttpRoute` 注册其处理程序。网关拥有监听器、连接准入、请求范围和路由租用切换；该通道拥有其签名验证和有界主体读取。

对于捆绑回调设置和 Doctor 指导，来自私有 `openclaw/plugin-sdk/gateway-config-runtime` 外观的 `classifyGatewayProbePath(pathname)` 可以识别网关检查路径，而无需加载 Webhook 执行代码。此外观不是第三方 SDK 的一部分。首先通过 `new URL(rawPath, "http://localhost").pathname` 规范回调输入。结果 `live`、`ready` 和 `startup` 确定网关端口上检查所拥有的确切路径；选择不同的 webhook 路径。结果 `namespace` 和 `outside` 未识别精确的检查路线。相同的私有外观导出 `resolvePluginRoutePathContext` 和 `isProtectedPluginRoutePathFromContext` 以进行共享受保护路径检查。如果回调属于受保护的命名空间，请在将外部回调或反向代理移动到网关端口之前选择通道的安全默认路径。在迁移期间，旧侦听器仍然可以为其旧路径提供服务。

对于已发货的通道侦听器，注册可以包含 `legacyListener: { port, host? }`。网关通过相同的插件调度转发该端点上的请求，保留原始套接字、URL、正文和响应标头。处理程序拥有路径和方法拒绝，包括未知路径。核心 HTTP 端点永远不会在兼容端口上公开。旧侦听器需要 `auth: "plugin"`：通道继续验证其旧回调路径，包括 `/api/channels` 下的路径。网关端口保留其受保护路径身份验证策略。此例外仅适用于在兼容端口上收到的请求；它不授予网关操作员范围，也不放弃通道签名检查或工作许可。 `getWebhookLegacyListener(req)` 返回其冻结配置的 `{ port, host? }` 端点，或对于普通网关请求返回 `undefined`； headers 无法设置它。当旧端口区分共享路径和机密的帐户时，在签名解析之前按此端点过滤帐户目标。普通网关请求仍然需要明确的帐户路径或身份验证身份。

可选的注册元数据 `health: { path, contentType? }` 保留已交付的精确原始运行状况目标：用于普通 HTTP 方法的 `200 ok`，具有 Node 的 HEAD 行为，并且仅包含可选的 Content-Type。它仅适用于旧端口，包括在路由切换期间，并且不公开网关检查详细信息。旧版端口保留本机 Node 期望处理、升级回退、标头限制和超时默认值。可以使用 `timeouts: { headers, request, socket }` 以毫秒为单位保存已发送的超时配置文件。这些是插件注册合同，而不是新的运营商配置。

通道拥有有效的侦听器解析：仅为显式 `legacyWebhook` 端点对象注册旧侦听器。省略设置，`false` 选择仅网关入口。解析运行时路由和 Doctor 指导的相同端点。插件拥有的Doctor合约可以从`openclaw/plugin-sdk/runtime-doctor-migrations`组成`createLegacyWebhookListenerDoctorContract`，以通过正常的备份配置写入来保留创作的端口和继承的绑定地址。没有端口的显式旧主机使用通道附带的默认端口。当 Doctor 删除废弃的密钥时，当前的 `false` 设置仍然具有权威性。要停用历史默认值，请从现有配置 Doctor 模块及其 `config-doctor-api` 和 `doctor-contract-api` 入口点导出帮助程序的静态 `historicalWebhookListener` 属性。此 `{ channelId, port, host? }` 对象重用帮助器的历史默认值。主机验证通道属于插件，端口是从 1 到 65535 的整数，显式主机非空。仅当创作的侦听器设置先前暗示通道激活时，才设置出厂选项 `preserveAuthoredActivation: true`。返回的静态声明携带此标志；在添加隐式引脚之前，主机会在先前操作和完成检查之后保留激活状态。规范器不得启用通道本身。将 `doctorContract.configRepair: true` 保留在清单中。从现有的 `normalizeCompatibilityConfig` 结果返回 `historicalWebhookAccountIds`，使用插件的帐户和传输所有者来选择符合条件的帐户。空数组表示检查完成，没有符合条件的账户； `undefined` 数组条目选择无帐户通道根。当当前进程无法决定环境相关资格时，返回 `null`。仅当合同未执行时才省略该字段。主机拥有先验操作检测、引脚创建和完成；规范化器返回资格，无需打开侦听器或创建隐式端点。

保留的主机配置 Doctor 工件也暴露了 `normalizeHistoricalWebhookConfig`。它重用仅侦听器迁移并返回其配置更改、警告和 `historicalWebhookAccountIds`，而不应用不相关的兼容性修复。在更新演练期间，主机可以对已延迟安装的缺失插件使用此操作。选定的已安装或自定义所有者仍然会影响主机工件，并且此操作不会完成延迟的插件检查。不需要外部插件来实现此主机回退。

自动 pin 属于现有帐户，包括 `accounts.default`，因此以后添加的帐户不会继承它们。 Doctor 在使用 `meta.migrations.webhookListeners` 保留引脚之前备份配置。标记记录每个已完成通道的准确插入路径，或 `true`（对于全新安装）。在保留此标记的同时移除图钉不会在以后的 Doctor 运行或更新中重新创建它。有关只读配置行为，请参阅 [webhook 迁移](/gateway/doctor/config-migrations#channel-webhook-listeners)。在 `runConfigSequence().infoNotes` 中返回正常的听众指导，以便 Doctor 将其标记为信息。将可操作的配置问题保留在`warningNotes`中； `changeNotes` 描述了应用的修复。

共享路由的帐户租约可以保留单独的端点。仅通过重新启动切换保留的端点返回可重试的 503 响应；具有实时持有者的端点继续服务请求。同一地址的实时持有者优先于保留的移交。共享端点的实时注册必须声明相同的运行状况和超时配置文件；冲突的注册将被拒绝，而不更改侦听器。绑定失败警告而不禁用网关路由。在操作员更改提供程序回调或反向代理以到达网关端口后，插件可以停止注册兼容性端点。当承认的响应完成时，退出端点会停止新连接。网关将那些正在关闭的套接字保留在其传输所有权中，并在完全关闭时关闭它们；通道在拆卸前保留自己的响应消耗顺序。

拥有 `createServer` 准入的通道 Webhook 侦听器将来自 `openclaw/plugin-sdk/webhook-request-guards` 的每个与 `runHttpConnectionRequest(req, run, res?)` 的连接序列化。将 `ServerResponse` 作为第三个参数传递：共享所有者在接受连接的下一个请求之前等待响应完成（`finish` 或 `close`），因此密切感知的拒绝（其清除可能会在一秒钟内破坏套接字）永远无法超越先前排队的确认。省略响应参数会在当前响应完成之前释放下一个请求并失去该保证；仅当调度在共享连接上不写入任何响应时才忽略它。已经承认的工作总是完成的；排队的工作在关闭后永远不会被分派，并且关闭的连接不能接受以后的请求。

### <a id="post-ack-webhook-work"></a> Post-ack webhook 工作

在处理完成前确认请求的 Webhook 路由，必须将这部分脱离请求的工作转移到其自身受跟踪的准入根上：

```typescript
import { runDetachedWebhookWork } from "openclaw/plugin-sdk/webhook-request-guards";

// processWebhookEvent, event, and runtime are your plugin's own handler, payload, and logger.
void runDetachedWebhookWork(() => processWebhookEvent(event)).catch((error) => {
  runtime.error?.(`webhook dispatch failed: ${String(error)}`);
});
```

在 HTTP 请求仍处于准入状态时，同步调用 `runDetachedWebhookWork(...)`。该辅助函数会立即保留一个独立的根，然后在下一个微任务中启动回调，以便请求处理器能够先写入确认响应。返回的 promise 会采用回调结果；调用方仍负责处理拒绝。这样可以确保确认后的队列工作得到接受，并使重启或暂停时的排空操作等待这部分工作。返回前等待所有处理完成的处理器不需要使用此辅助函数。

### <a id="requester-scoped-mcp-connections"></a> 请求者范围的 MCP 连接

在 `mcp.servers`、原生插件的 `mcpServers` 清单字段或捆绑包清单中，保持 MCP 服务器的**身份**（名称、工具过滤器）静态不变。也可以选择注册连接解析器，以便每个受信任的消息请求方获得自己的传输：

```ts
api.registerMcpServerConnectionResolver({
  serverName: "user-email",
  resolve: async (ctx) => {
    // ctx.requesterSenderId is host-trusted; never invent sender identity here.
    // lookupUserToken is your plugin's own credential-store lookup, not an SDK export.
    const token = await lookupUserToken(ctx.requesterSenderId);
    if (!token) {
      return null; // omit this server for the current run
    }
    return {
      url: "https://mcp.example.com/email",
      headers: { Authorization: `Bearer ${token}` },
    };
  },
});
```

契约说明：

- Resolver上下文仅携带可信主机身份（`requesterSenderId`，可选`agentAccountId` / `messageChannel`）。可以额外添加未来的可信字段（例如 cron/subagent 用户上下文）。
- 一个插件拥有一个服务器名称：来自另一个插件的相同 `serverName` 的重复 `registerMcpServerConnectionResolver` 会被错误诊断拒绝（第一个注册获胜），因此连接所有权从不依赖于插件加载顺序。
- 工具名称由完整声明的服务器集合派生，因此部分解析绝不会在不同请求方或轮次之间改变安全的服务器名称。Core 不会验证不同请求方端点是否提供完全相同的工具 schema；解析器必须让每个请求方指向同一个逻辑服务，否则工具 schema（以及提示缓存稳定性）会按请求方发生分歧。
- 在没有受信任的 `requesterSenderId` 的运行中（cron、子代理、心跳、公共网关），永远不会实例化按请求方作用域划分的服务器。不存在共享的回退连接。
- `resolve` 对每个服务器的执行上限为 10 秒；超时或抛错会在本次运行中省略该服务器，而不会使静态 MCP 失败。
- 已解析的连接对每个请求方最多每 5 分钟重新校验一次：轮换会用新凭据重建传输，而 `null` 结果会撤销它（即使在会话中途，缓存的运行时也会被释放）。因此，已撤销或已轮换的凭据最多可能继续使用 5 分钟。
- Resolved `headers` 永远不会被记录或持久化；核心仅保留临时内存中键控摘要（进程本地 HMAC）来检测凭证轮换，并使用 log/debug-capture 编辑注册表注册已解析的 header/URL 凭证值。
- Requester 范围的服务器不会创建 MCP 应用程序视图：视图比请求者验证的运行寿命更长，并且网关视图边界没有请求者身份，因此这些服务器的应用程序预览仍然被阻止。工具结果不受影响。
- 没有解析器的静态服务器会保留现有的会话作用域生命周期。
- **Harness 传递规则：** 按请求方作用域划分的服务器绝不会进入 harness 原生 MCP 客户端配置（Codex 线程 `mcp_servers`、CLI `-c mcp_servers=…`，或任何其他会话共享的 MCP 投影）。harness 会将它们作为运行作用域工具传递：
  - 嵌入式运行器：会话 MCP 运行时 + bundle 工具（静态 + 作用域）。
  - Codex 应用服务器：通过 `materializeRequesterScopedMcpToolsForHarnessRun` 提供动态工具（仅作用域；静态服务器仍留在 Codex 的原生 MCP 客户端中）。
- 作用域工具的**规范**在该会话中首次成功解析后保持会话稳定，因此共享线程 harness（Codex）不会因为发送方变化而切换线程。在任何请求方解析之前，不会公布作用域规范。
- 共享线程 harness 上的未认证请求方仍会看到已公布的作用域工具；调用其中任意一个都会针对该请求方返回一个干净的未连接工具错误。OpenClaw 永远不会回退到其他请求方的凭据。

内存提示补充构建器接收可选的 `agentId`、`agentSessionKey` 和 `sandboxed` 上下文。记忆语料库补充 `search` 和 `get` 调用接收可选的 `agentId` 和 `sandboxed` 上下文。具有代理拥有的存储的插件应该解析每个调用的存储，而不是在注册期间捕获一个全局路径。如果需要代理 ID，但在多代理操作中缺少代理 ID，请拒绝该操作，而不是选择任意代理。

当提示词文本依赖异步插件状态时，请使用 `registerMemoryPromptPreparation(...)`。该回调会在每个完整的代理提示词之前运行一次，并接收与同步记忆提示词构建器相同的工具、代理、会话和沙箱上下文。在加载持久化状态前，验证当前存储所有者实例，然后只返回本次运行所需的行。OpenClaw 会冻结这些行，并将不可变结果交给同步提示词组装流程。将持久化、原子替换和所有者移除时的删除操作保留在所属插件内部；不要从提示词构建器中轮询或读取文件。

在处理程序成功后，Telegram 交互式处理程序可以返回 `{ submitText }`，以通过 Telegram 的正常入站代理路径路由文本。 OpenClaw 在入站策略跳过文本或处理失败时保留回调按钮，以便用户可以在阻止条件发生变化后重试。该结果字段是Telegram-特定的；其他渠道保留自己的交互结果契约。

### <a id="doctor-plugin-state-repairs"></a> Doctor插件状态修复

`PluginDoctorStateMigrationContext.repairPluginStateEntries(namespace, replacements)` 在离线 `after-session-repair` 阶段可用。每个替换件均包含来自 `readPluginStateEntriesInKeyRange` 的精确 `PluginDoctorRawStateEntry` 观测值和 JSON- 兼容的 `value`。空读取前缀会扫描最多 512 行的页面中的命名空间。主机绑定插件身份和状态位置；插件从不提供数据库路径或 SQL。

主机冻结每个批次，验证包含原始行字节的备份，并在一个事务替换其值之前比较当前维护权限下的完整观察结果。密钥、创建时间戳和过期时间保持不变。任何更改的行或数据库生成都会拒绝整个批次。插件将格式解释保留在其 Doctor 合约中，并将凭证绑定和运行时生命周期决策留给其现有所有者。较旧的主机可能会忽略此可选的修复功能。
