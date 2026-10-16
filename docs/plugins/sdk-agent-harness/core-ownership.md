---
summary: "在harness运行尝试之前OpenClaw核心准备和拥有什么，以及harness可以声明收回其中一些的合同"
read_when:
  - "您需要知道哪种尝试输入核心为harness做准备"
  - "您正在声明本机工具策略、身份验证引导程序或会话所有权"
  - "您正在阅读 `supports(ctx)` 中准备好的请求传输事实"
title: "代理利用核心所有权"
sidebarTitle: "核心所有权"
---

OpenClaw 在调用 `runAttempt` 之前准备的内容，以及工具声明自己的工具策略、身份验证引导程序、绑定的本机会话或其自己的请求传输的狭义契约。 [Agent harness插件 ](/plugins/sdk-agent-harness) 参考的一部分。

## <a id="what-core-still-owns"></a> 核心仍然负责什么

对于普通的具体模型转弯，OpenClaw 在调用 `runAttempt` 之前准备这些输入：

- 提供者和模型，包括发现和具体请求参数
- 运行时认证状态，除非该 harness 声明它拥有认证引导
- thinking level 和 context budget
- OpenClaw transcript/session 文件
- workspace、sandbox 和工具策略
- 通道回复回调和流式回调
- 模型回退和实时模型切换策略

挽具进行一次有准备的尝试；它不会选择提供商、更换渠道交付或默默地切换模型。锁定具体模型聊天不会跳过模型发现、身份验证准备或响应参数。显式 `pluginOwnerId` 拥有会话控制权；后来生产的 `agentHarnessId` 是一个观察结果，而不是本地所有权声明。绑定本机会话使用下面的单独所有权合同。

等待 `params.hostCapabilities.createToolSurfaceAsync(options)` 构建 OpenClaw 工具，并为每个构建提供新的执行策略。普通的执行批准读取错误使用保守的拒绝默认值。迁移错误或丢失承认的主机当局拒绝施工。主持人捕获已承认尝试的出版物可用性，并在构建表面时应用它；harness不需要转发这个事实，并且插件提供的选项无法取代它。工具配置文件仍然过滤目录，并且每个可执行文件仍然绑定到主机的实时权限。

### <a id="prepared-local-execution-environment"></a> 已准备好本地执行环境

`hostCapabilities.preparedEnvironment()` 返回已承认尝试的捕获身份和执行事实。其可选的 `localGitConfigParameters` 是附加片段，而不是 `GIT_CONFIG_PARAMETERS` 的替代品。仅将其应用于harness拥有的本地子进程。保留不相关的继承或显式配置的 Git 参数和运行时的环境过滤器；在附加主机片段之前，显式本机值（包括空字符串）将替换其继承的基数。将继承的凭据保留在子环境中，而不是将它们复制到工具请求覆盖或持久的本机线程配置中。远程、沙箱和外部启动的对等点保留其现有的环境所有者。

### <a id="current-input-files-for-local-execution"></a> 本地执行的当前输入文件

已确认网关主机上的非沙盒执行的harness可能会调用 `hostCapabilities.prepareInputAttachments({ placement: "local-host", maxChars, assertCurrent, signal })`。主机使用承认的输入及其捕获的媒体和工具策略返回仅执行的注释，其中包含经过验证的可读文档路径。即使原生图像投影清除了普通媒体场，它也能保留原始内容。对于转向，传递当前 `turn: { media, userTurnTranscriptRecorder }`。路径元数据必须符合提供的本机输入预算。当完整的注释无法容纳时，主机会忽略它并保留原始请求和内联附件上下文。将注释附加到当前本机输入，而不重写 OpenClaw 的原始提示、文字记录或媒体引用。这种分离并不意味着harness在转弯后丢弃其本机输入：Codex 将其保留在其本机对话历史记录中。准备好的路径不会取代后续轮次的现有执行和工具策略准入。

此可选添加保留了附带的 V2 主机功能合同：较旧的主机省略了它，因此插件在不存在时保留普通的内联附件上下文。它不是远程传输、远程工作区根、注册工作区适配器、沙箱或工作区-only/no-read 策略的后备。harness必须根据其有效连接来确认放置，而不是根据缺少工作区适配器来推断放置。在等待的准备过程中和返回路径之前，将检查所提供的当前轮流防护和捕获的主机权限。

