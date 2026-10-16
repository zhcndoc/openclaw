---
summary: "所选工具在尝试期间和之后调用的运行时助手：注入、中间件、结果分类、用法和代理端副作用"
read_when:
  - "您在实时运行期间接受转向或排队输入"
  - "您正在工具结果到达模型之前对其进行转换"
  - "您正在报告输出令牌或运行代理端副作用"
title: "代理利用尝试运行时"
sidebarTitle: "尝试运行时"
---

选定的工具在尝试运行和完成时调用的帮助程序：受保护的输入注入、工具结果中间件、终端结果分类、实时令牌使用和代理端副作用。 [Agent harness插件 ](/plugins/sdk-agent-harness) 参考的一部分。

## <a id="guarded-active-run-injection"></a> Guarded 主动运行注入

接受源绑定控件广告的后端`messageInjectionV2`在他们的主动运行手柄上。该功能是根据上下文键入的`setActiveEmbeddedRun`从`openclaw/plugin-sdk/agent-harness-runtime`；它的类型也可以从该函数的句柄参数派生。它需要`version: 2`， `isAvailable()`， 和`queueMessage(text, options, assertCurrent, authorityKind)`。所需的第三个参数是该单独注入的主机拥有的断言，而不是运行ID、指纹或诊断身份。所需的`authorityKind` is `"run"`对于普通输入或`"source-bound"`对于其源生命周期也限制调度的输入。两者都保留了后备运行检查；源绑定输入绝不能重新标记为普通输入。

在等待准备之后以及在队列突变或提供者分派之前立即调用 `assertCurrent()` 以及后端自己的实时运行检查。主机将错误正常化或将源权威置于拒绝状态，并保持该注入被撤销，即使该源稍后再次显示为当前状态。插件调用提供的断言；他们没有重建其权威。批量后端保留并重新验证每个项目的断言，包括在重试之前；省略撤销的项目，而不取消独立接受的工作或毒害后来授权的控制。

如果提供，请在输入提交、取消或最终拒绝后调用 `options.onQueueSettled()` 一次。 `onQueueAccepted(true)` 仅报告入场。提前返回 `waitForTranscriptCommit: false` 的后端会保留结算回调，直到其确切的输入完成； core 使用它来释放所选发件人保留的源权限。

可选的 V2 `claimPendingUserInputAnswer(text, options, assertCurrent, authorityKind)` 和 `cancelPendingUserInput(resolvedBy, assertCurrent, authorityKind)` 方法需要相同的断言和权限类型。通过问题登记和坚持进行到最终索赔或取消边界。不要通过仅在调用本身在分派之前等待的 SDK 方法之前进行检查来实现 V2。如果接收器无法强制执行断言，则不支持 V2。

V1、`messageInjection`、队列选项、`queueAgentHarnessMessage` 和 v2026.8.1 中提供的 `setActiveEmbeddedRun` 签名保持源兼容。将解析的代理 ID 作为第五个 `setActiveEmbeddedRun` 参数传递，以便原始 `global` 和 `unknown` 密钥保留其所有者。匹配的实时主机绑定内的旧调用继承其经过验证的代理；单独的环境调用者不提供所有权。在该绑定之外，省略的所有权使用限定的会话密钥或为会话活动配置的默认代理。无范围 V1 注入保留其现有行为。源绑定控件需要 V2 并在队列或 I/O 之前明显拒绝（当只有 V1 可用时）；它们永远不会退回到未经检查的 V1 回调。现有的弃用窗口保持不变。

Copilot 仅保留 V1-：`@github/copilot-sdk` 1.0.11 在 `send` 条目之后等待跟踪上下文和 JSON-RPC 编写器准备，而没有最终调度保护。因此，作用域转向在其队列、问题声明或提供者 I/O 之前失败；普通的无作用域注入没有改变。检查状态、取消运行或启动新的显式请求。当支持保护注入时更新运行时。一旦上游提供最终调度断言，将 Copilot 迁移到 V2 并删除此内部 V1 依赖；不要添加未经检查的后备或缩短已发货的 API 的弃用窗口。

## <a id="tool-result-middleware"></a> 工具结果中间件

当捆绑的插件和显式启用的具有匹配清单合约的安装插件的清单在 `contracts.agentToolResultMiddleware` 中声明目标运行时 id 时，可以通过 `api.registerAgentToolResultMiddleware(...)` 附加运行时中立的工具结果中间件。此可信接口用于异步工具结果转换，该转换必须在所选harness将工具输出反馈回模型之前运行。支持的运行时 ID 为 `agentsapi`、`codex` 和 `openclaw`。

