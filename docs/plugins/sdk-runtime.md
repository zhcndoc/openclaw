---
summary: "api.runtime -- 可注入给插件的运行时辅助工具"
title: "插件运行时辅助工具"
sidebarTitle: "运行时辅助工具"
read_when:
  - "你需要从插件中调用核心辅助工具（TTS、STT、image gen、web search、Gateway、subagent、nodes）"
  - "你想了解 api.runtime 暴露的内容"
  - "你正在从插件代码中访问 config、agent 或 media 辅助工具"
  - "你正在 channel 插件中实现 model-picker 持久化"
---

`"full"`、`"discovery"`、`"tool-discovery"` 和 `"setup-runtime"` 注册期间可用的实时 `api.runtime` 对象的参考。在 `"cli-metadata"` 和 `"setup-only"` 注册期间，运行时功能故意不可用：访问该功能会引发命名插件和模式的错误。推迟 `register()` 的运行时访问，或者对于根 CLI 命令，在插件清单中声明 `cliCommands`。使用运行时助手而不是直接导入主机内部。

<CardGroup cols={2}>
  <Card title="频道插件" href="/plugins/sdk-channel-plugins">
    在 channel 插件上下文中使用这些辅助工具的分步指南。
  </Card>
  <Card title="提供方插件" href="/plugins/sdk-provider-plugins">
    在 provider 插件上下文中使用这些辅助工具的分步指南。
  </Card>
</CardGroup>

```typescript
register(api) {
  const runtime = api.runtime;
}
```

`api.runtime.version` 是当前的 OpenClaw 产品版本，来源于共享版本解析器，因此插件看到的值与 CLI 报告的值相同。

`api.runtime.capabilities` 是主机行为保证的可选只读列表。较老的主机可能会忽略它。在启用依赖于记录的功能 ID 的行为之前，检查该功能；相同的产品版本和工具名称不建立支持。这些进程稳定的事实不会授予调用者权限，并且在仅元数据注册期间它们仍然不可用。

`sender-restricted-hidden-helpers-v1` 保证发送者限制的请求者只能启动同一代理的隐藏助手，保留其受限工具表面和会话根。通道可以使用此功能来为受限制的发送者启用帮助工具。核心仍然负责授权和遏制。网关 `hello-ok.features.capabilities` 中通告了相同的 ID。

## <a id="what-each-page-covers"></a> 每页涵盖的内容

- [配置和实用程序](/plugins/sdk-runtime/config-and-utilities) - 运行时配置读取和写入，以及共享进程、错误和模型选择器实用程序。
- [代理和会话](/plugins/sdk-runtime/agent) — 代理身份、目录、会话存储、记录和沙箱权限。
- [模型助手](/plugins/sdk-runtime/models) - 主机拥有的完成、模型选择策略和提供者身份验证解析。
- [后台工作](/plugins/sdk-runtime/background-work) — 挂钩代理轮流、子代理运行和本机harness完成交付。
- [网关和节点](/plugins/sdk-runtime/gateway-and-nodes) — 进程内网关请求、通过 `gateway.readSessionFacts` 的有界会话事实、配对节点调用和网关服务事件。
- [媒体助手](/plugins/sdk-runtime/media) — 语音、媒体理解、image/video/music 生成、网络搜索和媒体实用程序。
- [状态和系统](/plugins/sdk-runtime/state-and-system) — 配置快照、SQLite-支持的插件状态、系统实用程序、事件和日志记录。
- [Channel helpers](/plugins/sdk-runtime/channel) — 用于分块、路由、配对、媒体和提及的特定于通道的运行时帮助程序组。

## <a id="runtime-namespaces"></a> 运行时命名空间

每个 `api.runtime` 命名空间以及记录它的页面。

