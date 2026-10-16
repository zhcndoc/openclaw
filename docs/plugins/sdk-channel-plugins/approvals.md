---
summary: "通道插件的审批功能：审批身份验证、有效负载生命周期和设置指南、本机审批交付以及更窄的审批运行时子路径"
read_when:
  - "您的频道公开本机执行或插件批准"
  - "您需要批准授权、设置指南或基于反应的决策"
  - "您需要狭窄的批准运行时子路径而不是桶"
title: "渠道审批"
sidebarTitle: "批准"
---

大多数频道插件不需要特定于批准的代码。当您访问此页面时，请访问此页面。 [构建频道插件](/plugins/sdk-channel-plugins)指南的一部分。

## <a id="approvals-and-channel-capabilities"></a> 审批和通道能力

大多数频道插件不需要特定于批准的代码。 Core 拥有相同聊天 `/approve`、共享批准按钮有效负载和通用后备交付。 `ChannelPlugin.approvals` 已被删除；将批准 delivery/native/render/auth 事实放在一个 `approvalCapability` 对象上。 `plugin.auth` 仅是 login/logout - 核心不再从该对象读取批准身份验证挂钩。

仅将 `approvalCapability.delivery` 用于本机审批路由或后备抑制，仅当通道真正需要自定义审批负载而不是共享渲染器时才使用 `approvalCapability.render`。 `delivery.shouldBlockForwardingFallback` 拒绝即使没有运行本机处理程序也无法强制执行所选审阅者策略的回退。频道可能需要本地审阅者传送并拒绝所选策略的所有通用转发； `delivery.shouldSuppressForwardingFallback` 仅在本机处理程序处于活动状态时避免重复传递。两者都会收到批准请求有效负载。对于没有缓存待处理请求的终端通知，核心根据已解析的事件重建它，并将 `createdAtMs` 和 `expiresAtMs` 设置为零；策略检查应使用嵌套请求负载。

### <a id="approval-auth"></a> 审批认证

- `approvalCapability.authorizeActorAction` 和 `approvalCapability.getActionAvailabilityState` 是共享审批-授权接口。
- A 通道，强制执行主机配置的、请求范围内的本机卡插件审阅者列表、转发提示和最终决策集 `approvalCapability.supportsScopedPluginApprovalApprovers: true`。当频道存在审阅者策略时，主机会通过没有此标记的旧功能拒绝插件批准路由和决策。保持标记不存在，直到每个批准路径强制执行所选列表。
- 如果插件`/approve`授权需要具有空间资格的审核者ID，则实施`approvalCapability.resolveReviewerSenderId`。核心通过 `cfg`、`accountId`、`senderId` 和 `spaceId`，然后仅将结果用于插件审批命令授权。从经过身份验证的通道入口获取空间；回调未收到待处理的请求。如果未知，则返回 `undefined`：核心保留原始发送者 ID。不合格的原始 ID 无法满足空间合格策略。该通道的 `authorizeActorAction` 和网关托管在做出决定时仍会检查确切的请求。较旧的主机会忽略此可选回调，并保留原始发送者 ID；仅提供不合格 ID 的通道需要一个主机来调用空间合格 `/approve` 策略的回调。
- 使用 `getActionAvailabilityState` 实现同一聊天批准授权可用性。即使本机交付已禁用，配置的批准者仍可用于 `/approve`；使用 delivery/setup 引导的本机初始表面状态。
- 如果您的频道公开本机执行批准，则当它与相同聊天批准身份验证不同时，请使用 `approvalCapability.getExecInitiatingSurfaceState` 作为启动 surface/native-client 状态。 Core 使用特定于 exec 的钩子来区分 `enabled` 与 `disabled`，决定启动通道是否支持本机 exec 批准，并将该通道包含在本机客户端后备指南中。 `createApproverRestrictedNativeApprovalCapability(...)` 为常见情况填写此内容。
- 如果通道可以从现有配置推断出稳定的类似所有者的 DM 身份，请使用 `openclaw/plugin-sdk/approval-runtime` 中的 `createResolvedApproverActionAuthAdapter` 来限制同一聊天 `/approve`，而无需添加特定于批准的核心逻辑。
- 如果自定义审批身份验证有意仅允许相同聊天回退，则从 `openclaw/plugin-sdk/approval-auth-runtime` 返回 `markImplicitSameChatApprovalAuthorization({ authorized: true })`；否则，核心将结果视为显式批准者授权。
- 如果由通道拥有的原生回调直接解析审批，在解析前使用 `isImplicitSameChatApprovalAuthorization(...)`，这样隐式回退仍会经过通道的常规 actor 认证。

### <a id="payload-lifecycle-and-setup-guidance"></a> 载荷生命周期与设置指引

