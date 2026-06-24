---
summary: "IRC 插件设置、访问控制和故障排查"
title: IRC
read_when:
  - 你想将 OpenClaw 连接到 IRC 频道或私信
  - 你正在配置 IRC 白名单、组策略或提及门控
---

当你希望 OpenClaw 出现在经典频道（`#room`）和直接消息中时，请使用 IRC。  
安装官方 IRC 插件，然后在 `channels.irc` 下进行配置。

## 快速开始

1. 安装插件：

```bash
openclaw plugins install @openclaw/irc
```

2. 在 `~/.openclaw/openclaw.json` 中启用 IRC 配置。
3. 至少设置以下内容：

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

建议为机器人协作使用私有 IRC 服务器。如果你有意使用公共 IRC 网络，常见选择包括 Libera.Chat、OFTC 和 Snoonet。避免使用可预测的公共频道来承载机器人或 swarm 的后端流量。

4. 启动/重启网关：

```bash
openclaw gateway run
```

## 安全默认值

- IRC 使用原始 TCP/TLS 套接字，运行在 OpenClaw 运营者管理的转发代理路由之外。在需要所有出站流量都通过该转发代理的部署中，除非已明确批准直接 IRC 出站，否则请设置 `channels.irc.enabled=false`。
- `channels.irc.dmPolicy` 默认为 `"pairing"`。
- `channels.irc.groupPolicy` 默认为 `"allowlist"`。
- 当 `groupPolicy="allowlist"` 时，请设置 `channels.irc.groups` 以定义允许的频道。
- 除非你有意接受明文传输，否则请使用 TLS（`channels.irc.tls=true`）。

## 访问控制

IRC 频道有两个独立的“门”：

1. **频道访问**（`groupPolicy` + `groups`）：机器人是否完全接受来自某个频道的消息。
2. **发送者访问**（`groupAllowFrom` / 按频道的 `groups["#channel"].allowFrom`）：谁可以在该频道中触发机器人。

配置键：

- DM 白名单（DM 发送者访问）：`channels.irc.allowFrom`
- 组发送者白名单（频道发送者访问）：`channels.irc.groupAllowFrom`
- 每个频道的控制项（频道 + 发送者 + 提及规则）：`channels.irc.groups["#channel"]`
- `channels.irc.groupPolicy="open"` 允许未配置的频道（**默认情况下仍然受提及门控限制**）

白名单条目应使用稳定的发送者身份（`nick!user@host`）。
仅使用裸 nick 匹配是可变的，并且只有在 `channels.irc.dangerouslyAllowNameMatching: true` 时才启用。

### 常见坑：`allowFrom` 用于 DM，不用于频道

如果你看到类似这样的日志：

- `irc: drop group sender alice!ident@host (policy=allowlist)`

...这意味着该发送者未被允许用于**组/频道**消息。你可以通过以下方式修复：

- 设置 `channels.irc.groupAllowFrom`（对所有频道全局生效），或
- 为每个频道设置发送者白名单：`channels.irc.groups["#channel"].allowFrom`

示例（允许 `#tuirc-dev` 中任何人和机器人交谈）：

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

即使某个频道已被允许（通过 `groupPolicy` + `groups`），且发送者也已被允许，OpenClaw 在组上下文中默认仍会启用**提及门控**。

这意味着你可能会看到类似 `drop channel … (missing-mention)` 的日志，除非消息中包含与机器人匹配的提及模式。

如果你想让机器人在 IRC 频道中**无需提及**也能回复，请为该频道关闭提及门控：

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

或者允许**所有** IRC 频道（不使用按频道白名单），同时仍然无需提及即可回复：

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

## 安全说明（公共频道推荐）

如果你在公共频道中允许 `allowFrom: ["*"]`，任何人都可以向机器人发起提示。  
为降低风险，请限制该频道可用的工具。

### 频道中的所有人使用相同工具

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

### 不同发送者使用不同工具（所有者权限更高）

使用 `toolsBySender` 为 `"*"` 应用更严格的策略，并为你的 nick 应用更宽松的策略：

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

注意：

- `toolsBySender` 的键应使用 `id:` 作为 IRC 发送者身份值：
  `id:eigen` 或 `id:eigen!~eigen@174.127.248.171`，以获得更强的匹配。
- 旧式未加前缀的键仍然被接受，但只会按 `id:` 进行匹配。
- 首个匹配到的发送者策略生效；`"*"` 是通配符回退。

关于组访问与提及门控的更多信息（以及它们如何交互），请参见：[/channels/groups](/channels/groups)。

## NickServ

连接后使用 NickServ 进行身份验证：

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

连接时可选的一次性注册：

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

在 nick 注册完成后，请禁用 `register`，以避免重复的 REGISTER 尝试。

## 环境变量

默认账户支持：

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

`IRC_HOST` 不能从工作区的 `.env` 中设置；请参见 [Workspace `.env` 文件](/gateway/security)。

## 故障排查

- 如果机器人已连接但在频道中从不回复，请检查 `channels.irc.groups`，以及提及门控是否正在丢弃消息（`missing-mention`）。如果你希望它在没有 ping 的情况下回复，请为该频道设置 `requireMention:false`。
- 如果登录失败，请检查 nick 是否可用以及服务器密码是否正确。
- 如果在自定义网络上 TLS 失败，请检查主机/端口和证书设置。

## 相关内容

- [频道概览](/channels) — 所有受支持的频道
- [配对](/channels/pairing) — DM 身份验证和配对流程
- [组](/channels/groups) — 群聊行为和提及门控
- [频道路由](/channels/channel-routing) — 消息的会话路由
- [安全性](/gateway/security) — 访问模型和加固