| 命名空间                        | 页面                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------- |
| `api.runtime.agent`              | [代理和会话](/plugins/sdk-runtime/agent#api-runtime-agent)              |
| `api.runtime.agent.defaults`     | [代理和会话](/plugins/sdk-runtime/agent#api-runtime-agent-defaults)     |
| `api.runtime.llm`                | [模型助手](/plugins/sdk-runtime/models#api-runtime-llm)                    |
| `api.runtime.gateway`            | [网关和节点](/plugins/sdk-runtime/gateway-and-nodes#api-runtime-gateway) |
| `api.runtime.hooks`              | [后台工作](/plugins/sdk-runtime/background-work#api-runtime-hooks)       |
| `api.runtime.subagent`           | [后台工作](/plugins/sdk-runtime/background-work#api-runtime-subagent)    |
| `api.runtime.sandbox`            | [代理和会话](/plugins/sdk-runtime/agent#api-runtime-sandbox)            |
| `api.runtime.nodes`              | [网关和节点](/plugins/sdk-runtime/gateway-and-nodes#api-runtime-nodes)   |
| `api.runtime.tts`                | [媒体助手](/plugins/sdk-runtime/media#api-runtime-tts)                     |
| `api.runtime.mediaUnderstanding` | [媒体助手](/plugins/sdk-runtime/media#api-runtime-mediaunderstanding)      |
| `api.runtime.imageGeneration`    | [媒体助手](/plugins/sdk-runtime/media#api-runtime-imagegeneration)         |
| `api.runtime.videoGeneration`    | [媒体助手](/plugins/sdk-runtime/media#api-runtime-videogeneration)         |
| `api.runtime.musicGeneration`    | [媒体助手](/plugins/sdk-runtime/media#api-runtime-musicgeneration)         |
| `api.runtime.webSearch`          | [媒体助手](/plugins/sdk-runtime/media#api-runtime-websearch)               |
| `api.runtime.media`              | [媒体助手](/plugins/sdk-runtime/media#api-runtime-media)                   |
| `api.runtime.config`             | [状态和系统](/plugins/sdk-runtime/state-and-system#api-runtime-config)    |
| `api.runtime.system`             | [状态和系统](/plugins/sdk-runtime/state-and-system#api-runtime-system)    |
| `api.runtime.events`             | [状态和系统](/plugins/sdk-runtime/state-and-system#api-runtime-events)    |
| `api.runtime.logging`            | [状态和系统](/plugins/sdk-runtime/state-and-system#api-runtime-logging)   |
| `api.runtime.modelConfig`        | [模型助手](/plugins/sdk-runtime/models#api-runtime-modelconfig)            |
| `api.runtime.modelAuth`          | [模型助手](/plugins/sdk-runtime/models#api-runtime-modelauth)              |
| `api.runtime.state`              | [状态和系统](/plugins/sdk-runtime/state-and-system#api-runtime-state)     |
| `api.runtime.channel`            | [渠道助手](/plugins/sdk-runtime/channel#api-runtime-channel)             |

### <a id="read-only-session-forks"></a> 只读会话分叉

使用 `api.runtime.subagent.forkSession({ sessionKey, message, signal?, timeoutMs? })` 对现有会话进行后台推理。返回`{ text, usage? }`；用法使用完成字段 `inputTokens`、`outputTokens`、`cacheReadTokens`、`cacheWriteTokens`、`totalTokens` 和 `costUsd`。超时默认为 30 秒。

Fork 使用会话的模型和工具，没有模型覆盖。 Codex 继承临时线程中的对话和工具定义，但在调度时拒绝本地工具调用并禁用提供商托管的 Web 搜索。在托管推理路由上，它会重播父级最后准备的指令、工具架构和输入前缀，包括父级完成后的内容，工具选择设置为 `none`。快照共享 32 个 MiB 内存 LRU 预算；被驱逐或过大的快照和 WebSocket 连续请求会回退到本机线程重建，而无法保证缓存重用。当其前缀不再与记录的请求匹配时，本机重建的历史记录也会优先。完成的家长回复和随后的分叉工具拒绝结果保留在附带问题或继续之前。虽然准备好的请求保留在快照预算中，但即使在本机重建路径上，指令和工具模式也保持父级相同。被拒绝的分叉始终在托管推理请求上将工具选择设置为 `none`，而本机托管搜索保持禁用状态。分叉有自己的线程、会话和当前模型权限。在请求分叉之前，在当前运行时启动正常的父回合。本机挂钩中继必须启用且可用；否则请求无法关闭。内置的 `openclaw` 运行时重播父记录的提供程序请求，然后是其已完成的消息和附带问题，保留其系统提示、工具、推理设置以及 OpenAI 和 Anthropic 的提示缓存关联性。它重用准备好的有效负载数据，而无需重新运行父级的一次性延续挂钩。已完成的异步工具调用、其结果和最终答案仍保留在对话顺序中。如果派生启动时已发布的工具调用仍在运行，则内置运行时会包含一个非错误占位符，表示其结果尚不可用。这不会取消父调用或将结果保留在父会话中。重放使用当前准备的模型的代理和 TLS 策略。在每次网络发送之前立即检查会话读取权限，包括重试。本机 ChatGPT 分叉使用独立连接，而不消耗或替换父级的延续。支持的 API 包括 OpenAI 响应（包括本机 ChatGPT）、聊天完成和 Anthropic 消息。其他 API（包括 Bedrock）在调度之前会失败，因为它们的传输无法强制执行分叉的实时请求权限。在调度之前，工具选择设置为 `none`，以防止托管工具执行；本地工具调用也被拒绝，最多有两次额外的推理尝试。在 Anthropic 上，更改工具选择会使消息缓存无效，但会保留工具和系统缓存。当记录的请求包含工具时，不支持托管工具禁令的其他 API 将被拒绝。内置运行时将快照保留长达 90 分钟，共享 64 MiB 请求数据预算和最多 1,000 个会话，直到过期或会话清理。保留快照不会保留已完成的父会话或其脚本管理器。内置运行时保留准备好的提供者前缀，而不是对话历史记录的第二个副本。 Forks 只转换后来的出版物和附带问题；即使父级仅发送后缀，HTTP 延续也会保留完整的前缀。只读分叉不会获取工作区放置权限，因此父级的待处理放置发布不会阻止它们。正常的父结算和使用更新保留了分叉的读取权限。会话重置或删除甚至会在返回答案之前撤销正在进行的分叉。重新启动后或没有准备好的父轮，请求将失败关闭：“缓存奇偶校验会话分叉需要此 OpenClaw 运行时准备的父轮。首先发送正常消息。” `forkSession` 不支持 CLI 运行时，即使其后端可以禁用本机工具。普通`/btw`保持其轻量、免工具的环境； CLI 具有本机工具的后端必须明确支持针对附带问题禁用它们，而没有本机工具的后端不需要额外声明。

需要通过 `plugins.entries.<id>.hooks.allowConversationAccess` 进行对话访问（默认情况下仅针对捆绑插件启用）。调用者还必须具有目标会话的 `sessions.get` 读取访问权限。该权限、网关绑定和对话访问通过推理和返回保持活动状态。请求与 `subagent.complete` 共享子代理命令通道和 `agents.defaults.subagents.maxConcurrent` 上限，并在其运行时终止时被取消。分叉不会编写记录、提供答案、触发代理转生命周期挂钩或消耗排队的注入或转向。缺少会话上下文和不受支持的harness会产生错误。

## <a id="storing-runtime-references"></a> 存储运行时引用

同步存储兼容性调用保留其同步返回约定。托管提交在公开更改通知之前安装可用的事实；通知失败不会回滚存储的更改。私有 [receipt/completeness 合约 ](/reference/database-schemas/worker-access#committed-facts-and-completeness) 未添加公共功能或弃用。插件仍然必须使用拥有的运行时操作及其实时权限检查：先前的接收或缓存的行不能证明原始句柄写入者、外部更改或后续效果。

网关上下文的 GitHub 发布服务具有 V2 请求方法，具有所需的主机拥有的请求者功能，以及等待的延迟和报告方法。在释放请求资源之前，完整转发这些功能并等待提交的结果。已发布的不透明请求者和同步生命周期方法仍然是已弃用的兼容性路线；实际使用情况为每个插件和出版物系列共享一份警告预算。有关方法映射、回调排序和普通稳定移除合约，请参阅 [GitHub 发布迁移](/plugins/sdk-migration/how-to-migrate#await-github-publication-operations)。

使用 `createPluginRuntimeStore` 在 `register` 回调之外存储运行时引用：

<Steps>
  <Step id="create-the-store" title="创建商店">
    ```typescript
    import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
    import type { PluginRuntime } from "openclaw/plugin-sdk/runtime-store";

    const store = createPluginRuntimeStore<PluginRuntime>({
      pluginId: "my-plugin",
      errorMessage: "my-plugin runtime not initialized",
    });
    ```

  </Step>
  <Step id="wire-into-the-entry-point" title="连接到入口点">
    ```typescript
    import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";

    // `myPlugin` is your own `ChannelPlugin` object and `store` is the store
    // created in the previous step; neither is an SDK export.
    export default defineChannelPluginEntry({
      id: "my-plugin",
      name: "My Plugin",
      description: "Example",
      plugin: myPlugin,
      setRuntime: store.setRuntime,
    });
    ```

  </Step>
  <Step id="access-from-other-files" title="从其他文件访问">
    ```typescript
    export function getRuntime() {
      return store.getRuntime(); // throws if not initialized
    }

    export function tryGetRuntime() {
      return store.tryGetRuntime(); // returns null if not initialized
    }
    ```

  </Step>
</Steps>

<Note>
在 runtime-store 标识中优先使用 `pluginId`。较低层级的 `key` 形式适用于少数场景，即某个插件有意需要多个运行时槽位。
</Note>

## <a id="plugin-lifecycle-and-cleanup"></a> 插件生命周期和清理

托管插件实例拥有其注册的可调用对象、运行时存储槽和加载的源生成。停用实例会停止通过其托管句柄进行新调用。已经承认的呼叫和流在处理之前完成的机会有限；保留旧函数不会使其成为当前运行时句柄。

### <a id="plugin-value-boundary"></a> 插件值边界

OpenClaw 在加载和注册本机插件时承认它们，使用现有的 [ 清单验证 ](/plugins/manifest) 和 [ 加载策略 ](/plugins/architecture-internals/load-pipeline)。每个加载的本机插件都使用相同的值契约：挂钩结果、工具结果和流事件通过引用交叉。插件边界不会复制、冻结、深度检查或将惰性读取器附加到这些值。

插件作者不得在将值传递给主机后更改值，包括嵌套对象和字节缓冲区。生成一个新值以供以后更新。注册的可调用对象保留其实例范围、接收者绑定和生命周期防护。插件代码在为其调用建立的网关请求范围内运行。

工具工厂和提供者模式规范化器保留相同的工具对象 API。主机将其定义数据与可执行回调分开：模式和元数据保留其身份，而执行和准备回调保留原始接收者和确切的插件调用范围。可重用描述符快照不包含运行权限或取消信号。退役的插件或关闭的调用仍然拒绝保留的回调，包括重建工具的挂钩后到达的回调。定义访问器保持惰性且有范围，因此可以在不调用该工具的情况下隔离不可读的模式。可调用工具和代理支持的对象保留其承认的可调用和实时属性契约，包括 `get` 陷阱提供的执行方法。

`before_tool_call` 输入和批准参数保留分离的快照，因此插件突变无法更改调用者参数或批准的请求。这些快照拒绝克隆图中的共享内存；结构化克隆省略的属性不会跨越此边界。

主机创建的请求范围借用其插件注册表。直接注册表范围回调会保留其注册表，直到其返回的操作解决为止；分离的异步资源不会延长该生命周期。访问已发布的注册表失败，而不是默默地选择当前的一代。承认的轮流和明确保留的消费者保留他们所选择的一代，直到他们安顿下来。依赖于注册表的运行时 API 在采用后重新进入其实时插件所有者，并保留明确准备的注册表，包括空选择。

提交 SessionManager 附加会通过引用将其普通 JSON 有效负载传输给管理器。将有效负载视为提交后不可变的，包括在异步追加挂起时；嵌套对象和数组被冻结。附加收据和记录视图共享该不可变的负载。创建一个新值以供以后更新。自定义 JSON 表示在持久化之前已标准化。工具参数、工具结果和转录文本未被秘密屏蔽；图像和提供者重播元数据仍然接受结构标准化。

已承认的迭代器在其生命周期内拥有其调用范围和调用租约。前进或关闭它会在该范围内执行插件代码，而无需为每个事件创建新范围。完成、取消和流清理都会解决相同的租约。如果 `return()` 从发电机的 `finally` 区块中产生，则稍后的恢复将通过原始所有者和范围获得新的租约。保留的迭代器在其所有者关闭后无法获得新的权限。

本机插件在网关进程中执行，并且没有沙箱化。来源诊断和特定于功能的信任要求（例如挂钩代理轮换和网关范围提升）仍然适用。每个加载的插件都可以使用自己的 [ 状态和入口队列](/plugins/sdk-runtime/state-and-system#api-runtime-state)，无论出处如何。 `plugins.allow` 允许在不验证源出处的情况下加载。这些加载时事实属于该实例，直到插件所有者通过重新启动或显式重新加载或安装操作替换它为止。

被承认的回合选择的上下文引擎通过该回合的提交和引擎处置仍然拥有。替换已启用的插件会等待这些使用者关闭，然后再注册其后继插件。禁用或删除插件可能会将其清理报告为延迟；启动引擎处理会在清理完成时关闭正常的引擎回调。

替换首先验证元数据和配置，然后停止服务和通道，耗尽已承认的工作，运行 `gateway_stop`，并在调用新注册之前处置旧实例。会话扩展和运行时生命周期 `cleanup` 回调在替换寄存器之前接收 `reason: "restart"`，因此它们可以取消订阅观察者并释放内存缓冲区。持久会话状态和调度程序协调仍然是注册表停用的一部分。预发布失败通过将捕获的先前代码与其先前的配置注册来触发自动恢复；停止的实例不被认为是可重新启动的。插件无法同步地从其自己的活动调用中替换自身：操作在关闭之前被拒绝，并且可以在该调用完成后重试。无法在预算内完成的清理工作可能会妨碍安全更换或恢复。不受影响的实例保持活动状态，并且网关进程保持运行。

托管实例公开 `api.lifecycle.signal` 和 `api.lifecycle.onDispose(cleanup)`。当处置达到显式清理时，信号中止。 `onDispose` 接受同步或异步回调并返回注销它的函数。回调在共享清理预算内以相反的注册顺序运行一次。当尝试进行剩余的清理时，抛出或未完成的回调将被记录为清理失败。这些字段在 SDK 类型中是可选的，因为没有托管实例的 API 主机可能会忽略它们；在依赖实例清理之前对它们进行功能检测。现有的 `api.lifecycle.registerRuntimeLifecycle(...)` 合约仍然可用于插件拥有的主机状态。

托管插件加载、注册或运行时进行的诊断订阅属于该实例。当实例被处置时，包括在加载或替换失败后，OpenClaw 会自动取消订阅它们。取消订阅句柄仍然提前释放订阅并删除其清理注册。这涵盖了 `openclaw/plugin-sdk/diagnostic-runtime` 中的 `onDiagnosticEvent` 和 `onInternalDiagnosticEvent`，以及代表插件创建的主机拥有的诊断订阅。

### <a id="instance-bound-background-context"></a> 实例绑定后台上下文

托管实例还公开附加 `api.lifecycle.runInBackgroundContext<T>(run: () => T): T` 功能。它立即运行并返回回调的值或承诺。它分离调用轮次、请求和不相关的异步本地上下文，同时保留实例的主机资源绑定。每次调用都会选择该实例当前采用的注册表，因此保留的插件在重新加载后会看到替换提供程序。

在安装计时器、观察程序和侦听器时以及在传递每个后台回调时再次使用它。让跑步者拥有拥有它的资源；旧管理器不得查找替换插件实例。从回调返回异步工作，以便实例保留它直到它稳定下来。 Disposal 在运行 `onDispose` 之前不会等待此工作，因此 cleanup 可以停止该工作并安全地等待它；模块拆卸仍然等待它解决，并且超出清理预算的工作将像其他调用一样被强制退休。入场结束后新来电将被拒绝；已经承认的主机清理保留其拆卸权限。运行程序不会安排工作或取消本机资源：释放现有清理所有者中的资源。与其他实例生命周期字段一样，它在没有托管实例的 API 主机上可能不存在。

检查发布报告解决了处置失败，但未将托管资源标记为仍保留。准备好的模型关闭会记录这些故障，并可以在清理解决后完成。未完成的处置和失败的主机清理先决条件仍然会阻止关闭报告已完成的资源释放。

停止或重新启动网关会保留持久插件会话状态并运行主机清理挂钩，原因为 `restart`。禁用或删除插件相当于删除该状态。承认的清理工作完成后，将报告插件回调失败，并以插件和挂钩名称作为关闭警告；它们不会将正常停止变成失败的进程退出。失败的会话状态清理和未完成的可写工作仍然会阻止干净关闭。

清理是尽最大努力。插件必须在 `onDispose` 或其服务的 `stop()` 方法中显式释放自己的计时器、侦听器、套接字、观察程序和子进程。 OpenClaw 不会拦截这些本机资源或证明它们在托管退役完成时已停止。本机插件仍然是受信任的进程内代码。普通数据和本机字节缓冲区保留其正常身份；生命周期防护适用于托管可调用表面，而不是插件可以保留的每个对象。

释放存储的句柄并取消计时器。在 Node 上，取消的计时器对象仍然可以保留创建它的异步上下文：

```ts
clearInterval(timer);
timer = undefined;
```

这对于本机 ESM 插件中的模块级状态很重要：Node 可以在替换后保留评估的模块。删除捕获的文件并关闭其托管回调不会卸载该本机模块或清除其变量。在清理过程中删除对已停止资源和其他一次性状态的引用。

插件返回的不透明值可以直接传回，也可以在纯数据记录和数组中传回。具有方法或访问器的调用者拥有的对象会原封不动地传递，包括其中的任何句柄。

`createPluginRuntimeStore` 从调用托管实例解析其插槽。准备另一个实例不会覆盖该实例的运行时。托管实例范围之外的调用保留存储的现有独立行为。网关托管的代理轮流对每个未更改的插件使用接纳网关自己的实例：在网关的工作区和环境中具有相同的源、安装、清单、激活、入口策略和配置。贷方来自承认的 Gateway 所有者，而不是碰巧处于流程活动状态的另一个 Gateway。如果没有明确的实时所有者，准备工作将加载单独的实例。借用轮流运行网关的`registrationMode: "full"`注册并共享其服务和运行时存储；仅网关缺少或配置不同的插件加载单独的发现实例。在 `openclaw plugins reload` 之后，后面的轮次使用重新加载的 Gateway 实例，并且重新加载等待仍保留前一个轮次的轮次。借用的通道方法和读取权限授予随着借用运行时或调用范围而过期；停用借用者不会停用网关的实例。

分别加载插件的轮次从接纳网关的当前注册表借用其工具注册，因此工厂和执行共享其服务初始化运行时的实例。采用需要相同的插件源、配置、声明的工具名称的非空集和可选性。它保留了发现工具的成员身份和顺序。如果没有明确承认网关所有者，轮流将保留其发现注册。

返回裸结果的 SDK 帮助程序将保留其资源，直到所属主机关闭。调用者不需要处理这些结果；请参阅 [ 准备的简单补全 ](/plugins/sdk-runtime/models#prepared-simple-completions)。

第一方有界持久性序列在异步准备之前保留其原始代理执行器，并在发布清理后释放它。私人 `sqlite-runtime` 外观暴露了现有所有者及其记录的本地身份；每个工作命令都保留自己的 FIFO 轮次和实时权限检查。本地维护和私人影子商店保留了现有的所有者。

SQLite 工作后端使用 `openclaw/plugin-sdk/sqlite-worker-runtime` 中的 `setSqliteBusyTimeout` 设置连接锁定等待策略，包括临时更改。连接所有者保留当前超时，跳过未更改的分配，并在关闭时将其丢弃；拥有的连接上的原始超时 PRAGMA 将绕过该策略。

连接绑定后端使用来自同一入口点的 `bindSqliteWorkerDatabase(db, backend)` 进行范围关闭和同步事务结算检查。后端提供其命令实现和可选的准备或范围清理；它永远不会关闭借用的数据库。事务和提交许可仍由执行器和存储的写入操作保留。

在不更改任何会话事实的情况下写入派生数据的工作内核将其同步 DML 包装在同一子路径中的 `withSqliteDatabaseWriteScope(db, [], write)` 中。这会保留常驻会话缓存，同时数据库范围的写接收仍然会前进。只验证内核自己的写入；将用户回调和权限准入保留在范围之外。架构更改继续使所有范围失效。

引擎感知存储在`openclaw/plugin-sdk/database-engine-runtime`中保存主机秘密解析和操作结算，在worker/admission-only `openclaw/plugin-sdk/database-engine-worker-runtime`中保存物理打开和交易配方。现有的 `sqlite-worker-runtime` 入口点保留 SQLite 帮助程序； PostgreSQL 连接通过 `openEngineStore` 打开，无需公共连接构造函数。有关契约和边界，请参阅 [ 数据库引擎适配器](/plugins/sdk-overview/infrastructure#database-engine-adapters-experimental)。

`readSqliteDatabaseWriteTokenForPath` 从 `openclaw/plugin-sdk/sqlite-runtime` 读取现有物理数据库身份和进程内写入器收据，而不发出 SQL 或工作程序请求。仅当令牌已定义并且在读取前后未更改时，保留的行缓存才可以重用结果。未定义的令牌意味着缓存重用未经证实，包括在写入未解决时；它不否认普通读取或授予有效权限。更改的令牌会使依赖于该数据库的每个派生缓存失效，包括同级插件实例中的缓存。帮助程序不会观察其他进程的写入。

对于一个数据库中的独立数据所有者，`readSqliteDatabaseScopedWriteTokenForPath(path, scope)` 保留不相关范围写入的事实。工人从`sqlite-worker-runtime`导出`readSqliteDatabaseScopedWriteToken`和`readSqliteDatabasePendingScopedWriteToken`；使用后者将提交的范围收据附加到事务结果。每个参与的作者都将其受影响的范围命名为 `withSqliteDatabaseWriteScope`。无范围写入和架构更改使所有范围收据无效。这些令牌描述提交的数据，从不影响权限。

第一方运行时调用方使用同一子路径中的 `openOpenClawAgentSqliteWorkerStoreV2` 来接纳冷代理存储，而无需接收可写的本机句柄。其所需的实时权限在工作人员授予内运行，并且不得读取相同的数据库或执行阻塞工作。将相同数据库谓词放入配对的工作事务中。显式`prepare()`拥有创作； `executeExisting` 保持丢失的存储不存在。 `terminalSignal` 在接受的出版物解决后以终端故障原因中止。保留的消费者必须停止重复使用该商店并通过其正常的入场所有者购买。空闲退出和显式 `close()` 不会中止信号；中止的信号永远不会授权重放已确认或未知结果的写入。已弃用的 `withOpenClawAgentDatabaseRuntime` 和 `withOpenClawAgentDatabaseAsync` 保留其本机回调和准入顺序，包括后者的完整性后、修复前检查点，直至 2026 年 12 月 31 日。 2027 年 1 月第一个稳定版本中移除船舶；请参阅 [SQLite 迁移指南](/plugins/sdk-migration/sqlite-async#debug-proxy-capture-and-raw-sqlite)。等待这些回调不会将 SQL 移出线程。

转录断言组合保留准备好的源代码检查，独立于不透明的 SDK 回调。冷恢复可以重新检查那些准备好的组件及其存储的谓词，同时保留本机提交的完整同步断言。自定义 SDK 断言包装器不会在恢复工作授予中执行；现有的写入器适配器选择保持不变。

`await api.runtime.agent.session.createSessionEntryListReader({ agentId, storePath, env? })` 为持久会话存储创建只读元数据清单读取器。等待返回的函数读取`{ entries, assertCurrent }`。它重用条目，而工作人员的数据库化身、进程内写入器收据和会话行生成保持不变。通过同级句柄写入并重新打开数据库会使快照失效；它不会轮询外部作者。外部编写者必须使用网关或在网关停止时拥有独占所有权。条目不包括已保存的提示快照和派生参与者。将它们视为不可变的。返回的断言检查物理源身份，不共享权限或行新鲜度；等待后发布数据之前重新验证访问。将读取器保留在其使用者的生命周期内，并在配置更改时丢弃它。

`openclaw/plugin-sdk/session-store-runtime` 中的 `cleanupSessionLifecycleArtifacts` 在捕获其物理身份之前加入所选数据库所有者的挂起启动准备。准备好的代理无需等待。通过正常的数据库准入检查，失败的准备仍然会出现；网关关闭会取消等待。

### <a id="memory-runtime-replacement"></a> 内存运行时更换

内存运行时可以实现 `prepareReload({ retireRuntime, retiringEmbeddingProviders })` 并返回 `drain()` 和 `resume()`。同步准备工作会影响经理的获取，包括懒惰和后备工作。匹配确切获取的适配器对象而不是提供者 ID。 Drain 在尝试关闭受影响的管理器之前先将其从重用中删除。它可能会返回 `{ errors }` 以报告清理失败。取消后或发布后保留运行时，恢复重新打开准入，即使旧的清理仍未完成。退休经理不得将最新结果发布到替代经理的缓存中。

准备未使用的运行时必须卸载其管理器引擎。对于没有此挂钩的运行时，如果运行时或嵌入适配器停用，OpenClaw 会调用现有的 `closeAllMemorySearchManagers` 方法（如果提供）。这将关闭所有该运行时的管理器作为尽力清理；它无法识别依赖的管理者或阻止并发管理者收购。

## <a id="browser-meeting-transport-builders"></a> 浏览器会议运输建设者

`MeetingPlatformAdapter.createBrowserAdapterOptions` 根据平台页面脚本、权限来源、显示名称、手动操作前缀和重试策略为 `MeetingPlatformAdapter.create` 构建 `browser` 和 `parsing` 选项。 `MeetingPlatformAdapter.createPageScripts` 组装状态、转录、音频捕获和离开脚本，同时插件提供身份和控制源。其 `statusPrelude` 和 `statusCall` 描述符共享工厂的 `platform` 元数据，包括页面全局变量和 audio/manual-action 前缀。

`createStatusPreludeSource` 接受 `lifecycleSource` 和 `manualActionSource` 的源字符串或回调。回调接收来宾姓名、保留身份、虚拟音频输入、麦克风控制和手动操作的共享片段。现有的基于字符串的调用者保留其生成的源。

## <a id="browser-meeting-status-ownership"></a> 浏览器会议状态所有权

`MeetingPlatformAdapter.createStatusCallSource` 接受可选的 `liveOwnershipSource`：在生成的状态脚本的页面范围中计算的 JavaScript 布尔表达式。当设备枚举、扬声器路由或播放等待完成时呼叫所有权可能发生变化时，请使用它。错误结果会停止路由传递，通过会话的音频清理助手恢复匹配源，退役拥有的网桥，并将输出报告为未路由且可重试。省略该选项会使生成的状态源保持不变。

## <a id="browser-meeting-participation"></a> 浏览器会议参与

现有的 `openclaw/plugin-sdk/meeting-runtime` 入口点公开了 `MeetingSessionRuntime` 上的可选参与方法。为其 `participation` 选项提供 SQLite 插件密钥存储、当前功能、操作验证和提供程序执行器。提供者通过 `observeParticipationSource` 观察已解析的源身份、纪元、修订和最终性；永远不要接受模型参数中的这些字段。 `inspectParticipationSource` 针对跨越异步边界的工作返回快照和实时防护。

参与特定的命名导出为 `runMeetingParticipationWithBrowser`、`MeetingBrowserParticipationAdapter`、`MeetingParticipationRequest`、`MeetingParticipationSource` 和 `MeetingParticipationAttempt`。其他有效负载和选项形状仍然是类型化运行时和适配器签名的一部分，而不是单独的顶级 SDK 别名。

每个会话最多保留 1,024 个实时源，持续时间为首次观察后的两分钟。容量接纳和驱逐使用原始观察顺序，而不是快照重放或校正时间。重复快照保留未更改的保留引用和防护；旧的重播源无法取代完整实时源窗口中的新源。

保留的转录行带有单独的 `provenance` 信封：观察者、可选的 observation/session/document 标识符和观察时间、观察到的说话者标签以及本机 `self`、`other` 或 `unknown` 归属。演讲者标签不是参与者身份。缺失或畸形的归属仍然未知；出处记录永远不会授予参与权。临时行、历史行、自身回显行和其他不可操作行保留独立于 `source` 的出处。

这是保留快照合同，而不是修订日志。未改变的民意调查保持观察标识符不变；无需保留民意调查之间的中间状态。根据现有的保留策略，现有的转录存储将其已存储的话语封装在 `metadata.meetingObservationProvenance` 中。没有单独的观察档案。删除一份 DOM 副本不得最终确定仍具有 Live 副本的源。

浏览器适配器可以实现 `MeetingBrowserParticipationAdapter` 并通过 `runMeetingParticipationWithBrowser` 进行调度。帮助器使用现有的选项卡锁、固定路由和会话防护。可选的准备脚本可以打开控件并等待准备就绪，但不得执行请求的操作。准备完毕后，主机重新验证权限。最终脚本检查页面会话和 URL 并在第一次等待之前同步执行其效果；稍后的等待可能会观察到结果，但不得产生其他效果。只有证明没有发生所要求的效果的拒绝结果才可以设置`correctable: true`。其他会议平台无需更改适配器，并继续报告不受支持的参与。

浏览器分派后取消是尽力而为：效果可能会在主机检测到源过期、更正或会话撤销之前发生。运行时将该结果报告为 `uncertain`；不得将其视为取消或允许重试新请求 ID 的证据。预调度权限检查以及适配器的最终页面会话和 URL 检查仍然需要。

## <a id="worker-provider-allocation-authority"></a> Worker提供者分配权限

工作线程运行时和注册授权可能包括 `nodeBootstrap.linuxToolchainSetup`，这是一个核心拥有的 POSIX 脚本，该脚本在调用引导程序 JavaScript 之前准备受支持的 Node。提供者仅针对 Linux 目标执行它，使用与 bootstrap 相同的操作权限和命令预算。它没有任何凭证。 macOS 和 Windows 提供商保留其提供图像的 Node 合同。

网关在传递给工作器提供者的 `provision` 和 `prepareProvision` 方法的选项中提供 `assertCurrent()`。此所需的运行时回调将操作绑定到实时环境所有者和任何请求的运行。在等待准备之后并在分配、检查点分叉或采用之前调用它。未中止的 `signal` 并不能证明调用者仍然具有权限。进行项目准备的提供商必须使用 `project.assertCurrent()` 编写此回调，以便两个所有者保持当前状态。

该回调属于提供尝试。将其带入返回的准备好的分配闭包中，但切勿将其序列化或将其保留在持久或可重用的准备记录中。尝试结束后，回调将拒绝保留的工作。 Teardown 保留其现有的清理权限，并且在请求运行结束时仍必须解决自有租约。

项目准备可以返回可选的 `recipePreparation` 诊断，其中包含配方源、忽略属性注释、阶段持续时间和故障原因以及最多 16 个 KiB 的输出尾部。可选的传输回调 `recordRecipePreparation` 在声明的配方拒绝之前记录诊断。这些记录既不包含命令定义，也不包含环境值。可选的 `captureSkipped` 原因意味着检测到的设置失败，尽力而为：继续注册，但抑制该分配的检查点捕获，包括稍后的拆卸。将这些记录的事实保存在同一实时供应机构之下；他们不授予新的分配或执行权限。

旧版可选参数形状保持源兼容，直到下一个声明的破坏性插件 SDK 版本为止。它不是一个无能力的运行时路径：当前主机提供此断言，并且捆绑的提供程序在执行工作之前拒绝缺少分配权限。旧主机必须更新才能使用这些提供程序。

## <a id="harness-execution-identity"></a> harness执行标识

harness主机的闭包绑定 `preparedEnvironment()` 返回非秘密执行事实。当 `hostExecutionRequired` 为 true 时，使用主机的 `createToolSurfaceAsync()` 执行工具而不是本机运行时 shell 环境覆盖。主机在插件切换之前捕获凭证选择，并在子启动时将其私下绑定。工具构造覆盖不能替代该选择。该工具保留主机现有的批准、来源权限、流程生命周期和故障处理；这一事实不授予任何凭证导出或远程委派权限。没有托管选择的主机会忽略可选事实并保留本机执行默认值。

## <a id="other-top-level-api-fields"></a> 其他顶层 `api` 字段

除了 `api.runtime` 之外，API 对象还提供：

<ParamField path="api.id" type="string">
  插件 id。
</ParamField>
<ParamField path="api.name" type="string">
  插件显示名称。
</ParamField>
<ParamField path="api.config" type="OpenClawConfig">
  此实例注册时提供的只读配置快照。使用默认的混合重新加载模式，对此插件的 `plugins.entries.<id>` 的更改会默认替换其实例并重新运行注册。保留实例在不相关的配置更改中保留其快照。在长期回调中，首选提供的 `cfg`，或者在未传递配置时使用 `api.runtime.config.current()`。
</ParamField>
<ParamField path="api.pluginConfig" type="Record<string, unknown>">
  来自 `plugins.entries.<id>.config` 的插件特定配置，在注册时捕获。对此配置的普通编辑会自动替换混合模式下的实例，除非应用更窄的插件重新加载策略。源或清单编辑仍然需要 [plugin Reload](/cli/plugins#reload)。
</ParamField>
<ParamField path="api.logger" type="PluginLogger">
  作用域日志记录器（`debug`、`info`、`warn`、`error`）。
</ParamField>
<ParamField path="api.registrationMode" type="PluginRegistrationMode">
  当前加载模式：`"full"`（实时激活）、`"discovery"` / `"tool-discovery"`（只读能力发现）、`"setup-only"`（轻量级设置入口）、`"setup-runtime"`（同时需要运行时通道入口的设置流程）或 `"cli-metadata"`（CLI 命令元数据收集）。
</ParamField>
<ParamField path="api.resolvePath(input)" type="(string) => 字符串">
  解析相对于插件根目录的路径。
</ParamField>

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本中的每个节标题和命名空间锚点都保留其锚点，因此现有链接（例如 `/plugins/sdk-runtime#api-runtime-subagent`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="config-loading-and-writes" />[配置加载和写入](/plugins/sdk-runtime/config-and-utilities#config-loading-and-writes)
- <a id="reusable-runtime-utilities" />[可重复使用的运行时实用程序](/plugins/sdk-runtime/config-and-utilities#reusable-runtime-utilities)
- <a id="stage-timing-diagnostics" />[阶段定时诊断](/plugins/sdk-runtime/config-and-utilities#stage-timing-diagnostics)
- <a id="plugin-command-runtime-helpers" />[插件命令运行时帮助程序](/plugins/sdk-runtime/agent#plugin-command-runtime-helpers)
- <a id="gateway-service-events" />[网关服务事件](/plugins/sdk-runtime/gateway-and-nodes#gateway-service-events)
- <a id="api-runtime-agent" />[`api.runtime.agent`](/plugins/sdk-runtime/agent#api-runtime-agent)
- <a id="api-runtime-agent-defaults" />[`api.runtime.agent.defaults`](/plugins/sdk-runtime/agent#api-runtime-agent-defaults)
- <a id="api-runtime-llm" />[`api.runtime.llm`](/plugins/sdk-runtime/models#api-runtime-llm)
- <a id="api-runtime-gateway" />[`api.runtime.gateway`](/plugins/sdk-runtime/gateway-and-nodes#api-runtime-gateway)
- <a id="api-runtime-hooks" />[`api.runtime.hooks`](/plugins/sdk-runtime/background-work#api-runtime-hooks)
- <a id="api-runtime-subagent" />[`api.runtime.subagent`](/plugins/sdk-runtime/background-work#api-runtime-subagent)
- <a id="api-runtime-sandbox" />[`api.runtime.sandbox`](/plugins/sdk-runtime/agent#api-runtime-sandbox)
- <a id="api-runtime-nodes" />[`api.runtime.nodes`](/plugins/sdk-runtime/gateway-and-nodes#api-runtime-nodes)
- <a id="api-runtime-tts" />[`api.runtime.tts`](/plugins/sdk-runtime/media#api-runtime-tts)
- <a id="api-runtime-mediaunderstanding" />[`api.runtime.mediaUnderstanding`](/plugins/sdk-runtime/media#api-runtime-mediaunderstanding)
- <a id="api-runtime-imagegeneration" />[`api.runtime.imageGeneration`](/plugins/sdk-runtime/media#api-runtime-imagegeneration)
- <a id="api-runtime-videogeneration" />[`api.runtime.videoGeneration`](/plugins/sdk-runtime/media#api-runtime-videogeneration)
- <a id="api-runtime-musicgeneration" />[`api.runtime.musicGeneration`](/plugins/sdk-runtime/media#api-runtime-musicgeneration)
- <a id="api-runtime-websearch" />[`api.runtime.webSearch`](/plugins/sdk-runtime/media#api-runtime-websearch)
- <a id="api-runtime-media" />[`api.runtime.media`](/plugins/sdk-runtime/media#api-runtime-media)
- <a id="api-runtime-config" />[`api.runtime.config`](/plugins/sdk-runtime/state-and-system#api-runtime-config)
- <a id="api-runtime-system" />[`api.runtime.system`](/plugins/sdk-runtime/state-and-system#api-runtime-system)
- <a id="api-runtime-events" />[`api.runtime.events`](/plugins/sdk-runtime/state-and-system#api-runtime-events)
- <a id="api-runtime-logging" />[`api.runtime.logging`](/plugins/sdk-runtime/state-and-system#api-runtime-logging)
- <a id="api-runtime-modelconfig" />[`api.runtime.modelConfig`](/plugins/sdk-runtime/models#api-runtime-modelconfig)
- <a id="api-runtime-modelauth" />[`api.runtime.modelAuth`](/plugins/sdk-runtime/models#api-runtime-modelauth)
- <a id="api-runtime-state" />[`api.runtime.state`](/plugins/sdk-runtime/state-and-system#api-runtime-state)
- <a id="api-runtime-channel" />[`api.runtime.channel`](/plugins/sdk-runtime/channel#api-runtime-channel)

## <a id="related"></a> 相关内容

- [插件内部机制](/plugins/architecture) — 能力模型和注册表
- [SDK 入口点](/plugins/sdk-entrypoints) — `definePluginEntry` 选项
- [SDK 概览](/plugins/sdk-overview) — 子路径参考

## <a id="decision-model-runtime"></a> 决策模型运行时

`api.runtime.decisions` 是针对小型类型 Choice、有序 Score 和布尔概率批次的闭包绑定可选功能。保留的句柄在消费者退休后拒绝。有关提供商选择、生命周期、故障处理、限制和诊断的信息，请参阅 [ 决策模型](/plugins/sdk-overview/capabilities#decision-models-contract-version-1)。

## <a id="setup-secret-egress"></a> 设置秘密出口

工作线程提供者可以选择实现 `runSetupCommand`，以通过其拥有的租赁传输运行存储库绑定生命周期命令。主机提供准备好的工作区和 HOME、仅接受有界远程环境的脚本工厂以及实时附加的 environment/repository 权限防护。提供商在等待之后和启动之前重新检查该防护。返回`undefined`保留正常节点隧道；受保护的传输错误必须拒绝而不是回退。项目准备的脚本工厂接受相同的有界准备环境。秘密和主机代理凭据仍然由下面的设置出口功能拥有。

私有官方插件入口点 `openclaw/plugin-sdk/secret-egress-runtime` 与 `withConfiguredModelEgress` 一起导出 `withSetupSecretEgress(options, run)`。两者都使用相同的工人拥有的、可撤销的工作授予生命周期。设置选项需要作业拥有的 `AbortSignal` 以及环境名称到共享存储 SecretRefs 的显式映射：

```ts
const { withSetupSecretEgress } = await import("openclaw/plugin-sdk/secret-egress-runtime");
await withSetupSecretEgress(
  {
    signal: job.signal,
    secrets: {
      REGISTRY_TOKEN: { source: "store", provider: "default", id: "REGISTRY_TOKEN" },
    },
  },
  async ({ remoteEnv, caBundle, hostEnv, revoke }) => {
    await bridge.run({ remoteEnv, caBundle, hostEnv, revoke });
  },
);
```

主桥必须将 `hostEnv` 保留在拥有凭证的主机上。它包含经过身份验证的上游代理 URL 和本地 CA 路径。只有`remoteEnv`（密封哨兵）和`caBundle`（公信内容）可以交叉到远程作业；网桥自行安装远程代理和 CA 设置。存储值及其允许的主机通过共享状态读取工作程序一起选择，并且仅注册选定的受保护机密。丢失和代理可读的条目在回调运行之前失败。

安装授权的撤销侦听器后，在回调内注册进程终止侦听器。终止前先中止作业信号，或者先同步调用`revoke()`。保留的凭据在取消、显式撤销、回调结算或工作人员故障后停止授权外出。回调必须在返回之前加入其进程并桥接清理。然后帮助程序停止工作程序并删除临时 CA 文件；它本身不管理远程进程。此功能不添加配置文件密钥或存储数据迁移。

<a id="api-runtime-tasks" />

以前的任务运行时不再可用。请参阅 [removed Tasks 和 TaskFlow APIs](/plugins/sdk-migration/removed-surfaces#tasks-and-taskflow-apis-removed) 了解本机所有者的替代方案。

### <a id="bounded-stale-reads"></a> Bounded 陈旧读取

`openclaw/plugin-sdk/collection-runtime` 为元数据读取器导出 `createStaleWhileRevalidateCache`。它合并刷新、限制保留条目和活动负载，并返回 `{ value, stale }`。负载在外部请求之前保留其凭证和服务权限检查。在提供任何结果之前重新验证每个调用者。 `allowStale: false` 等待新鲜感； `refresh: true` 替换旧负载。 `clear()` 废弃待处理的缓存发布。缓存密钥必须包含所属身份或修订版本；缓存从不提供授权。

`createStaleWhileRevalidateCache` 来自 `openclaw/plugin-sdk/collection-runtime` 将先前成功的值（或 `undefined`）传递给其加载回调，包括显式刷新。将 HTTP 验证器保留为该值，以便逐出、清除和失败的刷新一起淘汰表示及其验证器。加载器必须将先前的值视为不可变的。

### <a id="worker-provisioning-status"></a> Worker配置状态

工作线程提供者可以在配置期间调用 `options.reportStartStatus` 来发布尝试范围的快照或冷启动事实。环境状态和会话放置将这些事实暴露为 `startStatus`；当尝试完成或失去权限时，主机关闭回调。仅在声明捕获时报告捕获进度。这些显示事实不会改变分配或注册所有权。
