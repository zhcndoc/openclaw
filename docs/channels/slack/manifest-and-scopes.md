---
summary: "基本应用清单、OAuth 范围和可选清单设置"
read_when:
  - "确定 Slack 应用程序需要哪个 OAuth 范围"
  - "在 Slack 应用程序中注册本机斜杠命令"
  - "在现有应用程序上启用应用程序主页或代理视图"
title: "Slack 清单和范围"
sidebarTitle: "清单和范围"
---

Slack 应用程序清单 OpenClaw 需要逐个范围以及扩展它的可选设置。

## <a id="manifest-and-scope-checklist"></a> Manifest 和作用域清单

基础 Slack 应用 manifest 在 Socket Mode 和 HTTP Request URLs 中是相同的。只有 `settings` 块（以及斜杠命令的 `url`）不同。

基础 manifest（Socket Mode 默认）：

```json
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

对于 **HTTP Request URLs 模式**，将 `settings` 替换为 HTTP 变体，并为每个斜杠命令添加 `url`。需要公开 URL：

```json
{
  "features": {
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "Send a message to OpenClaw",
        "should_escape": false,
        "url": "https://gateway-host.example.com/slack/events"
      }
    ]
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

### <a id="additional-manifest-settings"></a> 其他 manifest 设置

启用不同功能以扩展上述默认配置。

