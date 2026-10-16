---
doc-schema-version: 1
summary: "共享状态数据库模式版本、它们的更改以及它们的第一个版本"
read_when:
  - "查找哪个版本首先发布了状态模式版本"
  - "阅读每个版本的注释以了解最近的状态模式更改"
title: "状态模式历史"
---

## <a id="state-schema-history"></a> 状态 schema 历史

**发布于** 命名包含每个更改的第一个稳定版本标签，或者当尚无稳定版本包含它时命名第一个 beta 标签。多个架构更改可以首先在编写更高版本的版本中一起发布。 `Unreleased` 保留用于稳定版和测试版标签中都没有的更改。计划升级时使用目标版本的历史记录：已安装版本的 `openclaw update --dry-run` 不会显示目标的迁移计划。较旧的构建拒绝较新的模式；回滚需要经过验证的升级前备份及其匹配的版本，而不仅仅是重新安装旧的软件包。

Doctor 在运行后续工作区和代理检查之前完成已识别的 schema-1 数据库，该数据库早于审计分类帐。缺少所有权元数据或缺少架构 2 或更高版本的审计分类帐仍然会阻止修复。

| 版本 | 变更                                                                                                                                                                                                                                                                                                                                         | 发表于        |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1       | 初始共享状态数据库                                                                                                                                                                                                                                                                                                                  | `v2026.6.1`         |
| 2       | 仅包含元数据的消息审计事件（[#103903](https://github.com/openclaw/openclaw/pull/103903)）                                                                                                                                                                                                                                               | `v2026.8.1`         |
| 3       | `STRICT` 表和 schema 漂移加固（[#108663](https://github.com/openclaw/openclaw/pull/108663)）                                                                                                                                                                                                                                       | `v2026.8.1`         |
| 4       | 会话监视来源信息取代编码的哨兵行                                                                                                                                                                                                                                                                                        | `v2026.8.1`         |
| 5       | 待处理工作区栅栏上的持久化云工作器结果引用（[`7a7d6bb`](https://github.com/openclaw/openclaw/commit/7a7d6bb51f42bd896de2b8a4df2ee66f3dce0a21)， [#110952](https://github.com/openclaw/openclaw/pull/110952)）                                                                                                            | `v2026.8.1`         |
| 6       | 每个提交的共享状态表都成为当前运行时模式的一部分（[`509a5f0`](https://github.com/openclaw/openclaw/commit/509a5f03737642fec4a940e6d605887f7957ddc8)、[#113473](https://github.com/openclaw/openclaw/pull/113473)）                                                                                                 | `v2026.8.1`         |
| 7       | 移除已废弃的推断式承诺存储                                                                                                                                                                                                                                                                                                    | `v2026.8.1`         |
| 8       | 云工作者放置执行模式和模式感知轮次声明                                                                                                                                                                                                                                                                              | `v2026.8.1`         |
| 9       | 相对于状态目录存储的根内代理数据库注册表路径                                                                                                                                                                                                                                                                   | `v2026.8.1`         |
| 10      | 6 个死表已退役（agent_model_catalogs、android_notification_recent_packages、command_log_entries、diagnostic_stability_bundles、media_blobs、model_capability_cache）                                                                                                                                                                   | `v2026.8.1`         |
| 11      | 旧技能管理者生命周期表和从未阅读的提案原始运行投影已停用                                                                                                                                                                                                                                                     | `v2026.8.1`         |
| 12      | 13 张 singleton/cache 桌子退役；耐用状态折叠成config_machine_state                                                                                                                                                                                                                                                        | `v2026.8.1`         |
| 13      | 状态整合：cron 作业和子代理运行使用 JSON 作为事实来源（113 个投影列，删除了 5 个未使用的索引）； installed_plugin_index 和共享身份验证配置文件单例合并为 config_machine_state； workspace_attestations合并为workspace_setup_state；需要网关源设备令牌表 | `v2026.8.1`         |
| 14      | 源合格的 cron 创建者捕获；历史上人类就业创造者仍然未知                                                                                                                                                                                                                                                            | `v2026.8.1`         |
| 15      | 对话绑定使用精确的目标键；删除了多余的 agent/session 投影                                                                                                                                                                                                                                                       | `v2026.8.1`         |
| 16      | 技能工坊所有权从 workspace/provenance 列转移到每个代理目录包含                                                                                                                                                                                                                                            | `v2026.9.3`         |
| 17      | 准备好的工作人员生命周期事实和一次性节点工作区绑定                                                                                                                                                                                                                                                                            | `v2026.9.4`         |
| 18      | 原始请求机构保留共享 GitHub 公布收据                                                                                                                                                                                                                                                                 | `v2026.9.6`         |
| 19      | 持久的原始渠道所有者授权和撤销连续性                                                                                                                                                                                                                                                                         | `v2026.9.7`         |
| 20      | Cron 收据交付尝试围栏可防止重播不明确的一次性完成                                                                                                                                                                                                                                                          | `v2026.10.1-beta.1` |
| 21      | 派生的会议记录选择器、摘要概述和有限的交付保留列                                                                                                                                                                                                                                                 | 未发布          |
| 22      | 便携式 ACP 简历列和显式批准、cron、执行决策和技能研讨会光标标识                                                                                                                                                                                                                              | 未发布          |
| 23      | 持久化标准化会议记录开始时间戳和时间索引                                                                                                                                                                                                                                                               | 未发布          |
| 24      | 保留的任务索引替换为 runtime/run 查找和有序 Cron 历史索引                                                                                                                                                                                                                                                        | 未发布          |

早期测试版本首先包含 `v2026.5.30-beta.1` 中的架构 1、`v2026.7.2-beta.1` 中的架构 2、`v2026.7.2-beta.2` 中的架构 3、`v2026.7.2-beta.4` 中的架构 5 以及 `v2026.7.2-beta.5` 中的架构 6。

### <a id="state-schema-24"></a> 状态模式 24

Schema 24 将 11 个非唯一 `task_runs` 索引替换为一个 runtime/run 查找和两个按创建时间和任务 ID 排序的部分 Cron 索引，无论是否有作业 ID。 Cron 历史避免临时排序；保留的非 Cron 行不再占用 Cron 排序索引。 Doctor 保留其索引 runtime/run 查找。任务表、rowid、有效负载、历史排序、保留和持久性保持不变。

Startup 和 Doctor 仅废弃被取代的规范索引名称，并在现有架构事务中安装替换项。不相关的本地索引和触发器保持不变。失败的迁移会回滚索引更改和架构发布。回收的索引页成为可重用的空闲空间；迁移不会收缩或清理数据库文件。

索引创建每个替换索引都会读取一次保留的任务行。现有的升级前备份和完整性工作仍然适用，因此即使替换索引较小，也要为完整备份留出空间。较旧的构建拒绝架构 24；回滚需要使用其匹配的版本恢复经过验证的升级前备份。切勿降低架构标记来绕过准入。

### <a id="state-schema-23"></a> 状态模式 23

架构 23 将可为空的 `started_at_ms` 添加到 `meeting_transcript_sessions`，并使用现有会话 ID 和原始起始字符串决胜符对其进行索引。会议列表、日期过滤器和光标页面使用 SQLite 和 PostgreSQL 上的持久瞬间。不可解析的日期保留在最后并且与日期过滤器不匹配。原始 `started_at` 字符串和转录本身份未更改。

一旦进入状态迁移事务，`meeting-transcript-start-time` 迁移就会使用 `parseDateStringTimestampMs` 解析现有日期。无时区字符串使用迁移进程的时区，在迁移时冻结它们的解释。新会议在编写时将其开始日期标准化；后来的元数据更新保留了这一瞬间。在不同时区读取不会重新解释存储的日期。日期过滤器输入仍然使用请求进程的时区。

仅 `meeting_transcript_sessions` 发生变化。失败的迁移会随状态事务一起回滚。旧版本拒绝新模式；恢复已验证的升级前备份和匹配的版本以回滚而不是降低标记。

### <a id="state-schema-22"></a> 状态模式 22

模式 22 在单个 ACP 元数据写入器中派生 `resume_agent_session_id` 和 `resume_acpx_session_id` 并替换 JSON 表达式索引。它还为 `operator_approvals`、`cron_run_receipts`、`execution_decision_facts` 和 `skill_workshop_changes` 添加了独特的 `cursor_id` 色谱柱。现有游标值、排序、JSON 字节和收据缓存行为将被保留。

正向迁移在共享状态模式维护中运行一次。它使用先前的 SQLite 表达式和 rowid 中的游标标识回填 ACP 列，而无需重新编号间隙。新的写入在现有的序列化写入事务中分配下一个游标。 PostgreSQL DDL 具有相同的列和索引；没有共享状态索引仍待提升。

较旧的版本拒绝架构 22。回滚使用其匹配的版本恢复经过验证的升级前备份；永远不要降低模式标记。请参阅 [ 已接受的附录 ](https://github.com/openclaw/openclaw/issues/169254#issuecomment-6129843452) 及其 [combined-v22 测序 ](https://github.com/openclaw/openclaw/issues/169254#issuecomment-6131216265)。

### <a id="state-schema-21"></a> 状态模式 21

架构 21 将七个可为空的文本列添加到 `meeting_transcript_sessions`、`overview` 到 `meeting_transcript_summaries`，并将可为空的 `retention_id_prefix`、`retention_max_age_ms` 和 `retention_max_entries` 列添加到 `delivery_queue_entries`。 JSON 仍然是规范的。每个作者都在与其 JSON 相同的语句中导出列；运行时过滤器和保留删除使用没有 JSON 后备的列。 [ 已接受的设计](https://github.com/openclaw/openclaw/issues/169254) 涵盖了这种共享状态迁移；代理数据库未更改。

一旦进入共享状态模式事务，正向迁移就会扫描现有行。仅当存储的 JSON 值是字符串时，转录选择器、元数据代理 ID 和摘要概述才变为文本；其他值变为`NULL`。仅当整个存储策略满足先前的 SQL 资格谓词时，交付保留列才会填充在一起，从而保留历史分类。丢失或格式错误的策略将保留所有三列 `NULL`。保留期限、计数限制和删除所有权不会改变。新索引支持选择器相等和有界保留查找；子字符串搜索仍然是扫描，并且会议 URL 仍然被排除在外。

Startup 和 Doctor 使用相同的迁移。现有的 [older-updater 发布 deferral](/reference/database-schemas/versioning#schema-bumps-and-older-updaters) 仍然会在发布两个架构版本之前一起提交内容及其标记。重新打开迁移的内容不会重复回填。较旧的功能编写者无法维护新列，因此 schema-20 构建必须拒绝升级的数据库。不要降低任何架构标记或删除派生列。

升级之前创建经过验证的 WAL-aware 备份。失败的迁移会回滚其事务。迁移提交后，回滚需要恢复完整的升级前备份及其匹配的版本；重新安装旧包不会逆转数据迁移。请参阅 [ 状态架构 21 至 20 恢复 ](/reference/database-schemas/integrity-and-recovery#example-state-schema-21-to-20)。

### <a id="state-schema-20"></a> 状态模式 20

模式 20 将 `delivery_attempt_state` 添加到 `cron_run_receipts`。新收据索赔记录`not-started`；收据所有者在完成移交或持久出库保管之前提交 `started`。该事实是单调的，意味着递送可能已经发生，而不是收件人承认它。现有的收据保留和确切的运行标识保持不变；没有额外的表或索引。

仅当其确切收据证明为 `not-started` 时，Startup 才可以恢复中断的一次性。 `started` 或旧版 `unknown` 事件仍处于禁用状态，且交付状态未知以供检查。无收据的遗留运行标记也是未知的。仅排队运行、不同的操作员替换、重复计划和准确的最终历史记录保留了现有的恢复规则。栅栏提交和切换之间的崩溃可能会导致未知而不发送；手动重试需要先检查收件人。

迁移会添加默认为 `unknown` 的列，而不会根据缺少的历史证据推断未送达。 Startup 和 Doctor 一起提交列和架构元数据。较旧的 schema-19 调度程序无法强制执行此隔离，因此即使物理添加与 SQL 兼容，内容版本也会前进。现有的 [older 更新程序发布 deferral](/reference/database-schemas/versioning#schema-bumps-and-older-updaters) 及其旧版更新程序宽限保持不变。 Schema-19 接纳拒绝较新的内容；记录的遗留宽限期会延迟降级保护，直到其所有者退出或其窗口到期。

升级之前创建经过验证的 WAL-aware 备份。二进制回滚无法删除此交付围栏：较旧的运行时必须拒绝迁移的状态。恢复升级前的备份会丢失后来的接收事实，并且不会撤消外部发送；在重试自动化之前协调这些影响。

### <a id="skill-workshop-proposal-retirement-(state-schema-20%2C-same-version)"></a><a id="skill-workshop-proposal-retirement-state-schema-20-same-version"></a> Skill Workshop提案退役（状态模式20，相同版本）

技能工坊不再存储提案。可选的 `skill_workshop_proposals`、`skill_workshop_proposal_events`、`skill_workshop_proposal_rollbacks` 和 `skill_workshop_collection_reviews` 表使当前模式保持不变；它们是懒惰的附加表，因此较老的同一版本读者已经容忍了它们的缺失。打开仍然包含它们的数据库不会发生变化：表不再被验证，并且运行时打开永远不会删除它们。

`openclaw doctor --fix`（包括 `openclaw update` 启动的 Doctor 运行）首先在其架构前奏期间修复已知的格式错误的 `idx_skill_workshop_collection_reviews_workspace_time` 索引。然后，其最后的 Workshop 步骤将每个 `pending` 或 `quarantined` 提案草稿及其支持文件写入 `<agentDir>/workshop-skills/.archive/.retired-proposals/<proposalId>/SKILL.md`，用于记录的所有者代理，或者在未记录时作为默认代理。 `<state-dir>/skill-workshop/proposals/<id>/` 下带有 `proposal.json` 的 SQLite 之前的捆绑包以相同的方式导出。现有的导出永远不会被覆盖。每次导出成功后，Doctor 都会在一个写入事务中删除四个表及其索引，然后删除旧的建议文件。任何失败都会对表和文件保留警告；重播《医生》恢复。已应用、已拒绝和过时的提案、事件历史记录、回滚元数据和集合审核结果将被丢弃。

降级到仍读取提案的版本需要升级前备份；导出的草稿仍然是可以重新创建为技能的普通文件。

### <a id="state-schema-19"></a> 状态模式 19

架构 19 将可为 null 的 `authorization_id TEXT` 和 `authorization_basis_json TEXT` 添加到现有的 `user_profile_identities` 行。配置文件所有者重用不间断通道链接的不透明 UUID 并仅记录其原始访问策略授予参考（或 JSON `null`）。它不会将渠道标识复制到另一个商店。引用的版本为 JSON `{ "version": 1, "id": "<uuid>" }`，而不是凭证：恢复通过配置文件读取工作人员解析它，并重新检查当前角色或身份范围以及原始插件授权。未知版本、格式错误的引用、丢失的行或损坏的授权事实不会授权工作。该模式提供所有者合同；消费者必须保留并重新验证自己的效力权威。

当角色、别名或所有权发生变化时，配置文件权限突变会在同一事务中清除这些字段。取消链接会删除该行。恢复角色或链接无法恢复已失效的引用。现有配置机器状态存储在 `operator.channelPolicy` 下记录激活的 `gateway.roles` 和 `gateway.auth.identityScopes` 策略快照。仅身份范围所有者使用相同的参考合约；删除和恢复其配置的范围无法恢复已停用的引用。在秘密激活锁下，对任一策略的更改都会在发布确切的后继快照之前永久废弃现有引用。回滚使用与合并目标相同的操作；发布失败会协调幸存的活动策略。不涉及代理架构更改。

Startup 和 Doctor 添加可为空的列，而不向旧行分配权限；未使用的配置文件表在首次使用之前一直不存在。当前架构和配置文件所有者的首次使用初始化共享表和索引定义。两个已发布的模式标记通常都会前进到 19。在现有的 [older-updater 发布延迟 ](/reference/database-schemas/versioning#schema-bumps-and-older-updaters) 期间，可以升级内容，同时保留较旧的已发布标记。在版本 19 发布之前，无法发布或恢复引用。

版本 18 编写者无法保留撤销历史记录，因此即使添加的列可以为空，这也是版本化的权限协定。他们的正常工作人员准入会在国家协调员的领导下检查外国版本的更改，并拒绝进一步的写入，包括比他们的支持更新的延迟内容。老读者也拒绝模式 19。在升级之前创建经过验证的 WAL-aware 备份。降级需要在单独的状态目录中恢复匹配的升级前备份；切勿降低标记或删除权威栏。恢复备份会丢失以后的撤销和收据，并且不会撤消外部影响；在回滚之前协调那些具有兼容版本的内容。

### <a id="state-schema-18"></a> 状态模式 18

架构 18 将可为 null 的 `requester_authority_json TEXT` 列添加到 `github_publication_session_lifecycles` 和 `github_repository_publication_requests`。共享发布准入记录其原始请求者、范围上限以及现有请求事务中任何所需的插件授予身份和原始别名绑定 ID。快照在延迟和重新启动后仍然存在；它不会取代当前的角色、授权、会话或执行权限检查。发布者选择、存储库路由、人工归因和收据保留均保持不变。

Startup 和 `openclaw doctor --fix` 将列添加到现有表中，而无需重建或重写其行。历史值保留为 `NULL`：迁移不会从发布者、会话创建者或当前受让人推断出请求者。未经证实的待处理请求无法产生新的效果。终端收据保持可读，观察已发送的 GitHub 结果并不授权其他操作。未使用的发布表将一直不存在，直到其正常的首次写入（这将创建当前模式）。

配置文件架构所有者将可为空的 `binding_id TEXT` 添加到现有的 `user_profile_emails` 表中，并在其自己的事务中初始化缺失的 ID。每个电子邮件到配置文件的绑定都有一个不透明的 UUID。创建或实际所有权变更开始新的绑定；同一个所有者刷新保留它。删除并稍后恢复别名无法恢复其以前的 ID。发布快照仅保留那些原始 ID，而不复制电子邮件地址或更新接受的收据字节。初始化现有别名不会将缺失的权限回填到历史发布请求中。

发布列添加和版本事实在一个模式事务中提交；失败会让他们重新回到一起。两个已发布的标记通常都会前进到 18。现有的 [older-updater 发布 deferral](/reference/database-schemas/versioning#schema-bumps-and-older-updaters) 可以保留较早发布的标记，同时记录应用的内容版本 18。重新打开将使用该内容版本并且不会重复迁移。

老读者准确地验证这些可选表，因此裸露的可为空列不会使其成为相同版本的添加。构建支持状态模式 17 或更早的拒绝模式 18。停止较旧的编写器并在升级之前创建经过验证的 WAL-aware 备份。回滚需要在单独的状态目录中进行匹配的构建和升级前备份，而不是降低版本标记或删除权限字段。保留较新的数据库，并在回滚之前将已接受的 GitHub 效果与兼容的版本进行协调：恢复备份会丢失稍后的本地收据，并且不会撤消推送的提交或拉取请求。

### <a id="state-schema-17"></a> 状态模式 17

模式17添加完整的准备工人存储合同。可空的`worker_environments`列`preparation_key`， `preparation_demand_at_ms`， `preparation_expires_at_ms`， 和`preparation_consumed_at_ms`形成一个用于一次性容量的约束元组。单独的可为空`last_activated_at_ms`列存储成功激活时间。 Ready-pool接纳写入准备元组；消耗该容量并分配会话放置共享一个事务。成功的放置激活会在同一事务中记录其需求时间。消耗会在失败的连接、放置退役和重新打开后继续存在，而终端行保留未过期的需求和不确定的清理。迁移保留所有五个值`NULL`现有工作人员，不会从历史行推断需求、激活或未使用的容量。

专用节点在首次使用时注册固定的构建路径`node_worker_prepared_workspaces`桌子。它记录了准确的环境并完成`preparation_key`， 必填项`cache_key`识别兼容project/runtime内容、固定工作空间和HOME路径。需要分开`source_manifest_ref`和`prepared_manifest_ref`摘要识别干净的 Git 基线和完整的设置树。初始绑定验证完整的树；重播保留绑定会话的编辑。绑定记录一次会话和所有者纪元。退役会保留该绑定，直到机器拆卸为止，因此退役的路径不能由另一个会话声明。

注册在其现有同步写入事务内创建仅节点表。中止的注册会回滚该 DDL，稍后的尝试可以再次创建它。普通数据库打开和迁移会使表不存在。每个代理模式和本机配套表不会更改；本机客户端可以继续验证和读取其在状态模式 17 处现有的拥有的表，而无需执行迁移。

启动和`openclaw doctor --fix`打开模式时应用准备工作人员迁移 -15或模式-16数据库。一个架构-16数据库仅接收准备好的工作人员迁移。元组约束属于最后添加的列，因此迁移会扫描现有环境一次并保留表而不是重建它。租赁、凭证、安置、推理轮次、未知的附加数据和不确定的清理保持不变。迁移事务中没有运行提供程序操作。

迁移内容与其版本事实一起提交；失败会回滚该尝试中的所有数据库更改。在该交易中，两个已发布的标记通常都会前进到 17。当较旧的更新者仍然拥有跟踪账本读取时，现有的[版本发布延迟](/reference/database-schemas/versioning#schema-bumps-and-older-updaters)将发布的标记保留在其早期版本并单独记录应用的内容17。重新打开不会重复该内容迁移。

在升级之前，停止旧的编写器并创建一个经过验证的、WAL-有意识的备份。构建支持状态模式16或者更早拒绝已发布的架构17。要回滚，请使用兼容的版本完成云清理，停止所有编写器，然后将升级前的备份恢复到单独的状态目录中。恢复不会保留备份后所做的更改。请勿降低任一版本标记或删除已使用的绑定。未解决的提供商清理可能会继续产生费用，直到确认删除为止。

### <a id="state-schema-16"></a> 状态模式 16

模式16删除`workspace_dir`和`claim_released_time`从`skill_workshop_proposals`。它还删除了`workspace_dir`和`idx_skill_workshop_collection_reviews_workspace_time`来自收藏评论历史并添加`owner_agent_id`加上它的owner/time指数。提案行保持不变。其声明已被集合评审发布的提案将成为`stale`由于状态原因，因此它曾经创建的技能路径仍由用户拥有，Doctor 永远不会重新定位它。

上面的同版本提案停用删除了此迁移。 schema-15 数据库保留其旧版 Workshop 列，直到 Doctor 导出其待处理草稿并删除提案表。

技能工坊所有权现在为物理 `<state-dir>/agents/<agentId>/agent/workshop-skills` 目录。启动和 `openclaw doctor --fix` 删除共享架构事务中已停用的列和索引。然后，两者都运行相同的迁移，将应用的旧 Workshop 创建重新定位到推断的所有者代理，并重新定位符合条件的待处理创建。冲突和模糊的所有权会成为过时的提案，并使遗留目录保持不变。尽可能查看映射到唯一业主代理的历史记录行；否则模式迁移会将它们作为缓存类状态丢弃。

如果数据库报告架构16但仍然有公认的模式-15研讨会专栏、更新预检会识别待处理的迁移，Doctor 在重建所需索引之前运行它。仅提案遗留列的处理方式相同。修复保留可归因的评论行和不相关的索引；无法识别的列集或对已退役列的依赖仍然拒绝并回滚事务。

仅技能工作区搬迁使用现有的`migration_runs`和`migration_sources`用于保存移动前目录标识、文件哈希值和工作区证明时间戳的表。迁移后，仅退役匹配的仅认证状态；设置状态、路径别名和新的证明保持不变。中断的迁移会重用已保存的移动前事实，而不是从空目录中推断它们。工作区重置会删除待处理的工作区范围内的收据。不需要额外的架构版本或表。

### <a id="state-schema-15"></a> 状态模式 15

模式15删除`target_agent_id`和`target_session_id`从`current_conversation_bindings`。目标索引使用完整的`target_session_key`并且保持非唯一性：多个对话可能指向同一个目标。这使得插件拥有的目标能够持续存在，而无需发明一个OpenClaw代理所有者。Channel/account隔离、插件批准、绑定标识符、目标密钥、JSON元数据、过期和分离行为保持不变。

Startup 和 `openclaw doctor --fix` 在现有的独占写入事务中运行迁移。它们仅删除两个投影并替换目标索引，保留所有其他行值。相关触发器、索引或失败的架构检查会回滚事务；迁移不会丢弃未知的依赖项来强制升级。列删除会重写绑定表，因此升级成本与其大小成比例。

在升级之前停止旧的编写器并创建经过验证的 WAL-aware 备份。支持共享状态模式 14 或更早版本的构建会拒绝迁移的数据库。要返回到较旧的版本，请将升级前的备份恢复到单独的状态目录中；不要降低版本标记或重建代理投影。一般回收合约见[Downgrade](/install/updating#downgrade)。

### <a id="state-schema-13"></a> 状态模式 13

模式 13 将 `cron_jobs.job_json`、`cron_jobs.state_json` 和 `subagent_runs.payload_json` 设为源记录。物理列仅在生产查询、排序或仅运行时更新需要时保留。 Cron 作业从 75 列缩减到 15 列，子代理运行从 59 列缩减到 6 列。迁移通过将故障目标字段编码为 JSON `null` 来保留显式配置为未定义的故障目标字段；在删除冗余投影之前，它还会将旧的运行状态别名规范化为 `state_json`。

工作区证明合并到 `workspace_setup_state` 中。当旧数据库没有 `workspace_path_aliases` 表时，迁移会保留证明时间戳和生成的引导哈希值。仅证明工作区保留空路径，直到再次遇到该工作区。

共享状态 `auth_profile_stores` 和 `auth_profile_state` 单例在 `authProfiles.store` 和 `authProfiles.state` 下移入 `config_machine_state`；每个代理的身份验证表保持不变。由于这些行包含凭据，因此秘密编辑的 Git 备份会省略 `authProfiles.` 机器状态前缀。

### <a id="state-schema-11"></a> 状态架构 11

模式11删除`skill_lifecycle`和`skill_workshop_proposal_origin_runs`表。升级期间，存档的技能生命周期状态将被丢弃：以前存档的创意工坊技能将返回到活动集合，每周的集合审查会根据内容对其进行判断。原始运行的行是从未读取过的投影；存储的提案来源保留在`skill_workshop_proposals.record_json`。记录的技能使用情况和收集审查状态将被保留。

### <a id="state-schema-9"></a> 状态模式 9

模式9存储一个`agent_databases.path`当注册代理数据库位于该目录内时，相对于状态目录的值。在迁移过程中，当该文件存在时，外部默认布局行将重新锚定到根内对应行。仅当同一代理已持有其根内注册时才会删除它，因为双重默认布局注册无法生成有效的组合会话列表。否则，绝对行将被保留，因此真正的外部注册永远不会被删除。这使复制的状态目录保持独立，而不会删除支持的外部数据库路径。
