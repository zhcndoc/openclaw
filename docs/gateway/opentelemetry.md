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

- **诊断事件**是结构化的进程内记录，由 Gateway 和捆绑插件针对模型运行、消息流、会话、队列和执行操作发出。
- **`diagnostics-otel`** 订阅这些事件，并通过 OTLP/HTTP 将其导出为 OpenTelemetry **指标**、**追踪**和**日志**，还可以将日志记录镜像到 stdout JSONL。
- 当提供商传输接受自定义请求头时，**提供商调用**会从实际当前的 OpenTelemetry 模型调用 span 接收 W3C `traceparent` 请求头。诊断 ID 仍是本地关联键，并且不会传播插件发出的追踪上下文。
- 只有在诊断面和插件均启用时，导出器才会挂载，因此默认情况下进程内开销接近于零。

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
`diagnostics.otel.protocol` 仅接受 `http/protobuf`。如果持久化配置（包括通过 `${VAR}` 插值提供的值）解析后仍将此字段设置为已废弃的 `grpc` 值，请运行
[`openclaw doctor --fix`](/cli/doctor)。Doctor 会修复直接编写的值，以及唯一一个拥有顶层 `diagnostics` 部分的内部单文件 include。对于根目录或数组 include、嵌套 include 链、同级覆盖、外部 include 目标，或其他存在歧义的来源，Doctor 会保持文件不变，并列出需要手动编辑的候选源文件。

当未设置 `diagnostics.otel.protocol` 时，每个插件拥有的 OTLP 信号会先检查其非空的 `OTEL_EXPORTER_OTLP_*_PROTOCOL` 值，然后检查
`OTEL_EXPORTER_OTLP_PROTOCOL`，最后默认为 `http/protobuf`。Doctor 不会重写进程环境变量。不受支持的值只会禁用该插件拥有的 OTLP 信号；支持的同级信号仍会继续运行，`logsExporter: "both"` 的 stdout 分支也不例外。预加载的 trace 和 metric SDK 拥有各自的传输选择机制，不会被此插件拒绝。
</Note>

## 导出的信号

| 信号      | 包含内容                                                                                                                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **指标**  | 用于 token 使用量、成本、运行时长、故障切换、技能使用、消息流、Talk 事件、队列通道、会话状态/恢复、工具执行、exec、内存、存活性以及导出器健康状况的计数器/直方图。 |
| **追踪**  | 用于模型使用、模型调用、harness 生命周期、技能使用、工具执行、exec、webhook/消息处理、上下文组装以及工具循环的 spans。                                                      |
| **日志**    | 当启用 `diagnostics.otel.logs` 时，通过 OTLP 导出或 stdout JSONL 导出的结构化 `logging.file` 记录；除非显式启用内容捕获，否则会隐藏日志正文。                          |

可分别切换 `traces`、`metrics` 和 `logs`。当 `diagnostics.otel.enabled` 为 true 时，traces 和 metrics 默认开启；logs 默认关闭，仅在 `diagnostics.otel.logs` 显式设为 `true` 时才导出。日志导出默认使用 OTLP；将 `diagnostics.otel.logsExporter` 设置为 `stdout` 可在 stdout 输出 JSONL，设置为 `both` 则两者都输出。

<Note>
共享的 `endpoint` 和 `OTEL_EXPORTER_OTLP_ENDPOINT` 是所有已启用信号的基础地址。OpenClaw 会将 `/v1/traces`、`/v1/metrics` 或 `/v1/logs` 附加到根路径和自定义收集器路径之后。为了兼容托管前端，如果共享端点已以这些信号路径之一结尾，则会为匹配的信号保留该路径，并为其他信号替换末尾部分。

特定信号的 `tracesEndpoint`、`metricsEndpoint` 和 `logsEndpoint` 设置，以及与之匹配的 `OTEL_EXPORTER_OTLP_*_ENDPOINT` 回退设置，会作为精确 URL 传递给导出器。OpenClaw 不会附加或重写它们的路径。
</Note>

## 哪些进程会导出

- **Gateway** 会在启动时启动导出器，并为其执行的每次运行从 Gateway
  进程中导出，包括分派给它的 `openclaw agent` 运行。
- **一次性本地运行**（`openclaw agent --local`）在 CLI
  进程中执行。当配置了 OTel 导出且插件已启用时，同一个 CLI 进程会为
  此次运行启动一个导出器实例，并在进程退出前刷新缓冲的 span、指标和日志。
  CLI 最多等待 5 秒以排空诊断事件队列，随后再等待 10
  秒进行刷新，因此无法访问的收集器不会阻塞命令。接受连接但始终不响应的收集器仍可能使退出延迟，直到导出器自身的请求超时时间
  （`OTEL_EXPORTER_OTLP_TIMEOUT`）到达。
  在 JSON 输出模式下，这些一次性运行只会抑制 stdout JSONL 日志
  sink，以便命令 stdout 保留给 JSON 响应；配置后，OTLP traces、
  metrics 和 logs 仍会继续导出。
- `openclaw agent exec` 同样会在 CLI 进程中嵌入运行 agent，但目前
  尚未启动此导出器，因此其运行不会导出任何遥测数据。需要从无头运行中获取 traces
  时，请通过 Gateway 分派，或使用 `openclaw agent --local`。

## 导出器健康状态

