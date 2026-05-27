---
summary: "通过 diagnostics-otel 插件将 OpenClaw 诊断导出到任意 OpenTelemetry 收集器（OTLP/HTTP）"
title: "OpenTelemetry 导出"
read_when:
  - 你想将 OpenClaw 的模型使用情况、消息流或会话指标发送到 OpenTelemetry 收集器
  - 你正在将 traces、metrics 或 logs 接入 Grafana、Datadog、Honeycomb、New Relic、Tempo 或其他 OTLP 后端
  - 你需要精确的指标名称、span 名称或属性形状来构建仪表盘或告警
---

OpenClaw 通过官方 `diagnostics-otel` 插件使用 **OTLP/HTTP (protobuf)** 导出诊断。任何接受 OTLP/HTTP 的收集器或后端都无需代码更改即可使用。关于本地文件日志及其读取方式，请参阅 [日志](/logging)。

## 工作原理

- **诊断事件** 是 Gateway 和内置插件在模型运行、消息流、会话、队列和 exec 过程中发出的结构化进程内记录。
- **`diagnostics-otel` 插件** 订阅这些事件，并通过 OTLP/HTTP 将它们导出为 OpenTelemetry 的 **指标**、**链路** 和 **日志**。
- **Provider 调用** 在 provider 传输支持自定义 header 时，会从 OpenClaw 受信任的模型调用 span 上下文接收 W3C `traceparent` header。插件发出的 trace 上下文不会被传播。
- 只有当诊断面和插件都启用时，导出器才会挂载，因此默认情况下进程内开销几乎为零。

## 快速开始

对于打包安装，请先安装插件：

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

你也可以通过 CLI 启用该插件：

```bash
openclaw plugins enable diagnostics-otel
```

<Note>
`protocol` 目前仅支持 `http/protobuf`。`grpc` 会被忽略。
</Note>

## 导出的信号

| 信号        | 内容                                                                                                                                                                                                           |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **指标**    | 用于 token 使用量、成本、运行时长、故障切换、技能使用、消息流、Talk 事件、队列 lane、会话状态/恢复、工具执行、超大载荷、exec 和内存压力的计数器与直方图。                                                         |
| **链路**    | 用于模型使用、模型调用、harness 生命周期、技能使用、工具执行、exec、webhook/消息处理、上下文组装和工具循环的 spans。                                                                                        |
| **日志**    | 当启用 `diagnostics.otel.logs` 时，通过 OTLP 导出的结构化 `logging.file` 记录；除非显式启用内容捕获，否则会省略日志正文。                                                                                       |

`traces`、`metrics` 和 `logs` 可独立切换。当 `diagnostics.otel.enabled` 为 true 时，traces 和 metrics 默认开启。logs 默认关闭，只有当 `diagnostics.otel.logs` 显式为 `true` 时才会导出。

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
      protocol: "http/protobuf", // grpc 会被忽略
      serviceName: "openclaw-gateway",
      headers: { "x-collector-token": "..." },
      traces: true,
      metrics: true,
      logs: true,
      sampleRate: 0.2, // root-span 采样器，0.0 丢弃全部，1.0 保留全部
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

