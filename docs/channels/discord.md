---
summary: "支持状态、能力和配置的 Discord 机器人"
read_when:
  - 正在处理 Discord 渠道功能
title: "Discord"
---

可通过官方 Discord 网关用于私信和服务器频道。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/channels/pairing">
    Discord 私信默认使用配对模式。
  </Card>
  <Card title="斜杠命令" icon="terminal" href="/tools/slash-commands">
    原生命令行为和命令目录。
  </Card>
  <Card title="频道故障排除" icon="wrench" href="/channels/troubleshooting">
    跨频道诊断和修复流程。
  </Card>
</CardGroup>

## 快速设置

你需要创建一个带有 bot 的新应用，将 bot 添加到你的服务器，并将其配对到 OpenClaw。我们建议将 bot 添加到你自己的私人服务器。如果你还没有服务器，先[创建一个](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server)（选择 **Create My Own > For me and my friends**）。

<Steps>
  <Step title="创建 Discord 应用和 bot">
    前往 [Discord Developer Portal](https://discord.com/developers/applications)，点击 **New Application**。将其命名为类似 "OpenClaw" 的名称。

    点击侧边栏中的 **Bot**。将 **Username** 设置为你给 OpenClaw 代理起的名称。

  </Step>

  <Step title="启用特权 intents">
    仍在 **Bot** 页面，向下滚动到 **Privileged Gateway Intents** 并启用：

    - **Message Content Intent**（必需）
    - **Server Members Intent**（推荐；角色白名单和名称到 ID 匹配所必需）
    - **Presence Intent**（可选；仅在需要 presence 更新时使用）

  </Step>

  <Step title="复制你的 bot token">
    返回 **Bot** 页面顶部并点击 **Reset Token**。

    <Note>
    尽管名字如此，这会生成你的第一个 token —— 并没有发生任何“重置”。
    </Note>

    复制该 token 并保存到某处。这就是你的 **Bot Token**，你很快就会用到它。

  </Step>

  <Step title="生成邀请 URL 并将 bot 添加到你的服务器">
    点击侧边栏中的 **OAuth2**。你将生成一个具有正确权限的邀请 URL，以便将 bot 添加到你的服务器。

    向下滚动到 **OAuth2 URL Generator** 并启用：

    - `bot`
    - `applications.commands`

    下方会出现 **Bot Permissions** 部分。至少启用：

    **General Permissions**
      - 查看频道
    **Text Permissions**
      - 发送消息
      - 读取消息历史
      - 嵌入链接
      - 附加文件
      - 添加表情反应（可选）

    这是普通文本频道的基础权限集合。如果你计划在 Discord 线程中发帖，包括会创建或继续线程的论坛或媒体频道工作流，也请启用 **在线程中发送消息**。
    复制底部生成的 URL，将其粘贴到浏览器中，选择你的服务器，然后点击 **Continue** 进行连接。现在你应该可以在 Discord 服务器中看到你的 bot 了。

  </Step>

  <Step title="启用开发者模式并收集你的 ID">
    回到 Discord 应用中，你需要启用开发者模式，以便复制内部 ID。

    1. 点击 **User Settings**（头像旁的齿轮图标）→ **Advanced** → 打开 **Developer Mode**
    2. 右键单击侧边栏中的 **server icon** → **Copy Server ID**
    3. 右键单击你自己的 **avatar** → **Copy User ID**

    将你的 **Server ID** 和 **User ID** 与 Bot Token 一起保存——下一步你会把这三者都发送给 OpenClaw。

  </Step>

  <Step title="允许来自服务器成员的私信">
    为了让配对生效，Discord 需要允许你的 bot 向你发送私信。右键单击你的 **server icon** → **Privacy Settings** → 打开 **Direct Messages**。

    这允许服务器成员（包括 bot）向你发送私信。如果你希望使用 Discord 私信与 OpenClaw 交互，请保持启用此项。如果你只打算使用服务器频道，可以在配对后禁用私信。

  </Step>

  <Step title="安全设置你的 bot token（不要在聊天中发送）">
    你的 Discord bot token 是机密信息（类似密码）。在向你的代理发送消息之前，请将它设置到运行 OpenClaw 的机器上。

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

    如果 OpenClaw 已作为后台服务运行，请通过 OpenClaw Mac 应用重启它，或停止并重新启动 `openclaw gateway run` 进程。
    对于托管服务安装，请在包含 `DISCORD_BOT_TOKEN` 的 shell 中运行 `openclaw gateway install`，或将该变量存储在 `~/.openclaw/.env` 中，这样服务在重启后就能解析该 env SecretRef。
    如果你的主机因 Discord 启动时的应用查询而被阻止或限流，请从 Developer Portal 设置 Discord application/client ID，以便启动时跳过该 REST 调用。默认账户使用 `channels.discord.applicationId`，当你运行多个 Discord bot 时，则使用 `channels.discord.accounts.<accountId>.applicationId`。

  </Step>

  <Step title="配置 OpenClaw 并完成配对">

    <Tabs>
      <Tab title="向你的代理询问">
        在任何现有频道（例如 Telegram）中与 OpenClaw 代理聊天并告诉它。如果 Discord 是你的第一个频道，请改用 CLI / config 选项卡。

        > "我已经在 config 中设置好了我的 Discord bot token。请使用 User ID `<user_id>` 和 Server ID `<server_id>` 完成 Discord 设置。"
      </Tab>
      <Tab title="CLI / config">
        如果你更喜欢基于文件的配置，请设置：

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

        默认账户的 env 回退：

```bash
DISCORD_BOT_TOKEN=...
```

        用于脚本化或远程设置时，请写入相同的 JSON5 块，并先运行 `openclaw config patch --file ./discord.patch.json5 --dry-run`，然后再去掉 `--dry-run` 重新运行。支持明文 `token` 值。`channels.discord.token` 也支持跨 env/file/exec 提供方的 SecretRef 值。参见 [Secrets Management](/gateway/secrets)。

        对于多个 Discord bot，请将每个 bot token 和 application ID 保留在各自的 account 下。顶层的 `channels.discord.applicationId` 会被 accounts 继承，因此只有在所有 account 都应使用同一个 application ID 时才在这里设置。

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
    等待网关运行，然后在 Discord 中向你的 bot 发送私信。它会返回一个配对码。

    <Tabs>
      <Tab title="向你的代理询问">
        在你现有频道中将配对码发送给你的代理：

        > "批准这个 Discord 配对码：`<CODE>`"
      </Tab>
      <Tab title="CLI">

```bash
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```

      </Tab>
    </Tabs>

    配对码在 1 小时后过期。

    现在你应该可以通过 DM 在 Discord 中与代理聊天了。

  </Step>
</Steps>

<Note>
令牌解析会感知账户。配置中的 token 值优先于 env 回退。`DISCORD_BOT_TOKEN` 仅用于默认账户。
如果两个已启用的 Discord 账户解析到同一个 bot token，OpenClaw 只会为该 token 启动一个网关监视器。来自配置的 token 优先于默认 env 回退；否则，首先启用的账户获胜，重复账户会被报告为已禁用。
对于高级出站调用（消息工具/频道操作），该调用会使用显式的每次调用 `token`。这适用于发送和读取/探测类操作（例如 read/search/fetch/thread/pins/permissions）。账户策略/重试设置仍来自活动运行时快照中选定的账户。
</Note>

## 推荐：设置服务器工作区

一旦 DM 正常工作，你就可以将 Discord 服务器设置为一个完整的工作区，让每个频道都有自己的代理会话和独立上下文。这对于只有你和 bot 的私人服务器来说很适合。

<Steps>
  <Step title="将你的服务器加入服务器白名单">
    这使你的代理能够在服务器上的任何频道中响应，而不仅仅是 DM。

    <Tabs>
      <Tab title="向你的代理询问">
        > "将我的 Discord Server ID `<server_id>` 添加到服务器白名单"
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

  <Step title="允许在没有 @mention 的情况下响应">
    默认情况下，你的代理只会在服务器频道中被 @mention 时才响应。对于私人服务器，你可能希望它响应每条消息。

    在服务器频道中，普通助手的最终回复默认保持私有。可见的 Discord 输出必须通过 `message` 工具显式发送，这样代理就可以默认潜伏，只有在它认为频道回复有用时才发帖。

    这意味着所选模型必须可靠地调用工具。如果 Discord 显示正在输入，但日志显示有 token 使用却没有发布消息，请检查会话日志中是否有 `didSendViaMessagingTool: false` 的助手文本。这意味着模型生成了私有最终答案，而不是调用 `message(action=send)`。请切换到更强的工具调用模型，或使用下面的配置恢复旧版自动最终回复。

    <Tabs>
      <Tab title="向你的代理询问">
        > "允许我的代理在这个服务器上响应，而不必被 @mention"
      </Tab>
      <Tab title="配置">
        在你的服务器配置中将 `requireMention: false`：

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

        要恢复群组/频道房间的旧版自动最终回复，请将 `messages.groupChat.visibleReplies` 设置为 `"automatic"`。

      </Tab>
    </Tabs>

  </Step>

  <Step title="规划服务器频道中的记忆">
    默认情况下，长期记忆（MEMORY.md）只会加载到 DM 会话中。服务器频道不会自动加载 MEMORY.md。

    <Tabs>
      <Tab title="向你的代理询问">
        > "当我在 Discord 频道中提问时，如果你需要来自 MEMORY.md 的长期上下文，请使用 memory_search 或 memory_get。"
      </Tab>
      <Tab title="手动">
        如果你需要每个频道都共享上下文，请将稳定的说明放入 `AGENTS.md` 或 `USER.md`（它们会在每次会话中注入）。将长期笔记保存在 `MEMORY.md` 中，并按需使用记忆工具访问它们。
      </Tab>
    </Tabs>

  </Step>
</Steps>

现在在你的 Discord 服务器上创建一些频道并开始聊天。你的代理可以看到频道名称，并且每个频道都有自己独立的会话——因此你可以设置 `#coding`、`#home`、`#research`，或者任何适合你工作流的频道。

## 运行时模型

- Gateway 负责 Discord 连接。
- 回复路由是确定性的：Discord 的入站回复会回到 Discord。
- Discord 服务器/频道元数据会作为不受信任的上下文添加到模型提示中，而不是作为对用户可见的回复前缀。如果模型将该封装复制回去，OpenClaw 会从出站回复以及未来的回放上下文中剥离复制的元数据。
- 默认情况下（`session.dmScope=main`），直接聊天共享代理主会话（`agent:main:main`）。
- 服务器频道是隔离的会话键（`agent:<agentId>:discord:channel:<channelId>`）。
- 群组 DM 默认被忽略（`channels.discord.dm.groupEnabled=false`）。
- 原生斜杠命令在隔离的命令会话中运行（`agent:<agentId>:discord:slash:<userId>`），同时仍携带指向路由会话的 `CommandTargetSessionKey`。
- 仅文本的 cron/heartbeat 宣告发往 Discord 时，会使用最终的、用户可见的助手答案一次。媒体和结构化组件载荷在代理发出多个可交付载荷时仍保持多消息。

## 论坛频道

Discord 论坛和媒体频道只接受线程帖子。OpenClaw 支持两种创建方式：

- 向论坛父频道发送消息（`channel:<forumId>`）以自动创建线程。线程标题使用消息中第一个非空行。
- 使用 `openclaw message thread create` 直接创建线程。对于论坛频道，不要传递 `--message-id`。

示例：发送到论坛父频道以创建线程

```bash
openclaw message send --channel discord --target channel:<forumId> \
  --message "Topic title\nBody of the post"
```

示例：显式创建论坛线程

```bash
openclaw message thread create --channel discord --target channel:<forumId> \
  --thread-name "Topic title" --message "Body of the post"
```

论坛父频道不接受 Discord 组件。如果你需要组件，请发送到线程本身（`channel:<threadId>`）。

## 交互式组件

OpenClaw 支持用于代理消息的 Discord components v2 容器。使用带有 `components` 负载的 message 工具。交互结果会作为正常的入站消息路由回代理，并遵循现有的 Discord `replyToMode` 设置。

支持的块：

- `text`、`section`、`separator`、`actions`、`media-gallery`、`file`
- 操作行最多允许 5 个按钮或一个单选菜单
- 选择类型：`string`、`user`、`role`、`mentionable`、`channel`

默认情况下，组件仅可使用一次。将 `components.reusable=true` 可允许按钮、选择器和表单在过期前多次使用。

要限制谁可以点击按钮，请在该按钮上设置 `allowedUsers`（Discord 用户 ID、标签或 `*`）。配置后，不匹配的用户会收到一条临时拒绝提示。

The `/model` and `/models` slash commands open an interactive model picker with provider, model, and compatible runtime dropdowns plus a Submit step. `/models add` is deprecated and now returns a deprecation message instead of registering models from chat. The picker reply is ephemeral and only the invoking user can use it. Discord select menus are limited to 25 options, so add `provider/*` entries to `agents.defaults.models` when you want the picker to show dynamically discovered models only for selected providers such as `openai-codex` or `vllm`.

文件附件：

- `file` 块必须指向附件引用（`attachment://<filename>`）
- 通过 `media`/`path`/`filePath` 提供附件（单文件）；多个文件请使用 `media-gallery`
- 当上传名称应与附件引用匹配时，使用 `filename` 覆盖上传名称

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
    text: "Choose a path",
    blocks: [
      {
        type: "actions",
        buttons: [
          {
            label: "Approve",
            style: "success",
            allowedUsers: ["123456789012345678"],
          },
          { label: "Decline", style: "danger" },
        ],
      },
      {
        type: "actions",
        select: {
          type: "string",
          placeholder: "Pick an option",
          options: [
            { label: "Option A", value: "a" },
            { label: "Option B", value: "b" },
          ],
        },
      },
    ],
    modal: {
      title: "Details",
      triggerLabel: "Open form",
      fields: [
        { type: "text", label: "Requester" },
        {
          type: "select",
          label: "Priority",
          options: [
            { label: "Low", value: "low" },
            { label: "High", value: "high" },
          ],
        },
      ],
    },
  },
}
```

## 访问控制与路由

<Tabs>
  <Tab title="DM policy">
    `channels.discord.dmPolicy` 控制 DM 访问。`channels.discord.allowFrom` 是标准的 DM 白名单。

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `channels.discord.allowFrom` 包含 `"*"`）
    - `disabled`

    如果 DM policy 不是 open，未知用户会被阻止（或在 `pairing` 模式下提示配对）。

    多账号优先级：

    - `channels.discord.accounts.default.allowFrom` 仅适用于 `default` 账号。
    - 对于单个账号，`allowFrom` 优先于旧版 `dm.allowFrom`。
    - 当命名账号自身的 `allowFrom` 和旧版 `dm.allowFrom` 都未设置时，会继承 `channels.discord.allowFrom`。
    - 命名账号不会继承 `channels.discord.accounts.default.allowFrom`。

    为兼容性考虑，旧版 `channels.discord.dm.policy` 和 `channels.discord.dm.allowFrom` 仍会被读取。`openclaw doctor --fix` 会在不改变访问权限的情况下尽可能将它们迁移到 `dmPolicy` 和 `allowFrom`。

    DM 目标的交付格式：

    - `user:<id>`
    - `<@id>` 提及

    纯数字 ID 通常会在启用频道默认值时解析为频道 ID，但列在账号有效 DM `allowFrom` 中的 ID 为兼容性会被视为用户 DM 目标。

  </Tab>

  <Tab title="Access groups">
    Discord DMs 和文本命令授权可以在 `channels.discord.allowFrom` 中使用动态 `accessGroup:<name>` 条目。

    访问组名称在消息频道之间共享。使用 `type: "message.senders"` 可定义一个静态组，其成员使用每个频道的常规 `allowFrom` 语法表达；或在 Discord 频道当前的 `ViewChannel` 受众应动态定义成员资格时使用 `type: "discord.channelAudience"`。共享访问组行为的文档见：[访问组](/channels/access-groups)。

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

    Discord 文本频道没有独立的成员列表。`type: "discord.channelAudience"` 将成员资格建模为：DM 发送者是已配置公会的成员，并且在应用角色与频道覆盖后，当前对所配置频道拥有有效的 `ViewChannel` 权限。

    示例：允许任何能看到 `#maintainers` 的人向机器人发送 DM，同时对其他所有人关闭 DM。

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

    查找会在失败时关闭。如果 Discord 返回 `Missing Access`、成员查找失败，或者频道属于不同的公会，则会将该 DM 发送者视为未授权。

    当使用频道受众访问组时，请在 Discord Developer Portal 中为机器人启用 **Server Members Intent**。DM 不包含公会成员状态，因此 OpenClaw 会在授权时通过 Discord REST 解析成员。

  </Tab>

  <Tab title="Guild policy">
    服务器处理由 `channels.discord.groupPolicy` 控制：

    - `open`
    - `allowlist`
    - `disabled`

    当 `channels.discord` 存在时，安全基线是 `allowlist`。

    `allowlist` 行为：

    - 服务器必须匹配 `channels.discord.guilds`（优先使用 `id`，也接受 slug）
    - 可选发送者白名单：`users`（建议使用稳定 ID）和 `roles`（仅限角色 ID）；如果配置了任一项，当发送者匹配 `users` OR `roles` 时即允许
    - 默认禁用直接按名称/标签匹配；仅在紧急兼容模式下启用 `channels.discord.dangerouslyAllowNameMatching: true`
    - `users` 支持名称/标签，但 ID 更安全；`openclaw security audit` 会在使用名称/标签条目时发出警告
    - 如果某个服务器配置了 `channels`，未列出的频道会被拒绝
    - 如果某个服务器没有 `channels` 块，则该 allowlist 服务器中的所有频道都被允许

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
            general: { allow: true },
            help: { allow: true, requireMention: true },
          },
        },
      },
    },
  },
}
```

    如果你只设置了 `DISCORD_BOT_TOKEN` 而没有创建 `channels.discord` 块，运行时回退将是 `groupPolicy="allowlist"`（日志中会有警告），即使 `channels.defaults.groupPolicy` 是 `open` 也是如此。

  </Tab>

  <Tab title="Mentions and group DMs">
    服务器消息默认按提及进行门控。

    提及检测包括：

    - 显式机器人提及
    - 配置的提及模式（`agents.list[].groupChat.mentionPatterns`，回退到 `messages.groupChat.mentionPatterns`）
    - 在受支持情况下隐式回复机器人行为

    在编写发出的 Discord 消息时，请使用规范提及语法：用户使用 `<@USER_ID>`，频道使用 `<#CHANNEL_ID>`，角色使用 `<@&ROLE_ID>`。不要使用旧版 `<@!USER_ID>` 昵称提及形式。

    `requireMention` 按公会/频道配置（`channels.discord.guilds...`）。
    `ignoreOtherMentions` 可选地丢弃那些提及了其他用户/角色但没有提及机器人的消息（`@everyone/@here` 除外）。

    群组 DM：

    - 默认：忽略（`dm.groupEnabled=false`）
    - 可选白名单：通过 `dm.groupChannels`（频道 ID 或 slug）

  </Tab>
