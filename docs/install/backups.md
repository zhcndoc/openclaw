---
summary: "备份 OpenClaw 状态：归档、按数据库快照、计划任务、异地副本和持续复制"
read_when:
  - 你希望为 OpenClaw 安装建立备份例程，而不是进行一次性归档
  - 你希望在不每次都复制整个数据库的情况下，进行计划备份、异地备份或持续备份
  - 你需要从备份中恢复 OpenClaw 状态
title: "备份"
---

# 备份

OpenClaw 将其权威状态保存在 SQLite 中：一个全局控制平面数据库，以及每个代理一个数据库，全部位于状态目录下（通常为
`~/.openclaw`）。有关确切布局，请参阅[数据库架构](/reference/database-schemas)。本指南介绍如何保护这些状态：一次性归档、
按数据库快照、计划任务、异地副本，以及适用于不应在每次备份时重新上传整个数据库的安装的持续
复制。

切勿将正在运行的 `.sqlite`、`-wal`、`-shm` 或 `-journal` 文件直接复制为备份。
Gateway 运行时会写入数据库，而正在运行的数据库的原始文件副本可能不完整或损坏。下面介绍的每种受支持路径都会
安全地捕获已提交的状态。

<Warning>
  备份包含身份验证配置文件、频道和提供商凭据、会话历史记录以及其他敏感记录。请将其加密存储，像限制实时状态目录一样限制目标位置的访问权限；如果怀疑备份已泄露，请轮换
  凭据。有关应用于机器迁移的相同规则，请参阅[在机器之间迁移](/install/migrating)。
</Warning>

## 选择路径

- 一次性、完整、便携：`openclaw backup create` 归档。
- 单个数据库、紧凑且经过验证：`openclaw backup sqlite create`。
- 定期保护：安排上述任一命令，并将输出同步到异地。
- 持续、增量、秒级数据丢失：使用 Litestream 复制数据库。

## 完整归档

```bash
openclaw backup create --output ~/Backups/openclaw --verify
```

这会写入一个带时间戳的 `.tar.gz` 文件，其中包含状态、配置、凭据、
会话以及（默认情况下）工作区，然后验证归档清单和数据内容。归档中的 SQLite
数据库会使用 SQLite 的在线备份 API 进行捕获并压缩，因此可以在 Gateway 运行时安全地创建归档。[Backup CLI](/cli/backup) 记录了每个标志、明确跳过的易变文件以及验证详情。

归档是完整副本：每次运行都会重新上传所有内容。它们适合在更新、重置、卸载或迁移机器之前使用，对于小型安装来说也是合理的日常方案。对于大型工作区或频繁备份，请优先使用下面的快照或持续复制方案。

## 每个数据库的快照

```bash
openclaw backup sqlite create --global --repository ~/Backups/openclaw-sqlite
openclaw backup sqlite create --agent main --repository ~/Backups/openclaw-sqlite
```

每次运行都会将一个经过验证的快照目录（`manifest.json` 加上
`database.sqlite`）发布到仓库目录中。快照会执行 vacuum，因此已删除页面的
残留不会使其体积膨胀，并且每个快照都会记录一个 SHA-256 值，之后可由
`openclaw backup sqlite verify` 重新检查。

快照仓库是本地目录。调度、上传、保留策略和启动时恢复有意留给操作员处理；下文
将介绍这些内容。

## 安排备份

使用平台调度程序。以下是每晚创建 control-plane 数据库和 `main` agent 数据库快照的 cron 示例：

```bash
0 3 * * * openclaw backup sqlite create --global --repository "$HOME/Backups/openclaw-sqlite" --json >> "$HOME/Backups/openclaw-backup.log" 2>&1
5 3 * * * openclaw backup sqlite create --agent main --repository "$HOME/Backups/openclaw-sqlite" --json >> "$HOME/Backups/openclaw-backup.log" 2>&1
```

在 macOS 上，`launchd` 作业的工作方式相同；对于从[托管指南](/install)配置的服务器，systemd 计时器是自然的选择。`--json` 会在每次运行时输出一条机器可读的结果，因此日志也可以作为备份审计跟踪。根据你自己的保留计划清理旧的快照目录。

## 将备份复制到异地

归档和快照存储库都是普通文件，因此任何同步工具都可以使用。
以下是一个针对 S3-compatible 存储桶的 `rclone` 示例：

```bash
rclone sync ~/Backups/openclaw-sqlite remote:openclaw-backups/sqlite
```

由于每个归档和快照都是完整副本，异地同步会为每个新备份重新完整上传。
诸如 `restic` 之类的去重备份工具可以减少目标位置的存储空间，但仍会将完整快照作为输入读取。
当每个备份的上传大小很重要时，请改用持续复制。

## 使用 Litestream 进行持续复制

[Litestream](https://litestream.io) 是一个用于
SQLite 的开源复制守护进程。它与 Gateway 一同运行，无需对 OpenClaw 做任何更改：它会监视
每个数据库的预写式日志，并将增量更改流式传输到对象存储，同时定期创建快照，以便快速完成恢复。只有发生更改的页面
会离开机器，因此当备份不能重新上传整个数据库时，它是合适的工具。

OpenClaw 的数据库运行在 WAL 模式下，这是 Litestream 唯一的硬性
要求。以下是一个最小的 `litestream.yml`，用于将控制平面
数据库和一个 agent 数据库复制到兼容 S3 的存储桶：

```yaml
dbs:
  - path: /home/user/.openclaw/state/openclaw.sqlite
    replicas:
      - url: s3://openclaw-backups/state
  - path: /home/user/.openclaw/agents/main/agent/openclaw-agent.sqlite
    replicas:
      - url: s3://openclaw-backups/agents/main
```

在进程监管器下运行 `litestream replicate`，为你关注的每个数据库
各配置一个条目。要进行恢复，请恢复到一个新的路径，然后在离线状态下激活它：

```bash
litestream restore -o ./restored-openclaw.sqlite s3://openclaw-backups/state
```

Litestream 仅复制数据库字节。配置、凭据文件和
工作区仍需要使用上述基于文件的路径之一，并且复制的数据与归档一样敏感，因此请应用相同的存储桶访问和
加密规则。

## 恢复

恢复操作刻意设计得十分明确；不会有任何内容原地覆盖正在运行的数据库：

1. 停止 Gateway。
2. 对于归档：将其解压到暂存目录，并按照
   `manifest.json` 中的源文件到归档文件映射将文件放回；回滚流程请参阅
   [更新](/install/updating#rollback)。
3. 对于快照：`openclaw backup sqlite restore <snapshot-directory>
--target <new-database-path>` 会将经过重新验证的数据库写入一个全新的
   目标位置。保持 Gateway 停止，将其移动到目标位置。
4. 对于 Litestream：`litestream restore` 会写入一个全新的数据库文件；以相同方式将其移动到目标位置。
5. 启动 Gateway，并检查 `openclaw health` 和 `openclaw doctor`。

将数据库恢复到不同的 OpenClaw 版本后，首先使用
`openclaw database preflight` 对数据库执行预检；请参阅
[数据库架构](/reference/database-schemas#preflight-a-target-release)。

## 相关

- [Agent 工作区](/concepts/agent-workspace#git-backup-recommended-private)，用于将工作区文件保存在私有 git 仓库中
- [Backup CLI 参考](/cli/backup)
- [数据库模式](/reference/database-schemas)
- [在计算机之间迁移](/install/migrating)
- [更新](/install/updating)
