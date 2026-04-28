---
summary: "`openclaw plugins` 的命令行参考（列表、安装、市场、卸载、启用/禁用、诊断）"
read_when:
  - 您想安装或管理 Gateway 插件或兼容包
  - 您想调试插件加载失败
title: "插件"
---

# `openclaw plugins`

管理 Gateway 插件、钩子包和兼容包。

相关内容：

- 插件系统：[插件](/tools/plugin)
- 包兼容性：[插件包](/plugins/bundles)
- 插件清单 + 模式：[插件清单](/plugins/manifest)
- 安全加固：[安全性](/gateway/security)

## 命令

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
openclaw plugins install <path-or-spec>
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
openclaw plugins inspect --all
openclaw plugins info <id>
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins uninstall <id>
openclaw plugins doctor
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins marketplace list <marketplace>
openclaw plugins marketplace list <marketplace> --json
```

内置插件随 OpenClaw 一起发布。有些默认启用（例如内置模型提供商、内置语音提供商和内置浏览器插件）；其他需要 `plugins enable`。

原生 OpenClaw 插件必须随附内嵌 JSON 模式的 `openclaw.plugin.json`（`configSchema`，即使为空）。兼容包使用自己的包清单。

`plugins list` 显示 `Format: openclaw` 或 `Format: bundle`。详细列表/信息输出还显示包子类型（`codex`、`claude` 或 `cursor`）及检测到的包能力。

### 安装

```bash
openclaw plugins install <package>                      # 先查 ClawHub，再查 npm
openclaw plugins install clawhub:<package>              # 仅 ClawHub
openclaw plugins install npm:<package>                  # 仅 npm
openclaw plugins install <package> --force              # 覆盖现有安装
openclaw plugins install <package> --pin                # 固定版本
openclaw plugins install <package> --dangerously-force-unsafe-install
openclaw plugins install <path>                         # 本地路径
openclaw plugins install <plugin>@<marketplace>         # 市场
openclaw plugins install <plugin> --marketplace <name>  # 市场（显式）
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
```

裸包名优先检查 ClawHub，然后检查 npm。安全提示：将插件安装视为运行代码。优先使用固定版本。

如果您的 `plugins` 部分由单文件 `$include` 支持，则 `plugins install/update/enable/disable/uninstall` 会写回该被包含的文件，而保持 `openclaw.json` 不变。根包含、包含数组以及带有同级覆盖项的包含会关闭失败，而不是被展平。有关支持的形状，请参见[配置包含](/gateway/configuration)。

    如果安装期间配置无效，`plugins install` 通常会关闭失败，并提示您先运行 `openclaw doctor --fix`。在 Gateway 启动期间，某个插件的无效配置会被隔离到该插件，从而使其他通道和插件可以继续运行；`openclaw doctor --fix` 可以将无效的插件条目隔离。文档中唯一的安装时例外，是一个狭窄的捆绑插件恢复路径，适用于明确选择加入 `openclaw.install.allowInvalidConfigRecovery` 的插件。

`--force` 会重用现有安装目标，并就地覆盖已安装的插件或钩子包。当您有意从新的本地路径、归档、ClawHub 包或 npm 制品重新安装同一 ID 时，请使用它。对于已跟踪的 npm 插件的常规升级，请优先使用 `openclaw plugins update <id-or-npm-spec>`。

如果您对一个已经安装的插件 id 运行 `plugins install`，OpenClaw 会停止并提示您使用 `plugins update <id-or-npm-spec>` 进行常规升级，或者在您确实想从不同来源覆盖当前安装时使用 `plugins install <package> --force`。

`--pin` 仅适用于 npm 安装。不支持与 `--marketplace` 一起使用，因为市场安装会保留市场源元数据，而不是 npm 规范。

`--dangerously-force-unsafe-install` 是针对内置危险代码扫描器误报的紧急选项。即使内置扫描器报告 `critical` 发现，它也允许安装继续，但它**不**绕过插件 `before_install` 钩子策略块，也**不**绕过扫描失败。

此 CLI 标志适用于插件安装/更新流程。Gateway 支持的技能依赖安装使用匹配的 `dangerouslyForceUnsafeInstall` 请求覆盖，而 `openclaw skills install` 仍然是单独的 ClawHub 技能下载/安装流程。

`plugins install` 也是在 `package.json` 中暴露 `openclaw.hooks` 的钩子包的安装入口。使用 `openclaw hooks` 进行过滤后的钩子可见性和逐个钩子启用，而不是包安装。

    当您想跳过 ClawHub 查找并直接从 npm 安装时，请使用 `npm:<package>`。裸包规范仍然优先使用 ClawHub，仅在 ClawHub 没有该包或版本时才回退到 npm。

    裸规范和 `@latest` 将保持在稳定版本。如果 npm 解析出其中任一为预发布版本，OpenClaw 会停止操作并要求您显式选择预发布标签，如 `@beta`／`@rc` 或精确的预发布版本，如 `@1.2.3-beta.4`。

裸规范和 `@latest` 将保持在稳定版本。如果 npm 解析出其中任一为预发布版本，OpenClaw 会停止操作并要求您显式选择预发布标签，如 `@beta`／`@rc` 或精确的预发布版本，如 `@1.2.3-beta.4`。

如果裸安装规范与内置插件 ID（例如 `diffs`）匹配，OpenClaw 会直接安装内置插件。要安装同名 npm 包，请使用显式的作用域规范（例如 `@scope/diffs`）。

支持的存档格式：`.zip`、`.tgz`、`.tar.gz`、`.tar`。

也支持 Claude 市场安装。

ClawHub 安装使用显式的 `clawhub:<package>` 定位器：

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

OpenClaw 现在也优先使用 ClawHub 处理裸 npm 安全插件规范。仅当 ClawHub 没有该包或版本时才回退到 npm：

```bash
openclaw plugins install openclaw-codex-app-server
```

当您想强制仅使用 npm 解析时，请使用 `npm:`，例如当 ClawHub 不可达，或者您知道该包只存在于 npm 上时：

```bash
openclaw plugins install npm:openclaw-codex-app-server
openclaw plugins install npm:@scope/plugin-name@1.0.1
```

OpenClaw 会从 ClawHub 下载包归档，检查所声明的插件 API / 最低 Gateway 兼容性，然后通过正常的归档路径进行安装。已记录的安装会保留其 ClawHub 源元数据，以便后续更新。
未指定版本的 ClawHub 安装会保留未固定的记录规范，因此 `openclaw plugins update` 可以跟随较新的 ClawHub 发布；显式版本或标签选择器，如 `clawhub:pkg@1.2.3` 和 `clawhub:pkg@beta`，则会保持锁定到该选择器。

当市场名称存在于 Claude 的本地注册表缓存 `~/.claude/plugins/known_marketplaces.json` 中时，使用 `plugin@marketplace` 简写：

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

当您想明确传递市场源时，使用 `--marketplace`：

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

市场源可以是：

- 来自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知市场名称
- 本地市场根目录或 `marketplace.json` 路径
- GitHub 仓库简写，如 `owner/repo`
- GitHub 仓库 URL，如 `https://github.com/owner/repo`
- git URL

