---
summary: "WhatsApp 群消息处理的行为和配置（mentionPatterns 在多个渠道共享）"
read_when:
  - 更改群消息规则或点名规则时
title: "群消息"
---

目标：让 Clawd 待在 WhatsApp 群组里，仅在被点名时唤醒，并将该线程与个人 DM 会话分开。

注意：`agents.list[].groupChat.mentionPatterns` 现已被 Telegram/Discord/Slack/iMessage 共享使用；本文档重点介绍 WhatsApp 特有的行为。对于多代理设置，请为每个代理设置 `agents.list[].groupChat.mentionPatterns`（或使用 `messages.groupChat.mentionPatterns` 作为全局后备）。

## 当前实现（2025-12-03）

- 激活模式：`mention`（默认）或 `always`。`mention` 需要点名（通过 `mentionedJids` 的真实 WhatsApp @ 点名、安全正则模式，或文本中任意位置的机器人 E.164 号码）。`always` 会在每条消息唤醒代理，但仅当能增加有意义价值时才应回复；否则返回确切的静默令牌 `NO_REPLY` / `no_reply`。默认值可在配置中设置（`channels.whatsapp.groups`），并通过 `/activation` 按群组覆盖。当设置 `channels.whatsapp.groups` 时，它也充当群组白名单（包含 `"*"` 以允许所有）。
- 群组策略：`channels.whatsapp.groupPolicy` 控制是否接受群组消息（`open|disabled|allowlist`）。`allowlist` 使用 `channels.whatsapp.groupAllowFrom`（后备：显式 `channels.whatsapp.allowFrom`）。默认为 `allowlist`（在添加发送者之前被阻止）。
- 每群会话：会话密钥看起来像 `agent:<agentId>:whatsapp:group:<jid>`，因此诸如 `/verbose on`、`/trace on` 或 `/think high`（作为独立消息发送）等命令仅限于该群组；个人私聊状态不受影响。群组线程跳过心跳。
- 上下文注入：**仅待处理** 的群组消息（默认 50 条）_未_ 触发运行的消息以前缀 `[Chat messages since your last reply - for context]` 注入，触发行位于 `[Current message - respond to this]` 下。会话中已有的消息不会重新注入。
- 发送者展示：每个群组批处理现在都以 `[from: Sender Name (+E164)]` 结尾，以便 Pi 知道是谁在说话。
- 阅后即焚/一次性查看：我们在提取文本/点名之前解开它们，因此其中的点名仍然会触发。
- 群组系统提示词：在群组会话的第一轮（以及每当 `/activation` 更改模式时），我们会向系统提示词注入一段简短说明，例如 `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), … Activation: trigger-only … Address the specific sender noted in the message context.` 如果元数据不可用，我们仍会告诉代理这是一个群聊。

## 配置示例（WhatsApp）

向 `~/.openclaw/openclaw.json` 添加 `groupChat` 模块，即使 WhatsApp 在文本主体中去掉视觉上的 `@`，显示名称的点名依然生效：

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

备注：

- 正则表达式不区分大小写，并使用与其他配置正则相同的安全守护机制；无效模式和不安全的嵌套重复会被忽略。
- 当有人点击联系人时，WhatsApp 仍通过 `mentionedJids` 发送规范点名信息，因此号码回退很少用到，但作为安全网非常有用。

### 激活命令（仅限拥有者）

使用群聊命令：

- `/activation mention`
- `/activation always`

仅拥有者号码（来自 `channels.whatsapp.allowFrom`，未设则为机器人自身 E.164）可修改。发送单独消息 `/status` 可查看当前激活模式。

## 使用方法

1. 将您的 WhatsApp 账户（运行 OpenClaw 的那个）添加到群组。
2. 发送 `@openclaw …`（或包含号码）。除非您设置 `groupPolicy: "open"`，否则只有白名单发送者可以触发它。
3. 代理提示词将包含最近的群组上下文以及尾部的 `[from: …]` 标记，以便它可以称呼正确的人。
4. 会话级指令（`/verbose on`、`/trace on`、`/think high`、`/new` 或 `/reset`、`/compact`）仅适用于该群组的会话；将它们作为独立消息发送以便注册。您的个人私聊会话保持独立。

## 测试 / 验证

- 手动冒烟测试：
  - 在群组中发送 `@openclaw` 点名，确认有带发送者名称的回复。
  - 再次发送点名，确认包含历史消息块且下一轮会清除。
- 查看网关日志（使用 `--verbose` 运行），观察 `inbound web message` 条目，显示 `from: <groupJid>` 和 `[from: …]` 后缀。

## 已知事项

- 群组的心跳会被有意跳过，以避免噪声广播。
- 回声抑制使用合并后的批处理字符串；如果您在不点名的情况下发送两次完全相同的文本，只有第一次会收到回复。
- 会话存储条目会以 `agent:<agentId>:whatsapp:group:<jid>` 的形式出现在会话存储中（默认位于 `~/.openclaw/agents/<agentId>/sessions/sessions.json`）；缺少条目仅表示该群组尚未触发过运行。
- 群组中的输入状态指示器遵循 `agents.defaults.typingMode`（默认：未被点名时为 `message`）。

## 相关内容

- [群组](/channels/groups)
- [渠道路由](/channels/channel-routing)
- [广播群组](/channels/broadcast-groups)
