---
summary: "选择并配置 Google Meet、Microsoft Teams 或 Zoom 会议参与方式"
read_when:
  - 你希望 OpenClaw 代理加入视频会议
  - 你正在 Google Meet、Microsoft Teams 会议和 Zoom 会议插件之间进行选择
  - 你需要配置共享 Chrome、BlackHole、SoX 或会议模式
title: "会议插件"
---

OpenClaw 为 Google Meet、Microsoft Teams 会议和 Zoom 提供了独立的插件。这三个插件都可以通过 Chrome 加入会议，使用相同的参与模式，并在 Gateway 主机或配对节点上运行 Chrome。它们的平台 URL、安装模式和额外功能各不相同。

这些插件用于参与会议。它们不同于 [Microsoft Teams 通道](/channels/msteams) 等消息通道，也不同于 [语音通话插件](/plugins/voice-call)。

## 选择插件

| 平台            | 插件                                          | 接受的会议链接                                                                                              | 安装                                             | 参与方式                                                   | 平台特定功能                                                                                                  |
| --------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Google Meet     | [`google-meet`](/plugins/google-meet)         | `meet.google.com/...`                                                                                       | 从 npm 或 ClawHub 安装；默认启用                  | 本地 Chrome、配对节点上的 Chrome，或通过 Twilio 拨入        | 可通过 Meet API 或已登录的浏览器创建会议；可通过 OAuth 读取受支持的 Meet 内容 |
| Microsoft Teams | [`teams-meetings`](/plugins/teams-meetings)   | `teams.microsoft.com/l/meetup-join/...` 下的工作链接，以及 `teams.live.com/meet/...` 下的个人用户链接       | 从 npm 或 ClawHub 安装；默认启用                  | 本地 Chrome 或配对节点上的 Chrome                           | 支持以访客身份加入工作版和个人用户版会议                                                                    |
| Zoom            | [`zoom-meetings`](/plugins/zoom-meetings)    | `zoom.us/j/...` 以及帐户子域名，例如 `example.zoom.us/j/...`                                                 | 从 npm 或 ClawHub 安装；默认启用                  | 本地 Chrome 或配对节点上的 Chrome                           | 通过 Zoom Web App 以访客身份加入                                                                               |

当你需要创建会议、获取 Google API 内容，或使用 Twilio 电话方式时，请选择 Google Meet。在相应平台上直接通过浏览器以访客身份参与会议时，请选择 Teams 或 Zoom。Teams 和 Zoom 插件不会创建会议、拨入会议、调用供应商 API，也不会捕获音频/视频录制内容。

## 选择模式

三个插件共享相同的模式：

| 模式         | 行为                                                                                              | 音频要求                                      |
| ------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `agent`      | 实时转录内容发送到配置的 OpenClaw 代理；使用常规 OpenClaw TTS 播放回复。  | Chrome 回传音频需要 BlackHole 和 SoX 桥接。 |
| `bidi`       | 实时语音模型直接进行监听和回复。                                                  | Chrome 回传音频需要 BlackHole 和 SoX 桥接。 |
| `transcribe` | 以仅观察模式加入，并在平台提供字幕时公开有限的实时字幕转录。 | 不需要 BlackHole 或 SoX 回传音频桥接。                   |

当代理只需要会议文本时，使用 `transcribe`。需要进行常规 OpenClaw 推理和使用工具时，使用 `agent`。当低延迟直接语音比让每轮对话都经过常规代理更重要时，使用 `bidi`。

有限的实时转录内容仅在 `transcribe` 模式下可用。在所有三种模式中，浏览器加入会议后也会将已完成的字幕行和派生摘要持久化到共享状态数据库中；离开会议时会完成可见字幕并写入摘要；使用 [`openclaw transcripts`](/cli/transcripts) 可列出、检查或导出这些内容。这一持久化笔记路径不会改变实时代理咨询转录，也不会创建音频/视频录制。

自动笔记默认开启。设置 `transcripts.enabled: false` 可全局禁用持久化笔记。显式选择的 `transcribe` 会话会保留其有限的实时字幕尾部，但不会写入持久化行。字幕是否可用仍取决于会议平台、账户、语言和主持人策略。

## 准备 Chrome 和音频

Chrome 可以运行在 Gateway 主机上，也可以运行在已配对的节点上。远程 Chrome 节点必须允许使用 `browser.proxy` 以及平台命令：

