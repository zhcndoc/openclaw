---
summary: "会话扩展、可信工具策略、Control UI 描述符和运行时生命周期"
title: "工作流插件的插件 SDK 主机挂钩"
sidebarTitle: "主机挂钩"
read_when:
  - "您正在构建参与主机生命周期的工作流程、审批或策略插件"
  - "您正在注册 Control UI 描述符或会话操作"
  - "您需要可信的工具策略或工具结果中间件"
---

SDK 挂钩参与主机生命周期的插件，而不仅仅是添加提供程序、通道或工具。 [插件SDK概述](/plugins/sdk-overview)的一部分。

## <a id="host-hooks-for-workflow-plugins"></a> 工作流程插件的主机挂钩

主机挂钩是 SDK 接口，用于需要参与主机生命周期的插件，而不仅仅是添加提供程序、通道或工具。它们是通用合同；计划模式可以使用它们，批准工作流程、工作区策略门、后台监视器、设置向导和 UI 配套插件也可以。

| 方法                                                                               | 它所拥有的契约                                                                                                                                           |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api.session.state.registerSessionExtension(...)`                                    | 插件拥有的、JSON- 兼容的会话状态通过网关会话投影                                                                             |
| `api.session.workflow.enqueueNextTurnInjection(...)`                                 | 持久化、严格一次的上下文注入到某个会话的下一次 agent 回合中                                                                             |
| `api.registerTrustedToolPolicy(...)`                                                 | 由清单门控的受信任、预插件的工具策略，可阻止或重写工具参数                                                                        |
| `api.registerToolMetadata(...)`                                                      | 工具目录展示元数据，不改变工具实现                                                                                     |
| `api.registerCommand(...)`                                                           | 作用域化的插件命令；命令结果可以设置 `continueAgent: true` 或 `suppressReply: true`；Discord 原生命令支持 `descriptionLocalizations` |
| `api.session.controls.registerControlUiDescriptor(...)`                              | Control UI 贡献描述符；渲染 `tab`、`widget` 和 `link-reader` 曲面                                                          |
| `api.lifecycle.registerRuntimeLifecycle(...)`                                        | reset/delete/reload 路径上插件拥有的运行时资源的清理回调                                                                          |
| `api.agent.events.registerAgentEventSubscription(...)`                               | 用于工作流状态和监视器的已净化事件订阅                                                                                              |
| `api.runContext.setRunContext(...)` / `getRunContext(...)` / `clearRunContext(...)`  | 每次运行的插件临时状态，在终止性的运行生命周期上清除                                                                                             |
| `api.session.workflow.registerSessionSchedulerJob(...)`                              | 插件拥有的调度器作业的清理元数据；不会调度工作或创建任务记录                                                            |
| `api.session.workflow.sendSessionAttachment(...)`                                    | 仅限捆绑包的、由宿主中介的文件附件投递到活动的直接外发会话路由                                                            |
| `api.session.workflow.scheduleSessionTurn(...)` / `unscheduleSessionTurnsByTag(...)` | 仅限捆绑包的、基于 Cron 的已调度会话回合，以及基于标签的清理                                                                                    |
| `api.session.controls.registerSessionAction(...)`                                    | 客户端可通过 Gateway 分发的类型化会话动作                                                                                             |
| `api.registerBoardWidgetContentKind(...)`                                            | 沙盒板小部件源验证、渲染器资源和文档组合                                                                     |

运行时生命周期注册还可以为该注册捕获的资源提供 `dispose()`。显式拥有的、未缓存的插件检查在回滚或发布时调用它并等待清理，包括无效的异步注册工作。 Doctor 在加载上下文引擎以进行发现时使用此所有权；它仍然不调用仅发现的引擎工厂。 `dispose()` 不得删除持久状态或禁用其他注册。现有的原始加载程序和网关生命周期不会自动处置：保持其 `cleanup(ctx)` 行为。

为代理运行准备的模型运行时也拥有新的模型选择注册。它们使用相同的发现注册模式和插件选择，但新的注册会绕过全局注册表缓存。热情的来电者分享了他们准备好的一代。通过承认的工作和清理，注册资源仍然保留； `dispose()` 在最终索赔发布后运行，包括运行之间的任何有限空闲保留。

使用 `api.runContext` 在插件的认可代理挂钩与其网关服务注册之间共享 JSON- 兼容的每次运行数据。值由运行 ID、插件 ID 和命名空间键入，因此同一插件的单独准备运行时注册可以交换准入元数据，而无需共享关闭状态。作用域挂钩可以在其调用被允许时访问此数据；仅加载插件进行检查并不会授予访问权限，并且已停用的注册无法读取或写入它。终端代理事件处理程序仍然可以读取数据；主机在这些处理程序解决后将其清除。这不会授予作用域挂钩权限来引导运行、注入提示或发出进程全局事件。

创建配置的或独立的发布不会启用此所有权。现有根注册表和原始 SDK 主机注册保留其原始所有者；借用已经管理的一代可以保留该来源的所有权。 `api.runtime.state` 键控存储和 blob 存储背后的共享数据库仍然由进程拥有。注册的处置程序不得关闭该数据库或删除其持久行。

图像和音乐一代还拥有 `api.runtime.imageGeneration.generate(...)` 和 `api.runtime.musicGeneration.generate(...)` 获得的新注册。他们等待提供者的完整图像或音频缓冲区并跟踪操作清理，然后在解决或拒绝之前等待注册处理。保留现有的托管注册用于操作；原始主机注册和调用者提供的提供商保留其现有所有者。提供者列表仍然返回调用者拥有的回调并且不获取生成生命周期。返回异步提供程序工作并让 `dispose()` 停止并加入其拥有的任何其他后台工作。

视频生成对 `api.runtime.videoGeneration.generate(...)` 使用相同的所有权，从模型功能查找到完整的视频资产和结果元数据。视频资产可能包含缓冲区或提供商托管的 URL。呼叫返回后的下载属于呼叫者；注册处置不得使那些已完成的工件失效。

`api.runtime.tts.textToSpeechTelephony(...)`、缓冲的 TTS 和主持人 Talk 演讲还通过配置、角色准备、合成、结果元数据和跟踪的提供程序清理拥有新的提供程序注册。这些操作保留托管注册并保留原始主机所有权。配置的后备目录与直接首选项和覆盖查找分开。返回的音频缓冲区超出注册处理范围；标准 TTS 在释放提供程序后转码并保存那些已完成的缓冲区。单独的同步语音查找和指令解析 API 保持其现有的调用者生命周期；流式语音不是此有限操作的一部分。

流式语音拥有其提供者注册，直到流清理完成。 `api.runtime.tts.textToSpeechStream(...)` 在 EOF 或读取错误之后保留显式提供程序 `release()` 回调的生命周期：调用者仍然必须调用并等待返回的 `release()`。如果没有提供者释放回调，EOF 或读取错误会自动释放注册。流取消和显式发布在加入两者之前启动源取消和提供者清理，包括跟踪的生产者工作。 Release 还处理未打开的流。现有的原始主机注册保留其主机生命周期。

`api.runtime.tts.prepareTtsRequest(...)` 可以返回不透明的提供者覆盖以供以后综合。准备工作会保留借用的托管注册，直到 SDK 主机关闭，即使首先释放了原始检查。来自同一来源的重复准备与主机声明相同。原始加载程序和网关注册保持其现有的生命周期和缓存重用；准备不会为每个话语创建新的注册。主持人在发布声明之前加入跟踪的准备工作，包括因投影失败而开始的工作。

对于通过自有检查准备的 `image_generate`、`music_generate` 和 `video_generate` 工具，资源在预检期间保持保留，一旦接受，则通过生成、介质保存和任何回滚保持保留。 `started` 结果确认接受；这并不意味着工作或清理已经完成。如果原始检查在预检期间失效，则新任务准入将被拒绝。重试之前，请从当前提供程序设置中准备工具。已接受的任务将保留其捕获的资源，直到其工作解决。当准备视图从另一个托管注册复制回调时，该源通过任务和准备视图的最终处置器保持可用，包括已通过回滚启动的清理。最终资源释放等待借用源的清理并报告处置失败。这些实际保留并不能恢复退休注册接受新工作的权力。原始准备的注册表保留其现有的主机生命周期；这不会为所有准备好的运行时启用自动物理处置。

当模型支持的图像理解报告请求超时或取消时，其准备好的运行时借用将保持不变，直到实际的提供程序操作和跟踪的传输清理解决为止。提供的托管快照保留其原始准备的资源，包括采用的捐助者；原始快照保留其调用者拥有的生命周期。超时报告未完成的请求，未完成的资源清理。

可执行 CLI 命令注册还使用拥有的、未缓存的注册表。通过异步注册、命令操作及其跟踪清理，其资源保持可用，然后 `dispose()` 运行。在解析之前关闭命令准备不会释放这些资源。从注册商和操作返回异步工作；插件的处理程序还必须在关闭工作使用的资源之前停止并加入其拥有的任何后台工作。 CLI 的有限清理宽限期可以报告待处理的工作，而不将该工作视为已完成。独立编程 CLI 调用和调用者拥有的 Commander 程序保留其现有生命周期。 `cli-metadata` 保持惰性并仅接受 CLI 描述符；保持其 `machineOutput` 解析器纯净且同步。

`registerBoardWidgetContentKind(...)` 适用于拥有声明性小部件源格式的插件。该注册提供了一个全局唯一的小写 `kind`、一个短标签、一个功能范围的插件表面及其渲染器资源路径、一个同步 `validateSource(source)` 回调和一个同步 `composeDocument(...)` 回调。 Core 添加了文档外壳、沙箱、主题和票证绑定操作桥。仅当其插件处于活动状态时，注册才存在；无效、保留或重复的种类无法加载插件。将 `dashboard.dataBindings` 和 `dashboard.actionVerbs` 用于主机功能，而不是用于渲染器注册。

对于内联渲染，`resources.readPublicResource(path)` 可以选择返回注册资源路径的 `{ body: Uint8Array, contentType: string }`。这些字节是公共的：隔离的沙箱侦听器无需网关凭据即可为它们提供服务。仅返回静态渲染器资产，从不返回用户数据或机密。没有此回调的未注册路径和注册保持私有。选择保留在一个全局沙箱命名空间中的每个声明的路径：即使没有公共阅读器，其他内容类型也不能声明相同的路径。无论顺序如何，注册都会拒绝这些冲突；只有私人注册可以共享路径。公共路径必须已标准化 URL 路径名，不含点段、反斜杠、查询字符串或片段。沙箱主机端点 `/mcp-app-sandbox` 已保留。这些附加路径限制仅适用于通过 `readPublicResource` 进行的注册；私有路径保留其 URL 编码能力。

`surface: "tab"` 描述符会向 Control UI 添加一个侧边栏标签页。活动插件的标签页描述符会在 gateway hello（`controlUiTabs`）中向 dashboard 客户端通告，因此该标签页仅在插件启用时出现。 捆绑插件可以为其标签页提供一流的 dashboard 视图；其他插件可以将 `path` 设置为一个插件 HTTP 路由（参见 `api.registerHttpRoute(...)`），由 dashboard 在沙箱化框架中渲染。 `icon` 是 dashboard 图标名称提示，`group` 选择侧边栏分区 （`control` 或 `agent`），`order` 用于在插件标签页之间排序，而 `requiredScopes` 会将缺少这些操作员作用域的连接隐藏该标签页：

页面已经具有匹配的本机 Control UI 路由的捆绑插件可以设置 `placement: "route:<pluginId>"`。主机拒绝来自外部插件或 ID 不拥有该路由的捆绑插件的本机路由声明。当描述符存在时，侧边栏打开本机路由，而不是安装通用插件选项卡页面。

可选的`slug`给出一个选项卡Control UI地址如`/reports`，前缀为`gateway.controlUi.basePath`。它最多必须是一个片段64字符匹配`^[a-z0-9]+(?:-[a-z0-9]+)*$`。仅有的`surface: "tab"`接受它，并且它不能与`placement: "route:<pluginId>"`。注册会拒绝来自另一个活动插件的重复 slugs（第一个注册获胜）和网关拥有的名称：`api`， `plugins`， `plugin`， `focus`， `approve`， `ask`， `share`， `j`， `v1`， `ui`， `mcp-app-sandbox`， `__openclaw__`， `__openclaw`， `sessions`， `agent`， `agents`，并检查姓名`health`， `healthz`， `ready`， `readyz`， `startup`， 和`startupz`。

Control UI 忽略与任何本机路由或别名的第一段匹配的 slugs。如果任何插件的确切路径或前缀 HTTP 路由与已安装的 slug 路径匹配，则网关会从 hello 中忽略该 slug 并记录诊断。在任何一种情况下，选项卡都使用 `/plugin?plugin=<pluginId>&id=<tabId>`。具有可用 slug 的选项卡的通用链接在浏览器历史记录中将被替换为其 slug 路径，从而保留 `p.*` 参数和片段。 slug 仅更改 Control UI 地址；它永远不会改变 HTTP 路由或身份验证。

对于受网关保护的外部选项卡，请在同一插件 `auth: "gateway"` HTTP 路由下注册描述符 `path`。经过身份验证的引导程序后，浏览器会获得一个短暂的 HttpOnly 授权，其范围仅限于该插件和路由根，因此沙盒框架可以加载，而无需将网关承载令牌复制到其 URL 或 JavaScript 中。经过身份验证的父级会在外部选项卡处于活动状态时以及在导航或浏览器恢复后安装它之前更新授权。它还在安装之前检查来自同一不透明沙箱的授权，因此阻止 cookie 的浏览器隐私模式会使面板不可用。帧授权仅接受 `GET` 和 `HEAD` 并始终携带 `operator.read`； `requiredScopes` 控制选项卡可见性，但从不扩大 cookie 授予范围。突变保留在显式网关验证的父或承载表面上。外部选项卡需要 HTTPS/Tailscale Serve 或浏览器信任的环回源； LAN 主机上的普通 HTTP 显示安全上下文错误，而不是安装无法进行身份验证的面板。完全阻止第三方 cookie 也会使受网关保护的选项卡不可用。与所有本机插件表面一样，框架保留在已安装的插件信任边界内； OpenClaw 不会将已安装的插件视为相互隔离的浏览器安全主体。 Cookie 允许使用浏览器的主机名边界，而不是其端口边界。不要在网关主机名上共同托管相互不信任的服务，即使在其他端口上也是如此。由插件管理的身份验证支持的选项卡保留其直接 iframe 行为，并且不请求或要求此网关授予。

经过身份验证的同源插件选项卡可以请求会话导航，而无需放松 iframe 沙箱。用户单击后，将此仅会话消息发送给父级：

```typescript
window.parent.postMessage(
  { type: "openclaw-plugin-session-open", sessionKey: "agent:writer:project-review" },
  window.location.origin,
);
```

仅接受 `type`、`sessionKey` 和可选的 `agentId`。省略缺失的字段。密钥必须可路由，最多 512 个 UTF-16 代码单元，并且不包含控制字符或周围的空格。显式代理必须与限定密钥中的代理相匹配。主机在使用正常会话导航之前检查当前安装的帧、经过身份验证的描述符、连接和帧授予生命周期。此消息不授予任何会话访问权限，不接受任意 URL，并且不返回任何凭证或会话内容。独立页面应保留普通的 Control UI 链接作为其非嵌入路径。使用 `openclaw/plugin-sdk/session-discussion` 中的 `buildControlUiSessionPath` 构建该路径。

```typescript
api.session.controls.registerControlUiDescriptor({
  surface: "tab",
  id: "logbook",
  label: "Logbook",
  description: "Your day as a timeline, built from screen snapshots.",
  icon: "sun",
  group: "control",
  requiredScopes: ["operator.write"],
});
```

新插件代码请使用分组命名空间：

- `api.session.state.registerSessionExtension(...)`
- `api.session.workflow.enqueueNextTurnInjection(...)`
- `api.session.workflow.registerSessionSchedulerJob(...)`
- `api.session.workflow.sendSessionAttachment(...)`
- `api.session.workflow.scheduleSessionTurn(...)`
- `api.session.workflow.unscheduleSessionTurnsByTag(...)`
- `api.session.controls.registerSessionAction(...)`
- `api.session.controls.registerControlUiDescriptor(...)`
- `api.agent.events.registerAgentEventSubscription(...)`
- `api.agent.events.emitAgentEvent(...)`
- `api.runContext.setRunContext(...)` / `getRunContext(...)` / `clearRunContext(...)`
- `api.lifecycle.registerRuntimeLifecycle(...)`

等效的平面方法仍然可用作现有插件的已弃用的兼容性别名。兼容性注册表于 2026 年 7 月 25 日弃用了它们，`removeAfter` 日期为 2026 年 10 月 1 日；请参阅 [ 删除时间表 ](/plugins/sdk-migration/removal-timeline)。请勿添加调用 `api.registerSessionExtension`、`api.enqueueNextTurnInjection`、`api.registerControlUiDescriptor`、`api.registerRuntimeLifecycle`、`api.registerAgentEventSubscription`、`api.emitAgentEvent`、`api.setRunContext`、`api.getRunContext`、`api.clearRunContext`、直接 `api.registerSessionSchedulerJob`、`api.registerSessionAction`、`api.sendSessionAttachment`、`api.scheduleSessionTurn` 或 `api.unscheduleSessionTurnsByTag`。

`api.agent.events.registerAgentEventSubscription(...)` 接受可选的 `streams` 和 `phases` 滤波器：

```typescript
api.agent.events.registerAgentEventSubscription({
  id: "tool-starts",
  streams: ["tool"],
  phases: ["start"],
  handle(event, ctx) {
    ctx.setRunContext("lastToolStart", { timestamp: event.ts });
  },
});
```

两个过滤器必须匹配才能交付。省略过滤器或传递空数组以使该维度不受限制。 `phases` 必须是非空字符串数组；注册会修剪每个字符串。非空阶段过滤器仅匹配 `data` 是该列表中带有字符串 `phase` 的对象的事件。排除没有阶段或非字符串阶段的事件。设置 `payload: "metadata"` 只保留自己的可枚举顶级 `data` 字段，其中包含最多 256 个字符、数字、布尔值或 `null` 的字符串，而不读取访问器；省略 `payload` 或 `"full"` 保留完整克隆的有效负载。

缩小订阅：根据匹配的订阅克隆事件负载。主机在克隆有效负载或分配处理程序上下文之前应用流和阶段过滤器。过滤掉终端生命周期事件不会阻止主机拥有的终端簿记或运行上下文清理； cleanup 仍然在主机的有限宽限期内等待挂起的订阅处理程序。

`scheduleSessionTurn(...)` 是一个会话范围的便利网关 Cron 调度程序。 Cron 拥有计时和运行历史记录；插件 SDK 仅约束目标会话、插件拥有的命名和清理。

在会话扩展中，`openclaw/plugin-sdk/agent-sessions` 提供主机的模型选择帮助程序。精确的 provider/model ID 优先于不区分大小写的匹配；不明确的参考需要准确的提供商和模型 ID。当不同的身份共享组合引用时，单独传递提供者。人名匹配、alias/date 版本选择和不区分大小写的全局范围仍然可用。

`ModelRegistry.fork(authStorage, publishedModels?)` 创建一个隔离的注册表。 `authStorage` 提供呼叫者的凭据。可选的 `publishedModels` 是来自提供商 ID 的只读映射，用于完成经过验证的运行时模型行；空数组会撤回该提供者的行。省略的提供者保留捕获的目录。分叉保留当前源的创作请求设置和运行时注册，稍后的 `refresh()` 调用保留捕获的模型发布。已发布的模型元数据不提供凭据或授权帐户。可选参数需要包含可执行目录发布的主机版本； v2026.9.4 主机仅支持 `fork(authStorage)`。此会话扩展子路径仅适用于运行时，并且不发布 TypeScript 声明。

会话扩展 SDK 和支持的 TypeBox 导入共享主机的模块。

这些契约刻意分离了权限：

- 外部插件可以拥有会话扩展、UI 描述符、命令、工具元数据、 下一回合注入以及普通钩子。
- 受信任的工具策略在普通 `before_tool_call` 挂钩之前运行，并且是主机信任的。捆绑保单优先运行；安装的插件策略需要显式启用以及 `contracts.trustedToolPolicies` 中的本地 ID，然后按插件加载顺序运行。策略 ID 的范围仅限于注册插件。
- 保留命令的所有权仅限捆绑插件。外部插件应使用自己的命令名称或别名。
- `allowPromptInjection=false` 会禁用修改提示词的钩子，包括 `agent_turn_prepare`、`before_prompt_build`、`heartbeat_prompt_contribution` 和 `enqueueNextTurnInjection`。

非 Plan 消费者的示例：

| 插件类型             | 使用的钩子                                                                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 审批工作流            | 会话扩展、命令续接、下一回合注入、UI 描述符                                                            |
| Budget/workspace 政策门 | 可信工具策略、工具元数据、会话投影                                                                                 |
| 后台生命周期监控 | 运行时生命周期清理、代理事件订阅、会话调度器 ownership/cleanup、心跳提示贡献、UI 描述符 |
| 安装或引导向导   | 会话扩展、作用域命令、Control UI 描述符                                                                              |

<Note>
  保留的核心管理命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、 `update.*`）始终保持 `operator.admin`，即使插件尝试分配更窄的 Gateway 方法作用域。优先为插件拥有的方法使用插件特定前缀。
</Note>

<Accordion id="when-to-use-tool-result-middleware" title="何时使用工具-结果中间件">
  当捆绑的插件和显式启用的具有匹配清单合约的安装插件需要在执行后和运行时将结果反馈回模型之前重写工具结果时，可以使用 `api.registerAgentToolResultMiddleware(...)`。这是异步输出减速器（例如 tokenjuice）的可信运行时中立接口。

插件必须为每个目标运行时声明 `contracts.agentToolResultMiddleware`。支持的 ID 为 `agentsapi`、`codex` 和 `openclaw`；例如，`["agentsapi", "codex", "openclaw"]`。省略注册 `runtimes` 使用清单中声明的​​所有支持的运行时。显式注册范围可以选择那些声明的运行时的子集。

没有该合同或没有明确启用的已安装插件无法注册此中间件；为不需要预模型工具结果计时的工作保留正常的 OpenClaw 插件挂钩。旧的仅限嵌入式运行程序的扩展工厂注册路径已被删除。
</Accordion>

## <a id="sandbox-backends"></a> 沙盒后端

`openclaw/plugin-sdk/sandbox` 拥有后端注册、远程文件系统桥接和远程 shell 执行。使用 `registerSandboxBackend(id, { factory, manager, resolveWorkdir })` 注册后端并使用插件生命周期处理注册。

分配外部资源的后端可以提供 `reserveRuntimeId(params)` 来生成新的候选 ID，而无需联系其提供者。在调用工厂之前，核心会在沙箱注册表中为每个 backend/scope 保留一代。重播接收原始保留的 `workspaceDir`，包括从不同调用者工作区到达的共享范围。 `ReservedSandboxBackendFactoryV1` 合约需要 `runtimeId` 和 `assertRuntimeCurrent` 到 `CreateReservedSandboxBackendParamsV1`。权限检查是同步的：规定精确ID并在副作用之前等待工作后重新检查。准备好的执行规范将此检查标记为 `assertCurrent`，进程管理程序通过排队准入和本机进程构建来保留该检查。 Recreate 拒绝仍在等待录取的作品；已接纳的命令遵循后端的正常关闭生命周期。未知的配置失败保留 ID 以便重播。仅在提供商确认永久发布确切的一代后才抛出 `SandboxRuntimeRetiredError(runtimeId)`。核心每次请求最多替换一次。重新创建和修剪保留失败的清理记录并防止后期发布。

使用 `createRemoteShellSandboxBackend(params, options)` 重用共享工作区引导程序、技能刷新、工作目录验证和文件系统桥。 `options.createSession` 返回 `RemoteShellSandboxSession`。对于预留后端，将`options.runtimeId`设置为`params.runtimeId`； `backendId` 默认为 `params.cfg.backend`。 `configLabel` 和 `configLabelKind` 描述运行时。默认情况下，路径仍然源自 `params.cfg.ssh.workspaceRoot` 和沙箱范围。 `preprovisionedWorkdir: { runtimeId, remoteWorkspaceDir }` 采用现有的布局拥有的工作树，无需播种或刷新其文件。

初始播种将最终运行时根旁边的所有必需工作区树暂存，并以原子方式发布完整目录而不进行替换。并发发布会保留第一个工作区，即使调用者稍后清空其根目录也是如此。现有的根在没有新的完成标记的情况下仍然具有权威性。正常故障和失败的发布竞赛仅删除其确切的临时目录，恢复所有者对只读暂存目录的访问权限，而无需遵循符号链接。进程突然丢失或无法访问的提供者可能会留下 `<runtime-root>.bootstrap-<uuid>` 同级；它永远不会被视为一个完整的工作空间。初始化停止后仅删除已知的孤儿。释放 Crabbox 租约可以使用机器删除这些工件； static SSH 在运行时清理期间不会全局删除同级。

`createRemoteShellSandboxSession({ buildCommand, assertCurrent, dispose })` 从一个传输适配器派生命令执行、受保护的 tar 上传和私有执行脚本暂存。 `buildCommand({ remoteCommand, tty })` 返回本地 `argv`、`env` 和可选的 `cwd`。局部环境属于传输过程；所请求的远程环境是单独上演的。当存储库准入依赖于提供者所拥有的工作区时，`cwd` 必须标识提供者所拥有的工作区。它还以 `SandboxBackendExecSpec` 形式传送到流程主管，与远程工作目录无关。返回的会话公开 `runCommand`、`uploadDirectory`、`prepareExec` 和 `dispose`。可选 `dispose` 完成或失败后释放本地会话资源；可选的 `formatFailure(stderr, exitCode)` 自定义命令失败消息。远程 PTY 请求影响适配器构建的命令；本地传输仍然通过管道输入运行。

将保留的 `assertRuntimeCurrent` 作为会话的 `assertCurrent` 进行传递。共享所有者围绕异步准备检查它，并在生成之前立即在本地遍历后上传重新检查。提供者权限仍然保留在传输命令中：准备本地 argv 或保留连接凭据不会授权以后的效果。暂存、执行、上传和清理都必须跨越该提供者边界。即使核心操作失败或撤销，清理也会保留相同的提供者准入。

Crabbox 适配器使用原始所属工作区中的 `crabbox exec --id <lease-id> [--pty] -- /bin/sh -c ...` 和 `stop --current-repo --id <lease-id>`。其预分配`exec --check`检查要求`execution`和`currentRepoStop`都为真；最初的支持是直接代托纳租赁。静态 SSH 通过适配器继续使用其现有设置到同一工作区所有者。

## <a id="docked-link-readers"></a> 对接链接阅读器

链接阅读器允许启用的插件声明支持的 HTTPS 链接并在聊天旁边呈现被动文档。 Core 拥有扩展坞、浏览器样式选项卡、历史记录、键盘行为和安全 Markdown 渲染。该插件拥有 URL 策略、服务请求、缓存和文档数据。这不是插件 JavaScript 加载程序或框架外部网站。

注册读取范围的网关方法和贡献描述符：

```typescript
import type { ControlUiLinkReaderDocument } from "openclaw/plugin-sdk/control-ui-link-reader";

