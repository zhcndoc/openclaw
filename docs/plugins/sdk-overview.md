---
summary: "导入映射、注册 API 参考与 SDK 架构"
title: "插件 SDK 概览"
sidebarTitle: "插件 SDK 概览"
read_when:
  - 你需要知道应从哪个 SDK 子路径导入
  - 你想查看 OpenClawPluginApi 上所有注册方法的参考
  - 你正在查找某个特定的 SDK 导出
---

插件 SDK 是插件与核心之间的类型化契约。此页面是关于**导入什么**以及**可以注册什么**的参考。

<Note>
  此页面面向在 OpenClaw 内部使用 `openclaw/plugin-sdk/*` 的插件作者。对于希望通过 Gateway 运行 agent 的外部应用、脚本、仪表板、CI 作业和 IDE 扩展，请改用 [面向外部应用的 Gateway 集成](/gateway/external-apps)。
</Note>

<Tip>
在寻找操作指南吗？请从 [构建插件](/plugins/building-plugins) 开始。关于 channel，请使用 [Channel 插件](/plugins/sdk-channel-plugins)；关于模型提供方，请使用 [Provider 插件](/plugins/sdk-provider-plugins)；关于本地 AI CLI 后端，请使用 [CLI 后端插件](/plugins/cli-backend-plugins)；关于原生 agent 执行器，请使用 [Agent harness 插件](/plugins/sdk-agent-harness)；关于工具或生命周期钩子，请使用 [插件 hooks](/plugins/hooks)。
</Tip>

## 导入约定

始终从特定子路径导入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
```

每个子路径都是一个小型、独立的模块。这既能保持启动速度，也能
防止循环依赖问题。对于特定渠道的入口/构建辅助函数，
优先使用 `openclaw/plugin-sdk/channel-core`；将 `openclaw/plugin-sdk/core` 保留给
更广泛的总入口面和共享辅助函数，例如
`buildChannelConfigSchema`。

对于渠道配置，请通过
`openclaw.plugin.json#channelConfigs` 发布渠道拥有的 JSON Schema。`plugin-sdk/channel-config-schema`
子路径用于共享 schema 基元和通用构建器。OpenClaw 的
捆绑插件使用 `plugin-sdk/bundled-channel-config-schema` 来保留
捆绑渠道 schema。已弃用的兼容导出仍保留在
`plugin-sdk/channel-config-schema-legacy`；这两个捆绑 schema 子路径都不应
作为新插件的模式。

<Warning>
  不要导入提供方或渠道品牌化的便捷入口（例如
  `openclaw/plugin-sdk/slack`、`.../discord`、`.../signal`、`.../whatsapp`）。
  捆绑插件会在各自的 `api.ts` /
  `runtime-api.ts` barrel 中组合通用的 SDK 子路径；核心消费者应当使用这些插件本地的
  barrel，或者在确实跨渠道需要时添加一个更窄的通用 SDK 契约。

有一小部分捆绑插件辅助入口在具有跟踪到的所有者使用时，仍会出现在生成的导出
映射中。它们仅用于捆绑插件
维护，不推荐新第三方
插件使用。

`openclaw/plugin-sdk/discord` 和 `openclaw/plugin-sdk/telegram-account` 也被保留为
面向已跟踪所有者使用的已弃用兼容外观。不要将这些导入路径
复制到新插件中；应改用注入的运行时辅助函数和
通用渠道 SDK 子路径。
</Warning>

## 子路径参考

插件 SDK 以按领域分组的一组窄子路径形式暴露（插件
入口、渠道、提供方、认证、运行时、能力、内存，以及保留的
捆绑插件辅助函数）。完整目录——按组整理并带链接——请参见
[插件 SDK 子路径](/plugins/sdk-subpaths)。

编译器入口点清单位于
`scripts/lib/plugin-sdk-entrypoints.json`；包导出是在
从公共子集减去 `scripts/lib/plugin-sdk-private-local-only-subpaths.json` 中列出的仓库本地测试/内部子路径后生成的。
运行
`pnpm plugin-sdk:surface` 可审计公共导出数量。已弃用且历史足够久、并且未被捆绑扩展生产代码使用的公共
子路径记录在 `scripts/lib/plugin-sdk-deprecated-public-subpaths.json` 中；广泛的
已弃用重导出 barrel 记录在
`scripts/lib/plugin-sdk-deprecated-barrel-subpaths.json` 中。

## 注册 API

`register(api)` 回调会接收一个 `OpenClawPluginApi` 对象，其中包含这些
方法：

### 能力注册

