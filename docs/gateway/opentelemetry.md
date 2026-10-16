---
summary: "OpenClaw OpenTelemetry 导出文档的索引，每个读者作业一页"
title: "OpenTelemetry 导出"
sidebarTitle: "OpenTelemetry 导出"
read_when:
  - "你想将 OpenClaw 的模型使用情况、消息流或会话指标发送到 OpenTelemetry 收集器"
  - "你正在将 traces、metrics 或 logs 接入 Grafana、Datadog、Honeycomb、New Relic、Tempo 或其他 OTLP 后端"
  - "你需要精确的指标名称、span 名称或属性形状来构建仪表盘或告警"
---

OpenClaw 通过官方 `diagnostics-otel` 插件使用 **OTLP/HTTP (protobuf)** 导出诊断信息。日志也可以作为 stdout JSONL 写入，用于容器和沙箱日志管道。任何接受 OTLP/HTTP 的收集器或后端都无需代码更改即可使用。如需本地文件日志，请参阅 [日志](/logging)。

- **诊断事件**是结构化的进程内记录，由 Gateway 和捆绑插件针对模型运行、消息流、会话、队列和执行操作发出。
- **`diagnostics-otel`** 订阅这些事件并将其导出为 OpenTelemetry **metrics**、**traces** 和**logs** over OTLP/HTTP，并且可以将日志记录镜像到标准输出 JSONL。
- **提供商致电**收到一个W3C `traceparent`实际电流的标头OpenTelemetry当提供者传输接受自定义标头时的模型调用范围。诊断 ID 保留本地相关键，并且不会传播插件发出的跟踪上下文。
- 只有在诊断面和插件均启用时，导出器才会挂载，因此默认情况下进程内开销接近于零。

此页是一个索引。 OpenTelemetry 导出记录有五页，每个读者作业一页。打开与您的任务匹配的页面。

| 页面                                                                               | 读它的时候                                                                                    |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [设置 OpenTelemetry 导出](/gateway/opentelemetry/setup)                        | 您想要安装插件、打开导出、检查导出器运行状况或将其关闭。          |
| [打开遥测配置](/gateway/opentelemetry/configuration)                | 您需要 `diagnostics.otel` 字段、`OTEL_*` 变量或采样和刷新设置。 |
| [隐私和跟踪上下文](/gateway/opentelemetry/privacy-and-trace-context)      | 您需要知道哪些内容离开了流程，或者想要继续上游跟踪。        |
| [模型调用和导出指标](/gateway/opentelemetry/model-calls-and-metrics) | 您正在构建仪表板或警报，并且需要准确的指标名称和属性。               |
| [导出的范围和诊断事件](/gateway/opentelemetry/spans-and-events)    | 您正在读取跟踪或订阅诊断事件的插件。                            |

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/gateway/opentelemetry#gateway-rpc`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="quick-start" />[快速入门](/gateway/opentelemetry/setup#quick-start)
- <a id="signals-exported" />[输出信号](/gateway/opentelemetry/configuration#signals-exported)
- <a id="which-processes-export" />[哪些流程出口](/gateway/opentelemetry/setup#which-processes-export)
- <a id="exporter-health" />[出口商健康](/gateway/opentelemetry/setup#exporter-health)
- <a id="configuration-reference" />[配置参考](/gateway/opentelemetry/configuration#configuration-reference)
- <a id="environment-variables" />[环境变量](/gateway/opentelemetry/configuration#environment-variables)
- <a id="continue-an-upstream-websocket-trace" />[继续上游 WebSocket 跟踪](/gateway/opentelemetry/privacy-and-trace-context#continue-an-upstream-websocket-trace)
- <a id="privacy-and-content-capture" />[隐私和内容捕获](/gateway/opentelemetry/privacy-and-trace-context#privacy-and-content-capture)
- <a id="sampling-and-flushing" />[取样和冲洗](/gateway/opentelemetry/configuration#sampling-and-flushing)
- <a id="model-call-observation-units" />[模型调用观察单元](/gateway/opentelemetry/model-calls-and-metrics#model-call-observation-units)
- <a id="claude-code-cli-model-call-fidelity" />[克劳德·科德CLI模型调用保真度](/gateway/opentelemetry/model-calls-and-metrics#claude-code-cli-model-call-fidelity)
- <a id="exported-metrics" />[导出的指标](/gateway/opentelemetry/model-calls-and-metrics#exported-metrics)
- <a id="gateway-rpc" />[网关RPC](/gateway/opentelemetry/model-calls-and-metrics#gateway-rpc)
- <a id="model-usage" />[模型用途](/gateway/opentelemetry/model-calls-and-metrics#model-usage)
- <a id="message-flow" />[消息流](/gateway/opentelemetry/model-calls-and-metrics#message-flow)
- <a id="talk" />[Talk](/gateway/opentelemetry/model-calls-and-metrics#talk)
- <a id="queues-and-sessions" />[队列和会话](/gateway/opentelemetry/model-calls-and-metrics#queues-and-sessions)
- <a id="session-liveness-telemetry" />[会话活跃度遥测](/gateway/opentelemetry/model-calls-and-metrics#session-liveness-telemetry)
- <a id="gateway-event-loop-observation-windows" />[网关事件循环观察窗口](/gateway/opentelemetry/model-calls-and-metrics#gateway-event-loop-observation-windows)
- <a id="harness-lifecycle" />[harness生命周期](/gateway/opentelemetry/model-calls-and-metrics#harness-lifecycle)
- <a id="tool-execution-and-loop-detection" />[工具执行和循环检测](/gateway/opentelemetry/model-calls-and-metrics#tool-execution-and-loop-detection)
- <a id="exec" />[EExec](/gateway/opentelemetry/model-calls-and-metrics#exec)
- <a id="diagnostics-internals-(memory%2C-payloads%2C-exporter-health)" /><a id="diagnostics-internals-memory-payloads-exporter-health" />[诊断内部结构（内存、有效负载、导出器运行状况）](/gateway/opentelemetry/model-calls-and-metrics#diagnostics-internals-memory-payloads-exporter-health)
- <a id="exported-spans" />[导出的跨度](/gateway/opentelemetry/spans-and-events#exported-spans)
- <a id="diagnostic-event-catalog" />[诊断事件目录](/gateway/opentelemetry/spans-and-events#diagnostic-event-catalog)
- <a id="without-an-exporter" />[没有出口商](/gateway/opentelemetry/setup#without-an-exporter)
- <a id="disable" />[禁用](/gateway/opentelemetry/setup#disable)

## <a id="related"></a> 相关内容

- [日志记录](/logging) - 文件日志、控制台输出、CLI 尾随，以及 Control UI 的日志选项卡
- [网关日志内部机制](/gateway/logging) - WS 日志样式、子系统前缀和控制台捕获
- [诊断标志](/diagnostics/flags) - 定向调试日志标志
- [诊断导出](/gateway/diagnostics) - 运维支持包工具（独立于 OTEL 导出）
- [配置参考](/gateway/config-observability#diagnostics) - 完整的`diagnostics.*`现场参考
- [Prometheus 指标](/gateway/prometheus) - 通过 Diagnostics-prometheus 插件将诊断公开为 Prometheus 文本指标
- [审计历史](/gateway/audit) - 审计分类账以及这些痕迹
