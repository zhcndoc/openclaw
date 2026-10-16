---
summary: "入站消息授权的实验性通道入口 API"
read_when:
  - "构建或迁移消息通道插件"
  - "修改 DM 或群组允许名单、路由闸门、命令授权、事件授权或提及激活"
  - "审查通道入口脱敏或 SDK 兼容性边界"
title: "通道入口 API"
sidebarTitle: "通道入口"
---

通道入口是入站通道事件的实验性访问控制边界。插件拥有平台事实和副作用；核心拥有通用策略：DM/group 允许列表、配对存储 DM 条目、路由门、命令门、事件身份验证、提及激活、编辑诊断和准入。

使用 `runtime.channel.inbound.ingress` 作为接收路径。从 `openclaw/plugin-sdk/channel-ingress-runtime` 导入身份和策略实用程序。

## <a id="runtime-resolver"></a> 运行时解析器

在此示例中，`cfg` 是根 OpenClaw 配置，`config` 是已解析的通道帐户配置。提供 `runtime`、`normalizePlatformUserId`、`route`、`agentRoute`、`readStoreAllowFrom` 以及插件接收路径中的消息事实。

```ts
import { defineStableChannelIngressIdentity } from "openclaw/plugin-sdk/channel-ingress-runtime";

const identity = defineStableChannelIngressIdentity({
  key: "platform-user-id",
  normalize: normalizePlatformUserId,
  sensitivity: "pii",
});

const result = await runtime.channel.inbound.ingress.resolve({
  channelId: "my-channel",
  accountId,
  identity,
  subject: { stableId: platformUserId },
  conversation: { kind: isGroup ? "group" : "direct", id: conversationId },
  contextBinding: {
    agentId: agentRoute.agentId,
    sessionKey: agentRoute.sessionKey,
    messageId,
    inboundEventKind: "user_request",
  },
  event: { kind: "message", authMode: "inbound", mayPair: !isGroup },
  policy: {
    dmPolicy: config.dmPolicy,
    groupPolicy: config.groupPolicy,
    groupAllowFromFallbackToAllowFrom: true,
  },
  allowFrom: config.allowFrom,
  groupAllowFrom: config.groupAllowFrom,
  accessGroups: cfg.accessGroups,
  route,
  readStoreAllowFrom,
  command: hasControlCommand ? { allowTextCommands: true, hasControlCommand } : undefined,
});

const ctx = runtime.channel.inbound.buildContext({
  // Pass the exact host result; do not rebuild participant evidence from
  // SenderId, From, session keys, routes, rooms, or message metadata.
  channelIngress: result,
  // ...normalized channel facts
});
```

不要预先计算有效允许列表、命令所有者或命令组。 解析器会从原始允许列表、存储回调、路由描述符、访问组、策略和会话类型中推导它们。

运行时公开 `createResolver`、`resolve` 和 `resolveStable`，其输入与独立的 SDK 帮助程序相同。其解析器和 `buildContext` 共享一个主机实例和插件生命周期。在同一运行时使用两者；另一个网关或替换插件无法兑换结果。

独立的 `resolveChannelMessageIngress`、`resolveStableChannelMessageIngress` 和 `createChannelIngressResolver` 帮助程序保留 OpenClaw 2026.9.5. 中记录的接收路径契约。在受信任的活动通道插件的主机管理回调中，它们委托给该插件实例的注册运行时，在结果进入其实例时保留参与者属性`buildContext`。注册期间创建的工厂保留其创建实例；从另一个插件调用它不会借用该插件的权限。不合格的电话仍然仅限于政策。退役的实例和陈旧或不匹配的切换无法附加可信身份。新的接收路径应该使用上面的显式运行时方法；现有的独立调用者仍受支持。