| 方法                                             | 注册内容                                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `api.registerProvider(...)`                      | 文本推理（LLM）                                                                        |
| `api.registerWorkerProvider(...)`                | 云工作器生命周期租约                                                                   |
| `api.registerModelCatalogProvider(...)`          | 用于文本和媒体生成的模型目录行                                                        |
| `api.registerAgentHarness(...)`                  | [实验性](/plugins/sdk-agent-harness) 原生代理执行器（Codex、Copilot）                 |
| `api.registerCliBackend(...)`                   | 本地 CLI 推理后端                                                                      |
| `api.registerChannel(...)`                       | 消息通道                                                                              |
| `api.registerEmbeddingProvider(...)`             | 可复用的向量嵌入提供者                                                                |
| `api.registerSpeechProvider(...)`                 | 文本转语音 / STT 合成                                                                 |
| `api.registerRealtimeTranscriptionProvider(...)`  | 流式实时转写                                                                          |
| `api.registerRealtimeVoiceProvider(...)`          | 双工实时语音会话                                                                      |
| `api.registerMediaUnderstandingProvider(...)`     | 图像 / 音频 / 视频分析                                                                |
| `api.registerTranscriptSourceProvider(...)`       | 实时或导入的会议转录来源                                                              |
| `api.registerImageGenerationProvider(...)`        | 图像生成                                                                              |
| `api.registerMusicGenerationProvider(...)`        | 音乐生成                                                                              |
| `api.registerVideoGenerationProvider(...)`        | 视频生成                                                                              |
| `api.registerWebFetchProvider(...)`               | Web 获取 / 抓取提供者                                                                 |
| `api.registerWebSearchProvider(...)`              | Web 搜索                                                                              |
| `api.registerCompactionProvider(...)`             | 可插拔的转录压缩后端                                                                  |

Worker provider 还必须在 `contracts.workerProviders` 中声明其 id。  
Core 会在 `provision(profile, operationId)` 之前持久化持久化意图。Provider 在外部分配之前验证设置，并在永久性拒绝 profile 时抛出 `WorkerProviderError`。当 operation id 重复时，`provision` 必须接管同一个租约。  
Core 会将已验证的 profile 设置与租约一并持久化，并将该快照提供给 `destroy({ leaseId, profile })`，该方法必须是幂等的，以及 `inspect({ leaseId, profile })`，该方法返回 `active`、`destroyed` 或 `unknown`。这使 provider 能够在网关重启或命名 profile 被移除后路由生命周期调用。SSH 端点对 `keyRef` 使用 `SecretRef`，绝不内联密钥材料，并包含来自受信任 provisioning 输出的 `hostKey`，其格式必须恰好为 `algorithm base64`，不带主机名或注释。Core 会固定 `hostKey`，绝不信任首次连接中的密钥。能够铸造动态 `keyRef` 的 provider 可以实现 `resolveSshIdentity({ leaseId, profile, keyRef })`；当存在该解析器时，它具有权威性，而没有该解析器的 provider 则使用配置的通用密钥解析器。  
具有可续租约的 provider 也可以实现 `renew(leaseId)`。  
`inspect` 对瞬态或不确定性失败必须抛出错误；只有在权威性缺失时才返回 `unknown`。Core 会将活动的本地记录标记为孤儿记录，或者在已持久化的 destroy 请求之后，将缺失视为拆除完成。

通过 `api.registerEmbeddingProvider(...)` 注册的嵌入 provider 还必须在插件清单中的 `contracts.embeddingProviders` 里列出。这是用于可复用向量生成的通用嵌入接口。Memory search 可以消费这个通用 provider 接口。较旧的 `api.registerMemoryEmbeddingProvider(...)` 和 `contracts.memoryEmbeddingProviders` 接口现已弃用，作为兼容性保留，供现有的 memory 专用 provider 迁移。

仍然暴露运行时 `batchEmbed(...)` 的 memory 专用 provider，除非其运行时明确设置 `sourceWideBatchEmbed: true`，否则仍遵循现有的按文件批处理契约。该显式启用项允许 memory host 将来自多个脏 memory 文件和已启用来源的 chunk 一次性提交到单个 `batchEmbed(...)` 调用中，直到达到 host 的批处理限制为止。上传 JSONL 请求文件的批处理适配器，必须同时按上传大小上限和请求数量上限拆分 provider 作业。Provider 必须按 `batch.chunks` 的顺序，为每个输入 chunk 返回一个 embedding；如果 provider 期望按文件本地批处理，或无法在更大的 source-wide 作业中保持输入顺序，则不要省略该标志。

### 工具和命令

对于固定工具名称的简单仅工具插件，请使用 [`defineToolPlugin`](/plugins/tool-plugins)。
对于混合插件或完全动态的工具注册，请直接使用 `api.registerTool(...)`。

| 方法                                 | 注册内容                                                                                                                        |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `api.registerTool(tool, opts?)`        | Agent 工具（必需，或 `{ optional: true }`）                                                                                            |
| `api.registerCommand(def)`             | 自定义命令（绕过 LLM）                                                                                                        |
| `api.registerNodeHostCommand(command)` | 由 `openclaw node run` 处理的命令；可选的 `agentTool` 元数据可以在节点连接时将其作为 agent 可见的工具公开 |

当 agent 需要一个简短的、由命令拥有的路由提示时，插件命令可以设置 `agentPromptGuidance`。该文本应仅与命令本身相关；不要将提供方或插件特定策略加入核心提示构建器中。

Guidance 条目可以是传统字符串，适用于每个提示界面，或者是
结构化条目：

```ts
agentPromptGuidance: [
  "全局命令提示。",
  { text: "Only show this in the main OpenClaw prompt.", surfaces: ["openclaw_main"] },
];
```

