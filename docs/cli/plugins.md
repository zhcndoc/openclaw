---
summary: "`openclaw plugins` 的命令行参考（列表、安装、市场、卸载、启用/禁用、诊断）"
read_when:
  - 您想要安装或管理 Gateway 插件或兼容包
  - 您想调试插件加载失败问题
title: "插件"
---

# `openclaw plugins`

管理 Gateway 插件/扩展和兼容包。

相关内容：

- 插件系统: [Plugins](/tools/plugin)
- 包兼容性: [Plugin bundles](/plugins/bundles)
- 插件清单 + 模式: [Plugin manifest](/plugins/manifest)
- 安全加固: [Security](/gateway/security)

## 命令

```bash
openclaw plugins list
openclaw plugins info <id>
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
openclaw plugins install <path-or-spec>
openclaw plugins install <npm-spec> --pin
openclaw plugins install <plugin>@<marketplace>
openclaw plugins install <plugin> --marketplace <marketplace>
```

安全提示：安装插件等同于运行代码。建议使用固定版本。

Npm 规范仅支持**注册表内**包（包名 + 可选**精确版本**或**发布标签**）。拒绝 Git/URL/文件规范和语义版本范围。依赖安装时默认使用 `--ignore-scripts` 以保障安全。

裸规范和 `@latest` 将保持在稳定版本。如果 npm 解析出其中任一为预发布版本，OpenClaw 会停止操作并要求您显式选择预发布标签，如 `@beta`／`@rc` 或精确的预发布版本，如 `@1.2.3-beta.4`。

如果裸安装规范与内置插件 ID（例如 `diffs`）匹配，OpenClaw 会直接安装内置插件。要安装同名 npm 包，请使用显式的作用域规范（例如 `@scope/diffs`）。

支持的存档格式：`.zip`、`.tgz`、`.tar.gz`、`.tar`。

也支持 Claude 市场安装。

当市场名称存在于 Claude 的本地注册缓存 `~/.claude/plugins/known_marketplaces.json` 时，可以使用 `plugin@marketplace` 简写：

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

对于本地路径和归档，OpenClaw 会自动检测：

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
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins update <id> --dry-run
```

更新适用于 `plugins.installs` 中跟踪的安装，目前支持 npm 和市场安装。

当存在存储的完整性校验哈希且获取的制品哈希发生变化时，OpenClaw 会打印警告并在继续前请求确认。可使用全局选项 `--yes` 在 CI/非交互环境中跳过提示。
