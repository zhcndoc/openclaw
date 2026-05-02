---
summary: "Slack 设置与运行时行为（Socket Mode + HTTP Request URLs）"
read_when:
  - 设置 Slack 或排查 Slack socket/HTTP 模式问题
title: "Slack"
---

通过 Slack 应用集成，为 DM 和频道提供生产可用支持。默认模式为 Socket Mode；也支持 HTTP Request URLs。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/channels/pairing">
    Slack DM 默认使用配对模式。
  </Card>
  <Card title="斜杠命令" icon="terminal" href="/tools/slash-commands">
    原生命令行为与命令目录。
  </Card>
  <Card title="频道故障排查" icon="wrench" href="/channels/troubleshooting">
    跨频道诊断与修复操作手册。
  </Card>
</CardGroup>

## 快速设置

<Tabs>
  <Tab title="Socket Mode（默认）">
    <Steps>
      <Step title="创建一个新的 Slack 应用">
        在 Slack 应用设置中点击 **[创建新应用](https://api.slack.com/apps/new)** 按钮：

        - 选择 **from a manifest** 并为你的应用选择一个工作区
        - 粘贴下面的 [示例 manifest](#manifest-and-scope-checklist) 并继续创建
        - 生成带有 `connections:write` 的 **App-Level Token**（`xapp-...`）
        - 安装应用并复制显示的 **Bot Token**（`xoxb-...`）

      </Step>

      <Step title="配置 OpenClaw">

        推荐的 SecretRef 设置：

```bash
export SLACK_APP_TOKEN=xapp-...
export SLACK_BOT_TOKEN=xoxb-...
cat > slack.socket.patch.json5 <<'JSON5'
{
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      appToken: { source: "env", provider: "default", id: "SLACK_APP_TOKEN" },
      botToken: { source: "env", provider: "default", id: "SLACK_BOT_TOKEN" },
    },
  },
}
JSON5
openclaw config patch --file ./slack.socket.patch.json5 --dry-run
openclaw config patch --file ./slack.socket.patch.json5
```

        环境变量回退（仅默认账号）：

```bash
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
```

      </Step>

      <Step title="启动 gateway">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab title="HTTP Request URLs">
    <Steps>
      <Step title="创建一个新的 Slack 应用">
        在 Slack 应用设置中点击 **[创建新应用](https://api.slack.com/apps/new)** 按钮：

        - 选择 **from a manifest** 并为你的应用选择一个工作区
        - 粘贴下面的 [示例 manifest](#manifest-and-scope-checklist) 并在创建前更新 URL
        - 保存用于请求验证的 **Signing Secret**
        - 安装应用并复制显示的 **Bot Token**（`xoxb-...`）

      </Step>

      <Step title="配置 OpenClaw">

        推荐的 SecretRef 设置：

```bash
export SLACK_BOT_TOKEN=xoxb-...
export SLACK_SIGNING_SECRET=...
cat > slack.http.patch.json5 <<'JSON5'
{
  channels: {
    slack: {
      enabled: true,
      mode: "http",
      botToken: { source: "env", provider: "default", id: "SLACK_BOT_TOKEN" },
      signingSecret: { source: "env", provider: "default", id: "SLACK_SIGNING_SECRET" },
      webhookPath: "/slack/events",
    },
  },
}
JSON5
openclaw config patch --file ./slack.http.patch.json5 --dry-run
openclaw config patch --file ./slack.http.patch.json5
```

        <Note>
        多账号 HTTP 请使用唯一的 webhook 路径

        为每个账号指定不同的 `webhookPath`（默认 `/slack/events`），以免注册冲突。
        </Note>

      </Step>

      <Step title="启动 gateway">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>
</Tabs>

## Socket Mode 传输调优

OpenClaw 默认将 Slack SDK 客户端的 pong 超时设置为 15 秒，适用于 Socket Mode。仅当你需要针对工作区或主机进行特定调优时，才覆盖传输设置：

```json5
{
  channels: {
    slack: {
      mode: "socket",
      socketMode: {
        clientPingTimeout: 20000,
        serverPingTimeout: 30000,
        pingPongLoggingEnabled: false,
      },
    },
  },
}
```

仅当 Socket Mode 工作区记录了 Slack websocket pong/server-ping 超时，或运行在已知事件循环饥饿的主机上时才使用此设置。`clientPingTimeout` 是 SDK 发送客户端 ping 后等待 pong 的时间；`serverPingTimeout` 是等待 Slack 服务器 ping 的时间。应用消息和事件仍然是应用状态，而不是传输层存活信号。

## Manifest 和作用域检查清单

基础 Slack 应用 manifest 在 Socket Mode 和 HTTP Request URLs 中是相同的。只有 `settings` 块（以及斜杠命令的 `url`）不同。

基础 manifest（Socket Mode 默认）：

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "OpenClaw 的 Slack 连接器"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "向 OpenClaw 发送消息",
        "should_escape": false
      }
    ]
  },
  "oauth_config": {
    "scopes": {
      "bot": [
        "app_mentions:read",
        "assistant:write",
        "channels:history",
        "channels:read",
        "chat:write",
        "commands",
        "emoji:read",
        "files:read",
        "files:write",
        "groups:history",
        "groups:read",
        "im:history",
        "im:read",
        "im:write",
        "mpim:history",
        "mpim:read",
        "mpim:write",
        "pins:read",
        "pins:write",
        "reactions:read",
        "reactions:write",
        "users:read"
      ]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": [
        "app_home_opened",
        "app_mention",
        "channel_rename",
        "member_joined_channel",
        "member_left_channel",
        "message.channels",
        "message.groups",
        "message.im",
        "message.mpim",
        "pin_added",
        "pin_removed",
        "reaction_added",
        "reaction_removed"
      ]
    }
  }
}
```

对于 **HTTP Request URLs 模式**，将 `settings` 替换为 HTTP 变体，并为每个斜杠命令添加 `url`。需要公开 URL：

```json
{
  "features": {
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "向 OpenClaw 发送消息",
        "should_escape": false,
        "url": "https://gateway-host.example.com/slack/events"
      }
    ]
  },
  "settings": {
    "event_subscriptions": {
      "request_url": "https://gateway-host.example.com/slack/events",
      "bot_events": [
        /* 与 Socket Mode 相同 */
      ]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://gateway-host.example.com/slack/events",
      "message_menu_options_url": "https://gateway-host.example.com/slack/events"
    }
  }
}
```

### 其他 manifest 设置

启用不同功能以扩展上述默认配置。

默认 manifest 会启用 Slack App Home 的 **Home** 选项卡，并订阅 `app_home_opened`。当工作区成员打开 Home 选项卡时，OpenClaw 会使用 `views.publish` 发布一个安全的默认 Home 视图；其中不包含对话负载或私有配置。**Messages** 选项卡仍对 Slack DM 保持启用。

<AccordionGroup>
  <Accordion title="可选的原生斜杠命令">

    可以使用多个 [原生斜杠命令](#commands-and-slash-behavior) 代替单个配置命令，并带来一些细微差异：

    - 使用 `/agentstatus` 而不是 `/status`，因为 `/status` 命令已被保留。
    - 同时可用的斜杠命令不超过 25 个。

    将现有的 `features.slash_commands` 部分替换为 [可用命令](/tools/slash-commands#command-list) 的子集：

    <Tabs>
      <Tab title="Socket Mode（默认）">

```json
    "slash_commands": [
      {
        "command": "/new",
        "description": "开始一个新会话",
        "usage_hint": "[model]"
      },
      {
        "command": "/reset",
        "description": "重置当前会话"
      },
      {
        "command": "/compact",
        "description": "压缩会话上下文",
        "usage_hint": "[instructions]"
      },
      {
        "command": "/stop",
        "description": "停止当前运行"
      },
      {
        "command": "/session",
        "description": "管理线程绑定过期",
        "usage_hint": "idle <duration|off> or max-age <duration|off>"
      },
      {
        "command": "/think",
        "description": "设置思考级别",
        "usage_hint": "<level>"
      },
      {
        "command": "/verbose",
        "description": "切换详细输出",
        "usage_hint": "on|off|full"
      },
      {
        "command": "/fast",
        "description": "显示或设置快速模式",
        "usage_hint": "[status|on|off]"
      },
      {
        "command": "/reasoning",
        "description": "切换推理可见性",
        "usage_hint": "[on|off|stream]"
      },
      {
        "command": "/elevated",
        "description": "切换提升模式",
        "usage_hint": "[on|off|ask|full]"
      },
      {
        "command": "/exec",
        "description": "显示或设置 exec 默认值",
        "usage_hint": "host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>"
      },
      {
        "command": "/model",
        "description": "显示或设置模型",
        "usage_hint": "[name|#|status]"
      },
      {
        "command": "/models",
        "description": "列出提供商/模型",
        "usage_hint": "[provider] [page] [limit=<n>|size=<n>|all]"
      },
      {
        "command": "/help",
        "description": "显示简短帮助摘要"
      },
      {
        "command": "/commands",
        "description": "显示生成的命令目录"
      },
      {
        "command": "/tools",
        "description": "显示当前代理此刻可使用的内容",
        "usage_hint": "[compact|verbose]"
      },
      {
        "command": "/agentstatus",
        "description": "显示运行时状态，包括可用时的提供商使用量/配额"
      },
      {
        "command": "/tasks",
        "description": "列出当前会话的活动/最近后台任务"
      },
      {
        "command": "/context",
        "description": "解释上下文是如何组装的",
        "usage_hint": "[list|detail|json]"
      },
      {
        "command": "/whoami",
        "description": "显示你的发送者身份"
      },
      {
        "command": "/skill",
        "description": "按名称运行一个 skill",
        "usage_hint": "<name> [input]"
      },
      {
        "command": "/btw",
        "description": "在不更改会话上下文的情况下提一个附带问题",
        "usage_hint": "<question>"
      },
      {
        "command": "/usage",
        "description": "控制使用情况页脚或显示费用摘要",
        "usage_hint": "off|tokens|full|cost"
      }
    ]
