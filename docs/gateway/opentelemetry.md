---
summary: "将 OpenClaw 诊断导出到 OpenTelemetry 收集器，或通过 diagnostics-otel 插件导出为 stdout JSONL"
title: "OpenTelemetry 导出"
read_when:
  - 你想将 OpenClaw 的模型使用情况、消息流或会话指标发送到 OpenTelemetry 收集器
  - 你正在将 traces、metrics 或 logs 接入 Grafana、Datadog、Honeycomb、New Relic、Tempo 或其他 OTLP 后端
  - 你需要精确的指标名称、span 名称或属性形状来构建仪表盘或告警
---

OpenClaw 通过官方 `diagnostics-otel` 插件使用 **OTLP/HTTP (protobuf)** 导出诊断信息。日志也可以作为 stdout JSONL 写入，用于容器和沙箱日志管道。任何接受 OTLP/HTTP 的收集器或后端都无需代码更改即可使用。如需本地文件日志，请参阅
[日志](/logging)。

- **诊断事件** 是结构化的、进程内记录，由 Gateway 和捆绑的插件在模型运行、消息流、会话、队列和 exec 过程中发出。
- **`diagnostics-otel`** 订阅这些事件，并通过 OTLP/HTTP 将它们导出为 OpenTelemetry **metrics**、**traces** 和 **logs**，还可以将日志记录镜像到 stdout JSONL。
- **Provider 调用** 在 provider 传输支持自定义头时，会从 OpenClaw 受信任的模型调用 span 上下文接收 W3C `traceparent` 头。插件发出的 trace 上下文不会被传播。
- 只有当诊断表面和插件都启用时，导出器才会附加，因此默认情况下进程内开销几乎为零。

## 快速开始

```bash
openclaw plugins install clawhub:@openclaw/diagnostics-otel
```

```json5
{
  plugins: {
    allow: ["diagnostics-otel"],
    entries: {
      "diagnostics-otel": { enabled: true },
    },
  },
  diagnostics: {
    enabled: true,
    otel: {
      enabled: true,
      endpoint: "http://otel-collector:4318",
      protocol: "http/protobuf",
      serviceName: "openclaw-gateway",
      traces: true,
      metrics: true,
      logs: true,
      sampleRate: 0.2,
      flushIntervalMs: 60000,
    },
  },
}
```

或者通过 CLI 启用该插件：`openclaw plugins enable diagnostics-otel`。

<Note>
`protocol` 仅支持 `http/protobuf`。由于 `traces` 和 `metrics` 默认启用，任何其他值（包括 `grpc`）都会以 `unsupported protocol` 警告中止整个 diagnostics-otel 订阅——这也会停止 stdout 日志导出。如果你只想在使用非 OTLP 协议值时启用 `logsExporter: "stdout"`，请显式设置 `traces: false` 和 `metrics: false`。
</Note>

## 导出的信号

| 信号      | 包含内容                                                                                                                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **指标**  | 用于 token 使用量、成本、运行时长、故障切换、技能使用、消息流、Talk 事件、队列通道、会话状态/恢复、工具执行、exec、内存、存活性以及导出器健康状况的计数器/直方图。 |
| **追踪**  | 用于模型使用、模型调用、harness 生命周期、技能使用、工具执行、exec、webhook/消息处理、上下文组装以及工具循环的 spans。                                                      |
| **日志**    | 当启用 `diagnostics.otel.logs` 时，通过 OTLP 导出或 stdout JSONL 导出的结构化 `logging.file` 记录；除非显式启用内容捕获，否则会隐藏日志正文。                          |

可分别切换 `traces`、`metrics` 和 `logs`。当 `diagnostics.otel.enabled` 为 true 时，traces 和 metrics 默认开启；logs 默认关闭，仅在 `diagnostics.otel.logs` 显式设为 `true` 时才导出。日志导出默认使用 OTLP；将 `diagnostics.otel.logsExporter` 设置为 `stdout` 可在 stdout 输出 JSONL，设置为 `both` 则两者都输出。

