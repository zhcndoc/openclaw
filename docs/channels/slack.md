---
summary: "Slack 设置和运行时行为（Socket Mode、HTTP Request URLs 和 relay 模式）"
read_when:
  - 设置 Slack 或调试 Slack socket、HTTP 或 relay 模式
title: "Slack"
---

Slack 支持通过 Slack 应用集成来处理私信和频道。默认传输方式是 Socket Mode；同时也支持 HTTP Request URLs。Relay 模式适用于受管部署，在这种部署中，由受信任的路由器负责 Slack 入口流量。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/channels/pairing">
    Slack 私信默认使用配对模式。
  </Card>
  <Card title="斜杠命令" icon="terminal" href="/tools/slash-commands">
    原生命令行为与命令目录。
  </Card>
  <Card title="频道故障排查" icon="wrench" href="/channels/troubleshooting">
    跨频道诊断与修复操作手册。
  </Card>
</CardGroup>

## 选择传输方式

Socket Mode 和 HTTP Request URLs 在消息、斜杠命令、App Home 和交互性方面功能齐全。请选择部署形态，而不是按功能选择。

| 关注点                       | Socket Mode（默认）                                                                                                                                    | HTTP Request URLs                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 公共 Gateway URL            | 不需要                                                                                                                                               | 需要（DNS、TLS、反向代理或隧道）                                                                                |
| 出站网络                     | 必须能够出站 WSS 到 `wss-primary.slack.com`                                                                                                         | 不需要出站 WS；仅需入站 HTTPS                                                                                  |
| 所需令牌                     | Bot token + 带有 `connections:write` 的 App-Level Token                                                                                              | Bot token + Signing Secret                                                                                     |
| 开发笔记本 / 防火墙后面      | 可直接工作                                                                                                                                           | 需要公共隧道（ngrok、Cloudflare Tunnel、Tailscale Funnel）或预发布 Gateway                                     |
| 横向扩展                     | 每台主机、每个 app 一个 Socket Mode 会话；多个 Gateway 需要不同的 Slack 应用                                                                         | 无状态 POST 处理器；多个 Gateway 副本可通过负载均衡器共享同一个应用                                           |
| 单个 Gateway 上的多账号      | 支持；每个账号都会打开各自的 WS                                                                                                                       | 支持；每个账号都需要唯一的 `webhookPath`（默认 `/slack/events`），以免注册冲突                                 |
| 斜杠命令传输                  | 通过 WS 连接传递；`slash_commands[].url` 会被忽略                                                                                                   | Slack 会 POST 到 `slash_commands[].url`；该字段是命令分发所必需的                                               |
| 请求签名                     | 不使用（认证方式是 App-Level Token）                                                                                                                 | Slack 会对每个请求签名；OpenClaw 使用 `signingSecret` 进行校验                                                |
| 连接断开后的恢复             | 已启用 Slack SDK 自动重连；OpenClaw 也会以受限退避方式重启失败的 Socket Mode 会话。适用 pong 超时的传输调优。                                      | 没有持久连接可断开；重试由 Slack 按请求进行                                                                     |

<Note>
  **选择 Socket Mode** 适用于单 Gateway 主机、开发笔记本，以及能够向外访问 `*.slack.com` 但不能接受入站 HTTPS 的本地/内网环境。

**选择 HTTP Request URLs** 适用于在负载均衡器后运行多个 Gateway 副本、出站 WSS 被阻止但允许入站 HTTPS、或者你已经在反向代理处终结 Slack webhook 的场景。
</Note>

<Warning>
  Slack 可以为一个应用维护多个 Socket Mode 连接，并且可能将任意有效载荷投递到任意连接。因此，共享同一个 Slack 应用的不同 OpenClaw gateway 需要一致的路由和授权配置。否则，请为每个 gateway 使用单独的 Slack 应用、单一路由入口，或在负载均衡器后使用 HTTP Request URLs。参见 [Using Socket Mode](https://docs.slack.dev/apis/events-api/using-socket-mode#using-multiple-connections)。
</Warning>

### 中继模式

Relay mode 将 Slack 入口与 OpenClaw gateway 分离。受信任的路由器拥有唯一的 Slack Socket Mode 连接，选择目标 gateway，并通过已认证的 websocket 转发带类型的事件。gateway 仍然使用自己的 bot token 来执行外发的 Slack Web API 调用。

```json5
{
  channels: {
    slack: {
      mode: "relay",
      botToken: { source: "env", provider: "default", id: "SLACK_BOT_TOKEN" },
      relay: {
        url: "wss://router.example.com/gateway/ws",
        authToken: { source: "env", provider: "default", id: "SLACK_RELAY_AUTH_TOKEN" },
        gatewayId: "team-gateway",
      },
    },
  },
}
```

除非目标是 localhost，否则 relay URL 必须使用 `wss://`。请将 bearer token 和路由器路由表视为 Slack 授权边界的一部分：被路由的事件会作为已授权的激活进入正常的 Slack 消息处理器。websocket `hello` 帧中由路由器提供的 `slack_identity` 可以设置默认的外发用户名和图标；但如果调用方显式提供了 identity，则以调用方为准。relay 连接会以与 Socket Mode 相同的有限退避时序重新连接，并在断开时清除路由器提供的 identity。

### Enterprise Grid 组织级安装

一个 Slack 账号可以接收 Enterprise Grid 组织级安装所覆盖的每个工作区发来的消息。请选择直接 Socket Mode 或 HTTP Request URLs；企业账号不支持 relay 模式。下面这两个最小权限清单都只启用 V1 `message` 和 `app_mention` 事件路径、即时回复，以及由监听器拥有的状态反应。

#### Socket Mode

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "OpenClaw 的 Slack 连接器"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true }
  },
  "oauth_config": {
    "scopes": {
      "bot": [
        "app_mentions:read",
        "channels:history",
        "channels:read",
        "chat:write",
        "files:read",
        "files:write",
        "groups:history",
        "groups:read",
        "im:history",
        "im:read",
        "mpim:history",
        "mpim:read",
        "reactions:write",
        "users:read"
      ]
    }
  },
  "settings": {
    "org_deploy_enabled": true,
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": [
        "app_mention",
        "message.channels",
        "message.groups",
        "message.im",
        "message.mpim"
      ]
    }
  }
}
```

请让 Enterprise Grid 的 Org Admin 或 Org Owner 审批该应用，在组织级别安装它，并选择该安装所覆盖的工作区。在启动 OpenClaw 之前，确认该应用在所有目标工作区中都可用。为 Socket Mode 生成一个带有 `connections:write` 的应用级 token，然后从组织安装中复制 bot token。配置使用组织安装 bot token 的账号：

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      enterpriseOrgInstall: true,
      appToken: { source: "env", provider: "default", id: "SLACK_APP_TOKEN" },
      botToken: { source: "env", provider: "default", id: "SLACK_BOT_TOKEN" },
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

#### HTTP Request URLs

当 Gateway 有一个公开的 HTTPS 端点且不打开 Socket Mode 连接时，请使用 HTTP 模式。将示例 URL 替换为 Gateway 的公开 `webhookPath` URL（默认 `/slack/events`）：

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "OpenClaw 的 Slack 连接器"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true }
  },
  "oauth_config": {
    "scopes": {
      "bot": [
        "app_mentions:read",
        "channels:history",
        "channels:read",
        "chat:write",
        "files:read",
        "files:write",
        "groups:history",
        "groups:read",
        "im:history",
        "im:read",
        "mpim:history",
        "mpim:read",
        "reactions:write",
        "users:read"
      ]
    }
  },
  "settings": {
    "org_deploy_enabled": true,
    "event_subscriptions": {
      "request_url": "https://gateway-host.example.com/slack/events",
      "bot_events": [
        "app_mention",
        "message.channels",
        "message.groups",
        "message.im",
        "message.mpim"
      ]
    }
  }
}
```

