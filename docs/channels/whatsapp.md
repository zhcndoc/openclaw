---
summary: "WhatsApp 频道支持、访问控制、投递行为和运维"
read_when:
  - 正在处理 WhatsApp/web 频道行为或收件箱路由
title: "WhatsApp"
---

状态：通过 WhatsApp Web（Baileys）达到生产可用。网关拥有已关联的会话；不存在单独的 Twilio WhatsApp 频道。

## 安装

`openclaw onboard` 和 `openclaw channels add --channel whatsapp` 会在你第一次选择它时提示安装插件；如果插件缺失，`openclaw channels login --channel whatsapp` 也会提供相同的安装流程。开发检出版本使用本地插件路径；稳定版/测试版会先从 ClawHub 安装 `@openclaw/whatsapp`，然后回退到 npm。WhatsApp 运行时不包含在核心 OpenClaw npm 包中，因此其运行时依赖保留在外部插件中。手动安装：

```bash
openclaw plugins install clawhub:@openclaw/whatsapp
```

仅在注册表回退时使用裸 npm 包（`@openclaw/whatsapp`）；只有为了可复现安装时才固定到精确版本。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/channels/pairing">
    未知发送者的默认私信策略是配对。
  </Card>
  <Card title="频道故障排查" icon="wrench" href="/channels/troubleshooting">
    跨频道诊断和修复操作手册。
  </Card>
  <Card title="网关配置" icon="settings" href="/gateway/configuration">
    完整的频道配置模式和示例。
  </Card>
</CardGroup>

## 快速设置

<Steps>
  <Step title="配置访问策略">

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

  <Step title="绑定 WhatsApp（二维码）">

```bash
openclaw channels login --channel whatsapp
```

    登录仅支持二维码方式。在远程或无头主机上，请在开始登录前确保有可靠的路径将实时二维码传递到手机；终端渲染的二维码、截图或聊天附件在传输过程中可能会过期。

    对于特定账号：

```bash
openclaw channels login --channel whatsapp --account work
```

    在登录前附加现有/自定义认证目录：

```bash
openclaw channels add --channel whatsapp --account work --auth-dir /path/to/wa-auth
openclaw channels login --channel whatsapp --account work
```

  </Step>

  <Step title="启动网关">

```bash
openclaw gateway
```

  </Step>

  <Step title="批准第一条私信访问请求（配对模式）">

    打开 **设置 → 频道 → 私信访问请求**，找到 WhatsApp 账号，
    然后批准该发送者。如果你更喜欢使用命令行：

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    私信访问请求会在 1 小时后过期；待处理请求每个账号最多 3 个。
    这个批准与用于绑定账号本身的 WhatsApp 登录二维码是分开的。

  </Step>
</Steps>

<Note>
建议使用独立的 WhatsApp 号码（相关设置和元数据已针对其优化），但个人号码/自聊配置也完全受支持。
</Note>

## 部署模式

<AccordionGroup>
  <Accordion title="专用号码（推荐）">
    - 为 OpenClaw 单独使用一个 WhatsApp 身份
    - 更清晰的私信白名单和路由边界
    - 降低自聊混淆的可能性

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

  <Accordion title="个人号码回退模式">
    引导流程支持个人号码模式，并会写入一个适合自聊的基础配置：`dmPolicy: "allowlist"`、`allowFrom` 包含你的号码、`selfChatMode: true`。运行时的自聊保护会根据已绑定的自号码以及 `allowFrom` 来生效。
  </Accordion>
</AccordionGroup>

## 运行时模型

