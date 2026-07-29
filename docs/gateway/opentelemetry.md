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
      sampleRate: 0.2, // root-span sampler, 0.0..1.0
      flushIntervalMs: 60000, // metric export interval (min 1000ms)
      captureContent: false,
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

## Continue an upstream WebSocket trace

An authenticated Gateway WebSocket client can attach a W3C `traceparent` to
each request frame:

```json
{
  "type": "req",
  "id": "eval-item-42",
  "method": "agent",
  "params": {},
  "traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
}
```

The Gateway creates a child request context that preserves the upstream trace
ID and sampling flags. Agent, harness, model-call, and provider spans created
inside the request remain on that trace. This allows a local experiment runner
to create one Langfuse/OpenTelemetry trace per dataset item and correlate the
corresponding OpenClaw execution.

Trace context is request-scoped, not connection-scoped. On a long-lived
WebSocket, generate or inject the appropriate `traceparent` independently for
every RPC. Concurrent requests remain isolated even when their work
interleaves.

The field is accepted only after the existing Gateway authentication handshake
and does not affect authentication or method authorization. A `traceparent` on
the initial `connect` frame is ignored. Missing or syntactically malformed
values within the 128-character field limit silently fall back to a fresh
request trace; longer values make the request frame invalid. `tracestate` and
`baggage` are not accepted by the Gateway WebSocket protocol.

## Privacy and content capture

Raw model/tool content is **not** exported by default. Spans carry bounded
identifiers (channel, provider, model, error category, hash-only request ids,
tool source, tool owner, skill name/source) and never include prompt text,
response text, tool inputs, tool outputs, skill file paths, or session keys.
Values that look like scoped agent session keys (for example starting with
`agent:`) are replaced with `unknown` on low-cardinality attributes. OTLP log
records keep severity, logger, code location, trusted trace context, and
sanitized attributes by default; the raw log message body is exported only
when `diagnostics.otel.captureContent` is `true`. Talk metrics export only
bounded event metadata (mode, transport, provider, event type) - no
transcripts, audio payloads, session ids, turn ids, call ids, room ids, or
handoff tokens.

向外发出的模型请求可能包含一个 W3C `traceparent` 标头，该标头仅根据 OpenClaw 所拥有的、用于当前模型调用的诊断 trace 上下文生成。现有的调用方提供的 `traceparent` 标头会被替换，因此插件或自定义提供方选项无法伪造跨服务的 trace 祖先关系。

Set `diagnostics.otel.captureContent` to `true` only when your collector and
retention policy are approved for prompt, response, tool, and tool-definition
text. This enables bounded, redacted input messages, output messages, tool
inputs, tool outputs, tool definitions, and OTLP log bodies. System prompts
remain excluded.

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

### Model-call observation units

Every `openclaw.model.call` span identifies what its lifecycle measures through
`openclaw.model_call.observation_unit`:

- `request` - one observable model/provider request. Native embedded model
  calls use this unit, and exporters treat a missing value as `request` for
  compatibility with older or external emitters.
- `turn` - one opaque agent CLI turn that may contain hidden model requests,
  retries, tool work, or background work. Claude Code CLI and Codex app-server
  calls use this unit.

Both units remain model-call spans so trace backends can render model input,
output, usage, and hierarchy. Request spans use the API-derived GenAI operation
(`chat`, `generate_content`, or `text_completion`), while turn spans use
`gen_ai.operation.name = invoke_agent`. Both contribute to
`gen_ai.client.operation.duration`, where the operation name keeps direct
request latency separate from full-turn latency. OpenClaw's OTEL model-call
metrics also include `openclaw.model_call.observation_unit`; the Prometheus
model-call metrics expose the equivalent `observation_unit` label.

### Claude Code CLI model-call fidelity

Claude Code CLI turns emit one synthetic, turn-level `openclaw.model.call`
span. These are not Anthropic HTTP request spans. They use `openclaw.api =
claude-code`, `openclaw.model_call.observation_unit = turn`, and identify
the operation as `gen_ai.operation.name = invoke_agent`. They identify
OpenClaw's CLI boundary through
`openclaw.transport`:

- `stdio` - one-shot local Claude Code process.
- `stdio-live` - one turn on a managed persistent Claude stdio session.
- `paired-node-cli` - one-shot Claude Code execution delegated to a paired
  node.

