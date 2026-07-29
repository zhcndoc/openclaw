---
summary: "openclaw hooks 的 CLI 参考（代理钩子）"
read_when:
  - 你想管理代理钩子
  - 你想检查钩子可用性或启用工作区钩子
title: "钩子"
---

# `openclaw hooks`

管理代理钩子（用于 `/new`、`/reset` 和网关启动等命令的事件驱动自动化）。直接使用 `openclaw hooks` 等同于 `openclaw hooks list`。

相关：[Hooks](/automation/hooks) - [插件钩子](/plugins/hooks)

## 列出 hooks

```bash
openclaw hooks list [--eligible] [--json] [-v|--verbose]
```

列出从 workspace、managed、extra 和 bundled 目录中发现的 hooks。

- `--eligible`：仅显示满足要求的 hooks。
- `--json`：结构化输出。
- `-v, --verbose`：包含一个 Missing 列，显示未满足的要求。

```
Hooks (4/5 ready)

Ready:
  🚀 boot-md ✓ - 在 gateway 启动时运行 BOOT.md
  📎 bootstrap-extra-files ✓ - 在 agent bootstrap 期间注入额外的 workspace bootstrap 文件
  📝 command-logger ✓ - 将所有命令事件记录到集中式审计文件中
  💾 session-memory ✓ - 在发出 /new 或 /reset 命令时将会话上下文保存到 memory
```

## 获取 hook 信息

```bash
openclaw hooks info <name> [--json]
```

`<name>` is the hook name or hook key (for example, `session-memory`). Displays the source, file/handler path, homepage, events, and the status of each requirement (binary, environment, config, operating system).

## 检查资格

```bash
openclaw hooks check [--json]
```

打印就绪/未就绪的计数摘要；当 hooks 未就绪时，列出每个 hook 及其阻塞原因。

## 启用钩子

```bash
openclaw hooks enable <name>
```

在配置中添加/更新 `hooks.internal.entries.<name>.enabled = true`，并且还会将 `hooks.internal.enabled` 主开关打开（网关在至少配置了一个内部钩子之前不会加载任何内部钩子处理器）。如果钩子不存在、由插件管理，或不具备启用资格（缺少依赖），则会失败。

由插件管理的钩子会在 `hooks list` 中显示为 `plugin:<id>`，并且不能在此处启用/禁用；请改为启用或禁用其所属插件。

启用后请重启网关（macOS 菜单栏应用重启，或在开发环境中重启你的网关进程），以便重新加载钩子。

## 禁用钩子

```bash
openclaw hooks disable <name>
```

将 `hooks.internal.entries.<name>.enabled` 设置为 `false`。随后重启网关。

## 安装和更新钩子包

```bash
openclaw plugins install <package>        # 默认使用 npm
openclaw plugins install npm:<package>    # 仅使用 npm
openclaw plugins install <package> --pin  # 将解析后的版本固定
openclaw plugins install <path>           # 本地目录或归档文件
openclaw plugins install -l <path>        # 链接本地目录而不是复制

openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins update --dry-run
```

钩子包通过统一的 plugins 安装/更新器进行安装；`openclaw hooks install` / `openclaw hooks update` 仍然可作为已弃用的别名使用，它们会打印警告并转发到 `plugins` 命令。

- Npm 规格仅限注册表：包名加上可选的精确版本或 dist-tag。不接受 Git/URL/file 规格和 semver 范围。依赖安装在项目本地运行，并使用 `--ignore-scripts`。
- 裸规格和 `@latest` 会保持在稳定发布轨道；如果 npm 解析到预发布版本，OpenClaw 会停止并要求你显式选择加入（`@beta`、`@rc`，或精确的预发布版本）。
- 支持的归档格式：`.zip`、`.tgz`、`.tar.gz`、`.tar`。
- `-l, --link` 会链接本地目录而不是复制它（会将其添加到 `hooks.internal.load.extraDirs`）；被链接的钩子包是来自运维配置目录的受管钩子，而不是工作区钩子。
- `--pin` 会将 npm 安装记录为共享 SQLite 状态中的精确解析结果 `name@version`。
- 安装会将包复制到 `~/.openclaw/hooks/<id>`，在 `hooks.internal.entries.*` 下启用其钩子，并在共享 SQLite 状态中记录安装来源。
- 如果已存储的完整性哈希与获取到的制品不再匹配，OpenClaw 会发出警告并在继续之前提示；可传入全局 `--yes` 跳过提示（例如在 CI 中）。

## 内置钩子

| Hook                  | 事件                                              | 功能                                                                                     |
| --------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| boot-md               | `gateway:startup`                                 | 在网关启动时为每个已配置的代理作用域运行 `BOOT.md`                                                |
| bootstrap-extra-files | `agent:bootstrap`                                 | 在代理引导期间注入额外的引导文件（例如 monorepo 的 `AGENTS.md`）                              |
| command-logger        | `command`                                         | 将命令事件记录到 `~/.openclaw/logs/commands.log`                                          |
| compaction-notifier   | `session:compact:before`, `session:compact:after` | 在会话压缩开始和结束时发送可见的聊天通知                                                    |
| session-memory        | `command:new`, `command:reset`                    | 在执行 `/new` 或 `/reset` 时将会话上下文保存到内存中                                     |

使用 `openclaw hooks enable <hook-name>` 启用任意内置钩子。完整详情、配置键和默认值： [Bundled hooks](/automation/hooks#bundled-hooks)。

### command-logger 日志文件

```bash
tail -n 20 ~/.openclaw/logs/commands.log        # 最近的命令
cat ~/.openclaw/logs/commands.log | jq .          # 美化输出
grep '"action":"new"' ~/.openclaw/logs/commands.log | jq .   # 按 action 过滤
```

## 说明

- `hooks list --json`、`info --json` 和 `check --json` 会直接将结构化 JSON 输出到 stdout。

## 相关内容

- [CLI 参考](/cli)
- [自动化钩子](/automation/hooks)
