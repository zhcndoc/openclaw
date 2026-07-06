---
summary: "频道配置：访问控制、配对、跨 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 等的每频道密钥"
read_when:
  - 配置频道插件（认证、访问控制、多账号）
  - 排查每频道配置键
  - 审计 DM 策略、群组策略或提及门控
title: "配置 — channels"
---

Per-channel configuration keys under `channels.*`: DM and group access, multi-account setups, mention gating, and per-channel keys for Slack, Discord, Telegram, WhatsApp, Matrix, iMessage, and other channel plugins.

For agents, tools, gateway runtime, and other top-level keys, see [Configuration reference](/gateway/configuration-reference).

## Channels

Each channel starts automatically when its config section exists (unless `enabled: false`). Telegram and iMessage ship inside the core `openclaw` package. Other official channels (Discord, Slack, WhatsApp, Matrix, Microsoft Teams, IRC, Google Chat, Signal, Mattermost, and more) install as separate plugins with `openclaw plugins install <spec>`; see [Channels](/channels) for the full list and install specs.

### DM 和群组访问

所有频道都支持 DM 策略和群组策略：

| DM 策略             | 行为                                                           |
| ------------------- | -------------------------------------------------------------- |
| `pairing` (default) | 未知发送者会得到一次性配对码；所有者必须批准 |
| `allowlist`         | 仅允许 `allowFrom`（或已配对的 allow store）中的发送者             |
| `open`              | 允许所有入站 DM（需要 `allowFrom: ["*"]`）             |
| `disabled`          | 忽略所有入站 DM                                          |

| 群组策略              | 行为                                               |
| --------------------- | ------------------------------------------------------ |
| `allowlist` (default) | 仅允许与已配置 allowlist 匹配的群组          |
| `open`                | 绕过群组 allowlist（但仍适用提及门控） |
| `disabled`            | 阻止所有群组/房间消息                          |

<Note>
`channels.defaults.groupPolicy` sets the default when a provider's `groupPolicy` is unset.
Pairing codes expire after 1 hour. Pending pairing requests are capped at **3 per account** (scoped by channel and account id).
If a provider block is missing entirely (`channels.<provider>` absent), runtime group policy falls back to `allowlist` (fail-closed) with a startup warning.
</Note>

### Channel model overrides

Use `channels.modelByChannel` to pin specific channel IDs or direct-message peers to a model. Values accept `provider/model` or configured model aliases. The channel mapping only applies when a session does not already have an active model override (for example, one set via `/model`).

For group/thread conversations, keys are channel-specific group IDs, topic IDs, or channel names. For direct-message (DM) conversations, keys are peer identifiers derived from the channel's sender identity (`nativeDirectUserId`, `origin.from`, `origin.to`, `OriginatingTo`, `From`, or `SenderId`). The exact key form depends on the channel:

| Channel  | DM key form         | Example                                      |
| -------- | ------------------- | -------------------------------------------- |
| Discord  | raw user ID         | `987654321`                                  |
| Feishu   | `feishu:ou_...`     | `feishu:ou_a8b6cab7e945387de5f253775d9b4d85` |
| Matrix   | Matrix user ID      | `@user:matrix.org`                           |
| Slack    | `user:U...`         | `user:U12345`                                |
| Telegram | raw user ID         | `123456789`                                  |
| WhatsApp | phone number or JID | `15551234567`                                |