### <a id="workspace-files-on-the-harness-host"></a> harness主机上的工作空间文件

可信主机插件可以使用从 `openclaw/plugin-sdk/agent-workspace-runtime` 导出的 `AgentWorkspaceAccess` 将现有 `agents.files.list/get/set` 方法和 `agents.update` 身份表单绑定到配置的远程工作区。它提供现有 `SandboxFsBridge` 的 `stat`、`readFile` 和 `writeFile` 方法；不需要新的文件守护程序。

| 主机生命周期      | 操作                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------- |
| 插件注册 | 在文件请求到达之前调用 `declareAgentWorkspaceAccess(workspaceDir)`。         |
| 服务启动       | 主机访问准备好后调用 `registerAgentWorkspaceAccess(workspaceDir, { bridge })`。 |
| 服务站        | 调用返回的release函数。请求失败而不是使用过时的本地副本。    |

绑定持续穿过harness匝。主机配置工作空间并选择和验证远程目标； Gateway 不会播种第二个工作区。网关保留其现有的文档白名单和授权。未配置的工作区保留本地访问。 `expectedHash` 保留了现有的尽力而为的冲突检查：本机 shell 编写器不参与网关保存队列，并且传输失败可能会使写入结果未知。

自举加载需要桥的 `readFileWithSource` 操作。它返回字节和由该读取固定的已解析文件系统路径，因此现有会话过滤器可以识别受保护的根内存文件的别名。单独的路径查找是不够的。配置的额外文件 glob 还需要 `readDirectory`。缺失的功能明确失败。压缩后上下文还通过绑定读取 `AGENTS.md`；不可用的主机永远不会选择过时的本地副本。

对于自动内存上下文，对于工作空间挂载内的文件，相同的读取还会返回 `workspaceRelativePath`。内存核心使用其现有规则和网关来源记录对该源进行分类，而不检查网关本地文件。其他内存插件必须声明 `supportsWorkspaceMemoryReadSources` 并使用分类器的 `readSources` 输入；否则自动远程内存上下文将被排除。缺少源元数据无法选择本地副本。

异步技能准备可以使用绑定的可选 `loadSkills` 回调。它读取 Harness 上工作区拥有的技能根，而捆绑的和网关安装的插件根保留在 Gateway 上。回调返回本机发现事实并利用 platform/binary 可用性；网关仍然应用配置和过滤器。没有 `loadSkills` 的本地工作区和仅文档绑定保留本地发现，包括在文档服务停止之后。一旦绑定提供 `loadSkills`，不可用的远程技能访问就会显式失败。

此绑定提供远程文档和引导程序访问。它不会启用远程 OpenClaw 工作线程或移动其代理循环。在删除工作区同步之前，内存搜索和维护、技能、附件和主机配置需要单独的集成和验证。

### <a id="input-attachments-for-a-remote-workspace"></a> 远程工作区的输入附件

受信任的网关插件可以在其现有的 `AgentWorkspaceAccess` 绑定上提供 `prepareTurnAttachments`。 Core 从 `openclaw/plugin-sdk/agent-workspace-runtime` 调用 `prepareAgentWorkspaceAttachments` 来解析已承认的输入文件，并在harness尝试或 Codex 转向之前调用此功能。它将返回的harness路径注释仅附加到执行输入。原始媒体参考和文字记录保留在 Gateway 上，以进行图像水合作用和重播。

`createWorkspaceAttachmentPreparer` 通过现有的文件系统桥与 `createFileExclusive` 实现此回调。它仅读取 Gateway 的媒体存储，传输输入文件而不替换现有的 Harness 副本，并保留现有的 50 MiB 暂存限额和更高的配置限制。主机通过自己的后端提供`createBridge(assertCurrent, signal)`；在每次传输命令之前检查该权限和信号。

失败的启用传输会阻止调度。需要准备文件的harness将 `requirePreparation: true` 传递到 `prepareAgentWorkspaceAttachments`。这会解析存储的附件事实，包括延迟的转录本输入，并且需要为每个具有路径或 URL 的文件提供非空执行路径注释。准备工作在相同的工作空间绑定和总超时下一次运行一个文件。如果无法准备任何文件，即使其他文件已成功准备，调度也会失败。纯文本输入仍然不需要附件提供程序。