```

      </Tab>
      <Tab title="HTTP Request URLs">
        使用与上方 Socket Mode 相同的 `slash_commands` 列表，并为每个条目添加 `"url": "https://gateway-host.example.com/slack/events"`。示例：

```json
    "slash_commands": [
      {
        "command": "/new",
        "description": "开始一个新会话",
        "usage_hint": "[model]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/help",
        "description": "显示简短帮助摘要",
        "url": "https://gateway-host.example.com/slack/events"
      }
      // ...对每个命令重复，`url` 值相同
    ]
```

      </Tab>
    </Tabs>

  </Accordion>
  <Accordion title="可选的作者身份作用域（写入操作）">
    如果你希望发出的消息使用当前代理身份（自定义用户名和图标），而不是默认的 Slack 应用身份，请添加 `chat:write.customize` bot scope。

    如果你使用表情符号图标，Slack 期望使用 `:emoji_name:` 语法。

  </Accordion>
  <Accordion title="可选的用户令牌作用域（读取操作）">
    如果你配置了 `channels.slack.userToken`，通常所需的读取作用域为：

    - `channels:history`, `groups:history`, `im:history`, `mpim:history`
    - `channels:read`, `groups:read`, `im:read`, `mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read`（如果你依赖 Slack 搜索读取）

  </Accordion>
</AccordionGroup>

## Token 模型

- `botToken` + `appToken` 是 Socket Mode 所必需的。
- HTTP 模式需要 `botToken` + `signingSecret`。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受明文
  字符串或 SecretRef 对象。
- 配置中的 token 会覆盖环境变量回退。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` 环境变量回退仅适用于默认账号。
- `userToken`（`xoxp-...`）仅可通过配置提供（不支持环境变量回退），默认行为为只读（`userTokenReadOnly: true`）。

