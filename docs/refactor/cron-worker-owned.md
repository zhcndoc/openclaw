---
summary: "建议由工作人员拥有的 cron 调度，其中包含已提交的运行请求和一个小型启动器"
read_when:
  - "简化 cron 调度和更新可靠性"
title: "工人拥有的 cron"
---

# <a id="worker-owned-cron"></a> 工人拥有的cron

**分阶段重新设计。** 将调度和保留决策放在一个 cron 工作线程中。提交运行请求，释放编写器，然后启动任务。目标约为 **26,000 条生产线**，低于 **43,960**：约 **18,000 条生产线 （41%） 被移除**，而不将相同的机器移至其他地方。保持平常的可靠性；接受在狭窄的崩溃窗口中错过的事件以及偶尔的发射赛车禁用。不要构建分布式调度。

## <a id="current-design-and-contract"></a> 当前设计和合同

源基线：`7517981b5e670b88ebf61b4d1be18a194a46a043`。物理 TypeScript 线，包括 comments/blanks，但不包括测试、模拟、夹具、harness和套件助手：`src/cron` 具有 **262 生产文件/43,960 线** 和 **275 test/support 文件/79,391 行**。其生产目录为顶级**10,485**，`isolated-agent/` **9,196**，`service/` **16,272**，和`store/` **8,007** 线。在职责共享文件的情况下，计数低于重叠；它们是所有权地图，而不是附加删除记录。引文使用此基线；除非另有标记，所有缩短的源路径均以 `src/cron/` 开头。

写入器停顿是结构性的：`store/run-admission.worker.ts:68` 在第 76 行调用主机准备之前打开事务。工作者将消息发布到主机并在 `Atomics.wait` （`src/infra/sqlite-worker-operation-admission.ts:670`） 中进行阻止。主机准备和第二次提交检查在 `service/runtime-mutation.ts:130` 中运行。 #168291 修复为每次交易所设置一秒的截止日期（`store/runtime-mutation.worker.ts:15`、`:38`、`:72`）；它限制了依赖关系而不是删除它。调度本身没有固有的主线程需求：网关依赖项作为 `src/gateway/server-cron.ts:502` 处的回调输入。