结构化 `surfaces` 可以包括 `openclaw_main`、`codex_app_server`、
`cli_backend`、`acp_backend` 或 `subagent`。`pi_main` 仍然是
`openclaw_main` 的弃用别名。若有意对所有界面生效，请省略 `surfaces`。
不要传入空的 `surfaces` 数组；它会被拒绝，这样就不会因为意外的作用域丢失而变成全局提示文本。

原生 Codex app-server 开发者指令比其他提示界面更严格：只有明确作用域为 `codex_app_server` 的 guidance 才会被提升到那个更高优先级的通道。传统字符串 guidance 和未指定作用域的结构化 guidance 仍然可用于非 Codex 提示界面以保持兼容性。

Node-host 命令运行在连接的 node host 上，而不是在 Gateway
进程内。如果存在 `agentTool`，节点会在成功连接 Gateway 后发布一个描述符；Gateway 只有在该节点连接期间，且仅当描述符的 `command` 位于节点已批准的命令范围内时，才会将其暴露给 agent 运行。将 `agentTool.defaultPlatforms` 设置为把一个非危险命令纳入默认 node 命令允许列表；否则需要显式的 `gateway.nodes.allowCommands` 或 node-invoke policy。`agentTool.name` 必须对提供方安全：以字母开头，只能使用字母、数字、下划线或连字符，并且长度不超过 64 个字符。基于 MCP 的 node 工具可以设置 `agentTool.mcp` 元数据，以便目录和工具搜索界面显示远程 MCP 服务器/工具身份，但执行仍然通过所公开的 node 命令进行。

### 基础设施

| 方法                                          | 注册内容                                                      |
| ----------------------------------------------- | ---------------------------------------------------------------------- |
| `api.registerHook(events, handler, opts?)`      | 事件钩子                                                             |
| `api.registerHttpRoute(params)`                 | 网关 HTTP 端点                                                  |
| `api.registerGatewayMethod(name, handler)`      | 网关 RPC 方法                                                     |
| `api.registerGatewayDiscoveryService(service)`  | 本地网关发现发布器                                     |
| `api.registerCli(registrar, opts?)`             | CLI 子命令                                                         |
| `api.registerNodeCliFeature(registrar, opts?)`  | `openclaw nodes` 下的 Node 功能 CLI                                |
| `api.registerService(service)`                  | 后台服务                                                     |
| `api.registerInteractiveHandler(registration)`  | 交互式处理器                                                    |
| `api.registerAgentToolResultMiddleware(...)`    | 运行时工具结果中间件                                         |
| `api.registerMemoryPromptSupplement(builder)`   | 附加的、与 memory 相邻的提示词部分                                |
| `api.registerMemoryCorpusSupplement(adapter)`   | 附加的 memory 搜索/读取语料库                                     |
| `api.registerHostedMediaResolver(resolver)`     | 用于浏览器风格托管媒体 URL 的解析器                           |
| `api.registerMcpServerConnectionResolver(...)`  | 针对静态服务器名称、按请求方区分的 MCP 传输（`url`/`headers`） |
| `api.registerTextTransforms(transforms)`        | 由插件拥有的提示词/消息兼容性文本重写                |
| `api.registerConfigMigration(migrate)`          | 在插件运行时加载前执行的轻量级配置迁移           |
| `api.registerMigrationProvider(provider)`       | `openclaw migrate` 的导入器                                        |
| `api.registerAutoEnableProbe(probe)`            | 可自动启用此插件的配置探测器                          |
| `api.registerReload(registration)`              | 用于重载处理的重启/热重载/空操作配置前缀策略              |
| `api.registerNodeHostCommand(command)`          | 公开给配对节点的命令处理器                                |
| `api.registerNodeInvokePolicy(policy)`          | 节点调用命令的允许列表/审批策略                    |
| `api.registerSecurityAuditCollector(collector)` | `openclaw security audit` 的问题收集器                       |

#### 按请求方作用域划分的 MCP 连接

将 MCP 服务器的**身份**保持静态（名称、工具过滤器），放在 `mcp.servers` 或 bundle manifest 中。也可以选择注册一个连接解析器，让每个受信任的消息请求方都获得自己的传输：

```ts
api.registerMcpServerConnectionResolver({
  serverName: "user-email",
  resolve: async (ctx) => {
    // ctx.requesterSenderId 由宿主信任；绝不要在这里捏造发送方身份。
    const token = await lookupUserToken(ctx.requesterSenderId);
    if (!token) {
      return null; // 在当前运行中省略此服务器
    }
    return {
      url: "https://mcp.example.com/email",
      headers: { Authorization: `Bearer ${token}` },
    };
  },
});
```

契约说明：

- 解析器上下文只携带受信任的宿主身份（`requesterSenderId`、
  可选的 `agentAccountId` / `messageChannel`）。未来受信任字段（例如
  cron/子代理用户上下文）可以以追加方式加入。
- 一个插件只能拥有一个服务器名称：来自另一个插件、针对相同
  `serverName` 的重复 `registerMcpServerConnectionResolver` 会被以错误诊断拒绝
  （首次注册者获胜），因此连接所有权永远不依赖插件加载顺序。
