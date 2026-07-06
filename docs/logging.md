---
summary: "文件日志、控制台输出、CLI 跟随以及 Control UI 的 Logs 选项卡"
read_when:
  - 你需要了解 OpenClaw 日志的适合初学者的概览
  - 你想配置日志级别、格式或脱敏
  - 你正在排查问题并需要快速找到日志
title: "日志"
---

OpenClaw 有两个主要的日志展示界面：

- **文件日志**（JSON 行）由 Gateway 写入。
- **终端中的控制台输出**，即运行 Gateway 的终端。

Control UI 的 **Logs** 选项卡会跟随 gateway 文件日志。本页解释日志存放位置、
如何阅读，以及如何配置日志级别和格式。

## 日志存放位置

默认情况下，Gateway 每天会写入一个滚动日志文件：

`/tmp/openclaw/openclaw-YYYY-MM-DD.log`

日期使用网关主机的本地时区。当 `/tmp/openclaw` 不安全
或不可用时（在 Windows 上始终如此），OpenClaw 会改用位于操作系统临时目录下、按用户作用域划分的
`openclaw-<uid>` 目录。带日期的日志文件会在 24 小时后清理。

当下一次写入将超过 `logging.maxFileBytes`
（默认：100 MB）时，每个文件会轮转。OpenClaw 会在活动文件旁保留最多五个带编号的归档文件，例如
`openclaw-YYYY-MM-DD.1.log`，并继续写入新的活动日志，而不是停止输出诊断信息。

你可以在 `~/.openclaw/openclaw.json` 中覆盖该路径：

```json
{
  "logging": {
    "file": "/path/to/openclaw.log"
  }
}
```

## 如何读取日志

### CLI：实时跟随（推荐）

通过 RPC 跟随网关日志文件：

```bash
openclaw logs --follow
```

选项：

| 标志                | 默认值   | 行为                                                                                 |
| ------------------- | -------- | ------------------------------------------------------------------------------------ |
| `--follow`          | 关闭     | 持续跟随；断开连接时会以退避方式重新连接                                               |
| `--limit <n>`       | `200`    | 每次获取的最大行数                                                                   |
| `--max-bytes <n>`   | `250000` | 每次读取的最大字节数                                                                 |
| `--interval <ms>`   | `1000`   | 跟随时的轮询间隔                                                                     |
| `--json`            | 关闭     | 按行分隔的 JSON（每行一个事件）                                                      |
| `--plain`           | 关闭     | 在 TTY 会话中强制使用纯文本                                                           |
| `--no-color`        | —        | 禁用 ANSI 颜色                                                                       |
| `--utc`             | 关闭     | 以 UTC 显示时间戳（默认使用本地时间）                                                |
| `--local-time`      | 关闭     | 为本地时间默认值保留的兼容写法；除此之外无效果                                         |
| `--url` / `--token` | —        | 标准 Gateway RPC 标志                                                               |
| `--timeout <ms>`    | `30000`  | Gateway RPC 超时时间                                                                 |
| `--expect-final`    | 关闭     | 由 Agent 支持的 RPC 最终响应等待标志（此处通过共享客户端层接受）                      |

输出模式：

- **TTY 会话**：美化、带颜色、结构化的日志行。
- **非 TTY 会话**：纯文本。

当你显式传入 `--url` 时，CLI 不会自动应用配置或
环境凭据；请自行添加 `--token`，否则调用会失败，并提示
`gateway url override requires explicit credentials`。

在 JSON 模式下，CLI 会输出带 `type` 标记的对象：

- `meta`：流元数据（文件、来源、来源类型、服务、游标、大小）
- `log`：已解析的日志条目
- `notice`：截断 / 轮转提示
- `raw`：未解析的日志行
- `error`：Gateway 连接失败（写入 stderr）

