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

Use `channels.defaults` to set shared group-policy and heartbeat behavior across providers:

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

- `channels.defaults.groupPolicy`: fallback group policy used when a provider-level `groupPolicy` is not set.
- `channels.defaults.contextVisibility`: default supplemental context visibility mode for all channels. Values: `all` (default, includes all quoted/thread/history context), `allowlist` (includes only context from allowlist senders), `allowlist_quote` (same as allowlist, but preserves explicit quote/reply context). Can be overridden per channel: `channels.<channel>.contextVisibility`.
- `channels.defaults.heartbeat.showOk`: include healthy channel states in heartbeat output (default `false`).
- `channels.defaults.heartbeat.showAlerts`: include degraded/error states in heartbeat output (default `true`).
- `channels.defaults.heartbeat.useIndicator`: render heartbeat output in a compact indicator style (default `true`).

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
      maxAttempts: 12, // 0 = 永久重试
    },
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

- `web.whatsapp.keepAliveIntervalMs`（默认 `25000`）、`connectTimeoutMs`（默认 `60000`）以及 `defaultQueryTimeoutMs`（默认 `60000`）用于调优 Baileys socket。
- `web.reconnect` 默认值：`initialMs: 2000`、`maxMs: 30000`、`factor: 1.8`、`jitter: 0.25`、`maxAttempts: 12`。`maxAttempts: 0` 表示永远重试，而不是放弃。
- 顶层 `bindings[]` 中 `type: "acp"` 的条目用于为 WhatsApp 私信和群组配置持久化 ACP 绑定。在 `match.peer.id` 中使用 E.164 直拨号码或 WhatsApp 群组 JID。字段语义见 [ACP Agents](/tools/acp-agents#persistent-channel-bindings)。

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

- Token：`channels.discord.token`，默认账号可回退使用 `DISCORD_BOT_TOKEN`。
- 提供显式 Discord `token` 的直接外发调用会使用该 token；账号重试/策略设置仍来自当前运行时快照中选定的账号。
- 可选的 `channels.discord.defaultAccount` 在匹配已配置的账号 ID 时会覆盖默认账号选择。
- 使用 `user:<id>`（DM）或 `channel:<id>`（公会频道）作为投递目标；纯数字 ID 会被拒绝。
- 公会 slug 使用小写，空格替换为 `-`；频道键使用 slug 化后的名称（不带 `#`）。优先使用公会 ID。
- 默认忽略机器人发出的消息。`allowBots: true` 可启用；使用 `allowBots: "mentions"` 仅接受提及机器人的机器人消息（自身消息仍会过滤）。
- 支持机器人发起入站消息的频道可使用共享的 [bot 循环保护](/channels/bot-loop-protection)。设置 `channels.defaults.botLoopProtection` 作为基础配对预算，然后仅在某个表面需要不同限制时再覆盖频道或账号。
- `channels.discord.guilds.<id>.ignoreOtherMentions`（以及频道覆盖项）会丢弃提及其他用户或角色但没有提及机器人的消息（不包括 @everyone/@here）。
- `channels.discord.mentionAliases` 会在发送前把稳定的外发 `@handle` 文本映射到 Discord 用户 ID，因此即使临时目录缓存为空，也能确定性地提及已知队友。每账号覆盖项位于 `channels.discord.accounts.<accountId>.mentionAliases`。
- `maxLinesPerMessage`（默认 `17`）会在消息长度未超过 2000 字符时，也将过高的消息拆分。
- `channels.discord.suppressEmbeds` 默认是 `true`，因此外发 URL 不会展开为 Discord 链接预览，除非将其禁用。显式的 `embeds` 负载仍会正常发送；每条消息的工具调用可通过 `suppressEmbeds` 覆盖。
- `channels.discord.threadBindings` 控制 Discord 线程绑定路由：
  - `enabled`：线程绑定会话功能的 Discord 覆盖项（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`，以及绑定投递/路由）
  - `idleHours`：空闲后自动取消聚焦的小时数 Discord 覆盖项（`0` 为禁用）
  - `maxAgeHours`：硬性最大时长（小时）的 Discord 覆盖项（`0` 为禁用）
  - `spawnSessions`：`sessions_spawn({ thread: true })` 和 ACP 线程创建自动绑定的开关（默认：`true`）
  - `defaultSpawnContext`：线程绑定 spawn 的原生子代理上下文（默认 `"fork"`）
- 顶层 `bindings[]` 中 `type: "acp"` 的条目会为频道和线程配置持久化的 ACP 绑定（在 `match.peer.id` 中使用频道/线程 id）。字段语义与 [ACP Agents](/tools/acp-agents#persistent-channel-bindings) 共用。
- `channels.discord.ui.components.accentColor` 为 Discord components v2 容器设置强调色。
- `channels.discord.agentComponents.ttlMs` 控制已发送的 Discord 组件回调保持注册的时长。默认 `1800000`（30 分钟），最大 `86400000`（24 小时）。每账号覆盖项位于 `channels.discord.accounts.<accountId>.agentComponents.ttlMs`。优先选择满足工作流的最短 TTL。
- `channels.discord.voice` 启用 Discord 语音频道会话以及可选的自动加入 + LLM + TTS 覆盖项。仅文本 Discord 配置默认关闭语音；设置 `channels.discord.voice.enabled=true` 以启用。
- `channels.discord.voice.model` 可选地覆盖用于 Discord 语音频道响应的 LLM 模型。
- `channels.discord.voice.daveEncryption`（默认 `true`）和 `channels.discord.voice.decryptionFailureTolerance`（默认 `24`）会传递给 `@discordjs/voice` 的 DAVE 选项。
- `channels.discord.voice.connectTimeoutMs` 控制 `/vc join` 和自动加入尝试时，`@discordjs/voice` 初始 Ready 等待时间（默认 `30000`）。
- `channels.discord.voice.reconnectGraceMs` 控制断开的语音会话在 OpenClaw 销毁之前，进入重连信号阶段所允许的时间（默认 `15000`）。
- Discord 语音播放不会因其他用户开始说话事件而中断。为避免反馈回路，OpenClaw 在 TTS 播放时会忽略新的语音捕获。
- OpenClaw 还会在多次解密失败后，通过离开/重新加入语音会话来尝试恢复语音接收。
- `channels.discord.streaming` 是标准的流模式键。Discord 默认 `streaming.mode: "progress"`，因此工具/工作进度会显示在一条已编辑的预览消息中；设置 `streaming.mode: "off"` 可禁用。旧的扁平键（`streamMode`、`chunkMode`、`blockStreaming`、`draftChunk`、`blockStreamingCoalesce`）在运行时不再读取；请运行 `openclaw doctor --fix` 迁移持久化配置。
- `channels.discord.autoPresence` 将运行时可用性映射为机器人状态（healthy => online，degraded => idle，exhausted => dnd），并允许可选的状态文本覆盖。
- `channels.discord.guilds.<id>.presenceEvents` 会将人类可用性到达路由到一个配置好的 Discord 频道，作为代理系统事件。它会从完整的 `GUILD_CREATE` 快照中为当前在线成员建立种子，路由观测到的离线到在线转换，并将首次后续出现的、此前未见成员的在线信号视为新可用，而不判断其是上线还是在快照后加入。超过 Discord 75,000 成员快照限制的公会需要先有一个显式的离线更新。它需要 `channels.discord.intents.presence=true`、Discord 开发者门户中的特权 Presence Intent，以及已启用的代理心跳。
- `channels.discord.dangerouslyAllowNameMatching` 会重新启用可变名称/标签匹配（紧急兼容模式）。
- `channels.discord.execApprovals`：Discord 原生的执行审批投递和审批者授权。
  - `enabled`：`true`、`false` 或 `"auto"`（默认）。在自动模式下，当可从 `approvers` 或 `commands.ownerAllowFrom` 中解析出审批者时，执行审批会激活。
  - `approvers`：允许批准执行请求的 Discord 用户 ID。若省略，则回退到 `commands.ownerAllowFrom`。
  - `agentFilter`：可选的代理 ID 白名单。省略则转发所有代理的审批。
  - `sessionFilter`：可选的会话键模式（子串或正则）。
  - `target`：审批提示发送位置。`"dm"`（默认）发送到审批者的 DM，`"channel"` 发送到原始频道，`"both"` 同时发送到两者。当前者包含 `"channel"` 时，按钮仅允许已解析的审批者使用。
  - `cleanupAfterResolve`：为 `true` 时，在批准、拒绝或超时后删除审批 DM。

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

- 服务账号 JSON：内联（`serviceAccount`）或基于文件（`serviceAccountFile`）。
- 也支持服务账号 SecretRef（`serviceAccountRef`）。
- 环境变量回退：`GOOGLE_CHAT_SERVICE_ACCOUNT` 或 `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE`（仅默认账号）。
- 投递目标请使用 `spaces/<spaceId>` 或 `users/<userId>`。
- `channels.googlechat.dangerouslyAllowNameMatching` 会重新启用可变邮箱主体匹配（破窗兼容模式）。

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

- **Socket 模式** 需要同时提供 `botToken` 和 `appToken`（默认账号环境回退使用 `SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN`）。
- **HTTP 模式** 需要 `botToken` 以及 `signingSecret`（位于根级或按账号配置）。
- `enterpriseOrgInstall: true` 会将某个账号启用到 Slack Enterprise Grid
  组织级事件路径。启动时会通过 `auth.test` 验证 bot token，并在
  配置模式与 Slack 的安装身份不匹配时失败。
  企业版私信必须禁用，或使用 `dmPolicy: "open"` 并配合有效的
  `allowFrom: ["*"]`。频道和用户策略必须使用稳定的 Slack ID；
  可变名称和不受支持的频道前缀会导致启动失败。V1 仅处理
  直接的 Socket Mode 或 HTTP `message` 和 `app_mention` 事件，并立即
  回复；中继、命令、交互、App Home、reaction 事件监听器、
  置顶、action tools、原生审批、bindings、延迟投递，以及
  主动发送均不可用。监听器拥有的确认、输入中状态以及
  状态 reaction 仍可通过 `reactions:write` 使用；入站 reaction
  通知和 reaction action tools 不可用。请参阅
  [Enterprise Grid 组织级安装](/channels/slack#enterprise-grid-org-wide-installs)
  了解最小权限 manifest、设置流程和完整限制。
- `socketMode` 会将 Slack SDK Socket Mode 传输调优参数透传到公开的 Bolt receiver API。仅在排查 ping/pong 超时或 websocket 陈旧行为时使用。`clientPingTimeout` 默认值为 `15000`；仅在配置后才会传递 `serverPingTimeout` 和 `pingPongLoggingEnabled`。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 可接受明文
  字符串或 SecretRef 对象。
- Slack 账号快照会暴露每个凭据的来源/状态字段，例如
  `botTokenSource`、`botTokenStatus`、`appTokenStatus` 以及在 HTTP 模式下的
  `signingSecretStatus`。`configured_unavailable` 表示账号已通过 SecretRef
  配置，但当前命令/运行时路径无法解析该 secret 值。
- `configWrites: false` 会阻止 Slack 发起的配置写入。
- 可选的 `channels.slack.defaultAccount` 会在与已配置账号 id 匹配时覆盖默认账号选择。
- `channels.slack.streaming.mode` 是 Slack 流式模式的规范键（默认 `"partial"`）。`channels.slack.streaming.nativeTransport` 控制 Slack 原生流式传输（默认 `true`）。旧的 `streamMode`、布尔值 `streaming`、`chunkMode`、`blockStreaming`、`blockStreamingCoalesce` 和 `nativeStreaming` 运行时不再读取；请运行 `openclaw doctor --fix` 将持久化配置迁移到 `streaming.{mode,chunkMode,block.enabled,block.coalesce,nativeTransport}`。
- `unfurlLinks` 和 `unfurlMedia` 会将 Slack `chat.postMessage` 的链接和媒体 unfurl 布尔值传递给 bot 回复。`unfurlLinks` 默认是 `false`，因此除非启用，否则外发 bot 链接不会在消息内展开；`unfurlMedia` 在未配置时会被省略。将任一值设置在 `channels.slack.accounts.<accountId>` 上，可为单个账号覆盖顶层值。
- 使用 `user:<id>`（私信）或 `channel:<id>` 作为投递目标。

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

可见回复是单独控制的。普通群组、频道和内部 WebChat 直接请求默认采用自动最终交付：最终助手文本会通过旧的可见回复路径发布。若希望可见输出仅在代理调用 `message(action=send)` 之后才发布，请启用 `messages.visibleReplies: "message_tool"` 或 `messages.groupChat.visibleReplies: "message_tool"`。如果模型在启用了仅工具模式后返回了实质性的最终答案却没有调用 message 工具，那么该最终文本会保持私有，gateway 详细日志会记录被抑制的载荷元数据，OpenClaw 会排队一次恢复重试，要求模型通过 `message(action=send)` 交付相同回复。

仅工具可见回复要求模型/运行时能够可靠调用工具，并建议用于最新一代模型上的共享环境房间，例如 GPT-5.6 Sol。某些较弱模型可以生成最终文本，但无法理解源可见输出必须通过 `message(action=send)` 发送。对于常见的“最终答案滞留”情况，OpenClaw 默认只会在以下条件下进行恢复：最终内容足够实质、源 turn 不是房间事件、发送策略没有拒绝交付、且没有已经发送的源回复。恢复最多只进行一次重试；它会抑制合成重试提示的持久化，并让该重试不进入 collect 批处理，因此不会与无关的排队提示合并。如果重试后仍然滞留或无法入队，OpenClaw 只会交付一条经过净化的诊断信息，例如 “我生成了一条回复，但无法将其发送到此聊天中。请重试。” 原始的私有最终文本绝不会被标记为自动源交付。对于持续出现回复滞留的模型，请使用 `"automatic"`，这样最终助手轮次就会走可见回复路径；或者切换到更强的工具调用模型；或者检查 gateway 详细日志中的被抑制载荷摘要；又或者设置 `messages.groupChat.visibleReplies: "automatic"`，让所有群组/频道请求都使用可见最终回复。

如果在当前工具策略下 message tool 不可用，OpenClaw 会回退到自动可见回复，而不是静默抑制响应。`openclaw doctor` 会对这种不匹配发出警告。

此规则适用于普通代理最终文本。插件拥有的会话绑定会将所属插件返回的回复作为已声明绑定线程轮次的可见响应；对于这些绑定回复，插件无需调用 `message(action=send)`。

**故障排查：群组 @mention 触发 typing 后沉默（无错误）**

症状：在群组/频道中 @mention 后出现 typing 指示，gateway log 报告 `dispatch complete (queuedFinal=false, replies=0)`，但房间里没有消息落地。对同一 agent 的 DM 则正常回复。

原因：群组/频道可见回复模式被解析为 `"message_tool"`，因此 OpenClaw 会运行该轮次，但除非代理调用 `message(action=send)`，否则会抑制最终助手文本。此模式下没有 `NO_REPLY` 合同；没有 message-tool 调用就意味着原始最终文本是私有的。对于实质性的源 turn，OpenClaw 现在会尝试一次受保护的恢复重试；简短备注、明确静默、房间事件、发送策略拒绝的轮次，以及已经交付的轮次都不会重试。普通群组和频道轮次默认是 `"automatic"`，因此只有当 `messages.groupChat.visibleReplies`（或全局 `messages.visibleReplies`）被显式设置为 `"message_tool"` 时才会出现这种症状。Harness 的 `defaultVisibleReplies` 在这里不适用——group/channel resolver 会忽略它；它只影响 direct/source chats（Codex harness 会以这种方式抑制 direct-chat 的最终回复）。

修复方法：要么选择更强的工具调用模型，要么移除显式的 `"message_tool"` 覆盖以回退到 `"automatic"` 默认值，或者设置 `messages.groupChat.visibleReplies: "automatic"`，以强制所有群组/频道请求都使用可见回复。实质性的滞留最终答案现在不应再以静默成功结束；它要么会通过一次 `message(action=send)` 重试恢复，要么会显示经过净化的交付失败诊断。gateway 会在文件保存后热重载 `messages` 配置；只有在部署中禁用了文件监视或配置重载时才需要重启 gateway。

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
