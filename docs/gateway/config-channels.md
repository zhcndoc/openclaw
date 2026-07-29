---
summary: "频道配置：访问控制、配对、跨 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 等的每频道密钥"
read_when:
  - 配置频道插件（认证、访问控制、多账号）
  - 排查每频道配置键
  - 审计 DM 策略、群组策略或提及门控
title: "配置 — channels"
---

`channels.*` 下的每频道配置键：DM 和群组访问、多账号设置、提及门控，以及适用于 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 和其他频道插件的每频道密钥。

有关 agents、tools、gateway runtime 以及其他顶层键，请参见 [Configuration reference](/gateway/configuration-reference)。

## 渠道

每个渠道会在其配置部分存在时自动启动（除非 `enabled: false`）。Telegram 和 iMessage 随核心 `openclaw` 包一起提供。其他官方渠道（Discord、Slack、WhatsApp、Matrix、Microsoft Teams、IRC、Google Chat、Signal、Mattermost 等）作为独立插件安装，使用 `openclaw plugins install <spec>`；完整列表和安装规格请参见 [渠道](/channels)。

### DM 和群组访问

所有频道都支持 DM 策略和群组策略：

| DM 策略             | 行为                                                           |
| ------------------- | -------------------------------------------------------------- |
| `pairing` (默认)    | 未知发送者会得到一次性配对码；所有者必须批准 |
| `allowlist`         | 仅允许 `allowFrom`（或已配对的 allow store）中的发送者             |
| `open`              | 允许所有入站 DM（需要 `allowFrom: ["*"]`）             |
| `disabled`          | 忽略所有入站 DM                                          |

| 群组策略              | 行为                                               |
| --------------------- | ------------------------------------------------------ |
| `allowlist` (默认)    | 仅允许与已配置 allowlist 匹配的群组          |
| `open`                | 绕过群组 allowlist（但仍适用提及门控） |
| `disabled`            | 阻止所有群组/房间消息                          |

<Note>
`channels.defaults.groupPolicy` 在提供者的 `groupPolicy` 未设置时设置默认值。
配对码在 1 小时后过期。待处理的配对请求上限为**每个账户 3 个**（按频道和账户 id 进行范围限定）。
如果某个提供者块完全缺失（`channels.<provider>` 不存在），运行时群组策略将回退为 `allowlist`（失败关闭），并在启动时给出警告。
</Note>

### 通道模型覆盖

使用 `channels.modelByChannel` 将特定的频道 ID 或私信对象固定到某个模型。值可以接受 `provider/model` 或已配置的模型别名。只有当会话尚未有活动的模型覆盖时，频道映射才会生效（例如，通过 `/model` 设置的覆盖）。

对于群组/线程对话，键为特定频道的群组 ID、主题 ID 或频道名称。对于直接消息（DM）对话，键为从频道发送者身份派生的对等方标识符（`nativeDirectUserId`、`origin.from`、`origin.to`、`OriginatingTo`、`From` 或 `SenderId`）。确切的键形式取决于频道：

| Channel  | DM 键形式              | 示例                                         |
| -------- | --------------------- | -------------------------------------------- |
| Discord  | 原始用户 ID            | `987654321`                                  |
| Feishu   | `feishu:ou_...`       | `feishu:ou_a8b6cab7e945387de5f253775d9b4d85` |
| Matrix   | Matrix 用户 ID        | `@user:matrix.org`                           |
| Slack    | `user:U...`           | `user:U12345`                                |
| Telegram | 原始用户 ID            | `123456789`                                  |
| WhatsApp | 手机号码或 JID         | `15551234567`                                |

```json5
{
  channels: {
    modelByChannel: {
      discord: {
        "123456789012345678": "anthropic/claude-opus-4-6",
      },
      slack: {
        C1234567890: "openai/gpt-5.6-sol",
        "user:U12345": "openai/gpt-5.4-mini",
      },
      telegram: {
        "-1001234567890": "openai/gpt-5.4-mini",
        "-1001234567890:topic:99": "anthropic/claude-sonnet-4-6",
        "123456789": "openai/gpt-4.1",
      },
    },
  },
}
```

仅适用于 DM 的键只会匹配直接消息对话；它们不会影响群组/线程路由。

### Channel defaults and heartbeat

Use `channels.defaults` for shared group-policy, implicit-mention, and heartbeat behavior across providers:

```json5
{
  channels: {
    defaults: {
      groupPolicy: "allowlist", // open | allowlist | disabled
      contextVisibility: "all", // all | allowlist | allowlist_quote
      implicitMentions: {
        replyToBot: true,
        quotedBot: true,
        threadParticipation: true,
      },
      heartbeat: {
        showOk: false,
        showAlerts: true,
        useIndicator: true,
      },
    },
  },
}
```