api.registerGatewayMethod(
  "notes.read",
  async ({ params, respond }) => {
    // Validate params.url against your service and bound the response before returning it.
    const document: ControlUiLinkReaderDocument = await readNotesDocument(params);
    respond(true, document, undefined);
  },
  { scope: "operator.read" },
);

api.session.controls.registerControlUiDescriptor({
  surface: "link-reader",
  id: "notes",
  label: "Notes",
  icon: "book",
  requiredScopes: ["operator.read"],
  linkReader: {
    hosts: ["notes.example"],
    pathPattern: "^/documents/[a-z0-9-]+$",
    detailMethod: "notes.read",
  },
});
```

仅当加载其插件、调用者具有所需的作用域并且每个引用的方法属于具有 `operator.read` 作用域的同一插件时，描述符才会在 `hello.controlUiLinkReaders` 和实时插件功能快照中公布。隐藏和控制平面写入方法不会为读者做广告。注册可以在方法注册之前或之后进行；投影检查已完成的注册表。通过现有的 `plugins.changed` 功能刷新流程实现插件启用和重新加载更新贡献。 UI 清除已删除的贡献并忽略过时的请求结果。

`linkReader` 字段是：

| 字段           | 契约                                                                                                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hosts`         | 一到十六个完全小写的 DNS 主机名；没有方案、通配符或端口。                                                                                                               |
| `pathPattern`   | 锚定 JavaScript Unicode 正则表达式，最多 1,024 个字符，与 URL 路径名匹配。安装的插件代码拥有该模式；保持简单且可预测。    |
| `detailMethod`  | 相同插件读取方法接收 `{ url, agentId?, refresh? }` 并返回 `ControlUiLinkReaderDocument`。                                                                            |
| `previewMethod` | 可选的相同插件读取方法接收 `{ url, agentId? }` 并返回 `ControlUiLinkReaderPreview` 用于悬停或键盘焦点。对于不应获取预览的 URL，请忽略它。 |
| `imageMethod`   | 可选的相同插件读取方法接收 `{ url }` 并返回 `{ url, dataUrl }` 以获得内联图像。                                                                                  |

