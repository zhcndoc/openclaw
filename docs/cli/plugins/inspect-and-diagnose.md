---
summary: "`plugins inspect`、`plugins doctor` 和 `plugins registry` 用于插件状态、加载失败和冷注册表"
title: "检查和诊断插件"
read_when:
  - "您需要插件的身份、功能、挂钩或运行时注册"
  - "您正在调试插件加载失败或过时的插件注册表"
---

本页涵盖只读诊断命令：`openclaw plugins inspect`、`openclaw plugins doctor` 和 `openclaw plugins registry`。

## <a id="inspect"></a> 检查

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --runtime
openclaw plugins inspect <id> --json
openclaw plugins inspect --all
```

检查会显示身份、加载状态、来源、清单能力、策略标志、诊断信息、安装元数据、捆绑包能力，以及任何检测到的 MCP 或 LSP server 支持，默认不会导入插件运行时。JSON 输出包括插件清单契约，例如 `contracts.agentToolResultMiddleware` 和 `contracts.trustedToolPolicies`，因此操作者可以在启用或重启插件之前审计受信任表面的声明。添加 `--runtime` 可加载插件模块，并包含已注册的 hooks、tools、commands、services、gateway methods 和 HTTP routes。运行时检查会直接报告缺失的插件依赖；安装和修复仍在 `openclaw plugins install`、`openclaw plugins update` 和 `openclaw doctor --fix` 中完成。

默认人工检查使用 `enabled`、`disabled` 或 `error` 状态标签，与 `plugins list` 匹配。它描述了元数据快照；它没有声明导入了插件模块。对于 `--runtime`，成功的运行时检查使用 `loaded`。 JSON 保留基础注册表状态和单独的 `imported` 字段。已知不兼容的插件在其修复指南中仍然可见。它们的诊断不会阻止检查其他插件，包括 `--runtime`。

对于多条目包，检查任何子包都会显示共享包安装元数据。 `inspect --all --json` 为每个子项包含相同的记录。如果包所有权缺失或不明确，检查将忽略安装元数据，而不是归因于不相关的安装记录。

插件拥有的 CLI 命令通常会作为根级 `openclaw` 命令组安装，但插件也可以在某个核心父命令下注册嵌套命令，例如 `openclaw nodes`。当 `inspect --runtime` 在 `cliCommands` 下显示某个命令时，请按照列出的路径直接运行它；例如，注册了 `demo-git` 的插件可以用 `openclaw demo-git ping` 验证。

每个插件都会根据其在运行时实际注册的内容进行分类：

| 形态               | 含义                                                           |
| ------------------- | ----------------------------------------------------------------- |
| `plain-capability`  | 恰好一种功能类型（e.g. 仅限提供者的插件）         |
| `hybrid-capability` | 多种能力类型（e.g. 文本+语音+图像）       |
| `hook-only`         | 只有 hooks，没有 capabilities、tools、commands、services 或 routes |
| `non-capability`    | 有 tools/commands/services，但没有 capabilities                       |

更多信息请参见 [插件形态](/plugins/architecture#plugin-shapes) 中的能力模型。

<Note>
`--json` 标志会输出适合脚本处理和审计的机器可读报告。`inspect --all` 会渲染全量表格，包含形态、能力类型、兼容性提示、bundle 能力和 hook 摘要列。`info` 是 `inspect` 的别名。

全局发现诊断转到 stderr，包括 `--json`。这解释了当工作区发现没有选定的系统所有者时，即使没有找到插件，也会出现部分清单。每个报告中都会保留特定于插件的诊断信息。策略字段使用与运行时配置相同的不区分大小写的插件 ID 匹配；报告的插件 ID 保留其声明的拼写。
</Note>

SDK 导入失败出现在现有插件错误输出和 Doctor 的插件诊断中。诊断为插件命名、导入 `openclaw/plugin-sdk/*` API、运行核心版本以及已知的构建版本。对于官方插件，请运行 `openclaw plugins update <id>`。正在运行的网关会在命令完成之前应用更新；否则它会在下次启动时加载更新。如果错误识别出嵌套的 SDK，则插件捆绑了不兼容的 OpenClaw SDK；更新插件或联系其作者。

JSON 诊断可能包括 `code: "sdk-incompatible"` 和可选的 `sdkCompatibility` 对象，其中包括 `seam`、`coreVersion`、`builtWithOpenClawVersion`（已知时）和 `nestedSdk`。没有这些字段的现有诊断仍然有效。模型错误指向运行时检查，不包括原始加载器错误。

## <a id="doctor"></a> 医师

```bash
openclaw plugins doctor
openclaw plugins doctor --json
```

`doctor` 报告插件加载错误、manifest/discovery 诊断、兼容性通知和过时的插件配置引用（例如缺少插件插槽）。它加载插件模块而不激活插件，并且不查询正在运行的网关。当这些本地检查通过时，它会打印 `Plugin discovery, module loading, compatibility, and configuration checks passed. Run "openclaw health" to check the running Gateway, including runtime quarantines and fallbacks.` [health 命令](/cli/health) 从网关读取当前运行时隔离和回退状态。如果过时的配置仍然存在，但安装树在其他方面都健康，则摘要会如此说明，而不是暗示完整的插件健康状况。

使用 `--json` 时，相同的发现、兼容性和配置诊断信息会作为一个机器可读对象返回。

医生等待检查注册资源释放，然后打印报告并设置诊断退出状态。清理失败会产生命令错误，而不是成功的报告。此检查不会处理正在运行的网关注册。

如果某个已配置插件存在于磁盘上，但被加载器的路径安全检查阻止，配置验证会保留该插件条目并将其报告为 `present but blocked`。请修复前面的被阻止插件诊断，例如路径所有权或 world-writable 权限，而不是移除 `plugins.entries.<id>` 或 `plugins.allow` 配置。

对于诸如缺少 `register`/`activate` 导出的模块形状故障，请使用 `OPENCLAW_PLUGIN_LOAD_DEBUG=1` 重新运行，以便在诊断输出中包含一个简洁的导出形状摘要。

## <a id="registry"></a> 注册表

```bash
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins registry --json
```

本地插件注册表是 OpenClaw 为已安装插件的身份、启用状态、源元数据和贡献所有权维护的持久冷读取模型。常规启动、提供者所有者查找、通道设置分类以及插件清单都可以在不导入插件运行时模块的情况下读取它。

当该注册表丢失或过时时，网关启动会验证当前插件元数据并从准备好的快照提供服务。准备就绪后，维护会使用当前配置和包事实在插件生命周期租约下刷新共享状态工作线程中的持久注册表。这会保留元数据以供以后更新，而不会阻止 SQLite 写入的请求处理。刷新失败会产生警告，但不会替换活动的运行时快照。配置恢复和数据库兼容性检查仍然是启动门；更新保留这些检查。

使用 `plugins registry` 来检查持久化注册表是否存在、是否最新或是否过期。使用 `--refresh` 可根据持久化插件索引、配置策略以及 manifest/package 元数据重建它。这是一条修复路径，不是运行时激活路径。

检查根据当前配置重新验证针对不可用的已配置插件加载路径的警告。删除最终路径将从检查视图中删除其警告；保持配置状态的丢失路径仍会产生警告。检查不会重写持久注册表。使用 `--refresh` 更新该分类帐。

当持久化插件记录和派生插件记录不同时，该命令会列出具有两个源的每个不同插件。 JSON 输出返回 `differences` 中的相同行。策略过时会在 `refreshReasons` 中报告 `policy-changed` 并将 `differences` 留空，因为策略验证在记录比较之前运行；策略刷新仍然可以更新启用的字段。刷新会在报告成功之前重新读取并验证其持久替换。如果验证过程中插件包文件不断变化，请停止这些更新并再次运行 `openclaw plugins registry --refresh`。

`openclaw doctor --fix` 还会修复与注册表相关的受管 npm 漂移。如果在受管插件 npm 项目下的孤立或已恢复的 `@openclaw/*` 包，或者旧的扁平受管 npm 根目录中的包，遮蔽了一个内置插件，doctor 会移除该过时包并重建注册表，使启动时能够根据内置 manifest 进行验证。当权威安装记录选择了某一个受管代际，但更早的扁平目录或代际目录仍然存在时，doctor 会将这些过时目录标记为待在网关重启后清理。Doctor 还会将宿主 `openclaw` 包重新链接到声明了 `peerDependencies.openclaw` 的受管 npm 插件中，以便像 `openclaw/plugin-sdk/*` 这样的包级运行时导入在更新或 npm 修复后能够正确解析。
