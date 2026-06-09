---
summary: "文件日志、控制台输出、CLI 跟随以及 Control UI 的 Logs 选项卡"
read_when:
  - 你需要了解 OpenClaw 日志的适合初学者的概览
  - 你想配置日志级别、格式或脱敏
  - 你正在排查问题并需要快速找到日志
title: "日志"
---

OpenClaw 有两个主要的日志展示界面：

- **文件日志**（JSON 行），由 Gateway 写入。
- **控制台输出**，显示在终端和 Gateway 调试 UI 中。

Control UI 的 **Logs** 选项卡会跟随 gateway 文件日志。本页解释日志存放位置、
如何阅读，以及如何配置日志级别和格式。

## 日志存放位置

默认情况下，Gateway 会在以下位置写入滚动日志文件：

`/tmp/openclaw/openclaw-YYYY-MM-DD.log`

日期使用 gateway 主机的本地时区。

每个文件在达到 `logging.maxFileBytes`（默认：100 MB）时会轮转。
OpenClaw 会在活动文件旁保留最多五个带编号的归档文件，例如
`openclaw-YYYY-MM-DD.1.log`，并继续写入一个新的活动日志，而不是
停止输出诊断信息。

你可以在 `~/.openclaw/openclaw.json` 中覆盖此设置：

```json
{
  "logging": {
    "file": "/path/to/openclaw.log"
  }
}
```

## 如何读取日志

### CLI：实时跟随（推荐）

使用 CLI 通过 RPC 跟随 gateway 日志文件：

```bash
openclaw logs --follow
```

当前有用的选项：

- `--local-time`：按你的本地时区渲染时间戳
- `--url <url>` / `--token <token>` / `--timeout <ms>`：标准 Gateway RPC 标志
- `--expect-final`：agent 支持的 RPC 最终响应等待标志（通过共享客户端层在此处接受）

输出模式：

- **TTY 会话**：美观、彩色、结构化的日志行。
- **非 TTY 会话**：纯文本。
- `--json`：逐行 JSON（一条日志事件一行）。
- `--plain`：在 TTY 会话中强制使用纯文本。
- `--no-color`：禁用 ANSI 颜色。

当你显式传入 `--url` 时，CLI 不会自动应用配置或环境凭据；
如果目标 Gateway 需要认证，请自行提供 `--token`。

在 JSON 模式下，CLI 会输出带 `type` 标记的对象：

- `meta`：流元数据（文件、游标、大小）
- `log`：解析后的日志条目
- `notice`：截断 / 轮转提示
- `raw`：未解析的日志行

如果隐式的本地回环 Gateway 要求配对、在连接过程中关闭，或者在 `logs.tail` 响应之前超时，
`openclaw logs` 会自动回退到已配置的 Gateway 文件日志。显式指定的 `--url`
目标不会使用此回退机制。`openclaw logs --follow` 更严格：在 Linux 上，如果可用，
它会按 PID 使用活动的 user-systemd Gateway journal；否则它会持续重试实时 Gateway，
而不是跟随一个可能已经过时的并排文件。

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

- `logging.level`：**文件日志**（JSONL）级别。
- `logging.consoleLevel`：**控制台**详细程度级别。

你可以通过 **`OPENCLAW_LOG_LEVEL`** 环境变量同时覆盖两者（例如 `OPENCLAW_LOG_LEVEL=debug`）。
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

### 追踪关联

文件日志是 JSONL。当日志调用携带有效的诊断追踪上下文时，
OpenClaw 会将追踪字段写为顶层 JSON 键（`traceId`、`spanId`、
`parentSpanId`、`traceFlags`），以便外部日志处理器可以将该行与 OTEL
span 以及 provider 的 `traceparent` 传播关联起来。

Gateway HTTP 请求和 Gateway WebSocket 帧会建立一个内部请求追踪
作用域。在该异步作用域内发出的日志和诊断事件，如果未传递显式追踪上下文，
则会继承请求追踪。Agent 运行和模型调用追踪会成为活动请求追踪的子级，
因此本地日志、诊断快照、OTEL spans，以及可信 provider 的 `traceparent`
头部都可以通过 `traceId` 关联起来，而无需记录原始请求或模型内容。

Talk 生命周期日志记录在启用 OpenTelemetry 日志导出时，也会通过
OTLP logs 流向相同的流程，使用与文件日志相同的有界属性。

### 模型调用大小和时序

模型调用诊断会记录有界的请求/响应测量值，而不会捕获原始 prompt 或响应内容：

- `requestPayloadBytes`: UTF-8 byte size of the final model request payload
- `responseStreamBytes`: UTF-8 byte size of streamed model response chunk
  payloads. High-frequency text, thinking, and tool-call delta events count
  only the incremental `delta` bytes instead of full `partial` snapshots.
- `timeToFirstByteMs`: elapsed time before the first streamed response event
- `durationMs`: total model-call duration

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

- `logging.redactSensitive`：`off` | `tools`（默认：`tools`）
- `logging.redactPatterns`：正则字符串列表，用于覆盖默认集合。自定义模式会在 Control UI 工具负载上叠加内置默认规则，因此新增模式不会削弱对默认规则已捕获值的脱敏。

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

诊断是用于模型运行和消息流遥测（webhook、排队、会话状态）的结构化、机器可读事件。
它们不会替代日志——它们为指标、追踪和导出器提供数据。无论你是否导出，
事件都会在进程内发出。

两个相邻的界面：

- **OpenTelemetry 导出** — 通过 OTLP/HTTP 将指标、追踪和日志发送到
  任何兼容 OpenTelemetry 的收集器或后端（Grafana、Datadog、
  Honeycomb、New Relic、Tempo 等）。完整配置、信号目录、指标/span 名称、
  环境变量和隐私模型位于专门页面：
  [OpenTelemetry 导出](/gateway/opentelemetry)。
- **诊断标志** — 有针对性的调试日志标志，会将额外日志路由到
  `logging.file`，而不会提高 `logging.level`。这些标志不区分大小写，
  并支持通配符（`telegram.*`、`*`）。可在 `diagnostics.flags` 下配置，
  或通过 `OPENCLAW_DIAGNOSTICS=...` 环境覆盖。完整指南：
  [诊断标志](/diagnostics/flags)。

要为插件或自定义 sink 启用诊断事件，而不进行 OTLP 导出：

```json5
{
  diagnostics: { enabled: true },
}
```

关于向收集器进行 OTLP 导出，请参见 [OpenTelemetry 导出](/gateway/opentelemetry)。

## 排障提示

- **Gateway 无法连接？** 先运行 `openclaw doctor`。
- **日志为空？** 检查 Gateway 是否正在运行并写入 `logging.file` 中的文件路径。
- **需要更多细节？** 将 `logging.level` 设为 `debug` 或 `trace` 后重试。

## 相关内容

- [OpenTelemetry 导出](/gateway/opentelemetry) — OTLP/HTTP 导出、指标/span 目录、隐私模型
- [诊断标志](/diagnostics/flags) — 有针对性的调试日志标志
- [Gateway 日志内部机制](/gateway/logging) — WS 日志样式、子系统前缀和控制台捕获
- [配置参考](/gateway/configuration-reference#diagnostics) — 完整的 `diagnostics.*` 字段参考