预览和详细请求包括选定的 `agentId`（如果可用）；详细要求也接受`refresh: true`。接收所有者必须授权身份选择，而不是将此提示视为访问权限。

方法名称的长度限制为 128 个字符。 URL 和非 HTTPS URL 中的凭据永远不会被拦截。描述符是路由提示，而不是授权或输入验证：每个插件方法仍然验证其 URL、源访问和请求参数。普通的修改点击、下载、不受支持的链接和显式外部操作将保留其原始目标。

导出的被动模型包括源 `url`、`title`、可选字幕、作者、日期、徽章和 label/value 元数据。徽章可以包含用于其状态事件（例如，合并或关闭）的可选 `timestamp`。阅读器会在浏览器本地时间的徽章旁边显示该时间戳，当它不存在时，会回退到 `createdAt`。保留`createdAt`为原始创建时间；该插件负责选择事件时间戳。文档添加 Markdown `body`、可选注释和更改的文件补丁、总计以及显式部分或截断标志。评论 ID 和源链接、评论上下文标签和徽章文本来自插件，而不是核心中特定于服务的条件。 `filesExpanded` 可选择选择初始文件差异视图。徽章音为 `neutral`、`positive`、`negative`、`attention` 和 `accent`。元数据条目可能包括 `tone: "positive" | "negative"`，以在预览和阅读器中使用主题的 green/red 颜色来强调其价值。对于中性值，省略 `tone`；主机不会从标签或签名数字中推断出它。使用空元数据标签进行紧凑的仅值预览，并在需要时在详细文档中返回更完整的元数据列表。

