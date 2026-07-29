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

- `configSchema` is optional; omitting it uses a strict empty object schema
  (the generated manifest still includes `configSchema`).
- `execute` returns a plain string or JSON-serializable value; the helper
  wraps it as a text tool result with `details` set to the original
  (unstringified) return value.
- `outputSchema` optionally describes that original `details` value for Code
  Mode and Tool Search. Catalog calls reject an invalid schema before execution
  and validate the final value before returning it.
- For custom tool results, `openclaw/plugin-sdk/tool-results` exports
  `textResult` and `jsonResult`.
- Tool names are static, so `openclaw plugins build` derives
  `contracts.tools` from the declared tools without hand-duplicated names.
- Runtime loading stays strict: installed plugins still need
  `openclaw.plugin.json` and `package.json` `openclaw.extensions`. OpenClaw
  never executes plugin code to infer missing manifest data.

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

- `id` must match your `openclaw.plugin.json` manifest.
- External session catalogs use
  `openclaw/plugin-sdk/session-catalog` and
  `api.registerSessionCatalog({ id, label, list, read, continueSession?, archive? })`.
  Core owns the `sessions.catalog.*` Gateway methods; providers return host,
  session, and normalized transcript projections without registering RPCs. A
  list provider should call the optional `onHost(host)` callback as each host
  settles; the returned host array remains required as the final compatibility
  snapshot.
- `kind` is deprecated: declare an exclusive slot (`"memory"` or
  `"context-engine"`) in the `openclaw.plugin.json` manifest `kind` field
  instead. Runtime-entry `kind` remains only as a compatibility fallback for
  older plugins.
- `configSchema` can be a function for lazy evaluation. OpenClaw resolves and
  memoizes the schema on first access, so expensive schema builders only run
  once.
- A `nodeHostCommands` descriptor can define `isAvailable({ config, env })`.
  Returning `false` omits that command and its capability from the headless
  node's Gateway declaration. OpenClaw evaluates it against the node-local
  startup config; command handlers should still validate availability when
  invoked.

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
  而常规 CLI 注册仍然能与完整插件加载兼容。
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

- Use `api.registerCli(..., { descriptors: [...] })` for plugin-owned root
  CLI commands you want lazy-loaded without disappearing from the root CLI
  parse tree. Descriptor names must match letters, numbers, hyphen, and
  underscore, starting with a letter or number; OpenClaw rejects other
  shapes and strips terminal control sequences from descriptions before
  rendering help. Cover every top-level command root the registrar exposes.
  `commands` alone stays on the eager compatibility path.
- Root descriptors may define a synchronous, pure
  `machineOutput({ argv, stdoutIsTTY })` resolver for JSON, JSONL, or other
  machine-readable stdout modes that are not selected solely by `--json`.
  Parse command tokens with `getRootOptionAwareCommandPath` from
  `openclaw/plugin-sdk/cli-argv`. Keep the resolver in lightweight CLI metadata
  and share it with full registration. Nested descriptors do not expose this
  field.
- Use `api.registerNodeCliFeature(...)` for paired-node feature commands so
  they land under `openclaw nodes` (equivalent to
  `registerCli(registrar, { parentPath: ["nodes"], ... })`).
- For other nested plugin commands, add `parentPath` and register commands
  on the `program` object passed to the registrar; OpenClaw resolves it to
  the parent command before calling the plugin.
- For channel plugins, register CLI descriptors from `registerCliMetadata`
  and keep `registerFull` focused on runtime-only work.
- If `registerFull` also registers gateway RPC methods, keep them on a
  plugin-specific prefix. Reserved core admin namespaces (`config.*`,
  `exec.approvals.*`, `wizard.*`, `update.*`) always coerce to
  `operator.admin`.

## `defineSetupPluginEntry`

**导入：** `openclaw/plugin-sdk/channel-core`

用于轻量级的 `setup-entry.ts` 文件。只返回 `{ plugin }`，不包含运行时或 CLI 接线。

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineSetupPluginEntry(myChannelPlugin);
```

当通道被禁用、未配置，或者启用了延迟加载时，OpenClaw 会加载这个入口而不是完整入口。有关这在何时重要，请参见 [Setup and Config](/plugins/sdk-setup#setup-entry)。

将 `defineSetupPluginEntry(...)` 与以下更窄的 setup 辅助家族搭配使用：

| Import                                  | Use for                                                                                                                                                                            |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw/plugin-sdk/setup-runtime`     | Runtime-safe setup helpers: `createSetupTranslator`, import-safe setup patch adapters, lookup-note output, `promptResolvedAllowFrom`, `splitSetupEntries`, delegated setup proxies |
| `openclaw/plugin-sdk/channel-setup`     | Optional-install setup surfaces                                                                                                                                                    |
| `openclaw/plugin-sdk/channel-dm-policy` | Account-aware DM policy descriptors for setup flows                                                                                                                                |
| `openclaw/plugin-sdk/setup-tools`       | Setup/install CLI, archive, and docs helpers                                                                                                                                       |
| `openclaw/plugin-sdk/archive`           | Bounded archive extraction and single-entry reads                                                                                                                                  |
| `openclaw/plugin-sdk/root-walk`         | Budgeted, root-bounded directory walking                                                                                                                                           |
| `openclaw/plugin-sdk/secret-file`       | Pinned secret reads and first-writer-wins creation                                                                                                                                 |

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

## 相关

- [SDK 概览](/plugins/sdk-overview) - 注册 API 和子路径参考
- [运行时辅助工具](/plugins/sdk-runtime) - `api.runtime` 和 `createPluginRuntimeStore`
- [设置与配置](/plugins/sdk-setup) - 清单、设置入口、延迟加载
- [通道插件](/plugins/sdk-channel-plugins) - 构建 `ChannelPlugin` 对象
- [提供者插件](/plugins/sdk-provider-plugins) - 提供者注册和 hooks
