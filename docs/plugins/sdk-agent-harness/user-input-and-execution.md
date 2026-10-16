---
summary: "阻止用户输入界面、主机工具功能、执行审查结果和配对设备命令权限"
read_when:
  - "您正在公开运行时级别的用户输入请求或 `ask_user`"
  - "您正在通过 `params.hostCapabilities` 绑定工具表面"
  - "您正在处理执行审阅者决策或配对设备命令"
title: "代理利用用户输入和执行权限"
sidebarTitle: "用户输入和执行"
---

harness如何向用户提出问题、将其工具表面与主机功能绑定、处理配置的执行审查者的三个结果以及缩小配对设备的命令权限。 [Agent harness插件 ](/plugins/sdk-agent-harness) 参考的一部分。

## <a id="user-input-and-tool-surfaces"></a> 用户输入和工具表面

公开运行时级用户输入请求的本机harness应使用 `openclaw/plugin-sdk/agent-harness-runtime` 中的用户输入帮助程序来格式化提示，通过 OpenClaw 的阻塞回复路径传递提示，并将 choice/free-form 答案规范化回运行时的本机响应形状。帮助程序保持 channel/TUI 表示的一致性，同时每个harness保持自己的协议解析和待处理请求生命周期。

OpenClaw 自己的阻止问题工具 - `ask_user` 和 `secrets` 请求 - 是一个单独的案例。他们注册一个网关问题，然后等待，然后运行该工具的任何程序都会发布让人们回答该问题的提示。其工具经历嵌入式工具生命周期的harness从其工具启动处理程序获取该发布。调度工具本身的harness将 `questionPrompt` 传递到 `hostCapabilities.createToolSurfaceAsync`，在它构建工具表面的每个路径上 - 侧线程是它自己的这样的路径：`send` 是运行的 `onToolResult`，而 `messageChannel` 是提示将出现在的对话。将其省略，问题将被注册但从未显示，因此轮流等待整个超时，然后报告没有人应答。

对于架构支持的表单和文字 URL 确认，请使用同一子路径中的 `agentHarnessStructuredInput` 运行时表面。它在不调用访问器的情况下对有界数据进行快照，将支持的原始字段编译为网关问题，并通过批处理、秘密输入、超时和取消防护来执行它们。harness保留其协议信封的所有权，并且必须通过准确的转向信号和主动所有者检查； `run(...)` 返回已应答、拒绝、取消或不支持的结果以供适配器进行翻译。

使用本机问题助手时，传递原始准备好的尝试，包括其确切的 `hostCapabilities` 对象，作为 `delivery` 。核心捕获问题创建者在发布任何转向句柄之前准备好的调用者策略和生命周期。功能对象的副本不携带该绑定。内置工具捕获其创建范围； CLI 本机问题保留工具帽转换之前的原始调用者策略。回答回合的模型选择或排队操作永远不会取代问题创建者的权限。

即使运行时无法接受普通引导，纯文本通道答案也会使用此创建者绑定。缺失、关闭或不匹配的创建者权限会产生明显的拒绝，而不是新的代理轮流。传入来源和创建者必须在最终答案发送期间保持最新状态。网关推出的 CLI MCP 工具使用相同的原始调用者快照，绑定到其确切的实时授权。独立附加授权没有准备好的运行快照；他们的问题保留结构化问题控制，但不接受普通频道文本。

在 `runAgentHarnessGatewayQuestion(...)` 或 `agentHarnessStructuredInput.run(...)` 中省略 `gatewayCall` 以使用核心拥有的网关传输。它通过注册、持久性、连接准备和 hello 携带每个输入的源和后备运行断言，然后在发送解析请求之前立即进行同步检查。被拒绝的输入仅释放其自己的保留：问题仍然悬而未决，其提示和后来的有效输入仍然可用。持久性和本地保留并不是一个有答案的过渡。发送后关闭并不会使已接受的答案可重播。纯文本提交在 `question.resolve` 上携带新鲜的、有界的 `resolutionId`；问题所有者仅在提交提交时记录它。主服务员在 `question.waitAnswer` 上请求 `includeResolutionId: true` 并使用该收据来恢复丢失的响应，使用问题服务员的现有截止日期，而不是单独的较短计时器。另一个演员的答案，即使是相同的文本，也不能建立对该输入的消耗。明确的解决拒绝会立即释放输入；取消或过期的服务员证明未消费。

如果收据丢失、被拒绝或在服务员结算时仍待处理，主持人会将输入记录为未经确认且不可重播，而不是通过普通引导再次发送。这是路由所有权，而不是答案已提交的证据。频道回复、网关聊天、对话和 TUI 会在不开始另一轮或取消独立接受的支持工作的情况下浮现不确定性。通知传送或源采用失败不会释放用于重播的输入。后备运行中止、超时和错误清除保留独立的权限。

