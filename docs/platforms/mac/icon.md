---
summary: "macOS 上 OpenClaw 菜单栏图标的状态与动画"
read_when:
  - Changing menu bar icon behavior
title: "菜单栏图标"
---

# 菜单栏图标状态

作者：steipete · 更新日期：2025-12-06 · 适用范围：macOS 应用（`apps/macos`）

- **空闲（Idle）：** 正常图标动画（闪烁，偶尔轻微摆动）。
- **暂停（Paused）：** 状态项使用 `appearsDisabled`；无动画。
- **语音触发（大耳朵）：** 语音唤醒检测器在听到唤醒词时调用 `AppState.triggerVoiceEars(ttl: nil)`，在捕捉语音的过程中保持 `earBoostActive=true`。耳朵放大（1.9 倍），显示圆形耳洞以增强可读性，静音 1 秒后通过 `stopVoiceEars()` 还原。仅从应用内语音管道触发。
- **工作中（代理运行）：** `AppState.isWorking=true` 触发“尾巴/腿部快速动作”微动画：工作进行时腿部抖动加快并有轻微位移。目前围绕 WebChat 代理运行进行切换；当接入其他长时任务时也可添加相同切换。

接入点

- 语音唤醒：运行时/测试时，在触发时调用 `AppState.triggerVoiceEars(ttl: nil)`，静音 1 秒后调用 `stopVoiceEars()` 以匹配捕捉窗口。
- 代理活动：在工作期间调用 `AppStateStore.shared.setWorking(true/false)`（WebChat 代理已实现）。保持工作时间段短，并在 `defer` 块中重置，避免动画卡住。

形状与尺寸

- 基础图标绘制于 `CritterIconRenderer.makeIcon(blink:legWiggle:earWiggle:earScale:earHoles:)`。
- 耳朵缩放默认是 `1.0`；语音增强时设置 `earScale=1.9` 并切换 `earHoles=true`，不改变整体框架（18×18 pt 模板图渲染到 36×36 px Retina 缓冲区）。
- 快速动作时腿抖动幅度最高约为 1.0，带有小幅水平摆动；该动画是叠加在任何已有空闲摆动上的。

行为说明

- 没有用于耳朵/工作状态的外部 CLI/broker 开关；请将其保持在应用自身信号内部，以避免意外抖动。
- 保持 TTL 较短（&lt;10s），这样如果任务挂起，图标可以快速回到基线状态。

## 相关内容

- [菜单栏](/platforms/mac/menu-bar)
- [macOS 应用](/platforms/macos)
