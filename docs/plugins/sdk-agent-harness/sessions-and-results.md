---
doc-schema-version: 1
summary: "本机会话绑定、OpenClaw 转录镜像、工具和媒体结果交付、终端工具结果以及固定回合最终确定"
read_when:
  - "您正在存储本机会话、线程或恢复令牌"
  - "您正在返回工具、媒体或最终结果"
  - "您正在实施 `finalizeSettledTurn`"
title: "代理利用会话和结果"
sidebarTitle: "会话和结果"
---

本机会话如何绑定到 OpenClaw 会话并镜像到其记录中，以及工具、媒体、最终结果和已解决的回合结果如何通过尝试结果返回。 [Agent harness插件 ](/plugins/sdk-agent-harness) 参考的一部分。

## <a id="native-sessions-and-transcript-mirror"></a> 原生会话和转录镜像

harness可以保留本机会话 ID、线程 ID 或守护程序端恢复令牌。保持该绑定与 OpenClaw 会话显式关联，并保持将用户可见的 assistant/tool 输出镜像到 OpenClaw 转录本中。

OpenClaw 转录仍然是以下功能的兼容层：

- 频道可见的会话历史
- 转录搜索和索引
- 在后续轮次中切换回内置的 OpenClaw 执行框架
- 通用的 `/new`、`/reset` 以及会话删除行为

对于用户消息镜像，请使用 `openclaw/plugin-sdk/agent-harness-runtime` 中的 `restorePreparedUserTurnOperationalMetaForRuntime({ runtimeMessage, preparedMessage })`。将主机准备的输入的独立可信快照作为 `preparedMessage` 传递。在可以改变它们的钩子之前克隆 `content` 和选定提及的元数据，并保持该快照不变。

帮助程序恢复用户消息的操作元数据，而无需替换本机或钩子重写的内容。非用户运行时消息原样返回。仅当整个 `content` 值与准备好的快照完全匹配时，人类提及才会存活；更改的文本不得继承旧的选择。

恢复的元数据既不授权操作也不证明新的副本附加。追加副本后，将其提交的消息、锚点和实际的 `{ appended }` 结果传递给 `userTurnTranscriptRecorder.markRuntimePersisted(...)`。仅`appended: true`可以触发原始输入提交通知；重复的历史匹配必须报告 `false`。

将本机绑定存储在插件状态中。实施 `reset(...)` 以进行就地会话重置，并实施 `withSessionDeletion(params, run)` 以删除会话密钥，包括过期和维护。同一个key发生变化的物理会话ID是转移，不是删除；保留任何压缩采用路径。

每个进程的每个harness ID 核心都会记录一次重置挂钩失败，包括跨插件重新加载。稍后重置仍会调用该钩子，以便它可以恢复。

当新的默认值为空时，ACPX 会自动将会话从以前的 `<workspace>/state` 默认值迁移到 `<OPENCLAW_STATE_DIR>/acpx`。设置`plugins.entries.acpx.config.stateDir`只是为了保持不同的位置；显式值永远不会被重新定位。失败的采用会发出警告并保留进程的旧位置，因此更新不会默默地隐藏现有会话。

