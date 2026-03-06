---
summary: "唤醒词与按键说话重叠时的语音叠加生命周期"
read_when:
  - 调整语音叠加行为时
title: "语音叠加"
---

# 语音叠加生命周期（macOS）

受众：macOS 应用贡献者。目标：在唤醒词和按键说话重叠时保持语音叠加的可预测性。

## 当前意图

- 如果叠加因唤醒词已显示，且用户按下热键，热键会话将 _接管_ 现有文本，而不是重置它。只要按键保持按下，叠加界面保持可见。用户松开时：如果有去除空白的文本，则发送，否则关闭叠加。
- 唤醒词独立时在静默后仍自动发送；按键说话则在松开时立即发送。

## 已实施（2025 年 12 月 9 日）

- 叠加会话现在为每次捕获（唤醒词或按键说话）携带一个令牌。令牌不匹配时会丢弃部分结果/最终结果/发送/关闭/音量更新，避免旧回调生效。
- 按键说话将接管任何可见的叠加文本作为前缀（因此唤醒叠加已显示时按下热键会保留文本并附加新语音）。它会等待最多 1.5 秒以获取最终转录，超时则回退到当前文本。
- 提示音／叠加日志以 `info` 级别输出，类别为 `voicewake.overlay`、`voicewake.ptt` 和 `voicewake.chime`（会话开始、部分结果、最终结果、发送、关闭、提示音原因）。

## 下一步

1. **VoiceSessionCoordinator（actor）**
   - 每次只拥有一个 `VoiceSession`。
   - API（基于令牌）：`beginWakeCapture`、`beginPushToTalk`、`updatePartial`、`endCapture`、`cancel`、`applyCooldown`。
   - 丢弃携带旧令牌的回调（防止老识别器重新打开叠加界面）。
2. **VoiceSession（模型）**
   - 字段：`token`、`source`（唤醒词|按键说话）、已提交／易失文本、提示音标识、定时器（自动发送、空闲）、`overlayMode`（显示|编辑|发送中）、冷却截止时间。
3. **叠加绑定**
   - `VoiceSessionPublisher`（`ObservableObject`）将活动会话镜像到 SwiftUI。
   - `VoiceWakeOverlayView` 仅通过发布者渲染；不直接改动全局单例。
   - 叠加用户操作（`sendNow`、`dismiss`、`edit`）通过会话令牌回调协调器。
4. **统一发送流程**
   - 在 `endCapture` 时：如果去除空白的文本为空 → 关闭；否则调用 `performSend(session:)`（播放一次发送提示音，转发文本，关闭叠加）。
   - 按键说话无延迟；唤醒词可选延迟自动发送。
   - 在按键说话结束后对唤醒词运行时应用短暂冷却，以防唤醒词立即重触发。
5. **日志记录**
   - 协调器在子系统 `ai.openclaw` 输出 `.info` 级别日志，类别为 `voicewake.overlay` 和 `voicewake.chime`。
   - 关键事件：`session_started`、`adopted_by_push_to_talk`、`partial`、`finalized`、`send`、`dismiss`、`cancel`、`cooldown`。

## 调试清单

- 复现黏性叠加时实时查看日志：

  ```bash
  sudo log stream --predicate 'subsystem == "ai.openclaw" AND category CONTAINS "voicewake"' --level info --style compact
  ```

- 验证仅有一个活动会话令牌；协调器应丢弃过时回调。
- 确认按键说话松开时始终调用当前令牌的 `endCapture`；若文本为空，预期关闭叠加且无提示音或发送。

## 迁移步骤（建议）

1. 添加 `VoiceSessionCoordinator`、`VoiceSession` 和 `VoiceSessionPublisher`。
2. 重构 `VoiceWakeRuntime`，创建／更新／结束会话，避免直接操作 `VoiceWakeOverlayController`。
3. 重构 `VoicePushToTalk`，接管现有会话，松开时调用 `endCapture`；应用运行时冷却。
4. 将 `VoiceWakeOverlayController` 接入发布者；移除运行时／按键说话对其的直接调用。
5. 添加会话接管、冷却和空文本关闭的集成测试。
