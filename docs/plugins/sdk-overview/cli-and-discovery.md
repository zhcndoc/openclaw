---
summary: "网关发现服务、CLI 注册器和描述符以及 CLI 后端注册"
title: "插件 SDK CLI 和发现注册"
sidebarTitle: "CLI 和发现"
read_when:
  - "您正在添加插件拥有的 CLI 命令或节点功能"
  - "您正在注册本地网关发现广告商"
  - "您拥有本地 AI CLI 后端的默认配置"
---

用于本地网关发现、插件拥有的 CLI 命令和本地 AI CLI 后端的注册器。 [插件SDK概述](/plugins/sdk-overview)的一部分。

## <a id="gateway-discovery-registration"></a> 网关发现注册

`api.registerGatewayDiscoveryService(...)` 允许插件在本地发现传输上通告活动网关，例如 mDNS/Bonjour. OpenClaw 在启用本地发现时在网关启动期间调用服务，传递当前网关端口和非秘密 TXT 提示数据，并在网关关闭期间调用返回的 `stop` 处理程序。

```typescript
api.registerGatewayDiscoveryService({
  id: "my-discovery",
  async advertise(ctx) {
    // startMyAdvertiser is your plugin's own mDNS/Bonjour helper, not an SDK export.
    const handle = await startMyAdvertiser({
      gatewayPort: ctx.gatewayPort,
      tls: ctx.gatewayTlsEnabled,
      displayName: ctx.machineDisplayName,
    });
    return { stop: () => handle.stop() };
  },
});
```

Gateway 发现插件不得将公开的 TXT 值视为秘密或认证。发现只是路由提示；Gateway 认证和 TLS pinning 仍然拥有信任控制权。

## <a id="cli-registration-metadata"></a> CLI 注册元数据

可执行文件 CLI 拥有为帮助和命令元数据获取的未缓存插件注册表，以及在注册、操作或清理期间通过 `openclaw/plugin-sdk/provider-catalog-runtime` 借用的提供程序回调。即使清理警告已报告超时，它也会在调用的实际工作完成后释放这些资源。强制进程退出仍然可以中断异步处理。仅通过调用 CLI 帮助程序，调用者拥有的程序和网关启动不会成为可执行的 CLI 所有者；参见[保留的SDK合约](/plugins/sdk-migration/compatibility-policy#retained-helper-contracts)。

`api.registerCli(registrar, opts?)` 接受两类命令元数据：

- `commands`：由 registrar 拥有的显式命令名称
- `descriptors`：用于 CLI 帮助、路由和惰性插件 CLI 注册的解析时命令描述符
- `parentPath`：用于嵌套命令组的可选父命令路径，例如 `["nodes"]`

对于成对节点功能，优先使用 `api.registerNodeCliFeature(registrar, opts?)`。它是 `api.registerCli(..., { parentPath: ["nodes"] })` 的一个小包装，并使诸如 `openclaw nodes canvas` 这样的命令成为明确的插件拥有节点功能。

当插件拥有的节点命令需要相同的网关标志、调用信封、终端呈现和授权提示时，重用核心节点 CLI 所有者：

```typescript
import {
  buildNodeInvokeParams,
  getNodesTheme,
  nodesCallOpts,
  runNodesCommand,
} from "openclaw/plugin-sdk/node-cli-runtime";
```

如果你希望插件命令在常规根 CLI 路径中保持惰性加载， 请提供覆盖该 registrar 暴露的每个顶层命令根的 `descriptors`。

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
        description: "Manage Matrix accounts, verification, devices, and profile state",
        hasSubcommands: true,
      },
    ],
  },
);
```

当命令为 JSON、JSONL 或其他机器可读格式保留 stdout 时，根描述符还可以声明 `machineOutput({ argv, stdoutIsTTY })`，而无需专门依赖文字 `--json` 标志。 OpenClaw 在插件激活之前评估此解析器，以便启动诊断可以路由到 stderr。解析器必须是同步的、纯的、轻依赖的：仅检查提供的原始 argv 和 stdout TTY 状态。在轻量级 CLI 元数据和完整注册中重用相同的解析器，因此发现和执行不会不一致。当解析器需要命令路径令牌时，使用 `openclaw/plugin-sdk/cli-argv` 中的 `getRootOptionAwareCommandPath`；它在 root 命令之前或之后接受受支持的 root 选项。 `machineOutput` 是根元数据；嵌套描述符无法使用它，因为它们所属的根在可见之前必须已经处于活动状态。

嵌套命令会将解析后的父命令作为 `program` 接收：

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
        description: "Present hosted widgets on a paired Mac",
        hasSubcommands: true,
      },
    ],
  },
);
```

