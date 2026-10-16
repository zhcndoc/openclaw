---
summary: "Google Chat、Slack、Mattermost 和 Microsoft Teams 的每通道配置键"
read_when:
  - "配置 Google Chat、Slack、Mattermost 或 Microsoft Teams"
  - "设置 Slack 令牌、线程范围、流或执行批准"
  - "启用 Mattermost 本机斜杠命令"
title: "配置——工作场所聊天频道"
---

`channels.*` 工作场所聊天频道密钥：Google Chat、Slack、Mattermost 和 Microsoft Teams。

## Google Chat

```json5
{
  channels: {
    googlechat: {
      enabled: true,
      serviceAccountFile: "/path/to/service-account.json",
      audienceType: "app-url", // app-url | project-number
      audience: "https://gateway.example.com/googlechat",
      webhookPath: "/googlechat",
      botUser: "users/1234567890",
      dmPolicy: "pairing",
      allowFrom: ["users/1234567890"],
      groupPolicy: "allowlist",
      groups: {
        "spaces/AAAA": { enabled: true, requireMention: true },
      },
      typingIndicator: "message",
      mediaMaxMb: 20,
    },
  },
}
```

- 服务账号 JSON：内联（`serviceAccount`）或基于文件（`serviceAccountFile`）。
- `serviceAccount` 可直接接受 SecretRef。
- 环境变量回退：`GOOGLE_CHAT_SERVICE_ACCOUNT` 或 `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE`（仅限默认账号）。
- 使用 `spaces/<spaceId>` 或 `users/<userId>` 作为投递目标。
- `channels.googlechat.dangerouslyAllowNameMatching` 重新启用可变的电子邮件主体匹配（紧急兼容模式）。

## Slack

```json5
{
  channels: {
    slack: {
      enabled: true,
      botToken: "xoxb-...",
      appToken: "xapp-...",
      dmPolicy: "pairing",
      allowFrom: ["U123", "U456", "*"],
      dm: { enabled: true, groupEnabled: false, groupChannels: ["G123"] },
      channels: {
        C123: { enabled: true, requireMention: true },
        C456: {
          enabled: true,
          requireMention: true,
          allowBots: false,
          users: ["U123"],
          skills: ["docs"],
          systemPrompt: "Short answers only.",
        },
      },
      historyLimit: 50,
      allowBots: true,
      reactionNotifications: "own",
      reactionAllowlist: ["U123"],
      replyToMode: "off", // off | first | all | batched
      thread: {
        historyScope: "thread", // thread | channel
        inheritParent: false,
        initialHistoryLimit: 20,
      },
      actions: {
        reactions: true,
        messages: true,
        pins: true,
        memberInfo: true,
        emojiList: true,
      },
      slashCommand: {
        enabled: true,
        name: "openclaw",
        sessionPrefix: "slack:slash",
        ephemeral: true,
      },
      typingReaction: "hourglass_flowing_sand",
      unfurlLinks: false,
      unfurlMedia: false,
      textChunkLimit: 4000,
      streaming: {
        mode: "partial", // off | partial | block | progress
        chunkMode: "length", // length | newline
        nativeTransport: true, // use Slack native streaming API when mode=partial
      },
      mediaMaxMb: 20,
      execApprovals: {
        enabled: "auto", // true | false | "auto"
        approvers: ["U123"],
        agentFilter: ["default"],
        sessionFilter: ["slack:"],
        target: "dm", // dm | channel | both
      },
    },
  },
}
```

