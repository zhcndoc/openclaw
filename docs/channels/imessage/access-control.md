---
summary: "iMessage DM 和组策略、提及门控、每组提示、ACP 绑定和配置写入"
read_when:
  - "决定谁可以向机器人发送消息"
  - "调试忽略的 DM 或忽略的群组消息"
  - "将 iMessage 聊天绑定到 ACP 会话"
title: "iMessage 访问控制和路由"
sidebarTitle: "访问控制"
---

谁被允许，消息如何路由到会话，以及哪些聊天可以写入配置。

## <a id="access-control-and-routing"></a> 访问控制与路由

<Tabs>
  <Tab id="dm-policy" title="DM 政策">
    `channels.imessage.dmPolicy` 控制私信：

    - `pairing`（默认）
    - `allowlist`（至少需要一个 `allowFrom` 条目）
    - `open`（要求 `allowFrom` 包含 `"*"`)
    - `disabled`

    允许列表字段：`channels.imessage.allowFrom`。

    允许列表条目必须标识发件人：句柄或静态发件人访问组 （`accessGroup:<name>`）。将 `channels.imessage.groupAllowFrom` 用于聊天目标，例如 `chat_id:*`、`chat_guid:*` 或 `chat_identifier:*`；使用 `channels.imessage.groups` 作为数字 `chat_id` 注册表项。

  </Tab>

  <Tab id="group-policy-%2B-mentions" title="团体政策+提及">
    `channels.imessage.groupPolicy` 控制群组处理：

    - `allowlist` (默认)
    - `open`
    - `disabled`

    群组发送者允许列表：`channels.imessage.groupAllowFrom`。

    `groupAllowFrom` 条目也可以引用静态发送者访问组（`accessGroup:<name>`）。

    运行时回退：如果未设置 `groupAllowFrom`，iMessage 群组发送者检查会使用 `allowFrom`；当 DM 和群组准入需要不同设置时，请设置 `groupAllowFrom`。显式空的 `groupAllowFrom: []` 不会回退——它会在 `allowlist` 下阻止所有群组发送者。 运行时说明：如果 `channels.imessage` 完全缺失，运行时会回退到 `groupPolicy="allowlist"` 并记录警告（即使设置了 `channels.defaults.groupPolicy`）。

    <Warning>
    `groupPolicy: "allowlist"` 下的群组路由会连续运行 **两个** 门控：

    1. **发送者允许列表**（`channels.imessage.groupAllowFrom`）——handle、`accessGroup:<name>`、`chat_guid`、`chat_identifier` 或 `chat_id`。空的有效列表（既没有 `groupAllowFrom` 也没有 `allowFrom` 回退）会阻止每个群组发送者。
    2. **群组注册表**（`channels.imessage.groups`）——当映射中有条目时才强制执行：聊天必须匹配明确的按 `chat_id` 配置项，或匹配 `groups: { "*": { ... } }` 通配项。当 `groups` 为空或缺失时，仅由发送者允许列表决定是否准入。

    如果未配置有效的组发件人允许列表，则每个组消息都会在注册表门之前被丢弃。每个门在默认日志级别都有自己的 `warn`-level 信号，并且每个门都有不同的修复：

    - 启动时每个账户只记录一次：当有效的群组发送者允许列表为空时，`imessage: groupPolicy="allowlist" for account "<id>" but no group sender allowlist is configured ...` —— 通过设置 `channels.imessage.groupAllowFrom`（或 `allowFrom`）来修复；仅添加 `groups` 条目会让门控 1 继续阻止所有发送者。
    - 运行时每个 `chat_id` 的 one-time，当发送者通过门 1 但填充的 `groups` 注册表中缺少聊天时：`imessage: dropping group message from chat_id=<id> ...` — 通过在 `channels.imessage.groups` 下添加 `chat_id`（或 `"*"`）来修复。

    私信不受影响——它们走的是不同的代码路径。

    在 `groupPolicy: "allowlist"` 下推荐的群组流配置：

    ```json5
    {
      channels: {
        imessage: {
          groupPolicy: "allowlist",
          groupAllowFrom: ["+15555550123"],
          groups: { "*": { "requireMention": true } },
        },
      },
    }
    ```

    仅 `groupAllowFrom` 就能允许这些发送者进入任何群组；再添加 `groups` 块即可限定允许哪些聊天（并设置诸如 `requireMention` 之类的每聊天选项）。
    </Warning>

    群组提及门控：

    - iMessage 没有原生提及元数据
    - 提及检测使用`agents.entries.*.groupChat.mentionPatterns`，则`messages.groupChat.mentionPatterns`；如果两者均未设置，则模式源自路由代理的 `identity.name` 和 `identity.emoji`
    - 默认情况下，groups 需要提及，即使没有显式配置模式也是如此；因此，除非包含客服人员的姓名或表情符号，否则可以跳过列入白名单的发件人的消息
    - an 在选定的代理或全局级别显式 `mentionPatterns: []` 抑制源自身份的模式；当没有可用模式剩余时，iMessage 无法强制提及门控
    - 来自授权发送者的控制命令会绕过提及门控

    要处理来自一个组中允许的发件人的每条消息，请将该聊天的 `requireMention` 设置为 `false`：

    ```json5
    {
      channels: {
        imessage: {
          groupPolicy: "allowlist",
          groupAllowFrom: ["+15555550123", "+15555550124"],
          groups: {
            "*": {},
            "123": { requireMention: false },
          },
        },
      },
    }
    ```

    将 `123` 替换为 `imsg chats --limit 20 --json` 中的数字聊天 ID。编辑已提供该帐户组策略的映射：`channels.imessage.groups` 或 `channels.imessage.accounts.<account-id>.groups`（当它覆盖根映射时）。这也适用于`accounts.default.groups`；仅仅拥有一个帐户条目并不意味着需要它自己的 `groups` 地图。仅当最多配置一个帐户时，空帐户映射才会继承根映射。

    要仅在由 OpenClaw 启动的本机回复线程中允许未提及的后续操作，请在该组条目中将 `requireMentionInBotThreads: false` 与 `requireMention: true` 一起设置。确切的组设置会覆盖 `groups["*"].requireMentionInBotThreads`。将其设置为 `true` 以要求在这些线程中提及，或忽略它以保留正常的提及行为。发件人和群组限制仍然适用。

    当提及模式被禁用时，显式的 `requireMentionInBotThreads: true` 仍然强制执行。配置可用的提及模式来解决这些线程中的机器人；否则，除了授权的控制命令外，它们会保持安静。

    线程所有权来自本机线程根 GUID 和 OpenClaw 的帐户和会话范围的发送消息缓存。缓存最多可保留 2,000 条消息长达 6 小时，并且在该窗口内重新启动后仍可保留。未知或被驱逐的根保留正常的提及要求。在其他人的线程中回复机器人消息并不会使该线程归机器人所有。

    保留现有通配符和每个组的设置，仅更改目标聊天的 `requireMention`。帐户映射会替换整个继承的映射，因此，如果您有意创建特定于帐户的覆盖，请首先复制完整的继承映射，包括所有通配符和每组策略。当之前没有应用地图时，`"*": {}` 保留其他组的入场许可，同时保留其默认提及要求。保持受限地图的限制。 `groupAllowFrom` 仍控制发件人访问。

    未提及的跳过消息会在聊天 ID 和 `requireMention: false` 修复的默认日志级别产生警告。同一聊天的重复警告会被有限的内存缓存所抑制；重新启动通道或逐出缓存条目会再次发出警告。

    每组 `systemPrompt`：

    `channels.imessage.groups.*` 下的每个条目都接受一个可选的 `systemPrompt` 字符串，该字符串会在每一轮处理该群组消息时注入到代理的系统提示词中。解析方式与 `channels.whatsapp.groups` 一致：

    1. **特定组系统提示**（`groups["<chat_id>"].systemPrompt`）：当映射中存在特定组条目**和**时使用，其`systemPrompt`键被定义。如果 `systemPrompt` 是空字符串 （`""`），则禁止通配符，并且不会向该组应用系统提示。
    2. **组通配系统提示词**（`groups["*"].systemPrompt`）：当特定组条目在映射中完全不存在，或者它存在但未定义 `systemPrompt` 键时使用。

    ```json5
    {
      channels: {
        imessage: {
          groupPolicy: "allowlist",
          groupAllowFrom: ["+15555550123"],
          groups: {
            "*": { systemPrompt: "Use British spelling." },
            "8421": {
              requireMention: true,
              systemPrompt: "This is the on-call rotation chat. Keep replies under 3 sentences.",
            },
            "9907": {
              // explicit suppression: the wildcard "Use British spelling." does not apply here
              systemPrompt: "",
            },
          },
        },
      },
    }
    ```

    每组提示词仅适用于群组消息——私信不受影响。

  </Tab>

  <Tab id="sessions-and-reply-routing" title="会话和回复路由">
    <a id="sessions-and-deterministic-replies" />
    - 私信使用直接路由；群组使用群组路由。
    - 在默认 `session.dmScope=main` 下，iMessage 私信会合并到代理主会话中。
    - 群组会话相互隔离（`agent:<agentId>:imessage:group:<chat_id>`）。
    - 回复使用原始 channel/target 元数据路由回 iMessage。
    - `chat_id`、`chat_guid` 和 `chat_identifier` 是传递选择器，而不是组标记。出站会话路由通过帐户的消息聊天列表解析聊天：一对一聊天使用规范化句柄的直接会话，群组使用数字聊天 ID。未解析的选择器不会创建猜测的会话。
    - 旧版本可能创建了额外的组会话，其中包含用于一对一聊天的传递镜像。此修复可防止新的错误分类镜像；它保留现有的会话历史记录，而不是自动合并或删除这些行。

    类群组线程行为：

    某些多参与者 iMessage 线程可能会带着 `is_group=false` 到达。 如果该 `chat_id` 在 `channels.imessage.groups` 中被显式配置，OpenClaw 会将其视为群组流量（群组门控 + 群组会话隔离）。

  </Tab>
