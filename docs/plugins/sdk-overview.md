---
summary: "导入映射、注册 API 参考和 SDK 架构"
title: "插件 SDK 概览"
sidebarTitle: "SDK 概览"
read_when:
  - 你需要知道应从哪个 SDK 子路径导入
  - 你想查看 OpenClawPluginApi 上所有注册方法的参考
  - 你正在查找某个特定的 SDK 导出
---

插件 SDK 是插件与核心之间的类型化契约。本页是关于**导入什么**以及**可以注册什么**的参考。

<Tip>
  想找的是操作指南吗？

  - 第一个插件？从 [构建插件](/plugins/building-plugins) 开始。
  - Channel 插件？查看 [Channel 插件](/plugins/sdk-channel-plugins)。
  - Provider 插件？查看 [Provider 插件](/plugins/sdk-provider-plugins)。
  - 工具或生命周期钩子插件？查看 [插件钩子](/plugins/hooks)。
</Tip>

## 导入约定

始终从特定子路径导入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
```

每个子路径都是一个小型的、独立的模块。这可以保持启动速度更快，并防止循环依赖问题。对于特定于 channel 的入口/构建辅助工具，优先使用 `openclaw/plugin-sdk/channel-core`；将 `openclaw/plugin-sdk/core` 保留给更广泛的总入口表面和共享辅助工具，例如
`buildChannelConfigSchema`。

对于 channel 配置，通过 `openclaw.plugin.json#channelConfigs` 发布由 channel 拥有的 JSON Schema。`plugin-sdk/channel-config-schema` 子路径用于共享的 schema 基元和通用构建器。已废弃的打包 channel schema 导出位于 `plugin-sdk/channel-config-schema-legacy`，仅用于打包兼容性；它们不是新插件的模式。

<Warning>
  不要导入 provider 或 channel 品牌化的便捷入口（例如
  `openclaw/plugin-sdk/slack`、`.../discord`、`.../signal`、`.../whatsapp`）。
  打包插件会在自己的 `api.ts` /
  `runtime-api.ts` barrel 中组合通用 SDK 子路径；核心消费者应当要么使用这些插件本地的 barrel，要么在确有跨 channel 需求时新增一个更窄的通用 SDK 契约。

一小部分打包插件辅助入口（`plugin-sdk/feishu`、
`plugin-sdk/zalo`、`plugin-sdk/matrix*` 等）仍会出现在生成的导出映射中。
它们仅用于打包插件维护，不建议作为新第三方插件的导入路径。
</Warning>

## 子路径参考

插件 SDK 以按领域分组的一组窄子路径形式暴露（插件入口、channel、provider、auth、runtime、capability、memory，以及保留的打包插件辅助工具）。完整目录——按组并带链接——请参见
[插件 SDK 子路径](/plugins/sdk-subpaths)。

200+ 个子路径的生成列表位于 `scripts/lib/plugin-sdk-entrypoints.json`。

## 注册 API

`register(api)` 回调会接收一个 `OpenClawPluginApi` 对象，包含以下方法：

### 能力注册

| 方法                                           | 注册内容                     |
| ------------------------------------------------ | ----------------------------- |
| `api.registerProvider(...)`                      | 文本推理（LLM）                  |
| `api.registerAgentHarness(...)`                  | 实验性的低层级 agent 执行器 |
| `api.registerCliBackend(...)`                    | 本地 CLI 推理后端           |
| `api.registerChannel(...)`                       | 消息 channel                     |
| `api.registerSpeechProvider(...)`                | 文本转语音 / STT 合成        |
| `api.registerRealtimeTranscriptionProvider(...)` | 流式实时转录      |
| `api.registerRealtimeVoiceProvider(...)`         | 双工实时语音会话        |
| `api.registerMediaUnderstandingProvider(...)`    | 图像/音频/视频分析            |
| `api.registerImageGenerationProvider(...)`       | 图像生成                      |
| `api.registerMusicGenerationProvider(...)`       | 音乐生成                      |
| `api.registerVideoGenerationProvider(...)`       | 视频生成                      |
| `api.registerWebFetchProvider(...)`              | Web 抓取 / 爬取 provider           |
| `api.registerWebSearchProvider(...)`             | Web 搜索                            |

