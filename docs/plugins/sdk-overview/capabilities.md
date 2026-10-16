---
summary: "OpenClawPluginApi 上的提供者、存储、工作人员和嵌入注册"
title: "插件SDK能力注册"
sidebarTitle: "能力注册"
read_when:
  - "您正在注册推理、媒体、搜索或转录提供商"
  - "您正在实施云工作者提供商生命周期"
  - "您正在注册嵌入提供商"
  - "您正在实施存储位置传输"
---

`OpenClawPluginApi` 上的功能注册器以及工作线程、存储或嵌入提供者必须满足的运行时合约。 [插件SDK概述](/plugins/sdk-overview)的一部分。

## <a id="capability-registration"></a> 能力注册

| 方法                                           | 注册内容                                                                 |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `api.registerProvider(...)`                      | 文本推理（LLM）                                                              |
| `api.registerWorkerProvider(...)`                | 云工作器生命周期租约                                                     |
| `api.registerStorageProvider(...)`               | 命名位置的不透明对象存储                                         |
| `api.registerModelCatalogProvider(...)`          | 文本和媒体生成的模型目录行                                  |
| `api.registerAgentHarness(...)`                  | [实验性](/plugins/sdk-agent-harness) 原生代理执行器（Codex、Copilot） |
| `api.registerCliBackend(...)`                    | 本地 CLI 推理后端                                                       |
| `api.registerChannel(...)`                       | 消息传递渠道                                                                 |
| `api.registerEmbeddingProvider(...)`             | 可复用的向量嵌入 provider                                                |
| `api.registerSpeechProvider(...)`                | 文本转语音 / STT 合成                                                    |
| `api.registerRealtimeTranscriptionProvider(...)` | 流式实时转录                                                  |
| `api.registerRealtimeVoiceProvider(...)`         | 双工实时语音会话                                                    |
| `api.registerMediaUnderstandingProvider(...)`    | Image/audio/video分析                                                        |
| `api.registerTranscriptSourceProvider(...)`      | 实时或导入的会议记录源                                        |
| `api.registerImageGenerationProvider(...)`       | 图像生成                                                                  |
| `api.registerMusicGenerationProvider(...)`       | 音乐生成                                                                  |
| `api.registerVideoGenerationProvider(...)`       | 视频生成                                                                  |
| `api.registerWebFetchProvider(...)`              | 网页获取 / 抓取 provider                                                       |
| `api.registerWebSearchProvider(...)`             | 网页搜索                                                                        |
| `api.registerCompactionProvider(...)`            | 可插拔的转录压缩后端                                           |

与入站通道共享帐户命名空间的转录源提供程序使用该通道 ID 和共享帐户解析器声明 `accountOwnership` 描述符。然后，OpenClaw 会忽略同一通道捕获的模型选择的帐户 ID，绑定受信任的入站帐户，并将其记录为会话所有者以供以后的生命周期操作。解析器还会在 OpenClaw 开始或持续实时捕获之前选择省略的帐户。它会验证已绑定的受信任帐户而不重定向它，并在不存在唯一的有能力的帐户时返回可操作的类型错误。配置的自动启动必须提供一个非空源帐户或使用此描述符解析一个。 OpenClaw 在保留启动或调用提供程序之前拒绝不明确或未解决的所有权。提供程序别名仅是查找名称，不得用于此声明。

### <a id="storage-providers"></a> 存储提供商

从 `openclaw/plugin-sdk/plugin-entry` 导入 `StorageProvider`、`StorageProviderOpenParams`、`StorageBackend` 和 `StorageObjectInfo`。向 `api.registerStorageProvider(provider)` 注册传输并在 `contracts.storageProviders` 中声明其 `id`。未声明的 ID、重复的 ID 和核心拥有的 `filesystem` ID 将被拒绝。配置的 `storage.locations.<name>.provider` 会自动启用其捆绑所有者，并遵守显式插件禁用和拒绝规则。外部插件仍然需要显式启用。

提供程序具有 `id`、`label`、返回面向用户的错误的可选同步 `validateSettings(settings)`、可选 `describeTarget(settings)` 和异步 `open(params)`。 `describeTarget` 返回非秘密显示目标或 `undefined`。它必须是纯粹且同步的：从没有 I/O 或秘密解析的设置中导出目标。配置列表仅针对内置提供程序或提供的注册表中已存在的提供程序调用它；他们从不激活插件或打开后端来描述目标。否则，`displayTarget` 被省略。

