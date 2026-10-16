---
summary: "健康检查命令与网关健康监控"
read_when:
  - "诊断通道连接或网关健康状态"
  - "了解健康检查 CLI 命令和选项"
title: "健康检查"
---

无需猜测即可验证网关和通道运行状况的简短指南。它涵盖 CLI 运行状况检查、HTTP 检查端点、专用 `health` 命令和正常运行时间监控。

## <a id="quick-checks"></a> 快速检查

- `openclaw status` - 本地摘要：网关 reachability/mode、更新提示、链接通道身份验证期限、会话 + 最近活动。
- `openclaw status --all` - 完整的本地诊断（只读、带颜色，可安全粘贴用于调试）。
- `openclaw status --deep` - 请求正在运行的网关进行实时检查（`health` 和 `probe:true`），包括每帐户通道检查（如果支持）。
- `openclaw status --usage` - 显示模型提供者 usage/quota 快照。
- `openclaw health` - 向正在运行的网关询问其运行状况快照（仅限 WS-；没有来自 CLI 的直接通道套接字）。
- `openclaw health --verbose`（别名 `--debug`） - 强制进行实时运行状况检查并打印网关连接详细信息。
- `openclaw health --json` - 输出机器可读的健康状态快照。
- 在任何频道中发送独立的 `/status` 聊天命令，即可获取状态回复，而无需调用代理。
- 日志：运行 `openclaw logs --follow`（或 `openclaw --profile <profile> logs --follow`），并筛选 `web-heartbeat`、`web-reconnect`、`web-auto-reply`、`web-inbound`。

对于 Discord 和其他聊天提供商，会话行不代表套接字的存活状态。 `openclaw sessions`、网关的 `sessions.list` 以及代理的 `sessions_list` 工具读取已存储的会话状态。提供商可能会重新连接，并在生成任何新的会话行之前显示频道状态正常。请使用上述频道状态和健康检查命令来检查实时连接情况。

每个代理的会话计数和最近的活动仅包括该代理的会话，即使代理共享 SQLite 会话存储也是如此。 Status 对每个实体商店进行一次汇总计数。顶级健康会话摘要代表默认代理，或者没有默认时第一个配置的代理；这不是舰队总数。正在运行的网关从其驻留会话行投影中提供干净的运行状况和状态会话摘要。存储水合和精确的脏行刷新保留现有的只读 SQLite 后备。这些摘要等待当前选择元数据。显示准备和后台模型目录发现可以独立继续，因此大型队列的目录预热不会保持会话计数和最近活动摘要打开。

## <a id="deep-diagnostics"></a> 深度诊断

当大型车队的模型准备超出启动预算时，`openclaw health --json` 会报告 `modelRuntime.degraded: true`。 `pendingAgents` 列出了仍在准备的智能体，`stage` 指出了当前的收购阶段。网关保持运行，完成的代理仍然可用。当所有运行时准备就绪时，后台准备会清除降级状态。

如果较新的模型运行时刷新替换了正在进行的准备，则启动将遵循已承认的替换进行准备和发布。取消已退役的收购并不会停止 Gateway；真正的更换故障仍然会传播。

转录投影修复在准备好产生工作人员支持的工作后运行。通过数据库检查推迟的代理在其会话、凭证和模型准备完成后即可使用；重建其成绩单预测并不影响特工的准入或其他特工的准备。关机仍会加入已接受的维修工作中，并且会记录维修失败，但不会撤销许可。

运行状况和状态收集将快速会话存储读取分组到较短的工作片中，从而避免繁忙的后台准备延迟每个单独的读取。慢速读取在让步给其他网关工作之前完成其事务。

