---
summary: "WhatsApp 频道支持、访问控制、投递行为和运维"
read_when:
  - 正在处理 WhatsApp/web 频道行为或收件箱路由
title: "WhatsApp"
---

状态：通过 WhatsApp Web（Baileys）达到生产就绪。Gateway 拥有已链接会话。

## 安装（按需）

- 上手引导（`openclaw onboard`）和 `openclaw channels add --channel whatsapp`
  会在你第一次选择 WhatsApp 插件时提示安装。
- `openclaw channels login --channel whatsapp` 在
  插件尚未存在时也会提供安装流程。
- 开发频道 + git checkout：默认使用本地插件路径。
- Stable/Beta：使用当前官方发布标签上的 npm 包 `@openclaw/whatsapp`。

也可以手动安装：

```bash
openclaw plugins install @openclaw/whatsapp
```

使用裸包以跟随当前官方发布标签。只有在需要可复现安装时才固定精确版本。

在 Windows 上，WhatsApp 插件在 npm install 期间需要 Git 位于 `PATH` 中，因为
它的一个 Baileys/libsignal 依赖是从 git URL 拉取的。请先为 Windows 安装 Git，
然后重启 shell 并重新运行安装：

```powershell
winget install --id Git.Git -e
```

如果 Portable Git 的 `bin` 目录在 `PATH` 中，也同样可用。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/channels/pairing">
    未知发送者的默认 DM 策略是配对。
  </Card>
  <Card title="频道故障排查" icon="wrench" href="/channels/troubleshooting">
    跨频道诊断和修复操作手册。
  </Card>
  <Card title="Gateway 配置" icon="settings" href="/gateway/configuration">
    完整的频道配置模式和示例。
  </Card>
</CardGroup>

## 快速设置

