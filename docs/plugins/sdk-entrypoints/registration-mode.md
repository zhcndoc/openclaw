---
summary: "api.registrationMode 如何报告加载模式以及每个模式中要注册的内容"
title: "插件SDK注册方式"
sidebarTitle: "报名方式"
read_when:
  - "你需要知道每种注册模式要注册什么"
  - "您正在处理 cli 元数据、发现或安装运行时加载"
---

`api.registrationMode` 如何报告插件的加载方式，以及每种模式期望插件注册的内容。 [插件入口点部分参考](/plugins/sdk-entrypoints)。

## <a id="registration-mode"></a> 注册模式

`api.registrationMode` 会告诉你的插件它是如何被加载的：

| 模式               | 什么时候                                               | 运行时     | 要注册的内容                                                                                                |
| ------------------ | -------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------- |
| `"full"`           | 正常网关启动                             | 居住        | 全部内容                                                                                                      |
| `"discovery"`      | 只读能力发现                     | 居住        | 频道注册、静态 CLI 描述符和非激活 provider；跳过套接字、worker、客户端和服务 |
| `"tool-discovery"` | 范围加载以列出或运行特定插件的工具 | 居住        | Capability/tool 仅限注册；没有通道激活                                                        |
| `"setup-only"`     | Disabled/unconfigured频道                      | 不可用 | 仅限频道注册                                                                                       |
| `"setup-runtime"`  | 设置流程中且运行时可用                  | 居住        | 频道注册，以及设置期间所需的轻量级运行时                                      |
| `"cli-metadata"`   | 捕获根帮助/CLI 元数据                   | 不可用 | 仅 CLI 描述符                                                                                            |

在 `"cli-metadata"` 和 `"setup-only"` 模式下，访问运行时功能会引发命名插件和模式的错误。推迟 `register()` 的运行时访问或在清单的 `cliCommands` 中声明根命令，以便可以在不执行插件的情况下收集 CLI 元数据。

`defineChannelPluginEntry` 会自动处理这种拆分。如果你直接为频道使用 `definePluginEntry`，请自行检查模式，并记住 `"tool-discovery"` 会跳过频道注册：

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
    // Register capability-only surfaces (providers/tools), no channel.
    return;
  }

  api.registerChannel({ plugin: myPlugin });
  if (api.registrationMode !== "full") return;

  // Heavy runtime-only registrations
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

OpenClaw 将其命名为 `plugin.<plugin-id>.changed`。事件名称是一个小写字母段，有效负载必须以 JSON 为界，范围必须为 `operator.read`、`operator.write` 或 `operator.admin`。发射器仅在服务生命周期内存在，并在停止或启动失败后被撤销。优先选择版本或失效有效负载而不是完整记录，以便授权客户端通过插件的作用域网关方法重新读取存储的状态。

发现模式会构建一个不会激活的注册表快照。它仍然可能评估插件入口和频道插件对象，以便 OpenClaw 可以注册频道能力和静态 CLI 描述符。将发现模式下的模块评估视为可信但轻量：顶层不要进行网络客户端、 子进程、监听器、数据库连接、后台 worker、 凭据读取或其他实时运行时副作用。

将 `"setup-runtime"` 视为这样一个窗口：此时必须存在仅用于设置启动的入口， 但不能重新进入完整打包的频道运行时。适合的内容包括频道注册、设置安全的 HTTP 路由、设置安全的网关方法，以及委派的设置辅助程序。繁重的后台服务、CLI 注册器，以及 provider/client SDK 启动逻辑仍然应属于 `"full"`。