状态快照行为：

- Slack 账号检查会跟踪每个凭据的 `*Source` 和 `*Status`
  字段（`botToken`、`appToken`、`signingSecret`、`userToken`）。
- 状态可以是 `available`、`configured_unavailable` 或 `missing`。
- `configured_unavailable` 表示该账号通过 SecretRef
  或其他非内联密钥来源进行了配置，但当前命令/运行时路径
  无法解析出实际值。
- 在 HTTP 模式下会包含 `signingSecretStatus`；在 Socket Mode 下，
  所需配对为 `botTokenStatus` + `appTokenStatus`。

<Tip>
对于操作/目录读取，如果已配置，user token 可以优先使用。对于写入，仍优先使用 bot token；只有在 `userTokenReadOnly: false` 且 bot token 不可用时，才允许使用 user-token 写入。
</Tip>

## 操作与门控

Slack 操作由 `channels.slack.actions.*` 控制。

当前 Slack 工具中可用的操作组：

| Group      | Default |
| ---------- | ------- |
| messages   | enabled |
| reactions  | enabled |
| pins       | enabled |
| memberInfo | enabled |
| emojiList  | enabled |

当前 Slack 消息操作包括 `send`、`upload-file`、`download-file`、`read`、`edit`、`delete`、`pin`、`unpin`、`list-pins`、`member-info` 和 `emoji-list`。`download-file` 接受入站文件占位符中显示的 Slack 文件 ID，并会针对图片返回图片预览，针对其他文件类型返回本地文件元数据。

## 访问控制与路由

