---
summary: "通道进入助手、其模式门控回调和 CLI 注册"
title: "插件 SDK DefineChannelPluginEntry 帮助程序"
sidebarTitle: "定义ChannelPluginEntry"
read_when:
  - "您正在编写一个消息通道插件"
  - "您需要知道哪个回调在哪种注册模式下运行"
  - "您正在注册插件拥有的根 CLI 命令"
---

使用特定于通道的接线和模式门控回调包装 `definePluginEntry` 的入口助手。 [插件入口点部分参考](/plugins/sdk-entrypoints)。

## `defineChannelPluginEntry`

**导入：** `openclaw/plugin-sdk/channel-core`

使用特定于通道的接线包装 `definePluginEntry`：它自动调用 `api.registerChannel({ plugin })`，公开可选的根帮助 CLI 元数据接口，并在注册模式下控制功能和完整运行时回调。

```typescript
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineChannelPluginEntry({
  id: "my-channel",
  name: "My Channel",
  description: "Short summary",
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

| 字段                  | 类型                                                             | 必需的 | 默认值             |
| ---------------------- | ---------------------------------------------------------------- | -------- | ------------------- |
| `id`                   | `string`                                                         | 是      | -                   |
| `name`                 | `string`                                                         | 是      | -                   |
| `description`          | `string`                                                         | 是      | -                   |
| `plugin`               | `ChannelPlugin`                                                  | 是      | -                   |
| `configSchema`         | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | No       | 空对象 schema |
| `setRuntime`           | `(runtime: PluginRuntime) => void`                               | No       | -                   |
| `registerCliMetadata`  | `(api: OpenClawPluginApi) => void`                               | No       | -                   |
| `registerFull`         | `(api: OpenClawPluginApi) => void`                               | No       | -                   |
| `registerCapabilities` | `(api: OpenClawPluginApi) => void`                               | No       | -                   |

每个注册模式运行的回调（[注册模式](/plugins/sdk-entrypoints/registration-mode#registration-mode)下的完整表）：

- `setRuntime` 在除 `"cli-metadata"` 和 `"tool-discovery"` 之外的所有模式下运行。在此处保存运行时引用，通常通过 `createPluginRuntimeStore` 完成。
- `registerCliMetadata` 适用于 `"cli-metadata"`、`"discovery"` 和 `"full"`。将其用作通道拥有的 CLI 描述符的主要位置，以便根帮助保持非激活状态，发现快照包括静态命令元数据，并且正常的 CLI 注册与完整插件加载保持兼容。
- `registerFull` 仅在 `"full"` 和 `"tool-discovery"` 模式下运行。对于 `"tool-discovery"`，它会替代通道注册：OpenClaw 会完全跳过 `registerChannel`/`setRuntime`，而是调用完整运行时回调，随后调用能力回调。将工具注册放在 `registerFull` 中，将能力提供者放在 `registerCapabilities` 中。
- `registerCapabilities` 在 `"discovery"`、`"full"` 和 `"tool-discovery"` 模式下运行。在此处注册不产生副作用的已声明提供者，以便只读能力发现可以找到它们，而不会启动套接字、客户端、工作线程或服务。
- Discovery注册是非激活的，不是免导入的：OpenClaw可以评估可信插件条目和通道插件模块来构建快照。保持顶级导入​​无副作用，并将套接字、客户端、工作人员和服务放在 `"full"`-only 路径后面。
- 与 `definePluginEntry` 一样，`configSchema` 可以是延迟工厂；OpenClaw 会在首次访问时缓存解析后的 schema。

CLI 注册：

- 将 `api.registerCli(..., { descriptors: [...] })` 用于插件拥有的根 CLI 命令，您希望延迟加载而不从根 CLI 解析树中消失。描述符名称必须匹配字母、数字、连字符和下划线，以字母或数字开头； OpenClaw 在呈现帮助之前拒绝其他形状并从描述中去除终端控制序列。覆盖注册商公开的每个顶级命令根，并在插件清单的 `cliCommands` 字段中声明相同的名称、描述和子命令标记，以便根帮助不会导入插件代码。 `commands` 独自留在渴望兼容的道路上。
- Root 描述符可以为 JSON、JSONL 或其他不是由 `--json` 单独选择的机器可读标准输出模式定义同步、纯 `machineOutput({ argv, stdoutIsTTY })` 解析器。使用 `openclaw/plugin-sdk/cli-argv` 中的 `getRootOptionAwareCommandPath` 解析命令令牌。将描述符保存在轻量级插件本地模块中，并从 `cli-metadata.ts` 和完整注册中重用它；不要导入运行时桶来构造元数据。会议运行时 shell 通过 `cli.descriptor` 接受该描述符。嵌套描述符不会公开 `machineOutput`。
- 对于成对节点的功能命令，使用 `api.registerNodeCliFeature(...)`，使其归入 `openclaw nodes` 下（等价于 `registerCli(registrar, { parentPath: ["nodes"], ... })`）。
- 对于其他嵌套插件命令，添加 `parentPath`，并在传递给注册器的 `program` 对象上注册命令；OpenClaw 会在调用插件前将其解析为父命令。
- 对于通道插件，从 `registerCliMetadata` 注册 CLI 描述符，并让 `registerFull` 专注于仅运行时相关的工作。
- 如果 `registerFull` 还注册网关 RPC 方法，请将其置于插件专用前缀下。保留的核心管理命名空间（`config.*`、 `exec.approvals.*`、`wizard.*`、`update.*`）始终会强制使用 `operator.admin`。
