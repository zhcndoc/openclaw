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
  此页面适用于在 OpenClaw 内部使用 `openclaw/plugin-sdk/*` 的插件作者。对于希望通过 Gateway 运行 agent 的外部应用、脚本、仪表盘、CI 作业和 IDE 扩展，请改用 [OpenClaw App SDK](/concepts/openclaw-sdk) 和 `@openclaw/sdk` 包。
</Note>

<Tip>
  想找的是操作指南而不是参考文档？请从 [Building plugins](/plugins/building-plugins) 开始；渠道插件请使用 [Channel plugins](/plugins/sdk-channel-plugins)；提供方插件请使用 [Provider plugins](/plugins/sdk-provider-plugins)；本地 AI CLI 后端请使用 [CLI backend plugins](/plugins/cli-backend-plugins)；工具或生命周期钩子插件请使用 [Plugin hooks](/plugins/hooks)。
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

| 方法                                           | 注册内容                     |
| ------------------------------------------------ | ------------------------------------- |
| `api.registerProvider(...)`                  | 文本推理（LLM）                  |
| `api.registerAgentHarness(...)`              | 实验性的底层 agent 执行器 |
| `api.registerCliBackend(...)`                | 本地 CLI 推理后端           |
| `api.registerChannel(...)`                   | 消息渠道                     |
| `api.registerSpeechProvider(...)`            | 文本转语音 / STT 合成        |
| `api.registerRealtimeTranscriptionProvider(...)` | 流式实时转写      |
| `api.registerRealtimeVoiceProvider(...)`         | 双向实时语音会话        |
| `api.registerMediaUnderstandingProvider(...)`    | 图像/音频/视频分析            |
| `api.registerImageGenerationProvider(...)`       | 图像生成                      |
| `api.registerMusicGenerationProvider(...)`       | 音乐生成                      |
| `api.registerVideoGenerationProvider(...)`       | 视频生成                      |
| `api.registerWebFetchProvider(...)`              | Web 抓取 / 抓取提供方           |
| `api.registerWebSearchProvider(...)`             | Web 搜索                            |

### 工具和命令

| 方法                          | 注册内容                             |
| ------------------------------- | --------------------------------------------- |
| `api.registerTool(tool, opts?)` | Agent 工具（必需或 `{ optional: true }`） |
| `api.registerCommand(def)`      | 自定义命令（绕过 LLM）             |

当 agent 需要一个简短的、由命令拥有的路由提示时，插件命令可以设置 `agentPromptGuidance`。该文本应仅与命令本身相关；不要将提供方或插件特定策略加入核心提示构建器中。

### 基础设施

| 方法                                         | 注册内容                       |
| ---------------------------------------------- | --------------------------------------- |
| `api.registerHook(events, handler, opts?)`     | Event hook                              |
| `api.registerHttpRoute(params)`                | Gateway HTTP 端点                   |
| `api.registerGatewayMethod(name, handler)`     | Gateway RPC 方法                      |
| `api.registerGatewayDiscoveryService(service)` | 本地 Gateway 发现广播器      |
| `api.registerCli(registrar, opts?)`            | CLI 子命令                          |
| `api.registerNodeCliFeature(registrar, opts?)` | `openclaw nodes` 下的 Node 功能 |
| `api.registerService(service)`                 | 后台服务                      |
| `api.registerInteractiveHandler(registration)` | 交互式处理器                     |
| `api.registerAgentToolResultMiddleware(...)`   | 运行时工具结果中间件          |
| `api.registerMemoryPromptSupplement(builder)`  | 额外的、与内存相邻的提示词部分 |
| `api.registerMemoryCorpusSupplement(adapter)`  | 额外的内存搜索/读取语料      |

### 工作流插件的宿主钩子

宿主钩子是面向需要参与宿主
生命周期的插件的 SDK 接口，而不仅仅是添加提供方、渠道或工具。它们是
通用契约；Plan Mode 可以使用它们，审批工作流、
工作区策略门禁、后台监视器、安装向导以及 UI 伴随插件也都可以使用。

