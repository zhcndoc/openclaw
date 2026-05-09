---
summary: "mac 应用中的语音唤醒和按住说话模式及路由细节"
read_when:
  - 在处理语音唤醒或 PTT 路径时
title: "语音唤醒（macOS）"
---

# 语音唤醒与按住说话

## 模式

- **唤醒词模式**（默认）：始终开启的语音识别器等待触发标记（`swabbleTriggerWords`）。匹配后它会开始捕获，显示带有部分文本的浮层，并在静音后自动发送。
- **按住说话（按住右侧 Option）**：按住右侧 Option 键即可立即捕获——无需触发词。按住时浮层会出现；松开后会完成并在短暂延迟后转发，以便你调整文本。

## 运行时行为（唤醒词）

- Speech recognizer lives in `VoiceWakeRuntime`.
- Trigger only fires when there's a **meaningful pause** between the wake word and the next word (~0.55s gap). The overlay/chime can start on the pause even before the command begins.
- Silence windows: 2.0s when speech is flowing, 5.0s if only the trigger was heard.
- Hard stop: 120s to prevent runaway sessions.
- Debounce between sessions: 350ms.
- Overlay is driven via `VoiceWakeOverlayController` with committed/volatile coloring.
- After send, recognizer restarts cleanly to listen for the next trigger.

## 生命周期不变量

- 如果启用了 Voice Wake 且权限已授予，唤醒词识别器应保持监听状态（显式按住说话捕获期间除外）。
- 浮层可见性（包括通过 X 按钮手动关闭）绝不能阻止识别器恢复运行。

## 卡住的浮层失败模式（之前）

Previously, if the overlay got stuck visible and you manually closed it, Voice Wake could appear "dead" because the runtime's restart attempt could be blocked by overlay visibility and no subsequent restart was scheduled.

加固措施：

- 唤醒运行时的重启不再被浮层可见性阻止。
- 浮层关闭完成后会通过 `VoiceSessionCoordinator` 触发 `VoiceWakeRuntime.refresh(...)`，因此手动点击 X 关闭后总会恢复监听。

## 按住说话细节

- 热键检测使用全局的 `.flagsChanged` 监视器来监听**右侧 Option**（`keyCode 61` + `.option`）。我们只观察事件，不会吞掉事件。
- 捕获管线位于 `VoicePushToTalk`：立即启动 Speech，向浮层流式输出部分识别结果，并在松开时调用 `VoiceWakeForwarder`。
- 当按住说话开始时，我们会暂停唤醒词运行时，以避免两个音频 tap 竞争；松开后会自动重启。
- 权限：需要麦克风 + Speech；要看到事件还需要 Accessibility/Input Monitoring 许可。
- 外接键盘：某些设备可能不会按预期暴露右侧 Option——如果用户报告漏检，请提供备用快捷键。

## 面向用户的设置

- **Voice Wake** 开关：启用唤醒词运行时。
- **Hold Cmd+Fn to talk**：启用按住说话监视器。macOS < 26 上禁用。
- 语言与麦克风选择器、实时电平表、触发词表、测试器（仅本地；不会转发）。
- 如果设备断开连接，麦克风选择器会保留上一次选择，显示断开提示，并临时回退到系统默认，直到设备恢复。
- **Sounds**：触发检测和发送时的提示音；默认使用 macOS 的 “Glass” 系统声音。你可以为每个事件选择任何可被 `NSSound` 加载的文件（例如 MP3/WAV/AIFF），或选择 **No Sound**。

## 转发行为

- 启用 Voice Wake 时，转写结果会转发到当前活动的网关/代理（与 mac 应用其他部分使用的本地/远程模式相同）。
- 回复会发送到**最后使用的主提供方**（WhatsApp/Telegram/Discord/WebChat）。如果发送失败，会记录错误，但运行记录仍可通过 WebChat/会话日志查看。

## 转发载荷

- `VoiceWakeForwarder.prefixedTranscript(_:)` 在发送前会添加机器提示信息。唤醒词和按住说话路径共用。

## 快速验证

- 打开按住说话，按住 Cmd+Fn，说话，松开：浮层应先显示部分结果，然后发送。
- 按住时，菜单栏耳朵图标应保持放大（使用 `triggerVoiceEars(ttl:nil)`）；松开后会恢复。

## 相关

- [语音唤醒](/nodes/voicewake)
- [语音浮层](/platforms/mac/voice-overlay)
- [macOS 应用](/platforms/macos)