- 网关拥有 WhatsApp socket 和重连循环。
- 看门狗独立跟踪两个信号：原始 WhatsApp Web 传输活动和应用消息活动。仅仅因为最近没有收到消息，并不会重启一个安静但已连接的会话；只有当传输帧在一个固定的内部窗口内停止到达（不可用户配置），或者应用消息在正常消息超时时间的 4 倍之后仍然保持沉默时，才会强制重连。对于最近活跃的会话，在刚完成重连后的第一个窗口中，会使用更短的正常消息超时，而不是 4 倍窗口。OpenClaw 可以自动回复 Baileys 在这次重连早期送达的离线消息，其范围受入站消息 ID 去重生存期限制；初始启动则继续使用较短的陈旧历史保护。
- 发送出站消息需要目标账号存在活跃的 WhatsApp 监听器；否则发送会快速失败。
- 群组发送会为文本和媒体标题中的 `@+<digits>` 和 `@<digits>` 标记附加原生提及元数据，当该标记与当前参与者元数据匹配时也包括基于 LID 的群组。
- 状态和广播聊天（`@status`、`@broadcast`）会被忽略。
- 直接聊天使用 DM 会话规则（`session.dmScope`；默认 `main` 会将 DM 折叠到代理主会话中）。群组会话按 JID 隔离（`agent:<agentId>:whatsapp:group:<jid>`）。
- WhatsApp Channels/Newsletters 可以通过其原生 `@newsletter` JID 作为显式出站目标，使用频道会话元数据（`agent:<agentId>:whatsapp:channel:<jid>`）而不是 DM 语义。
- WhatsApp Web 传输遵守网关主机上的标准代理环境变量（`HTTPS_PROXY`、`HTTP_PROXY`、`NO_PROXY` 及其小写变体）。优先使用主机级代理配置，而不是按频道配置。

## 使用 MeowCaller 呼叫当前请求者（实验性）