当省略 `requirePreparation` 时，没有可选回调的绑定将保留其现有的输入处理，包括内联图像；他们无法获得自动文件传输。未配置的本地工作区保持不变。该接口不提供后端或获取凭证。每个主机适配器都提供自己的授权桥。

### <a id="host-only-execution"></a> 仅主机执行

启动未沙盒本地应用程序的工具声明 `executionEnvironment: "host-only"`。在本机准备和调用之前，Core 会拒绝需要沙箱、沙箱、仅限工作区和不受支持的会话权限上下文。该工具不会实施第二个沙箱策略，也不会默默地将工作目录重新解释为限制。

Control UI 可以为管理员提供用于可选沙箱的显式每聊天恢复操作。网关拥有该突变并重新验证原始会话和权限状态；功能声明永远不会授予删除所需沙箱或其他配置限制的权限。

### <a id="native-tool-policy-enforcement"></a> 原生工具策略强制执行

仅当 `runAttempt` 在本机和内置工具、OpenClaw 工具、请求者和配置的 MCP 服务器、应用程序、委派和恢复线程中强制执行每个显式 OpenClaw 工具策略层时，才设置 `conversationToolPolicySupport: "exact"`。核心通过 `params.pluginHarnessToolPolicyRestricted` 作为原生表面必须隔离的准备决定。

如果本机表面同时公开多个功能，请在 `conversationToolPolicyNativeTools` 中声明其标准 OpenClaw 工具名称。核心根据有效的工具配置文件和提供商配置文件检查每项要求，包括代理覆盖和 `alsoAllow`。缺少的功能会设置相同的限制标志。例如，Codex 声明其 shell 和文件系统工具，因此 `messaging` 和 `minimal` 配置文件禁用本机代码模式，而 `coding` 和 `full` 保持其可用。此声明不会放松明确的允许列表、拒绝列表、沙箱策略或运行时上限。省略它会保留独立执行本机可用性的harness的现有配置文件处理。

具有独立管理的本机表面的harness还可以使用标准 OpenClaw 工具名称声明 `conversationToolPolicySafeDenyTools`。仅当每个扩展拒绝都是该审核安全列表中的已知核心工具并传递 `params.pluginHarnessToolPolicySafeDeniedTools` 中的匹配名称时，核心才会保留本机表面。harness必须禁用这些名称的任何本机等效项。有限的允许列表、未声明或未知的工具名称、通配符以及包含任何未声明名称的组仍然是本机表面限制。省略该列表以保留保守行为，其中每个显式限制都会隔离本机表面。由于遗漏保留了限制，新工具无法悄然放宽政策边界。

当任何原生能力都可以绕过这些层级时，请省略该声明。OpenClaw 随后会在调用 harness 之前，明确拒绝显式受限的回合。操作员可以将会话切换到嵌入式运行时，或升级 harness。带有限制性直接策略的通道 `/btw` 侧问题会被 core 拒绝，不在此声明的覆盖范围内。

对于已知的、可操作的拒绝，`AgentHarnessPreflightError` 接受可选的 `userMessage`。 Core 在聊天界面上呈现此所有者创作的公共副本，无需详细设置或通用 retry/reset 建议。将技术上下文保留在错误的 `message` 和 `cause` 中；对于诊断故障，省略 `userMessage`。

### <a id="harness-owned-auth-bootstrap"></a> Harness 拥有的认证引导

默认情况下，核心会在调用工具之前解析提供者凭据。可以通过其自己的本机运行时进行身份验证的受信任的工具可以在其静态 `AgentHarness` 注册上设置 `authBootstrap: "harness"`。然后，核心可以委托凭证引导，而不是仅仅因为通用提供者凭证不存在而拒绝路由。准备好的路线和明确的配置文件要求仍然适用。

核心仍会转发兼容的、明确选择或排序的 OpenClaw 身份验证配置文件及其范围存储（如果存在）。工具必须在发出模型请求之前解析该配置文件或其本机凭据，保留尝试范围内的秘密，并显示可操作的身份验证失败。不要在仅有时拥有身份验证的harness上设置此功能。这种静态引导功能与已绑定的本机会话模型和连接的所有权不同。

### <a id="native-setup-verification"></a> 本机设置验证

