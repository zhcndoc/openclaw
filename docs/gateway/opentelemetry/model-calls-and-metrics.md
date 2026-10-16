---
summary: "模型调用跨度衡量什么、Claude Code CLI 转向保真度以及完整导出的指标目录"
title: "模型调用和导出指标"
sidebarTitle: "指标"
read_when:
  - "您需要准确的指标名称和属性形状来构建仪表板或警报"
  - "您正在比较请求级和回合级模型调用观察结果"
  - "您正在读取 Claude Code CLI 字节、计时或使用编号"
---

## <a id="model-call-observation-units"></a> 模型调用观测装置

每个 `openclaw.model.call` span 都通过 `openclaw.model_call.observation_unit` 标识其生命周期所度量的内容：

- `request` - 一个可观察的 model/provider 请求。本机嵌入式模型调用使用此单位，导出器将缺失值视为 `request`，以便与旧版或外部发射器兼容。
- `turn` - 一个不透明的 agent CLI 轮次，其中可能包含隐藏的模型请求、重试、工具工作或后台工作。Claude Code CLI 和 Codex app-server 调用使用此单元。

两个单元都保留模型调用跨度，因此跟踪后端可以呈现模型输入、输出、用法和层次结构。请求跨度使用 API- 派生的 GenAI 操作（`chat`、`generate_content` 或 `text_completion`），而转弯跨度使用 `gen_ai.operation.name = invoke_agent`。两者都有助于 `gen_ai.client.operation.duration`，其中操作名称将直接请求延迟与全轮延迟分开。 OpenClaw 的 OTEL 模型调用指标还包括 `openclaw.model_call.observation_unit`； Prometheus 模型调用指标公开等效的 `observation_unit` 标签。

请求级遥测还涵盖​​本机后台完成，包括会话标题、活动回顾和插件 `runtime.llm.complete` 调用。每个请求都会记录一次开始和一次完成或错误及其持续时间；在 `model.usage` 中，代币和成本核算仍然是分开的。

## <a id="claude-code-cli-model-call-fidelity"></a> Claude Code CLI 模型调用保真度

Claude Code CLI 轮次会发出一个合成的、轮次级别的 `openclaw.model.call` span。这些不是 Anthropic HTTP 请求 span。它们使用 `openclaw.api = claude-code`、`openclaw.model_call.observation_unit = turn`，并将操作标识为 `gen_ai.operation.name = invoke_agent`。它们通过 `openclaw.transport` 标识 OpenClaw 的 CLI 边界：

- `stdio` - 一次性本地 Claude Code 进程。
- `stdio-live` - 在受管理的持久 Claude stdio 会话中执行的一次轮次。
- `paired-node-cli` - 委托给配对节点的一次性 Claude Code 执行。

Claude CLI 诊断仅在启用进程诊断调度程序并附加内部或可信事件侦听器时实例化。在没有可观察性插件或其他活动侦听器的情况下，Claude CLI 会跳过合成跟踪层次结构、内容缓冲区和诊断流字节记帐。启用内容捕获后，提示和系统提示字段的上限分别为 128 KiB；助理输出上限为 128 KiB，最多 200 个信封，其中 16 KiB 和一项保留用于最终可见的后备响应。当达到限制时，标记会记录截断。

OpenClaw 为 Claude CLI 轮次提供与其他 agent 运行时相同的所有权层级：`openclaw.harness.run`（`openclaw.harness.id = claude-cli`）包含 `openclaw.run`，后者包含 Claude 的 `openclaw.model.call` span。harness 和 run span 是合成的 OpenClaw 轮次边界，而不是 Claude Code 的内部阶段。一次性和受管理的 stdio 轮次使用相同的层级；真正的新会话重试会在同一个 OpenClaw run 内创建另一个模型调用子 span。