<Tabs>
  <Tab title="DM policy">
    `channels.slack.dmPolicy` 控制 DM 访问。`channels.slack.allowFrom` 是规范的 DM 允许列表。

    - `pairing`（默认）
    - `allowlist`
    - `open` (需要 `channels.slack.allowFrom` 包含 `"*"`)
    - `disabled`

    DM 标志：

    - `dm.enabled` (默认 true)
    - `channels.slack.allowFrom`
    - `dm.allowFrom` (旧版)
    - `dm.groupEnabled` (群组 DM 默认 false)
    - `dm.groupChannels` (可选的 MPIM 允许列表)

    多账号优先级：

    - `channels.slack.accounts.default.allowFrom` 仅适用于 `default` 账号。
    - 当命名账号自身的 `allowFrom` 未设置时，会继承 `channels.slack.allowFrom`。
    - 命名账号不会继承 `channels.slack.accounts.default.allowFrom`。

    旧版 `channels.slack.dm.policy` 和 `channels.slack.dm.allowFrom` 仍会为兼容性读取。`openclaw doctor --fix` 会在不改变访问权限的前提下，将它们迁移到 `dmPolicy` 和 `allowFrom`。

    DMs 中的配对使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="频道策略">
    `channels.slack.groupPolicy` 控制频道处理方式：

    - `open`
    - `allowlist`
    - `disabled`

    频道允许列表位于 `channels.slack.channels` 下，并且 **必须使用稳定的 Slack 频道 ID**（例如 `C12345678`）作为配置键。

    运行时说明：如果 `channels.slack` 完全缺失（仅环境变量配置），运行时会回退到 `groupPolicy="allowlist"` 并记录警告（即使 `channels.defaults.groupPolicy` 已设置）。

    名称/ID 解析：

    - 频道允许列表项和 DM 允许列表项会在启动时、在 token 访问允许的情况下进行解析
    - 无法解析的频道名称项会保留为已配置状态，但默认会在路由中忽略
    - 入站授权和频道路由默认优先使用 ID；直接按用户名/slug 匹配需要 `channels.slack.dangerouslyAllowNameMatching: true`

    <Warning>
    基于名称的键（`#channel-name` 或 `channel-name`）在 `groupPolicy: "allowlist"` 下**不会**匹配。频道查找默认采用 ID 优先，因此基于名称的键永远不会成功路由，并且该频道中的所有消息都会被静默阻止。这与 `groupPolicy: "open"` 不同，在后者中路由不需要频道键，因此基于名称的键看起来会生效。

    请始终使用 Slack 频道 ID 作为键。查找方法：在 Slack 中右键点击频道 → **复制链接** — ID（`C...`）会出现在 URL 末尾。

    正确：

    ```json5
    {
      channels: {
        slack: {
          groupPolicy: "allowlist",
          channels: {
            C12345678: { allow: true, requireMention: true },
          },
        },
      },
    }
    ```

    错误（在 `groupPolicy: "allowlist"` 下会被静默阻止）：

    ```json5
    {
      channels: {
        slack: {
          groupPolicy: "allowlist",
          channels: {
            "#eng-my-channel": { allow: true, requireMention: true },
          },
        },
      },
    }
    ```
    </Warning>

  </Tab>

  <Tab title="提及与频道用户">
    频道消息默认受提及门控限制。

    提及来源：

    - 显式应用提及（`<@botId>`）
    - 提及正则模式（`agents.list[].groupChat.mentionPatterns`，回退到 `messages.groupChat.mentionPatterns`）
    - 对 bot 的隐式回复线程行为（当 `thread.requireExplicitMention` 为 `true` 时禁用）

    每个频道的控制项（`channels.slack.channels.<id>`；名称仅可通过启动时解析或 `dangerouslyAllowNameMatching` 使用）：

    - `requireMention`
    - `users`（允许列表）
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`、`toolsBySender`
    - `toolsBySender` 键格式：`id:`、`e164:`、`username:`、`name:`，或 `"*"` 通配符
      （旧版未加前缀的键仍然只映射到 `id:`）

    对于频道和私有频道，`allowBots` 是保守的：只有当发送 bot 的房间消息的 bot 被显式列在该房间的 `users` 允许列表中，或者 `channels.slack.allowFrom` 中至少有一个显式 Slack owner ID 当前是该房间成员时，才会接受 bot 生成的房间消息。通配符和显示名 owner 条目都不能满足 owner 存在性要求。owner 存在性使用 Slack `conversations.members`；请确保应用对该房间类型具有匹配的读取权限范围（公共频道使用 `channels:read`，私有频道使用 `groups:read`）。如果成员查询失败，OpenClaw 会丢弃该 bot 生成的房间消息。

  </Tab>
</Tabs>

## 线程、会话和回复标签

- DM 路由为 `direct`；频道为 `channel`；MPIM 为 `group`。
- 使用默认 `session.dmScope=main` 时，Slack DMs 会合并到 agent 主会话。
- 频道会话：`agent:<agentId>:slack:channel:<channelId>`。
- 在适用时，线程回复可创建线程会话后缀（`:thread:<threadTs>`）。
- `channels.slack.thread.historyScope` 默认是 `thread`；`thread.inheritParent` 默认是 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制新线程会话开始时抓取多少条现有线程消息（默认 `20`；设为 `0` 可禁用）。
- `channels.slack.thread.requireExplicitMention`（默认 `false`）：当为 `true` 时，会抑制隐式线程提及，因此 bot 只会对线程内显式的 `@bot` 提及作出响应，即使 bot 已经参与过该线程也是如此。若不启用该项，在 bot 已参与的线程中的回复会绕过 `requireMention` 门控。

回复线程控制：

- `channels.slack.replyToMode`：`off|first|all|batched`（默认 `off`）
- `channels.slack.replyToModeByChatType`：按 `direct|group|channel` 分别设置
- direct chats 的旧版回退：`channels.slack.dm.replyToMode`

支持手动回复标签：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

<Note>
`replyToMode="off"` 会禁用 Slack 中的**所有**回复线程，包括显式的 `[[reply_to_*]]` 标签。这与 Telegram 不同，Telegram 在 `"off"` 模式下仍会遵循显式标签。Slack 线程会将消息隐藏在频道中，而 Telegram 的回复会以内联方式保持可见。
</Note>

## Ack 反应

`ackReaction` 会在 OpenClaw 处理入站消息时发送一个确认表情，处理完成后移除。

解析顺序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- agent 身份表情回退（`agents.list[].identity.emoji`，否则为 `"👀"`）

说明：

- Slack 期望使用简写名（例如 `"eyes"`）。
- 可使用 `""` 来禁用该 Slack 账号或全局的反应。

## 文本流式传输

`channels.slack.streaming` 控制实时预览行为：

- `off`：禁用实时预览流式传输。
- `partial`（默认）：用最新的部分输出替换预览文本。
- `block`：追加分块预览更新。
- `progress`：在生成过程中显示进度状态文本，然后发送最终文本。
- `streaming.preview.toolProgress`：当草稿预览处于激活状态时，将工具/进度更新路由到同一条已编辑的预览消息中（默认：`true`）。设为 `false` 可保留单独的工具/进度消息。

当 `channels.slack.streaming.mode` 为 `partial` 时，`channels.slack.streaming.nativeTransport` 控制 Slack 原生文本流式传输（默认：`true`）。

- 原生文本流式传输以及 Slack assistant 线程状态的显示，都需要可用的回复线程。线程选择仍遵循 `replyToMode`。
- 当原生流式传输不可用时，频道和群聊根消息仍可使用普通草稿预览。
- 顶层 Slack DMs 默认不在线程中，因此不会显示线程样式预览；如果你希望在那里看到可见进度，请使用线程回复或 `typingReaction`。
- 媒体和非文本载荷会回退到普通投递。
- 媒体/错误最终结果会取消待处理的预览编辑；符合条件的文本/块最终结果仅在可以就地编辑预览时才会刷新。
- 如果流式传输在回复中途失败，OpenClaw 会对剩余载荷回退到普通投递。

使用草稿预览而不是 Slack 原生文本流式传输：

```json5
{
  channels: {
    slack: {
      streaming: {
        mode: "partial",
        nativeTransport: false,
      },
    },
  },
}
```

旧版键：

- `channels.slack.streamMode`（`replace | status_final | append`）会自动迁移到 `channels.slack.streaming.mode`。
- 布尔值 `channels.slack.streaming` 会自动迁移到 `channels.slack.streaming.mode` 和 `channels.slack.streaming.nativeTransport`。
- 旧版 `channels.slack.nativeStreaming` 会自动迁移到 `channels.slack.streaming.nativeTransport`。

## 输入中 typing 反应回退

`typingReaction` 会在 OpenClaw 处理回复期间向入站 Slack 消息添加一个临时反应，并在运行结束后将其移除。这在线程回复之外最有用，因为线程回复默认会使用“正在输入...”状态指示器。

解析顺序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

说明：

- Slack 期望使用简写名（例如 `"hourglass_flowing_sand"`）。
- 该反应尽力而为，回复或失败路径完成后会自动尝试清理。

## 媒体、分块与投递

<AccordionGroup>
  <Accordion title="入站附件">
    Slack 文件附件会从 Slack 托管的私有 URL 下载（使用 token 认证请求流程），并在获取成功且大小限制允许时写入媒体存储。文件占位符包含 Slack `fileId`，因此 agent 可以使用 `download-file` 获取原始文件。

    下载会使用有界的空闲超时和总超时。如果 Slack 文件检索卡住或失败，OpenClaw 会继续处理消息，并回退到文件占位符。

    运行时入站大小上限默认是 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆盖。

  </Accordion>

  <Accordion title="出站文本和文件">
    - 文本分块使用 `channels.slack.textChunkLimit`（默认 4000）
    - `channels.slack.chunkMode="newline"` 启用优先按段落拆分
    - 文件发送使用 Slack 上传 API，并可包含线程回复（`thread_ts`）
    - 若已配置，出站媒体上限遵循 `channels.slack.mediaMaxMb`；否则频道发送使用媒体管道中的 MIME 类型默认值

  </Accordion>

  <Accordion title="投递目标">
    推荐的显式目标：

    - `user:<id>` 用于 DMs
    - `channel:<id>` 用于频道

    向用户目标发送时，Slack DMs 会通过 Slack 会话 API 打开。

  </Accordion>
</AccordionGroup>

## 命令与斜杠行为

Slash 命令在 Slack 中表现为单个已配置命令或多个原生命令。配置 `channels.slack.slashCommand` 可更改命令默认值：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

```txt
/openclaw /help
```

原生命令需要在你的 Slack 应用中添加 [额外的 manifest 设置](#additional-manifest-settings)，并通过全局配置中的 `channels.slack.commands.native: true` 或 `commands.native: true` 启用。

- 对于 Slack，原生命令自动模式是 **关闭** 的，因此 `commands.native: "auto"` 不会启用 Slack 原生命令。

```txt
/help
```

原生参数菜单使用自适应渲染策略，在发送所选选项值之前会先显示确认模态框：

- 最多 5 个选项：按钮块
- 6-100 个选项：静态选择菜单
- 超过 100 个选项：在可用交互选项处理器时，使用带异步选项过滤的外部选择器
- 超出 Slack 限制：编码后的选项值会回退为按钮

```txt
/think
```

Slash 会话使用类似 `agent:<agentId>:slack:slash:<userId>` 的隔离键，并仍然通过 `CommandTargetSessionKey` 将命令执行路由到目标对话会话。

## 交互式回复

Slack 可以渲染由 agent 生成的交互式回复控件，但该功能默认是禁用的。

全局启用它：

```json5
{
  channels: {
    slack: {
      capabilities: {
        interactiveReplies: true,
      },
    },
  },
}
```

或仅为一个 Slack 账号启用：

```json5
{
  channels: {
    slack: {
      accounts: {
        ops: {
          capabilities: {
            interactiveReplies: true,
          },
        },
      },
    },
  },
}
```

启用后，agent 可以输出仅适用于 Slack 的回复指令：

- `[[slack_buttons: Approve:approve, Reject:reject]]`
- `[[slack_select: Choose a target | Canary:canary, Production:production]]`

这些指令会编译为 Slack Block Kit，并将点击或选择结果通过现有的 Slack 交互事件路径回传。

注意：

- 这是 Slack 专属 UI。其他渠道不会将 Slack Block Kit 指令转换为它们自己的按钮系统。
- 交互回调值是 OpenClaw 生成的不透明令牌，而不是 agent 编写的原始值。
- 如果生成的交互块会超过 Slack Block Kit 限制，OpenClaw 会回退为原始文本回复，而不是发送无效的 blocks 负载。

## Slack 中的执行审批

Slack 可以作为原生审批客户端，通过交互式按钮和交互操作来处理审批，而不是回退到 Web UI 或终端。

- 执行审批使用 `channels.slack.execApprovals.*` 进行原生 DM/频道路由。
- 当请求已经落在 Slack 中且审批 id 类型为 `plugin:` 时，插件审批仍然可以通过同一个 Slack 原生按钮界面进行处理。
- 仍会强制执行审批者授权：只有被识别为审批者的用户才能通过 Slack 批准或拒绝请求。

这使用与其他渠道相同的共享审批按钮界面。当你的 Slack 应用设置中启用了 `interactivity` 时，审批提示会直接在对话中渲染为 Block Kit 按钮。
当这些按钮存在时，它们就是主要的审批体验；只有当工具结果表明聊天审批不可用或手动审批是唯一途径时，OpenClaw
才应包含手动的 `/approve` 命令。

配置路径：

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers`（可选；在可能时回退到 `commands.ownerAllowFrom`）
- `channels.slack.execApprovals.target`（`dm` | `channel` | `both`，默认：`dm`）
- `agentFilter`, `sessionFilter`

