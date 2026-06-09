---
summary: "频道配置：访问控制、配对、跨 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 等的每频道密钥"
read_when:
  - 配置频道插件（认证、访问控制、多账号）
  - 排查每频道配置键
  - 审计 DM 策略、群组策略或提及门控
title: "配置 — channels"
---

`channels.*` 下的每频道配置键。涵盖 DM 和群组访问、
多账号设置、提及门控，以及 Slack、Discord、
Telegram、WhatsApp、Matrix、iMessage 和其他捆绑频道插件的每频道密钥。

关于 agent、工具、gateway runtime 以及其他顶层键，请参见
[配置参考](/gateway/configuration-reference)。

## Channels

只要某个频道的配置段存在，每个频道就会自动启动（除非 `enabled: false`）。

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
`channels.defaults.groupPolicy` 会在 provider 的 `groupPolicy` 未设置时设定默认值。
配对码在 1 小时后过期。待处理的 DM 配对请求上限为每个频道 **3 个**。
如果 provider 块完全缺失（`channels.<provider>` 不存在），运行时 group policy 会回退到 `allowlist`（fail-closed），并在启动时给出警告。
</Note>

### Channel model overrides

使用 `channels.modelByChannel` 将特定频道 ID 固定到某个模型。值可以是 `provider/model` 或已配置的模型别名。当会话已经没有模型覆盖时（例如通过 `/model` 设置），会应用频道映射。

```json5
{
  channels: {
    modelByChannel: {
      discord: {
        "123456789012345678": "anthropic/claude-opus-4-6",
      },
      slack: {
        C1234567890: "openai/gpt-5.5",
      },
      telegram: {
        "-1001234567890": "openai/gpt-5.4-mini",
        "-1001234567890:topic:99": "anthropic/claude-sonnet-4-6",
      },
    },
  },
}
```

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

