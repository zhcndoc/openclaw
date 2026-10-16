---
summary: "Microsoft Teams 自适应卡批准、民意调查、演示卡、会员信息和目标"
read_when:
  - "将批准、投票或演示卡发送至 Teams"
  - "从 CLI 或消息工具寻址 Teams 用户或对话"
  - "解析 Teams 对话的名册详细信息"
title: "Microsoft Teams 卡牌和行动"
sidebarTitle: "卡牌和行动"
---

自适应卡表面 OpenClaw 发送到 Teams、图形支持的名册查找以及解决它们的目标格式。

## <a id="member-info-action"></a> 成员信息操作

OpenClaw 为 Microsoft Teams 提供了一个基于 Graph 的 `member-info` 操作，使代理和自动化能够解析已配置会话的已验证成员名单详情。

要求：

- `ChannelSettings.Read.Group` 和 `TeamMember.Read.Group` RSC 权限（已包含在推荐的清单中）。

只要配置了 Graph 凭证，该操作就可用；没有单独的 `channels.msteams.actions.memberInfo` 切换。标准频道查找返回匹配的团队名册身份、显示名称、电子邮件和角色。在当前DM或群聊中，该操作可以返回可信发送者的稳定用户ID。 Private/shared-channel 和非当前聊天成员查找需要额外的名册权限，并且会被默认权限基线拒绝。

对于消息工具中的 `member-info` 和 `search`，使用 `channelId` 选择对话。 Graph `<team-id>/<channel-id>` 形式标识 Teams 通道：

```json5
{
  action: "member-info",
  channel: "msteams",
  channelId: "<team-id>/<channel-id>",
  userId: "<user-id>",
}
```

`search` 使用与 `query` 相同的 `channelId` 滤波器，而不是 `userId`。当其图形路由可用时，省略过滤器将使用当前对话。对于当前通道，其裸 `19:...@thread.tacv2`、ID 和 `conversation:19:...@thread.tacv2` 形式重用相同的 Graph 路由。使用完整的图表形式选择另一个通道。所选对话仍必须满足配置的访问策略和操作的成员资格要求。

## <a id="native-approval-cards"></a> 本地批准卡

Microsoft Teams 可以在原始对话中将执行和插件批准请求作为自适应卡传递。每张卡都描述了请求的命令或插件操作，并仅提供该请求允许的决策，例如 **批准一次**、**始终允许** 和 **拒绝**。做出决定或到期后，OpenClaw 会更新原始卡的最终状态。

为您想要接收的每种批准类型启用现有的顶级批准转发设置：

```json5
{
  approvals: {
    exec: { enabled: true, mode: "session" },
    plugin: { enabled: true, mode: "session" },
  },
  channels: {
    msteams: {
      allowFrom: ["00000000-0000-0000-0000-000000000000"],
    },
  },
}
```

`approvals.exec`和`approvals.plugin`是独立的；启用其中之一不会启用另一个。本机卡交付还需要一个已配置的 Teams 机器人和至少一个从原始帐户的有效 `allowFrom` 或 `defaultTo` 解析的审批者。审批者必须是稳定的AAD对象ID；显示名称、电子邮件地址、组条目和对话 ID 不授予批准访问权限。 OpenClaw 在解决请求之前会检查原始帐户和点击用户的 AAD 对象 ID，因此同级机器人无法解决该帐户的批准问题。