- 磁盘上的凭据：`ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json`（mtime 应为最近时间）。
- 会话存储：`ls -l ~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`。`status` 会显示计数和最近的接收方。
- 重新链接流程：日志中出现状态代码 409-515 或 `loggedOut` 时 `openclaw channels logout && openclaw channels login --verbose`。配对后，QR 登录流程会自动重新启动一次，状态为 515。
- 默认情况下启用诊断（`diagnostics.enabled: false` 禁用它们）。内存事件记录 RSS/heap 字节数和 threshold/growth 压力。当进程正在运行但饱和时，活动警告会记录事件循环 delay/utilization、CPU- 核心比率和 active/waiting/queued 会话计数。超大有效负载事件记录 rejected/truncated/chunked 加上大小和限制，而不是消息文本、附件内容、Webhook 正文、原始 request/response 正文、令牌、cookie 或秘密值。
- 同一个心跳机制还会驱动有界稳定性记录器：`openclaw gateway stability`（或 `diagnostics.stability` Gateway RPC）。Gateway 致命退出、关闭超时以及重启启动失败会将最新快照持久化到 `~/.openclaw/logs/stability/`。使用 `openclaw gateway stability --bundle latest` 检查最新的捆绑包。
- 对于错误报告，请运行 `openclaw gateway diagnostics export` 并附加生成的 zip：Markdown 摘要、最新的稳定性捆绑包、清理的日志元数据、清理的网关 status/health 快照和配置形状。聊天文本、webhook 正文、工具输出、凭据、cookie、account/message 标识符和秘密值被省略或编辑。请参阅 [ 诊断 Export](/gateway/diagnostics)。

## <a id="health-monitor-config"></a> 健康监控配置

- `channels.<provider>.healthMonitor.enabled`：在保持全局监控启用的同时，禁用特定频道的健康监控重启。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多账户覆盖设置，其优先级高于频道级设置。
- 这些频道级覆盖设置目前适用于支持它们的频道：Discord、Google Chat、iMessage、IRC、Microsoft Teams、Signal、Slack、Telegram 和 WhatsApp。
- 崩溃的频道首先由其自身的自动重启退避机制恢复（日志中的 `auto-restart attempt N/10`）。在该重启阶梯以 `giving up after 10 restart attempts` 结束之前，健康监控不会介入；之后健康监控才会作为最后的重启负责方接管。

## <a id="inbound-ingress-health"></a> 入站接入健康状态

通道连接性和入站接纳属于相互独立的故障域。通道可以保持健康的传输连接——正常发送回复——同时其持久化入站队列不可用，导致一个入站消息也无法被接纳。

- 当通道无法打开其持久入口队列时，其启动失败，网关将帐户记录为无法接收。 `openclaw channels status` 报告 `Channel cannot admit inbound events; its durable ingress queue is unavailable. Outbound may still work.`
- 无论传输状态如何，此类账户均属于**不健康**状态，就绪检查也会将其报告为失败。此前它会报告 `health: healthy`，健康监控器也从未处理过它。
- 恢复过程仍会自动进行。入站判定描述的是该账户最近一次启动尝试的结果，并会在下一次启动时清除，因此普通的重启流程同样可以恢复临时性的队列打开失败。这些重启会记录为 `health-monitor: restarting (reason: ingress-unavailable)`，而不是通用的 `stuck`。
- 如果重启持续重复发生，原因就不是临时性的。请检查日志中记录的入站失败原因：例如，插件拒绝了 `openChannelIngressQueue` 能力，这种情况需要操作员采取措施，而不是再次重启。
- 从未报告入站状态的通道不受影响：缺少状态意味着“无信号”，绝不意味着“已损坏”。不存在流量陈旧度启发式判断，因此一个确实安静的通道不会因为没有收到任何消息而被标记为不健康。

<a id="http-probes" />

## <a id="http-checks"></a> HTTP 检查

网关公开了三个未经身份验证的 `GET`/`HEAD` 检查对：

| 端点               | 含义                                                                                                                                                                                     | 用途                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `/health`, `/healthz`   | HTTP 服务器处于运行状态。                                                                                                                                                                    | 进程存活性和重启决策。           |
| `/startup`, `/startupz` | 启动 sidecar 和代理数据库 inspection/preparation 已解决，并且网关未耗尽。不咨询通道健康状况。                                                  | 启动阶段监控和更新验证。 |
| `/ready`, `/readyz`     | 启动 sidecar 已经解决，网关没有耗尽，所需的代理数据库已完成准入且没有失败，并且配置的通道帐户通过了深度准备检查。 | 交通准入和操作员监控。        |

