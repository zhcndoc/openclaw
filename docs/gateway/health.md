---
summary: "健康检查命令与网关健康监控"
read_when:
  - 诊断通道连接或网关健康状态
  - 了解健康检查 CLI 命令和选项
title: "健康检查"
---

快速指南：无需猜测即可验证通道连接性。

## 快速检查

- `openclaw status` — 本地摘要：网关可达性/模式、更新提示、已关联通道的认证时长、会话数 + 最近活动。
- `openclaw status --all` — 完整的本地诊断（只读、彩色、安全，可直接粘贴用于调试）。
- `openclaw status --deep` — 向正在运行的网关请求实时健康探测（`health` 携带 `probe:true`），在支持时包括每个账户的通道探测。
- `openclaw health` — 向正在运行的网关请求其健康快照（仅 WS；CLI 不会直接打开通道 socket）。
- `openclaw health --verbose` — 强制执行实时健康探测并打印网关连接详情。
- `openclaw health --json` — 机器可读的健康快照输出。
- 在 WhatsApp/WebChat 中单独发送 `/status` 作为一条独立消息，即可获得状态回复，无需调用 agent。
- 日志：查看 `/tmp/openclaw/openclaw-*.log` 的尾部，并筛选 `web-heartbeat`、`web-reconnect`、`web-auto-reply`、`web-inbound`。

对于 Discord 和其他聊天提供方，session 行不代表 socket 存活。
`openclaw sessions`、Gateway `sessions.list` 和 agent 的 `sessions_list` 工具
读取的是已存储的会话状态。某个提供方可以重新连接，并在任何新的 session 行生成之前就显示健康的通道
状态。请使用上面的通道状态和健康命令来进行实时连接性检查。

## 深度诊断

- 磁盘上的凭据：`ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json`（mtime 应当是最近的）。
- 会话存储：`ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json`（路径可在配置中覆盖）。计数和最近的收件人会通过 `status` 展示。
- 重新关联流程：当日志中出现状态码 409–515 或 `loggedOut` 时，执行 `openclaw channels logout && openclaw channels login --verbose`。（注意：在配对后，二维码登录流程会针对状态 515 自动重启一次。）
- 诊断默认启用。除非设置 `diagnostics.enabled: false`，否则网关会记录运行事实。内存事件会记录 RSS/heap 字节数、阈值压力和增长压力。关键内存压力会通过网关日志记录器输出。若设置了 `diagnostics.memoryPressureSnapshot: true`，关键内存压力还会写出一个预 OOM 稳定性包，其中包含 V8 heap 统计信息、可用时的 Linux cgroup 计数器、活动资源计数，以及按脱敏相对路径排序的最大会话/转录文件。存活性警告在进程仍在运行但已饱和时，会记录事件循环延迟、事件循环利用率、CPU 核心比率，以及活动/等待/排队中的会话数。超大负载事件会记录被拒绝、被截断或被分块的内容，以及可用时的大小和限制。它们不会记录消息文本、附件内容、webhook 正文、原始请求或响应正文、令牌、cookie 或密钥值。同一个 heartbeat 会启动有界稳定性记录器，该记录器可通过 `openclaw gateway stability` 或 `diagnostics.stability` Gateway RPC 获取。发生致命的 Gateway 退出、关停超时和重启启动失败时，只要存在事件，就会把最新的记录器快照持久化到 `~/.openclaw/logs/stability/`；只有在设置了 `diagnostics.memoryPressureSnapshot: true` 时，关键内存压力才会这样做。使用 `openclaw gateway stability --bundle latest` 检查最新保存的包。
- 对于 bug 报告，请运行 `openclaw gateway diagnostics export` 并附上生成的 zip。导出内容包含 Markdown 摘要、最新的稳定性包、已脱敏的日志元数据、已脱敏的 Gateway 状态/健康快照以及配置结构。它的设计是可共享的：聊天文本、webhook 正文、工具输出、凭据、cookie、账户/消息标识符以及密钥值都会被省略或脱敏。参见 [Diagnostics Export](/gateway/diagnostics)。

## 健康监控配置

- `gateway.channelHealthCheckMinutes`：网关检查通道健康状态的频率。默认值：`5`。设为 `0` 可全局禁用健康监控重启。
- `gateway.channelStaleEventThresholdMinutes`：已连接通道在被健康监控视为陈旧并重启之前可保持空闲的时长。默认值：`30`。请保持其大于或等于 `gateway.channelHealthCheckMinutes`。
- `gateway.channelMaxRestartsPerHour`：按通道/账户统计的健康监控重启的滑动一小时上限。默认值：`10`。
- `channels.<provider>.healthMonitor.enabled`：在保留全局监控启用的同时，为特定通道禁用健康监控重启。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多账户覆盖项，优先级高于通道级设置。
- 这些每通道覆盖项适用于当前已暴露它们的内置通道监控：Discord、Google Chat、iMessage、Microsoft Teams、Signal、Slack、Telegram 和 WhatsApp。

## 当出现故障时

- `logged out` 或状态 409–515 → 使用 `openclaw channels logout` 然后 `openclaw channels login` 重新关联。
- 网关不可达 → 启动它：`openclaw gateway --port 18789`（如果端口正被占用，则使用 `--force`）。
- 没有传入消息 → 确认关联的手机处于在线状态，并且发送者被允许（`channels.whatsapp.allowFrom`）；对于群聊，请确保 allowlist 和提及规则匹配（`channels.whatsapp.groups`、`agents.list[].groupChat.mentionPatterns`）。

## 专用“health”命令

`openclaw health` 会向正在运行的网关请求其健康快照（CLI 不会直接打开通道 socket）。默认情况下，它可以返回一个新的缓存网关快照；随后网关会在后台刷新该缓存。`openclaw health --verbose` 则会强制执行实时探测。该命令会在可用时报告已关联凭据/认证时长、每通道探测摘要、会话存储摘要以及探测耗时。若网关不可达或探测失败/超时，则以非零状态退出。

选项：

- `--json`：机器可读的 JSON 输出
- `--timeout <ms>`：覆盖默认的 10 秒探测超时
- `--verbose`：强制执行实时探测并打印网关连接详情
- `--debug`：`--verbose` 的别名

健康快照包含：`ok`（布尔值）、`ts`（时间戳）、`durationMs`（探测耗时）、每通道状态、agent 可用性以及会话存储摘要。

## 相关内容

- [Gateway runbook](/gateway)
- [Diagnostics export](/gateway/diagnostics)
- [Gateway troubleshooting](/gateway/troubleshooting)
