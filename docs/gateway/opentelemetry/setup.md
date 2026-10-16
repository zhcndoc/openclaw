---
summary: "安装并启用diagnostics-otel，查看哪些进程导出，检查导出器运行状况，并关闭导出"
title: "设置 OpenTelemetry 导出"
sidebarTitle: "设置"
read_when:
  - "你想将 OpenClaw 的模型使用情况、消息流或会话指标发送到 OpenTelemetry 收集器"
  - "您需要知道网关运行、一次性本地运行还是 `openclaw agent exec` 导出遥测数据"
  - "您正在检查导出器的运行状况，或关闭导出管道"
---

## <a id="quick-start"></a> 快速开始

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

加载插件后，对 `diagnostics.otel` 的更改仅热重载其导出器服务。在使用新端点、标头、采样和信号设置开始替换之前，上一代会取消订阅并刷新。其他插件服务、通道和网关连接保持运行。清理或启动失败请求网关恢复，而不是留下部分替换的导出器。

`diagnostics.enabled` 也热应用于共享调度程序及其心跳。网关拥有整个进程的心跳；停止通道会使其继续运行。使用插件 SDK 的独立主机为其进程拥有 `startDiagnosticHeartbeat` 和 `stopDiagnosticHeartbeat`，而不是每个通道都拥有它们。禁用它会停止诊断采样和恢复侦听器；启用它会再次启动它们。预加载的 OpenTelemetry SDK 保留其提供程序和传输的所有权：这些更改不会关闭或重新配置主机 SDK。

<Note>
`diagnostics.otel.protocol` 仅接受 `http/protobuf`。如果持久配置（包括通过 `${VAR}` 插值提供的值）仍将此字段解析为已停用的 `grpc` 值，请运行 [`openclaw doctor --fix`](/cli/doctor)。 Doctor 修复直接创作的值和最深的内部单文件包含，该包含仅拥有更改的 `diagnostics.otel` 密钥，包括明确的嵌套包含链。对于根包含、实际数组条目包含、包含数组、同级覆盖、相同路径或祖先合并、跨越所有权边界的更改、外部包含目标、仍编写嵌套 `$include` 指令的所属文件或其他不明确的源，Doctor 保持文件不变并列出要手动编辑的候选源文件或文件。当同一运行还需要 root 拥有的修复时，例如遗留代理名册，Doctor 会拒绝该写入；被拒绝的写入使每个文件保持不变（同一运行中较早的写入保持保存），Doctor 在重新运行之前手动命名要修复的边界，加上根文件创作该边界的 `$include` 时包含的一个或多个文件（代理名册边界在没有其文件的情况下命名）。

当 `diagnostics.otel.protocol` 未设置时，每个插件拥有的 OTLP 信号首先检查其非空 `OTEL_EXPORTER_OTLP_*_PROTOCOL` 值，然后检查 `OTEL_EXPORTER_OTLP_PROTOCOL`，然后默认为 `http/protobuf`。 Doctor 不会重写进程环境变量。不支持的值仅禁用插件拥有的 OTLP 信号；支持的同级信号继续，`logsExporter: "both"` 的标准输出分支也是如此。预加载的跟踪和指标 SDK 拥有自己的传输选择，并且不会被此插件拒绝。
</Note>

## <a id="which-processes-export"></a> 哪些进程会导出

- **Gateway** 会在启动时启动导出器，并为其执行的每次运行从 Gateway 进程中导出，包括分派给它的 `openclaw agent` 运行。
- **一次性本地运行** （`openclaw agent --local`） 在CLI进程中执行。配置 OTel 导出并启用插件后，同一 CLI 进程会启动一个导出器实例来运行，并在进程退出之前刷新缓冲的范围、指标和日志。 CLI 最多等待 5 秒等待诊断事件队列耗尽，再等待 10 秒等待刷新，因此无法访问的收集器无法保持命令打开。接受连接但从不应答的收集器仍然可以延迟退出，直到导出器自己的请求超时 （`OTEL_EXPORTER_OTLP_TIMEOUT`）。插件注册资源将保持打开状态，直到导出器清理完成，即使任一等待超时也是如此。在 JSON 输出模式下，这些一次性运行仅抑制标准输出 JSONL 日志接收器，因此命令标准输出保留为 JSON 响应保留； OTLP 跟踪、指标和日志在配置后会继续。
- `openclaw agent exec` 还运行嵌入在 CLI 进程中的代理，但不启动此导出器，因此其运行导出不遥测。当您需要无头运行的跟踪时，通过网关调度，或使用 `openclaw agent --local`。

## <a id="exporter-health"></a> 导出器健康状态

`openclaw doctor` 和 `openclaw status --all` 会显示正在运行的 Gateway 针对每种信号和传输方式的最新可信导出器状态的有限、已脱敏快照。对于 `diagnostics-otel`，该快照会区分：

- 配置或 `OTEL_*` 环境变量回退机制提供端点的 OTLP/HTTP protobuf。
- 未提供端点时使用导出器依赖项默认端点的 OTLP/HTTP protobuf。
- 标准输出日志导出。
- 由外部预加载的 OpenTelemetry SDK 所拥有的跟踪或指标导出。

OTLP 导出失败和恢复的状态转换记录自导出器的最终结果回调，即依赖项负责的重试完成之后。因此，之后成功的可重试响应不会被报告为失败。启动、日志准备或发送、导出以及关闭失败使用固定的原因类别，而不是原始错误。

快照绝不会包含端点值、标头、证书、负载或原始错误消息。传输方式仅保留在此本地健康状态投影中。它不会添加到现有的 `openclaw.telemetry.exporter.events` 指标属性中，现有的 Prometheus 标签集合也不会改变。

## <a id="without-an-exporter"></a> 不使用导出器

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

标志输出会写入标准日志文件（`logging.file`），并且仍会受到始终启用的日志脱敏策略处理。完整指南： [诊断标志](/diagnostics/flags)。

## <a id="disable"></a> 禁用

```json5
{
  diagnostics: { otel: { enabled: false } },
}
```

或者将 `diagnostics-otel` 从 `plugins.allow` 中移除，或者运行 `openclaw plugins disable diagnostics-otel`。

当插件原本会拥有 NodeSDK 时，在禁用所有插件拥有的导出器、监听器、健康检查路由和标准输出接收器的同时，保持传播功能可用：

```bash
OTEL_SDK_DISABLED=true openclaw gateway
```
