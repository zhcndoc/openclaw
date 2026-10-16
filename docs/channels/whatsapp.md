---
summary: "WhatsApp 频道支持、访问控制、投递行为和运维"
read_when:
  - "正在处理 WhatsApp/web 频道行为或收件箱路由"
title: "WhatsApp"
---

状态：通过 WhatsApp Web（Baileys）达到生产可用。网关拥有已关联的会话；不存在单独的 Twilio WhatsApp 频道。

## <a id="setup"></a> 设置

### <a id="install"></a> 安装

`openclaw onboard`和`openclaw channels add --channel whatsapp`首次选择时提示安装插件；如果插件丢失，`openclaw channels login --channel whatsapp` 提供相同的安装流程。开发检查使用本地插件路径； stable/beta 首先从 npm 安装 `@openclaw/whatsapp`，然后仅当 npm 目标不可用时才回退到其声明的 ClawHub 包。 WhatsApp 运行时在核心 OpenClaw npm 包之外提供，因此其运行时依赖项仍保留在外部插件中。手动安装：

```bash
openclaw plugins install @openclaw/whatsapp
```

使用 `npm:@openclaw/whatsapp` 或 `clawhub:@openclaw/whatsapp` 强制源；仅针对可重复安装固定精确版本。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/channels/pairing">
    默认 DM 策略是针对未知发件人进行配对。
  </Card>
  <Card title="频道故障排查" icon="wrench" href="/channels/troubleshooting">
    跨渠道诊断和修复手册。
  </Card>
  <Card title="网关配置" icon="settings" href="/gateway/configuration">
    完整的通道配置模式和示例。
  </Card>
</CardGroup>

### <a id="quick-setup"></a> 快速设置

<Steps>
  <Step id="configure-access-policy" title="配置访问策略">

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

  <Step id="link-whatsapp-qr" title="链接 WhatsApp （QR）">

```bash
openclaw channels login --channel whatsapp
```

    登录名为 QR-only。在远程或无头主机上，在开始登录之前有可靠的路径将实时 QR 传送到电话；终端呈现的 QR、屏幕截图或聊天附件可能会在传输过程中过期。

    对于特定账号：

```bash
openclaw channels login --channel whatsapp --account work
```

    要在登录前附加 existing/custom 身份验证目录：

```bash
openclaw channels add --channel whatsapp --account work --auth-dir /path/to/wa-auth
openclaw channels login --channel whatsapp --account work
```

  </Step>

  <Step id="start-the-gateway" title="启动网关">

```bash
openclaw gateway
```

  </Step>

  <Step id="approve-the-first-dm-access-request-pairing-mode" title="批准第一个DM访问请求（配对模式）">

    打开**设置→通道→DM访问请求**，找到WhatsApp账户，并批准发件人。如果您更喜欢 CLI：

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    DM 访问请求1小时后过期；每个帐户的待处理请求上限为 3 个。此批准与用于链接帐户本身的 WhatsApp 登录名 QR 是分开的。

  </Step>
</Steps>

<Note>
建议使用单独的 WhatsApp 编号（设置和元数据已针对它进行优化），但完全支持个人 number/self-chat 设置。
</Note>

### <a id="deployment-patterns"></a> 部署模式

