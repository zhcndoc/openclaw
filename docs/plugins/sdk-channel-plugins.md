---
summary: "为 OpenClaw 构建消息通道插件的分步指南"
title: "构建通道插件"
sidebarTitle: "通道插件"
read_when:
  - 你正在构建一个新的消息通道插件
  - 你想将 OpenClaw 连接到某个消息平台
  - 你需要理解 ChannelPlugin 适配器表面
---

本指南将构建一个通道插件，用于将 OpenClaw 连接到一个消息平台：DM 安全性、配对、回复线程以及出站消息。

<Info>
  对 OpenClaw 插件还不熟悉？请先阅读 [Getting Started](/plugins/building-plugins)
  以了解包结构和清单设置。
</Info>

## 你的插件负责什么

频道插件不实现 send/edit/react 工具；核心提供一个
共享的 `message` 工具。你的插件负责：

- **配置** - 账号解析和设置向导
- **安全** - DM 策略和允许名单
- **配对** - DM 批准流程
- **会话语法** - 提供方特定的会话 id 如何映射到基础
  聊天、线程 id 和父级回退
- **出站** - 向平台发送文本、媒体和投票
- **线程化** - 回复如何进行线程化
- **心跳输入中** - 可选的输入中/忙碌信号，用于心跳投递
  目标

核心负责共享消息工具、提示词接线、外层会话键形状、
通用的 `:thread:` 记账以及分发。

## Message 适配器

使用 `openclaw/plugin-sdk/channel-outbound` 中的 `defineChannelMessageAdapter` 暴露一个 `message` 适配器。只声明你的原生传输实际支持的、可持久化的最终发送能力，并通过一个契约测试来证明原生副作用和返回的收据。文本/媒体发送应指向与旧版 `outbound` 适配器相同的传输函数。完整的 API 契约、能力矩阵、收据规则、实时预览定稿、接收确认策略、测试和迁移表，请参见
[Channel outbound API](/plugins/sdk-channel-outbound)。

如果你现有的 `outbound` 适配器已经具备正确的发送方法和能力元数据，则应使用 `createChannelMessageAdapterFromOutbound(...)` 派生 `message` 适配器，而不是手写另一层桥接。适配器发送会返回 `MessageReceipt` 值。对于旧版 id，请使用 `listMessageReceiptPlatformIds(...)` 或 `resolveMessageReceiptPrimaryId(...)` 派生它们，而不是继续维护并行的 `messageIds` 字段。

精确声明 live 和 finalizer 能力——core 会据此判断一个 channel 能做什么，而声明与实际行为之间的偏差会被视为契约测试失败：

| Surface                               | Values                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `message.live.capabilities`           | `draftPreview`, `previewFinalization`, `progressUpdates`, `nativeStreaming`, `quietFinalization` |
| `message.live.finalizer.capabilities` | `finalEdit`, `normalFallback`, `discardPending`, `previewReceipt`, `retainOnAmbiguousFailure`    |

会就地完成草稿预览定稿的 channels 应通过 `defineFinalizableLivePreviewAdapter(...)` 和 `deliverWithFinalizableLivePreviewAdapter(...)` 来承载运行时逻辑，并使用 `verifyChannelMessageLiveCapabilityAdapterProofs(...)` 与 `verifyChannelMessageLiveFinalizerProofs(...)` 测试来保持声明的能力有据可依，这样原生预览、进度、编辑、回退/保留、清理和收据行为就不会悄然偏离。

延迟平台确认的 inbound receivers 应声明 `message.receive.defaultAckPolicy` 和 `supportedAckPolicies`，而不是把确认时机隐藏在 monitor 本地状态中。用 `verifyChannelMessageReceiveAckPolicyAdapterProofs(...)` 覆盖每一种已声明的策略。

像 `createChannelTurnReplyPipeline`、`dispatchInboundReplyWithBase` 和 `recordInboundSessionAndDispatchReply` 这样的旧版回复辅助工具，仍然可用于兼容性派发器。不要把它们用于新的 channel 代码；新代码应从 `openclaw/plugin-sdk/channel-outbound` 的 `message` 适配器、收据以及 receive/send 生命周期辅助工具开始。

### Inbound ingress（实验性）

正在迁移 inbound 授权的 channels 可以在运行时接收路径中使用实验性的 `openclaw/plugin-sdk/channel-ingress-runtime` 子路径。它接受平台事实、原始 allowlist、route 描述符、command 事实以及 access group 配置，然后返回 sender/route/command/activation 投影以及有序的 ingress 图，而平台查找和副作用仍留在插件中。请将插件身份规范化保留在你传给 resolver 的描述符里；不要把已解析状态或决策中的原始匹配值序列化出来。有关 API 设计、所有权边界和测试预期，请参见
[Channel ingress API](/plugins/sdk-channel-ingress)。较旧的 `openclaw/plugin-sdk/channel-ingress` 子路径仍作为第三方插件的已弃用兼容外观导出。

### Typing indicators

