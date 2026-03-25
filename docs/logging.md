---
summary: "日志概述：文件日志、控制台输出、CLI 实时查看和控制界面"
read_when:
  - You need a beginner-friendly overview of logging
  - You want to configure log levels or formats
  - You are troubleshooting and need to find logs quickly
title: "Logging Overview"
---

# 日志

OpenClaw 的日志记录在两个地方：

- **文件日志**（JSON 行格式），由 Gateway 写入。
- **控制台输出**，显示在终端和控制界面中。

本页介绍日志存放位置、如何读取日志，以及如何配置日志级别和格式。

## 日志存放位置

默认情况下，Gateway 会写入滚动日志文件，位置如下：

`/tmp/openclaw/openclaw-YYYY-MM-DD.log`

日期使用 Gateway 主机的本地时区。

你可以在 `~/.openclaw/openclaw.json` 中覆盖此路径：

```json
{
  "logging": {
    "file": "/path/to/openclaw.log"
  }
}
```

## 如何读取日志

### CLI：实时查看（推荐）

使用 CLI 通过 RPC 实时查看 Gateway 日志文件：

```bash
openclaw logs --follow
```

输出模式：

- **TTY 会话**：美观，带颜色，结构化的日志行。
- **非 TTY 会话**：纯文本。
- `--json`：行分隔的 JSON（每行一个日志事件）。
- `--plain`：TTY 会话强制输出纯文本。
- `--no-color`：禁用 ANSI 颜色。

JSON 模式下，CLI 输出带有 `type` 标签的对象：

- `meta`：流元数据（文件、光标、大小）
- `log`：解析后的日志条目
- `notice`：截断 / 轮换提示
- `raw`：未解析的日志行

如果 Gateway 无法连接，CLI 会打印一条简短提示，建议运行：

```bash
openclaw doctor
```

### 控制界面（网页）

控制界面的 **日志** 标签使用 `logs.tail` 实时查看同一日志文件。详情见 [/web/control-ui](/web/control-ui)。

### 仅频道日志

要过滤频道活动（WhatsApp/Telegram 等），可使用：

```bash
openclaw channels logs --channel whatsapp
```

## 日志格式

### 文件日志（JSONL）

日志文件中的每一行都是一个 JSON 对象。CLI 和控制界面解析这些条目来渲染结构化输出（时间、级别、子系统、信息）。

### 控制台输出

控制台日志针对 TTY 环境进行格式化，便于阅读：

- 子系统前缀（例如 `gateway/channels/whatsapp`）
- 级别着色（info/warn/error）
- 可选的紧凑格式或 JSON 模式

控制台格式由 `logging.consoleStyle` 控制。

## 配置日志

所有日志配置均位于 `~/.openclaw/openclaw.json` 的 `logging` 下。

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
- `logging.consoleLevel`：**控制台**详细级别。

两者均可通过环境变量 **`OPENCLAW_LOG_LEVEL`** 覆盖（如 `OPENCLAW_LOG_LEVEL=debug`）。环境变量优先于配置文件，方便单次提高日志详细度，无需编辑配置。你也可以通过全局 CLI 选项 **`--log-level <level>`**（例如 `openclaw --log-level debug gateway run`）覆盖环境变量，仅针对当前命令。

`--verbose` 只影响控制台输出，不改变文件日志级别。

### 控制台样式

`logging.consoleStyle` 可配置为：

- `pretty`：人类友好，带颜色和时间戳。
- `compact`：更紧凑输出（适合长时间会话）。
- `json`：每行 JSON（用于日志处理器）。

### 脱敏

工具概要能在日志输出到控制台前脱敏敏感令牌：

- `logging.redactSensitive`：`off` | `tools`（默认：`tools`）
- `logging.redactPatterns`：覆盖默认脱敏规则的正则表达式列表

脱敏仅影响**控制台输出**，不修改文件日志。

## 诊断 + OpenTelemetry

诊断是针对模型运行及消息流遥测（Webhook、队列、会话状态）的结构化、机器可读事件。诊断不替代日志，而是用于提供指标、跟踪和其他导出。