HTTP 侦听器在初始会话投影完成之前打开。在该构建过程中，`/healthz` 可以返回 `200`，而 `/startupz` 和 `/readyz` 仍处于待处理状态。其他HTTP请求和WebSocket升级等待完成投影后再进行认证和路由；他们从来没有看到过部分名单。发现和远程技能听众与投影准备同时进行。初始的全机队技能扫描在准备就绪后在跟踪维护中运行；按需技能阅读仍然准备所请求的工作空间。准备状态还等待回复和 WebSocket 连接模块加载，因此立即连接和第一次轮流会重用准备好的运行时。更新验证仍会等待启动完成，然后再检查准备情况。

即使设置了 `gateway.controlUi.basePath`，这些探测路径仍保留在服务器根目录中。 UI 基本路径（例如 `/health`）不会将其子路由转变为探测：它们仍然等待初始化并保留其正常身份验证。

当启动 sidecar 或代理数据库 inspection/preparation 处于挂起状态时，`/startupz` 返回 `503` 和 `status: "starting"`，`503` 在耗尽期间返回 `status: "draining"`，否则返回 `200` 和 `status: "started"`。边车安定后，等待对任何代理（包括可选代理）进行检查，报告 `pendingReason: "agent-database-inspection"`。这使得 `openclaw update` 候选验证在检查准备情况之前在其启动预算内等待。已解决的检查失败不会使启动处于等待状态；准备情况和每个代理的准入报告失败。

具有挂起启动 inspection/preparation 或已确认准入失败的默认或系统代理数据库会将准备状态保持为 false，其中 `failing: ["agent-database:<id>"]` 以及 `agentDatabases` 中的确切准入原因和修复提示。此处报告待启动检查，代码为 `agent-database-inspection-pending`。当就绪状态为 false 时，HTTP 侦听器、Control UI 和已承认的代理仍然可用；待定可选代理不保持就绪状态。就绪状态不会等待就绪后子代理恢复或副本维护。代理范围的 `sessions.list` 以及 `sessions.resolve`、`sessions.describe` 和 `models.list` 最多等待 20 秒，让其选定的代理完成启动准备，然后在读取之前重新检查请求授权。针对健康代理的请求独立进行。当其他商店准备时，未范围的会话列表继续返回已接纳的代理。写入仍然需要完成入场。 RPC 请求拒绝待检验退货 `UNAVAILABLE` 以及 `retryable: true` 和 `retryAfterMs: 250`；调用者可以在延迟后重试相同的请求。检查失败和所有权不匹配仍然不可重试。被拒绝的可选代理可以保持隔离，而健康的代理可以处理请求。网关就绪公告使用相同的就绪决策。

如果较新的模型运行时发布取代了延迟的代理准备，则准入会等待该发布一次，然后根据当前配置和机密重试准备。恢复使用现有的四次尝试启动发布预算，无需重新打开或再次迁移数据库。失败的发布或耗尽的预算使代理无法使用，并记录其原因并准备修复提示。

损坏的 Telegram 或其他通道帐户也可以使 `/readyz` 返回 `503`，同时 `/startupz` 仍保持启动状态。两种检查都不能替代另一种检查：仅启动完成并不能证明代理或通道的可用性。

已禁用、未配置和通常未链接的帐户不会导致通道准备失败。已启用、已配置且记录有终端断开连接、生命周期被阻止或入口不可用的帐户即使已取消链接，仍无法通过运行状况检查。例如，终端 WhatsApp 注销使 `/readyz` 在详细响应中返回 `503` 和 `failing: ["whatsapp"]`。终端断开连接和帐户被阻止需要操作员采取行动；运行状况监视器不会重新启动它们。

