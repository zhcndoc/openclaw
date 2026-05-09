---
summary: "definePluginEntry、defineChannelPluginEntry 和 defineSetupPluginEntry 参考"
title: "插件入口点"
sidebarTitle: "入口点"
read_when:
  - 你需要 definePluginEntry 或 defineChannelPluginEntry 的精确类型签名
  - 你想了解注册模式（完整、setup 或 CLI 元数据）
  - 你正在查找入口点选项
---

每个插件都会导出一个默认入口对象。SDK 提供了三个辅助函数用于创建它们。

对于已安装的插件，`package.json` 在可用时应将运行时加载指向构建后的 JavaScript：

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

`extensions` 和 `setupEntry` 对于工作区和 git
检出开发仍然有效。`runtimeExtensions` 和 `runtimeSetupEntry`
在 OpenClaw 加载已安装包时更受青睐，并允许 npm 包避免运行时
TypeScript 编译。显式运行时入口是必需的：`runtimeSetupEntry`
需要 `setupEntry`，而缺少 `runtimeExtensions` 或 `runtimeSetupEntry`
制品会导致安装/发现失败，而不是静默回退到源代码。如果
已安装包只声明了一个 TypeScript 源入口，OpenClaw 会在存在时使用
匹配的构建后 `dist/*.js` 同级文件，然后再回退到 TypeScript
源文件。

所有入口路径都必须保持在插件包目录内。运行时入口以及推断出的构建后 JavaScript 同级文件，不能让一个会越界的 `extensions` 或 `setupEntry` 源路径变得有效。

<Tip>
  **在寻找操作指南吗？** 请参见 [Channel Plugins](/plugins/sdk-channel-plugins) 或 [Provider Plugins](/plugins/sdk-provider-plugins) 获取逐步指南。
</Tip>

## `definePluginEntry`

**导入：** `openclaw/plugin-sdk/plugin-entry`

适用于 provider 插件、tool 插件、hook 插件，以及任何**不是**消息通道的内容。

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

| Field          | Type                                                             | Required | Default             |
| -------------- | ---------------------------------------------------------------- | -------- | ------------------- |
| `id`           | `string`                                                         | Yes      | -                   |
| `name`         | `string`                                                         | Yes      | -                   |
| `description`  | `string`                                                         | Yes      | -                   |
| `kind`         | `string`                                                         | No       | -                   |
| `configSchema` | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | No       | Empty object schema |
| `register`     | `(api: OpenClawPluginApi) => void`                               | Yes      | -                   |

- `id` 必须与 `openclaw.plugin.json` 清单匹配。
- `kind` 用于独占槽位：`"memory"` 或 `"context-engine"`。
- `configSchema` 可以是一个用于延迟求值的函数。
- OpenClaw 会在首次访问时解析并记忆化该 schema，因此开销较大的 schema 构建器只会运行一次。

## `defineChannelPluginEntry`

**导入：** `openclaw/plugin-sdk/channel-core`

对 `definePluginEntry` 进行通道特定封装。它会自动调用 `api.registerChannel({ plugin })`，暴露一个可选的根帮助 CLI 元数据接口，并根据注册模式对 `registerFull` 进行门控。

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

| Field                 | Type                                                             | Required | Default             |
| --------------------- | ---------------------------------------------------------------- | -------- | ------------------- |
| `id`                  | `string`                                                         | Yes      | -                   |
| `name`                | `string`                                                         | Yes      | -                   |
| `description`         | `string`                                                         | Yes      | -                   |
| `plugin`              | `ChannelPlugin`                                                  | Yes      | -                   |
| `configSchema`        | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | No       | Empty object schema |
| `setRuntime`          | `(runtime: PluginRuntime) => void`                               | No       | -                   |
| `registerCliMetadata` | `(api: OpenClawPluginApi) => void`                               | No       | -                   |
| `registerFull`        | `(api: OpenClawPluginApi) => void`                               | No       | -                   |

- `setRuntime` 会在注册期间调用，因此你可以存储运行时引用
  （通常通过 `createPluginRuntimeStore`）。在 CLI 元数据
  捕获期间会跳过它。
- `registerCliMetadata` 会在 `api.registrationMode === "cli-metadata"`、
  `api.registrationMode === "discovery"` 以及
  `api.registrationMode === "full"` 时运行。
  当作通道拥有的 CLI 描述符的规范放置位置，以便根帮助保持非激活、发现快照包含静态命令元数据，并且常规 CLI 命令注册仍然与完整插件加载兼容。
- 发现注册是非激活的，但不是免导入的。OpenClaw 可能会
  评估受信任的插件入口和通道插件模块来构建
  快照，因此请保持顶层导入无副作用，并将 sockets、
  clients、workers 和 services 放在仅 `"full"` 的路径之后。
- `registerFull` 仅在 `api.registrationMode === "full"` 时运行。它会在
  仅 setup 加载期间被跳过。
- 与 `definePluginEntry` 类似，`configSchema` 可以是延迟工厂，OpenClaw
  会在首次访问时对解析后的 schema 进行记忆化。
