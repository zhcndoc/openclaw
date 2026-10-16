---
summary: "机器人 API 10.3 丰富消息、内联按钮、消息操作和执行批准"
read_when:
  - "从代理发送按钮、贴纸或丰富的块"
  - "启用 Telegram 消息操作以实现自动化"
  - "批准来自 Telegram 内部的执行请求"
title: "Telegram 丰富的消息和批准"
sidebarTitle: "丰富的消息和批准"
---

丰富的 Telegram 界面：格式化消息、内联键盘、代理消息操作和批准提示。

## <a id="rich-messages-and-approvals"></a> 丰富的消息和批准

<AccordionGroup>
  <Accordion id="rich-message-formatting" title="丰富的消息格式">
    默认情况下，出站文本使用标准 Telegram HTML 消息，在当前客户端中可读：粗体、斜体、链接、代码、剧透、引号 — 而不是 Bot API 10.3 仅富块（本机表格、详细信息、富媒体、公式）。围栏代码保留其文字内容和间距，包括块内的围栏示例。

    选择加入机器人 API 10.3 丰富消息：

```json5
{
  channels: {
    telegram: {
      richMessages: true,
    },
  },
}
```

    启用后：每个 OpenClaw 代理轮流传送到此 bot/account（回复、心跳、cron 公告和子代理公告）都会被告知丰富的消息可用，并且支持 Markdown + HTML-island 创作合约； Markdown 文本通过 OpenClaw 的 Markdown IR 渲染为键入的 Bot API 10.3 丰富块（标题、表格、详细信息、清单、富媒体、公式、地图、拼贴画）；媒体标题仍然使用 Telegram HTML 标题（丰富消息不会替换标题，标题上限为 1024 个字符）。

    普通的丰富正文文本（包括列表项、引号和披露正文）保留已解析的 Markdown 空格和换行符。实体解码一次：`&amp;` 显示 `&`，而 `\&amp;` 和 `&amp;amp;` 显示文字 `&amp;`。转义标签（例如 `&lt;b&gt;`）保留可见文本，图像替代品保留纯文本；两者都不会成为 HTML 岛屿。不受支持的 HTML 保持可见，而不抑制其中的 Markdown 格式。 HTML 属性和识别的内联注释在 Markdown 解析期间保留其文字源；然后，支持的属性由 HTML 映射器进行解码。 HTML-island 摘要和图形标题保持其单独的 HTML 标准化。

    这会让模型文本远离 Telegram 的富 Markdown 标记，因此像 `$400-600K` 这样的货币表达不会被解析为数学公式。较长的富文本会自动按 Telegram 的限制拆分。超过 20 列限制的表格会回退为代码块。

    后跟引用、列表、标题、代码块或段落的表格保持单独的块。在引用或列表中创建的表格保留在该容器内，包括当它们是其最终内容时。

    默认：关闭，以兼容客户端——某些当前的 Desktop、Web、Android 及第三方客户端会将已接受的富消息渲染为不支持。除非与该 bot 一起使用的所有客户端都能渲染它们，否则请保持关闭。`/status` 会显示当前会话的富消息是开启还是关闭。

    默认情况下链接预览处于打开状态。 `channels.telegram.linkPreview: false` 禁用富文本的自动实体检测。 OpenClaw 显式标记裸露 URL，以便它们保持可点击状态，但包含 `&` 的 URL 除外，这些 URL 保持简单以避免 Telegram 的查询分隔符编码问题。对这些 URL 使用标记为 Markdown 的链接。

  </Accordion>

  <Accordion id="inline-buttons" title="内嵌按钮">
    配置内联键盘范围：

```json5
{
  channels: {
    telegram: {
      capabilities: {
        inlineButtons: "allowlist",
      },
    },
  },
}
```

    每个帐户覆盖：