`withSessionDeletion` 在调用 `run` 之前获取本地所有者的租约。对于存储的本机绑定，请使用 `createNativeSessionBindingLifecycleV2`，以便核心可以通过其工作参与者提交删除和回滚。对于仅在提交后运行的效果，请使用 `createNativeSessionCommitFinalizer`。不透明的 `run({ commit, rollback })` 回调仍然保持已弃用的兼容性：对于持久网关删除，核心仅在工作线程确认会话提交后调用 `commit()`，并且不会针对失败的数据库写入调用 `rollback()`。旧版清理失败会发出警告，但不会撤消删除；清理必须容忍会话缺席，并且在进程退出后可以安全地重试。停止的所有者维护和进程本地隐身删除保留其本机交易合同。 `run` 之后保持异步订阅清理；提交会话事务后不要恢复绑定。参见[删除同伴](/plugins/sdk-migration/compatibility-policy#harness-deletion-companions)。

在等待工作之后和改变本机状态之前重新检查 `params.assertCurrent()`。该回调属于一个已注册的harness生命周期；业务结束后保留​​它并不保留权力。删除后挂钩是通知，而不是持久绑定删除的所有者。

当必须通过成功的同键倒回或分支切换使本机绑定无效时，请实施 `withSessionContextReset(params, run)`。此可选挂钩使用相同的准备好的 `commit`/`rollback` 合约，但保留会话密钥和保留的历史记录。核心仅在验证请求的剪切后才提交失效，并在转录事务失败时恢复它。提交的突变解决后释放订阅。可选的 `previousSessionId` 是已记录的前身，允许在压缩后废弃尚未传输的绑定，而无需在准备期间采用它。普通压缩不会调用此钩子并继续保持本机线程连续性。

## <a id="shared-native-binding-lifecycle"></a> 共享本机绑定生命周期

官方harness使用JavaScript-只有私人`openclaw/plugin-sdk/agent-harness-session-runtime`；它不是第三方插件 SDK 合约。绑定突变使用动作绑定插件状态观察和共享状态工作线程中的条件写入。持久的捆绑会话删除和条件回滚在执行代理工作程序中解决。最终的本地租约断言保持同步；不透明发布的删除回调、隐身会话和消息剪切事务保留其现有的本机所有权。 `createNativeSessionBindingLifecycleV2` 拥有精确的代币租赁获取、续订、突变栅栏和事务性 deletion/rollback. 后端通过相同的插件状态命名空间提供 `NativeSessionBindingStateStoreV2`，包括等待的 `lookup`、动作绑定的 `withCurrent` 和同步效果防护 `assertLeaseCurrent`。提供其 `workerCodec`、记录编解码器、acquisition/retention 策略、错误和计时。旧的 `createNativeSessionBindingLifecycle` 及其同步商店视图在 2026 年 12 月 31 日之前仍保持不推荐的兼容性，并在 2027 年 1 月的第一个稳定版本中删除。通过`assertCurrent`传递主机权限，并在`assertRecordCurrent`中验证预期生成。租赁坐标存储；他们不授予执行权。主机事务提交后保持本机清理。

在 `withLease` 内部，调用 `captureLeaseAssertion(key)` 来捕获确切的所有者，并在本机请求或抄本写入之前重新检查其实时、未到期的租约。将其与主机权限结合起来即可正常工作。清理可以在主机退役后使用保留的租约所有权，但必须拒绝过期、替换或关闭的租约，即使harness仍处于活动状态。

等待 `retainNativeSessionGenerationAuthority`、`reclaimNativeSessionGenerationWithAuthority` 和 `resolvePreparedNativeSessionBinding` 在等待期间保留主机代和前代，在过时回收之前采用经过验证的前代。准备好的解析器等待 `readBinding` 并返回 `{ binding, authority, release }`。终端清理后释放`finally`中的捕获； `authority.withLiveness` 借用该捕获进行清理并进行自己的生命周期检查。缺少的主机条目允许短暂会话；读取失败无法授权绑定。老一代助手和已发布的`resolveNativeSessionBindingWithAuthority`保留同步绑定读取仅用于兼容性；参见[代权限迁移](/plugins/sdk-migration/compatibility-policy#native-session-generation-authority)。

`createNativeSessionInitializationOwner` 将绑定和上游链接写入与确切的主机创建句柄相关联。回滚需要匹配的存储、身份、绑定和实时权限，仅删除确切的上游链接，然后调用后端清理。队列选择、本机protocol/policy和资源清理仍保留在后端；核心拥有主机会话生命周期。

## <a id="tool-and-media-results"></a> 工具和媒体结果

### <a id="same-turn-retry-context"></a> 同回合重试上下文

当瞬时故障重试相同任务时，可选的 `params.continuation` 携带主机拥有的恢复上下文。其`prompt`是原来的当前请求；它的 `messages` 按顺序包含已确定的尝试快照，包括已完成的 assistant/tool 消息和工具结果。保持请求在有界历史投影之外可见，并在渲染快照时保留已完成的工具证据。这些事实描述了已完成的工作；他们不会授予执行权限或要求工具再次执行这些工具。

即使准入围栏转录本在当前请求之前结束，Codex 也会使用其现有的有界上下文投影来消耗此载体。继续指令仅保持模型状态，并且不会在另一个用户轮流时持续存在。忽略可选字段的harness保留其现有的基于转录的恢复行为。

`inferToolMetaFromArgs` 来自 `openclaw/plugin-sdk/agent-harness-runtime` 返回紧凑、有损的显示元数据。深度超过 64 层的数组值将被忽略；较浅的兄弟姐妹仍然有助于预览。帮助者可以返回`undefined`。保留原始参数以进行验证和执行：显示元数据既不是参数替换，也不是通用遍历限制。

Core 会构建 OpenClaw 工具列表，并将其传入已准备好的 attempt。当 harness 执行动态工具调用时，请通过 harness 结果结构返回工具结果， 而不是自行发送 channel media。

这使文本、图像、视频、音乐、TTS、批准和消息传递工具输出保持在与 OpenClaw-backed 运行相同的交付路径上。

对于消息传递工具，请从 `openclaw/plugin-sdk/agent-harness-runtime` 读取原始结果的 `details.messageDelivery` 和 `readEmbeddedMessageDeliveryFact`。只有已结算的投递才算作已发送的消息；成功的试运行和抑制发送不得抑制稍后的回复。当工具也报告错误时保留部分交付证据。没有交付事实的消息传递工具结果使用 `isDeliveredMessagingToolResult`，它拥有工具资格和收据解释。对于核心对话工具，它读取原始网关结果的 `details.status`：`sent` 确认交付，`conversations_turn` 的 `replied` 和 `timeout` 也是如此。对等回复超时或关联错误不会撤消通道发送​​或更改工具的错误状态。 `queued`、`suppressed` 和 `unknown` 不会确认传送，即使它们包含准备好的消息 ID。会话协调结果不是外部送达收据。当遗留插件结果需要具体消息 ID 时，请使用 `requirePluginDeliveryId: true`；权威的核心对话状态不需要一个。 `projectPluginMessageDeliveryFact` 将旧结果信封读取到共享交付形状中，保留附件处理的部分交付状态。对于旧消息发送，错误优先于消息 ID，除非结果确认部分传送。使用 `isDeliveredMessagingToolSendToCurrentSource` 进行源路由比较，并使用 `extractMessagingToolSourceReplyPayload` 保留附件元数据和抄本所有者的确认。表示中间件无法建立新的交付事实。

将工具参数不变地传递给执行和事件使用者；以前的 `sanitizeToolArgs` 导出已被删除。使用 `sanitizeToolResult` 进行结果呈现及其共享大小和图像存储规则。它不掩盖秘密。秘密屏蔽属于日志记录和诊断导出边界； `logging.redactPatterns` 不适用于工具或转录内容。

要获得成功的 `sessions_spawn` 结果，请使用 `openclaw/plugin-sdk/agent-harness-tool-runtime` 中的 `normalizeAcceptedSessionSpawnResult` 并将其 `AcceptedSessionSpawn` 保留在尝试的 `acceptedSessionSpawns` 中。在中间件更改其详细信息之前捕获原始结果。保留 `expectsCompletionMessage`：当请求者屈服时，核心需要该事实来传输子完成交付。对于未接受或不完整的收据，帮助程序返回 `null`，并将缺失的完成意图视为 `false`。

仅针对可信harness运行时自行创建并保留的本机工件设置 `AgentHarnessAttemptResult.hostOwnedToolMediaUrls`。每个条目还必须出现在 `toolMediaUrls` 中。切勿包含模型选择的动态工具或 OpenClaw-tool 介质。在 `message_tool_only` 路由上，这种狭窄的出处使本机运行时工件能够在源回复抑制中幸存下来；正常的发送政策和环境房间入场仍然适用。

## <a id="harness-delivery-defaults"></a> harness交付默认值

当harness需要默认可见回复策略时，将 `deliveryDefaults.visibleReplies` 设置为 `"automatic"` 或 `"message_tool"`。显式消息配置仍然优先。

已弃用的 `sourceVisibleReplies` 字段仍然支持已发布的harness插件，包括 2026 年 7 月版本的 `@openclaw/codex`。当两个字段都存在时，`visibleReplies` 优先。插件作者应该迁移到该领域。 10 月 1 日删除日期不会终止合同，而受支持的已发布插件仍然会产生合同。

## <a id="terminal-tool-outcomes"></a> 终端工具结果

`AgentHarnessAttemptParams.observeToolTerminal` 是由主机拥有的终端结果累加器。执行 OpenClaw 动态工具或原生工具的 harness，必须在每个工具达到一个终端结果时调用它，并且要在 attempt 结果最终确定之前调用。不执行工具的 harness 无需调用它。

从执行边界报告事实：

- 传递协议调用id（如果存在）、标准工具名称以及在准备或钩子重写后实际到达工具的参数。
- 将原始主机工具结果或抛出的错误传递为`result`。核心从该对象读取私有效果出处；序列化字段无法提供此证明。投影主机结果时保留内部结果状态。
- 当验证、审批或其他守卫在工具实现开始前阻止调用时，将 `executionStarted: false`。一旦可能已经进行分发，则应保守地报告为 `true`。
- 报告 `outcome: "success"` 或 `outcome: "failure"`。使用运行时提供的结构化失败字段，而不是从显示文本中推断失败。
- 仅对不使用 OpenClaw 工具定义的原生工具使用 `nativeMutation`。在其中提供由协议拥有的变更和重放事实；不要将 OpenClaw 的变更分类器复制到 harness 中。

回调返回该调用的记录分辨率。将其 `lastToolError` 携带到 `AgentHarnessAttemptResult` 中，并在harness投影中使用其执行、参数和副作用事实，而不是导出并行状态。主机在不相关的成功工具之间保留未解决的变异失败，并仅在匹配操作成功后才将其清除。

出于源代码兼容性考虑，该回调对于较旧的实验性 harness 仍然是可选的。但对于执行工具的 harness，可选并不意味着可以忽略：如果没有终端报告，OpenClaw 就无法在后续工具调用之间保留变更工具失败事实，包括安静的心跳完成。

## <a id="settled-tool-finalization"></a> 已解决工具定型

当 harness 已完成所有工具调用，但其原生轮次结束时没有助手文本，OpenClaw 可能需要再生成一次最终可见回答。harness 可以通过实现 `finalizeSettledTurn({ attempt, settledAttempt })` 来选择启用此恢复机制。

该回调是一项独立能力，而不是另一个普通 attempt。它必须：

- 使用精确的受限原生 transcript，或使用在已结算工具结果边界处冻结的完整应用 transcript；
- 不暴露工具、权限授予或用户输入能力、原生执行钩子、agents、skills、memory、调度、扩展或远程控制；
- 仅发送主机提供的最终处理提示；并且
- 如果其选择的 transcript/isolation 策略无法强制执行这些限制，则将拒绝运行。

OpenClaw 在普通尝试和重试循环之外作为终端子操作调用回调一次。失败会结束运行并发出副作用感知不完整转向警告；它无法进入普通的 auth/profile 旋转、模型回退、上下文恢复、压缩延续或钩子请求的修订路径。最终确定还跳过插件提示突变、`before_agent_run`、LLM input/output、终端修订和 `agent_end` 挂钩。核心诊断仍然记录操作及其故障。

回调返回 `AgentHarnessSettledTurnFinalizationResult`，不是普通的尝试结果。其公共字段仅限于完成的助理消息、最终调用使用、转录所有权元数据和诊断跟踪。工具、交付、媒体、生成、生命周期、重播、会话和回退状态不能跨越此结果边界。拒绝未知字段和辅助工具调用。

在内部重用其完整尝试引擎的harness可以在返回之前调用 `projectSettledTurnFinalizationAttemptResult(...)`。助手拒绝记录的故障、工具、交付、重放和生命周期证据，然后仅预测狭窄的结果。它是本机隔离后的纵深防御，而不是消除本机能力面的替代品。

支持投影的harness必须在镜像已确定的转弯后捕获活动分支，并证明当前提示和每个当前工具 call/result 都存在于该边界中。将冻结的证据放在 `settledAttempt.settledTurnFinalizationContext` 上作为以下之一：

- `source: "openclaw-transcript"` 和 `messages`：通过边界的完整申请记录。
- `source: "harness"` 和 `data`：仅由所属harness解释的不可变的有界投影。 Core 传递这个不透明的值；终结器在使用它之前必须验证它自己的上下文类型。
- `source: "unavailable"`：harness允许完成此已确定的转弯，但无法捕获安全重播证据。终结器必须在提供者或本机 I/O 之前拒绝此状态；核心仍然可以使用其现有的主机拥有的后备，而无需重复工具。

不可用状态记录资格，而不是经过验证的历史记录。符合条件的捕获失败，包括丢失、漂移或过大的证据，可能会导致无模型回退。对于工具从最终确定中排除的故障，例如身份验证或使用限制错误，不要发出它。仅命令harness必须在 `messagesSnapshot` 中保留属性辅助工具调用条目；当可见辅助字段不存在时，主机回退可以使用该已解决的批次标识。

在获取消息时强制执行投影限制，而不是在检查其大小之前克隆整个转录本。成功捕获必须在返回尝试之前完成所有身份和来源证据检查。不要在 `data` 中保留开放的成绩单阅读器。终结器必须拒绝丢失、不受支持、不明确或过大的上下文。它不得截断消息、删除早期历史记录或将应用程序投影描述为精确的本机历史记录。恢复一个受限本机会话的harness不需要此投影字段。

不要通过使用尽力 `disableTools` 提示调用 `runAttempt` 来实现此回调。harness所有者必须强制执行完整的本机功能边界。 OpenClaw 不提供通用回退，因为它无法证明任意本机运行时遵守这些限制。

出于实验性第三方 harness 兼容性的考虑，该回调仍然是可选的。当所选 harness 未实现它时，OpenClaw 会保留现有的不完整轮次错误，而不是冒险产生重复副作用。
