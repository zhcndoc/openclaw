---
summary: "`openclaw logs` 的 CLI 参考（通过 RPC 的尾部网关日志）"
read_when:
  - "你需要远程轮询 Gateway 日志（无需 SSH）"
  - "你想要供工具使用的 JSON 日志行"
title: "日志"
---

# `openclaw logs`

通过 RPC 轮询 Gateway 文件日志。可在远程模式下使用。

## <a id="options"></a> 选项

- `--limit <n>`：返回的最大日志行数（默认`200`）
- `--max-bytes <n>`：从日志文件读取的最大字节数（默认`250000`）
- `--follow`：关注日志流
- `--interval <ms>`：跟随时的轮询间隔（默认`1000`）
- `--json`：发出行分隔的 JSON 事件
- `--plain`：无样式格式的纯文本输出
- `--no-color`：禁用 ANSI 颜色
- `--local-time`：在本地时区渲染时间戳（默认）
- `--utc`：在 UTC 中渲染时间戳

大于 2,147,000,000 毫秒的轮询间隔上限为该值，以避免计时器溢出。

## <a id="shared-gateway-rpc-options"></a> 共享的 Gateway RPC 选项

- `--url <url>`：网关 WebSocket URL
- `--port <port>`：选择本地网关端口，覆盖配置的远程URL和`OPENCLAW_GATEWAY_URL`；不能与 `--url` 组合使用
- `--token <token>`: Gateway 令牌
- `--timeout <ms>`: 超时时间，单位为毫秒（默认 `30000`）
- `--expect-final`: 当 Gateway 调用由 agent 支持时，等待最终响应

传入 `--url` 会跳过自动应用的配置凭据；如果目标 Gateway 需要身份验证，请显式包含 `--token`。

`--port` 需要从 `1` 到 `65535` 的整数；空值或仅包含空格的值无效。省略使用已配置或环境目标的选项。

## <a id="examples"></a> 示例

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
openclaw logs --port 19083 --json
openclaw logs --url ws://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
```

所选根配置文件与 Gateway 的滚动文件相匹配：默认配置文件使用 `openclaw-YYYY-MM-DD.log`，而命名配置文件使用 `openclaw-<profile>-YYYY-MM-DD.log`（例如， `openclaw-dev-YYYY-MM-DD.log`）。

## <a id="fallback-and-recovery-behavior"></a> 回退和恢复行为

- 如果无法读取或解析本地配置，`openclaw logs` 会读取本地文件日志并通过 `openclaw doctor --fix` 指导发出警告。此恢复也适用于 `--follow`；显式 URL 目标保留其身份验证要求。
- 如果隐式的本地回环 Gateway 请求配对、在连接期间关闭，或者在 `logs.tail` 应答之前超时，`openclaw logs` 会自动回退到已配置的 Gateway 文件日志。显式的 `--url` 目标从不使用此回退。
- 在隐式本地网关 RPC 故障后，`--follow` 不会回退到该配置文件 - 过时的并行文件可能会误导实时尾部。在 Linux 上，它改为使用 PID 的活动用户 systemd 网关日志（如果可用）（打印所选源）；否则它会继续重试实时网关。
- 在`--follow`期间，瞬时断开连接（WebSocket关闭、超时、连接断开）会触发指数退避的自动重新连接：最多重试8次，尝试之间的间隔时间上限为30秒。每次重试时都会向 stderr 打印一条警告，一旦轮询成功，就会打印一条 `[logs] gateway reconnected` 通知。在 `--json` 模式下，两者都会在 stderr 上作为 `{"type":"notice"}` 记录发出。身份验证和无效目标错误仍然会立即退出。
- 在 `--follow --json` 模式下，日志源转换会以 `{"type":"meta"}` 记录的形式输出。按 `sourceKind` 跟踪游标：一个流可以从 Gateway 文件输出（`sourceKind: "file"`）切换到本地 journal 回退（`sourceKind: "journal"`，`localFallback: true`，并带有 `service.pid`/`service.unit`），并在恢复后切回 Gateway 文件输出。不要假设整个会话中只有一个稳定的来源或游标，并且在恢复重放 Gateway 文件游标时要容忍重叠的行。
- 当网关报告不同的日志文件路径时，`--follow` 在打印其行之前重新读取新文件，而不使用旧的字节光标。新尾部依然尊重`--limit`和`--max-bytes`。

在 `--json` 模式下，无效的 `--port`、`--limit`、`--interval` 或 `--max-bytes` 值以及冲突的 `--url`/`--port` 选项会在标准输出上产生标准 CLI 故障包络线：`{"ok":false,"error":{"type":"cli_error","message":"..."}}`。终端日志获取失败会在 stderr 上发出 `{"type":"error",...}`。两者均以状态 `1` 退出。

在文本模式下，终端日志获取失败会打印经过编辑的错误原因、选定的网关连接详细信息以及 stderr 上的医生提示。收到的 RPC 拒绝会显示为错误，而不是报告为网关可达性故障。

在 JSON 模式下，终端日志获取错误使用与 `message` 和 `error` 相同的经过编辑的失败原因，包括 RPC 拒绝、超时、断开连接和无效响应负载。 stderr上记录保留连接`details`和医生`hint`；该命令仍以状态 `1` 退出。

## <a id="related"></a> 相关内容

- [日志概览](/logging)
- [网关 CLI](/cli/gateway)
- [CLI 参考](/cli)
- [网关记录](/gateway/logging)
