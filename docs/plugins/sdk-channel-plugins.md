---
summary: "为 OpenClaw 构建消息通道插件的分步指南"
title: "构建通道插件"
sidebarTitle: "通道插件"
read_when:
  - 你正在构建一个新的消息通道插件
  - 你想将 OpenClaw 连接到某个消息平台
  - 你需要理解 ChannelPlugin 适配器表面
---

本指南将构建一个通道插件，用于将 OpenClaw 连接到一个消息平台：私信安全性、配对、回复线程以及出站消息。

<Info>
  对 OpenClaw 插件还不熟悉？请先阅读 [入门指南](/plugins/building-plugins)
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

核心还负责模型选择器的产品操作。渲染
`ModelPickerAction` 的频道会声明其
`ModelPickerCapabilityProfile`，然后将类型化操作编码到传输私有的、经过身份验证的回调信封中。在到达该编码边界之前，应始终区分批准、命令、URL、Web 应用、问题、回调和模型选择器操作；绝不要从原始回调字符串推断选择器意图。参与者和源消息检查仍由频道负责。

## 消息适配器

使用 `openclaw/plugin-sdk/channel-outbound` 中的 `defineChannelMessageAdapter` 暴露一个 `message` 适配器。只声明你的原生传输实际支持的、可持久化的最终发送能力，并通过一个契约测试来证明原生副作用和返回的收据。文本/媒体发送应指向与旧版 `outbound` 适配器相同的传输函数。完整的 API 契约、能力矩阵、收据规则、实时预览定稿、接收确认策略、测试和迁移表，请参见
[渠道出站 API](/plugins/sdk-channel-outbound)。

如果你现有的 `outbound` 适配器已经具备正确的发送方法和能力元数据，则应使用 `createChannelMessageAdapterFromOutbound(...)` 派生 `message` 适配器，而不是手写另一层桥接。适配器发送会返回 `MessageReceipt` 值。对于旧版 id，请使用 `listMessageReceiptPlatformIds(...)` 或 `resolveMessageReceiptPrimaryId(...)` 派生它们，而不是继续维护并行的 `messageIds` 字段。

精确声明实时和定稿器能力——core 会据此判断一个渠道能做什么，而声明与实际行为之间的偏差会被视为契约测试失败：

| 表面                                 | 值                                                                                             |
| ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `message.live.capabilities`           | `draftPreview`, `previewFinalization`, `progressUpdates`, `nativeStreaming`, `quietFinalization` |
| `message.live.finalizer.capabilities` | `finalEdit`, `normalFallback`, `discardPending`, `previewReceipt`, `retainOnAmbiguousFailure`    |

会就地完成草稿预览定稿的渠道应通过 `defineFinalizableLivePreviewAdapter(...)` 和 `deliverWithFinalizableLivePreviewAdapter(...)` 来承载运行时逻辑，并使用 `verifyChannelMessageLiveCapabilityAdapterProofs(...)` 与 `verifyChannelMessageLiveFinalizerProofs(...)` 测试来保持声明的能力有据可依，这样原生预览、进度、编辑、回退/保留、清理和收据行为就不会悄然偏离。

### 进度可见性验收

进度回调报告的是操作员能够看到的内容，而不仅仅是插件排队的内容。在接受可见进度后返回
`true`，在投递仍处于等待状态或没有发生可见更新时返回 `false`。现有返回 `void` 的同步和异步回调仍保持向后兼容，并被视为可见；新的支持接纳结果的实现应使用显式布尔值。

会延迟平台确认的入站接收器应声明
`message.receive.defaultAckPolicy` 和 `supportedAckPolicies`，而不是将确认时机隐藏在监控器本地状态中。请使用
`verifyChannelMessageReceiveAckPolicyAdapterProofs(...)` 覆盖每个已声明的策略。

### TTS 语音投递

