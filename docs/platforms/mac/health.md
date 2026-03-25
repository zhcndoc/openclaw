---
summary: "macOS 应用如何报告网关/Baileys 健康状态"
read_when:
  - Debugging mac app health indicators
title: "Health Checks (macOS)"
---

# macOS 上的健康检查

如何从菜单栏应用查看已连接频道是否健康。

## 菜单栏

- 状态点现在反映 Baileys 健康状态：
  - 绿色：已连接 + 套接字最近已打开。
  - 橙色：正在连接/重试中。
  - 红色：已注销或探测失败。
- 次要行显示“linked · auth 12m”或显示失败原因。
- “运行健康检查”菜单项触发按需探测。

## 设置

- 常规标签新增健康卡，显示：已连接认证时长、会话存储路径/计数、上次检查时间、上次错误/状态码，以及“运行健康检查”/“显示日志”的按钮。
- 使用缓存快照，保证界面瞬时加载且离线时能优雅降级。
- **频道标签**显示频道状态 + WhatsApp/Telegram 的控制项（登录二维码、注销、探测、上次断开/错误）。

## 探测如何工作

- 应用每 ~60 秒以及按需通过 `ShellExecutor` 运行 `openclaw health --json`。探测加载凭据并报告状态，不发送消息。
- 分别缓存上一次正常快照和上一次错误，避免闪烁；显示各自的时间戳。

## 有疑问时

- 你仍可使用 CLI 流程（见 [网关健康](/gateway/health)）(`openclaw status`, `openclaw status --deep`, `openclaw health --json`) 并监视 `/tmp/openclaw/openclaw-*.log` 中的 `web-heartbeat` / `web-reconnect` 日志。
