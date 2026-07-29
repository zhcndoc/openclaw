---
summary: "openclaw logs 的 CLI 参考（通过 RPC 轮询 Gateway 日志）"
read_when:
  - 你需要远程轮询 Gateway 日志（无需 SSH）
  - 你想要供工具使用的 JSON 日志行
title: "日志"
---

# `openclaw logs`

通过 RPC 轮询 Gateway 文件日志。可在远程模式下使用。

## Options

- `--limit <n>`: Maximum number of log lines returned (default `200`)
- `--max-bytes <n>`: Maximum number of bytes to read from the log file (default `250000`)
- `--follow`: Follow the log stream
- `--interval <ms>`: Polling interval when following (default `1000`)
- `--json`: Output line-delimited JSON events
- `--plain`: Plain text output without styling
- `--no-color`: Disable ANSI colors
- `--local-time`: Show timestamps in local time zone (default)
- `--utc`: Show timestamps in UTC

## 共享的 Gateway RPC 选项

- `--url <url>`: Gateway WebSocket URL
- `--token <token>`: Gateway 令牌
- `--timeout <ms>`: 超时时间，单位为毫秒（默认 `30000`）
- `--expect-final`: 当 Gateway 调用由 agent 支持时，等待最终响应

传入 `--url` 会跳过自动应用的配置凭据；如果目标 Gateway 需要身份验证，请显式包含 `--token`。

## 示例

```bash
openclaw logs
openclaw logs --follow
openclaw --dev logs --follow
openclaw --profile work logs --follow
openclaw logs --follow --interval 2000
openclaw logs --limit 500 --max-bytes 500000
openclaw logs --json
openclaw logs --plain
openclaw logs --no-color
openclaw logs --utc
openclaw logs --follow --local-time
openclaw logs --url ws://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
```

所选根配置文件与 Gateway 的滚动文件相匹配：默认
配置文件使用 `openclaw-YYYY-MM-DD.log`，而命名配置文件使用
`openclaw-<profile>-YYYY-MM-DD.log`（例如，
`openclaw-dev-YYYY-MM-DD.log`）。

## 回退和恢复行为

- 如果隐式的本地回环 Gateway 请求配对、在连接期间关闭，或者在 `logs.tail` 应答之前超时，`openclaw logs` 会自动回退到已配置的 Gateway 文件日志。显式的 `--url` 目标从不使用此回退。
- `--follow` 在隐式本地 Gateway RPC 失败后不会回退到该已配置文件——一个过时的并排文件可能会误导实时跟随。在 Linux 上，如果可用，它会改用当前用户系统的、按 PID 选择的 Gateway journal（会打印所选来源）；否则它会继续重试实时 Gateway。
- 在 `--follow` 期间，临时断开连接（WebSocket 关闭、超时、连接丢失）会触发带指数退避的自动重连：最多重试 8 次，两次尝试之间最长间隔为 30 秒。每次重试都会向 stderr 打印一条警告，并且在某次轮询成功时会打印一次 `[logs] gateway reconnected` 通知。在 `--json` 模式下，这两者都会在 stderr 上以 `{"type":"notice"}` 记录的形式输出。不可恢复的错误（认证失败、配置错误）仍会立即退出。
- 在 `--follow --json` 模式下，日志源转换会以 `{"type":"meta"}` 记录的形式输出。按 `sourceKind` 跟踪游标：一个流可以从 Gateway 文件输出（`sourceKind: "file"`）切换到本地 journal 回退（`sourceKind: "journal"`，`localFallback: true`，并带有 `service.pid`/`service.unit`），并在恢复后切回 Gateway 文件输出。不要假设整个会话中只有一个稳定的来源或游标，并且在恢复重放 Gateway 文件游标时要容忍重叠的行。

## 相关

- [日志概览](/logging)
- [Gateway CLI](/cli/gateway)
- [CLI 参考](/cli)
- [Gateway 日志](/gateway/logging)