内核向 `open` 传递位置名称、只读设置、可选中止信号和 `resolveSecret(ref)`。通过该回调解析凭证；秘密轴承设置必须包含 SecretRefs。返回具有非秘密 `displayTarget` 的后端和以下方法：

| 方法                                        | 契约                                                                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `probe({ signal }?)`                          | 返回可选的 `freeBytes` 和 `totalBytes`。                                                             |
| `putObject(key, body, { sizeBytes, signal })` | 使用 `AsyncIterable<Uint8Array>` 并返回存储的字节数。切勿覆盖现有密钥。 |
| `getObject(key, { signal }?)`                 | 返回字节流，或者对于不存在的对象返回 `undefined`。                                                |
| `statObject(key, { signal }?)`                | 返回 `{ key, sizeBytes, modifiedAt? }` 或 `undefined`。时间戳使用毫秒。                    |
| `listObjects(prefix, { signal }?)`            | 前缀下的流对象元数据。                                                                |
| `deleteObject(key, { signal }?)`              | 删除对象。                                                                                        |
| `close()`                                     | 可选的异步资源清理。                                                                   |

`sizeBytes`（如果提供）是准确的。当后端支持时使用原子条件创建；否则首先检查现有对象并记录比赛。在整个流式传输过程中遵守中止信号并保持内存有限。核心在调用传输之前验证密钥：ASCII 字母、数字、`.`、`_` 和 `-` 的斜杠分隔段，不包括 `.` 和 `..`，没有空段、前导斜杠或反斜杠，最多 512字节。

提供者存储不透明字节。 Core 拥有位置初始化、标记身份、命名空间、加密和健康分类；消费者自己的保留。提供商不得创建或解释位置标记或暴露 `displayTarget` 或错误中的凭据。请参阅 [ 存储位置 ](/concepts/storage-locations)。

### <a id="worker-providers"></a> Worker 提供商

工作人员提供商还必须在 `contracts.workerProviders` 中声明其 ID。

可选的同步 `resolveDisplayId(profile)` 挂钩提供非秘密后端显示 ID 用于选择器演示。返回 1–64 个小写 ASCII 字母、数字或连字符，以字母开头（例如，`aws`）。从本地验证的设置中派生出来；请勿运行命令、读取凭据或进行网络调用以进行品牌宣传。现有的配置文件目录通过其 provider/settings 快照缓存了这一装饰事实。丢失、无效或抛出的元数据将被忽略，而不隐藏配置文件或其计算机选择。 `environments.list` 将其投影为可选 `providerDisplayId`，从不设置。路由 `providerId`、配置文件 ID、权限和分配行为保持不变。 Crabbox 使用经过验证的后端提供程序，因此名为 `production` 的配置文件可以显示 AWS，而无需从其名称猜测。提供者可以实施 `maintain({ profiles, signal, assertCurrent })` 进行有界清理，该清理必须在没有活动租约的情况下继续进行。网关从其现有的定期工作扫描中为启用的、配置的提供者调用它，与分配和协调等待分开。 `profiles` 包含提供商当前配置的配置文件的克隆设置。在外部影响之前和在持久突变之前等待工作之后立即致电 `assertCurrent()`；当调用稳定、其配置或注册更改或网关停止时，权限结束。遵守 `signal` 并仅在拥有的命令停止后进行结算。提供商的插件服务还必须在一代更换期间取消并耗尽维护。吊钩不得将运行能力或维护视为用户需求；保留和清理政策仍然由提供商拥有。