```json5
{
  channels: {
    modelByChannel: {
      discord: {
        "123456789012345678": "anthropic/claude-opus-4-6",
      },
      slack: {
        C1234567890: "openai/gpt-5.5",
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

DM-specific keys only match in direct-message conversations; they do not affect group/thread routing.

### Channel defaults and heartbeat

使用 `channels.defaults` 为跨 provider 的共享 group-policy 和 heartbeat 行为进行设置：

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

- `channels.defaults.groupPolicy`: fallback group policy when a provider-level `groupPolicy` is unset.
- `channels.defaults.contextVisibility`: default supplemental context visibility mode for all channels. Values: `all` (default, include all quoted/thread/history context), `allowlist` (only include context from allowlisted senders), `allowlist_quote` (same as allowlist but keep explicit quote/reply context). Per-channel override: `channels.<channel>.contextVisibility`.
- `channels.defaults.heartbeat.showOk`: include healthy channel statuses in heartbeat output (default `false`).
- `channels.defaults.heartbeat.showAlerts`: include degraded/error statuses in heartbeat output (default `true`).
- `channels.defaults.heartbeat.useIndicator`: render compact indicator-style heartbeat output (default `true`).

### WhatsApp

WhatsApp 通过 gateway 的 web channel（Baileys Web）运行。只要存在已链接会话，就会自动启动。

```json5
{
  web: {
    enabled: true,
    heartbeatSeconds: 60,
    whatsapp: {
      keepAliveIntervalMs: 25000,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
    },
    reconnect: {
      initialMs: 2000,
      maxMs: 30000,
      factor: 1.8,
      jitter: 0.25,
      maxAttempts: 12, // 0 = retry forever
    },
  },
  channels: {
    whatsapp: {
      dmPolicy: "pairing", // pairing | allowlist | open | disabled
      allowFrom: ["+15555550123", "+447700900123"],
      textChunkLimit: 4000,
      chunkMode: "length", // length | newline
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

- `web.whatsapp.keepAliveIntervalMs` (default `25000`), `connectTimeoutMs` (default `60000`), and `defaultQueryTimeoutMs` (default `60000`) tune the Baileys socket.
- `web.reconnect` defaults: `initialMs: 2000`, `maxMs: 30000`, `factor: 1.8`, `jitter: 0.25`, `maxAttempts: 12`. `maxAttempts: 0` retries forever instead of giving up.
- Top-level `bindings[]` entries with `type: "acp"` configure persistent ACP bindings for WhatsApp DMs and groups. Use an E.164 direct number or WhatsApp group JID in `match.peer.id`. Field semantics are shared in [ACP Agents](/tools/acp-agents#persistent-channel-bindings).

<Accordion title="Multi-account WhatsApp">

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
      replyToMode: "first", // off | first | all | batched
      linkPreview: true,
      streaming: "partial", // off | partial | block | progress (default: partial)
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

- Bot token: `channels.telegram.botToken` or `channels.telegram.tokenFile` (regular file only; symlinks rejected), with `TELEGRAM_BOT_TOKEN` as fallback for the default account.
- `apiRoot` is the Telegram Bot API root only. Use `https://api.telegram.org` or your self-hosted/proxy root, not `https://api.telegram.org/bot<TOKEN>`; `openclaw doctor --fix` removes an accidental trailing `/bot<TOKEN>` suffix.
- For a self-hosted Bot API server in `--local` mode, `trustedLocalFileRoots` lists host paths OpenClaw may read. Mount the server data volume on the OpenClaw host and configure either its data root or per-token directory; container paths under `/var/lib/telegram-bot-api` are mapped into those roots. Other absolute paths remain rejected.
- Optional `channels.telegram.defaultAccount` overrides default account selection when it matches a configured account id.
- In multi-account setups (2+ account ids), set an explicit default (`channels.telegram.defaultAccount` or `channels.telegram.accounts.default`) to avoid fallback routing; `openclaw doctor` warns when this is missing or invalid.
- `configWrites: false` blocks Telegram-initiated config writes (supergroup ID migrations, `/config set|unset`).
- Top-level `bindings[]` entries with `type: "acp"` configure persistent ACP bindings for forum topics (use canonical `chatId:topic:topicId` in `match.peer.id`). Field semantics are shared in [ACP Agents](/tools/acp-agents#persistent-channel-bindings).
- Telegram stream previews use `sendMessage` + `editMessageText` (works in direct and group chats).
- `network.dnsResultOrder` defaults to `"ipv4first"` to avoid common IPv6 fetch failures.
- Retry policy: see [Retry policy](/concepts/retry).

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
              systemPrompt: "仅限简短回答。",
            },
          },
        },
      },
      historyLimit: 20,
      textChunkLimit: 2000,
      suppressEmbeds: true,
      chunkMode: "length", // length | newline
      streaming: {
        mode: "progress", // off | partial | block | progress (Discord 默认：progress)
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
- `channels.discord.streaming` is the canonical stream mode key. Discord defaults to `streaming.mode: "progress"` so tool/work progress appears in one edited preview message; set `streaming.mode: "off"` to disable it. Legacy `streamMode` and boolean `streaming` values remain runtime aliases; run `openclaw doctor --fix` to rewrite persisted config.
- `channels.discord.autoPresence` maps runtime availability to bot presence (healthy => online, degraded => idle, exhausted => dnd) and allows optional status text overrides.
- `channels.discord.dangerouslyAllowNameMatching` re-enables mutable name/tag matching (break-glass compatibility mode).
- `channels.discord.execApprovals`: Discord-native exec approval delivery and approver authorization.
  - `enabled`: `true`, `false`, or `"auto"` (default). In auto mode, exec approvals activate when approvers can be resolved from `approvers` or `commands.ownerAllowFrom`.
  - `approvers`: Discord user IDs allowed to approve exec requests. Falls back to `commands.ownerAllowFrom` when omitted.
  - `agentFilter`: optional agent ID allowlist. Omit to forward approvals for all agents.
  - `sessionFilter`: optional session key patterns (substring or regex).
  - `target`: where to send approval prompts. `"dm"` (default) sends to approver DMs, `"channel"` sends to the originating channel, `"both"` sends to both. When target includes `"channel"`, buttons are only usable by resolved approvers.
  - `cleanupAfterResolve`: when `true`, deletes approval DMs after approval, denial, or timeout.

**Reaction notification modes:** `off`（无）、`own`（机器人的消息，默认）、`all`（所有消息）、`allowlist`（来自 `guilds.<id>.users` 的所有消息）。

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

- Service account JSON: inline (`serviceAccount`) or file-based (`serviceAccountFile`).
- Service account SecretRef is also supported (`serviceAccountRef`).
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
        C123: { allow: true, requireMention: true, allowBots: false },
        "#general": {
          allow: true,
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

- **Socket mode** requires both `botToken` and `appToken` (`SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN` for default account env fallback).
- **HTTP mode** requires `botToken` plus `signingSecret` (at root or per-account).
- `socketMode` passes Slack SDK Socket Mode transport tuning through to the public Bolt receiver API. Use it only when investigating ping/pong timeout or stale websocket behavior. `clientPingTimeout` defaults to `15000`; `serverPingTimeout` and `pingPongLoggingEnabled` are passed only when configured.
- `botToken`, `appToken`, `signingSecret`, and `userToken` accept plaintext
  strings or SecretRef objects.
- Slack account snapshots expose per-credential source/status fields such as
  `botTokenSource`, `botTokenStatus`, `appTokenStatus`, and, in HTTP mode,
  `signingSecretStatus`. `configured_unavailable` means the account is
  configured through SecretRef but the current command/runtime path could not
  resolve the secret value.
- `configWrites: false` blocks Slack-initiated config writes.
- Optional `channels.slack.defaultAccount` overrides default account selection when it matches a configured account id.
- `channels.slack.streaming.mode` is the canonical Slack stream mode key (default `"partial"`). `channels.slack.streaming.nativeTransport` controls Slack's native streaming transport (default `true`). Legacy `streamMode`, boolean `streaming`, `chunkMode`, `blockStreaming`, `blockStreamingCoalesce`, and `nativeStreaming` values remain runtime aliases; run `openclaw doctor --fix` to rewrite persisted config to `streaming.{mode,chunkMode,block.enabled,block.coalesce,nativeTransport}`.
- `unfurlLinks` and `unfurlMedia` pass Slack's `chat.postMessage` link and media unfurl booleans through for bot replies. `unfurlLinks` defaults to `false` so outbound bot links do not expand inline unless enabled; `unfurlMedia` is omitted unless configured. Set either value at `channels.slack.accounts.<accountId>` to override the top-level value for one account.
- Use `user:<id>` (DM) or `channel:<id>` for delivery targets.

**Reaction notification modes:** `off`、`own`（默认）、`all`、`allowlist`（来自 `reactionAllowlist`）。

**Thread session isolation:** `thread.historyScope` is per-thread (default) or shared across channel. `thread.inheritParent` copies parent channel transcript to new threads. `thread.initialHistoryLimit` (default `20`) caps how many existing thread messages are fetched when a new thread session starts; `0` disables thread history fetching.

- Slack 原生流式以及 Slack 助手风格的“is typing...”线程状态都需要一个回复线程目标。顶层 DM 默认保持非线程，因此它们仍可通过 Slack 草稿式的发送后编辑预览进行流式输出，而不会显示线程式的原生流/状态预览。
- `typingReaction` 会在回复运行期间为入站 Slack 消息添加一个临时 reaction，完成后再移除。请使用 Slack emoji 短码，例如 `"hourglass_flowing_sand"`。
- `channels.slack.execApprovals`：Slack 原生 approval-client 的投递与 exec approver 授权。与 Discord 的 schema 相同：`enabled`（`true`/`false`/`"auto"`）、`approvers`（Slack user IDs）、`agentFilter`、`sessionFilter` 和 `target`（`"dm"`、`"channel"` 或 `"both"`）。当 Slack 插件 approvers 解析成功时，插件审批可以对 Slack 来源请求使用这一原生客户端路径；Slack 原生插件审批投递也可以通过 `approvals.plugin` 为 Slack 来源会话或 Slack 目标启用。插件审批使用来自 `allowFrom` 和默认路由的 Slack 插件 approvers，而不是 exec approvers。

| Action group | 默认 | 说明                  |
| ------------ | ---- | ---------------------- |
| reactions    | enabled | 添加 reaction + 列出 reactions |
| messages     | enabled | 读/发/编辑/删除  |
| pins         | enabled | 置顶/取消置顶/列出         |
| memberInfo   | enabled | 成员信息            |
| emojiList    | enabled | 自定义 emoji 列表      |

### Mattermost

Mattermost installs as a separate plugin, the same way Discord, Slack, and WhatsApp do:

```bash
openclaw plugins install @openclaw/mattermost
```

Check [npmjs.com/package/@openclaw/mattermost](https://www.npmjs.com/package/@openclaw/mattermost) for the current dist-tags before pinning a version.

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
        // 可选的显式 URL，适用于反向代理/公网部署
        callbackUrl: "https://gateway.example.com/api/channels/mattermost/command",
      },
      textChunkLimit: 4000,
      chunkMode: "length",
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
      reactionNotifications: "own", // off | own | all | allowlist
      reactionAllowlist: ["+15551234567", "uuid:123e4567-e89b-12d3-a456-426614174000"],
      historyLimit: 50,
    },
  },
}
```

**Reaction notification modes:** `off`、`own`（默认）、`all`、`allowlist`（来自 `reactionAllowlist`）。

- `channels.signal.account`：将频道启动固定到特定的 Signal 账号身份。
- `channels.signal.configWrites`：允许或拒绝 Signal 触发的配置写入。
- 可选的 `channels.signal.defaultAccount` 会在其与已配置账号 id 匹配时覆盖默认账号选择。

### iMessage

OpenClaw 会启动 `imsg rpc`（通过 stdio 的 JSON-RPC）。不需要守护进程或端口。这是新 OpenClaw iMessage 设置的首选路径，前提是主机可以授予 Messages 数据库和 Automation 权限。

BlueBubbles support was removed. `channels.bluebubbles` is not a supported runtime config surface on current OpenClaw. Migrate old configs to `channels.imessage`; use [BlueBubbles removal and the imsg iMessage path](/announcements/bluebubbles-imessage) for the short version and [Coming from BlueBubbles](/channels/imessage-from-bluebubbles) for the full translation table.

如果 Gateway 没有运行在已登录 Messages 的那台 Mac 上，请保持 `channels.imessage.enabled=true`，并将 `channels.imessage.cliPath` 设置为在那台 Mac 上运行 `imsg "$@"` 的 SSH 包装器。默认的本地 `imsg` 路径仅适用于 macOS。

Before relying on an SSH wrapper for production sends, verify an outbound `imsg send` through that exact wrapper. Some macOS TCC states assign Messages Automation to `/usr/libexec/sshd-keygen-wrapper`, which can make reads and probes work while sends fail with AppleEvents `-1743`; see the SSH wrapper troubleshooting section on [iMessage](/channels/imessage).

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

- Optional `channels.imessage.defaultAccount` overrides default account selection when it matches a configured account id.
- Requires Full Disk Access to the Messages DB.
- Prefer `chat_id:<id>` targets. Use `imsg chats --limit 20` to list chats.
- `cliPath` can point to an SSH wrapper; set `remoteHost` (`host` or `user@host`) for SCP attachment fetching.
- `attachmentRoots` and `remoteAttachmentRoots` restrict inbound attachment paths (default: `/Users/*/Library/Messages/Attachments`).
- SCP uses strict host-key checking, so ensure the relay host key already exists in `~/.ssh/known_hosts`.
- `channels.imessage.configWrites`: allow or deny iMessage-initiated config writes.
- `channels.imessage.sendTransport`: preferred `imsg` RPC send transport for normal outbound replies. `auto` (default) uses the IMCore bridge for existing chats when it is running, then falls back to AppleScript; `bridge` requires private-API delivery; `applescript` forces the public Messages automation path.
- `channels.imessage.actions.*`: enable private API actions that are also gated by `imsg status` / `openclaw channels status --probe`.
- `channels.imessage.includeAttachments` is off by default; set it to `true` before expecting inbound media in agent turns.
- Inbound recovery after a bridge/gateway restart is automatic (GUID dedupe plus a stale-backlog age fence). Existing `channels.imessage.catchup.enabled: true` configs are still honored as a deprecated compatibility profile; `catchup` is disabled by default.
- `channels.imessage.groups`: group registry and per-group settings. With `groupPolicy: "allowlist"`, configure either explicit `chat_id` keys or a `"*"` wildcard entry so group messages can pass the registry gate.
- Top-level `bindings[]` entries with `type: "acp"` can bind iMessage conversations to persistent ACP sessions. Use a normalized handle or explicit chat target (`chat_id:*`, `chat_guid:*`, `chat_identifier:*`) in `match.peer.id`. Shared field semantics: [ACP Agents](/tools/acp-agents#persistent-channel-bindings).

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

- Token auth uses `accessToken`; password auth uses `userId` + `password`.
- `channels.matrix.proxy` routes Matrix HTTP traffic through an explicit HTTP(S) proxy. Named accounts can override it with `channels.matrix.accounts.<id>.proxy`.
- `channels.matrix.network.dangerouslyAllowPrivateNetwork` allows private/internal homeservers. `proxy` and this network opt-in are independent controls.
- `channels.matrix.defaultAccount` selects the preferred account in multi-account setups.
- `channels.matrix.autoJoin` defaults to `"off"`, so invited rooms and fresh DM-style invites are ignored until you set `autoJoin: "allowlist"` with `autoJoinAllowlist` or `autoJoin: "always"`.
- `channels.matrix.execApprovals`: Matrix-native exec approval delivery and approver authorization.
  - `enabled`: `true`, `false`, or `"auto"` (default). In auto mode, exec approvals activate when approvers can be resolved from `approvers` or `commands.ownerAllowFrom`.
  - `approvers`: Matrix user IDs (e.g. `@owner:example.org`) allowed to approve exec requests.
  - `agentFilter`: optional agent ID allowlist. Omit to forward approvals for all agents.
  - `sessionFilter`: optional session key patterns (substring or regex).
  - `target`: where to send approval prompts. `"dm"` (default), `"channel"` (originating room), or `"both"`.
  - Per-account overrides: `channels.matrix.accounts.<id>.execApprovals`.
- `channels.matrix.dm.sessionScope` controls how Matrix DMs group into sessions: `per-user` (default) shares by routed peer, while `per-room` isolates each DM room.
- Matrix status probes and live directory lookups use the same proxy policy as runtime traffic.
- Full Matrix configuration, targeting rules, and setup examples are documented in [Matrix](/channels/matrix).

### Microsoft Teams

Microsoft Teams 由插件支持，并在 `channels.msteams` 下配置。

```json5
{
  channels: {
    msteams: {
      enabled: true,
      configWrites: true,
      // appId, appPassword, tenantId, webhook, team/channel policies:
      // 见 /channels/msteams
    },
  },
}
```

- 此处涵盖的核心键路径：`channels.msteams`、`channels.msteams.configWrites`。
- 完整的 Teams 配置（凭证、webhook、DM/group policy、每团队/每频道覆盖）见 [Microsoft Teams](/channels/msteams)。

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

- 此处涵盖的核心键路径：`channels.irc`、`channels.irc.dmPolicy`、`channels.irc.configWrites`、`channels.irc.nickserv.*`。
- 可选的 `channels.irc.defaultAccount` 会在其与已配置账号 id 匹配时覆盖默认账号选择。
- 完整的 IRC 频道配置（host/port/TLS/channels/allowlists/mention gating）见 [IRC](/channels/irc)。

### Multi-account (all channels)

每个频道可运行多个账号（每个都有自己的 `accountId`）：

```json5
{
  channels: {
    telegram: {
      accounts: {
        default: {
          name: "Primary bot",
          botToken: "123456:ABC...",
        },
        alerts: {
          name: "Alerts bot",
          botToken: "987654:XYZ...",
        },
      },
    },
  },
}
```

- 当省略 `accountId` 时使用 `default`（CLI + 路由）。
- 环境变量 token 仅适用于**默认**账号。
- 基础频道设置适用于所有账号，除非按账号覆盖。
- 使用 `bindings[].match.accountId` 将每个账号路由到不同的 agent。
- 如果你在仍处于单账号顶层频道配置时，通过 `openclaw channels add`（或 channel onboarding）添加非默认账号，OpenClaw 会先把账号作用域的顶层单账号值提升到频道账号映射中，这样原始账号仍可继续工作。大多数频道会将它们移动到 `channels.<channel>.accounts.default`；Matrix 也可以改为保留现有匹配的 named/default 目标。
- 现有的仅频道绑定（没有 `accountId`）会继续匹配默认账号；账号作用域绑定仍然是可选的。
- `openclaw doctor --fix` 也会通过把账号作用域的顶层单账号值移动到该频道选定的提升账号来修复混合结构。大多数频道使用 `accounts.default`；Matrix 也可以保留现有匹配的 named/default 目标。

### Other plugin channels

Many plugin channels are configured as `channels.<id>` and documented in their dedicated channel pages (for example Feishu, LINE, Nextcloud Talk, Nostr, QQ Bot, Synology Chat, Twitch, and Zalo).
See the full channel index: [Channels](/channels).

### Group chat mention gating

群组消息默认需要**提及**（元数据提及或安全正则模式）。适用于 WhatsApp、Telegram、Discord、Google Chat 和 iMessage 群聊。

Visible replies are controlled separately. Normal group, channel, and internal WebChat direct requests default to automatic final delivery: final assistant text posts through the legacy visible reply path. Opt into `messages.visibleReplies: "message_tool"` or `messages.groupChat.visibleReplies: "message_tool"` when visible output should only post after the agent calls `message(action=send)`. If the model returns final text without calling the message tool in an opted-in tool-only mode, that final text stays private and the gateway verbose log records suppressed payload metadata.

Tool-only visible replies require a model/runtime that reliably calls tools, and are recommended for shared ambient rooms on latest-generation models such as GPT 5.5. Some weaker models can answer final text but fail to understand that source-visible output must be sent with `message(action=send)`. For those models, use `"automatic"` so the final assistant turn is the visible reply path. If the session log shows assistant text with `didSendViaMessagingTool: false`, the model produced private final text instead of calling the message tool. Switch to a stronger tool-calling model for that channel, inspect the gateway verbose log for the suppressed payload summary, or set `messages.groupChat.visibleReplies: "automatic"` to use visible final replies for every group/channel request.

如果在当前工具策略下 message tool 不可用，OpenClaw 会回退到自动可见回复，而不是静默抑制响应。`openclaw doctor` 会对这种不匹配发出警告。

This rule applies to normal agent final text. Plugin-owned conversation bindings use the owning plugin's returned reply as the visible response for claimed bound-thread turns; the plugin does not need to call `message(action=send)` for those binding replies.

**Troubleshooting: group @mention triggers typing then silence (no error)**

症状：在群组/频道中 @mention 后出现 typing 指示，gateway log 报告 `dispatch complete (queuedFinal=false, replies=0)`，但房间里没有消息落地。对同一 agent 的 DM 则正常回复。

Cause: the group/channel visible-reply mode resolves to `"message_tool"`, so OpenClaw runs the turn but suppresses the final assistant text unless the agent calls `message(action=send)`. There is no `NO_REPLY` contract in this mode; no message-tool call means no source reply. There is no error because suppression is the configured behavior. Normal group and channel turns default to `"automatic"`, so this symptom only appears when `messages.groupChat.visibleReplies` (or global `messages.visibleReplies`) is explicitly set to `"message_tool"`. Harness `defaultVisibleReplies` does not apply here — the group/channel resolver ignores it; it only affects direct/source chats (the Codex harness suppresses direct-chat finals that way).

修复方法：选择更强的工具调用模型，移除显式的 `"message_tool"` 覆盖以回退到 `"automatic"` 默认值，或者将 `messages.groupChat.visibleReplies: "automatic"` 设为对每个群组/频道请求强制可见回复。gateway 在文件保存后会热重载 `messages` 配置；只有在部署中禁用了文件监控或配置重载时，才需要重启 gateway。

**提及类型：**

- **元数据提及**：原生平台 @-mentions。在 WhatsApp self-chat mode 中会被忽略。
- **文本模式**：`agents.list[].groupChat.mentionPatterns` 中的安全正则模式。无效模式和不安全的嵌套重复会被忽略。
- 只有在能够检测到时才会强制提及门控（原生 mentions 或至少一个模式）。

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

`messages.visibleReplies` is the global source-event default; `messages.groupChat.visibleReplies` overrides it for group/channel source events. When `messages.visibleReplies` is unset, direct/source chats use the selected runtime or harness default, but internal WebChat direct turns use automatic final delivery for Pi/Codex prompt parity. Set `messages.visibleReplies: "message_tool"` to intentionally require `message(action=send)` for visible output. Channel allowlists and mention gating still decide whether an event is processed.

#### DM history limits

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

解析顺序：每 DM 覆盖 → provider 默认值 → 无限制（全部保留）。

This resolver reads `channels.<provider>.dmHistoryLimit` and `channels.<provider>.dms.<id>.historyLimit` for any channel whose session key follows the standard `provider:direct:<id>` (or legacy `provider:dm:<id>`) shape, so it works across bundled and plugin channels alike, not just a fixed list.

#### Self-chat mode

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

### Commands (chat command handling)

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
    restart: true, // 允许 /restart + gateway restart tool
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

- 该块用于配置命令表面。当前内置 + 捆绑的命令目录请参见 [Slash Commands](/tools/slash-commands)。
- 本页是**配置键参考**，不是完整的命令目录。由频道/插件拥有的命令，如 QQ Bot 的 `/bot-ping` `/bot-help` `/bot-logs`、LINE 的 `/card`、设备配对 `/pair`、memory 的 `/dreaming`、手机控制 `/phone` 和 Talk 的 `/voice`，都记录在各自的频道/插件页面以及 [Slash Commands](/tools/slash-commands) 中。
- 文本命令必须是**独立**消息，且以 `/` 开头。
- `native: "auto"` 会为 Discord/Telegram 打开原生命令，Slack 仍关闭。
- `nativeSkills: "auto"` 会为 Discord/Telegram 打开原生技能命令，Slack 仍关闭。
- 每频道覆盖：`channels.discord.commands.native`（bool 或 `"auto"`）。对于 Discord，`false` 会在启动期间跳过原生命令注册和清理。
- 通过 `channels.<provider>.commands.nativeSkills` 覆盖每个频道的原生技能注册。
- `channels.telegram.customCommands` 会增加额外的 Telegram bot 菜单项。
- `bash: true` 会为主机 shell 启用 `! <cmd>`。要求 `tools.elevated.enabled` 且发送者在 `tools.elevated.allowFrom.<channel>` 中。
- `config: true` 会启用 `/config`（读/写 `openclaw.json`）。对于 gateway `chat.send` 客户端，持久化的 `/config set|unset` 写入还需要 `operator.admin`；只读 `/config show` 仍对普通写权限范围的 operator 客户端可用。
- `mcp: true` 会启用 `/mcp`，用于操作 `mcp.servers` 下由 OpenClaw 管理的 MCP server 配置。
- `plugins: true` 会启用 `/plugins`，用于插件发现、安装和启用/禁用控制。
- `channels.<provider>.configWrites` 按频道限制配置变更（默认：true）。
- 对于多账号频道，`channels.<provider>.accounts.<id>.configWrites` 也会限制目标为该账号的写入（例如 `/allowlist --config --account <id>` 或 `/config set channels.<provider>.accounts.<id>...`）。
- `restart: false` 会禁用 `/restart` 和 gateway restart tool 操作。默认：`true`。
- `ownerAllowFrom` 是 owner-only 命令和 owner-gated 频道操作的显式 owner allowlist。它与 `allowFrom` 分开。
- `ownerDisplay: "hash"` 会在系统提示词中对 owner id 进行哈希。设置 `ownerDisplaySecret` 以控制哈希方式。
- `allowFrom` 是按 provider 设置的。当其被设置时，它是**唯一**授权来源（会忽略频道 allowlists/pairing 和 `useAccessGroups`）。
- `useAccessGroups: false` 允许命令在未设置 `allowFrom` 时绕过 access-group 策略。
- 命令文档映射：
  - 内置 + 捆绑目录：[Slash Commands](/tools/slash-commands)
  - 频道特定命令表面：[Channels](/channels)
  - QQ Bot 命令：[QQ Bot](/channels/qqbot)
  - 配对命令：[Pairing](/channels/pairing)
  - LINE card 命令：[LINE](/channels/line)
  - memory dreaming：[Dreaming](/concepts/dreaming)

</Accordion>

---

## 相关内容

- [配置参考](/gateway/configuration-reference) — 顶级键
- [配置 — 代理](/gateway/config-agents)
- [渠道概览](/channels)