| 方法                                                                               | 契约所有内容                                                                                                                  |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `api.session.state.registerSessionExtension(...)`                                    | 由插件拥有、与 JSON 兼容的会话状态，通过 Gateway 会话进行投影                                                    |
| `api.session.workflow.enqueueNextTurnInjection(...)`                                 | 持久化的、exactly-once 的上下文，注入到一个会话的下一次 agent 回合中                                                    |
| `api.registerTrustedToolPolicy(...)`                                                 | 捆绑/受信任的、插件前置的工具策略，可阻止或重写工具参数                                                      |
| `api.registerToolMetadata(...)`                                                      | 不改变工具实现的工具目录显示元数据                                                            |
| `api.registerCommand(...)`                                                           | 作用域化插件命令；命令结果可以设置 `continueAgent: true`；Discord 原生命令支持 `descriptionLocalizations` |
| `api.session.controls.registerControlUiDescriptor(...)`                              | 会话、工具、运行或设置界面的 Control UI 贡献描述符                                                  |
| `api.lifecycle.registerRuntimeLifecycle(...)`                                        | 用于插件拥有的运行时资源在重置/删除/重载路径上的清理回调                                                 |
| `api.agent.events.registerAgentEventSubscription(...)`                               | 用于工作流状态和监视器的已净化事件订阅                                                                     |
| `api.runContext.setRunContext(...)` / `getRunContext(...)` / `clearRunContext(...)`  | 每次运行的插件临时状态，在终止性运行生命周期中清除                                                                    |
| `api.session.workflow.registerSessionSchedulerJob(...)`                              | 插件拥有的调度器作业的清理元数据；不会调度工作或创建任务记录                                   |
| `api.session.workflow.sendSessionAttachment(...)`                                    | 仅捆绑插件可用的、由宿主中介的文件附件投递到活动的直接出站会话路由                                   |
| `api.session.workflow.scheduleSessionTurn(...)` / `unscheduleSessionTurnsByTag(...)` | 仅捆绑插件可用的、由 Cron 支持的计划会话回合以及基于标签的清理                                                           |
| `api.session.controls.registerSessionAction(...)`                                    | 类型化会话动作，客户端可以通过 Gateway 分发                                                                    |

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
- 受信任的工具策略在普通 `before_tool_call` 钩子之前运行，并且仅限捆绑插件，因为它们参与宿主安全策略。
- 保留命令所有权仅限捆绑插件。外部插件应使用它们
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

<Accordion title="何时使用工具结果中间件">
  捆绑插件在需要在工具执行后、运行时将该结果
  返回给模型之前重写工具结果时，可以使用 `api.registerAgentToolResultMiddleware(...)`。这是一种受信任的、与运行时无关的接口，适用于
  像 tokenjuice 这样的异步输出缩减器。

捆绑插件必须为每个目标运行时声明 `contracts.agentToolResultMiddleware`，例如 `["pi", "codex"]`。外部插件
不能注册此中间件；对于不需要在模型前调整工具结果时机的工作，请保留普通的 OpenClaw 插件钩子。旧的仅 Pi 可用的嵌入式扩展工厂注册路径已被移除。
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

- 后端 `id` 会成为模型引用中的提供方前缀，例如 `my-cli/gpt-5`。
- 后端 `config` 的形状与 `agents.defaults.cliBackends.<id>` 相同。
- 用户配置仍然优先。OpenClaw 会在运行 CLI 前，将 `agents.defaults.cliBackends.<id>` 叠加在插件默认值之上。
- 当后端在合并后需要兼容性重写时，请使用 `normalizeConfig`
  （例如规范化旧的标志形状）。
- 当需要属于 CLI 方言的、请求作用域的 argv 重写时，请使用 `resolveExecutionArgs`，
  例如将 OpenClaw 的思考级别映射到原生的 effort 标志。

有关端到端编写指南，请参见
[CLI backend plugins](/plugins/cli-backend-plugins)。

### 独占槽位

| 方法                                     | 注册内容                                                                                                                                         |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api.registerContextEngine(id, factory)`   | 上下文引擎（一次仅一个处于活动状态）。`assemble()` 回调会接收 `availableTools` 和 `citationsMode`，以便引擎可以定制提示词附加内容。 |
| `api.registerMemoryCapability(capability)` | 统一内存能力                                                                                                                                 |
| `api.registerMemoryPromptSection(builder)` | 内存提示词部分构建器                                                                                                                             |
| `api.registerMemoryFlushPlan(resolver)`    | 内存刷新计划解析器                                                                                                                                |
| `api.registerMemoryRuntime(runtime)`       | 内存运行时适配器                                                                                                                                    |

### 内存嵌入适配器

| 方法                                         | 注册内容                              |
| ---------------------------------------------- | ---------------------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | 当前插件的内存嵌入适配器 |

- `registerMemoryCapability` 是首选的独占内存插件 API。
- `registerMemoryCapability` 还可以暴露 `publicArtifacts.listArtifacts(...)`
  以便伴随插件可以通过 `openclaw/plugin-sdk/memory-host-core` 消费导出的内存工件，而不是深入某个
  内存插件的私有布局。
- `registerMemoryPromptSection`、`registerMemoryFlushPlan` 和
  `registerMemoryRuntime` 是兼容旧版的独占内存插件 API。
- `MemoryFlushPlan.model` 可以将刷新回合固定到精确的 `provider/model`
  引用，例如 `ollama/qwen3:8b`，而不会继承当前的回退链。
- `registerMemoryEmbeddingProvider` 允许活动内存插件注册一个或多个嵌入适配器 id（例如 `openai`、`gemini` 或自定义的
  插件定义 id）。
- 诸如 `agents.defaults.memorySearch.provider` 和
  `agents.defaults.memorySearch.fallback` 的用户配置，会针对这些已注册的
  适配器 id 进行解析。

### 事件和生命周期

| 方法                                       | 功能                  |
| -------------------------------------------- | ----------------------------- |
| `api.on(hookName, handler, opts?)`           | 类型化生命周期钩子          |
| `api.onConversationBindingResolved(handler)` | 会话绑定回调 |

示例、常见钩子名称和守卫
语义请参见 [插件钩子](/plugins/hooks)。

### 钩子决策语义

- `before_tool_call`：返回 `{ block: true }` 是终止性的。一旦任何处理器设置了它，更低优先级的处理器会被跳过。
- `before_tool_call`：返回 `{ block: false }` 被视为没有决策（等同于省略 `block`），而不是覆盖。
- `before_install`：返回 `{ block: true }` 是终止性的。一旦任何处理器设置了它，更低优先级的处理器会被跳过。
- `before_install`：返回 `{ block: false }` 被视为没有决策（等同于省略 `block`），而不是覆盖。
- `reply_dispatch`：返回 `{ handled: true, ... }` 是终止性的。一旦任何处理器声明了派发，更低优先级的处理器和默认模型派发路径会被跳过。
- `message_sending`：返回 `{ cancel: true }` 是终止性的。一旦任何处理器设置了它，更低优先级的处理器会被跳过。
- `message_sending`：返回 `{ cancel: false }` 被视为没有决策（等同于省略 `cancel`），而不是覆盖。
- `message_received`：当你需要传入线程/话题路由时，请使用类型化的 `threadId` 字段。将 `metadata` 保留给渠道特定的额外信息。
- `message_sending`：在回退到渠道特定的 `metadata` 之前，请使用类型化的 `replyToId` / `threadId` 路由字段。
- `gateway_start`：请使用 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()` 获取 gateway 拥有的启动状态，而不要依赖内部的 `gateway:startup` 钩子。
- `cron_changed`：观察 gateway 拥有的 cron 生命周期变化。在同步外部唤醒调度器时，请使用 `event.job?.state?.nextRunAtMs` 和 `ctx.getCron?.()`，并让 OpenClaw 作为到期检查和执行的真实来源。

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