如果隐式的本地回环 Gateway 请求配对、在连接期间关闭，
或在 `logs.tail` 响应前超时，`openclaw logs` 会自动回退到
已配置的 Gateway 文件日志。显式的 `--url` 目标不会使用
此回退。`openclaw logs --follow` 更严格：在 Linux 上，它会在可用时通过 PID 使用当前
user-systemd Gateway 日志；否则会以退避方式重试实时 Gateway，
而不是跟随一个可能已过时的并行文件。

如果 Gateway 不可达，CLI 会打印一条简短提示，建议运行：

```bash
openclaw doctor
```

### Control UI（Web）

Control UI 的 **Logs** 选项卡会使用 `logs.tail` 跟随同一个文件。
关于如何打开它，请参见 [Control UI](/web/control-ui)。

### 仅限通道的日志

要过滤通道活动（WhatsApp/Telegram 等），请使用：

```bash
openclaw channels logs --channel whatsapp
```

`--channel` 默认为 `all`；`--lines <n>`（默认 200）和 `--json` 也可用。

## 日志格式

### 文件日志（JSONL）

日志文件中的每一行都是一个 JSON 对象。CLI 和 Control UI 会解析这些
条目，以渲染结构化输出（时间、级别、子系统、消息）。

在可用时，文件日志的 JSONL 记录还会包含可供机器过滤的顶层字段：

- `hostname`：gateway 主机名。
- `message`：展平后的日志消息文本，便于全文搜索。
- `agent_id`：当日志调用携带 agent 上下文时的活动 agent id。
- `session_id`：当日志调用携带 session 上下文时的活动 session id/key。
- `channel`：当日志调用携带 channel 上下文时的活动通道。

OpenClaw 会在保留这些字段的同时保留原始的结构化日志参数，
因此读取带编号 tslog 参数键的现有解析器仍然可以正常工作。

Talk、实时语音以及托管房间活动也会通过同一文件日志管道输出有界生命周期日志
记录。这些记录在可用时包含事件类型、模式、传输、提供方以及大小/时间测量值，
但不会包含转录文本、音频载荷、turn id、call id 和提供方 item id。

### 控制台输出

控制台日志具有 **TTY 感知**，并针对可读性进行了格式化：

- 子系统前缀（例如 `gateway/channels/whatsapp`）
- 级别着色（info/warn/error）
- 可选的紧凑或 JSON 模式

控制台格式由 `logging.consoleStyle` 控制。

### Gateway WebSocket 日志

`openclaw gateway` 也提供用于 RPC 流量的 WebSocket 协议日志：

- 正常模式：仅显示有价值的结果（错误、解析错误、慢调用）
- `--verbose`：显示全部请求 / 响应流量
- `--ws-log auto|compact|full`：选择详细渲染样式
- `--compact`：`--ws-log compact` 的别名

示例：

```bash
openclaw gateway
openclaw gateway --verbose --ws-log compact
openclaw gateway --verbose --ws-log full
```

## 配置日志

所有日志配置都位于 `~/.openclaw/openclaw.json` 的 `logging` 下。

```json
{
  "logging": {
    "level": "info",
    "file": "/tmp/openclaw/openclaw-YYYY-MM-DD.log",
    "consoleLevel": "info",
    "consoleStyle": "pretty",
    "redactSensitive": "tools",
    "redactPatterns": ["sk-.*"]
  }
}
```

### 日志级别

级别：`silent`、`fatal`、`error`、`warn`、`info`、`debug`、`trace`。

- `logging.level`: **文件日志**（JSONL）级别（默认：`info`）。
- `logging.consoleLevel`: **控制台** 详细程度级别。

你可以通过 **`OPENCLAW_LOG_LEVEL`** 环境变量同时覆盖两者（例如，`OPENCLAW_LOG_LEVEL=debug`）。
环境变量优先于配置文件，因此你可以在不编辑 `openclaw.json` 的情况下，
仅对单次运行提高详细程度。你也可以传入全局 CLI 选项 **`--log-level <level>`**
（例如，`openclaw --log-level debug gateway run`），它会覆盖该命令的环境变量。