当 OpenClaw 承认准备好的 CLI 回合时，跨度开始，仅在该回合成功或失败后结束。对于托管会话，临时成功结果不会结束跨度，而 Claude 报告结果保存后台代理或工作流程；最终的排水后结果就是如此。中止、超时、进程故障、output/parse 故障和其他转向故障会以错误结束同一跨度。

Claude Code 会报告每条 assistant 消息的用量，也可能在其终端结果中报告累计用量。OpenClaw 的回复计费仍继续使用最后一条 assistant 消息，因此现有成本语义不会改变；轮次级别的模型调用 span 在可用时使用终端累计用量，包括缓存读取和缓存创建 token。

对于这些 CLI span，字节和计时字段描述的是可观测的 OpenClaw CLI 边界：

- `openclaw.model_call.request_bytes` 是通过一次性 stdin/argv 或托管 stdio JSONL 用户信封发送的提示值的 UTF-8 大小。不是Claude Code隐藏模型请求的大小。
- `openclaw.model_call.response_bytes` 是轮次期间观测到的 Claude CLI stdout 的 UTF-8 大小。它不是 Anthropic HTTP 响应的大小。
- `openclaw.model_call.time_to_first_byte_ms` 是到首次可观测的 Claude CLI stdout 或 stderr 输出所需的时间。它不是网络 TTFB。

启用`captureContent`后，跨度通过`gen_ai.input.messages`和`gen_ai.output.messages`将有效提示OpenClaw导出到Claude Code和可视助手text/tool-call身份。 Claude 助手信封中省略了工具参数、内部思维、不透明思维签名、工具结果和系统提示。 OpenClaw 不声明对 Claude Code 的私有系统提示、隐藏的恢复或压缩请求有效负载、本机内部工具模式、原始 Anthropic HTTP 请求、内部重试、上游请求 id 或真实网络 TTFB 的访问权限。由于 Claude Code 未准确公开其有效的本机工具定义，因此这些跨度不会填充 `gen_ai.tool.definitions`。

即使启用了工具内容捕获，外部 Claude harness 工具 span 仍然仅包含元数据。与每个模型 span 一样，捕获的 Claude CLI 内容使用受信任的仅监听器路径以及导出器现有的脱敏和大小限制；默认情况下内容处于关闭状态。

## <a id="exported-metrics"></a> 已导出的指标

### <a id="gateway-rpc"></a> 网关 RPC

经过身份验证的网关 WebSocket 请求（包括专用工作 RPC）在启用诊断和感兴趣的导出器时发出这些指标。它们排除连接握手、格式错误的请求帧和 HTTP 路由。

| 指标                                   | 类型      | 测量                                                       |
| ---------------------------------------- | --------- | ----------------------------------------------------------------- |
| `openclaw.gateway.rpc.requests`          | 柜台   | 收到的有效请求，包括随后被拒绝的请求 |
| `openclaw.gateway.rpc.first_response_ms` | 直方图 | 通过第一个成功发送的响应进行接收              |
| `openclaw.gateway.rpc.handler_ms`        | 直方图 | 通过 return 或 throw 实际调用处理程序                 |
| `openclaw.gateway.rpc.admission_ms`      | 直方图 | 通过实际处理程序调用接收                         |
| `openclaw.gateway.rpc.queue_wait_ms`     | 直方图 | 操作员启动队列或工作人员帧队列等待（如果适用）  |
| `openclaw.gateway.rpc.outcomes`          | 柜台   | 按阶段和结果进行的观察                                 |

请求和计时指标只有 `openclaw.gateway.rpc.method`：确切的核心、工作程序或注册的插件方法名称，`other` 表示未注册的通用请求，或 `unknown` 表示无法识别的专用工作程序 RPC。结果指标只有 `openclaw.gateway.rpc.phase` 和 `openclaw.gateway.rpc.outcome`，因此错误不会增加每个方法的系列。指标属性中不会出现请求、连接、会话或跟踪 ID。