如果你的 channel 在 inbound 回复之外支持 typing 指示器，请在 channel 插件上暴露 `heartbeat.sendTyping(...)`。core 会在 heartbeat 模型运行开始前，使用已解析的 heartbeat 投递目标调用它，并使用共享的 typing keepalive/cleanup 生命周期。当平台需要显式停止信号时，再添加 `heartbeat.clearTyping(...)`。

### Media source params

如果你的 channel 为消息工具参数添加了媒体来源，请通过 `plugin.actions.describeMessageTool(...).mediaSourceParams` 暴露这些参数名。core 会使用这个显式列表进行 sandbox 路径规范化和 outbound 媒体访问策略，因此插件不需要为特定 provider 的头像、附件或封面图参数添加 shared-core 特例。

建议使用按 action 键控的映射，例如 `{ "set-profile": ["avatarUrl", "avatarPath"] }`，这样无关的 actions 就不会继承另一个 action 的媒体参数。若这些参数本来就是要在所有暴露的 actions 中共享，扁平数组仍然可用。

必须为平台侧媒体拉取暴露临时公开 URL 的 channels，可以使用 `openclaw/plugin-sdk/outbound-media` 中的 `createHostedOutboundMediaStore(...)` 和 plugin state stores。把平台路由解析和 token 强制校验留在 channel 插件里；共享 helper 只负责媒体加载、过期元数据、分块行以及清理。

### Native payload shaping

如果你的 channel 需要对 `message(action="send")` 做 provider 特定的 shaping，优先使用 `actions.prepareSendPayload(...)`。把 native cards、blocks、embeds 或其他持久化数据放在 `payload.channelData.<channel>` 下，并让 core 通过 outbound/message 适配器发送。仅将 `actions.handleAction(...)` 用作无法序列化和重试的 payload 的兼容性回退方案。

### Session conversation grammar

如果你的平台把额外作用域存储在 conversation id 中，请使用 `messaging.resolveSessionConversation(...)` 将解析逻辑保留在插件内。这是将 `rawId` 映射到基础 conversation id、可选 thread id、显式 `baseConversationId` 以及任何 `parentConversationCandidates` 的规范 hook。当你返回 `parentConversationCandidates` 时，请按从最窄的 parent 到最宽/base conversation 的顺序排列。

`messaging.resolveParentConversationCandidates(...)` 是一个已弃用的兼容性回退方案，适用于只需要在通用/raw id 之上提供 parent 回退的插件。如果两个 hook 都存在，core 会先使用 `resolveSessionConversation(...).parentConversationCandidates`，只有在规范 hook 未提供它们时才回退到 `resolveParentConversationCandidates(...)`。

需要在 channel registry 启动之前完成同样解析的捆绑插件，可以提供一个顶层 `session-key-api.ts` 文件，并导出匹配的 `resolveSessionConversation(...)`（参见 Feishu 和 Telegram 插件）。只有在运行时插件 registry 还不可用时，core 才会使用这个启动安全的 surface。

当插件代码需要规范化类似 route 的字段、比较子 thread 与其父 route，或从 `{ channel, to, accountId, threadId }` 构建稳定的去重 key 时，请使用 `openclaw/plugin-sdk/channel-route`。这个 helper 会像 core 一样规范化数字类型的 thread id，因此应优先于临时的 `String(threadId)` 比较。具有 provider 特定目标语法的插件应暴露 `messaging.resolveOutboundSessionRoute(...)`，以便 core 无需 parser shim 就能获取 provider 原生的 session 和 thread 身份。

### Account-scoped conversation binding support

当 channel 支持通用的当前会话绑定时，将 `conversationBindings.supportsCurrentConversationBinding` 设为 true。`createChatChannelPlugin(...)` 默认会将这个静态能力设为 `true`。

如果支持情况因已配置账号而异，还应实现 `conversationBindings.isCurrentConversationBindingSupported({ accountId })`。core 只有在静态能力启用后才会评估这个同步 hook。返回 `false` 会使该账号不可用通用的当前会话能力、bind、lookup、list、touch 和 unbind 操作。省略该 hook 则会把静态能力应用于每个账号。

请从已加载的账号配置或运行时状态中解析答案。这个 hook 只会对通用当前会话绑定进行门控；它不会替代已配置的绑定规则或插件拥有的会话路由。契约测试应至少覆盖一个支持账号和一个不支持账号，并通过 `openclaw/plugin-sdk/channel-core` 导出的 `ChannelPlugin["conversationBindings"]` 契约来验证。

## 审批和通道能力

大多数通道插件不需要审批专用代码。Core 负责同聊天室的
`/approve`、共享的审批按钮载荷以及通用的回退投递。
`ChannelPlugin.approvals` 已被移除；请改为将审批投递/原生/渲染/认证
相关事实放到一个 `approvalCapability` 对象上。`plugin.auth` 仅用于登录/登出——
core 不再从该对象读取审批认证钩子。

