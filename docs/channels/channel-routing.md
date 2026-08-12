---
summary: "按频道的路由规则（WhatsApp、Telegram、Discord、Slack）以及共享上下文"
read_when:
  - 更改频道路由或收件箱行为时
title: "频道路由"
---

# 频道与路由

OpenClaw 会将回复**路由回消息来源所在的频道**。  
模型不会选择频道；路由是确定性的，由宿主配置控制。在默认的 DM 范围下，来自每个频道的直接消息都会汇聚到代理的 [主会话](/concepts/main-session)。

## 关键术语

- **Channel**：频道插件，例如 `discord`、`googlechat`、`imessage`、`irc`、`line`、`signal`、`slack`、`telegram` 或 `whatsapp`。`webchat` 是内部 WebChat UI 频道，不是可配置的出站频道。
- **AccountId**：每个频道的账户实例（在支持的情况下）。
- 可选的频道默认账户：`channels.<channel>.defaultAccount` 用于选择
  当出站路径未指定 `accountId` 时使用的账户。
  - 在多账户配置中，当配置了两个或更多账户时，设置一个明确的默认账户（`defaultAccount` 或名为 `default` 的账户）。如果未设置，回退路由可能会选择第一个规范化的账户 ID。
- **AgentId**：一个隔离的工作区 + 会话存储（“大脑”）。
- **SessionKey**：用于存储上下文和控制并发的分桶键。

## 外发目标前缀

显式的外发目标可以包含提供者前缀，例如 `telegram:123` 或 `tg:123`。当所选频道为 `last` 或其他未解析状态时，核心只会将该前缀视为频道选择提示，且前提是已加载的插件声明了该前缀。如果调用方已经显式选择了频道，则提供者前缀必须与该频道匹配；像通过 WhatsApp 发送到 `telegram:123` 这类跨频道组合会在插件特定目标规范化之前失败。

`channel:<id>`、`user:<id>`、`room:<id>`、`thread:<id>`、`imessage:<handle>` 和 `sms:<number>` 等目标类型与服务前缀会保留在所选频道的语法中。它们本身不会选择提供者。

## 会话键形状（示例）

私信默认会折叠到代理的 **主** 会话：

- `agent:<agentId>:<mainKey>`（默认：`agent:main:main`）

`session.dmScope` 控制私信折叠：`main`（默认）共享一个主
会话，而 `per-peer`、`per-channel-peer` 和 `per-account-channel-peer`
会将私信保留在独立会话中。路由绑定可以通过 `bindings[].session.dmScope`
为其匹配的对等方覆盖该范围。

即使私信对话历史与主会话共享，sandbox 和
工具策略仍会为外部私信使用派生的按账户划分的 direct-chat 运行时键，
因此频道发起的消息不会被视为本地主会话运行。

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
为防止非拥有者的 DM 覆盖该会话的 `lastRoute`，当满足以下所有条件时，OpenClaw 会根据 `allowFrom` 推断出一个固定的拥有者：

- `allowFrom` 恰好只有一个非通配符条目。
- 该条目可以被规范化为该频道的具体发送者 ID。
- 传入的 DM 发送者与该固定拥有者不匹配。

在这种不匹配情况下，OpenClaw 仍会记录传入会话元数据，但会跳过更新主会话的 `lastRoute`。

## 受保护的入站记录

当受保护路径不应创建新的 OpenClaw 会话时，频道插件可以将入站会话记录标记为
`createIfMissing: false`。在这种模式下，
OpenClaw 可以更新现有会话的元数据和 `lastRoute`，但不会因为观察到一条消息就
创建仅路由用的会话条目。

## 路由规则（如何选择代理）

路由会为每条入站消息选择**一个代理**：

1. **精确 peer 匹配**（`bindings` 中的 `peer.kind` + `peer.id`）。
2. **父级 peer 匹配**（线程继承）。
3. **peer 通配符匹配**（某个 peer 类型下的 `peer.id: "*"`）。
4. **Guild + 角色匹配**（Discord），通过 `guildId` + `roles`。
5. **Guild 匹配**（Discord），通过 `guildId`。
6. **Team 匹配**（Slack），通过 `teamId`。
7. **Account 匹配**（通道上的 `accountId`）。
8. **Channel 匹配**（该通道上的任意账户，`accountId: "*"`）。
9. **默认代理**（`agents.entries.*.default`，否则取列表中的第一个条目，回退到 `main`）。

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

- `agents.entries`：命名的代理定义（工作区、模型等）。
- `bindings`：将入站渠道/账号/对等方映射到代理。

示例：

```json5
{
  agents: {
    entries: {
      support: {
        default: true,
        name: "Support",
        workspace: "~/.openclaw/workspace-support",
      },
    },
  },
  bindings: [
    { match: { channel: "slack", teamId: "T123" }, agentId: "support" },
    { match: { channel: "telegram", peer: { kind: "group", id: "-100123" } }, agentId: "support" },
  ],
}
```

## 会话存储

运行时会话行存储在每个 agent 的 SQLite 数据库中，位于 state
目录下（默认 `~/.openclaw`）：

- `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`

较旧的安装版本可能仍在 `~/.openclaw/agents/<agentId>/sessions/` 下保留
旧版转录 JSONL 文件和一个 `sessions.json` 行
存储。Gateway 启动和
`openclaw doctor --fix` 会自动将热的旧版行/历史导入到 SQLite
中。需要明确的迁移证据时，请使用 `openclaw doctor --session-sqlite inspect
--session-sqlite-all-agents` 和
[Doctor](/cli/doctor#session-sqlite-migration) 验证序列。
你仍然可以通过 `session.store` 和 `{agentId}`
模板选择一个旧存储路径，用于迁移和离线维护工作流。

Gateway 和 ACP 的会话发现也会扫描默认 `agents/` 根目录下以及
模板化 `session.store` 根目录下的磁盘支持 agent 存储。发现的
存储必须保留在解析后的 agent 根目录内，并使用常规的旧版
`sessions.json` 文件。符号链接和超出根目录的路径会被忽略。

## WebChat 行为

WebChat 会附加到**所选代理**，并默认使用该代理的主
会话。因此，WebChat 让你可以在一个地方查看该
代理的跨频道上下文。

## 回复上下文

入站回复会包含：

- 在可用时包含 `ReplyToId`、`ReplyToBody` 和 `ReplyToSender`。
- 引用上下文会以 `[回复给 ...]` 块的形式附加到 `Body`。

这在各个频道中保持一致。

## 相关内容

- [群组](/channels/groups)
- [广播组](/channels/broadcast-groups)
- [配对](/channels/pairing)
