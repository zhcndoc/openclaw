---
summary: "安装 Slack 插件，创建应用程序并配置令牌"
read_when:
  - "首次安装Slack插件"
  - "创建 Slack 应用程序并粘贴清单"
  - "在机器人身份和用户身份之间进行选择"
title: "Slack 设置"
sidebarTitle: "设置"
---

安装插件，创建 Slack 应用程序，并为 OpenClaw 提供其所需的令牌。

## <a id="install"></a> 安装

```bash
openclaw plugins install @openclaw/slack
```

`plugins install` 会注册并启用该插件。在你配置好下面的 Slack 应用和频道设置之前，它不会执行任何操作。有关通用的插件安装规则，请参见 [插件](/tools/plugin)。

## <a id="quick-setup"></a> 快速设置

本节中的清单创建工作区范围内的安装。对于企业网格组织安装，请改用专用的 [org 范围清单和工作流程](/channels/slack/enterprise-grid#enterprise-grid-org-wide-installs)。

<Tabs>
  <Tab id="socket-mode-default" title="Socket Mode（默认）">
    <Steps>
      <Step id="create-a-new-slack-app" title="创建一个新的 Slack 应用程序">
        打开 [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → 选择你的 workspace → 粘贴下面任一 manifest → **Next** → **Create**。

        <CodeGroup>

```json Recommended
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "agent_view": {
      "agent_description": "OpenClaw connects Slack Agent View conversations to OpenClaw agents.",
      "suggested_prompts": [
        { "title": "What can you do?", "message": "What can you help me with?" },
        {
          "title": "Summarize this channel",
          "message": "Summarize the recent activity in this channel."
        },
        { "title": "Draft a reply", "message": "Help me draft a reply." }
      ]
    },
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
        "usergroups:read",
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
        "app_context_changed",
        "agent_session_stopped",
        "agent_session_title_changed",
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

```json Minimal
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "agent_view": {
      "agent_description": "OpenClaw connects Slack Agent View conversations to OpenClaw agents.",
      "suggested_prompts": [
        { "title": "What can you do?", "message": "What can you help me with?" },
        {
          "title": "Summarize this channel",
          "message": "Summarize the recent activity in this channel."
        },
        { "title": "Draft a reply", "message": "Help me draft a reply." }
      ]
    },
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
        "assistant:write",
        "channels:history",
        "channels:read",
        "chat:write",
        "commands",
        "groups:history",
        "groups:read",
        "im:history",
        "im:read",
        "im:write",
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
        "app_context_changed",
        "agent_session_stopped",
        "agent_session_title_changed",
        "message.channels",
        "message.groups",
        "message.im"
      ]
    }
  }
}
```

        </CodeGroup>

        <Note>
          **Recommended** 与 Slack 插件的完整功能集匹配：应用程序主页、斜线命令、文件、反应、引脚、组 DM 和 emoji/usergroup 读取。当工作区策略限制范围时，选择 **Minimal** — 它涵盖 DM、channel/group 历史记录、提及和斜线命令，但会删除文件、反应、引脚、组 DM （`mpim:*`）、`emoji:read` 和`usergroups:read`。请参阅 [Manifest 和范围清单 ](/channels/slack/manifest-and-scopes#manifest-and-scope-checklist) 了解每个范围的基本原理和附加选项（例如额外的斜杠命令）。
        </Note>

        Slack 创建应用后：

        - **Basic Information -> App-Level Tokens -> Generate Token and Scopes**：添加 `connections:write`，保存，并复制 App-Level Token。
        - **Install App -> Install to Workspace**：复制 Bot User OAuth Token。

      </Step>

      <Step id="configure-openclaw" title="配置OpenClaw">

        推荐的 SecretRef 设置：

```bash
export SLACK_APP_TOKEN=slack-app-token-example
export SLACK_BOT_TOKEN=slack-bot-token-example
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

        配置 `channels.slack` 后默认帐户凭证回退。在网关进程环境中设置这些（在启动网关的 shell 中导出它们，或将它们添加到服务管理器的环境中）：

