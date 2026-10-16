---
summary: "OpenClaw 如何为每个入站消息选择代理和会话，以及回复如何路由回来"
read_when:
  - "更改频道路由或收件箱行为时"
title: "频道路由"
---

# <a id="channels-%26-routing"></a><a id="channels-&amp;-routing"></a> 频道与路由

OpenClaw 将回复 **路由回消息来自** 的通道。该模型不选择通道；路由遵循由主机配置控制的固定规则。在默认 DM 范围下，来自每个通道的直接消息汇聚到代理的 [ 主会话 ](/concepts/main-session) 上。

## <a id="key-terms"></a> 关键术语

- **Channel**：频道插件，例如 `discord`、`googlechat`、`imessage`、`irc`、`line`、`signal`、`slack`、`telegram` 或 `whatsapp`。`webchat` 是内部 WebChat UI 频道，不是可配置的出站频道。
- **AccountId**：每个频道的账户实例（在支持的情况下）。
- 可选的频道默认账户：`channels.<channel>.defaultAccount` 用于选择当出站路径未指定 `accountId` 时使用的账户。
  - 在多账户配置中，当配置了两个或更多账户时，设置一个明确的默认账户（`defaultAccount` 或名为 `default` 的账户）。如果未设置，回退路由可能会选择第一个规范化的账户 ID。
- **AgentId**：一个隔离的工作区 + 会话存储（“大脑”）。
- **SessionKey**：用于存储上下文和控制并发的分桶键。

## <a id="outbound-target-prefixes"></a> 外发目标前缀

显式的外发目标可以包含提供者前缀，例如 `telegram:123` 或 `tg:123`。当所选频道为 `last` 或其他未解析状态时，核心只会将该前缀视为频道选择提示，且前提是已加载的插件声明了该前缀。如果调用方已经显式选择了频道，则提供者前缀必须与该频道匹配；像通过 WhatsApp 发送到 `telegram:123` 这类跨频道组合会在插件特定目标规范化之前失败。

`channel:<id>`、`user:<id>`、`room:<id>`、`thread:<id>`、`imessage:<handle>` 和 `sms:<number>` 等目标类型与服务前缀会保留在所选频道的语法中。它们本身不会选择提供者。

报告失败、抑制或试运行的插件发送收据会使对话的存储路由和传送记录保持不变。已确认的部分发送可以建立路由，但请求的内容不会镜像为完全传送。

对话新近度跟踪入站初始化、观察到的路由和地址更改。仅会话簿记（例如使用或交付托管更新）保留现有对话关联，并且不会刷新其 `lastSeenAt` 时间戳。

## <a id="session-key-shapes-(examples)"></a><a id="session-key-shapes-examples"></a> 会话键形状（示例）

私信默认会折叠到代理的 **主** 会话：

- `agent:<agentId>:main`（例如：`agent:main:main`）

`session.dmScope` 控制 DM 折叠：`main`（默认）共享一个主会话，而 `per-peer`、`per-channel-peer` 和 `per-account-channel-peer` 将 DM 保留在单独的会话中。路由绑定可以通过 `bindings[].session.dmScope` 覆盖其匹配对等点的范围。

即使私信对话历史与主会话共享，sandbox 和工具策略仍会为外部私信使用派生的按账户划分的 direct-chat 运行时键， 因此频道发起的消息不会被视为本地主会话运行。

使用默认值 `session.groupScope: "per-group"`，组和通道在每个通道上保持隔离：

- 群组：`agent:<agentId>:<channel>:group:<id>`
- Channels/rooms: `agent:<agentId>:<channel>:channel:<id>`

设置 `session.groupScope: "main"` 将所有非直接对等点路由到代理的主会话，或对选定的房间使用 `bindings[].session.groupScope`。绑定覆盖胜过全局值。这仅更改共享上下文；提及门控和回复仍使用原始组或频道。

线程：

- Slack/Discord 线程会在基础键后追加 `:thread:<threadId>`。
- Telegram 论坛主题会在群组键中嵌入 `:topic:<topicId>`。

示例：

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## <a id="main-dm-route-pinning"></a> 主 DM 路由固定

当`session.dmScope`为`main`时，直接消息可以共享一个主会话。为了防止会话的 `lastRoute` 被非所有者 DM 覆盖，当所有这些都为真时，OpenClaw 会从 `allowFrom` 推断固定所有者：

- `allowFrom` 恰好只有一个非通配符条目。
- 该条目可以被规范化为该频道的具体发送者 ID。
- 传入的 DM 发送者与该固定拥有者不匹配。

在这种不匹配情况下，OpenClaw 仍会记录传入会话元数据，但会跳过更新主会话的 `lastRoute`。

## <a id="guarded-inbound-recording"></a> 受保护的入站记录

当受保护路径不应创建新的 OpenClaw 会话时，频道插件可以将入站会话记录标记为 `createIfMissing: false`。在这种模式下， OpenClaw 可以更新现有会话的元数据和 `lastRoute`，但不会因为观察到一条消息就创建仅路由用的会话条目。

## <a id="routing-rules-(how-an-agent-is-chosen)"></a><a id="routing-rules-how-an-agent-is-chosen"></a> 路由规则（如何选择代理）

普通路由为每个入站消息选择 **one agent**：