仅在需要原生审批路由或抑制回退时使用 `approvalCapability.delivery`，
仅在通道确实需要自定义审批载荷而不是共享渲染器时使用
`approvalCapability.render`。

### 审批认证

- `approvalCapability.authorizeActorAction` 和
  `approvalCapability.getActionAvailabilityState` 是规范的
  审批认证接口。
- 使用 `getActionAvailabilityState` 来获取同聊天室审批认证可用性。
  即使原生投递被禁用，也要让已配置的审批人在 `/approve` 中保持可用；
  交由原生启动面状态用于投递/设置指引。
- 如果你的通道暴露原生 exec 审批，在原生客户端状态与同聊天室
  审批认证不同时，使用 `approvalCapability.getExecInitiatingSurfaceState`
  作为启动面/原生客户端状态。Core 会使用这个 exec 专用钩子来区分
  `enabled` 与 `disabled`，判断启动通道是否支持原生 exec 审批，并将该通道
  纳入原生客户端回退指引中。
  `createApproverRestrictedNativeApprovalCapability(...)` 已为常见情况补足此项。
- 如果某个通道能够从现有配置中推断出稳定的、类似 owner 的 DM 身份，
  使用 `openclaw/plugin-sdk/approval-runtime` 中的
  `createResolvedApproverActionAuthAdapter` 来限制同聊天室 `/approve`，
  而无需增加审批专用的 core 逻辑。
- 如果自定义审批认证有意只允许同聊天室回退，从
  `openclaw/plugin-sdk/approval-auth-runtime` 返回
  `markImplicitSameChatApprovalAuthorization({ authorized: true })`；
  否则 core 会将结果视为显式的审批人授权。
- 如果由通道拥有的原生回调直接解析审批，在解析前使用
  `isImplicitSameChatApprovalAuthorization(...)`，这样隐式回退仍会经过通道的
 常规 actor 认证。

### 载荷生命周期与设置指引

- 当需要通道特定的载荷生命周期行为时，例如隐藏重复的本地审批提示，
  或在投递前发送 typing 指示器，使用 `outbound.shouldSuppressLocalPayloadPrompt`
  或 `outbound.beforeDeliverPayload`。
- 当通道希望 disabled 路径的回复能够解释启用原生 exec 审批所需的具体配置项时，
  使用 `approvalCapability.describeExecApprovalSetup`。该钩子接收
  `{ channel, channelLabel, accountId }`；带命名账户的通道应渲染账户范围路径，
  例如 `channels.<channel>.accounts.<id>.execApprovals.*`，而不是顶层默认项。
- 当插件审批失败指引在插件审批的 no-route 和超时失败场景中可以安全展示时，
  使用 `approvalCapability.describePluginApprovalSetup`。
  `createApproverRestrictedNativeApprovalCapability(...)` 不会从
  `describeExecApprovalSetup` 推断这一点；只有当插件审批和 exec 审批确实使用相同的原生设置时，
  才显式传入相同的 helper。

### 原生审批投递

如果一个通道需要原生审批投递，请让通道代码聚焦于目标规范化以及传输/呈现事实。
使用 `openclaw/plugin-sdk/approval-runtime` 中的
`createChannelExecApprovalProfile`、`createChannelNativeOriginTargetResolver`、
`createChannelApproverDmTargetResolver` 和
`createApproverRestrictedNativeApprovalCapability`。
把通道特定事实放在 `approvalCapability.nativeRuntime` 之后，最好通过
`createChannelApprovalNativeRuntimeAdapter(...)` 或
`createLazyChannelApprovalNativeRuntimeAdapter(...)` 来实现，这样 core 就可以组装
处理器，并负责请求过滤、路由、去重、过期、网关订阅以及“路由到别处”的通知。

`nativeRuntime` 被拆分为几个更小的接口：

- `availability` - 账户是否已配置，以及请求是否应被处理
- `presentation` - 将共享审批视图模型映射为 pending/resolved/expired 原生载荷或最终动作
- `transport` - 准备目标并发送/更新/删除原生审批消息
- `interactions` - 可选的原生按钮或 reaction 的 bind/unbind/clear-action 钩子，以及可选的 `cancelDelivered` 钩子。若 `deliverPending` 会注册进程内或持久化状态（例如 reaction 目标存储），请实现 `cancelDelivered`，以便在处理器停止且在 `bindPending` 执行前取消投递时，或者当 `bindPending` 返回空句柄时能够释放这些状态
- `observe` - 可选的投递诊断钩子

其他审批帮助器：

- 当通道同时支持 session-origin 原生投递和显式审批转发目标时，使用
  `openclaw/plugin-sdk/approval-native-runtime` 中的 `createNativeApprovalChannelRouteGates`。
  该帮助器集中处理审批配置选择、`mode` 处理、agent/session
  过滤、账户绑定、session-target 匹配以及目标列表匹配，
  而调用方仍然负责通道 id、默认转发模式、账户
  查找、传输启用检查、目标规范化以及 turn-source
  目标解析。不要用它来创建 core 拥有的通道策略
  默认值；请显式传入通道文档中定义的默认模式。
