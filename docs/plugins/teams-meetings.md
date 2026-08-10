---
summary: "Microsoft Teams 会议插件：作为 Chrome 浏览器访客加入工作或个人会议"
read_when:
  - 你希望 OpenClaw 代理加入 Microsoft Teams 会议
  - 你正在为 Teams 会议回传音频配置 Chrome 或虚拟音频
title: "Microsoft Teams 会议"
---

`teams-meetings` 插件会在 OpenClaw Chrome 配置文件中以访客身份加入 Microsoft Teams 链接。它支持 `teams.microsoft.com/l/meetup-join/...` 下的工作链接，以及 `teams.live.com/meet/...` 下的个人链接。它不会创建会议、拨号加入、调用 Microsoft Graph，也不会录制音频或视频。

## 设置

Talk-back 使用共享的 [会议插件音频设置](/plugins/meeting-plugins#prepare-chrome-and-audio)：在 macOS 上使用 `BlackHole 2ch` 加 SoX，在 Linux 上使用 PipeWire-Pulse 加 `pactl`/`pacat`/`parec`。

```bash
openclaw plugins install @openclaw/teams-meetings
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

安装后，该插件默认启用。只有需要自定义时才添加配置项，然后检查设置：

```json5
{
  plugins: {
    entries: {
      "teams-meetings": {
        config: {
          defaultMode: "agent",
          chrome: { guestName: "OpenClaw 代理" },
        },
      },
    },
  },
}
```

如果不希望启用该插件，请运行 `openclaw plugins disable teams-meetings`。

```bash
openclaw teamsmeetings setup
openclaw teamsmeetings join 'https://teams.microsoft.com/l/meetup-join/...'
```

使用 `chromeNode.node` 在已配对的 macOS 或 Linux 节点上运行 Chrome 及其原生虚拟音频后端。该节点必须允许 `teamsmeetings.chrome` 和 `browser.proxy`；后端设置和生成的命令将在该节点上解析，而不是在 Gateway 主机上解析。

## 模式

| 模式         | 行为                                                                    |
| ------------ | ----------------------------------------------------------------------- |
| `agent`      | 实时转录会咨询已配置的 OpenClaw 代理；回复通过 TTS 播放。 |
| `bidi`       | 实时语音模型直接聆听并回复。                        |
| `transcribe` | 仅观察模式加入，并提供实时字幕转录快照。                   |

在所有模式下，Teams 实时字幕会在加入后启用，以便 OpenClaw
保存带有发言者归属的笔记。`transcript` 操作仍仅为 `transcribe` 会话返回
有界实时缓冲区。离开时，OpenClaw 会将持久化转录和派生摘要存储到共享状态数据库中；可通过 [`openclaw transcripts`](/cli/transcripts) 列出或导出。

自动笔记默认启用。设置 `transcripts.enabled: false` 可在全局范围内
禁用持久化笔记；显式使用 `transcribe` 模式时仍只会公开其有界的实时尾部。

## 来宾加入限制

浏览器适配器会关闭应用中间页，填写来宾姓名，关闭摄像头，按照所选模式配置麦克风，并点击加入按钮。通话中状态使用挂断控件；大厅、租户登录和设备权限状态会返回明确的手动操作原因。支持消费者会议启动器重定向，以及 Chrome 显示的 `BlackHole 2ch (Virtual)` 标签。

Teams 租户策略可能要求登录、验证电子邮件或由组织者批准加入。在 OpenClaw Chrome 配置文件中完成相应步骤，然后重试状态或语音操作。该插件不会绕过租户策略。

消费者 Teams Web 客户端已对应用中间页、来宾姓名输入、加入前麦克风/摄像头切换、加入、大厅批准、媒体权限、通话中检测、实时字幕、BlackHole 输入/输出路由、离开以及通话后检测进行了实时验证。工作租户可能会施加不同的登录、电子邮件验证、加入批准和离开确认策略；请在 OpenClaw Chrome 配置文件中完成报告的任何手动操作。

## 工具和网关接口

`teams_meetings` 代理工具支持 `join`、`leave`、`status`、`transcript` 和 `speak`。网关方法使用 `teamsmeetings.*` 前缀。节点命令是 `teamsmeetings.chrome`。

## 相关内容

- [会议插件概览](/plugins/meeting-plugins)
- [Microsoft Teams 频道](/channels/msteams)
