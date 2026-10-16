---
summary: "Microsoft Teams 会议插件：作为 Chrome 浏览器访客加入工作或个人会议"
doc-schema-version: 1
read_when:
  - "你希望 OpenClaw 代理加入 Microsoft Teams 会议"
  - "您需要 Teams- 特定的宾客政策或手动操作指南"
title: "Microsoft Teams 会议插件"
---

`teams-meetings` 插件作为 OpenClaw Chrome 配置文件中的访客加入 `teams.microsoft.com/l/meetup-join/...` 下的工作链接和 `teams.live.com/meet/...` 下的消费者链接。它不会创建会议、拨入、呼叫 Microsoft Graph 或捕获 audio/video 录音。

使用 [ 会议插件 ](/plugins/meeting-plugins) 进行共享安装、模式、Chrome 和虚拟音频设置、转录、远程节点要求和验证。

`bidi` 模式支持共享 GPT-Live 语音和本机座席委派。使用`plugins.entries.teams-meetings.config`下的[共享实时配置](/plugins/meeting-plugins#configure-teams-or-zoom)。浏览器参与者的音频与本机助理麦克风注入分开捕获，因此 Live 可以在讲话时听到中断的声音。

## <a id="handle-teams-policy-and-manual-actions"></a> Handle Teams 策略和手动操作

浏览器适配器关闭应用程序插页式广告，填写访客姓名，关闭摄像头，为所选模式配置麦克风，然后单击加入按钮。它可以识别消费者启动器和 Chrome 的 `BlackHole 2ch (Virtual)` 标签。通话状态使用挂机控制。

租户策略可能需要登录、电子邮件验证、组织者许可或浏览器设备权限决策。该插件将这些报告为 `manualAction`。在同一 OpenClaw Chrome 配置文件中完成请求的步骤，然后重试状态或语音。它不会绕过租户政策。

消费者 Web 客户端通过插页式广告、访客姓名输入、microphone/camera 切换、大厅准入、媒体权限、通话中检测、实时字幕、BlackHole 路由、离开和呼叫后检测在 2026.8.1 中进行实时验证。工作租户可以施加额外的入场或休假确认政策。

## <a id="tool-and-gateway-surface"></a> 工具和网关表面

`teams_meetings` 工具支持 `join`、`leave`、`status`、`transcript` 和 `speak`。网关方法使用 `teamsmeetings.*`。节点命令为`teamsmeetings.chrome`。

## <a id="related"></a> 相关内容

- [会议插件](/plugins/meeting-plugins)
- [Microsoft Teams 频道](/channels/msteams)