对于无轮廓模型设置激活，带有 `authBootstrap: "harness"` 的harness可以实现 `verifySetup(ctx): Promise<void>`。上下文提供`config`、`provider`、`modelId`、`workspaceDir`、`signal`和`assertCurrent()`。从 `openclaw/plugin-sdk/agent-harness` 导入其类型。

确认无需轮流即可实时访问所选模型；缓存或捆绑的目录不足。在本机 I/O 之前和等待之后重新检查 `assertCurrent()`，并关闭 `finally` 中的连接。核心在提交之前重新检查挂钩和插件工件。没有钩子的凭证支持路由和harness保留正常的推理探针。

### <a id="bound-native-session-ownership"></a> Bound 本机会话所有权

可选的 `resolveSessionRuntimeOwnership({ config, agentId, sessionId, sessionKey, storePath, readPreviousSessionId, assertCurrent })` 回调报告私有绑定所有权。 Core 仅在验证持久会话身份后在确切固定的harness上调用它。需要`sessionId`和`assertCurrent`；其余参数是可选的。同步返回：

- `{ model: "native", auth: "native" }`，当绑定通过其本机连接同时拥有模型选择和身份验证时。
- `{ model: "native", auth: "host" }` 当它拥有模型选择但仍需要主机身份验证准备时。
- 当不存在匹配的本机模型绑定时，为 `undefined`。对于经过验证的本机harness引脚，返回 `undefined` 的已实现回调是不可用所有者错误：明显失败，没有普通发现或新的本机线程。在重试之前重新附加原始本机会话。

省略回调可以保留第三方harness的正常具体 model/auth 准备。具体的插件拥有的聊天永远不会查询它；仅运行时请求或模型锁无法建立本机所有权。配对节点 Codex 会话使用其所属的节点处理程序；丢失的本地绑定不得将错误路由的延续转变为本地运行。

仅当从同一绑定已知两个值时才包含 `modelRef: { provider, model }`。不要从外部配置、凭据或使用情况推断缺失值。主机身份验证所有权在凭证准备之前需要此元组；本机身份验证挂起分支可能会忽略它，直到其本机所有者选择模型。

仅当harness在每次推理分派之前（包括恢复之后）绑定实际本机选择时，才声明 `nativeModelPolicySupport: "exact"`。使用 `hostCapabilities.bindModelExecution({ provider, model })` 或下面的保留源操作。观察返回的取消信号，在等待准备之后、传输写入和结果结算之前重新检查其断言，并在执行清理后释放它。获取绑定时，发出主机必须处于活动状态。已发行的装订保留原始来源直至发行；主机关闭会阻止新的直接收购，而不撤销已接受的本地工作。显式停止、会话和传输权限以及真实源或模型策略撤销仍然适用。缓存的恢复前模型不具有不同恢复模型的权限。当运营商拥有模型策略时，缺少支持会拒绝本地拥有的推理。当运行没有算子源时，该方法返回`undefined`；普通主机操作检查和本地回合结算保留其现有生命周期。主机仅为声明精确支持的harness公开直接模型绑定器。其他harness通过其现有的源功能保留未知模型的​​防护装置；引入模范政策可以取消这种不合格的工作。

对于可以在前台完成后选择模型的已接受工作，请在主机处于活动状态时获取 `hostCapabilities.retainSourceAuthority()`。其 `bindModelExecution(...)` 操作使用相同的原始源，直到该工作释放保留的功能。每个模型绑定都拥有其保留，并且必须在调度清理后释放；关闭保留的工作会取消其模型绑定。实时`modelPolicyRequired`事实支持连接预检；不存在的事实意味着未知，而不是不受限制。实时 `sourceIdentity` 是一个不透明的等式令牌，用于检查活动输入是否共享相同的原始源；它从不授予执行权。当其工作解决时释放保留的权限，而不是将创建者的权限永久附加到可重用的本机线程。

同步读取现有的私有绑定。读取前后调用`assertCurrent()`。不要发现模型、回收一代、启动客户端、验证或改变绑定。当回调返回时，断言失效。这种所有权事实既不是执行权限，也不是凭证准备情况。

如果当前绑定不存在，`readPreviousSessionId?.()` 将从调用者选择的存储中读取此确切物理会话的最新前任。当行丢失或已被替换时，它返回 `undefined`。它不接受任何参数，并在所有权回调返回时过期。仅在绑定未命中时使用它，而不是加载常规会话运行时或在等待的准备过程中携带沿袭快照；当前绑定不需要读取沿袭。前身标识了要检查的绑定，而不是回收或执行它的权限。

