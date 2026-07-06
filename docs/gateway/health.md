---
summary: "健康检查命令与网关健康监控"
read_when:
  - 诊断通道连接或网关健康状态
  - 了解健康检查 CLI 命令和选项
title: "健康检查"
---

快速指南：无需猜测即可验证通道连接性。

## 快速检查

- `openclaw status` - 本地摘要：网关可达性/模式、更新提示、已链接通道认证时长、会话 + 最近活动。
- `openclaw status --all` - 完整的本地诊断（只读、彩色、安全，可直接用于调试）。
- `openclaw status --deep` - 向正在运行的网关请求实时探测（`health`，带 `probe:true`），包括在支持时按账户进行的通道探测。
- `openclaw status --usage` - 显示模型提供方的使用量/配额快照。
- `openclaw health` - 向正在运行的网关请求其健康快照（仅 WS；CLI 不直接连接任何通道 socket）。
- `openclaw health --verbose`（别名 `--debug`）- 强制执行实时健康探测并打印网关连接详情。
- `openclaw health --json` - 机器可读的健康快照输出。
- 在任意通道中发送独立的聊天命令 `/status`，即可获得状态回复，而无需调用代理。
- 日志：查看 `/tmp/openclaw/openclaw-*.log`，并过滤 `web-heartbeat`、`web-reconnect`、`web-auto-reply`、`web-inbound`。

对于 Discord 和其他聊天提供方，session 行不代表 socket 存活。
`openclaw sessions`、Gateway `sessions.list` 和 agent 的 `sessions_list` 工具
读取的是已存储的会话状态。某个提供方可以重新连接，并在任何新的 session 行生成之前就显示健康的通道
状态。请使用上面的通道状态和健康命令来进行实时连接性检查。

## 深度诊断

- 磁盘上的凭据：`ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json`（mtime 应该是最近的）。
- 会话存储：`ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json`（路径可在配置中覆盖）。会话数量和最近的收件人可通过 `status` 查看。
- 重新关联流程：当日志中出现状态码 409-515 或 `loggedOut` 时，执行 `openclaw channels logout && openclaw channels login --verbose`。对于状态 515，二维码登录流程在配对后会自动重启一次。
- 诊断默认启用（`diagnostics.enabled: false` 会禁用它们）。内存事件会记录 RSS/heap 字节数以及阈值/增长压力；关键内存压力会通过 gateway logger 记录，并且当设置 `diagnostics.memoryPressureSnapshot: true` 时，还会写入一个预 OOM 稳定性包（V8 堆统计信息、可用时的 Linux cgroup 计数器、活动资源数量、按脱敏相对路径排序的最大会话/转录文件）。当进程仍在运行但已饱和时，活跃性警告会记录事件循环延迟/利用率、CPU 核心比以及活动/等待/排队中的会话数量。超大负载事件会记录被拒绝/截断/分块的内容及其大小和限制，绝不包含消息文本、附件内容、webhook 正文、原始请求/响应正文、令牌、cookie 或密钥值。
- 同一个心跳驱动有界稳定性记录器：`openclaw gateway stability`（或 `diagnostics.stability` Gateway RPC）。严重 Gateway 退出、关闭超时、重启启动失败，以及（当 `diagnostics.memoryPressureSnapshot: true` 时）关键内存压力，都会将最新快照持久化到 `~/.openclaw/logs/stability/` 下。可使用 `openclaw gateway stability --bundle latest` 检查最新的包。
- 对于 bug 报告，请运行 `openclaw gateway diagnostics export` 并附上生成的 zip：其中包含 Markdown 摘要、最新稳定性包、已清理的日志元数据、已清理的 Gateway 状态/健康快照以及配置结构。聊天文本、webhook 正文、工具输出、凭据、cookie、账号/消息标识符以及密钥值都会被省略或脱敏。参见 [Diagnostics Export](/gateway/diagnostics)。

## 健康监控配置

- `gateway.channelHealthCheckMinutes`：网关检查频道健康状况的频率。默认值：`5`。将其设为 `0` 可全局禁用健康监控重启。
- `gateway.channelStaleEventThresholdMinutes`：一个已连接频道在被健康监控器视为“陈旧”并重启之前可以保持空闲的时长。默认值：`30`。请保持其大于或等于 `gateway.channelHealthCheckMinutes`。
- `gateway.channelMaxRestartsPerHour`：针对每个频道/账户的滚动一小时健康监控重启上限。默认值：`10`。
- `channels.<provider>.healthMonitor.enabled`：为某个特定频道禁用健康监控重启，同时保留全局监控启用。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多账户覆盖项，其优先级高于频道级设置。
- 这些按频道的覆盖项适用于当前已提供它们的内置频道：Discord、Google Chat、iMessage、IRC、Microsoft Teams、Signal、Slack、Telegram 和 WhatsApp。

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

- `logged out` 或状态 409-515 -> 使用 `openclaw channels logout` 然后 `openclaw channels login` 重新链接。
- 网关不可达 -> 启动它：`openclaw gateway --port 18789`（如果端口被占用则使用 `--force`）。
- 没有收到入站消息 -> 确认已链接的手机在线且发送者被允许（`channels.whatsapp.allowFrom`）；对于群聊，确保 allowlist 和 mention 规则匹配（`channels.whatsapp.groups`、`agents.list[].groupChat.mentionPatterns`）。

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