核心在 `provision(profile, operationId, options?)` 之前坚持持久意图。提供程序在外部分配之前验证设置和任何可选的 `options.machineClass`、`options.os` 和 `options.executionMode`，并抛出 `WorkerProviderError` 以永久拒绝配置文件。 `provision` 对于相同的操作id和选择的执行模式必须采用相同的租约；重试不能默默地改变模式。如果提供者拥有的设置在分配和清理不确定后失败，则抛出 `WorkerProviderError.cleanupIndeterminate(leaseId, provisionError, cleanupError)` ，以便核心保留已知的租约并协调拆卸而不是重放供应。如果提供者确认清理已完成，则抛出 `WorkerProviderError.cleanupComplete(leaseId, provisionError)`。核心完成本地拆卸，包括节点注册停用，并将原始错误报告为 `provider_failure`。配置意图变为终端。仅在证明操作的分配释放或权威缺席并且其租赁清理命令已解决后，报告才会确认清理。单独保留的检查点、图像退役和捕获恢复义务仍然由提供商拥有；该信号不会清除它们。普通错误保留不确定的分配，以便使用相同的操作 ID 进行重放。提供者可以使用异步 `listMachineOptions(profile)` 公开流程稳定的选择器元数据；当配置文件没有有意义的机器选择时，请省略该钩子。机器选件包含 `id`、`label`、可选 `os`、可选正整数 `cpu` 和 `memoryGb` 以及可选 `default`。不带 `os` 的选项适用于每个公布的操作系统。可选的异步 `listOperatingSystems(profile)` 挂钩返回提供者拥有的 `{ id, label, default?, disabledReason? }` 选择。可选的 `disabledReason` 使不可用的目标保持可见但不可选择，并提供修复提示（1-256 个字符，周围没有空格）。提供商仍然在分配之前验证目标可用性；选择器元数据不授权配置。插件作者可以从 `Awaited<ReturnType<NonNullable<WorkerProvider["listOperatingSystems"]>>>[number]` 派生项目类型或声明本地结构类型；没有公共 `WorkerOperatingSystem` 导出。核心将 OS id 视为不透明字符串；插件拥有自己的意义和验证。 `environments.list` 为每个配置文件提供最多 64 个机器选项和最多 8 个操作系统，当只有一个选择时，将省略操作系统列表。会话放置提供程序按以下固定顺序声明一个或两个当前 `supportedExecutionModes` 值：`["worker-turn"]`、`["remote-exec"]` 或 `["worker-turn", "remote-exec"]`。空列表、重复值、未知模式和无法识别的订单将被拒绝。 `worker-turn` 需要节点租用； `remote-exec` 接受节点租赁或现有的 SSH 租赁。省略不宣传任何放置模式，同时保留直接的环境生命周期调用。没有会话的直接环境创建不提供执行模式，因此提供者保留其有意的默认设置；捆绑的 Crabbox 提供程序默认为 `worker-turn`。其配置可以合理地超过核心的五分钟默认值的提供商可能会从 `resolveProvisionTimeoutMs(profile, options?)` 返回正的毫秒预算；包括该范围内的收购、提供商拥有的设置和清理。 `resolveDestroyTimeoutMs(profile)` 声明了等效的拆卸预算，包括在确认发布之前捕获快照或其他提供商拥有的工作。核心使用该预算来进行所请求的拆卸和引导失败清理；显式服务超时覆盖优先。预算必须是平台计时器限制内的正安全整数。内核从持久环境记录中向 `provision` 和 `prepareProvision` 提供可选的 `options.profileId`。它识别配置的配置文件以进行显示，包括配置文件更改或删除后的重播；它不会更改分配标识或替换冻结的设置快照。

可选的 `options.signal` 取消当前的配置尝试。将其转发至采集、项目准备、设置、准备和注册等待，并在拒绝之前解决活动命令；调用者可见的超时或中止并不能证明提供者子项退出或租约已释放。将其与项目、运行时准备和注册信号组合在一起，而不是将其替换为更窄的拨款信号。保持清理其独立的、未取消的生命周期权限。核心记录会破坏确切操作的意图，并在正常拆卸之前解析其分配；无法立即取消的提供商在其实际运营解决之前仍保留所有权。网关关闭是不同的：注册关闭本身就保留了重新启动采用的固定分配，而中止的配置信号意味着明确的取消。

提供者可以实现 `prepareProvision(profile, operationId, options?)`，返回分配函数 `() => Promise<WorkerLease>`。准备可以验证本地设置并读取配置，但不得分配、更新、修改资源、注册节点或调用项目准备。核心在准备期间在 `requested` 中保持新鲜环境，并在调用返回函数之前立即记录 `provisioning`。准备好的事实仍保留在该调用中；不要在分配函数中重新读取配置。新的准备失败不需要提供者拆卸。重放准备失败仍然不确定，因为先前的调用可能已经分配。取消或超时会丢弃准备好的函数。没有此挂钩的提供商保留现有的 `provision` 合约；实现它的提供者应该将其直接 `provision` 入口点委托给相同的准备和分配流程。

对于提供商拥有的 SSH 身份解析，核心提供可选的 `request.assertCurrent` 回调。它检查当前租约和本地身份调用；初始化 SSH 调用者还将其绑定到其准备生命周期。解决后或调用者可见的超时后，核心会拒绝迟到的身份结果并关闭保留的回调。无需功能声明即可继续支持旧版解析器；他们可能会在等待之后的进一步效果之前调用回调，但核心无法阻止忽略它的解析器中的内部效果。这不会改变配置、更新或清理权限。

