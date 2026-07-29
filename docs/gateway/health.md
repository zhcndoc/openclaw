---
summary: "健康检查命令与网关健康监控"
read_when:
  - 诊断通道连接或网关健康状态
  - 了解健康检查 CLI 命令和选项
title: "健康检查"
---

快速指南：无需猜测即可验证通道连接性。

## Quick Check

- `openclaw status` - local summary: gateway reachability/mode, update hint, linked channel auth age, sessions + recent activity.
- `openclaw status --all` - full local diagnosis (read-only, color, safe to paste for debugging).
- `openclaw status --deep` - asks the running gateway for a live probe (`health` with `probe:true`), including per-account channel probes when supported.
- `openclaw status --usage` - show model provider usage/quota snapshots.
- `openclaw health` - asks the running gateway for its health snapshot (WS-only; no direct channel sockets from the CLI).
- `openclaw health --verbose` (alias `--debug`) - forces a live health probe and prints gateway connection details.
- `openclaw health --json` - machine-readable health snapshot output.
- Send `/status` as a standalone chat command in any channel to get a status reply without invoking the agent.
- Logs: run `openclaw logs --follow` (or `openclaw --profile <profile> logs --follow`) and filter for `web-heartbeat`, `web-reconnect`, `web-auto-reply`, `web-inbound`.

For Discord and other chat providers, the session line does not represent socket liveness.
`openclaw sessions`, Gateway `sessions.list`, and the agent’s `sessions_list` tool
read stored session state. A provider may reconnect and show healthy channel status before any new session line is generated. Please use the channel status and health commands above for real-time connectivity checks.

## 深度诊断

- Creds on disk: `ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json` (mtime should be recent).
- Session store: `ls -l ~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`. Count and recent recipients are surfaced via `status`.
- Relink flow: `openclaw channels logout && openclaw channels login --verbose` when status codes 409-515 or `loggedOut` appear in logs. The QR login flow auto-restarts once for status 515 after pairing.
- Diagnostics are enabled by default (`diagnostics.enabled: false` disables them). Memory events record RSS/heap byte counts and threshold/growth pressure. Liveness warnings record event-loop delay/utilization, CPU-core ratio, and active/waiting/queued session counts when the process is running but saturated. Oversized-payload events record what was rejected/truncated/chunked plus sizes and limits, never message text, attachment contents, webhook bodies, raw request/response bodies, tokens, cookies, or secret values.
- The same heartbeat drives the bounded stability recorder: `openclaw gateway stability` (or the `diagnostics.stability` Gateway RPC). Fatal Gateway exits, shutdown timeouts, and restart startup failures persist the latest snapshot under `~/.openclaw/logs/stability/`. Inspect the newest bundle with `openclaw gateway stability --bundle latest`.
- For bug reports, run `openclaw gateway diagnostics export` and attach the generated zip: a Markdown summary, the newest stability bundle, sanitized log metadata, sanitized Gateway status/health snapshots, and config shape. Chat text, webhook bodies, tool outputs, credentials, cookies, account/message identifiers, and secret values are omitted or redacted. See [Diagnostics Export](/gateway/diagnostics).

## 健康监控配置

- `channels.<provider>.healthMonitor.enabled`: disable health-monitor restarts for a specific channel while leaving global monitoring enabled.
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`: multi-account override that wins over the channel-level setting.
- These per-channel overrides apply to the built-in channels that expose them today: Discord, Google Chat, iMessage, IRC, Microsoft Teams, Signal, Slack, Telegram, and WhatsApp.
- A crashing channel is recovered by its own auto-restart backoff first (`auto-restart attempt N/10` in the logs). The health monitor stays out of the way until that ladder ends with `giving up after 10 restart attempts`, then takes over as the last restart owner.

## Inbound ingress health

Channel connectivity and inbound admission are separate failure domains. A channel can hold a healthy transport connection — sending replies normally — while its durable ingress queue is unavailable, so not a single inbound message is admitted.

- When a channel cannot open its durable ingress queue, its start fails and the gateway records the account as unable to receive. `openclaw channels status` reports `Channel cannot admit inbound events; its durable ingress queue is unavailable. Outbound may still work.`
- Such an account is **unhealthy** regardless of transport state, and readiness reports it as failing. Previously it reported `health: healthy` and the health monitor never touched it.
- Recovery stays automatic. The ingress verdict describes the account's last start attempt and is cleared by the next one, so the ordinary restart path is also how a transient queue-open failure recovers. Those restarts log as `health-monitor: restarting (reason: ingress-unavailable)` instead of the generic `stuck`.
- If the restarts keep repeating, the cause is not transient. Check the logged ingress failure: a plugin denied the `openChannelIngressQueue` capability, for example, needs operator action rather than another restart.
- Channels that never report ingress state are unaffected: absence means "no signal", never "broken". There is no traffic-staleness heuristic, so a genuinely quiet channel is never marked unhealthy for having received nothing.

## 正常运行时间监控

外部正常运行时间监控服务应使用专用的 `/health` 端点，而不是 `/v1/chat/completions`。

- **应使用：** `GET /health` - 立即响应，不创建会话，不进行 LLM 调用，返回 `{"ok":true,"status":"live"}`
- **不要使用：** 将 `/v1/chat/completions` 用于健康检查 - 每个请求都会创建一个完整的 agent 会话，包括技能快照、上下文组装以及 LLM 调用

当未提供 `x-openclaw-session-key` 请求头或 `user` 字段时，`/v1/chat/completions` 会为每个请求生成一个新的随机会话。每 15 分钟 ping 一次的监控服务每天会创建约 96 个会话，每个会话占用 4-22KB。随着时间推移，这会导致会话存储膨胀，并可能引发上下文窗口溢出。

### 监控服务配置示例

- **BetterStack：** 将健康检查 URL 设置为 `https://<your-gateway-host>:<port>/health`
- **UptimeRobot：** 添加一个新的 HTTP 监控，URL 为 `https://<your-gateway-host>:<port>/health`
- **通用：** 任何对 `/health` 的 HTTP GET，在网关健康时都会返回 200 和 `{"ok":true}`

## 当出现故障时

- `logged out` or status 409-515 -> relink with `openclaw channels logout` then `openclaw channels login`.
- Gateway unreachable -> start it: `openclaw gateway --port 18789` (use `--force` if the port is busy).
- No inbound messages -> confirm linked phone is online and the sender is allowed (`channels.whatsapp.allowFrom`); for group chats, ensure allowlist + mention rules match (`channels.whatsapp.groups`, `agents.entries.*.groupChat.mentionPatterns`).

## 专用“health”命令

`openclaw health` 会向正在运行的网关请求其健康快照（CLI 不会直接连接通道 socket）。默认情况下，它返回一份最新的缓存网关快照，网关会在后台刷新该缓存；`--verbose` 则会强制执行实时探测。  
该命令会在可用时报告已关联的凭据/认证年龄、各通道探测摘要、会话存储摘要以及探测耗时。如果网关无法访问，或者探测失败/超时，它会以非零状态码退出。

选项：

- `--json`：机器可读的 JSON 输出
- `--timeout <ms>`：覆盖默认的 10 秒探测超时
- `--verbose`：强制执行实时探测并打印网关连接详情
- `--debug`：`--verbose` 的别名

健康快照包含：`ok`（布尔值）、`ts`（时间戳）、`durationMs`（探测耗时）、每通道状态、agent 可用性以及会话存储摘要。

## 相关内容

- [Gateway 运行手册](/gateway)
- [诊断导出](/gateway/diagnostics)
- [Gateway 故障排除](/gateway/troubleshooting)
