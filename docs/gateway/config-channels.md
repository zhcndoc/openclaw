---
summary: "频道配置：访问控制、配对、跨 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 等的按频道密钥"
read_when:
  - 配置频道插件（认证、访问控制、多账号）
  - 排查按频道配置键
  - 审核 DM 策略、群组策略或提及门控
title: "配置 — 频道"
---

`channels.*` 下的按频道配置键。涵盖 DM 和群组访问、
多账号设置、提及门控，以及 Slack、Discord、
Telegram、WhatsApp、Matrix、iMessage 和其他内置频道插件的按频道密钥。

对于 agents、tools、gateway runtime 以及其他顶层键，请参阅
[配置参考](/gateway/configuration-reference)。

## 频道

只要其配置段存在，每个频道都会自动启动（除非 `enabled: false`）。

### DM 和群组访问

所有频道都支持 DM 策略和群组策略：

| DM 策略              | 行为                                                   |
| --------------------- | ------------------------------------------------------ |
| `pairing`（默认）     | 未知发送者会获得一次性配对码；所有者必须批准          |
| `allowlist`           | 仅允许 `allowFrom` 中的发送者（或已配对的允许存储）   |
| `open`                | 允许所有入站 DM（需要 `allowFrom: ["*"]`）           |
| `disabled`            | 忽略所有入站 DM                                        |

| 群组策略              | 行为                                               |
| --------------------- | -------------------------------------------------- |
| `allowlist`（默认）   | 仅允许匹配已配置允许列表的群组                    |
| `open`                | 绕过群组允许列表（提及门控仍然适用）              |
| `disabled`            | 阻止所有群组/房间消息                              |

<Note>
`channels.defaults.groupPolicy` 在提供方的 `groupPolicy` 未设置时设置默认值。
配对码在 1 小时后过期。待处理的 DM 配对请求上限为 **每个频道 3 个**。
如果提供方块完全缺失（`channels.<provider>` 不存在），运行时群组策略会回退到 `allowlist`（fail-closed），并给出启动警告。
</Note>

### 频道模型覆盖

使用 `channels.modelByChannel` 将特定频道 ID 固定到某个模型。值可以接受 `provider/model` 或已配置的模型别名。当会话尚未拥有模型覆盖时（例如通过 `/model` 设置），会应用频道映射。

```json5
{
  channels: {
    modelByChannel: {
      discord: {
        "123456789012345678": "anthropic/claude-opus-4-6",
      },
      slack: {
        C1234567890: "openai/gpt-4.1",
      },
      telegram: {
        "-1001234567890": "openai/gpt-4.1-mini",
        "-1001234567890:topic:99": "anthropic/claude-sonnet-4-6",
      },
    },
  },
}
```

### 频道默认值和心跳

使用 `channels.defaults` 为各提供方共享群组策略和心跳行为：

```json5
{
  channels: {
    defaults: {
      groupPolicy: "allowlist", // open | allowlist | disabled
      contextVisibility: "all", // all | allowlist | allowlist_quote
      heartbeat: {
        showOk: false,
        showAlerts: true,
        useIndicator: true,
      },
    },
  },
}
```

- `channels.defaults.groupPolicy`：当提供方级 `groupPolicy` 未设置时的回退群组策略。
- `channels.defaults.contextVisibility`：所有频道的默认补充上下文可见性模式。取值：`all`（默认，包含所有引用/线程/历史上下文）、`allowlist`（仅包含来自允许列表发送者的上下文）、`allowlist_quote`（同 allowlist，但保留显式引用/回复上下文）。按频道覆盖：`channels.<channel>.contextVisibility`。
- `channels.defaults.heartbeat.showOk`：在心跳输出中包含健康的频道状态。
- `channels.defaults.heartbeat.showAlerts`：在心跳输出中包含降级/错误状态。
- `channels.defaults.heartbeat.useIndicator`：渲染紧凑的指示器样式心跳输出。

### WhatsApp

