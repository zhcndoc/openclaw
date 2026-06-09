---
summary: "Discord 机器人支持状态、能力和配置"
read_when:
  - 处理 Discord 频道功能时
title: "Discord"
---

可通过官方 Discord 网关用于私信和 guild 频道。

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

你需要创建一个带有 bot 的新应用，把 bot 添加到你的服务器，然后将其与 OpenClaw 配对。我们建议把 bot 添加到你自己的私有服务器。如果你还没有，请先[创建一个](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server)（选择 **Create My Own > For me and my friends**）。

<Steps>
  <Step title="创建 Discord 应用和 bot">
    前往 [Discord Developer Portal](https://discord.com/developers/applications) 并点击 **New Application**。给它取一个类似 “OpenClaw” 的名字。

    点击侧边栏中的 **Bot**。将 **Username** 设置为你给 OpenClaw 代理起的名称。

  </Step>

  <Step title="启用特权 intents">
    仍在 **Bot** 页面，向下滚动到 **Privileged Gateway Intents** 并启用：

    - **Message Content Intent**（必需）
    - **Server Members Intent**（推荐；角色白名单和名称到 ID 匹配所必需）
    - **Presence Intent**（可选；仅在需要 presence 更新时使用）

  </Step>

  <Step title="复制 bot token">
    回到 **Bot** 页面顶部并点击 **Reset Token**。

    <Note>
    尽管名称如此，这会生成你的第一个 token——并没有真正进行“重置”。
    </Note>

    复制该 token 并保存到某处。这就是你的 **Bot Token**，你很快就会用到它。

  </Step>

  <Step title="生成邀请 URL 并将 bot 添加到你的服务器">
    点击侧边栏中的 **OAuth2**。你将生成一个带有正确权限的邀请 URL，以便把 bot 添加到你的服务器。

    向下滚动到 **OAuth2 URL Generator** 并启用：

    - `bot`
    - `applications.commands`

    下方会出现一个 **Bot Permissions** 区域。至少启用：

    **General Permissions**
      - View Channels
    **Text Permissions**
      - Send Messages
      - Read Message History
      - Embed Links
      - Attach Files
      - Add Reactions（可选）

    这是普通文本频道的基础权限集。如果你计划在 Discord 线程中发帖，包括会创建或延续线程的论坛或媒体频道工作流，还要启用 **Send Messages in Threads**。
    复制底部生成的 URL，将其粘贴到浏览器中，选择你的服务器，然后点击 **Continue** 进行连接。此时你应该已经能在 Discord 服务器中看到你的 bot。

  </Step>

  <Step title="启用开发者模式并收集你的 ID">
    回到 Discord 应用中，你需要启用开发者模式，以便复制内部 ID。

    1. 点击 **User Settings**（头像旁的齿轮图标）→ **Advanced** → 打开 **Developer Mode**
    2. 右键点击侧边栏中的 **server icon** → **Copy Server ID**
    3. 右键点击你自己的 **avatar** → **Copy User ID**

    将你的 **Server ID** 和 **User ID** 与 Bot Token 一起保存——下一步你会把这三者都发给 OpenClaw。

  </Step>

  <Step title="允许来自服务器成员的私信">
    为了让配对生效，Discord 需要允许你的 bot 给你发送私信。右键点击你的 **server icon** → **Privacy Settings** → 打开 **Direct Messages**。

    这样服务器成员（包括 bot）就能给你发私信。如果你想在 OpenClaw 中使用 Discord 私信，请保持此选项开启。如果你只打算使用 guild 频道，那么在配对后可以关闭 DMs。

  </Step>

  <Step title="安全设置你的 bot token（不要在聊天中发送）">
    你的 Discord bot token 是机密信息（类似密码）。在向你的代理发送消息之前，先把它设置到运行 OpenClaw 的机器上。

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
    对于托管服务安装，请在存在 `DISCORD_BOT_TOKEN` 的 shell 中运行 `openclaw gateway install`，或者将该变量存储在 `~/.openclaw/.env` 中，这样服务在重启后就能解析该 env SecretRef。
    如果你的主机因 Discord 启动时的应用查询而被阻止或限流，请从 Developer Portal 设置 Discord application/client ID，以便启动时跳过该 REST 调用。默认账户使用 `channels.discord.applicationId`，如果你运行多个 Discord bots，则使用 `channels.discord.accounts.<accountId>.applicationId`。

  </Step>

  <Step title="配置 OpenClaw 并完成配对">

    <Tabs>
      <Tab title="询问你的代理">
        在任何已有频道（例如 Telegram）中与你的 OpenClaw 代理聊天并告诉它。如果 Discord 是你的第一个频道，则改用 CLI / config 选项卡。

        > “我已经把 Discord bot token 设置到配置中了。请使用 User ID `<user_id>` 和 Server ID `<server_id>` 完成 Discord 设置。”
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

        默认账户的 env 回退值：

```bash
DISCORD_BOT_TOKEN=...
```

        对于脚本化或远程设置，使用 `openclaw config patch --file ./discord.patch.json5 --dry-run` 写入相同的 JSON5 块，然后去掉 `--dry-run` 重新运行。支持明文 `token` 值。`channels.discord.token` 也支持跨 env/file/exec provider 的 SecretRef 值。参见 [Secrets Management](/gateway/secrets)。

        对于多个 Discord bots，请将每个 bot token 和 application ID 保存在各自账户下。顶层的 `channels.discord.applicationId` 会被账户继承，因此只有在所有账户都应使用相同 application ID 时才在这里设置。

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
    等待网关运行，然后在 Discord 中给你的 bot 发私信。它会回复一个配对码。

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

    配对码在 1 小时后过期。

    现在你应该可以通过 Discord 私信与你的代理聊天了。

  </Step>
</Steps>

<Note>
Token 解析是按账户感知的。配置中的 token 值优先于 env 回退值。`DISCORD_BOT_TOKEN` 仅用于默认账户。
如果两个已启用的 Discord 账户解析到相同的 bot token，OpenClaw 只会为该 token 启动一个网关监视器。来自配置的 token 优先于默认 env 回退值；否则第一个已启用账户获胜，重复账户会被报告为已禁用。
对于高级出站调用（消息工具/频道操作），该调用会使用显式的逐次调用 `token`。这适用于发送和读取/探测类操作（例如 read/search/fetch/thread/pins/permissions）。账户策略/重试设置仍来自活动运行时快照中选定的账户。
</Note>

## 推荐：设置 guild 工作区

一旦 DMs 可用，你可以把 Discord 服务器设置为一个完整工作区，让每个频道都拥有自己独立的代理会话和上下文。对于只有你和 bot 的私有服务器，这是推荐做法。

<Steps>
  <Step title="将你的服务器加入 guild 白名单">
    这会让你的代理能够在服务器上的任何频道中响应，而不仅仅是 DMs。

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

  <Step title="允许不经 @mention 的回复">
    默认情况下，你的代理只会在 guild 频道中于被 @mention 时才响应。对于私有服务器，你大概会希望它对每条消息都响应。

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

  <Step title="规划 guild 频道中的记忆">
    默认情况下，长期记忆（MEMORY.md）只会加载到 DM 会话中。Guild 频道不会自动加载 MEMORY.md。

    <Tabs>
      <Tab title="询问你的代理">
        > “当我在 Discord 频道里提问时，如果你需要 MEMORY.md 中的长期上下文，请使用 memory_search 或 memory_get。”
      </Tab>
      <Tab title="手动">
        如果你希望每个频道都共享上下文，请把稳定的说明放在 `AGENTS.md` 或 `USER.md` 中（它们会在每个会话中注入）。将长期笔记保存在 `MEMORY.md` 中，并根据需要通过 memory 工具访问它们。
      </Tab>
    </Tabs>

  </Step>
</Steps>

现在在你的 Discord 服务器上创建一些频道并开始聊天。你的代理可以看到频道名称，而且每个频道都会获得自己的隔离会话——因此你可以按需要设置 `#coding`、`#home`、`#research`，或者任何适合你工作流的频道。

## 运行模型

- Gateway 负责 Discord 连接。
- 回复路由是确定性的：Discord 入站回复会回到 Discord。
- Discord 服务器/频道元数据会作为不受信任的上下文添加到模型提示中，而不是作为用户可见的回复前缀。如果模型把这个封装复制回来，OpenClaw 会从出站回复以及后续回放上下文中剥离这些被复制的元数据。
- 默认情况下（`session.dmScope=main`），私聊会共享 agent 主会话（`agent:main:main`）。
- 服务器频道使用隔离的会话键（`agent:<agentId>:discord:channel:<channelId>`）。
- 群组 DM 默认会被忽略（`channels.discord.dm.groupEnabled=false`）。
- 原生 slash 命令会在隔离的命令会话中运行（`agent:<agentId>:discord:slash:<userId>`），同时仍会携带 `CommandTargetSessionKey` 到被路由的对话会话。
- 仅文本的 cron/heartbeat 通知发送到 Discord 时，只会使用最终、对助手可见的答案一次。若 agent 生成多个可交付载荷，媒体和结构化组件载荷仍会以多条消息发送。

## 论坛频道

Discord 论坛频道和媒体频道只接受线程帖子。OpenClaw 支持两种创建方式：

- 向论坛父频道（`channel:<forumId>`）发送消息可自动创建线程。线程标题使用消息中第一行非空内容。
- 使用 `openclaw message thread create` 可直接创建线程。对于论坛频道不要传递 `--message-id`。

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

OpenClaw 支持用于 agent 消息的 Discord components v2 容器。使用 message 工具并提供 `components` 载荷。交互结果会作为普通入站消息路由回 agent，并遵循现有的 Discord `replyToMode` 设置。

支持的块：

- `text`、`section`、`separator`、`actions`、`media-gallery`、`file`
- 操作行最多允许 5 个按钮或一个单选菜单
- 选择类型：`string`、`user`、`role`、`mentionable`、`channel`

默认情况下，组件只能使用一次。设置 `components.reusable=true` 可允许按钮、选择器和表单在过期前被多次使用。

要限制谁可以点击按钮，请在该按钮上设置 `allowedUsers`（Discord 用户 ID、标签，或 `*`）。配置后，不匹配的用户会收到一个临时拒绝提示。

组件回调默认在 30 分钟后过期。设置 `channels.discord.agentComponents.ttlMs` 可更改默认 Discord 账号的回调注册表存活时间，或者使用 `channels.discord.accounts.<accountId>.agentComponents.ttlMs` 在多账号环境中覆盖某一个账号。该值以毫秒为单位，必须是正整数，并且上限为 `86400000`（24 小时）。更长的 TTL 适用于需要按钮保持可用的审阅或审批工作流，但也会延长旧 Discord 消息仍可触发动作的窗口。优先选择最短且能满足工作流的 TTL，并在陈旧回调会令人意外时保持默认值。

`/model` 和 `/models` slash 命令会打开一个交互式模型选择器，包含提供方、模型和兼容运行时下拉菜单，以及一个 Submit 步骤。`/models add` 已弃用，现在会返回弃用消息，而不会再从聊天中注册模型。该选择器回复是临时可见的，只有发起者可以使用。Discord 下拉菜单最多只能有 25 个选项，因此当你希望选择器只显示某些提供方（例如 `openai` 或 `vllm`）的动态发现模型时，请向 `agents.defaults.models` 添加 `provider/*` 条目。

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

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `channels.discord.allowFrom` 包含 `"*"`）
    - `disabled`

    如果 DM 策略不是 open，则未知用户会被阻止（或在 `pairing` 模式下被提示配对）。

    多账号优先级：

    - `channels.discord.accounts.default.allowFrom` 只适用于 `default` 账号。
    - 对于单个账号，`allowFrom` 的优先级高于旧的 `dm.allowFrom`。
    - 当各自的 `allowFrom` 和旧的 `dm.allowFrom` 都未设置时，命名账号会继承 `channels.discord.allowFrom`。
    - 命名账号不会继承 `channels.discord.accounts.default.allowFrom`。

    旧的 `channels.discord.dm.policy` 和 `channels.discord.dm.allowFrom` 仍会为了兼容性而读取。`openclaw doctor --fix` 会在不改变访问行为的前提下，将它们迁移到 `dmPolicy` 和 `allowFrom`。

    交付时的 DM 目标格式：

    - `user:<id>`
    - `<@id>` 提及

    纯数字 ID 通常在启用了频道默认值时会被解析为频道 ID，但如果这些 ID 列在账号生效的 DM `allowFrom` 中，则会为了兼容性而被视为用户 DM 目标。

  </Tab>

  <Tab title="访问组">
    Discord DMs 和文本命令授权可以在 `channels.discord.allowFrom` 中使用动态的 `accessGroup:<name>` 条目。

    访问组名称在各消息频道之间共享。`type: "message.senders"` 用于静态组，其成员使用每个频道的常规 `allowFrom` 语法表示；当希望由 Discord 频道当前的 `ViewChannel` 受众动态定义成员时，使用 `type: "discord.channelAudience"`。共享访问组行为在此处文档中说明：[访问组](/channels/access-groups)。

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

    当使用频道受众访问组时，请为 bot 启用 Discord Developer Portal 的 **Server Members Intent**。DM 不包含 guild 成员状态，因此 OpenClaw 会在授权时通过 Discord REST 解析成员。

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

我会严格保留 Markdown/HTML 结构，只翻译可见文本和注释里的内容，然后直接给你译文。## 原生命令和命令授权

- `commands.native` 默认值为 `"auto"`，并且在 Discord 中已启用。
- 按频道覆盖：`channels.discord.commands.native`。
- `commands.native=false` 会在启动期间跳过 Discord slash 命令注册和清理。之前注册的命令在 Discord 中可能仍然可见，直到你将它们从 Discord 应用中移除。
- 原生命令授权使用与普通消息处理相同的 Discord 允许列表/策略。
- 对于未获授权的用户，命令在 Discord UI 中仍可能可见；实际执行时仍会强制 OpenClaw 授权并返回 "not authorized"。

参见 [Slash commands](/tools/slash-commands) 了解命令目录和行为。

默认 slash 命令设置：

- `ephemeral: true`

## 功能详情

<AccordionGroup>
  <Accordion title="回复标签和原生回复">
    Discord 支持代理输出中的回复标签：

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    由 `channels.discord.replyToMode` 控制：

    - `off`（默认）
    - `first`
    - `all`
    - `batched`

    注意：`off` 会禁用隐式回复线程。显式 `[[reply_to_*]]` 标签仍然会被遵守。
    `first` 总是把隐式原生回复引用附加到该轮的第一条发出的 Discord 消息上。
    `batched` 只有在入站事件是多个消息的去抖批次时，才附加 Discord 的隐式原生回复引用。这在你希望原生回复主要用于歧义较大的突发聊天，而不是每一轮单消息时很有用。

    消息 ID 会在上下文/历史中展示，以便代理可以定位特定消息。

  </Accordion>

  <Accordion title="链接预览">
    Discord 默认会为 URL 生成富链接嵌入。OpenClaw 默认会抑制发往 Discord 的出站消息中这些自动生成的嵌入，因此代理发送的 URL 会保持为普通链接，除非你显式启用：

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

  <Accordion title="实时流预览">
    OpenClaw 可以通过发送临时消息并在文本到达时编辑它来流式输出草稿回复。`channels.discord.streaming` 支持 `off` | `partial` | `block` | `progress`（默认）。`progress` 会保留一条可编辑的状态草稿，并在工具进度更新时持续刷新，直到最终发送；共享的起始标签是一条滚动行，因此当内容足够多时它会像其余内容一样滚出视野。`streamMode` 是一个旧的运行时别名。运行 `openclaw doctor --fix` 可将持久化配置重写为规范键。

    将 `channels.discord.streaming.mode` 设为 `off` 可禁用 Discord 预览编辑。如果明确启用了 Discord block 流式输出，OpenClaw 会跳过预览流，以避免双重流式输出。

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

    - `partial` 会在 token 到达时编辑单条预览消息。
    - `block` 会发送草稿大小的分块（使用 `draftChunk` 调整大小和断点，并会被限制到 `textChunkLimit`）。
    - 媒体、错误和显式回复的最终消息会取消待处理的预览编辑。
    - `streaming.preview.toolProgress`（默认 `true`）控制工具/进度更新是否复用预览消息。
    - 工具/进度行在可用时会以紧凑的表情 + 标题 + 详情形式渲染，例如 `🛠️ Bash: run tests` 或 `🔎 Web Search: for "query"`。
    - `streaming.progress.commentary`（默认 `false`）允许把助手的评论/前言文本纳入临时进度草稿。评论在显示前会被清理，保持临时性，不会改变最终答案的发送。
    - `streaming.progress.maxLineChars` 控制每行进度预览的预算。散文会按单词边界缩短；命令和路径细节会保留有用的后缀。
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

    预览流仅支持文本；媒体回复会回退为正常发送。当明确启用 `block` 流式输出时，OpenClaw 会跳过预览流，以避免双重流式输出。

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

    - Discord 线程按频道会话路由，并继承父频道配置，除非被覆盖。
    - 线程会话继承父频道的会话级 `/model` 选择，作为仅模型的回退；线程本地的 `/model` 选择仍然优先，且除非启用历史继承，否则不会复制父转录历史。
    - `channels.discord.thread.inheritParent`（默认 `false`）会让新自动线程从父转录中初始化。按账户的覆盖位于 `channels.discord.accounts.<id>.thread.inheritParent`。
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
    - `spawnSessions` 控制 `sessions_spawn({ thread: true })` 和 ACP 线程 spawn 的自动创建/绑定线程。默认：`true`。
    - `defaultSpawnContext` 控制线程绑定 spawn 的原生子代理上下文。默认：`"fork"`。
    - 已弃用的 `spawnSubagentSessions`/`spawnAcpSessions` 键会被 `openclaw doctor --fix` 迁移。
    - 如果某个账户禁用了线程绑定，`/focus` 和相关线程绑定操作将不可用。

    参见 [Sub-agents](/tools/subagents)、[ACP Agents](/tools/acp-agents) 和 [Configuration Reference](/gateway/configuration-reference)。

  </Accordion>

  <Accordion title="持久化 ACP 频道绑定">
    对于稳定的“始终在线” ACP 工作区，请配置面向 Discord 会话的顶层类型化 ACP 绑定。

    配置路径：

    - `bindings[]`，其中 `type: "acp"` 且 `match.channel: "discord"`

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

    - `/acp spawn codex --bind here` 会就地绑定当前频道或线程，并让未来的消息保持在同一个 ACP 会话上。线程消息会继承父频道绑定。
    - 在已绑定的频道或线程中，`/new` 和 `/reset` 会就地重置同一个 ACP 会话。临时线程绑定在启用时可以覆盖目标解析。
    - `spawnSessions` 通过 `--thread auto|here` 控制子线程创建/绑定。

    参见 [ACP Agents](/tools/acp-agents) 了解绑定行为详情。

  </Accordion>

  <Accordion title="反应通知">
    每个服务器组的反应通知模式：

    - `off`
    - `own`（默认）
    - `all`
    - `allowlist`（使用 `guilds.<id>.users`）

    反应事件会被转换为系统事件并附加到路由到的 Discord 会话中。

  </Accordion>

  <Accordion title="确认反应">
    `ackReaction` 会在 OpenClaw 处理入站消息时发送一个确认表情。

    解析顺序：

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - 代理身份表情回退（`agents.list[].identity.emoji`，否则为 "👀"）

    说明：

    - Discord 接受 Unicode 表情或自定义表情名称。
    - 使用 `""` 可为频道或账户禁用该反应。

  </Accordion>

  <Accordion title="配置写入">
    默认启用由频道发起的配置写入。

    这会影响 `/config set|unset` 流程（当命令功能启用时）。

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
    通过 HTTP(S) 代理路由 Discord 网关 WebSocket 流量和启动时的 REST 查询（应用 ID + 允许列表解析），使用 `channels.discord.proxy`。

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
    - 只有当 `channels.discord.dangerouslyAllowNameMatching: true` 时，成员显示名才会按名称/slug 匹配
    - 查询使用原始消息 ID，并且受时间窗口限制
    - 如果查询失败，代理消息会被当作机器人消息并丢弃，除非 `allowBots=true`

  </Accordion>

  <Accordion title="出站提及别名">
    当代理需要对已知 Discord 用户进行确定性的出站提及时，使用 `mentionAliases`。键是不带前导 `@` 的 handle；值是 Discord 用户 ID。未知 handle、`@everyone`、`@here` 以及 Markdown 代码跨度中的提及会保持不变。

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

  <Accordion title="状态配置">
    当你设置状态或活动字段，或者启用自动状态时，会应用状态更新。

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

    - 0: Playing
    - 1: Streaming（需要 `activityUrl`）
    - 2: Listening
    - 3: Watching
    - 4: Custom（将活动文本作为状态值；表情可选）
    - 5: Competing

    自动状态示例（运行时健康信号）：

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

    自动状态会将运行时可用性映射到 Discord 状态：healthy => online，degraded 或 unknown => idle，exhausted 或 unavailable => dnd。可选文本覆盖：

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

    对于像 `/diagnostics` 和 `/export-trajectory` 这类敏感的仅 owner 组命令，OpenClaw 会私下发送审批提示和最终结果。如果调用者 owner 有 Discord owner 路由，它会优先尝试 Discord DM；如果不可用，则回退到 `commands.ownerAllowFrom` 中第一个可用的 owner 路由，例如 Telegram。

    当 `target` 为 `channel` 或 `both` 时，审批提示会在频道中可见。只有已解析出的审批者可以使用这些按钮；其他用户会收到一个临时拒绝。审批提示包含命令文本，因此只应在受信任的频道中启用频道投递。如果无法从会话键推导出频道 ID，OpenClaw 会回退为 DM 投递。

    Discord 也会渲染其他聊天渠道使用的共享审批按钮。原生 Discord 适配器主要增加了审批者 DM 路由和频道扩散。
    当这些按钮存在时，它们是主要的审批体验；只有当工具结果说明聊天审批不可用，或者手动审批是唯一路径时，OpenClaw 才应包含手动 `/approve` 命令。
    如果 Discord 原生审批运行时未激活，OpenClaw 会保留本地确定性的 `/approve <id> <decision>` 提示可见。如果运行时已激活，但无法向任何目标投递原生卡片，OpenClaw 会发送一条同聊天的回退通知，并附上待处理审批的精确 `/approve` 命令。

    网关认证和审批解析遵循共享的 Gateway 客户端契约（`plugin:` ID 通过 `plugin.approval.resolve` 解析；其他 ID 通过 `exec.approval.resolve` 解析）。审批默认在 30 分钟后过期。

    参见 [Exec approvals](/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>

我会保持原始 Markdown 结构不变，只翻译可见文本内容；代码块里的代码标识、HTML 标签/属性也会按规则保留。现在直接输出完整中文译文。## 工具与 action gate

Discord 消息动作包括消息、频道管理、审核、状态和元数据动作。

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

- `channels.discord.ui.components.accentColor` 设置 Discord 组件容器使用的强调色（十六进制）。
- 可按账号通过 `channels.discord.accounts.<id>.ui.components.accentColor` 设置。
- `channels.discord.agentComponents.ttlMs` 控制发送的 Discord component 回调保持注册的时长（默认 `1800000`，最大 `86400000`）。可按账号通过 `channels.discord.accounts.<id>.agentComponents.ttlMs` 设置。
- 当存在 components v2 时，`embeds` 会被忽略。
- 默认会抑制普通 URL 预览。如果某个外链需要展开，可在消息动作上设置 `suppressEmbeds: false`。

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

若要在加入前检查机器人的有效权限，请运行：

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

- `voice.tts` 仅在 `stt-tts` 语音播放中覆盖 `messages.tts`。实时模式使用 `voice.realtime.speakerVoice`。
- `voice.mode` 控制对话路径。默认是 `agent-proxy`：实时语音前端处理轮次时序、中断和播放，将实质工作委托给路由后的 OpenClaw agent，通过 `openclaw_agent_consult` 完成，并将结果视为来自该说话者的 Discord 文本提示。`stt-tts` 保留旧的批处理 STT + TTS 流程。`bidi` 允许实时模型直接对话，同时为 OpenClaw 大脑暴露 `openclaw_agent_consult`。
- `voice.agentSession` 控制哪一个 OpenClaw 对话接收语音轮次。若保持未设置，则使用语音频道自身的会话；也可以设置 `{ mode: "target", target: "channel:<text-channel-id>" }`，让语音频道充当现有 Discord 文本频道会话（例如 `#maintainers`）的麦克风/扬声器扩展。
- `voice.model` 会覆盖用于 Discord 语音回复和 realtime consult 的 OpenClaw agent 大脑。若不设置，则继承路由后的 agent 模型。它与 `voice.realtime.model` 是分开的。
- `voice.followUsers` 允许机器人跟随选定用户加入、移动和离开 Discord 语音。行为规则和示例见[在语音中跟随用户](#follow-users-in-voice)。
- `agent-proxy` 通过 `discord-voice` 路由语音，为说话者和目标会话保留正常的 owner/tool 授权，但会隐藏 agent 的 `tts` 工具，因为 Discord 语音负责播放。默认情况下，`agent-proxy` 会为 owner 说话者给 consult 提供完整的 owner 等价工具访问权限（`voice.realtime.toolPolicy: "owner"`），并且强烈优先在实质回答前 consult OpenClaw agent（`voice.realtime.consultPolicy: "always"`）。在默认 `always` 模式下，realtime 层不会在 consult 答案前自动播放填充语音；它会捕获并转写语音，然后播放路由后的 OpenClaw 答案。如果多个强制 consult 答案在 Discord 播放第一个答案时完成，后续的精确语音答案会排队，直到播放空闲，而不是在句子中途替换语音。
- 在 `stt-tts` 模式下，STT 使用 `tools.media.audio`；`voice.model` 不影响转写。
- 在实时模式下，`voice.realtime.provider`、`voice.realtime.model` 和 `voice.realtime.speakerVoice` 配置实时音频会话。若使用 OpenAI Realtime 2 加 Codex brain，请使用 `voice.realtime.model: "gpt-realtime-2"` 和 `voice.model: "openai/gpt-5.5"`。
- 实时语音模式会在实时 provider 指令中默认包含较小的 `IDENTITY.md`、`USER.md` 和 `SOUL.md` profile 文件，这样快速直接轮次也会保持与路由后的 OpenClaw agent 相同的身份、用户背景和人格。可将 `voice.realtime.bootstrapContextFiles` 设为其子集来自定义，或设为 `[]` 来禁用。受支持的 realtime bootstrap 文件仅限于这些 profile 文件；`AGENTS.md` 仍保留在正常 agent 上下文中。注入的 profile 上下文不会取代 `openclaw_agent_consult` 在工作区操作、当前事实、记忆查询或工具驱动动作中的作用。
- 在 OpenAI `agent-proxy` realtime 模式下，设置 `voice.realtime.requireWakeName: true` 可让 Discord realtime 语音在转写以唤醒名称开头或结尾之前保持静音。配置的唤醒名称必须是一到两个词。如果未设置 `voice.realtime.wakeNames`，OpenClaw 会使用路由后的 agent `name` 加上 `OpenClaw`，若仍不可用，则回退为 agent id 加上 `OpenClaw`。唤醒名 gate 会禁用 realtime provider 自动响应，将接受到的轮次路由到 OpenClaw agent consult 路径，并在从部分转写中识别到前导唤醒名且最终转写尚未到达时，播放一个简短的口头确认。
- OpenAI realtime provider 接受当前 Realtime 2 的事件名以及用于输出音频和转写事件的旧版 Codex 兼容别名，因此兼容的 provider 快照可以发生漂移而不会丢失 assistant 音频。
- `voice.realtime.bargeIn` 控制 Discord 说话者开始事件是否会打断正在进行的 realtime 播放。如果未设置，则沿用 realtime provider 的输入音频中断设置。
- `voice.realtime.minBargeInAudioEndMs` 控制 OpenAI realtime barge-in 截断音频前 assistant 播放的最小时长。默认值：`250`。在低回声房间中设为 `0` 可实现立即中断；或者在回声较重的扬声器环境中调高该值。
- 若要在 Discord 播放中使用 OpenAI voice，请设置 `voice.tts.provider: "openai"`，并在 `voice.tts.providers.openai.speakerVoice` 下选择一个文本转语音声音。`cedar` 是当前 OpenAI TTS 模型下一个不错的男性音色选择。
- 按频道的 Discord `systemPrompt` 覆盖会应用到该语音频道的语音转写轮次。
- 语音转写轮次会从 Discord `allowFrom`（或 `dm.allowFrom`）继承 owner 状态，用于 owner-gated 命令和频道动作。Agent 工具可见性遵循所路由会话配置的 tool policy。
- Discord 语音对纯文本配置是可选启用的；设置 `channels.discord.voice.enabled=true`（或保留现有的 `channels.discord.voice` 块）即可启用 `/vc` 命令、语音运行时以及 `GuildVoiceStates` gateway intent。
- `channels.discord.intents.voiceStates` 可显式覆盖 voice-state intent 订阅。若保持未设置，则该 intent 会随有效语音启用状态变化。
- 如果 `voice.autoJoin` 对同一个 guild 有多条条目，OpenClaw 会加入该 guild 中最后配置的频道。
- `voice.allowedChannels` 是一个可选的驻留 allowlist。保持未设置则允许 `/vc join` 加入任何授权的 Discord 语音频道。设置后，`/vc join`、启动时自动加入以及机器人 voice-state 移动都会被限制在列出的 `{ guildId, channelId }` 条目中。将其设为空数组可拒绝所有 Discord 语音加入。如果 Discord 将机器人移出 allowlist 之外，OpenClaw 会离开该频道，并在有可用目标时重新加入配置的 auto-join 目标。
- `voice.daveEncryption` 和 `voice.decryptionFailureTolerance` 会透传给 `@discordjs/voice` 的 join 选项。
- 如果未设置，`@discordjs/voice` 的默认值为 `daveEncryption=true` 和 `decryptionFailureTolerance=24`。
- OpenClaw 为 Discord 语音接收和实时原始 PCM 播放使用内置的 `libopus-wasm` 编解码器。它自带固定版本的 libopus WebAssembly 构建，不需要原生 opus 插件。
- `voice.connectTimeoutMs` 控制 `/vc join` 和自动加入尝试时 `@discordjs/voice` 的初始 Ready 等待时间。默认值：`30000`。
- `voice.reconnectGraceMs` 控制 OpenClaw 在销毁一个已断开连接的语音会话之前，等待其开始重连的时长。默认值：`15000`。
- 在 `stt-tts` 模式下，只因为其他用户开始说话并不会停止语音播放。为避免反馈回路，OpenClaw 会在 TTS 播放时忽略新的语音捕获；请在播放结束后再说下一轮。实时模式会将说话者开始作为 barge-in 信号传给 realtime provider。
- 在实时模式下，扬声器回声进入开放麦克风可能会被视作 barge-in 并中断播放。对于回声较重的 Discord 房间，请设置 `voice.realtime.providers.openai.interruptResponseOnInputAudio: false`，以防 OpenAI 因输入音频自动中断。如果你仍希望 Discord 的说话开始事件能中断正在进行的播放，再添加 `voice.realtime.bargeIn: true`。OpenAI realtime bridge 会将短于 `voice.realtime.minBargeInAudioEndMs` 的播放截断视为可能的回声/噪音并忽略，在日志中标记为 skipped，而不是清除 Discord 播放。
- `voice.captureSilenceGraceMs` 控制 OpenClaw 在 Discord 报告说话者停止后，等待多长时间才将该音频片段定稿用于 STT。默认值：`2000`；如果 Discord 把正常停顿切分成断续的部分转写，可调高此值。
- 当 ElevenLabs 是选定的 TTS provider 时，Discord 语音播放会使用流式 TTS，并从 provider 响应流开始播放。不支持流式的 provider 会回退到合成临时文件路径。
- OpenClaw 还会监视接收解密失败，并在短时间内多次失败后通过离开/重新加入语音频道来自恢复。
- 如果接收日志在更新后反复显示 `DecryptionFailed(UnencryptedWhenPassthroughDisabled)`，请收集依赖报告和日志。内置的 `@discordjs/voice` 版本包含来自 discord.js PR #11449 的上游 padding 修复，该修复关闭了 discord.js issue #11419。
- `The operation was aborted` 接收事件在 OpenClaw 完成一个已捕获的说话者片段时是预期行为；它们是详细诊断信息，不是警告。
- 详细的 Discord 语音日志会为每个被接受的说话者片段包含一个有界的一行 STT 转写预览，因此调试时可以同时看到用户侧和 agent 回复侧，而不会输出无限增长的转写文本。
- 在 `agent-proxy` 模式下，强制 consult 回退会跳过那些看起来不完整的转写片段，例如以 `...` 结尾的文本，或以 `and` 之类的尾随连接词结尾的文本，以及明显不可执行的结束语，如“马上回来”或“再见”。当这能防止旧的排队答案时，日志会显示 `forced agent consult skipped reason=...`。

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

    - 检查 `groupPolicy`
    - 检查 `channels.discord.guilds` 下的 guild allowlist
    - 如果存在 guild `channels` map，则只允许列表中的 channel
    - 检查 `requireMention` 的行为和 mention 模式

    有用的检查：

```bash
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

  </Accordion>

  <Accordion title="Require mention 为 false，但仍被阻止">
    常见原因：

    - `groupPolicy="allowlist"`，但没有匹配的 guild/channel allowlist
    - `requireMention` 配置在了错误的位置（必须在 `channels.discord.guilds` 或 channel 条目下）
    - 发送者被 guild/channel `users` allowlist 阻止

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
        mantis: {
          // Mantis 只在其他 bot mention 她时才会监听。
          allowBots: "mentions",
        },
        molty: {
          // Molty 会监听所有 bot 发送的 Discord 消息。
          allowBots: true,
          mentionAliases: {
            // 让 Molty 使用配置的 user id 写出 Mantis 的 Discord mention。
            Mantis: "MANTIS_DISCORD_USER_ID",
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

- 启动/认证：`enabled`、`token`、`accounts.*`、`allowBots`
- 策略：`groupPolicy`、`dm.*`、`guilds.*`、`guilds.*.channels.*`
- 命令：`commands.native`、`commands.useAccessGroups`、`configWrites`、`slashCommand.*`
- 事件队列：`eventQueue.listenerTimeout`（listener 预算）、`eventQueue.maxQueueSize`、`eventQueue.maxConcurrency`
- gateway：`gatewayInfoTimeoutMs`、`gatewayReadyTimeoutMs`、`gatewayRuntimeReadyTimeoutMs`
- 回复/历史：`replyToMode`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`
- 投递：`textChunkLimit`、`chunkMode`、`maxLinesPerMessage`
- 流式：`streaming`（旧别名：`streamMode`）、`streaming.preview.toolProgress`、`draftChunk`、`blockStreaming`、`blockStreamingCoalesce`
- 媒体/重试：`mediaMaxMb`（限制 outbound Discord 上传，默认 `100MB`）、`retry`
- 动作：`actions.*`
- 状态：`activity`、`status`、`activityType`、`activityUrl`
- UI：`ui.components.accentColor`
- 功能：`threadBindings`、顶层 `bindings[]`（`type: "acp"`）、`pluralkit`、`execApprovals`、`intents`、`agentComponents.enabled`、`agentComponents.ttlMs`、`heartbeat`、`responsePrefix`

</Accordion>

## 安全与运维

- 将 bot token 视为密钥（在受管环境中优先使用 `DISCORD_BOT_TOKEN`）。
- 赋予最小权限的 Discord 权限。
- 如果命令部署/状态已过期，重启 gateway 并用 `openclaw channels status --probe` 重新检查。

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