`openclaw doctor` 和 `openclaw status --all` 会显示正在运行的 Gateway 针对每种信号和传输方式的最新可信导出器状态的有限、已脱敏快照。对于 `diagnostics-otel`，该快照会区分：

- 配置或 `OTEL_*` 环境变量回退机制提供端点的 OTLP/HTTP protobuf。
- 未提供端点时使用导出器依赖项默认端点的 OTLP/HTTP protobuf。
- 标准输出日志导出。
- 由外部预加载的 OpenTelemetry SDK 所拥有的跟踪或指标导出。

OTLP 导出失败和恢复的状态转换记录自导出器的最终结果回调，即依赖项负责的重试完成之后。因此，之后成功的可重试响应不会被报告为失败。启动、日志准备或发送、导出以及关闭失败使用固定的原因类别，而不是原始错误。

快照绝不会包含端点值、标头、证书、负载或原始错误消息。传输方式仅保留在此本地健康状态投影中。它不会添加到现有的 `openclaw.telemetry.exporter.events` 指标属性中，现有的 Prometheus 标签集合也不会改变。

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
      protocol: "http/protobuf",
      serviceName: "openclaw-gateway", // 未设置时回退到 OTEL_SERVICE_NAME，然后回退到 "openclaw"
      metricNamePrefix: "acme.", // 可选；包含分隔符
      headers: { "x-collector-token": "..." },
      traces: true,
      metrics: true,
      logs: true,
      logsExporter: "otlp", // otlp | stdout | both
      sampleRate: 0.2, // 根 span 采样器，0.0..1.0
      flushIntervalMs: 60000, // 指标导出间隔（最小 1000ms）
      captureContent: false,
    },
  },
}
```

`metricNamePrefix` 仅替换 OpenClaw 自有指标的默认 `openclaw.` 前缀。例如，`"acme."` 会将 `openclaw.tokens` 导出为 `acme.tokens`；将其设置为 `""` 可在无前缀的情况下导出 `tokens`。非空值必须以 ASCII 字母开头，只能包含字母、数字、下划线、点、连字符和斜杠，且最多包含 128 个字符。如果希望得到 `acme.openclaw.tokens`，请将其设置为 `"acme.openclaw."`。`gen_ai.client.token.usage` 和 `gen_ai.client.operation.duration` 等标准语义约定指标会保留其原始名称。不设置此选项可保留当前所有指标名称。启用或更改此选项会重命名受影响的指标序列，因此请更新查询旧名称的仪表板、告警和记录规则。

### 环境变量

| 变量                                                                                                                                                                                                                                    | 用途                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                                                                                                                                                                                                          | 当配置键未设置时，作为 `diagnostics.otel.endpoint` 的回退值。                                                                                                                                                                                                                                                                                                           |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` / `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` / `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`                                                                                                                      | 当匹配的 `diagnostics.otel.*Endpoint` 配置键未设置时使用的信号专用端点回退值。信号专用配置优先于信号专用环境变量，后者优先于共享端点。                                                                                                                                                                                                                                                                                                           |
| `OTEL_SERVICE_NAME`                                                                                                                                                                                                                    | 当配置键未设置时，作为 `diagnostics.otel.serviceName` 的回退值。默认服务名称为 `openclaw`。                                                                                                                                                                                                                                                                    |
| `OTEL_EXPORTER_OTLP_PROTOCOL`                                                                                                                                                                                                          | 当 `diagnostics.otel.protocol` 和信号专用协议变量均未设置时使用的共享进程环境回退值。只有 `http/protobuf` 才会启用插件自有的 OTLP 导出器。                                                                                                                                                                                        |
| `OTEL_EXPORTER_OTLP_TRACES_PROTOCOL` / `OTEL_EXPORTER_OTLP_METRICS_PROTOCOL` / `OTEL_EXPORTER_OTLP_LOGS_PROTOCOL`                                                                                                                      | 当 `diagnostics.otel.protocol` 未设置时使用的信号专用协议回退值。非空的信号专用值优先于共享协议值。不支持的值只会禁用该插件自有的 OTLP 信号。                                                                                                                                                          |
| `OTEL_PROPAGATORS`                                                                                                                                                                                                                     | 为每个插件自有的生成注册的传播器，包括 `OTEL_SDK_DISABLED=true` 时。默认为 `tracecontext,baggage`；`none` 会禁用自动传播。值不区分大小写。不可用的值以及已弃用的 `jaeger` 用法会发出插件警告。                                                                                                |
| `OTEL_SDK_DISABLED`                                                                                                                                                                                                                    | 不区分大小写的 `true` 会在端点、协议或 TLS 设置之前禁用所有插件自有的追踪、指标、日志和 stdout 路由。任何其他值都会使 SDK 保持启用；无法识别的值会发出插件警告并回退为 `false`。异步上下文和 `OTEL_PROPAGATORS` 仍保持活动状态。                                                                               |
| `OTEL_NODE_RESOURCE_DETECTORS`                                                                                                                                                                                                         | 为插件自有的追踪和指标提供程序选择资源检测器。支持的标记为 `env`、`host`、`os`、`process` 和 `serviceinstance`；`all` 按主机、操作系统、服务实例、进程、环境的顺序运行这些检测器，而 `none` 会禁用检测。默认顺序为环境、进程，然后是主机。显式的 OpenClaw 服务配置优先于检测器属性。       |
| `OTEL_TRACES_SAMPLER` / `OTEL_TRACES_SAMPLER_ARG`                                                                                                                                                                                      | 当 `diagnostics.otel.sampleRate` 未设置时使用的标准 OpenTelemetry 采样器选择。显式的 `sampleRate` 仍然是优先级更高的 OpenClaw 采样器。                                                                                                                                                                                                              |
| `OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT` / `OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT` / `OTEL_SPAN_EVENT_COUNT_LIMIT` / `OTEL_SPAN_LINK_COUNT_LIMIT` / `OTEL_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT` / `OTEL_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT` | 每个插件自有的追踪提供程序所应用的标准 OpenTelemetry span 限制。                                                                                                                                                                                                                                                                                                 |
| `OTEL_BSP_MAX_QUEUE_SIZE` / `OTEL_BSP_MAX_EXPORT_BATCH_SIZE` / `OTEL_BSP_SCHEDULE_DELAY` / `OTEL_BSP_EXPORT_TIMEOUT`                                                                                                                   | 插件自有追踪导出的批处理 span 处理器设置。值必须为正数；无效值使用 OpenTelemetry 默认值。导出批次大小不会超过队列大小。                                                                                                                                                                                                      |
| `OTEL_METRIC_EXPORT_INTERVAL` / `OTEL_METRIC_EXPORT_TIMEOUT`                                                                                                                                                                           | 插件自有指标的周期性导出间隔和超时时间。值必须为正数；无效值使用 OpenTelemetry 默认值，并且超时时间不会超过当前活动间隔。`diagnostics.otel.flushIntervalMs` 会覆盖该间隔。                                                                                                                               |
| `OTEL_NODE_EXPERIMENTAL_SDK_METRICS`                                                                                                                                                                                                   | 设置为 `true` 时，为私有 meter、tracer 和批处理 span 处理器启用 OpenTelemetry SDK 自观测指标。                                                                                                                                                                                                                                                   |
| `OTEL_LOG_LEVEL`                                                                                                                                                                                                                       | 自有模式不会替换进程级的 OpenTelemetry 诊断日志记录器，因为公共 SDK API 没有提供生成专用的等效机制。preload 或宿主可以在 OpenClaw 启动前配置此变量；插件会保留该外部诊断所有者。                                                                                                   |
| `OTEL_SEMCONV_STABILITY_OPT_IN`                                                                                                                                                                                                        | 设置为 `gen_ai_latest_experimental` 时，发出最新的 GenAI 推理 span 形态：使用 `{gen_ai.operation.name} {gen_ai.request.model}` 作为 span 名称、使用 `CLIENT` span 类型，并使用 `gen_ai.provider.name` 替代旧版的 `gen_ai.system`。无论如何，GenAI 指标始终使用有界的低基数属性。                                                                   |
| `OPENCLAW_OTEL_PRELOADED`                                                                                                                                                                                                              | 当其他 preload 或宿主进程已经注册全局 OpenTelemetry 提供程序时设置为 `1`。插件会使用外部的追踪、指标、上下文、传播和日志记录器所有权，而不会注册、替换、禁用、注销或关闭它们。当 `OTEL_SDK_DISABLED=true` 时，外部所有权仍保持活动状态，而插件自有日志会保持禁用。 |

