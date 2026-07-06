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
Looking for a how-to guide instead? Start with [Building plugins](/plugins/building-plugins). Use [Channel plugins](/plugins/sdk-channel-plugins) for channels, [Provider plugins](/plugins/sdk-provider-plugins) for model providers, [CLI backend plugins](/plugins/cli-backend-plugins) for local AI CLI backends, [Agent harness plugins](/plugins/sdk-agent-harness) for native agent executors, and [Plugin hooks](/plugins/hooks) for tool or lifecycle hooks.
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

| Method                                           | What it registers                                                                 |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `api.registerProvider(...)`                      | Text inference (LLM)                                                              |
| `api.registerModelCatalogProvider(...)`          | Model catalog rows for text and media generation                                  |
| `api.registerAgentHarness(...)`                  | [Experimental](/plugins/sdk-agent-harness) native agent executor (Codex, Copilot) |
| `api.registerCliBackend(...)`                    | Local CLI inference backend                                                       |
| `api.registerChannel(...)`                       | Messaging channel                                                                 |
| `api.registerEmbeddingProvider(...)`             | Reusable vector embedding provider                                                |
| `api.registerSpeechProvider(...)`                | Text-to-speech / STT synthesis                                                    |
| `api.registerRealtimeTranscriptionProvider(...)` | Streaming realtime transcription                                                  |
| `api.registerRealtimeVoiceProvider(...)`         | Duplex realtime voice sessions                                                    |
| `api.registerMediaUnderstandingProvider(...)`    | Image/audio/video analysis                                                        |
| `api.registerTranscriptSourceProvider(...)`      | Live or imported meeting transcript source                                        |
| `api.registerImageGenerationProvider(...)`       | Image generation                                                                  |
| `api.registerMusicGenerationProvider(...)`       | Music generation                                                                  |
| `api.registerVideoGenerationProvider(...)`       | Video generation                                                                  |
| `api.registerWebFetchProvider(...)`              | Web fetch / scrape provider                                                       |
| `api.registerWebSearchProvider(...)`             | Web search                                                                        |
| `api.registerCompactionProvider(...)`            | Pluggable transcript-compaction backend                                           |

通过 `api.registerEmbeddingProvider(...)` 注册的 Embedding 提供方也必须列在插件清单的 `contracts.embeddingProviders` 中。这是用于可复用向量生成的通用 embedding 能力面。内存搜索可以消费这个通用提供方能力面。较旧的 `api.registerMemoryEmbeddingProvider(...)` 和 `contracts.memoryEmbeddingProviders` 接缝属于已弃用的兼容路径，供现有的内存专用提供方迁移使用。

Memory-specific providers that still expose a runtime `batchEmbed(...)` stay on
the existing per-file batching contract unless their runtime explicitly sets
`sourceWideBatchEmbed: true`. That opt-in lets the memory host submit chunks from
multiple dirty memory files and enabled sources in one `batchEmbed(...)` call up
to the host batch limits. Batch adapters that upload JSONL request files must
split provider jobs before their upload-size cap as well as their request-count
cap. The provider must return one embedding per input chunk in the same order as
`batch.chunks`; omit the flag when the provider expects file-local batches or
cannot preserve input ordering across a larger source-wide job.

### Tools and commands

对固定工具名称的简单仅工具插件，请使用 [`defineToolPlugin`](/plugins/tool-plugins)。
对于混合插件或完全动态的工具注册，请直接使用 `api.registerTool(...)`。

| 方法                          | 注册内容                             |
| ------------------------------- | --------------------------------------------- |
| `api.registerTool(tool, opts?)` | Agent 工具（必需或 `{ optional: true }`） |
| `api.registerCommand(def)`      | 自定义命令（绕过 LLM）             |

当 agent 需要一个简短的、由命令拥有的路由提示时，插件命令可以设置 `agentPromptGuidance`。该文本应仅与命令本身相关；不要将提供方或插件特定策略加入核心提示构建器中。

Guidance entries may be legacy strings, which apply to every prompt surface, or
structured entries:

```ts
agentPromptGuidance: [
  "全局命令提示。",
  { text: "Only show this in the main OpenClaw prompt.", surfaces: ["openclaw_main"] },
];
```

Structured `surfaces` may include `openclaw_main`, `codex_app_server`,
`cli_backend`, `acp_backend`, or `subagent`. `pi_main` remains a deprecated alias
for `openclaw_main`. Omit `surfaces` for intentional all-surface guidance. Do
not pass an empty `surfaces` array; it is rejected so accidental scope loss does
not become global prompt text.

