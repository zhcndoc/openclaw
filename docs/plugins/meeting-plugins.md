---
summary: "选择并配置 Google Meet、Microsoft Teams、Slack 会议或 Zoom 参与"
doc-schema-version: 1
read_when:
  - "您希望 OpenClaw 代理加入视频会议"
  - "您正在 Google Meet、Microsoft Teams 会议、Slack 会议和 Zoom 会议插件之间进行选择"
  - "您需要配置共享 Chrome、虚拟音频或会议模式"
title: "会议插件"
---

OpenClaw 具有适用于 Google Meet、Microsoft Teams 会议、Slack 会议和 Zoom 的单独插件。所有四个都可以通过 Chrome 加入，使用相同的参与模式，并在网关主机或配对节点上运行 Chrome。他们的平台 URL、帐户、安装模型和额外功能各不相同。

这些插件参与会议。它们与 [Microsoft Teams 通道 ](/channels/msteams) 和 [Slack 通道 ](/channels/slack) 等消息传递通道以及 [ 语音呼叫插件 ](/plugins/voice-call) 分开。

## <a id="choose-a-plugin"></a> 选择插件

| 平台        | 插件                                      | 接受的会议链接                                                                                      | 安装                                    | 参与方式                                      | 平台特定功能                                                                                |
| --------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Google 见面     | [`google-meet`](/plugins/google-meet)       | `meet.google.com/...`                                                                                       | 从 npm 或 ClawHub 安装；默认启用 | 本地 Chrome、配对节点上的 Chrome，或通过 Twilio 拨入 | 可通过 Meet API 或已登录的浏览器创建会议；可通过 OAuth 读取受支持的 Meet 内容 |
| Microsoft Teams | [`teams-meetings`](/plugins/teams-meetings) | `teams.microsoft.com/l/meetup-join/...` 下的工作链接，以及 `teams.live.com/meet/...` 下的个人用户链接 | 从 npm 或 ClawHub 安装；默认启用 | 本地 Chrome 或配对节点上的 Chrome                  | 支持以访客身份加入工作版和个人用户版会议                                                                     |
| Slack 乱斗   | [`slack-huddles`](/plugins/slack-huddles)   | Slack `/huddle/<TEAM>/<CHANNEL>` 或 `/huddle/<CHANNEL>` 链接，或通道 ID                              | 从npm或ClawHub安装；显式启用  | 本地 Chrome 或配对节点上的 Chrome                  | 作为专门登录的 Slack 用户加入活跃的会话                                                      |
| 飞涨            | [`zoom-meetings`](/plugins/zoom-meetings)   | `zoom.us/j/...` 以及帐户子域名，例如 `example.zoom.us/j/...`                                      | 从 npm 或 ClawHub 安装；默认启用 | 本地 Chrome 或配对节点上的 Chrome                  | 通过 Zoom Web App 以访客身份加入                                                                           |

当您需要创建会议、Google API 工件或 Twilio 电话路径时，请选择 Google Meet。选择 Teams 或 Zoom，以通过浏览器来宾直接参与这些平台。 Teams 和 Zoom 插件不会创建会议、拨入、呼叫供应商 API 或捕获 audio/video 录音。

选择 Slack 会话将座席召集到活动会话中。它需要专门的 Slack 用户登录到 OpenClaw Chrome 配置文件，并且具有对话成员资格。 Slack 应用程序和机器人令牌无法加入群组或读取其音频。该插件不会启动会议或应答传入的铃声。

## <a id="choose-a-mode"></a> 选择模式

这四个插件共享相同的模式：

| 模式         | 行为                                                                                              | 音频要求                                           |
| ------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `agent`      | 实时转录内容会发送到配置的 OpenClaw 代理；常规 OpenClaw TTS 会朗读回复。  | Chrome 回传语音需要受支持的虚拟音频后端。 |
| `bidi`       | 实时语音模型直接侦听和回复，并在支持时使用 OpenClaw 代理委派。   | Chrome 回传语音需要受支持的虚拟音频后端。 |
| `transcribe` | 以仅观察模式加入，并在平台提供字幕时公开有限的实时字幕转录内容。 | 不使用虚拟音频桥接。                                     |

