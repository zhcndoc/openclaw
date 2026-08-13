---
summary: "`openclaw backup` 的 CLI 参考（归档、SQLite 快照和 Git 历史）"
read_when:
  - 你希望为本地 OpenClaw 状态创建一份一等公民备份归档
  - 你需要某个 OpenClaw SQLite 数据库的紧凑、经过验证的快照
  - 你希望在由运维人员拥有的 Git 仓库中创建定时、带版本的数据库备份
  - 你希望在重置或卸载前预览将要包含哪些路径
  - 你希望从之前由 `openclaw backup` 创建的 `.tar.gz` 归档中恢复
title: "备份"
---

# `openclaw backup`

为 OpenClaw 的状态、配置、认证配置文件、通道／提供方凭据、会话，以及可选的工作区创建一个本地备份归档。

```bash
openclaw backup create
openclaw backup create --output ~/Backups
openclaw backup create --dry-run --json
openclaw backup create --verify
openclaw backup create --no-include-workspace
openclaw backup create --only-config
openclaw backup verify ./2026-03-09T08-00-00.000+08-00-openclaw-backup.tar.gz
openclaw backup restore ./2026-03-09T08-00-00.000+08-00-openclaw-backup.tar.gz --target ./restored-openclaw
openclaw backup sqlite create --global --repository ~/Backups/openclaw-sqlite
openclaw backup sqlite create --agent main --repository ~/Backups/openclaw-sqlite
openclaw backup sqlite list --repository ~/Backups/openclaw-sqlite
openclaw backup sqlite verify ~/Backups/openclaw-sqlite/<snapshot-id>
openclaw backup sqlite verify ~/Backups/openclaw-sqlite/<snapshot-id> --scratch ~/Private/openclaw-scratch
openclaw backup sqlite restore ~/Backups/openclaw-sqlite/<snapshot-id> --target ./restored/openclaw.sqlite
openclaw backup git init --repository ~/Backups/openclaw-git --remote <private-git-url>
openclaw backup git create --repository ~/Backups/openclaw-git --all --push
openclaw backup git log --repository ~/Backups/openclaw-git
openclaw backup git verify --repository ~/Backups/openclaw-git --global
openclaw backup git restore --repository ~/Backups/openclaw-git --agent main --target ./restored/agent.sqlite
openclaw backup enable --repository ~/Backups/openclaw-git --every 24h --push
openclaw backup disable
```

归档 `create`、`verify` 和 `restore`，以及 SQLite 的 `create`、`list`、`verify` 和
`restore`，均接受 `--json`，用于在 stdout 上输出一条机器可读的结果。

## 注释

- 该归档内嵌一个 `manifest.json`，其中包含已解析的源路径和归档布局。
- 默认输出是在当前工作目录中的带时间戳 `.tar.gz` 归档。带时间戳的文件名使用你机器的本地时区，并包含 UTC 偏移量。如果当前工作目录位于已备份的源树内部，OpenClaw 会回退到你的主目录作为默认归档位置。
- 现有归档文件绝不会被覆盖。源状态／工作区树中的输出路径会被拒绝，以避免自包含。
- `openclaw backup verify <archive>` 会检查归档是否恰好包含一个根 manifest，拒绝遍历式归档路径和 SQLite 侧车文件，确认每个 manifest 声明的负载都存在，验证每个 SQLite 快照的文件形态，并在标准 OpenClaw 数据库上运行完整的完整性与角色检查。专用插件 schema 仍然是透明的，因为它们可能需要所有者定义的 SQLite 能力。`openclaw backup create --verify` 会在写入归档后立即运行该验证。
- `openclaw backup create --only-config` 仅备份当前活动的 JSON 配置文件。

## 恢复完整归档

将完整归档恢复到全新的暂存目录，而不触及
活动状态目录：

```bash
openclaw backup restore <archive.tar.gz> --target <fresh-directory>
```

