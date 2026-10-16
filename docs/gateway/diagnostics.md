---
summary: "为错误报告创建可共享的 Gateway 诊断包"
title: "诊断导出"
read_when:
  - "准备错误报告或支持请求时"
  - "调试 Gateway 崩溃、重启、内存压力或超大负载时"
  - "查看记录了哪些诊断数据或哪些数据被遮蔽时"
---

OpenClaw 可以为错误报告生成本地诊断 `.zip`：经过净化的 Gateway 状态、健康状况、日志、配置结构，以及最近的无载荷稳定性事件。

在审查之前，请将诊断包视为机密。有效载荷和凭据会按设计被遮蔽，但该包仍会汇总本地 Gateway 日志和主机级运行时状态。

## <a id="quick-start"></a> 快速开始

```bash
openclaw gateway diagnostics export
```

打印已写入的 zip 路径。选择输出路径：

```bash
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
```

用于自动化：

```bash
openclaw gateway diagnostics export --json
```

## <a id="chat-command"></a> 聊天命令

所有者可以在任何对话中运行 `/diagnostics [note]`，以请求一个本地 Gateway 导出，作为一份可直接复制粘贴的支持报告：

1. 发送 `/diagnostics`，也可以附上一段简短备注（`/diagnostics bad tool choice`）。
2. OpenClaw 会发送一段前言，并请求一次明确的执行批准，随后运行 `openclaw gateway diagnostics export --json`。不要通过允许全部的规则来批准 diagnostics。
3. 批准后，OpenClaw 回复本地捆绑路径、清单摘要、隐私说明和相关会话 ID。

在群聊中，所有者仍然可以运行 `/diagnostics`，但 OpenClaw 会将导出结果、审批提示和 Codex session/thread 明细私下发送给所有者。该组只能看到简短的状态通知：待批准、已确认私人交付、待交付或禁止交付。待发送不会触发另一个私人发送。如果不存在私有所有者路由，则该命令会要求所有者从 DM 运行它。

当活动会话使用本机 OpenAI Codex harness时，相同的执行批准还涵盖 Codex 线程 OpenClaw 知道的 OpenAI 反馈上传。该上传与本地网关 zip 分开，并且仅发生在 Codex harness会话中。批准提示指出批准还会发送 Codex 反馈，而不列出 Codex 会话或线程 ID。批准后，回复会列出通道、OpenClaw 会话 ID、Codex 线程 ID 以及发送到 OpenAI 的线程的本地恢复命令。拒绝或忽略批准会跳过导出、Codex 反馈上传和 Codex ID 列表。

