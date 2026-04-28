---
summary: "Slack 设置和运行时行为（Socket 模式 + HTTP 请求 URL）"
read_when:
  - 设置 Slack 或调试 Slack 套接字/HTTP 模式
title: "Slack"
---

通过 Slack 应用集成，可用于生产环境的私信和频道。默认模式为 Socket 模式；也支持 HTTP Request URLs。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/channels/pairing">
    Slack 私信默认使用配对模式。
  </Card>
  <Card title="斜线命令" icon="terminal" href="/tools/slash-commands">
    原生命令行为及命令目录。
  </Card>
  <Card title="频道故障排除" icon="wrench" href="/channels/troubleshooting">
    跨频道诊断与修复操作手册。
  </Card>
</CardGroup>

## 快速设置

<Tabs>
  <Tab title="Socket 模式（默认）">
    <Steps>
      <Step title="创建新的 Slack 应用">
        在 Slack 应用设置中按下 **[创建新应用](https://api.slack.com/apps/new)** 按钮：

        - 选择 **从清单文件** 并为您的应用选择一个工作区
        - 粘贴下方的 [示例清单](#manifest-and-scope-checklist) 并继续创建
        - 生成带有 `connections:write` 的 **应用级令牌** (`xapp-...`)
        - 安装应用并复制显示的 **机器人令牌** (`xoxb-...`)
      </Step>

      <Step title="配置 OpenClaw">

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      appToken: "xapp-...",
      botToken: "xoxb-...",
    },
  },
}
```

        环境变量回退（仅默认账户）：

```bash
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
```

      </Step>

      <Step title="启动网关">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab title="HTTP 请求 URL">
    <Steps>
      <Step title="创建新的 Slack 应用">
        在 Slack 应用设置中按下 **[创建新应用](https://api.slack.com/apps/new)** 按钮：

        - 选择 **从清单文件** 并为您的应用选择一个工作区
        - 粘贴 [示例清单](#manifest-and-scope-checklist) 并在创建前更新 URL
        - 保存 **签名密钥** 用于请求验证
        - 安装应用并复制显示的 **机器人令牌** (`xoxb-...`)

      </Step>

      <Step title="配置 OpenClaw">

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "http",
      botToken: "xoxb-...",
      signingSecret: "your-signing-secret",
      webhookPath: "/slack/events",
    },
  },
}
```

        <Note>
        为多账户 HTTP 使用唯一的 webhook 路径

        为每个账户分配不同的 `webhookPath`（默认 `/slack/events`），以免注册冲突。
        </Note>

      </Step>

      <Step title="启动网关">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>
</Tabs>

## Manifest 和权限范围检查清单

基础 Slack 应用清单对于 Socket 模式和 HTTP Request URLs 模式是相同的。只有 `settings` 块（以及斜线命令的 `url`）不同。