操作员准入包括授权、惰性路由器和处理程序加载以及启动队列等待。 Worker 准入包括套接字 FIFO 等待和外帧验证。工作处理程序持续时间包括方法验证和服务调用。工作线程计时从 JavaScript 套接字回调开始，不包括该回调之前的网络延迟和事件循环延迟。队列等待是启动处理程序准入的子集，与 command/session 通道 `openclaw.queue.wait_ms` 分开。处理程序和准入示例仅适用于调用的处理程序。当调度解决时，记录队列等待。

工作人员推理开始时间衡量接受和设置，而不是提供者完成情况。释放套接字 FIFO 后，长工作计算机和会话操作保留其处理程序计时。工人调度结果描述返回或抛出。连接关闭可以在成功执行后抑制响应，并且其本身并不证明执行已取消。

发送响应意味着 WebSocket 发送方接受了该帧，而不是客户端收到了该帧。早期确认算作第一响应；后面的回复不会添加另一个样本。不可用或被抑制的发送会产生结果，但没有第一响应样本。处理程序可能会在保留的回调发送其响应之前返回，并且分离的代理工作可以在之后继续。这些持续时间测量经过的时间，包括异步等待，而不是 CPU 时间或事件循环阻塞时间。

观察使用有界诊断队列。在饱和期间将计数或延迟分布视为完整之前，请检查 `openclaw.diagnostic.async_queue.dropped`。

### <a id="model-usage"></a> 模型使用

- `openclaw.tokens`（计数器，属性：`openclaw.token`、`openclaw.channel`、`openclaw.provider`、`openclaw.model`、`openclaw.agent`）
- `openclaw.cost.usd`（计数器，属性：`openclaw.channel`、`openclaw.provider`、`openclaw.model`）
- `openclaw.run.duration_ms`（直方图，属性：`openclaw.channel`、`openclaw.provider`、`openclaw.model`）
- `openclaw.context.tokens`（直方图，属性：`openclaw.context`、`openclaw.channel`、`openclaw.provider`、`openclaw.model`）
- `gen_ai.client.token.usage`（直方图，GenAI 语义约定指标，属性：`gen_ai.token.type` = `input`/`output`、`gen_ai.provider.name`、`gen_ai.operation.name`、`gen_ai.request.model`）
- `gen_ai.client.operation.duration`（直方图，单位为秒，适用于模型请求和合成代理轮次的 GenAI 语义约定指标；属性：`gen_ai.provider.name`、`gen_ai.operation.name`、`gen_ai.request.model`，可选 `error.type`；轮次观测使用 `gen_ai.operation.name = invoke_agent`）
- `openclaw.model_call.duration_ms`（直方图，属性：`openclaw.provider`、`openclaw.model`、`openclaw.api`、`openclaw.transport`、`openclaw.model_call.observation_unit`；对于已分类的错误，还包括 `openclaw.errorCategory` 和 `openclaw.failureKind`）
- `openclaw.model_call.request_bytes`（直方图，最终模型请求负载的 UTF-8 字节大小；对于 Claude Code CLI，上述可观察提示 input/envelope；无原始负载内容）
- `openclaw.model_call.response_bytes`（直方图，流式响应块负载的 UTF-8 字节大小；高频文本、思考和工具调用增量仅计算增量 `delta` 的字节数；对于 Claude Code CLI，为观测到的 stdout 字节数；不包含原始响应内容）
- `openclaw.model_call.time_to_first_byte_ms`（直方图，首个流式响应事件之前经过的时间；对于 Claude Code CLI，为首个可观测 CLI 输出之前的时间，而非网络 TTFB）
- `openclaw.model.failover`（计数器，属性：`openclaw.provider`、`openclaw.model`、`openclaw.failover.to_provider`、`openclaw.failover.to_model`、`openclaw.failover.reason`、`openclaw.failover.suspended`、`openclaw.lane`）
- `openclaw.skill.used`（计数器，属性：`openclaw.skill.name`、`openclaw.skill.source`、`openclaw.skill.activation`，可选 `openclaw.agent`、可选 `openclaw.toolName`）