WhatsApp 通过网关的 web 频道（Baileys Web）运行。只要存在已链接会话，就会自动启动。

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "pairing", // pairing | allowlist | open | disabled
      allowFrom: ["+15555550123", "+447700900123"],
      textChunkLimit: 4000,
      chunkMode: "length", // length | newline
      mediaMaxMb: 50,
      sendReadReceipts: true, // 蓝色对勾（自聊模式下为 false）
      groups: {
        "*": { requireMention: true },
      },
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
    },
  },
  web: {
    enabled: true,
    heartbeatSeconds: 60,
    reconnect: {
      initialMs: 2000,
      maxMs: 120000,
      factor: 1.4,
      jitter: 0.2,
      maxAttempts: 0,
    },
  },
}
```

<Accordion title="多账号 WhatsApp">

```json5
{
  channels: {
    whatsapp: {
      accounts: {
        default: {},
        personal: {},
        biz: {
          // authDir: "~/.openclaw/credentials/whatsapp/biz",
        },
      },
    },
  },
}
```

- 若存在账号 `default`，出站命令默认使用该账号；否则使用按排序后的第一个已配置账号 id。
- 可选的 `channels.whatsapp.defaultAccount` 会在其与已配置账号 id 匹配时覆盖该回退默认账号选择。
- 旧的单账号 Baileys auth dir 会被 `openclaw doctor` 迁移到 `whatsapp/default`。
- 按账号覆盖：`channels.whatsapp.accounts.<id>.sendReadReceipts`、`channels.whatsapp.accounts.<id>.dmPolicy`、`channels.whatsapp.accounts.<id>.allowFrom`。

</Accordion>

### Telegram

```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "your-bot-token",
      dmPolicy: "pairing",
      allowFrom: ["tg:123456789"],
      groups: {
        "*": { requireMention: true },
        "-1001234567890": {
          allowFrom: ["@admin"],
          systemPrompt: "Keep answers brief.",
          topics: {
            "99": {
              requireMention: false,
              skills: ["search"],
              systemPrompt: "Stay on topic.",
            },
          },
        },
      },
      customCommands: [
        { command: "backup", description: "Git 备份" },
        { command: "generate", description: "创建图片" },
      ],
      historyLimit: 50,
      replyToMode: "first", // off | first | all | batched
      linkPreview: true,
      streaming: "partial", // off | partial | block | progress（默认：off；请显式启用以避免预览编辑速率限制）
      actions: { reactions: true, sendMessage: true },
      reactionNotifications: "own", // off | own | all
      mediaMaxMb: 100,
      retry: {
        attempts: 3,
        minDelayMs: 400,
        maxDelayMs: 30000,
        jitter: 0.1,
      },
      network: {
        autoSelectFamily: true,
        dnsResultOrder: "ipv4first",
      },
      proxy: "socks5://localhost:9050",
      webhookUrl: "https://example.com/telegram-webhook",
      webhookSecret: "secret",
      webhookPath: "/telegram-webhook",
    },
  },
}
```

- Bot token：`channels.telegram.botToken` 或 `channels.telegram.tokenFile`（仅允许普通文件；拒绝符号链接），默认账号可回退使用 `TELEGRAM_BOT_TOKEN`。
- 可选的 `channels.telegram.defaultAccount` 会在其与已配置账号 id 匹配时覆盖默认账号选择。
- 在多账号设置（2+ 个账号 id）中，设置明确的默认值（`channels.telegram.defaultAccount` 或 `channels.telegram.accounts.default`）以避免回退路由；缺失或无效时 `openclaw doctor` 会发出警告。
- `configWrites: false` 会阻止 Telegram 触发的配置写入（超级群组 ID 迁移、`/config set|unset`）。
- 顶层 `bindings[]` 中 `type: "acp"` 的条目会为论坛主题配置持久化 ACP 绑定（在 `match.peer.id` 中使用规范化的 `chatId:topic:topicId`）。字段语义见 [ACP Agents](/tools/acp-agents#channel-specific-settings)。
- Telegram 流式预览使用 `sendMessage` + `editMessageText`（在私聊和群聊中均有效）。
- 重试策略：参见 [重试策略](/concepts/retry)。

### Discord

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "your-bot-token",
      mediaMaxMb: 100,
      allowBots: false,
      actions: {
        reactions: true,
        stickers: true,
        polls: true,
        permissions: true,
        messages: true,
        threads: true,
        pins: true,
        search: true,
        memberInfo: true,
        roleInfo: true,
        roles: false,
        channelInfo: true,
        voiceStatus: true,
        events: true,
        moderation: false,
      },
      replyToMode: "off", // off | first | all | batched
      dmPolicy: "pairing",
      allowFrom: ["1234567890", "123456789012345678"],
      dm: { enabled: true, groupEnabled: false, groupChannels: ["openclaw-dm"] },
      guilds: {
        "123456789012345678": {
          slug: "friends-of-openclaw",
          requireMention: false,
          ignoreOtherMentions: true,
          reactionNotifications: "own",
          users: ["987654321098765432"],
          channels: {
            general: { allow: true },
            help: {
              allow: true,
              requireMention: true,
              users: ["987654321098765432"],
              skills: ["docs"],
              systemPrompt: "只允许简短回答。",
            },
          },
        },
      },
      historyLimit: 20,
      textChunkLimit: 2000,
      chunkMode: "length", // length | newline
      streaming: "off", // off | partial | block | progress（progress 在 Discord 上映射为 partial）
      maxLinesPerMessage: 17,
      ui: {
        components: {
          accentColor: "#5865F2",
        },
      },
      threadBindings: {
        enabled: true,
        idleHours: 24,
        maxAgeHours: 0,
        spawnSubagentSessions: false, // 为 sessions_spawn({ thread: true }) 显式启用
      },
      voice: {
        enabled: true,
        autoJoin: [
          {
            guildId: "123456789012345678",
            channelId: "234567890123456789",
          },
        ],
        daveEncryption: true,
        decryptionFailureTolerance: 24,
        tts: {
          provider: "openai",
          openai: { voice: "alloy" },
        },
      },
      execApprovals: {
        enabled: "auto", // true | false | "auto"
        approvers: ["987654321098765432"],
        agentFilter: ["default"],
        sessionFilter: ["discord:"],
        target: "dm", // dm | channel | both
        cleanupAfterResolve: false,
      },
      retry: {
        attempts: 3,
        minDelayMs: 500,
        maxDelayMs: 30000,
        jitter: 0.1,
      },
    },
  },
}
```