```bash
export SLACK_APP_TOKEN=slack-app-token-example
export SLACK_BOT_TOKEN=slack-bot-token-example
```

      </Step>

      <Step id="start-gateway" title="启动网关">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab id="http-request-urls" title="HTTP 请求 URL">
    <Steps>
      <Step id="create-a-new-slack-app-1" title="创建一个新的 Slack 应用程序">
        打开 [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → 选择你的 workspace → 粘贴下面任一 manifest → 将 `https://gateway-host.example.com/slack/events` 替换为你的公网 Gateway URL → **Next** → **Create**。

        <CodeGroup>

```json Recommended
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "agent_view": {
      "agent_description": "OpenClaw connects Slack Agent View conversations to OpenClaw agents.",
      "suggested_prompts": [
        { "title": "What can you do?", "message": "What can you help me with?" },
        {
          "title": "Summarize this channel",
          "message": "Summarize the recent activity in this channel."
        },
        { "title": "Draft a reply", "message": "Help me draft a reply." }
      ]
    },
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
        "usergroups:read",
        "users:read"
      ]
    }
  },
  "settings": {
    "event_subscriptions": {
      "request_url": "https://gateway-host.example.com/slack/events",
      "bot_events": [
        "app_home_opened",
        "app_mention",
        "app_context_changed",
        "agent_session_stopped",
        "agent_session_title_changed",
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
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://gateway-host.example.com/slack/events",
      "message_menu_options_url": "https://gateway-host.example.com/slack/events"
    }
  }
}
```

```json Minimal
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "agent_view": {
      "agent_description": "OpenClaw connects Slack Agent View conversations to OpenClaw agents.",
      "suggested_prompts": [
        { "title": "What can you do?", "message": "What can you help me with?" },
        {
          "title": "Summarize this channel",
          "message": "Summarize the recent activity in this channel."
        },
        { "title": "Draft a reply", "message": "Help me draft a reply." }
      ]
    },
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
        "assistant:write",
        "channels:history",
        "channels:read",
        "chat:write",
        "commands",
        "groups:history",
        "groups:read",
        "im:history",
        "im:read",
        "im:write",
        "users:read"
      ]
    }
  },
  "settings": {
    "event_subscriptions": {
      "request_url": "https://gateway-host.example.com/slack/events",
      "bot_events": [
        "app_home_opened",
        "app_mention",
        "app_context_changed",
        "agent_session_stopped",
        "agent_session_title_changed",
        "message.channels",
        "message.groups",
        "message.im"
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

        </CodeGroup>

        <Note>
          **推荐** 与 Slack 插件的完整功能集相匹配； **Minimal** 会删除文件、反应、引脚、组 DM （`mpim:*`）、`emoji:read` 和 `usergroups:read` 以限制工作空间。请参阅 [Manifest 和范围清单 ](/channels/slack/manifest-and-scopes#manifest-and-scope-checklist) 了解每个范围的基本原理。
        </Note>

        <Info>
          三个 URL 字段（`slash_commands[].url`、`event_subscriptions.request_url`，以及 `interactivity.request_url` / `message_menu_options_url`）都指向同一个 OpenClaw 端点。Slack 的 manifest schema 要求它们分别命名，但 OpenClaw 会按 payload 类型路由，因此一个 `webhookPath`（默认 `/slack/events`）就足够了。HTTP 模式下，如果没有 `slash_commands[].url`，斜杠命令会静默不生效。
        </Info>

        Slack 创建应用后：

        - **Basic Information → App Credentials**：复制 **Signing Secret** 用于请求校验。
        - **Install App -> Install to Workspace**：复制 Bot User OAuth Token。

      </Step>

      <Step id="configure-openclaw-1" title="配置OpenClaw">

        推荐的 SecretRef 设置：

```bash
export SLACK_BOT_TOKEN=slack-bot-token-example
export SLACK_SIGNING_SECRET=slack-signing-secret-example
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

      <Step id="start-gateway-1" title="启动网关">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>
</Tabs>

## <a id="user-identity-(post-as-a-real-person)"></a><a id="user-identity-post-as-a-real-person"></a> 用户身份（以真实个人身份发布）

用户身份允许 OpenClaw 作为授权 Slack 应用程序的人员进行阅读和发布。 `userToken` 是代理身份；配套的 Slack 应用程序通过套接字模式承载事件 API 流量或 HTTP 请求 URL。配套应用程序不需要机器人用户或机器人令牌。

按如下方式设置配套应用：

1. 在 **OAuth & Permissions -> User Token Scopes** 下，添加这些用户级权限：

   - 历史记录：`channels:history`、`groups:history`、`im:history`、`mpim:history`
   - 会话查找：`channels:read`、`groups:read`、`im:read`、`mpim:read`
   - 用户：`users:read`
   - 发布：`chat:write`（消息将以授权用户的身份发布）
   - 打开私信：`im:write`、`mpim:write`

2. 在 **Event Subscriptions -> Subscribe to events on behalf of users** 下，添加这些用户事件。不要只把它们添加到 bot-events 列表中：

   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`

3. 选择一种事件传输方式：

   - **Socket Mode：** 启用 Socket Mode，并创建一个带有 `connections:write` 的应用级 token。将其配置为 `appToken`。
   - **HTTP Request URL：** 将 Event Subscriptions 指向公开的 OpenClaw Slack 端点，并复制 **Basic Information -> App Credentials -> Signing Secret**。将其配置为 `signingSecret`。

4. 安装或重新安装该应用，将其授权给目标人类用户，并将生成的用户 OAuth token 复制到 `userToken` 中。

Socket Mode 配置：

```json5
{
  channels: {
    slack: {
      postAs: "user",
      userToken: "<xoxp>",
      appToken: "<xapp>",
    },
  },
}
```

HTTP Request URL 配置：

```json5
{
  channels: {
    slack: {
      postAs: "user",
      mode: "http",
      userToken: "<xoxp>",
      signingSecret: "<signing-secret>",
      webhookPath: "/slack/events",
    },
  },
}
```

<Warning>
  DM 和组 DM 只能通过上面的用户范围事件订阅来工作。机器人无法加入人类 1：1 DM 或插入现有组 DM。配套应用程序是隐形管道：其他 Slack 成员看到来自授权人员的消息，而不是来自 OpenClaw 机器人的消息。
</Warning>

OpenClaw 会自动丢弃由已解析的人类身份所发送的用户作用域消息事件，因此它发送的消息不会触发自我回复。

## <a id="token-model"></a> Token 模型

- Bot 身份（默认）需要 `botToken` + `appToken` 用于 Socket Mode，或 `botToken` + `signingSecret` 用于 HTTP 模式。
- User 身份需要 `userToken` + `appToken` 用于 Socket Mode，或 `userToken` + `signingSecret` 用于 HTTP 模式。它不使用 bot token。
- Relay 模式需要 `botToken` 加上 `relay.url`、`relay.authToken` 和 `relay.gatewayId`；它不使用 app token 或 signing secret。
- `botToken`、`appToken`、`signingSecret`、`relay.authToken` 和 `userToken` 接受明文字符串或 SecretRef 对象。
- 配置中的 token 会覆盖环境变量回退。
- `SLACK_BOT_TOKEN`、`SLACK_APP_TOKEN` 和 `SLACK_USER_TOKEN` 环境变量回退各自只适用于默认账户。
- `userToken` 默认采用只读行为（`userTokenReadOnly: true`）。

状态快照行为：

- Slack 账户检查会跟踪每个凭据的 `*Source` 和 `*Status` 字段（`botToken`、`appToken`、`signingSecret`、`userToken`）。
- 状态可以是 `available`、`configured_unavailable` 或 `missing`。
- `configured_unavailable` 表示该帐户是通过 SecretRef 或其他非内联秘密源配置的，但当前 command/runtime 路径无法解析实际值。
- 在 HTTP 模式下，会包含 `signingSecretStatus`。Socket Mode 使用 `botTokenStatus` + `appTokenStatus` 表示 bot 身份，使用 `userTokenStatus` + `appTokenStatus` 表示 user 身份。

<Tip>
对于 bot 身份，操作和目录读取可以优先使用可选的 user token；写入操作会继续使用 bot token，除非 `userTokenReadOnly: false` 允许回退。对于 `postAs: "user"`，读取和写入始终使用 `userToken`。
</Tip>
