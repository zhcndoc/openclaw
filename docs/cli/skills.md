---
summary: "CLI 参考：`openclaw skills`（搜索/安装/更新/列表/信息/检查）"
read_when:
  - 你想查看哪些技能可用并已准备好运行
  - 你想从 ClawHub 搜索、安装或更新技能
  - 你想调试技能缺失的二进制文件 / 环境 / 配置
title: "技能"
---

# `openclaw skills`

检查本地技能，并从 ClawHub 安装/更新技能。

相关：

- Skills system: [Skills](/tools/skills)
- Skills config: [Skills config](/tools/skills-config)
- ClawHub installs: [ClawHub](/clawhub/cli)

## 命令

```bash
openclaw skills search "calendar"
openclaw skills search --limit 20 --json
openclaw skills install <slug>
openclaw skills install <slug> --version <version>
openclaw skills install <slug> --force
openclaw skills install <slug> --agent <id>
openclaw skills update <slug>
openclaw skills update --all
openclaw skills update --all --agent <id>
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

`search`/`install`/`update` 直接使用 ClawHub，并安装到当前活动
工作区的 `skills/` 目录中。`list`/`info`/`check` 仍然检查当前工作区和配置中可见的
本地技能。基于工作区的命令会先根据 `--agent <id>` 解析目标工作区，然后在当前工作
目录位于已配置的 agent 工作区内时使用当前工作目录，否则使用默认
agent。

此 CLI `install` 命令会从 ClawHub 下载技能文件夹。由入门引导或 Skills 设置
触发的 Gateway 托管技能依赖安装则改为使用单独的 `skills.install` 请求路径。

注意：

- `search [query...]` 接受一个可选查询；省略它可浏览默认的
  ClawHub 搜索信息流。
- `search --limit <n>` 会限制返回结果的数量。
- `install --force` 会覆盖同一 slug 的现有工作区技能文件夹。
- `--agent <id>` 目标指向一个已配置的 agent 工作区，并覆盖当前
  工作目录推断。
- `update --all` 仅更新活动工作区中已跟踪的 ClawHub 安装。
- `check --agent <id>` 检查所选 agent 的工作区，并报告哪些
  已就绪技能实际上对该 agent 的提示或命令界面可见。
- `list` 是在未提供子命令时的默认操作。
- `list`、`info` 和 `check` 会将其渲染后的输出写入 stdout。使用
  `--json` 时，这意味着机器可读负载会保留在 stdout 中，供管道和脚本使用。

## 相关

- [CLI reference](/cli)
- [Skills](/tools/skills)