### <a id="message-flow"></a> 消息流

- `openclaw.webhook.received`（计数器，属性：`openclaw.channel`、`openclaw.webhook`）
- `openclaw.webhook.error`（计数器，属性：`openclaw.channel`、`openclaw.webhook`）
- `openclaw.webhook.duration_ms`（直方图，属性：`openclaw.channel`、`openclaw.webhook`）
- `openclaw.message.queued`（计数器，属性：`openclaw.channel`、`openclaw.source`）
- `openclaw.message.received`（计数器，属性：`openclaw.channel`、`openclaw.source`）
- `openclaw.message.dispatch.started`（计数器，属性：`openclaw.channel`、`openclaw.source`）
- `openclaw.message.dispatch.completed`（计数器，属性：`openclaw.channel`、`openclaw.outcome`、`openclaw.reason`、`openclaw.source`）
- `openclaw.message.dispatch.duration_ms`（直方图，属性：`openclaw.channel`、`openclaw.outcome`、`openclaw.reason`、`openclaw.source`）
- `openclaw.message.processed`（计数器，属性：`openclaw.channel`、`openclaw.outcome`）
- `openclaw.message.duration_ms`（直方图，属性：`openclaw.channel`、`openclaw.outcome`）
- `openclaw.message.delivery.started`（计数器，属性：`openclaw.channel`、`openclaw.delivery.kind`）
- `openclaw.message.delivery.duration_ms`（直方图，属性：`openclaw.channel`、`openclaw.delivery.kind`、`openclaw.outcome`、`openclaw.errorCategory`）

### <a id="talk"></a> 语音对话

- `openclaw.talk.event`（计数器，属性：`openclaw.talk.event_type`、`openclaw.talk.mode`、`openclaw.talk.transport`、`openclaw.talk.brain`、`openclaw.talk.provider`）
- `openclaw.talk.event.duration_ms`（直方图，属性同 `openclaw.talk.event`；当 Talk 事件报告持续时间时发出）
- `openclaw.talk.audio.bytes`（直方图，属性同 `openclaw.talk.event`；为报告字节长度的 Talk 音频帧事件发出）

### <a id="queues-and-sessions"></a> 队列与会话

- `openclaw.queue.lane.enqueue`（计数器，属性：`openclaw.lane`）
- `openclaw.queue.lane.dequeue`（计数器，属性：`openclaw.lane`）
- `openclaw.queue.depth`（直方图，属性：`openclaw.lane` 或 `openclaw.channel=heartbeat`）
- `openclaw.queue.wait_ms`（直方图，属性：`openclaw.lane`）
- `openclaw.session.state`（计数器，属性：`openclaw.state`、`openclaw.reason`）
- `openclaw.session.stuck`（计数器，属性：`openclaw.state`；为可恢复的陈旧会话清理发出）
- `openclaw.session.stuck_age_ms`（直方图，属性：`openclaw.state`；为可恢复的陈旧会话清理发出）
- `openclaw.session.turn.created`（计数器，属性：`openclaw.agent`、`openclaw.channel`、`openclaw.trigger`）
- `openclaw.session.recovery.requested`（计数器，属性：`openclaw.state`、`openclaw.action`、`openclaw.active_work_kind`、`openclaw.reason`）
- `openclaw.session.recovery.completed`（计数器，属性：`openclaw.state`、`openclaw.action`、`openclaw.status`、`openclaw.active_work_kind`、`openclaw.reason`）
- `openclaw.session.recovery.age_ms`（直方图，属性：与对应的恢复计数器相同）
- `openclaw.run.attempt`（计数器，属性：`openclaw.attempt`）

### <a id="session-liveness-telemetry"></a> 会话存活遥测

