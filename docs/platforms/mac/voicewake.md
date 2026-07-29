---
summary: "mac 应用中的语音唤醒和按住说话模式及路由细节"
read_when:
  - 在处理语音唤醒或 PTT 路径时
title: "语音唤醒（macOS）"
---

# 语音唤醒与按住说话

## 要求

语音唤醒和按键通话需要 macOS 26 或更新版本。在较旧的 macOS 上，这些控件会从“语音”设置页面中隐藏，页面会改为显示 macOS 26 的要求。

语音唤醒要求 Apple Speech 为所选语言支持设备端识别。当该仅本地模式的约束不可用时，应用会拒绝启动被动唤醒词监听；它绝不会回退到网络识别。按键通话、对话模式和快速聊天听写都是用户的显式操作，并且可以使用 Apple Speech 网络服务以支持更广泛的语言覆盖。

## 模式

- **唤醒词模式**（默认）：始终开启、在设备端运行的语音识别器会等待触发词（`swabbleTriggerWords`）。匹配后，它会开始捕获，显示带有部分文本的浮层，并在静音后自动发送。
- **按键通话（按住右侧 Option 键）**：按住右侧 Option 键即可立即开始捕获，无需触发词。按住时会显示浮层；松开后会完成识别，并在短暂延迟后转发，这样你可以编辑文本。

## 运行时行为（唤醒词）

- 识别器位于 `VoiceWakeRuntime` 中。
- 只有在唤醒词与下一个词之间存在有意义的停顿时才会触发（`triggerPauseWindow` = 0.55s）。覆盖层/提示音可以在停顿期间启动，甚至早于命令开始。
- 静音窗口：当语音持续流动时为 2.0s（`silenceWindow`），如果只听到了触发词则为 5.0s（`triggerOnlySilenceWindow`）。
- 硬性停止：120s（`captureHardStop`），用于防止会话失控持续。
- 会话之间的防抖：发送后等待 350ms（`debounceAfterSend`）。
- 覆盖层通过 `VoiceWakeOverlayController` 驱动，并采用已提交/临时文本着色。
- 发送后，识别器会干净地重启，以继续监听下一个触发词。

## 生命周期不变量

- 如果启用了 Voice Wake 且已授予权限，唤醒词识别器会一直保持监听状态，除非正在进行按住说话采集。
- 关闭覆盖层（包括通过 X 按钮手动关闭）后，识别器总会恢复：`VoiceSessionCoordinator.overlayDidDismiss` 会在每条关闭路径上调用 `VoiceWakeRuntime.refresh(state:)`。有关会话/令牌模型，请参见 [语音覆盖层](/platforms/mac/voice-overlay)。

## 按住说话细节

- 热键检测使用全局 `.flagsChanged` 监视器监听右 Option（`keyCode 61` + `.option`）。它只观察事件，不会吞掉它们。
- 捕获逻辑位于 `VoicePushToTalk` 中：立即启动 Speech，将部分结果流式传递给覆盖层，并在松开时调用 `VoiceWakeForwarder`。
- 开始按住说话会暂停唤醒词运行时，以避免音频输入冲突；松开后会自动重启。
- 权限：需要麦克风 + Speech；接收按键事件还需要辅助功能/输入监控授权。
- 外接键盘：某些键盘不会如预期暴露右 Option。若用户反馈漏检，请提供备用快捷键。

## 面向用户的设置

- **Voice Wake** 开关：启用唤醒词运行时。
- **按住右侧 Option 键说话**：启用按键说话监视器。
- 如果所选语言在这台 Mac 上缺少设备端识别，Voice Wake 将保持禁用状态，而按键说话和 Talk Mode 仍可用。
- 语言和麦克风选择器、实时电平表、触发词表，以及一个测试器（仅本地，绝不转发）。
- 如果麦克风设备断开连接，麦克风选择器会保留上次选择，显示断开提示，并在其恢复前临时回退到系统默认。
- **声音**：在检测到触发词和发送时播放提示音，默认使用 macOS 的“Glass”系统声音。每个事件都可选择任何可由 `NSSound` 加载的文件（例如 MP3/WAV/AIFF），或者选择 **No Sound**。

## 转发行为

- 在转发时，`VoiceWakeForwarder.selectedSessionOptions` 会优先选择当前活跃的 WebChat 会话键（如果已设置），否则使用网关的主会话键。
- 它会通过 `sessions.list` 查找该会话，并根据会话的投递上下文推导投递通道和目标（先回退到其上一个通道/目标，再回退到解析后的会话键），如果都无法解析，则默认使用 WebChat。
- 如果投递失败，错误会被记录到（`voicewake.forward` 分类），并且该运行仍可通过 WebChat/会话日志查看。

## 转发载荷

- `VoiceWakeForwarder.prefixedTranscript(_:)` 会在转录内容前添加一行机器提示（解析到的主机名，若失败则回退为“这台 Mac”），该行为在唤醒词和按键通话路径之间共享。

## 快速验证

- 打开按住说话，按住右 Option 键，说话后松开：覆盖层应先显示部分识别结果，然后发送。
- 按住期间，菜单栏耳朵应保持放大（`triggerVoiceEars(ttl: nil)`）；松开后会恢复。

## 相关

- [语音唤醒](/nodes/voicewake)
- [语音浮层](/platforms/mac/voice-overlay)
- [macOS 应用](/platforms/macos)