这使得 Codex 调试循环很短：注意通道中的不良行为，运行 `/diagnostics`，批准一次，共享报告，然后如果您想自己检查线程，则在本地运行打印的 `codex resume <thread-id>` 命令。请参阅 [Codex harness](/plugins/codex-harness/commands#inspect-codex-threads-locally)。

## <a id="what-the-export-contains"></a> 导出内容

- `summary.md`：供支持使用的人类可读概览。
- `diagnostics.json`：配置、日志、状态、健康状况、 以及稳定性数据的机器可读摘要。
- `manifest.json`：导出元数据和文件列表。
- 已清理的配置结构和非敏感配置详情。
- 已清理的日志摘要和最近的已脱敏日志行。
- 尽力获取的 Gateway 状态和健康状况快照。
- `stability/latest.json`：最新持久化的稳定性数据包（如可用）。

当网关不健康时，导出仍然有用：如果 status/health 请求失败，仍会收集本地日志、配置形状和最新的稳定性包（如果可用）。

## <a id="privacy-model"></a> 隐私模型

保留：子系统名称、插件 ID、提供程序 ID、通道 ID、配置模式、状态代码、持续时间、字节计数、队列状态、内存读数、清理的日志元数据、编辑的操作消息、配置形状和非秘密功能设置。

省略或编辑：聊天文本、提示、说明、webhook 主体、工具输出、凭证、API 密钥、令牌、cookie、秘密值、原始 request/response 主体、帐户 ID、消息 ID、原始会话 ID、主机名和本地用户名。

当日志消息看起来像用户、聊天、提示词或工具负载文本时， 导出内容只保留已省略消息这一事实以及其字节计数。

## <a id="websocket-disconnect-logs"></a> WebSocket 断开日志

连接的网络聊天和经过身份验证的用户断开连接在默认信息级文件日志中包括 `durationMs`（连接生命周期以毫秒为单位）。 `cause` 字段包含网关记录的关闭原因（如果已知）；否则将被省略。 `heartbeat-timeout` 记录了网关错过乒乓球的决定。它不能证明 ping 已到达远程对等点或对等点导致传输失败。

心跳超时记录还在终止前捕获这些事实：

- `pingWriteState`：未观察到写入回调时的 `pending`、本地写入完成后的 `completed` 或写入错误后的 `failed`。待处理并不能证明 ping 未发送；已完成并不能证明同行已收到。
- `lastPongAgeMs`：自上次观察到 pong 以来单调经过的毫秒数，当没有观察到 pong 时省略。
- `bufferedBytes`：超时决策时聚合本地 WebSocket 缓冲，而不是单个 ping 的传送状态。

## <a id="command-lane-diagnostics"></a> 命令通道诊断

当排队任务在等待至少其警告阈值（通常为 2 秒）后启动时，会发出 `[diagnostic] lane wait exceeded`。 `waitedMs` 等待测量； `queueAhead` 和 `activeAhead` 描述排队时间争用，而 `activeNow` 和 `queueBehind` 描述任务启动时的通道。

当调用者提供它们时，此警告和 `lane task error` 都包括排队时间 `taskKind`、`sessionKey`、`runId` 和 `requesterSessionKey`。这些是结构化日志字段，并显示在同一控制台行上，允许在无需单独的注册表查找的情况下对子代理队列争用进行归因。嵌入式运行提供 `spawn`、`turn` 或 `cron` 作为任务类型；它们的会话密钥标识正在等待或失败的会话，并且它们的请求者密钥是生成父级（如果存在）。排队的手动 cron 运行提供其接受的运行 ID。未知字段被省略。身份是诊断来源，而不是权威，并且不会改变准入、排序或警告阈值。

## <a id="stability-recorder"></a> 稳定性记录器

当启用诊断时，Gateway 默认会记录一个有边界、无负载的稳定性流。它捕获的是运行事实，而不是内容。

子进程生成示例使用有界命令系列和操作标签。已知所有者区分代理执行启动 （`agent.exec`）、shell 环境快照 （`shell.snapshot`） 和服务中继帮助程序 （`service.relay`）。其他所有者区分 CLI 后端 （`agent.cli`）、独立文件读取 （`agent.file-read`）、服务管理器命令 （`service.manager`）、本机工作树写入 （`worktree.filesystem`）、停用的签出删除 （`worktree.cleanup`） 和临时包清理（`worktree.maintenance`）。为代理执行官启动的中继保留 `agent.exec` 作为其所有者。本机 PTY exec 启动在成功准入后使用相同的计数器。 Windows PTY 异步发布其 PID，因此归因会等待第一个输出或退出，而不会延迟终端。无范围发布使用固定分类，例如 `unscoped.shell-command`、`unscoped.runtime` 或 `unscoped.gh`；参数、脚本文本和路径永远不会成为标签。 Linux OOM-protection exec 包装器报告逻辑目标命令，因为生成代理可以省略包装器 shell。计数代表了成功承认的发射，而不是孙辈的人口普查。

网关RPC诊断保留准确的核心和注册插件方法名称，包括`node.invoke.result`和`workboard.cards.list`；未注册的请求名称折叠为 `other`（专用工作线程入口使用 `unknown`）。方法标签集受注册目录加上这些后备标签的限制，而不是由调用者提供的名称限制。 Prometheus 导出器保留其在计数器、仪表和直方图中共享的 2,048 个样本上限；充分观察的方法最多使用五个样本。请观看 `openclaw_prometheus_series_dropped_total` 以了解不完整的覆盖范围。有关计时语义，请参阅 [Prometheus 指标 ](/gateway/prometheus)。

现有的诊断心跳调试日志包括 `nextWakeAtMs`，网关调度程序中最早的挂起唤醒时间，以毫秒为单位的 Unix 时间戳（或 `none`，当没有挂起唤醒时）。睡眠后逾期诊断心跳运行一次；调度程序不会重播错过的滴答声。

尽力维护共享一个十秒的阶段。它的第一次通过可能会提前十秒；后面的传递停留在名义插槽上，而不是随着回调持续时间而漂移。健康空闲事件循环采样加入此阶段，而活动或降级采样保持一秒的节奏。到期、重试、租赁和传输活跃期限保留各自的时间安排。

健康的本机目录监视对错过的事件使用五分钟的恢复扫描。丢失目录、祖先监视和失败的监视将在 30 秒内重试。身份验证、数据库身份和会话源观察者保留其 30 秒恢复限制；交付的本机事件仍然立即失效。

当事件循环或 CPU 看起来饱和时，相同的心跳还会对活跃度进行采样，发出 `diagnostic.liveness.warning` 事件，其中包含事件循环延迟、事件循环利用率、CPU- 核心比率、active/waiting/queued 会话计数、当前 startup/runtime 阶段（已知时）、最近阶段跨度和有界工作标签。当工作正在等待或排队时，当活动工作与持续的事件循环延迟重叠时，或者当网关报告至少 60 秒的持续降级时，这些日志行将成为网关 `warn`- 级别的日志行；否则，他们会登录 `debug`。即使没有活动的跟踪工作，持久网关降级也会发出警告。其他空闲活动样本仍然是诊断事件，不会升级为警告。

在同步回调阻塞超过一秒后，网关还会发出始终开启的 `main-thread stall` 警告。每行都命名了计划作业、诊断阶段、时间线跨度或工作人员消息处理中运行时间最长的已知任务段，以及已用时间和任务毫秒数。等待 I/O 的时间不算作任务执行。标签涵盖显式任务范围的同步部分。异步延续和未知回调使用来自事件循环采样器的尽力而为的未归因延迟警告；网关不会安装进程范围的异步挂钩来计时每个承诺的延续。在健康的空闲窗口期间，本机直方图被禁用：在下一个采样截止日期之前完成的无范围停顿可以不报告。显式任务范围和逾期空闲唤醒仍然可见。进程暂停也会产生不明原因的延迟。报告仅限于八个待定的命名停顿，如果超过该限制，则省略计数。这些警告既不需要检查器连接，也不需要采样分析器。

启动阶段发出带有挂钟和全进程 CPU 计时的 `diagnostic.phase.completed` 事件，包括工作线程和本机线程。阶段 CPU 可以包括该阶段之外的并发工作；这不是排他性的归属。相位和活动事件中的 `cpuCoreRatio` 以核心等效值进行测量，可以超过 `1`。请参见 [CPU 压力和事件循环延迟](/gateway/health#cpu-pressure-and-event-loop-delay)。

即使禁用诊断，持续至少一秒的 `sessions.patch` 和 `sessions.patchMany` 调用也会添加信息级 `slow session patch` 记录。该消息包括总经过的毫秒数、方法和固定阶段持续时间，例如 `slow session patch 1176ms method=sessions.patch catalog=1100ms response=20ms`。替换快照使用元数据读取器进行有限的精确键选择，使用维护读取器进行更大的或标签所有者的选择，独立于转录历史记录读取器。快照时间包括工作人员准备和读取。阶段区分生命周期准入、快照读取、目录准备、投影、提交、运行时确认、效果和响应工作。在消息中保留计时使得它们在省略结构化字段的传输中可见。记录继承请求的诊断跟踪（如果可用）并且不包含补丁值或会话密钥。重复的阶段访问会增加每个阶段的总数。并行阶段和嵌套阶段可以重叠，因此它们的总计既不是请求时间的唯一细分，也不是 CPU 测量值。

会话协作读取将排队的 `diagnostic.phase.completed` 事件发送给感兴趣的诊断侦听器。 `session.members.list`和`session.members.listEvidence`分别为`profiles`、`evidence`和`projection`等待； `session.discussion.info` 和 `session.discussion.open` 报告 `provider` 时间，包括远程提供商请求。阶段名称使用方法作为前缀，并且不包含会话密钥或响应数据。会员证据使用现有的投影工作通道，因此完整的成绩单读取不会阻塞它。成员资格 `projection` 阶段准备创建者选择元数据，而无需等待不相关的会话显示行或工作人员放置详细信息。 `evidence` 阶段在一个快照中读取成员资格和当前管理元数据。

启用诊断和警告日志后，持续至少一秒的 `sessions.create` 调用会发出 `slow session create`。它的 `elapsedMs` 和 `phaseDurationsMs` 独立的请求准备、准入、目标发现、工作树准备、行快照和投影、转录本初始化、编写器准入、提交、发布、初始轮调度和响应工作。这些是经过的时间，包括等待，具有固定的阶段名称，没有会话密钥或请求值。工作树准备仅测量响应之前所需的工作；已推迟到初始回合的配置将保留在该回合的生命周期内。

托管工作树准备在返回或失败时发出一条信息级 `managed worktree preparation` 记录。 `kind=managed` 涵盖结账创建； `kind=sandbox` 涵盖了通过后端准备情况进行的托管来宾投影，包括 workspace/skill 布局和容器配置。 `durationMs` 测量整个操作。 `phaseDurationsMs` 将存储库和源准备、分配和检出租用等待和释放、插槽预留、基本解析、检出注册、磁盘准入、忽略文件配置、源托管释放和注册表发布分开。基本分辨率区分共享远程刷新、对象水合、本地快进以及每个调用者等待该准备。模板准备和应用、索引刷新、设置执行、快照捕获、各个方向的同步、工作区布局和容器启动都有自己的阶段。阶段包括嵌套工作和异步等待，因此不要将它们添加到总数中。 `unattributedMs` 测量所有记录阶段之外的经过时间，无需重复计算重叠。不存在未进入的阶段。对于现有投影，`template` 是 `warm`、`cold`、`unavailable` 或 `reused`；记录不包含存储库路径、会话密钥或设置输出。启用诊断后，相同的观察结果将输入 [worktree 准备直方图 ](/gateway/prometheus#worktree-preparation)。

两个相关的信息级记录有助于归因缓慢的工作树清理：`slow managed worktree removal` 将分配准入、回调工作和最终结算分开，并在回调内进行准备、快照、结帐删除和主体最终确定计时； `slow Git ref mutation` 将目录解析、队列等待和排队工作分开。两者都需要诊断和信息级日志记录，仅在持续至少一秒的操作稳定后发出，并且每个运行时隔离具有每分钟 60 条记录的单独固定预算，计数为 `omittedObservations`。它们保留固定的标量字段和现有跟踪，而不添加私有路径或新身份。它们的经过时间间隔可以嵌套在 `worktreeCleanup` 内并包括异步等待；它们不是 CPU 或单独的子命令计时。有关字段和缺失记录限制，请参阅 [Slow worktree cleanup](/logging#slow-worktree-cleanup)。

SQLite 会话写入警告也将 `queueWaitMs`、`writerExecutionMs` 和 `completionDelayMs` 分开。这些测量了写入器开始、在写入器通道内工作和等待之前的时间，以及调用者在执行后恢复之前的时间。 Writer 执行不是 SQLite 事务锁保持时间；本机事务锁定等待和保持警告保持独立。在输入写入者之前拒绝的写入会省略这三个字段。此细分位于文件日志中，而不是聚合网关 RPC Prometheus 直方图中。

这些警告包括作者的 `pid`、Node、`threadId` 和 `isMainThread`。回收回调还记录它们的 `reclamationKind`，并且当创建 Worker 时，捕获它的 `workerThreadId`。在同一进程生命周期内，将警告的 `pid` 和 `workerThreadId` 与代理数据库打开警告的 `pid` 和 `threadId` 进行匹配，以识别等待的 Worker。这建立了关联，而不是 CPU 归属或工人生命周期的细分。丢失的 Worker ID 无法确定该工作在主线程上运行。

从源签出中，汇总现有的 JSONL 文件，而无需联系网关或打开其数据库：

```bash
node scripts/diagnostic-writer-occupancy.mts gateway.log --json \
  --from 2026-10-13T14:10:00Z --until 2026-10-13T15:50:00Z
```

该报告将观察到的预留和队列等待间隔拆分为 UTC 分钟，对操作类别进行排名，并列出观察到的最长预留。本机事务阶段单独出现：`hostAdmissionWaitMs` 测量等待主机的时间，而 `sqlMs` 是剩余执行时间，包括 JavaScript 处理。请勿将交易时间添加到随附的预订时间中。

这是一次警告性普查，并非完整的作家利用率。缺乏快速操作，`direct` 保留不识别其底层命令，并且日志不记录物理队列深度。观察到的等待的最大重叠范围为 process/thread，但可以跨越不同的数据库；它无法识别哪个持有者阻止了特定的服务员。可重入和会话生命周期队列记录不包括在预留总数中。间隔重建使用日志发射时间作为完成代理并剪辑到请求的窗口，因此也包括在窗口之后发出的记录。从一台主机提供每个事件一次，包括在需要时通过 stdin 轮换文件。输出仅保留固定操作类别和数字计时，没有路径、会话标识或内容。

当最后一个桥接进度看起来已结束（例如原始响应项或响应完成事件）但网关仍认为嵌入式运行处于活动状态时，停滞的嵌入式运行诊断标记为 `terminalProgressStale=true`。

查看实时记录器：

```bash
openclaw gateway stability
openclaw gateway stability --type payload.large
openclaw gateway stability --json
```

在致命退出、关闭超时或重启启动失败后，检查最新持久化包：

```bash
openclaw gateway stability --bundle latest
```

从最新持久化包创建诊断 zip：

```bash
openclaw gateway stability --bundle latest --export
```

当存在事件时，持久化包位于 `~/.openclaw/logs/stability/` 下。

## <a id="cpu-profile"></a> CPU 简介

具有 `operator.admin` 的操作员可以请求网关的主 JavaScript 隔离的一个内存中配置文件：

```bash
openclaw gateway call diagnostics.cpuProfile --params '{}' --timeout 30000 --json
```

RPC 支持 Node 和 OpenClaw 的 Bun 运行时。它请求以 10 毫秒的间隔进行 5 秒的采样，并且不打开调试器端口，也不发送过程信号。呼叫者断开连接或网关关闭会取消捕获并运行探查器清理。重叠请求失败而不是排队。没有配置文件写入磁盘或包含在诊断导出中。

结果包含 V8 CPU-profile 格式的 `profile`、`requestedDurationMs`、`actualDurationMs`、`startBlockedMs`、`samplingIntervalMicros`、`redactedNodeCount` 和 `sampleLossCount: null`，因为本机分析器不要暴露明确的丢失样本计数。 Node 样品V8； Bun 对 JavaScriptCore 进行采样并返回相同的配置文件格式。完整结果仅限于1个MiB；较大的配置文件会在不截断节点或样本的情况下失败。 OpenClaw包内的代码位置使用`openclaw:`路径； Node 内置位置使用 `node:` 路径。外部路径、评估标签和其他无法识别的名称都会被编辑。保留已识别位置处的有界代码符号名称；它们的语法并不证明计算名称是公共的。在分享之前查看个人资料。图形边缘、本机签名脚本 ID 和样本顺序保持不变。 V8 可以不按时间戳顺序发出样本，因此可以保留带符号的时间增量，供配置文件查看者重建时间戳和排序样本。

当事件循环被阻塞时，采样可能会超出请求的时间间隔。响应限制不会限制该延迟期间运行时的内部分配。配置文件示例描述了此隔离，而不是所有进程线程，并且不是精确的每个函数 CPU 统计。

在 Node 上，CPU 捕获与网关的失速飞行记录器共享本机分析器。当该记录器在 Node 26 上处于活动状态时，启动操作符捕获将重用其代码图，而无需再次扫描堆。如果没有本机配置文件已处于活动状态，则启动 CPU 配置文件会同步扫描 V8 的堆以构建代码映射。在大型网关上，这可能会阻塞主事件循环数秒（在 3 GB 堆中观察到大约 3.5 秒）。 Bun 使用其检查分析器。保持检查器域启用或从工作人员发送请求并不能避免 V8 的主隔离扫描。 `startBlockedMs` 使用单调时钟测量同步启动调用，不包括承诺等待、设置、采样时间，并且 stop/cleanup. 在分析单个捕获时使用它来归因捕获引起的停顿；它不能从聚合事件循环最大值或百分位数中减去。测量报告成本；它不会阻止或中断本机停顿。

从源检查中，将本机自样本归因于最近的 JavaScript 父样本：

```bash
node scripts/diagnostic-cpu-native-parents.mts cpu-1.json cpu-2.json
```

该脚本接受保存的 RPC 结果或原始 V8 配置文件，并打印每次捕获的前 20 个父级。为所有父行添加 `--json`。百分比使用经过的配置文件时间，包括空闲和垃圾收集，而不是活动 CPU 时间。签名的样本增量保持不变。对于 RPC 结果，它在诊断分析器的检查器启动调用下单独报告第一个本机样本，并显示排除该样本及其持续时间的工作负载百分比。这可以防止大型分析器启动样本被误认为是稳定的应用程序工作；它不会删除实际的停顿或更改保存的配置文件。原始配置文件缺少 `startBlockedMs` 元数据，并保留工作负载百分比中的每个样本。

这RPC拒绝已知的活动检查器侦听器、分析标志、覆盖范围收集或任何活动Node追踪，包括非CPU类别。在请求配置文件之前停止跟踪，并且在捕获期间不要启用它：V8可以在此之前将原始配置文件块发送到现有的跟踪编写器RPC净化结果。在Bun这RPC也拒绝非空`BUN_INSPECT` or `BUN_INSPECT_CONNECT_TO`设置，可以激活调试而不会出现在`inspector.url()`。这RPC无法发现任意第三方进程内检查员会话；不要将其与其他调试器、分析器、跟踪器或覆盖范围所有者一起运行。不可用的响应会列出原因以及清理是否失败。如果清理工作仍不确定，则拒绝进一步捕获；这RPC永远不会自动重新启动网关。

## <a id="full-heap-snapshot"></a> 完整堆快照

使用 `operator.admin` 的操作员可以显式捕获网关的主 JavaScript 隔离，包括在请求之前分配的对象：

```bash
openclaw gateway call diagnostics.heapSnapshot --params '{"reason":"retention baseline"}' --timeout 180000 --json
```

RPC 支持 Node 和 OpenClaw 的 Bun 运行时，并写入 V8- 兼容快照 JSON。它仅接受可选的 `reason`（最多 256 个字符），记录在捕获前的警告中。不需要配置开关。它使用仅限所有者的文件权限写入 `<state>/diagnostics/heap-<timestamp>.heapsnapshot`，并返回 `path`、`sizeBytes`、`heapUsedBefore`、`heapUsedAfter`（字节）和 `elapsedMs`（本机捕获挂起时间）。快照内容绝不会通过 WebSocket 传输或进入诊断导出。工人隔离被排除在外。

**在安静的窗口中拍摄快照。** 3个GB堆快照可以阻塞主线程数十秒。 V8 在捕获时可能需要大约两倍的堆内存；足够的内存和磁盘空间仍然是操作员的责任。 RPC 拒绝超过 6 个 GiB 的堆、重叠的 CPU/heap 捕获以及本机尝试完成后 60 秒内的另一个快照。它还共享分析 RPC 对已知调试器、分析标志、覆盖范围和活动 Node 跟踪的拒绝。这些准入保护不会强加硬性持续时间、输出大小或内存限制：同步 `writeHeapSnapshot()` 一旦启动就不能因超时、断开连接或关闭而中断。客户端超时并不意味着捕获停止；重试之前检查主机目录。捕获后，诊断所有者禁用堆分析器并断开其检查器会话，释放运行时保留的快照元数据。在 Node 上，这还释放了 V8 的对象 ID 映射和对象移动跟踪，因此以后的垃圾收集不会继续支付快照跟踪成本。失败的捕获会尽可能删除部分文件； `cleanupFailed` 报告探查器清理或文件删除是否失败。

快照为 **unredacted**，可以包含凭据、提示和私人消息。将它们保留在主机上，单独检查任何传输，并在分析后手动删除它们。成功的快照将保留直至删除；没有自动快照收集或保留作业。

RPC 快照会在每次捕获后重置对象 ID。将独立 RPC 快照与独立对象 ID 空间进行比较：

```bash
node scripts/heap-snapshot-diff.mjs before.heapsnapshot after.heapsnapshot --independent-ids
```

此模式按 constructor/class 比较保留字节，并分别报告每个快照的最大保留对象及其路径。对象 ID 属于一个快照：相同的 ID 并不能证明对象在两次捕获之间仍然存在。对于 `--json`、`before` 和 `after` 各包含自己的 `dominators` 和 `retainers`； `classes` 包含跨快照总计。

对于在隔离分析过程中从同一连续连接的调试器进行的两次捕获，请省略 `--independent-ids`。这保留了对象 ID 匹配并报告各个支配者的更改。支配者是所有强根路径都经过的对象。此比较需要同一分离株的对象 ID 图在捕获之间保持活动状态。

该工具流输入并需要与对象图成比例的内存；在具有足够内存的分析主机上运行大型比较。弱边和快捷边被排除在外。类总计对同一类的嵌套实例进行一次计数；不同类别的总数可能会重叠。使用 Chrome DevTools 进行交互式保留路径和 V8- 特定的 weak/ephemeron 语义；该脚本是强边图摘要。将输出视为敏感：它包含未编辑的堆名称。

使用 `--top 40 --max-depth 60` 调整报告对象的数量和路径深度。 `--node <id>` 在任一模式下都会在后续快照中选择特定对象。最短的根路径表明可达性；单独的支配链标识该图中的独占保留。

从构建的源签出中，隔离的合成工作负载可以收集一对独立的 RPC 快照，而无需连接到现有网关：

```bash
node --import ./scripts/tsx.mjs scripts/gateway-heap-rig.mjs \
  --root ../heap-rig/baseline --minutes 180 --snapshot-minutes 60,180 \
  --rpc-interval-ms 440 --turn-interval-ms 5000
```

在具有足够内存用于快照的专用主机上运行此程序。它在环回端口 19548–19550 上启动 dist 网关和本地模拟模型服务器，在两个代理之间植入 2,000 个会话以及 32 个 KiB 历史记录，并驱动 10 个重新连接 Control UI WebSocket 客户端。工作负载轮询会话、历史记录、模型和 cron API，并发送模拟 `chat.send` 轮次以及 8 个 KiB 回复、代码模式调用、子代理、上传的工件预览和手动触发的 cron 作业。终端收据、持久回复、工件预览和 cron 历史记录必须与合成装置匹配。综合目录插件行使网关投影和出版物所有权；它不模拟本地提供者的缓存或远程节点传输。

八个文本会话保留对话历史记录。工具会话通过 32 个槽轮换，存档群组最多保留 64 个流失会话。生命周期突变使用观察到的会话 ID。证据记录了这些人口和轮次计数，因此可以将故意的历史增长与泄露的状态区分开来。快照等待承认的轮次和 RPC 来解决并保持相同的客户端连接以进行两次捕获。

根必须是新的。每个合成工作区都有自己的空 Git 存储库，使 Git 基线发现远离设备的实时 SQLite 文件。状态、日志、十秒样本、十分钟堆最小值和快照保留在根目录下。该设备记录成功的 RPC 计数，并在完成、中断或失败的工作负载检查时停止其子项。证据仍有待分析。

使用与另一个 Node 二进制文件相同的脚本和设置来进行运行时控制；为每次运行选择另一个根和三端口模块。原始样本包括分配流失；比较快照 `heapUsedAfter` 锚点的 GC 后的增长。分析装备的 RPC 快照对时使用 `--independent-ids`。

## <a id="sampling-heap-profile"></a> 采样堆概要文件

使用 `operator.admin` 的操作员可以对网关的主 JavaScript 隔离中的分配进行采样，而无需拍摄整个堆快照：

```bash
openclaw gateway call diagnostics.heapProfile --params '{}' --timeout 30000 --json
openclaw gateway call diagnostics.heapProfile --params '{"durationMs":10000,"samplingIntervalBytes":32768}' --timeout 45000 --json
openclaw gateway call diagnostics.heapProfile --params '{"includeCollected":true}' --timeout 30000 --json
```

RPC 支持 Node 和 OpenClaw 的 Bun 运行时。默认为 5 秒，平均采样间隔为 32 KiB。 `durationMs` 和 `samplingIntervalBytes` 必须是正整数。如果两个收集标志都为 false，则持续时间上限为 15 分钟（900,000 毫秒）。启用任一收集标志都会将持续时间上限保持在 30 秒；低于 4 KiB 的间隔被钳位到 4 KiB。较小的间隔会以更高的 CPU 和内存成本收集更多样本。选择比请求的捕获更长的 CLI 超时。关键内存警告指向此 RPC；压力永远不会自动开始捕获。

`includeCollected: true` 启用两个收集对象标志。显式的 per-GC 标志会覆盖简写。可选布尔值 `includeObjectsCollectedByMajorGC` 和 `includeObjectsCollectedByMinorGC` 均默认为 `false`。使两者都能够保留在窗口期间收集的对象样本和属性瞬态分配搅动。保留收集的样本可能会增加探查器内存使用量。

对于保留归因，请将两个收集标志保留为 false（默认值）并使用较长的窗口和较粗的采样间隔：

```bash
openclaw gateway call diagnostics.heapProfile --json --timeout 930000 --params '{"durationMs":900000,"samplingIntervalBytes":262144}'
```

读取 `profile.head` 中每个节点的 `selfSize` 作为在窗口期间分配的估计字节 **，并且在 stop** 时仍然活动。这些是分配站点，不保留捕获之前分配的路径或对象。 930,000 ms CLI 超时允许超出请求的窗口 30 秒进行设置和清理；事件循环停顿可能需要更多时间。断开连接、权限撤销或网关关闭会取消采样并在清理后丢弃部分配置文件。

结果包括实际消耗的 `durationMs`、`samplingIntervalBytes`、`includeObjectsCollectedByMajorGC`、`includeObjectsCollectedByMinorGC`、`heapUsedBefore`、`heapUsedAfter`、`rssBefore`、`rssAfter`（所有内存值以字节为单位）， `redactedNodeCount`、`unattributedSampleCount`、`unattributedSampleBytes` 和 `truncated`。如果存在，`profile` 包含已清理的 V8- 格式采样树和样本。每个节点的 `selfSize` 是该调用站点的估计分配字节；将其后代求和以获得包含字节。示例通过 `nodeId` 链接到节点。

`heapSpacesBefore` 和 `heapSpacesAfter` 包含主隔离区的 `node:v8` 堆空间统计信息，其边界与内存读取相同：`space_name`、`space_used_size`、`space_size`、`space_available_size` 和 `physical_space_size` （大小以字节为单位）。按名称比较条目以查找 Node 上旧的、大型对象、代码或其他空间中的增长。 Bun 在 `old_space` 中报告其 JavaScriptCore 堆；其他 V8- 命名空间为零，而不是单独的 JavaScriptCore 区域。在 Node 上，[Prometheus 导出器 ](/gateway/prometheus) 还从现有的 30 秒诊断内存心跳中暴露 `openclaw_heap_space_bytes{space="<space_name>",stat="used|size|available|physical"}`，具有相同的空闲样本抑制，从不每次抓取。名称来自V8的有限空间集，包括未来V8版本添加的空格；在出口商现有的系列上限下，每个空间贡献四个仪表。

堆和 CPU 配置文件将依赖框架标记为 `[dep:<pkg>]` 和 URL `node_modules/<pkg>`，包括作用域包和 pnpm 布局；符号、版本、文件名和绝对路径保持隐藏。带有查询或片段标记的 URL 仍然经过编辑。具有脚本 ID `0`、空 URL 和负行号的帧使用 `[native]`，已知的 V8 引擎标签（例如 `(root)`）除外。此存储桶标识丢失的 JavaScript 源属性，而不是特定的本机分配器或外部缓冲区字节。其他无法识别的帧仍然是`[redacted]`； `redactedNodeCount` 排除依赖项和本机标签（具有隐藏的去优化原因的 CPU 节点仍然计数）。

在调用站点已转换为返回的树之后，V8 可以对构建其自己的配置文件时进行的分配进行采样。没有匹配树节点的样本被省略并报告在 `unattributedSampleCount` 和 `unattributedSampleBytes` 中；原生树的大小保持不变。当省略此类引用或用大小限制的摘要替换树时，`truncated` 为真。

完整结果的上限为 1 MiB。当树和样本超过该上限时，`truncated` 为真，并且 `summary` 替换 `profile`。摘要条目组合了相同的调用堆栈，以叶优先顺序保留最多八个帧，并包含 `selfBytes`，包括 `totalBytes` 和 `count`（这些站点上的采样分配数量，而不是确切的对象计数）。参赛作品按 `totalBytes` 排序，然后是 `selfBytes`；排名较低的条目将被忽略以适应上限。包含的总数在调用者之间重叠，因此不要将它们加在一起。从大的 `selfBytes` 开始并检查堆栈以识别分配代码。

采样比全堆快照便宜，但仍然是近似值。默认采样模式不包括捕获结束前收集的对象；启用两个收集标志以包含这些样本。这两种模式都不是每次分配的精确清单，也不包括捕获之前分配的对象。本机分配、外部缓冲区、其他隔离和其他进程线程没有属性，因此采样字节不需要解释完整的 RSS 更改。

堆和 CPU 捕获共享一个检查器所有者：重叠调用失败而不是排队。两者都使用上述相同的编辑、运行时冲突检查、取消和清理规则。没有打开侦听器，也没有写入文件。事件循环停顿可以延长捕获持续时间，并且响应上限不会限制运行时的内部采样内存。在共享之前查看保留的代码符号名称。

## <a id="useful-options"></a> 有用的选项

```bash
openclaw gateway diagnostics export \
  --output openclaw-diagnostics.zip \
  --log-lines 5000 \
  --log-bytes 1000000
```

| 标志                    | 默认值                                                                       | 描述                                        |
| ----------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------- |
| `--output <path>`       | `$OPENCLAW_STATE_DIR/logs/support/openclaw-diagnostics-<timestamp>-<pid>.zip` | 写入到指定的 zip 路径（或目录）。       |
| `--log-lines <count>`   | `5000`                                                                        | 要包含的最大清理日志行数。            |
| `--log-bytes <bytes>`   | `1000000`                                                                     | 要检查的最大日志字节数。                      |
| `--url <url>`           | -                                                                             | 用于 status/health 快照的网关 WebSocket URL。 |
| `--token <token>`       | -                                                                             | status/health 快照的网关令牌。         |
| `--password <password>` | -                                                                             | status/health 快照的网关密码。      |
| `--timeout <ms>`        | `3000`                                                                        | Status/health 快照超时。                    |
| `--no-stability-bundle` | 关闭                                                                           | 跳过持久稳定性包查找。            |
| `--json`                | 关闭                                                                           | 输出可供机器读取的导出元数据。            |

## <a id="disable-diagnostics"></a> 禁用诊断

诊断默认启用。要禁用稳定性记录器和诊断事件收集：

```json5
{
  diagnostics: {
    enabled: false,
  },
}
```

禁用诊断会减少 bug 报告的详细程度；它不会影响正常的 Gateway 日志记录。

内存压力警告从测量限制的 80% 开始；临界压力从 90% 开始。主线程的V8 `heap_size_limit`是主信号（`heap_threshold`）。每个新的工作人员样本都会与该工作人员自己的 V8 限制 （`worker_heap_threshold`） 进行比较，包括进程范围的堆标志覆盖。 RSS 包括每个工作进程和本机分配，因此 `rss_threshold` 使用物理 RAM 和 process/cgroup 内存约束中较小的一个，与 V8 堆限制无关。未知的限制被省略； Bun 的兼容性堆元数据不被视为 V8 限制。 RSS 的增长本身并不表明压力。

警告和严重日志行以及诊断事件保留测量的 `usedBytes`、`limitBytes` 和 `thresholdBytes`；工人压力也标识为`workerThreadId`。检测器不执行文件系统扫描、强制主线程 GC 或 OOM 之前的快照。 `openclaw_memory_bytes` 保持不变。

当持久数据库工作线程自上次空闲收集以来使用的堆已增长 32 MiB 时，会在完成操作后收集垃圾。这使用了运行时的本地检查器集合支持；将方法报告为不可用的运行时会跳过空闲收集。在Node、SQLite上，历史记录、成绩单和回收工人请求512个MiB V8老年代限制；显式进程范围的 `--max-old-space-size` 会覆盖 Node 的工作线程资源限制。这些限制不包括本机分配或传输的缓冲区。内存诊断通过脚本和线程 ID 报告每个采样的直接工作线程，包括其堆、测量的堆限制和外部内存。任务工作人员还从其隔离内部发布 ArrayBuffer 字节； ArrayBuffers 已包含在外部存储器中，因此请勿将这些值相加。其他直接工作人员使用本机堆统计信息并使 ArrayBuffer 字节不可用。嵌套工人不在父注册表的覆盖范围内。

`workerHeapSampledCount` 和 `workerArrayBuffersSampledCount` 显示针对 `workerCount` 的覆盖范围。对于直接工人，`workerMemoryCoverage` 是 `complete`、`partial` 或 `unavailable`。在第一个样本之前或样本过期之后，丢失的字节将被忽略，而不是报告为零； `workerMemoryMissing` 识别待处理、过时或不可用的工作线程。样品在 60 秒后过期。采样永远不会等待忙碌的工作人员，并且每次传输最多保留一个未完成的请求。如果工作线程无法处理端口消息，本机 V8 中断仍会刷新其堆和外部计数器；在工作人员做出响应之前，ArrayBuffer 覆盖范围将保持不可用。内存压力警告包括这些计数器和外部内存限制警告； Node 不为 external/native 分配提供工作人员限制。

严重的内存压力会通过现有的清理所有者淘汰闲置的工作人员，包括在禁用诊断事件收集时。警告并不会让工人退休。退休请求是异步的，跳过活动工作，并使本机 close/checkpoint 操作远离主线程。活动操作保留其保管权，并且通常的 30 分钟数据库保留窗口在使用后恢复。存储的数据、数据库架构或更新过程没有更改。

当任务池在五分钟内重新创建一个闲置的退休工作人员时，它会在五分钟的不活动状态下让一个替代工作人员保持热状态。其他插槽保留其正常的空闲超时。 Git 元数据读取器使用两分钟的空闲超时，因此一分钟的 PR 轮询和存储库发现刷新可以重用两个读取器。 Node 代码模式同样最多保留一个已完成的 Worker 五分钟，仅当其运行时条目和堆限制匹配时才重用它。代码模式依赖于 V8 的正常垃圾收集，而不是空闲任务边界的检查器收集。其他热任务工作人员仍在原地收集释放的有效负载；临界压力、取消、旋转和关闭保留其现有的清理路径。无需配置设置。

## <a id="garbage-collection-metrics"></a> 垃圾收集指标

[GC 直方图](/gateway/prometheus#garbage-collection-duration) 将次要清除、主要 mark/sweep/compact 集合、增量工作和弱引用处理分开。计数和经过的持续时间按主线程或有界工作脚本类型分组，没有每个 GC 日志行。仅当出口商感兴趣时，仪表工作人员才使用现有的内存遥测端口并观察 GC。每个隔离物一个本机 `GCProfiler` 在一秒计时器上提供批次，与代码模式鞭打防护共享。它不会在每个 GC 之后安排 JavaScript：每次收集 `PerformanceObserver` 交付可以让空闲的工作人员继续收集。本地计数和持续时间保持准确；回调标志不可用，因此 `reason` 标签为 `other`。工作线程 GC 批次运行下一个堆样本（通常每 30 秒），在 256 个待处理样本后或在有序工作线程关闭时进行刷新。保留个人收集计数和持续时间；工作器直方图更新可能会滞后一个采样间隔。没有该端口的工人不受保护；缺失系列并不意味着零 GC。

Node 代码模式还会在至少 10 秒的观察窗口内每分钟超过 600 个主要收集时发出警告，每个工作人员每分钟最多一次。 `Code Mode worker GC storm` 记录可重用指标 `workerSlot`、本机 `workerThreadId`、池 `workerId`、当前代码模式 `runId`、16 个字符 SHA-256 `sessionKeyHash`、生命周期 `cellCount`、 `activeCellCount`，以及不同的待决 `bridgeMethods`。停放的单元格保留归属；完成的细胞将其清除。空闲警告没有当前运行。超过 64 个工作线程指标界限的槽位将被忽略。该记录包括窗口计数和持续时间以及隔离本地 `heapUsed`、`heapTotal`、`external`、`arrayBuffers` 和 `heapSizeLimitBytes`。 ArrayBuffers 包含在外部存储器中。这些警告使用现有的内存端口，不需要导出器；它们不包含来宾来源、参数或结果。归因描述了采样器交付批次时处于活动状态的单元格，而不是证明该单元格导致了窗口中的每次收集。当同步来宾执行阻止其事件循环时，采样器无法报告。

第一个风暴在受影响的工作线程中启动五秒分配和 CPU 捕获，每个工作线程每小时最多一次（失败的尝试也会消耗一小时）。堆采样使用 256 KiB 间隔，并包括主要和次要 GC 收集的对象，因此短期分配流失仍然可见。 CPU 采样在同一窗口内使用 10 ms 间隔。 CPU 和分配分析仅在风暴之后启动；定期 GC 采样保持活动状态。主动跟踪、调试或分析可能会导致捕获不可用。

网关将清理后的结果写入 `<state>/diagnostics/code-mode-gc-*`，如 `.heapprofile.json` 和 `.cpuprofile.json`。完成警告列出`profileFiles`；故障报告 `captureStatus: "unavailable"` 和已修复的 `captureReason`。文件包含采样的堆栈、计数器和计时，而不是来宾源、参数、结果或堆对象。 Unknown/guest 框架名称和 URL 使用分析 RPC 策略进行编辑。每个结果限制为 1 MiB；网关在全球范围内最多保留 20 个风暴剖面文件，仅具有所有者权限。其他诊断工件未受影响。这些文件不会自动包含在支持导出中。现有的分析 RPC 仍然以主要隔离为目标。如果同步来宾工作阻塞了工作线程的事件循环，捕获持续时间可能会超过五秒；退休工人可以中断捕获。

## <a id="rpc-response-size-and-heap-changes"></a> RPC 响应大小和堆更改

[Prometheus 导出器](/gateway/prometheus) 记录 WebSocket 发送方接受的每个编码的 JSON 响应帧的 `openclaw_gateway_rpc_response_bytes`（UTF-8 字节，不包括传输 framing/compression），具有从 1 开始的 2 次方存储桶KiB 至 64 MiB。慢响应日志行包括同一帧的`bytes=`；它始终意味着编码的响应字节，而不是堆分配或独占窗口样本。

对于 `sessions.list`，响应日志行和 `slow session list` 记录还包括 `source`、`rowMode`（`compact` 或 `full`）、`limit`、`offset` 和 `filterKind`。调用者源是有界的Control UI标签或`unspecified`；过滤器类型包含参数名称，从不搜索文本、身份或路径。优化的 WebSocket 日志还记录至少 200 个 KiB 的快速 `sessions.list` 响应。指标标签保持不变。

`openclaw_gateway_rpc_handler_heap_delta_bytes` 在处理程序执行前后立即对主线程 `process.memoryUsage().heapUsed` 进行采样。仅当该处理程序是其整个生命周期（包括等待）中唯一活动的 RPC 处理程序时，才会发出样本。即使其他处理程序先完成，任何重叠都会丢弃整个样本。普通、专用工作连接和进程内 RPC 处理程序共享此边界。准入、排队、拒绝的请求和工作线程堆被排除在外。

`openclaw_gateway_rpc_handler_heap_delta_exclusive_total{method}` 对采样的处理程序进行计数。用同样的方法将其增加量与`openclaw_gateway_rpc_handler_seconds_count`进行比较，看看覆盖率。重叠处理程序不提供堆样本，而不是零；持续并发可能会导致方法没有样本。采样的子集有利于短处理程序和安静期。

这些是经过签名的堆更改，而不是每个处理程序的分配总数。后台工作、响应编码和 GC 仍然影响独占窗口。 GC 通知是异步的，因此样本未经过 GC- 过滤并且可能为负数。使用桶计数或分位数；签名的 `_sum` 可以减少，因此该总和上的 `rate()` 无效。不要通过各种方法求和来估计分配吞吐量。两个直方图都使用注册的方法标签和现有的导出器上限，无需新配置；禁用或不感兴趣的诊断会跳过堆采样。

## <a id="related"></a> 相关内容

- [健康检查](/gateway/health)
- [网关 CLI](/cli/gateway#gateway-diagnostics-export)
- [网关协议](/gateway/protocol/rpc-methods#rpc-method-families)
- [日志](/logging)
- [OpenTelemetry 导出](/gateway/opentelemetry) - 用于将诊断流式传输到收集器的独立流程
- [Codex harness运行时](/plugins/codex-harness-runtime) - Codex harness的运行时边界、权限和诊断
- [Diagnostics flags](/diagnostics/flags) - 为一个子系统打开额外日志记录而无需全局提升 `logging.level` 的命名标志