仅当你不需要惰性根 CLI 注册时，才单独使用 `commands`。 该急切兼容路径仍受支持，但它不会为解析时惰性加载安装基于描述符的占位符。

注册器接收本机 Commander 对象。在注册器内注册的回调保留插件实例以供以后的操作、挂钩、解析、帮助和事件使用。使用 `program.addCommand` 添加的预配置命令树也会将其回调传输到添加实例。注册前已附加到主机的命令仍归调用者所有；命令标识和函数值参数或选项数据不会更改。当允许的异步操作完成时，重新加载或禁用会拒绝新的回调调用。

OpenClaw 报告转义插件命令操作和命令挂钩的错误：消息发送至 stderr，或发送至 `--json` 或 `machineOutput` 模式下 stdout 上的标准 JSON 故障信封，并且命令以代码 1 退出。`--debug` 添加堆栈。抛出 `Error` 以及面向用户的消息；仅当命令拥有不同的退出代码或失败输出时才在本地捕获它。选项和参数解析器应拒绝 Commander 的 `InvalidArgumentError` 值或 `code: "commander.invalidArgument"` 错误，以便 Commander 命名被拒绝的选项。

## <a id="cli-backend-registration"></a> CLI 后台注册

`api.registerCliBackend(...)` 允许插件拥有本地 AI CLI 后端（例如 `claude-cli` 或 `my-cli`）的默认配置。

- 后端的 `id` 会成为模型引用（如 `my-cli/gpt-5`）中的提供商前缀。
- 将 `modelProvider` 设置为规范模型提供程序 ID，以将该提供程序的模型绑定到此 CLI 运行时。没有推断的默认值。缺失值或空白值会在运行时或仅安装注册期间发出警告，命名插件、后端和缺失字段；直接 CLI 引用仍然可用，但不会创建提供程序到运行时的绑定。
- 后端的 `config` 是权威的命令适配器：argv、环境、解析器、会话、图像和可靠性行为都由插件代码负责。
- 用户通过模型引用或模型范围的 `agentRuntime.id` 选择后端；`openclaw.json` 不会重写适配器。
- 当注册的静态字段需要运行时感知的规范化处理时，使用 `normalizeConfig`。
- 使用 `resolveExecutionArgs` 进行属于 CLI 方言的请求范围的 argv 重写，例如将 OpenClaw 思维级别映射到本机工作标志。钩子收到`ctx.executionMode`；使用 `"side-question"` 为临时 `/btw` 调用添加后端本机隔离标志。如果这些标志能够可靠地禁用始终在线的 CLI 的本机工具，则也声明 `sideQuestionToolMode: "disabled"`。
- 将 `prepareExecution` 用于后端拥有的启动环境或临时 auth/config 桥接器。它的 `ctx.contextTokenBudget` 是为运行选择的有效令牌限制，因此本机压缩后端可以调整自己的阈值，而无需特定于提供商的核心分支。其可选的 `ctx.thinkingLevel` 是后端的有效 `off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`adaptive` 或 `max` 选择通过启动环境或分阶段配置应用级别。当后端部署必须扩展捆绑的 MCP 设置时，它还会接收核心准备的 `ctx.env`。
- 可以禁用特定运行的所有本机工具的后端可以声明 `nativeToolMode: "selectable"`。受限呼叫传递精确的 `ctx.toolAvailability.native` 列表以及标准 `ctx.toolAvailability.openClaw` 名称。声明 `toolAvailabilityEnforcement: "execution-args"` 并在最终 fresh/resume argv 中执行合约，或者声明 `"prepare-execution"`，在分阶段策略中执行它，并返回 `toolAvailabilityEnforced: true`。 OpenClaw 禁用用于运行时上限的本机工具（例如 cron `toolsAllow`），并在声明的强制路径​​不完整时阻止执行。

有关端到端编写指南，请参见 [CLI 后端插件](/plugins/cli-backend-plugins)。
