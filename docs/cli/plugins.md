---
summary: "`openclaw plugins` 命令行参考（列出、安装、卸载、启用/禁用、诊断）"
read_when:
  - 想要安装或管理进程内的 Gateway 插件
  - 想要调试插件加载失败问题
title: "plugins"
---

# `openclaw plugins`

管理 Gateway 插件/扩展（加载于进程内）。

相关内容：

- 插件系统：[插件](/tools/plugin)
- 插件清单 + 规范：[插件清单](/plugins/manifest)
- 安全加固：[安全](/gateway/security)

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
```

内置插件随 OpenClaw 一起提供，但默认禁用。使用 `plugins enable` 来启用它们。

所有插件必须随附一个 `openclaw.plugin.json` 文件，其中包含内嵌的 JSON Schema（`configSchema`，即使为空）。缺失或无效的清单或规范会阻止插件加载，并导致配置验证失败。

### 安装

```bash
openclaw plugins install <path-or-spec>
openclaw plugins install <npm-spec> --pin
```

安全提示：将插件安装视为运行代码。建议使用固定版本。

Npm 规范仅支持**注册表内**的包（包名 + 可选版本/标签）。拒绝 Git/URL/文件规范。依赖安装时默认使用 `--ignore-scripts` 以保障安全。

如果裸安装规范与内置插件 ID（例如 `diffs`）匹配，OpenClaw 会直接安装内置插件。要安装同名 npm 包，请使用显式的作用域规范（例如 `@scope/diffs`）。

支持的存档格式：`.zip`、`.tgz`、`.tar.gz`、`.tar`。

使用 `--link` 可避免复制本地目录（添加至 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

npm 安装时使用 `--pin` 可以将解析得到的具体版本规范（`name@version`）保存到 `plugins.installs`，同时保持默认行为不固定版本。

### 卸载

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 命令会将插件记录从 `plugins.entries`、`plugins.installs`、插件允许列表，以及链接的 `plugins.load.paths` 条目中删除（如适用）。对于活跃的内存插件，内存槽将重置为 `memory-core`。

默认情况下，卸载还会删除活动状态目录扩展根目录下的插件安装目录（`$OPENCLAW_STATE_DIR/extensions/<id>`）。使用 `--keep-files` 可以保留磁盘文件。

`--keep-config` 支持作为已废弃的 `--keep-files` 别名。

### 更新

```bash
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins update <id> --dry-run
```

更新仅适用于通过 npm 安装的插件（在 `plugins.installs` 中跟踪）。

当存在存储的完整性校验哈希且获取的制品哈希发生变化时，OpenClaw 会打印警告并在继续前请求确认。可使用全局选项 `--yes` 在 CI/非交互环境下跳过提示。
