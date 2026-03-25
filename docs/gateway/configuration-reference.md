---
title: "配置参考"
summary: "OpenClaw 配置键、默认值及频道设置的完整参考"
read_when:
  - 需要准确的字段级配置语义或默认值
  - 正在验证频道、模型、网关或工具配置块
---

# 配置参考

列出 `~/.openclaw/openclaw.json` 中可用的所有字段。有关面向任务的概览，请参见 [配置](/gateway/configuration)。

配置格式为 **JSON5**（支持注释和尾逗号）。所有字段均为可选 — 省略时 OpenClaw 使用安全默认值。

---

## 频道（Channels）

只要存在频道配置段，频道会自动启动（除非设置了 `enabled: false`）。

### 私信和群组访问策略

所有频道支持私信策略和群组策略：

| 私信策略（DM policy） | 行为说明                                              |
| --------------------- | ----------------------------------------------------- |
| `pairing`（默认）     | 未知发送者需一次性配对码；拥有者必须批准              |
| `allowlist`           | 仅允许 `allowFrom` 中的发送者（或配对的 Allow Store） |
| `open`                | 允许所有入站私信（需 `allowFrom: ["*"]`）             |
| `disabled`            | 忽略所有入站私信                                      |

| 群组策略（Group policy） | 行为说明                             |
| ------------------------ | ------------------------------------ |
| `allowlist`（默认）      | 仅允许匹配配置允许列表的群组         |
| `open`                   | 绕过群组允许列表（提及门控仍然生效） |
| `disabled`               | 阻止所有群组/房间消息                |

<Note>
`channels.defaults.groupPolicy` 设置提供商未设置 `groupPolicy` 时的默认值。  
配对码1小时后过期。每个频道最多挂起 **3 条** 私信配对请求。  
如果完全缺少提供商块（`channels.<provider>` 不存在），运行时群组策略会回退到 `allowlist`（失败即关闭）并输出启动警告。
</Note>

### 频道模型覆盖

使用 `channels.modelByChannel` 将特定频道 ID 绑定到模型。值接受 `provider/model` 或配置的模型别名。当会话尚未已有模型覆盖时应用此映射（例如，通过 `/model` 设置）。

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

### 频道默认值与心跳检测

使用 `channels.defaults` 配置跨提供商共享的群组策略和心跳行为：

```json5
{
  channels: {
    defaults: {
      groupPolicy: "allowlist", // open | allowlist | disabled
      heartbeat: {
        showOk: false,
        showAlerts: true,
        useIndicator: true,
      },
    },
  },
}
```

- `channels.defaults.groupPolicy`：提供商级别未设置时的群组策略回退值。
- `channels.defaults.heartbeat.showOk`：在心跳输出包含健康的频道状态。
- `channels.defaults.heartbeat.showAlerts`：在心跳输出包含降级/错误状态。
- `channels.defaults.heartbeat.useIndicator`：使用紧凑指示器样式渲染心跳输出。

### WhatsApp

WhatsApp 通过网关的 web 频道（Baileys Web）运行，且当存在已关联会话时自动启动。

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "pairing", // pairing | allowlist | open | disabled
      allowFrom: ["+15555550123", "+447700900123"],
      textChunkLimit: 4000,
      chunkMode: "length", // length | newline
      mediaMaxMb: 50,
      sendReadReceipts: true, // 蓝色双勾（自聊模式为 false）
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

- 出站命令默认使用 `default` 账号（若存在），否则使用第一个配置的账号 ID（排序后的）。
- 可选 `channels.whatsapp.defaultAccount` 在匹配配置账号 ID 时覆盖默认账号选择。
- 旧版单账号 Baileys 授权目录由 `openclaw doctor` 迁移到 `whatsapp/default`。
- 支持 per-account 覆盖：`channels.whatsapp.accounts.<id>.sendReadReceipts`、`dmPolicy`、`allowFrom`。

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
        { command: "backup", description: "Git backup" },
        { command: "generate", description: "Create an image" },
      ],
      historyLimit: 50,
      replyToMode: "first", // off | first | all
      linkPreview: true,
      streaming: "partial", // off | partial | block | progress (default: off; opt in explicitly to avoid preview-edit rate limits)
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

- 机器人 Token 支持 `channels.telegram.botToken` 或 `channels.telegram.tokenFile`（仅限常规文件；符号链接被拒绝），默认账号环境变量优先使用 `TELEGRAM_BOT_TOKEN`。
- 可选 `channels.telegram.defaultAccount` 在匹配账号 ID 时覆盖默认账号选择。
- 多账号（2 个或以上）场景中应设置显式默认账号（通过 `channels.telegram.defaultAccount` 或 `channels.telegram.accounts.default`），否则 `openclaw doctor` 会警告缺失或无效设置。
- `configWrites: false` 阻止 Telegram 发起的配置写入（超群 ID 迁移、`/config set|unset`）。
- 顶级 `bindings[]` 中 `type: "acp"` 用于配置论坛主题的持久 ACP 绑定（`match.peer.id` 使用规范 `chatId:topic:topicId`）。字段语义详见 [ACP Agents](/tools/acp-agents#channel-specific-settings)。
- Telegram 流式预览使用 `sendMessage` + `editMessageText`，适用于私聊和群组聊天。
- 重试策略详见 [Retry policy](/concepts/retry)。

### Discord

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "your-bot-token",
      mediaMaxMb: 8,
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
      replyToMode: "off", // off | first | all
      dmPolicy: "pairing",
      allowFrom: ["1234567890", "123456789012345678"],
      dm: {
        enabled: true,
        groupEnabled: false,
        groupChannels: ["openclaw-dm"],
      },
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
              systemPrompt: "Short answers only.",
            },
          },
        },
      },
      historyLimit: 20,
      textChunkLimit: 2000,
      chunkMode: "length", // length | newline
      streaming: "off", // off | partial | block | progress (progress maps to partial on Discord)
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
        spawnSubagentSessions: false, // opt-in for sessions_spawn({ thread: true })
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

- Token：使用 `channels.discord.token`，默认账号环境变量 `DISCORD_BOT_TOKEN` 作为回退。
- 直接外呼时，如果提供了明确的 Discord `token`，则该 token 会用于呼叫；账户重试/策略设置仍然来自活动运行时快照中选定的账户。
- 可选 `channels.discord.defaultAccount` 在匹配账号 ID 时覆盖默认账号选择。
- 使用 `user:<id>`（私聊）或 `channel:<id>`（公会频道）指定投递目标，不允许裸数字 ID。
- 公会（Guild）别名为小写，空格替换为 `-`；频道键使用别名，不带 `#`。推荐使用公会 ID 进行匹配。
- 默认忽略机器人作者消息。设置 `allowBots: true` 开启；`allowBots: "mentions"` 只允许带机器人的消息（自身消息仍被过滤）。
- `channels.discord.guilds.<id>.ignoreOtherMentions`（及频道覆盖）丢弃只提及其他用户/角色但未提及机器人的消息（排除 @everyone/@here）。
- `maxLinesPerMessage`（默认 17）在消息字符低于 2000 时，也会切分过高的消息。
- `channels.discord.threadBindings` 控制 Discord 线程绑定会话功能：
  - `enabled`：启用线程绑定功能（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 及绑定投递/路由）
  - `idleHours`：线程非活跃自动取消聚焦时间（小时，`0` 禁用）
  - `maxAgeHours`：线程最大寿命（小时，`0` 禁用）
  - `spawnSubagentSessions`：是否开启 `sessions_spawn({ thread: true })` 自动线程创建绑定
- 顶级 `bindings[]` 中 `type: "acp"` 用于配置频道及线程的持久 ACP 绑定（`match.peer.id` 使用频道/线程 ID）。字段语义见 [ACP Agents](/tools/acp-agents#channel-specific-settings)。
- `channels.discord.ui.components.accentColor` 设置 Discord 组件 v2 容器的强调色。
- `channels.discord.voice` 启用语音频道会话和可选自动加入及 TTS 覆盖。
- `channels.discord.voice.daveEncryption` 和 `decryptionFailureTolerance` 传递给 `@discordjs/voice` 的 DAVE 选项（默认 `true` 和 `24`）。
- OpenClaw 额外尝试通过离开和重新加入语音频道以恢复语音接收，防止多次解密失败。
- `channels.discord.streaming` 是官方的流模式键，旧版 `streamMode` 和布尔 `streaming` 值会自动迁移。
- `channels.discord.autoPresence` 将运行时可用性映射为机器人状态（健康 → 在线，降级 → 空闲，耗尽 → 勿扰）并支持自定义状态文本。
- `channels.discord.dangerouslyAllowNameMatching` 重新启用可变名称/标签匹配（破戒模式）。

**反应通知模式：**

- `off`（无）
- `own`（仅接受机器人自发消息，默认）
- `all`（所有消息）
- `allowlist`（仅 `guilds.<id>.users` 内用户在所有消息）

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

- 服务账户 JSON 可内联（`serviceAccount`）或文件形式（`serviceAccountFile`）。
- 支持 SecretRef 形式的服务账户（`serviceAccountRef`）。
- 环境变量回退：`GOOGLE_CHAT_SERVICE_ACCOUNT` 或 `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE`。
- 目标 ID 使用 `spaces/<spaceId>` 或 `users/<userId>` 格式。
- `channels.googlechat.dangerouslyAllowNameMatching` 重新启用可变邮件身份匹配（破戒模式）。

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
          systemPrompt: "Short answers only.",
        },
      },
      historyLimit: 50,
      allowBots: false,
      reactionNotifications: "own",
      reactionAllowlist: ["U123"],
      replyToMode: "off", // off | first | all
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
      streaming: "partial", // off | partial | block | progress (preview mode)
      nativeStreaming: true, // use Slack native streaming API when streaming=partial
      mediaMaxMb: 20,
    },
  },
}
```

- **Socket 模式** 需同时配置 `botToken` 和 `appToken`（默认账号环境变量回退为 `SLACK_BOT_TOKEN` 和 `SLACK_APP_TOKEN`）。
- **HTTP 模式** 需 `botToken` 及 `signingSecret`（根级或每账号）。
- `configWrites: false` 阻止 Slack 发起的配置写入。
- 可选 `channels.slack.defaultAccount` 在匹配账号 ID 时覆盖默认账号选择。
- `channels.slack.streaming` 为官方流模式键，旧版 `streamMode` 和布尔 `streaming` 会自动迁移。
- 使用 `user:<id>`（私聊）或 `channel:<id>` 指定投递目标。

**反应通知模式：**

- `off`
- `own`（默认）
- `all`
- `allowlist`（由 `reactionAllowlist` 指定）

**线程会话隔离：**

- `thread.historyScope` 可设置为线程内（默认）或频道共享
- `thread.inheritParent` 将父频道对话复制到新线程

- `typingReaction` 会在回复运行期间给入站消息添加反应，完成后移除。使用 Slack 表情代码，如 `"hourglass_flowing_sand"`。

| 动作组     | 默认 | 说明                |
| ---------- | ---- | ------------------- |
| reactions  | 启用 | 添加与列举反应      |
| messages   | 启用 | 读/发/编辑/删除消息 |
| pins       | 启用 | 固定/取消固定/列表  |
| memberInfo | 启用 | 成员信息            |
| emojiList  | 启用 | 自定义表情列表      |

### Mattermost

Mattermost 作为插件提供：`openclaw plugins install @openclaw/mattermost`。

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
      commands: {
        native: true, // opt-in
        nativeSkills: true,
        callbackPath: "/api/channels/mattermost/command",
        // 反向代理/公网部署的可选显式 URL
        callbackUrl: "https://gateway.example.com/api/channels/mattermost/command",
      },
      textChunkLimit: 4000,
      chunkMode: "length",
    },
  },
}
```

聊天模式：

- `oncall`（默认，响应被 @ 提及）
- `onmessage`（响应每条消息）
- `onchar`（触发前缀开头的消息）

开启 Mattermost 原生日志后：

