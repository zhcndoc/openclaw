---
summary: "运行时配置读取和写入，以及共享进程、错误和模型选择器实用程序"
read_when:
  - "您正在从插件代码读取或写入 OpenClaw 配置"
  - "您需要共享进程、错误或计时实用程序，而不是主机导入"
  - "您正在连接模型选择器持久性或机器人循环保护"
title: "插件运行时配置和实用程序"
sidebarTitle: "配置和实用程序"
---

插件代码如何读取运行时配置快照、保留配置写入以及重用共享运行时实用程序。 [Plugin 运行时助手](/plugins/sdk-runtime) 参考的一部分； [`api.runtime.config` 命名空间](/plugins/sdk-runtime/state-and-system#api-runtime-config) 保存匹配的命名空间条目。

## <a id="config-loading-and-writes"></a> 配置加载与写入

优先使用已经传入当前调用路径的配置，例如注册期间的 `api.config`，或者 channel/provider 回调中的 `cfg` 参数。这样可以让单次进程快照贯穿整个工作流程，而不是在热点路径上重复解析配置。

仅当长期处理程序需要当前进程快照并且没有配置传递给该函数时，才使用 `api.runtime.config.current()`。返回值是只读的。当下游 API 需要独立的可变副本时，使用 `api.runtime.config.current({ clone: true })`；该副本保留已解析的秘密元数据。通过下面的突变助手保留编辑。

工具工厂会接收 `ctx.runtimeConfig` 以及 `ctx.getRuntimeConfig()`。当长生命周期工具的 `execute` 回调中，配置可能在工具定义创建后发生变化时，请在回调内使用 getter。

通过 `api.runtime.config.mutateConfigFile(...)` 或 `api.runtime.config.replaceConfigFile(...)` 持久化更改。每次写入都必须选择明确的 `afterWrite` 策略：

- `afterWrite: { mode: "auto" }` 允许 gateway 重新加载规划器自行决定。
- `afterWrite: { mode: "restart", reason: "..." }` 当写入方知道热重载不安全时，强制进行一次干净重启。
- 仅当调用者拥有后续时，`afterWrite: { mode: "none", reason: "..." }` 才会抑制自动 reload/restart。

这些修改辅助工具会返回 `afterWrite` 以及带类型的 `followUp` 摘要，因此调用方可以记录或测试自己是否请求了重启。gateway 仍然负责决定重启何时真正发生。

所有者授权的命令将捕获的 `ctx.assertOwnerCurrent` 作为 `writeOptions.assertCurrent` 传递。配置编写器在异步准备之后和发布之前重新检查它，然后完成已接受写入的结算。不要将其替换为早期的 `senderIsOwner` 布尔值，或者仅在突变返回后才检查它。

使用 `current()`、传入的 `cfg`、`mutateConfigFile(...)` 或 `replaceConfigFile(...)` 访问和写入运行时配置。

对于直接 SDK 导入，对于类型使用 `config-contracts`，对于当前进程快照使用 `runtime-config-snapshot`，对于写入使用 `config-mutation`。广泛的 `openclaw/plugin-sdk/config-runtime` 兼容桶已被移除。从 `api.pluginConfig` 读取条目范围的值；仅将提供的工具上下文用于其运行时范围的配置快照，并在该边界保持特定于插件的合并。捆绑的插件测试应该直接模拟这些聚焦的子路径。

使用直接 `config-mutation` 导入替换源快照时，将编辑后的配置作为 `sourceConfig` 传递到 `replaceConfigFile`，保留其 `snapshot`、`baseHash`、`writeOptions` 和显式 `afterWrite` 策略。运行时派生的替换继续使用 `nextConfig`。即使活动运行时使用不同的快照，源替换和集中突变也会保留其文件快照的引用。

直接 SDK `updateConfig` 帮助器返回其变异器生成的配置。其磁盘写入使用原始读取快照恢复环境引用。

内部 OpenClaw 运行时代码遵循相同的方向：在 CLI、gateway 或进程边界处加载一次配置，然后传递该值。成功的修改写入会刷新进程运行时快照并推进其内部修订版本；长生命周期缓存应使用运行时拥有的缓存键，而不是在本地序列化配置。长生命周期运行时模块对环境中的 `loadConfig()` 调用实行零容忍扫描；请使用传入的 `cfg`、请求中的 `context.getRuntimeConfig()`，或在明确的进程边界处使用 `getRuntimeConfig()`。

提供程序和通道执行路径必须使用活动运行时配置快照，而不是为配置读回或编辑返回的文件快照。文件快照保留源值，例如 UI 的 SecretRef 标记并写入；提供者回调需要解析的运行时视图。当可以使用活动源快照或活动运行时快照调用帮助程序时，请在读取凭据之前通过 `selectApplicableRuntimeConfig()` 进行路由。仅当选择器与运行时快照的配对源（包括分辨率出处）匹配时，选择器才会替换提供的不同配置。没有该源的固定快照无法覆盖显式配置，包括其机密已被解析的命令范围配置。如果没有提供配置，选择器将返回运行时快照。

保留的通道监视器可以在启动时将 `createRuntimeConfigReader(cfg)` 与 `openclaw/plugin-sdk/runtime-config-snapshot` 绑定一次。当提供的配置属于活动运行时时，读者会跟踪运行时更新，否则会保留显式范围的配置，包括尚未发布运行时时。每轮阅读一次，并通过准入和回复携带该快照。诸如诊断之类的全过程控制应在排放点读取。

`createChannelInboundDebouncer` 保留其返回的数字 `debounceMs` 和默认队列计时作为启动快照。对于实时计时，传递其现有的 `resolveDebounceMs(entry)` 回调并使用绑定的配置读取器进行解析。如果挂起键或关闭簿记也取决于延迟，则捕获条目上的一个值并将其用于簿记和回调。

通道的 `reload.noopPrefixes` 仅选择该通道退出共享策略刷新。仅在每个保留的消费者实时读取前缀或不使用它后才声明前缀。未声明通道仍刷新；一个通道的声明不能抑制同级通道的重新加载。较窄的 `reload.configPrefixes` 条目可以在较宽的无操作前缀下保留重新启动行为。

## <a id="reusable-runtime-utilities"></a> 可复用运行时工具

对于接受 Node HTTP 代理的库，请使用 `openclaw/plugin-sdk/fetch-runtime` 中的 `createNodeProxyAgent`。使用 `mode: "env"`，为固定目标提供 `targetUrl`，或者在库自己选择目标（例如媒体上传主机）时忽略它。可重用的表单对代理环境进行快照，并针对每个请求（包括重定向）评估 `NO_PROXY`。托管代理 CA 信任仅适用于匹配的代理连接。当所属连接关闭时调用 `agent?.destroy()`。来自同一 SDK 入口点的 Undici 调度程序属于 fetch 的 `dispatcher` 选项，而不是 Node 的 `agent`。

从 `openclaw/plugin-sdk/agent-harness-runtime` 导入 `execPolicy` 作为主机的执行模式代数。 `execPolicy.resolveExecModePolicy({ mode, security, ask })` 返回模式、安全、询问和自动检查设置。显式模式决定这些设置；如果没有，助手将保留 security/ask 对并导出其显示模式。 `execPolicy.minSecurity(a, b)` 选择更具限制性的安全值，`execPolicy.maxAsk(a, b)` 选择更强的批准要求。提供者适配器保留自己严格的输入验证和本机 sandbox/approval 投影。

这些类型化对象成员替换了 `infra-runtime` 中已停用的 `minSecurity` 和 `maxAsk` 导出。已停用的 `resolveExecModeFromPolicy`、`resolveExecPolicyForMode` 和 `resolveExecModePolicy` 导出也可以迁移到 `execPolicy.resolveExecModePolicy`，选择它们需要的返回字段。

本机命令检查应使用 `runCommandWithTimeout`、`openclaw/plugin-sdk/process-runtime` 和 `timeoutMs`、调用者的 `signal` 和 `killProcessTree: true`。对于输出始终为 UTF-8 的命令（例如 JSON 状态检查），请使用同一子路径中的 `runUtf8CommandWithTimeout`。在取消的远程启动传递其 PID 之前，可以返回有界命令结果。当命令拥有会话保留或临时输出时，在释放这些资源之前，请在执行周围等待来自同一子路径的 `withCommandProcessScope`。范围加入后期启动和进程清理；不确定的清理仍然是一个错误。

对于插件拥有的长寿子项，请使用来自同一子路径的 `spawnOomScoreAdjusted` 和本机 `spawn` 选项。在 Linux 上，它在本机生成后立即将子级的 `oom_score_adj` 提升到 `1000`，因此内存压力会优先杀死子级。这会保留自定义 `argv0`、环境和本机启动错误。在写乐谱之前有一个短暂的窗口；在该窗口中创建的后代可以保留继承的分数。 Gateway 的分数从未改变。 `OPENCLAW_CHILD_OOM_SCORE_ADJ=0` 禁用该策略，包括针对已清理的子环境；显式子值会覆盖父值。显式的 `shell` 发布仍然由调用者拥有。 `prepareOomScoreAdjustedSpawn` 的较低级别用户必须在生成后立即调用其可选的 `afterSpawn(child.pid)` 以应用自定义 `argv0` 调整。

来自同一子路径的 `reapOrphanedProcesses` 支持在原始主机死亡后恢复插件拥有的 macOS 进程树。为其配置的实例提供准确的托管可执行文件和参数谓词；当相对参数依赖于启动目录时，还提供 `cwd`。它仅选择同一用户，launchd-adopted root，保留本地出生身份和匹配的后代，并加入有界 TERM-to-KILL 清理。它永远不会在根退出后向进程组发出信号或发现新的后代。在托管服务准备期间、基于运行状况的重用之前调用它，并将外部托管端点保留在该路径之外。未知身份在受支持的主机上被拒绝；没有本地出生身份支持的主机和其他平台不会影响现有流程。 PID 1 本身可以是 Linux 上的实时所有者。

对于需要 Node.js 的子进程，请使用同一子路径中的 `resolveNodeRuntimeExecutable`。当主机在 Bun 下运行时，它重用当前的 Node 可执行文件并解析真正的 Node 二进制文件，跳过 Bun 的 `node` 填充程序。不可用的 Node 运行时返回 `undefined`；呼叫者报告缺少需求。

交互式进程适配器可以使用同一子路径中的 `spawnTerminalPty`。它拥有特定于平台的终端创建。在 macOS 和 Linux 上，Bun 仅在提供 `Bun.Terminal.pause()` 和 `resume()` 的构建上使用其本机 PTY，而不使用 Node，例如 OpenClaw Bun fork 版本还带有 macOS 子出口修复程序。其他 Bun 版本使用 Node 帮助程序，并需要安装 Node 运行时；选择 OpenClaw 时会跳过 Bun 的 `node` 垫片。 Node 和 Windows 保留 `node-pty`。请参阅 [Bun 兼容性 ](/install/bun-compatibility#known-limitations)。通过第二个参数传递调用者的构造信号和当前权限检查。调用者拥有输出订阅、终止，并在释放其后端资源之前等待终端退出。

沙箱命令适配器保留沙箱所有者的每流输出绑定 `SANDBOX_COMMAND_MAX_BUFFER_BYTES`，来自 `openclaw/plugin-sdk/sandbox`。

当终止失败时，`openclaw/plugin-sdk/process-runtime` 中的 `WorkerTaskPool` 会保留工作人员和未消耗的输入。在同一池上重试 `close()`；仅在确认关闭后才处理相关文件。可选的 `onRetirementFailure(error)` 观察器在终止失败时同步运行。可能返回`void`或`Promise<void>`；观察者抛出和拒绝不会取代终止错误或释放保管权，并且关闭不会等待观察者。

捆绑池通过 `workerClass` 或构建 `WorkerTaskPool` 时准备的数字预算来使用主机大小调整策略。主机从 `os.availableParallelism()` 开始调整池大小，尽可能保留一个 CPU：`reader` 最多允许两个工作线程，`file-reader` 最多允许两个用于小文件读取，`compute` 最多四个，而 `writer` 或 `singleton` 正好是一个。 Worker 是按需创建的。选择 `singleton` 用于工作线程本地延续状态、代范围回调或有意共享的本机堆；独立请求并不会使这些所有者成为并行安全的。当池具有串行副作用时，选择 `writer`。 SQLite 的写入器代理仍然为每个物理数据库拥有一个写入器；它的跨数据库工作预算不会为数据库创建额外的编写器。

前台成绩单历史记录和上下文各自保留主机 CPU 净空的一半，每个池最多可容纳 8 个工作人员。背景记录所有者保持序列号。共享状态读取器至少保留两名工作人员，因此保留的结算读取可以在发布之前接受新的目录读取。库存哈希保留其 CPU 和可用内存准入预算，包括其在低内存和 Bun/Linux 主机上的进程内回退。

读取器、文件读取器和计算类默认为每个工作线程 512 MiB V8 老一代限制。显式的 `workerOptions.resourceLimits` 会覆盖相应的限制；本机分配、缓冲区和 WASM 内存仍然由调用者负责。现有的数字 `maxWorkers` 仍然受支持。当两者都提供时，`workerClass` 优先；已发布的插件可以保留其对旧支持主机的数字限制，直到其最低主机版本包括类大小调整。 FIFO 任务接纳不变；并行任务可能会无序完成，因此需要串行完成的所有者必须使用串行类。此策略不添加操作员配置或存储迁移。

池可以将 `burstIdleTimeoutMs` 设置为比 `idleTimeoutMs` 更早让工人在第一个可用槽位之后退休。使这些剩余工人退休并不能延长第一批工人的适应温暖窗口。图像处理在共享计算许可下最多使用两个工作人员，并在五秒空闲后退出剩余容量。 Control UI 文件读取使用其自己的有界双工作池，因此共享计算争用无法阻止资产读取。

`prepareWorker()` 可以为一次性暂存文件返回 `temporaryDirectory`，并为生产者拥有的资源返回可选的异步 `releaseResources()` 回调。两者都将保留，直到确认 Worker 退出为止；如果在 Worker 存在之前构造失败，清理也会运行。当两者都提供时，池首先尝试临时目录删除，然后调用 `releaseResources()`，即使删除失败也是如此。清理失败会变成警告。 Worker退出后资源清理本身不保留执行能力；挂起的输入准备仍然可以保留它，如下所述。 `close()` 在完成之前加入清理回调。失败的终止不会运行任何清理步骤；在同一池上重试 `close()` 以确认退出并释放它们。

取消可以在异步输入工厂稳定之前拒绝 `run()`。池保留其输入和容量，直到准备工作和所需的工人退休都完成，然后调用 `onInputConsumed`。当取消的初始退出成功时，本机执行接收先于结果拒绝。失败的停止可以提前拒绝，同时保留本地监护权和等待重试的收据。

输入工厂必须独立于同一池的 `close()` 进行结算：等待待处理工厂内的关闭会创建一个循环，因为关闭会加入该工厂。在等待 `close()` 之前取消工厂拥有的任何等待的工作，然后在处理工厂仍​​然捕获的资源之前等待关闭。 `run()`信号取消任务；它不会中断工厂等待的任意工作。

即使 `run()` 已被拒绝，也可以处理来自 `close()` 的错误。对于取消的挂起准备，输入和执行接收回调失败由 `close()` 报告；入场将一直保留，直到关闭观察到清理失败为止。

当启动您的插件拥有的隔离网关子级时，请在应用调用者覆盖后从其环境中删除 `SUPERVISOR_HINT_ENV_VARS`。该列表是从`openclaw/plugin-sdk/process-runtime`导出的；否则，继承的父服务标记会将重新启动所有权分配给该父级的主管。

使用同一子路径中的 `splitCommandArgs(raw)` 对引用的进程参数进行分组。反斜杠和 `#` 保持原义；没有外壳扩展。未完成的报价返回 `null`，除非调用者传递 `{ allowUnclosedQuotes: true }` 以保留现有的许可输入合约。空引用的参数被省略。

现有流程所有者可以使用 `signalProcessTree`。它的 `onComplete` 回调在 Unix 信号或有界的 Windows `taskkill` 尝试之后运行，而不是证明每个进程都退出了。通过清理保持检查挂起，仅对您创建的进程组使用 `detached: true`，并在其根仍处于活动状态时启动 Windows 树终止。

修改钩子后，直接传递代理回复的通道插件可以在传递时从 `openclaw/plugin-sdk/interactive-runtime` 调用 `renderPresentationForDelivery(handler, payload)`。提供通道的`presentationCapabilities`和`renderPresentation`回调；回调接收一个有效负载，其中包含规范化的、改编的 `presentation` 和规范化的原始表示作为其第二个参数。使用原始的全卡文本后备，必须保留由本机限制剪切的标签。这共享核心出站渲染的后备文本策略，并在渲染后删除可移植的表示字段。回调可以是同步的或异步的。

使用 `openclaw/plugin-sdk/error-runtime` 中的 `attachErrorDiagnostic(error, text)` 将补充操作员诊断附加到引发的错误，而不更改其标识、消息或故障分类。首先屏蔽不透明的凭证；该帮助程序还会编辑已识别的秘密并最多保留 2,048 个字符。 `formatErrorMessageForDisplay(error)` 通过嵌套原因和聚合包括最近的附加诊断。仅在终端显示边界使用它，切勿用于重试或身份验证决策。代理生命周期错误和终端 CLI 日志会自动呈现这些诊断；成功的运行保持安静。本机 RPC 错误消息保留其原始文本； `agent.wait` 在其最终结果边界处呈现补充诊断。

通道插件必须允许经过身份验证的代理通过其注入的 `api.runtime.agent.runCommandFromIngress(options, runtime)` 功能进行轮换。主机仅接受来自为 `options.messageChannel` 注册的确切活跃、可信插件的所有者权限；客人轮流保留其非所有者身份。公共 `agentCommandFromIngress` SDK 帮助程序从不接受调用者提供的所有者声明。

模型选择器集成使用两个集中的运行时子路径。从 `openclaw/plugin-sdk/interactive-runtime` 导入类型化的 `ModelPickerAction` 和 `ModelPickerCapabilityProfile` 合约。从 `openclaw/plugin-sdk/model-session-runtime` 导入 `applySessionModelSelection(...)` 及其结果类型；这是实时会话突变界面，包括其权威的冲突检查和提交后效果。较低级别的 `applyModelOverrideToSessionEntry(...)` 帮助器不是选择器持久性 API。

模型选择保留了已保存的思维偏好；执行将其限制到所选模型的支持级别。选择结果中不再发出 `thinkingRemap`。在下一个 SDK 主要版本之前，其可选类型仍然不推荐使用。会话行将保存的请求公开为 `thinkingLevel`。 `sessions.patch` 在 `entry.thinkingLevel` 中返回该首选项，并在 `resolved.thinkingLevel` 中返回执行级别。

仅当通道回调无法进入完整的实时会话事务并且已拥有原子存储的会话条目补丁时，才使用 `applyModelOverrideWithAuthProfileCompatibility(...)` 作为直接持久性回退。传递活动配置、解析的代理目录、条目、更改前的有效提供程序以及经过验证的选择。帮助程序仅改变该条目：当其记录的凭据提供程序或配置的别名兼容时，它会保留固定的身份验证配置文件，清除不兼容的 pin，并强制执行模型选择锁定。调用者仍然拥有模型白名单验证、原子持久性、`markLiveSwitchPending` 以及任何提交后效果。当完整交易可用时，首选 `applySessionModelSelection(...)`。

在异步会话输入补丁中，从同一子路径准备一个带有 `await prepareAuthProfileProvider({ agentDir, profileId })` 的现有身份验证引脚，并将其结果作为 `recordedProvider` 传递。这会重用运行时快照或通过身份验证所有者读取持久的凭据。即使 `provider` 是 `undefined` 也传递结果：它记录已完成的准备并防止同步回退查找。当条目没有身份验证密码时，跳过准备工作。

模型选择器操作仅携带有界快照和目录标记。通道参与者身份、源消息绑定和序列化回调数据保留在通道的私有身份验证信封中。通道编解码器选择使用 `{ modelPicker: true }` 解决这些操作；没有选择器功能的通道会继续拒绝该操作，而不是将其视为不透明的回调。

对于 bot 编写的入站消息，使用入站的 `botLoopProtection` 事实。Core 会在会话记录和分发之前应用共享的内存滑动窗口防护， 而不会将策略绑定到某一个 channel。该防护会跟踪 `(scopeId, conversationId, participant pair)` 键，将一对参与者的两个方向合并计数，在超过窗口预算后应用冷却时间， 并主动清理不活跃的条目。可重试的传输还应提供稳定的 `eventId`；在事件仍处于活动窗口期间，重放已接受的事件不会再次消耗预算槽位。 被抑制的事件不会新增任何保留的事件身份状态。

向运营商公开此行为的通道插件应该更喜欢共享 `channels.defaults.botLoopProtection` 形状作为基准预算，然后在顶部覆盖 channel/provider-specific 。共享配置需要几秒钟的时间，因为它是面向用户的：

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

### <a id="bounded-waits"></a> 有界等待

`openclaw/plugin-sdk/time-runtime` 出口 `raceWithTimeout(operation, timeoutMs, onTimeout, { ref?, signal?, onAbort? })`。传递现有的 Promise，或者当计时器必须在工作之前启动时返回 Promise 的函数。超时回调返回回退或抛出调用者的错误。延迟使用本机 `setTimeout` 语义；除非 `ref` 为 `false`，否则计时器使进程保持活动状态，并在竞赛结束时清除。

当提供 `signal` 时，相同的等待拥有取消并清除任何结果的计时器和侦听器。 `onAbort(signal)` 返回后备或抛出调用者的错误；默认抛出一个 `AbortError` 信号原因作为其原因。该操作在承诺竞赛中首先进行，包括当两个输入都已经解决时。在调用之前检查现有的中止是否必须阻止操作工厂启动。

`racePromiseWithAbortSignal(operation, signal?, createError?)` 来自同一子路径边界观察（通过调用者取消）。已经中止的信号胜过已经确定的承诺。默认情况下，它会拒绝 `AbortError`，其原因是信号的原因； `createError(signal)` 可以保留传输的现有取消错误。当竞赛解决并观察到迟来的源拒绝时，助手会删除其中止侦听器。返回 Promise 的函数在注册中止侦听器后启动；已经中止的信号会阻止该功能启动。

两个助手都不会取消底层操作或证明清理已完成。与操作的生命周期所有者一起保持资源结算、权限检查和中止副作用。

### <a id="stage-timing-diagnostics"></a> 阶段定时诊断

`openclaw/plugin-sdk/time-runtime` 导出 `createStageTimingTracker(now?)` 和 `formatStageTimings(stages)`。跟踪器记录舍入的非负 `durationMs` 和 `elapsedMs` 值。 `mark(name)` 自上一个标记以来测量； `measure(name, run)` 和 `measureSync(name, run)` 记录显式跨度，包括失败的工作，并保留回调的结果或错误。测量的跨度不会推进 `mark` 使用的检查点。

`snapshot()` 返回带有复制的阶段数组的 `{ totalMs, stages }`。可选时钟默认为 `Date.now`。格式化会生成以逗号分隔的 `name:durationMs@elapsedMs` 条目（带有 `ms` 单位）或 `none`。调用者保留日志标签、警告阈值以及何时发出摘要的所有权。

对于进程范围的性能日志记录，`openclaw/plugin-sdk/diagnostic-runtime` 导出 `areDiagnosticsEnabledForProcess(): boolean` 和 `createSubsystemLogger`。此聚焦入口点在插件描述符注册期间不会加载实时会话诊断或网络调度程序配置。谓词读取当前进程范围的诊断设置； `isDiagnosticsEnabled(config)` 而是读取提供的配置快照。这两个函数都不会更改设置或启用导出器。在收集仅诊断状态之前，将流程谓词与选定的日志级别结合起来：

```typescript
import {
  areDiagnosticsEnabledForProcess,
  createSubsystemLogger,
} from "openclaw/plugin-sdk/diagnostic-runtime";

const log = createSubsystemLogger("example/catalog");
function diagnosticsEnabled() {
  return areDiagnosticsEnabledForProcess() && log.isEnabled("warn");
}
```

发出延迟摘要时重新检查门。保持字段有界且无内容，并在诊断接收器失败时保留操作结果。此谓词不会启用或授权 [ 审核身份收集 ](/gateway/audit)。

`onInternalDiagnosticEvent(listener, interest?)` 在为侦听器复制事件负载之前过滤事件。 `include` 和 `exclude` 适用于每个事件；可选的 `includeTrusted` 列表进一步限制仅由调度程序标记为信任的事件。忽略它会保留现有行为，并且空列表仅接受通过 `include`/`exclude`. 事件有效负载字段的不受信任事件，无法覆盖调度程序的信任元数据。接受的事件保留其各自的冻结副本；此过滤器不会更改诊断收集或队列行为。