- `channels.defaults.groupPolicy`: fallback group policy when a provider-level `groupPolicy` is unset.
- `channels.defaults.contextVisibility`: default supplemental context visibility mode for all channels. Values: `all` (default, include all quoted/thread/history context), `allowlist` (only include context from allowlisted senders), `allowlist_quote` (same as allowlist but keep explicit quote/reply context). Per-channel override: `channels.<channel>.contextVisibility`.
- `channels.defaults.implicitMentions`: controls which supported inbound facts count as mentions. `replyToBot`, `quotedBot`, and `threadParticipation` each default to `true`, preserving current behavior. Override per channel with `channels.<channel>.implicitMentions` or per account with `channels.<channel>.accounts.<id>.implicitMentions`; each flag resolves account -> channel -> defaults independently. The names are positive: set a flag to `false` to stop that fact from bypassing mention gating. Native explicit mentions are always allowed, and a flag has no effect when the channel does not produce that fact. See [Mention gating](/channels/groups#mention-gating-default) for the current producer matrix. These settings do not change outbound reply/thread modes or authorized command handling.
- `channels.defaults.heartbeat.showOk`: include healthy channel statuses in heartbeat output (default `false`).
- `channels.defaults.heartbeat.showAlerts`: include degraded/error statuses in heartbeat output (default `true`).
- `channels.defaults.heartbeat.useIndicator`: render compact indicator-style heartbeat output (default `true`).

### WhatsApp

WhatsApp 通过 gateway 的 web channel（Baileys Web）运行。只要存在已链接会话，就会自动启动。

```json5
{
  web: {
    enabled: true,
  },
  channels: {
    whatsapp: {
      dmPolicy: "pairing", // pairing | allowlist | open | disabled
      allowFrom: ["+15555550123", "+447700900123"],
      textChunkLimit: 4000,
      streaming: { chunkMode: "length" }, // length | newline
      mediaMaxMb: 50,
      sendReadReceipts: true, // 蓝勾（self-chat mode 下为 false）
      groups: {
        "*": { requireMention: true },
      },
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
    },
  },
}
```

- Top-level `bindings[]` entries with `type: "acp"` configure persistent ACP bindings for WhatsApp DMs and groups. Use an E.164 direct number or WhatsApp group JID in `match.peer.id`. Field semantics are shared in [ACP Agents](/tools/acp-agents#persistent-channel-bindings).

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

- 出站命令默认使用 `default` 账号（如果存在）；否则使用排序后的第一个已配置账号 id。
- 可选的 `channels.whatsapp.defaultAccount` 会在其与已配置账号 id 匹配时覆盖该回退默认账号选择。
- 旧的单账号 Baileys auth dir 会由 `openclaw doctor` 迁移到 `whatsapp/default`。
- 每账号覆盖：`channels.whatsapp.accounts.<id>.sendReadReceipts`、`channels.whatsapp.accounts.<id>.dmPolicy`、`channels.whatsapp.accounts.<id>.allowFrom`。

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
          systemPrompt: "保持回答简洁。",
          topics: {
            "99": {
              requireMention: false,
              skills: ["search"],
              systemPrompt: "保持主题相关。",
            },
          },
        },
      },
      customCommands: [
        { command: "backup", description: "Git 备份" },
        { command: "generate", description: "创建图片" },
      ],
      historyLimit: 50,
      replyToMode: "first", // 关闭 | first | all | batched
      linkPreview: true,
      streaming: { mode: "partial" }, // 关闭 | partial | block | progress（默认：partial）
      actions: { reactions: true, sendMessage: true },
      reactionNotifications: "own", // 关闭 | own | all
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
      apiRoot: "https://api.telegram.org",
      trustedLocalFileRoots: ["/srv/telegram-bot-api-data"],
      proxy: "socks5://localhost:9050",
      webhookUrl: "https://example.com/telegram-webhook",
      webhookSecret: "secret",
      webhookPath: "/telegram-webhook",
    },
  },
}
```

- Bot token：`channels.telegram.botToken` 或 `channels.telegram.tokenFile`（仅限普通文件；拒绝符号链接），默认账号可回退使用 `TELEGRAM_BOT_TOKEN`。
- `apiRoot` 仅用于 Telegram Bot API 根地址。请使用 `https://api.telegram.org` 或你自托管/代理的根地址，不要使用 `https://api.telegram.org/bot<TOKEN>`；`openclaw doctor --fix` 会移除意外追加的 `/bot<TOKEN>` 后缀。
- 对于 `--local` 模式下的自托管 Bot API 服务器，`trustedLocalFileRoots` 列出 OpenClaw 允许读取的主机路径。请将服务器数据卷挂载到 OpenClaw 主机，并配置其数据根目录或按 token 的目录；`/var/lib/telegram-bot-api` 下的容器路径会映射到这些根目录中。其他绝对路径仍会被拒绝。
- 可选的 `channels.telegram.defaultAccount` 会在匹配到已配置账号 id 时覆盖默认账号选择。
- 在多账号设置（2+ 个账号 id）中，请设置明确的默认值（`channels.telegram.defaultAccount` 或 `channels.telegram.accounts.default`），以避免回退路由；当缺失或无效时，`openclaw doctor` 会发出警告。
- `configWrites: false` 会阻止 Telegram 触发的配置写入（超级群组 ID 迁移、`/config set|unset`）。
- 顶层的 `bindings[]` 条目若 `type: "acp"`，则为论坛主题配置持久化 ACP 绑定（在 `match.peer.id` 中使用规范的 `chatId:topic:topicId`）。字段语义详见 [ACP Agents](/tools/acp-agents#persistent-channel-bindings)。
- Telegram 流式预览使用 `sendMessage` + `editMessageText`（适用于私聊和群聊）。
- `network.dnsResultOrder` 默认值为 `"ipv4first"`，以避免常见的 IPv6 获取失败。
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
      replyToMode: "off", // 关闭 | 首条 | 全部 | 批量
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
              systemPrompt: "仅限简短回答。",
            },
          },
        },
      },
      historyLimit: 20,
      textChunkLimit: 2000,
      suppressEmbeds: true,
      streaming: {
        mode: "progress", // 关闭 | 部分 | 块状 | 进度（Discord 默认：进度）
        chunkMode: "length", // 长度 | 换行
        progress: {
          label: "auto",
          maxLines: 8,
          maxLineChars: 120,
          toolProgress: true,
        },
      },
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
        spawnSessions: true,
        defaultSpawnContext: "fork",
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
        connectTimeoutMs: 30000,
        reconnectGraceMs: 15000,
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

