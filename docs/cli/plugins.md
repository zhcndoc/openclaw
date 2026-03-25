---
summary: "`openclaw plugins` 的命令行参考（列表、安装、市场、卸载、启用/禁用、诊断）"
read_when:
  - 您想要安装或管理 Gateway 插件或兼容包
  - 您想调试插件加载失败问题
title: "插件"
---

# `openclaw plugins`

管理 Gateway 插件/扩展、钩子包和兼容包。

相关内容：

- 插件系统: [Plugins](/tools/plugin)
- 包兼容性: [Plugin bundles](/plugins/bundles)
- 插件清单 + 模式: [Plugin manifest](/plugins/manifest)
- 安全加固: [Security](/gateway/security)

## 命令

```bash
openclaw plugins list
openclaw plugins install <path-or-spec>
openclaw plugins inspect <id>
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins uninstall <id>
openclaw plugins doctor
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins marketplace list <marketplace>
```

内置插件随 OpenClaw 一起提供，但默认禁用。使用 `plugins enable` 来启用它们。

Native OpenClaw 插件必须随附内嵌 JSON 模式的 `openclaw.plugin.json`（`configSchema`，即使为空）。兼容包使用自己的包清单。

`plugins list` 显示 `Format: openclaw` 或 `Format: bundle`。详细列表/信息输出还显示包子类型（`codex`、`claude` 或 `cursor`）及检测到的包能力。

### 安装

```bash
openclaw plugins install <package>                      # 优先 ClawHub，然后 npm
openclaw plugins install clawhub:<package>              # 仅 ClawHub
openclaw plugins install <package> --pin                # 固定版本
openclaw plugins install <path>                         # 本地路径
openclaw plugins install <plugin>@<marketplace>         # 市场
openclaw plugins install <plugin> --marketplace <name>  # 市场（显式）
```

裸包名优先检查 ClawHub，然后检查 npm。安全提示：将插件安装视为运行代码。优先使用固定版本。

`plugins install` 也是用于安装那些在 `package.json` 中暴露 `openclaw.hooks` 的钩子包的入口。使用 `openclaw hooks` 来过滤钩子可见性和逐个启用钩子，而不是用于包安装。

Npm 规范仅支持**注册表内**包（包名 + 可选**精确版本**或**发布标签**）。拒绝 Git/URL/文件规范和语义版本范围。依赖安装时默认使用 `--ignore-scripts` 以保障安全。

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

OpenClaw 从 ClawHub 下载包归档，检查所宣传的插件 API / 最低 Gateway 兼容性，然后通过常规归档路径安装。已记录的安装会保留其 ClawHub 源元数据以便后续更新。

当市场名称存在于 Claude 的本地注册表缓存 `~/.claude/plugins/known_marketplaces.json` 中时，使用 `plugin@marketplace` 简写：

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

当您想明确传递市场源时，使用 `--marketplace`：

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

市场源可以是：

- Claude 已知市场名，来自 `~/.claude/plugins/known_marketplaces.json`
- 本地市场根目录或 `marketplace.json` 路径
- 如 `owner/repo` 的 GitHub 仓库简写
- git URL

对于从 GitHub 或 git 加载的远程市场，插件条目必须位于克隆的市场仓库内。OpenClaw 接受来自该仓库的相对路径源，并拒绝远程清单中的外部 git、GitHub、URL/归档和绝对路径插件源。

对于本地路径和归档，OpenClaw 自动检测：

- native OpenClaw 插件（`openclaw.plugin.json`）
- Codex 兼容包（`.codex-plugin/plugin.json`）
- Claude 兼容包（`.claude-plugin/plugin.json` 或默认 Claude 组件布局）
- Cursor 兼容包（`.cursor-plugin/plugin.json`）

兼容包安装至正常扩展根目录，参与相同的列表/信息/启用/禁用流程。目前支持包技能、Claude 命令技能、Claude `settings.json` 默认值、Cursor 命令技能，以及兼容 Codex 钩子目录；其他检测到的包能力在诊断/信息中显示，但尚未接入运行时执行。

使用 `--link` 可避免复制本地目录（添加至 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

npm 安装时使用 `--pin` 会将解析的具体版本规范（`name@version`）保存到 `plugins.installs`，同时保持默认行为不固定版本。

### 卸载

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 命令会将插件记录从 `plugins.entries`、`plugins.installs`、插件允许列表，以及链接的 `plugins.load.paths` 条目中删除（如适用）。对于活跃的内存插件，内存槽将重置为 `memory-core`。

默认情况下，卸载还会删除活动状态目录扩展根目录下的插件安装目录（`$OPENCLAW_STATE_DIR/extensions/<id>`）。使用 `--keep-files` 可保留磁盘文件。

`--keep-config` 支持作为已废弃的 `--keep-files` 别名。

### 更新

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call@beta
```

更新适用于 `plugins.installs` 中的跟踪安装和 `hooks.internal.installs` 中的跟踪钩子包安装。

当您传递插件 id 时，OpenClaw 会重用该插件的已记录安装规范。这意味着先前存储的发布标签（如 `@beta`）和精确的固定版本将继续在后续的 `update <id>` 运行中使用。

对于 npm 安装，您也可以传递带有发布标签或精确版本的显式 npm 包规范。OpenClaw 会将该包名解析回跟踪的插件记录，更新该已安装插件，并记录新的 npm 规范以便将来基于 id 的更新。

当存在存储的完整性哈希且获取的构件哈希发生变化时，OpenClaw 会打印警告并在继续前要求确认。使用全局 `--yes` 可在 CI/非交互式运行中绕过提示。

### Inspect

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

对单个插件进行深度检查。显示身份、加载状态、源、注册的能力、钩子、工具、命令、服务、Gateway 方法、HTTP 路由、策略标志、诊断和安装元数据。

每个插件根据其在运行时实际注册的内容进行分类：

- **plain-capability** — 单一能力类型（例如仅提供程序的插件）
- **hybrid-capability** — 多种能力类型（例如文本 + 语音 + 图像）
- **hook-only** — 仅钩子，无能力或表面
- **non-capability** — 工具/命令/服务但无能力

有关能力模型的更多信息，请参见 [插件形态](/plugins/architecture#plugin-shapes)。

`--json` 标志输出适合脚本编写和审计的机器可读报告。

`info` 是 `inspect` 的别名。