| 责任                                         | 当前所有者、证据和实物 LOC                                                                                                                                                                                                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 安排数学、身份、应有的决定、pacing/backoff | `schedule.ts:26` (350), `schedule-identity.ts:1` (137), `service/jobs-scheduling.ts:339` (746), `service/timer-runnable.ts:65` (204).                                                                                                                                           |
| 计时器、容量、预订、追赶                | `service/timer-scheduler.ts:119` （629）、`service/timer-catchup.ts:177` （385）、`service/scheduler-mutations.ts:156` （220）、`store/startup-plan.worker.ts:29` （133）； admission/reservation 模块如下。                                                                         |
| 定义，CRUD、config/state 读取                  | `normalize.ts:1` (518), `service/ops-mutations.ts:1` (652), `service/ops-read.ts:1` (333), `service/jobs.ts:1` (722), `service/store.ts:1` (534), `store/row-codec.ts:1` (767).                                                                                                 |
| 运行admission/capacity并激活                  | `service/run-admission.ts:1` (664), `service/run-admission-mutation.ts:1` (434), `service/run-admission-capacity.ts:1` (121), `store/run-admission.worker.ts:62` (466), `store/scheduler-reservation.worker.ts:93` (200).                                                       |
| 收据、授权、结算                        | `store/receipt-authority-owner.ts:101` 和五个兄弟模块 （838）； `store/run-receipt-store.ts:51` （586）、`store/run-receipt-settlement.ts:36` （225）、`service/run-receipts.ts:1` （307）； host/worker 突变方案 （489）。                                               |
| 结果、跳过的尝试、重新启动恢复            | `service/timer-outcomes.ts:215` （745）、`service/run-owner.ts:99` （119）、`service/run-history.ts:1` （205）；恢复系列包括 `service/startup-run-repair.ts:57` 和 `store/run-recovery.kernel.ts:111` （1,050）。                                                          |
| 手册 run/abandon 和生命周期                       | `service/ops-run.ts:243` （453）、`service/ops-run-preparation.ts:239` （631）、`service/ops-lifecycle.ts:268` （393）；放弃是 `store/scheduler-reservation.worker.ts:167` 处的保留清理，而不是公共 cron 操作。                                               |
| 任务执行和session/model设置                 | `isolated-agent/run.ts:78` 及其目录（53 个文件/9,196）； command/script/trigger/heartbeat 适配器，包括 `command-runner.ts:1`、`trigger-script.ts:1`、`heartbeat-monitor.ts:72`（8 个文件/1,526）。                                                                 |
| 心跳、看门狗、timeout/cleanup                   | `service/timer-execution.ts:157`、`service/timer-job-runner.ts:327`、`service/agent-watchdog.ts:51`、timeout/interruption 帮助程序（7 个文件/1,648）。                                                                                                                            |
| 通知、路由、交付                       | 顶级交付助手和失败文本（10 个文件/1,176）、`service/failure-alerts.ts:184` 和通知系列（5 个文件/904）；实际交付在`isolated-agent/delivery-dispatch.ts:189`，计入上面的isolated-agent。                                         |
| 权限、暂存、保留                        | `scheduled-tool-policy.ts:1` (258), `store/runtime-authority-store.ts:57` (264); `scratch-store.ts:1` (161), `scratch-write.kernel.ts:1` (165); `session-reaper.ts:1` (273), `session-registry-maintenance.ts:1` (186).                                                         |
| Gateway/config 重新加载和事件源                | 外部 cron：`src/gateway/server-cron*.ts`（9 个文件/2,636），在 `src/gateway/server-reload-hot.ts:343` 处重建配置； exit/stream观察者家族（8个文件/2,418），包括`src/gateway/cron-exit-watchers.ts:80`、`src/gateway/cron-stream-watchers.ts:50`。       |
| RPC、CLI、工具                                        | 外部 cron：`src/gateway/server-methods/cron*.ts`（14 个文件/3,039；`src/gateway/server-methods/cron.ts:212` 处的操作）； `src/cli/cron-cli.ts` 和目录 （15 / 3,036）； `src/agents/tools/cron-tool*.ts`（9 / 2,723；`src/agents/tools/cron-tool.ts:362` 处的操作）。 |

### <a id="preserve-observable-behavior"></a> 保留可观察的行为

这些是现有测试锚点的验收标准，而不是保留每个测试的私有模拟或回调的要求。