请让 Enterprise Grid 的 Org Admin 或 Org Owner 审批该应用，在组织级别安装它，并选择该安装所覆盖的工作区。Slack 验证 Request URL 后，复制组织安装的 bot token 以及应用的 **Basic Information -> App Credentials -> Signing Secret**。使用相同的 Request URL 路径配置企业账号：

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "http",
      enterpriseOrgInstall: true,
      botToken: { source: "env", provider: "default", id: "SLACK_BOT_TOKEN" },
      signingSecret: {
        source: "env",
        provider: "default",
        id: "SLACK_SIGNING_SECRET",
      },
      webhookPath: "/slack/events",
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

启动时，OpenClaw 会通过 Slack 的 `auth.test` 验证 `enterpriseOrgInstall`。没有该标志的组织安装 token，或者带有该标志的工作区 token，都会导致启动失败。Slack 仍然是哪些工作区已授权该安装的唯一事实来源；随后 OpenClaw 会把配置的 channel、user、DM 和 mention 策略应用到每个已投递事件上。Enterprise V1 会在分发前拒绝所有由 bot 发送的 `message` 和 `app_mention` 事件，不论 `allowBots` 如何，因为组织安装不会提供稳定、带工作区限定的 bot 身份用于防循环。

企业支持刻意限制为直接 Socket Mode 或 HTTP 的 `message` 和 `app_mention` 事件及其即时回复。relay 模式、slash commands、interactions、App Home、reaction event listeners、pins、Slack action tools、Slack-native approvals、bindings、queued 或 scheduled delivery，以及 proactive sends 都不适用于企业账号。出站确认、typing 和状态反应通过由监听器拥有的 Slack client 支持，并且需要 `reactions:write`；入站 reaction 通知和 reaction action tools 仍不可用。

即时回复会复用标准 Slack 投递行为，支持 chunks、media、metadata、identity fallback、unfurls 和 receipts，但前提是已验证、由监听器拥有的 client 仍处于活动事件轮次中。内存中的发送队列和线程参与记录会按该事件的工作区进行分区；client 本身不会被序列化或持久化。

Channel policy 键和 `dm.groupChannels` 条目必须使用原始且稳定的 Slack channel ID，或者使用 `channel:<id>` 形式。OpenClaw 会在运行时将这两种形式都归一化为原始 channel ID 进行匹配；`slack:`、`group:` 和 `mpim:` 前缀会导致启动失败。用户策略条目必须使用稳定的 Slack user ID；名称、slug、显示名称和电子邮件地址都会导致启动失败。ID 必须使用 Slack 的规范大写前缀和主体（例如 `C0123456789` 或 `U0123456789`）；小写和短的相似形式都会导致启动失败。企业账号不能启用 `dangerouslyAllowNameMatching`。企业账号可以设置全局 `mentionPatterns.mode`，但 `mentionPatterns.allowIn` 和 `mentionPatterns.denyIn` 会导致启动失败，因为裸的 Slack channel ID 不带工作区限定，并且可以在多个工作区中复用。工作区安装保留现有的带作用域 mention-pattern 行为。每个被接受的工作区都会获得独立的 routing、session、transcript、dedupe、history 和 cache identity，即使 Slack ID 重叠也是如此。在 `message` 流中，普通用户消息和用户发出的 `file_share` 事件是受支持的；其他 message 子类型会在授权或系统事件处理之前被拒绝。

企业 DM 必须么是被禁用的（`dm.enabled=false` 或 `dmPolicy="disabled"`），要么显式开启为 `dmPolicy="open"` 且有效账号 `allowFrom` 包含字面量 `"*"`。空白 allowlist 或不包含 `"*"` 的用户特定 ID 都会导致启动失败。由于这些授权存储中的 Slack user ID 不带工作区限定，因此配对和按用户划分的 DM allowlist 会被拒绝。channel 和 sender policy 仍然适用于 channel 消息。

## 安装

```bash
openclaw plugins install @openclaw/slack
```

`plugins install` 会注册并启用该插件。在你配置好下面的 Slack 应用和频道设置之前，它不会执行任何操作。有关通用的插件安装规则，请参见 [Plugins](/tools/plugin)。

## 快速设置

