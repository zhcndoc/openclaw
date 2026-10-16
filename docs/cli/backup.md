---
doc-schema-version: 1
summary: "`openclaw backup` 的 CLI 参考（本地和异地存档、SQLite 快照、Git 历史记录和计划）"
read_when:
  - "你希望为本地 OpenClaw 状态创建一份一等公民备份归档"
  - "你需要某个 OpenClaw SQLite 数据库的紧凑、经过验证的快照"
  - "你希望在由运维人员拥有的 Git 仓库中创建定时、带版本的数据库备份"
  - "您需要加密的异地存档、保留或外部备份状态"
  - "你希望在重置或卸载前预览将要包含哪些路径"
  - "您想要从 `openclaw backup` 先前创建的 `.tar.gz` 存档进行恢复"
title: "备份"
---

# `openclaw backup`

为 OpenClaw 状态、配置、身份验证配置文件、channel/provider 凭证、会话和可选工作区创建备份存档。将它们保存在本地或上传到名为 [ 的存储位置 ](/concepts/storage-locations)。 SQLite 快照和 Git 历史记录提供了以数据库为中心的替代方案。

```bash
openclaw backup create
openclaw backup create --output ~/Backups
openclaw backup create --dry-run --json
openclaw backup create --verify
openclaw backup create --no-include-workspace
openclaw backup create --only-config
openclaw backup create --to offsite --keep-daily 7 --keep-weekly 4 --keep-monthly 12
openclaw backup list --from offsite
openclaw backup verify --from offsite latest
openclaw backup restore --from offsite latest --target ./restored-openclaw
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
openclaw backup enable --to offsite --every 24h --keep-daily 7
openclaw backup disable --offsite
openclaw backup disable
openclaw backup record --status ok --target host-restic --bytes 1048576
```

存档 `create`、`list`、`verify` 和 `restore`、外部 `record` 以及 SQLite `create`、`list`、`verify` 和`restore`，接受 `--json` 以获得标准输出上的一个机器可读结果。

## <a id="postgresql-stores"></a> PostgreSQL 商店

`openclaw backup create` 通过其物理引擎路由每个托管数据库，包括激活的插件声明的备份资源。如果任何选定的商店使用 PostgreSQL，请首先通过其服务所有者停止网关。正在运行的网关会导致拒绝：“通过服务所有者停止，然后重新运行。”备份永远不会自动停止。该要求也适用于 `create --to`。

