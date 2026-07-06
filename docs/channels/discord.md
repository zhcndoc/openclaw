---
summary: "Discord bot setup, config keys, components, voice, and troubleshooting"
read_when:
  - 处理 Discord 频道功能时
title: "Discord"
---

OpenClaw connects to Discord as a bot over the official Discord gateway. DMs and guild channels are supported.

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/channels/pairing">
    Discord 私信默认使用配对模式。
  </Card>
  <Card title="斜杠命令" icon="terminal" href="/tools/slash-commands">
    原生命令行为和命令目录。
  </Card>
  <Card title="频道故障排查" icon="wrench" href="/channels/troubleshooting">
    跨频道诊断和修复流程。
  </Card>
</CardGroup>

## 快速设置

Create a Discord application with a bot, add the bot to your server, and pair it with OpenClaw. Use a private server if you can; [create one first](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server) (**Create My Own > For me and my friends**) if needed.

<Steps>
  <Step title="Create a Discord application and bot">
    In the [Discord Developer Portal](https://discord.com/developers/applications), click **New Application** and name it (for example "OpenClaw").

    Open **Bot** in the sidebar and set the **Username** to your agent's name.

  </Step>

  <Step title="Enable privileged intents">
    Still on the **Bot** page, under **Privileged Gateway Intents** enable:

    - **Message Content Intent** (required)
    - **Server Members Intent** (recommended; required for role allowlists, name-to-ID matching, and channel-audience access groups)
    - **Presence Intent** (optional; only for presence updates)

  </Step>

  <Step title="Copy your bot token">
    On the **Bot** page, click **Reset Token** and copy the token.

    <Note>
    尽管名称如此，这会生成你的第一个 token——并没有真正进行“重置”。
    </Note>

  </Step>

  <Step title="Generate an invite URL and add the bot to your server">
    Open **OAuth2** in the sidebar. In the **OAuth2 URL Generator**, enable the scopes:

    - `bot`
    - `applications.commands`

    In the **Bot Permissions** section that appears, enable at least:

    **General Permissions**
      - View Channels

    **Text Permissions**
      - Send Messages
      - Read Message History
      - Embed Links
      - Attach Files
      - Add Reactions（可选）

    That is the baseline for normal text channels. If the bot will post in threads — including forum or media channel workflows that create or continue a thread — also enable **Send Messages in Threads**.

    Copy the generated URL, open it in a browser, select your server, and click **Continue**. The bot should now appear in your server.

  </Step>

  <Step title="Enable Developer Mode and collect your IDs">
    In the Discord app, enable Developer Mode so you can copy IDs:

    1. **User Settings** (gear icon) → **Developer** → toggle on **Developer Mode**
       *(on mobile: **App Settings** → **Advanced**)*
    2. Right-click your **server icon** → **Copy Server ID**
    3. Right-click your **own avatar** → **Copy User ID**

    Keep the Server ID and User ID with your bot token; you need all three next.

  </Step>

  <Step title="Allow DMs from server members">
    For pairing to work, Discord must let the bot DM you. Right-click your **server icon** → **Privacy Settings** → toggle on **Direct Messages**.

    Keep this on if you use Discord DMs with OpenClaw. If you only use guild channels, you can disable it after pairing.

  </Step>

  <Step title="Set your bot token securely (do not send it in chat)">
    The bot token is a secret. Set it on the machine running OpenClaw before messaging your agent:

```bash
export DISCORD_BOT_TOKEN="YOUR_BOT_TOKEN"
cat > discord.patch.json5 <<'JSON5'
{
  channels: {
    discord: {
      enabled: true,
      token: { source: "env", provider: "default", id: "DISCORD_BOT_TOKEN" },
    },
  },
}
JSON5
openclaw config patch --file ./discord.patch.json5 --dry-run
openclaw config patch --file ./discord.patch.json5
openclaw gateway
```

    If OpenClaw already runs as a background service, restart it via the OpenClaw Mac app or by stopping and restarting the `openclaw gateway run` process.
    For managed service installs, run `openclaw gateway install` from a shell where `DISCORD_BOT_TOKEN` is set, or store the variable in `~/.openclaw/.env` so the service can resolve the env SecretRef after restart.
    If your host is blocked or rate-limited by Discord's startup application lookup, set the application/client ID from the Developer Portal so startup can skip that REST call: `channels.discord.applicationId` for the default account, or `channels.discord.accounts.<accountId>.applicationId` per bot.

  </Step>

  <Step title="配置 OpenClaw 并完成配对">

    <Tabs>
      <Tab title="Ask your agent">
        Chat with your OpenClaw agent on an existing channel (for example Telegram) and tell it. If Discord is your first channel, use the CLI / config tab instead.

        > “我已经把 Discord bot token 设置到配置中了。请使用 User ID `<user_id>` 和 Server ID `<server_id>` 完成 Discord 设置。”
      </Tab>
      <Tab title="CLI / config">
        File-based config:

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: {
        source: "env",
        provider: "default",
        id: "DISCORD_BOT_TOKEN",
      },
    },
  },
}
```

        默认账户的 env 回退值：

```bash
DISCORD_BOT_TOKEN=...
```

        For scripted or remote setup, write the same JSON5 block with `openclaw config patch --file ./discord.patch.json5 --dry-run`, then rerun without `--dry-run`. Plaintext `token` strings work too, and SecretRef values are supported for `channels.discord.token` across env/file/exec providers. See [Secrets Management](/gateway/secrets).

        For multiple Discord bots, keep each bot token and application ID under its account. A top-level `channels.discord.applicationId` is inherited by accounts, so only set it there when every account uses the same application ID.

```json5
{
  channels: {
    discord: {
      enabled: true,
      accounts: {
        personal: {
          token: { source: "env", provider: "default", id: "DISCORD_PERSONAL_TOKEN" },
          applicationId: "111111111111111111",
        },
        work: {
          token: { source: "env", provider: "default", id: "DISCORD_WORK_TOKEN" },
          applicationId: "222222222222222222",
        },
      },
    },
  },
}
```

      </Tab>
    </Tabs>

  </Step>

  <Step title="Approve first DM pairing">
    Once the gateway is running, DM your bot in Discord. It replies with a pairing code.

    <Tabs>
      <Tab title="询问你的代理">
        在你现有的频道中把配对码发送给你的代理：

        > “批准这个 Discord 配对码：`<CODE>`”
      </Tab>
      <Tab title="CLI">

```bash
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```

      </Tab>
    </Tabs>

    Pairing codes expire after 1 hour. After approval, chat with your agent in a Discord DM.

  </Step>
</Steps>

<Note>
Token resolution is account-aware. Config token values win over the env fallback, and `DISCORD_BOT_TOKEN` is only used for the default account.
If two enabled Discord accounts resolve to the same bot token, OpenClaw starts only one gateway monitor for that token: a config-sourced token wins over the env fallback; otherwise the first enabled account wins and the duplicate account is reported disabled with reason `duplicate bot token`.
For advanced outbound calls (message tool/channel actions), an explicit per-call `token` is used for that call. This applies to send and read/probe-style actions (read/search/fetch/thread/pins/permissions). Account policy/retry settings still come from the selected account in the active runtime snapshot.
</Note>

## 推荐：设置 guild 工作区

Once DMs work, you can turn your server into a full workspace where each channel gets its own agent session with its own context. Recommended for private servers where it is just you and your bot.

<Steps>
  <Step title="Add your server to the guild allowlist">
    This lets your agent respond in any channel on your server, not just DMs.

    <Tabs>
      <Tab title="询问你的代理">
        > “把我的 Discord Server ID `<server_id>` 添加到 guild 白名单”
      </Tab>
      <Tab title="配置">

```json5
{
  channels: {
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        YOUR_SERVER_ID: {
          requireMention: true,
          users: ["YOUR_USER_ID"],
        },
      },
    },
  },
}
```

      </Tab>
    </Tabs>

  </Step>

  <Step title="Allow responses without @mention">
    By default, the agent only responds in guild channels when @mentioned. On a private server you probably want it to respond to every message.

    在 guild 频道中，普通回复默认会自动发送。对于共享的常驻房间，可以选择 `messages.groupChat.visibleReplies: "message_tool"`，这样代理就可以潜伏，只在判断频道回复有用时才发帖。这对使用最新一代、工具可靠性高的模型（如 GPT 5.5）效果最好。除非工具发送消息，否则环境房间事件保持静默。完整的潜伏模式配置请参见 [Ambient room events](/channels/ambient-room-events)。

    如果 Discord 显示正在输入，而且日志显示 token 使用量但没有实际发出消息，请检查该轮次是否被配置为 ambient room event，或是否启用了 message-tool visible replies。

    <Tabs>
      <Tab title="询问你的代理">
        > “允许我的代理在这个服务器上响应，而不必 @mention 它”
      </Tab>
      <Tab title="配置">
        在你的 guild 配置中将 `requireMention` 设为 `false`：

```json5
{
  channels: {
    discord: {
      guilds: {
        YOUR_SERVER_ID: {
          requireMention: false,
        },
      },
    },
  },
}
```

        若要要求 message-tool 发送可见的 group/channel 回复，请设置 `messages.groupChat.visibleReplies: "message_tool"`。

      </Tab>
    </Tabs>

  </Step>

  <Step title="Plan for memory in guild channels">
    Long-term memory (MEMORY.md) only auto-loads in DM sessions; guild channels do not load it.

    <Tabs>
      <Tab title="询问你的代理">
        > “当我在 Discord 频道里提问时，如果你需要 MEMORY.md 中的长期上下文，请使用 memory_search 或 memory_get。”
      </Tab>
      <Tab title="Manual">
        For shared context in every channel, put stable instructions in `AGENTS.md` or `USER.md` (injected for every session). Keep long-term notes in `MEMORY.md` and access them on demand with memory tools.
      </Tab>
    </Tabs>

  </Step>
</Steps>

Now create channels and start chatting. The agent sees the channel name, and each channel is an isolated session — set up `#coding`, `#home`, `#research`, or whatever fits your workflow.

