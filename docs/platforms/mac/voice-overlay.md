---
summary: "唤醒词与按住说话重叠时的语音悬浮层生命周期"
read_when:
  - "调整语音悬浮层行为时"
title: "语音悬浮层"
---

# <a id="voice-overlay-lifecycle-(macos)"></a><a id="voice-overlay-lifecycle-macos"></a> 语音悬浮层生命周期（macOS）

受众：macOS 应用贡献者。目标：当唤醒词与按住说话重叠时，让语音悬浮层保持可预测。

在 **Dashboard → 设置 → 通话 → 本机** 下配置语音输入。覆盖层和麦克风测试仍然是原生的。仪表板拥有其设备设置。有关控制和权限，请参阅 [Voicewake](/platforms/mac/voicewake)。

## <a id="behavior"></a> 行为

- 当用户按下热键时，覆盖层已经可以从唤醒词中看到。然后，热键会话采用现有文本而不是重置它。按住热键时，覆盖层保持打开状态。发布时，如果有修剪过的文本，则发送。否则驳回。
- 单独唤醒词仍会在静音时自动发送。一键通释放后立即发送。

## <a id="implementation"></a> 实现

- `VoiceSessionCoordinator` （`apps/macos/Sources/OpenClaw/VoiceSessionCoordinator.swift`） 是活动语音会话的单一所有者。它是一个 `@MainActor @Observable` 单例，而不是演员。 API：`startSession`、`updatePartial`、`finalize`、`sendNow`、`dismiss`、`updateLevel`、`snapshot`。每个会话都带有一个 `UUID` 令牌。协调器会丢弃具有陈旧或不匹配令牌的呼叫。
- `VoiceWakeOverlayController`（`VoiceWakeOverlayController+Session.swift`）负责渲染覆盖层，并通过会话令牌将用户操作（`requestSend`、`dismiss`）转发回协调器。它自身从不拥有会话状态。
- 一键通 （`VoicePushToTalk.begin()`） 采用任何可见的覆盖文本作为 `adoptedPrefix`（通过 `VoiceSessionCoordinator.shared.snapshot()`）。因此，在唤醒覆盖启动时按下热键会保留文本并附加新语音。发布后，一键通会等待 1.5s 的最终文字记录，然后再返回当前文本。
- 在 `dismiss` 上，覆盖层调用 `VoiceSessionCoordinator.overlayDidDismiss`。该调用会触发 `VoiceWakeRuntime.refresh(state:)`。手动 X- 关闭、空文本关闭和发送后关闭因此全部恢复唤醒词监听。
- 统一发送路径：如果修剪后的文本为空，则忽略。否则，`sendNow` 播放一次发送铃声，通过 `VoiceWakeForwarder` 转发，然后关闭。

## <a id="logging"></a> 日志

语音子系统是`ai.openclaw`。每个组件都记录在自己的类别下：

| 类别                | 组件                                       |
| ----------------------- | ----------------------------------------------- |
| `voicewake.coordinator` | `VoiceSessionCoordinator`                       |
| `voicewake.overlay`     | `VoiceWakeOverlayController`/`VoiceWakeOverlay` |
| `voicewake.ptt`         | 按下说话热键和捕获                 |
| `voicewake.runtime`     | 唤醒词运行时                               |
| `voicewake.chime`       | 提示音播放                                  |
| `voicewake.sync`        | 全局设置同步                            |
| `voicewake.forward`     | 转录转发                           |
| `voicewake.meter`       | 麦克风电平监视器                               |

## <a id="debugging-checklist"></a> 调试清单

- 在复现黏住的悬浮层时流式查看日志：

  ```bash
  sudo log stream --predicate 'subsystem == "ai.openclaw" AND category CONTAINS "voicewake"' --level info --style compact
  ```

- 仅验证一个活动会话令牌。协调器丢弃陈旧的回调。
- 验证一键通释放始终使用活动令牌调用 `end()`。如果文本为空，则预计会在没有提示音或发送的情况下关闭。

## <a id="related"></a> 相关内容

- [macOS 应用](/platforms/macos)
- [语音唤醒（macOS）](/platforms/mac/voicewake)
- [对话模式](/nodes/talk)
