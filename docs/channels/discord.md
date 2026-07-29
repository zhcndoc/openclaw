---
summary: "Discord 机器人设置、配置键、组件、语音和故障排查"
read_when:
  - 处理 Discord 频道功能时
title: "Discord"
---

OpenClaw 通过官方 Discord 网关以机器人身份连接到 Discord。支持私信和服务器频道。

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

创建一个带有 bot 的 Discord 应用，将 bot 添加到你的服务器，并将其与 OpenClaw 配对。如果可以，请使用私有服务器；如有需要，先[创建一个](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server)（**Create My Own > For me and my friends**）。

<Steps>
  <Step title="创建一个 Discord 应用和 bot">
    在 [Discord Developer Portal](https://discord.com/developers/applications) 中，点击 **New Application** 并为其命名（例如 "OpenClaw"）。

    在侧边栏中打开 **Bot**，并将 **Username** 设置为你的代理名称。

  </Step>

  <Step title="启用特权 intent">
    仍在 **Bot** 页面，在 **Privileged Gateway Intents** 下启用：

    - **Message Content Intent**（必需）
    - **Server Members Intent**（推荐；角色白名单、名称到 ID 匹配以及频道受众访问组都需要）
    - **Presence Intent**（可选；仅用于 presence 更新）

  </Step>

  <Step title="复制你的 bot token">
    在 **Bot** 页面，点击 **Reset Token** 并复制该 token。

    <Note>
    尽管名称如此，这会生成你的第一个 token——并没有真正进行“重置”。
    </Note>

  </Step>

  <Step title="生成邀请 URL 并将 bot 添加到你的服务器">
    在侧边栏中打开 **OAuth2**。在 **OAuth2 URL Generator** 中，启用以下 scope：

    - `bot`
    - `applications.commands`

    在出现的 **Bot Permissions** 部分，至少启用：

    **General Permissions**
      - View Channels

    **Text Permissions**
      - Send Messages
      - Read Message History
      - Embed Links
      - Attach Files
      - Add Reactions（可选）

    这就是普通文本频道的基础权限。如果 bot 还会在线程中发消息——包括会创建或继续线程的 forum 或 media 频道工作流——也请启用 **Send Messages in Threads**。

    复制生成的 URL，在浏览器中打开，选择你的服务器，然后点击 **Continue**。此时 bot 应该会出现在你的服务器中。

  </Step>

  <Step title="启用开发者模式并收集你的 ID">
    在 Discord 应用中，启用开发者模式以便你可以复制 ID：

    1. **User Settings**（齿轮图标）→ **Developer** → 打开 **Developer Mode**
       *（在移动端：**App Settings** → **Advanced**）*
    2. 右键单击你的 **server icon** → **Copy Server ID**
    3. 右键单击你自己的 **avatar** → **Copy User ID**

    将 Server ID 和 User ID 与你的 bot token 一起保存；下一步你会需要这三者。

  </Step>

  <Step title="允许来自服务器成员的私信">
    为了使配对工作，Discord 必须允许 bot 给你发送私信。右键单击你的 **server icon** → **Privacy Settings** → 打开 **Direct Messages**。

    如果你使用 Discord 私信和 OpenClaw，请保持开启。如果你只使用 guild 频道，配对完成后可以将其关闭。

  </Step>

  <Step title="安全设置你的 bot token（不要在聊天中发送）">
    bot token 是机密信息。在向你的代理发送消息之前，先在运行 OpenClaw 的机器上设置它：

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

    如果 OpenClaw 已经作为后台服务运行，请通过 OpenClaw Mac 应用重启它，或者停止并重新启动 `openclaw gateway run` 进程。
    对于受管服务安装，请在设置了 `DISCORD_BOT_TOKEN` 的 shell 中运行 `openclaw gateway install`，或者将该变量存储在 `~/.openclaw/.env` 中，以便服务在重启后能够解析该 env SecretRef。
    如果你的主机因 Discord 启动时的应用查询而被阻止或触发限流，请从 Developer Portal 设置 application/client ID，以便启动时跳过该 REST 调用：默认账户使用 `channels.discord.applicationId`，或按 bot 使用 `channels.discord.accounts.<accountId>.applicationId`。

  </Step>

  <Step title="配置 OpenClaw 并完成配对">

    <Tabs>
      <Tab title="Ask your agent">
        在现有频道（例如 Telegram）中与你的 OpenClaw 代理聊天并告知它。如果 Discord 是你的第一个频道，请改用 CLI / config 标签页。

        > “我已经把 Discord bot token 设置到配置中了。请使用 User ID `<user_id>` 和 Server ID `<server_id>` 完成 Discord 设置。”
      </Tab>
      <Tab title="CLI / config">
        基于文件的配置：

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

        对于脚本化或远程设置，使用 `openclaw config patch --file ./discord.patch.json5 --dry-run` 写入相同的 JSON5 块，然后在不带 `--dry-run` 的情况下重新运行。纯文本 `token` 字符串也可以使用，并且 `channels.discord.token` 支持跨 env/file/exec 提供者的 SecretRef 值。参见 [Secrets Management](/gateway/secrets)。

        对于多个 Discord bot，将每个 bot token 和 application ID 保持在各自的账户下。顶层的 `channels.discord.applicationId` 会被账户继承，因此只有当所有账户都使用相同的 application ID 时才应在这里设置。

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

  <Step title="批准首次 DM 配对">
    一旦网关运行起来，就在 Discord 中给你的 bot 发私信。它会回复一个配对码。

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

    配对码在 1 小时后过期。批准后，就可以在 Discord 私信中与你的代理聊天。

  </Step>
</Steps>

<Note>
Token 解析是按账户感知的。配置中的 token 值优先于 env 回退值，且 `DISCORD_BOT_TOKEN` 仅用于默认账户。
如果两个已启用的 Discord 账户解析到同一个 bot token，OpenClaw 只会为该 token 启动一个网关监视器：来自配置的 token 优先于 env 回退值；否则第一个已启用的账户获胜，重复账户会被报告为已禁用，原因是 `duplicate bot token`。
对于高级出站调用（消息工具/频道操作），会为该次调用使用显式的逐次调用 `token`。这适用于发送以及 read/probe 类型的操作（read/search/fetch/thread/pins/permissions）。账户策略/重试设置仍来自活动运行快照中所选账户。
</Note>

## 推荐：设置 guild 工作区

一旦 DM 正常工作，你就可以把服务器变成一个完整的工作区，让每个频道都有自己独立的代理会话和上下文。推荐用于只有你和机器人在的私有服务器。

<Steps>
  <Step title="将你的服务器添加到 guild 白名单">
    这样可以让你的代理在服务器上的任何频道响应，而不只是 DM。

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

  <Step title="允许在不 @mention 的情况下响应">
    默认情况下，代理只会在 guild 频道中被 @mention 时才响应。在私有服务器上，你可能希望它对每条消息都响应。

    在 guild 频道中，普通回复默认会自动发送。对于共享的始终在线房间，可以选择启用 `messages.groupChat.visibleReplies: "message_tool"`，这样代理就可以潜伏，只在它认为频道回复有用时才发送。这在最新一代、工具调用可靠的模型上效果最好，例如 GPT-5.6 Sol。环境房间事件会保持静默，除非工具发送消息。完整的潜伏模式配置请参见 [环境房间事件](/channels/ambient-room-events)。

    如果 Discord 显示正在输入，而且日志显示 token 使用量但没有实际发出消息，请检查该轮次是否被配置为 ambient room event，或者是否启用了 message-tool visible replies。

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

  <Step title="规划 guild 频道中的记忆">
    长期记忆（MEMORY.md）只会在 DM 会话中自动加载；guild 频道不会加载它。

    <Tabs>
      <Tab title="询问你的代理">
        > “当我在 Discord 频道里提问时，如果你需要 MEMORY.md 中的长期上下文，请使用 memory_search 或 memory_get。”
      </Tab>
      <Tab title="手动">
        如果要为每个频道共享上下文，请把稳定的指令放在 `AGENTS.md` 或 `USER.md` 中（每个会话都会注入）。把长期笔记保存在 `MEMORY.md` 中，并在需要时使用 memory 工具访问它们。
      </Tab>
    </Tabs>

  </Step>
</Steps>

现在创建频道并开始聊天。代理会看到频道名称，而且每个频道都是一个独立会话——可以设置 `#coding`、`#home`、`#research`，或者任何适合你工作流的频道。

## 运行模型

- Gateway 拥有 Discord 连接。
- 回复路由是确定性的：Discord 的入站回复会回到 Discord。
- Discord 的 guild/channel 元数据作为不可信上下文添加到模型提示中，而不是作为用户可见的回复前缀。如果模型将该封装复制回去，OpenClaw 会从出站回复以及未来的回放上下文中剥离复制的元数据。
- 默认情况下（`session.dmScope=main`），直接聊天共享代理主会话（`agent:main:main`）。
- Guild 频道使用隔离的会话键（`agent:<agentId>:discord:channel:<channelId>`）。
- 群聊 DM 默认被忽略（`channels.discord.dm.groupEnabled=false`）。
- 原生斜杠命令在隔离的命令会话中运行（`agent:<agentId>:discord:slash:<userId>`），同时仍然携带 `CommandTargetSessionKey` 到路由后的对话会话。
- 仅文本的 cron/heartbeat 宣告投递到 Discord 时会折叠为最终的、对助手可见的答案，并只发送一次。媒体和结构化组件负载在代理生成多个可投递负载时仍保持多条消息。

## 论坛频道

Discord 论坛频道和媒体频道只接受线程帖子。OpenClaw 支持两种创建方式：

- 向论坛父频道（`channel:<forumId>`）发送消息以自动创建线程。线程标题为消息的第一行非空内容（会截断为 Discord 100 个字符的线程名称限制）。
- 使用 `openclaw message thread create` 直接创建线程。对于论坛频道，不要传递 `--message-id`。

发送到论坛父频道以创建线程：

```bash
openclaw message send --channel discord --target channel:<forumId> \
  --message "Topic title\nBody of the post"
```

显式创建论坛线程：

```bash
openclaw message thread create --channel discord --target channel:<forumId> \
  --thread-name "Topic title" --message "Body of the post"
```

论坛父频道不接受 Discord 组件。如果你需要组件，请发送到线程本身（`channel:<threadId>`）。

## 交互式组件

OpenClaw 支持用于代理消息的 Discord components v2 容器。使用带有 `components` 载荷的消息工具。交互结果会作为普通的传入消息路由回代理，并遵循现有的 Discord `replyToMode` 设置。

支持的块：

- `text`、`section`、`separator`、`actions`、`media-gallery`、`file`
- 操作行最多允许 5 个按钮或一个单选菜单
- 选择类型：`string`、`user`、`role`、`mentionable`、`channel`

默认情况下，组件只能使用一次。设置 `components.reusable=true` 可允许按钮、选择器和表单在过期前被多次使用。

要限制谁可以点击按钮，请在该按钮上设置 `allowedUsers`（Discord 用户 ID、标签或 `*`）。未匹配的用户会收到一条临时拒绝提示。

组件回调默认在 30 分钟后过期。设置 `channels.discord.agentComponents.ttlMs` 可更改默认账户的回调注册表生命周期，或设置 `channels.discord.accounts.<accountId>.agentComponents.ttlMs` 为每个账户单独配置。该值以毫秒为单位，必须是正整数，并且上限为 `86400000`（24 小时）。更长的 TTL 适合需要按钮在一段时间内保持可用的审核/审批工作流，但也会延长旧 Discord 消息仍可能触发操作的窗口。请优先选择最短且满足需求的 TTL，并在陈旧回调会令人意外时保留默认值。

`/model` 和 `/models` 斜杠命令会打开一个交互式模型选择器，包含提供方、模型以及兼容运行时下拉菜单，并带有一个提交步骤。`/models add` 已弃用，它会返回弃用提示，而不是从聊天中注册模型。该选择器回复是临时消息，并且只有调用者本人可用。Discord 选择菜单最多限制 25 个选项，因此当你希望选择器仅显示针对特定提供方（如 `openai` 或 `vllm`）动态发现的模型时，请将 `provider/*` 条目添加到 `agents.defaults.modelPolicy.allow` 中。

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

## 访问控制与路由

<Tabs>
  <Tab title="DM 策略">
    `channels.discord.dmPolicy` 控制 DM 访问。`channels.discord.allowFrom` 是 DM 允许名单的规范配置。

    - `pairing` (默认)
    - `allowlist` (需要至少一个 `allowFrom` 发送者)
    - `open` (需要 `channels.discord.allowFrom` 包含 `"*"`)
    - `disabled`

    如果 DM 策略不是 open，则未知用户会被阻止（或在 `pairing` 模式下被提示配对）。

    多账号优先级：

    - `channels.discord.accounts.default.allowFrom` 只适用于 `default` 账号。
    - 对于单个账号，`allowFrom` 的优先级高于旧的 `dm.allowFrom`。
    - 当各自的 `allowFrom` 和旧的 `dm.allowFrom` 都未设置时，命名账号会继承 `channels.discord.allowFrom`。
    - 命名账号不会继承 `channels.discord.accounts.default.allowFrom`。

    为兼容性起见，旧版 `channels.discord.dm.policy` 和 `channels.discord.dm.allowFrom` 仍会被读取。`openclaw doctor --fix` 会在不改变访问权限的前提下尽可能将它们迁移到 `dmPolicy` 和 `allowFrom`。

    交付时的 DM 目标格式：

    - `user:<id>`
    - `<@id>` 提及

    纯数字 ID 通常在启用了频道默认值时会被解析为频道 ID，但如果这些 ID 列在账号生效的 DM `allowFrom` 中，则会为了兼容性而被视为用户 DM 目标。

  </Tab>

  <Tab title="访问组">
    Discord DMs 和文本命令授权可以在 `channels.discord.allowFrom` 中使用动态的 `accessGroup:<name>` 条目。

    访问组名称在所有消息频道之间共享。对于成员在每个频道的常规 `allowFrom` 语法中表达的静态组，请使用 `type: "message.senders"`；如果应由 Discord 频道当前的 `ViewChannel` 受众动态定义成员资格，则使用 `type: "discord.channelAudience"`。共享访问组行为： [访问组](/channels/access-groups)。

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

    使用 channel-audience 访问组时，请在 Discord Developer Portal 中启用 **Server Members Intent**。DM 不包含 guild 成员状态，因此 OpenClaw 会在授权时通过 Discord REST 解析成员。

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

    旧版的逐频道 `allow` 键会被 `openclaw doctor --fix` 迁移为 `enabled`。

    如果你只设置了 `DISCORD_BOT_TOKEN` 而没有创建 `channels.discord` 块，则运行时回退为 `groupPolicy="allowlist"`（日志中会有警告），即使 `channels.defaults.groupPolicy` 是 `open` 也是如此。

  </Tab>

  <Tab title="提及与群组 DM">
    guild 消息默认按提及进行门控。

    提及检测包括：

    - 显式 bot 提及
    - 已配置的提及模式（`agents.entries.*.groupChat.mentionPatterns`，回退为 `messages.groupChat.mentionPatterns`）
    - 支持场景下对 bot 的隐式回复行为

    编写出站 Discord 消息时，请使用规范提及语法：用户用 `<@USER_ID>`，频道用 `<#CHANNEL_ID>`，角色用 `<@&ROLE_ID>`。不要使用旧的 `<@!USER_ID>` 昵称提及形式。

    `requireMention` 按 guild/频道分别配置（`channels.discord.guilds...`）。
    `ignoreOtherMentions` 可选地会丢弃那些提及了其他用户/角色但没有提及 bot 的消息（`@everyone`/`@here` 除外）。

    群组 DM：

    - 默认：忽略（`dm.groupEnabled=false`）
    - 可选允许名单：`dm.groupChannels`（频道 ID 或 slug）

  </Tab>
</Tabs>

### Guild channel maps are allowlists

如果某个 guild 条目没有 `channels` 映射，bot 就可以在它能看到的每个频道中工作，但仍受该 guild 的 `requireMention` 和 `users` 规则约束。**即使只添加一个频道条目，也会把该映射变成 allowlist**：任何未被条目匹配的频道都会被拒绝，而不只是保持 guild 默认值。

这常让人感到意外：他们只添加了一个频道想给它单独设置，结果发现 bot 在其他地方都不再响应了。请使用 `"*"` 通配符键来保持 guild 其余部分仍可访问：

```json5
{
  channels: {
    discord: {
      guilds: {
        YOUR_SERVER_ID: {
          requireMention: true,
          users: ["YOUR_USER_ID"],
          channels: {
            // 常驻房间：其中的每个人都可以和 bot 说话，不需要提及
            YOUR_CHANNEL_ID: { enabled: true, requireMention: false, users: ["*"] },
            // 其他所有频道都保持 guild 默认值
            "*": { enabled: true, requireMention: true },
          },
        },
      },
    },
  },
}
```

频道条目会覆盖 guild 级别的值，因此带有 `users: ["*"]` 的频道条目会向任何发送者开放该房间，即使 guild 的 `users` 列表很窄也是如此。条目可按频道 ID、名称或 slug 匹配，线程会回退到其父频道的条目。

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

- `commands.native` 默认为 `"auto"`，并且对 Discord 已启用。
- 按频道覆盖：`channels.discord.commands.native`。
- `commands.native=false` 会在启动期间跳过 Discord slash 命令注册和清理。之前注册的命令可能仍会在 Discord 中可见，直到你将它们从 Discord 应用中移除。
- 原生命令授权使用与普通消息处理相同的 Discord allowlists/policies。
- 对于未授权用户，命令在 Discord UI 中仍可能可见；执行时会强制进行 OpenClaw 授权并回复 "not authorized"。
- 默认 slash 命令设置：`ephemeral: true`（`channels.discord.slashCommand.ephemeral`）。

有关命令目录和行为，请参见 [Slash commands](/tools/slash-commands)。

## 功能详情

<AccordionGroup>
  <Accordion title="回复标签和原生回复">
    Discord 支持代理输出中的回复标签：

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    由 `channels.discord.replyToMode` 控制：

    - `off`（默认）：不进行隐式回复串联；显式的 `[[reply_to_*]]` 标签仍然会被遵守
    - `first`：将隐式原生回复引用附加到本轮中第一条发出的 Discord 消息
    - `all`：将其附加到每一条发出的消息
    - `batched`：仅当传入事件是由多条消息去抖后合并成的批次时才附加——当你希望原生回复主要用于歧义较大的突发聊天，而不是每一次单消息轮次时，这会很有用

    消息 ID 会在上下文/历史中展示，以便代理可以定位特定消息。

  </Accordion>

  <Accordion title="链接预览">
    Discord 默认会为 URL 生成丰富的链接嵌入内容。OpenClaw 默认会在发出的 Discord 消息中抑制这些自动生成的嵌入，因此代理发送的 URL 会保持为普通链接，除非你显式启用：

```json5
{
  channels: {
    discord: {
      suppressEmbeds: false,
    },
  },
}
```

    将 `channels.discord.accounts.<id>.suppressEmbeds` 设为可以覆盖单个账户。代理消息工具发送时也可以为单条消息传入 `suppressEmbeds: false`。显式的 Discord `embeds` 载荷不会被默认链接预览设置所抑制。

  </Accordion>

  <Accordion title="实时流式预览">
    OpenClaw 可以通过发送一条临时消息并在文本到达时编辑它来流式输出草稿回复。`channels.discord.streaming.mode` 取值为 `off` | `partial` | `block` | `progress`（当未设置 `streaming`/旧版 `streamMode` 键时的默认值）。`streamMode` 是旧版别名；运行 `openclaw doctor --fix` 可将持久化配置重写为规范的嵌套 `streaming` 结构。

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          maxLines: 8,
          maxLineChars: 120,
          toolProgress: false,
          commentary: false,
        },
      },
    },
  },
}
```

    - `off` 会禁用 Discord 预览编辑。
    - `partial` 会在 token 到达时编辑一条预览消息。
    - `block` 会发出草稿大小的分块；可使用 `streaming.preview.chunk`（`minChars`、`maxChars`、`breakPreference`）来调节块大小和断点，并受 `textChunkLimit` 限制。显式启用 block 流式传输时，OpenClaw 会跳过预览流以避免双重流式输出。
    - `progress` 会保留一条可编辑的状态草稿，直到最终发送。默认情况下，它只显示代理最近前言或叙述的一行，不包含生成的标签、间隔或工具行。
    - 媒体、错误以及显式回复的最终消息会取消挂起的预览编辑。
    - `streaming.preview.toolProgress` 在 `partial`/`block` 模式下默认是 `true`。Discord progress 模式默认不显示工具行；可设置 `streaming.progress.toolProgress: true` 以启用。
    - 设置 `streaming.progress.toolProgress: true` 可添加简洁的工具/进度行，例如 `🛠️ Bash: run tests` 或 `🔎 Web Search: for "query"`。为兼容起见，现有的 `progress.label` 或 `progress.labels` 配置会保留先前的工具行默认行为；若想要自定义标签但不显示工具行，请将 `toolProgress` 设为 `false`。
    - `streaming.progress.commentary`（默认 `false`）会启用在临时进度草稿中显示原始助手评论。默认的前言/叙述状态行不受此选项影响。评论在显示前会被清理，保持临时性，并且不会改变最终答案的发送。
    - `streaming.progress.maxLineChars` 控制每行进度预览的预算。散文会在词边界处截断；命令和路径细节会保留有用的后缀。
    - `streaming.preview.commandText` / `streaming.progress.commandText` 控制紧凑进度行中的命令/执行细节：`raw`（默认）或 `status`（仅工具标签）。

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

    预览流式传输仅支持文本；媒体回复会回退到正常发送。

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

    - Discord 线程会作为频道会话路由，并继承父频道配置，除非被覆盖。
    - 线程会话会继承父频道的会话级 `/model` 选择，作为仅模型的回退；线程本地的 `/model` 选择优先，且除非启用了转录继承，否则不会复制父转录历史。
    - `channels.discord.thread.inheritParent`（默认 `false`）会让新自动线程从父转录中进行种子初始化。按账户覆盖：`channels.discord.accounts.<id>.thread.inheritParent`。
    - 消息工具反应可以解析 `user:<id>` DM 目标。
    - `guilds.<guild>.channels.<channel>.requireMention: false` 会在回复阶段激活回退时保留。

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
      spawnSessions: true,
      defaultSpawnContext: "fork",
    },
  },
}
```

    说明：

    - `session.threadBindings.*` 是 Discord 和 Telegram 的规范策略。
    - `spawnSessions` 控制为 `sessions_spawn({ thread: true })` 和 ACP 线程创建/绑定自动生成线程。默认值：`true`。
    - `defaultSpawnContext` 控制线程绑定生成的原生子代理上下文。默认值：`"fork"`。
    - 已弃用的 `spawnSubagentSessions`/`spawnAcpSessions` 键会由 `openclaw doctor --fix` 迁移。
    - 如果线程绑定被禁用，`/focus` 和相关操作将不可用。

    参见 [Sub-agents](/tools/subagents)、[ACP Agents](/tools/acp-agents) 和 [Configuration Reference](/gateway/configuration-reference)。

  </Accordion>

  <Accordion title="源消息上的子代理进度">
    将 `channels.discord.subagentProgress: true` 设为在启动父运行的 Discord 消息上显示后台子活动。