自定义传输必须保留这些请求和响应字段，以便恢复丢失的响应。传统的无收据回复仍未得到确认；它并不能证明另一份提交的材料回答了该问题。 `resolutionId` 是一个不透明的 1-128 个字符的相关值，不是解决问题或重用闭源权限的权限。普通服务员省略`includeResolutionId`（默认`false`）并接收现有的响应形状；问题记录、查找结果和广播事件永远不会获得收据。收据是暂时的问题生命周期状态，而不是持久的记录或迁移。

出厂的`AgentHarnessQuestionGatewayCall`功能类型不变。旧函数覆盖对于普通的、无作用域的输入仍然有效，包括运行生命周期检查。仅具有传统回调的源绑定输入在输入持久性或解析之前失败 I/O. 函数数量或回调的存在不会建立受保护的传输支持。

相反，自定义保护传输提供显式对象：

```typescript
type QuestionDispatcher = Exclude<
  Parameters<typeof agentHarnessStructuredInput.run>[0]["gatewayCall"],
  AgentHarnessQuestionGatewayCall | undefined
>;
```

该对象具有 `version: 2` 和 `call(request)`。该请求包含`method`、`options`（`timeoutMs?`）、`params?`、`signal?`以及必需的`authority`：`{ kind: "unscoped" }`或`{ kind: "source-bound", assertCurrent }`。源绑定变体需要同步断言。在所有等待准备之后以及每次调度或重试之前立即调用它，无需干预等待。切勿替代观察员或响应后检查。当委托给`callGatewayTool`时，将其现有额外包中的受保护断言转发为`dispatchAuthority: { version: 2, kind: "source-bound", assertCurrent }`。同一个包接受 `kind: "run"` 用于仅运行断言。这些是本地代码合同，而不是网关线字段、操作员设置或新的 SDK 导出。

每个准备好的尝试还会收到一个版本化的 `params.hostCapabilities` 对象。在公开插件构建的 OpenClaw 工具之前使用 `bindToolSurface(...)`，并使用其策略和审批操作进行本机操作。工作目录与尝试不同的本机操作可能会将 `nativeOperation: { cwd }` 传递给 `runBeforeToolCall(...)`；主机规范化该有界行为事实，同时保持身份和策略权限的封闭约束。闭包绑定了主机解析的运行、沙箱、请求者、路由和批准身份；插件不得在尝试返回后重建这些字段或保留功能。尝试结算后拨打的电话将被拒绝。

当提供时，`assertNativeSubagentSpawnAllowed()` 必须在本地生成准入时运行。它拒绝模糊的参与者身份；将模型定向到 `sessions_spawn`，请求者验证的 `requester_profile.id` 为 `user`。捆绑的本地钩子准入可能会返回一个同步保护，中继在允许之前等待准备后重新检查该同步保护；返回的原因成为模型可见的拒绝。参与者检查使用现​​有的本机模型准入，包括其默认的可选模式。当本机准入被禁用或不可用时，独奏 Codex 会保持本机委派，而当本机生成仍然可用时，另一个人的输入队列将作为后续队列。其有效策略已禁用本机委派的线程仍允许跨配置文件转向。如果回退尝试已经包含多个人，并且本地生成在没有钩子准入的情况下仍然可用，则 Codex 会拒绝该尝试，并要求发送者将请求作为新消息再次发送，以便它自己轮流运行。

当转向必须遵循转弯所有者的操作员配置文件时，后端手柄可以声明 `supportsCrossProfileSteering: false`；省略该字段允许跨轮廓转向。回复准入所有者在消息注入之前应用此限制，包括通过该路径传递的问题答案。

对于独立保留的本机工作，请在主机功能处于活动状态时调用可选的 `retainSourceAuthority()`。当运算符源存在时，返回的 `assertCurrent`、可选 `signal` 和 `release`（安全重复）将保留该原始源，与前台完成无关。对于没有运算符源的运行，该方法返回 `undefined`。它既不提供新的工具权限，也不提供替代的前台功能。将其绑定到通过现有本机策略路径允许的确切资源，在进一步影响之前重新检查它，并在其信号中止时停止这些资源。将终止和结算保管与动作许可分开，并在拥有的资源结算后释放源。报告清理失败，同时保留未解决资源的保管权。不要根据会话属性或重用的进程 ID 重建所有权。

主机发出网关生命周期退役信号。主动源撤销还需要原始当局的信号；访问者访问提供授权到期和撤销的权限。仅断言源约束在效果之前检查，并且不提供异步撤销通知。