如果没有设置 `OPENCLAW_OTEL_PRELOADED=1`，追踪、指标和日志提供程序均为
生成专用。插件只通过公共 OpenTelemetry API 发布其异步上下文管理器和传播器，并且仅当这些公共行为仍与正在停止的生成相匹配时才会移除它们。因此，替换后的宿主或后续生成会在清理过程中继续保有所有权。

## 继续上游 WebSocket 追踪

经过身份验证的 Gateway WebSocket 客户端可以为每个请求帧附加 W3C `traceparent`：

```json
{
  "type": "req",
  "id": "eval-item-42",
  "method": "agent",
  "params": {},
  "traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
}
```

Gateway 会创建一个子请求上下文，保留上游追踪 ID 和采样标志。在请求内部创建的 Agent、harness、模型调用、提供商、工具执行和 exec span 都会保留在该追踪中，包括在其父运行已结束后记录的 span。这样，本地实验运行器就可以为每个数据集项目创建一条 Langfuse/OpenTelemetry 追踪，并关联相应的 OpenClaw 执行。

追踪上下文的作用域是请求，而不是连接。在长连接 WebSocket 上，应为每个 RPC 独立生成或注入适当的 `traceparent`。即使并发请求的工作相互交错，它们仍会彼此隔离。

只有在现有 Gateway 身份验证握手完成后，该字段才会被接受，并且不会影响身份验证或方法授权。初始 `connect` 帧中的 `traceparent` 会被忽略。在 128 个字符的字段长度限制内，缺失或语法格式错误的值会静默回退到新的请求追踪；更长的值会使请求帧无效。Gateway WebSocket 协议不接受 `tracestate` 和 `baggage`。

## 隐私与内容捕获

