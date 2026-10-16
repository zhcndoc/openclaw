---
summary: "WhatsApp 群组消息处理 — 激活、允许列表、会话和上下文注入"
read_when:
  - "专门配置WhatsApp组"
  - "更改 WhatsApp 激活模式（`mention` 与 `always`）"
  - "调整 WhatsApp 组会话密钥或待处理消息上下文"
title: "WhatsApp 群组消息"
sidebarTitle: "WhatsApp 群组"
---

对于跨渠道组模型（Discord、iMessage、Matrix、Microsoft Teams、QQBot、Signal、Slack、Telegram、WhatsApp、 Zalo），请参阅 [Groups](/channels/groups)。本页介绍了该模型之上的 WhatsApp- 特定行为：激活、组允许列表、每组会话密钥和待处理消息上下文注入。

目标：让 OpenClaw 保持在 WhatsApp 群组中，仅在被提及时唤醒，并将该线程与个人 DM 会话分开。

<Note>
`agents.entries.*.groupChat.mentionPatterns` 与其他通道的提及门控共享。对于多代理设置，请针对每个代理进行设置，或使用 `messages.groupChat.mentionPatterns` 作为全局后备。如果没有设置，模式将从代理身份 name/emoji. 派生
</Note>

## <a id="behavior"></a> 行为

- 激活模式：`mention`（默认）或`always`。 `mention` 需要 ping：真实的 WhatsApp @-mention （`mentionedJids`）、配置的正则表达式模式、文本中任意位置的机器人 E.164 数字，或对机器人消息之一的引用回复（共享号码自聊天设置除外）。 `always` 在收到每条已承认的消息时唤醒代理并默认要求回复。要允许对未寻址消息进行选择性静默，请显式设置 `surfaces.whatsapp.silentReply.group: "allow"`。整个决赛被修剪为大写 `NO_REPLY` 请求安静；小写和换行形式仍然可见。有关全局设置和优先级，请参阅 [ 无声回复](/concepts/messages#silent-replies)。激活默认值来自配置 （`channels.whatsapp.groups` `requireMention`），并且可以通过 `/activation` 按组覆盖。
- Group 白名单：设置 `channels.whatsapp.groups` 时，仅允许列出的组 JID（包括 `"*"` 表示允许全部）；来自未列出组的消息将被删除并带有日志提示。
- 群组策略：`channels.whatsapp.groupPolicy` 控制是否接受群组消息（`open|disabled|allowlist`）。`allowlist` 使用 `channels.whatsapp.groupAllowFrom`（回退：显式的 `channels.whatsapp.allowFrom`）。默认是 `allowlist`（在你添加发送者之前会被阻止）。
- Per-group 会话：会话密钥看起来像 `agent:<agentId>:whatsapp:group:<jid>`（非默认帐户附加 `:thread:whatsapp-account-<accountId>`），因此 `/verbose on`、`/trace on` 或 `/think high`（作为独立消息发送）等指令的范围仅限于该组；个人DM状态未受影响。
- 上下文注入：**仅待处理**的群组消息（默认 50 条）且_未_触发运行的消息，会以前缀 `[Chat messages since your last reply - for context]` 注入，其中触发运行的那条会放在 `[Current message - respond to this]` 下。待处理窗口会在运行后清空；已经在会话中的消息不会被重新注入。
- 发件人归属：每个组行在消息信封内携带发件人标签，e.g. `[WhatsApp <groupJid> <timestamp>] Alice (+447700900123): text`，以及发件人身份加上组subject/members在不受信任的对话元数据块中。
- Ephemeral/view-once：在提取 text/mentions 之前包装器已解开，因此其中的 ping 仍然会触发。
- 群组系统提示：群组会话的第一轮（以及任何在 `/activation` 更改模式之后的轮次）会把激活指引注入系统提示（`Activation: trigger-only ...` 或 `Activation: always-on ...`，以及“address the specific sender”）。持久的群聊传递指引（“You are in a WhatsApp group chat...”）始终会包含在内。

## <a id="config-example-(whatsapp)"></a><a id="config-example-whatsapp"></a> 配置示例（WhatsApp）

即使 WhatsApp 会从文本正文中去掉视觉上的 `@`，也能让显示名点名生效：

```json5
{
  channels: {
    whatsapp: {
      groups: {
        "*": { requireMention: true },
      },
      historyLimit: 50, // pending group context window (default 50)
    },
  },
  agents: {
    entries: {
      main: {
        groupChat: {
          mentionPatterns: ["@?openclaw", "\\+?15555550123"],
        },
      },
    },
  },
}
```

注意：

- 这些正则表达式不区分大小写，并且使用与其他配置正则入口相同的安全正则护栏；无效模式和不安全的嵌套重复会被忽略。
- 当有人点击联系人时，WhatsApp 仍然通过 `mentionedJids` 发送显式提及，因此很少需要号码后备，但这是一个有用的安全网。
- 待处理上下文窗口的解析顺序为 `channels.whatsapp.accounts.<id>.historyLimit` → `channels.whatsapp.historyLimit` → `messages.groupChat.historyLimit` → 50。

### <a id="activation-command-(owner-only)"></a><a id="activation-command-owner-only"></a> 激活命令（仅限 owner）

使用群聊命令：

- `/activation mention`
- `/activation always`

只有 owner 号码（来自 `channels.whatsapp.allowFrom`，若未设置则为机器人自身的 E.164）可以更改此设置；其他人发送的 `/activation` 会被忽略，仅作为上下文存储。作为群内独立消息发送 `/status`，即可查看当前激活模式。

## <a id="how-to-use"></a> 用法

1. 将你的 WhatsApp 账号（运行 OpenClaw 的那个）加入群组。
2. 发送 `@openclaw ...`（或包含该号码）。除非你设置了 `groupPolicy: "open"`，否则只有在允许列表中的发送者才能触发它。
3. 代理提示包含待处理的群组上下文以及带发送者标签的行，因此它可以正确地回复对应的人。
4. Session 指令（`/verbose on`、`/trace on`、`/think high`、`/new` 或 `/reset`、`/compact`）仅适用于该组的会话；将它们作为独立消息发送以便它们注册。您的个人 DM 会话保持独立。

## <a id="testing-%2F-verification"></a><a id="testing-/-verification"></a> 测试 / 验证

- 手动冒烟测试：
  - 在群里发送一个 `@openclaw` 提及，并确认回复中引用了发送者名称。
  - 再发送第二个提及，验证包含历史记录块，然后在下一轮中被清除。
- 检查网关日志（与 `--verbose` 一起运行）中是否有 `inbound web message` 条目，显示 `from: <groupJid>` 和发件人标记的正文。

## <a id="known-considerations"></a> 已知注意事项

- 心跳运行在代理的主会话中；群组会话从不获取心跳运行。
- 回声抑制会按会话记住组合后的提示词（历史 + 当前消息），因此机器人自己已发送的消息不会再次触发；完全相同的重复批次可以作为回声被跳过。
- 会话存储条目在每个代理的 SQLite 会话存储中显示为 `agent:<agentId>:whatsapp:group:<jid>`；缺失条目只表示该群组尚未触发过运行。
- 输入状态指示器遵循 `agents.entries.*.typingMode` / `agents.defaults.typingMode`。当可见回复选择进入仅消息工具模式时，默认会立即开始输入，这样即使没有自动发布最终回复，群组成员也能看到代理正在工作。明确的 typing-mode 配置仍然优先生效。

## <a id="related"></a> 相关内容

- [群组](/channels/groups)
- [频道路由](/channels/channel-routing)
- [广播组](/channels/broadcast-groups)
