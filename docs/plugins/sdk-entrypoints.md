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
      execute: async ({ symbol }, config) => ({ symbol, hasKey: Boolean(config.apiKey) }),
    }),
  ],
});
```

- `configSchema` 是可选的；如果省略，它会使用严格的空对象 schema
  （生成的清单中仍然会包含 `configSchema`）。
- `execute` 返回普通字符串或可 JSON 序列化的值；该辅助函数会将其包装为文本工具结果，并将 `details` 设为原始的
  （未字符串化的）返回值。
- 对于自定义工具结果，`openclaw/plugin-sdk/tool-results` 导出
  `textResult` 和 `jsonResult`。
- 工具名称是静态的，因此 `openclaw plugins build` 会根据声明的工具推导
  `contracts.tools`，无需手动重复书写名称。
- 运行时加载仍然是严格的：已安装的插件仍然需要
  `openclaw.plugin.json` 和 `package.json` 中的 `openclaw.extensions`。OpenClaw
  从不会执行插件代码来推断缺失的清单数据。

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
    api.registerProvider({
      /* ... */
    });
    api.registerTool({
      /* ... */
    });
  },
});
```

| 字段                      | 类型                                                             | 必需 | 默认值              |
| ------------------------- | ---------------------------------------------------------------- | ---- | ------------------- |
| `id`                      | `string`                                                         | 是   | -                   |
| `name`                    | `string`                                                         | 是   | -                   |
| `description`             | `string`                                                         | 是   | -                   |
| `kind`                   | `string`（已弃用，见下文）                                       | 否   | -                   |
| `configSchema`            | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | 否   | 空对象 schema       |
| `reload`                  | `OpenClawPluginReloadRegistration`                               | 否   | -                   |
| `nodeHostCommands`        | `OpenClawPluginNodeHostCommand[]`                                | 否   | -                   |
| `securityAuditCollectors` | `OpenClawPluginSecurityAuditCollector[]`                         | 否   | -                   |
| `register`                | `(api: OpenClawPluginApi) => void`                               | 是   | -                   |

- `id` 必须与您的 `openclaw.plugin.json` 清单匹配。
- `kind` 已弃用：请改为在 `openclaw.plugin.json` 清单的 `kind` 字段中声明一个独占槽位（`"memory"` 或
  `"context-engine"`）。运行时入口的 `kind` 仅作为旧插件的兼容性回退保留。
- `configSchema` 可以是一个用于延迟求值的函数。OpenClaw 会在首次访问时解析并
  记忆该 schema，因此昂贵的 schema 构建器只会运行一次。

## `defineChannelPluginEntry`

**导入：** `openclaw/plugin-sdk/channel-core`

使用通道特定的接线封装 `definePluginEntry`：它会自动
调用 `api.registerChannel({ plugin })`，提供一个可选的根帮助 CLI
元数据挂钩，并在注册模式上对 `registerFull` 进行门控。

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
});
```

| 字段                | 类型                                                             | 必需 | 默认值              |
| ------------------- | ---------------------------------------------------------------- | ---- | ------------------- |
| `id`                | `string`                                                         | 是   | -                   |
| `name`              | `string`                                                         | 是   | -                   |
| `description`       | `string`                                                         | 是   | -                   |
| `plugin`            | `ChannelPlugin`                                                  | 是   | -                   |
| `configSchema`      | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | 否   | 空对象 schema       |
| `setRuntime`        | `(runtime: PluginRuntime) => void`                               | 否   | -                   |
| `registerCliMetadata` | `(api: OpenClawPluginApi) => void`                             | 否   | -                   |
| `registerFull`      | `(api: OpenClawPluginApi) => void`                               | 否   | -                   |

回调会根据注册模式运行（完整表格见
[注册模式](#registration-mode)）：

- `setRuntime` 会在除 `"cli-metadata"` 和
  `"tool-discovery"` 之外的所有模式下运行。请在这里保存 runtime 引用，通常可通过
  `createPluginRuntimeStore` 实现。
- `registerCliMetadata` 会在 `"cli-metadata"`、`"discovery"` 和
  `"full"` 下运行。请将其作为通道拥有的 CLI 描述符的规范位置，
  这样根帮助就能保持非激活，发现快照能包含静态命令元数据，
  而常规 CLI 注册仍能与完整插件加载兼容。
- `registerFull` 只会在 `"full"` 和 `"tool-discovery"` 下运行。对于
  `"tool-discovery"`，它会 _替代_ 通道注册运行：OpenClaw 会完全跳过 `registerChannel`/`setRuntime`，
  只调用 `registerFull`，因此你的通道在独立工具发现或执行时所需的任何 provider/tool 注册
  都必须放在这里，而不能依赖常规通道初始化。
- 发现注册不会激活，但也不是完全免导入：OpenClaw 可能会
  求值受信任的插件入口和通道插件模块来构建快照。
  请让顶层导入保持无副作用，并将 socket、客户端、worker 和服务
  放到仅 `"full"` 的路径之后。
- 与 `definePluginEntry` 类似，`configSchema` 可以是一个惰性工厂；OpenClaw
  会在首次访问时缓存解析后的 schema。

CLI 注册：

- 对于你希望按需加载、但又不希望从根 CLI 解析树中消失的插件拥有的根级 CLI 命令，
  使用 `api.registerCli(..., { descriptors: [...] })`。描述符名称必须匹配字母、数字、连字符和下划线，
  且必须以字母或数字开头；OpenClaw 会拒绝其他形状，
  并在渲染帮助前剥离描述中的终端控制序列。请覆盖注册器公开的每一个顶层命令根。
  仅使用 `commands` 仍会停留在急切兼容路径上。
- 对于成对节点功能命令，使用 `api.registerNodeCliFeature(...)`，
  这样它们会落在 `openclaw nodes` 下（等同于
  `registerCli(registrar, { parentPath: ["nodes"], ... })`）。
- 对于其他嵌套的插件命令，请添加 `parentPath` 并在传给注册器的 `program` 对象上注册命令；
  OpenClaw 会在调用插件之前将其解析为父命令。
- 对于通道插件，请在 `registerCliMetadata` 中注册 CLI 描述符，
  并让 `registerFull` 专注于仅运行时工作。
- 如果 `registerFull` 还注册 gateway RPC 方法，请将它们放在
  插件专属前缀下。保留的核心管理命名空间（`config.*`、
  `exec.approvals.*`、`wizard.*`、`update.*`）总是会强制转换为
  `operator.admin`。

## `defineSetupPluginEntry`

**导入：** `openclaw/plugin-sdk/channel-core`

用于轻量级的 `setup-entry.ts` 文件。只返回 `{ plugin }`，不包含运行时或 CLI 接线。

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineSetupPluginEntry(myChannelPlugin);
```