| 变量                                                                                                              | 作用                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                                                                                     | 覆盖 `diagnostics.otel.endpoint`。如果该值已包含 `/v1/traces`、`/v1/metrics` 或 `/v1/logs`，则按原样使用。                                                                                                                                                                                                                                   |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` / `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` / `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` | 当对应的 `diagnostics.otel.*Endpoint` 配置项未设置时，用于按信号覆盖端点。按信号的配置优先于按信号的环境变量，后者优先于共享端点。                                                                                                                                                                                                         |
| `OTEL_SERVICE_NAME`                                                                                               | 覆盖 `diagnostics.otel.serviceName`。                                                                                                                                                                                                                                                                                                        |
| `OTEL_EXPORTER_OTLP_PROTOCOL`                                                                                     | 覆盖传输协议（目前仅支持 `http/protobuf`）。                                                                                                                                                                                                                                                                                               |
| `OTEL_SEMCONV_STABILITY_OPT_IN`                                                                                   | 设为 `gen_ai_latest_experimental` 时，发出最新的实验性 GenAI 推理 span 形状，包括 `{gen_ai.operation.name} {gen_ai.request.model}` 的 span 名称、`CLIENT` span kind，以及 `gen_ai.provider.name`，而不是旧版的 `gen_ai.system`。无论如何，GenAI 指标始终使用有界、低基数的语义属性。 |
| `OPENCLAW_OTEL_PRELOADED`                                                                                         | 当其他 preload 或宿主进程已经注册了全局 OpenTelemetry SDK 时，设为 `1`。此时插件会跳过自身的 NodeSDK 生命周期，但仍会接线诊断监听器并遵循 `traces`/`metrics`/`logs`。                                                                                                                              |

## 隐私与内容捕获

原始模型/工具内容默认**不会**导出。span 仅携带有界标识符（channel、provider、model、error category、仅哈希的 request id、tool source、tool owner 和 skill name/source），绝不会包含 prompt 文本、response 文本、tool inputs、tool outputs、skill 文件路径或 session keys。OTLP 日志记录默认保留严重级别、logger、代码位置、受信任的 trace 上下文和已清理的属性，但只有在 `diagnostics.otel.captureContent` 设置为布尔值 `true` 时，才会导出原始日志消息正文。粒度更细的 `captureContent.*` 子键不会启用日志正文。看起来像 scoped agent session keys 的标签会被替换为 `unknown`。
Talk 指标仅导出受限的事件元数据，例如模式、传输、provider 和事件类型。它们不包含 transcript、音频载荷、session ids、turn ids、call ids、room ids 或 handoff tokens。

出站模型请求可能会包含 W3C `traceparent` header。该 header 仅由当前模型调用的、属于 OpenClaw 的诊断 trace 上下文生成。已有的、由调用方提供的 `traceparent` headers 会被替换，因此插件或自定义 provider 选项无法伪造跨服务的 trace 祖先关系。

只有当你的收集器和保留策略已批准 prompt、response、tool 或 system-prompt 文本时，才将 `diagnostics.otel.captureContent.*` 设为 `true`。每个子键都可独立启用：

- `inputMessages` - 用户 prompt 内容。
- `outputMessages` - 模型 response 内容。
- `toolInputs` - tool 参数载荷。
- `toolOutputs` - tool 结果载荷。
- `systemPrompt` - 组装后的 system/developer prompt。
- `toolDefinitions` - 模型 tool 名称、描述和 schema。

当启用任意子键时，模型和工具 span 会仅针对该类别获得有界、脱敏的 `openclaw.content.*` 属性。仅在需要进行广泛诊断采集且 OTLP 日志消息正文也已获准导出时，才使用布尔值 `captureContent: true`。

## 采样与刷新

- **Traces：** `diagnostics.otel.sampleRate`（仅 root-span，`0.0` 表示全部丢弃，
  `1.0` 表示全部保留）。
- **Metrics：** `diagnostics.otel.flushIntervalMs`（最小值 `1000`）。
- **Logs：** OTLP logs 会遵循 `logging.level`（文件日志级别）。它们使用诊断 log-record 脱敏路径，而不是控制台格式化。高流量部署应优先使用 OTLP 收集器的采样/过滤，而不是本地采样。
- **文件日志关联：** 当日志调用携带有效的诊断 trace 上下文时，JSONL 文件日志会包含顶层的 `traceId`、`spanId`、`parentSpanId` 和 `traceFlags`，这使得日志处理器可以将本地日志行与已导出的 spans 关联起来。
- **请求关联：** Gateway HTTP 请求和 WebSocket 帧会创建一个内部请求 trace 作用域。该作用域内的日志和诊断事件默认继承请求 trace，而 agent run 和 model-call spans 会作为子 span 创建，以便 provider 的 `traceparent` headers 保持在同一条 trace 上。

## 已导出的指标

### 模型使用

- `openclaw.tokens` (counter, attrs: `openclaw.token`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`, `openclaw.agent`)
- `openclaw.cost.usd` (counter, attrs: `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.run.duration_ms` (histogram, attrs: `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.context.tokens` (histogram, attrs: `openclaw.context`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `gen_ai.client.token.usage` (histogram, GenAI semantic-conventions metric, attrs: `gen_ai.token.type` = `input`/`output`, `gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.request.model`)
- `gen_ai.client.operation.duration` (histogram, seconds, GenAI semantic-conventions metric, attrs: `gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.request.model`, optional `error.type`)
- `openclaw.model_call.duration_ms` (histogram, attrs: `openclaw.provider`, `openclaw.model`, `openclaw.api`, `openclaw.transport`, plus `openclaw.errorCategory` and `openclaw.failureKind` on classified errors)
- `openclaw.model_call.request_bytes` (histogram, final model request payload 的 UTF-8 字节大小；不包含原始载荷内容)
- `openclaw.model_call.response_bytes` (histogram, streamed model response events 的 UTF-8 字节大小；不包含原始 response 内容)
- `openclaw.model_call.time_to_first_byte_ms` (histogram, 第一条流式 response 事件到来前的耗时)
- `openclaw.model.failover` (counter, attrs: `openclaw.provider`, `openclaw.model`, `openclaw.failover.to_provider`, `openclaw.failover.to_model`, `openclaw.failover.reason`, `openclaw.failover.suspended`, `openclaw.lane`)
- `openclaw.skill.used` (counter, attrs: `openclaw.skill.name`, `openclaw.skill.source`, `openclaw.skill.activation`, optional `openclaw.agent`, optional `openclaw.toolName`)

### 消息流

- `openclaw.webhook.received` (counter, attrs: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.webhook.error` (counter, attrs: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.webhook.duration_ms` (histogram, attrs: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.message.queued` (counter, attrs: `openclaw.channel`, `openclaw.source`)
- `openclaw.message.received` (counter, attrs: `openclaw.channel`, `openclaw.source`)
- `openclaw.message.dispatch.started` (counter, attrs: `openclaw.channel`, `openclaw.source`)
- `openclaw.message.dispatch.completed` (counter, attrs: `openclaw.channel`, `openclaw.outcome`, `openclaw.reason`, `openclaw.source`)
- `openclaw.message.dispatch.duration_ms` (histogram, attrs: `openclaw.channel`, `openclaw.outcome`, `openclaw.reason`, `openclaw.source`)
- `openclaw.message.processed` (counter, attrs: `openclaw.channel`, `openclaw.outcome`)
- `openclaw.message.duration_ms` (histogram, attrs: `openclaw.channel`, `openclaw.outcome`)
- `openclaw.message.delivery.started` (counter, attrs: `openclaw.channel`, `openclaw.delivery.kind`)
- `openclaw.message.delivery.duration_ms` (histogram, attrs: `openclaw.channel`, `openclaw.delivery.kind`, `openclaw.outcome`, `openclaw.errorCategory`)

### Talk

- `openclaw.talk.event`（计数器，属性：`openclaw.talk.event_type`, `openclaw.talk.mode`, `openclaw.talk.transport`, `openclaw.talk.brain`, `openclaw.talk.provider`）
- `openclaw.talk.event.duration_ms`（直方图，属性同 `openclaw.talk.event`；当 Talk 事件报告持续时间时发出）
- `openclaw.talk.audio.bytes`（直方图，属性同 `openclaw.talk.event`；为报告字节长度的 Talk 音频帧事件发出）

### 队列与会话

- `openclaw.queue.lane.enqueue` (counter, attrs: `openclaw.lane`)
- `openclaw.queue.lane.dequeue` (counter, attrs: `openclaw.lane`)
- `openclaw.queue.depth` (histogram, attrs: `openclaw.lane` or `openclaw.channel=heartbeat`)
- `openclaw.queue.wait_ms` (histogram, attrs: `openclaw.lane`)
- `openclaw.session.state` (counter, attrs: `openclaw.state`, `openclaw.reason`)
- `openclaw.session.stuck` (counter, attrs: `openclaw.state`; emitted only for stale session bookkeeping with no active work)
- `openclaw.session.stuck_age_ms` (histogram, attrs: `openclaw.state`; emitted only for stale session bookkeeping with no active work)
- `openclaw.session.turn.created` (counter, attrs: `openclaw.agent`, `openclaw.channel`, `openclaw.trigger`)
- `openclaw.session.recovery.requested` (counter, attrs: `openclaw.state`, `openclaw.action`, `openclaw.active_work_kind`, `openclaw.reason`)
- `openclaw.session.recovery.completed` (counter, attrs: `openclaw.state`, `openclaw.action`, `openclaw.status`, `openclaw.active_work_kind`, `openclaw.reason`)
- `openclaw.session.recovery.age_ms` (histogram, attrs: same as the matching recovery counter)
- `openclaw.run.attempt` (counter, attrs: `openclaw.attempt`)

### 会话存活遥测

`diagnostics.stuckSessionWarnMs` 是会话存活诊断的无进展时间阈值。当 OpenClaw 观察到回复、工具、状态、块或 ACP 运行时进展时，`processing` 会话不会向该阈值增长。打字保活不计为进展，因此静默的模型或 harness 仍然可以被检测到。

OpenClaw 按其仍能观察到的工作对会话进行分类：

- `session.long_running`: 活跃的嵌入式工作、模型调用或工具调用仍在推进。
- `session.stalled`: 存在活跃工作，但当前运行尚未报告最近进展。
  停滞的嵌入式运行起初仅观察不干预，随后在 `diagnostics.stuckSessionAbortMs` 之后执行 abort-drain，以便该 lane 后面的排队轮次可以继续。若未设置，中止阈值默认采用更安全的扩展窗口：至少 5 分钟且为
  `diagnostics.stuckSessionWarnMs` 的 3 倍。
- `session.stuck`: 没有活跃工作的陈旧会话记账项。这会立即释放
  受影响的会话 lane。

恢复会发出结构化的 `session.recovery.requested` 和 `session.recovery.completed` 事件。诊断会话状态只有在发生会改变状态的恢复结果（`aborted` 或 `released`）之后，并且仅当相同的处理 generation 仍然是当前时，才会被标记为空闲。

只有 `session.stuck` 会发出 `openclaw.session.stuck` 计数器、`openclaw.session.stuck_age_ms` 直方图和 `openclaw.session.stuck` span。只要会话保持不变，重复的 `session.stuck` 诊断就会退避，因此仪表盘应关注持续增长而不是每个 heartbeat tick。关于配置项和默认值，请参阅
[配置参考](/gateway/configuration-reference#diagnostics)。

Liveness warnings 也会发出：

- `openclaw.liveness.warning` (counter, attrs: `openclaw.liveness.reason`)
- `openclaw.liveness.event_loop_delay_p99_ms` (histogram, attrs: `openclaw.liveness.reason`)
- `openclaw.liveness.event_loop_delay_max_ms` (histogram, attrs: `openclaw.liveness.reason`)
- `openclaw.liveness.event_loop_utilization` (histogram, attrs: `openclaw.liveness.reason`)
- `openclaw.liveness.cpu_core_ratio` (histogram, attrs: `openclaw.liveness.reason`)

### Harness 生命周期

- `openclaw.harness.duration_ms`（直方图，属性：`openclaw.harness.id`, `openclaw.harness.plugin`, `openclaw.outcome`, `openclaw.harness.phase`（在错误时））

### 工具执行

- `openclaw.tool.execution.duration_ms` (histogram, attrs: `gen_ai.tool.name`, `openclaw.toolName`, `openclaw.tool.source`, `openclaw.tool.owner`, `openclaw.tool.params.kind`, plus `openclaw.errorCategory` on errors)
- `openclaw.tool.execution.blocked` (counter, attrs: `gen_ai.tool.name`, `openclaw.toolName`, `openclaw.tool.source`, `openclaw.tool.owner`, `openclaw.tool.params.kind`, `openclaw.deniedReason`)

### Exec

- `openclaw.exec.duration_ms`（直方图，属性：`openclaw.exec.target`, `openclaw.exec.mode`, `openclaw.outcome`, `openclaw.failureKind`）

### 诊断内部项（内存与工具循环）

- `openclaw.payload.large` (counter, attrs: `openclaw.payload.surface`, `openclaw.payload.action`, `openclaw.channel`, `openclaw.plugin`, `openclaw.reason`)
- `openclaw.payload.large_bytes` (histogram, attrs: same as `openclaw.payload.large`)
- `openclaw.memory.heap_used_bytes` (histogram, attrs: `openclaw.memory.kind`)
- `openclaw.memory.rss_bytes` (histogram)
- `openclaw.memory.pressure` (counter, attrs: `openclaw.memory.level`)
- `openclaw.tool.loop.iterations` (counter, attrs: `openclaw.toolName`, `openclaw.outcome`)
- `openclaw.tool.loop.duration_ms` (histogram, attrs: `openclaw.toolName`, `openclaw.outcome`)

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
  - 出错时包含 `openclaw.errorCategory` 和可选的 `openclaw.failureKind`
  - `openclaw.model_call.request_bytes`, `openclaw.model_call.response_bytes`, `openclaw.model_call.time_to_first_byte_ms`
  - `openclaw.provider.request_id_hash`（上游提供方请求 ID 的有界 SHA 哈希；不会导出原始 ID）
  - 当 `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental` 时，model-call spans 使用最新的 GenAI 推理 span 名称 `{gen_ai.operation.name} {gen_ai.request.model}`，并使用 `CLIENT` span kind，而不是 `openclaw.model.call`。
- `openclaw.harness.run`
  - `openclaw.harness.id`, `openclaw.harness.plugin`, `openclaw.outcome`, `openclaw.provider`, `openclaw.model`, `openclaw.channel`
  - 完成时：`openclaw.harness.result_classification`, `openclaw.harness.yield_detected`, `openclaw.harness.items.started`, `openclaw.harness.items.completed`, `openclaw.harness.items.active`
  - 出错时：`openclaw.harness.phase`, `openclaw.errorCategory`, 可选的 `openclaw.harness.cleanup_failed`
- `openclaw.tool.execution`
  - `gen_ai.tool.name`, `openclaw.toolName`, `openclaw.errorCategory`, `openclaw.tool.params.*`
- `openclaw.exec`
  - `openclaw.exec.target`, `openclaw.exec.mode`, `openclaw.outcome`, `openclaw.failureKind`, `openclaw.exec.command_length`, `openclaw.exec.exit_code`, `openclaw.exec.timed_out`
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
  - `openclaw.toolName`, `openclaw.outcome`, `openclaw.iterations`, `openclaw.errorCategory`（不包含循环消息、参数或工具输出）
- `openclaw.memory.pressure`
  - `openclaw.memory.level`, `openclaw.memory.heap_used_bytes`, `openclaw.memory.rss_bytes`

当显式启用内容捕获时，模型和工具 spans 还可以包含针对你选择启用的特定内容类别的、受限且已脱敏的 `openclaw.content.*` 属性。

## 诊断事件目录

下面的事件支撑了上面的指标和 spans。插件也可以直接订阅它们，而无需 OTLP 导出。

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

- `exec.process.completed` - 终态结果、持续时间、目标、模式、退出
  码和失败类型。不包含命令文本和工作目录。

## 不使用导出器

你可以在不运行 `diagnostics-otel` 的情况下，仍然让插件或自定义 sink 获取诊断事件：

```json5
{
  diagnostics: { enabled: true },
}
```

若要在不提高 `logging.level` 的情况下输出有针对性的调试信息，请使用诊断标志。标志不区分大小写，并支持通配符（例如 `telegram.*` 或 `*`）：

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

你也可以将 `diagnostics-otel` 从 `plugins.allow` 中移除，或者运行
`openclaw plugins disable diagnostics-otel`。

## 相关内容

- [日志记录](/logging) - 文件日志、控制台输出、CLI 尾随，以及 Control UI 的日志选项卡
- [网关日志内部机制](/gateway/logging) - WS 日志样式、子系统前缀和控制台捕获
- [诊断标志](/diagnostics/flags) - 定向调试日志标志
- [诊断导出](/gateway/diagnostics) - 运维支持包工具（独立于 OTEL 导出）
- [配置参考](/gateway/configuration-reference#diagnostics) - 完整的 `diagnostics.*` 字段参考