## 配置参考

```json5
{
  diagnostics: {
    enabled: true,
    otel: {
      enabled: true,
      endpoint: "http://otel-collector:4318",
      tracesEndpoint: "http://otel-collector:4318/v1/traces",
      metricsEndpoint: "http://otel-collector:4318/v1/metrics",
      logsEndpoint: "http://otel-collector:4318/v1/logs",
      protocol: "http/protobuf", // grpc disables OTLP 导出
      serviceName: "openclaw-gateway", // 若未设置，则回退到 OTEL_SERVICE_NAME，然后是 "openclaw"
      headers: { "x-collector-token": "..." },
      traces: true,
      metrics: true,
      logs: true,
      logsExporter: "otlp", // otlp | stdout | both
      sampleRate: 0.2, // 根 span 采样器，0.0..1.0
      flushIntervalMs: 60000, // 指标导出间隔（最小 1000ms）
      captureContent: {
        enabled: false,
        inputMessages: false,
        outputMessages: false,
        toolInputs: false,
        toolOutputs: false,
        systemPrompt: false,
        toolDefinitions: false,
      },
    },
  },
}
```

### 环境变量

| 变量                                                                                                              | 作用                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                                                                                     | 当配置键未设置时，作为 `diagnostics.otel.endpoint` 的回退值。                                                                                                                                                                                                                                             |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` / `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` / `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` | 当匹配的 `diagnostics.otel.*Endpoint` 配置键未设置时，使用按信号区分的端点回退值。按信号区分的配置优先于按信号区分的环境变量，后者优先于共享端点。                                                                                                         |
| `OTEL_SERVICE_NAME`                                                                                               | 当配置键未设置时，作为 `diagnostics.otel.serviceName` 的回退值。默认服务名为 `openclaw`。                                                                                                                                                                                                                |
| `OTEL_EXPORTER_OTLP_PROTOCOL`                                                                                     | 当 `diagnostics.otel.protocol` 未设置时，作为传输协议的回退值。只有 `http/protobuf` 会启用导出。                                                                                                                                                                                                          |
| `OTEL_SEMCONV_STABILITY_OPT_IN`                                                                                   | 设置为 `gen_ai_latest_experimental` 可发出最新的 GenAI 推理 span 形态：span 名称为 `{gen_ai.operation.name} {gen_ai.request.model}`，span kind 为 `CLIENT`，并使用 `gen_ai.provider.name` 代替旧的 `gen_ai.system`。无论如何，GenAI 指标始终使用有界、低基数属性。 |
| `OPENCLAW_OTEL_PRELOADED`                                                                                         | 当其他 preload 或宿主进程已经注册了全局 OpenTelemetry SDK 时，设置为 `1`。此时插件会跳过自身的 NodeSDK 生命周期，但仍会挂接诊断监听器并遵循 `traces`/`metrics`/`logs`。                                                                                    |

## 隐私与内容捕获

默认情况下，原始模型/工具内容**不会**导出。Span 仅携带有界识别信息（通道、提供方、模型、错误类别、仅哈希的请求 ID、工具来源、工具所有者、技能名称/来源），绝不会包含提示文本、响应文本、工具输入、工具输出、技能文件路径或会话密钥。看起来像作用域代理会话密钥的值（例如以 `agent:` 开头）会在低基数属性上被替换为 `unknown`。OTLP 日志记录默认保留严重级别、logger、代码位置、受信任的 trace 上下文以及已清理的属性；只有当 `diagnostics.otel.captureContent` 为布尔值 `true` 时，原始日志消息正文才会被导出。细粒度的 `captureContent.*` 子键永远不会启用日志正文。Talk 指标仅导出有界事件元数据（模式、传输、提供方、事件类型）——不包含转录文本、音频载荷、会话 ID、轮次 ID、通话 ID、房间 ID 或交接令牌。

向外发出的模型请求可能包含一个 W3C `traceparent` 标头，该标头仅根据 OpenClaw 所拥有的、用于当前模型调用的诊断 trace 上下文生成。现有的调用方提供的 `traceparent` 标头会被替换，因此插件或自定义提供方选项无法伪造跨服务的 trace 祖先关系。

仅当你的收集器和保留策略已获批准可处理提示、响应、工具或系统提示文本时，才将 `diagnostics.otel.captureContent.*` 设为 `true`。每个子键彼此独立：

- `inputMessages` - 用户 prompt 内容。
- `outputMessages` - 模型 response 内容。
- `toolInputs` - tool 参数载荷。
- `toolOutputs` - tool 结果载荷。
- `systemPrompt` - 组装后的 system/developer prompt。
- `toolDefinitions` - 模型 tool 名称、描述和 schema。

启用任一子键后，模型和工具 span 只会为该类别获取有界、已脱敏的 `openclaw.content.*` 属性。

<Note>
布尔值 `captureContent: true` 会同时启用 `inputMessages`、`outputMessages`、`toolInputs`、`toolOutputs`、`toolDefinitions` 以及 OTLP 日志正文，但**不会**启用 `systemPrompt`——如果你也需要组装后的 system prompt，请显式设置 `captureContent.systemPrompt: true`。
</Note>

`toolInputs`/`toolOutputs` 内容会被内置 agent 运行时的工具执行捕获（在完成/错误 span 上对应 `openclaw.content.tool_input` 和 `gen_ai.tool.call.arguments`；在完成 span 上对应 `openclaw.content.tool_output` 和 `gen_ai.tool.call.result`）。`openclaw.content.*` 名称仍然是稳定的 OpenClaw 属性名；`gen_ai.tool.call.*` 副本则用于与 semconv 原生查看器保持一致。外部 harness 工具调用（Codex、Claude CLI）会发出不含内容载荷的 `tool.execution.*` span。被捕获的内容会通过受信任的、仅监听的通道传输，绝不会放到公共诊断事件总线上。

## 采样和刷新

- **跟踪：** `diagnostics.otel.sampleRate` 会仅在根 span 上设置 `TraceIdRatioBasedSampler`
  （`0.0` 丢弃全部，`1.0` 保留全部）。未设置时使用 OpenTelemetry SDK 默认值（始终开启）。
- **指标：** `diagnostics.otel.flushIntervalMs`（最小值会被限制为
  `1000`）；未设置时使用 SDK 的周期导出默认值。
- **日志：** OTLP 日志会遵循 `logging.level`（文件日志级别），并使用
  诊断日志记录脱敏路径，而不是控制台格式化。高流量部署应优先使用 OTLP collector 的采样/过滤，而不是本地采样。若你的平台
  已经将 stdout/stderr 发送到日志处理器，并且你没有 OTLP 日志
  collector，请设置 `diagnostics.otel.logsExporter: "stdout"`。stdout 记录为每行一个 JSON 对象，包含 `ts`、`signal`、
  `service.name`、严重级别、正文、脱敏后的属性，以及在可用时的受信任 trace
  字段。
- **文件日志关联：** 当日志调用携带有效的诊断 trace 上下文时，JSONL 文件日志会包含顶层的 `traceId`、
  `spanId`、`parentSpanId` 和 `traceFlags`，使日志处理器能够将本地日志行与
  导出的 spans 关联起来。
- **请求关联：** Gateway HTTP 请求和 WebSocket 帧会创建一个内部请求 trace 作用域。该作用域内的日志和诊断事件默认继承请求 trace，而 agent run 和 model-call
  spans 会作为子 span 创建，因此 provider 的 `traceparent` 头会保留在同一条 trace 上。
- **模型调用关联：** `openclaw.model.call` spans 默认包含安全的 prompt
  组件大小，并在 provider 结果暴露 usage 时包含每次调用的 token 属性。`openclaw.model.usage` 仍然是用于汇总成本、上下文和 channel 仪表板的 run 级
  计费 span，并且当发出它的运行时具有受信任的 trace 上下文时，会保持在同一条诊断 trace 上。

## 已导出的指标

### 模型使用

- `openclaw.tokens` (计数器，属性：`openclaw.token`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`, `openclaw.agent`)
- `openclaw.cost.usd` (计数器，属性：`openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.run.duration_ms` (直方图，属性：`openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.context.tokens` (直方图，属性：`openclaw.context`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `gen_ai.client.token.usage` (直方图，GenAI 语义约定指标，属性：`gen_ai.token.type` = `input`/`output`, `gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.request.model`)
- `gen_ai.client.operation.duration` (直方图，秒，GenAI 语义约定指标，属性：`gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.request.model`, 可选 `error.type`)
- `openclaw.model_call.duration_ms` (直方图，属性：`openclaw.provider`, `openclaw.model`, `openclaw.api`, `openclaw.transport`，以及在分类错误上添加的 `openclaw.errorCategory` 和 `openclaw.failureKind`)
- `openclaw.model_call.request_bytes` (直方图，最终模型请求负载的 UTF-8 字节大小；不包含原始负载内容)
- `openclaw.model_call.response_bytes` (直方图，流式响应分块负载的 UTF-8 字节大小；高频文本、思考和工具调用增量仅按新增的 `delta` 字节计数；不包含原始响应内容)
- `openclaw.model_call.time_to_first_byte_ms` (直方图，首个流式响应事件之前的耗时)
- `openclaw.model.failover` (计数器，属性：`openclaw.provider`, `openclaw.model`, `openclaw.failover.to_provider`, `openclaw.failover.to_model`, `openclaw.failover.reason`, `openclaw.failover.suspended`, `openclaw.lane`)
- `openclaw.skill.used` (计数器，属性：`openclaw.skill.name`, `openclaw.skill.source`, `openclaw.skill.activation`, 可选 `openclaw.agent`, 可选 `openclaw.toolName`)

### 消息流

- `openclaw.webhook.received` (计数器，属性：`openclaw.channel`, `openclaw.webhook`)
- `openclaw.webhook.error` (计数器，属性：`openclaw.channel`, `openclaw.webhook`)
- `openclaw.webhook.duration_ms` (直方图，属性：`openclaw.channel`, `openclaw.webhook`)
- `openclaw.message.queued` (计数器，属性：`openclaw.channel`, `openclaw.source`)
- `openclaw.message.received` (计数器，属性：`openclaw.channel`, `openclaw.source`)
- `openclaw.message.dispatch.started` (计数器，属性：`openclaw.channel`, `openclaw.source`)
- `openclaw.message.dispatch.completed` (计数器，属性：`openclaw.channel`, `openclaw.outcome`, `openclaw.reason`, `openclaw.source`)
- `openclaw.message.dispatch.duration_ms` (直方图，属性：`openclaw.channel`, `openclaw.outcome`, `openclaw.reason`, `openclaw.source`)
- `openclaw.message.processed` (计数器，属性：`openclaw.channel`, `openclaw.outcome`)
- `openclaw.message.duration_ms` (直方图，属性：`openclaw.channel`, `openclaw.outcome`)
- `openclaw.message.delivery.started` (计数器，属性：`openclaw.channel`, `openclaw.delivery.kind`)
- `openclaw.message.delivery.duration_ms` (直方图，属性：`openclaw.channel`, `openclaw.delivery.kind`, `openclaw.outcome`, `openclaw.errorCategory`)

### Talk

- `openclaw.talk.event`（计数器，属性：`openclaw.talk.event_type`, `openclaw.talk.mode`, `openclaw.talk.transport`, `openclaw.talk.brain`, `openclaw.talk.provider`）
- `openclaw.talk.event.duration_ms`（直方图，属性同 `openclaw.talk.event`；当 Talk 事件报告持续时间时发出）
- `openclaw.talk.audio.bytes`（直方图，属性同 `openclaw.talk.event`；为报告字节长度的 Talk 音频帧事件发出）

### 队列与会话

- `openclaw.queue.lane.enqueue` (计数器，属性：`openclaw.lane`)
- `openclaw.queue.lane.dequeue` (计数器，属性：`openclaw.lane`)
- `openclaw.queue.depth` (直方图，属性：`openclaw.lane` 或 `openclaw.channel=heartbeat`)
- `openclaw.queue.wait_ms` (直方图，属性：`openclaw.lane`)
- `openclaw.session.state` (计数器，属性：`openclaw.state`, `openclaw.reason`)
- `openclaw.session.stuck` (计数器，属性：`openclaw.state`；为可恢复的陈旧会话清理发出)
- `openclaw.session.stuck_age_ms` (直方图，属性：`openclaw.state`；为可恢复的陈旧会话清理发出)
- `openclaw.session.turn.created` (计数器，属性：`openclaw.agent`, `openclaw.channel`, `openclaw.trigger`)
- `openclaw.session.recovery.requested` (计数器，属性：`openclaw.state`, `openclaw.action`, `openclaw.active_work_kind`, `openclaw.reason`)
- `openclaw.session.recovery.completed` (计数器，属性：`openclaw.state`, `openclaw.action`, `openclaw.status`, `openclaw.active_work_kind`, `openclaw.reason`)
- `openclaw.session.recovery.age_ms` (直方图，属性：与对应的恢复计数器相同)
- `openclaw.run.attempt` (计数器，属性：`openclaw.attempt`)

### 会话存活遥测

`diagnostics.stuckSessionWarnMs` 是用于会话存活诊断的无进展年龄阈值。只要 OpenClaw 还能观察到回复、工具、状态、block 或 ACP 运行时进度，`processing` 会话就不会按时间接近此阈值。输入中保持活跃（typing keepalive）不计为进度，因此静默的模型或 harness 仍然可以被检测到。

OpenClaw 按其仍能观察到的工作对会话进行分类：

- `session.long_running`：活动的嵌入式工作、模型调用或工具调用仍在推进。即使归属的模型调用在 `diagnostics.stuckSessionWarnMs` 之后仍保持静默，也会先报告为 long-running，直到 `diagnostics.stuckSessionAbortMs`，因此慢速或非流式模型提供方在可观察到中止前不会看起来像卡住的网关会话。
- `session.stalled`：存在活动工作，但当前运行最近没有报告进度。归属的模型调用会在 `diagnostics.stuckSessionAbortMs` 时或之后从 `session.long_running` 切换为 `session.stalled`；无归属的陈旧模型/工具活动不被视为无害的长期运行工作。最初，卡住的嵌入式运行只进行观察；随后在 `diagnostics.stuckSessionAbortMs` 之后、在没有进度的情况下进入 abort-drain，因此队列中该 lane 后面的 turn 可以恢复。当未设置时，abort 阈值默认为更安全的扩展窗口：至少 5 分钟且为 `diagnostics.stuckSessionWarnMs` 的 3 倍。
- `session.stuck`：没有活动工作的陈旧会话清理，或处于空闲队列中的会话且存在陈旧的无归属模型/工具活动。恢复门通过后，这会立即释放受影响的会话 lane。

恢复会发出结构化的 `session.recovery.requested` 和 `session.recovery.completed` 事件。只有在变更型恢复结果（`aborted` 或 `released`）之后，且仅当相同的处理代次仍然是当前代次时，诊断会话状态才会标记为空闲。

只有 `session.stuck` 会发出 `openclaw.session.stuck` 计数器、`openclaw.session.stuck_age_ms` 直方图以及 `openclaw.session.stuck` span。只要会话保持不变，重复的 `session.stuck` 诊断就会退避，因此仪表板应监控持续增长，而不是每次 heartbeat tick 都告警。配置开关和默认值请参见 [Configuration reference](/gateway/configuration-reference#diagnostics)。

Liveness 警告也会发出：

- `openclaw.liveness.warning` (计数器，属性：`openclaw.liveness.reason`)
- `openclaw.liveness.event_loop_delay_p99_ms` (直方图，属性：`openclaw.liveness.reason`)
- `openclaw.liveness.event_loop_delay_max_ms` (直方图，属性：`openclaw.liveness.reason`)
- `openclaw.liveness.event_loop_utilization` (直方图，属性：`openclaw.liveness.reason`)
- `openclaw.liveness.cpu_core_ratio` (直方图，属性：`openclaw.liveness.reason`)

### Harness 生命周期

- `openclaw.harness.duration_ms`（直方图，属性：`openclaw.harness.id`, `openclaw.harness.plugin`, `openclaw.outcome`, `openclaw.harness.phase`（在错误时））

### Tool 执行与循环检测

- `openclaw.tool.execution.duration_ms` (直方图，属性：`gen_ai.tool.name`, `openclaw.toolName`, `openclaw.tool.source`, `openclaw.tool.owner`, `openclaw.tool.params.kind`，以及错误时的 `openclaw.errorCategory`)
- `openclaw.tool.execution.blocked` (计数器，属性：`gen_ai.tool.name`, `openclaw.toolName`, `openclaw.tool.source`, `openclaw.tool.owner`, `openclaw.tool.params.kind`, `openclaw.deniedReason`)
- `openclaw.tool.loop` (计数器，属性：`openclaw.toolName`, `openclaw.loop.level`, `openclaw.loop.action`, `openclaw.loop.detector`, `openclaw.loop.count`, 可选 `openclaw.loop.paired_tool`；当检测到重复的工具调用循环时发出)

### Exec

- `openclaw.exec.duration_ms`（直方图，属性：`openclaw.exec.target`, `openclaw.exec.mode`, `openclaw.outcome`, `openclaw.failureKind`）

### 诊断内部项（内存、负载、导出器健康）

- `openclaw.payload.large` (计数器，属性：`openclaw.payload.surface`, `openclaw.payload.action`, `openclaw.channel`, `openclaw.plugin`, `openclaw.reason`)
- `openclaw.payload.large_bytes` (直方图，属性同 `openclaw.payload.large`)
- `openclaw.memory.rss_bytes` / `openclaw.memory.heap_used_bytes` / `openclaw.memory.heap_total_bytes` / `openclaw.memory.external_bytes` / `openclaw.memory.array_buffers_bytes` (直方图，无属性；进程内存采样)
- `openclaw.memory.pressure` (计数器，属性：`openclaw.memory.level`, `openclaw.memory.reason`)
- `openclaw.diagnostic.async_queue.dropped` (计数器，属性：`openclaw.diagnostic.async_queue.drop_class`；内部诊断队列背压丢弃)
- `openclaw.telemetry.exporter.events` (计数器，属性：`openclaw.exporter`, `openclaw.signal`, `openclaw.status`, 可选 `openclaw.reason`, 可选 `openclaw.errorCategory`；导出器生命周期/失败自遥测)

## 导出的 spans

- `openclaw.model.usage`
  - `openclaw.channel`, `openclaw.provider`, `openclaw.model`
  - `openclaw.tokens.*`（输入/输出/缓存读取/缓存写入/总计）
  - 默认使用 `gen_ai.system`，或者在启用最新 GenAI 语义约定时使用 `gen_ai.provider.name`
  - `gen_ai.request.model`, `gen_ai.operation.name`, `gen_ai.usage.*`
- `openclaw.run`
  - `openclaw.outcome`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`, `openclaw.errorCategory`
- `openclaw.model.call`
  - 默认使用 `gen_ai.system`，或者在启用最新 GenAI 语义约定时使用 `gen_ai.provider.name`
  - `gen_ai.request.model`, `gen_ai.operation.name`, `openclaw.provider`, `openclaw.model`, `openclaw.api`, `openclaw.transport`
  - `openclaw.errorCategory`, `error.type`，以及错误时可选的 `openclaw.failureKind`
  - `openclaw.model_call.request_bytes`, `openclaw.model_call.response_bytes`, `openclaw.model_call.time_to_first_byte_ms`
  - `openclaw.model_call.prompt.input_messages_count`, `openclaw.model_call.prompt.input_messages_chars`, `openclaw.model_call.prompt.system_prompt_chars`, `openclaw.model_call.prompt.tool_definitions_count`, `openclaw.model_call.prompt.tool_definitions_chars`, `openclaw.model_call.prompt.total_chars`（仅安全的组件大小，不包含提示词文本）
  - 当模型调用结果携带该次调用的提供方使用量时，使用 `openclaw.model_call.usage.*` 和 `gen_ai.usage.*`
  - 当上游提供方结果暴露请求 ID 时，带有属性 `openclaw.upstreamRequestIdHash`（有界、基于哈希）的 Span 事件 `openclaw.provider.request`；原始 ID 永不导出
  - 使用 `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental` 时，model-call spans 采用最新 GenAI 推理 span 名称 `{gen_ai.operation.name} {gen_ai.request.model}`，并使用 `CLIENT` span kind，而不是 `openclaw.model.call`。
- `openclaw.harness.run`
  - `openclaw.harness.id`, `openclaw.harness.plugin`, `openclaw.outcome`, `openclaw.provider`, `openclaw.model`, `openclaw.channel`
  - 完成时：`openclaw.harness.result_classification`, `openclaw.harness.yield_detected`, `openclaw.harness.items.started`, `openclaw.harness.items.completed`, `openclaw.harness.items.active`
  - 出错时：`openclaw.harness.phase`, `openclaw.errorCategory`, 可选的 `openclaw.harness.cleanup_failed`
- `openclaw.tool.execution`
  - `gen_ai.tool.name`, `gen_ai.operation.name` (`execute_tool`), `openclaw.toolName`, `openclaw.tool.source`, 可选的 `gen_ai.tool.call.id`, `openclaw.tool.owner`, `openclaw.tool.params.*`
  - 错误时可选的 `openclaw.errorCategory`/`openclaw.errorCode`，当因策略或沙箱被拒绝时使用 `openclaw.deniedReason` 和 `openclaw.outcome=blocked`
- `openclaw.exec`
  - `openclaw.exec.target`, `openclaw.exec.mode`, `openclaw.outcome`, `openclaw.failureKind`, `openclaw.exec.command_length`, `openclaw.exec.exit_code`, `openclaw.exec.exit_signal`, `openclaw.exec.timed_out`
- `openclaw.webhook.processed`
  - `openclaw.channel`, `openclaw.webhook`
- `openclaw.webhook.error`
  - `openclaw.channel`, `openclaw.webhook`, `openclaw.error`
- `openclaw.message.processed`
  - `openclaw.channel`, `openclaw.outcome`, `openclaw.reason`
- `openclaw.message.delivery`
  - `openclaw.channel`, `openclaw.delivery.kind`, `openclaw.outcome`, `openclaw.errorCategory`, `openclaw.delivery.result_count`
- `openclaw.session.stuck`
  - `openclaw.state`, `openclaw.ageMs`, `openclaw.queueDepth`
- `openclaw.context.assembled`
  - `openclaw.prompt.size`, `openclaw.history.size`, `openclaw.context.tokens`, `openclaw.errorCategory`（不包含提示词、历史、响应或 session-key 内容）
- `openclaw.tool.loop`
  - `openclaw.toolName`, `openclaw.loop.level`, `openclaw.loop.action`, `openclaw.loop.detector`, `openclaw.loop.count`, 可选的 `openclaw.loop.paired_tool`（不包含循环消息、参数或工具输出）
- `openclaw.memory.pressure`
  - `openclaw.memory.level`, `openclaw.memory.reason`, `openclaw.memory.rss_bytes`, `openclaw.memory.heap_used_bytes`, `openclaw.memory.heap_total_bytes`, `openclaw.memory.external_bytes`, `openclaw.memory.array_buffers_bytes`, 可选的 `openclaw.memory.threshold_bytes`/`openclaw.memory.rss_growth_bytes`/`openclaw.memory.window_ms`

当显式启用内容捕获时，模型和工具 spans 还可以包含针对你选择启用的特定内容类别的、受限且已脱敏的 `openclaw.content.*` 属性。

## 诊断事件目录

以下事件支撑上述指标和跨度。插件也可以直接订阅它们，而无需 OTLP 导出。

**模型使用**

- `model.usage` - tokens、成本、持续时间、上下文、提供方/模型/通道，
  会话 ID。`usage` 是提供方/轮次层面的计费与遥测统计；
  `context.used` 是当前提示/上下文快照，在涉及缓存输入或工具循环调用时，
  可能低于提供方的 `usage.total`。

**消息流转**

- `webhook.received` / `webhook.processed` / `webhook.error`
- `message.queued` / `message.processed`
- `message.delivery.started` / `message.delivery.completed` / `message.delivery.error`

**队列和会话**

- `queue.lane.enqueue` / `queue.lane.dequeue`
- `session.state` / `session.long_running` / `session.stalled` / `session.stuck`
- `run.attempt` / `run.progress`
- `diagnostic.heartbeat`（聚合计数器：webhooks/queue/session）

**Harness 生命周期**

- `harness.run.started` / `harness.run.completed` / `harness.run.error` -
  每次运行的 agent harness 生命周期。包括 `harnessId`、可选的
  `pluginId`、提供方/模型/通道，以及运行 id。完成时会增加
  `durationMs`、`outcome`、可选的 `resultClassification`、`yieldDetected`，
  以及 `itemLifecycle` 计数。出错时会增加 `phase`
  （`prepare`/`start`/`send`/`resolve`/`cleanup`）、`errorCategory`，以及
  可选的 `cleanupFailed`。

**Exec**

- `exec.process.completed` - 最终结果、持续时间、目标、模式、退出
  码，以及失败类型。命令文本和工作目录不包括在内。
- `exec.approval.followup.suppressed` - 会话回弹后丢弃过期的审批跟进。
  包括 `approvalId`、`reason`
  （`session_rebound`）、`phase`（`direct_delivery` 或 `gateway_preflight`），
  以及调度器时间戳。不包括会话键、路由和命令文本。

## 不使用导出器

在不运行 `diagnostics-otel` 的情况下，让诊断事件仍可供插件或自定义接收器使用：

```json5
{
  diagnostics: { enabled: true },
}
```

如果需要有针对性的调试输出而不提升 `logging.level`，请使用诊断标志。标志不区分大小写，并支持通配符（`telegram.*` 或 `*`）：

```json5
{
  diagnostics: { flags: ["telegram.http"] },
}
```

或者作为一次性的环境变量覆盖：

```bash
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload openclaw gateway
```

标志输出会进入标准日志文件（`logging.file`），并且仍然会被 `logging.redactSensitive` 脱敏。完整指南：
[诊断标志](/diagnostics/flags)。

## 禁用

```json5
{
  diagnostics: { otel: { enabled: false } },
}
```

或者将 `diagnostics-otel` 从 `plugins.allow` 中移除，或者运行
`openclaw plugins disable diagnostics-otel`。

## 相关内容

- [日志记录](/logging) - 文件日志、控制台输出、CLI 尾随，以及 Control UI 的日志选项卡
- [网关日志内部机制](/gateway/logging) - WS 日志样式、子系统前缀和控制台捕获
- [诊断标志](/diagnostics/flags) - 定向调试日志标志
- [诊断导出](/gateway/diagnostics) - 运维支持包工具（独立于 OTEL 导出）
- [配置参考](/gateway/configuration-reference#diagnostics) - 完整的 `diagnostics.*` 字段参考
