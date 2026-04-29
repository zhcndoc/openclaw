---
summary: "日志输出面、文件日志、WS 日志样式和控制台格式化"
read_when:
  - 更改日志输出或格式
  - 调试 CLI 或网关输出
title: "网关日志"
---

# 日志

面向用户的概览（CLI + 控制 UI + 配置）请参见 [/logging](/logging)。

OpenClaw 有两个日志“输出面”：

- **控制台输出**（你在终端 / 调试 UI 中看到的内容）。
- **文件日志**（JSON 行），由网关日志记录器写入。

## 基于文件的日志记录器

- 默认轮转日志文件位于 `/tmp/openclaw/` 下（每天一个文件）：`openclaw-YYYY-MM-DD.log`
  - 日期使用网关主机的本地时区。
- 活动日志文件在 `logging.maxFileBytes` 处轮转（默认：100 MB），保留
  最多五个带编号的归档文件，并继续写入一个新的活动文件。
- 日志文件路径和级别可通过 `~/.openclaw/openclaw.json` 配置：
  - `logging.file`
  - `logging.level`

文件格式为每行一个 JSON 对象。

控制 UI 的 Logs 选项卡通过网关（`logs.tail`）跟踪此文件。
CLI 也可以执行相同操作：

```bash
openclaw logs --follow
```

**详细模式与日志级别**

- **文件日志** 仅由 `logging.level` 控制。
- `--verbose` 只影响 **控制台详细程度**（以及 WS 日志样式）；它**不会**
  提高文件日志级别。
- 若要在文件日志中捕获仅在详细模式下才有的信息，请将 `logging.level` 设为 `debug` 或
  `trace`。

## 控制台捕获

CLI 会捕获 `console.log/info/warn/error/debug/trace` 并将它们写入文件日志，
同时仍然输出到 stdout/stderr。

你可以通过以下选项单独调整控制台详细程度：

- `logging.consoleLevel`（默认 `info`）
- `logging.consoleStyle`（`pretty` | `compact` | `json`）

## 脱敏

OpenClaw 可以在日志或转录输出离开进程之前屏蔽敏感令牌。此日志脱敏策略会应用于控制台、文件日志、OTLP
日志记录以及会话转录文本输出，因此匹配到的密钥值会在 JSONL 行或消息写入磁盘之前被屏蔽。

- `logging.redactSensitive`: `off` | `tools`（默认：`tools`）
- `logging.redactPatterns`: 正则字符串数组（覆盖默认值）
  - 使用原始正则字符串（自动 `gi`），或者在需要自定义标志时使用 `/pattern/flags`。
  - 匹配内容会被屏蔽：保留前 6 个 + 后 4 个字符（长度 >= 18），否则为 `***`。
  - 默认规则覆盖常见的键赋值、CLI 标志、JSON 字段、Bearer 标头、PEM 块以及常见令牌前缀。

某些安全边界无论 `logging.redactSensitive` 如何设置都会始终脱敏。
这包括控制 UI 的工具调用事件、`sessions_history` 工具输出、
诊断支持导出、提供方错误观测、exec 批准命令
显示，以及网关 WebSocket 协议日志。这些输出面仍然可能使用
`logging.redactPatterns` 作为额外模式，但 `redactSensitive: "off"`
不会让它们输出原始密钥。

## 网关 WebSocket 日志

网关以两种模式打印 WebSocket 协议日志：

- **正常模式（不带 `--verbose`）**：只打印“有意思”的 RPC 结果：
  - 错误（`ok=false`）
  - 慢调用（默认阈值：`>= 50ms`）
  - 解析错误
- **详细模式（`--verbose`）**：打印所有 WS 请求/响应流量。

### WS 日志样式

`openclaw gateway` 支持按网关切换样式：

- `--ws-log auto`（默认）：正常模式为优化输出；详细模式使用紧凑输出
- `--ws-log compact`：详细模式下使用紧凑输出（成对请求/响应）
- `--ws-log full`：详细模式下使用完整的逐帧输出
- `--compact`：`--ws-log compact` 的别名

示例：

```bash
# 优化输出（仅错误/慢调用）
openclaw gateway

# 显示所有 WS 流量（成对）
openclaw gateway --verbose --ws-log compact

# 显示所有 WS 流量（完整元数据）
openclaw gateway --verbose --ws-log full
```

## 控制台格式化（子系统日志）

控制台格式化器具有 **TTY 感知**，并打印一致、带前缀的行。
子系统日志记录器会让输出保持分组且易于浏览。

行为：

- 每一行都有 **子系统前缀**（例如 `[gateway]`、`[canvas]`、`[tailscale]`）
- **子系统颜色**（每个子系统稳定一致）加上级别着色
- 当输出为 TTY 或环境看起来像富终端时使用颜色（`TERM`/`COLORTERM`/`TERM_PROGRAM`），并尊重 `NO_COLOR`
- **缩短的子系统前缀**：去掉前导 `gateway/` + `channels/`，保留最后 2 段（例如 `whatsapp/outbound`）
- **按子系统划分的子日志记录器**（自动前缀 + 结构化字段 `{ subsystem }`）
- 用于 QR/UX 输出的 **`logRaw()`**（无前缀、无格式化）
- **控制台样式**（例如 `pretty | compact | json`）
- **独立于文件日志级别的控制台日志级别**（当 `logging.level` 设为 `debug`/`trace` 时，文件日志保留完整细节）
- **WhatsApp 消息正文**在 `debug` 级别记录（使用 `--verbose` 可查看）

这在保持现有文件日志稳定的同时，使交互式输出更易浏览。

## 相关内容

- [日志](/logging)
- [OpenTelemetry 导出](/gateway/opentelemetry)
- [诊断导出](/gateway/diagnostics)