在你的插件内，使用本地 barrel 文件进行内部导入：

```
my-plugin/
  api.ts            # 面向外部消费者的公共导出
  runtime-api.ts    # 仅供内部使用的运行时导出
  index.ts          # 插件入口点
  setup-entry.ts    # 轻量级仅用于设置的入口点（可选）
```

<Warning>
  不要在生产代码中通过 `openclaw/plugin-sdk/<your-plugin>`
  导入你自己的插件。内部导入应通过 `./api.ts` 或
  `./runtime-api.ts` 进行路由。SDK 路径仅是外部契约。
</Warning>

面向已加载外观的打包插件公共表面（`api.ts`、`runtime-api.ts`、
`index.ts`、`setup-entry.ts` 以及类似的公共入口文件），在 OpenClaw 已经运行时，
优先使用当前运行时配置快照。如果尚不存在运行时快照，则回退到磁盘上解析后的配置文件。
打包后的插件外观应通过 OpenClaw 的插件外观加载器加载；直接从 `dist/extensions/...` 导入会绕过清单和运行时 sidecar 检查，而这些检查是打包安装对插件自有代码所使用的。

提供者插件可以在某个辅助工具有意仅适用于该提供者且尚不属于通用 SDK 子路径时，
暴露一个窄范围、插件本地的 contract barrel。打包示例：

- **Anthropic**：面向 Claude 的 `api.ts` / `contract-api.ts` 接口，
  用于 beta-header 和 `service_tier` 流式辅助工具。
- **`@openclaw/openai-provider`**：`api.ts` 导出提供者构建器、
  默认模型辅助工具，以及实时提供者构建器。
- **`@openclaw/openrouter-provider`**：`api.ts` 导出提供者构建器
  以及引导/配置辅助工具。

<Warning>
  扩展的生产代码也应避免 `openclaw/plugin-sdk/<other-plugin>`
  导入。如果某个辅助工具确实是共享的，应将其提升到一个中性的 SDK 子路径，
  例如 `openclaw/plugin-sdk/speech`、`.../provider-model-shared`，或其他以能力为导向的表面，
  而不是将两个插件耦合在一起。
</Warning>

## 相关内容

<CardGroup cols={2}>
  <Card title="入口点" icon="door-open" href="/plugins/sdk-entrypoints">
    `definePluginEntry` 和 `defineChannelPluginEntry` 选项。
  </Card>
  <Card title="运行时辅助工具" icon="gears" href="/plugins/sdk-runtime">
    完整的 `api.runtime` 命名空间参考。
  </Card>
  <Card title="设置和配置" icon="sliders" href="/plugins/sdk-setup">
    打包、清单和配置模式。
  </Card>
  <Card title="测试" icon="vial" href="/plugins/sdk-testing">
    测试工具和 lint 规则。
  </Card>
  <Card title="SDK 迁移" icon="arrows-turn-right" href="/plugins/sdk-migration">
    从已弃用表面迁移。
  </Card>
  <Card title="插件内部" icon="diagram-project" href="/plugins/architecture">
    深层架构和能力模型。
  </Card>
</CardGroup>