Native Codex app-server developer instructions are stricter than other prompt
surfaces: only guidance explicitly scoped to `codex_app_server` is promoted into
that higher-priority lane. Legacy string guidance and unscoped structured
guidance remain available to non-Codex prompt surfaces for compatibility.

### Infrastructure

| Method                                          | What it registers                                            |
| ----------------------------------------------- | ------------------------------------------------------------ |
| `api.registerHook(events, handler, opts?)`      | Event hook                                                   |
| `api.registerHttpRoute(params)`                 | Gateway HTTP endpoint                                        |
| `api.registerGatewayMethod(name, handler)`      | Gateway RPC method                                           |
| `api.registerGatewayDiscoveryService(service)`  | Local Gateway discovery advertiser                           |
| `api.registerCli(registrar, opts?)`             | CLI subcommand                                               |
| `api.registerNodeCliFeature(registrar, opts?)`  | Node feature CLI under `openclaw nodes`                      |
| `api.registerService(service)`                  | Background service                                           |
| `api.registerInteractiveHandler(registration)`  | Interactive handler                                          |
| `api.registerAgentToolResultMiddleware(...)`    | Runtime tool-result middleware                               |
| `api.registerMemoryPromptSupplement(builder)`   | Additive memory-adjacent prompt section                      |
| `api.registerMemoryCorpusSupplement(adapter)`   | Additive memory search/read corpus                           |
| `api.registerHostedMediaResolver(resolver)`     | Resolver for browser-style hosted media URLs                 |
| `api.registerTextTransforms(transforms)`        | Plugin-owned prompt/message compatibility text rewrites      |
| `api.registerConfigMigration(migrate)`          | Lightweight config migration run before plugin runtime loads |
| `api.registerMigrationProvider(provider)`       | Importer for `openclaw migrate`                              |
| `api.registerAutoEnableProbe(probe)`            | Config probe that can auto-enable this plugin                |
| `api.registerReload(registration)`              | Restart/hot/noop config-prefix policy for reload handling    |
| `api.registerNodeHostCommand(command)`          | Command handler exposed to paired nodes                      |
| `api.registerNodeInvokePolicy(policy)`          | Allowlist/approval policy for node-invoked commands          |
| `api.registerSecurityAuditCollector(collector)` | Findings collector for `openclaw security audit`             |

### 工作流插件的宿主钩子

宿主钩子是面向需要参与宿主
生命周期的插件的 SDK 接口，而不仅仅是添加提供方、渠道或工具。它们是
通用契约；Plan Mode 可以使用它们，审批工作流、
工作区策略门禁、后台监视器、安装向导以及 UI 伴随插件也都可以使用。

