---
summary: "openclaw hooks 的 CLI 参考（代理钩子）"
read_when:
  - 你想管理代理钩子
  - 你想检查钩子可用性或启用工作区钩子
title: "钩子"
---

# `openclaw hooks`

管理代理钩子（用于 `/new`、`/reset` 和网关启动等命令的事件驱动自动化）。

不带子命令运行 `openclaw hooks` 等同于 `openclaw hooks list`。

相关内容：

- 钩子: [Hooks](/automation/hooks)
- 插件钩子: [Plugin hooks](/plugins/hooks)

## 列出所有钩子

```bash
openclaw hooks list
```

列出来自工作区、受管理、额外和内置目录的所有已发现钩子。
在至少配置了一个内部钩子之前，网关启动不会加载内部钩子处理程序。

**选项：**

- `--eligible`: 仅显示符合条件的钩子（满足要求）
- `--json`: 以 JSON 输出
- `-v, --verbose`: 显示详细信息，包括缺失的要求

**示例输出：**

```
钩子（4/4 已就绪）

已就绪：
  🚀 boot-md ✓ - 在网关启动时运行 BOOT.md
  📎 bootstrap-extra-files ✓ - 在代理启动期间注入额外的工作区启动文件
  📝 command-logger ✓ - 将所有命令事件记录到集中审计文件中
  💾 session-memory ✓ - 在发出 /new 或 /reset 命令时将会话上下文保存到内存
```

**示例（详细模式）：**

```bash
openclaw hooks list --verbose
```

显示不符合条件的钩子缺失的要求。

**示例（JSON）：**

```bash
openclaw hooks list --json
```

返回结构化 JSON 供程序化使用。

## 获取钩子信息

```bash
openclaw hooks info <name>
```

显示特定钩子的详细信息。

**参数：**

- `<name>`: 钩子名称或钩子键（例如 `session-memory`）

**选项：**

- `--json`: 以 JSON 输出

**示例：**

```bash
openclaw hooks info session-memory
```

**输出：**

```
💾 session-memory ✓ 已就绪

在发出 /new 或 /reset 命令时将会话上下文保存到内存中

详细信息：
  来源: openclaw-bundled
  路径: /path/to/openclaw/hooks/bundled/session-memory/HOOK.md
  处理程序: /path/to/openclaw/hooks/bundled/session-memory/handler.ts
  主页: https://docs.openclaw.ai/automation/hooks#session-memory
  事件: command:new, command:reset

要求：
  配置: ✓ workspace.dir
```

## 检查钩子资格

```bash
openclaw hooks check
```

显示钩子资格状态摘要（有多少已就绪与未就绪）。

**选项：**

- `--json`: 以 JSON 输出

**示例输出：**

```
钩子状态

钩子总数: 4
已就绪: 4
未就绪: 0
```

## 启用一个钩子

```bash
openclaw hooks enable <name>
```

通过将特定钩子添加到你的配置中来启用它（默认是 `~/.openclaw/openclaw.json`）。

**Note:** 工作区钩子默认处于禁用状态，直到在此处或在配置中启用它们。由插件管理的钩子在 `openclaw hooks list` 中显示为 `plugin:<id>`，并且不能在此处启用/禁用。请改为启用/禁用该插件。

**参数：**

- `<name>`: 钩子名称（例如 `session-memory`）

**示例：**

```bash
openclaw hooks enable session-memory
```

**输出：**

```
✓ 已启用钩子：💾 session-memory
```

**它的作用：**

- 检查钩子是否存在且符合条件
- 更新配置中的 `hooks.internal.entries.<name>.enabled = true`
- 将配置保存到磁盘

如果该钩子来自 `<workspace>/hooks/`，则在 Gateway 加载它之前需要先执行此可选启用步骤。

**启用后：**

- 重启网关以重新加载钩子（macOS 上重启菜单栏应用，或在开发环境中重启你的网关进程）。

## 禁用一个钩子

```bash
openclaw hooks disable <name>
```

通过更新你的配置来禁用特定钩子。

**参数：**

- `<name>`: 钩子名称（例如 `command-logger`）

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

## 注意事项

- `openclaw hooks list --json`、`info --json` 和 `check --json` 会直接将结构化 JSON 写入 stdout。
- 由插件管理的钩子不能在此处启用或禁用；请改为启用或禁用所属插件。

## 安装钩子包