| 契约                                                                                                                                                                                                                                                    | 当前的实现和固定它的测试                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 每项工作赶上一次逾期发生的事件，最早的事件在前； agent/heartbeat 工作默认五立即、五秒溢出惊人、两分钟启动延迟。在重新启动时保留 deferred/paced 的最后期限，并避免出现预编辑失误。 | `service/timer-catchup.ts:210`, `service/timer-execution-timeout.ts:36`, `service/timer-runnable.ts:90`; `service.startup-overflow-clobber.test.ts:110`, `service.restart-catchup-pacing.test.ts:168`, `:237`.                                                                                                                 |
| 正常运行时不会出现同一事件重复执行； timezone/DST、最小重发间隔和配置的 retry/backoff 仍然有效。今天，它使用 markers/receipts，而不是确定性插槽 ID。                                           | `service/timer-runnable.ts:77`、`:131`、`store/run-receipt-store.ts:332`； `cron-state-contracts.e2e.test.ts:205`、`schedule.test.ts:306`、`service/timer.regression.test.ts:159`、`:197`。重试期限源自 `service/timer-outcomes.ts:317`、`:394` 的完成。                                                   |
| 实际 rejected/ownerless/queued-but-not-launched 尝试记录跳过加上原因；一份失败的工作不会妨碍兄弟姐妹。不要制造安静触发评估或每个错过的滴答声的历史记录。                                               | `service/run-owner.ts:99`、`service/ops-run.ts:309`； `service/run-admission.ownerless.test.ts:107`、`:153`。 `skipMissedJobs` 仅推进重复性计划和日志（`store/startup-plan.worker.ts:109`；`service.startup-overflow-clobber.test.ts:56`）； `fire:false` 很安静 （`service/timer-trigger.ts:54`）。            |
| 交付模式、recipient/thread 路由、suppression/unknown 结果、故障 threshold/cooldown、跳过的警报和所有者对话修复仍然存在。一次性删除取决于整个运行的成功完成，包括交付。                 | `delivery-plan.ts:40`、`service/failure-alerts.ts:184`、`:374`、`service/timer-outcomes.ts:233`； `cron-delivery-outcomes.e2e.test.ts:213`、`:411`、`:536`、`:750`；外部 cron：`src/gateway/server.cron.test.ts:1145`。                                                                                                       |
| 保持超时 defaults/overrides、中止和有界清理、设置停止检测以及执行预算之外的容量等待。心跳安静hours/coalescing/busy规则和实际结果保留在心跳所有者手中。                      | `service/timeout-policy.ts:10`, `service/agent-watchdog.ts:86`, `service/timer-job-runner.ts:327`; `service/timer.timeout-watchdog.test.ts:288`, `:333`, `service/command-timeout.test.ts:95`, `service.heartbeat-payload.test.ts:107`, `:179`.                                                                                |
| 手动强制可以运行禁用的作业并保留其 natural/paced 插槽；到期模式尊重资格。公认的运行具有持久的会计。删除请求取消并可以报告清理待处理。                                              | `service/ops-run-preparation.ts:239`、`service/ops-run.ts:113`、`:243`； `service/ops.regression.test.ts:329`、`:422`、`service/manual-ack-durability.test.ts:28`；外部 cron：`src/agents/tools/cron-tool.output-contract.test.ts:91`。                                                                                       |
| 坚持jobs/history，恢复已完成的结果，不再执行，记录中断，恢复以后的调度；保留公共 RPC 信封、精确运行查找、CLI 退出状态、过滤器和工具默认值。                                        | `service/startup-run-repair.ts:121`、`service/ops-lifecycle.ts:268`； `service.restart-catchup.test.ts:168`、`:202`；外部 cron：`src/gateway/server.cron.test.ts:781`、`:823`、`src/cli/cron-cli.test.ts:267`、`src/agents/tools/cron-tool.output-contract.test.ts:161`、`src/gateway/server-methods/cron.runs.test.ts:574`。 |

收据托管、撤销生成、随机数结算和同步 prepare/commit 回调是机械，而不是产品合约。一种有意的恢复放松需要是可见的：今天，当已知交付尚未开始时，可​​以重放中断的一次性（`store/run-recovery.kernel.ts:152`）。这并不能证明执行从未开始。新设计将不确定的活动运行记录为中断，而不是重放其有效负载。这是公认的崩溃损失权衡，而不是声称崩溃语义不变。

## <a id="proposed-ownership-and-flow"></a> 建议所有权和流量

**Cron 工作者：** 一位长期参与者拥有 job/runtime 状态、调度计算、计时器、队列、并发限制和终端记帐。使用现有的网关 SQLite 编写器基础设施来实现连接所有权、FIFO、初始完整性准入和缓存失效； cron 域决策和同步事务在工作端运行。没有第二个数据库所有者。现有的事务助手本身是同步的（`src/state/openclaw-state-db.ts:485`）。

**Host：** 验证 RPC/tool 请求，在 startup/change 上发布标准化配置快照 `{version, config}`，并公开提交的 job/status 视图。版本仅订购快照；它不是撤销一代。作业 CRUD 和声明性协调通过 cron 工作线程。工作人员在命令之间安装快照，从不在事务期间提取主机策略。