诊断事件在进程内发出，导出器仅在诊断和导出插件启用时附加。

### OpenTelemetry 与 OTLP

- **OpenTelemetry (OTel)**：包括跟踪、指标和日志的数据模型及 SDK。
- **OTLP**：用于将 OTel 数据导出到收集器/后台的传输协议。
- OpenClaw 当前通过 **OTLP/HTTP（protobuf）** 导出。

### 导出信号

- **指标**：计数器与直方图（令牌使用、消息流、排队）。
- **跟踪**：模型使用及 Webhook/消息处理跨度。
- **日志**：启用 `diagnostics.otel.logs` 时通过 OTLP 导出。日志量可能较大，留意 `logging.level` 和导出过滤器。

### 诊断事件目录

模型使用：

- `model.usage`：令牌、成本、持续时间、上下文、提供商/模型/频道、会话 ID。

消息流：

- `webhook.received`：各频道的 webhook 收到。
- `webhook.processed`：webhook 处理完成及耗时。
- `webhook.error`：webhook 处理错误。
- `message.queued`：消息入队待处理。
- `message.processed`：结果、耗时及可选错误。

队列与会话：

- `queue.lane.enqueue`：命令队列通道入队与深度。
- `queue.lane.dequeue`：命令队列通道出队与等待时间。
- `session.state`：会话状态变更及原因。
- `session.stuck`：会话卡住警告及时长。
- `run.attempt`：运行重试/尝试元数据。
- `diagnostic.heartbeat`：聚合计数器（webhook/队列/会话）。

### 启用诊断（无导出器）

如果你需要诊断事件供插件或自定义接收端使用，可开启：

```json
{
  "diagnostics": {
    "enabled": true
  }
}
```

### 诊断标志（针对日志）

通过标志开启额外的有针对性的调试日志，无需提高通用 `logging.level`。标志不区分大小写，支持通配符（如 `telegram.*` 或 `*`）。

```json
{
  "diagnostics": {
    "flags": ["telegram.http"]
  }
}
```

环境变量覆盖（一次性使用）：

```
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload
```

备注：

- 标志日志写入标准日志文件（同 `logging.file`）。
- 输出仍会遵循 `logging.redactSensitive` 脱敏规则。
- 完整指南见：[/diagnostics/flags](/diagnostics/flags)。

### 导出到 OpenTelemetry

诊断可通过 `diagnostics-otel` 插件导出（OTLP/HTTP），支持任何接受 OTLP/HTTP 的 OpenTelemetry 收集器/后台。

```json
{
  "plugins": {
    "allow": ["diagnostics-otel"],
    "entries": {
      "diagnostics-otel": {
        "enabled": true
      }
    }
  },
  "diagnostics": {
    "enabled": true,
    "otel": {
      "enabled": true,
      "endpoint": "http://otel-collector:4318",
      "protocol": "http/protobuf",
      "serviceName": "openclaw-gateway",
      "traces": true,
      "metrics": true,
      "logs": true,
      "sampleRate": 0.2,
      "flushIntervalMs": 60000
    }
  }
}
```

备注：

- 也可使用命令 `openclaw plugins enable diagnostics-otel` 启用此插件。
- `protocol` 当前仅支持 `http/protobuf`，`grpc` 被忽略。
- 指标包括令牌使用、成本、上下文大小、运行时长和消息流计数器/直方图（webhook、排队、会话状态、队列深度/等待）。
- 可分别通过 `traces` / `metrics` 选项（默认开启）切换跟踪和指标。跟踪包括模型使用跨度及启用时的 webhook/消息处理跨度。
- 如收集器需认证，可设置 `headers`。
- 支持的环境变量：`OTEL_EXPORTER_OTLP_ENDPOINT`、`OTEL_SERVICE_NAME`、`OTEL_EXPORTER_OTLP_PROTOCOL`。

### 导出指标（名称及类型）

模型使用：

