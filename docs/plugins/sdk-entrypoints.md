---
summary: "定义 `defineToolPlugin`、`definePluginEntry`、`defineChannelPluginEntry` 和 `defineSetupPluginEntry` 的参考"
title: "插件入口点"
sidebarTitle: "入口点"
read_when:
  - 你需要 `defineToolPlugin`、`definePluginEntry` 或 `defineChannelPluginEntry` 的精确类型签名
  - 你想了解注册模式（完整 / setup / CLI 元数据）
  - 你正在查找入口点选项
---

每个插件都导出一个默认入口对象。SDK 为每种入口结构提供了一个辅助函数：
`defineToolPlugin`、`definePluginEntry`、
`defineChannelPluginEntry`、`defineSetupPluginEntry`。

<Tip>
  **正在寻找操作指南？** 请参阅 [工具插件](/plugins/tool-plugins)、
  [频道插件](/plugins/sdk-channel-plugins) 或
  [提供者插件](/plugins/sdk-provider-plugins)，获取逐步指南。
</Tip>

## 包条目

已安装的插件会将 `package.json` 中的 `openclaw` 字段指向源条目和
构建后的条目：

```json
{
  "openclaw": {
    "extensions": ["./src/index.ts"],
    "runtimeExtensions": ["./dist/index.js"],
    "setupEntry": "./src/setup-entry.ts",
    "runtimeSetupEntry": "./dist/setup-entry.js"
  }
}
```

- `extensions` 和 `setupEntry` 是源条目，用于工作区和 git
  检出开发。
- `runtimeExtensions` 和 `runtimeSetupEntry` 优先用于已安装的
  包：它们让 npm 包跳过运行时 TypeScript 编译。
- `runtimeExtensions` 在存在时，数组长度必须与 `extensions` 一致
  （条目按位置配对）。`runtimeSetupEntry` 需要 `setupEntry`。
- 如果声明了 `runtimeExtensions`/`runtimeSetupEntry` 资源但它缺失，
  安装/发现会因打包错误而失败；OpenClaw 不会静默回退到源代码。
  源代码回退（见下文）仅在完全没有声明运行时条目时适用。
- 如果已安装的包只声明了一个 TypeScript 源条目，OpenClaw 会
  查找匹配的构建后 `dist/*.js`（或 `.mjs`/`.cjs`）同级文件并使用它；
  否则会回退到 TypeScript 源文件。
- 所有条目路径都必须保留在插件包目录内。运行时
  条目和推断出的构建后 JS 同级文件不会使越界的 `extensions` 或
  `setupEntry` 源路径变得有效。

## `defineToolPlugin`

**导入：** `openclaw/plugin-sdk/tool-plugin`

适用于只添加代理工具的插件。它保持源代码简洁，可从 TypeBox schema 推断 config
和工具参数类型，将普通返回值包装为 OpenClaw 工具结果格式，并暴露静态元数据，
`openclaw plugins build` 会将其写入插件清单（`contracts.tools`、
`configSchema`）。

```typescript
import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";

export default defineToolPlugin({
  id: "stock-quotes",
  name: "股票报价",
  description: "获取股票报价。",
  configSchema: Type.Object({
    apiKey: Type.Optional(Type.String({ description: "API 密钥。" })),
  }),
  tools: (tool) => [
    tool({
      name: "quote",
      label: "报价",
      description: "获取报价。",
      parameters: Type.Object({
        symbol: Type.String({ description: "股票代码。" }),
      }),
      outputSchema: Type.Object(
        {
          symbol: Type.String(),
          hasKey: Type.Boolean(),
        },
        { additionalProperties: false },
      ),
      execute: async ({ symbol }, config) => ({ symbol, hasKey: Boolean(config.apiKey) }),
    }),
  ],
});
```

- `configSchema` 是可选的；省略它时会使用严格的空对象 schema
  （生成的清单仍会包含 `configSchema`）。
- `execute` 返回普通字符串或可序列化为 JSON 的值；该辅助函数会将其包装为文本工具结果，并将
  `details` 设置为原始的（未转换为字符串的）返回值。
- `outputSchema` 可选地描述原始的 `details` 值，供代码模式和工具搜索使用。目录调用会在执行前拒绝无效 schema，并在返回前验证最终值。
- 对于自定义工具结果，`openclaw/plugin-sdk/tool-results` 导出
  `textResult` 和 `jsonResult`。
