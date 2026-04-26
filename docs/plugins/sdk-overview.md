---
summary: "导入映射、注册 API 参考，以及 SDK 架构"
title: "插件 SDK 概览"
sidebarTitle: "SDK 概览"
read_when:
  - 你需要知道应该从哪个 SDK 子路径导入
  - 你想查看 OpenClawPluginApi 上所有注册方法的参考
  - 你正在查找某个特定的 SDK 导出
---

插件 SDK 是插件与核心之间的类型化契约。此页面用于参考**应导入什么**以及**你可以注册什么**。

<Tip>
  想找的是操作指南吗？

- 第一个插件？从 [构建插件](/plugins/building-plugins) 开始。
- 频道插件？请参阅 [频道插件](/plugins/sdk-channel-plugins)。
- 提供商插件？请参阅 [提供商插件](/plugins/sdk-provider-plugins)。
- 工具或生命周期钩子插件？请参阅 [插件钩子](/plugins/hooks)。
  </Tip>

## 导入约定

始终从特定子路径导入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
```

每个子路径都是一个小型、自包含的模块。这保持了启动速度并防止循环依赖问题。对于频道特定的入口/构建辅助函数，优先使用 `openclaw/plugin-sdk/channel-core`；将 `openclaw/plugin-sdk/core` 保留用于更广泛的总括接口层和共享辅助函数，例如 `buildChannelConfigSchema`。

对于频道配置，请通过 `openclaw.plugin.json#channelConfigs` 发布频道拥有的 JSON Schema。`plugin-sdk/channel-config-schema` 子路径用于共享的 schema 原语和通用构建器。该子路径上任何带有 bundled-channel 名称的 schema 导出都属于旧版兼容导出，而不是新插件的推荐模式。

<Warning>
  不要导入提供商或频道品牌的便捷入口（例如
  `openclaw/plugin-sdk/slack`、`.../discord`、`.../signal`、`.../whatsapp`）。
  打包插件会在自己的 `api.ts` /
  `runtime-api.ts` barrel 中组合通用 SDK 子路径；核心消费者应当使用这些插件本地
  barrel，或者在确实存在跨频道需求时添加一个狭窄的通用 SDK 契约。

一小组打包插件辅助入口（`plugin-sdk/feishu`、
`plugin-sdk/zalo`、`plugin-sdk/matrix*` 以及类似项）仍然会出现在
生成的导出映射中。它们仅用于打包插件维护，不建议作为新第三方插件的导入路径。
</Warning>

## 子路径参考

插件 SDK 作为按领域分组的一组窄子路径公开（插件
入口、频道、提供商、认证、运行时、能力、内存，以及保留的
打包插件辅助项）。完整目录——按组整理并附带链接——请参见
[插件 SDK 子路径](/plugins/sdk-subpaths)。

这 200+ 个子路径的生成列表位于 `scripts/lib/plugin-sdk-entrypoints.json`。

## 注册 API

`register(api)` 回调会接收一个 `OpenClawPluginApi` 对象，其中包含以下
方法：

### 能力注册

| 方法                                             | 注册内容              |
| ------------------------------------------------ | --------------------- |
| `api.registerProvider(...)`                  | 文本推理 (LLM)        |
| `api.registerAgentHarness(...)`                  | 实验性底层代理执行器  |
| `api.registerCliBackend(...)`                  | 本地 CLI 推理后端     |
| `api.registerChannel(...)`                      | 消息通道              |
| `api.registerSpeechProvider(...)`                | 文本转语音 / STT 合成 |
| `api.registerRealtimeTranscriptionProvider(...)` | 流式实时转录          |
| `api.registerRealtimeVoiceProvider(...)`         | 双工实时语音会话      |
| `api.registerMediaUnderstandingProvider(...)`    | 图像/音频/视频分析    |
| `api.registerImageGenerationProvider(...)`       | 图像生成              |
| `api.registerMusicGenerationProvider(...)`       | 音乐生成              |
| `api.registerVideoGenerationProvider(...)`       | 视频生成              |
| `api.registerWebFetchProvider(...)`              | Web 抓取/爬取提供商   |
| `api.registerWebSearchProvider(...)`             | Web 搜索              |