当通道被禁用、未配置，或者启用了延迟加载时，OpenClaw 会加载这个入口而不是完整入口。有关这在何时重要，请参见 [Setup and Config](/plugins/sdk-setup#setup-entry)。

将 `defineSetupPluginEntry(...)` 与以下更窄的 setup 辅助家族搭配使用：

| 导入                               | 用途                                                                                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw/plugin-sdk/setup-runtime` | 运行时安全的 setup 辅助：`createSetupTranslator`、可导入安全的 setup patch 适配器、lookup-note 输出、`promptResolvedAllowFrom`、`splitSetupEntries`、委托式 setup 代理 |
| `openclaw/plugin-sdk/channel-setup` | 可选安装的 setup 表面                                                                                                                               |
| `openclaw/plugin-sdk/setup-tools`   | setup/install CLI、归档和文档辅助                                                                                                                    |

将重量级 SDK、CLI 注册和长期运行的运行时服务保留在完整入口中。

拆分 setup 和 runtime 表面的打包工作区通道可以改用 `openclaw/plugin-sdk/channel-entry-contract` 中的 `defineBundledChannelSetupEntry(...)`。它允许 setup 入口保留 setup 安全的 plugin/secrets 导出，同时仍然暴露一个 runtime setter：

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
        /* 仅限 setup 的安全路由 */
      },
    });
  },
});
```

仅在 setup 流程在完整通道入口加载之前，确实需要一个轻量级 runtime setter 或 setup 安全网关表面时才使用它。`registerSetupRuntime` 仅在 `"setup-runtime"` 加载时运行；请将其限制为仅配置路由或在延迟的完整激活之前必须存在的方法。

## 注册模式

`api.registrationMode` 会告诉你的插件它是如何被加载的：

| 模式               | 何时                                               | 需要注册什么                                                                                                        |
| ------------------ | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `"full"`           | 正常网关启动                             | 全部内容                                                                                                              |
| `"discovery"`      | 只读的能力发现                     | 频道注册加静态 CLI 描述符；入口代码可以加载，但应跳过 sockets、workers、clients 和 services |
| `"tool-discovery"` | 仅限定范围加载，用于列出或运行特定插件的工具 | 仅能力/工具注册；不激活频道                                                                |
| `"setup-only"`     | 已禁用/未配置的频道                      | 仅频道注册                                                                                               |
| `"setup-runtime"`  | 可用运行时的设置流程                  | 频道注册，加上在完整入口加载之前所需的轻量级运行时                               |
| `"cli-metadata"`   | 根帮助 / CLI 元数据捕获                   | 仅 CLI 描述符                                                                                                    |

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

发现模式会构建一个不会激活的注册表快照。它仍然可能
评估插件入口和频道插件对象，以便 OpenClaw 可以
注册频道能力和静态 CLI 描述符。请将发现模式下的模块
求值视为受信任但轻量级：顶层不要有网络客户端、
子进程、监听器、数据库连接、后台 worker、
凭证读取或其他实时运行时副作用。

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

## 相关

- [SDK 概览](/plugins/sdk-overview) - 注册 API 和子路径参考
- [运行时辅助工具](/plugins/sdk-runtime) - `api.runtime` 和 `createPluginRuntimeStore`
- [设置与配置](/plugins/sdk-setup) - 清单、设置入口、延迟加载
- [通道插件](/plugins/sdk-channel-plugins) - 构建 `ChannelPlugin` 对象
- [提供者插件](/plugins/sdk-provider-plugins) - 提供者注册和 hooks
