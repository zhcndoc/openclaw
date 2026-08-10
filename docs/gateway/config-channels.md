---
summary: "频道配置：访问控制、配对、跨 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 等的每频道密钥"
read_when:
  - 配置频道插件（认证、访问控制、多账号）
  - 排查每频道配置键
  - 审计 DM 策略、群组策略或提及门控
title: "配置 — channels"
---

`channels.*` 下的每频道配置键：DM 和群组访问、多账号设置、提及门控，以及适用于 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 和其他频道插件的每频道密钥。

有关 agents、tools、gateway runtime 以及其他顶层键，请参见 [配置参考](/gateway/configuration-reference)。

## 渠道

每个渠道在其配置部分存在时都会自动启动（除非设置了 `enabled: false`）。Telegram 已内置于核心 `openclaw` 软件包中。其他官方渠道（iMessage、Discord、Slack、WhatsApp、Matrix、Microsoft Teams、IRC、Google Chat、Signal、Mattermost 等）都作为独立插件安装，使用 `openclaw plugins install <spec>`；完整列表和安装规格请参阅[渠道](/channels)。

### 私信和群组访问

所有频道都支持私信策略和群组策略：

| 私信策略             | 行为                                                           |
| ------------------- | -------------------------------------------------------------- |
| `pairing`（默认）    | 未知发送者会得到一次性配对码；所有者必须批准 |
| `allowlist`         | 仅允许 `allowFrom`（或已配对的 allow store）中的发送者             |
| `open`              | 允许所有入站私信（需要 `allowFrom: ["*"]`）             |
| `disabled`          | 忽略所有入站私信                                          |

| 群组策略              | 行为                                               |
| --------------------- | ------------------------------------------------------ |
| `allowlist`（默认）    | 仅允许与已配置 allowlist 匹配的群组          |
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

| 频道     | 私信键形式              | 示例                                         |
| -------- | --------------------- | -------------------------------------------- |
| Discord  | 原始用户 ID            | `987654321`                                  |
| 飞书     | `feishu:ou_...`       | `feishu:ou_a8b6cab7e945387de5f253775d9b4d85` |
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

仅适用于私信的键只会匹配直接消息对话；它们不会影响群组/线程路由。

### 频道默认设置与心跳