```json5
{
  channels: {
    telegram: {
      accounts: {
        main: {
          capabilities: {
            inlineButtons: "allowlist",
          },
        },
      },
    },
  },
}
```

    作用域：`off`、`dm`、`group`、`all`、`allowlist`（默认）。旧版 `capabilities: ["inlineButtons"]` 映射为 `"all"`。

    `capabilities: []`的账户继承通道能力。使用 `capabilities: { inlineButtons: "off" }` 显式禁用内联按钮。

    `ask_user` 使用这些本机控件来解决一个单选问题。选项各使用一行，**Other…** 打开Telegram 的回复输入。

    共享`message`工具示例（`action: "send"`、`channel: "telegram"`）：

    可用性遵循分层 [tool 策略 ](/gateway/config-tools/tool-policy)。必须配置并启用 Telegram 帐户，必须允许 `message` 工具运行，并且不得禁用 `channels.telegram.actions.sendMessage`。对于带有按钮的发送，`inlineButtons: "off"` 阻止控件，而 `"dm"` 和 `"group"` 限制目标聊天类型。回调点击由Telegram访问策略单独授权； `"allowlist"` 应用配置的发件人授权。

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  message: "Choose an option:",
  presentation: {
    blocks: [
      {
        type: "buttons",
        buttons: [
          { label: "Yes", action: { type: "callback", value: "yes" }, style: "success" },
          { label: "No", action: { type: "callback", value: "no" }, style: "danger" },
          { label: "Cancel", action: { type: "callback", value: "cancel" } },
        ],
      },
    ],
  },
}
```

    Mini App 按钮示例：

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  message: "Open app:",
  presentation: {
    blocks: [
      {
        type: "buttons",
        buttons: [
          {
            label: "Launch",
            action: { type: "web-app", url: "https://example.com/app" },
          },
        ],
      },
    ],
  },
}
```

    迷你应用程序按钮仅在用户和机器人之间的私人聊天中起作用。

    注册插件交互处理程序未声明的回调操作值将以文本形式传递给代理：`callback_data: <value>`。

    通过按钮点击创建的代理消息使用 OpenClaw 收到点击的时间，而不是原始卡的发送时间。排队或重播的点击会保留该接收时间。

    通过持久入口，OpenClaw 在存储更新后发送回调确认，而无需等待该聊天通道中的早期处理程序。 Telegram 确认成功后清除其加载指示器；该按钮的操作仍然遵循正常授权和有序处理。

  </Accordion>

  <Accordion id="telegram-message-actions-for-agents-and-automation" title="Telegram 用于代理和自动化的消息操作">
    行动：

    - `sendMessage`（`to`、`content`、可选 `mediaUrl`、`replyToMessageId`、`messageThreadId`）
    - `react` (`chatId`, `messageId`, `emoji`)
    - `emoji-list`（可选`chatId`、`limit`）
    - `deleteMessage` (`chatId`, `messageId`)
    - `editMessage`（`chatId`、`messageId`、`content` 或 `caption`，可选 `presentation` 内联按钮；仅按钮编辑会更新 reply markup）
    - `createForumTopic`（`chatId`、`name`、可选 `iconColor`、`iconCustomEmojiId`）

    便捷别名：`send`、`react`、`delete`、`edit`、`sticker`、`sticker-search`、`topic-create`。

    门控：默认开启`channels.telegram.actions.sendMessage`、`poll`、`deleteMessage`、`reactions`、`editMessage`、`createForumTopic`、`editForumTopic`；将其设置为 `false` 以禁用它。创建投票需要 `sendMessage` 和 `poll`。 `sticker` 默认情况下处于禁用状态，必须显式启用。 `reactions` 同时控制 `react` 和 `emoji-list`。运行时发送使用来自 startup/reload 的活动 config/secrets 快照，因此操作路径不会重新解析每次发送的 `SecretRef` 值。

    使用 `emoji-list` 检查当前可信聊天和帐户中的反应。客服人员无法检查其他聊天；直接运营商可能会提供不同的 `chatId`。 `limit` 默认且不能超过 100：

```json
{
  "ok": true,
  "emojis": [
    { "name": "👍", "identifier": "👍" },
    { "identifier": "5368324170671202286", "type": "custom_emoji" }
  ]
}
```

    将 Unicode 标识符或数字自定义表情符号标识符直接传递给 `react`。没有反应限制的聊天会返回已知的标准 Telegram 反应和 `note` 解释允许所有标准反应。当 Telegram 拒绝反应时，错误包括允许的标准反应和数字自定义表情符号标识符的简短示例。如果允许的反应查找失败，则错误会忽略示例。

    反应删除语义：[/tools/reactions](/tools/reactions).

  </Accordion>

  <Accordion id="exec-approvals-in-telegram" title="Telegram 中的 Exec 批准">
    Telegram 支持批准者 DM 中的执行批准，并且可以选择在原始聊天或主题中发布提示。批准者必须是数字 Telegram 用户 ID。

    - `channels.telegram.execApprovals.enabled`（`"auto"` 在至少有一个审批者可解析时启用）
    - `channels.telegram.execApprovals.approvers`（从 `commands.ownerAllowFrom` 回退到数字所有者 ID）
    - `channels.telegram.execApprovals.target`：`dm`（默认）| `channel` | `both`
    - `agentFilter`, `sessionFilter`

    `channels.telegram.allowFrom`、`groupAllowFrom` 和 `defaultTo` 控制谁可以与机器人对话以及机器人发送正常回复的位置 - 它们不会使某人成为执行审批者。当尚不存在命令所有者时，第一个批准的 DM 配对引导 `commands.ownerAllowFrom`，因此单所有者设置无需在 `execApprovals.approvers` 下重复 ID 即可工作。

    频道下发显示聊天中的命令文本；仅在受信任的 groups/topics. 中启用 `channel` 或 `both` 当提示到达论坛主题时，OpenClaw 会保留该主题以供批准提示和后续操作。默认情况下，Exec 批准会在 30 分钟后过期。

    内联批准按钮还需要 `channels.telegram.capabilities.inlineButtons` 来允许目标表面（`dm`、`group` 或 `all`）。以 `plugin:` 为前缀的审批 ID 通过插件审批进行解析；其他人首先通过执行批准来解决。

    参见 [执行审批](/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>
