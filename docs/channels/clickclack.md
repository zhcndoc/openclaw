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

在 ClickClack 服务器上创建一个 bot token：

```bash
clickclack admin bot create \
  --workspace <workspace_id> \
  --name "OpenClaw" \
  --handle openclaw \
  --scopes bot:write \
  --plain
```

对于用户所有的 bot，添加 `--owner <user_id>`。

配置 OpenClaw：

```json5
{
  channels: {
    clickclack: {
      enabled: true,
      baseUrl: "https://clickclack.example.com",
      token: { source: "env", provider: "default", id: "CLICKCLACK_BOT_TOKEN" },
      workspace: "default",
      defaultTo: "channel:general",
    },
  },
}
```

然后运行：

```bash
export CLICKCLACK_BOT_TOKEN="ccb_..."
openclaw gateway
```

只有当 `baseUrl`、`token` 和 `workspace` 都已设置时，账号才算已配置。`workspace` 接受 workspace id（`wsp_...`）、slug 或名称；gateway 会在启动时将其解析为 id。

### 账号配置键

| Key                     | Default             | Notes                                                                                   |
| ----------------------- | ------------------- | --------------------------------------------------------------------------------------- |
| `baseUrl`               | none (required)     | ClickClack 服务器 URL。                                                                 |
| `token`                 | none (required)     | Plain string or secret ref (`source: "env" \| "file" \| "exec"`).                       |
| `workspace`             | none (required)     | Workspace id, slug, or name.                                                            |
| `replyMode`             | `"agent"`           | `"agent"` runs the full agent pipeline; `"model"` sends short direct model completions. |
| `defaultTo`             | `"channel:general"` | 当 outbound path 没有提供目标时使用的目标。                                              |
| `allowFrom`             | `["*"]`             | 用户 ID allowlist，用于 inbound DMs and channel messages.                               |
| `botUserId`             | auto-detected       | 在启动时从 bot token 身份解析得到。                                                     |
| `agentId`               | route default       | 将此账号的 inbound messages 固定到一个 agent。                                          |
| `toolsAllow`            | none                | 该账号的 agent replies 所允许使用的工具白名单。                                         |
| `model`, `systemPrompt` | none                | 用于 `replyMode: "model"` completions。                                                 |
| `reconnectMs`           | `1500`              | Realtime 重连延迟（100 到 60000）。                                                     |

如果 `plugins.allow` 是一个非空的限制性列表，那么在 channel 设置中显式选择 ClickClack，或运行 `openclaw plugins enable clickclack`，都会将 `clickclack` 追加到该列表中。Onboarding 安装使用相同的显式选择行为。这些路径不会覆盖 `plugins.deny` 或全局的 `plugins.enabled: false` 设置。直接执行 `openclaw plugins install @openclaw/clickclack` 会遵循正常的插件安装策略，并且也会将 ClickClack 记录到现有的 allowlist 中。

## Multiple bots

Each account will open its own ClickClack real-time connection and use its own bot token.

```json5
{
  channels: {
    clickclack: {
      enabled: true,
      baseUrl: "https://clickclack.example.com",
      defaultAccount: "service",
      accounts: {
        service: {
          token: { source: "env", provider: "default", id: "CLICKCLACK_SERVICE_BOT_TOKEN" },
          workspace: "default",
          defaultTo: "channel:general",
          agentId: "service-bot",
        },
        support: {
          token: { source: "env", provider: "default", id: "CLICKCLACK_SUPPORT_BOT_TOKEN" },
          workspace: "default",
          defaultTo: "dm:usr_...",
          agentId: "support-bot",
        },
      },
    },
  },
}
```

## 回复模式

- `replyMode: "agent"`（默认）会通过正常的代理流程分发传入消息，包括会话记录和工具策略。
- `replyMode: "model"` 会跳过代理流程，并使用插件运行时的 `llm.complete` 生成简短的直接机器人回复（可选地由 `model` 和 `systemPrompt` 进行调整）。