使用 `channels.defaults` 配置跨提供商共享的群组策略、隐式提及和心跳行为：

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
      heartbeatVisibility: {
        showOk: false,
        showAlerts: true,
        useIndicator: true,
      },
    },
  },
}
```

- `channels.defaults.groupPolicy`：当提供商级别的 `groupPolicy` 未设置时使用的备用群组策略。
- `channels.defaults.contextVisibility`：所有频道的默认补充上下文可见性模式。可选值：`all`（默认，包含所有引用/线程/历史上下文）、`allowlist`（仅包含来自允许列表发送者的上下文）、`allowlist_quote`（与 allowlist 相同，但保留明确的引用/回复上下文）。可按频道覆盖：`channels.<channel>.contextVisibility`。
- `channels.defaults.implicitMentions`：控制哪些受支持的入站事实被视为提及。`replyToBot`、`quotedBot` 和 `threadParticipation` 默认均为 `true`，以保持当前行为。可通过 `channels.<channel>.implicitMentions` 按频道覆盖，或通过 `channels.<channel>.accounts.<id>.implicitMentions` 按账户覆盖；每个标志分别按照账户 -> 频道 -> 默认值解析。这些名称表示启用状态：将标志设为 `false` 可阻止相应事实绕过提及门控。原生的明确提及始终允许；如果频道不会产生相应事实，标志也不会产生任何影响。有关当前生产者矩阵，请参阅[提及门控](/channels/groups#mention-gating-default)。这些设置不会更改出站回复/线程模式或已授权的命令处理。
- `channels.defaults.heartbeatVisibility.showOk`：在心跳输出中包含运行正常的频道状态（默认值为 `false`）。
- `channels.defaults.heartbeatVisibility.showAlerts`：在心跳输出中包含降级/错误状态（默认值为 `true`）。
- `channels.defaults.heartbeatVisibility.useIndicator`：以紧凑的指示器样式呈现心跳输出（默认值为 `true`）。

### WhatsApp

WhatsApp 通过网关的 Web 渠道（Baileys Web）运行。只要存在已链接的会话，就会自动启动。

```json5
{
  web: {
    enabled: true,
  },
  channels: {
    whatsapp: {
      dmPolicy: "pairing", // 配对 | 允许列表 | 开放 | 禁用
      allowFrom: ["+15555550123", "+447700900123"],
      textChunkLimit: 4000,
      streaming: { chunkMode: "length" }, // 按长度 | 按换行符
      mediaMaxMb: 50,
      sendReadReceipts: true, // 已读回执（自聊模式下为 false）
      groups: {
        "*": { requireMention: true },
      },
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
    },
  },
}
```

- 顶层的 `bindings[]` 条目通过 `type: "acp"` 为 WhatsApp 私信和群组配置持久化 ACP 绑定。在 `match.peer.id` 中使用 E.164 格式的直接号码或 WhatsApp 群组 JID。字段语义请参阅 [ACP 代理](/tools/acp-agents#persistent-channel-bindings)。

<Accordion title="多账号 WhatsApp">

```json5
{
  channels: {
    whatsapp: {
      accounts: {
        default: {},
        personal: {},
        biz: {
          // 认证目录："~/.openclaw/credentials/whatsapp/biz",
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

- 机器人令牌：`channels.telegram.botToken` 或 `channels.telegram.tokenFile`（仅限普通文件；拒绝符号链接），默认账号可回退使用 `TELEGRAM_BOT_TOKEN`。
- `apiRoot` 仅用于 Telegram Bot API 根地址。请使用 `https://api.telegram.org` 或你自托管/代理的根地址，不要使用 `https://api.telegram.org/bot<TOKEN>`；`openclaw doctor --fix` 会移除意外追加的 `/bot<TOKEN>` 后缀。
- 对于 `--local` 模式下的自托管 Bot API 服务器，`trustedLocalFileRoots` 列出 OpenClaw 允许读取的主机路径。请将服务器数据卷挂载到 OpenClaw 主机，并配置其数据根目录或按令牌的目录；`/var/lib/telegram-bot-api` 下的容器路径会映射到这些根目录中。其他绝对路径仍会被拒绝。
- 可选的 `channels.telegram.defaultAccount` 会在匹配到已配置账号 ID 时覆盖默认账号选择。
- 在多账号设置（2+ 个账号 ID）中，请设置明确的默认值（`channels.telegram.defaultAccount` 或 `channels.telegram.accounts.default`），以避免回退路由；当缺失或无效时，`openclaw doctor` 会发出警告。
- `configWrites: false` 会阻止 Telegram 触发的配置写入（超级群组 ID 迁移、`/config set|unset`）。
- 顶层的 `bindings[]` 条目若 `type: "acp"`，则为论坛主题配置持久化 ACP 绑定（在 `match.peer.id` 中使用规范的 `chatId:topic:topicId`）。字段语义详见 [ACP 代理](/tools/acp-agents#persistent-channel-bindings)。
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
      replyToMode: "off", // off | first | all | batch
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
            general: { enabled: true },
            help: {
              enabled: true,
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
        mode: "progress", // 显式启用；Discord 默认关闭
        chunkMode: "length", // length | newline
        progress: {
          label: "auto",
          maxLines: 8,
          maxLineChars: 120,
          toolProgress: true,
        },
      },
      maxLinesPerMessage: 17,
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
          providers: { openai: { speakerVoice: "alloy" } },
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
    },
  },
}
```

- Token：`channels.discord.token`；对于默认账户，如果未设置，则回退使用 `DISCORD_BOT_TOKEN`。
- 直接出站调用如果提供了显式的 Discord `token`，则该调用使用此令牌；账户策略设置仍来自活动运行时快照中选定的账户。
- 可选的 `channels.discord.defaultAccount` 会在其与已配置的账户 ID 匹配时覆盖默认账户选择。
- 使用 `user:<id>`（私信）或 `channel:<id>`（服务器频道）作为投递目标；不带前缀的纯数字 ID 会被拒绝。
- 服务器 slug 为小写形式，空格替换为 `-`；频道键使用经过 slug 化的名称（不含 `#`）。建议优先使用服务器 ID。
- 默认情况下会忽略机器人发送的消息。`allowBots: true` 可启用此类消息；使用 `allowBots: "mentions"` 可仅接受提及该机器人的机器人消息（机器人自身的消息仍会被过滤）。
- 支持机器人发送的入站消息的频道可以使用共享的[机器人循环保护](/channels/bot-loop-protection)。设置 `channels.defaults.botLoopProtection` 以配置基础的成对预算，然后仅在某个界面需要不同限制时覆盖频道或账户设置。
- `channels.discord.guilds.<id>.ignoreOtherMentions`（以及频道覆盖设置）会丢弃提及其他用户或角色但未提及机器人的消息（不包括 @everyone/@here）。
- `channels.discord.mentionAliases` 会在发送前将稳定的出站 `@handle` 文本映射为 Discord 用户 ID，因此即使临时目录缓存为空，也能确定性地提及已知队友。每个账户的覆盖设置位于 `channels.discord.accounts.<accountId>.mentionAliases` 下。
- `maxLinesPerMessage`（默认值为 `17`）会拆分过高的消息，即使消息长度小于 2000 个字符。
- `channels.discord.suppressEmbeds` 默认为 `true`，因此出站 URL 不会展开为 Discord 链接预览，除非禁用此设置。显式的 `embeds` 载荷仍会正常发送；每次消息的工具调用都可以通过 `suppressEmbeds` 覆盖此设置。
- `channels.discord.threadBindings` 控制 Discord 线程绑定的路由：
  - `enabled`：Discord 对线程绑定会话功能的覆盖设置（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 以及绑定的投递/路由）
  - `idleHours`：Discord 对不活跃自动取消聚焦时间的覆盖设置，单位为小时（`0` 表示禁用）
  - `maxAgeHours`：Discord 对最大有效时长的覆盖设置，单位为小时（`0` 表示禁用）
  - `spawnSessions`：用于控制 `sessions_spawn({ thread: true })` 以及 ACP 线程生成时自动创建/绑定线程的开关（默认值：`true`）
  - `defaultSpawnContext`：线程绑定生成任务使用的原生子代理上下文（默认为 `"fork"`）
- 顶层的 `bindings[]` 条目中，`type: "acp"` 用于为频道和线程配置持久 ACP 绑定（在 `match.peer.id` 中使用频道/线程 ID）。字段语义请参阅 [ACP 代理](/tools/acp-agents#persistent-channel-bindings)。
- `channels.discord.agentComponents.ttlMs` 控制已发送的 Discord 组件回调保持注册的时长。默认值为 `1800000`（30 分钟），最大值为 `86400000`（24 小时）。每个账户的覆盖设置位于 `channels.discord.accounts.<accountId>.agentComponents.ttlMs` 下。建议使用满足工作流需求的最短 TTL。
- `channels.discord.voice` 启用 Discord 语音频道对话，以及可选的自动加入、LLM 和 TTS 覆盖设置。纯文本 Discord 配置默认关闭语音功能；设置 `channels.discord.voice.enabled=true` 可选择启用。
- `channels.discord.voice.model` 可选地覆盖用于 Discord 语音频道响应的 LLM 模型。
- `channels.discord.voice.daveEncryption`（默认值为 `true`）和 `channels.discord.voice.decryptionFailureTolerance`（默认值为 `24`）会传递给 `@discordjs/voice` 的 DAVE 选项。
- `channels.discord.voice.connectTimeoutMs` 控制 `/vc join` 和自动加入尝试等待 `@discordjs/voice` 就绪的初始时长（默认值为 `30000`）。
- `channels.discord.voice.reconnectGraceMs` 控制断开的语音会话在 OpenClaw 销毁它之前进入重新连接信令的等待时长（默认值为 `15000`）。
- Discord 语音播放不会因其他用户开始说话的事件而中断。为避免反馈循环，TTS 播放期间 OpenClaw 会忽略新的语音采集。
- OpenClaw 还会尝试恢复语音接收：在重复解密失败后离开并重新加入语音会话。
- `channels.discord.streaming` 是规范的流模式键。Discord 预览流默认为 `off`；设置 `streaming.mode: "progress"` 可选择启用一条经过编辑的工具/工作进度消息，或选择 `partial` 或 `block` 来显示回答预览。旧版扁平键（`streamMode`、`chunkMode`、`blockStreaming`、`draftChunk`、`blockStreamingCoalesce`）在运行时不再读取；运行 `openclaw doctor --fix` 以迁移已持久化的配置。
- `channels.discord.autoPresence` 会将运行时可用性映射为机器人状态（正常 => 在线，降级 => 闲置，耗尽 => 请勿打扰），并允许可选的状态文本覆盖。
- `channels.discord.guilds.<id>.presenceEvents` 会将用户可用性上线事件路由到一个配置的 Discord 频道，作为代理系统事件。符合条件的成员必须能够查看 `channelId`；公共线程继承父频道的可见性，而私有线程还要求用户是线程成员或拥有管理线程权限。`users` 可进一步缩小受众范围。该功能会从完整的 `GUILD_CREATE` 快照中记录当前在线成员，路由观测到的离线到在线转换，并将未在快照中出现的成员之后首次发出的在线信号视为新上线，但不会断言他们是上线还是在快照之后加入。成员数超过 Discord 75,000 人快照限制的服务器，需要先明确收到离线更新。限流选项：`reconnectSuppressSeconds`（新的 Gateway 会话建立后、服务器状态重建期间的静默窗口，默认值为 300，`0` 表示禁用）以及 `burstLimit`/`burstWindowSeconds`（每个服务器成功排队事件的速率限制，默认在 60 秒滑动窗口内最多 8 个事件）。恢复的会话不会启动重新连接抑制窗口。现有的每用户重新问候冷却时间仍为八小时。此功能要求 `channels.discord.intents.presence=true`、Discord 开发者门户中的特权 Presence Intent，以及已启用的代理心跳。
- `channels.discord.intents.messageContent` 默认为 `true`。仅当 Discord 无法授予特权 Message Content intent 时，才将其设置为 `false` 以启用仅提及模式；私信和明确提及机器人的消息仍会携带消息内容，而其他服务器消息不会。使用此模式时，请确保每个已配置的服务器频道都设置 `requireMention: true`。
- `channels.discord.dangerouslyAllowNameMatching` 会重新启用可变的名称/标签匹配（紧急兼容模式）。
- `channels.discord.execApprovals`：Discord 原生的执行审批投递和审批者授权。
  - `enabled`：`true`、`false` 或 `"auto"`（默认值）。在自动模式下，当可以从 `approvers` 或 `commands.ownerAllowFrom` 中解析出审批者时，执行审批会启用。
  - `approvers`：允许审批执行请求的 Discord 用户 ID。省略时回退使用 `commands.ownerAllowFrom`。
  - `agentFilter`：可选的代理 ID 允许列表。省略时转发所有代理的审批请求。
  - `sessionFilter`：可选的会话键模式（子字符串或正则表达式）。
  - `target`：审批提示的发送位置。`"dm"`（默认值）发送到审批者的私信，`"channel"` 发送到发起请求的频道，`"both"` 同时发送到两者。当目标包含 `"channel"` 时，按钮仅可由已解析的审批者使用。
  - `cleanupAfterResolve`：当设置为 `true` 时，在审批、拒绝或超时后删除审批私信。

**Reaction 通知模式：** `off`（无）、`own`（机器人的消息，默认）、`all`（所有消息）、`allowlist`（来自 `guilds.<id>.users` 的所有消息）。

### Google Chat

```json5
{
  channels: {
    googlechat: {
      enabled: true,
      serviceAccountFile: "/path/to/service-account.json",
      audienceType: "app-url", // 应用 URL | 项目编号
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
        C123: { enabled: true, requireMention: true, allowBots: false },
        C456: {
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

- **套接字模式**需要同时使用 `botToken` 和 `appToken`（对于默认账户环境变量回退，分别对应 `SLACK_BOT_TOKEN` 和 `SLACK_APP_TOKEN`）。
- **HTTP 模式**需要 `botToken` 以及 `signingSecret`（位于根级别或每个账户中）。
- **用户身份**（`identity: "user"`）会以授权用户的身份发帖和读取消息。在套接字模式下，它需要 `userToken` 加 `appToken`；在 HTTP 模式下，则需要 `userToken` 加 `signingSecret`。不需要 bot token 或 bot 用户。有关用户权限范围和事件订阅，请参阅[用户身份](/channels/slack#user-identity-post-as-a-real-person)。
- `enterpriseOrgInstall: true` 会将账户加入 Slack Enterprise Grid 的组织级事件路径。启动时会通过 `auth.test` 验证 bot token；当配置的模式与 Slack 的安装身份不匹配时，启动会失败。企业版私信必须禁用，或使用 `dmPolicy: "open"` 并将有效的 `allowFrom` 设置为 `["*"]`。频道和用户策略必须使用稳定的 Slack ID；可变名称和不受支持的频道前缀会导致启动失败。V1 仅处理直接套接字模式或 HTTP `message` 和 `app_mention` 事件，并立即回复；中继、命令、交互、App Home、reaction 事件监听器、置顶、操作工具、原生审批、绑定、延迟投递和主动发送均不可用。使用 `reactions:write` 时，仍可使用由监听器负责的确认、输入状态和状态 reaction。入站 reaction 通知和 reaction 操作工具不可用。有关最小权限清单、设置流程和完整限制，请参阅[企业版 Grid 组织级安装](/channels/slack#enterprise-grid-org-wide-installs)。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受明文字符串或 SecretRef 对象。
- Slack 账户快照会公开每个凭据的来源/状态字段，例如 `botTokenSource`、`botTokenStatus`、`userTokenSource`、`userTokenStatus`、`appTokenStatus`，以及 HTTP 模式下的 `signingSecretStatus`。`configured_unavailable` 表示账户已通过 SecretRef 配置，但当前命令/运行时路径无法解析该密钥值。
- `configWrites: false` 会阻止由 Slack 发起的配置写入。
- 当 `channels.slack.defaultAccount` 与已配置的账户 ID 匹配时，它会覆盖默认账户选择。
- `dm.groupEnabled` 和 `dm.groupChannels` 仅筛选应用已经加入的 Slack 群组私信（MPDM）。它们无法让应用看到一个从未加入的现有群组私信；请将群组私信转换为私有频道并邀请应用，或让应用通过 `conversations.open` 创建新的 MPDM。请参阅[群组私信（MPDM）和机器人](/channels/slack#group-dms-mpdms-and-bots)。
- `channels.slack.streaming.mode` 是规范的 Slack 流模式键（默认值为 `"partial"`）。`channels.slack.streaming.nativeTransport` 控制 Slack 的原生流式传输（默认值为 `true`）。运行时不再读取旧版的 `streamMode`、布尔值 `streaming`、`chunkMode`、`blockStreaming`、`blockStreamingCoalesce` 和 `nativeStreaming`；请运行 `openclaw doctor --fix`，将持久化配置迁移至 `streaming.{mode,chunkMode,block.enabled,block.coalesce,nativeTransport}`。
- `unfurlLinks` 和 `unfurlMedia` 会将 Slack `chat.postMessage` 的链接和媒体展开布尔值传递给机器人回复。`unfurlLinks` 默认为 `false`，因此除非启用，否则出站机器人链接不会内联展开；除非进行配置，否则不会传递 `unfurlMedia`。在 `channels.slack.accounts.<accountId>` 中设置任一值，可覆盖某个账户的顶层值。
- 使用 `user:<id>`（私信）或 `channel:<id>` 作为投递目标。

**Reaction 通知模式：** `off`、`own`（默认）、`all`、`allowlist`（来自 `reactionAllowlist`）。

**线程会话隔离：** `thread.historyScope` 可按线程隔离（默认）或跨频道共享。`thread.inheritParent` 会将父频道转录复制到新线程。`thread.initialHistoryLimit`（默认 `20`）限制新线程会话开始时拉取多少条已有线程消息；`0` 会禁用线程历史拉取。

- Slack 原生流式以及 Slack 助手风格的“正在输入……”线程状态都需要一个回复线程目标。顶层 DM 默认保持非线程，因此它们仍可通过 Slack 草稿式的发送后编辑预览进行流式输出，而不会显示线程式的原生流/状态预览。
- `typingReaction` 会在回复运行期间为入站 Slack 消息添加一个临时 reaction，完成后再移除。请使用 Slack emoji 短码，例如 `"hourglass_flowing_sand"`。
- `channels.slack.execApprovals`：Slack 原生 approval-client 的投递与 exec approver 授权。与 Discord 的 schema 相同：`enabled`（`true`/`false`/`"auto"`）、`approvers`（Slack user IDs）、`agentFilter`、`sessionFilter` 和 `target`（`"dm"`、`"channel"` 或 `"both"`）。当 Slack 插件 approvers 解析成功时，插件审批可以对 Slack 来源请求使用这一原生客户端路径；Slack 原生插件审批投递也可以通过 `approvals.plugin` 为 Slack 来源会话或 Slack 目标启用。插件审批使用来自 `allowFrom` 和默认路由的 Slack 插件 approvers，而不是 exec approvers。

| 操作组       | 默认   | 说明                  |
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

如果 Gateway 未运行在已登录 Messages 的 Mac 上，请保留 `channels.imessage.enabled=true`，并将 `channels.imessage.cliPath` 设置为 Gateway 本地的 SSH 包装器的绝对路径，该包装器应在该 Mac 上运行 `imsg "$@"`。将 `remoteHost` 设置为 Messages Mac，而不是 Gateway 主机。OpenClaw 会自动检测简单的透明 SSH 包装器以确保兼容性，但复杂包装器需要显式设置 `remoteHost`。默认的本地 `imsg` 路径仅适用于 macOS。

在依赖 SSH 包装器进行生产发送之前，请通过该完全相同的包装器验证一次外发 `imsg send`。某些 macOS TCC 状态会将 Messages Automation 分配给 `/usr/libexec/sshd-keygen-wrapper`，这可能导致读取和探测正常工作，但发送时因 AppleEvents `-1743` 失败；请参阅 [iMessage](/channels/imessage) 中的 SSH 包装器故障排除部分。

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "/home/openclaw/.openclaw/scripts/imsg-ssh",
      dbPath: "/Users/user/Library/Messages/chat.db",
      remoteHost: "user@messages-mac",
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

- 可选的 `channels.imessage.defaultAccount` 会在其匹配已配置的账户 id 时覆盖默认账户选择。
- 需要对 Messages 数据库具有完全磁盘访问权限。
- 优先使用 `chat_id:<id>` 目标。使用 `imsg chats --limit 20` 列出聊天。
- 对于 SSH 设置，`cliPath` 是 Gateway 主机上的绝对路径。`remoteHost`（`host` 或 `user@host`）是 Messages Mac，`dbPath` 会在该 Mac 上解释。请使用远程数据库的绝对路径，而不要根据 Gateway 用户的主目录展开路径。
- 已配置或自动检测到的 `remoteHost` 会通过现有的严格 SSH/SCP 传输启用入站附件获取和出站文件暂存。出站文件使用仅所有者可访问的远程临时路径，并在成功、失败或超时后尽力清理；清理失败时会发出警告，并可能留下仅所有者可访问的残留文件。
- `attachmentRoots` 和 `remoteAttachmentRoots` 会限制入站附件路径（默认值：`/Users/*/Library/Messages/Attachments`）。
- SCP 使用严格的主机密钥检查，因此请确保 Messages Mac 的主机密钥已经存在于 `~/.ssh/known_hosts` 中。
- `channels.imessage.configWrites`：允许或拒绝由 iMessage 发起的配置写入。
- `channels.imessage.sendTransport`：用于普通出站回复的首选 `imsg` RPC 发送传输方式。`auto`（默认值）会在 IMCore bridge 运行时对现有聊天使用它，然后回退到 AppleScript；`bridge` 要求使用私有 API 发送；`applescript` 强制使用公开的 Messages 自动化路径。
- `channels.imessage.actions.*`：启用私有 API 操作，这些操作还受 `imsg status` / `openclaw channels status --probe` 控制。
- `channels.imessage.includeAttachments` 默认关闭；在希望代理轮次接收入站媒体之前，请将其设置为 `true`。
- bridge/Gateway 重启后的入站恢复是自动的（GUID 去重加上过期积压年龄限制）。现有的 `channels.imessage.catchup.enabled: true` 配置仍会作为已弃用的兼容性配置文件受到支持；`catchup` 默认关闭。
- `channels.imessage.groups`：群组注册表和每个群组的设置。使用 `groupPolicy: "allowlist"` 时，请配置明确的 `chat_id` 键或 `"*"` 通配符条目，以便群组消息通过注册表检查。
- 顶层的 `bindings[]` 条目（`type: "acp"`）可以将 iMessage 对话绑定到持久化 ACP 会话。在 `match.peer.id` 中使用规范化句柄或显式聊天目标（`chat_id:*`、`chat_guid:*`、`chat_identifier:*`）。共享字段语义请参阅：[ACP Agents](/tools/acp-agents#persistent-channel-bindings)。

<Accordion title="iMessage SSH 包装器示例">

```bash
#!/usr/bin/env bash
exec ssh -T messages-mac imsg "$@"
```

使用远程 `imsg` v0.13.4 时，投票必须使用 `pollOptionId`；其 `poll.vote` RPC 方法不会解析索引或文本选择器。远程环境也无法回复非零部分索引的附件。这些限制不会改变本地 `imsg` 的行为。

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

- 令牌认证使用 `accessToken`；密码认证使用 `userId` + `password`。
- `channels.matrix.proxy` 会通过显式的 HTTP(S) 代理路由 Matrix 的 HTTP 流量。命名账户可以通过 `channels.matrix.accounts.<id>.proxy` 覆盖它。
- `channels.matrix.network.dangerouslyAllowPrivateNetwork` 允许使用私有/内部主服务器。`proxy` 和此网络显式启用选项是相互独立的控制项。
- `channels.matrix.defaultAccount` 在多账户配置中选择首选账户。
- `channels.matrix.autoJoin` 默认是 `"off"`，因此受邀房间和新的 DM 风格邀请会被忽略，直到你设置 `autoJoin: "allowlist"` 并配合 `autoJoinAllowlist`，或者设置 `autoJoin: "always"`。
- `channels.matrix.execApprovals`：Matrix 原生的 exec 审批传递和审批者授权。
  - `enabled`：`true`、`false` 或 `"auto"`（默认）。在自动模式下，当可以从 `approvers` 或 `commands.ownerAllowFrom` 解析出审批者时，exec 审批会被启用。
  - `approvers`：允许批准 exec 请求的 Matrix 用户 ID（例如 `@owner:example.org`）。
  - `agentFilter`：可选的 agent ID 白名单。省略则转发所有 agent 的审批。
  - `sessionFilter`：可选的 session key 模式（子串或正则表达式）。
  - `target`：将审批提示发送到哪里。`"dm"`（默认）、`"channel"`（发起请求的房间）或 `"both"`。
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
      // appId, appPassword, tenantId, webhook，团队/频道策略：
      // 见 /channels/msteams
    },
  },
}
```

- 此处涵盖的核心键路径：`channels.msteams`、`channels.msteams.configWrites`。
- 完整的 Teams 配置（凭证、webhook、DM/群组策略、每团队/每频道覆盖）见 [Microsoft Teams](/channels/msteams)。

### IRC

IRC 由插件支持，并在 `channels.irc` 下进行配置。

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

- 此处涵盖的核心键路径：`channels.irc`、`channels.irc.dmPolicy`、`channels.irc.configWrites`、`channels.irc.nickserv.*`。
- 可选的 `channels.irc.defaultAccount` 在与已配置的账户 ID 匹配时，会覆盖默认账户选择。
- 请参阅 [IRC](/channels/irc) 了解完整的 IRC 频道配置（主机/端口/TLS/频道/允许列表/提及限制）。

### 多账户（所有渠道）

每个渠道都可以运行多个账户（每个账户都有自己的 `accountId`）：

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

- 当省略 `accountId` 时，使用 `default`（CLI + 路由）。
- 环境变量中的令牌仅适用于 **default** 账户。
- 除非针对某个账户进行覆盖，否则基础渠道设置将应用于所有账户。
- 使用 `bindings[].match.accountId` 将每个账户路由到不同的代理。
- 如果通过 `openclaw channels add`（或渠道引导）添加非默认账户时，仍在使用单账户的顶层渠道配置，OpenClaw 会先将账户级的顶层单账户值提升到渠道账户映射中，以便原账户继续正常工作。大多数渠道会将这些值移动到 `channels.<channel>.accounts.default`；Matrix 还可以保留现有的匹配命名/默认目标。
- 现有的仅限渠道的绑定（不含 `accountId`）将继续匹配默认账户；账户级绑定仍然是可选的。
- `openclaw doctor --fix` 也会通过将账户级的顶层单账户值移动到渠道所选的提升账户中，修复混合结构。大多数渠道使用 `accounts.default`；Matrix 还可以保留现有的匹配命名/默认目标。

### 其他插件渠道

许多插件渠道配置为 `channels.<id>`，并在各自专门的渠道页面中进行文档说明（例如 Feishu、LINE、Nextcloud Talk、Nostr、QQ Bot、Synology Chat、Twitch 和 Zalo）。  
查看完整渠道索引：[Channels](/channels)。

### 群组消息提及门控

群组消息默认需要**提及**（元数据提及或安全正则模式）。适用于 WhatsApp、Telegram、Discord、Google Chat 和 iMessage 群聊。

可见回复单独控制。普通群组、频道和内部 WebChat 直接请求默认会自动交付最终回复：最终助手文本会通过旧的可见回复路径发布。当模型编写的源回复只有在代理调用 `message(action=send)` 后才应发布时，可选择启用 `messages.visibleReplies: "message_tool"` 或 `messages.groupChat.visibleReplies: "message_tool"`。如果模型在启用了仅工具模式的情况下返回实质性的最终答案，却没有调用 message tool，该最终文本会保持私有，gateway 详细日志会记录被抑制载荷的元数据，并且 OpenClaw 会入队一次恢复重试，要求模型通过 `message(action=send)` 交付同一回复。

仅工具策略适用于助手源回复和通用工具媒体。它不会抑制运行时拥有的终端输出，例如经授权的命令响应、持久完成通知，或所属 harness 明确归类为主机拥有的提供商原生产物。主机拥有的产物通过正常的频道分发路径交付，并且仍然遵守出站 `sendPolicy` 拒绝规则。即使运行时输出被标记为主机拥有，环境中的 `room_event` 轮次仍保持静默，除非它们是明确的命令。

仅工具可见回复要求模型/运行时能够可靠调用工具，并建议用于最新一代模型上的共享环境房间，例如 GPT-5.6 Sol。某些较弱模型可以生成最终文本，但无法理解源可见输出必须通过 `message(action=send)` 发送。对于常见的“最终答案滞留”情况，OpenClaw 默认只会在以下条件下进行恢复：最终内容足够实质、源 turn 不是房间事件、发送策略没有拒绝交付、且没有已经发送的源回复。恢复最多只进行一次重试；它会抑制合成重试提示的持久化，并让该重试不进入 collect 批处理，因此不会与无关的排队提示合并。如果重试后仍然滞留或无法入队，OpenClaw 只会交付一条经过净化的诊断信息，例如 “我生成了一条回复，但无法将其发送到此聊天中。请重试。” 原始的私有最终文本绝不会被标记为自动源交付。对于持续出现回复滞留的模型，请使用 `"automatic"`，这样最终助手轮次就会走可见回复路径；或者切换到更强的工具调用模型；或者检查 gateway 详细日志中的被抑制载荷摘要；又或者设置 `messages.groupChat.visibleReplies: "automatic"`，让所有群组/频道请求都使用可见最终回复。

如果在当前工具策略下 message tool 不可用，OpenClaw 会回退到自动可见回复，而不是静默抑制响应。`openclaw doctor` 会对这种不匹配发出警告。

此规则适用于普通代理最终文本。插件拥有的会话绑定会将所属插件返回的回复作为已声明绑定线程轮次的可见响应；对于这些绑定回复，插件无需调用 `message(action=send)`。

**故障排查：群组 @mention 触发 typing 后沉默（无错误）**

症状：在群组/频道中 @mention 后出现 typing 指示，gateway log 报告 `dispatch complete (queuedFinal=false, replies=0)`，但房间里没有消息落地。对同一 agent 的 DM 则正常回复。

原因：群组/频道可见回复模式被解析为 `"message_tool"`，因此 OpenClaw 会运行该轮次，但除非代理调用 `message(action=send)`，否则会抑制最终助手文本。此模式下没有 `NO_REPLY` 合同；没有 message-tool 调用就意味着原始最终文本是私有的。对于实质性的源 turn，OpenClaw 现在会尝试一次受保护的恢复重试；简短备注、明确静默、房间事件、发送策略拒绝的轮次，以及已经交付的轮次都不会重试。普通群组和频道轮次默认是 `"automatic"`，因此只有当 `messages.groupChat.visibleReplies`（或全局 `messages.visibleReplies`）被显式设置为 `"message_tool"` 时才会出现这种症状。Harness 的 `defaultVisibleReplies` 在这里不适用——group/channel resolver 会忽略它；它只影响 direct/source chats（Codex harness 会以这种方式抑制 direct-chat 的最终回复）。

修复方法：要么选择更强的工具调用模型，要么移除显式的 `"message_tool"` 覆盖以回退到 `"automatic"` 默认值，或者设置 `messages.groupChat.visibleReplies: "automatic"`，以强制所有群组/频道请求都使用可见回复。实质性的滞留最终答案现在不应再以静默成功结束；它要么会通过一次 `message(action=send)` 重试恢复，要么会显示经过净化的交付失败诊断。gateway 会在文件保存后热重载 `messages` 配置；只有在部署中禁用了文件监视或配置重载时才需要重启 gateway。

**提及类型：**

- **元数据提及**：原生平台 @-mentions。在 WhatsApp 自聊模式下会被忽略。
- **文本模式**：`agents.entries.*.groupChat.mentionPatterns` 中的安全正则模式。无效模式和不安全的嵌套重复会被忽略。
- 仅当检测可行时（存在原生提及或至少一个模式），才会强制执行提及门控。

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

`messages.groupChat.unmentionedInbound: "room_event"` 会在受支持的频道上，把未提及的始终在线群组/频道消息作为静默房间上下文提交。被提及的消息、命令和直接消息仍然是用户请求。完整的 Discord、Slack 和 Telegram 示例见[环境中的房间事件](/channels/ambient-room-events)。

`messages.visibleReplies` 是全局 source-event 默认值；`messages.groupChat.visibleReplies` 会针对群组/频道 source events 覆盖它。当 `messages.visibleReplies` 未设置时，direct/source chats 会使用所选运行时或 harness 默认值，但内部 WebChat 直接轮次会为 Pi/Codex 提示词一致性使用自动最终交付。设置 `messages.visibleReplies: "message_tool"` 可有意要求可见输出必须通过 `message(action=send)` 发送。频道 allowlist 和提及门控仍然会决定某个事件是否被处理。

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
    restart: true, // 允许 /restart + 外部 SIGUSR1 重启请求
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

- 此配置块用于配置命令入口。有关当前内置命令和捆绑命令目录，请参阅 [斜杠命令](/tools/slash-commands)。
- 此页面是**配置键参考**，不是完整的命令目录。由频道或插件提供的命令，例如 QQ Bot 的 `/bot-ping`、`/bot-help`、`/bot-logs`，LINE 的 `/card`，设备配对的 `/pair`，记忆的 `/dreaming`，以及 Talk 的 `/voice`，请参阅其频道或插件页面以及[斜杠命令](/tools/slash-commands)。
- 文本命令必须是以 `/` 开头的**独立**消息。
- `native: "auto"` 为 Discord/Telegram 启用原生命令，同时保持 Slack 禁用。
- `nativeSkills: "auto"` 为 Discord/Telegram 启用原生技能命令，同时保持 Slack 禁用。
- 可按频道覆盖：`channels.discord.commands.native`（布尔值或 `"auto"`）。对于 Discord，`false` 会跳过启动期间的原生命令注册和清理。
- 使用 `channels.<provider>.commands.nativeSkills` 按频道覆盖原生技能注册。
- `channels.telegram.customCommands` 会添加额外的 Telegram 机器人菜单项。
- `bash: true` 会启用用于主机 Shell 的 `! <cmd>`。需要启用 `tools.elevated.enabled`，且发送者必须位于 `tools.elevated.allowFrom.<channel>` 中。
- `config: true` 会启用 `/config`（读取/写入 `openclaw.json`）。对于网关 `chat.send` 客户端，持久化的 `/config set|unset` 写入操作还需要 `operator.admin`；只读的 `/config show` 对具有普通写入范围的操作员客户端仍然可用。
- `mcp: true` 会为 `mcp.servers` 下由 OpenClaw 管理的 MCP 服务器配置启用 `/mcp`。
- `plugins: true` 会启用 `/plugins`，用于插件发现、安装以及启用/禁用控制。
- `channels.<provider>.configWrites` 控制每个频道的配置修改权限（默认为 `true`）。
- 对于多账户频道，`channels.<provider>.accounts.<id>.configWrites` 还会控制针对该账户的写入操作（例如 `/allowlist --config --account <id>` 或 `/config set channels.<provider>.accounts.<id>...`）。
- `restart: false` 会禁用 `/restart` 和外部 `SIGUSR1` 重启请求。默认值为 `true`。
- `ownerAllowFrom` 是针对仅限所有者的命令和受所有者权限控制的频道操作的明确所有者允许列表。它与 `allowFrom` 分开。
- `ownerDisplay: "hash"` 会在系统提示中对所有者 ID 进行哈希处理。设置 `ownerDisplaySecret` 可控制哈希过程。
- `allowFrom` 按提供方设置。设置后，它是**唯一**的授权来源（频道允许列表/配对和 `useAccessGroups` 都会被忽略）。
- `useAccessGroups: false` 会在未设置 `allowFrom` 时允许命令绕过访问组策略。
- 命令文档映射：
  - 内置命令和捆绑命令目录：[斜杠命令](/tools/slash-commands)
  - 特定频道的命令入口：[频道](/channels)
  - QQ Bot 命令：[QQ Bot](/channels/qqbot)
  - 配对命令：[配对](/channels/pairing)
  - LINE 卡片命令：[LINE](/channels/line)
  - 记忆功能的梦境：[梦境](/concepts/dreaming)

</Accordion>

---

## 相关内容

- [配置参考](/gateway/configuration-reference) — 顶级键
- [配置 — 代理](/gateway/config-agents)
- [渠道概览](/channels)