## 运行模型

- Gateway owns the Discord connection.
- Reply routing is deterministic: Discord inbound replies back to Discord.
- Discord guild/channel metadata is added to the model prompt as untrusted context, not as a user-visible reply prefix. If a model copies that envelope back, OpenClaw strips the copied metadata from outbound replies and from future replay context.
- By default (`session.dmScope=main`), direct chats share the agent main session (`agent:main:main`).
- Guild channels are isolated session keys (`agent:<agentId>:discord:channel:<channelId>`).
- Group DMs are ignored by default (`channels.discord.dm.groupEnabled=false`).
- Native slash commands run in isolated command sessions (`agent:<agentId>:discord:slash:<userId>`), while still carrying `CommandTargetSessionKey` to the routed conversation session.
- Text-only cron/heartbeat announce delivery to Discord collapses to the final assistant-visible answer, sent once. Media and structured component payloads remain multi-message when the agent emits multiple deliverable payloads.

## 论坛频道

Discord 论坛频道和媒体频道只接受线程帖子。OpenClaw 支持两种创建方式：

- Send a message to the forum parent (`channel:<forumId>`) to auto-create a thread. The thread title is the first non-empty line of the message (truncated to Discord's 100-character thread-name limit).
- Use `openclaw message thread create` to create a thread directly. Do not pass `--message-id` for forum channels.

Send to the forum parent to create a thread:

```bash
openclaw message send --channel discord --target channel:<forumId> \
  --message "Topic title\nBody of the post"
```

Create a forum thread explicitly:

```bash
openclaw message thread create --channel discord --target channel:<forumId> \
  --thread-name "Topic title" --message "Body of the post"
```

论坛父频道不接受 Discord 组件。如果你需要组件，请发送到线程本身（`channel:<threadId>`）。

## 交互式组件

OpenClaw supports Discord components v2 containers for agent messages. Use the message tool with a `components` payload. Interaction results route back to the agent as normal inbound messages and follow the existing Discord `replyToMode` settings.

支持的块：

- `text`、`section`、`separator`、`actions`、`media-gallery`、`file`
- 操作行最多允许 5 个按钮或一个单选菜单
- 选择类型：`string`、`user`、`role`、`mentionable`、`channel`

默认情况下，组件只能使用一次。设置 `components.reusable=true` 可允许按钮、选择器和表单在过期前被多次使用。

To restrict who can click a button, set `allowedUsers` on that button (Discord user IDs, tags, or `*`). Unmatched users receive an ephemeral denial.

Component callbacks expire after 30 minutes by default. Set `channels.discord.agentComponents.ttlMs` to change the callback registry lifetime for the default account, or `channels.discord.accounts.<accountId>.agentComponents.ttlMs` per account. The value is milliseconds, must be a positive integer, and is capped at `86400000` (24 hours). Longer TTLs suit review/approval workflows that need buttons to stay usable, but they extend the window in which an old Discord message can still trigger an action. Prefer the shortest TTL that fits, and keep the default when stale callbacks would be surprising.

The `/model` and `/models` slash commands open an interactive model picker with provider, model, and compatible runtime dropdowns plus a Submit step. `/models add` is deprecated and returns a deprecation message instead of registering models from chat. The picker reply is ephemeral and only usable by the invoking user. Discord select menus are limited to 25 options, so add `provider/*` entries to `agents.defaults.models` when you want the picker to show dynamically discovered models only for selected providers such as `openai` or `vllm`.

文件附件：

- `file` 块必须指向一个附件引用（`attachment://<filename>`）
- 通过 `media`/`path`/`filePath` 提供附件（单文件）；多个文件使用 `media-gallery`
- 当上传名称应与附件引用匹配时，使用 `filename` 覆盖上传名

模态表单：

- 添加 `components.modal`，最多 5 个字段
- 字段类型：`text`、`checkbox`、`radio`、`select`、`role-select`、`user-select`
- OpenClaw 会自动添加一个触发按钮

示例：

```json5
{
  channel: "discord",
  action: "send",
  to: "channel:123456789012345678",
  message: "Optional fallback text",
  components: {
    reusable: true,
    text: "选择一条路径",
    blocks: [
      {
        type: "actions",
        buttons: [
          {
            label: "批准",
            style: "success",
            allowedUsers: ["123456789012345678"],
          },
          { label: "拒绝", style: "danger" },
        ],
      },
      {
        type: "actions",
        select: {
          type: "string",
          placeholder: "选择一个选项",
          options: [
            { label: "选项 A", value: "a" },
            { label: "选项 B", value: "b" },
          ],
        },
      },
    ],
    modal: {
      title: "详情",
      triggerLabel: "打开表单",
      fields: [
        { type: "text", label: "请求人" },
        {
          type: "select",
          label: "优先级",
          options: [
            { label: "低", value: "low" },
            { label: "高", value: "high" },
          ],
        },
      ],
    },
  },
}
```

## 访问控制与路由

<Tabs>
  <Tab title="DM 策略">
    `channels.discord.dmPolicy` 控制 DM 访问。`channels.discord.allowFrom` 是 DM 允许名单的规范配置。

    - `pairing` (default)
    - `allowlist` (requires at least one `allowFrom` sender)
    - `open` (requires `channels.discord.allowFrom` to include `"*"`)
    - `disabled`

    如果 DM 策略不是 open，则未知用户会被阻止（或在 `pairing` 模式下被提示配对）。

    多账号优先级：

    - `channels.discord.accounts.default.allowFrom` 只适用于 `default` 账号。
    - 对于单个账号，`allowFrom` 的优先级高于旧的 `dm.allowFrom`。
    - 当各自的 `allowFrom` 和旧的 `dm.allowFrom` 都未设置时，命名账号会继承 `channels.discord.allowFrom`。
    - 命名账号不会继承 `channels.discord.accounts.default.allowFrom`。

    Legacy `channels.discord.dm.policy` and `channels.discord.dm.allowFrom` are still read for compatibility. `openclaw doctor --fix` migrates them to `dmPolicy` and `allowFrom` when it can do so without changing access.

    交付时的 DM 目标格式：

    - `user:<id>`
    - `<@id>` 提及

    纯数字 ID 通常在启用了频道默认值时会被解析为频道 ID，但如果这些 ID 列在账号生效的 DM `allowFrom` 中，则会为了兼容性而被视为用户 DM 目标。

  </Tab>

  <Tab title="访问组">
    Discord DMs 和文本命令授权可以在 `channels.discord.allowFrom` 中使用动态的 `accessGroup:<name>` 条目。

    Access group names are shared across message channels. Use `type: "message.senders"` for a static group whose members are expressed in each channel's normal `allowFrom` syntax, or `type: "discord.channelAudience"` when a Discord channel's current `ViewChannel` audience should define membership dynamically. Shared access-group behavior: [Access groups](/channels/access-groups).

```json5
{
  accessGroups: {
    operators: {
      type: "message.senders",
      members: {
        "*": ["global-owner-id"],
        discord: ["discord:123456789012345678"],
        telegram: ["987654321"],
      },
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:operators"],
    },
  },
}
```

    Discord 文本频道没有单独的成员列表。`type: "discord.channelAudience"` 将成员资格建模为：DM 发送者属于已配置的 guild，并且在应用角色和频道覆盖后，当前对已配置频道拥有有效的 `ViewChannel` 权限。

    示例：允许任何能看到 `#maintainers` 的人给 bot 发 DM，同时对其他人关闭 DM。

```json5
{
  accessGroups: {
    maintainers: {
      type: "discord.channelAudience",
      guildId: "1456350064065904867",
      channelId: "1456744319972282449",
      membership: "canViewChannel",
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:maintainers"],
    },
  },
}
```

    你可以混合动态和静态条目：

```json5
{
  accessGroups: {
    maintainers: {
      type: "discord.channelAudience",
      guildId: "1456350064065904867",
      channelId: "1456744319972282449",
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:maintainers", "discord:123456789012345678"],
    },
  },
}
```

    查询失败会关闭访问。如果 Discord 返回 `Missing Access`、成员查询失败，或者频道属于不同的 guild，则 DM 发送者会被视为未授权。

    Enable the Discord Developer Portal **Server Members Intent** when using channel-audience access groups. DMs do not include guild member state, so OpenClaw resolves the member through Discord REST at authorization time.

  </Tab>

  <Tab title="Guild 策略">
    guild 处理由 `channels.discord.groupPolicy` 控制：

    - `open`
    - `allowlist`
    - `disabled`

    当 `channels.discord` 存在时，安全基线是 `allowlist`。

    `allowlist` 行为：

    - guild 必须匹配 `channels.discord.guilds`（优先使用 `id`，也接受 slug）
    - 可选发送者允许名单：`users`（推荐使用稳定 ID）和 `roles`（仅限 role ID）；如果任意一个已配置，当发送者匹配 `users` 或 `roles` 时即被允许
    - 默认禁用直接按名称/标签匹配；仅在紧急兼容模式下启用 `channels.discord.dangerouslyAllowNameMatching: true`
    - `users` 支持名称/标签，但 ID 更安全；`openclaw security audit` 在使用名称/标签条目时会发出警告
    - 如果某个 guild 配置了 `channels`，未列出的频道会被拒绝
    - 如果某个 guild 没有 `channels` 块，则该 allowlist guild 中的所有频道都被允许

    示例：

```json5
{
  channels: {
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        "123456789012345678": {
          requireMention: true,
          ignoreOtherMentions: true,
          users: ["987654321098765432"],
          roles: ["123456789012345678"],
          channels: {
            general: { enabled: true },
            help: { enabled: true, requireMention: true },
          },
        },
      },
    },
  },
}
```

    The legacy per-channel `allow` key is migrated to `enabled` by `openclaw doctor --fix`.

    If you only set `DISCORD_BOT_TOKEN` and do not create a `channels.discord` block, runtime fallback is `groupPolicy="allowlist"` (with a warning in logs), even if `channels.defaults.groupPolicy` is `open`.

  </Tab>

  <Tab title="提及与群组 DM">
    guild 消息默认按提及进行门控。

    提及检测包括：

    - 显式 bot 提及
    - 已配置的提及模式（`agents.list[].groupChat.mentionPatterns`，回退到 `messages.groupChat.mentionPatterns`）
    - 在受支持的情况下，隐式回复 bot 行为

    编写出站 Discord 消息时，请使用规范提及语法：用户用 `<@USER_ID>`，频道用 `<#CHANNEL_ID>`，角色用 `<@&ROLE_ID>`。不要使用旧的 `<@!USER_ID>` 昵称提及形式。

    `requireMention` 按 guild/频道分别配置（`channels.discord.guilds...`）。
    `ignoreOtherMentions` 可选地会丢弃那些提及了其他用户/角色但没有提及 bot 的消息（`@everyone`/`@here` 除外）。

    群组 DM：

    - 默认：忽略（`dm.groupEnabled=false`）
    - 可选允许名单：`dm.groupChannels`（频道 ID 或 slug）

  </Tab>
</Tabs>

### 基于角色的 agent 路由

使用 `bindings[].match.roles` 按角色 ID 将 Discord guild 成员路由到不同的 agent。基于角色的绑定仅接受 role ID，并且在 peer 或 parent-peer 绑定之后、guild-only 绑定之前进行评估。如果某个绑定还设置了其他匹配字段（例如 `peer` + `guildId` + `roles`），则所有已配置字段都必须匹配。

```json5
{
  bindings: [
    {
      agentId: "opus",
      match: {
        channel: "discord",
        guildId: "123456789012345678",
        roles: ["111111111111111111"],
      },
    },
    {
      agentId: "sonnet",
      match: {
        channel: "discord",
        guildId: "123456789012345678",
      },
    },
  ],
}
```

## 原生命令和命令授权

- `commands.native` defaults to `"auto"` and is enabled for Discord.
- Per-channel override: `channels.discord.commands.native`.
- `commands.native=false` skips Discord slash-command registration and cleanup during startup. Previously registered commands may remain visible in Discord until you remove them from the Discord app.
- Native command auth uses the same Discord allowlists/policies as normal message handling.
- Commands may still be visible in the Discord UI for unauthorized users; execution enforces OpenClaw auth and replies "not authorized".
- Default slash command settings: `ephemeral: true` (`channels.discord.slashCommand.ephemeral`).

See [Slash commands](/tools/slash-commands) for the command catalog and behavior.

## 功能详情

<AccordionGroup>
  <Accordion title="回复标签和原生回复">
    Discord 支持代理输出中的回复标签：

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    由 `channels.discord.replyToMode` 控制：

    - `off` (default): no implicit reply threading; explicit `[[reply_to_*]]` tags are still honored
    - `first`: attaches the implicit native reply reference to the first outbound Discord message of the turn
    - `all`: attaches it to every outbound message
    - `batched`: attaches it only when the inbound event was a debounced batch of multiple messages — useful when you want native replies mainly for ambiguous bursty chats, not every single-message turn

    消息 ID 会在上下文/历史中展示，以便代理可以定位特定消息。

  </Accordion>

  <Accordion title="Link previews">
    Discord generates rich link embeds for URLs by default. OpenClaw suppresses those generated embeds on outbound Discord messages by default, so agent-sent URLs stay plain links unless you opt in:

```json5
{
  channels: {
    discord: {
      suppressEmbeds: false,
    },
  },
}
```

    将 `channels.discord.accounts.<id>.suppressEmbeds` 设为可覆盖单个账户。代理消息工具发送也可以为单条消息传入 `suppressEmbeds: false`。显式的 Discord `embeds` 载荷不会被默认链接预览设置抑制。

  </Accordion>

  <Accordion title="Live stream preview">
    OpenClaw can stream draft replies by sending a temporary message and editing it as text arrives. `channels.discord.streaming.mode` takes `off` | `partial` | `block` | `progress` (default when no `streaming`/legacy `streamMode` key is set). `streamMode` is a legacy alias; run `openclaw doctor --fix` to rewrite persisted config to the canonical nested `streaming` shape.

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          label: "auto",
          maxLines: 8,
          maxLineChars: 120,
          toolProgress: true,
          commentary: false,
        },
      },
    },
  },
}
```

    - `off` disables Discord preview edits.
    - `partial` edits a single preview message as tokens arrive.
    - `block` emits draft-sized chunks; tune size and breakpoints with `streaming.preview.chunk` (`minChars`, `maxChars`, `breakPreference`), clamped to `textChunkLimit`. When block streaming is explicitly enabled, OpenClaw skips the preview stream to avoid double-streaming.
    - `progress` keeps one editable status draft and updates it with tool progress until final delivery; the shared starter label is a rolling line, so it scrolls away like the rest once enough work appears.
    - Media, error, and explicit-reply finals cancel pending preview edits.
    - `streaming.preview.toolProgress` (default `true`) controls whether tool/progress updates reuse the preview message.
    - Tool/progress rows render as compact emoji + title + detail when available, for example `🛠️ Bash: run tests` or `🔎 Web Search: for "query"`.
    - `streaming.progress.commentary` (default `false`) opts into assistant commentary/preamble text in the temporary progress draft. Commentary is cleaned before display, stays transient, and does not change final answer delivery.
    - `streaming.progress.maxLineChars` controls the per-line progress preview budget. Prose is shortened on word boundaries; command and path details keep useful suffixes.
    - `streaming.preview.commandText` / `streaming.progress.commandText` controls command/exec detail in compact progress lines: `raw` (default) or `status` (tool label only).

    隐藏原始命令/执行文本，同时保留紧凑进度行：

    ```json
    {
      "channels": {
        "discord": {
          "streaming": {
            "mode": "progress",
            "progress": {
              "toolProgress": true,
              "commandText": "status"
            }
          }
        }
      }
    }
    ```

    Preview streaming is text-only; media replies fall back to normal delivery.

  </Accordion>

  <Accordion title="历史、上下文和线程行为">
    服务器组历史上下文：

    - `channels.discord.historyLimit` 默认 `20`
    - 回退：`messages.groupChat.historyLimit`
    - `0` 表示禁用

    DM 历史控制：

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    线程行为：

    - Discord threads route as channel sessions and inherit parent channel config unless overridden.
    - Thread sessions inherit the parent channel's session-level `/model` selection as a model-only fallback; thread-local `/model` selections take precedence, and parent transcript history is not copied unless transcript inheritance is enabled.
    - `channels.discord.thread.inheritParent` (default `false`) opts new auto-threads into seeding from the parent transcript. Per-account override: `channels.discord.accounts.<id>.thread.inheritParent`.
    - Message-tool reactions can resolve `user:<id>` DM targets.
    - `guilds.<guild>.channels.<channel>.requireMention: false` is preserved during reply-stage activation fallback.

    频道主题会作为**不受信任**的上下文注入。允许列表限制的是谁可以触发代理，而不是完整的补充上下文删减边界。

  </Accordion>

  <Accordion title="供子代理使用的线程绑定会话">
    Discord 可以将线程绑定到某个会话目标，这样该线程中的后续消息会继续路由到同一个会话（包括子代理会话）。

    命令：

    - `/focus <target>` 将当前/新线程绑定到子代理/会话目标
    - `/unfocus` 移除当前线程绑定
    - `/agents` 显示当前运行和绑定状态
    - `/session idle <duration|off>` 检查/更新已聚焦绑定的不活动自动取消聚焦
    - `/session max-age <duration|off>` 检查/更新已聚焦绑定的硬性最大时长

    配置：

```json5
{
  session: {
    threadBindings: {
      enabled: true,
      idleHours: 24,
      maxAgeHours: 0,
    },
  },
  channels: {
    discord: {
      threadBindings: {
        enabled: true,
        idleHours: 24,
        maxAgeHours: 0,
        spawnSessions: true,
        defaultSpawnContext: "fork",
      },
    },
  },
}
```

    说明：

    - `session.threadBindings.*` sets global defaults; `channels.discord.threadBindings.*` overrides Discord behavior.
    - `spawnSessions` controls auto-create/bind threads for `sessions_spawn({ thread: true })` and ACP thread spawns. Default: `true`.
    - `defaultSpawnContext` controls native subagent context for thread-bound spawns. Default: `"fork"`.
    - Deprecated `spawnSubagentSessions`/`spawnAcpSessions` keys are migrated by `openclaw doctor --fix`.
    - If thread bindings are disabled for an account, `/focus` and related thread binding operations are unavailable.

    参见 [Sub-agents](/tools/subagents)、[ACP Agents](/tools/acp-agents) 和 [Configuration Reference](/gateway/configuration-reference)。

  </Accordion>

  <Accordion title="持久化 ACP 频道绑定">
    对于稳定的“始终在线” ACP 工作区，请配置面向 Discord 会话的顶层类型化 ACP 绑定。

    Config path: `bindings[]` with `type: "acp"` and `match.channel: "discord"`.

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "discord",
        accountId: "default",
        peer: { kind: "channel", id: "222222222222222222" },
      },
      acp: { label: "codex-main" },
    },
  ],
  channels: {
    discord: {
      guilds: {
        "111111111111111111": {
          channels: {
            "222222222222222222": {
              requireMention: false,
            },
          },
        },
      },
    },
  },
}
```

    说明：

    - `/acp spawn codex --bind here` 会就地绑定当前频道或线程，并让未来的消息保持在同一个 ACP 会话上。线程消息会继承父频道绑定。
    - 在已绑定的频道或线程中，`/new` 和 `/reset` 会就地重置同一个 ACP 会话。临时线程绑定在启用时可以覆盖目标解析。
    - `spawnSessions` 通过 `--thread auto|here` 控制子线程创建/绑定。

    参见 [ACP Agents](/tools/acp-agents) 了解绑定行为详情。

  </Accordion>

  <Accordion title="Reaction notifications">
    Per-guild reaction notification mode (`guilds.<id>.reactionNotifications`):

    - `off`
    - `own`（默认）
    - `all`
    - `allowlist`（使用 `guilds.<id>.users`）

    反应事件会被转换为系统事件并附加到路由到的 Discord 会话中。

  </Accordion>

  <Accordion title="Ack reactions">
    `ackReaction` sends an acknowledgement emoji while OpenClaw processes an inbound message.

    解析顺序：

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - 代理身份表情回退（`agents.list[].identity.emoji`，否则为 "👀"）

    说明：

    - Discord 接受 Unicode 表情或自定义表情名称。
    - 使用 `""` 可为频道或账户禁用该反应。

  </Accordion>

  <Accordion title="Config writes">
    Channel-initiated config writes are enabled by default. This affects `/config set|unset` flows (when command features are enabled).

    禁用：