- Token：`channels.discord.token`，默认账号可回退使用 `DISCORD_BOT_TOKEN`。
- 提供显式 Discord `token` 的直接出站调用会使用该 token 执行该调用；账号重试/策略设置仍来自活动运行时快照中选定的账号。
- 可选的 `channels.discord.defaultAccount` 会在其与已配置账号 id 匹配时覆盖默认账号选择。
- 使用 `user:<id>`（DM）或 `channel:<id>`（群组频道）作为投递目标；裸数字 ID 会被拒绝。
- guild slug 采用小写并将空格替换为 `-`；频道键使用 slug 化名称（不带 `#`）。优先使用 guild ID。
- 默认忽略 bot 发出的消息。`allowBots: true` 可启用；使用 `allowBots: "mentions"` 仅接受提及 bot 的 bot 消息（仍会过滤自身消息）。
- `channels.discord.guilds.<id>.ignoreOtherMentions`（以及频道覆盖）会丢弃那些提及了其他用户或角色但没有提及 bot 的消息（不包括 @everyone/@here）。
- `maxLinesPerMessage`（默认 17）会在字符数未超过 2000 时也拆分较长消息。
- `channels.discord.threadBindings` 控制 Discord 线程绑定路由：
  - `enabled`：线程绑定会话功能的 Discord 覆盖（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 以及绑定投递/路由）
  - `idleHours`：按小时计算的不活动自动取消聚焦的 Discord 覆盖（`0` 禁用）
  - `maxAgeHours`：按小时计算的硬性最大时长的 Discord 覆盖（`0` 禁用）
  - `spawnSubagentSessions`：为 `sessions_spawn({ thread: true })` 自动创建/绑定线程的显式启用开关
