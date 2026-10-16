---
summary: "谁可以联系代理：DM 策略、白名单、DM 会话隔离、上下文可见性和命令授权"
read_when:
  - "决定谁可以 DM 或触发机器人"
  - "隔离共享或多用户收件箱的 DM 会话"
  - "限制哪些补充上下文到达模型"
title: "访问控制和许可名单"
sidebarTitle: "访问控制"
---

## <a id="dm-access%3A-pairing%2C-allowlist%2C-open%2C-disabled"></a><a id="dm-access-pairing-allowlist-open-disabled"></a> DM 访问：配对、允许名单、开放、禁用

每个支持 DM- 的通道都支持 `dmPolicy`（或 `*.dm.policy`），它在处理消息之前控制入站 DM：

| 策略      | 行为                                                                                                                                                                                                             |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pairing`   | 默认。未知的发件人会获得配对码；机器人会忽略它们，直到获得批准。代码在 1 小时后过期；在创建新请求之前，重复的 DM 不会重新发送代码。每个通道的待处理请求上限为 3 个。 |
| `allowlist` | 未知发送者会被阻止，不进行配对握手。                                                                                                                                                                       |
| `open`      | 任何人都可以发送 DM（公开）。要求该通道允许名单包含 `"*"`（显式启用）。                                                                                                                           |
| `disabled`  | 入站私信完全被忽略。                                                                                                                                                                                        |

```bash
openclaw pairing list <channel>
openclaw pairing approve <channel> <code>
```

磁盘上的详细信息 + 文件： [配对](/channels/pairing)

首选配对 + DM 许可名单。对于群组，由成员资格决定，而不是由频道类型决定：您信任的成员（您的团队、家人或朋友）的私人房间是 `groupPolicy: "open"` 的正常部署（任何成员都可以触发机器人）。保留发件人允许名单或提及对陌生人可以加入或发帖的房间进行控制，并将 `dmPolicy="open"` 视为有意选择加入。

### <a id="allowlists-(two-layers)"></a><a id="allowlists-two-layers"></a> 允许名单（两层）

- **DM 允许名单** (`allowFrom` / `channels.discord.allowFrom` / `channels.slack.allowFrom`；旧版：`channels.discord.dm.allowFrom`、`channels.slack.dm.allowFrom`)：可以给机器人发送 DM 的人员。当 `dmPolicy="pairing"` 时，批准信息会写入 `~/.openclaw/credentials/<channel>-allowFrom.json`（默认账户）或 `<channel>-<accountId>-allowFrom.json`（非默认账户），并与配置中的允许名单合并。
- **Group 白名单**（特定于渠道）：机器人完全接受的 groups/channels/guilds。
  - `channels.whatsapp.groups`、`channels.telegram.groups`、`channels.imessage.groups`：每个群组的默认设置，例如 `requireMention`；设置后也会作为群组允许名单（包含 `"*"` 以保持允许所有群组的行为）。使用 `agents.entries.*.groupChat.mentionPatterns` 自定义提及触发词（例如 `["@openclaw", "@mybot"]`），这样 `requireMention` 就会根据你自己的机器人名称进行限制。
  - `groupPolicy="allowlist"` + `groupAllowFrom`：限制谁可以在群组会话中触发机器人（WhatsApp/Telegram/Signal/iMessage/Microsoft Teams）。
  - `channels.discord.guilds` / `channels.slack.channels`：各界面的允许名单 + 提及默认设置。
  - 检查顺序：先将`groupPolicy`/group列入白名单，然后再激活mention/reply。回复机器人消息（隐式提及）不会 **not** 绕过 `groupAllowFrom`。

详情： [配置](/gateway/configuration) 和 [群组](/channels/groups)

### <a id="dm-session-isolation-(multi-user-mode)"></a><a id="dm-session-isolation-multi-user-mode"></a> DM 会话隔离（多用户模式）

默认情况下，OpenClaw 将所有 DM 路由到主会话中，以实现跨设备连续性。如果多人可以 DM 机器人（打开 DM 或多人白名单），请隔离 DM 会话：

```json5
{ session: { dmScope: "per-channel-peer" } }
```

`session.dmScope` 取值：

| 值                      | 范围                                                                  |
| -------------------------- | ---------------------------------------------------------------------- |
| `main`（配置默认）    | 所有 DM 共享一个会话。                                             |
| `per-channel-peer`         | 每个通道+发送者对获得一个隔离的 DM 上下文（安全 DM 模式）。 |
| `per-account-channel-peer` | 类似上面，但进一步按账户拆分（多账户通道）。         |
| `per-peer`                 | 每个发送者在同一类型的所有通道中共享一个会话。     |

本地 CLI 引导流程会保留显式设置的 `session.dmScope`，否则将其保持未设置状态，因此会应用 `"main"` 默认值：所有通道中的直接消息共享代理不断滚动的主会话（个人代理默认设置）。对于共享或多用户收件箱，请设置 `session.dmScope: "per-channel-peer"`；当检测到多用户 DM 流量时，`openclaw security audit` 会建议进行隔离。

这是消息传递上下文边界，而不是主机管理边界。如果用户相互敌对并共享同一网关 host/config，请改为为每个信任边界运行单独的网关。

如果同一个人通过多个渠道与您联系，请使用 `session.identityLinks` 将这些 DM 会话折叠为一个共享身份。请参阅 [Session Management](/concepts/session) 和 [Configuration](/gateway/configuration)。

## <a id="context-visibility-vs-trigger-authorization"></a> 上下文可见性 vs 触发授权

两个独立的概念：

- **触发授权**：谁可以触发代理（`dmPolicy`、`groupPolicy`、允许名单、提及门控）。
- **上下文可见性**：哪些补充上下文会传递给模型（回复正文、引用文本、线程历史、转发元数据）。

`contextVisibility` 控制第二项：

- `"all"`（默认）：补充上下文按接收时保持不变。
- `"allowlist"`：补充上下文会过滤为仅来自通过当前允许名单检查的发送者。
- `"allowlist_quote"`：类似 `allowlist`，但仍保留一条明确引用的回复。

按通道或按 room/conversation 设置 - 请参阅 [Groups](/channels/groups#context-visibility-and-allowlists)。仅显示“模型可以看到来自非白名单发件人的 quoted/historical 文本”的报告正在强化可使用 `contextVisibility` 解决的发现，而不是通过其自身进行身份验证或沙箱绕过；影响安全的报告仍然需要经过验证的信任边界旁路。

## <a id="command-authorization"></a> 命令授权

Slash commands 和 directives 仅对已授权的发送者生效。配置明确的、按 provider 划分的 `commands.allowFrom` 列表，或让命令授权遵循 channel allowlists 和配对状态。channel allowlists 所引用的 access-group 条目会自动解析；无需启用任何切换项。如果某个 channel allowlist 为空或包含 `"*"`，则该 channel 的命令实际上处于开放状态。请参阅 [Access groups](/channels/access-groups) 和 [Slash commands](/tools/slash-commands)。

`/exec` 仅是面向授权操作员的会话内便捷功能——它不会写入配置，也不会影响其他会话。