- `createChannelNativeOriginTargetResolver` 默认使用共享的 channel-route
  matcher 来处理 `{ to, accountId, threadId }` 目标。只有当通道具有提供商特定的等价规则时，
  才传入 `targetsMatch`，例如 Slack 的 timestamp 前缀匹配。若通道需要在默认 route
  matcher 或自定义 `targetsMatch` 回调执行前规范化提供商 id，同时保留
  原始目标用于投递，请传入 `normalizeTargetForMatch`。只有当解析后的
  投递目标本身也应被规范化时，才使用 `normalizeTarget`。
- 如果通道需要 runtime 拥有的对象，例如 client、token、Bolt
  app 或 webhook receiver，请通过
  `openclaw/plugin-sdk/channel-runtime-context` 注册它们。
  通用的 runtime-context 注册表允许 core 在不增加审批专用包装胶水的情况下，
  从通道启动状态引导基于能力的处理器。
- 仅当基于能力的切入点还不够表达时，才使用更底层的
  `createChannelApprovalHandler` 或 `createChannelNativeApprovalRuntime`。
- 原生审批通道必须通过这些帮助器同时路由 `accountId` 和 `approvalKind`。
  `accountId` 确保多账户审批策略限定在正确的 bot 账户上，
  而 `approvalKind` 则让 exec 与 plugin 的审批行为无需在 core
  中硬编码分支即可对通道可用。
- Core 也负责审批重路由通知。通道插件不应在
  `createChannelNativeApprovalRuntime` 中自行发送“审批已转到 DM / 其他通道”的后续消息；
  应改为通过共享审批能力帮助器暴露准确的 origin +
  approver-DM 路由，并让 core 在向发起聊天发送任何通知前汇总实际投递结果。
- 端到端保留已投递审批 id 的类型。原生客户端不应根据通道本地
  状态猜测或重写 exec 与 plugin 审批路由。
- 将显式的 `approvalKind` 传给 `resolveApprovalOverGateway`。这会使用
  规范的 `approval.resolve` 服务，并在其他界面先响应时返回已记录的获胜者。
  较旧的显式 `resolveMethod` 输入仍保留给命令驱动的控制；新的原生动作
  不得使用它，也不得从 id 推断 kind。
- 不同的 approval kind 可以有意暴露不同的原生界面。当前捆绑示例：
  Matrix 对 exec 和 plugin 审批保持相同的原生 DM/channel 路由和 reaction
  交互体验，同时仍允许认证按 approval kind 区分；Slack 对 exec 和 plugin id
  都保持可用的原生审批路由。
- `createApproverRestrictedNativeApprovalAdapter` 仍作为兼容包装器存在，但新代码
  应优先使用 capability builder，并在插件上暴露 `approvalCapability`。

### 更窄的审批运行时子路径

对于高频通道入口点，当你只需要这一类中的某一部分时，优先使用这些更窄的子路径，而不是更宽泛的 `approval-runtime` 总入口：

- `openclaw/plugin-sdk/approval-auth-runtime`
- `openclaw/plugin-sdk/approval-client-runtime`
- `openclaw/plugin-sdk/approval-delivery-runtime`
- `openclaw/plugin-sdk/approval-gateway-runtime`
- `openclaw/plugin-sdk/approval-reference-runtime`
- `openclaw/plugin-sdk/approval-handler-adapter-runtime`
- `openclaw/plugin-sdk/approval-handler-runtime`
- `openclaw/plugin-sdk/approval-native-runtime`
- `openclaw/plugin-sdk/approval-reply-runtime`
- `openclaw/plugin-sdk/channel-runtime-context`

同样地，在不需要全部功能时，优先使用 `openclaw/plugin-sdk/reply-runtime`、
`openclaw/plugin-sdk/reply-dispatch-runtime`、`openclaw/plugin-sdk/reply-reference` 和
`openclaw/plugin-sdk/reply-chunking`，而不是更宽泛的总入口。

### 设置子路径

- `openclaw/plugin-sdk/setup-runtime` 覆盖运行时安全的设置 helper：
  `createSetupTranslator`、可安全导入的 setup patch 适配器
  (`createPatchedAccountSetupAdapter`、`createEnvPatchedAccountSetupAdapter`、
  `createSetupInputPresenceValidator`)、lookup-note 输出、
  `promptResolvedAllowFrom`、`splitSetupEntries`，以及委托式
  setup-proxy builders。
- `openclaw/plugin-sdk/channel-setup` 覆盖可选安装的设置 builders，以及少量设置安全原语：
  `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`、
  `createOptionalChannelSetupWizard`、`DEFAULT_ACCOUNT_ID`、
  `createTopLevelChannelDmPolicy`、`setSetupChannelEnabled` 和
  `splitSetupEntries`。
- 仅当你还需要更重的共享 setup/config helper，例如
  `moveSingleAccountChannelSectionToDefaultAccount(...)` 时，才使用更宽泛的
  `openclaw/plugin-sdk/setup` 接口。

