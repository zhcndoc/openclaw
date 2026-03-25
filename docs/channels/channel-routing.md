---
summary: "每个渠道（WhatsApp, Telegram, Discord, Slack）的路由规则及共享上下文"
read_when:
  - 更改渠道路由或收件箱行为时
title: "渠道路由"
---

# 渠道与路由

OpenClaw 会将回复**路由回消息来源的渠道**。模型并不选择渠道；路由是确定性的，由主机配置控制。

## 关键术语

- **Channel**: `telegram`, `whatsapp`, `discord`, `irc`, `googlechat`, `slack`, `signal`, `imessage`, `line`, plus extension channels. `webchat` is the internal WebChat UI channel and is not a configurable outbound channel.
- **AccountId**: per‑channel account instance (when supported).
- Optional channel default account: `channels.<channel>.defaultAccount` chooses
  which account is used when an outbound path does not specify `accountId`.
  - In multi-account setups, set an explicit default (`defaultAccount` or `accounts.default`) when two or more accounts are configured. Without it, fallback routing may pick the first normalized account ID.
- **AgentId**: an isolated workspace + session store ("brain").
- **SessionKey**: the bucket key used to store context and control concurrency.

## 会话键格式示例

私信会合并到代理的**主**会话：

- `agent:<agentId>:<mainKey>`（默认：`agent:main:main`）

群组和频道在每个渠道中保持隔离：

- 群组：`agent:<agentId>:<channel>:group:<id>`
- 频道/房间：`agent:<agentId>:<channel>:channel:<id>`

线程：

- Slack/Discord 线程在基本键后追加 `:thread:<threadId>`。
- Telegram 论坛主题在群组键中嵌入 `:topic:<topicId>`。

示例：

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## 主私信路由固定

当 `session.dmScope` 为 `main` 时，私信可能共享一个主会话。  
为防止非拥有者的私信覆盖该会话的 `lastRoute`，当以下所有条件满足时，OpenClaw 会从 `allowFrom` 推断固定拥有者：

- `allowFrom` 恰有一条非通配符条目。
- 该条目可被标准化为该渠道的具体发送者 ID。
- 入站私信的发送者与该固定拥有者不匹配。

在不匹配的情况下，OpenClaw 仍会记录入站会话元数据，但会跳过更新主会话的 `lastRoute`。

## 路由规则（如何选择代理）

路由为每条入站消息选择**一个代理**：

1. **精确同伴匹配**（`bindings` 中带 `peer.kind` + `peer.id`）。
2. **父同伴匹配**（线程继承）。
3. **公会 + 角色匹配**（Discord），通过 `guildId` + `roles`。
4. **公会匹配**（Discord），通过 `guildId`。
5. **团队匹配**（Slack），通过 `teamId`。
6. **账户匹配**（渠道上的 `accountId`）。
7. **渠道匹配**（该渠道上的任意账户，`accountId: "*"`）。
8. **默认代理**（`agents.list[].default`，否则首个列表条目，后备为 `main`）。

当绑定包含多个匹配字段（`peer`、`guildId`、`teamId`、`roles`）时，必须**所有提供字段均匹配**该绑定才生效。

匹配的代理决定使用哪个工作区和会话存储。

## 广播群组（运行多个代理）

广播群组允许你为同一同伴在 OpenClaw 通常会回复时运行**多个代理**（例如：WhatsApp 群组内，在提及/激活门控之后）。

配置示例：

```json5
{
  broadcast: {
    strategy: "parallel",
    "120363403215116621@g.us": ["alfred", "baerbel"],
    "+15555550123": ["support", "logger"],
  },
}
```

详见：[广播群组](/channels/broadcast-groups)。

## 配置概览

- `agents.list`：具名代理定义（工作区、模型等）。
- `bindings`：将入站渠道/账户/同伴映射到代理。

示例：

```json5
{
  agents: {
    list: [{ id: "support", name: "支持", workspace: "~/.openclaw/workspace-support" }],
  },
  bindings: [
    { match: { channel: "slack", teamId: "T123" }, agentId: "support" },
    { match: { channel: "telegram", peer: { kind: "group", id: "-100123" } }, agentId: "support" },
  ],
}
```

## 会话存储

会话存储位于状态目录（默认 `~/.openclaw`）下：

- `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- JSONL 转录文件与存储文件共存

你可通过 `session.store` 配置及 `{agentId}` 模板覆盖存储路径。

## WebChat 行为

Gateway 和 ACP 会话发现还会扫描默认的 `agents/` 根目录下以及模板化的 `session.store` 根目录下的磁盘代理存储。发现的存储必须保持在解析后的代理根目录内，并使用常规的 `sessions.json` 文件。符号链接和根目录外的路径会被忽略。

WebChat 附着于**选中代理**并默认使用该代理的主会话。  
因此，WebChat 让你在一个地方查看该代理的跨渠道上下文。

## 回复上下文

入站回复包含：

- 可用时的 `ReplyToId`、`ReplyToBody` 和 `ReplyToSender`。
- 引用上下文会附加到 `Body` 中，作为 `[Replying to ...]` 块。

该行为在各渠道间保持一致。
