---
summary: "通道运行时状态信号以及媒体和负载整形：生命周期状态、类型指示器、媒体源参数和本机负载整形"
read_when:
  - "您发布频道帐户生命周期状态或键入指示器"
  - "您需要帐户媒体限制、托管媒体商店或入站媒体事实"
  - "您正在塑造本机卡、块或分组媒体负载"
title: "频道状态和媒体"
sidebarTitle: "状态和媒体"
---

发布通道运行时状态、解决媒体限制并塑造本机有效负载。 [构建频道插件](/plugins/sdk-channel-plugins)指南的一部分。

## <a id="runtime-lifecycle-status"></a> 运行时生命周期状态

对于由渠道编写的运行时状态，`ChannelAccountSnapshot.lifecycle` 是 `healthState` 的后继者。在采用过程中，现有插件可以继续发布 `healthState`，并且仍支持核心派生的策略写入。暂无移除日期；移除时间取决于外部渠道插件的采用情况。

## <a id="typing-indicators"></a> 打字指标

如果您的频道支持在入站回复之外输入指示符，请在频道插件上公开 `heartbeat.sendTyping(...)`。在心跳模型运行开始之前，Core 使用已解析的心跳传递目标调用它，并使用共享类型 keepalive/cleanup 生命周期。当平台需要明确的停止信号时添加`heartbeat.clearTyping(...)`。

## <a id="media-source-params"></a> 媒体源参数

使用 `openclaw/plugin-sdk/account-helpers` 中的 `resolveChannelMediaMaxBytes(...)` 解决帐户媒体限制。将已合并账户的`mediaMaxMb`通过`resolveChannelLimitMb`传递出去；仅当 account/channel 限制不存在时，帮助程序才应用代理默认值。其可选字节结果必须到达实际的媒体加载器，并受到任何传输上限的限制。未配置限制时保留加载程序的现有默认值。

集中的帐户帮助程序导入使设置和帐户解析不受媒体分析运行时间的影响。旧的 `media-runtime` 导出仍然可用于现有的外部插件，但新的和捆绑的调用者应使用集中导入。

如果你的 channel 为消息工具参数添加了媒体来源，请通过 `plugin.actions.describeMessageTool(...).mediaSourceParams` 暴露这些参数名。core 会使用这个显式列表进行 sandbox 路径规范化和 outbound 媒体访问策略，因此插件不需要为特定 provider 的头像、附件或封面图参数添加 shared-core 特例。

建议使用按 action 键控的映射，例如 `{ "set-profile": ["avatarUrl", "avatarPath"] }`，这样无关的 actions 就不会继承另一个 action 的媒体参数。若这些参数本来就是要在所有暴露的 actions 中共享，扁平数组仍然可用。

必须为平台端媒体获取公开临时公共 URL 的通道可以使用来自 `openclaw/plugin-sdk/outbound-media` 的 `createHostedOutboundMediaStore(...)` 以及插件状态存储。将平台路由绑定和令牌认证保留在通道插件中。对于命名空间的功能查询参数，`resolveHostedOutboundMediaRequest(req, res, prefix)` 对于不相关的请求返回 `false`，在拒绝不明确的令牌或不支持的方法后返回 `true`，或者对于要进行身份验证的插件返回 `{ url, id, token, method }`。它仅接受带有一个 `<prefix>_<24-character lowercase hex ID>` 参数的 `GET` 和 `HEAD`。 `resolveOutboundMediaAccess(params)` 在加载之前将当前的 `mediaAccess` 与旧的本地根和读取器参数相结合。

`prepareUrl({ mediaAccess })` 将主机授权的本地媒体访问转发到共享出站加载程序。为了兼容，托管媒体容量默认为 `overflowPolicy: "evict-oldest"`。当发布的 URL 必须在到期前保持有效时，请使用 `"reject-new"`，并使用 `"reject-new"` 配置两个后备键控存储，以便独立编写者无法逐出活动行。当传输必须拒绝有效负载类时，使用 `validateBeforePersist` 检查受保护的加载程序的确切字节和元数据。将其缓冲区视为只读，并在功能创建或任何存储写入之前抛出拒绝。在调用 `read(...)` 之前使用 `readMetadata(...)` 验证承载请求，以便无效令牌和 `HEAD` 请求不会合并存储的媒体块。