| 插件             | 节点命令                |
| ---------------- | ----------------------- |
| Google Meet      | `googlemeet.chrome`     |
| Microsoft Teams  | `teamsmeetings.chrome`  |
| Zoom             | `zoommeetings.chrome`   |

要通过 Chrome 使用 `agent` 或 `bidi` 模式，请在 macOS 上运行 Chrome，并在同一主机上安装共享音频依赖项：

```bash
brew install blackhole-2ch sox
sudo reboot
system_profiler SPAudioDataType | grep -i BlackHole
command -v sox
```

当 Chrome 运行在已配对的节点上时，Gateway 主机仍负责 OpenClaw 代理和模型凭据。为 `agent` 模式配置实时转录提供商和 OpenClaw TTS，或为 `bidi` 模式配置实时语音提供商。平台指南中包含提供商和音频命令选项。

## 安装或禁用插件

安装所需的会议插件。每个插件在安装后默认启用：

```bash
openclaw plugins install npm:@openclaw/google-meet
openclaw plugins install @openclaw/teams-meetings
openclaw plugins install @openclaw/zoom-meetings
openclaw gateway restart
```

禁用不使用的会议插件：

```bash
openclaw plugins disable google-meet
openclaw plugins disable teams-meetings
openclaw plugins disable zoom-meetings
```

如果你的插件管理流程不会自动重启 Gateway，请重启 Gateway。然后在加入会议前运行平台设置检查。

## 验证并加入

| 平台            | 设置检查                       | 加入命令                                                                  |
| --------------- | ------------------------------ | ------------------------------------------------------------------------- |
| Google Meet     | `openclaw googlemeet setup`    | `openclaw googlemeet join 'https://meet.google.com/abc-defg-hij'`             |
| Microsoft Teams | `openclaw teamsmeetings setup` | `openclaw teamsmeetings join 'https://teams.microsoft.com/l/meetup-join/...'` |
| Zoom            | `openclaw zoommeetings setup`  | `openclaw zoommeetings join 'https://zoom.us/j/1234567890'`                   |

将任何失败的设置检查视为对应传输方式和模式的阻断因素。对于仅观察的冒烟测试，请选择 `transcribe` 模式，并确认状态报告显示通话中的会话，然后再期待字幕文本。

对于回传语音冒烟测试，经过验证的语音需要的不仅仅是播放命令接受了字节数据。共享的命令对桥接器会将当前输出生成中的有界波形指纹与通过 BlackHole 麦克风捕获路径返回的音频进行关联；当只有输出字节计数器增加，或存在无关的参与者音频时，Google Meet、Teams 和 Zoom 不会报告 `speechOutputVerified: true`。

## 处理平台政策提示

浏览器自动化可以处理普通的访客姓名、加入前摄像头和麦克风、加入、通话中以及离开控件，但不会绕过平台或组织者的政策要求。

- Google Meet 可能要求登录 Google、由主持人准入，或作出浏览器权限决定。
- Microsoft Teams 可能要求租户登录、电子邮件验证，或由组织者准入。
- Zoom 可能要求身份验证、电子邮件验证、密码、完成 CAPTCHA 或由主持人准入；帐户还可能禁用浏览器加入功能。

当加入或状态结果包含 `manualAction` 时，请在同一个 OpenClaw Chrome 配置文件中完成其报告的步骤，然后重试。反复打开新标签页无法解决帐户、租户、大厅或 CAPTCHA 闸门问题。

仅加入操作员获授权添加代理的会议。当当地政策或同意规则要求披露自动化参与、转录或合成语音时，请告知参与者。

## Discord 语音聊天

[Discord 语音频道](/channels/discord#voice-channels)提供原生的、仅音频的实时对话，无需浏览器会议自动化。OpenClaw 可以加入语音频道、聆听内容、通过 OpenClaw 智能体或实时语音模型处理对话轮次，并朗读回复。即使人们在同一 Discord 频道中使用视频，它也不会发送或接收摄像头视频或屏幕共享内容，因此 Discord 语音是一种相关的实时对话界面，而不是第四个浏览器会议插件。

## 平台指南

- [Google Meet 插件](/plugins/google-meet)
- [Microsoft Teams 会议插件](/plugins/teams-meetings)
- [Zoom 会议插件](/plugins/zoom-meetings)
- [管理插件](/plugins/manage-plugins)
- [浏览器控制](/tools/browser)
