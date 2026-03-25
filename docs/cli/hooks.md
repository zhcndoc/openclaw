---
summary: "`openclaw hooks` CLI 参考（代理钩子）"
read_when:
  - 您想管理代理钩子
  - 您想检查钩子可用性或启用工作区钩子
title: "hooks"
---

# `openclaw hooks`

管理代理钩子（针对 `/new`、`/reset` 和网关启动等命令的事件驱动自动化）。

相关内容：

- Hooks: [Hooks](/automation/hooks)
- Plugin hooks: [Plugin hooks](/plugins/architecture#provider-runtime-hooks)

## 列出所有钩子

```bash
openclaw hooks list
```

列出所有发现的钩子，包括工作区、托管、额外和捆绑目录中的钩子。

**选项：**

- `--eligible`：只显示符合条件的钩子（满足要求）
- `--json`：以 JSON 格式输出
- `-v, --verbose`：显示详细信息，包括缺失的要求

**示例输出：**

```
Hooks (4/4 ready)

Ready:
  🚀 boot-md ✓ - 在网关启动时运行 BOOT.md
  📎 bootstrap-extra-files ✓ - 在代理引导期间注入额外的工作区引导文件
  📝 command-logger ✓ - 将所有命令事件记录到集中审计文件
  💾 session-memory ✓ - 当发出 /new 或 /reset 命令时将会话上下文保存到内存
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

当发出 /new 或 /reset 命令时将会话上下文保存到内存

Details:
  Source: openclaw-bundled
  Path: /path/to/openclaw/hooks/bundled/session-memory/HOOK.md
  Handler: /path/to/openclaw/hooks/bundled/session-memory/handler.ts
  Homepage: https://docs.openclaw.ai/automation/hooks#session-memory
  Events: command:new, command:reset

要求：
  配置: ✓ workspace.dir
```

## 检查钩子合格状态

```bash
openclaw hooks check
```

显示钩子合格状态摘要（就绪与未就绪的数量）。

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

**注意：** 工作区钩子默认禁用，直到在此处或配置中启用。由插件管理的钩子在 `openclaw hooks list` 中显示为 `plugin:<id>`，无法在此处启用/禁用。请改为启用/禁用插件。

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

- 验证钩子是否存在且符合条件
- 在配置中更新 `hooks.internal.entries.<name>.enabled = true`
- 将配置保存至磁盘

如果钩子来自 `<workspace>/hooks/`，在网关加载它之前需要此选择加入步骤。

**启用后：**

- 重启网关以重新加载钩子（重启 macOS 菜单栏应用，或在开发中重启网关进程）

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

## 安装钩子包

```bash
openclaw plugins install <package>        # 先从 ClawHub，再从 npm
openclaw plugins install <package> --pin  # 固定版本
openclaw plugins install <path>           # 本地路径
```

通过统一的插件安装程序安装钩子包。

`openclaw hooks install` 仍可作为兼容性别名使用，但会打印弃用警告并转发到 `openclaw plugins install`。

npm 规格仅限 **注册表**（包名 + 可选版本/标签），不支持 Git/URL/文件规格。出于安全考虑，本地依赖安装会带上 `--ignore-scripts` 参数。

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
openclaw plugins install ./my-hook-pack

# 本地归档
openclaw plugins install ./my-hook-pack.zip

# NPM 包
openclaw plugins install @openclaw/my-hook-pack

# 链接本地目录而不复制
openclaw plugins install -l ./my-hook-pack
```

链接的钩子包被视为来自操作员配置目录的托管钩子，而非工作区钩子。

## 更新钩子包

```bash
openclaw plugins update <id>
openclaw plugins update --all
```

通过统一的插件更新程序更新跟踪的基于 npm 的钩子包。

`openclaw hooks update` 仍可作为兼容性别名使用，但会打印弃用警告并转发到 `openclaw plugins update`。

**选项：**

- `--all`：更新所有跟踪的钩子包
- `--dry-run`：显示将要变更的内容但不写入

当存在存储的完整性哈希且获取到的包哈希发生变化时，OpenClaw 会打印警告并要求确认是否继续。可使用全局 `--yes` 跳过 CI 或非交互式环境中的提示。

## 捆绑钩子

### session-memory

当您发出 `/new` 或 `/reset` 时将会话上下文保存到内存。

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