不需要 Teams- 特定的批准配置。当本机传送不可用时，现有的 `/approve <id> <decision>` 命令仍然可用作文本后备。有关转发模式和支持的决策，请参阅 [ 批准转发到聊天频道](/tools/exec-approvals-advanced#approval-forwarding-to-chat-channels)。

## <a id="polls-(adaptive-cards)"></a><a id="polls-adaptive-cards"></a> 投票（Adaptive Cards）

OpenClaw 通过 Adaptive Cards 发送 Teams 投票（没有原生的 Teams 投票 API）。

- CLI: `openclaw message poll --channel msteams --target conversation:<id> --poll-question "..." --poll-option "..." --poll-option "..."`.
- 投票由网关记录到 OpenClaw plugin-state SQLite 中的 `state/openclaw.sqlite`。
- 对于现有的 `msteams-polls.json` 文件，请在升级到最新版本之前在 2026.9.5 上运行 `openclaw doctor --fix`。请参阅 [ 升级非常旧的版本](/install/updating#upgrading-very-old-versions)。
- 网关必须保持在线才能记录投票。
- 民意调查不会自动发布结果摘要，并且没有民意调查结果 CLI。

撤销计划作业的消息权限会停止尚未提交的轮询。已提交给 Teams 的民意调查在运行结束时保留其已接受的 ID 和正常投票跟踪。

## <a id="presentation-cards"></a> 演示卡片

使用 `message` 工具、CLI 或正常回复传递向 Teams 用户或对话发送语义表示负载。 OpenClaw 将它们呈现为通用演示合同中的 Teams 自适应卡。

`presentation` 参数接受语义块。当提供 `presentation` 时，消息文本是可选的。按钮会渲染为自适应卡片的提交或 URL 操作。选择菜单不是 Teams 渲染器的原生支持，因此 OpenClaw 会在发送前将其降级为可读文本。

**代理工具：**

```json5
{
  action: "send",
  channel: "msteams",
  target: "user:<id>",
  presentation: {
    title: "Hello",
    blocks: [{ type: "text", text: "Hello!" }],
  },
}
```

**CLI:**

```bash
openclaw message send --channel msteams \
  --target "conversation:19:abc...@thread.tacv2" \
  --presentation '{"title":"Hello","blocks":[{"type":"text","text":"Hello!"}]}'
```

有关 target 格式的详细信息，请参见下方的 [目标格式](#target-formats)。

## <a id="target-formats"></a> 目标格式

MSTeams 目标使用前缀来区分用户和会话：

| 目标类型         | 格式                           | 示例                                                                                                |
| ------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 用户（按 ID）        | `user:<aad-object-id>`           | `user:40a1a0ed-4ff2-4164-a219-55518990c197`                                                            |
| 用户（按名称）      | `user:<display-name>`            | `user:John Smith`（需要 Graph API）                                                                 |
| Group/channel       | `conversation:<conversation-id>` | `conversation:19:abc123...@thread.tacv2`                                                               |
| Group/channel（原始） | `<conversation-id>`              | `19:abc123...@thread.tacv2`、`19:...@unq.gbl.spaces` 或裸 `a:`/`8:orgid:`/`29:` 机器人框架 ID |

**CLI 示例：**

```bash
# Send to a user by ID
openclaw message send --channel msteams --target "user:40a1a0ed-..." --message "Hello"

# Send to a user by display name (triggers Graph API lookup)
openclaw message send --channel msteams --target "user:John Smith" --message "Hello"

# Send to a group chat or channel
openclaw message send --channel msteams --target "conversation:19:abc...@thread.tacv2" --message "Hello"

# Send a presentation card to a conversation
openclaw message send --channel msteams --target "conversation:19:abc...@thread.tacv2" \
  --presentation '{"title":"Hello","blocks":[{"type":"text","text":"Hello"}]}'
```

**命令行示例：**

```json5
{
  action: "send",
  channel: "msteams",
  target: "user:John Smith",
  message: "Hello!",
}
```

```json5
{
  action: "send",
  channel: "msteams",
  target: "conversation:19:abc...@thread.tacv2",
  presentation: {
    title: "Hello",
    blocks: [{ type: "text", text: "Hello" }],
  },
}
```

<Note>
如果没有 `user:` 前缀，名称默认会按群组或团队解析。按显示名称定位到个人时，请始终使用 `user:`。
</Note>

## <a id="proactive-messaging"></a> 主动消息

- 主动消息仅在用户已经进行交互**之后**才可能发送，因为 OpenClaw 会在此时存储会话引用。
- 有关 `dmPolicy` 和 allowlist 门控，请参见 [/gateway/configuration](/gateway/configuration)。