对于将进入主机上下文的结果，请在通道的路由所有者选择最终代理和会话后进行解析。 `contextBinding` 使用最终主机上下文消息 ID（在任何回复 ID 映射之后）和入站事件类型冻结这些事实。将 `contextBinding.nativeChannelId` 设置为主机上下文的 `reply.nativeChannelId ?? conversation.nativeChannelId`，即使它等于会话的 `id`。仅决策检查可能会省略绑定，但这样的结果不是有效的执行来源，并且不得作为 `channelIngress` 传递。当通道批量处理多个已承认的消息时，按源顺序传递它们的确切结果；最终的上下文消息 ID 标识最后的源结果。

### <a id="product-participant-identity"></a> 产品参与者身份

身份描述符可以提供 `resolveParticipant(subject)`，仅当插件可以证明这些远程事实时才返回 `{ domain, idKind, id }`。该域属于远程服务：例如，Slack 工作区或应用程序范围的身份颁发者。不是OpenClaw的本地`accountId`。当服务赋予用户 ID、机器人 ID 和代理身份不同的含义时，请保持它们不同。名称和成功的网关配置文件查找并不是身份证据。

通过主机注入的上下文构建器传递准确的解析器结果。主机私下携带产品事实，直到接受的输入被记录在会话参与者聚合中。原始产品标识不会添加到公共诊断结果中。不合格的生产者保留未解决的观察结果，而不是成为网关配置文件或发明的远程主题。产品参与并不授予访问权限。

该产品路径独立于执行身份审核收集：它既不启用该收集，也不重用其 HMAC 引用或不透明的诊断载体。审计的单独证据合同如下所述。

## <a id="result"></a> 结果

打包插件应直接消费现代投影：

| 字段              | 含义                                                            |
| ------------------ | ------------------------------------------------------------------ |
| `ingress`          | 排序后的门禁决策和准入                                |
| `senderAccess`     | sender/conversation 仅限授权                             |
| `routeAccess`      | 路由和路由-发送者投影                                  |
| `commandAccess`    | 命令授权；当没有运行命令门禁时 `requested: false` |
| `activationAccess` | mention/activation 结果                                          |

事件授权仍可在排序后的 `ingress.graph` 和决定性的 `ingress.reasonCode` 上获取；不会发出单独的事件投影。

已弃用的第三方 SDK 帮助程序可能会在内部重建旧形状。新的捆绑接收路径不应将现代结果转换回本地 DTO。

当启用执行身份审计收集时，受信任的活动本机插件是其远程参与者事实的权威进程内生产者。主机注入的注册运行时将解析器结果绑定到确切的插件记录和注册表生命周期时期，然后在一次性上下文切换期间验证其完整的可用对话、路由、代理、会话、消息、事件和参与者范围。公共独立构建者仍然不具有权威性，无法铸造参与者证据。仅当每个贡献都有同一参与者的有效证据时，队列收集才会保留归属；混合、缺失、陈旧或未铸造的证据是 `unknown`。载体是不透明的、有界的、一次性的且仅供诊断。插件无法从呼叫者选择的发件人、帐户、房间、路线、会话、消息或传输字段中创建参与者证据。 SDK 故意不公开任何记录、纪元、所有者能力、参与者证据构造者或证据复制者。结构相似的结果、过时的记录、重用的结果或范围更改的上下文不会获得主机权限。

`boundary-verified` 表示核心验证了参与者事实跨越了这个受信任的活动注册本机插件边界，并具有准确的记录、纪元、范围和一次性切换。这并不意味着核心独立查询远程服务；只有通道插件可以观察该传输事实。

审计状态是不同的：

- **supported**：权威入口解析器运行。其确切结果可以产生当前调用者和强制覆盖或仅归因覆盖。
- **unknown**：支持的切换丢失、陈旧、伪造、重用、混合或以其他方式失败的主机验证。未知绝不意味着允许。
- **unsupported**：命名路径没有权威的入口解析器集成，并显式传递 `channelIngress: "unsupported"`。不支持绝不意味着允许，也不是不完整接线的捷径。

## <a id="identifier-authentication"></a> 身份验证