当 `enabled` 未设置或为 `"auto"` 且至少有一个审批者被解析时，Slack 会自动启用原生执行审批。设置 `enabled: false` 可显式禁用 Slack 作为原生审批客户端。
设置 `enabled: true` 可在审批者解析成功时强制启用原生审批。

未显式配置 Slack 执行审批时的默认行为：

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

只有当你想覆盖审批者、添加过滤器，或
选择原始聊天投递时，才需要显式的 Slack 原生配置：

```json5
{
  channels: {
    slack: {
      execApprovals: {
        enabled: true,
        approvers: ["U12345678"],
        target: "both",
      },
    },
  },
}
```

共享的 `approvals.exec` 转发是独立的。只有当执行审批提示还必须
路由到其他聊天或显式的带外目标时才使用它。共享的 `approvals.plugin` 转发也同样
独立；当这些请求已经落在 Slack 中时，Slack 原生按钮仍然可以处理插件审批。

同聊 `/approve` 也可在已经支持命令的 Slack 频道和 DM 中使用。完整的审批转发模型请参见 [执行审批](/tools/exec-approvals)。

## 事件与运行行为

- 消息编辑/删除会映射为系统事件。
- 线程广播（“也发送到频道”的线程回复）会被当作普通用户消息处理。
- reaction 的添加/移除事件会映射为系统事件。
- 成员加入/离开、频道创建/重命名，以及 pin 的添加/移除事件会映射为系统事件。
- 启用 `configWrites` 时，`channel_id_changed` 可迁移频道配置键。
- 频道 topic/purpose 元数据会被视为不受信任的上下文，并可能被注入到路由上下文中。
- 线程起始消息和初始线程历史上下文种子在适用时会按配置的发送者白名单过滤。
- Block actions 和 modal 交互会发出结构化的 `Slack interaction: ...` 系统事件，并带有丰富的 payload 字段：
  - block actions：所选值、标签、选择器值，以及 `workflow_*` 元数据
  - modal `view_submission` 和 `view_closed` 事件，包含路由后的频道元数据和表单输入

