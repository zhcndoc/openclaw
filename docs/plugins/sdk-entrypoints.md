---
summary: "definePluginEntry、defineChannelPluginEntry 和 defineSetupPluginEntry 参考"
title: "插件入口点"
sidebarTitle: "入口点"
read_when:
  - 你需要 definePluginEntry 或 defineChannelPluginEntry 的确切类型签名
  - 你想了解注册模式（完整 vs 设置 vs CLI 元数据）
  - 你正在查找入口点选项
---

每个插件都会导出一个默认入口对象。SDK 提供了三个辅助函数用于
创建它们。

对于已安装的插件，如果可用，`package.json` 应将运行时加载指向已构建的
JavaScript：

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
检出开发仍然是有效的源入口。`runtimeExtensions` 和 `runtimeSetupEntry` 在 OpenClaw 加载已安装包时更受青睐，
并允许 npm 包避免在运行时进行 TypeScript 编译。如果已安装包只声明了一个 TypeScript
源入口，OpenClaw 会在存在匹配的已构建 `dist/*.js` 伴随文件时使用它，然后回退到 TypeScript 源码。

所有入口路径都必须保持在插件包目录内。运行时入口和推断出的已构建 JavaScript 伴随文件不会使逃逸的
`extensions` 或 `setupEntry` 源路径变为有效。

<Tip>
  **寻找逐步指南？** 请参阅 [频道插件](/plugins/sdk-channel-plugins)
  或 [提供者插件](/plugins/sdk-provider-plugins) 获取逐步指南。
</Tip>

## `definePluginEntry`

**Import:** `openclaw/plugin-sdk/plugin-entry`

适用于提供者插件、工具插件、钩子插件以及任何**不是**消息频道的插件。

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "my-plugin",
  name: "My Plugin",
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

| 字段           | 类型                                                             | 必填 | 默认             |
| -------------- | ---------------------------------------------------------------- | -------- | ------------------- |
| `id`           | `string`                                                         | 是      | —                   |
| `name`        | `string`                                                         | 是      | —                   |
| `description`  | `string`                                                         | 是      | —                   |
| `kind`         | `string`                                                         | 否       | —                   |
| `configSchema` | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | 否       | 空对象架构 |
| `register`     | `(api: OpenClawPluginApi) => void`                               | 是      | —                   |

- `id` 必须与您的 `openclaw.plugin.json` 清单匹配。
- `kind` 用于互斥槽位：`"memory"` 或 `"context-engine"`。
- `configSchema` 可以是用于延迟求值的函数。
- OpenClaw 会在首次访问时解析并缓存该架构，因此昂贵的架构
  构建器只会运行一次。

## `defineChannelPluginEntry`

**Import:** `openclaw/plugin-sdk/channel-core`

使用频道特定的连接包装 `definePluginEntry`。自动调用
`api.registerChannel({ plugin })`，暴露可选的根帮助 CLI 元数据接口点，并根据注册模式限制 `registerFull`。

```typescript
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineChannelPluginEntry({
  id: "my-channel",
  name: "My Channel",
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

| 字段                 | 类型                                                             | 必填 | 默认             |
| --------------------- | ---------------------------------------------------------------- | -------- | ------------------- |
| `id`                  | `string`                                                         | 是      | —                   |
| `name`                  | `string`                                                         | 是      | —                   |
| `description`         | `string`                                                         | 是      | —                   |
| `plugin`              | `ChannelPlugin`                                                  | 是      | —                   |
| `configSchema`        | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | 否       | 空对象架构 |
| `setRuntime`          | `(runtime: PluginRuntime) => void`                               | 否       | —                   |
| `registerCliMetadata` | `(api: OpenClawPluginApi) => void`                               | 否       | —                   |
| `registerFull`        | `(api: OpenClawPluginApi) => void`                               | 否       | —                   |

- `setRuntime` 在注册期间调用，因此你可以存储运行时引用
  （通常通过 `createPluginRuntimeStore`）。它会在 CLI 元数据捕获期间被跳过。
- `registerCliMetadata` 会在 `api.registrationMode === "cli-metadata"`
  和 `api.registrationMode === "full"` 两种情况下运行。
  将其用作频道拥有的 CLI 描述符的规范位置，这样根帮助既保持不激活，
  又能让常规 CLI 命令注册与完整插件加载兼容。
- `registerFull` 仅在 `api.registrationMode === "full"` 时运行。它会在
  仅设置加载期间被跳过。
- 与 `definePluginEntry` 类似，`configSchema` 可以是惰性工厂，OpenClaw 会在首次访问时缓存解析后的架构。
- 对于插件拥有的根 CLI 命令，当你希望命令保持懒加载但又不会从根 CLI 解析树中消失时，优先使用
  `api.registerCli(..., { descriptors: [...] })`。对于频道插件，优先从
  `registerCliMetadata(...)` 注册这些描述符，并让 `registerFull(...)` 专注于仅运行时工作。
- 如果 `registerFull(...)` 还注册了 gateway RPC 方法，请将它们保留在
  插件特定前缀下。保留的核心管理员命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）始终会被强制为 `operator.admin`。

## `defineSetupPluginEntry`

**Import:** `openclaw/plugin-sdk/channel-core`

用于轻量级的 `setup-entry.ts` 文件。仅返回 `{ plugin }`，没有
运行时或 CLI 连接。

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineSetupPluginEntry(myChannelPlugin);
```