`IdentifierAuthentication` 将标识符声明分级为 `verified`、`asserted`、`unverified` 或 `mutable`，从最强到最弱。它只是通道授权的输入。它不是委托人、赠款、关系或执行身份保证强度。特别是，`verified` 的标识符声明永远不会成为执行保证 `boundary-verified` 或 `cryptographic`。

从 `openclaw/plugin-sdk/channel-ingress-runtime` 导入类型和 `meetsIdentifierAuthentication(actual, minimum)`。下游身份验证映射器应使用此布尔比较器，而不是维护自己的排名表。

其含义是规范的：

- `verified`：拥有的可信传输或会话边界将此确切标识符绑定到此发送者。
- `asserted`：为发送者提供可信边界，无需绑定此确切标识符。
- `unverified`：标识符准确稳定，但声称的所有权未得到证明。
- `mutable`：标识符是可更改或共享的别名，例如显示名称。

仅从所属边界控制的传输或会话元数据声明 `verified`。发送者控制的内容、模型输入、普通消息上下文、路由元数据和主机准入载体的完整性不建立它。

内核保留了匹配的主题标识符对的精确编辑允许列表条目。它通过采用该确切对的较弱声明来组合条目声明和主题声明，然后将其与 `minIdentifierAuthentication` 进行比较。同类标识符仍然不同，因此弱辅助电子邮件不会削弱单独匹配的已验证电子邮件。

提供每条消息 `authentication` 映射的主题必须声明它想要计数的每个字段。提供的映射中缺少的字段将被视为 `unverified`，即使其身份描述符声明了更强的静态声明。具有静态强度的通道完全忽略贴图。

从安全适配器的 `resolveDmPolicy` 结果中公开 `classifyEntryAuthentication: identityEntryAuthenticationClassifier(identity)`，从 `openclaw/plugin-sdk/channel-ingress-runtime` 导入帮助程序。它使用身份描述符的条目规范化器并返回接受字段中最强的静态声明，或者当没有人接受条目时返回`undefined`；通配符条目被排除。 [安全审计](/gateway/security/audit-checks)对仅依赖于可变标识符的已配置`allowFrom`条目进行计数：它在禁用名称匹配时发出警告，并在启用时预览有多少条目在禁用后将停止授权。结果包含计数和配置路径，而不是原始条目；配对商店批准不在此检查范围内。符号 `accessGroup:` 引用单独解析成员资格，并且不计为可变标识符。

现有插件在弃用窗口期间保持源代码兼容：

| 已弃用的字段                                   | 精确测绘                        |
| -------------------------------------------------- | ------------------------------------ |
| `dangerous: true`                                  | `authentication: "mutable"`          |
| `dangerous: false`或省略                      | 默认`authentication: "asserted"` |
| `mutableIdentifierMatching: "enabled"`             | 最小`mutable`                    |
| `mutableIdentifierMatching: "disabled"`或省略 | 默认最小值 `asserted`           |

显式 `authentication` 或 `minIdentifierAuthentication` 优先。已弃用的字段将保留到捆绑和已知外部插件迁移后单独宣布的普通稳定删除版本为止。

### <a id="bundled-channel-declarations"></a> 捆绑渠道声明

捆绑通道使用共享身份声明的每个接收路径支持的最强声明。这些是通道授权声明，而不是执行身份保证：

| 渠道         | 标识符声明                                                                        | 权威传输或会话事实                                                                                                                                                                 |
| --------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discord         | 网关用户ID：`verified`； PluralKit 会员ID：`asserted`；名称和标签：`mutable` | Discord 在通过经过身份验证的机器人令牌网关会话传递的事件上提供 `author.id` 或 `user.id`。 PluralKit 成员 ID 来自其经过身份验证的 API 响应，而不是 Discord 网关。 |
| Google Chat     | `sender.name`： `verified`；邮箱：`mutable`                                             | Webhook 在使用 Google-owned 事件主体之前验证 Google 的签名令牌、发行者和配置的受众。                                                                              |
| IRC             | 服务器连接前缀和`user@host`：`asserted`；基于昵称的别名：`mutable`     | 所选的 IRC 服务器保证连接前缀，但通用传输不证明帐户所有权。                                                                                  |
| Mattermost      | 帖子用户ID：`verified`；用户名：`mutable`                                           | 经过身份验证的 Mattermost WebSocket 发出服务器拥有的发布事件，其 `post.user_id` 标识作者。                                                                                       |
| Microsoft Teams | 发件人和对话 ID：`asserted`；发件人姓名：`mutable`                         | Bot Framework 对连接器活动进行身份验证，但插件不会独立证明每个 ID 表示的确切所有权。                                                             |
| Slack           | 用户和工作区用户 ID：`asserted`；名称和别名：`mutable`                     | 直接 Slack 传送绑定用户 ID，而中继模式则对中继对等点进行身份验证，而无需端到端的确切发送者证明。共享声明使用了可辩护的共同主张。            |