- `commands.callbackPath` 必须为路径，不可为完整 URL。
- `commands.callbackUrl` 必须可达且指向 OpenClaw 网关终端。
- 私有/内网回调主机，Mattermost 可能需配置 `ServiceSettings.AllowedUntrustedInternalConnections`，只需包含主机/域名而非完整 URL。
- `channels.mattermost.configWrites`：允许或拒绝 Mattermost 发起的配置写入。
- `channels.mattermost.requireMention`：在频道中回复前强制需 @ 机器人。
- 可选 `channels.mattermost.defaultAccount` 在匹配账号时覆盖默认账号选择。

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
      reactionAllowlist: [
        "+15551234567",
        "uuid:123e4567-e89b-12d3-a456-426614174000",
      ],
      historyLimit: 50,
    },
  },
}
```

**反应通知模式：**

- `off`
- `own`（默认）
- `all`
- `allowlist`（由 `reactionAllowlist` 指定）

- `channels.signal.account`：指定启动绑定的 Signal 账号身份。
- `channels.signal.configWrites`：允许或拒绝 Signal 发起的配置写入。
- 可选 `channels.signal.defaultAccount` 覆盖默认账号选择。

### BlueBubbles

BlueBubbles 是推荐的 iMessage 路径（基于插件，配置于 `channels.bluebubbles` 下）。

```json5
{
  channels: {
    bluebubbles: {
      enabled: true,
      dmPolicy: "pairing",
      // serverUrl、password、webhookPath、群组控制及高级操作详见 /channels/bluebubbles
    },
  },
}
```

- 核心路径涵盖：`channels.bluebubbles`，`channels.bluebubbles.dmPolicy`。
- 可选 `channels.bluebubbles.defaultAccount` 覆盖默认账号选择。
- 详细 BlueBubbles 配置文档参见 [BlueBubbles](/channels/bluebubbles)。

### iMessage

OpenClaw 使用 `imsg rpc`（基于 stdio 的 JSON-RPC）进行通讯，无需守护进程或端口。

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

- 可选 `channels.imessage.defaultAccount` 覆盖默认账号选择。
- 需要完整磁盘访问权限以访问 Messages 数据库。
- 优先使用 `chat_id:<id>` 目标。使用命令 `imsg chats --limit 20` 列出聊天。
- `cliPath` 可指向 SSH 包装器；设置 `remoteHost`（`host` 或 `user@host`）用于 SCP 附件抓取。
- `attachmentRoots` 和 `remoteAttachmentRoots` 限制入站附件路径（默认为 `/Users/*/Library/Messages/Attachments`）。
- SCP 使用严格主机密钥检测，确保 Relay 主机密钥存在于 `~/.ssh/known_hosts`。
- `channels.imessage.configWrites`：允许或阻止 iMessage 发起的配置写入。

<Accordion title="iMessage SSH 包装器示例">

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

</Accordion>

### Microsoft Teams

Microsoft Teams 通过扩展支持，配置于 `channels.msteams`。

```json5
{
  channels: {
    msteams: {
      enabled: true,
      configWrites: true,
      // appId、appPassword、tenantId、webhook、团队/频道策略详见 /channels/msteams
    },
  },
}
```

- 核心路径涵盖：`channels.msteams`，`channels.msteams.configWrites`。
- 详细 Teams 配置（凭据、webhook、私信/群组策略、分队/频道覆盖）详见 [Microsoft Teams](/channels/msteams)。

### IRC

IRC 通过扩展支持，配置于 `channels.irc`。

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

- 核心路径涵盖：`channels.irc`、`channels.irc.dmPolicy`、`channels.irc.configWrites`、`channels.irc.nickserv.*`。
- 可选 `channels.irc.defaultAccount` 覆盖默认账号选择。
- 完整 IRC 频道配置（主机/端口/TLS/频道/允许列表/提及门控）详见 [IRC](/channels/irc)。

### 多账号（适用于所有频道）

每个频道运行多个账号（每个账号有各自的 `accountId`）：

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

- 省略 `accountId` 时使用 `default` 账号（CLI + 路由）。
- 环境变量 Token 仅适用于 **默认** 账号。
- 基础频道设置对所有账号生效，除非单独账号覆盖。
- 使用 `bindings[].match.accountId` 将不同账号路由至不同代理。
- 若通过 `openclaw channels add` 添加非默认账号（或频道导入）且仍为单账号顶级配置，OpenClaw 会自动先将顶层单账号值迁移到 `channels.<channel>.accounts.default`，保持原账号正常。
- 已存频道级绑定（无 `accountId`）继续匹配默认账号；账号级绑定为可选。
- `openclaw doctor --fix` 可修复混合形态，将顶层单账号值迁移到 `accounts.default`（当存在命名账号但缺少默认账号时）。

### 其他扩展频道

许多扩展频道以 `channels.<id>` 配置并在专门频道页文档中说明（如飞书、Matrix、LINE、Nostr、Zalo、Nextcloud Talk、Synology Chat、Twitch 等）。  
完整频道索引参见：[Channels](/channels)。

### 群聊提及门控

Group messages default to **require mention** (metadata mention or safe regex patterns). Applies to WhatsApp, Telegram, Discord, Google Chat, and iMessage group chats.

**提及类型：**

- **Metadata mentions**: Native platform @-mentions. Ignored in WhatsApp self-chat mode.
- **Text patterns**: Safe regex patterns in `agents.list[].groupChat.mentionPatterns`. Invalid patterns and unsafe nested repetition are ignored.
- Mention gating is enforced only when detection is possible (native mentions or at least one pattern).

```json5
{
  messages: {
    groupChat: { historyLimit: 50 },
  },
  agents: {
    list: [
      { id: "main", groupChat: { mentionPatterns: ["@openclaw", "openclaw"] } },
    ],
  },
}
```

`messages.groupChat.historyLimit` 设定全局默认。频道可覆盖为 `channels.<channel>.historyLimit`（或按账号）。设置为 `0` 禁用。

#### 私信历史限制

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

解析顺序：按单私信覆盖 → 提供商默认 → 无限制（全部保留）。  
支持频道：`telegram`、`whatsapp`、`discord`、`slack`、`signal`、`imessage`、`msteams`。

#### 自聊模式

名称列入 `allowFrom` 以启用自聊模式（忽略原生 @ 提及，仅对文本模式响应）：

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
    native: "auto", // 支持时注册原生命令
    text: true, // 解析聊天中的 /commands
    bash: false, // 允许 ! （别名：/bash）
    bashForegroundMs: 2000,
    config: false, // 允许 /config
    debug: false, // 允许 /debug
    restart: false, // 允许 /restart + 网关重启工具
    allowFrom: {
      "*": ["user1"],
      discord: ["user:123"],
    },
    useAccessGroups: true,
  },
}
```

<Accordion title="命令详解">

- 文本命令必须为 **独立** 消息且以 `/` 开头。
- `native: "auto"` 为 Discord/Telegram 开启原生命令，保持 Slack 关闭。
- 按频道覆盖：`channels.discord.commands.native`（布尔或 `"auto"`）设置。`false` 清除先前注册的命令。
- `channels.telegram.customCommands` 可添加额外的 Telegram 机器人菜单项。
- `bash: true` 启用主机 shell 的 `! <cmd>`，需 `tools.elevated.enabled` 且发送者在 `tools.elevated.allowFrom.<channel>`。
- `config: true` 允许 `/config`（读写 `openclaw.json`）。对于网关 `chat.send` 客户端，持久 `/config set|unset` 写入需要 `operator.admin`，只读 `/config show` 对写权限普通操作员开放。
- `channels.<provider>.configWrites` 按频道限制配置更改（默认开启）。
- 对于多账户频道，`channels.<provider>.accounts.<id>.configWrites` 也会限制针对该账户的写入操作（例如 `/allowlist --config --account <id>` 或 `/config set channels.<provider>.accounts.<id>...`）。
- `allowFrom` 是每提供商设定，设置时仅用此授权源（忽略频道允许列表/配对及 `useAccessGroups`）。
- `useAccessGroups: false` 允许命令跳过访问组策略（当未设置 `allowFrom` 时）。

</Accordion>

---

## 代理默认值（Agent defaults）

### `agents.defaults.workspace`

默认：`~/.openclaw/workspace`。

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

### `agents.defaults.repoRoot`

可选仓库根路径，显示于系统提示的 Runtime 行。未设置时 OpenClaw 自动向上查找。

```json5
{
  agents: { defaults: { repoRoot: "~/Projects/openclaw" } },
}
```

### `agents.defaults.skipBootstrap`

禁用自动创建工作区引导文件（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`）。

```json5
{
  agents: { defaults: { skipBootstrap: true } },
}
```

### `agents.defaults.bootstrapMaxChars`

单个工作区引导文件最大字符数，超过则截断。默认：20000。

```json5
{
  agents: { defaults: { bootstrapMaxChars: 20000 } },
}
```

### `agents.defaults.bootstrapTotalMaxChars`

所有引导文件总注入最大字符数。默认：150000。

```json5
{
  agents: { defaults: { bootstrapTotalMaxChars: 150000 } },
}
```

### `agents.defaults.bootstrapPromptTruncationWarning`

引导上下文截断时注入的代理可见警告文本。默认：`"once"`。

- `"off"`：不注入警告文本。
- `"once"`：每个唯一截断签名注入一次（推荐）。
- `"always"`：只要存在截断，每次运行均注入。

```json5
{
  agents: { defaults: { bootstrapPromptTruncationWarning: "once" } }, // off | once | always
}
```

### `agents.defaults.imageMaxDimensionPx`

工具图像块最长边最大像素尺寸。默认 1200。

较低值通常减少视觉令牌与请求大小，适合截图密集场景。较高值保留更多细节。

```json5
{
  agents: { defaults: { imageMaxDimensionPx: 1200 } },
}
```

### `agents.defaults.userTimezone`

系统提示上下文时区（非消息时间戳）。回退到主机时区。

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

### `agents.defaults.timeFormat`

系统提示时间格式。默认 `auto`（操作系统偏好）。

```json5
{
  agents: { defaults: { timeFormat: "auto" } }, // auto | 12 | 24
}
```

### `agents.defaults.model`

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": { alias: "opus" },
        "minimax/MiniMax-M2.7": { alias: "minimax" },
      },
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M2.7"],
      },
      imageModel: {
        primary: "openrouter/qwen/qwen-2.5-vl-72b-instruct:free",
        fallbacks: ["openrouter/google/gemini-2.0-flash-vision:free"],
      },
      imageGenerationModel: {
        primary: "openai/gpt-image-1",
        fallbacks: ["google/gemini-3.1-flash-image-preview"],
      },
      pdfModel: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["openai/gpt-5-mini"],
      },
      pdfMaxBytesMb: 10,
      pdfMaxPages: 20,
      thinkingDefault: "low",
      verboseDefault: "off",
      elevatedDefault: "on",
      timeoutSeconds: 600,
      mediaMaxMb: 5,
      contextTokens: 200000,
      maxConcurrent: 3,
    },
  },
}
```

- `model`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 字符串形式仅设置主模型。
  - 对象形式设置主模型及有序故障转移模型。
- `imageModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由 `image` 工具路径用作其视觉模型配置。
  - 当所选/默认模型无法接受图像输入时，也用作后备路由。
- `imageGenerationModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由共享图像生成能力及未来任何生成图像的工具/插件表面使用。
  - 典型值：`google/gemini-3-pro-image-preview` 用于原生 Nano Banana 风格流程，`fal/fal-ai/flux/dev` 用于 fal，或 `openai/gpt-image-1` 用于 OpenAI Images。
  - 若直接选择 provider/model，也需配置匹配的 provider 认证/API 密钥（例如 `google/*` 使用 `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`，`openai/*` 使用 `OPENAI_API_KEY`，`fal/*` 使用 `FAL_KEY`）。
  - 若省略，`image_generate` 仍可从兼容的认证支持图像生成 provider 推断尽力默认 provider。
- `pdfModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由 `pdf` 工具用于模型路由。
  - 若省略，PDF 工具回退到 `imageModel`，然后到尽力 provider 默认。
- `pdfMaxBytesMb`：`pdf` 工具在调用时未传递 `maxBytesMb` 的默认 PDF 大小限制。
- `pdfMaxPages`：`pdf` 工具提取回退模式中考虑的默认最大页数。
- `model.primary`：格式 `provider/model`（例如 `anthropic/claude-opus-4-6`）。若省略 provider，OpenClaw 假设为 `anthropic`（已弃用）。
- `models`：`/model` 的配置模型目录和允许列表。每个条目可包含 `alias`（快捷方式）和 `params`（provider 特定，例如 `temperature`、`maxTokens`、`cacheRetention`、`context1m`）。
- `params` 合并优先级（配置）：`agents.defaults.models["provider/model"].params` 是基础，然后 `agents.list[].params`（匹配代理 id）按键覆盖。
- 变异这些字段的配置写入器（例如 `/models set`、`/models set-image` 及后备添加/删除命令）保存规范对象形式，并尽可能保留现有后备列表。
- `maxConcurrent`：跨会话的最大并行代理运行数（每个会话仍串行）。默认：1。

**内置别名快捷键**（仅当模型存在于 `agents.defaults.models` 中时生效）：

| 别名                | 模型                                   |
| ------------------- | -------------------------------------- |
| `opus`              | `anthropic/claude-opus-4-6`            |
| `sonnet`            | `anthropic/claude-sonnet-4-6`          |
| `gpt`               | `openai/gpt-5.4`                       |
| `gpt-mini`          | `openai/gpt-5-mini`                    |
| `gemini`            | `google/gemini-3.1-pro-preview`        |
| `gemini-flash`      | `google/gemini-3-flash-preview`        |
| `gemini-flash-lite` | `google/gemini-3.1-flash-lite-preview` |

您配置的别名总是优先于默认。

Z.AI GLM-4.x 模型自动启用思考模式，除非设置了 `--thinking off` 或定义了 `agents.defaults.models["zai/<model>"].params.thinking`。  
Z.AI 模型默认启用工具调用流式（`tool_stream`）。设置为 `false` 可禁用。  
Anthropic Claude 4.6 模型默认为 `adaptive` 思考模式（无显式思考等级时）。

### `agents.defaults.cliBackends`

CLI 后端，备选文本模式落地（禁用工具调用）。为 API 失效时的备份方案。

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude",
        },
        "my-cli": {
          command: "my-cli",
          args: ["--json"],
          output: "json",
          modelArg: "--model",
          sessionArg: "--session",
          sessionMode: "existing",
          systemPromptArg: "--system",
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat",
        },
      },
    },
  },
}
```

- CLI 后端主攻文本，永不启用工具。
- 支持会话时需配置 `sessionArg`。
- 支持图像传递时需配置 `imageArg`（接收文件路径）。

### `agents.defaults.heartbeat`

周期心跳运行。

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // 0m 禁用
        model: "openai/gpt-5.2-mini",
        includeReasoning: false,
        lightContext: false, // 默认：false；true 仅保留工作区引导文件中的 HEARTBEAT.md
        isolatedSession: false, // 默认：false；true 在全新会话中运行每次心跳（无对话历史）
        session: "main",
        to: "+15555550123",
        directPolicy: "allow", // allow（默认）| block
        target: "none", // 默认为 none；选项：last | whatsapp | telegram | discord | ...
        prompt: "Read HEARTBEAT.md if it exists...",
        ackMaxChars: 300,
        suppressToolErrorWarnings: false,
      },
    },
  },
}
```

- `every`：时间段字符串（ms/s/m/h）。默认：`30m`。
- `suppressToolErrorWarnings`：为 true 时，心跳运行期间抑制工具错误警告负载。
- `directPolicy`：直接/私信发送策略。`allow`（默认）允许直接目标发送；`block`禁止直接目标发送并生成 `reason=dm-blocked`。
- `lightContext`：为 true 时，心跳运行使用轻量级引导上下文，仅保留工作区引导文件中的 `HEARTBEAT.md`。
- `isolatedSession`：为 true 时，每次心跳运行在无历史的新会话中。与定时任务中的 `sessionTarget: "isolated"` 相同隔离模式。可将每次心跳的令牌开销从约 10 万降至约 2-5 千。
- 每代理可单独设置 `agents.list[].heartbeat`。当有任何代理定义心跳时，**只有这些代理**会运行心跳。
- 心跳执行完整代理回合——频率越短，消耗令牌越多。

### `agents.defaults.compaction`

```json5
{
  agents: {
    defaults: {
      compaction: {
        mode: "safeguard", // default | safeguard
        timeoutSeconds: 900,
        reserveTokensFloor: 24000,
        identifierPolicy: "strict", // strict | off | custom
        identifierInstructions: "Preserve deployment IDs, ticket IDs, and host:port pairs exactly.", // identifierPolicy=custom 时使用
        postCompactionSections: ["Session Startup", "Red Lines"], // [] 禁用重新注入
        model: "openrouter/anthropic/claude_sonnet-4-6", // 可选的仅压缩模型覆盖
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 6000,
          systemPrompt: "Session nearing compaction. Store durable memories now.",
          prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store.",
        },
      },
    },
  },
}
```

- `mode`：`default` 或 `safeguard`（针对长历史的分块摘要）。详见 [Compaction](/concepts/compaction)。
- `timeoutSeconds`：单次压缩操作允许的最大秒数，超过则 OpenClaw 中止。默认：`900`。
- `identifierPolicy`：`strict`（默认）、`off` 或 `custom`。`strict` 会在压缩摘要时前置内建的不透明标识保留指令。
- `identifierInstructions`：`identifierPolicy=custom` 时使用的自定义标识保留文本。
- `postCompactionSections`：压缩后重注入的 AGENTS.md H2/H3 标题列表。默认：`["Session Startup", "Red Lines"]`；设置为空数组 `[]` 禁用重注入。当未设置或特意设置为默认对时，亦接受旧版的 `Every Session` 和 `Safety` 标题作为兼容回退。
- `model`：可选压缩专用模型覆盖（`provider/model-id`）。用于主会话使用一个模型，但压缩摘要用另一个时；未设置则使用会话主模型。
- `memoryFlush`：自动压缩前的静默智能回合，用于存储持久记忆；只在工作区非只读时启用。

### `agents.defaults.contextPruning`

在发送给大型语言模型前，从内存上下文中剪裁 **旧工具结果**，不改变磁盘上保存的会话历史。

```json5
{
  agents: {
    defaults: {
      contextPruning: {
        mode: "cache-ttl", // off | cache-ttl
        ttl: "1h", // 时间段（ms/s/m/h），默认单位为分钟
        keepLastAssistants: 3,
        softTrimRatio: 0.3,
        hardClearRatio: 0.5,
        minPrunableToolChars: 50000,
        softTrim: { maxChars: 4000, headChars: 1500, tailChars: 1500 },
        hardClear: {
          enabled: true,
          placeholder: "[Old tool result content cleared]",
        },
        tools: { deny: ["browser", "canvas"] },
      },
    },
  },
}
```

<Accordion title="cache-ttl 模式行为">

- `mode: "cache-ttl"` 启用剪裁流程。
- `ttl` 控制剪裁允许的最短间隔（自上次缓存访问起算）。
- 剪裁首先执行软剪裁，长工具结果保留开头和结尾，中间以 `...` 省略。
- 软剪裁后仍超长的，会执行硬清理，替换为占位符。

注意：

- 图像块不执行剪裁。
- 比例基于字符数，近似估算，非精确令牌计数。
- 不足 `keepLastAssistants` 个助手消息，则跳过剪裁。

</Accordion>

详见 [Session Pruning](/concepts/session-pruning)。

### 分块流式

```json5
{
  agents: {
    defaults: {
      blockStreamingDefault: "off", // on | off
      blockStreamingBreak: "text_end", // text_end | message_end
      blockStreamingChunk: { minChars: 800, maxChars: 1200 },
      blockStreamingCoalesce: { idleMs: 1000 },
      humanDelay: { mode: "natural" }, // off | natural | custom（使用 minMs/maxMs）
    },
  },
}
```

- 非 Telegram 频道需显式设置 `*.blockStreaming: true` 才启用块回复。
- 频道覆盖位于：`channels.<channel>.blockStreamingCoalesce`（及账号变体）中。Signal/Slack/Discord/Google Chat 默认 `minChars` 为 1500。
- `humanDelay` 为块回复间的随机延迟，`natural` 范围约 800–2500 毫秒。代理覆盖可使用 `agents.list[].humanDelay`。

详见 [Streaming](/concepts/streaming)。

### 输入指示器（Typing indicators）

```json5
{
  agents: {
    defaults: {
      typingMode: "instant", // never | instant | thinking | message
      typingIntervalSeconds: 6,
    },
  },
}
```

- 默认：私聊/提及时使用 `instant`，未提及的群聊使用 `message`。
- 会话覆盖字段为：`session.typingMode`，`session.typingIntervalSeconds`。

详见 [Typing Indicators](/concepts/typing-indicators)。

### `agents.defaults.sandbox`

嵌入代理的可选沙箱设置。详见完整指南 [Sandboxing](/gateway/sandboxing)。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
        backend: "docker", // docker | ssh | openshell
        scope: "agent", // session | agent | shared
        workspaceAccess: "none", // none | ro | rw
        workspaceRoot: "~/.openclaw/sandboxes",
        docker: {
          image: "openclaw-sandbox:bookworm-slim",
          containerPrefix: "openclaw-sbx-",
          workdir: "/workspace",
          readOnlyRoot: true,
          tmpfs: ["/tmp", "/var/tmp", "/run"],
          network: "none",
          user: "1000:1000",
          capDrop: ["ALL"],
          env: { LANG: "C.UTF-8" },
          setupCommand: "apt-get update && apt-get install -y git curl jq",
          pidsLimit: 256,
          memory: "1g",
          memorySwap: "2g",
          cpus: 1,
          ulimits: {
            nofile: { soft: 1024, hard: 2048 },
            nproc: 256,
          },
          seccompProfile: "/path/to/seccomp.json",
          apparmorProfile: "openclaw-sandbox",
          dns: ["1.1.1.1", "8.8.8.8"],
          extraHosts: ["internal.service:10.0.0.5"],
          binds: ["/home/user/source:/source:rw"],
        },
        ssh: {
          target: "user@gateway-host:22",
          command: "ssh",
          workspaceRoot: "/tmp/openclaw-sandboxes",
          strictHostKeyChecking: true,
          updateHostKeys: true,
          identityFile: "~/.ssh/id_ed25519",
          certificateFile: "~/.ssh/id_ed25519-cert.pub",
          knownHostsFile: "~/.ssh/known_hosts",
          // 也支持 SecretRefs / 内联内容：
          // identityData: { source: "env", provider: "default", id: "SSH_IDENTITY" },
          // certificateData: { source: "env", provider: "default", id: "SSH_CERTIFICATE" },
          // knownHostsData: { source: "env", provider: "default", id: "SSH_KNOWN_HOSTS" },
        },
        browser: {
          enabled: false,
          image: "openclaw-sandbox-browser:bookworm-slim",
          network: "openclaw-sandbox-browser",
          cdpPort: 9222,
          cdpSourceRange: "172.21.0.1/32",
          vncPort: 5900,
          noVncPort: 6080,
          headless: false,
          enableNoVnc: true,
          allowHostControl: false,
          autoStart: true,
          autoStartTimeoutMs: 12000,
        },
        prune: {
          idleHours: 24,
          maxAgeDays: 7,
        },
      },
    },
  },
  tools: {
    sandbox: {
      tools: {
        allow: [
          "exec",
          "process",
          "read",
          "write",
          "edit",
          "apply_patch",
          "sessions_list",
          "sessions_history",
          "sessions_send",
          "sessions_spawn",
          "session_status",
        ],
        deny: ["browser", "canvas", "nodes", "cron", "discord", "gateway"],
      },
    },
  },
}
```

<Accordion title="沙箱细节">

**后端（Backend）：**

- `docker`：本地 Docker 运行时（默认）
- `ssh`：通用 SSH 后端远程运行时
- `openshell`：OpenShell 运行时

当选择 `backend: "openshell"`，运行时配置项移到
`plugins.entries.openshell.config`。

**SSH 后端配置：**

- `target`：SSH 目标，格式为 `user@host[:port]`
- `command`：SSH 客户端命令（默认：`ssh`）
- `workspaceRoot`：远程绝对路径，作为每个作用域工作区根目录
- `identityFile` / `certificateFile` / `knownHostsFile`：本地已存在文件，传入 OpenSSH
- `identityData` / `certificateData` / `knownHostsData`：内嵌内容或 SecretRefs，OpenClaw 会在运行时物化为临时文件
- `strictHostKeyChecking` / `updateHostKeys`：OpenSSH 主机密钥策略设置项

**SSH 认证优先级：**

- `identityData` 优先于 `identityFile`
- `certificateData` 优先于 `certificateFile`
- `knownHostsData` 优先于 `knownHostsFile`
- 基于 SecretRef 的 `*Data` 在沙箱会话启动前从活跃的密钥快照解析

**SSH 后端行为：**

- 创建或重建后只进行一次远程工作区初始化
- 后续保持远程 SSH 工作区为正本
- 通过 SSH 路由 `exec`，文件工具和媒体路径
- 不自动同步远程变更回主机
- 不支持沙箱浏览器容器

**工作区访问权限：**

- `none`：每个作用域的沙箱工作区在 `~/.openclaw/sandboxes` 下
- `ro`：沙箱工作区挂载到 `/workspace`，代理工作区只读挂载到 `/agent`
- `rw`：代理工作区读写挂载到 `/workspace`

**作用域（scope）：**

- `session`：每会话容器与工作区
- `agent`：每代理单个容器与工作区（默认）
- `shared`：共享容器和工作区（无会话隔离）

**OpenShell 插件配置：**

```json5
{
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          mode: "mirror", // mirror | remote
          from: "openclaw",
          remoteWorkspaceDir: "/sandbox",
          remoteAgentWorkspaceDir: "/agent",
          gateway: "lab", // 可选
          gatewayEndpoint: "https://lab.example", // 可选
          policy: "strict", // 可选 OpenShell 策略 ID
          providers: ["openai"], // 可选
          autoProviders: true,
          timeoutSeconds: 120,
        },
      },
    },
  },
}
```

**OpenShell 模式：**

- `mirror`：每次执行前从本地同步种子到远程，执行后同步回本地；本地工作区保持正本
- `remote`：沙箱创建时只同步一次远程种子，后续保持远程工作区为正本

`remote` 模式下，宿主机上 OpenClaw 外的本地编辑不会被自动同步进沙箱。传输通过 SSH 进入 OpenShell 沙箱，但插件控制沙箱生命周期和可选的镜像同步。

**`setupCommand`** 容器创建后只运行一次（通过 `sh -lc`）。需要网络出口、可写根目录和 root 用户权限。

容器默认 `network: "none"`，需出口访问时设置为 `"bridge"` 或自定义桥接网络。`"host"` 和 `"container:<id>"` 默认禁用，除非显式开启 `sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`（破戒模式）。

**入站附件** 会被记录到活动工作区的 `media/inbound/*` 路径。

**`docker.binds`** 额外挂载主机目录，支持全局和代理单独合并。

**沙箱浏览器**（`sandbox.browser.enabled`）：容器内的 Chromium + CDP，无需启用 `browser.enabled`。  
noVNC 使用 VNC 认证，OpenClaw 生成短期令牌 URL，避免密码泄漏。

- `allowHostControl: false`（默认）阻止沙箱会话控制主机浏览器。
- `network` 默认使用独立桥接网络 `openclaw-sandbox-browser`。如需使用全局桥接，设置为 `bridge`。
- `cdpSourceRange` 可限制 CDP 容器入站地址范围（如 `172.21.0.1/32`）。
- `sandbox.browser.binds` 仅挂载额外路径至浏览器容器，若设置（包括空数组）则覆盖 docker.binds。
- 启动时参考 `scripts/sandbox-browser-entrypoint.sh`，包含远程调试地址和端口、用户数据目录、禁止首次运行、无 GPU、各种安全禁用等。
- 只需通过自定义镜像和入口点修改容器启动默认行为。

</Accordion>

浏览器沙箱和 `sandbox.docker.binds` 目前仅支持 Docker。

构建镜像：

```bash
scripts/sandbox-setup.sh           # 主沙箱镜像
scripts/sandbox-browser-setup.sh   # 可选浏览器镜像
```

### `agents.list`（单个代理覆盖）

```json5
{
  agents: {
    list: [
      {
        id: "main",
        default: true,
        name: "Main Agent",
        workspace: "~/.openclaw/workspace",
        agentDir: "~/.openclaw/agents/main/agent",
        model: "anthropic/claude-opus-4-6", // 或 { primary, fallbacks }
        thinkingDefault: "high", // 每代理思考级别覆盖
        reasoningDefault: "on", // 每代理推理可见性覆盖
        fastModeDefault: false, // 每代理快速模式覆盖
        params: { cacheRetention: "none" }, // 按键覆盖匹配的 defaults.models 参数
        identity: {
          name: "Samantha",
          theme: "helpful sloth",
          emoji: "🦥",
          avatar: "avatars/samantha.png",
        },
        groupChat: { mentionPatterns: ["@openclaw"] },
        sandbox: { mode: "off" },
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
        subagents: { allowAgents: ["*"] },
        tools: {
          profile: "coding",
          allow: ["browser"],
          deny: ["canvas"],
          elevated: { enabled: true },
        },
      },
    ],
  },
}
```

- `id`：稳定的代理 ID（必需）。
- `default`：设置多个时，第一个生效（会记录警告）。若未设置，列表第一项为默认。
- `model`：字符串形式仅覆盖 `primary`；对象形式 `{ primary, fallbacks }` 覆盖两者（`[]` 禁用全局后备）。仅覆盖 `primary` 的定时任务仍会继承默认后备，除非设置 `fallbacks: []`。
- `params`：每代理流参数，合并到 `agents.defaults.models` 中选定的模型条目上。用于代理特定的覆盖，如 `cacheRetention`、`temperature` 或 `maxTokens`，无需复制整个模型目录。
- `thinkingDefault`：可选的每代理默认思考级别（`off | minimal | low | medium | high | xhigh | adaptive`）。覆盖此代理的 `agents.defaults.thinkingDefault`，当没有逐消息或会话覆盖时生效。
- `reasoningDefault`：可选的每代理默认推理可见性（`on | off | stream`）。在没有逐消息或会话推理覆盖时生效。
- `fastModeDefault`：可选的每代理快速模式默认值（`true | false`）。在没有逐消息或会话快速模式覆盖时生效。
- `runtime`：可选的每代理运行时装载器。当代理应默认为 ACP 工具会话时，使用 `type: "acp"` 及 `runtime.acp` 默认值（`agent`、`backend`、`mode`、`cwd`）。
- `identity.avatar`：工作区相对路径、`http(s)` URL 或 `data:` URI。
- `identity` 派生默认值：`ackReaction` 来自 `emoji`，`mentionPatterns` 来自 `name`/`emoji`。
- `subagents.allowAgents`：`sessions_spawn` 的代理 ID 白名单（`["*"]` = 任意；默认：仅同一代理）。
- 沙箱继承保护：如果请求者会话处于沙箱中，`sessions_spawn` 会拒绝那些将在非沙箱中运行的目标。

---

## 多代理路由

单个网关内运行多个独立代理。详见 [Multi-Agent](/concepts/multi-agent)。

```json5
{
  agents: {
    list: [
      { id: "home", default: true, workspace: "~/.openclaw/workspace-home" },
      { id: "work", workspace: "~/.openclaw/workspace-work" },
    ],
  },
  bindings: [
    { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
    { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },
  ],
}
```

### 绑定匹配字段

- `type`（可选）：`route`（默认）或 `acp`（持久 ACP 会话绑定）
- `match.channel`（必填）
- `match.accountId`（可选；`*` 任意账号，省略为默认账号）
- `match.peer`（可选；格式 `{ kind: direct|group|channel, id }`）
- `match.guildId` / `match.teamId`（可选；频道专用）
- `acp`（可选，仅限 `type: "acp"`）：含 `mode`、`label`、`cwd`、`backend`

**确定性匹配顺序：**

1. `match.peer`
2. `match.guildId`
3. `match.teamId`
4. `match.accountId`（精确，无 peer/guild/team）
5. `match.accountId: "*"`（频道全局）
6. 默认代理

相同层级按 `bindings` 顺序首个匹配生效。

`type: "acp"` 区别匹配，按精确会话身份（频道 + 账号 + peer ID）匹配，无路由绑定层级顺序。

### 代理访问配置

<Accordion title="完全访问（无沙箱）">

```json5
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/.openclaw/workspace-personal",
        sandbox: { mode: "off" },
      },
    ],
  },
}
```

</Accordion>

<Accordion title="只读工具 + 工作区">

```json5
{
  agents: {
    list: [
      {
        id: "family",
        workspace: "~/.openclaw/workspace-family",
        sandbox: { mode: "all", scope: "agent", workspaceAccess: "ro" },
        tools: {
          allow: [
            "read",
            "sessions_list",
            "sessions_history",
            "sessions_send",
            "sessions_spawn",
            "session_status",
          ],
          deny: ["write", "edit", "apply_patch", "exec", "process", "browser"],
        },
      },
    ],
  },
}
```

</Accordion>

<Accordion title="无文件系统访问（仅消息）">

```json5
{
  agents: {
    list: [
      {
        id: "public",
        workspace: "~/.openclaw/workspace-public",
        sandbox: { mode: "all", scope: "agent", workspaceAccess: "none" },
        tools: {
          allow: [
            "sessions_list",
            "sessions_history",
            "sessions_send",
            "sessions_spawn",
            "session_status",
            "whatsapp",
            "telegram",
            "slack",
            "discord",
            "gateway",
          ],
          deny: [
            "read",
            "write",
            "edit",
            "apply_patch",
            "exec",
            "process",
            "browser",
            "canvas",
            "nodes",
            "cron",
            "gateway",
            "image",
          ],
        },
      },
    ],
  },
}
```

</Accordion>

详见 [Multi-Agent Sandbox & Tools](/tools/multi-agent-sandbox-tools)。

---

## 会话（Session）

```json5
{
  session: {
    scope: "per-sender",
    dmScope: "main", // main | per-peer | per-channel-peer | per-account-channel-peer
    identityLinks: {
      alice: ["telegram:123456789", "discord:987654321012345678"],
    },
    reset: {
      mode: "daily", // daily | idle
      atHour: 4,
      idleMinutes: 60,
    },
    resetByType: {
      thread: { mode: "daily", atHour: 4 },
      direct: { mode: "idle", idleMinutes: 240 },
      group: { mode: "idle", idleMinutes: 120 },
    },
    resetTriggers: ["/new", "/reset"],
    store: "~/.openclaw/agents/{agentId}/sessions/sessions.json",
    parentForkMaxTokens: 100000, // 超过此令牌数跳过父线程 fork（0 禁用）
    maintenance: {
      mode: "warn", // warn | enforce
      pruneAfter: "30d",
      maxEntries: 500,
      rotateBytes: "10mb",
      resetArchiveRetention: "30d", // 持久时间或 false
      maxDiskBytes: "500mb", // 可选硬预算
      highWaterBytes: "400mb", // 可选清理目标
    },
    threadBindings: {
      enabled: true,
      idleHours: 24, // 默认非活跃自动取消聚焦小时数（0 禁用）
      maxAgeHours: 0, // 默认最大存活小时数（0 禁用）
    },
    mainKey: "main", // 兼容字段（运行时恒使用 "main"）
    agentToAgent: { maxPingPongTurns: 5 },
    sendPolicy: {
      rules: [
        { action: "deny", match: { channel: "discord", chatType: "group" } },
      ],
      default: "allow",
    },
  },
}
```

<Accordion title="会话字段详解">

- **`dmScope`**：私信分组方式
  - `main`：所有私信共享主会话
  - `per-peer`：按发送者跨频道隔离
  - `per-channel-peer`：按频道+发送者隔离（推荐用于多用户收件箱）
  - `per-account-channel-peer`：账号+频道+发送者隔离（推荐多账号场景）
- **`identityLinks`**：映射规范 ID 到带提供商前缀的对端，用于跨频道共享会话。
- **`reset`**：主重置策略。`daily` 于本地时间 `atHour` 重置，`idle` 在空闲超时后重置。两者并存时，先触发者生效。
- **`resetByType`**：基于消息类型的重置覆盖（`direct` 支持旧别名 `dm`）。
- **`parentForkMaxTokens`**：fork 线程时父会话总令牌数上限（默认 100000）。超过则启新线程，不继承历史。0 禁用。
- **`mainKey`**：兼容字段，运行时均用 `"main"` 作为主私聊键。
- **`sendPolicy`**：基于 `channel`、`chatType`（`direct|group|channel`，旧别名 `dm`）、`keyPrefix`、`rawKeyPrefix` 匹配规则，首个拒绝生效。
- **`maintenance`**：会话存储清理与保留
  - `mode`: `warn`（仅报警）或 `enforce`（执行清理）
  - `pruneAfter`：陈旧条目剪裁时长（默认 30 天）
  - `maxEntries`：`sessions.json` 最大条目数（默认 500）
  - `rotateBytes`：`sessions.json` 超限轮转大小（默认 10MB）
  - `resetArchiveRetention`：重置档案保留，默认跟随 `pruneAfter`，可设置 `false` 禁用
  - `maxDiskBytes`：会话目录硬盘空间预算，`warn` 模式仅告警，`enforce` 模式删除最老文件
  - `highWaterBytes`：预算清理后目标水位，默认取最大值 80%
- **`threadBindings`**：线程绑定会话功能全局默认，提供商可覆盖
  - `enabled`：主开关
  - `idleHours`：非活跃自动取消聚焦时间（0 禁用）
  - `maxAgeHours`：最大存活时间（0 禁用）

</Accordion>

---

## 消息（Messages）

```json5
{
  messages: {
    responsePrefix: "🦞", // 或 "auto"
    ackReaction: "👀",
    ackReactionScope: "group-mentions", // group-mentions | group-all | direct | all
    removeAckAfterReply: false,
    queue: {
      mode: "collect", // steer | followup | collect | steer-backlog | steer+backlog | queue | interrupt
      debounceMs: 1000,
      cap: 20,
      drop: "summarize", // old | new | summarize
      byChannel: {
        whatsapp: "collect",
        telegram: "collect",
      },
    },
    inbound: {
      debounceMs: 2000, // 0 禁用
      byChannel: {
        whatsapp: 5000,
        slack: 1500,
      },
    },
  },
}
```

### 回复前缀

支持频道或账号覆盖：`channels.<channel>.responsePrefix`，`channels.<channel>.accounts.<id>.responsePrefix`。

解析顺序（最长优先）：账号 → 频道 → 全局。设为空字符串禁用且阻止继续回退。设置为 `"auto"` 解析为 `[{identity.name}]`。

**模板变量：**

| 变量              | 说明         | 示例                        |
| ----------------- | ------------ | --------------------------- |
| `{model}`         | 短模型名     | `claude-opus-4-6`           |
| `{modelFull}`     | 完整模型标识 | `anthropic/claude-opus-4-6` |
| `{provider}`      | 提供商名     | `anthropic`                 |
| `{thinkingLevel}` | 当前思考等级 | `high`、`low`、`off`        |
| `{identity.name}` | 代理身份名称 | 同 `"auto"`                 |

变量不区分大小写，`{think}` 是 `{thinkingLevel}` 的别名。

### 确认反应

- 默认为活动代理的 `identity.emoji`，否则为 `"👀"`，设为空字符串关闭。
- 频道覆盖：`channels.<channel>.ackReaction`，`channels.<channel>.accounts.<id>.ackReaction`
- 解析顺序：账号 → 频道 → `messages.ackReaction` → 身份默认
- 范围：`group-mentions`（默认）、`group-all`、`direct`、`all`
- `removeAckAfterReply`：回复后移除确认反应（支持 Slack/Discord/Telegram/Google Chat）

### 入站防抖

对同一发送者的快速文本消息进行聚合，合并为单次代理回合。媒体/附件即时刷新。控制命令绕过防抖。

### TTS（文本转语音）

```json5
{
  messages: {
    tts: {
      auto: "always", // off | always | inbound | tagged
      mode: "final", // final | all
      provider: "elevenlabs",
      summaryModel: "openai/gpt-4.1-mini",
      modelOverrides: { enabled: true },
      maxTextLength: 4000,
      timeoutMs: 30000,
      prefsPath: "~/.openclaw/settings/tts.json",
      elevenlabs: {
        apiKey: "elevenlabs_api_key",
        baseUrl: "https://api.elevenlabs.io",
        voiceId: "voice_id",
        modelId: "eleven_multilingual_v2",
        seed: 42,
        applyTextNormalization: "auto",
        languageCode: "en",
        voiceSettings: {
          stability: 0.5,
          similarityBoost: 0.75,
          style: 0.0,
          useSpeakerBoost: true,
          speed: 1.0,
        },
      },
      openai: {
        apiKey: "openai_api_key",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini-tts",
        voice: "alloy",
      },
    },
  },
}
```

- `auto` 控制自动 TTS，支持 `/tts off|always|inbound|tagged` 会话覆盖。
- `summaryModel` 覆盖默认 `agents.defaults.model.primary` 以启用自动摘要。
- `modelOverrides` 默认开启，`modelOverrides.allowProvider` 默认为 `false`，需手动启用。
- API Key 支持回退到环境变量 `ELEVENLABS_API_KEY`/`XI_API_KEY` 和 `OPENAI_API_KEY`。
- `openai.baseUrl` 覆盖 OpenAI TTS 端点，解析顺序为配置 -> `OPENAI_TTS_BASE_URL` 环境变量 -> 默认地址。
- 指定非 OpenAI 地址时，OpenClaw 做 OpenAI 兼容接口调用，放宽模型与语音验证。

---

## 对话（Talk）

macOS/iOS/Android Talk 模式默认值。

```json5
{
  talk: {
    voiceId: "elevenlabs_voice_id",
    voiceAliases: {
      Clawd: "EXAVITQu4vr4xnSDxMaL",
      Roger: "CwhRBWXzGAHq8TQ4Fs17",
    },
    modelId: "eleven_v3",
    outputFormat: "mp3_44100_128",
    apiKey: "elevenlabs_api_key",
    silenceTimeoutMs: 1500,
    interruptOnSpeech: true,
  },
}
```

- Voice ID 支持回退至 `ELEVENLABS_VOICE_ID` 或 `SAG_VOICE_ID`。
- 支持明文字符串或 SecretRef 对象作为 `apiKey` 及提供商密钥。
- 仅当无 Talk API Key 时回退 `ELEVENLABS_API_KEY`。
- `voiceAliases` 允许 Talk 指令使用别名。
- `silenceTimeoutMs` 控制在用户沉默后，Talk 模式等待多长时间才发送转录内容。未设置时，将保持平台默认的暂停窗口（macOS 和 Android 为 700 毫秒，iOS 为 900 毫秒）。

---

## 工具（Tools）

### 工具配置档（Profiles）

`tools.profile` 用于在 `tools.allow` / `tools.deny` 前设定基础允许列表。

本地导入未配置时默认 `tools.profile: "coding"`，已有显式配置不覆盖。

| 配置档      | 包含工具                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------- |
| `minimal`   | 仅 `session_status`                                                                       |
| `coding`    | `group:fs`、`group:runtime`、`group:sessions`、`group:memory`、`image`                    |
| `messaging` | `group:messaging`，`sessions_list`，`sessions_history`，`sessions_send`，`session_status` |
| `full`      | 无限制（与不设置相同）                                                                    |

### 工具组

| 组名               | 工具列表                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `group:runtime`    | `exec`、`process`（`bash` 视为 `exec` 别名）                                             |
| `group:fs`         | `read`、`write`、`edit`、`apply_patch`                                                   |
| `group:sessions`   | `sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`session_status` |
| `group:memory`     | `memory_search`、`memory_get`                                                            |
| `group:web`        | `web_search`、`web_fetch`                                                                |
| `group:ui`         | `browser`、`canvas`                                                                      |
| `group:automation` | `cron`、`gateway`                                                                        |
| `group:messaging`  | `message`                                                                                |
| `group:nodes`      | `nodes`                                                                                  |
| `group:openclaw`   | 所有内置工具（不含提供商插件）                                                           |

### `tools.allow` / `tools.deny`

全局工具允许/拒绝策略（拒绝优先）。大小写不敏感，支持通配符 `*`。沙箱关闭时照常应用。

```json5
{
  tools: { deny: ["browser", "canvas"] },
}
```

### `tools.byProvider`

可针对特定提供商或模型限制工具。顺序为基础配置档 → 提供商配置档 → 允许/拒绝。

```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" },
      "openai/gpt-5.2": { allow: ["group:fs", "sessions_list"] },
    },
  },
}
```

### `tools.elevated`

控制提升权限（主机执行）访问：

```json5
{
  tools: {
    elevated: {
      enabled: true,
      allowFrom: {
        whatsapp: ["+15555550123"],
        discord: ["1234567890123", "987654321098765432"],
      },
    },
  },
}
```

- 代理单独覆盖（`agents.list[].tools.elevated`）只能限制权限。
- `/elevated on|off|ask|full` 按会话存储状态；内联指令仅针对单条消息。
- 提升权限的 `exec` 运行主机，绕过沙箱。

### `tools.exec`

```json5
{
  tools: {
    exec: {
      backgroundMs: 10000,
      timeoutSec: 1800,
      cleanupMs: 1800000,
      notifyOnExit: true,
      notifyOnExitEmptySuccess: false,
      applyPatch: {
        enabled: false,
        allowModels: ["gpt-5.2"],
      },
    },
  },
}
```

### `tools.loopDetection`

默认关闭工具调用循环检测。设置 `enabled: true` 激活。支持全局（`tools.loopDetection`）及代理级覆盖（`agents.list[].tools.loopDetection`）。

```json5
{
  tools: {
    loopDetection: {
      enabled: true,
      historySize: 30,
      warningThreshold: 10,
      criticalThreshold: 20,
      globalCircuitBreakerThreshold: 30,
      detectors: {
        genericRepeat: true,
        knownPollNoProgress: true,
        pingPong: true,
      },
    },
  },
}
```

- `historySize`：保留的工具调用历史最大条数。
- `warningThreshold`：检测到重复无进展模式时触发警告阈值。
- `criticalThreshold`：更高级别重复模式触发关键循环阻断。
- `globalCircuitBreakerThreshold`：硬停阈值，任何无进展运行停止。
- `detectors.genericRepeat`：警告同工具同参数重复调用。
- `detectors.knownPollNoProgress`：警告/阻断已知无进展轮询工具。
- `detectors.pingPong`：警告/阻断交替无进展对称模式。
- `warningThreshold` 必须小于 `criticalThreshold`，后者小于 `globalCircuitBreakerThreshold`，否则配置校验失败。

### `tools.web`

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        apiKey: "brave_api_key", // 或环境变量 BRAVE_API_KEY
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
      fetch: {
        enabled: true,
        maxChars: 50000,
        maxCharsCap: 50000,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
        userAgent: "custom-ua",
      },
    },
  },
}
```

### `tools.media`

配置入站媒体理解（图片/音频/视频）：

```json5
{
  tools: {
    media: {
      concurrency: 2,
      audio: {
        enabled: true,
        maxBytes: 20971520,
        scope: {
          default: "deny",
          rules: [{ action: "allow", match: { chatType: "direct" } }],
        },
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" },
          {
            type: "cli",
            command: "whisper",
            args: ["--model", "base", "{{MediaPath}}"],
          },
        ],
      },
      video: {
        enabled: true,
        maxBytes: 52428800,
        models: [{ provider: "google", model: "gemini-3-flash-preview" }],
      },
    },
  },
}
```

<Accordion title="媒体模型条目字段">

**提供商条目**（`type: "provider"` 或省略）：

- `provider`：API 提供商 ID（如 `openai`、`anthropic`、`google`/`gemini`、`groq` 等）
- `model`：模型 ID 覆盖
- `profile` / `preferredProfile`：`auth-profiles.json` 中的认证配置档

**CLI 条目** (`type: "cli"`)：

- `command`：执行命令
- `args`：含模板参数支持（例如 `{{MediaPath}}`、`{{Prompt}}`、`{{MaxChars}}`）

**通用字段**：

- `capabilities`（可选）：支持列表（`image`、`audio`、`video`），默认：`openai`/`anthropic`/`minimax` → 图像，`google`→ 图/音/视，`groq`→音频。
- `prompt`、`maxChars`、`maxBytes`、`timeoutSeconds`、`language` 等字段可覆盖。
- 失败时自动切换到下一个条目。

提供商认证遵循标准顺序：`auth-profiles.json` → 环境变量 → `models.providers.*.apiKey`。

</Accordion>

### `tools.agentToAgent`

```json5
{
  tools: {
    agentToAgent: {
      enabled: false,
      allow: ["home", "work"],
    },
  },
}
```

### `tools.sessions`

控制哪些会话可由会话工具目标调用（`sessions_list`、`sessions_history`、`sessions_send`）。

默认值为 `"tree"`（当前会话及其派生会话，如子代理）。

```json5
{
  tools: {
    sessions: {
      // "self" | "tree" | "agent" | "all"
      visibility: "tree",
    },
  },
}
```

说明：

- `self`：仅当前会话。
- `tree`：当前会话及其派生（子代理）会话。
- `agent`：所属当前代理的任意会话（多用户共用代理时可能包含其他用户会话）。
- `all`：任意会话。跨代理目标仍需 `tools.agentToAgent`。
- 沙箱约束：当前会话为沙箱状态且 `agents.defaults.sandbox.sessionToolsVisibility="spawned"`，则强制为 `tree`，覆盖任何配置。

### `tools.sessions_spawn`

控制 `sessions_spawn` 的内联附件支持。

```json5
{
  tools: {
    sessions_spawn: {
      attachments: {
        enabled: false, // opt-in 允许内联文件附件
        maxTotalBytes: 5242880, // 5MB 总容量
        maxFiles: 50,
        maxFileBytes: 1048576, // 单文件最大 1MB
        retainOnSessionKeep: false, // cleanup="keep" 时保留附件
      },
    },
  },
}
```

说明：

- 附件仅支持 `runtime: "subagent"`，ACP 运行时拒绝。
- 文件物化在子工作区的 `.openclaw/attachments/<uuid>/`，含 `.manifest.json`。
- 自动从转录中脱敏附件内容。
- Base64 输入严格验证字母表和填充，预防过大解码。
- 目录权限为 `0700`，文件权限为 `0600`。
- 清理遵循 `cleanup` 策略：`delete` 始终删除，`keep` 仅当 `retainOnSessionKeep: true` 时保留。

### `tools.subagents`

```json5
{
  agents: {
    defaults: {
      subagents: {
        model: "minimax/MiniMax-M2.7",
        maxConcurrent: 1,
        runTimeoutSeconds: 900,
        archiveAfterMinutes: 60,
      },
    },
  },
}
```

- `model`：子代理默认模型，缺省时继承调用者模型。
- `runTimeoutSeconds`：调用时未传超时时默认秒数，0 表示无超时。
- 子代理工具策略可用 `tools.subagents.tools.allow` / `tools.subagents.tools.deny` 调整。

---

## 自定义提供商和基础 URL

OpenClaw 使用 pi-coding-agent 模型目录。可通过配置 `models.providers` 或在代理目录下的 `models.json` 中添加自定义提供商。

```json5
{
  models: {
    mode: "merge", // merge（默认）| replace
    providers: {
      "custom-proxy": {
        baseUrl: "http://localhost:4000/v1",
        apiKey: "LITELLM_KEY",
        api: "openai-completions", // openai-completions | openai-responses | anthropic-messages | google-generative-ai
        models: [
          {
            id: "llama-3.1-8b",
            name: "Llama 3.1 8B",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

- 可设置 `authHeader: true` 并配置 `headers` 以满足自定义认证需求。
- 通过环境变量 `OPENCLAW_AGENT_DIR`（或 `PI_CODING_AGENT_DIR`）覆盖代理配置根目录。
- 相同提供商 ID 的合并优先级：
  - 非空代理 `models.json` 中的 `baseUrl` 优先。
  - 非空代理 `apiKey` 仅当提供商未由当前配置/认证配置文件的 SecretRef 管理时生效。
  - SecretRef 管理的 `apiKey` 从源标记（环境变量或文件/外部命令）刷新，不保存明文。
  - SecretRef 管理的提供商头部值同样从源标记刷新（环境变量形式为 `secretref-env:ENV_VAR_NAME`，文件/执行形式为 `secretref-managed`）。
  - 空或缺失代理 `apiKey`/`baseUrl` 回退为配置中 `models.providers`。
  - 相同模型的 `contextWindow`/`maxTokens` 取显式配置和隐式目录的较大值。
  - 使用 `models.mode: "replace"` 可完全替换 `models.json`。
  - 标记持久化以源配置快照为准（解析前），而非运行时解析的秘密值。

### 提供商字段详解

- `models.mode`：提供商目录行为（`merge` 或 `replace`）。
- `models.providers`：自定义提供商映射，键为提供商 ID。
- `models.providers.*.api`：请求适配器（如 `openai-completions`、`openai-responses`、`anthropic-messages`、`google-generative-ai` 等）。
- `models.providers.*.apiKey`：凭证（推荐 SecretRef/env 解析）。
- `models.providers.*.auth`：认证策略（`api-key`、`token`、`oauth`、`aws-sdk`）。
- `models.providers.*.injectNumCtxForOpenAICompat`：为 Ollama + `openai-completions` 注入 `options.num_ctx` 请求（默认 `true`）。
- `models.providers.*.authHeader`：强制使用 `Authorization` 头传递凭证。
- `models.providers.*.baseUrl`：上游 API 基础 URL。
- `models.providers.*.headers`：附加静态头，用于代理或租户路由。
- `models.providers.*.models`：明确提供商模型条目。
- `models.providers.*.models.*.compat.supportsDeveloperRole`：兼容性提示。对于拥有非空且非官方 `baseUrl`（非 `api.openai.com`）的 `openai-completions`，运行时强制为 `false`，空或缺省 `baseUrl` 保持默认 OpenAI 行为。
- `models.bedrockDiscovery`：Bedrock 自动发现配置根。
- `models.bedrockDiscovery.enabled`：启用或禁用发现轮询。
- `models.bedrockDiscovery.region`：AWS 区域。
- `models.bedrockDiscovery.providerFilter`：可选提供商过滤。
- `models.bedrockDiscovery.refreshInterval`：刷新间隔。
- `models.bedrockDiscovery.defaultContextWindow`：发现模型默认上下文窗口。
- `models.bedrockDiscovery.defaultMaxTokens`：发现模型默认输出令牌数。

### 提供商示例

<Accordion title="Cerebras（GLM 4.6 / 4.7）">

```json5
{
  env: { CEREBRAS_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: {
        primary: "cerebras/zai-glm-4.7",
        fallbacks: ["cerebras/zai-glm-4.6"],
      },
      models: {
        "cerebras/zai-glm-4.7": { alias: "GLM 4.7 (Cerebras)" },
        "cerebras/zai-glm-4.6": { alias: "GLM 4.6 (Cerebras)" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      cerebras: {
        baseUrl: "https://api.cerebras.ai/v1",
        apiKey: "${CEREBRAS_API_KEY}",
        api: "openai-completions",
        models: [
          { id: "zai-glm-4.7", name: "GLM 4.7 (Cerebras)" },
          { id: "zai-glm-4.6", name: "GLM 4.6 (Cerebras)" },
        ],
      },
    },
  },
}
```

使用 `cerebras/zai-glm-4.7` 调用 Cerebras；使用 `zai/glm-4.7` 调用 Z.AI。

</Accordion>

<Accordion title="OpenCode">

```json5
{
  agents: {
    defaults: {
      model: { primary: "opencode/claude-opus-4-6" },
      models: { "opencode/claude-opus-4-6": { alias: "Opus" } },
    },
  },
}
```

设置 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）。Zen 目录使用 `opencode/...` 引用，Go 目录使用 `opencode-go/...` 引用。快捷方式：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`。

</Accordion>

<Accordion title="Z.AI（GLM-4.7）">

```json5
{
  agents: {
    defaults: {
      model: { primary: "zai/glm-4.7" },
      models: { "zai/glm-4.7": {} },
    },
  },
}
```

设置 `ZAI_API_KEY`。接受 `z.ai/*` 和 `z-ai/*` 别名。快捷方式：`openclaw onboard --auth-choice zai-api-key`。

- 通用端点：https://api.z.ai/api/paas/v4
- 编码端点（默认）：https://api.z.ai/api/coding/paas/v4
- 通用端点需要自定义提供商配置 base URL。

</Accordion>

<Accordion title="Moonshot AI（Kimi）">

```json5
{
  env: { MOONSHOT_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "moonshot/kimi-k2.5" },
      models: { "moonshot/kimi-k2.5": { alias: "Kimi K2.5" } },
    },
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "kimi-k2.5",
            name: "Kimi K2.5",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

中国端点可用：`baseUrl: "https://api.moonshot.cn/v1"` 或 `openclaw onboard --auth-choice moonshot-api-key-cn`。

</Accordion>

<Accordion title="Kimi Coding">

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "kimi-coding/k2p5" },
      models: { "kimi-coding/k2p5": { alias: "Kimi K2.5" } },
    },
  },
}
```

Anthropic 兼容内置提供商。快捷方式：`openclaw onboard --auth-choice kimi-code-api-key`。

</Accordion>

<Accordion title="Synthetic（Anthropic 兼容）">

```json5
{
  env: { SYNTHETIC_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.5" },
      models: {
        "synthetic/hf:MiniMaxAI/MiniMax-M2.5": { alias: "MiniMax M2.5" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      synthetic: {
        baseUrl: "https://api.synthetic.new/anthropic",
        apiKey: "${SYNTHETIC_API_KEY}",
        api: "anthropic-messages",
        models: [
          {
            id: "hf:MiniMaxAI/MiniMax-M2.5",
            name: "MiniMax M2.5",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 192000,
            maxTokens: 65536,
          },
        ],
      },
    },
  },
}
```

Base URL 应省略 `/v1`（Anthropic 客户端自动添加）。快捷方式：`openclaw onboard --auth-choice synthetic-api-key`。

</Accordion>

<Accordion title="MiniMax M2.7 (direct)">

```json5
{
  agents: {
    defaults: {
      model: { primary: "minimax/MiniMax-M2.7" },
      models: {
        "minimax/MiniMax-M2.7": { alias: "Minimax" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      minimax: {
        baseUrl: "https://api.minimax.io/anthropic",
        apiKey: "${MINIMAX_API_KEY}",
        api: "anthropic-messages",
        models: [
          {
            id: "MiniMax-M2.7",
            name: "MiniMax M2.7",
            reasoning: true,
            input: ["text"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.03, cacheWrite: 0.12 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

设置 `MINIMAX_API_KEY`。快捷方式：`openclaw onboard --auth-choice minimax-api`。
`MiniMax-M2.5` 和 `MiniMax-M2.5-highspeed` 仍然可用，如你偏好旧版文本模型。

</Accordion>

<Accordion title="本地模型（LM Studio）">

详见 [Local Models](/gateway/local-models)。简要：在高性能硬件上通过 LM Studio Responses API 使用 MiniMax M2.5，保持托管模型用作回退。

</Accordion>

---

## 技能（Skills）

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills"],
    },
    install: {
      preferBrew: true,
      nodeManager: "npm", // npm | pnpm | yarn
    },
    entries: {
      "image-lab": {
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // 或纯文本字符串
        env: { GEMINI_API_KEY: "GEMINI_KEY_HERE" },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

- `allowBundled`：仅允许打包技能白名单（管理/工作区技能无影响）。
- `entries.<skillKey>.enabled: false` 可禁用技能。
- `entries.<skillKey>.apiKey` 可简化绑定主力环境变量（明文或 SecretRef）。

---

## 插件（Plugins）

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: [],
    load: {
      paths: ["~/Projects/oss/voice-call-extension"],
    },
    entries: {
      "voice-call": {
        enabled: true,
        hooks: {
          allowPromptInjection: false,
        },
        config: { provider: "twilio" },
      },
    },
  },
}
```

从 `~/.openclaw/extensions`、`<workspace>/.openclaw/extensions` 以及 `plugins.load.paths` 加载。
发现机制接受原生 OpenClaw 插件以及兼容的 Codex 包和 Claude 包，包括无清单的 Claude 默认布局包。
**配置更改需要重启网关。**
- `allow`：可选白名单（仅加载列出的插件）。`deny` 优先。
- `plugins.entries.<id>.apiKey`：插件级 API 密钥便捷字段（当插件支持时）。
- `plugins.entries.<id>.env`：插件级环境变量映射。
- `plugins.entries.<id>.hooks.allowPromptInjection`：当为 `false` 时，核心屏蔽 `before_prompt_build` 并忽略来自旧版 `before_agent_start` 的提示变更字段，同时保留旧版 `modelOverride` 和 `providerOverride`。适用于原生插件钩子及支持的包提供的钩子目录。
- `plugins.entries.<id>.subagent.allowModelOverride`：显式信任此插件以请求每次运行的 `provider` 和 `model` 覆盖，用于后台子代理运行。
- `plugins.entries.<id>.subagent.allowedModels`：可信子代理覆盖的可选标准 `provider/model` 目标白名单。仅当你有意允许任何模型时使用 `"*"`。
- `plugins.entries.<id>.config`：插件定义的配置对象（当有原生 OpenClaw 插件架构时进行验证）。
- 启用的 Claude 包插件也可从 `settings.json` 贡献嵌入式 Pi 默认值；OpenClaw 将其作为经过清理的代理设置应用，而非原始 OpenClaw 配置补丁。
- `plugins.slots.memory`：选择活动的记忆插件 ID，或设为 `"none"` 以禁用记忆插件。
- `plugins.slots.contextEngine`：选择活动的上下文引擎插件 ID；默认为 `"legacy"`，除非安装并选择了其他引擎。
- `plugins.installs`：`openclaw plugins update` 使用的 CLI 管理安装元数据。
  - 包含 `source`、`spec`、`sourcePath`、`installPath`、`version`、`resolvedName`、`resolvedVersion`、`resolvedSpec`、`integrity`、`shasum`、`resolvedAt`、`installedAt`。
  - 将 `plugins.installs.*` 视为托管状态；优先使用 CLI 命令而非手动编辑。

详见 [Plugins](/tools/plugin)。

---

## 浏览器（Browser）

```json5
{
  browser: {
    enabled: true,
    evaluateEnabled: true,
    defaultProfile: "user",
    ssrfPolicy: {
      dangerouslyAllowPrivateNetwork: true, // 默认受信任网络模式
      // allowPrivateNetwork: true, // 旧别名
      // hostnameAllowlist: ["*.example.com", "example.com"],
      // allowedHostnames: ["localhost"],
    },
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: { cdpPort: 18801, color: "#0066CC" },
      user: { driver: "existing-session", attachOnly: true, color: "#00AA00" },
      brave: {
        driver: "existing-session",
        attachOnly: true,
        userDataDir: "~/Library/Application Support/BraveSoftware/Brave-Browser",
        color: "#FB542B",
      },
      remote: { cdpUrl: "http://10.0.0.42:9222", color: "#00AA00" },
    },
    color: "#FF4500",
    // headless: false,
    // noSandbox: false,
    // extraArgs: [],
    // executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    // attachOnly: false,
  },
}
```

- `evaluateEnabled: false` 会禁用 `act:evaluate` 和 `wait --fn`。
- `ssrfPolicy.dangerouslyAllowPrivateNetwork` 未设置时默认值为 `true`（受信任网络模型）。
- 通过设置 `ssrfPolicy.dangerouslyAllowPrivateNetwork: false` 可启用严格的仅公共浏览器导航。
- 在严格模式下，远程 CDP 配置文件端点（`profiles.*.cdpUrl`）在可达性/发现检查时同样会受到私有网络阻止限制。
- `ssrfPolicy.allowPrivateNetwork` 仍作为旧别名保留支持。
- 在严格模式中，使用 `ssrfPolicy.hostnameAllowlist` 和 `ssrfPolicy.allowedHostnames` 进行显式例外设置。
- 远程配置文件为仅附加模式（禁止启动/停止/重置）。
- `existing-session` 配置文件为宿主专用，使用 Chrome MCP 替代 CDP。
- `existing-session` 配置文件可设置 `userDataDir` 指向特定的基于 Chromium 的浏览器配置文件，例如 Brave 或 Edge。
- 自动检测顺序：若基于 Chromium 的默认浏览器 → Chrome → Brave → Edge → Chromium → Chrome Canary。
- 控制服务仅允许回环（端口由 `gateway.port` 派生，默认 `18791`）。
- `extraArgs` 可追加额外启动参数给本地 Chromium 启动（例如 `--disable-gpu`、窗口大小设置或调试标志）。

---

## UI

```json5
{
  ui: {
    seamColor: "#FF4500",
    assistant: {
      name: "OpenClaw",
      avatar: "CB", // emoji、简短文字、图片 URL 或 data URI
    },
  },
}
```

- `seamColor`：本机应用 UI 主题强调色（如 Talk 模式气泡染色等）。
- `assistant`：控制 UI 代理身份覆盖，若无则回退至活动代理 `identity`。

---

## 网关（Gateway）

```json5
{
  gateway: {
    mode: "local", // 本地 | 远程
    port: 18789,
    bind: "loopback",
    auth: {
      mode: "token", // 无 | 令牌 | 密码 | 可信代理
      token: "your-token",
      // password: "your-password", // 或环境变量 OPENCLAW_GATEWAY_PASSWORD
      // trustedProxy: { userHeader: "x-forwarded-user" }, // mode=trusted-proxy 专用；详见 /gateway/trusted-proxy-auth
      allowTailscale: true,
      rateLimit: {
        maxAttempts: 10,
        windowMs: 60000,
        lockoutMs: 300000,
        exemptLoopback: true,
      },
    },
    tailscale: {
      mode: "off", // 关闭 | 服务 | 漏斗
      resetOnExit: false,
    },
    controlUi: {
      enabled: true,
      basePath: "/openclaw",
      // root: "dist/control-ui",
      // allowedOrigins: ["https://control.example.com"], // 非回环 Control UI 必填
      // dangerouslyAllowHostHeaderOriginFallback: false, // 危险 Host-header 源回退
      // allowInsecureAuth: false,
      // dangerouslyDisableDeviceAuth: false,
    },
    remote: {
      url: "ws://gateway.tailnet:18789",
      transport: "ssh", // ssh | 直连
      token: "your-token",
      // password: "your-password",
    },
    trustedProxies: ["10.0.0.1"],
    // 可选，默认 false
    allowRealIpFallback: false,
    tools: {
      // 额外HTTP /tools/invoke 拒绝列表
      deny: ["browser"],
      // 从默认 HTTP 拒绝列表去除工具
      allow: ["gateway"],
    },
    push: {
      apns: {
        relay: {
          baseUrl: "https://relay.example.com",
          timeoutMs: 10000,
        },
      },
    },
  },
}
```

<Accordion title="网关字段详解">

- `mode`：`local`（运行网关）或 `remote`（连接远程网关）。除非为 `local`，否则网关拒绝启动。
- `port`：WS + HTTP 复用端口。优先级：`--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`。
- `bind`：`auto`、`loopback`（默认）、`lan`（`0.0.0.0`）、`tailnet`（仅 Tailscale IP）或 `custom`。
- **Legacy 绑定别名**：应使用 `gateway.bind` 中的绑定模式值（`auto`、`loopback`、`lan`、`tailnet`、`custom`），不应使用主机别名（`0.0.0.0`、`127.0.0.1`、`localhost`、`::`、`::1`）。
- **Docker 注意**：默认的 `loopback` 绑定在容器内监听 `127.0.0.1`。使用 Docker 桥接网络（`-p 18789:18789`）时，流量来自 `eth0` 接口，因此网关不可达。此时需使用 `--network host`，或者将 `bind` 设为 `"lan"`（或 `"custom"` 并设置 `customBindHost: "0.0.0.0"`）监听所有接口。
- **认证**：默认要求认证。非回环绑定需要共享的令牌或密码。入门向导默认生成令牌。
- 若同时配置了 `gateway.auth.token` 和 `gateway.auth.password`（含 SecretRefs），必须显式设置 `gateway.auth.mode` 为 `token` 或 `password`。未设置且两者皆配置时，启动及服务安装/修复流程失败。
- `gateway.auth.mode: "none"`：显式无认证模式。仅适用于受信任的本地回环环境；入门引导不会提供此选项。
- `gateway.auth.mode: "trusted-proxy"`：委托认证给身份感知的反向代理，并信任来自 `gateway.trustedProxies` 的身份头（详见 [Trusted Proxy Auth](/gateway/trusted-proxy-auth)）。
- `gateway.auth.allowTailscale`：为 `true` 时，Tailscale Serve 身份头可满足控制 UI/WebSocket 的认证（通过 `tailscale whois` 验证）；HTTP API 仍需令牌/密码认证。当 `tailscale.mode = "serve"` 时，默认值为 `true`。
- `gateway.auth.rateLimit`：可选的失败认证速率限制器。针对每个客户端 IP 和认证范围（共享密钥与设备令牌独立跟踪）生效。被阻止的尝试返回 `429` + `Retry-After`。
  - `gateway.auth.rateLimit.exemptLoopback` 默认为 `true`；在需要对本地流量施加限制（测试设置或严格代理场景）时设置为 `false`。
- 浏览器来源的 WS 认证尝试始终施加限流，且禁用回环豁免（深度防御，防止浏览器基于本地主机的暴力破解）。
- `tailscale.mode`：`serve`（仅限 tailnet，回环绑定）或 `funnel`（公网，需认证）。
- `controlUi.allowedOrigins`：为网关 WebSocket 连接提供的显式浏览器来源白名单。非回环来源的浏览器客户端连接时需要配置。
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`：危险模式，允许 Host-header 来源回退，适用于依赖 Host-header 来源策略的部署。
- `remote.transport`：`ssh`（默认）或 `direct`（ws/wss）。`direct` 模式下 `remote.url` 必须是 `ws://` 或 `wss://`。
- `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`：客户端紧急覆盖，允许以明文 `ws://` 连接受信任的私网 IP，默认仅允许回环明文。
- `gateway.remote.token` / `.password` 为远程客户端认证凭据字段，本身不配置网关认证。
- `gateway.push.apns.relay.baseUrl`：供官方/TestFlight iOS 版本使用的外部 APNs 中继 HTTPS 基础 URL。在 iOS 构建时必须与编译进去的中继 URL 匹配。
- `gateway.push.apns.relay.timeoutMs`：网关发往中继的发送超时（毫秒），默认 `10000`。
- 中继注册委派给特定网关身份。对应 iOS 应用调用 `gateway.identity.get` 取回该身份，包含该身份进行中继注册，并转发与注册相关的发送授权。其他网关不可重用该注册。
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS`：上方中继配置的临时环境变量覆盖。
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`：开发环境逃生阀，允许使用回环 HTTP 中继 URL。生产环境中继 URL 应保持 HTTPS。
- `gateway.channelHealthCheckMinutes`：通道健康监测间隔（分钟）。设为 0 可全局禁用健康监测重启。默认值：5。
- `gateway.channelStaleEventThresholdMinutes`：通道套接字过旧阈值（分钟）。应大于或等于健康检查间隔分钟数。默认值：30。
- `gateway.channelMaxRestartsPerHour`：每个通道/账户在滚动一小时内最大重启次数。默认值：10。
- `channels.<provider>.healthMonitor.enabled`：单通道禁用健康监测重启，保持全局监控开启。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多账户通道单账户覆盖配置，优先于通道级配置。
- 本地网关调用路径仅当 `gateway.auth.*` 未设置时可作为后备使用 `gateway.remote.*`。
- 若通过 SecretRef 显式配置 `gateway.auth.token` / `gateway.auth.password` 且未解析成功，解析失败时严格拒绝，不支持远程后备绕过。
- `trustedProxies`：终结 TLS 的反向代理 IP，须仅列出受控代理。
- `allowRealIpFallback`：为 `true` 时，如果缺少 `X-Forwarded-For`，网关接受 `X-Real-IP`。默认 `false`，保持失败关闭行为。
- `gateway.tools.deny`：额外 HTTP `/tools/invoke` 拒绝名单（扩展默认拒绝列表）。
- `gateway.tools.allow`：从默认 HTTP 拒绝名单中移除的工具名。

</Accordion>

### OpenAI 兼容端点

- 聊天补全：默认禁用。启用需设置 `gateway.http.endpoints.chatCompletions.enabled: true`。
- Responses API：启用通过 `gateway.http.endpoints.responses.enabled`。
- Responses URL 输入安全强化：
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
    空允许列表被视为未设置；使用 `gateway.http.endpoints.responses.files.allowUrl=false`
    和/或 `gateway.http.endpoints.responses.images.allowUrl=false` 禁用 URL 获取。
- 可选的响应安全强化头：
  - `gateway.http.securityHeaders.strictTransportSecurity`（仅对您控制的 HTTPS 来源设置；参见 [Trusted Proxy Auth](/gateway/trusted-proxy-auth#tls-termination-and-hsts)）

### 多实例隔离

单主机运行多个网关，使用唯一端口和状态目录：

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json \
OPENCLAW_STATE_DIR=~/.openclaw-a \
openclaw gateway --port 19001
```

便捷参数：

- `--dev` 使用 `~/.openclaw-dev` 目录及端口 `19001`
- `--profile <name>` 使用 `~/.openclaw-<name>` 目录。

详见 [Multiple Gateways](/gateway/multiple-gateways)。

---

## 钩子（Hooks）

```json5
{
  hooks: {
    enabled: true,
    token: "shared-secret",
    path: "/hooks",
    maxBodyBytes: 262144,
    defaultSessionKey: "hook:ingress",
    allowRequestSessionKey: false,
    allowedSessionKeyPrefixes: ["hook:"],
    allowedAgentIds: ["hooks", "main"],
    presets: ["gmail"],
    transformsDir: "~/.openclaw/hooks/transforms",
    mappings: [
      {
        match: { path: "gmail" },
        action: "agent",
        agentId: "hooks",
        wakeMode: "now",
        name: "Gmail",
        sessionKey: "hook:gmail:{{messages[0].id}}",
        messageTemplate: "From: {{messages[0].from}}\nSubject: {{messages[0].subject}}\n{{messages[0].snippet}}",
        deliver: true,
        channel: "last",
        model: "openai/gpt-5.2-mini",
      },
    ],
  },
}
```

认证：`Authorization: Bearer <token>` 或 `x-openclaw-token: <token>`。

**端点：**

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, agentId?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
  - 默认不接受调用方传递的 `sessionKey`，除非 `hooks.allowRequestSessionKey=true`。
- `POST /hooks/<name>` → 通过 `hooks.mappings` 解析

<Accordion title="映射细节">

- `match.path` 匹配 `/hooks` 之后的子路径（如 `/hooks/gmail` 对应 `gmail`）。
- `match.source` 可匹配通用路径的负载字段。
- 模板支持 JSON 路径引用（如 `{{messages[0].subject}}`）。
- `transform` 指向 JS/TS 模块返回钩子动作。
  - 必须为相对路径且位于 `hooks.transformsDir` 内，绝对路径和越界引用被拒绝。
- `agentId` 路由至指定代理，未知 ID 回退默认。
- `allowedAgentIds` 限制显式路由，`*` 或省略表示全部允许，空数组表示禁用全部。
- `defaultSessionKey`：无明确 `sessionKey` 时的固定会话键。
- `allowRequestSessionKey`：允许 `/hooks/agent` 调用方设置自定义 `sessionKey`。默认 `false`。
- `allowedSessionKeyPrefixes`：允许的 `sessionKey` 前缀列表，作用于请求和映射。示例 `["hook:"]`。
- `deliver: true` 表示将最终回复发送至频道，默认频道为 `last`。
- `model` 覆盖 LLM，用于当前钩子运行（若模型目录受限，需已允许）。

</Accordion>

### Gmail 集成

```json5
{
  hooks: {
    gmail: {
      account: "openclaw@gmail.com",
      topic: "projects/<project-id>/topics/gog-gmail-watch",
      subscription: "gog-gmail-watch-push",
      pushToken: "shared-push-token",
      hookUrl: "http://127.0.0.1:18789/hooks/gmail",
      includeBody: true,
      maxBytes: 20000,
      renewEveryMinutes: 720,
      serve: { bind: "127.0.0.1", port: 8788, path: "/" },
      tailscale: { mode: "funnel", path: "/gmail-pubsub" },
      model: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
      thinking: "off",
    },
  },
}
```

- 配置后网关启动时自动触发 `gog gmail watch serve`，设置环境变量 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 可禁用。
- 请勿单独运行 `gog gmail watch serve`。

---

## 画布主机（Canvas host）

```json5
{
  canvasHost: {
    root: "~/.openclaw/workspace/canvas",
    liveReload: true,
    // enabled: false, // 或环境变量 OPENCLAW_SKIP_CANVAS_HOST=1
  },
}
```

- 在网关端口通过 HTTP 发布代理可编辑 HTML/CSS/JS 和 A2UI：
  - `http://<gateway-host>:<gateway.port>/__openclaw__/canvas/`
  - `http://<gateway-host>:<gateway.port>/__openclaw__/a2ui/`
- 仅本地访问：保持 `gateway.bind: "loopback"`（默认）。
- 非回环绑定时，画布路由需网关认证（令牌/密码/信任代理）。
- 节点 WebViews 通常不发送认证头；配对连接后，网关广播节点作用域能力 URL 供画布和 A2UI 访问。
- 能力 URL 绑定当前活动节点 WebSocket 会话，短时过期，无 IP 降级。
- 提供热重载客户端脚本注入。
- 空内容时自动创建启动文件 `index.html`。
- 同时提供 A2UI 界面。
- 修改配置需重启网关。
- 大目录或出现 `EMFILE` 时建议关闭热重载。

---

## 发现（Discovery）

### mDNS（Bonjour）

```json5
{
  discovery: {
    mdns: {
      mode: "minimal", // minimal | full | off
    },
  },
}
```

- `minimal`（默认）：TXT 记录省略 `cliPath` 和 `sshPort`。
- `full`：包括 `cliPath` 和 `sshPort`。
- 主机名默认 `openclaw`，可用 `OPENCLAW_MDNS_HOSTNAME` 覆盖。

### 广域网 DNS-SD

```json5
{
  discovery: {
    wideArea: { enabled: true },
  },
}
```

在 `~/.openclaw/dns/` 下写入单播 DNS-SD 区域。跨网络发现时搭配 DNS 服务器（推荐 CoreDNS）及 Tailscale 分割 DNS。

配置命令：`openclaw dns setup --apply`。

---

## 环境变量（Environment）

### `env`（内联环境变量）

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: {
      GROQ_API_KEY: "gsk-...",
    },
    shellEnv: {
      enabled: true,
      timeoutMs: 15000,
    },
  },
}
```

- 内联环境变量仅应用于进程环境未设置对应键时。
- `.env` 文件：搜索 CWD 和 `~/.openclaw/.env`，且不覆盖已有环境变量。
- `shellEnv`：从登录 Shell 配置中导入缺失的预期键。
- 详见 [Environment](/help/environment) 。

### 环境变量替换

配置字符串中可用 `${VAR_NAME}` 形式引用环境变量：

```json5
{
  gateway: {
    auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" },
  },
}
```

- 仅匹配大写字母数字和下划线的变量名（正则 `[A-Z_][A-Z0-9_]*`）。
- 缺失或空变量加载失败。
- 使用 `$${VAR}` 转义，输出 `${VAR}`。
- 支持与 `$include` 配合使用。

---

## 密钥（Secrets）

密钥引用与明文可兼容。

### `SecretRef`

格式示例：

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

校验规则：

- `provider` 仅允许小写字母、数字、下划线、短横，长度不超过 64。
- `source: "env"` 时，`id` 为大写字母数字下划线串，最长 128。
- `source: "file"` 时，`id` 为绝对 JSON 指针。
- `source: "exec"` 时，`id` 由数字字母、点、冒号、斜杠、连字符组成，最长 256。
- `source: "exec"` ids 不得包含 `.` 或 `..` 斜杠分隔的路径段（例如 `a/../b` 会被拒绝）

### 支持的凭证面

- 参见 [SecretRef Credential Surface](/reference/secretref-credential-surface)。
- `secrets apply` 支持针对 `openclaw.json` 凭证路径。
- `auth-profiles.json` 引用包含在运行时解析与审计内。

### 密钥提供商配置

```json5
{
  secrets: {
    providers: {
      default: { source: "env" }, // 可选显式 env 提供商
      filemain: {
        source: "file",
        path: "~/.openclaw/secrets.json",
        mode: "json",
        timeoutMs: 5000,
      },
      vault: {
        source: "exec",
        command: "/usr/local/bin/openclaw-vault-resolver",
        passEnv: ["PATH", "VAULT_ADDR"],
      },
    },
    defaults: {
      env: "default",
      file: "filemain",
      exec: "vault",
    },
  },
}
```

说明：

- `file` 支持 `mode: "json"` 和 `mode: "singleValue"`（单值模式下 `id` 必须为 `"value"`）。
- `exec` 需绝对 `command` 路径，使用 stdin/stdout 交互协议。
- 默认拒绝符号链接命令路径。设置 `allowSymlinkCommand: true` 可允许，且对解析路径做信任目录检查。
- `exec` 子环境默认精简，需使用 `passEnv` 明确传递变量。
- SecretRef 解析于激活时制作内存快照，后续请求只读快照。
- 启用面过滤：激活时未解析密钥失败，非活动面则忽略并诊断。

---

## 认证存储（Auth storage）

```json5
{
  auth: {
    profiles: {
      "anthropic:me@example.com": {
        provider: "anthropic",
        mode: "oauth",
        email: "me@example.com",
      },
      "anthropic:work": { provider: "anthropic", mode: "api_key" },
    },
    order: {
      anthropic: ["anthropic:me@example.com", "anthropic:work"],
    },
  },
}
```

- 代理认证档存于 `<agentDir>/auth-profiles.json`。
- 支持值级别引用（`keyRef` 用于 `api_key`，`tokenRef` 用于 `token`）。
- 静态运行时凭证来自内存快照，发现到的遗留静态 `auth.json` 条目会被剔除。
- OAuth 旧数据导入自 `~/.openclaw/credentials/oauth.json`。
- 详见 [OAuth](/concepts/oauth)。
- 秘钥运行时行为及 `audit/configure/apply` 工具详见 [Secrets Management](/gateway/secrets)。

---

## 日志记录（Logging）

```json5
{
  logging: {
    level: "info",
    file: "/tmp/openclaw/openclaw.log",
    consoleLevel: "info",
    consoleStyle: "pretty", // pretty | compact | json
    redactSensitive: "tools", // off | tools
    redactPatterns: ["\\bTOKEN\\b\\s*[=:]\\s*([\"']?)([^\\s\"']+)\\1"],
  },
}
```

- 默认日志文件为 `/tmp/openclaw/openclaw-YYYY-MM-DD.log`。
- 可通过 `logging.file` 配置固定路径。
- `consoleLevel` 在 `--verbose` 时提升为 `debug`。

---

## CLI

```json5
{
  cli: {
    banner: {
      taglineMode: "off", // random | default | off
    },
  },
}
```

- `cli.banner.taglineMode` 控制横幅标语样式：
  - `"random"`（默认）：循环显示有趣/季节性标语。
  - `"default"`：固定中性标语（`All your chats, one OpenClaw.`）。
  - `"off"`：无标语文本，仅显示标题与版本。
- 如需隐藏整条横幅（非仅标语），设置环境变量 `OPENCLAW_HIDE_BANNER=1`。

---

## 向导（Wizard）

由 CLI 引导式设置流程（`onboard`、`configure`、`doctor`）写入的元数据：

```json5
{
  wizard: {
    lastRunAt: "2026-01-01T00:00:00.000Z",
    lastRunVersion: "2026.1.4",
    lastRunCommit: "abc1234",
    lastRunCommand: "configure",
    lastRunMode: "local",
  },
}
```

---

## 身份（Identity）

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "Samantha",
          theme: "helpful sloth",
          emoji: "🦥",
          avatar: "avatars/samantha.png",
        },
      },
    ],
  },
}
```

由 macOS 引导助手写入，派生默认值：

- `messages.ackReaction` 来自 `identity.emoji`（默认 👀）
- `mentionPatterns` 来自 `identity.name`/`identity.emoji`
- `avatar` 支持工作区相对路径、`http(s)` URL 或 `data:` URI

---

## 桥接（Bridge，遗留，已移除）

当前版本不再包含 TCP 桥接。节点通过网关 WebSocket 连接。配置中 `bridge.*` 不再认可，验证失败直到删除，可使用 `openclaw doctor --fix` 清除未知键。

<Accordion title="遗留桥接配置（历史参考）">

```json
{
  "bridge": {
    "enabled": true,
    "port": 18790,
    "bind": "tailnet",
    "tls": {
      "enabled": true,
      "autoGenerate": true
    }
  }
}
```

</Accordion>

---

## 定时任务（Cron）

```json5
{
  cron: {
    enabled: true,
    maxConcurrentRuns: 2,
    webhook: "https://example.invalid/legacy", // 过时备用，用于遗留 notify:true 任务
    webhookToken: "replace-with-dedicated-token", // 出站 Webhook 认证 Bearer Token（可选）
    sessionRetention: "24h", // 会话保存时间，时长字符串或 false
    runLog: {
      maxBytes: "2mb", // 单次运行日志最大字节数，默认 2,000,000
      keepLines: 2000, // 日志剪裁后保留最新行数，默认 2000
    },
  },
}
```

- `sessionRetention`：完成的隔离定时任务会话保存期限，同时控制删除存档的清理。默认 24小时，设置 `false` 禁用。
- `runLog.maxBytes`：单次运行日志文件大小限制，触发剪裁。默认 2MB。
- `runLog.keepLines`：剪裁后保留的最新日志行数。默认 2000。
- `webhookToken`：用于出站定时任务 Webhook POST 认证的 Bearer Token，若未设置则不发送认证头。
- `webhook`：弃用的旧后备 Webhook（Http/HTTPS），仅用于遗留带 `notify: true` 的任务。

详见 [Cron Jobs](/automation/cron-jobs)。

---

## 媒体模型模板变量

用于 `tools.media.models[].args` 的模板占位符：

| 变量 | 说明 |
| --- | --- |
| `{{Body}}` | 完整入站消息正文 |
| `{{RawBody}}` | 原始正文（无历史/发送者包装） |
| `{{BodyStripped}}` | 去除群组提及的正文 |
| `{{From}}` | 发送者标识 |
| `{{To}}` | 目标标识 |
| `{{MessageSid}}` | 频道消息 ID |
| `{{SessionId}}` | 当前会话 UUID |
| `{{IsNewSession}}` | 新建会话时为字符串 `"true"` |
| `{{MediaUrl}}` | 入站媒体伪 URL |
| `{{MediaPath}}` | 本地媒体路径 |
| `{{MediaType}}` | 媒体类型（image/audio/document/...） |
| `{{Transcript}}` | 音频转录 |
| `{{Prompt}}` | CLI 条目解析后的媒体提示 |
| `{{MaxChars}}` | CLI 条目解析的最大输出字符数 |
| `{{ChatType}}` | `"direct"` 或 `"group"` |
| `{{GroupSubject}}` | 群组主题（尽力） |
| `{{GroupMembers}}` | 群组成员预览（尽力） |
| `{{SenderName}}` | 发送者显示名（尽力） |
| `{{SenderE164}}` | 发送者电话号码（尽力） |
| `{{Provider}}` | 提供商提示（whatsapp，telegram，discord 等） |

---

## 配置包含（`$include`）

将配置拆分为多个文件：

```json5
// ~/.openclaw/openclaw.json
{
  gateway: { port: 18789 },
  agents: { $include: "./agents.json5" },
  broadcast: {
    $include: ["./clients/mueller.json5", "./clients/schmidt.json5"],
  },
}
```

**合并规则：**

- 单个文件时完全替换所在对象。
- 文件数组时按顺序深度合并，后者覆盖前者。
- 同级键合并在包含后，覆盖包含文件值。
- 支持最多 10 级嵌套。
- 路径相对包含文件解析，且必须位于顶级配置目录（`openclaw.json` 的目录）内。允许绝对及 `../` 路径，但最终不可越界。
- 缺失文件、解析错误或循环包含均有清晰错误提示。

---

_相关链接：[配置](/gateway/configuration) · [配置示例](/gateway/configuration-examples) · [诊断工具](/gateway/doctor)_