每个工作提供者都必须实现 `resolveAllocation(profile, operationId)`，返回 `{ leaseId: string; sharedHost: boolean }` 进行精确操作。即使指定的配置文件发生更改或删除，核心也会传递冻结的设置快照。句柄标识清理目标；它并不能证明机器已创建或运输已准备就绪。解决方案不得分配、启动、更新、运行安装程序、读取安装程序机密、注册节点或等待可用性。如果无法安全解析身份，则抛出该异常。当在记录供应结果之前请求销毁时，核心将保留该句柄与现有的拆卸状态，并调用 `destroy`，而不重放 `provision`。 `destroy` 仍须证明发布或权威缺席。这两个调用在任何早期的提供程序操作之后都保持序列化，直到它实际解决为止，包括在调用者可见的超时之后。

对于节点提供商，核心向 `resolveProvisionTimeoutMs` 和配置提供可选的 `options.nodeBootstrapTimeoutMs`。这是每个运行时-preparation/enrollment 阶段核心拥有的最大值，包括引导后的连接等待；为提供商可能运行的每个阶段保留一次。拨款是在分配后到达的，因此它们的大小无法确定最初的外部截止日期。每个运行时或注册授权都提供可选的 `bootstrapTimeoutMs`，这是从其实际工件（下载两个档案时的组合字节）派生的命令窗口。在保留的外部预算内使用该窗口执行命令，将诊断和清理分开。这些可选事实保留了现有提供者源的兼容性；它们带有计时策略，而不是权限、过期或重试许可。