- 工具名称由完整声明的服务器集合派生，因此部分解析绝不会在不同请求方或轮次之间改变安全的服务器名称。Core 不会验证不同请求方端点是否提供完全相同的工具 schema；解析器必须让每个请求方指向同一个逻辑服务，否则工具 schema（以及提示缓存稳定性）会按请求方发生分歧。
- 在没有受信任的 `requesterSenderId` 的运行中（cron、子代理、心跳、公共网关），永远不会实例化按请求方作用域划分的服务器。不存在共享的回退连接。
- `resolve` 对每个服务器的执行上限为 10 秒；超时或抛错会在本次运行中省略该服务器，而不会使静态 MCP 失败。
- 已解析的连接对每个请求方最多每 5 分钟重新校验一次：轮换会用新凭据重建传输，而 `null` 结果会撤销它（即使在会话中途，缓存的运行时也会被释放）。因此，已撤销或已轮换的凭据最多可能继续使用 5 分钟。
- 已解析的 `headers` 绝不会被记录或持久化；core 只保留一个短暂的、仅进程内的键控摘要（进程本地 HMAC）来检测凭据轮换，并将已解析的 header/URL 凭据值注册到日志/调试捕获脱敏注册表中。
- 按请求方作用域划分的服务器不会生成 MCP App 视图：视图的生命周期会超出经过请求方认证的运行，而且网关视图边界没有请求方身份，因此这些服务器的 app 预览会保持 fail-closed。工具结果不受影响。
- 没有解析器的静态服务器会保留现有的会话作用域生命周期。
- **Harness 传递规则：** 按请求方作用域划分的服务器绝不会进入 harness 原生 MCP 客户端配置（Codex 线程 `mcp_servers`、CLI `-c mcp_servers=…`，或任何其他会话共享的 MCP 投影）。harness 会将它们作为运行作用域工具传递：
  - 嵌入式运行器：会话 MCP 运行时 + bundle 工具（静态 + 作用域）。
  - Codex 应用服务器：通过 `materializeRequesterScopedMcpToolsForHarnessRun` 提供动态工具（仅作用域；静态服务器仍留在 Codex 的原生 MCP 客户端中）。
- 作用域工具的**规范**在该会话中首次成功解析后保持会话稳定，因此共享线程 harness（Codex）不会因为发送方变化而切换线程。在任何请求方解析之前，不会公布作用域规范。
- 共享线程 harness 上的未认证请求方仍会看到已公布的作用域工具；调用其中任意一个都会针对该请求方返回一个干净的未连接工具错误。OpenClaw 永远不会回退到其他请求方的凭据。

Memory prompt supplement 构建器会接收可选的 `agentId`、`agentSessionKey` 和 `sandboxed` 上下文。Memory corpus supplement 的 `search` 和 `get` 调用会接收可选的 `agentId` 和 `sandboxed` 上下文。拥有代理所有存储的插件应当在每次调用时解析该存储，而不是在注册期间捕获某个全局路径。如果在多代理操作中需要 agent id 但未提供，应当直接失败并关闭，而不是选择任意一个代理。

Telegram 交互式处理器在处理成功后可以返回 `{ submitText }`，以便将文本通过 Telegram 的正常入站代理路径进行路由。若入站策略跳过该文本或处理失败，OpenClaw 会保留回调按钮，因此用户可以在阻止条件变化后重试。这个结果字段是 Telegram 特有的；其他渠道会保留各自的交互结果契约。

### 工作流插件的宿主钩子

宿主钩子是面向需要参与宿主
生命周期的插件的 SDK 接口，而不仅仅是添加提供方、渠道或工具。它们是
通用契约；Plan Mode 可以使用它们，审批工作流、
工作区策略门禁、后台监视器、安装向导以及 UI 伴随插件也都可以使用。

