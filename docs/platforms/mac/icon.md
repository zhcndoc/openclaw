---
summary: "OpenClaw 在 macOS 上的菜单栏图标状态与动画"
read_when:
  - "更改菜单栏图标行为"
title: "菜单栏图标"
---

# <a id="menu-bar-icon-states"></a> 菜单栏图标状态

范围：macOS 应用程序 （`apps/macos`）。渲染图：`CritterIconRenderer.makeIcon(...)`。 Animation/state接线：`CritterStatusLabel` + `CritterStatusLabel+Behavior.swift`。

## <a id="dock-icon"></a> Dock 图标

在 Mac 应用程序的仪表板内，在 **设置 → 本机 → Dock 图标** 中选择 Dock 图标：

- **Original**（默认）：纸块上的原始 Molty 轮廓。
- **Heritage**：带有凸起爪子的传统 README 龙虾。
- **Clawmark**：大胆的雕刻龙虾钳。
- **Origami**：折叠的多面 Molty。
- **Pincer**：单爪轮廓，手腕圆润流畅。
- **Open C**：带有两个相对钳尖的圆形爪。

每个设计都有浅色和深色的艺术品。原版使用原生图标样式，包括**系统设置→外观→图标和小部件样式**中的设置。对于自动切换，选择**Dark → Auto**；即使应用程序窗口是黑色的，默认图标样式也可以保持浅色。

OpenClaw 运行时，其他设计遵循 macOS light/dark 外观。

为每个 OpenClaw 配置文件单独保存选择并立即应用。自定义设计会更改正在运行的应用程序的 Dock 图标；退出后的 Finder 和 Dock 磁贴使用捆绑的原始图标。菜单栏小动物及其动画是独立的。

原始来源为`apps/macos/Icon.icon`；其他矢量设计位于 `apps/macos/AppIconDesigns` 中。编辑后，用 `bash scripts/generate-mac-app-icons.sh` 重新生成对，并用 `bash scripts/generate-mac-app-icons.sh --check` 验证它们。生成器拥有自定义的深色背景和单色前景色，Apple 的资源编译器提供 macOS 掩码和填充。打包还编译主要的 Icon Composer 文档以实现本机样式。

## <a id="states"></a> 状态

| 状态                 | 扳机                                   | 视觉                                                                                              |
| --------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 闲置的                  | 默认值                                   | 普通blink/wiggle动画；睁开眼睛保持光泽                                        |
| 暂停                | `isPaused=true`                           | 触角下垂（“下班了”），眼睛睁开；无动作                                               |
| 睡眠              | 网关 disconnected/unconfigured         | 触角下垂，眼睛闭上 `⌣ ⌣` 眼睑；没有动作                                            |
| 庆祝             | 消息已发送（`sendCelebrationTick`）      | 眼睛闪烁着快乐的 `∩ ∩` 弧线 ~0.9s 加上踢腿                                               |
| 语音唤醒（大耳朵） | 听到唤醒词                           | 触角竖起并变得更高（`earScale=1.9`）；在静默后恢复                          |
| 工作中               | `isWorking=true` 或活动中的 `IconState` | 更快的腿部扭动（`legWiggle` 最高到 `1.0`）并带有轻微的水平偏移；会叠加到空闲扭动之上 |

当会话具有活动作业或工具时，工具活动徽章（SF 符号圆盘、e.g. `chevron.left.slash.chevron.right` 用于执行）可以呈现在同一小动物图标的顶部。该徽章来自 `IconState`/`ActivityKind`；完整状态模型请参见[菜单栏](/platforms/mac/menu-bar)。

## <a id="voice-wake-ears"></a> 语音唤耳

- Trigger：语音捕获和叠加所有者在捕获或叠加呈现开始时设置 `AppState.earBoostActive`。
- Stop：那些所有者在捕获完成或覆盖关闭时清除它。
- 完成前的静默窗口：通常为 `2.0s`，如果只听到了唤醒词且后续没有语音，则为 `5.0s`（`VoiceWakeRuntime.silenceWindow` / `triggerOnlySilenceWindow`）。
- 在提升时，空闲的 blink/wiggle/leg/ear 定时器被暂停（`earBoostActive` 门控 `CritterStatusLabel+Behavior` 中的动画任务）。

## <a id="shapes-and-sizes"></a> 形状和尺寸

- 画布：18x18pt 模板图像，渲染到 36x36px 位图后备存储（2x），以便图标在 Retina 屏幕上保持清晰。
- Ear刻度默认为`1.0`；语音增强设置`earScale=1.9`，不改变整体框架。
- `antennaDroop`（0-1）会在暂停和睡眠姿势下将天线向下折叠。
- Leg scurry 使用 `legWiggle` 至 `1.0`，具有小的水平抖动。

## <a id="behavioral-notes"></a> 行为说明

- App 拥有的活动、捕获和覆盖生命周期驱动耳朵和工作状态。

## <a id="related"></a> 相关内容

- [菜单栏](/platforms/mac/menu-bar)
- [macOS 应用](/platforms/macos)