默认情况下不会导出原始模型/工具内容。Span 携带有界标识符（通道、提供方、模型、错误类别、仅哈希处理的请求 ID、工具来源、工具所有者、技能名称/来源），且绝不包含提示文本、响应文本、工具输入、工具输出、技能文件路径或会话密钥。
看起来像有作用域的代理会话密钥的值（例如以
`agent:` 开头的值）会在低基数属性上被替换为 `unknown`。OTLP 日志记录默认保留严重性、日志记录器、代码位置、受信任的 trace 上下文以及经过清理的属性；仅当 `diagnostics.otel.captureContent` 为 `true` 时，才会导出原始日志消息正文。对话指标仅导出有界事件元数据（模式、传输方式、提供方、事件类型）——不包含转录文本、音频载荷、会话 ID、轮次 ID、通话 ID、房间 ID 或交接令牌。

当 `diagnostics-otel` 跟踪处于活动状态时，出站模型请求可能会包含一个来自实际由导出器拥有的模型调用 span 的 W3C `traceparent` 标头。
诊断 trace ID 和 span ID 仅用于将事件关联到该 span；它们不会被用作出站 OTel 身份。如果导出器无法解析出真实的 span 上下文，OpenClaw 会省略该标头，而不是为未导出的父级命名。
现有的调用方提供的 `traceparent` 标头会被移除或替换，因此插件或自定义提供方选项无法伪造跨服务 trace 祖先关系。

仅当你的收集器和保留策略已获批准，可处理提示、响应、工具及工具定义文本时，才将
`diagnostics.otel.captureContent` 设置为 `true`。此设置会启用经过限制和脱敏的输入消息、输出消息、工具输入、工具输出、工具定义以及 OTLP 日志正文的捕获。系统提示仍会被排除。提供方内部的 `thinking` 和 `redacted_thinking` 载荷也会被排除：兼容性属性仅保留经过脱敏的结构标记，而 GenAI 消息属性会省略这些部分。

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

### 模型调用观测单元

每个 `openclaw.model.call` span 都通过
`openclaw.model_call.observation_unit` 标识其生命周期所度量的内容：

- `request` - 一个可观测的模型/提供商请求。原生嵌入式模型调用使用此单元，并且为兼容较旧版本或外部发射器，导出器会将缺失值视为 `request`。
- `turn` - 一个不透明的 agent CLI 轮次，其中可能包含隐藏的模型请求、重试、工具工作或后台工作。Claude Code CLI 和 Codex app-server 调用使用此单元。

这两种单元仍然都是模型调用 span，因此 trace 后端可以呈现模型输入、输出、用量和层级关系。请求 span 使用从 API 派生的 GenAI 操作
（`chat`、`generate_content` 或 `text_completion`），而轮次 span 使用
`gen_ai.operation.name = invoke_agent`。两者都会贡献到
`gen_ai.client.operation.duration`，其中操作名称将直接请求延迟与完整轮次延迟区分开来。OpenClaw 的 OTEL 模型调用
指标也包含 `openclaw.model_call.observation_unit`；Prometheus
模型调用指标则暴露等效的 `observation_unit` 标签。

### Claude Code CLI 模型调用保真度

Claude Code CLI 轮次会发出一个合成的、轮次级别的 `openclaw.model.call`
span。这些不是 Anthropic HTTP 请求 span。它们使用 `openclaw.api =
claude-code`、`openclaw.model_call.observation_unit = turn`，并将
操作标识为 `gen_ai.operation.name = invoke_agent`。它们通过
`openclaw.transport` 标识 OpenClaw 的 CLI 边界：

- `stdio` - 一次性本地 Claude Code 进程。
- `stdio-live` - 在受管理的持久 Claude stdio 会话中执行的一次轮次。
- `paired-node-cli` - 委托给配对节点的一次性 Claude Code 执行。

Claude CLI 诊断仅在进程诊断分发器启用且附加了内部或受信任的事件监听器时实例化。如果没有启用可观测性插件或其他监听器，Claude CLI 轮次会跳过合成的 trace 层级、内容缓冲区和诊断流字节统计。当启用内容捕获时，prompt 和 system-prompt 字段各自限制为 128 KiB；assistant 输出最多限制为 200 个信封、总计 128 KiB，并为最终可见的回退响应预留 16 KiB 和一个条目。达到限制时会记录截断标记。

OpenClaw 为 Claude CLI 轮次提供与其他 agent 运行时相同的所有权层级：`openclaw.harness.run`（`openclaw.harness.id = claude-cli`）包含 `openclaw.run`，后者包含 Claude 的 `openclaw.model.call`
span。harness 和 run span 是合成的 OpenClaw 轮次边界，而不是
Claude Code 的内部阶段。一次性和受管理的 stdio 轮次使用相同的层级；真正的新会话重试会在同一个 OpenClaw run 内创建另一个模型调用子 span。

span 在 OpenClaw 接纳准备好的 CLI 轮次时开始，并且仅在该轮次成功或失败后结束。对于受管理的会话，当 Claude 报告仍持有结果的后台 agent 或工作流时，中间成功结果不会结束 span；最终的排空后结果才会结束 span。中止、超时、进程失败、输出/解析失败以及其他轮次失败，都会以错误结束同一个 span。

Claude Code 会报告每条 assistant 消息的用量，也可能在其终端结果中报告累计用量。OpenClaw 的回复计费仍继续使用最后一条 assistant 消息，因此现有成本语义不会改变；轮次级别的模型调用 span 在可用时使用终端累计用量，包括缓存读取和缓存创建 token。

对于这些 CLI span，字节和计时字段描述的是可观测的 OpenClaw
CLI 边界：

