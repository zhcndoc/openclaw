---
summary: "WhatsApp 群消息处理的行为和配置（mentionPatterns 在多个渠道共享）"
read_when:
  - 修改群消息规则或提及时
title: "群消息"
---

# 群消息（WhatsApp 网页渠道）

目标：让 Clawd 加入 WhatsApp 群组，仅在被点名时唤醒，并保持该线程与个人私聊会话分开。

注意：`agents.list[].groupChat.mentionPatterns` 现已被 Telegram/Discord/Slack/iMessage 共享使用；本文档重点介绍 WhatsApp 特有的行为。对于多代理设置，请为每个代理设置 `agents.list[].groupChat.mentionPatterns`（或使用 `messages.groupChat.mentionPatterns` 作为全局后备）。

## 当前实现（2025-12-03）

- 激活模式：`mention`（默认）或 `always`。`mention` 需要被点名（通过 `mentionedJids` 进行真正的 WhatsApp @-提及，安全的正则表达式模式，或文本中任何地方出现机器人的 E.164 号码）。`always` 会在每条消息上唤醒代理，但应仅在能产生有意义的回复时响应，否则返回静默令牌 `NO_REPLY`。默认值可在配置文件中设置（`channels.whatsapp.groups`），并可通过 `/activation` 命令按群覆盖。当配置了 `channels.whatsapp.groups` 时，也同时作为群组允许列表（包括 `"*"` 表示允许全部）。
- 群策略：`channels.whatsapp.groupPolicy` 控制是否接受群消息（`open|disabled|allowlist`）。`allowlist` 使用 `channels.whatsapp.groupAllowFrom`（回退为显式的 `channels.whatsapp.allowFrom`）。默认是 `allowlist`（阻止所有发送者直到你添加它们）。
- 按群会话：会话键格式为 `agent:<agentId>:whatsapp:group:<jid>`，因此诸如 `/verbose on` 或 `/think high`（作为独立消息发送）等命令只影响该组；个人私聊状态不受影响。群聊线程跳过心跳。
- 上下文注入：对**未触发运行的**群消息（默认最多 50 条）前缀为 `[Chat messages since your last reply - for context]`，触发消息置于 `[Current message - respond to this]` 下。已经存在会话中的消息不会重复注入。
- 发送者显示：每个群消息批次结尾附加 `[from: 发送者名称 (+E164)]`，以便 Pi 知道谁在发言。
- 消失/一次性查看消息：处理时会先拆开，再提取文字和提及，所以其中的点名依然有效。
- 群系统提示：群会话首次轮次（以及每次 `/activation` 修改模式时）注入简短提示，如 `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), … Activation: trigger-only … Address the specific sender noted in the message context.` 如果没有元数据，也会告知代理这是群聊。

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

1. 将运行 OpenClaw 的 WhatsApp 账号加入群组。
2. 发送包含 `@openclaw`（或包含号码）的消息。除非设置了 `groupPolicy: "open"`，否则只有允许列表内的发送者可触发。
3. 代理提示包含最近群组上下文以及结尾的 `[from: …]` 标记，能准确识别发言人。
4. 会话级指令（`/verbose on`、`/think high`、`/new` 或 `/reset`、`/compact`）仅影响该群会话；请作为独立消息发送以确保生效。个人私聊会话保持独立。

## 测试 / 验证

- 手动冒烟测试：
  - 在群组中发送 `@openclaw` 点名，确认有带发送者名称的回复。
  - 再次发送点名，确认包含历史消息块且下一轮会清除。
- 查看网关日志（使用 `--verbose` 运行），观察 `inbound web message` 条目，显示 `from: <groupJid>` 和 `[from: …]` 后缀。

## 已知事项

- 群组跳过心跳以避免噪音广播。
- 回显抑制基于合并的批处理字符串；如果两次发送完全相同且无点名文本，仅第一次会获得回复。
- 会话存储条目格式为 `agent:<agentId>:whatsapp:group:<jid>`，存于默认路径 `~/.openclaw/agents/<agentId>/sessions/sessions.json`；不存在该条目意味着此群尚未触发运行。
- 群输入指示器遵循 `agents.defaults.typingMode` 配置（默认未点名时为 `message`）。
