---
summary: "Zoom 会议插件：以 Chrome 浏览器访客身份加入会议"
doc-schema-version: 1
read_when:
  - "你希望 OpenClaw 代理加入 Zoom 会议"
  - "您需要 Zoom 特定的访客政策或手动操作指南"
title: "Zoom 会议插件"
---

`zoom-meetings` 插件以访客身份通过 OpenClaw Chrome 配置文件中的 Zoom Web 应用程序加入 `zoom.us/j/...` 链接和帐户子域（例如 `example.zoom.us/j/...`）。它不会创建会议、拨入、使用 Zoom 会议 SDK 或捕获 audio/video 录音。

使用 [ 会议插件 ](/plugins/meeting-plugins) 进行共享安装、模式、Chrome 和虚拟音频设置、转录、远程节点要求和验证。

`bidi` 模式支持共享 GPT-Live 语音和本机座席委派。使用`plugins.entries.zoom-meetings.config`下的[共享实时配置](/plugins/meeting-plugins#configure-teams-or-zoom)。浏览器参与者的音频与本机助理麦克风注入分开捕获，因此 Live 可以在讲话时听到中断的声音。

## <a id="handle-zoom-policy-and-manual-actions"></a> Handle Zoom 策略和手动操作

浏览器适配器从浏览器**中选择**Join，填写访客姓名，关闭摄像头，配置麦克风，然后单击**Join**。它在导航前授予 `app.zoom.us` 原点麦克风和扬声器选择权限。通话状态使用 Zoom 的离开控件。

Zoom 可以禁用浏览器加入或要求身份验证、电子邮件验证、密码、CAPTCHA 完成、主机准入或浏览器设备权限。该插件将这些报告为 `manualAction`。在同一 OpenClaw Chrome 配置文件中完成请求的步骤，然后重试状态或语音。它不会绕过 Zoom 政策。

Zoom Web 应用程序在 2026.8.1 中通过官方测试会议通过插页式、iframe 访客姓名输入、microphone/camera 控件、浏览器和 macOS 媒体权限、通话中检测、实时字幕和主机端检测进行实时验证。当没有稳定的 DOM 标识符可用时，大厅和身份验证状态会保留文本回退。

## <a id="tool-and-gateway-surface"></a> 工具和网关表面

`zoom_meetings` 工具支持 `join`、`leave`、`status`、`transcript` 和 `speak`。网关方法使用 `zoommeetings.*`。节点命令为`zoommeetings.chrome`。

## <a id="related"></a> 相关内容

- [会议插件](/plugins/meeting-plugins)