</Tabs>

### 基于角色的代理路由

使用 `bindings[].match.roles` 可通过 Discord 服务器成员的角色 ID 将其路由到不同代理。基于角色的绑定仅接受角色 ID，并在 peer 或 parent-peer 绑定之后、服务器专属绑定之前进行评估。如果某个绑定还设置了其他匹配字段（例如 `peer` + `guildId` + `roles`），则所有已配置字段都必须匹配。

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

## 原生命令与命令授权

- `commands.native` 默认为 `"auto"`，并对 Discord 启用。
- 按频道覆盖：`channels.discord.commands.native`。
- `commands.native=false` 会在启动期间跳过 Discord slash 命令注册和清理。先前注册的命令可能仍会在 Discord 中可见，直到你将它们从 Discord 应用中移除。
- 原生命令授权使用与普通消息处理相同的 Discord allowlist/策略。
- 对于未授权用户，命令仍可能在 Discord UI 中可见；执行时仍会强制 OpenClaw 授权并返回 "not authorized"。

命令目录和行为请参见 [Slash commands](/tools/slash-commands)。

默认斜杠命令设置：

- `ephemeral: true`

## 功能细节

<AccordionGroup>
  <Accordion title="Reply tags and native replies">
    Discord 支持代理输出中的回复标签：

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    由 `channels.discord.replyToMode` 控制：

    - `off`（默认）
    - `first`
    - `all`
    - `batched`

    注意：`off` 会禁用隐式回复线程化。显式的 `[[reply_to_*]]` 标签仍会被保留。
    `first` 总是将隐式原生回复引用附加到该轮中的第一条发出的 Discord 消息。
    `batched` 只有在入站回合是由多条消息去抖后的批次时，才附加 Discord 的隐式原生回复引用。这在你主要想为含糊的爆发式聊天保留原生回复，而不是每个单消息回合都保留时很有用。

    消息 ID 会在上下文/历史中暴露，以便代理可以针对特定消息。

  </Accordion>

  <Accordion title="Live stream preview">
    OpenClaw 可以通过发送临时消息并在文本到达时编辑它来流式传输草稿回复。`channels.discord.streaming` 取值为 `off` | `partial` | `block` | `progress`（默认）。`progress` 会保留一条可编辑的状态草稿，并在工具进度更新时刷新，直到最终交付；共享的起始标签是一条滚动行，因此在内容足够多后它会像其他内容一样滚出视野。`streamMode` 是旧版运行时别名。运行 `openclaw doctor --fix` 可将持久化配置重写为规范键。

    将 `channels.discord.streaming.mode` 设为 `off` 可禁用 Discord 预览编辑。如果显式启用了 Discord block 流式传输，OpenClaw 会跳过预览流，以避免双重流式输出。

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          label: "auto",
          maxLines: 8,
          toolProgress: true,
        },
      },
    },
  },
}
```

    - `partial` 在 token 到达时编辑单条预览消息。
    - `block` 发送草稿大小的分块（使用 `draftChunk` 调整大小和断点，并会被限制到 `textChunkLimit`）。
    - 媒体、错误和显式回复的最终消息会取消待处理的预览编辑。
    - `streaming.preview.toolProgress`（默认 `true`）控制工具/进度更新是否复用预览消息。
    - 工具/进度行会在可用时以紧凑的 emoji + 标题 + 详情形式渲染，例如 `🛠️ Bash: run tests` 或 `🔎 Web Search: for "query"`。
    - `streaming.preview.commandText` / `streaming.progress.commandText` 控制紧凑进度行中的命令/执行详情：`raw`（默认）或 `status`（仅工具标签）。

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

    预览流仅支持文本；媒体回复会回退为普通发送。显式启用 `block` 流式时，OpenClaw 会跳过预览流，以避免双重流式输出。

  </Accordion>

  <Accordion title="History, context, and thread behavior">
    服务器历史上下文：

    - `channels.discord.historyLimit` 默认 `20`
    - 回退：`messages.groupChat.historyLimit`
    - `0` 表示禁用

    DM 历史控制：

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    线程行为：

    - Discord 线程会作为频道会话路由，并继承父频道配置，除非被覆盖。
    - 线程会话会继承父频道会话级 `/model` 选择，作为仅模型的回退；线程本地的 `/model` 选择仍然优先，且除非启用了转录继承，否则不会复制父转录历史。
    - `channels.discord.thread.inheritParent`（默认 `false`）会让新自动线程从父转录中初始化种子内容。按账号覆盖位于 `channels.discord.accounts.<id>.thread.inheritParent`。
    - 消息工具反应可以解析 `user:<id>` DM 目标。
    - `guilds.<guild>.channels.<channel>.requireMention: false` 会在回复阶段激活回退期间被保留。

    频道主题会作为**不受信任**的上下文注入。白名单限制的是谁可以触发代理，而不是完整的补充上下文红action边界。

  </Accordion>

  <Accordion title="Thread-bound sessions for subagents">
    Discord 可以将线程绑定到会话目标，以便该线程中的后续消息继续路由到同一个会话（包括子代理会话）。

    命令：

    - `/focus <target>` 将当前/新线程绑定到子代理/会话目标
    - `/unfocus` 移除当前线程绑定
    - `/agents` 显示活动运行和绑定状态
    - `/session idle <duration|off>` 检查/更新聚焦绑定的空闲自动取消聚焦
    - `/session max-age <duration|off>` 检查/更新聚焦绑定的硬最大时长

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

    - `session.threadBindings.*` 设置全局默认值。
    - `channels.discord.threadBindings.*` 覆盖 Discord 行为。
    - `spawnSessions` 控制 `sessions_spawn({ thread: true })` 和 ACP 线程创建的自动创建/绑定。默认：`true`。
    - `defaultSpawnContext` 控制线程绑定 spawn 的原生子代理上下文。默认：`"fork"`。
    - 已弃用的 `spawnSubagentSessions`/`spawnAcpSessions` 键会由 `openclaw doctor --fix` 迁移。
    - 如果某个账号禁用了线程绑定，则 `/focus` 和相关线程绑定操作不可用。

    参见 [Sub-agents](/tools/subagents)、[ACP Agents](/tools/acp-agents) 和 [Configuration Reference](/gateway/configuration-reference)。

  </Accordion>

  <Accordion title="Persistent ACP channel bindings">
    对于稳定的“始终在线” ACP 工作区，请配置指向 Discord 会话的顶层类型化 ACP 绑定。

    配置路径：

    - `bindings[]`，并设置 `type: "acp"` 和 `match.channel: "discord"`

    示例：

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

    - `/acp spawn codex --bind here` 将当前频道或线程原地绑定，并让未来消息继续使用同一个 ACP 会话。线程消息会继承父频道绑定。
    - 在已绑定的频道或线程中，`/new` 和 `/reset` 会就地重置同一个 ACP 会话。临时线程绑定在激活时可以覆盖目标解析。
    - `spawnSessions` 通过 `--thread auto|here` 控制子线程的创建/绑定。

    绑定行为详情请参见 [ACP Agents](/tools/acp-agents)。

  </Accordion>

  <Accordion title="Reaction notifications">
    每个服务器的反应通知模式：

    - `off`
    - `own`（默认）
    - `all`
    - `allowlist`（使用 `guilds.<id>.users`）

    反应事件会转换为系统事件并附加到已路由的 Discord 会话。

  </Accordion>

  <Accordion title="Ack reactions">
    `ackReaction` 会在 OpenClaw 处理入站消息时发送一个确认表情。

    解析顺序：

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - 代理身份表情回退（`agents.list[].identity.emoji`，否则为 "👀"）

    说明：

    - Discord 接受 Unicode 表情或自定义表情名称。
    - 使用 `""` 可为某个频道或账号禁用该反应。

  </Accordion>

  <Accordion title="Config writes">
    默认启用由频道发起的配置写入。

    这会影响 `/config set|unset` 流程（当命令功能已启用时）。

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
    通过 `channels.discord.proxy` 将 Discord 网关 WebSocket 流量和启动时 REST 查询（application ID + allowlist 解析）路由经由 HTTP(S) 代理。

```json5
{
  channels: {
    discord: {
      proxy: "http://proxy.example:8080",
    },
  },
}
```

    按账号覆盖：

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

  <Accordion title="PluralKit support">
    启用 PluralKit 解析，将代理消息映射到系统成员身份：

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

    - 白名单可以使用 `pk:<memberId>`
    - 仅当 `channels.discord.dangerouslyAllowNameMatching: true` 时，才会按名称/slug 匹配成员显示名
    - 查找使用原始消息 ID，并受时间窗口限制
    - 如果查找失败，代理消息会被视为机器人消息并丢弃，除非 `allowBots=true`

  </Accordion>

  <Accordion title="Outbound mention aliases">
    当代理需要对已知 Discord 用户进行可确定的发出提及时，请使用 `mentionAliases`。键是不带前导 `@` 的句柄；值是 Discord 用户 ID。未知句柄、`@everyone`、`@here`，以及 Markdown 代码跨度中的提及都会保持不变。

```json5
{
  channels: {
    discord: {
      mentionAliases: {
        Vladislava: "123456789012345678",
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

  <Accordion title="Presence configuration">
    当你设置状态或活动字段，或者启用自动 presence 时，会应用 presence 更新。

    仅状态示例：

```json5
{
  channels: {
    discord: {
      status: "idle",
    },
  },
}
```

    活动示例（自定义状态是默认活动类型）：

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

    流式示例：

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

    - 0：Playing
    - 1：Streaming（需要 `activityUrl`）
    - 2：Listening
    - 3：Watching
    - 4：Custom（使用活动文本作为状态值；表情可选）
    - 5：Competing

    自动 presence 示例（运行时健康信号）：

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

    自动 presence 会将运行时可用性映射为 Discord 状态：健康 => online，降级或未知 => idle，耗尽或不可用 => dnd。可选文本覆盖：

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText`（支持 `{reason}` 占位符）

  </Accordion>

  <Accordion title="Approvals in Discord">
    Discord 支持在 DM 中基于按钮的审批处理，也可以选择在发起的频道中发布审批提示。

    配置路径：

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers`（可选；在可能时回退到 `commands.ownerAllowFrom`）
    - `channels.discord.execApprovals.target`（`dm` | `channel` | `both`，默认：`dm`）
    - `agentFilter`、`sessionFilter`、`cleanupAfterResolve`

    当 `enabled` 未设置或为 `"auto"`，并且至少能从 `execApprovals.approvers` 或 `commands.ownerAllowFrom` 解析出一个审批人时，Discord 会自动启用原生 exec approvals。Discord 不会从频道 `allowFrom`、旧版 `dm.allowFrom` 或私信 `defaultTo` 推断 exec 审批人。要显式禁用 Discord 作为原生审批客户端，请设置 `enabled: false`。

    对于诸如 `/diagnostics` 和 `/export-trajectory` 之类仅限所有者的敏感组命令，OpenClaw 会私下发送审批提示和最终结果。如果调用者所属的所有者有 Discord 路由，则会优先尝试 Discord DM；如果不可用，则回退到 `commands.ownerAllowFrom` 中第一个可用的所有者路由，例如 Telegram。

    当 `target` 为 `channel` 或 `both` 时，审批提示会在频道中可见。只有已解析出的审批人可以使用这些按钮；其他用户会收到一条临时拒绝提示。审批提示包含命令文本，因此仅应在受信任的频道中启用频道投放。如果无法从会话键派生频道 ID，OpenClaw 会回退为 DM 投放。

    Discord 还会渲染其他聊天频道所使用的共享审批按钮。原生 Discord 适配器主要添加审批人 DM 路由和频道扇出。
    当这些按钮存在时，它们是主要的审批交互方式；只有当工具结果表明聊天审批不可用，或者手动审批是唯一途径时，OpenClaw 才应包含手动 `/approve` 命令。
    如果 Discord 原生审批运行时未激活，OpenClaw 会继续显示本地确定性的 `/approve <id> <decision>` 提示。如果运行时已激活但无法将原生卡片投递到任何目标，OpenClaw 会发送一条同聊天回退通知，并附上待审批项中的确切 `/approve` 命令。

    网关认证和审批解析遵循共享的 Gateway 客户端契约（`plugin:` ID 通过 `plugin.approval.resolve` 解析；其他 ID 通过 `exec.approval.resolve` 解析）。审批默认在 30 分钟后过期。

    参见 [Exec approvals](/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>

## 工具与动作门禁

Discord 消息动作包括消息发送、频道管理、审核、状态和元数据动作。

核心示例：

- 消息：`sendMessage`、`readMessages`、`editMessage`、`deleteMessage`、`threadReply`
- 反应：`react`、`reactions`、`emojiList`
- 审核：`timeout`、`kick`、`ban`
- 状态：`setPresence`

`event-create` 动作接受一个可选的 `image` 参数（URL 或本地文件路径），用于设置定时事件封面图。

动作门禁位于 `channels.discord.actions.*` 下。

默认门禁行为：

| 动作组                                                                                                                                                             | 默认值  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| reactions, messages, threads, pins, polls, search, memberInfo, roleInfo, channelInfo, channels, voiceStatus, events, stickers, emojiUploads, stickerUploads, permissions | 已启用 |
| roles                                                                                                                                                                    | 已禁用 |
| moderation                                                                                                                                                               | 已禁用 |
| presence                                                                                                                                                                 | 已禁用 |

## Components v2 UI

OpenClaw 使用 Discord components v2 进行执行审批和跨上下文标记。Discord 消息动作也可以接受 `components` 来实现自定义 UI（高级功能；需要通过 discord 工具构造 component payload），而旧版 `embeds` 仍然可用，但不推荐使用。

- `channels.discord.ui.components.accentColor` 设置 Discord 组件容器使用的强调色（十六进制）。
- 可按账号通过 `channels.discord.accounts.<id>.ui.components.accentColor` 单独设置。
- 当存在 components v2 时，`embeds` 会被忽略。

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

Discord 有两个不同的语音表面：实时 **语音频道**（连续对话）和 **语音消息附件**（波形预览格式）。网关同时支持两者。

### 语音频道

设置清单：

1. 在 Discord Developer Portal 中启用 Message Content Intent。
2. 当使用角色/用户允许名单时，启用 Server Members Intent。
3. 使用 `bot` 和 `applications.commands` 范围邀请机器人。
4. 在目标语音频道中授予 Connect、Speak、Send Messages 和 Read Message History 权限。
5. 启用原生命令（`commands.native` 或 `channels.discord.commands.native`）。
6. 配置 `channels.discord.voice`。

使用 `/vc join|leave|status` 来控制会话。该命令使用账号默认 agent，并遵循与其他 Discord 命令相同的允许名单和组策略规则。

```bash
/vc join channel:<voice-channel-id>
/vc status
/vc leave
```

要在加入前检查机器人的有效权限，请运行：

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
        model: "openai-codex/gpt-5.5",
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
          voice: "cedar",
        },
      },
    },
  },
}
```

注意：

- `voice.tts` 会覆盖 `stt-tts` 语音播放中的 `messages.tts`。实时模式使用 `voice.realtime.voice`。
- `voice.mode` 控制对话路径。默认值是 `agent-proxy`：一个实时语音前端负责轮次时机、打断和播放，通过 `openclaw_agent_consult` 将实质性工作委托给路由后的 OpenClaw agent，并将结果视为来自该说话者的已输入 Discord 提示。`stt-tts` 保留旧的批处理 STT 加 TTS 流程。`bidi` 允许实时模型直接对话，同时向 OpenClaw 大脑暴露 `openclaw_agent_consult`。
- `voice.agentSession` 控制哪一个 OpenClaw 对话接收语音轮次。若留空，则使用语音频道自己的会话；或设为 `{ mode: "target", target: "channel:<text-channel-id>" }`，使语音频道充当现有 Discord 文本频道会话（例如 `#maintainers`）的麦克风/扬声器扩展。
- `voice.model` 会覆盖用于 Discord 语音响应和实时咨询的 OpenClaw agent 大脑。留空则继承路由后的 agent 模型。它与 `voice.realtime.model` 是分开的。
- `agent-proxy` 通过 `discord-voice` 路由语音，它会为说话者和目标会话保留正常的 owner/tool 授权，但会隐藏 agent 的 `tts` 工具，因为 Discord 语音负责播放。默认情况下，`agent-proxy` 会为 owner 说话者让咨询获得完整的等同 owner 的工具访问权限（`voice.realtime.toolPolicy: "owner"`），并强烈偏向在实质性回答前先咨询 OpenClaw agent（`voice.realtime.consultPolicy: "always"`）。在该默认的 `always` 模式下，实时层不会在咨询答案前自动播报填充语句；它会捕获并转写语音，然后播报路由后的 OpenClaw 答案。如果多个强制咨询答案在 Discord 仍播放第一个答案时完成，后续的逐字答案会被排队，直到播放空闲为止，而不是在句中替换播报内容。
- 在 `stt-tts` 模式下，STT 使用 `tools.media.audio`；`voice.model` 不影响转写。
- 在实时模式下，`voice.realtime.provider`、`voice.realtime.model` 和 `voice.realtime.voice` 配置实时音频会话。对于 OpenAI Realtime 2 加 Codex 大脑，请使用 `voice.realtime.model: "gpt-realtime-2"` 和 `voice.model: "openai-codex/gpt-5.5"`。
- OpenAI realtime 提供方接受当前的 Realtime 2 事件名以及旧版、与 Codex 兼容的音频输出和转写事件别名，因此兼容的提供方快照可以发生漂移而不会丢失助手音频。
- `voice.realtime.bargeIn` 控制 Discord 说话开始事件是否会中断当前实时播放。如果未设置，它会遵循实时提供方的输入音频中断设置。
- `voice.realtime.minBargeInAudioEndMs` 控制 OpenAI realtime barge-in 截断音频前的最短助手播放时长。默认值：`250`。在低回声房间中可设为 `0` 以实现立即中断，或者在回声严重的扬声器环境中将其调高。
- 对于在 Discord 播放中的 OpenAI 语音，请设置 `voice.tts.provider: "openai"`，并在 `voice.tts.openai.voice` 或 `voice.tts.providers.openai.voice` 下选择一个文本转语音声音。`cedar` 是当前 OpenAI TTS 模型上一个较好的男性音色选择。
- 按频道的 Discord `systemPrompt` 覆盖会应用到该语音频道的语音转写轮次。
- 语音转写轮次会从 Discord `allowFrom`（或 `dm.allowFrom`）继承 owner 状态；非 owner 说话者无法访问仅限 owner 的工具（例如 `gateway` 和 `cron`）。
- 对于仅文本配置，Discord 语音是可选开启的；设置 `channels.discord.voice.enabled=true`（或保留现有的 `channels.discord.voice` 块）以启用 `/vc` 命令、语音运行时和 `GuildVoiceStates` 网关 intent。
- `channels.discord.intents.voiceStates` 可显式覆盖 voice-state intent 订阅。若留空，则该 intent 会跟随有效的语音启用状态。
- 如果 `voice.autoJoin` 对同一个 guild 有多个条目，OpenClaw 会加入该 guild 最后配置的频道。
- `voice.allowedChannels` 是一个可选的驻留允许名单。留空则允许 `/vc join` 加入任何已授权的 Discord 语音频道。设置后，`/vc join`、启动时自动加入和机器人 voice-state 移动都会被限制在列出的 `{ guildId, channelId }` 条目内。将其设置为空数组可拒绝所有 Discord 语音加入。如果 Discord 将机器人移出允许名单，OpenClaw 会离开该频道，并在可用时重新加入已配置的自动加入目标。
- `voice.daveEncryption` 和 `voice.decryptionFailureTolerance` 会透传到 `@discordjs/voice` 的加入选项。
- 如果未设置，`@discordjs/voice` 的默认值为 `daveEncryption=true` 和 `decryptionFailureTolerance=24`。
- OpenClaw 对 Discord 语音接收默认使用纯 JS 的 `opusscript` 解码器。可选的原生 `@discordjs/opus` 包会被仓库 pnpm 安装策略忽略，因此正常安装、Docker 线路和无关测试都不会编译原生插件。专门的语音性能主机可以在安装原生插件后通过 `OPENCLAW_DISCORD_OPUS_DECODER=native` 选择启用。
- `voice.connectTimeoutMs` 控制 `/vc join` 和自动加入尝试时 `@discordjs/voice` 初始 Ready 等待时间。默认值：`30000`。
- `voice.reconnectGraceMs` 控制 OpenClaw 在销毁一个断开的语音会话前，等待其开始重连的时长。默认值：`15000`。
- 在 `stt-tts` 模式下，语音播放不会因为另一个用户开始说话而停止。为避免反馈回路，OpenClaw 在 TTS 播放时会忽略新的语音捕获；请在播放结束后再说下一轮。实时模式会把说话者开始事件作为 barge-in 信号转发给实时提供方。
- 在实时模式下，扬声器声音通过打开的麦克风回灌可能看起来像 barge-in 并中断播放。对于回声严重的 Discord 房间，请将 `voice.realtime.providers.openai.interruptResponseOnInputAudio: false`，以阻止 OpenAI 在输入音频上自动中断。如果你仍希望 Discord 说话开始事件中断当前播放，可再添加 `voice.realtime.bargeIn: true`。OpenAI realtime 桥接会忽略短于 `voice.realtime.minBargeInAudioEndMs` 的播放截断，因为它们很可能是回声/噪声，并会将其记录为已跳过，而不是清除 Discord 播放。
- `voice.captureSilenceGraceMs` 控制 Discord 报告说话者停止后，OpenClaw 等待多长时间才将该音频片段定稿用于 STT。默认值：`2500`；如果 Discord 把正常停顿拆成了断续的部分转写，请提高该值。
- 当 ElevenLabs 是选定的 TTS 提供方时，Discord 语音播放使用流式 TTS，并从提供方响应流开始。没有流式支持的提供方会回退到合成的临时文件路径。
- OpenClaw 还会监视接收解密失败，并在短时间内多次失败后通过离开/重新加入语音频道来自动恢复。
- 如果更新后接收日志反复显示 `DecryptionFailed(UnencryptedWhenPassthroughDisabled)`，请收集依赖报告和日志。捆绑的 `@discordjs/voice` 版本包含来自 discord.js PR #11449 的上游 padding 修复，该修复关闭了 discord.js issue #11419。
- `The operation was aborted` 接收事件在 OpenClaw 定稿一个捕获到的说话者片段时是预期内的；它们是冗长的诊断信息，不是警告。
- 详细的 Discord 语音日志会为每个被接受的说话者片段包含一个有边界的单行 STT 转写预览，因此调试时既能看到用户侧，也能看到 agent 回复侧，而不会输出无边界的转写文本。
- 在 `agent-proxy` 模式下，强制咨询回退会跳过很可能不完整的转写片段，例如以 `...` 结尾的文本，或以 `and` 之类的尾随连接词结尾的文本，以及诸如“be right back”或“bye”这类明显无操作性的收尾内容。如果这避免了一个过时的排队答案，日志会显示 `forced agent consult skipped reason=...`。

