---
summary: "组织范围内的 Slack 安装在网格组织中的每个工作区中"
read_when:
  - "在企业网格组织级别安装 OpenClaw"
  - "编写工作区限定的通道和用户策略密钥"
  - "检查企业帐户支持哪些功能"
title: "Slack 企业网格"
sidebarTitle: "企业网格"
---

在组织级别安装一次，然后设置工作区限定的策略密钥。

## <a id="enterprise-grid-org-wide-installs"></a> Enterprise Grid 组织范围内的安装

一个 Slack 帐户可以从 Enterprise Grid 组织范围内的安装覆盖的每个工作区接收消息和交互。选择直接套接字模式或 HTTP 请求 URL；企业帐号不支持中继模式。下面的两个最低权限清单都启用企业消息、提及、反应、固定、通道创建和通道重命名的事件路径、立即回复、侦听器拥有的状态反应、Block Kit 操作和模式提交的 Slack 交互性以及单个 `/openclaw` 斜线命令。

### <a id="socket-mode"></a> 套接字模式

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "Send a message to OpenClaw",
        "should_escape": false
      }
    ]
  },
  "oauth_config": {
    "scopes": {
      "bot": [
        "app_mentions:read",
        "channels:history",
        "channels:read",
        "chat:write",
        "commands",
        "files:read",
        "files:write",
        "groups:history",
        "groups:read",
        "im:history",
        "im:read",
        "mpim:history",
        "mpim:read",
        "pins:read",
        "reactions:read",
        "reactions:write",
        "users:read"
      ]
    }
  },
  "settings": {
    "org_deploy_enabled": true,
    "socket_mode_enabled": true,
    "interactivity": { "is_enabled": true },
    "event_subscriptions": {
      "bot_events": [
        "app_mention",
        "channel_created",
        "channel_rename",
        "message.channels",
        "message.groups",
        "message.im",
        "message.mpim",
        "member_joined_channel",
        "member_left_channel",
        "pin_added",
        "pin_removed",
        "reaction_added",
        "reaction_removed"
      ]
    }
  }
}
```

请让 Enterprise Grid 的组织管理员（Org Admin）或组织所有者（Org Owner）审批该应用，在组织级别安装它，并选择该安装所覆盖的工作区。在启动 OpenClaw 之前，确认该应用在所有目标工作区中都可用。为 Socket 模式生成一个带有 `connections:write` 的应用级 token，然后从组织安装中复制 bot token。配置使用组织安装 bot token 的账号：

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      appToken: { source: "env", provider: "default", id: "SLACK_APP_TOKEN" },
      botToken: { source: "env", provider: "default", id: "SLACK_BOT_TOKEN" },
      slashCommand: { enabled: true, name: "openclaw" },
      dmPolicy: "open",
      allowFrom: ["*"],
      groupPolicy: "allowlist",
      channels: {
        C0123456789: { requireMention: true },
      },
    },
  },
}
```

### <a id="http-request-urls"></a> HTTP 请求 URL

当网关具有公共 HTTPS 端点并且不打开套接字模式连接时，请使用 HTTP 模式。将示例 URL 替换为网关的公共 `webhookPath` URL（默认 `/slack/events`）：

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "Send a message to OpenClaw",
        "should_escape": false,
        "url": "https://gateway-host.example.com/slack/events"
      }
    ]
  },
  "oauth_config": {
    "scopes": {
      "bot": [
        "app_mentions:read",
        "channels:history",
        "channels:read",
        "chat:write",
        "commands",
        "files:read",
        "files:write",
        "groups:history",
        "groups:read",
        "im:history",
        "im:read",
        "mpim:history",
        "mpim:read",
        "pins:read",
        "reactions:read",
        "reactions:write",
        "users:read"
      ]
    }
  },
  "settings": {
    "org_deploy_enabled": true,
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://gateway-host.example.com/slack/events"
    },
    "event_subscriptions": {
      "request_url": "https://gateway-host.example.com/slack/events",
      "bot_events": [
        "app_mention",
        "channel_created",
        "channel_rename",
        "message.channels",
        "message.groups",
        "message.im",
        "message.mpim",
        "member_joined_channel",
        "member_left_channel",
        "pin_added",
        "pin_removed",
        "reaction_added",
        "reaction_removed"
      ]
    }
  }
}
```

请让 Enterprise Grid 的组织管理员（Org Admin）或组织所有者（Org Owner）审批该应用，在组织级别安装它，并选择该安装所覆盖的工作区。Slack 验证 Request URL 后，复制组织安装的 bot token 以及应用的 **基本信息 -> 应用凭据 -> Signing Secret**。使用相同的 Request URL 路径配置企业账号：

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "http",
      botToken: { source: "env", provider: "default", id: "SLACK_BOT_TOKEN" },
      signingSecret: {
        source: "env",
        provider: "default",
        id: "SLACK_SIGNING_SECRET",
      },
      slashCommand: { enabled: true, name: "openclaw" },
      webhookPath: "/slack/events",
      dmPolicy: "open",
      allowFrom: ["*"],
      groupPolicy: "allowlist",
      channels: {
        "team:T0123456789:channel:C0123456789": { requireMention: true },
      },
    },
  },
}
```

对于每个选定的工作区，在 Slack 的 Web 应用程序中将其打开，然后从 `https://app.slack.com/client/T.../...` 复制 `T...` 工作区 ID。在每个合格的策略密钥中使用该工作区 ID 和通道的 `C...` ID，如上所示。