```json5
{
  channels: {
    discord: {
      subagentProgress: true,
    },
  },
}
```

    在子运行活跃期间，OpenClaw 会让 Discord 正在输入状态最多持续一小时，并在并发数量变化时替换一个计数反应（`1️⃣` 到 `🔟`）；`🔟` 也表示 10 或更多。最终子任务结束后会移除计数反应。失败、超时或被终止的子任务会留下 `🔴` 反应。

    这是可选启用功能，并使用固定的内部计时和表情默认值。机器人需要 **添加反应** 权限才能提供反应反馈。账户级 `channels.discord.accounts.<id>.subagentProgress` 会覆盖顶层值。

  </Accordion>

  <Accordion title="持久化 ACP 频道绑定">
    对于稳定的“始终在线” ACP 工作区，请配置顶层的类型化 ACP 绑定，以目标为 Discord 对话。

    配置路径：`bindings[]`，其中 `type: "acp"` 且 `match.channel: "discord"`。

```json5
{
  agents: {
    entries: {
      codex: {
        default: true,
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
    },
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

  <Accordion title="反应通知">
    每个 guild 的反应通知模式（`guilds.<id>.reactionNotifications`）：

    - `off`
    - `own`（默认）
    - `all`
    - `allowlist`（使用 `guilds.<id>.users`）

    反应事件会被转换为系统事件并附加到路由到的 Discord 会话中。

  </Accordion>

  <Accordion title="在线状态事件">
    当某个人类成员从离线切换到在线时，可将某个 guild 纳入路由后的代理唤醒：

    ```json5
    {
      channels: {
        discord: {
          intents: { presence: true },
          guilds: {
            "111111111111111111": {
              presenceEvents: {
                channelId: "222222222222222222",
                users: ["333333333333333333"], // 可选；进一步缩小可见该频道的用户范围
                reconnectSuppressSeconds: 300, // 可选；新会话静默窗口（0 表示禁用）
                burstLimit: 8, // 可选；每个突发窗口内的最大事件数
                burstWindowSeconds: 60, // 可选；滑动突发检测窗口
              },
            },
          },
        },
      },
    }
    ```

    `presenceEvents` 需要为路由代理启用心跳，并且在 Discord Developer Portal 的应用 Bot 页面上启用特权 **Presence Intent**。OpenClaw 会从每个完整的 `GUILD_CREATE` 快照中初始化当前在线成员，路由观察到的离线到在线切换，并且也会将之后首次出现的、此前未见过成员的在线信号视为新可用。该成员可能是在快照之后上线或加入的，因此该事件并不声明精确的先前状态。只有能够查看 `channelId` 的人类才有资格：频道和公开线程需要在该频道或父频道上具备 **查看频道** 权限，而私有线程还需要成员资格或 **管理线程** 权限。`users` 可以进一步缩小该受众范围。OpenClaw 会忽略机器人和未变化的在线状态，并在 Gateway 重启之间为每个用户保留 8 小时冷却时间。当 Discord 建立新的 Gateway 会话并发送 `READY` 时，OpenClaw 会在 `reconnectSuppressSeconds`（默认 300，`0` 表示禁用）期间抑制基于在线状态的事件，同时重建 guild 在线状态，因此重新观察到的成员不会逐个唤醒代理。此外，它还会对每个 guild 成功入队的事件按 `burstLimit`（默认 8）和 `burstWindowSeconds`（默认 60）的滑动窗口进行限流，并且每个 guild 的抑制情况只记录一次。恢复的会话不被视为新会话。Discord 会限制超过 75,000 名成员的 guild 快照；在这种情况下，OpenClaw 需要一个显式的离线更新后才能打招呼。系统事件携带不可变的用户、guild 和频道 ID，而不会嵌入可变的显示名称。代理自行决定是否以及如何打招呼。

  </Accordion>

  <Accordion title="确认反应">
    `ackReaction` 会在 OpenClaw 处理传入消息时发送一个确认表情。

    解析顺序：

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - 代理身份表情回退（`agents.entries.*.identity.emoji`，否则为 "👀"）

    说明：

    - Discord 接受 Unicode 表情或自定义表情名称。
    - 使用 `""` 可为频道或账户禁用该反应。

    **范围（`messages.ackReactionScope`）：**

    取值：`"all"`（DM + 群组，包括环境房间事件）、`"direct"`（仅 DM）、`"group-all"`（除环境房间事件外的所有群组消息，不含 DM）、`"group-mentions"`（机器人被提及的群组；**不含 DM**，默认）、`"off"` / `"none"`（禁用）。

    <Note>
    默认范围（`"group-mentions"`）不会在直接消息或环境房间事件中触发确认反应。若要在传入的 Discord DM 和静默房间事件上获得确认反应，请将 `messages.ackReactionScope` 设为 `"all"`。
    </Note>

  </Accordion>

  <Accordion title="配置写入">
    默认启用由频道发起的配置写入。这会影响 `/config set|unset` 流程（当命令功能启用时）。

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

  <Accordion title="网关代理">
    通过 `channels.discord.proxy` 将 Discord 网关 WebSocket 流量和启动时 REST 查询（应用 ID + 允许列表解析）路由到 HTTP(S) 代理。
    Discord 网关 WebSocket 代理是显式的；WebSocket 连接不会从 Gateway 进程继承环境中的代理变量。配置了 `channels.discord.proxy` 时，启动时 REST 查询会使用此代理。

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

    - 允许列表可以使用 `pk:<memberId>`
    - 只有在 `channels.discord.dangerouslyAllowNameMatching: true` 时，才会按名称/slug 匹配成员显示名
    - 查找会使用原始消息 ID 向 PluralKit API 发起查询
    - 如果查找失败，代理消息会被视为机器人消息并丢弃，除非 `allowBots` 允许其通过

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

    仅状态：

```json5
{
  channels: {
    discord: {
      status: "idle",
    },
  },
}
```

    活动（当设置了 `activity` 时，自定义状态是默认活动类型）：

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

    流媒体：

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
    - 1: Streaming（需要 `activityUrl`；而 `activityUrl` 又要求 `activityType: 1`）
    - 2: Listening
    - 3: Watching
    - 4: Custom（将活动文本作为状态值；表情可选）
    - 5: Competing

    自动状态（运行时健康信号）：

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

    自动状态会将运行时可用性映射为 Discord 状态：healthy => online，degraded 或 unknown => idle，exhausted 或 unavailable => dnd。默认值：`intervalMs` 30000，`minUpdateIntervalMs` 15000（必须小于或等于 `intervalMs`）。可选文本覆盖：

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

    对于诸如 `/diagnostics` 和 `/export-trajectory` 之类敏感的仅所有者组命令，OpenClaw 会私下发送审批提示和最终结果。若发起者所有者拥有 Discord 所有者路由，则优先尝试 Discord DM；否则会回退到 `commands.ownerAllowFrom` 中第一个可用的所有者路由，例如 Telegram。

    当 `target` 为 `channel` 或 `both` 时，审批提示会在频道中可见。只有已解析出的审批者可以使用这些按钮；其他用户会收到一个临时拒绝。审批提示包含命令文本，因此只应在受信任的频道中启用频道投递。如果无法从会话键推导出频道 ID，OpenClaw 会回退为 DM 投递。

    Discord 会渲染其他聊天频道使用的共享审批按钮；原生 Discord 适配器主要增加审批者 DM 路由和频道分发。当这些按钮存在时，它们是主要的审批体验；只有当工具结果表明聊天审批不可用或手动审批是唯一路径时，OpenClaw 才应包含手动 `/approve` 命令。如果 Discord 原生审批运行时未激活，OpenClaw 会保留本地确定性的 `/approve <id> <decision>` 提示可见。如果运行时已激活但无法向任何目标投递原生卡片，OpenClaw 会发送一条同聊回退通知，其中包含待审批事项的精确 `/approve` 命令。

    网关认证和审批解析遵循共享的 Gateway 客户端契约（`plugin:` ID 通过 `plugin.approval.resolve` 解析；其他 ID 通过 `exec.approval.resolve` 解析）。审批默认在 30 分钟后过期。

    参见 [Exec approvals](/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>

我会保持原始 Markdown 结构不变，只翻译可见文本内容；代码块里的代码标识、HTML 标签/属性也会按规则保留。现在直接输出完整中文译文。## 工具与 action gate

Discord 消息动作涵盖消息、频道管理、审核、状态和元数据。

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

- `channels.discord.ui.components.accentColor` 设置 Discord 组件容器使用的强调色（hex）。按账号：`channels.discord.accounts.<id>.ui.components.accentColor`。
- `channels.discord.agentComponents.ttlMs` 控制已发送的 Discord 组件回调保持注册的时长（默认 `1800000`，最大 `86400000`）。按账号：`channels.discord.accounts.<id>.agentComponents.ttlMs`。
- 当存在 components v2 时，`embeds` 会被忽略。
- 默认会抑制普通 URL 预览。当某个出站链接应展开时，请在消息动作中设置 `suppressEmbeds: false`。

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

Discord 有两个不同的语音界面：实时 **语音频道**（连续对话）和 **语音消息附件**（波形预览格式）。gateway 同时支持两者。

### 语音频道

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

在加入前检查机器人有效权限：

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
        model: "openai/gpt-5.6-sol",
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
          model: "gpt-realtime-2.1",
          speakerVoice: "cedar",
        },
      },
    },
  },
}
```

