---
summary: "健康检查命令和网关健康监控"
read_when:
  - 诊断频道连接或网关健康状态
  - 了解健康检查 CLI 命令和选项
title: "健康检查"
---

用于在不猜测的情况下验证频道连接的简要指南。

## 快速检查

- `openclaw status` — 本地摘要：网关可达性/模式，更新提示，关联频道认证时长，会话 + 最近活动。
- `openclaw status --all` — 完整本地诊断（只读，彩色，可安全粘贴用于调试）。
- `openclaw status --deep` — 向运行中的网关请求实时健康探测（`health` 带 `probe:true`），支持时包括每账户频道探测。
- `openclaw health` — 向运行中的网关请求其健康快照（仅 WS；CLI 无直接频道套接字）。
- `openclaw health --verbose` — 强制实时健康探测并打印网关连接详情。
- `openclaw health --json` — 机器可读的健康快照输出。
- 在 WhatsApp/WebChat 中发送 `/status` 作为独立消息，以获取状态回复而不调用代理。
- 日志：tail `/tmp/openclaw/openclaw-*.log` 并过滤 `web-heartbeat`, `web-reconnect`, `web-auto-reply`, `web-inbound`。

## 深度诊断

- 磁盘上的凭据：`ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json`（mtime 应该是最近的）。
- 会话存储：`ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json`（路径可在配置中覆盖）。计数和最近收件人会通过 `status` 显示。
- 重新关联流程：当日志中出现状态码 409–515 或 `loggedOut` 时，运行 `openclaw channels logout && openclaw channels login --verbose`。（注意：二维码登录流程在配对后会针对状态 515 自动重启一次。）
- 诊断默认启用。除非设置 `diagnostics.enabled: false`，网关会记录运行事实。内存事件会记录 RSS/heap 字节数、阈值压力和增长压力。超大负载事件会记录被拒绝、被截断或被分块的内容，以及在可用时的大小和限制。它们不会记录消息文本、附件内容、webhook 正文、原始请求或响应正文、令牌、cookie 或密钥值。相同的心跳还会启动有界稳定性记录器，可通过 `openclaw gateway stability` 或 `diagnostics.stability` Gateway RPC 获取。当存在事件时，致命的 Gateway 退出、关闭超时以及重启启动失败会将最新记录器快照持久化到 `~/.openclaw/logs/stability/`；可使用 `openclaw gateway stability --bundle latest` 检查最新保存的 bundle。
- 对于 bug 报告，运行 `openclaw gateway diagnostics export` 并附加生成的 zip。导出内容包括 Markdown 摘要、最新的稳定性 bundle、已清理的日志元数据、已清理的 Gateway 状态/健康快照以及配置结构。它的设计目的是便于共享：会省略或脱敏聊天文本、webhook 正文、工具输出、凭据、cookie、账户/消息标识符和密钥值。参见 [Diagnostics Export](/gateway/diagnostics)。

## 健康监控配置

- `gateway.channelHealthCheckMinutes`：网关检查频道健康的频率。默认值：`5`。设置为 `0` 以全局禁用健康监控重启。
- `gateway.channelStaleEventThresholdMinutes`：在频道连接闲置多久后，健康监控认为频道过时并重启它。默认值：`30`。保持该值大于或等于 `gateway.channelHealthCheckMinutes`。
- `gateway.channelMaxRestartsPerHour`：单频道/账号每小时健康监控重启次数的滚动上限。默认值：`10`。
- `channels.<provider>.healthMonitor.enabled`：禁用特定频道的健康监控重启，但保留全局监控启用。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多账户覆盖设置，优先于频道级设置。
- 这些每频道的覆盖适用于目前已暴露的内置频道监控：Discord、Google Chat、iMessage、Microsoft Teams、Signal、Slack、Telegram 和 WhatsApp。

## 当出现问题时

- `logged out` 或状态码 409–515 → 使用 `openclaw channels logout` 然后 `openclaw channels login` 重新关联。
- 网关不可达 → 启动网关：`openclaw gateway --port 18789`（如果端口被占用，请使用 `--force`）。
- 没有收到入站消息 → 确认关联的电话号码在线且发送者被允许（`channels.whatsapp.allowFrom`）；对于群聊，确认白名单和 @ 规则匹配（`channels.whatsapp.groups`，`agents.list[].groupChat.mentionPatterns`）。

## 专用“健康”命令

`openclaw health` 向运行中的网关请求其健康快照（CLI 无直接频道套接字）。默认情况下，它可以返回新鲜的缓存网关快照；然后网关在后台刷新该缓存。`openclaw health --verbose` 则强制进行实时探测。该命令在可用时报告关联的凭据/认证时长、每频道探测摘要、会话存储摘要以及探测持续时间。如果网关不可达或探测失败/超时，则以非零状态退出。

选项：

- `--json`: 机器可读的 JSON 输出
- `--timeout <ms>`: 覆盖默认的 10 秒探测超时
- `--verbose`: 强制实时探测并打印网关连接详情
- `--debug`: `--verbose` 的别名

健康快照包括：`ok`（布尔值）、`ts`（时间戳）、`durationMs`（探测耗时）、每频道状态、代理可用性以及会话存储摘要。

## 相关内容

- [Gateway runbook](/gateway)
- [Diagnostics export](/gateway/diagnostics)
- [Gateway troubleshooting](/gateway/troubleshooting)