在 `capabilities.tts.voice` 下声明原生语音消息行为。当 TTS 提供商应生成原生语音消息格式时，设置
`synthesisTarget: "voice-note"`。仅当出站语音操作接受可见的最终文本，并执行其传输层的说明文字和溢出规则时，才设置
`captionedFinalText: true`。对于该操作，core 随后会暂存最终模式下的流式文本，并在语音负载被证明未发送时回退到文本。

旧版 `dispatchInboundReplyWithBase` 辅助函数仍可通过已弃用的
`openclaw/plugin-sdk/inbound-reply-dispatch` 兼容性 shim 使用。
不要将其用于新的渠道代码；请改为从 `message` 适配器、收据以及
`openclaw/plugin-sdk/channel-outbound` 上的接收/发送生命周期辅助函数开始。

### 入站入口（实验性）

正在迁移入站授权的渠道可以从运行时接收路径使用实验性的
`openclaw/plugin-sdk/channel-ingress-runtime` 子路径。它接受平台事实、
原始允许列表、路由描述符、命令事实和访问组配置，然后返回发送者/路由/命令/激活
投影以及有序的入口图，同时将平台查找和副作用保留在插件中。请在传递给解析器的
描述符中保留插件身份规范化；不要从已解析的状态或决策中序列化原始匹配值。请参阅
[渠道入口 API](/plugins/sdk-channel-ingress)，了解 API 设计、
职责边界和测试预期。

### 持久化入口与重放去重

