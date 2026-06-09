---
summary: "QQ Bot 设置、配置与使用"
read_when:
  - 你想将 OpenClaw 连接到 QQ
  - 你需要 QQ Bot 凭据设置
  - 你希望支持 QQ Bot 群聊或私聊
title: QQ bot
---

QQ Bot 通过官方 QQ Bot API（WebSocket 网关）连接到 OpenClaw。该
插件支持 C2C 私聊、群 @消息，以及带
富媒体（图片、语音、视频、文件）的频道消息。

状态：可下载插件。支持私聊、群聊、频道，以及
媒体。不支持表情反应和线程。

## 安装

安装前先安装 QQ Bot：

```bash
openclaw plugins install @openclaw/qqbot
```

## 设置

1. 前往 [QQ 开放平台](https://q.qq.com/)，并使用你的
   手机 QQ 扫码注册 / 登录。
2. 点击 **创建机器人** 创建一个新的 QQ bot。
3. 在机器人设置页找到 **AppID** 和 **AppSecret**，并复制它们。

> AppSecret 不会以明文存储——如果你离开页面前没有保存，
> 你将需要重新生成一个新的。

4. 添加频道：

```bash
openclaw channels add --channel qqbot --token "AppID:AppSecret"
```

5. 重启 Gateway。

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

默认账号环境变量：

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

Env SecretRef AppSecret:

```json5
{
  channels: {
    qqbot: {
      enabled: true,
      appId: "YOUR_APP_ID",
      clientSecret: { source: "env", provider: "default", id: "QQBOT_CLIENT_SECRET" },
    },
  },
}
```

说明：

- 环境变量回退仅适用于默认 QQ Bot 账号。
- `openclaw channels add --channel qqbot --token-file ...` 只提供
  AppSecret；AppID 必须已在配置中设置，或通过 `QQBOT_APP_ID` 提供。
- `clientSecret` 也接受 SecretRef 输入，不仅仅是明文字符串。
- 旧式的 `secretref:/...` 标记字符串不是有效的 `clientSecret` 值；
  请使用上面的结构化 SecretRef 对象。

### 多账号设置

在单个 OpenClaw 实例下运行多个 QQ bot：

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

每个账号都会启动自己的 WebSocket 连接，并维护独立的
令牌缓存（按 `appId` 隔离）。

通过 CLI 添加第二个 bot：

```bash
openclaw channels add --channel qqbot --account bot2 --token "222222222:secret-of-bot-2"
```

### 群聊

QQ Bot 群聊支持使用 QQ 群 OpenID，而不是显示名称。将 bot
加入群组，然后提及它，或者将群组配置为无需提及即可运行。

```json5
{
  channels: {
    qqbot: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["member_openid"],
      groups: {
        "*": {
          requireMention: true,
          historyLimit: 50,
          tools: { deny: ["exec", "read", "write"] },
        },
        GROUP_OPENID: {
          name: "Release room",
          requireMention: false,
          ignoreOtherMentions: true,
          historyLimit: 20,
          prompt: "保持回复简短且以操作为主。",
        },
      },
    },
  },
}
```

`groups["*"]` 为每个群设置默认值，而具体的
`groups.GROUP_OPENID` 条目会覆盖该群的默认值。群组
设置包括：

- `requireMention`: 在 bot 回复前需要 @提及。默认值：`true`。
- `ignoreOtherMentions`: 丢弃提到了其他人但没有提到 bot 的消息。
- `historyLimit`: 将最近未提及的群消息保留为下一次被提及时的上下文。设为 `0` 可禁用。
- `tools`: 为整个群允许/拒绝工具。
- `toolsBySender`: 按发送者覆盖群工具设置；参见 [Groups](/channels/groups#groupchannel-tool-restrictions-optional)。
- `name`: 日志和群上下文中使用的友好标签。
- `prompt`: 追加到 agent 上下文中的每个群行为提示。

旧版 QQBot `toolPolicy` 条目已废弃。运行 `openclaw doctor --fix` 将其迁移为 `tools`。

激活模式为 `mention` 和 `always`。`requireMention: true` 映射到
`mention`；`requireMention: false` 映射到 `always`。当存在会话级激活
覆盖时，其优先级高于配置。

入站队列按对端分开。群对端获得更大的队列上限，在满载时优先保留人类
消息而不是 bot 自己发出的消息，并将正常群消息的突发合并为一个带归属的
轮次。斜杠命令仍然会逐个执行。

### 语音（STT / TTS）

STT 和 TTS 支持两级配置，并按优先级回退：

| 设置    | 插件专用                                               | 框架回退                     |
| ------- | ------------------------------------------------------ | ---------------------------- |
| STT     | `channels.qqbot.stt`                                   | `tools.media.audio.models[0]` |
| TTS     | `channels.qqbot.tts`, `channels.qqbot.accounts.<id>.tts` | `messages.tts`              |

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
      accounts: {
        "qq-main": {
          tts: {
            providers: {
              openai: { voice: "shimmer" },
            },
          },
        },
      },
    },
  },
}
```

将 `enabled: false` 设置在任一项上即可禁用。
账号级 TTS 覆盖使用与 `messages.tts` 相同的结构，并在
channel/global TTS 配置之上进行深度合并。

入站 QQ 语音附件会以音频媒体元数据的形式暴露给 agents，同时将原始语音文件
排除在通用 `MediaPaths` 之外。`[[audio_as_voice]]` 纯文本
回复会合成 TTS，并在配置了 TTS 时发送原生 QQ 语音消息。

出站音频上传/转码行为也可以通过
`channels.qqbot.audioFormatPolicy` 进行调整：

- `sttDirectFormats`
- `uploadDirectFormats`
- `transcodeEnabled`

## 目标格式

| 格式                       | 描述                 |
| -------------------------- | -------------------- |
| `qqbot:c2c:OPENID`         | 私聊（C2C）          |
| `qqbot:group:GROUP_OPENID` | 群聊                 |
| `qqbot:channel:CHANNEL_ID` | 频道                |

> 每个 bot 都有自己的一组用户 OpenID。Bot A 收到的 OpenID **不能**
> 用于通过 Bot B 发送消息。

## 斜杠命令

在 AI 队列之前拦截的内置命令：

| Command        | Description                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| `/bot-ping`    | 延迟测试                                                                                                 |
| `/bot-version` | 显示 OpenClaw 框架版本                                                                                    |
| `/bot-help`    | 列出所有命令                                                                                              |
| `/bot-me`      | 显示发送者的 QQ 用户 ID（openid），用于 `allowFrom`/`groupAllowFrom` 设置                               |
| `/bot-upgrade` | 显示 QQBot 升级指南链接                                                                                   |
| `/bot-logs`    | 将最近的网关日志导出为文件                                                                                |
| `/bot-approve` | 通过原生流程批准一个待处理的 QQ Bot 操作（例如，确认一次 C2C 或群上传）。 |

在任何命令后追加 `?` 可查看用法帮助（例如 `/bot-upgrade ?`）。

管理命令 (`/bot-me`, `/bot-upgrade`, `/bot-logs`, `/bot-clear-storage`, `/bot-streaming`, `/bot-approve`) 仅限私聊，并要求发送者的 openid 明确位于非通配符的 `allowFrom` 列表中。通配符 `allowFrom: ["*"]` 允许聊天，但不授予管理命令访问权限。群消息先匹配 `groupAllowFrom`，再回退到 `allowFrom`。在群里运行管理命令会返回提示，而不是静默丢弃。

When QQ Bot exec approvals use the default same-chat fallback, native approval
button clicks follow the same explicit non-wildcard command allowlist. To grant
approval-only access without broader command access, configure
`channels.qqbot.execApprovals.approvers`.

## Engine architecture

QQ Bot 作为一个自包含引擎随插件发布：

- 每个账号拥有隔离的资源栈（WebSocket 连接、API 客户端、令牌缓存、媒体存储根目录），并以 `appId` 作为键。账号之间从不共享入站/出站状态。
- 多账号日志器会使用所属账号标记日志行，因此当你在一个网关下运行多个 bot 时，诊断信息仍然可以分开。
- 入站、出站以及网关桥接路径共享 `~/.openclaw/media` 下的单一媒体载荷根目录，因此上传、下载和转码缓存会落在一个受保护目录中，而不是按子系统分别建树。
- 富媒体交付通过一个用于 C2C 和群目标的 `sendMedia` 路径完成。大文件阈值以上的本地文件和缓冲区会使用 QQ 的分块上传端点，而较小载荷则使用一次性媒体 API。
- 凭据可以作为标准 OpenClaw 凭据快照的一部分进行备份和恢复；引擎在恢复时会重新挂载每个账号的资源栈，而无需重新进行一次扫码配对。

## 二维码入驻

作为手动粘贴 `AppID:AppSecret` 的替代方式，引擎支持通过二维码为 QQ Bot 绑定 OpenClaw 的入驻流程：

1. 运行 QQ Bot 设置路径（例如 `openclaw channels add --channel qqbot`），并在提示时选择二维码流程。
2. 使用与目标 QQ Bot 绑定的手机应用扫描生成的二维码。
3. 在手机上批准配对。OpenClaw 会将返回的凭据持久化到正确账号范围下的 `credentials/` 中。

由 bot 自身生成的批准提示（例如 QQ Bot API 暴露的“是否允许此操作？”流程）会以原生 OpenClaw 提示的形式呈现，你可以使用 `/bot-approve` 接受，而不是通过原始 QQ 客户端回复。

## 故障排查

- **Bot 回复 “gone to Mars”：** 凭据未配置或 Gateway 未启动。
- **没有入站消息：** 验证 `appId` 和 `clientSecret` 是否正确，并且
  bot 已在 QQ 开放平台上启用。
- **重复自我回复：** OpenClaw 会将 QQ 出站引用索引记录为
  bot 自己发出，并忽略当前 `msgIdx` 与
  同一 bot 账号匹配的入站事件。这可以防止平台回声循环，同时仍允许用户
  引用或回复先前的 bot 消息。
- **使用 `--token-file` 设置后仍显示未配置：** `--token-file` 只设置
  AppSecret。你仍然需要在配置中或通过 `QQBOT_APP_ID` 提供 `appId`。
- **主动消息未送达：** 如果用户最近没有与 bot 交互，QQ 可能会拦截 bot 主动发出的消息。
- **语音未转写：** 确保已配置 STT 且提供方可访问。

## 相关

- [配对](/channels/pairing)
- [群组](/channels/groups)
- [频道故障排除](/channels/troubleshooting)