原生 opus 的源码检出设置：

```bash
pnpm install
mise exec node@22 -- pnpm discord:opus:install
```

当你希望使用上游 macOS arm64 预构建原生插件时，请在网关中使用 Node 22。如果你使用其他 Node 运行时，可选安装器可能需要本地 `node-gyp` 源码构建工具链。

安装原生插件后，使用以下命令启动 Gateway：

```bash
OPENCLAW_DISCORD_OPUS_DECODER=native pnpm gateway:watch
```

详细语音日志应显示 `discord voice: opus decoder: @discordjs/opus`。若未设置该环境变量，或者原生插件缺失或无法在主机上加载，OpenClaw 会记录 `discord voice: opus decoder: opusscript`，并继续通过纯 JS 回退接收语音。

STT 加 TTS 管线：

- Discord PCM 采集会转换为 WAV 临时文件。
- `tools.media.audio` 负责 STT，例如 `openai/gpt-4o-mini-transcribe`。
- 转写会通过 Discord ingress 和路由发送，同时响应 LLM 运行时使用一种语音输出策略：隐藏 agent 的 `tts` 工具并请求返回文本，因为最终的 TTS 播放由 Discord 语音负责。
- `voice.model` 在设置时，只会覆盖该语音频道轮次的响应 LLM。
- `voice.tts` 会在 `messages.tts` 之上进行合并；支持流式的提供方会直接把数据送入播放器，否则会在加入的频道中播放生成的音频文件。

