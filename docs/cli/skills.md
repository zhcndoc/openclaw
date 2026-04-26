---
summary: "`openclaw skills` 的 CLI 参考（search/install/update/list/info/check）"
read_when:
  - 你想查看哪些技能可用并已准备好运行
  - 你想从 ClawHub 搜索、安装或更新技能
  - 你想调试技能缺失的二进制文件/环境/配置
title: "Skills"
---

# `openclaw skills`

检查本地技能并从 ClawHub 安装/更新技能。

相关内容：

- 技能系统：[技能](/tools/skills)
- 技能配置：[技能配置](/tools/skills-config)
- ClawHub 安装：[ClawHub](/tools/clawhub)

## 命令

```bash
openclaw skills search "calendar"
openclaw skills search --limit 20 --json
openclaw skills install <slug>
openclaw skills install <slug> --version <version>
openclaw skills install <slug> --force
openclaw skills update <slug>
openclaw skills update --all
openclaw skills list
openclaw skills list --eligible
openclaw skills list --json
openclaw skills list --verbose
openclaw skills info <name>
openclaw skills info <name> --json
openclaw skills check
openclaw skills check --json
```

`search`/`install`/`update` 直接使用 ClawHub 并安装到活动工作区的 `skills/` 目录中。`list`/`info`/`check` 仍然检查当前工作区和配置可见的本地技能。

此 CLI `install` 命令从 ClawHub 下载技能文件夹。由引导流程或技能设置触发的基于网关的技能依赖安装则使用单独的 `skills.install` 请求路径。

注意：

- `search [query...]` 接受一个可选查询；省略它可浏览默认的
  ClawHub 搜索源。
- `search --limit <n>` 限制返回结果数量。
- `install --force` 会覆盖同一
  slug 的现有工作区技能文件夹。
- `update --all` 仅更新活动工作区中已跟踪的 ClawHub 安装。
- `list` 是在未提供子命令时的默认操作。
- `list`、`info` 和 `check` 会将其渲染后的输出写入 stdout。使用
  `--json` 时，这意味着机器可读载荷会保留在 stdout，供管道
  和脚本使用。

## 相关内容

- [CLI 参考](/cli)
- [技能](/tools/skills)