### 工具和命令

| 方法                          | 注册内容                             |
| ------------------------------- | --------------------------------------------- |
| `api.registerTool(tool, opts?)` | Agent 工具（必需或 `{ optional: true }`） |
| `api.registerCommand(def)`      | 自定义命令（绕过 LLM）             |

当 agent 需要一个简短、由命令拥有的路由提示时，插件命令可以设置 `agentPromptGuidance`。该文本应只描述命令本身；不要在核心提示构建器中添加 provider 或插件特定策略。

### Infrastructure

| 方法                                         | 注册内容                       |
| ---------------------------------------------- | --------------------------------------- |
| `api.registerHook(events, handler, opts?)`     | 事件钩子                              |
| `api.registerHttpRoute(params)`                | Gateway HTTP 端点                   |
| `api.registerGatewayMethod(name, handler)`     | Gateway RPC 方法                      |
| `api.registerGatewayDiscoveryService(service)` | 本地 Gateway 发现广播器      |
| `api.registerCli(registrar, opts?)`            | CLI 子命令                          |
| `api.registerService(service)`                 | 后台服务                      |
| `api.registerInteractiveHandler(registration)` | 交互式处理器                     |
| `api.registerAgentToolResultMiddleware(...)`   | 运行时工具结果中间件          |
| `api.registerMemoryPromptSupplement(builder)`  | 追加式 memory 邻接提示部分 |
| `api.registerMemoryCorpusSupplement(adapter)`  | 追加式 memory 搜索/读取语料      |

<Note>
  保留的核心管理命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、
  `update.*`）始终保持 `operator.admin`，即使插件尝试分配更窄的 gateway 方法作用域也是如此。对于插件拥有的方法，请优先使用插件专用前缀。
</Note>

<Accordion title="何时使用工具结果中间件">
  当打包插件需要在执行之后、运行时把结果反馈回模型之前重写工具结果时，可以使用 `api.registerAgentToolResultMiddleware(...)`。这是一种受信任、与运行时无关的接口，适用于诸如 tokenjuice 之类的异步输出归约器。

打包插件必须为每个目标运行时声明 `contracts.agentToolResultMiddleware`，例如 `["pi", "codex"]`。外部插件不能注册此中间件；对于不需要在模型前进行工具结果时序控制的工作，请保留使用普通的 OpenClaw 插件钩子。旧的仅 Pi 的嵌入式扩展工厂注册路径已被移除。
</Accordion>

### Gateway 发现注册

`api.registerGatewayDiscoveryService(...)` 允许插件在本地发现传输（如 mDNS/Bonjour）上广播当前活跃的 Gateway。OpenClaw 会在启用本地发现时于 Gateway 启动期间调用该服务，传入当前 Gateway 端口和非敏感的 TXT 提示数据，并在 Gateway 关闭期间调用返回的 `stop` 处理器。

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

Gateway 发现插件不得将已广播的 TXT 值视为机密或身份验证。发现只是路由提示；Gateway 认证和 TLS 钉扎仍然负责信任。

### CLI 注册元数据

`api.registerCli(registrar, opts?)` 接受两类顶层元数据：

- `commands`：由 registrar 拥有的显式命令根
- `descriptors`：用于根 CLI 帮助、路由以及懒加载插件 CLI 注册的解析时命令描述符

如果你希望插件命令在正常的根 CLI 路径中保持懒加载，请提供覆盖该 registrar 暴露的每个顶层命令根的 `descriptors`。

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

只有在你不需要懒加载根 CLI 注册时，才单独使用 `commands`。这种急切兼容路径仍然受支持，但它不会为解析时懒加载安装基于 descriptor 的占位符。

### CLI 后端注册

`api.registerCliBackend(...)` 允许插件拥有本地 AI CLI 后端（例如 `codex-cli`）的默认配置。

