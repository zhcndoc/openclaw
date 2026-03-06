---
summary: "`openclaw hooks` CLI 参考（代理钩子）"
read_when:
  - 你想管理代理钩子
  - 你想安装或更新钩子
title: "钩子"
---

# `openclaw hooks`

管理代理钩子（针对 `/new`、`/reset` 和网关启动等命令的事件驱动自动化）。

相关内容：

- 钩子：[Hooks](/automation/hooks)
- 插件钩子：[Plugins](/tools/plugin#plugin-hooks)

## 列出所有钩子

```bash
openclaw hooks list
```

列出工作区、管理和捆绑目录中所有发现的钩子。

**选项：**

- `--eligible`：只显示符合条件的钩子（满足要求）
- `--json`：以 JSON 格式输出
- `-v, --verbose`：显示详细信息，包括缺失的要求

**示例输出：**

```
Hooks (4/4 ready)

Ready:
  🚀 boot-md ✓ - 在网关启动时运行 BOOT.md
  📎 bootstrap-extra-files ✓ - 代理启动时注入额外的工作区引导文件
  📝 command-logger ✓ - 将所有命令事件记录到集中审计文件
  💾 session-memory ✓ - 在执行 /new 命令时保存会话上下文到内存
```

**示例（详细模式）：**

```bash
openclaw hooks list --verbose
```

显示不符合条件钩子缺失的要求。

**示例（JSON）：**

```bash
openclaw hooks list --json
```

返回结构化 JSON 供程序调用。

## 获取钩子信息

```bash
openclaw hooks info <name>
```

显示特定钩子的详细信息。

**参数：**

- `<name>`：钩子名称（例如 `session-memory`）

**选项：**

- `--json`：以 JSON 格式输出

**示例：**

```bash
openclaw hooks info session-memory
```

**输出：**

```
💾 session-memory ✓ Ready

在执行 /new 命令时保存会话上下文到内存

详情：
  来源: openclaw-bundled
  路径: /path/to/openclaw/hooks/bundled/session-memory/HOOK.md
  处理程序: /path/to/openclaw/hooks/bundled/session-memory/handler.ts
  主页: https://docs.openclaw.ai/automation/hooks#session-memory
  事件: command:new

要求：
  配置: ✓ workspace.dir
```

## 检查钩子合格状态

```bash
openclaw hooks check
```

显示钩子合格状态摘要（已准备/未准备数量）。

**选项：**

- `--json`：以 JSON 格式输出

**示例输出：**

```
Hooks Status

总钩子数: 4
准备好: 4
未准备: 0
```

## 启用钩子

```bash
openclaw hooks enable <name>
```

通过将钩子添加到配置文件（`~/.openclaw/config.json`）启用特定钩子。

**注意：** 由插件管理的钩子在 `openclaw hooks list` 中显示为 `plugin:<id>`，无法通过此命令启用/禁用。需启用/禁用对应插件。

**参数：**

- `<name>`：钩子名称（例如 `session-memory`）

**示例：**

```bash
openclaw hooks enable session-memory
```

**输出：**

```
✓ 已启用钩子：💾 session-memory
```

**操作说明：**

- 检查钩子是否存在且符合条件
- 在配置中更新 `hooks.internal.entries.<name>.enabled = true`
- 将配置保存至磁盘

**启用后：**

- 重启网关以重新加载钩子（macOS 菜单栏应用重启，或在开发中重启网关进程）

## 禁用钩子

```bash
openclaw hooks disable <name>
```

通过更新配置禁用指定钩子。

**参数：**

- `<name>`：钩子名称（例如 `command-logger`）

**示例：**

```bash
openclaw hooks disable command-logger
```

**输出：**

```
⏸ 已禁用钩子：📝 command-logger
```

**禁用后：**

- 重启网关以重新加载钩子

## 安装钩子

```bash
openclaw hooks install <path-or-spec>
openclaw hooks install <npm-spec> --pin
```

从本地文件夹/归档或 npm 安装钩子包。

npm 规格仅限 **注册表**（包名 + 可选版本/标签），不支持 Git/URL/文件规格。本地依赖安装为安全起见会带上 `--ignore-scripts` 参数。

**操作说明：**

- 将钩子包复制到 `~/.openclaw/hooks/<id>`
- 在 `hooks.internal.entries.*` 中启用已安装的钩子
- 在 `hooks.internal.installs` 中记录安装信息

**选项：**

- `-l, --link`：链接本地目录而非复制（添加至 `hooks.internal.load.extraDirs`）
- `--pin`：将 npm 安装记录为精确的 `name@version`，保存在 `hooks.internal.installs`

**支持的归档格式：** `.zip`、`.tgz`、`.tar.gz`、`.tar`

**示例：**

```bash
# 本地目录
openclaw hooks install ./my-hook-pack

# 本地归档
openclaw hooks install ./my-hook-pack.zip

# NPM 包
openclaw hooks install @openclaw/my-hook-pack

# 链接本地目录（不复制）
openclaw hooks install -l ./my-hook-pack
```

## 更新钩子

```bash
openclaw hooks update <id>
openclaw hooks update --all
```

更新已安装的钩子包（仅限 npm 安装的）。

**选项：**

- `--all`：更新所有跟踪的钩子包
- `--dry-run`：显示将要变更的内容但不写入

当存在存储的完整性哈希且获取到的包哈希发生变化时，OpenClaw 会打印警告并要求确认是否继续。可使用全局 `--yes` 跳过 CI 或非交互式环境中的提示。

## 捆绑钩子

### session-memory

在执行 `/new` 时保存会话上下文到内存。

**启用：**

```bash
openclaw hooks enable session-memory
```

**输出：** `~/.openclaw/workspace/memory/YYYY-MM-DD-slug.md`

**查看：** [session-memory 文档](/automation/hooks#session-memory)

### bootstrap-extra-files

在 `agent:bootstrap` 期间注入额外的引导文件（例如 monorepo 本地的 `AGENTS.md` / `TOOLS.md`）。

**启用：**

```bash
openclaw hooks enable bootstrap-extra-files
```

**查看：** [bootstrap-extra-files 文档](/automation/hooks#bootstrap-extra-files)

### command-logger

将所有命令事件记录到集中审计文件。

**启用：**

```bash
openclaw hooks enable command-logger
```

**输出：** `~/.openclaw/logs/commands.log`

**查看日志：**

```bash
# 最近命令
tail -n 20 ~/.openclaw/logs/commands.log

# 格式化输出
cat ~/.openclaw/logs/commands.log | jq .

# 按操作过滤
grep '"action":"new"' ~/.openclaw/logs/commands.log | jq .
```

**查看：** [command-logger 文档](/automation/hooks#command-logger)

### boot-md

在网关启动时（频道启动后）运行 `BOOT.md`。

**事件**：`gateway:startup`

**启用：**

```bash
openclaw hooks enable boot-md
```

**查看：** [boot-md 文档](/automation/hooks#boot-md)