<AccordionGroup>
  <Accordion id="dedicated-number-recommended" title="专用号码（推荐）">
    - OpenClaw 的单独 WhatsApp 身份
    - clearer DM 许可名单和路由边界
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

  <Accordion id="personal-number-fallback" title="个人号码回退">
    Onboarding 支持个人号码模式，并写入适合自聊的基线：`dmPolicy: "allowlist"`、`allowFrom`，包括您自己的号码 `selfChatMode: true`。准入及保障规则参见[个人号码及自聊行为](/channels/whatsapp#personal-number-and-self-chat-behavior)。
  </Accordion>
</AccordionGroup>

## <a id="runtime-model"></a> 运行时模型

- 网关拥有 WhatsApp socket 和重连循环。
- A 看门狗独立跟踪两个信号：原始 WhatsApp Web 传输活动和应用程序消息活动。安静但已连接的会话不会仅仅因为最近没有消息到达而重新启动；仅当传输帧停止到达固定内部窗口（用户不​​可配置）或应用程序消息保持静默超过正常消息超时的 4 倍时，它才会强制重新连接。在重新连接最近活动的会话后，第一个窗口将使用较短的正常消息超时而不是 4x 窗口。 OpenClaw 可以自动回复 Baileys 在重新连接早期传递的离线消息，受入站消息 ID 重复数据删除生命周期的限制；初始启动保留了短暂的陈旧历史保护。
- 发送出站消息需要目标账号存在活跃的 WhatsApp 监听器；否则发送会快速失败。
- 当令牌与当前参与者元数据（包括 LID- 支持的组）匹配时，Group 会发送 `@+<digits>` 和 `@<digits>` 令牌的附加本机提及元数据（在文本和媒体标题中）。
- 状态和广播聊天（`@status`、`@broadcast`）会被忽略。
- Direct 聊天使用 DM 会话规则（`session.dmScope`；默认 `main` 将 DM 折叠到座席主会话中）。使用默认值 `session.groupScope: "per-group"`，组会话按照 JID （`agent:<agentId>:whatsapp:group:<jid>`） 进行隔离。
- WhatsApp Channels/Newsletters 可以通过其原生 `@newsletter` JID 作为显式出站目标，使用频道会话元数据（`agent:<agentId>:whatsapp:channel:<jid>`）而不是 DM 语义。
- WhatsApp Web 传输遵守网关主机上的标准代理环境变量（`HTTPS_PROXY`、`HTTP_PROXY`、`NO_PROXY` 及其小写变体）。优先使用主机级代理配置，而不是按频道配置。
- 在 Node 和 Bun 上，媒体上传使用相同的代理环境和托管 HTTPS- 代理信任，并针对每个实际上传和重定向主机评估 `NO_PROXY`，而与 WebSocket 目标无关。
- Media 代理 URL 必须使用 HTTP 或 HTTPS。无效的媒体代理设置会导致上传失败，但不会阻止登录或短信。

## <a id="call-the-current-requester-with-meowcaller-(experimental)"></a><a id="call-the-current-requester-with-meowcaller-experimental"></a> 使用 MeowCaller 呼叫当前请求者（实验性）

该插件可以在 WhatsApp- 发起的代理回合中公开 `whatsapp_call`。它使用 [MeowCaller](https://github.com/purpshell/meowcaller) 向当前授权请求者发出 WhatsApp 语音呼叫，并在他们应答后播放 OpenClaw TTS 消息。该工具没有目标号码参数，因此提示无法重定向呼叫。默认禁用。

<Warning>
MeowCaller 是实验性的，没有标记版本，并使用单独配对的 Whatsmeow 链接设备会话 - 它无法重用插件的 Baileys 凭据。配对将另一个链接设备添加到同一 WhatsApp 帐户；使用OpenClaw使用的身份进行扫描。个人-number/self-chat模式无法调用自身；使用专用的 OpenClaw 号码拨打您的个人号码。
</Warning>

<Steps>
  <Step id="enable-experimental-calls" title="启用实验调用">

    将 `actions.calls: true` 添加到 WhatsApp 通道配置中。更改遵循 [hot reload](/gateway/configuration/hot-reload)：

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

  <Step id="install-the-reviewed-meowcaller-cli" title="安装经过审查的 MeowCaller CLI">

    该适配器需要在网关主机的 `PATH` 上执行 `meowcaller`。直到 [MeowCaller PR #7](https://github.com/purpshell/meowcaller/pull/7) 合并，构建审核分支：

```bash
git clone --branch feat/send-only-notify https://github.com/steipete/meowcaller.git
cd meowcaller
git checkout 752050471fc2bf7a8cdfbf7dbd3cd4e865d85d3f
mkdir -p "$HOME/.local/bin"
go build -o "$HOME/.local/bin/meowcaller" ./cmd/meowcaller
```

    将`$HOME/.local/bin`添加到网关服务的`PATH`中；如果更改了网关的服务环境，请重新启动网关。此版本具有显式 `pair` 和仅发送 `notify` 命令； `notify` 不打开麦克风、扬声器、视频设备或诊断捕获。不要替换上游示例 CLI 的 `play` 命令。

  </Step>

  <Step id="pair-the-meowcaller-linked-device" title="配对 MeowCaller 链接设备">

    让 WhatsApp 代理检查通话设置（`whatsapp_call` 状态动作会报告账户特定的状态目录和配对命令）。对于默认账户：

```bash
state_dir="$HOME/.openclaw/credentials/whatsapp-calls/default"
mkdir -p "$state_dir"
chmod 700 "$state_dir"
meowcaller pair --store "$state_dir/wa-voip.db"
```

    以交互方式运行此命令，从 **WhatsApp > 链接设备** 扫描 QR，然后等待 `MeowCaller linked device ready`。将 `wa-voip.db` 设为私有 — 这是 MeowCaller 会话。非默认帐户从状态操作中获取自己的存储路径；在Windows上，运行其PowerShell命令。

  </Step>

  <Step id="configure-tts-and-call-from-whatsapp" title="配置TTS并从WhatsApp调用">

    配置支持电话功能的 [TTS 提供程序](/tools/tts)，然后发送诸如 `Call me and say the build finished.` 之类的请求。该工具从受信任的入站上下文中解析发件人，合成临时私有 WAV 文件，为有界呼叫窗口运行 MeowCaller，然后删除音频文件。 OpenClaw 显式传递帐户的存储，在 answer/playback/hangup 之后等待零退出状态，并将超时或非零退出视为失败的工具调用。

  </Step>
</Steps>

限制：仅限一对一出站音频呼叫、无任意目标号码、无与聊天连接共享身份验证、无来自个人 number/self-chat 模式的自呼叫、合成音频上限为 60 秒、超出 MeowCaller 的 answer/playback/hangup 完成范围后没有手机端可听接收，并且 OpenClaw 在有界后停止同伴进程115-175第二个窗口（涵盖MeowCaller的连接、接听、播放和关机阶段）。

## <a id="approval-prompts"></a> 审批提示

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

## <a id="question-reactions"></a> 问题反应

对于包含一个非秘密单选问题和一到四个选项的 `ask_user` 提示，WhatsApp 在选项标签旁边显示 `1️⃣` 到 `4️⃣`。使用匹配的号码对发送的提示作出反应以回答它。 OpenClaw 通过网关将号码映射到存储的选项；过时或重复的点击将被忽略。多问题、多选择和自由文本提示仍然仅限文本回复。正常 WhatsApp DM/group 准入规则授权做出反应的发送者。

## <a id="plugin-hooks-and-privacy"></a> 插件钩子与隐私

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

## <a id="access-control"></a> 访问控制

### <a id="access-control-and-activation"></a> 访问控制和激活

<Tabs>
  <Tab id="dm-policy" title="DM 政策">
    `channels.whatsapp.dmPolicy`:

    | 值 | 行为 |
    | --- | --- |
    | `pairing`（默认） | 未知发送者请求配对；所有者批准 |
    | `allowlist` | 仅允许 `allowFrom` 中的发送者 |
    | `open` | 需要 `allowFrom` 包含 `"*"` |
    | `disabled` | 阻止所有私信 |

    `allowFrom` 接受 E.164-style 数字（内部标准化）。它只是一个 DM 发送方访问控制列表 - 它不会将显式出站发送门控到组 JID 或 `@newsletter` 通道 JID。

    多账号覆盖：`channels.whatsapp.accounts.<id>.dmPolicy`（以及 `.allowFrom`）会优先于该账号的频道级默认值。

    运行时说明：

    - 配对会保留在频道 allow-store 中，并与已配置的 `allowFrom` 合并
    - 计划的自动化和心跳接收者回退使用显式传送目标或配置的 `allowFrom`； DM 配对批准不是隐式 cron/heartbeat 收件人
    - 允许同号自DM，除非`selfChatMode: false`或`dmPolicy: "disabled"`；参见[自聊天行为](/channels/whatsapp#personal-number-and-self-chat-behavior)
    - OpenClaw 永远不会自动配对外发的 `fromMe` 私信（你从已绑定设备自行发送的消息）

  </Tab>

  <Tab id="group-policy-and-allowlists" title="组策略和许可名单">
    群组访问有两层：

    1. **群组成员 allowlist**（`channels.whatsapp.groups`）：如果省略 `groups`，则所有群组都符合条件；如果存在，则它充当群组 allowlist（`"*"` 允许全部）。
    2. **群组发送者策略**（`channels.whatsapp.groupPolicy` + `groupAllowFrom`）：`open` 会绕过发送者 allowlist，`allowlist` 需要匹配 `groupAllowFrom`（或 `*`），`disabled` 会阻止所有群组入站。

    如果 `groupAllowFrom` 未设置，则发送方检查在有条目时回退到 `allowFrom`。在 mention/reply 激活之前评估发件人白名单。

    如果完全不存在 `channels.whatsapp` 块，运行时会回退到 `groupPolicy: "allowlist"`（并记录警告日志），即使 `channels.defaults.groupPolicy` 设置了其他值也是如此。

    <Note>
    设置时，入站组处理使用 `channels.whatsapp.accounts.<id>.groups`。命名账户否则继承`channels.whatsapp.accounts.default.groups`，然后继承`channels.whatsapp.groups`；默认帐户使用自己的映射或根映射。组映射作为一个整体相互替换，而不是合并各个组条目。显式空映射 （`{}`） 也会替换继承的映射。
    </Note>

  </Tab>

  <Tab id="mentions-and-%2Factivation" title="提及和/激活">
    群组回复默认需要提及。提及检测包括：

    - 对机器人身份的显式 WhatsApp 提及
    - 提及正则表达式模式（`agents.entries.*.groupChat.mentionPatterns`，后备 `messages.groupChat.mentionPatterns`）；如果两者均未设置，则模式源自路由代理的 `identity.name` 和 `identity.emoji`
    - 已授权群组消息的入站语音便笺转写
    - 隐式的回复机器人检测（回复发送者与机器人身份匹配）

    所选代理或全局级别的显式 `mentionPatterns: []` 会抑制源自身份的文本模式。本机提及和回复机器人检测仍然是分开的。

    要处理组中所有允许的消息，请在已提供帐户组策略的映射中设置 `groups["<group-id>"].requireMention: false`：`channels.whatsapp.groups` 或有效的 `channels.whatsapp.accounts.<id>.groups` 映射，包括继承的 `accounts.default.groups`。保留每个现有的通配符和每组设置。如果您有意创建特定于帐户的映射而不是编辑继承的映射，请先复制完整的继承映射，然后仅更改目标组的 `requireMention`。如果之前没有应用地图，请包含 `"*": {}` 以允许其他聊天；否则保留现有限制。已保存的会话激活模式优先于此配置默认值；该会话使用 `/activation always`。

    安全：quote/reply只满足提及门控——确实如此**不是**授予发件人授权。和`groupPolicy: "allowlist"`，即使回复列入白名单的用户的邮件，非白名单发件人仍会被阻止。

    会话级激活命令：`/activation mention` 或 `/activation always`。这会更新会话状态（不是全局配置），并且受所有者保护。

    指定帐户仅使用其自己的帐户范围内的激活。他们不再继承较旧的无范围群体的偏好。如果这是您唯一保存的首选项，则配置的提及策略将一直适用，直到您在目标帐户组中再次运行 `/activation` 为止。现有的作用域和默认帐户首选项、会话历史记录和存储的行保持不变；没有自动迁移会复制旧的设置。

  </Tab>
</Tabs>

### <a id="configured-acp-bindings"></a> 配置的 ACP 绑定

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

直接聊天匹配E.164号码；组与 WhatsApp 组 JID 匹配。如果需要，在 OpenClaw 创建绑定的 ACP 会话之前运行组白名单、发件人策略和 mention/activation 门控。匹配的绑定拥有该路由 — 广播组不会将结果转为普通 WhatsApp 会话。

### <a id="personal-number-and-self-chat-behavior"></a> 个人号码及自聊天行为

`channels.whatsapp.selfChatMode` 控制相同号码 DM 准入和自助聊天安全措施。将其设置在通道级别或使用 `channels.whatsapp.accounts.<id>.selfChatMode` 按帐户覆盖它。

- **`true` 或 unset：** 来自链接号码的 DM 被允许作为座席输入，即使 `allowFrom` 中不存在该号码。 `dmPolicy: "disabled"` 仍然阻止所有 DM。
- **`false`：** 自发的 DM 会被忽略，即使您的号码位于 `allowFrom` 中。其他入站 DM 和群组消息仍遵循其访问策略；此设置不会使帐户仅限出站。

隐式自我编号限额仅适用于 DM，不适用于群组白名单。

自助聊天保护措施由 `true` 启用，由 `false` 禁用。取消设置时，如果链接的自身编号出现在配置的 `allowFrom` 中，则 OpenClaw 启用它们。这些保护措施会跳过已读回执，抑制本机自提及触发器，并在未配置响应前缀时提供身份回复前缀。

因此，发送到您自己的号码的活动检查可以成为未设置 `selfChatMode` 或 `true` 的代理输入。如果要排除那些自发的 DM，请设置 `selfChatMode: false`。

## <a id="messaging-and-delivery"></a> 消息传递和传递

### <a id="message-normalization-and-context"></a> 消息规范化和上下文

<AccordionGroup>
  <Accordion id="inbound-envelope-and-reply-context" title="入站信封和回复上下文">
    传入消息会被包装在共享的传入封套中。引用回复会按以下形式附加上下文：

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    回复元数据（`ReplyToId`、`ReplyToBody`、`ReplyToSender`、sender JID/E.164）会在可用时被填充。如果被引用的目标是可下载媒体，OpenClaw 会通过常规传入媒体存储保存它，并暴露 `MediaPath`/`MediaType`，以便代理可以直接检查它，而不是只看到 `<media:image>`。

  </Accordion>

  <Accordion id="media-placeholders-and-location-contact-extraction" title="媒体占位符和 location/contact 提取">
    仅媒体消息会规范化为占位符：`<media:image>`、`<media:video>`、`<media:audio>`、`<media:document>`、`<media:sticker>`。

    仅当正文只有 `<media:audio>` 时，授权群组语音会在提及门控之前先转写，因此在语音中说出机器人提及可以触发回复。如果转写内容仍未提及机器人，它会保留在待处理群历史中，而不是原始占位符。

    位置主体呈现为简洁的坐标文本。位置 labels/comments 和 contact/vCard 详细信息呈现为受保护的不受信任元数据，而不是内联提示文本。

  </Accordion>

  <Accordion id="pending-group-history-injection" title="待定组历史注射">
    未处理的群消息会缓冲，并在机器人最终被触发时作为上下文注入。

    - 默认限制：`50`
    - 配置：`channels.whatsapp.historyLimit`，回退到 `messages.groupChat.historyLimit`
    - `0` 禁用

    注入标记：`[Chat messages since your last reply - for context]` 和 `[Current message - respond to this]`。

  </Accordion>

  <Accordion id="read-receipts" title="阅读收据">
    对已接受的传入消息默认启用。全局禁用：

    ```json5
    { channels: { whatsapp: { sendReadReceipts: false } } }
    ```

    每个帐户覆盖：`channels.whatsapp.accounts.<id>.sendReadReceipts`。即使全局启用，自助聊天保护措施也会跳过已读回执（请参阅 [ 自助聊天行为](/channels/whatsapp#personal-number-and-self-chat-behavior)）。

  </Accordion>
</AccordionGroup>

### <a id="delivery%2C-chunking%2C-and-media"></a><a id="delivery-chunking-and-media"></a> 传送、分块和媒体

<AccordionGroup>
  <Accordion id="text-chunking" title="文本分块">
    - 默认分块限制：`channels.whatsapp.textChunkLimit = 4000`
    - Markdown 在发送块之前进行转换，跨消息边界保留样式并将 WhatsApp 格式化标记计入限制
    - `channels.whatsapp.streaming.chunkMode = "length" | "newline"`；`newline` 优先按段落边界（空行）分割，然后回退到按长度安全分块

  </Accordion>

  <Accordion id="outbound-media-behavior" title="出站媒体行为">
    - 支持图像、视频、音频（PTT 语音消息）和文档负载
    - 音频会作为 Baileys 的 `audio` 负载发送，并设置 `ptt: true`，从而呈现为按住说话语音消息；`audioAsVoice` 会保留在回复负载中，因此无论提供方的源格式如何，TTS 语音消息输出都会保持走这一路径
    - native Ogg/Opus 音频发送为 `audio/ogg; codecs=opus`；其他任何内容（包括 Microsoft Edge TTS MP3/WebM 输出）在 PTT 交付之前均使用 `ffmpeg` 转码为 48 kHz 单声道 Ogg/Opus
    - `/tts latest` 会将最新的助手回复作为一条语音消息发送，并抑制对同一回复的重复发送；`/tts chat on|off|default` 控制当前聊天的自动 TTS
    - 发送视频时设置 `gifPlayback: true` 会启用动画 GIF 播放
    - `forceDocument`/`asDocument` 通过 Baileys 文档负载路由出站图像、GIF 和视频，以避免 WhatsApp 的媒体压缩，保留解析的文件名和 MIME 类型
    - 标题会应用到多媒体回复中的第一项媒体，但 PTT 语音消息除外：音频先发送且不带标题，然后标题作为单独的文本消息发送（WhatsApp 客户端对语音消息标题的渲染并不一致）
    - 当稍后带标题的回复重复待处理附件时，只有 WhatsApp 接受的附件会替换其待处理副本；不匹配的附件仍在排队等待传送
    - 媒体源可以是 HTTP(S)、`file://` 或本地路径

  </Accordion>

  <Accordion id="media-size-limits-and-fallback-behavior" title="媒体大小限制和后备行为">
    - 传入保存上限和出站发送上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 按账户覆盖：`channels.whatsapp.accounts.<id>.mediaMaxMb`
    - 图像自动优化（resize/quality 扫描）以适应限制，除非 `forceDocument`/`asDocument` 请求文档传送
    - 媒体发送失败时，第一项的回退会发送文本警告，而不是静默丢弃回复

  </Accordion>
</AccordionGroup>

### <a id="reply-quoting"></a> 回复引用

`channels.whatsapp.replyToMode` 控制原生回复引用（出站回复会明显引用传入消息）：

| 值             | 行为                                                       |
| ----------------- | -------------------------------------------------------------- |
| `"off"`（默认） | 从不引用；以普通消息发送                           |
| `"first"`         | 仅引用第一个出站回复分块                      |
| `"all"`           | 引用每个出站回复分块                               |
| `"batched"`       | 引用排队的批量回复；即时回复不引用 |

如果不再缓存原始消息文本和媒体详细信息，OpenClaw 将回复作为纯消息发送。回复正文被保留，但其与原始消息的视觉链接丢失。

按账户覆盖：`channels.whatsapp.accounts.<id>.replyToMode`。

```json5
{ channels: { whatsapp: { replyToMode: "first" } } }
```

## <a id="reactions-and-typing"></a> 反应和打字

### <a id="reaction-level"></a> 反应水平

`channels.whatsapp.reactionLevel` 控制代理使用表情回应的广泛程度：

| 等级                 | 确认回应 | 代理发起的回应  |
| --------------------- | ------------- | -------------------------- |
| `"off"`               | No            | No                         |
| `"ack"`               | 是           | No                         |
| `"minimal"` (默认) | 是           | 是，保守引导 |
| `"extensive"`         | 是           | 是，鼓励性引导   |

按账户覆盖：`channels.whatsapp.accounts.<id>.reactionLevel`。

```json5
{ channels: { whatsapp: { reactionLevel: "ack" } } }
```

### <a id="acknowledgment-reactions"></a> 致谢反应

`messages.ackReaction` 会在收到入站消息后立即发送反应，其受活跃 WhatsApp 账户的 `reactionLevel` 控制（当设置为 `"off"` 时会被抑制）。`messages.ackReactionScope` 用于选择私信、群组或两者：

```json5
{
  messages: {
    ackReaction: "👀",
    ackReactionScope: "group-mentions", // all | direct | group-all | group-mentions | off
  },
}
```

注：接受入站后立即发送反应（预回复）；省略 `messages.ackReaction` 或将其设置为 `""` 则不进行确认。失败会被记录，但不会阻止回复传递。默认范围为`"group-mentions"`；使用 `"all"` 进行直接消息和所有符合条件的群组。在激活为 `always` 的组中，`"group-mentions"` 确认每条消息，而不仅仅是提及触发的回合，因为激活代表提及检查。

### <a id="lifecycle-status-reactions"></a> 生命周期状态反应

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

注意：`messages.ackReactionScope` 仍控制私聊和群组的适用性；queued 状态使用与普通确认反应相同的有效表情。WhatsApp 每条消息只有一个机器人反应槽，因此生命周期更新会原地替换当前反应，并在最终的 done/error 状态后恢复确认反应。

在活动运行后面排队的消息会保留其确认，直到其后续运行提供可见的回复。仅仅成功的执行并不会产生成功的反应。如果运输保留未确认的交付，则反应被清除，而不声明成功或失败；稍后的持久重试不会更新已清除的反应。没有可见回复的固定转弯（包括无声转弯或 `NO_REPLY` 转弯）会像直接调度一样显示错误反应。执行失败、终端准入跳过、停止取消以及队列上限策略拒绝或删除的消息会立即显示错误反应。收集和总结的后续活动保留了每条消息的传递相关性。

### <a id="active-turn-typing"></a> 主动轮打字

对于允许输入状态的已接纳自动回合，代理执行开始时，WhatsApp 会发送一条 `composing` 状态更新，并在回合保持活跃期间刷新该状态。运行完成时（包括终止失败或取消），刷新会停止。当回复分发器报告空闲时，控制器会封存并清理；如果未收到该信号，则会在一段较短的安全超时后执行。现有输入状态和抑制策略禁用输入状态的回合不会启动此活动。

输入状态是短暂的、尽力而为的活动反馈。它不是持久化消息、送达回执，也不保证每个 WhatsApp 客户端都会显示持续的活动状态；重新连接和客户端行为可能会使该指示器消失。生命周期状态反应仍然是上文所述的、具有持久外观的自愿选择状态界面。

## <a id="multi-account-and-credentials"></a> 多账户和凭据

<AccordionGroup>
  <Accordion id="account-selection-and-defaults" title="帐户选择和默认值">
    帐户 ID 来自 `channels.whatsapp.accounts`。默认帐户选择为 `default`（如果存在），否则为第一个配置的帐户 ID（按字母顺序排序）。帐户 ID 在内部进行标准化以供查找。

    命名帐户按以下顺序解析共享设置：帐户、`accounts.default`，然后是通道根。这包括 `dmPolicy` 和 `groupPolicy`：省略继承，而显式值获胜。在未配置策略的情况下，DM 使用 `pairing`，组使用 `allowlist`。默认账户的 `authDir`、`enabled`、`name` 和 `selfChatMode` 不与指定账户共享。

  </Accordion>

  <Accordion id="credential-paths-and-legacy-compatibility" title="凭证路径和旧版兼容性">
    - 当前认证路径：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`（备份：`creds.json.bak`）
    - 在保留精确的私有 `.migrated` 备份后，Doctor 将隐式旧版默认身份验证从 `~/.openclaw/credentials/` 移动到帐户目录中。运行时帐户选择使用帐户目录；直接替换旧安装后运行 `openclaw doctor --fix`。
    - 显式 `authDir` 设置保持权威，包括故意使用共享凭据根的帐户。医生将这些目录保留在原处。不同的当前和旧凭证保持不变，并提供可操作的冲突警告； Doctor 绝不会混合两个凭证集。
    - Doctor 在写入帐户目录之前记录凭证迁移收据。如果中断导入的完整目标后来丢失或更改，Doctor 会保留剩余的源和备份并要求显式恢复。它不会重新创建注销的帐户。
    - 帐户目录凭据在 OpenClaw 上仍然有效 2026.9.7. 共享根修复需要具有脱机 Doctor 迁移权限和源备份的主机。如果Doctor要求您升级主机，请先更新OpenClaw核心再重试；该插件保持原始凭证不变。

  </Accordion>

  <Accordion id="logout-behavior" title="注销行为">
    `openclaw channels logout --channel whatsapp [--account <id>]` 会清除该账户的 WhatsApp 认证状态。当网关可达时，注销会先停止该账户的实时监听，因此在下次重启前，已绑定的会话将不再接收消息。`openclaw channels remove --channel whatsapp` 也会在禁用或删除账户配置之前停止实时监听。

    注销会将显式配置的凭据目录保留在托管帐户树之外。它永远不会从共享根中删除不相关的 OAuth 凭据。

  </Accordion>
</AccordionGroup>

## <a id="tools%2C-actions%2C-and-config-writes"></a><a id="tools-actions-and-config-writes"></a> 工具、动作与配置写入

- Agent 工具支持包括 WhatsApp 反应动作（`react`）。
- 动作开关：`channels.whatsapp.actions.reactions`、`channels.whatsapp.actions.polls`（现有动作默认值为 `true`）、`channels.whatsapp.actions.calls`（默认 `false`，见上面的 MeowCaller）。
- 频道发起的配置写入默认启用；可通过 `channels.whatsapp.configWrites: false` 禁用。

## <a id="troubleshooting"></a> 故障排查

<AccordionGroup>
  <Accordion id="not-linked-qr-required" title="未链接（需要 QR）">
    症状：通道状态报告未绑定。

```bash
openclaw channels login --channel whatsapp
openclaw channels status
```

  </Accordion>

  <Accordion id="linked-but-disconnected-reconnect-loop" title="已链接但已断开/重新连接循环">
    症状：已绑定账号反复断开或尝试重连。

    静默账号可以在正常消息超时之后继续保持连接；看门狗仅在 WhatsApp Web 传输活动停止、socket 关闭，或应用层活动在更长的安全窗口内持续无响应时才会重启（参见上面的运行时模型）。

    使固定：

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

  <Accordion id="qr-login-times-out-behind-a-proxy" title="QR 在代理后面登录超时">
    症状：`openclaw channels login --channel whatsapp` 在显示可用 QR 之前就失败，报 `status=408 Request Time-out` 或 TLS socket 断开。

    WhatsApp Web 登录使用网关主机的标准代理环境变量（`HTTPS_PROXY`、`HTTP_PROXY`、小写变体、`NO_PROXY`）。请确认网关进程继承了代理环境变量，并且 `NO_PROXY` 不会匹配 `mmg.whatsapp.net`。

  </Accordion>

  <Accordion id="no-active-listener-when-sending" title="发送时没有活动侦听器">
    当目标账号不存在活动的网关监听器时，出站发送会快速失败。确认网关正在运行且该账号已关联。
  </Accordion>

  <Accordion id="reply-appears-in-transcript-but-not-in-whatsapp" title="回复出现在文字记录中，但不在 WhatsApp 中">
    转录行记录的是代理生成的内容；WhatsApp 投递会单独检查。OpenClaw 只有在 Baileys 为至少一条可见文本或媒体发送返回出站消息 id 之后，才会将自动回复视为已发送。

    Ack 反应是独立的预回复收据 - 成功的反应并不证明后来的 text/media 回复已被接受。检查网关日志中是否有 `auto-reply delivery failed` 或 `auto-reply was not accepted by WhatsApp provider`。

  </Accordion>

  <Accordion id="group-messages-unexpectedly-ignored" title="群组消息意外被忽略">
    请按以下顺序检查：`groupPolicy`、`groupAllowFrom`/`allowFrom`、`groups` 白名单条目、提及门控（`requireMention` + 提及模式），以及 `openclaw.json` 中的重复键（JSON5 中后面的条目会覆盖前面的条目——每个作用域只保留一个 `groupPolicy`）。

    如果 `channels.whatsapp.groups` 存在，WhatsApp 仍然可以观察来自其他组的消息，但 OpenClaw 在会话路由之前丢弃它们。将组 JID 添加到 `channels.whatsapp.groups`，或添加 `groups["*"]` 以接纳所有组，同时将发件人授权保留在 `groupPolicy`/`groupAllowFrom`. 下

  </Accordion>

  <Accordion id="bun-runtime-warning" title="Bun 运行时警告">
    Node 仍然是主要且推荐的网关运行时。支持使用 WAL- 重置安全 `node:sqlite` 的 Bun 1.4.3+ 构建作为显式选择加入； doctor 仅将不支持的 Bun 服务迁移到 Node。
  </Accordion>
</AccordionGroup>

## <a id="system-prompts"></a> 系统提示词

WhatsApp 支持 Telegram- 风格的系统提示，可通过 `groups` 和 `direct` 地图进行群组和直接聊天。

群组消息的解析方式：先确定最终有效的 `groups` 映射——如果某个账号定义了自己的 `groups` 键，那么它会完全替换根级 `groups` 映射（不会进行深度合并）。随后提示词查找只在这个单一结果映射上进行：

1. **组特定提示**（`groups["<groupId>"].systemPrompt`）：当组条目存在**和**时使用，其`systemPrompt`键被定义。空字符串 （`""`） 会抑制通配符并且不应用提示。
2. **群组通配符提示词**（`groups["*"].systemPrompt`）：当特定群组条目不存在，或者存在但未定义 `systemPrompt` 键时使用。

私聊消息的解析遵循同样的模式，作用于 `direct` 映射和 `direct["*"]`。

<Note>
`dms` 仍然是轻量级的每个 DM 历史覆盖桶（`dms.<id>.historyLimit`）。提示词覆盖位于 `direct` 下。
</Note>

<Note>
这种账号替换根级的提示词解析行为只是一个普通的浅层覆盖：任何账号级 `groups`/`direct` 键，包括显式的空对象，都会替换根级映射。它不同于上文描述的群成员白名单检查，后者在意外出现空的 `groups: {}` 时，对单账号提供了安全兜底。
</Note>

**与 Telegram 的区别：** Telegram 在多账户配置中对 `groups` 使用相同的全地图账户覆盖，但单个账户的空 `groups: {}` 会回退到根组作为迁移安全网。 Telegram 的 `direct` 映射也具有单独的 DM- 主题语义。在 WhatsApp 中（或对于多个 Telegram 帐户中的一个帐户），当该帐户不应继承根组默认值时，请使用显式空 `groups: {}`。

重要行为：

- `channels.whatsapp.groups` 既是每个群组的配置映射，也是聊天级别的群组白名单。在根级或账号级，`groups["*"]` 都表示“该作用域接纳所有群组”。
- 仅当您已经希望该范围允许所有组时才添加通配符 `systemPrompt`。要仅保留一组固定的组 ID 符合条件，请对每个明确列入许可名单的条目重复提示，而不是使用 `groups["*"]`。
- 组准入和发件人授权是单独检查的。 `groups["*"]` 拓宽了哪些组达到组处理；它不会授权这些组中的每个发件人 - 仍由 `groupPolicy`/`groupAllowFrom`. 控制
- `channels.whatsapp.direct` 对 DM 没有同等副作用：`direct["*"]` 仅在 DM 已被 `dmPolicy` 加上 `allowFrom` 或配对存储规则接纳后提供默认配置。

示例：

```json5
{
  channels: {
    whatsapp: {
      groups: {
        // Use only if all groups should be admitted at the root scope.
        // Applies to all accounts that do not define their own groups map.
        "*": { systemPrompt: "Default prompt for all groups." },
      },
      direct: {
        // Applies to all accounts that do not define their own direct map.
        "*": { systemPrompt: "Default prompt for all direct chats." },
      },
      accounts: {
        work: {
          groups: {
            // This account defines its own groups, so root groups are fully
            // replaced. To keep a wildcard, define "*" explicitly here too.
            "120363406415684625@g.us": {
              requireMention: false,
              systemPrompt: "Focus on project management.",
            },
            // Use only if all groups should be admitted in this account.
            "*": { systemPrompt: "Default prompt for work groups." },
          },
          direct: {
            // This account defines its own direct map, so root direct entries are
            // fully replaced. To keep a wildcard, define "*" explicitly here too.
            "+15551234567": { systemPrompt: "Prompt for a specific work direct chat." },
            "*": { systemPrompt: "Default prompt for work direct chats." },
          },
        },
      },
    },
  },
}
```

## <a id="configuration-reference-pointers"></a> 配置参考指针

主要参考： [配置参考 - WhatsApp](/gateway/config-channels#whatsapp)

| 区域             | 字段                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| 使用权           | `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`                                             |
| 送货         | `textChunkLimit`, `streaming.chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `reactionLevel`                     |
| 多账户    | `accounts.<id>.enabled`, `accounts.<id>.authDir`，以及其他按账户配置的覆盖项                              |
| 操作       | `configWrites`, `enabled`                                                                                      |
| 入站批处理 | `messages.inbound.debounceMs`, `messages.inbound.byChannel.whatsapp`                                           |
| 确认  | `messages.ackReaction`, `messages.ackReactionScope`                                                            |
| 会话行为 | `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`                                   |
| 提示词          | `groups.<id>.systemPrompt`, `groups["*"].systemPrompt`, `direct.<id>.systemPrompt`, `direct["*"].systemPrompt` |

## <a id="related"></a> 相关内容

- [配对](/channels/pairing)
- [群组](/channels/groups)
- [安全](/gateway/security)
- [频道路由](/channels/channel-routing)
- [反应](/tools/reactions)
- [多代理路由](/concepts/multi-agent)
- [故障排除](/channels/troubleshooting)