Codex 实现报告来自 `preserveNativeModel` 的本机模型所有权。它仅报告单独的私人监督连接的本机身份验证；在托管连接上保留模型会将身份验证留给主机。本机身份验证绑定使用其经过验证的连接，而不是测试不相关的外部模型 route/auth 元数据或转发主机配置文件。本机连接策略仍然适用。显式的每次运行提供者流参数被拒绝而不是被丢弃；使用具体的模型聊天来应用它们。

对于主机-身份验证绑定，实际的本机元组控制模型、身份验证和请求传输准备。显式配置文件锁定仍然严格；自动轮廓旋转仍然可用。该元组上的创作设置和显式每次运行参数必须受到固定运行时的支持，而不是通过另一个运行时静默删除或重定向。

核心将转向和待决问题权限绑定到最终准备的模型路由，使用回复的原始呼叫者策略快照进行指纹和传入消息投影。本机所有权或模型选择挂钩不会替换该快照或授权不同的调用者。

核心在尝试中携带可选的 `expectedSessionRuntimeOwnership`，包括用于主机身份验证绑定的 `modelRef`。这是非授权比较，不是绑定、凭证或保留的能力。在预检期间、在绑定租约下以及推理前恢复后针对就绪线程进行重新验证。更改后的主机身份验证元组会拒绝陈旧的准备凭据，同时保留新观察到的绑定。本机身份验证连接可能会遵循其本机所有者的模型更改。丢失或更改的所有权绝不能启动替换线程。

相同的同步读取提供会话行、事件和会话范围的聊天元数据。本机身份验证元数据仅针对会话的渲染模型省略不适用的主机可用性字段；它不会设置 `available: true` 或修改共享目录。待处理的本机分支可能仍会显示已配置的占位符，直到存在本机元组。

尝试可能会从其就绪的本机线程报告 `runtimeModelSelection: { provider, model }`。 Core 仅针对准备好的本机拥有的运行接受此诊断。它将所选模型与 response/billing 属性分开记录，因此主机终结器的模型不会覆盖本机会话的选择。

### <a id="verified-setup-runtime-artifacts"></a> 已验证的设置运行时工件

可以为首次运行设置提供推理的本地工具必须证明完成检查的实现。当 `params.captureRuntimeArtifact` 为 true 时，返回具有稳定 id 和内容指纹的不透明 `result.runtimeArtifact`。注册一个匹配的 `runtimeArtifact.validate(...)` 功能，该功能可以重新检查该绑定，而无需加载不同的harness或扫描不相关的插件。

已验证的 OpenClaw 延续也通过了 `params.expectedRuntimeArtifact`。harness必须将其与它获取的确切本机进程进行比较，如果它们不同，则在启动或恢复本机线程之前失败。普通代理会忽略这两个字段，因此内容哈希不会出现在正常请求热路径之外。 Remote/WebSocket harness需要服务器证明合约才能参与；版本字符串本身并不是工件标识。

准备好的尝试还包括 `params.runtimePlan`，这是一个 OpenClaw- 拥有的用于运行时决策的策略包，必须在 OpenClaw 和本机harness之间保持共享：

- `runtimePlan.tools.normalize(...)` 和 `runtimePlan.tools.logDiagnostics(...)` 用于感知 provider 的工具 schema 策略
- `runtimePlan.transcript.resolvePolicy(...)` 用于转录清理和工具调用修复策略
- `runtimePlan.outcome.classifyRunResult(...)` 用于模型回退分类
- `runtimePlan.observability` 用于解析的 provider/model/harness 元数据

harness可以使用该计划来做出需要匹配 OpenClaw 行为的决策，但将其视为主机拥有的尝试状态：不要改变它或使用它在回合内切换 providers/models。

终端回复准备属于`agent-run-terminal-reply.ts`。每个终端生产商发布`meta.terminalReply`和完整准备的有效负载；交付和客户端使用它们而无需再次解析文本。只有最后一个被修剪成大写的 `NO_REPLY` 是沉默的。准备工作会删除一个文字前导 `NO_REPLY\n`，并将其余部分保留为可见文本，包括第二个 `NO_REPLY`。换行、小写、标点和尾随形式仍然可见。内部结果要求匝数需要实际完成的电流源最终结果；进步镜并不能满足这一义务。