- 顶层 `bindings[]` 中 `type: "acp"` 的条目会为频道和线程配置持久化 ACP 绑定（在 `match.peer.id` 中使用 channel/thread id）。字段语义见 [ACP Agents](/tools/acp-agents#channel-specific-settings)。
- `channels.discord.ui.components.accentColor` 为 Discord components v2 容器设置强调色。
- `channels.discord.voice` 启用 Discord 语音频道对话以及可选的自动加入 + TTS 覆盖。
- `channels.discord.voice.daveEncryption` 和 `channels.discord.voice.decryptionFailureTolerance` 会透传到 `@discordjs/voice` DAVE 选项（默认分别为 `true` 和 `24`）。
- OpenClaw 还会在重复解密失败后通过离开/重新加入语音会话来尝试语音接收恢复。
- `channels.discord.streaming` 是规范的流式模式键。旧的 `streamMode` 和布尔型 `streaming` 值会自动迁移。
- `channels.discord.autoPresence` 将运行时可用性映射到 bot 状态（healthy => online，degraded => idle，exhausted => dnd），并允许可选的状态文本覆盖。
- `channels.discord.dangerouslyAllowNameMatching` 重新启用可变名称/标签匹配（破窗兼容模式）。
- `channels.discord.execApprovals`：Discord 原生执行审批投递与审批者授权。
  - `enabled`：`true`、`false` 或 `"auto"`（默认）。在 auto 模式下，当可从 `approvers` 或 `commands.ownerAllowFrom` 解析出审批者时，执行审批会激活。
  - `approvers`：允许批准执行请求的 Discord 用户 ID。若省略，则回退到 `commands.ownerAllowFrom`。
  - `agentFilter`：可选的 agent ID 允许列表。省略则转发所有 agent 的审批。
  - `sessionFilter`：可选的会话键模式（子串或正则）。
  - `target`：审批提示发送位置。`"dm"`（默认）发送到审批者 DM，`"channel"` 发送到发起频道，`"both"` 两者都发送。当 target 包含 `"channel"` 时，按钮仅对已解析的审批者可用。
  - `cleanupAfterResolve`：当为 `true` 时，在批准、拒绝或超时后删除审批 DM。

**反应通知模式：** `off`（无）、`own`（bot 自己的消息，默认）、`all`（所有消息）、`allowlist`（来自 `guilds.<id>.users` 的所有消息）。

### Google Chat

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
      dm: {
        enabled: true,
        policy: "pairing",
        allowFrom: ["users/1234567890"],
      },
      groupPolicy: "allowlist",
      groups: {
        "spaces/AAAA": { allow: true, requireMention: true },
      },
      actions: { reactions: true },
      typingIndicator: "message",
      mediaMaxMb: 20,
    },
  },
}
```

- 服务账号 JSON：支持内联（`serviceAccount`）或基于文件（`serviceAccountFile`）。
- 也支持服务账号 SecretRef（`serviceAccountRef`）。
- 环境变量回退：`GOOGLE_CHAT_SERVICE_ACCOUNT` 或 `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE`。
- 投递目标使用 `spaces/<spaceId>` 或 `users/<userId>`。
- `channels.googlechat.dangerouslyAllowNameMatching` 重新启用可变 email principal 匹配（破窗兼容模式）。

### Slack

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
        C123: { allow: true, requireMention: true, allowBots: false },
        "#general": {
          allow: true,
          requireMention: true,
          allowBots: false,
          users: ["U123"],
          skills: ["docs"],
          systemPrompt: "只允许简短回答。",
        },
      },
      historyLimit: 50,
      allowBots: false,
      reactionNotifications: "own",
      reactionAllowlist: ["U123"],
      replyToMode: "off", // off | first | all | batched
      thread: {
        historyScope: "thread", // thread | channel
        inheritParent: false,
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
      textChunkLimit: 4000,
      chunkMode: "length",
      streaming: {
        mode: "partial", // off | partial | block | progress
        nativeTransport: true, // 当 mode=partial 时使用 Slack 原生流式 API
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

- **Socket 模式** 同时需要 `botToken` 和 `appToken`（默认账号环境回退分别为 `SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN`）。
- **HTTP 模式** 需要 `botToken` 加 `signingSecret`（位于 root 或按账号）。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 可接受明文字符串或 SecretRef 对象。
- Slack 账号快照会暴露每个凭据的来源/状态字段，例如 `botTokenSource`、`botTokenStatus`、`appTokenStatus`，以及在 HTTP 模式下的 `signingSecretStatus`。`configured_unavailable` 表示该账号通过 SecretRef 进行了配置，但当前命令/运行时路径无法解析到 secret 值。
- `configWrites: false` 会阻止 Slack 触发的配置写入。
- 可选的 `channels.slack.defaultAccount` 会在其与已配置账号 id 匹配时覆盖默认账号选择。
- `channels.slack.streaming.mode` 是规范的 Slack 流式模式键。`channels.slack.streaming.nativeTransport` 控制 Slack 的原生流式传输。旧的 `streamMode`、布尔型 `streaming` 和 `nativeStreaming` 值会自动迁移。
- 投递目标使用 `user:<id>`（DM）或 `channel:<id>`。

**反应通知模式：** `off`、`own`（默认）、`all`、`allowlist`（来自 `reactionAllowlist`）。

**线程会话隔离：** `thread.historyScope` 为 per-thread（默认）或跨频道共享。`thread.inheritParent` 会将父频道记录复制到新线程。

- Slack 原生流式和 Slack assistant 风格的“正在输入...”线程状态都需要回复线程目标。顶层 DMs 默认不在线程中，因此它们使用 `typingReaction` 或普通投递，而不是线程式预览。
- `typingReaction` 会在回复进行时为入站 Slack 消息添加一个临时反应，完成后移除。使用类似 `"hourglass_flowing_sand"` 的 Slack 表情短代码。
- `channels.slack.execApprovals`：Slack 原生执行审批投递与审批者授权。与 Discord 使用相同 schema：`enabled`（`true`/`false`/`"auto"`）、`approvers`（Slack 用户 ID）、`agentFilter`、`sessionFilter` 和 `target`（`"dm"`、`"channel"` 或 `"both"`）。

| 操作组 | 默认 | 说明                   |
| ------ | ---- | ---------------------- |
| reactions | 已启用 | React + 列出 reactions |
| messages | 已启用 | 读/发/编辑/删除        |
| pins | 已启用 | 固定/取消固定/列出     |
| memberInfo | 已启用 | 成员信息              |
| emojiList | 已启用 | 自定义 emoji 列表     |

### Mattermost

Mattermost 以插件形式提供：`openclaw plugins install @openclaw/mattermost`。

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
        // 反向代理/公共部署的可选显式 URL
        callbackUrl: "https://gateway.example.com/api/channels/mattermost/command",
      },
      textChunkLimit: 4000,
      chunkMode: "length",
    },
  },
}
```

