---
summary: "DM 和房间策略、允许列表、机器人到机器人流量和命令授权"
read_when:
  - "决定谁可以与机器人 DM 或在 Matrix 房间中与其交谈"
  - "调试 Matrix 机器人保持沉默的房间"
  - "允许两个 OpenClaw Matrix 帐户之间的流量"
title: "Matrix门禁"
sidebarTitle: "访问控制"
---

谁可以通过 Matrix 到达 OpenClaw，它保留哪些补充上下文，以及哪些发送者可以运行命令。

## <a id="bot-to-bot-rooms"></a> Bot 到 Bot 房间

默认情况下，来自其他配置的 OpenClaw Matrix 帐户的 Matrix 消息将被忽略。使用 `allowBots` 有意允许代理间流量：

```json5
{
  channels: {
    matrix: {
      allowBots: "mentions", // true | "mentions"
      groups: {
        "!roomid:example.org": {
          requireMention: true,
        },
      },
    },
  },
}
```

- `allowBots: true` 接受来自允许的房间和 DM 中其他配置的 Matrix 机器人帐户的消息。
- `allowBots: "mentions"` 仅当他们在房间中明显提到此机器人时才接受这些消息；无论如何，DM 仍然是允许的。
- `groups.<room>.allowBots` 会覆盖单个房间的账号级设置。
- 被接受的已配置机器人消息会使用共享的 [bot loop protection](/channels/bot-loop-protection)。先配置 `channels.defaults.botLoopProtection`，然后通过 `channels.matrix.botLoopProtection` 按账号覆盖，或通过 `channels.matrix.groups.<room>.botLoopProtection` 按房间覆盖。
- OpenClaw 仍会忽略来自同一个 Matrix 用户 ID 的消息，以避免自我回复循环。
- Matrix 没有本机机器人标志； OpenClaw 将“机器人编写”视为“由此 OpenClaw 网关上另一个配置的 Matrix 帐户发送”。

在共享房间中启用 bot-to-bot 流量时，请使用严格的房间允许列表和提及要求。

## <a id="context-visibility"></a> 上下文可见性

Matrix 支持通过共享的 `contextVisibility` 控制来管理额外的房间上下文，例如获取的回复文本、线程根消息和待处理历史记录。

- `contextVisibility: "all"` 是默认值。附加上下文会按接收时的内容保留。
- `contextVisibility: "allowlist"` 筛选活动 room/user 白名单检查允许的发件人的补充上下文。
- `contextVisibility: "allowlist_quote"` 的行为类似于 `allowlist`，但仍会保留明确引用的回复。

这只会影响补充上下文的可见性，不会影响传入消息本身是否可以触发回复。触发授权仍来自 `groupPolicy`、`groups`、`groupAllowFrom` 和 DM 策略设置。

## <a id="tool-context-reads"></a> Tool上下文读取

当从 npm 或 ClawHub 捆绑或安装时，官方 Matrix 插件支持消息工具读取消息、反应、引脚、自定义表情、成员个人资料和房间详细信息。这些读取使用所选帐户的房间和 DM 范围检查及其 `actions` 设置。会员资料需要所请求房间的会员资格；自定义表情包括该房间的包和帐户的个人包。

## <a id="dm-and-room-policy"></a> DM 和房间策略

```json5
{
  channels: {
    matrix: {
      dm: {
        policy: "allowlist",
        allowFrom: ["@admin:example.org"],
        threadReplies: "off",
      },
      groupPolicy: "allowlist",
      groupAllowFrom: ["@admin:example.org"],
      groups: {
        "!roomid:example.org": { requireMention: true },
      },
    },
  },
}
```

要在保持房间正常工作的同时完全静音 DM，请设置 `dm.enabled: false`：

```json5
{
  channels: {
    matrix: {
      dm: { enabled: false },
      groupPolicy: "allowlist",
      groupAllowFrom: ["@admin:example.org"],
    },
  },
}
```

有关提及门控和允许名单行为，请参阅 [群组](/channels/groups)。

Matrix DM 的配对示例：

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

如果未获批准的 Matrix 用户在批准前持续发消息，OpenClaw 会复用相同的待处理配对代码，并且在较短的冷却时间后可能发送一条提醒回复，而不是生成新的代码。

有关共享 DM 配对流程和存储布局，请参阅 [配对](/channels/pairing)。

## <a id="slash-commands"></a> 斜杠命令

斜线命令（`/new`、`/reset`、`/model`、`/agents`、`/session`、`/acp`、`/approve` 等）直接在 DM 中工作。在房间中，OpenClaw 还可以识别以机器人自己的 Matrix 提及为前缀的命令，因此 `@bot:server /new` 会在没有自定义提及正则表达式的情况下触发命令路径 - 这可以使机器人响应房间风格的 `@mention /command` 帖子，当用户在键入命令之前通过选项卡完成机器人时，Element 和类似客户端会发出这些帖子。

授权规则仍然适用：命令发送者必须满足与普通消息相同的 DM 或房间 allowlist/owner 策略。