**Launcher/run 执行：** 消耗已提交的请求，执行一项廉价的最终实时 Gateway/launch-eligibility 检查，然后分派到现有的 task/session 执行程序或运行工作程序。现有的任务、工具许可、心跳和传输所有者仍然执行自己的合同。他们没有获得 cron 接收权限。启动器处理效果；它永远不会决定时间表。

```mermaid
sequenceDiagram
    participant H as Host
    participant C as Cron worker
    participant L as Launcher
    participant R as Run executor
    H->>C: Config snapshot or job command
    C->>C: Due decision + request insert + next deadline; commit
    C->>C: Capacity available: queued to active; commit
    C->>L: Launch committed run ID and payload
    L->>L: Live Gateway and eligible job?
    L->>R: Start task
    R->>R: Execute and finish primary delivery
    R-->>C: Progress and combined terminal outcome
    C->>C: Record outcome + history + next deadline; commit
    C-->>H: Status and post-run notifications
```

没有事务等待主机回复、任务、通知、模块导入或网络调用。容量等待使行排队并且写入器空闲。工作人员按 due/arrival 顺序选择请求，并具有稳定的作业顺序平局。

### <a id="rows-and-idempotency"></a> 行和幂等性

**无架构更改；没有请求 DDL。** 重用 `cron_jobs` 进行定义和 `state_json`；重用 `cron_run_receipts` 作为运行请求分类帐。现有主键为 `receipt_id`，每个 store/job 有一张有效收据（`src/state/openclaw-state-schema.sql:1426`、`:1453`、`:1475`）。保留 `task_runs` 历史记录 （`store/run-history.kernel.ts:58`）、`cron_job_scratch`、权限来源及其保留。

“请求”是指现有收据 `status='running'` 加上 `queuedAtMs`； “有效”是指 `runningAtMs` 和 `runningReceiptId`。两者均已存在（`store/run-admission.worker.ts:145`、`:203`）；请勿添加 `queued` SQL 状态。保留 decoding/diagnostics 所需的收据元数据，而不是作为权限令牌。

对于新计划的工作，运行 ID 是 `[storeKey, jobId, scheduledSlotMs]` 的带标记、防碰撞编码，使用持久的截止期限，而不是启动器唤醒的时间。 cron 可以解码这个定时键来重启；公众和历史读者认为 ID 是不透明的。插入它并在一笔交易中推进时间表；已请求重复密钥。 Backoff有意创造一个新的未来deadline/key；仅延迟现有请求会保留其 ID。手动力使用独特的请求ID并保留自然槽。流批次和退出事件通过同一队列使用不同的事件 ID。它们的瞬态 payload/force 上下文与启动请求保持一致；在崩溃中丢失它意味着记录跳过，而不是从当前配置重建事件。如今，这些详细信息是操作输入，而不是收据列 （`store/runtime-worker.types.ts:139`）。一旦该行成为终端，运行 ID 就会忽略重复的终端消息。

保留有界收据历史记录：目前，每个作业保留 64 个终端收据（`store/run-receipt-store.ts:79`、`:246`）。幂等性还取决于单调消耗预定的截止日期，而不是永远保留每个历史 ID。

### <a id="common-failures%2C-cheaply-handled"></a><a id="common-failures-cheaply-handled"></a> 常见故障，廉价处理