- 当需要通道特定的载荷生命周期行为时，例如隐藏重复的本地审批提示， 或在投递前发送 typing 指示器，使用 `outbound.shouldSuppressLocalPayloadPrompt` 或 `outbound.beforeDeliverPayload`。
- 当通道希望 disabled 路径的回复能够解释启用原生 exec 审批所需的具体配置项时， 使用 `approvalCapability.describeExecApprovalSetup`。该钩子接收 `{ channel, channelLabel, accountId }`；带命名账户的通道应渲染账户范围路径， 例如 `channels.<channel>.accounts.<id>.execApprovals.*`，而不是顶层默认项。
- 当插件审批失败指引在插件审批的 no-route 和超时失败场景中可以安全展示时， 使用 `approvalCapability.describePluginApprovalSetup`。 `createApproverRestrictedNativeApprovalCapability(...)` 不会从 `describeExecApprovalSetup` 推断这一点；只有当插件审批和 exec 审批确实使用相同的原生设置时， 才显式传入相同的 helper。

### <a id="native-approval-delivery"></a> 原生审批投递

如果通道需要本机批准交付，请将通道代码重点放在目标规范化和 transport/presentation 事实上。使用 `openclaw/plugin-sdk/approval-runtime` 中的 `createChannelExecApprovalProfile`、`createChannelNativeOriginTargetResolver`、`createChannelApproverDmTargetResolver` 和 `createApproverRestrictedNativeApprovalCapability`。将特定于通道的事实放在 `approvalCapability.nativeRuntime` 后面，最好是通过 `createChannelApprovalNativeRuntimeAdapter(...)` 或 `createLazyChannelApprovalNativeRuntimeAdapter(...)`，这样核心就可以组装处理程序并拥有自己的请求过滤、路由、重复数据删除、到期、网关订阅和路由到其他地方的通知。

`nativeRuntime`被分成几个较小的接口：

- `availability` - 账户是否已配置，以及请求是否应被处理
- `presentation` - 将共享审批视图模型映射到 pending/resolved/expired 本机有效负载或最终操作
- `transport` - 准备目标以及 send/update/delete 本机批准消息
- `interactions` - 用于本机按钮或反应的可选 bind/unbind/clear-action 挂钩，以及可选的 `cancelDelivered` 挂钩。当 `deliverPending` 注册进程内或持久状态（例如反应目标存储）时实现 `cancelDelivered`，以便如果处理程序停止在 `bindPending` 运行之前取消传递，或者当 `bindPending` 不返回句柄时，可以释放状态
- `observe` - 可选的投递诊断钩子

本机审批运行时可以接收三种审批类型：`exec`、`plugin` 和 `system-agent`。 `system-agent` 请求要求操作员批准网关端持久更改，例如配置写入或网关重新启动。运行时必须呈现键入的批准操作，然后呈现最终的应用程序结果。允许的请求可以按已应用或未应用的方式完成；不要将记录的批准单独视为变更完成的证据。

反应绑定必须在决策解析过程中保留显式批准类型，包括在加载持久插件状态之后。 iMessage 本机轮询和反应索引在重新启动后遵循相同的规则。

其他审批帮助器：