如果你的通道只想在设置界面中提示“请先安装此插件”，优先使用
`createOptionalChannelSetupSurface(...)`。生成的 adapter/wizard 会在配置写入和最终化时
闭合失败，并且它们会在校验、finalize 和 docs-link 文案中复用同一条“需要安装”的消息。

如果你的通道支持由环境驱动的设置或认证，并且通用启动/配置流程在运行时加载之前就应该知道这些环境名，请在插件 manifest 中通过
`channelEnvVars` 声明它们。仅将通道运行时的 `envVars` 或本地常量用于面向操作员的文案。

如果你的通道可以在插件运行时启动之前就出现在 `status`、`channels list`、`channels status` 或 SecretRef 扫描中，请在 `package.json` 里添加 `openclaw.setupEntry`。该入口点应能在只读命令路径中安全导入，并应返回这些汇总所需的通道元数据、设置安全的 config adapter、状态 adapter，以及通道 secret target 元数据。不要从 setup entry 启动客户端、监听器或传输运行时。

主通道入口导入路径也要保持精简。Discovery 可以在不激活通道的情况下评估入口和通道插件模块来注册能力。像 `channel-plugin-api.ts` 这样的文件应导出通道插件对象，而不要导入 setup wizard、传输客户端、socket 监听器、子进程启动器或服务启动模块。把这些运行时组件放到由 `registerFull(...)`、运行时 setter 或 lazy capability adapter 加载的模块中。

### 其他更窄的通道子路径

对于其他高频通道路径，在不需要更宽泛的遗留接入面时，优先使用更窄的帮助器：

- `openclaw/plugin-sdk/account-core`、`openclaw/plugin-sdk/account-id`、
  `openclaw/plugin-sdk/account-resolution` 和
  `openclaw/plugin-sdk/account-helpers`，用于多账户配置和默认账户回退
- `openclaw/plugin-sdk/inbound-envelope` 和
  `openclaw/plugin-sdk/channel-inbound`，用于 inbound route/envelope
  和 record-and-dispatch 接线
- `openclaw/plugin-sdk/channel-targets`，用于目标解析 helper
- `openclaw/plugin-sdk/outbound-media`，用于媒体加载；以及
  `openclaw/plugin-sdk/channel-outbound`，用于 outbound 身份/send 委托
  和载荷规划
- 当 outbound route 需要保留显式的 `replyToId`/`threadId`，或者在基础 session key 仍然匹配时恢复当前的 `:thread:` session，请使用
  `openclaw/plugin-sdk/channel-core` 中的 `buildThreadAwareOutboundSessionRoute(...)`。
  当平台具有原生线程投递语义时，provider 插件可以覆盖优先级、后缀行为和 thread id 规范化。
- `openclaw/plugin-sdk/thread-bindings-runtime`，用于 thread-binding 生命周期和适配器注册
- `openclaw/plugin-sdk/agent-media-payload`，仅在仍需要旧版 agent/media 载荷字段布局时使用
- `openclaw/plugin-sdk/telegram-command-config`（已弃用：生产环境中没有捆绑插件使用它），用于 Telegram 自定义命令规范化、重复/冲突校验，以及 fallback 稳定的命令配置契约；新插件代码应优先采用插件本地的命令配置处理

仅认证的通道通常可以停留在默认路径：core 处理审批，而插件只暴露 outbound/auth 能力。像 Matrix、Slack、Telegram 以及自定义聊天传输这样的原生审批通道，应使用共享的原生 helper，而不是自己重新实现审批生命周期。

## 传入提及策略

将传入提及处理分成两层：

- 插件拥有的证据收集
- 共享策略评估

使用 `openclaw/plugin-sdk/channel-mention-gating` 进行提及策略决策。
仅在需要更广泛的传入辅助工具集合时，使用 `openclaw/plugin-sdk/channel-inbound`。

适合放在插件本地逻辑中的内容：

- 回复到机器人检测
- 引用机器人检测
- 线程参与检查
- 服务/系统消息排除
- 用于证明机器人参与所需的平台原生缓存

适合放在共享辅助中的内容：

- `requireMention`
- 显式提及结果
- 隐式提及允许列表
- 命令旁路
- 最终跳过决策

推荐流程：

1. 计算本地提及事实。
2. 将这些事实传入 `resolveInboundMentionDecision({ facts, policy })`。
3. 在你的传入门控中使用 `decision.effectiveWasMentioned`、`decision.shouldBypassMention` 和
   `decision.shouldSkip`。