聊天模式：`oncall`（响应 @ 提及，默认）、`onmessage`（每条消息）、`onchar`（以触发前缀开头的消息）。

启用 Mattermost 原生命令时：

- `commands.callbackPath` 必须是路径（例如 `/api/channels/mattermost/command`），不能是完整 URL。
- `commands.callbackUrl` 必须解析到 OpenClaw gateway 端点，并且 Mattermost 服务器可以访问。
- 原生 slash 回调会使用 Mattermost 在 slash command 注册期间返回的按命令 token 进行认证。如果注册失败或没有激活任何命令，OpenClaw 会以 `Unauthorized: invalid command token.` 拒绝回调。
- 对于私有/tailnet/内部回调主机，Mattermost 可能要求 `ServiceSettings.AllowedUntrustedInternalConnections` 包含回调主机/域名。请使用主机/域名值，不要使用完整 URL。
- `channels.mattermost.configWrites`：允许或拒绝 Mattermost 触发的配置写入。
- `channels.mattermost.requireMention`：在频道中回复前需要 `@mention`。
- `channels.mattermost.groups.<channelId>.requireMention`：按频道的提及门控覆盖（`"*"` 表示默认）。
- 可选的 `channels.mattermost.defaultAccount` 会在其与已配置账号 id 匹配时覆盖默认账号选择。

### Signal

```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15555550123", // 可选账号绑定
      dmPolicy: "pairing",
      allowFrom: ["+15551234567", "uuid:123e4567-e89b-12d3-a456-426614174000"],
      configWrites: true,
      reactionNotifications: "own", // off | own | all | allowlist
      reactionAllowlist: ["+15551234567", "uuid:123e4567-e89b-12d3-a456-426614174000"],
      historyLimit: 50,
    },
  },
}
```

**反应通知模式：** `off`、`own`（默认）、`all`、`allowlist`（来自 `reactionAllowlist`）。

- `channels.signal.account`：将频道启动固定到特定的 Signal 账号身份。
- `channels.signal.configWrites`：允许或拒绝 Signal 触发的配置写入。
- 可选的 `channels.signal.defaultAccount` 会在其与已配置账号 id 匹配时覆盖默认账号选择。

### BlueBubbles

BlueBubbles 是推荐的 iMessage 路径（由插件支持，在 `channels.bluebubbles` 下配置）。

```json5
{
  channels: {
    bluebubbles: {
      enabled: true,
      dmPolicy: "pairing",
      // serverUrl、password、webhookPath、群组控制以及高级操作：
      // 见 /channels/bluebubbles
    },
  },
}
```

