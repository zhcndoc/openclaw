---
summary: "OpenClaw SQLite 数据库位置、架构版本、完整性检查和降级恢复"
read_when:
  - "诊断较新的数据库架构错误"
  - "在更新或降级前检查数据库兼容性"
  - "提议 SQLite 或持久存储更改"
  - "为另一个数据库后端准备存储操作"
  - "为较旧的 OpenClaw 版本恢复数据库"
title: "数据库架构"
---

OpenClaw 将控制平面状态存储在共享状态数据库中，并将代理数据存储在每个代理的一个 SQLite 数据库中。当数据库打开时，架构迁移会向前运行。较旧的 OpenClaw 构建由较新模式编写的垃圾数据库。

对于运行时贡献者，请从[工人的数据库访问](/reference/database-schemas/worker-access)：执行所有者、每次加载一次的准入、范围写入收据、仅内存最终权限守卫和会话参与者。这[迁移清单](/reference/database-schemas/worker-access-inventory)记录剩余的主线程调用站点和防止增长的棘轮。

PostgreSQL 共享状态生成需要 PostgreSQL 16+，保留惰性功能片段，并使引擎架构版本保持同步。有关目录等效性和可移植 v22 标识列，请参阅 [ 共享状态模式生成 ](/reference/database-schemas/storage-changes#shared-state-postgresql-schema-generation)。

网关进程是每个 OpenClaw 数据库及其状态的单一所有者。它的工人和本地句柄共享该所有权。提交的写入收据在下次使用之前会使进程内行缓存失效；没有完全写入器覆盖的缓存必须使用直接读取。运行时读取不会探测带有 `PRAGMA data_version` 的外部提交、版本观察或外部观察范围。开放读事务外部的 SQLite 语句已看到已提交的数据。单语句读取不需要显式事务；当多语句读取的结果需要一个一致的快照时，它们会保留一个事务。 CLI、Doctor、cron 和插件子进程必须通过网关路由突变或在停止时获取独占所有权。首次入场、迁移、维修和最终的现场权限检查保留了其现有所有者。

公认的更新程序突变防护直接读取当前恢复行，而不是为每个效果启动同步快照子进程。显式的工件保留检查仍然使用私有快照。初始恢复准入、最终确定检查、执行者权限和拒绝新提交的恢复保持不变；等待过程中不会缓存任何恢复决策。

在 Doctor 的修复前捕获允许实时 SQLite 读取之前，维护会重用源内容修订，而数据库、WAL 和日志文件标识、大小和纳秒 modification/change 时间戳保持不变。捕获检查仍会评估当前的拘留、隔离并每次更新入院情况；即使在修订选择期间发生写入，最终的元数据观察也会使缓存的行无效。更改的源文件需要重新修订并读取分类帐。备份顺序、存储字节、架构和回滚行为保持不变。

代理删除状态在首次准入时加载，并为每个代理保留在物理共享数据库的进程拥有的事实中。期刊作者通过现有的工作事实传输在提交时发布待处理、已完成和已删除状态；回滚保留以前的状态。会话准入重用这一事实和删除所有者的队列关闭，而不是每次都读取日志。同步运行时防护重用相同的已提交事实，而不是为每次检查复制共享数据库。本机事务内的守卫仍然读取该事务的当前日志，包括其未提交的更改。重新启动会再次加载持久化的墓碑。破坏性清理保留其当前的期刊权威检查；架构、保留和更新行为保持不变。

一旦 Gateway 启动拥有独占状态所有权，它就会直接在只读工作线程中检查先前的 Gateway 租约，而不是复制共享数据库。新的或无法验证的所有者仍然会阻止启动； Doctor 的模式修复准入将其私有快照保留在 SQLite 上。 PostgreSQL 维护通过承认的状态读取器检查租约，无需文件快照。

借用的worker交易在`BEGIN IMMEDIATE`之前获得其初始主机授权；使用域或发布事实进行写入仍然会在提交时重新验证这些事实。相反，在尝试非阻塞 `BEGIN IMMEDIATE` 之前，转录索引预检和扫描会承认一种有限的派生维护效应。他们重新读取该事务内的所有源行，并且在持有写入器锁的同时不发出主机请求。争用将待处理的工作返回到现有的收益消耗中，该消耗在下一次尝试中获得新的授权。最终的拨款使这种内部维护与随后的撤销保持线性关系；它永远不会在异步工作或锁等待中保留。架构、存储格式、保留、权限和更新行为保持不变。

更新历史记录工作人员将提交许可等待一秒。超时时，事务会在同一工作命令重试之前回滚，保留 FIFO 排序并重新读取当前行。新的准入在 `BEGIN IMMEDIATE` 之外等待，从而使服务网关的写入器在更新器主机繁忙时空闲。权限拒绝和不确定的回滚结果不会重试；所需的更新和恢复记录保留其现有的耐久性。

通道身份写入在事务输入和提交时使用相同的一秒准入预算，最多尝试三次。 `BEGIN`之前入场等待；在使用新权限和当前行重试之前，提交超时会回滚。耗尽会命名失败的操作，并在重试之前将操作员引导至 `openclaw gateway status --deep`。最终提交授权保留在事务中，直到剩余的权限所有者可以转移他们的支票。

数据库事实读取器不会联系事务内的主机。在交易结束之前，缺失的作者注册或未发布的事实仍然未知；模式读取器保留其保守的快照验证。事务外的下一次读取可以通过现有所有者刷新这些事实。

在接纳真实状态数据库之前，本机 SQLite 初始化会在一次查询中读取加载的库的版本和扩展功能。身份验证配置文件读取器在连接打开时安装其锁定等待超时。第一次网关启动时，仅包含可识别的本机引导表的零版本数据库在读取运行时历史记录之前完成。这使用现有的架构所有者并保留本机行；它不会在普通启动期间修复历史安装。隔离决策读取器和写入器在连接打开时设置其现有的锁等待超时。隔离商店的格式和每个目标的决策在每个物理商店中加载一次。记录和清除操作通过现有的进程内准入事实（包括缺勤）发布已提交的决策，因此普通警卫不会重复持久查找。显式 Doctor 检查读取磁盘，记录的拒绝仍然验证其文件生成。隔离行保留其路径名范围，并且别名仍然共享物理格式、模式和完整性事实。持久化架构、WAL 安全性和恢复行为保持不变。

代理数据库打开应用私有文件和目录模式。热读写重用打开的连接，无需再次检查或修复这些模式；权限漂移在下次打开时或通过显式维护来修复。保留的操作还重用其承认的文件标识。接纳后的替换不会将该操作重定向到替换文件；下一次准入或打开通过数据库生命周期所有者检测到它。提交权限检查和医生的明确验证仍然存在。

新代理数据库直接安装当前规范架构，无需运行旧版迁移发现或修复刚刚创建的索引。创建事务提交后，模式所有者会发布承认的目录和规范验证事实，以供以后的打开和工作人员使用。跟踪 DDL 并回滚仍然使这些事实无效；现有数据库保留其首次准入和迁移检查。连接锁定超时是通过共享的每个句柄所有者分配的，因此重复设置不会重复 PRAGMA。架构、存储的字节以及升级或降级行为均保持不变。

聊天输入参与者重复使用其本地所有者承认的物理身份和规范位置，而无需排队另一个写入者预订来获取该参与者。冷所有者仍然首先准备他们的数据库身份。捕获的会话读取约束同一个物理文件；实际输入写入保留FIFO准入和当前权限检查。

受管理的作家在公众观察员面前发布承诺的事实。私人收据区分明确缺席和不完整覆盖，并独立于回复传递保留已知提交。请参阅 [ 提交的事实和完整性 ](/reference/database-schemas/worker-access#committed-facts-and-completeness) 以了解排序、回滚以及仍保留本机防护的编写器系列。

SQLite 格式、架构版本、完整性、所需索引和表存在性验证在每个进程负载的每个物理数据库上运行一次。常规 `<database>.seal` 文件可以在干净重启时携带已承认的事实：所有者在成功的 `TRUNCATE` 检查点和本机关闭后写入它，并在下一次写入之前取消链接它。仅当其校验和、模式身份、设备、inode、稳定诞生时间、大小和纳秒修改时间匹配、日志不存在或为空、并且完整验证最多 7 天时，Startup 才会重用它。命中会跳过启动快照、就绪情况、架构和完整性检查，包括就绪后扫描。普通的校验和保护写入不需要重命名或 fsync 协议；不完整的密封会退回到完全验证。

当数据库打开时，承认的事实与所有工作人员和句柄共享。最终关闭释放其内存中的有效负载；干净关闭密封可在重新打开时恢复经过验证的事实，而无需 SQL。无法密封的收盘需要重新入场。文件标识使用在保留准入描述符上使用 `fstat` 捕获一次的卷、inode 和稳定出生时间，而不是 SQL。准入查找和已建立的借款人重复使用这些共享事实，而无需再次检查路径名。本机打开和重新打开仍会识别替换文件，并且创建见证人会保留其物理文件检查。替换或恢复的文件需要重新输入。迁移和修复所有者在成功解决 DDL 后验证其更改并发布新事实。医生和显性验证保留全面检查，观察到腐败仍会取消入院资格。元数据未更改的静默损坏不在密封的保证范围内，并且可以通过正常的 SQLite 访问或下一次完整验证来捕获。有关崩溃参数、验证间隔和维护行为，请参阅 [ 清洁关闭密封和完整性检查](/reference/database-schemas/integrity-and-recovery#integrity-checks)。

共享状态和代理只读连接在其本机连接生命周期下重用有界准备好的语句。单独的预准备语句重用不会保留查询结果。模式事实查找使用进程承认的事实，而不使用 SQL。写入器收据使跨连接的缓存行结果无效，而无需再次查询 `data_version`、`schema_version`、`user_version` 或目录。当前行权限检查保持在其效果边界。活动 SQLite 快照内的缓存行使用该快照的标识和连接的本地突变修订版。它们永远不会携带当前已提交的写入修订，也不会在快照结束后变得可重用。自动提交缓存使用拥有者的收据。关闭连接会清除其准备好的语句和行缓存。确认关闭会保留物理数据库已完成的验证事实，以便以后在同一流程中打开。仅在所有同级本机句柄耗尽后，显式退出才会关闭主机身份描述符，从而保留其 POSIX 锁。

共享状态命令直接加载其注册域。剩余的命令运行时仅在操作需要时加载，因此单独为注册操作提供服务的工作人员不会保留不相关的命令模块。准备工作仍然在同步数据库执行之前完成；作家入场券和收据归其现有所有者所有。

共享状态读取器池在正常句柄空闲超时期间使其第一个工作线程保持温暖。多余的读取器在闲置 30 秒后退出，并根据需要重新启动。停用使用池的现有任务和本机资源结算，因此活动读取或保留租约不会中断。

持久使用刷新有界事务中的发布汇总，而不是每个记录一个写入者请求。一批在 50 个转录本、1 MiB 准备好的有效负载或扫描一秒后刷新，在整个转录本之间进行检查；一份大的文字记录可能会超出字节或时间限制。刷新完成始终会刷新剩余批次。新的检查点保持不变，失败或取消的扫描会留下未提交的派生总数以供下次刷新。持久汇总、分区、架构和报告总计保持其现有格式。

记录历史和搜索通道同样会在闲置 30 秒后让剩余人员退休。每个通道保留一名工作人员，直到其现有的五分钟闲置退休，等待逻辑读取器租约释放。剩余退休保留这些租约并等待活动任务；稍后的并发读取按需启动另一个工作线程。

规范身份验证读取将实时所有者的模式事实（用户版本和两个身份验证表分类）的紧凑投影传递给隔离的子项。子级通过其有限的本机读取器池读取当前凭证行，而无需在每个请求上重复连接设置或架构准入。保留的读者必须遵守请求所承认的物理身份；父级在数据库删除之前加入子级清理。冷读、快照读和保留工件的读仍然允许它们自己的数据库；所有者 DDL 使下一个投影无效，并且替换物理文件不能借用前一个文件的读取器或事实。

工作人员内部的同步插件发现同样借用了现有的共享状态读取器池。每次传递都会读取当前行，而本机读取器及其准入将一直存在，直到工作人员清理或空闲到期为止。主线程一次性读取和工件保留快照保持其范围内的生命周期。

工作调度携带由准入所有者在发布事实或作者保管时准备的快照。未更改的请求将重用注册表修订版，而无需扫描每个数据库或重建事实图。共享撤销单元仍然立即使转移的事实无效；停用会删除已发布的快照。这不会更改架构、存储的字节或更新行为。

共享状态内容版本检查跨开放句柄和工作线程重用物理数据库承认的版本事实。普通提交、事务和关闭多个连接之一不会强制读取另一个标记。迁移所有者发布替换事实及其提交的架构。观察到的 DDL 没有替换事实会使内容版本许可过期：未更改的目录形状并不能证明 `config_machine_state` 标记幸存下来。下一次所有者查找会验证一次，然后打开重用结果。历史快照保留了自己的标记事实；发表需要与当前承诺的录取完全匹配。每个调用者仍然应用其发布版本的下限。架构版本、存储的字节以及升级或降级行为均保持不变。

新的代理读取器重用流程的模式准入。共享状态工作线程读取会消耗写入器无效的缓存事实或当前行，而无需新鲜度探测。点转录统计、突变时钟、待归档检查和 hot/cold 水印使用单个语句的快照；复合读取保留其读取事务，而热转录读取则重用现有事务而无需嵌套保存点。屈服写入准入会在获取写入事务后立即恢复其临时繁忙超时一次，并携带继承的锁定截止时间，而无需重新读取连接的超时。 FIFO，锁等待预算、模式、存储的数据和更新行为不变。

活动摘要批次读取一个本机快照中的元数据、祖先和有界消息。转录将现有窗口的新近度附加折叠到其最终的突变水印写入中；被拒绝的重复项仍然记录尝试的新近度。连接保留其所有者设置的繁忙超时并跳过未更改的分配。审计编写器保留最早的到期时间并跳过空修剪直到到期，从而在回滚或维护时使该事实无效。审核保留、转录时间戳语义、模式和更新行为保持不变。

承认的目录包括索引名称和触发器定义以及表。存储会话验证会使用这些定义，而无需再次进行目录扫描。第一个必需索引准入共享模式合约读取器的批量元数据快照，而不是单独查询每个表和索引。隐藏的 PRAGMA 名称在验证期间保留本机检查。授权、初始漂移检测、事务修复和完整性检查仍属于其现有所有者。仅当首次使用模式所有者的所有表和索引都存在于已发布事实中时，才会跳过附加 DDL。丢失的对象使用现有的安装事务，该事务在提交时发布新的模式事实；回滚无法发布未提交的架构。准入发布使用活动连接的事务状态和存储的共享发布锚点，因此 PostgreSQL 事务也会推迟事实直到提交并在回滚时丢弃它们。普通连接替换和数据提交不会重复架构验证。架构、存储的字节和更新行为保持不变。

审计生命周期绑定、节点工作人员启动伙伴、工作人员放置移动、技能库和工作人员环境准备、目标收据、董事会准备和内存 origin/provenance 准备重用这些承认的对象，即使在第一次使用热连接时也是如此。冗余 DDL 将撤销保留的配置文件权限，因此不会仅为了准备存储而重新创建现有表。退休的内存触发器仅在存在时才被删除；导入的内存行仍会收到其现有来源回填。私人更新和 Windows 工作区租赁所有者同样仅在丢失时创建其表。没有架构版本、存储的形状、升级或降级行为发生变化。

安装规范模式后，共享状态引导程序会检查一次本机表选项。当每个普通表已经是 STRICT 时，它会跳过旧的 STRICT 重建计划和重复架构安装。现有的非 STRICT 表仍然使用事务迁移，并且最终规范表和索引验证仍然是强制性的。 Doctor显式修复和版本拒绝不变；这不会更改存储格式或 upgrade/downgrade 合同。

承认的模式事实在纯数据交易结算中幸存下来。提交的写入收据使缓存的行事实无效。即使独立的读取游标在同一连接上保持打开状态，已确定的写入也会释放其接收栅栏。活动的写游标和显式交易保留其栅栏直到结算。被拒绝的写入器发现不会留下任何本机突变深度，因此稍后提交的写入仍然会使缓存的行无效。这不会更改架构、存储的数据或更新行为。架构事实的事务本地视图以其 SQLite 快照结尾；下一个事务会使用流程发布的事实，而无需重复验证。

进度卡写入重用事务的已承认表事实。架构所有者仅在惰性表不存在时创建惰性表，并为每个句柄和工作人员发布已提交的事实。回滚安装将保持不存在，直到下一个正常安装事务为止。存储的卡、修订逻辑删除、架构版本以及升级或降级行为均保持不变。

代理数据库执行所有者按最近最少使用的顺序保留最多四个空闲物理代理执行程序。借用执行器刷新其独立的30分钟空闲超时；第五个闲置执行器将驱逐最近最少使用的执行器。对代理名册或存储路径的配置更改会使现有执行器正常过期。已录取作品保留其原有实体店面；新请求解决当前配置。显式数据库关闭和网关关闭仍然会撤销并耗尽现有生命周期资源。这不会更改架构、存储的字节或更新行为。

在承认的不存在路径上创建代理数据库会在工作器准备之前撤销先前文件的保留验证。即使 Linux 重用其索引节点，重新创建的文件也无法借用该证明。普通的重新开业仍然重复使用现场证明，生鲜店保留他们的会话认证。收据标识符在工作人员转移后仍然存在，因此别名发布可以撤销被取代的证据，同时保留已确认的副本。后来撤销仍然拒绝出版。架构、存储的字节和更新行为保持不变。

保留已打开的代理句柄可以保留其生命周期，而无需查询 SQLite。写入器收据使其缓存的行事实无效；模式事实来自流程范围的接纳。当拥有者更改存储时，会话准备就绪会使其清理存储决策无效。

代理 ID 和 `schema_meta` 中的角色描述了实体商店的固定模式所有者。创建和迁移为每个句柄和工作人员验证并发布这些事实；普通提交不需要另一次所有权元数据读取。观察到的 DDL 没有所有者发布的替换元数据，即使重新创建的表具有相同的定义，该准入也会过期：其主行必须由下一个所有者查找验证一次。历史元数据保留在其快照中，直到与当前提交的准入完全匹配。外部行编辑不会重新分配已允许的存储。实时会话权限、租约所有权和调用者权限保留其当前行检查。动态授权者保留本机元数据读取。这不会更改架构、存储的字节或更新行为。

注册表发现重用成功的迁移检查来生成已认可的架构。分钟保留扫描读取工作进程中的删除历史记录，并在其代理存储之间共享一个匹配器；实时删除状态和生命周期提交保护仍然适用。 Cron 注册表保留验证其读取器工作程序中的完整列表，并仅将 cron 运行条目返回到网关；普通会话元数据保留在工作线程中。传统的观察标记发现使用索引前缀范围。即使没有写入，随着行的老化，保留也会继续；架构、升级和保留策略保持不变。

会话行事实读取重用已承认的延续的现有事务，而不是嵌套保存点。没有活动事务的读取仍然打开一个，因此条目元数据、董事会存在和转录水印共享快照。董事会存在在精确条目查询中移动，包括其单键错误回退，而不是单独的董事会读取。

放置预测在每个有界批次的一个语句中读取放置、移动、待处理结果、日志和环境事实。批次共享现有的读事务；日志和结果声明检查使用相同的快照事实。可选列来自承认的架构事实并由该所有者刷新。

展示位置停用在启动时检查一次库存，然后仅检查因展示位置收据或会话身份突变而更改的 ID。干净的空闲通道不执行退休读取。未知的证据和失败的清理工作仍在等待现有的分钟扫描。配置、存储拓扑和不确定的会话存储发布请求全新的库存扫描。退休谓词和远程环境拆卸保留了现有的权限检查。

技能发现可在一次工作扫描中跨工作区共享已安装的插件库存事实。每次新扫描都会从新的插件缓存开始，因此已安装的插件更改仍然可见，而无需为每个代理重新读取相同的索引。

共享状态读取操作通过其同步域读取保留其准入修订。 ACP 元数据在该版本下每个连接最多重用 128 行；作者收据、模式更改和关闭使重用无效。事务和固定或授权者控制的读取仍会查询 SQLite。提供的共享状态写入器在 `BEGIN` 之后重用其选定的句柄并检查所有权，而无需重复的事务前行读取或架构验证。存储的字节、模式、权限和更新行为保持不变。

准确的条目和参与者读者保留其在承认的连接修订时的最后结果。重复读取会重用这些事实，直到拥有者的接收、回滚、模式更改或连接停用使它们无效。会话修订防护和维护快照保留其突变和快照谓词；事务输入、回滚和结算保留其现有的无效性，无需外部提交探测。架构、存储字节、权限或更新行为不会发生变化。返回的条目和参与者身份仍归调用者所有。转录水印读取在一个语句中选择热生成和保留的冷或热序列；仅热门读者保留其现有含义。这些查询更改保留架构、存储的字节、实时权限和更新行为。

显示历史读取器按会话和事件 ID 解析选定的活动锚点，将序列栅栏保留在同一读取快照内。这些点查找使用现有主键，不需要架构或数据迁移。

会话条目在一次更新插入中批量写入其保存的快照字段，保留每个字段的修订触发器和回滚。

条目替换快照在现有窗口事实旁边带有转录水印。元数据编写者返回该令牌及其条目后图像；同一交易中的转录本突变提供了其新提交的代币。出版不会再次扫描文字记录。精确的消息重写同样返回由其作者铸造的一代。分离的编辑在写入之前仍会将准备好的有效负载与当前行进行比较。架构、存储字节、保留、权限和更新行为保持不变。

主会话密钥策略、外部监督所有权和机器拥有的 TTS 首选项路径为物理数据库加载一次，并在句柄和工作线程之间共享。他们的作者发布了承诺的替代品；不相关的写入不会使这些事实无效。网关拥有运行时写入。其他进程必须使用该所有者或在其停止时运行，但已建立的更新程序切换、重新启动哨兵和更新最终写入程序除外，它们保留自己的生命周期栅栏。所有权主张需要独家离线保管。显式所有权检查和 Doctor 仍然读取数据库，并且实时生命周期和租赁检查仍然处于有效边界。缓存的策略事实不授予数据库准入或继续权限。主键作者出版物带有主机修订版，因此工作人员可以保留缺席的出版物，而无需在不相关的写入后进行轮询。嵌套工作人员仅转发他们实际收到的主机完整性。共享生成布局在槽 5 中保留写入收据，在槽 6 中保留主机发布完整性；这些独立证人从不共用一个柜台。当前的主键值是数据事实：不相关的 DDL 无法撤销已提交的配置后映像。丢失的策略行将保留在连接的读取修订中，直到架构所有者的种子或规范编写器使策略可用。不确定的回滚可能会丢弃数据事实，并需要在重用之前进行一次修复读取。

并发的 Windows 切换初始化器共享现有的写入器准入锁，直到私有文件发布完成，从而保留单链接文件检查，而无需隔离另一个初始化器正在进行的发布。

提及收件箱通过同一实体所有者保留其承诺的头部。未更改的头会跳过快照工作线程调度。已更改或不确定的突变会在一个原子查询中读取头部并保留源，然后再恢复其 FIFO；未知的写入结果永远不会授权重播。会话条目突变代位于其连接旁边的 JavaScript 中。 TEMP 触发器观察准确的会话和参与者写入，并且回滚会使生成无效，而无需选择 TEMP 计数器行。身份验证配置文件读取器使用表、视图和缺席的承认的目录事实，而不是每次读取时查询目录。这些更改保留了架构、存储的字节、持久性、保留、权限和更新行为。

设备对通知程序在其服务生命周期内保留空订户和送达收据状态，因此空闲计划扫描不会重新读取两个存储。它自己跨网关和代理注册表的写入使该事实无效，包括不确定的结果，并且服务重新启动会重新加载它。活动通知保留其当前的订阅支票和送达收据；持久订阅和收据保留不变。

网关不安排每日全数据库扫描。初创公司重复使用最近的清洁关闭密封件或执行所需的全面验证；密封命中不会对准备后验证扫描进行排队。医生和显式验证保留全面检查。请参阅 [integrity 准入和医生维护 ](/reference/database-schemas/integrity-and-recovery#integrity-checks) 了解 7 天的验证间隔和操作员请求的验证。

网关启动和重新启动检查仅允许配置的代理数据库目标。未配置代理的保留存储保持不变，供 Doctor 检查。不兼容的辅助代理数据库会拒绝该代理与 `openclaw doctor --fix` 指导的会话，而不会阻止健康代理或重新启动网关。共享状态和所需的系统代理检查仍然严格。

有两种机制支持该合约。 CI 运行 `scripts/check-native-state-schema-version.mjs`，当 Swift 和 TypeScript 状态数据库合约声明不同的架构版本时，构建会失败。 [`openclaw doctor --fix`](/cli/doctor) 拥有文件到 SQLite 的迁移，并在共享的 `migration_runs` 和 `migration_sources` 表中记录每个迁移的收据。

执行步骤收据与这些持久导入收据是分开的。被先前拒绝阻止的步骤包括可选的 `originatingRefusal` 字段 `stepId`、`code` 和 `message` 命名第一次失败。请参阅 [ 旧状态迁移](/cli/doctor/state-migrations) 了解如何解决它。

此页是一个索引。参考文献记录在重点页面上，每个读者作业一个。打开与您的任务匹配的页面并停留在那里。

| 页面                                                                                           | 读它的时候                                                                                             |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [数据库引擎（实验性）](/reference/database-engines)                                 | 选择 PostgreSQL，了解 SQLite 锚点，或观察语句和工作人员请求。         |
| [数据库布局](/reference/database-schemas/layout)                                          | 两个数据库角色、它们的磁盘路径以及各个功能背后的表。                  |
| [版本合同](/reference/database-schemas/versioning)                                  | 如何记录架构版本、何时需要更新以及更新程序如何跨越版本。                   |
| [单人和同伴存储](/reference/database-schemas/personal-data)                  | 个人 GitHub 连接、个人模型帐户和 Apple 同伴传递日志。             |
| [存储更改和发布预检](/reference/database-schemas/storage-changes)           | 准备另一个后端、材料变更审核检查点和 `openclaw database preflight`。 |
| [ 工作人员中的数据库访问](/reference/database-schemas/worker-access)                        | 移动运行时读取和注销网关主线程，同时保留其所有者。               |
| [工人迁移库存](/reference/database-schemas/worker-access-inventory)              | 复制同步访问清单并选择下一个迁移。                            |
| [代理架构历史](/reference/database-schemas/agent-schema-history)                       | 每个代理数据库架构版本、它们的更改以及它们的第一个版本。                             |
| [状态架构历史](/reference/database-schemas/state-schema-history)                       | 共享状态数据库模式版本、它们的更改以及它们的第一个版本。                          |
| [完整性、故障排除和恢复](/reference/database-schemas/integrity-and-recovery) | 完整性检查、常见数据库错误以及支持的降级恢复路径。                     |

## <a id="related"></a> 相关内容

- [Backups](/install/backups) — 此处描述的数据库的存档、每个数据库快照、计划和异地副本
- [Updating](/install/updating) — 安全更新，包括在架构碰撞之前进行的验证备份以及回滚策略
- [Doctor](/gateway/doctor) - 修复和迁移工具，用于修复过时的 config/state 并报告健康问题
- [`openclaw doctor`](/cli/doctor) — 运行这些迁移的命令的 CLI 参考
- [`openclaw update`](/cli/update) — CLI 预检模式支持更新程序的参考

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/reference/database-schemas#schema-bumps-and-older-updaters`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="database-layout" />[数据库布局](/reference/database-schemas/layout#database-layout)
- <a id="plugin-state-listing-index" />[插件状态列表索引](/reference/database-schemas/layout#plugin-state-listing-index)
- <a id="mentions-inbox" />[提及 Inbox](/reference/database-schemas/layout#mentions-inbox)
- <a id="acp-replay-accounting" />[ACP 重播记账](/reference/database-schemas/layout#acp-replay-accounting)
- <a id="meeting-transcript-tables" />[会议记录表](/reference/database-schemas/layout#meeting-transcript-tables)
- <a id="meeting_transcript_sessions" />[`meeting_transcript_sessions`](/reference/database-schemas/layout#meeting_transcript_sessions)
- <a id="meeting_transcript_utterances" />[`meeting_transcript_utterances`](/reference/database-schemas/layout#meeting_transcript_utterances)
- <a id="meeting_transcript_summaries" />[`meeting_transcript_summaries`](/reference/database-schemas/layout#meeting_transcript_summaries)
- <a id="update-run-ledger" />[更新运行账本](/reference/database-schemas/layout#update-run-ledger)
- <a id="cloud-repository-workspaces" />[云存储库工作区](/reference/database-schemas/layout#cloud-repository-workspaces)
- <a id="versioning-contract" />[版本合同](/reference/database-schemas/versioning#versioning-contract)
- <a id="schema-bumps-and-older-updaters" />[架构碰撞和较旧的更新程序](/reference/database-schemas/versioning#schema-bumps-and-older-updaters)
- <a id="profile-owned-skill-library" />[档案所属技能库](/reference/database-schemas/versioning#profile-owned-skill-library)
- <a id="personal-github-connections-and-publication" />[个人 GitHub 连接和发布](/reference/database-schemas/personal-data#personal-github-connections-and-publication)
- <a id="personal-model-accounts" />[个人模型账户](/reference/database-schemas/personal-data#personal-model-accounts)
- <a id="apple-companion-delivery-journals" />[Apple 伴随交付日记](/reference/database-schemas/personal-data#apple-companion-delivery-journals)
- <a id="preparing-for-another-database-backend" />[准备另一个数据库后端](/reference/database-schemas/storage-changes#preparing-for-another-database-backend)
- <a id="keep-operations-at-the-owning-store" />[在所属商店继续运营](/reference/database-schemas/storage-changes#keep-operations-at-the-owning-store)
- <a id="preserve-the-data-and-concurrency-contracts" />[保留数据和并发合约](/reference/database-schemas/storage-changes#preserve-the-data-and-concurrency-contracts)
- <a id="keep-engine-specific-capabilities-owned" />[保留发动机特定功能](/reference/database-schemas/storage-changes#keep-engine-specific-capabilities-owned)
- <a id="review-checkpoint-for-material-changes" />[物料变更审核检查点](/reference/database-schemas/storage-changes#review-checkpoint-for-material-changes)
- <a id="preflight-a-target-release" />[预检目标版本](/reference/database-schemas/storage-changes#preflight-a-target-release)
  - <a id="preflight-an-explicit-agent-copy" />[预检显式代理副本](/reference/database-schemas/storage-changes#preflight-an-explicit-agent-copy)
- <a id="agent-schema-history" />[代理架构历史记录](/reference/database-schemas/agent-schema-history#agent-schema-history)
- <a id="creator-namespace-migration" />[Creator命名空间迁移](/reference/database-schemas/agent-schema-history#creator-namespace-migration)
- <a id="participant-identity-migration" />[参与者身份迁移](/reference/database-schemas/agent-schema-history#participant-identity-migration)
- <a id="state-schema-history" />[状态架构历史记录](/reference/database-schemas/state-schema-history#state-schema-history)
- <a id="state-schema-21" />[状态架构 21](/reference/database-schemas/state-schema-history#state-schema-21)
- <a id="state-schema-16" />[状态架构 16](/reference/database-schemas/state-schema-history#state-schema-16)
- <a id="state-schema-15" />[状态架构 15](/reference/database-schemas/state-schema-history#state-schema-15)
- <a id="state-schema-13" />[状态架构 13](/reference/database-schemas/state-schema-history#state-schema-13)
- <a id="state-schema-11" />[状态架构 11](/reference/database-schemas/state-schema-history#state-schema-11)
- <a id="state-schema-9" />[状态架构 9](/reference/database-schemas/state-schema-history#state-schema-9)
- <a id="integrity-checks" />[完整性检查](/reference/database-schemas/integrity-and-recovery#integrity-checks)
- <a id="troubleshooting" />[故障排除](/reference/database-schemas/integrity-and-recovery#troubleshooting)
- <a id="why-you-cannot-go-back-after-updating-to-2026.7.2" /><a id="why-you-cannot-go-back-after-updating-to-2026-7-2" />[为什么更新到2026.7.2](/reference/database-schemas/integrity-and-recovery#why-you-cannot-go-back-after-updating-to-2026-7-2)后无法返回
- <a id="the-gateway-refuses-to-start-with-a-newer-schema-version-error" />[网关拒绝以较新的架构版本启动错误](/reference/database-schemas/integrity-and-recovery#the-gateway-refuses-to-start-with-a-newer-schema-version-error)
- <a id="a-database-is-quarantined-after-integrity-verification-failed" />[A 完整性验证失败后数据库被隔离](/reference/database-schemas/integrity-and-recovery#a-database-is-quarantined-after-integrity-verification-failed)
- <a id="downgrades-are-unsupported" />[不支持降级](/reference/database-schemas/integrity-and-recovery#downgrades-are-unsupported)
- <a id="example-state-schema-21-to-20" />[示例：状态模式 21 到 20](/reference/database-schemas/integrity-and-recovery#example-state-schema-21-to-20)
- <a id="example-state-schema-13-to-12" />[示例：状态架构 13 到 12](/reference/database-schemas/integrity-and-recovery#example-state-schema-13-to-12)
- <a id="example-state-schema-12-to-11" />[示例：状态模式 12 到 11](/reference/database-schemas/integrity-and-recovery#example-state-schema-12-to-11)
- <a id="example-state-schema-11-to-10" />[示例：状态模式 11 到 10](/reference/database-schemas/integrity-and-recovery#example-state-schema-11-to-10)
- <a id="example-state-schema-10-to-9" />[示例：状态模式 10 到 9](/reference/database-schemas/integrity-and-recovery#example-state-schema-10-to-9)
- <a id="example-state-schema-9-to-8" />[示例：状态模式 9 到 8](/reference/database-schemas/integrity-and-recovery#example-state-schema-9-to-8)
- <a id="example-state-schema-7-to-6" />[示例：状态模式 7 到 6](/reference/database-schemas/integrity-and-recovery#example-state-schema-7-to-6)
- <a id="example-agent-schema-17-to-16" />[示例：代理架构 17 至 16](/reference/database-schemas/integrity-and-recovery#example-agent-schema-17-to-16)
- <a id="downgrade-recovery" />[降级恢复](/reference/database-schemas/integrity-and-recovery#downgrade-recovery)
