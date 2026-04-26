---
summary: "Discord 机器人支持状态、功能和配置"
read_when:
  - 处理 Discord 频道功能时
title: "Discord"
---

准备好通过官方 Discord 网关接收私信和公会频道消息。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/channels/pairing">
    Discord 私信默认启用配对模式。
  </Card>
  <Card title="斜线命令" icon="terminal" href="/tools/slash-commands">
    原生命令行为及命令目录。
  </Card>
  <Card title="频道故障排除" icon="wrench" href="/channels/troubleshooting">
    跨频道诊断与修复流程。
  </Card>
</CardGroup>

## 快速设置

你需要创建一个新的应用程序和机器人，将机器人添加到服务器，并将其配对到 OpenClaw。建议将机器人添加到你自己的私有服务器。如果还没有服务器，请先 [创建一个](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server)（选择**创建我的专属服务器 > 为我和我的朋友**）。

<Steps>
  <Step title="创建 Discord 应用程序和机器人">
    访问 [Discord 开发者门户](https://discord.com/developers/applications) 并点击 **新应用**。命名为类似"OpenClaw"。

    点击侧边栏中的 **机器人**。将 **用户名** 设置为你的 OpenClaw 代理名称。

  </Step>

  <Step title="启用特权 intents">
    仍在 **机器人** 页面，向下滚动到 **特权网关 Intents** 并启用：

    - **消息内容意图**（必需）
    - **服务器成员意图**（建议；角色白名单和名称到 ID 匹配所需）
    - **在线状态意图**（可选；仅在需要在线状态更新时启用）

  </Step>

  <Step title="复制你的机器人令牌">
    回到 **机器人** 页面顶部，点击 **重置令牌**。

    <Note>
    尽管命名为“重置”，实际上是生成你的第一个令牌——并没有真正“重置”。
    </Note>

    复制令牌并妥善保存。这是你的**机器人令牌**，稍后需要使用。

  </Step>

  <Step title="生成邀请链接并将机器人添加到服务器">
    点击侧边栏的 **OAuth2**。你将生成具备正确权限的邀请链接以添加机器人到服务器。

    向下滚动至 **OAuth2 URL 生成器**，启用：

    - `bot`
    - `applications.commands`

    下面会出现 **机器人权限** 部分。至少启用：

    **通用权限**
      - 查看频道
    **文本权限**
      - 发送消息
      - 读取消息历史
      - 嵌入链接
      - 附加文件
      - 添加反应（可选）

    这是普通文本频道的基础权限集。如果你计划在 Discord 线程中发帖，包括创建或继续线程的论坛或媒体频道工作流，还需要启用 **在线程中发送消息**。
    复制底部生成的 URL，粘贴到浏览器中，选择你的服务器，然后点击 **继续** 进行连接。现在你应该能在 Discord 服务器中看到你的机器人了。

  </Step>

  <Step title="启用开发者模式并收集 ID">
    返回 Discord 应用，需启用开发者模式以便复制内部 ID。

    1. 点击 **用户设置**（头像旁齿轮图标）→ **高级** → 打开 **开发者模式**
    2. 右击侧边栏的**服务器图标**→**复制服务器 ID**
    3. 右击你的**头像**→**复制用户 ID**

    保存你的**服务器 ID**和**用户 ID**，以及机器人令牌 —— 下一步将发送这三个信息给 OpenClaw。

  </Step>

  <Step title="允许服务器成员发送私信">
    为了配对生效，Discord 需要允许机器人给你发私信。右击**服务器图标**→**隐私设置**→启用**私信**。

    这允许服务器成员（包括机器人）向你发送私信。若想用 OpenClaw 的 Discord 私信功能，请保持开启。若只打算使用公会频道，配对完成后可以关闭私信。

  </Step>

  <Step title="安全设置你的机器人令牌（不要在聊天中发送）">
    你的 Discord 机器人令牌是秘密（如同密码）。在消息发送给你的代理之前，请在运行 OpenClaw 的机器上设置它。

```bash
export DISCORD_BOT_TOKEN="YOUR_BOT_TOKEN"
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN --dry-run
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
openclaw config set channels.discord.enabled true --strict-json
openclaw gateway
```

    如果 OpenClaw 已作为后台服务运行，请通过 OpenClaw Mac 应用重启它，或停止并重新启动 openclaw gateway run 进程。

  </Step>

  <Step title="配置 OpenClaw 并配对">

    <Tabs>
      <Tab title="向代理询问">
        在任何已有频道（如 Telegram）与 OpenClaw 代理聊天并告知。如果 Discord 是你的第一个频道，请使用 CLI / 配置标签页。

        > "我已经在配置中设置了 Discord 机器人令牌。请用用户 ID `<user_id>` 和服务器 ID `<server_id>` 完成 Discord 设置。"
      </Tab>
      <Tab title="CLI / 配置">
        如果偏好基于文件的配置，设置：

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

        默认账号的环境变量回退：

```bash
DISCORD_BOT_TOKEN=...
```

        支持明文 `token` 值。`channels.discord.token` 也支持跨 env/file/exec 提供程序的 SecretRef 值。请参阅 [密钥管理](/gateway/secrets)。

      </Tab>
    </Tabs>

  </Step>

  <Step title="批准首次私信配对">
    等待网关运行，然后在 Discord 中私信你的机器人。它会回复一个配对码。

    <Tabs>
      <Tab title="向代理询问">
        将配对码发送给你现有频道的代理：

        > "批准此 Discord 配对码：`<CODE>`"
      </Tab>
      <Tab title="CLI">

```bash
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```

      </Tab>
    </Tabs>

    配对码 1 小时后过期。

    现在你应该可以通过私信在 Discord 与代理聊天了。

  </Step>
</Steps>

<Note>
Token 解析是账户感知的。配置中的 token 值优先于环境变量回退。`DISCORD_BOT_TOKEN` 仅用于默认账户。
对于高级出站调用（消息工具/频道操作），每次调用会使用显式的 `token`。这适用于发送和读取/探测式操作（例如 read/search/fetch/thread/pins/permissions）。账户策略/重试设置仍来自活动运行时快照中选定的账户。
</Note>

## 推荐：设置公会工作区

私信功能正常后，你可以将 Discord 服务器设置为完整工作区，每个频道都有自己的代理会话和上下文。建议在只有你和机器人使用的私有服务器上这样做。

<Steps>
  <Step title="将服务器加入公会白名单">
    允许你的代理在服务器中任意频道响应，而不仅限私信。

    <Tabs>
      <Tab title="向代理询问">
        > "将我的 Discord 服务器 ID `<server_id>` 添加到公会白名单"
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

  <Step title="允许无需 @提及即可响应">
    默认情况下，代理只有在公会频道被 @提及时才会响应。对私有服务器来说，通常希望它响应每条消息。

    <Tabs>
      <Tab title="向代理询问">
        > "允许我的代理在此服务器响应而无需被 @提及"
      </Tab>
      <Tab title="配置">
        在公会配置中将 `requireMention` 设置为 `false`：

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

      </Tab>
    </Tabs>

  </Step>

  <Step title="公会频道内的记忆规划">
    默认情况下，长期记忆（MEMORY.md）只在私信会话加载。公会频道不会自动加载 MEMORY.md。

    <Tabs>
      <Tab title="向代理询问">
        > "在 Discord 频道提问时，如需长期上下文，请使用 memory_search 或 memory_get 从 MEMORY.md 调用。"
      </Tab>
      <Tab title="手册">
        如果希望在每个频道共享上下文，请把稳定指令放在 `AGENTS.md` 或 `USER.md`（它们会注入每个会话）。长期笔记保存在 `MEMORY.md`，通过记忆工具按需访问。
      </Tab>
    </Tabs>

  </Step>
</Steps>

现在你可以在 Discord 服务器创建频道并开始对话。代理能看到频道名，每个频道拥有独立会话 — 你可以设立 `#coding`、`#home`、`#research` 等，以契合你的工作流程。

## 运行时模型

- 网关拥有 Discord 连接。
- 回复路由确定：Discord 收到的回复回传到 Discord。
- 默认 (`session.dmScope=main`)，私信对话共享代理主会话 (`agent:main:main`)。
- 公会频道为隔离会话键 (`agent:<agentId>:discord:channel:<channelId>`)。
- 默认忽略群体私信 (`channels.discord.dm.groupEnabled=false`)。
- 原生斜线命令在隔离的命令会话中运行 (`agent:<agentId>:discord:slash:<userId>`) ，同时携带 `CommandTargetSessionKey` 以路由至对话会话。

## 论坛频道

Discord 论坛及媒体频道只接受主题贴。OpenClaw 支持两种创建方式：

- 向论坛父频道 (`channel:<forumId>`) 发送消息将自动创建主题。主题标题采用消息的第一行非空内容。
- 使用 `openclaw message thread create` 直接创建主题。论坛频道请勿传递 `--message-id`。

示例：向论坛父频道发送消息创建主题

```bash
openclaw message send --channel discord --target channel:<forumId> \
  --message "话题标题\n帖子内容"
```

示例：显式创建论坛主题

```bash
openclaw message thread create --channel discord --target channel:<forumId> \
  --thread-name "话题标题" --message "帖子内容"
```

论坛父频道不支持 Discord 组件。若需组件，请发到主题本身 (`channel:<threadId>`)。

## 交互组件

OpenClaw 支持 Discord 组件 v2 容器用于代理消息。使用消息工具并传递 `components` 负载。交互结果会作为普通入站消息路由回代理，遵循现有 Discord 的 `replyToMode` 设置。

支持的块类型：

- `text`，`section`，`separator`，`actions`，`media-gallery`，`file`
- 操作行可包含最多 5 个按钮或单个选择菜单
- 选择类型：`string`，`user`，`role`，`mentionable`，`channel`

默认组件只能单次使用。设置 `components.reusable=true` 允许按钮、选择菜单和表单多次使用直到过期。

限制点击者可通过在按钮上设置 `allowedUsers`（Discord 用户 ID、标签或 `*`）实现。配置后，非匹配用户会收到临时拒绝提示。

The `/model` and `/models` slash commands open an interactive model picker with provider, model, and compatible runtime dropdowns plus a Submit step. `/models add` is deprecated and now returns a deprecation message instead of registering models from chat. The picker reply is ephemeral and only the invoking user can use it.

文件附件：

- `file` 块必须指向附件引用 (`attachment://`)
- 通过 `media`/`path`/`filePath` 提供附件（单文件）；多文件使用 `media-gallery`
- 使用 `filename` 覆盖上传名以匹配附件引用

模态表单：

- 添加 `components.modal` 允许最多 5 个字段
- 字段类型：`text`，`checkbox`，`radio`，`select`，`role-select`，`user-select`
- OpenClaw 会自动添加触发按钮

示例：

```json5
{
  channel: "discord",
  action: "send",
  to: "channel:123456789012345678",
  message: "可选回退文本",
  components: {
    reusable: true,
    text: "选择路径",
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
        { type: "text", label: "请求者" },
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
  <Tab title="私信策略">
    `channels.discord.dmPolicy` 控制私信访问（旧名：`channels.discord.dm.policy`）：

    - `pairing`（默认）
    - `allowlist`
    - `open`（需要 `channels.discord.allowFrom` 包含 `"*"`；旧名：`channels.discord.dm.allowFrom`）
    - `disabled`

    非开放模式下，未知用户被阻止（或在 `pairing` 模式提示配对）。

    多账户优先级：

    - `channels.discord.accounts.default.allowFrom` 仅适用于默认账户。
    - 命名账户继承 `channels.discord.allowFrom`，若自身无设置。
    - 命名账户不继承 `channels.discord.accounts.default.allowFrom`。

    私信目标格式：

    - `user:<id>`
    - `<@id>` 提及格式

    裸数 ID 模糊且被拒，除非显式指定用户或频道目标种类。

  </Tab>

  <Tab title="公会策略">
    公会处理由 `channels.discord.groupPolicy` 控制：

    - `open`
    - `allowlist`
    - `disabled`

    `channels.discord` 存在时安全基线为 `allowlist`。

    `allowlist` 行为：

    - 公会必须匹配 `channels.discord.guilds`（首选 id，也支持 slug）
    - 可选的发送者白名单：`users`（推荐稳定 ID）和 `roles`（仅角色 ID）；任一设定时，发送者需匹配 `users` 或 `roles`
    - 默认禁用直接名称/标签匹配；仅在紧急兼容模式下启用 `channels.discord.dangerouslyAllowNameMatching: true`
    - `users` 支持名称/标签匹配，但 ID 更安全；`openclaw security audit` 会警告使用名称/标签
    - 公会配置有 `channels` 映射时，未列频道不允许
    - 无频道块时，允许该公会所有频道

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

    仅设置 `DISCORD_BOT_TOKEN`，无 `channels.discord` 块时，运行时回退为 `groupPolicy="allowlist"`（日志有警告），即使 `channels.defaults.groupPolicy` 设为 `open`。

  </Tab>

  <Tab title="提及与群体私信">
    默认公会消息需要提及。

    提及检测包括：

    - 明确 @机器人
    - 配置的提及模式（`agents.list[].groupChat.mentionPatterns`，后备 `messages.groupChat.mentionPatterns`）
    - 支持的情况下隐式回复机器人行为

    `requireMention` 于公会/频道级别配置（`channels.discord.guilds...`）。
    `ignoreOtherMentions` 可丢弃未 @ 机器人但 @ 其他用户/角色的消息（不包括 @everyone/@here）。

    群体私信：

    - 默认忽略 (`dm.groupEnabled=false`)
    - 可选的群体频道白名单 `dm.groupChannels`（频道 ID 或 slug）

  </Tab>
</Tabs>

### 基于角色的代理路由

使用 `bindings[].match.roles` 按角色 ID 将 Discord 公会成员路由至不同代理。基于角色的绑定仅接受角色 ID，优先级低于 peer 或 parent-peer 绑定，高于仅公会绑定。如果绑定同时设置多个匹配字段（如 `peer` + `guildId` + `roles`），则所有字段须匹配。

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

## Native commands and command auth

- `commands.native` 默认 `"auto"`，Discord 启用。
- 可针对频道覆盖：`channels.discord.commands.native`。
- `commands.native=false` 显式取消注册 Discord 原生命令。
- 原生命令授权使用与正常消息处理相同的 Discord 白名单/政策。
- 命令可能在 Discord UI 中对未授权用户仍可见；执行时仍强制 OpenClaw 授权且返回“未授权”消息。

查看 [斜线命令](/tools/slash-commands) 了解命令目录及行为。

默认斜线命令设置：

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

    注意：`off` 禁用隐式回复线程。显式的 `[[reply_to_*]]` 标签仍会被遵循。
    `first` 总是将隐式原生回复引用附加到该轮次的第一条出站 Discord 消息。
    `batched` 仅当入站轮次是多个消息的去重批次时，才附加 Discord 的隐式原生回复引用。当你主要希望针对模糊的突发聊天使用原生回复，而不是每一轮单消息对话时，这很有用。

    消息 ID 会在上下文/历史中提供，供代理指向特定消息。

  </Accordion>

  <Accordion title="Live stream preview">
    OpenClaw 可以通过发送一条临时消息并在文本到达时编辑它来流式预览草稿回复。`channels.discord.streaming` 可取 `off`（默认）| `partial` | `block` | `progress`。`progress` 在 Discord 上映射为 `partial`；`streamMode` 是旧别名，会自动迁移。

    默认保持 `off`，因为当多个机器人或网关共享一个账户时，Discord 预览编辑会很快触发速率限制。

```json5
{
  channels: {
    discord: {
      streaming: "block",
      draftChunk: {
        minChars: 200,
        maxChars: 800,
        breakPreference: "paragraph",
      },
    },
  },
}
```

    - `partial` 在令牌到达时编辑单条预览消息。
    - `block` 发送草稿大小的分块（使用 `draftChunk` 调整大小和断点，并会被限制到 `textChunkLimit`）。
    - 媒体、错误和显式回复最终结果会取消待处理的预览编辑。
    - `streaming.preview.toolProgress`（默认 `true`）控制工具/进度更新是否复用预览消息。

    预览流仅支持文本；媒体回复会回退到正常投递。当显式启用 `block` 流式传输时，OpenClaw 会跳过预览流以避免重复流式输出。

  </Accordion>

  <Accordion title="历史、上下文与线程行为">
    公会历史上下文：

    - `channels.discord.historyLimit` 默认 `20`
    - 后备：`messages.groupChat.historyLimit`
    - 设 `0` 以禁用

    私信历史控制：

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    线程行为：

    - Discord threads route as channel sessions and inherit parent channel config unless overridden.
    - `channels.discord.thread.inheritParent` (default `false`) opts new auto-threads into seeding from the parent transcript. Per-account overrides live under `channels.discord.accounts.<id>.thread.inheritParent`.
    - Message-tool reactions can resolve `user:<id>` DM targets.
    - `guilds.<guild>.channels.<channel>.requireMention: false` is preserved during reply-stage activation fallback.

    Channel topics are injected as **untrusted** context. Allowlists gate who can trigger the agent, not a full supplemental-context redaction boundary.

  </Accordion>

  <Accordion title="线程绑定会话支持子代理">
    Discord 可将线程绑定到会话目标，线程内后续消息保留同会话（含子代理会话）。

    命令：

    - `/focus <target>` 绑定当前/新线程至子代理/会话目标
    - `/unfocus` 解除当前线程绑定
    - `/agents` 显示活跃运行及绑定状态
    - `/session idle <duration|off>` 查看/更新空闲自动取消绑定
    - `/session max-age <duration|off>` 查看/更新最大绑定时长

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
        spawnSubagentSessions: false, // 需选择加入
      },
    },
  },
}
```

    说明：

    - `session.threadBindings.*` 设全局默认值。
    - `channels.discord.threadBindings.*` 覆盖 Discord 行为。
    - `spawnSubagentSessions` 必须为 true，才会为 `sessions_spawn({ thread: true })` 自动创建/绑定线程。
    - `spawnAcpSessions` 必须为 true，才会为 ACP (`/acp spawn ... --thread ...` 或 `sessions_spawn({ runtime: "acp", thread: true })`) 自动创建/绑定线程。
    - 若账号禁用线程绑定，`/focus` 及相关线程绑定操作不可用。

    详见 [子代理](/tools/subagents)、[ACP 代理](/tools/acp-agents) 和 [配置参考](/gateway/configuration-reference)。

  </Accordion>

  <Accordion title="持久 ACP 频道绑定">
    对于稳定“常驻”ACP 工作区，可配置顶层 Typed ACP 绑定目标为 Discord 会话。

    配置路径：

    - `bindings[]`，`type: "acp"`，`match.channel: "discord"`

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

    - `/acp spawn codex --bind here` 会就地绑定当前频道或线程，并使后续消息继续使用同一个 ACP 会话。线程消息会继承父频道绑定。
    - 在已绑定的频道或线程中，`/new` 和 `/reset` 会就地重置同一个 ACP 会话。临时线程绑定在激活时可以覆盖目标解析。
    - 只有在 OpenClaw 需要通过 `--thread auto|here` 创建/绑定子线程时，才需要 `spawnAcpSessions`。

    详见 [ACP 代理](/tools/acp-agents) 绑定详细行为。

  </Accordion>

  <Accordion title="表情反应通知">
    按公会配置表情反应通知模式：

    - `off`
    - `own`（默认）
    - `all`
    - `allowlist`（使用 `guilds.<id>.users`）

    表情事件转为系统事件，附加至路由的 Discord 会话。

  </Accordion>

  <Accordion title="确认反应">
    `ackReaction` 在 OpenClaw 处理中入站消息时发送确认表情。

    解析顺序：

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - 代理身份表情回退（`agents.list[].identity.emoji`，否则为 "👀"）

    说明：

    - Discord 支持 Unicode 或自定义表情名。
    - 用 `""` 禁用指定频道或账户的确认表情。

  </Accordion>

  <Accordion title="配置写入">
    默认启用频道发起的配置写入。

    这影响启用命令功能时的 `/config set|unset` 流程。

    禁用示例：

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
    通过 HTTP(S) 代理代理 Discord 网关 WebSocket 流量和启动 REST 查询（应用 ID + 白名单）。

```json5
{
  channels: {
    discord: {
      proxy: "http://proxy.example:8080",
    },
  },
}
```

    可针对单账户覆盖：

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
    启用 PluralKit 解析，将代理消息映射至系统成员身份：

```json5
{
  channels: {
    discord: {
      pluralkit: {
        enabled: true,
        token: "pk_live_...", // 可选，私有系统需提供
      },
    },
  },
}
```

    说明：

    - 白名单中可使用 `pk:<memberId>`
    - 成员显示名仅名称/slug 匹配时需开启 `channels.discord.dangerouslyAllowNameMatching: true`
    - 通过原始消息 ID 进行查询，受时间窗限制
    - 查询失败则将代理消息视为机器人消息丢弃，除非 `allowBots=true`

  </Accordion>

  <Accordion title="在线状态配置">
    设置状态或活动字段启用在线状态更新，或者启用自动在线状态。

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

    活动示例（自定义状态为默认类型）：

```json5
{
  channels: {
    discord: {
      activity: "专注时间",
      activityType: 4,
    },
  },
}
```

    流媒体示例：

```json5
{
  channels: {
    discord: {
      activity: "直播编程",
      activityType: 1,
      activityUrl: "https://twitch.tv/openclaw",
    },
  },
}
```

    活动类型映射：

    - 0：游戏中
    - 1：直播中（需要 `activityUrl`）
    - 2：听着
    - 3：观看
    - 4：自定义（状态使用活动文本，表情可选）
    - 5：竞赛中

    自动在线示例（运行时健康信号）：

```json5
{
  channels: {
    discord: {
      autoPresence: {
        enabled: true,
        intervalMs: 30000,
        minUpdateIntervalMs: 15000,
        exhaustedText: "令牌耗尽",
      },
    },
  },
}
```

    自动在线将运行时可用性映射至 Discord 状态：健康 => 在线，降级或未知 => 闲置，耗尽或不可用 => 请勿打扰。可用文本覆盖：

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText`（支持 `{reason}` 占位符）

  </Accordion>

  <Accordion title="Discord 中的审批">
    Discord 支持在私信中基于按钮的审批处理，并可选择在原始频道中发布审批提示。

    配置路径：

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers` (可选；可能时回退到 `commands.ownerAllowFrom`)
    - `channels.discord.execApprovals.target` (`dm` | `channel` | `both`，默认：`dm`)
    - `agentFilter`, `sessionFilter`, `cleanupAfterResolve`

    当 `enabled` 未设置或为 `"auto"` 且至少可以解析出一个审批者（来自 `execApprovals.approvers` 或 `commands.ownerAllowFrom`）时，Discord 会自动启用原生执行审批。Discord 不会从频道 `allowFrom`、遗留的 `dm.allowFrom` 或直接消息 `defaultTo` 推断执行审批者。设置 `enabled: false` 可显式禁用 Discord 作为原生审批客户端。

    当 `target` 为 `channel` 或 `both` 时，审批提示在频道中可见。只有解析出的审批者可以使用按钮；其他用户收到临时拒绝消息。审批提示包含命令文本，因此仅在受信任的频道中启用频道交付。如果无法从会话密钥派生频道 ID，OpenClaw 将回退到 DM 交付。

    Discord 还会渲染其他聊天频道使用的共享审批按钮。原生 Discord 适配器主要添加审批者私信路由和频道分发。
    当这些按钮存在时，它们是主要的审批用户体验；仅当工具结果显示聊天审批不可用或手动审批是唯一途径时，OpenClaw 才应包含手动 `/approve` 命令。

    Gateway auth and approval resolution follow the shared Gateway client contract (`plugin:` IDs resolve through `plugin.approval.resolve`; other IDs through `exec.approval.resolve`). Approvals expire after 30 minutes by default.

    See [Exec approvals](/tools/exec-approvals).

  </Accordion>
</AccordionGroup>

## 工具和操作门控

Discord 消息操作包括消息发送、频道管理、审核、在线状态及元数据操作。

核心示例：

- 消息：`sendMessage`，`readMessages`，`editMessage`，`deleteMessage`，`threadReply`
- 表情：`react`，`reactions`，`emojiList`
- 审核：`timeout`，`kick`，`ban`
- 在线状态：`setPresence`

The `event-create` action accepts an optional `image` parameter (URL or local file path) to set the scheduled event cover image.

Action gates live under `channels.discord.actions.*`.

默认门控行为：

| 操作组                                                                                                                                                                   | 默认 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| reactions, messages, threads, pins, polls, search, memberInfo, roleInfo, channelInfo, channels, voiceStatus, events, stickers, emojiUploads, stickerUploads, permissions | 启用 |
| roles                                                                                                                                                                    | 禁用 |
| moderation                                                                                                                                                               | 禁用 |
| presence                                                                                                                                                                 | 禁用 |

## 组件 v2 UI

OpenClaw 使用 Discord 组件 v2 进行执行批准和跨上下文标记。Discord 消息操作也可以接受 `components` 用于自定义 UI（高级；需要通过 discord 工具构建组件负载），而传统的 `embeds` 仍然可用但不推荐使用。

- `channels.discord.ui.components.accentColor` 设置 Discord 组件容器的强调色（十六进制）。
- 也可为账号单独设置：`channels.discord.accounts.<id>.ui.components.accentColor`。
- 存在 components v2 时忽略 `embeds`。

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

Discord 有两种不同的语音界面：实时 **语音频道**（持续对话）和 **语音消息附件**（波形预览格式）。网关同时支持两者。

### 语音频道

需求：

- 启用原生命令（`commands.native` 或 `channels.discord.commands.native`）。
- 配置 `channels.discord.voice`。
- 此机器人需在目标语音频道具备连接及发言权限。

使用 `/vc join|leave|status` 控制会话。该命令使用账号默认 agent，并遵循与其他 Discord 命令相同的 allowlist 和组策略规则。

自动加入示例：

```json5
{
  channels: {
    discord: {
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
    },
  },
}
```

说明：

- `voice.tts` 仅覆盖语音播放，不影响 `messages.tts`。
- 语音转录继承 Discord `allowFrom` 的所有者状态（或 `dm.allowFrom`）；非所有者发言者无法访问仅限所有者的工具（如 `gateway` 和 `cron`）。
- 语音默认启用。设置 `channels.discord.voice.enabled=false` 以禁用。
- `voice.daveEncryption` 和 `voice.decryptionFailureTolerance` 映射至 `@discordjs/voice` 加入选项。
- 未设置时，`@discordjs/voice` 默认 `daveEncryption=true` 和 `decryptionFailureTolerance=24`。
- OpenClaw 会监控接收解密失败，失败频繁则自动离开/重新加入频道尝试恢复。
- 若日志反复出现 `DecryptionFailed(UnencryptedWhenPassthroughDisabled)`，可能是上游 `@discordjs/voice` 缺陷，详见 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419)。

