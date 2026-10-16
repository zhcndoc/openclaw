---
summary: "将 OpenClaw 代理连接到 Buzz 房间"
read_when:
  - "你希望人们从 Buzz 访问 OpenClaw 代理"
  - "你正在设置 Buzz 机器人身份和房间访问权限"
  - "你正在排查 Buzz 连接问题"
title: "嗡嗡声"
---

Buzz 是一个官方频道插件，可将 OpenClaw 代理连接到托管或自托管的 Buzz 工作区中的团队房间。

## <a id="what-it-does"></a> 它的作用

- 接收来自已批准 Buzz 房间的普通消息、富内容消息和结构化差异消息
- 在同一房间和线程中回复
- 在已接受的代理回合运行期间显示正在输入
- 保留回复中的 Markdown，并通过 OpenClaw 内置的 `message` 工具发送文本
- 从回复和主动消息中向当前房间成员发送原生 Buzz 提及
- 支持提及要求和发送者允许列表
- 在机器人获得批准后发现房间
- 通过 OpenClaw 的目录命令解析当前 Buzz 个人资料名称、头像、房间名称和房间成员资格
- 重新连接，并避免重复处理同一条消息

当前插件支持群组房间、Markdown 文本和入站结构化差异。暂不支持私信、媒体和文件、原生回应、创建房间以及自动管理员批准。

## <a id="buzz-identity-and-room-model"></a> Buzz 身份和房间模型

Buzz 使用 Nostr 密钥对作为身份：

- **私钥**用于让 OpenClaw 进行身份验证并签署消息。它保留在 Gateway 中。
- **公钥**用于标识机器人。Buzz 所有者用它进行中继审批，房间管理员用它授予 **Bot** 角色，OpenClaw 也可以在发送者允许列表中使用公钥。

继电器 URL 指向一个 Buzz 工作区。每个房间都有一个 UUID，OpenClaw 将每个配置的 UUID 视为单独的群组对话。一个网关和机器人身份可以为多个房间提供服务。您不需要每个代理或房间都有一个网关。

## <a id="before-you-start"></a> 开始之前

你需要：

1. 你的 Buzz 工作区的 `wss://` 中继 URL。
2. 一位可以批准机器人身份的 Buzz 所有者或管理员。
3. 至少一个可以将机器人以 **Bot** 角色添加进去的房间。

<Warning>
切勿将人类 Buzz 所有者的私钥提供给 OpenClaw。OpenClaw 会创建或使用一个专用的机器人身份，并显示管理员审批所需的公钥。
</Warning>

## <a id="install"></a> 安装

```bash
openclaw plugins install @openclaw/buzz
```