唯一的生产者入口点是 `prepareAgentRunTerminalReply({ rawText })`，返回 `{ text, terminalReply }`。它在剥离前导控制线之前对原始文本进行分类。送货消费者不会调用此函数。交付 `text`，它保留完整的准备字节，而不是有界的快照文本。即使记录的可见结果的文本是 `NO_REPLY`，它仍然可见。组合多个可见答案的工具将其准备好的快照组合起来，并分别限制聚合元数据；永远不要重新解析加入的传递文本。

对于模型可见回复策略，`openclaw/plugin-sdk/agent-harness-runtime` 中的 `buildHarnessVisibleReplyGuidance` 接受准备好的传递模式、实际消息工具可用性和已解决的 `requireExplicitMessageTarget` 事实。为每一回合提供这些事实。具有单独静态提示的harness可以使用相同界面的 `buildUiPresentationPrompt` 来实现稳定的 UI 引导，从而将交付和目标指令保留在后期上下文中。

对于辅助会话控制调用，`openclaw/plugin-sdk/model-session-runtime` 中的 `resolveSessionModelRef` 解析当前模型选择。 `openclaw/plugin-sdk/agent-harness-runtime` 中的 `prepareAgentRuntimeAuth` 选择其身份验证路由，并从调用者加载的身份验证快照中订购凭证尝试。当模型没有自己的具体传输时，例如本机列出的模型，请将来自准入捕获的已发布目录（模型选择器读取的目录）的路线传递为 `observedRoutes`。实现凭证时保留所选尝试的配置文件、API 和后备限制；这使得控制呼叫与座席轮流保持在相同的计费路线上。

对于支持独立执行和网关执行的工具，`openclaw/plugin-sdk/agent-harness-runtime` 中的 `hasGatewayToolRoutingContext()` 报告调用者或托管进程是否拥有网关路由。本地嵌入式 RPC 上下文不算作正在运行的网关。调用者或环境绑定在其网关退出后仍然存在，因此调度可以拒绝过时的调用。帮助程序不检查凭据、授予权限或保证网关可用。

### <a id="request-transport-contract"></a> 请求传输契约

`supports(ctx)` 接收 `ctx.modelProvider` 中已解析的模型传输。两个无密钥、由 provider 拥有的事实描述了所选路由：

- `runtimePolicy.compatibleIds` 列出了 provider 声明与该具体路由兼容的 runtime id。缺少该 policy 表示 provider 没有声明路由级兼容性；这并不代表可以假定支持。
- `requestTransportOverrides: "none"` 表示必须复制创作的 provider/model 请求覆盖。 `"present"` 表示存在创作标头、身份验证传输、代理、TLS、本地服务、专用网络行为或请求参数。事实并没有暴露这些价值观。

当harness无法重现准备好的传输时，返回 `{ supported: false, reason }`。选择后不要通过读取原始配置来推断支持。仅当内置运行时可以重现精确准备的请求而不删除创作行为时，才添加 `fallbackRuntime: "openclaw"`。然后，核心使用该后备进行显式和持久的选择以及多路由重试集。如果提供商、路由或身份验证失败仍必须阻止执行，则将其保留为缺席。

当身份验证准备产生多个重试路线时，一个harness必须在分派之前支持所有这些路线。如果没有插件可以拥有全套，则隐式选择使用 OpenClaw；显式或持久的插件选择会阻止执行，除非插件声明无损 OpenClaw 后备。

### <a id="per-turn-temporal-context"></a> 每回合时间上下文

拥有其模型提示的本机harness可以使用 `openclaw/plugin-sdk/agent-harness-runtime` 中的 `buildTemporalContextText`。它呈现与内置 OpenClaw 运行时相同的当前本地日期和时区。配置时使用 `agents.defaults.userTimezone`，否则使用主机区域。

在知道最终刀具表面后，为每一圈调用它。仅当该精确曲面包含 `session_status` 时才通过 `sessionStatusAvailable: true`；这可以在该工具不可用时在提示中保留准确时间提示。通过本机运行时现有的每轮应用程序或开发人员上下文携带结果，而不是将其附加到稳定的线程指令中。
