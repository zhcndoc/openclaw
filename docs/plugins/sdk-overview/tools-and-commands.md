---
summary: "注册代理工具、自定义命令、节点主机命令和小部件呈现器"
title: "插件 SDK 工具和命令"
sidebarTitle: "工具和命令"
read_when:
  - "您正在注册代理工具或自定义命令"
  - "您将节点主机命令公开为代理工具"
  - "您正在注册小部件演示者或计算机使用提供商"
---

代理可见工具、自定义命令、节点主机命令和小部件呈现器的注册器。 [插件SDK概述](/plugins/sdk-overview)的一部分。

## <a id="tools-and-commands"></a> 工具和命令

对于固定工具名称的简单工具插件，请使用 [`defineToolPlugin`](/plugins/tool-plugins)。 对于混合插件或完全动态的工具注册，请直接使用 `api.registerTool(...)`。

当 OpenClaw 在托管操作内调用带有 `AbortSignal` 的插件工具时，取消回调会保留执行插件的运行时上下文和原始取消原因。该工具可以在已经开始的 SDK 工作完成之前返回结果；该作品在清理工作完成之前仍属于其所有。取消清理不会在插件或操作关闭后授权新的调用。返回或加入您的工具在 SDK- 托管操作之外启动的后台工作。没有托管操作的直接编程调用者继续拥有其信号和工作生命周期。

| 方法                                   | 注册内容                                                                                                                        |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `api.registerTool(tool, opts?)`          | 代理工具（必需，或 `{ optional: true }`）                                                                                            |
| `api.registerCommand(def)`               | 自定义命令（绕过 LLM）                                                                                                        |
| `api.registerNodeHostCommand(command)`   | 由 `openclaw node run` 处理的命令；可选的 `agentTool` 元数据可以在节点连接时将其作为代理可见的工具公开 |
| `api.registerWidgetPresenter(presenter)` | 核心 `show_widget` 工具背后的显式或当前通道目标                                                               |

显式小部件呈现器声明一个唯一的模型可见目标，例如 `node_panel`。当前频道演示者使用 `target: "current_channel"`，提供基于可信传递事实的同步 `match(context)` 谓词，并声明支持的源类型和传递限制。多个传输呈现器可以共存，但核心仅在恰好有一个匹配时才选择隐式路由。

Core 验证共享的 `show_widget` 模式，组成有界的 HTML 文档，并将不可变的 HTML 加上可选的托管 URL 传递给 `present(...)`。演示者返回通用消息收据或节点收据。预期可用性和呈现失败使用关闭错误结果而不是抛出；核心仅针对实际的 `inline-widgets` 客户端回退内联，否则会显示故障。

计算机使用提供商使用 `openclaw/plugin-sdk/computer-use` 中的 `registerComputerUseProvider(api, provider)`。它注册共享的 `screen.snapshot`/`computer.act` 节点主机信封一次，同时提供程序将其驱动程序、框架、可用性和执行生命周期保留在本地。其可选的 `prepare(context)` 挂钩在节点的第一个功能声明之前解决本机启动，而无需打开计算机使用执行。

当代理需要一个简短的、由命令拥有的路由提示时，插件命令可以设置 `agentPromptGuidance`。该文本应仅与命令本身相关；不要将提供方或插件特定策略加入核心提示构建器中。

当被接纳为所有者时，接收 `senderIsOwner` 的命令还会接收主机的可选 `assertOwnerCurrent` 回调。在等待准备之前捕获该回调并将其传递给突变所有者的当前权限检查。在链接的配置文件降级、取消链接或重新分配后，布尔所有者快照不会授权稍后写入。回调与原始身份和命令调用绑定；保留它在处理程序返回后无法开始新的工作。已接受的作业仍在完成其沉​​降和清理工作。普通授权读取命令和显式网关范围检查保留其现有行为。

命令还可以为解析的无参数调用声明有界客户端呈现操作：

```ts
api.registerCommand({
  name: "pair",
  description: "Pair a device",
  clientPresentation: {
    when: "no-arguments",
    action: { kind: "device-pairing" },
  },
  handler: async () => ({ text: "ok" }),
});
```