该插件可以在源自 WhatsApp 的代理轮次中公开 `whatsapp_call`。它使用 [MeowCaller](https://github.com/purpshell/meowcaller) 向当前已授权的请求者发起 WhatsApp 语音通话，并在对方接听后播放一条 OpenClaw TTS 消息。该工具没有目标号码参数，因此提示无法重定向通话。默认禁用。

<Warning>
MeowCaller 处于实验阶段，没有标记发布版，并且使用的是单独配对的 whatsmeow 已链接设备会话——它不能复用插件的 Baileys 凭据。配对会为同一个 WhatsApp 账户添加一个额外的已链接设备；请使用 OpenClaw 所用的身份进行扫码。个人号码/自聊模式不能呼叫自己；请使用专用的 OpenClaw 号码呼叫你的个人号码。
</Warning>

<Steps>
  <Step title="启用实验性通话">

    在 WhatsApp 通道配置中添加 `actions.calls: true`，然后重启网关：

```json
{
  "channels": {
    "whatsapp": {
      "actions": {
        "calls": true
      }
    }
  }
}
```

    当该项缺失或为 `false` 时，OpenClaw 不会公开 `whatsapp_call` 工具。

  </Step>

  <Step title="安装经过审查的 MeowCaller CLI">

    适配器期望网关主机的 `PATH` 中存在一个 `meowcaller` 可执行文件。在 [MeowCaller PR #7](https://github.com/purpshell/meowcaller/pull/7) 合并之前，请构建已审查分支：

```bash
git clone --branch feat/send-only-notify https://github.com/steipete/meowcaller.git
cd meowcaller
git checkout 752050471fc2bf7a8cdfbf7dbd3cd4e865d85d3f
mkdir -p "$HOME/.local/bin"
go build -o "$HOME/.local/bin/meowcaller" ./cmd/meowcaller
```

    确保 `$HOME/.local/bin` 已加入网关服务的 `PATH`。这个修订版具有显式的 `pair` 和仅发送的 `notify` 命令；`notify` 不会打开麦克风、扬声器、视频设备或诊断采集。不要用上游示例 CLI 的 `play` 命令替代。

  </Step>

  <Step title="配对 MeowCaller 已链接设备">

    让 WhatsApp 代理检查通话设置（`whatsapp_call` 状态动作会报告账户特定的状态目录和配对命令）。对于默认账户：

```bash
state_dir="$HOME/.openclaw/credentials/whatsapp-calls/default"
mkdir -p "$state_dir"
chmod 700 "$state_dir"
meowcaller pair --store "$state_dir/wa-voip.db"
```

    交互式运行此命令，扫描 **WhatsApp > 已链接设备** 中的二维码，并等待 `MeowCaller linked device ready`。请保持 `wa-voip.db` 私密——它是 MeowCaller 会话。非默认账户会从状态动作中获得各自的存储路径；在 Windows 上，请运行其 PowerShell 命令。

  </Step>

  <Step title="配置 TTS 并从 WhatsApp 发起通话">

    配置一个支持电话功能的 [TTS 提供商](/tools/tts)，重启网关，然后发送类似 `给我打电话并说构建已完成。` 的请求。该工具会从受信任的入站上下文中解析发送者，合成一个临时的私有 WAV 文件，在受限的通话窗口内运行 MeowCaller，并在之后删除音频文件。OpenClaw 会显式传递该账户的存储路径，等待接听/播放/挂断后的零退出状态，并将超时或非零退出视为工具调用失败。

  </Step>
</Steps>

限制：仅限一对一的外呼音频通话，不支持任意目标号码，不与聊天连接共享认证，个人号码/自聊模式无法自呼，合成音频最长 60 秒，手持端不会提供除 MeowCaller 的接听/播放/挂断完成之外的可感知回执，并且 OpenClaw 会在一个受限的 115-175 秒窗口后停止伴随进程（覆盖 MeowCaller 的连接、接听、播放和关闭阶段）。

## 审批提示

WhatsApp 可以将 exec 和 plugin 的审批提示渲染为 `👍`/`👎` 反应，由顶层的审批转发配置控制：

```json5
{
  approvals: {
    exec: {
      enabled: true,
      mode: "session",
    },
    plugin: {
      enabled: true,
      mode: "targets",
      targets: [{ channel: "whatsapp", to: "+15551234567" }],
    },
  },
}
```

`approvals.exec` 和 `approvals.plugin` 相互独立；仅将 WhatsApp 启用为一个通道，只会连接传输层，并不会发送任何内容，除非对应的审批家族已启用并路由到那里。session 模式仅对源自 WhatsApp 的审批传递原生 emoji 审批。target 模式使用共享的转发管道处理显式目标，不会创建单独的 approver-DM 扇出。

WhatsApp 审批反应要求在 `allowFrom` 中显式指定审批人（或使用 `"*"`）。`defaultTo` 设置的是普通默认消息目标，而不是审批人列表。在审批解析之前，手动 `/approve` 命令仍会先经过正常的 WhatsApp 发送者授权路径。

## 问题反应

对于一个包含一个非机密、单选问题以及一到四个选项的 `ask_user` 提示，WhatsApp 会在选项标签旁显示 `1️⃣` 到 `4️⃣`。对已送达的提示使用对应的数字进行反应即可回答。OpenClaw 通过 Gateway 将该数字映射到规范选项；过期或重复的点击会被忽略。多问题、多选和自由文本提示仍然仅支持文本回复。普通 WhatsApp 私聊/群组准入规则会授权进行反应的发送者。

## 插件钩子与隐私

传入的 WhatsApp 消息可能包含个人内容、电话号码、群组标识符、发送者名称以及会话关联字段。除非你主动启用，否则 WhatsApp 不会将传入的 `message_received` 钩子载荷广播给插件：

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

将该启用范围限定到 `channels.whatsapp.accounts.<id>.pluginHooks.messageReceived` 下的某一个账号。仅对你信任能够处理传入 WhatsApp 内容和标识符的插件启用此功能。

## 访问控制与激活

<Tabs>
  <Tab title="私信策略">
    `channels.whatsapp.dmPolicy`:

    | 值 | 行为 |
    | --- | --- |
    | `pairing` (默认) | 未知发送者请求配对；所有者批准 |
    | `allowlist` | 仅允许 `allowFrom` 中的发送者 |
    | `open` | 需要 `allowFrom` 包含 `"*"` |
    | `disabled` | 阻止所有私信 |

    `allowFrom` 接受 E.164 风格号码（内部会规范化）。它仅是私信发送者访问控制列表——不会限制显式发往群组 JID 或 `@newsletter` 频道 JID 的外发消息。

    多账号覆盖：`channels.whatsapp.accounts.<id>.dmPolicy`（以及 `.allowFrom`）会优先于该账号的频道级默认值。

    运行时说明：

    - 配对会保留在频道 allow-store 中，并与已配置的 `allowFrom` 合并
    - 定时自动化和心跳接收者回退会使用显式投递目标或已配置的 `allowFrom`；私信配对批准不会被视为隐式的 cron/heartbeat 接收者
    - 如果未配置 allowlist，默认允许已绑定的本人号码
    - OpenClaw 永远不会自动配对外发的 `fromMe` 私信（你从已绑定设备自行发送的消息）

  </Tab>

  <Tab title="群组策略与允许列表">
    群组访问有两层：

    1. **群组成员 allowlist**（`channels.whatsapp.groups`）：如果省略 `groups`，则所有群组都符合条件；如果存在，则它充当群组 allowlist（`"*"` 允许全部）。
    2. **群组发送者策略**（`channels.whatsapp.groupPolicy` + `groupAllowFrom`）：`open` 会绕过发送者 allowlist，`allowlist` 需要匹配 `groupAllowFrom`（或 `*`），`disabled` 会阻止所有群组入站。

    如果未设置 `groupAllowFrom`，当 `allowFrom` 有条目时，发送者检查会回退到 `allowFrom`。发送者 allowlist 会在提及/回复激活之前进行评估。

    如果完全不存在 `channels.whatsapp` 块，运行时会回退到 `groupPolicy: "allowlist"`（并记录警告日志），即使 `channels.defaults.groupPolicy` 设置了其他值也是如此。

    <Note>
    群组成员资格解析具有单账号安全兜底：如果只配置了一个 WhatsApp 账号，并且它的 `accounts.<id>.groups` 是显式空对象（`{}`），则会被视为“未设置”，并回退到根级 `channels.whatsapp.groups` 映射，而不是静默阻止所有群组。若配置了 2 个及以上账号，显式空的账号映射将保持为空且不会回退——这样可以让某个账号有意禁用所有群组而不影响其他账号。
    </Note>

  </Tab>

  <Tab title="提及与 /activation">
    群组回复默认需要提及。提及检测包括：

    - 对机器人身份的显式 WhatsApp 提及
    - 已配置的提及正则模式（`agents.entries.*.groupChat.mentionPatterns`，回退到 `messages.groupChat.mentionPatterns`）
    - 已授权群组消息的入站语音便笺转写
    - 隐式的回复机器人检测（回复发送者与机器人身份匹配）

    安全性：引用/回复只满足提及门槛——它并**不会**授予发送者授权。使用 `groupPolicy: "allowlist"` 时，即使是回复一个被 allowlist 允许的用户消息，未被 allowlist 允许的发送者仍然会被阻止。

    会话级激活命令：`/activation mention` 或 `/activation always`。这会更新会话状态（不是全局配置），并且受所有者保护。

  </Tab>
</Tabs>

## 已配置的 ACP 绑定

WhatsApp 通过顶层的 `bindings[]` 支持持久化 ACP 绑定：

```json5
{
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "whatsapp",
        accountId: "work",
        peer: { kind: "direct", id: "+15555550123" },
      },
    },
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "whatsapp",
        accountId: "work",
        peer: { kind: "group", id: "120363424282127706@g.us" },
      },
    },
  ],
}
```

私聊匹配 E.164 号码；群聊匹配 WhatsApp 群组 JID。群组白名单、发送者策略以及提及/激活门控都会先在 OpenClaw 中运行，然后再确认已绑定的 ACP 会话是否存在。匹配到的绑定拥有该路由——广播群组不会将该轮消息分发给普通 WhatsApp 会话。

## 个人号码与自聊行为

当已链接的自号码也出现在 `allowFrom` 中时，自聊保护会生效：跳过自聊轮次的已读回执，忽略会向自己发送提醒的 mention-JID 自动触发行为，并在频道/账号的 `responsePrefix` 未设置时，默认回复为 `[{identity.name}]`（或 `[openclaw]`）。

## 消息规范化与上下文

<AccordionGroup>
  <Accordion title="传入封套与回复上下文">
    传入消息会被包装在共享的传入封套中。引用回复会按以下形式附加上下文：

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    回复元数据（`ReplyToId`、`ReplyToBody`、`ReplyToSender`、sender JID/E.164）会在可用时被填充。如果被引用的目标是可下载媒体，OpenClaw 会通过常规传入媒体存储保存它，并暴露 `MediaPath`/`MediaType`，以便代理可以直接检查它，而不是只看到 `<media:image>`。

  </Accordion>

  <Accordion title="媒体占位符与位置/联系人提取">
    仅媒体消息会规范化为占位符：`<media:image>`、`<media:video>`、`<media:audio>`、`<media:document>`、`<media:sticker>`。

    仅当正文只有 `<media:audio>` 时，授权群组语音会在提及门控之前先转写，因此在语音中说出机器人提及可以触发回复。如果转写内容仍未提及机器人，它会保留在待处理群历史中，而不是原始占位符。

    位置正文会渲染为简洁的坐标文本。位置标签/备注和联系人/vCard 详情会渲染为带围栏的不受信任元数据，而不是内联提示文本。

  </Accordion>

  <Accordion title="待处理群历史注入">
    未处理的群消息会缓冲，并在机器人最终被触发时作为上下文注入。

    - 默认限制：`50`
    - 配置：`channels.whatsapp.historyLimit`，回退到 `messages.groupChat.historyLimit`
    - `0` 会禁用

    注入标记：`[Chat messages since your last reply - for context]` 和 `[Current message - respond to this]`。

  </Accordion>

  <Accordion title="已读回执">
    对已接受的传入消息默认启用。全局禁用：

    ```json5
    { channels: { whatsapp: { sendReadReceipts: false } } }
    ```

    按账户覆盖：`channels.whatsapp.accounts.<id>.sendReadReceipts`。即使全局启用，自身聊天的转发也不会发送已读回执。

  </Accordion>
</AccordionGroup>

## 投递、分块与媒体

<AccordionGroup>
  <Accordion title="文本分块">
    - 默认分块限制：`channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.streaming.chunkMode = "length" | "newline"`；`newline` 优先按段落边界（空行）分割，然后回退到按长度安全分块

  </Accordion>

  <Accordion title="出站媒体行为">
    - 支持图像、视频、音频（PTT 语音消息）和文档负载
    - 音频会作为 Baileys 的 `audio` 负载发送，并设置 `ptt: true`，从而呈现为按住说话语音消息；`audioAsVoice` 会保留在回复负载中，因此无论提供方的源格式如何，TTS 语音消息输出都会保持走这一路径
    - 原生 Ogg/Opus 音频会以 `audio/ogg; codecs=opus` 发送；其他任何格式（包括 Microsoft Edge TTS MP3/WebM 输出）都会在 PTT 投递前通过 `ffmpeg` 转码为 48 kHz 单声道 Ogg/Opus
    - `/tts latest` 会将最新的助手回复作为一条语音消息发送，并抑制对同一回复的重复发送；`/tts chat on|off|default` 控制当前聊天的自动 TTS
    - 发送视频时设置 `gifPlayback: true` 会启用动画 GIF 播放
    - `forceDocument`/`asDocument` 会将出站图像、GIF 和视频通过 Baileys 文档负载路由，以避免 WhatsApp 的媒体压缩，并保留解析出的文件名和 MIME 类型
    - 标题会应用到多媒体回复中的第一项媒体，但 PTT 语音消息除外：音频先发送且不带标题，然后标题作为单独的文本消息发送（WhatsApp 客户端对语音消息标题的渲染并不一致）
    - 媒体源可以是 HTTP(S)、`file://` 或本地路径

  </Accordion>

  <Accordion title="媒体大小限制与回退行为">
    - 传入保存上限和出站发送上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 按账户覆盖：`channels.whatsapp.accounts.<id>.mediaMaxMb`
    - 图像会自动优化（调整大小/质量扫描）以适应限制，除非 `forceDocument`/`asDocument` 请求以文档方式投递
    - 媒体发送失败时，第一项的回退会发送文本警告，而不是静默丢弃回复

  </Accordion>
</AccordionGroup>

## 回复引用

`channels.whatsapp.replyToMode` 控制原生回复引用（出站回复会明显引用传入消息）：

| 值                | 行为                                                         |
| ----------------- | ------------------------------------------------------------ |
| `"off"`（默认）    | 从不引用；以普通消息发送                                     |
| `"first"`         | 仅引用第一个出站回复分块                                     |
| `"all"`           | 引用每个出站回复分块                                           |
| `"batched"`       | 引用排队的批量回复；即时回复不引用                             |

按账户覆盖：`channels.whatsapp.accounts.<id>.replyToMode`。

```json5
{ channels: { whatsapp: { replyToMode: "first" } } }
```

## 反应级别

`channels.whatsapp.reactionLevel` 控制代理使用表情回应的广泛程度：

| Level                 | 确认回应 | 代理发起的回应  |
| --------------------- | -------- | -------------------------- |
| `"off"`               | 否            | 否                         |
| `"ack"`               | 是           | 否                         |
| `"minimal"` (默认) | 是           | 是，保守引导 |
| `"extensive"`         | 是           | 是，鼓励性引导   |

按账户覆盖：`channels.whatsapp.accounts.<id>.reactionLevel`。

```json5
{ channels: { whatsapp: { reactionLevel: "ack" } } }
```

## 确认反应

`channels.whatsapp.ackReaction` 会在收到入站消息时立即发送一个反应，并受 `reactionLevel` 控制（当为 `"off"` 时会被抑制）：

```json5
{
  channels: {
    whatsapp: {
      ackReaction: {
        emoji: "👀",
        direct: true,
        group: "提及", // 始终 | 提及 | 从不
      },
    },
  },
}
```

注意：会在入站消息被接受后立即发送（在回复之前）；如果存在 `ackReaction` 但没有 `emoji`，WhatsApp 会使用被路由到的代理身份 emoji，并回退为 `"👀"`（如需不发送确认反应，请省略 `ackReaction` 或将 `emoji: ""`）；失败会被记录，但不会阻止回复投递；`group` 模式 `mentions` 仅对由提及触发的轮次生效，而 `group` 激活为 `always` 时会绕过该检查；WhatsApp 仅使用 `channels.whatsapp.ackReaction`（旧的 `messages.ackReaction` 不适用）。

## 生命周期状态反应

设置 `messages.statusReactions.enabled: true`，让 WhatsApp 在一次轮次中用状态反应替换 ack 反应，而不是保留静态的回执表情，状态会在 queued、thinking、tool activity、compaction、done 和 error 之间切换：

```json5
{
  messages: {
    statusReactions: {
      enabled: true,
    },
  },
}
```

注意：`channels.whatsapp.ackReaction` 仍然控制直接消息和群组的可用性；queued 状态使用与普通 ack 反应相同的有效表情符号；WhatsApp 对每条消息只有一个机器人反应槽位，因此生命周期更新会就地替换当前反应，并在最终的 done/error 状态后恢复 ack。

## 活跃回合中的输入状态

对于允许输入状态的已接纳自动回合，代理执行开始时，WhatsApp 会发送一条
`composing` 状态更新，并在回合保持活跃期间刷新该状态。运行完成时（包括终止失败或取消），刷新会停止。当回复分发器报告空闲时，控制器会封存并清理；如果未收到该信号，则会在一段较短的安全超时后执行。现有输入状态和抑制策略禁用输入状态的回合不会启动此活动。

输入状态是短暂的、尽力而为的活动反馈。它不是持久化消息、送达回执，也不保证每个 WhatsApp 客户端都会显示持续的活动状态；重新连接和客户端行为可能会使该指示器消失。生命周期状态反应仍然是上文所述的、具有持久外观的自愿选择状态界面。

## 多账户和凭据

<AccordionGroup>
  <Accordion title="账户选择和默认值">
    账户 ID 来自 `channels.whatsapp.accounts`。如果存在，默认账户选择为 `default`；否则，使用第一个已配置的账户 ID（按字母顺序排序）。账户 ID 在内部会进行归一化以便查找。
  </Accordion>

  <Accordion title="凭据路径和旧版兼容性">
    - 当前认证路径：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`（备份：`creds.json.bak`）
    - 旧版默认认证位于 `~/.openclaw/credentials/`，对于默认账户流程仍会被识别/迁移

  </Accordion>

  <Accordion title="注销行为">
    `openclaw channels logout --channel whatsapp [--account <id>]` 会清除该账户的 WhatsApp 认证状态。当网关可达时，注销会先停止该账户的实时监听，因此在下次重启前，已绑定的会话将不再接收消息。`openclaw channels remove --channel whatsapp` 也会在禁用或删除账户配置之前停止实时监听。

    在旧版认证目录中，`oauth.json` 会被保留，而 Baileys 认证文件会被移除。

  </Accordion>
</AccordionGroup>

## 工具、动作与配置写入

- Agent 工具支持包括 WhatsApp 反应动作（`react`）。
- 动作开关：`channels.whatsapp.actions.reactions`、`channels.whatsapp.actions.polls`（现有动作默认值为 `true`）、`channels.whatsapp.actions.calls`（默认 `false`，见上面的 MeowCaller）。
- 频道发起的配置写入默认启用；可通过 `channels.whatsapp.configWrites: false` 禁用。

## 故障排查

<AccordionGroup>
  <Accordion title="未绑定（需要 QR）">
    症状：通道状态报告未绑定。

```bash
openclaw channels login --channel whatsapp
openclaw channels status
```

  </Accordion>

  <Accordion title="已绑定但断开连接 / 重连循环">
    症状：已绑定账号反复断开或尝试重连。

    静默账号可以在正常消息超时之后继续保持连接；看门狗仅在 WhatsApp Web 传输活动停止、socket 关闭，或应用层活动在更长的安全窗口内持续无响应时才会重启（参见上面的运行时模型）。

    修复：

    ```bash
    openclaw channels status --probe
    openclaw doctor
    openclaw logs --follow
    openclaw gateway status
    ```

    如果在主机连接性和时序都修复后循环仍然存在，请备份账号认证目录并重新关联：

    ```bash
    cp -a ~/.openclaw/credentials/whatsapp/<accountId> \
      ~/.openclaw/credentials/whatsapp/<accountId>.bak
    openclaw channels logout --channel whatsapp --account <accountId>
    openclaw channels login --channel whatsapp --account <accountId>
    ```

    如果 `~/.openclaw/logs/whatsapp-health.log` 显示 `Gateway inactive`，但 `openclaw gateway status` 和 `openclaw channels status --probe` 都显示正常，请运行 `openclaw doctor`。在 Linux 上，doctor 会警告那些调用已弃用的 `~/.openclaw/bin/ensure-whatsapp.sh` 脚本的旧 crontab 条目；请使用 `crontab -e` 删除这些条目——cron 可能缺少 systemd 用户总线环境，从而让旧脚本误报网关健康状态。

  </Accordion>

  <Accordion title="代理后方的 QR 登录超时">
    症状：`openclaw channels login --channel whatsapp` 在显示可用 QR 之前就失败，报 `status=408 Request Time-out` 或 TLS socket 断开。

    WhatsApp Web 登录使用网关主机的标准代理环境变量（`HTTPS_PROXY`、`HTTP_PROXY`、小写变体、`NO_PROXY`）。请确认网关进程继承了代理环境变量，并且 `NO_PROXY` 不会匹配 `mmg.whatsapp.net`。

  </Accordion>

  <Accordion title="发送时没有活动监听器">
    当目标账号不存在活动的网关监听器时，出站发送会快速失败。确认网关正在运行且该账号已关联。
  </Accordion>

  <Accordion title="回复出现在转录中但没有出现在 WhatsApp 中">
    转录行记录的是代理生成的内容；WhatsApp 投递会单独检查。OpenClaw 只有在 Baileys 为至少一条可见文本或媒体发送返回出站消息 id 之后，才会将自动回复视为已发送。

    确认表情回应是独立的、回复前的回执——成功的表情回应并不能证明后续文本/媒体回复已被接受。请检查网关日志中的 `auto-reply delivery failed` 或 `auto-reply was not accepted by WhatsApp provider`。

  </Accordion>

  <Accordion title="群消息意外被忽略">
    请按以下顺序检查：`groupPolicy`、`groupAllowFrom`/`allowFrom`、`groups` 白名单条目、提及门控（`requireMention` + 提及模式），以及 `openclaw.json` 中的重复键（JSON5 中后面的条目会覆盖前面的条目——每个作用域只保留一个 `groupPolicy`）。

    如果存在 `channels.whatsapp.groups`，WhatsApp 仍可能收到其他群组的消息，但 OpenClaw 会在会话路由之前将它们丢弃。将群组 JID 添加到 `channels.whatsapp.groups`，或者添加 `groups["*"]` 以允许所有群组，同时通过 `groupPolicy`/`groupAllowFrom` 保持发送者授权。

  </Accordion>

  <Accordion title="Bun 运行时警告">
    OpenClaw 网关需要 Node。Bun 不提供 canonical 状态存储所使用的 `node:sqlite` API，而 doctor 会将旧的 Bun 服务迁移到 Node。
  </Accordion>
</AccordionGroup>

## 系统提示词

WhatsApp 通过 `groups` 和 `direct` 映射支持类似 Telegram 的群组与私聊系统提示词。

群组消息的解析方式：先确定最终有效的 `groups` 映射——如果某个账号定义了自己的 `groups` 键，那么它会完全替换根级 `groups` 映射（不会进行深度合并）。随后提示词查找只在这个单一结果映射上进行：

1. **群组特定提示词**（`groups["<groupId>"].systemPrompt`）：当群组条目存在并且其 `systemPrompt` 键已定义时使用。空字符串（`""`）会抑制通配符并且不应用任何提示词。
2. **群组通配符提示词**（`groups["*"].systemPrompt`）：当特定群组条目不存在，或者存在但未定义 `systemPrompt` 键时使用。

私聊消息的解析遵循同样的模式，作用于 `direct` 映射和 `direct["*"]`。

<Note>
`dms` 仍然是轻量级的每个 DM 历史覆盖桶（`dms.<id>.historyLimit`）。提示词覆盖位于 `direct` 下。
</Note>

<Note>
这种账号替换根级的提示词解析行为只是一个普通的浅层覆盖：任何账号级 `groups`/`direct` 键，包括显式的空对象，都会替换根级映射。它不同于上文描述的群成员白名单检查，后者在意外出现空的 `groups: {}` 时，对单账号提供了安全兜底。
</Note>

**与 Telegram 的区别：** Telegram 在多账号配置中对 `groups` 使用相同的整个映射账号覆盖机制，但单个账号的空 `groups: {}` 会回退到根级 groups，作为迁移安全网。Telegram 的 `direct` 映射还具有独立的私聊主题语义。在 WhatsApp 中——或者在多个 Telegram 账号中的某一个账号中——当该账号不应继承根级群组默认设置时，请使用显式的空 `groups: {}`。

重要行为：

- `channels.whatsapp.groups` 既是每个群组的配置映射，也是聊天级别的群组白名单。在根级或账号级，`groups["*"]` 都表示“该作用域接纳所有群组”。
- 只有在你已经希望该作用域接纳所有群组时，才添加通配符 `systemPrompt`。如果你只想让固定的一组群组 ID 有资格被接纳，请在每个显式白名单条目上重复提示词，而不是使用 `groups["*"]`。
- 群组接纳和发送者授权是两个独立检查。`groups["*"]` 只是扩大哪些群组会进入群组处理流程；它不会授权这些群组中的每一位发送者——这仍由 `groupPolicy`/`groupAllowFrom` 控制。
- `channels.whatsapp.direct` 对 DM 没有对应的副作用：`direct["*"]` 只会在一个 DM 已经通过 `dmPolicy` 加上 `allowFrom` 或配对存储规则被接纳后，提供默认配置。

示例：

```json5
{
  channels: {
    whatsapp: {
      groups: {
        // 仅在你已经希望根作用域接纳所有群组时使用。
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

主要参考：[配置参考 - WhatsApp](/gateway/config-channels#whatsapp)

| 区域             | 字段                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| 访问控制         | `dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`、`groups`                                             |
| 消息投递         | `textChunkLimit`、`streaming.chunkMode`、`mediaMaxMb`、`sendReadReceipts`、`ackReaction`、`reactionLevel`      |
| 多账户           | `accounts.<id>.enabled`、`accounts.<id>.authDir`，以及其他每个账户的覆盖设置                              |
| 操作             | `configWrites`、`enabled`                                                                                      |
| 入站批处理       | `messages.inbound.debounceMs`、`messages.inbound.byChannel.whatsapp`                                           |
| 会话行为         | `session.dmScope`、`historyLimit`、`dmHistoryLimit`、`dms.<id>.historyLimit`                                   |
| 提示词           | `groups.<id>.systemPrompt`、`groups["*"].systemPrompt`、`direct.<id>.systemPrompt`、`direct["*"].systemPrompt` |

## 相关内容

- [配对](/channels/pairing)
- [群组](/channels/groups)
- [安全](/gateway/security)
- [频道路由](/channels/channel-routing)
- [多智能体路由](/concepts/multi-agent)
- [故障排除](/channels/troubleshooting)