中间件选项可以将 `runtimes` 与 `matcher` 工具名称列表结合起来。每次注册都会保持该对的完整性，因此为不同的运行时注册相同的处理程序不会扩展任何一个匹配器。匹配器使用非空标准 OpenClaw 工具 ID；省略 `matcher` 以匹配所有工具。

省略 `runtimes` 使用插件的 `contracts.agentToolResultMiddleware` 中声明的每个支持的运行时，包括声明时的 `agentsapi`。仅提供 `runtimes` 以选择该声明的子集。注册会拒绝空的运行时列表或清单中缺少的任何目标运行时。

旧版捆绑插件仍然可以使用 `api.registerCodexAppServerExtensionFactory(...)` 来注册仅限 Codex app-server 的中间件，但新的结果转换应使用与 runtime 无关的 API。仅供嵌入式 runner 使用的 `api.registerEmbeddedExtensionFactory(...)` 钩子已被移除；嵌入式工具结果转换必须使用与 runtime 无关的中间件。

在中间件转换其结果之前，保留来自主机消息工具的`details.messageDelivery.sourceReplyDelivered`，并将其带入尝试结果中。这确认了最终的外部源回复，并且不依赖于目标参数或转录镜像。

使用同一运行时子路径中的 `extractMessagingToolSourceReplyPayload(result)` 通过表示更改保留内部源回复有效负载。对于已确认的消息传送，`collectMessagingMediaUrlsFromRecord(args)` 会收集其附件引用以进行传送重复数据删除。两个助手都不会建立传递或授予本地文件信任。

## <a id="reply-attachments-from-a-remote-workspace"></a> 从远程工作区回复附件

文件为远程的harness可以在关闭其文件传输之前调用可选的 `params.hostCapabilities.prepareReplyMedia`。主机应用现有的发送方读取策略和 channel/account 字节限制，然后保存授权的附件字节以供传送。

| 要求                      | 结果             | 驾驭行动                                                                                            |
| ---------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------- |
| `kind: "attempt"`, `attempt` | `preparedMedia`    | 在同一结果对象上设置 `attempt.preparedReplyMedia`。核心在最终答案选择后应用它。 |
| `kind: "payload"`, `payload` | 准备`payload` | 通过 `onBlockReply` 交付此副本；保持持久化消息不变。                           |

两个请求均提供 `readWorkspaceFile(relativePath, { maxBytes, signal })`。读者必须强制执行字节限制和工作区边界并遵守取消。它仅接收根据主机捕获的策略授权的路径。当远程工作空间具有不同的绝对路径时，提供 `workspaceRoot`；主机在检查策略之前将该别名映射到逻辑工作区。当本机会话或传输所有权可以独立于主机尝试撤销时，提供 `assertCurrent`。主机在最终介质写入和发布期间保留此附加检查。让读者保持活力，直到准备工作完成。

这些回复中的原始文件路径属于远程工作空间。即使网关本地文件存在于同一路径中，该工作区之外的路径也会失败并显示带标签的远程文件通知。 HTTP 参考和经过安全验证的网关托管媒体（包括 `media://` 附件）仍然可用。

对于提供者已承认其字节的工件，请将 `kind: "artifact"` 与 `buffer`、`fileName`、`assertCurrent` 和可选的 `signal` 一起使用。主机将这些确切的字节存放在捕获的 channel/account 字节限制之下，并返回准备好的 `payload`。此请求不允许文件系统读取，也不应用图像转换或主机文件 MIME 白名单。在下载之前，该工具拥有对提供者工件的会话、轮次、环境和路径的验证；主机拥有出站目标并通过发布保留实时权限。

丢失、拒绝和超大附件会产生常见的递送失败通知；准备工作不会回退到过时的网关工作区文件。准备好的事实包含文件位置和故障，而不是实时读取器。不要重写助理文本或转录消息以插入网关文件路径。当该能力不存在时，该远程附件准备不可用。

## <a id="shared-attempt-mechanics"></a> 共享尝试机制

官方原生harness使用私人 `openclaw/plugin-sdk/agent-harness-attempt-runtime` 中的 `buildCurrentInboundPrompt`，使用通道的连接器将准备好的 `currentInboundContext` 与当前提示结合起来。随每条消息提交此上下文，包括恢复的会话。转向系统收到自己的`options.currentInboundContext`；不要重用初始回合的上下文。将上下文排除在原始用户记录和待决问题答案文本之外。对话字段是模型上下文，而不是工具权限。