操作联盟是封闭的，并且故意不接受路由、回调、URL 或任意客户端数据。仅当客户能够完成时，支持客户才处理该操作；否则该命令将遵循其正常的远程路径。此元数据表达表示意图，而不是授权：网关对于客户端流程执行的每个 RPC 保持权威。

指导条目可以是传统字符串，适用于每个提示界面，或者是结构化条目：

```ts
api.registerCommand({
  name: "demo_cmd",
  description: "Demo command",
  agentPromptGuidance: [
    "Global command hint.",
    { text: "Only show this in the main OpenClaw prompt.", surfaces: ["openclaw_main"] },
  ],
  handler: async () => ({ text: "ok" }),
});
```

结构化 `surfaces` 可包括 `openclaw_main`、`codex_app_server`、`cli_backend`、`acp_backend` 或 `subagent`。 `pi_main` 仍然是 `openclaw_main` 的已弃用别名；兼容性注册表于 2026 年 7 月 25 日弃用了它，`removeAfter` 日期为 2026 年 10 月 1 日（请参阅 [ 删除时间表 ](/plugins/sdk-migration/removal-timeline)）。省略 `surfaces` 进行有意的全表面引导。不要传递空的 `surfaces` 数组；它被拒绝，因此意外范围丢失不会成为全局提示文本。

原生 Codex app-server 开发者指令比其他提示界面更严格：只有明确作用域为 `codex_app_server` 的指导才会被提升到那个更高优先级的通道。传统字符串指导和未指定作用域的结构化指导仍然可用于非 Codex 提示界面，以保持兼容性。

Node-host 命令在连接的节点主机上运行，​​而不是在网关进程内运行。如果存在 `agentTool`，则节点在网关连接成功后发布描述符；仅当该节点已连接且描述符的 `command` 位于节点批准的命令表面中时，网关才会将其公开给代理运行。设置 `agentTool.defaultPlatforms` 将非危险命令选择到默认节点命令白名单中；否则需要显式 `gateway.nodes.commands.allow` 或节点调用策略。 `agentTool.name` 必须是提供商安全的：以字母开头，仅使用字母、数字、下划线或连字符，并保持在 64 个字符以内。 MCP- 支持的节点工具可以设置 `agentTool.mcp` 元数据，以便目录和工具搜索界面可以显示远程 MCP server/tool 身份，但执行仍然通过通告的节点命令。

Node-host 命令必须提供 `hasActiveWork(): boolean` 以允许自动节点更新。仅当后台进程、保留流及其清理已解决时，同步读取已拥有的状态并返回 `false`。在 `handle(...)` 内完成工作的命令可以声明 `hasActiveWork: () => false`；节点主机单独跟踪正在进行的调用。 `createSessionCatalogNodeHostBindings` 将其 `hasActiveWork` 选项转发给每个生成的命令。

缺少钩子、抛出错误或 `false` 以外的任何结果都会延迟激活。这保留了空闲钩子之前的旧插件所拥有的工作。该查询还会针对不可用的命令运行，因为可用性可能会发生变化，而工作仍会保留。将拆卸保留在命令的现有生命周期中，例如 `onDisconnect`，并仅在该工作解决后报告空闲。 `onDisconnect` 本身并不构成闲置。更新旧插件以添加挂钩或使用 `openclaw update` 和操作员控制的节点重新启动。

ACP- 支持的目录可以使用私有本地 `openclaw/plugin-sdk/session-catalog-runtime` 中的 `createAcpSessionCatalogAdoption` 来共享采用的会话查找和创建。提供目录 ID、本地主机 ID、会话密钥前缀、插件标记密钥和转录阅读器。帮助器保留标记形状，创建 ACP 绑定，并在会话条目完成初始化之前导入历史记录。

仅追加 JSONL 目录可以使用来自同一私有运行时接缝的 `readSessionCatalogJsonlActivity` 进行有界上游活动读取。助手拥有文件打开、单MiB扫描窗口、偏移推进；目录对完整的行进行分类并保留其自己的时间戳和用户消息语义。