基础清单（Socket 模式默认）：

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "OpenClaw 的 Slack 连接器"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
    "app_home": {
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "发送消息给 OpenClaw",
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

对于 **HTTP Request URLs 模式**，请将 `settings` 替换为 HTTP 变体，并为每个斜线命令添加 `url`。需要公开 URL：

```json
{
  "features": {
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "发送消息给 OpenClaw",
        "should_escape": false,
        "url": "https://gateway-host.example.com/slack/events"
      }
    ]
  },
  "settings": {
    "event_subscriptions": {
      "request_url": "https://gateway-host.example.com/slack/events",
      "bot_events": [
        /* 与 Socket 模式相同 */
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

### Additional manifest settings

展示扩展上述默认值的不同功能。

<AccordionGroup>
  <Accordion title="可选的原生斜线命令">

    可以使用多个 [原生斜线命令](#commands-and-slash-behavior) 来代替单个配置的命令，以实现更细致的控制：

    - 使用 `/agentstatus` 而不是 `/status`，因为 `/status` 命令被保留了。
    - 一次最多只能提供 25 个斜线命令。

    将现有的 `features.slash_commands` 部分替换为 [可用命令](/tools/slash-commands#command-list) 的子集：

    <Tabs>
      <Tab title="Socket 模式（默认）">

```json
    "slash_commands": [
      {
        "command": "/new",
        "description": "开始新会话",
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
        "description": "列出提供者/模型",
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
        "description": "显示当前代理立即可用的内容",
        "usage_hint": "[compact|verbose]"
      },
      {
        "command": "/agentstatus",
        "description": "显示运行时状态，包括提供者使用情况/配额（如果可用）"
      },
      {
        "command": "/tasks",
        "description": "列出当前会话的活动/最近后台任务"
      },
      {
        "command": "/context",
        "description": "解释上下文如何组装",
        "usage_hint": "[list|detail|json]"
      },
      {
        "command": "/whoami",
        "description": "显示您的发送者身份"
      },
      {
        "command": "/skill",
        "description": "按名称运行技能",
        "usage_hint": "<name> [input]"
      },
      {
        "command": "/btw",
        "description": "询问侧面问题而不改变会话上下文",
        "usage_hint": "<question>"
      },
      {
        "command": "/usage",
        "description": "控制使用页脚或显示成本摘要",
        "usage_hint": "off|tokens|full|cost"
      }
    ]
```

      </Tab>
      <Tab title="HTTP Request URLs">
        Use the same `slash_commands` list as Socket Mode above, and add `"url": "https://gateway-host.example.com/slack/events"` to every entry. Example:

```json
    "slash_commands": [
      {
        "command": "/new",
        "description": "开始新会话",
        "usage_hint": "[model]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/help",
        "description": "显示简短帮助摘要",
        "url": "https://gateway-host.example.com/slack/events"
      }
      // ...对每个命令重复相同的 `url` 值
    ]
```

      </Tab>
    </Tabs>

  </Accordion>
  <Accordion title="可选的作者权限范围（写操作）">
    如果您希望发出的消息使用活动代理身份（自定义用户名和图标）而不是默认的 Slack 应用身份，请添加 `chat:write.customize` 机器人权限范围。

    如果您使用 emoji 图标，Slack 期望 `:emoji_name:` 语法。

  </Accordion>
  <Accordion title="可选的用户令牌权限范围（读取操作）">
    如果您配置了 `channels.slack.userToken`，典型的读取权限范围包括：

    - `channels:history`、`groups:history`、`im:history`、`mpim:history`
    - `channels:read`、`groups:read`、`im:read`、`mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read`（如果依赖 Slack 搜索读取）

  </Accordion>
</AccordionGroup>

## 令牌模型

- Socket 模式需要 `botToken` + `appToken`。
- HTTP 模式需要 `botToken` + `signingSecret`。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受明文字符串或 SecretRef 对象。
- 配置令牌会覆盖环境变量回退。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` 环境变量回退仅适用于默认账户。
- `userToken` (`xoxp-...`) 仅限配置（无环境变量回退），默认为只读行为 (`userTokenReadOnly: true`)。

状态快照行为：

- Slack 账户检查会跟踪每个凭据的 `*Source` 和 `*Status` 字段（`botToken`、`appToken`、`signingSecret`、`userToken`）。
- 状态为 `available`、`configured_unavailable` 或 `missing`。
- `configured_unavailable` 意味着账户已通过 SecretRef 或其他非内联秘密源配置，但当前命令/运行时路径无法解析实际值。
- 在 HTTP 模式下，包含 `signingSecretStatus`；在 Socket 模式下，必需的对是 `botTokenStatus` + `appTokenStatus`。

<Tip>
对于操作/目录读取，配置后可优先使用用户令牌。对于写入，机器人令牌仍为首选；仅当 `userTokenReadOnly: false` 且机器人令牌不可用时，才允许使用用户令牌写入。
</Tip>

## 操作和开关

Slack 操作由 `channels.slack.actions.*` 控制。

当前 Slack 工具中可用的操作组：

| 组      | 默认 |
| ---------- | ------- |
| messages   | 已启用 |
| reactions  | 已启用 |
| pins       | 已启用 |
| memberInfo | 已启用 |
| emojiList  | 已启用 |

当前 Slack 消息操作包括 `send`、`upload-file`、`download-file`、`read`、`edit`、`delete`、`pin`、`unpin`、`list-pins`、`member-info` 和 `emoji-list`。`download-file` 接受入站文件占位符中显示的 Slack 文件 ID，并会针对图片返回图像预览，针对其他文件类型返回本地文件元数据。

## 访问控制和路由

<Tabs>
  <Tab title="私信策略">
    `channels.slack.dmPolicy` 控制私信访问（旧版：`channels.slack.dm.policy`）：

    - `pairing`（默认）
    - `allowlist`
    - `open`（需要 `channels.slack.allowFrom` 包含 `"*"`；旧版：`channels.slack.dm.allowFrom`）
    - `disabled`

    私信标志：

    - `dm.enabled`（默认 true）
    - `channels.slack.allowFrom`（推荐）
    - `dm.allowFrom`（旧版）
    - `dm.groupEnabled`（群私信默认 false）
    - `dm.groupChannels`（可选 MPIM 白名单）

    多账户优先级：

    - `channels.slack.accounts.default.allowFrom` 仅适用于 `default` 账户。
    - 命名账户在其自身的 `allowFrom` 未设置时继承 `channels.slack.allowFrom`。
    - 命名账户不继承 `channels.slack.accounts.default.allowFrom`。

    私信中的配对使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="频道策略">
    `channels.slack.groupPolicy` 控制频道处理：

    - `open`
    - `allowlist`
    - `disabled`

    频道白名单位于 `channels.slack.channels` 下，应使用稳定的频道 ID。

    运行时注意：如果完全缺少 `channels.slack`（仅环境变量设置），运行时将回退到 `groupPolicy="allowlist"` 并记录警告（即使已设置 `channels.defaults.groupPolicy`）。

    名称/ID 解析：

    - 频道白名单条目和私信白名单条目在启动时解析（当令牌访问允许时）
    - 未解析的频道名称条目将保留配置，但默认情况下忽略路由
    - 入站授权和频道路由默认优先使用 ID；直接用户名/别名匹配需要 `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="提及和频道用户">
    频道消息默认需要提及才能触发。

    提及来源：

    - 显式应用提及 (`<@botId>`)
    - 提及正则模式 (`agents.list[].groupChat.mentionPatterns`, 回退 `messages.groupChat.mentionPatterns`)
    - 隐式回复机器人线程行为 (当 `thread.requireExplicitMention` 为 `true` 时禁用)

    每频道控制（`channels.slack.channels.<id>`；名称仅通过启动解析或 `dangerouslyAllowNameMatching`）：

    - `requireMention`
    - `users`（白名单）
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - `toolsBySender` 键格式：`id:`、`e164:`、`username:`、`name:` 或 `"*"` 通配符
      （旧版无前缀键仍仅映射到 `id:`）

  </Tab>
</Tabs>

## 线程、会话和回复标签

- 私信路由为 `direct`；频道为 `channel`；MPIM 为 `group`。
- 使用默认 `session.dmScope=main`，Slack 私信折叠到代理主会话。
- 频道会话：`agent:<agentId>:slack:channel:<channelId>`。
- 线程回复在适用时可以创建线程会话后缀 (`:thread:<threadTs>`)。
- `channels.slack.thread.historyScope` 默认为 `thread`；`thread.inheritParent` 默认为 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制新线程会话启动时获取多少现有线程消息（默认 `20`；设置 `0` 禁用）。
- `channels.slack.thread.requireExplicitMention` (默认 `false`)：当为 `true` 时，抑制隐式线程提及，以便机器人仅响应线程内的显式 `@bot` 提及，即使机器人已经参与了该线程。如果没有此项，机器人参与线程中的回复将绕过 `requireMention` gating。

回复线程控制：

- `channels.slack.replyToMode`: `off|first|all|batched`（默认 `off`）
- `channels.slack.replyToModeByChatType`: 按 `direct|group|channel` 区分
- 私信的旧版回退：`channels.slack.dm.replyToMode`

支持手动回复标签：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

<Note>
`replyToMode="off"` 会禁用 Slack 中**所有**回复线程，包括显式 `[[reply_to_*]]` 标签。这与 Telegram 不同，在 Telegram 中即使是 `"off"` 模式，显式标签仍会被接受。Slack 线程会隐藏频道中的消息，而 Telegram 回复仍会以内联方式可见。
</Note>

## 确认反应

`ackReaction` 在 OpenClaw 处理入站消息时发送一个确认表情。

解析顺序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 代理身份表情回退（`agents.list[].identity.emoji`，否则为 "👀"）

注意：

- Slack 需要短代码（例如 `"eyes"`）。
- 使用 `""` 禁用该 Slack 账户或全局的反应。

## 文本流

`channels.slack.streaming` 控制实时预览行为：

- `off`：禁用实时预览流。
- `partial`（默认）：用最新的部分输出替换预览文本。
- `block`：追加分块预览更新。
- `progress`：在生成过程中显示进度状态文本，然后发送最终文本。
- `streaming.preview.toolProgress`：当草稿预览处于活动状态时，将工具/进度更新路由到同一个已编辑的预览消息中（默认：`true`）。设为 `false` 可保持单独的工具/进度消息。

`channels.slack.streaming.nativeTransport` 在 `channels.slack.streaming.mode` 为 `partial` 时控制 Slack 原生文本流式传输（默认值：`true`）。

- 原生文本流和 Slack assistant 线程状态显示都需要可用的回复线程。线程选择仍遵循 `replyToMode`。
- 当原生流不可用时，频道和群聊根消息仍可使用常规草稿预览。
- 顶层 Slack 私信默认不在线程中，因此不会显示线程式预览；如果你希望在那里看到可见的进度，请使用线程回复或 `typingReaction`。
- 媒体和非文本负载会回退到常规交付。
- 媒体/错误最终结果会取消待处理的预览编辑；符合条件的文本/分块最终结果仅在能够就地编辑预览时才会刷新。
- 如果流式传输在回复中途失败，OpenClaw 会对剩余负载回退到常规交付。

使用草稿预览代替 Slack 原生文本流：

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

遗留键：

- `channels.slack.streamMode` (`replace | status_final | append`) 会自动迁移到 `channels.slack.streaming.mode`。
- 布尔值 `channels.slack.streaming` 会自动迁移到 `channels.slack.streaming.mode` 和 `channels.slack.streaming.nativeTransport`。
- 遗留的 `channels.slack.nativeStreaming` 会自动迁移到 `channels.slack.streaming.nativeTransport`。

## 输入反应回退

`typingReaction` 在 OpenClaw 处理回复时向入站 Slack 消息添加临时反应，然后在运行结束时将其移除。这在非线程回复中最有用，后者使用默认的“正在输入..."状态指示器。

解析顺序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

注意：

- Slack 需要短代码（例如 `"hourglass_flowing_sand"`）。
- 反应是尽力而为的，并且在回复或失败路径完成后会自动尝试清理。

## 媒体、分块和交付

<AccordionGroup>
  <Accordion title="入站附件">
    Slack 文件附件会从 Slack 托管的私有 URL 下载（使用令牌认证的请求流程），并在获取成功且大小限制允许时写入媒体存储。文件占位符包含 Slack `fileId`，因此代理可以使用 `download-file` 获取原始文件。

    运行时入站大小上限默认为 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆盖。

  </Accordion>

  <Accordion title="出站文本和文件">
    - 文本块使用 `channels.slack.textChunkLimit`（默认 4000）
    - `channels.slack.chunkMode="newline"` 启用优先段落分割
    - 文件发送使用 Slack 上传 API 并可包含线程回复 (`thread_ts`)
    - 出站媒体上限在配置时遵循 `channels.slack.mediaMaxMb`；否则频道发送使用媒体管道中的 MIME 类型默认值
  </Accordion>

  <Accordion title="交付目标">
    首选显式目标：

    - `user:<id>` 用于私信
    - `channel:<id>` 用于频道

    发送到用户目标时，通过 Slack 对话 API 打开 Slack 私信。

  </Accordion>
</AccordionGroup>

## 命令和斜杠行为

Slack 中的斜杠命令显示为单个配置命令或多个原生命令。配置 `channels.slack.slashCommand` 以更改命令默认值：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

```txt
/openclaw /help
```

原生命令需要在 Slack 应用中进行 [额外的清单设置](#additional-manifest-settings)，并通过 `channels.slack.commands.native: true` 或全局配置中的 `commands.native: true` 启用。

- Slack 的原生命令自动模式为 **关闭**，因此 `commands.native: "auto"` 不会启用 Slack 原生命令。

```txt
/help
```

原生参数菜单使用自适应渲染策略，在分发选定的选项值之前显示确认模态框：

- 最多 5 个选项：按钮块
- 6-100 个选项：静态选择菜单
- 超过 100 个选项：外部选择，当交互选项处理程序可用时带有异步选项过滤
- 超出 Slack 限制：编码的选项值回退到按钮

```txt
/think
```

斜杠会话使用隔离的键，如 `agent:<agentId>:slack:slash:<userId>`，并且仍然使用 `CommandTargetSessionKey` 将命令执行路由到目标对话会话。

## 交互式回复

Slack 可以渲染代理生成的交互式回复控件，但此功能默认禁用。

全局启用：

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

或仅为一个 Slack 账户启用：

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

启用后，代理可以发出仅限 Slack 的回复指令：

- `[[slack_buttons: Approve:approve, Reject:reject]]`
- `[[slack_select: Choose a target | Canary:canary, Production:production]]`

这些指令编译为 Slack Block Kit，并将点击或选择通过现有的 Slack 交互事件路径路由回来。

注意：

- 这是 Slack 特定的界面。其他渠道不会将 Slack Block Kit 指令翻译为他们自己的按钮系统。
- 交互式回调值是 OpenClaw 生成的不透明令牌，而不是代理生成的原始值。
- 如果生成的交互式块超过 Slack Block Kit 限制，OpenClaw 会回退到原始文本回复，而不是发送无效的块负载。

## Slack 中的执行审批

Slack 可以充当具有交互式按钮和交互的原生审批客户端，而不是回退到 Web 界面或终端。

- 执行审批使用 `channels.slack.execApprovals.*` 进行原生私信/频道路由。
- 当请求已经落在 Slack 中且审批 id 类型为 `plugin:` 时，插件审批仍然可以通过相同的 Slack 原生按钮界面解析。
- 审批者授权仍然强制执行：只有被识别为审批者的用户才能通过 Slack 批准或拒绝请求。

这使用相同的共享审批按钮界面。当在 Slack 应用设置中启用 `interactivity` 时，审批提示会直接以 Block Kit 按钮的形式渲染在对话中。
当这些按钮存在时，它们是主要的审批用户体验；仅当聊天审批不可用或手动审批是唯一路径时，OpenClaw 才应在工具结果说明中包含手动 `/approve` 命令。

配置路径：

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers`（可选；可能时回退到 `commands.ownerAllowFrom`）
- `channels.slack.execApprovals.target` (`dm` | `channel` | `both`，默认：`dm`)
- `agentFilter`, `sessionFilter`

当 `enabled` 未设置或为 `"auto"` 且至少解析出一个审批者时，Slack 会自动启用原生执行审批。设置 `enabled: false` 以显式禁用 Slack 作为原生审批客户端。设置 `enabled: true` 以在审批者解析时强制启用原生执行审批。

没有显式 Slack 执行审批配置时的默认行为：

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

仅当你想要覆盖审批者、添加过滤器或选择加入原始聊天交付时，才需要显式的 Slack 原生配置：

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

共享 `approvals.exec` 转发是单独的。仅当执行审批提示也必须路由到其他聊天或显式的带外目标时才使用它。共享 `approvals.plugin` 转发也是单独的；当这些请求已经落在 Slack 中时，Slack 原生按钮仍然可以解析插件审批。

同聊天 `/approve` 也适用于已经支持命令的 Slack 频道和私信。有关完整的审批转发模型，请参阅 [执行审批](/tools/exec-approvals)。

## 事件和运营行为

- 消息编辑/删除会映射为系统事件。
- 线程广播（“也发送到频道”的线程回复）会作为普通用户消息处理。
- 反应添加/移除事件会映射为系统事件。
- 成员加入/离开、频道创建/重命名，以及固定消息添加/移除事件会映射为系统事件。
- `channel_id_changed` 在启用 `configWrites` 时可以迁移频道配置键。
- 频道主题/用途元数据会被视为不受信任的上下文，并可能被注入路由上下文。
- 线程起始消息和初始线程历史上下文种子在适用时会被已配置的发送者白名单过滤。
- 块操作和模态交互会发出结构化的 `Slack interaction: ...` 系统事件，并带有丰富的负载字段：
  - 块操作：所选值、标签、选择器值以及 `workflow_*` 元数据
  - 模态 `view_submission` 和 `view_closed` 事件，带有路由后的频道元数据和表单输入

## 配置参考

主要参考：[`配置参考 - Slack`](/gateway/config-channels#slack)。

<Accordion title="高信号 Slack 字段">

- mode/auth: `mode`, `botToken`, `appToken`, `signingSecret`, `webhookPath`, `accounts.*`
- DM 访问: `dm.enabled`, `dmPolicy`, `allowFrom`（旧版：`dm.policy`, `dm.allowFrom`）, `dm.groupEnabled`, `dm.groupChannels`
- 兼容性开关: `dangerouslyAllowNameMatching`（应急开关；除非需要，否则保持关闭）
- 频道访问: `groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`
- 线程/历史: `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- 交付: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `streaming.nativeTransport`, `streaming.preview.toolProgress`
- 运维/功能: `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

</Accordion>

## 故障排除

<AccordionGroup>
  <Accordion title="频道内无回复">
    按顺序检查：

    - `groupPolicy`
    - 频道白名单 (`channels.slack.channels`)
    - `requireMention`
    - 每频道的 `users` 白名单

    有用命令：

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="私信消息被忽略">
    检查：

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy` (或旧版 `channels.slack.dm.policy`)
    - 配对审批 / allowlist 条目
    - Slack 助手私信事件：日志中出现 `drop message_changed` 的详细信息，通常表示 Slack 发送了一个已编辑的 Assistant-thread 事件，但消息元数据中没有可恢复的人类发送者

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket 模式未连接">
    验证 Slack 应用设置中的 bot + app 令牌和 Socket 模式启用状态。

    如果 `openclaw channels status --probe --json` 显示 `botTokenStatus` 或
    `appTokenStatus: "configured_unavailable"`，则 Slack 账户已
    配置，但当前运行时无法解析基于 SecretRef 的
    值。

  </Accordion>

  <Accordion title="HTTP 模式未收到事件">
    验证：

    - 签名密钥
    - webhook 路径
    - Slack 请求 URL（事件订阅 + 交互 + 斜线命令）
    - HTTP 模式下每个账户的唯一 `webhookPath`

    如果账户
    快照中出现 `signingSecretStatus: "configured_unavailable"`，则 HTTP 账户已配置，但当前运行时无法
    解析基于 SecretRef 的签名密钥。

  </Accordion>

  <Accordion title="原生/斜线命令未触发">
    核实是否：

    - 开启了原生命令模式（`channels.slack.commands.native: true`）并在 Slack 注册了相应斜线命令
    - 或启用了单一斜杠命令模式（`channels.slack.slashCommand.enabled: true`）

    同时检查 `commands.useAccessGroups` 及频道/用户白名单设置。

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="Pairing" icon="link" href="/channels/pairing">
    将 Slack 用户与网关进行配对。
  </Card>
  <Card title="Groups" icon="users" href="/channels/groups">
    频道和群组私信行为。
  </Card>
  <Card title="Channel routing" icon="route" href="/channels/channel-routing">
    将传入消息路由给代理。
  </Card>
  <Card title="Security" icon="shield" href="/gateway/security">
    威胁模型与加固。
  </Card>
  <Card title="Configuration" icon="sliders" href="/gateway/configuration">
    配置布局和优先级。
  </Card>
  <Card title="Slash commands" icon="terminal" href="/tools/slash-commands">
    命令目录和行为。
  </Card>
</CardGroup>
