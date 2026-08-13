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

- 一次性、完整、可移植：`openclaw backup create` 归档
- 单个数据库、紧凑且经过验证：`openclaw backup sqlite create`
- 按内容进行版本化和增量备份：`openclaw backup git create`
- 定期保护：配置由 Gateway 所有的备份自动化
- 持续、增量、数据丢失仅几秒：使用 Litestream 复制数据库

## 完整归档

```bash
openclaw backup create --output ~/Backups/openclaw --verify
```

这会写入一个带时间戳的 `.tar.gz` 文件，其中包含状态、配置、凭据、
会话以及（默认情况下）工作区，然后验证归档清单和数据内容。归档中的 SQLite
数据库会使用 SQLite 的在线备份 API 进行捕获并压缩，因此可以在 Gateway 运行时安全地创建归档。[Backup CLI](/cli/backup) 记录了每个标志、明确跳过的易变文件以及验证详情。

归档是完整副本：每次运行都会重新上传所有内容。它们适合在更新、重置、卸载或迁移机器之前使用，对于小型安装来说也是合理的日常方案。对于大型工作区或频繁备份，请优先使用下面的快照或持续复制方案。

对于临时容器主机，请将归档保存在容器外部，并使用
`openclaw backup restore` 作为灾难恢复工具，以重建一个新的持久状态树。恢复只会暂存文件；激活仍然是一个明确的离线部署步骤。

## 按数据库快照

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

推荐的计划是使用一个由 Gateway 所有的自动化任务。此示例每天备份每个已注册的数据库，并将当前分支推送到 `origin`。推送要求仓库事先拥有一个 `origin` 远程仓库，因此请在启用推送计划之前先初始化一次：

```bash
openclaw backup git init --repository ~/Backups/openclaw-git --remote git@github.com:you/openclaw-backups.git
openclaw backup enable --repository ~/Backups/openclaw-git --every 24h --push
```

当未配置 `origin` 远程仓库时，`backup enable --push` 会拒绝安排任务，因此全新安装不会悄悄创建一个始终推送失败的计划任务。

推送计划默认会对包含凭据的表进行脱敏：否则，无人值守的定期推送会将凭据持久保存在远程 Git 历史记录中。如果你接受这一权衡且远程仓库是私有的，请传入 `--include-secrets` 来安排保留完整内容的远程备份；从脱敏历史记录恢复后，需要重新配对设备并重新验证提供商。本地（非推送）计划会保留完整内容，因此恢复结果是完整的。

使用 `--global-only` 或 `--agent <id>` 缩小范围。添加
`--exclude-secrets` 以生成脱敏的 Git 历史记录。重新运行该命令会更新固定的计划任务，而不是创建另一个任务。使用以下命令禁用：

```bash
openclaw backup disable
```

启用或禁用计划任务时，Gateway 必须可访问。没有本地备用调度器。

另一种方式是直接使用平台调度器。以下是一个每晚运行的 cron 示例，用于为控制平面数据库和 `main` 代理数据库创建快照：

```bash
0 3 * * * openclaw backup sqlite create --global --repository "$HOME/Backups/openclaw-sqlite" --json >> "$HOME/Backups/openclaw-backup.log" 2>&1
5 3 * * * openclaw backup sqlite create --agent main --repository "$HOME/Backups/openclaw-sqlite" --json >> "$HOME/Backups/openclaw-backup.log" 2>&1
```

在 macOS 上，`launchd` 作业的工作方式相同；对于从[托管指南](/install)配置的服务器，systemd 计时器是自然的选择。`--json` 会在每次运行时输出一条机器可读的结果，因此日志也可以作为备份审计跟踪。根据你自己的保留计划清理旧的快照目录。

每次非试运行的归档、本地 SQLite 快照和 Git 备份尝试也会记录在共享状态数据库中。`openclaw status` 会显示最新的尝试，而当没有记录成功运行，或最新一次成功运行距今已超过 14 天时，`openclaw doctor` 会建议执行一次性或计划备份。

## 将备份复制到异地

归档和快照存储库都是普通文件，因此任何同步工具都可以使用。
以下是一个针对 S3-compatible 存储桶的 `rclone` 示例：

```bash
rclone sync ~/Backups/openclaw-sqlite remote:openclaw-backups/sqlite
```

由于每个归档和本地快照都是完整副本，异地同步会将每个新备份完整地重新上传。`restic` 等重复数据删除备份工具可以减少目标位置的存储空间，但仍会将完整快照作为输入读取。当每次备份的上传大小很重要时，请使用 Git 支持的快照或持续复制。

## 版本化备份到 Git 仓库

基于 Git 的备份会将每个选定的数据库转储为确定性的 `schema.sql`、
`manifest.json` 和按表划分的 JSONL 文件，然后为整个运行创建一个提交。未更改的数据库内容不会产生提交，因此 Git 从机制上只存储和推送内容变化。OpenClaw 只会暂存由备份拥有的 `global` 和 `agents` 路径，不会暂存仓库其他位置的无关文件。

```bash
openclaw backup git init --repository ~/Backups/openclaw-git --remote <private-git-url>
openclaw backup git create --repository ~/Backups/openclaw-git --all --push
openclaw backup git log --repository ~/Backups/openclaw-git
```