- 后端 `id` 会成为模型引用中的 provider 前缀，例如 `codex-cli/gpt-5`。
- 后端 `config` 使用与 `agents.defaults.cliBackends.<id>` 相同的形状。
- 用户配置仍然优先。OpenClaw 会在运行 CLI 之前，将 `agents.defaults.cliBackends.<id>` 合并到插件默认值之上。
- 当后端在合并后需要兼容性重写时使用 `normalizeConfig`（例如规范化旧的参数形状）。

### 独占槽位

| 方法                                     | 注册内容                                                                                                                                         |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api.registerContextEngine(id, factory)`   | 上下文引擎（同一时间只有一个处于活动状态）。`assemble()` 回调会接收 `availableTools` 和 `citationsMode`，以便引擎定制提示词附加内容。 |
| `api.registerMemoryCapability(capability)` | 统一 memory 能力                                                                                                                                 |
| `api.registerMemoryPromptSection(builder)` | memory 提示部分构建器                                                                                                                             |
| `api.registerMemoryFlushPlan(resolver)`    | memory 刷新计划解析器                                                                                                                                |
| `api.registerMemoryRuntime(runtime)`       | memory 运行时适配器                                                                                                                                    |

### Memory 嵌入适配器

| 方法                                         | 注册内容                              |
| ---------------------------------------------- | ---------------------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | 当前插件的 memory 嵌入适配器 |

- `registerMemoryCapability` 是首选的独占 memory 插件 API。
- `registerMemoryCapability` 还可以暴露 `publicArtifacts.listArtifacts(...)`，这样配套插件就可以通过 `openclaw/plugin-sdk/memory-host-core` 消费导出的 memory 资源，而不必深入到某个特定 memory 插件的私有布局中。
- `registerMemoryPromptSection`、`registerMemoryFlushPlan` 和
  `registerMemoryRuntime` 是向后兼容的独占 memory 插件 API。
- `registerMemoryEmbeddingProvider` 允许当前 memory 插件注册一个或多个嵌入适配器 id（例如 `openai`、`gemini`，或自定义的插件定义 id）。
- 诸如 `agents.defaults.memorySearch.provider` 和 `agents.defaults.memorySearch.fallback` 之类的用户配置会根据这些已注册的适配器 id 进行解析。

### 事件和生命周期

| 方法                                       | 作用                  |
| -------------------------------------------- | ----------------------------- |
| `api.on(hookName, handler, opts?)`           | 类型化生命周期钩子          |
| `api.onConversationBindingResolved(handler)` | 会话绑定回调           |

示例、常见钩子名称和守卫语义请参见 [插件钩子](/plugins/hooks)。

### 钩子决策语义

- `before_tool_call`：返回 `{ block: true }` 为终局。一旦任何处理器设置了它，优先级更低的处理器会被跳过。
- `before_tool_call`：返回 `{ block: false }` 会被视为未作决定（与省略 `block` 相同），而不是覆盖。
- `before_install`：返回 `{ block: true }` 为终局。一旦任何处理器设置了它，优先级更低的处理器会被跳过。
- `before_install`：返回 `{ block: false }` 会被视为未作决定（与省略 `block` 相同），而不是覆盖。
- `reply_dispatch`：返回 `{ handled: true, ... }` 为终局。一旦任何处理器声明已处理分发，优先级更低的处理器和默认模型分发路径都会被跳过。
- `message_sending`：返回 `{ cancel: true }` 为终局。一旦任何处理器设置了它，优先级更低的处理器会被跳过。
- `message_sending`：返回 `{ cancel: false }` 会被视为未作决定（与省略 `cancel` 相同），而不是覆盖。
- `message_received`：当你需要入站线程/主题路由时，使用类型化的 `threadId` 字段。将 `metadata` 保留给 channel 特定的额外信息。
- `message_sending`：在退回到 channel 特定的 `metadata` 之前，先使用类型化的 `replyToId` / `threadId` 路由字段。
- `gateway_start`：使用 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()` 来表示 gateway 拥有的启动状态，而不是依赖内部的 `gateway:startup` 钩子。

### API 对象字段

