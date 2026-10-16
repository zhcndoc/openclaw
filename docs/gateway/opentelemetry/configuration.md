---
summary: "Signal 切换、diagnostics.otel 现场参考、OTEL_* 环境变量以及采样和刷新"
title: "OpenTelemetry配置"
sidebarTitle: "配置"
read_when:
  - "你正在将 traces、metrics 或 logs 接入 Grafana、Datadog、Honeycomb、New Relic、Tempo 或其他 OTLP 后端"
  - "您需要 `diagnostics.otel` 的端点、协议、标头、前缀或导出器字段"
  - "您正在设置采样、刷新间隔或 `OTEL_*` 环境回退"
---

## <a id="signals-exported"></a> 导出的信号

| Signal      | 里面有什么                                                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **指标** | Counters/histograms 用于令牌使用、成本、运行持续时间、故障转移、技能使用、消息流、Talk 事件、队列通道、会话 state/recovery、工具执行、执行、内存、活跃度和导出器运行状况。 |
| **痕迹**  | 涵盖模型使用、模型调用、harness生命周期、技能使用、工具执行、执行、webhook/message 处理、上下文组装和工具循环。                                                      |
| **日志**    | 当启用 `diagnostics.otel.logs` 时，通过 OTLP 或标准输出 JSONL 导出结构化 `logging.file` 记录；除非明确启用内容捕获，否则日志正文将被保留。                          |

可分别切换 `traces`、`metrics` 和 `logs`。当 `diagnostics.otel.enabled` 为 true 时，traces 和 metrics 默认开启；logs 默认关闭，仅在 `diagnostics.otel.logs` 显式设为 `true` 时才导出。日志导出默认使用 OTLP；将 `diagnostics.otel.logsExporter` 设置为 `stdout` 可在 stdout 输出 JSONL，设置为 `both` 则两者都输出。

<Note>
共享的 `endpoint` 和 `OTEL_EXPORTER_OTLP_ENDPOINT` 是所有已启用信号的基础地址。OpenClaw 会将 `/v1/traces`、`/v1/metrics` 或 `/v1/logs` 附加到根路径和自定义收集器路径之后。为了兼容托管前端，如果共享端点已以这些信号路径之一结尾，则会为匹配的信号保留该路径，并为其他信号替换末尾部分。

Signal- 特定的 `tracesEndpoint`、`metricsEndpoint` 和 `logsEndpoint` 设置及其匹配的 `OTEL_EXPORTER_OTLP_*_ENDPOINT` 后备将作为精确 URL 传递到导出器。 OpenClaw 不会附加或重写它们的路径。
</Note>

## <a id="configuration-reference"></a> 配置参考

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
      serviceName: "openclaw-gateway", // unset falls back to OTEL_SERVICE_NAME, then "openclaw"
      metricNamePrefix: "acme.", // optional; include the separator
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

`metricNamePrefix` 仅在 OpenClaw- 拥有的指标上替换默认的 `openclaw.` 前缀。例如，`"acme."` 将 `openclaw.tokens` 导出为 `acme.tokens`；将其设置为 `""` 以导出不带前缀的 `tokens`。非空值必须以 ASCII 字母开头，只能使用字母、数字、下划线、点、连字符和斜杠，并且最多包含 128 个字符。如果您想要 `acme.openclaw.tokens`，请将其设置为 `"acme.openclaw."`。标准语义约定指标（例如 `gen_ai.client.token.usage` 和 `gen_ai.client.operation.duration`）保留其原始名称。保留该选项未设置以保留每个当前指标名称。启用或更改此选项会重命名受影响的指标系列，因此请更新查询旧名称的仪表板、警报和记录规则。

### <a id="environment-variables"></a> 环境变量