本节中的 manifest 会创建一个 workspace 作用域的安装。对于 Enterprise Grid 组织安装，请改用专用的 [org-wide manifest and workflow](#enterprise-grid-org-wide-installs)。

<Tabs>
  <Tab title="Socket 模式（默认）">
    <Steps>
      <Step title="创建新的 Slack 应用">
        打开 [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → 选择你的 workspace → 粘贴下面任一 manifest → **Next** → **Create**。

        <CodeGroup>

```json Recommended
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
    "assistant_view": {
      "assistant_description": "OpenClaw 将 Slack assistant threads 连接到 OpenClaw agents。",
      "suggested_prompts": [
        { "title": "你能做什么？", "message": "你能帮我做什么？" },
        {
          "title": "总结这个频道",
          "message": "总结这个频道最近的活动。"
        },
        { "title": "起草回复", "message": "帮我起草一条回复。" }
      ]
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
        "assistant_thread_context_changed",
        "assistant_thread_started",
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
    "description": "OpenClaw 的 Slack 连接器"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "assistant_view": {
      "assistant_description": "OpenClaw 将 Slack assistant threads 连接到 OpenClaw agents。",
      "suggested_prompts": [
        { "title": "你能做什么？", "message": "你能帮我做什么？" },
        {
          "title": "总结这个频道",
          "message": "总结这个频道最近的活动。"
        },
        { "title": "起草回复", "message": "帮我起草一条回复。" }
      ]
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
        "assistant_thread_context_changed",
        "assistant_thread_started",
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
          **推荐** 与 Slack 插件的完整功能集一致：App Home、斜杠命令、文件、表情反应、置顶、群组 DM，以及 emoji/usergroup 读取。若 workspace 策略限制 scope，则选择 **Minimal** —— 它覆盖 DM、频道/群组历史、提及和斜杠命令，但会移除文件、reaction、pin、群组 DM（`mpim:*`）、`emoji:read` 和 `usergroups:read`。有关每个 scope 的原因以及附加选项（例如额外斜杠命令），请参见 [Manifest and scope checklist](#manifest-and-scope-checklist)。
        </Note>

        Slack 创建应用后：

        - **Basic Information -> App-Level Tokens -> Generate Token and Scopes**: 添加 `connections:write`，保存，并复制 App-Level Token。
        - **Install App -> Install to Workspace**: 复制 Bot User OAuth Token。

      </Step>

      <Step title="配置 OpenClaw">

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

        环境变量回退（仅默认账号）：

```bash
SLACK_APP_TOKEN=slack-app-token-example
SLACK_BOT_TOKEN=slack-bot-token-example
```

      </Step>

      <Step title="启动网关">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab title="HTTP Request URLs">
    <Steps>
      <Step title="创建新的 Slack 应用">
        打开 [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → 选择你的 workspace → 粘贴下面任一 manifest → 将 `https://gateway-host.example.com/slack/events` 替换为你的公网 Gateway URL → **Next** → **Create**。

        <CodeGroup>

```json Recommended
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
    "assistant_view": {
      "assistant_description": "OpenClaw 将 Slack assistant threads 连接到 OpenClaw agents。",
      "suggested_prompts": [
        { "title": "你能做什么？", "message": "你能帮我做什么？" },
        {
          "title": "总结这个频道",
          "message": "总结这个频道最近的活动。"
        },
        { "title": "起草回复", "message": "帮我起草一条回复。" }
      ]
    },
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "发送消息给 OpenClaw",
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
        "assistant_thread_context_changed",
        "assistant_thread_started",
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
    "description": "OpenClaw 的 Slack 连接器"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "assistant_view": {
      "assistant_description": "OpenClaw 将 Slack assistant threads 连接到 OpenClaw agents。",
      "suggested_prompts": [
        { "title": "你能做什么？", "message": "你能帮我做什么？" },
        {
          "title": "总结这个频道",
          "message": "总结这个频道最近的活动。"
        },
        { "title": "起草回复", "message": "帮我起草一条回复。" }
      ]
    },
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "发送消息给 OpenClaw",
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
        "assistant_thread_context_changed",
        "assistant_thread_started",
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
          **推荐** 与 Slack 插件的完整功能集一致；**Minimal** 会为受限 workspace 移除文件、reaction、pin、群组 DM（`mpim:*`）、`emoji:read` 和 `usergroups:read`。有关每个 scope 的原因，请参见 [Manifest and scope checklist](#manifest-and-scope-checklist)。
        </Note>

        <Info>
          三个 URL 字段（`slash_commands[].url`、`event_subscriptions.request_url`，以及 `interactivity.request_url` / `message_menu_options_url`）都指向同一个 OpenClaw 端点。Slack 的 manifest schema 要求它们分别命名，但 OpenClaw 会按 payload 类型路由，因此一个 `webhookPath`（默认 `/slack/events`）就足够了。HTTP 模式下，如果没有 `slash_commands[].url`，斜杠命令会静默不生效。
        </Info>

        Slack 创建应用后：

        - **Basic Information → App Credentials**: 复制 **Signing Secret** 用于请求校验。
        - **Install App -> Install to Workspace**: 复制 Bot User OAuth Token。

      </Step>

      <Step title="配置 OpenClaw">

        推荐的 SecretRef 设置：

```bash
export SLACK_BOT_TOKEN=slack-bot-token-example
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

      <Step title="启动网关">

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

注意：

- `socketMode` 在 HTTP Request URL 模式中会被忽略。
- 基础 `channels.slack.socketMode` 设置适用于所有 Slack 账号，除非被覆盖。按账号覆盖使用 `channels.slack.accounts.<accountId>.socketMode`；由于这是对象覆盖，因此该账号需要包含你希望设置的所有 socket 调优字段。
- 只有 `clientPingTimeout` 有 OpenClaw 默认值（`15000`）。`serverPingTimeout` 和 `pingPongLoggingEnabled` 仅在配置后才会传递给 Slack SDK。
- Socket Mode 重启退避大约从 2 秒开始，并封顶在大约 30 秒。可恢复的启动、启动等待和断开连接失败会重试，直到通道停止为止。永久性的账号和凭据错误，例如无效认证、令牌被撤销或缺少作用域，会快速失败，而不是永远重试。

## Manifest 和作用域清单

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
    "assistant_view": {
      "assistant_description": "OpenClaw 将 Slack assistant threads 连接到 OpenClaw 代理。",
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
        "assistant_thread_context_changed",
        "assistant_thread_started",
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
        "app_home_opened",
        "app_mention",
        "assistant_thread_context_changed",
        "assistant_thread_started",
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

### 其他 manifest 设置

启用不同功能以扩展上述默认配置。

默认 manifest 会启用 Slack App Home 的 **Home** 选项卡，并订阅 `app_home_opened`。当工作区成员打开 Home 选项卡时，OpenClaw 会使用 `views.publish` 发布一个安全的默认 Home 视图；不会包含对话载荷或私有配置。启用单斜杠命令模式时，命令提示会使用 `channels.slack.slashCommand.name`；使用原生命令或不使用斜杠命令的安装会省略该提示。**Messages** 选项卡对 Slack 私信保持启用。该 manifest 还通过 `features.assistant_view`、`assistant:write`、`assistant_thread_started` 和 `assistant_thread_context_changed` 启用了 Slack assistant threads；assistant threads 会路由到各自的 OpenClaw 线程会话，并让 Slack 提供的线程上下文可供代理使用。

<AccordionGroup>
  <Accordion title="可选的原生斜杠命令">

    可以使用多个 [原生斜杠命令](#commands-and-slash-behavior) 代替单个配置命令，并带来一些细微差异：

    - 使用 `/agentstatus` 代替 `/status`，因为 `/status` 命令已被保留。
    - 同一时间，一个 Slack 应用最多只能注册 25 个斜杠命令（Slack 平台限制）。

    将现有的 `features.slash_commands` 部分替换为 [可用命令](/tools/slash-commands#command-list) 的子集：

    <Tabs>
      <Tab title="Socket Mode（默认）">

```json
{
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
      "description": "管理线程绑定过期时间",
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
      "command": "/approve",
      "description": "批准或拒绝待处理的批准请求",
      "usage_hint": "<id> <decision>"
    },
    {
      "command": "/model",
      "description": "显示或设置模型",
      "usage_hint": "[name|#|status]"
    },
    {
      "command": "/models",
      "description": "列出提供方/模型",
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
      "description": "显示运行时状态，包括可用时的提供方使用情况/配额"
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
      "description": "按名称运行一个技能",
      "usage_hint": "<name> [input]"
    },
    {
      "command": "/btw",
      "description": "在不更改会话上下文的情况下提出一个旁支问题",
      "usage_hint": "<question>"
    },
    {
      "command": "/side",
      "description": "在不更改会话上下文的情况下提出一个旁支问题",
      "usage_hint": "<question>"
    },
    {
      "command": "/usage",
      "description": "控制使用情况页脚或显示费用摘要",
      "usage_hint": "off|tokens|full|cost"
    }
  ]
}
```

      </Tab>
      <Tab title="HTTP Request URLs">
        使用与上方 Socket Mode 相同的 `slash_commands` 列表，并为每个条目添加 `"url": "https://gateway-host.example.com/slack/events"`。示例：

```json
{
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
  ]
}
```

        对列表中的每个命令都重复该 `url` 值。

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
- Relay 模式需要 `botToken` 以及 `relay.url`、`relay.authToken` 和 `relay.gatewayId`；它不使用 app token 或 signing secret。
- `botToken`、`appToken`、`signingSecret`、`relay.authToken` 和 `userToken` 都接受明文
  字符串或 SecretRef 对象。
- 配置中的 token 会覆盖环境变量回退。
- `SLACK_BOT_TOKEN`、`SLACK_APP_TOKEN` 和 `SLACK_USER_TOKEN` 环境变量回退各自仅适用于默认账号。
- `userToken` 默认为只读行为（`userTokenReadOnly: true`）。

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

## Operations and Gating

Slack actions are controlled by `channels.slack.actions.*`.

The available action groups in the current Slack tool are:

| Group       | Default |
| ----------- | ------- |
| messages    | Enabled |
| reactions   | Enabled |
| pins        | Enabled |
| memberInfo  | Enabled |
| emojiList   | Enabled |

Current Slack message actions include `send`, `upload-file`, `download-file`, `read`, `edit`, `delete`, `pin`, `unpin`, `list-pins`, `member-info`, and `emoji-list`. `download-file` accepts the Slack file ID shown in the inbound file placeholder and returns an image preview for images, and local file metadata for other file types.

## 访问控制与路由

<Tabs>
  <Tab title="DM 策略">
    `channels.slack.dmPolicy` 控制 DM 访问。`channels.slack.allowFrom` 是规范的 DM 允许列表。

    - `pairing`（默认）
    - `allowlist`
    - `open`（需要 `channels.slack.allowFrom` 包含 `"*"`）
    - `disabled`

    DM 标志：

    - `dm.enabled`（默认 true）
    - `channels.slack.allowFrom`
    - `dm.allowFrom`（旧版）
    - `dm.groupEnabled`（群组 DM 默认 false）
    - `dm.groupChannels`（可选的 MPIM 允许列表）

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
            C12345678: { enabled: true, requireMention: true },
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
            "#eng-my-channel": { enabled: true, requireMention: true },
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

    - 显式应用提及 (`<@botId>`)
    - 当 bot 用户是该用户组成员时的 Slack 用户组提及 (`<!subteam^S...>`); 需要 `usergroups:read`
    - 提及正则模式（`agents.list[].groupChat.mentionPatterns`，回退为 `messages.groupChat.mentionPatterns`）
    - 隐式回复 bot 线程行为（当 `thread.requireExplicitMention` 为 `true` 时禁用）

    每个频道的控制项（`channels.slack.channels.<id>`；名称仅可通过启动时解析或 `dangerouslyAllowNameMatching` 使用）：

    - `requireMention`
    - `ignoreOtherMentions`
    - `replyToMode` (`off|first|all|batched`; 覆盖该频道的账号/聊天类型回复模式)
    - `users`（允许列表）
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - `toolsBySender` 键格式：`channel:`、`id:`、`e164:`、`username:`、`name:`，或 `"*"` 通配符
      （旧版未加前缀的键仍仅映射到 `id:`）

    `ignoreOtherMentions`（默认 `false`）会丢弃提及其他用户或用户组但未提及此 bot 的频道消息。DM 和群组 DM（MPIM）不受影响。此过滤器需要从 `auth.test` 解析出的 bot 用户 ID；如果该身份不可用（例如仅有 user-token 的身份），则该门控会放行，消息会保持原样通过。

    `allowBots` 对频道和私有频道采取保守策略：只有在发送 bot 被显式列入该房间的 `users` 允许列表时，或者 `channels.slack.allowFrom` 中至少有一个明确的 Slack owner ID 当前是该房间成员时，才接受 bot 生成的房间消息。通配符和显示名称形式的 owner 条目不能满足 owner 存在条件。owner 存在性使用 Slack `conversations.members`；请确保应用对相应房间类型拥有匹配的读取范围（公开频道需要 `channels:read`，私有频道需要 `groups:read`）。如果成员查询失败，OpenClaw 会丢弃该 bot 生成的房间消息。

    已接受的 bot 作者 Slack 消息使用共享的 [bot 循环保护](/channels/bot-loop-protection)。为默认预算配置 `channels.defaults.botLoopProtection`，然后在工作区或频道需要不同限制时，使用 `channels.slack.botLoopProtection` 或 `channels.slack.channels.<id>.botLoopProtection` 进行覆盖。

  </Tab>
</Tabs>

## 线程、会话和回复标签

- DMs 路由为 `direct`；channels 为 `channel`；MPIMs 为 `group`。
- Slack 路由绑定接受原始 peer IDs，以及 Slack 目标形式，例如 `channel:C12345678`、`user:U12345678` 和 `<@U12345678>`。
- 在默认 `session.dmScope=main` 下，Slack DMs 会折叠到 agent 主会话。
- 频道会话：`agent:<agentId>:slack:channel:<channelId>`。
- 普通顶层频道消息会保留在按频道划分的会话中，即使 `replyToMode` 不是 `off` 也是如此。
- Slack 线程回复会使用父 Slack `thread_ts` 作为会话后缀（`:thread:<threadTs>`），即使通过 `replyToMode="off"` 禁用了出站回复线程化也是如此。
- OpenClaw 会在一个符合条件的顶层频道 root 预期会开启一个可见的 Slack thread 时，将其种子化到 `agent:<agentId>:slack:channel:<channelId>:thread:<rootTs>`，这样 root 和后续线程回复就共享同一个 OpenClaw 会话。这适用于 `app_mention` 事件、显式 bot 或已配置的 mention-pattern 匹配，以及 `requireMention: false` 且 `replyToMode` 非 `off` 的频道。
- `channels.slack.thread.historyScope` 默认值为 `thread`；`thread.inheritParent` 默认值为 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制新 thread session 启动时会拉取多少已有 thread messages（默认 `20`；设为 `0` 可禁用）。
- `channels.slack.thread.requireExplicitMention`（默认 `false`）：当为 `true` 时，会抑制隐式 thread mentions，使 bot 只响应 thread 内显式的 `@bot` mentions，即使 bot 已经参与过该 thread 也是如此。若不启用此项，已参与 bot thread 中的回复会绕过 `requireMention` 门控。

回复线程控制：

- `channels.slack.channels.<id>.replyToMode`：针对 Slack 频道/私有频道消息的按频道覆盖
- `channels.slack.replyToMode`：`off|first|all|batched`（默认 `off`）
- `channels.slack.replyToModeByChatType`：按 `direct|group|channel` 区分
- 直聊的旧版回退：`channels.slack.dm.replyToMode`

支持手动回复标签：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

对于来自 `message` 工具的显式 Slack thread replies，设置 `replyBroadcast: true`，并配合 `action: "send"` 和 `threadId` 或 `replyTo`，以请求 Slack 也将该 thread reply 广播到父频道。这会映射到 Slack 的 `chat.postMessage` `reply_broadcast` 标志，并且仅支持文本或 Block Kit 发送，不支持媒体上传。

当 `message` 工具调用在 Slack thread 内运行且目标是同一频道时，OpenClaw 通常会根据生效中的账号、聊天类型或按频道 `replyToMode` 继承当前 Slack thread。自动回复以及同频道的 `send` 或 `upload-file` 调用会使用相同的按频道覆盖。若要强制发送新的父频道消息，可在 `action: "send"` 或 `action: "upload-file"` 上设置 `topLevel: true`。`threadId: null` 也可接受，作用等同于同级顶层禁用。

<Note>
`replyToMode="off"` 会禁用出站 Slack 回复线程化，包括显式的 `[[reply_to_*]]` 标签。它不会将入站 Slack thread sessions 扁平化：已经发布在 Slack thread 中的消息仍会路由到 `:thread:<threadTs>` session。这与 Telegram 不同，在 Telegram 中即使在 `"off"` 模式下显式标签仍会被保留。Slack threads 会在频道中隐藏消息，而 Telegram replies 会以内联方式可见。
</Note>

## 确认反应

`ackReaction` 会在 OpenClaw 处理入站消息期间发送一个确认表情，而 `ackReactionScope` 决定该表情实际何时发送。

默认情况下，确认会保持静态，同时 Slack 原生的助手线程状态会通过旋转加载消息显示进度。将 `messages.statusReactions.enabled: true` 设置为启用 queued/thinking/tool/done/error 反应生命周期。

### Emoji (`ackReaction`)

解析顺序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- agent identity emoji 回退（`agents.list[].identity.emoji`，否则 `"eyes"` / 👀）

说明：

- Slack 期望使用简写名（例如 `"eyes"`）。
- 可使用 `""` 来禁用该 Slack 账号或全局的反应。

### 范围（`messages.ackReactionScope`）

Slack 提供方从 `messages.ackReactionScope` 读取范围（默认 `"group-mentions"`）。目前没有 Slack 账号级或频道级覆盖；该值对网关全局生效。

取值：

- `"all"`：在私聊和群组中添加反应，包括环境房间事件。
- `"direct"`：仅在私聊中添加反应。
- `"group-all"`：对所有群组消息添加反应，但不包括环境房间事件（不含私聊）。
- `"group-mentions"`（默认）：在群组中添加反应，但仅限于提及机器人时（或在已选择加入的群组可提及对象中）。**不包括私聊。**
- `"off"` / `"none"`：从不添加反应。

<Note>
默认范围（`"group-mentions"`）不会在私聊或环境房间事件中触发确认反应。若要在传入的 Slack 私聊和安静的房间事件中看到已配置的 `ackReaction`（例如 `"eyes"`），请将 `messages.ackReactionScope` 设置为 `"all"`。`messages.ackReactionScope` 会在 Slack 提供方启动时读取，因此需要重启网关才能使更改生效。
</Note>

```json5
{
  messages: {
    ackReaction: "eyes",
    ackReactionScope: "all", // 在私聊和群组中添加反应
  },
}
```

## 文本流式传输

`channels.slack.streaming` 控制实时预览行为：

- `off`：禁用实时预览流式传输。
- `partial`（默认）：使用最新的部分输出替换预览文本。
- `block`：追加分块预览更新。
- `progress`：在生成期间显示进度状态文本，然后发送最终文本。
- `streaming.preview.toolProgress`：当草稿预览处于活动状态时，将工具/进度更新路由到同一条已编辑的预览消息中（默认：`true`）。设为 `false` 可保留单独的工具/进度消息。
- `streaming.preview.commandText` / `streaming.progress.commandText`：设为 `status` 可在隐藏原始 command/exec 文本的同时保留紧凑的工具进度行（默认：`raw`）。

隐藏原始 command/exec 文本，同时保留紧凑的进度行：

```json
{
  "channels": {
    "slack": {
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

当 `channels.slack.streaming.mode` 为 `partial` 时，`channels.slack.streaming.nativeTransport` 控制 Slack 原生文本流式传输（默认：`true`）。

Slack 原生进度任务卡片在 progress 模式下为可选启用。将 `channels.slack.streaming.progress.nativeTaskCards` 设为 `true`，并将 `channels.slack.streaming.mode` 设为 `"progress"`，即可在工作进行时发送 Slack 原生计划/任务卡片，然后在完成时更新同一张任务卡片。不启用该标志时，progress 模式会保留可移植的草稿预览行为。

- 原生文本流式传输和 Slack assistant 线程状态要显示，必须有可用的回复线程。线程选择仍遵循 `replyToMode`。
- 当原生流式传输不可用或不存在回复线程时，频道、群聊和顶层 DM 仍可使用常规草稿预览。
- 顶层 Slack DMs 默认保持非线程化，因此不会显示 Slack 的线程式原生流/状态预览；OpenClaw 会改为在 DM 中发布并编辑草稿预览。
- 媒体和非文本载荷会回退到正常投递。
- 媒体/错误最终结果会取消待处理的预览编辑；符合条件的文本/Block 最终结果仅在能够就地编辑预览时才会刷新。
- 如果流式传输在回复中途失败，OpenClaw 会对剩余载荷回退到正常投递。

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

选择启用 Slack 原生进度任务卡片：

```json5
{
  channels: {
    slack: {
      streaming: {
        mode: "progress",
        progress: {
          nativeTaskCards: true,
          render: "rich",
        },
      },
    },
  },
}
```

旧版键：

- `channels.slack.streamMode` (`replace | status_final | append`) 是 `channels.slack.streaming.mode` 的旧版别名。
- 布尔值 `channels.slack.streaming` 是 `channels.slack.streaming.mode` 和 `channels.slack.streaming.nativeTransport` 的旧版别名。
- 顶层 `channels.slack.chunkMode` 和 `channels.slack.nativeStreaming` 是 `channels.slack.streaming.chunkMode` 和 `channels.slack.streaming.nativeTransport` 的旧版别名。
- 运行时不会读取旧版别名；请运行 `openclaw doctor --fix` 将持久化的 Slack 流式传输配置重写为规范键。

## 输入中 typing 反应回退

`typingReaction` 会在 OpenClaw 处理回复期间向入站 Slack 消息添加一个临时反应，并在运行结束后将其移除。这在线程回复之外最有用，因为线程回复默认会使用“正在输入...”状态指示器。

解析顺序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

说明：

- Slack 期望使用简写名（例如 `"hourglass_flowing_sand"`）。
- 该反应尽力而为，回复或失败路径完成后会自动尝试清理。

## 语音输入

要在 Slack 中向 OpenClaw 讲话，请现在发送一个 Slack 音频剪辑到 OpenClaw 应用。Slackbot 的听写麦克风是 Slack 自有的独立功能，不是应用 API。

- **[Slackbot 语音听写](https://slack.com/help/articles/202026038-How-to-use-Slackbot)** 存在于用户的私有 Slackbot 会话中。Slack 会将录音转换为 Slackbot 提示，但不会通过 Events API 向第三方 Slack 应用发出音频文件、听写事件、提示或输入源标记。OpenClaw Slack 插件无法启用或接收它。
- **[Slack 音频剪辑](https://slack.com/help/articles/4406235165587-Record-audio-and-video-clips-in-Slack)** 是可存储的 Slack 文件，可以发布到 OpenClaw 的 DM、频道或线程中。OpenClaw 会使用 bot token 下载可访问的剪辑，规范化 Slack 剪辑的 MIME 元数据，并通过共享的 [音频转录管道](/nodes/audio) 发送它。推荐的应用清单包含所需的 `files:read` 范围。

音频剪辑和 Slackbot 听写具有不同的隐私语义：剪辑遵循 Slack 文件保留策略，OpenClaw 会下载它们用于转录，而 Slack 说明听写音频不会被存储。

在 `requireMention: true` 的频道中，无字幕的音频剪辑可以通过说出一个已配置的提及模式（`agents.list[].groupChat.mentionPatterns`，回退到 `messages.groupChat.mentionPatterns`）来满足门槛。OpenClaw 会在下载或转录剪辑之前对发送者进行授权，然后只有在转录结果匹配时才允许通过。失败或不匹配的推测性转录会与下载的剪辑一起被丢弃；它不会保留在频道历史中。无法从语音中推断出原生 Slack `@bot` 标识，因此请配置一个口头名称模式或包含一个键入的提及。如果启用了转录回显，则回显仅在通过后发送。

## 媒体、分块与投递

<AccordionGroup>
  <Accordion title="入站附件">
    Slack 文件附件会从 Slack 托管的私有 URL 下载（使用 token 认证请求流程），并在获取成功且大小限制允许时写入媒体存储。文件占位符包含 Slack `fileId`，因此 agent 可以使用 `download-file` 获取原始文件。

    下载会使用有界的空闲超时和总超时。如果 Slack 文件检索卡住或失败，OpenClaw 会继续处理消息，并回退到文件占位符。

    运行时入站大小上限默认是 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆盖。

  </Accordion>

  <Accordion title="出站文本和文件">
    - 文本分块使用 `channels.slack.textChunkLimit`（默认 `8000`，并受 Slack 自身消息长度限制上限约束）
    - `channels.slack.streaming.chunkMode="newline"` 启用先按段落拆分
    - 文件发送使用 Slack 上传 API，并且可以包含线程回复（`thread_ts`）
    - 较长的文件说明会将第一个 Slack 安全文本分块作为上传评论，其余分块作为后续消息发送
    - 出站媒体上限在配置时遵循 `channels.slack.mediaMaxMb`；否则频道发送使用媒体管道中的 MIME 类型默认值

  </Accordion>

  <Accordion title="投递目标">
    推荐的显式目标：

    - `user:<id>` 用于 DMs
    - `channel:<id>` 用于频道

    仅文本/分块的 Slack DMs 可以直接发布到 user ID；文件上传和带线程的发送会先通过 Slack conversation API 打开 DM，因为这些路径需要一个具体的 conversation ID。

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

原生命令参数菜单会按以下优先级之一渲染：

- 3-5 个简短选项：溢出（`"..."`）菜单
- 超过 100 个选项，且可用异步选项过滤：外部选择
- 1-2 个选项，或任何其编码值对于选择器来说过长的选项：按钮块
- 否则（6-100 个选项，或超过 100 个但没有异步过滤）：静态选择菜单，每个菜单最多分块显示 100 个选项

```txt
/think
```

Slash 会话使用类似 `agent:<agentId>:slack:slash:<userId>` 的隔离键，并仍然通过 `CommandTargetSessionKey` 将命令执行路由到目标对话会话。

## 原生图表

Slack 的公开 [`data_visualization` Block Kit 区块](https://docs.slack.dev/reference/block-kit/blocks/data-visualization-block/)
可在消息中渲染折线图、柱状图、面积图和饼图。OpenClaw 将可移植的
`presentation` `chart` 区块映射为这种原生形态；除正常的
`chat:write` 消息访问权限外，不需要额外的 OAuth 作用域、
文件上传、图像渲染器或 Slack 配置。

```json
{
  "blocks": [
    {
      "type": "chart",
      "chartType": "bar",
      "title": "季度收入",
      "categories": ["Q1", "Q2"],
      "series": [{ "name": "收入", "values": [120, 145] }],
      "xLabel": "季度"
    }
  ]
}
```

Slack 的限制会在原生渲染前强制执行：

- 标题和可选坐标轴标签：50 个字符
- 饼图：1-12 个正值分段
- 折线图/柱状图/面积图：1-12 个唯一命名的系列，以及 1-20 个共享类别
- 分段、类别和系列标签：20 个字符
- 每个系列都必须为每个类别包含一个有限值；非饼图数值
  可以为负数

每个原生图表还会携带一个顶层文本表示，用于屏幕
阅读器、通知、会话镜像，以及无法渲染该
区块的客户端。发送到其他 OpenClaw 通道的标准 presentation 会接收同样的
确定性图表数据文本，除非它们声明支持原生图表。若
Slack 在分阶段推出期间以 `invalid_blocks` 拒绝图表，OpenClaw 会移除被拒绝的原生数据区块，保留任何同级控件，并以可见文本的形式发送完整的图表表示。

Slack 当前每条消息最多接受两个 `data_visualization` 区块。若一个 presentation 包含超过两个有效图表，OpenClaw 会保留它们的顺序，并在后续消息中继续原生渲染，每条消息不超过两个
图表。

Slack 的 [开发者发布](https://docs.slack.dev/changelog/2026/06/16/block-kit-data-visualization-block/)
将该区块描述为面向应用的 Block Kit 功能，并未公布任何付费
方案限制。Business+/Enterprise 的资格说明适用于
Slackbot 自动生成 AI 图表，这与应用发送一个
已经结构化的 Block Kit 图表是不同的。图表是仅限消息的区块，不是 App
Home、模态窗口或 Canvas 内容。

## 原生表格

Slack 当前的 [`data_table` Block Kit block](https://docs.slack.dev/reference/block-kit/blocks/data-table-block/)  
可在消息中渲染结构化的行和列。OpenClaw 会将显式的、可移植的  
`presentation` `table` 块映射为 `data_table`；它不使用 Slack 旧版的  
[`table` block](https://docs.slack.dev/reference/block-kit/blocks/table-block/)。  
除了正常的 `chat:write` 消息访问权限之外，不需要额外的 OAuth scope 或 Slack 配置。

```json
{
  "blocks": [
    {
      "type": "table",
      "caption": "开放中的流水线",
      "headers": ["账户", "阶段", "ARR"],
      "rows": [
        ["Acme", "已赢单", 125000],
        ["Globex", "评审中", 82000]
      ],
      "rowHeaderColumnIndex": 0
    }
  ]
}
```

OpenClaw 会将表头单元格和字符串单元格映射为 Slack `raw_text` 单元格。数值单元格  
映射为 `raw_number`，并保留有限数值以便原生排序和筛选。`rowHeaderColumnIndex` 在存在时，  
会将该从 0 开始计数的列标记为 Slack 行标题。

Slack 公布的 `data_table` 限制会在原生渲染前强制执行：

- 1-20 列
- 1-100 行数据，外加表头行
- 每一行的单元格数量必须相同
- 在一条消息中的所有表格单元格总字符数最多为 10,000

当消息仍然处于总字符限制内时，多个有效的表格块可以原生渲染。无法在原生限制范围内渲染的表格会变成完整、确定性的文本，而不是丢失行或单元格。若该文本超过一条 Slack 消息，则发送和斜杠命令响应会使用有序的文本分块。表格编辑会明确报大小错误，而不是静默地从现有消息中截断行。

从可移植 presentation 生成的每个原生表格还会附带一个顶层  
文本表示，供屏幕阅读器、通知、会话镜像以及无法渲染该块的客户端使用。原始图表和表格值在回退内容中保持字面形式，因此诸如 `<@U123>` 这样的单元格数据不会变成 Slack 提及。  
如果 Slack 因 `invalid_blocks` 拒绝原生图表或表格块，OpenClaw 会在一次有界恢复步骤中移除所有原生数据块，保留诸如按钮和选择器之类的有效兄弟块，并在禁用 Slack 格式化的情况下发送完整可见的图表和表格文本。斜杠命令传递会跟踪 Slack 在该命令中的五次调用 `response_url` 预算。在每一批回复之前，它都会选择一个能适配剩余调用次数的完整计划，否则会在发送该批次之前失败。

只有显式的 `presentation` 表格块才会被提升为原生表格。Markdown 管道表格仍然作为作者文本；OpenClaw 不会猜测表格结构或单元格类型。现有受信任的 Slack 原生生产者可以继续通过 `channelData.slack.blocks` 传递原始块；OpenClaw 会从有效的原始 `data_table` 单元格推导回退文本，而格式错误的自定义块可能会降级为其 caption 或通用的 Block Kit 回退。可移植 agent、CLI 和插件输出应使用 `presentation`。

## 交互式回复

Slack 可以渲染由 agent 生成的交互式回复控件，但此功能默认是禁用的。对于新的 agent、CLI 和插件输出，建议使用共享的 `presentation` 按钮或选择块。它们使用相同的 Slack 交互路径，同时在其他渠道上也能优雅降级。

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

启用后，agent 仍然可以发出已废弃的仅限 Slack 的回复指令：

- `[[slack_buttons: Approve:approve, Reject:reject]]`
- `[[slack_select: Choose a target | Canary:canary, Production:production]]`

这些指令会编译为 Slack Block Kit，并将点击或选择通过现有的 Slack 交互事件路径回传。请将它们保留给旧提示词和 Slack 专用的临时方案；新建可移植控件时请使用共享 presentation。

用于指令编译器的 API 对新生产代码也已废弃：

- `compileSlackInteractiveReplies(...)`
- `parseSlackOptionsLine(...)`
- `isSlackInteractiveRepliesEnabled(...)`
- `buildSlackInteractiveBlocks(...)`

新建 Slack 渲染控件时，请使用 `presentation` 负载和 `buildSlackPresentationBlocks(...)`。

注意：

- 这是 Slack 专用的旧版 UI。其他渠道不会将 Slack Block Kit 指令转换为它们自己的按钮系统。
- 交互回调值是 OpenClaw 生成的不可读令牌，而不是 agent 直接编写的原始值。
- 如果生成的交互块超过 Slack Block Kit 限制，OpenClaw 会回退为原始文本回复，而不是发送无效的 blocks 负载。

### 插件拥有的模态提交

注册了交互处理器的 Slack 插件，也可以在 OpenClaw 为 agent 可见的系统事件压缩负载之前，接收模态框的
`view_submission` 和 `view_closed` 生命周期事件。在打开 Slack 模态框时，请使用以下一种路由模式：

- 将 `callback_id` 设为 `openclaw:<namespace>:<payload>`。
- 或保留现有的 `callback_id`，并在模态框的 `private_metadata` 中放入 `pluginInteractiveData:
"<namespace>:<payload>"`。

处理器会收到 `ctx.interaction.kind` 为 `view_submission` 或
`view_closed`，规范化后的 `inputs`，以及来自
Slack 的完整原始 `stateValues` 对象。仅使用 callback-id 路由就足以调用插件处理器；当模态框还应该生成一个 agent 可见的系统事件时，请包含现有模态框的 `private_metadata` 用户/会话路由字段。agent 会收到一个简洁、脱敏的 `Slack interaction: ...` 系统事件。如果处理器返回
`systemEvent.summary`、`systemEvent.reference` 或 `systemEvent.data`，这些字段会包含在该简洁事件中，这样 agent 就可以引用
插件拥有的存储，而无需看到完整的表单负载。

## Slack 中的原生审批

Slack 可以作为原生审批客户端，通过交互式按钮和交互操作来处理审批，而不是回退到 Web UI 或终端。

- Exec 和插件审批可以渲染为 Slack 原生的 Block Kit 提示。
- `channels.slack.execApprovals.*` 仍然是原生 exec 审批客户端的启用与 DM/频道路由配置。
- Exec 审批 DM 使用 `channels.slack.execApprovals.approvers` 或 `commands.ownerAllowFrom`。
- 当 Slack 被启用为源会话的原生审批客户端时，或者当 `approvals.plugin` 路由到源 Slack 会话或 Slack 目标时，插件审批会使用 Slack 原生按钮。
- 插件审批 DM 使用来自 `channels.slack.allowFrom`、命名账号 `allowFrom` 或账号默认路由的 Slack 插件审批者。
- 审批者授权仍然会被强制执行：仅限 exec 的审批者不能批准插件请求，除非他们同时也是插件审批者。

这使用与其他渠道相同的共享审批按钮界面。当你的 Slack 应用设置中启用了 `interactivity` 时，审批提示会直接在对话中渲染为 Block Kit 按钮。
当这些按钮存在时，它们就是主要的审批体验；只有当工具结果表明聊天审批不可用或手动审批是唯一途径时，OpenClaw
才应包含手动的 `/approve` 命令。

配置路径：

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers`（可选；在可能时回退到 `commands.ownerAllowFrom`）
- `channels.slack.execApprovals.target`（`dm` | `channel` | `both`，默认：`dm`）
- `agentFilter`, `sessionFilter`

当 `enabled` 未设置或为 `"auto"` 且至少有一个 exec 审批者可解析时，Slack 会自动启用原生 exec 审批。当 Slack 插件审批者可解析且请求匹配原生客户端过滤器时，Slack 也可以通过这个原生客户端路径处理原生插件审批。将 `enabled: false` 设为显式禁用 Slack 作为原生审批客户端。将 `enabled: true` 设为在审批者可解析时强制启用原生审批。禁用 Slack exec 审批不会禁用通过 `approvals.plugin` 启用的原生 Slack 插件审批投递；插件审批投递会改用 Slack 插件审批者。

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

共享的 `approvals.exec` 转发是独立的。仅当 exec 审批提示也必须路由到其他聊天或显式的带外目标时才使用它。共享的 `approvals.plugin` 转发也同样独立；只有当 Slack 能够原生处理插件审批请求时，Slack 原生投递才会抑制该回退。

同聊 `/approve` 也可在已经支持命令的 Slack 频道和 DM 中使用。完整的审批转发模型请参见 [执行审批](/tools/exec-approvals)。

## 事件与运行行为

- Message edits/deletes 映射为系统事件。
- Thread broadcasts（“Also send to channel” 线程回复）按正常用户消息处理。
- Reaction add/remove 事件映射为系统事件。
- Member join/leave、channel created/renamed，以及 pin add/remove 事件映射为系统事件。
- `channel_id_changed` 在启用 `configWrites` 时可以迁移频道配置键。
- 频道 topic/purpose 元数据被视为不可信上下文，并且可以被注入到路由上下文中。
- 线程发起者和初始线程历史上下文种子在适用时会按已配置的发送者 allowlist 过滤。
- Block actions、shortcuts 和 modal interactions 会发出结构化的 `Slack interaction: ...` 系统事件，并携带丰富的负载字段：
  - block actions：所选值、标签、picker 值，以及 `workflow_*` 元数据
  - global shortcuts：callback 和 actor 元数据，路由到 actor 的直接会话
  - message shortcuts：callback、actor、channel、thread，以及所选消息上下文
  - modal `view_submission` 和 `view_closed` 事件，包含已路由的频道元数据和表单输入

在你的 Slack 应用配置中定义全局或消息快捷方式，并使用任意非空的 callback ID。OpenClaw 会确认匹配的快捷方式负载，应用与其他 Slack 交互相同的 DM/频道发送者策略，并将已清理的事件排队到所路由的 agent 会话。trigger IDs 和 response URLs 会从 agent 上下文中脱敏移除。

## 配置参考

主要参考：[/gateway/config-channels#slack](/gateway/config-channels#slack)。

<Accordion title="高信号 Slack 字段">

- mode/auth: `mode`, `enterpriseOrgInstall`, `botToken`, `appToken`, `signingSecret`, `webhookPath`, `accounts.*`
- DM access: `dm.enabled`, `dmPolicy`, `allowFrom` (legacy: `dm.policy`, `dm.allowFrom`), `dm.groupEnabled`, `dm.groupChannels`
- compatibility toggle: `dangerouslyAllowNameMatching` (break-glass; keep off unless needed)
- channel access: `groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`
- threading/history: `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- delivery: `textChunkLimit`, `streaming.chunkMode`, `mediaMaxMb`, `streaming`, `streaming.nativeTransport`, `streaming.preview.toolProgress`
- unfurls: `unfurlLinks` (default: `false`), `unfurlMedia` for `chat.postMessage` link/media preview control; set `unfurlLinks: true` to opt back into link previews
- ops/features: `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

</Accordion>

## 故障排查

<AccordionGroup>
  <Accordion title="频道中没有回复">
    按以下顺序检查：

    - `groupPolicy`
    - 频道 allowlist (`channels.slack.channels`) — **键必须是频道 ID** (`C12345678`)，而不是名称 (`#channel-name`)。基于名称的键在 `groupPolicy: "allowlist"` 下会静默失败，因为频道路由默认按 ID 优先。查找 ID：在 Slack 中右键点击频道 → **复制链接** — URL 末尾的 `C...` 值就是频道 ID。
    - `requireMention`
    - per-channel `users` allowlist
    - `messages.groupChat.visibleReplies`: 普通 group/channel 请求默认是 `"automatic"`。如果你选择了 `"message_tool"`，并且日志显示有 assistant 文本但没有 `message(action=send)` 调用，则说明模型没有走到可见的 message-tool 路径。在这种模式下，最终文本会保持私密；请检查 gateway 的详细日志以查看被抑制的 payload 元数据，或者如果你希望每个普通 assistant 最终回复都通过旧路径发布，请将其设置为 `"automatic"`。
    - `messages.groupChat.unmentionedInbound`：如果它是 `"room_event"`，那么允许的频道内未提及聊天会作为环境上下文存在，并且保持静默，除非 agent 调用 `message` 工具。参见 [环境房间事件](/channels/ambient-room-events)。

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "automatic",
    },
  },
}
```

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
    - 配对审批 / allowlist 条目（`dmPolicy: "open"` 仍然需要 `channels.slack.allowFrom: ["*"]`）
    - 群组 DM 使用 MPIM 处理；启用 `channels.slack.dm.groupEnabled`，并且如果已配置，请将 MPIM 包含在 `channels.slack.dm.groupChannels` 中
    - Slack Assistant DM 事件：提到 `drop message_changed` 的详细日志
      通常意味着 Slack 发送了一个编辑后的 Assistant 线程事件，但在消息元数据中没有可恢复的人类发送者

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket 模式未连接">
    验证 Slack 应用设置中的 bot + app tokens 和 Socket Mode 启用状态。
    App-Level Token 需要 `connections:write`，并且 Bot User OAuth Token
    必须属于与 app token 相同的 Slack app/workspace。

    如果 `openclaw channels status --probe --json` 显示 `botTokenStatus` 或
    `appTokenStatus: "configured_unavailable"`，说明 Slack 账号已
    配置，但当前运行时无法解析基于 SecretRef 的值。

    类似 `slack socket mode failed to start; retry ...` 的日志表示可恢复的
    启动失败。缺少 scope、令牌被撤销以及无效认证则会立即失败。
    `slack token mismatch ...` 日志意味着 bot token 和 app token
    看起来属于不同的 Slack app；请修正 Slack app 凭据。

  </Accordion>

  <Accordion title="HTTP 模式未接收到事件">
    验证：

    - signing secret
    - webhook path
    - Slack Request URLs（Events + Interactivity + Slash Commands）
    - 每个 HTTP 账号唯一的 `webhookPath`
    - 公共 URL 终止 TLS 并将请求转发到 Gateway path
    - Slack app 的 `request_url` 路径必须与 `channels.slack.webhookPath` 完全匹配（默认 `/slack/events`）

    如果账号快照中出现 `signingSecretStatus: "configured_unavailable"`，
    说明 HTTP 账号已配置，但当前运行时无法
    解析基于 SecretRef 的 signing secret。

    重复出现的 `slack: webhook path ... already registered` 日志意味着两个 HTTP
    账号使用了相同的 `webhookPath`；请为每个账号分配不同的路径。

  </Accordion>

  <Accordion title="原生/slash 命令未触发">
    确认你期望的是以下哪种模式：

    - 原生命令模式（`channels.slack.commands.native: true`），并且 Slack 中注册了匹配的 slash 命令
    - 或单一 slash 命令模式（`channels.slack.slashCommand.enabled: true`）

    Slack 不会自动创建或移除 slash 命令。`commands.native: "auto"` 不会启用 Slack 原生命令；请使用 `true` 并在 Slack app 中创建匹配的命令。在 HTTP 模式下，每个 Slack slash 命令都必须包含 Gateway URL。在 Socket Mode 中，命令负载通过 websocket 到达，Slack 会忽略 `slash_commands[].url`。

    另外还要检查 `commands.useAccessGroups`、DM 授权、channel allowlist
    以及每个频道的 `users` allowlist。Slack 会为被阻止的 slash-command 发送者返回临时错误，包括：

    - `This channel is not allowed.`
    - `You are not authorized to use this command here.`

  </Accordion>
</AccordionGroup>

## 附件媒体参考

当 Slack 文件下载成功且大小限制允许时，Slack 可以将下载的媒体附加到代理轮次中。音频片段可以被转写，图像文件可以通过媒体理解路径处理，或直接传递给支持视觉的回复模型，而其他文件仍可作为可下载的文件上下文使用。

### 支持的媒体类型

| 媒体类型                     | 来源                 | 当前行为                                                                 | 备注                                                                     |
| ------------------------------ | -------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Slack 音频片段               | Slack 文件 URL       | 下载后通过共享音频转写流程路由处理                                         | 需要 `files:read` 权限以及可正常工作的 `tools.media.audio` 模型或 CLI      |
| JPEG / PNG / GIF / WebP 图像 | Slack 文件 URL       | 下载后附加到该轮次中，以便进行支持视觉的处理                                | 单文件上限：`channels.slack.mediaMaxMb`（默认 20 MB）                    |
| PDF 文件                     | Slack 文件 URL       | 下载后作为文件上下文暴露给诸如 `download-file` 或 `pdf` 之类的工具         | Slack 入站不会自动将 PDF 转换为图像视觉输入                               |
| 其他文件                     | Slack 文件 URL       | 尽可能下载，并作为文件上下文暴露                                           | 二进制文件不会被视为图像输入                                              |
| 线程回复                     | 线程起始文件             | 当回复没有直接媒体时，可将根消息文件作为上下文注入                            | 仅包含文件的起始消息会使用附件占位符                                      |
| 多文件消息                   | 多个 Slack 文件         | 每个文件都会被独立评估                                                      | Slack 处理每条消息最多支持八个文件                                        |

### 入站管道

当带有文件附件的 Slack 消息到达时：

1. OpenClaw 使用 bot token 从 Slack 的私有 URL 下载文件。
2. 下载成功后，文件会写入媒体存储。
3. 下载后的媒体路径和内容类型会添加到入站上下文中。
4. 音频片段会路由到共享转写管道；支持图像的模型/工具路径可以使用同一上下文中的图像附件。
5. 其他文件仍可作为文件元数据或媒体引用供能够处理它们的工具使用。

### 线程根附件继承

当消息在某个线程中到达（具有 `thread_ts` 父级）时：

- 如果回复本身没有直接媒体，而包含的根消息有文件，则 Slack 可以将根文件作为线程起始上下文注入。
- 只有在初始化新的或重置后的线程会话时，才会注入根文件。后续仅文本回复会复用现有会话上下文，不会将根文件重新附加为新的媒体。
- 直接回复附件的优先级高于根消息附件。
- 仅包含文件而没有文本的根消息会以附件占位符表示，以便回退逻辑仍可包含其文件。

### 多附件处理

当单条 Slack 消息包含多个文件附件时：

- 每个附件都会通过媒体管道独立处理。
- 下载后的媒体引用会聚合到消息上下文中。
- 处理顺序遵循事件负载中 Slack 文件的顺序。
- 某个附件下载失败不会阻止其他附件处理。

### 大小、下载与模型限制

- **大小上限**：默认每个文件 20 MB。可通过 `channels.slack.mediaMaxMb` 配置。
- **音频转写上限**：当下载的文件发送给转写提供方或 CLI 时，`tools.media.audio.maxBytes` 也同样适用。
- **下载失败**：Slack 无法提供的文件、过期 URL、无法访问的文件、超大文件，以及 Slack 认证/登录 HTML 响应都会被跳过，而不会被报告为不支持的格式。
- **视觉模型**：图像分析会使用当前活动的回复模型（如果它支持视觉），或者使用 `agents.defaults.imageModel` 中配置的图像模型。

### 已知限制

| 场景                                      | 当前行为                                                                   | 解决方法                                                                    |
| --------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 过期的 Slack 文件 URL                        | 文件被跳过；不显示错误                                                      | 在 Slack 中重新上传该文件                                                   |
| 音频转写不可用                               | 片段仍会附加，但不会生成转写                                               | 配置 `tools.media.audio` 或安装受支持的本地转写 CLI                         |
| 无字幕片段未通过提及门控                     | 在私有的推测性转写后被丢弃；转写内容和下载内容都会被丢弃                  | 配置口头姓名提及模式、添加已输入的 bot 提及，或使用 DM                     |
| 未配置视觉模型                               | 图像附件会作为媒体引用存储，但不会作为图像进行分析                        | 配置 `agents.defaults.imageModel` 或使用支持视觉的回复模型                  |
| 非常大的图像（默认 > 20 MB）                 | 根据大小上限被跳过                                                         | 如果 Slack 允许，可增大 `channels.slack.mediaMaxMb`                        |
| 转发/共享的附件                              | 文本和 Slack 托管的图像/文件媒体尽力处理                                   | 直接在 OpenClaw 线程中重新共享                                             |
| PDF 附件                                    | 作为文件/媒体上下文存储，不会自动通过图像视觉路由                          | 使用 `download-file` 获取文件元数据，或使用 `pdf` 工具进行 PDF 分析        |

### 相关文档

- [媒体理解管道](/nodes/media-understanding)
- [音频与语音笔记](/nodes/audio)
- [PDF 工具](/tools/pdf)

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
