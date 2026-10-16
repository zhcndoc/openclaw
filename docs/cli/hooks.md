---
summary: "CLI 有关内部挂钩发现、资格、启用和挂钩包的参考"
read_when:
  - "您想要检查本地或远程网关上的内部挂钩"
  - "您想要在本地配置中启用或禁用挂钩"
  - "您需要挂钩命令标志或 JSON 报告字段"
title: "挂钩 CLI"
doc-schema-version: 1
---

# `openclaw hooks`

检查和配置 [ 内部挂钩 ](/automation/hooks)：命令、消息、会话和网关事件的处理程序。裸 `openclaw hooks` 运行与 `openclaw hooks list` 相同的报告。这些命令不管理 HTTP [Webhooks](/automation/cron-jobs#webhooks) 或 [Plugin hooks](/plugins/hooks) 中键入的 `api.on(...)` 挂钩目录。

## <a id="target-and-scope"></a> 目标和范围

只读报告（`hooks`、`list`、`info`、`check`）首先在所选网关上调用 `hooks.status`。配置的远程网关和显式 `OPENCLAW_GATEWAY_URL` 目标具有权威性：缺少远程 URL、connection/authentication 失败以及不受支持的方法失败，而不是显示客户端本地挂钩。当隐式选择的本地网关不可用或其挂钩报告 method/agent 参数不受支持时，可以回退到本地发现。其他错误不会默默地用本地库存替换。

**启用、禁用、安装和更新变异本地 files/config/state.** 它们不会通过 RPC 更改远程网关。要更改服务器，请在该主机上使用其 profile/config. 启用、禁用和配置写入的新安装或链接可以在默认 `hybrid` [ 重载模式 ](/gateway/configuration#reload-modes) 中立即激活。 `off` 需要手动重新启动。不监视挂钩文件和元数据。编辑它们或更新现有的挂钩代码后重新启动。

`--agent <id>` 选择用于检查的代理工作区。当配置的代理没有隐式所有者时，这是必需的。空白或未知 ID 将失败。该选项在 `list`、`info`、`check`、`enable` 和 `disable` 之前或之后起作用。它不会将持久挂钩条目的范围限定为该代理，并且在 install/update. 上不受支持请参阅 [ 本地、远程和代理范围](/automation/hooks#local-remote-and-agent-scope) 了解工作区清单和网关加载之间的区别。

## <a id="list-hooks"></a> 列出 hooks

```bash
openclaw hooks [--agent <id>] [--json]
openclaw hooks list [--agent <id>] [--eligible] [--json] [-v|--verbose]
```

发现包括捆绑的挂钩、活动插件挂钩、托管挂钩、额外目录和选定的工作区。挂钩名称冲突遵循 [ 源策略 ](/automation/hooks/configuration#hook-discovery)。

| 选项          | 含义                                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `--agent <id>`  | 选择要检查的工作区。                                                                                        |
| `--eligible`    | 仅显示 `loadable` 挂钩：由每个 hook/source 策略启用、满足要求且至少有一个声明的事件。 |
| `--json`        | 将结构化 JSON 直接写入标准输出。也在父 `hooks` 命令上接受。                                  |
| `-v, --verbose` | 将缺失列添加到人类可读的表中。                                                                     |

人工输出是一个包含 Status、Hook、Description 和 Source 列的表，前面带有 `Hooks (<ready>/<total> ready)`。插件管理的源显示为 `plugin:<id>`。

<Note>
`ready`、`eligible` 和 `loadable` 是库存结果，而不是实时处理程序注册检查。该报告不会应用网关的主交换机或配置名称选择、导入处理程序以证明其正常工作，或验证事件是否已运行。当内部挂钩系统关闭时，捆绑的挂钩可能会显示为就绪状态。启用预期的钩子并[验证其真实的副作用](/automation/hooks#quick-start)。
</Note>

### <a id="list-json"></a> 列表 JSON

根对象包含 `workspaceDir`、`managedHooksDir` 和 `hooks`。每个钩子包括：

- Identity/display：`name`、`description`、`source`，可选`pluginId`、`emoji`、`homepage`和`managedByPlugin`。
- 状态：`enabledByConfig`、`requirementsSatisfied`、`loadable`、可选`blockedReason`，以及兼容性别名`eligible` （`loadable`）和`disabled` （`!enabledByConfig`）。
- Events/requirements：`events`、`unknownEvents`、`missing`，其数组为`bins`、`anyBins`、`env`、`config`、 `os`。

`blockedReason` 可以是 `disabled in config`、`workspace hook (disabled by default)`、`missing requirements` 或 `no events defined`。未知事件是建议性的：它们本身不会使钩子变得不可加载。

## <a id="get-hook-info"></a> 获取 hook 信息

```bash
openclaw hooks info <name> [--agent <id>] [--json]
```

接受钩子名称或其元数据 `hookKey`。精确的钩子名称优先于匹配的键。一个键必须标识一个钩子。显示源、描述符和处理程序路径、主页、事件、未知事件警告、阻止原因和每个需求状态。缺失或不明确的钩子退出时显示代码 1。不明确的选择器会列出候选者，以便您可以选择唯一的名称或键。

JSON 包括列表字段以及 `filePath`、`baseDir`、`handlerPath`、`hookKey`、`always`、`requirements`、`configChecks` 和标准化 `install` 选项。每个配置检查都有 `path` 和 `satisfied`。每个安装选项都有 `id`、`kind`、`label` 和 `bins`。安装选项是描述性元数据，而不是自动安装依赖项的命令。

## <a id="check-eligibility"></a> 检查资格

```bash
openclaw hooks check [--agent <id>] [--json]
```

打印 ready/not-ready 挂钩的总计并列出阻塞原因。 JSON 具有 `total`、`eligible`、`notEligible` 和 `hooks`，其中包含 `eligible` 名称数组和 `{ name, blockedReason?, missing }` 对象的 `notEligible` 数组。

即使钩子尚未准备好，成功的报告也会以代码 0 退出。对于自动资格门，请检查 JSON 计数，而不是将退出代码视为所有挂钩就绪结果。这仍然没有测试实际加载。

## <a id="enable-a-hook"></a> 启用钩子

```bash
openclaw hooks enable <name> [--agent <id>]
```

在本地发现钩子，然后在本地配置中写入 `hooks.internal.entries.<hookKey>.enabled = true` 和 `hooks.internal.enabled = true` 。该条目中的其他字段将被保留。精确的钩子名称优先于匹配的键。不明确的键匹配会在不写入的情况下失败。

由于缺少钩子、插件管理的钩子或未满足运行时要求，启用失败。它可以启用当前禁用的工作区挂钩。这并不能证明模块导出或事件订阅有效。还要检查 `info` 和网关日志。

该条目是 **global**，即使是 `--agent`：它适用于发现该密钥的任何地方。添加命名条目可以缩小以前开放式目录选择的范围。请参阅 [ 配置 ](/automation/hooks/configuration#configuration)。

正在运行的网关会在 `hybrid` 模式下重新加载选择。如果选定的挂钩无法加载，它将保留以前的处理程序。检查网关日志。重新加载不会重播 `gateway:startup`，因此 `boot-md` 在下一次网关启动时运行。

## <a id="disable-a-hook"></a> 禁用钩子

```bash
openclaw hooks disable <name> [--agent <id>]
```

写入 `hooks.internal.entries.<hookKey>.enabled = false`。它不会删除挂钩文件或更改主开关。 Missing/ambiguous 和插件管理的挂钩被拒绝。缺少运行时要求不会阻止禁用。在 `hybrid` 模式下，后续事件使用更新的选择。已经运行的事件以其原始处理程序结束。

这些命令无法切换插件管理的挂钩。通过 [`openclaw plugins`](/cli/plugins) 启用或禁用所属插件。

## <a id="install-and-update-hook-packs"></a> 安装和更新钩子包

使用统一的插件安装程序来查看钩子包：

```bash
openclaw plugins install npm:<package>
openclaw plugins install npm:<package>@<version> --pin
openclaw plugins install ./my-hook-pack
openclaw plugins install ./my-hook-pack.tgz

openclaw plugins update <id> --dry-run
openclaw plugins update <id>
```

包在 `openclaw.hooks` 下的 `package.json` 中声明钩子目录。没有 `package.json` 的本地目录可以包含单个 `HOOK.md` 和处理程序。复制的挂钩包安装到 `<stateDir>/hooks/<id>` 中。它们的挂钩在配置中启用，并且安装来源记录在共享 SQLite 状态中。该配置可以在 `hybrid` 模式下立即激活钩子。请勿在 `openclaw.json` 中创作 `hooks.internal.installs`。

对于 npm hook-pack 路径，规范仅限于注册表：带有可选的确切版本或 dist 标记的包名称。 Git/URL/file 规范、npm 别名和 semver 范围不是 npm 注册表规范。裸机规格和 `@latest` 保持稳定。预发布解决方案需要明确的预发布版本或非最新标签，例如 `@beta` 或 `@rc`。使用 `npm:` 显式选择 npm。统一安装程序支持 [`openclaw plugins`](/cli/plugins) 中描述的其他插件源。

支持的本地存档为 `.zip`、`.tgz`、`.tar.gz` 和 `.tar`。复制的挂钩包解析来自 `dependencies` 和 `optionalDependencies` 的运行时包，包括仅具有可选依赖项的包。仅在 `devDependencies` 中列出的封装被省略。 npm 包和依赖项安装使用 `--ignore-scripts`。这不会对已安装的处理程序进行沙箱处理。无论 npm 的 `dry-run` 或 `pack-destination` 设置如何，下载始终会在 OpenClaw 的临时工作区中创建存档。

### <a id="install-options-and-trust"></a> 安装选项和信任

| 选项                                 | 钩包效果                                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `-l, --link`                           | 将确切的本地挂钩或包根添加到 `hooks.internal.load.extraDirs` 而不是复制它。单钩和嵌套包布局都有效。  |
| `--pin`                                | 记录安装状态下已解析的确切 npm `name@version`（如果可用）；不适用于本地路径。                                |
| `--force`                              | 确认非 ClawHub 源并允许替换现有的复制安装。对于链接，它承认来源而不复制。 |
| `--acknowledge-install-policy-warning` | 在没有提示的情况下确认操作员 `security.installPolicy` 警告。阻止和策略失败仍然会停止安装。             |

交互式非 ClawHub 安装要求您确认信任。非交互式安装需要 `--force`。 `plugins install` 和 `hooks install` 别名均不接受 `--yes` 标志。 `--force` 也不能替代确认安装策略警告。在提供任何确认之前先查看来源。

<Warning>
链接的钩子直接从提供的路径运行。链接不会复制它或创建符号链接。单钩子根加载自己的 `HOOK.md` 和处理程序。包仅加载 `openclaw.hooks` 中列出的挂钩目录，包括 `./hooks/my-hook` 等嵌套路径。声明的路径必须保留在包内并直接指向钩子。即使所有声明的路径都被拒绝，发现也不会递归到嵌套包或集合中，也不会扫描未列出的子项。

仅链接受信任的代码。额外的目录仍然使目录挂钩名称选择在发现源中开放，而不仅仅是在链接包内。在 `hybrid` 模式下，链接可以立即激活钩子。编辑现有挂钩代码或元数据后重新启动，检查 `hooks list` 和 [ 验证处理程序的实际副作用](/automation/hooks#quick-start)。
</Warning>

### <a id="update-behavior"></a> 更新行为

更新使用跟踪的 npm 安装记录。履带式挂钩包 ID 使用其存储的规格。匹配的 npm 软件包规范可以选择新的 version/tag. 本地路径，并且 npm 挂钩更新程序不会刷新存档记录。

`--dry-run` 报告在不安装或重写配置的情况下会发生什么变化。 `--all` 在统一更新程序中选择 **插件和挂钩包**，包括通过已弃用的别名进行访问时。它不是仅挂钩的批量命令。

当适用的存储的完整性哈希与下载的工件不同时，更新程序会发出警告并要求在终端中进行确认。没有 CLI 标志回答该提示：`plugins update` 和 `hooks update` 别名均不接受 `--yes`，并且 `--acknowledge-install-policy-warning` 仅涵盖安装策略警告。 `--dry-run` 报告漂移而不提示。

### <a id="deprecated-aliases"></a> 已弃用的别名

这些命令打印弃用警告并转发给统一所有者：

```bash
openclaw hooks install <path-or-spec> [-l|--link] [--pin] [--force] [--acknowledge-install-policy-warning]
openclaw hooks update [id] [--all] [--dry-run] [--acknowledge-install-policy-warning]
```

如需更新，请提供 `id` 或 `--all`。别名不接受 `--agent`，并且不是新自动化的首选接口。

## <a id="bundled-hooks"></a> 捆绑挂钩

维护的目录、事件订阅、选项和验证注释位于 [Bundled hooks](/automation/hooks/bundled-hooks) 中。这包括 `boot-md`、`bootstrap-extra-files`、`command-logger`、`compaction-notifier` 和 `session-memory`（手动 **和自动** 复位捕获）。

### <a id="command-logger-log-file"></a> command-logger 日志文件

在网关主机上，使用默认状态目录：

```bash
tail -n 20 ~/.openclaw/logs/commands.log
jq . ~/.openclaw/logs/commands.log
jq 'select(.action == "new")' ~/.openclaw/logs/commands.log
```

使用 `<stateDir>/logs/commands.log` 作为自定义状态目录。这些记录包含会话和发件人标识符。保护访问并安排保留或轮换。钩子不会旋转它们。

## <a id="notes"></a> 说明

报告命令支持`--json`。成功 JSON 直接进入标准输出。故障使用标准 [CLI JSON 故障信封 ](/cli#json-failures)，缺少的挂钩信息还包括请求的 `hook` 名称。报告不执行挂钩作为测试。

隐藏的 `hooks relay` 命令是为生成的本机harness集成保留的。它不是内部挂钩测试或手动事件触发命令。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [自动化钩子](/automation/hooks)
- [插件钩子](/plugins/hooks)
- [插件 CLI](/cli/plugins)