对于从 GitHub 或 git 加载的远程市场，插件条目必须保留在克隆的市场仓库内。OpenClaw 接受来自该仓库的相对路径源，并拒绝来自远程清单的 HTTP(S)、绝对路径、git、GitHub 和其他非路径插件源。

对于本地路径和归档，OpenClaw 自动检测：

- 原生 OpenClaw 插件（`openclaw.plugin.json`）
- Codex 兼容包（`.codex-plugin/plugin.json`）
- Claude 兼容包（`.claude-plugin/plugin.json` 或默认 Claude 组件布局）
- Cursor 兼容包（`.cursor-plugin/plugin.json`）

兼容包会安装到正常的插件根目录中，并参与相同的列表/信息/启用/禁用流程。当前支持包技能、Claude 命令技能、Claude `settings.json` 默认值、Claude `.lsp.json` /
清单声明的 `lspServers` 默认值、Cursor 命令技能，以及兼容的 Codex 钩子目录；其他检测到的包能力会在诊断/信息中显示，但尚未接入运行时执行。

### 列表

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
```

使用 `--enabled` 仅显示已加载的插件。使用 `--verbose` 从表格视图切换到带有源/起源/版本/激活元数据的每个插件详细信息行。使用 `--json` 获取机器可读的清册加上注册表诊断。

`plugins list` 会从当前 CLI 环境和配置中执行发现。它有助于检查插件是否已启用/可加载，但它不是对已运行 Gateway 进程的实时运行时探测。更改插件代码、启用状态、钩子策略或 `plugins.load.paths` 后，在期望新的 `register(api)` 代码或钩子运行之前，请重启为该通道提供服务的 Gateway。对于远程/容器部署，请确认您重启的是实际的 `openclaw gateway run` 子进程，而不仅仅是包装进程。

用于运行时钩子调试：

- `openclaw plugins inspect <id> --json` 显示来自模块加载检查过程的已注册钩子和诊断信息
- `openclaw gateway status --deep --require-rpc` 确认可达的 Gateway、服务/进程提示、配置路径和 RPC 健康状态
- 非捆绑的会话钩子（`llm_input`、`llm_output`、`agent_end`）需要 `plugins.entries.<id>.hooks.allowConversationAccess=true`

使用 `--link` 可避免复制本地目录（会将其添加到 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

`--force` 不支持与 `--link` 一起使用，因为链接安装会重用源路径，而不是复制托管的安装目标。

在 npm 安装上使用 `--pin` 可在 `plugins.installs` 中保存解析后的精确规范（`name@version`），同时保持默认行为未固定。

### 卸载

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 命令会将插件记录从 `plugins.entries`、`plugins.installs`、插件允许列表，以及链接的 `plugins.load.paths` 条目中删除（如适用）。对于活跃的内存插件，内存槽将重置为 `memory-core`。

默认情况下，卸载还会删除活动状态目录插件根目录下的插件安装目录。使用 `--keep-files` 可保留磁盘上的文件。

`--keep-config` 支持作为已废弃的 `--keep-files` 别名。

### 更新

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call@beta
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

更新适用于 `plugins.installs` 中的跟踪安装和 `hooks.internal.installs` 中的跟踪钩子包安装。

当您传递插件 id 时，OpenClaw 会重用该插件的已记录安装规范。这意味着先前存储的发布标签（如 `@beta`）和精确的固定版本将继续在后续的 `update <id>` 运行中使用。

对于 npm 安装，您也可以传递带有发布标签或精确版本的显式 npm 包规范。OpenClaw 会将该包名解析回跟踪的插件记录，更新该已安装插件，并记录新的 npm 规范以便将来基于 id 的更新。

如果不带版本或标签直接传递 npm 包名，也会解析回已跟踪的插件记录。当插件被固定到精确版本，而您希望将其切回到注册表的默认发布线时，请使用此方式。

在执行实时 npm 更新之前，OpenClaw 会将已安装包版本与 npm 注册表元数据进行检查。如果已安装版本和已记录的制品标识已与解析目标匹配，则会跳过更新，而不会下载、重新安装或重写 `openclaw.json`。

当存在已保存的完整性哈希且获取到的制品哈希发生变化时，OpenClaw 会将其视为 npm 制品漂移。交互式 `openclaw plugins update` 命令会打印预期哈希和实际哈希，并在继续之前请求确认。非交互式更新辅助工具会关闭失败，除非调用方提供明确的继续策略。

`--dangerously-force-unsafe-install` 也可用于 `plugins update`，作为插件更新期间内置危险代码扫描误报的紧急覆盖。它仍然不绕过插件 `before_install` 策略块或扫描失败阻止，并且仅适用于插件更新，不适用于钩子包更新。

### 检查

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

对单个插件的深度内省。显示身份、加载状态、源、注册的能力、钩子、工具、命令、服务、Gateway 方法、HTTP 路由、策略标志、诊断、安装元数据、包能力以及任何检测到的 MCP 或 LSP 服务器支持。

每个插件根据其在运行时实际注册的内容进行分类：

- **plain-capability** — 单一能力类型（例如仅提供程序的插件）
- **hybrid-capability** — 多种能力类型（例如文本 + 语音 + 图像）
- **hook-only** — 仅钩子，无能力或表面
- **non-capability** — 工具/命令/服务但无能力

有关能力模型的更多信息，请参见 [插件形态](/plugins/architecture#plugin-shapes)。

`--json` 标志输出适合脚本编写和审计的机器可读报告。

`inspect --all` 渲染一个全局表格，包含形态、能力种类、兼容性通知、包能力和钩子摘要列。

`info` 是 `inspect` 的别名。

### 诊断

```bash
openclaw plugins doctor
```

`doctor` 报告插件加载错误、清单/发现诊断和兼容性通知。当一切正常时，它打印 `No plugin issues detected.`。

对于诸如缺少 `register`/`activate` 导出之类的模块形态失败，请使用 `OPENCLAW_PLUGIN_LOAD_DEBUG=1` 重新运行，以便在诊断输出中包含一个简洁的导出形态摘要。

### Marketplace

```bash
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
```

Marketplace 列表接受本地市场路径、`marketplace.json` 路径、类似 `owner/repo` 的 GitHub 简写、GitHub 仓库 URL，或 git URL。`--json` 会打印解析后的源标签以及解析后的市场清单和插件条目。

## 相关内容

- [CLI 参考](/cli)
- [构建插件](/plugins/building-plugins)
- [社区插件](/plugins/community)