| 情况                                   | 建议的行为                                                                                                                                                                                                                                                                                                |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 请求提交后、分派前崩溃 | 使用可恢复密钥恢复定时排队请求；跳过暂时上下文丢失的请求。在发出启动之前提交排队至活动状态；永远不会自动重新发送活动请求。该提交和实际启动之间的崩溃可能会错过一次发生。                                         |
| 崩溃 during/after 执行                | 恢复已记录的终端任务结果；否则记录中断并继续将来的调度。不要重放不确定的有效负载或交付。尽最大努力记录结果；失败的通知无法撤消已提交的运行。                                                              |
| 陈旧的网关                               | 启动器在调度之前立即检查现有的实时网关所有者；如果退休的话，有理由跳过。关闭会停止新的调度并加入拥有的工作。没有新的围栏、租约或同级进程仲裁。                                                                                               |
| Disable/remove/edit                         | 工作人员取消 disable/remove 上排队的请求或安排替换，并记录原因。有效负载编辑在出队时使用当前定义。活动任务保留其启动快照；完成记录其结果，同时保留任何较新的 schedule/enablement 编辑。接受一次发射比赛并禁用。 |
| 手动强制或消耗退出事件         | 将现有的例外保留为“启用”：显式强制可以运行禁用的作业；接受的 `on-exit` 有效负载在手表自动禁用 （`store/run-admission.worker.ts:134`） 后仍然有效。操作员禁用仍然会取消排队的工作。没有新用户选项。                                                    |
| 飞行途中配置更改                    | 在命令之间安装最新推送的快照。已经启动的任务保留其快照；稍后开始使用当前配置。删除旧的 cron-wide revoke/re-admit 循环。                                                                                                                                 |
| 时钟 jumps/sleep                           | 使用挂钟来确定到期时间和单调运行截止日期。在向前跳跃时，每个工作应用一次有界追赶；在向后跳跃时，保留持续的下一个截止日期而不是倒带它。保持有界定时器重新检查和重发保护，无需时钟修复协议。                             |

运行执行器拥有其 AbortController、setup/execution 截止日期和有界清理。 Progress/heartbeat/result 消息异步到达；他们从不扩展数据库事务。保留现有的心跳唤醒适配器并从执行时间中排除通道等待。主机停顿可能会延迟调度或通知，但不能让 cron 事务在该主机上等待。主要交付保留在运行执行器的现有适配器中；其结果是一次性删除之前完成的一部分。运行后通知保留其 route/threshold 行为并异步报告，无需提交防护。不需要新的待交付状态机。

## <a id="delete-and-consolidate"></a> 删除并合并

删除 `store/receipt-authority-*` （838 LOC）、host/worker 运行时突变握手和准备类型 （489） 以及 #168291 中的 cron 截止日期选择加入。将 admission/reservation 编排 （1,885）、收据 settlement/binding/观察管道 （717）、收据持久性助手 （933） 和恢复编排 （1,050） 替换为上面的队列和短工作人员本地转换。这些不重叠的组总共**5,912条当前线**；有用的存储和结果恢复得以保留，而不是这些层。

还将主机 timer/catch-up/manual-finalization 编排折叠到该工作线程中，并删除 `store/dispatch.worker.ts:140`、`:175`、`:231`、`:244`、`store/save.worker.ts:26` 和 `store/load.worker.ts:20` 中的 cron 直接握手。仅删除 `runtime-mutation.worker.ts` 会在其他地方留下相同的依赖关系。一起删除过时的注册、私有类型、模拟和协议测试；保留新主人的行为证据。不要删除其他子系统使用的通用SQLite准入机制。

大小预算：将 `service/` + `store/` 从 **24,279** 减少到大约 **6,300** 行，包括替换 worker/launcher 代码。保留其他 **19,681** cron 行将目标置于 **26,000** 附近。这是重新设计预算，而不是经过验证的补丁大小。 Payload/delivery 广度是该估计的最大风险；不要通过将 cron 协调移至网关文件来隐藏增长。

**保留权限来源：** `store/runtime-authority-store.ts:57`和`:97`维护预定工具权限和恢复，与收据托管不同。保留该所有者和 `cron_job_runtime_authorities` （`src/state/openclaw-state-schema.sql:1490`）。不建议重新设计权限或删除表。

<a id="existing-data-and-three-landable-prs"></a>

## <a id="existing-data-and-staged-prs"></a> 现有数据和阶段性 PR

