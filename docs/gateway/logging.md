---
summary: "日志输出端口、文件日志、WebSocket 日志样式和控制台格式"
read_when:
  - 更改日志输出或格式
  - 调试 CLI 或网关输出
title: "网关日志记录"
---

# 日志记录

有关面向用户的概览（CLI + 控制 UI + 配置），请参见 [/logging](/logging)。

OpenClaw 有两个日志"输出端"：

- **控制台输出**（你在终端 / 调试 UI 中看到的内容）。
- **文件日志**（由网关日志记录器写入的 JSON 行格式日志）。

## 基于文件的日志记录器

- 默认滚动日志文件位于 `/tmp/openclaw/` （每日一个文件）：`openclaw-YYYY-MM-DD.log`
  - 日期采用网关主机的本地时区。
- 日志文件路径和级别可通过 `~/.openclaw/openclaw.json` 配置：
  - `logging.file`
  - `logging.level`

文件格式为每行一个 JSON 对象。

控制 UI 的日志标签页通过网关（`logs.tail`）实时跟踪此文件。CLI 也可以这样做：

```bash
openclaw logs --follow
```

**详细模式与日志级别**

- **文件日志** 完全由 `logging.level` 控制。
- `--verbose` 仅影响 **控制台的详细程度**（及 WS 日志样式）；不会提升文件日志级别。
- 若要在文件日志中捕获仅详细模式下才有的细节，请将 `logging.level` 设为 `debug` 或 `trace`。

## 控制台捕获

CLI 会捕获 `console.log/info/warn/error/debug/trace` 并将其写入文件日志，同时依然打印至 stdout/stderr。

你可以通过以下配置独立调整控制台详细度：

- `logging.consoleLevel`（默认 `info`）
- `logging.consoleStyle`（`pretty` | `compact` | `json`）

## 脱敏

OpenClaw 可以在日志或转录输出离开进程之前屏蔽敏感令牌。此日志脱敏策略应用于控制台、文件日志、OTLP 日志记录以及会话转录文本输出，因此在写入磁盘之前，匹配到的密钥值会被屏蔽，避免出现在 JSONL 行或消息中。

- `logging.redactSensitive`：`off` | `tools`（默认：`tools`）
- `logging.redactPatterns`：正则表达式字符串数组（覆盖默认规则）
  - 使用原始正则表达式字符串（自动带 `gi` 标志），或者使用 `/pattern/flags` 指定自定义标志。
  - 匹配的内容会保留前 6 个和后 4 个字符（长度 ≥ 18），否则全部替换为 `***`。
  - 默认规则涵盖常见密钥赋值、CLI 参数、JSON 字段、Bearer 头、PEM 块及常用令牌前缀。

无论 `logging.redactSensitive` 如何设置，某些安全边界始终会进行脱敏。
这包括控制 UI 的工具调用事件、`sessions_history` 工具输出、诊断支持导出、提供方错误观察、exec 审批命令显示以及网关 WebSocket 协议日志。这些区域仍可能使用 `logging.redactPatterns` 作为额外模式，但 `redactSensitive: "off"` 不会使其输出原始密钥。

## 网关 WebSocket 日志

网关以两种模式打印 WebSocket 协议日志：

- **普通模式（无 `--verbose`）**：仅打印"重要"的 RPC 结果：
  - 错误（`ok=false`）
  - 慢调用（默认阈值：`>= 50ms`）
  - 解析错误
- **详细模式（`--verbose`）**：打印所有 WS 请求/响应流量。

### WS 日志样式

`openclaw gateway` 支持针对每个网关的样式切换：

- `--ws-log auto`（默认）：普通模式优化输出；详细模式使用紧凑输出
- `--ws-log compact`：详细模式下紧凑输出（请求/响应配对）
- `--ws-log full`：详细模式下完整逐帧输出
- `--compact`：`--ws-log compact` 的别名

示例：

```bash
# 优化输出（仅错误/慢调用）
openclaw gateway

# 显示所有 WS 流量（请求/响应配对）
openclaw gateway --verbose --ws-log compact

# 显示所有 WS 流量（完整元数据）
openclaw gateway --verbose --ws-log full
```

## 控制台格式化（子系统日志）

控制台格式化器 **支持 TTY** 并打印统一带前缀的行。
子系统日志保持输出分组且易于扫描。

特性：

- 每行打印 **子系统前缀**（如 `[gateway]`、`[canvas]`、`[tailscale]`）
- **子系统颜色**（对每个子系统固定）加上级别颜色
- 当输出为 TTY 或环境似乎为富终端（检查 `TERM` / `COLORTERM` / `TERM_PROGRAM`），启用颜色，尊重 `NO_COLOR`
- **简化子系统前缀**：去除前导 `gateway/` 和 `channels/`，保留最后两个片段（例如 `whatsapp/outbound`）
- 按子系统分日志记录器（自动前缀 + 结构化字段 `{ subsystem }`）
- **`logRaw()`** 用于二维码 / UX 输出（无前缀无格式）
- **控制台样式**（例如 `pretty` | `compact` | `json`）
- 控制台日志级别独立于文件日志级别（文件日志在 `logging.level` 设为 `debug` / `trace` 时仍保持完整细节）
- WhatsApp 消息正文会以 `debug` 级别记录（使用 `--verbose` 可查看）

这会在保持现有文件日志稳定的同时，使交互式输出更易于扫描。

## 相关内容

- [日志概览](/logging)
- [诊断导出](/gateway/diagnostics)
