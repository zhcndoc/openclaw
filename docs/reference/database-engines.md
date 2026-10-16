---
summary: "选择实验性PostgreSQL存储，了解SQLite锚点，并观察数据库工作"
read_when:
  - "为网关配置 PostgreSQL"
  - "备份 PostgreSQL 存储及其 SQLite 锚点"
  - "计算数据库语句或工作请求"
title: "数据库引擎（实验性）"
doc-schema-version: 1
---

OpenClaw 默认使用 SQLite。实验性 PostgreSQL 适配器允许一个网关将受支持的存储保留在 PostgreSQL 中，而其他存储保留在 SQLite 中。适配器拥有连接设置、模式准入、事务行为和提交通知；商店保留现有数据和运营合同。

守护进程运行时引脚在每个引擎上都保留在本地，位于 `<state-root>/control/services.sqlite` 中。守护程序所有者向 macOS 应用程序提供类型化的运行时意图，而不需要正在运行的网关或 PostgreSQL 连接。共享状态引擎选择不会移动此存储。没有以 PostgreSQL 共享状态存储运行时引脚的版本，因此 PostgreSQL 安装没有要迁移的旧引脚源。

## <a id="configure-postgresql"></a> 配置PostgreSQL

使用 PostgreSQL 数据库和可以创建架构和表的角色。需要 PostgreSQL 16 或更新版本以及 UTF8 服务器和客户端编码；每个实体店负载都会被准入检查一次。引擎未安装任何扩展。将其连接DSN放在秘密中，然后配置一个SecretRef：

```json5
{
  database: {
    engine: "postgres",
    postgres: {
      connection: { source: "env", provider: "default", id: "OPENCLAW_DATABASE_DSN" },
      schemaPrefix: "openclaw",
    },
  },
}
```

通过您的秘密管理器在网关环境中提供 `OPENCLAW_DATABASE_DSN`。这是此示例引用的秘密，而不是引擎选择环境变量。还支持 [ 文件和执行引用 ](/gateway/secrets/secretref-contract)。存储支持的引用被拒绝，因为解析它们需要此连接必须打开的共享数据库。使用 env、file 或 exec SecretRef 代替； `openclaw doctor` 报告无效的连接引用。主机解析秘密并将连接传递给数据库工作人员；工人没有解决SecretRefs。将 DSN 视为凭证，不要将其放入日志或诊断捕获中。

更改引擎后重新启动网关，然后运行 ​​`openclaw doctor` 以查看每个商店选择的引擎。 Doctor 警告说，PostgreSQL 是实验性的，没有 PostgreSQL 架构的商店仍保留在 SQLite 上。

| 字段                            | 默认值      | 含义                                                                                                                                                          |
| -------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `database.engine`                | `"sqlite"`   | `"sqlite"` 或 `"postgres"`。 PostgreSQL 适用于提供 PostgreSQL 架构的每个注册商店。                                                      |
| `database.postgres.connection`   | 无         | PostgreSQL 需要。 DSN 字符串或 env/file/exec SecretRef；商店支持的引用被拒绝。                                                                |
| `database.postgres.schemaPrefix` | `"openclaw"` | 新商店架构的前缀：1-27 个小写字母、数字或下划线，以字母或下划线开头。现有锚点保留其记录的模式。 |

共享状态、工作板、日志和团队报告当前支持 PostgreSQL。网关在第一次共享状态读取之前解析所选引擎，并在进程的生命周期内保留该不可变的选择。读者、作家和租赁工作者明确收到已解决的选择；他们再也不会解决连接问题。同一过程中的不同选择将被拒绝。更改连接或引擎后重新启动该过程。

这是实验门背后的中间状态：代理数据库（包括会话记录和代理内存）仍然使用 SQLite，就像其他不支持 PostgreSQL 的存储一样。隐身存储仅保留内存。支持的 PostgreSQL 系列包括：