默认 agent-proxy 语音频道会话示例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        model: "openai-codex/gpt-5.5",
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          voice: "cedar",
        },
      },
    },
  },
}
```

在没有 `voice.agentSession` 块的情况下，每个语音频道都会获得自己路由后的 OpenClaw 会话。例如，`/vc join channel:234567890123456789` 会与该 Discord 语音频道对应的会话对话。实时模型只是语音前端；实质性请求会交给配置好的 OpenClaw agent。若实时模型在未调用咨询工具的情况下生成了最终转写，OpenClaw 会强制调用咨询作为回退，因此默认行为仍然像是在与 agent 对话。

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
          openai: {
            model: "gpt-4o-mini-tts",
            voice: "cedar",
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
        model: "openai-codex/gpt-5.5",
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          voice: "cedar",
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
        model: "openai-codex/gpt-5.5",
        agentSession: {
          mode: "target",
          target: "channel:123456789012345678",
        },
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          voice: "cedar",
        },
      },
    },
  },
}
```

在 `agent-proxy` 模式下，机器人会加入已配置的语音频道，但 OpenClaw agent 轮次会使用目标频道的正常路由会话和 agent。实时语音会话会把返回结果重新播回语音频道。监督 agent 仍然可以根据其工具策略使用正常的消息工具，包括在适当时发送单独的 Discord 消息。