```bash
openclaw plugins install <package>        # 默认使用 npm
openclaw plugins install npm:<package>    # 仅限 npm
openclaw plugins install <package> --pin  # 固定版本
openclaw plugins install <path>           # 本地路径
```

通过统一的插件安装器安装钩子包。

`openclaw hooks install` 仍可作为兼容别名使用，但它会打印一个
弃用警告并转发到 `openclaw plugins install`。

Npm 规格是**仅限注册表**（包名 + 可选的**精确版本**或
**dist-tag**）。Git/URL/file 规格和 semver 范围会被拒绝。依赖
安装会在项目本地运行，并使用 `--ignore-scripts` 以确保安全，即使你的
shell 具有全局 npm 安装设置也是如此。

裸规格和 `@latest` 会保持在稳定通道上。如果 npm 将它们中的任意一个解析为预发布版本，OpenClaw 会停止并要求你通过
预发布标签（例如 `@beta`/`@rc`）或精确的预发布版本显式选择加入。

**它的作用：**

- 将钩子包复制到 `~/.openclaw/hooks/<id>`
- 在 `hooks.internal.entries.*` 中启用已安装的钩子
- 在 `hooks.internal.installs` 中记录安装

**选项：**

- `-l, --link`: 链接本地目录而不是复制（将其添加到 `hooks.internal.load.extraDirs`）
- `--pin`: 将 npm 安装记录为 `hooks.internal.installs` 中精确解析的 `name@version`

**支持的归档格式：** `.zip`、`.tgz`、`.tar.gz`、`.tar`

**示例：**

```bash
# 本地目录
openclaw plugins install ./my-hook-pack

# 本地归档
openclaw plugins install ./my-hook-pack.zip

# NPM 包
openclaw plugins install @openclaw/my-hook-pack

# 不复制而链接本地目录
openclaw plugins install -l ./my-hook-pack
```

链接的钩子包会被视为来自操作员配置目录的受管理钩子，而不是工作区钩子。

## 更新钩子包

```bash
openclaw plugins update <id>
openclaw plugins update --all
```

通过统一的插件更新器更新已跟踪的基于 npm 的钩子包。

`openclaw hooks update` 仍可作为兼容别名使用，但它会打印一个
弃用警告并转发到 `openclaw plugins update`。

**选项：**

- `--all`: 更新所有已跟踪的钩子包
- `--dry-run`: 仅显示将发生的更改，不进行写入

当存在已保存的完整性哈希且获取到的制品哈希发生变化时，
OpenClaw 会打印警告并在继续之前请求确认。使用
全局 `--yes` 可在 CI/非交互式运行中绕过提示。

## 内置钩子

### session-memory

在你执行 `/new` 或 `/reset` 时将会话上下文保存到内存中。

**启用：**

```bash
openclaw hooks enable session-memory
```

**输出：** `~/.openclaw/workspace/memory/YYYY-MM-DD-HHMM.md` 默认。将 `hooks.internal.entries.session-memory.llmSlug: true` 设置为模型生成的文件名 slug。

**参见：** [session-memory 文档](/automation/hooks#session-memory)

### bootstrap-extra-files

在 `agent:bootstrap` 期间注入额外的启动文件（例如 monorepo 本地的 `AGENTS.md` / `TOOLS.md`）。

**启用：**

```bash
openclaw hooks enable bootstrap-extra-files
```

**参见：** [bootstrap-extra-files 文档](/automation/hooks#bootstrap-extra-files)

### command-logger

将所有命令事件记录到一个集中审计文件中。

**启用：**

```bash
openclaw hooks enable command-logger
```

**输出：** `~/.openclaw/logs/commands.log`

**查看日志：**

```bash
# 最近的命令
tail -n 20 ~/.openclaw/logs/commands.log

# 美化输出
cat ~/.openclaw/logs/commands.log | jq .

# 按动作过滤
grep '"action":"new"' ~/.openclaw/logs/commands.log | jq .
```

**参见：** [command-logger 文档](/automation/hooks#command-logger)

### boot-md

在网关启动时运行 `BOOT.md`（在各通道启动之后）。

**事件**: `gateway:startup`

**启用**:

```bash
openclaw hooks enable boot-md
```

**参见：** [boot-md 文档](/automation/hooks#boot-md)

## 相关内容

- [CLI reference](/cli)
- [Automation hooks](/automation/hooks)
