---
summary: "跨频道共享的反应语义"
read_when:
  - 在任何频道处理反应时
title: "反应"
---

# 反应工具

跨频道共享的反应语义：

- 添加反应时，必须指定 `emoji`。
- `emoji=""` 在支持的情况下移除机器人的反应。
- `remove: true` 在支持的情况下移除指定的 emoji（需要 `emoji` 参数）。

频道说明：

- **Discord/Slack**：空的 `emoji` 会移除消息上所有机器人的反应；`remove: true` 仅移除该特定 emoji。
- **Google Chat**：空的 `emoji` 会移除应用在消息上的所有反应；`remove: true` 仅移除该特定 emoji。
- **Telegram**：空的 `emoji` 会移除机器人的反应；`remove: true` 也会移除反应，但工具验证时仍需要非空的 `emoji`。
- **WhatsApp**：空的 `emoji` 会移除机器人的反应；`remove: true` 映射为空的 emoji（仍然需要 `emoji` 参数）。
- **Zalo 个人号（`zalouser`）**：需要非空的 `emoji`；`remove: true` 移除该特定 emoji 反应。
- **Signal**：启用 `channels.signal.reactionNotifications` 时，入站反应通知会触发系统事件。
