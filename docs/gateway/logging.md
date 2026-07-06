---
summary: "日志输出面、文件日志、WS 日志样式和控制台格式化"
read_when:
  - 更改日志输出或格式
  - 调试 CLI 或网关输出
title: "网关日志"
---

# 日志

面向用户的概览（CLI + 控制 UI + 配置）请参见 [/logging](/logging)。

OpenClaw 有两个日志输出面：

- **控制台输出** - 你在终端 / 调试 UI 中看到的内容。
- **文件日志** - 由网关日志记录器写入的 JSON 行。

在启动时，网关会记录解析后的默认代理模型，以及会影响新会话的模式默认值：

```text
agent model: openai/gpt-5.5 (thinking=medium, fast=on)
```

`thinking` 来自默认代理、模型参数或全局代理默认值；未设置时显示为 `medium`。`fast` 来自默认代理或模型的 `fastMode` 参数。

## 基于文件的日志记录器

- 默认滚动日志文件位于 `/tmp/openclaw/` 下（每天一个文件）：`openclaw-YYYY-MM-DD.log`，按网关主机的本地时区日期命名。如果该目录不安全或不可写（所有者不正确、对所有人可写、符号链接），OpenClaw 会回退到用户范围的 `os.tmpdir()/openclaw-<uid>` 路径；在 Windows 上则始终使用该 OS 临时目录回退路径。
- 活动日志文件会在 `logging.maxFileBytes` 处轮转（默认：100 MB），最多保留五个编号归档（`.1` 到 `.5`），并继续写入新的活动文件。
- 通过 `~/.openclaw/openclaw.json` 配置日志文件路径和级别：`logging.file`、`logging.level`。
- 文件格式为每行一个 JSON 对象。

通话、实时语音以及受管房间的代码路径会使用共享文件日志记录器，记录有限生命周期的内容，供运维调试和 OTLP 日志导出使用。转写文本、音频载荷、轮次 id、呼叫 id 和提供方 item id 都不会复制到日志记录中。

控制 UI 的 Logs 选项卡通过网关（`logs.tail`）来跟踪此文件。CLI 也执行相同操作：

```bash
openclaw logs --follow
```

### 详细输出 vs. 日志级别

- **文件日志** 仅由 `logging.level` 控制。
- `--verbose` 只影响 **控制台详细程度**（以及 WS 日志样式）——它**不会**提升文件日志级别。
- 若要在文件日志中捕获仅详细模式下可见的信息，请将 `logging.level` 设为 `debug` 或 `trace`。
- Trace 日志还会包含所选热点路径的诊断时间摘要，例如插件工具工厂准备过程。参见 [/tools/plugin#slow-plugin-tool-setup](/tools/plugin#slow-plugin-tool-setup)。

## 控制台捕获

CLI 会捕获 `console.log/info/warn/error/debug/trace`，将它们写入文件日志，同时仍然输出到 stdout/stderr。

可独立调整控制台详细程度：

- `logging.consoleLevel`（默认 `info`）
- `logging.consoleStyle`（`pretty` | `compact` | `json`；在 TTY 上默认 `pretty`，否则默认 `compact`）

## 脱敏

OpenClaw 会在日志或转录输出离开进程之前对敏感 token 进行脱敏。此脱敏策略适用于控制台、文件日志、OTLP 日志记录和会话转录文本 sink，因此在 JSONL 行或消息写入磁盘之前，匹配到的密钥值会被掩码处理。

- `logging.redactSensitive`: `off` | `tools`（默认：`tools`）
- `logging.redactPatterns`: 正则字符串数组（覆盖默认值）
  - 使用原始正则字符串（自动加上 `gi`），或使用 `/pattern/flags` 以自定义标志。
  - 匹配项会被掩码，并保留前 6 个 + 后 4 个字符（值长度 >= 18 时）；更短的值会变为 `***`。
  - 默认规则覆盖常见的键赋值、CLI 标志、JSON 字段、bearer 头、PEM 块、流行供应商的 token 前缀，以及支付凭证字段名称（卡号、CVC/CVV、共享支付 token、支付凭证）。

无论 `logging.redactSensitive` 设置为何，某些安全边界都会始终脱敏：控制 UI 的工具调用事件、`sessions_history` 工具输出、诊断支持导出、提供方错误观测、exec 审批命令显示，以及 Gateway WebSocket 协议日志。这些表面仍会将 `logging.redactPatterns` 作为附加模式生效，但 `redactSensitive: "off"` 并不会让它们输出原始密钥。

## 网关 WebSocket 日志

网关以两种模式打印 WebSocket 协议日志：

- **普通模式（无 `--verbose`）**：仅打印“有意义”的 RPC 结果——错误（`ok=false`）、慢调用（默认阈值：`>= 50ms`）以及解析错误。
- **详细模式（`--verbose`）**：打印所有 WS 请求/响应流量。

### WS 日志样式

`openclaw gateway` 支持按网关切换样式：

- `--ws-log auto`（默认）：普通模式下采用优化输出；详细模式下使用紧凑输出。
- `--ws-log compact`：详细模式下使用紧凑输出（配对请求/响应）。
- `--ws-log full`：详细模式下按每帧输出完整内容。
- `--compact`：`--ws-log compact` 的别名。

```bash
# 优化输出（仅错误/慢调用）
openclaw gateway

# 显示所有 WS 流量（成对）
openclaw gateway --verbose --ws-log compact

# 显示所有 WS 流量（完整元数据）
openclaw gateway --verbose --ws-log full
```

## 控制台格式化（子系统日志）

控制台格式化器是**感知 TTY**的，并会打印一致的带前缀行。子系统日志记录器会让输出保持分组且便于浏览：

- 每行都有**子系统前缀**（例如 `[gateway]`、`[canvas]`、`[tailscale]`）。
- **子系统颜色**（每个子系统固定，基于名称哈希生成）以及级别着色。
- 当输出是 TTY，或环境看起来像富终端（`TERM`/`COLORTERM`/`TERM_PROGRAM`）时启用颜色；会遵守 `NO_COLOR` 和 `FORCE_COLOR`。
- **缩短后的子系统前缀**：去掉前导的 `gateway/`、`channels/` 或 `providers/` 段，然后最多保留剩余的最后 2 段（例如 `channels/turn/kernel` 显示为 `turn/kernel`）。已知的频道子系统（`telegram`、`whatsapp`、`slack` 等）始终折叠为仅频道名称。
- **按子系统划分的子日志记录器**（自动前缀 + 结构化字段 `{ subsystem }`）。
- 用于 QR/UX 输出的 **`logRaw()`**（无前缀、无格式化）。
- **控制台样式**：`pretty` | `compact` | `json`。
- **控制台日志级别**与文件日志级别分离（当 `logging.level` 为 `debug`/`trace` 时，文件保留完整细节）。
- **WhatsApp 消息正文**以 `debug` 级别记录（使用 `--verbose` 可查看）。

这使得文件日志保持稳定，同时让交互式输出更易于浏览。

## 相关内容

- [日志](/logging)
- [OpenTelemetry 导出](/gateway/opentelemetry)
- [诊断导出](/gateway/diagnostics)