有用的目标格式：

- `target: "channel:123456789012345678"` 会通过 Discord 文本频道会话路由。
- `target: "123456789012345678"` 会被视为频道目标。
- `target: "dm:123456789012345678"` 或 `target: "user:123456789012345678"` 会通过该直接消息会话路由。

回声较重的 OpenAI Realtime 示例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        mode: "bidi",
        model: "openai-codex/gpt-5.5",
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          voice: "cedar",
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

当模型会通过开放麦克风听到自己的 Discord 播放内容，但你仍希望通过说话来中断它时，请使用此配置。OpenClaw 会阻止 OpenAI 在原始输入音频上自动中断，而 `bargeIn: true` 会让 Discord 说话者开始事件以及已处于活动状态的说话者音频在下一段捕获到达 OpenAI 之前取消当前实时响应。`audioEndMs` 低于 `minBargeInAudioEndMs` 的非常早期 barge-in 信号会被视为可能的回声/噪声并忽略，因此模型不会在第一帧播放时就被截断。

预期的语音日志：

- On join: `discord voice: joining ... voiceSession=... supervisorSession=... agentSessionMode=... voiceModel=... realtimeModel=...`
- On realtime start: `discord voice: realtime bridge starting ... autoRespond=false interruptResponse=false bargeIn=false minBargeInAudioEndMs=...`
- On speaker audio: `discord voice: realtime speaker turn opened ...`, `discord voice: realtime input audio started ... outputAudioMs=... outputActive=...`, and `discord voice: realtime speaker turn closed ... chunks=... discordBytes=... realtimeBytes=... interruptedPlayback=...`
- On skipped stale speech: `discord voice: realtime forced agent consult skipped reason=incomplete-transcript ...` or `reason=non-actionable-closing ...`
- On realtime response completion: `discord voice: realtime audio playback finishing reason=response.done ... audioMs=... chunks=...`
- On playback stop/reset: `discord voice: realtime audio playback stopped reason=... audioMs=... elapsedMs=... chunks=...`
- On realtime consult: `discord voice: realtime consult requested ... voiceSession=... supervisorSession=... question=...`
- On agent answer: `discord voice: agent turn answer ...`
- On queued exact speech: `discord voice: realtime exact speech queued ... queued=... outputAudioMs=... outputActive=...`, followed by `discord voice: realtime exact speech dequeued reason=player-idle ...`
- On barge-in detection: `discord voice: realtime barge-in detected source=speaker-start ...` or `discord voice: realtime barge-in detected source=active-speaker-audio ...`, followed by `discord voice: realtime barge-in requested reason=... outputAudioMs=... outputActive=...`
- On realtime interruption: `discord voice: realtime model interrupt requested client:response.cancel reason=barge-in`, followed by either `discord voice: realtime model audio truncated client:conversation.item.truncate reason=barge-in audioEndMs=...` or `discord voice: realtime model interrupt confirmed server:response.done status=cancelled ...`
- On ignored echo/noise: `discord voice: realtime model interrupt ignored client:conversation.item.truncate.skipped reason=barge-in audioEndMs=0 minAudioEndMs=250`
- On disabled barge-in: `discord voice: realtime capture ignored during playback (barge-in disabled) ...`
- On idle playback: `discord voice: realtime barge-in ignored reason=... outputActive=false ... playbackChunks=0`