入站附件使用有序事实，而不是并行 `Media*` 字段。使用 `openclaw/plugin-sdk/channel-inbound` 中的 `toInboundMediaFacts(...)` 规范化通道记录，并在构建入站上下文时将它们作为 `media` 传递。当插件必须授权本地媒体读取时，请从聚焦的 `openclaw/plugin-sdk/media-local-roots` 子路径导入 `getAgentScopedMediaLocalRoots(...)` 或 `getAgentScopedMediaLocalRootsForSources(...)`。代理范围的根不授予共享沙箱父级。要发送在活动沙箱中生成的文件，请将其权威会话工作区作为第三个参数传递给 `getAgentScopedMediaLocalRoots(...)` 或作为 `sessionWorkspaceDir` 传递给源帮助程序。从可信主机会话上下文获取该值；永远不要从请求的媒体路径中派生它。如果没有该上下文，仅限工作区的策略会故意拒绝沙箱路径。旧的 `agent-media-payload` builder/root 外观已弃用。

## <a id="native-payload-shaping"></a> 本机有效负载整形

仅当负载发送方拥有多附件分组时才设置`outbound.sendPayloadGroupsMedia: true`。然后，当其持久有效负载和协调功能允许时，核心会为该发送者保留多媒体列表。如果没有这种明确的选择加入，普通附件将保留按项目交付。

分组发送者必须在每次物理发送之前和等待准备之后检查出站上下文的 `signal`，并在每个发送边界保留平台调度和当前所有者回调。单独声明通用有效负载支持并不会选择插件承担此责任。

如果你的通道需要对 `message(action="send")` 进行提供商特定的整形，优先使用 `actions.prepareSendPayload(...)`。将原生卡片、区块、嵌入内容或其他持久化数据放在 `payload.channelData.<channel>` 下，并让核心通过 outbound/message 适配器发送。仅将 `actions.handleAction(...)` 用作无法序列化和重试的负载的兼容性回退方案。

对于发送操作，在调用 `sendDurableMessageBatch(...)` 时保留可信上下文的 `onPlatformSendDispatch`、`assertDirectAdapterHandoff` 和 `skipQueue`。这些字段来自主机，而不是操作参数。在每次物理发送之前等待调度回调，然后在准备或限制等待之后以及平台 I/O. 之前立即调用同步断言封闭的所有者必须停止每个剩余的发送。

`skipQueue: true` 使发送与可重播恢复的实时运行相关联。单独的`deliveryRetryOwner`字段控制谁来处理失败的传递；它不会扩大运行的权限。操作员发送保留正常的持久队列。不要序列化权限回调或在面向模型的操作架构中公开这些字段。

## <a id="progress-card-handoff"></a> 进度卡切换

等待回复可以在其回复调度上下文中携带可选的主机拥有的 `info.adoptProgressDraft(draft)` 功能。可编辑进度适配器使用它来保持已经可见的卡处于活动状态，而孩子或独立媒体生成运行轮流等待运行，而不是发送替换卡或信用最终答案交付。

排空并冲洗现有草稿，重新检查`assertPlatformSendAuthorized`，并确认平台接受该卡。暂存的内容或不明确的发送不计入在内。然后用两种同步方法传递草稿：`push(item)`在同一张卡上渲染准备好的进度项，`retire()`将其删除。只有 `true` 结果转移监护权：分离旧流而不删除其消息。如果该功能不存在或拒绝，请保留普通回复传递，包括等待文本旁边的任何媒体或控件。

适配器不断渲染、限制和删除。 `retire()` 立即撤销该卡：拒绝在网络之前仍在等待平台准入的任何编辑 I/O. 切勿序列化该功能，将其暴露在操作参数中，或重用旧回合的回调。

来自 2026.9.8 的基于收据的 `info.adoptProgressContinuation(receipt)` 保持源兼容，但已弃用。主机不再提供它，因此检查它的适配器保持普通的等待答复传递。

## <a id="post-delivery-pins"></a> 交付后引脚

`outbound.pinDeliveredMessage` 接收与消息发送相同的可选 `assertDirectAdapterHandoff` 回调。该字段将现有的发货人的权限带入后续的pin操作中；接受该消息不会授权该所有者关闭后的后续 pin 请求。通过异步准备保留回调，并在每个提供程序请求之前立即检查它，包括重试。 Telegram 将其转发到现有的 `assertPlatformSendAuthorized` 传输选项，该选项在帐户限制释放每个请求后进行检查。

使用同步断言进行此检查。 `onPlatformSendDispatch` 还记录调度时间，并且不能替代权威声明。提交 pin 请求后，保留其接受的结果，而不是在响应后再次检查权限。可选的引脚故障保持交付成功；所需的引脚故障将发送的消息和收据保留在 `sendDurableMessageBatch` 的 `partial_failed` 结果中。

新的 pin-context 字段是可选的，因此现有的调用者和插件签名保持源兼容。没有它的调用者将保留其现有行为；不要在配置、操作模式或存储的负载中公开它。请参阅 [ 消息演示和传递 ](/plugins/message-presentation) 了解引脚选项。