远程未经过身份验证的启动响应只包含 `ok` 和 `status`。本地直接调用方和经过身份验证的调用方还会在启动等待期间收到 `version`、`uptimeMs` 和 `pendingReason`。就绪状态详情遵循相同的本地或经过身份验证的访问控制，因为其中可能会指出发生故障的子系统。

### <a id="shared-state-integrity-failure"></a> 共享状态完整性失败

终端共享状态准入失败会立即导致 `/ready` 和 `/readyz` 返回 `503`，包括 SQLite Worker 在启动后发现的失败。详细回复包括 `failing: ["state-database"]` 和 `stateDatabase.reason` 以及记录的拒绝。这会绕过缓存的通道运行状况；检查读取准入所有者的记录结果而不查询SQLite。

`/healthz` 仍报告 HTTP 活跃度。需要检测正在运行但无法承认工作的网关的主管必须监视 `/readyz`。

### <a id="plugin-replacement-recovery"></a> 插件替换恢复

在插件替换或恢复期间，`/readyz` 返回 `503`。详细响应包括 `failing: ["plugin-reload"]` 和 `pluginReload` 对象以及受影响的 `pluginIds`、当前 `phase`（`reloading`、`recovering` 或 `failed`）以及任何恢复 `deadlineAtMs` 和可操作`reason`。这些所有者报告的事实绕过通道就绪缓存，因此失败的替换不能仅显示为一般通道中断或陈旧的健康结果。

当替换使通道准入暂停时，运行状况监视器不会花费通道重新启动尝试。成功回滚后，之前的插件配置将重新启动其通道，并恢复普通的准备情况检查。如果自动恢复达到期限，`phase: "failed"` 保留失败原因和下一步操作。准入暂停被释放，允许监视器重新启动可调用通道；其承认的工作或清理仍然拥有资源的插件需要报告的修复或重试才能重新启动。恢复合约参见[配置热重载](/gateway/configuration/hot-reload)。

### <a id="cpu-pressure-and-event-loop-delay"></a> CPU 压力和事件循环延迟

详细的准备情况可以包括最新完成的 `eventLoop` 诊断快照。采样器设有观察窗；运行状况读取不会重置待处理的测量。在活动工作、降级或诊断样本导出期间，本机事件循环延迟采样以 20 毫秒分辨率运行，并且网关每秒发布一次完整的观察结果。健康的空闲网关每十秒发布一次并暂停本机直方图。空闲窗口仍然跟踪阻塞回调和逾期采样期限；当直方图暂停时，`delayP99Ms` 为零。工作变得活跃会在下一个空闲截止日期（十秒内）恢复完整采样。新感兴趣的导出器将挂起的样本推进到当前窗口的一秒边界，或者如果该边界已经过去，则立即调度它，而不重置窗口。即使延迟了发布者，长阻塞回调仍然是观察的一部分。在第一个窗口完成之前，没有可用的快照。它的 `cpuCoreRatio` 测量整个网关进程（包括工作线程和本机线程）中的用户和系统 CPU 时间，除以经过的挂起时间。该单位是核心当量：`1` 表示一个 CPU 核心在该时间间隔内被完全占用，并行工作可以产生高于 `1` 的值。它不是主机 CPU 总容量的百分比。

当返回缓存的摘要或发布新收集的摘要时，`health` RPC 还会读取最新完成的样本。慢速通道检查不会冻结其 CPU 和延迟读数。如果采样器重置，运行状况响应将忽略 `eventLoop`，直到新窗口完成，而不是恢复缓存的样本。

可选的 `cpuBreakdown` 分隔独立的本机计数器：

- `hostUtilization` 是 `os.cpus()` 报告的主机 CPU 时间的繁忙部分，从 `0` 到 `1` 跨 `hostCpuCount` 逻辑 CPU。这包括其他进程，不是网关的 CPU 配额或容器限额。
- `mainThreadCoreRatio` 使用 `process.threadCpuUsage()` 测量网关主线程，而不是事件循环利用率。
- `workerCoreRatio` 对任务池和 SQLite 代理拥有的工作线程的 `Worker.cpuUsage()` 计数器进行求和。它不包括子流程、远程工作人员或在这些所有者之外创建的工作人员。
- `otherThreadsCoreRatio` 是 **估计残差**：过程 CPU 减去测量的主和跟踪工人 CPU，钳位为零。它包括未跟踪的工作线程和本机线程，而不是测量的工作线程类别。