```json5
{
  channels: {
    discord: {
      configWrites: false,
    },
  },
}
```

  </Accordion>

  <Accordion title="Gateway proxy">
    Route Discord gateway WebSocket traffic and startup REST lookups (application ID + allowlist resolution) through an HTTP(S) proxy with `channels.discord.proxy`.
    Discord gateway WebSocket proxying is explicit; WebSocket connections do not inherit ambient proxy environment variables from the Gateway process. Startup REST lookups use this proxy when `channels.discord.proxy` is configured.

```json5
{
  channels: {
    discord: {
      proxy: "http://proxy.example:8080",
    },
  },
}
```

    按账户覆盖：

```json5
{
  channels: {
    discord: {
      accounts: {
        primary: {
          proxy: "http://proxy.example:8080",
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="PluralKit 支持">
    启用 PluralKit 解析以将代理消息映射到系统成员身份：

```json5
{
  channels: {
    discord: {
      pluralkit: {
        enabled: true,
        token: "pk_live_...", // 可选；私有系统需要
      },
    },
  },
}
```

    说明：

    - allowlists can use `pk:<memberId>`
    - member display names are matched by name/slug only when `channels.discord.dangerouslyAllowNameMatching: true`
    - lookups query the PluralKit API with the original message ID
    - if lookup fails, proxied messages are treated as bot messages and dropped unless `allowBots` lets them through

  </Accordion>

  <Accordion title="出站提及别名">
    当代理需要对已知 Discord 用户进行确定性的出站提及时，使用 `mentionAliases`。键是不带前导 `@` 的 handle；值是 Discord 用户 ID。未知 handle、`@everyone`、`@here` 以及 Markdown 代码跨度中的提及会保持不变。

```json5
{
  channels: {
    discord: {
      mentionAliases: {
        SupportLead: "123456789012345678",
      },
      accounts: {
        ops: {
          mentionAliases: {
            OpsLead: "234567890123456789",
          },
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="状态配置">
    当你设置状态或活动字段，或者启用自动状态时，会应用状态更新。

    Status only:

```json5
{
  channels: {
    discord: {
      status: "idle",
    },
  },
}
```

    Activity (custom status is the default activity type when `activity` is set):

```json5
{
  channels: {
    discord: {
      activity: "Focus time",
      activityType: 4,
    },
  },
}
```

    Streaming:

```json5
{
  channels: {
    discord: {
      activity: "Live coding",
      activityType: 1,
      activityUrl: "https://twitch.tv/openclaw",
    },
  },
}
```

    活动类型映射：

    - 0: Playing
    - 1: Streaming (requires `activityUrl`; `activityUrl` in turn requires `activityType: 1`)
    - 2: Listening
    - 3: Watching
    - 4: Custom（将活动文本作为状态值；表情可选）
    - 5: Competing

    Auto presence (runtime health signal):

```json5
{
  channels: {
    discord: {
      autoPresence: {
        enabled: true,
        intervalMs: 30000,
        minUpdateIntervalMs: 15000,
        exhaustedText: "token exhausted",
      },
    },
  },
}
```

    Auto presence maps runtime availability to Discord status: healthy => online, degraded or unknown => idle, exhausted or unavailable => dnd. Defaults: `intervalMs` 30000, `minUpdateIntervalMs` 15000 (must be less than or equal to `intervalMs`). Optional text overrides:

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText`（支持 `{reason}` 占位符）

  </Accordion>

  <Accordion title="Discord 中的审批">
    Discord 支持在 DM 中基于按钮的审批处理，并且可以选择在发起频道中发布审批提示。

    配置路径：

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers`（可选；在可能时回退到 `commands.ownerAllowFrom`）
    - `channels.discord.execApprovals.target`（`dm` | `channel` | `both`，默认：`dm`）
    - `agentFilter`、`sessionFilter`、`cleanupAfterResolve`

    当 `enabled` 未设置或为 `"auto"`，并且至少能从 `execApprovals.approvers` 或 `commands.ownerAllowFrom` 中解析出一个审批者时，Discord 会自动启用原生执行审批。Discord 不会从频道 `allowFrom`、旧的 `dm.allowFrom` 或直接消息的 `defaultTo` 推断执行审批者。将 `enabled: false` 设为显式禁用 Discord 作为原生审批客户端。

    For sensitive owner-only group commands such as `/diagnostics` and `/export-trajectory`, OpenClaw sends approval prompts and final results privately. It tries Discord DM first when the invoking owner has a Discord owner route; otherwise it falls back to the first available owner route from `commands.ownerAllowFrom`, such as Telegram.

    当 `target` 为 `channel` 或 `both` 时，审批提示会在频道中可见。只有已解析出的审批者可以使用这些按钮；其他用户会收到一个临时拒绝。审批提示包含命令文本，因此只应在受信任的频道中启用频道投递。如果无法从会话键推导出频道 ID，OpenClaw 会回退为 DM 投递。

    Discord renders the shared approval buttons used by other chat channels; the native Discord adapter mainly adds approver DM routing and channel fanout. When those buttons are present, they are the primary approval UX; OpenClaw should only include a manual `/approve` command when the tool result says chat approvals are unavailable or manual approval is the only path. If the Discord native approval runtime is not active, OpenClaw keeps the local deterministic `/approve <id> <decision>` prompt visible. If the runtime is active but a native card cannot be delivered to any target, OpenClaw sends a same-chat fallback notice with the exact `/approve` command from the pending approval.

    网关认证和审批解析遵循共享的 Gateway 客户端契约（`plugin:` ID 通过 `plugin.approval.resolve` 解析；其他 ID 通过 `exec.approval.resolve` 解析）。审批默认在 30 分钟后过期。

    参见 [Exec approvals](/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>

我会保持原始 Markdown 结构不变，只翻译可见文本内容；代码块里的代码标识、HTML 标签/属性也会按规则保留。现在直接输出完整中文译文。## 工具与 action gate

Discord message actions cover messaging, channel admin, moderation, presence, and metadata.

核心示例：

- 消息：`sendMessage`、`readMessages`、`editMessage`、`deleteMessage`、`threadReply`
- 反应：`react`、`reactions`、`emojiList`
- 审核：`timeout`、`kick`、`ban`
- 状态：`setPresence`

`event-create` 动作接受一个可选的 `image` 参数（URL 或本地文件路径）来设置计划事件封面图。

Action gate 位于 `channels.discord.actions.*` 下。

默认 gate 行为：

| 动作组                                                                                                                                                              | 默认值   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| reactions、messages、threads、pins、polls、search、memberInfo、roleInfo、channelInfo、channels、voiceStatus、events、stickers、emojiUploads、stickerUploads、permissions | 已启用   |
| roles                                                                                                                                                               | 已禁用   |
| moderation                                                                                                                                                          | 已禁用   |
| presence                                                                                                                                                            | 已禁用   |

## Components v2 UI

OpenClaw 使用 Discord components v2 进行执行审批和跨上下文标记。Discord 消息动作也可以接受 `components` 来构建自定义 UI（高级用法；需要通过 discord 工具构造 component payload），而旧版 `embeds` 仍然可用，但不建议使用。

- `channels.discord.ui.components.accentColor` sets the accent color used by Discord component containers (hex). Per account: `channels.discord.accounts.<id>.ui.components.accentColor`.
- `channels.discord.agentComponents.ttlMs` controls how long sent Discord component callbacks remain registered (default `1800000`, maximum `86400000`). Per account: `channels.discord.accounts.<id>.agentComponents.ttlMs`.
- `embeds` are ignored when components v2 are present.
- Plain URL previews are suppressed by default. Set `suppressEmbeds: false` on a message action when a single outbound link should expand.

示例：

```json5
{
  channels: {
    discord: {
      ui: {
        components: {
          accentColor: "#5865F2",
        },
      },
    },
  },
}
```

## 语音

Discord 有两个不同的语音界面：实时 **voice channels**（连续对话）和 **voice message attachments**（波形预览格式）。gateway 同时支持两者。

### Voice channels

配置清单：

1. 在 Discord Developer Portal 中启用 Message Content Intent。
2. 当使用 role/user allowlist 时，启用 Server Members Intent。
3. 使用 `bot` 和 `applications.commands` scopes 邀请机器人。
4. 在目标 voice channel 中授予 Connect、Speak、Send Messages 和 Read Message History 权限。
5. 启用原生命令（`commands.native` 或 `channels.discord.commands.native`）。
6. 配置 `channels.discord.voice`。

使用 `/vc join|leave|status` 来控制会话。该命令使用账号默认 agent，并遵循与其他 Discord 命令相同的 allowlist 和组策略规则。

```bash
/vc join channel:<voice-channel-id>
/vc status
/vc leave
```

To inspect the bot's effective permissions before joining:

```bash
openclaw channels capabilities --channel discord --target channel:<voice-channel-id>
```

自动加入示例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        model: "openai/gpt-5.5",
        autoJoin: [
          {
            guildId: "123456789012345678",
            channelId: "234567890123456789",
          },
        ],
        allowedChannels: [
          {
            guildId: "123456789012345678",
            channelId: "234567890123456789",
          },
        ],
        daveEncryption: true,
        decryptionFailureTolerance: 24,
        connectTimeoutMs: 30000,
        reconnectGraceMs: 15000,
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          speakerVoice: "cedar",
        },
      },
    },
  },
}
```

说明：

- Discord voice is opt-in for text-only configs; set `channels.discord.voice.enabled=true` (or keep an existing `channels.discord.voice` block) to enable `/vc` commands, the voice runtime, and the `GuildVoiceStates` gateway intent. `channels.discord.intents.voiceStates` can explicitly override the intent subscription; leave it unset to follow effective voice enablement.
- `voice.mode` controls the conversation path. The default is `agent-proxy`: a realtime voice front end handles turn timing, interruption, and playback, delegates substantive work to the routed OpenClaw agent through `openclaw_agent_consult`, and treats the result like a typed Discord prompt from that speaker. `stt-tts` keeps the older batch STT plus TTS flow. `bidi` lets the realtime model converse directly while exposing `openclaw_agent_consult` for the OpenClaw brain.
- `voice.agentSession` controls which OpenClaw conversation receives voice turns. Leave it unset for the voice channel's own session, or set `{ mode: "target", target: "channel:<text-channel-id>" }` to make the voice channel act as the microphone/speaker extension of an existing Discord text channel session such as `#maintainers`.
- `voice.model` overrides the OpenClaw agent brain for Discord voice responses and realtime consults. Leave it unset to inherit the routed agent model. It is separate from `voice.realtime.model`.
- `voice.followUsers` lets the bot join, move, and leave Discord voice with selected users. See [Follow users in voice](#follow-users-in-voice).
- `agent-proxy` routes speech through `discord-voice`, which preserves normal owner/tool authorization for the speaker and target session but hides the agent `tts` tool because Discord voice owns playback. By default, `agent-proxy` gives the consult full owner-equivalent tool access for owner speakers (`voice.realtime.toolPolicy: "owner"`) and strongly prefers consulting the OpenClaw agent before substantive answers (`voice.realtime.consultPolicy: "always"`). In that default `always` mode, the realtime layer does not auto-speak filler before the consult answer; it captures and transcribes speech, then speaks the routed OpenClaw answer. If multiple forced consult answers finish while Discord is still playing the first answer, later exact-speech answers are queued until playback idles instead of replacing speech mid-sentence.
- In `stt-tts` mode, STT uses `tools.media.audio`; `voice.model` does not affect transcription.
- In realtime modes, `voice.realtime.provider`, `voice.realtime.model`, and `voice.realtime.speakerVoice` configure the realtime audio session. For OpenAI Realtime 2 plus the Codex brain, use `voice.realtime.model: "gpt-realtime-2"` and `voice.model: "openai/gpt-5.5"`.
- Realtime voice modes include small `IDENTITY.md`, `USER.md`, and `SOUL.md` profile files in the realtime provider instructions by default so fast direct turns keep the same identity, user grounding, and persona as the routed OpenClaw agent. Set `voice.realtime.bootstrapContextFiles` to a subset to customize this, or `[]` to disable it. Only those profile files are supported; `AGENTS.md` stays in the normal agent context. The injected profile context does not replace `openclaw_agent_consult` for workspace work, current facts, memory lookup, or tool-backed actions.
- In OpenAI `agent-proxy` realtime mode, set `voice.realtime.requireWakeName: true` to keep Discord realtime voice silent until a transcript starts or ends with a wake name. Configured wake names must be one or two words. If `voice.realtime.wakeNames` is unset, OpenClaw uses the routed agent `name` plus `OpenClaw`, falling back to the agent id plus `OpenClaw`. Wake-name gating disables realtime provider auto-response, routes accepted turns through the OpenClaw agent consult path, and gives a short spoken acknowledgement when a leading wake name is recognized from partial transcription before the final transcript arrives.
- The OpenAI realtime provider accepts current Realtime 2 event names and legacy Codex-compatible aliases for output audio and transcript events, so compatible provider snapshots can drift without dropping assistant audio.
- `voice.realtime.bargeIn` controls whether Discord speaker-start events interrupt active realtime playback. If unset, it follows the realtime provider's input-audio interruption setting.
- `voice.realtime.minBargeInAudioEndMs` controls the minimum assistant playback duration before an OpenAI realtime barge-in truncates audio. Default: `250`. Set `0` for immediate interruption in low-echo rooms, or raise it for echo-heavy speaker setups.
- `voice.tts` overrides `messages.tts` for `stt-tts` voice playback only; realtime modes use `voice.realtime.speakerVoice` instead. For an OpenAI voice on Discord playback, set `voice.tts.provider: "openai"` and choose a Text-to-speech voice under `voice.tts.providers.openai.speakerVoice`. `cedar` is a good masculine-sounding choice on the current OpenAI TTS model.
- Per-channel Discord `systemPrompt` overrides apply to voice transcript turns for that voice channel.
- Voice transcript turns derive owner status from Discord `allowFrom` (or `dm.allowFrom`) for owner-gated commands and channel actions. Agent tool visibility follows the configured tool policy for the routed session.
- If `voice.autoJoin` has multiple entries for the same guild, OpenClaw joins the last configured channel for that guild.
- `voice.allowedChannels` is an optional residency allowlist. Leave it unset to allow `/vc join` into any authorized Discord voice channel. When set, `/vc join`, startup auto-join, and bot voice-state moves are restricted to the listed `{ guildId, channelId }` entries. Set it to an empty array to deny all Discord voice joins. If Discord moves the bot outside the allowlist, OpenClaw leaves that channel and rejoins the configured auto-join target when one is available.
- `voice.daveEncryption` and `voice.decryptionFailureTolerance` pass through to `@discordjs/voice` join options; the upstream defaults are `daveEncryption=true` and `decryptionFailureTolerance=24`.
- OpenClaw uses the bundled `libopus-wasm` codec for Discord voice receive and realtime raw PCM playback. It ships a pinned libopus WebAssembly build and does not require native opus addons.
- `voice.connectTimeoutMs` controls the initial `@discordjs/voice` Ready wait for `/vc join` and auto-join attempts. Default: `30000`.
- `voice.reconnectGraceMs` controls how long OpenClaw waits for a disconnected voice session to begin reconnecting before destroying it. Default: `15000`.
- In `stt-tts` mode, voice playback does not stop just because another user starts speaking. To avoid feedback loops, OpenClaw ignores new voice capture while TTS is playing; speak after playback finishes for the next turn. Realtime modes forward speaker starts as barge-in signals to the realtime provider.
- In realtime modes, echo from speakers into an open mic can look like barge-in and interrupt playback. For echo-heavy Discord rooms, set `voice.realtime.providers.openai.interruptResponseOnInputAudio: false` to keep OpenAI from auto-interrupting on input audio. Add `voice.realtime.bargeIn: true` if you still want Discord speaker-start events to interrupt active playback. The OpenAI realtime bridge ignores playback truncations shorter than `voice.realtime.minBargeInAudioEndMs` as likely echo/noise and logs them as skipped instead of clearing Discord playback.
- `voice.captureSilenceGraceMs` controls how long OpenClaw waits after Discord reports a speaker has stopped before finalizing that audio segment for STT. Default: `2000`; raise it if Discord splits normal pauses into choppy partial transcripts.
- When ElevenLabs is the selected TTS provider, Discord voice playback uses streaming TTS and starts from the provider response stream. Providers without streaming support fall back to the synthesized temp-file path.
- OpenClaw watches receive decrypt failures and auto-recovers by leaving/rejoining the voice channel after repeated failures in a short window.
- If receive logs repeatedly show `DecryptionFailed(UnencryptedWhenPassthroughDisabled)` after updating, collect a dependency report and logs. The bundled `@discordjs/voice` line includes the upstream padding fix from discord.js PR #11449, which closed discord.js issue #11419.
- `The operation was aborted` receive events are expected when OpenClaw finalizes a captured speaker segment; they are verbose diagnostics, not warnings.
- Verbose Discord voice logs include a bounded one-line STT transcript preview for each accepted speaker segment, so debugging shows both the user side and the agent reply side without dumping unbounded transcript text.
- In `agent-proxy` mode, forced consult fallback skips likely incomplete transcript fragments such as text ending in `...` or a trailing connector like "and", plus obvious non-actionable closings like "be right back" or "bye". Logs show `forced agent consult skipped reason=...` when this prevents a stale queued answer.

### 在语音中跟随用户

当你希望 Discord 语音机器人跟随一个或多个已知 Discord 用户，而不是在启动时加入固定频道或等待 `/vc join` 时，请使用 `voice.followUsers`。

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        followUsersEnabled: true,
        followUsers: ["discord:123456789012345678"],
        allowedChannels: [
          {
            guildId: "123456789012345678",
            channelId: "234567890123456789",
          },
        ],
      },
    },
  },
}
```

行为：

- `followUsers` 接受原始 Discord user ID 和 `discord:<id>` 值。OpenClaw 会在匹配 voice-state 事件前标准化这两种形式。
- 当配置了 `followUsers` 时，`followUsersEnabled` 默认是 `true`。将其设为 `false` 可以保留已保存的列表，但停止自动跟随语音。
- 当被跟随的用户加入一个允许的语音频道时，OpenClaw 会加入该频道。该用户移动时，OpenClaw 也会跟着移动。被跟随的活动用户断开连接时，OpenClaw 会离开。
- 如果同一个 guild 中有多个被跟随的用户，而当前活动被跟随用户离开，OpenClaw 会在离开该 guild 前先移动到另一个被跟随用户所在的频道。如果多个被跟随用户同时移动，最新观测到的 voice-state 事件优先。
- `allowedChannels` 仍然生效。处于不允许频道中的被跟随用户会被忽略，且由跟随拥有的会话会移动到另一个被跟随用户，或者离开。
- OpenClaw 会在启动时以及按固定间隔对漏掉的 voice-state 事件进行重建。重建会抽样配置的 guild，并限制每次运行的 REST 查询上限，因此非常大的 `followUsers` 列表可能需要多个间隔才能收敛。
- 如果 Discord 或管理员在机器人跟随用户时移动了它，OpenClaw 会重建语音会话，并在目标允许时保留跟随所有权。如果机器人被移动到了 `allowedChannels` 外，OpenClaw 会离开并在存在配置目标时重新加入。
- DAVE 接收恢复在重复解密失败后可能会离开并重新加入同一频道。跟随拥有的会话会在该恢复路径中保留其跟随所有权，因此之后被跟随用户断开连接时仍会离开频道。

在加入模式之间选择：

- 对于个人或 operator 设置，如果希望机器人在你进入语音时自动跟随，就使用 `followUsers`。
- 对于固定房间机器人，如果即使没有被跟踪用户在语音中也应始终存在，就使用 `autoJoin`。
- 对于一次性加入，或自动语音存在会让人意外的房间，就使用 `/vc join`。

Discord 语音编解码器：

- 语音接收日志会显示 `discord voice: opus decoder: libopus-wasm`。
- 实时播放会在把数据包交给 `@discordjs/voice` 之前，使用同一个内置的 `libopus-wasm` 包将原始 48 kHz 立体声 PCM 编码为 Opus。
- 文件和 provider 流播放会先用 ffmpeg 转码为原始 48 kHz 立体声 PCM，然后使用 `libopus-wasm` 生成发送到 Discord 的 Opus 数据包流。

STT 加 TTS 流水线：

- Discord PCM 捕获会转换为 WAV 临时文件。
- `tools.media.audio` 负责 STT，例如 `openai/gpt-4o-mini-transcribe`。
- 转写内容会通过 Discord ingress 和路由传递，而响应 LLM 运行时使用一个语音输出策略：隐藏 agent 的 `tts` 工具并请求返回文本，因为 Discord 语音负责最终的 TTS 播放。
- 当设置了 `voice.model` 时，它只会覆盖该语音频道轮次的响应 LLM。
- `voice.tts` 会覆盖合并到 `messages.tts` 之上；支持流式的 provider 会直接供给播放器，否则生成的音频文件会在加入的频道中播放。

默认 agent-proxy 语音频道会话示例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        model: "openai/gpt-5.5",
        followUsersEnabled: true,
        followUsers: ["123456789012345678"],
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          speakerVoice: "cedar",
        },
      },
    },
  },
}
```

