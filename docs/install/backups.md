---
doc-schema-version: 1
summary: "备份 OpenClaw 状态：归档、按数据库快照、计划任务、异地副本和持续复制"
read_when:
  - "你希望为 OpenClaw 安装建立备份例程，而不是进行一次性归档"
  - "你希望在不每次都复制整个数据库的情况下，进行计划备份、异地备份或持续备份"
  - "你需要从备份中恢复 OpenClaw 状态"
title: "备份"
---

<a id="backups" />

OpenClaw 默认情况下使用 SQLite：状态目录下的一个全局控制平面数据库（通常是 `~/.openclaw`），加上 `<agentDir>/openclaw-agent.sqlite` 中每个已配置代理的一个数据库。代理目录默认位于状态目录下的位置，但可以在其外部进行配置。有关确切的布局，请参阅 [ 数据库架构](/reference/database-schemas)。本指南介绍了如何保护该状态：一次性存档、每个数据库快照、计划、异地副本以及不应在每次备份时重新上传整个数据库的安装的连续复制。

实验性 PostgreSQL Workboard 存储使用本地 SQLite 锚点和 PostgreSQL 行。使用 `openclaw backup create` 进行备份，其中包括匹配的导出和锚点。首先通过其服务所有者停止网关； PostgreSQL 备份在运行时拒绝，并且永远不会自动停止。请参阅 [ 数据库引擎](/reference/database-engines#anchors-and-backups)。

启用 [ 冷转录本存储 ](/reference/session-management-compaction/maintenance#cold-transcript-storage) 时，较旧的转录本有效负载也存在于不可变的压缩文件中。使用 OpenClaw 备份命令通过数据库捕获这些有效负载。

切勿将正在运行的 `.sqlite`、`-wal`、`-shm` 或 `-journal` 文件直接复制为备份。 Gateway 运行时会写入数据库，而正在运行的数据库的原始文件副本可能不完整或损坏。下面介绍的每种受支持路径都会安全地捕获已提交的状态。

SQLite 快照（包括 Doctor 的迁移前备份和重试时的备份重用）可保留向量内存表，而无需加载本机 `sqlite-vec` 扩展。因此，备份创建可以在没有 AVX 的较旧 Intel CPU 上运行。表范围的启动迁移存档是一种专门的恢复格式，而不是完整备份。它们仅包含迁移声明的表和元数据。对这些文件使用 [ 范围内恢复命令 ](/reference/database-schemas/versioning#declared-migration-backup-scopes) ；包更新程序回滚继续捕获完整数据库。

矢量搜索仍然需要兼容的扩展；在这些主机上，构建不带 AVX 的 `sqlite-vec` 并将 `memory.search.store.vector.extensionPath` 设置为该构建的可加载扩展。

<Warning>
  备份包含身份验证配置文件、频道和提供商凭据、会话历史记录以及其他敏感记录。请将其加密存储，像限制实时状态目录一样限制目标位置的访问权限；如果怀疑备份已泄露，请轮换凭据。有关应用于机器迁移的相同规则，请参阅[在机器之间迁移](/install/migrating)。
</Warning>

## <a id="choose-a-path"></a> 选择路径

- 一次性状态和工作空间存档：`openclaw backup create`。
- 磁盘或对象存储上的存档：`openclaw backup create --to <location>`。
- 单个数据库、紧凑且经过验证：`openclaw backup sqlite create`
- 按内容进行版本化和增量备份：`openclaw backup git create`
- 定期保护：配置由 Gateway 所有的备份自动化
- 持续、增量、数据丢失仅几秒：使用 Litestream 复制数据库
- 定期增量拉取到另一台机器，无对象存储：`sqlite3_rsync`。

## <a id="full-archives"></a> 完整归档

绝对符号链接保留其原始目标位置，包括指向单独备份的配置或凭据的链接。在激活另一台主机或另一条路径上的状态之前查看这些链接；请参阅 [ 备份符号链接警告 ](/cli/backup#what-gets-backed-up)。

```bash
openclaw backup create --output ~/Backups/openclaw --verify
```

这会写入一个带时间戳的 `.tar.gz`，涵盖状态、配置、凭据、每个配置的代理目录和（默认情况下）工作区，然后验证存档清单和有效负载。设置 `--no-include-workspace` 时，代理目录仍然包含在内，即使它们的配置位置位于状态目录之外。 OpenClaw- 拥有的 SQLite 数据库（包括工作区内的代理数据库或托管状态资产）通过 SQLite 的在线备份 API 捕获，并经过所有者验证、清理和压缩。工作区中的其他 SQLite 文件仍然是普通工作区文件。 [Backup CLI](/cli/backup) 记录每个标志、所有者声明的可再生资源、易失性文件和验证详细信息。

如果配置格式错误，状态存档创建将失败，因为无法解析代理和插件所有权。 `--no-include-workspace` 仅排除工作区文件；它不会绕过所有权发现。在修复配置之前，请保存活动配置文件：

```bash
openclaw backup create --only-config --output ~/Backups/openclaw --verify
```

这仅保存活动的 JSON 配置文件，而不解析它或包含其 `$include` 依赖项。修复配置，然后重新运行上面的完整存档命令以保护状态、凭据、代理和工作区。

归档是完整副本：每次运行都会重新上传所有内容。它们适合在更新、重置、卸载或迁移机器之前使用，对于小型安装来说也是合理的日常方案。对于大型工作区或频繁备份，请优先使用下面的快照或持续复制方案。

对于临时容器主机，请将归档保存在容器外部，并使用 `openclaw backup restore` 作为灾难恢复工具，以重建一个新的持久状态树。恢复只会暂存文件；激活仍然是一个明确的离线部署步骤。

## <a id="per-database-snapshots"></a> 按数据库快照

`backup sqlite` 仅是 SQLite-，拒绝 PostgreSQL 锚，并指导使用 `backup create`。选择 PostgreSQL 的通用本地快照需要通过其服务所有者停止网关，然后保存匹配的 format-2 导出、锚点和清单。仍支持现有格式 1 SQLite 快照。

```bash
openclaw backup sqlite create --global --repository ~/Backups/openclaw-sqlite
openclaw backup sqlite create --agent main --repository ~/Backups/openclaw-sqlite
```

每次运行都会将一个经过验证的快照目录（`manifest.json` 加上 `database.sqlite`）发布到仓库目录中。快照会执行 vacuum，因此已删除页面的残留不会使其体积膨胀，并且每个快照都会记录一个 SHA-256 值，之后可由 `openclaw backup sqlite verify` 重新检查。

`--agent <id>` 从该代理配置的 `agentDir` 解析数据库，包括状态目录之外的根。相同的所有者派生查找适用于显式 Git 代理备份、`--all` 和计划的 Git 备份。通过代理 ID 验证或恢复历史工件不需要该代理存在于当前配置中。

快照仓库是本地目录。调度、上传、保留策略和启动时恢复有意留给操作员处理；下文将介绍这些内容。

### <a id="cold-transcript-backups"></a> 冷转录本备份

完整存档、每个数据库 SQLite 快照和 Git 备份包括其捕获的数据库引用的每个冷记录。在发布之前，备份所有者读取每个不可变存档，验证其大小和 SHA-256，并将压缩字节嵌入私有快照中。它不会更改实时数据库的存储策略。丢失或损坏的存档会导致备份创建失败，而不是生成具有不完整历史记录的成功备份。

生成的数据库是独立的：在另一台计算机上恢复它不需要源 `sessions/cold/` 目录。嵌入式压缩有效负载增加了备份字节，可以使备份比实时数据库更大；压缩仍然可能使其整体变小。完整存档还可能包含保留的不可变文件及其独立的数据库快照。

恢复后，压缩的有效负载最初保留在 SQLite 内。如果启用冷存储，后台工作人员会在释放嵌入式数据库字节之前发布并验证其存档文件。恢复的历史记录在整个过渡过程中保持可用。设置将包含在数据库大小中的嵌入存档字节与存档文件字节区分开来，并报告有多少嵌入存档移回文件。

Litestream 和 `sqlite3_rsync` 仅复制数据库字节，不执行此嵌入步骤。如果仍然存在任何文件支持的冷存档，即使禁用自动存档，也要捕获每个代理的会话工件目录下的不可变 `cold/` 目录。首先捕获数据库，然后捕获文件，并保留该数据库快照引用的每个文件。没有引用的冷文件的数据库副本是不完整的。当您需要一个便携式恢复工件时，首选受支持的 OpenClaw 快照命令。

## <a id="schedule-backups"></a> 计划备份

[配置并初始化存储位置](/install/backups#copy-backups-offsite)后，启用网关拥有的日常存档备份：

```bash
openclaw backup enable --to offsite --every 24h --keep-daily 7 --keep-weekly 4 --keep-monthly 12
```

网关使用该位置的加密设置创建、验证和上传每个存档。添加 `--no-include-workspace` 以省略工作区文件，或添加 `--namespace <name>` 以使用稳定的命名空间而不是清理后的主机名。保持该位置的凭据和加密密码可供网关进程使用。保留是可选的；如果没有任何 `--keep-*` 标志，则永远不会修剪备份。参见[保留规则](/cli/backup#offsite-retention)。

每个命名空间都属于首先上传到其中的安装。要有意接管现有命名空间，请将 `--claim-namespace` 传递给 `backup enable --to`。仅当显式传递时，调度才会保留此标志；然后，它的运行可以取代现有的所有权主张。对于仍在运行的不同安装，首选单独的 `--namespace`。

对于 Git 中的增量数据库历史记录，请初始化私有存储库并启用 Git 计划。这将备份共享数据库和每个配置的代理数据库，包括自定义代理根：

```bash
openclaw backup git init --repository ~/Backups/openclaw-git --remote git@github.com:you/openclaw-backups.git
openclaw backup enable --repository ~/Backups/openclaw-git --every 24h --push
```

当未配置 `origin` 远程时，`backup enable --push` 拒绝计划，因此全新安装无法静默创建推送始终失败的计划。

默认情况下，推送计划会编辑包含凭据的表和带有秘密前缀的机器状态行：否则，无人值守的重复推送将在远程 Git 历史记录中持久保留凭据。当您接受该权衡并且远程是私有的时，通过 `--include-secrets` 安排全保真远程备份；从编辑的历史记录中恢复需要重新配对设备并随后重新验证提供商。本地（非推送）计划保持完全保真度，因此恢复已完成。

使用 `--global-only` 或 `--agent <id>` 缩小 Git 范围。添加 `--exclude-secrets` 以获取经过编辑的 Git 历史记录。

每种模式有一个托管作业：异地存档和 Git 备份可以一起运行。重新运行 `backup enable` 会更新所选模式的作业，包括其目标。现有的 Git 计划将继续得到认可。间隔默认为 `24h`。禁用一种模式或两种模式：

```bash
openclaw backup disable --offsite
openclaw backup disable --git
openclaw backup disable
```

启用或禁用需要可访问的本地网关，因为作业在网关主机上运行。没有本地后备调度程序。对于远程网关，请在该主机上使用 `openclaw cron add` 显式创建作业。

另一种方式是直接使用平台调度器。以下是一个每晚运行的 cron 示例，用于为控制平面数据库和 `main` 代理数据库创建快照：

```bash
0 3 * * * openclaw backup sqlite create --global --repository "$HOME/Backups/openclaw-sqlite" --json >> "$HOME/Backups/openclaw-backup.log" 2>&1
5 3 * * * openclaw backup sqlite create --agent main --repository "$HOME/Backups/openclaw-sqlite" --json >> "$HOME/Backups/openclaw-backup.log" 2>&1
```

在 macOS 上，`launchd` 作业的工作方式相同；对于从[托管指南](/install)配置的服务器，systemd 计时器是自然的选择。`--json` 会在每次运行时输出一条机器可读的结果，因此日志也可以作为备份审计跟踪。根据你自己的保留计划清理旧的快照目录。

每个非试运行存档、本地 SQLite 快照和 Git 备份尝试也会记录在共享状态数据库中。主机级作业可以使用 `openclaw backup record` 报告其结果；请参阅 [ 外部备份作业](/cli/backup#record-external-backup-jobs)。

`openclaw status` 显示最新的备份尝试和异地结果。 Control UI 的系统登陆和网关主机视图上的备份部分显示每个目标的上次成功、大小、目标、最近的故障和下一次计划运行。其存储位置**Check**操作检查访问而不写入备份。 `openclaw doctor` 保留 14 天的新鲜度提示，并在尝试失败后或最后一次成功早于三个计划间隔时标记异地计划。使用 `openclaw storage test <name>` 诊断该目标。

记录的历史记录保留了每种备份类型和目标的最新 200 次尝试以及最新尝试和最新成功结果。即使另一项作业产生了 200 多个新结果，Status 和 Doctor 也会保留不常使用的目标的最后结果。

## <a id="copy-backups-offsite"></a> 将备份复制到异地

将命名的 [ 存储位置 ](/concepts/storage-locations) 用于外部磁盘、安装的网络目录或插件提供的对象存储。内置的 `filesystem` 提供程序使用现有目录； [Cloudflare 插件](/plugins/cloudflare) 提供 R2 存储。首先配置位置及其加密，然后显式初始化预期目标：

```bash
openclaw storage init offsite
openclaw storage test offsite
openclaw backup create --to offsite
```

backup命令在创建存档之前检查位置，在本地验证存档，上传它并确认其存储的大小。缺少初始化标记会拒绝备份：重新连接磁盘或检查存储桶和前缀，或者仅在新位置时才初始化该位置。运行时备份永远不会初始化位置或创建丢失的文件系统根。请参阅 [ 存储 CLI](/cli/storage)。

默认情况下，本地存档仅存在于托管暂存空间中，并在上传后被删除。添加 `--output ~/Backups/openclaw` 以保留本地副本。即使存储位置对上传的字节进行了加密，本地副本也是明文 `.tar.gz` 存档；相应地保护两个目标。

备份存储在 `backups/<namespace>/` 下，其中命名空间默认为清理后的主机名。为共享目标的每个安装使用不同的显式命名空间：

```bash
openclaw backup create --to offsite --namespace gateway --keep-daily 7 --keep-weekly 4 --keep-monthly 12
openclaw backup list --from offsite --namespace gateway
openclaw backup verify --from offsite --namespace gateway latest
openclaw backup restore --from offsite --namespace gateway latest --target ./restored-openclaw
```

第一次上传声明安装的持久网关设备标识的命名空间。其 `owner.json` 包含设备 ID、主机名和声明时间，并使用该位置的加密设置。 OpenClaw 在归档之前、归档发布时以及每次保留删除之前检查所有权。即使两台计算机使用相同的主机名，不同的设备标识也会导致尝试使用所有者的主机名和缩写设备 ID 失败。

选择另一个 `--namespace` 进行单独安装。要故意接管已停止或停用的安装的命名空间（例如在迁移到新硬件后），请运行：

```bash
openclaw backup create --to offsite --namespace gateway --claim-namespace
```

替换的安装在下次发布或删除时将被拒绝。对象存储无法使对象的写入以单独的所有权声明为条件，因此在最终检查和效果之间保留了剩余的提供者往返窗口。在接管之前停止旧的安装；对同时运行的安装使用单独的命名空间。

保留仅在成功上传后运行。它在每个选定的 UTC 天、周或月中保留最新的备份，结合策略并始终保留最新的备份。它永远不会删除其键与备份文件名模式不匹配的其他名称空间或对象，包括 `owner.json`。没有保留标志意味着没有删除；具体规则请参见 [Backup CLI](/cli/backup#offsite-retention)。

远程验证和恢复下载并解密到托管暂存中，然后使用与本地文件相同的存档检查。将静止阶段恢复为新目标；在激活结果之前按照 [ 恢复完整存档 ](/install/backups#restore-a-full-archive) 。在另一台主机上恢复时，指定原始命名空间并保留原始加密密码和位置标记。没有 `--namespace` 的 `backup list --from offsite` 还列出了可用的命名空间及其声明主机名，以便您可以找到原始数据。列出、验证和恢复不需要或更改命名空间所有权。

恢复的安装带有原始设备标识，并且可以继续使用其命名空间。同时运行的克隆副本共享该身份；给它自己的 `--namespace`，这样两个副本就不会共享保留。

每个档案都是完整的副本。对于上传大小很重要的大型安装，请使用 Git 支持的快照或连续复制。普通本地存档和快照存储库仍然是外部备份工具可以复制的普通文件。

## <a id="versioned-backups-to-a-git-repository"></a> 版本化备份到 Git 仓库

`openclaw backup git create --all` 通过其插件备份资源声明包含 PostgreSQL Workboard 存储。显式 `--global` 和 `--agent` 选择保留其现有范围。 PostgreSQL 源要求通过其服务所有者停止网关； Git 备份捕获或恢复在运行时拒绝。备份包含经过清理的 SQLite 导出、其原始锚点以及不含 DSN 的 format-2 清单。 Restore 会验证匹配的集合，并在发布其锚点之前创建一个新的 PostgreSQL 命名空间。保留替换的命名空间，直到确认恢复为止。

对于 SQLite，Git 支持的备份将每个选定的数据库转储到一致排序的 `schema.sql`、`manifest.json` 和每个表的 JSONL 文件中，然后为整个运行创建一次提交。未更改的数据库内容不会产生提交，因此 Git 仅通过构造存储和推送内容更改。 OpenClaw 仅暂存备份拥有的 `global` 和 `agents` 路径，而不暂存存储库中其他位置的不相关文件。

```bash
openclaw backup git init --repository ~/Backups/openclaw-git --remote <private-git-url>
openclaw backup git create --repository ~/Backups/openclaw-git --all --push
openclaw backup git log --repository ~/Backups/openclaw-git
```

请使用专用于 OpenClaw 备份的仓库。现有的 `global/` 和 `agents/<agentId>/` 作用域必须为空，或包含有效的 schema-version-1 OpenClaw 备份清单。OpenClaw 会拒绝替换其他任何作用域，而 `--all` 运行会在删除由备份拥有的过时条目之前验证每个现有的代理作用域。

仓库根目录必须由当前用户拥有，并且不得允许组用户或其他用户写入。初始化和每次创建期间都会检查这一点。在 POSIX 系统上，请确认所有权，并运行 `chmod 700 <repository>` 来修复不安全的权限。

存储库是普通的 Git，可以使用任何远程，包括 GitHub。保持远程私有：默认转储包括身份验证配置文件、令牌和其他凭证状态。当编辑的历史记录比凭证完整的备份更有用时，`--exclude-secrets` 会省略记录的秘密表和机器状态密钥前缀；有关确切列表，请参阅 [Backup CLI](/cli/backup#versioned-git-backups)。

在不覆盖实时文件的情况下，可以在任意提交中验证或恢复一个数据库：

```bash
openclaw backup git verify --repository ~/Backups/openclaw-git --ref <commit> --global
openclaw backup git restore --repository ~/Backups/openclaw-git --ref <commit> --agent main --target ./restored-agent.sqlite
```

Git 恢复聚合派生的搜索状态：它重建内容支持的 FTS5 索引，为网关启动协调留下转录投影状态，并留下向量表以供内存索引重新创建。然后，它验证表哈希、SQLite 完整性和外键。触发器主体可以包含 `CASE` 表达式和 SQL 注释。在发布目标文件之前，不完整的触发器定义会使恢复失败。

## <a id="continuous-replication-with-litestream"></a> 使用 Litestream 进行持续复制

[Litestream](https://litestream.io) 是一个用于 SQLite 的开源复制守护进程。它与 Gateway 一同运行，无需对 OpenClaw 做任何更改：它会监视每个数据库的预写式日志，并将增量更改流式传输到对象存储，同时定期创建快照，以便快速完成恢复。只有发生更改的页面会离开机器，因此当备份不能重新上传整个数据库时，它是合适的工具。

Litestream 的一项硬性要求是 WAL 模式，OpenClaw 在本地文件系统上使用该模式；在网络支持的存储（例如 NFS 或 SMB）上，OpenClaw 会回退到回滚日志记录，因此首先使用 `PRAGMA journal_mode;` 进行验证。将控制平面数据库和一个代理数据库复制到 S3- 兼容存储桶的最小 `litestream.yml`：

```yaml
dbs:
  - path: /home/user/.openclaw/state/openclaw.sqlite
    replicas:
      - url: s3://openclaw-backups/state
  - path: /home/user/.openclaw/agents/main/agent/openclaw-agent.sqlite
    replicas:
      - url: s3://openclaw-backups/agents/main
```

在进程监管器下运行 `litestream replicate`，为你关注的每个数据库各配置一个条目。要进行恢复，请恢复到一个新的路径，然后在离线状态下激活它：

```bash
litestream restore -o ./restored-openclaw.sqlite s3://openclaw-backups/state
```

对于具有自定义 `agentDir` 的代理，请将示例的默认代理数据库路径替换为其配置的 `<agentDir>/openclaw-agent.sqlite`。

Litestream 仅复制数据库字节。配置、凭据文件和工作区仍需要使用上述基于文件的路径之一，并且复制的数据与归档一样敏感，因此请应用相同的存储桶访问和加密规则。

## <a id="pull-replication-with-sqlite3_rsync"></a> 使用 sqlite3_rsync 拉取复制

[`sqlite3_rsync`](https://sqlite.org/rsync.html) 是 SQLite 项目的官方复制工具，以 `rsync` 为模型：它比较源数据库和副本数据库之间的页面哈希值，并仅传送更改的页面，通常通过 SSH 进行，两端安装相同的二进制文件。与原始文件副本不同，它在源上进行读取事务，因此在网关运行时从实时数据库中提取数据会生成一致的副本。原点需要 WAL 模式。 OpenClaw 在本地文件系统上使用 WAL，但故意回退到网络支持的存储（例如 NFS 或 SMB）上的回滚日志记录，因此在依赖此路径之前检查源：

```bash
sqlite3 ~/.openclaw/state/openclaw.sqlite "PRAGMA journal_mode;"
```

如果这打印出 `wal` 以外的任何内容，请改用上面基于文件的路径之一。

该工具以 [SQLite 下载页面 ](https://sqlite.org/download.html) 上的 `sqlite-tools` 二进制包和完整源代码树形式提供；包管理器 SQLite 构建经常省略它。将数据库拉到您控制的另一台机器上：

```bash
sqlite3_rsync 'user@gateway-host:~/.openclaw/state/openclaw.sqlite' ./replica/openclaw.sqlite
```

重新运行该命令是增量的：未更改的数据库仅交换几千字节的哈希值，并且附加的数据传输大致以其自身的大小进行。将副本视为只读且与源一样敏感。

两个警告。首先，增量是基于页面的，OpenClaw 的数据库在定期维护计时器上运行增量自动清理；真空传递会重新定位页面，因此在页面之后不久（或在大量删除之后，例如转录档案逐出），可以传输的数据远多于实际的数据更改。其次，这仅复制数据库字节，如 Litestream：配置、凭证文件和工作区仍然需​​要上面基于文件的路径。对于具有可预测上传大小的连续复制，首选 Litestream；使用 `sqlite3_rsync` 在没有对象存储的机器之间进行计划或临时拉取。要恢复，请像对待任何恢复的数据库一样对待副本：在网关停止时将其复制到位，然后按照 [ 恢复数据库](#restore-a-database)。

## <a id="restore"></a> 恢复

恢复过程是有意设计为显式操作；不会直接覆盖实时状态。

### <a id="restore-a-full-archive"></a> 恢复完整归档

仅从你创建或以其他方式信任的归档开始。`openclaw backup verify` 会检查归档结构和负载布局，但不会对归档进行身份验证，也不会使不受信任的内容变得安全。

在完整恢复之前，请查看[备份了哪些内容](/cli/backup#what-gets-backed-up)。然后使用一条命令进行验证，并将其解压到一个全新的暂存目录：

```bash
ARCHIVE=./2026-03-09T08-00-00.000+08-00-openclaw-backup.tar.gz
openclaw backup restore "$ARCHIVE" --target ./restored-openclaw
```

目标不得存在或必须为空，并且不得位于实时状态目录或任何配置的实时代理目录内。 OpenClaw 在写入目标之前验证存档结构、清单、硬链接、符号链接条目以及根 SQLite 快照及其持久注册的代理快照。其他有效负载仍然不透明。非空目标将被拒绝，失败的提取将清除其不完整的输出。该命令永远不会写入活动状态或代理根，并且没有强制或就地模式。将恢复的目录视为敏感目录：它可以包含凭据、身份验证配置文件、会话和工作区数据。

在恢复之前，请检查目标文件系统是否有空间容纳存档的完整未压缩有效负载以及提取开销，同时活动树仍保留在原位。将活动树重命名或移动到同一文件系统上的同级路径不会释放其块；因此，完整恢复需要第二棵树的空间。

<Warning>
  恢复档案就像时间旅行。具有棘轮状态的消息传递通道凭证（尤其是 WhatsApp）可能在回滚后不同步并需要重新链接。批准和 delivery/dedupe 状态也会回滚，因此请在恢复网关之前查看待批准的批准。插件 `node_modules` 树未存档；激活后，运行`openclaw plugins update <id>`或使用`openclaw plugins install <spec> --force`重新安装。运行 `openclaw skills list` 或启动代理会话以从当前插件元数据重新生成省略的 `plugin-skills/` 符号链接索引。
</Warning>

schema-version-1 清单记录 `archiveRoot`、`paths` 下的原始路径、`assets[]` 列表以及附加的已配置代理所有权元数据。每个资产在 tarball 中都包含其 `kind`、原始 `sourcePath` 和 `archivePath`。当外部自定义代理根需要自己的源时，其类型为 `agent`；状态或工作区资产已覆盖的根会出现在所有权元数据中，而不会重复存档条目。使用资产和所有权字段作为事实来源；不要从存档文件名派生存档根或从默认布局重建代理路径。没有附加所有权元数据的旧档案仍然是可验证的。

归档布局如下：

```text
<archive-root>/manifest.json
<archive-root>/payload/posix/<absolute-source-path-without-leading-slash>/...
<archive-root>/payload/windows/<DRIVE>/<rest>/...
<archive-root>/payload/relative/<relative-source-path>/...
```

要激活，请停止网关和使用恢复的文件的任何节点主机。对当前状态进行全新备份或将其移至一边。然后将提取的国有资产移动到位，或将 `OPENCLAW_STATE_DIR` 指向该资产。使用记录的代理 ID 和原始源路径恢复每个自定义代理根；保留其配置的 `agentDir` 或将该设置更新到新位置。在新计算机上或不同的主目录下，还可以使用清单将配置、凭据和工作区资产映射到其新路径。在重新启动网关之前运行 `openclaw doctor`。有关回滚工作流程，请参阅 [Updating](/install/updating#rollback)。

当无法进行完全分阶段恢复时，选择性提取原始 tar 成员是专家的离线最后手段，而不是推荐的恢复路径。它绕过了恢复命令的完整布局和清理保护措施。保持原始存档不变，先验证，停止每个写入者，并使用`manifest.json`确认每个选定成员的确切资产路径和代理所有权。从同一备份生成中恢复配置、共享数据库和所有必需的每个代理数据库。仅从存档的托管快照中提取 SQLite 成员；切勿将数据库与另一代的 `-wal`、`-shm` 或 `-journal` 文件合并。尽可能将数据恢复到具有足够空间来保存完整存档的存储上。

### <a id="restore-a-database"></a> 恢复数据库

对于快照，`openclaw backup sqlite restore <snapshot-directory> --target <new-database-path>` 会将经过重新验证的数据库写入新的目标位置。对于 Git 历史记录，`openclaw backup git restore --repository <dir> --ref <commit> (--global | --agent <id>) --target <new-database-path>` 会生成并验证一个新的数据库。对于 Litestream，`litestream restore` 会写入一个新的数据库文件。Gateway 停止后，将结果移到目标位置，然后启动 Gateway 并检查 `openclaw health` 和 `openclaw doctor`。

将数据库恢复到不同的 OpenClaw 版本后，首先使用 `openclaw database preflight` 对数据库执行预检；请参阅 [数据库架构](/reference/database-schemas#preflight-a-target-release)。

## <a id="related"></a> 相关内容

- [Agent 工作区](/concepts/agent-workspace#git-backup-recommended-private)，用于将工作区文件保存在私有 git 仓库中
- [Backup CLI 参考](/cli/backup)
- [Cloudflare Containers](/install/cloudflare) — 连续 Litestream 复制到 R2 以进行临时容器部署
- [Cloudflare 插件](/plugins/cloudflare) — 用于存档备份的 R2 存储位置
- [数据库模式](/reference/database-schemas)
- [在计算机之间迁移](/install/migrating)
- [存储位置](/concepts/storage-locations)
- [更新](/install/updating)
