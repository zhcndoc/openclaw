---
summary: "导入映射、注册 API 参考与 SDK 架构"
title: "插件 SDK 概览"
sidebarTitle: "插件 SDK 概览"
read_when:
  - "你需要知道应从哪个 SDK 子路径导入"
  - "你想查看 OpenClawPluginApi 上所有注册方法的参考"
  - "你正在查找某个特定的 SDK 导出"
---

插件 SDK 是插件与核心之间的类型化契约。此页面是关于**导入什么**以及**可以注册什么**的参考。

<Note>
  此页面面向在 OpenClaw 内部使用 `openclaw/plugin-sdk/*` 的插件作者。对于希望通过 Gateway 运行代理的外部应用、脚本、仪表板、CI 作业和 IDE 扩展，请改用 [面向外部应用的 Gateway 集成](/gateway/external-apps)。
</Note>

<Tip>
在寻找操作指南吗？请从 [构建插件](/plugins/building-plugins) 开始。关于频道，请使用 [频道插件](/plugins/sdk-channel-plugins)；关于模型提供方，请使用 [提供方插件](/plugins/sdk-provider-plugins)；关于本地 AI CLI 后端，请使用 [CLI 后端插件](/plugins/cli-backend-plugins)；关于原生代理执行器，请使用 [Agent harness 插件](/plugins/sdk-agent-harness)；关于工具或生命周期钩子，请使用 [插件 hooks](/plugins/hooks)。
</Tip>

## <a id="api-stability"></a> API 稳定性

所有 OpenClaw 插件 API 均为 **experimental**。这包括每个 `openclaw/plugin-sdk/*` 子路径、注册和运行时 API、通道和提供商合约、挂钩以及本机 Control UI API。这些合同可能会在 OpenClaw 版本之间发生变化。

固定用于开发和部署插件的 OpenClaw 版本，并测试您声明兼容的每个主机版本。从那些经过测试的版本中设置包兼容性范围；不要假设工作版本支持未来版本。现有的 [ 兼容性窗口和升级迁移](/plugins/compatibility) 仍然适用。实验状态不会删除记录的迁移路径。