在没有 `voice.agentSession` 块时，每个语音频道都有自己的路由后 OpenClaw 会话。例如，`/vc join channel:234567890123456789` 会与该 Discord 语音频道对应的会话通信。实时模型只是语音前端；实质请求会交给配置好的 OpenClaw agent。如果实时模型在没有调用 consult 工具的情况下生成了最终转写，OpenClaw 会强制 consult 作为回退，因此默认行为仍然像是在与 agent 对话。

旧版 STT 加 TTS 示例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        mode: "stt-tts",
        model: "openai/gpt-5.4-mini",
        tts: {
          provider: "openai",
          providers: {
            openai: {
              model: "gpt-4o-mini-tts",
              speakerVoice: "cedar",
            },
          },
        },
      },
    },
  },
}
```

实时 bidi 示例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        mode: "bidi",
        model: "openai/gpt-5.5",
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          speakerVoice: "cedar",
          toolPolicy: "safe-read-only",
          consultPolicy: "always",
        },
      },
    },
  },
}
```

将语音作为现有 Discord 频道会话的扩展：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        mode: "agent-proxy",
        model: "openai/gpt-5.5",
        agentSession: {
          mode: "target",
          target: "channel:123456789012345678",
        },
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          speakerVoice: "cedar",
        },
      },
    },
  },
}
```

在 `agent-proxy` 模式下，机器人会加入配置的语音频道，但 OpenClaw agent 的轮次会使用目标频道的正常路由会话和 agent。实时语音会话会把返回结果重新播回语音频道。监督 agent 仍可根据其 tool policy 使用正常消息工具，包括在合适时发送单独的 Discord 消息。

在委托的 OpenClaw 运行处于活动状态时，新的 Discord 语音转写会被视为实时运行控制，而不是立即启动另一轮 agent。像“状态”、“取消那个”、“用更小的修复”或“完成后也检查测试”这样的短语，会被分类为当前会话的状态、取消、引导或后续输入。状态、取消、已接受的引导和后续结果都会回放到语音频道中，让调用者知道 OpenClaw 是否处理了请求。

有用的 target 形式：

- `target: "channel:123456789012345678"` 通过 Discord 文本频道会话路由。
- `target: "123456789012345678"` 会被视为频道目标。
- `target: "dm:123456789012345678"` 或 `target: "user:123456789012345678"` 通过该私信会话路由。

回声较重的 OpenAI Realtime 示例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        mode: "bidi",
        model: "openai/gpt-5.5",
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          speakerVoice: "cedar",
          bargeIn: true,
          minBargeInAudioEndMs: 500,
          consultPolicy: "always",
          providers: {
            openai: {
              interruptResponseOnInputAudio: false,
            },
          },
        },
      },
    },
  },
}
```

