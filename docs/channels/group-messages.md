---
summary: "WhatsApp 群消息处理 — 激活、允许名单、会话和上下文注入"
read_when:
  - 专门配置 WhatsApp 群组
  - 更改 WhatsApp 激活模式（`mention` 与 `always`）
  - 调整 WhatsApp 群组会话键或待处理消息上下文
title: "WhatsApp 群消息"
sidebarTitle: "WhatsApp 群组"
---

对于跨渠道群组模型（Discord、iMessage、Matrix、Microsoft Teams、Signal、Slack、Telegram、WhatsApp、Zalo），请参见 [群组](/channels/groups)。本页介绍在该模型之上的 WhatsApp 特有行为：激活、群组允许名单、按群会话键，以及待处理消息上下文注入。

目标：让 OpenClaw 待在 WhatsApp 群组中，仅在被点名时唤醒，并保持该线程与个人 DM 会话相互独立。

<Note>
`agents.list[].groupChat.mentionPatterns` 也会被 Telegram、Discord、Slack 和 iMessage 使用。对于多代理设置，请按代理分别配置，或使用 `messages.groupChat.mentionPatterns` 作为全局回退。
</Note>

## 行为

- 激活模式：`mention`（默认）或 `always`。`mention` 需要一次 ping（通过 `mentionedJids` 的真实 WhatsApp @ 提及、安全的正则模式，或文本中任意位置出现该机器人的 E.164 号码）。`always` 会在每条消息时唤醒代理，但它只应在能够提供有意义价值时回复；否则返回完全静默的精确令牌 `NO_REPLY` / `no_reply`。默认值可在配置（`channels.whatsapp.groups`）中设置，并可通过 `/activation` 按群覆盖。当设置了 `channels.whatsapp.groups` 时，它也会充当群组允许名单（包含 `"*"` 可允许全部）。
- 群组策略：`channels.whatsapp.groupPolicy` 控制是否接受群消息（`open|disabled|allowlist`）。`allowlist` 使用 `channels.whatsapp.groupAllowFrom`（回退：显式的 `channels.whatsapp.allowFrom`）。默认值为 `allowlist`（在你添加发送者之前会被阻止）。
- 按群会话：会话键形如 `agent:<agentId>:whatsapp:group:<jid>`，因此诸如 `/verbose on`、`/trace on` 或 `/think high`（作为独立消息发送）这样的命令会限定在该群组；个人 DM 状态不受影响。群线程会跳过心跳。
- 上下文注入：**仅待处理**的群消息（默认 50 条）如果 _没有_ 触发运行，会以前缀 `[Chat messages since your last reply - for context]` 注入，而触发的那条会显示在 `[Current message - respond to this]` 下。已经在会话中的消息不会再次注入。
- 发送者展示：每个群批次现在都会以 `[from: Sender Name (+E164)]` 结尾，以便 Pi 知道是谁在说话。
- 短暂/一次性查看：我们会在提取文本/提及时先展开这些内容，因此其中的 ping 仍然会触发。
- 群组系统提示：在群会话的第一次轮次中（以及每次 `/activation` 更改模式时），我们会向系统提示注入一段简短说明，例如 `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), ... Activation: trigger-only ... Address the specific sender noted in the message context.` 如果没有元数据，我们仍会告诉代理这是一个群聊。

## 配置示例（WhatsApp）

向 `~/.openclaw/openclaw.json` 添加一个 `groupChat` 块，这样即使 WhatsApp 在文本正文中去掉了可见的 `@`，显示名点名也能生效：

```json5
{
  channels: {
    whatsapp: {
      groups: {
        "*": { requireMention: true },
      },
    },
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: {
          historyLimit: 50,
          mentionPatterns: ["@?openclaw", "\\+?15555550123"],
        },
      },
    ],
  },
}
```

注意：

- 这些正则表达式不区分大小写，并使用与其他配置正则表面相同的 safe-regex 防护机制；无效模式和不安全的嵌套重复会被忽略。
- 当有人点选联系人时，WhatsApp 仍会通过 `mentionedJids` 发送规范化提及，因此数字回退很少需要，但作为安全网很有用。

### 激活命令（仅限 owner）

使用群聊命令：

- `/activation mention`
- `/activation always`

只有 owner 号码（来自 `channels.whatsapp.allowFrom`，或者在未设置时使用机器人自己的 E.164 号码）可以更改这一点。在群组中将 `/status` 作为独立消息发送，即可查看当前激活模式。

## 使用方法

1. 将你的 WhatsApp 账号（运行 OpenClaw 的那个）添加到群组中。
2. 发送 `@openclaw …`（或包含该号码）。除非你设置了 `groupPolicy: "open"`，否则只有在允许名单中的发送者才能触发它。
3. 代理提示将包含最近的群上下文以及末尾的 `[from: …]` 标记，以便它能向正确的人回复。
4. 会话级指令（`/verbose on`、`/trace on`、`/think high`、`/new` 或 `/reset`、`/compact`）只适用于该群组的会话；请将它们作为独立消息发送，以便生效。你的个人 DM 会话保持独立。

## 测试 / 验证

- 手动冒烟测试：
  - 在群里发送一次 `@openclaw` ping，并确认回复中引用了发送者姓名。
  - 再发送一次 ping，并验证历史区块被包含进来，然后在下一轮中被清除。
- 检查网关日志（使用 `--verbose` 运行）以查看 `inbound web message` 条目，其中显示 `from: <groupJid>` 以及 `[from: …]` 后缀。

## 已知注意事项

- 群组的心跳会被刻意跳过，以避免产生噪声广播。
- Echo 抑制使用合并后的批次字符串；如果你在没有提及的情况下发送两次相同文本，只有第一次会得到响应。
- 会话存储中的条目会显示为 `agent:<agentId>:whatsapp:group:<jid>`（默认位于 `~/.openclaw/agents/<agentId>/sessions/sessions.json`）；缺失条目只意味着该群组尚未触发过一次运行。
- 群组中的正在输入指示器遵循 `agents.defaults.typingMode`。当可见回复采用仅消息工具模式时，默认会立即开始输入，这样即使没有自动发送最终回复，群组成员也能看到代理正在工作。显式的 typing-mode 配置仍然优先生效。

## 相关内容

- [群组](/channels/groups)
- [渠道路由](/channels/channel-routing)
- [广播群组](/channels/broadcast-groups)
