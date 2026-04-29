---
summary: "WhatsApp 群消息处理的行为和配置（mentionPatterns 在各渠道间共享）"
read_when:
  - 更改群消息规则或提及
title: "群消息"
---

目标：让 Clawd 待在 WhatsApp 群里，只在被点名时唤醒，并将该线程与个人 DM 会话分开。

<Note>
`agents.list[].groupChat.mentionPatterns` 也被 Telegram、Discord、Slack 和 iMessage 使用。本文档重点介绍 WhatsApp 的特定行为。对于多代理设置，请按代理分别设置 `agents.list[].groupChat.mentionPatterns`，或者使用 `messages.groupChat.mentionPatterns` 作为全局回退。
</Note>

## 当前实现（2025-12-03）

- 激活模式：`mention`（默认）或 `always`。`mention` 需要一次 ping（通过 `mentionedJids` 的真实 WhatsApp @ 提及、安全的正则模式，或文本中任意位置出现机器人自己的 E.164 号码）。`always` 会在每条消息上唤醒代理，但只有在它能提供有意义的价值时才应回复；否则它应返回精确的静默标记 `NO_REPLY` / `no_reply`。默认值可在配置（`channels.whatsapp.groups`）中设置，并可通过 `/activation` 按群覆盖。当设置了 `channels.whatsapp.groups` 时，它也会充当群白名单（包含 `"*"` 可允许所有群）。
- 群策略：`channels.whatsapp.groupPolicy` 控制是否接受群消息（`open|disabled|allowlist`）。`allowlist` 使用 `channels.whatsapp.groupAllowFrom`（回退：显式的 `channels.whatsapp.allowFrom`）。默认值为 `allowlist`（在你添加发送者之前会被阻止）。
- 每群会话：会话键类似 `agent:<agentId>:whatsapp:group:<jid>`，因此诸如 `/verbose on`、`/trace on` 或 `/think high`（作为独立消息发送）之类的命令仅作用于该群；个人 DM 状态不会受影响。群线程会跳过心跳。
- 上下文注入：**仅待处理**的群消息（默认 50 条）且 _没有_ 触发运行的消息，会以前缀形式放在 `[Chat messages since your last reply - for context]` 下，触发运行的那一行放在 `[Current message - respond to this]` 下。已经在会话中的消息不会被再次注入。
- 发送者展示：现在每个群批次都以 `[from: Sender Name (+E164)]` 结尾，这样 Pi 就能知道是谁在说话。
- 临时/一次性查看：我们会在提取文本/提及之前解包这些内容，因此其中的 ping 仍然会触发。
- 群系统提示：在群会话的第一轮（以及每当 `/activation` 改变模式时），我们会向系统提示中注入一段简短说明，例如 `你正在 WhatsApp 群 "<subject>" 中回复。群成员：Alice (+44...), Bob (+43...), … 激活：仅触发 … 请直接回应消息上下文中标注的特定发送者。` 如果没有元数据，我们仍会告诉代理这是一个群聊。

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

只有 owner 号码（来自 `channels.whatsapp.allowFrom`，若未设置则为机器人自己的 E.164）可以更改此项。发送 `/status` 作为群里的独立消息以查看当前激活模式。

## 使用方法

1. 将你的 WhatsApp 账号（运行 OpenClaw 的那个）加入群组。
2. 发送 `@openclaw …`（或包含该号码）。除非你设置了 `groupPolicy: "open"`，否则只有白名单中的发送者才能触发它。
3. 代理提示中会包含最近的群上下文以及末尾的 `[from: …]` 标记，这样它就能对正确的人进行回应。
4. 会话级指令（`/verbose on`、`/trace on`、`/think high`、`/new` 或 `/reset`、`/compact`）只应用于该群的会话；请将它们作为独立消息发送，以便它们被记录。你的个人 DM 会话保持独立。

## 测试 / 验证

- 手动冒烟测试：
  - 在群里发送一次 `@openclaw` ping，并确认回复中引用了发送者姓名。
  - 再发送一次 ping，并验证历史区块被包含进来，然后在下一轮中被清除。
- 检查网关日志（使用 `--verbose` 运行）以查看 `inbound web message` 条目，其中显示 `from: <groupJid>` 以及 `[from: …]` 后缀。

## 已知注意事项

- 为避免噪声广播，群消息会故意跳过心跳。
- 回声抑制使用的是合并后的批次字符串；如果你在没有提及的情况下发送两次完全相同的文本，只有第一次会收到响应。
- 会话存储条目会以 `agent:<agentId>:whatsapp:group:<jid>` 的形式出现在会话存储中（默认路径为 `~/.openclaw/agents/<agentId>/sessions/sessions.json`）；缺少条目只意味着该群尚未触发过一次运行。
- 群中的正在输入指示器遵循 `agents.defaults.typingMode`。当可见回复使用默认的仅消息工具模式时，默认会立即开始输入，这样即使没有自动最终回复，群成员也能看到代理正在工作。显式的 typing-mode 配置仍然优先生效。

## 相关内容

- [群组](/channels/groups)
- [渠道路由](/channels/channel-routing)
- [广播群组](/channels/broadcast-groups)
