---
summary: "Discord、Matrix 和 IRC 的每通道配置键"
read_when:
  - "配置 Discord、Matrix 或 IRC"
  - "设置 Discord 行会、语音、状态或执行批准密钥"
  - "选择 Matrix 身份验证、代理或自动加入行为"
title: "配置——社区聊天频道"
---

`channels.*` 社区聊天频道密钥：Discord、Matrix 和 IRC。

## Discord

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "your-bot-token",
      mediaMaxMb: 100,
      allowBots: true,
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
            general: { enabled: true },
            help: {
              enabled: true,
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
      suppressEmbeds: true,
      streaming: {
        mode: "progress", // explicit opt-in; Discord defaults to off
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
            whenOccupied: true,
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
- `channels.discord.joinIntro` 默认为 `true`。当机器人加入允许的服务器时，它会在允许的情况下在系统频道中发布一个介绍，或者在可以查看和发送消息的第一个文本频道中发布。仅当机器人可以读取消息历史记录时，才会包含最近的消息。将此选项设置为 `false` 以禁用介绍，或使用 `channels.discord.accounts.<accountId>.joinIntro` 进行特定于账户的覆盖。如果允许，每台服务器最多可读取 100 条最近消息；参见[群加入介绍](/channels#group-join-introductions)。介绍永远不会在私信中出现。
- 直接出站调用如果提供了显式的 Discord `token`，则该调用使用此令牌；账户策略设置仍来自活动运行时快照中选定的账户。
- 可选 `channels.discord.defaultAccount` 在与配置的帐户 ID 匹配时覆盖默认帐户选择。
- 使用`user:<id>`（DM）或`channel:<id>`（公会频道）作为投放目标；纯数字 ID 将被拒绝。
- `actions.reactions` 控制 `react`、`reactions` 和 `emoji-list`；表情符号发现默认为当前服务器，除非提供 `guildId`。
- Guild slugs 为小写，空格替换为 `-`；通道键使用 slugged 名称（无 `#`）。更喜欢公会 ID。
- 在正常提及和访问规则下，默认接受 Bot 创作的消息。设置 `allowBots: false` 以禁用机器人触发的回合，或设置 `allowBots: "mentions"` 以要求主动提及机器人（自己的消息仍会被过滤）。此设置不会隐藏历史记录或人工选择的回复目标中可访问的机器人消息； `contextVisibility` 控制补充上下文。
- 支持机器人发送的入站消息的频道可以使用共享的[机器人循环保护](/channels/bot-loop-protection)。设置 `channels.defaults.botLoopProtection` 以配置基础的成对预算，然后仅在某个界面需要不同限制时覆盖频道或账户设置。
- `channels.discord.guilds.<id>.ignoreOtherMentions`（和通道覆盖）会丢弃发送给另一个身份而不是机器人的消息。这涵盖了明确的 user/role 提及（不包括 @everyone/@here）以及对另一个非 webhook 机器人的回复；明确提及当前机器人仍然有效。
- `channels.discord.mentionAliases`地图稳定出站`@handle`发短信至Discord发送之前的用户 ID，因此即使临时目录缓存为空，也可以通过其配置的 ID 提及已知的队友。每个帐户的覆盖位于`channels.discord.accounts.<accountId>.mentionAliases`。
- `maxLinesPerMessage`（默认值为 `17`）会拆分过高的消息，即使消息长度小于 2000 个字符。
- `channels.discord.suppressEmbeds` 默认为 `true`，因此出站 URL 不会扩展为 Discord 链接预览，除非禁用。显式 `embeds` 有效负载仍然正常发送；每消息工具调用可以用 `suppressEmbeds` 覆盖。
- `channels.discord.threadBindings` 控制 Discord 线程绑定的路由：
  - `enabled`：Discord 覆盖线程绑定会话生成、传递和路由；管理与 `/session unbind`、`/agents`、`/session idle` 和 `/session max-age` 的绑定
  - `idleHours`：Discord 覆盖用于小时内不活动自动解除绑定（`0` 禁用）
  - `maxAgeHours`：Discord 对最大有效时长的覆盖设置，单位为小时（`0` 表示禁用）
  - `spawnSessions`：`sessions_spawn({ thread: true })`和ACP线程生成自动线程creation/binding的开关（默认：`true`）
  - `defaultSpawnContext`：线程绑定生成任务使用的原生子代理上下文（默认为 `"fork"`）
- 具有 `type: "acp"` 的顶级 `bindings[]` 条目为通道和线程配置持久 ACP 绑定（在 `match.peer.id` 中使用 channel/thread id）。字段语义在 [ACP Agents](/tools/acp-agents#persistent-channel-bindings) 中共享。
- `channels.discord.agentComponents.ttlMs` 控制已发送的 Discord 组件回调保持注册的时长。默认值为 `1800000`（30 分钟），最大值为 `86400000`（24 小时）。每个账户的覆盖设置位于 `channels.discord.accounts.<accountId>.agentComponents.ttlMs` 下。建议使用满足工作流需求的最短 TTL。
- `channels.discord.voice` 启用 Discord 语音频道对话，以及可选的自动加入、LLM 和 TTS 覆盖设置。纯文本 Discord 配置默认关闭语音功能；设置 `channels.discord.voice.enabled=true` 可选择启用。
- `channels.discord.voice.autoJoin[].whenOccupied` 使自动管理的语音通道保持断开状态，直到有人出现为止，然后在最后一个人离开时离开。默认为`false`；机器人不算作占用者，并且手动或临时语音会话不受此策略管理。
- `channels.discord.voice.model` 可选择覆盖用于 Discord 语音通道响应的 LLM 模型。
- `channels.discord.voice.daveEncryption`（默认值为 `true`）和 `channels.discord.voice.decryptionFailureTolerance`（默认值为 `24`）会传递给 `@discordjs/voice` 的 DAVE 选项。
- `channels.discord.voice.connectTimeoutMs` 控制初始 `@discordjs/voice` 就绪等待 `/vc join` 和自动加入尝试（默认 `30000`）。
- `channels.discord.voice.reconnectGraceMs` 控制断开的语音会话在 OpenClaw 销毁它之前进入重新连接信令的等待时长（默认值为 `15000`）。
- Discord 语音播放不会因其他用户开始说话的事件而中断。为避免反馈循环，TTS 播放期间 OpenClaw 会忽略新的语音采集。
- OpenClaw 在重复解密失败后还尝试通过 leaving/rejoining 语音会话恢复语音接收。
- `channels.discord.streaming` 是当前流模式密钥。 Discord 预览流默认为`off`；将 `streaming.mode: "progress"` 设置为选择一条已编辑的 tool/work 进度消息，或选择 `partial` 或 `block` 进行答案预览。运行时不再读取旧版平键（`streamMode`、`chunkMode`、`blockStreaming`、`draftChunk`、`blockStreamingCoalesce`）；运行 `openclaw doctor --fix` 以迁移持久配置。
- `channels.discord.autoPresence` 会将运行时可用性映射为机器人状态（正常 => 在线，降级 => 闲置，耗尽 => 请勿打扰），并允许可选的状态文本覆盖。
- `channels.discord.guilds.<id>.presenceEvents` 将人员可用性到达作为座席系统事件路由到一个已配置的 Discord 通道。符合资格的会员必须能够查看`channelId`；公共线程继承父级可见性，而私有线程还需要成员资格或管理线程。 `users` 可以进一步缩小受众范围。它从完整的 `GUILD_CREATE` 快照中播种当前在线成员，路由观察到的离线到在线转换，并将未见过的成员的第一个稍后在线信号视为新可用，而不断言他们是在线还是在快照后加入。超过 Discord 的 75,000 名成员快照限制的公会首先需要显式离线更新。节流旋钮：`reconnectSuppressSeconds`（重建公会存在状态时新网关会话后的安静窗口，默认 300，`0` 禁用）和 `burstLimit`/`burstWindowSeconds`（每个公会成功排队的事件速率限制，默认每 60 秒滑动窗口 8 个事件）。恢复的会话不会启动重新连接抑制窗口。现有的每用户重新问候冷却时间仍为八小时。它需要 `channels.discord.intents.presence=true`、Discord 开发者门户中的特权存在意图以及已启用的代理心跳。
- `channels.discord.intents.messageContent` 默认为 `true`。仅当 Discord 无法授予特权 Message Content intent 时，才将其设置为 `false` 以启用仅提及模式；私信和明确提及机器人的消息仍会携带消息内容，而其他服务器消息不会。使用此模式时，请确保每个已配置的服务器频道都设置 `requireMention: true`。
- `channels.discord.dangerouslyAllowNameMatching` 重新启用可变 name/tag 匹配（碎玻璃兼容模式）。
- `channels.discord.execApprovals`：Discord-native执行审批交付和审批人授权。
  - `enabled`：`true`、`false` 或 `"auto"`。取消设置或 `false` 禁用本机传送。设置 `true` 或 `"auto"` 以在审批者从 `approvers` 或 `commands.ownerAllowFrom` 解析时激活它。
  - `approvers`：允许批准 exec 请求的 Discord 用户 ID。省略时回退到 `commands.ownerAllowFrom`。
  - `agentFilter`：可选代理 ID 白名单。省略转发所有代理的批准。
  - `sessionFilter`：可选的会话密钥模式（子字符串或正则表达式）。
  - `target`：审批提示的发送位置。`"dm"`（默认值）发送到审批者的私信，`"channel"` 发送到发起请求的频道，`"both"` 同时发送到两者。当目标包含 `"channel"` 时，按钮仅可由已解析的审批者使用。
  - `cleanupAfterResolve`：当设置为 `true` 时，在审批、拒绝或超时后删除审批私信。

**Reaction 通知模式：** `off`（无）、`own`（机器人的消息，默认）、`all`（所有消息）、`allowlist`（来自 `guilds.<id>.users` 的所有消息）。

## Matrix

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

- 令牌认证使用 `accessToken`；密码认证使用 `userId` + `password`。
- `channels.matrix.proxy` 通过显式 HTTP（S） 代理路由 Matrix HTTP 流量。指定帐户可以使用 `channels.matrix.accounts.<id>.proxy` 覆盖它。
- `channels.matrix.network.dangerouslyAllowPrivateNetwork` 允许 private/internal 家庭服务器。 `proxy` 和此网络选择加入是独立的控件。
- `channels.matrix.defaultAccount` 在多账户配置中选择首选账户。
- `channels.matrix.autoJoin` 默认为 `"off"`，因此受邀请的房间和新的 DM-style 邀请将被忽略，直到您将 `autoJoin: "allowlist"` 设置为 `autoJoinAllowlist` 或 `autoJoin: "always"`。
- `channels.matrix.joinIntro` 默认为 `true`。当机器人实际加入允许的群组房间时，它会使用房间名称、主题和最多 100 条可读的最近消息发布一条介绍。失败的历史读取留下仅元数据的介绍。将此选项设置为 `false` 以禁用介绍，或使用 `channels.matrix.accounts.<accountId>.joinIntro` 进行特定于账户的覆盖。每个房间进行一次介绍；未接受的邀请、启动房间快照、使机器人加入的会员更新以及直接房间不会触发它们。参见[群加入介绍](/channels#group-join-introductions)。
- `channels.matrix.execApprovals`：Matrix-native执行审批交付和审批人授权。
  - `enabled`：`true`、`false` 或 `"auto"`（默认）。在自动模式下，当审批者可以从 `approvers` 或 `commands.ownerAllowFrom` 解析时，执行审批就会激活。
  - `approvers`：Matrix 用户 ID （e.g. `@owner:example.org`） 允许批准 exec 请求。
  - `agentFilter`：可选代理 ID 白名单。省略转发所有代理的批准。
  - `sessionFilter`：可选的会话密钥模式（子字符串或正则表达式）。
  - `target`：将审批提示发送到哪里。`"dm"`（默认）、`"channel"`（发起请求的房间）或 `"both"`。
  - 每账户覆盖：`channels.matrix.accounts.<id>.execApprovals`。
- `channels.matrix.dm.sessionScope` 控制 Matrix DM 如何分组为会话：`per-user`（默认）由路由对等方共享，而 `per-room` 隔离每个 DM 房间。
- Matrix 状态检查和实时目录查找使用与运行时流量相同的代理策略。
- 完整的 Matrix 配置、目标规则和设置示例记录在 [Matrix](/channels/matrix) 中。

## IRC

IRC 由插件支持，并在 `channels.irc` 下进行配置。

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
- 可选 `channels.irc.defaultAccount` 在与配置的帐户 ID 匹配时覆盖默认帐户选择。
- 完整的IRC通道配置（host/port/TLS/channels/allowlists/mention门控）记录在[IRC](/channels/irc)中。
