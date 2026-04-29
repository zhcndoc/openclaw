---
summary: "macOS 应用如何报告 gateway/Baileys 健康状态"
read_when:
  - 调试 mac 应用健康指示器
title: "健康检查（macOS）"
---

# macOS 上的健康检查

如何从菜单栏应用查看链接的频道是否健康。

## 菜单栏

- 状态点现在反映 Baileys 的健康状况：
  - 绿色：已链接 + 最近已打开 socket。
  - 橙色：正在连接/重试。
  - 红色：已退出登录或探测失败。
- 第二行显示“linked · auth 12m”或显示失败原因。
- “Run Health Check” 菜单项会触发一次按需探测。

## 设置

- 常规选项卡新增一个健康卡片，显示：linked auth 时长、session-store 路径/数量、上次检查时间、上次错误/状态码，以及 “Run Health Check / Reveal Logs” 按钮。
- 使用缓存快照，因此 UI 能立即加载，并且在离线时也能优雅降级。
- **Channels 选项卡** 显示 WhatsApp/Telegram 的频道状态和控制项（登录 QR、退出登录、探测、上次断开/错误）。

## 探测如何工作

- 应用每隔约 60 秒以及按需通过 `ShellExecutor` 运行 `openclaw health --json`。该探测会加载凭据并报告状态，而不会发送消息。
- 将最后一次成功快照和最后一次错误分别缓存，以避免闪烁；显示各自的时间戳。

## 如有疑问

- 你仍然可以使用 [Gateway health](/gateway/health) 中的 CLI 流程（`openclaw status`、`openclaw status --deep`、`openclaw health --json`），并 tail `/tmp/openclaw/openclaw-*.log` 查看 `web-heartbeat` / `web-reconnect`。

## 相关

- [Gateway health](/gateway/health)
- [macOS app](/platforms/macos)