Claude CLI diagnostics are instantiated only while the process diagnostic
dispatcher is enabled and an internal or trusted event listener is attached.
With no observability plugin or other listener active, Claude CLI turns skip
the synthetic trace hierarchy, content buffers, and diagnostic stream-byte
accounting. When content capture is enabled, prompt and system-prompt fields
are capped at 128 KiB each; assistant output is capped at 128 KiB across at
most 200 envelopes, with 16 KiB and one item reserved for a final visible
fallback response. A marker records truncation when the limit is reached.

OpenClaw gives Claude CLI turns the same ownership hierarchy used by other
agent runtimes: `openclaw.harness.run` (`openclaw.harness.id = claude-cli`)
contains `openclaw.run`, which contains the Claude `openclaw.model.call`
span. The harness and run spans are synthetic OpenClaw turn boundaries, not
Claude Code internal phases. One-shot and managed stdio turns use the same
hierarchy; a real fresh-session retry creates another model-call child inside
the same OpenClaw run.

The span starts when OpenClaw admits the prepared CLI turn and ends only after
that turn succeeds or fails. For managed sessions, an interim success result
does not end the span while Claude reports result-holding background agents or
workflows; the final post-drain result does. Abort, timeout, process failure,
output/parse failure, and other turn failures end the same span with an error.

Claude Code reports per-assistant-message usage and may also report cumulative
usage on its terminal result. OpenClaw reply accounting continues to use the
last assistant message so existing cost semantics do not change; the
turn-level model-call span uses terminal cumulative usage when available,
including cache-read and cache-creation tokens.

For these CLI spans, byte and timing fields describe the observable OpenClaw
CLI boundary:

- `openclaw.model_call.request_bytes` is the UTF-8 size of the prompt value
  sent over one-shot stdin/argv, or the managed stdio JSONL user envelope. It
  is not the size of Claude Code's hidden model request.
- `openclaw.model_call.response_bytes` is the UTF-8 size of Claude CLI stdout
  observed during the turn. It is not Anthropic HTTP response size.
- `openclaw.model_call.time_to_first_byte_ms` is time to the first observable
  Claude CLI stdout or stderr output. It is not network TTFB.

With `captureContent` enabled, the span exports the effective prompt OpenClaw
sends to Claude Code and visible assistant text/reasoning/tool-call identity
through `gen_ai.input.messages` and `gen_ai.output.messages`. Tool arguments,
opaque thinking signatures, tool results, and system prompts are omitted from
the Claude assistant envelope. OpenClaw does not
claim access to Claude Code's private system prompt, hidden resumed or
compacted request payload, native internal tool schemas, raw Anthropic HTTP
request, internal retries, upstream request id, or true network TTFB. Because
Claude Code does not expose its effective native tool definitions accurately,
these spans do not populate `gen_ai.tool.definitions`.

External Claude harness tool spans remain metadata-only even when tool content
capture is enabled. As with every model span, captured Claude CLI content uses
the trusted listener-only path and the exporter's existing redaction and size
bounds; content remains off by default.

## Exported metrics

### 模型使用