- 此处覆盖的核心键路径：`channels.bluebubbles`、`channels.bluebubbles.dmPolicy`。
- 可选的 `channels.bluebubbles.defaultAccount` 会在其与已配置账号 id 匹配时覆盖默认账号选择。
- 顶层 `bindings[]` 中 `type: "acp"` 的条目可以将 BlueBubbles 会话绑定到持久化 ACP 会话。在 `match.peer.id` 中使用 BlueBubbles handle 或目标字符串（`chat_id:*`、`chat_guid:*`、`chat_identifier:*`）。共享字段语义： [ACP Agents](/tools/acp-agents#channel-specific-settings)。
- 完整的 BlueBubbles 频道配置记录在 [BlueBubbles](/channels/bluebubbles)。

### iMessage

OpenClaw 会启动 `imsg rpc`（通过 stdio 的 JSON-RPC）。不需要 daemon 或端口。

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "imsg",
      dbPath: "~/Library/Messages/chat.db",
      remoteHost: "user@gateway-host",
      dmPolicy: "pairing",
      allowFrom: ["+15555550123", "user@example.com", "chat_id:123"],
      historyLimit: 50,
      includeAttachments: false,
      attachmentRoots: ["/Users/*/Library/Messages/Attachments"],
      remoteAttachmentRoots: ["/Users/*/Library/Messages/Attachments"],
      mediaMaxMb: 16,
      service: "auto",
      region: "US",
    },
  },
}
```

- 可选的 `channels.imessage.defaultAccount` 会在其与已配置账号 id 匹配时覆盖默认账号选择。

- 需要对 Messages 数据库授予完整磁盘访问权限。
- 优先使用 `chat_id:<id>` 目标。使用 `imsg chats --limit 20` 列出聊天。
- `cliPath` 可以指向 SSH 包装器；设置 `remoteHost`（`host` 或 `user@host`）以通过 SCP 获取附件。
- `attachmentRoots` 和 `remoteAttachmentRoots` 限制入站附件路径（默认：`/Users/*/Library/Messages/Attachments`）。
- SCP 使用严格的主机密钥检查，因此请确保中继主机密钥已存在于 `~/.ssh/known_hosts` 中。
- `channels.imessage.configWrites`：允许或拒绝 iMessage 触发的配置写入。
- 顶层 `bindings[]` 中 `type: "acp"` 的条目可以将 iMessage 会话绑定到持久化 ACP 会话。在 `match.peer.id` 中使用规范化 handle 或显式聊天目标（`chat_id:*`、`chat_guid:*`、`chat_identifier:*`）。共享字段语义： [ACP Agents](/tools/acp-agents#channel-specific-settings)。

<Accordion title="iMessage SSH 包装器示例">

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

</Accordion>

### Matrix

Matrix 由插件支持，并在 `channels.matrix` 下配置。

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_bot_xxx",
      proxy: "http://127.0.0.1:7890",
      encryption: true,
      initialSyncLimit: 20,
      defaultAccount: "ops",
      accounts: {
        ops: {
          name: "Ops",
          userId: "@ops:example.org",
          accessToken: "syt_ops_xxx",
        },
        alerts: {
          userId: "@alerts:example.org",
          password: "secret",
          proxy: "http://127.0.0.1:7891",
        },
      },
    },
  },
}
```

- Token 认证使用 `accessToken`；密码认证使用 `userId` + `password`。
- `channels.matrix.proxy` 将 Matrix HTTP 流量通过显式 HTTP(S) 代理路由。命名账号可以通过 `channels.matrix.accounts.<id>.proxy` 覆盖它。
- `channels.matrix.network.dangerouslyAllowPrivateNetwork` 允许私有/内部 homeserver。`proxy` 与此网络显式启用是彼此独立的控制项。
- `channels.matrix.defaultAccount` 在多账号设置中选择首选账号。
- `channels.matrix.autoJoin` 默认是 `off`，因此被邀请的房间和新鲜的 DM 式邀请会被忽略，直到你将 `autoJoin: "allowlist"` 与 `autoJoinAllowlist` 一起设置，或使用 `autoJoin: "always"`。
- `channels.matrix.execApprovals`：Matrix 原生执行审批投递与审批者授权。
  - `enabled`：`true`、`false` 或 `"auto"`（默认）。在 auto 模式下，当可从 `approvers` 或 `commands.ownerAllowFrom` 解析出审批者时，执行审批会激活。
  - `approvers`：允许批准执行请求的 Matrix 用户 ID（例如 `@owner:example.org`）。
  - `agentFilter`：可选的 agent ID 允许列表。省略则转发所有 agent 的审批。
  - `sessionFilter`：可选的会话键模式（子串或正则）。
  - `target`：审批提示发送位置。`"dm"`（默认）、`"channel"`（发起房间）或 `"both"`。
  - 按账号覆盖：`channels.matrix.accounts.<id>.execApprovals`。
- `channels.matrix.dm.sessionScope` 控制 Matrix DM 如何分组为会话：`per-user`（默认）按路由后的对端共享，而 `per-room` 会隔离每个 DM 房间。
- Matrix 状态探测和在线目录查询使用与运行时流量相同的代理策略。
- 完整的 Matrix 配置、目标规则和设置示例记录在 [Matrix](/channels/matrix)。

### Microsoft Teams

Microsoft Teams 由插件支持，并在 `channels.msteams` 下配置。

```json5
{
  channels: {
    msteams: {
      enabled: true,
      configWrites: true,
      // appId、appPassword、tenantId、webhook、团队/频道策略：
      // 见 /channels/msteams
    },
  },
}
```

- 此处覆盖的核心键路径：`channels.msteams`、`channels.msteams.configWrites`。
- 完整的 Teams 配置（凭据、webhook、DM/群组策略、按团队/按频道覆盖）记录在 [Microsoft Teams](/channels/msteams)。

### IRC

IRC 由插件支持，并在 `channels.irc` 下配置。

```json5
{
  channels: {
    irc: {
      enabled: true,
      dmPolicy: "pairing",
      configWrites: true,
      nickserv: {
        enabled: true,
        service: "NickServ",
        password: "${IRC_NICKSERV_PASSWORD}",
        register: false,
        registerEmail: "bot@example.com",
      },
    },
  },
}
```

- 此处覆盖的核心键路径：`channels.irc`、`channels.irc.dmPolicy`、`channels.irc.configWrites`、`channels.irc.nickserv.*`。
- 可选的 `channels.irc.defaultAccount` 会在其与已配置账号 id 匹配时覆盖默认账号选择。
- 完整的 IRC 频道配置（host/port/TLS/channels/allowlists/mention gating）记录在 [IRC](/channels/irc)。

### 多账号（所有频道）

为每个频道运行多个账号（每个都有自己的 `accountId`）：

```json5
{
  channels: {
    telegram: {
      accounts: {
        default: {
          name: "主机器人",
          botToken: "123456:ABC...",
        },
        alerts: {
          name: "告警机器人",
          botToken: "987654:XYZ...",
        },
      },
    },
  },
}
```

- 当省略 `accountId` 时使用 `default`（CLI + 路由）。
- 环境变量 token 只适用于**默认**账号。
- 基础频道设置适用于所有账号，除非按账号覆盖。
- 使用 `bindings[].match.accountId` 将每个账号路由到不同的 agent。
- 如果你通过 `openclaw channels add`（或频道引导）添加一个非默认账号，而顶层频道配置仍是单账号形态，OpenClaw 会先将账号范围的顶层单账号值提升到频道账号映射中，这样原始账号仍可继续工作。大多数频道会将它们移动到 `channels.<channel>.accounts.default`；Matrix 可以改为保留现有匹配的命名/默认目标。
- 现有的仅频道绑定（无 `accountId`）会继续匹配默认账号；账号范围绑定仍然是可选的。
- `openclaw doctor --fix` 也会通过将账号范围的顶层单账号值移动到为该频道选择的提升账号来修复混合形状。大多数频道使用 `accounts.default`；Matrix 可以改为保留现有匹配的命名/默认目标。

### 其他插件频道

许多插件频道配置为 `channels.<id>`，并在其专用频道页面中记录（例如 Feishu、Matrix、LINE、Nostr、Zalo、Nextcloud Talk、Synology Chat 和 Twitch）。
查看完整频道索引：[Channels](/channels)。

### 群聊提及门控

群组消息默认**需要提及**（元数据提及或安全的正则模式）。适用于 WhatsApp、Telegram、Discord、Google Chat 和 iMessage 群聊。

**提及类型：**

- **元数据提及**：原生平台 @-提及。在 WhatsApp 自聊模式下忽略。
- **文本模式**：`agents.list[].groupChat.mentionPatterns` 中的安全正则模式。无效模式和不安全的嵌套重复会被忽略。
- 仅在能够检测时才强制提及门控（原生提及或至少一个模式）。

```json5
{
  messages: {
    groupChat: { historyLimit: 50 },
  },
  agents: {
    list: [{ id: "main", groupChat: { mentionPatterns: ["@openclaw", "openclaw"] } }],
  },
}
```

`messages.groupChat.historyLimit` 设置全局默认值。频道可以通过 `channels.<channel>.historyLimit`（或按账号）覆盖。设为 `0` 可禁用。

#### DM 历史限制

```json5
{
  channels: {
    telegram: {
      dmHistoryLimit: 30,
      dms: {
        "123456789": { historyLimit: 50 },
      },
    },
  },
}
```

解析顺序：按 DM 覆盖 → 提供方默认值 → 不限制（全部保留）。

支持：`telegram`、`whatsapp`、`discord`、`slack`、`signal`、`imessage`、`msteams`。

#### 自聊模式

在 `allowFrom` 中包含你自己的号码即可启用自聊模式（忽略原生 @-提及，只响应文本模式）：

```json5
{
  channels: {
    whatsapp: {
      allowFrom: ["+15555550123"],
      groups: { "*": { requireMention: true } },
    },
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: { mentionPatterns: ["reisponde", "@openclaw"] },
      },
    ],
  },
}
```

### Commands（聊天命令处理）

```json5
{
  commands: {
    native: "auto", // 在支持时注册原生命令
    nativeSkills: "auto", // 在支持时注册原生技能命令
    text: true, // 解析聊天消息中的 /commands
    bash: false, // 允许 !（别名：/bash）
    bashForegroundMs: 2000,
    config: false, // 允许 /config
    mcp: false, // 允许 /mcp
    plugins: false, // 允许 /plugins
    debug: false, // 允许 /debug
    restart: true, // 允许 /restart + gateway 重启工具
    ownerAllowFrom: ["discord:123456789012345678"],
    ownerDisplay: "raw", // raw | hash
    ownerDisplaySecret: "${OWNER_ID_HASH_SECRET}",
    allowFrom: {
      "*": ["user1"],
      discord: ["user:123"],
    },
    useAccessGroups: true,
  },
}
```

<Accordion title="命令详情">

- 此块配置命令界面。当前内置 + 捆绑命令目录请参阅 [Slash Commands](/tools/slash-commands)。
- 此页面是**配置键参考**，不是完整命令目录。频道/插件拥有的命令，例如 QQ Bot 的 `/bot-ping` `/bot-help` `/bot-logs`、LINE 的 `/card`、设备配对 `/pair`、memory 的 `/dreaming`、phone-control 的 `/phone` 以及 Talk 的 `/voice`，都记录在其频道/插件页面以及 [Slash Commands](/tools/slash-commands) 中。
- 文本命令必须是带前导 `/` 的**独立**消息。
- `native: "auto"` 会为 Discord/Telegram 开启原生命令，对 Slack 保持关闭。
- `nativeSkills: "auto"` 会为 Discord/Telegram 开启原生技能命令，对 Slack 保持关闭。
- 按频道覆盖：`channels.discord.commands.native`（bool 或 `"auto"`）。`false` 会清除之前注册的命令。
- 通过 `channels.<provider>.commands.nativeSkills` 按频道覆盖原生技能注册。
- `channels.telegram.customCommands` 会添加额外的 Telegram bot 菜单项。
- `bash: true` 会为主机 shell 启用 `! <cmd>`。需要 `tools.elevated.enabled` 且发送者位于 `tools.elevated.allowFrom.<channel>` 中。
- `config: true` 启用 `/config`（读/写 `openclaw.json`）。对于 gateway `chat.send` 客户端，持久化的 `/config set|unset` 写入还需要 `operator.admin`；只读的 `/config show` 对普通写权限的 operator 客户端仍然可用。
- `mcp: true` 启用 `/mcp`，用于 `mcp.servers` 下 OpenClaw 管理的 MCP 服务器配置。
- `plugins: true` 启用 `/plugins`，用于插件发现、安装以及启用/禁用控制。
- `channels.<provider>.configWrites` 按频道对配置变更进行闸门控制（默认：true）。
- 对于多账号频道，`channels.<provider>.accounts.<id>.configWrites` 也会对目标为该账号的写入进行闸门控制（例如 `/allowlist --config --account <id>` 或 `/config set channels.<provider>.accounts.<id>...`）。
- `restart: false` 会禁用 `/restart` 和 gateway 重启工具操作。默认值：`true`。
- `ownerAllowFrom` 是仅限所有者命令/工具的显式所有者允许列表。它与 `allowFrom` 分开。
- `ownerDisplay: "hash"` 会在系统提示中对所有者 ID 进行哈希。设置 `ownerDisplaySecret` 以控制哈希。
- `allowFrom` 是按提供方设置的。设置后，它是**唯一**的授权来源（会忽略频道允许列表/配对和 `useAccessGroups`）。
- `useAccessGroups: false` 允许命令绕过访问组策略，只要 `allowFrom` 未设置即可。
- 命令文档映射：
  - 内置 + 捆绑目录：[Slash Commands](/tools/slash-commands)
  - 频道专属命令界面：[Channels](/channels)
  - QQ Bot 命令：[QQ Bot](/channels/qqbot)
  - 配对命令：[Pairing](/channels/pairing)
  - LINE card 命令：[LINE](/channels/line)
  - memory dreaming：[Dreaming](/concepts/dreaming)

</Accordion>

---

## 相关内容

- [配置参考](/gateway/configuration-reference) — 顶级键
- [配置 — 代理](/gateway/config-agents)
- [频道概览](/channels)
