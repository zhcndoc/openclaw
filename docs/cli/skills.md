---
summary: "`openclaw skills` 的 CLI 参考（search/install/update/list/info/check）"
read_when:
  - 你想查看哪些技能可用并可以运行
  - 你想从 ClawHub 搜索、安装或更新技能
  - 你想调试技能缺失的二进制文件/环境/配置
title: "skills"
---

# `openclaw skills`

检查本地技能并从 ClawHub 安装/更新技能。

相关内容：

- 技能系统：[Skills](/tools/skills)
- 技能配置：[Skills config](/tools/skills-config)
- ClawHub 安装：[ClawHub](/tools/clawhub)

## 命令

```bash
openclaw skills search "calendar"
openclaw skills install <slug>
openclaw skills install <slug> --version <version>
openclaw skills update <slug>
openclaw skills update --all
openclaw skills list
openclaw skills list --eligible
openclaw skills info <name>
openclaw skills check
```

`search`/`install`/`update` 直接使用 ClawHub 并安装到当前工作区的 `skills/` 目录。`list`/`info`/`check` 仍然检查对当前工作区和配置可见的本地技能。
