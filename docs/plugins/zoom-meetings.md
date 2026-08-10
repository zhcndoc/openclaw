---
summary: "Zoom 会议插件：以 Chrome 浏览器访客身份加入会议"
read_when:
  - 你希望 OpenClaw 代理加入 Zoom 会议
  - 你正在为 Zoom 会议中的双向语音配置 Chrome 或虚拟音频
title: "Zoom 会议插件"
---

`zoom-meetings` 插件通过 OpenClaw Chrome 配置文件中的 Zoom Web App，以访客身份加入 Zoom 会议链接。它接受 `zoom.us/j/...` 形式的会议链接，以及账户子域名形式的链接，例如 `example.zoom.us/j/...`。它不会创建会议、拨入会议、使用 Zoom Meeting SDK，也不会录制音频或视频。

## 设置

Talk-back 使用共享的 [会议插件音频设置](/plugins/meeting-plugins#prepare-chrome-and-audio)：macOS 上使用 `BlackHole 2ch` 加 SoX，Linux 上使用 PipeWire-Pulse 加 `pactl`/`pacat`/`parec`。

```bash
openclaw plugins install @openclaw/zoom-meetings
openclaw gateway restart
brew install blackhole-2ch sox
sudo reboot
system_profiler SPAudioDataType | grep -i BlackHole
command -v sox
```

在 Linux 上，请改为验证桌面用户的 PipeWire-Pulse 会话：

```bash
pactl info
command -v pactl pacat parec
```

安装后默认启用该插件。只有在需要自定义时才添加配置项，然后检查设置：

```json5
{
  plugins: {
    entries: {
      "zoom-meetings": {
        config: {
          defaultMode: "agent",
          chrome: { guestName: "OpenClaw Agent" },
        },
      },
    },
  },
}
```

如果不希望启用该插件，请运行 `openclaw plugins disable zoom-meetings`。

```bash
openclaw zoommeetings setup
openclaw zoommeetings join 'https://zoom.us/j/1234567890'
```

使用 `chromeNode.node` 在已配对的 macOS 或 Linux 节点上运行 Chrome 及其原生虚拟音频后端。该节点必须允许 `zoommeetings.chrome` 和 `browser.proxy`；后端设置和生成的命令将在该节点上解析，而不是在 Gateway 主机上解析。

## 模式

| 模式         | 行为                                                                    |
| ------------ | ----------------------------------------------------------------------- |
| `agent`      | 实时转写会调用配置的 OpenClaw 代理；使用 TTS 回复。 |
| `bidi`       | 实时语音模型直接监听并回复。                        |
| `transcribe` | 仅观察模式加入，并提供实时字幕转写快照。              |

在每种模式下，获准加入后都会启用 Zoom 实时字幕，以便 OpenClaw
持久化会议记录。`transcript` 操作仍仅为 `transcribe` 会话返回有界的实时
缓冲区。离开时，OpenClaw 会将持久化转写内容和生成的摘要存储在共享状态数据库中；可使用 [`openclaw transcripts`](/cli/transcripts) 列出或导出这些内容。

默认启用自动记录。设置 `transcripts.enabled: false` 可全局禁用持久化记录；显式使用
`transcribe` 模式时仍只会公开其有界的实时尾部。

## 访客加入限制

浏览器适配器选择 **从浏览器加入**，填写访客姓名，关闭摄像头，为所选模式配置麦克风，然后点击 **加入**。Zoom Web App 运行在 `app.zoom.us` 下；插件会在导航前授予该来源使用麦克风和选择扬声器的权限。通话中状态使用 Zoom 的 **离开** 控件。等候室、登录、密码、验证码和设备权限状态会返回明确的手动操作原因。

Zoom 主持人和账户策略可能会禁用浏览器加入、要求身份验证或电子邮件验证、显示验证码，或要求主持人允许加入。在 OpenClaw Chrome 配置文件中完成相应步骤，然后重试状态检查或语音操作。插件不会绕过 Zoom 的策略。

Zoom Web App 已通过官方 Zoom 测试会议完成实时验证，涵盖应用中间页、iframe 访客姓名输入、加入前的麦克风和摄像头控件、加入、浏览器和 macOS 媒体权限、通话中检测、实时字幕启用以及主持人结束会议检测。等候室和身份验证状态取决于主持人策略；当没有可用的稳定 DOM 标识符时，会保留文本回退方案。

## 工具和网关接口

`zoom_meetings` 代理工具支持 `join`、`leave`、`status`、`transcript` 和 `speak`。网关方法使用 `zoommeetings.*` 前缀。节点命令为 `zoommeetings.chrome`。

## 相关内容

- [会议插件概览](/plugins/meeting-plugins)