切勿重写现有收据 ID 或历史连接。使用一种规范的行编解码器；新的定时密钥标签只是一个编码鉴别器，而不是权威。没有可恢复定时密钥的排队行（包括旧的随机 ID）将被跳过，其标记会自动清除。保留 `request_run_id` 进行确认运行查找。当追赶找到当前调度时隙的终端收据时，通过重新计算请求事务中的下一个截止时间来消耗该时隙；记录的跳过保留在历史记录中。人力无法消耗未来的自然槽。首先恢复最终的历史记录，然后在接受新工作之前恢复 queued/active 行。无需 Doctor 格式迁移：Doctor 已将运行标记恢复留给调度程序启动 （`src/commands/doctor/cron/index.ts:52`）；其现有的遗留型移民仍然是唯一的正常化路径。使用匹配的二进制文件保留备份并测试回滚；没有运行时遗留解析器或新的 sidecar。

每个 PR 都切断其全部责任并删除其被取代的路径。每个都必须通过受影响的 owner/sibling 测试和 `check:changed`；更改了测试报告测试时间与 transform/setup 时间分开。列出的崩溃语义是有意接受的更改；上述所有其他可观察合约均保持绿色。

1. **从 cron 事务中删除主机等待。** 在写入之前推送 config/policy 输入；将需要当前行的决策移至现有的工作内核中。切断所有 cron prepare/commit 握手，包括 save/history/init 路径和截止日期选择。证明：worker提交后故意拖延host；不相关的状态编写器和更新切换仍必须完成。练习真正的突变入口点，而不是仅帮助程序的模拟；跟踪所有 cron 准入调用以证明事务中没有任何调用。
2. **删除收据托管，然后削减调度并一起启动。** 将此步骤拆分为两个有界 PR。 **2a** 删除了收据保管及其消费者，而主机仍然是唯一的调度程序。网关、任务、工具、权限和审批行所有者保留其现有检查；撤销可能会影响已检查的启动。收据存储、调度和结果恢复保持不变。 **2b** 启动工作参与者，停用主机 timers/reservations，使用幂等请求行，并使用 2a 中的免托管接口将 timer/manual/event 源连接到单个启动器。在队列边界拆分 **2b**：**2b-i** 为工作线程提供幂等接收请求、容量和激活，每个源都有一个主机启动器；主机仍然是 schedule/wake 制作人。 **2b-ii** 将计划计算、计时器、追赶和配置快照移动到长期工作线程中。每一步都会删除其取代的所有者。在 2b-i 中，排队标记保留自然截止日期，直到现有结果所有者提前。调度参与者通过现有的状态租约保留共享工作线程。它的定时器发送唤醒通知；有限承认的命令读取当前行并做出适当的决定，使写入器在唤醒之间保持可用。关闭会加入租约，而数据库停用会关闭相同的资源。 CRUD 准备和提交使用一个工作者突变实现； commit 将意图应用于当前行，保留干预的运行时更新。配置快照安装在命令之间。排队的收据会消耗资格，直到完成拥有重试、节奏和下一个自然截止日期。证明：重复槽、容量队列、disable/edit、手动强制、消耗退出事件、流批处理、追赶、重试和时钟跳跃流；在 request/active 边界崩溃并恢复复制的旧格式数据库。
3. **折叠 result/recovery 管道并完成删除。** 一个终端结果处理程序记录执行情况以及初次交付结果，更新 job/history，并发出运行后通知；退休随机数结算、国外收据监控和冗余生命周期包装器。证明：heartbeat/setup/execution 超时、清理、跳过历史、真实的 webhook/notification 结果和上面引用的 RPC/CLI/tool 合约；已发布更新程序×候选程序，具有隔离状态、重新启动和备份回滚。验证没有 cron commitGuard/revocation 路径保留，并分别报告净生产/测试 LOC。保留其他所有者的实时 effect/permission 支票。

设计通道证明仅是源头检查和文档验证。此通道中没有 production/test 更改、运行时实验、提交或 PR。