### 工具与命令

| 方法                            | 注册内容                                  |
| ------------------------------- | ----------------------------------------- |
| `api.registerTool(tool, opts?)` | Agent 工具（必需或 `{ optional: true }`） |
| `api.registerCommand(def)`      | 自定义命令（绕过 LLM）                    |

### 基础设施

| 方法                                           | 注册内容                       |
| ---------------------------------------------- | ------------------------------ |
| `api.registerHook(events, handler, opts?)`     | 事件钩子                              |
| `api.registerHttpRoute(params)`                | Gateway HTTP 端点                   |
| `api.registerGatewayMethod(name, handler)`     | Gateway RPC 方法                      |
| `api.registerGatewayDiscoveryService(service)` | 本地 Gateway 发现广播器      |
| `api.registerCli(registrar, opts?)`            | CLI 子命令                          |
| `api.registerService(service)`                 | 后台服务                      |
| `api.registerInteractiveHandler(registration)` | 交互式处理器                     |
| `api.registerAgentToolResultMiddleware(...)`   | 运行时工具结果中间件          |
| `api.registerMemoryPromptSupplement(builder)`  | 追加式的记忆相邻提示部分 |
| `api.registerMemoryCorpusSupplement(adapter)`  | 追加式的记忆搜索/读取语料库      |

<Note>
  保留的核心管理命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、
  `update.*`）始终保持 `operator.admin`，即使插件尝试分配更窄的 Gateway 方法范围也是如此。请优先为
  插件拥有的方法使用插件专属前缀。
</Note>

<Accordion title="何时使用工具结果中间件">
  当打包插件需要在执行后、运行时将结果喂回模型之前重写工具结果时，
  可以使用 `api.registerAgentToolResultMiddleware(...)`。这是用于异步输出
  归约器（如 tokenjuice）的受信任、与运行时无关的入口。

打包插件必须为每个目标运行时声明 `contracts.agentToolResultMiddleware`，
例如 `["pi", "codex"]`。外部插件
不能注册此中间件；对于不需要模型前工具结果时序的工作，请保留普通的 OpenClaw 插件钩子。旧的仅 Pi 内嵌扩展工厂注册路径已被移除。
</Accordion>

### Gateway 发现注册

`api.registerGatewayDiscoveryService(...)` 允许插件在本地
发现传输（例如 mDNS/Bonjour）上公布活动的 Gateway。OpenClaw 会在 Gateway 启动时于启用本地发现的情况下调用
该服务，传入当前 Gateway 端口和非密钥 TXT 提示数据，并在 Gateway
关闭期间调用返回的 `stop` 处理器。

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

Gateway 发现插件不得将公布的 TXT 值视为密钥或认证信息。发现机制只是路由提示；Gateway 认证和 TLS 指纹固定仍然负责信任。

### CLI 注册元数据

`api.registerCli(registrar, opts?)` 接受两种顶层元数据：

- `commands`: 注册器拥有的显式命令根节点
- `descriptors`: 解析时命令描述符，用于根 CLI 帮助、路由和懒加载插件 CLI 注册

