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

2. 至少在 `~/.openclaw/openclaw.json` 中设置 host、nick，以及要加入的频道：

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

3. 启动/重启网关：

```bash
openclaw gateway run
```

建议为机器人协调使用私有 IRC 服务器。如果你有意使用公共 IRC 网络，常见选择包括 Libera.Chat、OFTC 和 Snoonet。避免将机器人或 swarm 后端通信流量放在可预测的公共频道中。

## 连接设置

| Key                           | Default                       | Notes                                                       |
| ----------------------------- | ----------------------------- | ----------------------------------------------------------- |
| `host`                        | none (required)               | IRC 服务器主机名                                            |
| `port`                        | `6697` with TLS, `6667` plain | 1-65535                                                     |
| `tls`                         | `true`                        | 仅在有意使用明文时设置为 `false`                           |
| `nick`                        | none (required)               | Bot 昵称                                                    |
| `username`                    | nick, else `openclaw`         | IRC 用户名                                                  |
| `realname`                    | `OpenClaw`                    | Realname/GECOS 字段                                         |
| `password` / `passwordFile`   | none                          | 服务器密码；文件必须是普通文件                              |
| `channels`                    | none                          | 要加入的频道（`["#openclaw"]`）                             |
| `accounts` / `defaultAccount` | none                          | 多账户设置；环境变量仅填充默认账户                          |

## 安全默认值

- IRC 使用原始 TCP/TLS 套接字，不经过 OpenClaw 运维管理的前向代理路由。在要求所有出站流量都必须经过该前向代理的部署中，除非已明确批准直接 IRC 出站，否则请设置 `channels.irc.enabled=false`。
- `channels.irc.dmPolicy` 默认值为 `"pairing"`：未知的 DM 发送者会获得一个配对代码，您可使用 `openclaw pairing approve irc <code>` 批准该代码。
- `channels.irc.groupPolicy` 默认值为 `"allowlist"`。
- 当 `groupPolicy="allowlist"` 时，请设置 `channels.irc.groups` 以定义允许的频道。
- 除非您有意接受明文传输，否则请使用 TLS（`channels.irc.tls=true`）。

## Access Control

IRC channels have two separate “gates”:

1. **Channel access** (`groupPolicy` + `groups`): whether the bot accepts messages from a channel at all.
2. **Sender access** (`groupAllowFrom` / per-channel `groups["#channel"].allowFrom`): who can trigger the bot in that channel.

Configuration keys:

- DM allowlist (DM sender access): `channels.irc.allowFrom`
- Group sender allowlist (channel sender access): `channels.irc.groupAllowFrom`
- Per-channel controls (channel + sender + mention rules): `channels.irc.groups["#channel"]` with `requireMention`, `allowFrom`, `enabled`, `tools`, `toolsBySender`, `skills`, and `systemPrompt`
- `channels.irc.groupPolicy="open"` allows unconfigured channels (**still mention-gated by default**)

Allowlist entries should use stable sender identities (`nick!user@host`).
Matching by bare nick only is volatile and is enabled only when `channels.irc.dangerouslyAllowNameMatching: true`.

### Common pitfall: `allowFrom` is for DMs, not channels

If you see a log like this:

- `irc: drop group sender alice!ident@host (policy=allowlist)`

...that means the sender is not allowed for **group/channel** messages. You can fix it by either:

- setting `channels.irc.groupAllowFrom` (applies globally to all channels), or
- setting a sender allowlist per channel: `channels.irc.groups["#channel"].allowFrom`

Example (allow anyone in `#openclaw` to talk to the bot):

```json5
{
  channels: {
    irc: {
      groupPolicy: "allowlist",
      groups: {
        "#openclaw": { allowFrom: ["*"] },
      },
    },
  },
}
```

## 回复触发（提及）

即使某个频道是允许的（通过 `groupPolicy` + `groups`），并且发送者也是允许的，OpenClaw 在群组上下文中默认仍会启用**提及门控**。当消息包含已连接机器人的昵称，或匹配你配置的提及模式时，机器人就会被视为已被提及。

这意味着你可能会看到类似 `drop channel … (missing-mention)` 的日志，除非消息中包含与机器人匹配的提及模式。

如果你想让机器人在 IRC 频道中**无需提及**也能回复，请为该频道关闭提及门控：

```json5
{
  channels: {
    irc: {
      groupPolicy: "allowlist",
      groups: {
        "#openclaw": {
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
        "#openclaw": {
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
        "#openclaw": {
          allowFrom: ["*"],
          toolsBySender: {
            "*": {
              deny: ["group:runtime", "group:fs", "gateway", "nodes", "cron", "browser"],
            },
            "id:alice": {
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

- `toolsBySender` 键应使用显式前缀（`channel:`、`id:`、`e164:`、`username:`、`name:`）。对于 IRC，请使用发送者身份值的 `id:`：`id:alice`，或者 `id:alice!~alice@203.0.113.7` 以获得更强的匹配。
- 旧式未加前缀的键仍然可接受，但只按 `id:` 匹配，并会发出弃用警告。
- 首个匹配到的发送者策略生效；`"*"` 是通配符回退项。

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

当设置了密码时，NickServ identify 默认会运行（只需将 `enabled` 设为 `false` 即可选择退出）。`service` 默认值为 `NickServ`；`passwordFile` 是内联 `password` 的替代方案。

可选的一次性连接注册（`register: true` 需要 `registerEmail`）：

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