线程值使用与 `cpuCoreRatio` 相同的核心等效单位。 Worker 读取是异步的，并且必须在每个采样边界的 100 毫秒内完成；这些不是原子跨线程测量。残差可能随测量偏差而变化。超时请求永远不会延迟事件循环样本，并且每个跟踪的工作线程最多有一个本机请求未完成，即使在监视器重置期间也是如此。启动、工作线程 creation/exit、主机 CPU 拓扑更改、计数器重置和收集失败在发布受影响的速率之前需要新的基线。缺少字段意味着不可用，而不是零。

主线程和主机计数器在 Node 和 Bun 上独立收集。跟踪的工作线程 CPU 和 Bun 上的残差被省略：当本机计数器收集失败时，其工作线程 API 可以报告零。任何平台上不受支持或失败的本机 API 都会导致相应字段缺失。

Control UI 的 **Gateway CPU** 盒通过 `system.info.eventLoop` 读取相同的采样器。其标题显示了等效的进程核心：`2.58 cores` 表示大约两个半完全占用的逻辑 CPU。构建和工具子流程被排除在外。单独的 **Host** 读取包括所有主机进程，并对所有报告的逻辑 CPU 使用 `100%`。在详细覆盖中，进程和线程百分比使用 `100%` 表示一个完全占用的核心。在第一次完成测量或不可用时，值会显示破折号。

事件循环延迟和利用率分别描述主线程。 `cpu` 降级原因报告过程 CPU 压力，具有延迟共证；它无法识别消耗 CPU 的线程或证明主线程挂起。检查延迟测量值和 CPU 压力。 `eventLoop` 诊断本身不会更改就绪结果。

超过一秒的主线程回调会生成 `main-thread stall` 日志，其中包含代码拥有的任务标签（如果可用）。在 Node 26 上，有界 CPU 飞行记录器写入一个附加有界 `main-thread stall profile` 行，其中包含尾随窗口的顶部包含帧、样本计数和截断状态。多个回调可以在样本之前完成，因此该窗口不会分配给单个任务。它每 10 毫秒采样一次，并在不停止采样器的情况下旋转 5 秒窗口。最多保留两个窗口；没有写入配置文件。符号和位置使用与按需诊断配置文件相同的编辑策略。当采样堆栈包含多个列出的帧时，包含计数重叠；它们不是独立的持续时间。

记录器会跳过 Bun、Node 24（缺少有界粗采样 API），并且进程已经以冲突的分析、跟踪或调试器选项启动。回调标签在这些运行时仍然有效。本机阻塞工作可以保持不符号化，并且异常长的隔间可能会耗尽样品盖； `truncated=true` 识别出不完整的证据。记录器故障记录一次并在该监视器的生命周期内禁用记录。

## <a id="uptime-monitoring"></a> 运行时间监控

外部正常运行时间监控服务应使用专用的 `/health` 端点，而不是 `/v1/chat/completions`。

- **DO 使用：** `GET /health` - 即时响应，没有创建会话，没有 LLM 调用，返回 `{"ok":true,"status":"live"}`
- **DON'T 使用：** `/v1/chat/completions` 进行运行状况检查 - 每个请求都会创建一个包含技能快照、上下文组装和 LLM 调用的完整代理会话

当未提供 `x-openclaw-session-key` 标头或 `user` 字段时，`/v1/chat/completions` 会为每个请求生成新的随机会话。每 15 分钟 ping 一次的监控服务会创建约 96 个 sessions/day，每个消耗 4-22KB。随着时间的推移，这会导致会话存储膨胀，并可能导致上下文窗口溢出。

### <a id="monitoring-service-setup-examples"></a> 监控服务配置示例

