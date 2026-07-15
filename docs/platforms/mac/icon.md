---
summary: "OpenClaw 在 macOS 上的菜单栏图标状态与动画"
read_when:
  - 更改菜单栏图标行为
title: "菜单栏图标"
---

# 菜单栏图标状态

Scope: macOS app (`apps/macos`). Rendering: `CritterIconRenderer.makeIcon(...)`. Animation/state wiring: `CritterStatusLabel` + `CritterStatusLabel+Behavior.swift`.

## 状态

| 状态                 | 触发                                   | 视觉                                                                                              |
| --------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 空闲                  | 默认                                   | 正常眨眼/扭动动画；睁开的眼睛保持闪亮的高光                                        |
| 暂停                | `isPaused=true`                           | 触角下垂（“下班了”），眼睛睁开；无动作                                               |
| 睡眠               | 网关断开连接/未配置         | 触角下垂，眼睛闭合成 `⌣ ⌣` 形；无动作                                            |
| 庆祝             | 已发送消息（`sendCelebrationTick`）      | 眼睛闪烁出开心的 `∩ ∩` 弧线约 0.9 秒，并伴随一次腿部踢动                                               |
| 语音唤醒（大耳朵） | 听到唤醒词                           | 触角竖起并变得更高（`earScale=1.9`）；在静默后恢复                          |
| 工作中               | `isWorking=true` 或活动中的 `IconState` | 更快的腿部扭动（`legWiggle` 最高到 `1.0`）并带有轻微的水平偏移；会叠加到空闲扭动之上 |

当会话有活动任务或工具时，可以在同一个小生物图标上方渲染一个工具活动徽标（SF Symbol 圆点，例如用于 exec 的 `chevron.left.slash.chevron.right`）。该徽标来自 `IconState`/`ActivityKind`；完整状态模型请参见 [菜单栏](/platforms/mac/menu-bar)。

## 语音唤耳

- 触发：`AppStateStore.shared.triggerVoiceEars(ttl: nil)`，由语音唤醒采集管线（`VoiceWakeRuntime`）以及语音唤醒调试/测试工具（`VoiceWakeTester`、`VoiceWakeOverlayController`）调用。
- 停止：`stopVoiceEars()`，在采集完成时调用。
- 完成前的静默窗口：通常为 `2.0s`，如果只听到了唤醒词且后续没有语音，则为 `5.0s`（`VoiceWakeRuntime.silenceWindow` / `triggerOnlySilenceWindow`）。
- 在增强期间，空闲时的眨眼/摆动/腿/耳定时器会暂停（`earBoostActive` 会在 `CritterStatusLabel+Behavior` 中对动画任务进行门控）。

## 形状和尺寸

- 画布：18x18pt 模板图像，渲染到 36x36px 位图后备存储（2x），以便图标在 Retina 屏幕上保持清晰。
- 耳朵缩放默认值为 `1.0`；语音增强会将 `earScale` 设置为 `1.9`，而不改变整体框架。
- `antennaDroop`（0-1）会在暂停和睡眠姿势下将天线向下折叠。
- 腿部快速移动会使用最高到 `1.0` 的 `legWiggle`，并带有轻微的水平抖动。

## 行为说明

- 耳朵或工作状态没有外部 CLI/代理切换；两者都由应用信号（`AppState.setWorking`、`AppState.triggerVoiceEars`）在内部驱动，以避免意外抖动。
- 保持任何新的 TTL 较短（远低于 10 秒），这样如果任务卡住，图标就能快速恢复到基线状态。

## 相关

- [菜单栏](/platforms/mac/menu-bar)
- [macOS 应用](/platforms/macos)
