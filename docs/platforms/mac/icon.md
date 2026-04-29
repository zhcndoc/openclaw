---
summary: "OpenClaw 在 macOS 上的菜单栏图标状态与动画"
read_when:
  - 更改菜单栏图标行为
title: "菜单栏图标"
---

# 菜单栏图标状态

作者：steipete · 更新于：2025-12-06 · 范围：macOS 应用（`apps/macos`）

- **空闲：** 正常图标动画（眨眼，偶尔轻微扭动）。
- **暂停：** 状态项使用 `appearsDisabled`；无动态效果。
- **语音触发（大耳朵）：** 当检测到唤醒词时，语音唤醒检测器调用 `AppState.triggerVoiceEars(ttl: nil)`，在捕获语音内容期间保持 `earBoostActive=true`。耳朵放大（1.9x），并显示圆形耳孔以提升可读性，然后在 1 秒静默后通过 `stopVoiceEars()` 下降。仅从应用内语音流水线触发。
- **工作中（agent 运行）：** `AppState.isWorking=true` 驱动“尾巴/腿部疾跑”微动效：在工作进行中，腿部摆动更快并略有偏移。目前围绕 WebChat agent 运行进行切换；当你接入其他长任务时，也请在相同位置切换。

接线点

- 语音唤醒：运行时/测试器在触发时调用 `AppState.triggerVoiceEars(ttl: nil)`，并在 1 秒静默后调用 `stopVoiceEars()`，以匹配捕获窗口。
- Agent 活动：在工作跨度期间设置 `AppStateStore.shared.setWorking(true/false)`（WebChat agent 调用中已完成）。保持跨度尽量短，并在 `defer` 块中重置，以避免动画卡住。

形状与尺寸

- 基础图标绘制于 `CritterIconRenderer.makeIcon(blink:legWiggle:earWiggle:earScale:earHoles:)`。
- 耳朵缩放默认值为 `1.0`；语音增强会设置 `earScale=1.9` 并切换 `earHoles=true`，而不改变整体框架（18×18 pt 模板图像渲染到 36×36 px 的 Retina backing store 中）。
- 疾跑使用最高约 `1.0` 的腿部摆动，并带有轻微的水平抖动；它会叠加在现有的空闲摆动之上。

行为说明

- 不要为耳朵/工作状态提供外部 CLI/broker 切换；将其保持为应用自身信号的内部机制，以避免意外的频繁切换。
- 保持 TTL 较短（&lt;10s），这样如果任务卡住，图标可以很快恢复到基线状态。

## 相关

- [菜单栏](/platforms/mac/menu-bar)
- [macOS 应用](/platforms/macos)