| 字段                    | 类型                      | 描述                                                                                 |
| ------------------------ | ------------------------- | ------------------------------------------------------------------------------------------- |
| `api.id`                 | `string`                  | 插件 id                                                                                   |
| `api.name`               | `string`                  | 显示名称                                                                                |
| `api.version`            | `string?`                 | 插件版本（可选）                                                                   |
| `api.description`        | `string?`                 | 插件描述（可选）                                                               |
| `api.source`             | `string`                  | 插件源路径                                                                          |
| `api.rootDir`            | `string?`                 | 插件根目录（可选）                                                            |
| `api.config`             | `OpenClawConfig`          | 当前配置快照（可用时为活动的内存运行时快照）                  |
| `api.pluginConfig`       | `Record<string, unknown>` | 来自 `plugins.entries.<id>.config` 的插件特定配置                                   |
| `api.runtime`            | `PluginRuntime`           | [运行时辅助工具](/plugins/sdk-runtime)                                                     |
| `api.logger`            | `PluginLogger`            | 作用域日志记录器（`debug`、`info`、`warn`、`error`）                                            |
| `api.registrationMode`   | `PluginRegistrationMode`  | 当前加载模式；`"setup-runtime"` 是完整入口启动/设置前的轻量阶段 |
| `api.resolvePath(input)` | `(string) => string`      | 相对于插件根目录解析路径                                                        |

## 内部模块约定

在你的插件中，内部导入请使用本地 barrel 文件：

```
my-plugin/
  api.ts            # 面向外部消费者的公共导出
  runtime-api.ts    # 仅供内部使用的运行时导出
  index.ts          # 插件入口点
  setup-entry.ts    # 轻量级的仅用于 setup 的入口（可选）
```

<Warning>
  绝不要在生产代码中通过 `openclaw/plugin-sdk/<your-plugin>`
  导入你自己的插件。内部导入应通过 `./api.ts` 或
  `./runtime-api.ts` 路由。SDK 路径只作为外部契约。
</Warning>

通过 Facade 加载的打包插件公共表面（`api.ts`、`runtime-api.ts`、
`index.ts`、`setup-entry.ts` 以及类似的公共入口文件）在 OpenClaw 已经运行时，
优先使用当前活动的运行时配置快照。如果尚不存在运行时快照，
则回退到磁盘上已解析的配置文件。

提供者插件可以在某个辅助工具具有明显的提供者特异性、且暂时不适合放入通用 SDK
子路径时，暴露一个更窄的、插件本地的契约 barrel。打包示例：

- **Anthropic**：用于 Claude
  beta-header 和 `service_tier` 流式辅助工具的公共 `api.ts` / `contract-api.ts` 接口。
- **`@openclaw/openai-provider`**：`api.ts` 导出提供者构建器、
  默认模型辅助工具，以及 realtime 提供者构建器。
- **`@openclaw/openrouter-provider`**：`api.ts` 导出提供者构建器
  以及 onboarding/配置辅助工具。

<Warning>
  扩展的生产代码也应避免 `openclaw/plugin-sdk/<other-plugin>`
  导入。如果某个辅助工具确实是共享的，请将其提升到中性的 SDK 子路径，
  例如 `openclaw/plugin-sdk/speech`、`.../provider-model-shared`，或其他面向能力的表面，
  而不是把两个插件耦合在一起。
</Warning>

## 相关内容

<CardGroup cols={2}>
  <Card title="入口点" icon="door-open" href="/plugins/sdk-entrypoints">
    `definePluginEntry` 和 `defineChannelPluginEntry` 选项。
  </Card>
  <Card title="运行时辅助工具" icon="gears" href="/plugins/sdk-runtime">
    完整的 `api.runtime` 命名空间参考。
  </Card>
  <Card title="Setup 和配置" icon="sliders" href="/plugins/sdk-setup">
    打包、清单，以及配置 schema。
  </Card>
  <Card title="测试" icon="vial" href="/plugins/sdk-testing">
    测试工具和 lint 规则。
  </Card>
  <Card title="SDK 迁移" icon="arrows-turn-right" href="/plugins/sdk-migration">
    从已弃用的表面迁移。
  </Card>
  <Card title="插件内部结构" icon="diagram-project" href="/plugins/architecture">
    深入的架构和能力模型。
  </Card>
</CardGroup>