模型模式会针对已解析的机器人代理 ID 运行补全，这需要显式的
`plugins.entries.clickclack.llm.allowAgentIdOverride: true` 信任位：

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
}
```

如果你只使用默认的 `agent` 回复模式，就保持该信任位关闭；在那里并不需要它。

## Agent 活动行

默认情况下，当一个 agent 回合运行时，ClickClack 频道不会显示任何内容；只有最终回复会出现。将账户上的 `agentActivity` 设为 `true`，即可在回合进行中发布持久化的 `agent_commentary` 和 `agent_tool` 消息行：

```json5
{
  channels: {
    clickclack: {
      enabled: true,
      token: { source: "env", provider: "default", id: "CLICKCLACK_BOT_TOKEN" },
      workspace: "default",
      agentActivity: true,
    },
  },
}
```

要求和行为：

- **默认关闭。** 现有配置和旧版 ClickClack 服务器不会受到影响。
- **需要 `agent_activity:write` 令牌范围。** 该范围独立于 `bot:write`，且不会从中继承；在启用该选项之前，请使用 `--scopes bot:write,agent_activity:write` 创建机器人令牌（或向现有令牌授予该范围）。
- **尽力降级。** 如果令牌缺少 `agent_activity:write`，或者服务器拒绝活动写入，会记录失败，但最终回复仍会正常送达；不会出现活动行。
- 行按每个回合（`turn_id`）分组，并进行合并，使一个逻辑步骤对应一行；工具行使用与 Discord/Slack/Telegram 相同的进度格式（工具名称加命令详情）。
- **归属元数据。** 由 agent 撰写的帖子（活动行和最终回复）会携带 `author_model` 和 `author_thinking` 字段，这些字段根据该回合实际使用的模型解析而来（包括回退后的情况）。未定义这些列的服务器会忽略未知的 JSON 字段；会持久化这些字段的服务器则可以按消息回答“这一行是谁用什么模型、在什么思考级别说的”。

## 目标

- `channel:<name-or-id>` 发送到工作区频道。裸目标默认使用 `channel:`。
- `dm:<user_id>` 创建或重用与该用户的直接对话。
- `thread:<message_id>` 在该消息所在的线程中回复。

显式的出站目标也可以带有 `clickclack:` 或 `cc:` 提供商前缀。

示例：

```bash
openclaw message send --channel clickclack --target channel:general --message "hello"
openclaw message send --channel clickclack --target dm:usr_123 --message "hello"
openclaw message send --channel clickclack --target thread:msg_123 --message "following up"
```

## 权限

ClickClack token 作用域由 ClickClack API 强制执行。

- `bot:read`: 读取 workspace/channel/message/thread/DM/realtime/profile 数据。
- `bot:write`: `bot:read` 加上 channel 消息、thread 回复、DM 和上传。
- `bot:admin`: `bot:write` 加上 channel 创建。
- `agent_activity:write`: 持久化 agent activity 行（`agent_commentary` / `agent_tool`）。不会被 `bot:write` 或 `bot:admin` 继承；仅在设置 `agentActivity: true` 时需要。

OpenClaw 仅在正常 agent chat 时需要 `bot:write`。在启用 [agent activity rows](#agent-activity-rows) 时再添加 `agent_activity:write`。

## 故障排查

- `ClickClack is not configured for account "<id>"`: 为该账号设置 `baseUrl`、`token`（例如通过 `CLICKCLACK_BOT_TOKEN`）和 `workspace`。
- `ClickClack workspace not found: <value>`：将 `workspace` 设置为 ClickClack 返回的工作区 id、slug 或名称。
- 没有传入回复：确认该 token 具有实时读取访问权限，并注意该机器人会忽略自己的消息以及其他机器人的消息。
- 频道发送失败：验证该机器人是该工作区的成员，并且具有 `bot:write`。