To debug cut-off audio, read the realtime voice logs as a timeline:

1. `realtime audio playback started` means Discord has begun playing assistant audio. The bridge starts counting assistant output chunks, Discord PCM bytes, provider realtime bytes, and synthesized audio duration from this point.
2. `realtime speaker turn opened` marks a Discord speaker becoming active. If playback is already active and `bargeIn` is enabled, this can be followed by `barge-in detected source=speaker-start`.
3. `realtime input audio started` marks the first actual audio frame received for that speaker turn. `outputActive=true` or a nonzero `outputAudioMs` here means the mic is sending input while assistant playback is still active.
4. `barge-in detected source=active-speaker-audio` means OpenClaw saw live speaker audio while assistant playback was active. This is useful for distinguishing a real interruption from a Discord speaker-start event with no useful audio.
5. `barge-in requested reason=...` means OpenClaw asked the realtime provider to cancel or truncate the active response. It includes `outputAudioMs`, `outputActive`, and `playbackChunks` so you can see how much assistant audio had actually played before the interruption.
6. `realtime audio playback stopped reason=...` is the local Discord playback reset point. The reason says who stopped playback: `barge-in`, `player-idle`, `provider-clear-audio`, `forced-agent-consult`, `stream-close`, or `session-close`.
7. `realtime speaker turn closed` summarizes the captured input turn. `chunks=0` or `hasAudio=false` means the speaker turn opened but no usable audio reached the realtime bridge. `interruptedPlayback=true` means that input turn overlapped assistant output and triggered barge-in logic.