- `openclaw.tokens` (counter, attrs: `openclaw.token`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`, `openclaw.agent`)
- `openclaw.cost.usd` (counter, attrs: `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.run.duration_ms` (histogram, attrs: `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.context.tokens` (histogram, attrs: `openclaw.context`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `gen_ai.client.token.usage` (histogram, GenAI semantic-conventions metric, attrs: `gen_ai.token.type` = `input`/`output`, `gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.request.model`)
- `gen_ai.client.operation.duration` (histogram, seconds, GenAI semantic-conventions metric for model requests and synthetic agent turns; attrs: `gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.request.model`, optional `error.type`; turn observations use `gen_ai.operation.name = invoke_agent`)
- `openclaw.model_call.duration_ms` (histogram, attrs: `openclaw.provider`, `openclaw.model`, `openclaw.api`, `openclaw.transport`, `openclaw.model_call.observation_unit`, plus `openclaw.errorCategory` and `openclaw.failureKind` on classified errors)
- `openclaw.model_call.request_bytes` (histogram, UTF-8 byte size of the final model request payload; for Claude Code CLI, the observable prompt input/envelope described above; no raw payload content)
- `openclaw.model_call.response_bytes` (histogram, UTF-8 byte size of streamed response chunk payloads; high-frequency text, thinking, and tool-call deltas count only incremental `delta` bytes; for Claude Code CLI, observed stdout bytes; no raw response content)
- `openclaw.model_call.time_to_first_byte_ms` (histogram, elapsed time before the first streamed response event; for Claude Code CLI, first observable CLI output rather than network TTFB)
- `openclaw.model.failover` (counter, attrs: `openclaw.provider`, `openclaw.model`, `openclaw.failover.to_provider`, `openclaw.failover.to_model`, `openclaw.failover.reason`, `openclaw.failover.suspended`, `openclaw.lane`)
- `openclaw.skill.used` (counter, attrs: `openclaw.skill.name`, `openclaw.skill.source`, `openclaw.skill.activation`, optional `openclaw.agent`, optional `openclaw.toolName`)

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

A `processing` session does not age toward the built-in liveness threshold while OpenClaw observes reply, tool, status, block, or ACP runtime progress. Typing keepalives do not count as progress, so a silent model or harness can still be detected.

OpenClaw 按其仍能观察到的工作对会话进行分类：

- `session.long_running`: active embedded work, model calls, or tool calls
  are still making progress. Owned silent model calls also report as long-running before the built-in abort threshold, so slow or non-streaming model providers do not look like stalled gateway sessions while abort-observable.
- `session.stalled`: active work exists, but the active run has not reported
  recent progress. Owned model calls switch from `session.long_running` to
  `session.stalled` at or after the built-in abort threshold; ownerless
  stale model/tool activity is not treated as harmless long-running work.
  Stalled embedded runs stay observe-only at first, then abort-drain after
  the abort threshold with no progress so queued turns behind the lane can resume.
- `session.stuck`: stale session bookkeeping with no active work, or an idle
  queued session with stale ownerless model/tool activity. This releases the
  affected session lane immediately after recovery gates pass.

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
  - `gen_ai.system` by default, or `gen_ai.provider.name` when the latest GenAI semantic conventions are opted in
  - `gen_ai.request.model`, `gen_ai.operation.name`, `openclaw.provider`, `openclaw.model`, `openclaw.api`, `openclaw.transport`, `openclaw.model_call.observation_unit` (`request` or `turn`)
  - `openclaw.errorCategory`, `error.type`, and optional `openclaw.failureKind` on errors
  - `openclaw.model_call.request_bytes`, `openclaw.model_call.response_bytes`, `openclaw.model_call.time_to_first_byte_ms`
  - `openclaw.model_call.prompt.input_messages_count`, `openclaw.model_call.prompt.input_messages_chars`, `openclaw.model_call.prompt.system_prompt_chars`, `openclaw.model_call.prompt.tool_definitions_count`, `openclaw.model_call.prompt.tool_definitions_chars`, `openclaw.model_call.prompt.total_chars` (safe component sizes only, no prompt text)
  - `openclaw.model_call.usage.*` and `gen_ai.usage.*` when the result carries usage for that request or aggregate turn
  - Span event `openclaw.provider.request` with attribute `openclaw.upstreamRequestIdHash` (bounded, hash-based) when the upstream provider result exposes a request id; raw ids are never exported
  - With `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`, request spans use the latest GenAI inference span name `{gen_ai.operation.name} {gen_ai.request.model}`. Turn spans use `invoke_agent` because OpenClaw does not claim a native agent name from the opaque CLI boundary. Both use `CLIENT` span kind instead of `openclaw.model.call`.
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

The events below back the metrics and spans above or are available for direct
plugin subscription. `run.progress` and `run.execution_phase` are direct-only
lifecycle signals; the diagnostics-otel plugin does not export them as
standalone OTLP signals. Event kinds and `run.execution_phase.phase` values are
additive. TypeScript consumers should keep default branches instead of assuming
either union is permanently exhaustive.

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
- `run.execution_phase` (public, session-correlated embedded-runner startup milestones)
- `diagnostic.heartbeat` (aggregate counters: webhooks/queue/session)

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

Flag output goes to the standard log file (`logging.file`) and is still
redacted by the always-on log redaction policy. Full guide:
[Diagnostics flags](/diagnostics/flags).

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
