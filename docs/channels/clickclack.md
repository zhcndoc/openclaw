---
summary: "ClickClack bot-token channel setup and target syntax"
read_when:
  - 连接 OpenClaw 到 ClickClack 工作区
  - 测试 ClickClack bot 身份
title: "ClickClack"
---

ClickClack 通过一等公民的 ClickClack bot token 将 OpenClaw 连接到一个自托管的 ClickClack 工作区。

当你希望 OpenClaw agent 以 ClickClack bot 用户的身份出现时，请使用此功能。ClickClack 支持独立的服务 bot 和用户所有的 bot；用户所有的 bot 会保留 `owner_user_id`，并且只接收你授予的 token 作用域。

## 快速设置

在 ClickClack 中创建一个 bot token：

```bash
clickclack admin bot create \
  --workspace <workspace_id_or_slug> \
  --name "OpenClaw" \
  --handle openclaw \
  --scopes bot:write \
  --plain
```

对于用户所有的 bot，添加 `--owner <user_id>`。

配置 OpenClaw：

```json5
{
  plugins: {
    entries: {
      clickclack: {
        llm: {
          allowAgentIdOverride: true,
        },
      },
    },
  },
  channels: {
    clickclack: {
      enabled: true,
      baseUrl: "https://app.clickclack.chat",
      token: { source: "env", provider: "default", id: "CLICKCLACK_BOT_TOKEN" },
      workspace: "default",
      defaultTo: "channel:general",
      agentId: "clickclack-bot",
      replyMode: "model",
    },
  },
}
```

然后运行：

```bash
export CLICKCLACK_BOT_TOKEN="ccb_..."
openclaw gateway
```

如果 `plugins.allow` 是一个非空的受限列表，在频道设置中显式选择
ClickClack，或运行 `openclaw plugins enable clickclack`
会把 `clickclack` 追加到该列表。引导安装使用相同的
显式选择行为。这些路径不会覆盖 `plugins.deny` 或
全局的 `plugins.enabled: false` 设置。直接执行
`openclaw plugins install @openclaw/clickclack` 会遵循正常的
插件安装策略，并且也会在现有 allowlist 中记录 ClickClack。

## 多个 bot

每个账户都会打开自己的 ClickClack 实时连接，并使用各自的 bot token。

```json5
{
  plugins: {
    entries: {
      clickclack: {
        llm: {
          allowAgentIdOverride: true,
        },
      },
    },
  },
  channels: {
    clickclack: {
      enabled: true,
      baseUrl: "https://app.clickclack.chat",
      defaultAccount: "service",
      accounts: {
        service: {
          token: { source: "env", provider: "default", id: "CLICKCLACK_SERVICE_BOT_TOKEN" },
          workspace: "default",
          defaultTo: "channel:general",
          agentId: "service-bot",
          replyMode: "model",
        },
        peter: {
          token: { source: "env", provider: "default", id: "CLICKCLACK_PETER_BOT_TOKEN" },
          workspace: "default",
          defaultTo: "dm:usr_...",
          agentId: "peter-bot",
          replyMode: "model",
        },
      },
    },
  },
}
```

`replyMode: "model"` 会直接使用 `api.runtime.llm.complete` 来快速生成 bot 回复。
当某个账户设置了 `agentId` 时，OpenClaw 需要显式的
`plugins.entries.clickclack.llm.allowAgentIdOverride` 信任位，这样插件
才能为那个 bot agent 运行补全。如果你只使用默认的
agent 路由，就保持关闭它。

## 目标

- `channel:<name-or-id>` 发送到工作区频道。裸目标默认以 `channel:` 开头。
- `dm:<user_id>` 创建或复用与该用户的直接对话。
- `thread:<message_id>` 在现有线程中回复。

示例：

```bash
openclaw message send --channel clickclack --target channel:general --message "hello"
openclaw message send --channel clickclack --target dm:usr_123 --message "hello"
openclaw message send --channel clickclack --target thread:msg_123 --message "following up"
```

## 权限

ClickClack token 作用域由 ClickClack API 强制执行。

- `bot:read`：读取工作区/频道/消息/线程/DM/实时/个人资料数据。
- `bot:write`：`bot:read` 加上频道消息、线程回复、DM 和上传。
- `bot:admin`：`bot:write` 加上频道创建。

OpenClaw 在正常的 agent 聊天中只需要 `bot:write`。

## 故障排查

- `ClickClack is not configured`：设置 `channels.clickclack.token` 或 `CLICKCLACK_BOT_TOKEN`。
- `workspace not found`：将 `workspace` 设置为 ClickClack 返回的工作区 id 或 slug。
- 没有传入回复：确认 token 具有实时读取权限，并且 bot 没有回复自己的消息。
- 频道发送失败：验证 bot 是工作区成员并且具有 `bot:write`。