- 使用 `openclaw/plugin-sdk/approval-reaction-runtime` 中的 `settleApprovalReaction` 进行明确授权的反应决策。它检查提供的批准者和参与者授权，延迟加载网关解析器，并等待每个终端结果（包括丢失的点击）或未找到批准错误的 `clearTarget`。在插件中保留传输身份、路线检查、清理和结果记录。解析器错误会在绑定完好无损的情况下传播；通道必须将它们交给其持久入口或轮询器进行重播。 `readApprovalReactionTargetRecord` 验证共享持久化字段；特定于运输的路线和作者字段仍然需要自己的验证。
- 在完成注册或清理之前等待`createApprovalReactionTargetStore().register(...)`和`.delete(...)`。两者都在等待存储之前更新其内存索引。可选存储故障保留现有策略：报告故障、禁用持久访问并保留内存回退。和解仅在清理完成后报告解决情况；清理失败会传播，但不会报告为网关解析失败。
- 使用`openclaw/plugin-sdk/approval-runtime`中的`formatChannelApprovalResolvedLabel`和`buildSystemAgentApprovalResolvedText`进行终端演示。丰富的标签保留应用程序状态优先级； prose 保留拒绝优先级，因为被拒绝的系统更改也可以报告 `not-applied`。两者都优先考虑取消。通过用于特定于传​​输的标签拼写的决策格式化程序，并在构建散文之前准备任何有界操作摘要。使用 `formatApprovalDecisionLabel` 记录决定，并不意味着申请已完成。
- 批准帐户查找助手 `resolveApprovalRequestAccountId` 和 `resolveApprovalRequestChannelAccountId` 使用 `approval-native-runtime`。它们的重复 `approval-runtime` 导出及其未使用的 `matchesApprovalRequestSessionFilter` 导出已停用。核心实现没有变化。
- 将 `openclaw/plugin-sdk/approval-runtime` 中的 `createNativeApprovalControlRegistry` 用于进程本地本机卡令牌。每个实例都拥有一个 1,024 绑定的 FIFO 注册表，并通过网关解析和终端卡更新来持有其声明。未获得批准将取消其代币；其他失败则释放重试请求。插件在调用 `settle` 之前验证本机事件范围并授权参与者，通过 `releaseClaimOnLookupExpiry` 保留其查找过期策略，并使用 `onComplete` 进行传输拥有的清理（例如手动提示抑制）。
- 当通道同时支持会话源本机传送和显式批准转发目标时，使用 `openclaw/plugin-sdk/approval-native-runtime` 中的 `createNativeApprovalChannelRouteGates`。该帮助程序集中了批准配置选择、`mode` 处理、agent/session 过滤器、帐户绑定、会话目标匹配和目标列表匹配，而调用者仍然拥有通道 ID、默认转发模式、帐户查找、启用传输的检查、目标规范化和转向源目标解析。不要用它来创建核心拥有的渠道策略默认值；显式传递通道记录的默认模式。未使用的 `createChannelApprovalForwardingEvaluator` 导出已停用；该路由门助手仍然是受支持的路由路径。
- `createNativeApprovalMessagingTargetResolvers` 集中处理消息传输中的通道匹配以及 `{ to, accountId, threadId }` 规范化，这些传输的原生审批目标是通道自有的规范化目的地。 请将群组授权、审批人映射和其他传输策略保留在通道插件中。
- `createChannelNativeOriginTargetResolver` 默认情况下对 `{ to, accountId, threadId }` 目标使用共享通道路由匹配器。仅当通道具有特定于提供商的等效规则（例如 Slack 时间戳前缀匹配）时才传递 `targetsMatch`。当通道需要在默认路由匹配器或自定义 `targetsMatch` 回调运行之前标准化提供者 ID 时，传递 `normalizeTargetForMatch`，同时保留原始的传递目标。仅当已解析的交付目标本身应标准化时才使用 `normalizeTarget`。
- 如果通道需要客户端、令牌、Bolt 应用或 webhook 接收器等由运行时拥有的对象，请通过 `openclaw/plugin-sdk/channel-runtime-context` 注册它们。通用的运行时上下文注册表可以让 core 从通道启动状态引导基于能力的处理器，而无需添加审批专用的包装代码。
- 仅当能力驱动接口的表现力还不够时，才达到较低级别的 `createChannelApprovalHandler` 或 `createChannelNativeApprovalRuntime`。
- 原生审批通道必须通过这些帮助器传递 `accountId` 和 `approvalKind`。`accountId` 确保多账户审批策略限定在正确的机器人账户范围内，而 `approvalKind` 则使通道能够处理 exec 与插件审批行为，无需在 core 中使用硬编码分支。
- Core 也拥有批准重新路由通知。频道插件不应从 `createChannelNativeApprovalRuntime` 发送自己的“批准已转至 DM/另一个频道”后续消息；相反，通过共享审批功能帮助程序公开准确的来源 + 批准者-DM 路由，并让核心在将任何通知发布回发起聊天之前聚合实际交付。
- 端到端保留交付的批准ID类型。本机客户端不应从通道本地状态猜测或重写 exec 与插件批准路由。
- 将显式的 `approvalKind` 传递给 `resolveApprovalOverGateway`。这使用共享的 `approval.resolve` 服务，并在另一个表面首先回答时返回记录的获胜者。旧的显式 `resolveMethod` 输入仍然用于命令支持的控件；新的本机操作不得使用它或从 ID 推断类型。
- 不同的批准类型可以有意暴露不同的本机表面。当前捆绑示例：Matrix 为执行和插件批准保留相同的本机 DM/channel 路由和反应 UX，同时仍然让身份验证因批准类型而异； Slack 使本机审批路由可用于 exec 和插件 ID。
- `createApproverRestrictedNativeApprovalAdapter` 仍作为兼容性包装器存在，但新代码应优先使用能力构建器，并在插件上暴露 `approvalCapability`。

### <a id="narrower-approval-runtime-subpaths"></a> 更窄的审批运行时子路径

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

同样地，在不需要全部功能时，优先使用 `openclaw/plugin-sdk/reply-runtime`、 `openclaw/plugin-sdk/reply-dispatch-runtime`、`openclaw/plugin-sdk/reply-reference` 和 `openclaw/plugin-sdk/reply-chunking`，而不是更宽泛的总入口。