- `openclaw.model_call.request_bytes` 是通过一次性 stdin/argv 发送的 prompt 值的 UTF-8 大小，或受管理 stdio JSONL 用户信封的 UTF-8 大小。它不是 Claude Code 隐藏模型请求的大小。
- `openclaw.model_call.response_bytes` 是轮次期间观测到的 Claude CLI stdout 的 UTF-8 大小。它不是 Anthropic HTTP 响应的大小。
- `openclaw.model_call.time_to_first_byte_ms` 是到首次可观测的 Claude CLI stdout 或 stderr 输出所需的时间。它不是网络 TTFB。

启用 `captureContent` 后，span 会通过
`gen_ai.input.messages` 和 `gen_ai.output.messages` 导出 OpenClaw 发送给 Claude Code 的有效 prompt，以及可见的 assistant 文本/工具调用标识。工具参数、内部思考、不透明的思考签名、工具结果和系统 prompt 会从 Claude assistant 信封中省略。OpenClaw 不声称能够访问 Claude Code 的私有系统 prompt、隐藏的恢复或压缩后的请求载荷、原生内部工具 schema、原始 Anthropic HTTP 请求、内部重试、上游请求 ID 或真实网络 TTFB。由于 Claude Code 无法准确暴露其有效的原生工具定义，这些 span 不会填充 `gen_ai.tool.definitions`。

即使启用了工具内容捕获，外部 Claude harness 工具 span 仍然仅包含元数据。与每个模型 span 一样，捕获的 Claude CLI 内容使用受信任的仅监听器路径以及导出器现有的脱敏和大小限制；默认情况下内容处于关闭状态。

## 已导出的指标

### 模型使用

- `openclaw.tokens`（计数器，属性：`openclaw.token`、`openclaw.channel`、`openclaw.provider`、`openclaw.model`、`openclaw.agent`）
- `openclaw.cost.usd`（计数器，属性：`openclaw.channel`、`openclaw.provider`、`openclaw.model`）
- `openclaw.run.duration_ms`（直方图，属性：`openclaw.channel`、`openclaw.provider`、`openclaw.model`）
- `openclaw.context.tokens`（直方图，属性：`openclaw.context`、`openclaw.channel`、`openclaw.provider`、`openclaw.model`）
- `gen_ai.client.token.usage`（直方图，GenAI 语义约定指标，属性：`gen_ai.token.type` = `input`/`output`、`gen_ai.provider.name`、`gen_ai.operation.name`、`gen_ai.request.model`）
- `gen_ai.client.operation.duration`（直方图，单位为秒，适用于模型请求和合成代理轮次的 GenAI 语义约定指标；属性：`gen_ai.provider.name`、`gen_ai.operation.name`、`gen_ai.request.model`，可选 `error.type`；轮次观测使用 `gen_ai.operation.name = invoke_agent`）
- `openclaw.model_call.duration_ms`（直方图，属性：`openclaw.provider`、`openclaw.model`、`openclaw.api`、`openclaw.transport`、`openclaw.model_call.observation_unit`；对于已分类的错误，还包括 `openclaw.errorCategory` 和 `openclaw.failureKind`）
- `openclaw.model_call.request_bytes`（直方图，最终模型请求负载的 UTF-8 字节大小；对于 Claude Code CLI，为上文所述的可观测提示输入/信封；不包含原始负载内容）
- `openclaw.model_call.response_bytes`（直方图，流式响应块负载的 UTF-8 字节大小；高频文本、思考和工具调用增量仅计算增量 `delta` 的字节数；对于 Claude Code CLI，为观测到的 stdout 字节数；不包含原始响应内容）
- `openclaw.model_call.time_to_first_byte_ms`（直方图，首个流式响应事件之前经过的时间；对于 Claude Code CLI，为首个可观测 CLI 输出之前的时间，而非网络 TTFB）
- `openclaw.model.failover`（计数器，属性：`openclaw.provider`、`openclaw.model`、`openclaw.failover.to_provider`、`openclaw.failover.to_model`、`openclaw.failover.reason`、`openclaw.failover.suspended`、`openclaw.lane`）
- `openclaw.skill.used`（计数器，属性：`openclaw.skill.name`、`openclaw.skill.source`、`openclaw.skill.activation`，可选 `openclaw.agent`、可选 `openclaw.toolName`）

### 消息流

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

### 语音对话

- `openclaw.talk.event`（计数器，属性：`openclaw.talk.event_type`、`openclaw.talk.mode`、`openclaw.talk.transport`、`openclaw.talk.brain`、`openclaw.talk.provider`）
- `openclaw.talk.event.duration_ms`（直方图，属性同 `openclaw.talk.event`；当 Talk 事件报告持续时间时发出）
- `openclaw.talk.audio.bytes`（直方图，属性同 `openclaw.talk.event`；为报告字节长度的 Talk 音频帧事件发出）

### 队列与会话

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

### 会话存活遥测

当 OpenClaw 观察到回复、工具、状态、区块或 ACP 运行时进度时，`processing` 会话不会向内置存活阈值增长。输入状态保活不计作进度，因此仍然可以检测到无响应的模型或 harness。

OpenClaw 按其仍能观察到的工作对会话进行分类：

