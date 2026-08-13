---
summary: "QQ Bot 设置、配置与使用"
read_when:
  - 你想将 OpenClaw 连接到 QQ
  - 你需要 QQ Bot 凭据设置
  - 你希望支持 QQ Bot 群聊或私聊
title: QQ Bot
---

QQ Bot 通过官方 QQ Bot API（WebSocket 网关）连接到 OpenClaw。
C2C 私聊和群聊中的 `@` 提及是主要聊天类型，支持富媒体（图片、语音、视频、文件）。频道消息仅支持文本和远程 URL 图片；频道中不支持语音、视频、文件上传以及本地／Base64 图片。任何地方都不支持反应和线程。

状态：官方可下载插件。

## 安装

```bash
openclaw plugins install @tencent-connect/openclaw-qqbot
```

## 设置

1. 前往 [QQ 开放平台](https://q.qq.com/)，并使用你的
   手机 QQ 扫码注册／登录。
2. 点击 **创建机器人** 创建一个新的 QQ bot。
3. 在机器人设置页找到 **AppID** 和 **AppSecret**，并复制它们。

<Note>
AppSecret 不会以明文存储。如果你在未保存的情况下离开页面，就必须重新生成一个新的。
</Note>

4. 添加频道：

```bash
openclaw channels add --channel qqbot --token "AppID:AppSecret"
```

5. 重启 Gateway。

## 入站持久性

对于 QQ 网关转发事件，OpenClaw 会在推进已保存的网关恢复序列之前先持久化原始事件。待处理或可重试的转发在 Gateway 重启后仍会保留，且会按会话序列化，并在活跃或保留的完成记录存在时使用提供方事件 ID 来抑制重复的队列条目。

如果持久化接纳失败，OpenClaw 会在不推进序列的情况下终止当前的网关 socket。随后重新连接/恢复路径可以再次请求该未提交事件。在队列到代理边界之间，投递仍然是至少一次，因此在交接过程中发生崩溃时可能会重放一个转发。

交互式设置：

```bash
openclaw channels add
```

该向导还提供二维码绑定作为手动输入 AppID/AppSecret 的替代方案：
使用与目标 QQ Bot 绑定的手机应用扫描二维码即可完成绑定。OpenClaw 会将返回的凭据持久化到该账户的配置作用域下。

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

默认账号环境变量（仅顶层账号）：

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

- `openclaw channels add --channel qqbot --token-file ...` 仅设置 AppSecret；
  `appId` 必须已在配置中或 `QQBOT_APP_ID` 中设置。
- `clientSecret` 接受纯文本字符串或文件路径（`clientSecretFile`）。
- 已知限制：外部 `@tencent-connect/openclaw-qqbot` 软件包不支持用于
  `clientSecret` 的结构化 SecretRef 对象。如果你的配置使用了此类对象，
  请在升级前将密钥移至 `QQBOT_CLIENT_SECRET` 环境变量
  （或 `clientSecretFile`）。

### 流式传输

```json5
{
  channels: {
    qqbot: {
      streaming: {
        mode: "partial", // 块流式传输：`partial`（默认）或 `off`
        nativeTransport: true, // 对 DM 使用 QQ 官方的 C2C `stream_messages` API
      },
    },
  },
}
```

- `streaming.mode: "off"` 会为该账号禁用块流式传输。
- `streaming.nativeTransport: true` 会通过 QQ 官方的 `stream_messages` API
  为 C2C（DM）回复提供流式传输；群聊／频道目标不受影响。
- 旧版的 `streaming: true|false` 标量以及 `streaming.c2cStreamApi` 键
  可通过 `openclaw doctor --fix` 迁移为此结构。
- `/bot-streaming on|off` 会从 DM 中切换同样的配置。

### 访问策略

- `allowFrom` ／ `groupAllowFrom` 门控谁可以在 C2C ／
  群上下文中与机器人聊天。`dmPolicy` ／ `groupPolicy`（`open` ｜ `allowlist` ｜ `disabled`）
  控制执行模式。当 `allowFrom` 有一个具体的（非通配符）条目时，
  `dmPolicy` 默认变为 `allowlist`，否则为 `open`。
  当 `groupAllowFrom` 或 `allowFrom` 其中任一具有具体条目时，
  `groupPolicy` 默认变为 `allowlist`，否则为 `open`。
- `contextVisibility` 控制 QQ 作为补充上下文提供的引用消息文本。默认值 `"all"` 会保留收到的引用文本。
  设为 `"allowlist"` 时，仅在被引用发送者通过配置的发送者策略时才包含引用正文，
  或设为 `"allowlist_quote"` 以保留显式引用，同时过滤其他补充上下文。参见 [群聊](/channels/groups#context-visibility-and-allowlists)。
- `"Auth: allowlist"` 斜杠命令要求在 `allowFrom` 中存在明确的非通配符条目
  （群调用则为 `groupAllowFrom`），不受 `dmPolicy` ／ `groupPolicy` 影响 —
  参见 [斜杠命令](#slash-commands)。

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

每个账号都拥有独立的 WebSocket 连接、API 客户端和 token 缓存，并按 `appId` 作为键区分。
日志行会标记所属账号 id，因此当你在同一个 Gateway 下运行多个 bot 时，诊断信息仍然可以分开查看。

通过 CLI 添加第二个 bot：

```bash
openclaw channels add --channel qqbot --account bot2 --token "222222222:secret-of-bot-2"
```

### 群聊

群聊支持使用 QQ 群 OpenID，而不是显示名称。先将机器人添加到群里，然后 @ 它，或者将群配置为无需 @ 也能运行。

```json5
{
  channels: {
    qqbot: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["member_openid"],
      groups: {
        "*": {
          requireMention: true,
          commandLevel: "all",
          historyLimit: 50,
          tools: { deny: ["exec", "read", "write"] },
        },
        GROUP_OPENID: {
          name: "Release room",
          requireMention: false,
          ignoreOtherMentions: true,
          commandLevel: "safety",
          historyLimit: 20,
          prompt: "保持回复简短且以操作为主。",
        },
      },
    },
  },
}
```

`groups["*"]` 为所有群设置默认值；具体的 `groups.GROUP_OPENID` 条目会覆盖某个群的这些默认值。群设置如下：

| 字段                  | 默认值               | 说明                                                                                           |
| --------------------- | -------------------- | ---------------------------------------------------------------------------------------------- |
| `requireMention`      | `true`               | 在机器人回复前要求先 `@` 提及它。                                                                |
| `commandLevel`        | `all`                | 群内可运行哪些内置斜杠命令（见下文）。                                                         |
| `ignoreOtherMentions` | `false`              | 丢弃提及了别人但没有提及机器人的消息。                                                         |
| `historyLimit`        | `50`                 | 为下一次被提及时保留的最近非提及消息上下文数量。`0` 可禁用历史记录。                           |
| `tools`               | —                    | 为整个群允许／拒绝工具。                                                                        |
| `toolsBySender`       | —                    | 按发送者覆盖工具设置；见 [群聊](/channels/groups#groupchannel-tool-restrictions-optional)。 |
| `name`                | openid 前缀          | 日志和群上下文中使用的友好名称。                                                               |
| `prompt`              | 内置默认值            | 附加到代理上下文中的群级行为提示词。                                                           |

`commandLevel` 接受：

| 级别     | 行为                                                                                                                                      |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `all`    | 现有内置命令保持可用。部分命令会在菜单中隐藏，但授权用户仍可在群里运行它们。                                                               |
| `safety` | `/help`、`/btw`、`/stop` 在群里保持可见；敏感命令（`/config`、`/tools`、`/bash` 等）必须在私聊中运行。                                    |
| `strict` | 仅允许严格运行所需的群会话控制命令。`/stop` 仍然可用，因此授权发送者可以中断当前运行。                                                     |

旧版 QQBot 的 `toolPolicy` 条目已弃用。运行 `openclaw doctor --fix` 将其迁移到 `tools`。

激活模式为 `mention` 和 `always`。`requireMention: true` 映射到
`mention`；`requireMention: false` 映射到 `always`。当存在会话级激活
覆盖时，其优先级高于配置。

入站队列按对端（peer）划分。群对端的队列上限更大（50，而私聊对端为 20），满时会优先驱逐机器人发送的消息而不是人类消息，并将普通群消息的短时间突发合并为一个带归属的轮次。斜杠命令逐个运行，不受任何合并批次影响。

### 语音（STT ／ TTS）

STT 和 TTS 支持两级配置，并按优先级回退：

| 设置 | 插件专用                                                | 框架回退                                       |
| ------- | -------------------------------------------------------- | ------------------------------------------------ |
| STT     | `channels.qqbot.stt`                                     | `tools.media.models[]` 中第一个支持音频的条目 |
| TTS     | `channels.qqbot.tts`、`channels.qqbot.accounts.<id>.tts` | `tts`                                            |

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

将任一项设为 `enabled: false` 可禁用。账号级 TTS 覆盖的结构与 `tts` 相同，并会在频道／全局 TTS 配置之上进行深度合并。

STT 请求默认在 60 秒后超时。插件专用 STT 使用所选
`models.providers.<id>.timeoutSeconds` 覆盖值。框架音频 STT 使用所选支持音频的
`tools.media.models[]` 条目的 `timeoutSeconds`，然后再使用所选提供方覆盖值。

进入的 QQ 语音附件会作为音频媒体元数据暴露给代理，
同时不会将原始语音文件放入通用的 `MediaPaths` 中。`[[audio_as_voice]]`
出现在纯文本回复中时，会合成 TTS，并在配置了 TTS 时发送原生 QQ 语音消息。

出站音频上传／转码行为也可以通过
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

<Note>
每个机器人都有自己的一组用户 OpenID。由 Bot A 接收到的 OpenID **不能**用于通过 Bot B 发送消息。
</Note>

## 斜杠命令

在 AI 队列之前拦截的内置命令：

| 命令                 | 认证      | 范围         | 描述                                                                       |
| -------------------- | --------- | ------------ | -------------------------------------------------------------------------- |
| `/bot-ping`          | —         | 任意         | 延迟测试                                                                   |
| `/bot-help`          | —         | 任意         | 列出所有命令                                                               |
| `/bot-me`            | —         | 仅限私聊     | 显示发送者的 QQ 用户 ID（openid），用于 `allowFrom` / `groupAllowFrom` 配置 |
| `/bot-version`       | —         | 仅限私聊     | 显示 OpenClaw 框架版本和插件版本                                           |
| `/bot-upgrade`       | —         | 仅限私聊     | 显示 QQBot 升级指南链接                                                     |
| `/bot-approve`       | allowlist | 仅限私聊     | 管理命令执行审批配置（on / off / always / reset / status）                  |
| `/bot-logs`          | allowlist | 仅限私聊     | 将最近的网关日志导出为文件                                                 |
| `/bot-clear-storage` | allowlist | 仅限私聊     | 删除 QQBot 媒体目录下的缓存下载                                            |
| `/bot-streaming`     | allowlist | 仅限私聊     | 切换 C2C 流式回复                                                           |
| `/bot-group-allways` | allowlist | 仅限私聊     | 切换默认群激活模式（需要提及 vs. 始终开启）                                |

在任何命令后追加 `?` 可查看用法帮助（例如 `/bot-upgrade ?`）。

“Auth: allowlist”命令还要求发送者的 openid 必须出现在一个
明确的非通配符 `allowFrom` 列表中（群消息命令优先使用 `groupAllowFrom`，
否则回退到 `allowFrom`）。`allowFrom: ["*"]` 这种通配符
允许聊天，但不允许这些命令。在私聊之外运行这些命令，或未获授权时，
会返回提示信息，而不是静默丢弃消息。

`/bot-me`、`/bot-version` 和 `/bot-upgrade` 仅限私聊，但不
需要 allowlist——任何 C2C 发送者都可以运行它们。

当 QQ Bot 执行审批使用默认的同聊回退时，原生审批
按钮点击遵循相同的明确非通配符命令 allowlist。若要在不授予更广泛命令权限的情况下
仅授予审批访问权限，请配置
`channels.qqbot.execApprovals.approvers`。原生执行审批默认已启用。

## 媒体与存储

- 入站、出站和网关桥接媒体共享一个载荷根目录，位于
  `~/.openclaw/media/qqbot`（在设置了 `OPENCLAW_HOME` 时会遵循该配置），因此上传、下载和转码缓存都保留在一个受保护的目录下。
- 面向 C2C 和群目标的富媒体发送都通过同一个 `sendMedia`
  路径。大小为 5&nbsp;MiB 或以上的本地文件和内存缓冲区使用 QQ 的分块上传端点；较小的载荷以及远程 URL/Base64 来源则使用一次性上传 API。
- 如果热升级在 Gateway 完成写入 `openclaw.json` 之前中断，插件会在下次启动时从内部快照中恢复该账号上一次已知的 `appId` / `clientSecret`（绝不会覆盖有意的配置变更），因此无需重新扫描二维码。

## 故障排查

- **网关未启动／没有入站消息：** 验证 `appId` 和
  `clientSecret` 是否正确，并且机器人已在 QQ 开放平台上启用。
  缺少凭据时会显示为“QQBot 未配置（缺少 appId 或
  clientSecret）”。
- **使用 `--token-file` 设置后仍显示未配置：**`--token-file` 仅
  设置 AppSecret。`appId` 仍必须在配置或 `QQBOT_APP_ID` 中设置。
- **突发的群组回复发生冲突：** 当对端队列满时，入站队列会优先驱逐
  机器人发送的消息而不是人类消息，并将突发的普通（非命令）群消息合并为一次带归属的轮次，因此大量机器人聊天不应饿死人类消息。
- **主动消息未送达：** 如果用户最近没有互动，QQ 可能会
  阻止机器人发起的消息。
- **语音未转录：** 确保已配置 STT 且提供方可访问。

## 相关

- [配对](/channels/pairing)
- [群组](/channels/groups)
- [频道故障排除](/channels/troubleshooting)