- `channels.defaults.groupPolicy`：当 provider 级 `groupPolicy` 未设置时的回退群组策略。
- `channels.defaults.contextVisibility`：所有频道的默认补充上下文可见性模式。取值：`all`（默认，包含所有引用/线程/历史上下文）、`allowlist`（仅包含来自 allowlist 中发送者的上下文）、`allowlist_quote`（同 allowlist，但保留显式引用/回复上下文）。每频道覆盖：`channels.<channel>.contextVisibility`。
- `channels.defaults.heartbeat.showOk`：在 heartbeat 输出中包含健康的频道状态。
- `channels.defaults.heartbeat.showAlerts`：在 heartbeat 输出中包含降级/错误状态。
- `channels.defaults.heartbeat.useIndicator`：渲染紧凑的指示器风格 heartbeat 输出。

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
      maxMs: 120000,
      factor: 1.4,
      jitter: 0.2,
      maxAttempts: 0,
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
      replyToMode: "first", // off | first | all | batched
      linkPreview: true,
      streaming: "partial", // off | partial | block | progress (默认: off；请显式开启以避免 preview-edit 速率限制)
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
      proxy: "socks5://localhost:9050",
      webhookUrl: "https://example.com/telegram-webhook",
      webhookSecret: "secret",
      webhookPath: "/telegram-webhook",
    },
  },
}
```

- Bot token: `channels.telegram.botToken` or `channels.telegram.tokenFile` (regular file only; symlinks rejected), with `TELEGRAM_BOT_TOKEN` as fallback for the default account.
- `apiRoot` 仅用于 Telegram Bot API 根地址。请使用 `https://api.telegram.org` 或你的自托管/代理根地址，不要使用 `https://api.telegram.org/bot<TOKEN>`；`openclaw doctor --fix` 会移除意外追加的 `/bot<TOKEN>` 后缀。
- 可选的 `channels.telegram.defaultAccount` 会在其与已配置账号 id 匹配时覆盖默认账号选择。
- 在多账号设置中（2+ 个账号 id），请设置显式默认值（`channels.telegram.defaultAccount` 或 `channels.telegram.accounts.default`）以避免回退路由；`openclaw doctor` 会在缺失或无效时发出警告。
- `configWrites: false` 会阻止 Telegram 触发的配置写入（超级群 ID 迁移、`/config set|unset`）。
- 顶层 `bindings[]` 中 `type: "acp"` 的条目会为论坛主题配置持久化 ACP 绑定（在 `match.peer.id` 中使用规范化的 `chatId:topic:topicId`）。字段语义共享于 [ACP Agents](/tools/acp-agents#persistent-channel-bindings)。
- Telegram stream previews 使用 `sendMessage` + `editMessageText`（适用于私聊和群聊）。
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
- 直接出站调用如果提供了显式的 Discord `token`，该调用会使用那个 token；账户重试/策略设置仍来自活动运行时快照中选定的账号。
- 可选的 `channels.discord.defaultAccount` 会在其与已配置账号 id 匹配时覆盖默认账号选择。
- 投递目标使用 `user:<id>`（DM）或 `channel:<id>`（guild channel）；纯数字 ID 会被拒绝。
- Guild slug 采用小写，空格替换为 `-`；频道键使用 slug 化后的名称（不带 `#`）。优先使用 guild ID。
- 默认忽略机器人发送的消息。`allowBots: true` 可启用；使用 `allowBots: "mentions"` 仅接受提及机器人的 bot 消息（仍会过滤机器人的自身消息）。
- 支持 bot-authored inbound messages 的频道可以使用共享的 [bot loop protection](/channels/bot-loop-protection)。先用 `channels.defaults.botLoopProtection` 设置基础 pair 预算，再仅在某个 surface 需要不同限制时覆盖频道或账号。
- `channels.discord.guilds.<id>.ignoreOtherMentions`（以及频道覆盖）会丢弃那些提及了其他用户或角色但没有提及机器人的消息（`@everyone/@here` 除外）。
- `channels.discord.mentionAliases` 会在发送前把稳定的出站 `@handle` 文本映射为 Discord 用户 ID，因此即使临时目录缓存为空，也能确定性地提及已知队友。每账号覆盖位于 `channels.discord.accounts.<accountId>.mentionAliases`。
- `maxLinesPerMessage`（默认 17）会在消息虽然少于 2000 字符时仍然拆分过高的消息。
- `channels.discord.suppressEmbeds` 默认是 `true`，因此出站 URL 不会展开成 Discord 链接预览，除非显式禁用。显式 `embeds` 载荷仍会正常发送；每条消息的工具调用可通过 `suppressEmbeds` 覆盖。
- `channels.discord.threadBindings` 控制 Discord 线程绑定路由：
  - `enabled`：用于线程绑定会话功能的 Discord 覆盖（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 以及绑定投递/路由）
  - `idleHours`：空闲自动 unfocus 的 Discord 覆盖，单位为小时（`0` 表示禁用）
  - `maxAgeHours`：硬性最大时长的 Discord 覆盖，单位为小时（`0` 表示禁用）
  - `spawnSessions`：`sessions_spawn({ thread: true })` 和 ACP 线程 spawn 自动创建/绑定线程的开关（默认：`true`）
  - `defaultSpawnContext`：线程绑定 spawn 的原生子 agent 上下文（默认 `"fork"`）
- 顶层 `bindings[]` 中 `type: "acp"` 的条目会为频道和线程配置持久化 ACP 绑定（在 `match.peer.id` 中使用 channel/thread id）。字段语义共享于 [ACP Agents](/tools/acp-agents#persistent-channel-bindings)。
- `channels.discord.ui.components.accentColor` 设置 Discord v2 components 容器的强调色。
- `channels.discord.agentComponents.ttlMs` 控制发送出去的 Discord component 回调保留注册的时长。默认值为 `1800000`（30 分钟），最大值为 `86400000`（24 小时），每账号覆盖位于 `channels.discord.accounts.<accountId>.agentComponents.ttlMs`。更长的值会让旧按钮/选择器/表单可用更久，因此建议采用满足工作流的最短 TTL。
- `channels.discord.voice` 启用 Discord 语音频道会话，以及可选的自动加入 + LLM + TTS 覆盖。仅文本的 Discord 配置默认关闭 voice；将 `channels.discord.voice.enabled=true` 即可启用。
- `channels.discord.voice.model` 可选择性覆盖用于 Discord 语音频道响应的 LLM 模型。
- `channels.discord.voice.daveEncryption` 和 `channels.discord.voice.decryptionFailureTolerance` 会透传到 `@discordjs/voice` 的 DAVE 选项（默认分别为 `true` 和 `24`）。
- `channels.discord.voice.connectTimeoutMs` 控制 `/vc join` 和自动加入尝试时 `@discordjs/voice` 的初始 Ready 等待时间（默认 `30000`）。
- `channels.discord.voice.reconnectGraceMs` 控制一个断开的语音会话在 OpenClaw 销毁它之前，进入重连信号状态所允许的时间（默认 `15000`）。
- Discord 语音播放不会因为其他用户开始说话事件而中断。为避免反馈回路，OpenClaw 在 TTS 播放时会忽略新的语音捕获。
- OpenClaw 还会在多次解密失败后，通过离开并重新加入语音会话来尝试恢复 voice receive。
- `channels.discord.streaming` 是规范的流式模式键。Discord 默认使用 `streaming.mode: "progress"`，因此工具/工作进度会出现在一个编辑过的预览消息中；将 `streaming.mode: "off"` 可禁用它。旧的 `streamMode` 和布尔型 `streaming` 值仍作为运行时别名存在；运行 `openclaw doctor --fix` 可重写持久化配置。
- `channels.discord.autoPresence` 将运行时可用性映射到 bot presence（healthy => online、degraded => idle、exhausted => dnd），并允许可选的状态文本覆盖。
- `channels.discord.dangerouslyAllowNameMatching` 会重新启用可变名称/标签匹配（break-glass 兼容模式）。
- `channels.discord.execApprovals`：Discord 原生 exec approval 的投递与审批者授权。
  - `enabled`：`true`、`false` 或 `"auto"`（默认）。在 auto 模式下，当可以从 `approvers` 或 `commands.ownerAllowFrom` 解析审批者时，exec approvals 会激活。
  - `approvers`：允许批准 exec 请求的 Discord 用户 ID。省略时回退到 `commands.ownerAllowFrom`。
  - `agentFilter`：可选的 agent ID allowlist。省略则转发所有 agent 的审批。
  - `sessionFilter`：可选的 session key 模式（子串或正则）。
  - `target`：审批提示发送的位置。`"dm"`（默认）发送到审批者 DM，`"channel"` 发送到原始频道，`"both"` 同时发送到两者。当前者包含 `"channel"` 时，按钮只允许已解析的审批者使用。
  - `cleanupAfterResolve`：当为 `true` 时，在批准、拒绝或超时后删除审批 DM。

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

- Service account JSON：可内联（`serviceAccount`）或基于文件（`serviceAccountFile`）。
- 也支持 Service account SecretRef（`serviceAccountRef`）。
- 环境变量回退：`GOOGLE_CHAT_SERVICE_ACCOUNT` 或 `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE`。
- 投递目标使用 `spaces/<spaceId>` 或 `users/<userId>`。
- `channels.googlechat.dangerouslyAllowNameMatching` 重新启用可变 email principal 匹配（break-glass 兼容模式）。

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

- **Socket mode** 需要同时配置 `botToken` 和 `appToken`（默认账号的环境变量回退为 `SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN`）。
- **HTTP mode** 需要 `botToken` 加上 `signingSecret`（位于根级或每账号）。
- `socketMode` 会将 Slack SDK Socket Mode 传输调优参数透传给公开的 Bolt receiver API。仅在排查 ping/pong 超时或 websocket 长时间陈旧行为时使用。`clientPingTimeout` 默认值为 `15000`；只有配置时才会传入 `serverPingTimeout` 和 `pingPongLoggingEnabled`。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受明文字符串或 SecretRef 对象。
- Slack 账号快照会暴露每个凭据的来源/状态字段，例如 `botTokenSource`、`botTokenStatus`、`appTokenStatus`，以及在 HTTP mode 下的 `signingSecretStatus`。`configured_unavailable` 表示该账号已通过 SecretRef 配置，但当前命令/运行时路径无法解析密钥值。
- `configWrites: false` 会阻止 Slack 触发的配置写入。
- 可选的 `channels.slack.defaultAccount` 会在其与已配置账号 id 匹配时覆盖默认账号选择。
- `channels.slack.streaming.mode` 是规范的 Slack 流式模式键。`channels.slack.streaming.nativeTransport` 控制 Slack 的原生流式传输。旧的 `streamMode`、布尔型 `streaming` 和 `nativeStreaming` 值仍作为运行时别名存在；运行 `openclaw doctor --fix` 可重写持久化配置。
- `unfurlLinks` 和 `unfurlMedia` 会把 Slack 的 `chat.postMessage` 链接和媒体 unfurl 布尔值透传给 bot 回复。`unfurlLinks` 默认是 `false`，因此出站 bot 链接不会在内联中展开，除非启用；`unfurlMedia` 会在未配置时省略。可在 `channels.slack.accounts.<accountId>` 上设置任一值，以覆盖该账号的顶层值。
- 投递目标使用 `user:<id>`（DM）或 `channel:<id>`。

**Reaction notification modes:** `off`、`own`（默认）、`all`、`allowlist`（来自 `reactionAllowlist`）。

**Thread session isolation:** `thread.historyScope` 可以是 per-thread（默认）或 shared across channel。`thread.inheritParent` 会把父 channel 的会话记录复制到新线程。

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

Mattermost 作为当前 OpenClaw 版本中的捆绑插件提供。较旧或自定义构建可以通过
`openclaw plugins install @openclaw/mattermost` 安装当前 npm 包。请在固定版本前查看
[npmjs.com/package/@openclaw/mattermost](https://www.npmjs.com/package/@openclaw/mattermost)
上的当前 dist-tags。

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

Before relying on an SSH wrapper for production sends, verify an outbound `imsg send` through that exact wrapper. Some macOS TCC states assign Messages Automation to `/usr/libexec/sshd-keygen-wrapper`, which can make reads and probes work while sends fail with AppleEvents `-1743`; see [SSH wrapper sends fail with AppleEvents -1743](/channels/imessage#ssh-wrapper-sends-fail-with-appleevents-1743).

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

- 可选的 `channels.imessage.defaultAccount` 会在其与已配置账号 id 匹配时覆盖默认账号选择。

- Requires Full Disk Access to the Messages DB.
- Prefer `chat_id:<id>` targets. Use `imsg chats --limit 20` to list chats.
- `cliPath` can point to an SSH wrapper; set `remoteHost` (`host` or `user@host`) for SCP attachment fetching.
- `attachmentRoots` and `remoteAttachmentRoots` restrict inbound attachment paths (default: `/Users/*/Library/Messages/Attachments`).
- SCP uses strict host-key checking, so ensure the relay host key already exists in `~/.ssh/known_hosts`.
- `channels.imessage.configWrites`: allow or deny iMessage-initiated config writes.
- `channels.imessage.actions.*`: enable private API actions that are also gated by `imsg status` / `openclaw channels status --probe`.
- `channels.imessage.includeAttachments` is off by default; set it to `true` before expecting inbound media in agent turns.
- Inbound recovery after a bridge/gateway restart is automatic (GUID dedupe plus a stale-backlog age fence). Existing `channels.imessage.catchup.enabled: true` configs are still honored as a deprecated compatibility profile.
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

- Token 认证使用 `accessToken`；密码认证使用 `userId` + `password`。
- `channels.matrix.proxy` 会通过显式 HTTP(S) 代理路由 Matrix HTTP 流量。命名账号可通过 `channels.matrix.accounts.<id>.proxy` 覆盖它。
- `channels.matrix.network.dangerouslyAllowPrivateNetwork` 允许私有/内部 homeserver。`proxy` 和该网络显式启用是彼此独立的控制项。
- `channels.matrix.defaultAccount` 会在多账号设置中选择首选账号。
- `channels.matrix.autoJoin` 默认为 `off`，因此被邀请的 room 和新的 DM 风格邀请会被忽略，直到你将 `autoJoin: "allowlist"` 搭配 `autoJoinAllowlist`，或将其设为 `autoJoin: "always"`。
- `channels.matrix.execApprovals`：Matrix 原生执行审批的投递与审批者授权。
  - `enabled`：`true`、`false` 或 `"auto"`（默认）。在 auto 模式下，当可以从 `approvers` 或 `commands.ownerAllowFrom` 解析审批者时，exec approvals 会激活。
  - `approvers`：允许批准 exec 请求的 Matrix 用户 ID（例如 `@owner:example.org`）。
  - `agentFilter`：可选的 agent ID allowlist。省略则转发所有 agent 的审批。
  - `sessionFilter`：可选的 session key 模式（子串或正则）。
  - `target`：审批提示的发送位置。`"dm"`（默认）、`"channel"`（来源 room）或 `"both"`。
  - 每账号覆盖：`channels.matrix.accounts.<id>.execApprovals`。
- `channels.matrix.dm.sessionScope` 控制 Matrix DM 如何分组为会话：`per-user`（默认）按路由 peer 共享，而 `per-room` 会隔离每个 DM room。
- Matrix 状态探测和实时目录查询使用与运行时流量相同的代理策略。
- 完整的 Matrix 配置、投递目标规则和设置示例见 [Matrix](/channels/matrix)。

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

许多插件频道配置为 `channels.<id>`，并在各自专门的频道页面中记录（例如 Feishu、Matrix、LINE、Nostr、Zalo、Nextcloud Talk、Synology Chat 和 Twitch）。
查看完整频道索引：[Channels](/channels)。

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

支持：`telegram`、`whatsapp`、`discord`、`slack`、`signal`、`imessage`、`msteams`。

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