### 语音消息

Discord 语音消息会显示波形预览，并要求 OGG/Opus 音频。OpenClaw 会自动生成波形，但需要网关主机上的 `ffmpeg` 和 `ffprobe` 来检查和转换。

- 提供**本地文件路径**（不接受 URL）。
- 省略文本内容（Discord 会拒绝在同一载荷中同时包含文本和语音消息）。
- 接受任意音频格式；OpenClaw 会在需要时转换为 OGG/Opus。

```bash
message(action="send", channel="discord", target="channel:123", path="/path/to/audio.mp3", asVoice=true)
```

## 故障排除

<AccordionGroup>
  <Accordion title="使用了不允许的 intents 或机器人看不到公会消息">

    - 启用消息内容意图
    - 依赖用户/成员解析时启用服务器成员意图
    - 修改 intents 后重启网关

  </Accordion>

  <Accordion title="公会消息被意外阻止">

    - 核查 `groupPolicy`
    - 核查 `channels.discord.guilds` 的公会白名单
    - 若存在公会 `channels` 映射，仅允许列出频道
    - 核查 `requireMention` 行为与提及模式

    有用的检查：

```bash
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

  </Accordion>

  <Accordion title="`requireMention` 禁用但仍被阻止">
    常见原因：

    - `groupPolicy="allowlist"` 且公会/频道白名单未匹配
    - `requireMention` 配置位置错误（应位于 `channels.discord.guilds` 或频道条目下）
    - 发送者被公会/频道 `users` 白名单阻止

  </Accordion>

  <Accordion title="长时间运行处理程序超时或回复重复">

    常见日志：

    - `Listener DiscordMessageListener timed out after 30000ms for event MESSAGE_CREATE`
    - `Slow listener detected ...`
    - `discord inbound worker timed out after ...`

    监听器超时配置：

    - 单账户：`channels.discord.eventQueue.listenerTimeout`
    - 多账户：`channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`

    工作线程超时配置：

    - 单账户：`channels.discord.inboundWorker.runTimeoutMs`
    - 多账户：`channels.discord.accounts.<accountId>.inboundWorker.runTimeoutMs`
    - 默认：`1800000`（30 分钟）；设置 `0` 以禁用

    推荐基线：

```json5
{
  channels: {
    discord: {
      accounts: {
        default: {
          eventQueue: {
            listenerTimeout: 120000,
          },
          inboundWorker: {
            runTimeoutMs: 1800000,
          },
        },
      },
    },
  },
}
```

    用 `eventQueue.listenerTimeout` 控制监听器响应延迟，用 `inboundWorker.runTimeoutMs` 控制排队代理步长的超时保护。

  </Accordion>

  <Accordion title="权限审核不匹配">
    `channels status --probe` 权限检查仅支持数字频道 ID。

    若使用 slug 作为键，运行时匹配仍可用，但探测功能无法完全验证权限。

  </Accordion>

  <Accordion title="私信和配对问题">

    - 私信被禁用：`channels.discord.dm.enabled=false`
    - 私信策略禁用：`channels.discord.dmPolicy="disabled"`（旧名：`channels.discord.dm.policy`）
    - 在 `pairing` 模式等待配对批准

  </Accordion>

  <Accordion title="机器人与机器人循环">
    默认忽略机器人发出的消息。

    若设置 `channels.discord.allowBots=true`，请使用严格提及和白名单规则避免循环行为。
    推荐使用 `channels.discord.allowBots="mentions"` 仅接受提及机器人的机器人消息。

  </Accordion>

  <Accordion title="语音 STT 出现 DecryptionFailed(...)" >

    - 保持 OpenClaw 更新（`openclaw update`）保证 Discord 语音接收恢复逻辑
    - 确认 `channels.discord.voice.daveEncryption=true`（默认）
    - 从 `channels.discord.voice.decryptionFailureTolerance=24`（上游默认）开始调优
    - 观察日志是否出现：
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - 若自动重连后仍失败，收集日志并参照 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419)

  </Accordion>
</AccordionGroup>

## 配置参考

主要参考：[配置参考 - Discord](/gateway/config-channels#discord)。

<Accordion title="高信号 Discord 字段">

- 启动/认证：`enabled`, `token`, `accounts.*`, `allowBots`
- 策略：`groupPolicy`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- 命令：`commands.native`, `commands.useAccessGroups`, `configWrites`, `slashCommand.*`
- 事件队列：`eventQueue.listenerTimeout`（监听器预算），`eventQueue.maxQueueSize`, `eventQueue.maxConcurrency`
- 入站工作线程：`inboundWorker.runTimeoutMs`
- 回复/历史：`replyToMode`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- 投递：`textChunkLimit`, `chunkMode`, `maxLinesPerMessage`
- 流式传输：`streaming`（旧别名：`streamMode`）、`streaming.preview.toolProgress`、`draftChunk`、`blockStreaming`、`blockStreamingCoalesce`
- 媒体/重试：`mediaMaxMb`（限制出站 Discord 上传，默认 `100MB`）、`retry`
- 动作：`actions.*`
- 在线状态：`activity`, `status`, `activityType`, `activityUrl`
- UI：`ui.components.accentColor`
- 功能：`threadBindings`、顶层 `bindings[]`（`type: "acp"`）、`pluralkit`、`execApprovals`、`intents`、`agentComponents`、`heartbeat`、`responsePrefix`

</Accordion>

## 安全与运维

- 将机器人令牌视为机密（受监督环境推荐使用 `DISCORD_BOT_TOKEN`）。
- 赋予最小权限的 Discord 权限。
- 如命令部署或状态信息过期，重启网关并用 `openclaw channels status --probe` 重新检查。

## 相关链接

<CardGroup cols={2}>
  <Card title="配对" icon="link" href="/channels/pairing">
    将 Discord 用户与网关配对。
  </Card>
  <Card title="群组" icon="users" href="/channels/groups">
    群聊和 allowlist 行为。
  </Card>
  <Card title="频道路由" icon="route" href="/channels/channel-routing">
    将入站消息路由给 agents。
  </Card>
  <Card title="安全" icon="shield" href="/gateway/security">
    威胁模型与加固。
  </Card>
  <Card title="多 agent 路由" icon="sitemap" href="/concepts/multi-agent">
    将公会和频道映射到 agents。
  </Card>
  <Card title="斜杠命令" icon="terminal" href="/tools/slash-commands">
    原生命令行为。
  </Card>
</CardGroup>