Useful fields:

- `outputAudioMs`: assistant audio duration generated by the realtime provider before the log line.
- `audioMs`: assistant audio duration that OpenClaw counted before playback stopped.
- `elapsedMs`: wall-clock time between opening and closing the playback stream or speaker turn.
- `discordBytes`: 48 kHz stereo PCM bytes sent to or received from Discord voice.
- `realtimeBytes`: provider-format PCM bytes sent to or received from the realtime provider.
- `playbackChunks`: assistant audio chunks forwarded to Discord for the active response.
- `sinceLastAudioMs`: gap between the last captured speaker audio frame and the speaker turn closing.

Common patterns:

- Immediate cut-off with `source=active-speaker-audio`, small `outputAudioMs`, and the same user nearby usually points to speaker echo entering the mic. Raise `voice.realtime.minBargeInAudioEndMs`, lower speaker volume, use headphones, or set `voice.realtime.providers.openai.interruptResponseOnInputAudio: false`.
- `source=speaker-start` followed by `speaker turn closed ... hasAudio=false` means Discord reported a speaker start but no audio reached OpenClaw. That can be a transient Discord voice event, noise gate behavior, or a client briefly keying the mic.
- `audio playback stopped reason=stream-close` without a nearby barge-in or `provider-clear-audio` means the local Discord playback stream ended unexpectedly. Check the preceding provider and Discord player logs.
- `capture ignored during playback (barge-in disabled)` means OpenClaw intentionally dropped input while assistant audio was active. Enable `voice.realtime.bargeIn` if you want speech to interrupt playback.
- `barge-in ignored ... outputActive=false` means Discord or provider VAD reported speech, but OpenClaw had no active playback to interrupt. This should not cut off audio.

凭据按组件解析：`voice.model` 使用 LLM 路由认证，`tools.media.audio` 使用 STT 认证，`messages.tts`/`voice.tts` 使用 TTS 认证，而 `voice.realtime.providers` 或提供方的常规认证配置则用于实时提供方认证。

### 语音消息

Discord 语音消息会显示波形预览，并要求 OGG/Opus 音频。OpenClaw 会自动生成波形，但需要网关主机上的 `ffmpeg` 和 `ffprobe` 来进行检查和转换。

- 提供一个**本地文件路径**（不接受 URL）。
- 省略文本内容（Discord 会拒绝同一 payload 中同时包含文本和语音消息）。
- 接受任何音频格式；OpenClaw 会按需转换为 OGG/Opus。

```bash
message(action="send", channel="discord", target="channel:123", path="/path/to/audio.mp3", asVoice=true)
```

## 故障排查

<AccordionGroup>
  <Accordion title="使用了不允许的 intents 或 bot 看不到任何 guild 消息">

    - 启用 Message Content Intent
    - 当你依赖用户/成员解析时，启用 Server Members Intent
    - 更改 intents 后重启网关

  </Accordion>

  <Accordion title="guild 消息被意外阻止">

    - 检查 `groupPolicy`
    - 检查 `channels.discord.guilds` 下的 guild 允许名单
    - 如果存在 guild `channels` 映射，则只允许列出的频道
    - 检查 `requireMention` 行为和提及模式

    有用的检查：