- **BetterStack：** 将健康检查 URL 设置为 `https://<your-gateway-host>:<port>/health`
- **UptimeRobot：** 添加一个新的 HTTP 监控，URL 为 `https://<your-gateway-host>:<port>/health`
- **Generic：** 任何 HTTP GET 到 `/health` 在网关的 HTTP 服务器处于活动状态时返回 200 和 `{"ok":true,"status":"live"}`

## <a id="when-something-fails"></a> 当出现故障时

- `logged out` 或状态 409-515 -> 与 `openclaw channels logout` 重新链接，然后与 `openclaw channels login` 重新链接。
- 网关无法访问 -> 启动网关：`openclaw gateway --port 18789`（如果端口被占用，请使用 `--force`）。
- 无入站消息 -> 确认链接手机在线且允许发送者 （`channels.whatsapp.allowFrom`）；对于群聊，检查白名单 + 提及规则是否匹配（`channels.whatsapp.groups`、`agents.entries.*.groupChat.mentionPatterns`）。

## <a id="dedicated-%22health%22-command"></a><a id="dedicated-health-command"></a> 专用“health”命令

`openclaw health` 向正在运行的网关询问其运行状况快照（没有来自 CLI 的直接通道套接字）。默认情况下，它返回一个新的缓存网关快照，并且网关在后台刷新该缓存； `--verbose` 强制进行实时检查。连接和缓存的运行状况读取共享一分钟的后台刷新节奏，因此重复的诊断连接不会每次都重建运行状况快照。针对缺失或过时的运行状况的显式实时检查和刷新仍然会立即运行。快照描述已加载和配置的通道。单独存储的凭据不会激活通道或将其添加到网关运行状况；使用通道设置来启用它。该命令报告链接的 creds/auth 可用期限、每通道检查摘要、会话存储摘要和检查持续时间。实时检查使用有界帐户并发性和网关拥有的截止日期，因此一个慢速帐户会返回结构化超时，而已完成的同级结果仍然可用。如果网关无法访问或网关调用本身超时，则该命令将以非零值退出。

### <a id="queue-warnings"></a> 队列警告

成功的运行状况 RPC 会报告顶级 `ok: true`。该值意味着网关生成了快照；这并不意味着每个交付队列都是畅通的。检查 `deliveryQueues.ingressPressure` 是否有可能阻塞后续活动的持久入站通道。当未找到受压车道时，该字段将被省略。

入口压力使用保守的内置诊断阈值，而不是任何插件的权威重试或声明策略。仅当活动待处理或已声明的行已达到至少八次尝试并记录了传递错误，或者已声明的行在 30 分钟内未刷新其声明时，才会出现持久通道。不存在普通重试 1-7。没有记录错误的索赔恢复增量也不存在，而实时索赔则由于索赔时间戳被刷新而保持不存在。没有持久车道键的行被忽略，因为它们无法证明后面的事件被阻塞；在真正的派生通道重试后，运行时会保留派生通道。

每个结果均按通道帐户分组，并报告压力通道、待处理、已声明和阻止的计数以及最旧的受影响接收时间。受压通道中的所有活动行都会计入这些计数。快照从不包含通道 ID、事件 ID、有效负载、声明所有者或令牌、记录的错误或会话和目标标识符。

选项：

- `--json`：机器可读的 JSON 输出
- `--timeout <ms>`：覆盖默认的10s网关连接超时；它不会延长网关的内部实时检查期限
- `--verbose`：强制实时检查并打印网关连接详细信息
- `--debug`：`--verbose` 的别名

运行状况快照包括：`ok`（布尔值）、`ts`（时间戳）、`durationMs`（检查时间）、每通道状态、代理可用性、会话存储摘要和可选的传递队列警告。

## <a id="related"></a> 相关内容

- [Gateway 运行手册](/gateway)
- [诊断导出](/gateway/diagnostics)
- [网关故障排查](/gateway/troubleshooting)
- [`openclaw health`](/cli/health) — 通过 RPC 从 CLI 请求此快照