- 对于插件拥有的根 CLI 命令，当你希望命令保持懒加载但又不从
  根 CLI 解析树中消失时，请优先使用 `api.registerCli(..., { descriptors: [...] })`。
  对于成对节点功能命令，请优先使用
  `api.registerNodeCliFeature(...)`，这样命令会落在 `openclaw nodes` 下。
  对于其他嵌套插件命令，请添加 `parentPath` 并在传给注册器的
  `program` 对象上注册命令；OpenClaw 会在调用插件前将其解析为
  父命令。对于通道插件，请优先从
  `registerCliMetadata(...)` 注册这些描述符，并让 `registerFull(...)`
  专注于仅运行时工作。
- 如果 `registerFull(...)` 还注册 gateway RPC 方法，请将它们保留在
  插件专用前缀下。保留的核心管理员命名空间（`config.*`、
  `exec.approvals.*`、`wizard.*`、`update.*`）始终会被强制归类为
  `operator.admin`。

## `defineSetupPluginEntry`

**导入：** `openclaw/plugin-sdk/channel-core`

用于轻量级的 `setup-entry.ts` 文件。只返回 `{ plugin }`，不包含运行时或 CLI 接线。

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineSetupPluginEntry(myChannelPlugin);
```

当通道被禁用、未配置，或者启用了延迟加载时，OpenClaw 会加载这个入口而不是完整入口。有关这在何时重要，请参见 [Setup and Config](/plugins/sdk-setup#setup-entry)。

实践中，将 `defineSetupPluginEntry(...)` 与以下窄范围 setup 辅助族配对使用：

- `openclaw/plugin-sdk/setup-runtime`，用于运行时安全的 setup 辅助，例如
  import-safe setup patch 适配器、lookup-note 输出、
  `promptResolvedAllowFrom`、`splitSetupEntries` 和委托式 setup 代理
- `openclaw/plugin-sdk/channel-setup`，用于可选安装的 setup 表面
- `openclaw/plugin-sdk/setup-tools`，用于 setup/install CLI/archive/docs 辅助

将重型 SDK、CLI 注册以及长生命周期的运行时服务保留在完整入口中。

分离 setup 和 runtime 表面的打包工作区通道可以改用
`openclaw/plugin-sdk/channel-entry-contract` 中的 `defineBundledChannelSetupEntry(...)`。
该契约允许 setup 入口保留 setup 安全的 plugin/secrets 导出，同时仍然暴露一个运行时 setter：

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
});
```

只有在 setup 流程确实需要在完整通道入口加载之前提供一个轻量级运行时 setter 时，才使用这个打包契约。

## 注册模式

`api.registrationMode` 会告诉你的插件它是如何被加载的：

| 模式              | 何时                                  | 需要注册的内容                                                                                                          |
| ----------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `"full"`          | 正常 gateway 启动                      | 全部内容                                                                                                               |
| `"discovery"`     | 只读能力发现                          | 通道注册加静态 CLI 描述符；入口代码可能会加载，但要跳过 sockets、workers、clients 和 services                         |
| `"setup-only"`    | 被禁用/未配置的通道                   | 仅通道注册                                                                                                             |
| `"setup-runtime"` | 带有可用运行时的 setup 流程            | 通道注册加上在完整入口加载之前所需的轻量级运行时                                                                     |
| `"cli-metadata"`  | 根帮助 / CLI 元数据捕获               | 仅 CLI 描述符                                                                                                          |

`defineChannelPluginEntry` 会自动处理这种拆分。如果你直接为通道使用 `definePluginEntry`，则需要自己检查模式：

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

  api.registerChannel({ plugin: myPlugin });
  if (api.registrationMode !== "full") return;

  // 仅运行时的重型注册
  api.registerService(/* ... */);
}
```

发现模式会构建一个非激活的注册表快照。它仍可能计算插件入口和通道插件对象，以便 OpenClaw 可以注册通道能力和静态 CLI 描述符。将发现过程中的模块求值视为受信任但轻量：不要在顶层引入网络客户端、子进程、监听器、数据库连接、后台 worker、凭据读取或其他实时运行时副作用。

将 `"setup-runtime"` 视为 setup-only 启动表面必须存在、但不能重新进入完整打包通道运行时的窗口。适合的内容包括通道注册、setup 安全的 HTTP 路由、setup 安全的 gateway 方法，以及委托式 setup 辅助。重型后台服务、CLI 注册器和 provider/client SDK 启动仍然属于 `"full"`。

针对 CLI 注册器而言：

- 当注册器拥有一个或多个根命令，并且你希望 OpenClaw 在首次调用时懒加载真实的 CLI 模块时，请使用 `descriptors`
- 确保这些描述符覆盖注册器暴露的每一个顶层命令根
- 将描述符命令名限制为字母、数字、连字符和下划线，并且以字母或数字开头；OpenClaw 会拒绝不符合该形状的描述符名称，并在渲染帮助之前剥离描述中的终端控制序列
- 仅在急切兼容路径中单独使用 `commands`

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
