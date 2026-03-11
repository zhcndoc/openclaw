---
title: "配置参考"
description: "完整字段级参考，适用于 ~/.openclaw/openclaw.json"
summary: "每个 OpenClaw 配置键、默认值和频道设置的完整参考"
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
      streaming: "partial", // off | partial | block | progress (default: off)
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

群组消息默认要求 **提及**（元数据提及或正则模式），适用 WhatsApp、Telegram、Discord、Google Chat 和 iMessage 群聊。

**提及类型：**

- **元数据提及**：原生平台 @ 提及。WhatsApp 自聊模式下忽略。
- **文本模式**：在 `agents.list[].groupChat.mentionPatterns` 中配置的正则表达式，始终检查。
- 仅当检测可用（存在原生提及或至少一个模式）时才执行提及门控。

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

默认: `~/.openclaw/workspace`。

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
        "minimax/MiniMax-M2.5": { alias: "minimax" },
      },
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M2.5"],
      },
      imageModel: {
        primary: "openrouter/qwen/qwen-2.5-vl-72b-instruct:free",
        fallbacks: ["openrouter/google/gemini-2.0-flash-vision:free"],
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

- `model` 支持字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。字符串形式仅设主模型，对象形式设置主模型及有序后备模型。
- `imageModel` 同 `model` 格式，用于 `image` 工具路径及默认后备（选定模型无法接收图像输入时）。
- `pdfModel` 同 `model` 格式，用于 `pdf` 工具模型路由。缺省时 `pdf` 工具回退为 `imageModel`，再到尽力而为的提供商默认。
- `pdfMaxBytesMb`：`pdf` 工具默认 PDF 尺寸限制（当调用时未传 `maxBytesMb`），默认 10MB。
- `pdfMaxPages`：`pdf` 工具提取回退模式默认最大页数，默认 20。
- `model.primary` 格式为 `provider/model` （如 `anthropic/claude-opus-4-6`），省略提供商时默认假设为 `anthropic`（已弃用）。
- `models`：模型目录和 `/model` 允许列表。可包含 `alias`（快捷名）和 `params`（提供商特定参数，如温度 `temperature`、最大令牌 `maxTokens`、缓存时长等）。
- 参数合并优先级：`agents.defaults.models["provider/model"].params` 为基础，`agents.list[].params`（匹配代理 ID）覆盖同名键。
- 配置写入器（如 `/models set`、`/models set-image`、后备增删命令）存储规范对象形式，尽可能保留已存在后备列表。
- `maxConcurrent`：运行中代理最大并行数（每会话仍序列化）。默认 1。

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
        lightContext: false, // false 默认值，true 保留唯一 HEARTBEAT.md
        session: "main",
        to: "+15555550123",
        directPolicy: "allow", // allow (默认) | block
        target: "none", // 默认为 none；可选 last | whatsapp | telegram | discord | ...
        prompt: "Read HEARTBEAT.md if it exists...",
        ackMaxChars: 300,
        suppressToolErrorWarnings: false,
      },
    },
  },
}
```

- `every`：时间间隔字符串（毫秒/秒/分/小时）。默认 `30m`。
- `suppressToolErrorWarnings`：为真时自动屏蔽工具错误告警。
- `directPolicy`：私信投递策略。`allow` 允许，`block` 阻止私信并输出 `reason=dm-blocked`。
- `lightContext`：为真时心跳仅用轻量引导上下文，仅保留 HEARTBEAT.md。
- 可在代理中设置 `agents.list[].heartbeat`，若任一代理配置，只有这些代理运行心跳。
- 心跳为完整代理回合——越频繁消耗令牌越多。

### `agents.defaults.compaction`

```json5
{
  agents: {
    defaults: {
      compaction: {
        mode: "safeguard", // default | safeguard
        reserveTokensFloor: 24000,
        identifierPolicy: "strict", // strict | off | custom
        identifierInstructions: "Preserve deployment IDs, ticket IDs, and host:port pairs exactly.", // identifierPolicy=custom 时使用
        postCompactionSections: ["Session Startup", "Red Lines"], // [] 禁用重注入
        model: "openrouter/anthropic/claude-sonnet-4-5", // optional compaction-only model override
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

- `mode`：`default` 或 `safeguard`（长历史的分块摘要），详见 [Compaction](/concepts/compaction)。
- `identifierPolicy`：`strict`（默认）／`off`／`custom`，`strict` 会在摘要中加内建不可见标识保留指导。
- `identifierInstructions`：自定义标识符保留文本，`identifierPolicy=custom` 时使用。
- `postCompactionSections`：压缩后重新注入的 AGENTS.md 章节名称，默认为 `["Session Startup", "Red Lines"]`；设置为空数组可禁用。有默认回退接受老版本 `Every Session` / `Safety` 标题。
- `model`：仅用于压缩摘要的可选 `provider/model-id` 覆盖。当主会话需要保持一个模型，而压缩摘要需要使用另一个模型时使用；如果未设置，压缩将使用会话的主模型。
- `memoryFlush`：自动压缩前的隐式代理操作以存储持久记忆。工作区只读时跳过。

### `agents.defaults.contextPruning`

在发送给 LLM 前从内存上下文中剪裁 **旧工具结果**，不改变磁盘上保存的会话历史。

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
- `ttl` 控制剪裁允许的最短间隔（上次缓存访问之后）。
- 剪裁先执行软剪裁，超长工具结果保留开头和结尾，中间插入 `...`。
- 软剪裁后仍超限的会进行硬清理，替换为占位符。

注意：

- 图像块不执行剪裁。
- 比例基于字符，大致估算，非精确令牌计数。
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
- 频道覆盖：`channels.<channel>.blockStreamingCoalesce`（及账号变体）内。Signal/Slack/Discord/Google Chat 默认 `minChars` 为 1500。
- `humanDelay` 为块回复间随机延迟，`natural` 范围 800–2500ms。代理覆盖使用 `agents.list[].humanDelay`。

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

- 默认：私聊/提及时为 `instant`，未提及的群聊为 `message`。
- 会话覆盖：`session.typingMode`，`session.typingIntervalSeconds`。

详见 [Typing Indicators](/concepts/typing-indicators)。

### `agents.defaults.sandbox`

用于内嵌代理的可选 **Docker 沙箱**，详见 [Sandboxing](/gateway/sandboxing)。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
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

**工作区访问权限：**

- `none`：每作用域沙箱工作区在`~/.openclaw/sandboxes`下
- `ro`：沙箱工作区挂载到 `/workspace`，代理工作区只读挂载到 `/agent`
- `rw`：代理工作区读写挂载到 `/workspace`

**作用域：**

- `session`：每会话容器与工作区
- `agent`：每代理单一容器与工作区（默认）
- `shared`：共享容器与工作区（无跨会话隔离）

**`setupCommand`** 在容器创建后运行一次（通过 `sh -lc`），需网络、可写根目录、root 权限。

容器默认为 `network: "none"`，需出口访问时设置为 `"bridge"` 或自定义桥接网络。`"host"` 与 `"container:<id>"` 默认被禁用，除非显式开启 `sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`（破戒模式）。

**入站附件** 会节录到活动工作区的 `media/inbound/*`。

**`docker.binds`** 额外挂载主机目录，支持全局及代理单独合并。

**沙箱浏览器**（`sandbox.browser.enabled`）：容器中的 Chromium + CDP，无需 `browser.enabled`。  
noVNC 使用 VNC 认证，OpenClaw 生成短期令牌 URL，避免密码泄露。

- `allowHostControl: false`（默认）阻止沙箱会话控制主机浏览器。
- `network` 默认独立桥接网络 `openclaw-sandbox-browser`。明确想使用全局桥时设置为 `bridge`。
- `cdpSourceRange` 可限制 CDP 容器入站为指定 CIDR（如 `172.21.0.1/32`）。
- `sandbox.browser.binds` 仅挂载额外路径到浏览器容器，若设置（包括空数组），覆盖 docker.binds。
- 启动默认参阅 `scripts/sandbox-browser-entrypoint.sh`：含远程调试地址/端口、用户数据目录、禁用首次运行、无 GPU、多种安全禁用等。
- 只需通过自定义镜像与入口点修改容器启动默认。

</Accordion>

镜像构建：

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
        params: { cacheRetention: "none" }, // 按键覆盖匹配的默认模型参数
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

- `id`：稳定代理 ID（必填）。
- `default`：多设置时首个为默认（记录警告），未设置则第一个默认。
- `model`：字符串覆盖仅主模型；对象形式 `{ primary, fallbacks }` 全覆盖（空数组禁用全局后备）。仅覆盖主模型的定时任务仍继承默认后备，除非设置 `fallbacks: []`。
- `params`：代理专用参数覆盖，合并至默认模型目录中对应项。用于如缓存生存、温度、最大令牌等无须复制全模型目录的配置。
- `runtime`：可选代理运行时描述符。`type: "acp"` 搭配 `runtime.acp`（默认字段：`agent`、`backend`、`mode`、`cwd`），用于默认 ACP 会话。
- `identity.avatar` 支持工作区相对路径、`http(s)` URL 或 `data:` URI。
- `identity` 派生默认值：`ackReaction`（来自 emoji）、`mentionPatterns`（来自 name/emoji）。
- `subagents.allowAgents`：子代理白名单（默认仅同代理）。
- 沙箱继承保护：请求会话沙箱时，`sessions_spawn` 拒绝非沙箱目标。

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
        model: "minimax/MiniMax-M2.5",
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

OpenClaw 使用 pi-coding-agent 模型目录。可通过配置 `models.providers` 或代理目录下 `models.json` 添加自定义提供商。

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
  - 空或缺失代理 `apiKey`/`baseUrl` 回退为配置中 `models.providers`。
  - 相同模型的 `contextWindow`/`maxTokens` 取显式配置和隐式目录的较大值。
- 使用 `models.mode: "replace"` 完全替换 `models.json`。

### 提供商字段详解

- `models.mode`：提供商目录行为（`merge` 或 `replace`）。
- `models.providers`：自定义提供商映射，键为提供商 ID。
- `models.providers.*.api`：请求适配器（如 `openai-completions`、`openai-responses`、`anthropic-messages`、`google-generative-ai` 等）。
- `models.providers.*.apiKey`：凭证（推荐 SecretRef/env 解析）。
- `models.providers.*.auth`：认证策略（`api-key`、`token`、`oauth`、`aws-sdk`）。
- `models.providers.*.injectNumCtxForOpenAICompat`：V Ollama + `openai-completions` 注入 `options.num_ctx` 请求（默认 `true`）。
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

<Accordion title="OpenCode Zen">

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

设置 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）。快捷方式：`openclaw onboard --auth-choice opencode-zen`。

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
            reasoning: false,
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

<Accordion title="MiniMax M2.5（直接调用）">

```json5
{
  agents: {
    defaults: {
      model: { primary: "minimax/MiniMax-M2.5" },
      models: {
        "minimax/MiniMax-M2.5": { alias: "Minimax" },
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
            id: "MiniMax-M2.5",
            name: "MiniMax M2.5",
            reasoning: false,
            input: ["text"],
            cost: { input: 15, output: 60, cacheRead: 2, cacheWrite: 10 },
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
      "nano-banana-pro": {
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // 或明文
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

- 从 `~/.openclaw/extensions`、`<workspace>/.openclaw/extensions` 及 `plugins.load.paths` 加载。
- **配置变更需重启网关。**
- `allow`：可选允许列表，仅加载列出插件。`deny` 优先。
- `plugins.entries.<id>.apiKey`：插件级 API Key 方便字段（若支持）。
- `plugins.entries.<id>.env`：插件范围环境变量映射。
- `plugins.entries.<id>.hooks.allowPromptInjection` 为 `false` 时，核心阻止 `before_prompt_build`，忽略遗留的 `before_agent_start` 中修改提示相关字段，保留遗留的 `modelOverride` 和 `providerOverride`。
- `plugins.entries.<id>.config`：插件定义的配置对象（插件架构验证）。
- `plugins.slots.memory`：选中当前激活内存插件 ID，`"none"` 禁用内存插件。
- `plugins.slots.contextEngine`：选择当前激活上下文引擎插件 ID，默认 `"legacy"`，除非安装并选择其他引擎。
- `plugins.installs`：CLI 管理的安装元数据，用于 `openclaw plugins update`，含 `source`、`spec`、`sourcePath`、`installPath`、`version`、`resolvedName`、`resolvedVersion`、`resolvedSpec`、`integrity`、`shasum`、`resolvedAt`、`installedAt`。视为托管状态，Prefer 使用 CLI 命令代替编辑。

详见 [Plugins](/tools/plugin)。

---

## 浏览器（Browser）

```json5
{
  browser: {
    enabled: true,
    evaluateEnabled: true,
    defaultProfile: "chrome",
    ssrfPolicy: {
      dangerouslyAllowPrivateNetwork: true, // 默认受信任网络模式
      // allowPrivateNetwork: true, // 旧别名
      // hostnameAllowlist: ["*.example.com", "example.com"],
      // allowedHostnames: ["localhost"],
    },
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: { cdpPort: 18801, color: "#0066CC" },
      remote: { cdpUrl: "http://10.0.0.42:9222", color: "#00AA00" },
    },
    color: "#FF4500",
    // headless: false,
    // noSandbox: false,
    // extraArgs: [],
    // relayBindHost: "0.0.0.0", // only when the extension relay must be reachable across namespaces (for example WSL2)
    // executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    // attachOnly: false,
  },
}
```

- `evaluateEnabled: false` 禁用 `act:evaluate` 和 `wait --fn`。
- 默认 `ssrfPolicy.dangerouslyAllowPrivateNetwork` 为 `true`（受信任网络模型）。
- 严格模式下，设为 `false` 并使用 `hostnameAllowlist` 和 `allowedHostnames` 显式例外。
- 远程配置文件仅支持附加，禁用启动/停止/重置。
- 自动检测顺序：默认 Chromium 系浏览器 → Chrome → Brave → Edge → Chromium → Chrome Canary。
- 控制服务仅限回环（端口默认 `18791`，取自 `gateway.port`）。
- `extraArgs` 追加额外启动参数用于本地 Chromium（如禁用 GPU、窗口尺寸、调试参数等）。
- `relayBindHost` 更改 Chrome 扩展中继的监听位置。若未设置，则仅限回环访问；只有在中继必须跨命名空间边界（例如 WSL2）且主机网络已被信任时，才设置明确的非回环绑定地址，如 `0.0.0.0`。

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

- `seamColor`：本机应用 UI 主题强调色（Talk 模式气泡染色等）。
- `assistant`：控制 UI 代理身份覆盖，回退至活动代理 `identity`。

---

## 网关（Gateway）

```json5
{
  gateway: {
    mode: "local", // local | remote
    port: 18789,
    bind: "loopback",
    auth: {
      mode: "token", // none | token | password | trusted-proxy
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
      mode: "off", // off | serve | funnel
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
      transport: "ssh", // ssh | direct
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
  },
}
```

<Accordion title="网关字段详解">

- `mode`：`local`（运行网关）或 `remote`（连接远程网关）。非 `local` 模式拒绝启动。
- `port`：WS + HTTP 单端口，优先级 `--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > 18789。
- `bind`：支持 `auto`、`loopback`（默认）、`lan`（`0.0.0.0`）、`tailnet`（Tailscale IP）或 `custom`。
- **兼容绑定别名**：使用 `gateway.bind` 下的值（auto、loopback、lan、tailnet、custom），不建议使用主机别名（如 0.0.0.0、127.0.0.1 等）。
- **Docker注意**：默认绑定回环为容器内的 127.0.0.1；桥接模式下流量入 eth0，网关不可达。需使用 `--network host` 或设置为 `lan`（或自定义绑定 `0.0.0.0`）监听所有接口。
- **认证**：默认必须。非回环需共享令牌/密码。引导流程默认生成令牌。
- 若同时配置 `gateway.auth.token` 和 `gateway.auth.password`（包含 SecretRef），必须显式设置 `gateway.auth.mode`。不设置时启动及安装修复失败。
- `gateway.auth.mode: "none"`：显式拒绝认证，仅用于受信任本地回环，不推荐。
- `gateway.auth.mode: "trusted-proxy"`：委托给身份感知反向代理认证，且信任 `gateway.trustedProxies` 代理 IP。详见 [Trusted Proxy Auth](/gateway/trusted-proxy-auth)。
- `gateway.auth.allowTailscale`：为真时，支持 Tailscale Serve 身份头免令牌认证（通过 `tailscale whois` 验证），但 HTTP API 仍需令牌/密码。默认启用（`tailscale.mode="serve"` 时）。

- `gateway.auth.rateLimit`：失败认证限制器，按客户端 IP 和认证范围分开限流（共享秘密和设备令牌分开追踪），阻断返回 `429` + `Retry-After`。
  - `exemptLoopback` 默认为真，设为假可限制本地主机流量（测试或严格代理场景）。
- 浏览器来源 WebSocket 认证尝试强制限流，无本地环回例外（防止系统内浏览器 localhost 暴力破解）。
- `tailscale.mode`：`serve`（仅尾网，回环绑定）或 `funnel`（公网，需要认证）。
- `controlUi.allowedOrigins`：浏览器来源允许清单，非回环客户端必填。
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`：危险模式，启用 Host 头来源回退。
- `remote.transport`：`ssh`（默认）或 `direct`（ws/wss）。`direct` 时 URL 必须为 `ws://` 或 `wss://`。
- `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`：客户端破戒选项，允许向受信任私网 IP 使用明文 `ws://`。默认仅支持回环。
- `gateway.remote.token` / `password`：远程客户端认证字段，本身不配置网关认证。
- 本地网关调用路径在未设置 `gateway.auth.*` 时可回退使用 `gateway.remote.*`。
- `trustedProxies`：反向代理 TLS 终端 IP 列表，务必只列出自己控制的代理。
- `allowRealIpFallback`：为真时，缺少 `X-Forwarded-For` 时启用 `X-Real-IP`，默认假确保失败即关闭。
- `gateway.tools.deny`：HTTP `POST /tools/invoke` 额外拒绝扩展工具列表。
- `gateway.tools.allow`：从默认 HTTP 拒绝列表去除工具。

</Accordion>

### OpenAI 兼容端点

- 聊天补全：默认禁用。启用需 `gateway.http.endpoints.chatCompletions.enabled: true`。
- Responses API：`gateway.http.endpoints.responses.enabled`。
- Responses URL 输入安全强化：
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
- 可选强化头信息：
  - `gateway.http.securityHeaders.strictTransportSecurity`（仅针对受控 HTTPS 源，详见[Trusted Proxy Auth](/gateway/trusted-proxy-auth#tls-termination-and-hsts)）

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

CLI 向导（`onboard`、`configure`、`doctor`）写入的元数据：

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
- `webhookToken`：用于出站定时任务 Webhook POST 认证，若未设置则不发送认证头。
- `webhook`：弃用的旧后备 Webhook（Http/HTTPS），仅用于遗留带 `notify: true` 的任务。

详见 [Cron Jobs](/automation/cron-jobs)。

---

## 媒体模型模板变量

用于 `tools.media.models[].args` 的模板占位符：

| 变量               | 说明                                         |
| ------------------ | -------------------------------------------- |
| `{{Body}}`         | 完整入站消息正文                             |
| `{{RawBody}}`      | 原始正文（无历史/发送者包装）                |
| `{{BodyStripped}}` | 去除群组提及的正文                           |
| `{{From}}`         | 发送者标识                                   |
| `{{To}}`           | 目标标识                                     |
| `{{MessageSid}}`   | 频道消息 ID                                  |
| `{{SessionId}}`    | 当前会话 UUID                                |
| `{{IsNewSession}}` | 新建会话时为字符串 `"true"`                  |
| `{{MediaUrl}}`     | 入站媒体伪 URL                               |
| `{{MediaPath}}`    | 本地媒体路径                                 |
| `{{MediaType}}`    | 媒体类型（image/audio/document/...）         |
| `{{Transcript}}`   | 音频转录                                     |
| `{{Prompt}}`       | CLI 条目解析后的媒体提示                     |
| `{{MaxChars}}`     | CLI 条目解析的最大输出字符数                 |
| `{{ChatType}}`     | `"direct"` 或 `"group"`                      |
| `{{GroupSubject}}` | 群组主题（尽力）                             |
| `{{GroupMembers}}` | 群组成员预览（尽力）                         |
| `{{SenderName}}`   | 发送者显示名（尽力）                         |
| `{{SenderE164}}`   | 发送者电话号码（尽力）                       |
| `{{Provider}}`     | 提供商提示（whatsapp，telegram，discord 等） |

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