```bash
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

  </Accordion>

  <Accordion title="require mention 为 false 但仍被阻止">
    常见原因：

    - `groupPolicy="allowlist"` 但没有匹配的 guild/channel 允许名单
    - `requireMention` 配置在错误位置（必须位于 `channels.discord.guilds` 或频道条目下）
    - 发送者被 guild/channel `users` 允许名单阻止

  </Accordion>

  <Accordion title="长时间运行的 Discord 回合或重复回复">

    典型日志：

    - `Slow listener detected ...`
    - `stuck session: sessionKey=agent:...:discord:... state=processing ...`

    Discord gateway 队列参数：

    - 单账号：`channels.discord.eventQueue.listenerTimeout`
    - 多账号：`channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`
    - 这只控制 Discord gateway 监听器工作，不控制 agent 回合生命周期

    Discord 不会对排队中的 agent 回合应用 channel-owned 超时。消息监听器会立即移交，而排队中的 Discord 运行会保持每个会话的顺序，直到会话/工具/运行时生命周期完成或中止工作。

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

  <Accordion title="网关元数据查找超时警告">
    OpenClaw 在连接前会获取 Discord `/gateway/bot` 元数据。临时性失败会回退到 Discord 的默认网关 URL，并在日志中进行限流。

    元数据超时参数：

    - 单账号：`channels.discord.gatewayInfoTimeoutMs`
    - 多账号：`channels.discord.accounts.<accountId>.gatewayInfoTimeoutMs`
    - 当配置未设置时的环境变量回退：`OPENCLAW_DISCORD_GATEWAY_INFO_TIMEOUT_MS`
    - 默认值：`30000`（30 秒），最大值：`120000`

  </Accordion>

  <Accordion title="Gateway READY timeout restarts">
    OpenClaw 在启动期间以及运行时重新连接后都会等待 Discord 的 gateway `READY` 事件。带有启动错峰的多账号设置，可能需要比默认值更长的启动 READY 窗口。

    READY 超时参数：

    - 启动单账号：`channels.discord.gatewayReadyTimeoutMs`
    - 启动多账号：`channels.discord.accounts.<accountId>.gatewayReadyTimeoutMs`
    - 配置未设置时的启动环境变量回退：`OPENCLAW_DISCORD_READY_TIMEOUT_MS`
    - 启动默认值：`15000`（15 秒），最大值：`120000`
    - 运行时单账号：`channels.discord.gatewayRuntimeReadyTimeoutMs`
    - 运行时多账号：`channels.discord.accounts.<accountId>.gatewayRuntimeReadyTimeoutMs`
    - 配置未设置时的运行时环境变量回退：`OPENCLAW_DISCORD_RUNTIME_READY_TIMEOUT_MS`
    - 运行时默认值：`30000`（30 秒），最大值：`120000`

  </Accordion>

  <Accordion title="Permissions audit mismatches">
    `channels status --probe` 权限检查只对数字频道 ID 有效。

    如果你使用 slug 键，运行时匹配仍可能工作，但 probe 无法完全验证权限。

  </Accordion>

  <Accordion title="DM 和配对问题">

    - DM 已禁用：`channels.discord.dm.enabled=false`
    - DM 策略已禁用：`channels.discord.dmPolicy="disabled"`（旧版：`channels.discord.dm.policy`）
    - 在 `pairing` 模式下等待配对批准

  </Accordion>

  <Accordion title="机器人互相循环">
    默认会忽略机器人发出的消息。

    如果你设置了 `channels.discord.allowBots=true`，请使用严格的提及和允许名单规则，以避免循环行为。
    建议使用 `channels.discord.allowBots="mentions"`，仅接受提及机器人的机器人消息。

    OpenClaw 也提供了共享的 [bot loop protection](/channels/bot-loop-protection)。每当 `allowBots` 允许机器人作者消息进入调度时，Discord 会将入站事件映射为 `(account, channel, bot pair)` 事实，而通用配对保护器会在其超过配置的事件预算后抑制该配对。该保护器可防止曾经必须由 Discord 速率限制来阻止的失控双机器人循环；它不会影响单机器人部署，也不会影响低于预算的一次性机器人回复。

    默认设置（在设置 `allowBots` 时生效）：

    - `maxEventsPerWindow: 20` -- 机器人配对可以在滑动窗口内交换 20 条消息
    - `windowSeconds: 60` -- 滑动窗口长度
    - `cooldownSeconds: 60` -- 一旦预算触发，任一方向的每一条额外机器人到机器人消息都会在一分钟内被丢弃

    只需在 `channels.defaults.botLoopProtection` 下配置一次共享默认值，然后在合法工作流需要更多余量时覆盖 Discord。优先级如下：

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
      // 可选的 Discord 全局覆盖。账号块会覆盖单个字段，
      // 并从这里继承未省略的字段。
      botLoopProtection: {
        maxEventsPerWindow: 4,
      },
      accounts: {
        mantis: {
          // 螳螂只会在其他机器人提及她时监听它们。
          allowBots: "mentions",
        },
        molty: {
          // Molty 会监听所有机器人发送的 Discord 消息。
          allowBots: true,
          mentionAliases: {
            // 允许 Molty 写出 "@Mantis" 并发送真正的 Discord 提及。
            Mantis: "MANTIS_DISCORD_USER_ID",
          },
          botLoopProtection: {
            // 在抑制该配对前，允许每分钟最多五条消息。
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

    - 保持 OpenClaw 为最新版本（`openclaw update`），以确保 Discord 语音接收恢复逻辑存在
    - 确认 `channels.discord.voice.daveEncryption=true`（默认）
    - 从 `channels.discord.voice.decryptionFailureTolerance=24`（上游默认）开始，仅在需要时调优
    - 关注日志中的：
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - 如果自动重新加入后失败仍持续，请收集日志并与上游 DAVE 接收历史对照：[discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) 和 [discord.js #11449](https://github.com/discordjs/discord.js/pull/11449)

  </Accordion>
</AccordionGroup>

## 配置参考

主要参考：[Configuration reference - Discord](/gateway/config-channels#discord)。

<Accordion title="高信号 Discord 字段">

- startup/auth: `enabled`, `token`, `accounts.*`, `allowBots`
- policy: `groupPolicy`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- command: `commands.native`, `commands.useAccessGroups`, `configWrites`, `slashCommand.*`
- event queue: `eventQueue.listenerTimeout` (监听器预算), `eventQueue.maxQueueSize`, `eventQueue.maxConcurrency`
- gateway: `gatewayInfoTimeoutMs`, `gatewayReadyTimeoutMs`, `gatewayRuntimeReadyTimeoutMs`
- reply/history: `replyToMode`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- delivery: `textChunkLimit`, `chunkMode`, `maxLinesPerMessage`
- streaming: `streaming` (旧版别名：`streamMode`), `streaming.preview.toolProgress`, `draftChunk`, `blockStreaming`, `blockStreamingCoalesce`
- media/retry: `mediaMaxMb` (限制对外 Discord 上传，默认 `100MB`), `retry`
- actions: `actions.*`
- presence: `activity`、`status`、`activityType`、`activityUrl`
- UI: `ui.components.accentColor`
- features: `threadBindings`、顶层 `bindings[]`（`type: "acp"`）、`pluralkit`、`execApprovals`、`intents`、`agentComponents`、`heartbeat`、`responsePrefix`

</Accordion>

## 安全与运维

- 将 bot token 视为密钥（在受监管环境中优先使用 `DISCORD_BOT_TOKEN`）。
- 授予最小权限的 Discord 权限。
- 如果命令部署/状态已过期，重启 gateway，并使用 `openclaw channels status --probe` 重新检查。

## 相关内容

<CardGroup cols={2}>
  <Card title="配对" icon="link" href="/channels/pairing">
    将 Discord 用户与 gateway 配对。
  </Card>
  <Card title="分组" icon="users" href="/channels/groups">
    群聊和允许列表行为。
  </Card>
  <Card title="频道路由" icon="route" href="/channels/channel-routing">
    将传入消息路由给 agents。
  </Card>
  <Card title="安全" icon="shield" href="/gateway/security">
    威胁模型与加固。
  </Card>
  <Card title="多 agent 路由" icon="sitemap" href="/concepts/multi-agent">
    将 guilds 和 channels 映射到 agents。
  </Card>
  <Card title="斜杠命令" icon="terminal" href="/tools/slash-commands">
    原生命令行为。
  </Card>
</CardGroup>
