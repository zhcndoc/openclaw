---
summary: "共享通道密钥：DM 和组访问策略、模型覆盖、通道默认值和多帐户设置"
read_when:
  - "为每个通道设置 DM 策略、组策略或提及默认值"
  - "将通道或 DM 对等点固定到特定模型"
  - "在一个频道上运行多个帐户"
title: "配置——共享通道策略"
---

适用于每个通道的 `channels.defaults` 和 `channels.modelByChannel` 下的密钥以及共享多帐户模式。

## <a id="dm-and-group-access"></a> DM 和组访问

所有通道均支持DM策略和组策略：

| DM 政策           | 行为                                                        |
| ------------------- | --------------------------------------------------------------- |
| `pairing`（默认） | 未知发送者会得到一次性配对码；所有者必须批准 |
| `allowlist`         | 仅允许 `allowFrom`（或已配对的 allow store）中的发送者             |
| `open`              | 允许所有入站私信（需要 `allowFrom: ["*"]`）             |
| `disabled`          | 忽略所有入站私信                                          |

| 群组策略          | 行为                                               |
| --------------------- | ------------------------------------------------------ |
| `allowlist`（默认） | 仅允许与已配置 allowlist 匹配的群组          |
| `open`                | 绕过群组 allowlist（但仍适用提及门控） |
| `disabled`            | 阻止所有 group/room 消息                          |

<Note>
`channels.defaults.groupPolicy` 仅在已解析的通道策略未设置时适用。 [每通道页面上列出的通道模式](/gateway/config-channels)默认根为`allowlist`；显式设置 `channels.<channel>.groupPolicy` 以选择其他策略。配对代码将在 1 小时后过期。每个账户的待处理配对请求上限为 **3**（范围按通道和账户 ID 确定）。如果提供程序块完全丢失（`channels.<provider>` 不存在），则运行时组策略会回退到 `allowlist`（拒绝不在列表中的组）并发出启动警告。
</Note>

## <a id="channel-model-overrides"></a> 通道模型覆盖

使用 `channels.modelByChannel` 将特定通道 ID 或直接消息对等点固定到模型。值接受 `provider/model` 或配置的模型别名。仅当会话尚未具有活动模型覆盖时（例如，通过 `/model` 设置），通道映射才适用。更改刷新加载的通道运行时间，无需重新启动网关；手动停止的帐户保持停止状态。

对于 group/thread 对话，键是特定于通道的组 ID、主题 ID 或通道名称。对于直接消息 （DM） 对话，密钥是从通道的发送者身份派生的对等标识符（`nativeDirectUserId`、`origin.from`、`origin.to`、`OriginatingTo`、`From` 或 `SenderId`）。确切的密钥形式取决于渠道：

| 渠道  | DM 钥匙形式         | 示例                                      |
| -------- | ------------------- | -------------------------------------------- |
| Discord  | 原始用户 ID         | `987654321`                                  |
| Feishu   | `feishu:ou_...`     | `feishu:ou_a8b6cab7e945387de5f253775d9b4d85` |
| Matrix   | Matrix 用户 ID      | `@user:matrix.org`                           |
| Slack    | `user:U...`         | `user:U12345`                                |
| Telegram | 原始用户 ID         | `123456789`                                  |
| WhatsApp | 手机号码或 JID | `15551234567`                                |

```json5
{
  channels: {
    modelByChannel: {
      discord: {
        "123456789012345678": "anthropic/claude-opus-4-6",
      },
      slack: {
        C1234567890: "openai/gpt-6-astra",
        "user:U12345": "openai/gpt-5.4-mini",
      },
      telegram: {
        "-1001234567890": "openai/gpt-5.4-mini",
        "-1001234567890:topic:99": "anthropic/claude-sonnet-4-6",
        "123456789": "openai/gpt-4.1",
      },
    },
  },
}
```

DM-特定键仅在直接消息对话中匹配；它们不影响 group/thread 路由。

## <a id="channel-defaults-and-heartbeat"></a> 通道默认值和心跳

使用 `channels.defaults` 跨提供商共享组策略、隐式提及和检测信号行为。更改刷新加载的通道运行时间，无需重新启动网关；手动停止的帐户保持停止状态：

```json5
{
  channels: {
    defaults: {
      groupPolicy: "allowlist", // open | allowlist | disabled
      contextVisibility: "all", // all | allowlist | allowlist_quote
      implicitMentions: {
        replyToBot: true,
        quotedBot: true,
        threadParticipation: true,
      },
      heartbeatVisibility: {
        showOk: false,
        showAlerts: true,
        useIndicator: true,
      },
    },
  },
}
```