## 配置参考

主要参考：[/gateway/config-channels#slack](/gateway/config-channels#slack)。

<Accordion title="高信号 Slack 字段">

- mode/auth：`mode`, `botToken`, `appToken`, `signingSecret`, `webhookPath`, `accounts.*`
- DM 访问：`dm.enabled`, `dmPolicy`, `allowFrom`（旧版：`dm.policy`, `dm.allowFrom`）, `dm.groupEnabled`, `dm.groupChannels`
- 兼容性开关：`dangerouslyAllowNameMatching`（紧急开关；除非需要，否则保持关闭）
- 频道访问：`groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`
- 线程/历史：`replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- 投递：`textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `streaming.nativeTransport`, `streaming.preview.toolProgress`
- 运维/功能：`configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

</Accordion>

## 故障排查

<AccordionGroup>
  <Accordion title="频道中没有回复">
    按以下顺序检查：

    - `groupPolicy`
    - channel allowlist (`channels.slack.channels`) — **keys must be channel IDs** (`C12345678`), not names (`#channel-name`). Name-based keys silently fail under `groupPolicy: "allowlist"` because channel routing is ID-first by default. To find an ID: right-click the channel in Slack → **Copy link** — the `C...` value at the end of the URL is the channel ID.
    - `requireMention`
    - 每个频道的 `users` 白名单

    有用的命令：

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="DM 消息被忽略">
    检查：

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy`（或旧版 `channels.slack.dm.policy`）
    - 配对审批 / 白名单条目
    - Slack Assistant DM 事件：verbose 日志中提到 `drop message_changed`
      通常意味着 Slack 发送了一个已编辑的 Assistant 线程事件，
      但消息元数据中没有可恢复的人类发送者

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket mode 未连接">
    在 Slack 应用设置中验证 bot + app token 以及 Socket Mode 是否已启用。

    如果 `openclaw channels status --probe --json` 显示 `botTokenStatus` 或
    `appTokenStatus: "configured_unavailable"`，说明 Slack 账号已
    配置，但当前运行时无法解析基于 SecretRef 的值。

  </Accordion>

  <Accordion title="HTTP mode 未接收到事件">
    验证：

    - signing secret
    - webhook path
    - Slack Request URLs（Events + Interactivity + Slash Commands）
    - 每个 HTTP 账号唯一的 `webhookPath`

    如果账号快照中出现 `signingSecretStatus: "configured_unavailable"`，
    说明 HTTP 账号已配置，但当前运行时无法
    解析基于 SecretRef 的 signing secret。

  </Accordion>

  <Accordion title="原生/slash 命令未触发">
    确认你期望的是以下哪种模式：

    - 原生命令模式（`channels.slack.commands.native: true`），并且 Slack 中注册了匹配的 slash 命令
    - 或单一 slash 命令模式（`channels.slack.slashCommand.enabled: true`）

    同时检查 `commands.useAccessGroups` 和频道/用户白名单。

  </Accordion>
</AccordionGroup>

## 附件视觉参考

当 Slack 文件下载成功且大小限制允许时，Slack 可以将已下载媒体附加到 agent 的轮次中。图片文件可以通过媒体理解路径传递，或直接传递给支持视觉的回复模型；其他文件会作为可下载的文件上下文保留，而不会被当作图像输入处理。

### 支持的媒体类型

| 媒体类型                     | 来源                 | 当前行为                                                                  | 备注                                                                     |
| ---------------------------- | -------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| JPEG / PNG / GIF / WebP 图片 | Slack 文件 URL        | 下载并附加到轮次中，以便进行支持视觉的处理                               | 单文件上限：`channels.slack.mediaMaxMb`（默认 20 MB）                 |
| PDF 文件                     | Slack 文件 URL        | 下载并作为文件上下文暴露给诸如 `download-file` 或 `pdf` 之类的工具       | Slack 入站不会自动将 PDF 转换为图像视觉输入                               |
| 其他文件                     | Slack 文件 URL        | 在可能时下载并作为文件上下文暴露                                         | 二进制文件不被当作图像输入                                               |
| 线程回复                     | 线程起始消息文件     | 当回复没有直接媒体时，可将根消息文件作为上下文注入                         | 仅文件的起始消息会使用附件占位符                                         |
| 多图消息                     | 多个 Slack 文件      | 每个文件独立评估                                                         | Slack 处理每条消息最多限制为八个文件                                     |

### 入站管道

当带有文件附件的 Slack 消息到达时：

1. OpenClaw 使用 bot token（`xoxb-...`）从 Slack 的私有 URL 下载文件。
2. 成功后，文件会写入媒体存储。
3. 下载后的媒体路径和内容类型会添加到入站上下文中。
4. 支持图像的模型/工具路径可以使用该上下文中的图像附件。
5. 非图像文件仍作为文件元数据或媒体引用供可处理它们的工具使用。

### 线程根附件继承

当消息在某个线程中到达（具有 `thread_ts` 父级）时：

- 如果回复本身没有直接媒体，而包含的根消息有文件，Slack 可以将根文件作为线程起始上下文注入。
- 直接回复附件优先于根消息附件。
- 只有文件而没有文本的根消息会表示为附件占位符，以便回退机制仍可包含其文件。

### 多附件处理

当单条 Slack 消息包含多个文件附件时：

- 每个附件都会通过媒体管道独立处理。
- 下载后的媒体引用会聚合到消息上下文中。
- 处理顺序遵循事件负载中 Slack 文件的顺序。
- 某个附件下载失败不会阻止其他附件处理。

### 大小、下载与模型限制

- **大小上限**：默认每个文件 20 MB。可通过 `channels.slack.mediaMaxMb` 配置。
- **下载失败**：Slack 无法提供的文件、过期 URL、无法访问的文件、超大文件，以及 Slack auth/login HTML 响应都会被跳过，而不是报告为不支持的格式。
- **视觉模型**：图像分析会使用当前激活的回复模型（如果它支持视觉），或者使用 `agents.defaults.imageModel` 中配置的图像模型。

### 已知限制

| 场景                               | 当前行为                                                             | 解决办法                                                                 |
| ---------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 过期的 Slack 文件 URL              | 文件被跳过；不显示错误                                               | 在 Slack 中重新上传文件                                                 |
| 未配置视觉模型                     | 图像附件会作为媒体引用存储，但不会作为图像分析                         | 配置 `agents.defaults.imageModel`，或使用支持视觉的回复模型             |
| 非常大的图片（默认 > 20 MB）       | 按大小上限跳过                                                       | 如果 Slack 允许，可增大 `channels.slack.mediaMaxMb`                     |
| 转发/共享的附件                   | 文本和 Slack 托管的图像/文件媒体按最佳努力处理                         | 直接在 OpenClaw 线程中重新分享                                         |
| PDF 附件                           | 作为文件/媒体上下文存储，不会自动通过图像视觉路径处理                 | 使用 `download-file` 获取文件元数据，或使用 `pdf` 工具分析 PDF         |

### 相关文档

- [媒体理解管道](/nodes/media-understanding)
- [PDF 工具](/tools/pdf)
- 里程碑：[#51349](https://github.com/openclaw/openclaw/issues/51349) — Slack 附件视觉启用
- 回归测试：[#51353](https://github.com/openclaw/openclaw/issues/51353)
- 在线验证：[#51354](https://github.com/openclaw/openclaw/issues/51354)

## 相关内容

<CardGroup cols={2}>
  <Card title="配对" icon="link" href="/channels/pairing">
    将 Slack 用户与网关配对。
  </Card>
  <Card title="群组" icon="users" href="/channels/groups">
    频道和群组 DM 的行为。
  </Card>
  <Card title="频道路由" icon="route" href="/channels/channel-routing">
    将入站消息路由给代理。
  </Card>
  <Card title="安全" icon="shield" href="/gateway/security">
    威胁模型与加固。
  </Card>
  <Card title="配置" icon="sliders" href="/gateway/configuration">
    配置布局与优先级。
  </Card>
  <Card title="斜杠命令" icon="terminal" href="/tools/slash-commands">
    命令目录与行为。
  </Card>
</CardGroup>