```typescript
import {
  implicitMentionKindWhen,
  matchesMentionWithExplicit,
  resolveInboundMentionDecision,
} from "openclaw/plugin-sdk/channel-inbound";

const wasMentioned = matchesMentionWithExplicit({
  text,
  mentionRegexes,
  explicit: {
    hasAnyMention,
    isExplicitlyMentioned,
    canResolveExplicit,
  },
});

const facts = {
  canDetectMention: true,
  wasMentioned,
  hasAnyMention,
  implicitMentionKinds: [
    ...implicitMentionKindWhen("reply_to_bot", isReplyToBot),
    ...implicitMentionKindWhen("quoted_bot", isQuoteOfBot),
  ],
};

const decision = resolveInboundMentionDecision({
  facts,
  policy: {
    isGroup,
    requireMention,
    allowedImplicitMentionKinds: requireExplicitMention ? [] : ["reply_to_bot", "quoted_bot"],
    allowTextCommands,
    hasControlCommand,
    commandAuthorized,
  },
});

if (decision.shouldSkip) return;
```

`matchesMentionWithExplicit(...)` 返回一个布尔值。`hasAnyMention`、
`isExplicitlyMentioned` 和 `canResolveExplicit` 来自频道自身的原生
提及元数据（消息实体、回复到机器人标志等）；当你的平台无法检测它们时，
请提供 `false`/`undefined` 值。

`api.runtime.channel.mentions` 为已经依赖运行时注入的打包频道插件暴露了相同的共享提及辅助工具：
`buildMentionRegexes`、`matchesMentionPatterns`、`matchesMentionWithExplicit`、
`implicitMentionKindWhen`、`resolveInboundMentionDecision`。

如果你只需要 `implicitMentionKindWhen` 和 `resolveInboundMentionDecision`，
请从 `openclaw/plugin-sdk/channel-mention-gating` 导入，以避免加载
无关的传入运行时辅助工具。