对于本机历史记录恢复，可选的 `prepareContextMedia({ message, maxChars })` 在相同的主机权限和当前媒体策略下重建保存的用户附件。将其返回的文本和图像包含在本机上下文预算中；不要将它们作为无界后缀附加。有关限制和旧主机行为，请参阅 [ 运行时媒体合约 ](/plugins/sdk-runtime)。

为了传输到本机环境，可选的 `resolveInputAttachmentMedia()` 返回当前承认的输入的原始媒体事实的冻结的、分离的副本，包括通过内联投影从 `params.media` 中删除的图像。它根据捕获的尝试的实时权限解析延迟的转录媒体；它不会更改记录内容或授予文件读取权限。与harness的现有附件所有者保持源验证和传输。没有此功能的较旧主机仅提供当前尝试的 `params.media`；不要从提示文本或历史记录中重建缺失的来源。

当轨迹捕获具有有效的主机拥有的会话目标时，`params.hostCapabilities.trajectory` 提供闭包绑定的 `recordEvent(...)` 和 `flush()` 操作。主机添加会话属性、绑定事件数据，并通过共享轨迹存储将其持久化，而无需秘密屏蔽。将功能视为可选，仅发送结构化非秘密事实，并在尝试解决之前等待 `flush()`；当功能不存在时，不要推断存储路径或创建插件端后备。

新的 harness 应实现 `AgentHarnessV2`，并将已准备的尝试类型化为 `AgentHarnessAttemptParamsV2`、`EmbeddedRunAttemptParamsV2` 和 `AgentHarnessSideQuestionParamsV2`；这些契约要求提供 `hostCapabilities`。采用 V2 的软件包必须声明 `openclaw.compat.pluginApi: ">=2026.8.1"`（或更新的最低版本），以便旧主机在加载前拒绝它们。请从 runtime 子路径导入参数类型：

```typescript
import type {
  AgentHarnessAttemptParamsV2,
  AgentHarnessSideQuestionParamsV2,
  EmbeddedRunAttemptParamsV2,
} from "openclaw/plugin-sdk/agent-harness-runtime";
```

较旧的 `AgentHarness`、 `AgentHarnessAttemptParams` 和 `EmbeddedRunAttemptParams` 名称仍与现有插件保持源码兼容，因此在 2026-10-12 之前，这些已弃用参数类型中的 capability 字段是可选的。公开的 `AgentHarnessSideQuestionParams` 契约具有相同的兼容窗口和可选字段。Core 仍会在每个选定的尝试上提供该 capability。兼容性仅存在于类型层面：当前 harness 代码不得添加在没有主机 capability 的情况下运行的 runtime 路径。

压缩实现使用 `AgentHarnessCompactParams<2>`（以及私有本机桥的 `AgentHarnessNativeCompactionParams<2>`）以及主机创建的 `assertActive` 和 `retainSourceAuthority` 视图。核心通过准备、排队、本机完成和清理保留原始源。注册的`AgentHarness.compact`和`AgentHarnessV2.compact`回调签名保持不变。在加载或调用版本 2 实现之前，验证该回调边界处提供的功能。省略类型参数可以保持遗留参数的形状；选择 `2` 需要通过现有 SDK 类型名称获得主机功能。适配器不需要新的运行时 SDK 导出。忽略它的旧主机在本机工作之前会收到可操作的故障；缺席永远不会成为系统权限。该功能的运行时版本仍为 `1`。

需要类似 PI- 的紧凑工具布线的本机harness应使用 `openclaw/plugin-sdk/agent-harness-tool-runtime` 中的 `createAgentHarnessToolSurfaceRuntime(...)`。它拥有工具search/code-mode控制选择、本地模型精益默认值、运行时兼容的模式过滤、隐藏目录执行、目录水合作用和目录清理。 Harnesses 仍然拥有其 SDK- 特定工具转换和本机执行回调。