- `channels.defaults.groupPolicy`：当提供商级别的 `groupPolicy` 未设置时使用的备用群组策略。
- `channels.defaults.contextVisibility`：所有通道的默认补充上下文可见性模式。值：`all`（默认值，包括所有 quoted/thread/history 上下文）、`allowlist`（仅包括来自白名单发件人的上下文）、`allowlist_quote`（与白名单相同，但保留显式 quote/reply 上下文）。每通道覆盖：`channels.<channel>.contextVisibility`。
- `channels.defaults.implicitMentions`：支持入站事实的控件计为提及。 `replyToBot`、`quotedBot` 和 `threadParticipation` 均默认为 `true`，保留当前行为。名称是肯定的：设置一个标志为 `false` 以阻止该事实绕过提及门控。捆绑渠道中，Mattermost、Slack、Tlon阅读本政策；在这些通道上，您还可以使用 `channels.<channel>.implicitMentions` 覆盖每个通道或使用 `channels.<channel>.accounts.<id>.implicitMentions` 覆盖每个帐户，并且每个标志独立解析帐户 -> 通道 -> 默认值。产生隐式提及事实的其他捆绑渠道当前不会读取这些设置，因此在这些渠道上，事实始终被视为提及，并且覆盖无效。始终允许本机显式提及，并且当通道不产生该事实时，标志无效。请参阅 [ 提及当前生产者矩阵的 gating](/channels/groups#mention-gating-default)。这些设置不会更改出站 reply/thread 模式或授权命令处理。
- `channels.defaults.heartbeatVisibility.showOk`：当监视器没有任何可报告的内容时，传递旧版 `HEARTBEAT_OK` 确认（默认 `false`）。
- `channels.defaults.heartbeatVisibility.showAlerts`：提供面向用户的心跳监控警报（默认 `true`）。
- `channels.defaults.heartbeatVisibility.useIndicator`：发出心跳状态指示器事件（默认`true`）。

## <a id="multi-account-(all-channels)"></a><a id="multi-account-all-channels"></a> 多账户（所有通道）

每个渠道都可以运行多个账户（每个账户都有自己的 `accountId`）：

此模式适用于支持 `accounts` 的通道，包括 Microsoft Teams。 Teams 机器人身份和 Webhook 路径保持特定于帐户；共享策略和传递设置可以继承自`channels.msteams`。

```json5
{
  channels: {
    telegram: {
      accounts: {
        default: {
          name: "Primary bot",
          botToken: "123456:ABC...",
        },
        alerts: {
          name: "Alerts bot",
          botToken: "987654:XYZ...",
        },
      },
    },
  },
}
```

- 当省略 `accountId` 时，使用 `default`（CLI + 路由）。
- 环境变量中的令牌仅适用于 **default** 账户。
- 除非针对某个账户进行覆盖，否则基础渠道设置将应用于所有账户。
- 对于Discord、Google Chat、iMessage、Microsoft Teams、Signal、Slack、Telegram和WhatsApp，省略的帐户`groupPolicy`或`dmPolicy`继承通道策略。明确的账户值获胜，包括 `allowlist` 或 `pairing`。如果未配置适用的策略，组访问权限仍为 `allowlist`，DM 使用 `pairing`。
- WhatsApp 在回退到通道根之前还继承了 `accounts.default` 的共享设置； Google Chat 使用根设置下的共享 `accounts.default` 设置。请参阅频道页面以了解这些例外情况和集合合并规则。
- 使用 `bindings[].match.accountId` 将每个账户路由到不同的代理。
- 如果您在单账户顶级渠道配置中通过 `openclaw channels add`（或渠道加入）添加非默认账户，OpenClaw 会首先将账户范围的顶级单账户值提升到渠道账户映射中，以便原始账户继续工作。大多数频道将它们移至`channels.<channel>.accounts.default`； Matrix 可以保留现有的匹配 named/default 目标。 Microsoft Teams 提升原始机器人身份，同时保留共享根策略。
- 现有的仅限渠道的绑定（不含 `accountId`）将继续匹配默认账户；账户级绑定仍然是可选的。
- `openclaw doctor --fix` 还可以通过将帐户范围的顶级单帐户值移动到为该渠道选择的升级帐户来修复混合形状。大多数通道使用`accounts.default`； Matrix 可以保留现有的匹配 named/default 目标。