默认清单启用 Slack 应用程序主页 **Home** 选项卡并订阅 `app_home_opened`。当工作区成员打开“主页”选项卡时，OpenClaw 会使用 `views.publish` 发布安全的默认主页视图；不包含对话有效负载或私有配置。当启用单斜杠命令模式时，命令提示使用`channels.slack.slashCommand.name`；使用本机命令或无斜杠命令的安装会忽略该提示。 **Messages** 选项卡对 Slack DM 保持启用状态。新应用程序通过 `features.agent_view`、`assistant:write` 和 `app_context_changed` 使用 Slack 代理视图。请参阅 [Agent View DMs](/channels/slack/threads-and-sessions#agent-view-dms)，了解 OpenClaw 如何检测体验并将每个可见根路由到其自己的会话。

OpenClaw 驱动 Slack 会话状态：轮次运行时为 `processing`，本机审批等待时为 `suspended`，完成时为 `active`。本机 **Stop** 按钮需要 `agent_session_stopped` 事件订阅，并像 `/stop` 一样中止运行，并进行相同的授权检查。会话标题遵循 OpenClaw 会话显示名称； `agent_session_title_changed` 订阅允许用户重命名流回 OpenClaw。

已使用 `features.assistant_view` 的现有应用程序可以保留该功能设置。 OpenClaw 继续处理这些安装的 `assistant_thread_started` 和 `assistant_thread_context_changed`；为停止和标题同步添加相同的会话事件订阅。 Slack 使得从助理视图到代理视图的迁移不可逆转，并且要求用户随后进行硬刷新，因此，在您打算迁移整个工作区之前，请勿替换现有应用程序上的 `assistant_view`。

<AccordionGroup>
  <Accordion id="optional-native-slash-commands" title="可选的本机斜杠命令">

    可以使用多个 [native 斜杠命令 ](/channels/slack/messaging#commands-and-slash-behavior) 代替单个配置的命令，但有以下区别：

    - 使用 `/agentstatus` 代替 `/status`，因为 `/status` 命令已被保留。
    - 同一时间，一个 Slack 应用最多只能注册 25 个斜杠命令（Slack 平台限制）。

    OpenClaw 会为已启用的原生命令注册处理器，但 Slack manifest 条目仍由管理员管理，不会在运行时同步。请手动将 `/login` 添加到 manifest；下面的示例将其包含在内，而不是可选的 `/side` 别名，以保持 25 个命令。`/login` 可以在任何地方显示，但它只会在私聊或 Web UI 中发放配对码。

    将你现有的 `features.slash_commands` 部分替换为 [可用命令](/tools/slash-commands#command-list) 的一个子集：

    <Tabs>
      <Tab id="socket-mode-default" title="Socket Mode（默认）">

```json
{
  "slash_commands": [
    {
      "command": "/new",
      "description": "Start a new session",
      "usage_hint": "[model]"
    },
    {
      "command": "/reset",
      "description": "Reset the current session"
    },
    {
      "command": "/compact",
      "description": "Compact the session context",
      "usage_hint": "[instructions]"
    },
    {
      "command": "/stop",
      "description": "Stop the current run"
    },
    {
      "command": "/session",
      "description": "Manage thread-binding expiry",
      "usage_hint": "idle <duration|off> or max-age <duration|off>"
    },
    {
      "command": "/think",
      "description": "Set the thinking level",
      "usage_hint": "<level>"
    },
    {
      "command": "/verbose",
      "description": "Toggle verbose output",
      "usage_hint": "on|off|full"
    },
    {
      "command": "/fast",
      "description": "Show or set fast mode",
      "usage_hint": "[status|on|off]"
    },
    {
      "command": "/reasoning",
      "description": "Toggle reasoning visibility",
      "usage_hint": "[on|off|stream]"
    },
    {
      "command": "/elevated",
      "description": "Toggle elevated mode",
      "usage_hint": "[on|off|ask|full]"
    },
    {
      "command": "/exec",
      "description": "Show or set exec defaults",
      "usage_hint": "host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>"
    },
    {
      "command": "/approve",
      "description": "Approve or deny pending approval requests",
      "usage_hint": "<id> <decision>"
    },
    {
      "command": "/model",
      "description": "Show or set the model",
      "usage_hint": "[name|#|status]"
    },
    {
      "command": "/models",
      "description": "List providers/models",
      "usage_hint": "[provider] [page] [limit=<n>|size=<n>|all]"
    },
    {
      "command": "/help",
      "description": "Show the short help summary"
    },
    {
      "command": "/commands",
      "description": "Show the generated command catalog"
    },
    {
      "command": "/tools",
      "description": "Show what the current agent can use right now",
      "usage_hint": "[compact|verbose]"
    },
    {
      "command": "/agentstatus",
      "description": "Show runtime status, including provider usage/quota when available"
    },
    {
      "command": "/context",
      "description": "Explain how context is assembled",
      "usage_hint": "[list|detail|json]"
    },
    {
      "command": "/whoami",
      "description": "Show your sender identity"
    },
    {
      "command": "/skill",
      "description": "Run a skill by name",
      "usage_hint": "<name> [input]"
    },
    {
      "command": "/btw",
      "description": "Ask a side question without changing session context",
      "usage_hint": "<question>"
    },
    {
      "command": "/login",
      "description": "Pair Codex login",
      "usage_hint": "[codex|openai]"
    },
    {
      "command": "/usage",
      "description": "Control the usage footer or show cost summary",
      "usage_hint": "off|tokens|full|cost"
    }
  ]
}
```

      </Tab>
      <Tab id="http-request-urls" title="HTTP 请求 URL">
        使用与上方 Socket Mode 相同的 `slash_commands` 列表，并为每个条目添加 `"url": "https://gateway-host.example.com/slack/events"`。示例：

```json
{
  "slash_commands": [
    {
      "command": "/new",
      "description": "Start a new session",
      "usage_hint": "[model]",
      "url": "https://gateway-host.example.com/slack/events"
    },
    {
      "command": "/help",
      "description": "Show the short help summary",
      "url": "https://gateway-host.example.com/slack/events"
    }
  ]
}
```

        对列表中的每个命令都重复该 `url` 值。

      </Tab>
    </Tabs>

  </Accordion>
  <Accordion id="optional-authorship-scopes-write-operations" title="可选的作者范围（写入操作）">
    如果你希望发出的消息使用当前代理身份（自定义用户名和图标），而不是默认的 Slack 应用身份，请添加 `chat:write.customize` bot scope。

    如果你使用表情符号图标，Slack 期望使用 `:emoji_name:` 语法。

  </Accordion>
  <Accordion id="optional-user-token-scopes-read-operations" title="可选的用户令牌范围（读取操作）">
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