- `openclaw.tokens`（计数器，属性：`openclaw.token`，`openclaw.channel`，`openclaw.provider`，`openclaw.model`）
- `openclaw.cost.usd`（计数器，属性：`openclaw.channel`，`openclaw.provider`，`openclaw.model`）
- `openclaw.run.duration_ms`（直方图，属性：`openclaw.channel`，`openclaw.provider`，`openclaw.model`）
- `openclaw.context.tokens`（直方图，属性：`openclaw.context`，`openclaw.channel`，`openclaw.provider`，`openclaw.model`）

消息流：

- `openclaw.webhook.received`（计数器，属性：`openclaw.channel`，`openclaw.webhook`）
- `openclaw.webhook.error`（计数器，属性：`openclaw.channel`，`openclaw.webhook`）
- `openclaw.webhook.duration_ms`（直方图，属性：`openclaw.channel`，`openclaw.webhook`）
- `openclaw.message.queued`（计数器，属性：`openclaw.channel`，`openclaw.source`）
- `openclaw.message.processed`（计数器，属性：`openclaw.channel`，`openclaw.outcome`）
- `openclaw.message.duration_ms`（直方图，属性：`openclaw.channel`，`openclaw.outcome`）

队列与会话：

- `openclaw.queue.lane.enqueue`（计数器，属性：`openclaw.lane`）
- `openclaw.queue.lane.dequeue`（计数器，属性：`openclaw.lane`）
- `openclaw.queue.depth`（直方图，属性：`openclaw.lane` 或 `openclaw.channel=heartbeat`）
- `openclaw.queue.wait_ms`（直方图，属性：`openclaw.lane`）
- `openclaw.session.state`（计数器，属性：`openclaw.state`，`openclaw.reason`）
- `openclaw.session.stuck`（计数器，属性：`openclaw.state`）
- `openclaw.session.stuck_age_ms`（直方图，属性：`openclaw.state`）
- `openclaw.run.attempt`（计数器，属性：`openclaw.attempt`）

### 导出跨度（名称及关键属性）

- `openclaw.model.usage`
  - `openclaw.channel`，`openclaw.provider`，`openclaw.model`
  - `openclaw.sessionKey`，`openclaw.sessionId`
  - `openclaw.tokens.*`（输入/输出/缓存读取/缓存写入/总计）
- `openclaw.webhook.processed`
  - `openclaw.channel`，`openclaw.webhook`，`openclaw.chatId`
- `openclaw.webhook.error`
  - `openclaw.channel`，`openclaw.webhook`，`openclaw.chatId`，`openclaw.error`
- `openclaw.message.processed`
  - `openclaw.channel`，`openclaw.outcome`，`openclaw.chatId`，`openclaw.messageId`，`openclaw.sessionKey`，`openclaw.sessionId`，`openclaw.reason`
- `openclaw.session.stuck`
  - `openclaw.state`，`openclaw.ageMs`，`openclaw.queueDepth`，`openclaw.sessionKey`，`openclaw.sessionId`

### 采样与刷新

- 跟踪采样率：`diagnostics.otel.sampleRate`（0.0–1.0，仅根跨度）。
- 指标导出间隔：`diagnostics.otel.flushIntervalMs`（至少 1000 毫秒）。

### 协议说明

- OTLP/HTTP 端点可通过 `diagnostics.otel.endpoint` 或环境变量 `OTEL_EXPORTER_OTLP_ENDPOINT` 设置。
- 如果端点已经包含 `/v1/traces` 或 `/v1/metrics`，则直接使用。
- 如果端点已经包含 `/v1/logs`，则用于日志。
- `diagnostics.otel.logs` 启用 OTLP 日志导出，导出主日志输出。

### 日志导出行为

- OTLP 日志使用与 `logging.file` 写入相同的结构化记录。
- 遵守 `logging.level`（文件日志级别）。控制台脱敏不影响 OTLP 日志。
- 高流量安装建议使用 OTLP 收集器进行采样和过滤。

## 排查提示

- **Gateway 无法访问？** 先运行 `openclaw doctor`。
- **日志为空？** 检查 Gateway 是否运行以及 `logging.file` 中指定的路径是否有写入。
- **需要更多细节？** 将 `logging.level` 设为 `debug` 或 `trace` 后重试。
