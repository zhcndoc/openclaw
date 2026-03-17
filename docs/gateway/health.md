---
summary: "频道连接性的健康检查步骤"
read_when:
  - 诊断 WhatsApp 频道健康状况
title: "健康检查"
---

# 健康检查（CLI）

用于验证频道连接性的简短指南，避免盲目猜测。

## 快速检查

- `openclaw status` — 本地摘要：网关可达性/模式，更新提示，关联频道认证时间，会话 + 最近活动。
- `openclaw status --all` — 完整本地诊断（只读，彩色，安全粘贴以作调试）。
- `openclaw status --deep` — 还会探测正在运行的网关（当支持时进行每频道探测）。
- `openclaw health --json` — 向正在运行的网关请求完整健康快照（仅限 WebSocket；不直接使用 Baileys 套接字）。
- 在 WhatsApp/WebChat 中单独发送 `/status` 消息，获取状态回复且不调用代理。
- 日志：tail `/tmp/openclaw/openclaw-*.log` 并过滤 `web-heartbeat`、`web-reconnect`、`web-auto-reply`、`web-inbound`。

## 深度诊断

- 磁盘上的凭据：`ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json` （修改时间应当较新）。
- 会话存储：`ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json`（路径可在配置中覆盖）。会话数量和最近接收者可通过 `status` 查看。
- 重新关联流程：当日志出现状态码 409–515 或 `loggedOut` 时，执行 `openclaw channels logout && openclaw channels login --verbose`。 （注意：配对后状态 515 时，二维码登录流程会自动重启一次。）

## Health monitor config

- `gateway.channelHealthCheckMinutes`: 网关检查频道健康的频率。默认值：`5`。设置为 `0` 以全局禁用健康监控重启。
- `gateway.channelStaleEventThresholdMinutes`: 在频道连接闲置多久后，健康监控认为频道过时并重启它。默认值：`30`。保持该值大于或等于 `gateway.channelHealthCheckMinutes`。
- `gateway.channelMaxRestartsPerHour`: 单频道/账号每小时健康监控重启次数的滚动上限。默认值：`10`。
- `channels.<provider>.healthMonitor.enabled`: 禁用特定频道的健康监控重启，但保留全局监控启用。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`: 多账户覆盖设置，优先于频道级设置。
- 这些每频道的覆盖适用于目前已暴露的内置频道监控：Discord、Google Chat、iMessage、Microsoft Teams、Signal、Slack、Telegram 和 WhatsApp。

## 当出现问题时

- `logged out` 或状态码 409–515 → 使用 `openclaw channels logout` 然后 `openclaw channels login` 重新关联。
- 网关不可达 → 启动网关：`openclaw gateway --port 18789`（如果端口被占用，请使用 `--force`）。
- 没有收到入站消息 → 确认关联的电话号码在线且发送者被允许（`channels.whatsapp.allowFrom`）；对于群聊，确认白名单和 @ 规则匹配（`channels.whatsapp.groups`，`agents.list[].groupChat.mentionPatterns`）。

## 专用“健康”命令

`openclaw health --json` 向正在运行的网关请求健康快照（CLI 不直接访问频道套接字）。它会报告关联的凭据/认证时间（如果可用）、每频道探测摘要、会话存储摘要和探测时长。如果网关不可达或探测失败/超时，命令返回非零退出码。使用 `--timeout <ms>` 可覆盖默认的 10 秒超时。