1. **精确 peer 匹配**（`bindings` 中的 `peer.kind` + `peer.id`）。
2. **父级 peer 匹配**（线程继承）。
3. **peer 通配符匹配**（某个 peer 类型下的 `peer.id: "*"`）。
4. **Guild + 角色匹配**（Discord），通过 `guildId` + `roles`。
5. **Guild 匹配**（Discord），通过 `guildId`。
6. **Team 匹配**（Slack），通过 `teamId`。
7. **Account 匹配**（通道上的 `accountId`）。
8. **Channel 匹配**（该通道上的任意账户，`accountId: "*"`）。
9. **后备所有者**：调用者提供的所有者，否则是唯一配置的代理或保留的旧所有者。没有所有者的多个代理需要匹配的绑定；路由不会选择第一个名册条目。

启动前运行 `openclaw doctor --fix` 以迁移旧的默认标记。没有代理名册的新配置接收单个 `main` 代理。

当一个绑定包含多个匹配字段（`peer`、`guildId`、`teamId`、`roles`）时，**所有提供的字段都必须匹配**，该绑定才会生效。

匹配到的代理决定使用哪个工作区和会话存储。

## <a id="broadcast-groups-(run-multiple-agents)"></a><a id="broadcast-groups-run-multiple-agents"></a> 广播组（运行多个代理）

代理组线程使用顶级 `broadcast` 配置来为已接纳的入站消息运行多个代理。合格的 `"<channel>:<peerId>"` 密钥优先于不合格的 WhatsApp 对等密钥。普通路由仍然提供会话路由；协调器为每个参与者提供该通道、帐户、对等点和线程的自己的代理会话。

```json5
{
  broadcast: {
    strategy: "parallel",
    "telegram:-100123": {
      agents: ["reviewer", "writer"],
      maxRounds: 2,
      maxTurns: 4,
    },
    "slack:C0123": ["support", "reviewer"],
    "120363403215116621@g.us": ["alfred", "baerbel"],
  },
}
```

合格的条目默认为显式提及选择，一轮，每个配置的代理一轮。 `maxTurns` 限制参与者在所有轮次中启动的运行，而不是物理平台消息。旧版 WhatsApp 阵列保留对所有列出的代理的单通道扇出。

频道许可名单仍然适用。在Discord、Slack和Telegram上，明确提及任何符合资格的参与者都可以满足房间的提及门。配置的 ACP 绑定保持独占并绕过组线程扇出。

请参阅 [ 广播组](/channels/broadcast-groups) 了解选择、继续资格、预算和参与者标签。 Control UI 尚未提供专用的团队线程会话。

## <a id="config-overview"></a> 配置概览

- `agents.entries`：命名的代理定义（工作区、模型等）。
- `bindings`：将入站 channels/accounts/peers 映射到客服人员。

示例：

```json5
{
  agents: {
    entries: {
      support: {
        name: "Support",
        workspace: "~/.openclaw/workspace-support",
      },
    },
  },
  bindings: [
    { match: { channel: "slack", teamId: "T123" }, agentId: "support" },
    {
      match: { channel: "slack", peer: { kind: "channel", id: "C0123TEAM" } },
      agentId: "support",
      session: { groupScope: "main" },
    },
  ],
}
```

## <a id="session-storage"></a> 会话存储

运行时会话行和记录位于状态目录下每个代理的 SQLite 数据库中（默认 `~/.openclaw`）：

- `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`

较旧的安装可能具有旧版记录 JSONL 文件和 `~/.openclaw/agents/<agentId>/sessions/` 下的 `sessions.json` 行存储。要将历史记录导入到 SQLite，请停止网关，备份其状态，然后在重新启动之前运行 `openclaw doctor --fix`。网关启动不会导入旧会话文件：如果它找到旧存储，它会拒绝准备并打印活动配置文件的 Doctor 命令。使用 `openclaw doctor --session-sqlite inspect --session-sqlite-all-agents` 和 [Doctor](/cli/doctor#session-sqlite-migration) 迁移序列进行检查和验证。

`session.store` 支持 `{agentId}` 模板。在运行时，遗留存储路径选择其对应的SQLite数据库； JSON 文件本身只是迁移输入或显式离线维护目标。

网关会话发现可以包括默认 `agents/` 根和使用 `agents/<agentId>/sessions/sessions.json` 布局的模板化 `session.store` 根下的磁盘存储。它可以识别相应的 `agent/openclaw-agent.sqlite` 数据库，而不需要旧的 `sessions.json` 文件。发现的存储文件必须是解析的代理根目录中的常规文件；符号链接存储文件和根外路径将被忽略。

ACP 会话发现读取 SQLite ACP 元数据并将其加入到相应的会话条目中。

## <a id="webchat-behavior"></a> WebChat 行为

WebChat 会附加到**所选代理**，并默认使用该代理的主会话。因此，WebChat 让你可以在一个地方查看该代理的跨频道上下文。

除非明确选择外部路线，否则 WebChat 转弯及其后台完成将保留在 WebChat 中。会话保存的外部路由会保留给有意使用它的呼叫者；它不会覆盖当前回合的原点。内部触发的媒体任务可以使用 WebChat 通道哨兵，无需交互式 WebChat 源；他们的媒体接入仍然固定已保存的外部路由。

出站 `send` 请求可以设置 `sessionKey` 将传递的输出镜像到不同的记录中。这不会重新绑定该记录的传送路由：已解析的目标对话拥有已保存的路由，包括当通道路由有意选择共享主会话时。

## <a id="reply-context"></a> 回复上下文

入站回复会包含：

- 在可用时包含 `ReplyToId`、`ReplyToBody` 和 `ReplyToSender`。
- 引用的上下文作为`[Replying to ...]`块附加到`Body`。

这在各个频道中保持一致。

## <a id="related"></a> 相关内容

- [群组](/channels/groups)
- [广播组](/channels/broadcast-groups)
- [配对](/channels/pairing)
- [多代理路由](/concepts/multi-agent)
- [代理绑定](/concepts/agent-bindings)