当代理只需要会议文本时，使用 `transcribe`。需要进行常规 OpenClaw 推理和使用工具时，使用 `agent`。当低延迟直接语音比让每轮对话都经过常规代理更重要时，使用 `bidi`。

Google Meet、Teams、Slack 和 Zoom 使用同一个共享会议音频引擎。在 `bidi` 模式下，它们通过 Discord 和 Talk 使用的相同提供商选择、本机代理委派和中断策略来支持 GPT-Live。 GPT-Live有中断；当模型说话时，参与者的音频保持打开状态。

在 `bidi` 模式下，会在不停止音频桥的情况下记录可恢复的提供程序诊断。支持重新连接的提供商拥有该恢复权。终端提供商关闭、恢复耗尽、初始设置失败以及本地音频传输故障仍然会阻止桥接；离开会议也会停止会议。

停止会议要求取消任何活跃的座席咨询。在 `agent` 模式下，OpenClaw 在关闭会话之前完成活动输出和转动事件，然后忽略后期语音合成和音频传送结果。

离开还会等待该会话已允许的音频启动，并在报告完成之前停止生成的运行时间。如果附加运行时后加入失败并且清理无法完成，状态会保持已结束的会话可见，以便 `leave` 可以重试。同一会议的替代者等待挂起的音频启动或停止工作，如果音频清理仍然失败，则可以拒绝；其他会议保持独立。浏览器离开结果保持独立：已解决的仅浏览器离开失败仍然可以重试，而不会永久阻止另一个加入。

有界实时转录仅在 `transcribe` 模式下可用。在所有三种模式中，浏览器连接还将完成的标题行和会议记录保存到共享状态数据库中。保存新演讲时，笔记大约每五分钟更新一次，使用会议代理的实用模型以及主要模型和启发式回退。离开会议时确定可见标题并撰写最终摘要；使用 [`openclaw transcripts`](/cli/transcripts) 列出、检查或导出它。此持久注释路径不会更改实时座席咨询记录或创建 audio/video 录音。

自动笔记默认开启。设置 `transcripts.enabled: false` 可全局禁用持久化笔记。显式选择的 `transcribe` 会话会保留其有限的实时字幕尾部，但不会写入持久化行。字幕是否可用仍取决于会议平台、账户、语言和主持人策略。

## <a id="configure-teams-or-zoom"></a> 配置Teams或缩放

Teams 和 Zoom 插件在公共会议运行时共享相同的配置形状。 Slack 会话也使用这些设置，只不过其 Slack 帐户提供显示名称。仅当您需要覆盖默认值时才添加条目。此示例选择正常代理路径，更改来宾显示名称，并在配对节点上运行 Chrome：

```json5
{
  plugins: {
    entries: {
      "teams-meetings": {
        config: {
          defaultMode: "agent",
          chrome: { guestName: "OpenClaw Agent" },
          chromeNode: { node: "meeting-node" },
        },
      },
    },
  },
}
```

