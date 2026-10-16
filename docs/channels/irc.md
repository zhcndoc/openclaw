---
summary: "IRC 插件设置、访问控制和故障排查"
title: "IRC"
read_when:
  - "你想将 OpenClaw 连接到 IRC 频道或私信"
  - "你正在配置 IRC 白名单、组策略或提及门控"
---

当您希望在经典频道 （`#room`） 和私信中使用 OpenClaw 时，请使用 IRC。安装官方的IRC插件，然后在`channels.irc`下进行配置。

## <a id="quick-start"></a> 快速开始

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

3. 验证通道：

```bash
openclaw channels status --probe
```

配置更改遵循 [hot reload](/gateway/configuration/hot-reload)。如果网关离线，则以 `openclaw gateway run` 启动它。

建议为机器人协调使用私有 IRC 服务器。如果你有意使用公共 IRC 网络，常见选择包括 Libera.Chat、OFTC 和 Snoonet。避免将机器人或 swarm 后端通信流量放在可预测的公共频道中。

## <a id="inbound-durability"></a> 入站持久性

OpenClaw 在进行正常的策略检查和代理分发之前，会将每个被接受的 IRC `PRIVMSG` 写入其持久化的入站队列。待处理或可重试的消息在 Gateway 重启后仍会保留，并且会按频道或直接消息对端进行序列化。

IRC 不提供可重播的传送 ID 或重新发送断开连接的客户端错过的消息。因此，OpenClaw 分配一个仅在当前 TCP 连接内稳定的本地 ID。队列保护本地接受到调度窗口；它无法恢复从未到达 OpenClaw 的消息，也无法对跨连接重新发送的服务器进行重复数据删除。

## <a id="connection-settings"></a> 连接设置

| 键                           | 默认值                       | 笔记                                                       |
| ----------------------------- | ----------------------------- | ----------------------------------------------------------- |
| `host`                        | 无（必需）               | IRC 服务器主机名                                         |
| `port`                        | `6697` 与 TLS、`6667` 普通 | 1-65535                                                     |
| `tls`                         | `true`                        | 仅在有意使用明文时设置为 `false`                  |
| `nick`                        | 无（必需）               | Bot 昵称                                                    |
| `username`                    | 尼克，否则 `openclaw`         | IRC 用户名                                                |
| `realname`                    | `OpenClaw`                    | Realname/GECOS 字段                                        |
| `password` / `passwordFile`   | 无                          | 服务器密码；文件必须是普通文件                |
| `channels`                    | 无                          | 要加入的频道（`["#openclaw"]`）                          |
| `replyToMode`                 | `all`                         | 回复参考模式：`off`、`first`、`all` 或 `batched`   |
| `accounts` / `defaultAccount` | 无                          | 多账户设置；环境变量仅填充默认账户 |

命名账户继承全通道回复模式；用 `channels.irc.accounts.<id>.replyToMode` 覆盖它。

在默认的 `hybrid` 重新加载模式下，添加或编辑非默认命名帐户只会重新启动该 IRC 帐户。其他帐户连接和网关保持运行状态，手动停止的帐户保持停止状态。共享 IRC 设置、`accounts.default` 和帐户删除会重新启动整个 IRC 通道，因为它们会影响继承或帐户选择。

帐户重新启动会在关闭其入口队列之前完成已接受的消息接纳；替换监视器从同一队列中恢复挂起的通道消息。断开连接时丢失的消息无法恢复，并且先前连接中的待处理 DM 会被丢弃，因为 IRC 昵称可以更改所有者。

丢失的网络路径可能会使套接字保持打开状态，而没有任何内容到达。当服务器两分钟内没有发送任何内容时，OpenClaw 向其发送 `PING`；四分钟的沉默后，它会关闭连接并重新连接。

## <a id="outbound-text"></a> 出站文本

IRC 以纯文本形式发送 Markdown，保留代码内容和链接目标。长回复会在拆分为 IRC 消息之前呈现，因此代码围栏和内联格式在块边界之间保持一致。 `textChunkLimit`和`streaming.chunkMode`控制文本分割；该套接字还强制执行 IRC 的线路大小限制。

如果非空文本在格式化或 IRC 清理过程中变为空，则发送失败而不是报告已送达。回复引用不算作消息内容。

直接发送消息至频道或昵称 CLI：

```bash
openclaw message send --channel irc --target '#openclaw' --message 'Hello from OpenClaw'
```

## <a id="security-defaults"></a> 安全默认值