## 操作指南

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="包和清单">
    创建标准插件文件。`openclaw.plugin.json` 中的 `channels` 字段（而不是 `kind` 字段）用于标记某个清单拥有一个频道。完整的包元数据字段说明请参见
    [插件设置与配置](/plugins/sdk-setup#openclaw-channel)：

    <CodeGroup>
    ```json package.json
    {
      "name": "@myorg/openclaw-acme-chat",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"],
        "setupEntry": "./setup-entry.ts",
        "channel": {
          "id": "acme-chat",
          "label": "Acme Chat",
          "blurb": "将 OpenClaw 连接到 Acme Chat。"
        }
      }
    }
    ```

    ```json openclaw.plugin.json
    {
      "id": "acme-chat",
      "channels": ["acme-chat"],
      "name": "Acme Chat",
      "description": "Acme Chat 频道插件",
      "configSchema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {}
      },
      "channelConfigs": {
        "acme-chat": {
          "schema": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "token": { "type": "string" },
              "allowFrom": {
                "type": "array",
                "items": { "type": "string" }
              }
            }
          },
          "uiHints": {
            "token": {
              "label": "机器人令牌",
              "sensitive": true
            }
          }
        }
      }
    }
    ```
    </CodeGroup>

    `configSchema` 用于验证 `plugins.entries.acme-chat.config`。把它用于不属于频道账户配置的、由插件拥有的设置。
    `channelConfigs.acme-chat.schema` 用于验证 `channels.acme-chat`，并且在插件运行时加载之前，作为由配置 schema、设置和 UI 界面使用的冷路径来源。完整的顶层字段参考请参见
    [插件清单](/plugins/manifest)。

  </Step>

  <Step title="构建频道插件对象">
    `ChannelPlugin` 接口有许多可选的适配器接口。从最小集合开始——`id`、`config` 和 `setup`——然后按需添加适配器。

    创建 `src/channel.ts`：

    ```typescript src/channel.ts
    import {
      createChatChannelPlugin,
      createChannelPluginBase,
    } from "openclaw/plugin-sdk/channel-core";
    import type { OpenClawConfig } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatApi } from "./client.js"; // 你的平台 API 客户端

    type ResolvedAccount = {
      accountId: string | null;
      token: string;
      allowFrom: string[];
      dmPolicy: string | undefined;
    };

    function resolveAccount(
      cfg: OpenClawConfig,
      accountId?: string | null,
    ): ResolvedAccount {
      const section = (cfg.channels as Record<string, any>)?.["acme-chat"];
      const token = section?.token;
      if (!token) throw new Error("acme-chat: 需要 token");
      return {
        accountId: accountId ?? null,
        token,
        allowFrom: section?.allowFrom ?? [],
        dmPolicy: section?.dmSecurity,
      };
    }

    export const acmeChatPlugin = createChatChannelPlugin<ResolvedAccount>({
      base: createChannelPluginBase({
        id: "acme-chat",
        // 账户解析/检查属于 `config`，而不是 `setup`。
        // `setup` 负责引导写入（applyAccountConfig、validateInput）。
        config: {
          listAccountIds: () => ["default"],
          resolveAccount,
          inspectAccount(cfg, accountId) {
            const section =
              (cfg.channels as Record<string, any>)?.["acme-chat"];
            return {
              enabled: Boolean(section?.token),
              configured: Boolean(section?.token),
              tokenStatus: section?.token ? "available" : "missing",
            };
          },
        },
        setup: {
          applyAccountConfig: ({ cfg, input }) => ({
            ...cfg,
            channels: {
              ...cfg.channels,
              "acme-chat": { ...(cfg.channels as any)?.["acme-chat"], ...input },
            },
          }),
        },
      }),

      // DM 安全：谁可以给机器人发消息
      security: {
        dm: {
          channelKey: "acme-chat",
          resolvePolicy: (account) => account.dmPolicy,
          resolveAllowFrom: (account) => account.allowFrom,
          defaultPolicy: "allowlist",
        },
      },

      // 配对：新 DM 联系人的审批流程
      pairing: {
        text: {
          idLabel: "Acme Chat 用户名",
          message: "发送此代码以验证你的身份：",
          notify: async ({ target, code }) => {
            await acmeChatApi.sendDm(target, `Pairing code: ${code}`);
          },
        },
      },

      // 线程：回复如何被投递
      threading: { topLevelReplyToMode: "reply" },

      // 发出：向平台发送消息
      outbound: {
        attachedResults: {
          channel: "acme-chat",
          sendText: async (params) => {
            const result = await acmeChatApi.sendMessage(
              params.to,
              params.text,
            );
            return { messageId: result.id };
          },
        },
        base: {
          sendMedia: async (params) => {
            await acmeChatApi.sendFile(params.to, params.filePath);
          },
        },
      },
    });
    ```

    对于同时接受规范的顶层 DM 键和旧式嵌套键的频道，请使用 `plugin-sdk/channel-config-helpers` 中的辅助函数：`resolveChannelDmAccess`、`resolveChannelDmPolicy`、`resolveChannelDmAllowFrom` 和 `normalizeChannelDmPolicy` 可以优先使用账户本地值，而不是继承的根值。通过 `normalizeLegacyDmAliases` 将同一个解析器用于 doctor 修复，以便运行时和迁移读取同一份契约。

    <Accordion title="createChatChannelPlugin 会为你做什么">
      你无需手动实现底层适配器接口，只需传入声明式选项，构建器会将它们组合起来：

      | 选项 | 作用 |
      | --- | --- |
      | `security.dm` | 来自配置字段的作用域 DM 安全解析器 |
      | `pairing.text` | 基于文本的 DM 配对流程，带代码交换 |
      | `threading` | 回复目标模式解析器（固定、账户作用域或自定义） |
      | `outbound.attachedResults` | 返回结果元数据（消息 ID）的发送函数；需要一个同级的 `channel` id，以便核心为返回的投递结果加上标记 |

      如果你需要完全控制，也可以传入原始适配器对象，而不是声明式选项。

      原始发出适配器可以定义 `chunker(text, limit, ctx)` 函数。
      可选的 `ctx.formatting` 携带投递时的格式化决策，例如 `maxLinesPerMessage`；发送前应先应用它，以便共享发出投递只需解析一次回复线程和分块边界。
      当解析出了原生回复目标时，发送上下文还包括 `replyToIdSource`（`implicit` 或 `explicit`），这样负载辅助函数可以保留显式回复标签，而不会消耗隐式的一次性回复槽位。
    </Accordion>

  </Step>

  <Step title="连接入口点">
    创建 `index.ts`：

    ```typescript index.ts
    import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineChannelPluginEntry({
      id: "acme-chat",
      name: "Acme Chat",
      description: "Acme Chat 频道插件",
      plugin: acmeChatPlugin,
      registerCliMetadata(api) {
        api.registerCli(
          ({ program }) => {
            program
              .command("acme-chat")
              .description("Acme Chat 管理");
          },
          {
            descriptors: [
              {
                name: "acme-chat",
                description: "Acme Chat 管理",
                hasSubcommands: false,
              },
            ],
          },
        );
      },
      registerFull(api) {
        api.registerGatewayMethod(/* ... */);
      },
    });
    ```

    将频道拥有的 CLI 描述符放在 `registerCliMetadata(...)` 中，这样 OpenClaw 就可以在根帮助中显示它们，而无需激活完整的频道运行时；同时，正常的完整加载仍然会获取这些相同的描述符用于真正的命令注册。将 `registerFull(...)` 保留给仅运行时的工作。
    `defineChannelPluginEntry` 会自动处理注册模式的拆分。
    如果 `registerFull(...)` 注册了网关 RPC 方法，请使用频道专属前缀。核心管理命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）仍保留并始终解析到 `operator.admin`。更多选项请参见
    [入口点](/plugins/sdk-entrypoints#definechannelpluginentry)。

  </Step>

  <Step title="添加设置入口">
    创建 `setup-entry.ts`，用于在引导期间进行轻量加载：

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    当频道被禁用或未配置时，OpenClaw 会加载此入口而不是完整入口。
    这样可避免在设置流程中拉取沉重的运行时代码。
    详见 [设置与配置](/plugins/sdk-setup#setup-entry)。

    将设置安全导出拆分到 sidecar 模块的打包工作区频道，如果还需要一个显式的设置期运行时 setter，可以使用 `openclaw/plugin-sdk/channel-entry-contract` 中的 `defineBundledChannelSetupEntry(...)`。

  </Step>

  <Step title="处理传入消息">
    你的插件需要接收来自平台的消息并将它们转发给 OpenClaw。典型模式是使用 webhook 验证请求，然后通过频道的传入处理器分发它：

    ```typescript
    registerFull(api) {
      api.registerHttpRoute({
        path: "/acme-chat/webhook",
        auth: "plugin", // 由插件管理的认证（自行验证签名）
        handler: async (req, res) => {
          const event = parseWebhookPayload(req);

          // 你的传入处理器将消息分发给 OpenClaw。
          // 具体接线取决于你的平台 SDK -
          // 请参见打包的 Microsoft Teams 或 Google Chat 插件包中的真实示例。
          await handleAcmeChatInbound(api, event);

          res.statusCode = 200;
          res.end("ok");
          return true;
        },
      });
    }
    ```

    <Note>
      传入消息处理是频道特定的。每个频道插件都拥有自己的传入流水线。查看打包的频道插件（例如 Microsoft Teams 或 Google Chat 插件包）以了解真实模式。
    </Note>

  </Step>

<a id="step-6-test"></a>
<Step title="测试">
在 `src/channel.test.ts` 中编写就近测试：

    ```typescript src/channel.test.ts
    import { describe, it, expect } from "vitest";
    import { acmeChatPlugin } from "./channel.js";

    describe("acme-chat plugin", () => {
      it("从配置中解析账户", () => {
        const cfg = {
          channels: {
            "acme-chat": { token: "test-token", allowFrom: ["user1"] },
          },
        } as any;
        const account = acmeChatPlugin.config.resolveAccount(cfg, undefined);
        expect(account.token).toBe("test-token");
      });

      it("检查账户时不具现化密钥", () => {
        const cfg = {
          channels: { "acme-chat": { token: "test-token" } },
        } as any;
        const result = acmeChatPlugin.config.inspectAccount!(cfg, undefined);
        expect(result.configured).toBe(true);
        expect(result.tokenStatus).toBe("available");
      });

      it("报告缺失配置", () => {
        const cfg = { channels: {} } as any;
        const result = acmeChatPlugin.config.inspectAccount!(cfg, undefined);
        expect(result.configured).toBe(false);
      });
    });
    ```

    ```bash
    pnpm test <bundled-plugin-root>/acme-chat/
    ```

    关于共享测试辅助，请参见 [测试](/plugins/sdk-testing)。

</Step>
</Steps>

## 文件结构

```text
<bundled-plugin-root>/acme-chat/
├── package.json              # openclaw.channel 元数据
├── openclaw.plugin.json      # 带有配置 schema 的清单
├── index.ts                  # defineChannelPluginEntry
├── setup-entry.ts            # defineSetupPluginEntry
├── api.ts                    # 公共导出（可选）
├── runtime-api.ts            # 内部运行时导出（可选）
└── src/
    ├── channel.ts            # 通过 createChatChannelPlugin 实现的 ChannelPlugin
    ├── channel.test.ts       # 测试
    ├── client.ts             # 平台 API 客户端
    └── runtime.ts            # 运行时存储（如需要）
```

## 高级主题

<CardGroup cols={2}>
  <Card title="线程选项" icon="git-branch" href="/plugins/sdk-entrypoints#registration-mode">
    固定、按账户作用域或自定义回复模式
  </Card>
  <Card title="消息工具集成" icon="puzzle" href="/plugins/architecture#channel-plugins-and-the-shared-message-tool">
    describeMessageTool 和动作发现
  </Card>
  <Card title="目标解析" icon="crosshair" href="/plugins/architecture-internals#channel-target-resolution">
    inferTargetChatType, looksLikeId, reservedLiterals, resolveTarget
  </Card>
  <Card title="运行时辅助" icon="settings" href="/plugins/sdk-runtime">
    通过 api.runtime 提供 TTS、STT、媒体、subagent
  </Card>
  <Card title="频道入站 API" icon="bolt" href="/plugins/sdk-channel-inbound">
    共享入站事件生命周期：ingest, resolve, record, dispatch, finalize
  </Card>
</CardGroup>

<Note>
某些打包辅助接缝仍然存在，用于打包插件维护和兼容性。对于新的频道插件，它们不是推荐模式；除非你正在直接维护该打包插件家族，否则应优先使用通用 SDK 表面的 channel/setup/reply/runtime 子路径。
</Note>

## 下一步

- [Provider plugins](/plugins/sdk-provider-plugins) - If your plugin also provides models
- [SDK overview](/plugins/sdk-overview) - Complete subpath import reference
- [SDK testing](/plugins/sdk-testing) - Testing tools and contract testing
- [Plugin manifest](/plugins/manifest) - Complete manifest schema

## 相关内容

- [插件 SDK 设置](/plugins/sdk-setup)
- [构建插件](/plugins/building-plugins)
- [Agent harness 插件](/plugins/sdk-agent-harness)