使用 `"zoom-meetings"` 作为 Zoom 的条目 id。省略 `chromeNode` 以在网关主机上运行 Chrome。对于 Slack，使用 `"slack-huddles"`，显式启用该插件，并遵循其 [ 帐户设置](/plugins/slack-huddles#requirements)。

| 设置                          | 用途                                                                           |
| -------------------------------- | --------------------------------------------------------------------------------- |
| `defaultMode`                    | `agent`（默认）、`bidi` 或 `transcribe`                                        |
| `chrome.guestName`               | 在平台预加入页面输入的访客显示名称                           |
| `chrome.browserProfile`          | OpenClaw 用于会议的浏览器配置文件                                     |
| `chrome.audioBackend`            | `auto`（默认）、`blackhole-2ch` 或 `pipewire-pulse`                            |
| `chromeNode.node`                | 拥有 Chrome 和本机虚拟音频后端的配对节点 ID、名称或 IP |
| `realtime.transcriptionProvider` | `agent` 模式使用的实时转录提供程序                              |
| `realtime.voiceProvider`         | `bidi`模式使用的实时语音提供者                                       |
| `realtime.model`                 | 可选的实时模型覆盖                                                  |
| `realtime.agentId`               | 代理以`agent`方式咨询                                                   |
| `realtime.toolPolicy`            | `safe-read-only`, `owner`, or `none`                                              |

对于 GPT-Live with Cove，设置 `defaultMode: "bidi"`、`realtime.voiceProvider: "openai"`、`realtime.model: "gpt-live-1-codex"` 和 `realtime.providers.openai.voice: "cove"`。在网关主机上使用 `openclaw models auth login --provider openai` 登录。 [Google Meet 配置示例](/plugins/google-meet/config#gpt-live-with-cove) 使用相同的字段；将插件条目替换为 `teams-meetings`、`slack-huddles` 或 `zoom-meetings`。未固定的配置保留其提供商的默认模型。 `agent`模式继续使用常规OpenClaw TTS。

## <a id="prepare-chrome-and-audio"></a> 准备 Chrome 和音频

Chrome 可以运行在 Gateway 主机上，也可以运行在已配对的节点上。远程 Chrome 节点必须允许使用 `browser.proxy` 以及平台命令：

| 插件          | Node 命令           |
| --------------- | ---------------------- |
| Google 见面     | `googlemeet.chrome`    |
| Microsoft Teams | `teamsmeetings.chrome` |
| Slack 乱斗   | `slackhuddles.chrome`  |
| 飞涨            | `zoommeetings.chrome`  |

要通过 Chrome 使用 `agent` 或 `bidi` 模式，请在运行 Chrome 的主机上安装原生音频依赖。在 macOS 上：

```bash
brew install blackhole-2ch sox
sudo reboot
system_profiler SPAudioDataType | grep -i BlackHole
command -v sox
```

在使用 PipeWire-Pulse 的 Linux 桌面上，请安装 PulseAudio 命令行工具。OpenClaw 会在桌面用户的音频会话中创建并复用一个 `OpenClaw Meeting Audio` 空接收器及其匹配的源：

```bash
# Debian/Ubuntu
sudo apt install pipewire-audio pulseaudio-utils
systemctl --user --now enable pipewire pipewire-pulse wireplumber
pactl info
command -v pactl pacat parec
```

请以运行 Chrome 的同一桌面用户身份运行 Gateway 或已配对的节点。没有该用户 `XDG_RUNTIME_DIR` 的 root 服务或无头服务无法访问 PipeWire-Pulse 套接字，并会在设置失败时提供可操作的错误信息。

当 Chrome 在配对节点上运行时，网关主机仍拥有 OpenClaw 代理和模型凭据。为 `agent` 模式配置实时转录提供程序和 OpenClaw TTS，或为 `bidi` 模式配置实时语音提供程序。平台指南包含提供商和音频命令选项。

没有显式 `chrome.audioInputCommand` 的 Chrome 会话直接从浏览器播放捕获参与者音频，并使该播放远离虚拟麦克风。本机输出命令将助理语音注入麦克风；本机输入命令验证该注入。在实时语音和 TTS 期间，隔离的参与者输入保持打开状态。捕获失败会导致桥停止运行并出现错误；混合环回音频不用作 Live 的后备。

显式输入命令在本地和配对节点 Chrome 上保留其现有的提供者输入行为，包括自定义捕获、过滤器和混合器。他们保留了现有的回声保护。要选择 GPT-Live，请删除输入覆盖并使用托管隔离捕获； Live 会拒绝无法验证其隔离性的自定义命令路径，而不是默默地替换它。

## <a id="install-or-disable-plugins"></a> 安装或禁用插件

安装您需要的会议插件。安装后默认启用 Google Meet、Teams 和 Zoom。 Slack huddles 在设置其专用用户帐户后需要显式启用：

```bash
openclaw plugins install @openclaw/google-meet
openclaw plugins install @openclaw/teams-meetings
openclaw plugins install @openclaw/slack-huddles
openclaw plugins enable slack-huddles
openclaw plugins install @openclaw/zoom-meetings
```

禁用不使用的会议插件：

```bash
openclaw plugins disable google-meet
openclaw plugins disable teams-meetings
openclaw plugins disable slack-huddles
openclaw plugins disable zoom-meetings
```

这些更改会自动应用于正在运行的网关。如果离线，请在加入之前启动它。检查申请结果，然后运行下面的平台设置检查；请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

## <a id="verify-and-join"></a> 验证并加入

| 平台        | 设置检查                    | 加入命令                                                                  |
| --------------- | ------------------------------ | ----------------------------------------------------------------------------- |
| Google 见面     | `openclaw googlemeet setup`    | `openclaw googlemeet join 'https://meet.google.com/abc-defg-hij'`             |
| Microsoft Teams | `openclaw teamsmeetings setup` | `openclaw teamsmeetings join 'https://teams.microsoft.com/l/meetup-join/...'` |
| Slack 乱斗   | `openclaw slackhuddles setup`  | `openclaw slackhuddles join 'channel:C0123ABCD'`                              |
| 飞涨            | `openclaw zoommeetings setup`  | `openclaw zoommeetings join 'https://zoom.us/j/1234567890'`                   |

将任何失败的设置检查视为对应传输方式和模式的阻断因素。对于仅观察的冒烟测试，请选择 `transcribe` 模式，并确认状态报告显示通话中的会话，然后再期待字幕文本。

对于对讲冒烟测试，经过验证的语音需要的字节数超过播放命令接受的字节数。共享命令对桥将当前输出生成的有界波形指纹与所选虚拟麦克风捕获路径上返回的音频相关联；当仅输出字节计数器前进或存在不相关的参与者音频时，Google Meet、Teams、Slack huddle 和 Zoom 不会报告 `speechOutputVerified: true`。

这验证了本地麦克风注入。使用受控的第二个参与者来证明实际会议期间的远程可听性和中​​断。

## <a id="handle-platform-policy-prompts"></a> 处理平台政策提示

浏览器自动化可以处理普通的访客姓名、加入前摄像头和麦克风、加入、通话中以及离开控件，但不会绕过平台或组织者的政策要求。

- Google Meet 可能要求登录 Google、由主持人准入，或作出浏览器权限决定。
- Microsoft Teams 可能要求租户登录、电子邮件验证，或由组织者准入。
- Slack 会话需要登录用户和活动会话；确认、其他设备、加入请求或浏览器权限可能需要手动操作。为字幕转录启用帐户的“加入字幕”首选项。
- Zoom 可能要求身份验证、电子邮件验证、密码、完成 CAPTCHA 或由主持人准入；帐户还可能禁用浏览器加入功能。

当加入或状态结果包含 `manualAction` 时，请在同一个 OpenClaw Chrome 配置文件中完成其报告的步骤，然后重试。反复打开新标签页无法解决帐户、租户、大厅或 CAPTCHA 闸门问题。

仅加入操作员获授权添加代理的会议。当当地政策或同意规则要求披露自动化参与、转录或合成语音时，请告知参与者。

## <a id="discord-voice-chat"></a> Discord 语音聊天

[Discord 语音通道](/channels/discord/voice-channels#voice-channels) 提供本机纯音频实时对话，无需浏览器会议自动化。 OpenClaw 可以加入语音通道、收听、通过 OpenClaw 代理或实时语音模型路由轮流，以及说出回复。即使人们在同一 Discord 频道中使用视频，它也不会发送或接收摄像头视频或屏幕共享，因此 Discord 语音是相关的实时对话界面，而不是浏览器会议插件。

## <a id="platform-guides"></a> 平台指南

- [Google Meet 插件](/plugins/google-meet)
- [Microsoft Teams 会议插件](/plugins/teams-meetings)
- [Slack 协作插件](/plugins/slack-huddles)
- [Zoom 会议插件](/plugins/zoom-meetings)
- [管理插件](/plugins/manage-plugins)
- [浏览器控制](/tools/browser)