请使用专用于 OpenClaw 备份的仓库。现有的 `global/` 和
`agents/<agentId>/` 作用域必须为空，或包含有效的 schema-version-1
OpenClaw 备份清单。OpenClaw 会拒绝替换其他任何作用域，而 `--all` 运行会在删除由备份拥有的过时条目之前验证每个现有的代理作用域。

仓库根目录必须由当前用户拥有，并且不得允许组用户或其他用户写入。初始化和每次创建期间都会检查这一点。在 POSIX 系统上，请确认所有权，并运行 `chmod 700 <repository>` 来修复不安全的权限。

该仓库是普通 Git 仓库，可以使用包括 GitHub 在内的任何远程仓库。请将远程仓库设为私有：默认转储包含身份验证配置文件、令牌以及其他包含凭据的状态。`--exclude-secrets` 会在脱敏历史记录比包含完整凭据的备份更有用时，排除文档中列出的机密表；确切列表请参阅[Backup CLI](/cli/backup#versioned-git-backups)。

在不覆盖实时文件的情况下，可以在任意提交中验证或恢复一个数据库：

```bash
openclaw backup git verify --repository ~/Backups/openclaw-git --ref <commit> --global
openclaw backup git restore --repository ~/Backups/openclaw-git --ref <commit> --agent main --target ./restored-agent.sqlite
```

Git 恢复会使派生的搜索状态保持一致：它会重建由内容支持的 FTS5 索引，为 Gateway 启动时的协调保留转录投影状态，并保留向量表，以便内存索引重新创建。随后，它会验证表哈希值、SQLite 完整性和外键。

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

恢复过程是有意设计为显式操作；不会直接覆盖实时状态。

### 恢复完整归档

仅从你创建或以其他方式信任的归档开始。`openclaw backup
verify` 会检查归档结构和负载布局，但不会对归档进行身份验证，也不会使不受信任的内容变得安全。

在完整恢复之前，请查看[备份了哪些内容](/cli/backup#what-gets-backed-up)。然后使用一条命令进行验证，并将其解压到一个全新的暂存目录：

```bash
ARCHIVE=./2026-03-09T08-00-00.000+08-00-openclaw-backup.tar.gz
openclaw backup restore "$ARCHIVE" --target ./restored-openclaw
```

目标目录必须不存在或为空。OpenClaw 会在写入目标之前验证归档结构、清单、硬链接和 SQLite 数据库。非空目标会被拒绝，失败的解压会清理不完整的输出。该命令永远不会触及实时状态目录，也没有强制或就地模式。请将恢复后的目录视为敏感目录：其中可能包含凭据、身份验证配置文件、会话和工作区数据。

<Warning>
  恢复归档相当于时间旅行。带有棘轮状态的消息频道凭据，尤其是 WhatsApp，可能会在回滚后不同步，并需要重新关联。审批以及投递／去重状态也会回滚，因此在恢复 Gateway 运行之前，请检查待处理的审批。插件的 `node_modules` 树不会被归档；激活后，请运行 `openclaw plugins update <id>`，或使用 `openclaw plugins install <spec> --force` 重新安装。
</Warning>

清单会记录 `archiveRoot`、`paths` 下的原始路径以及
`assets[]` 列表。每个资源都包含其 `kind`、原始 `sourcePath` 以及 tarball 内的
`archivePath`。请以这些字段作为事实来源；不要根据归档文件名推导归档根目录。

归档布局如下：

```text
<archive-root>/manifest.json
<archive-root>/payload/posix/<absolute-source-path-without-leading-slash>/...
<archive-root>/payload/windows/<DRIVE>/<rest>/...
<archive-root>/payload/relative/<relative-source-path>/...
```

要激活恢复后的文件，请停止 Gateway 以及使用这些文件的任何节点主机。为当前状态创建一个新的备份，或将其移到其他位置。然后将解压后的状态资源移到目标位置，或将 `OPENCLAW_STATE_DIR` 指向该资源，并在重启 Gateway 之前运行 `openclaw doctor`。在新机器上或不同的主目录下运行时，请使用清单将配置、凭据和工作区资源映射到新路径。有关回滚流程，请参阅[更新](/install/updating#rollback)。

### 恢复数据库

对于快照，`openclaw backup sqlite restore <snapshot-directory> --target
<new-database-path>` 会将经过重新验证的数据库写入新的目标位置。对于 Git 历史记录，`openclaw backup git restore --repository <dir> --ref <commit>
(--global | --agent <id>) --target <new-database-path>` 会生成并验证一个新的数据库。对于 Litestream，`litestream restore` 会写入一个新的数据库文件。Gateway 停止后，将结果移到目标位置，然后启动 Gateway 并检查 `openclaw health` 和 `openclaw doctor`。

将数据库恢复到不同的 OpenClaw 版本后，首先使用
`openclaw database preflight` 对数据库执行预检；请参阅
[数据库架构](/reference/database-schemas#preflight-a-target-release)。

## 相关

- [Agent 工作区](/concepts/agent-workspace#git-backup-recommended-private)，用于将工作区文件保存在私有 git 仓库中
- [Backup CLI 参考](/cli/backup)
- [数据库模式](/reference/database-schemas)
- [在计算机之间迁移](/install/migrating)
- [更新](/install/updating)。
