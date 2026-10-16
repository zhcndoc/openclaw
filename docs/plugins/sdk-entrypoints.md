---
summary: "参考defineToolPlugin、definePluginEntry、defineChannelPluginEntry 和defineSetupPluginEntry"
title: "插件入口点"
sidebarTitle: "入口点"
read_when:
  - "您需要defineToolPlugin、definePluginEntry 或defineChannelPluginEntry 的确切类型签名"
  - "你想了解注册模式（完整 / setup / CLI 元数据）"
  - "你正在查找入口点选项"
---

每个插件都导出一个默认入口对象。SDK 为每种入口结构提供了一个辅助函数： `defineToolPlugin`、`definePluginEntry`、 `defineChannelPluginEntry`、`defineSetupPluginEntry`。

所有插件 API 均为 [experimental](/plugins/sdk-overview#api-stability)，包括这些入口助手。固定并测试您的插件支持的 OpenClaw 主机版本。

网关适配器使用现有的 `core` 或 `gateway-runtime` `GatewayRequestHandlerOptions.context.githubPublicationService` 合同来发布 GitHub。使用允许的处理程序选项，使用 `gateway-runtime` 中的 `prepareGitHubPublicationRequesterV2` 或 `preparePersonalGitHubSessionActionV2` 准备其所需的功能，并在操作解决后释放它们。主机的工作模块和源栅栏模块保持私有。使用 [GitHub 发布方法映射 ](/plugins/sdk-migration/how-to-migrate#await-github-publication-operations) 迁移包装器和生命周期调用，无需添加来自网关内部的导入。

<Tip>
  **正在寻找演练？** 请参阅 [Tool Plugins](/plugins/tool-plugins)、[Channel Plugins](/plugins/sdk-channel-plugins) 或 [Provider Plugins](/plugins/sdk-provider-plugins) 获取分步指南。
</Tip>

## <a id="where-each-section-moved"></a> 各部分移动的地方

单页版本的每个部分现在都位于此页面或下面的八个子页面之一上。单页版本中的锚点仍然在这里解析。

- <a id="tool-policy-vocabulary" />[工具政策词汇](/plugins/sdk-entrypoints/tool-policy-and-sandbox#tool-policy-vocabulary)
- <a id="sandbox-bind-parsing" />[沙箱绑定解析](/plugins/sdk-entrypoints/tool-policy-and-sandbox#sandbox-bind-parsing)
- <a id="package-entries" />[包条目](/plugins/sdk-entrypoints/package-entries#package-entries)
- <a id="definetoolplugin" />[defineToolPlugin](/plugins/sdk-entrypoints/define-tool-plugin#definetoolplugin)
- <a id="definepluginentry" />[definePluginEntry](/plugins/sdk-entrypoints/define-plugin-entry#definepluginentry)
- <a id="native-provider-factories" />[本地供应商工厂](/plugins/sdk-entrypoints/native-providers#native-provider-factories)
- <a id="computer-use-providers" />[计算机使用提供商](/plugins/sdk-entrypoints/native-providers#computer-use-providers)
- <a id="definechannelpluginentry" />[defineChannelPluginEntry](/plugins/sdk-entrypoints/define-channel-plugin-entry#definechannelpluginentry)
- <a id="definesetuppluginentry" />[defineSetupPluginEntry](/plugins/sdk-entrypoints/define-setup-plugin-entry#definesetuppluginentry)
- <a id="registration-mode" />[注册方式](/plugins/sdk-entrypoints/registration-mode#registration-mode)

## <a id="plugin-shapes"></a> 插件形态

OpenClaw 根据已加载插件的注册行为对其进行分类：

| 形态                 | 描述                                        |
| --------------------- | -------------------------------------------------- |
| **普通能力**  | 一种功能类型（仅限 e.g. 提供商）           |
| **混合能力** | 多种能力类型（e.g.提供商+语音） |
| **仅挂钩**         | 一种能力类型（例如，仅 provider）                        |
| **无能力**    | Tools/commands/services 但没有能力        |

使用 `openclaw plugins inspect <id>` 查看插件的形态。

托管代理数据库架构扩展属于私有工作后端，而不是类型化的公共插件 SDK。捆绑后端作者应遵循 [ 私有工作模式扩展合约 ](/reference/database-schemas/worker-access#private-worker-schema-extensions)。

## <a id="related"></a> 相关内容

- [插件 SDK 概述](/plugins/sdk-overview) - 注册 API 和子路径参考
- [插件运行时助手](/plugins/sdk-runtime) - `api.runtime` 和 `createPluginRuntimeStore`
- [插件设置和配置](/plugins/sdk-setup) - 清单和设置条目加载
- [构建通道插件](/plugins/sdk-channel-plugins) - 构建 `ChannelPlugin` 对象
- [构建提供商插件](/plugins/sdk-provider-plugins) - 提供商注册和挂钩
- [决策模型](/plugins/sdk-overview/capabilities#decision-models-contract-version-1) - `openclaw/plugin-sdk/decisions` 和类型化决策提供者合约

## <a id="code-mode-executor-runtime"></a> Code 模式执行器运行时

使用 `openclaw/plugin-sdk/code-mode-executor-runtime` 实现 `quickjs` 执行器选择。代码模式有两个可选 ID：`node`（由核心拥有）和 `quickjs`（由执行程序插件提供）。该插件的安装 ID 可能与其执行程序 ID 不同。在 `contracts.codeModeExecutors` 中声明 `quickjs` 并从插件的顶级 `code-mode-executor-api` 工件导出 `codeModeExecutor`。仅当选择 QuickJS 时，主机才会解析此工件；普通插件注册仍然是轻量级的。

尽管全局插件禁用或限制性白名单，选定的捆绑执行器仍保留核心运行时可用性。明确的所有者否认和禁用条目仍然适用。外部执行器保留完整的插件策略。

`CodeModeExecutor.execute(input, options)` 接收来宾源、工具声明、命名空间描述符、资源限制和作用域主机桥。返回有界完成或失败，或包含执行者拥有的 `CodeModeExecutorContinuation` 的等待结果。其 `resume` 方法转移一次托管权，`retainedBytes` 报告诊断大小估计，`dispose` 加入清理并保持失败的清理可重试。处置已经消耗的延续没有任何效果。选定的执行器在配置更改期间保持附加到延续。

SDK 提供通用访客控制器、源准备、结果捕获、有界错误文本和工作协议类型。执行者拥有他们的引擎和暂停状态。核心拥有权限、审批、工具调度、结算收据、输出交付、到期和取消。缺少或禁用的执行器显式失败；主机永远不会替代一个不太孤立的执行者。

控制器的 `__openclaw*` 挂钩协议是实验性的，并随控制器源的变化而变化。桥接结算仅限主机：在评估 `CODE_MODE_CONTROLLER_SOURCE` 之前，在 `__openclawHostRequest` 旁边注册一个 `__openclawHostTakeBridgeReply` 回调（控制器捕获并删除两者）。为了解决这个问题，在主机端暂存回复并调用 `__openclawSettleBridge()`（不带任何参数）；控制器从回调中提取每个回复，直到返回 `undefined`。将每个回复作为具有自己的数据属性 `id`、`ok` 和 `json` 的对象返回，而不是通过来宾对象上的普通属性分配。调用 `__openclawSettleBridge(id, ok, payload)` 的执行程序必须转至此拉取形式。

## <a id="native-mcp-app-adapters"></a> Native MCP 应用适配器

拥有 MCP 连接的代理harness可以与 `loadMcpToolCatalog` 一起实现 `acquireMcpAppRuntime`。获取会接收准确的会话身份、配置的服务器名称、会话工具覆盖、请求者身份和 `assertCurrent` 调用防护。通过现有连接返回 `SessionMcpRuntimeLease`；不要创建第二个客户端来启动应用程序。

对于冷会话，请调用可选的惰性 `prepareSession` 回调。 Core 返回一个版本化的会话准备信封（`version: 1`、`purpose: "mcp-app"`），其 `params` 携带所需的承认的主机功能、准备好的凭证、环境和会话事实。在其 `run` 回调中执行现有的本机 session/thread 生命周期，然后借用生成的线程拥有的连接。这是会话准备操作，而不是模型尝试：它没有提示或转录工件，并且不得提交模型回合。热会话不会呼叫准备者。保留的回调必须遵守源和主机关闭；仅当没有受支持的准备或现有的本机绑定可用时，才返回 `undefined`。

当前的 Codex 应用服务器 `mcpServer/resource/read` 合约不接受 `_meta`。因此，本机远程 MCP 资源读取无法请求元数据选择的表示； OpenClaw 报告该限制，而不是发送不支持的线字段。受管理的 MCP 客户端仍然转发资源 `_meta`，并且主机文件表示仍然可以通过本地主机文件所有者使用。

运行时保留每个应用程序视图的本机连接和线程订阅，公开 `assertOwnerCurrent` 以重新验证其确切的 thread/client 绑定，并保留服务器、工具和连接器边界。 `callTool` 接受可选的 `_meta` 和 `assertCurrent`；在等待任何准备之后，立即在上游 I/O 之前运行守卫。主机单独实施会话共享、请求者身份、有效工具策略和批准策略。元数据不授予权限。

利用适配器在 `McpToolCatalog` 中发布支持的入口点、结构化设置和提及发现，而无需添加模型工具。捆绑的 Codex 适配器通过其现有的私有 `codex-mcp-projection` 外观重用核心元数据和批准提示解析器；这些实现助手不是额外的公共 SDK 导出。

捆绑适配器的私有 `createHarnessMcpFormResourceContext` 接受 `AgentHarnessMcpFormResourceParamsV1` （`version: 1`） 并将丰富的预览和上传绑定到确切的原始运行时、服务器、请求者和待处理问题。它的工具准备器仅接收工具名称、输入、取消信号和当前权限断言；网关调度选项和上传实现对主机保持私有。运行时可能仅针对可以读取主机本地文件的当前传输公开 `canReadLocalFiles(serverName)`。共享表单适配器使用该事实来选择工作区上传；远程传输不会接收不可用的主机 `file:` URI。本机无转弯工具引出使用原始请求范围，与模型转弯引出路由分开。

## <a id="mcp-subprocess-runtime"></a> MCP 子进程运行时

**Import：** `mcpStdioRuntime` from `openclaw/plugin-sdk/agent-harness-runtime` 在打开连接时使用动态 `import()`。它的冻结对象延迟加载一个工厂：

```ts
const { mcpStdioRuntime } = await import("openclaw/plugin-sdk/agent-harness-runtime");
const { createMcpStdioClient } = await mcpStdioRuntime.load();
```

将 `createMcpStdioClient(params)` 用于面向有状态驱动程序的调用者拥有的 MCP 代理子进程。 OpenClaw 拥有子进程及其后代、换行符框架和 JSON-RPC 验证、初始化、请求准入、截止日期和关闭。当工厂返回时，客户端开始连接。使该运行时远离插件注册和不打开 MCP 连接的路径。

供应 `command`、可选 `args` 和精确的 `env`。孩子不会继承其他环境变量。设置`clientInfo`（`name`和`version`），所需的`protocolVersion`，`startupTimeoutMs`，`maxPendingRequests`和`maxFrameBytes`。服务器必须准确返回所请求的协议版本。 OpenClaw 保留固定的 32 KiB stderr 尾部，用于意外退出诊断。解码器将 `maxFrameBytes` 应用于每条消息，包括其终止换行符，因此单个标准输出块可以包含多个有效消息。它会在保留该块中的任何字节之前拒绝过大的帧，保留分段的 UTF-8，跳过空行，并需要安全的整数响应 ID。

调用者提供 `errors.unavailable(message, cause?)` 和 `errors.protocol(message, cause?)`，每个返回一个 `Error`。第一个对流程、生命周期、准入、截止日期和取消失败进行分类。第二个分类对格式错误的帧、非超时 JSON-RPC 错误和握手合同违规进行分类。特定于插件的工具结果标准化由调用者保留。

返回的客户端公开了三个方法：

- `isAvailable()` 同步报告初始化是否完成以及连接是否仍然可用。
- `request(method, params, { timeoutMs, signal? })` 等待启动并返回对象结果。已中止的信号或完整的待处理请求限制仅拒绝该调用。准入后，取消或超时会停用整个连接，并拒绝挂起的请求并保留致命错误。客户端会抑制 SDK 取消通知，因为它会终止进程。非超时 JSON-RPC 错误响应仅拒绝其通过 `errors.protocol` 的匹配请求。
- `stop()` 关闭准入，撤销待处理请求，并等待启动结算和自有进程清理。如果清理不确定，它会通过 `errors.unavailable` 和 `proxy cleanup could not be confirmed` 拒绝。它永远不会停止通过代理套接字访问的单独启动的服务。

`stop()` 成功后，可选的只读 `cleanupResult` 记录强制继电器报废：`reason: "forced-relay-exit"`、`signalRequested`、观察到的继电器 `exit` 代码和信号、`durationMs` 和 `escalationAfterMs`。当信号传递报告失败但随后确认退出时，它保留 `signalError`。对于普通的清理来说是不存在的。已关闭的 control/output/lineage 管道和匹配的关闭收据承认升级；随着关闭和集体撤离事实的到来，待决的部队请求将被重新考虑。一名直播主播通过其转播被杀死并收割。确认锚组缺席允许直接本机终止无响应的中继。实际的中继退出和服务器组消失必须在最初的硬期限内得到确认。不确定的清理会保留错误原因链中缺失的关闭事实和时间或信号传递详细信息。

格式错误的帧、不兼容的初始化、写入失败和意外的进程退出也会导致整个连接失效。第一个致命错误被保留。创建一个新客户端以重新连接。超时分类遵循 SDK 错误代码，因此超时编码的服务器错误也会终止连接。

## <a id="workspace-access"></a> 工作区访问

使用`openclaw/plugin-sdk/agent-workspace-runtime`声明、注册和获取`AgentWorkspaceAccess`，无需加载代理执行运行时。在注册期间声明已配置的远程工作区，以便调用者在其服务启动之前无法回退到本地文件。准备好时注册其桥并在服务停止时释放它。呼叫者保留其现有的文档授权。

仅当其路径不存在时，桥的可选 `createFileExclusive` 操作才会发布完整文件，并返回 `"created"` 或 `"exists"`。它必须使用原子独占创建操作，而不是在普通写入后进行单独的存在检查。工作区访问通过与其他桥接操作相同的服务生命周期检查来转发此功能。省略它的提供程序仍然支持其现有的读取和写入，但 `agents.files.set` 和 `expectedMissing: true` 明显拒绝在不更改文件的情况下创建。更新提供程序，或在其主机上创建文件并在编辑之前重新加载。

`createWorkspaceBootstrapFilePolicy({ workspaceDir, config })` 允许适配器将此桥限制为本机引导文档和配置的 `bootstrap-extra-files` 模式。检查 `canList` 的目录元数据、`canRead` 的文件字节以及 `canWrite` 的四个所有者可编辑文档。目录访问不允许读取其他文件。底层桥仍然强制文件系统包含并返回读取的解析源。

尚未启动或已停止的工作区访问会抛出 `WorkspaceAccessUnavailableError`。使用 `isWorkspaceAccessUnavailableError(error)` 通过包装错误或单独的 SDK 实例来识别此情况。错误代码为`WORKSPACE_ACCESS_UNAVAILABLE`；与消息文本不匹配。

可选的 `memoryFiles` 提供程序将工作区内存文件保留在主机上，而本机索引、嵌入提供程序和原始会话保留在网关上。它提供发现、文件检查、读取和更改通知。索引和`memory_get`都使用它；索引发布重新检查主机文件。已解析的源会返回一个读取供应来源，但不会解析过时的网关副本。停止工作区绑定将撤销保留的文件访问权限和订阅。内存文件工作线程支持 `--files <workspace>` 进行本机文件操作，无需打开主机索引或接收嵌入凭据。提供者可以通过其现有的子流程传输来调用它。 `createWorkspaceMemoryFileClient` 映射 Gateway/host 路径并保留该工作线程的本机错误。为一个 JSON 交换提供 `request`，为 `--watch-files` JSON-line 流提供 `subscribe`，以及绑定的中止信号。两个回调均不依赖于 Codex；提供商拥有自己的传输和授权。

`memoryFiles.maintenance` 将现有的梦想、升级、语料库和忘记文件操作路由到主机。复合写入重用本机原子发布和冲突处理；维护决策、锁定和 SQLite 状态保留在网关上。没有维护支持的远程绑定会失败，而不是使用网关文件。文件工作器实现这些操作和本机更改通知。配对节点文件传输适配器通过现有的服务拥有的节点通道和节点文件策略连接这些操作。请求者范围的 `writeDreams` 和 `appendCorpus` 调用与序列化请求分开携带 `assertCurrent`。传输必须在节点调度中保留该回调，并在准备后、开始远程写入之前立即重新检查它。拒绝关闭准备好的通道并等待接受的清理。

任务时技能准备使用远程发现。通道原生菜单使用网关拥有的技能，无需等待 Harness；在 [Enterprise #241](https://github.com/openclaw/openclaw-enterprise/issues/241) 中跟踪远程菜单支持。

可选的 `skillResources` 提供程序将技能读取与代理文档访问分开处理。其`readInstructions`读取Code Mode选择的指令文件； `readSkillFiles` 为工人送货提供捆绑包。网关拥有的捆绑、插件、库、工作室和用户级源保留其网关路径。工作区拥有的源使用远程提供程序。网关保留源优先级并使用工作人员的现有资源交付。 Discovery 分配文件所有权；提供者无法通过返回源或路径元数据来请求网关本地读取。停止绑定会撤销保留的主机读取器。

技能工作人员还运行安装和 ClawHub 操作。 Install/remove 使用经过身份验证的适配器的双工通道，因此网关策略和突变检查在本机文件系统操作之前运行。适配器承认源根并上传；工作人员使用其主机帐户的权限。

对于远程工作区，依赖项安装使用 `installSkillDependencies`。网关选择配方并运行安装策略；主机通过worker的`installDependencies`操作运行现有的安装程序。请求包含技能密钥、配方、安装首选项和超时。配方选择使用主机的 OS 和二进制文件。如果没有在网关上安装，缺少主机支持就会失败。文件检查网关策略从现有技能资源读取器接收临时树；网关拥有的源仍然是本地的。资源包限制适用。

`readWorkspaceSkillResources` 延迟重用有界本机包读取器。文件传输适配器可以在返回包之前检查每个文件的请求和验证的解析文件系统路径；仅承认技能目录并不能承认每个孩子。

当允许的技能源发生变化时，主机可以提供 `watchSkills(request, onChange, signal)` 来通知现有快照缓存。保持订阅活动直至中止，并在初始扫描和后续编辑后发送 `change`。如果文件监视停止，则发送 `unavailable`：准备工作然后在每次调用时刷新，而无需重新打开订阅。恢复后，仅当所有订阅源都已验证监视覆盖范围并且在中断期间所做的编辑已得到协调时才发送 `available`。这将恢复快照重用，而无需添加内容修订。单独的 `change` 永远不会清除不可用状态。仅发送 `change` 和 `unavailable` 的主机在中断后保留准备回退。没有 `watchSkills` 的主机始终使用该后备。 `skills.load.watch: false` 禁用订阅和此回退。 Gateway 在同一快照失效生命周期下在本地监视 Workshop。

配对节点文件传输适配器还通过 `workspace.skills` 连接技能发现、资源读取、监视和依赖项安装。其本机工作启动器使用 `agent-workspace-runtime` 中的 `resolveWorkspaceWorkerArgv("memory" | "skills")`，然后附加操作参数。网关和节点使用相同的OpenClaw版本。

该适配器不实现远程技能源 install/update/remove 或 ClawHub 生命周期操作；这些仍在 [Enterprise #242](https://github.com/openclaw/openclaw-enterprise/issues/242) 中进行跟踪。

## <a id="agent-workspace-context"></a> Agent 工作区上下文

本机harness使用 `openclaw/plugin-sdk/agent-harness-runtime` 中的 `prepareAgentWorkspaceContext` 来准备有界工作区上下文。共享所有者运行现有的引导挂钩、隐私过滤器和角色预算。 `scope: "full"` 将代理指令快照、角色、剩余项目上下文和工具路由内存引用分开。它通过主动内存插件准备​​召回指导，而无需发明后备策略。 `scope: "instructions-only"` 在预算之前选择已配置工作区的根 `AGENTS.md`，并且不准备角色或内存指南。

提供者适配器拥有本机项目文档发现、可用内存工具、路径投影、上下文顺序、指令载体和 session/turn 生命周期。可选的 `projectPath` 项目预算后的文件路径，无需更改其内容或个人用户出处。它描述了现有的执行位置；它不传输或安装文件。全上下文准备保留了 Codex 的现有选择时序：将根指令路径投影到远离 `workspaceDir` 的位置会产生一个空的根快照。准备源工作区指令的调用者应省略 `projectPath`。

`buildAgentWorkspaceInstructionSnapshot(contextFiles, workspaceDir)` 从已经有界的上下文中选择并呈现根指令文档，包括无钩子准备。空指令串表示捕获成功；准备失败必须保持可区分性和可重试性。

代理 API 可以在会话创建时使用仅指令快照。其当前的客户端不实现每回合开发人员指令、角色和个人覆盖刷新、回合范围项目或内存指导、本机分叉或网关到托管工作空间路径投影。这些仍然是 MVP 集成差距；共享准备不支持这些操作。

## <a id="tool-failure-diagnostics"></a> 工具故障诊断

代理harness可以从 `openclaw/plugin-sdk/agent-harness-runtime` 导入 `readToolOperatorHint(error)`，以读取附加到工具故障的可选操作员建议。仅将其包含在操作员日志中。将其排除在模型响应、工具结果回调和序列化转录本之外，并保留原始错误消息。未注释或不可变的错误不需要替代提示；当没有可用的建议时，读者返回`undefined`。

## <a id="acp-harness-turns"></a> ACPharness匝数

将可选的 `currentInboundContext` 从 `openclaw/plugin-sdk/agent-harness-runtime` 传递到 `resolveAgentHarnessBeforePromptBuildResult`。它在提示挂钩运行之前将提示与其入站上下文和通道提供的连接器组合起来。使用散文部分标签构建普通聊天，以便前导文件路径不能成为本机斜杠命令。在分配每个提供商尝试其自己的请求和回复身份时，保持轮流允许一名已获准的用户。

结果的 `developerInstructions` 包括插件系统上下文。当该上下文存在时，`threadDeveloperInstructions` 包含没有上下文的策略，而 `turnDeveloperInstructions` 包含包装的上下文。具有单独的持久指令载体和每轮指令载体的harness可以使用这些字段来刷新上下文，而无需重新加载其会话。挂钩 `systemPrompt` 替换件仍然是 `threadDeveloperInstructions` 的一部分。

主机 `requestApproval` 在共享显示范围内标准化标题和描述，并在 `detail` 中保留完整的操作证据。其响应通过 ID 确认该请求。用该 ID 调用 `waitForApproval` 以获得决定，然后在允许本机操作之前重新检查转弯信号和权限。

使用独立于代理运行超时的插件批准超时。经过身份验证的 Control UI 审阅者可以检查 `detail`，而通道消息保留有界描述。现有请求架构拒绝过大的详细信息。

## <a id="session-persistence"></a> 会话持久化

`agent-sessions` 公开了等待的 SessionManager 突变和版本化扩展操作。 `session-store-runtime` 提供 `prepareSessionEntryPatch` 用于主机准备，然后进行条件工作提交，并提供 `applySessionEntryPatch` 用于已准备好的数据。 `session-transcript-runtime` 提供 `withSessionTranscriptWrite` 和重复感知消息准备。已发布的同步和不透明交易回调表单在 2026 年 12 月 31 日之前仍然被弃用，并在 2027 年 1 月的第一个稳定版本中删除。请参见 [ 会话条目迁移 ](/plugins/sdk-migration/how-to-migrate#prepare-session-entry-changes) 和 [ 脚本迁移 ](/plugins/sdk-migration/how-to-migrate#await-locked-transcript-preparation)。

对于普通会话准备，请等待来自 `session-store-runtime` 的 `getSessionEntryAsync`、`readSessionUpdatedAtAsync`、`getConversationSessionAsync` 或 `readAmbientTranscriptWatermarkAsync`。本机命令准备使用 `command-auth-native` 中的 `resolveStoredModelOverrideAsync` 和 `resolveCommandArgMenuAsync`；菜单助手也可从 `native-command-registry` 获得。它们的同步兼容性 API 在 2026 年 12 月 31 日之前仍然被弃用。请参见[会话和命令准备](/plugins/sdk-migration#session-and-command-preparation)。

## <a id="stateful-cli-commands"></a> 有状态 CLI 命令

`openclaw/plugin-sdk/cli-state-owner` 出口 `runWithLocalStateOwner`。提供网关 `method`、可序列化 `params`、诊断 `target` 和 `runLocal`。仅在 `runLocal` 内打开数据库并加载具有突变能力的运行时状态；它的范围提供承认的配置、环境、中止信号和当前所有者断言。在回调返回之前关闭插件拥有的商店。

助手路由到本地网关及其预期所有者ID，或通过资源结算保留独占离线所有权。它永远不会在本地重播不确定的 Gateway 突变。对于需要离线网关的命令，请使用 `onForeignOwner: "refuse"`。可选的`scopes`保留命令现有的授权合同；默认为 `operator.admin`。在网关上启动多请求操作后，如果后续请求失去其所有者，请在访问配置或执行本地工作之前拒绝 `runLocal`。

网关处理程序可以使用 `openclaw/plugin-sdk/gateway-runtime` 中的 `captureLocalStateMutationGuard` 来绑定预期所有者和当前请求权限，然后将返回的断言传递到其现有的写入者准入和特权效果边界。来自同一入口点的 `isImplicitLocalGatewayTargetFromCli` 保留显式和配置的远程 CLI 目标。 `runWithLocalStateMutationOwner` 为插件传输效果和披露添加现有通道权限范围；将其断言也传递到插件的数据库编写器和文件发布边界中。版本化所有者绑定的 RPC 名称让 CLI 调用者需要更新的插件处理程序，而无需假设更新的网关也升级了独立安装的插件。