`authorUrl` 可以选择将主要作者链接到源上的 HTTPS 配置文件。 `coAuthors` 携带 `{ name, imageUrl? }` 条目的有界列表，当未包含所有名称时，`coAuthorCount` 表示总数。悬浮卡最多显示三张可用肖像和 `+N` 剩余肖像；失踪的肖像仍然在该计数中。失败的图像会保留首字母缩写，而不会删除作者。名称也可用于辅助技术和完整阅读器。作者图像保留预览的匿名图像规则；这些不是网关用户身份。

文档还可以包含被动 `checks`：

```typescript
checks?: {
  state: "success" | "failure" | "pending" | "neutral" | "unavailable";
  summary: string;
  total: number;
  items: Array<{
    name: string;
    state: "success" | "failure" | "pending" | "neutral";
    detail?: string;
    url?: string;
  }>;
  truncated?: boolean;
  url?: string;
  commit?: string;
};
```

该插件拥有摘要、项目详细信息、有界 HTTPS 源链接、聚合和精确源修订 （`commit`）。主机呈现这些事实，而不是服务规则或可合并性决策。 `total` 是已知的检查上下文计数，当 `truncated` 或 `unavailable` 时可能不完整。当项目列表不完整时，包括无法读取源时，设置 `truncated`。如果可选检查请求失败，请保留文档正文，并且永远不要从不完整的数据中报告成功。空的完整列表是 `neutral`。