当模型通过开放麦克风听到自己的 Discord 播放内容，但你仍然希望通过说话来打断它时，请使用这个配置。OpenClaw 会阻止 OpenAI 因原始输入音频而自动中断，同时 `bargeIn: true` 允许 Discord 说话开始事件以及已激活的说话者音频在下一段捕获的轮次到达 OpenAI 之前取消正在进行的 realtime 响应。非常早的 barge-in 信号如果 `audioEndMs` 低于 `minBargeInAudioEndMs`，会被视为可能的回声/噪音并忽略，这样模型就不会在第一帧播放时被截断。

预期的语音日志：

- 加入时：`discord voice: joining ... voiceSession=... supervisorSession=... agentSessionMode=... voiceModel=... realtimeModel=...`
- realtime 开始时：`discord voice: realtime bridge starting ... autoRespond=false interruptResponse=false bargeIn=false minBargeInAudioEndMs=...`
- 有说话者音频时：`discord voice: realtime speaker turn opened ...`、`discord voice: realtime input audio started ... outputAudioMs=... outputActive=...`，以及 `discord voice: realtime speaker turn closed ... chunks=... discordBytes=... realtimeBytes=... interruptedPlayback=...`
- 跳过陈旧语音时：`discord voice: realtime forced agent consult skipped reason=incomplete-transcript ...` 或 `reason=non-actionable-closing ...`
- realtime 响应完成时：`discord voice: realtime audio playback finishing reason=response.done ... audioMs=... chunks=...`
- 播放停止/重置时：`discord voice: realtime audio playback stopped reason=... audioMs=... elapsedMs=... chunks=...`
- realtime consult 时：`discord voice: realtime consult requested ... voiceSession=... supervisorSession=... question=...`
- agent 答复时：`discord voice: agent turn answer ...`
- 排队的精确语音时：`discord voice: realtime exact speech queued ... queued=... outputAudioMs=... outputActive=...`，随后是 `discord voice: realtime exact speech dequeued reason=player-idle ...`
- 检测到 barge-in 时：`discord voice: realtime barge-in detected source=speaker-start ...` 或 `discord voice: realtime barge-in detected source=active-speaker-audio ...`，随后是 `discord voice: realtime barge-in requested reason=... outputAudioMs=... outputActive=...`
- realtime 中断时：`discord voice: realtime model interrupt requested client:response.cancel reason=barge-in`，随后会出现 `discord voice: realtime model audio truncated client:conversation.item.truncate reason=barge-in audioEndMs=...` 或 `discord voice: realtime model interrupt confirmed server:response.done status=cancelled ...`
- 忽略回声/噪音时：`discord voice: realtime model interrupt ignored client:conversation.item.truncate.skipped reason=barge-in audioEndMs=0 minAudioEndMs=250`
- 禁用 barge-in 时：`discord voice: realtime capture ignored during playback (barge-in disabled) ...`
- 空闲播放时：`discord voice: realtime barge-in ignored reason=... outputActive=false ... playbackChunks=0`

