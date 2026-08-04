---
summary: "健康检查命令与网关健康监控"
read_when:
  - 诊断通道连接或网关健康状态
  - 了解健康检查 CLI 命令和选项
title: "健康检查"
---

快速指南：无需猜测即可验证通道连接性。

## 快速检查

- `openclaw status` - 本地摘要：网关可达性/模式、更新提示、已关联频道的认证时长、会话及最近活动。
- `openclaw status --all` - 完整的本地诊断（只读、带颜色，可安全粘贴用于调试）。
- `openclaw status --deep` - 请求正在运行的网关执行实时探测（带有 `probe:true` 的 `health`），在支持时包括各账户的频道探测。
- `openclaw status --usage` - 显示模型提供商的使用量/配额快照。
- `openclaw health` - 请求正在运行的网关提供其健康状态快照（仅 WS；CLI 不直接连接频道套接字）。
- `openclaw health --verbose`（别名 `--debug`）- 强制执行实时健康探测，并打印网关连接详细信息。
- `openclaw health --json` - 输出机器可读的健康状态快照。
- 在任何频道中发送独立的 `/status` 聊天命令，即可获取状态回复，而无需调用代理。
- 日志：运行 `openclaw logs --follow`（或 `openclaw --profile <profile> logs --follow`），并筛选 `web-heartbeat`、`web-reconnect`、`web-auto-reply`、`web-inbound`。

对于 Discord 和其他聊天提供商，会话行不代表套接字的存活状态。
`openclaw sessions`、网关的 `sessions.list` 以及代理的 `sessions_list` 工具
读取已存储的会话状态。提供商可能会重新连接，并在生成任何新的会话行之前显示频道状态正常。请使用上述频道状态和健康检查命令来检查实时连接情况。

## 深度诊断

- 磁盘上的凭据：`ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json`（mtime 应为最近时间）。
- 会话存储：`ls -l ~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`。`status` 会显示计数和最近的接收方。
- 重新关联流程：当日志中出现状态码 409-515 或 `loggedOut` 时，运行 `openclaw channels logout && openclaw channels login --verbose`。配对后，如果状态码为 515，QR 登录流程会自动重启一次。
- 默认启用诊断功能（`diagnostics.enabled: false` 可禁用）。内存事件会记录 RSS/堆内存字节数以及阈值/增长压力。进程仍在运行但处于饱和状态时，存活性警告会记录事件循环延迟/利用率、CPU 核心比例，以及活跃/等待中/排队中的会话数量。超大负载事件会记录被拒绝/截断/分块处理的内容及其大小和限制，但绝不会记录消息文本、附件内容、Webhook 正文、原始请求/响应正文、令牌、Cookie 或机密值。
- 同一个心跳机制还会驱动有界稳定性记录器：`openclaw gateway stability`（或 `diagnostics.stability` Gateway RPC）。Gateway 致命退出、关闭超时以及重启启动失败会将最新快照持久化到 `~/.openclaw/logs/stability/`。使用 `openclaw gateway stability --bundle latest` 检查最新的捆绑包。
- 提交错误报告时，运行 `openclaw gateway diagnostics export` 并附上生成的 zip 文件：其中包含 Markdown 摘要、最新稳定性捆绑包、经过清理的日志元数据、经过清理的 Gateway 状态/健康检查快照，以及配置结构。聊天文本、Webhook 正文、工具输出、凭据、Cookie、账户/消息标识符和机密值都会被省略或编辑。参见[诊断导出](/gateway/diagnostics)。

## 健康监控配置

- `channels.<provider>.healthMonitor.enabled`：在保持全局监控启用的同时，禁用特定频道的健康监控重启。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多账户覆盖设置，其优先级高于频道级设置。
- 这些频道级覆盖设置目前适用于支持它们的频道：Discord、Google Chat、iMessage、IRC、Microsoft Teams、Signal、Slack、Telegram 和 WhatsApp。
- 崩溃的频道首先由其自身的自动重启退避机制恢复（日志中的 `auto-restart attempt N/10`）。在该重启阶梯以 `giving up after 10 restart attempts` 结束之前，健康监控不会介入；之后健康监控才会作为最后的重启负责方接管。

## 入站接入健康状态

通道连接性和入站接纳属于相互独立的故障域。通道可以保持健康的传输连接——正常发送回复——同时其持久化入站队列不可用，导致一个入站消息也无法被接纳。

- 当通道无法打开其持久化入站队列时，通道启动会失败，网关会记录该账户无法接收消息。`openclaw channels status` 报告 `通道无法接纳入站事件；其持久化入站队列不可用。出站可能仍然正常工作。`
- 无论传输状态如何，此类账户均属于**不健康**状态，就绪检查也会将其报告为失败。此前它会报告 `health: healthy`，健康监控器也从未处理过它。
- 恢复过程仍会自动进行。入站判定描述的是该账户最近一次启动尝试的结果，并会在下一次启动时清除，因此普通的重启流程同样可以恢复临时性的队列打开失败。这些重启会记录为 `health-monitor: restarting (reason: ingress-unavailable)`，而不是通用的 `stuck`。
- 如果重启持续重复发生，原因就不是临时性的。请检查日志中记录的入站失败原因：例如，插件拒绝了 `openChannelIngressQueue` 能力，这种情况需要操作员采取措施，而不是再次重启。
- 从未报告入站状态的通道不受影响：缺少状态意味着“无信号”，绝不意味着“已损坏”。不存在流量陈旧度启发式判断，因此一个确实安静的通道不会因为没有收到任何消息而被标记为不健康。

## 正常运行时间监控

外部正常运行时间监控服务应使用专用的 `/health` 端点，而不是 `/v1/chat/completions`。

- **应使用：** `GET /health` - 立即响应，不创建会话，不进行 LLM 调用，返回 `{"ok":true,"status":"live"}`
- **不要使用：** 将 `/v1/chat/completions` 用于健康检查 - 每个请求都会创建一个完整的 agent 会话，包括技能快照、上下文组装以及 LLM 调用

当未提供 `x-openclaw-session-key` 请求头或 `user` 字段时，`/v1/chat/completions` 会为每个请求生成一个新的随机会话。每 15 分钟 ping 一次的监控服务每天会创建约 96 个会话，每个会话占用 4-22KB。随着时间推移，这会导致会话存储膨胀，并可能引发上下文窗口溢出。

### 监控服务配置示例

- **BetterStack：** 将健康检查 URL 设置为 `https://<your-gateway-host>:<port>/health`
- **UptimeRobot：** 添加一个新的 HTTP 监控，URL 为 `https://<your-gateway-host>:<port>/health`
- **通用：** 任何对 `/health` 的 HTTP GET，在网关健康时都会返回 200 和 `{"ok":true}`。

## 当出现故障时

- `已登出` 或状态码 409-515 -> 使用 `openclaw channels logout` 注销链接，然后使用 `openclaw channels login` 重新链接。
- 网关无法访问 -> 启动网关：`openclaw gateway --port 18789`（如果端口被占用，请使用 `--force`）。
- 没有收到消息 -> 确认已关联的手机处于在线状态，并且发送者已获允许（`channels.whatsapp.allowFrom`）；对于群聊，确保允许列表和提及规则相匹配（`channels.whatsapp.groups`、`agents.entries.*.groupChat.mentionPatterns`）。

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