当频道被禁用、未配置或启用延迟加载时，OpenClaw 会加载此项而不是完整入口。请参阅
[设置和配置](/plugins/sdk-setup#setup-entry) 了解何时重要。

实际上，请将 `defineSetupPluginEntry(...)` 与以下窄范围 setup 辅助家族配对：

- `openclaw/plugin-sdk/setup-runtime`，用于运行时安全的 setup 辅助，例如
  import-safe setup patch 适配器、lookup-note 输出、
  `promptResolvedAllowFrom`、`splitSetupEntries` 和委托式 setup 代理
- `openclaw/plugin-sdk/channel-setup`，用于可选安装的 setup 表面
- `openclaw/plugin-sdk/setup-tools`，用于 setup/install CLI/archive/docs 辅助

将重型 SDK、CLI 注册以及长生命周期运行时服务保留在完整
入口中。

拆分 setup 和 runtime 表面的捆绑工作区频道可以改用
`openclaw/plugin-sdk/channel-entry-contract` 中的
`defineBundledChannelSetupEntry(...)`。该契约允许 setup 入口保留 setup-safe 的插件/密钥导出，同时仍然暴露一个运行时设置器：

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

仅当 setup 流程在完整频道入口加载之前确实需要一个轻量级运行时
设置器时，才使用该捆绑契约。

## Registration mode

`api.registrationMode` 告诉你的插件它是如何被加载的：

| Mode              | When                              | What to register                                                                          |
| --------------------- | --------------------------------- | ----------------------------------------------------------------------------------------- |
| `"full"`          | 正常 gateway 启动            | 所有内容                                                                                |
| `"setup-only"`    | 已禁用/未配置的频道     | 仅频道注册                                                                 |
| `"setup-runtime"` | 具有可用运行时的 setup 流程 | 频道注册加上在完整入口加载前所需的轻量级运行时 |
| `"cli-metadata"`  | 根帮助 / CLI 元数据捕获  | 仅 CLI 描述符                                                                      |

`defineChannelPluginEntry` 自动处理这种拆分。如果你直接为频道使用
`definePluginEntry`，请自行检查模式：

```typescript
register(api) {
  if (api.registrationMode === "cli-metadata" || api.registrationMode === "full") {
    api.registerCli(/* ... */);
    if (api.registrationMode === "cli-metadata") return;
  }

  api.registerChannel({ plugin: myPlugin });
  if (api.registrationMode !== "full") return;

  // 仅重型运行时注册
  api.registerService(/* ... */);
}
```

将 `"setup-runtime"` 视为 setup-only 启动表面必须存在、
但又不能重新进入完整捆绑频道运行时的窗口。适合的内容包括频道注册、setup-safe HTTP 路由、setup-safe gateway 方法以及委托式 setup 辅助。重型后台服务、CLI 注册器和提供者/客户端 SDK 启动仍然属于 `"full"`。

就 CLI 注册器而言，具体来说：

- 当注册器拥有一个或多个根命令且你
  希望 OpenClaw 在首次调用时懒加载真正的 CLI 模块时，使用 `descriptors`
- 确保这些描述符涵盖注册器暴露的每个顶级命令根
- 仅将 `commands` 用于急切兼容路径

## 插件形态

OpenClaw 根据其注册行为对加载的插件进行分类：

| 形态                 | 描述                                        |
| --------------------- | -------------------------------------------------- |
| **plain-capability**  | 单一能力类型（例如仅提供者）           |
| **hybrid-capability** | 多种能力类型（例如提供者 + 语音） |
| **hook-only**         | 仅钩子，无能力                        |
| **non-capability**    | 工具/命令/服务但无能力        |

使用 `openclaw plugins inspect <id>` 查看插件的形态。

## 相关内容

- [SDK 概览](/plugins/sdk-overview) — 注册 API 和子路径参考
- [运行时助手](/plugins/sdk-runtime) — `api.runtime` 和 `createPluginRuntimeStore`
- [设置和配置](/plugins/sdk-setup) — 清单、设置入口、延迟加载
- [频道插件](/plugins/sdk-channel-plugins) — 构建 `ChannelPlugin` 对象
- [提供者插件](/plugins/sdk-provider-plugins) — 提供者注册和钩子
