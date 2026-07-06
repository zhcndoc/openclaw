---
summary: "唤醒词与按住说话重叠时的语音悬浮层生命周期"
read_when:
  - 调整语音悬浮层行为时
title: "语音悬浮层"
---

# 语音悬浮层生命周期（macOS）

受众：macOS 应用贡献者。目标：当唤醒词与按住说话重叠时，让语音悬浮层保持可预测。

## 行为

- 如果覆盖层已经因唤醒词而可见，而用户按下热键，则热键会话会沿用现有文本，而不是重置它。只要热键保持按下，覆盖层就会继续显示。松开时：如果有去除首尾空白后的文本，则发送；否则关闭。
- 仅使用唤醒词时仍会在静默后自动发送；按住说话则会在松开时立即发送。

## 实现

- `VoiceSessionCoordinator`（`apps/macos/Sources/OpenClaw/VoiceSessionCoordinator.swift`）是活动语音会话的唯一拥有者。它是一个 `@MainActor @Observable` 单例，而不是 actor。API：`startSession`、`updatePartial`、`finalize`、`sendNow`、`dismiss`、`updateLevel`、`snapshot`。每个会话都携带一个 `UUID` 令牌；使用过期或不匹配令牌的调用会被丢弃。
- `VoiceWakeOverlayController`（`VoiceWakeOverlayController+Session.swift`）负责渲染覆盖层，并通过会话令牌将用户操作（`requestSend`、`dismiss`）转发回协调器。它自身从不拥有会话状态。
- 按住说话（`VoicePushToTalk.begin()`）会将任何可见的覆盖层文本作为 `adoptedPrefix` 采用（通过 `VoiceSessionCoordinator.shared.snapshot()`），这样当唤醒覆盖层已显示时按下热键，就会保留文本并追加新的语音。松开时，它会等待最长 1.5 秒以获取最终转写结果，然后再回退到当前文本。
- 在 `dismiss` 时，覆盖层会调用 `VoiceSessionCoordinator.overlayDidDismiss`，这会触发 `VoiceWakeRuntime.refresh(state:)`，从而让手动点击 X 关闭、空文本关闭以及发送后关闭都恢复唤醒词监听。
- 统一发送路径：如果修剪后的文本为空，则执行关闭；否则 `sendNow` 只播放一次发送提示音，通过 `VoiceWakeForwarder` 转发，然后关闭。

## 日志

语音子系统为 `ai.openclaw`；每个组件都会在其自己的类别下记录日志：

| 类别                    | 组件                                            |
| ----------------------- | ----------------------------------------------- |
| `voicewake.coordinator` | `VoiceSessionCoordinator`                       |
| `voicewake.overlay`     | `VoiceWakeOverlayController`/`VoiceWakeOverlay` |
| `voicewake.ptt`         | 按下说话热键和捕获                                  |
| `voicewake.runtime`     | 唤醒词运行时                                      |
| `voicewake.chime`       | 提示音播放                                        |
| `voicewake.sync`        | 全局设置同步                                      |
| `voicewake.forward`     | 转录转发                                        |
| `voicewake.meter`       | 麦克风电平监视器                                    |

## 调试清单

- 在复现黏住的悬浮层时流式查看日志：

  ```bash
  sudo log stream --predicate 'subsystem == "ai.openclaw" AND category CONTAINS "voicewake"' --level info --style compact
  ```

- 验证只有一个活动会话令牌；协调器会丢弃过期回调。
- 确认按住说话释放时始终使用活动令牌调用 `end()`；如果文本为空，应预期直接关闭，不播放提示音也不发送。

## 相关

- [macOS 应用](/platforms/macos)
- [语音唤醒（macOS）](/platforms/mac/voicewake)
- [对话模式](/nodes/talk)