如果接收路径无法支持其通道共享的声明，请拆分该声明或提供较弱的每消息声明。切勿从消息文本、路由或主机证据载体完整性中推断出更强的主张。

## <a id="access-groups"></a> 访问组

`accessGroup:<name>` 条目保持编辑状态。核心自行解析静态 `message.senders` 组，并仅针对需要平台查找的动态组调用 `resolveAccessGroupMembership`。丢失、不受支持和失败的组会拒绝访问。

## <a id="event-modes"></a> 事件模式

| `authMode`       | 含义                                          |
| ---------------- | ------------------------------------------------ |
| `inbound`        | 常规入站发送者闸门                      |
| `command`        | 回调或作用域按钮的命令闸门    |
| `origin-subject` | 操作主体必须匹配原始消息主体    |
| `route-only`     | 仅用于路由作用域可信事件的路由闸门 |
| `none`           | 插件拥有的内部事件绕过共享授权  |

对 reactions、按钮、回调和原生命令使用 `mayPair: false`。

## <a id="routes-and-activation"></a> 路由和激活

对房间、主题、公会、线程或嵌套路由策略使用路由描述符：

```ts
route: {
  id: "room",
  allowed: roomAllowed,
  enabled: roomEnabled,
  senderPolicy: "replace",
  senderAllowFrom: roomAllowFrom,
  blockReason: "room_sender_not_allowlisted",
}
```

当插件具有多个可选路由描述符时，使用 `channelIngressRoutes(...)`；它会在保持路由事实通用且按每个描述符的 `precedence` 顺序排列的同时，过滤掉已禁用的分支。

提及门控是一个激活门。提及未命中会返回 `admission: "skip"`，因此回合内核不会处理仅观察回合。大多数通道应在发送器和命令门之后保持激活状态。当禁用文本命令旁路时，公共聊天界面必须先安静未提及的流量，然后发件人白名单噪音才能选择加入 `activation.order: "before-sender"`。具有隐式激活的通道（例如机器人线程中的回复）会解析 `channels.defaults.implicitMentions` 以及 `resolveChannelImplicitMentions(...)` 的通道和帐户覆盖，然后将结果作为 `activation.implicitMentions` 传递。预计的 `activationAccess.shouldBypassMention` 报告命令或隐式激活何时绕过显式提及。

## <a id="redaction"></a> 脱敏

原始发件人值和原始白名单条目仅是解析程序输入。它们不得出现在已解决的状态、决策、诊断、快照或兼容性事实中。使用不透明的主题 ID、条目 ID、路线 ID 和诊断 ID。

## <a id="verification"></a> 验证

```bash
pnpm test src/channels/message-access/message-access.test.ts src/plugin-sdk/channel-ingress-runtime.test.ts
pnpm plugin-sdk:api:diff --base "$(git merge-base origin/main HEAD)" --head HEAD
```

## <a id="related"></a> 相关内容

- [Channel 入站 API](/plugins/sdk-channel-inbound) — 将此解析器结果用作 `channelIngress` 的接收路径
- [Channel 出站 API](/plugins/sdk-channel-outbound) — 同一通道插件的发送端
- [构建通道插件](/plugins/sdk-channel-plugins) — 完整通道插件演练
