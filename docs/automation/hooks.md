---
summary: "内部挂钩：安装、编写和验证命令和生命周期事件的自动化"
read_when:
  - "您希望对 /new、/reset、/stop 或会话和网关事件进行事件驱动的自动化"
  - "您想要编写、安装、启用或调试内部挂钩"
  - "您需要了解挂钩发现、事件数据或回复传递"
title: "钩子"
doc-schema-version: 1
---

# <a id="hooks"></a> 钩子

内部挂钩是小型 JavaScript 或 TypeScript 处理程序，当 OpenClaw 发出事件时，它们在网关进程中运行。使用它们来保存会话上下文、记录重置命令或在消息和会话生命周期事件期间执行短暂的副作用。 OpenClaw 包括用于常见任务的 [ 捆绑挂钩 ](/automation/hooks/bundled-hooks)；您不需要编写插件来使用它们。

## <a id="choose-the-right-surface"></a> 选择合适的扩展面

| 你想要…                                                                                                   | 用途                                                             |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 在 `/new` 上保存上下文、记录命令或对会话和消息事件做出反应                                   | **内部挂钩**（`HOOK.md`加上处理程序），在此描述   |
| 修改提示、拦截工具、控制回复或使用具有优先级和返回值的生命周期契约 | **[插件挂钩](/plugins/hooks)**直通`api.on(...)`        |
| 让另一个服务通过 HTTP 请求开始工作                                                         | **[Webhooks](/automation/cron-jobs#webhooks)**                  |
| 导出遥测数据而不是改变行为                                                                   | **[诊断事件](/logging#diagnostics-and-opentelemetry)** |

这些是独立的系统。 `hooks.internal` 配置该页面的事件处理程序； `hooks.enabled` 配置 HTTP 入口。内部事件名称（例如 `message:received`）不是键入的插件名称（例如 `message_received`）。

<Warning>
内部挂钩是受信任的代码，而不是沙盒脚本。它们与网关进程的文件系统、网络和环境访问一起运行。在启用之前检查挂钩代码，尤其是来自工作区或下载的包的代码。
</Warning>

## <a id="quick-start"></a> 快速开始

从 `command-logger` 开始：它不需要额外的二进制文件或模型调用，并为您提供一个具体的文件来检查。在 **Gateway 主机** 上运行以下命令，并使用与该网关相同的配置文件和配置：

```bash
openclaw hooks list
openclaw hooks info command-logger
openclaw hooks enable command-logger
```

默认的 `hybrid` [ 重载模式 ](/gateway/configuration#reload-modes) 应用钩子配置更改而无需重新启动。使用重新加载模式 `off`，运行 `openclaw gateway restart`，或自行重新启动前台网关。当您的配置具有多个代理且没有隐式所有者时，请添加 `--agent <id>`。

在对话中，您可以安全地重置、以授权用户身份发送 `/new` 或 `/reset`。然后检查网关主机上的日志：

```bash
tail -n 5 ~/.openclaw/logs/commands.log
```

查找带有 `"action":"new"` 或 `"action":"reset"` 的新 JSON 行，最近的 `timestamp`，并且该对话是 `sessionKey`。对于自定义状态目录，请改为阅读 `<stateDir>/logs/commands.log`。这证明处理程序运行了；仅 `openclaw hooks check` 则不会。

该日志包含会话和发件人标识符。如果您不想保留这些记录，请在尝试后禁用该挂钩：

```bash
openclaw hooks disable command-logger
```

### <a id="eligible%2C-enabled%2C-and-loaded"></a><a id="eligible-enabled-and-loaded"></a> E合格、已启用并已加载

将这三项检查分开：

- **满足的要求**：挂钩的OS、二进制文件、环境和配置要求在执行检查的主机上传递。
- **由config**启用：每个hook/source策略允许它。工作区挂钩需要明确的选择加入；当启用广泛发现时，捆绑和托管挂钩不需要每个挂钩标志。
- **Loaded**：正在运行的网关选择了挂钩，导入了其处理程序，并注册了其事件。这还需要主交换机和配置的名称选择来允许它。

CLI 的 `ready`、`eligible` 和 `loadable` 字段描述前两个检查以及非空事件列表。他们确实 **not** 证明网关导入了处理程序，全局选择包含它，或者它的事件已触发。更改后，检查实际的副作用或特定于钩子的日志。

配置重新加载会先准备选定的处理程序，然后再将它们替换在一起。如果选定的处理程序无法加载，则先前的处理程序将保持活动状态。已经运行的事件以其原始处理程序结束；后续事件将使用新选择。重新加载不会重播 `gateway:startup`。

### <a id="local%2C-remote%2C-and-agent-scope"></a><a id="local-remote-and-agent-scope"></a> 本地、远程和代理范围

`hooks list`、`info` 和 `check` 请求所选网关的库存。隐式本地网关在不可用或缺少报告方法时可以回退到本地发现。配置的远程网关或显式 `OPENCLAW_GATEWAY_URL` 不会在出现故障时回退到笔记本电脑的挂钩。

`hooks enable` 和 `hooks disable` 始终检查和修改 **本地配置**。他们不会通过 RPC 更新远程网关。在网关主机上运行它们以更改该主机的挂钩。

`--agent <id>` 选择要检查的工作区，而不是独立的挂钩注册表。保存的 `hooks.internal.entries.<hookKey>` 条目是全局的。网关将目录挂钩从其选定的工作空间加载到进程范围的注册表中；它不会仅仅因为您检查了每个代理的 `hooks/` 目录而加载它。当加载的处理程序只应作用于特定代理时，它必须过滤事件的代理或会话。参见[查找](/automation/hooks/configuration#hook-discovery)。

## <a id="plugin-hooks"></a> 插件钩子

插件管理的内部挂钩在 `hooks list` 中显示为 `plugin:<id>`。它们参与此事件系统，但您启用或禁用所属插件，而不是使用 `hooks enable` 或 `hooks disable` 切换它们。目录加载器的配置名称选择不是类型 `api.on` 挂钩的策略门，也不是插件激活的替代品。

旧版 `api.registerHook` API 注册内部事件。它不会调用类型化的生命周期名称，例如 `before_tool_call`、`message_received` 或 `session_start`；注册这些名称会发出警告，将作者引导至 `api.on(...)`。对于需要类型化生命周期控制的新集成，请使用 [Plugin hooks](/plugins/hooks) 参考。

## <a id="best-practices"></a> 最佳实践

一个事件的处理程序按顺序运行：首先是系列侦听器，然后是精确侦听器，按照每个组中的注册顺序。调度程序等待每个处理程序，捕获并记录抛出的错误，然后继续处理后面的处理程序。目录挂钩没有优先级选项。

此排序不会将不同的事件序列化。消息通知、补丁通知和自动重置工作可以与其他事件和代理处理重叠。没有一般的处理程序超时、取消信号、持久事件队列、自动重试或一次性保证。重新启动或进程退出可能会丢失正在进行的工作。

保持副作用简短且有限。等待属于处理程序的工作，设置网络调用超时，限制数据大小，并设计可重复操作，以便重试不会重复其效果。不要使用 `void doHeavyWork(event)` 作为通用解决方案：该工作会逃脱处理程序的 wait/error 边界，并且可能比其会话或进程的寿命更长。如果工作需要持久的工作生命周期，请使用拥有它的自动化或服务。

尽早过滤不相关的事件，并避免记录消息正文、整个配置对象或凭据。消息和会话数据可以是私有的。仅保留副作用所需的最低限度、保护输出文件并设置保留。长寿命定时器、观察者、套接字和客户端属于具有显式关闭生命周期的插件服务，而不是 request/event 处理程序。

## <a id="cli-reference"></a> CLI 参考

请参阅 [`openclaw hooks`](/cli/hooks) 了解每个公共报告和切换选项、JSON 输出字段、退出行为和 install/update 别名。

## <a id="detailed-topics"></a> 详细主题

这些页面包含用于遵循此页面上的快速入门的参考和操作材料。

| 页面                                                                | 读它的时候                                                                            |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [书写钩](/automation/hooks/writing-hooks)                    | 您正在编写一个挂钩，并且需要文件布局、处理程序契约或 `HOOK.md` 字段。 |
| [查看配置与发现](/automation/hooks/configuration) | 您正在启用挂钩、缩小选择范围或跨源跟踪发现。   |
| [捆绑挂钩](/automation/hooks/bundled-hooks)                    | 您想要一个已发布的钩子并且需要它的行为、选项和检查。                     |
| [查看事件类型和上下文](/automation/hooks/event-types)       | 您需要事件键的触发器、等待行为或上下文字段。                      |
| [故障排除](/automation/hooks/troubleshooting)           | 钩子未发现、不合格或未执行。                               |

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/automation/hooks#session-memory`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="writing-hooks" />[书写挂钩](/automation/hooks/writing-hooks#writing-hooks)
- <a id="hook-structure" />[H钩结构](/automation/hooks/writing-hooks#hook-structure)
- <a id="handler-implementation" />[Handler实现](/automation/hooks/writing-hooks#handler-implementation)
- <a id="reply-delivery" />[回复发货](/automation/hooks/writing-hooks#reply-delivery)
- <a id="hook.md-format" /><a id="hook-md-format" />[HOOK.md 格式](/automation/hooks/writing-hooks#hook-md-format)
- <a id="configuration" />[配置](/automation/hooks/configuration#configuration)
- <a id="hook-discovery" />[H钩发现](/automation/hooks/configuration#hook-discovery)
- <a id="hook-packs" />[H钩包](/automation/hooks/configuration#hook-packs)
- <a id="bundled-hooks" />[捆绑挂钩](/automation/hooks/bundled-hooks#bundled-hooks)
- <a id="boot-md" />[boot-md](/automation/hooks/bundled-hooks#boot-md)
- <a id="boot-md-details" />[boot-md 详细信息](/automation/hooks/bundled-hooks#boot-md-details)
- <a id="bootstrap-extra-files" />[bootstrap-extra-files](/automation/hooks/bundled-hooks#bootstrap-extra-files)
- <a id="bootstrap-extra-files-config" />[引导额外文件配置](/automation/hooks/bundled-hooks#bootstrap-extra-files-config)
- <a id="command-logger" />[命令记录器](/automation/hooks/bundled-hooks#command-logger)
- <a id="command-logger-details" />[命令记录器详细信息](/automation/hooks/bundled-hooks#command-logger-details)
- <a id="compaction-notifier" />[压缩通知器](/automation/hooks/bundled-hooks#compaction-notifier)
- <a id="compaction-notifier-details" />[压缩通知程序详细信息](/automation/hooks/bundled-hooks#compaction-notifier-details)
- <a id="session-memory" />[会话内存](/automation/hooks/bundled-hooks#session-memory)
- <a id="session-memory-details" />[会话内存详细信息](/automation/hooks/bundled-hooks#session-memory-details)
- <a id="event-types" />[事件类型](/automation/hooks/event-types#event-types)
- <a id="event-context-highlights" />[事件背景亮点](/automation/hooks/event-types#event-context-highlights)
- <a id="message-context" />[消息上下文](/automation/hooks/event-types#message-context)
- <a id="troubleshooting" />[故障排除](/automation/hooks/troubleshooting#troubleshooting)
- <a id="hook-not-discovered" />[H未发现](/automation/hooks/troubleshooting#hook-not-discovered)
- <a id="hook-not-eligible" />[H不符合条件](/automation/hooks/troubleshooting#hook-not-eligible)
- <a id="hook-not-executing" />[H不执行](/automation/hooks/troubleshooting#hook-not-executing)

## <a id="related"></a> 相关内容

- [CLI 参考：hooks](/cli/hooks)
- [插件钩子](/plugins/hooks)
- [Webhooks](/automation/cron-jobs#webhooks)
- [配置](/gateway/config-hooks#hooks)
- [Agent 工作区](/concepts/agent-workspace)
- [常设命令](/automation/standing-orders)。