`--verbose` 只影响控制台输出和 WS 日志详细程度；它不会更改
文件日志级别。

### 定向模型传输诊断

在调试提供方调用时，请使用定向环境标志，而不是把所有日志都提升到 `debug`：

```bash
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 openclaw gateway
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools OPENCLAW_DEBUG_SSE=events openclaw gateway
```

可用标志：

- `OPENCLAW_DEBUG_MODEL_TRANSPORT=1`：在 `info` 级别输出请求开始、获取响应、SDK
  头、首个流式事件、流完成和传输错误。
- `OPENCLAW_DEBUG_MODEL_PAYLOAD=summary`：在模型请求日志中包含有界的请求载荷
  摘要。
- `OPENCLAW_DEBUG_MODEL_PAYLOAD=tools`：在载荷摘要中包含所有面向模型的工具名称。
- `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted`：包含已脱敏、已截断的 JSON
  载荷快照。仅在调试时使用；机密信息会被脱敏，但提示词和消息文本可能仍会保留。
- `OPENCLAW_DEBUG_SSE=events`：输出首个事件和流完成时间。
- `OPENCLAW_DEBUG_SSE=peek`：还会输出前五个已脱敏的 SSE 事件
  载荷，并按事件截断。
- `OPENCLAW_DEBUG_CODE_MODE=1`：输出代码模式的模型表面诊断，
  包括当原生提供方工具因代码模式接管工具表面而被隐藏时的情况。

这些标志会通过正常的 OpenClaw 日志记录，因此 `openclaw logs --follow`
和 Control UI 的 Logs 选项卡都能显示它们。若不使用这些标志，相同的诊断信息
仍可在 `debug` 级别下查看。

`[model-fetch]` start 和 response 元数据（provider、API、model、status、
latency，以及 method、URL、timeout、proxy 和 policy 等请求字段）
始终会在 `info` 级别输出，不受
`OPENCLAW_DEBUG_MODEL_TRANSPORT` 影响，因此即使没有 debug 标志，也能看到基本的模型传输健康信息。

### Trace 关联

文件日志是 JSONL。当日志调用携带有效的诊断追踪上下文时，
OpenClaw 会将追踪字段写为顶层 JSON 键（`traceId`、`spanId`、
`parentSpanId`、`traceFlags`），以便外部日志处理器可以将该行与 OTEL
span 以及 provider 的 `traceparent` 传播关联起来。

Gateway HTTP 请求和 Gateway WebSocket 帧会建立一个内部请求追踪
作用域。在该异步作用域内发出的日志和诊断事件，如果未传递显式追踪上下文，
则会继承请求追踪。Agent 运行和模型调用追踪会成为活动请求追踪的子级，
因此本地日志、诊断快照、OTEL spans，以及可信 provider 的 `traceparent`
头部都可以通过 `traceId` 关联起来，而无需记录原始请求或模型内容。

Talk 生命周期日志记录在启用 OpenTelemetry 日志导出时，也会流向 diagnostics-otel 日志导出，
并使用与文件日志相同的有界属性。请配置 `diagnostics.otel.logsExporter` 来选择 OTLP、stdout JSONL
或两者作为输出目标。

### 模型调用大小和时序

模型调用诊断会记录有界的请求/响应测量值，而不会捕获原始 prompt 或响应内容：

- `requestPayloadBytes`: UTF-8 字节大小，表示最终模型请求载荷
- `responseStreamBytes`: 流式模型响应分块载荷的 UTF-8 字节大小。高频文本、思考和工具调用 delta 事件只计算增量 `delta` 字节，而不是完整的 `partial` 快照。
- `timeToFirstByteMs`: 第一个流式响应事件到达前经过的时间
- `durationMs`: 模型调用总耗时

这些字段在启用诊断导出时，可用于诊断快照、模型调用插件钩子以及
OTEL 模型调用 spans/metrics。