采用持久化入口的通道应使用
`openclaw/plugin-sdk/channel-outbound` 中的 `createChannelIngressMonitor`，
除非它们需要实质不同的接纳或泵送契约。在单一接收汇合点将原始传输信封入队
（接收时不进行规范化），对于 webhook 传输，将传输确认置于持久化追加之后，
为每个会话派生一个串行通道，并在分发接纳时将事件标记为完成。队列的主键为
`(queue_name, event_id)`，完成操作会将该行标记为墓碑，而不是删除它，因此在
墓碑保留窗口内，平台稍后再次投递相同 `event_id` 时会被持久拒绝。
有关监控器 API 和关闭契约，请参阅[通道出站 API](/plugins/sdk-channel-outbound#durable-ingress-monitors)。

该墓碑是重放保护层
（`openclaw/plugin-sdk/persistent-dedupe`）的分层规则：只有当保护器的身份或保留时间超过队列时，
已排空的通道才需要保留独立的重放保护器——例如，与传输投递 ID 不同的逻辑消息键
（Telegram 使用 `chat_id:message_id` 去重，因为防抖合并可能会让消息以新的
`update_id` 再次出现），或者比通道墓碑保留时间更长的窗口。如果你的保护器键会等于
排空的 `event_id`，则应在接纳排空事件时删除该保护器，并相应设置
`completedTtlMs`/`completedMaxEntries`，使其覆盖旧保护器窗口。诸如年龄栅栏之类的非去重保护与此规则无关。
稳定的出站消息 ID 应使用 `openclaw/plugin-sdk/channel-outbound` 中共享的出站回显注册表，
而不是通道本地的 TTL 缓存。

#### 传输类别与保留

根据接收边界处的恢复保证对传输进行分类：

- **确认门控的 webhook 或事件投递：** 仅在持久化追加之后确认或返回成功。
  追加失败必须使该投递仍具备重试资格，或使接收边界失败。此类别包括 Slack、SMS、Zalo、
  Microsoft Teams、Google Chat、LINE 和 Synology Chat。
- **等待式轮询或流式投递：** 仅在追加之后推进远程游标或发送传输确认。当不存在显式游标时，
  保持接收回调串行并等待完成，以确保追加失败不会让接收循环超前运行。Telegram 轮询、Signal
  和 Tlon 使用此类别；Telegram webhook 投递遵循上述确认门控规则。
- **不可重放的套接字：** IRC、Mattermost、Twitch 和 Zalo Personal 无法请求平台重新投递
  已接受的事件。它们的持久化队列用于保护进程崩溃窗口，并支持本地重启恢复；完成墓碑对于防止平台重放几乎不起作用。

将 30 天作为整个系统的墓碑 TTL 约定，而不是 SDK 默认值。高流量重投递窗口通常使用
20,000 条已完成条目的上限；低流量的等待式传输和不可重放传输通常使用 1,000-2,000 条。
当前例外包括 LINE 的 4,096 条上限、SMS 的 24 小时已完成 TTL，以及 Tlon 仅按上限保留已完成条目。
失败行上限也可以低于已完成条目上限。TTL 和上限都会清理行，因此有效保留时间在第一个边界达到时结束。
只有在有已记录的平台重试时限、需要保留的已发布重放保护器窗口、预期流量或磁盘预算，
或不可重放传输等情况下才可偏离，并应通过测试覆盖保留契约。

#### 至少一次副作用

排空分发会先执行命令副作用，然后入口行才到达其完成墓碑。在这两个步骤之间发生进程崩溃会导致该行被重放，
从而可能再次执行副作用。这种至少一次的崩溃窗口是默认契约。对于配置写入、存储清理或回复通道之外的可见确认等
非幂等工作，请使用 `openclaw/plugin-sdk/ingress-effect-once` 中的
`createIngressEffectOnce(...)`。为每次调用提供稳定的入口 `eventId` 以及副作用名称。
每个入口队列/账户创建一个辅助器，并为该作用域使用稳定且唯一的 `namespacePrefix`，因为传输事件 ID 可能只在队列内唯一。
辅助器仅在副作用成功后提交其持久化声明；抛出的副作用会释放声明，使排空重试能够再次执行该副作用，
而并发调用方会等待当前活动声明。持久化状态错误会在提供 `onDiskError` 时调用它，并拒绝操作，而不是回退到进程内存。

将辅助器的 `ttlMs` 设置为至少通道入口墓碑保留时间，加上副作用提交与行完成之间的最大延迟，
其中包括有界停机时间和排空重试。副作用记录的 TTL 从提交时开始，而墓碑保留时间从完成时才开始；
如果待处理行的生命周期无界，则没有有限 TTL 能覆盖任意时长的停机。在墓碑不再能够重放该行之后，
较旧的副作用记录就成了无用负担。为 `stateMaxEntries` 设置足够容量，以容纳该保留窗口内可能存在的每个不同事件/副作用键，
同时考虑队列的已完成条目上限和每个事件的最大副作用数。较低的上限会在 TTL 到期前驱逐最旧记录，并允许该副作用再次执行。
如果进程在副作用成功但声明提交之前退出，或记录在其入口行仍处于待处理状态时过期，仍会存在残余的至少一次窗口。

#### 账户范围的重启契约

默认情况下，通道配置变更会重启整个通道。多账户通道只有在以下条件成立时，才可设置
`reload.accountScopedRestart: true`：配置解析只读取通道范围的共享字段和选定账户，而绝不读取兄弟账户；
并且 Gateway 能够在不替换兄弟运行时的情况下，停止并启动单个 `(channel, accountId)` 运行时。

范围化路径仅适用于
`channels.<channel>.accounts.<non-default-id>.*` 下的变更。对共享通道字段、`accounts.default`、
已删除或无法解析的账户的变更，以及可能影响继承关系的混合变更，都会升级为整个通道重启。
未选择加入的插件始终使用整个通道路径。

对于使用持久化入口排空的通道，账户监控器的停止路径必须先完成所有已接纳传输的处理，
然后释放并等待其排空完成。启动账户时会打开同一个按账户键控的队列，其初始排空会恢复尚未分发的持久化行。
不要添加第二次仅针对重新加载的重放流程；队列恢复是规范的重启路径。

将此标志视为能力声明，而不是性能偏好。契约测试应证明：添加或编辑一个指定账户不会改变兄弟账户的解析配置；
停止一个账户只会完成该账户监控器和排空的处理；新监控器会恰好一次地恢复该账户的行。如果任何保证无法证明，
就不要设置该标志。

### 运行时生命周期状态

对于由渠道编写的运行时状态，`ChannelAccountSnapshot.lifecycle` 是
`healthState` 的后继者。在采用过程中，现有插件可以继续发布
`healthState`，并且仍支持核心派生的策略写入。暂无移除日期；移除时间取决于外部渠道插件的采用情况。

### 正在输入指示器

如果你的 channel 除了入站回复之外还支持正在输入指示器，请在 channel 插件上暴露 `heartbeat.sendTyping(...)`。core 会在 heartbeat 模型运行开始前，使用已解析的 heartbeat 投递目标调用它，并使用共享的正在输入保活/清理生命周期。当平台需要显式停止信号时，再添加 `heartbeat.clearTyping(...)`。

### 媒体来源参数

如果你的 channel 为消息工具参数添加了媒体来源，请通过 `plugin.actions.describeMessageTool(...).mediaSourceParams` 暴露这些参数名。core 会使用这个显式列表进行 sandbox 路径规范化和 outbound 媒体访问策略，因此插件不需要为特定 provider 的头像、附件或封面图参数添加 shared-core 特例。

建议使用按 action 键控的映射，例如 `{ "set-profile": ["avatarUrl", "avatarPath"] }`，这样无关的 actions 就不会继承另一个 action 的媒体参数。若这些参数本来就是要在所有暴露的 actions 中共享，扁平数组仍然可用。

必须为平台侧媒体拉取暴露临时公开 URL 的 channels，可以使用 `openclaw/plugin-sdk/outbound-media` 中的 `createHostedOutboundMediaStore(...)` 和 plugin state stores。把平台路由解析和 token 强制校验留在 channel 插件里；共享 helper 只负责媒体加载、过期元数据、分块行以及清理。

`prepareUrl({ mediaAccess })` 会将主机授权的本地媒体访问权限转发给共享的 outbound loader。为保持兼容性，托管媒体容量的默认值为 `overflowPolicy: "evict-oldest"`。当生成的 URL 必须在过期前保持有效时，请使用 `"reject-new"`，并将两个后端 keyed stores 都配置为 `"reject-new"`，以确保独立写入方无法驱逐仍有效的行。请先使用 `readMetadata(...)` 对 bearer 请求进行身份验证，再调用 `read(...)`，这样无效 token 和 `HEAD` 请求就不会加载已存储的媒体分块。

入站附件使用有序 facts，而不是并行的 `Media*` 字段。使用 `openclaw/plugin-sdk/channel-inbound` 中的 `toInboundMediaFacts(...)` 规范化 channel 记录，并在构建入站上下文时将其作为 `media` 传入。当插件必须授权本地媒体读取时，请从专用的 `openclaw/plugin-sdk/media-local-roots` 子路径导入 `getAgentScopedMediaLocalRoots(...)` 或 `getAgentScopedMediaLocalRootsForSources(...)`。旧的 `agent-media-payload` builder/root facade 属于已弃用的兼容性接口。

### 原生负载整形

如果你的通道需要对 `message(action="send")` 进行提供商特定的整形，优先使用 `actions.prepareSendPayload(...)`。将原生卡片、区块、嵌入内容或其他持久化数据放在 `payload.channelData.<channel>` 下，并让核心通过 outbound/message 适配器发送。仅将 `actions.handleAction(...)` 用作无法序列化和重试的负载的兼容性回退方案。

### 会话对话语法

如果你的平台把额外作用域存储在 conversation id 中，请使用 `messaging.resolveSessionConversation(...)` 将解析逻辑保留在插件内。这是将 `rawId` 映射到基础 conversation id、可选 thread id、显式 `baseConversationId` 以及任何 `parentConversationCandidates` 的规范钩子。当你返回 `parentConversationCandidates` 时，请按从最窄的 parent 到最宽/base conversation 的顺序排列。

`messaging.resolveParentConversationCandidates(...)` 是一个已弃用的兼容性回退方案，适用于只需要在通用/raw id 之上提供 parent 回退的插件。如果两个钩子都存在，core 会先使用 `resolveSessionConversation(...).parentConversationCandidates`，只有在规范钩子未提供它们时才回退到 `resolveParentConversationCandidates(...)`。

需要在 channel registry 启动之前完成同样解析的捆绑插件，可以提供一个顶层 `session-key-api.ts` 文件，并导出匹配的 `resolveSessionConversation(...)`（参见 Feishu 和 Telegram 插件）。只有在运行时插件 registry 还不可用时，core 才会使用这个启动安全的接口。

当插件代码需要规范化类似 route 的字段、比较子 thread 与其父 route，或从 `{ channel, to, accountId, threadId }` 构建稳定的去重 key 时，请使用 `openclaw/plugin-sdk/channel-route`。这个 helper 会像 core 一样规范化数字类型的 thread id，因此应优先于临时的 `String(threadId)` 比较。具有 provider 特定目标语法的插件应暴露 `messaging.resolveOutboundSessionRoute(...)`，以便 core 无需 parser shim 就能获取 provider 原生的 session 和 thread 身份。

### 按账号作用域的会话绑定支持

当 channel 支持通用的当前会话绑定时，将 `conversationBindings.supportsCurrentConversationBinding` 设为 true。`createChatChannelPlugin(...)` 默认会将这个静态能力设为 `true`。

如果支持情况因已配置账号而异，还应实现 `conversationBindings.isCurrentConversationBindingSupported({ accountId })`。core 只有在静态能力启用后才会评估这个同步 hook。返回 `false` 会使该账号不可用通用的当前会话能力、bind、lookup、list、touch 和 unbind 操作。省略该 hook 则会把静态能力应用于每个账号。

请从已加载的账号配置或运行时状态中解析答案。这个 hook 只会对通用当前会话绑定进行门控；它不会替代已配置的绑定规则或插件拥有的会话路由。契约测试应至少覆盖一个支持账号和一个不支持账号，并通过 `openclaw/plugin-sdk/channel-core` 导出的 `ChannelPlugin["conversationBindings"]` 契约来验证。

## 审批和通道能力

大多数通道插件不需要审批专用代码。Core 负责同聊天室的
`/approve`、共享的审批按钮载荷以及通用的回退投递。
`ChannelPlugin.approvals` 已被移除；请改为将审批投递／原生／渲染／认证
相关事实放到一个 `approvalCapability` 对象上。`plugin.auth` 仅用于登录／登出——
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
  交由原生启动面状态用于投递／设置指引。
- 如果你的通道暴露原生 exec 审批，在原生客户端状态与同聊天室
  审批认证不同时，使用 `approvalCapability.getExecInitiatingSurfaceState`
  作为启动面／原生客户端状态。Core 会使用这个 exec 专用钩子来区分
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

如果一个通道需要原生审批投递，请让通道代码聚焦于目标规范化以及传输／呈现事实。
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
- `presentation` - 将共享审批视图模型映射为 pending／resolved／expired 原生载荷或最终动作
- `transport` - 准备目标并发送／更新／删除原生审批消息
- `interactions` - 可选的原生按钮或 reaction 的 bind/unbind/clear-action 钩子，以及可选的 `cancelDelivered` 钩子。若 `deliverPending` 会注册进程内或持久化状态（例如 reaction 目标存储），请实现 `cancelDelivered`，以便在处理器停止且在 `bindPending` 执行前取消投递时，或者当 `bindPending` 返回空句柄时能够释放这些状态
- `observe` - 可选的投递诊断钩子

其他审批帮助器：

- 当一个通道同时支持会话来源的原生投递和显式审批转发目标时，请使用
  `openclaw/plugin-sdk/approval-native-runtime` 中的
  `createNativeApprovalChannelRouteGates`。该帮助器集中处理审批配置选择、`mode`
  处理、代理／会话过滤、账户绑定、会话目标匹配和目标列表匹配，同时调用方仍负责通道 ID、默认转发模式、账户查找、传输启用检查、目标规范化和轮次来源目标解析。不要使用它来创建由 core 所有的通道策略默认值；请显式传入通道文档规定的默认模式。
- `createNativeApprovalMessagingTargetResolvers` 集中处理消息传输中的通道匹配以及 `{ to, accountId, threadId }` 规范化，这些传输的原生审批目标是通道自有的规范化目的地。
  请将群组授权、审批人映射和其他传输策略保留在通道插件中。
- `createChannelNativeOriginTargetResolver` 默认使用共享的通道路由匹配器来处理 `{ to, accountId, threadId }` 目标。只有当通道具有提供商特定的等价规则（例如 Slack 时间戳前缀匹配）时，才传入 `targetsMatch`。当通道需要在默认路由匹配器或自定义 `targetsMatch` 回调运行之前规范化提供商 ID 时，请传入 `normalizeTargetForMatch`，同时保留原始目标用于投递。只有当解析出的投递目标本身应被规范化时，才使用 `normalizeTarget`。
- 如果通道需要客户端、令牌、Bolt 应用或 webhook 接收器等由运行时拥有的对象，请通过
  `openclaw/plugin-sdk/channel-runtime-context` 注册它们。通用的运行时上下文注册表可以让 core 从通道启动状态引导基于能力的处理器，而无需添加审批专用的包装代码。
- 只有当基于能力的衔接点暂时无法满足需求时，才使用较低层级的
  `createChannelApprovalHandler` 或
  `createChannelNativeApprovalRuntime`。
- 原生审批通道必须通过这些帮助器传递 `accountId` 和 `approvalKind`。`accountId` 确保多账户审批策略限定在正确的机器人账户范围内，而 `approvalKind` 则使通道能够处理 exec 与插件审批行为，无需在 core 中使用硬编码分支。
- Core 也负责审批重新路由通知。通道插件不应从 `createChannelNativeApprovalRuntime` 发送自己的“审批已转到私信／另一个通道”后续消息；相反，应通过共享审批能力帮助器准确暴露来源 + 审批人私信路由，并让 core 在向发起审批的聊天发布任何通知之前，汇总实际投递结果。
- 端到端保留已投递审批 ID 的类型。原生客户端不应根据通道本地状态猜测或重写 exec 与插件审批的路由。
- 将显式的 `approvalKind` 传递给 `resolveApprovalOverGateway`。这会使用规范的
  `approval.resolve` 服务，并在另一个界面先作出响应时返回已记录的获胜者。较旧的显式 `resolveMethod` 输入仍用于基于命令的控制；新的原生操作不得使用它，也不得从 ID 推断类型。
- 不同的审批类型可以有意暴露不同的原生界面。目前打包的示例包括：Matrix 对 exec 和插件审批保持相同的原生私信／频道路由和 reaction 用户体验，同时仍允许按审批类型区分授权；Slack 则同时为 exec ID 和插件 ID 提供原生审批路由。
- `createApproverRestrictedNativeApprovalAdapter` 仍作为兼容性包装器存在，但新代码应优先使用能力构建器，并在插件上暴露 `approvalCapability`。

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
`createOptionalChannelSetupSurface(...)`。生成的 adapter／wizard 会在配置写入和最终化时
闭合失败，并且它们会在校验、finalize 和 docs-link 文案中复用同一条“需要安装”的消息。

如果你的通道支持由环境变量驱动的设置或身份验证，请通过通道配置 schema 和设置描述符公开这些能力。将通道运行时的 `envVars` 或本地常量仅用于面向操作员的文案。

如果你的通道可以在插件运行时启动之前就出现在 `status`、`channels list`、`channels status` 或 SecretRef 扫描中，请在 `package.json` 里添加 `openclaw.setupEntry`。该入口点应能在只读命令路径中安全导入，并应返回这些汇总所需的通道元数据、设置安全的 config adapter、状态 adapter，以及通道 secret target 元数据。不要从 setup entry 启动客户端、监听器或传输运行时。

主通道入口导入路径也要保持精简。Discovery 可以在不激活通道的情况下评估入口和通道插件模块来注册能力。像 `channel-plugin-api.ts` 这样的文件应导出通道插件对象，而不要导入 setup wizard、传输客户端、socket 监听器、子进程启动器或服务启动模块。把这些运行时组件放到由 `registerFull(...)`、运行时 setter 或 lazy capability adapter 加载的模块中。

### 其他更窄的通道子路径

对于其他高频通道路径，在不需要更宽泛的遗留接入面时，优先使用更窄的帮助器：

- `openclaw/plugin-sdk/account-core`、`openclaw/plugin-sdk/account-id`、
  `openclaw/plugin-sdk/account-resolution` 和
  `openclaw/plugin-sdk/account-helpers`，用于多账户配置和
  默认账户回退
- `openclaw/plugin-sdk/inbound-envelope` 和
  `openclaw/plugin-sdk/channel-inbound`，用于入站路由／信封以及
  记录并分发的衔接
- 当终端 reaction 或状态 UI 必须区分已完成的 core agent 运行和恢复后的失败运行时，使用
  `openclaw/plugin-sdk/channel-inbound` 中的
  `readAgentRunTerminalOutcome(dispatchResult)`。它仅在 core 运行确实启动时返回
  `"completed"` 或 `"failed"`，对于命令、去重、繁忙、运行前中止和自定义分发结果则返回
  `undefined`。投递计数和可见性仍属于传输事实，包括错误载荷的成功投递；进程本地载体不会序列化为 JSON。
- 当成功的出站发送必须停用活动的入站事件标记时，使用
  `openclaw/plugin-sdk/inbound-event-delivery` 中的
  `createInboundEventDeliveryCorrelation(...)`；每个通道创建一个跟踪器，并将目标匹配保留在通道插件中
- `openclaw/plugin-sdk/channel-targets`，用于目标解析帮助器
- `openclaw/plugin-sdk/channel-outbound`，用于出站身份／发送委托和类型化载荷规划
- 当出站路由应保留显式的 `replyToId`／`threadId`，或在基础会话键仍匹配后恢复当前的 `:thread:` 会话时，使用
  `openclaw/plugin-sdk/channel-core` 中的
  `buildThreadAwareOutboundSessionRoute(...)`。当提供商平台具有原生线程投递语义时，提供商插件可以覆盖优先级、后缀行为和线程 ID 规范化。
- `openclaw/plugin-sdk/thread-bindings-runtime`，用于线程绑定生命周期和适配器注册

仅认证的通道通常可以停留在默认路径：core 处理审批，而插件只暴露 outbound／auth 能力。像 Matrix、Slack、Telegram 以及自定义聊天传输这样的原生审批通道，应使用共享的原生 helper，而不是自己重新实现审批生命周期。

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
import { resolveChannelImplicitMentions } from "openclaw/plugin-sdk/channel-ingress-runtime";

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

const implicitMentions = resolveChannelImplicitMentions({
  cfg,
  channel: channelId,
  accountId,
});

const decision = resolveInboundMentionDecision({
  facts,
  policy: {
    isGroup,
    requireMention,
    implicitMentions,
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

    如果某个频道有意采用比全局配置更严格的 DM 会话路由，应通过 `security.dmRouting` 暴露此行为，以便 Doctor 和安全审计解析出与运行时相同的会话所有者。可选的 `resolveDmScope` 回调会在核心路由解析之前运行；其上下文包括 `cfg`、`accountId`、已解析的 `account`，以及用于有限允许列表条目的 `principalId`。`resolveDmRoute` 会接收这些字段以及已解析的核心 `route`；它可以返回 `{ sessionKey }` 以使用共享的最终存储桶，返回 `{ kind: "isolated" }` 以表示未知对端，或返回 `{ kind: "core" }` 以保留核心 `dmScope` 命名空间分析。对于通配符／开放策略，`principalId` 不存在，未定义的结果会被报告为未经验证。诊断绝不会臆造对端 ID。两个回调都应保持纯函数特性并且可安全导入，因为只读诊断会在没有频道运行时的情况下运行。

    <Accordion title="What createChatChannelPlugin does for you">
      无需手动实现底层适配器接口，只需传入声明式选项，构建器就会为你组合这些适配器：

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

    ### 群组工具策略适配器

    实现了 `group.resolveToolPolicy` 并支持
    `toolsBySender` 的频道必须将完整的 `ChannelGroupContext` 转发给其
    共享策略解析器。尤其要注意：通过在匹配的群组和通配符作用域跳过发送者特定的覆盖项，遵守
    `senderPolicyMode: "never"`，同时仍应用基础的 `tools` 策略。

    OpenClaw 仅会为受信任的非入口执行设置此模式，此类执行的发送者权限已记录在服务器拥有的信封中，例如
    明确设置了上限的计划运行。插件不得从传入元数据推导此模式，不得将其持久化为频道状态，也不得将其暴露为配置项。添加一个适配器测试，证明该模式会跳过通配符 `toolsBySender` 条目，同时不会丢弃匹配的基础 `tools` 限制。

    ### 原生插件命令所有权

    发布提供商原生命令目录的频道插件应使用
    `openclaw/plugin-sdk/plugin-command-runtime`。规划目录时创建一个运行时，将其候选项与内置条目和技能条目合并，并在已注册的处理程序闭包中保留获胜的候选对象。
    提供商目录确定后，只要至少保留一个插件候选项，就调用
    `retainNativeCatalog(provider)`；如果监听器注册可能同步失败，则在这些监听器安装完成后调用它。此操作会记录当前的频道账户生命周期，以便注册表重新加载时，仅重启其处理程序保留了该注册表代次的账户。
    只对该获胜者调用 `prepareDispatch(rawArgs)`，并使用 `dispatch.execute(context)` 执行返回的分发。对于保留的内置条目和技能获胜者，携带明确的
    `{ kind: "non-plugin" }` 决策。
    这样可以确保公布的命令及其可执行的插件注册属于同一个注册表代次。

    候选项只会暴露不可变的显示／身份验证／进度元数据，以及不透明的进程本地分发。它们不会暴露处理程序、插件根目录或注册表行。分发不能跨越运行时工厂或频道，并且注册表替换后，新的执行会返回不可用结果，而不是针对替换后的注册表重新匹配命令文本。
    已在退役前获准执行的命令可以在其捕获的代次上完成。不要序列化候选项或分发；只将其显示字段投影到提供商 API 负载中。

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
├── openclaw.plugin.json      # 带有配置模式的清单
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
    inferTargetChatType、looksLikeId、reservedLiterals、resolveTarget
  </Card>
  <Card title="运行时辅助" icon="settings" href="/plugins/sdk-runtime">
    通过 api.runtime 提供 TTS、STT、媒体、subagent
  </Card>
  <Card title="频道入站 API" icon="bolt" href="/plugins/sdk-channel-inbound">
    共享入站事件生命周期：ingest、resolve、record、dispatch、finalize
  </Card>
</CardGroup>

<Note>
某些打包辅助接缝仍然存在，用于打包插件维护和兼容性。对于新的频道插件，它们不是推荐模式；除非你正在直接维护该打包插件家族，否则应优先使用通用 SDK 表面的 channel/setup/reply/runtime 子路径。
</Note>

## 下一步

- [Provider 插件](/plugins/sdk-provider-plugins) - 如果你的插件还提供模型
- [SDK 概览](/plugins/sdk-overview) - 完整的子路径导入参考
- [SDK 测试](/plugins/sdk-testing) - 测试工具和契约测试
- [插件清单](/plugins/manifest) - 完整的清单架构.schemas。

## 相关内容

- [插件 SDK 设置](/plugins/sdk-setup)
- [构建插件](/plugins/building-plugins)
- [Agent harness 插件](/plugins/sdk-agent-harness)