将主机提供的尝试的 `trigger` 传递给该工厂。该可选字段使用现有的运行触发器（`cron`、`event`、`heartbeat`、`manual`、`memory`、`overflow` 或 `user`）；省略它会保留普通的工具呈现。 `memory` 转动使主机选择的持久性工具直接可用，并禁用工具搜索和代码模式，包括在提供准备好的演示事实时。文件支持的保存保留了 `read` 及其受限的仅附加写入器；提供商支持的保存保留 `read` 和所选插件声明的持久性和查找工具。请参阅 [ 预压缩内存刷新](/plugins/sdk-overview/memory-and-context#pre-compaction-memory-flush)。

本机工具适配器可以使用同一子路径中的 `runWithAsyncWorkResources(...)` 来通过主机拥有的承认工作保留操作清理，而不保留工具结果。通过其 `onAcquired` 回调注册清理；保持真正的取消活动，直到清理释放它。当普通操作清理必须在返回结果之前完成时，在获取的资源上设置 `releaseBeforeResultWhenIdle: true` ；已接受的跟踪工作仍会返回其逻辑结果，而无需等待入场。这保留了资源，而不是权限：排队的工作仍然必须重新验证其原始运行、调用者、到期和提交保护。超时、中止和失败结果必须立即关闭其操作。手动自动化准入使用现有的每次调用突变收据来仅加入激活，而不是计划的有效负载的生命周期。

在最后一个策略过滤器、架构隔离和本机注册交集之后，在快照工具定义之前从 `openclaw/plugin-sdk/agent-harness-runtime` 调用 `finalizeAgentToolAvailability(tools, options?)`。它返回一个包含相同工具对象的新数组，并仅更新主机拥有的依赖功能，例如当其本机结果读取器可调用时收集器生成。它不会添加工具、更改配置文件、替换执行程序或重新绑定授权和批准包装器。

当运行保留其无法执行的工具的架构时，传递 `options.toolExecutionAllow`。省略使用提供的工具集；空列表不允许执行。可选的同步 `options.onPrepared(tool)` 观察者可识别所有者参与的定义，因此工具可以刷新其缓存的架构和提示文本，而无需更改不相关的定义。稍后过滤后重新应用终结，并在每个工具上保留现有的尝试生命周期防护。最终化不会更新已在本机运行时中注册的声明。保留本地拥有的目录字节和指纹；当前的执行者守卫仍然拒绝不可用的模式。新的主机拥有的声明使用harness现有的目录注册生命周期。 OpenClaw Code Mode加入的`agents.run()`路径保留内部等待；如果没有本机结果读取器，此帮助程序不会使原始收集器调用可用。

## <a id="exec-reviewer-outcomes"></a> Exec 审稿人结果

`reviewExecRequestWithConfiguredModel(...)` 从 `openclaw/plugin-sdk/agent-harness-exec-review-runtime` 返回 `ExecAutoReviewDecision`，也由 `openclaw/plugin-sdk/agent-harness-runtime` 导出。插件使用者必须明确处理所有三个结果：

- `allow-once` 与 `risk: "low"` 或 `risk: "medium"`：运行审核的命令一次，服从当前的执行策略和权限检查。
- `deny`：不运行该命令。将理由和拒绝指导返回给智能体；永远不要将此结果升级为人类认可。
- `ask`：将请求路由至人工批准。

拒绝指导告诉代理不要通过变通办法、间接执行或策略规避来追求相同的结果。它可能会选择一个实质上更安全的替代方案，或者解释风险并要求用户单独批准确切的命令。这不会将插件的 `deny` 结果转变为自动批准请求。

当未配置审阅者、提供程序失败或超时、无效响应或风险不低或中等的 `allow` 响应时，配置的执行审阅者将返回 `ask`。检测到审阅者引导的提示注入返回 `deny`，具有高风险。立面加载或审核者施工错误仍可能拒绝承诺；错误绝不是执行的许可。

## <a id="sandbox-subprocess-cleanup"></a> 沙箱子进程清理

在构建子进程执行规范之前，请使用 `openclaw/plugin-sdk/sandbox` 中的 `prepareSandboxProcessCleanup(backend, env)`。将其返回的环境传递给 `buildExecSpec`，并保留其 `terminate` 回调给子所有者。在生成之前立即调用执行规范的 `assertCurrent`，并在每次退出或启动失败时最终确定后端令牌。

Docker 和 Podman 提供 `prepareProcessCleanup`：实时所有者创建一个随机进程标记和固定到该运行时的仅终止回调。撤销执行会阻止新的准备、命令和文件写入，但先前创建的回调仍然可以停止其标记的进程树。它无法执行任意脚本或选择不同的运行时。返回的 `interrupt` 回调保留普通的实时执行检查，因为信号处理程序可以运行来宾代码。没有此可选功能的后端保留现有的 shell 命令清理路径；他们必须根据自己的生命周期合同保留清理权限。

## <a id="paired-device-execution"></a> 配对设备执行

为harness需要在配对设备上执行的确切节点命令声明 `cloudPlacement.devicePlacement.requiredNodeCommands`。当创建选定harness的主机功能时，会生成此集的核心快照。允许的 **完全访问** 会话只能通过节点策略的 `invokeNodeWithSessionFull` 回调授权那些命令；同一插件拥有的其他命令不会继承该权限。缺少声明或未列出的命令会返回 `undefined`，因此策略必须使用其普通批准或拒绝路径。在尝试期间改变声明不能扩大权限。

该声明缩小了权限；它不同意。配对、命令白名单、托管同意、节点本地策略以及确切的实时会话、放置和轮流仍然独立执行。插件仍然是受信任的代码，不会被此回调沙箱化。