<Steps>
  <Step title="配置 WhatsApp 访问策略">

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "pairing",
      allowFrom: ["+15551234567"],
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
    },
  },
}
```

  </Step>

  <Step title="绑定 WhatsApp（QR）">

```bash
openclaw channels login --channel whatsapp
```

    对于特定账号：

```bash
openclaw channels login --channel whatsapp --account work
```

    在登录前附加现有/自定义的 WhatsApp Web 认证目录：

```bash
openclaw channels add --channel whatsapp --account work --auth-dir /path/to/wa-auth
openclaw channels login --channel whatsapp --account work
```

  </Step>

  <Step title="启动 gateway">

```bash
openclaw gateway
```

  </Step>

  <Step title="批准首次配对请求（如果使用配对模式）">

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    配对请求在 1 小时后过期。每个频道最多保留 3 个待处理请求。

  </Step>
</Steps>

<Note>
OpenClaw 建议在可能的情况下使用单独的号码运行 WhatsApp。（频道元数据和设置流程已针对这种配置进行了优化，但也支持个人号码配置。）
</Note>

## 部署模式

<AccordionGroup>
  <Accordion title="专用号码（推荐）">
    这是最清晰的运维模式：

    - 为 OpenClaw 使用独立的 WhatsApp 身份
    - 更清晰的 DM 白名单和路由边界
    - 更低的自聊混淆风险

    最小策略模式：

    ```json5
    {
      channels: {
        whatsapp: {
          dmPolicy: "allowlist",
          allowFrom: ["+15551234567"],
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="个人号码回退">
    入门流程支持个人号码模式，并会写入一个适合自聊的基础配置：

    - `dmPolicy: "allowlist"`
    - `allowFrom` 包含你的个人号码
    - `selfChatMode: true`

    运行时中，自聊保护会根据已链接的自号码以及 `allowFrom` 生效。

  </Accordion>

  <Accordion title="仅限 WhatsApp Web 的频道范围">
    在当前 OpenClaw 频道架构中，消息平台频道基于 WhatsApp Web（`Baileys`）。

    内置 chat-channel 注册表中没有单独的 Twilio WhatsApp 消息频道。

  </Accordion>
</AccordionGroup>

## 运行时模型

- Gateway 拥有 WhatsApp socket 和重连循环。
- 重连看门狗使用 WhatsApp Web 传输活动，而不只是入站应用消息量，因此安静的已链接设备会话不会仅因为最近没人发消息就被重启。更长的应用静默上限仍会在传输帧持续到达但在看门狗窗口内没有处理应用消息时强制重连；对于最近活跃的会话发生临时重连后，该应用静默检查会在第一个恢复窗口中使用正常消息超时。
- Baileys socket 时序在 `web.whatsapp.*` 下是显式配置的：`keepAliveIntervalMs` 控制 WhatsApp Web 应用 ping，`connectTimeoutMs` 控制打开握手超时，`defaultQueryTimeoutMs` 控制 Baileys 查询超时。
- 出站发送需要目标账号处于活动的 WhatsApp 监听状态。
- 群组发送会在文本和媒体字幕中为 `@+<digits>` 和 `@<digits>` 标记附加原生提及元数据，只要该标记与当前 WhatsApp 参与者元数据匹配即可，包括基于 LID 的群组。
- 状态和广播聊天会被忽略（`@status`、`@broadcast`）。
- 重连看门狗跟随 WhatsApp Web 传输活动，而不只是入站应用消息量：在传输帧持续时，安静的已链接设备会话会保持在线，但传输停滞会在后续远程断开路径之前很早触发重连。
- 直接聊天使用 DM 会话规则（`session.dmScope`；默认 `main` 会将 DM 折叠到代理主会话）。
- 群组会话彼此隔离（`agent:<agentId>:whatsapp:group:<jid>`）。
- WhatsApp Channels/Newsletters 可以作为显式出站目标，并使用其原生 `@newsletter` JID。出站 newsletter 发送使用频道会话元数据（`agent:<agentId>:whatsapp:channel:<jid>`），而不是 DM 会话语义。
- WhatsApp Web 传输会在 gateway 主机上遵循标准代理环境变量（`HTTPS_PROXY`、`HTTP_PROXY`、`NO_PROXY` / 小写变体）。优先使用主机级代理配置，而不是频道特定的 WhatsApp 代理设置。
- 当启用 `messages.removeAckAfterReply` 时，OpenClaw 会在可见回复送达后清除 WhatsApp 的 ack 反应。

## 插件钩子与隐私

WhatsApp 入站消息可能包含个人消息内容、电话号码、
群组标识符、发送者名称和会话关联字段。因此，
除非你显式选择启用，否则 WhatsApp 不会将入站 `message_received` 钩子负载广播给插件：

```json5
{
  channels: {
    whatsapp: {
      pluginHooks: {
        messageReceived: true,
      },
    },
  },
}
```

你可以将启用范围限定到某一个账号：

```json5
{
  channels: {
    whatsapp: {
      accounts: {
        work: {
          pluginHooks: {
            messageReceived: true,
          },
        },
      },
    },
  },
}
```

只应为你信任的插件启用此功能，让其接收入站 WhatsApp 消息
内容和标识符。

## 访问控制与激活

<Tabs>
  <Tab title="DM 策略">
    `channels.whatsapp.dmPolicy` 控制直接聊天访问：

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    `allowFrom` 接受 E.164 风格号码（内部会标准化）。

    `allowFrom` 是 DM 发送者访问控制列表。它不会限制显式发往 WhatsApp 群组 JID 或 `@newsletter` 频道 JID 的出站发送。

    多账号覆盖：`channels.whatsapp.accounts.<id>.dmPolicy`（以及 `allowFrom`）优先于该账号的频道级默认值。

    运行时行为细节：

    - 配对记录会持久化到频道允许存储中，并与已配置的 `allowFrom` 合并
    - 定时自动化和心跳接收者回退会使用显式投递目标或已配置的 `allowFrom`；DM 配对批准不会被当作隐式 cron 或心跳接收者
    - 如果未配置 allowlist，已链接的自有号码默认被允许
    - OpenClaw 不会自动为出站 `fromMe` DM（你从已链接设备发给自己的消息）进行配对

  </Tab>

  <Tab title="群组策略 + 白名单">
    群组访问有两层：

    1. **群组成员白名单**（`channels.whatsapp.groups`）
       - 如果省略 `groups`，则所有群组都符合条件
       - 如果存在 `groups`，它将作为群组白名单（允许 `"*"`）

    2. **群组发送者策略**（`channels.whatsapp.groupPolicy` + `groupAllowFrom`）
       - `open`：绕过发送者白名单
       - `allowlist`：发送者必须匹配 `groupAllowFrom`（或 `*`）
       - `disabled`：阻止所有群组入站

    发送者白名单回退：

    - 如果未设置 `groupAllowFrom`，运行时会在可用时回退到 `allowFrom`
    - 发送者白名单会在 mention/reply 激活之前进行评估

    注意：如果根本不存在 `channels.whatsapp` 块，运行时群组策略回退为 `allowlist`（并记录警告日志），即使设置了 `channels.defaults.groupPolicy` 也是如此。

  </Tab>

  <Tab title="提及 + /activation">
    群组回复默认需要提及。

    提及检测包括：

    - 对 bot 身份的显式 WhatsApp 提及
    - 配置的提及正则模式（`agents.list[].groupChat.mentionPatterns`，回退到 `messages.groupChat.mentionPatterns`）
    - 授权群组消息的入站语音备忘录转录
    - 隐式回复到 bot 检测（回复发送者匹配 bot 身份）

    安全说明：

    - 引用/回复只满足提及门控；它**不会**授予发送者授权
    - 在 `groupPolicy: "allowlist"` 下，即使非白名单发送者回复了白名单用户的消息，也仍然会被阻止

    会话级激活命令：

    - `/activation mention`
    - `/activation always`

    `activation` 会更新会话状态（不是全局配置）。它受 owner 约束。

  </Tab>
</Tabs>

## 个人号码与自聊行为

当已链接的自号码也存在于 `allowFrom` 中时，WhatsApp 自聊保护将被激活：

- 跳过自聊轮次的已读回执
- 忽略原本会 ping 到你自己的 mention-JID 自动触发行为
- 如果未设置 `messages.responsePrefix`，自聊回复默认使用 `[{identity.name}]` 或 `[openclaw]`

## 消息规范化与上下文

<AccordionGroup>
  <Accordion title="入站信封 + 回复上下文">
    传入的 WhatsApp 消息会被包装进共享的入站信封。

    如果存在引用回复，则上下文会按以下格式附加：

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    回复元数据字段在可用时也会被填充（`ReplyToId`、`ReplyToBody`、`ReplyToSender`、sender JID/E.164）。
    当被引用的回复目标是可下载媒体时，OpenClaw 会通过
    常规入站媒体存储保存它，并将其暴露为 `MediaPath`/`MediaType`，以便
    代理可以检查引用的图片，而不只是看到
    `<media:image>`。

  </Accordion>

  <Accordion title="媒体占位符和位置/联系人提取">
    仅媒体的入站消息会被规范化为如下占位符：

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    当正文只有 `<media:audio>` 时，授权群组语音备忘录会在提及门控之前先进行转录，因此在语音备忘录中说出 bot 提及可以
    触发回复。如果转录结果仍未提及 bot，则该转录会
    被保留在待处理群组历史中，而不是原始占位符。

    位置正文使用简洁的坐标文本。位置标签/备注以及联系人/vCard 详细信息会以 fenced 的不受信任元数据形式渲染，而不是行内提示文本。

  </Accordion>

  <Accordion title="待处理群组历史注入">
    对于群组，未处理消息可以被缓冲，并在 bot 最终被触发时作为上下文注入。

    - 默认上限：`50`
    - 配置：`channels.whatsapp.historyLimit`
    - 回退：`messages.groupChat.historyLimit`
    - `0` 可禁用

    注入标记：

    - `[Chat messages since your last reply - for context]`
    - `[Current message - respond to this]`

  </Accordion>

  <Accordion title="已读回执">
    对于被接受的 WhatsApp 入站消息，默认启用已读回执。

    全局禁用：

    ```json5
    {
      channels: {
        whatsapp: {
          sendReadReceipts: false,
        },
      },
    }
    ```

    按账号覆盖：

    ```json5
    {
      channels: {
        whatsapp: {
          accounts: {
            work: {
              sendReadReceipts: false,
            },
          },
        },
      },
    }
    ```

    即使全局启用，自聊轮次也会跳过已读回执。

  </Accordion>
</AccordionGroup>

## 投递、分块与媒体

<AccordionGroup>
  <Accordion title="文本分块">
    - 默认分块上限：`channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - `newline` 模式优先按段落边界（空行）分割，然后回退到长度安全的分块

  </Accordion>

  <Accordion title="出站媒体行为">
    - 支持图片、视频、音频（PTT 语音消息）和文档载荷
    - 音频媒体通过 Baileys 的 `audio` 载荷发送，并设置 `ptt: true`，因此 WhatsApp 客户端会将其显示为按住说话语音消息
    - 回复载荷会保留 `audioAsVoice`；即使提供方返回 MP3 或 WebM，面向 WhatsApp 的 TTS 语音消息输出仍会走这条 PTT 路径
    - 原生 Ogg/Opus 音频会以 `audio/ogg; codecs=opus` 发送，以兼容语音消息
    - 非 Ogg 音频（包括 Microsoft Edge TTS 的 MP3/WebM 输出）会在 PTT 投递前通过 `ffmpeg` 转码为 48 kHz 单声道 Ogg/Opus
    - `/tts latest` 会将最新的助手回复作为一条语音消息发送，并抑制对同一回复的重复发送；`/tts chat on|off|default` 控制当前 WhatsApp 聊天的自动 TTS
    - 通过在视频发送中使用 `gifPlayback: true` 支持动图 GIF 播放
    - 发送多媒体回复载荷时，字幕会应用到第一个媒体项；但 PTT 语音消息会先发送音频，再单独发送可见文本，因为 WhatsApp 客户端不会一致地渲染语音消息字幕
    - 媒体来源可以是 HTTP(S)、`file://` 或本地路径

  </Accordion>

  <Accordion title="媒体大小限制与回退行为">
    - 入站媒体保存上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 出站媒体发送上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 按账号覆盖使用 `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - 图片会自动优化（调整大小/质量扫描）以适配限制
    - 媒体发送失败时，会在第一项回退为发送文本警告，而不是静默丢弃回复

  </Accordion>
</AccordionGroup>

## 回复引用

WhatsApp 支持原生回复引用，即出站回复会可见地引用入站消息。通过 `channels.whatsapp.replyToMode` 进行控制。

| 值          | 行为                                                                 |
| ----------- | -------------------------------------------------------------------- |
| `"off"`     | 从不引用；作为普通消息发送                                           |
| `"first"`   | 仅引用第一个出站回复分块                                             |
| `"all"`     | 引用每个出站回复分块                                                 |
| `"batched"` | 引用队列中的批量回复，同时让即时回复不带引用                         |

默认值为 `"off"`。按账号覆盖使用 `channels.whatsapp.accounts.<id>.replyToMode`。

```json5
{
  channels: {
    whatsapp: {
      replyToMode: "first",
    },
  },
}
```

## 反应级别

`channels.whatsapp.reactionLevel` 控制 agent 在 WhatsApp 上使用 emoji 反应的范围：

| 级别          | 确认反应 | agent 主动反应 | 描述                                     |
| ------------- | -------- | -------------- | ---------------------------------------- |
| `"off"`       | 否       | 否             | 完全不使用反应                           |
| `"ack"`       | 是       | 否             | 仅确认反应（回复前接收确认）             |
| `"minimal"`   | 是       | 是（保守）     | 确认 + agent 反应，采用保守指导           |
| `"extensive"` | 是       | 是（鼓励）     | 确认 + agent 反应，采用鼓励性指导         |

默认值：`"minimal"`。

按账号覆盖使用 `channels.whatsapp.accounts.<id>.reactionLevel`。

```json5
{
  channels: {
    whatsapp: {
      reactionLevel: "ack",
    },
  },
}
```

## 确认反应

WhatsApp 支持通过 `channels.whatsapp.ackReaction` 在收到入站消息时立即发送确认反应。
确认反应受 `reactionLevel` 限制——当 `reactionLevel` 为 `"off"` 时会被抑制。

```json5
{
  channels: {
    whatsapp: {
      ackReaction: {
        emoji: "👀",
        direct: true,
        group: "mentions", // 始终 | 提及 | 从不
      },
    },
  },
}
```

行为说明：

- 在入站被接受后立即发送（回复前）
- 失败会被记录，但不会阻止正常回复投递
- 组模式 `mentions` 会在提及触发的轮次上进行反应；组激活 `always` 作为此检查的绕过条件
- WhatsApp 使用 `channels.whatsapp.ackReaction`（此处不使用旧的 `messages.ackReaction`）

## 多账号与凭据

<AccordionGroup>
  <Accordion title="账号选择与默认值">
    - 账号 id 来自 `channels.whatsapp.accounts`
    - 默认账号选择：如果存在则为 `default`，否则为第一个已配置的账号 id（按排序）
    - 账号 id 在内部会被规范化以便查找

  </Accordion>

  <Accordion title="凭据路径与旧版兼容">
    - 当前认证路径：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - 备份文件：`creds.json.bak`
    - 位于 `~/.openclaw/credentials/` 的旧默认认证在默认账号流程中仍可识别/迁移

  </Accordion>

  <Accordion title="登出行为">
    `openclaw channels logout --channel whatsapp [--account <id>]` 会清除该账号的 WhatsApp 认证状态。

    当 Gateway 可达时，登出会先停止所选账号的实时 WhatsApp 监听器，因此关联会话在下次重启前不会继续接收消息。`openclaw channels remove --channel whatsapp` 在禁用或删除账号配置之前也会先停止实时监听器。

    在旧版认证目录中，`oauth.json` 会被保留，而 Baileys 认证文件会被移除。

  </Accordion>
</AccordionGroup>

## 工具、动作与配置写入

- Agent 工具支持包括 WhatsApp 反应动作（`react`）。
- 动作门控：
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- 默认启用通道发起的配置写入（可通过 `channels.whatsapp.configWrites=false` 禁用）。

## 故障排查

<AccordionGroup>
  <Accordion title="未绑定（需要 QR）">
    症状：通道状态报告未绑定。

    修复：

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="已绑定但断开连接 / 重连循环">
    症状：已绑定账号反复断开或尝试重连。

    静默账号在超过正常消息超时后仍可能保持连接；当 WhatsApp Web 传输活动停止、socket 关闭，或应用层活动在更长的安全窗口内持续静默时，看门狗会重新启动。

    如果日志显示反复出现 `status=408 Request Time-out Connection was lost`，请调整 `web.whatsapp` 下的 Baileys socket 时序参数。可先将 `keepAliveIntervalMs` 调到低于你网络的空闲超时，并在慢速或丢包链接上增大 `connectTimeoutMs`：

    ```json5
    {
      web: {
        whatsapp: {
          keepAliveIntervalMs: 15000,
          connectTimeoutMs: 60000,
          defaultQueryTimeoutMs: 60000,
        },
      },
    }
    ```

    修复：

    ```bash
    openclaw doctor
    openclaw logs --follow
    ```

    如果 `~/.openclaw/logs/whatsapp-health.log` 显示 `Gateway inactive`，但
    `openclaw gateway status` 和 `openclaw channels status --probe` 显示
    gateway 和 WhatsApp 运行正常，请运行 `openclaw doctor`。在 Linux 上，doctor
    会警告仍在调用
    `~/.openclaw/bin/ensure-whatsapp.sh` 的旧版 crontab 条目；请使用
    `crontab -e` 删除这些过时条目，因为 cron 可能缺少 systemd user-bus 环境，
    从而让这个旧脚本误报 gateway 健康状态。

    如有需要，使用 `channels login` 重新关联。

  </Accordion>

  <Accordion title="代理后面的 QR 登录超时">
    症状：`openclaw channels login --channel whatsapp` 在显示可用 QR 码之前失败，报 `status=408 Request Time-out` 或 TLS socket 断开。

    WhatsApp Web 登录使用网关主机的标准代理环境（`HTTPS_PROXY`、`HTTP_PROXY`、小写变体以及 `NO_PROXY`）。请确认网关进程继承了代理环境变量，并且 `NO_PROXY` 不会匹配 `mmg.whatsapp.net`。

  </Accordion>

  <Accordion title="发送时没有活动监听器">
    当目标账号不存在活动网关监听器时，出站发送会快速失败。

    请确保网关正在运行且该账号已绑定。

  </Accordion>

  <Accordion title="Reply appears in transcript but not in WhatsApp">
    Transcript 行会记录 agent 生成了什么。WhatsApp 投递会单独检查：只有当 Baileys 至少返回一个可见的文本或媒体发送的出站消息 id 后，OpenClaw 才会将自动回复视为已发送。

    Ack 反应是独立的回复前回执。反应成功并不能证明后续的文本或媒体回复已被 WhatsApp 接受。

    请检查网关日志中的 `auto-reply delivery failed` 或 `auto-reply was not accepted by WhatsApp provider`。

  </Accordion>

  <Accordion title="Group messages unexpectedly ignored">
    按以下顺序检查：

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` 白名单条目
    - 提及门控（`requireMention` + 提及模式）
    - `openclaw.json` 中的重复键（JSON5）：后面的条目会覆盖前面的，因此每个作用域只保留一个 `groupPolicy`

  </Accordion>

  <Accordion title="Bun 运行时警告">
    WhatsApp 网关运行时应使用 Node。Bun 被标记为与稳定的 WhatsApp/Telegram 网关运行不兼容。
  </Accordion>
</AccordionGroup>

## 系统提示词

WhatsApp 通过 `groups` 和 `direct` 映射支持类似 Telegram 的群组与私聊系统提示词。

群组消息的解析层级：

先确定有效的 `groups` 映射：如果账号定义了自己的 `groups`，它会完全替换根级 `groups` 映射（不进行深度合并）。然后在结果中的单一映射上执行提示词查找：

1. **群组特定系统提示词**（`groups["<groupId>"].systemPrompt`）：当映射中存在特定群组条目且其 `systemPrompt` 键已定义时使用。如果 `systemPrompt` 为空字符串（`""`），则会抑制通配符，不应用任何系统提示词。
2. **群组通配系统提示词**（`groups["*"].systemPrompt`）：当特定群组条目在映射中完全不存在，或者存在但未定义 `systemPrompt` 键时使用。

私聊消息的解析层级：

先确定有效的 `direct` 映射：如果账号定义了自己的 `direct`，它会完全替换根级 `direct` 映射（不进行深度合并）。然后在结果中的单一映射上执行提示词查找：

1. **私聊特定系统提示词**（`direct["<peerId>"].systemPrompt`）：当映射中存在特定对端条目且其 `systemPrompt` 键已定义时使用。如果 `systemPrompt` 为空字符串（`""`），则会抑制通配符，不应用任何系统提示词。
2. **私聊通配系统提示词**（`direct["*"].systemPrompt`）：当特定对端条目在映射中完全不存在，或者存在但未定义 `systemPrompt` 键时使用。

<Note>
`dms` 仍然是轻量级的每个 DM 历史覆盖桶（`dms.<id>.historyLimit`）。提示词覆盖位于 `direct` 下。
</Note>

**与 Telegram 多账号行为的区别：** 在 Telegram 中，根级 `groups` 会在多账号设置中被有意对所有账号抑制——即使那些没有定义自己 `groups` 的账号也一样——以防止机器人接收其不属于的群组消息。WhatsApp 不应用这个保护：根级 `groups` 和根级 `direct` 会始终被未定义账号级覆盖的账号继承，不管配置了多少账号。在多账号 WhatsApp 设置中，如果你想为不同账号设置群组或私聊提示词，请在每个账号下显式定义完整映射，而不要依赖根级默认值。

重要行为：

- `channels.whatsapp.groups` 既是按群组的配置映射，也是聊天级群组白名单。无论是在根作用域还是账号作用域，`groups["*"]` 都表示该作用域内“允许所有群组”。
- 只有在你本来就希望该作用域接收所有群组时，才添加带通配符的群组 `systemPrompt`。如果你仍然只想让固定的一组群组 ID 有资格被处理，就不要把 `groups["*"]` 用作提示词默认值。相反，请在每个显式加入白名单的群组条目上重复该提示词。
- 群组接纳与发送者授权是两个独立的检查。`groups["*"]` 会扩大可进入群组处理的群组集合，但它本身并不会授权这些群组中的每个发送者。发送者访问仍由 `channels.whatsapp.groupPolicy` 和 `channels.whatsapp.groupAllowFrom` 单独控制。
- `channels.whatsapp.direct` 对 DM 没有同样的副作用。`direct["*"]` 只是在 DM 已通过 `dmPolicy` 加上 `allowFrom` 或配对存储规则被接纳之后，提供一个默认的私聊配置。

示例：

```json5
{
  channels: {
    whatsapp: {
      groups: {
        // 仅在你希望根作用域接纳所有群组时使用。
        // 适用于所有未定义自己 groups 映射的账号。
        "*": { systemPrompt: "所有群组的默认提示词。" },
      },
      direct: {
        // 适用于所有未定义自己 direct 映射的账号。
        "*": { systemPrompt: "所有私聊的默认提示词。" },
      },
      accounts: {
        work: {
          groups: {
            // 该账号定义了自己的 groups，因此根级 groups 会被完全
            // 替换。若要保留通配符，也请在此显式定义 "*"。
            "120363406415684625@g.us": {
              requireMention: false,
              systemPrompt: "专注于项目管理。",
            },
            // 仅在你希望该账号接纳所有群组时使用。
            "*": { systemPrompt: "工作群组的默认提示词。" },
          },
          direct: {
            // 该账号定义了自己的 direct 映射，因此根级 direct 条目会被
            // 完全替换。若要保留通配符，也请在此显式定义 "*"。
            "+15551234567": { systemPrompt: "某个特定工作私聊的提示词。" },
            "*": { systemPrompt: "工作私聊的默认提示词。" },
          },
        },
      },
    },
  },
}
```

## 配置参考指针

主要参考：

- [配置参考 - WhatsApp](/gateway/config-channels#whatsapp)

高信号 WhatsApp 字段：

- access: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- delivery: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`, `reactionLevel`
- multi-account: `accounts.<id>.enabled`, `accounts.<id>.authDir`, account-level overrides
- operations: `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`, `web.whatsapp.*`
- session behavior: `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`
- prompts: `groups.<id>.systemPrompt`, `groups["*"].systemPrompt`, `direct.<id>.systemPrompt`, `direct["*"].systemPrompt`

## 相关内容

- [配对](/channels/pairing)
- [群组](/channels/groups)
- [安全](/gateway/security)
- [频道路由](/channels/channel-routing)
- [多智能体路由](/concepts/multi-agent)
- [故障排除](/channels/troubleshooting)