捆绑的 GitHub 读取器匿名读取拉取请求的确切头 SHA 的检查运行和遗留提交状态，而不是其基础或测试合并提交。从每个 API 中读取一页最多 100 条条目，并返回最多 100 条；它不遵循分页链接。 GitHub的`filter=latest`选择检查运行；读者保留每个不同的运行 ID，而不是从应用程序和作业名称推断工作流身份。来自不同工作流程的同名作业保持独立，因此新的成功无法隐藏独立的失败。旧状态与检查运行保持分离，并使用最新的不区分大小写的上下文。已知的故障比待处理的工作更重要，而待处理的工作又比不可用的数据更重要；只有完整的数据才能产生成功或中立。取消、超时、过时和需要采取行动的运行均视为失败；跳过和中性运行保持中性。部分结果保留已知项目和明确的不完整摘要。 PR快照共享现有文档缓存30秒；显式刷新会重新读取该响应头的 PR 和两个 CI 源。该表面既不评估必需的检查规则，也不声明 PR 可以合并。

仅返回适合调用者的有限数据。呈现的内容无法激活嵌入式应用程序小部件、脚本、文件操作或代码执行。内联远程图像使用匿名 CORS 并且没有引用者，除非读者声明 `imageMethod`。当源不支持浏览器 CORS 时，该方法通过插件解析图像。它必须验证源和每个重定向、绑定响应大小和时间，并返回请求的 URL 以及标准化的 Base64 光栅图像数据 URL；不支持 SVG 和 HTML。不要将浏览器 cookie 或服务凭证转发给图像主机。主机显示经过验证的图像数据而不执行远程内容。主机接受每个图像最多 2 个 MiB 的 PNG、JPEG、GIF 和 WebP 数据，最多排队四个并发请求，并将每个文档解析器限制为 32 个唯一图像和 8 个 MiB 编码图像数据。解析程序无法提供的映像保留原始的匿名 CORS 路径。如果这也失败了，他们会保留外部链接。对不可用的内容使用显式错误响应，以便 UI 可以提供重试和原始 URL。