- 工具名称是静态的，因此 `openclaw plugins build` 会从声明的工具中推导出
  `contracts.tools`，无需手动重复名称。
- 运行时加载仍保持严格：已安装的插件仍需要
  `openclaw.plugin.json` 和 `package.json` 中的 `openclaw.extensions`。OpenClaw
  绝不会执行插件代码来推断缺失的清单数据。

## `definePluginEntry`

**导入：** `openclaw/plugin-sdk/plugin-entry`

适用于提供程序插件、高级工具插件、钩子插件，以及任何
**不是** 消息通道的内容。

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "my-plugin",
  name: "我的插件",
  description: "简短摘要",
  register(api) {
    api.registerProvider({/* ... */});
    api.registerTool({/* ... */});
  },
});
```

| 字段                      | 类型                                                             | 必需 | 默认值              |
| ------------------------- | ---------------------------------------------------------------- | ---- | ------------------- |
| `id`                      | `string`                                                         | 是   | -                   |
| `name`                    | `string`                                                         | 是   | -                   |
| `description`             | `string`                                                         | 是   | -                   |
| `kind`                    | `string`（已弃用，见下文）                                       | 否   | -                   |
| `configSchema`            | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | 否   | 空对象 schema       |
| `reload`                  | `OpenClawPluginReloadRegistration`                               | 否   | -                   |
| `nodeHostCommands`        | `OpenClawPluginNodeHostCommand[]`                                | 否   | -                   |
| `securityAuditCollectors` | `OpenClawPluginSecurityAuditCollector[]`                          | 否   | -                   |
| `register`                | `(api: OpenClawPluginApi) => void`                               | 是   | -                   |

- `id` 必须与 `openclaw.plugin.json` 清单中的值匹配。
- 外部会话目录使用
  `openclaw/plugin-sdk/session-catalog`，并通过 `api.registerSessionCatalog(...)` 注册
  `SessionCatalogProvider`。必需的提供程序字段为 `id`、`label`、`list` 和 `read`；可选钩子包括
  `resolveCreateSession`、`continueSession`、`checkUpstreamActivity`、`archive`、
  `openTerminal` 和 `startTerminalSession`。核心负责
  `sessions.catalog.*` 网关方法；提供程序返回主机、会话、转录记录和终端计划的投影，而无需注册 RPC。列表提供程序应在每个主机完成处理时调用可选的
  `onHost(host)` 回调；返回的主机数组仍必须作为最终的兼容性快照提供。
  `resolveCreateSession({ agentId })` 必须在 OpenClaw 宣布支持创建会话或调用 `startTerminalSession` 之前，返回一个从配置派生的模型/运行时目标。
  使用
  [`api.runtime.agent.resolveSessionCatalogCreateTarget(...)`](/plugins/sdk-runtime#apiruntimeagent)
  应用主机的运行时和模型允许列表策略，而不是重复实现这些逻辑。

  `startTerminalSession({ agentId, cwd, initialMessage?, nodeId? })` 会创建一个全新的 CLI 终端计划。返回本地计划（`kind: "local"`、`argv` 和精确的 `cwd`，以及可选的 `env`、`pathEnv` 和 `title`），或配对节点计划（`kind: "node"`、`nodeId`、`command`、`paramsJSON` 和精确的 `cwd`）。`sessions.catalog.startTerminal` RPC 要求具备 `operator.admin` 权限，并启用
  `gateway.cliAgents.enabled` 和 `gateway.terminal.enabled`。调用方负责提供
  `cwd`；网关要求本地目录已存在且为绝对路径，拒绝发生变化的计划 `cwd` 或主机，并在打开 PTY 之前执行常规的代理沙箱、节点配对、截止时间和连接所有权检查。

- `kind` 已弃用：应改为在 `openclaw.plugin.json` 清单的 `kind` 字段中声明一个互斥插槽（`"memory"` 或 `"context-engine"`）。运行时入口中的 `kind` 仅作为旧版插件的兼容性回退保留。
- `configSchema` 可以是一个函数，以便延迟求值。OpenClaw 会在首次访问时解析并缓存 schema，因此开销较大的 schema 构建器只会运行一次。
- `nodeHostCommands` 描述符可以定义 `isAvailable({ config, env })`。返回 `false` 会从无头节点的网关声明中省略该命令及其能力。OpenClaw 会根据节点本地的启动配置对其进行评估；命令处理程序在调用时仍应验证可用性。

## `defineChannelPluginEntry`

**导入：** `openclaw/plugin-sdk/channel-core`

使用通道专用连接封装 `definePluginEntry`：它会自动调用
`api.registerChannel({ plugin })`，提供可选的根帮助 CLI
元数据扩展点，并根据注册模式控制能力回调和完整运行时回调。

```typescript
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineChannelPluginEntry({
  id: "my-channel",
  name: "我的通道",
  description: "简短摘要",
  plugin: myChannelPlugin,
  setRuntime: setMyRuntime,
  registerCliMetadata(api) {
    api.registerCli(/* ... */);
  },
  registerFull(api) {
    api.registerGatewayMethod(/* ... */);
  },
  registerCapabilities(api) {
    api.registerTranscriptSourceProvider(/* ... */);
  },
});
```

| 字段                   | 类型                                                               | 必填 | 默认值             |
| ---------------------- | ------------------------------------------------------------------ | ---- | ------------------- |
| `id`                   | `string`                                                           | 是   | -                   |
| `name`                 | `string`                                                           | 是   | -                   |
| `description`          | `string`                                                           | 是   | -                   |
| `plugin`               | `ChannelPlugin`                                                    | 是   | -                   |
| `configSchema`         | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema`   | 否   | 空对象 schema       |
| `setRuntime`           | `(runtime: PluginRuntime) => void`                                 | 否   | -                   |
| `registerCliMetadata`  | `(api: OpenClawPluginApi) => void`                                 | 否   | -                   |
| `registerFull`         | `(api: OpenClawPluginApi) => void`                                 | 否   | -                   |
| `registerCapabilities` | `(api: OpenClawPluginApi) => void`                                 | 否   | -                   |

