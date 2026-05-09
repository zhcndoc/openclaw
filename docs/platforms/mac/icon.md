---
summary: "OpenClaw 在 macOS 上的菜单栏图标状态与动画"
read_when:
  - 更改菜单栏图标行为
title: "菜单栏图标"
---

# 菜单栏图标状态

作者：steipete · 更新于：2025-12-06 · 范围：macOS 应用（`apps/macos`）

- **空闲：** 正常图标动画（眨眼、偶尔轻微摆动）。
- **暂停：** 状态项使用 `appearsDisabled`；无运动。
- **语音触发（大耳朵）：** 当听到唤醒词时，语音唤醒检测器会调用 `AppState.triggerVoiceEars(ttl: nil)`，在捕获话语期间保持 `earBoostActive=true`。耳朵会放大（1.9x），并出现圆形耳洞以提高可读性，然后在 1 秒静默后通过 `stopVoiceEars()` 下降。仅由应用内语音管线触发。
- **工作中（agent 运行中）：** `AppState.isWorking=true` 驱动一种“尾巴/腿快速移动”的微动效：在工作进行中时，腿部摆动更快并带有轻微偏移。目前在 WebChat agent 运行期间切换；当你接入其他长任务时，也请在同样位置加上这个切换。

接线点

- 语音唤醒：运行时/测试器在触发时调用 `AppState.triggerVoiceEars(ttl: nil)`，并在 1 秒静默后调用 `stopVoiceEars()`，以匹配捕获窗口。
- Agent 活动：在工作跨度期间设置 `AppStateStore.shared.setWorking(true/false)`（WebChat agent 调用中已完成）。保持跨度尽量短，并在 `defer` 块中重置，以避免动画卡住。

形状与尺寸

- 基础图标绘制于 `CritterIconRenderer.makeIcon(blink:legWiggle:earWiggle:earScale:earHoles:)`。
- 耳朵缩放默认值为 `1.0`；语音增强会设置 `earScale=1.9` 并切换 `earHoles=true`，而不改变整体框架（18×18 pt 模板图像渲染到 36×36 px Retina backing store）。
- Scurry 会将腿部摆动提升到约 `1.0`，并带有轻微水平抖动；它会叠加到任何已有的空闲摆动上。

行为说明

- 没有用于耳朵/工作状态的外部 CLI/broker 切换；请保持它仅限于应用自身信号，以避免意外抖动。
- 保持 TTL 较短（&lt;10s），这样如果任务挂起，图标能尽快回到基线状态。

## 相关

- [菜单栏](/platforms/mac/menu-bar)
- [macOS 应用](/platforms/macos)