| 变量                                                                                                                                                                                                                               | 用途                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                                                                                                                                                                                                          | 当配置键未设置时，作为 `diagnostics.otel.endpoint` 的回退值。                                                                                                                                                                                                                                                                                                           |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` / `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` / `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`                                                                                                                      | 当匹配的 `diagnostics.otel.*Endpoint` 配置密钥未设置时，使用 Signal- 特定端点回退。 Signal-特定配置胜过信号特定环境，后者胜过共享端点。                                                                                                                                                                           |
| `OTEL_SERVICE_NAME`                                                                                                                                                                                                                    | 当配置键未设置时，作为 `diagnostics.otel.serviceName` 的回退值。默认服务名称为 `openclaw`。                                                                                                                                                                                                                                                                    |
| `OTEL_EXPORTER_OTLP_PROTOCOL`                                                                                                                                                                                                          | 当 `diagnostics.otel.protocol` 和信号专用协议变量均未设置时使用的共享进程环境回退值。只有 `http/protobuf` 才会启用插件自有的 OTLP 导出器。                                                                                                                                                                                        |
| `OTEL_EXPORTER_OTLP_TRACES_PROTOCOL` / `OTEL_EXPORTER_OTLP_METRICS_PROTOCOL` / `OTEL_EXPORTER_OTLP_LOGS_PROTOCOL`                                                                                                                      | 当 `diagnostics.otel.protocol` 未设置时使用 Signal- 特定协议回退。非空信号特定值胜过共享协议值。不支持的值仅禁用插件拥有的 OTLP 信号。                                                                                                                                                          |
| `OTEL_PROPAGATORS`                                                                                                                                                                                                                     | 为每个插件自有的生成注册的传播器，包括 `OTEL_SDK_DISABLED=true` 时。默认为 `tracecontext,baggage`；`none` 会禁用自动传播。值不区分大小写。不可用的值以及已弃用的 `jaeger` 用法会发出插件警告。                                                                                                |
| `OTEL_SDK_DISABLED`                                                                                                                                                                                                                    | 不区分大小写的 `true` 会在端点、协议或 TLS 设置之前禁用所有插件自有的追踪、指标、日志和 stdout 路由。任何其他值都会使 SDK 保持启用；无法识别的值会发出插件警告并回退为 `false`。异步上下文和 `OTEL_PROPAGATORS` 仍保持活动状态。                                                                               |
| `OTEL_NODE_RESOURCE_DETECTORS`                                                                                                                                                                                                         | 为插件拥有的跟踪和指标提供程序选择资源检测器。支持的代币为`env`、`host`、`os`、`process`和`serviceinstance`； `all` 按主机、OS、服务实例、进程、环境顺序运行它们，而 `none` 禁用检测。默认是环境、进程、然后是主机。显式 OpenClaw 服务配置赢得检测器属性。       |
| `OTEL_TRACES_SAMPLER` / `OTEL_TRACES_SAMPLER_ARG`                                                                                                                                                                                      | 当 `diagnostics.otel.sampleRate` 未设置时使用的标准 OpenTelemetry 采样器选择。显式的 `sampleRate` 仍然是优先级更高的 OpenClaw 采样器。                                                                                                                                                                                                              |
| `OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT` / `OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT` / `OTEL_SPAN_EVENT_COUNT_LIMIT` / `OTEL_SPAN_LINK_COUNT_LIMIT` / `OTEL_SPAN_ATTRIBUTE_PER_EVENT_COUNT_LIMIT` / `OTEL_SPAN_ATTRIBUTE_PER_LINK_COUNT_LIMIT` | 每个插件自有的追踪提供程序所应用的标准 OpenTelemetry span 限制。                                                                                                                                                                                                                                                                                                 |
| `OTEL_BSP_MAX_QUEUE_SIZE` / `OTEL_BSP_MAX_EXPORT_BATCH_SIZE` / `OTEL_BSP_SCHEDULE_DELAY` / `OTEL_BSP_EXPORT_TIMEOUT`                                                                                                                   | 插件自有追踪导出的批处理 span 处理器设置。值必须为正数；无效值使用 OpenTelemetry 默认值。导出批次大小不会超过队列大小。                                                                                                                                                                                                      |
| `OTEL_METRIC_EXPORT_INTERVAL` / `OTEL_METRIC_EXPORT_TIMEOUT`                                                                                                                                                                           | 插件自有指标的周期性导出间隔和超时时间。值必须为正数；无效值使用 OpenTelemetry 默认值，并且超时时间不会超过当前活动间隔。`diagnostics.otel.flushIntervalMs` 会覆盖该间隔。                                                                                                                               |
| `OTEL_NODE_EXPERIMENTAL_SDK_METRICS`                                                                                                                                                                                                   | 设置为 `true` 时，为私有 meter、tracer 和批处理 span 处理器启用 OpenTelemetry SDK 自观测指标。                                                                                                                                                                                                                                                   |
| `OTEL_LOG_LEVEL`                                                                                                                                                                                                                       | 拥有模式不会取代进程全局 OpenTelemetry 诊断记录器，因为公共 SDK API 不公开生成私有等效项。预加载或主机可以在 OpenClaw 启动之前配置此变量；该插件保留该外部诊断所有者。                                                                                                   |
| `OTEL_SEMCONV_STABILITY_OPT_IN`                                                                                                                                                                                                        | 设置为 `gen_ai_latest_experimental` 时，发出最新的 GenAI 推理 span 形态：使用 `{gen_ai.operation.name} {gen_ai.request.model}` 作为 span 名称、使用 `CLIENT` span 类型，并使用 `gen_ai.provider.name` 替代旧版的 `gen_ai.system`。无论如何，GenAI 指标始终使用有界的低基数属性。                                                                   |
| `OPENCLAW_OTEL_PRELOADED`                                                                                                                                                                                                              | 当其他 preload 或宿主进程已经注册全局 OpenTelemetry 提供程序时设置为 `1`。插件会使用外部的追踪、指标、上下文、传播和日志记录器所有权，而不会注册、替换、禁用、注销或关闭它们。当 `OTEL_SDK_DISABLED=true` 时，外部所有权仍保持活动状态，而插件自有日志会保持禁用。 |

如果没有 `OPENCLAW_OTEL_PRELOADED=1`，跟踪、指标和日志提供程序都是生成私有的。该插件仅通过公共 OpenTelemetry API 发布其异步上下文管理器和传播器，并在服务停止时删除它安装的注册。在用另一台主机 SDK 替换这些全局变量之前停止服务；在运行时更换它们是最好的努力。

## <a id="sampling-and-flushing"></a> 采样和刷新

- **跟踪：** `diagnostics.otel.sampleRate` 会仅在根 span 上设置 `TraceIdRatioBasedSampler` （`0.0` 丢弃全部，`1.0` 保留全部）。未设置时使用 OpenTelemetry SDK 默认值（始终开启）。
- **指标：** `diagnostics.otel.flushIntervalMs`（最小值会被限制为 `1000`）；未设置时使用 SDK 的周期导出默认值。
- **Logs：** OTLP 日志遵循 `logging.level`（文件日志级别）并使用诊断日志记录编辑路径，而不是控制台格式。大批量安装应优先选择 OTLP 收集器 sampling/filtering 而不是本地采样。当您的平台已将 stdout/stderr 发送到日志处理器并且您没有 OTLP 日志收集器时，请设置 `diagnostics.otel.logsExporter: "stdout"`。标准输出记录是每行一个 JSON 对象，包含 `ts`、`signal`、`service.name`、严重性、正文、编辑属性和可信跟踪字段（如果可用）。
- **文件日志关联：** 当日志调用携带有效的诊断 trace 上下文时，JSONL 文件日志会包含顶层的 `traceId`、 `spanId`、`parentSpanId` 和 `traceFlags`，使日志处理器能够将本地日志行与导出的 spans 关联起来。
- **请求关联：** Gateway HTTP 请求和 WebSocket 帧会创建一个内部请求 trace 作用域。该作用域内的日志和诊断事件默认继承请求 trace，而 agent run 和 model-call spans 会作为子 span 创建，因此 provider 的 `traceparent` 头会保留在同一条 trace 上。
- **模型调用关联：** `openclaw.model.call` spans 默认包含安全的 prompt 组件大小，并在 provider 结果暴露 usage 时包含每次调用的 token 属性。`openclaw.model.usage` 仍然是用于汇总成本、上下文和 channel 仪表板的 run 级计费 span，并且当发出它的运行时具有受信任的 trace 上下文时，会保持在同一条诊断 trace 上。