回调会根据注册模式运行（完整表格见
[注册模式](#registration-mode)）：

- `setRuntime` 在除 `"cli-metadata"` 和 `"tool-discovery"` 之外的所有模式下运行。在此处保存运行时引用，通常通过 `createPluginRuntimeStore` 完成。
- `registerCliMetadata` 在 `"cli-metadata"`、`"discovery"` 和
  `"full"` 模式下运行。将其作为通道自有 CLI 描述符的规范注册位置，以便根帮助保持非激活状态、发现快照包含静态命令元数据，并使常规 CLI 注册与完整插件加载保持兼容。
- `registerFull` 仅在 `"full"` 和 `"tool-discovery"` 模式下运行。对于
  `"tool-discovery"`，它会替代通道注册：OpenClaw 会完全跳过
  `registerChannel`/`setRuntime`，而是调用完整运行时回调，随后调用能力回调。将工具注册放在 `registerFull` 中，将能力提供者放在 `registerCapabilities` 中。
- `registerCapabilities` 在 `"discovery"`、`"full"` 和
  `"tool-discovery"` 模式下运行。在此处注册不产生副作用的已声明提供者，以便只读能力发现可以找到它们，而不会启动套接字、客户端、工作线程或服务。
- 发现注册不会激活，但并非不导入：OpenClaw 可能会计算受信任的插件入口和通道插件模块，以构建快照。确保顶层导入没有副作用，并将套接字、客户端、工作线程和服务置于仅 `"full"` 模式的路径之后。
- 与 `definePluginEntry` 一样，`configSchema` 可以是延迟工厂；OpenClaw 会在首次访问时缓存解析后的 schema。

CLI 注册：

- 对于希望延迟加载、但又不想从根 CLI 解析树中消失的插件自有根 CLI 命令，使用
  `api.registerCli(..., { descriptors: [...] })`。描述符名称必须匹配字母、数字、连字符和下划线，并且以字母或数字开头；OpenClaw 会拒绝其他形式，并在渲染帮助信息前移除描述中的终端控制序列。应覆盖注册器暴露的每个顶层命令根。单独使用
  `commands` 仍会走即时加载兼容路径。
- 根描述符可以为 JSON、JSONL 或其他不会仅因 `--json` 而选中的机器可读 stdout 模式定义同步、纯函数式的
  `machineOutput({ argv, stdoutIsTTY })` 解析器。使用
  `openclaw/plugin-sdk/cli-argv` 中的 `getRootOptionAwareCommandPath` 解析命令令牌。将解析器放在轻量级 CLI 元数据中，并与完整注册共享。嵌套描述符不提供此字段。
- 对于成对节点的功能命令，使用 `api.registerNodeCliFeature(...)`，使其归入
  `openclaw nodes` 下（等价于
  `registerCli(registrar, { parentPath: ["nodes"], ... })`）。
- 对于其他嵌套插件命令，添加 `parentPath`，并在传递给注册器的
  `program` 对象上注册命令；OpenClaw 会在调用插件前将其解析为父命令。
- 对于通道插件，从 `registerCliMetadata` 注册 CLI 描述符，并让
  `registerFull` 专注于仅运行时相关的工作。
- 如果 `registerFull` 还注册网关 RPC 方法，请将其置于插件专用前缀下。保留的核心管理命名空间（`config.*`、
  `exec.approvals.*`、`wizard.*`、`update.*`）始终会强制使用
  `operator.admin`。

## `defineSetupPluginEntry`

**导入：** `openclaw/plugin-sdk/channel-core`

用于轻量级的 `setup-entry.ts` 文件。只返回 `{ plugin }`，不包含运行时或 CLI 接线。

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineSetupPluginEntry(myChannelPlugin);
```

当通道被禁用或尚未配置时，OpenClaw 会加载此入口，而不是完整入口。有关这点何时重要，请参阅
[设置和配置](/plugins/sdk-setup#setup-entry)。

将 `defineSetupPluginEntry(...)` 与以下更窄的设置辅助工具系列搭配使用：

| 导入                                   | 用途                                                                                                                                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw/plugin-sdk/setup-runtime`    | 运行时安全的设置辅助工具：`createSetupTranslator`、导入安全的设置补丁适配器、查找备注输出、`promptResolvedAllowFrom`、`splitSetupEntries`、委托式设置代理 |
| `openclaw/plugin-sdk/channel-setup`    | 可选安装的设置接口                                                                                                                                                                |
| `openclaw/plugin-sdk/channel-dm-policy` | 面向账户的 DM 策略描述符，用于设置流程                                                                                                                                            |
| `openclaw/plugin-sdk/setup-tools`      | 设置/安装 CLI、归档和文档辅助工具                                                                                                                                                  |
| `openclaw/plugin-sdk/archive`          | 有界归档提取和单条目读取                                                                                                                                                            |
| `openclaw/plugin-sdk/root-walk`        | 预算受限、根目录有界的目录遍历                                                                                                                                                      |
| `openclaw/plugin-sdk/secret-file`      | 固定目标的机密读取和先写入者优先创建                                                                                                                                                 |

将重量级 SDK、CLI 注册和长期运行的运行时服务保留在完整入口中。

拆分设置和运行时接口的打包工作区通道可以改用 `openclaw/plugin-sdk/channel-entry-contract` 中的 `defineBundledChannelSetupEntry(...)`。它允许设置入口保留设置安全的插件/机密导出，同时仍然暴露一个运行时 setter：

```typescript
import { defineBundledChannelSetupEntry } from "openclaw/plugin-sdk/channel-entry-contract";

export default defineBundledChannelSetupEntry({
  importMetaUrl: import.meta.url,
  plugin: {
    specifier: "./channel-plugin-api.js",
    exportName: "myChannelPlugin",
  },
  runtime: {
    specifier: "./runtime-api.js",
    exportName: "setMyChannelRuntime",
  },
  registerSetupRuntime(api) {
    api.registerHttpRoute({
      path: "/my-channel/events",
      auth: "plugin",
      handler: async (req, res) => {
        /* 仅限设置的安全路由 */
      },
    });
  },
});
```

仅当设置流程确实需要轻量级运行时 setter，或需要为未配置的通道提供设置安全的网关接口时，才使用此方式。
`registerSetupRuntime` 仅在 `"setup-runtime"` 加载时运行；请将其限制为配置专用路由，或该设置流程所需的方法。

## 注册模式

`api.registrationMode` 会告诉你的插件它是如何被加载的：

| 模式               | 何时                                               | 要注册的内容                                                                                                    |
| ------------------ | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `"full"`           | 正常网关启动                                       | 全部内容                                                                                                        |
| `"discovery"`      | 只读能力发现                                       | 频道注册、静态 CLI 描述符和非激活 provider；跳过套接字、worker、客户端和服务 |
| `"tool-discovery"` | 以限定范围加载，用于列出或运行特定插件的工具       | 仅能力/工具注册；不激活频道                                                                                     |
| `"setup-only"`     | 已禁用/未配置的频道                                | 仅频道注册                                                                                                      |
| `"setup-runtime"`  | 设置流程中且运行时可用                             | 频道注册，以及设置期间所需的轻量级运行时                                                                         |
| `"cli-metadata"`   | 捕获根帮助/CLI 元数据                              | 仅 CLI 描述符                                                                                                   |

`defineChannelPluginEntry` 会自动处理这种拆分。如果你直接为频道使用
`definePluginEntry`，请自行检查模式，并记住
`"tool-discovery"` 会跳过频道注册：

```typescript
register(api) {
  if (
    api.registrationMode === "cli-metadata" ||
    api.registrationMode === "discovery" ||
    api.registrationMode === "full"
  ) {
    api.registerCli(/* ... */);
    if (api.registrationMode === "cli-metadata") return;
  }

  if (api.registrationMode === "tool-discovery") {
    // 仅注册能力可见面（providers/tools），不注册频道。
    return;
  }

  api.registerChannel({ plugin: myPlugin });
  if (api.registrationMode !== "full") return;

  // 仅运行时的重型注册
  api.registerService(/* ... */);
}
```

长生命周期服务可以通过其服务上下文发出小型失效或生命周期事件：

```typescript
api.registerService({
  id: "index-events",
  start(ctx) {
    ctx.gatewayEvents?.emit("changed", { revision: 1 }, { scope: "operator.read" });
  },
});
```

OpenClaw 将其命名空间化为 `plugin.<plugin-id>.changed`。事件名称必须是
一个小写段，负载必须是有界 JSON，并且 scope 必须是
`operator.read`、`operator.write` 或 `operator.admin`。发射器仅在
服务生命周期内存在，并会在停止或启动失败后撤销。优先使用版本
或失效负载，而不是完整记录，这样被授权的客户端可以通过插件的作用域
Gateway 方法重新读取规范状态。

发现模式会构建一个不会激活的注册表快照。它仍然可能
评估插件入口和频道插件对象，以便 OpenClaw 可以
注册频道能力和静态 CLI 描述符。将发现模式下的模块
评估视为可信但轻量：顶层不要进行网络客户端、
子进程、监听器、数据库连接、后台 worker、
凭据读取或其他实时运行时副作用。

将 `"setup-runtime"` 视为这样一个窗口：此时必须存在仅用于设置启动的入口，
但不能重新进入完整打包的频道运行时。适合的内容包括
频道注册、设置安全的 HTTP 路由、设置安全的网关方法，以及
委派的设置辅助程序。繁重的后台服务、CLI 注册器，以及
provider/client SDK 启动逻辑仍然应属于 `"full"`。

## 插件形态

OpenClaw 根据已加载插件的注册行为对其进行分类：

| 形态                  | 描述                                           |
| --------------------- | ---------------------------------------------- |
| **plain-capability**  | 一种能力类型（例如，仅 provider）              |
| **hybrid-capability** | 多种能力类型（例如，provider + speech）        |
| **hook-only**         | 仅有 hooks，没有 capabilities                  |
| **non-capability**    | 工具/命令/服务，但没有 capabilities             |

使用 `openclaw plugins inspect <id>` 查看插件的形态。

## 相关内容

- [SDK 概览](/plugins/sdk-overview) - 注册 API 和子路径参考
- [运行时辅助工具](/plugins/sdk-runtime) - `api.runtime` 和 `createPluginRuntimeStore`
- [设置与配置](/plugins/sdk-setup) - 清单和设置入口加载
- [频道插件](/plugins/sdk-channel-plugins) - 构建 `ChannelPlugin` 对象
- [提供商插件](/plugins/sdk-provider-plugins) - 提供商注册和钩子函数。
