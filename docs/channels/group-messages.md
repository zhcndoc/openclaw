---
summary: "WhatsApp 群消息处理的行为和配置（mentionPatterns 在多个渠道共享）"
read_when:
  - 修改群消息规则或提及时
title: "群消息"
---

# 群消息（WhatsApp 网页渠道）

目标：让 Clawd 加入 WhatsApp 群组，仅在被点名时唤醒，并保持该线程与个人私聊会话分开。

注意：`agents.list[].groupChat.mentionPatterns` 现已被 Telegram/Discord/Slack/iMessage 共享使用；本文档重点介绍 WhatsApp 特有的行为。对于多代理设置，请为每个代理设置 `agents.list[].groupChat.mentionPatterns`（或使用 `messages.groupChat.mentionPatterns` 作为全局后备）。

## 已实现内容（2025-12-03）

- 激活模式：`mention`（默认）或 `always`。`mention` 需要被点名（真实 WhatsApp 通过 `mentionedJids` 的 @-mention，正则模式，或文本中任意位置的 bot E.164 号码触发）。`always` 会在每条消息时唤醒代理，但应仅在能提供有意义的回应时回复；否则返回静默标记 `NO_REPLY`。可以在配置 (`channels.whatsapp.groups`) 中设置默认值，并通过群组命令 `/activation` 单独覆盖。当设置了 `channels.whatsapp.groups` 时，该项也作为群组允许列表（包含 `"*"` 允许全部）。
- 群组策略：`channels.whatsapp.groupPolicy` 用于控制是否接受群消息（选项：`open|disabled|allowlist`）。`allowlist` 使用 `channels.whatsapp.groupAllowFrom` （回退到显式的 `channels.whatsapp.allowFrom`）。默认是 `allowlist`（未添加发送者前阻止消息）。
- 每群会话：会话键格式为 `agent:<agentId>:whatsapp:group:<jid>`，因此如 `/verbose on` 或 `/think high` 之类的命令（作为单独消息发送）只作用于该群组；个人私聊状态不受影响。群组线程跳过心跳。
- 上下文注入：**仅未触发运行的** 群消息（默认50条）会被添加前缀 `[Chat messages since your last reply - for context]`，触发行单独置于 `[Current message - respond to this]` 之下。会话内已存在的消息不会重复注入。
- 发送者展示：每个群消息批次末尾附带 `[from: 发送者名称 (+E164)]`，方便 Pi 识别发言者。
- 限阅/阅后即焚：提取文本/提及时会先解包，确保里面的点名仍能触发。
- 群组系统提示：群会话首次轮询（及每次 `/activation` 更改模式时）会注入一段简短提示，例如 `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), … Activation: trigger-only … Address the specific sender noted in the message context.` 如果元数据不可用，仍告诉代理这是群聊。

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

- 正则表达式不区分大小写；它涵盖类似 `@openclaw` 的显示名称点名以及带或不带 `+` 和空格的原始号码。
- 当有人点击联系人时，WhatsApp 仍会通过 `mentionedJids` 发送规范点名，号码回退机制虽少用，但作为安全网十分有用。

### 激活命令（仅限拥有者）

使用群聊命令：

- `/activation mention`
- `/activation always`

只有拥有者号码（来自 `channels.whatsapp.allowFrom`，未设置则为 bot 自己的 E.164）能修改。发送单独消息 `/status` 可查看当前激活模式。

## 使用方法

1. 将运行 OpenClaw 的 WhatsApp 账号加入群组。
2. 说 `@openclaw …`（或包含号码）。除非设置 `groupPolicy: "open"`，否则只有允许列表的发送者可触发。
3. 代理提示会包含最近群组上下文和末尾的 `[from: …]` 标记，能锁定正确发言者。
4. 会话级指令（`/verbose on`、`/think high`、`/new` 或 `/reset`、`/compact`）仅对该群会话生效；请作为单独消息发送以确保生效。您的个人私聊会话保持独立。

## 测试 / 验证

- 手动冒烟测试：
  - 在群组中发送 `@openclaw` 点名，确认有带有发送者名称的回复。
  - 再发送第二次点名，确认包含历史消息块且下一轮被清除。
- 查看网关日志（使用 `--verbose` 运行），观察 `inbound web message` 条目，显示 `from: <groupJid>` 和 `[from: …]` 后缀。

## 已知事项

- 群组跳过心跳以避免噪音广播。
- 回显抑制基于合并的批次字符串；若两次发送完全相同无提及文本，仅第一次获回复。
- 会话存储条目格式为 `agent:<agentId>:whatsapp:group:<jid>`，存于默认路径 `~/.openclaw/agents/<agentId>/sessions/sessions.json`；无此条目意味着该群尚未触发运行。
- 群组输入指示器遵循 `agents.defaults.typingMode` 配置（默认：未被点名时为 `message`）。
