---
summary: "唤醒词与按住说话重叠时的语音悬浮层生命周期"
read_when:
  - 调整语音悬浮层行为时
title: "语音悬浮层"
---

# 语音悬浮层生命周期（macOS）

受众：macOS 应用贡献者。目标：当唤醒词与按住说话重叠时，让语音悬浮层保持可预测。

## 当前意图

- 如果悬浮层已经因唤醒词而可见，用户又按下热键，则热键会话会 _沿用_ 现有文本，而不是重置它。只要热键保持按下，悬浮层就会继续显示。用户松开时：如果有去除首尾空白后的文本就发送，否则关闭。
- 单独使用唤醒词仍会在静音时自动发送；按住说话会在松开时立即发送。

## 已实现（2025 年 12 月 9 日）

- 悬浮层会话现在为每次捕获（唤醒词或按住说话）携带一个令牌。当令牌不匹配时，部分/最终/发送/关闭/音量更新都会被丢弃，从而避免过期回调。
- 按住说话会将任何可见的悬浮层文本作为前缀沿用（因此在唤醒悬浮层显示时按下热键会保留文本并追加新的语音）。它会等待最长 1.5 秒以获取最终转写，然后回退到当前文本。
- 钟声/悬浮层日志会以 `info` 级别输出到 `voicewake.overlay`、`voicewake.ptt` 和 `voicewake.chime` 分类中（会话开始、部分、最终、发送、关闭、钟声原因）。

## 下一步

1. **VoiceSessionCoordinator（actor）**
   - 一次只负责一个 `VoiceSession`。
   - API（基于令牌）：`beginWakeCapture`、`beginPushToTalk`、`updatePartial`、`endCapture`、`cancel`、`applyCooldown`。
   - 丢弃携带过期令牌的回调（防止旧识别器重新打开悬浮层）。
2. **VoiceSession（模型）**
   - 字段：`token`、`source`（wakeWord|pushToTalk）、已提交/临时文本、钟声标志、计时器（自动发送、空闲）、`overlayMode`（display|editing|sending）、冷却截止时间。
3. **悬浮层绑定**
   - `VoiceSessionPublisher`（`ObservableObject`）将活动会话镜像到 SwiftUI 中。
   - `VoiceWakeOverlayView` 仅通过发布器进行渲染；它不会直接修改全局单例。
   - 悬浮层用户操作（`sendNow`、`dismiss`、`edit`）会带着会话令牌回调协调器。
4. **统一发送路径**
   - 在 `endCapture` 时：如果去除首尾空白后文本为空 → 关闭；否则 `performSend(session:)`（仅播放一次发送钟声、转发、关闭）。
   - 按住说话：无延迟；唤醒词：可选延迟用于自动发送。
   - 在按住说话结束后，对唤醒运行时应用短暂冷却，避免唤醒词立刻再次触发。
5. **日志**
   - 协调器在 `ai.openclaw` 这个 subsystem 下，以 `.info` 级别输出日志，分类为 `voicewake.overlay` 和 `voicewake.chime`。
   - 关键事件：`session_started`、`adopted_by_push_to_talk`、`partial`、`finalized`、`send`、`dismiss`、`cancel`、`cooldown`。

## 调试清单

- 在复现黏住的悬浮层时流式查看日志：

  ```bash
  sudo log stream --predicate 'subsystem == "ai.openclaw" AND category CONTAINS "voicewake"' --level info --style compact
  ```

- 确认只有一个活动会话令牌；过期回调应由协调器丢弃。
- 确保按住说话松开时始终使用活动令牌调用 `endCapture`；如果文本为空，预期会执行 `dismiss`，且不会有钟声或发送。

## 迁移步骤（建议）

1. 添加 `VoiceSessionCoordinator`、`VoiceSession` 和 `VoiceSessionPublisher`。
2. 重构 `VoiceWakeRuntime`，使其创建/更新/结束会话，而不是直接操作 `VoiceWakeOverlayController`。
3. 重构 `VoicePushToTalk`，使其沿用现有会话并在松开时调用 `endCapture`；应用运行时冷却。
4. 将 `VoiceWakeOverlayController` 连接到发布器；移除来自运行时/PTT 的直接调用。
5. 添加会话沿用、冷却和空文本关闭的集成测试。

## 相关

- [macOS 应用](/platforms/macos)
- [语音唤醒（macOS）](/platforms/mac/voicewake)
- [对话模式](/nodes/talk)