- `session.long_running`：活跃的嵌入式工作、模型调用或工具调用仍在取得进展。由系统拥有的静默模型调用在达到内置中止阈值之前也会报告为长期运行，因此在可观测到中止之前，运行缓慢或不进行流式传输的模型提供商不会被视为停滞的网关会话。
- `session.stalled`：存在活跃工作，但活跃运行最近没有报告进度。由系统拥有的模型调用在达到或超过内置中止阈值时，会从 `session.long_running` 切换为 `session.stalled`；没有所有者的陈旧模型/工具活动不会被视为无害的长期运行工作。停滞的嵌入式运行最初保持仅观测状态，之后在达到中止阈值且仍无进度时进入中止排空状态，使该通道后面排队的轮次能够继续运行。
- `session.stuck`：没有活跃工作的陈旧会话记录，或存在陈旧的无所有者模型/工具活动的空闲排队会话。在恢复门控条件通过后，这会立即释放受影响的会话通道。

恢复会发出结构化的 `session.recovery.requested` 和 `session.recovery.completed` 事件。只有在变更型恢复结果（`aborted` 或 `released`）之后，且仅当相同的处理代次仍然是当前代次时，诊断会话状态才会标记为空闲。

只有 `session.stuck` 会发出 `openclaw.session.stuck` 计数器、`openclaw.session.stuck_age_ms` 直方图以及 `openclaw.session.stuck` span。只要会话保持不变，重复的 `session.stuck` 诊断就会退避，因此仪表板应监控持续增长，而不是每次 heartbeat tick 都告警。配置开关和默认值请参见 [配置参考](/gateway/configuration-reference#diagnostics)。

存活警告也会发出：

- `openclaw.liveness.warning`（计数器，属性：`openclaw.liveness.reason`）
- `openclaw.liveness.event_loop_delay_p99_ms`（直方图，属性：`openclaw.liveness.reason`）
- `openclaw.liveness.event_loop_delay_max_ms`（直方图，属性：`openclaw.liveness.reason`）
- `openclaw.liveness.event_loop_utilization`（直方图，属性：`openclaw.liveness.reason`）
- `openclaw.liveness.cpu_core_ratio`（直方图，属性：`openclaw.liveness.reason`）

### Harness 生命周期

- `openclaw.harness.duration_ms`（直方图，属性：`openclaw.harness.id`、`openclaw.harness.plugin`、`openclaw.outcome`、`openclaw.harness.phase`（在错误时））

### 工具执行与循环检测

- `openclaw.tool.execution.duration_ms`（直方图，属性：`gen_ai.tool.name`、`openclaw.toolName`、`openclaw.tool.source`、`openclaw.tool.owner`、`openclaw.tool.params.kind`，以及错误时的 `openclaw.errorCategory`）
- `openclaw.tool.execution.blocked`（计数器，属性：`gen_ai.tool.name`、`openclaw.toolName`、`openclaw.tool.source`、`openclaw.tool.owner`、`openclaw.tool.params.kind`、`openclaw.deniedReason`）
- `openclaw.tool.loop`（计数器，属性：`openclaw.toolName`、`openclaw.loop.level`、`openclaw.loop.action`、`openclaw.loop.detector`、`openclaw.loop.count`，可选 `openclaw.loop.paired_tool`；当检测到重复的工具调用循环时发出）

### 执行

- `openclaw.exec.duration_ms`（直方图，属性：`openclaw.exec.target`、`openclaw.exec.mode`、`openclaw.outcome`、`openclaw.failureKind`）

### 诊断内部项（内存、负载、导出器健康）

- `openclaw.payload.large`（计数器，属性：`openclaw.payload.surface`、`openclaw.payload.action`、`openclaw.channel`、`openclaw.plugin`、`openclaw.reason`）
- `openclaw.payload.large_bytes`（直方图，属性同 `openclaw.payload.large`）
- `openclaw.memory.rss_bytes` / `openclaw.memory.heap_used_bytes` / `openclaw.memory.heap_total_bytes` / `openclaw.memory.external_bytes` / `openclaw.memory.array_buffers_bytes`（直方图，无属性；进程内存采样）
- `openclaw.memory.pressure`（计数器，属性：`openclaw.memory.level`、`openclaw.memory.reason`）
- `openclaw.diagnostic.async_queue.dropped`（计数器，属性：`openclaw.diagnostic.async_queue.drop_class`；内部诊断队列背压丢弃）
- `openclaw.telemetry.exporter.events`（计数器，属性：`openclaw.exporter`、`openclaw.signal`、`openclaw.status`，可选 `openclaw.reason`、可选 `openclaw.errorCategory`；导出器生命周期/失败自遥测）

## 导出的 spans

- `openclaw.model.usage`
  - `openclaw.channel`、`openclaw.provider`、`openclaw.model`
  - 仅适用于受信任插件运行时完成的、可选的源自主机的 `openclaw.plugin`
  - `openclaw.tokens.*`（input/output/cache_read/cache_write/total）
  - 默认使用 `gen_ai.system`，或者在启用最新 GenAI 语义约定时使用 `gen_ai.provider.name`
  - `gen_ai.request.model`、`gen_ai.operation.name`、`gen_ai.usage.*`

插件归属信息仅存在于 span 中。它不会向共享的
OpenTelemetry 指标添加插件维度，也不会更改 Prometheus 指标标签。

- `openclaw.run`
  - `openclaw.outcome`、`openclaw.channel`、`openclaw.provider`、`openclaw.model`、`openclaw.errorCategory`
- `openclaw.model.call`
  - 默认使用 `gen_ai.system`，或者在启用最新 GenAI 语义约定时使用 `gen_ai.provider.name`
  - `gen_ai.request.model`、`gen_ai.operation.name`、`openclaw.provider`、`openclaw.model`、`openclaw.api`、`openclaw.transport`、`openclaw.model_call.observation_unit`（`request` 或 `turn`）
  - 出错时使用 `openclaw.errorCategory`、`error.type`，以及可选的 `openclaw.failureKind`
  - `openclaw.model_call.request_bytes`、`openclaw.model_call.response_bytes`、`openclaw.model_call.time_to_first_byte_ms`
  - `openclaw.model_call.prompt.input_messages_count`、`openclaw.model_call.prompt.input_messages_chars`、`openclaw.model_call.prompt.system_prompt_chars`、`openclaw.model_call.prompt.tool_definitions_count`、`openclaw.model_call.prompt.tool_definitions_chars`、`openclaw.model_call.prompt.total_chars`（仅包含安全的组件大小，不包含提示词文本）
  - 当结果携带该请求或聚合回合的使用量时，包含 `openclaw.model_call.usage.*` 和 `gen_ai.usage.*`
  - 当上游提供商的结果暴露请求 ID 时，使用属性 `openclaw.upstreamRequestIdHash`（有界、基于哈希）记录 Span 事件 `openclaw.provider.request`；绝不会导出原始 ID
  - 当设置 `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental` 时，请求 spans 使用最新 GenAI 推理 span 名称 `{gen_ai.operation.name} {gen_ai.request.model}`。由于 OpenClaw 不会从不透明的 CLI 边界声明原生 agent 名称，回合 spans 使用 `invoke_agent`。两者都使用 `CLIENT` span 类型，而不是 `openclaw.model.call`。
- `openclaw.harness.run`
  - `openclaw.harness.id`、`openclaw.harness.plugin`、`openclaw.outcome`、`openclaw.provider`、`openclaw.model`、`openclaw.channel`
  - 完成时：`openclaw.harness.result_classification`、`openclaw.harness.yield_detected`、`openclaw.harness.items.started`、`openclaw.harness.items.completed`、`openclaw.harness.items.active`
  - 出错时：`openclaw.harness.phase`、`openclaw.errorCategory`、可选的 `openclaw.harness.cleanup_failed`
- `openclaw.tool.execution`
  - `gen_ai.tool.name`、`gen_ai.operation.name`（`execute_tool`）、`openclaw.toolName`、`openclaw.tool.source`、可选的 `gen_ai.tool.call.id`、`openclaw.tool.owner`、`openclaw.tool.params.*`
  - 出错时可选的 `openclaw.errorCategory`/`openclaw.errorCode`；当因策略或沙箱被拒绝时，使用 `openclaw.deniedReason` 和 `openclaw.outcome=blocked`
- `openclaw.exec`
  - `openclaw.exec.target`、`openclaw.exec.mode`、`openclaw.outcome`、`openclaw.failureKind`、`openclaw.exec.command_length`、`openclaw.exec.exit_code`、`openclaw.exec.exit_signal`、`openclaw.exec.timed_out`
- `openclaw.webhook.processed`
  - `openclaw.channel`、`openclaw.webhook`
- `openclaw.webhook.error`
  - `openclaw.channel`、`openclaw.webhook`、`openclaw.error`
- `openclaw.message.processed`
  - `openclaw.channel`、`openclaw.outcome`、`openclaw.reason`
- `openclaw.message.delivery`
  - `openclaw.channel`、`openclaw.delivery.kind`、`openclaw.outcome`、`openclaw.errorCategory`、`openclaw.delivery.result_count`
- `openclaw.session.stuck`
  - `openclaw.state`、`openclaw.ageMs`、`openclaw.queueDepth`
- `openclaw.context.assembled`
  - `openclaw.prompt.size`、`openclaw.history.size`、`openclaw.context.tokens`、`openclaw.errorCategory`（不包含提示词、历史、响应或 session-key 内容）
- `openclaw.tool.loop`
  - `openclaw.toolName`、`openclaw.loop.level`、`openclaw.loop.action`、`openclaw.loop.detector`、`openclaw.loop.count`、可选的 `openclaw.loop.paired_tool`（不包含循环消息、参数或工具输出）
- `openclaw.memory.pressure`
  - `openclaw.memory.level`、`openclaw.memory.reason`、`openclaw.memory.rss_bytes`、`openclaw.memory.heap_used_bytes`、`openclaw.memory.heap_total_bytes`、`openclaw.memory.external_bytes`、`openclaw.memory.array_buffers_bytes`、可选的 `openclaw.memory.threshold_bytes`/`openclaw.memory.rss_growth_bytes`/`openclaw.memory.window_ms`

当显式启用内容捕获时，模型和工具 spans 还可以包含针对你选择启用的特定内容类别的、受限且已脱敏的 `openclaw.content.*` 属性。

## 诊断事件目录

以下事件支撑上述指标和跨度。公共事件也可供插件直接订阅；如
`model.usage` 这样的受信任核心事件仅限经授权的内部消费者使用。
`run.progress` 和 `run.execution_phase` 是仅限直接订阅的生命周期信号；
diagnostics-otel 插件不会将它们作为独立的 OTLP 信号导出。
事件类型和 `run.execution_phase.phase` 的值是可添加的。TypeScript
消费者应保留默认分支，而不要假定任一联合类型都永久完整。

**模型使用**

`model.usage` 是受信任的进程内诊断事件，而不是 JSONL 日志
记录。一个具有代表性的事件如下：

```json
{
  "type": "model.usage",
  "ts": 1735689600000,
  "seq": 42,
  "provider": "openai",
  "model": "gpt-5.4",
  "channel": "webchat",
  "agentId": "main",
  "sessionId": "session-123",
  "sessionKey": "agent:main:main",
  "usage": {
    "input": 120,
    "output": 40,
    "cacheRead": 30,
    "cacheWrite": 10,
    "promptTokens": 160,
    "total": 200
  },
  "lastCallUsage": {
    "input": 120,
    "output": 40,
    "cacheRead": 30,
    "cacheWrite": 10,
    "total": 200
  },
  "context": { "limit": 128000, "used": 160 },
  "costUsd": 0.0012,
  "durationMs": 850,
  "trace": {
    "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
    "spanId": "00f067aa0ba902b7",
    "traceFlags": "01"
  }
}
```

- `ts` 是以毫秒为单位的 Unix 时间戳；`seq` 是进程本地的序列号。
- `usage` 保存单轮的令牌计数。`promptTokens` 包含 `input`、
  `cacheRead` 和 `cacheWrite`；如果可用，`lastCallUsage` 描述
  最终的模型调用。
- `context.used` 是当前提示词/上下文快照；当涉及缓存输入或工具循环调用时，
  它可能低于 `usage.total`。
- 提供方/模型/会话标识符、令牌分桶、`lastCallUsage`、
  `context`、`costUsd`、`durationMs` 和 `trace` 字段均为可选。
  `costUsd` 是估算值；当模型定价不可用时可能缺失，
  它并非提供方报告的计费金额。Trace 上下文还可以包含
  `parentSpanId`。

Gateway 的 `/tmp/openclaw/openclaw-YYYY-MM-DD.log` JSONL 文件和
`diagnostics.otel.logsExporter: "stdout"` 包含普通日志记录，而不是原始的
`model.usage` 事件。公共诊断订阅和 `diagnostics.stability` 不会暴露受信任的核心使用事件。
diagnostics-otel 插件会将它们转换为诸如 `openclaw.tokens` 和
`openclaw.cost.usd` 这样的指标，以及 `openclaw.model.usage` 跨度；这些使用指标
和跨度会有意省略会话标识符。

对于需要按会话关联使用情况的外部集成，请改为查询经过身份验证的 Gateway：

```bash
openclaw gateway call sessions.usage --params '{"range":"30d","agentScope":"all"}' --json
openclaw gateway usage-cost --days 30 --all-agents --json
```

两个命令都需要 `operator.read` 权限。`sessions.usage` 可以包含每个会话的
`sessionId`、提供方/模型详细信息，以及令牌/成本摘要；在其缓存刷新期间，
每个会话的使用情况可能暂时为 `null`。`usage-cost` 提供汇总估算。
省略 `agentScope` 或 `--all-agents` 可将报告限定为默认 agent。对于需要持续更新的客户端，
[请订阅会话变更，而不是轮询使用情况报告](/gateway/clients#subscribe-instead-of-polling-usage)。
有关使用情况方法和请求选项，请参阅 [Gateway RPC 方法参考](/gateway/protocol#rpc-method-families)。

**消息流转**

- `webhook.received` / `webhook.processed` / `webhook.error`
- `message.queued` / `message.processed`
- `message.delivery.started` / `message.delivery.completed` / `message.delivery.error`

**队列和会话**

- `queue.lane.enqueue` / `queue.lane.dequeue`
- `session.state` / `session.long_running` / `session.stalled` / `session.stuck`
- `run.attempt` / `run.progress`
- `run.execution_phase`（公共事件，与会话关联的嵌入式运行器启动里程碑）
- `diagnostic.heartbeat`（汇总计数器：webhook/队列/会话）

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

标志输出会写入标准日志文件（`logging.file`），并且仍会受到始终启用的日志脱敏策略处理。完整指南：
[诊断标志](/diagnostics/flags)。

## 禁用

```json5
{
  diagnostics: { otel: { enabled: false } },
}
```

或者将 `diagnostics-otel` 从 `plugins.allow` 中移除，或者运行
`openclaw plugins disable diagnostics-otel`。

当插件原本会拥有 NodeSDK 时，在禁用所有插件拥有的导出器、监听器、健康检查路由和标准输出接收器的同时，保持传播功能可用：

```bash
OTEL_SDK_DISABLED=true openclaw gateway
```

## 相关内容

- [日志记录](/logging) - 文件日志、控制台输出、CLI 尾随，以及 Control UI 的日志选项卡
- [网关日志内部机制](/gateway/logging) - WS 日志样式、子系统前缀和控制台捕获
- [诊断标志](/diagnostics/flags) - 定向调试日志标志
- [诊断导出](/gateway/diagnostics) - 运维支持包工具（独立于 OTEL 导出）
- [配置参考](/gateway/configuration-reference#diagnostics) - 完整的 `diagnostics.*` 字段参考