说明：

- 对于仅文本配置，Discord voice 默认是可选启用的；设置 `channels.discord.voice.enabled=true`（或保留现有的 `channels.discord.voice` 块）即可启用 `/vc` 命令、语音运行时以及 `GuildVoiceStates` 网关 intent。`channels.discord.intents.voiceStates` 可以显式覆盖 intent 订阅；若留空，则跟随实际生效的语音启用状态。
- `voice.mode` 控制对话路径。默认值是 `agent-proxy`：一个实时语音前端负责处理轮次时机、中断和播放，通过 `openclaw_agent_consult` 将实质性工作委派给路由后的 OpenClaw agent，并将结果视为来自该说话者的 Discord 文字提示。`stt-tts` 保留旧的批处理 STT + TTS 流程。`bidi` 让实时模型直接对话，同时通过 `openclaw_agent_consult` 暴露 OpenClaw 大脑。
- `voice.agentSession` 控制哪个 OpenClaw 会话接收语音轮次。保持未设置时使用语音频道自身的会话，或者设置 `{ mode: "target", target: "channel:<text-channel-id>" }`，让语音频道充当现有 Discord 文本频道会话（例如 `#maintainers`）的麦克风/扬声器扩展。
- `voice.model` 会覆盖用于 Discord 语音回复和实时咨询的 OpenClaw agent 大脑。若留空，则继承所路由的 agent 模型。它与 `voice.realtime.model` 相互独立。
- `voice.followUsers` 允许机器人跟随选定用户加入、移动和离开 Discord 语音。参见 [跟随语音中的用户](#follow-users-in-voice)。
- `agent-proxy` 通过 `discord-voice` 路由语音，它会为说话者和目标会话保留正常的 owner/tool 授权，但会隐藏 agent 的 `tts` 工具，因为 Discord voice 自己负责播放。默认情况下，`agent-proxy` 会为 owner 说话者的 consult 提供完全等同 owner 的工具访问权限（`voice.realtime.toolPolicy: "owner"`），并强烈倾向于在给出实质性回答前先咨询 OpenClaw agent（`voice.realtime.consultPolicy: "always"`）。在默认的 `always` 模式下，实时层不会在 consult 回答前自动播放填充语音；它会捕获并转写语音，然后播放路由后的 OpenClaw 回答。如果多个强制 consult 回答在 Discord 仍在播放第一个回答时完成，后续的逐字回答会排队，直到播放空闲后再输出，而不是在句中替换语音。
- 在 `stt-tts` 模式下，STT 使用 `tools.media.audio`；`voice.model` 不影响转录。
- 在实时模式下，`voice.realtime.provider`、`voice.realtime.model` 和 `voice.realtime.speakerVoice` 用于配置实时音频会话。对于 OpenAI Realtime 2.1 搭配 Codex brain，可使用 `voice.realtime.model: "gpt-realtime-2.1"` 和 `voice.model: "openai/gpt-5.6-sol"`。
- 默认情况下，实时语音模式会在 realtime provider 指令中包含较小的 `IDENTITY.md`、`USER.md` 和 `SOUL.md` 配置文件，以便快速直接轮次保持与路由后的 OpenClaw agent 相同的身份、用户上下文和人格。将 `voice.realtime.bootstrapContextFiles` 设为其子集可以自定义这一点，或设为 `[]` 以禁用。仅支持这些配置文件；`AGENTS.md` 仍保留在正常的 agent 上下文中。注入的 profile 上下文不会替代 `openclaw_agent_consult` 来处理工作区工作、当前事实、记忆检索或工具驱动操作。
- 在 OpenAI `agent-proxy` 实时模式下，wake-name 门控会默认根据房间情况自适应：一个人时可以自然说话而无需 wake name，两个或更多人时则必须在轮次开头或结尾带上 wake name。其他机器人不计入人数。设置 `voice.realtime.requireWakeName: true` 可始终要求 wake name，或设为 `false` 以从不要求。配置的 wake name 必须是一个或两个词。若 `voice.realtime.wakeNames` 未设置，OpenClaw 会使用所路由 agent 的 `name` 加上 `OpenClaw`，若仍无则回退为 agent id 加上 `OpenClaw`。启用的 wake-name 门控会禁用 realtime provider 自动响应，将被接受的轮次通过 OpenClaw agent consult 路径处理，并在最终转录到达前，当从部分转录中识别出前置 wake name 时发出简短语音确认。该策略会随着实时加入和离开动态变化，无需重新连接语音。
- OpenAI realtime provider 支持当前 Realtime 2 事件名称以及用于输出音频和转录事件的旧版 Codex 兼容别名，因此兼容的 provider 快照可以在不丢失助手音频的情况下发生漂移。
- `voice.realtime.bargeIn` 控制 Discord 说话开始事件是否会中断正在播放的实时语音。若未设置，则遵循 realtime provider 的输入音频中断设置。
- `voice.realtime.minBargeInAudioEndMs` 控制 OpenAI realtime barge-in 截断音频前，助手播放至少持续的最小时长。默认值：`250`。在回声较低的房间中可设为 `0` 以立即中断，或在扬声器回声较重的环境中提高该值。
- `voice.tts` 仅覆盖 `stt-tts` 语音播放的 `tts`；实时模式改用 `voice.realtime.speakerVoice`。若要在 Discord 播放中使用 OpenAI voice，请设置 `voice.tts.provider: "openai"`，并在 `voice.tts.providers.openai.speakerVoice` 下选择一个 Text-to-speech 语音。对于当前 OpenAI TTS 模型，`cedar` 是一个不错的男性音色选择。
- 按频道的 Discord `systemPrompt` 覆盖会应用于该语音频道的语音转录轮次。
- 当 OpenClaw 加入语音频道时，路由后的 agent 会话会收到一个带有当前参与者名单的静默系统事件。之后参与者的加入和离开会更新该会话，但不会触发非请求式的口头回复；Discord 显示名称被视为不可信标签。授权的语音轮次也会接收到新的参与者名单快照。
- 语音转录轮次和 `/vc` 命令使用 `commands.ownerAllowFrom` 中的 Discord 条目来判断 owner 状态。当未配置 Discord 命令 owner 时，所选 Discord 账号的 `allowFrom`（或旧的 `dm.allowFrom`）仍可授权语音访问，但不会授予 owner 状态。Agent 工具可见性遵循所路由会话配置的工具策略。
- 如果 `voice.autoJoin` 中同一个 guild 有多个条目，OpenClaw 会加入该 guild 最后配置的频道。
- `voice.allowedChannels` 是可选的驻留 allowlist。保持未设置可允许 `/vc join` 加入任意已授权的 Discord 语音频道。设置后，`/vc join`、启动时自动加入以及机器人语音状态移动都将限制为列表中的 `{ guildId, channelId }` 条目。将其设为空数组可拒绝所有 Discord 语音加入。如果 Discord 将机器人移动到 allowlist 之外，OpenClaw 会离开该频道，并在可用时重新加入配置的自动加入目标。
- `voice.daveEncryption` 和 `voice.decryptionFailureTolerance` 会透传给 `@discordjs/voice` 的 join 选项；上游默认值为 `daveEncryption=true` 和 `decryptionFailureTolerance=24`。
- OpenClaw 使用捆绑的 `libopus-wasm` 编解码器来接收 Discord 语音并播放实时原始 PCM。它附带固定版本的 libopus WebAssembly 构建，不需要本地 opus addon。
- `voice.connectTimeoutMs` 控制 `/vc join` 和自动加入尝试时 `@discordjs/voice` 的初始 Ready 等待时间。默认值：`30000`。
- `voice.reconnectGraceMs` 控制 OpenClaw 在销毁断开连接的语音会话前，会等待其开始重连的时长。默认值：`15000`。
- 在 `stt-tts` 模式下，语音播放不会因为其他用户开始说话就停止。为了避免反馈回路，OpenClaw 会在 TTS 播放期间忽略新的语音捕获；请在播放结束后再说下一轮。
- 在实时模式下，扬声器通过开放麦克风产生的回声可能看起来像 barge-in 并中断播放。对于回声较重的 Discord 房间，设置 `voice.realtime.providers.openai.interruptResponseOnInputAudio: false` 以防 OpenAI 在输入音频上自动中断。如果你仍希望 Discord 的说话开始事件中断当前播放，再添加 `voice.realtime.bargeIn: true`。OpenAI realtime bridge 会把短于 `voice.realtime.minBargeInAudioEndMs` 的播放截断视为可能的回声/噪声并忽略，而不是清除 Discord 播放。
- `voice.captureSilenceGraceMs` 控制 OpenClaw 在 Discord 报告说话者停止后，等待多久再为 STT 完成该音频片段。默认值：`2000`；如果 Discord 将正常停顿切分成碎片化的部分转录，可适当调高。
- 当 ElevenLabs 是所选的 TTS provider 时，Discord 语音播放会使用流式 TTS，并从 provider 的响应流开始播放。不支持流式的 provider 会回退到合成的临时文件路径。
- OpenClaw 会监视接收解密失败，并在短时间内多次失败后，通过离开/重新加入语音频道进行自动恢复。
- 如果接收日志在更新后持续出现 `DecryptionFailed(UnencryptedWhenPassthroughDisabled)`，请收集依赖报告和日志。捆绑的 `@discordjs/voice` 版本包含 discord.js PR #11449 中的上游 padding 修复，该修复关闭了 discord.js issue #11419。
- 出现 `The operation was aborted` 的接收事件是 OpenClaw 完成某个已捕获的说话者片段时的预期行为；它们是详细诊断信息，不是警告。
- 详细的 Discord 语音日志会为每个被接受的说话者片段提供一个有边界的单行 STT 转录预览，因此调试时可以同时看到用户端和 agent 回复端，而不会倾倒无限制的转录文本。
- 在 `agent-proxy` 模式下，强制 consult 回退会跳过可能不完整的转录片段，例如以 `...` 结尾的文本、以 "and" 之类的尾随连接词结尾的文本，以及明显不可操作的结尾语句如 "be right back" 或 "bye"。当这避免了一个过时的排队回答时，日志会显示 `forced agent consult skipped reason=...`。

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

- `followUsers` 接受原始 Discord 用户 ID 和 `discord:<id>` 值。OpenClaw 在匹配语音状态事件之前会规范化这两种形式。
- 当配置了 `followUsers` 时，`followUsersEnabled` 默认值为 `true`。将其设为 `false` 可保留已保存列表，但停止自动语音跟随。
- `followUsers` 只控制语音驻留。它不会授予发言者权限或所有者权限；请分别配置 `commands.ownerAllowFrom` 以及公会或频道的用户和角色。
- 当被跟随用户加入一个允许的语音频道时，OpenClaw 会加入该频道。当用户移动时，OpenClaw 也会随之移动。当当前被跟随用户断开连接时，OpenClaw 会离开。
- 如果同一公会中有多个被跟随用户，而当前活跃的被跟随用户离开，OpenClaw 会在离开公会前先移动到另一个被跟踪用户所在的频道。如果多个被跟随用户同时移动，则以最新观察到的语音状态事件为准。
- `allowedChannels` 仍然生效。位于不允许频道中的被跟随用户会被忽略，而一个跟随拥有的会话会移动到另一个被跟随用户那里，或者离开。
- OpenClaw 会在启动时以及以受限间隔校正遗漏的语音状态事件。校正会采样已配置的公会，并对每次运行的 REST 查询数量设上限，因此非常大的 `followUsers` 列表可能需要超过一个间隔才能收敛。
- 如果 Discord 或管理员在机器人跟随用户时移动了机器人，OpenClaw 会重建语音会话，并在目标位置允许时保留跟随所有权。如果机器人被移动到 `allowedChannels` 之外，OpenClaw 会离开，并在存在已配置目标时重新加入该目标。
- DAVE 接收恢复在连续解密失败后可能会离开并重新加入同一频道。跟随拥有的会话会在该恢复路径中保留其跟随所有权，因此稍后被跟随用户断开时仍会离开频道。

在加入模式之间选择：

- 对于个人或 operator 设置，如果希望机器人在你进入语音时自动跟随，就使用 `followUsers`。
- 对于固定房间机器人，如果即使没有被跟踪用户在语音中也应始终存在，就使用 `autoJoin`。
- 对于一次性加入，或自动语音存在会让人意外的房间，就使用 `/vc join`。

Discord 语音编解码器：

- 语音接收日志会显示 `discord voice: opus decoder: libopus-wasm`。
- 实时播放会在把数据包交给 `@discordjs/voice` 之前，使用同一个内置的 `libopus-wasm` 包将原始 48 kHz 立体声 PCM 编码为 Opus。
- 文件和 provider 流播放会先用 ffmpeg 转码为原始 48 kHz 立体声 PCM，然后使用 `libopus-wasm` 生成发送到 Discord 的 Opus 数据包流。

STT 加 TTS 流水线：

- Discord PCM 捕获会转换为一个 WAV 临时文件。
- `tools.media.audio` 负责 STT，例如 `openai/gpt-4o-mini-transcribe`。
- 转写会通过 Discord ingress 和 routing 发送，而响应 LLM 会使用一个语音输出策略：隐藏 agent 的 `tts` 工具并要求返回文本，因为 Discord 语音负责最终的 TTS 播放。
- `voice.model` 在设置时，只会覆盖此语音频道轮次的响应 LLM。
- `voice.tts` 会覆盖合并到 `tts` 之上；支持流式的 provider 会直接把音频送给播放器，否则生成的音频文件会在已加入的频道中播放。

默认 agent-proxy 语音频道会话示例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        model: "openai/gpt-5.6-sol",
        followUsersEnabled: true,
        followUsers: ["123456789012345678"],
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2.1",
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
        model: "openai/gpt-5.6-sol",
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2.1",
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
        model: "openai/gpt-5.6-sol",
        agentSession: {
          mode: "target",
          target: "channel:123456789012345678",
        },
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2.1",
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
        model: "openai/gpt-5.6-sol",
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2.1",
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

凭据按组件分别解析：`voice.model` 使用 LLM 路由认证，`tools.media.audio` 使用 STT 认证，`tts`/`voice.tts` 使用 TTS 认证，而 `voice.realtime.providers` 或 provider 的常规认证配置则用于 realtime provider 认证。

### 语音消息

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

    - 验证 `groupPolicy`
    - 验证 `channels.discord.guilds` 下的 guild allowlist
    - 如果存在某个 guild 的 `channels` map，则只允许列表中的 channels
    - 验证 `requireMention` 行为和 mention 模式

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
    - `requireMention` 配置在错误的位置（必须位于 `channels.discord.guilds` 下，或某个 channel 条目中）
    - sender 被 guild/channel `users` allowlist 阻止

  </Accordion>

  <Accordion title="Discord 长时间运行的轮次或重复回复">

    典型日志：

    - `Slow listener detected ...`
    - `stuck session: sessionKey=agent:...:discord:... state=processing ...`

    Discord does not apply a channel-owned timeout to queued agent turns. Message listeners hand off immediately, and queued Discord runs preserve per-session ordering until the session/tool/runtime lifecycle completes or aborts the work.

  </Accordion>

  <Accordion title="Gateway 元数据查询超时警告">
    OpenClaw 在连接前会获取 Discord 的 `/gateway/bot` 元数据。临时性失败会回退到 Discord 的默认 gateway URL，并在日志中限流。

    The metadata timeout defaults to 30 seconds. `OPENCLAW_DISCORD_GATEWAY_INFO_TIMEOUT_MS` can override it for unusual host environments.

  </Accordion>

  <Accordion title="Gateway READY 超时重启">
    OpenClaw 在启动期间以及运行时重连后，会等待 Discord gateway 的 `READY` 事件。带有启动错峰的多账号设置，可能需要比默认值更长的启动 READY 窗口。

    Startup waits 15 seconds and runtime reconnects wait 30 seconds. `OPENCLAW_DISCORD_READY_TIMEOUT_MS` and `OPENCLAW_DISCORD_RUNTIME_READY_TIMEOUT_MS` remain available for unusual host environments.

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
          // Alpha 仅在其他 bot mention 它时监听。
          allowBots: "mentions",
        },
        bravo: {
          // Bravo 监听所有由 bot 发出的 Discord 消息。
          allowBots: true,
          mentionAliases: {
            // 让 Bravo 使用配置的 user id 写出 Alpha 的 Discord mention。
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

主要参考：[配置参考 - Discord](/gateway/config-channels#discord)。

<Accordion title="高信号 Discord 字段">

- startup/auth: `enabled`, `token`, `applicationId`, `accounts.*`, `allowBots`
- policy: `groupPolicy`, `dmPolicy`, `allowFrom`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- command: `commands.native`, `commands.useAccessGroups` (global), `configWrites`, `slashCommand.ephemeral`
- gateway: `proxy`
- reply/history: `replyToMode`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- delivery: `textChunkLimit` (default `2000`), `maxLinesPerMessage` (default `17`)
- streaming: `streaming.mode`, `streaming.chunkMode`, `streaming.preview.*`, `streaming.progress.*`, `streaming.block.*` (legacy flat `streamMode`, `draftChunk`, `blockStreaming`, `blockStreamingCoalesce`, `chunkMode` keys are migrated into `streaming.*` by `openclaw doctor --fix`)
- media: `mediaMaxMb` (caps outbound Discord uploads, default `100`)
- actions: `actions.*`
- presence: `activity`, `status`, `activityType`, `activityUrl`, `autoPresence.*`
- UI: `ui.components.accentColor`
- features: `threadBindings`, top-level `bindings[]` (`type: "acp"`), `pluralkit`, `execApprovals`, `intents`, `agentComponents.enabled`, `agentComponents.ttlMs`, `activities`, `heartbeat`, `responsePrefix`

</Accordion>

### Discord Activities

将 `channels.discord.activities` 设置为允许代理发布可在 Discord 内打开的独立 HTML 小组件。该区块为可选启用；若不存在，OpenClaw 不会注册任何 Activity 路由、工具或交互处理器。有关开发者门户、隧道、安全性和故障排查设置，请参见 [Discord Activities](/channels/discord-activities)。

- `activities.clientSecret`：Discord 应用的 OAuth2 客户端密钥；若未设置，则回退为 `DISCORD_CLIENT_SECRET`
- `activities.applicationId`：可选的 Activity 应用 ID；默认使用网关启动时获取到的机器人应用 ID

## 安全与运维

- 将机器人令牌视为机密（在受监督的环境中优先使用 `DISCORD_BOT_TOKEN`）。
- 授予最低权限的 Discord 权限。
- 如果命令部署/状态过期，请重启网关，并使用 `openclaw channels status --probe` 重新检查。

## 相关

<CardGroup cols={2}>
  <Card title="Discord Activities" icon="window" href="/channels/discord-activities">
    在 Discord 内启动交互式 HTML 小部件。
  </Card>
  <Card title="Pairing" icon="link" href="/channels/pairing">
    将 Discord 用户与网关配对。
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