</Tabs>

## <a id="acp-conversation-bindings"></a> ACP 会话绑定

iMessage 聊天可以绑定到 ACP 会话。

快速操作流程：

- 在DM或允许的群聊中运行`/acp spawn codex --bind here`。
- 之后同一 iMessage 会话中的消息将路由到生成的 ACP 会话。
- `/new` 和 `/reset` 会就地重置同一个已绑定的 ACP 会话。
- `/acp close` 会关闭 ACP 会话并移除绑定。

已配置的持久绑定使用顶层 `bindings[]` 条目，其中 `type: "acp"` 且 `match.channel: "imessage"`。

`match.peer.id` 可以使用：

- 标准化DM手柄，例如`+15555550123`或`user@example.com`
- `chat_id:<id>`（推荐用于稳定的群组绑定）
- `chat_guid:<guid>`
- `chat_identifier:<identifier>`

示例：

```json5
{
  agents: {
    entries: {
      codex: {
        runtime: {
          type: "acp",
          acp: { agent: "codex", backend: "acpx", mode: "persistent" },
        },
      },
    },
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "imessage",
        accountId: "default",
        peer: { kind: "group", id: "chat_id:123" },
      },
      acp: { label: "codex-group" },
    },
  ],
}
```

有关共享 ACP 绑定行为，请参阅 [ACP Agents](/tools/acp-agents)。

## <a id="config-writes"></a> 配置写入

iMessage 默认允许由频道发起的配置写入（用于 `/config set|unset`，当 `commands.config: true` 时）。

禁用：

```json5
{
  channels: {
    imessage: {
      configWrites: false,
    },
  },
}
```