如果你希望插件命令在普通根 CLI 路径中保持懒加载，请提供 `descriptors`，覆盖该注册器暴露的每个顶层命令根节点。

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
        description:
          "管理 Matrix 账户、验证、设备和配置文件状态",
        hasSubcommands: true,
      },
    ],
  },
);
```

仅当你不需要懒加载根 CLI 注册时才单独使用 `commands`。该 eager 兼容路径仍然受支持，但它不会安装用于解析时懒加载的基于描述符的占位符。

### CLI 后端注册

`api.registerCliBackend(...)` 允许插件拥有本地
AI CLI 后端（如 `codex-cli`）的默认配置。

- 后端 `id` 成为模型引用中的提供商前缀，例如 `codex-cli/gpt-5`。
- 后端 `config` 使用与 `agents.defaults.cliBackends.<id>` 相同的形状。
- 用户配置仍然优先。OpenClaw 在运行 CLI 之前将 `agents.defaults.cliBackends.<id>` 合并到插件默认值之上。
- 当后端在合并后需要兼容性重写时使用 `normalizeConfig`（例如规范化旧标志形状）。

### 独占槽位

| 方法                                       | 注册内容                                                                                                        |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `api.registerContextEngine(id, factory)`   | 上下文引擎（同时仅一个活跃）。`assemble()` 回调接收 `availableTools` 和 `citationsMode`，以便引擎定制提示补充。 |
| `api.registerMemoryCapability(capability)` | 统一记忆能力                                                                                                    |
| `api.registerMemoryPromptSection(builder)` | 记忆提示部分构建器                                                                                              |
| `api.registerMemoryFlushPlan(resolver)`    | 记忆刷新计划解析器                                                                                              |
| `api.registerMemoryRuntime(runtime)`       | 记忆运行时适配器                                                                                                |

### Memory 嵌入适配器

| 方法                                           | 注册内容                     |
| ---------------------------------------------- | ---------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | 当前插件的 Memory 嵌入适配器 |

- `registerMemoryCapability` 是首选的独占内存插件 API。
- `registerMemoryCapability` 也可能公开 `publicArtifacts.listArtifacts(...)`，以便辅助插件可以通过 `openclaw/plugin-sdk/memory-host-core` 消费导出的内存产物，而不是侵入特定内存插件的私有布局。
- `registerMemoryPromptSection`、`registerMemoryFlushPlan` 和 `registerMemoryRuntime` 是向后兼容的独占内存插件 API。
- `registerMemoryEmbeddingProvider` 允许活跃的内存插件注册一个或多个嵌入适配器 ID（例如 `openai`、`gemini` 或自定义插件定义的 ID）。
- 用户配置（如 `agents.defaults.memorySearch.provider` 和 `agents.defaults.memorySearch.fallback`）会针对这些已注册的适配器 ID 进行解析。

### 事件与生命周期

| 方法                                         | 作用               |
| -------------------------------------------- | ------------------ |
| `api.on(hookName, handler, opts?)`           | 类型化生命周期钩子 |
| `api.onConversationBindingResolved(handler)` | 会话绑定回调       |

请参阅 [插件钩子](/plugins/hooks) 以查看示例、常见钩子名称和守卫语义。

### Hook 决策语义

- `before_tool_call`：返回 `{ block: true }` 是终结性的。一旦任何处理器设置了它，更低优先级的处理器将被跳过。
- `before_tool_call`：返回 `{ block: false }` 会被视为未作决定（与省略 `block` 相同），而不是覆盖。
- `before_install`：返回 `{ block: true }` 是终结性的。一旦任何处理器设置了它，更低优先级的处理器将被跳过。
- `before_install`：返回 `{ block: false }` 会被视为未作决定（与省略 `block` 相同），而不是覆盖。
- `reply_dispatch`：返回 `{ handled: true, ... }` 是终结性的。一旦任何处理器声明已处理分发，更低优先级的处理器和默认模型分发路径将被跳过。
- `message_sending`：返回 `{ cancel: true }` 是终结性的。一旦任何处理器设置了它，更低优先级的处理器将被跳过。
- `message_sending`：返回 `{ cancel: false }` 会被视为未作决定（与省略 `cancel` 相同），而不是覆盖。
- `message_received`：在需要入站线程/主题路由时，请使用类型化的 `threadId` 字段。将 `metadata` 保留给频道特定的额外信息。
- `message_sending`：在回退到频道特定 `metadata` 之前，请先使用类型化的 `replyToId` / `threadId` 路由字段。
- `gateway_start`：请使用 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()` 获取网关拥有的启动状态，而不是依赖内部的 `gateway:startup` 钩子。

### API 对象字段