- **共享状态：**运行时存储新鲜状态目录。移植现有共享状态数据库尚不可用。
- **Workboard：**运行时存储、双向数据库端口和匹配的备份。
- **日志：**运行时框架、批次、观察、卡片和站立；双向数据库端口；以及匹配的备份。 `logbook/frames` 下的帧图像仍然是本地文件伪影。端口保留其存储的路径并将文件保留在原处。备份包括该目录以及数据库导出和锚点；恢复或移动安装时保留它。
- **团队报告：**保存的报告、人日计数和运行历史记录；双向数据库端口；以及匹配的备份。收集的活动是会话本地临时数据，不会导出或备份。

当 PostgreSQL 连接或准入失败时，受支持的存储绝不会默默地回退到 SQLite。

Doctor可以在PostgreSQL上获得离线维护托管并运行纯数据状态迁移。实时或无法验证的网关所有者仍然会阻止维护；状态写入使用现有的 PostgreSQL 写入器咨询锁。在 PostgreSQL 状态系列备份支持可用之前，状态模式迁移将保持阻止状态。保留当前数据库并使用支持这些备份的版本重试。

使用 `openclaw database port` 在引擎之间移动现有支持的数据。单独更改 `database.engine` 不会迁移现有数据。省略 `database` 将保留 SQLite 默认值，因此普通更新不需要配置或数据迁移。

现有的 SQLite 共享状态拒绝 PostgreSQL 选择并将 `openclaw database port` 命名为迁移路径。端口命令当前处理工作板、日志和团队报告；共享状态移植尚不可用。保留 SQLite 上的现有安装，直到支持落地，或使用新的状态目录来实现实验性 PostgreSQL 共享状态。不要删除现有数据来切换引擎。

## <a id="search-on-postgresql"></a> 在 PostgreSQL 上搜索

实验性引擎搜索合约支持原生 PostgreSQL 全文、文字三元组包含和精确余弦搜索。这是引擎级的支持；代理内存和会话记录物理存储仍然遵循上面的支持矩阵。它不会为未移植的存储启用 PostgreSQL。

对于声明搜索索引的商店，请在打开数据库之前在数据库中安装这些扩展。默认扩展命名空间是 `public`：

```sql
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
```

全文需要 `unaccent`，声明的三元组索引需要 `pg_trgm`，语义搜索需要 `vector`。扩展是数据库范围的；当存储的架构声明与 `public` 不同时，会标识其名称空间。引擎在进入商店时检查可用性和特权。它永远不会自动安装扩展。不可用的能力拒绝准入，其分机名称和运营商为SQL；它不会返回空搜索结果或切换存储引擎。扩展安装可能需要数据库管理员。运行时角色在存储模式中需要 `CREATE`，或者在引导新模式时需要数据库 `CREATE` 权限，以及其表、索引、函数和文本搜索配置中的 ownership/access。

现有的显式仅关键字内存设置为 `memory.search.provider: "none"`（或相应的特定于代理的覆盖）。在代理存储切换期间，内存所有者将该设置映射到仅关键字引擎架构，该架构不需要 pgvector 扩展，并且不公开任何向量功能。仅禁用本机向量索引不是 PostgreSQL JavaScript-scan 后备措施。嵌入提供程序故障不会默默地授权仅关键字 PostgreSQL 准入。

全文使用名为 `simple` 加上 `unaccent` 配置、存储生成的 `tsvector` 和 GIN。查询绑定字面术语并编译连词、析取词、相邻短语和最终词位前缀。用户文本永远不会被解释为 PostgreSQL 查询运算符。排名使用 `ts_rank_cd` 和归一化 2：分数是引擎本地的，越高越好，并且排序与 SQLite BM25 不同。标点符号、复合词和 Unicode 的标记化也有所不同。仅在具体化、有界的候选选择之后，片段才使用 `ts_headline`，字数预算为 2-48，字符上限为 500，并且突出显示标记为空。 Trigram 包含使用自己的 GIN 索引和转义文字 `ILIKE`；它不是全文查询的通用后备方案。

语义搜索使用精确的 float32 `vector(n)` 余弦距离，在排序和限制之前在同一查询中具有模型和源资格。规范嵌入保留其原始的小端二进制64 BLOB；源事务触发器维护派生的 float32 投影。精确向量支持多达 16,000 个维度。维度更改需要匹配的架构和派生索引重建。没有 ANN、HNSW、IVFFlat、半精度存储，也没有将 PostgreSQL 语料库传输到 JavaScript 进行每次查询评分。

