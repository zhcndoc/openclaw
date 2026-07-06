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

- 归档包含一个 `manifest.json`，其中嵌入了已解析的源路径和归档布局。
- 默认输出是在当前工作目录中的带时间戳的 `.tar.gz` 归档。带时间戳的文件名使用你机器的本地时区，并包含 UTC 偏移量。如果当前工作目录位于已备份的源树内，OpenClaw 会回退到你的主目录作为默认归档位置。
- 现有的归档文件绝不会被覆盖。源状态/工作区树中的输出路径会被拒绝，以避免自包含。
- `openclaw backup verify <archive>` 会检查该归档是否恰好包含一个根 manifest，拒绝包含遍历式归档路径，并确认每个 manifest 声明的载荷都存在于 tarball 中。`openclaw backup create --verify` 会在写入归档后立即运行该校验。
- `openclaw backup create --only-config` 仅备份当前激活的 JSON 配置文件。

## 会备份什么

`openclaw backup create` 会根据你的本地 OpenClaw 安装来规划源：

- 状态目录（通常是 `~/.openclaw`）
- 活动配置文件路径
- 当 `credentials/` 目录存在于状态目录之外时，会使用解析后的该目录
- 从当前配置中发现的工作区目录，除非你传入 `--no-include-workspace`

认证配置文件和其他每个 agent 的运行时状态都存储在状态目录下的 SQLite 中（`agents/<agentId>/agent/openclaw-agent.sqlite`），因此它们会自动包含在状态备份项中。

`--only-config` 会跳过状态、凭据目录和工作区发现，只归档活动配置文件路径。

OpenClaw 在构建归档前会规范化路径：如果配置、凭据目录或某个工作区已经位于状态目录内，它们不会作为单独的顶级备份源重复包含。缺失的路径会被跳过。

在归档创建过程中，OpenClaw 会跳过已知的、会发生实时变更且没有恢复价值的文件：活动 agent 会话转录、cron 运行日志、滚动日志、传递队列、状态目录下的 socket/pid/temp 文件，以及相关的 durable-queue 临时文件。JSON 结果中的 `skippedVolatileCount` 会报告有多少文件被有意省略。状态目录下的 SQLite 数据库会通过安全快照（`VACUUM INTO`）而不是直接在线复制，因此打开的 WAL/SHM 文件不会损坏备份。

状态目录中 `extensions/` 树下已安装插件的源文件和清单文件会被包含，但其嵌套的 `node_modules/` 依赖树会被跳过，因为这些属于可重新构建的安装产物。恢复归档后，如果某个已恢复的插件报告缺少依赖，请使用 `openclaw plugins update <id>`，或使用 `openclaw plugins install <spec> --force` 重新安装。

## 无效配置行为

`openclaw backup` 会绕过正常的配置预检，因此在恢复期间仍然可以提供帮助。工作区发现依赖于有效的配置，所以当配置文件存在但无效且仍启用了工作区备份时，`openclaw backup create` 会快速失败。

在这种情况下，如果要进行部分备份，请使用 `--no-include-workspace` 重新运行：它会将状态、配置以及外部凭据目录纳入范围，同时完全跳过工作区发现。

当配置格式错误时，`--only-config` 也可以正常工作，因为它不会为了工作区发现而解析配置。

## 大小和性能

OpenClaw 不强制设置内置的最大备份大小或单个文件大小限制。实际限制来自：

- 用于临时归档写入以及最终归档的可用空间
- 遍历大型工作区树并将其压缩为 `.tar.gz` 所需的时间
- 使用 `--verify` 或 `openclaw backup verify` 重新扫描归档所需的时间
- 目标文件系统的行为：OpenClaw 优先使用无覆盖的硬链接发布步骤，并在不支持硬链接时回退到独占复制

大型工作区通常是归档大小的主要驱动因素。使用 `--no-include-workspace` 可获得更小/更快的备份，或者使用 `--only-config` 获得最小的归档。

## 相关

- [CLI 参考](/cli)