启动时，OpenClaw 使用 Slack `auth.test` 来检测令牌是属于工作区安装还是属于 Enterprise Grid 组织范围的安装。无需安装模式设置。 Slack 仍然是工作空间已批准安装的事实来源；然后，OpenClaw 将配置的通道、用户、DM 和提及策略应用于每个已传递的事件。 Enterprise 安装默认的 `allowBots` 到 `true`，具有与工作区安装相同的通道访问、提及、机器人房间授权和循环预防规则。在账户或频道上设置 `allowBots: false` 以禁用机器人触发的回合。 OpenClaw 保留组织安装的 `auth.test`、`user_id` 和 `bot_id` 以忽略其自己的消息。

企业支持接受直接套接字模式或 HTTP 消息、提及、成员资格、反应、pin、通道创建、通道重命名、块套件操作、模式和配置的快捷方式和斜杠命令有效负载以及工作区限定的出站消息和状态轮询。将任何快捷方式添加到应用程序清单的 `features.shortcuts` 列表； OpenClaw 通过相同的交互路径接受它们的回调 ID。清单示例注册单个 `/openclaw` 命令；本机命令模式仍然需要 [ 可选本机斜线命令](/channels/slack/manifest-and-scopes#optional-native-slash-commands) 中描述的管理员管理的命令条目。中继模式、通道 ID-change 事件、应用程序主页、代理和助理生命周期事件、配置的 ACP 绑定以及运行时当前对话绑定对企业帐户仍然不可用。当没有对等体的绑定指定 `match.teamId` 或对等体 ID 使用 `team:<team-id>:channel:<channel-id>` 或 `team:<team-id>:user:<user-id>` 时，支持静态代理路由绑定。支持源自交付的、工作区合格的 Slack 转弯的 Slack-native 批准；批准按钮使用相同的侦听器拥有的、工作区范围的交互路径。 Slack 操作工具支持 [Actions 和 gateways](/channels/slack/access-control#actions-and-gates) 中列出的每个组的企业帐户；配置的 `channels.slack.actions.*` 门和 OAuth 范围仍然适用。入站成员资格、反应、pin、通道创建和通道重命名通知使用经过验证的侦听器拥有的、工作区范围的事件路由。还通过该客户端支持出站确认、键入和状态反应，并且需要 `reactions:write`。

OpenClaw 将企业网格目标记录为 `team:<team-id>:channel:<channel-id>` 或 `team:<team-id>:user:<user-id>`。当前对话 Slack 工具操作继承该工作区。心跳所有者路由可以通过根据发送机器人安装的工作区验证收件人的成员资格，然后选择一个共享工作区来解析裸用户 ID。保留显式工作区限定的所有者目标。如果验证失败，分离发送防护仍然有效。其他独立或主动调用必须提供工作区合格的目标；裸通道和用户 ID 会被拒绝，因为这些 ID 可以由不同的工作区重复使用。没有目标参数的操作（例如 `member-info` 和 `emoji-list`）需要可信的当前 Slack 对话上下文。

立即回复对块、媒体、元数据、身份回退、展开和收据重用标准 Slack 传递行为，但前提是经过验证的侦听器拥有的客户端仍处于活动事件轮次中。内存中的发送队列和线程参与记录按该事件的工作空间进行分区；客户端本身永远不会被序列化或持久化。

企业渠道策略密钥必须使用 `team:<team-id>:channel:<channel-id>` 或 `"*"` 通配符。 `dm.groupChannels` 需要工作区限定的表单，不接受 `"*"`。交付的企业活动永远不会从其合格的工作区和通道标识回退到裸通道 ID。工作区安装保留原始稳定通道 ID 和 `channel:<id>` 兼容性。通道前缀`slack:`、`group:`、`mpim:`启动失败。

`allowFrom`、`reactionAllowlist` 和每通道 `users` 中的企业用户策略条目接受原始稳定 Slack 用户 ID、`slack:<user-id>`、`user:<user-id>`、`team:<team-id>:user:<user-id>` 或 `"*"`。不合格的条目仅比较用户 ID，并且可以匹配任何工作区中的组织范围用户。合格条目会比较工作区和用户 ID。企业 `toolsBySender` 密钥接受 `id:<sender-id>`、`channel:slack:<sender-id>` 或 `"*"`，包括稳定的机器人 ID，例如 `id:B0123456789`。运行 `openclaw doctor --fix` 以迁移无前缀的发件人 ID。名称、别名、显示名称和电子邮件地址启动失败。 ID 必须使用 Slack 所需的大写前缀和正文（例如，`C0123456789` 或 `U0123456789`）；小写和短的相似字符启动失败。企业账户无法启用`dangerouslyAllowNameMatching`。企业账户可设置全局`mentionPatterns.mode`。企业`mentionPatterns.allowIn`和`mentionPatterns.denyIn`条目使用`team:<team-id>:channel:<channel-id>`；裸通道 ID 无法启动，因为它们可以跨工作区重复使用。工作区安装保留现有的裸通道范围提及模式行为。即使 Slack ID 重叠，每个接受的工作区也会获得单独的路由、会话、转录、重复数据删除、历史记录和缓存标识。在`message`流中，支持普通用户消息和用户创作的`file_share`事件；其他消息子类型在授权或系统事件处理之前被拒绝。

企业 DM 支持与工作区安装相同的 `disabled`、`open`、`allowlist` 和 `pairing` 策略。配对批准存储为 `team:<team-id>:user:<user-id>`，并且仅应用于该工作区中的事件。显式帐户 `allowFrom` 条目可以省略组织范围用户 ID 的工作区，或包含它以限制对一个工作区的访问；通道和发件人策略继续适用于通道消息。
