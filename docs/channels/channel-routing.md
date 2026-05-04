---
summary: "按频道的路由规则（WhatsApp、Telegram、Discord、Slack）以及共享上下文"
read_when:
  - 更改频道路由或收件箱行为时
title: "频道路由"
---

# 频道与路由

OpenClaw 会将回复**路由回消息来源的频道**。模型不会选择频道；路由是确定性的，由宿主配置控制。

## 关键术语

- **Channel**: `telegram`、`whatsapp`、`discord`、`irc`、`googlechat`、`slack`、`signal`、`imessage`、`line`，以及插件频道。`webchat` 是内部的 WebChat UI 频道，不是可配置的外发频道。
- **AccountId**: 按频道划分的账号实例（在支持时）。
- 可选的频道默认账号：`channels.<channel>.defaultAccount` 会在外发路径未指定 `accountId` 时选择
  使用哪个账号。
  - 在多账号设置中，当配置了两个或更多账号时，请设置一个明确的默认值（`defaultAccount` 或 `accounts.default`）。否则，回退路由可能会选择第一个规范化后的账号 ID。
- **AgentId**: 一个隔离的工作区 + 会话存储（“大脑”）。
- **SessionKey**: 用于存储上下文并控制并发的桶键。

## Outbound target prefixes

显式的外发目标可以包含提供者前缀，例如 `telegram:123` 或 `tg:123`。当所选频道为 `last` 或其他未解析状态时，核心只会将该前缀视为频道选择提示，且前提是已加载的插件声明了该前缀。如果调用方已经显式选择了频道，则提供者前缀必须与该频道匹配；像通过 WhatsApp 发送到 `telegram:123` 这类跨频道组合会在插件特定目标规范化之前失败。

`channel:<id>`、`user:<id>`、`room:<id>`、`thread:<id>`、`imessage:<handle>` 和 `sms:<number>` 等目标类型与服务前缀会保留在所选频道的语法中。它们本身不会选择提供者。

## Session key shapes (examples)

默认情况下，直接消息会折叠到代理的**主**会话：

- `agent:<agentId>:<mainKey>`（默认：`agent:main:main`）

即使直接消息的对话历史与主会话共享，sandbox 和
工具策略也会为外部 DM 使用一个派生的、按账号区分的直接聊天运行时键，
这样来自频道的消息就不会被当作本地主会话运行处理。

群组和频道仍然按频道隔离：

- 群组：`agent:<agentId>:<channel>:group:<id>`
- 频道/房间：`agent:<agentId>:<channel>:channel:<id>`

线程：

- Slack/Discord 线程会在基础键后追加 `:thread:<threadId>`。
- Telegram 论坛主题会在群组键中嵌入 `:topic:<topicId>`。

示例：

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## 主 DM 路由固定

当 `session.dmScope` 为 `main` 时，直接消息可能共享一个主会话。
为了防止会话的 `lastRoute` 被非拥有者的 DM 覆盖，
当以下条件都满足时，OpenClaw 会根据 `allowFrom` 推断一个固定拥有者：

- `allowFrom` 恰好只有一个非通配符条目。
- 该条目可以被规范化为该频道的具体发送者 ID。
- 传入的 DM 发送者与该固定拥有者不匹配。

在这种不匹配情况下，OpenClaw 仍会记录传入会话元数据，但会
跳过更新主会话的 `lastRoute`。

## 受保护的入站记录

当受保护路径不应创建新的 OpenClaw 会话时，频道插件可以将入站会话记录标记为
`createIfMissing: false`。在这种模式下，
OpenClaw 可以更新现有会话的元数据和 `lastRoute`，但不会因为观察到一条消息就
创建仅路由用的会话条目。

## 路由规则（如何选择代理）

路由会为每条入站消息选择**一个代理**：

1. **精确的 peer 匹配**（`bindings`，包含 `peer.kind` + `peer.id`）。
2. **父级 peer 匹配**（线程继承）。
3. **Guild + roles 匹配**（Discord），通过 `guildId` + `roles`。
4. **Guild 匹配**（Discord），通过 `guildId`。
5. **Team 匹配**（Slack），通过 `teamId`。
6. **Account 匹配**（频道上的 `accountId`）。
7. **Channel 匹配**（该频道上的任意账号，`accountId: "*"`）。
8. **默认代理**（`agents.list[].default`，否则为第一个列表项，回退到 `main`）。

当一个绑定包含多个匹配字段（`peer`、`guildId`、`teamId`、`roles`）时，**所有提供的字段都必须匹配**，该绑定才会生效。

匹配到的代理决定使用哪个工作区和会话存储。

## 广播组（运行多个代理）

广播组允许你在 OpenClaw 通常会回复的同一个 peer 上**运行多个代理**
（例如：在 WhatsApp 群组中，经过提及/激活门控之后）。

配置：

```json5
{
  broadcast: {
    strategy: "parallel",
    "120363403215116621@g.us": ["alfred", "baerbel"],
    "+15555550123": ["support", "logger"],
  },
}
```

参见：[广播组](/channels/broadcast-groups)。

## 配置概览

- `agents.list`：命名的代理定义（工作区、模型等）。
- `bindings`：将入站频道/账号/peer 映射到代理。

示例：

```json5
{
  agents: {
    list: [{ id: "support", name: "Support", workspace: "~/.openclaw/workspace-support" }],
  },
  bindings: [
    { match: { channel: "slack", teamId: "T123" }, agentId: "support" },
    { match: { channel: "telegram", peer: { kind: "group", id: "-100123" } }, agentId: "support" },
  ],
}
```

## 会话存储

会话存储位于状态目录下（默认 `~/.openclaw`）：

- `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- JSONL 转录文件与存储文件并排存放

你可以通过 `session.store` 和 `{agentId}` 模板覆盖存储路径。

Gateway 和 ACP 的会话发现也会扫描默认 `agents/` 根目录以及模板化的
`session.store` 根目录下的磁盘代理存储。被发现的存储必须保留在解析后的代理根目录内，并使用普通的
`sessions.json` 文件。符号链接和越出根目录的路径会被忽略。

## WebChat 行为

WebChat 会附加到**选定的代理**，并默认使用该代理的主
会话。因此，WebChat 让你可以在一个地方查看该代理的跨频道上下文。

## 回复上下文

入站回复会包含：

- 在可用时包含 `ReplyToId`、`ReplyToBody` 和 `ReplyToSender`。
- 引用上下文会以 `[Replying to ...]` 块的形式附加到 `Body`。

这在各个频道中保持一致。

## 相关内容

- [群组](/channels/groups)
- [广播组](/channels/broadcast-groups)
- [配对](/channels/pairing)