### 控制台样式

`logging.consoleStyle`：

- `pretty`：对人友好，带颜色，带时间戳。
- `compact`：更紧凑的输出（适合长会话）。
- `json`：每行一个 JSON（供日志处理器使用）。

### 脱敏

OpenClaw 可以在敏感令牌到达控制台输出、文件日志、
OTLP 日志记录、持久化会话转录文本或 Control UI 工具事件负载
之前对其进行脱敏（工具开始参数、部分/最终结果负载、派生的
exec 输出以及 patch 摘要）：

- `logging.redactSensitive`: `off` | `tools`（默认：`tools`）
- `logging.redactPatterns`: 用于日志/转录输出、替换默认集合的正则字符串列表。对于 Control UI 工具负载，自定义模式会叠加在内置默认规则之上，因此添加新模式不会削弱对默认规则已捕获值的脱敏效果。

文件日志和会话转录仍然保持 JSONL 格式，但匹配到的密钥值会在
写入磁盘之前被掩码。脱敏是尽力而为的：它适用于带文本内容的消息
和日志字符串，而不是每一个标识符或二进制载荷字段。

内置默认规则覆盖常见的 API 凭据和支付凭据字段名，例如卡号、CVC/CVV、共享支付令牌和 payment credential，
当它们以 JSON 字段、URL 参数、CLI 标志或赋值形式出现时。

`logging.redactSensitive: "off"` 只会禁用这种通用日志/转录
策略。OpenClaw 仍会对可展示给 UI 客户端、支持包、诊断观察器、
审批提示或 agent 工具的安全边界负载进行脱敏。示例包括 Control UI
工具调用事件、`sessions_history` 输出、诊断支持导出、provider 错误观察、
exec 审批命令显示以及 Gateway WebSocket 协议日志。自定义
`logging.redactPatterns` 仍可在这些表面上添加项目特定模式。

## 诊断与 OpenTelemetry

诊断是针对模型运行和消息流遥测（webhook、队列、会话状态）的结构化、机器可读事件。它们**不会**取代日志——而是为指标、追踪和导出器提供数据。默认情况下，事件会在进程内发出（将 `diagnostics.enabled: false` 设置为关闭它们）；导出它们是单独进行的。

两个相邻的界面：

- **OpenTelemetry 导出** — 通过 OTLP/HTTP 将指标、追踪和日志发送到任何兼容 OpenTelemetry 的收集器或后端（Datadog、Grafana、Honeycomb、New Relic、Tempo 等）。完整配置、信号目录、指标/跨度名称、环境变量和隐私模型都在专门页面中：[OpenTelemetry 导出](/gateway/opentelemetry)。
- **诊断标志** — 定向调试日志标志，将额外日志路由到 `logging.file`，而不会提高 `logging.level`。标志不区分大小写，并支持通配符（`telegram.*`、`*`）。在 `diagnostics.flags` 下配置，或通过 `OPENCLAW_DIAGNOSTICS=...` 环境变量覆盖。完整指南：[诊断标志](/diagnostics/flags)。

关于向收集器进行 OTLP 导出，请参见 [OpenTelemetry 导出](/gateway/opentelemetry)。

## Troubleshooting Tips

- **Gateway can't connect?** First run `openclaw doctor`.
- **Logs are empty?** Check whether Gateway is running and writing to the file path in `logging.file`.
- **Need more details?** Set `logging.level` to `debug` or `trace` and try again.

## 相关内容

- [OpenTelemetry 导出](/gateway/opentelemetry) — OTLP/HTTP 导出、指标/span 目录、隐私模型
- [诊断标志](/diagnostics/flags) — 有针对性的调试日志标志
- [Gateway 日志内部机制](/gateway/logging) — WS 日志样式、子系统前缀和控制台捕获
- [配置参考](/gateway/configuration-reference#diagnostics) — 完整的 `diagnostics.*` 字段参考