注册云节点的提供商设置`requiresNodeEnrollment: true`，并在分配机器后调用`options.beginNodeEnrollment()`。返回的 `WorkerNodeEnrollment` 提供 `displayName`、`openclawVersion`、可选的注册生命周期 `signal`、`waitForDeviceId()` 以及 `mode: "connect"` 以及 `setupCode` 和 `setupId`，或者`mode: "resume"` 与绑定的 `deviceId`。其所需的 `nodeBootstrap` 包含网关准备的运行时存档的 `url`、秘密承载 `token`、`sha256`、`bytes`、`openclawVersion`、`enabledPluginIds` 和可选的 `tlsFingerprint`。下载确切的存档，验证其大小和摘要，安装其目标平台依赖项，并在连接之前在节点的隔离状态下启用列出的插件。不要仅根据匹配版本替换全局包或注册表包。将下载和注册凭据保留在命令参数、日志、npm 和启动的节点环境之外；当 `signal` 中止时取消工作。下载权限属于实时注册尝试，而不是单独的 URL 或摘要。连接后，从节点租约中的`waitForDeviceId()`返回设备标识。有关源代码构建、工件重用和代理要求，请参阅 [ 捆绑包安装 ](/gateway/cloud-workers#bundle-installation)。 Bootstrap 安装不会授权节点命令或替换调用策略。

捕获可重复使用的项目图像的提供商可以声明 `supportsProjectPreparation(profile, machineClass?, os?)`。可选的放置覆盖是字符串；机器级参数保留其现有位置，因此旧的提供程序仍然兼容。在决定是否支持准备时使用这些覆盖。对于符合条件的 Git 放置，核心会在分配之前保留项目标识和固定的基本提交，然后提供 `options.project`。在分配的机器上调用其`prepare({ runScript, upload })`适配器；核心拥有有界的 Git 传输、干净的签出验证和缓存布局，而提供者拥有命令和文件传输。尊重 `project.signal` 并致电 `project.assertCurrent()` 围绕等待的提供商工作。保留的回调在配置尝试关闭后拒绝。项目密钥的范围仅限于网关和存储库，包括链接的工作树。仅存储库源还绑定存储库实例和当前共享读取身份； core 重新验证可见性和访问权限。公共资源无需工作人员凭据即可获取。私有源使用网关拥有的经过身份验证的临时对象存储，并通过同一适配器仅传输经过验证的 Git 包；提供者脚本和上传永远不会收到 GitHub 凭证。公共和私有源具有单独的项目密钥，无需更改其持久源字段。未进行项目准备的提供商在注册后保留普通结帐。会话编辑和 Git 凭据不包括在准备好的基础中。

可选的`project.label`是显示元数据，不影响项目密钥。本地快照保留来自 `origin` 远程的规范化 `host/owner/repo`，或者在无法解析存储库标签时保留项目根基本名称；该标签在重播时保留。当核心将项目传递给提供者时，存储库项目从其承认的标准化 URL 中派生出相同的标准化标签。

可以在专用节点上保留完整设置的提供商还实施 `resolvePreparationTarget(profile, machineClass?, os?)`，返回有效的机器类别和平台，以及已知的架构。提供商还可以返回 `profileKey`，这是其解析的磁盘和启动设置的 SHA-256 摘要，不包括运行时工件和租赁策略。核心使用该指纹来实现快照兼容性；省略它的提供商保留保守的基于设置的兼容性。 Core 将目标事实与项目身份、设置方案、工作区协议和准备合同版本相结合。单独的就绪工作线程密钥还在分配之前绑定了确切的提交、配置文件和当前运行时工件。当 `options.project.preparation` 存在时，用 `runScriptWithBudget(createScript, signal)` 以及现有的传输方式调用 `prepare`；在运行存储库代码之前将命令的剩余毫秒预算传递给渲染器。即使较旧的映像具有相同的提交和运行时，也会尊重返回的 `captureRequired: true`，同时保留所选映像生成的捕获权限。 `provision` 返回的节点租约必须包含 `sharedHost: false` 以证明专用所有权； `true` 或省略的字段在准备工作空间注册之前被拒绝。核心通过租约验证保留提供的布尔值。 Core 在注册后注册返回的工作区和清单身份，然后将它们绑定到确切的会话一次。在已注册的配置重试时，调用 `project.inspectPreparedWorkspace({ runScript })` 来恢复现有的完成事实，而无需传输、执行设置或捕获。遗漏或更改的完成明显失败；它不能成为新的原始基线。

Core 提供 `options.nodeRuntimeIdentity` 作为无授权准备事实：节点存档 SHA-256、执行模式和工作线程存档 SHA-256（当项目准备保留该存档时）。在确定捕获的运行时内容是否是当前内容时比较此标识；版本字符串不够。核心根据这些准备好的字节检查稍后的运行时和注册描述符，并在身份更改时关闭其授予。

参与准备项目就绪容量的提供商实施 `resolvePreparedIdleTimeoutMs(profile)`，从其现有空闲策略中返回正安全毫秒持续时间，或在不支持储备时返回 `undefined`。 `options.project.preparation`还携带`purpose`（`"session"`或`"reserve"`）和始发`demandAtMs`；重复分配必须保留两者。储备准备和补充不会创造新的需求。激活成功后，核心可以调用`notePreparedDemand({ leaseId, profile }, { preparationKey, demandAtMs })`。仅更新该租约选择或生成的确切图像生成；时间戳和匹配摘要并不授权更改另一代。该钩子仅记录元数据；它不得分配、捕获或更新工人。当就绪容量被禁用时，仍然记录成功的前台需求。分配和分叉时间戳不会建立成功的前台需求。在激活之前保持新捕获的前景图像的需求未设置，同时保留其制作者的实际生成收据直到确认源停止。

在普通注册或项目捕获之前，调用 `options.prepareNodeRuntime()` 即可获取工件访问权限，而无需创建节点标识或注册代码。结果包括 `nodeBootstrap`、`workerBundle` 和操作取消 `signal`。工作线程存档描述符在已安装的节点包中提供 `url`、秘密 `token`、`sha256`、`bytes`、可选 `tlsFingerprint` 和核心拥有的 `packageRelativePath`。下载并验证这两个存档，安装运行时，并在注册或捕获之前在该确切包含位置发布压缩的工作程序存档。捆绑的 Crabbox 提供程序使用相同的准备步骤进行无项目注册，将工作程序存档下载与运行时安装重叠。每个运行时包保留一个已发布的工作程序存档，排除凭据和收据，并且切勿将独立有效负载添加到精简运行时存档中。普通的经过身份验证的安装程序会验证准备好的字节并在注册后创建全新安装；原始档案不授予任何许可权限。在调用 `beginNodeEnrollment()` 之前完成捕获。开始注册、取消、更换或关闭将撤销两项准备补助金。具有不确定结果的本机捕获必须先解决或显式恢复，然后注册才能将凭据引入其源计算机。在联系提供商之前保留原始 cold/checkpoint 分配决定，保留检查点引用直到确认发布，并且在重播相同操作时切勿切换图像。

Core 通过租约保留经过验证的配置文件设置，并将该快照提供给 `destroy({ leaseId, profile })`（必须可以安全地重复）和 `inspect({ leaseId, profile })`（返回 `active`、`dormant`、`destroyed` 或 `unknown`）。这允许提供程序在网关重新启动或命名配置文件删除后路由生命周期调用。 SSH 端点使用 `SecretRef` 作为 `keyRef`，从不内联密钥材料，并包含来自可信配置输出的 `hostKey`，与 `algorithm base64` 完全相同，没有主机名或注释。核心引脚 `hostKey` 并且从不信任第一次连接时的密钥。提供商还可以返回最多 10 个有序的唯一 `fallbackPorts`（从 1 到 65535 的整数端口，不包括主 `port`）； core 验证并保留那些广告候选者，以进行安全重复检查、内容寻址传输、receipt/lock-guarded 工件安装、聚合托管工作树镜像和隧道重新连接。不明确的不受保护的状态命令会被拒绝，并且不会在候选者之间重播。当 SSH 帐户还拥有不相关进程时，租约可能会设置 `sharedHost: true`；然后，core 会在工作区协调期间避免主机范围内的进程冻结。对于普通租约，遗漏保留了传统的专用主机行为；准备工作空间注册需要在配置结果中显式 `sharedHost: false`。主动检查重复了这一事实，因此核心可以协调提供商拥有的隔离，以在该字段存在之前持续存在租赁；隧道启动等待第一次权威检验。铸造动态 `keyRef` 的提供商可以实现 `resolveSshIdentity({ leaseId, profile, keyRef })`；如果存在，该解析器是权威的，而没有它的提供者则使用配置的通用秘密解析器。 `WorkerLease.desktop`是可选的，形状为`{ protocol: "rfb"; port: number; passwordFilePath?: string; username?: string; allowsResize?: boolean; apps?: WorkerDesktopApp[] }`； `passwordFilePath`（如果存在）必须是工作线程上的绝对路径（POSIX 或 Windows）。设置 `allowsResize: false` 会限制本机桌面在提供程序范围内调整虚拟显示大小。提供商从 `provision` 报告了这种预热时间功能；它不能改装为实时租赁。拥有 SSH 或节点运营商在需要时读取工作节点上的密码，并且永远不会将其保留在网关存储中。 `WorkerDesktopApp` 是封闭联合：`{ id: "browser"; executablePath: string; args?: string[]; cdpPort: number }` 或 `{ id: "terminal"; executablePath: string; args?: string[] }`。应用程序 ID 必须是唯一的，可执行路径必须是绝对的，浏览器 CDP 端口必须是从 1 到 65535 的整数，并且列表最多接受 8 个条目。核心拒绝未知的 ID 和字段。可选的 `args` 由提供商固定，并与其认可的启动器一起旅行，而观看者从未提供。它们在节点上运行时没有 shell；每个参数都是 NUL-free，且限制为 4 个 KiB，最多有 32 个参数，总共 8 个 KiB。网关验证接受独立于网关 OS 的 POSIX 和 Windows 绝对路径；节点验证其本机路径语法。可选的 `username` 标识租赁拥有的 ARD 帐户，其密码从 `passwordFilePath` 读取并在节点和网关之间保持瞬时状态。托管ARD账户认证需要节点运营商；凭据永远不会进入浏览器。普通主机桌面保留其现有的查看器提供的 ARD 凭据。具有可更新租赁的提供商也可以实施 `renew(leaseId)`。 `inspect` 必须引发瞬时或不确定的故障；仅当权威缺席时才返回 `unknown`。内核可以通过 `inspect({ leaseId, profile, signal })` 中的可选 `signal` 来取消关闭期间的观察。将其转发给检查命令并在拒绝之前解决拥有的命令；取消并不证明租赁不存在或授权拆除。核心隔离了一个权威性缺失的环境并调用正常的拆卸；共享或未知主机隔离仍然需要确认确切的工作线程已停止。不得仅仅为了释放其逻辑租约而停止或取消配对共享主机。

使用 `api.registerEmbeddingProvider(...)` 注册的嵌入提供程序还必须在插件清单的 `contracts.embeddingProviders` 中列出。这是用于可重用矢量生成的通用嵌入表面。内存搜索消耗这个通用提供者表面。旧的内存特定注册商和清单合同在 2026 年 8 月迁移窗口后被删除。

嵌入提供商可以使用 `EmbeddingProviderBatchRuntime` 和 `openclaw/plugin-sdk/embedding-provider-runtime-contract` 键入其异步 `batchEmbed(...)` 功能。公共合约包含批处理块和执行选项，没有主机缓存或身份元数据。除非运行时设置 `sourceWideBatchEmbed: true`，否则批次将保留在每个文件中。该选择允许内存主机提交来自多个脏内存文件的块，并在一次 `batchEmbed(...)` 调用中启用源，最多可达主机批次限制。上传 JSONL 请求文件的批处理适配器必须在上传大小上限和请求计数上限之前拆分提供程序作业。提供者必须按照与 `batch.chunks` 相同的顺序为每个输入块返回一个嵌入；当提供程序需要文件本地批处理或无法在较大的源范围作业中保留输入顺序时，请忽略该标志。

## <a id="decision-models-(contract-version-1)"></a><a id="decision-models-contract-version-1"></a> 决策模型（合约版本1）

从 [ 决策模型 ](/concepts/decision-models) 开始，了解模型选择、配置和 Choice/Score/Boolean 标题示例。本节定义了提供者和消费者 SDK 合约。

`api.registerDecisionProvider({ id, contractVersion: 1, isReady, evaluate })` 注册一个可选的决策提供程序，与会话模型提供程序和代理工具分开。在清单`contracts.decisionProviders`中声明ID；重复的 ID 将被拒绝。注册和可选`isReady()`必须是本地、同步且无网络的。从 `openclaw/plugin-sdk/decisions` 导入类型。

消费者称之为`api.runtime.decisions.evaluate(batch, { agentId?, purpose, rubricVersion, timeoutMs, signal })`。状态和标题条目是有限的 JSON。使用普通对象和数组；自定义原型、序列化挂钩和 getter 在请求和响应边界上都会被拒绝。选择保留所有提供的标签和概率；所选择的标签是提供商的决定，并且不需要等于最大舍入概率。消费者选择是否使用该标签或明确的分销政策。有序分数是分数估计的从零开始的位置，具有索引对齐的概率；布尔答案为 `probabilityTrue`。主机以原子方式验证整个批次：准确的答案键、[0， 1] 中的有限概率、正分布质量以及提交的评分标准内的分数。报告的概率可以四舍五入，并且不需要精确地加起来为一；分数不需要等于该舍入分布的期望。主机保留这些值。需要标准化体重的消费者必须应用自己的明确政策。提供商信心是特定于提供商的指标，而不是校准的正确性。结果包括模型、可选令牌使用以及本地标题和运行时生成来源。

将 `agents.defaults.decisionModel` 设置为显式 `provider/model` 引用。未设置或为空表示关闭。 `agents.entries.<id>.decisionModel` 覆盖全局默认值；空代理值会禁用该代理的决策。没有自动对话模型后备。选择使提供者可供受支持的消费者使用。消费者拥有自己的特征激活和证据选择；仅提供程序配置不会安排后台工作。发送给所选提供商的证据可能会产生正常使用费。插件禁用获胜；单独安装工具或凭证并不会选择提供商。供应商适配器拥有传输和特定于模型的翻译；没有供应商是核心依赖项。

[ONNX 插件](/plugins/onnx) 提供本地分类器； [TypeSafe AI 插件](/plugins/typesafe) 提供托管 Jev 和本地 System One 适配器，包括 Kev。这两个插件都需要单独安装、显式设置和角色选择。

### <a id="calling-from-a-third-party-plugin"></a> 第三方插件调用

与 `api.runtime.llm.complete` 一样，`api.runtime.decisions.evaluate` 允许插件使用主机配置的提供程序而不处理其凭据。消费者不需要提供商的 SDK、API 密钥、SecretRef 或提供商注册。只有提供者插件注册 `contracts.decisionProviders` 并拥有其供应商传输和准备好的凭证输入。这并不能使会话模型凭证与决策提供者凭证互换。

操作员必须启用并配置提供商插件并选择 `agents.defaults.decisionModel`（或代理覆盖）。第三方插件拥有其功能的激活、证据选择以及发送该证据的权限。仅仅拥有凭证不能激活后台收集或支出。

从实时插件工具、挂钩或其他拥有的操作调用，携带其取消信号：

```ts
const outcome = await api.runtime.decisions.evaluate(
  {
    state: { message: "Can you help me with this?", directlyAddressed: true },
    questions: {
      respond: {
        type: "boolean",
        instructions: "Is this message asking the assistant to respond?",
        criteria: {
          true: "The message asks the assistant to respond",
          false: "The message does not ask the assistant to respond",
        },
      },
    },
  },
  {
    agentId, // The agent that owns this operation; omit only for global-default selection.
    purpose: "example-plugin.response-eligibility",
    rubricVersion: "1",
    timeoutMs: 1500,
    signal,
  },
);
```

`ok` 结果包含经过验证的答案、model/usage 和 provider/rubric/runtime 出处。它是消费者决定的证据，而不是发送消息或执行其他效果的许可。 `unavailable` 结果包含了消费者现有回退的原因。不要发现取消或关闭权限错误并将其转变为后备工作。

提供者在其评估上下文中接收选定的 `model` 和可选的 `agentId`。并发的 agent/model 选择共享提供者的健康状况，而不会相互退出。更改后的选择会在返回受影响的请求之前对其进行隔离。

自动消费者在提供商调度时检查实验室选择加入。禁用它会停止未来的评估，而不是已经分派的工作或对其结果的使用。主机提供 `context.isAdmissible()` 用于持续的消费者授权、模型选择和提供商 configuration/credential 生成检查；实验室切换不属于这些正在进行的检查的一部分。执行外部 I/O 的提供者必须在发送之前、在任何延迟加载、DNS 或其他等待的准备之后立即同步调用它。如果结果错误，则评估结束；抛出的权限断言是终止的。主机会记住提供程序清理过程中的任一观察结果，因此撤销不会成为提供程序运行状况故障或后来的成功结果。省略保留了显式的 `decision_evaluate` 调用和旧主机兼容性；它不是对显式调用的实验室检查。 TypeSafe 使用其防护传输的最后一个 `beforeRequest` 钩子。主机仍会在提供程序调度之前和返回结果之前进行检查，但无法阻止忽略此回调的第三方提供程序中的 I/O。本地ONNX推理保留其现有的信号控制的worker生命周期；它不会将证据传输给外部服务。

消费者共享所选提供商的主机拥有的并发性、电路和凭证刷新生命周期；每个插件不会创建自己的提供程序客户端。不会将任何凭证返回给消费者。无论调用者是内置的还是第三方的，提供程序设置和刷新都使用相同的准备好的秘密路径。

主机最多允许 4 个请求，没有队列，最长 30 秒。消费者可以要求更短的期限并选择自己的后备政策。三个不健康的反应会打开一个十秒的循环；恢复承认一项试验。重试时间限制为一分钟。身份验证错误会锁定，直到准备好的秘密或配置生成发生更改。没有主机重试或运行状况检查。

调用者取消和关闭消费者权限拒绝：不启动后备。提供者无法获得退休回报，而现场消费者则可以退回。提供者必须遵守组合中止信号并进行物理解决运输和身体清理；不合作的提供商仍然拥有并受到正常的失败排水恢复的保护。老一代的成果无法更新新的健康状况。

清单能力凭证使用 `configContracts.secretInputs` 并编写 SecretRefs。 `getPreparedPluginSecretInput(pluginId, path)` from `openclaw/plugin-sdk/secret-input-runtime` 仅读取准备好的可用快照；它永远不会解析冷引用或查阅周围环境凭据。仅从插件实例的主动调用中调用它。帮助程序不是持久的凭证功能：静默或退出该实例会立即删除读取权限，即使已承认的工作正在完成也是如此。提供者必须将缺失值视为不可用，并且不得在重新加载时保留或重用以前的值。用`secrets.reload`刷新；能力故障不会保留旧密钥。

`plugins.inspect` 报告配置、凭证准备情况、当前可调用性、上次成功、使用情况、延迟和有限的不可用计数。计数是实例本地诊断，而不是持久的审核记录或写入权限。

对于发现，请在提供程序清单中使用 `provider`、`id` 和 `name` 声明静态 `decisionModels` 条目。每个提供商必须归 `contracts.decisionProviders` 所有。 Control UI 决策选择器通过单独的 `models.list.decisionModels` 投影读取此元数据；没有提供程序运行时或凭证检查运行来填充选择器。这些条目永远不会进入聊天、主要、后备或实用模型目录。

可选模型 `capabilities` 描述支持的问题类型、输入限制及其计算范围、布尔标准要求和置信语义。核心 `decision_evaluate` 工具使用这些相同的明显事实作为指导；提供商准备情况不会改变其定义。有关有界描述符字段，请参阅 [ 清单参考 ](/plugins/manifest/capabilities#decision-models-reference)。