若要调试音频被截断，请按时间线阅读 realtime 语音日志：

1. `realtime audio playback started` 表示 Discord 已开始播放 assistant 音频。从此时起，bridge 开始统计 assistant 输出 chunk、Discord PCM 字节、provider realtime 字节以及合成音频时长。
2. `realtime speaker turn opened` 标记 Discord 中某个说话者变为活跃状态。如果播放已在进行且启用了 `bargeIn`，这之后可能会出现 `barge-in detected source=speaker-start`。
3. `realtime input audio started` 标记该说话者轮次收到的第一帧实际音频。这里若 `outputActive=true` 或 `outputAudioMs` 非零，表示麦克风在 assistant 播放仍然活跃时正在输入。
4. `barge-in detected source=active-speaker-audio` 表示 OpenClaw 在 assistant 播放活跃时看到实时说话者音频。这有助于区分真正的中断和只是 Discord 说话开始事件但没有有效音频的情况。
5. `barge-in requested reason=...` 表示 OpenClaw 请求 realtime provider 取消或截断当前响应。它包含 `outputAudioMs`、`outputActive` 和 `playbackChunks`，这样你可以看到在中断前到底播放了多少 assistant 音频。
6. `realtime audio playback stopped reason=...` 是本地 Discord 播放重置点。reason 指明是谁停止了播放：`barge-in`、`player-idle`、`provider-clear-audio`、`forced-agent-consult`、`stream-close` 或 `session-close`。
7. `realtime speaker turn closed` 会总结捕获到的输入轮次。`chunks=0` 或 `hasAudio=false` 表示说话者轮次已打开，但没有可用音频到达 realtime bridge。`interruptedPlayback=true` 表示该输入轮次与 assistant 输出重叠并触发了 barge-in 逻辑。