- **Socket 模式**要求同时提供 `botToken` 和 `appToken`（默认账号环境变量回退使用 `SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN`）。
- **HTTP 模式**要求提供 `botToken` 以及 `signingSecret`（在根级别或每个账号中）。
- `allowBots` 默认为 `true`，控制其他机器人是否可以触发回合。显式 `false` 仍然是选择退出；房间设置覆盖帐户和根设置。正常访问、提及、机器人房间授权、自我消息过滤和 [ 机器人循环保护 ](/channels/bot-loop-protection) 仍然适用。机器人编写的历史记录和线程上下文仍受上下文可见性规则的约束，与此标志无关。请参见 [Slack 访问控制](/channels/slack/access-control#access-control-and-routing)。
- `channels.slack.joinIntro` 默认为 `true`。当机器人加入允许的频道时，它会使用频道名称、目的或主题以及可用的最新消息发布一条介绍。将此选项设置为 `false` 以禁用介绍，或使用 `channels.slack.accounts.<accountId>.joinIntro` 进行特定于账户的覆盖。每个频道最多可读取 100 条最近消息；参见[群加入介绍](/channels#group-join-introductions)。介绍永远不会在私信中出现。
- **用户身份** （`postAs: "user"`） 作为授权人发布和读取。在套接字模式下需要 `userToken` 加 `appToken`，或者在 HTTP 模式下需要 `userToken` 加 `signingSecret`。不需要机器人令牌或机器人用户。有关用户范围和事件订阅，请参阅 [ 用户身份](/channels/slack/setup#user-identity-post-as-a-real-person)。
- Slack 使用 `auth.test` 自动从机器人令牌检测 Enterprise Grid 组织范围内的安装；不需要安装模式设置。企业 DM 支持 `disabled`、`open`、`allowlist` 和工作区范围的 `pairing`。渠道策略需要 `team:<team-id>:channel:<channel-id>`。用户策略接受工作区范围的组织范围稳定用户 ID 或 `team:<team-id>:user:<user-id>`。可变名称和不受支持的通道前缀启动失败。提及模式通道范围和静态路由绑定对等体使用工作区限定的 Slack 目标。支持直接套接字模式或 HTTP 消息、提及、工作区限定操作、延迟交付、主动发送、支持的事件侦听器和交互、静态路由绑定以及来自工作区限定回合的 Slack-native 批准。中继、通道 ID-change 事件、应用程序主页、代理和助理生命周期事件、配置的 ACP 绑定以及运行时当前对话绑定仍然不可用。请参阅 [Enterprise Grid 组织范围内的安装 ](/channels/slack/enterprise-grid#enterprise-grid-org-wide-installs) 了解最低权限清单、设置工作流程和完整限制。
- 已废弃的 `enterpriseOrgInstall` 键会由 `openclaw doctor --fix` 在 Slack 根级别和账号级别移除。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受明文字符串或 SecretRef 对象。
- Slack 帐户快照公开每个凭证的 source/status 字段，例如 `botTokenSource`、`botTokenStatus`、`userTokenSource`、`userTokenStatus`、`appTokenStatus`，并且HTTP模式，`signingSecretStatus`。 `configured_unavailable` 表示该帐户是通过 SecretRef 配置的，但当前 command/runtime 路径无法解析秘密值。
- `configWrites: false` 阻止 Slack- 发起的配置写入。
- 可选的 `channels.slack.defaultAccount` 会在匹配已配置账号 id 时覆盖默认账号选择。
- `dm.groupEnabled` 和 `dm.groupChannels` 仅过滤应用已是其成员的 Slack 组 DM （MPDM）。他们无法使应用程序看到它从未加入的现有组 DM；将群组 DM 转换为私人频道并邀请应用程序，或者让应用程序使用 `conversations.open` 打开新的 MPDM。请参阅 [Group DM （MPDM） 和机器人 ](/channels/slack/access-control#group-dms-mpdms-and-bots)。
- `channels.slack.streaming.mode` 是当前 Slack 流模式密钥（默认 `"progress"`）。 `channels.slack.streaming.nativeTransport` 控制 Slack 的本机流传输（默认 `true`）。运行时不再读取旧版 `streamMode`、布尔值 `streaming`、`chunkMode`、`blockStreaming`、`blockStreamingCoalesce` 和 `nativeStreaming` 值；运行 `openclaw doctor --fix` 将持久配置迁移到 `streaming.{mode,chunkMode,block.enabled,block.coalesce,nativeTransport}`。
- `unfurlLinks` 和 `unfurlMedia` 会将 Slack `chat.postMessage` 的链接和媒体展开布尔值传递给机器人回复。`unfurlLinks` 默认为 `false`，因此出站机器人链接不会展开显示，除非启用；除非进行配置，否则不会设置 `unfurlMedia`。在 `channels.slack.accounts.<accountId>` 设置任一值，即可覆盖某个账号的顶层值。
- 使用 `user:<id>` （DM） 或 `channel:<id>` 作为交付目标。

**反应通知模式：** `off`、`own`（默认）、`all`、`allowlist`（来自`reactionAllowlist`）。

**线程会话隔离：** `thread.historyScope` 可按线程隔离（默认）或跨频道共享。`thread.inheritParent` 会将父频道转录复制到新线程。`thread.initialHistoryLimit`（默认 `20`）限制新线程会话开始时拉取多少条已有线程消息；`0` 会禁用线程历史拉取。

- Slack 本机流式传输加上 Slack 助手式“is typing...”线程状态需要回复线程目标。默认`progress`转无回复帖，包括普通的顶级DM，仅发布最终答案。设置 `streaming.progress.style`、设置 `streaming.progress.toolProgress` 或设置 `streaming.progress.nativeTaskCards: false` 选择预览。线程转动、代理视图、助理视图和显式 `off`/`partial`/`block` 模式保留其行为。请参阅 [Slack 消息行为](/channels/slack/messaging#text-streaming)。
- `typingReaction` 在回复运行时向入站 Slack 消息添加临时反应，然后在完成后将其删除。默认为 `"hourglass_flowing_sand"`，用于安静的顶级进度转弯；配置的短代码会覆盖它，并且 `""` 会禁用它。
- `channels.slack.execApprovals`：Slack-native审批-客户端交付并执行审批人授权。与 Discord 相同的架构：`enabled` （`true`/`false`/`"auto"`）、`approvers` （Slack 用户 ID）、`agentFilter`、`sessionFilter` 和 `target` （`"dm"`， `"channel"` 或 `"both"`）。当 Slack 插件审批者解析时，插件审批可以使用此本机客户端路径进行 Slack-origin 请求；还可以通过 Slack-origin 会话或 Slack 目标的 `approvals.plugin` 启用 Slack-native 插件审批交付。插件审批在设置时使用 `approvals.plugin.slack` 审阅者列表，当省略默认列表时，回退到 Slack 帐户 `allowFrom` 和默认路由。他们不使用执行批准者。
- 有效的非空 `approvals.plugin.slack` 审阅者列表使本机 Slack 插件批准交付独立于 `channels.slack.execApprovals` 和插件转发。

| 行动组 | 默认值 | 笔记                  |
| ------------ | ------- | ---------------------- |
| 反应    | 已启用 | 添加 reaction + 列出 reactions |
| 消息     | 已启用 | Read/send/edit/delete  |
| 针脚         | 已启用 | Pin/unpin/list         |
| 会员信息   | 已启用 | 成员信息            |
| 表情符号列表    | 已启用 | 列出自定义表情符号      |

## Mattermost

Mattermost 以单独插件的形式安装，方式与 Discord、Slack 和 WhatsApp 相同：

```bash
openclaw plugins install @openclaw/mattermost
```

在固定版本之前，请查看 [npmjs.com/package/@openclaw/mattermost](https://www.npmjs.com/package/@openclaw/mattermost) 了解当前的 dist-tags。

```json5
{
  channels: {
    mattermost: {
      enabled: true,
      botToken: "mm-token",
      baseUrl: "https://chat.example.com",
      dmPolicy: "pairing",
      chatmode: "oncall", // oncall | onmessage | onchar
      oncharPrefixes: [">", "!"],
      groups: {
        "*": { requireMention: true },
        "team-channel-id": { requireMention: false },
      },
      commands: {
        native: true, // opt-in
        nativeSkills: true,
        callbackPath: "/api/channels/mattermost/command",
        // Optional explicit URL for reverse-proxy/public deployments
        callbackUrl: "https://gateway.example.com/api/channels/mattermost/command",
      },
      textChunkLimit: 4000,
      streaming: { chunkMode: "length" },
    },
  },
}
```

聊天模式：`oncall`（在 @-mention 时响应，默认）、`onmessage`（每条消息）、`onchar`（以触发前缀开头的消息）。

启用 Mattermost 原生命令时：

- `commands.callbackPath` 必须是路径（例如 `/api/channels/mattermost/command`），不能是完整 URL。
- `commands.callbackUrl` 必须解析到 OpenClaw gateway 端点，并且 Mattermost 服务器可以访问。
- 原生 slash 回调使用 Mattermost 在 slash command 注册期间返回的每命令 token 进行认证。如果注册失败或没有激活任何命令，OpenClaw 会以 `Unauthorized: invalid command token.` 拒绝回调。
- 对于 private/tailnet/internal 回调主机，Mattermost 可能要求 `ServiceSettings.AllowedUntrustedInternalConnections` 包含回调 host/domain. 使用 host/domain 值，而不是完整 URL。
- `channels.mattermost.configWrites`：允许或拒绝 Mattermost- 发起的配置写入。
- `channels.mattermost.requireMention`：在频道中回复前是否需要 `@mention`。
- `channels.mattermost.groups.<channelId>.requireMention`：每频道 mention 门控覆盖（默认使用 `"*"`）。
- 可选的 `channels.mattermost.defaultAccount` 会在其与已配置账号 id 匹配时覆盖默认账号选择。

## Microsoft Teams

Microsoft Teams 由插件支持，并在 `channels.msteams` 下配置。

```json5
{
  channels: {
    msteams: {
      enabled: true,
      configWrites: true,
      // appId, appPassword, tenantId, webhook, accounts, team/channel policies:
      // see /channels/msteams
    },
  },
}
```

- 此处介绍的核心关键路径：`channels.msteams`、`channels.msteams.configWrites`、`channels.msteams.accounts` 和 `channels.msteams.defaultAccount`。
- 完整的 Teams 配置（凭据、Webhook、DM/group 策略、多个机器人帐户和每个 team/per-channel 覆盖）记录在 [Microsoft Teams](/channels/msteams) 中。
