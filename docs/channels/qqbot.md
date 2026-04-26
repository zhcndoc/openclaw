---
summary: "QQ 机器人设置、配置和使用"
read_when:
  - 您想将 OpenClaw 连接到 QQ
  - 您需要 QQ Bot 凭证设置
  - 您想要 QQ Bot 群聊或私聊支持
title: QQ bot
---

QQ Bot 通过官方 QQ Bot API（WebSocket 网关）连接到 OpenClaw。该
插件支持 C2C 私聊、群聊 @ 消息，以及带有丰富媒体（图片、语音、视频、文件）的频道消息。

状态：内置插件。支持私聊、群聊、频道消息和媒体。不支持表情回应和主题帖。

## 内置插件

当前的 OpenClaw 发布版本已捆绑 QQ 机器人，因此正常的打包构建不需要单独的 `openclaw plugins install` 步骤。

## 设置

1. 前往 [QQ 开放平台](https://q.qq.com/) 并使用手机 QQ 扫描二维码以注册/登录。
2. 点击 **创建机器人** 以创建一个新的 QQ 机器人。
3. 在机器人的设置页面找到 **AppID** 和 **AppSecret** 并复制它们。

> AppSecret 不以明文存储 — 如果您离开页面而未保存它，
> 您将不得不重新生成一个新的。

4. 添加渠道：

```bash
openclaw channels add --channel qqbot --token "AppID:AppSecret"
```

5. 重启网关。

交互式设置路径：

```bash
openclaw channels add
openclaw configure --section channels
```

## 配置

最小配置：

```json5
{
  channels: {
    qqbot: {
      enabled: true,
      appId: "YOUR_APP_ID",
      clientSecret: "YOUR_APP_SECRET",
    },
  },
}
```

默认账户环境变量：

- `QQBOT_APP_ID`
- `QQBOT_CLIENT_SECRET`

基于文件的 AppSecret：

```json5
{
  channels: {
    qqbot: {
      enabled: true,
      appId: "YOUR_APP_ID",
      clientSecretFile: "/path/to/qqbot-secret.txt",
    },
  },
}
```

注意：

- 环境变量回退仅适用于默认 QQ 机器人账户。
- `openclaw channels add --channel qqbot --token-file ...` 仅提供
  AppSecret；AppID 必须已在配置或 `QQBOT_APP_ID` 中设置。
- `clientSecret` 也接受 SecretRef 输入，不仅是明文字符串。

### 多账户设置

在单个 OpenClaw 实例下运行多个 QQ 机器人：

```json5
{
  channels: {
    qqbot: {
      enabled: true,
      appId: "111111111",
      clientSecret: "secret-of-bot-1",
      accounts: {
        bot2: {
          enabled: true,
          appId: "222222222",
          clientSecret: "secret-of-bot-2",
        },
      },
    },
  },
}
```

每个账户启动自己的 WebSocket 连接并维护独立的
令牌缓存（按 `appId` 隔离）。

通过 CLI 添加第二个机器人：

```bash
openclaw channels add --channel qqbot --account bot2 --token "222222222:secret-of-bot-2"
```

### 语音（STT / TTS）

STT 和 TTS 支持两级配置，具有优先级回退：

| 设置 | 插件特定 | 框架回退 |
| ------- | -------------------- | ----------------------------- |
| STT     | `channels.qqbot.stt` | `tools.media.audio.models[0]` |
| TTS     | `channels.qqbot.tts` | `messages.tts`                |

```json5
{
  channels: {
    qqbot: {
      stt: {
        provider: "your-provider",
        model: "your-stt-model",
      },
      tts: {
        provider: "your-provider",
        model: "your-tts-model",
        voice: "your-voice",
      },
    },
  },
}
```

将任一一项设置为 `enabled: false` 以禁用。

出站音频上传/转码行为也可以通过
`channels.qqbot.audioFormatPolicy` 调整：

- `sttDirectFormats`
- `uploadDirectFormats`
- `transcodeEnabled`

## 目标格式

| 格式 | 描述 |
| -------------------------- | ------------------ |
| `qqbot:c2c:OPENID`         | 私聊 (C2C) |
| `qqbot:group:GROUP_OPENID` | 群聊 |
| `qqbot:channel:CHANNEL_ID` | 频道 |

> 每个机器人都有自己的一套用户 OpenID。机器人 A 收到的 OpenID **不能**
> 用于通过机器人 B 发送消息。

## 斜杠命令

在 AI 队列之前拦截的内置命令：

| 命令        | 描述                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| `/bot-ping`    | 延迟测试                                                                                             |
| `/bot-version` | 显示 OpenClaw 框架版本                                                                      |
| `/bot-help` | 列出所有命令                                                                                        |
| `/bot-upgrade` | 显示 QQBot 升级指南链接                                                                        |
| `/bot-logs`    | 将最近的网关日志导出为文件                                                                     |
| `/bot-approve` | 通过原生流程批准待处理的 QQ Bot 操作（例如，确认 C2C 或群上传）。 |

在任何命令后附加 `?` 以获取用法帮助（例如 `/bot-upgrade ?`）。

## 引擎架构

QQ Bot 作为插件内的独立引擎提供：

- 每个账户都拥有一套隔离的资源栈（WebSocket 连接、API 客户端、令牌缓存、媒体存储根目录），并以 `appId` 为键。账户之间不会共享入站/出站状态。
- 多账户日志记录器会用所属账户标记日志行，因此当您在一个网关下运行多个机器人时，诊断仍然可以区分。
- 入站、出站和网关桥接路径共享 `~/.openclaw/media` 下的单一媒体载荷根目录，因此上传、下载和转码缓存都会落在一个受保护目录中，而不是按子系统分别建树。
- 凭证可以作为标准 OpenClaw 凭证快照的一部分进行备份和恢复；引擎在恢复时会重新挂载每个账户的资源栈，而无需重新进行二维码配对。

## 二维码引导

作为手动粘贴 `AppID:AppSecret` 的替代方式，引擎支持将 QQ Bot 链接到 OpenClaw 的二维码引导流程：

1. 运行 QQ Bot 设置路径（例如 `openclaw channels add --channel qqbot`），并在提示时选择二维码流程。
2. 使用与目标 QQ Bot 绑定的手机应用扫描生成的二维码。
3. 在手机上批准配对。OpenClaw 会将返回的凭证持久化到正确账户范围下的 `credentials/` 中。

机器人本身生成的批准提示（例如 QQ Bot API 暴露的“允许此操作？”流程）会以原生 OpenClaw 提示的形式出现，您可以使用 `/bot-approve` 接受，而不是通过原始 QQ 客户端回复。

## 故障排查

- **机器人回复“去了火星”：** 凭证未配置或网关未启动。
- **没有入站消息：** 验证 `appId` 和 `clientSecret` 是否正确，并且
  机器人已在 QQ 开放平台上启用。
- **使用 `--token-file` 设置后仍显示未配置：** `--token-file` 只设置
  AppSecret。您仍然需要在配置或 `QQBOT_APP_ID` 中提供 `appId`。
- **主动消息未送达：** 如果用户近期没有与机器人交互，QQ 可能会拦截机器人发起的消息。
- **语音未转写：** 确保 STT 已配置且提供方可访问。

## 相关

- [配对](/channels/pairing)
- [群组](/channels/groups)
- [频道故障排查](/channels/troubleshooting)