- Token: `channels.discord.token`, with `DISCORD_BOT_TOKEN` as fallback for the default account.
- Direct outbound calls that provide an explicit Discord `token` use that token for the call; account retry/policy settings still come from the selected account in the active runtime snapshot.
- Optional `channels.discord.defaultAccount` overrides default account selection when it matches a configured account id.
- Use `user:<id>` (DM) or `channel:<id>` (guild channel) for delivery targets; bare numeric IDs are rejected.
- Guild slugs are lowercase with spaces replaced by `-`; channel keys use the slugged name (no `#`). Prefer guild IDs.
- Bot-authored messages are ignored by default. `allowBots: true` enables them; use `allowBots: "mentions"` to only accept bot messages that mention the bot (own messages still filtered).
- Channels that support bot-authored inbound messages can use shared [bot loop protection](/channels/bot-loop-protection). Set `channels.defaults.botLoopProtection` for baseline pair budgets, then override the channel or account only when one surface needs different limits.
- `channels.discord.guilds.<id>.ignoreOtherMentions` (and channel overrides) drops messages that mention another user or role but not the bot (excluding @everyone/@here).
- `channels.discord.mentionAliases` maps stable outbound `@handle` text to Discord user IDs before sending, so known teammates can be mentioned deterministically even when the transient directory cache is empty. Per-account overrides live under `channels.discord.accounts.<accountId>.mentionAliases`.
- `maxLinesPerMessage` (default `17`) splits tall messages even when under 2000 chars.
- `channels.discord.suppressEmbeds` defaults to `true`, so outbound URLs do not expand into Discord link previews unless disabled. Explicit `embeds` payloads still send normally; per-message tool calls can override with `suppressEmbeds`.
- `channels.discord.threadBindings` controls Discord thread-bound routing:
  - `enabled`: Discord override for thread-bound session features (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`, and bound delivery/routing)
  - `idleHours`: Discord override for inactivity auto-unfocus in hours (`0` disables)
  - `maxAgeHours`: Discord override for hard max age in hours (`0` disables)
  - `spawnSessions`: switch for `sessions_spawn({ thread: true })` and ACP thread-spawn auto thread creation/binding (default: `true`)
  - `defaultSpawnContext`: native subagent context for thread-bound spawns (`"fork"` by default)
- Top-level `bindings[]` entries with `type: "acp"` configure persistent ACP bindings for channels and threads (use channel/thread id in `match.peer.id`). Field semantics are shared in [ACP Agents](/tools/acp-agents#persistent-channel-bindings).
- `channels.discord.ui.components.accentColor` sets the accent color for Discord components v2 containers.
- `channels.discord.agentComponents.ttlMs` controls how long sent Discord component callbacks remain registered. Default `1800000` (30 minutes), maximum `86400000` (24 hours). Per-account overrides live under `channels.discord.accounts.<accountId>.agentComponents.ttlMs`. Prefer the shortest TTL that fits the workflow.
- `channels.discord.voice` enables Discord voice channel conversations and optional auto-join + LLM + TTS overrides. Text-only Discord configs leave voice off by default; set `channels.discord.voice.enabled=true` to opt in.
- `channels.discord.voice.model` optionally overrides the LLM model used for Discord voice channel responses.
- `channels.discord.voice.daveEncryption` (default `true`) and `channels.discord.voice.decryptionFailureTolerance` (default `24`) pass through to `@discordjs/voice` DAVE options.
- `channels.discord.voice.connectTimeoutMs` controls the initial `@discordjs/voice` Ready wait for `/vc join` and auto-join attempts (default `30000`).
- `channels.discord.voice.reconnectGraceMs` controls how long a disconnected voice session may take to enter reconnect signalling before OpenClaw destroys it (default `15000`).
- Discord voice playback is not interrupted by another user's speaking-start event. To avoid feedback loops, OpenClaw ignores new voice capture while TTS is playing.
- OpenClaw additionally attempts voice receive recovery by leaving/rejoining a voice session after repeated decrypt failures.
- `channels.discord.streaming` is the canonical stream mode key. Discord defaults to `streaming.mode: "progress"` so tool/work progress appears in one edited preview message; set `streaming.mode: "off"` to disable it. Legacy flat keys (`streamMode`, `chunkMode`, `blockStreaming`, `draftChunk`, `blockStreamingCoalesce`) are no longer read at runtime; run `openclaw doctor --fix` to migrate persisted config.
- `channels.discord.autoPresence` maps runtime availability to bot presence (healthy => online, degraded => idle, exhausted => dnd) and allows optional status text overrides.
- `channels.discord.guilds.<id>.presenceEvents` routes human availability arrivals into one configured Discord channel as agent system events. Eligible members must be able to view `channelId`; public threads inherit parent visibility, while private threads additionally require membership or Manage Threads. `users` can further narrow that audience. It seeds current online members from complete `GUILD_CREATE` snapshots, routes observed offline-to-online transitions, and treats a first later online signal for an unseen member as newly available without asserting whether they came online or joined after the snapshot. Guilds above Discord's 75,000-member snapshot limit require an explicit offline update first. Throttling knobs: `reconnectSuppressSeconds` (quiet window after a new Gateway session while guild presence state is rebuilt, default 300, `0` disables) and `burstLimit`/`burstWindowSeconds` (per-guild successfully queued event rate limit, default 8 events per 60s sliding window). Resumed sessions do not start the reconnect suppression window. The existing per-user re-greet cooldown remains eight hours. It requires `channels.discord.intents.presence=true`, the privileged Presence Intent in Discord's Developer Portal, and an enabled agent heartbeat.
- `channels.discord.dangerouslyAllowNameMatching` re-enables mutable name/tag matching (break-glass compatibility mode).
- `channels.discord.execApprovals`: Discord-native exec approval delivery and approver authorization.
  - `enabled`: `true`, `false`, or `"auto"` (default). In auto mode, exec approvals activate when approvers can be resolved from `approvers` or `commands.ownerAllowFrom`.
  - `approvers`: Discord user IDs allowed to approve exec requests. Falls back to `commands.ownerAllowFrom` when omitted.
  - `agentFilter`: optional agent ID allowlist. Omit to forward approvals for all agents.
  - `sessionFilter`: optional session key patterns (substring or regex).
  - `target`: where to send approval prompts. `"dm"` (default) sends to approver DMs, `"channel"` sends to the originating channel, `"both"` sends to both. When target includes `"channel"`, buttons are only usable by resolved approvers.
  - `cleanupAfterResolve`: when `true`, deletes approval DMs after approval, denial, or timeout.

**Reaction 通知模式：** `off`（无）、`own`（机器人的消息，默认）、`all`（所有消息）、`allowlist`（来自 `guilds.<id>.users` 的所有消息）。

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
      dmPolicy: "pairing",
      allowFrom: ["users/1234567890"],
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

- Service account JSON: inline (`serviceAccount`) or file-based (`serviceAccountFile`).
- `serviceAccount` accepts a SecretRef directly.
- Env fallbacks: `GOOGLE_CHAT_SERVICE_ACCOUNT` or `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE` (default account only).
- Use `spaces/<spaceId>` or `users/<userId>` for delivery targets.
- `channels.googlechat.dangerouslyAllowNameMatching` re-enables mutable email principal matching (break-glass compatibility mode).

### Slack

```json5
{
  channels: {
    slack: {
      enabled: true,
      botToken: "xoxb-...",
      appToken: "xapp-...",
      socketMode: {
        clientPingTimeout: 15000,
        serverPingTimeout: 30000,
        pingPongLoggingEnabled: false,
      },
      dmPolicy: "pairing",
      allowFrom: ["U123", "U456", "*"],
      dm: { enabled: true, groupEnabled: false, groupChannels: ["G123"] },
      channels: {
        C123: { enabled: true, requireMention: true, allowBots: false },
        "#general": {
          enabled: true,
          requireMention: true,
          allowBots: false,
          users: ["U123"],
          skills: ["docs"],
          systemPrompt: "仅限简短回答。",
        },
      },
      historyLimit: 50,
      allowBots: false,
      reactionNotifications: "own",
      reactionAllowlist: ["U123"],
      replyToMode: "off", // 关闭 | 首条 | 全部 | 批量
      thread: {
        historyScope: "thread", // 线程 | 频道
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
        mode: "partial", // 关闭 | 部分 | 块 | 进度
        chunkMode: "length", // 长度 | 换行
        nativeTransport: true, // 当 mode=partial 时使用 Slack 原生流式 API
      },
      mediaMaxMb: 20,
      execApprovals: {
        enabled: "auto", // true | false | "auto"
        approvers: ["U123"],
        agentFilter: ["default"],
        sessionFilter: ["slack:"],
        target: "dm", // 私信 | 频道 | 两者
      },
    },
  },
}
```

- **Socket mode** requires both `botToken` and `appToken` (`SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN` for default account env fallback).
- **HTTP mode** requires `botToken` plus `signingSecret` (at root or per-account).
- **User identity** (`identity: "user"`) posts and reads as the authorizing human. It requires `userToken` plus `appToken` in Socket Mode, or `userToken` plus `signingSecret` in HTTP mode. No bot token or bot user is required. See [User identity](/channels/slack#user-identity-post-as-a-real-person) for user scopes and event subscriptions.
- `enterpriseOrgInstall: true` opts an account into the Slack Enterprise Grid
  org-wide event path. Startup verifies the bot token with `auth.test` and
  fails when the configured mode does not match Slack's installation identity.
  Enterprise DMs must be disabled or use `dmPolicy: "open"` with an effective
  `allowFrom: ["*"]`. Channel and user policies must use stable Slack IDs;
  mutable names and unsupported channel prefixes fail startup. V1 handles only
  direct Socket Mode or HTTP `message` and `app_mention` events with immediate
  replies; relay, commands, interactions, App Home, reaction event listeners,
  pins, action tools, native approvals, bindings, deferred delivery, and
  proactive sends are unavailable. Listener-owned acknowledgment, typing, and
  status reactions remain available with `reactions:write`; inbound reaction
  notifications and reaction action tools are unavailable. See
  [Enterprise Grid org-wide installs](/channels/slack#enterprise-grid-org-wide-installs)
  for the least-privilege manifest, setup workflow, and complete restrictions.
- `socketMode` passes Slack SDK Socket Mode transport tuning through to the public Bolt receiver API. Use it only when investigating ping/pong timeout or stale websocket behavior. `clientPingTimeout` defaults to `15000`; `serverPingTimeout` and `pingPongLoggingEnabled` are passed only when configured.
- `botToken`, `appToken`, `signingSecret`, and `userToken` accept plaintext
  strings or SecretRef objects.
- Slack account snapshots expose per-credential source/status fields such as
  `botTokenSource`, `botTokenStatus`, `userTokenSource`, `userTokenStatus`,
  `appTokenStatus`, and, in HTTP mode, `signingSecretStatus`.
  `configured_unavailable` means the account is
  configured through SecretRef but the current command/runtime path could not
  resolve the secret value.
- `configWrites: false` blocks Slack-initiated config writes.
- Optional `channels.slack.defaultAccount` overrides default account selection when it matches a configured account id.
- `dm.groupEnabled` and `dm.groupChannels` only filter Slack group DMs (MPDMs) the app is already a member of. They cannot make the app see an existing group DM it never joined; convert the group DM to a private channel and invite the app, or have the app open a new MPDM with `conversations.open`. See [Group DMs (MPDMs) and bots](/channels/slack#group-dms-mpdms-and-bots).
- `channels.slack.streaming.mode` is the canonical Slack stream mode key (default `"partial"`). `channels.slack.streaming.nativeTransport` controls Slack's native streaming transport (default `true`). Legacy `streamMode`, boolean `streaming`, `chunkMode`, `blockStreaming`, `blockStreamingCoalesce`, and `nativeStreaming` values are no longer read at runtime; run `openclaw doctor --fix` to migrate persisted config to `streaming.{mode,chunkMode,block.enabled,block.coalesce,nativeTransport}`.
- `unfurlLinks` and `unfurlMedia` pass Slack's `chat.postMessage` link and media unfurl booleans through for bot replies. `unfurlLinks` defaults to `false` so outbound bot links do not expand inline unless enabled; `unfurlMedia` is omitted unless configured. Set either value at `channels.slack.accounts.<accountId>` to override the top-level value for one account.
- Use `user:<id>` (DM) or `channel:<id>` for delivery targets.

**Reaction 通知模式：** `off`、`own`（默认）、`all`、`allowlist`（来自 `reactionAllowlist`）。

**线程会话隔离：** `thread.historyScope` 可按线程隔离（默认）或跨频道共享。`thread.inheritParent` 会将父频道转录复制到新线程。`thread.initialHistoryLimit`（默认 `20`）限制新线程会话开始时拉取多少条已有线程消息；`0` 会禁用线程历史拉取。

- Slack 原生流式以及 Slack 助手风格的“is typing...”线程状态都需要一个回复线程目标。顶层 DM 默认保持非线程，因此它们仍可通过 Slack 草稿式的发送后编辑预览进行流式输出，而不会显示线程式的原生流/状态预览。
- `typingReaction` 会在回复运行期间为入站 Slack 消息添加一个临时 reaction，完成后再移除。请使用 Slack emoji 短码，例如 `"hourglass_flowing_sand"`。
- `channels.slack.execApprovals`：Slack 原生 approval-client 的投递与 exec approver 授权。与 Discord 的 schema 相同：`enabled`（`true`/`false`/`"auto"`）、`approvers`（Slack user IDs）、`agentFilter`、`sessionFilter` 和 `target`（`"dm"`、`"channel"` 或 `"both"`）。当 Slack 插件 approvers 解析成功时，插件审批可以对 Slack 来源请求使用这一原生客户端路径；Slack 原生插件审批投递也可以通过 `approvals.plugin` 为 Slack 来源会话或 Slack 目标启用。插件审批使用来自 `allowFrom` 和默认路由的 Slack 插件 approvers，而不是 exec approvers。

| Action group | 默认 | 说明                  |
| ------------ | ---- | ---------------------- |
| reactions    | 已启用 | 添加 reaction + 列出 reactions |
| messages     | 已启用 | 读/发/编辑/删除  |
| pins         | 已启用 | 置顶/取消置顶/列出         |
| memberInfo   | 已启用 | 成员信息            |
| emojiList    | 已启用 | 自定义 emoji 列表      |

### Mattermost

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
        native: true, // 可选启用
        nativeSkills: true,
        callbackPath: "/api/channels/mattermost/command",
        // 可选的显式 URL，适用于反向代理/公网部署
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
- 原生 slash 回调使用 Mattermost 在 slash command 注册期间返回的每命令 token 进行认证。如果注册失败或没有激活任何命令，OpenClaw 会以
  `Unauthorized: invalid command token.`
  拒绝回调。
- 对于私有/tailnet/internal 回调主机，Mattermost 可能要求
  `ServiceSettings.AllowedUntrustedInternalConnections` 包含回调主机/域名。
  请使用主机/域名值，不要使用完整 URL。
- `channels.mattermost.configWrites`：允许或拒绝 Mattermost 触发的配置写入。
- `channels.mattermost.requireMention`：在频道中回复前是否需要 `@mention`。
- `channels.mattermost.groups.<channelId>.requireMention`：每频道 mention 门控覆盖（默认使用 `"*"`）。
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
      reactionNotifications: "own", // 关闭 | 自己 | 全部 | 白名单
      reactionAllowlist: ["+15551234567", "uuid:123e4567-e89b-12d3-a456-426614174000"],
      historyLimit: 50,
    },
  },
}
```

**表情回应通知模式：** `off`、`own`（默认）、`all`、`allowlist`（来自 `reactionAllowlist`）。

- `channels.signal.account`：将频道启动固定到特定的 Signal 账号身份。
- `channels.signal.configWrites`：允许或拒绝 Signal 触发的配置写入。
- 可选的 `channels.signal.defaultAccount` 会在其与已配置账号 id 匹配时覆盖默认账号选择。

### iMessage

OpenClaw 会启动 `imsg rpc`（通过 stdio 的 JSON-RPC）。不需要守护进程或端口。这是新 OpenClaw iMessage 设置的首选路径，前提是主机可以授予 Messages 数据库和 Automation 权限。

已移除 BlueBubbles 支持。`channels.bluebubbles` 不是当前 OpenClaw 上受支持的运行时配置面。请将旧配置迁移到 `channels.imessage`；简要说明请参阅 [BlueBubbles removal and the imsg iMessage path](/announcements/bluebubbles-imessage)，完整对照表请参阅 [Coming from BlueBubbles](/channels/imessage-from-bluebubbles)。

如果 Gateway 没有运行在已登录 Messages 的那台 Mac 上，请保持 `channels.imessage.enabled=true`，并将 `channels.imessage.cliPath` 设置为在那台 Mac 上运行 `imsg "$@"` 的 SSH 包装器。默认的本地 `imsg` 路径仅适用于 macOS。

在依赖 SSH 包装器进行生产发送之前，请通过该完全相同的包装器验证一次外发 `imsg send`。某些 macOS TCC 状态会将 Messages Automation 分配给 `/usr/libexec/sshd-keygen-wrapper`，这可能导致读取和探测正常工作，但发送时因 AppleEvents `-1743` 失败；请参阅 [iMessage](/channels/imessage) 中的 SSH 包装器故障排除部分。

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
      sendTransport: "auto",
      region: "US",
      actions: {
        reactions: true,
        edit: true,
        unsend: true,
        reply: true,
        sendWithEffect: true,
        sendAttachment: true,
      },
    },
  },
}
```

- 可选的 `channels.imessage.defaultAccount` 会在其与已配置的账户 id 匹配时覆盖默认账户选择。
- 需要对 Messages 数据库授予完全磁盘访问权限。
- 优先使用 `chat_id:<id>` 目标。使用 `imsg chats --limit 20` 列出聊天。
- `cliPath` 可以指向 SSH 包装器；将 `remoteHost`（`host` 或 `user@host`）用于通过 SCP 获取附件。
- `attachmentRoots` 和 `remoteAttachmentRoots` 会限制传入附件路径（默认：`/Users/*/Library/Messages/Attachments`）。
- SCP 使用严格的主机密钥检查，因此请确保中继主机密钥已存在于 `~/.ssh/known_hosts` 中。
- `channels.imessage.configWrites`：允许或拒绝由 iMessage 发起的配置写入。
- `channels.imessage.sendTransport`：用于正常外发回复的首选 `imsg` RPC 发送传输。`auto`（默认）会在可用时对现有聊天使用 IMCore 桥接，然后回退到 AppleScript；`bridge` 要求使用私有 API 发送；`applescript` 会强制使用公开的 Messages 自动化路径。
- `channels.imessage.actions.*`：启用也受 `imsg status` / `openclaw channels status --probe` 门控的私有 API 操作。
- `channels.imessage.includeAttachments` 默认关闭；在期望代理回合中出现入站媒体之前，请将其设置为 `true`。
- 桥接/网关重启后的入站恢复会自动进行（GUID 去重加上过期回溯年龄栅栏）。现有的 `channels.imessage.catchup.enabled: true` 配置仍会被接受，作为已弃用的兼容配置；`catchup` 默认禁用。
- `channels.imessage.groups`：群组注册表和每组设置。使用 `groupPolicy: "allowlist"` 时，请配置显式的 `chat_id` 键或 `"*"` 通配符条目，以便群组消息可以通过注册表门控。
- 顶层 `bindings[]` 中 `type: "acp"` 的条目可以将 iMessage 对话绑定到持久化 ACP 会话。请在 `match.peer.id` 中使用规范化的 handle 或显式聊天目标（`chat_id:*`、`chat_guid:*`、`chat_identifier:*`）。共享字段语义： [ACP Agents](/tools/acp-agents#persistent-channel-bindings)。

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
          name: "运维",
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
- `channels.matrix.proxy` 会通过显式的 HTTP(S) 代理路由 Matrix 的 HTTP 流量。命名账户可以通过 `channels.matrix.accounts.<id>.proxy` 覆盖它。
- `channels.matrix.network.dangerouslyAllowPrivateNetwork` 允许私有/内部 homeserver。`proxy` 和这个网络显式启用选项是相互独立的控制项。
- `channels.matrix.defaultAccount` 在多账户配置中选择首选账户。
- `channels.matrix.autoJoin` 默认是 `"off"`，因此受邀房间和新鲜的 DM 风格邀请会被忽略，直到你设置 `autoJoin: "allowlist"` 并配合 `autoJoinAllowlist`，或者设置 `autoJoin: "always"`。
- `channels.matrix.execApprovals`：Matrix 原生的 exec 审批传递和审批者授权。
  - `enabled`：`true`、`false` 或 `"auto"`（默认）。在自动模式下，当可以从 `approvers` 或 `commands.ownerAllowFrom` 解析出审批者时，exec 审批会被启用。
  - `approvers`：允许批准 exec 请求的 Matrix 用户 ID（例如 `@owner:example.org`）。
  - `agentFilter`：可选的 agent ID 白名单。省略则转发所有 agent 的审批。
  - `sessionFilter`：可选的 session key 模式（子串或正则表达式）。
  - `target`：将审批提示发送到哪里。`"dm"`（默认）、`"channel"`（发起的房间）或 `"both"`。
  - 每账户覆盖：`channels.matrix.accounts.<id>.execApprovals`。
- `channels.matrix.dm.sessionScope` 控制 Matrix DM 如何分组到会话中：`per-user`（默认）按路由后的对端共享，而 `per-room` 会将每个 DM 房间隔离开。
- Matrix 状态探测和实时目录查询使用与运行时流量相同的代理策略。
- 完整的 Matrix 配置、目标规则和设置示例记录在 [Matrix](/channels/matrix) 中。

### Microsoft Teams

Microsoft Teams 由插件支持，并在 `channels.msteams` 下配置。

```json5
{
  channels: {
    msteams: {
      enabled: true,
      configWrites: true,
      // appId, appPassword, tenantId, webhook, 团队/频道策略：
      // 见 /channels/msteams
    },
  },
}
```

- 此处涵盖的核心键路径：`channels.msteams`、`channels.msteams.configWrites`。
- 完整的 Teams 配置（凭证、webhook、DM/群组策略、每团队/每频道覆盖）见 [Microsoft Teams](/channels/msteams)。

### IRC

IRC is supported by a plugin and configured under `channels.irc`.

```json5
{
  channels: {
    irc: {
      enabled: true,
      dmPolicy: "pair",
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

- Core key paths covered here: `channels.irc`, `channels.irc.dmPolicy`, `channels.irc.configWrites`, `channels.irc.nickserv.*`.
- The optional `channels.irc.defaultAccount` overrides the default account selection when it matches a configured account id.
- See [IRC](/channels/irc) for the full IRC channel configuration (host/port/TLS/channels/allowlists/mention gating).

### Multiple Accounts (All Channels)

Each channel can run multiple accounts (each with its own `accountId`):

```json5
{
  channels: {
    telegram: {
      accounts: {
        default: {
          name: "Main Bot",
          botToken: "123456:ABC...",
        },
        alerts: {
          name: "Alert Bot",
          botToken: "987654:XYZ...",
        },
      },
    },
  },
}
```

- Use `default` when `accountId` is omitted (CLI + routing).
- Environment variable tokens apply to the **default** account only.
- Base channel settings apply to all accounts unless overridden per account.
- Use `bindings[].match.accountId` to route each account to a different agent.
- If you add a non-default account while still on a single-account top-level channel config via `openclaw channels add` (or channel onboarding), OpenClaw will first promote the account-scoped top-level single-account values into the channel account map so the original account continues to work. Most channels will move them to `channels.<channel>.accounts.default`; Matrix can also preserve the existing matched named/default target.
- Existing channel-only bindings (without `accountId`) will continue to match the default account; account-scoped bindings remain optional.
- `openclaw doctor --fix` will also repair mixed structures by moving account-scoped top-level single-account values into the channel-selected promoted account. Most channels use `accounts.default`; Matrix can also preserve the existing matched named/default target.

### 其他插件渠道

许多插件渠道配置为 `channels.<id>`，并在各自专门的渠道页面中进行文档说明（例如 Feishu、LINE、Nextcloud Talk、Nostr、QQ Bot、Synology Chat、Twitch 和 Zalo）。
查看完整渠道索引：[Channels](/channels)。

### 群组消息提及门控

群组消息默认需要**提及**（元数据提及或安全正则模式）。适用于 WhatsApp、Telegram、Discord、Google Chat 和 iMessage 群聊。

Visible replies are controlled separately. Normal group, channel, and internal WebChat direct requests default to automatic final delivery: final assistant text posts through the legacy visible reply path. Opt into `messages.visibleReplies: "message_tool"` or `messages.groupChat.visibleReplies: "message_tool"` when model-authored source replies should only post after the agent calls `message(action=send)`. If the model returns a substantive final answer without calling the message tool in an opted-in tool-only mode, that final text stays private, the gateway verbose log records suppressed payload metadata, and OpenClaw enqueues one recovery retry asking the model to deliver the same reply via `message(action=send)`.

The tool-only policy governs assistant source replies and generic tool media. It does not suppress runtime-owned terminal output such as authorized command responses, durable completion notices, or provider-native artifacts that the owning harness explicitly classifies as host-owned. Host-owned artifacts are delivered through the normal channel dispatch path and still respect outbound `sendPolicy` denial. Ambient `room_event` turns remain quiet unless they are explicit commands, even when runtime output is marked host-owned.

仅工具可见回复要求模型/运行时能够可靠调用工具，并建议用于最新一代模型上的共享环境房间，例如 GPT-5.6 Sol。某些较弱模型可以生成最终文本，但无法理解源可见输出必须通过 `message(action=send)` 发送。对于常见的“最终答案滞留”情况，OpenClaw 默认只会在以下条件下进行恢复：最终内容足够实质、源 turn 不是房间事件、发送策略没有拒绝交付、且没有已经发送的源回复。恢复最多只进行一次重试；它会抑制合成重试提示的持久化，并让该重试不进入 collect 批处理，因此不会与无关的排队提示合并。如果重试后仍然滞留或无法入队，OpenClaw 只会交付一条经过净化的诊断信息，例如 “我生成了一条回复，但无法将其发送到此聊天中。请重试。” 原始的私有最终文本绝不会被标记为自动源交付。对于持续出现回复滞留的模型，请使用 `"automatic"`，这样最终助手轮次就会走可见回复路径；或者切换到更强的工具调用模型；或者检查 gateway 详细日志中的被抑制载荷摘要；又或者设置 `messages.groupChat.visibleReplies: "automatic"`，让所有群组/频道请求都使用可见最终回复。

如果在当前工具策略下 message tool 不可用，OpenClaw 会回退到自动可见回复，而不是静默抑制响应。`openclaw doctor` 会对这种不匹配发出警告。

此规则适用于普通代理最终文本。插件拥有的会话绑定会将所属插件返回的回复作为已声明绑定线程轮次的可见响应；对于这些绑定回复，插件无需调用 `message(action=send)`。

**故障排查：群组 @mention 触发 typing 后沉默（无错误）**

症状：在群组/频道中 @mention 后出现 typing 指示，gateway log 报告 `dispatch complete (queuedFinal=false, replies=0)`，但房间里没有消息落地。对同一 agent 的 DM 则正常回复。

原因：群组/频道可见回复模式被解析为 `"message_tool"`，因此 OpenClaw 会运行该轮次，但除非代理调用 `message(action=send)`，否则会抑制最终助手文本。此模式下没有 `NO_REPLY` 合同；没有 message-tool 调用就意味着原始最终文本是私有的。对于实质性的源 turn，OpenClaw 现在会尝试一次受保护的恢复重试；简短备注、明确静默、房间事件、发送策略拒绝的轮次，以及已经交付的轮次都不会重试。普通群组和频道轮次默认是 `"automatic"`，因此只有当 `messages.groupChat.visibleReplies`（或全局 `messages.visibleReplies`）被显式设置为 `"message_tool"` 时才会出现这种症状。Harness 的 `defaultVisibleReplies` 在这里不适用——group/channel resolver 会忽略它；它只影响 direct/source chats（Codex harness 会以这种方式抑制 direct-chat 的最终回复）。

修复方法：要么选择更强的工具调用模型，要么移除显式的 `"message_tool"` 覆盖以回退到 `"automatic"` 默认值，或者设置 `messages.groupChat.visibleReplies: "automatic"`，以强制所有群组/频道请求都使用可见回复。实质性的滞留最终答案现在不应再以静默成功结束；它要么会通过一次 `message(action=send)` 重试恢复，要么会显示经过净化的交付失败诊断。gateway 会在文件保存后热重载 `messages` 配置；只有在部署中禁用了文件监视或配置重载时才需要重启 gateway。

**提及类型：**

- **Metadata mentions**: Native platform @-mentions. Ignored in WhatsApp self-chat mode.
- **Text patterns**: Safe regex patterns in `agents.entries.*.groupChat.mentionPatterns`. Invalid patterns and unsafe nested repetition are ignored.
- Mention gating is enforced only when detection is possible (native mentions or at least one pattern).

```json5
{
  messages: {
    visibleReplies: "automatic", // 对 direct/source chats 强制使用旧的自动最终回复
    groupChat: {
      historyLimit: 50,
      unmentionedInbound: "room_event", // 始终在线且未提及的房间闲聊会作为静默上下文
      visibleReplies: "message_tool", // 选择启用；需要 message(action=send) 才会可见地回复房间消息
    },
  },
  agents: {
    list: [{ id: "main", groupChat: { mentionPatterns: ["@openclaw", "openclaw"] } }],
  },
}
```

`messages.groupChat.historyLimit` 设置全局默认值。频道可以通过 `channels.<channel>.historyLimit`（或每账号）覆盖。设为 `0` 可禁用。

`messages.groupChat.unmentionedInbound: "room_event"` 会在受支持的频道上，把未提及的始终在线群组/频道消息作为静默房间上下文提交。被提及的消息、命令和直接消息仍然是用户请求。完整的 Discord、Slack 和 Telegram 示例见 [Ambient room events](/channels/ambient-room-events)。

`messages.visibleReplies` 是全局 source-event 默认值；`messages.groupChat.visibleReplies` 会针对群组/频道 source events 覆盖它。当 `messages.visibleReplies` 未设置时，direct/source chats 会使用所选运行时或 harness 默认值，但内部 WebChat 直接轮次会为 Pi/Codex prompt parity 使用自动最终交付。设置 `messages.visibleReplies: "message_tool"` 可有意要求可见输出必须通过 `message(action=send)` 发送。频道 allowlist 和提及门控仍然会决定某个事件是否被处理。

#### DM 历史记录限制

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

解析顺序：每个 DM 覆盖 → provider 默认值 → 无限制（全部保留）。

该 resolver 会读取任意频道的 `channels.<provider>.dmHistoryLimit` 和 `channels.<provider>.dms.<id>.historyLimit`，只要其 session key 采用标准 `provider:direct:<id>`（或旧式 `provider:dm:<id>`）形式即可，因此它适用于捆绑频道和插件频道，不仅仅是固定列表。

#### 自聊模式

在 `allowFrom` 中包含你自己的号码以启用 self-chat mode（忽略原生 @-mentions，只响应文本模式）：

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

### 命令（聊天命令处理）

```json5
{
  commands: {
    native: "auto", // 在支持时注册原生命令
    nativeSkills: "auto", // 在支持时注册原生技能命令
    text: true, // 解析聊天消息中的 /commands
    bash: false, // 允许 !（别名：/bash）
    bashForegroundMs: 2000,
    config: false, // allow /config
    mcp: false, // allow /mcp
    plugins: false, // allow /plugins
    debug: false, // allow /debug
    restart: true, // allow /restart + external SIGUSR1 restart requests
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

- This block configures command surfaces. For the current built-in + bundled command catalog, see [Slash Commands](/tools/slash-commands).
- This page is a **config-key reference**, not the full command catalog. Channel/plugin-owned commands such as QQ Bot `/bot-ping` `/bot-help` `/bot-logs`, LINE `/card`, device-pair `/pair`, memory `/dreaming`, and Talk `/voice` are documented in their channel/plugin pages plus [Slash Commands](/tools/slash-commands).
- Text commands must be **standalone** messages with leading `/`.
- `native: "auto"` turns on native commands for Discord/Telegram, leaves Slack off.
- `nativeSkills: "auto"` turns on native skill commands for Discord/Telegram, leaves Slack off.
- Override per channel: `channels.discord.commands.native` (bool or `"auto"`). For Discord, `false` skips native command registration and cleanup during startup.
- Override native skill registration per channel with `channels.<provider>.commands.nativeSkills`.
- `channels.telegram.customCommands` adds extra Telegram bot menu entries.
- `bash: true` enables `! <cmd>` for host shell. Requires `tools.elevated.enabled` and sender in `tools.elevated.allowFrom.<channel>`.
- `config: true` enables `/config` (reads/writes `openclaw.json`). For gateway `chat.send` clients, persistent `/config set|unset` writes also require `operator.admin`; read-only `/config show` stays available to normal write-scoped operator clients.
- `mcp: true` enables `/mcp` for OpenClaw-managed MCP server config under `mcp.servers`.
- `plugins: true` enables `/plugins` for plugin discovery, install, and enable/disable controls.
- `channels.<provider>.configWrites` gates config mutations per channel (default: true).
- For multi-account channels, `channels.<provider>.accounts.<id>.configWrites` also gates writes that target that account (for example `/allowlist --config --account <id>` or `/config set channels.<provider>.accounts.<id>...`).
- `restart: false` disables `/restart` and external `SIGUSR1` restart requests. Default: `true`.
- `ownerAllowFrom` is the explicit owner allowlist for owner-only commands and owner-gated channel actions. It is separate from `allowFrom`.
- `ownerDisplay: "hash"` hashes owner ids in the system prompt. Set `ownerDisplaySecret` to control hashing.
- `allowFrom` is per-provider. When set, it is the **only** authorization source (channel allowlists/pairing and `useAccessGroups` are ignored).
- `useAccessGroups: false` allows commands to bypass access-group policies when `allowFrom` is not set.
- Command docs map:
  - built-in + bundled catalog: [Slash Commands](/tools/slash-commands)
  - channel-specific command surfaces: [Channels](/channels)
  - QQ Bot commands: [QQ Bot](/channels/qqbot)
  - pairing commands: [Pairing](/channels/pairing)
  - LINE card command: [LINE](/channels/line)
  - memory dreaming: [Dreaming](/concepts/dreaming)

</Accordion>

---

## 相关内容

- [配置参考](/gateway/configuration-reference) — 顶级键
- [配置 — 代理](/gateway/config-agents)
- [渠道概览](/channels)