| 方法                                                                               | 它所拥有的契约                                                                                                                                           |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api.session.state.registerSessionExtension(...)`                                    | 由插件拥有、与 JSON 兼容的会话状态，通过 Gateway 会话进行投影                                                                             |
| `api.session.workflow.enqueueNextTurnInjection(...)`                                 | 持久化、严格一次的上下文注入到某个会话的下一次 agent 回合中                                                                             |
| `api.registerTrustedToolPolicy(...)`                                                 | 由清单门控的受信任、预插件的工具策略，可阻止或重写工具参数                                                                        |
| `api.registerToolMetadata(...)`                                                      | 工具目录展示元数据，不改变工具实现                                                                                     |
| `api.registerCommand(...)`                                                           | 作用域化的插件命令；命令结果可以设置 `continueAgent: true` 或 `suppressReply: true`；Discord 原生命令支持 `descriptionLocalizations` |
| `api.session.controls.registerControlUiDescriptor(...)`                              | 面向会话、工具、运行、设置或标签页界面的 Control UI 贡献描述符                                                                      |
| `api.lifecycle.registerRuntimeLifecycle(...)`                                        | 在重置/删除/重载路径上，为插件拥有的运行时资源提供清理回调                                                                          |
| `api.agent.events.registerAgentEventSubscription(...)`                               | 用于工作流状态和监视器的已净化事件订阅                                                                                              |
| `api.runContext.setRunContext(...)` / `getRunContext(...)` / `clearRunContext(...)`  | 每次运行的插件临时状态，在终止性的运行生命周期上清除                                                                                             |
| `api.session.workflow.registerSessionSchedulerJob(...)`                              | 插件拥有的调度器作业的清理元数据；不会调度工作或创建任务记录                                                            |
| `api.session.workflow.sendSessionAttachment(...)`                                    | 仅限捆绑包的、由宿主中介的文件附件投递到活动的直接外发会话路由                                                            |
| `api.session.workflow.scheduleSessionTurn(...)` / `unscheduleSessionTurnsByTag(...)` | 仅限捆绑包的、基于 Cron 的已调度会话回合，以及基于标签的清理                                                                                    |
| `api.session.controls.registerSessionAction(...)`                                    | 客户端可通过 Gateway 分发的类型化会话动作                                                                                             |

`surface: "tab"` 描述符会向 Control UI 添加一个侧边栏标签页。活动
插件的标签页描述符会在 gateway
hello（`controlUiTabs`）中向 dashboard 客户端通告，因此该标签页仅在插件启用时出现。
捆绑插件可以为其标签页提供一流的 dashboard 视图；其他
插件可以将 `path` 设置为一个插件 HTTP 路由（参见
`api.registerHttpRoute(...)`），由 dashboard 在沙箱化框架中渲染。
`icon` 是 dashboard 图标名称提示，`group` 选择侧边栏分区
（`control` 或 `agent`），`order` 用于在插件标签页之间排序，而 `requiredScopes`
会将缺少这些操作员作用域的连接隐藏该标签页：

```typescript
api.session.controls.registerControlUiDescriptor({
  surface: "tab",
  id: "logbook",
  label: "日志簿",
  description: "你的一天时间线，由屏幕截图构建而成。",
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

现有插件仍可使用等价的平面方法作为已弃用的兼容别名。不要添加新插件代码直接调用
`api.registerSessionExtension`、`api.enqueueNextTurnInjection`、
`api.registerControlUiDescriptor`、`api.registerRuntimeLifecycle`、
`api.registerAgentEventSubscription`、`api.emitAgentEvent`、
`api.setRunContext`、`api.getRunContext`、`api.clearRunContext`、
`api.registerSessionSchedulerJob`、`api.registerSessionAction`、
`api.sendSessionAttachment`、`api.scheduleSessionTurn` 或
`api.unscheduleSessionTurnsByTag`。

`scheduleSessionTurn(...)` 是在 Gateway
Cron 调度器之上的会话作用域便捷封装。Cron 负责时序，并在回合运行时创建后台任务记录；Plugin SDK 仅约束目标会话、插件拥有的
命名和清理。当工作本身需要持久化的多步骤 Task Flow 状态时，请在计划中的
回合内使用 `api.runtime.tasks.managedFlows`。

这些契约刻意分离了权限：

- 外部插件可以拥有会话扩展、UI 描述符、命令、工具
  元数据、下一回合注入以及普通钩子。
- 受信任的工具策略在普通 `before_tool_call` 钩子之前运行，并且是宿主受信任的。捆绑策略最先运行；已安装插件策略需要显式启用，并且其本地 id 需要出现在
  `contracts.trustedToolPolicies` 中，然后才会按插件加载顺序运行。策略 id 的作用域限定为注册它的插件。
- 保留命令的所有权仅限捆绑包。外部插件应使用其
  自己的命令名称或别名。
- `allowPromptInjection=false` 会禁用会改变提示词的钩子，包括
  `agent_turn_prepare`、`before_prompt_build`、`heartbeat_prompt_contribution`、
  旧版 `before_agent_start` 中的提示词字段，以及
  `enqueueNextTurnInjection`。

非 Plan 消费者的示例：

| 插件类型             | 使用的钩子                                                                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 审批工作流            | 会话扩展、命令续接、下一回合注入、UI 描述符                                                            |
| 预算/工作区策略门禁 | 受信任的工具策略、工具元数据、会话投影                                                                                 |
| 后台生命周期监视器 | 运行时生命周期清理、agent 事件订阅、会话调度器所有权/清理、heartbeat 提示词贡献、UI 描述符 |
| 安装或引导向导   | 会话扩展、作用域命令、Control UI 描述符                                                                              |

<Note>
  保留的核心管理命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、
  `update.*`）始终保持 `operator.admin`，即使插件尝试分配更窄的
  Gateway 方法作用域。优先为插件拥有的方法使用插件特定前缀。
</Note>

<Accordion title="何时使用 tool-result 中间件">
  捆绑插件以及显式启用、且清单契约匹配的已安装插件，在需要于执行后、运行时将结果回传给模型之前重写工具结果时，可以使用 `api.registerAgentToolResultMiddleware(...)`。这是用于 tokenjuice 等异步输出归约器的受信任、与运行时无关的接缝。

插件必须针对每个目标运行时声明 `contracts.agentToolResultMiddleware`，例如 `["openclaw", "codex"]`。没有该契约或未显式启用的已安装插件不能注册此中间件；对于不需要在模型前进行工具结果时序控制的工作，请保留使用普通 OpenClaw 插件钩子。旧的仅嵌入式运行器扩展工厂注册路径已被移除。
</Accordion>

### Gateway 发现注册

`api.registerGatewayDiscoveryService(...)` 允许插件通过本地发现传输（例如 mDNS/Bonjour）公告活动中的
Gateway。OpenClaw 会在启用本地发现时于 Gateway 启动期间调用该
服务，传入当前 Gateway 端口和非机密的 TXT 提示数据，并在 Gateway 关闭期间调用返回的
`stop` 处理器。

```typescript
api.registerGatewayDiscoveryService({
  id: "my-discovery",
  async advertise(ctx) {
    const handle = await startMyAdvertiser({
      gatewayPort: ctx.gatewayPort,
      tls: ctx.gatewayTlsEnabled,
      displayName: ctx.machineDisplayName,
    });
    return { stop: () => handle.stop() };
  },
});
```

Gateway 发现插件不得将公开的 TXT 值视为秘密或
认证。发现只是路由提示；Gateway 认证和 TLS pinning 仍然
拥有信任控制权。

### CLI 注册元数据

`api.registerCli(registrar, opts?)` 接受两类命令元数据：

- `commands`：由 registrar 拥有的显式命令名称
- `descriptors`：用于 CLI 帮助、路由和惰性插件 CLI 注册的解析时命令描述符
- `parentPath`：用于嵌套命令组的可选父命令路径，例如
  `["nodes"]`

对于成对节点功能，优先使用
`api.registerNodeCliFeature(registrar, opts?)`。它是
`api.registerCli(..., { parentPath: ["nodes"] })` 的一个小包装，并使诸如
`openclaw nodes canvas` 这样的命令成为明确的插件拥有节点功能。

如果你希望插件命令在常规根 CLI 路径中保持惰性加载，
请提供覆盖该 registrar 暴露的每个顶层命令根的 `descriptors`。

```typescript
api.registerCli(
  async ({ program }) => {
    const { registerMatrixCli } = await import("./src/cli.js");
    registerMatrixCli({ program });
  },
  {
    descriptors: [
      {
        name: "matrix",
        description: "管理 Matrix 账户、验证、设备和资料状态",
        hasSubcommands: true,
      },
    ],
  },
);
```

嵌套命令会将解析后的父命令作为 `program` 传入：

```typescript
api.registerCli(
  async ({ program }) => {
    const { registerNodesCanvasCommands } = await import("./src/cli.js");
    registerNodesCanvasCommands(program);
  },
  {
    parentPath: ["nodes"],
    descriptors: [
      {
        name: "canvas",
        description: "从配对节点捕获或渲染画布内容",
        hasSubcommands: true,
      },
    ],
  },
);
```

仅当你不需要惰性根 CLI 注册时，才单独使用 `commands`。
该急切兼容路径仍受支持，但它不会为解析时惰性加载安装基于
描述符的占位符。

### CLI 后端注册

`api.registerCliBackend(...)` 允许插件拥有本地
AI CLI 后端（例如 `claude-cli` 或 `my-cli`）的默认配置。

- 后端 `id` 会成为模型引用中的提供者前缀，例如 `my-cli/gpt-5`。
- 后端 `config` 使用与 `agents.defaults.cliBackends.<id>` 相同的结构。
- 用户配置仍然优先。OpenClaw 会在运行 CLI 之前，将 `agents.defaults.cliBackends.<id>` 与插件默认值合并。
- 当后端在合并后需要进行兼容性重写时，请使用 `normalizeConfig`
  （例如规范化旧的标志位结构）。
- 对于属于 CLI 方言的、按请求作用域生效的 argv 重写，请使用 `resolveExecutionArgs`，
  例如将 OpenClaw 的思考级别映射为原生的努力度标志。该钩子会接收 `ctx.executionMode`；
  当值为 `"side-question"` 时，用于为临时的 `/btw` 调用添加后端原生的隔离标志。
  如果这些标志能够可靠地为一个原本始终开启工具的 CLI 禁用原生工具，也请将
  `sideQuestionToolMode` 声明为 `"disabled"`。
- 当后端需要拥有自己的启动环境或临时的认证/配置桥接时，请使用 `prepareExecution`。
  其中的 `ctx.contextTokenBudget` 是本次运行所选定的有效 token 上限，因此支持原生压缩的后端
  可以据此对齐自己的阈值，而不需要依赖 provider-specific 的核心分支。
- 能够为特定运行禁用所有原生工具的后端，可以声明 `nativeToolMode: "selectable"`。
  受限调用会传入一个空的 `ctx.toolAvailability.native` 元组，以及一份精确的、宿主隔离的 MCP 允许列表；
  `resolveExecutionArgs` 必须在最终全新的或恢复的 argv 中同时强制执行这两者。
  如果后端无法做到这一点，OpenClaw 会以失败关闭。

有关端到端编写指南，请参见
[CLI backend plugins](/plugins/cli-backend-plugins)。

### 独占槽位

| 方法                                     | 注册内容                                                                                                                                                                                  |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api.registerContextEngine(id, factory)`   | 上下文引擎（一次仅可有一个处于活动状态）。当宿主能够提供模型/提供方/模式诊断时，生命周期回调会收到 `runtimeSettings`；旧的严格引擎会在没有该键的情况下重试。 |
| `api.registerMemoryCapability(capability)` | 统一的内存能力                                                                                                                                                                          |
| `api.registerMemoryPromptSection(builder)` | 内存提示词部分构建器                                                                                                                                                                      |
| `api.registerMemoryFlushPlan(resolver)`    | 内存清空计划解析器                                                                                                                                                                         |
| `api.registerMemoryRuntime(runtime)`       | 内存运行时适配器                                                                                                                                                                             |

### 已弃用的 memory embedding 适配器

| 方法                                         | 注册内容                              |
| ---------------------------------------------- | ---------------------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | 当前插件的内存嵌入适配器 |

- `registerMemoryCapability` 是首选的独占内存插件 API。
- `registerMemoryCapability` 还可以暴露 `publicArtifacts.listArtifacts(...)`
  以便伴随插件通过 `openclaw/plugin-sdk/memory-host-core` 消费导出的内存工件，而无需深入某个特定内存插件的私有布局。
- `registerMemoryPromptSection`、`registerMemoryFlushPlan` 和
  `registerMemoryRuntime` 是与旧版兼容的独占内存插件 API。
- `MemoryFlushPlan.model` 可以将清空回合固定为一个精确的 `provider/model`
  引用，例如 `ollama/qwen3:8b`，而不会继承当前的回退链。
- `registerMemoryEmbeddingProvider` 已弃用。新的 embedding 提供方
  应使用 `api.registerEmbeddingProvider(...)` 和
  `contracts.embeddingProviders`。
- 现有的内存专用提供方在迁移窗口期间仍可继续工作，但插件检查会将其报告为
  非捆绑插件的兼容性债务。

### 事件和生命周期

| 方法                                       | 功能                  |
| -------------------------------------------- | ----------------------------- |
| `api.on(hookName, handler, opts?)`           | 类型化生命周期钩子          |
| `api.onConversationBindingResolved(handler)` | 会话绑定回调 |

示例、常见钩子名称和守卫
语义请参见 [插件钩子](/plugins/hooks)。

### 钩子决策语义

`before_install` 是插件运行时生命周期钩子，而不是 operator 安装
策略面。当允许/阻止决策必须覆盖 CLI 和由 Gateway 支持的安装或更新路径时，请使用 `security.installPolicy`。

- `before_tool_call`: 返回 `{ block: true }` 是终结性的。一旦任何处理器设置了它，低优先级处理器就会被跳过。
- `before_tool_call`: 返回 `{ block: false }` 会被视为没有决策（与省略 `block` 相同），而不是覆盖。
- `before_install`: 返回 `{ block: true }` 是终结性的。一旦任何处理器设置了它，低优先级处理器就会被跳过。
- `before_install`: 返回 `{ block: false }` 会被视为没有决策（与省略 `block` 相同），而不是覆盖。
- `reply_dispatch`: 返回 `{ handled: true, ... }` 是终结性的。一旦任何处理器声明接管分发，低优先级处理器和默认模型分发路径都会被跳过。
- `message_sending`: 返回 `{ cancel: true }` 是终结性的。一旦任何处理器设置了它，低优先级处理器就会被跳过。
- `message_sending`: 返回 `{ cancel: false }` 会被视为没有决策（与省略 `cancel` 相同），而不是覆盖。
- `message_received`: 当你需要入站线程/主题路由时，请使用带类型的 `threadId` 字段。将 `metadata` 保留给特定通道的额外信息。
- `message_sending`: 在回退到通道特定的 `metadata` 之前，请先使用带类型的 `replyToId` / `threadId` 路由字段。
- `gateway_start`: 请使用 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()` 来获取 Gateway 拥有的启动状态，而不是依赖内部的 `gateway:startup` 钩子。此时 Cron 可能仍在加载中。
- `cron_reconciled`: 在启动或调度器重新加载后，重建完整的外部 cron 投影。它包含 `reason` 和有效的 `enabled` 状态，包括 `enabled: false`，而 `ctx.getCron?.()` 返回的是精确对齐后的调度器。将 `ctx.abortSignal` 传入持久化投影工作；当该调度器快照被替换或 Gateway 关闭时，它会中止。
- `cron_changed`: 观察 Gateway 拥有的 cron 生命周期变化。`scheduled` 和 `removed` 事件是提交后的对账提示，而不是有序的增量日志。scheduled 事件的 `event.nextRunAtMs` 在任务没有下次唤醒时会缺失；removed 事件仍然携带已删除任务的快照。

外部唤醒调度器应对 `cron_changed` 事件进行去抖或合并，
然后从 `cron_reconciled` 最后捕获的调度器中重新读取完整的持久视图。不要从 `cron_changed` 上下文中采用调度器：来自较旧调度器的分离提示可能会与后续重新加载重叠。

将 `cron_reconciled` 作为在 Gateway 启动或调度器替换时加载的持久状态的完整快照触发器。它不会在仅插件热重载时重新播放。观察处理器并行运行，且即发即忘的分发可能重叠，因此消费者不能依赖事件完成顺序。请将 OpenClaw 作为到期检查和执行的事实来源。

关于具有持久替换、重试/退避以及干净关闭的单飞适配器，请参见 [安全的外部 cron 投影](/plugins/hooks#safe-external-cron-projection)。

### API 对象字段

| 字段                    | 类型                      | 说明                                                                                 |
| ------------------------ | ------------------------- | ------------------------------------------------------------------------------------------- |
| `api.id`                 | `string`                  | 插件 ID                                                                                   |
| `api.name`               | `string`                  | 显示名称                                                                                |
| `api.version`            | `string?`                 | 插件版本（可选）                                                                   |
| `api.description`        | `string?`                 | 插件描述（可选）                                                               |
| `api.source`             | `string`                  | 插件源路径                                                                          |
| `api.rootDir`            | `string?`                 | 插件根目录（可选）                                                            |
| `api.config`             | `OpenClawConfig`          | 当前配置快照（在可用时为当前内存中的运行时 snapshot）                  |
| `api.pluginConfig`       | `Record<string, unknown>` | 来自 `plugins.entries.<id>.config` 的插件特定配置                                   |
| `api.runtime`            | `PluginRuntime`           | [运行时辅助函数](/plugins/sdk-runtime)                                                     |
| `api.logger`            | `PluginLogger`            | 作用域日志器（`debug`、`info`、`warn`、`error`）                                            |
| `api.registrationMode`   | `PluginRegistrationMode`  | 当前加载模式；`"setup-runtime"` 是轻量级、在完整入口启动/设置之前的窗口 |
| `api.resolvePath(input)` | `(string) => string`      | 相对于插件根目录解析路径                                                        |

## 内部模块约定

在你的插件中，内部导入请使用本地 barrel 文件：

```text
my-plugin/
  api.ts            # 面向外部使用者的公开导出
  runtime-api.ts    # 仅供内部使用的运行时导出
  index.ts          # 插件入口点
  setup-entry.ts    # 轻量级的仅设置入口点（可选）
```

<Warning>
  不要在生产代码中通过 `openclaw/plugin-sdk/<your-plugin>` 导入你自己的插件
  内部导入应通过 `./api.ts` 或
  `./runtime-api.ts` 进行路由。SDK 路径只是一个外部契约。
</Warning>

对于对已加载外观可见的打包插件公开面（`api.ts`、`runtime-api.ts`、
`index.ts`、`setup-entry.ts` 以及类似的公共入口文件），当 OpenClaw 已经运行时，
优先使用当前运行时配置快照。如果还没有运行时快照，则回退到磁盘上已解析的配置文件。
打包后的插件外观应通过 OpenClaw 的插件外观加载器加载；直接从 `dist/extensions/...` 导入会绕过清单和运行时 sidecar 检查，而这些检查会在插件自身代码的打包安装中使用。

提供方插件可以暴露一个较窄、仅限插件本地的契约 barrel，当某个 helper 明确只适用于该提供方，并且尚未成为通用 SDK 子路径的一部分时。
打包示例：

- **Anthropic**: `api.ts` / `contract-api.ts` 接口用于 Claude，
  适用于 beta-header 和 `service_tier` 流式处理 helper。
- **`@openclaw/openai-provider`**: `api.ts` 导出 provider 构建器、
  默认模型 helper，以及 live provider 构建器。
- **`@openclaw/openrouter-provider`**: `api.ts` 导出 provider 构建器
  以及 bootstrap/配置 helper。

<Warning>
  扩展的生产代码也应避免 `openclaw/plugin-sdk/<other-plugin>`
  导入。如果某个 helper 确实是共享的，请将其提升到一个中性的 SDK 子路径，
  例如 `openclaw/plugin-sdk/speech`、`.../provider-model-shared`，或其他面向能力的表面，
  而不是将两个插件耦合在一起。
</Warning>

## 相关内容

<CardGroup cols={2}>
  <Card title="入口点" icon="door-open" href="/plugins/sdk-entrypoints">
    `definePluginEntry` 和 `defineChannelPluginEntry` 选项。
  </Card>
  <Card title="运行时助手" icon="gears" href="/plugins/sdk-runtime">
    `api.runtime` 命名空间完整参考。
  </Card>
  <Card title="设置和配置" icon="sliders" href="/plugins/sdk-setup">
    打包、清单和配置模式。
  </Card>
  <Card title="测试" icon="vial" href="/plugins/sdk-testing">
    测试工具和 lint 规则。
  </Card>
  <Card title="SDK 迁移" icon="arrows-turn-right" href="/plugins/sdk-migration">
    从已弃用的表面迁移。
  </Card>
  <Card title="插件内部" icon="diagram-project" href="/plugins/architecture">
    深入的架构和能力模型。
  </Card>
</CardGroup>
