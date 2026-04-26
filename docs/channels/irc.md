---
summary: "IRC 插件设置、访问控制和故障排查"
title: IRC
read_when:
  - 你想要将 OpenClaw 连接到 IRC 频道或私信
  - 你正在配置 IRC 允许列表、群组策略或提及门控
---

当你希望在经典频道（`#room`）和直接消息中使用 OpenClaw 时，请使用 IRC。
IRC 作为捆绑插件提供，但在主配置中的 `channels.irc` 下进行配置。

## 快速开始

1. 在 `~/.openclaw/openclaw.json` 中启用 IRC 配置。
2. 至少设置以下内容：

```json5
{
  channels: {
    irc: {
      enabled: true,
      host: "irc.example.com",
      port: 6697,
      tls: true,
      nick: "openclaw-bot",
      channels: ["#openclaw"],
    },
  },
}
```

优先使用私有 IRC 服务器进行机器人协调。如果你故意使用公共 IRC 网络，常见的选择包括 Libera.Chat、OFTC 和 Snoonet。避免为机器人或机器人集群的背信道流量使用可预测的公共频道。

3. 启动/重启网关：

```bash
openclaw gateway run
```

## 安全默认值

- `channels.irc.dmPolicy` 默认为 `"pairing"`。
- `channels.irc.groupPolicy` 默认为 `"allowlist"`。
- 当 `groupPolicy="allowlist"` 时，设置 `channels.irc.groups` 来定义允许的频道。
- 除非你明确接受明文传输，否则请使用 TLS（`channels.irc.tls=true`）。

## 访问控制

IRC 频道有两道独立的"门"：

1. **频道访问**（`groupPolicy` + `groups`）：机器人是否接受来自频道的消息。
2. **发送者访问**（`groupAllowFrom` / 每频道的 `groups["#channel"].allowFrom`）：谁被允许在该频道内触发机器人。

配置键：

- 私信允许列表（私信发送者访问）：`channels.irc.allowFrom`
- 群组发送者允许列表（频道发送者访问）：`channels.irc.groupAllowFrom`
- 每频道控制（频道 + 发送者 + 提及规则）：`channels.irc.groups["#channel"]`
- `channels.irc.groupPolicy="open"` 允许未配置的频道 (**默认仍受提及门控**)

允许列表条目应使用稳定的发送者身份（`nick!user@host`）。
仅在设置了 `channels.irc.dangerouslyAllowNameMatching: true` 时，才启用可变的裸昵称匹配。

### 常见误区：`allowFrom` 是针对私信，不是频道

如果你看到日志：

- `irc: drop group sender alice!ident@host (policy=allowlist)`

……这表示发送者未被允许发送**群组/频道**消息。解决方法：

- 设置 `channels.irc.groupAllowFrom`（适用于所有频道的全局设置），或者
- 对特定频道设置发送者允许列表：`channels.irc.groups["#channel"].allowFrom`

示例（允许任何人在 `#tuirc-dev` 与机器人交谈）：

```json5
{
  channels: {
    irc: {
      groupPolicy: "allowlist",
      groups: {
        "#tuirc-dev": { allowFrom: ["*"] },
      },
    },
  },
}
```

## 回复触发（提及）

即便频道已被允许（通过 `groupPolicy` + `groups`）且发送者被允许，OpenClaw 在群组环境中默认使用**提及门控**。

这意味着你可能会看到类似 `drop channel … (missing-mention)` 的日志，除非消息中包含匹配机器人的提及模式。

如果你希望机器人在 IRC 频道中**无需提及就回复**，请为该频道禁用提及门控：

```json5
{
  channels: {
    irc: {
      groupPolicy: "allowlist",
      groups: {
        "#tuirc-dev": {
          requireMention: false,
          allowFrom: ["*"],
        },
      },
    },
  },
}
```

或者允许**所有** IRC 频道（无单独频道允许列表）并仍然无需提及就回复：

```json5
{
  channels: {
    irc: {
      groupPolicy: "open",
      groups: {
        "*": { requireMention: false, allowFrom: ["*"] },
      },
    },
  },
}
```

## 安全提示（建议用于公共频道）

如果你在公共频道设置了 `allowFrom: ["*"]`，任何人都可以促使机器人响应。
为降低风险，请限制该频道的工具权限。

### 所有人使用同一套工具

```json5
{
  channels: {
    irc: {
      groups: {
        "#tuirc-dev": {
          allowFrom: ["*"],
          tools: {
            deny: ["group:runtime", "group:fs", "gateway", "nodes", "cron", "browser"],
          },
        },
      },
    },
  },
}
```

### 不同发送者使用不同工具（所有者拥有更多权限）

使用 `toolsBySender` 为 `"*"` 应用更严格的策略，为你的昵称设置较宽松的策略：

```json5
{
  channels: {
    irc: {
      groups: {
        "#tuirc-dev": {
          allowFrom: ["*"],
          toolsBySender: {
            "*": {
              deny: ["group:runtime", "group:fs", "gateway", "nodes", "cron", "browser"],
            },
            "id:eigen": {
              deny: ["gateway", "nodes", "cron"],
            },
          },
        },
      },
    },
  },
}
```

备注：

- `toolsBySender` 的键应使用 `id:` 前缀指定 IRC 发送者身份：
  `id:eigen` 或 `id:eigen!~eigen@174.127.248.171`，以实现更准确匹配。
- 旧版无前缀的键仍被接受，但仅作为 `id:` 匹配处理。
- 首个匹配成功的发送者策略生效；`"*"` 是通配符后备。

有关群组访问与提及门控（及其交互方式）的更多信息，请参阅：[/channels/groups](/channels/groups)。

## NickServ

连接后使用 NickServ 认证：

```json5
{
  channels: {
    irc: {
      nickserv: {
        enabled: true,
        service: "NickServ",
        password: "your-nickserv-password",
      },
    },
  },
}
```

可选的连接时一次性注册：

```json5
{
  channels: {
    irc: {
      nickserv: {
        register: true,
        registerEmail: "bot@example.com",
      },
    },
  },
}
```

昵称注册成功后请禁用 `register`，避免重复执行 REGISTER 操作。

## 环境变量

默认帐号支持以下环境变量：

- `IRC_HOST`
- `IRC_PORT`
- `IRC_TLS`
- `IRC_NICK`
- `IRC_USERNAME`
- `IRC_REALNAME`
- `IRC_PASSWORD`
- `IRC_CHANNELS`（逗号分隔）
- `IRC_NICKSERV_PASSWORD`
- `IRC_NICKSERV_REGISTER_EMAIL`

`IRC_HOST` 不能从工作区的 `.env` 中设置；请参阅 [Workspace `.env` files](/gateway/security)。

## 故障排查

- 如果机器人已连接但在频道中从不回复，请验证 `channels.irc.groups` **以及** 提及门控是否正在丢弃消息（`missing-mention`）。如果你希望它在无需 @ 提及的情况下回复，请为该频道设置 `requireMention:false`。
- 如果登录失败，请验证昵称可用性和服务器密码。
- 如果在自定义网络上 TLS 失败，请验证主机/端口和证书设置。

## 相关内容

- [频道概览](/channels) — 所有支持的频道
- [配对](/channels/pairing) — 私信认证和配对流程
- [群组](/channels/groups) — 群聊行为和提及门控
- [频道路由](/channels/channel-routing) — 消息的会话路由
- [安全](/gateway/security) — 访问模型和加固
