---
summary: "macOS 应用如何报告网关/通道健康状态"
read_when:
  - 调试 mac 应用健康指示器
title: "健康检查（macOS）"
---

# macOS 上的健康检查

如何从菜单栏应用中读取关联通道的健康状态。

## 菜单栏

状态点：

- 绿色：已连接 + 探测正常。
- 橙色：已连接，但通道探测报告性能下降/未连接。
- 红色：尚未连接。

第二行显示“linked · auth 12m”或显示失败原因。
菜单中的“立即运行健康检查”会触发一次按需探测。

## 设置

- 常规选项卡显示一个健康卡片：状态圆点、摘要行（链接状态 +
  认证时长），以及可选的失败详情行，并提供 **立即重试** 和 **打开日志** 按钮。
- **渠道** 选项卡展示 WhatsApp 和 Telegram 的每个渠道状态与控制项（登录二维码、退出登录、探测、上次断开/错误）。

## 探测如何工作

该应用通过现有的 WebSocket
连接（不是通过 CLI shell-out）每隔约 60 秒以及按需调用 Gateway 的 `health` RPC。该 RPC 会加载
凭据并报告状态，而不会发送消息。应用会分别缓存最近
一次正常的快照和最近一次错误，因此 UI 可以立即加载，并且在离线时
不会闪烁。

## 如有疑问

使用 [Gateway health](/gateway/health) 中的 CLI 流程（`openclaw status`、
`openclaw status --deep`、`openclaw health --json`），并持续查看
`/tmp/openclaw/openclaw-*.log`，筛选 `web-heartbeat` / `web-reconnect`。

## 相关

- [网关健康状态](/gateway/health)
- [macOS 应用](/platforms/macos)