- IRC 使用原始 TCP/TLS 套接字，不经过 OpenClaw 运维管理的前向代理路由。在要求所有出站流量都必须经过该前向代理的部署中，除非已明确批准直接 IRC 出站，否则请设置 `channels.irc.enabled=false`。
- `channels.irc.dmPolicy` 默认值为 `"pairing"`：未知的 DM 发送者会获得一个配对代码，您可使用 `openclaw pairing approve irc <code>` 批准该代码。
- `channels.irc.groupPolicy` 默认值为 `"allowlist"`。
- 当 `groupPolicy="allowlist"` 时，请设置 `channels.irc.groups` 以定义允许的频道。
- 除非您有意接受明文传输，否则请使用 TLS（`channels.irc.tls=true`）。

## <a id="access-control"></a> 访问控制

IRC 频道有两个独立的“门禁”：

1. **频道访问**（`groupPolicy` + `groups`）：决定机器人是否接受来自某个频道的消息。
2. **发送者访问**（`groupAllowFrom` / 每频道 `groups["#channel"].allowFrom`）：决定谁可以在该频道中触发机器人。

配置键：

- DM 白名单（DM 发送者访问）：`channels.irc.allowFrom`
- 组发送者白名单（频道发送者访问）：`channels.irc.groupAllowFrom`
- 每频道控制（频道 + 发送者 + 提及规则）：`channels.irc.groups["#channel"]`，包含 `requireMention`、`allowFrom`、`enabled`、`tools`、`toolsBySender`、`skills` 和 `systemPrompt`
- `channels.irc.groupPolicy="open"` 允许未配置的频道（**默认情况下仍然需要提及触发**）

允许列表条目应使用稳定的发件人身份 （`nick!user@host`）。裸缺口匹配是可变的，仅在 `channels.irc.dangerouslyAllowNameMatching: true` 时启用。

### <a id="common-gotcha%3A-allowfrom-is-for-dms%2C-not-channels"></a><a id="common-gotcha-allowfrom-is-for-dms-not-channels"></a> 常见问题：`allowFrom` 适用于 DM，而非渠道

如果你看到类似这样的日志：

- `irc: drop group sender alice!ident@host (policy=allowlist)`

...这意味着发件人不允许发送 **group/channel** 消息。通过以下任一方法修复它：

- 设置 `channels.irc.groupAllowFrom`（全局应用于所有频道），或
- 为每个频道单独设置发送者白名单：`channels.irc.groups["#channel"].allowFrom`

示例（允许 `#openclaw` 中的任何人和机器人对话）：

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

## <a id="reply-triggering-(mentions)"></a><a id="reply-triggering-mentions"></a> 回复触发（提及）

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

## <a id="security-note-(recommended-for-public-channels)"></a><a id="security-note-recommended-for-public-channels"></a> 安全说明（公共频道推荐）

如果你在公共频道中允许 `allowFrom: ["*"]`，任何人都可以向机器人发起提示。 为降低风险，请限制该频道可用的工具。

### <a id="same-tools-for-everyone-in-the-channel"></a> 频道中的所有人使用相同工具

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

### <a id="different-tools-per-sender-(owner-gets-more-power)"></a><a id="different-tools-per-sender-owner-gets-more-power"></a> 不同发送者使用不同工具（所有者权限更高）

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
- 在启动网关之前，运行 `openclaw doctor --fix` 将已停用的无前缀密钥迁移到 `id:` 条目。
- 首个匹配到的发送者策略生效；`"*"` 是通配符回退项。

有关组访问与提及门控（以及它们如何交互）的更多信息，请参阅：[/channels/groups](/channels/groups).

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

## <a id="environment-variables"></a> 环境变量

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

`IRC_HOST` 无法从工作区 `.env` 进行设置；请参阅 [ 工作区 `.env` 文件 ](/gateway/security#workspace-env-files)。

## <a id="troubleshooting"></a> 故障排查

- 如果机器人已连接但从未在频道中回复，请验证 `channels.irc.groups`、**和** 提及门控是否正在丢弃消息 （`missing-mention`）。如果您希望它在没有 ping 的情况下回复，请将通道设置为 `requireMention:false`。
- 如果登录失败，请检查 nick 是否可用以及服务器密码是否正确。
- 如果 TLS 在自定义网络上失败，请验证 host/port 和证书设置。

## <a id="related"></a> 相关内容

- [Channels Overview](/channels) — 所有支持的通道
- [配对](/channels/pairing) — DM 身份验证和配对流程
- [Groups](/channels/groups) — 群聊行为和提及门控
- [通道路由](/channels/channel-routing) — 消息的会话路由
- [Security](/gateway/security) — 访问模型和强化