目标路径必须不存在，或必须是空目录。恢复会在创建或写入目标之前验证归档及其 SQLite 数据库，拒绝非空目标，并在任何步骤失败时移除不完整的提取内容。它绝不会原地恢复，也没有 `--force` 模式。提取后的布局会完全保留归档根目录、manifest 和归档中记录的 `payload/` 路径。

<Warning>
  恢复归档意味着时间旅行。带有棘轮状态的消息通道凭据，尤其是 WhatsApp，可能会在回滚后失去同步，需要重新关联。审批以及投递／去重状态也会回滚，因此请在恢复 Gateway 运行前检查待处理的审批。插件的 `node_modules` 树不会被归档；激活后，请运行 `openclaw plugins update <id>`，或使用 `openclaw plugins install <spec> --force` 重新安装。
</Warning>

激活是一个单独的离线运维步骤。停止 Gateway，将恢复的状态资产移入目标位置，或将 `OPENCLAW_STATE_DIR` 指向该资产，然后在重启前运行 `openclaw doctor`。使用 `manifest.json` 作为状态、配置、凭据和工作区资产路径的事实来源。有关完整的灾难恢复流程，请参阅[恢复完整归档](/install/backups#restore-a-full-archive)。

## SQLite 快照

当你需要为一个 OpenClaw 所拥有的 SQLite 数据库提供一个可移植的工件，而不是一个宽泛的状态归档时，请使用 `openclaw backup sqlite`。

快照创建只接受一个命名来源：

| 命令                                                           | 数据库                 |
| -------------------------------------------------------------- | ---------------------- |
| `openclaw backup sqlite create --global --repository <dir>`     | OpenClaw 共享状态       |
| `openclaw backup sqlite create --agent <id> --repository <dir>` | 每个代理一个数据库      |

仓库中每个已提交的快照对应一个目录。每个快照目录都恰好包含：

- `manifest.json`
- `database.sqlite`

快照创建会在读取之前验证活动数据库，使用 SQLite 的在线备份 API 捕获已提交的 WAL 状态，而不会持有一个很长的读事务，关闭活动数据库，用 `VACUUM` 压缩私有副本，再次验证生成的数据库，并在不覆盖现有路径的情况下发布已完成的目录。全局快照会在压缩前移除临时传递队列行，以便已删除的队列负载不会保留在空闲页中。

不要将活动的 `.sqlite`、`-wal`、`-shm` 或 `-journal` 文件作为可移植工件进行复制。只复制已完成的快照目录。

SQLite 快照可能包含身份验证配置文件、会话状态、插件状态以及其他敏感记录。请以与活动 OpenClaw 状态目录相同的权限、加密、保留策略和目标限制来保护仓库。

### 验证和恢复

```bash
openclaw backup sqlite verify <snapshot-directory>
openclaw backup sqlite restore <snapshot-directory> --target <new-database-path>
```

验证会检查严格的清单结构、工件大小和 SHA-256、SQLite 完整性、外键、模式版本、数据库角色和所有者，以及 OpenClaw 所拥有的索引定义。

验证会对一个私有的、内容固定的副本进行检查，因此路径名竞争条件无法替换 SQLite 所检查的字节。默认情况下，该临时副本会创建在快照仓库旁边，并在命令返回前移除。暂存根目录及其祖先链必须阻止其他用户替换它。POSIX 根目录必须由当前用户拥有且不能被组／所有人可写；像 `/tmp` 这样的粘滞祖先目录对用户拥有的子目录是可接受的。会暴露或使暂存可被替换的 macOS ACL 授权会被拒绝。Windows 根目录和祖先目录必须由当前用户或受信任的 OS 主体拥有，并且 ACL 必须禁止不受信任的暂存访问。对于只读挂载或网络共享，请在具有等效加密和目标控制的存储上使用 `--scratch <existing-private-directory>`。

快照创建会在暂存或发布数据库字节之前，对仓库应用相同的所有者、ACL、祖先和路径标识检查。新创建的目录边和最终发布元数据会通过共享的 `fs-safe` 持久性边界同步，之后才会在受支持的文件系统上报告成功。

恢复会重复验证，并且只写入一个新的目标位置。它会拒绝已存在的目标、`-wal`、`-shm` 或 `-journal` 伴随文件，并且绝不会对活动的 OpenClaw 数据库执行原地替换。目标父目录与验证 scratch 具有相同的路径安全要求。激活已恢复的数据库仍然是一个明确的离线运维步骤。

快照仓库是本地目录。调度、上传、保留、增量 WAL 包、故障切换以及启动时恢复行为都明确不属于此命令的范围。

## 带版本的 Git 备份

`openclaw backup git` 将按表生成的确定性 JSONL 转储存储在由运维人员拥有的普通 Git 仓库中。一个仓库可以存放共享数据库和每个代理的数据库：

```text
global/manifest.json
global/schema.sql
global/tables/<table>.jsonl
agents/<agentId>/manifest.json
agents/<agentId>/schema.sql
agents/<agentId>/tables/<table>.jsonl
```

初始化仓库，然后为所有已注册的数据库创建快照：

```bash
openclaw backup git init --repository ~/Backups/openclaw-git --remote <private-git-url>
openclaw backup git create --repository ~/Backups/openclaw-git --all --push
```

仓库根目录必须由当前用户拥有，且不能对组或所有人可写。OpenClaw 会在初始化或接管仓库时，以及每次创建前检查这一点。在 POSIX 系统上，确认所有权后，使用
`chmod 700 <repository>` 修复不安全的权限。

仓库必须专用于 OpenClaw 备份。只有当现有的 `global/` 或
`agents/<agentId>/` 作用域为空，或包含有效的 schema-version-1 `manifest.json` 时，该作用域才属于备份所有者。OpenClaw 拒绝替换其他任何作用域。使用 `--all` 时，它会在移除过时的、由备份所有的代理作用域之前验证 `agents/` 下的每个现有条目，因此未归属的条目会在删除任何内容之前中止清理。

你也可以选择 `--global`，重复使用 `--agent <id>`，或将共享数据库与选定的代理组合起来。快照创建使用与 `backup sqlite create` 相同的在线备份、清理、`VACUUM`、所有者验证和完整性检查；它绝不会直接读取活动 SQLite 文件。行和 schema 条目具有确定性排序，整数和 blob 使用无损编码。该命令会创建一个名为 `openclaw backup <ISO8601>` 的提交。如果数据库内容未发生变化，它会输出 `no changes`，且不会创建提交。

Git 暂存仅限于由备份所有的 `global` 和 `agents` 路径；
接管的仓库中其他位置的无关文件绝不会被暂存。

`--push` 会将当前分支推送到 `origin`。本地提交成功后发生的推送失败属于警告，不会丢弃本地备份，也不会将其标记为失败。

<Warning>
  Git 历史是持久的。如果不使用 `--exclude-secrets`，快照会包含凭据材料，任何已推送的远程仓库都必须是私有的。

`src/state/secret-state-tables.ts` 是编辑的事实来源。在此版本中，`--exclude-secrets` 会省略这些共享状态表：

- `audit_identity_keys`
- `auth_profile_state`
- `auth_profile_stores`
- `apns_registrations`
- `channel_ingress_events`
- `channel_pairing_requests`
- `clawhub_promotion_claims`
- `device_auth_tokens`
- `device_bootstrap_tokens`
- `device_identities`
- `device_pairing_join_codes`
- `device_pairing_paired`
- `gateway_origin_device_tokens`
- `mcp_oauth_pending_authorizations`
- `mcp_oauth_stores`
- `native_hook_relay_bridges`
- `node_host_config`
- `secret_store_entries`
- `web_push_subscriptions`
- `web_push_vapid_keys`
- `worker_environment_credentials`

它会省略这些每个代理的表：

- `auth_profile_state`
- `auth_profile_store`
- `session_suggestions`

恢复时会报告被省略的表，以免将经过编辑的快照误认为完整的凭据备份
</Warning>

检查或验证历史记录，不改变活动数据库：

```bash
openclaw backup git log --repository ~/Backups/openclaw-git --limit 20
openclaw backup git verify --repository ~/Backups/openclaw-git --ref <commit> --global
openclaw backup git verify --repository ~/Backups/openclaw-git --ref <commit> --agent main
```

验证会将选定的快照恢复到私有暂存空间，检查每个表的行数和 SHA-256，运行 `PRAGMA integrity_check` 和 `PRAGMA foreign_key_check`，然后移除暂存副本。恢复只会写入全新的目标，并拒绝已存在的 `-wal`、`-shm` 和 `-journal` 侧车文件：

```bash
openclaw backup git restore --repository ~/Backups/openclaw-git --ref <commit> --global --target ./restored/openclaw.sqlite
```

恢复会在加载其内容表后重建由内容支持的 FTS5 索引。它会有意省略派生的 `session_transcript_index_state` 投影，以便 Gateway 启动协调过程重建转录搜索。由于恢复进程中没有该扩展，`vec0` 虚拟表不会被实体化；内存索引会重新创建这些表，并安排完整重建索引。

## 调度备份

配置一个由 Gateway 所有、名称固定的自动化任务：

```bash
openclaw backup enable --repository ~/Backups/openclaw-git --every 24h --push
```

默认作用域是每个数据库。使用 `--global-only` 或 `--agent <id>` 可以缩小范围，使用 `--exclude-secrets` 可以创建经过编辑的历史记录。推送调度（`--push`）默认会编辑包含凭据的表，因为无人值守的重复推送会将这些内容持久保留在远程历史中；传入 `--include-secrets` 可显式创建完整保真度的远程备份（从经过编辑的历史记录恢复时需要重新配对设备并重新验证提供方身份）。`--push` 还要求仓库已经拥有一个 `origin` 远程仓库。重新运行 `backup enable` 会更新现有自动化任务，而不是创建重复任务。`openclaw backup disable` 会移除该任务；停用一个已经不存在的任务会成功但不执行任何操作。备份调度目前要求使用本地 Gateway，因为命令任务会在 Gateway 主机上运行；对于远程 Gateway，请使用 `openclaw cron add` 手动创建 cron 任务。

## 运行记录和新鲜度

每次实际的归档、SQLite 快照和 Git 创建尝试，都会在现有的共享状态数据库中记录一条精简结果。试运行不会被记录。日志保留最新的 200 次尝试，因此频繁的调度也会保持有界。

`openclaw status` 会显示一行 `Backups` 概览，`openclaw status --json` 会包含最近一次尝试和最近一次成功运行。`openclaw doctor` 会在没有记录成功备份，或最新成功备份距今超过 14 天时，打印一条信息提示。记录操作尽力而为：记录写入失败会打印警告，但绝不会将成功的备份变成失败的命令。

## 备份内容

`openclaw backup create` 会根据你的本地 OpenClaw 安装来规划源：

- 状态目录（通常是 `~/.openclaw`）
- 活动配置文件路径
- 当 `credentials/` 目录存在于状态目录之外时，会使用解析后的该目录
- 从当前配置中发现的工作区目录，除非你传入 `--no-include-workspace`

认证配置文件和其他每个 agent 的运行时状态都存储在状态目录下的 SQLite 中（`agents/<agentId>/agent/openclaw-agent.sqlite`），因此它们会自动包含在状态备份项中。

`--only-config` 会跳过状态、凭据目录和工作区发现，只归档活动配置文件路径。

OpenClaw 在构建归档前会规范化路径：如果配置、凭据目录或某个工作区已经位于状态目录内，它们不会作为单独的顶级备份源重复包含。缺失的路径会被跳过。

在创建归档期间，OpenClaw 会在 `tar` 读取之前排除已知的实时变动路径。这样可以避免文件记录大小与并发写入之间的竞态。该过滤器会在每个已备份的状态目录下应用以下基于状态相对路径的规则：

| 状态相对范围                         | 跳过的文件后缀                 |
| ------------------------------------ | ------------------------------ |
| `sessions/**`                        | `.jsonl`、`.log`              |
| `agents/<agentId>/sessions/**`       | `.jsonl`、`.log`              |
| `cron/runs/**`                       | `.jsonl`、`.log`              |
| `logs/**`                            | `.jsonl`、`.log`              |
| `delivery-queue/**`                  | `.json`、`.delivered`、`.tmp`  |
| `session-delivery-queue/**`          | `.json`、`.delivered`、`.tmp`  |
| 状态备份目录下的任何路径             | `.sock`、`.pid`、`.tmp`        |

这些规则不会过滤状态目录之外的工作区文件。它们也会省略与表中匹配的已完成转录和日志文件，因此在需要时请单独保留这些记录。JSON 结果中的 `skippedVolatileCount` 会报告有多少文件被有意省略。

状态目录下的 SQLite 数据库会使用 SQLite 的在线备份 API 捕获，并使用 `VACUUM` 在离线状态下压缩，因此已删除页面的残留不会进入归档，且不会复制正在使用的 WAL／SHM 文件。需要依赖不可用的所有者自定义 SQLite 能力的插件拥有数据库会直接失败，而不会回退为直接文件复制。通过工作区备份包含的 SQLite 文件会作为工作区文件复制，不受压缩保证约束。

状态目录中 `extensions/` 树下已安装插件的源文件和清单文件会被包含，但其嵌套的 `node_modules/` 依赖树会被跳过，因为这些属于可重新构建的安装产物。恢复归档后，如果某个已恢复的插件报告缺少依赖，请使用 `openclaw plugins update <id>`，或使用 `openclaw plugins install <spec> --force` 重新安装。

状态目录下由安装程序管理且可重新构建的运行时根目录也会被跳过：`dev/`、`git/`、`npm/`、旧版 `npm-runtime/`、`tmp/` 和 `tools/`。这些目录包含受管理的检出内容、软件包树、编译器缓存、临时文件和已下载的运行时，而不是权威的用户状态；恢复后请重新安装或更新相应的运行时或插件。明确配置在这些根目录中的配置文件、凭据目录或工作区仍会被包含。

受管理的 `dev/` 检出内容中的本地修改属于开发者源代码，而不是 OpenClaw 产品状态，因此不会被包含。依赖状态备份之前，请提交并推送这些修改，或单独复制该检出内容。

## 无效配置行为

`openclaw backup` 会绕过正常的配置预检，因此在恢复期间仍然可以提供帮助。工作区发现依赖于有效的配置，所以当配置文件存在但无效且仍启用了工作区备份时，`openclaw backup create` 会快速失败。

在这种情况下，如果要进行部分备份，请使用 `--no-include-workspace` 重新运行：它会将状态、配置以及外部凭据目录纳入范围，同时完全跳过工作区发现。

当配置格式错误时，`--only-config` 也可以正常工作，因为它不会为了工作区发现而解析配置。

## 大小和性能

OpenClaw 不强制内置的最大备份大小或单个文件大小限制。若归档写入连续五分钟没有产生任何数据，则会失败并删除其部分临时文件，而不会无限期挂起。除此之外，实际限制来自于：

- 用于临时归档写入以及最终归档的可用空间
- 遍历大型工作区树并将其压缩为 `.tar.gz` 所需的时间
- 使用 `--verify` 或 `openclaw backup verify` 重新扫描归档所需的时间
- 目标文件系统行为：OpenClaw 需要使用无覆盖的硬链接发布，因此最终归档路径绝不会暴露正在进行中的副本；不受支持的文件系统会报错并给出可操作的错误信息

如果在发布后进行的最终目录持久性确认失败，命令会报告失败，但会保留完整的最终条目，而不是冒险删除一个并发替换项。

大型工作区通常是归档大小的主要驱动因素。使用 `--no-include-workspace` 可以获得更小／更快的备份，或者使用 `--only-config` 获得最小的归档。

## 相关

- [CLI 参考](/cli)
- [迁移 OpenClaw 安装](/install/migrating)
- [恢复完整归档](/install/backups#restore-a-full-archive)
