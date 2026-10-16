---
summary: "Feishu DM 策略、组策略、提及门控以及如何查找聊天和用户 ID"
read_when:
  - "决定谁可以 DM 机器人或在组中使用它"
  - "编写组或发件人白名单"
  - "查找 Feishu `chat_id` 或 `open_id`"
title: "Feishu门禁"
sidebarTitle: "访问控制"
---

谁可以与 Feishu 机器人交谈、表达这些规则的组配置示例以及如何查找他们需要的 ID。

## <a id="access-control"></a> 访问控制

### <a id="direct-messages"></a> 私信

配置 `channels.feishu.dmPolicy`（默认：`pairing`）来控制谁可以 DM 机器人：

| 值         | 行为                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| `"pairing"`   | 未知用户会收到配对码；通过 CLI 批准                                                         |
| `"allowlist"` | 只有 `allowFrom` 中列出的用户才能聊天                                                                     |
| `"open"`      | 公开私信；配置校验要求 `allowFrom` 包含 `"*"`。非通配符条目仍会缩小可访问范围 |

**批准配对请求：**

```bash
openclaw pairing list feishu
openclaw pairing approve feishu <CODE>
```

### <a id="group-chats"></a> 群聊

**群组策略** (`channels.feishu.groupPolicy`，默认：`allowlist`)：

| 值         | 行为                                                                                     |
| ------------- | -------------------------------------------------------------------------------------------- |
| `"open"`      | 响应群组中的所有消息                                                            |
| `"allowlist"` | 仅响应 `groupAllowFrom` 中的群组，或在 `groups.<chat_id>` 下显式配置的群组 |
| `"disabled"`  | 禁用所有群消息；显式的 `groups.<chat_id>` 条目不会覆盖此设置         |

**提及要求** (`channels.feishu.requireMention`)：

- 默认：@mention 必填，有效组策略为 `"open"` 时除外；此处默认为 `false`，因此无法携带提及内容（例如图像）的消息仍会到达代理。
- 显式设置为 `true` 或 `false` 以覆盖默认值；按群组覆盖：`channels.feishu.groups.<chat_id>.requireMention`。
- 仅广播的 `@all` 和 `@_all` 不被视为机器人提及。消息中同时包含 `@all` 和直接提及机器人时，仍然算作机器人提及。

在发送给客服人员的文本中，提及其他人的内容保持可读性，包括在组合连续消息时。

### <a id="mentions-in-bot-started-threads"></a> 在机器人启动的线程中提及

设置 `requireMentionInBotThreads: false` 以接受在此机器人发送根消息的线程或主题中不带 @mention 的消息。将其设置为 `true` 以在这些线程中需要 @mention，即使 `requireMention` 是 `false` 也是如此。省略该设置将保留现有的提及行为。

```json5
{
  channels: {
    feishu: {
      requireMention: true,
      requireMentionInBotThreads: false,
    },
  },
}
```

在 `channels.feishu`、`accounts.<id>` 或 `groups.<chat_id>` 下配置设置。所选组条目优先于帐户设置，帐户设置又优先于顶级设置。当不存在与 `requireMention` 匹配的确切组条目时，`groups["*"]` 提供组条目。

这仅适用于当前机器人拥有的实际线程和主题。普通引用的回复、其他人发起的帖子以及无法读取或验证的根保留常规提及政策。组访问、发件人许可名单和机器人消息限制仍然适用。接收未提及的群消息还需要应用程序的`im:message.group_msg`范围和群消息事件传递；此设置不会更改 Feishu 发送的事件。

## <a id="group-configuration-examples"></a> 群组配置示例

### <a id="allow-all-groups%2C-no-%40mention-required"></a><a id="allow-all-groups-no-@mention-required"></a> 允许所有组，不需要@mention

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open", // requireMention defaults to false under "open"
    },
  },
}
```

### <a id="allow-all-groups%2C-still-require-%40mention"></a><a id="allow-all-groups-still-require-@mention"></a> 允许所有组，仍需要@mention

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
      requireMention: true,
    },
  },
}
```

### <a id="allow-specific-groups-only"></a> 仅允许特定群组

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      // Group IDs look like: oc_xxx
      groupAllowFrom: ["oc_xxx", "oc_yyy"],
    },
  },
}
```

在 `allowlist` 模式下，你也可以通过添加显式的 `groups.<chat_id>` 条目来允许某个群组。显式条目不会覆盖 `groupPolicy: "disabled"`。`groups.*` 下的通配符默认配置会应用于匹配的群组，但它们本身不会允许群组加入。

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      groups: {
        oc_xxx: {
          requireMention: false,
        },
      },
    },
  },
}
```

### <a id="restrict-senders-within-a-group"></a> 限制群组内的发送者

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["oc_xxx"],
      groups: {
        oc_xxx: {
          // User open_ids look like: ou_xxx
          allowFrom: ["ou_user1", "ou_user2"],
        },
      },
    },
  },
}
```

`channels.feishu.groupSenderAllowFrom` 为所有群组设置相同的发送者允许列表；按群组设置的 `allowFrom` 具有更高优先级。

### <a id="bot-authored-messages"></a> 机器人发送的消息

默认情况下，Feishu 会忽略其他机器人编写的消息。要允许机器人之间的群组对话，请授予应用程序 `im:message.group_at_msg.include_bot:readonly` 和 `im:message:readonly` 范围，然后设置 `allowBots`：

```json5
{
  channels: {
    feishu: {
      allowBots: true,
    },
  },
}
```

Feishu 仅当另一个机器人提及此机器人时才传递机器人编写的群组活动。现有的组策略、发件人许可名单和提及要求仍然适用。 OpenClaw 删除自行创作的消息，在每条短信或卡片回复中提及对等机器人，并应用共享的 [`channels.defaults.botLoopProtection`](/channels/bot-loop-protection) 防护。

<a id="get-groupuser-ids"></a>

## <a id="get-group%2Fuser-ids"></a><a id="get-group/user-ids"></a> 获取 group/user ID

### <a id="group-ids-(chat_id%2C-format%3A-oc_xxx)"></a><a id="group-ids-chat_id-format-oc_xxx"></a> 组 ID（`chat_id`，格式：`oc_xxx`）

打开Feishu/Lark中的群组，点击右上角的菜单图标，进入**设置**。设置页面上列出了组 ID （`chat_id`）。

![获取群组 ID](/images/feishu-get-group-id.png)

### <a id="user-ids-(open_id%2C-format%3A-ou_xxx)"></a><a id="user-ids-open_id-format-ou_xxx"></a> 用户 ID（`open_id`，格式：`ou_xxx`）

启动网关，向机器人发送 DM，然后检查日志：

```bash
openclaw logs --follow
```

在日志输出中查找 `open_id`。你也可以查看待处理的配对请求：

```bash
openclaw pairing list feishu
```