有用字段：

- `outputAudioMs`：realtime provider 在该日志行之前生成的 assistant 音频时长。
- `audioMs`：OpenClaw 在播放停止前统计的 assistant 音频时长。
- `elapsedMs`：打开和关闭播放流或说话者轮次之间的墙钟时间。
- `discordBytes`：发送到或从 Discord voice 接收的 48 kHz 立体声 PCM 字节数。
- `realtimeBytes`：发送到或从 realtime provider 接收的 provider 格式 PCM 字节数。
- `playbackChunks`：当前响应转发到 Discord 的 assistant 音频 chunk 数。
- `sinceLastAudioMs`：最后一帧捕获到的说话者音频与说话者轮次关闭之间的间隔。

常见模式：

- 立即截断，且 `source=active-speaker-audio`、`outputAudioMs` 很小，并且附近是同一用户，通常说明扬声器回声进入了麦克风。可提高 `voice.realtime.minBargeInAudioEndMs`、降低扬声器音量、使用耳机，或设置 `voice.realtime.providers.openai.interruptResponseOnInputAudio: false`。
- `source=speaker-start` 后接 `speaker turn closed ... hasAudio=false`，表示 Discord 报告了说话开始，但没有音频到达 OpenClaw。这可能是临时的 Discord voice 事件、噪声门行为，或客户端短暂触发麦克风。
- `audio playback stopped reason=stream-close` 且附近没有 barge-in 或 `provider-clear-audio`，表示本地 Discord 播放流意外结束。请检查前面的 provider 和 Discord 播放器日志。
- `capture ignored during playback (barge-in disabled)` 表示 OpenClaw 有意在 assistant 音频活跃时丢弃输入。如果你希望语音打断播放，请启用 `voice.realtime.bargeIn`。
- `barge-in ignored ... outputActive=false` 表示 Discord 或 provider VAD 报告了语音，但 OpenClaw 没有可中断的活动播放。这不应导致音频被截断。

凭据按组件解析：`voice.model` 的 LLM route auth、`tools.media.audio` 的 STT auth、`messages.tts`/`voice.tts` 的 TTS auth，以及 `voice.realtime.providers` 或 provider 常规 auth 配置中的 realtime provider auth。

### Voice messages

Discord 语音消息会显示波形预览，并要求 OGG/Opus 音频。OpenClaw 会自动生成波形，但需要 gateway 主机上的 `ffmpeg` 和 `ffprobe` 来检查和转换。

- 提供一个 **本地文件路径**（URL 会被拒绝）。
- 省略文本内容（Discord 会拒绝同一 payload 中同时包含文本和语音消息）。
- 接受任意音频格式；OpenClaw 会按需转换为 OGG/Opus。

```bash
message(action="send", channel="discord", target="channel:123", path="/path/to/audio.mp3", asVoice=true)
```

## 故障排查

<AccordionGroup>
  <Accordion title="使用了不允许的 intents，或机器人看不到任何 guild 消息">

    - 启用 Message Content Intent
    - 在依赖用户/member 解析时启用 Server Members Intent
    - 更改 intents 后重启 gateway

  </Accordion>

  <Accordion title="Guild 消息被意外阻止">

    - verify `groupPolicy`
    - verify guild allowlist under `channels.discord.guilds`
    - if a guild `channels` map exists, only listed channels are allowed
    - verify `requireMention` behavior and mention patterns

    有用的检查：