生成的列、GIN 索引、向量投影表、触发器函数和命名文本搜索映射参与存储的精确模式漂移指纹。重建在拥有写入者事务下运行。 PostgreSQL 搜索仍处于试验阶段，产品流一致性和代理存储切换已完成。

托管服务文档列出了 Amazon、RDS、Google 云 SQL、Neon 和 Supabase 的 pgvector，但这不是租户可用性保证。 RDS 支持取决于实例补丁和扩展版本；云SQL版本因PostgreSQL专业而异； Neon 需要每个数据库的启用和版本验证； Supabase 的设置指南不保证数字版本。验证实际数据库所需的所有扩展和权限。

## <a id="port-existing-stores"></a> Port现有门店

首先通过通常管理网关的服务所有者停止网关，并使用相同的状态目录停止嵌入式代理。该命令拒绝实时所有者，并且永远不会为您停止或重新启动服务。在移植到 PostgreSQL 之前配置 `database.postgres.connection`，保持当前 `database.engine` 不变，直到命令切换它。

```bash
openclaw database port --to postgres --dry-run
openclaw database port --to postgres
```

端口、备份、恢复和指纹操作共享一个数据库系列提供程序注册表。每个提供者解析其存储并提供生成的模式描述符和预期的 PostgreSQL 目录。 **Workboard、日志和团队报告是注册系列。** 状态、代理和 Matrix-root 支持尚未通过此注册表启用。一位无法识别的 PostgreSQL 主播拒绝了该操作，并列出了受资助家庭的名字。对于单独安装的插件（例如团队报告），操作会加载所选安装插件的架构和准入 API。保持安装匹配的插件以进行端口、备份和恢复。预检不需要缺少可选插件。

该命令会清点所有现有已注册的工作板、日志和团队报告存储，包括禁用的插件存储。它不会创建丢失的存储或端口共享状态、代理数据库或安全日志。试运行会检查只读先决条件并报告仍需要私有迁移、复制或 PostgreSQL 权限探测的检查。它不创建清单、迁移的副本或目标命名空间。添加 `--json` 以获得机器可读的结果，无需连接字符串或行负载。

实际操作在 `<stateDir>/recovery/database-port/<operation-id>/` 下保留了准确的原始数据库和配置捕获。 SQLite 原始文件是经过验证的快照，并解决了 WAL 更改。 PostgreSQL 原件包括匹配的锚点和精确的 SQLite 导出；这些捕获保留当前行，无需用户备份清理程序。配置捕获包括根文件及其包含内容。保持此目录私有并保留完整的目录。以前的 PostgreSQL 命名空间不会自动删除。

所有目标商店在发布前均经过私下迁移和验证。该命令以原子方式替换每个存储，最后切换配置，同时保留 SecretRefs、环境引用和包含，然后使用捕获来归档其完整的清单。成功后，通过其服务所有者启动网关。

中断的操作使启动被 `<stateDir>/recovery/database-port/manifest.json` 阻止。保持网关停止并通过以下方式之一使用该活动清单：

```bash
openclaw database port --resume <stateDir>/recovery/database-port/manifest.json
openclaw database port --rollback <stateDir>/recovery/database-port/manifest.json
```

恢复重新验证捕获的证据并完成中断的操作。回滚可恢复整个原始存储和配置集。这些选项是互斥的，不能与 `--to` 或 `--dry-run` 组合。运行时恢复后，已完成的存档清单不是撤消命令。

要返回 SQLite 且不丢失成功端口后接受的写入，请停止网关并运行新的反向端口：

```bash
openclaw database port --to sqlite --dry-run
openclaw database port --to sqlite
```