`openclaw/plugin-sdk/agent-harness-runtime` 中的 `resolveAgentHarnessBeforePromptBuildResult` 运行带有准备好的历史记录和工具权限的提示钩子。传递承认的消息为`currentUserMessage`；帮助程序提取其文本部分和 `idempotencyKey` 用于普通和授权的挂钩。仍然支持字符串输入和单独的 `currentUserMessageId`。当不存在承认的消息时，harness拥有后备。

提供 `messages` 作为数组或异步加载器，仅当 `before_prompt_build` 挂钩需要历史记录时运行。仅心跳贡献不读取对话历史记录。生产专用 `resolveAgentHarnessHistoryLimits` 帮助程序应用共享 Codex 和代理 API 转录本读取预算。

代理 API 保留第一个成功准备的、有界的挂钩历史记录，以重试相同的逻辑运行和本机会话。提示钩子仍会在每次尝试时使用当前输入和实时主机权限运行；他们的历史记录保留在原始的回合前快照。因此，接受的转向不会强制读取原始消息现已过时的承认的新记录。此快照是数据，而不是更新的转录本读取权限：下一个逻辑运行会观察到后续的转录本更改，并且更改的记录器、会话、运行身份或历史预算需要重新读取。会话重置和运行取消保留其现有的权限检查。

`developerInstructions.build` 回调接收 `toolsAllow` 和 `hasToolRestrictions`。省略的策略或修剪的 `*` 条目不受限制；空列表或没有 `*` 的列表是限制性的。在授权召回运行之前，后端强制执行每轮限制，在该回调中应用或拒绝它们。代理 API 继续使用挂钩上下文，但不强制执行挂钩工具列表。

官方harness使用 JavaScript-only 私人 `openclaw/plugin-sdk/agent-harness-attempt-runtime` 进行截止日期、取消和 lifecycle/event 发布；它不是第三方插件 SDK 合约。 Codex 和 AgentsAPI 还使用 `shouldIncludeAgentHarnessRuntimeContext` 从轻量级 cron 输入中排除运行时提示添加，并使用 `resolveAgentWorkspaceMemoryRouting` 选择允许的内存工具并检查它们是否到达提示工作区。后端保留工作区选择、工具名称规范化和本机提示渲染。

`createAgentHarnessAttemptDeadlineController`取原始`startedAtMs`，执行`timeoutMs`，后端`settlementTimeoutMs`，中止`signal`，超时回调。第一个`beginSettlement(receivedAtMs)`开始绝对结算期限；重复调用不会延长它。中止或 `dispose()` 将其关闭。 `createAgentHarnessAttemptCancellation` 保留明确的取消原因并冻结航站楼边界的入场。 `emitAgentHarnessAttemptEvent` 隔离观察者故障，`createAgentHarnessAttemptLifecycle` 门控生命周期事件并消除执行阶段的重复数据。本机中断、完成决策、输出刷新和清理仍然由后端拥有。

助理事件 `data.itemId` 标识累积快照和增量合并的本机文本项。在继续流式传输时保留项目的一部分的harness还提供 `data.occurrenceId`，这是一个标识确切实时间隔的不透明字符串。在等待持久性之前，捕获候选转录本时冻结该事件，并为后续字节分配新的事件，而不更改本机项 ID 或增量文本。成功的转录本发布提供 `assistantItemIds` 中捕获的 ID；失败的写入不会使它们退役。重试会保留候选中实际包含的每个事件。如果没有 `occurrenceId`，则停用将使用 `itemId` 或主机的源收据。没有任何身份的文本将保持有效，直到最终结算；仅匹配持久文本并不能证明所有权。

私有`openclaw/plugin-sdk/agent-harness-tool-runtime`通过`createAgentHarnessToolExecutionRegistry`和`createAgentHarnessToolExecutionBoundaryRegistry`提供相关的执行承诺和argument/start快照。已使用的快照无法因延迟完成而重新发布。核心工具防护罩和`observeToolTerminal`保持权威；本机解码和结果编码留在harness中。

## <a id="shared-host-tool-result-facts"></a> 共享主机工具结果事实

官方harness仅使用私有JavaScript-`openclaw/plugin-sdk/agent-harness-tool-runtime`来执行主机工具并记录便携式工具事实。 `runAgentHarnessToolInvocation` 拥有参数准备、现有执行边界的验证、单调执行快照、中间件和清理。其结果和失败回调将这些事实传递给本机适配器，而不接管其收据或超时所有者。 `recordAgentHarnessToolResultTelemetry` 使用调用者准备的源回复投影来收集主机工具传递、媒体、TTS、cron 和心跳事实。当表示中间件重写结果时，调用会保留执行失败。 `recordAgentHarnessMessagingDelivery` 记录已确认的消息传送，`recordAgentHarnessToolResultMedia` 收集并信任过滤所呈现的媒体。调用者保留其本机接收、路由、取消和结果编码合约；这些帮助者不建立交付或授予执行权。