当 OpenClaw 观察到回复、工具、状态、区块或 ACP 运行时进度时，`processing` 会话不会向内置存活阈值增长。输入状态保活不计作进度，因此仍然可以检测到无响应的模型或 harness。

OpenClaw 按其仍能观察到的工作对会话进行分类：

- `session.long_running`：活跃的嵌入式工作、模型调用或工具调用仍在取得进展。由系统拥有的静默模型调用在达到内置中止阈值之前也会报告为长期运行，因此在可观测到中止之前，运行缓慢或不进行流式传输的模型提供商不会被视为停滞的网关会话。
- `session.stalled`：活动工作存在，但活动运行尚未报告最近的进度。在内置中止阈值或之后，拥有的模型调用从 `session.long_running` 切换到 `session.stalled`；无所有者的陈旧 model/tool 活动不被视为无害的长期运行工作。停滞的嵌入式运行首先保持仅观察状态，然后在中止阈值后中止排水，没有任何进展，因此车道后面的排队转弯可以恢复。
- `session.stuck`：没有活动工作的过时会话簿记，或具有过时无主 model/tool 活动的空闲排队会话。这会在恢复门通过后立即释放受影响的会话通道。

恢复会发出结构化的 `session.recovery.requested` 和 `session.recovery.completed` 事件。只有在变更型恢复结果（`aborted` 或 `released`）之后，且仅当相同的处理代次仍然是当前代次时，诊断会话状态才会标记为空闲。