```bash
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

  </Accordion>

  <Accordion title="Require mention 为 false，但仍被阻止">
    常见原因：

    - `groupPolicy="allowlist"` without matching guild/channel allowlist
    - `requireMention` configured in the wrong place (must be under `channels.discord.guilds` or a channel entry)
    - sender blocked by guild/channel `users` allowlist

  </Accordion>

  <Accordion title="Discord 长时间运行的轮次或重复回复">

    典型日志：

    - `Slow listener detected ...`
    - `stuck session: sessionKey=agent:...:discord:... state=processing ...`

    Discord gateway 队列参数：

    - 单账号：`channels.discord.eventQueue.listenerTimeout`
    - 多账号：`channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`
    - 这只控制 Discord gateway listener 的工作，不控制 agent 轮次生命周期

    Discord 不会对排队中的 agent 轮次应用 channel 拥有的超时。消息监听器会立即移交，而排队中的 Discord 运行会保留每个 session 的顺序，直到 session/tool/runtime 生命周期完成或中止该工作为止。

```json5
{
  channels: {
    discord: {
      accounts: {
        default: {
          eventQueue: {
            listenerTimeout: 120000,
          },
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="Gateway 元数据查询超时警告">
    OpenClaw 在连接前会获取 Discord 的 `/gateway/bot` 元数据。临时性失败会回退到 Discord 的默认 gateway URL，并在日志中限流。

    元数据超时参数：

    - 单账号：`channels.discord.gatewayInfoTimeoutMs`
    - 多账号：`channels.discord.accounts.<accountId>.gatewayInfoTimeoutMs`
    - 当配置未设置时的环境变量回退：`OPENCLAW_DISCORD_GATEWAY_INFO_TIMEOUT_MS`
    - 默认值：`30000`（30 秒），最大值：`120000`

  </Accordion>

  <Accordion title="Gateway READY 超时重启">
    OpenClaw 在启动期间以及运行时重连后，会等待 Discord gateway 的 `READY` 事件。带有启动错峰的多账号设置，可能需要比默认值更长的启动 READY 窗口。

    READY 超时参数：

    - 启动单账号：`channels.discord.gatewayReadyTimeoutMs`
    - 启动多账号：`channels.discord.accounts.<accountId>.gatewayReadyTimeoutMs`
    - 当配置未设置时的启动环境变量回退：`OPENCLAW_DISCORD_READY_TIMEOUT_MS`
    - 启动默认值：`15000`（15 秒），最大值：`120000`
    - 运行时单账号：`channels.discord.gatewayRuntimeReadyTimeoutMs`
    - 运行时多账号：`channels.discord.accounts.<accountId>.gatewayRuntimeReadyTimeoutMs`
    - 当配置未设置时的运行环境变量回退：`OPENCLAW_DISCORD_RUNTIME_READY_TIMEOUT_MS`
    - 运行时默认值：`30000`（30 秒），最大值：`120000`

  </Accordion>

  <Accordion title="权限审计不匹配">
    `channels status --probe` 的权限检查只适用于数字 channel ID。

    如果你使用 slug 键，运行时匹配仍然可以工作，但 probe 不能完整验证权限。

  </Accordion>

  <Accordion title="DM 和配对问题">

    - DM 已禁用：`channels.discord.dm.enabled=false`
    - DM 策略已禁用：`channels.discord.dmPolicy="disabled"`（旧版：`channels.discord.dm.policy`）
    - 在 `pairing` 模式下等待配对审批

  </Accordion>

  <Accordion title="Bot 到 bot 的循环">
    默认会忽略 bot 发送的消息。

    如果你设置 `channels.discord.allowBots=true`，请使用严格的 mention 和 allowlist 规则来避免循环行为。
    建议使用 `channels.discord.allowBots="mentions"`，这样只接受 mention 了机器人的 bot 消息。

    OpenClaw 还提供共享的 [bot loop protection](/channels/bot-loop-protection)。每当 `allowBots` 让 bot 发送的消息进入 dispatch 时，Discord 会将入站事件映射为 `(account, channel, bot pair)` 事实，而通用 pair guard 会在其超过配置的 event budget 后抑制该 pair。这个 guard 可以防止此前必须依赖 Discord rate limit 才能停止的失控双 bot 循环；它不会影响单 bot 部署，也不会影响保持在预算内的一次性 bot 回复。

    默认设置（在设置 `allowBots` 时生效）：

    - `maxEventsPerWindow: 20` -- bot pair 可在滑动窗口内交换 20 条消息
    - `windowSeconds: 60` -- 滑动窗口长度
    - `cooldownSeconds: 60` -- 一旦预算触发，任何方向上的后续 bot-to-bot 消息都会在一分钟内被丢弃

    先在 `channels.defaults.botLoopProtection` 下配置共享默认值，然后在合法工作流需要更大余量时覆盖 Discord。优先级如下：

    - `channels.discord.accounts.<account>.botLoopProtection`
    - `channels.discord.botLoopProtection`
    - `channels.defaults.botLoopProtection`
    - 内置默认值

    Discord 使用通用的 `maxEventsPerWindow`、`windowSeconds` 和 `cooldownSeconds` 键。

```json5
{
  channels: {
    defaults: {
      botLoopProtection: {
        maxEventsPerWindow: 20,
        windowSeconds: 60,
        cooldownSeconds: 60,
      },
    },
    discord: {
      // 可选的 Discord 全局覆盖。账号块会覆盖单独字段，
      // 并从这里继承未显式填写的字段。
      botLoopProtection: {
        maxEventsPerWindow: 4,
      },
      accounts: {
        alpha: {
          // Alpha listens to other bots only when they mention it.
          allowBots: "mentions",
        },
        bravo: {
          // Bravo listens to all bot-authored Discord messages.
          allowBots: true,
          mentionAliases: {
            // Lets Bravo write an Alpha Discord mention with the configured user id.
            Alpha: "ALPHA_DISCORD_USER_ID",
          },
          botLoopProtection: {
            // 在抑制该 pair 之前，允许每分钟最多五条消息。
            maxEventsPerWindow: 5,
            windowSeconds: 60,
            cooldownSeconds: 90,
          },
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="Voice STT 因 DecryptionFailed(...) 丢失">

    - 保持 OpenClaw 为最新版本（`openclaw update`），以包含 Discord voice 接收恢复逻辑
    - 确认 `channels.discord.voice.daveEncryption=true`（默认值）
    - 从 `channels.discord.voice.decryptionFailureTolerance=24`（上游默认值）开始，仅在需要时调整
    - 关注日志：
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - 如果自动重新加入后失败仍然持续，收集日志并与上游 DAVE receive 历史对照：[discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) 和 [discord.js #11449](https://github.com/discordjs/discord.js/pull/11449)

  </Accordion>
</AccordionGroup>

## 配置参考

主要参考：[Configuration reference - Discord](/gateway/config-channels#discord)。

<Accordion title="高信号 Discord 字段">

- startup/auth: `enabled`, `token`, `applicationId`, `accounts.*`, `allowBots`
- policy: `groupPolicy`, `dmPolicy`, `allowFrom`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- command: `commands.native`, `commands.useAccessGroups` (global), `configWrites`, `slashCommand.ephemeral`
- event queue: `eventQueue.listenerTimeout` (listener budget, default `120000`), `eventQueue.maxQueueSize` (default `10000`), `eventQueue.maxConcurrency` (default `50`)
- gateway: `proxy`, `gatewayInfoTimeoutMs`, `gatewayReadyTimeoutMs`, `gatewayRuntimeReadyTimeoutMs`
- reply/history: `replyToMode`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- delivery: `textChunkLimit` (default `2000`), `maxLinesPerMessage` (default `17`)
- streaming: `streaming.mode`, `streaming.chunkMode`, `streaming.preview.*`, `streaming.progress.*`, `streaming.block.*` (legacy flat `streamMode`, `draftChunk`, `blockStreaming`, `blockStreamingCoalesce`, `chunkMode` keys are migrated into `streaming.*` by `openclaw doctor --fix`)
- media/retry: `mediaMaxMb` (caps outbound Discord uploads, default `100`), `retry`
- actions: `actions.*`
- presence: `activity`, `status`, `activityType`, `activityUrl`, `autoPresence.*`
- UI: `ui.components.accentColor`
- features: `threadBindings`, top-level `bindings[]` (`type: "acp"`), `pluralkit`, `execApprovals`, `intents`, `agentComponents.enabled`, `agentComponents.ttlMs`, `heartbeat`, `responsePrefix`

</Accordion>

## 安全与运维

- Treat bot tokens as secrets (`DISCORD_BOT_TOKEN` preferred in supervised environments).
- Grant least-privilege Discord permissions.
- If command deploy/state is stale, restart the gateway and re-check with `openclaw channels status --probe`.

## 相关

<CardGroup cols={2}>
  <Card title="配对" icon="link" href="/channels/pairing">
    将 Discord 用户与 gateway 配对。
  </Card>
  <Card title="分组" icon="users" href="/channels/groups">
    群聊和 allowlist 行为。
  </Card>
  <Card title="Channel 路由" icon="route" href="/channels/channel-routing">
    将入站消息路由给 agent。
  </Card>
  <Card title="安全" icon="shield" href="/gateway/security">
    威胁模型与加固。
  </Card>
  <Card title="多 agent 路由" icon="sitemap" href="/concepts/multi-agent">
    将 guild 和 channel 映射到 agent。
  </Card>
  <Card title="Slash 命令" icon="terminal" href="/tools/slash-commands">
    原生命令行为。
  </Card>
</CardGroup>