用户安装的插件中​​的本机 UI 还需要默认关闭的 [ 自定义插件 UI lab](/plugins/feature-plugins#enable-custom-plugin-ui)。后端插件 API 和普通插件加载不需要该设置。

## <a id="what-each-page-covers"></a> 每页涵盖的内容

- [ 导入和模块布局](/plugins/sdk-overview/imports) — 从哪个子路径导入、子路径目录和内部桶约定。
- [能力注册](/plugins/sdk-overview/capabilities) - 提供者注册商加上存储、工作人员和嵌入运行时合约。
- [工具和命令](/plugins/sdk-overview/tools-and-commands) — 代理工具、自定义命令、节点主机命令和小部件呈现器。
- [基础设施注册](/plugins/sdk-overview/infrastructure) — 挂钩、HTTP 路由、网关方法、服务以及 Webhook 和 SQLite 帮助程序。
- [主机挂钩](/plugins/sdk-overview/host-hooks) — 会话扩展、可信工具策略、Control UI 描述符和运行时生命周期。
- [CLI 和 discovery](/plugins/sdk-overview/cli-and-discovery) — 网关发现广告商、插件 CLI 注册和 CLI 后端。
- [内存和上下文插槽](/plugins/sdk-overview/memory-and-context) - 专有的上下文引擎和内存功能插槽及其适配器。
- [事件和钩子语义](/plugins/sdk-overview/events-and-hooks) — 类型化生命周期钩子以及每个钩子应用的决策规则。

## <a id="registration-api"></a> 注册 API

`register(api)` 回调会接收一个 `OpenClawPluginApi` 对象，其中包含这些方法：

每组注册方式都有自己的页面：

| 团体                                                                                       | 注册内容                                                     |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [能力注册](/plugins/sdk-overview/capabilities#capability-registration)       | 推理、媒体、搜索、转录、工作人员和嵌入提供程序 |
| [工具和命令](/plugins/sdk-overview/tools-and-commands#tools-and-commands)           | 代理工具、自定义命令、节点主机命令、小部件呈现器   |
| [基础设施](/plugins/sdk-overview/infrastructure#infrastructure)                       | 挂钩、HTTP 路由、网关方法、CLI、服务、迁移        |
| [主机挂钩](/plugins/sdk-overview/host-hooks#host-hooks-for-workflow-plugins)              | 会话扩展、可信工具策略、Control UI 描述符     |
| [CLI 和发现](/plugins/sdk-overview/cli-and-discovery#gateway-discovery-registration) | 网关发现广告商、CLI 注册商、CLI 后端           |
| [专用插槽](/plugins/sdk-overview/memory-and-context#exclusive-slots)                 | 上下文引擎和内存功能，一次激活一个            |
| [事件和生命周期](/plugins/sdk-overview/events-and-hooks#events-and-lifecycle)         | 类型化生命周期挂钩和对话绑定回调              |

### <a id="session-discussion-provider"></a> 会话讨论提供者

为会话提供外部团队聊天界面的插件可以注册由 `openclaw/plugin-sdk/session-discussion` 导出的单个进程范围提供程序。其 `info({ sessionKey })` 方法报告讨论是否不可用、准备好打开或已经打开； `open({ sessionKey })` 创建或解决讨论并返回其嵌入和外部 URL。注册另一个提供商会替换当前的提供商。

### <a id="api-object-fields"></a> API 对象字段

| 字段                    | 类型                      | 描述                                                                               |
| ------------------------ | ------------------------- | ----------------------------------------------------------------------------------------- |
| `api.id`                 | `string`                  | 插件 id                                                                                 |
| `api.name`               | `string`                  | 显示名称                                                                              |
| `api.version`            | `string?`                 | 插件版本（可选）                                                                 |
| `api.description`        | `string?`                 | 插件描述（可选）                                                             |
| `api.source`             | `string`                  | 插件源路径                                                                        |
| `api.runtimeSource`      | `string?`                 | 当加载程序选择运行时工件时选择的运行时入口点路径         |
| `api.rootDir`            | `string?`                 | 插件根目录（可选）                                                          |
| `api.config`             | `OpenClawConfig`          | 当前配置快照（可用时为活跃的内存运行时快照）                |
| `api.pluginConfig`       | `Record<string, unknown>` | 来自 `plugins.entries.<id>.config` 的插件专属配置                                 |
| `api.runtime`            | `PluginRuntime`           | [运行时辅助工具](/plugins/sdk-runtime)                                                   |
| `api.logger`             | `PluginLogger`            | 作用域日志记录器（`debug`、`info`、`warn`、`error`）                                          |
| `api.registrationMode`   | `PluginRegistrationMode`  | 当前加载模式；`"setup-runtime"` 是可使用运行时的轻量级设置流程 |
| `api.resolvePath(input)` | `(string) => string`      | 解析相对于插件根目录的路径                                                      |

使用 `api.runtimeSource` 定位所选运行时入口点旁边的私有模块。它记录加载程序的源、独立包或捆绑工件选择，并始终识别主运行时条目，即使在安装注册期间也是如此。 `api.source`和`api.rootDir`保留发现身份；它们可能与所选工件不同。当未选择运行时工件（包括仅元数据 API）时，`runtimeSource` 不存在。该路径是位置事实，而不是调用已停用插件的授权。

## <a id="where-each-section-moved"></a> 各部分移动的地方

单页版本的每个部分现在都位于此页面或下面的八个子页面之一上。单页版本中的锚点仍然在这里解析。

- <a id="import-convention" />[进口约定](/plugins/sdk-overview/imports#import-convention)
- <a id="subpath-reference" />[子路径参考](/plugins/sdk-overview/imports#subpath-reference)
- <a id="capability-registration" />[能力注册](/plugins/sdk-overview/capabilities#capability-registration)
- <a id="tools-and-commands" />[工具和命令](/plugins/sdk-overview/tools-and-commands#tools-and-commands)
- <a id="infrastructure" />[基础设施](/plugins/sdk-overview/infrastructure#infrastructure)
- <a id="file-watch-capacity-errors" />[文件查看容量错误](/plugins/sdk-overview/infrastructure#file-watch-capacity-errors)
- <a id="sqlite-write-admission" />[SQLite写录取](/plugins/sdk-overview/infrastructure#sqlite-write-admission)
- <a id="webhook-body-rejection" />[Webhook主体拒绝](/plugins/sdk-overview/infrastructure#webhook-body-rejection)
- <a id="post-ack-webhook-work" />[Post-ack webhook 工作](/plugins/sdk-overview/infrastructure#post-ack-webhook-work)
- <a id="requester-scoped-mcp-connections" />[ 请求者范围 MCP 连接](/plugins/sdk-overview/infrastructure#requester-scoped-mcp-connections)
- <a id="host-hooks-for-workflow-plugins" />[工作流插件的主机挂钩](/plugins/sdk-overview/host-hooks#host-hooks-for-workflow-plugins)
- <a id="when-to-use-tool-result-middleware" />[何时使用工具-结果中间件](/plugins/sdk-overview/host-hooks#when-to-use-tool-result-middleware)
- <a id="gateway-discovery-registration" />[网关发现注册](/plugins/sdk-overview/cli-and-discovery#gateway-discovery-registration)
- <a id="cli-registration-metadata" />[CLI 注册元数据](/plugins/sdk-overview/cli-and-discovery#cli-registration-metadata)
- <a id="cli-backend-registration" />[CLI 后台注册](/plugins/sdk-overview/cli-and-discovery#cli-backend-registration)
- <a id="exclusive-slots" />[专用插槽](/plugins/sdk-overview/memory-and-context#exclusive-slots)
- <a id="memory-embedding-adapters" />[内存嵌入适配器](/plugins/sdk-overview/memory-and-context#memory-embedding-adapters)
- <a id="events-and-lifecycle" />[事件和生命周期](/plugins/sdk-overview/events-and-hooks#events-and-lifecycle)
- <a id="hook-decision-semantics" />[Hhook 决策语义](/plugins/sdk-overview/events-and-hooks#hook-decision-semantics)
- <a id="internal-module-convention" />[内部模块约定](/plugins/sdk-overview/imports#internal-module-convention)

## <a id="docked-link-readers"></a> 对接链接阅读器

请参阅 [ 对接链接阅读器](/plugins/sdk-overview/host-hooks#docked-link-readers)，了解聊天旁边的被动文档。

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="切入点" icon="door-open" href="/plugins/sdk-entrypoints">
    `definePluginEntry` 和 `defineChannelPluginEntry` 选项。
  </Card>
  <Card title="运行时辅助工具" icon="gears" href="/plugins/sdk-runtime">
    `api.runtime` 命名空间完整参考。
  </Card>
  <Card title="设置与配置" icon="sliders" href="/plugins/sdk-setup">
    打包、清单和配置模式。
  </Card>
  <Card title="测试" icon="vial" href="/plugins/sdk-testing">
    测试工具和 lint 规则。
  </Card>
  <Card title="SDK 迁移" icon="arrows-turn-right" href="/plugins/sdk-migration">
    从已弃用的表面迁移。
  </Card>
  <Card title="插件内部" icon="diagram-project" href="/plugins/architecture">
    深入的架构和能力模型。
  </Card>
</CardGroup>