| 字段                     | 类型                      | 描述                                                          |
| ------------------------ | ------------------------- | ------------------------------------------------------------- |
| `api.id`                 | `string`                  | 插件 id                                                       |
| `api.name`               | `string`                  | 显示名称                                                      |
| `api.version`            | `string?`                 | 插件版本（可选）                                              |
| `api.description`        | `string?`                 | 插件描述（可选）                                              |
| `api.source`             | `string`                  | 插件源路径                                                    |
| `api.rootDir`            | `string?`                 | 插件根目录（可选）                                            |
| `api.config`             | `OpenClawConfig`          | 当前配置快照（可用时为活动的内存运行时快照）                  |
| `api.pluginConfig`       | `Record<string, unknown>` | 来自 `plugins.entries.<id>.config` 的插件特定配置             |
| `api.runtime`            | `PluginRuntime`           | [运行时助手](/plugins/sdk-runtime)                            |
| `api.logger`            | `PluginLogger`            | 作用域日志记录器（`debug`, `info`, `warn`, `error`）          |
| `api.registrationMode`   | `PluginRegistrationMode`  | 当前加载模式；`"setup-runtime"` 是轻量级完整入口启动/设置窗口 |
| `api.resolvePath(input)` | `(string) => string`      | 解析相对于插件根目录的路径                                    |

## 内部模块约定

在你的插件内部，使用本地 barrel 文件来处理内部导入：

```
my-plugin/
  api.ts            # 面向外部消费者的公共导出
  runtime-api.ts    # 仅供内部使用的运行时导出
  index.ts          # 插件入口点
  setup-entry.ts    # 轻量级仅 setup 入口（可选）
```

<Warning>
  切勿在生产代码中通过 `openclaw/plugin-sdk/<your-plugin>`
  导入你自己的插件。请将内部导入通过 `./api.ts` 或
  `./runtime-api.ts` 路由。SDK 路径仅是外部契约。
</Warning>

当 OpenClaw 已经运行时，Facade-loaded 打包插件的公共表面（`api.ts`、`runtime-api.ts`、
`index.ts`、`setup-entry.ts` 以及类似的公共入口文件）会优先使用当前运行时配置快照。
如果此时还不存在运行时快照，它们会回退到磁盘上已解析的配置文件。

提供者插件可以在某个辅助函数刻意仅适用于特定提供者、且尚未适合放入通用 SDK
子路径时，暴露一个较窄的、仅限插件本地的契约 barrel。打包示例：

- **Anthropic**：面向 Claude 的公共 `api.ts` / `contract-api.ts` 接口，
  用于 beta-header 和 `service_tier` 流式辅助函数。
- **`@openclaw/openai-provider`**：`api.ts` 导出提供者构建器、
  默认模型辅助函数和实时提供者构建器。
- **`@openclaw/openrouter-provider`**：`api.ts` 导出提供者构建器
  以及入门/配置辅助函数。

<Warning>
  插件生产代码也应避免 `openclaw/plugin-sdk/<other-plugin>`
  导入。如果某个辅助函数确实是共享的，应将其提升至中立的 SDK 子路径，
  例如 `openclaw/plugin-sdk/speech`、`.../provider-model-shared` 或其他
  面向能力的表面，而不是将两个插件耦合在一起。
</Warning>

## 相关内容

<CardGroup cols={2}>
  <Card title="入口点" icon="door-open" href="/plugins/sdk-entrypoints">
    `definePluginEntry` 和 `defineChannelPluginEntry` 选项。
  </Card>
  <Card title="运行时辅助函数" icon="gears" href="/plugins/sdk-runtime">
    完整的 `api.runtime` 命名空间参考。
  </Card>
  <Card title="设置与配置" icon="sliders" href="/plugins/sdk-setup">
    打包、清单和配置模式。
  </Card>
  <Card title="测试" icon="vial" href="/plugins/sdk-testing">
    测试工具和 lint 规则。
  </Card>
  <Card title="SDK 迁移" icon="arrows-turn-right" href="/plugins/sdk-migration">
    从已弃用的表面进行迁移。
  </Card>
  <Card title="插件内部结构" icon="diagram-project" href="/plugins/architecture">
    深入的架构与能力模型。
  </Card>
</CardGroup>
