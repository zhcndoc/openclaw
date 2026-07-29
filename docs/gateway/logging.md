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
agent model: openai/gpt-5.6-sol (thinking=medium, fast=on)
```

`thinking` 来自默认代理、模型参数或全局代理默认值；未设置时显示为 `medium`。`fast` 来自默认代理或模型的 `fastMode` 参数。

## 基于文件的日志记录器

- Default rolling log files are under `/tmp/openclaw/` (one file per day), dated by the gateway host's local timezone. The default profile uses `openclaw-YYYY-MM-DD.log`; named profiles use `openclaw-<profile>-YYYY-MM-DD.log` (for example, `openclaw-dev-YYYY-MM-DD.log`). If that directory is unsafe or unwritable (wrong owner, world-writable, a symlink), OpenClaw falls back to a user-scoped `os.tmpdir()/openclaw-<uid>` path instead; on Windows it always uses that OS-tmpdir fallback.
- Active log files rotate at `logging.maxFileBytes` (default: 100 MB), keeping up to five numbered archives (`.1` through `.5`) and continuing to write a fresh active file.
- Configure the log file path and level via `~/.openclaw/openclaw.json`: `logging.file`, `logging.level`.
- The file format is one JSON object per line.

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

- `logging.consoleLevel` (default `info`)
- `logging.consoleStyle` (`pretty` | `json`). When unset, output is `pretty` on a TTY and the automatic `compact` style otherwise. `compact` is no longer a settable value; `openclaw doctor --fix` maps a stored one to `pretty`.

## 脱敏

OpenClaw 会在日志或转录输出离开进程之前对敏感 token 进行脱敏。此脱敏策略适用于控制台、文件日志、OTLP 日志记录和会话转录文本 sink，因此在 JSONL 行或消息写入磁盘之前，匹配到的密钥值会被掩码处理。

- Sensitive-value redaction is always enabled.
- `logging.redactPatterns`: array of regex strings (overrides defaults)
  - Use raw regex strings (auto `gi`), or `/pattern/flags` for custom flags.
  - Matches are masked keeping the first 6 + last 4 chars (values >= 18 chars); shorter values become `***`.
  - Defaults cover common key assignments, CLI flags, JSON fields, bearer headers, PEM blocks, popular vendor token prefixes, and payment credential field names (card number, CVC/CVV, shared payment token, payment credential).

Safety boundaries such as Control UI tool-call events, `sessions_history` output, diagnostics exports, provider errors, exec approval display, and Gateway WebSocket logs always redact. `logging.redactPatterns` adds deployment-specific patterns.

## Gateway WebSocket Logs

The gateway prints WebSocket protocol logs in two modes:

- **Normal mode (without `--verbose`)**: prints only “meaningful” RPC results — errors (`ok=false`), slow calls (default threshold: `>= 50ms`), and parse errors.
- **Verbose mode (`--verbose`)**: prints all WS request/response traffic.

### WS Log Styles

`openclaw gateway` supports style switching by gateway:

- `--ws-log auto` (default): uses optimized output in normal mode; uses compact output in verbose mode.
- `--ws-log compact`: uses compact output in verbose mode (paired requests/responses).
- `--ws-log full`: outputs full content per frame in verbose mode.
- `--compact`: alias for `--ws-log compact`.

```bash
# Optimized output (errors/slow calls only)
openclaw gateway

# Show all WS traffic (paired)
openclaw gateway --verbose --ws-log compact

# Show all WS traffic (full metadata)
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