安装或更新插件后检查[应用结果](/plugins/manage-plugins#apply-changes-and-inspect)。

## <a id="guided-setup"></a> 指导性设置

运行：

```bash
openclaw channels add --channel buzz
```

设置流程将按以下步骤进行：

1. 选择现有 Buzz 帐户或添加指定帐户。
2. 输入蜂鸣继电器URL如果尚未为该帐户配置。
3. OpenClaw 重复使用该帐户的机器人身份或自动生成一个。
4. 如果机器人尚无房间访问权限，请将显示的公钥提供给 Buzz 房间所有者或管理员。
5. OpenClaw 等待 Buzz 确认 **Bot** 角色并自动继续。如果自动等待到期，请重试经过身份验证的发现或返回而不更改生成的身份。
6. 如果 Buzz 返回一间房间，则 OpenClaw 选择它。如果 Buzz 返回多个房间，请选择要使用的房间和默认的出站房间。
7. OpenClaw 保存配置并在网关运行时静默验证经过身份验证的房间。

全新设置会接受来自已配置房间当前成员的普通消息，而不要求 composer 提及。 当重新运行设置时，现有的显式提及和发送者允许名单设置会被保留。

安装程序会解析所选帐户的 `privateKey` 和 `authTag` SecretRefs，而不替换配置中的引用。如果配置的机密不可用，安装程序将报告错误而不保存帐户更改。使秘密可用并重新运行安装程序。现有帐户不会被禁用。至少选择一个授权房间来完成设置，或返回离开。

自动房间访问等待是有限的。如果未及时授予访问权限，安装程序将保持打开状态并提供经过身份验证的 Retry/Back 控件。每次重试都会重复使用相同的中继和机器人身份。超时不会禁用 Buzz 或退出设置。

### <a id="bot-approval"></a> 机器人批准

每个目标房间都必须包含带有 **Bot** 角色的机器人身份。现有的人类成员或普通房间成员角色都不够。

启动时，OpenClaw 会跳过机器人缺少机器人角色的活动配置房间，并为每个跳过的房间记录警告。其他符合条件的房间保持在线。如果活动配置的房间仍然存在，但没有一个具有 Bot 角色，则帐户无法启动。

当中继报告跳过房间的成员资格更改时，OpenClaw 会再次检查其签名名单。已确认的机器人角色会启动该房间，而无需重新启动正常的房间。订阅房间中的实时机器人角色降级仍然会取消帐户的活动工作并与新会员资格重新连接。

Buzz 桌面版无法可靠地为由外部管理的 OpenClaw 身份分配 Bot 角色。请作为现有的人类房间所有者或管理员使用 Buzz CLI：

```bash
buzz channels add-member \
  --channel <ROOM_UUID> \
  --pubkey <BOT_PUBLIC_KEY> \
  --role bot
```

请以现有的人类所有者或管理员身份运行该命令。绝不要把那个人类私钥交给 OpenClaw。

Gateway 连接后，OpenClaw 会保留现有的非空 Buzz 个人资料显示名称。对于新个人资料，它会先使用已配置的 Buzz channel 账户名，然后使用路由到已配置 Buzz 房间的单个 agent 的身份名称，最后使用 `OpenClaw`。这会在 Buzz 的个人资料缓存刷新后替换缩短的公钥。

OpenClaw 还在 Buzz 的代理目录中注册了相同的公共身份。它保留现有的代理目录配置文件和频道添加策略。对于新的配置文件，它允许授权的 Buzz 用户添加身份。这样，当该身份被邀请到其他房间时，Buzz 可以分配 **Bot** 角色，而不是将其视为普通成员。 OpenClaw 仍然仅从该帐户的 `groups` 中明确选择的房间接收消息：使用 `channels.buzz.groups` 作为隐式根身份，或使用 `channels.buzz.accounts.<id>.groups` 作为嵌套身份。

当机器人配置文件没有有效的 NIP-OA 所有者证明时，Buzz 会显示 `owner unavailable`。这并不意味着房间访问失败。将所选身份的 `authTag` 配置为隐式根身份的 `channels.buzz.authTag` 或嵌套身份的 `channels.buzz.accounts.<id>.authTag`。 OpenClaw 在已发布的个人资料中包含该证明，以便 Buzz 可以显示经过验证的人类所有者。

连接网关后，OpenClaw 每 30 秒发布并刷新机器人的短暂 Buzz 状态。当该机器人身份的最后一个经过身份验证的网关连接关闭时，Buzz 会删除该存在，因此多个网关实例不会错误地将彼此标记为离线。如果中继停止确认存在，OpenClaw 会重新连接受影响的 Buzz 帐户，而不是将打开但已停止的连接标记为就绪。显式存在拒绝仍然是警告，而不是重新连接触发器。

默认情况下，本地 Buzz `just dev` 中继不需要单独的中继成员资格。托管或封闭中继可能需要首先将机器人公钥添加到工作区社区。添加社区成员资格可授予中继访问权限。它不会将身份添加到具有 Bot 角色的房间。

```bash
buzz-admin add-member --pubkey <BOT_PUBLIC_KEY> --role member
```

OpenClaw 无法授予房间或中继访问权限。它只会显示授权人类所需的 bot 公钥。

## <a id="agent-tools-and-messaging"></a> Agent 工具和消息传递

Buzz 插件不会添加一个单独的仅限 Buzz 的 agent 工具。它会将 Buzz 注册为 OpenClaw 内置 `message` 工具和正常回复投递的目标。

agents 可以：

- 在其房间或线程中回复收到的 Buzz 消息
- 在生成回复时显示房间级或线程级输入状态
- 接收 Buzz kind `9` 普通消息、kind `40002` 富内容消息以及 kind `40008` 结构化差异
- 将 Markdown 文本作为普通 kind `9` 消息发送到已批准的 Buzz 房间
- 在普通回复和主动消息中发送原生的房间成员提及
- 在工作流未指定目标时使用配置的默认房间
- 使用所路由 agent 的常规技能、记忆和允许使用的工具

当以下字段存在时，结构化差异会将其仓库、提交、文件、分支、拉取请求、语言、描述、截断状态和统一差异内容包含在 agent 上下文中。差异内容不会被解释为 OpenClaw 命令或文本提及。

键入在活动的经过身份验证的网关连接上使用 Buzz 的临时类型 `20002`。普通回复每三秒刷新一次。心跳驱动的回复使用 OpenClaw 的共享打字间隔，默认为六秒。当轮次完成、取消、失败或网关关闭时，OpenClaw 停止刷新。键入失败不会阻止回复或仅重新连接网关来发送短暂事件。

人类和自动化流程可以通过 CLI 测试相同的出站路径：

```bash
openclaw message send \
  --channel buzz \
  --target buzz:<ROOM_UUID> \
  --message "Hello from OpenClaw"
```

### <a id="native-mentions"></a> 原生提及

将当前房间中唯一成员的个人资料名称写成 `@Display Name`。OpenClaw 会保持可见文本不变，并添加原生 Buzz `p` 标签，线程回复也同样如此。名称只会根据目标房间当前由中继签名的成员列表和有界个人资料快照进行解析。

如需指定明确的身份，请在消息中包含其 NIP-27 引用：

```bash
openclaw message send \
  --channel buzz \
  --target engineering \
  --message "Please review this, nostr:npub1..."
```

引用的公钥必须是目标房间的当前成员。如果没有明确的身份，未知的名称和重复的个人资料名称会明显失败，而不是在不通知任何人的情况下发送看起来像是提及的文本。当消息包含显式身份时，未解析或不明确的标签仍保留为表示文本。明确包含每个预期的身份。不明确的错误会列出候选公钥，以便发送者可以使用预期的 `nostr:npub...` 身份重试。室外公钥总是会失败。内联或隔离 Markdown 代码内的类似提及的文本将被忽略，一条消息最多可以携带 50 个本机提及。

连接的网关从其现有的内存中目录快照解析名称，并且不查询每条消息的中继。超出有界快照的配置文件需要显式 `nostr:npub...` 身份。独立的提及发送通过一个有界的经过身份验证的中继会话加载成员资格和配置文件、发布并关闭它。不带提及语法的独立消息保留现有的直接发布路径。

### <a id="directory-and-sender-labels"></a> 目录和发送者标签

OpenClaw 会保留已配置房间、其当前由中继签名的成员列表、房间元数据以及 kind `0` 成员个人资料的有界快照。当可用时，传入的 agent 上下文会使用当前的个人资料名称和房间名称，而发送者公钥仍然是稳定的授权、路由和会话身份。

通过 CLI 检查相同的数据：

```bash
openclaw directory self --channel buzz
openclaw directory peers list --channel buzz --query "alice"
openclaw directory groups list --channel buzz --query "engineering"
openclaw directory groups members \
  --channel buzz \
  --group-id buzz:<ROOM_UUID>
```

连接网关后，目录读取会重用其经过身份验证的 Buzz 连接和内存快照。独立目录命令打开一个有界的经过身份验证的连接，加载当前快照，然后将其关闭。无需重新连接即可记录普通目录错误。如果目录或配置文件订阅在 10 秒内未到达 EOSE，OpenClaw 会将 Buzz 中继会话视为已停止，并仅回收该 Buzz 帐户连接。网关继续运行。

已归档的房间会从目录结果和实时房间订阅中排除。如果 OpenClaw 连接期间某个已配置房间被归档或恢复，插件只会回收其 Buzz 连接，使订阅集合与中继的当前元数据保持一致。Gateway 会继续运行。

每个配置的房间都使用一个房间范围的中继订阅。 OpenClaw 保留 Buzz 1,024 个连接订阅中的 4 个用于会员通知以及并发配置文件、会员资格和元数据查询，因此一个帐户最多可以配置 1,020 个房间。接近该限制时，可选的会员个人资料订阅将首先减少。目录条目继续使用稳定的公钥和稳定的后备标签。

唯一的当前房间名称可以通过 OpenClaw 的共享目录查找解析为出站目标。明确的 `buzz:<ROOM_UUID>` 目标仍然是自动化和具有重复名称的房间的最安全选择。

### <a id="route-rooms-to-different-agents"></a> 将房间路由到不同的 agent

标准 OpenClaw 绑定可以将每个 Buzz 房间发送给不同的 agent、workspace 或 model，而一个 Gateway 和 Buzz bot 为它们全部提供服务：

```json5
{
  agents: {
    ownership: "explicit",
    defaults: {
      authInheritance: { agentId: "support" },
      heartbeat: { agentId: "support" },
      systemAgent: { agentId: "support" },
    },
    entries: {
      support: { workspace: "~/.openclaw/workspace-support" },
      engineering: { workspace: "~/.openclaw/workspace-engineering" },
    },
  },
  bindings: [
    {
      agentId: "support",
      match: {
        channel: "buzz",
        peer: { kind: "group", id: "buzz:<SUPPORT_ROOM_UUID>" },
      },
    },
    {
      agentId: "engineering",
      match: {
        channel: "buzz",
        peer: { kind: "group", id: "buzz:<ENGINEERING_ROOM_UUID>" },
      },
    },
    { agentId: "support", match: { channel: "buzz", accountId: "*" } },
  ],
  talk: { agentId: "support" },
}
```

通道范围内的绑定将其他允许的 Buzz 房间发送到 `support`。请参阅 [ 通道路由 ](/channels/channel-routing) 了解匹配优先级。

## <a id="access-control"></a> 访问控制

Buzz 采用两种独立的控制：

- **要求提及**：仅当机器人被提及（@）时，代理才会响应。
- **发送者访问权限**：允许经过批准房间中的所有当前成员，禁用房间进入，或者进一步将房间成员限制为选定的 Buzz 公钥。

全新的引导设置允许来自所选房间的当前成员的正常消息。 OpenClaw 在接受消息之前加载 Buzz 的中继签名房间名册，在排队之前检查成员身份，并在异步准入之后再次检查成员身份，并跟踪实时中继签名名册更新，包括角色更改。删除操作会立即使排队的消息失效。取消的入场不会按处理方式提交。有界快照刷新确认成员资格更改通知。成员资格不需要每条消息中继查询或网关轮询。删除发件人不会取消该发件人已允许的房间轮流。失去机器人自己的机器人角色或停止其连接仍然会限制输出。

启动和重新连接会恢复过去 24 小时内符合条件的消息，但绝不会恢复此 Buzz 帐户首次激活该聊天室之前的消息。该激活层在重新启动后仍然有效。发件人提供的时间戳不会提前。重播重复数据删除可防止已完成的消息再次运行。

当只有特定房间成员应该能够激活代理时，在手动配置中将 `groupPolicy: "allowlist"` 与 `groupAllowFrom` 结合使用。每个房间都可以覆盖 `groupPolicy`、`groupAllowFrom` 或两者。省略的房间设置会继承帐户范围的值。当其有效策略为 `"allowlist"` 时，明确的空房间允许列表会拒绝每个发件人。仅当这些成员使用的 Buzz 客户端可以解决机器人身份时，才设置 `requireMention: true`。

将 `requireMentionInBotThreads: false` 设置在房间中，以接受该 Buzz 机器人启动的线程中未提及的回复，同时保留其他地方所需的提及：

```json5
{
  channels: {
    buzz: {
      groups: {
        "7c4a6d2a-2ed9-4b4e-a5e2-4d705ee9b34c": {
          requireMention: true,
          requireMentionInBotThreads: false,
        },
      },
    },
  },
}
```

对于指定帐户，请使用 `channels.buzz.accounts.<id>.groups.<roomId>`。将选项设置为 `true` 需要在机器人启动的线程中提及，即使房间接受未提及的消息。省略它会保留房间当前的提及政策。发件人限制和命令授权保持不变。

OpenClaw 验证根消息的签名、作者、房间以及是否缺少父线程。机器人在其他人的线程中回复并不会使该线程归机器人所有。通过现有的认证中继查询丢失的根；已验证的根会被缓存以供连接使用。如果无法验证所有权，则适用客房的正常提及政策。

这些控件决定谁可以启动代理运行。它们不限制路由代理在接受消息后可以执行的操作。将房间消息视为不受信任的输入，并为房间的信任级别配置该代理的 [ 沙箱和工具策略 ](/gateway/sandbox-vs-tool-policy-vs-elevated)。

### <a id="bot-conversations"></a> Bot 对话

具有中继分配的 **Bot** 角色的授权聊天室成员可以在相同的提及和发件人规则下激活代理。在每个网关内，OpenClaw 限制同一中继和房间中每个机器人对之间的重复交换：默认预算是 60 秒内接受 20 条消息，随后有 60 秒的冷却时间。更改线程不会重置预算。重新启动网关会清除此内存预算。不同的网关有不同的预算。人工消息不受影响，并且会在不启动代理运行的情况下记录受抑制的机器人轮次。

使用共享的 `channels.defaults.botLoopProtection` 设置来调整 `maxEventsPerWindow`、`windowSeconds` 或 `cooldownSeconds`。设置 `enabled: false` 将禁用此保护。机器人分类来自最新收到的中继签名房间名册，而不是显示名称或消息内容。如果授权机器人在繁忙的交换期间停止回复，请检查抑制日志并让冷却时间到期，然后再调整预算。

### <a id="passive-room-context"></a> 被动式房间环境

将 `channels.buzz.historyLimit` 设置为从 `1` 到 `20` 的数字，以在同一房间和线程中包含最近未提及的消息以及下一个接受的轮次（提及或授权命令）。默认值为 `0`（关闭）。新的回复线程不会导入顶级房间历史记录。发件人访问权限仍然适用：被拒绝的发件人永远不会被记录，并且不再包含在当前房间名册中的发件人会在包含上下文之前被删除。

被动消息不会启动代理运行、记录会话或发送键入内容。当前连接的历史记录保留在内存中，分别针对每个房间和线程，并在重新连接或重新启动时清除。每条消息被截断为 512 UTF-8 字节。最新的完整条目适合 1,024 字节的渲染上下文预算，包括标签和标记。较旧的条目将被丢弃。接受的回合会消耗其上下文，而不删除回复运行时到达的消息。

使用上下文时，将根据最新收到的名册检查成员资格。如果同一身份在此之前离开并重新加入，则其先前授权的消息可以保留在窗口中。离开并不会删除对话历史记录。

### <a id="reply-placement"></a> 回复放置

Buzz 默认保留自动回复线程 （`channels.buzz.replyToMode: "all"`）。设置 `replyToMode: "off"` 在房间顶层发送自动回复，包括对现有线程内消息的回复。打字指示器遵循相同的位置，包括心跳打字。

这仅更改传递：入站线程上下文和会话标识保持不变。使用线程或回复目标发送的显式消息工具或 CLI 仍然遵循该目标。要恢复默认值，请使用 `"all"` 或删除该设置。

## <a id="manual-configuration"></a> 手动配置

建议使用引导式设置。等效配置如下：

```json5
{
  channels: {
    buzz: {
      name: "OpenClaw",
      relayUrl: "wss://buzz.example.com",
      privateKey: "nsec1...",
      groupPolicy: "open",
      groups: {
        "7c4a6d2a-2ed9-4b4e-a5e2-4d705ee9b34c": {
          requireMention: false,
        },
      },
      defaultTo: "7c4a6d2a-2ed9-4b4e-a5e2-4d705ee9b34c",
    },
  },
}
```

对于更严格的发送者策略：

```json5
{
  channels: {
    buzz: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["<64_CHARACTER_HEX_SENDER_PUBLIC_KEY>"],
    },
  },
}
```

要限制一个房间，同时保持其他配置的房间打开：

```json5
{
  channels: {
    buzz: {
      groupPolicy: "open",
      groups: {
        "7c4a6d2a-2ed9-4b4e-a5e2-4d705ee9b34c": {
          groupPolicy: "allowlist",
          groupAllowFrom: ["<64_CHARACTER_HEX_SENDER_PUBLIC_KEY>"],
        },
      },
    },
  },
}
```

房间 UUID 直接识别目标。使用发现过程中显示的 UUID 或向房间管理员索取。唯一的当前房间名称可以通过实时目录解析，但自动化应使用 `buzz:<ROOM_UUID>` 以避免歧义。

对于手动配置，`groupAllowFrom` 条目必须使用 64 个字符的十六进制格式。

### <a id="reply-prefix"></a> 回复前缀

将 `channels.buzz.responsePrefix` 设置为自动代理回复的前缀，例如 `"[Support]"`。使用 `"auto"` 作为路由代理的身份名称，使用 `"[{model}]"` 作为其选定的模型，或使用 `""` 来禁用继承的全局前缀。显式 `message` 工具和 CLI 文本发送也应用文字和身份前缀。有关与模型相关的模板，请参阅 [ 共享前缀行为 ](/concepts/messages#prefixes-threading-and-replies)。指定帐户可以使用 `channels.buzz.accounts.<id>.responsePrefix` 覆盖根前缀。 CLI 发送省略 `--account` 也使用所选默认帐户的前缀。账户级 `""` 抑制继承的根前缀。

### <a id="multiple-bot-identities"></a> 多个机器人身份

一个网关可以运行独立的 Buzz 帐户，每个帐户都有自己的中继、机器人密钥、`authTag` 和选定的房间。运行 `openclaw channels add --channel buzz` 并选择一个新帐户以交互方式进行配置。添加命名帐户不会移动或替换现有的根身份。

```json5
{
  channels: {
    buzz: {
      relayUrl: "wss://buzz.example.com",
      privateKey: { source: "env", provider: "default", id: "BUZZ_ROOT_KEY" },
      groupPolicy: "allowlist",
      groups: { "7c4a6d2a-2ed9-4b4e-a5e2-4d705ee9b34c": {} },
      accounts: {
        ada: {
          name: "Ada",
          relayUrl: "wss://buzz.example.com",
          privateKey: { source: "env", provider: "default", id: "BUZZ_ADA_KEY" },
          groups: { "940d0c32-4eb7-46d7-9d5b-d975aaef87f7": {} },
        },
      },
    },
  },
}
```

指定帐户继承根策略和传递设置，但永远不会继承根 `name`、`relayUrl`、`privateKey`、`authTag`、`groups` 或 `defaultTo`。在每个帐户上设置这些身份和房间字段。显式的 `accounts.default` 也拥有完整的身份并替换隐式的根身份。它不借用 root 凭据或 `BUZZ_*` 环境变量。

设置`defaultAccount`以选择命令省略`--account`时使用的帐户。否则，首选隐式 root/default 身份，然后是按排序顺序配置的第一个帐户。帐号密钥由小写字母、数字、连字符、下划线组成，以字母或数字开头，长度不超过64个字符。 `constructor` 和 `prototype` 保留。

将 `--account ada` 与消息和目录命令结合使用，并在将该机器人路由到代理时将 `accountId: "ada"` 添加到绑定的 `match` 对象。设置 `channels.buzz.accounts.ada.enabled: false` 以仅禁用 Ada。 `channels.buzz.enabled: false` 禁用所有 Buzz 帐户。 Buzz 尚不支持通过 `channels remove` 禁用或删除帐户。

编辑现有的指定帐户只会重新加载该帐户，从而保持健康的同级帐户连接。对共享 Buzz 设置、`accounts.default` 的更改或删除的帐户会重新加载整个频道。在开始替换之前，帐户关闭会等待已接受的消息工作和挂起的配置文件同步。

### <a id="bot-key-storage"></a> Bot 密钥存储

默认引导路径重用当前机器人身份或生成私钥并将其存储在所选帐户的 `privateKey` 中，遵循 OpenClaw 的当前明文配置约定。

对于现有密钥，安装程序可以使用明文或现有的 `env`、`file` 或 `exec` SecretRef。有关提供程序设置，请参阅 [ 机密管理](/gateway/secrets)。隐式根默认身份也可以读取：

```bash
export BUZZ_RELAY_URL="wss://buzz.example.com"
export BUZZ_PRIVATE_KEY="nsec1..."
```

设置 `BUZZ_PRIVATE_KEY` 后，非交互式设置还可以保存帐户名：

```bash
openclaw channels add --channel buzz --name "Support bot" \
  --relay-url wss://buzz.example.com --use-env
```

省略 `--name` 或提供空白名称将保留现有名称。此命令保存凭据和设置。在启动新机器人之前，使用引导设置来发现和选择房间。

`authTag` 是托管工作区操作员为一个身份颁发的委派授权值。设置运营商为您提供的所选身份 `authTag` 的值。隐式根身份使用 `channels.buzz.authTag`，并且可以回退到 `BUZZ_AUTH_TAG`。嵌套身份（包括 `accounts.default`）使用 `channels.buzz.accounts.<id>.authTag` 并且从不借用该环境回退。该字段接受与私钥相同的明文或 SecretRef 形式。将这个委托的、可重用的值视为秘密：将其排除在日志、屏幕截图、聊天和源代码控制之外，并且更喜欢使用 SecretRef 进行持久部署。每当机器人身份或中继授权发生变化，或者任一凭证可能已暴露时，请求替换并撤销旧值。

自托管运营方可以手动生成密钥用于恢复或高级设置：

```bash
buzz-admin generate-key
```

## <a id="verify-the-connection"></a> 验证连接

运行经过身份验证的通道检查：

```bash
openclaw channels status --channel buzz --probe
```

成功的检查确认机器人可以进行身份​​验证，并且 Buzz 使用 **Bot** 角色报告所选房间。

然后发送一条真实消息：

```bash
openclaw message send \
  --channel buzz \
  --target buzz:<ROOM_UUID> \
  --message "OpenClaw Buzz test"
```

要完成一次完整的往返测试，请让一个被允许的 Buzz 用户提及机器人，并确认 OpenClaw 会在房间中回复。

### <a id="qa-lab-round-trip"></a> QA 实验室往返测试

源代码检出可以使用两个专用测试身份来测试生产环境的 Buzz 通道路径：

```bash
pnpm openclaw qa buzz \
  --credential-file /secure/path/buzz-qa-credentials.json \
  --provider-mode mock-openai
```

该命令在使用固定响应模拟模型时运行真正的中继金丝雀和提及门控检查。私有 JSON 凭证文件包含 `relayUrl`、`roomId`、`driverPrivateKey` 和 `sutPrivateKey`，以及闭合继电器的可选 `driverAuthTag` 和 `sutAuthTag` 值。两个测试公钥都必须是房间成员，并且 SUT 公钥必须具有 **Bot** 角色。封闭中继可能需要分别注册两个公钥。使用 `--credential-source convex` 作为池 QA 凭证。

使用 `wss://` 进行托管中继。仅环回开发中继接受明文 `ws://` 凭证 URL。

切勿使用人类所有者或管理员私钥。私钥和可选的 `authTag` 值是父级harness机密，不得出现在日志、工件、屏幕截图、shell 历史记录或源代码管理中。

## <a id="rotate-the-bot-identity"></a> 轮换机器人身份

机器人身份轮换需要管理员批准新的公钥：

1. 生成一个新的专用机器人身份。
2. 让管理员为中继和每个已配置的房间批准其公钥。
3. 替换配置的私钥并验证 [hot reload](/gateway/configuration/hot-reload) 应用更改。如果密钥来自更改的服务环境，请重新启动网关。
4. 测试出站和入站消息。
5. 从房间和中继中移除旧公钥。

在切换密钥之前完成批准，以尽量减少停机时间。轮换目前不是自动的。

## <a id="current-limits-and-roadmap"></a> 当前限制和路线图

以下后续功能已列入计划，但不属于当前插件的一部分：

- 直接消息
- 媒体和文件上传或下载
- 原生表情回应
- 从 OpenClaw 创建或管理房间
- 自动中继成员资格和房间角色审批
- 引导式机器人身份轮换。

## <a id="troubleshooting"></a> 故障排查

| 症状                                      | 需要检查的内容                                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 未发现任何房间                      | 确认这个确切的 bot 公钥已在房间中并具有 **Bot** 角色，然后重新运行相同的设置命令。   |
| 身份验证失败                         | 检查中继 URL、机器人私钥、封闭中继成员资格以及运营商提供的任何 `authTag`。   |
| 无法发送消息                     | 确认 bot 是房间成员并具有 **Bot** 角色，并且 UUID 已配置。                      |
| bot 收到消息但不回复 | 确认发送者仍然是房间成员，然后检查可选的发送者允许列表和提及要求。 |
| 设置提示 Gateway 未运行        | 使用 `openclaw gateway` 启动它，然后运行 `openclaw channels status --probe`。                               |
| 自动房间发现过期             | 授予 Bot 角色，然后选择重试；相同的身份将保持激活。                                     |

## <a id="related"></a> 相关内容

- [频道概览](/channels)
- [频道访问控制](/channels/groups)
- [密钥管理](/gateway/secrets)
- [通道故障排除](/channels/troubleshooting)