| Method                                                                               | Contract it owns                                                                                                                                           |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api.session.state.registerSessionExtension(...)`                                    | Plugin-owned, JSON-compatible session state projected through Gateway sessions                                                                             |
| `api.session.workflow.enqueueNextTurnInjection(...)`                                 | Durable exactly-once context injected into the next agent turn for one session                                                                             |
| `api.registerTrustedToolPolicy(...)`                                                 | Manifest-gated trusted pre-plugin tool policy that can block or rewrite tool params                                                                        |
| `api.registerToolMetadata(...)`                                                      | Tool catalog display metadata without changing the tool implementation                                                                                     |
| `api.registerCommand(...)`                                                           | Scoped plugin commands; command results can set `continueAgent: true` or `suppressReply: true`; Discord native commands support `descriptionLocalizations` |
| `api.session.controls.registerControlUiDescriptor(...)`                              | Control UI contribution descriptors for session, tool, run, settings, or tab surfaces                                                                      |
| `api.lifecycle.registerRuntimeLifecycle(...)`                                        | Cleanup callbacks for plugin-owned runtime resources on reset/delete/reload paths                                                                          |
| `api.agent.events.registerAgentEventSubscription(...)`                               | Sanitized event subscriptions for workflow state and monitors                                                                                              |
| `api.runContext.setRunContext(...)` / `getRunContext(...)` / `clearRunContext(...)`  | Per-run plugin scratch state cleared on terminal run lifecycle                                                                                             |
| `api.session.workflow.registerSessionSchedulerJob(...)`                              | Cleanup metadata for plugin-owned scheduler jobs; does not schedule work or create task records                                                            |
| `api.session.workflow.sendSessionAttachment(...)`                                    | Bundled-only host-mediated file attachment delivery to the active direct-outbound session route                                                            |
| `api.session.workflow.scheduleSessionTurn(...)` / `unscheduleSessionTurnsByTag(...)` | Bundled-only Cron-backed scheduled session turns plus tag-based cleanup                                                                                    |
| `api.session.controls.registerSessionAction(...)`                                    | Typed session actions clients can dispatch through the Gateway                                                                                             |

A `surface: "tab"` descriptor adds a sidebar tab to the Control UI. Active
plugins' tab descriptors are advertised to dashboard clients in the gateway
hello (`controlUiTabs`), so the tab appears only while the plugin is enabled.
Bundled plugins may ship a first-class dashboard view for their tab; other
plugins can set `path` to a plugin HTTP route (see
`api.registerHttpRoute(...)`) that the dashboard renders in a sandboxed frame.
`icon` is a dashboard icon name hint, `group` picks the sidebar section
(`control` or `agent`), `order` sorts among plugin tabs, and `requiredScopes`
hides the tab from connections lacking those operator scopes:

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

- External plugins can own session extensions, UI descriptors, commands, tool
  metadata, next-turn injections, and normal hooks.
- Trusted tool policies run before ordinary `before_tool_call` hooks and are
  host-trusted. Bundled policies run first; installed-plugin policies require
  explicit enablement plus their local ids in
  `contracts.trustedToolPolicies`, and run next in plugin-load order. Policy ids
  are scoped to the registering plugin.
- Reserved command ownership is bundled-only. External plugins should use their
  own command names or aliases.
- `allowPromptInjection=false` disables prompt-mutating hooks including
  `agent_turn_prepare`, `before_prompt_build`, `heartbeat_prompt_contribution`,
  prompt fields from legacy `before_agent_start`, and
  `enqueueNextTurnInjection`.

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

- 后端 `id` 会成为诸如 `my-cli/gpt-5` 这样的模型引用中的提供方前缀。
- 后端 `config` 使用与 `agents.defaults.cliBackends.<id>` 相同的结构。
- 用户配置仍然优先。OpenClaw 在运行 CLI 之前，会将插件默认值之上的 `agents.defaults.cliBackends.<id>` 进行合并。
- 当后端在合并后需要兼容性重写时使用 `normalizeConfig`（例如规范化旧的标志形状）。
- 当需要属于 CLI 方言、且基于请求作用域的 argv 重写时使用 `resolveExecutionArgs`，例如将 OpenClaw 的思考等级映射为原生的 effort 标志。该钩子会接收 `ctx.executionMode`；对于临时 `/btw` 调用，请使用 `"side-question"` 来添加后端原生的隔离标志。如果这些标志能可靠地为原本始终开启的 CLI 禁用原生工具，也请声明 `sideQuestionToolMode: "disabled"`。

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

- `before_tool_call`：返回 `{ block: true }` 是终局性的。一旦任一处理器设置了它，低优先级处理器将被跳过。
- `before_tool_call`：返回 `{ block: false }` 会被视为没有决策（与省略 `block` 相同），而不是覆盖。
- `before_install`：返回 `{ block: true }` 是终局性的。一旦任一处理器设置了它，低优先级处理器将被跳过。
- `before_install`：返回 `{ block: false }` 会被视为没有决策（与省略 `block` 相同），而不是覆盖。
- `reply_dispatch`：返回 `{ handled: true, ... }` 是终局性的。一旦任一处理器声明处理分发，低优先级处理器和默认的模型分发路径都会被跳过。
- `message_sending`：返回 `{ cancel: true }` 是终局性的。一旦任一处理器设置了它，低优先级处理器将被跳过。
- `message_sending`：返回 `{ cancel: false }` 会被视为没有决策（与省略 `cancel` 相同），而不是覆盖。
- `message_received`：当你需要入站线程/主题路由时，请使用类型化的 `threadId` 字段。将 `metadata` 保留给渠道特定的额外信息。
- `message_sending`：在退回到渠道特定的 `metadata` 之前，请使用类型化的 `replyToId` / `threadId` 路由字段。
- `gateway_start`：使用 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()` 获取 Gateway 拥有的启动状态，而不是依赖内部的 `gateway:startup` 钩子。
- `cron_changed`：观察 Gateway 拥有的 cron 生命周期变化。在同步外部唤醒调度器时，请使用 `event.job?.state?.nextRunAtMs` 和 `ctx.getCron?.()`，并保持 OpenClaw 作为到期检查和执行的事实来源。

### API 对象字段

| 字段                    | 类型                      | 说明                                                                                 |
| ------------------------ | ------------------------- | ------------------------------------------------------------------------------------------- |
| `api.id`                 | `string`                  | 插件 id                                                                                   |
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