在通过原始包管理器（例如 npm、pnpm 或 Homebrew）降级之前进行反向端口：这些路径绕过 `openclaw update` 引擎兼容性检查。旧的 SQLite 捕获是历史记录，不包含后来的 PostgreSQL 写入。请参阅 [CLI 参考 ](/cli#database)。

## <a id="several-gateways-on-one-postgresql-server"></a> 一台 PostgreSQL 服务器上的多个网关

多个独立安装可以共享一台 PostgreSQL 服务器。每个安装都必须有自己的状态目录和一个网关。不支持跨网关共享一个安装，包括故障转移和主动-主动操作：每个商店都有一个实时所有者。

### <a id="recommended%3A-one-database-per-gateway"></a><a id="recommended-one-database-per-gateway"></a> 推荐：每个网关一个数据库

为每个网关使用单独的 PostgreSQL 数据库和连接 DSN。这提供了安装之间最强的隔离。在 **each 数据库** 中安装所需的搜索扩展，如 [Search on PostgreSQL](#search-on-postgresql) 中所述；一个数据库中安装的扩展在另一数据库中不可用。每个安装都可以使用默认的 `database.postgres.schemaPrefix`，因为它们的数据库是独立的。

数据库管理员创建数据库并可能需要安装扩展。运行时角色需要 `CONNECT` 和数据库 `CREATE` 权限来引导其存储模式，以及其存储对象的 ownership/access 和扩展模式上的 `USAGE`。

### <a id="one-database-with-separate-namespaces"></a> 具有独立命名空间的一个数据库

为每个网关指定一个不同的 `database.postgres.schemaPrefix`，例如 `installation_a` 和 `installation_b`。每个商店都有一个单独的锚点 UUID 和命名空间；它的写入器咨询锁使用 UUID。保留每个本地锚点及其匹配的 PostgreSQL 命名空间。将一个安装的锚点与另一个安装的命名空间配对会拒绝准入。更改配置的前缀不会移动现有锚点。

在共享数据库的 `public` 架构（或显式声明的扩展架构）中安装一次 `unaccent`、`pg_trgm` 和 `vector`。所有安装都重用这些扩展；准入会检查它们并且永远不会重新创建它们。文本搜索配置是模式限定的，生成的列、索引、向量投影和函数属于每个存储名称空间。

运行时角色需要共享数据库上的 `CONNECT` 和引导命名空间的数据库 `CREATE` 权限，以及其存储对象的 ownership/access 和扩展架构上的 `USAGE` 权限。当安装还需要 PostgreSQL 权限边界时，使用单独的角色和模式授予；模式前缀本身并不限制角色的访问。

## <a id="isolation-and-durability"></a> 隔离和耐用

每个商店均由一个网关拥有。 PostgreSQL 不支持一个存储的多个活动所有者、外部写入器、复制管理或连接池管理。

编写者使用 `READ COMMITTED` 和从存储身份派生的事务范围的咨询锁。每个 PostgreSQL 写入（包括单个语句）都使用适配器的 `runTransaction`，因此它保留该锁并发布其写入令牌。单语句读取可以使用自动提交；多语句快照读取使用`REPEATABLE READ READ ONLY`。连接设置 `synchronous_commit=off` 以将 SQLite WAL 与 `synchronous=NORMAL` 匹配：服务器或操作系统崩溃可能会丢失最近确认的提交。备份和恢复必须考虑持久性策略。适配器在连接设置期间设置一次慷慨的锁和语句超时；操作不会单独更改超时设置。

## <a id="anchors-and-backups"></a> 锚和备份

PostgreSQL 存储在其通常的本地数据库路径中保留一个小的 SQLite 锚点。锚记录存储 UUID、引擎和 PostgreSQL 架构。新模式使用 `<schemaPrefix>_<store>_<uuid-prefix>`；移动锚可以保留身份。 PostgreSQL 架构元数据必须与锚点的存储 UUID 和预期架构版本匹配。每个实体商店每个进程负载都会运行一次准入检查，并且工作人员和处理者会重复使用已承认的事实。已确认的提交和不确定的提交结果会使通过锚点的写入令牌缓存的存储事实失效。

PostgreSQL 目录准入通过一次一致读取从服务器捕获列类型、可为空性、精确默认值、键、CHECK 表达式、索引定义（包括部分谓词）以及触发器定义和函数体。引导和迁移记录这些 PostgreSQL- 解析事实的指纹、为活动模式生成的 DDL 的哈希值以及服务器主要版本。 Startup 将实时指纹和构建的 DDL 哈希值与该记录进行比较。不匹配会拒绝接纳并指定恢复步骤。在服务器主要升级之后，准入会将实时目录与临时命名空间中生成的 DDL 进行比较，删除该命名空间，并仅在匹配时记录新指纹。未密封的 pilot/ported 商店会收到相同的一次性比较。这些事实与主播的 SQLite 目录是分开的。普通数据提交保留模式准入；模式所有者在提交 DDL 后发布替换事实。可选的 SQLite WAL、检查点和页面回收工作不适用于 PostgreSQL。使用 PostgreSQL 恢复指令拒绝显式 SQLite 完整性、修复和文件快照请求。

运行时 PostgreSQL 查询在工作线程中运行。物理打开和引导迁移代码可以使用`openclaw/plugin-sdk/database-engine-worker-runtime`中的同步`withEngineStoreAdmission`范围；在该范围结束后保留​​连接不会授权主线程查询。回调必须保持同步。关闭仍可用于结算资源。商店所有者向 `openEngineStore` 提供 `inspectSqlite(): { hasExistingData, hasEngineAnchor }`，因此部分初始化的商店也可以免受意外引擎切换的影响。请参阅规范的 [`admission scope`](https://github.com/openclaw/openclaw/blob/main/src/infra/database-engine/admission-scope.ts) 和 [`engine opener`](https://github.com/openclaw/openclaw/blob/main/src/infra/database-engine/open.ts)。

使用 `openclaw backup create` 捕获 PostgreSQL 存储以及仍保留安装其余部分的 SQLite 存储。 PostgreSQL 备份需要停止网关。如果它正在运行，该命令会拒绝：“通过服务所有者停止，然后重新运行。”它永远不会自动停止网关。当所选源为 PostgreSQL 时，此要求也适用于通用本地快照和 Git 备份。 `openclaw backup sqlite` 拒绝 PostgreSQL 锚并将您引导至 `openclaw backup create`。

PostgreSQL 备份包含便携式 SQLite 导出映像、原始锚点和 format-2 清单。导出读取一个 `REPEATABLE READ READ ONLY` 快照，然后在压缩和散列之前应用现有的用户备份清理程序。清单记录备份配置文件、引擎、存储 UUID、架构版本、活动片段、分配事实、工件大小和哈希值。它从不记录连接 DSN。活动的可选片段来自源目录，而不是来自启用的插件配置；缺少必需的片段依赖项会拒绝复制。恢复重新接纳相同的片段集。规范触发器在加载行后安装，而声明的派生投影在验证之前由其所有者复制和重建。未知的触发器和视图拒绝该操作。所有者只能在操作的私有副本中迁移较旧的 SQLite 源；原始捕获保持不变。

保留完整的匹配集：单独的锚点不包含 PostgreSQL 行。现有格式 1 SQLite 备份仍然可读。

PostgreSQL 恢复验证匹配集，加载新拥有的命名空间，并仅在验证后发布其匹配锚点。保留被替换的命名空间，直到确认恢复为止。用户备份遵循通常的清理和凭据排除策略；它们不是精确的更新程序恢复捕获。请参阅 [Backups](/install/backups) 和 [Backup CLI](/cli/backup)。

## <a id="updates-and-target-compatibility"></a> 更新和目标兼容性

更新保留每个商店的物理引擎。在数据库突变之前，安装的更新程序会捕获 PostgreSQL 行及其匹配锚点而不进行清理，以及现有的精确 SQLite 捕获。恢复将 PostgreSQL 恢复到新拥有的命名空间中并发布其匹配的锚点；在确认恢复之前，迁移的命名空间仍然可用。更改的状态或不确定的保管会阻止自动恢复并保留捕获以供恢复。更新永远不会默默地移植存储或回退到 SQLite。

发布包在 `package.json`（紧邻 `openclaw.updateAdmissionProtocol`）的可选 `openclaw.databaseEngines` 数组中声明支持的引擎。不存在的数组表示 `["sqlite"]`；准入协议仍为 `1`。仅具有非 SQLite 物理存储的安装才使用此附加检查。没有 `postgres` 的目标在突变之前会被拒绝，补救措施是：使用当前兼容的二进制文件反向移植到 SQLite，或者保留当前版本。 SQLite-only 安装保留其现有的准入行为。安装的驱动程序拥有此检查；候选人无法修理较旧的驱动程序。参见[更新入场](/cli/update#candidate-owned-admission)。

## <a id="limits-and-recovery"></a> 限制和恢复

启动会在 CLI 配置快照之前检查选定状态目录下的固定 `recovery/database-port/manifest.json`，并在获得新的网关或嵌入式编写器托管之后再次检查。缺少清单或有效的完整清单允许启动。不完整、不可读、格式错误或未知的清单会拒绝启动并识别恢复工件。这些检查不会打开数据库。保持清单及其捕获的原件完好无损，然后使用 `openclaw database port --resume <manifest>` 或 `--rollback <manifest>`。

新鲜商店从当前商店架构版本生成的 PostgreSQL DDL 引导。较旧的存储在 PostgreSQL 编写器事务和咨询锁下运行所有​​者提供的连续前向迁移。失败会回滚待处理的步骤及其元数据；承认的事实只有在提交后才会发布。每个步骤都会将其结果与临时命名空间中生成的目标 DDL 进行比较，然后记录 DDL 哈希值和实时目录指纹。失踪的迁徙者将被拒绝入境。较新的商店需要兼容的二进制文件，或者在降级之前具有兼容的二进制文件的反向端口。切勿编辑架构元数据来绕过准入。

生成的共享状态 `state.postgres.sql` 和 `fragment-*.postgres.sql` 文件仅包含运行时 DDL。他们的调用者提供交易和 `search_path`；不会生成第二个打包副本。对于手动就绪检查，请参阅 [ 应用生成的状态 DDL](/reference/database-schemas/storage-changes#shared-state-postgresql-schema-generation)。生成的代理 DDL 同样将交易和搜索路径留给其所有者。

PostgreSQL 文本不能包含 NUL 字符。包含 NUL 的值因引擎错误而失败。 Search/vector 功能仍然是特定于商店的；选择引擎不会将 PostgreSQL 支持添加到未移植的商店。

| 失败                                   | 下一步                                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 连接秘密丢失或未解析   | 配置 `database.postgres.connection` 并验证 SecretRef 提供程序可用于网关。 |
| 无法访问 PostgreSQL 服务器             | 检查 DSN、网络访问、角色权限和服务器可用性。                               |
| 存储 UUID 不匹配                       | 恢复匹配的锚点和PostgreSQL schema；不要将锚点与其他商店配对。            |
| 较新的架构或缺少向前迁移 | 使用兼容的 OpenClaw 二进制文件；在降级之前使用该二进制文件进行反向移植。                     |
| PostgreSQL 备份期间网关运行  | 通过服务所有者停止，然后重新运行备份命令。                                          |
| 更新目标缺乏 PostgreSQL 支持    | 在重试之前，请保留当前版本或使用当前兼容二进制文件进行反向端口。         |

## <a id="observe-database-work"></a> 观察数据库工作

引擎边界在 `openclaw.database.statement` 和 `openclaw.database.request` 上发布 Node.js `diagnostics_channel` 事件。订阅是隔离本地的：语句事件在数据库工作线程中发出，请求事件在主机上发出。订阅您想要测量的每个流程或工作人员：

```js
import { channel } from "node:diagnostics_channel";

channel("openclaw.database.statement").subscribe((event) => {
  // Count by event.engine, or inspect event.durationMs and event.outcome.
});
```

每个连接执行调用都会发出一个语句事件。复合 `exec` 或查询 SQL 生成一个携带规范化复合文本的事件；观察不会分割 SQL 或执行额外的查询。每个工作进程 `scope.execute` 请求、连接打开和连接关闭都会发出一个主机端请求事件。两者均包括 `engine`（`"sqlite"` 或 `"postgres"`）、`threadId`、`outcome`（`"ok"` 或 `"error"`）和 `durationMs`。语句事件还包括经过编辑的规范化 `sql`；这两个事件都不包含绑定。请求事件将工作边界与请求执行的语句分开计数。这使得普查工具可以比较两个引擎，而无需从 SQL 推断它们。当没有订阅者时，边界会跳过计时、SQL 标准化和事件构造。

有关商店所有权和架构合同，请参阅 [ 数据库架构 ](/reference/database-schemas)；有关网关配置的其余部分，请参阅 [ 配置参考 ](/gateway/configuration-reference)。