仅 `session.stuck` 发出 `openclaw.session.stuck` 计数器、`openclaw.session.stuck_age_ms` 直方图和 `openclaw.session.stuck` 跨度。重复的 `session.stuck` 诊断会在会话保持不变的情况下退出，因此仪表板应针对持续增加而不是每次心跳滴答发出警报。有关配置旋钮和默认值，请参阅 [ 配置参考](/gateway/config-observability#diagnostics)。

存活警告也会发出：

- `openclaw.liveness.warning`（计数器，属性：`openclaw.liveness.reason`）
- `openclaw.liveness.event_loop_delay_p99_ms`（直方图，属性：`openclaw.liveness.reason`）
- `openclaw.liveness.event_loop_delay_max_ms`（直方图，属性：`openclaw.liveness.reason`）
- `openclaw.liveness.event_loop_utilization`（直方图，属性：`openclaw.liveness.reason`）
- `openclaw.liveness.cpu_core_ratio`（直方图，属性：`openclaw.liveness.reason`）

CPU 比率衡量核心等效项（包括工作线程和本机线程）中的整个进程 CPU 使用情况，并且可能超过 `1`。事件循环延迟和利用率分别测量主线程。请参见 [CPU 压力和事件循环延迟](/gateway/health#cpu-pressure-and-event-loop-delay)。

### <a id="gateway-event-loop-observation-windows"></a> Gateway事件循环观察窗口

- `openclaw.gateway.event_loop.delay_max_ms`（直方图，无属性；每个已完成的运行状况监控窗口的最大延迟）
- `openclaw.gateway.event_loop.observed_ms`（计数器，无属性；由完成的窗口表示的经过的毫秒数）

这些指标使用现有的诊断插件设置，并要求指标处于活动状态。每个接受的运行状况监控窗口都会记录一次，因此稍后的运行状况就绪结果不会删除之前的高延迟观察。运行状况和抓取读取不会提交或重置样本。进程范围的观察不携带请求跟踪上下文，也不创建跨度或日志，包括预加载的 SDK。

监视器每 20 毫秒对经过的事件循环间隔进行采样，并在至少一秒或更短的时间后完成窗口以发出延迟警告。即使在逾期样本之前读取运行状况，普通窗口重置也会保留待处理间隔。计数和分位数描述了完整的窗口及其最大值，而不是单个停顿或采样延迟分布的整体 p99。有意监视器重置丢弃未完成的窗口；如果没有感兴趣的出口商，收集不会回填时期。诊断队列丢弃、SDK/export 故障和重新启动限制覆盖范围。使用表示持续时间计数器和 exporter/drop 遥测来评估它。准备决策和持续的活性警告阈值保持不变。有关拉取指标和示例查询，请参阅 [Prometheus 事件循环 windows](/gateway/prometheus#event-loop-observation-windows)。

### <a id="harness-lifecycle"></a> Harness 生命周期

- `openclaw.harness.duration_ms`（直方图，属性：`openclaw.harness.id`、`openclaw.harness.plugin`、`openclaw.outcome`、`openclaw.harness.phase`（在错误时））

### <a id="tool-execution-and-loop-detection"></a> 工具执行与循环检测

- `openclaw.tool.execution.duration_ms`（直方图，属性：`gen_ai.tool.name`、`openclaw.toolName`、`openclaw.tool.source`、`openclaw.tool.owner`、`openclaw.tool.params.kind`，以及错误时的 `openclaw.errorCategory`）
- `openclaw.tool.execution.blocked`（计数器，属性：`gen_ai.tool.name`、`openclaw.toolName`、`openclaw.tool.source`、`openclaw.tool.owner`、`openclaw.tool.params.kind`、`openclaw.deniedReason`）
- `openclaw.tool.loop`（计数器，属性：`openclaw.toolName`、`openclaw.loop.level`、`openclaw.loop.action`、`openclaw.loop.detector`、`openclaw.loop.count`，可选 `openclaw.loop.paired_tool`；当检测到重复的工具调用循环时发出）

准确的字符串和数组参数长度记录在工具跨度上，而不是度量标签上。这可以防止累积工具指标为每个观察到的长度保留单独的系列。

### <a id="exec"></a> 执行

- `openclaw.exec.duration_ms`（直方图，属性：`openclaw.exec.target`、`openclaw.exec.mode`、`openclaw.outcome`、`openclaw.failureKind`）

### <a id="diagnostics-internals-(memory%2C-payloads%2C-exporter-health)"></a><a id="diagnostics-internals-memory-payloads-exporter-health"></a> 诊断内部项（内存、负载、导出器健康）

- `openclaw.gc.duration_ms`（直方图，无属性；托管 JavaScript 隔离的 GC 持续时间）

GC 持续时间使用 Node.js 性能条目，并且仅在启用指标时导出。这不是 CPU 时间，也不是保证世界停止的暂停。当现有的诊断心跳看到感兴趣的消费者时，观察就开始了；启动后的注册可以等到下一个 30 秒的时间间隔，无需回填。诊断 disable/shutdown 立即断开连接。请参阅 [GC 持续时间覆盖范围和相关性限制](/gateway/prometheus#garbage-collection-duration)。

- `openclaw.payload.large`（计数器，属性：`openclaw.payload.surface`、`openclaw.payload.action`、`openclaw.channel`、`openclaw.plugin`、`openclaw.reason`）
- `openclaw.payload.large_bytes`（直方图，属性同 `openclaw.payload.large`）
- `openclaw.memory.rss_bytes` / `openclaw.memory.heap_used_bytes` / `openclaw.memory.heap_total_bytes` / `openclaw.memory.external_bytes` / `openclaw.memory.array_buffers_bytes`（直方图，无属性；进程内存采样）
- `openclaw.memory.pressure`（计数器，属性：`openclaw.memory.level`、`openclaw.memory.reason`）
- `openclaw.diagnostic.async_queue.dropped`（计数器，属性：`openclaw.diagnostic.async_queue.drop_class`；内部诊断队列背压丢弃）
- `openclaw.telemetry.exporter.events`（计数器，属性：`openclaw.exporter`、`openclaw.signal`、`openclaw.status`，可选`openclaw.reason`，可选`openclaw.errorCategory`；导出器lifecycle/failure自遥测）