## <a id="workspace-staged-attachments"></a> 工作区暂存附件

承认的附件事实可以指在准备好的工作区而不是托管媒体存储下暂存的文件。使用 `openclaw/plugin-sdk/file-access-runtime` 中的 `root(workspaceDir)` 和 `createStagedInputPathMatcher(root)` 在有界 `root.read(relativePath, { maxBytes })` 之前验证暂存所有权。将事实的工作空间与尝试准备的工作空间相匹配，通过等待的读取保留主机当前运行的断言，并使用承认的媒体事实而不是从用户或模型文本中提取的路径。匹配器共享暂存所有者的精确标记合同并仅缓存该捕获的结果。

## <a id="final-tool-argument-validation"></a> 最终工具-参数验证

官方本机harness适配器可以从主机绑定工具的 `execute` 调用周围的私有 `openclaw/plugin-sdk/agent-harness-tool-runtime` 调用 `runWithToolExecutionValidation(callId, validate, execute)`。验证器在策略和调用前挂钩在现有工具执行边界调整最终参数后接收最终参数。对声明的工具架构使用共享架构验证助手。不要复制私有验证标记或运行第二个调用前挂钩。验证的范围仅限于工具调用，并且与并发调用保持隔离。

在中间件之前保留已接受的后台工作：`openclaw/plugin-sdk/agent-harness-tool-runtime` 中的 `isAsyncStartedToolResult` 和 `readAsyncStartedTaskIds` 公开其任务元数据。 `openclaw/plugin-sdk/agent-harness-tool-runtime` 中的 `normalizeAcceptedSessionSpawnResult` 保留子会话的完成所有权。将他们记录的事实带入尝试结果中，以便恢复无法重放已接受的工作。

## <a id="terminal-outcome-classification"></a> 终端结局分类

当完成的转弯没有产生可见的辅助文本时，拥有自己的协议投影的本机harness可以使用 `openclaw/plugin-sdk/agent-harness-runtime` 中的 `classifyAgentHarnessTerminalOutcome(...)`。帮助程序返回 `empty`、`reasoning-only` 或 `planning-only`，因此 OpenClaw 的后备策略可以决定是否在不同的模型上重试。 `planning-only` 需要harness的显式 `planText` 字段； OpenClaw不是从助理散文中推断出来的。帮助者故意将提示错误、飞行中转弯和故意无声回复（例如 `NO_REPLY`）保留为非机密。

## <a id="live-output-token-usage"></a> Live 输出令牌使用情况

每个完成的模型响应调用一次 `params.hostCapabilities.reportOutputTokens?.(outputTokens)`。传递该响应的输出标记，而不是线程生命周期或累积尝试总数。在调用本机响应通知之前对其进行重复数据删除。

主机将此回调绑定到已承认的运行，将响应添加到其生命周期范围的总数中，并通过 `params.onAgentEvent` 全局发布累积的 `usage` 事件。不要发出第二次使用事件。重试共享相同的运行总数；运行 cleanup 释放它。关闭或被取代的功能拒绝报告。无效或非正计数不会发出事件。

该功能是可选的，以便与旧主机兼容；如果不存在，则实时输出令牌报告不可用。将上次响应上下文快照和持久计费使用情况与此实时计数器分开。

## <a id="agent-end-side-effects"></a> 代理端副作用

本机harness在完成尝试后必须等待来自 `openclaw/plugin-sdk/agent-harness-runtime` 的 `runAgentEndSideEffectsAsync(...)`。它在释放轮次租约之前通过历史记录阅读器准备转录锚点，然后启动便携式 `agent_end` 挂钩而不等待它。使用 `awaitAgentEndSideEffects(...)` 进行本地非交互式运行，这些运行还必须等待插件挂钩。同步 `runAgentEndSideEffects(...)` 在 2026 年 12 月 31 日之前仍然被弃用，并在 2027 年 1 月的第一个稳定版本中删除。这些助手接受与 `runAgentHarnessAgentEndHook(...)` 相同的 `{ event, ctx }` 有效负载；他们的失败不会改变已完成的尝试结果。

通过使用来自尝试运行的同一 `EmbeddedRunAttemptParams` 的 `buildEmbeddedForegroundPromptContext(params, agentDir)` 构建的 `ctx.foregroundPromptContext`。独立的技能工坊体验审核会根据该上下文重建其系统提示和工具目录，因此审核共享前台回合的提示缓存前缀。仅对于没有前台提示符的运行省略它，例如 CLI 挂钩上下文；对于这些内容，将跳过审核。