PostgreSQL 捕获包含原始锚点、经过清理的 SQLite 导出图像以及包含配置文件、引擎、存储 UUID、版本、活动片段、分配事实、大小和哈希的 format-2 清单。该清单不包含 DSN。将这些工件放在一起；仅复制锚点不会备份行。现有格式 1 SQLite 快照仍然可读。有关匹配的还原和更新恢复行为，请参阅 [ 数据库引擎](/reference/database-engines#anchors-and-backups)。

## <a id="notes"></a> 说明

- 存档嵌入了 schema-version-1 `manifest.json` 以及已解析的源路径和存档布局。附加所有权元数据记录配置的代理 ID 和根，包括已被另一资产覆盖的代理根；现有的存档布局和较旧的存档仍然受支持。新档案还记录了创建时捕获的当前布局 SQLite 快照；独立验证拒绝丢失或不匹配的库存条目。没有此清单的旧存档仍然可读，但验证报告 `sqliteInventoryVerified: false`，因为无法建立完整的数据库覆盖范围。空清单意味着没有捕获当前布局的数据库（例如，仅配置导出），而不是完整的数据库恢复点。
- 如果没有 `--to`，默认输出是当前工作目录中带时间戳的 `.tar.gz` 存档。本地时间戳文件名使用计算机的本地时区并包含 UTC 偏移量。如果当前工作目录位于备份的源代码树内，则 OpenClaw 将回退到默认存档位置的主目录。对于`--to`，默认存档是临时的；也通过 `--output` 保留本地副本。
- 现有存档文件永远不会被覆盖。源 state/workspace 树内的输出路径被拒绝以避免自包含。
- `openclaw backup verify <archive>` 检查存档是否仅包含一个根清单，拒绝遍历式存档路径和不安全的符号链接，确认每个清单声明的有效负载都存在，并验证清单或捕获的持久注册表中列出的根 SQLite 快照和代理快照。它拒绝这些快照的 sidecar，并检查它们的完整性和数据库角色，包括每个代理的身份。其他文件（包括在创建期间已验证的插件快照）在验证和恢复期间保持不透明。 `openclaw backup create --verify` 在写入存档后立即运行该验证。
- 完整存档包括活动配置及其所需的 `$include` 文件，包括状态目录之外的依赖项。它们保留创作的字节、注释和环境占位符；已解析的机密不会写入配置副本中。这些附加文件可能包含敏感数据，因此请相应地保护存档。
- 仅当其文件签名确认格式时，名为 `._*.sqlite` 的 AppleDouble 元数据（例如 `._cron.sqlite`）才会从状态和代理数据库根中排除。真实的 SQLite 文件和具有这些名称的硬链接别名遵循与其他数据库相同的所有权规则。
- 完整存档拒绝未解析的包含图形、在配置捕获期间更改的文件，并包含无法安全表示的别名。修复丢失或不可读的文件，使用常规文件包含路径，或暂停并发编辑并重试。 `--no-include-workspace` 仍然包含所需的配置依赖项，即使在排除的工作区中也是如此。
- `openclaw backup create --only-config` 仅备份活动的 JSON 配置文件，**不备份** 及其 `$include` 依赖项。它是根文件导出，而不是完整的模块化配置恢复点。
- Config 文件在数据库捕获之前固定。 SQLite 快照保留其现有的每个数据库的一致性和清理；该存档不是跨配置和所有数据库的一个原子快照。后来的写入仍然有效，可能不会出现在存档中。

存档成员位于带时间戳的根和 `payload/` 下，源路径编码在其下方。因此，即使代理数据库存在，对从 `.openclaw/agents/` 开始的条目进行计数也会返回零。检查根 `manifest.json` 及其 `sqliteSnapshots` 库存，然后运行 ​​`openclaw backup verify <archive>`。报告为 `covered by` 的路径通过该父项包含另一个资产；它并未被从档案中排除。

## <a id="offsite-archives"></a> 异地档案

配置一个名为[的存储位置](/concepts/storage-locations)，对其进行初始化，并在第一次备份之前测试访问：

```bash
openclaw storage init offsite
openclaw storage test offsite
openclaw backup create --to offsite
```

内置 `filesystem` 提供程序支持现有磁盘或挂载目录。 [Cloudflare 插件](/plugins/cloudflare) 提供 R2 对象存储。存储配置拥有加密和凭证；备份命令使用配置的位置，而不使用特定于提供商的标志。请参阅 [ 存储 CLI](/cli/storage)。

`create --to` 在存档之前打开并检查位置，在托管暂存中创建存档，验证其清单和有效负载，上传它并确认存储的大小。即使没有 `--verify`，也始终启用异地创建的验证。临时本地存档随后将被删除。要保留本地副本，请添加 `--output <path>`；即使启用了存储加密，该副本也是普通的明文 `.tar.gz`。

未初始化的位置在创建存档之前失败，并在下一步中记录失败的尝试。重新连接丢失的磁盘或检查存储桶和前缀，或仅在目标是新的时运行 `openclaw storage init <name>`。备份永远不会隐式初始化存储。保持加密密码和根位置标记可用于恢复。

| 选项                   | 含义                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------- |
| `--to <location>`        | 将经过验证的存档上传到已配置的初始化位置。                    |
| `--namespace <name>`     | 备份命名空间；默认为经过清理的主机名。                                 |
| `--claim-namespace`      | 故意用此安装的标识替换命名空间所有权声明。 |
| `--output <path>`        | 还要在路径或目标目录中保留本地存档。                  |
| `--no-include-workspace` | 省略工作区文件，同时保留状态、配置、凭据和代理数据库。 |
| `--only-config`          | 仅存档活动配置文件；存储配置必须仍然可读。    |
| `--keep-daily <n>`       | 在每个最新的 `n` 非空 UTC 天内保留最新的备份。                 |
| `--keep-weekly <n>`      | 在最新的 `n` 非空 UTC 的每一周中保留最新的备份。                |
| `--keep-monthly <n>`     | 在每个最新的 `n` 非空 UTC 月份中保留最新的备份。               |

命名空间包含 1–128 个字母、数字、点、下划线或连字符，并且不能是 `.` 或 `..`。对象位于 `backups/<namespace>/` 下，其键如 `20260930T120000Z-a1b2c3d4.tar.gz`：UTC 时间戳加上八个随机十六进制字符。启用存储加密后，文件名不会更改。为可以重命名的主机选择一个稳定的显式命名空间，并在列出、验证或从其他主机恢复时使用相同的命名空间。

第一次上传会使用安装的耐用网关设备 ID、主机名和声明时间创建 `backups/<namespace>/owner.json`。该声明使用该位置的加密设置。 OpenClaw 在存档之前、存档发布时以及每次保留删除之前检查声明是否与此安装匹配。具有不同设备 ID 的现有声明在归档之前拒绝运行，并记录命名所有者的失败尝试。相同的主机名不会授予共享所有权。

使用不同的 `--namespace` 进行单独安装。要故意接管已停止或停用的安装的命名空间（例如在迁移到新硬件后），请使用 `--to` 传递 `--claim-namespace`。这也取代了受损的所有权索赔：

```bash
openclaw backup create --to offsite --namespace gateway --claim-namespace
```

替换的安装在下次发布或删除时将被拒绝。对象存储无法使对象的写入以单独的所有权声明为条件，因此在最终检查和效果之间保留了剩余的提供者往返窗口。在接管之前停止旧的安装；对同时运行的安装使用单独的命名空间。

恢复的安装保留其设备标识并可以继续使用其命名空间。同时运行的克隆副本共享该标识，并且必须使用自己的 `--namespace` 以避免共享保留。

### <a id="offsite-retention"></a> 异地保留

保留在成功上传后运行，并且仅在选定的命名空间内应用于与具有有效 UTC 时间戳的 `<yyyymmddThhmmssZ>-<8 lowercase hex>.tar.gz` 匹配的密钥。其他对象和命名空间（包括 `owner.json` 声明）永远不会被删除。保留在修剪之前再次检查所有权。

这些策略形成一个联盟：由任何策略保留保留的备份。每个策略都会在其最近的非空日历存储桶中选择最新的备份；日从午夜 UTC 开始，周从星期一 UTC 开始，月份遵循 UTC 日历。错过的经期不会消耗桶。始终保留最新的备份，包括当每个提供的计数为零时。计数必须是非负整数。如果没有任何 `--keep-*` 标志，保留不会删除任何内容。

```bash
openclaw backup create --to offsite --namespace gateway --keep-daily 7 --keep-weekly 4 --keep-monthly 12
```

### <a id="list-and-verify-remote-archives"></a> 列出并验证远程档案

```bash
openclaw backup list --from offsite
openclaw backup list --from offsite --namespace gateway
openclaw backup list --from offsite --namespace gateway --json
openclaw backup verify --from offsite --namespace gateway latest
openclaw backup verify --from offsite --namespace gateway 20260930T120000Z-a1b2c3d4.tar.gz
```

`list` 需要 `--from <location>` 并接受 `--namespace <name>`。它首先列出最新的匹配备份密钥，以及明文和存储的大小。如果没有 `--namespace`，它还会列出 `backups/` 下的可用命名空间及其声明主机名，帮助您从另一台计算机找到备份。 `verify` 接受相同的选项以及列出的密钥或 `latest`，后者选择密钥中的最新时间戳。使用相对于命名空间的键，不带 `backups/<namespace>/` 前缀。远程验证下载并解密到托管暂存中，应用与本地文件相同的存档验证，并删除暂存副本。列出、验证和恢复远程档案在该位置是只读的；它们既不需要也不替换命名空间声明，包括在新机器上。

如果没有 `--from`，`verify` 和 `restore` 继续接受本地存档路径。

## <a id="restore-a-full-archive"></a> 恢复完整归档

将完整归档恢复到全新的暂存目录，而不触及活动状态目录：

```bash
openclaw backup restore <archive.tar.gz> --target <fresh-directory>
openclaw backup restore --from offsite --namespace gateway latest --target <fresh-directory>
```

对于 `--from <location>`，存档参数是列出的密钥或 `latest`。 `--namespace <name>` 默认为经过清理的主机名。该命令会在相同的本地验证和恢复流程之前将所选存档下载并解密到托管暂存中。

目标不得存在或必须是空目录，并且不能位于实时状态目录或任何配置的实时代理目录内。恢复在创建或写入目标之前验证存档及其 SQLite 数据库，拒绝非空目标，并在出现任何失败时删除不完整的提取。它永远不会恢复到位，并且没有 `--force` 模式。提取的布局保留存档根、清单和 `payload/` 路径，与存档中记录的完全相同。

<Warning>
  恢复档案就像时间旅行。具有棘轮状态的消息传递通道凭证（尤其是 WhatsApp）可能在回滚后不同步并需要重新链接。批准和 delivery/dedupe 状态也会回滚，因此请在恢复网关之前查看待批准的批准。插件 `node_modules` 树未存档；激活后，运行`openclaw plugins update <id>`或使用`openclaw plugins install <spec> --force`重新安装。生成的 `plugin-skills/` 符号链接索引也被省略；运行 `openclaw skills list` 或在激活后启动代理会话以从插件元数据重建它。
</Warning>

激活是一个单独的离线操作步骤。停止网关，将恢复的状态资产移动到位或将 `OPENCLAW_STATE_DIR` 指向该资产，然后在重新启动之前运行 `openclaw doctor`。使用 `manifest.json` 作为状态、配置、凭证、工作区和配置的代理路径的真实来源。将自定义代理根目录恢复到 `agentDir` 配置的位置，或在重新启动之前将这些设置更新到新位置。请参阅 [ 恢复完整存档 ](/install/backups#restore-a-full-archive) 以了解完整的灾难恢复序列。

## <a id="private-update-captures"></a> 私人更新捕获

托管的 `<stateDir>.update-captures/` 根目录不包括在普通存档、SQLite 快照、Git 备份中，并且支持导出。选择包含或嵌套工作区不会覆盖此规则。选择捕获文件作为配置或数据库备份源会拒绝备份。其他状态的捕获通过精确的同级布局来识别：`<owner>.update-captures/` 旁边的 `<owner>/`，具有现有的所有者目录，包括已解析的目录链接。不相关的类似命名的工作空间目录仍然包括在内；单独的后缀并不能确定所有权。

删除或重命名标记的私有目录的所有者，或者移动或复制标记的目录后，标记的私有目录仍会被排除。将标记保留在整个目录中。没有它复制出来的文件不会被此规则识别。修复后的 `.openclaw-private-update-capture` 文件恰好包含 `openclaw-private-update-capture-v1`，后跟换行符。导出检查使用 `lstat` 检查每个路径组件，并解析具有循环和深度限制的符号链接。已解析目标的真正祖先会收到与所选路径相同的标记检查。省略了标记目录的链接；格式错误或无法读取的真实标记会拒绝导出。循环和悬空链接没有解析的目标并保留链接条目，除非真正选定的祖先排除它们。普通的无标记链接保留其原始目标，而不通过链接复制目标内容。 Windows 目标分隔符存储为正斜杠。

显式内容导出，包括SQLite快照，通过相同的分类器检查所选的存档路径和实际内容源。支持包报告拒绝输入但不包含其内容。这些检查不会解析工作区清单或扫描其他状态根。

用于更新、数据库移植和 Git 备份的数据库发现检查已知的核心数据库路径和声明的插件数据库资源，包括禁用插件的保留存储。它不会遍历不相关的状态目录，例如历史修复备份。这些不相关的树中的权限错误不会阻止架构交叉；隐私和权限检查仍然适用于选定的数据库源。完整档案保留了更广泛的遍历和错误处理。

该标记是排除指令，而不是工件所有权或重新打开、采用或删除工件的许可的证明。生产者必须在原始数据之前持久地写入它，包括在每个独立可移动的暂存或捕获目录中。 Cleanup 必须保留它，直到私有内容消失。此排除不会创建捕获、更改保留或更改普通备份清理。

## <a id="sqlite-snapshots"></a> SQLite 快照

当您需要为一个 OpenClaw- 拥有的 SQLite 数据库而不是广泛的状态存档提供可移植工件时，请使用 `openclaw backup sqlite`。

该命令仅保留 SQLite-。 PostgreSQL 锚被拒绝并指导使用 `openclaw backup create`。通用本地快照提供程序在支持时使用匹配的格式 2 PostgreSQL 捕获；他们要求网关通过其服务所有者停止并在其运行时拒绝。他们不会将锚点变成空的 SQLite 快照。

快照创建只接受一个命名源。代理源始终使用当前配置的已解析 `<agentDir>/openclaw-agent.sqlite`，即使 `agentDir` 位于状态目录之外：

| 命令                                                         | 数据库               |
| --------------------------------------------------------------- | ---------------------- |
| `openclaw backup sqlite create --global --repository <dir>`     | OpenClaw 共享状态  |
| `openclaw backup sqlite create --agent <id> --repository <dir>` | 每个代理一个数据库 |

仓库中每个已提交的快照对应一个目录。每个快照目录都恰好包含：

- `manifest.json`
- `database.sqlite`

快照创建在读取实时数据库之前验证它，使用 SQLite 的在线备份 API 捕获已提交的 WAL 状态，而无需保留一个长读事务，关闭实时数据库，使用 `VACUUM` 压缩私有副本，再次验证生成的数据库，并发布完成的目录而不覆盖现有路径。全局快照会在压缩之前删除每个交付队列行，包括挂起的工作、失败的所有权围栏以及用于防止重复发送的完成收据或记录，因此有效负载详细信息和所有权逻辑删除都不会在空闲页面中发布或保留。因此，恢复这个经过清理的、可移植的快照并不是一次性交付延续边界。这是有意的隐私和无重放可移植性权衡。

不要将活动的 `.sqlite`、`-wal`、`-shm` 或 `-journal` 文件作为可移植工件进行复制。只复制已完成的快照目录。

当数据库包含冷记录时，快照创建会在检查文件大小和 SHA-256 后将每个引用的压缩存档嵌入到其专用数据库副本中，即使自动存档已禁用也是如此。完整存档和 Git 备份使用相同的冷负载捕获。恢复的数据库不需要原来的冷目录；源存档丢失或损坏导致备份创建失败。请参阅 [ 冷转录本备份 ](/install/backups#cold-transcript-backups)。

SQLite 快照可能包含身份验证配置文件、会话状态、插件状态以及其他敏感记录。请以与活动 OpenClaw 状态目录相同的权限、加密、保留策略和目标限制来保护仓库。

### <a id="verify-and-restore"></a> 验证和恢复

```bash
openclaw backup sqlite verify <snapshot-directory>
openclaw backup sqlite restore <snapshot-directory> --target <new-database-path>
```

验证检查严格的清单形状、工件大小以及 SHA-256、SQLite 完整性、外键、模式版本以及数据库角色和所有者。

可以验证和恢复受支持的旧架构版本的快照，而无需迁移。更新于支持的模式和不匹配的版本元数据将被拒绝。还原会保留快照字节，运行版本会在打开还原的数据库时执行任何所需的迁移。快照创建仍然需要当前架构并在压缩之前验证 OpenClaw- 拥有的表和索引定义。

验证会验证私有内容固定副本，因此路径名竞争无法交换 SQLite 检查的字节。默认情况下，该临时副本是在快照存储库旁边创建的，并在命令返回之前删除。登台根及其祖先链必须防止其他用户替换它。 POSIX 根必须是当前用户拥有的且 group/world 不可写；用户拥有的子代接受诸如 `/tmp` 之类的粘性祖先。 macOS ACL 公开或使分段可替换的授权被拒绝。 Windows 根和祖先必须由当前用户或受信任的 OS 主体拥有，并具有拒绝不受信任的暂存访问的 ACL。对于只读装载或网络共享，请在具有等效加密和目标控制的存储上传递 `--scratch <existing-private-directory>`。

快照创建会在暂存或发布数据库字节之前，对仓库应用相同的所有者、ACL、祖先和路径标识检查。新创建的目录边和最终发布元数据会通过共享的 `fs-safe` 持久性边界同步，之后才会在受支持的文件系统上报告成功。

恢复会重复验证，并且只写入一个新的目标位置。它会拒绝已存在的目标、`-wal`、`-shm` 或 `-journal` 伴随文件，并且绝不会对活动的 OpenClaw 数据库执行原地替换。目标父目录与验证 scratch 具有相同的路径安全要求。激活已恢复的数据库仍然是一个明确的离线运维步骤。

快照仓库是本地目录。调度、上传、保留、增量 WAL 包、故障切换以及启动时恢复行为都明确不属于此命令的范围。

## <a id="versioned-git-backups"></a> 带版本的 Git 备份

`openclaw backup git create --all` 还包括通过激活的插件声明的备份资源（包括 Workboard）发现的 PostgreSQL 存储。 `--global` 和 `--agent <id>` 保留其现有的源选择。对于 PostgreSQL 源，Git 备份路由捕获相同的经过清理的导出映像、锚点和 format-2 清单。在捕获或恢复之前通过其服务所有者停止网关；正在运行的网关被拒绝，永远不会自动停止。匹配的 PostgreSQL 恢复会验证工件并在发布其锚点之前加载新的拥有的命名空间。现有 SQLite Git 备份保留其格式和恢复行为。

对于 SQLite 源，`openclaw backup git` 将一致排序的每表 JSONL 转储存储在操作员拥有的普通 Git 存储库中。一个存储库可以保存共享数据库和每个代理数据库：

```text
global/manifest.json
global/schema.sql
global/tables/<table>.jsonl
agents/<agentId>/manifest.json
agents/<agentId>/schema.sql
agents/<agentId>/tables/<table>.jsonl
```

初始化存储库，然后捕获共享数据库、所有配置的代理数据库以及声明的 PostgreSQL 插件存储：

```bash
openclaw backup git init --repository ~/Backups/openclaw-git --remote <private-git-url>
openclaw backup git create --repository ~/Backups/openclaw-git --all --push
```

仓库根目录必须由当前用户拥有，且不能对组或所有人可写。OpenClaw 会在初始化或接管仓库时，以及每次创建前检查这一点。在 POSIX 系统上，确认所有权后，使用 `chmod 700 <repository>` 修复不安全的权限。

使用 OpenClaw 备份的专用存储库。在 `global/` 和 `agents/<agentId>/` 中，OpenClaw 仅管理由该范围的有效 schema-version-1 清单声明的 `manifest.json`、`schema.sql` 和 `tables/<table>.jsonl` 文件。刷新和陈旧代理清理会替换或删除这些工件，而不是整个目录。不相关的文档和文件系统元数据（例如 `.DS_Store`）保持不变，包括在备份范围或其 `tables/` 目录内。仅当目录为空时才会删除。

OpenClaw 在刷新或修剪之前检查所有选定的范围。现有文件会与不属于先前清单的新备份工件发生冲突，从而导致拒绝；托管目录路径中的非常规工件或符号链接也是如此。重试之前保留或移动冲突路径。这些检查还可以保护工作副本丢失的已提交或暂存文件。不相关的条目不会仅仅因为存在而阻止备份。在创建备份之前完成或中止任何正在进行的 Git 合并、变基、挑选或恢复；备份提交不得结束操作员的 Git 操作。

验证和恢复（包括旧引用）仅读取清单、架构和声明的表文件。额外的文件将被忽略，并且永远不会成为数据库内容。丢失或非常规声明的工件仍然会失败，无效的数据库身份、表哈希、行计数或 SQLite 完整性也是如此。恢复验证记录的受支持架构版本并保留它；他们在验证过程中不会迁移历史数据。需要时，代理索引定义会在私有暂存中规范地重建；这不会更改表数据或记录的模式版本。较新的不受支持的版本和不匹配的 ownership/version 标记仍然会失败。当当前运行时采用旧的恢复数据库时，运行 `openclaw doctor --fix`。历史全局表保留其记录的DDL；当前索引和列仅通过正常模式迁移应用，而不是通过 Git 备份验证应用。

使用 `--all`，只有从配置中删除的代理才会修剪其范围。如果配置的代理的数据库丢失或无法通过快照验证，则在备份其他代理的同时，其先前的备份范围保持不变。该命令在 CLI 警告、JSON `warnings` 和记录的备份结果中报告该代理已降级。如果该代理从未备份过，则不会创建任何范围。如果无法复制所选数据库，则显式 `--agent <id>` 选择仍然会失败，并且没有可复制数据库的运行会失败。

您还可以选择 `--global`、重复 `--agent <id>`，或将共享数据库与选定的代理组合。显式代理选择、`--all` 和计划备份从其配置的 `agentDir` 解析每个数据库；历史工件验证和恢复使用工件记录的代理 ID，而不要求该代理保留在当前配置中。快照创建使用与 `backup sqlite create` 相同的在线备份、清理程序、`VACUUM`、所有者验证和完整性检查；它从不直接读取实时 SQLite 文件。行和模式条目使用固定顺序，整数和 blob 使用无损编码。该命令创建一个名为 `openclaw backup <ISO8601>` 的提交。如果数据库内容未更改，则打印 `no changes` 并且不创建提交。

Git 提交仅包括刷新或修剪的备份工件。不相关的未跟踪文件和操作员暂存的更改保留在备份提交之外，即使在备份范围内也是如此。已经提交的无关文件保留在 Git 中；备份创建不会清除它们的历史记录或将它们从以后的树中删除。

`--push` 会将当前分支推送到 `origin`。本地提交成功后发生的推送失败属于警告，不会丢弃本地备份，也不会将其标记为失败。

<Warning>
  Git 历史是持久的。如果不使用 `--exclude-secrets`，快照会包含凭据材料，任何已推送的远程仓库都必须是私有的。

`src/state/secret-state-tables.ts` 是编辑的事实来源。在此版本中，`--exclude-secrets` 会省略这些共享状态表：

- `audit_identity_keys`
- `apns_registrations`
- `channel_ingress_events`
- `channel_pairing_requests`
- `clawhub_promotion_claims`
- `config_revision_keys`
- `device_auth_tokens`
- `device_bootstrap_tokens`
- `device_identities`
- `device_pairing_join_codes`
- `device_pairing_paired`
- `gateway_origin_device_tokens`
- `mcp_oauth_pending_authorizations`
- `mcp_oauth_stores`
- `native_hook_relay_bridges`
- `secret_store_entries`
- `web_push_subscriptions`
- `worker_environment_credentials`

它还忽略键以 `authProfiles.`、`nodeHost.` 或 `webPush.vapidKeys` 开头的 `config_machine_state` 行，同时保留其他机器状态行。

它会省略这些每个代理的表：

- `auth_profile_state`
- `auth_profile_store`
- `session_suggestions`

对于每个代理 `cache_entries` 中生成的插件模型目录（包括保留的迁移副本），它会删除提供程序和模型 API 键和标头，同时保留模型清单和不相关的缓存行。忽略不可用的生成缓存行，而不是导出未知的秘密。

备份清单在 `excludedTables` 中记录省略的表，并在 `excludedConfigStateKeyPrefixes` 中记录省略的机器状态前缀。恢复报告省略了表和机器状态前缀，因此经过编辑的快照不会被误认为是完整的凭证备份。
</Warning>

检查或验证历史记录，不改变活动数据库：

```bash
openclaw backup git log --repository ~/Backups/openclaw-git --limit 20
openclaw backup git verify --repository ~/Backups/openclaw-git --ref <commit> --global
openclaw backup git verify --repository ~/Backups/openclaw-git --ref <commit> --agent main
```

Git 历史记录输出必须适合 16 MiB 读取。如果日志请求报告输出限制错误，请使用较小的 `--limit` 重试。即使使用 `--limit 1`，过大的提交主题也可能超出限制；直接使用 Git 检查该历史记录。 OpenClaw 报告失败，但不返回部分历史记录条目。

验证会将选定的快照恢复到私有暂存空间，检查每个表的行数和 SHA-256，运行 `PRAGMA integrity_check` 和 `PRAGMA foreign_key_check`，然后移除暂存副本。恢复只会写入全新的目标，并拒绝已存在的 `-wal`、`-shm` 和 `-journal` 侧车文件：

```bash
openclaw backup git restore --repository ~/Backups/openclaw-git --ref <commit> --global --target ./restored/openclaw.sqlite
```

恢复会在加载其内容表后重建由内容支持的 FTS5 索引。它会有意省略派生的 `session_transcript_index_state` 投影，以便 Gateway 启动协调过程重建转录搜索。由于恢复进程中没有该扩展，`vec0` 虚拟表不会被实体化；内存索引会重新创建这些表，并安排完整重建索引。

Git 备份创建、恢复和验证流表数据，而不是在内存中保留完整的表转储。恢复仍然需要空间来存储具体化的 Git 文件和私有 SQLite 暂存副本；验证不会写入第二组表转储。

## <a id="schedule-backups"></a> 计划备份

为每种模式配置一个网关拥有的自动化。选择 `--to <location>` 进行异地存档，或选择 `--repository <path>` 进行 Git 数据库备份：

```bash
openclaw backup enable --to offsite --every 24h --keep-daily 7 --keep-weekly 4 --keep-monthly 12
openclaw backup enable --repository ~/Backups/openclaw-git --every 24h --push
```

当省略 `--every` 时，间隔默认为 `24h`。在创建或更新计划之前，显式为空或仅包含空白的间隔将被拒绝。

场外时间表接受 `--namespace <name>`、`--claim-namespace`、`--no-include-workspace` 和 `--keep-daily`、`--keep-weekly` 和 `--keep-monthly`。它们使用与 `backup create --to` 相同的存档、加密和 [ 保留规则 ](/cli/backup#offsite-retention)。该位置及其秘密必须可供网关进程访问。计划的场外运行没有保留本地存档。仅当显式传递给 `backup enable --to` 时，`--claim-namespace` 才会存储在调度的命令中；然后，每个计划的运行都可以接管命名空间。对于正常的所有权检查，请忽略它。当不再需要继续接管权限时，重新启用不带标志的计划。

对于 Git 计划，默认范围是每个数据库。使用 `--global-only` 或 `--agent <id>` 缩小范围，并添加 `--exclude-secrets` 以获取经过编辑的历史记录。默认情况下，推送计划 （`--push`） 会编辑包含凭证的表和带有秘密前缀的机器状态行，因为无人值守的重复推送会将它们持久地保留在远程历史记录中；通过 `--include-secrets` 进行显式全保真远程备份。从编辑的历史记录中恢复需要设备重新配对和提供商重新身份验证。 `--push` 还要求存储库已有 `origin` 远程。仅 Git 标志不能与 `--to` 组合。

重新运行 `backup enable` 会更新所选模式的作业，而不是创建副本。异地作业和 Git 作业可以共存。现有的 Git 作业保留其声明密钥 `openclaw-backup-scheduled`；异地作业使用 `openclaw-backup-offsite-scheduled`。

```bash
openclaw backup disable --offsite
openclaw backup disable --git
openclaw backup disable
```

`--offsite` 仅删除异地作业； `--git` 仅删除 Git 作业。省略选择器将删除两者。禁用已经丢失的作业是一个成功的空操作。启用和禁用需要本地网关，因为命令作业在网关主机上运行；对于远程网关，请使用 `openclaw cron add` 手动创建 cron 作业。

禁用计划会发现所有列表页面上的托管自动化，即使在重命名之后也是如此。具有相同名称的不相关自动化将保留在原处。

## <a id="recorded-runs-and-freshness"></a> 运行记录和新鲜度

每个真实的存档、SQLite 快照和 Git 创建尝试都会在现有共享状态数据库中记录一个紧凑的结果。外部工作也可以报告其结果。不记录试运行。该日志保留最新的 200 次尝试以及每种备份类型和目标的最新尝试和最新成功结果，包括异地备份的命名空间。频繁的行程并不能消除不常去的目标的最后一次尝试或最后的成功；历史仍然受到最近窗口和不同目标数量的限制。 Git 历史记录按存储库分组。没有指定目标的本地存档和 SQLite 快照共享其备份类型的有界历史记录组。

成功的异地结果包括位置名称、提供者、位置身份、密钥、命名空间、明文存档字节和存储字节。保留运行还记录 kept/deleted 计数。存储加密可以使存储的字节大于明文字节。失败的异地尝试还会记录他们尝试的命名空间。

`openclaw status` 显示最新的异地结果以及备份概述； `openclaw status --json` 包括记录的新鲜度。当没有记录成功的备份或最新的成功时间超过 14 天时，`openclaw doctor` 会打印信息提示。它还标记最新尝试失败或最新成功早于其间隔三倍的启用的异地计划，并将该位置和 `openclaw storage test <name>` 命名为下一个检查。场外运行状况与位置和计划的命名空间相匹配。没有命名空间的旧记录仍然可读，但无法满足命名空间计划。

网关 RPC `backup.status` 需要操作员读取范围。它返回整个保留分类账中每个备份类型、目标和异地命名空间的最新尝试和成功情况、配置的备份计划及其下次运行以及配置的存储位置。没有指定目标的本地存档和 SQLite 快照每种使用一个状态组，显示最新尝试的存档路径。列表配置不检查存储。系统登陆和网关主机视图上的 Control UI 的备份部分使用此状态，并通过 `storage.locations.probe` 为每个位置提供 **Check** 操作。 Doctor 使用相同的保留历史记录，因此每个目标的健康状况可以在其他工作的 200 多个新结果中幸存下来。

记录是尽力而为：记录写入失败会打印警告，但永远不会将成功的备份更改为失败的命令。记录使用现有的共享状态数据库；它不会创建丢失的数据库。空数据库或拥有错误所有权元数据的数据库将被拒绝，而不更改其字节。结果记录不会初始化或修复该数据库。当本地网关拥有状态目录时，命令通过具有操作员管理范围的 `backup.recordOutcome` RPC 提交结果。当网关停止时，记录将获得独占的本地所有权，直到写入完成。不可用、过时或未经身份验证的网关会产生警告；该命令从不直接重试写入或重放传递不确定的结果。

### <a id="record-external-backup-jobs"></a> 记录外部备份作业

在主机级备份作业（例如 Restic 计时器）之后使用 `backup record`，以将其结果包含在备份状态和 Doctor 新鲜度中：

```bash
openclaw backup record --status ok --target host-restic --bytes 1048576
openclaw backup record --status failed --target host-restic --error "Backup destination unavailable"
```

需要 `--status ok|failed` 和 `--target <label>`。 `--bytes <n>` 可选地记录非负整数字节计数； `--error <text>` 记录诊断。 `--json` 发出机器可读的结果。该命令使用与内置备份相同的尽力记录语义添加 `kind: "external"` 结果。它不运行或验证外部备份。使用稳定的目标标签并针对网关的状态目录运行它，以便连续的结果一起出现。

## <a id="what-gets-backed-up"></a> 备份内容

`openclaw backup create` 会根据你的本地 OpenClaw 安装来规划源：

- 状态目录（通常是 `~/.openclaw`）
- 活动配置文件路径
- 当 `credentials/` 目录存在于状态目录之外时，会使用解析后的该目录
- 每个配置的代理目录，包括状态目录之外的自定义 `agentDir` 根
- 从当前配置中发现的工作区目录，除非你传入 `--no-include-workspace`
- 由有效激活的可加载插件清单声明的持久资源

身份验证配置文件和其他每个代理运行时状态位于 `<agentDir>/openclaw-agent.sqlite` 中。默认代理根为 `<stateDir>/agents/<agentId>/agent`，但自定义根无论是在状态目录外部、工作区内部还是嵌套在可重新生成的托管状态根下，都保持权威。 `--no-include-workspace` 省略普通工作区源，而不是配置的代理目录。

`--only-config` 跳过状态、代理、凭据目录、工作区和插件资源发现，并仅存档活动配置文件路径。

OpenClaw首先从配置上规划资源。它在线捕获根 SQLite 数据库，然后从该私有快照中派生并冻结注册代理所有权，以进行数据库发现和存档遍历。在比较之前解析路径：已由另一个包含的根覆盖的配置、凭据、工作区和代理不会复制为顶级源。仅当没有现有资产覆盖时，自定义代理根才成为独特的 `agent` 资产；当另一个资产包含它时，清单仍然记录其代理 ID 和根。丢失的路径被报告为已跳过。

工作区可以包含状态目录，包括当工作区是您的主目录时。 `covered` 跳过意味着封闭的资源包含这些文件。同一代理数据库的重复注册会解析为一个实际所有者；共享同一个数据库的不同所有者仍然拒绝备份。这也适用于 `--no-include-workspace`。

旧版审计原始档案、进口索赔和清理日志被排除为原始文件；可恢复的审计源接收经过清理的备份替换。它们的 `.quarantined-*` 变体仍然被排除在外，并保留在本地，而不会被导入或重写。已清理的 `.migrated` 同伴和保留的 SQLite 审核历史记录仍包含在备份中。

在创建归档期间，OpenClaw 会在 `tar` 读取之前排除已知的实时变动路径。这样可以避免文件记录大小与并发写入之间的竞态。该过滤器会在每个已备份的状态目录下应用以下基于状态相对路径的规则：

| 状态相对范围                          | 跳过的条目                                       |
| --------------------------------------------- | ----------------------------------------------------- |
| `sessions/**`                                 | `.jsonl`, `.log`                                      |
| `agents/<agentId>/sessions/**`                | `.jsonl`, `.log`                                      |
| `cron/runs/**`                                | `.jsonl`, `.log`                                      |
| `logs/**`                                     | `.jsonl`, `.log`                                      |
| `delivery-queue/**`                           | `.json`, `.delivered`, `.tmp`                         |
| `session-delivery-queue/**`                   | `.json`, `.delivered`, `.tmp`                         |
| `browser/<profile>/user-data/`                | `SingletonCookie`, `SingletonLock`, `SingletonSocket` |
| `sandbox/skills-workspaces/**`                | 所有参赛作品                                           |
| 任何存档的根目录，包括代理工作区 | `.sock`、`.pid`、`.tmp` 和 `.tmp.*`                 |

即使其名称与临时文件名规则匹配，显式选择的资产根也会保留在其中。即使活动配置文件的名称或位置与上述规则匹配，该文件仍然包含在内。此异常仅保留选定的配置文件；排除目录下的相邻文件不会被归档。

临时文件名规则适用于所有选定的根，包括每个代理工作区。特定于状态的日志、队列和浏览器规则的范围仍限于状态。他们还省略了与表匹配的完整记录和日志文件，因此在需要时单独保留这些记录。 JSON 结果的 `skippedVolatileCount` 报告故意省略了易失性条目，每个条目都列在 `skipped` 中，原因为 `volatile`；可再生代理临时根单独列出，不包含在该计数中。

如果某个条目在遍历过程中或在打开之前消失，则存档将继续保存幸存的条目。每个省略的路径都出现在结果的 `skipped` 列表中，原因为 `vanished`，以及结果的 `warnings` 和文本摘要中。所需的源根和分阶段捕获必须仍然存在；权限和 I/O 错误仍然无法存档。可能将读取重定向到选定根之外的更改也会失败。文件在写入存档头之前打开，因此消失的文件不能留下部分条目。

Chromium 单例条目协调一台主机上正在运行的浏览器，并在该配置文件启动时重新创建；配置文件 `user-data/` 的其余部分保留在存档中。沙箱技能工作区是当前技能源的生成副本，并在 OpenClaw 恢复后准备下一个沙箱上下文时再次具体化；相邻的沙箱注册表和其他持久状态仍然包括在内。

托管 SQLite 快照涵盖共享 OpenClaw 数据库、隔离和完整性验证存储以及由配置声明、记录在捕获的持久代理注册表中或在 `<stateDir>/agents/<agentId>/agent/openclaw-agent.sqlite` 中发现的每个代理数据库。这包括配置的自定义 `agentDir` 位置以及代理移动或从配置中删除后保留在默认位置的数据库。属于同一代理的不同数据库被单独捕获。 `--no-include-workspace` 保留此数据库覆盖范围。

已激活插件声明的 `backupResources` 和 `disposition: "include"` 下的数据库文件也会接收托管快照。 Workboard 以这种方式声明其现有存储，因此其 PostgreSQL 锚点选择匹配的 PostgreSQL 捕获，而不是仅锚点副本。状态目录下的其他文件名或单独的代理目录下的其他文件名不会建立数据库所有权。

托管 SQLite 数据库通过 SQLite 的在线备份 API 捕获，并通过 `VACUUM` 离线压缩。包含已提交的预写日志 （WAL） 更改，删除已删除的页面残余，并省略 sidecar。共享数据库和代理数据库也会接收其现有的瞬态清理，并且必须与其预期角色和代理所有者相匹配。不安全的别名或所有者不匹配会停止备份。需要不可用的 SQLite 功能的已声明插件数据库也会停止备份，而不是回退到直接文件副本。

状态和配置的代理根下的其他 SQLite 文件（包括其 sidecar）被复制为不透明字节。创建报告 `warnings` 中的每个文件名以及 `opaque` 标签。超出链接分辨率限制 （`ELOOP`） 的非托管 SQLite 符号链接（包括循环）将被跳过，并显示命名该链接的警告。其他链接保留其现有的处理方式。验证和恢复会保留这些字节，而无需打开、压缩或验证数据库。这些副本没有实时数据库一致性或已删除数据删除保证。当您需要这些保证时，请使用所属应用程序的备份过程。

到托管 SQLite 数据库的硬链接共享一个捕获的图像，该图像存储为每个名称的单独常规存档条目。每个硬链接必须是核心清单或声明的插件备份资源拥有的包含的 SQLite 文件。如果恰好一个名称具有非空预写日志 （WAL），则该名称提供已提交的数据。仍然支持没有非空 WAL 的封闭数据库。多个非空 WAL、非空回滚日志或备份清单外部的硬链接会导致明确拒绝且没有存档。彻底关闭数据库编写器，并在重试之前包含这些资源中的每个硬链接。捕获期间对共享数据库文件的更改也会拒绝备份，包括在日志检查重复之前截断其 WAL 的并发别名检查点。标准 OpenClaw 数据库别名保留其现有所有者验证和清理。

状态目录中 `extensions/` 树下已安装插件的源文件和清单文件会被包含，但其嵌套的 `node_modules/` 依赖树会被跳过，因为这些属于可重新构建的安装产物。恢复归档后，如果某个已恢复的插件报告缺少依赖，请使用 `openclaw plugins update <id>`，或使用 `openclaw plugins install <spec> --force` 重新安装。

状态目录的 `plugin-skills/` 根是生成的、OpenClaw- 拥有的符号链接索引，不是权威状态。备份创建会报告并忽略该根目录，因为其绝对目标特定于源安装。激活恢复状态后，运行 `openclaw skills list` 或启动代理会话以从当前插件元数据重建链接。

`agents/<agentId>/agent/**/{tmp,.tmp}/` 下的代理范围临时树也被省略并报告为可再生。这包括代理目录正下方的临时文件和代理运行时目录中的临时树；持久的同级目录仍然包括在内。嵌套在省略的临时根目录下的显式配置的配置文件、凭据目录或工作区仍然包括在内。

符号链接被归档为链接条目，包括绝对目标和悬挂目标。Windows目标分隔符存储为正斜杠以匹配 tar 的阅读器；POSIX目标文本（包括文字反斜杠）将被保留。创建永远不会跟随链接来复制其目标。状态目录之外的目标，包括单独备份的配置、凭据或工作区目标，记录在清单中并JSON结果`externalSymbolicLinks`列出并在文本摘要中报告。恢复在提取文件内容后重新创建链接；它永远不会通过恢复的链接写入。验证拒绝嵌套在符号链接下的存档条目。

绝对链接在恢复后保留其原始位置，包括指向单独备份的配置或凭据的链接。它们不再被重写为相对目标。在另一台主机或另一条路径上激活恢复的树之前，请查看这些链接。旧版本（包括 v2026.9.4）拒绝具有绝对或转义链接目标的存档；使用当前版本来恢复这些档案。现有档案仍然可读。

状态目录下的安装程序管理和可重建运行时根目录也会被跳过：`dev/`、`git/`、`npm/`、旧版 `npm-runtime/`、`tmp/` 和 `tools/`。其中包含托管签出、包树、编译器缓存、临时文件和下载的运行时，而不是权威的用户状态；恢复后重新安装或更新相应的运行时或插件。有效激活的可加载插件可以通过 [`backupResources`](/plugins/manifest/surfaces#backupresources-reference) 声明额外的持久或可再生的状态或代理相关根。禁用或可卸载的插件无法排除数据。显式配置、凭据、工作区、代理和插件包含的路径会覆盖排除，并且任何排除的父级仍然可遍历以到达那些受保护的后代。 `tmp` 和 `.tmp` 等名称不是自定义代理目录中的全面排除项；只有适用的所有者声明才能忽略其耐用的兄弟姐妹。

受管理的 `dev/` 检出内容中的本地修改属于开发者源代码，而不是 OpenClaw 产品状态，因此不会被包含。依赖状态备份之前，请提交并推送这些修改，或单独复制该检出内容。

## <a id="invalid-config-behavior"></a> 无效配置行为

`openclaw backup` 绕过正常的配置预检，因此它仍然可以在恢复期间提供帮助。状态档案需要解析代理和插件所有权。如果发现失败，`backup create` 会报告底层错误并拒绝发布存档。 `--no-include-workspace` 排除工作区文件；它不会绕过所有权发现。

Discovery 通过在线 SQLite 快照读取共享状态，因此并发编写器不会使有效配置显得无效。如果无法读取状态，请解决报告的错误并重试备份。

当地的`--only-config`当配置格式错误或状态发现失败时仍然有效。它保存了活动JSON单独配置文件，而不解析它或包含它的依赖项。上传它`--to`另外需要可读的存储配置。

## <a id="size-and-performance"></a> 大小和性能

OpenClaw 不强制内置的最大备份大小或单个文件大小限制。若归档写入连续五分钟没有产生任何数据，则会失败并删除其部分临时文件，而不会无限期挂起。除此之外，实际限制来自于：

- 用于临时归档写入以及最终归档的可用空间
- 遍历大型工作区树并将其压缩为 `.tar.gz` 所需的时间
- 使用 `--verify` 或 `openclaw backup verify` 重新扫描归档所需的时间
- 目标文件系统行为：OpenClaw 需要使用无覆盖的硬链接发布，因此最终归档路径绝不会暴露正在进行中的副本；不受支持的文件系统会报错并给出可操作的错误信息

使用 Ctrl-C 或中断存档创建SIGTERM停止遍历和压缩，关闭归档写入器，并在命令退出之前清理其拥有的部分归档和暂存。现有存档和备份源文件保持不变。保留已发布到所请求的本地目标的存档；承认的验证和尽力结果记录在信号退出之前完成。

如果在发布后进行的最终目录持久性确认失败，命令会报告失败，但会保留完整的最终条目，而不是冒险删除一个并发替换项。

大型工作空间通常是档案大小的主要驱动因素。使用 `--no-include-workspace` 进行 smaller/faster 备份，或使用 `--only-config` 进行最小存档。

存档创建为其临时 `openclaw-backup-owned-*` 临时目录保留 SQLite 生命周期事务。仅在获得独占监护权后，下一次备份运行才会删除废弃的划痕；正在运行的备份即使是旧的也能保留其痕迹。清理失败会保留已发布的存档，并在文本和 JSON 输出中显示为带有暂存路径的警告。拥有的前缀还可以让清理在其令牌存在之前与新的创建者进行协调，而不会将该分配误认为是遗留的暂存。如果在创建者声明其目录之前清理成功，则使用新目录重试创建。更改的目录标识仍然被拒绝。扫描中观察到的在清理之前消失的划痕被记录为已回收，没有警告或声称此遍将其删除。

`openclaw doctor` 报告活动临时目录和记录的存档目标目录中的暂存情况。当不存在备份账本时，记录位置发现不会返回目录，也不会创建状态。当没有划痕需要报告时，检查会保持安静。 `openclaw doctor --fix` 删除已识别的生命周期事务已结束的划痕。未知内容、符号链接和没有生命周期令牌的遗留目录将被保留并提供检查指导。较旧的版本不会创建这些令牌，因此请在手动删除其报告的临时目录之前停止较旧的备份进程。已发布的存档和包回滚备份不在此清理范围内。退役的暂存在删除之前被重命名为 `openclaw-backup-retired-*`，因此即使在生命周期令牌消失后，后续的传递也可以完成部分清理。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [迁移 OpenClaw 安装](/install/migrating)
- [恢复完整归档](/install/backups#restore-a-full-archive)
- [存储位置](/concepts/storage-locations)
- [存储 CLI](/cli/storage)
