---
summary: "CLI 参考：`openclaw skills`（搜索/安装/更新/列表/信息/检查）"
read_when:
  - 你想查看哪些技能可用且可运行
  - 你想在 ClawHub 中搜索，或从 ClawHub、Git 或本地目录安装技能
  - 你想排查技能缺失的二进制文件 / 环境变量 / 配置
title: "技能"
---

# `openclaw skills`

检查本地技能，搜索 ClawHub，从 ClawHub/Git/本地目录安装技能，并更新
由 ClawHub 跟踪的安装项。

相关：

- 技能系统：[Skills](/tools/skills)
- 技能配置：[Skills config](/tools/skills-config)
- ClawHub 安装项：[ClawHub](/clawhub/cli)

## 命令

```bash
openclaw skills search "calendar"
openclaw skills search --limit 20 --json
openclaw skills install <slug>
openclaw skills install <slug> --version <version>
openclaw skills install git:owner/repo
openclaw skills install git:owner/repo@main
openclaw skills install ./path/to/skill --as custom-name
openclaw skills install <slug> --force
openclaw skills install <slug> --agent <id>
openclaw skills install <slug> --global
openclaw skills update <slug>
openclaw skills update <slug> --global
openclaw skills update --all
openclaw skills update --all --agent <id>
openclaw skills update --all --global
openclaw skills list
openclaw skills list --eligible
openclaw skills list --json
openclaw skills list --verbose
openclaw skills list --agent <id>
openclaw skills info <name>
openclaw skills info <name> --json
openclaw skills info <name> --agent <id>
openclaw skills check
openclaw skills check --agent <id>
openclaw skills check --json
```

`search` 和 `update` 直接使用 ClawHub。`install <slug>` 安装一个 ClawHub
技能，`install git:owner/repo[@ref]` 克隆一个 Git 技能，而 `install ./path`
则复制一个本地技能目录。默认情况下，`install` 和 `update` 以活动工作区的
`skills/` 目录为目标；使用 `--global` 时，它们会以共享的受管技能目录为目标。`list`/`info`/`check` 仍会检查当前工作区和配置中可见的本地技能。
基于工作区的命令会先通过 `--agent <id>` 解析目标工作区，然后在当前工作目录位于已配置的代理工作区内时使用当前工作目录，否则使用默认代理。

Git 和本地目录安装都要求源根目录下存在 `SKILL.md`。安装的 slug 会先来自
`SKILL.md` frontmatter 中有效的 `name`，否则来自源目录或仓库名；可使用 `--as <slug>` 覆盖它。`--version` 仅适用于 ClawHub。技能安装不支持 npm 包规格或 zip/归档路径，并且 `openclaw skills update` 只会更新由 ClawHub 跟踪的安装项。

由入门流程或 Skills 设置触发的 Gateway 支持的技能依赖安装，会改用单独的
`skills.install` 请求路径。

注意：

- `search [query...]` 接受一个可选查询；如果省略，则浏览默认的
  ClawHub 搜索信息流。
- `search --limit <n>` 会限制返回结果数量。
- `install git:owner/repo[@ref]` 安装一个 Git 技能。分支引用可以包含斜杠，例如 `git:owner/repo@feature/foo`。
- `install ./path/to/skill` 安装一个本地目录，其根目录包含
  `SKILL.md`。
- `install --as <slug>` 会覆盖 Git 和本地目录安装时推断出的 slug。
- `install --version <version>` 仅适用于 ClawHub 技能 slug。
- `install --force` 会覆盖同一 slug 的现有工作区技能文件夹。
- `--global` 以共享的受管技能目录为目标，且不能与 `--agent <id>` 组合使用。
- `--agent <id>` 以一个已配置的代理工作区为目标，并覆盖当前工作目录推断。
- `update <slug>` 更新单个已跟踪技能。添加 `--global` 可将目标改为共享的受管技能目录，而不是工作区。
- `update --all` 会更新所选工作区中已跟踪的 ClawHub 安装项；如果与 `--global` 组合，则会更新共享的受管技能目录中的安装项。
- `check --agent <id>` 会检查所选代理的工作区，并报告哪些已就绪的技能实际上对该代理的提示词或命令界面可见。
- 当未提供子命令时，`list` 是默认操作。
- `list`、`info` 和 `check` 会将渲染后的输出写入 stdout。使用
  `--json` 时，这意味着机器可读的负载会保留在 stdout 中，以便管道和脚本使用。

## 相关

- [CLI 参考](/cli)
- [技能](/tools/skills)
