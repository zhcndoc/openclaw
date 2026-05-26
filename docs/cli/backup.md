---
summary: "openclaw 备份的 CLI 参考（创建本地备份归档）"
read_when:
  - 你想为本地 OpenClaw 状态创建一个一等备份归档
  - 你想在重置或卸载之前预览会包含哪些路径
title: "备份"
---

# `openclaw backup`

为 OpenClaw 的状态、配置、认证配置文件、通道/提供方凭据、会话，以及可选的工作区创建一个本地备份归档。

```bash
openclaw backup create
openclaw backup create --output ~/Backups
openclaw backup create --dry-run --json
openclaw backup create --verify
openclaw backup create --no-include-workspace
openclaw backup create --only-config
openclaw backup verify ./2026-03-09T08-00-00.000+08-00-openclaw-backup.tar.gz
```

## 注意

- 归档包含一个 `manifest.json` 文件，其中记录了解析后的源路径和归档布局。
- 默认输出是在当前工作目录下带时间戳的 `.tar.gz` 归档。
- 带时间戳的备份文件名会使用你机器的本地时区，并包含 UTC 偏移量。
- 如果当前工作目录位于某个被备份的源树内部，OpenClaw 会回退到你的主目录作为默认归档位置。
- 现有的归档文件绝不会被覆盖。
- 会拒绝位于源状态/工作区树内部的输出路径，以避免自我包含。
- `openclaw backup verify <archive>` 会验证该归档是否恰好包含一个根清单，拒绝遍历式归档路径，并检查清单中声明的每个有效载荷是否都存在于 tarball 中。
- `openclaw backup create --verify` 会在写入归档后立即运行该验证。
- `openclaw backup create --only-config` 只备份当前激活的 JSON 配置文件。

## 会备份什么

`openclaw backup create` 会根据你本地的 OpenClaw 安装来规划备份源：

- OpenClaw 本地状态解析器返回的状态目录，通常是 `~/.openclaw`
- 当前激活的配置文件路径
- 当 `credentials/` 目录存在于状态目录之外时，解析后的该目录
- 从当前配置中发现的工作区目录，除非你传入 `--no-include-workspace`

模型认证配置文件已经是状态目录的一部分，位于
`agents/<agentId>/agent/auth-profiles.json` 下，因此通常已包含在
状态备份项中。

如果你使用 `--only-config`，OpenClaw 会跳过状态、凭据目录和工作区发现，
只归档当前激活的配置文件路径。

OpenClaw 在构建归档之前会规范化路径。如果配置、凭据目录或某个工作区
已经位于状态目录内部，它们就不会作为单独的顶级备份源重复包含。缺失的路径会被
跳过。

归档有效载荷会存储来自这些源树的文件内容，内嵌的 `manifest.json` 会记录已解析的绝对源路径以及每个资产所使用的归档布局。

在归档创建过程中，OpenClaw 会跳过那些没有恢复价值的已知实时变更文件，包括活动代理会话记录、cron 运行日志、滚动日志、投递队列、状态目录下的 socket/pid/temp 文件，以及相关的持久队列临时文件。JSON 结果包含 `skippedVolatileCount`，以便自动化流程了解有多少文件被有意省略。

状态目录中的 `extensions/` 树下已安装插件的源文件和清单文件会被包含在内，但其嵌套的 `node_modules/` 依赖树会被跳过。这些依赖是可重建的安装产物；在恢复归档后，如果恢复的插件报告缺少依赖，请使用 `openclaw plugins update <id>`，或使用 `openclaw plugins install <spec> --force` 重新安装该插件。

## 无效配置行为

`openclaw backup` 会刻意绕过正常的配置预检，这样它在恢复期间也能提供帮助。由于工作区发现依赖有效配置，当配置文件存在但无效且仍启用了工作区备份时，`openclaw backup create` 现在会快速失败。

如果在这种情况下你仍然想要一个部分备份，请重新运行：

```bash
openclaw backup create --no-include-workspace
```

这会保留状态、配置和外部凭据目录在备份范围内，同时完全跳过工作区发现。

如果你只需要配置文件本身的一份副本，`--only-config` 也可以在配置损坏时使用，因为它不依赖于为工作区发现而解析配置。

## 大小和性能

OpenClaw 不会强制设置内置的最大备份大小或单文件大小限制。

实际限制来自本机和目标文件系统：

- 写入临时归档以及最终归档所需的可用空间
- 遍历大型工作区树并将其压缩为 `.tar.gz` 所需的时间
- 如果你使用 `openclaw backup create --verify` 或运行 `openclaw backup verify`，重新扫描归档所需的时间
- 目标路径上的文件系统行为。OpenClaw 优先使用不会覆盖的硬链接发布步骤，并在不支持硬链接时回退为独占复制

大型工作区通常是归档大小的主要驱动因素。如果你想要更小或更快的备份，请使用 `--no-include-workspace`。

若要获得最小的归档，请使用 `--only-config`。

## 相关

- [CLI 参考](/cli)
